import { FONT_CONFIG, ORDER } from './manifest'
import type { FontSource } from './source'

// 构建期把 fonts/*.ttf 读成 base64 data URI，产物因此可以离线单文件运行
const RAW = import.meta.glob('../../../fonts/*.ttf', {
	eager: true,
	query: '?base64',
	import: 'default'
}) as Record<string, string>

const BY_FILE: Record<string, string> = {}
Object.keys(RAW).forEach(p => {
	BY_FILE[p.split('/').pop() as string] = RAW[p]
})

const DATA: Record<string, string> = {}
ORDER.forEach(id => {
	DATA[id] = BY_FILE[FONT_CONFIG[id].file]
})

function family(id: string): string {
	return 'WW ' + id.slice(5)
}

export const provider: FontSource = {
	family,
	dataUri: id => DATA[id] || null,
	ensure: id => Promise.resolve(DATA[id] || null),
	installFaces() {
		const faces: string[] = []
		const classes: string[] = []
		ORDER.forEach(id => {
			faces.push(
				"@font-face{font-family:'" +
					family(id) +
					"';font-style:normal;font-weight:normal;" +
					'font-display:block;src:url(' +
					DATA[id] +
					") format('truetype');}"
			)
			classes.push('.' + id + "{font-family:'" + family(id) + "',sans-serif;}")
		})
		const style = document.createElement('style')
		style.textContent = faces.join('\n') + '\n' + classes.join('\n') + '\n'
		document.head.prepend(style)
	}
}
