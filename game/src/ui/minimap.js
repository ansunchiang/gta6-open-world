import {BEACH, DISTRICTS, GRID, LAND, PLACES, PROMENADE, mapRoute} from '../world/cityLayout.js'
import {ACTIVITIES} from '../missions/activities.js'
import {slips} from '../world/waterfront.js'
import {CAUSEWAY} from '../world/districtStyles.js'
import {STORY} from '../missions/storyJobs.js'

const zones = [
	[-207, -205, 129, 194, '#56a68b'], [-78, -205, 223, 185, '#58a6ca'],
	[145, -205, 45, 409, '#dba755'], [-207, -11, 129, 215, '#a89bd5'],
	[-78, -20, 223, 224, '#d98576'],
]
const icons = {safehouse: '■', garage: '✚', market: '✚'}
const ink = '#102a3c'

export function drawMap(canvas, {city, player, police}, job, full = false) {
	const ctx = canvas.getContext('2d')
	const {width, height} = canvas
	const scale = full ? Math.min(width / 510, height / 433) : 1.34
	const center = full ? {x: 23, z: 0} : player
	function rect(x, z, w, h, color) {
		ctx.fillStyle = color
		ctx.fillRect(x, z, w, h)
	}
	function text(label, x, z, color, size = 18) {
		ctx.font = `700 ${size}px system-ui`
		ctx.fillStyle = color
		ctx.fillText(label, x, z)
	}
	function icon({x, z}, glyph, color, size = full ? 17 : 9) {
		const half = size / 2
		rect(x - half, z - half, size, size, ink)
		text(glyph, x, z + size / 3, color, size * .83)
	}
	function path(points, color, width, closed = false) {
		ctx.beginPath()
		for (const point of points) ctx.lineTo(...point)
		if (closed) ctx.closePath()
		ctx.lineWidth = width
		ctx.strokeStyle = color
		ctx.stroke()
	}

	ctx.save()
	ctx.textAlign = 'center'
	rect(0, 0, width, height, full ? '#176b87' : '#244957')
	ctx.transform(scale, 0, 0, scale, width / 2 - center.x * scale, height / 2 - center.z * scale)
	ctx.save()
	path(LAND, '#73e3da', 4, true)
	ctx.clip()
	for (const zone of full ? zones : [[-207, -205, 397, 410, '#54747a']]) rect(...zone)
	const road = full ? '#254f60' : '#304953'
	for (const street of GRID) {
		rect(street - 6, -205, 12, 410, road)
		rect(-207, street - 6, 397, 12, road)
	}
	const facade = full ? '#fff1db60' : '#7d9394'
	for (const {x, z, w, d, h} of city.footprints) rect(x - w / 2, z - d / 2, w, d, h ? facade : '#237b64')
	ctx.restore()
	if (full) for (const depth of [9, 18, 32]) {
		path(BEACH.map(([x, z]) => [x + depth, z]), '#58becc60', 1.4)
	}
	path([[190, -205], ...BEACH, [190, 204]], '#84d9be', 2.5, true)
	ctx.fillStyle = '#f1ca85'
	ctx.fill()
	path(PROMENADE, '#9a815b', full ? 3 : 2)
	for (const pier of slips) rect(211, pier - 2.8, 40, 5.6, '#fae5b2')
	const {x, z, end} = CAUSEWAY
	path([[x, z], [end, z]], '#ffe1a1', 16)
	path([[x, z], [end, z]], road, 9)
	rect(end - 3, z - 8, 6, 16, '#ffe1a1')

	const {radius, sweeping, posts} = police.search
	ctx.setLineDash([3, 3])
	if (police.stars && police.lastKnown && (!full || sweeping)) {
		ctx.beginPath()
		ctx.arc(police.lastKnown.x, police.lastKnown.z, radius, 0, Math.PI * 2)
		ctx.fillStyle = sweeping ? '#84e9d045' : '#eb9b9125'
		ctx.fill()
		ctx.lineWidth = 1.5
		ctx.strokeStyle = sweeping ? '#aff5e1' : '#ffaea1ce'
		ctx.stroke()
		if (sweeping) for (const post of posts) rect(post.x - 1, post.z - 1, 2, 2, '#d5ffeb')
	}
	const site = job?.point
	const routeColor = job?.activity ? '#9ce9d7' : '#ffd18a'
	if (site) path(mapRoute(player, site), routeColor, full ? 3 : 1.5)
	ctx.setLineDash([])
	if (full) {
		for (const {anchor} of STORY) if (anchor !== site) icon(anchor, '◆', '#ffe396')
		icon(PLACES.dispatch, '▲', '#fe9ba6')
		text('Cinder Bay', 284, -76, '#b7f4ef')
		text('BEACON CAUSEWAY', 249, 151, '#b7f4ef', 11)
		for (const {name, color, x, z} of DISTRICTS) {
			ctx.font = '700 18px system-ui'
			const width = ctx.measureText(name).width + 12
			rect(x - width / 2, z - 46, width, 24, ink)
			text(name, x, z - 28, color)
		}
	}
	for (const marker of ACTIVITIES) icon(marker, full ? icons[marker.type] ?? '●' : marker.symbol, marker.color)
	if (site) icon(site, '◆', routeColor)
	for (const car of police.units) icon(car, '▲', '#ff7886', 9)
	if (police.air) icon(police.air, '◆', '#adddff', 9)
	ctx.translate(player.x, player.z)
	ctx.rotate(player.heading)
	icon({x: 0, z: 0}, '▲', '#fffbe5', full ? 20 : 13)
	ctx.restore()
	ctx.textAlign = 'center'
	text(full ? '↑ N' : 'N', full ? width - 47 : width / 2, full ? 39 : 15, '#fff0cf', full ? 24 : 11)
}
