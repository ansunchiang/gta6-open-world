import { WEAPONS, weaponById } from '../combat/weapons.js';

const silhouettes = [
  [[5,10],[9,6],[11,8],[14,4],[17,5],[18,2],[22,3],[23,6],[27,5],[29,9],[27,18],[22,22],[12,22],[7,17]],
  [[3,20],[6,22],[15,14],[22,12],[37,4],[35,1],[20,7],[14,11]],
  [[4,5],[31,5],[31,11],[20,12],[17,21],[9,21],[11,12],[4,10]],
  [[2,9],[9,7],[18,7],[18,4],[25,4],[25,7],[37,7],[37,11],[28,12],[30,22],[24,22],[21,13],[14,20],[9,20],[10,12],[2,13]],
  [[1,14],[9,9],[17,8],[20,5],[38,5],[38,9],[24,10],[20,13],[12,13],[4,20],[1,20]],
  [[1,7],[11,7],[15,4],[23,4],[25,7],[38,8],[38,10],[26,11],[22,13],[24,22],[17,22],[16,13],[10,16],[5,13],[1,13]],
  [[1,11],[6,6],[14,6],[15,3],[24,3],[25,6],[38,6],[38,11],[27,12],[23,16],[25,22],[18,22],[13,16],[3,16]],
];

export function createWeaponBar(bar) {
  const [header, strip] = bar.children;
  const slots = WEAPONS.map((weapon, index) => {
    const slot = document.createElement('div');
    const icon = document.createElement('canvas');
    icon.width = 40;
    icon.height = 24;
    const ctx = icon.getContext('2d');
    ctx.fillStyle = '#faedda';
    ctx.beginPath();
    silhouettes[index].forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.fill();
    slot.append(icon, (index + 1) + ' ' + weapon.label);
    strip.append(slot);
    return slot;
  });
  return player => {
    const weapon = weaponById[player.weapon];
    const supply = player.loadout[weapon.id];
    header.children[0].textContent = 'WEAPON SLOT · ' + weapon.name;
    header.children[1].textContent = player.reload ? 'RELOADING' : weapon.capacity ? supply.rounds + ' / ' + supply.stock : 'MELEE';
    slots.forEach((slot, i) => {
      slot.classList.toggle('selected', WEAPONS[i] === weapon);
      slot.classList.toggle('locked', !player.loadout[WEAPONS[i].id].owned);
    });
  };
}
