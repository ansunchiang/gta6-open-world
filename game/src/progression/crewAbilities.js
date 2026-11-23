import {distance} from 'geometry'

export const CREW = [
	['ROOK', 'Armor drop', 'X', 100, 'Recover 42 armor.'],
	['SERA QUAY', 'Blackout', 'Z', 85, 'Block tracking for 7 seconds.'],
	['DEX RILL', 'Tyre burst', 'B', 65, 'Slow a nearby patrol car.'],
].map(([name, label, key, wait, detail]) => ({name, label, key, wait, detail}))

export function callCrew(game, presses) {
	const {player, police, crewReady, clock} = game
	const i = CREW.findIndex(crew => presses.has('Key' + crew.key))
	if (i < 0 || crewReady[i] > clock) return
	if (i === 0) player.armor = Math.min(100, player.armor + 42)
	else if (!police.stars) return
	else if (i === 1) police.blackout = clock + 7
	else {
		const unit = police.units.reduce((best, car) => distance(car, player) < Math.min(40, best ? distance(best, player) : Infinity) ? car : best, null)
		if (!unit) return
		unit.burstUntil = clock + 12
		unit.speed *= .32
		game.effects.sparks(unit.x, .35, unit.z)
	}
	const crew = CREW[i]
	crewReady[i] = clock + crew.wait
	game.speak(crew.name, crew.detail, 5)
	game.audio.effect('radio')
}
