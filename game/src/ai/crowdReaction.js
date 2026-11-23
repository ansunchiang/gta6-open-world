import {bearing, distance, offset, turn} from '../render/geometry.js'

const turns = [0, -.7, .7, -1.4, 1.4, Math.PI]

function warnPedestrian(person, source, strength, delay = 0) {
	if (!person.down && !person.alarm) person.alarm = {source, delay, strength}
}

export function openHeading(city, person, heading, radius = .3) {
	for (const angle of turns) {
		const facing = heading + angle
		const {x, z} = offset(person, 1.8, 0, facing)
		if (!city.obstacle(x, z, radius)) return facing
	}
}

function resumeSidewalk(person) {
	person.route?.forEach((point, index) => {
		if (distance(person, point) < distance(person, person.route[person.routeIndex])) person.routeIndex = index
	})
}

export function reactToAlarm(person, city, dt) {
	const {alarm} = person
	if (alarm && (alarm.delay -= dt) <= 0) {
		const away = bearing(alarm.source, person)
		person.flee = openHeading(city, person, away) ?? away
		person.panic = Math.max(person.panic, alarm.strength)
		person.alarm = null
	}
	if (person.panic <= 0) return 0
	person.heading += turn(person.heading, person.flee) * Math.min(1, dt * 8)
	person.panic = Math.max(0, person.panic - dt)
	if (person.panic === 0) resumeSidewalk(person)
	return person.panic > 1.2 ? 4.6 : person.panic > 0 ? 2.9 : 0
}

export function watchTraffic(person, car) {
	if (!car || person.panic > 1.2 || car.lift > .9) return
	const travel = car.speed * .42
	if (Math.abs(travel) < 2) return
	if (distance(person, offset(car, travel)) < 2.8) warnPedestrian(person, car, 2.8)
}

export function warnCrowd(people, x, z, radius) {
	const source = {x, z}
	for (const person of people) {
		const gap = distance(person, source)
		if (gap < radius) warnPedestrian(person, source, 5.2 - gap / radius * 2, .06 + gap / radius * .38)
	}
}
