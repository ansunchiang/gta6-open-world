import {T, GeometryBatch, distance} from 'geometry'
import {earnCash} from './careerStats.js'

const ramps = [{x: 177, z: -142}, {x: -183, z: -144}]

export function buildRamps(scene) {
	const batch = new GeometryBatch()
	const deck = new T.BoxGeometry()
	for (const {x, z} of ramps) {
		batch.add(deck, '#d4934f', x,.45,z + 2, 3.5,.29,5.8, .21)
		batch.add(deck, '#fff2ab', x,.67,z + .6, 3.5,.3,.36, .21)
	}
	batch.make(scene)
}

export function updateJump(game, car, dt) {
	if (car.type === 'boat') return
	if (car.jump) {
		const time = car.jump.time += dt
		car.lift = Math.max(0, .97 + time * (5 - 5.4 * time))
		if (car.lift) return
		const {index} = car.jump
		car.jump = null
		const {jumps} = game.career
		if (jumps.includes(index) || car.health <= 0) return
		jumps.push(index)
		earnCash(game, 150, 12)
		game.toast('$150 · Clean landing', 'STUNT JUMP')
		game.audio.effect('success')
		game.save()
	} else if (car.speed > 14 && Math.cos(car.heading) > .87) {
		const index = ramps.findIndex(point => distance(point, car) < 1.5)
		if (index >= 0) car.jump = {index, time: 0}
	}
}
