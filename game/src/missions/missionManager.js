import {CONTACTS, STORY} from 'story-jobs'
import {deployGuards} from '../ai/guardAI.js'
import {spawnPerson} from '../ai/pedestrianAI.js'
import {distance} from 'geometry'
import {respectRank} from '../progression/respect.js'
import {earnCash} from '../progression/careerStats.js'

export function createMissionManager(game) {
	let chapter = 0, stage = 0, contact, remaining, held
	const {player, audio, cars, scene, police} = game
	const plan = () => STORY[chapter]
	const step = () => plan()?.steps[stage - 1]
	const rankOK = job => respectRank(player.rep).level >= job.rank
	const opponents = () => game.guards.filter(guard => !guard.down).length
	function point(current, job) {
		if (!current) return job.anchor
		return current.vehicle === 'courier' ? cars[0] : current.point
	}

	function setChapter(index) {
		chapter = Math.min(STORY.length, index)
		stage = 0
		remaining = null
		contact?.model.node.removeFromParent()
		deployGuards(game, null, 0)
		const job = plan()
		if (!job) { contact = null; return; }
		const {outfit, tone} = CONTACTS[job.contact]
		contact = spawnPerson(scene, job.anchor.x, job.anchor.z, outfit, tone, 'civilian', -.82)
	}

	function objective() {
		const job = plan()
		if (!job) return {title: 'The city is yours', task: 'Explore or run side jobs'}
		const current = step()
		const guards = current?.guards && current.type !== 'hold' && opponents()
		return {
			title: job.title, contact: job.contact, number: chapter + 1, total: STORY.length,
			stage: stage + 1, stages: job.steps.length + 1, remaining,
			task: !rankOK(job) ? 'Earn respect to reach rank ' + job.rank : !current ? 'Meet ' + job.contact :
				guards ? 'Clear security · ' + guards + ' left' :
				current.seconds ? current.task + ' · ' + Math.max(0, Math.ceil(current.seconds - held)) + 's' : current.task,
			point: point(current, job),
			next: job.steps[stage]?.task ?? 'Job payout',
		}
	}

	function advance() {
		const job = plan()
		stage++
		if (stage > job.steps.length) {
			earnCash(game, job.reward, 29)
			player.rep += 110 + chapter * 65
			player.health = Math.min(100, player.health + 32)
			player.loadout.pistol.stock = Math.max(24, player.loadout.pistol.stock)
			game.speak(job.contact, job.outro, 8)
			game.toast('$' + job.reward + ' · ' + job.title, 'JOB COMPLETE', 5.8)
			audio.effect('success')
			setChapter(chapter + 1)
			game.save()
			return
		}
		const current = step()
		held = 0
		remaining = current.timer ?? null
		if (current.guards) deployGuards(game, current.point, current.guards)
		if (stage > 1) game.speak(job.contact, current.type === 'evade' ? 'Break line of sight.' : current.task, 7)
	}

	function prompt() {
		const job = plan()
		if (!job || player.theft || Math.abs(player.car?.speed ?? 0) > 4) return ''
		const current = step(), site = point(current, job)
		if (!site || distance(player, site) > (current?.vehicle ? 8 : 5.2)) return ''
		if (!stage) return !player.car && rankOK(job) ? 'Talk to ' + job.contact : ''
		if (current.type !== 'interact' || current.foot && player.car ||
				current.vehicle && current.vehicle !== player.car?.type ||
				current.guards && opponents()) return ''
		return current.task
	}

	function interact() {
		if (!prompt()) return false
		const {contact, intro} = plan()
		if (!stage) {
			game.speak(contact, intro, 9.5)
			audio.effect('radio')
		} else if (step().heat) player.onCrime(step().heat)
		advance()
		return true
	}

	function update(dt) {
		const current = step()
		if (!current) return
		if (remaining !== null && (remaining -= dt) <= 0) {
			setChapter(chapter)
			game.toast('Talk to your contact to retry', 'TIME EXPIRED')
			return
		}
		const car = player.car ?? player.theft?.car
		if (current.type === 'steal' && car && (current.vehicle === 'courier' ? car === cars[0] : car.type === current.vehicle)) {
			if (current.heat) player.onCrime(current.heat)
			advance()
		} else if (current.type === 'evade' && police.heat <= 0) advance()
		else if (current.type === 'hold' && !car && distance(player, current.point) < 15) {
			held += dt
			if (held >= current.seconds) advance()
		}
	}

	return {objective, prompt, interact, update, setChapter, get chapter() { return chapter; }, get stage() { return stage; }}
}
