import {PLACES} from 'city-layout'
import {distance} from 'geometry'
import {earnCash} from '../progression/careerStats.js'

export const ACTIVITIES = [
	['race', 'Breakwater Sprint', 'R', '#78e5dc'],
	['delivery', 'Lockside Courier', 'C', '#e8abe9'],
	['market', 'Night Market', '+', '#edb1e7'],
	['garage', 'Rook’s Garage', 'G', '#78e5dc'],
	['marina', 'Marina Slalom', 'B', '#86d6ff'],
	['safehouse', 'The Salt Flat', 'H', '#ffcb91'],
].map(([place, title, symbol, color]) => ({
	...PLACES[place], type: place === 'marina' ? 'boat' : place, title, symbol, color,
}))

const points = rows => rows.map(([x, z, label]) => ({x, z, label}))
const routes = {
	race: points([[120,65], [120,0], [180,0], [180,63], [180,120], [120,120]]),
	boat: points([[258,56,'OUTBOUND BUOY'], [283,16,'OFFSHORE BUOY'], [263,-21,'BEACON BUOY'], [237,39,'MARINA FINISH']]),
}
const stashLocations = points([
	[43,43], [194,111], [-73,-49], [246,-25], [-164,169], [48,-111], [100,111], [-169,-74],
])
const terms = {race: [54, 285], delivery: [75, 235], boat: [65, 385]}

export function createActivities(game) {
	let active = null
	const stashes = new Set()
	const {player, audio, police} = game
	const speed = () => Math.abs(player.car?.speed ?? 0)
	const arrival = () => active?.type === 'delivery' && distance(player, PLACES.market) < 6 && speed() < 3
	function nearby() {
		const vehicle = player.car?.type
		if (vehicle === 'boat' && distance(player, PLACES.marina) < 25) return ACTIVITIES[4]
		return ACTIVITIES.find(site => {
			if (site.type === 'boat' || site.type === 'race' && (!vehicle || vehicle === 'boat')) return false
			return distance(site, player) < 4.8
		})
	}

	function interact() {
		if (active) {
			const arrived = arrival()
			if (arrived) finish()
			return arrived
		}
		const site = nearby()
		if (!site) return false
		const {type} = site
		const [time, reward] = terms[type] ?? []
		if (time) {
			active = {...site, time, reward, index: 0, route: routes[type]}
			audio.effect('radio')
		} else if (type === 'safehouse' && !player.car) {
			if (police.stars) game.toast('Lose dispatch first', 'SAFEHOUSE')
			else {
				player.health = player.armor = 100
				game.atSafehouse = true
				game.toast(game.save() ? 'Career saved' : 'Recovered', 'THE SALT FLAT')
			}
		} else if ((type === 'market' || type === 'garage') && speed() < 2) {
			if (police.stars) game.toast('Lose dispatch first', 'SERVICE UNAVAILABLE')
			else game.menus.show(type)
		} else return false
		return true
	}

	function finish() {
		const {type, title, reward} = active
		const {events} = game.career
		earnCash(game, reward, 18)
		if (!events.includes(type)) events.push(type)
		player.rep += type === 'delivery' ? 52 : 65
		game.toast(`$${reward} · ${title}`, 'ACTIVITY COMPLETE')
		active = null
		audio.effect('success')
		game.save()
	}

	function update(dt) {
		if (active) {
			const {route, type, index} = active
			if ((active.time -= dt) <= 0) {
				game.toast('Return to restart', 'TIME EXPIRED')
				active = null
			} else if (route && player.car && (player.car.type === 'boat') === (type === 'boat') &&
					distance(player, route[index]) < 9) {
				audio.effect('coin')
				if (++active.index === route.length) finish()
			}
		}
		for (let i = 0; i < stashLocations.length; i++) {
			if (stashes.has(i) || distance(stashLocations[i], player) > 1.7) continue
			stashes.add(i)
			earnCash(game, 65, 9)
			player.rep += 15
			player.armor = Math.min(100, player.armor + 40)
			game.toast('$65 + armor', 'SUPPLY PICKUP')
			audio.effect('coin')
			game.save()
		}
	}

	function objective() {
		if (!active) return null
		const {title, route, index, time} = active
		return {
			title, task: route ? 'Reach the next checkpoint' : 'Deliver the parcel',
			stage: index + 1, stages: route?.length ?? 1, remaining: time,
			next: index + 1 < route?.length ? 'Next checkpoint' : 'Collect payout',
			point: route?.[index] ?? PLACES.market,
			activity: true,
		}
	}

	function prompt() {
		if (arrival()) return 'Hand over parcel'
		if (active) return ''
		const location = nearby()
		if (!location) return ''
		if (location.type === 'safehouse') return player.car ? '' : 'Use safehouse'
		return (terms[location.type] ? 'Start ' : 'Browse ') + location.title
	}

	function reset(saved = []) {
		active = null
		stashes.clear()
		for (const index of saved) stashes.add(index)
	}
	return {interact, update, objective, prompt, reset, stashes, stashLocations}
}
