import {createVehicleModel, VEHICLE_TYPES, flashSiren} from './vehicleModel.js'
import {advance, bearing, blend, clamp, distance, offset, turn} from '../render/geometry.js'
import {marineStep} from '../world/marina.js'

export function spawnVehicle(scene, type, color, x, z, heading, mode) {
	const model = createVehicleModel(scene, type, color)
	const car = { ...model, type, mode, x, z, heading, speed: 0, steering: 0,
		health: 100, driver: mode === 'traffic', phase: (x + z + 999) % 7, impact: 0,
	}
	syncVehicle(car, 0)
	return car
}

export function syncVehicle(car, clock) {
	const {node, door, x, z, heading, speed, steering, impact, doorSwing = 0} = car
	const lift = car.type === 'boat' ? Math.sin(clock * 2.3 + car.phase) * .07 : car.lift ?? 0
	node.position.set(x, lift, z)
	node.rotation.set(Math.min(.04, impact * .04) * Math.sin(clock * 39), -heading, -steering * Math.min(Math.abs(speed) / 100, .13), 'YXZ')
	door.visible = doorSwing > .02
	door.rotation.y = -doorSwing
	flashSiren(car, clock)
}

const {abs, min, max, exp} = Math
// Steering gain, response, rolling drag, brake bite, turning onset, footprint radius.
const street = [1.61, 10, 2.25, 5, 5.8, 1.19]
const handling = {
	tide: [1.75, 12, 1.9, 6, 6.9, 1.25],
	patrol: [1.68, 10, 2.1, 6, 6.3, 1.24],
	van: [1.21, 6, 2.05, 3.4, 6.9, 1.27],
	taxi: [1.37, 8, 2.3, 4.9, 6.1, 1.2],
	scooter: [2.24, 16, 2.6, 6.8, 4.4, .61],
	boat: [1.32, 4, .77, 1.8, 7.9, 1.19],
}

export function driveVehicle(car, input, city, vehicles, dt, effects, upgrades, onCrash) {
	const {type} = car
	const {throttle, steer, brake} = input
	const [gain, response, drag, bite, onset, radius] = handling[type] ?? street
	const {top: limit, accel, length, width} = VEHICLE_TYPES[type]
	const top = limit + upgrades.engine * 5
	car.steering = blend(car.steering, steer, 1 - exp(-dt * response))
	let speed = car.speed
	if (throttle) {
		const boost = speed * throttle <= 0 ? 1.8 : 1
		const thrust = throttle > 0 ? max(.18, 1 - abs(speed) / (top * 1.16)) : .75
		speed += throttle * accel * boost * thrust * dt
	}
	const friction = throttle ? .09 + (brake ? bite * .21 : 0) : drag + (brake ? bite : .09)
	const before = clamp(speed * exp(-dt * friction), -12, top)
	const slide = brake && type !== 'boat' ? .54 : 0
	const grip = car.lift > .9 ? .24 : 1
	const agility = gain + slide - .27 * min(1, abs(before) / top)
	car.heading += car.steering * agility * clamp(before / onset, -1, 1) * grip * dt
	const {x, z} = offset(car, before * dt)
	const bumped = type === 'boat' ? marineStep(car, x, z) : city.move(car, x, z, radius, true)
	car.speed = bumped ? before * -.24 : before
	if (car.lift <= 1.5 || !car.lift) {
		const nose = offset(car, Math.sign(before) * length * .4)
		const other = vehicles.find(ride => ride !== car && ride.mode !== 'held' &&
			distance(ride, nose) < (width + VEHICLE_TYPES[ride.type].width) * .49)
		if (other && before) {
			car.speed = Math.sign(before) * min(abs(car.speed), abs(other.speed)) * .39
			other.impact = .72
			if (abs(before) > 7 && car.impact <= 0) {
				other.health -= abs(before) * 1.32
				onCrash(other)
			}
		}
	}
	const loss = abs(before - car.speed)
	if (loss > 5.1 && car.impact <= 0) {
		const nose = offset(car, 2)
		effects.sparks(nose.x, .64, nose.z)
		car.health = max(0, car.health - min(28, loss * .64) / (1 + upgrades.armor * .55))
		car.impact = .7
	}
	car.impact = max(0, car.impact - dt)
	if (type !== 'boat' && brake && abs(steer) > .25 && abs(car.speed) > 7) effects.skid(car)
}

export function guideVehicle(car, point, speed, dt, city) {
	const error = turn(car.heading, bearing(car, point))
	car.steering = clamp(error * 1.65, -1, 1)
	car.heading += clamp(error, -2.45 * dt, 2.45 * dt)
	const limit = speed * (Math.abs(error) > .7 ? .46 : 1)
	car.speed = blend(car.speed, limit, 1 - Math.exp(-dt * 2.6))
	return advance(city, car, car.speed * dt, 1, true)
}
