import {GRID} from 'city-layout'
import {angle, blend, distance} from 'geometry'
import {guideVehicle, spawnVehicle, syncVehicle} from '../vehicles/vehiclePhysics.js'
import {boats} from '../world/marina.js'

const colors = ['#a25452', '#d7b573', '#76a79b', '#b7cbd0', '#535b72', '#b7aba0', '#d58472', '#439dab']
const types = ['reed', 'volta', 'scooter', 'taxi', 'van']
function loop(left, right, top, bottom) {
	return [[left + 3.7, top + 3.7], [right - 3.7, top + 3.7],
		[right - 3.7, bottom - 3.7], [left + 3.7, bottom - 3.7]].map(([x, z]) => ({x, z}))
}
const avenueRoute = loop(0, 120, -180, 180)

function trafficCar(scene, route, start, ratio, type, color, pace) {
	const routeIndex = (start + 1) % route.length
	const from = route[start], to = route[routeIndex]
	const x = blend(from.x, to.x, ratio), z = blend(from.z, to.z, ratio)
	const car = spawnVehicle(scene, type, color, x, z, angle(to.x - x, to.z - z), 'traffic')
	return Object.assign(car, {route, routeIndex, pace, speed: pace * .8})
}

export function createTraffic(scene, random) {
	const cars = []
	for (let i = 0; i < 45; i++) {
		const lane = i % 7
		const route = lane === 0 ? avenueRoute :
			loop(GRID[(lane + 4) % 5], GRID[4 + lane % 3], GRID[lane % 3], GRID[4 + (lane + 1) % 3])
		const progress = random()
		const type = types[i % types.length]
		const color = type === 'taxi' ? '#edb956' : colors[i % colors.length]
		cars.push(trafficCar(scene, route, Math.floor(progress * 4), progress * 4 % 1, type, color, 6.5 + random() * 4))
	}
	const arrival = trafficCar(scene, avenueRoute, 3, .243, 'volta', '#e8744e', 5.6)
	arrival.speed = 0
	arrival.wait = 23
	arrival.driver = true
	cars.unshift(arrival)
	for (const [index, point] of boats.entries()) cars.push(spawnVehicle(scene, 'boat', ['#fc9a69','#6fc5ba','#9a91cf'][index], point.x, point.z, Math.PI / 2, 'parked'))
	for (const [x, z, type, color, heading = 0] of [
		[6.4,93.8,'volta','#59a19f'], [6.4,76,'reed','#a5a3c6'], [-6.3,70,'taxi','#e6b367',Math.PI],
		[186,-13,'van','#bdc4ac'], [186,37,'scooter','#e6b957'], [-64,-16,'volta','#74a6be'],
		[114,133,'tide','#d07d5d'], [-115,133,'van','#b7cdac'], [-114,-109,'reed','#e4b792'], [6.6,-149,'volta','#a0c6ba'],
	]) {
		cars.push(spawnVehicle(scene, type, color, x, z, heading, 'parked'))
	}
	return cars
}

export function updateTraffic(cars, player, city, dt, clock) {
	for (const car of cars) {
		if (car.mode === 'traffic') {
			const {route, speed} = car
			if (distance(car, route[car.routeIndex]) < Math.max(2.6, speed * .53)) car.routeIndex = (car.routeIndex + 1) % route.length
			const dx = Math.sin(car.heading), dz = -Math.cos(car.heading)
			const blocking = cars.some(other => {
				if (other === car || other.mode === 'held') return false
				const x = other.x - car.x, z = other.z - car.z
				const ahead = x * dx + z * dz
				return ahead > 0 && ahead < 4.5 + speed * .44 && Math.abs(x * dz - z * dx) < 1.72
			})
			car.wait = Math.max(0, (car.wait ?? 0) - dt)
			const cautious = distance(player, car) < 3.6 && !player.car
			const crash = guideVehicle(car, route[car.routeIndex], blocking || cautious || car.wait ? 0 : car.pace, dt, city)
			if (crash) {
				car.speed = 0
				car.routeIndex = (car.routeIndex + 1) % route.length
			}
		}
		if (car.mode === 'parked') car.speed *= Math.exp(-dt * 4)
		syncVehicle(car, clock)
	}
}
