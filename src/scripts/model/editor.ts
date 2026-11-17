import { blocked } from '../fonts/logic'
import { FONT_CONFIG } from '../fonts/manifest'
import { syncActive } from '../render/chips'
import { funcKey, keyEl, pulseFunc, pulseKey, renderKeyboard } from '../render/keyboard'
import { renderPreview } from '../render/preview'
import { pulse } from '../render/pulse'
import { renderTape } from '../render/tape'
import { toast } from '../ui/toast'
import { contrast, glyphInk, paperBg } from '../util/color'
import { $ } from '../util/dom'
import { plain, save, state } from './state'

export function render() {
	$('wwCount').textContent = String(state.chars.length)
	renderTape()
	renderPreview()
	const sw = $('wwInkColor') as HTMLInputElement
	const low = state.ink === 'custom' && contrast(state.inkColor, paperBg()) < 3
	sw.disabled = state.ink !== 'custom'
	if (!sw.disabled) sw.value = state.inkColor
	else sw.value = glyphInk()
	sw.classList.toggle('low', low)
	sw.title = low ? '字色与底色太接近' : '自定义字色'
	$('wwInkWarn').hidden = !low
}

export function syncClearButtons() {
	const undo = !!state.clearSnapshot
	const btn = $('btnClear')
	btn.textContent = undo ? '撤销清空' : '清空'
	btn.classList.toggle('undo', undo)
	const k = funcKey('clear')
	if (k) {
		k.textContent = undo ? '↺ 撤销清空' : '✕ 清空'
		k.classList.toggle('undo', undo)
	}
}

function disarmUndo() {
	if (state.clearTimer) clearTimeout(state.clearTimer)
	state.clearTimer = null
	syncClearButtons()
}

export function clearAll() {
	if (!state.chars.length) {
		toast('已经是空的', true)
		return
	}
	state.clearSnapshot = state.chars.slice()
	;($('wwInput') as HTMLTextAreaElement).value = ''
	state.chars = []
	render()
	save()
	if (state.clearTimer) clearTimeout(state.clearTimer)
	state.clearTimer = setTimeout(() => {
		state.clearSnapshot = null
		disarmUndo()
	}, 6000)
	syncClearButtons()
	toast('已清空 · 6秒内可撤销')
}

export function undoClear() {
	state.chars = (state.clearSnapshot as typeof state.chars).slice()
	state.clearSnapshot = null
	disarmUndo()
	;($('wwInput') as HTMLTextAreaElement).value = plain()
	render()
	save()
	toast('已恢复')
}

// 按码点做前后缀diff，未改动区域保留原有字体标签
export function syncFromTextarea() {
	const ta = $('wwInput') as HTMLTextAreaElement
	const prev = state.chars.map(c => c.ch)
	const next = Array.from(ta.value)
	let p = 0
	const mp = Math.min(prev.length, next.length)
	while (p < mp && prev[p] === next[p]) p++
	let s = 0
	const ms = Math.min(prev.length - p, next.length - p)
	while (s < ms && prev[prev.length - 1 - s] === next[next.length - 1 - s]) s++
	const out = state.chars.slice(0, p)
	next.slice(p, next.length - s).forEach(ch => {
		out.push({ ch: ch, key: state.activeFont })
	})
	state.chars = out.concat(s ? state.chars.slice(state.chars.length - s) : [])
	if (state.clearSnapshot && state.chars.length) {
		state.clearSnapshot = null
		disarmUndo()
	}
	render()
	save()
}

export function insertChar(ch: string) {
	const ta = $('wwInput') as HTMLTextAreaElement
	if (blocked(state.activeFont, ch)) {
		pulseKey(ch.toUpperCase(), 'denied')
		toast(FONT_CONFIG[state.activeFont].name + '没有字母' + ch.toUpperCase(), true)
		return
	}
	ta.setRangeText(ch, ta.selectionStart, ta.selectionEnd, 'end')
	state.popIndex = Array.from(ta.value.slice(0, ta.selectionStart)).length - 1
	syncFromTextarea()
}

export function backspace() {
	const ta = $('wwInput') as HTMLTextAreaElement
	let s = ta.selectionStart
	const e = ta.selectionEnd
	if (s === e && s > 0) s = Array.from(ta.value.slice(0, s)).slice(0, -1).join('').length
	ta.setRangeText('', s, e, 'end')
	syncFromTextarea()
}

export function setActiveFont(key: string) {
	state.activeFont = key
	if (state.applyToAll) state.chars.forEach(c => (c.key = key))
	renderKeyboard()
	syncActive()
	render()
	save()
}

export function syncTypeControls() {
	;($('wwSize') as HTMLInputElement).value = String(state.previewSize)
	$('wwSizeOut').textContent = String(state.previewSize)
	;($('wwTrack') as HTMLInputElement).value = String(state.tracking)
	$('wwTrackOut').textContent = String(state.tracking)
	;($('wwLead') as HTMLInputElement).value = String(state.lineGap)
	$('wwLeadOut').textContent = String(state.lineGap)
	;($('wwInk') as HTMLSelectElement).value = state.ink
	;($('wwInkColor') as HTMLInputElement).value = state.inkColor
	;($('wwPaper') as HTMLSelectElement).value = state.paper
	;($('wwAlign') as HTMLSelectElement).value = state.align
}

/** textarea 的键盘事件：编辑由原生 input 事件驱动，这里只做键位反馈与拦截 */
export function initEditor() {
	const ta = $('wwInput') as HTMLTextAreaElement
	ta.addEventListener('input', syncFromTextarea)
	ta.addEventListener('keydown', ev => {
		if (ev.ctrlKey || ev.metaKey || ev.altKey) return
		if (ev.key === 'Backspace') {
			pulseFunc('back', 'hit')
			return
		}
		if (ev.key === 'Enter') {
			pulseFunc('enter', 'hit')
			return
		}
		if (ev.key === ' ') {
			pulseFunc('space', 'hit')
			return
		}
		if (ev.key.length !== 1) return
		const ch = ev.key
		const up = ch.toUpperCase()
		if (blocked(state.activeFont, ch)) {
			ev.preventDefault()
			pulseKey(up, 'denied')
			toast(FONT_CONFIG[state.activeFont].name + '没有字母' + up, true)
			return
		}
		const el = keyEl(ch) || keyEl(up) || keyEl(ch.toLowerCase())
		pulse(el, 'hit')
	})
}
