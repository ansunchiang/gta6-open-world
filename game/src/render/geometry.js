import * as T from '../../vendor/three.module.min.js'
export {T}

const cube = new T.BoxGeometry(1, 1, 1)
const sphere = new T.IcosahedronGeometry(1, 1)
const tubes = new Map()

export const paint = (color, settings = {}) => new T.MeshStandardMaterial({color, roughness: .8, ...settings})
export const lightPaint = color => new T.MeshBasicMaterial({color})
export const angle = (x, z) => Math.atan2(x, -z)
export const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from))
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
export const blend = (a, b, amount) => a + (b - a) * amount
export const bearing = (from, to) => angle(to.x - from.x, to.z - from.z)

export function offset({x, z, heading: yaw}, forward, right = 0, heading = yaw) {
	const sin = Math.sin(heading), cos = Math.cos(heading)
	return {x: x + sin * forward + cos * right, z: z - cos * forward + sin * right}
}

export function sprite(scene, settings) {
	const node = new T.Sprite(new T.SpriteMaterial({transparent: true, depthWrite: false, ...settings}))
	node.visible = false
	scene.add(node)
	return node
}

export function texture(width, height, draw) {
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	draw(canvas.getContext('2d'))
	const map = new T.CanvasTexture(canvas)
	map.colorSpace = T.SRGBColorSpace
	return map
}

export function advance(city, actor, reach, radius, vehicle) {
	const {x, z} = offset(actor, reach)
	return city.move(actor, x, z, radius, vehicle)
}

export function addMesh(parent, geometry, material, x, y, z, shadow = true) {
	const node = new T.Mesh(geometry, material)
	node.position.set(x, y, z)
	node.castShadow = node.receiveShadow = shadow
	parent.add(node)
	return node
}

export function box(parent, material, x, y, z, width, height, depth) {
	const node = addMesh(parent, cube, material, x, y, z)
	node.scale.set(width, height, depth)
	return node
}

export function cylinder(top, bottom, sides = 8) {
	const key = [top, bottom, sides].join('/')
	if (!tubes.has(key)) tubes.set(key, new T.CylinderGeometry(top, bottom, 1, sides))
	return tubes.get(key)
}

export class GeometryBatch {
	positions = []
	normals = []
	colors = []
	indices = []

	add(geometry, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
		const {positions, normals, colors, indices} = this
		const offset = positions.length / 3
		matrix.makeRotationFromEuler(new T.Euler(rx, ry, rz)).scale(new T.Vector3(sx, sy, sz)).setPosition(x, y, z)
		normalMatrix.getNormalMatrix(matrix)
		tint.set(color)
		const {position, normal} = geometry.attributes
		for (let i = 0; i < position.count; i++) {
			point.fromBufferAttribute(position, i).applyMatrix4(matrix).toArray(positions, positions.length)
			point.fromBufferAttribute(normal, i).applyNormalMatrix(normalMatrix).toArray(normals, normals.length)
			colors.push(tint.r, tint.g, tint.b)
			if (!geometry.index) indices.push(offset + i)
		}
		if (geometry.index) for (const i of geometry.index.array) indices.push(offset + i)
	}

	box(color, x, y, z, sx, sy, sz, ry = 0) {
		this.add(cube, color, x, y, z, sx, sy, sz, 0, ry)
	}

	boxes(rows) {
		for (const dimensions of rows) this.box(...dimensions)
	}

	ramp(color, x, y, z, width, height, depth, pitch) {
		this.add(cube, color, x, y, z, width, height, depth, pitch)
	}

	ball(color, x, y, z, sx, sy, sz) {
		this.add(sphere, color, x, y, z, sx, sy, sz)
	}

	make(parent, settings = {}, shadow = true) {
		if (!this.indices.length) return null
		const geo = new T.BufferGeometry()
		const {positions, normals, colors, indices} = this
		for (const [name, data] of [['position', positions], ['normal', normals], ['color', colors]]) {
			geo.setAttribute(name, new T.Float32BufferAttribute(data, 3))
		}
		geo.setIndex(indices)
		return addMesh(parent, geo, paint(0xffffff, {vertexColors: true, ...settings}), 0, 0, 0, shadow)
	}
}

const matrix = new T.Matrix4(), normalMatrix = new T.Matrix3()
const point = new T.Vector3(), tint = new T.Color()
