import { FONT_CONFIG } from '../fonts/manifest'

export interface Char {
	ch: string
	key: string
}

export const TYPE_DEFAULTS = {
	size: 44,
	track: 2,
	lead: 6,
	ink: 'auto',
	inkColor: '#1a1a18',
	paper: 'white',
	align: 'left'
} as const

/** 全局编辑状态：唯一文本缓冲 + 排版参数 */
export const state = {
	chars: [] as Char[],
	activeFont: 'font-Solaris',
	applyToAll: false,
	previewSize: TYPE_DEFAULTS.size as number,
	tracking: TYPE_DEFAULTS.track as number,
	lineGap: TYPE_DEFAULTS.lead as number,
	ink: TYPE_DEFAULTS.ink as string,
	inkColor: TYPE_DEFAULTS.inkColor as string,
	paper: TYPE_DEFAULTS.paper as string,
	align: TYPE_DEFAULTS.align as string,
	popIndex: -1,
	clearSnapshot: null as Char[] | null,
	clearTimer: null as ReturnType<typeof setTimeout> | null
}

export function plain(): string {
	return state.chars.map(c => c.ch).join('')
}

export function cpOffset(i: number): number {
	let n = 0
	for (let k = 0; k < i; k++) n += state.chars[k].ch.length
	return n
}

export const LS = 'ww-font-converter-v1'

export function save() {
	try {
		localStorage.setItem(
			LS,
			JSON.stringify({
				chars: state.chars,
				activeFont: state.activeFont,
				applyToAll: state.applyToAll,
				previewSize: state.previewSize,
				tracking: state.tracking,
				lineGap: state.lineGap,
				ink: state.ink,
				inkColor: state.inkColor,
				paper: state.paper,
				align: state.align,
				tableFont: (document.getElementById('wwTableFont') as HTMLSelectElement).value
			})
		)
	} catch (e) {
		/* 隐私模式下 localStorage 不可用，忽略 */
	}
}

export interface RestoredState {
	hadSave: boolean
	tableFont: string | null
}

export function load(): RestoredState {
	const restored: RestoredState = { hadSave: false, tableFont: null }
	try {
		const d = JSON.parse(localStorage.getItem(LS) || 'null')
		if (!d) return restored
		restored.hadSave = true
		if (Array.isArray(d.chars)) {
			state.chars = d.chars.filter((c: Char) => c && typeof c.ch === 'string' && FONT_CONFIG[c.key])
		}
		if (FONT_CONFIG[d.activeFont]) state.activeFont = d.activeFont
		state.applyToAll = !!d.applyToAll
		if (typeof d.previewSize === 'number') state.previewSize = Math.min(72, Math.max(20, d.previewSize))
		if (typeof d.tracking === 'number') state.tracking = Math.min(16, Math.max(0, d.tracking))
		if (typeof d.lineGap === 'number') state.lineGap = Math.min(40, Math.max(0, d.lineGap))
		if (d.ink === 'auto' || d.ink === 'custom') state.ink = d.ink
		if (typeof d.inkColor === 'string' && /^#[0-9a-f]{6}$/i.test(d.inkColor)) state.inkColor = d.inkColor
		if (['white', 'transparent', 'night'].indexOf(d.paper) !== -1) state.paper = d.paper
		if (['left', 'center', 'right'].indexOf(d.align) !== -1) state.align = d.align
		if (FONT_CONFIG[d.tableFont] || d.tableFont === '__all') restored.tableFont = d.tableFont
	} catch (e) {
		/* 存档损坏时按默认值启动 */
	}
	return restored
}
