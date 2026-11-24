import {T, addMesh, cylinder, texture} from '../render/geometry.js'

const signCache = new Map()
const signPlane = new T.PlaneGeometry(1, 1)

export function streetSign(scene, name, x, y, z, width, height, yaw, color = '#ffe7ba', panel = '#152c38') {
	if (!signCache.has(name)) {
		const map = texture(256, 64, ctx => {
			ctx.fillStyle = panel
			ctx.fillRect(0, 0, 256, 64)
			ctx.fillStyle = color
			ctx.font = 'bold 27px sans-serif'
			ctx.textAlign = 'center'
			ctx.fillText(name, 128, 42, 231)
		})
		signCache.set(name, new T.MeshBasicMaterial({map}))
	}
	const board = addMesh(scene, signPlane, signCache.get(name), x, y, z, false)
	board.scale.set(width, height, 1)
	board.rotation.y = yaw
}

export function decoBuilding(batch, lights, {x, z, w, d, h, body, tall}, random) {
	const [trim, glass, pitch] = tall ? ['#a9c3bd', '#648a9f', 2.7] : ['#f1d6ae', '#568590', 2.85]
	const tier = (color, y, width, height, depth) => batch.box(color, x, y, z, width, height, depth)
	tier(body, h / 2, w, h, d)
	tier(trim, h + .08, w + .65, .37, d + .65)
	tier(body, h + .53, w * .88, .76, d * .88)
	if (tall) {
		tier(trim, h + 1.4, w * .65, 1.35, d * .62)
		lights.box('#ff986c', x, h + 2.13, z, .23, .25, .23)
	} else {
		tier(trim, 3.15, w + .5, .18, d + .5)
		tier(trim, 1.12, w + .13, 1.92, d + .13)
	}

	const floors = Math.floor((h - 3.2) / pitch), occupancy = .12 + .18 * Math.abs(Math.sin(x * .27 + z * .41))
	for (const front of [true, false]) {
		const span = front ? w : d
		const columns = Math.round(span / (tall ? 2.03 : 3.02))
		const gap = span / (columns + .4)
		const width = gap * (tall ? .83 : .59)
		for (const side of [-1, 1]) for (let col = 0; col < columns; col++) {
			const along = (col - (columns - 1) / 2) * gap, edge = side * ((front ? d : w) / 2 + .025)
			const cx = x + (front ? along : edge), cz = z + (front ? edge : along)
			const panel = (target, color, y, height, wide = width, depth = .14) =>
				target.box(color, cx, y, cz, front ? wide : depth, height, front ? depth : wide)
			if (tall) panel(batch, trim, h / 2, h - 2, width + .16, .08)
			else panel(batch, '#344859', 1.73, 2.26)
			for (let i = 0; i < floors; i++) {
				const chance = random(), lit = chance < occupancy
				const pane = lit ? chance < .055 ? '#bfe8ff' : '#ffcb89' : chance < .61 ? glass : '#355665'
				panel(lit ? lights : batch, pane, 4.43 + i * pitch, tall ? 2.16 : 1.46)
			}
		}
	}
}

export function relayCrown(batch, lights, x, y, z) {
	batch.add(cylinder(.3, .7), '#d6b89a', x, y + 4, z, 3.5, 8, 3.5)
	batch.add(cylinder(.85, 1, 12), '#5596a7', x, y + 8.1, z, 5.6, 2.5, 5.6)
	batch.box('#51616b', x, y + 12.5, z, .18, 8, .18)
	lights.ball('#ff526b', x, y + 16.6, z, .25, .25, .25)
}

export function palm(batch, x, z, height, phase) {
	batch.add(cylinder(.55, .74), '#79634b', x, height / 2, z, .44, height, .44)
	for (let i = 0; i < 10; i++) {
		const length = height * (.40 + (i % 4) * .03)
		const yaw = i * 2.4 + phase
		const color = i % 2 ? '#73964c' : '#406e42'
		batch.add(leaf, color, x, height, z, length, length, length, .21 * (i % 3), yaw)
	}
}

const leaf = new T.BufferGeometry()
leaf.setAttribute('position', new T.Float32BufferAttribute([0,0,0, -.24,.05,-.38, 0,.25,-.41,
	.24,.05,-.38, -.15,-.10,-.69, .15,-.10,-.69, 0,-.52,-1], 3))
leaf.setIndex([0,2,1, 0,3,2, 1,2,4, 2,3,5, 2,5,4, 4,5,6])
leaf.computeVertexNormals()
