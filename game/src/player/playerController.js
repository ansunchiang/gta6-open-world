import {createCharacter, animateCharacter} from './characterModel.js'
import {driveVehicle} from '../vehicles/vehiclePhysics.js'
import {VEHICLE_TYPES} from '../vehicles/vehicleModel.js'
import {spawnPerson} from '../ai/pedestrianAI.js'
import {angle, bearing, blend, distance, offset, turn} from '../render/geometry.js'
import {slips} from '../world/marina.js'
import {vehicleRank} from '../progression/garageUpgrades.js'
import {respectRank} from '../progression/respect.js'
import {updateJump} from '../progression/stuntJumps.js'

export function createPlayer(scene) {
	return {model: createCharacter(scene, '#d86958', 0, 'player')}
}

export function nearestVehicle(player, vehicles) {
	let candidate = null, reach = 4.25
	for (const car of vehicles) {
		const unavailable = car === player.car || car.mode === 'held' || car.health <= 0
		if (unavailable || Math.abs(car.speed) > 9.7) continue
		const range = distance(player, car)
		if (range >= reach) continue
		candidate = car
		reach = range
	}
	return candidate
}

const ENTRY_SECONDS = .55

export function enterVehicle(game, car, animate = true) {
	const {player, scene, people, clock} = game
	const {type, heading} = car
	const rank = vehicleRank[type]
	if (rank > respectRank(player.rep).level) return game.toast('Unlock at rank ' + rank, 'VEHICLE LOCKED')
	if (car.driver) {
		const {x, z} = offset(car, 0, -1.48)
		const facing = heading - Math.PI / 2
		const driver = spawnPerson(scene, x, z, '#d9966e', 1, 'civilian', facing)
		Object.assign(driver, {panic: 4.6, flee: facing, expires: clock + 26})
		people.push(driver)
	}
	const stolen = !car.claimed
	car.driver = false
	car.claimed = true
	car.mode = animate ? 'held' : 'player'
	car.speed = 0
	if (animate) player.theft = {car, time: ENTRY_SECONDS}
	else seatPlayer(player, car)
	game.audio.effect('door')
	if (!stolen) return
	if (type !== 'tide' && type !== 'boat') {
		game.career.stolen++
		player.onCrime(type === 'patrol' ? 1.95 : 1.04)
	}
	game.toast(VEHICLE_TYPES[type].name, 'VEHICLE TAKEN')
}

function exitPoint(city, car, force) {
	if (car.type === 'boat') {
		const pier = slips.find(z => Math.abs(z - car.z) < 7 && car.x < 248)
		if (pier != null) return {x: Math.min(246, car.x), z: pier}
		if (car.x <= 229 || force) return {x: 220, z: car.z}
		return null
	}
	for (const turn of [-Math.PI / 2, Math.PI / 2, Math.PI, 0]) {
		const point = offset(car, 2.1, 0, car.heading + turn)
		if (!city.obstacle(point.x, point.z, .45)) return point
	}
	return force ? car : null
}

export function exitVehicle(game, force = false) {
	const {player, city} = game
	const {car} = player
	if (!car) return false
	const moving = Math.abs(car.speed) > 10 || car.jump
	const point = !moving || force ? exitPoint(city, car, force) : null
	if (!point) {
		const boat = car.type === 'boat'
		game.toast(moving ? 'Slow down to exit' :
			boat ? 'Moor at the pier to exit' : 'Leave room beside the car', boat ? 'MARINA' : 'VEHICLE')
		return false
	}
	player.x = point.x
	player.z = point.z
	Object.assign(player, {heading: car.heading, car: null, speed: 0})
	Object.assign(car, {mode: 'parked', speed: 0, jump: null, lift: 0})
	player.model.node.visible = true
	game.audio.effect('door')
	return true
}

const followVehicle = (player, {x, z, heading}) => Object.assign(player, {x, z, heading})

function seatPlayer(player, car) {
	player.car = car
	player.theft = null
	car.mode = 'player'
	car.doorSwing = 0
	followVehicle(player, car)
}

function stepEntry(player, city, clock, dt) {
	const entry = player.theft
	const {car} = entry
	entry.time = Math.max(0, entry.time - dt)
	car.doorSwing = Math.sin(entry.time / ENTRY_SECONDS * Math.PI) * 1.22
	const step = 1 - Math.exp(-dt * 9)
	city.move(player, blend(player.x, car.x, step), blend(player.z, car.z, step), .27)
	player.heading = bearing(player, car)
	player.swing = .49
	if (entry.time === 0) seatPlayer(player, car)
	else animateCharacter(player, clock, 2.1)
}

export function updatePlayer(game, controls, dt) {
	const {player, city, camera, effects, clock} = game
	const {car, theft, model} = player
	player.hurt = Math.max(0, player.hurt - dt)
	model.node.visible = !car
	if (car) {
		driveVehicle(car, controls, city, game.cars, dt, effects, game.upgrades, other => {
			if (other.type === 'patrol') player.onCrime(.58)
			else if (Math.abs(car.speed - other.speed) > 6) player.onCrime(.32)
			game.audio.effect('impact')
		})
		followVehicle(player, car)
		updateJump(game, car, dt)
		if (car.health <= 0) {
			effects.sparks(player.x, .9, player.z, 22)
			exitVehicle(game, true)
			game.damage(30)
			game.toast('Vehicle disabled', 'GET CLEAR')
		}
		return
	}
	if (theft) return stepEntry(player, city, clock, dt)
	const {throttle, steer, aim, sprint} = controls
	const input = Math.hypot(throttle, steer)
	const gait = aim ? 2.45 : sprint ? 7.75 : 4.65
	player.aim = player.armed && (aim || player.swing > .17)
	const {yaw} = camera
	const sin = Math.sin(yaw), cos = Math.cos(yaw)
	const dx = sin * throttle + cos * steer
	const dz = sin * steer - cos * throttle
	const facing = player.aim ? yaw : input ? angle(dx, dz) : player.heading
	player.heading += turn(player.heading, facing) * (1 - Math.exp(-15 * dt))
	player.speed = blend(player.speed, input ? gait : 0, 1 - Math.exp(-11 * dt))
	if (input) {
		const stride = player.speed * dt / input
		const blocked = city.move(player, player.x + dx * stride, player.z + dz * stride, .32)
		if (blocked) player.speed *= .85
	}
	animateCharacter(player, clock, player.speed)
}
