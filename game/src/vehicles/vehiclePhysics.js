import {createVehicleModel, VEHICLE_TYPES, flashSiren} from './vehicleModel.js'
import {advance, bearing, blend, clamp, distance, offset, turn} from 'geometry'
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

export function driveVehicle(car, input, city, vehicles, dt, effects, upgrades, onCrash) {
	const {abs, min, max, exp} = Math
	const {type} = car
	const spec = VEHICLE_TYPES[type]
	const {throttle, steer, brake} = input
	const top = spec.top + upgrades.engine * 5
	car.steering = blend(car.steering, steer, 1 - exp(-dt * 10))
	if (throttle !== 0) {
		const accel = Math.sign(car.speed) === throttle ? spec.accel : spec.accel * 1.8
		const boost = throttle > 0 ? max(.18, 1 - abs(car.speed) / (top * 1.16)) : .75
		car.speed += throttle * accel * boost * dt
	} else car.speed *= exp(-dt * (2.25 + (brake ? 5 : 0)))
	car.speed *= exp(-dt * (brake ? 1.05 : .09))
	car.speed = clamp(car.speed, -12, top)
	const agility = (brake ? 2.15 : 1.61) - .27 * min(1, abs(car.speed) / top)
	car.heading += car.steering * agility * clamp(car.speed / 5.8, -1, 1) * dt
	const sine = Math.sin(car.heading), cosine = Math.cos(car.heading)
	const {x, z} = offset(car, car.speed * dt)
	const oldSpeed = car.speed
	const bumped = type === 'boat' ? marineStep(car, x, z) : city.move(car, x, z, type === 'scooter' ? .61 : 1.19, true)
	if (bumped) car.speed *= -.24

	for (const other of vehicles) {
		if (other === car || car.lift > 1.5 || other.mode === 'held' || distance(car, other) > 4.5) continue
		const dx = other.x - car.x
		const dz = other.z - car.z
		const ahead = sine * dx - cosine * dz
		const side = cosine * dx + sine * dz
		if (abs(ahead) > 2.8 || abs(side) > 1.78 || ahead * oldSpeed <= 0) continue
		car.speed = Math.sign(oldSpeed) * min(abs(car.speed), abs(other.speed)) * .39
		other.impact = .72
		if (abs(oldSpeed) > 7 && car.impact <= 0) {
			other.health -= abs(oldSpeed) * 1.32
			if (other.type !== 'boat' && !other.barrier) city.move(other, other.x + dx * .26, other.z + dz * .26, 1.12, true)
			onCrash(other)
		}
		break
	}
	const loss = abs(oldSpeed - car.speed)
	if (loss > 5.1 && car.impact <= 0) {
		effects.sparks(car.x + sine * 2, .64, car.z - cosine * 2)
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
