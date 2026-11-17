import { state } from '../model/state'

export function lighten(hex: string, t: number): string {
	const n = parseInt(hex.slice(1), 16)
	let r = (n >> 16) & 255
	let g = (n >> 8) & 255
	let b = n & 255
	r = Math.round(r + (255 - r) * t)
	g = Math.round(g + (255 - g) * t)
	b = Math.round(b + (255 - b) * t)
	return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

export function paperBg(): string {
	return state.paper === 'night' ? '#16181a' : '#ffffff'
}

export function glyphInk(): string {
	return state.ink === 'custom' ? state.inkColor : state.paper === 'night' ? '#f2f0eb' : '#1a1a18'
}

export function contrast(a: string, b: string): number {
	function lum(hex: string): number {
		const n = parseInt(hex.slice(1), 16)
		const v = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(x => {
			x /= 255
			return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
		})
		return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
	}
	const x = lum(a)
	const y = lum(b)
	return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
