'use strict';
// UI：血条、分数、道具图标、字幕、Boss 血条等（屏幕空间，不跟镜头走）。

function drawHeart(ctx, cx, cy, s, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.9);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

// 带描边的文字
function strokeText(ctx, text, x, y, fill = '#fff', stroke = 'rgba(0,0,0,0.75)', lw = 5) {
  ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}

const UI = {
  drawHUD(ctx, game) {
    const p = game.player;

    // 生命：3 颗心
    for (let i = 0; i < PLAYER_CFG.maxHp; i++) {
      drawHeart(ctx, 38 + i * 44, 36, 15, i < p.hp ? '#ff3860' : 'rgba(0,0,0,0.35)', i < p.hp ? '#7a0f25' : 'rgba(255,255,255,0.4)');
    }

    this.drawPowerBar(ctx, p);

    // 分数
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'right';
    ctx.font = 'bold 26px ' + FONT;
    strokeText(ctx, String(game.stats.score).padStart(6, '0'), W - 20, 38);
    if (game.boss && game.boss.state !== 'gone') {
      this.drawBossBar(ctx, game.boss);
    } else {
    // 关卡进度条
    const bx = W / 2 - 110, by = 24, bw = 220;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; rrPath(ctx, bx, by, bw, 8, 4); ctx.fill();
    const prog = clamp(p.x / game.level.length, 0, 1);
    ctx.fillStyle = '#ffd166'; rrPath(ctx, bx, by, Math.max(8, bw * prog), 8, 4); ctx.fill();
    ctx.fillStyle = '#ff3860'; ctx.beginPath(); ctx.arc(bx + bw, by + 4, 8, 0, TAU); ctx.fill();   // 终点 = Boss
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx + bw * prog, by + 4, 6, 0, TAU); ctx.fill();
    ctx.textAlign = 'center'; ctx.font = '12px ' + FONT;
    strokeText(ctx, game.level.def.name, W / 2, by + 28, '#fff', 'rgba(0,0,0,0.7)', 3);
    }

    ctx.textAlign = 'right';
    ctx.font = '14px ' + FONT;
    strokeText(ctx, '最高 ' + String(game.highScore).padStart(6, '0'), W - 20, 58, '#ffe08a', 'rgba(0,0,0,0.75)', 4);
  },

  // 道具图标：限时的带倒计时圈，护盾常驻，Ctrl+Z 提示按 K
  drawPowerBar(ctx, p) {
    const items = [];
    if (p.fx.coffee > 0) items.push({ type: 'coffee', k: p.fx.coffee / POWER_DEF.coffee.dur, label: Math.ceil(p.fx.coffee) + 's' });
    if (p.fx.double > 0) items.push({ type: 'double', k: p.fx.double / POWER_DEF.double.dur, label: Math.ceil(p.fx.double) + 's' });
    if (p.shield) items.push({ type: 'shield', k: 1, label: '' });
    if (p.ctrlz > 0) items.push({ type: 'ctrlz', k: 1, label: '按 K' });
    let x = 38;
    for (const it of items) {
      const y = 82, d = POWER_DEF[it.type];
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.arc(x, y, 20, 0, TAU); ctx.fill();
      ctx.strokeStyle = d.color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + TAU * it.k); ctx.stroke();
      drawPowerIcon(ctx, it.type, x, y, 13);
      if (it.label) { ctx.textAlign = 'center'; ctx.font = 'bold 12px ' + FONT; strokeText(ctx, it.label, x, y + 36, '#fff', 'rgba(0,0,0,0.8)', 3); }
      x += 50;
    }
  },

  // Boss 血条：顶部居中，名字 + 阶段刻度（60% / 30%）
  drawBossBar(ctx, b) {
    const bw = 440, bh = 18, bx = W / 2 - bw / 2 - 40, by = 34;
    const k = b.hpRatio;
    ctx.textAlign = 'left'; ctx.font = 'bold 20px ' + FONT;
    strokeText(ctx, 'Deadline', bx, by - 8, '#ffd9de', 'rgba(0,0,0,0.85)', 5);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; rrPath(ctx, bx - 3, by - 3, bw + 6, bh + 6, 8); ctx.fill();
    const col = k > 0.6 ? '#ffb703' : k > 0.3 ? '#fb5607' : '#e5173f';
    ctx.fillStyle = b.flash > 0 ? '#fff' : col;
    if (k > 0) { rrPath(ctx, bx, by, Math.max(6, bw * k), bh, 6); ctx.fill(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2;
    for (const m of [0.6, 0.3]) { ctx.beginPath(); ctx.moveTo(bx + bw * m, by); ctx.lineTo(bx + bw * m, by + bh); ctx.stroke(); }
    ctx.textAlign = 'right'; ctx.font = '13px ' + FONT;
    strokeText(ctx, b.hp + ' / ' + b.maxHp + '   阶段 ' + b.phase, bx + bw, by - 8, '#fff', 'rgba(0,0,0,0.8)', 3);
  },

  // 屏幕中央的大字提示（先放大弹出，再淡出）
  drawBanner(ctx, b) {
    const k = clamp(b.t / 0.25, 0, 1), fade = clamp((b.dur - b.t) / 0.4, 0, 1);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(W / 2, H * 0.3);
    ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 56px ' + FONT;
    strokeText(ctx, b.text, 0, 0, '#ffe08a', 'rgba(0,0,0,0.8)', 8);
    if (b.sub) { ctx.font = '22px ' + FONT; strokeText(ctx, b.sub, 0, 40); }
    ctx.restore();
  }
};
