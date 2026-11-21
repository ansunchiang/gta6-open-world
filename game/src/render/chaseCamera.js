import * as T from '../../vendor/three.module.min.js';
import { clamp, turn } from './geometry.js';

export function createChaseCamera(camera, city) {
  const next = new T.Vector3();
  const look = new T.Vector3();
  const rig = { yaw: 0, pitch: 0, manual: 0 };
  function update(player, input, dt, snap = false) {
    if (input.aim && (input.mouseX || input.mouseY)) {
      rig.yaw += input.mouseX * .004;
      rig.pitch = clamp(rig.pitch + input.mouseY * .0033, -.29, .52);
      rig.manual = 2.0;
    }
    rig.manual = Math.max(0, rig.manual - dt);
    const driving = !!player.car;
    if (snap || input.presses?.has('KeyC')) {
      rig.yaw = player.heading;
      rig.pitch = 0;
      rig.manual = 0;
    } else if (driving && !input.aim && rig.manual === 0 && Math.abs(player.car.speed) > 1.2) {
      rig.yaw += turn(rig.yaw, player.car.heading) * (1 - Math.exp(-dt * 3.8));
      rig.pitch *= Math.exp(-dt * 3.4);
    }

    const distance = driving ? 7.8 + Math.abs(player.car.speed) * .05 : input.aim ? 3.5 : 6.0;
    const lateral = driving ? -.36 : input.aim ? .96 : .18;
    const elevation = driving ? 4.0 : input.aim ? 2.19 : 2.64;
    const sine = Math.sin(rig.yaw), cosine = Math.cos(rig.yaw);
    const x = player.x + cosine * lateral, z = player.z + sine * lateral;
    const lookAhead = driving ? 7.8 : input.aim ? 9.5 : 6.8;
    let safe = 1.3;
    while (safe < distance && !city.obstacle(x - sine * safe, z + cosine * safe, .31, 1.5 + safe / distance * (elevation - 1.5))) {
      safe += .60;
    }
    safe = safe >= distance ? distance : Math.max(1, safe - .65);
    const damping = snap ? 1 : 1 - Math.exp(-dt * 11.5);
    next.set(x - sine * safe, Math.max(1.47, elevation + rig.pitch * 4.9), z + cosine * safe);
    camera.position.lerp(next, damping);
    next.set(x + sine * lookAhead, 1.67 - rig.pitch * 3.2, z - cosine * lookAhead);
    look.lerp(next, damping);
    camera.lookAt(look);
    const fov = driving ? 65 + Math.min(6, Math.abs(player.car.speed) * .19) : input.aim ? 57 : 64;
    if (Math.abs(camera.fov - fov) > .05) {
      camera.fov += (fov - camera.fov) * damping;
      camera.updateProjectionMatrix();
    }
  }
  return Object.assign(rig, { update });
}
