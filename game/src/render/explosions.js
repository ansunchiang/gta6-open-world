import {T, sprite} from './geometry.js'
import {radialTexture} from './effects.js'

export function createExplosions(scene) {
	const map = radialTexture()
	const particles = Array.from({length: 76}, () => sprite(scene, {map}))
	const light = new T.PointLight('#ff6c32', 0, 27, 1.65)
	scene.add(light)
	let next = 0
	function plume(x, y, z, size, life, heat, drift) {
		const node = particles[next++ % particles.length]
		node.visible = true
		node.position.set(x, y, z)
		node.material.rotation = next * 2.4
		node.userData = {size, life, duration: life, heat, drift}
	}
	function flame(x, z, phase, burst = false) {
		const size = burst ? 2 : 1
		plume(x, 1.18, z, size * 3.6, .62, true, phase)
		plume(x + .5, 1.7, z, size * 2.4, 3.4, false, phase)
		light.position.set(x, 2, z)
		light.intensity = burst ? 85 : Math.max(30, light.intensity)
	}
	function update(dt) {
		light.intensity *= Math.exp(-dt * 4)
		for (const node of particles) {
			if (!node.visible) continue
			const item = node.userData
			const {heat, drift} = item
			if ((item.life -= dt) <= 0) { node.visible = false; continue; }
			const age = 1 - item.life / item.duration
			node.material.opacity = (1 - age) * (heat ? .92 : Math.min(.94, age * 7 + .28))
			node.material.color.set(heat ? age < .22 ? '#ffc45c' : '#ff531d' : '#2f2833')
			const size = item.size * (1 + age * (heat ? .46 : 1.8))
			node.scale.setScalar(size)
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
