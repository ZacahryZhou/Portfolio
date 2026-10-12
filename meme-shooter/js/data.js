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

// 说话的角色：名字（字幕标签）+ 颜色。语音音调在 audio.js 的 VOICE_PITCH 里（主角 1.2 / 小兵 1.6 / Boss 0.7）。
const ROLES = {
  player: { name: 'Zachary',  color: '#4cc9f0' },
  minion: { name: 'Bug',      color: '#9be564' },
  boss:   { name: 'Deadline', color: '#ff4d6d' }
};

// 所有台词都在这里，想改成你和朋友之间的梗直接改字符串就行。
// 前 8 组是方案里的初稿，后面几组是我补的（小兵、阶段切换、Ctrl+Z、护盾）。
const LINES = {
  start:   ["今天的作业，我一个字都不会交！", "来吧，Deadline，我准备好了。"],
  hit:     ["哎哟！", "别打脸！", "我的脸！"],
  kill:    ["Bug 已修复。", "下一个！", "代码审查通过。"],
  powerup: ["续命成功！", "咖啡续一波。"],
  bossIntro: ["你的作业呢？", "交了吗？"],
  bossHit: ["你再写啊！", "时间不多了！"],
  gameover: ["Deadline 又赢了。", "明天再战，今晚先睡。", "这个 Bug 我下次一定修。"],
  win:     ["提交成功，满分！", "Deadline，你也有今天。", "我才是时间的主人。"],

  minionDie: ["我的 Bug 生涯……", "报错了啊啊啊", "别 Debug 我！"],
  phase2:  ["想跑？截止日期到了！", "我冲了啊！"],
  phase3:  ["再来一批 Bug！", "全员加班！"],
  ctrlz:   ["撤销！全部撤销！", "Ctrl+Z，世界清净了。"],
  shield:  ["差点就挂了。", "护盾救我一命。"]
};
