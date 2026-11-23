import {T, addMesh, lightPaint, offset, sprite, texture} from './geometry.js'
import {createRandom} from '../random.js'

let glowMap
export function radialTexture() {
	return glowMap ??= texture(64, 64, ctx => {
		const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
		gradient.addColorStop(0, '#fff')
		gradient.addColorStop(.26, '#ffffffa0')
		gradient.addColorStop(1, '#fff0')
		ctx.fillStyle = gradient
		ctx.fillRect(0, 0, 64, 64)
	})
}

export function createEffects(scene) {
	const random = createRandom(4412)
	const cube = new T.BoxGeometry()
	const pool = []
	const bank = (count, create) => Array.from({length: count}, () => {
		const node = create()
		node.visible = false
		pool.push(node)
		return node
	})
	const meshBank = (count, shape, material) => bank(count, () => addMesh(scene, shape, material, 0, 0, 0, false))
	const sparks = meshBank(68, cube, lightPaint('#ffd08d'))
	const traces = meshBank(25, cube, lightPaint('#fff0a1'))
	const marks = meshBank(92, new T.PlaneGeometry(.24, 1), lightPaint('#272833'))
	const flashes = bank(8, () => sprite(scene, {map: radialTexture(), color: '#ffe299', blending: T.AdditiveBlending}))
	let skidDelay = 0
	function emit(items, x, y, z, life) {
		const node = items.shift()
		items.push(node)
		node.visible = true
		node.position.set(x, y, z)
		node.userData.life = life
		return node
	}
	return {
		sparks(x, y, z, count = 14) {
			for (let i = 0; i < count; i++) {
				const spark = emit(sparks, x, y, z, .32 + random() * .44)
				const drift = spark.userData.drift ??= new T.Vector3()
				drift.set((random() - .5) * 15, 2 + random() * 8, (random() - .5) * 14)
				spark.rotation.set(random() * 6, 0, random() * 6)
				spark.scale.set(.026, .07 + random() * .18, .025)
			}
		},
		flash(x, y, z, heading, range, tracerOnly = false) {
			if (!tracerOnly) emit(flashes, x, y, z, .11).scale.set(1.15, .84, 1)
			const span = Math.min(29, range)
			const center = offset({x, z, heading}, span / 2)
			const mesh = emit(traces, center.x, y, center.z, .069)
			mesh.rotation.y = -heading
			mesh.scale.set(.026, .023, span)
		},
		skid(car) {
			if (skidDelay > 0) return
			skidDelay = .045
			for (const side of [-.75, .75]) {
				const {x, z} = offset(car, -1.28, side)
				const mesh = emit(marks, x, .004, z, 15)
				mesh.rotation.set(-Math.PI / 2, 0, -car.heading, 'YXZ')
				mesh.scale.y = Math.max(.75, Math.abs(car.speed) * .058)
			}
		},
		update(dt) {
			skidDelay -= dt
			for (const node of pool) {
				if (!node.visible) continue
				const state = node.userData
				if ((state.life -= dt) <= 0) node.visible = false
				if (!state.drift) continue
				node.position.addScaledVector(state.drift, dt)
				node.position.y = Math.max(.045, node.position.y)
				state.drift.y -= 15 * dt
			}
		},
		clear() { for (const node of pool) node.visible = false },
	}
}

export function createSirenGlow(scene) {
	const map = radialTexture()
	const glows = Array.from({length: 14}, (_, i) => sprite(scene, {
		map, color: i % 2 ? '#398cff' : '#ff294b', blending: T.AdditiveBlending, fog: false,
	}))
	return (units, time) => glows.forEach((glow, index) => {
		const car = units[Math.floor(index / 2)]
		const side = index % 2 ? 1 : -1
		glow.visible = !!car
		if (!car) return
		const pulse = .35 + .65 * Math.abs(Math.sin(time * 11 + car.phase + side))
		const {x, z} = offset(car, 0, side * .4)
		glow.position.set(x, 1.82, z)
		glow.material.opacity = pulse
		glow.scale.setScalar(1.1 + pulse * 2.6)
	})
}
