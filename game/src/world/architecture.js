import {T, addMesh, cylinder, texture} from 'geometry'

const signCache = new Map()
const signPlane = new T.PlaneGeometry(1, 1)

export function streetSign(scene, name, x, y, z, width, height, yaw, color = '#ffe7ba', panel = '#152c38') {
	if (!signCache.has(name)) {
		const map = texture(512, 128, ctx => {
			ctx.fillStyle = panel
			ctx.fillRect(0, 0, 512, 128)
			ctx.fillStyle = color
			ctx.font = 'bold 54px sans-serif'
			ctx.textAlign = 'center'
			ctx.fillText(name, 256, 84, 462)
		})
		signCache.set(name, new T.MeshBasicMaterial({map}))
	}
	const board = addMesh(scene, signPlane, signCache.get(name), x, y, z, false)
	board.scale.set(width, height, 1)
	board.rotation.y = yaw
}

export function decoBuilding(batch, lights, x, z, w, d, h, body, tall, random) {
	const trim = tall ? '#a9c3bd' : '#f1d6ae'
	const glass = tall ? '#648a9f' : '#568590'
	batch.box(body, x,h / 2,z, w,h,d)
	batch.box(trim, x,h + .08,z, w + .65,.37,d + .65)
	batch.box(body, x,h + .53,z, w * .88,.76,d * .88)
	if (tall) {
		batch.box(trim, x,h + 1.4,z, w * .65,1.35,d * .62)
		batch.box(glass, x,h + 2.25,z, w * .45,.6,d * .43)
		lights.box('#ff986c', x,h + 2.56,z, .23,.25,.23)
	} else {
		batch.box(trim, x,h - .38,z, w + .37,.12,d + .37)
		batch.box(trim, x,3.15,z, w + .5,.18,d + .5)
		batch.box(trim, x,1.12,z, w + .13,1.92,d + .13)
	}

	const pitch = tall ? 2.7 : 2.85
	const floors = Math.floor((h - 3.2) / pitch)
	for (const alongX of [true, false]) {
		const span = alongX ? w : d
		const columns = Math.max(2, Math.round(span / (tall ? 2.03 : 3.02)))
		const gap = span / (columns + .4)
		for (const side of [-1, 1]) {
			for (let col = 0; col < columns; col++) {
				const along = (col - (columns - 1) / 2) * gap
				const cx = alongX ? x + along : x + side * (w / 2 + .025)
				const cz = alongX ? z + side * (d / 2 + .025) : z + along
				const width = gap * (tall ? .83 : .59)
				const panel = (color, y, height, wide = width, depth = .14) =>
					batch.box(color, cx,y,cz, alongX ? wide : depth,height,alongX ? depth : wide)
				if (tall) panel(trim, h / 2, h - 2, width + .16, .08)
				else panel('#344859', 1.73, 2.26)
				for (let floor = 0; floor < floors; floor++) {
					const chance = random()
					const pane = chance < .14 ? '#d4a282' : chance < .61 ? glass : '#355665'
					panel(pane, 4.43 + floor * pitch, tall ? 2.16 : 1.46)
				}
			}
		}
	}
}

export function relayCrown(batch, lights, x, y, z) {
	batch.add(cylinder(.3, .7), '#d6b89a', x,y + 4,z, 3.5,8,3.5)
	batch.add(cylinder(.85, 1, 12), '#5596a7', x,y + 8.1,z, 5.6,2.5,5.6)
	batch.box('#51616b', x,y + 12.5,z, .18,8,.18)
	lights.ball('#ff526b', x,y + 16.6,z, .25,.25,.25)
}

export function palm(batch, x, z, height, phase) {
	batch.add(cylinder(.55,.74), '#79634b', x,height / 2,z, .44,height,.44)
	for (let i = 0; i < 10; i++) {
		const length = height * (.40 + (i % 4) * .03)
		const yaw = i * 2.4 + phase
		batch.add(leaf, i % 2 ? '#73964c' : '#406e42', x,height,z, length,length,length, .21 * (i % 3), yaw)
	}
}

const leaf = new T.BufferGeometry()
leaf.setAttribute('position', new T.Float32BufferAttribute([0,0,0, -.24,.05,-.38, 0,.25,-.41,
	.24,.05,-.38, -.15,-.10,-.69, .15,-.10,-.69, 0,-.52,-1], 3))
leaf.setIndex([0,2,1, 0,3,2, 1,2,4, 2,3,5, 2,5,4, 4,5,6])
leaf.computeVertexNormals()
