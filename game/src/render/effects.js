import * as T from '../../vendor/three.module.min.js';
import { addMesh, lightPaint } from './geometry.js';
import { createRandom } from '../random.js';

export function createEffects(scene) {
  const random = createRandom(4412);
  const shape = new T.BoxGeometry(1, 1, 1);
  const flare = new T.IcosahedronGeometry(1, 0);
  const mark = new T.PlaneGeometry(.25, .77);
  const sparkMaterial = lightPaint('#ffd092');
  const flashMaterial = lightPaint('#fff2a7');
  const streakMaterial = lightPaint('#ffd596');
  const smokeMaterial = new T.MeshBasicMaterial({ color: '#a2999b', transparent: true, opacity: .24, depthWrite: false });
  const tireMaterial = new T.MeshBasicMaterial({ color: '#212532', transparent: true, opacity: .44, depthWrite: false });
  const groups = new Map();

  function pool(name, count, geometry, material) {
    groups.set(name, { next: 0, nodes: Array.from({ length: count }, () => {
      const mesh = addMesh(scene, geometry, material, 0, 0, 0, false);
      mesh.visible = false;
      return { mesh, life: 0, vx: 0, vy: 0, vz: 0, size: 1 };
    }) });
  }
  pool('spark', 50, shape, sparkMaterial);
  pool('flash', 6, flare, flashMaterial);
  pool('trace', 10, shape, streakMaterial);
  pool('smoke', 20, flare, smokeMaterial);
  pool('skid', 108, mark, tireMaterial);

  function emit(name, x, y, z, life) {
    const group = groups.get(name);
    const item = group.nodes[group.next++ % group.nodes.length];
    item.mesh.visible = true;
    item.mesh.position.set(x, y, z);
    item.mesh.rotation.set(0, 0, 0);
    item.life = life;
    item.vx = item.vy = item.vz = 0;
    return item;
  }

  function sparks(x, y, z, count = 14) {
    for (let i = 0; i < count; i++) {
      const item = emit('spark', x, y, z, .26 + random() * .44);
      item.vx = (random() - .5) * 15;
      item.vy = 2 + random() * 7;
      item.vz = (random() - .5) * 14;
      item.mesh.rotation.z = random() * 6;
      item.mesh.scale.set(.045, .09 + random() * .19, .047);
    }
  }

  function flash(x, y, z, heading, range) {
    const item = emit('flash', x, y, z, .076);
    item.mesh.scale.set(.21, .15, .36);
    item.mesh.rotation.y = -heading;
    const length = Math.min(29, range);
    const trace = emit('trace', x + Math.sin(heading) * length / 2, y, z - Math.cos(heading) * length / 2, .05);
    trace.mesh.rotation.y = -heading;
    trace.mesh.scale.set(.018, .018, length);
  }

  let lastSmoke = 0;
  let lastMark = 0;
  let time = 0;
  function smoke(x, y, z) {
    if (time < lastSmoke) return;
    lastSmoke = time + .12;
    const item = emit('smoke', x + random() * .3, y, z, .95);
    item.vx = -.5 + random();
    item.vy = 1.4;
    item.size = .15;
  }

  function skid(car) {
    if (time < lastMark) return;
    lastMark = time + .047;
    for (const side of [-1, 1]) {
      const x = car.x + Math.cos(car.heading) * side * .72 - Math.sin(car.heading) * 1.26;
      const z = car.z + Math.sin(car.heading) * side * .72 + Math.cos(car.heading) * 1.26;
      const item = emit('skid', x, -.011, z, 13);
      item.mesh.rotation.set(-Math.PI / 2, 0, -car.heading, 'YXZ');
      item.mesh.scale.y = Math.max(1, Math.abs(car.speed) * .055);
    }
    if (Math.abs(car.speed) > 15) smoke(car.x, .15, car.z);
  }

  function update(dt) {
    time += dt;
    for (const [name, group] of groups) for (const item of group.nodes) {
      if (!item.mesh.visible) continue;
      item.life -= dt;
      if (item.life <= 0) {
        item.mesh.visible = false;
        continue;
      }
      item.mesh.position.x += item.vx * dt;
      if (item.vy) item.mesh.position.y = Math.max(.045, item.mesh.position.y + item.vy * dt);
      item.mesh.position.z += item.vz * dt;
      if (name === 'spark') item.vy -= 16 * dt;
      if (name === 'smoke') {
        item.size += dt * .72;
        item.mesh.scale.setScalar(item.size);
      }
    }
  }
  return { sparks, flash, smoke, skid, update };
}

export function createSirenGlow(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(.15, 'rgba(255,255,255,.68)');
  gradient.addColorStop(.42, 'rgba(255,255,255,.20)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,64,64);
  const texture = new T.CanvasTexture(canvas);
  const glows = Array.from({ length: 12 }, (_, i) => {
    const sprite = new T.Sprite(new T.SpriteMaterial({
      map: texture, color: i % 2 ? '#4bb9ff' : '#ff3451',
      blending: T.AdditiveBlending, depthWrite: false, transparent: true, fog: false,
    }));
    sprite.scale.set(2.6, 2.6, 1);
    sprite.visible = false;
    scene.add(sprite);
    return sprite;
  });
  const bounce = new T.PointLight('#ff5264', 0, 22, 1.75);
  scene.add(bounce);
  return function update(units, player, time) {
    const closest = units.reduce((best, car) => {
      const d = Math.hypot(car.x - player.x, car.z - player.z);
      return d < best.d ? { car, d } : best;
    }, { car: null, d: 28 });
    bounce.intensity = closest.car ? 35 : 0;
    if (closest.car) {
      bounce.color.set(Math.floor(time * 6) % 2 ? '#63a6ff' : '#ff3458');
      bounce.position.set(closest.car.x, 1.95, closest.car.z);
    }
    for (let i = 0; i < glows.length; i++) {
      const car = units[Math.floor(i / 2)];
      const glow = glows[i];
      const side = i % 2 === 0 ? -1 : 1;
      const phase = car ? Math.floor(time * 9 + car.phase * 3) % 4 : 0;
      glow.visible = !!car && (side < 0 ? phase < 2 : phase > 0);
      if (glow.visible) {
        glow.position.set(car.x + Math.cos(car.heading) * side * .39, 1.76, car.z + Math.sin(car.heading) * side * .39);
        glow.material.opacity = .76;
      }
    }
  };
}
