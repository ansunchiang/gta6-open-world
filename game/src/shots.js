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
import {PLACES} from 'city-layout'
import {NEUTRAL} from './world/simulation.js'

const STEP = 1 / 60
const move = (actor, x, z, heading) => Object.assign(actor, {x, z, heading})

function begin(game, chapter, {x, z}) {
	game.missions.setChapter(chapter)
	move(game.player, x - 2.1, z + 3, 0)
	game.interact()
}

function park(game, ...spec) {
	const car = spawnVehicle(game.scene, ...spec, 'parked')
	game.cars.push(car)
	return car
}

function burn(game, car, frames) {
	car.health = 0
	for (let i = 0; i < frames; i++) updateVehicleDamage(game, STEP)
}

function chase(game) {
	const {player, police, scene, effects} = game
	begin(game, 5, PLACES.race)
	const car = park(game, 'tide', '#fa562a', 179.6, 95.5, -.035)
	enterVehicle(game, car, false)
	game.simulate(NEUTRAL, STEP)
	Object.assign(car, {speed: 30.5, health: 74})
	Object.assign(player, {weapon: 'smg', health: 83, armor: 64})
	player.loadout.smg.rounds = 16
	player.onCrime(5)
	Object.assign(police, {stars: 5, contact: true, cooldown: 8, blockDelay: 8})
	for (const [x, z, heading, tactic] of [[-4.7,2.1,.24,'RAMMING'], [4.7,1.8,-.22,'FLANKING'], [-5.3,-9,.12,'CLOSING IN']]) {
		addInterceptor(game, player.x + x, player.z + z, heading).tactic = tactic
	}
	deployRoadblock(game, addInterceptor, {x: 180, z: 77}, 0)
	burn(game, park(game, 'van', '#745953', 184.5, 83.5, -1.04), 49)
	effects.sparks(player.x - 1.1, .32, player.z + 1.4, 26)
	effects.update(.14)
	const air = police.air = spawnHelicopter(scene, player.x + 5.5, player.z - 20, 10.6)
	air.visible = true
	poseHelicopter(air, player, .46, .95)
	game.clock = .46
	game.speak('DEX RILL', 'Take the gap. I’ll meet you at the beacon.')
	game.career.standing[2] = 82
	game.station = 1
	game.notice = null
}

function street(game) {
	const {player, police, scene} = game
	begin(game, 0, PLACES.garage)
	move(player, -.8, 85.5, -.12)
	Object.assign(player, {health: 78, armor: 59})
	for (const [x, z, color, flee] of [[7,79,'#ffc074',1.8], [-7.8,74,'#7fcebe',-1.3], [-6.3,80,'#f5abc4',-2.3]]) {
		game.people.push(Object.assign(spawnPerson(scene, x, z, color, 2, 'civilian', flee), {panic: 5, flee}))
	}
	player.onCrime(2.4)
	police.cooldown = 5
	burn(game, park(game, 'van', '#276c78', 4.4, 75.2, -.93), 44)
	for (const [x, z, heading, footX, footZ] of [[-2.1,69.2,2.89,-4.1,72.3], [6.4,66.2,-2.45,3.5,68.5]]) {
		const car = addInterceptor(game, x, z, heading)
		const officer = deployOfficer(game, car, footX, footZ)
		officer.fire = 0
		poseOfficer(game, officer, STEP)
	}
	for (let i = 0; i < 3; i++) game.simulate(NEUTRAL, STEP)
	player.weapon = 'shotgun'
	const aim = {...NEUTRAL, aim: true}
	game.camera.update(player, aim, 0, true)
	updateCombat(game, {...aim, attack: true}, STEP)
	player.aim = true
	game.timeOfDay = 1196
	game.career.standing[0] = 63
	game.speak('ROOK', 'Use the cruiser for cover. I’ll call the route.')
}

const careers = [
	[5, 12740, 8048, [88,62,76,41,24], 4],
	[2, 2460, 2790, [43,12,49,0,16], 1],
	[7, 19820, 13180, [100,89,88,73,62], 6],
]

function previewCareer({missions, player, activities, career}, [chapter, money, seconds, standing, packages]) {
	missions.setChapter(chapter)
	player.money = money
	activities.reset(Array.from({length: packages}, (_, i) => i))
	const advanced = chapter > 2
	Object.assign(career, {seconds, earned: money + 1840, stolen: chapter * 4 + 3, wanted: advanced ? 5 : 2,
		distance: seconds * 8.8, standing, jumps: advanced ? [0] : [], events: advanced ? ['race', 'delivery'] : []})
}

export function prepareShot(game, name) {
	const {menus, player, camera, cars} = game
	menus.show('play')
	player.money = 12740
	player.rep = 2040
	if (name === 'chase') chase(game)
	if (name === 'street') street(game)
	if (name === 'atlas') {
		previewCareer(game, careers[0])
		move(player, 128, 101, .9)
		menus.show('pause', 'Map')
	}
	if (name === 'title') {
		for (const [i, career] of careers.entries()) {
			previewCareer(game, career)
			game.saves.save(i, game)
		}
		game.reset()
		menus.show('title')
	}
	if (!player.car) animateCharacter(player, game.clock, 0)
	camera.update(player, {...NEUTRAL, aim: name === 'street'}, 0, true)
	for (const car of cars) syncVehicle(car, game.clock)
}
