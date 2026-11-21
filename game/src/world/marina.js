import { GeometryBatch } from '../render/geometry.js';
import { streetSign } from './architecture.js';

export const slips = [-24, 42, 68];
export const boats = [{ x: 227, z: -29 }, { x: 232, z: 46 }, { x: 242, z: 64 }];

export function buildMarina(scene) {
  const docks = new GeometryBatch();
  for (const z of slips.slice(1)) {
    docks.box('#594e50', 226, .02, z, 44, .38, 5.7);
    for (let x = 205; x < 249; x += .75) docks.box('#b49678', x, .255, z, .7, .10, 5.6);
    for (let x = 214; x < 250; x += 5) for (const edge of [-2.7, 2.7]) {
      docks.box('#384a53', x, .5, z + edge, .21, 1.6, .21);
      docks.box('#fcdb9d', x, 1.3, z + edge, .28, .12, .28);
    }
  }
  docks.make(scene);
  streetSign(scene, 'CINDER MARINA', 205, 4.1, 42, 9, 1.3, -Math.PI / 2, '#97ead5');
}

export function marineStep(car, x, z) {
  if (x < 223.6 || x > 390 || Math.abs(z) > 215 ||
      slips.some(pier => x < 251 && Math.abs(pier - z) < (pier === -24 ? 4.1 : 3))) return true;
  Object.assign(car, { x, z });
  return false;
}
