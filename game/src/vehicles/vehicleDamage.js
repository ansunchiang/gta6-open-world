import { distance } from '../render/geometry.js';

export function updateVehicleDamage(game, dt) {
  const { cars, player, explosions } = game;
  for (const car of cars) {
    if (car.health >= 37) continue;
    car.smokeTime = (car.smokeTime ?? 0) - dt;
    if (car.health <= 0 && !car.exploded) {
      car.exploded = true;
      car.speed = 0;
      if (car !== player.car) car.mode = 'parked';
      explosions.flame(car.x, car.z, car.phase, true);
      game.effects.sparks(car.x, 1.35, car.z, 45);
      const range = distance(car, player);
      if (range < 60) game.audio.effect('explosion');
      if (range < 6 && car !== player.car) game.damage(26);
      for (const other of cars) if (other !== car && distance(car, other) < 5) other.health -= 24;
      car.smokeTime = .14;
      car.burnTime = 12;
    }
    if (car.exploded) car.burnTime -= dt;
    if (car.smokeTime > 0 || car.exploded && car.burnTime <= 0) continue;
    car.smokeTime = car.health < 16 ? .14 : .31;
    if (car.health < 16) {
      explosions.flame(car.x, car.z, game.clock * 8 + car.phase);
      if (!car.exploded) car.health -= 2.5;
    } else explosions.plume(car.x, 1.02, car.z, 1.02, 1.9, false, car.phase);
  }
  explosions.update(dt);
}
