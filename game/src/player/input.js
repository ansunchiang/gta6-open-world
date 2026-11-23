const gameplayKeys = /^(Key[WASDEFQRCMPVXZB]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Digit[1-7]|Space|Escape|Enter)$/

export function createInput(canvas) {
	const held = new Set(), presses = new Set()
	let mouseX = 0, mouseY = 0, aim = false, attack = false

	function reset() {
		held.clear()
		presses.clear()
		aim = attack = false
		mouseX = mouseY = 0
	}
	addEventListener('keydown', event => {
		const {code} = event
		if (!gameplayKeys.test(code)) return
		if ((code === 'Enter' || code === 'Space') && document.activeElement?.tagName === 'BUTTON') return
		if (!event.repeat) presses.add(code)
		held.add(code)
		event.preventDefault()
	})
	addEventListener('keyup', event => held.delete(event.code))
	addEventListener('blur', reset)
	canvas.addEventListener('mousedown', ({button}) => {
		if (button === 2) aim = true
		if (button === 0) {
			attack = true
			presses.add('MouseAttack')
		}
	})
	addEventListener('mouseup', ({button}) => {
		if (button === 2) aim = false
		if (button === 0) attack = false
	})
	canvas.addEventListener('contextmenu', event => event.preventDefault())
	addEventListener('mousemove', ({movementX, movementY}) => {
		if (!aim) return
		mouseX += movementX
		mouseY += movementY
	})
	const down = (...keys) => keys.some(key => held.has(key))
	const axis = (positive, negative) => Number(down(...positive)) - Number(down(...negative))
	return {
		reset,
		take(key) { return presses.delete(key); },
		poll() {
			const controls = {
				throttle: axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']),
				steer: axis(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']),
				sprint: down('ShiftLeft','ShiftRight'),
				brake: down('Space'),
				aim, attack: attack || down('KeyF'),
				mouseX, mouseY, presses: new Set(presses),
			}
			mouseX = mouseY = 0
			presses.clear()
			return controls
		},
	}
}
