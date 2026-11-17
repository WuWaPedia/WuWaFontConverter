import { provider } from '@font-provider'

import type { Layout } from './layout'

function xmlEsc(s: string): string {
	return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** 导出SVG时把用到的字体以data URI内嵌，保证文件自包含 */
export function buildSVG(layout: Layout, keys: string[], transparent: boolean): string {
	let defs = ''
	const seen: Record<string, 1> = {}
	keys.forEach(key => {
		const fam = provider.family(key)
		if (seen[fam]) return
		seen[fam] = 1
		const src = provider.dataUri(key)
		if (src) {
			defs += "@font-face{font-family:'" + fam + "';src:url(" + src + ") format('truetype');}"
		}
	})
	const p = [
		'<svg xmlns="http://www.w3.org/2000/svg" width="' +
			layout.W +
			'" height="' +
			layout.H +
			'" viewBox="0 0 ' +
			layout.W +
			' ' +
			layout.H +
			'">',
		'<defs><style>' + defs + '</style></defs>'
	]
	if (layout.bg && !transparent) {
		p.push('<rect x="0" y="0" width="' + layout.W + '" height="' + layout.H + '" fill="' + layout.bg + '"/>')
	}
	layout.items.forEach(it => {
		const anchor = it.align === 'center' ? 'middle' : it.align === 'right' ? 'end' : 'start'
		p.push(
			'<text x="' +
				it.x +
				'" y="' +
				it.y +
				'" font-family="' +
				xmlEsc(it.family) +
				'" font-size="' +
				it.size +
				'" fill="' +
				it.fill +
				'" text-anchor="' +
				anchor +
				'" xml:space="preserve">' +
				xmlEsc(it.text) +
				'</text>'
		)
	})
	p.push('</svg>')
	return p.join('')
}
