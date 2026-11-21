import { angle, clamp, distance } from '../render/geometry.js';
import { closestStreet } from '../world/cityLayout.js';
import { guideVehicle, spawnVehicle, syncVehicle } from '../vehicles/vehiclePhysics.js';
import { registerUnit } from './dispatchRoster.js';
import { planRoadblock } from './roadblocks.js';
import { removeHelicopter, updateHelicopter } from './helicopterAI.js';

export function createPolice() {
  return { heat: 0, stars: 0, quiet: 0, unseen: 0, cooldown: 0, contact: false,
    escapeTime: null, lastKnown: null, units: [], sequence: 0, air: null, blockDelay: 0 };
}

const positionReport = ({ x, z, heading, car }) => ({ x, z, heading, speed: car?.speed ?? 0 });

export function reportCrime(state, severity, actor) {
  Object.assign(state, { heat: clamp(state.heat + severity, 1, 5), quiet: 0, unseen: 0,
    escapeTime: null, lastKnown: positionReport(actor) });
}

export function lineClear(city, from, to, height = .8, radius = .34) {
  const steps = Math.ceil(distance(from, to) / .9);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (city.obstacle(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, radius, height)) return false;
  }
  return true;
}

export function addInterceptor(game, x, z, heading) {
  const { police } = game;
  const car = spawnVehicle(game.scene, 'patrol', '#27394c', x, z, heading, 'police');
  Object.assign(car, { speed: 8.7, driver: true, fire: 1 + police.units.length * .38, recover: 0, flank: police.sequence % 2 === 1 });
  registerUnit(police, car);
  game.cars.push(car);
  police.units.push(car);
  return car;
}

function dispatch(game, target) {
  for (const offset of [2.65, 3.66, 1.57, -1.57, 0]) {
    const heading = target.heading + offset;
    const x = clamp(target.x + Math.sin(heading) * 48, -184, 184);
    const z = clamp(target.z - Math.cos(heading) * 48, -184, 184);
    const sx = closestStreet(x), sz = closestStreet(z);
    const point = Math.abs(sx - x) < Math.abs(sz - z) ? { x: sx + 2.7, z } : { x, z: sz + 2.7 };
    if (game.city.obstacle(point.x, point.z, 1.4) || distance(game.player, point) < 27 ||
        game.cars.some(car => distance(car, point) < 4)) continue;
    addInterceptor(game, point.x, point.z, angle(target.x - point.x, target.z - point.z));
    return;
  }
}

function routeTo(car, goal, city) {
  if (lineClear(city, car, goal, .1, 1.1)) return goal;
  const x = closestStreet(car.x), z = closestStreet(car.z);
  const gx = closestStreet(goal.x), gz = closestStreet(goal.z);
  if (Math.abs(x - car.x) < Math.abs(z - car.z)) {
    return Math.abs(car.z - z) < 4 && x !== gx ? { x: gx, z } : { x, z: gz };
  }
  return Math.abs(car.x - x) < 4 && z !== gz ? { x, z: gz } : { x: gx, z };
}

export function clearPolice(game) {
  removeHelicopter(game.police);
  for (const car of game.police.units) {
    if (car === game.player.car || car === game.player.theft?.car || car.claimed) continue;
    car.node.removeFromParent();
    const index = game.cars.indexOf(car);
    if (index >= 0) game.cars.splice(index, 1);
  }
  Object.assign(game.police, createPolice());
}

function driveUnit(game, { car, range, visible }, index, searching, dt) {
  const { player, police, city } = game;
  const report = police.lastKnown;
  const flank = !!player.car && car.flank && range > 7 && !searching;
  const ram = !!player.car && visible && range < 9;
  if (car.barrier && (range > 65 || searching)) car.barrier = false;
  car.tactic = car.barrier ? 'ROADBLOCK' : searching ? 'SWEEPING' : ram ? 'RAMMING' :
    flank ? 'FLANKING' : 'CLOSING IN';
  const lead = player.car && !searching ? clamp(report.speed * .52, -5, 14) : 0;
  const sweep = Math.floor(police.unseen / 4) + index;
  const heading = searching ? sweep * Math.PI / 2 : report.heading;
  const offset = flank ? 3.8 : 0;
  const reach = searching ? 16 + index * 4 : lead;
  const goal = {
    x: report.x + Math.sin(heading) * reach + Math.cos(heading) * offset,
    z: report.z - Math.cos(heading) * reach + Math.sin(heading) * offset,
  };
  if (car.barrier || !player.car && visible && range < 3.8 || searching && distance(car, goal) < 3) car.speed *= Math.exp(-dt * 8);
  else if (car.recover > 0) {
    car.recover -= dt;
    car.heading += dt * (car.flank ? 2.1 : -2.1);
    car.speed = -4;
    city.move(car, car.x - Math.sin(car.heading) * dt * 4, car.z + Math.cos(car.heading) * dt * 4, 1, true);
  } else if (guideVehicle(car, routeTo(car, goal, city), searching ? 12 : 17 + police.stars * 2, dt, city)) car.recover = .55;
  if (ram && range < 3.3 && car.impact <= 0) {
    player.car.health -= 9;
    player.car.impact = car.impact = .64;
    player.car.heading += car.flank ? .22 : -.15;
    game.effects.sparks(player.x, .7, player.z, 10);
  }
  car.impact = Math.max(0, car.impact - dt);
  if (visible && range < (player.car ? 11 : 18)) {
    car.fire -= dt;
    if (car.fire <= 0) {
      car.fire = 2.8;
      game.effects.flash(car.x, 1.37, car.z, angle(player.x - car.x, player.z - car.z), range);
      game.audio.effect('shot');
      if (player.car) player.car.health -= 4;
      game.damage(player.car ? 3 : 7);
    }
  }
  syncVehicle(car, game.clock);
}

export function updatePolice(game, dt) {
  const { police, player, city } = game;
  police.stars = clamp(Math.ceil(police.heat - .001), 0, 5);
  if (!police.stars) return;
  police.units = police.units.filter(car => car.mode === 'police' && car.health > 0);
  police.quiet += dt;
  police.cooldown -= dt;
  const desired = Math.min(5, police.stars + 1);
  if (police.units.length < desired && police.cooldown <= 0 && police.unseen < 3.4) {
    dispatch(game, police.lastKnown);
    police.cooldown = 3;
  }
  const tracking = police.units.map(car => {
    const range = distance(player, car);
    return { car, range, visible: range < 41 && lineClear(city, car, player, 1.25) };
  });
  const seen = tracking.some(unit => unit.visible);
  if (seen) police.lastKnown = positionReport(player);
  police.contact = updateHelicopter(game, dt) || seen;
  if (police.contact) police.lastKnown = positionReport(player);
  police.unseen = police.contact ? 0 : police.unseen + dt;
  const searching = police.unseen >= 3.4;
  planRoadblock(game, addInterceptor, dt);
  tracking.forEach((unit, index) => driveUnit(game, unit, index, searching, dt));
  const decay = .32;
  if (searching && police.quiet >= 7) police.heat -= dt * decay;
  police.escapeTime = searching ? Math.max(0, 7 - police.quiet) + Math.max(0, police.heat) / decay : null;
  if (police.heat <= 0) {
    clearPolice(game);
    player.rep += 22;
    game.toast('Signal lost', 'PURSUIT EVADED');
    game.audio.effect('success');
  }
}
