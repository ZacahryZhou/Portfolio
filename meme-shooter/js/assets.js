'use strict';
// 素材：player.png / minion.png / boss.png。
// 缺图（或加载失败）时自动画一张占位图，所以没有素材也能玩；
// 把真图放进 assets/ 后自动替换，不用改代码。
//
// 所有精灵统一成「可 drawImage 的源」：真图 或 离屏 canvas。
// 灰色 / 白闪变体用合成模式生成（不读像素），file:// 下也不会触发跨域报错。

const SPRITE_FILES = {
  player: { src: 'assets/player.png', w: 150, h: 150 },
  minion: { src: 'assets/minion.png', w: 120, h: 120 },
  boss:   { src: 'assets/boss.png',   w: 190, h: 357 }
};

const Assets = {
  sprites: {},       // name -> 可绘制源
  real: {},          // name -> 是否是真图
  _variants: {},     // 'name:gray' -> canvas

  load() {
    const jobs = Object.keys(SPRITE_FILES).map(name => new Promise(resolve => {
      const def = SPRITE_FILES[name];
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 0) { this.sprites[name] = img; this.real[name] = true; }
        else this._fallback(name);
        resolve();
      };
      img.onerror = () => { this._fallback(name); resolve(); };
      img.src = def.src;
    }));
    return Promise.all(jobs);
  },

  _fallback(name) {
    const def = SPRITE_FILES[name];
    const c = document.createElement('canvas');
    c.width = def.w; c.height = def.h;
    const g = c.getContext('2d');
    if (name === 'player') drawPlayerFace(g, def.w, def.h);
    else if (name === 'minion') drawMinionFace(g, def.w, def.h);
    else drawBossFigure(g, def.w, def.h);
    this.sprites[name] = c;
    this.real[name] = false;
  },

  // 以 (cx, cy) 为中心、画成直径 d 的正方形（用于头像）
  drawHead(ctx, name, cx, cy, d, rot = 0, src = null) {
    const s = src || this.sprites[name];
    if (!s) return;
    if (rot) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.drawImage(s, -d / 2, -d / 2, d, d);
      ctx.restore();
    } else {
      ctx.drawImage(s, cx - d / 2, cy - d / 2, d, d);
    }
  },

  // 变体：'gray'（去色，失败页用）/ 'white'（纯白剪影，被击中闪白用）
  variant(name, kind) {
    const key = name + ':' + kind;
    if (this._variants[key]) return this._variants[key];
    const s = this.sprites[name];
    if (!s) return null;
    const w = s.naturalWidth || s.width, h = s.naturalHeight || s.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(s, 0, 0);
    if (kind === 'white') {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = '#fff';
      g.fillRect(0, 0, w, h);
    } else if (kind === 'gray') {
      g.globalCompositeOperation = 'saturation';   // 用 0 饱和度的灰盖上去 = 去色
      g.fillStyle = '#808080';
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in'; // 只保留原图的不透明区域
      g.drawImage(s, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(0, 0, w, h);
    }
    this._variants[key] = c;
    return c;
  }
};

// ---------------- 占位图 ----------------

function drawPlayerFace(g, w, h) {
  const cx = w / 2, cy = h / 2, r = w / 2 - 4;
  g.fillStyle = '#ffd9a8'; g.strokeStyle = '#b8793a'; g.lineWidth = 5;
  g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); g.stroke();
  // 头发
  g.fillStyle = '#3b2a20';
  g.beginPath(); g.arc(cx, cy, r, Math.PI * 1.08, Math.PI * 1.92); g.quadraticCurveTo(cx, cy - 40, cx - r * 0.95, cy - 22); g.fill();
  // 眼镜 + 眼睛
  g.strokeStyle = '#222'; g.lineWidth = 4; g.fillStyle = '#fff';
  for (const sx of [-1, 1]) {
    g.beginPath(); g.arc(cx + sx * 27, cy - 2, 18, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#222'; g.beginPath(); g.arc(cx + sx * 27 + 2, cy - 1, 6, 0, TAU); g.fill(); g.fillStyle = '#fff';
  }
  g.beginPath(); g.moveTo(cx - 9, cy - 2); g.lineTo(cx + 9, cy - 2); g.stroke();
  // 腮红 + 大笑
  g.fillStyle = 'rgba(255,100,100,0.35)';
  g.beginPath(); g.arc(cx - 44, cy + 22, 9, 0, TAU); g.arc(cx + 44, cy + 22, 9, 0, TAU); g.fill();
  g.fillStyle = '#7a1f1f'; g.strokeStyle = '#222'; g.lineWidth = 4;
  g.beginPath(); g.arc(cx, cy + 28, 26, 0.1 * Math.PI, 0.9 * Math.PI); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff';
  g.beginPath(); g.rect(cx - 16, cy + 36, 32, 7); g.fill();
}

function drawMinionFace(g, w, h) {
  const cx = w / 2, cy = h / 2, r = w / 2 - 4;
  g.fillStyle = '#9be564'; g.strokeStyle = '#3f7d1f'; g.lineWidth = 5;
  g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); g.stroke();
  // 愤怒眼睛
  g.fillStyle = '#fff'; g.strokeStyle = '#222'; g.lineWidth = 3;
  for (const sx of [-1, 1]) {
    g.beginPath(); g.arc(cx + sx * 22, cy - 6, 16, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#c00'; g.beginPath(); g.arc(cx + sx * 22 - sx * 3, cy - 4, 6, 0, TAU); g.fill(); g.fillStyle = '#fff';
  }
  g.strokeStyle = '#222'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - 40, cy - 34); g.lineTo(cx - 8, cy - 20); g.moveTo(cx + 40, cy - 34); g.lineTo(cx + 8, cy - 20); g.stroke();
  // 獠牙嘴
  g.fillStyle = '#400'; g.beginPath(); g.arc(cx, cy + 22, 24, 0.05 * Math.PI, 0.95 * Math.PI); g.closePath(); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(cx - 14, cy + 25); g.lineTo(cx - 8, cy + 38); g.lineTo(cx - 2, cy + 26); g.fill();
  g.beginPath(); g.moveTo(cx + 14, cy + 25); g.lineTo(cx + 8, cy + 38); g.lineTo(cx + 2, cy + 26); g.fill();
}

function drawBossFigure(g, w, h) {
  const cx = w / 2;
  // 腿
  g.fillStyle = '#1d2033';
  g.fillRect(cx - 38, 250, 30, 100); g.fillRect(cx + 8, 250, 30, 100);
  g.fillStyle = '#000'; g.fillRect(cx - 44, 342, 40, 15); g.fillRect(cx + 4, 342, 40, 15);
  // 西装躯干
  g.fillStyle = '#2b2d42'; rrPath(g, cx - 56, 128, 112, 140, 14); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx - 14, 128); g.lineTo(cx + 14, 128); g.lineTo(cx, 160); g.fill();
  g.fillStyle = '#d90429'; g.beginPath(); g.moveTo(cx - 7, 150); g.lineTo(cx + 7, 150); g.lineTo(cx + 11, 230); g.lineTo(cx, 244); g.lineTo(cx - 11, 230); g.fill();
  // 手臂 + 卷轴
  g.strokeStyle = '#2b2d42'; g.lineWidth = 22; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - 54, 144); g.lineTo(cx - 84, 210); g.moveTo(cx + 54, 144); g.lineTo(cx + 84, 200); g.stroke();
  g.fillStyle = '#fffbe6'; g.strokeStyle = '#8a7a4a'; g.lineWidth = 3;
  g.save(); g.translate(cx + 84, 196); g.rotate(0.3); g.fillRect(-16, -26, 32, 52); g.strokeRect(-16, -26, 32, 52);
  g.fillStyle = '#d90429'; g.font = 'bold 14px ' + FONT; g.textAlign = 'center'; g.fillText('作业', 0, 5); g.restore();
  // 钟表脑袋
  g.fillStyle = '#fff'; g.strokeStyle = '#d90429'; g.lineWidth = 9;
  g.beginPath(); g.arc(cx, 72, 62, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#111'; g.font = 'bold 16px ' + FONT; g.textAlign = 'center';
  g.fillText('12', cx, 32); g.fillText('6', cx, 120); g.fillText('9', cx - 44, 77); g.fillText('3', cx + 44, 77);
  g.strokeStyle = '#111'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(cx, 72); g.lineTo(cx, 40); g.moveTo(cx, 72); g.lineTo(cx + 22, 80); g.stroke();
  // 愤怒的脸
  g.fillStyle = '#111';
  g.beginPath(); g.arc(cx - 20, 66, 6, 0, TAU); g.arc(cx + 20, 66, 6, 0, TAU); g.fill();
  g.lineWidth = 6; g.beginPath(); g.moveTo(cx - 34, 50); g.lineTo(cx - 10, 60); g.moveTo(cx + 34, 50); g.lineTo(cx + 10, 60); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.arc(cx, 106, 14, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke();
}
