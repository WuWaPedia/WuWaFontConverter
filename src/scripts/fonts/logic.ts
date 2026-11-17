import { FONT_CONFIG, ORDER, SUPPORT, type TableView } from './manifest'

export function isDisabled(key: string, ch: string): boolean {
	const d = FONT_CONFIG[key].disabled
	return !!(d && d.indexOf(ch) !== -1)
}

// 对照表按A-Z、a-z、0-9、符号排序；软键盘仍保持QWERTY键位
export function charRank(ch: string): number {
	const c = ch.codePointAt(0) as number
	if (ch >= 'A' && ch <= 'Z') return c
	if (ch >= 'a' && ch <= 'z') return 1000 + c
	if (ch >= '0' && ch <= '9') return 2000 + c
	return 3000 + c
}

function tableOf(key: string): TableView {
	return FONT_CONFIG[key].table || {}
}

// 对照表展示过滤：仅作用于TABLE_CHARS（网页表格与导出图片），不改变软键盘与录入支持
// 拉海洛有对应小写现实文字的大写字符不单独成格，字形由小写格子展示
export const TABLE_CHARS: Record<string, string[]> = {}
ORDER.forEach(k => {
	const v = tableOf(k)
	const keptLower = (ch: string) => !!v.lowerOnly && v.lowerOnly.indexOf(ch) !== -1
	const list = Object.keys(SUPPORT[k]).filter(ch => {
		if (v.hideChars && v.hideChars.indexOf(ch) !== -1) return false
		if (ch >= 'a' && ch <= 'z') return keptLower(ch) || (!v.noLower && !v.lowerOnly)
		if (ch >= '0' && ch <= '9') return !v.noDigit
		return true
	})
	// 单独保留的小写字母紧跟同名大写字母之后，不落到整组大写字母末尾
	list.sort((a, b) => {
		const ra = keptLower(a) ? charRank(a.toUpperCase()) + 0.5 : charRank(a)
		const rb = keptLower(b) ? charRank(b.toUpperCase()) + 0.5 : charRank(b)
		return ra - rb
	})
	TABLE_CHARS[k] = list
})

export function blocked(key: string, ch: string): boolean {
	return isDisabled(key, ch) || isDisabled(key, ch.toUpperCase())
}

export function supports(key: string, ch: string): boolean {
	return ch === ' ' || ch === '\n' || ch === '\t' || !!SUPPORT[key][ch]
}

// 拉古那花体的独立小写h需放大展示（不影响成段文本中的h）
export function isBigH(key: string, ch: string): boolean {
	return key === 'font-Ragunna' && ch === 'h'
}

export function filterText(key: string, text: string): string {
	return FONT_CONFIG[key].filterJz ? text.replace(/[JjZz]/g, '') : text
}

// 拉海洛文字：小写希腊字母是现实文字，鸣潮字形统一用对应的大写字母展示
const LAHAI_UPPER: Record<string, string> = {
	δ: 'Δ',
	θ: 'Θ',
	μ: 'Μ',
	π: 'Π',
	σ: 'Σ',
	φ: 'Φ',
	ψ: 'Ψ',
	𝑥: '𝑋'
}

export function glyphOf(key: string, ch: string): string {
	return key === 'font-LahaiRoi' && LAHAI_UPPER[ch] ? LAHAI_UPPER[ch] : ch
}
