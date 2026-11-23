import {careerStats} from '../progression/careerStats.js'
import {STORY} from '../missions/storyJobs.js'

export const count = (value, max, fallback = 0) =>
	Number.isFinite(value) ? Math.floor(Math.min(max, Math.max(0, value))) : fallback
const upgrades = ['engine', 'armor', 'weapon']

export function readCareer(saved) {
	if (saved?.version !== 1) return null
	const {chapter, money, rep, reserve, armor, loadout, safehouse, stashes, stats} = saved
	return {
		version: 1,
		chapter: count(chapter, STORY.length),
		money: count(money, 100000, 140), rep: count(rep, 100000), reserve: count(reserve, 200, 32),
		armor: Number.isFinite(armor) ? Math.min(100, Math.max(0, armor)) : 50,
		loadout: loadout ?? {}, safehouse: safehouse === true,
		upgrades: Object.fromEntries(upgrades.map(type => [type, count(saved.upgrades?.[type], 2)])),
		stashes: Array.isArray(stashes) ? [...new Set(stashes.filter(i => Number.isInteger(i) && i >= 0 && i < 8))] : [],
		stats: careerStats(stats),
	}
}

export const loadCareer = () => readCareer(readStorage('salt-relay.career.v1'))

export function readStorage(key) {
	try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

export function snapshotCareer({player, missions, activities, upgrades, career, atSafehouse}) {
	const {money, rep, loadout, armor} = player
	return { version: 1, chapter: missions.chapter, money, rep, loadout, armor,
		safehouse: !!atSafehouse, upgrades, stashes: [...activities.stashes], stats: career }
}
