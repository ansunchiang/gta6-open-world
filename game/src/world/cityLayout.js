export const GRID = [-180, -120, -60, 0, 60, 120, 180]
export const EDGE = 202
export const SHORE = 222
export const LAND = [
	[-207,-205], [190,-205], [190,204], [-62,204], [-73,168], [-122,137],
	[-184,132], [-206,108],
]

export function southBank(x) {
	if (x >= -62) return 204
	for (let i = 3; i < LAND.length - 1; i++) {
		const [a, z] = LAND[i], [b, next] = LAND[i + 1]
		if (x >= b) return z + (next - z) * (x - a) / (b - a)
	}
	return 108
}

export const DISTRICTS = [
	['Mirage Row', 0, 72, '#fda374'],
	['Glasspoint', 3, -83, '#9bdddf'],
	['Beacon Strand', 172, 3, '#fed278'],
	['Brine Yards', -153, -99, '#89cbc2'],
	['West Locks', -119, 112, '#c7b5ef'],
].map(([name, x, z, color]) => ({name, x, z, color}))

export const PLACES = Object.fromEntries([
	['garage', 11, 84, 'ROOK’S GARAGE'],
	['depot', -70, 0, 'METER DEPOT'],
	['strand', 171, -8, 'BEACON STRAND'],
	['docks', -131, -110, 'BRINE YARDS'],
	['tower', 10, -151, 'RELAY HOUSE'],
	['market', 49, 61, 'NIGHT MARKET'],
	['race', 120, 125, 'BREAKWATER SPRINT'],
	['delivery', -109, 121, 'LOCKSIDE COURIER'],
	['marina', 215, 42, 'CINDER MARINA'],
	['bridge', 271, 120, 'BEACON CAUSEWAY'],
	['safehouse', -9.5, 129, 'THE SALT FLAT'],
	['dispatch', -49, -43, 'HARBOR PATROL'],
].map(([key, x, z, label]) => [key, {x, z, label}]))

export function closestStreet(value) {
	return GRID.reduce((best, street) => Math.abs(street - value) < Math.abs(best - value) ? street : best)
}

export function districtAt(x, z) {
	if (x > 145) return DISTRICTS[2]
	if (x < -78) return DISTRICTS[z < -11 ? 3 : 4]
	return DISTRICTS[z < -20 ? 1 : 0]
}

export function mapRoute({x, z}, goal) {
	const sx = closestStreet(x), sz = closestStreet(z)
	const ex = closestStreet(goal.x), ez = closestStreet(goal.z)
	const end = [goal.x, goal.z]
	if (x > 194 && goal.x > 194) return [[x, z], end]
	return [[x, z], [sx, z], [sx, sz], [ex, sz], [ex, ez], [ex, goal.z], end]
}
