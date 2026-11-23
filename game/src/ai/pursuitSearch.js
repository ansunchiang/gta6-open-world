import {clamp, distance, offset} from '../render/geometry.js'
import {closestStreet} from '../world/cityLayout.js'

const grace = 3.4

export function createSearch() {
	return {sweeping: false, progress: 0, radius: 17, initialHeat: 0, sector: -1, posts: []}
}

export function refreshSearch(police) {
	police.search = createSearch()
	police.escapeTime = null
}

export function recordPosition(police, actor) {
	const {x, z, heading, car} = actor
	police.lastKnown = {x, z, heading, speed: car?.speed ?? 0}
}

export function streetPost({x, z}, lane = 0) {
	const streetX = closestStreet(x), streetZ = closestStreet(z)
	return Math.abs(streetX - x) < Math.abs(streetZ - z)
		? {x: streetX + lane, z: clamp(z, -184, 184)}
		: {x: clamp(x, -184, 184), z: streetZ + lane}
}

function assignPosts(search, report) {
	search.posts = [0, 1, 2, 3].map(index => {
		const heading = report.heading + (search.sector + index * 2) * Math.PI / 4
		return streetPost(offset(report, search.radius, 0, heading))
	})
}

export function stepSearch(police, player, dt) {
	if (police.contact) {
		recordPosition(police, player)
		police.unseen = 0
		if (police.search.sweeping) refreshSearch(police)
		return
	}

	if ((police.unseen += dt) < grace) return
	const {search, lastKnown} = police
	if (!search.sweeping) {
		search.sweeping = true
		search.initialHeat = police.heat
	}
	const sector = Math.floor((police.unseen - grace) / 3)
	search.radius = Math.min(34, 17 + sector * 3)
	if (sector !== search.sector) {
		search.sector = sector
		assignPosts(search, lastKnown)
	}

	const outside = distance(player, lastKnown) > search.radius
	const moving = Math.abs(player.car?.speed ?? player.speed) > 4
	const fade = outside ? .41 : moving ? .21 : .30
	const wait = Math.max(0, 7 - police.quiet)
	if (wait === 0) police.heat = Math.max(0, police.heat - dt * fade)
	search.progress = 1 - police.heat / search.initialHeat
	police.escapeTime = wait + police.heat / fade
}
