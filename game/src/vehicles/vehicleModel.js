import {T, box, cylinder, GeometryBatch, lightPaint, paint} from '../render/geometry.js'

export const VEHICLE_TYPES = Object.fromEntries([
	// Type, name, width, length, top speed, acceleration, roof height, cabin offset
	['volta', 'Volta R7', 1.88, 4.22, 37, 13.5, .53, .12],
	['reed', 'Reed Sable', 1.78, 3.85, 31, 10, .7, -.05],
	['taxi', 'Oriole Cab', 1.86, 4.56, 32, 9.7, .7, .08],
	['van', 'Brine Courier', 1.98, 4.68, 27, 7.8, 1.03, .32],
	['patrol', 'Harbor Interceptor', 1.96, 4.56, 36, 12.5, .68, .08],
	['tide', 'Tideglass S9', 2.02, 4.67, 51, 18, .39, .08],
	['scooter', 'Kestrel 90', .76, 1.95, 27, 13],
	['boat', 'Cinder 22', 2.5, 6, 31, 11],
].map(([type, name, width, length, top, accel, roof, cabin = 0]) =>
	[type, {name, width, length, top, accel, roof, cabin}]))

const bodyShapes = new Map()
const lampWhite = lightPaint('#fff0c8')
const lampRed = lightPaint('#ff253a')
const lampBlue = lightPaint('#47b7ff')
const lamps = [[lampRed, lightPaint('#78263a')], [lampBlue, lightPaint('#263f83')]]
const glass = '#263d52'

function cabinGeometry() {
	const geo = new T.BoxGeometry(1, 1, 1)
	const p = geo.attributes.position
	for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) {
		p.setX(i, p.getX(i) * .83)
		p.setZ(i, p.getZ(i) * .57)
	}
	geo.translate(0, .5, 0)
	geo.computeVertexNormals()
	return geo
}
const cabin = cabinGeometry()

function cachedBody(type, color) {
	const key = type + color
	if (!bodyShapes.has(key)) {
		const batch = new GeometryBatch()
		if (type === 'boat' || type === 'scooter') buildSpecialModel(batch, type, color)
		else buildBody(batch, type, color)
		bodyShapes.set(key, batch.make(new T.Group(), {roughness: .52, metalness: .16, side: T.DoubleSide}))
	}
	return bodyShapes.get(key).clone()
}

function buildBody(batch, type, color) {
	const {width: w, length: l, roof, cabin: offset} = VEHICLE_TYPES[type]
	const police = type === 'patrol'
	const accent = new T.Color(color).lerp(new T.Color('#192833'), .33)
	const shell = l * .94
	batch.box('#25303a', 0, .43, 0, w * .88, .4, shell)
	batch.box(color, 0, .68, 0, w, .47, shell)
	for (const end of [-.48, .48]) batch.box('#292e38', 0, .52, end * l, w * .96, .18, .13)
	batch.box('#d4cbab', 0, .62, l * .502, .35, .108, .03)
	batch.add(cabin, glass, 0, .89, offset, w * .88, roof, l * .57)
	batch.box(color, 0, .898 + roof, offset + .01, w * .766, .075, l * .333)
	for (const side of [-1, 1]) {
		const stripe = police ? '#f1e4ce' : accent
		batch.box(stripe, side * (w / 2 + .015), .7, .1, .035, .26, l * .45)
		for (const z of [-l * .305, l * .301]) {
			wheel(batch, '#25272c', side * w * .46, .328, z, .337, .24)
			wheel(batch, '#adb1a9', side * w * .527, .328, z, .211, .025, 10)
		}
	}
	if (type === 'volta' || type === 'tide') {
		batch.box('#393643', 0, 1.03, l * .447, w * 1.01, .076, .26)
		for (const x of [-.59, .59]) batch.box('#34333d', x, .952, l * .435, .07, .14, .085)
		if (type === 'tide') {
			batch.box('#151d2d', 0, .93, -.96, .34, .025, 1.36)
			batch.box('#f76354', 0, .795, l * .482, w * .78, .085, .048)
		}
	}
	if (type === 'taxi') batch.box('#f4d284', 0, 1.72, offset, .64, .24, .26)
	if (police) batch.box('#142e42', 0, 1.65, offset, 1.4, .11, .27)
}

export function createVehicleModel(scene, type, color) {
	const node = new T.Group()
	node.add(cachedBody(type, color))
	const {width: w, length: l, cabin: offset} = VEHICLE_TYPES[type]
	const lights = []
	for (const side of [-1, 1]) {
		if (type === 'boat') break
		const x = side * w * .337
		box(node, lampWhite, x, .758, -l * .482, .39, .112, .041).castShadow = false
		box(node, lampRed, x, .759, l * .493, .39, .105, .036).castShadow = false
		if (type === 'patrol') {
			const bulb = box(node, side < 0 ? lampRed : lampBlue, side * .39, 1.76, offset, .55, .155, .28)
			bulb.castShadow = false
			lights.push(bulb)
		}
	}
	const door = new T.Group()
	door.position.set(-w * .51, 0, -.72)
	box(door, paint(color), 0, .74, .56, .078, .325, 1.12)
	box(door, paint(glass), 0, 1.02, .61, .049, .25, .73)
	door.visible = false
	if (type !== 'boat' && type !== 'scooter') node.add(door)
	scene.add(node)
	return {node, lights, door}
}

export function flashSiren(car, time) {
	if (!car.lights.length) return
	const phase = Math.floor(time * 9 + car.phase * 3) % 4
	car.lights[0].material = lamps[0][Number(phase >= 2)]
	car.lights[1].material = lamps[1][Number(phase === 0)]
}

function wheel(batch, color, x, y, z, radius, width, sides = 14) {
	batch.add(cylinder(1, 1, sides), color, x, y, z, radius, width, radius, 0, 0, Math.PI / 2)
}

function buildSpecialModel(batch, type, color) {
	if (type === 'boat') {
		batch.ball(color, 0, .23, 0, 1.33, .54, 3.38)
		batch.ball('#eee5d5', 0, .58, -.42, 1.16, .18, 2.71)
		batch.boxes([
			['#263d52', 0, .9, -.48, 1.43, .47, 1.3],
			['#eacfa3', 0, .92, .84, 1.65, .62, .63],
			['#283442', 0, .52, 2.44, .56, .91, .62],
		])
		for (const rail of [-.95, .95]) batch.box('#fbdfbd', rail, .64, 0, .09, .14, 2.54)
		return
	}
	batch.ball(color, 0, .91, -.66, .35, .53, .34)
	batch.boxes([
		[color, 0, .62, 0, .49, .45, 1.45],
		['#263740', 0, .91, .29, .42, .16, .75],
		['#b1bbbd', 0, 1.33, -.6, .85, .075, .08],
		['#fff1b8', 0, 1.17, -.89, .24, .16, .04],
	])
	for (const z of [-.76, .76]) {
		wheel(batch, '#202932', 0, .34, z, .336, .22)
		wheel(batch, '#b9c6c5', 0, .34, z, .16, .24, 10)
	}
}
