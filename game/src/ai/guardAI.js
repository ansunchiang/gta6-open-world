import { spawnPerson } from './pedestrianAI.js';
import { animateCharacter } from '../player/characterModel.js';
import { angle, distance, turn } from '../render/geometry.js';
import { lineClear } from './policeAI.js';

export function deployGuards(game, site, total) {
  for (const actor of game.guards) actor.model.node.removeFromParent();
  game.guards = [];
  for (let i = 0; i < total; i++) {
    const z = site.z - 4.2 - i * 4.7;
    const x = site.x + (i % 2 ? 6.1 : -.3);
    const actor = spawnPerson(game.scene, x, z, '#7e8270', i + 1, 'guard', Math.PI);
    Object.assign(actor, { guard: true, fire: 1.4 + i * .57, armed: true });
    game.guards.push(actor);
  }
}

export function updateGuards(game, dt) {
  for (const guard of game.guards) {
    const d = distance(guard, game.player);
    let pace = 0;
    guard.aim = false;
    if (!guard.down && d < 32 && lineClear(game.city, guard, game.player)) {
      guard.heading += turn(guard.heading, angle(game.player.x - guard.x, game.player.z - guard.z)) * Math.min(1, dt * 8);
      guard.aim = true;
      if (d > 5.5) {
        pace = d > 14 ? 3.35 : 1.88;
        game.city.move(guard, guard.x + Math.sin(guard.heading) * dt * pace, guard.z - Math.cos(guard.heading) * dt * pace, .25);
      }
      guard.fire -= dt;
      if (guard.fire <= 0 && d < 23) {
        guard.fire = 2.85;
        game.effects.flash(guard.x + Math.sin(guard.heading) * .46, 1.46, guard.z - Math.cos(guard.heading) * .46, guard.heading, d);
        game.damage(d < 9 ? 9 : 5);
      }
    }
    animateCharacter(guard, game.clock, pace, dt);
  }
}
