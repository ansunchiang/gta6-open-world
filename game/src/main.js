import * as T from '../vendor/three.module.min.js'
import {createInput} from './player/input.js'
import {createSimulation, NEUTRAL} from './world/simulation.js'
import {createHud} from './ui/hud.js'
import {id} from './ui/titleScreen.js'
import {createMenus} from './ui/menus.js'
import {prepareShot} from './shots.js'

const FIXED_STEP = 1 / 60

function boot() {
	const canvas = id('view')
	let renderer
	try { renderer = new T.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'}); }
	catch {
		id('title').hidden = true
		id('error-panel').hidden = false
		return
	}
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = T.PCFShadowMap
	renderer.toneMapping = T.ACESFilmicToneMapping
	renderer.toneMappingExposure = 1.16
	const scene = new T.Scene()
	const camera = new T.PerspectiveCamera(64, 1, .16, 1600)
	const input = createInput(canvas)
	const query = new URLSearchParams(location.search), preset = query.get('shot')
	const shot = ['chase', 'street', 'atlas', 'title'].includes(preset) && preset
	const game = createSimulation(scene, camera, Number(query.get('seed')) || 2601, input, !!shot)
	const hud = createHud()
	const queued = new Set()
	const menus = game.menus = createMenus(game, () => queued.clear())
	menus.show('title')
	if (shot) prepareShot(game, shot)

	function resize() {
		renderer.setPixelRatio(Math.min(1.5, devicePixelRatio, 1920 / innerWidth))
		renderer.setSize(innerWidth, innerHeight, false)
		camera.aspect = innerWidth / innerHeight
		camera.updateProjectionMatrix()
	}
	resize()
	addEventListener('resize', resize)
	let frozen = !!shot, lag = 0, last = performance.now()
	document.addEventListener('visibilitychange', () => {
		if (document.hidden && menus.mode === 'play' && !frozen) menus.togglePause()
	})
	const [title, atlas, panel] = ['title', 'atlas', 'hud'].map(id)
	function frame(now) {
		requestAnimationFrame(frame)
		const dt = Math.min(.08, (now - last) / 1000)
		last = now
		if (input.take('Escape') || input.take('KeyP')) menus.togglePause()
		if (input.take('KeyM')) menus.toggleMap()
		if (input.take('Enter') && document.activeElement === document.body) menus.confirm()
		const controls = input.poll(), active = menus.mode === 'play'
		const {presses, attack, aim, throttle, steer} = controls
		const interactive = presses.size || attack || aim || throttle || steer
		if (frozen && (interactive || active && (shot === 'atlas' || shot === 'title'))) {
			frozen = false
			if (active) game.audio.start()
		}
		for (const key of presses) queued.add(key)
		controls.presses = queued
		if (active && !frozen) {
			lag += dt
			while (lag >= FIXED_STEP && menus.mode === 'play') {
				game.simulate(controls, FIXED_STEP)
				queued.clear()
				lag -= FIXED_STEP
			}
		} else if (!frozen && !title.hidden) game.idle(dt)
		if (!active) {
			lag = 0
			queued.clear()
		}
		const view = frozen && shot === 'street' ? {...NEUTRAL, aim: true} : active ? controls : NEUTRAL
		game.renderState(view, frozen ? 0 : dt, !title.hidden)
		panel.hidden = !title.hidden || !atlas.hidden
		if (!panel.hidden) hud(game, camera, view)
		game.audio.update(game, active && !frozen)
		renderer.render(scene, camera)
		if (frozen) window.__shotReady = true
	}
	requestAnimationFrame(frame)
}

boot()
