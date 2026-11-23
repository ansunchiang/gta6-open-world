import {T, clamp, turn} from 'geometry'

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

		const distance = car ? 7.8 + speed * .05 : aim ? 3.5 : 6
		const lateral = car ? -.36 : aim ? .96 : .18
		const elevation = car ? 4 : aim ? 2.19 : 2.64
		const sine = Math.sin(rig.yaw), cosine = Math.cos(rig.yaw)
		const x = player.x + cosine * lateral, z = player.z + sine * lateral
		const lookAhead = car ? 7.8 : aim ? 9.5 : 6.8
		let safe = 1.3
		while (safe < distance && !city.obstacle(x - sine * safe, z + cosine * safe, .31, 1.5 + safe / distance * (elevation - 1.5))) {
			safe += .60
		}
		safe = safe >= distance ? distance : Math.max(1, safe - .65)
		const damping = snap ? 1 : 1 - Math.exp(-dt * 11.5)
		next.set(x - sine * safe, Math.max(1.47, elevation + rig.pitch * 4.9), z + cosine * safe)
		camera.position.lerp(next, damping)
		next.set(x + sine * lookAhead, 1.67 - rig.pitch * 3.2, z - cosine * lookAhead)
		look.lerp(next, damping)
		camera.lookAt(look)
		const fov = car ? 65 + Math.min(6, speed * .19) : aim ? 57 : 64
		if (Math.abs(camera.fov - fov) > .05) {
			camera.fov += (fov - camera.fov) * damping
			camera.updateProjectionMatrix()
		}
	}
	return Object.assign(rig, {update})
}
