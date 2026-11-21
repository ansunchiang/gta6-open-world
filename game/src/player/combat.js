import { disturbCrowd } from '../ai/pedestrianAI.js';
import { WEAPONS, weaponById } from '../combat/weapons.js';
import { renderShot, targetInArc } from '../combat/projectiles.js';

function strike(game, target, amount) {
  target.health -= amount;
  if (target.model && target.health <= 0) {
    target.down = target.guard ? 9999 : 10;
    if (target.guard) game.player.rep += 15;
  }
  if (!target.guard && target.mode !== 'police') game.player.onCrime(.55);
}

export function updateCombat(game, controls, dt) {
  const { player } = game;
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.swing = Math.max(0, player.swing - dt * 2.7);
  if (player.theft) return;
  const direct = WEAPONS.find((_, index) => controls.presses.has('Digit' + (index + 1)));
  const cycle = controls.presses.has('KeyQ') && WEAPONS.filter(weapon => player.loadout[weapon.id].owned);
  const selected = direct ?? (cycle ? cycle[(cycle.findIndex(weapon => weapon.id === player.weapon) + 1) % cycle.length] : null);
  if (selected && selected.id !== player.weapon) {
    if (player.loadout[selected.id].owned) {
      player.weapon = selected.id;
      player.reload = 0;
    } else game.toast('Visit the Night Market', 'WEAPON LOCKED');
  }

  const weapon = weaponById[player.weapon];
  const supply = player.loadout[weapon.id];
  player.armed = weapon.capacity > 0;
  if (player.reload > 0) {
    player.reload = Math.max(0, player.reload - dt);
    if (!player.reload) {
      const rounds = Math.min(supply.stock, weapon.capacity - supply.rounds);
      supply.rounds += rounds;
      supply.stock -= rounds;
    }
  }
  const reload = () => {
    if (!player.reload && supply.stock && supply.rounds < weapon.capacity) {
      player.reload = weapon.id === 'shotgun' ? 1.35 : .94;
      game.audio.effect('reload');
    }
  };
  if (controls.presses.has('KeyR')) reload();
  if (!controls.attack && !controls.presses.has('MouseAttack') && !controls.presses.has('KeyF')) return;
  if (player.cooldown || player.reload || player.car && !player.armed) return;
  const heading = controls.aim ? game.camera.yaw : player.heading;
  if (player.armed && !supply.rounds) {
    player.cooldown = .29;
    reload();
    if (!player.reload) game.audio.effect('empty');
    return;
  }

  player.cooldown = weapon.pace;
  player.swing = player.armed ? .49 : .76;
  const arc = !player.armed ? .87 : weapon.id === 'shotgun' ? .32 : controls.aim ? .115 : .235;
  const hit = targetInArc(game, weapon.reach, heading, arc);
  if (hit) strike(game, hit, weapon.damage + (player.armed ? game.upgrades.weapon * 9 : 0));
  if (!player.armed) {
    game.audio.effect(hit ? 'impact' : 'swipe');
    return;
  }
  supply.rounds--;
  renderShot(game, player, heading, hit, weapon.reach, weapon.id === 'shotgun', player.car ? 1.2 : 1.46);
  if (!hit?.guard) player.onCrime(hit?.mode === 'police' ? .73 : .22);
  disturbCrowd(game.people, player.x, player.z, 24);
  game.audio.effect(weapon.id === 'shotgun' || weapon.id === 'heavy' ? 'blast' : 'shot');
}
