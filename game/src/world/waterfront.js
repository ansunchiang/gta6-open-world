import * as T from '../../vendor/three.module.min.js';
import { addMesh, GeometryBatch, cylinder } from '../render/geometry.js';
import { palm, streetSign } from './architecture.js';
import { SHORE } from './cityLayout.js';

export function buildWaterfront(scene, random) {
  const boardwalk = new GeometryBatch();
  boardwalk.box('#e6bc88', 206, -.11, 0, 37, .13, 414);
  boardwalk.box('#bea997', 192.5, .01, 0, 8.4, .20, 403);
  boardwalk.box('#87705a', 227, .05, -24, 42, .29, 7.8);
  boardwalk.box('#a28a71', 247, .27, -24, 8, .22, 16);
  for (let x = 207; x < 252; x += .85) boardwalk.box('#b69978', x, .21, -24, .80, .14, 7.7);
  for (const z of [-27.75, -20.25]) {
    boardwalk.box('#e5cd9b', 230, 1.2, z, 41, .09, .10);
    for (let x = 210; x < 251; x += 2.6) boardwalk.box('#e5cd9b', x, .8, z, .12, 1.22, .12);
  }
  for (let z = -194; z < 196; z += 10) {
    const x = 197 + random() * 3.5;
    palm(boardwalk, x, z, 6.5 + random() * 2.8, random() * 6);
    if (z % 3 === 0) boardwalk.box('#e3ac7f', 202.5, .26, z, 2, .30, .68);
  }
  for (let z = -130; z < 154; z += 15) {
    const x = 207 + random() * 10;
    boardwalk.add(cylinder(.18, 1, 9), z % 2 ? '#db7870' : '#63a9a5', x, 1.65, z, 1.64, .52, 1.64);
    boardwalk.box('#ddd0b5', x, .71, z, .065, 1.45, .065);
  }
  boardwalk.make(scene, { side: T.DoubleSide });
  streetSign(scene, 'BEACON STRAND', 196, 4.4, -23.8, 9, 1.45, -Math.PI / 2, '#ffbc83', '#254c52');

  const water = new T.ShaderMaterial({
    uniforms: { time: { value: 0 }, sun: { value: 1 } },
    vertexShader: `
      varying vec3 p;
      void main() {
        p = (modelMatrix * vec4(position, 1.)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
      }
    `,
    fragmentShader: `
      varying vec3 p;
      uniform float time, sun;
      void main() {
        float surf = abs(p.x - ${SHORE.toFixed(1)});
        float swell = sin(p.x * .33 + sin(p.z * .09) - time * 1.7);
        float ripple = sin(p.x * 2.1 + p.z * 1.25 + swell * 1.6 + time * 1.5);
        float foam = smoothstep(.75, 1., sin(surf + time + sin(p.z*.48)*.29));
        vec3 near = mix(vec3(.13,.67,.66), vec3(.05,.40,.53), smoothstep(1., 100., surf));
        vec3 color = near + ripple * .018 + swell * .035;
        color = mix(color, vec3(.79,.93,.83), foam * exp(-surf*.21) * .8);
        color += pow(max(0., ripple),12.) * .14;
        gl_FragColor = vec4(color * mix(.32, 1., sun), 1.);
      }
    `,
  });
  const sea = addMesh(scene, new T.PlaneGeometry(1550, 1950), water, SHORE + 775, -.104, 0, false);
  sea.rotation.x = -Math.PI / 2;
  addMesh(scene, new T.PlaneGeometry(540, 595), water, -48, -.106, 367, false).rotation.x = -Math.PI / 2;
  return water.uniforms;
}
