import { addInterceptor } from './ai/policeAI.js';
import { deployRoadblock } from './ai/roadblocks.js';
import { spawnHelicopter, poseHelicopter } from './ai/helicopterAI.js';
import { spawnVehicle, syncVehicle } from './vehicles/vehiclePhysics.js';
import { enterVehicle } from './player/playerController.js';
import { animateCharacter } from './player/characterModel.js';
import { spawnPerson } from './ai/pedestrianAI.js';
import { updateCombat } from './player/combat.js';
import { updateVehicleDamage } from './vehicles/vehicleDamage.js';
import { PLACES } from './world/cityLayout.js';
import { NEUTRAL } from './world/simulation.js';

function tick(game, frames, controls = NEUTRAL) {
  for (let i = 0; i < frames; i++) game.simulate(controls, 1 / 60);
}

function begin(game, chapter, site) {
  game.missions.setChapter(chapter);
  Object.assign(game.player, { x: site.x - 2.1, z: site.z + 3, heading: 0 });
  game.interact();
}

function placeCar(game, type, color, x, z, heading = 0) {
  const car = spawnVehicle(game.scene, type, color, x, z, heading, 'parked');
  game.cars.push(car);
  return car;
}

function placeUnit(game, x, z, heading, speed) {
  const car = addInterceptor(game, x, z, heading);
  car.speed = speed;
  return car;
}

function chase(game) {
  const { player, police } = game;
  begin(game, 5, PLACES.race);
  const car = placeCar(game, 'tide', '#fa562a', 179.6, 104.5, -.035);
  enterVehicle(game, car, false);
  tick(game, 1);
  Object.assign(car, { speed: 27.7, health: 74 });
  Object.assign(player, { weapon: 'smg', health: 83, armor: 64 });
  player.loadout.smg.rounds = 16;
  player.onCrime(5);
  police.cooldown = 8;
  police.blockDelay = 8;
  const left = placeUnit(game, 174.8, 106.1, .30, 21);
  const right = placeUnit(game, 185.6, 107.7, -.23, 24);
  const flank = placeUnit(game, 171.9, 94.8, .43, 23);
  deployRoadblock(game, addInterceptor, { x: 180, z: 77 }, 0);
  const wreck = placeCar(game, 'van', '#745953', 184.5, 83.5, -1.04);
  const air = police.air = spawnHelicopter(game.scene, 183, 73, 12.2);
  tick(game, 26, { ...NEUTRAL, throttle: 1, brake: true, steer: -.08 });
  for (const [unit, x, z, heading, tactic] of [
    [left,-4.7,2.1,.24,'RAMMING'], [right,4.7,1.8,-.22,'FLANKING'], [flank,-5.3,-9,.12,'CLOSING IN'],
  ]) Object.assign(unit, { x: player.x + x, z: player.z + z, heading, tactic });
  Object.assign(air, { x: player.x + 5.5, z: player.z - 20, y: 10.6, visible: true });
  car.speed = 30.5;
  wreck.health = 0;
  for (let i = 0; i < 49; i++) updateVehicleDamage(game, 1 / 60);
  game.effects.sparks(player.x - 1.1, .32, player.z + 1.4, 26);
  game.effects.update(.14);
  poseHelicopter(air, player, game.clock, .95);
  game.speak('DEX RILL', 'Take the gap. I’ll meet you at the beacon.', 8);
  game.notice = null;
  game.station = 1;
}

function street(game) {
  const { player, police } = game;
  begin(game, 0, PLACES.garage);
  Object.assign(player, { x: -.8, z: 85.5, heading: -.12, health: 78, armor: 59, weapon: 'pistol' });
  const target = placeUnit(game, -2.4, 67.8, 2.89, 0);
  placeUnit(game, 6.8, 58.8, -2.25, 0);
  placeCar(game, 'taxi', '#ffd268', 5.9, 75.9, Math.PI - .17);
  placeCar(game, 'van', '#81aeb9', -6.1, 60.3, .2);
  for (const [x, z, color, heading] of [[6, 74, '#ffc074', 2], [-8.5, 72, '#7fcebe', -2],
    [-7, 79, '#e39fb2', -1], [8.4, 66, '#c3b8ee', 1.7]]) {
    game.people.push(spawnPerson(game.scene, x, z, color, 2, 'civilian', heading));
  }
  player.onCrime(2);
  police.cooldown = 5;
  tick(game, 1, { ...NEUTRAL, attack: true });
  tick(game, 24);
  player.weapon = 'shotgun';
  player.heading = Math.atan2(target.x - player.x, player.z - target.z);
  game.camera.update(player, { ...NEUTRAL, aim: true }, 0, true);
  updateCombat(game, { ...NEUTRAL, aim: true, attack: true }, 1 / 60);
  player.aim = true;
  game.effects.update(.041);
  game.timeOfDay = 1210;
  game.speak('ROOK', 'Move before the shift finds you.', 7);
}

function mission(game) {
  begin(game, 4, PLACES.marina);
  Object.assign(game.player, { x: 220.8, z: 42.5, heading: 1.95, weapon: 'smg', armor: 72 });
  game.timeOfDay = 1171;
  game.people.push(spawnPerson(game.scene, 227, 40.4, '#f1b375', 3, 'civilian', -1.3));
  tick(game, 8);
}

export function prepareShot(game, name) {
  game.reset(null);
  game.menus.show('play');
  game.player.money = 12740;
  game.player.rep = 2040;
  if (name === 'chase') chase(game);
  if (name === 'street') street(game);
  if (name === 'mission') mission(game);
  if (name === 'map') {
    begin(game, 5, PLACES.race);
    game.timeOfDay = 1058;
    Object.assign(game.player, { x: 177, z: 118, heading: Math.PI / 2 });
    game.shotView = 'map';
    game.menus.show('map');
  }
  if (!game.player.car) animateCharacter(game.player, game.clock, 0, 0);
  game.camera.update(game.player, { ...NEUTRAL, aim: name === 'street' }, 0, true);
  for (const car of game.cars) syncVehicle(car, game.clock);
}
