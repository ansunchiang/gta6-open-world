import { PLACES } from '../world/cityLayout.js';
import { distance } from '../render/geometry.js';

export const ACTIVITIES = [
  { ...PLACES.race, title: 'Breakwater Sprint', type: 'race', symbol: 'R', color: '#78e5dc' },
  { ...PLACES.delivery, title: 'Lockside Courier', type: 'delivery', symbol: 'C', color: '#e8abe9' },
  { ...PLACES.market, title: 'Night Market', type: 'market', symbol: '+', color: '#edb1e7' },
  { ...PLACES.garage, title: 'Rook’s Garage', type: 'garage', symbol: 'G', color: '#78e5dc' },
  { ...PLACES.marina, title: 'Marina Slalom', type: 'boat', symbol: 'B', color: '#86d6ff' },
  { ...PLACES.safehouse, title: 'The Salt Flat', type: 'safehouse', symbol: 'H', color: '#ffcb91' },
];

const checkpoints = [
  { x: 120, z: 65 }, { x: 120, z: 0 }, { x: 180, z: 0 }, { x: 180, z: 63 }, { x: 180, z: 120 }, { x: 120, z: 120 },
];
const buoys = [
  { x: 258, z: 56, label: 'OUTBOUND BUOY' }, { x: 283, z: 16, label: 'OFFSHORE BUOY' },
  { x: 263, z: -21, label: 'BEACON BUOY' }, { x: 237, z: 39, label: 'MARINA FINISH' },
];
const stashLocations = [
  { x: 43, z: 43 }, { x: 194, z: 111 }, { x: -73, z: -49 }, { x: 246, z: -25 },
  { x: -164, z: 169 }, { x: 48, z: -111 }, { x: 100, z: 111 }, { x: -169, z: -74 },
];
const routes = { race: checkpoints, boat: buoys };
const terms = { race: [54, 285], delivery: [75, 235], boat: [65, 385] };

export function createActivities(game) {
  let active = null;
  const stashes = new Set();

  const player = game.player;
  const boatNearby = () => player.car?.type === 'boat' && distance(player, PLACES.marina) < 25;
  const nearby = () => boatNearby() ? ACTIVITIES[4] : ACTIVITIES.find(site => distance(site, player) < 4.8);
  const canDeliver = () => active?.type === 'delivery' && distance(player, PLACES.market) < 6 && Math.abs(player.car?.speed ?? 0) < 3;

  function interact() {
    const { type, title } = nearby() ?? {};
    if (active) {
      if (!canDeliver()) return false;
      finish();
      return true;
    }
    if (type === 'delivery' || type === 'race' && player.car || type === 'boat' && boatNearby()) {
      active = { type, time: terms[type][0], title, index: 0 };
      game.audio.effect('radio');
    } else if (type === 'safehouse' && !game.player.car) {
      if (game.police.stars) game.toast('Lose dispatch first', 'SAFEHOUSE');
      else {
        player.health = player.armor = 100;
        game.toast(game.save(PLACES.safehouse) ? 'Career saved' : 'Health and armor restored', 'THE SALT FLAT');
      }
    } else if ((type === 'market' || type === 'garage') && Math.abs(game.player.car?.speed ?? 0) < 2) game.openShop(type);
    else return false;
    return true;
  }

  function finish() {
    const cash = terms[active.type][1];
    player.money += cash;
    player.rep += active.type === 'delivery' ? 52 : 65;
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
      } else if (route() && player.car && distance(player, route()[active.index]) < 9) {
        active.index++;
        game.audio.effect('coin');
        if (active.index === route().length) finish();
      }
    }
    for (let i = 0; i < stashLocations.length; i++) {
      if (stashes.has(i) || distance(stashLocations[i], game.player) > 1.7) continue;
      stashes.add(i);
      player.money += 65;
      player.rep += 15;
      player.armor = Math.min(100, player.armor + 40);
      game.toast('$65 + armor', 'SUPPLY PICKUP');
      game.audio.effect('coin');
      game.save();
    }
  }

  const route = () => routes[active?.type];

  function objective() {
    if (!active) return null;
    const points = route();
    return {
      title: active.title,
      task: points ? 'Reach the next checkpoint' : 'Deliver the parcel',
      stage: points ? active.index + 1 : 1, stages: points?.length ?? 1, remaining: active.time,
      next: points && active.index + 1 < points.length ? 'Next checkpoint' : 'Collect payout',
      point: points ? points[active.index] : PLACES.market,
      activity: true,
    };
  }

  function prompt() {
    if (canDeliver()) return 'Hand over parcel';
    if (active) return '';
    if (boatNearby()) return 'Start Marina Slalom';
    const location = nearby();
    if (!location) return '';
    if (location.type === 'safehouse') return 'Use safehouse';
    if (location.type === 'boat') return '';
    if (location.type === 'race' && !game.player.car) return '';
    return location.type === 'race' || location.type === 'delivery' ? 'Start ' + location.title : 'Browse ' + location.title;
  }

  return { interact, update, objective, prompt, stashes, stashLocations, reset() { active = null; } };
}
