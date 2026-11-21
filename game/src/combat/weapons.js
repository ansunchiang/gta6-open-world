export const WEAPONS = [
  { id: 'fists', label: 'FISTS', name: 'Fists', capacity: 0, damage: 42, reach: 2.4, pace: .4 },
  { id: 'bat', label: 'BAT', name: 'Breakwater Bat', capacity: 0, damage: 66, reach: 3.1, pace: .58 },
  { id: 'pistol', label: 'PISTOL', name: 'Tideline .38', capacity: 8, damage: 44, reach: 47, pace: .24, stock: 32 },
  { id: 'smg', label: 'SMG', name: 'Midge SMG', capacity: 24, damage: 24, reach: 38, pace: .10, stock: 72 },
  { id: 'shotgun', label: 'SHOTGUN', name: 'Sounder 12', capacity: 5, damage: 82, reach: 24, pace: .72, stock: 20 },
  { id: 'carbine', label: 'CARBINE', name: 'Meridian Carbine', capacity: 18, damage: 49, reach: 62, pace: .18, stock: 54, price: 720, rank: 3 },
  { id: 'heavy', label: 'HEAVY', name: 'Maelstrom Heavy', capacity: 32, damage: 58, reach: 54, pace: .12, stock: 64, price: 1450, rank: 5 },
];

export const weaponById = Object.fromEntries(WEAPONS.map(weapon => [weapon.id, weapon]));

export function createLoadout(saved = {}, legacyReserve = 32) {
  return Object.fromEntries(WEAPONS.map(weapon => {
    const previous = saved[weapon.id];
    const owned = !weapon.price || previous?.owned === true;
    const load = Number.isFinite(previous?.rounds) ? previous.rounds : weapon.capacity;
    const stock = Number.isFinite(previous?.stock) ? previous.stock : weapon.id === 'pistol' ? legacyReserve : weapon.stock ?? 0;
    return [weapon.id, {
      owned,
      rounds: owned ? Math.max(0, Math.min(weapon.capacity, Math.floor(load))) : 0,
      stock: owned ? Math.max(0, Math.min(200, Math.floor(stock))) : 0,
    }];
  }));
}

export function buyWeapon(player, weapon) {
  Object.assign(player.loadout[weapon.id], { owned: true, rounds: weapon.capacity, stock: weapon.stock });
}
