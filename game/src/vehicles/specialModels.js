import {cylinder} from '../render/geometry.js'

export function wheel(batch, color, x, y, z, radius, width, sides = 14) {
	batch.add(cylinder(1, 1, sides), color, x, y, z, radius, width, radius, 0, 0, Math.PI / 2)
}

export function buildSpecialModel(batch, type, color) {
	if (type === 'boat') {
		batch.ball(color, 0, .23, 0, 1.33, .54, 3.38)
		batch.ball('#eee5d5', 0, .58, -.42, 1.16, .18, 2.71)
		batch.boxes([
			['#263d52', 0, .9, -.48, 1.43, .47, 1.3],
			['#eacfa3', 0, .92, .84, 1.65, .62, .63],
			['#283442', 0, .52, 2.44, .56, .91, .62],
		])
		for (const rail of [-.95, .95]) batch.box('#fbdfbd', rail, .64, 0, .09, .14, 2.54)
	} else {
		batch.ball(color, 0, .91, -.66, .35, .53, .34)
		batch.boxes([
			[color, 0, .62, 0, .49, .45, 1.45],
			['#263740', 0, .91, .29, .42, .16, .75],
			['#b1bbbd', 0, 1.33, -.6, .85, .075, .08],
			['#fff1b8', 0, 1.17, -.89, .24, .16, .04],
		])
		for (const z of [-.76, .76]) {
			wheel(batch, '#202932', 0, .34, z, .336, .22)
			wheel(batch, '#b9c6c5', 0, .34, z, .16, .24, 10)
		}
	}
}
