import {addInterceptor} from './ai/policeAI.js'
import {deployRoadblock} from './ai/roadblocks.js'
import {spawnHelicopter, poseHelicopter} from './ai/helicopterAI.js'
import {deployOfficer, poseOfficer} from './ai/patrolOfficers.js'
import {spawnPerson} from './ai/pedestrianAI.js'
import {enterVehicle} from './player/playerController.js'
import {animateCharacter} from './player/characterModel.js'
import {updateCombat} from './player/combat.js'
import {spawnVehicle, syncVehicle} from './vehicles/vehiclePhysics.js'
import {updateVehicleDamage} from './vehicles/vehicleDamage.js'
import {PLACES} from './world/cityLayout.js'
import {NEUTRAL} from './world/simulation.js'

const STEP = 1 / 60
function begin(game, chapter, {x, z}, timeOfDay) {
	game.missions.setChapter(chapter)
	Object.assign(game.player, {x: x - 2.1, z: z + 3, heading: 0})
	game.interact()
	game.police.cooldown = game.police.blockDelay = 8
	game.timeOfDay = timeOfDay
}

function wreck(game) {
	const car = spawnVehicle(game.scene, 'patrol', '#263346', 185, 83.5, -1.04, 'parked')
	game.cars.push(car)
	Object.assign(car, {health: 26, wreckRoll: 1.13, lift: .746})
	for (let i = 0; i < 91; i++) {
		if (i === 80) car.health = 0
		updateVehicleDamage(game, STEP)
	}
}

function chase(game) {
	const {player, police, scene} = game
	begin(game, 5, PLACES.race, 1092)
	const car = game.cars.find(ride => ride.type === 'tide')
	Object.assign(car, {x: 179.6, z: 95.5, heading: -.035})
	enterVehicle(game, car, false)
	game.simulate(NEUTRAL, STEP)
	Object.assign(car, {speed: 30.5, health: 74})
	Object.assign(player, {weapon: 'smg', armed: true, health: 83, armor: 64})
	player.loadout.smg.rounds = 16
	player.onCrime(5)
	Object.assign(police, {stars: 5, contact: true})
	for (const [x, z, heading, tactic] of [
		[175.1, 93.6, .37, 'RAMMING'], [184.8, 93, -.36, 'FLANKING'], [173.5, 84.8, .16, 'CLOSING IN'],
	]) {
		addInterceptor(game, x, z, heading).tactic = tactic
	}
	deployRoadblock(game, addInterceptor, {x: 180, z: 77}, 0)
	wreck(game)
	game.effects.update(.08)
	const air = police.air = spawnHelicopter(scene, player.x + 2.2, player.z - 20, 11.1)
	air.visible = true
	poseHelicopter(air, player, .46, .95)
	game.speak('DEX RILL', 'Take the gap. I’ll meet you at the beacon.')
	game.career.standing[2] = 82
	game.station = 1
	game.notice = null
}

function street(game) {
	const {player, scene} = game
	begin(game, 0, PLACES.garage, 1320)
	Object.assign(player, {x: -.8, z: 85.5, heading: -.12, health: 78, armor: 59})
	for (const [x, z, color, flee] of [[7.2, 78, '#ffc074', 1.8], [-5.7, 77.5, '#7fcebe', -1.3], [-6.7, 82, '#f5abc4', -2.3]]) {
		const person = spawnPerson(scene, x, z, color, 2, 'civilian', flee)
		game.people.push(Object.assign(person, {panic: 5, flee, expires: 15}))
		animateCharacter(person, .38, 5)
	}
	player.onCrime(2.4)
	for (const [x, z, heading, footX, footZ] of [[-2.1, 69.2, 2.89, -4.1, 72.3], [6.4, 66.2, -2.45, 3.5, 68.5]]) {
		const car = addInterceptor(game, x, z, heading)
		const officer = deployOfficer(game, car, footX, footZ)
		officer.fire = 0
		poseOfficer(game, officer, STEP)
	}
	player.weapon = 'shotgun'
	const aim = {...NEUTRAL, aim: true}
	game.camera.update(player, aim, 0, true)
	updateCombat(game, {...aim, attack: true}, STEP)
	player.aim = true
	game.police.stars = Math.ceil(game.police.heat)
	game.career.standing[0] = 63
	game.speak('ROOK', 'Use the cruiser for cover. I’ll call the route.')
}

export function prepareShot(game, name) {
	const {menus, player, camera, cars, missions, career} = game
	menus.show('play')
	player.money = 12740
	player.rep = 2040
	if (name === 'chase') chase(game)
	if (name === 'street') street(game)
	if (name === 'atlas' || name === 'title') {
		career.standing = [88, 62, 76, 41, 24]
		game.activities.reset([0, 1, 2, 3])
		if (name === 'atlas') {
			missions.setChapter(5)
			Object.assign(career, {earned: 14580, stolen: 23, wanted: 5, distance: 70822, jumps: [0], events: ['race', 'delivery']})
			Object.assign(player, {x: 128, z: 101, heading: .9})
			menus.show('pause', 'Map')
		} else {
			for (const [slot, chapter, cash, seconds] of [[0, 5, 12740, 8048], [1, 2, 2460, 2790], [2, 7, 19820, 13180]]) {
				missions.setChapter(chapter)
				player.money = cash
				career.seconds = seconds
				game.saves.save(slot, game)
			}
			game.reset()
			menus.show('title')
		}
	}
	game.clock = .46
	if (!player.car) animateCharacter(player, game.clock, 0)
	camera.update(player, {...NEUTRAL, aim: name === 'street'}, 0, true)
	for (const car of cars) syncVehicle(car, game.clock)
}
