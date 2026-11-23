import {dispatchRoster} from '../ai/dispatchRoster.js'

export function createDispatchPanel(panel, list) {
	list.innerHTML = '<div class=unit></div>'.repeat(6)
	const rows = [...list.children]
	return (police, player) => {
		const units = dispatchRoster(police, player)
		panel.hidden = units.length === 0
		rows.forEach((row, i) => {
			const unit = units[i]
			row.hidden = !unit
			if (!unit) return
			const {name, range, tactic} = unit
			if (row.textContent === name + range + 'm' + tactic) return
			row.innerHTML = `<b>${name}</b><small>${range}m</small><span>${tactic}</span>`
			row.dataset.tactic = tactic
		})
	}
}
