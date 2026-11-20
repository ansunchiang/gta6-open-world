import * as T from '../../vendor/three.module.min.js';
import { generateCity } from './cityGenerator.js';
import { createMarkers } from './objectiveMarkers.js';
import { createRandom } from '../random.js';
import { createTraffic, updateTraffic } from '../ai/trafficAI.js';
import { createPedestrians, updatePedestrians, disturbCrowd } from '../ai/pedestrianAI.js';
import { createPolice, reportCrime, updatePolice, clearPolice } from '../ai/policeAI.js';
import { updateGuards } from '../ai/guardAI.js';
import { createPlayer, enterVehicle, exitVehicle, nearestVehicle, updatePlayer } from '../player/playerController.js';
import { animateCharacter } from '../player/characterModel.js';
import { updateCombat } from '../player/combat.js';
import { createMissionManager } from '../missions/missionManager.js';
import { createActivities } from '../missions/activities.js';
import { STORY } from '../missions/campaign.js';
import { createChaseCamera } from '../render/chaseCamera.js';
import { createEffects, createSirenGlow } from '../render/effects.js';
import { createAtmosphere } from '../render/atmosphere.js';
import { createSynth } from '../audio/synth.js';
import { loadCareer, saveCareer } from '../save/saveSystem.js';

export const NEUTRAL = { throttle: 0, steer: 0, aim: false, mouseX: 0, mouseY: 0, presses: new Set() };

export function createSimulation(scene, camera, seed, input, practice) {
  const city = generateCity(scene, seed);
  const random = createRandom(seed ^ 9467);
  const atmosphere = createAtmosphere(scene);
  const lightSiren = createSirenGlow(scene);
  const effects = createEffects(scene);
  const player = createPlayer(scene);
  const cars = createTraffic(scene, random);
  const trafficEntries = cars.map(car => ({ car, x: car.x, z: car.z, heading: car.heading, speed: car.speed,
    mode: car.mode, driver: car.driver, routeIndex: car.routeIndex, wait: car.wait }));
  const people = createPedestrians(scene, city, random);
  const game = {
    scene, city, camera: createChaseCamera(camera, city), effects, player, input, cars, people, guards: [],
    police: createPolice(), audio: createSynth(), upgrades: { engine: 0, armor: 0, weapon: 0 },
    clock: 0, timeOfDay: 1080, stolen: 0, notice: null, dialogue: null, practice,
  };
  game.missions = createMissionManager(game);
  game.activities = createActivities(game);
  const markers = createMarkers(scene, game.activities);

  game.objective = () => game.activities.objective() ?? game.missions.objective();
  game.toast = (text, type, duration = 2.8) => game.notice = { text, type, until: game.clock + duration };
  game.speak = (name, text, duration) => game.dialogue = { name, text, until: game.clock + duration };
  game.save = () => !game.practice && saveCareer(game);
  game.damage = amount => {
    player.health = Math.max(0, player.health - amount);
    player.hurt = Math.min(.73, .2 + amount * .015);
  };
  player.onCrime = severity => reportCrime(game.police, severity, player);

  function reset(career, nearbyChapter = false) {
    clearPolice(game);
    const originals = new Set(trafficEntries.map(entry => entry.car));
    for (let i = cars.length - 1; i >= 0; i--) {
      if (originals.has(cars[i])) continue;
      cars[i].node.removeFromParent();
      cars.splice(i, 1);
    }
    for (const entry of trafficEntries) {
      const { car, ...state } = entry;
      Object.assign(car, state, { health: 100, claimed: false, impact: 0, steering: 0, doorSwing: 0 });
    }
    for (let i = people.length - 1; i >= 0; i--) {
      const person = people[i];
      if (!person.expires) continue;
      person.model.node.removeFromParent();
      people.splice(i, 1);
    }
    for (const person of people) Object.assign(person, { health: 100, down: 0, panic: 0 });
    Object.assign(game, { notice: null, dialogue: null, stolen: 0, timeOfDay: 1080 });
    const chapter = career?.chapter ?? 0;
    const anchor = STORY[chapter]?.anchor;
    const x = anchor && (chapter || nearbyChapter) ? anchor.x + (anchor.x > 140 ? -2 : -2.6) : 8.1;
    const z = anchor && (chapter || nearbyChapter) ? anchor.z + 5.1 : 91;
    Object.assign(player, { x, z, heading: 0, y: 0, speed: 0, health: 100, hurt: 0, cooldown: 0,
      reload: 0, swing: 0, money: career?.money ?? 140, rep: career?.rep ?? 0,
      ammo: 8, reserve: career?.reserve ?? 32, weapon: 'fists', armed: false, aim: false, car: null, theft: null });
    player.model.node.visible = true;
    game.upgrades = career?.upgrades ?? { engine: 0, armor: 0, weapon: 0 };
    game.missions.setChapter(chapter);
    game.activities.reset();
    game.activities.stashes.clear();
    for (const i of career?.stashes ?? []) game.activities.stashes.add(i);
    game.camera.update(player, NEUTRAL, 0, true);
    animateCharacter(player, game.clock, 0, 0);
    updateTraffic(cars, player, city, 0, game.clock);
  }

  game.start = useSave => {
    const career = useSave ? loadCareer() : null;
    reset(career);
    input.reset();
    game.audio.start();
    game.menus.show('play');
  };

  game.retry = () => {
    const career = { chapter: game.missions.chapter, money: Math.max(0, player.money - 35), rep: player.rep,
      reserve: Math.max(24, player.reserve), upgrades: game.upgrades, stashes: [...game.activities.stashes] };
    reset(career, true);
    input.reset();
    game.menus.show('play');
    game.save();
  };

  game.openShop = type => {
    if (game.police.stars) {
      game.toast('Come back after you lose the patrol', 'SERVICE UNAVAILABLE');
      return;
    }
    game.menus.show(type);
    input.reset();
  };

  function interact() {
    if (player.theft) return;
    if (game.missions.interact() || game.activities.interact()) return;
    if (player.car) {
      exitVehicle(game);
      return;
    }
    const car = nearestVehicle(player, cars);
    if (car) enterVehicle(game, car);
  }

  function simulate(controls, dt) {
    game.clock += dt;
    game.timeOfDay = (game.timeOfDay + dt * 1.32) % 1440;
    if (game.notice?.until < game.clock) game.notice = null;
    if (game.dialogue?.until < game.clock) game.dialogue = null;
    if (controls.presses.has('KeyE')) interact();
    if (game.menus.mode !== 'play') return;
    updateCombat(game, controls, dt);
    updatePlayer(game, controls, dt);
    updateTraffic(cars, player, city, dt, game.clock);
    updatePolice(game, dt);
    updatePedestrians(people, player, city, dt, game.clock);
    updateGuards(game, dt);
    for (let i = people.length - 1; i >= 0; i--) {
      if (!people[i].expires || people[i].expires > game.clock) continue;
      people[i].model.node.removeFromParent();
      people.splice(i, 1);
    }
    game.missions.update(dt);
    game.activities.update(dt);
    effects.update(dt);
    if (player.health <= 0) {
      input.reset();
      game.menus.show('busted');
      disturbCrowd(people, player.x, player.z, 9);
    }
  }

  function renderState(controls, dt, title = false) {
    if (title) {
      const drift = Math.sin(game.clock * .12) * 2.2;
      camera.position.set(129 + drift, 45.5, 173 - drift);
      camera.lookAt(-16, 8, -51);
      if (camera.fov !== 55) {
        camera.fov = 55;
        camera.updateProjectionMatrix();
      }
      game.timeOfDay = 1080;
      atmosphere.update(game.timeOfDay, { x: 98, z: 118 }, camera, city.water);
    } else {
      game.camera.update(player, controls, dt);
      atmosphere.update(game.timeOfDay, player, camera, city.water);
    }
    camera.updateMatrixWorld();
    city.water.time.value = game.clock;
    markers(game.objective(), game.clock);
    lightSiren(game.police.units, player, game.clock);
  }

  function idle(dt) {
    game.clock += dt;
    updateTraffic(cars, player, city, dt, game.clock);
    updatePedestrians(people, { x: 79, z: 36 }, city, dt, game.clock);
  }

  return Object.assign(game, { reset, interact, simulate, idle, renderState });
}
