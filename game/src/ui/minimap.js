import {DISTRICTS, GRID, LAND, PLACES, mapRoute} from 'city-layout'
import {ACTIVITIES} from '../missions/activities.js'
import {slips} from '../world/marina.js'
import {CAUSEWAY} from '../world/districtStyles.js'
import {STORY} from 'story-jobs'

const zones = [
	[-207,-205,129,194,'#56a68b'], [-78,-205,223,185,'#58a6ca'],
	[145,-205,45,409,'#dba755'], [-207,-11,129,215,'#a89bd5'], [-78,-20,223,224,'#d98576'],
]
const icons = {safehouse: '■', garage: '✚', market: '✚'}
const ink = '#102a3c'

export function drawMap(canvas, {city, player, police}, job, full = false) {
	const ctx = canvas.getContext('2d')
	const {width, height} = canvas
	const scale = full ? Math.min(width / 510, height / 433) : 1.34
	const {x, z} = full ? {x: 23, z: 0} : player
	const rect = (hue, x, z, w, h) => {
		ctx.fillStyle = hue
		ctx.fillRect(x, z, w, h)
	}
	function path(points) {
		ctx.beginPath()
		for (const point of points) ctx.lineTo(...point)
	}
	function text(label, x, z, hue, size) {
		ctx.font = `bold ${size}px system-ui`
		ctx.fillStyle = hue
		ctx.fillText(label, x, z)
	}
	function icon({x, z}, label, hue, large = full) {
		const size = large ? 17 : 9
		rect(ink, x - size / 2, z - size / 2, size, size)
		text(label, x, z + size / 3, hue, large ? 14 : 7.5)
	}
	rect(full ? '#176b87' : '#244957', 0, 0, width, height)
	ctx.save()
	ctx.setTransform(scale, 0, 0, scale, width / 2 - x * scale, height / 2 - z * scale)
		ctx.textAlign = 'center'
	ctx.save()
	path(LAND)
	ctx.closePath()
	ctx.lineWidth = 4
	ctx.strokeStyle = '#73e3da'
	ctx.stroke()
	ctx.clip()
	if (full) for (const [x, z, w, h, hue] of zones) rect(hue, x, z, w, h)
	else rect('#54747a', -207, -205, 397, 410)
	const road = full ? '#254f60' : '#304953'
	for (const line of GRID) {
		rect(road, line - 6, -205, 12, 410)
		rect(road, -207, line - 6, 397, 12)
	}
	for (const {x, z, w, d, h} of city.footprints) {
		rect(h ? full ? '#fff1db60' : '#7d9394' : '#237b64', x - w / 2, z - d / 2, w, d)
	}
	ctx.restore()
	rect('#f1ca85', 190, -205, 32, 409)
	rect('#7bd7c2', 222, -205, 2.5, 409)
	for (const pier of slips) rect('#fae5b2', 211, pier - 2.8, 40, 5.6)
	rect('#ffe1a1', CAUSEWAY.x, CAUSEWAY.z - 7, CAUSEWAY.end - CAUSEWAY.x, 14)
	ctx.lineWidth = full ? 3 : 1.5
	ctx.setLineDash([3, 3])
	if (!full && police.stars && police.lastKnown) {
		const {x, z} = police.lastKnown
		ctx.beginPath()
		ctx.arc(x, z, 17 + Math.min(12, police.unseen * 1.45), 0, Math.PI * 2)
		ctx.fillStyle = '#eb9b9125'
		ctx.fill()
		ctx.strokeStyle = police.contact ? '#ffaea1ce' : '#aff5e1ce'
		ctx.stroke()
	}
	const site = job?.point
	const goal = job?.activity ? '#9ce9d7' : '#ffd18a'
	if (site) {
		ctx.strokeStyle = goal
		path(mapRoute(player, site))
		ctx.stroke()
	}
	ctx.setLineDash([])
	if (full) {
		for (const {anchor} of STORY) if (anchor !== site) icon(anchor, '◆', '#ffe396')
		icon(PLACES.dispatch, '▲', '#fe9ba6')
		text('Cinder Bay', 284, -76, '#b7f4ef', 18)
		text('BEACON CAUSEWAY', 249, 151, '#b7f4ef', 11)
		for (const {name, x, z, color} of DISTRICTS) {
			ctx.font = 'bold 18px system-ui'
			const w = ctx.measureText(name).width + 12
			rect(ink, x - w / 2, z - 46, w, 24)
			text(name, x, z - 28, color, 18)
		}
	}
	for (const marker of ACTIVITIES) icon(marker, full ? icons[marker.type] ?? '●' : marker.symbol, marker.color)
	if (site) icon(site, '◆', goal)
	for (const car of police.units) icon(car, '▲', '#ff7886', false)
	if (police.air) icon(police.air, '◆', '#adddff', false)
	ctx.translate(player.x, player.z)
	ctx.rotate(player.heading)
	ctx.font = `900 ${full ? 22 : 14}px system-ui`
	ctx.lineWidth = 3
	ctx.strokeStyle = ink
	ctx.strokeText('▲', 0, 5)
	ctx.fillStyle = '#fffbe5'
	ctx.fillText('▲', 0, 5)
	ctx.restore()
	ctx.textAlign = 'center'
	text(full ? '↑ N' : 'N', full ? width - 47 : width / 2, full ? 39 : 15, '#fff0cf', full ? 24 : 11)
}
