'use strict';
// 简易对象池：子弹和粒子用数组复用，避免频繁创建对象。
// 池里的对象需要有 active 字段。

class Pool {
  constructor(factory, max = 500) {
    this.factory = factory;
    this.max = max;
    this.items = [];
  }

  // 取一个空闲对象（没有就新建；到上限就返回 null）
  spawn() {
    const items = this.items;
    for (let i = 0; i < items.length; i++) if (!items[i].active) return items[i];
    if (items.length < this.max) {
      const it = this.factory();
      items.push(it);
      return it;
    }
    return null;
  }

  forEach(fn) {
    const items = this.items;
    for (let i = 0; i < items.length; i++) if (items[i].active) fn(items[i]);
  }

  clear() {
    for (let i = 0; i < this.items.length; i++) this.items[i].active = false;
  }

  count() {
    let n = 0;
    for (let i = 0; i < this.items.length; i++) if (this.items[i].active) n++;
    return n;
  }
}
