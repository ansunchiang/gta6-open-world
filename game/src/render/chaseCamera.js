import * as T from '../../vendor/three.module.min.js';
import { clamp, turn } from './geometry.js';

export function createChaseCamera(camera, city) {
  const target = new T.Vector3();
  const nextPosition = new T.Vector3();
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
    const elevation = driving ? 3.14 : input.aim ? 1.92 : 2.64;
    const forwardX = Math.sin(rig.yaw);
    const forwardZ = -Math.cos(rig.yaw);
    const rightX = Math.cos(rig.yaw);
    const rightZ = Math.sin(rig.yaw);
    const lookAhead = driving ? 7.8 : input.aim ? 9.5 : 6.8;
    target.set(player.x + forwardX * lookAhead + rightX * lateral, 1.67 - rig.pitch * 3.2, player.z + forwardZ * lookAhead + rightZ * lateral);

    let safe = distance;
    for (let step = 1.3; step <= distance; step += .60) {
      const x = player.x - forwardX * step + rightX * lateral;
      const z = player.z - forwardZ * step + rightZ * lateral;
      if (city.obstacle(x, z, .31, 1.5 + step / distance * (elevation - 1.5))) {
        safe = Math.max(1.0, step - .65);
        break;
      }
    }
    nextPosition.set(
      player.x - forwardX * safe + rightX * lateral,
      Math.max(1.47, elevation + rig.pitch * 4.9),
      player.z - forwardZ * safe + rightZ * lateral,
    );
    const roughness = player.car?.impact ?? player.hurt * .24;
    nextPosition.x += roughness * .10 * Math.sin(performance.now() * .044);
    const damping = snap ? 1 : 1 - Math.exp(-dt * 11.5);
    camera.position.lerp(nextPosition, damping);
    look.lerp(target, snap ? 1 : 1 - Math.exp(-dt * 12));
    camera.lookAt(look);
    const fov = driving ? 65 + Math.min(6, Math.abs(player.car.speed) * .19) : input.aim ? 57 : 64;
    if (Math.abs(camera.fov - fov) > .05) {
      camera.fov += (fov - camera.fov) * damping;
      camera.updateProjectionMatrix();
    }
  }
  return Object.assign(rig, { update });
}
