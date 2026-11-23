import {T, sprite} from 'geometry'
import {radialTexture} from './effects.js'

export function createExplosions(scene) {
	const map = radialTexture(.48)
	const particles = Array.from({length: 76}, () => ({node: sprite(scene, {map}), life: 0}))
	const light = new T.PointLight('#ff6c32', 0, 27, 1.65)
	scene.add(light)
	let next = 0
	function plume(x, y, z, size, life, heat, drift) {
		const particle = particles[next++ % particles.length]
		const {node} = particle
		node.visible = true
		node.position.set(x, y, z)
		node.material.rotation = next * 2.4
		Object.assign(particle, {size, life, duration: life, heat, drift})
	}
	function flame(x, z, phase, burst = false) {
		plume(x + Math.sin(phase) * .85, 1.18, z + Math.cos(phase) * 1.16, burst ? 5.8 : 2.9, burst ? .89 : .62, true, phase)
		plume(x, .82, z, burst ? 3.1 : 1.20, .44, true, phase + 2)
		plume(x + .5, 1.7, z, burst ? 4.3 : 2.1, 3.4, false, phase)
		light.position.set(x, 2, z)
		light.intensity = burst ? 85 : Math.max(30, light.intensity)
	}
	function update(dt) {
		light.intensity *= Math.exp(-dt * 4)
		for (const item of particles) {
			const {node, heat, drift} = item
			if (!node.visible) continue
			if ((item.life -= dt) <= 0) { node.visible = false; continue; }
			const age = 1 - item.life / item.duration
			node.material.opacity = (1 - age) * (heat ? .92 : Math.min(1, age * 7 + .28) * .94)
			node.material.color.set(heat ? age < .22 ? '#ffc45c' : '#ff531d' : '#2f2833')
			const size = item.size * (1 + age * (heat ? .46 : 1.8))
			node.scale.set(size, size * (heat ? 1.23 : 1), 1)
			node.position.y += dt * (heat ? 2.9 : 4.3)
			node.position.x += dt * (heat ? Math.sin(drift) * .35 : .78)
			node.position.z += dt * Math.cos(drift) * .46
		}
	}
	return { flame, plume, update, clear() {
		for (const {node} of particles) node.visible = false
		light.intensity = 0
	} }
}
