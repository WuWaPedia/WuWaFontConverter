import { provider } from '@font-provider'

import { TABLE_CHARS, glyphOf, isBigH, isDisabled } from '../fonts/logic'
import { FONT_CONFIG, ORDER } from '../fonts/manifest'
import { state } from '../model/state'
import { glyphInk } from '../util/color'

export const PAD = 32
export const GLYPH_SIZE = 44
const LABEL_SIZE = 15
const FOOTER_SIZE = 12
const MAX_W = 1000
const BLOCK_GAP = 20
const LABEL_GAP = 10
const LABEL_FILL = '#5a5750'
const FOOTER_FILL = '#9c988e'
const DISABLED_FILL = '#c4c0b6'
const TABLE_LABEL_FILL = '#3a3833'
const FOOTER_TEXT = '《鸣潮百科》灰机wiki'
const T_CELL_W = 72
const T_CELL_H = 88
const T_GAP_X = 10
const T_GAP_Y = 10
const T_GLYPH = 34
const T_LABEL = 15
const T_TITLE = 18
const T_COLS = 10

export interface LayoutItem {
	x: number
	y: number
	text: string
	family: string
	size: number
	fill: string
	align: 'left' | 'center' | 'right'
}

export interface Layout {
	W: number
	H: number
	items: LayoutItem[]
	bg: string | null
}

export interface TextBlock {
	key: string
	name: string
	text: string
}

interface MeasuredBlock extends TextBlock {
	_lines: string[]
	_widths: number[]
	_fam: string
	_asc: number
	_desc: number
	_labelW: number
	_labelAsc: number
}

export function mctx(): CanvasRenderingContext2D {
	return document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D
}

export function wrapLine(ctx: CanvasRenderingContext2D, line: string, maxW: number): string[] {
	if (ctx.measureText(line).width <= maxW) return [line]
	const out: string[] = []
	let cur = ''
	Array.from(line).forEach(ch => {
		if (cur && ctx.measureText(cur + ch).width > maxW) {
			out.push(cur)
			cur = ch
		} else cur += ch
	})
	if (cur) out.push(cur)
	return out
}

function footerItems(y: number, fill: string): LayoutItem[] {
	return [
		{
			x: PAD,
			y: y + FOOTER_SIZE * 0.82,
			text: FOOTER_TEXT,
			family: 'sans-serif',
			size: FOOTER_SIZE,
			fill,
			align: 'left'
		}
	]
}

export function textLayout(blocks: TextBlock[]): Layout {
	const ctx = mctx()
	let items: LayoutItem[] = []
	let contentW = 0
	const night = state.paper === 'night'
	const labelFill = night ? '#a8a49a' : LABEL_FILL
	const footFill = night ? '#7d7a72' : FOOTER_FILL
	const bg = state.paper === 'white' ? '#ffffff' : night ? '#16181a' : null
	const fill = glyphInk()
	blocks.forEach(b0 => {
		const b = b0 as MeasuredBlock
		const fam = provider.family(b.key)
		let lines: string[] = []
		const widths: number[] = []
		ctx.font = GLYPH_SIZE + 'px "' + fam + '", sans-serif'
		b.text.split('\n').forEach(ln => {
			wrapLine(ctx, ln, MAX_W).forEach(w => {
				lines.push(w)
				widths.push(ctx.measureText(w).width)
			})
		})
		if (!lines.length) {
			lines = ['']
			widths.push(0)
		}
		let asc = 0
		let desc = 0
		lines.forEach(ln => {
			const m = ctx.measureText(ln || ' ')
			if (m.width > contentW) contentW = m.width
			if (m.actualBoundingBoxAscent > asc) asc = m.actualBoundingBoxAscent
			if (m.actualBoundingBoxDescent > desc) desc = m.actualBoundingBoxDescent
		})
		b._lines = lines
		b._widths = widths
		b._fam = fam
		b._asc = asc || GLYPH_SIZE * 0.8
		b._desc = desc || GLYPH_SIZE * 0.25
		ctx.font = LABEL_SIZE + 'px sans-serif'
		const lm = ctx.measureText(b.name)
		if (lm.width > contentW) contentW = lm.width
		b._labelW = lm.width
		b._labelAsc = lm.actualBoundingBoxAscent || LABEL_SIZE * 0.8
	})
	ctx.font = FOOTER_SIZE + 'px sans-serif'
	contentW = Math.max(240, Math.min(MAX_W, Math.ceil(Math.max(contentW, ctx.measureText(FOOTER_TEXT).width))))
	const ax = (w: number): number =>
		state.align === 'center' ? PAD + (contentW - w) / 2 : state.align === 'right' ? PAD + contentW - w : PAD
	let y = PAD
	blocks.forEach(b0 => {
		const b = b0 as MeasuredBlock
		items.push({
			x: ax(b._labelW),
			y: y + b._labelAsc,
			text: b.name,
			family: 'sans-serif',
			size: LABEL_SIZE,
			fill: labelFill,
			align: 'left'
		})
		y += LABEL_SIZE + LABEL_GAP
		b._lines.forEach((ln, li) => {
			items.push({
				x: ax(b._widths[li]),
				y: y + b._asc,
				text: ln,
				family: '"' + b._fam + '", sans-serif',
				size: GLYPH_SIZE,
				fill,
				align: 'left'
			})
			y += b._asc + b._desc + state.lineGap
		})
		y += BLOCK_GAP
	})
	return {
		W: contentW + PAD * 2,
		H: Math.ceil(y + FOOTER_SIZE + PAD),
		items: items.concat(footerItems(y, footFill)),
		bg
	}
}

function gridWidth(): number {
	return T_COLS * T_CELL_W + (T_COLS - 1) * T_GAP_X
}

function blockHeight(key: string): number {
	const n = Math.ceil(TABLE_CHARS[key].length / T_COLS)
	return T_TITLE + 16 + n * T_CELL_H + (n - 1) * T_GAP_Y
}

function tableBlock(key: string, top: number, left: number): LayoutItem[] {
	const c = FONT_CONFIG[key]
	const fam = provider.family(key)
	const items: LayoutItem[] = []
	const gridTop = top + T_TITLE + 16
	items.push({
		x: left,
		y: top + T_TITLE * 0.8,
		text: c.name + ' · 字符对照表',
		family: 'sans-serif',
		size: T_TITLE,
		fill: LABEL_FILL,
		align: 'left'
	})
	TABLE_CHARS[key].forEach((ch, i) => {
		const cx = left + (i % T_COLS) * (T_CELL_W + T_GAP_X)
		const cy = gridTop + Math.floor(i / T_COLS) * (T_CELL_H + T_GAP_Y)
		const dis = isDisabled(key, ch)
		const gs = isBigH(key, ch) ? Math.round(T_GLYPH * 1.5) : T_GLYPH
		items.push({
			x: cx + T_CELL_W / 2,
			y: cy + 48,
			text: glyphOf(key, ch),
			family: '"' + fam + '", sans-serif',
			size: gs,
			fill: dis ? DISABLED_FILL : '#1a1a18',
			align: 'center'
		})
		items.push({
			x: cx + T_CELL_W / 2,
			y: cy + 74,
			text: ch,
			family: 'sans-serif',
			size: T_LABEL,
			fill: dis ? DISABLED_FILL : TABLE_LABEL_FILL,
			align: 'center'
		})
	})
	return items
}

export function tableLayout(key: string): Layout {
	const h = blockHeight(key)
	return {
		W: gridWidth() + PAD * 2,
		H: Math.ceil(PAD + h + 18 + FOOTER_SIZE + PAD),
		items: tableBlock(key, PAD, PAD).concat(footerItems(PAD + h + 18, FOOTER_FILL)),
		bg: '#ffffff'
	}
}

export function allTablesLayout(): Layout {
	const ctx = mctx()
	ctx.font = FOOTER_SIZE + 'px sans-serif'
	const w = gridWidth()
	const maxW = Math.max(w, ctx.measureText(FOOTER_TEXT).width)
	let items: LayoutItem[] = []
	let y = PAD
	ORDER.forEach(k => {
		items = items.concat(tableBlock(k, y, PAD + (maxW - w) / 2))
		y += blockHeight(k) + 30
	})
	return {
		W: Math.ceil(maxW + PAD * 2),
		H: Math.ceil(y + FOOTER_SIZE + PAD),
		items: items.concat(footerItems(y, FOOTER_FILL)),
		bg: '#ffffff'
	}
}
