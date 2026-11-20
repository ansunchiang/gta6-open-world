import * as T from '../../vendor/three.module.min.js';
import { GeometryBatch } from '../render/geometry.js';

const rigCache = new Map();
const skinTones = ['#bb7859', '#e0ab80', '#8b594e', '#bb896e', '#e5bc9e'];
const trousers = ['#293e4a', '#362f41', '#525b5a', '#414954'];

function buildRig(outfit, tone, style) {
  const player = style === 'player';
  const guard = style === 'guard' || style === 'officer';
  const torso = new GeometryBatch();
  const skin = skinTones[tone % skinTones.length];
  const pants = trousers[tone % trousers.length];
  torso.box(pants, 0, .915, 0, .42, .285, .28);
  torso.box(outfit, 0, 1.27, 0, .475, .55, .294);
  torso.box(player ? '#fff0d0' : outfit, 0, 1.325, -.155, .20, .42, .023);
  torso.box(skin, 0, 1.59, 0, .129, .22, .136);
  torso.ball(skin, 0, 1.76, -.009, .151, .19, .151);
  torso.ball(guard ? '#263d4e' : '#322531', 0, 1.849, .016, .165, .119, .165);
  for (const side of [-1, 1]) {
    torso.box('#362e34', side * .055, 1.778, -.146, .034, .017, .012);
    torso.ball(skin, side * .149, 1.735, .005, .019, .039, .026);
  }
  torso.ball(skin, 0, 1.732, -.152, .032, .042, .025);
  if (player) {
    torso.ball('#392a33', .075, 1.82, .143, .102, .115, .11);
    torso.box('#223644', -.019, 1.19, .17, .295, .31, .086, -.10);
    torso.box('#dc9c62', .047, 1.33, .168, .069, .445, .039, -.16);
    torso.box('#dcb283', -.05, 1.11, .219, .17, .072, .024);
    torso.box('#b35650', 0, .988, .002, .478, .11, .295);
  }
  if (guard) {
    torso.box(style === 'officer' ? '#547994' : '#404d4b', 0, 1.31, -.15, .39, .41, .086);
    torso.box('#282e3d', 0, 1.85, -.115, .26, .045, .194);
    torso.box('#cfab6d', -.093, 1.42, -.199, .07, .07, .018);
  }
  const arm = new GeometryBatch();
  arm.box(outfit, 0, -.15, 0, .143, .34, .167);
  arm.box(skin, 0, -.36, -.033, .104, .19, .112);
  arm.ball(skin, 0, -.475, -.043, .063, .077, .061);
  const leg = new GeometryBatch();
  leg.box(pants, 0, -.33, 0, .182, .685, .20);
  leg.box(player ? '#eac59f' : '#292e3b', 0, -.686, -.047, .182, .158, .296);
  const gun = new GeometryBatch();
  gun.box('#394350', 0, -.43, -.158, .082, .086, .25);
  gun.box('#232b34', 0, -.49, -.075, .065, .137, .075);
  const temp = new T.Group();
  return [torso, arm, leg, gun].map(part => part.make(temp));
}

export function createCharacter(scene, outfit, tone, style = 'civilian') {
  const key = [outfit, tone, style].join('/');
  if (!rigCache.has(key)) rigCache.set(key, buildRig(outfit, tone, style));
  const [torso, arm, leg, gun] = rigCache.get(key);
  const node = new T.Group();
  node.add(torso.clone());
  const arms = [];
  const legs = [];
  for (const side of [-1, 1]) {
    const hand = new T.Group();
    hand.position.set(side * .296, 1.465, -.012);
    hand.rotation.z = side * .135;
    hand.add(arm.clone());
    node.add(hand);
    arms.push(hand);
    const foot = new T.Group();
    foot.position.set(side * .117, .755, 0);
    foot.add(leg.clone());
    node.add(foot);
    legs.push(foot);
  }
  const weapon = gun.clone();
  arms[1].add(weapon);
  weapon.visible = false;
  scene.add(node);
  return { node, arms, legs, weapon };
}

export function animateCharacter(actor, clock, pace, dt) {
  const { node, arms, legs, weapon } = actor.model;
  const step = Math.sin(clock * (pace > 4 ? 12 : 8.3) + (actor.phase ?? 0)) * Math.min(1, pace / 2.7);
  const disabled = (actor.down ?? 0) > 0;
  node.position.set(actor.x, (actor.y ?? 0) + (disabled ? .27 : Math.abs(step) * .043), actor.z);
  node.rotation.set(disabled ? 1.46 : 0, -actor.heading, 0, 'YXZ');
  legs[0].rotation.x = step * .69;
  legs[1].rotation.x = -step * .69;
  const swing = actor.swing ?? 0;
  arms[0].rotation.x = -step * .42 - (actor.aim ? .93 : 0);
  arms[1].rotation.x = (actor.aim ? -1.41 : step * .42) - Math.sin(swing * Math.PI) * .7;
  arms[1].rotation.z = actor.aim ? -.15 : .135;
  weapon.visible = !!actor.armed;
}
