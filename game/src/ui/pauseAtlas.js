import {DISTRICTS} from '../world/cityLayout.js'
import {STORY} from '../missions/storyJobs.js'
import {completion, standingName} from '../progression/careerStats.js'
import {CREW} from '../progression/crewAbilities.js'
import {drawMap} from './minimap.js'
import {drawPortrait} from './portraits.js'
import {id, money, playTime, slotButtons} from './titleScreen.js'

const tabs = ['Map', 'Jobs', 'Stats', 'Crew', 'Save']
const cards = rows => rows.map(([label, value]) => `<div><b>${value}</b>${label}</div>`).join('')
const row = (name, value) => `<div class=atlas-row><b>${name}</b>${value}</div>`
const mapPage = `<canvas width=900 height=575 aria-label="Vesper Bay district map"></canvas>
	<div class=map-key>◆ Story　 ● Side job　 ✚ Shop　 ■ Safehouse　 ▲ Dispatch</div>`

export function createPauseAtlas(game, show) {
	const page = id('atlas-page'), nav = id('atlas-tabs')
	let selected = 'Map', pending
	nav.innerHTML = tabs.map(name => `<button>${name}</button>`).join('')
	nav.onclick = ({target}) => { if (target.tagName === 'BUTTON') select(target.textContent) }

	function open(tab = selected) {
		const {career, missions, activities} = game
		const {percent, rows} = completion(missions.chapter, career, activities.stashes.size)
		const ring = id('completion-ring'), value = `${percent}%`
		ring.firstChild.textContent = value
		ring.style.setProperty('--percent', value)
		id('checklist').innerHTML = rows.map(([name, done, total]) => row(name, `${done}/${total}`)).join('')
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
			page.innerHTML = mapPage
			drawMap(page.firstChild, game, game.objective(), true)
			return
		}
		if (tab === 'Jobs') section('Story jobs', STORY.map(({title, contact}, i) =>
			row(`${i + 1}. ${title}`, i < chapter ? 'Complete' : i === chapter ? contact : 'Upcoming')).join(''))
		if (tab === 'Stats') section('Career record', `<div class=stat-grid>${cards([
			['Time played', playTime(career.seconds)], ['Cash on hand', money(player.money)],
			['Respect earned', player.rep], ['Packages found', activities.stashes.size],
		])}</div>`)
		if (tab === 'Crew') {
			section('Crew calls', CREW.map(({name, label, key, detail}) =>
				`<div class="atlas-row crew-row"><canvas width=64 height=64></canvas><div><b>${name} · ${label}</b><p>${detail}</p></div><kbd>${key}</kbd></div>`).join(''))
			page.querySelectorAll('canvas').forEach((canvas, i) => drawPortrait(canvas, CREW[i].name))
		}
		if (tab === 'Save') {
			pending = -1
			section('Save career', `<div class=slots></div><p id=save-feedback role=status></p>
				<button class=quiet value=help>Controls</button> <button class=quiet value=settings>Settings</button>
				<button class=quiet value=title>Title screen</button>`)
			slots()
			for (const button of page.querySelectorAll('button.quiet')) button.onclick = () => show(button.value)
		}
	}

	function section(heading, body) {
		page.innerHTML = `<section class=atlas-content><h3>${heading}</h3>${body}</section>`
	}
	function slots() {
		const feedback = id('save-feedback')
		slotButtons(page.querySelector('.slots'), game.saves.list(), 'Save', (i, entry) => {
			if (entry && pending !== i) {
				pending = i
				feedback.textContent = 'Select again to overwrite.'
				return
			}
			pending = -1
			if (game.save(i)) {
				feedback.textContent = `Career saved to slot ${i + 1}.`
				slots()
			} else feedback.textContent = 'Storage unavailable.'
		})
	}
	return open
}
