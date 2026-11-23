import {advance, bearing, clamp, distance, offset} from 'geometry'
import {closestStreet} from 'city-layout'
import {guideVehicle, spawnVehicle, syncVehicle} from '../vehicles/vehiclePhysics.js'
import {registerUnit} from './dispatchRoster.js'
import {planRoadblock} from './roadblocks.js'
import {removeHelicopter, updateHelicopter} from './helicopterAI.js'
import {updateOfficers} from './patrolOfficers.js'

export function createPolice() {
	return { heat: 0, stars: 0, quiet: 0, unseen: 0, cooldown: 0, contact: false,
		escapeTime: null, lastKnown: null, units: [], officers: [], sequence: 0, air: null, blockDelay: 0, blackout: 0 }
}

const positionReport = ({x, z, heading, car}) => ({x, z, heading, speed: car?.speed ?? 0})

export function reportCrime(state, severity, actor) {
	Object.assign(state, { heat: clamp(state.heat + severity, 1, 5), quiet: 0, unseen: 0,
		escapeTime: null, lastKnown: positionReport(actor) })
}

export function lineClear(city, from, to, height = .8, radius = .34) {
	const steps = Math.ceil(distance(from, to) / .9)
	const dx = to.x - from.x, dz = to.z - from.z
	for (let i = 1; i < steps; i++) {
		const t = i / steps
		if (city.obstacle(from.x + dx * t, from.z + dz * t, radius, height)) return false
	}
	return true
}

export function addInterceptor(game, x, z, heading) {
	const {police} = game
	const car = spawnVehicle(game.scene, 'patrol', '#27394c', x, z, heading, 'police')
	Object.assign(car, {speed: 8.7, driver: true, fire: 1 + police.units.length * .38, recover: 0, flank: police.sequence % 2 === 1})
	registerUnit(police, car)
	game.cars.push(car)
	police.units.push(car)
	return car
}

function dispatch(game, target) {
	const {city, cars, player} = game
	for (const turn of [2.65, 3.66, 1.57, -1.57, 0]) {
		const next = offset(target, 48, 0, target.heading + turn)
		const x = clamp(next.x, -184, 184), z = clamp(next.z, -184, 184)
		const sx = closestStreet(x), sz = closestStreet(z)
		const point = Math.abs(sx - x) < Math.abs(sz - z) ? {x: sx + 2.7, z} : {x, z: sz + 2.7}
		if (city.obstacle(point.x, point.z, 1.4) || distance(player, point) < 27 ||
				cars.some(car => distance(car, point) < 4)) continue
		addInterceptor(game, point.x, point.z, bearing(point, target))
		return
	}
}

function routeTo(car, goal, city) {
	if (lineClear(city, car, goal, .1, 1.1)) return goal
	const x = closestStreet(car.x), z = closestStreet(car.z)
	const gx = closestStreet(goal.x), gz = closestStreet(goal.z)
	if (Math.abs(x - car.x) < Math.abs(z - car.z)) {
		return Math.abs(car.z - z) < 4 && x !== gx ? {x: gx, z} : {x, z: gz}
	}
	return Math.abs(car.x - x) < 4 && z !== gz ? {x, z: gz} : {x: gx, z}
}

export function clearPolice(game) {
	const {police, player, cars} = game
	removeHelicopter(police)
	for (const {model} of police.officers) model.node.removeFromParent()
	for (const car of police.units) {
		if (car === player.car || car === player.theft?.car || car.claimed) continue
		car.node.removeFromParent()
		const index = cars.indexOf(car)
		if (index >= 0) cars.splice(index, 1)
	}
	Object.assign(police, createPolice())
}

function driveUnit(game, {car, range, visible}, index, searching, dt) {
	const {player, police, city, clock, effects, audio} = game
	const ride = player.car
	const report = police.lastKnown
	const flank = ride && car.flank && range > 7 && !searching
	const ram = ride && visible && range < 9
	if (car.barrier && (range > 65 || searching)) car.barrier = false
	car.tactic = car.barrier ? 'ROADBLOCK' : searching ? 'SWEEPING' : ram ? 'RAMMING' :
		flank ? 'FLANKING' : 'CLOSING IN'
	const lead = ride && !searching ? clamp(report.speed * .52, -5, 14) : 0
	const sweep = Math.floor(police.unseen / 4) + index
	const heading = searching ? sweep * Math.PI / 2 : report.heading
	const goal = offset(report, searching ? 16 + index * 4 : lead, flank ? 3.8 : 0, heading)
	const dismounted = !ride && visible && police.officers.some(officer => officer.car === car && !officer.down)
	if (car.barrier || dismounted || !ride && visible && range < 3.8 || searching && distance(car, goal) < 3) car.speed *= Math.exp(-dt * 8)
	else if (car.recover > 0) {
		car.recover -= dt
		car.heading += dt * (car.flank ? 2.1 : -2.1)
		car.speed = -4
		advance(city, car, car.speed * dt, 1, true)
	} else {
		const speed = car.burstUntil > clock ? 6 : searching ? 12 : 17 + police.stars * 2
		if (guideVehicle(car, routeTo(car, goal, city), speed, dt, city)) car.recover = .55
	}
	if (ram && range < 3.3 && car.impact <= 0) {
		ride.health -= 9
		ride.impact = car.impact = .64
		ride.heading += car.flank ? .22 : -.15
		effects.sparks(player.x, .7, player.z, 10)
	}
	car.impact = Math.max(0, car.impact - dt)
	if (!dismounted && visible && range < (ride ? 11 : 18) && (car.fire -= dt) <= 0) {
		car.fire = 2.8
		effects.flash(car.x, 1.37, car.z, bearing(car, player), range)
		audio.effect('shot')
		if (ride) ride.health -= 4
		game.damage(ride ? 3 : 7)
	}
	syncVehicle(car, clock)
}

export function updatePolice(game, dt) {
	const {police, player, city} = game
	police.stars = clamp(Math.ceil(police.heat - .001), 0, 5)
	if (!police.stars) return
	police.units = police.units.filter(car => car.mode === 'police' && car.health > 0)
	police.quiet += dt
	police.cooldown -= dt
	const desired = Math.min(5, police.stars + 1)
	const signal = police.blackout <= game.clock
	if (signal && police.units.length < desired && police.cooldown <= 0 && police.unseen < 3.4) {
		dispatch(game, police.lastKnown)
		police.cooldown = 3
	}
	const tracking = police.units.map(car => {
		const range = distance(player, car)
		return {car, range, visible: signal && range < 41 && lineClear(city, car, player, 1.25)}
	})
	const seen = tracking.some(unit => unit.visible)
	if (seen) police.lastKnown = positionReport(player)
	police.contact = signal && (updateHelicopter(game, dt) || seen)
	if (police.contact) police.lastKnown = positionReport(player)
	police.unseen = police.contact ? 0 : police.unseen + dt
	const searching = police.unseen >= 3.4
	planRoadblock(game, addInterceptor, dt)
	updateOfficers(game, tracking, dt)
	tracking.forEach((unit, index) => driveUnit(game, unit, index, searching, dt))
	const delay = Math.max(0, 7 - police.quiet)
	if (searching && !delay) police.heat -= dt * .32
	police.escapeTime = searching ? delay + Math.max(0, police.heat) / .32 : null
	if (police.heat <= 0) {
		clearPolice(game)
		player.rep += 22
		game.toast('Signal lost', 'PURSUIT EVADED')
		game.audio.effect('success')
	}
}
