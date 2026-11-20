import { createCharacter, animateCharacter } from '../player/characterModel.js';
import { angle, distance, turn } from '../render/geometry.js';

const outfits = ['#db836b', '#ecbc79', '#609b97', '#e3d7af', '#ae8196', '#8197b4', '#aa975e', '#bd6862'];

export function spawnPerson(scene, x, z, outfit, tone, style, heading = 0) {
  const person = { x, z, heading, model: createCharacter(scene, outfit, tone, style), health: 100, down: 0, panic: 0, phase: x * .43 };
  animateCharacter(person, 0, 0, 0);
  return person;
}

export function createPedestrians(scene, city, random) {
  const people = [];
  city.sidewalks.forEach((path, block) => {
    const corners = [{ x: path.l, z: path.t }, { x: path.r, z: path.t }, { x: path.r, z: path.b }, { x: path.l, z: path.b }];
    for (let i = 0; i < 3; i++) {
      const side = (i + block) % 4;
      const start = corners[side];
      const next = corners[(side + 1) % 4];
      const p = random();
      const person = spawnPerson(scene, start.x + (next.x - start.x) * p, start.z + (next.z - start.z) * p,
        outfits[(block + i * 3) % outfits.length], (i + block) % 5, 'civilian');
      person.route = corners;
      person.routeIndex = (side + 1) % 4;
      person.pace = 1.28 + random() * .68;
      people.push(person);
    }
  });
  for (let i = 0; i < 19; i++) {
    const x = i % 2 === 0 ? 191.6 : 197;
    const z = -153 + i * 17;
    const person = spawnPerson(scene, x, z, outfits[i % outfits.length], i % 5, 'civilian');
    person.route = [{ x, z: -179 }, { x, z: 179 }];
    person.routeIndex = i % 2;
    person.pace = 1.26 + random() * .57;
    people.push(person);
  }
  for (const [x,z,i] of [[10.8,77,1],[10.75,71,4],[-10.8,79,2],[-10.7,85,5],[-10.9,94,0],[10.9,61,6],[-9.5,58,7]]) {
    const person = spawnPerson(scene, x, z, outfits[i], i, 'civilian', z % 2 ? Math.PI : 0);
    person.route = [{ x, z: 108 }, { x, z: 65 }];
    person.routeIndex = i % 2;
    person.pace = 1.35;
    people.push(person);
  }
  return people;
}

export function disturbCrowd(people, x, z, radius) {
  for (const person of people) {
    if (Math.hypot(person.x - x, person.z - z) < radius) {
      person.panic = 4.4;
      person.flee = angle(person.x - x, person.z - z);
    }
  }
}

export function updatePedestrians(people, player, city, dt, clock) {
  for (const person of people) {
    const nearby = distance(person, player);
    person.model.node.visible = nearby < 128;
    if (person.down > 0) {
      person.down -= dt;
      if (person.down <= 0) person.health = 100;
      if (person.model.node.visible) animateCharacter(person, clock, 0, dt);
      continue;
    }
    let pace = person.pace ?? 0;
    if (player.car && Math.abs(player.car.speed) > 4 && nearby < 5.5 && !person.panic) {
      person.panic = 2.8;
      person.flee = angle(person.x - player.x, person.z - player.z);
    }
    if (person.panic > 0) {
      person.panic = Math.max(0, person.panic - dt);
      person.heading += turn(person.heading, person.flee) * Math.min(1, dt * 6);
      pace = 4.3;
    } else if (person.route) {
      const target = person.route[person.routeIndex];
      if (distance(target, person) < .47) person.routeIndex = (person.routeIndex + 1) % person.route.length;
      const goal = person.route[person.routeIndex];
      person.heading += turn(person.heading, angle(goal.x - person.x, goal.z - person.z)) * Math.min(1, dt * 8);
    }
    if (pace > 0) {
      const blocked = city.move(person, person.x + Math.sin(person.heading) * pace * dt, person.z - Math.cos(person.heading) * pace * dt, .23);
      if (blocked && person.panic > 0) person.flee += 1.1;
    }
    if (player.car && Math.abs(player.car.speed) > 7 && nearby < 1.7 && !person.down) {
      person.down = 8;
      player.onCrime(.82);
    }
    if (person.model.node.visible) animateCharacter(person, clock, pace, dt);
  }
}
