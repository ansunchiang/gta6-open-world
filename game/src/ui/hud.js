import {drawMap} from './minimap.js'
import {DISTRICTS, districtAt} from '../world/cityLayout.js'
import {standingName} from '../progression/careerStats.js'
import {CREW} from '../progression/crewAbilities.js'
import {nearestVehicle} from '../player/playerController.js'
import {VEHICLE_TYPES} from '../vehicles/vehicleModel.js'
import {T, distance} from '../render/geometry.js'
import {respectRank} from '../progression/respect.js'
import {createDispatchPanel} from './dispatchPanel.js'
import {createWeaponBar} from './weaponBar.js'
import {drawPortrait} from './portraits.js'
import {updateVehiclePanel} from './vehiclePanel.js'
import {clock, format, id, money} from './titleScreen.js'

function setText(node, value) {
	const label = String(value)
	if (node.textContent !== label) node.textContent = label
}

function interaction({player, missions, activities, cars}) {
	if (player.theft) return 'Taking the wheel'
	const task = missions.prompt() || activities.prompt()
	if (task || player.car) return task
	const car = nearestVehicle(player, cars)
	if (!car) return ''
	const verb = car.driver ? 'Carjack' : 'Enter'
	return verb + ' ' + VEHICLE_TYPES[car.type].name
}

export function createHud() {
	const text = (key, value) => setText(id(key), value)
	const dispatch = createDispatchPanel(id('dispatch-panel'), id('dispatch-roster'))
	const weapons = createWeaponBar(id('weapon-bar'))
	const crew = id('crew')
	crew.innerHTML = CREW.map(({key, label}) =>
		`<div><canvas width=64 height=64></canvas><kbd>${key}</kbd><b>${label}</b><span></span></div>`).join('')
	for (const [i, card] of Array.from(crew.children).entries()) drawPortrait(card.firstChild, CREW[i].name)
	const [filled, empty] = id('stars').children
	const projection = new T.Vector3()
	let lastMap = -1, speaker

	function drawJob({activity, number, total, contact, title, task, stage, stages, remaining, next}) {
		const heading = activity ? 'SIDE JOB' : number ? `JOB ${number}/${total} · ${contact}` : 'FREE ROAM'
		id('job-kind').dataset.side = !!activity
		text('job-kind', heading)
		text('job-title', title)
		text('job-task', task)
		text('stage-label', stage ? `STAGE ${stage}/${stages}` : '')
		text('stage-time', remaining == null ? '' : clock(Math.max(0, Math.ceil(remaining))))
		text('job-next', next ? 'NEXT / ' + next : '')
		const progress = id('stage-progress')
		progress.hidden = !stage
		progress.value = stage ? stage / stages : 0
	}

	function drawPursuit({stars, contact, blackout, escapeTime, search}, now) {
		setText(filled, '★'.repeat(stars))
		setText(empty, '☆'.repeat(5 - stars))
		id('wanted').dataset.active = !!stars
		text('wanted', stars ? 'WANTED' : 'CLEAR')
		text('pursuit-label', !stars ? 'HARBOR PATROL' : blackout > now ? 'SIGNAL BLACKOUT' :
			contact ? 'IN SIGHT' : escapeTime == null ? 'SEARCHING' : `SEARCHING · ${Math.ceil(escapeTime)}s`)
		const meter = id('evasion')
		meter.hidden = !search.sweeping
		meter.value = search.progress
	}

	function waypoint(point, player, camera) {
		const node = id('waypoint')
		node.hidden = true
		const range = point && distance(point, player)
		if (!range || range <= 2.8 || range >= 126) return
		const {x, y, z} = projection.set(point.x, 3.55, point.z).project(camera)
		if (Math.abs(z) >= 1 || Math.abs(x) >= .84 || Math.abs(y) >= .8) return
		node.style.left = `${50 + x * 50}%`
		node.style.top = `${50 - y * 50}%`
		setText(node, `◆ ${point.label ? point.label + ' / ' : ''}${Math.round(range)} M`)
		node.hidden = false
	}

	return (game, camera, {aim}) => {
		const {player, police, career, dialogue, notice, timeOfDay, crewReady, clock: now} = game
		const job = game.objective()
		drawJob(job)
		drawPursuit(police, now)
		dispatch(police, player)
		const district = districtAt(player.x, player.z)
		const rank = respectRank(player.rep)
		text('money', money(player.money))
		text('district', district.name)
		text('standing', standingName(career.standing[DISTRICTS.indexOf(district)]))
		id('standing').style.background = district.color
		text('clock', clock(Math.floor(timeOfDay)))
		text('rank', `RANK ${rank.level} · ${rank.title}`)
		text('respect-value', `${format(player.rep)} / ${format(rank.next)} RESPECT`)
		for (const stat of ['health', 'armor']) {
			id(stat).value = player[stat]
			text(stat + '-value', Math.ceil(player[stat]))
		}
		id('respect').value = rank.fraction
		updateVehiclePanel(game, text)
		for (const [index, card] of Array.from(crew.children).entries()) {
			const seconds = Math.ceil((crewReady[index] ?? 0) - now)
			setText(card.lastChild, seconds > 0 ? seconds + 's' : 'Ready')
		}
		weapons(player)
		const action = interaction(game)
		id('interaction').hidden = !action
		text('interaction-text', action)
		id('reticle').hidden = !aim || !player.armed || !!player.theft
		waypoint(job.point, player, camera)
		id('dialogue').hidden = !dialogue
		id('toast').hidden = !notice
		if (dialogue) {
			if (speaker !== dialogue.name) drawPortrait(id('portrait'), speaker = dialogue.name)
			text('speaker', speaker)
			text('dialogue-text', dialogue.text)
		}
		if (notice) {
			text('toast-type', notice.type)
			text('toast-text', notice.text)
		}
		id('damage').style.opacity = Math.min(.65, player.hurt * .78)
		if (now - lastMap < .075) return
		drawMap(id('minimap'), game, job)
		lastMap = now
	}
}
