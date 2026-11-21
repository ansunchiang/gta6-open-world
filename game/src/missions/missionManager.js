import { CONTACTS, STORY } from './storyJobs.js';
import { deployGuards } from '../ai/guardAI.js';
import { spawnPerson } from '../ai/pedestrianAI.js';
import { distance } from '../render/geometry.js';
import { respectRank } from '../progression/respect.js';

export function createMissionManager(game) {
  let chapter = 0, stage = 0, contact, remaining, held;
  const plan = () => STORY[chapter];
  const step = () => plan()?.steps[stage - 1];

  function setChapter(index) {
    chapter = Math.min(STORY.length, index);
    stage = 0;
    remaining = null;
    contact?.model.node.removeFromParent();
    deployGuards(game, null, 0);
    const job = plan();
    contact = job ? spawnPerson(game.scene, job.anchor.x, job.anchor.z,
      CONTACTS[job.contact].outfit, CONTACTS[job.contact].tone, 'civilian', -.82) : null;
  }

  function objective() {
    const job = plan();
    if (!job) return { title: 'The city is yours', task: 'Run side jobs or explore Vesper Bay', optional: true };
    const current = step();
    const guards = current?.guards && game.guards.filter(guard => !guard.down).length;
    const locked = job.rank && respectRank(game.player.rep).level < job.rank;
    return {
      title: job.title, contact: job.contact, number: chapter + 1, total: STORY.length,
      stage: stage + 1, stages: job.steps.length + 1, remaining,
      task: locked ? 'Earn respect to reach rank ' + job.rank : !current ? 'Meet ' + job.contact :
        guards && current.type !== 'hold' ? 'Clear security · ' + guards + ' left' :
        current.seconds ? current.task + ' · ' + Math.max(0, Math.ceil(current.seconds - held)) + 's' : current.task,
      point: !current ? job.anchor : current.vehicle === 'courier' ? game.cars[0] : current.point,
      next: job.steps[stage]?.task ?? 'Job payout',
    };
  }

  function advance() {
    const job = plan();
    stage++;
    if (stage > job.steps.length) {
      const { player } = game;
      player.money += job.reward;
      player.rep += 110 + chapter * 65;
      player.health = Math.min(100, player.health + 32);
      player.loadout.pistol.stock = Math.max(24, player.loadout.pistol.stock);
      game.speak(job.contact, job.outro, 8);
      game.toast('$' + job.reward + ' · ' + job.title, 'JOB COMPLETE', 5.8);
      game.audio.effect('success');
      setChapter(chapter + 1);
      game.save();
      return;
    }
    const current = step();
    held = 0;
    remaining = current.timer ?? null;
    if (current.guards) deployGuards(game, current.point, current.guards);
    if (stage > 1) game.speak(job.contact, current.type === 'evade' ?
      'Dispatch has your signal. Get out of sight.' : current.task + '. I’m on your frequency.', 7);
  }

  function prompt() {
    const job = plan();
    const { player } = game;
    if (!job || player.theft || Math.abs(player.car?.speed ?? 0) > 4) return '';
    const site = objective().point;
    if (!site || distance(player, site) > (step()?.vehicle ? 8 : 5.2)) return '';
    if (!stage) return !player.car && (!job.rank || respectRank(player.rep).level >= job.rank) ? 'Talk to ' + job.contact : '';
    const current = step();
    if (current.type !== 'interact' || current.foot && player.car ||
        current.vehicle && current.vehicle !== player.car?.type ||
        current.guards && game.guards.some(guard => !guard.down)) return '';
    return current.task;
  }

  function interact() {
    if (!prompt()) return false;
    if (!stage) {
      game.speak(plan().contact, plan().intro, 9.5);
      game.audio.effect('radio');
    } else if (step().heat) game.player.onCrime(step().heat);
    advance();
    return true;
  }

  function update(dt) {
    const current = step();
    if (!current) return;
    if (remaining !== null) {
      remaining -= dt;
      if (remaining <= 0) {
        setChapter(chapter);
        game.toast('Return to your contact to retry', 'JOB TIME EXPIRED');
        return;
      }
    }
    const { player } = game;
    const car = player.car ?? player.theft?.car;
    if (current.type === 'steal' && car && (current.vehicle === 'courier' ? car === game.cars[0] : car.type === current.vehicle)) {
      if (current.heat) player.onCrime(current.heat);
      advance();
    } else if (current.type === 'evade' && game.police.heat <= 0) advance();
    else if (current.type === 'hold' && !car && distance(player, current.point) < 15) {
      held += dt;
      if (held >= current.seconds) advance();
    }
  }

  setChapter(0);
  return { objective, prompt, interact, update, setChapter, get chapter() { return chapter; }, get stage() { return stage; } };
}
