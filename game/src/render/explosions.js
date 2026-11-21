import * as T from '../../vendor/three.module.min.js';
import { radialTexture } from './effects.js';

export function createExplosions(scene) {
  const map = radialTexture(.48);
  const particles = Array.from({ length: 76 }, () => {
    const sprite = new T.Sprite(new T.SpriteMaterial({ map, transparent: true, depthWrite: false }));
    sprite.visible = false;
    scene.add(sprite);
    return { sprite, life: 0 };
  });
  const light = new T.PointLight('#ff6c32', 0, 27, 1.65);
  scene.add(light);
  let next = 0;
  function plume(x, y, z, size, life, heat, drift) {
    const particle = particles[next++ % particles.length];
    const { sprite } = particle;
    sprite.visible = true;
    sprite.position.set(x, y, z);
    sprite.material.rotation = next * 2.4;
    Object.assign(particle, { size, life, duration: life, heat, drift });
  }
  function flame(x, z, phase, burst = false) {
    plume(x + Math.sin(phase) * .85, 1.18, z + Math.cos(phase) * 1.16, burst ? 5.8 : 2.9, burst ? .89 : .62, true, phase);
    plume(x, .82, z, burst ? 3.1 : 1.20, .44, true, phase + 2);
    plume(x + .5, 1.7, z, burst ? 4.3 : 2.1, 3.4, false, phase);
    light.position.set(x, 2, z);
    light.intensity = burst ? 85 : Math.max(30, light.intensity);
  }
  function update(dt) {
    light.intensity *= Math.exp(-dt * 4);
    for (const item of particles) {
      if (!item.sprite.visible) continue;
      item.life -= dt;
      if (item.life <= 0) { item.sprite.visible = false; continue; }
      const age = 1 - item.life / item.duration;
      item.sprite.material.opacity = item.heat ? (1 - age) * .92 : Math.min(1, age * 7 + .28) * (1 - age) * .94;
      item.sprite.material.color.set(item.heat && age < .22 ? '#ffc45c' : item.heat ? '#ff531d' : '#2f2833');
      const size = item.size * (1 + age * (item.heat ? .46 : 1.8));
      item.sprite.scale.set(size, size * (item.heat ? 1.23 : 1), 1);
      item.sprite.position.y += dt * (item.heat ? 2.9 : 4.3);
      item.sprite.position.x += dt * (item.heat ? Math.sin(item.drift) * .35 : .78);
      item.sprite.position.z += dt * Math.cos(item.drift) * .46;
    }
  }
  return { flame, plume, update, clear() {
    for (const item of particles) item.sprite.visible = false;
    light.intensity = 0;
  } };
}
