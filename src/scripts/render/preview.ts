import { app } from '../app'
import { filterText, supports } from '../fonts/logic'
import { FONT_CONFIG, ORDER } from '../fonts/manifest'
import { plain, state } from '../model/state'
import { $ } from '../util/dom'

interface PreviewRow {
	row: HTMLElement
	txt: HTMLElement
	miss: HTMLElement
}

const fpRows: Record<string, PreviewRow> = {}

export function fpRow(key: string): PreviewRow {
	return fpRows[key]
}

export function initPreviewRows(): void {
	const preview = $('wwPreview')
	ORDER.forEach(key => {
		const c = FONT_CONFIG[key]
		const row = document.createElement('div')
		row.className = 'fp-row'
		row.style.setProperty('--hue', c.hue)
		row.title = '设为键盘字体 · ' + c.charset
		const name = document.createElement('span')
		name.className = 'fp-name'
		name.appendChild(document.createElement('i'))
		name.appendChild(document.createTextNode(c.name))
		const txt = document.createElement('div')
		txt.className = 'fp-txt ' + key
		const miss = document.createElement('span')
		miss.className = 'fp-miss'
		row.appendChild(name)
		row.appendChild(txt)
		row.appendChild(miss)
		row.addEventListener('click', () => app.setActiveFont(key))
		preview.appendChild(row)
		fpRows[key] = { row, txt, miss }
	})
}

export function renderPreview(): void {
	const text = plain()
	ORDER.forEach(key => {
		const o = fpRows[key]
		const c = FONT_CONFIG[key]
		const list = Array.from(filterText(key, text))
		let missing = 0
		o.txt.style.letterSpacing = state.tracking + 'px'
		o.txt.innerHTML = ''
		if (!list.length) {
			const s = document.createElement('span')
			s.className = 'empty'
			s.textContent = '—'
			o.txt.appendChild(s)
		} else {
			let buf = ''
			let bad = ''
			const flush = (): void => {
				if (buf) {
					o.txt.appendChild(document.createTextNode(buf))
					buf = ''
				}
				if (bad) {
					const b = document.createElement('span')
					b.className = 'fallback'
					b.textContent = bad
					b.title = c.name + '无此字符'
					o.txt.appendChild(b)
					bad = ''
				}
			}
			list.forEach(ch => {
				if (ch === '\n') {
					flush()
					const br = document.createElement('span')
					br.className = 'fp-br'
					br.textContent = '↵'
					o.txt.appendChild(br)
					return
				}
				if (supports(key, ch)) {
					if (bad) flush()
					buf += ch
				} else {
					missing++
					if (buf) flush()
					bad += ch
				}
			})
			flush()
		}
		const fixed = key === 'font-DigitalTube'
		o.miss.textContent = fixed ? '仅含数字' : missing ? '缺' + missing : ''
		o.miss.title = fixed
			? c.name + '仅含数字 · ' + c.charset
			: missing
				? c.name + '缺' + missing + '个字符 · ' + c.charset
				: ''
	})
}
