import {bearing, distance, offset, turn} from 'geometry'
import {lineClear} from '../ai/policeAI.js'

export function targetInArc(game, reach, heading, arc) {
	const {player} = game
	let hit = null
	let best = reach
	for (const enemy of [...game.guards, ...game.police.officers, ...game.people, ...game.cars]) {
		if (enemy === player.car || enemy.down > 0 || enemy.health <= 0) continue
		const delta = distance(player, enemy)
		const error = Math.abs(turn(heading, bearing(player, enemy)))
		if (delta > best || error > (delta < 1.5 ? Math.max(.8, arc) : arc) || !lineClear(game.city, player, enemy, 1.38)) continue
		hit = enemy
		best = delta
	}
	return hit
}

export function renderShot(game, shooter, heading, target, reach, spread = false, height = 1.46) {
	const {x, z} = offset(shooter, .95, .26, heading)
	const range = Math.max(1, (target ? distance(shooter, target) : reach) - .8)
	game.effects.flash(x, height, z, heading, range)
	if (spread) for (const offset of [-.07, -.035, .045, .09]) {
		game.effects.flash(x, height, z, heading + offset, range, true)
	}
	if (target) game.effects.sparks(target.x, target.node ? .9 : 1.25, target.z, spread ? 19 : 10)
}
