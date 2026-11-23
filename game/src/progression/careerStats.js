import {DISTRICTS, districtAt} from '../world/cityLayout.js'

export const standingName = points => points >= 75 ? 'TRUSTED' : points >= 35 ? 'KNOWN' : points > 0 ? 'NEW FACE' : 'UNMET'
const count = (value, max = 1e9) => Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0

export function careerStats(data = {}) {
	const {seconds, earned, stolen, wanted, distance, events, jumps, standing} = data ?? {}
	return {
		seconds: count(seconds), earned: count(earned), stolen: count(stolen),
		wanted: count(wanted, 5), distance: count(distance),
		events: Array.isArray(events) ? ['race', 'boat', 'delivery'].filter(type => events.includes(type)) : [],
		jumps: Array.isArray(jumps) ? [0, 1].filter(i => jumps.includes(i)) : [],
		standing: DISTRICTS.map((_, i) => count(standing?.[i], 100)),
	}
}

export function buildStanding({player: {x, z}, career: {standing}}, points) {
	const index = DISTRICTS.indexOf(districtAt(x, z))
	standing[index] = Math.min(100, Math.max(1, standing[index] + points))
}

export function earnCash(game, amount, standing) {
	game.player.money += amount
	game.career.earned += amount
	buildStanding(game, standing)
}
