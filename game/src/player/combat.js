import {warnCrowd} from '../ai/crowdReaction.js'
import {WEAPONS, weaponById} from '../combat/weapons.js'
import {bearing, distance, offset, turn} from '../render/geometry.js'
import {lineClear} from '../ai/policeAI.js'

function targetInArc(game, reach, heading, arc) {
	const {player, guards, police, people, cars, city} = game
	let hit = null, best = reach
	for (const target of [...guards, ...police.officers, ...people, ...cars]) {
		if (target === player.car || target.down > 0 || target.health <= 0) continue
		const range = distance(player, target)
		const spread = range < 1.5 ? Math.max(.8, arc) : arc
		if (range > best || Math.abs(turn(heading, bearing(player, target))) > spread || !lineClear(city, player, target, 1.38)) continue
		hit = target
		best = range
	}
	return hit
}

export function renderShot({effects}, shooter, heading, target, reach, spread = false, height = 1.46) {
	const {x, z} = offset(shooter, .95, .26, heading)
	const range = Math.max(1, (target ? distance(shooter, target) : reach) - .8)
	effects.flash(x, height, z, heading, range)
	if (spread) for (const offset of [-.07, -.035, .045, .09]) effects.flash(x, height, z, heading + offset, range, true)
	if (target) effects.sparks(target.x, target.node ? .9 : 1.25, target.z, spread ? 19 : 10)
}

function strike(game, target, amount) {
	target.health -= amount
	if (target.model && target.health <= 0) {
		target.down = target.guard ? 9999 : 10
		if (target.guard) game.player.rep += 15
	}
	if (!target.guard && target.mode !== 'police') game.player.onCrime(.55)
}

export function updateCombat(game, controls, dt) {
	const {player, audio, camera, upgrades, people} = game
	const {presses, aim, attack} = controls
	player.cooldown = Math.max(0, player.cooldown - dt)
	player.swing = Math.max(0, player.swing - dt * 2.7)
	if (player.theft) return
	const direct = WEAPONS.find((_, index) => presses.has('Digit' + (index + 1)))
	const cycle = presses.has('KeyQ') && WEAPONS.filter(weapon => player.loadout[weapon.id].owned)
	const selected = direct ?? (cycle ? cycle[(cycle.findIndex(weapon => weapon.id === player.weapon) + 1) % cycle.length] : null)
	if (selected && selected.id !== player.weapon) {
		if (player.loadout[selected.id].owned) {
			player.weapon = selected.id
			player.reload = 0
		} else game.toast('Visit the Night Market', 'WEAPON LOCKED')
	}

	const weapon = weaponById[player.weapon]
	const supply = player.loadout[weapon.id]
	player.armed = weapon.capacity > 0
	if (player.reload > 0) {
		player.reload = Math.max(0, player.reload - dt)
		if (!player.reload) {
			const rounds = Math.min(supply.stock, weapon.capacity - supply.rounds)
			supply.rounds += rounds
			supply.stock -= rounds
		}
	}
	const reload = () => {
		if (!player.reload && supply.stock && supply.rounds < weapon.capacity) {
			player.reload = weapon.id === 'shotgun' ? 1.35 : .94
			audio.effect('reload')
		}
	}
	if (presses.has('KeyR')) reload()
	if (!attack && !presses.has('MouseAttack') && !presses.has('KeyF')) return
	if (player.cooldown || player.reload || player.car && !player.armed) return
	const heading = aim ? camera.yaw : player.heading
	if (player.armed && !supply.rounds) {
		player.cooldown = .29
		reload()
		if (!player.reload) audio.effect('empty')
		return
	}

	player.cooldown = weapon.pace
	player.swing = player.armed ? .49 : .76
	const shotgun = weapon.id === 'shotgun'
	const arc = !player.armed ? .87 : shotgun ? .32 : aim ? .115 : .235
	const hit = targetInArc(game, weapon.reach, heading, arc)
	if (hit) strike(game, hit, weapon.damage + (player.armed ? upgrades.weapon * 9 : 0))
	if (!player.armed) {
		audio.effect(hit ? 'impact' : 'swipe')
		return
	}
	supply.rounds--
	renderShot(game, player, heading, hit, weapon.reach, shotgun, player.car ? 1.2 : 1.46)
	if (!hit?.guard) player.onCrime(hit?.mode === 'police' ? .73 : .22)
	warnCrowd(people, player.x, player.z, 24)
	audio.effect(shotgun || weapon.id === 'heavy' ? 'blast' : 'shot')
}
