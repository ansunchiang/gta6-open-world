import { disturbCrowd } from '../ai/pedestrianAI.js';
import { lineClear } from '../ai/policeAI.js';
import { angle, distance, turn } from '../render/geometry.js';

function targetInArc(game, reach, heading, arc) {
  const { player } = game;
  let hit = null;
  let best = reach;
  for (const enemy of [...game.guards, ...game.people, ...game.police.units]) {
    if (enemy.down > 0 || enemy.health <= 0) continue;
    const delta = distance(player, enemy);
    const error = Math.abs(turn(heading, angle(enemy.x - player.x, enemy.z - player.z)));
    if (delta > best || error > (delta < 1.5 ? Math.max(.8, arc) : arc) || !lineClear(game.city, player, enemy, 1.38)) continue;
    hit = enemy;
    best = delta;
  }
  return hit;
}

function strike(game, target, amount) {
  target.health -= amount;
  if (target.model && target.health <= 0) {
    target.down = target.guard ? 9999 : 10;
    if (target.guard) {
      game.player.rep += 15;
      game.audio.effect('coin');
    }
  }
  if (!target.guard && target.mode !== 'police') {
    game.player.onCrime(.7);
    disturbCrowd(game.people, target.x, target.z, 11);
  }
}

export function updateCombat(game, controls, dt) {
  const { player } = game;
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.swing = Math.max(0, player.swing - dt * 2.7);
  if (player.reload > 0) {
    player.reload -= dt;
    if (player.reload <= 0) {
      const amount = Math.min(player.reserve, 8 - player.ammo);
      player.ammo += amount;
      player.reserve -= amount;
    }
  }
  if (player.car || player.theft) return;
  if (controls.presses.has('Digit1')) player.weapon = 'fists';
  if (controls.presses.has('Digit2')) player.weapon = 'pistol';
  if (controls.presses.has('KeyQ')) player.weapon = player.weapon === 'fists' ? 'pistol' : 'fists';
  player.armed = player.weapon === 'pistol';

  if (player.armed && controls.presses.has('KeyR') && player.reload <= 0 && player.reserve > 0 && player.ammo < 8) {
    player.reload = .93;
    game.audio.effect('reload');
  }
  const firing = controls.attack || controls.presses.has('MouseAttack') || controls.presses.has('KeyF');
  if (!firing || player.cooldown > 0 || player.reload > 0) return;
  if (!player.armed) {
    const hit = targetInArc(game, 2.4, player.heading, .83);
    player.swing = .72;
    player.cooldown = .40;
    game.audio.effect(hit ? 'impact' : 'swipe');
    if (hit) strike(game, hit, 50);
    return;
  }
  if (player.ammo === 0) {
    player.cooldown = .28;
    if (player.reserve > 0) {
      player.reload = .93;
      game.audio.effect('reload');
    } else game.audio.effect('empty');
    return;
  }
  player.ammo -= 1;
  player.cooldown = .23;
  player.swing = .49;
  const heading = controls.aim ? game.camera.yaw : player.heading;
  const hit = targetInArc(game, 47, heading, controls.aim ? .10 : .24);
  const range = hit ? distance(player, hit) : 45;
  game.effects.flash(player.x + Math.sin(heading) * .72 + Math.cos(heading) * .24, 1.46, player.z - Math.cos(heading) * .72 + Math.sin(heading) * .24, heading, range);
  if (hit) {
    strike(game, hit, 44 + game.upgrades.weapon * 17);
    game.effects.sparks(hit.x, 1.07, hit.z, 5);
  }
  if (!hit?.guard) player.onCrime(hit?.mode === 'police' ? .75 : .34);
  disturbCrowd(game.people, player.x, player.z, 21);
  game.audio.effect('shot');
}
