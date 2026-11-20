import * as T from '../../vendor/three.module.min.js';
import { addMesh, GeometryBatch, cylinder } from '../render/geometry.js';
import { palm, streetSign } from './architecture.js';
import { SHORE } from './cityLayout.js';

export function buildWaterfront(scene, random) {
  const sand = new GeometryBatch();
  sand.box('#e6bc88', 206, -.11, 0, 37, .13, 414);
  sand.box('#dba67b', 221, -.095, 0, 5.2, .11, 414);
  sand.box('#bea997', 192.5, .01, 0, 8.4, .20, 403);
  const boardwalk = new GeometryBatch();
  boardwalk.box('#87705a', 227, .05, -24, 42, .29, 7.8);
  boardwalk.box('#a28a71', 247, .27, -24, 8, .22, 16);
  for (let x = 207; x < 252; x += .48) boardwalk.box('#b69978', x, .21, -24, .44, .14, 7.7);
  for (let x = 210; x < 251; x += 2.6) for (const z of [-27.75, -20.25]) {
    boardwalk.box('#e5cd9b', x, .8, z, .12, 1.22, .12);
    boardwalk.box('#e5cd9b', x, 1.2, z, 2.6, .09, .10);
  }
  for (let z = -194; z < 196; z += 10) {
    const x = 197 + random() * 3.5;
    palm(boardwalk, x, z, 6.5 + random() * 2.8, random() * 6);
    if (z % 3 === 0) {
      boardwalk.box('#e3ac7f', 202.5, .34, z, 2, .13, .68);
      boardwalk.box('#7d6d58', 202.5, .19, z, 1.73, .31, .42);
    }
  }
  for (let z = -130; z < 154; z += 12) {
    const x = 207 + random() * 10;
    const color = ['#d36c65', '#64aaa8', '#f5d394', '#f0aa7a'][Math.floor(random() * 4)];
    boardwalk.add(cylinder(.18, 1, 9), color, x, 1.65, z, 1.65, .52, 1.65);
    boardwalk.box('#ddd0b5', x, .71, z, .065, 1.45, .065);
    boardwalk.box('#e9d6bd', x + .76, .13, z + .75, .65, .15, 1.42);
  }
  const beach = sand.make(scene, {}, false);
  beach.receiveShadow = true;
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
        float surf = p.x - ${SHORE.toFixed(1)};
        float swell = sin(p.x * .33 + sin(p.z * .09) - time * 1.7);
        float ripple = sin(p.x * 2.1 + p.z * 1.25 + swell * 1.6 + time * 1.5);
        float foam = pow(smoothstep(.69, 1., sin(surf * 1.1 + time * .9 + sin(p.z*.48)*.29)), 3.);
        vec3 near = mix(vec3(.13,.67,.66), vec3(.05,.40,.53), smoothstep(1., 100., surf));
        vec3 color = near + ripple * .018 + swell * .035;
        color = mix(color, vec3(.79,.93,.83), foam * exp(-surf*.21) * .8);
        float glint = pow(max(0., ripple),12.) * .19;
        color += glint * (1. - smoothstep(60., 590., surf)) * vec3(1.,.79,.59);
        color = mix(color,vec3(.48,.59,.61),smoothstep(200.,1130.,distance(cameraPosition,p)));
        gl_FragColor = vec4(color * mix(.32, 1., sun), 1.);
      }
    `,
  });
  const sea = addMesh(scene, new T.PlaneGeometry(1550, 1950), water, SHORE + 775, -.104, 0, false);
  sea.rotation.x = -Math.PI / 2;
  return water.uniforms;
}
