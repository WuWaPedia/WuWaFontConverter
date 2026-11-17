import type { Layout } from './layout'

export function drawCanvas(layout: Layout, transparent: boolean): string {
	const scale = 2
	const cv = document.createElement('canvas')
	cv.width = Math.ceil(layout.W * scale)
	cv.height = Math.ceil(layout.H * scale)
	const ctx = cv.getContext('2d') as CanvasRenderingContext2D
	ctx.scale(scale, scale)
	if (layout.bg && !transparent) {
		ctx.fillStyle = layout.bg
		ctx.fillRect(0, 0, layout.W, layout.H)
	}
	layout.items.forEach(it => {
		ctx.font = it.size + 'px ' + it.family
		ctx.fillStyle = it.fill
		ctx.textAlign = it.align
		ctx.textBaseline = 'alphabetic'
		ctx.fillText(it.text, it.x, it.y)
	})
	return cv.toDataURL('image/png')
}
