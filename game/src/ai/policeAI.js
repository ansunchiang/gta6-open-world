import { angle, clamp, distance } from '../render/geometry.js';
import { closestStreet } from '../world/cityLayout.js';
import { guideVehicle, spawnVehicle, syncVehicle } from '../vehicles/vehiclePhysics.js';

export function createPolice() {
  return { heat: 0, stars: 0, quiet: 0, unseen: 0, cooldown: 0, contact: false, lastKnown: null, units: [] };
}

export function reportCrime(state, severity, actor) {
  state.heat = clamp(state.heat + severity, 1, 5);
  state.quiet = 0;
  state.unseen = 0;
  state.lastKnown = { x: actor.x, z: actor.z, heading: actor.heading };
}

export function lineClear(city, from, to, height = .8) {
  const steps = Math.ceil(distance(from, to) / 2.2);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (city.obstacle(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, .34, height)) return false;
  }
  return true;
}

export function addInterceptor(game, x, z, heading) {
  const car = spawnVehicle(game.scene, 'patrol', '#27394c', x, z, heading, 'police');
  car.speed = 8.7;
  car.driver = true;
  car.fire = 1 + game.police.units.length * .38;
  game.cars.push(car);
  game.police.units.push(car);
  return car;
}

function dispatch(game) {
  const { police, city } = game;
  const target = police.lastKnown;
  const i = police.units.length;
  const bearing = target.heading + Math.PI + (i % 2 ? -.63 : .63) * Math.min(i, 2);
  let x = clamp(target.x + Math.sin(bearing) * (36 + i * 6), -177, 177);
  let z = clamp(target.z - Math.cos(bearing) * (36 + i * 6), -177, 177);
  const sx = closestStreet(x);
  const sz = closestStreet(z);
  if (Math.abs(sx - x) < Math.abs(sz - z)) x = sx + (i % 2 ? -2.8 : 2.8);
  else z = sz + (i % 2 ? -2.8 : 2.8);
  if (!city.obstacle(x, z, 1.2) && distance(game.player, { x, z }) > 16) addInterceptor(game, x, z, angle(target.x - x, target.z - z));
}

function routeTo(car, goal, city) {
  if (lineClear(city, car, goal)) return goal;
  const x = closestStreet(car.x);
  const z = closestStreet(car.z);
  const destX = closestStreet(goal.x);
  const destZ = closestStreet(goal.z);
  const isVertical = Math.abs(x - car.x) < Math.abs(z - car.z);
  if (isVertical) {
    if (Math.abs(car.z - z) < 4 && x !== destX) return { x: destX, z };
    return { x, z: x === destX ? destZ : z + (Math.abs(car.z - z) < 4 ? Math.sign(destZ - z) * 60 : 0) };
  }
  if (Math.abs(car.x - x) < 4 && z !== destZ) return { x, z: destZ };
  return { x: z === destZ ? destX : x + (Math.abs(car.x - x) < 4 ? Math.sign(destX - x) * 60 : 0), z };
}

export function clearPolice(game) {
  for (const car of game.police.units) {
    if (car === game.player.car || car === game.player.theft?.car || car.claimed) continue;
    car.node.removeFromParent();
    game.cars.splice(game.cars.indexOf(car), 1);
  }
  Object.assign(game.police, createPolice());
}

export function updatePolice(game, dt) {
  const { police, player, city } = game;
  police.stars = police.heat > 0 ? Math.max(1, Math.ceil(police.heat - .13)) : 0;
  if (!police.stars) return;
  police.units = police.units.filter(car => {
    if (car.mode === 'police' && car.health > 0) return true;
    if (car.mode === 'police') car.mode = 'parked';
    return false;
  });
  police.quiet += dt;
  police.cooldown -= dt;
  police.contact = false;
  const desired = Math.min(5, police.stars + (police.stars >= 3 ? 1 : 0));
  if (police.units.length < desired && police.cooldown <= 0) {
    dispatch(game);
    police.cooldown = police.units.length <= 1 ? 2.4 : 4.7;
  }
  for (const car of police.units) {
    const range = distance(player, car);
    const visible = range < 49 && lineClear(city, car, player);
    police.contact ||= visible && range < 30;
    if (visible) police.lastKnown = { x: player.x, z: player.z, heading: player.heading };
    const pursuit = police.lastKnown;
    const lead = player.car && visible && range > 14 ? Math.max(0, player.car.speed) * .37 : 0;
    const goal = range < 17 && visible ? player : {
      x: pursuit.x + Math.sin(player.heading) * lead,
      z: pursuit.z - Math.cos(player.heading) * lead,
    };
    if (range < 3 && !player.car || !visible && distance(car, pursuit) < 4.4) {
      car.speed *= Math.exp(-dt * 7);
      car.heading += dt * .12;
    } else {
      const blocked = guideVehicle(car, routeTo(car, goal, city), range < 10 ? 10.6 : 15 + police.stars * 2.35, dt, city);
      if (blocked) car.heading += dt * 2.75;
    }
    if (range < (player.car ? 4 : 13) && visible) {
      car.fire -= dt;
      if (car.fire <= 0) {
        car.fire = player.car ? 1.8 : 2.6;
        if (player.car) {
          player.car.health -= 7;
          player.car.impact = .38;
          game.effects.sparks(player.x, .92, player.z, 8);
          game.damage(3.6);
        } else {
          game.effects.flash(car.x, 1.37, car.z, angle(player.x - car.x, player.z - car.z), range);
          game.damage(8);
        }
      }
    }
    syncVehicle(car, game.clock);
  }
  const hidden = !police.contact;
  police.unseen = hidden ? police.unseen + dt : 0;
  if (police.unseen > 3.4 && police.quiet > 8) police.heat -= dt * (player.car ? .24 : .29);
  if (police.heat <= 0) {
    clearPolice(game);
    player.rep += 22;
    game.toast('Signal lost', 'PURSUIT EVADED');
    game.audio.effect('success');
  }
}
