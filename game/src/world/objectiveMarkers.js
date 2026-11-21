import * as T from '../../vendor/three.module.min.js';
import { addMesh, lightPaint } from '../render/geometry.js';

const gold = '#ffd485';
const mint = '#8ff0de';

export function createMarkers(scene, stashes) {
  const ringMaterial = new T.MeshBasicMaterial({ color: gold, side: T.DoubleSide, transparent: true, opacity: .75, depthWrite: false });
  const ring = addMesh(scene, new T.RingGeometry(1.78, 1.92, 48), ringMaterial, 0, .14, 0, false);
  ring.rotation.x = -Math.PI / 2;
  const border = addMesh(scene, new T.OctahedronGeometry(.32), lightPaint(gold), 0, 2.7, 0, false);
  const cacheShape = new T.OctahedronGeometry(.20), cacheMaterial = lightPaint('#81ddbf');
  const caches = stashes.stashLocations.map(({ x, z }) => addMesh(scene, cacheShape, cacheMaterial, x, .28, z, false));

  return function update(objective, time) {
    const site = objective.point;
    const color = objective.activity ? mint : gold;
    const wave = Math.sin(time * 2.5);
    ring.visible = border.visible = !!site;
    if (site) {
      ring.position.set(site.x, .128, site.z);
      ring.scale.setScalar(1 + wave * .12);
      ring.material.color.set(color);
      border.position.set(site.x, 2.94 + wave * .16, site.z);
      border.rotation.set(.22, time * .95, .04);
      border.material.color.set(color);
    }
    caches.forEach((cache, i) => {
      cache.visible = !stashes.stashes.has(i);
      cache.rotation.y = time * 1.6 + i;
      cache.position.y = .34 + Math.sin(time * 3 + i) * .09;
    });
  };
}
