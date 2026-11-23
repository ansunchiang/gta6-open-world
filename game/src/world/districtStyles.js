import {T, GeometryBatch} from 'geometry'
import {streetSign} from './architecture.js'
import {PLACES} from 'city-layout'

export const CAUSEWAY = {x: 181, z: 120, end: 282}

export function buildDistrictLandmarks(scene) {
	const structures = new GeometryBatch()
	const emissive = new GeometryBatch()
	const {x, z, end} = CAUSEWAY
	const span = end - x, mid = x + span / 2
	structures.box('#424d59', mid,-.085,z, span,.30,17.8)
	for (const side of [-1, 1]) {
		const rail = z + side * 8.5
		structures.box('#c6b499', mid,.57,rail, span,.71,.45)
		structures.box('#255865', mid,1.05,rail, span,.10,.12)
		for (let a = 202; a < end; a += 9) structures.box('#c6b499', a,-.85,z + side * 7.5, 1.1,2.3,1.1)
	}
	for (let a = 194; a < end; a += 5.8) structures.box('#ecd29f', a,.073,z, 3.3,.019,.22)
	structures.box('#c9b08a', end - 1,.16,z, 6,.36,21)
	for (let level = 0; level < 4; level++) {
		structures.box(level % 2 ? '#dc7463' : '#ffead0', end,1.7 + level * 3.2,z - 6.2, 2.9 - level * .19,3.2,2.8 - level * .19)
	}
	emissive.box('#ffffae', end,13.584,z - 6.2, 2.27,.72,2.27)
	structures.box('#3d4c59', end,14.1,z - 6.2, 2.74,.25,2.74)
	for (const b of [z - 8, z + 8]) structures.box('#ffb578', 206,4.4,b, 1.16,8.9,1.38)
	structures.box('#e5b590', 206,8.45,z, 1.19,.63,16.7)
	streetSign(scene, 'BEACON CAUSEWAY', 206, 7.66, z + .1, 9.6, 1.18, -Math.PI / 2, '#ffcb8a')
	const dispatch = PLACES.dispatch
	streetSign(scene, dispatch.label, dispatch.x, 3.8, dispatch.z, 9, 1.4, -Math.PI / 2)
	for (const [a, b, name, hue, facing] of [
		[11, 78, 'MARROW CLUB', '#ff5d9e', -1], [-11, 73, 'PINK MARLIN', '#ff8a6a', 1],
		[11, 44, 'AFTERWAVE', '#5afaee', -1], [-11, 45, 'HALO ROOM', '#ba9bff', 1],
		[169, 38, 'SUNSPUR HOTEL', '#ffc783', 1], [169, 15, 'BEACON STRAND', '#8ae8da', 1],
	]) {
		const angle = facing * Math.PI / 2
		streetSign(scene, name, a, 5.15, b, 8.2, 1.65, angle, hue, '#17273a')
		for (const height of [4.25, 6.04]) emissive.box(hue, a - facing * .08,height,b, .061,.10,8.4)
		if (Math.abs(a) < 15) {
			emissive.box(hue, a + facing * .32,7.1,b + 3.8, .10,4.1,.16)
			const pool = new T.PointLight(hue, 0, 15, 1.75)
			pool.position.set(a + facing * 2, 3.1, b)
			pool.userData.neon = true
			scene.add(pool)
		}
	}
	structures.make(scene, {roughness: .73})
	return emissive.make(scene, {emissive: '#ffb4df', emissiveIntensity: .48}, false).material
}
