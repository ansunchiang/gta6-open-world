import * as T from '../../vendor/three.module.min.js';
import { GeometryBatch, distance } from '../render/geometry.js';

export function spawnHelicopter(scene, x, z, y = 14) {
  const node = new T.Group();
  const body = new GeometryBatch();
  body.ball('#223746', 0, 0, -.15, 1.52, 1.05, 2.37);
  body.ball('#68a3bc', 0, .18, -1.22, 1.34, .84, 1.32);
  body.box('#ece1ca', 0, -.35, .31, 2.79, .26, 2.08);
  body.box('#253947', 0, .28, 3.15, .58, .42, 4.7);
  body.box('#eb765b', 0, .77, 5.1, .13, 1.64, 1.37);
  for (const side of [-1, 1]) {
    body.box('#c0c5c4', side * 1.08, -1.11, -.15, .13, .13, 3.92);
    for (const z of [-1, .85]) body.box('#555d66', side * 1.08, -.77, z, .13, .75, .12);
  }
  body.make(node, { metalness: .38, roughness: .36 });
  const rotor = new T.Group();
  rotor.position.y = 1.4;
  const blades = new GeometryBatch();
  blades.box('#1e2537', 0, 0, 0, .27, .05, 11.8);
  blades.box('#1e2537', 0, 0, 0, 11.8, .05, .27);
  blades.make(rotor, {}, false);
  node.add(rotor);
  const beam = new T.Mesh(new T.CylinderGeometry(.23, 4.9, 1, 32, 1, true), new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
    vertexShader: `varying vec2 v; void main() { v = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec2 v; void main() { gl_FragColor = vec4(.31,.63,1.,.024 + .10*v.y); }`,
  }));
  const lamp = new T.PointLight('#b9ddff', 46, 19, 1.65);
  scene.add(node, beam, lamp);
  return { x, z, y, node, rotor, beam, lamp, visible: false };
}

const up = new T.Vector3(0, 1, 0);
const direction = new T.Vector3();

export function poseHelicopter(air, target, clock, heading) {
  air.node.position.set(air.x, air.y, air.z);
  air.node.rotation.set(-.09, -heading, -.13);
  air.rotor.rotation.y = clock * 29;
  direction.set(air.x - target.x, air.y - .85, air.z - target.z);
  air.beam.position.set(target.x + direction.x / 2, .085 + direction.y / 2, target.z + direction.z / 2);
  air.beam.scale.y = direction.length();
  air.beam.quaternion.setFromUnitVectors(up, direction.normalize());
  air.lamp.position.set(target.x, 3.4, target.z);
}

export function removeHelicopter(police) {
  if (!police.air) return;
  const { node, beam, lamp } = police.air;
  for (const object of [node, beam, lamp]) object.removeFromParent();
  node.traverse(object => {
    if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); }
  });
  beam.geometry.dispose();
  beam.material.dispose();
  police.air = null;
}

export function updateHelicopter(game, dt) {
  const { police, player, city, clock } = game;
  if (police.stars < 4) {
    removeHelicopter(police);
    return false;
  }
  const report = police.lastKnown;
  const air = police.air ??= spawnHelicopter(game.scene, report.x + 24, report.z - 26);
  const sweep = !police.contact && police.unseen > 2.1;
  const target = sweep ? { x: report.x + Math.sin(clock * .65) * 12, z: report.z + Math.cos(clock * .65) * 12 } : report;
  air.x += (target.x + Math.sin(clock * .46) * 10 - air.x) * dt * 1.2;
  air.z += (target.z - 11 + Math.cos(clock * .46) * 5 - air.z) * dt * 1.2;
  air.visible = distance(player, target) < 10 && distance(player, air) < 31;
  for (let t = .08; air.visible && t < 1; t += .08) {
    air.visible = !city.obstacle(player.x + (air.x - player.x) * t, player.z + (air.z - player.z) * t, .4, 1.4 + (air.y - 1.4) * t);
  }
  poseHelicopter(air, air.visible ? player : target, clock, .9 + Math.sin(clock * .35) * .35);
  return air.visible;
}
