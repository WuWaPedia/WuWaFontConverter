import { provider } from '@font-provider'

import { toast } from '../ui/toast'
import { GLYPH_SIZE, type Layout } from './layout'
import { drawCanvas } from './raster'
import { buildSVG } from './svg'

export function downloadDataUrl(dataUrl: string, name: string) {
	const a = document.createElement('a')
	a.href = dataUrl
	a.download = name
	document.body.appendChild(a)
	a.click()
	a.remove()
}

function ensureFamilies(keys: string[]) {
	return Promise.all(
		keys.map(key => {
			const fam = provider.family(key)
			return Promise.all([
				document.fonts.load(GLYPH_SIZE + 'px "' + fam + '"').catch(() => null),
				provider.ensure(key).catch(() => null)
			])
		})
	)
}

export function runExport(layout: Layout, keys: string[], format: string, baseName: string) {
	if (__BUILD_TARGET__ === 'wiki' && format === 'svg' && keys.some(k => !provider.dataUri(k))) {
		toast('部分字体下载失败，SVG未内嵌字体', true)
	}
	const tr = format === 'png-transparent' || !layout.bg
	if (format === 'svg') {
		downloadDataUrl(
			'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(buildSVG(layout, keys, tr)),
			baseName + (tr ? '_透明.svg' : '.svg')
		)
	} else {
		downloadDataUrl(drawCanvas(layout, tr), baseName + (tr ? '_透明.png' : '.png'))
	}
}

export { ensureFamilies }
