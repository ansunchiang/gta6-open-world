import { STORY, LOOT } from './campaign.js';
import { PLACES } from '../world/cityLayout.js';
import { deployGuards } from '../ai/guardAI.js';
import { spawnPerson } from '../ai/pedestrianAI.js';
import { angle, distance } from '../render/geometry.js';
import { animateCharacter } from '../player/characterModel.js';

export function createMissionManager(game) {
  let chapter = 0;
  let stage = 0;
  let contact;
  let stolenAtStart = 0;
  let transmission = 0;

  function setChapter(index) {
    chapter = Math.min(STORY.length, index);
    stage = 0;
    transmission = 0;
    if (contact) contact.model.node.removeFromParent();
    contact = null;
    for (const guard of game.guards) guard.model.node.removeFromParent();
    game.guards = [];
    const plan = STORY[chapter];
    if (plan) {
      contact = spawnPerson(game.scene, plan.anchor.x, plan.anchor.z, plan.outfit, plan.tone, 'civilian', -.82);
      contact.model.node.scale.setScalar(1.07);
    }
  }

  function objective() {
    const plan = STORY[chapter];
    if (!plan) return { title: 'The city is yours', task: 'Run side jobs or explore Vesper Bay', optional: true };
    let task;
    let point;
    if (stage === 0) {
      task = 'Meet ' + (plan.contact === 'ROOK' ? 'Rook' : 'Iona Vale');
      point = plan.anchor;
    } else if (chapter === 0) {
      task = ['','Take the coral Volta', 'Lose the harbor patrol', 'Deliver the access card'][stage];
      point = stage === 1 ? game.cars[0] : stage === 3 ? PLACES.depot : null;
    } else if (chapter === 1) {
      task = stage === 1 ? 'Recover the pier recorder' : 'Bring the tape to Iona';
      point = stage === 1 ? LOOT.recorder : plan.anchor;
    } else if (chapter === 2) {
      const left = game.guards.filter(guard => !guard.down).length;
      task = stage === 1 ? (left ? `Clear terminal security · ${left} left` : 'Pick up the cargo ledger') : 'Lose the patrol and get to the depot';
      point = stage === 1 ? LOOT.ledger : PLACES.depot;
    } else {
      task = stage === 1 ? 'Activate the uplink' : `Hold the relay · ${Math.max(0, 10 - transmission).toFixed(1)} s`;
      point = LOOT.uplink;
    }
    return { title: plan.title, task, point, number: chapter + 1 };
  }

  function complete() {
    const plan = STORY[chapter];
    game.player.money += plan.reward;
    game.player.rep += 110 + chapter * 45;
    game.player.health = Math.min(100, game.player.health + 32);
    game.player.reserve = Math.max(24, game.player.reserve);
    game.speak(plan.contact, plan.outro, 8);
    game.toast(`$${plan.reward} · ${plan.title}`, 'JOB COMPLETE', 5.8);
    game.audio.effect('success');
    setChapter(chapter + 1);
    game.save();
  }

  function interact() {
    const plan = STORY[chapter];
    const { player } = game;
    if (!plan || player.theft || player.car && Math.abs(player.car.speed) > 3) return false;
    const point = objective().point;
    if (!point || distance(player, point) > 4.35) return false;
    if (stage === 0 && !player.car) {
      contact.heading = angle(player.x - contact.x, player.z - contact.z);
      animateCharacter(contact, game.clock, 0, 0);
      game.speak(plan.contact, plan.intro, 9.5);
      game.audio.effect('radio');
      stage = 1;
      stolenAtStart = game.stolen;
      if (chapter === 2) deployGuards(game, LOOT.ledger, 3);
      return true;
    }
    if (chapter === 0 && stage === 3) {
      complete();
      return true;
    }
    if (chapter === 1 && !player.car) {
      if (stage === 1) {
        stage = 2;
        game.speak('IONA VALE', 'If the red light still blinks, bring it straight back to me.', 6);
        game.audio.effect('coin');
      } else complete();
      return true;
    }
    if (chapter === 2 && stage === 1 && !player.car && game.guards.every(guard => guard.down)) {
      stage = 2;
      game.player.onCrime(2.78);
      game.speak('ROOK', 'Ledger’s real. Patrols are on the move. Lose them before you come back.', 7);
      return true;
    }
    if (chapter === 2 && stage === 2) {
      if (game.police.heat > 0) game.toast('Lose the patrol first', 'TERMINAL SECURITY');
      else complete();
      return true;
    }
    if (chapter === 3 && stage === 1 && !player.car) {
      stage = 2;
      deployGuards(game, LOOT.uplink, 3);
      game.player.onCrime(2.9);
      game.speak('IONA VALE', 'Carrier’s up. Stay by the uplink. I can see the harbor lights flickering.', 7.5);
      return true;
    }
    return false;
  }

  function update(dt) {
    if (chapter === 0 && stage === 1 && (game.stolen > stolenAtStart || game.player.car || game.player.theft)) {
      stage = 2;
      game.player.onCrime(1.03);
      game.speak('ROOK', 'They tagged the car. Break line of sight, then take the card to Meter Depot.', 7);
    }
    if (chapter === 0 && stage === 2 && game.police.heat <= 0) {
      stage = 3;
      game.speak('ROOK', 'Dispatch went quiet. Meter Depot is clear.', 5.4);
    }
    if (chapter === 3 && stage === 2) {
      if (distance(game.player, LOOT.uplink) < 15 && !game.player.car) transmission += dt;
      if (transmission >= 10) complete();
    }
  }

  function prompt() {
    const obj = objective();
    if (!obj.point || distance(game.player, obj.point) > 4.35) return '';
    if (stage === 0 && !game.player.car) return `Talk to ${STORY[chapter].contact}`;
    if (chapter === 0 && stage === 3) return 'Drop the access card';
    if (chapter === 1 && !game.player.car) return stage === 1 ? 'Take the recorder' : 'Hand Iona the tape';
    if (chapter === 2 && stage === 1 && !game.player.car && game.guards.every(guard => guard.down)) return 'Take the ledger';
    if (chapter === 2 && stage === 2 && !game.police.heat) return 'Deliver the ledger';
    if (chapter === 3 && stage === 1 && !game.player.car) return 'Start broadcast';
    return '';
  }

  setChapter(0);
  return { objective, prompt, interact, update, setChapter,
    get chapter() { return chapter; },
    get stage() { return stage; },
  };
}
