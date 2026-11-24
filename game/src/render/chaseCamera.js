import {T, clamp, offset, turn} from './geometry.js'

export function createChaseCamera(camera, city) {
	const next = new T.Vector3()
	const look = new T.Vector3()
	const rig = {yaw: 0, pitch: 0, manual: 0}
	function update(player, {aim, mouseX, mouseY, presses}, dt, snap = false) {
		const {car, heading} = player
		const speed = Math.abs(car?.speed ?? 0)
		if (aim && (mouseX || mouseY)) {
			rig.yaw += mouseX * .004
			rig.pitch = clamp(rig.pitch + mouseY * .0033, -.29, .52)
			rig.manual = 2
		}
		rig.manual = Math.max(0, rig.manual - dt)
		if (snap || presses?.has('KeyC')) {
			rig.yaw = heading
			rig.pitch = rig.manual = 0
		} else if (car && !aim && !rig.manual && speed > 1.2) {
			rig.yaw += turn(rig.yaw, car.heading) * (1 - Math.exp(-dt * 3.8))
			rig.pitch *= Math.exp(-dt * 3.4)
		}

		const [lateral, elevation, lookAhead] = car ? [-.36, 4, 7.8] : aim ? [.96, 2.19, 9.5] : [.18, 2.64, 6.8]
		const reach = car ? 7.8 + speed * .05 : aim ? 3.5 : 6
		const base = offset(player, 0, lateral, rig.yaw)
		const point = length => offset(base, length, 0, rig.yaw)
		let safe = 1.3
		while (safe < reach) {
			const {x, z} = point(-safe)
			if (city.obstacle(x, z, .31, 1.5 + safe / reach * (elevation - 1.5))) break
			safe += .60
		}
		const eye = point(safe >= reach ? -reach : -Math.max(1, safe - .65))
		const target = point(lookAhead)
		const damping = snap ? 1 : 1 - Math.exp(-dt * 11.5)
		next.set(eye.x, Math.max(1.47, elevation + rig.pitch * 4.9), eye.z)
		camera.position.lerp(next, damping)
		next.set(target.x, 1.67 - rig.pitch * 3.2, target.z)
		look.lerp(next, damping)
		camera.lookAt(look)
		const fov = car ? 65 + Math.min(6, speed * .19) + car.impact * 3 : aim ? 57 : 64
		if (Math.abs(camera.fov - fov) > .05) {
			camera.fov += (fov - camera.fov) * damping
			camera.updateProjectionMatrix()
		}
	}
	return Object.assign(rig, {update})
}
