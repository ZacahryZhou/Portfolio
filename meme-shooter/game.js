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
    this.highScore = 0;

    this.player = new Player();
    this.bullets = new Pool(() => new Bullet(), 200);
    this.enemies = new Pool(() => new Enemy(), 80);
    this.particles = new ParticleSystem();

    Background.init(this.pixelScale);
    this.levelIndex = 0;
    this.startRun();
  }

  // 开始新的一局（重置所有运行时状态）
  startRun() {
    this.state = 'PLAYING';
    this.level = new Level(LEVELS[this.levelIndex]);
    this.bossLocked = false;
    this.mood = 0;                    // 背景氛围：0 平时，1 Boss 房间
    this.banner = null;               // 屏幕中央的大字提示
    this.camX = 0;
    this.shakeAmp = 0;
    this.stats = { score: 0, kills: 0, hits: 0, time: 0 };
    this.player.reset();
    this.bullets.clear();
    this.enemies.clear();
    this.particles.clear();
    this.overT = 0;
  }

  addShake(a) { this.shakeAmp = Math.max(this.shakeAmp, a); }

  // ---------- 更新 ----------
  update(dt) {
    this.time += dt;
    this.fps = lerp(this.fps, 1 / Math.max(dt, 0.0001), 0.05);
    this.shakeAmp *= Math.pow(0.001, dt);      // 抖动衰减
    if (this.shakeAmp < 0.2) this.shakeAmp = 0;

    if (this.state === 'GAMEOVER') {
      this.overT += dt;
      this.particles.update(dt);
      if (Input.wasPressed('restart')) this.startRun();
      return;
    }

    const p = this.player;
    this.stats.time += dt;

    const lv = this.level;
    p.update(dt, Input, {
      minX: this.bossLocked ? lv.lockX + 20 : this.camX + 30,
      maxX: lv.length - 30
    });
    if (!p.dead && Input.isDown('shoot') && p.fireCd <= 0) this.firePlayer();

    if (!p.dead) lv.update(this);
    this.enemies.forEach(e => e.update(dt, this));
    this.bullets.forEach(b => b.update(dt, this));
    this.collide();
    this.particles.update(dt);

    // 镜头跟随主角（主角在屏幕左偏 1/3 处），限制在关卡范围内
    const camTarget = this.bossLocked ? lv.lockX : clamp(p.x - 340, 0, lv.lockX);
    this.camX = lerp(this.camX, camTarget, Math.min(1, (this.bossLocked ? 4 : 10) * dt));
    this.mood = lerp(this.mood, this.bossLocked ? 1 : 0, Math.min(1, 2 * dt));
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }

    if (p.dead && p.deathT > 1.2) { this.state = 'GAMEOVER'; this.overT = 0; }
  }

  // 按关卡数据刷一只怪（x 是屏幕右侧外的世界坐标）
  spawnEnemy(spawn, x) {
    const e = this.enemies.spawn();
    if (e) e.init(spawn.t, x, GROUND_Y);
  }

  // 走到关卡尽头：锁屏，进 Boss 房间（Boss 在 M4 加入）
  enterBossRoom() {
    this.bossLocked = true;
    this.state = 'BOSS';
    this.banner = { text: 'Boss 房间', sub: '（Boss 将在 M4 登场）', t: 0, dur: 2.5 };
  }

  firePlayer() {
    const p = this.player;
    p.fireCd = PLAYER_CFG.fireInterval * (p.fx.coffee > 0 ? 0.5 : 1);
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
      } else if (!p.dead && circleHit(b.x, b.y, b.r, p.coreX, p.coreY, p.coreR)) {
        b.active = false;
        this.hitPlayer(b.x);
      }
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

  damageEnemy(e, dmg, hx, hy) {
    if (e.takeHit(dmg)) this.killEnemy(e);
    else this.particles.burst(hx, hy, 4, ['#fff', '#ffe08a'], { maxSpeed: 160, maxSize: 5, life: 0.35 });
  }

  killEnemy(e) {
    e.active = false;
    const c = e.hit;
    if (e.type === 'crate') {
      this.particles.burst(c.x, c.y, 16, ['#c98a4b', '#8a5a2b', '#6b4220', '#ffd60a']);
      this.addScore(50, c.x, c.y - 30);
      return;
    }
    this.particles.burst(c.x, c.y, 14, ['#9be564', '#56a832', '#3f7d1f', '#ffd166', '#fff']);
    this.addScore(100, c.x, c.y - 30);
    this.stats.kills++;
  }

  addScore(n, x, y) {
    this.stats.score += n;
    if (x !== undefined) this.particles.text(x, y, '+' + n, '#ffe08a', 20);
  }

  hitPlayer(srcX) {
    const p = this.player;
    if (p.invuln > 0 || p.dead || this.godMode) return;
    p.invuln = PLAYER_CFG.invuln;
    p.hp--;
    this.stats.hits++;
    this.addShake(9);
    this.particles.burst(p.coreX, p.coreY, 10, ['#ff3860', '#fff', '#ffd166'], { maxSpeed: 260 });
    if (p.hp <= 0) p.die();
    else p.knock(p.x >= srcX ? 1 : -1);
  }

  // ---------- 绘制 ----------
  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.pixelScale, 0, 0, this.pixelScale, 0, 0);
    Background.draw(ctx, this.camX, this.time, this.mood);

    ctx.save();
    const sx = this.shakeAmp ? rand(-this.shakeAmp, this.shakeAmp) : 0;
    const sy = this.shakeAmp ? rand(-this.shakeAmp, this.shakeAmp) : 0;
    ctx.translate(-Math.round(this.camX) + sx, sy);
    this.enemies.forEach(e => e.draw(ctx));
    this.player.draw(ctx, this.time);
    this.bullets.forEach(b => b.draw(ctx));
    this.particles.draw(ctx);
    ctx.restore();

    UI.drawHUD(ctx, this);
    if (this.banner) UI.drawBanner(ctx, this.banner);

    if (this.state === 'GAMEOVER') this.drawGameOverPlaceholder(ctx);   // M7 换成正式结算页

    if (this.debug) {
      ctx.fillStyle = '#000'; ctx.font = '14px monospace'; ctx.textAlign = 'left';
      ctx.fillText('FPS ' + this.fps.toFixed(0) + '  x=' + this.player.x.toFixed(0) +
        '  bullets=' + this.bullets.count() + ' enemies=' + this.enemies.count(), 10, 76);
    }
  }

  drawGameOverPlaceholder(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.font = 'bold 48px ' + FONT;
    strokeText(ctx, '你被 Deadline 抓住了', W / 2, H / 2 - 10);
    ctx.font = '22px ' + FONT;
    strokeText(ctx, '得分 ' + this.stats.score + '    按 R 再来一次', W / 2, H / 2 + 40);
  }
}

// ---------- 启动 ----------
(function main() {
  const canvas = document.getElementById('game');
  Input.init(canvas);
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
