'use strict';
// 标题页 / 失败页 / 通关页，以及最高分存取。
// 所有装饰（骷髅、皇冠、星星）都用 Canvas 画，不依赖 emoji 字体。

// ---------- 最高分（localStorage，读写都 try/catch） ----------
const Store = {
  key: 'memeShooter.highScore',
  loadHigh() {
    try {
      const v = parseInt(localStorage.getItem(this.key), 10);
      return isFinite(v) && v > 0 ? v : 0;
    } catch (e) { return 0; }
  },
  saveHigh(v) {
    try { localStorage.setItem(this.key, String(v)); } catch (e) { /* 隐私模式等：忽略 */ }
  }
};

// ---------- 小装饰 ----------
function drawSkull(ctx, x, y, s, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#f3f3f3'; ctx.strokeStyle = '#555'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, -3, 14, 0, TAU); ctx.fill(); ctx.stroke();
  rrPath(ctx, -8, 6, 16, 10, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(-5.5, -4, 4, 0, TAU); ctx.arc(5.5, -4, 4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(-2.2, 5); ctx.lineTo(2.2, 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(-3, 15); ctx.moveTo(0, 8); ctx.lineTo(0, 15); ctx.moveTo(3, 8); ctx.lineTo(3, 15); ctx.stroke();
  ctx.restore();
}

function drawCrown(ctx, x, y, s) {      // (x, y) = 皇冠底边中心
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#ffd166'; ctx.strokeStyle = '#a56a00'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-28, 0); ctx.lineTo(-32, -34); ctx.lineTo(-15, -17); ctx.lineTo(0, -42); ctx.lineTo(15, -17); ctx.lineTo(32, -34); ctx.lineTo(28, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ef476f'; ctx.beginPath(); ctx.arc(0, -10, 4.5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#4cc9f0'; ctx.beginPath(); ctx.arc(-16, -8, 3.5, 0, TAU); ctx.arc(16, -8, 3.5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; for (const px of [-32, 0, 32]) { ctx.beginPath(); ctx.arc(px, px === 0 ? -44 : -36, 3.5, 0, TAU); ctx.fill(); }
  ctx.restore();
}

function drawStar(ctx, x, y, r, rot, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = color; ctx.strokeStyle = '#a56a00'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawButton(ctx, b, label, hot) {
  ctx.save();
  ctx.fillStyle = hot ? '#ffd166' : 'rgba(255,255,255,0.14)';
  ctx.strokeStyle = hot ? '#fff' : 'rgba(255,255,255,0.65)'; ctx.lineWidth = 3;
  rrPath(ctx, b.x, b.y, b.w, b.h, 14); ctx.fill(); ctx.stroke();
  ctx.font = 'bold 24px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = hot ? '#3b2a00' : '#fff';
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore(); ctx.textBaseline = 'alphabetic';
}

const easeOutBack = k => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const fmtTime = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

const Screens = {
  buttons: [],          // 每帧由当前页面填，Game 用来处理鼠标点击

  // ---------- 标题页 ----------
  drawTitle(ctx, g) {
    const t = g.titleT;
    this.buttons = [];
    Background.draw(ctx, t * 45, g.time, 0);
    ctx.fillStyle = 'rgba(8,12,34,0.5)'; ctx.fillRect(0, 0, W, H);

    // 两侧的配角：小兵探头，Boss 站在右边
    Assets.drawHead(ctx, 'minion', 150, 330 + Math.sin(t * 2.3) * 8, 96, Math.sin(t * 3) * 0.1);
    ctx.save(); ctx.translate(820, GROUND_Y + 10 + Math.sin(t * 1.6) * 3); ctx.scale(0.62, 0.62);
    ctx.drawImage(Assets.sprites.boss, -95, -357, 190, 357); ctx.restore();

    // 大标题：Zachary 大战 Deadline（按「名字」分色）
    const parts = [['Zachary', '#6fdcff'], [' 大战 ', '#ffffff'], ['Deadline', '#ff5d7a']];
    ctx.font = 'bold 74px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const widths = parts.map(p => ctx.measureText(p[0]).width), total = widths.reduce((a, b) => a + b, 0);
    let x = W / 2 - total / 2;
    const ty = 118 + Math.sin(t * 2) * 5;
    parts.forEach((p, i) => { strokeText(ctx, p[0], x, ty, p[1], '#14122b', 12); x += widths[i]; });
    ctx.textAlign = 'center'; ctx.font = '22px ' + FONT;
    strokeText(ctx, '—— 用你的脸，打败 Deadline ——', W / 2, ty + 42, '#ffe9a8', 'rgba(0,0,0,0.7)', 5);

    // 主角头像，轻轻上下浮动
    const hy = 290 + Math.sin(t * 2.4) * 10;
    const gl = ctx.createRadialGradient(W / 2, hy, 20, W / 2, hy, 150);
    gl.addColorStop(0, 'rgba(255,230,150,0.55)'); gl.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = gl; ctx.fillRect(W / 2 - 160, hy - 160, 320, 320);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(W / 2, 400, 70 - Math.sin(t * 2.4) * 8, 11, 0, 0, TAU); ctx.fill();
    Assets.drawHead(ctx, 'player', W / 2, hy, 170, Math.sin(t * 1.5) * 0.07);

    // 按任意键开始（闪烁）+ 最高分
    ctx.textAlign = 'center';
    if (Math.floor(t * 1.8) % 2 === 0 || t < 0.5) { ctx.font = 'bold 32px ' + FONT; strokeText(ctx, '按任意键开始', W / 2, 452, '#fff', 'rgba(0,0,0,0.8)', 7); }
    ctx.font = 'bold 20px ' + FONT;
    strokeText(ctx, '最高分  ' + String(g.highScore).padStart(6, '0'), W / 2, 486, '#ffe08a', 'rgba(0,0,0,0.8)', 5);

    ctx.font = '14px ' + FONT;
    strokeText(ctx, 'A / D 移动    W / 空格 跳    J 或 鼠标左键 射击    K 大招    P 暂停    M 静音', W / 2, 520, '#dfe6ff', 'rgba(0,0,0,0.8)', 4);

    // 占位头像提示（放好真图后自动消失）
    const missing = ['player', 'minion', 'boss'].filter(n => !Assets.real[n]);
    if (missing.length) {
      ctx.textAlign = 'left'; ctx.font = '13px ' + FONT;
      strokeText(ctx, '当前是占位头像：把 ' + missing.map(n => n + '.png').join(' / ') + ' 放进 assets/ 即可替换', 14, 24, '#ffd0d8', 'rgba(0,0,0,0.8)', 4);
    }
  },

  // ---------- 失败页 ----------
  drawGameOver(ctx, g) {
    const t = g.overT;
    this.buttons = [];
    Background.draw(ctx, g.level.lockX, g.time, 1);
    ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.78, t * 2) + ')'; ctx.fillRect(0, 0, W, H);

    // 标题
    ctx.textAlign = 'center';
    ctx.font = 'bold 60px ' + FONT;
    ctx.save(); ctx.globalAlpha = clamp(t * 2.5, 0, 1);
    strokeText(ctx, '你被 Deadline 抓住了', W / 2, 92, '#ff6b81', '#1a0509', 10);
    ctx.restore();

    // 灰色头像 + 飘起来的 💀
    const k = clamp((t - 0.15) / 0.6, 0, 1), sc = k > 0 ? easeOutBack(k) : 0;
    const hy = 238 + Math.sin(t * 1.6) * 5;
    ctx.save(); ctx.translate(W / 2, hy); ctx.rotate(-0.12 + Math.sin(t * 1.3) * 0.04); ctx.scale(sc, sc);
    Assets.drawHead(ctx, 'player', 0, 0, 210, 0, Assets.variant('player', 'gray'));
    ctx.restore();
    if (k >= 1) {
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.5 + i / 6) % 1;
        const sx = W / 2 + Math.sin(i * 2.1 + t) * 80 + (i % 2 ? 50 : -50), sy = hy - 50 - ph * 80;
        drawSkull(ctx, sx, sy, 0.9 + (i % 3) * 0.25, Math.sin(ph * Math.PI) * 0.95);
      }
    }

    // 台词（和语音同步）
    this._quote(ctx, g, 372, t > 0.5);

    // 数据
    if (t > 0.6) {
      ctx.font = 'bold 24px ' + FONT;
      strokeText(ctx, '得分 ' + g.stats.score + '      击杀 ' + g.stats.kills + '      最高分 ' + g.highScore, W / 2, 432, '#fff', 'rgba(0,0,0,0.8)', 5);
      if (g.newRecord) {
        ctx.font = 'bold 22px ' + FONT;
        strokeText(ctx, '新纪录！', W / 2 + 330, 432, '#ffd166', 'rgba(0,0,0,0.8)', 5);
      }
      this._buttons(ctx, g, 466);
    }
  },

  // ---------- 通关页 ----------
  drawWin(ctx, g) {
    const t = g.overT;
    this.buttons = [];
    Background.draw(ctx, g.level.lockX, g.time, 0);
    ctx.fillStyle = 'rgba(255,240,200,' + Math.min(0.35, t) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(10,10,40,0.35)'; ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.font = 'bold 56px ' + FONT;
    ctx.save(); ctx.globalAlpha = clamp(t * 2.5, 0, 1);
    strokeText(ctx, 'Deadline 被你搞定了', W / 2, 74, '#ffe08a', '#2a1a00', 10);
    ctx.restore();
    this._quote(ctx, g, 122, t > 0.4);

    // 左：主角 + 皇冠
    const k = clamp((t - 0.1) / 0.6, 0, 1), sc = k > 0 ? easeOutBack(k) : 0;
    const hx = 260, hy = 302 + Math.sin(t * 3) * 6;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(Math.sin(t * 2.2) * 0.07); ctx.scale(sc, sc);
    Assets.drawHead(ctx, 'player', 0, 0, 200);
    drawCrown(ctx, 0, -78, 1.9);
    ctx.restore();

    // 右：Boss 倒地（旋转 90°），头上转圈圈
    const bx = 700, by = 372;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(bx, by + 62, 120, 12, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.PI / 2); ctx.scale(0.62, 0.62);
    ctx.drawImage(Assets.sprites.boss, -95, -178.5, 190, 357);
    ctx.restore();
    const headX = bx + 64, headY = by - 6;
    for (let i = 0; i < 4; i++) {
      const a = t * 4 + i * TAU / 4;
      drawStar(ctx, headX + Math.cos(a) * 44, headY - 52 + Math.sin(a) * 12, 9, a * 1.5, i % 2 ? '#ffd166' : '#fff3b0');
    }

    // 彩带：开场大喷 + 持续两侧喷
    if (!g._confettiDone) { g._confettiDone = true; g.particles.confetti(60, H, 80, { angle: -1.1, spread: 0.5, speed: 900 }); g.particles.confetti(W - 60, H, 80, { angle: -Math.PI + 1.1, spread: 0.5, speed: 900 }); }
    g._confettiT = (g._confettiT || 0) - g.realDt;
    if (g._confettiT <= 0 && t < 6) {
      g._confettiT = 0.12;
      g.particles.confetti(rand(40, W - 40), -10, 4, { angle: Math.PI / 2, spread: 0.6, speed: 260 });
    }
    g.particles.draw(ctx);

    if (t > 0.5) {
      ctx.textAlign = 'center'; ctx.font = 'bold 24px ' + FONT;
      strokeText(ctx, '得分 ' + g.stats.score + '      用时 ' + fmtTime(g.stats.time) + '      受伤 ' + g.stats.hits + ' 次', W / 2, 452, '#fff', 'rgba(0,0,0,0.8)', 5);
      if (g.newRecord) {
        const w = 1 + Math.sin(t * 8) * 0.06;
        ctx.save(); ctx.translate(W / 2 + 120, 180); ctx.rotate(-0.2); ctx.scale(w, w);
        ctx.fillStyle = '#ffd166'; ctx.strokeStyle = '#a56a00'; ctx.lineWidth = 4; rrPath(ctx, -92, -26, 184, 52, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#7a1f00'; ctx.font = 'bold 32px ' + FONT; ctx.textBaseline = 'middle'; ctx.fillText('新纪录！', 0, 2);
        ctx.restore(); ctx.textBaseline = 'alphabetic';
      }
      this._buttons(ctx, g, 474);
    }
  },

  // 台词：说话人标签 + 引号里的话
  _quote(ctx, g, y, show) {
    if (!show || !g.endLine) return;
    const role = ROLES.player;
    ctx.font = 'bold 15px ' + FONT;
    const nw = ctx.measureText(role.name).width + 22;
    ctx.font = 'bold 30px ' + FONT;
    const tw = ctx.measureText('“' + g.endLine + '”').width;
    const x0 = W / 2 - (nw + 14 + tw) / 2;
    ctx.fillStyle = role.color; rrPath(ctx, x0, y - 24, nw, 26, 13); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 15px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(role.name, x0 + nw / 2, y - 10);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.font = 'bold 30px ' + FONT;
    strokeText(ctx, '“' + g.endLine + '”', x0 + nw + 14, y, '#fff', 'rgba(0,0,0,0.85)', 6);
    ctx.textAlign = 'center';
  },

  _buttons(ctx, g, y) {
    const again = { id: 'again', x: W / 2 - 250, y, w: 280, h: 48 };
    const title = { id: 'title', x: W / 2 + 50, y, w: 200, h: 48 };
    const pulse = Math.sin(g.time * 5) > 0;
    drawButton(ctx, again, '再来一次（R）', pulse);
    drawButton(ctx, title, '回标题（Esc）', false);
    this.buttons.push(again, title);
  }
};
