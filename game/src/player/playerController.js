import {createCharacter, animateCharacter} from './characterModel.js'
import {driveVehicle} from '../vehicles/vehiclePhysics.js'
import {VEHICLE_TYPES} from '../vehicles/vehicleModel.js'
import {spawnPerson} from '../ai/pedestrianAI.js'
import {angle, bearing, blend, distance, offset, turn} from 'geometry'
import {slips} from '../world/marina.js'
import {vehicleRank} from '../progression/garageUpgrades.js'
import {respectRank} from '../progression/respect.js'
import {updateJump} from '../progression/stuntJumps.js'

export function createPlayer(scene) {
	return {
		x: 8.1, z: 91, heading: 0,
		model: createCharacter(scene, '#d86958', 0, 'player'),
	}
}

export function nearestVehicle(player, vehicles) {
	let nearest = null
	let score = 4.25
	for (const car of vehicles) {
		if (car.health <= 0 || car === player.car || car.mode === 'held' || Math.abs(car.speed) > 9.7) continue
		const dist = distance(player, car)
		if (dist < score) {
			nearest = car
			score = dist
		}
	}
	return nearest
}

export function enterVehicle(game, car, animate = true) {
	const {player} = game
	const {type, heading} = car
	const rank = vehicleRank[type]
	if (rank > respectRank(player.rep).level) {
		game.toast('Unlock at rank ' + rank, 'VEHICLE LOCKED')
		return
	}
	if (car.driver) {
		const {x, z} = offset(car, 0, -1.48)
		const driver = spawnPerson(game.scene, x, z, '#d9966e', 1, 'civilian', heading - 1.6)
		Object.assign(driver, {panic: 4.6, flee: heading - Math.PI / 2, expires: game.clock + 26})
		game.people.push(driver)
	}
	const stolen = !car.claimed
	car.driver = false
	car.claimed = true
	car.mode = animate ? 'held' : 'player'
	car.speed = 0
	if (animate) player.theft = {car, time: .55}
	else {
		player.car = car
		followVehicle(player, car)
	}
	game.audio.effect('door')
	if (stolen) {
		if (type !== 'tide' && type !== 'boat') {
			game.career.stolen++
			player.onCrime(type === 'patrol' ? 1.95 : 1.04)
		}
		game.toast(VEHICLE_TYPES[type].name, 'VEHICLE TAKEN')
	}
}

export function exitVehicle(game, force = false) {
	const {player, city} = game
	const car = player.car
	if (!car) return false
	if (!force && (Math.abs(car.speed) > 10 || car.jump)) {
		game.toast('Slow down to exit', 'VEHICLE')
		return false
	}
	for (const side of [-1, 1, 0]) {
		const heading = car.heading + (side ? side * Math.PI / 2 : Math.PI)
		const {x, z} = offset(car, 1.8, 0, heading)
		if (city.obstacle(x, z, .45)) continue
		player.x = x
		player.z = z
		break
	}
	if (car.type === 'boat') {
		const pier = slips.find(z => Math.abs(z - car.z) < 7 && car.x < 248)
		if (pier === undefined && car.x > 229 && !force) {
			game.toast('Moor at the pier to exit', 'MARINA')
			Object.assign(player, {x: car.x, z: car.z})
			return false
		}
		Object.assign(player, {x: pier === undefined ? 220 : Math.min(246, car.x), z: pier ?? car.z})
	}
	player.heading = car.heading
	player.car = null
	car.mode = 'parked'
	car.speed = 0
	car.jump = null
	car.lift = 0
	player.speed = 0
	player.model.node.visible = true
	game.audio.effect('door')
	return true
}

function followVehicle(player, {x, z, heading}) {
	Object.assign(player, {x, z, heading})
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
	if (theft) {
		theft.time -= dt
		const car = theft.car
		car.doorSwing = Math.sin(Math.max(0, theft.time) / .55 * Math.PI) * 1.22
		city.move(player, blend(player.x, car.x, dt * 9), blend(player.z, car.z, dt * 9), .27)
		player.heading = bearing(player, car)
		player.swing = .49
		if (theft.time <= 0) {
			player.car = car
			car.mode = 'player'
			car.doorSwing = 0
			player.theft = null
		}
		animateCharacter(player, clock, 2.1)
		return
	}
	const {throttle, steer, aim, sprint} = controls
	const magnitude = Math.hypot(throttle, steer)
	const velocity = aim ? 2.45 : sprint ? 7.75 : 4.65
	player.aim = player.armed && (aim || player.swing > .17)
	const yaw = camera.yaw
	const sine = Math.sin(yaw), cosine = Math.cos(yaw)
	const x = sine * throttle + cosine * steer, z = sine * steer - cosine * throttle
	const next = player.aim ? yaw : magnitude ? angle(x, z) : player.heading
	player.heading += turn(player.heading, next) * Math.min(1, 15 * dt)
	player.speed = blend(player.speed, magnitude ? velocity : 0, dt * 11)
	if (magnitude) city.move(player, player.x + x / magnitude * player.speed * dt, player.z + z / magnitude * player.speed * dt, .32)
	animateCharacter(player, clock, player.speed)
}
