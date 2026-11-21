import { PLACES as P } from '../world/cityLayout.js';

export const CONTACTS = {
  ROOK: { outfit: '#6fa39c', skin: '#b47657', tone: 2 },
  'IONA VALE': { outfit: '#e6b071', skin: '#825842', tone: 3 },
  'SERA QUAY': { outfit: '#b673a7', skin: '#edb392', tone: 1 },
  'DEX RILL': { outfit: '#547d9c', skin: '#b57b57', tone: 2 },
};

const go = (task, point, options) => ({ task, point, type: 'interact', ...options });
const hide = task => ({ task, type: 'evade', timer: 75 });
const hold = (task, point, seconds, guards) => ({ task, point, seconds, guards, type: 'hold', timer: seconds + 24 });
const steal = (task, vehicle, point, heat) => ({ task, vehicle, point, heat, type: 'steal', timer: 75 });
const recorder = { x: 239, z: -24, label: 'PIER RECORDER' };
const ledger = { x: -128.5, z: -119, label: 'CARGO LEDGER' };
const uplink = { x: 10.4, z: -158, label: 'RELAY UPLINK' };
const receive = { x: 241, z: 68, label: 'LISTENING POST' };
const cache = { x: -173, z: -65, label: 'SEIZED CACHE' };

export const STORY = [
  { title: 'Borrowed Tide', contact: 'ROOK', anchor: P.garage, reward: 320,
    intro: 'The commission’s access card is in the coral Volta. Borrow both.',
    outro: 'That card names a lot more than unpaid tickets. Find Iona at Beacon Strand.',
    steps: [steal('Take the coral Volta', 'courier', null, .85), hide('Lose the harbor patrol'),
      go('Drop the access card', P.depot, { timer: 95 })] },
  { title: 'Blind Water', contact: 'IONA VALE', anchor: P.strand, reward: 430,
    intro: 'They cut my feed at the first name. The backup recorder is under the pier rail.',
    outro: 'They sold that dock twice. The original ledger is still at Brine Terminal.',
    steps: [go('Recover the pier recorder', recorder, { foot: true, timer: 75 }), go('Bring the tape to Iona', P.strand)] },
  { title: 'False Cargo', contact: 'ROOK', anchor: P.docks, reward: 680,
    intro: 'Those city uniforms are a cover. Take the ledger.',
    outro: 'Iona can make the whole bay hear those names. Meet her at Relay House.',
    steps: [go('Take the cargo ledger', ledger, { foot: true, guards: 3, heat: 2.8, timer: 95 }),
      hide('Break contact with Harbor Patrol'), go('Bring the ledger to Meter Depot', P.depot)] },
  { title: 'Dead Air', contact: 'IONA VALE', anchor: P.tower, reward: 980,
    intro: 'The relay has power. Hold it until I have the records.',
    outro: 'They jammed the broadcast halfway through. Sera has another way out.',
    steps: [go('Activate the relay uplink', uplink, { foot: true, heat: 2.9 }), hold('Defend the live uplink', uplink, 12, 3)] },
  { title: 'No Safe Berth', contact: 'SERA QUAY', anchor: P.marina, reward: 1250, rank: 3,
    intro: 'Take a skiff to my receiver past the breakwater. I need the backup frequency.',
    outro: 'Frequency checks out. Dex can put a runner on the causeway before morning.',
    steps: [steal('Board a Cinder skiff', 'boat', { x: 232, z: 46, label: 'CINDER 22' }, 0),
      go('Reach the listening post', receive, { vehicle: 'boat', timer: 80 }), go('Report the frequency to Sera', P.marina)] },
  { title: 'Breakwater Signal', contact: 'DEX RILL', anchor: P.race, reward: 1560, rank: 4,
    intro: 'The Tideglass is yours. Reach the beacon on the bridge.',
    outro: 'The transmitter is aimed. We still need the copies they seized at the harbor.',
    steps: [steal('Take the Tideglass S9', 'tide', { x: 114, z: 133, label: 'TIDEGLASS S9' }, 2),
      go('Reach the causeway beacon', P.bridge, { vehicle: 'tide', timer: 75 }), hide('Lose the interceptors')] },
  { title: 'The Long Cut', contact: 'SERA QUAY', anchor: P.docks, reward: 1890, rank: 5,
    intro: 'Take the seized copies from Brine Yards to the Salt Flat.',
    outro: 'I hid a copy at the flat. The rest goes live, one last time.',
    steps: [go('Recover the seized copies', cache, { foot: true, guards: 4, heat: 4.1, timer: 100 }),
      hide('Get out of the search radius'), go('Stash a copy at the Salt Flat', P.safehouse)] },
  { title: 'Open Frequency', contact: 'IONA VALE', anchor: P.tower, reward: 2400, rank: 6,
    intro: 'Hold Relay House. The boats are listening.',
    outro: 'Every boat on the coast heard you. The harbor belongs to the people who work it.',
    steps: [go('Start the final broadcast', uplink, { foot: true, heat: 5 }),
      hold('Hold the broadcast', uplink, 16, 4), hide('Leave the signal behind')] },
];
