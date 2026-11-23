import {count} from '../save/saveSystem.js'

export const WEAPONS = [
	// Magazine, damage, range, cadence, reserve, price, rank
	['fists', 'Fists', 0, 42, 2.4, .4],
	['bat', 'Breakwater Bat', 0, 66, 3.1, .58],
	['pistol', 'Tideline .38', 8, 44, 47, .24, 32],
	['smg', 'Midge SMG', 24, 24, 38, .10, 72],
	['shotgun', 'Sounder 12', 5, 82, 24, .72, 20],
	['carbine', 'Meridian Carbine', 18, 49, 62, .18, 54, 720, 3],
	['heavy', 'Maelstrom Heavy', 32, 58, 54, .12, 64, 1450, 5],
].map(([id, name, capacity, damage, reach, pace, stock = 0, price, rank]) =>
	({id, name, capacity, damage, reach, pace, stock, price, rank}))

export const weaponById = Object.fromEntries(WEAPONS.map(weapon => [weapon.id, weapon]))

export function createLoadout(saved = {}, legacyReserve = 32) {
	return Object.fromEntries(WEAPONS.map(({id, price, capacity, stock}) => {
		const previous = saved[id]
		const owned = !price || previous?.owned === true
		return [id, {
			owned,
			rounds: owned ? count(previous?.rounds, capacity, capacity) : 0,
			stock: owned ? count(previous?.stock, 200, id === 'pistol' ? legacyReserve : stock) : 0,
		}]
	}))
}

export function buyWeapon(player, weapon) {
	const {id, capacity: rounds, stock} = weapon
	player.loadout[id] = {owned: true, rounds, stock}
}
