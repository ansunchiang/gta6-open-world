import * as T from '../../vendor/three.module.min.js';
import { addMesh, cylinder } from '../render/geometry.js';

const signCache = new Map();
const signPlane = new T.PlaneGeometry(1, 1);

export function streetSign(scene, name, x, y, z, width, height, yaw, color = '#ffe7ba', panel = '#152c38') {
  const key = name + color + panel;
  if (!signCache.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = panel;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = color;
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 256, 68, 462);
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 4;
    signCache.set(key, new T.MeshBasicMaterial({ map, color: 0xffffff }));
  }
  const board = addMesh(scene, signPlane, signCache.get(key), x, y, z, false);
  board.scale.set(width, height, 1);
  board.rotation.y = yaw;
}

export function decoBuilding(batch, lights, { x, z, w, d, h, body, trim, glass, style }, random) {
  const tall = style === 'tower';
  batch.box(body, x, h / 2, z, w, h, d);
  batch.box(trim, x, .48, z, w + .32, .82, d + .32);
  batch.box(trim, x, h + .08, z, w + .65, .37, d + .65);
  batch.box(body, x, h + .53, z, w * .88, .76, d * .88);
  if (tall) {
    batch.box(trim, x, h + 1.4, z, w * .65, 1.35, d * .62);
    batch.box(glass, x, h + 2.25, z, w * .45, .6, d * .43);
    batch.box('#4e5358', x + w * .13, h + 3.6, z, .1, 3.2, .1);
    lights.box('#ff986c', x + w * .13, h + 5.24, z, .21, .15, .21);
  } else {
    batch.box(trim, x, h - .38, z, w + .37, .12, d + .37);
    batch.box(trim, x, 3.15, z, w + .5, .18, d + .5);
    batch.box('#b3a18b', x + w * .16, h + .95, z - d * .16, 2.4, .75, 1.8);
    const base = new T.Color(body).lerp(new T.Color('#5f7b78'), .29);
    batch.box(base, x, 1.12, z, w + .13, 1.92, d + .13);
    for (const [sx, sz] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      batch.box(trim, x + sx * (w / 2 - .40), h / 2, z + sz * (d / 2 - .32), .82, h - .5, .69);
    }
  }

  const floors = Math.floor((h - 3.2) / (tall ? 2.7 : 2.85));
  for (const alongX of [true, false]) {
    const span = alongX ? w : d;
    const columns = Math.max(2, Math.round(span / (tall ? 2.03 : 3.02)));
    const gap = span / (columns + .4);
    for (const side of [-1, 1]) {
      for (let col = 0; col < columns; col++) {
        const along = (col - (columns - 1) / 2) * gap;
        const cx = alongX ? x + along : x + side * (w / 2 + .025);
        const cz = alongX ? z + side * (d / 2 + .025) : z + along;
        const width = gap * (tall ? .83 : .59);
        if (tall) {
          batch.box(trim, cx, h / 2, cz, alongX ? width + .16 : .075, h - 2, alongX ? .075 : width + .16);
        } else {
          batch.box('#344859', cx, 1.73, cz, alongX ? width : .105, 2.26, alongX ? .105 : width);
          const frame = '#a9a190';
          batch.box(frame, cx, 2.19, cz, alongX ? width : .143, .068, alongX ? .143 : width);
          batch.box(frame, cx, 1.26, cz, alongX ? .065 : .143, 1.83, alongX ? .143 : .065);
        }
        for (let floor = 0; floor < floors; floor++) {
          const cy = 4.43 + floor * (tall ? 2.7 : 2.85);
          const warm = random() < (tall ? .16 : .08);
          const pane = warm ? (random() < .5 ? '#c9916a' : '#f3c193') : (random() < .36 ? glass : '#355665');
          batch.box(pane, cx, cy, cz, alongX ? width : .14, tall ? 2.16 : 1.46, alongX ? .14 : width);
          if (!tall) batch.box(trim, cx, cy - .79, cz, alongX ? width + .28 : .32, .12, alongX ? .32 : width + .28);
        }
      }
    }
  }
}

export function relayCrown(batch, lights, x, y, z) {
  for (const offset of [-3.25, 3.25]) {
    batch.add(cylinder(.37,.59,7), '#ccb699', x + offset, y + 3.9, z, 1.75, 7.8, 1.75);
  }
  batch.add(cylinder(.91,1,12), '#e3c4a1', x, y + 7.6, z, 5.55, 1.37, 5.55);
  batch.add(cylinder(1,1,12), '#436b7d', x, y + 8.71, z, 5.22, 1.59, 5.22);
  batch.add(cylinder(.77,1,12), '#f1c59d', x, y + 9.88, z, 5.59, .93, 5.59);
  batch.add(cylinder(.1,.29,7), '#49535e', x, y + 14.2, z, 1, 7.8, 1);
  batch.box('#56666b', x, y + 14.1, z, 4.4, .15, .15);
  lights.ball('#ff526b', x, y + 18.28, z, .23, .24, .23);
}

export function palm(batch, x, z, height, phase) {
  const trunk = cylinder(.55, .74);
  const leaf = new T.BufferGeometry();
  const points = [0, 0, 0, -.24, .05, -.32, 0, .34, -.38, .24, .05, -.32, -.19, -.09, -.66, 0, -.1, -.7, .19, -.09, -.66, 0, -.53, -1];
  leaf.setAttribute('position', new T.Float32BufferAttribute(points, 3));
  leaf.setIndex([0, 2, 1, 0, 3, 2, 1, 2, 5, 1, 5, 4, 2, 3, 5, 3, 6, 5, 4, 5, 7, 5, 6, 7]);
  leaf.computeVertexNormals();
  batch.add(trunk, '#79634b', x + .07, height / 2, z, .44, height, .44, 0, 0, -.025);
  for (let i = 1; i < 9; i++) {
    batch.add(trunk, '#ac8a65', x + i * .013, height * i / 10, z, .47, .045, .47);
  }
  batch.ball('#736c3e', x + .16, height, z, .45, .35, .44);
  const greens = ['#4e7c41', '#6e924a', '#3c6943', '#889b52'];
  for (let i = 0; i < 10; i++) {
    const length = height * (.41 + ((i * 7) % 5) * .023);
    const yaw = i * 2.4 + phase;
    batch.add(leaf, greens[i % greens.length], x + .16, height, z, length, length, length, .14 * (i % 3), yaw);
    batch.add(leaf, greens[(i + 1) % greens.length], x + .16, height + .012, z, length, -length, length, .33 + .13 * (i % 3), yaw);
  }
}
