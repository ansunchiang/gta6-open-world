import { angle, clamp, distance } from '../render/geometry.js';
import { closestStreet, GRID } from '../world/cityLayout.js';
import { guideVehicle, spawnVehicle, syncVehicle } from '../vehicles/vehiclePhysics.js';

const SEARCH_DELAY = 3.4;
const MIN_ALERT_TIME = 8;

export function createPolice() {
  return { heat: 0, stars: 0, quiet: 0, unseen: 0, cooldown: 0, contact: false,
    escapeTime: null, lastKnown: null, units: [] };
}

function positionReport(actor) {
  const { x, z, heading } = actor.car ?? actor;
  return { x, z, heading, speed: actor.car?.speed ?? 0 };
}

export function reportCrime(state, severity, actor) {
  state.heat = clamp(state.heat + severity, 1, 5);
  state.quiet = 0;
  state.unseen = 0;
  state.escapeTime = null;
  state.lastKnown = positionReport(actor);
}

export function lineClear(city, from, to, height = .8, radius = .34) {
  const steps = Math.max(2, Math.ceil(distance(from, to) / .8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (city.obstacle(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, radius, height)) return false;
  }
  return true;
}

export function addInterceptor(game, x, z, heading) {
  const car = spawnVehicle(game.scene, 'patrol', '#27394c', x, z, heading, 'police');
  car.speed = 8.7;
  car.driver = true;
  car.fire = 1 + game.police.units.length * .38;
  car.cutoff = game.police.units.length % 2 === 1;
  car.recover = 0;
  game.cars.push(car);
  game.police.units.push(car);
  return car;
}

function dispatch(game) {
  const { police, city } = game;
  const target = police.lastKnown;
  const count = police.units.length;
  const side = count % 2 ? -1 : 1;
  const offsets = [Math.PI + side * .58, Math.PI - side * .84, side * 1.46, -side * 1.46];
  for (const offset of offsets) {
    const bearing = target.heading + offset;
    const depth = 38 + count * 5;
    let x = clamp(target.x + Math.sin(bearing) * depth, -190, 190);
    let z = clamp(target.z - Math.cos(bearing) * depth, -190, 190);
    const sx = closestStreet(x);
    const sz = closestStreet(z);
    if (Math.abs(sx - x) < Math.abs(sz - z)) x = sx + side * 2.8;
    else z = sz + side * 2.8;
    const point = { x, z };
    if (city.obstacle(x, z, 1.2) || distance(game.player, point) < 26 ||
        game.cars.some(car => distance(car, point) < 4)) continue;
    addInterceptor(game, x, z, angle(target.x - x, target.z - z));
    return;
  }
}

function cutoffPoint(car, report) {
  const speed = Math.abs(report.speed);
  if (speed < 9) return null;
  const vx = Math.sin(report.heading) * report.speed;
  const vz = -Math.cos(report.heading) * report.speed;
  const across = Math.abs(vx) > Math.abs(vz);
  const axis = across ? report.x : report.z;
  const lane = across ? report.z : report.x;
  const center = closestStreet(lane);
  if (Math.abs(lane - center) > 7) return null;
  const direction = Math.sign(across ? vx : vz);
  const streets = direction > 0 ? GRID : [...GRID].reverse();
  const crossing = streets.find(street => (street - axis) * direction > 10);
  if (crossing === undefined) return null;
  const gap = Math.abs(crossing - axis);
  const laneSide = clamp(lane - center, -4, 4);
  const point = across ? { x: crossing, z: center + laneSide } : { x: center + laneSide, z: crossing };
  return gap < 58 && distance(car, point) < (gap / speed + 1.35) * 17 ? point : null;
}

function sweepPoint(report, index, elapsed) {
  const cycle = Math.floor(elapsed / 5) + index;
  const heading = (cycle % 4) * Math.PI / 2;
  const reach = 19 + (index % 3) * 9;
  const x = clamp(report.x + Math.sin(heading) * reach, -190, 190);
  const z = clamp(report.z - Math.cos(heading) * reach, -190, 190);
  return index % 2 ? { x, z: closestStreet(z) } : { x: closestStreet(x), z };
}

function routeTo(car, goal, city) {
  if (!city.obstacle(goal.x, goal.z, 1.1) && lineClear(city, car, goal, 0, 1.1)) return goal;
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
  const desired = Math.min(5, police.stars + (police.stars >= 3 ? 1 : 0));
  if (police.unseen < SEARCH_DELAY && police.units.length < desired && police.cooldown <= 0) {
    dispatch(game);
    police.cooldown = police.units.length <= 1 ? 2.4 : 4.7;
  }
  const tracking = police.units.map(car => {
    const range = distance(player, car);
    return { car, range, visible: range < 42 && lineClear(city, car, player, 1.25) };
  });
  police.contact = tracking.some(unit => unit.visible);
  if (police.contact) police.lastKnown = positionReport(player);
  police.unseen = police.contact ? 0 : police.unseen + dt;
  const searching = police.unseen >= SEARCH_DELAY;
  const pursuit = police.lastKnown;
  for (const [index, { car, range, visible }] of tracking.entries()) {
    const cutoff = car.cutoff && police.contact && police.stars >= 3 && range > 12 ? cutoffPoint(car, pursuit) : null;
    car.intercepting = !!cutoff;
    const lead = police.contact && range > 16 ? clamp(pursuit.speed * .42, -6, 14) : 0;
    const goal = cutoff ?? (searching ? sweepPoint(pursuit, index, police.unseen - SEARCH_DELAY) : {
      x: pursuit.x + Math.sin(pursuit.heading) * lead,
      z: pursuit.z - Math.cos(pursuit.heading) * lead,
    });
    const holding = !player.car && visible && range < 3.4 ||
      distance(car, goal) < 4.4 && (searching || cutoff || !visible && !police.contact);
    if (holding) {
      car.speed *= Math.exp(-dt * 8);
      car.steering *= Math.exp(-dt * 6);
      car.recover = 0;
    } else if (car.recover > 0) {
      car.recover -= dt;
      car.heading += dt * (car.cutoff ? 1.9 : -1.9);
      car.speed = -4;
      city.move(car, car.x - Math.sin(car.heading) * dt * 4, car.z + Math.cos(car.heading) * dt * 4, 1, true);
    } else {
      const pace = searching ? 12 : range < 10 ? 10.6 : 15 + police.stars * 2.35;
      if (guideVehicle(car, routeTo(car, goal, city), pace, dt, city)) car.recover = .55;
    }
    if (range < (player.car ? 4 : 13) && visible && lineClear(city, car, player, 1.25)) {
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
    } else {
      car.fire = Math.max(.45, car.fire);
    }
    syncVehicle(car, game.clock);
  }
  const decay = player.car ? .24 : .29;
  if (searching && police.quiet >= MIN_ALERT_TIME) police.heat -= dt * decay;
  police.escapeTime = searching ? Math.max(0, MIN_ALERT_TIME - police.quiet) + Math.max(0, police.heat) / decay : null;
  if (police.heat <= 0) {
    clearPolice(game);
    player.rep += 22;
    game.toast('Signal lost', 'PURSUIT EVADED');
    game.audio.effect('success');
  }
}
