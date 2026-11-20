import { addInterceptor } from './ai/policeAI.js';
import { spawnVehicle, syncVehicle } from './vehicles/vehiclePhysics.js';
import { enterVehicle } from './player/playerController.js';
import { animateCharacter } from './player/characterModel.js';
import { PLACES } from './world/cityLayout.js';
import { NEUTRAL } from './world/simulation.js';

const step = 1 / 60;

function advance(game, seconds, controls = NEUTRAL) {
  for (let t = 0; t < seconds; t += step) game.simulate(controls, step);
}

function beginJob(game, chapter, anchor) {
  game.missions.setChapter(chapter);
  Object.assign(game.player, { x: anchor.x - 2.1, z: anchor.z + 3.3, heading: 0 });
  game.interact();
}

export function prepareShot(game, name) {
  if (name === 'menu') return;
  game.reset(null);
  game.menus.show('play');
  if (name === 'chase') {
    beginJob(game, 0, PLACES.garage);
    const car = game.cars[0];
    enterVehicle(game, car, false);
    advance(game, 1.3, { ...NEUTRAL, throttle: 1 });
    const { z } = game.player;
    const pursuer = addInterceptor(game, .35, z + 3.1, .16);
    pursuer.speed = car.speed * .95;
    const roadblock = addInterceptor(game, -3.1, z - 14, Math.PI * .94);
    roadblock.speed = 4;
    const oncoming = spawnVehicle(game.scene, 'taxi', '#e9b354', -4.7, z - 26, Math.PI, 'parked');
    game.cars.push(oncoming);
    game.cars.push(spawnVehicle(game.scene, 'van', '#85a8a8', 5.9, z - 38, 0, 'parked'));
    game.player.onCrime(.87);
    game.notice = null;
    game.dialogue = null;
    game.player.health = 91;
    game.player.money = 460;
    car.speed = 20.5;
    game.police.cooldown = 4;
    advance(game, .19, { ...NEUTRAL, throttle: 1, steer: -.25, brake: true });
    for (const unit of game.police.units) syncVehicle(unit, game.clock);
  }
  if (name === 'street') {
    beginJob(game, 0, PLACES.garage);
    const car = game.cars[0];
    Object.assign(game.player, { x: car.x - 1.95, z: car.z + 1.72, heading: -.13 });
    game.interact();
    advance(game, .22);
    game.player.heading = -.17;
    game.notice = null;
  }
  if (name === 'mission') {
    beginJob(game, 1, PLACES.strand);
    Object.assign(game.player, { x: 171.2, z: -4.25, heading: .53, money: 460 });
    game.timeOfDay = 1010;
    advance(game, .56);
  }
  if (!game.player.car) animateCharacter(game.player, game.clock, name === 'street' ? 1.2 : 0, 0);
  game.camera.update(game.player, NEUTRAL, 0, true);
}
