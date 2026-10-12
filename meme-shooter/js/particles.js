'use strict';
// 粒子：小方块爆炸、彩带、飘字（+100）、💀 等。全部走对象池。

class Particle {
  constructor() { this.active = false; }

  init(o) {
    this.active = true;
    this.shape = o.shape || 'rect';      // rect | confetti | text | ring
    this.x = o.x; this.y = o.y;
    this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.gravity = o.gravity === undefined ? 900 : o.gravity;
    this.drag = o.drag || 0;
    this.size = o.size || 6;
    this.color = o.color || '#fff';
    this.rot = o.rot || 0;
    this.vr = o.vr || 0;
    this.life = this.maxLife = o.life || 0.6;
    this.text = o.text || '';
    this.t = 0;
    return this;
  }

  update(dt) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) { this.active = false; return; }
    if (this.drag) { const k = Math.max(0, 1 - this.drag * dt); this.vx *= k; this.vy *= k; }
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.vr * dt;
  }

  draw(ctx) {
    const k = this.life / this.maxLife;           // 1 → 0
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 2);
    ctx.translate(this.x, this.y);
    if (this.shape === 'text') {
      ctx.font = 'bold ' + this.size + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(this.text, 0, 0);
      ctx.fillStyle = this.color; ctx.fillText(this.text, 0, 0);
    } else if (this.shape === 'ring') {
      ctx.strokeStyle = this.color; ctx.lineWidth = 4 * k + 1;
      ctx.beginPath(); ctx.arc(0, 0, this.size * (1.2 - k), 0, TAU); ctx.stroke();
    } else if (this.shape === 'confetti') {
      ctx.rotate(this.rot);
      ctx.scale(1, Math.abs(Math.cos(this.t * 8 + this.size)));   // 翻转的纸片
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
    } else {
      ctx.rotate(this.rot);
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    }
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() { this.pool = new Pool(() => new Particle(), 900); }

  // 小方块爆炸
  burst(x, y, n, colors, o = {}) {
    for (let i = 0; i < n; i++) {
      const p = this.pool.spawn(); if (!p) return;
      const a = rand(0, TAU), s = rand(o.minSpeed || 80, o.maxSpeed || 320);
      p.init({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 120),
        size: rand(o.minSize || 4, o.maxSize || 9), color: pick(colors),
        rot: rand(0, TAU), vr: rand(-10, 10), life: rand(0.4, o.life || 0.8)
      });
    }
  }

  // 彩带（通关页）
  confetti(x, y, n, o = {}) {
    const cols = ['#ff5d8f', '#ffd166', '#06d6a0', '#4cc9f0', '#b5179e', '#fff'];
    for (let i = 0; i < n; i++) {
      const p = this.pool.spawn(); if (!p) return;
      const a = o.angle !== undefined ? o.angle + rand(-(o.spread || 0.8), o.spread || 0.8) : rand(0, TAU);
      const s = rand(150, o.speed || 520);
      p.init({
        shape: 'confetti', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        gravity: 420, drag: 0.8, size: rand(7, 13), color: pick(cols),
        rot: rand(0, TAU), vr: rand(-8, 8), life: rand(1.6, 3)
      });
    }
  }

  // 飘字
  text(x, y, text, color = '#fff', size = 22) {
    const p = this.pool.spawn(); if (!p) return;
    p.init({ shape: 'text', x, y, vy: -70, gravity: 0, text, color, size, life: 0.9 });
  }

  // 冲击波圆环
  ring(x, y, size, color = '#fff') {
    const p = this.pool.spawn(); if (!p) return;
    p.init({ shape: 'ring', x, y, gravity: 0, size, color, life: 0.4 });
  }

  update(dt) { this.pool.forEach(p => p.update(dt)); }
  draw(ctx) { this.pool.forEach(p => p.draw(ctx)); }
  clear() { this.pool.clear(); }
}
