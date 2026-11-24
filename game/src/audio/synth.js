import {distance} from '../render/geometry.js'

export const STATIONS = [
	{ name: 'TIDELINE 88.3', song: 'Oxbow Heat', beat: .172, wave: 'triangle',
		bass: [45, 45, 40, 43, 45, 45, 48, 43], melody: [69, 72, 76, 79, 76, 74, 72, 67] },
	{ name: 'MARROW FM', song: 'Neon in the Brine', beat: .135, wave: 'square',
		bass: [42, 42, 45, 47, 42, 40, 38, 40], melody: [66, 73, 78, 73, 67, 71, 76, 73] },
	{ name: 'BEACON AM', song: 'Porcelain Coast', beat: .232, wave: 'sine',
		bass: [48, 48, 43, 45, 41, 41, 43, 43], melody: [76, 79, 84, 81, 77, 76, 74, 69] },
]

const hz = note => 440 * 2 ** ((note - 69) / 12)
const sounds = {
	shot: [128, 42], blast: [99, 29], explosion: [72, 19],
	door: [95, 45], reload: [310, 175], empty: [190, 125], swipe: [240, 83],
	impact: [68, 34], radio: [790, 420], coin: [880, 1320], success: [440, 880],
}

export function createSynth() {
	let ctx, master, engine, patrol, muted = false, beat = 0, step = 0

	function oscillator(type, sustain = false) {
		const voice = new OscillatorNode(ctx, {type})
		const volume = new GainNode(ctx, {gain: 0})
		voice.connect(volume).connect(master)
		if (sustain) voice.start()
		return {voice, gain: volume.gain}
	}

	function start() {
		if (!ctx) {
			try { ctx = new AudioContext(); } catch { return; }
			master = new GainNode(ctx, {gain: .48})
			master.connect(ctx.destination)
			engine = oscillator('triangle', true)
			patrol = oscillator('sine', true)
		}
		if (!muted) ctx.resume().catch(() => {})
	}

	function tone(time, length, from, to, volume, type = 'triangle') {
		const {voice, gain} = oscillator(type)
		const end = time + length
		voice.frequency.setValueAtTime(from, time)
		if (to) voice.frequency.exponentialRampToValueAtTime(to, end)
		gain.setValueAtTime(volume, time)
		gain.exponentialRampToValueAtTime(.0001, end)
		voice.start(time)
		voice.stop(end)
	}

	function update({player, police, station}, active) {
		if (muted || ctx?.state !== 'running') return
		const now = ctx.currentTime
		const {car} = player
		engine.voice.frequency.setTargetAtTime(33 + Math.abs(car?.speed ?? 0) * 2.1, now, .07)
		engine.gain.setTargetAtTime(active && car ? .24 : 0, now, .07)
		const range = Math.min(72, ...police.units.map(unit => distance(unit, player)))
		patrol.voice.frequency.setTargetAtTime(675 + 245 * Math.sin(now * 4.4), now, .035)
		patrol.gain.setTargetAtTime(active ? (1 - range / 72) * .069 : 0, now, .09)
		if (beat < now - .2) beat = now
		if (!active || beat > now + .09) return
		const {bass, melody, wave, beat: tempo} = STATIONS[station]
		const phrase = step % 8, root = bass[Math.floor(step / 8) % 8]
		if (phrase % 4 === 0) tone(beat, .2, 74, 37, .16, 'sine')
		const low = phrase % 2 === 0
		tone(beat, .29, hz(low ? root : melody[(step + root) % 8]), 0, low ? .11 : .036, wave)
		step++
		beat += tempo
	}
	return {
		start, update,
		effect(name) {
			if (ctx?.state !== 'running' || muted) return
			const [from, to] = sounds[name]
			tone(ctx.currentTime, name === 'explosion' ? .61 : .14, from, to, .18)
		},
		toggle() {
			muted = !muted
			if (muted) ctx?.suspend().catch(() => {})
			else start()
			return muted
		},
	}
}
