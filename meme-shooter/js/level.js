'use strict';
// 关卡：读取 LEVELS 数据，负责出怪和触发 Boss 房间。镜头滚动在 Game 里做。

class Level {
  constructor(def) {
    this.def = def;
    this.length = def.length;
    this.lockX = def.length - W;      // Boss 房间锁定后的镜头位置（最后一屏）
    this.reset();
  }

  reset() {
    this.idx = 0;
    this.bossTriggered = false;
  }

  update(game) {
    const px = game.player.x, sp = this.def.spawns;
    while (this.idx < sp.length && px >= sp[this.idx].x) {
      game.spawnEnemy(sp[this.idx], game.camX + W + 40 + (sp[this.idx].off || 0));
      this.idx++;
    }
    if (!this.bossTriggered && px >= this.def.bossTriggerX) {
      this.bossTriggered = true;
      game.enterBossRoom();
    }
  }
}
