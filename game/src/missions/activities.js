import { PLACES } from '../world/cityLayout.js';
import { distance } from '../render/geometry.js';

export const ACTIVITIES = [
  { ...PLACES.race, title: 'Breakwater Sprint', type: 'race', symbol: 'R', color: '#78e5dc' },
  { ...PLACES.delivery, title: 'Lockside Courier', type: 'delivery', symbol: 'C', color: '#e8abe9' },
  { ...PLACES.market, title: 'Night Market', type: 'market', symbol: '+', color: '#edb1e7' },
  { ...PLACES.garage, title: 'Rook’s Garage', type: 'garage', symbol: 'G', color: '#78e5dc' },
];

const checkpoints = [
  { x: 120, z: 65 }, { x: 120, z: 0 }, { x: 180, z: 0 }, { x: 180, z: 63 }, { x: 180, z: 120 }, { x: 120, z: 120 },
];
const stashLocations = [
  { x: 43, z: 43 }, { x: 194, z: 111 }, { x: -73, z: -49 }, { x: 246, z: -25 },
  { x: -164, z: 169 }, { x: 48, z: -111 }, { x: 100, z: 111 }, { x: -169, z: -74 },
];

export function createActivities(game) {
  let active = null;
  const stashes = new Set();

  function nearby() {
    return ACTIVITIES.find(site => distance(site, game.player) < 4.8);
  }

  function interact() {
    const type = nearby()?.type;
    if (active) {
      if (active.type === 'delivery' && distance(game.player, PLACES.market) < 6 && (!game.player.car || Math.abs(game.player.car.speed) < 3)) {
        finish(235, 52);
        return true;
      }
      return false;
    }
    if (type === 'race' && game.player.car) {
      active = { type, time: 54, index: 0, title: 'Breakwater Sprint' };
      game.audio.effect('radio');
    } else if (type === 'delivery') {
      active = { type, time: 75, title: 'Lockside Courier' };
      game.toast('Get the parcel to the Night Market', 'COURIER RUN');
    } else if ((type === 'market' || type === 'garage') && Math.abs(game.player.car?.speed ?? 0) < 2) game.openShop(type);
    else return false;
    return true;
  }

  function finish(cash, rep) {
    game.player.money += cash;
    game.player.rep += rep;
    game.toast(`$${cash} · ${active.title}`, 'ACTIVITY COMPLETE');
    active = null;
    game.audio.effect('success');
    game.save();
  }

  function update(dt) {
    if (active) {
      active.time -= dt;
      if (active.time <= 0) {
        game.toast('Try the route again anytime', 'TIME EXPIRED');
        active = null;
      } else if (active.type === 'race' && game.player.car && distance(game.player, checkpoints[active.index]) < 9) {
        active.index++;
        game.audio.effect('coin');
        if (active.index === checkpoints.length) finish(285, 65);
      }
    }
    for (let i = 0; i < stashLocations.length; i++) {
      if (stashes.has(i) || distance(stashLocations[i], game.player) > 1.7) continue;
      stashes.add(i);
      game.player.money += 65;
      game.player.rep += 15;
      game.toast(`$${65} · Cash drop ${stashes.size}/${stashLocations.length}`, 'FOUND IN THE CITY');
      game.audio.effect('coin');
      game.save();
    }
  }

  function objective() {
    if (!active) return null;
    const seconds = Math.ceil(active.time) + ' s';
    return {
      title: active.title,
      task: active.type === 'race' ? `Checkpoint ${active.index + 1}/${checkpoints.length} · ${seconds}` : `Deliver the parcel · ${seconds}`,
      point: active.type === 'race' ? checkpoints[active.index] : PLACES.market,
      activity: true,
    };
  }

  function prompt() {
    if (active?.type === 'delivery' && distance(game.player, PLACES.market) < 6) return 'Hand over parcel';
    if (active) return '';
    const location = nearby();
    if (!location) return '';
    if (location.type === 'race' && !game.player.car) return '';
    return location.type === 'race' || location.type === 'delivery' ? 'Start ' + location.title : 'Browse ' + location.title;
  }

  return { interact, update, objective, prompt, stashes, stashLocations, reset() { active = null; } };
}
