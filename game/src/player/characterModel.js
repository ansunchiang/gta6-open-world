import {T, GeometryBatch} from '../render/geometry.js'

const rigCache = new Map()
const skinTones = ['#bb7859', '#e0ab80', '#8b594e', '#bb896e', '#e5bc9e']
const trousers = ['#293e4a', '#362f41', '#525b5a', '#414954']

function buildRig(outfit, tone, style) {
	const player = style === 'player', guard = style === 'guard'
	const torso = new GeometryBatch()
	const skin = skinTones[tone % skinTones.length]
	const pants = trousers[tone % trousers.length]
	torso.boxes([
		[pants, 0, .915, 0, .42, .285, .28],
		[outfit, 0, 1.27, 0, .475, .55, .294],
		[skin, 0, 1.59, 0, .129, .22, .136],
	])
	torso.ball(skin, 0, 1.76, -.009, .151, .19, .151)
	const hair = guard ? '#263d4e' : '#322531'
	torso.ball(hair, 0, 1.849, .016, .165, .119, .165)
	for (const eye of [-.055, .055]) torso.box('#362e34', eye, 1.778, -.146, .034, .017, .012)
	if (player) {
		torso.ball('#392a33', .075, 1.82, .143, .102, .115, .11)
		torso.boxes([
			['#223644', -.019, 1.19, .17, .295, .31, .086, -.1],
			['#dc9c62', .047, 1.33, .168, .069, .445, .039, -.16],
			['#dcb283', -.05, 1.11, .219, .17, .072, .024],
		])
	}
	if (guard) {
		torso.box('#404d4b', 0, 1.31, -.15, .39, .41, .086)
		torso.box('#282e3d', 0, 1.85, -.115, .26, .045, .194)
	}
	const arm = new GeometryBatch()
	arm.box(outfit, 0, -.15, 0, .143, .34, .167)
	arm.box(skin, 0, -.36, -.033, .104, .19, .112)
	arm.ball(skin, 0, -.475, -.043, .063, .077, .061)
	const leg = new GeometryBatch()
	leg.box(pants, 0, -.33, 0, .182, .685, .2)
	leg.box(player ? '#eac59f' : '#292e3b', 0, -.686, -.047, .182, .158, .296)
	const gun = new GeometryBatch()
	gun.box('#394350', 0, -.43, -.158, .082, .086, .25)
	gun.box('#232b34', 0, -.49, -.075, .065, .137, .075)
	return [torso, arm, leg, gun].map(part => part.make(new T.Group()))
}

export function createCharacter(scene, outfit, tone, style = 'civilian') {
	const key = [outfit, tone, style].join('/')
	if (!rigCache.has(key)) rigCache.set(key, buildRig(outfit, tone, style))
	const [torso, arm, leg, gun] = rigCache.get(key).map(mesh => mesh.clone())
	const node = new T.Group().add(torso)
	const limbs = (shape, x, y, z, slant = 0) => [-1, 1].map(side => {
		const joint = new T.Group()
		joint.position.set(x * side, y, z)
		joint.rotation.z = slant * side
		node.add(joint.add(shape.clone()))
		return joint
	})
	const arms = limbs(arm, .296, 1.465, -.012, .135)
	const legs = limbs(leg, .117, .755, 0)
	arms[1].add(gun)
	gun.visible = false
	scene.add(node)
	return {node, arms, legs, weapon: gun}
}

export function animateCharacter(actor, clock, pace) {
	const {model: {node, arms, legs, weapon}, x, z, heading, phase = 0, swing = 0, y = 0, down, aim, armed} = actor
	const step = Math.sin(clock * (pace > 4 ? 12 : 8.3) + phase) * Math.min(1, pace / 2.7)
	node.position.set(x, y + (down > 0 ? .27 : Math.abs(step) * .043), z)
	node.rotation.set(down > 0 ? 1.46 : 0, -heading, 0, 'YXZ')
	legs[0].rotation.x = step * .69
	legs[1].rotation.x = -step * .69
	arms[0].rotation.x = -step * .42 - (aim ? .93 : 0)
	arms[1].rotation.x = (aim ? -1.41 : step * .42) - Math.sin(swing * Math.PI) * .7
	arms[1].rotation.z = aim ? -.15 : .135
	weapon.visible = !!armed
	weapon.scale.z = actor.weapon === 'shotgun' || actor.weapon === 'carbine' ? 2.5 : actor.weapon === 'smg' ? 1.6 : 1
}
