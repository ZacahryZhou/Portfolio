'use strict';
// 游戏主体：状态机、主循环、画面切换。

const LEVEL_LEN = 4800;   // M3 会改成从 LEVELS 里读

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    // 逻辑分辨率固定 960x540；高分屏用 2 倍后备缓冲让画面更清晰
    this.pixelScale = (window.devicePixelRatio || 1) >= 1.5 ? 2 : 1;
    canvas.width = W * this.pixelScale;
    canvas.height = H * this.pixelScale;
    this.ctx = canvas.getContext('2d');

    this.debug = /[?&]debug\b/.test(location.search);
    this.state = 'PLAYING';
    this.time = 0;          // 动画用的总时间
    this.camX = 0;
    this.player = new Player();
    this.fps = 60;
  }

  // ---------- 更新 ----------
  update(dt) {
    this.time += dt;
    this.fps = lerp(this.fps, 1 / Math.max(dt, 0.0001), 0.05);

    const bounds = { minX: this.camX + 30, maxX: LEVEL_LEN - 30 };
    this.player.update(dt, Input, bounds);

    // 镜头跟随主角（主角在屏幕左偏 1/3 处），限制在关卡范围内
    const camTarget = clamp(this.player.x - 340, 0, LEVEL_LEN - W);
    this.camX = lerp(this.camX, camTarget, Math.min(1, 10 * dt));
  }

  // ---------- 绘制 ----------
  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.pixelScale, 0, 0, this.pixelScale, 0, 0);
    Background.draw(ctx, this.camX);

    ctx.save();
    ctx.translate(-Math.round(this.camX), 0);
    this.player.draw(ctx, this.time);
    ctx.restore();

    if (this.debug) {
      ctx.fillStyle = '#000'; ctx.font = '14px monospace'; ctx.textAlign = 'left';
      ctx.fillText('FPS ' + this.fps.toFixed(0) + '  x=' + this.player.x.toFixed(0), 10, 20);
    }
  }
}

// ---------- 启动 ----------
(function main() {
  const canvas = document.getElementById('game');
  Input.init(canvas);
  canvas.focus();

  Assets.load().then(() => {
    const game = new Game(canvas);
    window.__game = game;   // 方便在控制台调试 / 自动化测试

    let last = performance.now();
    function frame(now) {
      requestAnimationFrame(frame);
      // 切到后台再回来 dt 会很大 → 限制最大 0.05s，避免瞬移
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      game.update(dt);
      game.draw();
      Input.endFrame();
    }
    requestAnimationFrame(frame);
  });
})();
