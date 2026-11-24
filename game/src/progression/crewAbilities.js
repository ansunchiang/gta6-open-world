import {distance} from '../render/geometry.js'

export const CREW = [
	['ROOK', 'Armor drop', 'X', 100, '+42 armor.'],
	['SERA QUAY', 'Blackout', 'Z', 85, 'Jam tracking for 7s.'],
	['DEX RILL', 'Tyre burst', 'B', 65, 'Slow a nearby patrol.'],
].map(([name, label, key, wait, detail]) => ({name, label, key, wait, detail}))

export function callCrew(game, presses) {
	const {player, police, crewReady, clock} = game
	const i = CREW.findIndex(crew => presses.has('Key' + crew.key))
	const crew = CREW[i]
	if (!crew || crewReady[i] > clock) return
	if (i === 0) player.armor = Math.min(100, player.armor + 42)
	else if (!police.stars) return
	else if (i === 1) police.blackout = clock + 7
	else {
		const unit = police.units.toSorted((a, b) => distance(a, player) - distance(b, player))[0]
		if (!unit || distance(unit, player) >= 40) return
		unit.burstUntil = clock + 12
		unit.speed *= .32
		game.effects.sparks(unit.x, .35, unit.z)
	}
	crewReady[i] = clock + crew.wait
	game.speak(crew.name, crew.detail, 5)
	game.audio.effect('radio')
}
