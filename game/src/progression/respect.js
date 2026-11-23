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
