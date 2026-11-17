import { $ } from '../util/dom'

let toastTimer: ReturnType<typeof setTimeout> | null = null

export function toast(msg: string, warn?: boolean) {
	const el = $('toast')
	el.textContent = msg
	el.classList.toggle('warn', !!warn)
	el.classList.add('show')
	if (toastTimer) clearTimeout(toastTimer)
	toastTimer = setTimeout(() => {
		el.classList.remove('show')
	}, 1700)
}
