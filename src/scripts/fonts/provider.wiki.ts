import type { FontSource } from './source'

// 家族名读自wiki的.font-*类（common.css已定义），不重复声明
const familyCache: Record<string, string> = {}
function family(id: string): string {
	if (familyCache[id]) return familyCache[id]
	const probe = document.createElement('span')
	probe.className = id
	probe.style.display = 'none'
	;(document.getElementById('wwfc') || document.body).appendChild(probe)
	const fam = getComputedStyle(probe).fontFamily.replace(/["']/g, '').trim()
	probe.remove()
	familyCache[id] = fam
	return fam
}

// TTF地址读自common.css的@font-face；导出SVG与字体包按需fetch并缓存为data URI
const fontSrcCache: Record<string, string> = {}
const fontUrlCache: Record<string, string | null> = {}

function isFontFaceRule(r: CSSRule): r is CSSFontFaceRule {
	if (typeof CSSFontFaceRule !== 'undefined') return r instanceof CSSFontFaceRule
	return r.type === CSSRule.FONT_FACE_RULE
}

function fontUrl(fam: string): string | null {
	if (fam in fontUrlCache) return fontUrlCache[fam]
	const sheets = document.styleSheets
	for (let i = 0; i < sheets.length; i++) {
		let rules: CSSRuleList | null = null
		try {
			rules = sheets[i].cssRules
		} catch (e) {
			continue
		}
		if (!rules) continue
		for (let j = 0; j < rules.length; j++) {
			const r = rules[j]
			if (!isFontFaceRule(r)) continue
			if ((r.style.fontFamily || '').replace(/["']/g, '').trim() !== fam) continue
			const style = r.style as CSSStyleDeclaration & { src?: string }
			const m = (style.src || '').match(/url\(["']?([^)"']+)["']?\)/)
			if (m) {
				fontUrlCache[fam] = m[1]
				return m[1]
			}
		}
	}
	fontUrlCache[fam] = null
	return null
}

function fetchFontSrc(id: string): Promise<string | null> {
	const fam = family(id)
	if (fontSrcCache[fam]) return Promise.resolve(fontSrcCache[fam])
	const url = fontUrl(fam)
	if (!url) return Promise.resolve(null)
	return fetch(url)
		.then(r => {
			if (!r.ok) throw new Error('HTTP ' + r.status)
			return r.arrayBuffer()
		})
		.then(buf => {
			const bytes = new Uint8Array(buf)
			let bin = ''
			for (let i = 0; i < bytes.length; i += 8192) {
				bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 8192)))
			}
			const uri = 'data:font/ttf;base64,' + btoa(bin)
			fontSrcCache[fam] = uri
			return uri
		})
}

export const provider: FontSource = {
	family,
	dataUri: id => fontSrcCache[family(id)] || null,
	ensure: id => fetchFontSrc(id),
	installFaces() {}
}
