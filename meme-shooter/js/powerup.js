'use strict';
// 道具：从被打死的小兵身上 15% 概率掉落，或藏在道具箱里。
// 拾取后持续 10 秒（护盾和 Ctrl+Z 除外）。
//   coffee 咖啡   : 移动速度 +30%，射击间隔减半
//   double 双发   : 一次射两发，上下错开
//   shield 护盾   : 抵挡 1 次伤害，不限时
//   ctrlz  Ctrl+Z : 存 1 个大招，按 K 清除屏幕上所有小兵和敌方子弹
//   heart  爱心   : 回 1 颗心，最多 3 颗

const POWER_DEF = {
  coffee: { name: '咖啡续命', color: '#c98a4b', dur: 10, weight: 25 },
  double: { name: '双发',     color: '#4cc9f0', dur: 10, weight: 25 },
  shield: { name: '护盾',     color: '#4895ef', dur: 0,  weight: 20 },
  ctrlz:  { name: 'Ctrl+Z',  color: '#ced4da', dur: 0,  weight: 12 },
  heart:  { name: '爱心',     color: '#ff3860', dur: 0,  weight: 20 }
};
const POWER_DROP_RATE = 0.15;

// 按权重随机一个道具；血满时不掉爱心
function rollPower(hpFull) {
  const keys = Object.keys(POWER_DEF).filter(k => !(k === 'heart' && hpFull));
  let total = 0;
  for (const k of keys) total += POWER_DEF[k].weight;
  let r = Math.random() * total;
  for (const k of keys) { r -= POWER_DEF[k].weight; if (r <= 0) return k; }
  return keys[0];
}

// 画道具图标（中心 cx,cy；s≈半径）。世界里的道具和 HUD 共用。
function drawPowerIcon(ctx, type, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s / 16, s / 16);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (type === 'coffee') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(-7, -12, -4, -15); ctx.moveTo(3, -8); ctx.quadraticCurveTo(0, -12, 3, -15); ctx.stroke();
    ctx.fillStyle = '#7b4a2a'; ctx.strokeStyle = '#3b2210'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(10, -5); ctx.lineTo(7, 10); ctx.lineTo(-7, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(11, 1, 5, -1.2, 1.2); ctx.stroke();
    ctx.fillStyle = '#d9a066'; ctx.fillRect(-9, -4, 18, 3);
  } else if (type === 'double') {
    ctx.fillStyle = '#4cc9f0'; ctx.strokeStyle = '#0b4a63'; ctx.lineWidth = 2;
    for (const y of [-7, 7]) {
      ctx.beginPath(); ctx.moveTo(-11, y - 6); ctx.lineTo(9, y); ctx.lineTo(-11, y + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  } else if (type === 'shield') {
    ctx.fillStyle = 'rgba(80,170,255,0.6)'; ctx.strokeStyle = '#1d6fd6'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(-4, -5, 3, 5, -0.6, 0, TAU); ctx.fill();
  } else if (type === 'ctrlz') {
    ctx.fillStyle = '#e9ecef'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2;
    rrPath(ctx, -14, -11, 28, 22, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#212529'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 8px monospace'; ctx.fillText('Ctrl', 0, -4);
    ctx.font = 'bold 11px monospace'; ctx.fillText('+Z', 0, 5);
  } else if (type === 'heart') {
    drawHeart(ctx, 0, -1, 11, '#ff3860', '#7a0f25');
  }
  ctx.restore();
}

class PowerUp {
  constructor() { this.active = false; }

  init(type, x, y) {
    this.active = true;
    this.type = type;
    this.x = x; this.y = y;
    this.vx = rand(-70, 70); this.vy = -420;
    this.life = 14;
    this.t = 0;
    this.landed = false;
    this.r = 20;
    return this;
  }

  update(dt, game) {
    this.t += dt;
    this.life -= dt;
    const restY = GROUND_Y - 30;
    if (!this.landed) {
      this.vy += GRAVITY * 0.8 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.y >= restY) { this.y = restY; this.landed = true; }
    }
    if (this.life <= 0 || this.x < game.camX - 120) this.active = false;
  }

  draw(ctx) {
    if (this.life < 3 && Math.floor(this.life * 8) % 2 === 0) return;     // 快消失时闪烁
    const bob = this.landed ? Math.sin(this.t * 4) * 4 : 0;
    const d = POWER_DEF[this.type];
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(this.x, GROUND_Y + 3, 16, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.strokeStyle = d.color; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(this.x, this.y + bob, this.r, 0, TAU); ctx.fill(); ctx.stroke();
    drawPowerIcon(ctx, this.type, this.x, this.y + bob, 14);
    ctx.restore();
  }
}
