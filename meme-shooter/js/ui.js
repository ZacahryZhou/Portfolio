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

    // 分数
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'right';
    ctx.font = 'bold 26px ' + FONT;
    strokeText(ctx, String(game.stats.score).padStart(6, '0'), W - 20, 38);
    // 关卡进度条
    const bx = W / 2 - 110, by = 24, bw = 220;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; rrPath(ctx, bx, by, bw, 8, 4); ctx.fill();
    const prog = clamp(p.x / game.level.length, 0, 1);
    ctx.fillStyle = '#ffd166'; rrPath(ctx, bx, by, Math.max(8, bw * prog), 8, 4); ctx.fill();
    ctx.fillStyle = '#ff3860'; ctx.beginPath(); ctx.arc(bx + bw, by + 4, 8, 0, TAU); ctx.fill();   // 终点 = Boss
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx + bw * prog, by + 4, 6, 0, TAU); ctx.fill();
    ctx.textAlign = 'center'; ctx.font = '12px ' + FONT;
    strokeText(ctx, game.level.def.name, W / 2, by + 28, '#fff', 'rgba(0,0,0,0.7)', 3);

    ctx.textAlign = 'right';
    ctx.font = '14px ' + FONT;
    strokeText(ctx, '最高 ' + String(game.highScore).padStart(6, '0'), W - 20, 58, '#ffe08a', 'rgba(0,0,0,0.75)', 4);
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
