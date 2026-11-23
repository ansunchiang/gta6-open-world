import {loadCareer, readCareer, readStorage, snapshotCareer} from './saveSystem.js'

const KEY = 'salt-relay.slots.v1'
const SLOTS = [0, 1, 2]
export function createSaveSlots(preview) {
	let sample
	function list() {
		const data = preview ? sample : readStorage(KEY)
		const entries = SLOTS.map(i => readCareer(data?.entries?.[i]))
		if (!preview && !entries.some(Boolean)) entries[0] = loadCareer()
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
