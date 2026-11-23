import {WEAPONS, weaponById} from 'weapons'

const silhouettes = [
	'M5 10l4-4 2 2 3-4 3 1 1-3 4 1 1 3 4-1 2 4-2 9-5 4H12L7 17Z',
	'M3 20l3 2 9-8 7-2 15-8-2-3-15 6-6 4Z',
	'M4 5h27v6l-11 1-3 9H9l2-9-7-2Z',
	'M2 9l7-2h9V4h7v3h12v4l-9 1 2 10h-6l-3-9-7 7H9l1-8-8 1Z',
	'M1 14l8-5 8-1 3-3h18v4l-14 1-4 3h-8l-8 7H1Z',
	'M1 7h10l4-3h8l2 3 13 1v2l-12 1-4 2 2 9h-7l-1-9-6 3-5-3H1Z',
	'M1 11l5-5h8l1-3h9l1 3h13v5l-11 1-4 4 2 6h-7l-5-6H3Z',
]

export function createWeaponBar(bar) {
	const [header, strip] = bar.children
	const slots = WEAPONS.map((weapon, index) => {
		const slot = document.createElement('div')
		slot.innerHTML = `<canvas width=40 height=24></canvas>${index + 1} ${weapon.id.toUpperCase()}`
		const icon = slot.firstChild
		const ctx = icon.getContext('2d')
		ctx.fillStyle = '#faedda'
		ctx.fill(new Path2D(silhouettes[index]))
		strip.append(slot)
		return slot
	})
	return player => {
		const weapon = weaponById[player.weapon]
		const supply = player.loadout[weapon.id]
		header.children[0].textContent = weapon.name
		header.children[1].textContent = player.reload ? 'RELOADING' : weapon.capacity ? supply.rounds + ' / ' + supply.stock : 'MELEE'
		slots.forEach((slot, i) => {
			slot.classList.toggle('selected', WEAPONS[i] === weapon)
			slot.classList.toggle('locked', !player.loadout[WEAPONS[i].id].owned)
		})
	}
}
