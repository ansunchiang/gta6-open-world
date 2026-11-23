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
const move = (actor, x, z, heading) => Object.assign(actor, {x, z, heading})

function begin(game, chapter, {x, z}) {
	game.missions.setChapter(chapter)
	move(game.player, x - 2.1, z + 3, 0)
	game.interact()
	game.police.cooldown = game.police.blockDelay = 8
}

function wreck(game, x, z, heading, color) {
	const car = spawnVehicle(game.scene, 'van', color, x, z, heading, 'parked')
	car.health = 0
	game.cars.push(car)
	for (let frame = 0; frame < 46; frame++) updateVehicleDamage(game, STEP)
}

function chase(game) {
	const {player, police, scene, effects} = game
	begin(game, 5, PLACES.race)
	const car = game.cars.find(ride => ride.type === 'tide')
	move(car, 179.6, 95.5, -.035)
	enterVehicle(game, car, false)
	game.simulate(NEUTRAL, STEP)
	Object.assign(car, {speed: 30.5, health: 74})
	Object.assign(player, {weapon: 'smg', armed: true, health: 83, armor: 64})
	player.loadout.smg.rounds = 16
	player.onCrime(5)
	Object.assign(police, {stars: 5, contact: true})
	for (const [x, z, heading, tactic] of [
		[175, 98, .24, 'RAMMING'], [184, 97, -.22, 'FLANKING'], [174, 86, .12, 'CLOSING IN'],
	]) {
		addInterceptor(game, x, z, heading).tactic = tactic
	}
	deployRoadblock(game, addInterceptor, {x: 180, z: 77}, 0)
	wreck(game, 184.5, 83.5, -1.04, '#745953')
	effects.sparks(player.x - 1.1, .32, player.z + 1.4, 26)
	effects.update(.14)
	const air = police.air = spawnHelicopter(scene, player.x + 5.5, player.z - 20, 10.6)
	air.visible = true
	poseHelicopter(air, player, .46, .95)
	game.speak('DEX RILL', 'Take the gap. I’ll meet you at the beacon.')
	game.career.standing[2] = 82
	game.station = 1
	game.notice = null
}

function street(game) {
	const {player, scene} = game
	begin(game, 0, PLACES.garage)
	move(player, -.8, 85.5, -.12)
	Object.assign(player, {health: 78, armor: 59})
	for (const [x, z, color, flee] of [[7, 79, '#ffc074', 1.8], [-7.8, 74, '#7fcebe', -1.3], [-6.3, 80, '#f5abc4', -2.3]]) {
		const person = spawnPerson(scene, x, z, color, 2, 'civilian', flee)
		game.people.push(Object.assign(person, {panic: 5, flee}))
	}
	player.onCrime(2.4)
	wreck(game, 4.4, 75.2, -.93, '#276c78')
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
	game.timeOfDay = 1196
	game.police.stars = Math.ceil(game.police.heat)
	game.career.standing[0] = 63
	game.speak('ROOK', 'Use the cruiser for cover. I’ll call the route.')
}

export function prepareShot(game, name) {
	const {menus, player, camera, cars, missions, career, activities, saves} = game
	menus.show('play')
	player.money = 12740
	player.rep = 2040
	if (name === 'chase') chase(game)
	if (name === 'street') street(game)
	if (name === 'atlas' || name === 'title') {
		career.standing = [88, 62, 76, 41, 24]
		activities.reset([0, 1, 2, 3])
		if (name === 'atlas') {
			missions.setChapter(5)
			Object.assign(career, {earned: 14580, stolen: 23, wanted: 5, distance: 70822, jumps: [0], events: ['race', 'delivery']})
			move(player, 128, 101, .9)
			menus.show('pause', 'Map')
		} else {
			for (const [slot, chapter, cash, seconds] of [[0, 5, 12740, 8048], [1, 2, 2460, 2790], [2, 7, 19820, 13180]]) {
				missions.setChapter(chapter)
				player.money = cash
				career.seconds = seconds
				saves.save(slot, game)
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
