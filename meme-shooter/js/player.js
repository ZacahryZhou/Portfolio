'use strict';
// 主角：player.png 当脑袋，下面画简单身体（躯干 + 两条腿，走路时摆动）。

class Player {
  constructor() { this.reset(); }

  reset(x = 120) {
    this.x = x;
    this.y = GROUND_Y;          // 脚的位置
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.facing = 1;            // 1 朝右，-1 朝左
    this.walkT = 0;
    this.coyote = 0;            // 离地后短暂仍可起跳
    this.jumpBuf = 0;           // 提前按跳跃也算数

    this.hp = PLAYER_CFG.maxHp;
    this.invuln = 0;            // 被击中后的无敌时间
    this.fireCd = 0;
    this.dead = false;
    this.deathT = 0;
    // 道具状态（M5 接入）
    this.fx = { coffee: 0, double: 0 };   // 剩余秒数
    this.shield = false;
    this.ctrlz = 0;
  }

  // 被击退：往后弹一小下
  knock(dir) {
    this.vy = -320;
    this.onGround = false;
    this.vx = dir * 320;
  }

  die() {
    this.dead = true;
    this.deathT = 0;
    this.vy = -520;
    this.vx = -this.facing * 120;
    this.onGround = false;
  }

  // 受击判定：一个比头像小一圈的圆，擦边不算中
  get coreX() { return this.x; }
  get coreY() { return this.y - PLAYER_CFG.coreY; }
  get coreR() { return PLAYER_CFG.coreR; }

  update(dt, input, bounds) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.fireCd = Math.max(0, this.fireCd - dt);
    for (const k in this.fx) this.fx[k] = Math.max(0, this.fx[k] - dt);

    if (this.dead) {            // 死亡：被打飞然后掉出屏幕
      this.deathT += dt;
      this.vy += GRAVITY * 0.6 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return;
    }

    const dir = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    const target = dir * PLAYER_CFG.speed * (this.fx.coffee > 0 ? 1.3 : 1);
    this.vx += (target - this.vx) * Math.min(1, 18 * dt);   // 轻微惯性，手感不生硬
    if (dir) this.facing = dir;

    // 跳跃：缓冲 + 土狼时间
    if (input.wasPressed('jump')) this.jumpBuf = 0.1;
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    this.coyote = this.onGround ? 0.08 : Math.max(0, this.coyote - dt);
    if (this.jumpBuf > 0 && this.coyote > 0) {
      this.vy = -PLAYER_CFG.jumpV;
      this.onGround = false;
      this.coyote = 0;
      this.jumpBuf = 0;
    }
    // 松开跳跃键 → 提前收力（短按小跳，长按到 140px）
    if (!this.onGround && this.vy < -300 && !input.isDown('jump')) this.vy = -300;

    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y >= GROUND_Y) { this.y = GROUND_Y; this.vy = 0; this.onGround = true; }

    this.x = clamp(this.x, bounds.minX, bounds.maxX);
    if (Math.abs(this.vx) > 10 && this.onGround) this.walkT += dt;
  }

  draw(ctx, t) {
    const x = this.x, y = this.y;
    const h = GROUND_Y - y;

    if (this.dead) {            // 死亡：只剩一颗翻滚的头
      Assets.drawHead(ctx, 'player', x, y - 40, PLAYER_CFG.headD, this.deathT * 9);
      return;
    }

    // 影子
    ctx.save();
    ctx.globalAlpha = 0.28 * Math.max(0.25, 1 - h / 220);
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 4, 24 * Math.max(0.5, 1 - h / 400), 6, 0, 0, TAU); ctx.fill();
    ctx.restore();

    // 无敌闪烁
    if (this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 0) return;

    // 腿
    const moving = Math.abs(this.vx) > 10 && this.onGround;
    const swing = moving ? Math.sin(this.walkT * 16) * 11 : 0;
    const tuck = this.onGround ? 0 : (this.vy < 0 ? -5 : 5);
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 18); ctx.lineTo(x - 7 + swing, y - 3 + tuck);
    ctx.moveTo(x + 7, y - 18); ctx.lineTo(x + 7 - swing, y - 3 + tuck);
    ctx.stroke();
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.ellipse(x - 7 + swing + this.facing * 3, y - 1 + tuck, 7, 4, 0, 0, TAU);
    ctx.ellipse(x + 7 - swing + this.facing * 3, y - 1 + tuck, 7, 4, 0, 0, TAU);
    ctx.fill();

    // 躯干（蓝色卫衣）
    ctx.fillStyle = '#3b82f6';
    rrPath(ctx, x - 15, y - 46, 30, 30, 8); ctx.fill();
    ctx.fillStyle = '#2563eb';
    rrPath(ctx, x - 9, y - 30, 18, 9, 3); ctx.fill();   // 口袋

    // 手臂 + 枪（键盘造型）
    ctx.strokeStyle = '#ffd9a8'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x + this.facing * 6, y - 38); ctx.lineTo(x + this.facing * 24, y - 36); ctx.stroke();
    ctx.fillStyle = '#374151';
    rrPath(ctx, this.facing > 0 ? x + 16 : x - 38, y - 44, 22, 12, 3); ctx.fill();
    ctx.fillStyle = '#9ca3af';
    for (let i = 0; i < 3; i++) ctx.fillRect((this.facing > 0 ? x + 19 : x - 35) + i * 6, y - 41, 4, 3);

    // 头像（会随跑动轻轻晃）
    const bob = moving ? Math.abs(Math.sin(this.walkT * 16)) * -3 : Math.sin(t * 3) * 1.2;
    const tilt = this.vx / PLAYER_CFG.speed * 0.12;
    Assets.drawHead(ctx, 'player', x, y - 70 + bob, PLAYER_CFG.headD, tilt);

    // 护盾泡泡
    if (this.shield) {
      const pulse = 1 + Math.sin(t * 6) * 0.04;
      ctx.save();
      ctx.fillStyle = 'rgba(80,170,255,0.22)'; ctx.strokeStyle = 'rgba(140,210,255,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y - 54, 48 * pulse, 62 * pulse, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(x - 20, y - 86, 8, 14, -0.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
}
