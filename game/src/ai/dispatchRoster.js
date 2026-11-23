import {distance} from '../render/geometry.js'

const callsigns = ['GULL', 'REEF', 'TIDE', 'PIER', 'BUOY', 'JETTY']

export function registerUnit(police, unit) {
	const number = police.sequence++
	unit.callsign = callsigns[number % callsigns.length] + '-' + (12 + number)
	unit.tactic = 'PATROL'
}

export function dispatchRoster(police, player) {
	const row = (actor, name, tactic) => ({name, tactic, range: Math.round(distance(actor, player))})
	const ground = police.units.map(unit => row(unit, unit.callsign, unit.tactic)).sort((a, b) => a.range - b.range)
	const air = police.air
	if (air) ground.unshift(row(air, 'KITE-01', air.visible ? 'SPOTLIGHT' : 'AIR SWEEP'))
	return ground.slice(0, 6)
}
