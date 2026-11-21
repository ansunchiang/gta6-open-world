import { createVehicleModel, VEHICLE_TYPES, flashSiren } from './vehicleModel.js';
import { clamp, distance, turn, angle, blend } from '../render/geometry.js';
import { marineStep } from '../world/marina.js';

export function spawnVehicle(scene, type, color, x, z, heading, mode) {
  const model = createVehicleModel(scene, type, color);
  const car = { ...model, type, mode, x, z, heading, speed: 0, steering: 0,
    health: 100, driver: mode === 'traffic', phase: (x + z + 999) % 7, impact: 0,
  };
  syncVehicle(car, 0);
  return car;
}

export function syncVehicle(car, clock) {
  car.node.position.set(car.x, car.type === 'boat' ? Math.sin(clock * 2.3 + car.phase) * .07 : 0, car.z);
  car.node.rotation.set(Math.min(.04, car.impact * .04) * Math.sin(clock * 39), -car.heading, -car.steering * Math.min(Math.abs(car.speed) / 100, .13), 'YXZ');
  car.door.visible = (car.doorSwing ?? 0) > .02;
  car.door.rotation.y = -(car.doorSwing ?? 0);
  flashSiren(car, clock);
}

export function driveVehicle(car, input, city, vehicles, dt, effects, upgrades, onCrash) {
  const spec = VEHICLE_TYPES[car.type];
  const { throttle, steer, brake } = input;
  const top = spec.top + upgrades.engine * 5;
  car.steering = blend(car.steering, steer, 1 - Math.exp(-dt * 10));
  if (throttle !== 0) {
    const accel = Math.sign(car.speed) === throttle ? spec.accel : spec.accel * 1.8;
    const boost = throttle > 0 ? Math.max(.18, 1 - Math.abs(car.speed) / (top * 1.16)) : .75;
    car.speed += throttle * accel * boost * dt;
  } else car.speed *= Math.exp(-dt * (2.25 + (brake ? 5 : 0)));
  car.speed *= Math.exp(-dt * (brake ? 1.05 : .09));
  car.speed = clamp(car.speed, -12, top);
  const agility = (brake ? 2.15 : 1.61) - .27 * Math.min(1, Math.abs(car.speed) / top);
  car.heading += car.steering * agility * clamp(car.speed / 5.8, -1, 1) * dt;
  const x = Math.sin(car.heading) * car.speed * dt;
  const z = -Math.cos(car.heading) * car.speed * dt;
  const oldSpeed = car.speed;
  const bumped = car.type === 'boat' ? marineStep(car, car.x + x, car.z + z) :
    city.move(car, car.x + x, car.z + z, car.type === 'scooter' ? .61 : 1.19, true);
  if (bumped) car.speed *= -.24;

  for (const other of vehicles) {
    if (other === car || other.mode === 'held' || distance(car, other) > 4.5) continue;
    const dx = other.x - car.x;
    const dz = other.z - car.z;
    const ahead = Math.sin(car.heading) * dx - Math.cos(car.heading) * dz;
    const side = Math.cos(car.heading) * dx + Math.sin(car.heading) * dz;
    if (Math.abs(ahead) > 2.8 || Math.abs(side) > 1.78) continue;
    if (ahead * oldSpeed <= 0) continue;
    car.speed = Math.sign(oldSpeed) * Math.min(Math.abs(car.speed), Math.abs(other.speed)) * .39;
    other.impact = .72;
    if (Math.abs(oldSpeed) > 7 && car.impact <= 0) {
      other.health -= Math.abs(oldSpeed) * 1.32;
      if (other.type !== 'boat' && !other.barrier) city.move(other, other.x + dx * .26, other.z + dz * .26, 1.12, true);
      onCrash(other);
    }
    break;
  }
  if (Math.abs(oldSpeed - car.speed) > 5.1 && car.impact <= 0) {
    effects.sparks(car.x + Math.sin(car.heading) * 2, 0.64, car.z - Math.cos(car.heading) * 2);
    car.health = Math.max(0, car.health - Math.min(28, Math.abs(oldSpeed - car.speed) * .64) / (1 + upgrades.armor * .55));
    car.impact = .7;
  }
  car.impact = Math.max(0, car.impact - dt);
  if (car.type !== 'boat' && brake && Math.abs(steer) > .25 && Math.abs(car.speed) > 7) effects.skid(car);
}

export function guideVehicle(car, point, speed, dt, city) {
  const desired = angle(point.x - car.x, point.z - car.z);
  const error = turn(car.heading, desired);
  car.steering = clamp(error * 1.65, -1, 1);
  car.heading += clamp(error, -2.45 * dt, 2.45 * dt);
  const limit = speed * (Math.abs(error) > .7 ? .46 : 1);
  car.speed = blend(car.speed, limit, 1 - Math.exp(-dt * 2.6));
  return city.move(car, car.x + Math.sin(car.heading) * car.speed * dt, car.z - Math.cos(car.heading) * car.speed * dt, 1, true);
}
