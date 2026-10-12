'use strict';
// Boss「Deadline」：boss.png 全身像，站在场景右侧，轻微上下浮动。
//   阶段 1（血量 100%–60%）：每 1.8 秒 5 发扇形「作业」纸片弹
//   阶段 2（60%–30%）     ：加上冲撞：每 6 秒一次，先 0.8 秒红线预警，玩家可跳过
//   阶段 3（30%–0%）      ：每 4 秒召唤 3 只飞行 Bug，纸片弹加到 7 发
// 被击中闪白 0.08 秒。击败：慢动作 + 全屏爆炸（由 Game 控制慢动作）。

const BOSS_CFG = {
  maxHp: 60,
  drawW: 190, drawH: 357,
  fireEvery: 1.8, fanP1: 5, fanP3: 7, fanStep: 0.19,      // 弧度，约 11°
  bulletSpeed: 230,
  chargeEvery: 6, warnTime: 0.8, dashSpeed: 780, returnSpeed: 240, dashSquash: 0.25,
  summonEvery: 4, summonCount: 3
};

class Boss {
  constructor(game, x, maxHp) {
    this.game = game;
    this.baseX = x;
    this.x = game.camX + W + 260;       // 从屏幕右边滑进来
    this.y = GROUND_Y;                  // 脚的位置
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.phase = 1;
    this.state = 'intro';               // intro idle warn dash pause return dying
    this.stateT = 0;
    this.t = 0;
    this.flash = 0;
    this.sy = 1;                        // 纵向压扁系数（冲撞时压扁，才能被跳过）
    this.fireT = 1.2;
    this.chargeT = 3;
    this.summonT = 1.5;
    this.explT = 0;
    this.dustT = 0;
    this.shake = 0;
    this.introFrom = this.x;
  }

  get active() { return this.state !== 'gone'; }
  get vulnerable() { return this.state !== 'intro' && this.state !== 'dying'; }
  get hpRatio() { return this.hp / this.maxHp; }

  // 被子弹打的判定框（AABB，比外观略窄）
  get hitBox() {
    const h = BOSS_CFG.drawH * this.sy, bob = this.bobY();
    return { x: this.x - 70, y: this.y - h - bob + 18 * this.sy, w: 140, h: h - 18 * this.sy };
  }

  // 伤害主角的判定框：只有冲撞时才有，且按压扁后的高度再缩 20%
  get hurtBox() {
    if (this.state !== 'dash' && this.state !== 'pause') return null;
    const h = BOSS_CFG.drawH * BOSS_CFG.dashSquash * 0.8;
    return { x: this.x - 76, y: GROUND_Y - h, w: 152, h };
  }

  bobY() { return (this.state === 'idle' || this.state === 'intro') ? Math.sin(this.t * 2.2) * 7 + 7 : 0; }

  setState(s) { this.state = s; this.stateT = 0; }

  takeHit(dmg) {
    if (!this.vulnerable) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 0.08;
    return true;
  }

  update(dt) {
    const g = this.game, p = g.player;
    this.t += dt;
    this.stateT += dt;
    this.flash = Math.max(0, this.flash - dt);

    if (this.state === 'intro') {
      const k = clamp(this.stateT / 1.8, 0, 1), e = 1 - Math.pow(1 - k, 3);
      this.x = lerp(this.introFrom, this.baseX, e);
      if (k >= 1 && this.stateT > 2.4) this.setState('idle');     // 停一会儿再开打，给玩家反应时间
      return;
    }

    if (this.state === 'dying') {
      this.shake = 6;
      this.explT -= dt;
      if (this.explT <= 0) {
        this.explT = 0.05;
        const bx = this.x + rand(-80, 80), by = rand(110, 440);
        g.particles.burst(bx, by, 14, ['#ff4d4d', '#ffd166', '#fff', '#ff9f1c'], { maxSpeed: 380, maxSize: 14, life: 1.1 });
        g.particles.ring(bx, by, rand(40, 90), pick(['#ffd166', '#ff4d4d', '#fff']));
        // 全屏爆炸：在整个屏幕上随机炸
        const sx = g.camX + rand(20, W - 20), sy = rand(60, GROUND_Y);
        g.particles.burst(sx, sy, 10, ['#ff4d4d', '#ffd166', '#fff', '#ff9f1c'], { maxSpeed: 300, maxSize: 12, life: 1 });
      }
      return;
    }

    // 阶段切换
    const ph = this.hpRatio > 0.6 ? 1 : this.hpRatio > 0.3 ? 2 : 3;
    if (ph > this.phase) { this.phase = ph; g.onBossPhase(ph, this); }

    if (this.state === 'idle') {
      this.sy = lerp(this.sy, 1, Math.min(1, 12 * dt));
      this.x = lerp(this.x, this.baseX, Math.min(1, 6 * dt));

      this.fireT -= dt;
      if (this.fireT <= 0) { this.fireFan(); this.fireT = BOSS_CFG.fireEvery; }

      if (this.phase >= 2) {
        this.chargeT -= dt;
        if (this.chargeT <= 0) { this.chargeT = BOSS_CFG.chargeEvery; this.setState('warn'); return; }
      }
      if (this.phase >= 3) {
        this.summonT -= dt;
        if (this.summonT <= 0) { this.summonT = BOSS_CFG.summonEvery; this.summon(); }
      }

    } else if (this.state === 'warn') {
      // 预警：身体下蹲蓄力，地上一条红线
      this.sy = lerp(this.sy, 0.6, Math.min(1, 8 * dt));
      this.shake = 2;
      if (this.stateT >= BOSS_CFG.warnTime) { this.dashTargetX = g.camX + 100; this.setState('dash'); g.addShake(5); }

    } else if (this.state === 'dash') {
      this.sy = lerp(this.sy, BOSS_CFG.dashSquash, Math.min(1, 25 * dt));
      this.x -= BOSS_CFG.dashSpeed * dt;
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.025;
        g.particles.burst(this.x + 70, GROUND_Y - 6, 3, ['#d9c7a0', '#b8a47a', '#fff'], { maxSpeed: 150, up: 140, maxSize: 10, life: 0.5 });
      }
      if (this.x <= this.dashTargetX) { this.x = this.dashTargetX; g.addShake(10); this.setState('pause'); }

    } else if (this.state === 'pause') {
      if (this.stateT >= 0.35) this.setState('return');

    } else if (this.state === 'return') {
      this.sy = lerp(this.sy, 1, Math.min(1, 5 * dt));
      this.x += BOSS_CFG.returnSpeed * dt;
      if (this.x >= this.baseX) { this.x = this.baseX; this.setState('idle'); }
    }
  }

  // 扇形「作业」纸片弹：朝主角方向展开，奇数发，中间一发瞄准
  fireFan() {
    const g = this.game, p = g.player;
    const n = this.phase >= 3 ? BOSS_CFG.fanP3 : BOSS_CFG.fanP1;
    const ox = this.x - 60, oy = this.y - 215 * Math.max(this.sy, 0.6) - this.bobY();
    const base = Math.atan2(p.coreY - oy, p.coreX - ox);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * BOSS_CFG.fanStep;
      const b = g.bullets.spawn();
      if (b) b.init('paper', ox, oy, Math.cos(a) * BOSS_CFG.bulletSpeed, Math.sin(a) * BOSS_CFG.bulletSpeed, { vr: rand(4, 8) * (i % 2 ? 1 : -1) });
    }
    g.sfx && g.sfx('bossFire');
  }

  // 召唤飞行 Bug：从屏幕上方飞进来
  summon() {
    const g = this.game;
    for (let i = 0; i < BOSS_CFG.summonCount; i++) {
      const e = g.enemies.spawn();
      if (!e) continue;
      e.init('flyer', g.camX + W - 120 - i * 130, 0);
      e.enterT = 0.9; e.enterFrom = -50;
      g.particles.ring(e.x, 40, 40, '#8d6bff');
    }
    g.sfx && g.sfx('summon');
  }

  draw(ctx) {
    const t = this.t, x = this.x;
    const bob = this.bobY();

    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 4, 80 - bob * 1.5, 11, 0, 0, TAU); ctx.fill();

    // 冲撞预警：地上的红线 + 惊叹号
    if (this.state === 'warn') {
      const left = this.game.camX, k = this.stateT / BOSS_CFG.warnTime;
      const blink = Math.floor(this.stateT * 14) % 2 === 0;
      ctx.save();
      ctx.fillStyle = 'rgba(255,40,60,' + (blink ? 0.38 : 0.2) + ')';
      ctx.fillRect(left, GROUND_Y - 84, x - left, 84);
      ctx.strokeStyle = blink ? '#ff2d4d' : '#ff9aa8'; ctx.lineWidth = 4; ctx.setLineDash([22, 12]);
      ctx.beginPath(); ctx.moveTo(left, GROUND_Y - 42); ctx.lineTo(x - 70, GROUND_Y - 42); ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 4; i++) {
        const ix = left + 160 + i * 200;
        if (ix < x - 120) {
          ctx.globalAlpha = blink ? 1 : 0.5;
          ctx.fillStyle = '#ff2d4d'; ctx.beginPath(); ctx.moveTo(ix, GROUND_Y - 70); ctx.lineTo(ix + 26, GROUND_Y - 22); ctx.lineTo(ix - 26, GROUND_Y - 22); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 28px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('!', ix, GROUND_Y - 26);
        }
      }
      ctx.globalAlpha = 1;
      ctx.font = 'bold 28px ' + FONT;
      strokeText(ctx, '跳！', left + 90, GROUND_Y - 100, '#fff', '#c1121f', 6);
      ctx.restore();
    }

    // 光晕：阶段越高越红
    if (this.state !== 'dash' && this.state !== 'pause') {
      const rad = 210 + Math.sin(t * 3) * 10;
      const col = ['255,214,102', '255,140,60', '255,40,70'][this.phase - 1];
      const gr = ctx.createRadialGradient(x, GROUND_Y - 170 - bob, 20, x, GROUND_Y - 170 - bob, rad);
      gr.addColorStop(0, 'rgba(' + col + ',0.38)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = gr; ctx.fillRect(x - rad, GROUND_Y - 170 - bob - rad, rad * 2, rad * 2);
    }

    // 冲撞速度线
    if (this.state === 'dash') {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 6; i++) ctx.fillRect(x + 60 + i * 38 + (t * 900) % 38, GROUND_Y - 80 + (i * 37) % 70, 60, 3);
    }

    // 本体（压扁时只压纵向）
    const sx = this.shake ? rand(-this.shake, this.shake) : 0;
    this.shake = 0;
    const spr = this.flash > 0 ? Assets.variant('boss', 'white') : Assets.sprites.boss;
    ctx.save();
    ctx.translate(x + sx, GROUND_Y - bob);
    ctx.scale(1, this.sy);
    if (this.state === 'dying') ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(t * 40));
    ctx.drawImage(spr, -BOSS_CFG.drawW / 2, -BOSS_CFG.drawH, BOSS_CFG.drawW, BOSS_CFG.drawH);
    ctx.restore();
  }
}
