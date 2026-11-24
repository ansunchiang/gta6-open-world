import {T, addMesh, GeometryBatch, cylinder, groundShape} from '../render/geometry.js'
import {palm, streetSign} from './architecture.js'
import {BEACH, PROMENADE, SHORE} from './cityLayout.js'

export const slips = [-24, 42, 68]
export const boats = [{x: 227, z: -29}, {x: 232, z: 46}, {x: 242, z: 64}]

export function marineStep(car, x, z) {
	if (x < 223.6 || x > 390 || Math.abs(z) > 215 ||
			slips.some(pier => x < 251 && Math.abs(pier - z) < (pier < 0 ? 4.1 : 3))) return true
	Object.assign(car, {x, z})
	return false
}

export function buildWaterfront(scene, random) {
	const boardwalk = new GeometryBatch()
	for (const z of slips) {
		const span = z < 0 ? 7.8 : 5.7
		boardwalk.box('#594e50', 226, .02, z, 44, .38, span)
		for (let x = 205; x < 249; x += .75) boardwalk.box('#b49678', x, .255, z, .7, .1, span - .1)
		for (let x = 214; x < 250; x += 5) for (const rail of [z - span * .47, z + span * .47]) {
			boardwalk.box('#384a53', x, .5, rail, .21, 1.6, .21)
			boardwalk.box('#fcdb9d', x, 1.3, rail, .28, .12, .28)
		}
	}
	boardwalk.box('#a28a71', 247, .27, -24, 8, .22, 16)
	boardwalk.box('#bea997', 192.5, .01, 0, 8.4, .2, 403)
	groundShape(scene, [[189,-205], ...BEACH, [189,204]], new T.MeshStandardMaterial({color: '#e6bc88'}), -.045)
	for (let i = 1; i < PROMENADE.length; i++) {
		const [x, z] = PROMENADE[i - 1], [a, b] = PROMENADE[i]
		boardwalk.box('#bca48d', (x+a)/2, -.026, (z+b)/2, 2.9, .04, Math.hypot(a-x,b-z) + 1, Math.atan2(a-x,b-z))
	}
	for (let z = -194; z < 196; z += 10) palm(boardwalk, 197 + random() * 3.5, z, 6.5 + random() * 2.8, random() * 6)
	for (let z = -130; z < 154; z += 15) {
		const x = 207 + random() * 10
		boardwalk.add(cylinder(.18, 1, 9), z % 2 ? '#db7870' : '#63a9a5', x, 1.65, z, 1.64, .52, 1.64)
		boardwalk.box('#ddd0b5', x, .71, z, .065, 1.45, .065)
	}
	boardwalk.make(scene, {side: T.DoubleSide})
	streetSign(scene, 'BEACON STRAND', 196, 4.4, -23.8, 9, 1.45, -Math.PI / 2, '#ffbc83', '#254c52')
	streetSign(scene, 'CINDER MARINA', 205, 4.1, 42, 9, 1.3, -Math.PI / 2, '#97ead5')

	const water = new T.ShaderMaterial({
		uniforms: {time: {value: 0}, sun: {value: 1}, dusk: {value: 0}, direction: {value: new T.Vector3()}},
		vertexShader: `varying vec3 p;
			void main() {
				p = (modelMatrix * vec4(position, 1.)).xyz;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
			}`,
		fragmentShader: `
			varying vec3 p;
			uniform float time, sun, dusk;
			uniform vec3 direction;
			void main() {
				float surf = abs(p.x - ${SHORE.toFixed(1)} + 1.5 * sin(p.z * .23));
				float swell = sin(p.x * .33 + sin(p.z * .09) - time * 1.7);
				float ripple = sin(p.x * 2.1 + p.z * 1.25 + swell * 1.6 + time * 1.5);
				ripple *= 1.-smoothstep(.35,1.5,fwidth(ripple));
				vec3 c = mix(vec3(.27,.78,.72), vec3(.036,.31,.43), smoothstep(1.,84.,surf));
				c += ripple*.023 + swell*.027 + pow(max(0.,sin(surf+time)),8.)*exp(-surf*.18)*.37;
				vec3 eye = cameraPosition - p;
				vec3 normal = normalize(vec3(.12*ripple, 1., .10*swell));
				float reflection = max(0.,dot(reflect(-normalize(eye),normal),direction));
				float shimmer = max(0.,ripple * sin(.71*p.z - 1.53*p.x - time*2.));
				float glint = pow(reflection,88.)*(.19+.78*shimmer*shimmer) + pow(reflection,19.)*.22;
				vec3 horizon = mix(mix(vec3(.16,.10,.25),vec3(.69,.88,.94),sun),vec3(.98,.55,.32),dusk);
				float fog = smoothstep(240.,1450.,length(eye));
				c = c*(.24+.76*sun) + glint*sun*mix(vec3(.74,.88,.93),vec3(1.,.61,.26),dusk);
				gl_FragColor = vec4(mix(c,horizon,fog),1.);
			}`,
	})
	addMesh(scene, new T.PlaneGeometry(4800, 4800), water, 0, -.14, 0, false).rotation.x = -Math.PI / 2
	return water.uniforms
}
