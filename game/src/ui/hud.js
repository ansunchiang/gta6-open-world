import {drawMap} from './minimap.js'
import {DISTRICTS, districtAt} from 'city-layout'
import {standingName} from '../progression/careerStats.js'
import {CREW} from '../progression/crewAbilities.js'
import {nearestVehicle} from '../player/playerController.js'
import {VEHICLE_TYPES} from '../vehicles/vehicleModel.js'
import {T, distance} from 'geometry'
import {respectRank} from '../progression/respect.js'
import {createDispatchPanel} from './dispatchPanel.js'
import {createWeaponBar} from './weaponBar.js'
import {drawPortrait} from './portraits.js'
import {updateVehiclePanel} from './vehiclePanel.js'
import {clock, format, id, money} from './titleScreen.js'

const text = (key, value) => {
	const node = id(key)
	if (node.textContent !== String(value)) node.textContent = value
}

function updateJob(job) {
	const {activity, number, total, contact, title, task, stage, stages, remaining, next} = job
	const kind = activity ? 'SIDE JOB' : number ? `JOB ${number}/${total} · ${contact}` : 'FREE ROAM'
	id('job-kind').dataset.side = !!activity
	text('job-kind', kind)
	text('job-title', title)
	text('job-task', task)
	text('stage-label', stage ? `STAGE ${stage}/${stages}` : '')
	text('stage-time', remaining == null ? '' : clock(Math.max(0, Math.ceil(remaining))))
	text('job-next', next ? 'NEXT / ' + next : '')
	const progress = id('stage-progress')
	progress.hidden = !stage
	progress.value = stage / stages || 0
}

function updatePursuit({stars, contact, blackout, escapeTime}, now) {
	const [filled, empty] = id('stars').children
	filled.textContent = '★'.repeat(stars)
	empty.textContent = '☆'.repeat(5 - stars)
	const wanted = id('wanted')
	wanted.textContent = stars ? 'WANTED' : 'CLEAR'
	wanted.dataset.active = !!stars
	const search = escapeTime == null ? 'SEARCHING' : `SEARCHING · ${Math.ceil(escapeTime)}s`
	text('pursuit-label', !stars ? 'HARBOR PATROL' : blackout > now ? 'SIGNAL BLACKOUT' : contact ? 'IN SIGHT' : search)
}

function prompt({player, missions, activities, cars}) {
	if (player.theft) return 'Taking the wheel'
	const action = missions.prompt() || activities.prompt()
	if (action || player.car) return action
	const car = nearestVehicle(player, cars)
	return car ? (car.driver ? 'Carjack ' : 'Enter ') + VEHICLE_TYPES[car.type].name : ''
}

const position = new T.Vector3()
function updateWaypoint(point, player, camera) {
	const node = id('waypoint')
	node.hidden = true
	if (!point) return
	const range = distance(point, player)
	if (range <= 2.8 || range >= 126) return
	const {x, y, z} = position.set(point.x, 3.55, point.z).project(camera)
	if (Math.abs(z) >= 1 || Math.abs(x) >= .84 || Math.abs(y) >= .8) return
	node.hidden = false
	node.style.left = 50 + x * 50 + '%'
	node.style.top = 50 - y * 50 + '%'
	const label = point.label ? point.label + ' / ' : ''
	node.textContent = `◆ ${label}${Math.round(range)} M`
}

export function createHud() {
	const dispatch = createDispatchPanel(id('dispatch-panel'), id('dispatch-roster'))
	const weapons = createWeaponBar(id('weapon-bar'))
	const crew = id('crew')
	crew.innerHTML = CREW.map(({key, label}) =>
		`<div><canvas width=64 height=64></canvas><kbd>${key}</kbd><b>${label}</b><span></span></div>`).join('')
	const cards = [...crew.children]
	cards.forEach((card, i) => drawPortrait(card.firstChild, CREW[i].name))
	let lastMap = -1, speaker
	return (game, camera, {aim}) => {
		const {player, police, career, clock: now, dialogue, notice} = game
		const job = game.objective()
		updateJob(job)
		updatePursuit(police, now)
		dispatch(police, player)
		text('money', money(player.money))
		const district = districtAt(player.x, player.z)
		text('district', district.name)
		text('standing', standingName(career.standing[DISTRICTS.indexOf(district)]))
		id('standing').style.background = district.color
		text('clock', clock(Math.floor(game.timeOfDay)))
		for (const meter of ['health', 'armor']) {
			id(meter).value = player[meter]
			text(meter + '-value', Math.ceil(player[meter]))
		}
		const rank = respectRank(player.rep)
		text('rank', `RANK ${rank.level} · ${rank.title}`)
		text('respect-value', `${format(player.rep)} / ${format(rank.next)} RESPECT`)
		id('respect').value = rank.fraction
		updateVehiclePanel(game, text)
		cards.forEach((card, i) => {
			const wait = Math.ceil((game.crewReady[i] ?? 0) - now)
			card.lastChild.textContent = wait > 0 ? wait + 's' : 'Ready'
		})
		weapons(player)
		const action = prompt(game)
		id('interaction').hidden = !action
		text('interaction-text', action)
		id('reticle').hidden = !(aim && player.armed)
		updateWaypoint(job.point, player, camera)
		id('dialogue').hidden = !dialogue
		if (dialogue) {
			if (speaker !== dialogue.name) drawPortrait(id('portrait'), speaker = dialogue.name)
			text('speaker', speaker)
			text('dialogue-text', dialogue.text)
		}
		id('toast').hidden = !notice
		if (notice) {
			text('toast-type', notice.type)
			text('toast-text', notice.text)
		}
		id('damage').style.opacity = Math.min(.65, player.hurt * .78)
		if (now - lastMap > .075) {
			lastMap = now
			drawMap(id('minimap'), game, job)
		}
	}
}
