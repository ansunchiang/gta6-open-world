import {T, addMesh, GeometryBatch, cylinder} from '../render/geometry.js'
import {palm, streetSign} from './architecture.js'
import {SHORE} from './cityLayout.js'

export function buildWaterfront(scene, random) {
	const boardwalk = new GeometryBatch()
	const pier = -24
	boardwalk.boxes([
		['#e6bc88', 206, -.11, 0, 37, .13, 414],
		['#bea997', 192.5, .01, 0, 8.4, .2, 403],
		['#87705a', 227, .05, pier, 42, .29, 7.8],
		['#a28a71', 247, .27, pier, 8, .22, 16],
	])
	for (let x = 207; x < 252; x++) boardwalk.box('#b69978', x, .21, pier, .94, .14, 7.7)
	for (const z of [-27.75, -20.25]) {
		boardwalk.box('#e5cd9b', 230, 1.2, z, 41, .09, .1)
		for (let x = 210; x < 251; x += 2.6) boardwalk.box('#e5cd9b', x, .8, z, .12, 1.22, .12)
	}
	for (let z = -194; z < 196; z += 10) palm(boardwalk, 197 + random() * 3.5, z, 6.5 + random() * 2.8, random() * 6)
	for (let z = -130; z < 154; z += 15) {
		const x = 207 + random() * 10
		const canopy = z % 2 ? '#db7870' : '#63a9a5'
		boardwalk.add(cylinder(.18, 1, 9), canopy, x, 1.65, z, 1.64, .52, 1.64)
		boardwalk.box('#ddd0b5', x, .71, z, .065, 1.45, .065)
	}
	boardwalk.make(scene, {side: T.DoubleSide})
	streetSign(scene, 'BEACON STRAND', 196, 4.4, -23.8, 9, 1.45, -Math.PI / 2, '#ffbc83', '#254c52')

	const water = new T.ShaderMaterial({
		uniforms: {time: {value: 0}, sun: {value: 1}},
		vertexShader: `varying vec3 p;
			void main() {
				p = (modelMatrix * vec4(position, 1.)).xyz;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
			}`,
		fragmentShader: `
			varying vec3 p;
			uniform float time, sun;
			void main() {
				float surf = abs(p.x - ${SHORE.toFixed(1)} + 1.5 * sin(p.z * .23));
				float swell = sin(p.x * .33 + sin(p.z * .09) - time * 1.7);
				float ripple = sin(p.x * 2.1 + p.z * 1.25 + swell * 1.6 + time * 1.5);
				vec3 c = mix(vec3(.08,.81,.76), vec3(.018,.46,.62), smoothstep(1.,100.,surf));
				c += ripple * .018 + swell * .032 + pow(max(0.,ripple),12.) * .12;
				c += pow(max(0.,sin(surf + time)), 8.) * exp(-surf*.21) * .28;
				float fog = smoothstep(115.,900.,length(p - cameraPosition));
				vec3 horizon = mix(vec3(.16,.11,.31),vec3(.67,.88,.94),sun);
				gl_FragColor = vec4(mix(c * mix(.32,1.,sun), horizon, fog),1.);
			}`,
	})
	addMesh(scene, new T.PlaneGeometry(4800, 4800), water, 0, -.14, 0, false).rotation.x = -Math.PI / 2
	return water.uniforms
}
