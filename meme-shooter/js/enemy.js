'use strict';
// 小兵：minion.png 当脑袋，身体画成一只 bug（六条腿，会爬）。
//   crawler 爬行 Bug：沿地面朝主角走，1 滴血，90 px/s
//   flyer   飞行 Bug：空中正弦波飘动，2 滴血，每 2 秒掉一个「报错弹」
//   jumper  跳跃 Bug：每 1.5 秒跳一次，1 滴血
//   crate   道具箱  ：不动，打碎掉道具（M5）
// y 对地面型（crawler / jumper / crate）表示「脚」的位置；对 flyer 表示身体中心。

const ENEMY_DEF = {
  crawler: { hp: 1, speed: 90 },
  jumper:  { hp: 1, speed: 75, jumpEvery: 1.5, jumpV: 640 },
  flyer:   { hp: 2, speed: 85, bombEvery: 2 },
  crate:   { hp: 2 }
};

const BUG_PALETTE = {
  crawler: { body: '#56a832', stripe: '#3f7d1f', leg: '#2d5016' },
  jumper:  { body: '#f0a53a', stripe: '#b86f12', leg: '#7a4a0b' },
  flyer:   { body: '#8d6bff', stripe: '#5b3fd0', leg: '#3a2796' }
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
    this.onGround = true;

    if (type === 'jumper') this.jumpT = rand(0.4, def.jumpEvery);
    if (type === 'flyer') {
      this.baseY = rand(285, 335);       // 悬停高度：站着能打到最低点，跳起来能打到最高点
      this.phase = rand(0, TAU);
      this.y = this.baseY;
      this.bombT = rand(0.8, def.bombEvery);
    }
    return this;
  }

  // 被子弹打中的判定（宽松一点，好打）
  get hit() {
    if (this.type === 'flyer') return { x: this.x, y: this.y - 6, r: 34 };
    if (this.type === 'crate') return { x: this.x, y: this.y - 28, r: 34 };
    return { x: this.x, y: this.y - 32, r: 30 };
  }

  // 伤害主角的判定（比外观小 20%）。道具箱不伤人。
  get hurt() {
    if (this.type === 'crate') return null;
    if (this.type === 'flyer') return { x: this.x, y: this.y - 2, r: 19 };
    return { x: this.x, y: this.y - 28, r: 21 };
  }

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
    const def = ENEMY_DEF[this.type];

    if (this.type === 'crawler') {
      this.x += this.dir * def.speed * dt;

    } else if (this.type === 'jumper') {
      this.x += this.dir * def.speed * dt;
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y >= GROUND_Y) { this.y = GROUND_Y; this.vy = 0; this.onGround = true; }
      this.jumpT -= dt;
      if (this.onGround && this.jumpT <= 0) {
        this.vy = -def.jumpV; this.onGround = false; this.jumpT = def.jumpEvery;
      }

    } else if (this.type === 'flyer') {
      // 在主角头顶附近左右晃，高度按正弦波起伏
      const tx = p.x + Math.sin(this.t * 0.7 + this.phase) * 230;
      const dx = tx - this.x;
      this.x += clamp(dx * 1.5, -def.speed, def.speed) * dt;
      this.y = this.baseY + Math.sin(this.t * 2.2 + this.phase) * 40;
      // 每 2 秒掉一个报错弹（只在屏幕里才掉）
      this.bombT -= dt;
      if (this.bombT <= 0 && this.x > game.camX + 20 && this.x < game.camX + W - 20) {
        this.bombT = def.bombEvery;
        const b = game.bullets.spawn();
        if (b) b.init('bomb', this.x, this.y + 16, 0, 20);
      }
    }

    // 掉到镜头左边太远的清掉（追不上了）
    if (this.x < game.camX - 260) this.active = false;
  }

  draw(ctx) {
    if (this.type === 'crate') drawCrate(ctx, this);
    else if (this.type === 'flyer') drawFlyer(ctx, this);
    else drawBug(ctx, this);
  }
}

// 画一只地面 bug：椭圆身体 + 六条腿 + minion 头像 + 触角
function drawBug(ctx, e) {
  const x = e.x, y = e.y, dir = e.dir;
  const flash = e.flash > 0;
  const pal = BUG_PALETTE[e.type];
  const air = Math.max(0, GROUND_Y - y);
  const legT = e.t * (e.type === 'jumper' ? 9 : 12);
  const bounce = e.onGround ? Math.abs(Math.sin(legT * 0.5)) * 2 : 0;

  // 影子
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 3, 30 * Math.max(0.5, 1 - air / 250), 5, 0, 0, TAU); ctx.fill();

  // 六条腿（三对，相位错开）；在空中时腿向后收
  ctx.strokeStyle = flash ? '#fff' : pal.leg; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const phase = legT + i * 2.1 + (side > 0 ? Math.PI : 0);
      const bx = x + (i - 1) * 17 + side * 4;
      const swing = e.onGround ? Math.sin(phase) * 7 : -dir * 5;
      const lift = e.onGround ? Math.max(0, Math.cos(phase)) * 5 : 6;
      ctx.beginPath();
      ctx.moveTo(bx, y - 16 - bounce);
      ctx.lineTo(bx + side * 9 + swing * 0.5, y - 14 - lift);
      ctx.lineTo(bx + side * 6 + swing, y - lift);
      ctx.stroke();
    }
  }

  // 身体
  ctx.fillStyle = flash ? '#fff' : pal.body;
  ctx.beginPath(); ctx.ellipse(x - dir * 4, y - 24 - bounce, 31, 16, 0, 0, TAU); ctx.fill();
  if (!flash) {
    ctx.fillStyle = pal.stripe;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(x - dir * 4 + i * 16, y - 24 - bounce, 4, 12, 0, 0, TAU); ctx.fill(); }
  }

  drawBugHead(ctx, e, x + dir * 18, y - 50 - bounce, pal);
}

// 头（minion.png）+ 触角
function drawBugHead(ctx, e, hx, hy, pal) {
  const flash = e.flash > 0;
  const w1 = Math.sin(e.t * 6) * 3, w2 = Math.sin(e.t * 6 + 1) * 3;
  ctx.strokeStyle = flash ? '#fff' : pal.leg; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx - 6, hy - 20); ctx.quadraticCurveTo(hx - 14, hy - 40, hx - 4 + w1, hy - 44);
  ctx.moveTo(hx + 6, hy - 20); ctx.quadraticCurveTo(hx + 14, hy - 40, hx + 4 + w2, hy - 44);
  ctx.stroke();
  ctx.fillStyle = '#ff4d6d';
  ctx.beginPath(); ctx.arc(hx - 4 + w1, hy - 44, 3.5, 0, TAU); ctx.arc(hx + 4 + w2, hy - 44, 3.5, 0, TAU); ctx.fill();
  const src = flash ? Assets.variant('minion', 'white') : null;
  Assets.drawHead(ctx, 'minion', hx, hy, 46, e.dir * Math.sin(e.t * 8) * 0.05, src);
}

// 飞行 bug：身体悬在空中，翅膀高速扇动
function drawFlyer(ctx, e) {
  const x = e.x, y = e.y, dir = e.dir, flash = e.flash > 0;
  const pal = BUG_PALETTE.flyer;
  const air = GROUND_Y - y;

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 3, 26 * Math.max(0.4, 1 - air / 400), 4, 0, 0, TAU); ctx.fill();

  // 翅膀
  const flap = Math.sin(e.t * 38);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.strokeStyle = 'rgba(120,120,200,0.8)'; ctx.lineWidth = 1.5;
  for (const k of [-1, 1]) {
    ctx.save(); ctx.translate(x - dir * 4 + k * 10, y - 10); ctx.rotate(k * (-0.5 + flap * 0.45));
    ctx.beginPath(); ctx.ellipse(0, -16, 9, 22, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // 垂着的腿
  ctx.strokeStyle = flash ? '#fff' : pal.leg; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    for (const side of [-1, 1]) {
      const sw = Math.sin(e.t * 5 + i + side) * 3;
      ctx.beginPath(); ctx.moveTo(x - dir * 4 + i * 14, y + 8); ctx.lineTo(x - dir * 4 + i * 14 + side * 4 + sw, y + 22); ctx.stroke();
    }
  }

  // 身体
  ctx.fillStyle = flash ? '#fff' : pal.body;
  ctx.beginPath(); ctx.ellipse(x - dir * 4, y, 29, 15, 0, 0, TAU); ctx.fill();
  if (!flash) {
    ctx.fillStyle = pal.stripe;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(x - dir * 4 + i * 15, y, 4, 11, 0, 0, TAU); ctx.fill(); }
  }
  // 屁股上的「炸弹」提示：快掉弹时亮红点
  if (e.bombT < 0.5) { ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(x - dir * 28, y + 4, 5 + Math.sin(e.t * 30) * 1.5, 0, TAU); ctx.fill(); }

  drawBugHead(ctx, e, x + dir * 20, y - 20, pal);
}

// 道具箱
function drawCrate(ctx, e) {
  const x = e.x, y = e.y, flash = e.flash > 0;
  const wob = flash ? Math.sin(e.t * 90) * 2 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 3, 34, 6, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(x + wob, y);
  ctx.fillStyle = flash ? '#fff' : '#c98a4b'; ctx.strokeStyle = '#6b4220'; ctx.lineWidth = 3;
  ctx.fillRect(-28, -56, 56, 56); ctx.strokeRect(-28, -56, 56, 56);
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-26, -54); ctx.lineTo(26, -2); ctx.moveTo(26, -54); ctx.lineTo(-26, -2); ctx.stroke();
  ctx.fillStyle = '#ffd60a'; ctx.strokeStyle = '#7a5c00'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, -28, 13, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7a5c00'; ctx.font = 'bold 18px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('?', 0, -27);
  ctx.restore();
}
