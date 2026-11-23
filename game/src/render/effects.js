import {T, addMesh, lightPaint, offset, sprite, texture} from 'geometry'
import {createRandom} from '../random.js'

export function radialTexture(body = .18) {
	return texture(64, 64, ctx => {
		const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
		gradient.addColorStop(0, '#fff')
		gradient.addColorStop(body, '#ffffffa0')
		gradient.addColorStop((1 + body) / 2, '#ffffff24')
		gradient.addColorStop(1, '#fff0')
		ctx.fillStyle = gradient
		ctx.fillRect(0, 0, 64, 64)
	})
}

export function createEffects(scene) {
	const random = createRandom(4412)
	const cube = new T.BoxGeometry()
	const meshPool = (count, shape, paint) => Array.from({length: count}, () => {
		const mesh = addMesh(scene, shape, paint, 0, 0, 0, false)
		mesh.visible = false
		return {mesh, life: 0}
	})
	const sparks = meshPool(68, cube, lightPaint('#ffd08d')), traces = meshPool(25, cube, lightPaint('#fff0a1'))
	const marks = meshPool(92, new T.PlaneGeometry(.24, 1), new T.MeshBasicMaterial({
		color: '#211f29', transparent: true, opacity: .52, depthWrite: false,
	}))
	const map = radialTexture()
	const flashes = Array.from({length: 8}, () => ({
		mesh: sprite(scene, {map, color: '#ffe299', blending: T.AdditiveBlending}), life: 0,
	}))
	const pool = [...sparks, ...traces, ...marks, ...flashes]
	let lastSkid = 0
	function emit(items, x, y, z, life) {
		const item = items.shift()
		items.push(item)
		item.mesh.visible = true
		item.mesh.position.set(x, y, z)
		item.life = life
		item.velocity = null
		return item
	}
	return {
		sparks(x, y, z, count = 14) {
			for (let i = 0; i < count; i++) {
				const item = emit(sparks, x, y, z, .32 + random() * .44)
				item.velocity = new T.Vector3((random() - .5) * 15, 2 + random() * 8, (random() - .5) * 14)
				item.mesh.rotation.set(random() * 6, 0, random() * 6)
				item.mesh.scale.set(.026, .07 + random() * .18, .025)
			}
		},
		flash(x, y, z, heading, range, tracerOnly = false) {
			if (!tracerOnly) {
				const {mesh} = emit(flashes, x, y, z, .11)
				mesh.scale.set(1.15, .84, 1)
			}
			const span = Math.min(29, range)
			const {mesh} = emit(traces, x + Math.sin(heading) * span / 2, y, z - Math.cos(heading) * span / 2, .069)
			mesh.rotation.y = -heading
			mesh.scale.set(.026, .023, span)
		},
		skid(car) {
			if (lastSkid > 0) return
			lastSkid = .045
			for (const side of [-.75, .75]) {
				const {x, z} = offset(car, -1.28, side)
				const {mesh} = emit(marks, x, .004, z, 15)
				mesh.rotation.set(-Math.PI / 2, 0, -car.heading, 'YXZ')
				mesh.scale.y = Math.max(.75, Math.abs(car.speed) * .058)
			}
		},
		update(dt) {
			lastSkid -= dt
			for (const item of pool) {
				const {mesh, velocity} = item
				if (!mesh.visible) continue
				if ((item.life -= dt) <= 0) mesh.visible = false
				if (velocity) {
					mesh.position.addScaledVector(velocity, dt)
					mesh.position.y = Math.max(.045, mesh.position.y)
					velocity.y -= 15 * dt
				}
			}
		},
		clear() { for (const {mesh} of pool) mesh.visible = false; },
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
