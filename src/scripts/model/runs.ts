import { state } from './state'

export interface TextRun {
	key: string
	text: string
}

/** 把逐字字体标签合并成连续同字体的文本段 */
export function runs(): TextRun[] {
	const out: TextRun[] = []
	let last: string | null = null
	state.chars.forEach(c => {
		if (c.key !== last) {
			out.push({ key: c.key, text: '' })
			last = c.key
		}
		out[out.length - 1].text += c.ch
	})
	return out
}
