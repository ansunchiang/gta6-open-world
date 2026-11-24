import {WEAPONS, buyWeapon} from '../combat/weapons.js'
import {garageUpgrades, respectRank} from '../progression/careerStats.js'
import {createTitleScreen, id, money} from './titleScreen.js'
import {createPauseAtlas} from './pauseAtlas.js'

const shops = {
	garage: garageUpgrades,
	market: [
		{type: 'weapon', name: 'Mark II pistol', price: 235},
		{type: 'ammo', name: 'Ammo crate', price: 65},
		{type: 'repair', name: 'First aid', price: 55},
		...WEAPONS.filter(item => item.price),
	],
}
const dialogs = {
	help: 'Controls', settings: 'Settings', garage: 'Rook’s Garage', market: 'Night Market', busted: 'Taken down',
}

export function createMenus(game, clearQueued) {
	const title = id('title'), atlas = id('atlas'), overlay = id('overlay')
	const panels = overlay.querySelectorAll('[data-panel]')
	let mode = 'title', back
	const refreshTitle = createTitleScreen(game)
	const openAtlas = createPauseAtlas(game, show)

	function show(next, tab) {
		const dialog = next === 'help' || next === 'settings'
		if (dialog) back = mode
		const background = dialog ? back : next
		game.input.reset()
		clearQueued()
		mode = next
		title.hidden = background !== 'title'
		atlas.hidden = background !== 'pause'
		title.inert = atlas.inert = dialog
		const heading = dialogs[mode]
		const stock = shops[mode]
		overlay.hidden = !heading
		for (const node of panels) node.hidden = node.dataset.panel !== (stock ? 'shop' : mode)
		if (mode === 'title') refreshTitle()
		if (mode === 'pause') openAtlas(tab)
		if (heading) id('overlay-title').textContent = heading
		if (stock) showShop(stock)
	}

	function showShop(stock) {
		const {player, upgrades} = game
		const list = id('shop-items')
		id('shop-cash').textContent = money(player.money)
		list.replaceChildren()
		const rank = respectRank(player.rep).level
		for (const item of stock) {
			const {id, type: service, name} = item
			const level = upgrades[service]
			const price = item.price + (level ?? 0) * 90
			const capped = level >= 2 || player.loadout[id]?.owned
			const locked = item.rank > rank
			const cost = capped ? 'FULL' : locked ? 'RANK ' + item.rank : money(price)
			const label = level == null ? name : `${name} · Lv ${level}`
			list.insertAdjacentHTML('beforeend', `<button class=quiet><b>${label}</b><span>${cost}</span></button>`)
			const button = list.lastChild
			button.disabled = capped || locked || player.money < price
			button.onclick = () => {
				player.money -= price
				if (level != null) upgrades[service]++
				if (id) buyWeapon(player, item)
				if (service === 'ammo') for (const {id, capacity} of WEAPONS) {
					const supply = player.loadout[id]
					if (supply.owned) supply.stock = Math.min(200, supply.stock + capacity * 4)
				}
				if (service === 'repair') {
					player.health = player.armor = 100
					if (player.car) player.car.health = 100
				}
				game.audio.effect('coin')
				game.save()
				showShop(stock)
			}
		}
	}

	function togglePause() {
		const next = {help: back, settings: back, play: 'pause', pause: 'play', garage: 'play', market: 'play'}[mode]
		if (next) show(next)
	}

	function toggleMap() {
		if (mode === 'pause' && id('atlas-tabs').firstChild.getAttribute('aria-pressed') === 'true') show('play')
		else if (mode === 'play' || mode === 'pause') show('pause', 'Map')
	}

	for (const node of document.querySelectorAll('[data-back]')) node.onclick = togglePause
	for (const node of document.querySelectorAll('[data-menu]')) node.onclick = () => show(node.dataset.menu)
	id('retry').onclick = game.retry
	const sound = id('audio-button')
	sound.onclick = () => sound.textContent = game.audio.toggle() ? 'Sound off' : 'Sound on'
	const orbit = id('orbit-button')
	orbit.onclick = () => {
		game.stillTitle = !game.stillTitle
		orbit.textContent = game.stillTitle ? 'City camera off' : 'City camera on'
	}
	function confirm() {
		if (mode === 'title') id(id('continue').disabled ? 'start' : 'continue').click()
		if (mode === 'busted') game.retry()
	}
	return {show, togglePause, toggleMap, confirm, get mode() { return mode }}
}
