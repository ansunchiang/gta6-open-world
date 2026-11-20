import * as T from '../../vendor/three.module.min.js';
import { GRID, ROAD, EDGE } from './cityLayout.js';
import { GeometryBatch, addMesh, cylinder } from '../render/geometry.js';

const white = '#d3cbc1';
const yellow = '#e1ad58';

function pavementTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  let noise = 417;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    noise = (Math.imul(noise, 1664525) + 1013904223) | 0;
    const v = 91 + (noise >>> 25) % 20;
    ctx.fillStyle = `rgb(${v - 2},${v},${v + 7})`;
    ctx.fillRect(x, y, 1, 1);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(95, 95);
  texture.anisotropy = 4;
  return texture;
}

export function buildStreets(scene) {
  const ground = addMesh(scene, new T.PlaneGeometry(410, 410), new T.MeshStandardMaterial({
    map: pavementTexture(), roughness: 1, color: '#c7c0b9',
  }), -3, -.035, 0, false);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;

  const marks = new GeometryBatch();
  const lamps = new GeometryBatch();
  const bulbs = new GeometryBatch();
  for (const axis of [true, false]) {
    function line(color, across, along, width, length) {
      const x = axis ? across : along;
      const z = axis ? along : across;
      marks.box(color, x, -.022, z, axis ? width : length, .012, axis ? length : width);
    }
    for (const street of GRID) {
      for (let section = -240; section < 202; section += 60) {
        const center = section;
        const span = Math.max(-EDGE, section + 11);
        for (let p = span + 2; p < Math.min(EDGE, section + 48); p += 6.4) {
          line(yellow, street - .17, p, .13, 3.75);
          line(yellow, street + .17, p, .13, 3.75);
          for (const t of [-1, 1]) line(white, street + t * 6.7, p, .1, 4.8);
        }
        for (const rz of [center - 10.3, center + 10.3]) {
          if (rz < -EDGE || rz > EDGE) continue;
          for (let tick = -7; tick <= 7; tick += 1.4) line(white, street + tick, rz, .56, 2.05);
        }
        const along = section + 16;
        const across = street + ROAD / 2 + .34;
        const x = axis ? across : along;
        const z = axis ? along : across;
        if (Math.abs(x) > 192 || Math.abs(z) > 192) continue;
        lamps.add(cylinder(.06, .115), '#425257', x, 2.35, z, 1, 4.7, 1);
        lamps.box('#455154', axis ? x - .62 : x, 4.56, axis ? z : z - .62, axis ? 1.46 : .13, .09, axis ? .13 : 1.46);
        bulbs.box('#ffbf7e', axis ? x - 1.31 : x, 4.51, axis ? z : z - 1.31, axis ? .54 : .22, .085, axis ? .22 : .54);
      }
    }
  }
  const roadMarks = marks.make(scene, {}, false);
  roadMarks.receiveShadow = true;
  lamps.make(scene);
  bulbs.make(scene, { emissive: '#ed8e4e', emissiveIntensity: .9 }, false);
}

export function trafficSignals(batch, lit, x, z) {
  const steel = '#394652';
  batch.add(cylinder(.07, .11), steel, x, 2.8, z, 1, 5.6, 1);
  batch.box(steel, x - 1.45, 5.13, z, 3.0, .09, .09);
  batch.box('#232c33', x - 2.72, 4.84, z, .38, .89, .32);
  lit.box('#ff4e42', x - 2.72, 5.08, z + .18, .2, .15, .055);
  lit.box('#5ddaa4', x - 2.72, 4.59, z - .18, .2, .15, .055);
}
