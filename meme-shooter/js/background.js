'use strict';
// 背景。M1 先放简单版（天空 + 地面），M3 换成三层视差。

const Background = {
  draw(ctx, camX) {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, '#6ec6ff');
    g.addColorStop(1, '#d8f3ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#5a9e3a';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = '#7bc74d';
    ctx.fillRect(0, GROUND_Y, W, 10);
    // 地面刻度，滚动时能看出在移动
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    const off = -(camX % 80);
    for (let x = off; x < W; x += 80) ctx.fillRect(x, GROUND_Y + 30, 40, 6);
  }
};
