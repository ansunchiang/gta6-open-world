import { PLACES } from '../world/cityLayout.js';

export const STORY = [
  {
    title: 'Borrowed Tide', contact: 'ROOK', anchor: PLACES.garage, outfit: '#6fa39c', tone: 2, reward: 320,
    intro: 'The harbor commission put a meter on every slip. The car outside has their access card. Borrow both.',
    outro: 'That card names a lot more than unpaid tickets. Take it to Iona at the Strand.',
  },
  {
    title: 'Blind Water', contact: 'IONA VALE', anchor: PLACES.strand, outfit: '#e6b071', tone: 3, reward: 430,
    intro: 'They cut my radio feed when I read the first name. My backup recorder is under the far pier rail.',
    outro: 'Hear that? They sold the same dock twice. The original ledger will be at Brine Terminal.',
  },
  {
    title: 'False Cargo', contact: 'ROOK', anchor: PLACES.docks, outfit: '#6fa39c', tone: 2, reward: 680,
    intro: 'Those are private guards in city uniforms. Get past them and lift the ledger before the truck rolls.',
    outro: 'Names, dates, signatures. Iona can make the whole bay hear it from Relay House.',
  },
  {
    title: 'Dead Air', contact: 'IONA VALE', anchor: PLACES.tower, outfit: '#e6b071', tone: 3, reward: 980,
    intro: 'Hold the uplink while I get the records on air. Ten seconds is all the city needs to hear us.',
    outro: 'We’re live. Every boat on this coast can hear their names. You did good, Mara.',
  },
];

export const LOOT = {
  recorder: { x: 239, z: -24, label: 'PIER RECORDER' },
  ledger: { x: -128.5, z: -119, label: 'CARGO LEDGER' },
  uplink: { x: 10.4, z: -158, label: 'RELAY UPLINK' },
};
