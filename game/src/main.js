import * as T from '../vendor/three.module.min.js';
import { createInput } from './player/input.js';
import { createSimulation, NEUTRAL } from './world/simulation.js';
import { createHud } from './ui/hud.js';
import { createMenus } from './ui/menus.js';
import { prepareShot } from './shots.js';

const FIXED_STEP = 1 / 60;
const SHOTS = new Set(['chase', 'street', 'mission', 'menu']);

function boot() {
  const canvas = document.getElementById('view');
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    document.getElementById('title').hidden = true;
    document.getElementById('overlay').hidden = false;
    document.getElementById('pause-actions').hidden = true;
    document.getElementById('error-panel').hidden = false;
    document.getElementById('overlay-title').textContent = 'Graphics unavailable';
    return;
  }

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(64, 1, .16, 1600);
  const input = createInput(canvas);
  const params = new URLSearchParams(location.search);
  const shot = SHOTS.has(params.get('shot')) ? params.get('shot') : null;
  const seed = Number(params.get('seed')) || 2601;
  const game = createSimulation(scene, camera, seed, input, !!shot);
  const hud = createHud();
  game.menus = createMenus(game);
  game.menus.show('title');
  if (shot) prepareShot(game, shot);

  function resize() {
    renderer.setPixelRatio(Math.min(1.5, devicePixelRatio, 1920 / innerWidth));
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.menus.mode === 'play' && !frozen) game.menus.togglePause();
  });

  let frozen = !!shot;
  let accumulator = 0;
  let last = performance.now();
  let queued = new Set();
  let frames = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.08, (now - last) / 1000);
    last = now;
    if (input.take('Escape') || input.take('KeyP')) game.menus.togglePause();
    if (input.take('KeyM')) game.menus.toggleMap();
    if (input.take('Enter')) {
      if (game.menus.mode === 'title') game.start(!document.getElementById('continue').hidden);
      else if (game.menus.mode === 'busted') game.retry();
      else if (game.menus.mode === 'pause') game.menus.togglePause();
    }
    const controls = input.poll();
    if (frozen && (controls.presses.size || controls.attack || controls.aim || controls.throttle || controls.steer || game.menus.mode === 'play' && shot === 'menu')) {
      frozen = false;
      if (game.menus.mode === 'play') game.audio.start();
    }
    for (const key of controls.presses) queued.add(key);
    controls.presses = queued;
    const active = game.menus.mode === 'play';
    const title = game.menus.mode === 'title' || game.menus.mode === 'help' && !document.getElementById('title').hidden;
    if (active && !frozen) {
      accumulator += dt;
      while (accumulator >= FIXED_STEP && game.menus.mode === 'play') {
        game.simulate(controls, FIXED_STEP);
        queued.clear();
        accumulator -= FIXED_STEP;
      }
    } else {
      accumulator = 0;
      queued = new Set();
      if (title && !frozen) game.idle(dt);
    }
    game.renderState(active ? controls : NEUTRAL, dt, title);
    hud.show(!title && game.menus.mode !== 'error');
    if (!title) hud.update(game, camera, controls);
    game.audio.update(game, active && !frozen);
    renderer.render(scene, camera);
    frames++;
    if (shot && frames === 2) window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}

boot();
