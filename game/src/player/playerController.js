import { createCharacter, animateCharacter } from './characterModel.js';
import { driveVehicle } from '../vehicles/vehiclePhysics.js';
import { VEHICLE_TYPES } from '../vehicles/vehicleModel.js';
import { spawnPerson } from '../ai/pedestrianAI.js';
import { angle, blend, distance, turn } from '../render/geometry.js';

export function createPlayer(scene) {
  return {
    x: 8.1, z: 91, y: 0, heading: 0, health: 100, money: 140, rep: 0,
    ammo: 8, reserve: 32, weapon: 'fists', car: null, speed: 0, swing: 0, hurt: 0,
    cooldown: 0, reload: 0, armed: false, aim: false, theft: null,
    model: createCharacter(scene, '#d86958', 0, 'player'),
  };
}

export function nearestVehicle(player, vehicles) {
  let nearest = null;
  let score = 4.25;
  for (const car of vehicles) {
    if (car.health <= 0 || car === player.car || car.mode === 'held' || Math.abs(car.speed) > 9.7) continue;
    const dist = distance(player, car);
    if (dist < score) {
      nearest = car;
      score = dist;
    }
  }
  return nearest;
}

export function enterVehicle(game, car, animate = true) {
  const { player } = game;
  if (car.driver) {
    const driver = spawnPerson(game.scene, car.x - Math.cos(car.heading) * 1.48, car.z - Math.sin(car.heading) * 1.48, '#d9966e', 1, 'civilian', car.heading - 1.6);
    driver.panic = 4.6;
    driver.flee = car.heading - Math.PI / 2;
    driver.expires = game.clock + 26;
    game.people.push(driver);
  }
  const stolen = !car.claimed;
  car.driver = false;
  car.claimed = true;
  car.mode = animate ? 'held' : 'player';
  car.speed = 0;
  if (animate) player.theft = { car, time: .55 };
  else {
    player.car = car;
    Object.assign(player, { x: car.x, z: car.z, heading: car.heading });
  }
  game.audio.effect('door');
  if (stolen) {
    game.stolen++;
    player.onCrime(car.type === 'patrol' ? 1.95 : 1.04);
    game.toast(VEHICLE_TYPES[car.type].name, 'VEHICLE TAKEN');
  }
}

export function exitVehicle(game, force = false) {
  const { player, city } = game;
  const car = player.car;
  if (!car) return false;
  if (!force && Math.abs(car.speed) > 10) {
    game.toast('Slow down to get out', 'VEHICLE');
    return false;
  }
  for (const side of [-1, 1, 0]) {
    const x = car.x + side * Math.cos(car.heading) * 1.6 - (side === 0 ? Math.sin(car.heading) * 2.5 : 0);
    const z = car.z + side * Math.sin(car.heading) * 1.6 + (side === 0 ? Math.cos(car.heading) * 2.5 : 0);
    if (city.obstacle(x, z, .45)) continue;
    player.x = x;
    player.z = z;
    break;
  }
  player.heading = car.heading;
  player.car = null;
  car.mode = 'parked';
  car.speed = 0;
  player.speed = 0;
  player.model.node.visible = true;
  game.audio.effect('door');
  return true;
}

export function updatePlayer(game, controls, dt) {
  const { player, city, camera, effects } = game;
  player.hurt = Math.max(0, player.hurt - dt);
  if (player.car) {
    driveVehicle(player.car, controls, city, game.cars, dt, effects, game.upgrades, other => {
      if (other.type === 'patrol') player.onCrime(.58);
      else if (Math.abs(player.car.speed - other.speed) > 6) player.onCrime(.32);
      game.audio.effect('impact');
    });
    Object.assign(player, { x: player.car.x, z: player.car.z, heading: player.car.heading });
    player.model.node.visible = false;
    if (player.car.health <= 0) {
      effects.sparks(player.x, .9, player.z, 22);
      exitVehicle(game, true);
      game.damage(30);
      game.toast('Vehicle disabled', 'GET CLEAR');
    }
    return;
  }
  player.model.node.visible = true;
  if (player.theft) {
    const theft = player.theft;
    theft.time -= dt;
    const car = theft.car;
    car.doorSwing = Math.sin(Math.max(0, theft.time) / .55 * Math.PI) * 1.22;
    const x = car.x - Math.cos(car.heading) * 1.06;
    const z = car.z - Math.sin(car.heading) * 1.06;
    city.move(player, blend(player.x, x, dt * 12), blend(player.z, z, dt * 12), .24);
    player.heading = angle(car.x - player.x, car.z - player.z);
    player.swing = .49;
    if (theft.time <= 0) {
      player.car = car;
      car.mode = 'player';
      car.doorSwing = 0;
      player.theft = null;
    }
    animateCharacter(player, game.clock, 2.1, dt);
    return;
  }
  const magnitude = Math.hypot(controls.throttle, controls.steer);
  const velocity = controls.aim ? 2.45 : controls.sprint ? 7.75 : 4.65;
  player.aim = controls.aim && player.weapon === 'pistol' || player.swing > .17 && player.weapon === 'pistol';
  const yaw = camera.yaw;
  const x = Math.sin(yaw) * controls.throttle + Math.cos(yaw) * controls.steer;
  const z = -Math.cos(yaw) * controls.throttle + Math.sin(yaw) * controls.steer;
  const next = player.aim ? yaw : magnitude ? angle(x, z) : player.heading;
  player.heading += turn(player.heading, next) * Math.min(1, 15 * dt);
  player.speed = blend(player.speed, magnitude ? velocity : 0, dt * 11);
  if (magnitude) city.move(player, player.x + x / magnitude * player.speed * dt, player.z + z / magnitude * player.speed * dt, .32);
  player.y = player.x > 188 || Math.abs(player.x % 60) < 9 || Math.abs(player.z % 60) < 9 ? 0 : .08;
  animateCharacter(player, game.clock, player.speed, dt);
}
