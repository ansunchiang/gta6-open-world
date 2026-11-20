import { clamp } from '../render/geometry.js';

const progression = [45, 45, 40, 43, 45, 45, 48, 43];
const melody = [69, 72, 76, 79, 76, 74, 72, 67];
const hz = note => 440 * 2 ** ((note - 69) / 12);

export function createSynth() {
  let context;
  let master;
  let engine;
  let engineGain;
  let siren;
  let sirenGain;
  let noise;
  let muted = false;
  let nextBeat = 0;
  let nextFootfall = 0;
  let step = 0;

  function start() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return;
    }
    try {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = .46;
      master.connect(context.destination);
      engine = context.createOscillator();
      engine.type = 'sawtooth';
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 135;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engine.connect(filter).connect(engineGain).connect(master);
      engine.start();
      siren = context.createOscillator();
      siren.type = 'sine';
      sirenGain = context.createGain();
      sirenGain.gain.value = 0;
      siren.connect(sirenGain).connect(master);
      siren.start();
      noise = context.createBuffer(1, context.sampleRate * .43, context.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      nextBeat = context.currentTime;
    } catch {
      context = undefined;
    }
  }

  function tone(type, time, length, frequency, end, volume) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    if (end) osc.frequency.exponentialRampToValueAtTime(end, time + length);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, time + length);
    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + length + .02);
  }

  function hiss(time, level, cutoff, length) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noise;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(.0002, time + length);
    source.connect(filter).connect(gain).connect(master);
    source.start(time);
    source.stop(time + length + .01);
  }

  function effect(name) {
    if (!context || muted) return;
    const now = context.currentTime;
    if (name === 'shot') { hiss(now, .54, 1950, .22); tone('triangle', now, .13, 108, 37, .31); }
    if (name === 'impact') { hiss(now, .32, 780, .20); tone('sine', now, .15, 74, 39, .19); }
    if (name === 'swipe') hiss(now, .10, 1500, .19);
    if (name === 'door') { hiss(now, .25, 510, .16); tone('triangle', now, .13, 89, 47, .13); }
    if (name === 'reload' || name === 'empty') {
      hiss(now, .20, 3700, .07);
      if (name === 'reload') hiss(now + .35, .23, 2380, .10);
    }
    if (name === 'coin' || name === 'success') {
      const notes = name === 'coin' ? [72, 79] : [57, 64, 69, 72, 76];
      notes.forEach((note, i) => tone('triangle', now + i * .085, .39, hz(note), 0, .16));
    }
    if (name === 'radio') { hiss(now, .10, 2900, .16); tone('sine', now, .12, 715, 482, .055); }
  }

  function update(game, active) {
    if (!context || context.state !== 'running') return;
    const now = context.currentTime;
    master.gain.setTargetAtTime(muted ? 0 : .46, now, .035);
    engine.frequency.setTargetAtTime(34 + Math.abs(game.player.car?.speed ?? 0) * 2.26, now, .063);
    engineGain.gain.setTargetAtTime(active && game.player.car ? .19 : 0, now, .09);
    const patrol = Math.min(75, ...game.police.units.map(car => Math.hypot(car.x - game.player.x, car.z - game.player.z)));
    siren.frequency.setTargetAtTime(620 + 270 * Math.sin(now * 4.5), now, .045);
    sirenGain.gain.setTargetAtTime(active ? clamp(1 - patrol / 75, 0, 1) * .045 : 0, now, .15);
    if (active && !muted && !game.player.car && game.player.speed > 1 && now >= nextFootfall) {
      hiss(now, .047, 540, .062);
      nextFootfall = now + (game.player.speed > 5 ? .23 : .34);
    }
    if (nextBeat < now - .2) nextBeat = now;
    if (!active || muted || nextBeat > now + .11) return;
    const pulse = game.police.stars > 0;
    const accent = step % 8;
    const size = pulse ? .139 : .177;
    const root = progression[Math.floor(step / 8) % progression.length];
    if (accent === 0 || accent === 4) tone('sine', nextBeat, .24, 76, 36, pulse ? .19 : .11);
    if (accent === 2 || accent === 6) hiss(nextBeat, .039, 6200, .09);
    if ([0, 3, 5].includes(accent)) tone('triangle', nextBeat, .30, hz(root - (accent === 5 ? 12 : 0)), 0, .10);
    if ([1, 4, 7].includes(accent)) tone('sine', nextBeat, .43, hz(melody[(step + root) % 8]), 0, .040);
    step++;
    nextBeat += size;
  }

  return { start, effect, update, toggle() { muted = !muted; return muted; }, get muted() { return muted; } };
}
