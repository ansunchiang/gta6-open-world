import {createCharacter, animateCharacter} from '../player/characterModel.js'
import {advance, angle, bearing, distance, turn} from 'geometry'

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
			const start = corners[side]
			const next = corners[(side + 1) % 4]
			const p = random()
			const person = spawnPerson(scene, start.x + (next.x - start.x) * p, start.z + (next.z - start.z) * p,
				outfits[(block + i * 3) % outfits.length], (i + block) % 5, 'civilian')
			person.route = corners
			person.routeIndex = (side + 1) % 4
			person.pace = 1.28 + random() * .68
			people.push(person)
		}
	})
	for (let i = 0; i < 19; i++) {
		const x = i % 2 === 0 ? 191.6 : 197
		const z = -153 + i * 17
		const person = spawnPerson(scene, x, z, outfits[i % outfits.length], i % 5, 'civilian')
		person.route = [{x, z: -179}, {x, z: 179}]
		person.routeIndex = i % 2
		person.pace = 1.26 + random() * .57
		people.push(person)
	}
	return people
}

export function disturbCrowd(people, x, z, radius) {
	for (const person of people) {
		if (Math.hypot(person.x - x, person.z - z) < radius) {
			person.panic = 4.4
			person.flee = angle(person.x - x, person.z - z)
		}
	}
}

export function updatePedestrians(people, player, city, dt, clock) {
	for (const person of people) {
		const nearby = distance(person, player)
		person.model.node.visible = nearby < 128
		if (person.down > 0) {
			person.down -= dt
			if (person.down <= 0) person.health = 100
			if (person.model.node.visible) animateCharacter(person, clock, 0)
			continue
		}
		let pace = person.pace ?? 0
		const speed = Math.abs(player.car?.speed ?? 0)
		if (speed > 4 && nearby < 5.5 && !person.panic) {
			person.panic = 2.8
			person.flee = bearing(player, person)
		}
		if (person.panic > 0) {
			person.panic = Math.max(0, person.panic - dt)
			person.heading += turn(person.heading, person.flee) * Math.min(1, dt * 6)
			pace = 4.3
		} else if (person.route) {
			const target = person.route[person.routeIndex]
			if (distance(target, person) < .47) person.routeIndex = (person.routeIndex + 1) % person.route.length
			person.heading += turn(person.heading, bearing(person, person.route[person.routeIndex])) * Math.min(1, dt * 8)
		}
		if (pace > 0 && advance(city, person, pace * dt, .23) && person.panic) person.flee += 1.1
		if (speed > 7 && nearby < 1.7 && !person.down) {
			person.down = 8
			player.onCrime(.82)
		}
		if (person.model.node.visible) animateCharacter(person, clock, pace)
	}
}
