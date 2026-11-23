import {PLACES as P} from 'city-layout'

export const CONTACTS = {
	ROOK: {outfit: '#6fa39c', skin: '#b47657', tone: 2},
	'IONA VALE': {outfit: '#e6b071', skin: '#825842', tone: 3},
	'SERA QUAY': {outfit: '#b673a7', skin: '#edb392', tone: 1},
	'DEX RILL': {outfit: '#547d9c', skin: '#b57b57', tone: 2},
}

const go = (task, point, options) => ({task, point, type: 'interact', ...options})
const hide = task => ({task, type: 'evade', timer: 75})
const hold = (task, point, seconds, guards) => ({task, point, seconds, guards, type: 'hold', timer: seconds + 24})
const steal = (task, vehicle, point, heat) => ({task, vehicle, point, heat, type: 'steal', timer: 75})
const recorder = {x: 239, z: -24, label: 'PIER RECORDER'}
const ledger = {x: -128.5, z: -119, label: 'CARGO LEDGER'}
const uplink = {x: 10.4, z: -158, label: 'RELAY UPLINK'}
const receive = {x: 241, z: 68, label: 'LISTENING POST'}
const cache = {x: -173, z: -65, label: 'SEIZED CACHE'}

export const STORY = [
	['Borrowed Tide', 'ROOK', P.garage, 320, 0,
		'Borrow the coral Volta and the commission’s access card.',
		'Take the buyer list to Iona at Beacon Strand.',
		[steal('Take the coral Volta', 'courier', null, .85), hide('Lose the harbor patrol'),
			go('Drop the access card', P.depot, {timer: 95})]],
	['Blind Water', 'IONA VALE', P.strand, 430, 0,
		'They cut my feed. Check the pier for my backup recorder.',
		'They sold the dock twice. The ledger is at Brine Terminal.',
		[go('Recover the pier recorder', recorder, {foot: true, timer: 75}), go('Bring the tape to Iona', P.strand)]],
	['False Cargo', 'ROOK', P.docks, 680, 0,
		'Ignore the uniforms. Take the ledger.',
		'Iona will air those names from Relay House.',
		[go('Take the cargo ledger', ledger, {foot: true, guards: 3, heat: 2.8, timer: 95}),
			hide('Break contact with Harbor Patrol'), go('Bring the ledger to Meter Depot', P.depot)]],
	['Dead Air', 'IONA VALE', P.tower, 980, 0,
		'Hold the relay until I have the records.',
		'Jammed. Find Sera at the marina.',
		[go('Activate the relay uplink', uplink, {foot: true, heat: 2.9}), hold('Defend the live uplink', uplink, 12, 3)]],
	['No Safe Berth', 'SERA QUAY', P.marina, 1250, 3,
		'Take my skiff offshore for the backup frequency.',
		'Dex has a runner for the causeway.',
		[steal('Board a Cinder skiff', 'boat', {x: 232, z: 46, label: 'CINDER 22'}, 0),
			go('Reach the listening post', receive, {vehicle: 'boat', timer: 80}), go('Report the frequency to Sera', P.marina)]],
	['Breakwater Signal', 'DEX RILL', P.race, 1560, 4,
		'Take the Tideglass to the beacon.',
		'Beacon is live. Recover the seized copies.',
		[steal('Take the Tideglass S9', 'tide', {x: 114, z: 133, label: 'TIDEGLASS S9'}, 2),
			go('Reach the causeway beacon', P.bridge, {vehicle: 'tide', timer: 75}), hide('Lose the interceptors')]],
	['The Long Cut', 'SERA QUAY', P.docks, 1890, 5,
		'Bring the copies to the Salt Flat.',
		'One copy stays here. The rest goes live.',
		[go('Recover the seized copies', cache, {foot: true, guards: 4, heat: 4.1, timer: 100}),
			hide('Get out of the search radius'), go('Stash a copy at the Salt Flat', P.safehouse)]],
	['Open Frequency', 'IONA VALE', P.tower, 2400, 6,
		'Hold Relay House. The boats are listening.',
		'Every boat heard you. The harbor is theirs again.',
		[go('Start the final broadcast', uplink, {foot: true, heat: 5}),
			hold('Hold the broadcast', uplink, 16, 4), hide('Leave the signal behind')]],
].map(([title, contact, anchor, reward, rank, intro, outro, steps]) =>
	({title, contact, anchor, reward, rank, intro, outro, steps}))
