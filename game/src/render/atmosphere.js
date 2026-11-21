import * as T from '../../vendor/three.module.min.js';
import { addMesh, clamp } from './geometry.js';

export function createAtmosphere(scene) {
  scene.fog = new T.FogExp2('#cda792', .0036);
  const sun = new T.DirectionalLight('#ffe2b4', 2.55);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -54, right: 54, top: 54, bottom: -54, near: 1, far: 158 });
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.normalBias = .045;
  scene.add(sun, sun.target);
  const fill = new T.HemisphereLight('#c8deff', '#7e5c52', 1.63);
  scene.add(fill);
  const headlights = new T.SpotLight('#ffddaa', 0, 44, .52, .64, 1.6);
  scene.add(headlights, headlights.target);

  const direction = new T.Vector3(-.036, .108, -.99).normalize();
  const material = new T.ShaderMaterial({
    uniforms: { day: { value: 1 }, sunDir: { value: direction } },
    side: T.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 ray;
      void main() {
        ray = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      varying vec3 ray;
      uniform vec3 sunDir;
      uniform float day;
      float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p) {
        vec2 f=fract(p), i=floor(p);
        f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
      }
      void main() {
        vec3 d=normalize(ray);
        float y=d.y;
        float dotSun=max(0.,dot(d,sunDir));
        vec3 horizon=mix(vec3(.085,.15,.28),vec3(.97,.64,.49),day);
        vec3 zenith=mix(vec3(.015,.034,.095),vec3(.23,.53,.73),day);
        vec3 c=mix(horizon,zenith,smoothstep(-.07,.68,y));
        vec2 p=d.xz/(max(.055,y)+.38)*vec2(4.2,11.5) + vec2(8.2,y*23.);
        float n=noise(p)*.63+noise(p*2.1)*.25+noise(p*5.1)*.12;
        float cloud=smoothstep(.51,.72,n)*smoothstep(.016,.14,y)*(1.-smoothstep(.35,.87,y));
        vec3 tint=mix(vec3(.53,.51,.60),vec3(1.,.80,.67),pow(dotSun,3.));
        c=mix(c,tint,cloud*.67*day + cloud*.055);
        c+=day*pow(dotSun,98.)*vec3(.34,.17,.056);
        c=mix(c,vec3(1.,.94,.75),smoothstep(.99930,.99946,dotSun)*day);
        gl_FragColor=vec4(c,1.);
      }
    `,
  });
  const sky = addMesh(scene, new T.SphereGeometry(490, 24, 16), material, 0, 0, 0, false);
  sky.renderOrder = -10;
  const dusk = new T.Color('#cda792');
  const night = new T.Color('#233752');

  function update(time, focus, camera, water) {
    const progress = clamp(Math.min((time - 285) / 148, (1240 - time) / 157), 0, 1);
    const day = .11 + .89 * progress * progress * (3 - 2 * progress);
    material.uniforms.day.value = day;
    sky.position.copy(camera.position);
    scene.fog.color.copy(night).lerp(dusk, day);
    sun.position.set(focus.x - 42, 35, focus.z - 51);
    sun.target.position.set(focus.x, 0, focus.z);
    sun.intensity = day * 2.23 + .22;
    fill.intensity = day * 1.19 + .58;
    water.sun.value = day;
    const car = focus.car;
    headlights.intensity = car ? (1 - day) * 99 : 0;
    if (car) {
      const dx = Math.sin(car.heading);
      const dz = -Math.cos(car.heading);
      headlights.position.set(car.x + dx * 2.04, .77, car.z + dz * 2.04);
      headlights.target.position.set(car.x + dx * 20, .36, car.z + dz * 20);
    }
  }
  return { update };
}
