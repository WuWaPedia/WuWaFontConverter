import { app } from '../app'
import { TABLE_CHARS, glyphOf, isBigH, isDisabled } from '../fonts/logic'
import { ALL_FONTS, FONT_CONFIG, ORDER } from '../fonts/manifest'
import { state } from '../model/state'
import { toast } from '../ui/toast'
import { $ } from '../util/dom'

const tableFont = (): HTMLSelectElement => $('wwTableFont') as HTMLSelectElement
const tableBody = (): HTMLElement => $('wwTableBody')

export function initTableOptions(): void {
	const sel = tableFont()
	const o = document.createElement('option')
	o.value = ALL_FONTS
	o.textContent = '全部文字对照'
	sel.appendChild(o)
	ORDER.forEach(key => {
		const op = document.createElement('option')
		op.value = key
		op.textContent = FONT_CONFIG[key].name
		sel.appendChild(op)
	})
}

export function renderTable(): void {
	const q = (($('wwTableSearch') as HTMLInputElement).value || '').trim().toLowerCase()
	const select = tableFont()
	const body = tableBody()
	const keys = select.value === ALL_FONTS ? ORDER : [select.value]
	const multi = keys.length > 1
	let shown = 0
	let total = 0
	body.innerHTML = ''
	keys.forEach(key => {
		const c = FONT_CONFIG[key]
		const list = TABLE_CHARS[key]
		total += list.length
		const hit = q ? list.filter(ch => ch.toLowerCase() === q) : list
		if (!hit.length) return
		shown += hit.length
		const sec = document.createElement('section')
		sec.className = 'tbl-sec'
		sec.style.setProperty('--hue', c.hue)
		const head = document.createElement('div')
		head.className = 'tbl-h'
		const nm = document.createElement('span')
		nm.className = 'fh-name'
		nm.textContent = c.name
		nm.title = c.name + ' · ' + c.charset
		const cnt = document.createElement('span')
		cnt.className = 'fh-count'
		cnt.textContent = q ? hit.length + '/' + list.length : String(list.length)
		head.appendChild(nm)
		head.appendChild(cnt)
		if (multi) {
			const only = document.createElement('button')
			only.type = 'button'
			only.className = 'btn sm fh-only'
			only.textContent = '只看'
			only.title = '对照表只显示' + c.name
			only.addEventListener('click', () => {
				select.value = key
				renderTable()
				app.save()
			})
			head.appendChild(only)
		}
		sec.appendChild(head)
		const grid = document.createElement('div')
		grid.className = 'tbl-grid'
		hit.forEach(ch => {
			const dis = isDisabled(key, ch)
			const cell = document.createElement('div')
			cell.className = 'tcell' + (dis ? ' disabled' : '')
			const g = document.createElement('div')
			g.className = 'tglyph ' + key + (isBigH(key, ch) ? ' big-h' : '')
			g.textContent = glyphOf(key, ch)
			const l = document.createElement('div')
			l.className = 'tlabel'
			l.textContent = ch
			cell.appendChild(g)
			cell.appendChild(l)
			if (dis) {
				cell.title = c.name + '无此字母'
			} else {
				cell.title = '录入' + ch + '（' + c.name + '）'
				cell.addEventListener('click', () => {
					const keep = state.activeFont
					state.activeFont = key
					app.insertChar(ch)
					state.activeFont = keep
					app.render()
					app.save()
					toast('已录入' + ch + ' · ' + c.name)
				})
			}
			grid.appendChild(cell)
		})
		sec.appendChild(grid)
		body.appendChild(sec)
	})
	if (!shown) {
		const e = document.createElement('div')
		e.className = 'tbl-empty'
		e.textContent = q ? '没有匹配“' + q + '”的字符' : '没有可显示的字符'
		body.appendChild(e)
	}
	const cntEl = $('wwTableCount')
	cntEl.innerHTML = ''
	cntEl.appendChild(document.createTextNode(q ? '筛选“' + q + '” · 命中' : '共'))
	const b = document.createElement('b')
	b.textContent = String(shown)
	cntEl.appendChild(b)
	cntEl.appendChild(document.createTextNode((q ? '/' + total : '') + '字符' + (multi ? ' · ' + keys.length + '字体' : '')))
}

export function initTable(): void {
	tableFont().addEventListener('change', () => {
		renderTable()
		app.save()
	})
	;($('wwTableSearch') as HTMLInputElement).addEventListener('input', renderTable)
	$('btnSearchClear').addEventListener('click', () => {
		;($('wwTableSearch') as HTMLInputElement).value = ''
		renderTable()
		;($('wwTableSearch') as HTMLInputElement).focus()
	})
	tableBody().addEventListener('mousedown', e => {
		if ((e.target as HTMLElement).closest('.tcell, .fh-only')) e.preventDefault()
	})
}
