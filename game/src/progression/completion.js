import {STORY} from 'story-jobs'
import {DISTRICTS} from 'city-layout'

export function completion(chapter, career, packages) {
	const rows = [
		['Story jobs', chapter, STORY.length],
		['Races', career.events.filter(type => type !== 'delivery').length, 2],
		['Courier runs', Number(career.events.includes('delivery')), 1],
		['Stunt jumps', career.jumps.length, 2],
		['Hidden packages', packages, 8],
		['Districts visited', career.standing.filter(Boolean).length, DISTRICTS.length],
	]
	const percent = Math.round(100 * rows.reduce((sum, [, done]) => sum + done, 0) /
		rows.reduce((sum, [, , total]) => sum + total, 0))
	return {rows, percent}
}
