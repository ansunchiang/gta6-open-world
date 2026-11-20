import * as T from '../../vendor/three.module.min.js';
import { GRID, EDGE, SHORE, districtAt } from './cityLayout.js';
import { buildStreets, trafficSignals } from './streets.js';
import { decoBuilding, palm, relayCrown, streetSign } from './architecture.js';
import { buildWaterfront } from './waterfront.js';
import { GeometryBatch, clamp, cylinder } from '../render/geometry.js';
import { createRandom } from '../random.js';

const palettes = {
  'Mirage Row': ['#dbb8aa', '#cedcce', '#e6b58b', '#9ac3bc', '#eab8af', '#cfc0d4'],
  'Beacon Strand': ['#81b0b1', '#acd2c4', '#edbaa3', '#e4d1b2', '#8aa5c6'],
  'Glasspoint': ['#90aab1', '#a2b9bf', '#6d9dab', '#b6bfc0', '#c1b1b9'],
  'Brine Yards': ['#abb0a2', '#79989b', '#b2a89a', '#a48675'],
  'West Locks': ['#b59a95', '#c7b595', '#84978f', '#caaba4'],
};
const shopNames = [
  ['SEA GLASS', '#96f7dc'], ['HOTEL SOLARO', '#ffab89'], ['MOTH MOTEL', '#e6acfc'],
  ['BAY RADIO', '#8ee9fc'], ['PAPAYA CLUB', '#ffadbe'], ['DUNE DINER', '#ffcb8d'],
  ['AMBER MARKET', '#ffce93'], ['LOW TIDE', '#9af5e8'], ['SUNDAY CLUB', '#f3b2df'],
];
const landmarks = [
  [10, 86, 1, 'ROOK’S GARAGE', '#ffcd87'], [-69, 0, 1, 'METER DEPOT', '#bbf4da'],
  [169, -8, -1, 'THE BEACON', '#ffc483'], [-130, -115, 1, 'BRINE TERMINAL', '#d1f6dc'],
  [10, -150, 1, 'RELAY HOUSE', '#a8f2ee'], [47, 61, -1, 'NIGHT MARKET', '#ffcb78'],
];

export function generateCity(scene, seed) {
  const random = createRandom(seed);
  const solids = [];
  const footprints = [];
  const sidewalks = [];
  buildStreets(scene);
  const water = buildWaterfront(scene, random);
  const foundation = new GeometryBatch();
  const fixtures = new GeometryBatch();
  const lights = new GeometryBatch();

  for (let ix = 0; ix < GRID.length - 1; ix++) for (let iz = 0; iz < GRID.length - 1; iz++) {
    const left = GRID[ix];
    const top = GRID[iz];
    const x = left + 30;
    const z = top + 30;
    const district = districtAt(x, z);
    const nearCore = z < -24 && x > -100 && x < 134;
    const harbor = district.name === 'Brine Yards';
    const colorSet = palettes[district.name];
    const block = new GeometryBatch();
    foundation.box(harbor ? '#aba49a' : '#c4b1a1', x, .025, z, 42, .15, 42);
    foundation.box(harbor ? '#8b9288' : '#b1a69b', x, .097, z, 36.9, .025, 36.9);
    sidewalks.push({ l: left + 10.4, t: top + 10.4, r: left + 49.6, b: top + 49.6 });
    for (const dx of [-1, 1]) {
      for (const dz of [-1, 1]) {
        const bx = x + dx * 10.5;
        const bz = z + dz * 10.5;
        const w = 13.7 + random() * 3.4;
        const d = 13.4 + random() * 3.7;
        const plaza = (ix === 3 && iz === 4 && dx === -1 && dz === 1) ||
          (ix === 5 && iz === 2 && dx === 1 && dz === 1);
        if (plaza) {
          block.box('#8a9792', bx, .14, bz, 14, .12, 14);
          block.box('#d6c4a4', bx, .31, bz, 6.8, .37, 6.8);
          block.box('#64b4b5', bx, .515, bz, 6.3, .06, 6.3);
          block.add(cylinder(.5,.8,10), '#dfc2a5', bx, 1.13, bz, .85, 1.28, .85);
          solids.push({ x: bx, z: bz, w: 6.8, d: 6.8, h: 1.8 });
          continue;
        }
        const relay = ix === 3 && iz === 0 && dx === -1 && dz === 1;
        const hotel = ix === 2 && iz === 4 && dx === 1 && dz === -1;
        const tower = nearCore && random() < .66;
        const baseHeight = tower ? 17 + random() * 32 + (x === 30 ? 7 : 0) : harbor ? 5.5 + random() * 4 : 7.4 + random() * 9.6;
        const bodyColor = colorSet[Math.floor(random() * colorSet.length)];
        const h = relay ? 51 : hotel ? 14.5 : baseHeight;
        const body = relay ? '#b3bcb6' : hotel ? '#d8978c' : bodyColor;
        const trim = tower ? '#a9c3bd' : '#f1d6ae';
        decoBuilding(block, lights, { x: bx, z: bz, w, d, h, body, trim, glass: tower ? '#648a9f' : '#568590', style: tower ? 'tower' : 'deco' }, random);
        if (relay) relayCrown(block, lights, bx, h + 1, bz);
        solids.push({ x: bx, z: bz, w: w + .25, d: d + .25, h: h + 1 });
        footprints.push({ x: bx, z: bz, w, d, h, color: body });
        if (!tower && random() > .37) {
          const [name, neon] = hotel ? ['HOTEL SOLARO', '#ffd3a6'] : shopNames[(ix * 3 + iz * 2 + (dx > 0 ? 1 : 0) + (dz > 0 ? 2 : 0)) % shopNames.length];
          const sideX = bx + dx * (w / 2 + .22);
          streetSign(scene, name, sideX, 3.79, bz, w * .72, 1.07, dx * Math.PI / 2, neon);
          block.box(body, sideX + dx * .47, 2.92, bz, 1.47, .17, w * .73);
          for (let seam = -3; seam <= 3; seam++) block.box('#f2d5b7', sideX + dx * .5, 3.015, bz + seam * w * .105, 1.49, .035, w * .047);
          lights.box(neon, sideX + dx * 1.16, 2.92, bz, .045, .06, w * .73);
          if (random() > .55) streetSign(scene, name, bx, 4.15, bz + dz * (d / 2 + .13), w * .72, 1.08, dz === 1 ? 0 : Math.PI, neon);
        }
        if (hotel) {
          const sx = bx + w / 2 + .82;
          const sz = bz + d / 2 - .77;
          block.box('#424058', sx, 8.92, sz, 1.39, 6.8, .22);
          for (const [i, letter] of Array.from('SOLARO').entries()) {
            streetSign(scene, letter, sx, 11.71 - i * 1.12, sz + .12, 1.23, 1.02, 0, '#ffc096', '#653959');
          }
          lights.box('#fb8d83', sx + .76, 8.92, sz + .024, .065, 6.76, .27);
        }
      }
    }
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      const treeX = x + dx * 19.1;
      const treeZ = z + dz * 13.9;
      if (harbor) {
        block.box('#455b60', treeX, .65, treeZ, .55, 1.3, .55);
      } else {
        palm(block, treeX, treeZ, 5.8 + random() * 3.1, random() * Math.PI * 2);
        block.box('#8b8b61', treeX, .135, treeZ, 1.36, .07, 1.36);
      }
    }
    if ((ix + iz) % 2 === 0) trafficSignals(fixtures, lights, left + 9.45, top + 10);
    block.make(scene, { side: T.DoubleSide });
  }

  for (const [x, z, side, name, color] of landmarks) {
    const yaw = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    const bracket = x + side * .85;
    fixtures.box('#344653', bracket, 2.5, z + 2.2, .19, 4.8, .21);
    fixtures.box('#344653', bracket, 2.5, z - 2.2, .19, 4.8, .21);
    streetSign(scene, name, x, 4.95, z, 5.7, 1.24, yaw, color);
  }
  for (const z of [-103, -58, 39, 71, 102]) {
    for (const x of [-9.8, 9.8]) {
      fixtures.box('#d7b79b', x, .41, z, .55, .61, 2.4);
      fixtures.box('#7c8667', x, .74, z, .5, .19, 2.15);
      fixtures.ball('#5f8261', x, .86, z, .44, .32, .8);
    }
  }

  for (const z of [-175, -150, -124, -102, -78]) {
    const x = -192 - random() * 4;
    fixtures.box('#b27767', x, 1.35, z, 3.23, 2.7, 8.5);
    fixtures.box('#819b96', x, 4.05, z + 1.65, 3.2, 2.7, 8.5);
    for (let r = -4; r < 4; r += .45) fixtures.box('#9a8071', x + 1.62, 1.35, z + r, .02, 2.46, .055);
  }
  for (const z of [-157, -117, -77]) {
    fixtures.add(cylinder(.154,.185,5), '#d78f59', -202, 10.5, z, 2.1, 21, 2.1);
    fixtures.box('#c78b67', -193, 20.9, z, 22, .68, 1);
    fixtures.box('#9c6d5a', -185, 16.4, z, .08, 8.7, .09);
    lights.box('#f9af74', -182, 21.4, z, .45, .35, .49);
  }

  const slabs = foundation.make(scene, {}, false);
  slabs.receiveShadow = true;
  fixtures.make(scene);
  lights.make(scene, { emissive: '#ffb58f', emissiveIntensity: .55 }, false);
  const cells = new Map();
  for (const solid of solids) {
    for (let i = Math.floor((solid.x - solid.w / 2 - 3) / 20); i <= Math.floor((solid.x + solid.w / 2 + 3) / 20); i++) {
      for (let j = Math.floor((solid.z - solid.d / 2 - 3) / 20); j <= Math.floor((solid.z + solid.d / 2 + 3) / 20); j++) {
        const key = i * 64 + j;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(solid);
      }
    }
  }

  function obstacle(x, z, radius = .4, height = 0) {
    const near = cells.get(Math.floor(x / 20) * 64 + Math.floor(z / 20)) ?? [];
    return near.some(solid => height < solid.h && Math.abs(x - solid.x) < solid.w / 2 + radius && Math.abs(z - solid.z) < solid.d / 2 + radius);
  }
  function move(entity, x, z, radius, vehicle = false) {
    const onPier = !vehicle && Math.abs(entity.z + 24) < 3.58;
    x = clamp(x, -EDGE, vehicle ? 195.5 : onPier ? 249.2 : SHORE + 1.1);
    if (x > SHORE + 1.1) z = clamp(z, -27.52, -20.48);
    z = clamp(z, -EDGE, EDGE);
    let bumped = false;
    if (obstacle(x, entity.z, radius)) bumped = true;
    else entity.x = x;
    if (obstacle(entity.x, z, radius)) bumped = true;
    else entity.z = z;
    return bumped;
  }
  return { footprints, sidewalks, water, obstacle, move };
}
