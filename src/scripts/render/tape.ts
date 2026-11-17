import { app } from '../app'
import { glyphOf, isBigH, supports } from '../fonts/logic'
import { FONT_CONFIG } from '../fonts/manifest'
import { runs } from '../model/runs'
import { cpOffset, state } from '../model/state'
import { toast } from '../ui/toast'
import { glyphInk } from '../util/color'
import { $, ta } from '../util/dom'
import { charLabel, hueOf } from './shared'

export function renderTape(): void {
	const tape = $('wwTape')
	tape.innerHTML = ''
	tape.style.setProperty('--gs', state.previewSize + 'px')
	tape.style.setProperty('--tk', state.tracking + 'px')
	tape.style.setProperty('--lg', state.lineGap + 'px')
	tape.style.setProperty('--fg', glyphInk())
	tape.className = 'tape ' + state.paper + ' ' + state.align
	const legend = $('wwTapeLegend')
	legend.innerHTML = ''
	if (!state.chars.length) {
		const e = document.createElement('div')
		e.className = 'tape-empty'
		tape.appendChild(e)
		return
	}
	const mkLine = (): HTMLElement => {
		const l = document.createElement('div')
		l.className = 'line'
		return l
	}
	let line = mkLine()
	let popEl: HTMLElement | null = null
	state.chars.forEach((c, i) => {
		const nl = c.ch === '\n'
		const sp = c.ch === ' '
		const ok = supports(c.key, c.ch)
		const cell = document.createElement('div')
		cell.className = 'cell' + (nl ? ' nl' : '') + (sp ? ' sp' : '') + (ok ? '' : ' miss')
		cell.style.setProperty('--hue', hueOf(c.key))
		cell.dataset.i = String(i)
		const g = document.createElement('div')
		g.className = 'gly ' + c.key + (isBigH(c.key, c.ch) ? ' big-h' : '')
		g.textContent = nl ? '↵' : glyphOf(c.key, c.ch)
		const r = document.createElement('div')
		r.className = 'real'
		r.textContent = nl ? '↵' : sp ? '␣' : c.ch
		cell.appendChild(g)
		cell.appendChild(r)
		cell.title =
			FONT_CONFIG[c.key].name + ' · ' + charLabel(c.ch) + (ok ? '' : ' · 该字体无此字形') + ' · 单击字符定位，双击删除'
		if (i === state.popIndex) {
			cell.classList.add('pop')
			popEl = cell
		}
		line.appendChild(cell)
		if (nl) {
			tape.appendChild(line)
			line = mkLine()
		}
	})
	if (line.children.length) tape.appendChild(line)
	state.popIndex = -1
	const popCell = popEl as HTMLElement | null
	if (popCell) {
		const top = popCell.offsetTop
		const bot = top + popCell.offsetHeight
		if (bot > tape.scrollTop + tape.clientHeight) tape.scrollTop = bot - tape.clientHeight + 8
		else if (top < tape.scrollTop) tape.scrollTop = top - 8
	}
	const rs = runs()
	if (rs.length > 1) {
		rs.forEach(r => {
			const t = document.createElement('span')
			t.style.setProperty('--hue', FONT_CONFIG[r.key].hue)
			t.appendChild(document.createElement('i'))
			t.appendChild(document.createTextNode(FONT_CONFIG[r.key].name + ' · ' + Array.from(r.text).length + '字'))
			t.title = '点击设为键盘字体'
			t.addEventListener('click', () => app.setActiveFont(r.key))
			legend.appendChild(t)
		})
	}
}

function tapeCellAt(e: Event): number {
	const el = (e.target as HTMLElement).closest('.cell') as HTMLElement | null
	return el ? +el.dataset.i! : -1
}

export function initTape(): void {
	const tape = $('wwTape')
	tape.addEventListener('click', e => {
		const i = tapeCellAt(e)
		if (i < 0 || i >= state.chars.length) return
		const s = cpOffset(i)
		const input = ta()
		input.focus()
		input.setSelectionRange(s, s + state.chars[i].ch.length)
		Array.prototype.forEach.call(tape.querySelectorAll('.cell.sel'), (c: HTMLElement) => {
			c.classList.remove('sel')
		})
		;((e.target as HTMLElement).closest('.cell') as HTMLElement).classList.add('sel')
	})
	tape.addEventListener('dblclick', e => {
		const i = tapeCellAt(e)
		if (i < 0 || i >= state.chars.length) return
		const s = cpOffset(i)
		const label = charLabel(state.chars[i].ch)
		const input = ta()
		input.setRangeText('', s, s + state.chars[i].ch.length, 'end')
		app.syncFromTextarea()
		input.focus()
		toast('已删除：' + label)
	})
}
