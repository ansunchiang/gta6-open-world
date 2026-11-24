import {bearing, distance, offset} from '../render/geometry.js'
import {animateCharacter} from '../player/characterModel.js'
import {spawnPerson} from './pedestrianAI.js'
import {renderShot} from '../player/combat.js'
import {lineClear} from './policeAI.js'

export function deployOfficer(game, car, x, z) {
	const officer = spawnPerson(game.scene, x, z, '#375886', 2, 'guard')
	Object.assign(officer, {car, armed: true, mode: 'police', fire: .7})
	game.police.officers.push(officer)
	return officer
}

export function poseOfficer(game, officer, dt) {
	const {player, police, city, clock} = game
	officer.aim = !officer.down && clock >= police.blackout &&
		distance(officer, player) < 28 && lineClear(city, officer, player, 1.4)
	if (officer.aim) officer.heading = bearing(officer, player)
	if (officer.aim && (officer.fire -= dt) <= 0) {
		officer.fire = 2.8
		renderShot(game, officer, officer.heading, player, 28)
		game.audio.effect('shot')
		game.damage(5)
	}
	animateCharacter(officer, clock, 0)
}

export function updateOfficers(game, tracking, dt) {
	const {police: {officers, stars}, player} = game
	if (!player.car && stars >= 2) for (const {car, range, visible} of tracking) {
		if (officers.length >= 3) break
		if (visible && range < 24 && !officers.some(officer => officer.car === car)) {
			const {x, z} = offset(car, 0, -1.9)
			deployOfficer(game, car, x, z)
		}
	}
	for (const officer of officers) poseOfficer(game, officer, dt)
}
