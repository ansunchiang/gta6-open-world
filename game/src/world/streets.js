import {GRID, LAND, southBank} from './cityLayout.js'
import {T, GeometryBatch, cylinder, groundShape, texture} from '../render/geometry.js'
import {createRandom} from '../random.js'

function asphalt() {
	const map = texture(64, 64, ctx => {
		const pixels = ctx.createImageData(64, 64)
		const random = createRandom(417)
		for (let i = 0; i < 4096; i++) {
			const grey = 93 + Math.floor(random() * 13)
			pixels.data.set([grey, grey, grey + 6, 255], i * 4)
		}
		ctx.putImageData(pixels, 0, 0)
	})
	map.wrapS = map.wrapT = T.RepeatWrapping
	map.repeat.set(.32, .32)
	return new T.MeshStandardMaterial({map, roughness: .83})
}

export function buildStreets(scene, lampsOn) {
	groundShape(scene, LAND, asphalt(), -.035)
	const marks = new GeometryBatch(), lamps = new GeometryBatch()
	for (const north of [true, false]) for (const road of GRID) {
		function mark(color, across, along, width, length) {
			const x = north ? across : along, z = north ? along : across
			if (z >= southBank(x) - 2) return
			const [w, d] = north ? [width, length] : [length, width]
			marks.box(color, x, -.021, z, w, .01, d)
		}
		for (const crossing of GRID) {
			for (const side of [-1, 1]) {
				for (const step of [13, 19, 25]) {
					mark('#e5b36d', road + .2, crossing + side * step, .36, 3.7)
					mark('#d5d1c4', road + side * 6.7, crossing + step, .10, 4.2)
				}
				for (let tick = -7; tick <= 7; tick += 1.4) mark('#d5d1c4', road + tick, crossing + side * 10.3, .56, 2)
			}
			const edge = road + 9.5, corner = crossing + 17
			const [x, z] = north ? [edge, corner] : [corner, edge]
			if (z > southBank(x) || Math.abs(x) > 194) continue
			lamps.add(cylinder(.07, .11), '#414950', x, 2.36, z, 1, 4.7, 1)
			lamps.box('#d9bc97', x, 4.6, z, .57, .15, .53)
			lampsOn.push([x - (north ? 2 : 0), z - (north ? 0 : 2), 10, 10, '#c3a27d', .13])
		}
	}
	marks.make(scene, {}, false).receiveShadow = true
	lamps.make(scene)
}
