import {T, addMesh, lightPaint} from '../render/geometry.js'

export function createMarkers(scene, {stashes, stashLocations}) {
	const material = new T.MeshBasicMaterial({side: T.DoubleSide})
	const ring = addMesh(scene, new T.RingGeometry(1.78, 1.92, 48), material, 0, .128, 0, false)
	ring.rotation.x = -Math.PI / 2
	const beacon = addMesh(scene, new T.OctahedronGeometry(.32), material, 0, 2.7, 0, false)
	const shape = new T.OctahedronGeometry(.2), mint = lightPaint('#81ddbf')
	const caches = stashLocations.map(({x, z}) => addMesh(scene, shape, mint, x, 0, z, false))

	return function update(objective, time) {
		const site = objective.point
		const wave = Math.sin(time * 2.5)
		ring.visible = beacon.visible = !!site
		if (site) {
			ring.position.set(site.x, .128, site.z)
			ring.scale.setScalar(1 + wave * .12)
			material.color.set(objective.activity ? '#8ff0de' : '#ffd485')
			beacon.position.set(site.x, 2.94 + wave * .16, site.z)
			beacon.rotation.set(.22, time * .95, .04)
		}
		caches.forEach((cache, i) => {
			cache.visible = !stashes.has(i)
			cache.rotation.y = time * 1.6 + i
			cache.position.y = .34 + Math.sin(time * 3 + i) * .09
		})
	}
}
