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
    ctx.font = '14px ' + FONT;
    strokeText(ctx, '最高 ' + String(game.highScore).padStart(6, '0'), W - 20, 58, '#ffe08a', 'rgba(0,0,0,0.75)', 4);
  }
};
