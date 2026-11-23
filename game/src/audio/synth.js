import {STATIONS} from 'radio-stations'

const hz = note => 440 * 2 ** ((note - 69) / 12)
const sounds = {
	shot: [.49, 1700, .16, 135, 40], blast: [.74, 1100, .32, 110, 27],
	explosion: [.85, 590, .42, 93, 21], door: [.25, 720, .12, 83, 42],
	reload: [.19, 4200, .07], empty: [.12, 2000, .05], swipe: [.10, 1700, .08],
	impact: [.28, 810, .15, 68, 34], radio: [.12, 3400, .09, 790, 420],
}

export function createSynth() {
	let ctx, master, engine, patrol, noise
	let muted = false, beat = 0, step = 0

	function channel(type, sustained = false) {
		const voice = new OscillatorNode(ctx, {type}), gain = new GainNode(ctx, {gain: 0})
		voice.connect(gain).connect(master)
		if (sustained) voice.start()
		return {voice, gain: gain.gain}
	}

	function envelope(gain, volume, time, end) {
		gain.setValueAtTime(volume, time)
		gain.exponentialRampToValueAtTime(.0001, end)
	}

	function start() {
		if (!ctx) {
			try { ctx = new AudioContext(); } catch { return; }
			master = ctx.createGain()
			master.connect(ctx.destination)
			engine = channel('triangle', true)
			patrol = channel('sine', true)
			noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .5), ctx.sampleRate)
			const data = noise.getChannelData(0)
			for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
		}
		if (ctx.state === 'suspended') ctx.resume().catch(() => {})
	}

	function tone(time, length, from, to, volume, type = 'triangle') {
		const {voice, gain} = channel(type)
		voice.frequency.setValueAtTime(from, time)
		if (to) voice.frequency.exponentialRampToValueAtTime(to, time + length)
		envelope(gain, volume, time, time + length)
		voice.start(time)
		voice.stop(time + length)
	}

	function hiss(time, volume, cutoff, length) {
		const source = new AudioBufferSourceNode(ctx, {buffer: noise})
		const filter = new BiquadFilterNode(ctx, {frequency: cutoff}), gain = ctx.createGain()
		envelope(gain.gain, volume, time, time + length)
		source.connect(filter).connect(gain).connect(master)
		source.start(time)
		source.stop(time + length)
	}

	function effect(name) {
		if (!ctx || muted) return
		const now = ctx.currentTime
		if (sounds[name]) {
			const [level, cut, length, from, to] = sounds[name]
			hiss(now, level, cut, length)
			if (from) tone(now, length, from, to, .23)
		} else {
			const notes = name === 'success' ? [57,64,69,76] : [72,79]
			notes.forEach((note, i) => tone(now + i * .10, .32, hz(note), 0, .14))
		}
	}

	function update({player: {car, x, z}, police, station}, active) {
		if (ctx?.state !== 'running') return
		const now = ctx.currentTime
		master.gain.setTargetAtTime(muted ? 0 : .48, now, .04)
		engine.voice.frequency.setTargetAtTime(33 + Math.abs(car?.speed ?? 0) * 2.1, now, .07)
		engine.gain.setTargetAtTime(active && car ? .24 : 0, now, .07)
		const range = Math.min(72, ...police.units.map(unit => Math.hypot(unit.x - x, unit.z - z)))
		patrol.voice.frequency.setTargetAtTime(675 + 245 * Math.sin(now * 4.4), now, .035)
		patrol.gain.setTargetAtTime(active ? (1 - range / 72) * .069 : 0, now, .09)
		if (beat < now - .2) beat = now
		if (!active || muted || beat > now + .09) return
		const {bass, melody, wave, beat: tempo} = STATIONS[station]
		const phrase = step % 8, root = bass[Math.floor(step / 8) % 8]
		if (!(phrase % 4)) tone(beat, .20, 74, 37, .16, 'sine')
		if (phrase === 2 || phrase === 6) hiss(beat, .047, 5100, .075)
		if ([0, 3, 5].includes(phrase)) tone(beat, .29, hz(root), 0, .11)
		if ([1, 4, 7].includes(phrase)) tone(beat, .32, hz(melody[(step + root) % 8]), 0, .026, wave)
		step++
		beat += tempo
	}
	return {start, update, effect, toggle() { muted = !muted; return muted; }}
}
