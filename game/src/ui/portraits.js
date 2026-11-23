import {CONTACTS} from 'story-jobs'

export function drawPortrait(canvas, name) {
	const ctx = canvas.getContext('2d')
	const {outfit, skin} = CONTACTS[name] ?? CONTACTS.ROOK
	const hat = name === 'ROOK' || name === 'DEX RILL'
	for (const [color, path] of [
		['#19323d', 'M0 0h64v64H0Z'], [outfit, 'M0 48L55 0h9v52L46 64H0Z'],
		['#273f50', 'M7 64l5-11 14-7 8 9 10-10 12 7 2 12Z'],
		['#231e25', 'M20 46l-5-14 1-13 7-9 14-3 10 7 3 15-7 14Z'],
		[skin, 'M23 22l8-5 13 4 1 12-6 11-3 5-6 2-6-7-3-11Z'],
		['#513439', 'M24 27h7v2h-7Zm13 0h6v2h-6Zm-7 11h8v2h-8Z'],
		[name === 'ROOK' ? '#476272' : '#222c43', hat ? 'M15 22l2-9 8-5h15l9 7 2 7-10-2-11 3Z' :
			'M16 34l-3-11 6-12 12-4 13 3 5 10h-7l-9-6-7 7-4 16-4 8Z'],
	]) {
		ctx.fillStyle = color
		ctx.fill(new Path2D(path))
	}
}
