'use strict';
// 全局常量 + 小工具函数。所有脚本共享全局作用域（普通 script 标签）。

const W = 960;            // 画布逻辑宽
const H = 540;            // 画布逻辑高
const GROUND_Y = 450;     // 地面（脚踩的 y）
const GRAVITY = 1800;     // px/s²
const TAU = Math.PI * 2;
const GAME_TITLE = 'Zachary 大战 Deadline';
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","WenQuanYi Micro Hei",sans-serif';

// 玩家参数（方案第 3.1 节）
const PLAYER_CFG = {
  speed: 260,
  jumpV: 710,          // sqrt(2 * 1800 * 140) ≈ 710 → 跳起高度约 140px
  maxHp: 3,
  invuln: 1.5,
  fireInterval: 0.25,
  bulletSpeed: 700,
  headD: 64,           // 头像显示直径
  coreR: 20,           // 受击判定小圆半径（比头像小一圈）
  coreY: 48            // 判定圆圆心离脚的高度
};

// ---- 小工具 ----
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// 圆 vs 圆
function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx, dy = ay - by, r = ar + br;
  return dx * dx + dy * dy < r * r;
}

// 圆 vs 矩形（AABB）
function circleRect(cx, cy, cr, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw), ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < cr * cr;
}

// 圆角矩形路径（不依赖 ctx.roundRect，老 Safari 也能用）
function rrPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
