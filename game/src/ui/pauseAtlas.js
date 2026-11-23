import {DISTRICTS} from 'city-layout'
import {STORY} from 'story-jobs'
import {completion} from '../progression/completion.js'
import {standingName} from '../progression/careerStats.js'
import {CREW} from '../progression/crewAbilities.js'
import {drawMap} from './minimap.js'
import {drawPortrait} from './portraits.js'
import {id, money, playTime, slotButtons} from './titleScreen.js'

const tabs = ['Map', 'Jobs', 'Stats', 'Crew', 'Save']
const cards = rows => rows.map(([label, value]) => `<div><b>${value}</b><span>${label}</span></div>`).join('')
const legend = ['◆ Story job', '● Side job', '✚ Shop', '■ Safehouse', '▲ Dispatch']
const saveLinks = [['help', 'Controls'], ['settings', 'Settings'], ['title', 'Title screen']]

export function createPauseAtlas(game, show) {
	const page = id('atlas-page'), nav = id('atlas-tabs')
	let selected = 'Map', pending
	nav.innerHTML = tabs.map(name => `<button>${name}</button>`).join('')
	for (const button of nav.children) button.onclick = () => select(button.textContent)

	function open(tab = selected) {
		const {career, missions: {chapter}, activities} = game
		const {percent, rows} = completion(chapter, career, activities.stashes.size)
		const ring = id('completion-ring')
		ring.firstChild.textContent = percent + '%'
		ring.style.setProperty('--percent', ring.firstChild.textContent)
		id('checklist').innerHTML = rows.map(([name, done, total]) =>
			`<div><span>${name}</span><b>${done}/${total}</b></div>`).join('')
		id('district-bars').innerHTML = DISTRICTS.map(({name, color}, i) => {
			const points = career.standing[i]
			return `<div style="--meter:${color}"><span>${name}</span><b>${standingName(points)}</b><progress max=100 value=${points}></progress></div>`
		}).join('')
		id('career-stats').innerHTML = cards([
			['Cash earned', money(career.earned)], ['Cars stolen', career.stolen], ['Max wanted', career.wanted + '★'],
			['Distance driven', `${(career.distance / 1000).toFixed(1)} km`],
		])
		select(tab)
	}

	function select(tab) {
		selected = tab
		for (const button of nav.children) button.setAttribute('aria-pressed', button.textContent === tab)
		const {player, career, missions: {chapter}, activities} = game
		if (tab === 'Map') {
			page.innerHTML = `<canvas id=full-map width=900 height=575 aria-label="Vesper Bay district map"></canvas>
				<div class=map-key>${legend.map(label => `<span>${label}</span>`).join('')}</div>`
			drawMap(page.firstChild, game, game.objective(), true)
			return
		}
		if (tab === 'Jobs') section('Story jobs', STORY.map(({title, contact}, i) =>
			`<div class=atlas-row><b>${i + 1}. ${title}</b>${i < chapter ? 'Complete' : i === chapter ? contact : 'Upcoming'}</div>`).join(''))
		if (tab === 'Stats') section('Career record', `<div class=stat-grid>${cards([
			['Time played', playTime(career.seconds)], ['Cash on hand', money(player.money)],
			['Respect earned', player.rep], ['Packages found', activities.stashes.size],
		])}</div>`)
		if (tab === 'Crew') {
			section('Crew calls', CREW.map(({name, label, key, detail}) =>
				`<div class="atlas-row crew-row"><canvas width=64 height=64></canvas><div><b>${name} · ${label}</b><p>${detail}</p></div><kbd>${key}</kbd></div>`).join(''))
			page.querySelectorAll('canvas').forEach((canvas, i) => drawPortrait(canvas, CREW[i].name))
		}
		if (tab === 'Save') savePage()
	}

	function section(heading, html) {
		page.innerHTML = `<section class=atlas-content><h3>${heading}</h3>${html}</section>`
	}

	function savePage() {
		pending = -1
		section('Save career', `<p>Save a checkpoint.<div class=slots></div><p id=save-feedback role=status></p>
			${saveLinks.map(([mode, label]) => `<button class=quiet value=${mode}>${label}</button>`).join(' ')}`)
		refreshSlots()
		for (const button of page.querySelectorAll('.quiet')) button.onclick = () => show(button.value)
	}

	function refreshSlots() {
		const feedback = id('save-feedback')
		slotButtons(page.querySelector('.slots'), game.saves.list(), 'Save', (i, entry) => {
			if (entry && pending !== i) {
				pending = i
				feedback.textContent = 'Select again to overwrite.'
				return
			}
			pending = -1
			const saved = game.save(i)
			feedback.textContent = saved ? `Career saved to slot ${i + 1}.` : 'Storage unavailable.'
			if (saved) refreshSlots()
		})
	}
	return open
}
