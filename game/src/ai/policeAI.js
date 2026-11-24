import {advance, bearing, clamp, distance, offset} from '../render/geometry.js'
import {closestStreet} from '../world/cityLayout.js'
import {guideVehicle, spawnVehicle, syncVehicle} from '../vehicles/vehiclePhysics.js'
import {planRoadblock} from './roadblocks.js'
import {removeHelicopter, updateHelicopter} from './helicopterAI.js'
import {updateOfficers} from './patrolOfficers.js'
import {createSearch, recordPosition, refreshSearch, stepSearch, streetPost} from './pursuitSearch.js'

export function createPolice() {
	return {
		heat: 0, stars: 0, quiet: 0, unseen: 0, cooldown: 0, contact: false,
		units: [], officers: [], air: null, sequence: 0, blockDelay: 0, blackout: 0,
		search: createSearch(), lastKnown: null,
	}
}

export function reportCrime(police, severity, actor) {
	police.heat = clamp(police.heat + severity, 1, 5)
	police.quiet = police.unseen = 0
	recordPosition(police, actor)
	refreshSearch(police)
}

export function lineClear(city, from, to, height = .8, radius = .34) {
	const steps = Math.ceil(distance(from, to) / .9)
	const dx = (to.x - from.x) / steps, dz = (to.z - from.z) / steps
	for (let i = 1; i < steps; i++) {
		if (city.obstacle(from.x + dx * i, from.z + dz * i, radius, height)) return false
	}
	return true
}

export function addInterceptor(game, x, z, heading) {
	const {police} = game
	const car = spawnVehicle(game.scene, 'patrol', '#27394c', x, z, heading, 'police')
	const number = police.sequence++
	const callsign = callsigns[number % callsigns.length] + '-' + (12 + number)
	Object.assign(car, {speed: 8.7, driver: true, fire: 1 + police.units.length * .38,
		recover: 0, flank: !!(number % 2), callsign, tactic: 'PATROL'})
	game.cars.push(car)
	police.units.push(car)
	return car
}

const callsigns = ['GULL', 'REEF', 'TIDE', 'PIER', 'BUOY', 'JETTY']

export function dispatchRoster({units, air}, player) {
	const row = (actor, name, tactic) => ({name, tactic, range: Math.round(distance(actor, player))})
	const ground = units.map(unit => row(unit, unit.callsign, unit.tactic)).sort((a, b) => a.range - b.range)
	if (air) ground.unshift(row(air, 'KITE-01', air.visible ? 'SPOTLIGHT' : 'AIR SWEEP'))
	return ground.slice(0, 6)
}

function dispatch(game, target) {
	const {city, cars, player} = game
	for (const rotation of [2.65, 3.66, 1.57, -1.57, 0]) {
		const point = streetPost(offset(target, 48, 0, target.heading + rotation), 2.7)
		if (distance(player, point) < 27 || city.obstacle(point.x, point.z, 1.4)) continue
		if (cars.some(car => distance(car, point) < 4)) continue
		return addInterceptor(game, point.x, point.z, bearing(point, target))
	}
}

function routeTo(car, goal, city) {
	if (lineClear(city, car, goal, .1, 1.1)) return goal
	const x = closestStreet(car.x), z = closestStreet(car.z)
	const dx = Math.abs(x - car.x), dz = Math.abs(z - car.z)
	const nextX = closestStreet(goal.x), nextZ = closestStreet(goal.z)
	if (dx < 4 && dz < 4) return x === nextX ? {x, z: nextZ} : {x: nextX, z}
	return dx < dz ? {x, z: nextZ} : {x: nextX, z}
}

export function clearPolice(game) {
	const {police, cars} = game
	removeHelicopter(police)
	for (const officer of police.officers) officer.model.node.removeFromParent()
	for (const car of police.units) {
		if (car.claimed) continue
		car.node.removeFromParent()
		const index = cars.indexOf(car)
		if (index !== -1) cars.splice(index, 1)
	}
	Object.assign(police, createPolice())
}

function driveUnit(game, {car, range, visible}, index, dt) {
	const {player, police, city, clock} = game
	const ride = player.car
	const report = police.lastKnown
	const {sweeping, posts} = police.search
	const flanking = ride && car.flank && range > 7 && !sweeping
	const ramming = ride && visible && range < 9
	if (car.barrier && (range > 65 || sweeping)) car.barrier = false
	car.tactic = car.barrier ? 'ROADBLOCK' : sweeping ? 'SWEEPING' :
		ramming ? 'RAMMING' : flanking ? 'FLANKING' : 'CLOSING IN'
	const lead = ride ? clamp(report.speed * .52, -5, 14) : 0
	const goal = sweeping ? posts[index % posts.length] : offset(report, lead, flanking ? 3.8 : 0)
	const dismounted = police.officers.some(officer => officer.car === car && officer.aim)
	const hold = car.barrier || dismounted || !ride && visible && range < 3.8
	if (hold || sweeping && distance(car, goal) < 3) {
		car.speed *= Math.exp(-dt * 8)
	} else if (car.recover > 0) {
		car.recover = Math.max(0, car.recover - dt)
		car.heading += (car.flank ? 2.1 : -2.1) * dt
		car.speed = -4
		advance(city, car, car.speed * dt, 1, true)
	} else {
		const speed = car.burstUntil > clock ? 6 : sweeping ? 12 : 17 + police.stars * 2
		if (guideVehicle(car, routeTo(car, goal, city), speed, dt, city)) car.recover = .55
	}
	if (ramming && range < 3.3 && car.impact <= 0) {
		ride.health -= 9
		ride.impact = car.impact = .64
		ride.heading += car.flank ? .22 : -.15
		game.effects.sparks(player.x, .7, player.z, 10)
	}
	car.impact = Math.max(0, car.impact - dt)
	if (!dismounted && visible && range < (ride ? 11 : 18) && (car.fire -= dt) <= 0) {
		car.fire = 2.8
		game.effects.flash(car.x, 1.37, car.z, bearing(car, player), range)
		game.audio.effect('shot')
		if (ride) ride.health -= 4
		game.damage(ride ? 3 : 7)
	}
	syncVehicle(car, clock)
}

export function updatePolice(game, dt) {
	const {police, player, city, clock} = game
	police.stars = clamp(Math.ceil(police.heat - .001), 0, 5)
	if (!police.stars) return
	police.units = police.units.filter(car => car.mode === 'police' && car.health > 0)
	police.quiet += dt
	police.cooldown -= dt
	const desired = Math.min(5, police.stars + 1)
	const online = police.blackout <= clock
	if (online && !police.search.sweeping && police.units.length < desired && police.cooldown <= 0) {
		dispatch(game, police.lastKnown)
		police.cooldown = 3
	}
	const tracking = police.units.map(car => {
		const range = distance(player, car)
		const visible = online && range < 41 && lineClear(city, car, player, 1.25)
		return {car, range, visible}
	})
	const seen = tracking.some(unit => unit.visible)
	if (seen) recordPosition(police, player)
	const airContact = updateHelicopter(game, dt)
	updateOfficers(game, tracking, dt)
	police.contact = online && (airContact || seen || police.officers.some(officer => officer.aim))
	stepSearch(police, player, dt)
	planRoadblock(game, addInterceptor, dt)
	tracking.forEach((unit, index) => driveUnit(game, unit, index, dt))
	if (police.heat <= 0) {
		clearPolice(game)
		player.rep += 22
		game.toast('Signal lost', 'PURSUIT EVADED')
		game.audio.effect('success')
	}
}
