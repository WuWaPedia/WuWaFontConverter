import raw from '../../data/fonts.json'

export interface TableView {
	noLower?: boolean
	noDigit?: boolean
	/** 单独保留成格的小写字母 */
	lowerOnly?: string
	/** 对照表里隐藏的字符 */
	hideChars?: string
}

export interface FontDef {
	id: string
	name: string
	/** fonts/ 下的 ttf 文件名 */
	file: string
	hue: string
	charset: string
	/** 软键盘布局 */
	rows: string[][]
	/** 补齐字体 cmap 中存在、但键盘未列出的字符 */
	extra: string
	filterJz?: boolean
	disabled?: string[]
	table?: TableView
}

export const FONTS = raw as FontDef[]
export const ORDER: string[] = FONTS.map(f => f.id)
export const FONT_CONFIG: Record<string, FontDef> = Object.fromEntries(FONTS.map(f => [f.id, f]))

export const DEFAULT_TEXT = 'WUTHERING WAVES'
export const ALL_FONTS = '__all'

/** 每个字体支持的字符集合（软键盘键位 + extra） */
export const SUPPORT: Record<string, Record<string, 1>> = {}
ORDER.forEach(k => {
	const s: Record<string, 1> = {}
	FONT_CONFIG[k].rows.forEach(r => r.forEach(ch => (s[ch] = 1)))
	Array.from(FONT_CONFIG[k].extra).forEach(ch => (s[ch] = 1))
	SUPPORT[k] = s
})
