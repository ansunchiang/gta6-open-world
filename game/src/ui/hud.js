import * as T from '../../vendor/three.module.min.js';
import { drawMap } from './minimap.js';
import { districtAt } from '../world/cityLayout.js';
import { nearestVehicle } from '../player/playerController.js';
import { VEHICLE_TYPES } from '../vehicles/vehicleModel.js';
import { distance } from '../render/geometry.js';
import { respectRank } from '../progression/respect.js';
import { createDispatchPanel } from './dispatchPanel.js';
import { createWeaponBar } from './weaponBar.js';
import { drawPortrait } from './portraits.js';
import { updateVehiclePanel } from './vehiclePanel.js';

const id = name => document.getElementById(name);
const content = (key, value) => {
  const node = id(key);
  if (node.textContent !== String(value)) node.textContent = value;
};

export function createHud() {
  const position = new T.Vector3();
  const dispatch = createDispatchPanel(id('dispatch-panel'), id('dispatch-roster'));
  const weaponBar = createWeaponBar(id('weapon-bar'));
  let lastMap = -1, lastSpeaker;

  function update(game, camera, controls) {
    const { player, police } = game;
    const job = game.objective();
    content('job-kind', job.activity ? 'SIDE JOB' : job.optional ? 'FREE ROAM' : `JOB ${job.number}/${job.total} · ${job.contact}`);
    content('job-title', job.title);
    content('job-task', job.task);
    content('stage-label', job.stage ? `STAGE ${job.stage}/${job.stages}` : '');
    const remaining = Math.max(0, Math.ceil(job.remaining ?? 0));
    content('stage-time', job.remaining == null ? '' : Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0'));
    id('stage-progress').hidden = !job.stage;
    id('stage-progress').value = (job.stage ?? 0) / (job.stages ?? 1);
    content('job-next', job.next ? 'NEXT  /  ' + job.next : '');

    content('lit-stars', '★'.repeat(police.stars));
    content('dim-stars', '☆'.repeat(5 - police.stars));
    content('pursuit-label', !police.stars ? 'HARBOR PATROL' : police.contact ? 'IN SIGHT' :
      'SEARCHING' + (police.escapeTime === null ? '' : ' · ' + Math.ceil(police.escapeTime) + 's'));
    dispatch(police, player);
    content('money', '$' + player.money.toLocaleString('en-US'));
    content('district', districtAt(player.x, player.z).name);
    const whole = Math.floor(game.timeOfDay) % 1440;
    content('clock', Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0'));
    for (const meter of ['health', 'armor']) {
      id(meter).value = player[meter];
      content(meter + '-value', Math.ceil(player[meter]));
    }
    const rank = respectRank(player.rep);
    content('rank', 'RANK ' + rank.level + ' · ' + rank.title);
    content('respect-value', player.rep.toLocaleString('en-US') + ' / ' + rank.next.toLocaleString('en-US') + ' RESPECT');
    id('respect').value = rank.fraction;
    updateVehiclePanel(game, id('equip-name'), id('equip-value'), id('equip-label'), id('radio'), id('crew'));
    weaponBar(player);

    const target = !player.car && nearestVehicle(player, game.cars);
    const prompt = player.theft ? 'Taking the wheel' : game.missions.prompt() || game.activities.prompt() ||
      (target ? (target.driver ? 'Carjack ' : 'Enter ') + VEHICLE_TYPES[target.type].name : '');
    id('interaction').hidden = !prompt;
    content('interaction-text', prompt);
    id('reticle').hidden = !(controls.aim && player.armed);
    const waypoint = id('waypoint');
    waypoint.hidden = true;
    if (job.point) {
      const { x, z, label } = job.point;
      const range = distance(job.point, player);
      position.set(x, 3.55, z).project(camera);
      if (range > 2.8 && range < 126 && position.z > -1 && position.z < 1 && Math.abs(position.x) < .84 && Math.abs(position.y) < .80) {
        waypoint.hidden = false;
        waypoint.style.left = (50 + position.x * 50) + '%';
        waypoint.style.top = (50 - position.y * 50) + '%';
        waypoint.lastElementChild.textContent = (label ? label + ' / ' : '') + Math.round(range) + ' M';
      }
    }
    id('dialogue').hidden = !game.dialogue;
    if (game.dialogue) {
      const { name, text } = game.dialogue;
      if (lastSpeaker !== name) drawPortrait(id('portrait'), name);
      lastSpeaker = name;
      content('speaker', name);
      content('dialogue-text', text);
    }
    id('toast').hidden = !game.notice;
    if (game.notice) {
      content('toast-type', game.notice.type);
      content('toast-text', game.notice.text);
    }
    id('damage').style.opacity = Math.min(.65, player.hurt * .78);
    if (Math.abs(game.clock - lastMap) > .075 || game.clock === 0) {
      lastMap = game.clock;
      drawMap(id('minimap'), game, job);
    }
  }
  return { update, show(value) { id('hud').hidden = !value; } };
}
