'use strict';
// 统一键盘 + 鼠标输入。对外只暴露：
//   Input.isDown(action)      按住中
//   Input.wasPressed(action)  这一帧刚按下（一帧后自动清掉）
//   Input.clicks              这一帧的鼠标点击（逻辑坐标）

const Input = {
  map: {
    left:    ['KeyA', 'ArrowLeft'],
    right:   ['KeyD', 'ArrowRight'],
    jump:    ['KeyW', 'ArrowUp', 'Space'],
    shoot:   ['KeyJ'],
    special: ['KeyK'],
    pause:   ['KeyP', 'Escape'],
    restart: ['KeyR'],
    confirm: ['Enter'],
    mute:    ['KeyM']
  },
  keys: new Set(),       // 当前按住的 code
  pressed: new Set(),    // 这一帧新按下的 code
  mouseDown: false,
  clicks: [],
  anyPress: false,       // 这一帧有任意键/点击（标题页「按任意键开始」用）
  onGesture: null,       // 第一次用户手势回调（用来启动音频）
  _canvas: null,

  init(canvas) {
    this._canvas = canvas;
    const gameCodes = new Set(Object.values(this.map).flat());

    window.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;   // 不拦浏览器快捷键（刷新等）
      if (gameCodes.has(e.code)) e.preventDefault();    // 防止空格/方向键滚动页面
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      this.anyPress = true;
      if (this.onGesture) this.onGesture();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));

    canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      this.mouseDown = true;
      this.anyPress = true;
      if (this.onGesture) this.onGesture();
      const r = canvas.getBoundingClientRect();
      this.clicks.push({ x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H });
      canvas.focus();
    });
    window.addEventListener('mouseup', e => { if (e.button === 0) this.mouseDown = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // 切走窗口时清掉所有按住状态，避免回来后角色一直在跑
    window.addEventListener('blur', () => this.releaseAll());
  },

  releaseAll() {
    this.keys.clear();
    this.mouseDown = false;
  },

  isDown(action) {
    if (action === 'shoot' && this.mouseDown) return true;
    return this.map[action].some(c => this.keys.has(c));
  },

  wasPressed(action) {
    return this.map[action].some(c => this.pressed.has(c));
  },

  // 每帧结束调用
  endFrame() {
    this.pressed.clear();
    this.clicks.length = 0;
    this.anyPress = false;
  }
};
