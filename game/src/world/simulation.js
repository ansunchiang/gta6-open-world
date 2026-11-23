import {generateCity} from './cityGenerator.js'
import {createMarkers} from './objectiveMarkers.js'
import {createRandom} from '../random.js'
import {createTraffic, updateTraffic} from '../ai/trafficAI.js'
import {createPedestrians, updatePedestrians} from '../ai/pedestrianAI.js'
import {createPolice, reportCrime, updatePolice, clearPolice} from '../ai/policeAI.js'
import {updateGuards} from '../ai/guardAI.js'
import {createPlayer, enterVehicle, exitVehicle, nearestVehicle, updatePlayer} from '../player/playerController.js'
import {animateCharacter} from '../player/characterModel.js'
import {updateCombat} from '../player/combat.js'
import {createMissionManager} from '../missions/missionManager.js'
import {createActivities} from '../missions/activities.js'
import {STORY} from 'story-jobs'
import {PLACES} from 'city-layout'
import {createLoadout} from 'weapons'
import {STATIONS} from 'radio-stations'
import {createExplosions} from '../render/explosions.js'
import {updateVehicleDamage} from '../vehicles/vehicleDamage.js'
import {createChaseCamera} from '../render/chaseCamera.js'
import {createEffects, createSirenGlow} from '../render/effects.js'
import {createAtmosphere} from '../render/atmosphere.js'
import {createSynth} from '../audio/synth.js'
import {createSaveSlots} from '../save/saveSlots.js'
import {snapshotCareer} from '../save/saveSystem.js'
import {buildStanding, careerStats} from '../progression/careerStats.js'
import {callCrew} from '../progression/crewAbilities.js'

export const NEUTRAL = {throttle: 0, steer: 0, presses: new Set()}
const SPAWN = {x: 8.1, z: 91}
const PLAYER_RESET = {
	heading: 0, y: 0, speed: 0, health: 100, hurt: 0, cooldown: 0,
	reload: 0, swing: 0, weapon: 'fists', armed: false, aim: false, car: null, theft: null,
}

export function createSimulation(scene, camera, seed, input, practice) {
	const city = generateCity(scene, seed)
	const random = createRandom(seed ^ 9467)
	const atmosphere = createAtmosphere(scene)
	const lightSiren = createSirenGlow(scene)
	const effects = createEffects(scene)
	const explosions = createExplosions(scene)
	const neons = scene.children.filter(node => node.userData.neon)
	const player = createPlayer(scene)
	const cars = createTraffic(scene, random)
	const originals = new Map(cars.map(car => [car, {...car}]))
	const people = createPedestrians(scene, city, random)
	const rig = createChaseCamera(camera, city), police = createPolice(), audio = createSynth()
	const saves = createSaveSlots(practice)
	const game = { scene, city, input, camera: rig, effects, explosions, player, cars, people,
		guards: [], police, audio, clock: 0, station: 0, saves, saveSlot: -1 }
	const missions = game.missions = createMissionManager(game)
	const activities = game.activities = createActivities(game)
	const markers = createMarkers(scene, activities)
	const traffic = dt => updateTraffic(cars, player, city, dt, game.clock)

	game.objective = () => activities.objective() ?? missions.objective()
	game.toast = (text, type, duration = 2.8) => game.notice = {text, type, until: game.clock + duration}
	game.speak = (name, text, duration = 6) => game.dialogue = {name, text, until: game.clock + duration}
	game.save = (slot = game.saveSlot) => {
		if (slot < 0) slot = saves.list().entries.indexOf(null)
		if (!saves.save(slot, game)) return false
		game.saveSlot = slot
		return true
	}
	game.damage = amount => {
		const blocked = Math.min(player.armor, amount * .72)
		player.armor -= blocked
		player.health = Math.max(0, player.health - amount + blocked)
		player.hurt = Math.min(.73, .2 + amount * .015)
	}
	player.onCrime = severity => {
		reportCrime(police, severity, player)
		game.career.wanted = Math.max(game.career.wanted, Math.ceil(police.heat - .001))
	}

	function reset(career, retry = false) {
		clearPolice(game)
		explosions.clear()
		effects.clear()
		prune(cars, car => !originals.has(car))
		for (const [car, state] of originals) Object.assign(car, state, {claimed: false, exploded: false, smokeTime: 0, doorSwing: 0, jump: null, lift: 0})
		prune(people, person => !!person.expires)
		for (const person of people) Object.assign(person, {health: 100, down: 0, panic: 0})
		Object.assign(game, { notice: null, dialogue: null, timeOfDay: 990, crewReady: [],
			atSafehouse: career?.safehouse ?? false, career: careerStats(career?.stats) })
		const chapter = career?.chapter ?? 0
		const anchor = STORY[chapter]?.anchor
		let spawn = SPAWN
		if (career?.safehouse) spawn = PLACES.safehouse
		else if (anchor && (chapter || retry)) spawn = {x: anchor.x - 2.5, z: anchor.z + 3.9}
		Object.assign(player, PLAYER_RESET, spawn, { armor: career?.armor ?? 50, money: career?.money ?? 140,
			rep: career?.rep ?? 0, loadout: createLoadout(career?.loadout, career?.reserve) })
		player.model.node.visible = true
		game.upgrades = career?.upgrades ?? {engine: 0, armor: 0, weapon: 0}
		missions.setChapter(chapter)
		activities.reset(career?.stashes)
		buildStanding(game, 0)
		rig.update(player, NEUTRAL, 0, true)
		animateCharacter(player, game.clock, 0)
		traffic(0)
	}

	game.start = (slot = -1) => {
		const {entries} = saves.list()
		reset(entries[slot])
		game.saveSlot = entries[slot] ? slot : entries.indexOf(null)
		audio.start()
		game.menus.show('play')
	}
	game.retry = () => {
		const career = snapshotCareer(game)
		career.money = Math.max(0, career.money - 35)
		career.safehouse = false
		reset(career, true)
		game.menus.show('play')
		game.save()
	}

	function interact() {
		if (player.theft || missions.interact() || activities.interact()) return
		if (player.car) {
			exitVehicle(game)
			return
		}
		const car = nearestVehicle(player, cars)
		if (car) enterVehicle(game, car)
	}

	function simulate(controls, dt) {
		const now = game.clock += dt
		game.timeOfDay = (game.timeOfDay + dt * 1.32) % 1440
		if (game.notice?.until < now) game.notice = null
		if (game.dialogue?.until < now) game.dialogue = null
		if (controls.presses.has('KeyE')) interact()
		if (game.menus.mode !== 'play') return
		if (controls.presses.has('KeyV')) game.station = (game.station + 1) % STATIONS.length
		callCrew(game, controls.presses)
		const {x, z} = player
		updateCombat(game, controls, dt)
		updatePlayer(game, controls, dt)
		if (x !== player.x || z !== player.z) game.atSafehouse = false
		const {career} = game
		career.seconds += dt
		if (player.car && !player.theft) career.distance += Math.hypot(player.x - x, player.z - z)
		buildStanding(game, dt / 12)
		traffic(dt)
		updatePolice(game, dt)
		updatePedestrians(people, player, city, dt, now)
		updateGuards(game, dt)
		updateVehicleDamage(game, dt)
		prune(people, person => person.expires <= now)
		missions.update(dt)
		activities.update(dt)
		effects.update(dt)
		if (player.health <= 0) game.menus.show('busted')
	}

	function renderState(controls, dt, title = false) {
		if (title) {
			const orbit = game.stillTitle ? 0 : game.clock * .037
			camera.position.set(262 + Math.sin(orbit) * 24, 53, 147 + Math.cos(orbit) * 19)
			camera.lookAt(99, 11, -34)
			camera.fov = 52
			camera.updateProjectionMatrix()
		} else rig.update(player, controls, dt)
		atmosphere.update(title ? 962 : game.timeOfDay, title ? {x: 145, z: 41} : player, camera, city.water)
		camera.updateMatrixWorld()
		const neon = 1 - city.water.sun.value
		city.neon.emissiveIntensity = .35 + neon * 1.25
		for (const light of neons) light.intensity = neon * 130
		city.water.time.value = game.clock
		markers(game.objective(), game.clock)
		lightSiren(police.units, game.clock)
	}

	reset(null)
	return Object.assign(game, {reset, interact, simulate, renderState, idle(dt) {
		game.clock += dt
		traffic(dt)
		updatePedestrians(people, {x: 79, z: 36}, city, dt, game.clock)
	}})
}

function prune(list, remove) {
	for (let i = list.length - 1; i >= 0; i--) {
		const actor = list[i]
		if (!remove(actor)) continue
		const node = actor.node ?? actor.model.node
		node.removeFromParent()
		list.splice(i, 1)
	}
}
