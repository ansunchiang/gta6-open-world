const gameplayKeys = new Set([
  'KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight',
  'KeyE','KeyF','KeyQ','KeyR','KeyC','KeyM','KeyP','Digit1','Digit2','Escape','Enter',
]);

export function createInput(canvas) {
  const held = new Set();
  const presses = new Set();
  let mouseX = 0;
  let mouseY = 0;
  let aim = false;
  let attack = false;

  function reset() {
    held.clear();
    presses.clear();
    aim = attack = false;
    mouseX = mouseY = 0;
  }
  window.addEventListener('keydown', event => {
    if (!gameplayKeys.has(event.code)) return;
    if (event.code === 'Enter' && document.activeElement?.tagName === 'BUTTON') return;
    if (!event.repeat) presses.add(event.code);
    held.add(event.code);
    event.preventDefault();
  });
  window.addEventListener('keyup', event => held.delete(event.code));
  window.addEventListener('blur', reset);
  canvas.addEventListener('mousedown', event => {
    if (event.button === 2) {
      aim = true;
      event.preventDefault();
    }
    if (event.button === 0) {
      attack = true;
      presses.add('MouseAttack');
    }
  });
  window.addEventListener('mouseup', event => {
    if (event.button === 2) aim = false;
    if (event.button === 0) attack = false;
  });
  canvas.addEventListener('pointercancel', reset);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  window.addEventListener('mousemove', event => {
    if (!aim) return;
    mouseX += event.movementX;
    mouseY += event.movementY;
  });
  const down = (...keys) => keys.some(key => held.has(key));
  return {
    down, reset,
    take(key) { return presses.delete(key); },
    poll() {
      const controls = {
        throttle: Number(down('KeyW','ArrowUp')) - Number(down('KeyS','ArrowDown')),
        steer: Number(down('KeyD','ArrowRight')) - Number(down('KeyA','ArrowLeft')),
        sprint: down('ShiftLeft','ShiftRight'),
        brake: down('Space'),
        aim, attack: attack || down('KeyF'),
        mouseX, mouseY, presses: new Set(presses),
      };
      mouseX = mouseY = 0;
      presses.clear();
      return controls;
    },
  };
}
