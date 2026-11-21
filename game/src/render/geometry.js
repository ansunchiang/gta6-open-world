import * as T from '../../vendor/three.module.min.js';

const cube = new T.BoxGeometry(1, 1, 1);
const sphere = new T.IcosahedronGeometry(1, 1);
const tubes = new Map();

export const paint = (color, settings = {}) => new T.MeshStandardMaterial({ color, roughness: .8, ...settings });
export const lightPaint = color => new T.MeshBasicMaterial({ color });
export const angle = (x, z) => Math.atan2(x, -z);
export const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const blend = (a, b, amount) => a + (b - a) * amount;

export function addMesh(parent, geometry, material, x, y, z, shadow = true) {
  const node = new T.Mesh(geometry, material);
  node.position.set(x, y, z);
  node.castShadow = shadow;
  node.receiveShadow = shadow;
  parent.add(node);
  return node;
}

export function box(parent, material, x, y, z, width, height, depth) {
  const node = addMesh(parent, cube, material, x, y, z);
  node.scale.set(width, height, depth);
  return node;
}

export function cylinder(top, bottom, sides = 8) {
  const key = [top, bottom, sides].join('/');
  if (!tubes.has(key)) tubes.set(key, new T.CylinderGeometry(top, bottom, 1, sides));
  return tubes.get(key);
}

export class GeometryBatch {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.indices = [];
    this.matrix = new T.Matrix4();
    this.normalMatrix = new T.Matrix3();
    this.point = new T.Vector3();
    this.normal = new T.Vector3();
    this.color = new T.Color();
  }

  add(geometry, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const index = this.positions.length / 3;
    this.matrix.makeRotationFromEuler(new T.Euler(rx, ry, rz));
    this.matrix.scale(new T.Vector3(sx, sy, sz)).setPosition(x, y, z);
    this.normalMatrix.getNormalMatrix(this.matrix);
    this.color.set(color);
    const { position, normal } = geometry.attributes;
    for (let i = 0; i < position.count; i++) {
      this.point.fromBufferAttribute(position, i).applyMatrix4(this.matrix);
      this.normal.fromBufferAttribute(normal, i).applyNormalMatrix(this.normalMatrix);
      this.positions.push(this.point.x, this.point.y, this.point.z);
      this.normals.push(this.normal.x, this.normal.y, this.normal.z);
      this.colors.push(this.color.r, this.color.g, this.color.b);
      if (!geometry.index) this.indices.push(index + i);
    }
    if (geometry.index) for (const i of geometry.index.array) this.indices.push(index + i);
  }

  box(color, x, y, z, sx, sy, sz, ry = 0) {
    this.add(cube, color, x, y, z, sx, sy, sz, 0, ry);
  }

  ball(color, x, y, z, sx, sy, sz) {
    this.add(sphere, color, x, y, z, sx, sy, sz);
  }

  make(parent, settings = {}, shadow = true) {
    if (!this.indices.length) return null;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(this.positions, 3));
    geo.setAttribute('normal', new T.Float32BufferAttribute(this.normals, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(this.colors, 3));
    geo.setIndex(this.indices);
    return addMesh(parent, geo, paint(0xffffff, { vertexColors: true, ...settings }), 0, 0, 0, shadow);
  }
}
