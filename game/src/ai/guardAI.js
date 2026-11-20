import { spawnPerson } from './pedestrianAI.js';
import { lineClear } from './policeAI.js';
import { animateCharacter } from '../player/characterModel.js';
import { angle, distance, turn } from '../render/geometry.js';

const BODY_RADIUS = .32;
const EYE_HEIGHT = 1.42;
const MEMORY_TIME = 4.8;
const CORNER_MARGIN = .82;
const POST_ANGLES = [-.9, .9, 2.45, -2.45, Math.PI, 0];

function ahead(point, heading, length) {
  return { x: point.x + Math.sin(heading) * length, z: point.z - Math.cos(heading) * length };
}

function bearing(from, to) {
  return angle(to.x - from.x, to.z - from.z);
}

export function deployGuards(game, site, count) {
  for (const guard of game.guards) guard.model.node.removeFromParent();
  game.guards = [];
  game.guardSighting = null;
  for (let index = 0; index < count; index++) {
    const heading = POST_ANGLES[index % POST_ANGLES.length];
    const ring = 5 + Math.floor(index / POST_ANGLES.length) * 3;
    const home = [heading, heading + .6, heading - .6, -heading, 0]
      .flatMap(direction => [ring, ring * .6, ring * .3].map(radius => ahead(site, direction, radius)))
      .find(point => !game.city.obstacle(point.x, point.z, BODY_RADIUS) &&
        game.guards.every(other => distance(point, other) > 1.8)) ?? { x: site.x, z: site.z };
    const guard = spawnPerson(game.scene, home.x, home.z, '#7e8270', index + 1, 'guard', heading);
    Object.assign(guard, { home, postHeading: heading, guard: true, armed: true,
      flank: index % 3 === 0 ? 0 : index % 3 === 1 ? -1 : 1, fire: .75 + index * .28, aimTime: 0 });
    game.guards.push(guard);
  }
}

function spotPlayer(city, guard, player) {
  const range = distance(guard, player);
  if (guard.down || range > 36 || distance(guard.home, player) > 43) return false;
  const inView = Math.abs(turn(guard.heading, bearing(guard, player))) < 1.18;
  return (range < 8 || guard.alerted && range < 22 || inView) && lineClear(city, guard, player, EYE_HEIGHT);
}

function walkable(city, from, to) {
  return !city.obstacle(to.x, to.z, BODY_RADIUS) && lineClear(city, from, to, 0, BODY_RADIUS + .12);
}

function findCorner(city, guard, goal) {
  const corners = [];
  for (const building of city.footprints) {
    if (distance(building, guard) > 34 && distance(building, goal) > 23) continue;
    const width = building.w / 2 + CORNER_MARGIN;
    const depth = building.d / 2 + CORNER_MARGIN;
    for (const x of [building.x - width, building.x + width]) {
      for (const z of [building.z - depth, building.z + depth]) {
        corners.push({ x, z });
      }
    }
  }
  const exits = corners.filter(corner => distance(guard, corner) > .6 && walkable(city, guard, corner));
  const entries = corners.filter(corner => walkable(city, corner, goal));
  let best = null;
  let shortest = Infinity;
  for (const exit of exits) {
    for (const entry of entries) {
      const length = distance(guard, exit) + distance(exit, entry) + distance(entry, goal);
      if (length >= shortest || !walkable(city, exit, entry)) continue;
      best = exit;
      shortest = length;
    }
  }
  return best;
}

function stepToward(city, guard, goal, pace, dt, clock) {
  if (walkable(city, guard, goal)) {
    guard.detour = null;
  } else {
    const detour = guard.detour;
    if (!detour || clock >= detour.until || distance(detour.goal, goal) > 4 ||
        detour.point && distance(guard, detour.point) < .55) {
      guard.detour = { point: findCorner(city, guard, goal), goal, until: clock + .9 };
    }
    goal = guard.detour.point ?? goal;
  }
  const direct = bearing(guard, goal);
  const sign = guard.flank || 1;
  const remaining = distance(guard, goal);
  const offset = [0, .75 * sign, -.75 * sign, 1.45 * sign, -1.45 * sign, 2.2 * sign, -2.2 * sign]
    .find(rotation => walkable(city, guard, ahead(guard, direct + rotation, Math.min(2.7, remaining))));
  if (offset === undefined) return 0;
  const heading = direct + offset;
  guard.heading += turn(guard.heading, heading) * Math.min(1, dt * 8);
  const next = ahead(guard, heading, Math.min(pace * dt, remaining));
  return city.move(guard, next.x, next.z, BODY_RADIUS) ? 0 : pace;
}

function engage(game, guard, dt) {
  const { city, player } = game;
  const heading = bearing(guard, player);
  const range = distance(guard, player);
  guard.heading += turn(guard.heading, heading) * Math.min(1, dt * 9);
  guard.aim = true;
  if (range > 24 || Math.abs(turn(guard.heading, heading)) > .23) {
    guard.aimTime = 0;
    return;
  }
  guard.aimTime += dt;
  if (guard.aimTime < .46 || guard.fire > 0) return;
  const muzzle = ahead(guard, heading, .46);
  if (!lineClear(city, muzzle, player, EYE_HEIGHT)) return;
  guard.fire = 2.55 + Math.abs(guard.flank) * .38;
  game.effects.flash(muzzle.x, EYE_HEIGHT, muzzle.z, heading, Math.max(.1, range - .46));
  game.damage(range < 9 ? 8 : 5);
}

export function updateGuards(game, dt) {
  if (!game.guards.length) return;
  const { city, player, clock } = game;
  const visible = game.guards.map(guard => spotPlayer(city, guard, player));
  if (visible.some(Boolean)) game.guardSighting = { x: player.x, z: player.z, until: clock + MEMORY_TIME };
  const sighting = game.guardSighting?.until > clock ? game.guardSighting : null;
  for (const [index, guard] of game.guards.entries()) {
    guard.aim = false;
    guard.alerted = !guard.down && !!sighting;
    let pace = 0;
    if (!guard.down) {
      guard.fire = Math.max(0, guard.fire - dt);
      const range = distance(guard, player);
      if (visible[index] && (range < 12 || !guard.flank && range < 23)) {
        engage(game, guard, dt);
      } else {
        guard.aimTime = 0;
        let goal = guard.home;
        if (sighting && distance(guard.home, sighting) < 43) {
          const around = bearing(sighting, guard.home) + guard.flank * .9;
          const flank = ahead(sighting, around, 11.5);
          goal = guard.flank && !city.obstacle(flank.x, flank.z, BODY_RADIUS) ? flank : sighting;
        }
        const arrival = sighting && !visible[index] ? 1.4 : .45;
        if (distance(guard, goal) > arrival) {
          pace = stepToward(city, guard, goal, sighting ? 3.6 : 2.1, dt, clock);
        } else {
          const scan = sighting ? bearing(guard, sighting) : guard.postHeading + Math.sin(clock * 1.35 + index) * .72;
          guard.heading += turn(guard.heading, scan) * Math.min(1, dt * 5);
        }
      }
    }
    animateCharacter(guard, clock, pace, dt);
  }
}
