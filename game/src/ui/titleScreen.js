import {STORY} from 'story-jobs'
import {completion} from '../progression/completion.js'

export const id = name => document.getElementById(name)
export const format = number => number.toLocaleString('en-US')
export const money = amount => '$' + format(amount)
const pad = number => String(number % 60).padStart(2, '0')
export const clock = minutes => `${Math.floor(minutes / 60)}:${pad(minutes)}`
export const playTime = seconds => `${Math.floor(seconds / 3600)}h ${pad(Math.floor(seconds / 60))}m`

export function slotButtons(container, {entries, latest}, label, action) {
	container.innerHTML = entries.map((entry, i) => {
		const number = i + 1
		const disabled = !entry && label === 'Load' ? ' disabled' : ''
		const chapter = entry ? STORY[entry.chapter]?.title ?? 'Story complete' : 'Empty slot'
		const stats = entry ? `${completion(entry.chapter, entry.stats, entry.stashes.length).percent}% · ${playTime(entry.stats.seconds)} · ${money(entry.money)}` : ''
		return `<button class=slot aria-label="${label} slot ${number}"${disabled}>
			<span>Slot ${number}${latest === i ? ' · Latest' : ''}</span><strong>${chapter}</strong><span>${stats}</span></button>`
	}).join('')
	for (const [i, button] of [...container.children].entries()) button.onclick = () => action(i, entries[i])
}

export function createTitleScreen(game) {
	const {saves, start} = game
	const resume = id('continue'), load = id('title-load'), slots = id('title-slots')
	resume.onclick = () => start(saves.list().latest)
	id('start').onclick = () => start()
	load.onclick = () => slots.querySelector('button:enabled')?.focus()
	return () => {
		const data = saves.list()
		resume.disabled = load.disabled = data.latest < 0
		slotButtons(slots, data, 'Load', start)
	}
}
