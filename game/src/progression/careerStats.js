import {DISTRICTS, districtAt} from '../world/cityLayout.js'
import {STORY} from '../missions/storyJobs.js'

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

const ranks = [
	[0, 'NEW FACE'], [100, 'RUNNER'], [300, 'LOOKOUT'], [600, 'WHEELHAND'],
	[1000, 'BROKER'], [1600, 'FIXER'], [2400, 'HARBOR ACE'], [3600, 'BAY LEGEND'],
]

export function respectRank(points) {
	const index = ranks.findLastIndex(([floor]) => points >= floor)
	const [floor, title] = ranks[index]
	const next = ranks[index + 1]?.[0] ?? floor
	return {level: index + 1, title, next, fraction: next === floor ? 1 : (points - floor) / (next - floor)}
}

export function completion(chapter, {events, jumps, standing}, packages) {
	const courier = Number(events.includes('delivery'))
	const rows = [
		['Story jobs', chapter, STORY.length], ['Races', events.length - courier, 2],
		['Courier runs', courier, 1], ['Stunt jumps', jumps.length, 2],
		['Hidden packages', packages, 8], ['Districts visited', standing.filter(Boolean).length, DISTRICTS.length],
	]
	const percent = Math.round(100 * rows.reduce((sum, row) => sum + row[1], 0) /
		rows.reduce((sum, row) => sum + row[2], 0))
	return {rows, percent}
}

export const garageUpgrades = [
	{type: 'engine', name: 'Torque kit', price: 220},
	{type: 'armor', name: 'Crash plating', price: 190},
	{type: 'repair', name: 'Pit service', price: 55},
]

export const vehicleRank = {tide: 4}
