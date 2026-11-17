import { app } from '../app'
import { FONT_CONFIG, ORDER } from '../fonts/manifest'
import { state } from '../model/state'
import { $ } from '../util/dom'
import { fpRow } from './preview'

const chipEls: Record<string, HTMLElement> = {}

export function initChips() {
	const host = $('wwFontSelect')
	ORDER.forEach(key => {
		const el = document.createElement('button')
		el.type = 'button'
		el.className = 'chip'
		el.style.setProperty('--hue', FONT_CONFIG[key].hue)
		el.appendChild(document.createElement('i'))
		el.appendChild(document.createTextNode(FONT_CONFIG[key].name))
		el.title = FONT_CONFIG[key].charset
		el.addEventListener('click', () => app.setActiveFont(key))
		host.appendChild(el)
		chipEls[key] = el
	})
}

export function syncActive() {
	ORDER.forEach(k => {
		chipEls[k].classList.toggle('on', k === state.activeFont)
		fpRow(k).row.classList.toggle('on', k === state.activeFont)
	})
	const c = FONT_CONFIG[state.activeFont]
	const badge = $('wwActiveName')
	badge.textContent = c.name
	badge.style.background = c.hue
}
