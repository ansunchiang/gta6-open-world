import { closestStreet, GRID } from '../world/cityLayout.js';
import { distance } from '../render/geometry.js';

export function deployRoadblock(game, add, point, heading) {
  const units = [];
  for (const offset of [-3.7, 3.7]) {
    const x = point.x + Math.cos(heading) * offset;
    const z = point.z + Math.sin(heading) * offset;
    if (game.city.obstacle(x, z, 2) || game.cars.some(car => distance(car, { x, z }) < 3)) continue;
    const unit = add(game, x, z, heading + Math.sign(offset) * 1.12);
    Object.assign(unit, { barrier: true, speed: 0, tactic: 'ROADBLOCK' });
    units.push(unit);
  }
  return units;
}

export function planRoadblock(game, add, dt) {
  const { police, player } = game;
  police.blockDelay -= dt;
  if (police.stars < 3 || !player.car || !police.contact || police.blockDelay > 0 || Math.abs(player.car.speed) < 7) return;
  const car = player.car;
  const across = Math.abs(Math.sin(car.heading)) > .707;
  const axis = across ? car.x : car.z;
  const lane = across ? car.z : car.x;
  const center = closestStreet(lane);
  if (Math.abs(lane - center) > 8) return;
  const direction = Math.sign((across ? Math.sin(car.heading) : -Math.cos(car.heading)) * car.speed);
  const candidates = GRID.filter(street => (street - axis) * direction > 26 && (street - axis) * direction < 81);
  candidates.sort((a, b) => Math.abs(a - axis) - Math.abs(b - axis));
  const crossing = candidates[0];
  if (crossing === undefined) return;
  const point = across ? { x: crossing, z: center } : { x: center, z: crossing };
  if (deployRoadblock(game, add, point, across ? Math.PI / 2 : 0).length) police.blockDelay = 24;
}
