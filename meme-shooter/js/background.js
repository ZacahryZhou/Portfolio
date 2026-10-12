'use strict';
// 「Bug 森林」背景：三层视差滚动，全部用 Canvas 画渐变和几何形状，不用图片。
//   远处的山（0.12） → 中景的树（0.45） → 地面（1.0）
// 山和树预先画到离屏 canvas 里，每帧只是平铺 drawImage，很省。

const Background = {
  layers: null,

  init(pixelScale) {
    const ps = pixelScale;
    const make = (w, h, fn) => {
      const c = document.createElement('canvas');
      c.width = w * ps; c.height = h * ps;
      const g = c.getContext('2d');
      g.scale(ps, ps);
      fn(g, w, h);
      return { c, w, h };
    };

    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    // 天空（固定不动）
    const sky = make(W, H, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, GROUND_Y);
      gr.addColorStop(0, '#5ab4f5'); gr.addColorStop(0.7, '#b9e6ff'); gr.addColorStop(1, '#e6f8ff');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff6b0'; g.beginPath(); g.arc(780, 90, 36, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,246,176,0.25)'; g.beginPath(); g.arc(780, 90, 58, 0, TAU); g.fill();
    });

    // 远山：用整数倍周期的正弦叠加，保证左右无缝平铺
    const MW = 1920;
    const mountains = make(MW, 300, (g, w, h) => {
      for (const [col, base, amp, k1, k2, ph] of [
        ['#9db8e0', 190, 70, 3, 7, 0.4],
        ['#7f9dd0', 230, 55, 4, 9, 2.0]
      ]) {
        g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
        for (let x = 0; x <= w; x += 8) {
          const y = base - amp * (0.6 * Math.abs(Math.sin(TAU * k1 * x / w + ph)) + 0.4 * Math.sin(TAU * k2 * x / w + ph * 2));
          g.lineTo(x, y);
        }
        g.lineTo(w, h); g.closePath(); g.fill();
      }
    });

    // 中景的树
    const TW = 1440;
    const trees = make(TW, 360, (g, w, h) => {
      const drawTree = (x, s, shade) => {
        g.fillStyle = shade ? '#4a3425' : '#5b4030';
        g.fillRect(x - 9 * s, h - 120 * s, 18 * s, 120 * s);
        const cols = shade ? ['#2f7a3a', '#37894a'] : ['#3d9a48', '#49ad55'];
        for (const [dx, dy, r, ci] of [[0, -150, 52, 0], [-34, -118, 40, 1], [34, -118, 40, 1], [0, -112, 44, 0]]) {
          g.fillStyle = cols[ci]; g.beginPath(); g.arc(x + dx * s, h + dy * s, r * s, 0, TAU); g.fill();
        }
      };
      for (let i = 0; i < 11; i++) {
        const x = (i + 0.5) * (w / 11) + (rnd() - 0.5) * 50, s = 0.8 + rnd() * 0.45, shade = rnd() < 0.5;
        drawTree(x, s, shade);
        if (x < 120) drawTree(x + w, s, shade);      // 补边，保证无缝
        if (x > w - 120) drawTree(x - w, s, shade);
      }
    });

    // 漂浮的代码符号（Bug 森林的萤火虫）
    const glyphs = [];
    for (let i = 0; i < 14; i++) glyphs.push({ x: rnd() * 1800, y: 140 + rnd() * 220, t: pick(['0', '1', '{ }', '</>', ';', '404', '0x']), ph: rnd() * 6 });

    // 地面纹理（草丛、石子），每 480px 重复
    const GW = 480;
    const ground = make(GW, H - GROUND_Y + 12, (g, w, h) => {
      g.translate(0, 12); h -= 12;      // 上方留 12px 给草尖
      g.fillStyle = '#5a9e3a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#8bd35a'; g.fillRect(0, 0, w, 10);
      g.fillStyle = '#6fb347'; g.fillRect(0, 10, w, 6);
      g.fillStyle = '#4a8630'; g.fillRect(0, 44, w, h);
      for (let i = 0; i < 16; i++) {
        const x = rnd() * w;
        g.fillStyle = '#7bc74d';
        g.beginPath(); g.moveTo(x - 5, 0); g.lineTo(x, -9 - rnd() * 6); g.lineTo(x + 5, 0); g.fill();
      }
      g.fillStyle = 'rgba(0,0,0,0.13)';
      for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(rnd() * w, 26 + rnd() * 58, 6 + rnd() * 8, 3 + rnd() * 3, 0, 0, TAU); g.fill(); }
    });

    this.layers = { sky, mountains, trees, ground, glyphs };
  },

  _tile(ctx, layer, scroll, y) {
    let x = -(((scroll % layer.w) + layer.w) % layer.w);
    for (; x < W; x += layer.w) ctx.drawImage(layer.c, x, y, layer.w, layer.h);
  },

  // mood：0 = 平时，1 = Boss 房间（天色变红、四周压暗）
  draw(ctx, camX, t = 0, mood = 0) {
    const L = this.layers;
    ctx.drawImage(L.sky.c, 0, 0, W, H);

    // 云（很慢地漂）
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 5; i++) {
      const cx = (((i * 330 - camX * 0.05 - t * 6) % 1650) + 1650) % 1650 - 150, cy = 60 + (i % 3) * 42;
      ctx.beginPath(); ctx.ellipse(cx, cy, 52, 17, 0, 0, TAU); ctx.ellipse(cx + 30, cy - 9, 36, 16, 0, 0, TAU); ctx.ellipse(cx - 30, cy - 5, 30, 13, 0, 0, TAU); ctx.fill();
    }

    this._tile(ctx, L.mountains, camX * 0.12, GROUND_Y - 300);
    this._tile(ctx, L.trees, camX * 0.45, GROUND_Y - 360 + 6);

    // 代码符号
    ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(30,90,40,0.55)';
    for (const g of L.glyphs) {
      const x = (((g.x - camX * 0.3) % 1800) + 1800) % 1800 - 120;
      if (x < -40 || x > W + 40) continue;
      ctx.fillText(g.t, x, g.y + Math.sin(t * 1.4 + g.ph) * 8);
    }

    this._tile(ctx, L.ground, camX, GROUND_Y - 12);

    if (mood > 0) {
      ctx.fillStyle = 'rgba(160,10,30,' + (0.28 * mood) + ')'; ctx.fillRect(0, 0, W, H);
      const v = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 620);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,' + (0.55 * mood) + ')');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
  }
};
