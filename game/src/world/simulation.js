import {generateCity} from './cityGenerator.js'
import {createMarkers} from './objectiveMarkers.js'
import {createRandom} from '../random.js'
import {createTraffic, updateTraffic} from '../ai/trafficAI.js'
import {createPedestrians, updatePedestrians} from '../ai/pedestrianAI.js'
import {createPolice, reportCrime, updatePolice, clearPolice} from '../ai/policeAI.js'
import {updateGuards} from '../ai/guardAI.js'
import {createPlayer, enterVehicle, exitVehicle, nearestVehicle, updatePlayer} from '../player/playerController.js'
import {updateCombat} from '../player/combat.js'
import {createMissionManager} from '../missions/missionManager.js'
import {createActivities} from '../missions/activities.js'
import {STORY} from '../missions/storyJobs.js'
import {PLACES} from './cityLayout.js'
import {createLoadout} from '../combat/weapons.js'
import {createExplosions} from '../render/explosions.js'
import {updateVehicleDamage} from '../vehicles/vehicleDamage.js'
import {createChaseCamera} from '../render/chaseCamera.js'
import {createEffects, createSirenGlow, createRoadGlow} from '../render/effects.js'
import {createAtmosphere} from '../render/atmosphere.js'
import {createSynth, STATIONS} from '../audio/synth.js'
import {createSaveSlots, snapshotCareer} from '../save/saveSystem.js'
import {buildStanding, careerStats} from '../progression/careerStats.js'
import {callCrew} from '../progression/crewAbilities.js'

export const NEUTRAL = {throttle: 0, steer: 0, presses: new Set()}

export function createSimulation(scene, camera, seed, input, practice) {
	const city = generateCity(scene, seed), random = createRandom(seed ^ 9467)
	const player = createPlayer(scene)
	const cars = createTraffic(scene, random)
	const parked = cars.map(car => ({...car}))
	const people = createPedestrians(scene, city, random)
	const lightWorld = createAtmosphere(scene, city.water)
	const sirens = createSirenGlow(scene)
	const roadGlow = createRoadGlow(scene, city.pools)
	const rig = createChaseCamera(camera, city)
	const police = createPolice(), audio = createSynth()
	const game = {
		scene, city, input, camera: rig, player, cars, people, police, audio,
		saves: createSaveSlots(practice),
		effects: createEffects(scene), explosions: createExplosions(scene),
		guards: [], clock: 0, station: 0, saveSlot: -1,
	}
	const missions = game.missions = createMissionManager(game)
	const activities = game.activities = createActivities(game)
	const markers = createMarkers(scene, activities)
	const {saves, explosions, effects} = game
	function prunePeople(remove) {
		for (let i = people.length - 1; i >= 0; i--) {
			if (remove(people[i])) people.splice(i, 1)[0].model.node.removeFromParent()
		}
	}

	game.objective = () => activities.objective() ?? missions.objective()
	game.toast = (text, type, seconds = 2.8) => game.notice = {text, type, until: game.clock + seconds}
	game.speak = (name, text, seconds = 6) => game.dialogue = {name, text, until: game.clock + seconds}
	game.save = (slot = game.saveSlot) => {
		if (slot < 0) slot = saves.list().entries.indexOf(null)
		if (!saves.save(slot, game)) return false
		game.saveSlot = slot
		return true
	}
	game.damage = hit => {
		const absorbed = Math.min(player.armor, hit * .72)
		player.armor -= absorbed
		player.health = Math.max(0, player.health - (hit - absorbed))
		player.hurt = Math.max(player.hurt, Math.min(.73, .2 + hit * .015))
	}
	player.onCrime = severity => {
		reportCrime(police, severity, player)
		game.career.wanted = Math.max(game.career.wanted, Math.ceil(police.heat - .001))
	}

	function reset(saved, retry = false) {
		clearPolice(game)
		explosions.clear()
		effects.clear()
		while (cars.length > parked.length) cars.pop().node.removeFromParent()
		cars.forEach((car, i) => Object.assign(car, {
			claimed: false, exploded: false, smokeTime: 0, doorSwing: 0, jump: null, lift: 0, ...parked[i],
		}))
		prunePeople(person => person.expires != null)
		for (const person of people) Object.assign(person, {health: 100, down: 0, panic: 0, alarm: null})
		Object.assign(game, {
			notice: null, dialogue: null, timeOfDay: 990, crewReady: [],
			atSafehouse: !!saved?.safehouse, career: careerStats(saved?.stats),
		})
		const chapter = saved?.chapter ?? 0
		const anchor = (chapter || retry) && STORY[chapter]?.anchor
		const spawn = game.atSafehouse ? PLACES.safehouse :
			anchor ? {x: anchor.x - 2.5, z: anchor.z + 3.9} : {x: 8.1, z: 91}
		Object.assign(player, spawn, {
			heading: 0, y: 0, speed: 0, health: 100, hurt: 0, cooldown: 0,
			reload: 0, swing: 0, weapon: 'fists', armed: false, aim: false, car: null, theft: null,
			armor: saved?.armor ?? 50, money: saved?.money ?? 140, rep: saved?.rep ?? 0,
			loadout: createLoadout(saved?.loadout, saved?.reserve),
		})
		game.upgrades = {...(saved?.upgrades ?? {engine: 0, armor: 0, weapon: 0})}
		missions.setChapter(chapter)
		activities.reset(saved?.stashes)
		buildStanding(game, 0)
		rig.update(player, NEUTRAL, 0, true)
		updatePlayer(game, NEUTRAL, 0)
		updateTraffic(cars, player, city, 0, game.clock)
	}

	game.start = (slot = -1) => {
		const {entries} = saves.list()
		reset(entries[slot])
		game.saveSlot = entries[slot] ? slot : entries.indexOf(null)
		audio.start()
		game.menus.show('play')
	}
	game.retry = () => {
		const save = snapshotCareer(game)
		reset({...save, money: Math.max(0, save.money - 35), safehouse: false}, true)
		game.menus.show('play')
		game.save()
	}

	function interact() {
		if (player.theft || missions.interact() || activities.interact()) return
		if (player.car) return exitVehicle(game)
		const ride = nearestVehicle(player, cars)
		if (ride) enterVehicle(game, ride)
	}

	function simulate(controls, dt) {
		const now = game.clock += dt
		game.timeOfDay = (game.timeOfDay + dt * 1.32) % 1440
		for (const key of ['notice', 'dialogue']) if (game[key]?.until < now) game[key] = null
		const {presses} = controls
		if (presses.has('KeyE')) interact()
		if (game.menus.mode !== 'play') return
		if (presses.has('KeyV')) game.station = (game.station + 1) % STATIONS.length
		callCrew(game, presses)
		const {x, z} = player
		updateCombat(game, controls, dt)
		updatePlayer(game, controls, dt)
		const {career} = game
		const travel = Math.hypot(player.x - x, player.z - z)
		career.seconds += dt
		if (travel) game.atSafehouse = false
		if (player.car && !player.theft) career.distance += travel
		buildStanding(game, dt / 12)
		updateTraffic(cars, player, city, dt, now)
		updatePolice(game, dt)
		updatePedestrians(people, player, city, dt, now)
		updateGuards(game, dt)
		updateVehicleDamage(game, dt)
		prunePeople(person => person.expires <= now)
		missions.update(dt)
		activities.update(dt)
		effects.update(dt)
		if (player.health <= 0) game.menus.show('busted')
	}

	function renderState(controls, dt, title = false) {
		if (title) {
			const orbit = game.stillTitle ? 0 : game.clock * .037
			camera.position.set(250 + Math.sin(orbit) * 21, 58, 193 + Math.cos(orbit) * 19)
			camera.lookAt(147, 9, -105)
			if (camera.fov !== 54) {
				camera.fov = 54
				camera.updateProjectionMatrix()
			}
		} else rig.update(player, controls, dt)
		lightWorld(title ? 1089 : game.timeOfDay, title ? {x: 166, z: 45} : player, camera)
		camera.updateMatrixWorld()
		const dark = 1 - city.water.sun.value
		city.neon(dark)
		roadGlow(cars, title ? .42 : dark)
		city.windows.color.setScalar(.11 + dark * .89 + city.water.dusk.value * .13)
		city.water.time.value = game.clock
		markers(game.objective(), game.clock)
		sirens(police.units, game.clock)
	}

	reset()
	return Object.assign(game, {reset, interact, simulate, renderState, idle(dt) {
		const time = game.clock += dt
		updateTraffic(cars, player, city, dt, time)
		updatePedestrians(people, {x: 79, z: 36}, city, dt, time)
	}})
}
