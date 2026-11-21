import { drawMap } from './minimap.js';
import { loadCareer } from '../save/saveSystem.js';
import { WEAPONS, buyWeapon } from '../combat/weapons.js';
import { garageUpgrades } from '../progression/garageUpgrades.js';
import { respectRank } from '../progression/respect.js';

const id = key => document.getElementById(key);
const shopItems = {
  garage: garageUpgrades,
  market: [
    { type: 'weapon', name: 'Mark II pistol', description: 'Increase damage from the Tideline .38.', price: 235 },
    { type: 'ammo', name: 'Ammo crate', description: 'Replenish all owned weapons.', price: 65 },
    { type: 'repair', name: 'First aid', description: 'Restore health and armor.', price: 55 },
    ...WEAPONS.filter(weapon => weapon.price).map(weapon => ({ ...weapon, type: weapon.id, description: 'Unlocks at rank ' + weapon.rank })),
  ],
};
const headers = {
  pause: ['SALT RELAY', 'Paused'], map: ['VESPER BAY · CITY MAP', 'SALT RELAY'], help: ['SALT RELAY', 'Controls'],
  garage: ['MIRAGE ROW', 'Rook’s Garage'], market: ['MIRAGE ROW', 'Night Market'],
  busted: ['CHECKPOINT', 'Taken down'],
};

export function createMenus(game) {
  const panels = { pause: 'pause-actions', map: 'map-panel', help: 'help-panel',
    garage: 'shop-panel', market: 'shop-panel', busted: 'busted-panel' };
  const sheets = new Set(Object.values(panels));
  let mode = '';
  let beforeHelp = 'title';
  const on = (node, action) => id(node).addEventListener('click', action);

  function show(next) {
    mode = next;
    id('save-feedback').textContent = '';
    if (mode === 'title') id('continue').hidden = !loadCareer();
    id('title').hidden = mode !== 'title' && !(mode === 'help' && beforeHelp === 'title');
    id('overlay').hidden = !headers[mode];
    for (const panel of sheets) id(panel).hidden = panel !== panels[mode];
    if (mode === 'title') drawMap(id('title-map'), game, game.missions.objective(), 'title');
    if (headers[mode]) [id('overlay-tag').textContent, id('overlay-title').textContent] = headers[mode];
    if (mode === 'map') {
      drawMap(id('full-map'), game, game.objective(), 'full');
      const rank = respectRank(game.player.rep);
      id('map-stats').textContent = `RANK ${rank.level} · ${rank.title}   /   ${game.missions.chapter}/8 JOBS   /   $${game.player.money.toLocaleString('en-US')}`;
    }
    if (mode === 'market' || mode === 'garage') showShop(mode);
  }

  function showShop(type) {
    const { player, upgrades } = game;
    const list = id('shop-items');
    id('shop-cash').textContent = '$' + player.money.toLocaleString('en-US');
    list.replaceChildren();
    for (const item of shopItems[type]) {
      const level = upgrades[item.type];
      const price = item.price + (level ?? 0) * 90;
      const weapon = item.id && player.loadout[item.id];
      const capped = level >= 2 || weapon?.owned;
      const locked = item.rank && item.rank > respectRank(player.rep).level;
      const button = document.createElement('button');
      button.className = 'quiet';
      button.disabled = capped || locked || player.money < price;
      for (const [tag, text] of [
        ['strong', item.name + (level === undefined ? '' : ' · Lv ' + level)],
        ['span', capped ? 'FULL' : locked ? 'RANK ' + item.rank : '$' + price],
        ['small', item.description],
      ]) {
        const child = document.createElement(tag);
        child.textContent = text;
        button.append(child);
      }
      button.onclick = () => {
        player.money -= price;
        if (level !== undefined) upgrades[item.type]++;
        if (weapon) buyWeapon(player, item);
        if (item.type === 'ammo') for (const spec of WEAPONS) {
          const supply = player.loadout[spec.id];
          if (supply.owned && spec.capacity) supply.stock = Math.min(200, supply.stock + spec.capacity * 4);
        }
        if (item.type === 'repair') {
          player.health = player.armor = 100;
          if (player.car) player.car.health = 100;
        }
        game.audio.effect('coin');
        game.save();
        showShop(type);
      };
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
  for (const button of ['title-help', 'pause-help']) on(button, help);
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
