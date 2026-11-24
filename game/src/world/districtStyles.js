import {T, GeometryBatch, sprite} from '../render/geometry.js'
import {radialTexture} from '../render/effects.js'
import {streetSign} from './architecture.js'
import {PLACES} from './cityLayout.js'

export const CAUSEWAY = {x: 181, z: 120, end: 282}

export function buildDistrictLandmarks(scene, pools) {
	const structures = new GeometryBatch(), emissive = new GeometryBatch()
	const glow = [], map = radialTexture()
	const {x, z, end} = CAUSEWAY
	const span = end - x, mid = x + span / 2
	structures.box('#424d59', mid, -.085, z, span, .3, 17.8)
	for (const side of [-1, 1]) {
		const rail = z + side * 8.5
		structures.box('#c6b499', mid, .57, rail, span, .71, .45)
		structures.box('#255865', mid, 1.05, rail, span, .1, .12)
		for (let pier = 202; pier < end; pier += 9) {
			structures.box('#c6b499', pier, -.85, z + side * 7.5, 1.1, 2.3, 1.1)
		}
	}
	for (let dash = 194; dash < end; dash += 5.8) structures.box('#ecd29f', dash, .073, z, 3.3, .019, .22)
	structures.box('#c9b08a', end - 1, .16, z, 6, .36, 21)
	const towerZ = z - 6.2
	for (let level = 0; level < 4; level++) {
		const width = 2.9 - level * .19
		structures.box(level % 2 ? '#dc7463' : '#ffead0', end, 1.7 + level * 3.2, towerZ, width, 3.2, width - .1)
	}
	emissive.box('#ffffae', end, 13.584, towerZ, 2.27, .72, 2.27)
	structures.box('#3d4c59', end, 14.1, towerZ, 2.74, .25, 2.74)
	for (const post of [z - 8, z + 8]) structures.box('#ffb578', 206, 4.4, post, 1.16, 8.9, 1.38)
	structures.box('#e5b590', 206, 8.45, z, 1.19, .63, 16.7)
	streetSign(scene, 'BEACON CAUSEWAY', 206, 7.66, z + .1, 9.6, 1.18, -Math.PI / 2, '#ffcb8a')
	const {label, x: station, z: stationZ} = PLACES.dispatch
	streetSign(scene, label, station, 3.8, stationZ, 9, 1.4, -Math.PI / 2)
	for (const [a, b, name, hue, facing] of [
		[11, 78, 'MARROW CLUB', '#ff5d9e', -1], [-11, 73, 'PINK MARLIN', '#ff8a6a', 1],
		[11, 44, 'AFTERWAVE', '#5afaee', -1], [-11, 45, 'HALO ROOM', '#ba9bff', 1],
		[169, 38, 'SUNSPUR HOTEL', '#ffc783', 1],
	]) {
		streetSign(scene, name, a, 5.15, b, 8.2, 1.65, facing * Math.PI / 2, hue)
		for (const height of [4.25, 6.04]) emissive.box(hue, a - facing * .08, height, b, .061, .1, 8.4)
		if (Math.abs(a) < 15) {
			emissive.box(hue, a + facing * .32, 7.1, b + 3.8, .1, 4.1, .16)
			const halo = sprite(scene, {map, color: hue, blending: T.AdditiveBlending})
			halo.position.set(a + facing * .54, 5.1, b)
			halo.scale.set(11, 5.6, 1)
			halo.visible = true
			pools.push([a + facing * 5.1, b + 4, 5.8, 21, hue, -.012])
			glow.push(halo.material)
			const lamp = new T.PointLight(hue, 44, 15, 1.75)
			lamp.position.set(a + facing * 2, 3.1, b)
			scene.add(lamp)
		}
	}
	structures.make(scene, {roughness: .73})
	const neon = emissive.make(scene, {emissive: '#ffb4df'}, false).material
	return dark => {
		neon.emissiveIntensity = .35 + 1.25 * dark
		for (const material of glow) material.opacity = .56 * dark
	}
}
