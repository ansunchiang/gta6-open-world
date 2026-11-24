import {createCharacter, animateCharacter} from '../player/characterModel.js'
import {advance, bearing, distance, turn} from '../render/geometry.js'
import {reactToAlarm, watchTraffic} from './crowdReaction.js'

const outfits = ['#db836b', '#ecbc79', '#609b97', '#e3d7af', '#ae8196', '#8197b4', '#aa975e', '#bd6862']

export function spawnPerson(scene, x, z, outfit, tone, style, heading = 0) {
	const person = {x, z, heading, model: createCharacter(scene, outfit, tone, style), health: 100, down: 0, panic: 0, phase: x * .43}
	animateCharacter(person, 0, 0, 0)
	return person
}

export function createPedestrians(scene, city, random) {
	const people = []
	city.sidewalks.forEach(({l, r, t, b}, block) => {
		const corners = [{x: l, z: t}, {x: r, z: t}, {x: r, z: b}, {x: l, z: b}]
		for (let i = 0; i < 3; i++) {
			const side = (i + block) % 4
			const routeIndex = (side + 1) % 4
			const start = corners[side], next = corners[routeIndex]
			const p = random()
			const person = spawnPerson(scene, start.x + (next.x - start.x) * p, start.z + (next.z - start.z) * p,
				outfits[(block + i * 3) % outfits.length], (i + block) % 5, 'civilian')
			people.push(Object.assign(person, {route: corners, routeIndex, pace: 1.28 + random() * .68}))
		}
	})
	for (let i = 0; i < 19; i++) {
		const x = i % 2 === 0 ? 191.6 : 197
		const z = -153 + i * 17
		const person = spawnPerson(scene, x, z, outfits[i % outfits.length], i % 5, 'civilian')
		people.push(Object.assign(person, {route: [{x, z: -179}, {x, z: 179}], routeIndex: i % 2, pace: 1.26 + random() * .57}))
	}
	return people
}

export function updatePedestrians(people, player, city, dt, clock) {
	const {car} = player
	const danger = car && Math.abs(car.speed) > 7 && !(car.lift > .9)
	for (const person of people) {
		const range = distance(person, player)
		const drawn = person.model.node.visible = range < 128
		if (person.down > 0) {
			person.down = Math.max(0, person.down - dt)
			if (!person.down) person.health = 100
			if (drawn) animateCharacter(person, clock, 0)
			continue
		}
		if (range < 28) watchTraffic(person, car)
		let pace = reactToAlarm(person, city, dt)
		if (!pace && person.route) {
			const {route} = person
			if (distance(person, route[person.routeIndex]) < .47) person.routeIndex = (person.routeIndex + 1) % route.length
			const heading = bearing(person, route[person.routeIndex])
			person.heading += turn(person.heading, heading) * Math.min(1, dt * 8)
			pace = person.pace
		}
		if (pace && advance(city, person, pace * dt, .23) && person.panic) person.flee += 1.1
		if (danger && range < 1.35 && distance(person, player) < 1.45) {
			person.down = 8
			person.alarm = null
			player.onCrime(.82)
		}
		if (drawn) animateCharacter(person, clock, pace)
	}
}
