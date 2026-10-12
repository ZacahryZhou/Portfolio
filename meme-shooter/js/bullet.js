'use strict';
// 子弹（我方 + 敌方共用一个类，用 kind 区分）
//   smile / brace : 主角子弹（笑脸、{} 符号）
//   paper         : Boss 的「作业」纸片弹（旋转飞出）
//   bomb          : 飞行 Bug 掉落的「报错弹」（往下掉）
// 敌方子弹的判定半径比外观小 20%（方案 3.6）。

const BULLET_HIT_R = { smile: 9, brace: 9, paper: 11, bomb: 9 };

class Bullet {
  constructor() { this.active = false; }

  init(kind, x, y, vx, vy, o = {}) {
    this.active = true;
    this.kind = kind;
    this.friendly = kind === 'smile' || kind === 'brace';
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.r = BULLET_HIT_R[kind];
    this.rot = o.rot || 0;
    this.vr = o.vr || 0;
    this.life = 8;
    this.t = 0;
    return this;
  }

  update(dt, game) {
    this.t += dt;
    this.life -= dt;
    if (this.kind === 'bomb') this.vy = Math.min(this.vy + 300 * dt, 230);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.vr * dt;

    if (this.kind === 'bomb' && this.y >= GROUND_Y - 6) {
      game.particles.burst(this.x, GROUND_Y - 4, 8, ['#ff4d4d', '#ffd166', '#fff'], { maxSpeed: 200, up: 160 });
      game.particles.ring(this.x, GROUND_Y - 4, 34, '#ff4d4d');
      this.active = false;
      return;
    }
    const cam = game.camX;
    if (this.life <= 0 || this.x < cam - 120 || this.x > cam + W + 120 || this.y > H + 40 || this.y < -120) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.kind === 'smile') {
      ctx.fillStyle = '#ffd60a'; ctx.strokeStyle = '#7a5c00'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-3, -2, 1.6, 0, TAU); ctx.arc(3, -2, 1.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 1, 4.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    } else if (this.kind === 'brace') {
      ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = '#052e16'; ctx.strokeText('{}', 0, 0);
      ctx.fillStyle = '#4ade80'; ctx.fillText('{}', 0, 0);
    } else if (this.kind === 'paper') {
      ctx.rotate(this.rot);
      ctx.fillStyle = '#fffdf5'; ctx.strokeStyle = '#b8a96a'; ctx.lineWidth = 2;
      ctx.fillRect(-17, -12, 34, 24); ctx.strokeRect(-17, -12, 34, 24);
      ctx.fillStyle = '#d90429'; ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('作业', 0, -1);
      ctx.fillStyle = '#9aa'; ctx.fillRect(-12, 6, 24, 2);
    } else if (this.kind === 'bomb') {
      ctx.fillStyle = '#ff4d4d'; ctx.strokeStyle = '#7f0000'; ctx.lineWidth = 2;
      rrPath(ctx, -15, -11, 30, 22, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('ERR', 0, 1);
    }
    ctx.restore();
  }
}
