import * as T from '../../vendor/three.module.min.js';
import { GRID, LAND, southBank } from './cityLayout.js';
import { GeometryBatch, addMesh, cylinder } from '../render/geometry.js';

function asphalt() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const pixels = ctx.createImageData(64, 64);
  let seed = 417;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const grey = 93 + (seed >>> 27) % 13;
    pixels.data.set([grey, grey, grey + 6, 255], i);
  }
  ctx.putImageData(pixels, 0, 0);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(.32, .32);
  return new T.MeshStandardMaterial({ map, roughness: .94 });
}

export function buildStreets(scene) {
  const shape = new T.Shape(LAND.map(([x, z]) => new T.Vector2(x, -z)));
  const ground = addMesh(scene, new T.ShapeGeometry(shape), asphalt(), 0, -.035, 0, false);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  const marks = new GeometryBatch(), lamps = new GeometryBatch();
  for (const north of [true, false]) for (const road of GRID) {
    function mark(color, across, along, width, length) {
      const x = north ? across : along, z = north ? along : across;
      if (z < southBank(x) - 2) marks.box(color, x, -.021, z, north ? width : length, .01, north ? length : width);
    }
    for (const crossing of GRID) {
      for (const sign of [-1, 1]) {
        for (let offset = 13; offset < 28; offset += 5.8) {
          const along = crossing + sign * offset;
          for (const side of [-1, 1]) {
            mark('#e5b36d', road + side * .18, along, .13, 3.7);
            mark('#d5d1c4', road + side * 6.7, along, .10, 4.2);
          }
        }
        for (let tick = -7; tick <= 7; tick += 1.4) mark('#d5d1c4', road + tick, crossing + sign * 10.3, .56, 2.0);
      }
      const x = north ? road + 9.5 : crossing + 17;
      const z = north ? crossing + 17 : road + 9.5;
      if (z > southBank(x) || Math.abs(x) > 194) continue;
      lamps.add(cylinder(.07,.11), '#414950', x, 2.36, z, 1, 4.7, 1);
      lamps.box('#d9bc97', x, 4.6, z, .57, .15, .53);
    }
  }
  marks.make(scene, {}, false).receiveShadow = true;
  lamps.make(scene);
}
