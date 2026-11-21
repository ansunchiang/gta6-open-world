import { spawnPerson } from './pedestrianAI.js';
import { lineClear } from './policeAI.js';
import { animateCharacter } from '../player/characterModel.js';
import { angle, distance, turn } from '../render/geometry.js';

function ahead(point, heading, reach) {
  return { x: point.x + Math.sin(heading) * reach, z: point.z - Math.cos(heading) * reach };
}

export function deployGuards(game, site, count) {
  game.guards.forEach(guard => guard.model.node.removeFromParent());
  game.guards = [];
  game.guardSighting = null;
  for (let index = 0; index < count; index++) {
    const heading = index * 2.4;
    const home = [heading, heading + .7, heading - .7, heading + Math.PI]
      .flatMap(bearing => [5, 3, 2].map(reach => ahead(site, bearing, reach)))
      .find(point => !game.city.obstacle(point.x, point.z, .4) &&
        game.guards.every(other => distance(point, other) > 1.4)) ?? site;
    const guard = spawnPerson(game.scene, home.x, home.z, '#7e8270', index + 1, 'guard', heading);
    Object.assign(guard, { home, heading, guard: true, armed: true, fire: .85 + index * .38 });
    game.guards.push(guard);
  }
}

export function updateGuards(game, dt) {
  const { city, player, clock } = game;
  const visible = game.guards.map(guard => !guard.down && distance(guard, player) < 29 &&
    distance(guard.home, player) < 37 && lineClear(city, guard, player, 1.42));
  if (visible.some(Boolean)) game.guardSighting = { x: player.x, z: player.z, until: clock + 4 };
  const sighting = game.guardSighting?.until > clock ? game.guardSighting : null;
  for (const [index, guard] of game.guards.entries()) {
    guard.alerted = !!sighting && !guard.down;
    guard.aim = false;
    let pace = 0;
    if (!guard.down) {
      const range = distance(guard, player);
      const aim = visible[index] && range < (index % 2 ? 13 : 24);
      const goal = aim ? player : sighting ?? guard.home;
      const bearing = angle(goal.x - guard.x, goal.z - guard.z);
      const direct = [0, .75, -.75, 1.45, -1.45].find(offset => {
        const aheadPoint = ahead(guard, bearing + offset, 1.4);
        return !city.obstacle(aheadPoint.x, aheadPoint.z, .45);
      });
      guard.heading += turn(guard.heading, bearing + (aim ? 0 : direct ?? 0)) * Math.min(1, dt * 8);
      if (aim) {
        guard.aim = true;
        guard.fire -= dt;
        if (guard.fire < 0) {
          guard.fire = 2.9;
          game.effects.flash(guard.x, 1.42, guard.z, bearing, range);
          game.audio.effect('shot');
          game.damage(range < 9 ? 8 : 5);
        }
      } else if (direct !== undefined && distance(guard, goal) > 1.1) {
        pace = sighting ? 3.45 : 2.1;
        const next = ahead(guard, bearing + direct, dt * pace);
        city.move(guard, next.x, next.z, .32);
      }
    }
    animateCharacter(guard, clock, pace, dt);
  }
}
