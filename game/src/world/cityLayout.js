export const GRID = [-180, -120, -60, 0, 60, 120, 180];
export const EDGE = 202;
export const SHORE = 222;
export const LAND = [
  [-207,-205], [190,-205], [190,204], [-62,204], [-73,168], [-122,137],
  [-184,132], [-206,108],
];

export function southBank(x) {
  if (x >= -62) return 204;
  for (let i = 3; i < LAND.length - 1; i++) {
    const [a, z] = LAND[i], [b, next] = LAND[i + 1];
    if (x >= b) return z + (next - z) * (x - a) / (b - a);
  }
  return 108;
}

export const DISTRICTS = [
  { name: 'Mirage Row', x: 0, z: 72, color: '#fda374' },
  { name: 'Glasspoint', x: 3, z: -83, color: '#9bdddf' },
  { name: 'Beacon Strand', x: 172, z: 3, color: '#fed278' },
  { name: 'Brine Yards', x: -153, z: -99, color: '#89cbc2' },
  { name: 'West Locks', x: -119, z: 112, color: '#c7b5ef' },
];

export const PLACES = {
  garage: { x: 11, z: 84, label: 'ROOK’S GARAGE' },
  depot: { x: -70, z: 0, label: 'METER DEPOT' },
  strand: { x: 171, z: -8, label: 'BEACON STRAND' },
  docks: { x: -131, z: -110, label: 'BRINE YARDS' },
  tower: { x: 10, z: -151, label: 'RELAY HOUSE' },
  market: { x: 49, z: 61, label: 'NIGHT MARKET' },
  race: { x: 120, z: 125, label: 'BREAKWATER SPRINT' },
  delivery: { x: -109, z: 121, label: 'LOCKSIDE COURIER' },
  marina: { x: 215, z: 42, label: 'CINDER MARINA' },
  bridge: { x: 271, z: 120, label: 'BEACON CAUSEWAY' },
  safehouse: { x: -9.5, z: 129, label: 'THE SALT FLAT' },
};

export function closestStreet(value) {
  return GRID.reduce((best, street) => Math.abs(street - value) < Math.abs(best - value) ? street : best);
}

export function districtAt(x, z) {
  if (x > 145) return DISTRICTS[2];
  if (x < -78) return DISTRICTS[z < -11 ? 3 : 4];
  return DISTRICTS[z < -20 ? 1 : 0];
}

export function mapRoute(from, to) {
  const startX = closestStreet(from.x);
  const startZ = closestStreet(from.z);
  const endX = closestStreet(to.x);
  const endZ = closestStreet(to.z);
  if (from.x > 194 && to.x > 194) return [from, to];
  return [from, { x: startX, z: from.z }, { x: startX, z: startZ },
    { x: endX, z: startZ }, { x: endX, z: endZ }, { x: endX, z: to.z }, to];
}
