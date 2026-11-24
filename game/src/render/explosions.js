import {T, sprite, texture} from './geometry.js'
import {radialTexture} from './effects.js'

export function createExplosions(scene) {
	const glow = radialTexture()
	const fire = texture(64, 64, ctx => {
		ctx.fillStyle = '#ffffffb8'
		ctx.fill(new Path2D('M6 62Q4 49 22 28Q27 38 32 9Q47 24 44 40L53 30Q66 48 57 62Z'))
		ctx.fillStyle = '#fff'
		ctx.fill(new Path2D('M18 63Q15 51 30 40Q37 47 39 31Q54 50 46 63Z'))
	})
	const particles = Array.from({length: 76}, () => sprite(scene, {}))
	const light = new T.PointLight('#ff7132', 0, 27, 1.65)
	scene.add(light)
	let next = 0
	function plume(x, y, z, size, life, heat, drift) {
		const node = particles[next++ % particles.length]
		node.visible = true
		node.position.set(x, y, z)
		node.material.rotation = Math.sin(drift) * .19
		node.material.map = heat === true ? fire : glow
		node.material.blending = heat ? T.AdditiveBlending : T.NormalBlending
		node.userData = {size, life, duration: life, heat, drift}
	}
	function flame(x, z, phase, burst = false) {
		plume(x + Math.cos(phase) * .8, 1.3, z, 3.5, .55, true, phase)
		plume(x + Math.sin(phase) * .7, 2.1, z, 4.2, 3.6, false, phase)
		if (burst) {
			for (const i of [-2,-1,0,1,2]) plume(x + i * .69, 2.5 - i * .15, z + .8, 3.2, .34 + .05 * i, true, i)
			plume(x, 2, z + .92, 4.3, .26, 2, phase)
		}
		light.position.set(x, 2, z)
		light.intensity = burst ? 128 : Math.max(36, light.intensity)
	}
	function update(dt) {
		light.intensity *= Math.exp(-dt * 4)
		for (const node of particles) {
			if (!node.visible) continue
			const item = node.userData
			const {heat, drift} = item
			if ((item.life -= dt) <= 0) { node.visible = false; continue; }
			const age = 1 - item.life / item.duration
			node.material.opacity = (1 - age) * (heat ? .98 : Math.min(1, age * 9 + .3))
			node.material.color.set(heat ? age < .23 ? '#fff0b1' : age < .58 ? '#ff982e' : '#f14111' : '#15111a')
			const size = item.size * (1 + age * (heat ? .32 : 1.6))
			node.scale.set(size, size * (heat ? 1.3 : 1), 1)
			node.position.y += dt * (heat ? 2.9 : 4.3)
			node.position.x += dt * (heat ? Math.sin(drift) * .35 : .78)
			node.position.z += dt * Math.cos(drift) * .46
		}
	}
	return { flame, plume, update, clear() {
		for (const node of particles) node.visible = false
		light.intensity = 0
	} }
}
