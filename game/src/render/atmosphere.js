import {T, addMesh, clamp, offset} from './geometry.js'

export function createAtmosphere(scene) {
	scene.fog = new T.FogExp2('#aad9ea', .00165)
	const sun = new T.DirectionalLight('#fff0ce', 2.55)
	sun.castShadow = true
	Object.assign(sun.shadow.camera, {left: -54, right: 54, top: 54, bottom: -54, near: 1, far: 158})
	sun.shadow.mapSize.set(2048, 2048)
	sun.shadow.normalBias = .045
	const fill = new T.HemisphereLight('#bae8ff', '#d2a084', 1.63)
	const headlights = new T.SpotLight('#ffddaa', 0, 44, .52, .64, 1.6)
	scene.add(sun, sun.target, fill, headlights, headlights.target)

	const direction = new T.Vector3(.24, .25, -.94).normalize()
	const material = new T.ShaderMaterial({
		uniforms: {day: {value: 1}, sunDir: {value: direction}},
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
			uniform float day;
			void main() {
				vec3 d=normalize(ray);
				float y=d.y, sun=max(0.,dot(d,sunDir)), rise=smoothstep(-.07,.68,y);
				vec3 c=mix(mix(vec3(.16,.11,.31),vec3(.025,.038,.12),rise),
									 mix(vec3(.68,.89,.94),vec3(.055,.48,.78),rise),day);
				vec2 p=d.xz/(max(.055,y)+.38)*vec2(4.2,11.5);
				float vapor=sin(p.x+cos(p.y))*.5+sin(p.y*.7+p.x*1.7)*.3;
				float cloud=smoothstep(.35,.76,vapor)*smoothstep(.016,.14,y);
				c=mix(c,mix(vec3(.86,.94,1.),vec3(1.,.89,.66),pow(sun,3.)),cloud*(.67*day+.055));
				gl_FragColor=vec4(c+day*pow(sun,98.)*vec3(.37,.21,.07),1.);
			}
		`,
	})
	const sky = addMesh(scene, new T.SphereGeometry(1100, 24, 16), material, 0, 0, 0, false)
	sky.renderOrder = -10
	const coast = scene.fog.color.clone()
	const night = new T.Color('#382d63')

	function update(time, focus, camera, water) {
		const progress = clamp(Math.min((time - 285) / 148, (1240 - time) / 157), 0, 1)
		const day = .11 + .89 * progress * progress * (3 - 2 * progress)
		material.uniforms.day.value = day
		sky.position.copy(camera.position)
		scene.fog.color.copy(night).lerp(coast, day)
		sun.position.set(focus.x + 37, 47, focus.z + 24)
		sun.target.position.set(focus.x, 0, focus.z)
		sun.intensity = day * 2.23 + .22
		fill.intensity = day * 1.36 + .56
		water.sun.value = day
		const car = focus.car
		headlights.intensity = car ? (1 - day) * 99 : 0
		if (car) {
			const nose = offset(car, 2.04), ahead = offset(car, 20)
			headlights.position.set(nose.x, .77, nose.z)
			headlights.target.position.set(ahead.x, .36, ahead.z)
		}
	}
	return {update}
}
