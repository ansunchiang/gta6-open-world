export const GRID = [-180, -120, -60, 0, 60, 120, 180];
export const ROAD = 18;
export const EDGE = 202;
export const SHORE = 222;

export const DISTRICTS = [
  { name: 'Mirage Row', subtitle: 'ART DECO QUARTER', x: 0, z: 72, color: '#fda374' },
  { name: 'Glasspoint', subtitle: 'CIVIC CORE', x: 3, z: -83, color: '#9bdddf' },
  { name: 'Beacon Strand', subtitle: 'EAST WATERFRONT', x: 172, z: 3, color: '#fed278' },
  { name: 'Brine Yards', subtitle: 'WORKING HARBOR', x: -153, z: -99, color: '#89cbc2' },
  { name: 'West Locks', subtitle: 'CANAL DISTRICT', x: -119, z: 112, color: '#c7b5ef' },
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
};

export function closestStreet(value) {
  return GRID.reduce((best, street) => Math.abs(street - value) < Math.abs(best - value) ? street : best);
}

export function districtAt(x, z) {
  if (x > 145) return DISTRICTS[2];
  if (x < -78) return DISTRICTS[z < -11 ? 3 : 4];
  return DISTRICTS[z < -20 ? 1 : 0];
}

export function isRoad(x, z) {
  return Math.abs(x - closestStreet(x)) < ROAD / 2 || Math.abs(z - closestStreet(z)) < ROAD / 2;
}

export function mapRoute(from, to) {
  const startX = closestStreet(from.x);
  const startZ = closestStreet(from.z);
  const endX = closestStreet(to.x);
  const endZ = closestStreet(to.z);
  const first = Math.abs(from.x - startX) < Math.abs(from.z - startZ) ? { x: startX, z: from.z } : { x: from.x, z: startZ };
  const last = Math.abs(to.x - endX) < Math.abs(to.z - endZ) ? { x: endX, z: to.z } : { x: to.x, z: endZ };
  return [from, first, { x: startX, z: startZ }, { x: endX, z: startZ }, { x: endX, z: endZ }, last, to];
}
