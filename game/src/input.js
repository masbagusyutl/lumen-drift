// Keyboard, mouse and touch input. The world only ever asks three things:
// which way to thrust (a unit vector), whether a dash was just pressed, and
// which one-shot actions (confirm, pause) happened since the last frame.
// Holding the pointer down steers the ship toward it; the keyboard wins when
// both are used at once.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const KEY_DIRECTIONS = {
  ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 }
};

/** Hold J or X to fire the blaster in the direction the ship points. */
const FIRE_KEYS = new Set(['KeyJ', 'KeyX']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let dashQueued = false;
  let pointerDown = false;
  let pointerX = 0;
  let pointerY = 0;

  window.addEventListener('keydown', (event) => {
    if (KEY_DIRECTIONS[event.code] || FIRE_KEYS.has(event.code) || event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Space') {
      actions |= ACTION_CONFIRM;
      dashQueued = true;
    }
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'Enter') actions |= ACTION_CONFIRM;
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());

  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointerX = ((clientX - rect.left) / rect.width) * 1280;
    pointerY = ((clientY - rect.top) / rect.height) * 720;
  }

  canvas.addEventListener('pointerdown', (event) => {
    pointerDown = true;
    toField(event.clientX, event.clientY);
    actions |= ACTION_CONFIRM;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (pointerDown) toField(event.clientX, event.clientY);
  });
  canvas.addEventListener('pointerup', () => { pointerDown = false; });
  canvas.addEventListener('pointercancel', () => { pointerDown = false; });
  canvas.addEventListener('dblclick', () => { dashQueued = true; });

  return {
    /** The thrust direction: keyboard first, then the held pointer, else still. */
    direction(ship) {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const dir = KEY_DIRECTIONS[code];
        if (dir) { x += dir.x; y += dir.y; }
      }
      if (x !== 0 || y !== 0) {
        const length = Math.hypot(x, y);
        return { x: x / length, y: y / length };
      }
      if (pointerDown && ship) {
        const dx = pointerX - ship.x;
        const dy = pointerY - ship.y;
        const length = Math.hypot(dx, dy);
        if (length > 26) return { x: dx / length, y: dy / length };
      }
      return { x: 0, y: 0 };
    },
    /** True once per dash press (Space, or a double-click), then spent. */
    consumeDash() {
      const was = dashQueued;
      dashQueued = false;
      return was;
    },
    /** True while a fire key is held down. */
    firing() {
      for (const code of held) if (FIRE_KEYS.has(code)) return true;
      return false;
    },
    /** The one-shot actions since the last call, as a bitmask; reading spends them. */
    takeActions() {
      const was = actions;
      actions = 0;
      return was;
    }
  };
}
