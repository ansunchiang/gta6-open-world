import { generateCity } from './cityGenerator.js';
import { createMarkers } from './objectiveMarkers.js';
import { createRandom } from '../random.js';
import { createTraffic, updateTraffic } from '../ai/trafficAI.js';
import { createPedestrians, updatePedestrians } from '../ai/pedestrianAI.js';
import { createPolice, reportCrime, updatePolice, clearPolice } from '../ai/policeAI.js';
import { updateGuards } from '../ai/guardAI.js';
import { createPlayer, enterVehicle, exitVehicle, nearestVehicle, updatePlayer } from '../player/playerController.js';
import { animateCharacter } from '../player/characterModel.js';
import { updateCombat } from '../player/combat.js';
import { createMissionManager } from '../missions/missionManager.js';
import { createActivities } from '../missions/activities.js';
import { STORY } from '../missions/storyJobs.js';
import { PLACES } from './cityLayout.js';
import { createLoadout } from '../combat/weapons.js';
import { STATIONS } from '../audio/radioStations.js';
import { createExplosions } from '../render/explosions.js';
import { updateVehicleDamage } from '../vehicles/vehicleDamage.js';
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
  const explosions = createExplosions(scene);
  const neonLights = scene.children.filter(object => object.userData.neon);
  const player = createPlayer(scene);
  player.rep = 0;
  const cars = createTraffic(scene, random);
  const originals = new Map(cars.map(car => [car, { ...car }]));
  const people = createPedestrians(scene, city, random);
  const game = {
    scene, city, camera: createChaseCamera(camera, city), effects, explosions, player, input, cars, people, guards: [],
    police: createPolice(), audio: createSynth(), upgrades: { engine: 0, armor: 0, weapon: 0 },
    clock: 0, timeOfDay: 1080, station: 0, crewReady: 0, notice: null, dialogue: null, practice,
  };
  game.missions = createMissionManager(game);
  game.activities = createActivities(game);
  const markers = createMarkers(scene, game.activities);

  game.objective = () => game.activities.objective() ?? game.missions.objective();
  game.toast = (text, type, duration = 2.8) => game.notice = { text, type, until: game.clock + duration };
  game.speak = (name, text, duration) => game.dialogue = { name, text, until: game.clock + duration };
  game.save = safehouse => !game.practice && saveCareer(game, safehouse);
  game.damage = amount => {
    const blocked = Math.min(player.armor, amount * .72);
    player.armor -= blocked;
    player.health = Math.max(0, player.health - amount + blocked);
    player.hurt = Math.min(.73, .2 + amount * .015);
  };
  player.onCrime = severity => reportCrime(game.police, severity, player);

  function prune(list, remove) {
    for (let i = list.length - 1; i >= 0; i--) {
      const actor = list[i];
      if (!remove(actor)) continue;
      (actor.node ?? actor.model.node).removeFromParent();
      list.splice(i, 1);
    }
  }

  function reset(career, nearbyChapter = false) {
    clearPolice(game);
    explosions.clear();
    effects.clear();
    prune(cars, car => !originals.has(car));
    for (const [car, state] of originals) Object.assign(car, state, { claimed: false, exploded: false, smokeTime: 0, doorSwing: 0 });
    prune(people, person => !!person.expires);
    for (const person of people) Object.assign(person, { health: 100, down: 0, panic: 0 });
    Object.assign(game, { notice: null, dialogue: null, timeOfDay: 1080, crewReady: 0 });
    const chapter = career?.chapter ?? 0;
    const anchor = STORY[chapter]?.anchor;
    const spawn = career?.safehouse ? PLACES.safehouse : anchor && (chapter || nearbyChapter)
      ? { x: anchor.x - 2.5, z: anchor.z + 3.9 } : { x: 8.1, z: 91 };
    Object.assign(player, spawn, {
      heading: 0, y: 0, speed: 0, health: 100, armor: career?.armor ?? 50, hurt: 0, cooldown: 0,
      reload: 0, swing: 0, money: career?.money ?? 140, rep: career?.rep ?? 0,
      loadout: createLoadout(career?.loadout, career?.reserve), weapon: 'fists', armed: false, aim: false, car: null, theft: null });
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
    reset(useSave ? loadCareer() : null);
    input.reset();
    game.audio.start();
    game.menus.show('play');
  };

  game.retry = () => {
    reset({ ...player, chapter: game.missions.chapter, money: Math.max(0, player.money - 35),
      upgrades: game.upgrades, stashes: [...game.activities.stashes] }, true);
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
    if (controls.presses.has('KeyV')) game.station = (game.station + 1) % STATIONS.length;
    if (controls.presses.has('KeyX') && game.clock >= game.crewReady) {
      game.crewReady = game.clock + 100;
      player.armor = Math.min(100, player.armor + 42);
      game.speak('ROOK', 'Spare plates in your kit.', 5);
      game.audio.effect('radio');
    }
    updateCombat(game, controls, dt);
    updatePlayer(game, controls, dt);
    updateTraffic(cars, player, city, dt, game.clock);
    updatePolice(game, dt);
    updatePedestrians(people, player, city, dt, game.clock);
    updateGuards(game, dt);
    updateVehicleDamage(game, dt);
    prune(people, person => person.expires && person.expires <= game.clock);
    game.missions.update(dt);
    game.activities.update(dt);
    effects.update(dt);
    if (player.health <= 0) {
      input.reset();
      game.menus.show('busted');
    }
  }

  function renderState(controls, dt, title = false) {
    const aerial = game.shotView === 'map' && game.menus.mode === 'map';
    if (title || aerial) {
      camera.position.set(title ? 129 : 290, title ? 45.5 : 96, title ? 173 : 153);
      camera.lookAt(title ? -16 : 50, title ? 8 : 0, title ? -51 : 3);
      camera.fov = title ? 55 : 62;
      camera.updateProjectionMatrix();
    } else game.camera.update(player, controls, dt);
    atmosphere.update(title ? 1080 : game.timeOfDay, title ? { x: 98, z: 118 } : player, camera, city.water);
    camera.updateMatrixWorld();
    const neon = 1 - city.water.sun.value;
    city.neon.emissiveIntensity = .35 + neon * 1.25;
    for (const light of neonLights) light.intensity = neon * 130;
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
