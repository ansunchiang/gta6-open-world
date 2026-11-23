import {T, addMesh, lightPaint} from 'geometry'

const gold = '#ffd485'
const mint = '#8ff0de'

export function createMarkers(scene, {stashes, stashLocations}) {
	const material = new T.MeshBasicMaterial({side: T.DoubleSide, transparent: true, opacity: .75, depthWrite: false})
	const ring = addMesh(scene, new T.RingGeometry(1.78, 1.92, 48), material, 0, .128, 0, false)
	ring.rotation.x = -Math.PI / 2
	const beacon = addMesh(scene, new T.OctahedronGeometry(.32), lightPaint(gold), 0, 2.7, 0, false)
	const cacheShape = new T.OctahedronGeometry(.20), cacheMaterial = lightPaint('#81ddbf')
	const caches = stashLocations.map(({x, z}) => addMesh(scene, cacheShape, cacheMaterial, x, .28, z, false))

	return function update(objective, time) {
		const site = objective.point
		const color = objective.activity ? mint : gold
		const wave = Math.sin(time * 2.5)
		ring.visible = beacon.visible = !!site
		if (site) {
			const {x, z} = site
			ring.position.set(x, .128, z)
			ring.scale.setScalar(1 + wave * .12)
			ring.material.color.set(color)
			beacon.position.set(x, 2.94 + wave * .16, z)
			beacon.rotation.set(.22, time * .95, .04)
			beacon.material.color.set(color)
		}
		caches.forEach((cache, i) => {
			cache.visible = !stashes.has(i)
			cache.rotation.y = time * 1.6 + i
			cache.position.y = .34 + Math.sin(time * 3 + i) * .09
		})
	}
}
