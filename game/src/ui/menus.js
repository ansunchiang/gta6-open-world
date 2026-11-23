import {WEAPONS, buyWeapon} from 'weapons'
import {garageUpgrades} from '../progression/garageUpgrades.js'
import {respectRank} from '../progression/respect.js'
import {createTitleScreen, id, money} from './titleScreen.js'
import {createPauseAtlas} from './pauseAtlas.js'

const shopItems = {
	garage: garageUpgrades,
	market: [
		{type: 'weapon', name: 'Mark II pistol', price: 235, description: 'More firearm damage'},
		{type: 'ammo', name: 'Ammo crate', price: 65, description: 'Refill reserves'},
		{type: 'repair', name: 'First aid', price: 55, description: 'Restore health and armor'},
		...WEAPONS.filter(weapon => weapon.price),
	],
}
const dialogs = {
	help: 'Controls', settings: 'Settings', garage: 'Rook’s Garage', market: 'Night Market', busted: 'Taken down',
}
const bindings = [
	['Move / drive', 'WASD or arrows'], ['Sprint / handbrake', 'Shift / Space'],
	['Talk / enter / exit', 'E'], ['Aim / center', 'Hold right mouse / C'],
	['Attack / equip / reload', 'LMB or F / 1–7 or Q / R'],
	['Radio / crew', 'V / X, Z, B'], ['Map / pause', 'M / Esc'],
]

export function createMenus(game, clearQueued) {
	const title = id('title'), atlas = id('atlas'), overlay = id('overlay')
	const panels = ['help', 'settings', 'shop', 'busted'].map(name => id(name + '-panel'))
	id('bindings').innerHTML = bindings.map(([action, key]) => `<dt>${action}<dd>${key}`).join('')
	let mode = 'title', back
	const refreshTitle = createTitleScreen(game)
	const openAtlas = createPauseAtlas(game, show)

	function show(next, tab) {
		const dialog = next === 'help' || next === 'settings'
		if (dialog) back = mode
		game.input.reset()
		clearQueued()
		mode = next
		const background = dialog ? back : mode
		title.hidden = background !== 'title'
		atlas.hidden = background !== 'pause'
		title.inert = atlas.inert = dialog
		const heading = dialogs[mode]
		const panel = shopItems[mode] ? 'shop' : mode
		overlay.hidden = !heading
		for (const node of panels) node.hidden = node.id !== panel + '-panel'
		if (mode === 'title') refreshTitle()
		if (mode === 'pause') openAtlas(tab)
		if (heading) id('overlay-title').textContent = heading
		if (shopItems[mode]) showShop(mode)
	}

	function showShop(type) {
		const {player, upgrades} = game
		const list = id('shop-items')
		id('shop-cash').textContent = money(player.money)
		list.replaceChildren()
		const rank = respectRank(player.rep).level
		for (const item of shopItems[type]) {
			const {id, type: service, name, description} = item
			const level = upgrades[service]
			const price = item.price + (level ?? 0) * 90
			const capped = level >= 2 || player.loadout[id]?.owned
			const locked = item.rank > rank
			const button = document.createElement('button')
			button.className = 'quiet'
			button.disabled = capped || locked || player.money < price
			const label = level == null ? name : `${name} · Lv ${level}`
			const cost = capped ? 'FULL' : locked ? 'RANK ' + item.rank : money(price)
			button.innerHTML = `<strong>${label}</strong><span>${cost}</span><small>${description ?? 'Weapon unlock'}</small>`
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
				showShop(type)
			}
			list.append(button)
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

	for (const button of ['resume', 'shop-back', 'help-back', 'settings-back']) id(button).onclick = togglePause
	id('title-help').onclick = () => show('help')
	id('settings').onclick = () => show('settings')
	id('retry').onclick = game.retry
	const sound = id('audio-button')
	sound.onclick = () => sound.textContent = game.audio.toggle() ? 'Sound off' : 'Sound on'
	id('orbit-button').onclick = event => {
		game.stillTitle = !game.stillTitle
		event.currentTarget.textContent = 'City camera ' + (game.stillTitle ? 'off' : 'on')
	}
	return {show, togglePause, toggleMap, get mode() { return mode; }}
}
