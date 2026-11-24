import {T, addMesh, clamp} from './geometry.js'

export function createAtmosphere(scene, water) {
	scene.fog = new T.FogExp2('#aad9ea', .00089)
	const sun = new T.DirectionalLight(), {shadow} = sun
	Object.assign(shadow.camera, {left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 175})
	shadow.camera.updateProjectionMatrix()
	shadow.mapSize.setScalar(2048)
	shadow.normalBias = .038
	const fill = new T.HemisphereLight('#bad9ff', '#99859a')
	scene.add(sun, sun.target, fill)

	const {sun: day, dusk, direction: sunDir} = water
	const direction = sunDir.value
	const material = new T.ShaderMaterial({
		uniforms: {day, dusk, sunDir},
		side: T.BackSide,
		depthWrite: false,
		vertexShader: `varying vec3 ray;
			void main() {
				ray = position;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
			}`,
		fragmentShader: `
			varying vec3 ray;
			uniform vec3 sunDir;
			uniform float day, dusk;
			void main() {
				vec3 d = normalize(ray);
				float y = d.y, s = max(0., dot(d, sunDir));
				vec3 c = mix(mix(vec3(.16,.10,.25),vec3(.69,.88,.94),day),
					mix(vec3(.028,.035,.105),vec3(.09,.45,.72),day),smoothstep(-.08,.64,y));
				vec3 sunset = mix(vec3(1.,.57,.31),vec3(.79,.28,.39),smoothstep(-.04,.19,y));
				sunset = mix(sunset,vec3(.12,.20,.43),smoothstep(.04,.46,y));
				c = mix(c, sunset, dusk);
				vec2 p = vec2(atan(d.x,-d.z)*9., y*75.);
				float wave = sin(p.y + sin(p.x)*1.5 + .3*sin(2.6*p.x));
				float vapor = wave*.5 + sin(p.x*1.9+p.y*.43)*.35;
				float clouds = smoothstep(.32,.74,vapor)*smoothstep(.018,.09,y)*(1.-smoothstep(.28,.62,y));
				vec3 cloud = mix(vec3(.77,.83,.91), mix(vec3(.53,.25,.39),vec3(1.,.63,.41),
					clamp(pow(s,12.)*.82+wave*.25,0.,1.)), dusk);
				c = mix(c, cloud, clouds*(.78*day+.08));
				c += day * (pow(s,140.)*.47 + pow(s,28.)*.13) * vec3(1.,.56,.25);
				c = mix(c, vec3(1.,.93,.69), day*smoothstep(.9990,.99945,s));
				gl_FragColor = vec4(c, 1.);
			}
		`,
	})
	const sky = addMesh(scene, new T.SphereGeometry(1100, 24, 16), material, 0, 0, 0, false)
	sky.renderOrder = -10

	return (time, focus, camera) => {
		const ramp = clamp(Math.min((time - 285) / 148, (1235 - time) / 178), 0, 1)
		const daylight = day.value = ramp * ramp * (3 - 2 * ramp)
		const sunset = dusk.value = clamp(Math.min((time - 980) / 105, (1230 - time) / 121), 0, 1)
		direction.set(.26, .68 - sunset * .54, -.95).normalize()
		sky.position.copy(camera.position)
		scene.fog.color.setRGB(.03 + .39*daylight + .26*sunset, .018 + .67*daylight - .24*sunset, .064 + .76*daylight - .55*sunset)
		sun.target.position.set(focus.x, 0, focus.z)
		sun.position.copy(sun.target.position).addScaledVector(direction, 82)
		sun.color.setRGB(1, .88 - sunset * .48, .68 - sunset * .55)
		sun.intensity = daylight * (2.42 + sunset * 1.15) + .09
		sun.castShadow = daylight > .04
		fill.intensity = daylight * (1.26 - sunset * .26) + .49
	}
}
