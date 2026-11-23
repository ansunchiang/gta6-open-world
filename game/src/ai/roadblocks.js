import {closestStreet, GRID} from '../world/cityLayout.js'
import {distance, offset} from '../render/geometry.js'

export function deployRoadblock(game, add, point, heading) {
	const {city, cars} = game
	let count = 0
	for (const side of [-1, 1]) {
		const spot = offset(point, 0, side * 3.7, heading)
		if (city.obstacle(spot.x, spot.z, 2) || cars.some(car => distance(car, spot) < 3)) continue
		Object.assign(add(game, spot.x, spot.z, heading + side * 1.12), {barrier: true, speed: 0, tactic: 'ROADBLOCK'})
		count++
	}
	return count
}

export function planRoadblock(game, add, dt) {
	const {police, player: {car}} = game
	police.blockDelay -= dt
	if (police.stars < 3 || !car || !police.contact || police.blockDelay > 0 || Math.abs(car.speed) < 7) return
	const sine = Math.sin(car.heading)
	const across = Math.abs(sine) > .707
	const axis = across ? car.x : car.z
	const lane = across ? car.z : car.x
	const center = closestStreet(lane)
	if (Math.abs(lane - center) > 8) return
	const direction = Math.sign((across ? sine : -Math.cos(car.heading)) * car.speed)
	const ordered = direction > 0 ? GRID : GRID.toReversed()
	const crossing = ordered.find(street => {
		const lead = (street - axis) * direction
		return lead > 26 && lead < 81
	})
	if (crossing === undefined) return
	const point = across ? {x: crossing, z: center} : {x: center, z: crossing}
	if (deployRoadblock(game, add, point, across ? Math.PI / 2 : 0)) police.blockDelay = 24
}
