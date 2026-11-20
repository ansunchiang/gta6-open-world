import * as T from '../../vendor/three.module.min.js';
import { drawMap } from './minimap.js';
import { districtAt } from '../world/cityLayout.js';
import { nearestVehicle } from '../player/playerController.js';
import { VEHICLE_TYPES } from '../vehicles/vehicleModel.js';
import { distance } from '../render/geometry.js';

const dollars = new Intl.NumberFormat('en-US');
const id = name => document.getElementById(name);

export function createHud() {
  const position = new T.Vector3();
  const hud = id('hud');
  const nodes = Object.fromEntries([
    'job-kind','job-title','job-task','pursuit-label','stars','money','district','clock','minimap','health','health-fill',
    'equipment','equip-label','equip-value','equip-name','instructions','interaction','interaction-text','waypoint',
    'reticle','dialogue','speaker','dialogue-text','toast','toast-type','toast-text','damage',
  ].map(name => [name, id(name)]));
  const dispatch = nodes.stars.closest('.vitals');
  const waypointText = nodes.waypoint.querySelector('span');
  let lastStars = -1;
  let lastDriving = null;
  let lastMap = -1;

  function content(key, string) {
    if (nodes[key].textContent !== string) nodes[key].textContent = string;
  }

  function update(game, camera, controls) {
    const { player, police } = game;
    const objective = game.objective();
    content('job-kind', objective.activity ? 'SIDE JOB' : objective.optional ? 'FREE ROAM' : 'STORY JOB 0' + objective.number);
    content('job-title', objective.title);
    content('job-task', objective.task);
    content('pursuit-label', police.stars ? police.unseen > 3 ? 'LOSING SIGNAL' : 'IN PURSUIT' : 'HARBOR PATROL');
    if (lastStars !== police.stars) {
      lastStars = police.stars;
      const hot = document.createElement('b');
      hot.textContent = '★'.repeat(lastStars);
      nodes.stars.replaceChildren(hot, document.createTextNode('☆'.repeat(5 - lastStars)));
      nodes.stars.setAttribute('aria-label', `Wanted level ${lastStars} of 5`);
    }
    dispatch.classList.toggle('hot', police.stars > 0);
    dispatch.classList.toggle('search', police.unseen > 3);
    content('money', '$' + dollars.format(player.money));
    content('district', districtAt(player.x, player.z).name);
    const whole = Math.floor(game.timeOfDay) % 1440;
    content('clock', `${String(Math.floor(whole / 60)).padStart(2,'0')}:${String(whole % 60).padStart(2,'0')}`);
    content('health', String(Math.ceil(player.health)));
    nodes['health-fill'].style.transform = `scaleX(${player.health / 100})`;
    nodes['health-fill'].style.background = player.health < 36 ? '#ff8878' : '';

    const car = player.car;
    const driving = !!car;
    if (lastDriving !== driving) {
      lastDriving = driving;
      nodes.equipment.classList.toggle('driving', driving);
      nodes.instructions.innerHTML = driving ?
        'WASD Drive <span>·</span> Space Handbrake <span>·</span> E Exit <span>·</span> Esc Pause' :
        'WASD Move <span>·</span> RMB Look / Aim <span>·</span> Esc Pause';
    }
    content('equip-label', driving ? 'KM/H' : player.weapon === 'pistol' ? 'TIDELINE .38' : 'ON FOOT');
    content('equip-value', driving ? String(Math.round(Math.abs(car.speed) * 3.6)).padStart(2, '0') :
      player.weapon === 'pistol' ? `${player.ammo} / ${player.reserve}` : 'Fists');
    content('equip-name', driving ? `${VEHICLE_TYPES[car.type].name} · ${Math.max(0, Math.ceil(car.health))}%` :
      player.weapon === 'pistol' ? (player.reload > 0 ? 'RELOADING' : 'R RELOAD') : '2 EQUIP PISTOL');
    const target = !car && nearestVehicle(player, game.cars);
    const prompt = player.theft ? 'Taking the wheel' :
      game.missions.prompt() || game.activities.prompt() ||
      (target ? `${target.driver ? 'Carjack' : 'Enter'} ${VEHICLE_TYPES[target.type].name}` : '');
    nodes.interaction.hidden = !prompt;
    if (prompt) content('interaction-text', prompt);
    nodes.reticle.hidden = !(controls.aim && player.weapon === 'pistol' && !car);

    const site = objective.point;
    nodes.waypoint.hidden = true;
    if (site) {
      const range = distance(site, player);
      position.set(site.x, 3.55, site.z).project(camera);
      if (range > 2.8 && range < 126 && position.z > -1 && position.z < 1 && Math.abs(position.x) < .91 && Math.abs(position.y) < .83) {
        nodes.waypoint.hidden = false;
        nodes.waypoint.style.left = (position.x * 50 + 50) + '%';
        nodes.waypoint.style.top = (50 - position.y * 50) + '%';
        const label = site.label ? site.label + ' / ' : '';
        const text = label + Math.round(range) + ' M';
        if (waypointText.textContent !== text) waypointText.textContent = text;
      }
    }
    nodes.dialogue.hidden = !game.dialogue;
    if (game.dialogue) {
      content('speaker', game.dialogue.name);
      content('dialogue-text', game.dialogue.text);
    }
    nodes.toast.hidden = !game.notice;
    if (game.notice) {
      content('toast-type', game.notice.type);
      content('toast-text', game.notice.text);
    }
    nodes.damage.style.opacity = Math.min(.70, player.hurt * .85);
    if (Math.abs(game.clock - lastMap) > .075 || game.clock === 0) {
      lastMap = game.clock;
      drawMap(nodes.minimap, game, objective);
    }
  }
  return { update, show(value) { hud.hidden = !value; } };
}
