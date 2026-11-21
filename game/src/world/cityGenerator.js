import * as T from '../../vendor/three.module.min.js';
import { GRID, EDGE, SHORE, districtAt, southBank } from './cityLayout.js';
import { buildStreets } from './streets.js';
import { decoBuilding, palm, relayCrown, streetSign } from './architecture.js';
import { buildWaterfront } from './waterfront.js';
import { GeometryBatch, clamp } from '../render/geometry.js';
import { createRandom } from '../random.js';
import { buildDistrictLandmarks } from './districtStyles.js';
import { buildMarina, slips } from './marina.js';

const palettes = {
  'Mirage Row': ['#dbb8aa','#cedcce','#e6b58b','#9ac3bc','#eab8af','#cfc0d4'],
  'Beacon Strand': ['#81b0b1','#acd2c4','#edbaa3','#e4d1b2','#8aa5c6'],
  Glasspoint: ['#90aab1','#a2b9bf','#6d9dab','#b6bfc0'],
  'Brine Yards': ['#84989a','#af9f8a','#a48675'],
  'West Locks': ['#b59a95','#c7b595','#84978f','#caaba4'],
};
const signs = [['SEA GLASS','#96f7dc'], ['MOTH MOTEL','#e6acfc'], ['BAY RADIO','#8ee9fc'],
  ['PAPAYA CLUB','#ffadbe'], ['DUNE DINER','#ffcb8d'], ['AMBER MARKET','#ffce93']];

export function generateCity(scene, seed) {
  const random = createRandom(seed);
  const footprints = [], sidewalks = [];
  const cells = new Map();
  buildStreets(scene);
  const water = buildWaterfront(scene, random);
  const neon = buildDistrictLandmarks(scene);
  buildMarina(scene);
  const slabs = new GeometryBatch();
  const lights = new GeometryBatch();
  const fixtures = new GeometryBatch();

  for (const left of GRID.slice(0,-1)) for (const top of GRID.slice(0,-1)) {
    const x = left + 30, z = top + 30;
    if (southBank(left) < z + 21) continue;
    const district = districtAt(x, z).name;
    const harbor = district === 'Brine Yards';
    slabs.box(harbor ? '#aca396' : '#c4b1a1', x, .015, z, 42, .18, 42);
    sidewalks.push({ l: left + 10.4, t: top + 10.4, r: left + 49.6, b: top + 49.6 });
    const block = new GeometryBatch();
    if (x === -150 && z === 90 || x >= 90 && z === x) {
      slabs.box('#819c78', x, .122, z, 39, .07, 39);
      slabs.box('#dbc4ad', x, .16, z, 3.6, .05, 39);
      for (const s of [-13, 0, 13]) {
        palm(block, x + s, z + s, 8.7 + s * .10, s);
        block.box('#c5a079', x + s + 3, .47, z + s, 2.40, .56, .63);
      }
      footprints.push({ x, z, w: 39, d: 39, h: 0, color: '#799b77' });
    } else for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      const bx = x + dx * 10.5, bz = z + dz * 10.5;
      const w = 13.8 + random() * 3, d = 13.7 + random() * 3;
      const colors = palettes[district];
      const body = colors[Math.floor(random() * colors.length)];
      if (harbor && dx === -1) {
        for (let i = 0; i < 4; i++) block.box(['#bd644d','#4a8190','#c2a471','#87908a'][i],
          bx + (i % 2) * 4 - 2, i < 2 ? 1.35 : 4.05, bz + i * .8, 3.2, 2.7, 10);
        solid({ x: bx, z: bz + 1, w: 7.3, d: 12, h: 5.4, color: body });
        continue;
      }
      const relay = x === 30 && z === -150 && dx === -1 && dz === 1;
      const tower = relay || district === 'Glasspoint' && random() < .76;
      const h = relay ? 51 : tower ? 24 + random() * 29 : 7.2 + random() * (harbor ? 3 : 9);
      decoBuilding(block, lights, { x: bx, z: bz, w, d, h, body,
        trim: tower ? '#a9c3bd' : '#f1d6ae', glass: tower ? '#648a9f' : '#568590', style: tower ? 'tower' : 'deco' }, random);
      solid({ x: bx, z: bz, w, d, h: h + 1, color: body });
      if (relay) relayCrown(block, lights, bx, h + 1, bz);
      if (!tower && !harbor) {
        const [name, color] = signs[Math.floor(random() * signs.length)];
        const side = bx + dx * (w / 2 + .25);
        streetSign(scene, name, side, 3.85, bz, w * .72, 1.13, dx * Math.PI / 2, color);
        block.box(body, side + dx * .48, 2.98, bz, 1.43, .16, w * .74);
        lights.box(color, side + dx * 1.18, 2.98, bz, .06, .08, w * .74);
      }
    }
    if (!harbor) for (const offset of [-1, 1]) {
      palm(block, x + 19.1 * offset, z + 14 * offset, 6.6 + random() * 2.4, random() * 6);
    }
    block.make(scene, { side: T.DoubleSide });
  }

  for (const z of [-154,-119,-82]) {
    fixtures.box('#c48a5e', -201, 9.3, z, 1.65, 18.6, 1.54);
    fixtures.box('#d2946b', -191, 18.5, z, 23, .73, 1.48);
    fixtures.box('#7d5a4c', -181, 15.3, z, .10, 6.4, .1);
    lights.box('#f8bb7e', -180, 18.4, z, .45, .35, .49);
  }

  slabs.make(scene, {}, false).receiveShadow = true;
  fixtures.make(scene);
  lights.make(scene, { emissive: '#ffaa86', emissiveIntensity: .55 }, false);

  function solid(building) {
    footprints.push(building);
    const { x, z, w, d } = building;
    for (let i = Math.floor((x - w / 2 - 3) / 20); i <= Math.floor((x + w / 2 + 3) / 20); i++) {
      for (let j = Math.floor((z - d / 2 - 3) / 20); j <= Math.floor((z + d / 2 + 3) / 20); j++) {
        const key = i * 64 + j;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(building);
      }
    }
  }

  function obstacle(x, z, radius = .4, height = 0) {
    const nearby = cells.get(Math.floor(x / 20) * 64 + Math.floor(z / 20)) ?? [];
    return nearby.some(s => height < s.h && Math.abs(x - s.x) < s.w / 2 + radius && Math.abs(z - s.z) < s.d / 2 + radius);
  }
  function move(entity, x, z, radius, vehicle = false) {
    const pier = !vehicle && slips.find(line => Math.abs(entity.z - line) < 2.7);
    const bridge = Math.abs(entity.z - 120) < 8.1;
    x = clamp(x, -EDGE, bridge ? 281 : vehicle ? 195.5 : typeof pier === 'number' ? 248.4 : SHORE + 1.1);
    if (bridge && x > 195.5) z = clamp(z, 112, 128);
    else if (typeof pier === 'number' && x > SHORE + 1.1) z = clamp(z, pier - 2.65, pier + 2.65);
    z = clamp(z, -EDGE, Math.min(EDGE, southBank(x) - radius));
    const blockedX = obstacle(x, entity.z, radius);
    if (!blockedX) entity.x = x;
    const blockedZ = obstacle(entity.x, z, radius);
    if (!blockedZ) entity.z = z;
    return blockedX || blockedZ;
  }
  return { footprints, sidewalks, water, neon, obstacle, move };
}
