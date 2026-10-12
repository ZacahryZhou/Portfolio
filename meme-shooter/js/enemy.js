'use strict';
// 小兵：minion.png 当脑袋，身体画成一只 bug（六条腿，会爬）。
// y 对地面型（crawler / jumper）表示「脚」的位置；对飞行型表示身体中心。

const ENEMY_DEF = {
  crawler: { hp: 1, speed: 90 }
};

class Enemy {
  constructor() { this.active = false; }

  init(type, x, y) {
    const def = ENEMY_DEF[type];
    this.active = true;
    this.type = type;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.hp = this.maxHp = def.hp;
    this.dir = -1;          // 朝向（面向主角）
    this.t = rand(0, 10);   // 动画相位
    this.flash = 0;         // 被击中闪白
    return this;
  }

  // 被子弹打中的判定（宽松一点，好打）
  get hit() { return { x: this.x, y: this.y - 32, r: 30 }; }
  // 伤害主角的判定（比外观小 20%）
  get hurt() { return { x: this.x, y: this.y - 28, r: 21 }; }

  takeHit(dmg) {
    this.hp -= dmg;
    this.flash = 0.08;
    return this.hp <= 0;
  }

  update(dt, game) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    const p = game.player;
    if (Math.abs(p.x - this.x) > 8) this.dir = p.x > this.x ? 1 : -1;

    if (this.type === 'crawler') {
      this.x += this.dir * ENEMY_DEF.crawler.speed * dt;
    }

    // 掉到镜头左边太远的清掉（追不上了）
    if (this.x < game.camX - 260) this.active = false;
  }

  draw(ctx) {
    drawBug(ctx, this);
  }
}

// 画一只 bug：椭圆身体 + 六条腿 + minion 头像 + 触角
function drawBug(ctx, e) {
  const x = e.x, y = e.y, dir = e.dir;
  const flash = e.flash > 0;
  const legT = e.t * 12;
  const bounce = Math.abs(Math.sin(legT * 0.5)) * 2;

  // 影子
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 3, 30, 5, 0, 0, TAU); ctx.fill();

  // 六条腿（三对，相位错开）
  ctx.strokeStyle = flash ? '#fff' : '#2d5016'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const phase = legT + i * 2.1 + (side > 0 ? Math.PI : 0);
      const bx = x + (i - 1) * 17 + side * 4;
      const swing = Math.sin(phase) * 7;
      const lift = Math.max(0, Math.cos(phase)) * 5;
      ctx.beginPath();
      ctx.moveTo(bx, y - 16 - bounce);
      ctx.lineTo(bx + side * 9 + swing * 0.5, y - 14 - lift);
      ctx.lineTo(bx + side * 6 + swing, y - lift);
      ctx.stroke();
    }
  }

  // 身体
  ctx.fillStyle = flash ? '#fff' : '#56a832';
  ctx.beginPath(); ctx.ellipse(x - dir * 4, y - 24 - bounce, 31, 16, 0, 0, TAU); ctx.fill();
  if (!flash) {
    ctx.fillStyle = '#3f7d1f';
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(x - dir * 4 + i * 16, y - 24 - bounce, 4, 12, 0, 0, TAU); ctx.fill(); }
  }

  // 触角
  const hx = x + dir * 18, hy = y - 50 - bounce;
  ctx.strokeStyle = '#2d5016'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hx - 6, hy - 20); ctx.quadraticCurveTo(hx - 14, hy - 40, hx - 4 + Math.sin(e.t * 6) * 3, hy - 44);
  ctx.moveTo(hx + 6, hy - 20); ctx.quadraticCurveTo(hx + 14, hy - 40, hx + 4 + Math.sin(e.t * 6 + 1) * 3, hy - 44);
  ctx.stroke();
  ctx.fillStyle = '#ff4d6d';
  ctx.beginPath(); ctx.arc(hx - 4 + Math.sin(e.t * 6) * 3, hy - 44, 3.5, 0, TAU); ctx.arc(hx + 4 + Math.sin(e.t * 6 + 1) * 3, hy - 44, 3.5, 0, TAU); ctx.fill();

  // 头（minion.png）
  const src = flash ? Assets.variant('minion', 'white') : null;
  Assets.drawHead(ctx, 'minion', hx, hy, 46, dir * Math.sin(e.t * 8) * 0.05, src);
}
