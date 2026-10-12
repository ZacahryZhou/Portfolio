'use strict';
// 音频：音效全部用 Web Audio API 合成（不引入音频文件）；语音用 speechSynthesis。
// 浏览器要求音频 / 语音必须在第一次用户点击或按键之后才能启动，
// 所以 AudioContext 是在 unlock()（由输入事件调用）里才创建的。
// 任何一步失败（没有 Web Audio、没有语音引擎、被拦截）都只会静默跳过，字幕照常显示。

const VOICE_PITCH = { player: 1.2, minion: 1.6, boss: 0.7 };

const GameAudio = {
  ctx: null,
  master: null,
  noiseBuf: null,
  muted: false,
  unlocked: false,
  _voice: null,

  // 在用户手势里调用：创建 / 恢复 AudioContext，并预热语音列表
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.gain.value = 0.5;
          this.master.connect(this.ctx.destination);
          // 1 秒白噪声缓冲，所有「噗」「砰」都从里面切
          const n = this.ctx.sampleRate;
          this.noiseBuf = this.ctx.createBuffer(1, n, n);
          const d = this.noiseBuf.getChannelData(0);
          for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      this.unlocked = true;
      if (this.hasSpeech()) { speechSynthesis.getVoices(); }   // 触发语音列表加载
    } catch (e) { /* 没有音频就算了 */ }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopSpeech();
    return this.muted;
  },

  // 单个音：type 波形，f0→f1 的频率滑动，dur 秒，delay 秒后开始
  tone({ type = 'square', f0, f1, dur = 0.1, vol = 0.15, delay = 0 }) {
    const c = this.ctx;
    if (!c || this.muted) return;
    try {
      const t0 = c.currentTime + delay;
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f0, t0);
      if (f1) osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.01, dur / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(this.master);
      osc.start(t0); osc.stop(t0 + dur + 0.03);
    } catch (e) { /* ignore */ }
  },

  // 噪声脉冲
  noise({ dur = 0.05, vol = 0.15, delay = 0, freq = 0 }) {
    const c = this.ctx;
    if (!c || this.muted || !this.noiseBuf) return;
    try {
      const t0 = c.currentTime + delay;
      const src = c.createBufferSource(), g = c.createGain();
      src.buffer = this.noiseBuf;
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      let node = src;
      if (freq) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; src.connect(f); node = f; }
      node.connect(g); g.connect(this.master);
      src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.03);
    } catch (e) { /* ignore */ }
  },

  // 方案第 6 节的音效表
  sfx(name) {
    switch (name) {
      case 'shoot':      this.tone({ type: 'square', f0: 880, f1: 440, dur: 0.08, vol: 0.07 }); break;
      case 'hit':        this.noise({ dur: 0.05, vol: 0.12 }); break;
      case 'die':        this.tone({ type: 'triangle', f0: 300, f1: 80, dur: 0.15, vol: 0.25 }); this.noise({ dur: 0.06, vol: 0.1, delay: 0.02 }); break;
      case 'pickup':     [523, 659, 784].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: 0.07, vol: 0.12, delay: i * 0.07 })); break;
      case 'hurt':       this.tone({ type: 'sawtooth', f0: 200, f1: 60, dur: 0.3, vol: 0.22 }); break;
      case 'bossIntro':  this.tone({ type: 'triangle', f0: 60, dur: 0.8, vol: 0.5 }); this.tone({ type: 'sawtooth', f0: 90, f1: 45, dur: 0.8, vol: 0.12 }); break;
      case 'win':        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: i === 3 ? 0.5 : 0.13, vol: 0.14, delay: i * 0.13 })); break;
      case 'lose':       [329.63, 261.63, 220, 174.61].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: i === 3 ? 0.7 : 0.22, vol: 0.28, delay: i * 0.22 })); break;
      // 方案表里没写、但手感需要的几个
      case 'bossFire':   this.noise({ dur: 0.18, vol: 0.08, freq: 1200 }); break;
      case 'summon':     this.tone({ type: 'sine', f0: 220, f1: 660, dur: 0.35, vol: 0.18 }); break;
      case 'warn':       this.tone({ type: 'square', f0: 440, dur: 0.1, vol: 0.1 }); this.tone({ type: 'square', f0: 440, dur: 0.1, vol: 0.1, delay: 0.2 }); this.tone({ type: 'square', f0: 440, dur: 0.1, vol: 0.1, delay: 0.4 }); break;
      case 'dash':       this.noise({ dur: 0.5, vol: 0.25, freq: 800 }); break;
      case 'slam':       this.noise({ dur: 0.25, vol: 0.3, freq: 400 }); this.tone({ type: 'triangle', f0: 90, f1: 40, dur: 0.25, vol: 0.4 }); break;
      case 'ctrlz':      this.tone({ type: 'sine', f0: 1200, f1: 200, dur: 0.3, vol: 0.2 }); this.noise({ dur: 0.2, vol: 0.12 }); break;
      case 'shield':     this.tone({ type: 'sine', f0: 700, f1: 1400, dur: 0.12, vol: 0.15 }); break;
      case 'explode':    this.noise({ dur: 0.7, vol: 0.35, freq: 900 }); this.tone({ type: 'sawtooth', f0: 140, f1: 30, dur: 0.7, vol: 0.25 }); break;
      case 'menu':       this.tone({ type: 'square', f0: 660, dur: 0.06, vol: 0.1 }); this.tone({ type: 'square', f0: 990, dur: 0.08, vol: 0.1, delay: 0.06 }); break;
    }
  },

  // ---------- 语音 ----------
  hasSpeech() { return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window; },

  _pickVoice() {
    try {
      const vs = speechSynthesis.getVoices();
      if (!vs || !vs.length) return null;
      if (this._voice && vs.includes(this._voice)) return this._voice;
      this._voice = vs.find(v => /^zh[-_]CN/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || null;
      return this._voice;
    } catch (e) { return null; }
  },

  speak(text, role = 'player') {
    if (!this.unlocked || this.muted || !this.hasSpeech()) return false;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = 1.1;
      u.pitch = VOICE_PITCH[role] || 1;
      const v = this._pickVoice();
      if (v) u.voice = v;
      u.onerror = () => {};              // 失败就算了，字幕已经显示
      speechSynthesis.cancel();          // 新的一句打断上一句，避免排队越积越多
      speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  },

  stopSpeech() {
    try { if (this.hasSpeech()) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  }
};
