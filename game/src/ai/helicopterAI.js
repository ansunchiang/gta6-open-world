import {T, GeometryBatch, distance} from '../render/geometry.js'

export function spawnHelicopter(scene, x, z, y = 14) {
	const node = new T.Group()
	const body = new GeometryBatch()
	body.ball('#223746', 0, 0, -.15, 1.52, 1.05, 2.37)
	body.ball('#68a3bc', 0, .18, -1.22, 1.34, .84, 1.32)
	body.box('#ece1ca', 0, -.35, .31, 2.79, .26, 2.08)
	body.box('#253947', 0, .28, 3.15, .58, .42, 4.7)
	body.box('#eb765b', 0, .77, 5.1, .13, 1.64, 1.37)
	for (const skid of [-1.08, 1.08]) {
		body.box('#c0c5c4', skid, -1.11, -.15, .13, .13, 3.92)
		for (const strut of [-1, .85]) body.box('#555d66', skid, -.77, strut, .13, .75, .12)
	}
	body.make(node, {metalness: .38, roughness: .36})
	const rotor = new T.Group()
	rotor.position.y = 1.4
	const blades = new GeometryBatch()
	blades.box('#1e2537', 0, 0, 0, .27, .05, 11.8)
	blades.box('#1e2537', 0, 0, 0, 11.8, .05, .27)
	blades.make(rotor, {}, false)
	node.add(rotor)
	const cone = new T.CylinderGeometry(.23, 4.9, 1, 32, 1, true)
	const beam = new T.Mesh(cone, new T.MeshBasicMaterial({
		color: '#77baff', opacity: .075, transparent: true,
		depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
	}))
	const lamp = new T.PointLight('#b9ddff', 46, 19, 1.65)
	scene.add(node, beam, lamp)
	return {x, z, y, node, rotor, beam, lamp, visible: false}
}

const up = new T.Vector3(0, 1, 0)
const direction = new T.Vector3()

export function poseHelicopter({x, y, z, node, rotor, beam, lamp}, target, clock, heading) {
	node.position.set(x, y, z)
	node.rotation.set(-.09, -heading, -.13)
	rotor.rotation.y = clock * 29
	direction.set(x - target.x, y - .85, z - target.z)
	beam.position.set(target.x + direction.x / 2, .85 + direction.y / 2, target.z + direction.z / 2)
	beam.scale.y = direction.length()
	beam.quaternion.setFromUnitVectors(up, direction.normalize())
	lamp.position.set(target.x, 3.4, target.z)
}

export function removeHelicopter(police) {
	if (!police.air) return
	const {node, beam, lamp} = police.air
	for (const item of [node, beam, lamp]) item.removeFromParent()
	node.traverse(dispose)
	dispose(beam)
	police.air = null
}

function dispose({geometry, material}) {
	geometry?.dispose()
	material?.dispose()
}

export function updateHelicopter(game, dt) {
	const {police, player, city, clock} = game
	if (police.stars < 4) {
		removeHelicopter(police)
		return false
	}
	const {lastKnown: report, search} = police
	const air = police.air ??= spawnHelicopter(game.scene, report.x + 24, report.z - 26)
	const active = clock >= police.blackout
	const radius = search.radius * .48
	const target = search.sweeping ? {
		x: report.x + Math.sin(clock * .65) * radius,
		z: report.z + Math.cos(clock * .65) * radius,
	} : report
	air.x += (target.x + Math.sin(clock * .46) * 10 - air.x) * dt
	air.z += (target.z - 11 - air.z) * dt
	air.beam.visible = air.lamp.visible = active
	air.visible = active && distance(player, target) < 10 && distance(player, air) < 31
	for (let t = .08; air.visible && t < 1; t += .08) {
		air.visible = !city.obstacle(player.x + (air.x - player.x) * t, player.z + (air.z - player.z) * t, .4, 1.4 + (air.y - 1.4) * t)
	}
	poseHelicopter(air, air.visible ? player : target, clock, .9 + Math.sin(clock * .35) * .35)
	return air.visible
}
