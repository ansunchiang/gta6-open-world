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

function readStorage(key) {
	try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

export function snapshotCareer({player, missions, activities, upgrades, career, atSafehouse}) {
	const {money, rep, loadout, armor} = player
	return { version: 1, chapter: missions.chapter, money, rep, loadout, armor,
		safehouse: !!atSafehouse, upgrades, stashes: [...activities.stashes], stats: career }
}

const KEY = 'salt-relay.slots.v1', SLOTS = [0, 1, 2]

export function createSaveSlots(preview) {
	let sample
	function list() {
		const data = preview ? sample : readStorage(KEY)
		const entries = SLOTS.map(i => readCareer(data?.entries?.[i]))
		if (!preview && !entries.some(Boolean)) entries[0] = readCareer(readStorage('salt-relay.career.v1'))
		const latest = SLOTS.includes(data?.latest) ? data.latest : -1
		return {entries, latest: entries[latest] ? latest : entries.findIndex(Boolean)}
	}
	function save(index, game) {
		if (!SLOTS.includes(index)) return false
		try {
			const {entries} = list()
			entries[index] = snapshotCareer(game)
			const value = {entries, latest: index}
			if (preview) sample = structuredClone(value)
			else localStorage.setItem(KEY, JSON.stringify(value))
			return true
		} catch {
			return false
		}
	}
	return {list, save}
}
