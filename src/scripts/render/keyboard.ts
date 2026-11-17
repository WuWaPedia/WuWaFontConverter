import { app } from '../app'
import { glyphOf, isBigH, isDisabled } from '../fonts/logic'
import { FONT_CONFIG } from '../fonts/manifest'
import { state } from '../model/state'
import { $ } from '../util/dom'
import { pulse } from './pulse'

let keyMap: Record<string, HTMLElement> = {}
let funcKeys: Record<string, HTMLElement> = {}

export function keyEl(ch: string): HTMLElement | undefined {
	return keyMap[ch]
}

export function funcKey(id: string): HTMLElement | undefined {
	return funcKeys[id]
}

export function pulseKey(ch: string, cls: string) {
	pulse(keyMap[ch], cls)
}

export function pulseFunc(id: string, cls: string) {
	pulse(funcKeys[id], cls)
}

function mkFunc(id: string, label: string, fn: () => void): HTMLElement {
	const b = document.createElement('div')
	b.className = 'kbtn func'
	b.textContent = label
	b.addEventListener('click', e => {
		e.preventDefault()
		fn()
		const ta = $('wwInput') as HTMLTextAreaElement
		ta.focus()
	})
	funcKeys[id] = b
	return b
}

export function renderKeyboard() {
	const kbKeys = $('wwKeyboardKeys')
	kbKeys.innerHTML = ''
	keyMap = {}
	funcKeys = {}
	FONT_CONFIG[state.activeFont].rows.forEach(r => {
		const row = document.createElement('div')
		row.className = 'kb-row'
		r.forEach(ch => {
			const dis = isDisabled(state.activeFont, ch)
			const b = document.createElement('div')
			b.className = 'kbtn' + (dis ? ' disabled' : ' ' + state.activeFont)
			const g = document.createElement('span')
			g.className = 'kg' + (isBigH(state.activeFont, ch) ? ' big-h' : '')
			g.textContent = glyphOf(state.activeFont, ch)
			b.appendChild(g)
			if (dis) {
				b.setAttribute('aria-disabled', 'true')
				b.title = '七丘文字无此字母'
			} else {
				const real = document.createElement('span')
				real.className = 'kr'
				real.textContent = ch
				b.appendChild(real)
				b.title = '输入' + ch
				b.addEventListener('click', e => {
					e.preventDefault()
					app.insertChar(ch)
					const ta = $('wwInput') as HTMLTextAreaElement
					ta.focus()
				})
			}
			keyMap[ch] = b
			row.appendChild(b)
		})
		kbKeys.appendChild(row)
	})
	const fr = document.createElement('div')
	fr.className = 'kb-row'
	fr.appendChild(
		mkFunc('clear', '✕ 清空', () => {
			if (state.clearSnapshot) app.undoClear()
			else app.clearAll()
		})
	)
	fr.appendChild(mkFunc('space', '␣ 空格', () => app.insertChar(' ')))
	fr.appendChild(mkFunc('enter', '↵ 换行', () => app.insertChar('\n')))
	fr.appendChild(mkFunc('back', '⌫ 退格', () => app.backspace()))
	kbKeys.appendChild(fr)
	app.syncClearButtons()
}

export function initKeyboard() {
	// 点键时不让textarea失焦，光标位置得以保留
	$('wwKeyboardKeys').addEventListener('mousedown', e => {
		if ((e.target as HTMLElement).closest('.kbtn')) e.preventDefault()
	})
}
