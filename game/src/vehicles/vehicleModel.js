import * as T from '../../vendor/three.module.min.js';
import { box, cylinder, GeometryBatch, lightPaint, paint } from '../render/geometry.js';

export const VEHICLE_TYPES = {
  volta: { name: 'Volta R7', width: 1.88, length: 4.22, roof: .53, top: 37, accel: 13.5, cabin: .12 },
  reed: { name: 'Reed Sable', width: 1.78, length: 3.85, roof: .7, top: 31, accel: 10, cabin: -.05 },
  taxi: { name: 'Oriole Cab', width: 1.86, length: 4.56, roof: .70, top: 32, accel: 9.7, cabin: .08 },
  van: { name: 'Brine Courier', width: 1.98, length: 4.68, roof: 1.03, top: 27, accel: 7.8, cabin: .32 },
  patrol: { name: 'Harbor Interceptor', width: 1.96, length: 4.56, roof: .68, top: 36, accel: 12.5, cabin: .08 },
};

const bodyShapes = new Map();
const lampWhite = lightPaint('#fff0c8');
const lampRed = lightPaint('#ff253a');
const lampBlue = lightPaint('#47b7ff');
const darkRed = lightPaint('#6f2230');
const darkBlue = lightPaint('#233c77');
const glass = '#263d52';

function cabinGeometry() {
  const geo = new T.BufferGeometry();
  const bottom = [[-.5, 0, -.5], [.5, 0, -.5], [.5, 0, .5], [-.5, 0, .5]];
  const top = [[-.42, 1, -.27], [.42, 1, -.27], [.42, 1, .29], [-.42, 1, .29]];
  const faces = [[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0],[4,7,6,5]];
  const all = [...bottom, ...top];
  const positions = [];
  for (const [a,b,c,d] of faces) for (const i of [a,c,b,a,d,c]) positions.push(...all[i]);
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}
const cabin = cabinGeometry();

function bodyGeometry(type, color) {
  const key = type + color;
  if (bodyShapes.has(key)) return bodyShapes.get(key);
  const spec = VEHICLE_TYPES[type];
  const { width: w, length: l, roof, cabin: offset } = spec;
  const police = type === 'patrol';
  const batch = new GeometryBatch();
  const accent = new T.Color(color).lerp(new T.Color('#192833'), .33);
  batch.box('#21303a', 0, .43, 0, w * .85, .41, l * .94);
  batch.box(color, 0, .665, 0, w, .44, l * .94);
  batch.box(accent, 0, .51, 0, w * 1.013, .11, l * .975);
  batch.box(color, 0, .83, -l * .337, w * .94, .14, l * .29);
  batch.box(color, 0, .86, l * .377, w * .965, .19, l * .222);
  batch.box('#292e38', 0, .524, -l * .478, w * .94, .19, .13);
  batch.box('#30313b', 0, .52, l * .481, w * .96, .17, .12);
  batch.box('#293840', 0, .72, -l * .482, w * .39, .12, .026);
  batch.box('#d4cbab', 0, .62, l * .549 - .22, .35, .108, .03);
  batch.add(cabin, glass, 0, .89, offset, w * .88, roof, l * .57);
  batch.box(color, 0, .898 + roof, offset + .01, w * .766, .075, l * .333);
  batch.box('#698498', 0, .91 + roof * .72, offset - l * .197, w * .62, .025, .032);
  if (type === 'van') batch.box(color, 0, 1.16, l * .28, w * .867, .59, l * .32);
  for (const side of [-1, 1]) {
    batch.box(police ? '#f1e4ce' : accent, side * (w / 2 + .015), .7, .1, .035, .26, l * .45);
    batch.box(police ? '#d5a661' : '#ded4b3', side * (w / 2 + .037), .76, .28, .025, .035, .16);
    batch.box('#334957', side * w * .413, 1.115, offset + .10, .05, .43, .073);
    batch.box(accent, side * w * .56, 1.02, offset - l * .235, .235, .105, .16);
    for (const z of [-l * .305, l * .301]) {
      batch.add(cylinder(1,1,14), '#25272c', side * w * .46, .328, z, .337, .24, .337, 0, 0, Math.PI / 2);
      batch.add(cylinder(1,1,10), '#adb1a9', side * w * .527, .328, z, .211, .025, .211, 0, 0, Math.PI / 2);
      batch.add(cylinder(1,1,6), '#4e5860', side * w * .543, .328, z, .098, .028, .098, 0, 0, Math.PI / 2);
    }
  }
  if (type === 'volta') {
    batch.box('#393643', 0, 1.03, l * .447, w * 1.01, .076, .26);
    for (const x of [-.59, .59]) batch.box('#34333d', x, .952, l * .435, .07, .14, .085);
    for (const x of [-.63, .63]) {
      batch.add(cylinder(1,1,9), '#a29084', x, .45, l * .489, .088, .13, .088, Math.PI / 2);
      batch.box('#d98368', x, .83, -l * .35, .115, .026, .7);
    }
    batch.box('#493b42', 0, .725, l * .49, .58, .086, .026);
  }
  if (type === 'taxi') batch.box('#f4d284', 0, 1.72, offset, .64, .24, .26);
  if (police) {
    batch.box('#142e42', 0, 1.65, offset, 1.4, .11, .27);
    batch.box('#d8dbcd', 0, .919, l * .346, 1.09, .07, .22);
  }
  const model = batch.make(new T.Group(), { roughness: .52, metalness: .16, side: T.DoubleSide });
  bodyShapes.set(key, model);
  return model;
}

export function createVehicleModel(scene, type, color) {
  const node = new T.Group();
  node.add(bodyGeometry(type, color).clone());
  const { width: w, length: l, cabin: offset } = VEHICLE_TYPES[type];
  const lights = [];
  for (const side of [-1, 1]) {
    box(node, lampWhite, side * w * .337, .758, -l * .482, .39, .112, .041).castShadow = false;
    box(node, lampRed, side * w * .337, .759, l * .493, .39, .105, .036).castShadow = false;
    if (type === 'patrol') {
      const bulb = box(node, side < 0 ? lampRed : lampBlue, side * .39, 1.76, offset, .55, .155, .28);
      bulb.castShadow = false;
      lights.push(bulb);
    }
  }
  const door = new T.Group();
  door.position.set(-w * .51, 0, -.72);
  const doorPaint = paint(color, { roughness: .52, metalness: .16 });
  box(door, doorPaint, 0, .74, .56, .078, .325, 1.12);
  box(door, paint(glass), 0, 1.02, .61, .049, .25, .73);
  box(door, doorPaint, 0, 1.16, .63, .059, .045, .74);
  door.visible = false;
  node.add(door);
  scene.add(node);
  return { node, lights, door };
}

export function flashSiren(car, time) {
  if (!car.lights.length) return;
  const phase = Math.floor(time * 9 + car.phase * 3) % 4;
  car.lights[0].material = phase < 2 ? lampRed : darkRed;
  car.lights[1].material = phase > 0 ? lampBlue : darkBlue;
}
