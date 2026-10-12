'use strict';
// 关卡数据。第 2、3 关以后只需要往 LEVELS 里加元素。
//
// spawns 里每一项：
//   x   : 主角走到这个 x（世界坐标）时触发
//   t   : 类型 crawler 爬行 / jumper 跳跃 / flyer 飞行 / crate 道具箱
//   off : （可选）在屏幕右侧外再往后挪多少像素，用来让同一时刻出的怪错开
//
// 敌人从屏幕右边外面冒出来；bossTriggerX 走到就锁屏进 Boss 房间。

const LEVELS = [
  {
    name: 'Bug 森林',
    length: 4800,            // 整关长度，最后一屏（3840–4800）就是 Boss 房间
    bossTriggerX: 3900,
    spawns: [
      // ---- 0–1200：教学，只有爬行 Bug，一只一只来 ----
      { x: 250,  t: 'crawler' },
      { x: 480,  t: 'crawler' },
      { x: 660,  t: 'crawler' },
      { x: 800,  t: 'crawler' },
      { x: 900,  t: 'crawler', off: 90 },
      { x: 1000, t: 'crawler' },
      { x: 1060, t: 'crawler', off: 100 },
      { x: 1150, t: 'crawler' },

      // ---- 1200–3000：混入跳跃 Bug 和飞行 Bug ----
      { x: 1250, t: 'jumper' },
      { x: 1350, t: 'crawler' },
      { x: 1450, t: 'jumper' },
      { x: 1520, t: 'crawler', off: 80 },
      { x: 1650, t: 'flyer' },
      { x: 1750, t: 'crawler' },
      { x: 1850, t: 'jumper' },
      { x: 1950, t: 'flyer' },
      { x: 2050, t: 'crawler' },
      { x: 2100, t: 'jumper', off: 100 },
      { x: 2250, t: 'flyer' },
      { x: 2320, t: 'crawler' },
      { x: 2420, t: 'jumper' },
      { x: 2500, t: 'flyer' },
      { x: 2600, t: 'crawler' },
      { x: 2650, t: 'crawler', off: 90 },
      { x: 2760, t: 'jumper' },
      { x: 2850, t: 'flyer' },
      { x: 2930, t: 'crawler' },

      // ---- 3000–3900：出现道具箱，然后进 Boss 房间 ----
      { x: 3000, t: 'crate' },
      { x: 3060, t: 'crawler' },
      { x: 3150, t: 'jumper' },
      { x: 3250, t: 'crate' },
      { x: 3300, t: 'flyer' },
      { x: 3400, t: 'crawler' },
      { x: 3500, t: 'crate' },
      { x: 3560, t: 'jumper' },
      { x: 3650, t: 'crawler' },
      { x: 3750, t: 'crate' }
    ]
  }
];
