import {dispatchRoster} from '../ai/dispatchRoster.js'

export function createDispatchPanel(panel, list) {
	list.innerHTML = '<div class=unit></div>'.repeat(6)
	const rows = list.children
	return (police, player) => {
		const units = dispatchRoster(police, player)
		panel.hidden = units.length === 0
		for (const [i, row] of Array.from(rows).entries()) {
			const unit = units[i]
			row.hidden = !unit
			if (!unit) continue
			const {name, range, tactic} = unit
			const html = `<b>${name}</b><small>${range}m</small><span>${tactic}</span>`
			if (row.innerHTML !== html) row.innerHTML = html
			row.dataset.tactic = tactic
		}
	}
}
