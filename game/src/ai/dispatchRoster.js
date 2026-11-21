import { distance } from '../render/geometry.js';

const callsigns = ['GULL', 'REEF', 'TIDE', 'PIER', 'BUOY', 'JETTY'];

export function registerUnit(police, unit, tactic = 'PATROL') {
  const number = police.sequence++;
  unit.callsign = callsigns[number % callsigns.length] + '-' + (12 + number);
  unit.tactic = tactic;
}

export function dispatchRoster(police, player) {
  const ground = police.units.map(unit => ({
    name: unit.callsign, tactic: unit.tactic, range: Math.round(distance(unit, player)),
  })).sort((a, b) => a.range - b.range);
  const air = police.air;
  if (air) ground.splice(0, 0, {
    name: 'KITE-01', tactic: air.visible ? 'SPOTLIGHT' : 'AIR SWEEP', range: Math.round(distance(air, player)),
  });
  return ground.slice(0, 6);
}
