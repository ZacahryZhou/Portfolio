'use strict';
// 游戏主体：状态机、主循环、画面切换。

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    // 逻辑分辨率固定 960x540；高分屏用 2 倍后备缓冲让画面更清晰
    this.pixelScale = (window.devicePixelRatio || 1) >= 1.5 ? 2 : 1;
    canvas.width = W * this.pixelScale;
    canvas.height = H * this.pixelScale;
    this.ctx = canvas.getContext('2d');

    this.debug = /[?&]debug\b/.test(location.search);
    this.godMode = false;             // 调试用：无敌
    this.time = 0;                    // 动画用的总时间
    this.fps = 60;
    this.highScore = Store.loadHigh();
    this.newRecord = false;
    this.endLine = '';
    this.titleT = 0;

    this.player = new Player();
    this.bullets = new Pool(() => new Bullet(), 200);
    this.enemies = new Pool(() => new Enemy(), 80);
    this.powerups = new Pool(() => new PowerUp(), 24);
    this.particles = new ParticleSystem();

    Background.init(this.pixelScale);
    this.levelIndex = 0;
    this.subtitle = null;             // 当前字幕 { text, role, t, dur }
    this.sayCd = {};                  // 每类台词的冷却，防止刷屏
    this.lastLine = {};
    this.deaths = 0;                  // 累计死亡次数：每死一次，下一次 Boss 血量 -10%（最低 50%）
    this.startRun();
    this.state = 'TITLE';             // 先停在标题页
  }

  // 开始新的一局（重置所有运行时状态）
  startRun() {
    this.state = 'PLAYING';
    this.level = new Level(LEVELS[this.levelIndex]);
    this.bossLocked = false;
    this.boss = null;
    this.slowT = 0;                   // 击败 Boss 的慢动作剩余（真实）秒数
    this.mood = 0;                    // 背景氛围：0 平时，1 Boss 房间
    this.banner = null;               // 屏幕中央的大字提示
    this.camX = 0;
    this.shakeAmp = 0;
    this.stats = { score: 0, kills: 0, hits: 0, time: 0 };
    this.player.reset();
    this.subtitle = null;
    this.bullets.clear();
    this.enemies.clear();
    this.particles.clear();
    this.powerups.clear();
    this.heartOwed = false;           // 只剩 1 颗心时，下一个被打死的小兵必掉爱心
    this.flashT = 0;                  // Ctrl+Z 的全屏白闪
    this._confettiDone = false;
    this.newRecord = false;
    this.overT = 0;
  }

  // ---------- 画面切换 ----------
  beginPlay() {
    this.startRun();
    this.sfx('menu');
    this.say('start', 'player', { force: true });
  }

  retry() {
    this.beginPlay();
  }

  toTitle() {
    this.startRun();
    this.state = 'TITLE';
    this.titleT = 0;
    GameAudio.stopSpeech();
  }

  // 一局结束（失败或通关）：结算最高分
  finishRun() {
    this.newRecord = this.stats.score > this.highScore;
    if (this.newRecord) { this.highScore = this.stats.score; Store.saveHigh(this.highScore); }
  }

  updateResultInput() {
    let act = null;
    if (Input.wasPressed('restart') || Input.wasPressed('confirm')) act = 'again';
    else if (Input.wasPressed('pause')) act = 'title';        // Esc
    for (const c of Input.clicks) {
      for (const b of Screens.buttons) if (c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h) act = b.id;
    }
    if (act === 'again') this.retry();
    else if (act === 'title') this.toTitle();
  }

  addShake(a) { this.shakeAmp = Math.max(this.shakeAmp, a); }

  sfx(name) { GameAudio.sfx(name); }

  // 说一句台词：字幕一定显示；语音在能用时同时朗读。
  // cat: LINES 的键；role: player / minion / boss；返回台词文本（冷却中或没抽中返回 null）。
  say(cat, role = 'player', o = {}) {
    if (o.chance !== undefined && Math.random() > o.chance) return null;
    if (this.sayCd[cat] > 0 && !o.force) return null;
    const list = LINES[cat];
    let text = pick(list);
    if (list.length > 1 && text === this.lastLine[cat]) text = pick(list.filter(t => t !== this.lastLine[cat]));
    this.lastLine[cat] = text;
    this.sayCd[cat] = o.cooldown || 0;
    this.subtitle = { text, role, t: 0, dur: 1.4 + text.length * 0.16 };
    GameAudio.speak(text, role);
    return text;
  }

  // ---------- 更新 ----------
  update(dt) {
    this.realDt = dt;
    this.fps = lerp(this.fps, 1 / Math.max(dt, 0.0001), 0.05);   // 用真实 dt 算帧率
    // 击败 Boss 后的慢动作：世界时间放慢到 30%，计时用真实时间
    if (this.slowT > 0) {
      this.slowT -= dt;
      dt *= 0.3;
      if (this.slowT <= 0) { this.winGame(); return; }
    }
    this.time += dt;
    if (Input.wasPressed('mute')) { const m = GameAudio.toggleMute(); this.particles.text(this.camX + W - 70, 110, m ? '静音（M 开启）' : '声音已开启', '#fff', 18); }
    for (const k in this.sayCd) if (this.sayCd[k] > 0) this.sayCd[k] -= dt;
    if (this.subtitle) { this.subtitle.t += dt; if (this.subtitle.t > this.subtitle.dur) this.subtitle = null; }
    this.shakeAmp *= Math.pow(0.001, dt);      // 抖动衰减
    if (this.shakeAmp < 0.2) this.shakeAmp = 0;

    if (this.state === 'TITLE') {
      this.titleT += dt;
      if (Input.anyPress && !Input.wasPressed('mute') && this.titleT > 0.3) this.beginPlay();
      return;
    }

    if (this.state === 'GAMEOVER' || this.state === 'WIN') {
      this.overT += dt;
      this.particles.update(dt);
      if (this.overT > 0.8) this.updateResultInput();
      return;
    }

    const p = this.player;
    this.stats.time += dt;

    const lv = this.level;
    p.update(dt, Input, {
      minX: this.bossLocked ? lv.lockX + 20 : this.camX + 30,
      maxX: this.boss ? this.boss.baseX - 110 : lv.length - 30     // Boss 房间里不能走到 Boss 身上
    });
    if (!p.dead && Input.isDown('shoot') && p.fireCd <= 0) this.firePlayer();
    if (!p.dead && Input.wasPressed('special') && p.ctrlz > 0) this.useCtrlZ();
    this.flashT = Math.max(0, this.flashT - dt);

    if (!p.dead) lv.update(this);
    if (this.boss) this.boss.update(dt);
    this.enemies.forEach(e => e.update(dt, this));
    this.bullets.forEach(b => b.update(dt, this));
    this.powerups.forEach(u => u.update(dt, this));
    this.collide();
    this.particles.update(dt);

    // 镜头跟随主角（主角在屏幕左偏 1/3 处），限制在关卡范围内
    const camTarget = this.bossLocked ? lv.lockX : clamp(p.x - 340, 0, lv.lockX);
    this.camX = lerp(this.camX, camTarget, Math.min(1, (this.bossLocked ? 4 : 10) * dt));
    this.mood = lerp(this.mood, this.bossLocked ? 1 : 0, Math.min(1, 2 * dt));
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }

    if (p.dead && p.deathT > 1.2) {
      this.state = 'GAMEOVER'; this.overT = 0;
      this.deaths++;
      this.sfx('lose');
      this.finishRun();
      this.endLine = this.say('gameover', 'player', { force: true });
    }
  }

  // 按关卡数据刷一只怪（x 是屏幕右侧外的世界坐标）
  spawnEnemy(spawn, x) {
    const e = this.enemies.spawn();
    if (e) e.init(spawn.t, x, GROUND_Y);
  }

  // Boss 血量：基础 60，每死一次 -10%，最低 50%
  bossMaxHp() { return Math.round(BOSS_CFG.maxHp * Math.max(0.5, 1 - 0.1 * this.deaths)); }

  // 走到关卡尽头：锁屏，Boss 登场
  enterBossRoom() {
    this.bossLocked = true;
    this.state = 'BOSS';
    this.boss = new Boss(this, this.level.length - 150, this.bossMaxHp());
    this.say('bossIntro', 'boss', { force: true });
    this.banner = { text: 'Deadline', t: 0, dur: 2.6 };
    this.sfx('bossIntro');
    this.addShake(6);
  }

  onBossPhase(phase) {
    this.addShake(10);
    this.sfx('slam');
    this.say(phase === 2 ? 'phase2' : 'phase3', 'boss', { force: true });
    this.particles.ring(this.boss.x, GROUND_Y - 170, 90, '#ffd166');
    this.banner = phase === 2
      ? { text: '第二阶段', sub: 'Deadline 开始冲撞了！看到红线就跳', t: 0, dur: 2.2 }
      : { text: '第三阶段', sub: 'Deadline 召唤了 Bug 大军！', t: 0, dur: 2.2 };
  }

  // Boss 血量归零：清场 + 慢动作 + 全屏爆炸，之后进通关页
  bossDefeated() {
    const b = this.boss;
    b.setState('dying');
    this.bullets.clear();
    this.enemies.forEach(e => { const c = e.hit; this.particles.burst(c.x, c.y, 10, ['#9be564', '#56a832', '#ffd166', '#fff']); e.active = false; });
    this.addScore(2000, b.x, 200);
    this.player.invuln = 99;
    this.sfx('explode');
    this.slowT = 1.5;
    this.addShake(14);
    this.particles.burst(b.x, GROUND_Y - 170, 70, ['#ff4d4d', '#ffd166', '#fff', '#ff9f1c'], { maxSpeed: 560, maxSize: 16, life: 1.4 });
    this.particles.ring(b.x, GROUND_Y - 170, 160, '#fff');
  }

  winGame() {
    this.state = 'WIN';
    this.overT = 0;
    this.sfx('win');
    this.finishRun();
    this.endLine = this.say('win', 'player', { force: true });
    this.boss.state = 'gone';
    this.deaths = 0;                  // 通关后重置「死亡减血」
    this.particles.clear();
  }

  firePlayer() {
    const p = this.player;
    p.fireCd = PLAYER_CFG.fireInterval * (p.fx.coffee > 0 ? 0.5 : 1);
    this.sfx('shoot');
    const offsets = p.fx.double > 0 ? [-9, 9] : [0];      // 双发：上下错开
    for (const o of offsets) {
      const b = this.bullets.spawn();
      if (b) b.init(Math.random() < 0.5 ? 'smile' : 'brace', p.x + p.facing * 36, p.y - 42 + o, p.facing * PLAYER_CFG.bulletSpeed, 0);
    }
  }

  // ---------- 碰撞（圆形 / AABB，不用像素检测） ----------
  collide() {
    const p = this.player;
    const bl = this.bullets.items, en = this.enemies.items;
    const boss = this.boss && this.boss.active ? this.boss : null;

    for (let i = 0; i < bl.length; i++) {
      const b = bl[i];
      if (!b.active) continue;
      if (b.friendly) {
        for (let j = 0; j < en.length; j++) {
          const e = en[j];
          if (!e.active) continue;
          const h = e.hit;
          if (circleHit(b.x, b.y, b.r, h.x, h.y, h.r)) { b.active = false; this.damageEnemy(e, 1, b.x, b.y); break; }
        }
        if (b.active && boss && boss.vulnerable) {
          const bb = boss.hitBox;
          if (circleRect(b.x, b.y, b.r, bb.x, bb.y, bb.w, bb.h)) { b.active = false; this.damageBoss(1, b.x, b.y); }
        }
      } else if (!p.dead && circleHit(b.x, b.y, b.r, p.coreX, p.coreY, p.coreR)) {
        b.active = false;
        this.hitPlayer(b.x);
      }
    }

    if (!p.dead) {
      const pu = this.powerups.items;
      for (let i = 0; i < pu.length; i++) {
        const u = pu[i];
        if (u.active && circleRect(u.x, u.y, u.r, p.x - 24, p.y - 100, 48, 100)) { u.active = false; this.pickup(u); }
      }
    }

    if (!p.dead && boss) {
      const hb = boss.hurtBox;
      if (hb && circleRect(p.coreX, p.coreY, p.coreR, hb.x, hb.y, hb.w, hb.h)) this.hitPlayer(boss.x);
    }

    if (!p.dead) {
      for (let j = 0; j < en.length; j++) {
        const e = en[j];
        if (!e.active) continue;
        const h = e.hurt;
        if (h && circleHit(h.x, h.y, h.r, p.coreX, p.coreY, p.coreR)) this.hitPlayer(e.x);
      }
    }
  }

  damageBoss(dmg, hx, hy) {
    const b = this.boss;
    if (!b.takeHit(dmg)) return;
    this.stats.score += 20;
    this.sfx('hit');
    this.say('bossHit', 'boss', { chance: 0.12, cooldown: 7 });
    this.particles.burst(hx, hy, 5, ['#fff', '#ffe08a', '#ff9f1c'], { maxSpeed: 220, maxSize: 6, life: 0.4 });
    if (b.hp <= 0) this.bossDefeated();
  }

  damageEnemy(e, dmg, hx, hy) {
    if (e.takeHit(dmg)) {
      this.killEnemy(e);
    } else {
      this.sfx('hit');
      this.particles.burst(hx, hy, 4, ['#fff', '#ffe08a'], { maxSpeed: 160, maxSize: 5, life: 0.35 });
    }
  }

  killEnemy(e) {
    e.active = false;
    const c = e.hit;
    this.sfx(e.type === 'crate' ? 'hit' : 'die');
    if (e.type === 'crate') {
      this.particles.burst(c.x, c.y, 16, ['#c98a4b', '#8a5a2b', '#6b4220', '#ffd60a']);
      this.addScore(50, c.x, c.y - 30);
      this.dropPower(c.x, c.y, rollPower(this.player.hp >= PLAYER_CFG.maxHp));     // 道具箱必掉
      return;
    }
    this.particles.burst(c.x, c.y, 14, ['#9be564', '#56a832', '#3f7d1f', '#ffd166', '#fff']);
    this.addScore(100, c.x, c.y - 30);
    this.stats.kills++;
    if (Math.random() < 0.1) this.say('minionDie', 'minion', { cooldown: 6 });
    else this.say('kill', 'player', { chance: 0.22, cooldown: 3.5 });

    // 15% 概率掉道具；快没血时下一个必掉爱心
    const p = this.player;
    if (this.heartOwed && p.hp < PLAYER_CFG.maxHp) { this.dropPower(c.x, c.y, 'heart'); this.heartOwed = false; }
    else if (Math.random() < POWER_DROP_RATE) this.dropPower(c.x, c.y, rollPower(p.hp >= PLAYER_CFG.maxHp));
  }

  dropPower(x, y, type) {
    const u = this.powerups.spawn();
    if (u) u.init(type, x, y - 10);
  }

  pickup(u) {
    const p = this.player, d = POWER_DEF[u.type];
    this.particles.burst(u.x, u.y, 10, [d.color, '#fff'], { maxSpeed: 220, maxSize: 7 });
    this.particles.ring(u.x, u.y, 40, d.color);
    let msg = d.name;
    this.sfx('pickup');
    this.say('powerup', 'player', { cooldown: 1.5 });
    if (u.type === 'coffee' || u.type === 'double') p.fx[u.type] = d.dur;              // 重复拾取 = 刷新到 10 秒
    else if (u.type === 'shield') p.shield = true;
    else if (u.type === 'ctrlz') {
      if (p.ctrlz >= 1) { this.addScore(300); msg = 'Ctrl+Z 已满 +300'; } else { p.ctrlz = 1; msg = 'Ctrl+Z（按 K）'; }
    } else if (u.type === 'heart') {
      if (p.hp < PLAYER_CFG.maxHp) { p.hp++; this.heartOwed = false; } else { this.addScore(200); msg = '心满了 +200'; }
    }
    this.particles.text(p.x, p.y - 120, msg, '#fff', 22);
  }

  // Ctrl+Z 大招：清除屏幕上所有小兵和敌方子弹（Boss 不受影响，道具箱也不碰）
  useCtrlZ() {
    const p = this.player;
    p.ctrlz--;
    this.sfx('ctrlz');
    this.say('ctrlz', 'player', { force: true });
    this.flashT = 0.35;
    this.addShake(8);
    this.particles.ring(p.x, p.y - 60, 80, '#fff');
    this.particles.text(p.x, p.y - 130, 'Ctrl + Z', '#e9ecef', 30);
    const x0 = this.camX - 40, x1 = this.camX + W + 40;
    this.enemies.forEach(e => {
      if (e.type === 'crate' || e.x < x0 || e.x > x1) return;
      e.active = false;
      const c = e.hit;
      this.particles.burst(c.x, c.y, 12, ['#9be564', '#56a832', '#ffd166', '#fff']);
      this.addScore(100, c.x, c.y - 30);
      this.stats.kills++;
    });
    this.bullets.forEach(b => {
      if (b.friendly) return;
      b.active = false;
      this.particles.burst(b.x, b.y, 4, ['#fff', '#ffe08a'], { maxSpeed: 160, maxSize: 5, life: 0.4 });
    });
  }

  addScore(n, x, y) {
    this.stats.score += n;
    if (x !== undefined) this.particles.text(x, y, '+' + n, '#ffe08a', 20);
  }

  hitPlayer(srcX) {
    const p = this.player;
    if (p.invuln > 0 || p.dead || this.godMode) return;
    if (p.shield) {                   // 护盾抵挡 1 次伤害
      p.shield = false;
      this.sfx('shield');
      this.say('shield', 'player', { cooldown: 3 });
      p.invuln = 0.8;
      this.addShake(4);
      this.particles.burst(p.coreX, p.coreY, 14, ['#8ecbff', '#fff', '#4895ef'], { maxSpeed: 260 });
      this.particles.ring(p.coreX, p.coreY, 60, '#8ecbff');
      return;
    }
    p.invuln = PLAYER_CFG.invuln;
    p.hp--;
    if (p.hp === 1) this.heartOwed = true;
    this.stats.hits++;
    this.sfx('hurt');
    if (p.hp > 0) this.say('hit', 'player', { cooldown: 2.5 });
    this.addShake(9);
    this.particles.burst(p.coreX, p.coreY, 10, ['#ff3860', '#fff', '#ffd166'], { maxSpeed: 260 });
    if (p.hp <= 0) p.die();
    else p.knock(p.x >= srcX ? 1 : -1);
  }

  // ---------- 绘制 ----------
  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.pixelScale, 0, 0, this.pixelScale, 0, 0);

    if (this.state === 'TITLE') { Screens.drawTitle(ctx, this); return; }
    if (this.state === 'GAMEOVER') { Screens.drawGameOver(ctx, this); return; }
    if (this.state === 'WIN') { Screens.drawWin(ctx, this); return; }

    Background.draw(ctx, this.camX, this.time, this.mood);

    ctx.save();
    const sx = this.shakeAmp ? rand(-this.shakeAmp, this.shakeAmp) : 0;
    const sy = this.shakeAmp ? rand(-this.shakeAmp, this.shakeAmp) : 0;
    ctx.translate(-Math.round(this.camX) + sx, sy);
    if (this.boss && this.boss.active) this.boss.draw(ctx);
    this.powerups.forEach(u => u.draw(ctx));
    this.enemies.forEach(e => e.draw(ctx));
    this.player.draw(ctx, this.time);
    this.bullets.forEach(b => b.draw(ctx));
    this.particles.draw(ctx);
    ctx.restore();

    if (this.flashT > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (this.flashT / 0.35 * 0.8) + ')'; ctx.fillRect(0, 0, W, H); }

    UI.drawHUD(ctx, this);
    if (this.banner) UI.drawBanner(ctx, this.banner);
    if (this.subtitle) UI.drawSubtitle(ctx, this.subtitle);


    if (this.debug) {
      ctx.fillStyle = '#000'; ctx.font = '14px monospace'; ctx.textAlign = 'left';
      ctx.fillText('FPS ' + this.fps.toFixed(0) + '  x=' + this.player.x.toFixed(0) +
        '  pu=' + this.powerups.count() + '  bullets=' + this.bullets.count() + ' enemies=' + this.enemies.count() +
        (this.boss ? '  boss=' + this.boss.hp + '/' + this.boss.maxHp + ' ' + this.boss.state + ' p' + this.boss.phase : ''), 10, H - 10);
    }
  }
}

// ---------- 启动 ----------
(function main() {
  const canvas = document.getElementById('game');
  Input.init(canvas);
  Input.onGesture = () => { if (!GameAudio.unlocked || (GameAudio.ctx && GameAudio.ctx.state !== 'running')) GameAudio.unlock(); };
  canvas.focus();

  Assets.load().then(() => {
    const game = new Game(canvas);
    window.__game = game;   // 方便在控制台调试 / 自动化测试

    let last = performance.now();
    function frame(now) {
      requestAnimationFrame(frame);
      // 切到后台再回来 dt 会很大 → 限制最大 0.05s，避免瞬移
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      game.update(dt);
      game.draw();
      Input.endFrame();
    }
    requestAnimationFrame(frame);
  });
})();
