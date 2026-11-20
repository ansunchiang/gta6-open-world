import { drawMap } from './minimap.js';
import { loadCareer } from '../save/saveSystem.js';

const id = key => document.getElementById(key);
const shopItems = {
  garage: [
    { type: 'engine', name: 'Torque kit', description: 'Raise the top speed of every vehicle.', price: 220 },
    { type: 'armor', name: 'Crash plating', description: 'Reduce collision damage to vehicles.', price: 190 },
    { type: 'repair', name: 'Pit service', description: 'Restore health and repair your current car.', price: 55 },
  ],
  market: [
    { type: 'weapon', name: 'Mark II pistol', description: 'Increase damage from the Tideline .38.', price: 235 },
    { type: 'ammo', name: 'Pistol rounds', description: 'Restock up to 32 reserve rounds.', price: 45 },
    { type: 'repair', name: 'First aid', description: 'Restore health and repair your current car.', price: 55 },
  ],
};
const headers = {
  pause: ['SALT RELAY', 'Paused'], map: ['VESPER BAY', 'City map'], help: ['SALT RELAY', 'Controls'],
  garage: ['MIRAGE ROW', 'Rook’s Garage'], market: ['MIRAGE ROW', 'Night Market'],
  busted: ['CHECKPOINT', 'Taken down'], error: ['SALT RELAY', 'Graphics unavailable'],
};

export function createMenus(game) {
  const title = id('title');
  const overlay = id('overlay');
  const panels = { pause: 'pause-actions', map: 'map-panel', help: 'help-panel', garage: 'shop-panel',
    market: 'shop-panel', busted: 'busted-panel', error: 'error-panel' };
  let mode = '';
  let beforeHelp = 'title';
  const on = (node, action) => id(node).addEventListener('click', action);

  function show(next) {
    mode = next;
    id('save-feedback').textContent = '';
    id('continue').hidden = !loadCareer();
    title.hidden = mode !== 'title' && !(mode === 'help' && beforeHelp === 'title');
    overlay.hidden = !headers[mode];
    for (const panel of new Set(Object.values(panels))) id(panel).hidden = panel !== panels[mode];
    if (mode === 'title') drawMap(id('title-map'), game, game.missions.objective(), 'title');
    if (headers[mode]) {
      const [tag, heading] = headers[mode];
      id('overlay-tag').textContent = tag;
      id('overlay-title').textContent = heading;
    }
    if (mode === 'map') drawMap(id('full-map'), game, game.objective(), 'full');
    if (mode === 'market' || mode === 'garage') showShop(mode);
    if (mode === 'busted') id('busted-description').textContent = 'Return to the start of this job. Your career progress and upgrades are saved.';
  }

  function showShop(type) {
    const { player, upgrades } = game;
    const list = id('shop-items');
    id('shop-cash').textContent = `Cash  $${player.money.toLocaleString('en-US')}`;
    list.replaceChildren();
    for (const item of shopItems[type]) {
      const level = upgrades[item.type];
      const price = item.price + (level ?? 0) * 90;
      const capped = level >= 2 || item.type === 'ammo' && player.reserve >= 120 ||
        item.type === 'repair' && player.health === 100 && (player.car?.health ?? 100) === 100;
      const button = document.createElement('button');
      button.className = 'quiet';
      button.disabled = capped || player.money < price;
      const name = document.createElement('strong');
      name.textContent = item.name + (level === undefined ? '' : ` · Lv ${level}`);
      const cost = document.createElement('span');
      cost.textContent = capped ? 'FULL' : '$' + price;
      const effect = document.createElement('small');
      effect.textContent = item.description;
      button.append(name, cost, effect);
      button.addEventListener('click', () => {
        if (player.money < price) return;
        player.money -= price;
        if (level !== undefined) upgrades[item.type]++;
        if (item.type === 'ammo') player.reserve = Math.min(120, player.reserve + 32);
        if (item.type === 'repair') {
          player.health = 100;
          if (player.car) player.car.health = 100;
        }
        game.audio.effect('coin');
        game.save();
        showShop(type);
      });
      list.append(button);
    }
  }

  function help() {
    beforeHelp = mode;
    show('help');
  }

  function togglePause() {
    if (mode === 'help') show(beforeHelp);
    else if (mode === 'play') show('pause');
    else if (['pause','map','garage','market'].includes(mode)) show('play');
    game.input.reset();
  }

  function toggleMap() {
    if (mode === 'map') show('play');
    else if (mode === 'play' || mode === 'pause') show('map');
    game.input.reset();
  }

  on('start', () => game.start(false));
  on('continue', () => game.start(true));
  on('resume', togglePause);
  on('title-help', help);
  on('pause-help', help);
  on('help-back', () => show(beforeHelp));
  on('map-button', toggleMap);
  on('map-back', toggleMap);
  on('shop-back', togglePause);
  on('menu-button', () => show('title'));
  on('retry', () => game.retry());
  on('save-button', () => {
    id('save-feedback').textContent = game.save() ? 'Career checkpoint saved.' : 'This browser could not save your checkpoint.';
  });
  on('audio-button', () => {
    id('audio-button').textContent = game.audio.toggle() ? 'Sound off' : 'Sound on';
  });
  return { show, togglePause, toggleMap, get mode() { return mode; } };
}
