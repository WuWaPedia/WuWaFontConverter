import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'dist-wiki')
const SRC = path.join(OUT_DIR, 'index.html')
const FRAGMENT_OUT = SRC
const TEST_OUT = path.join(OUT_DIR, 'test.html')
const SCOPE = '#wwfc'

function parseRules(css) {
	const rules = []
	let i = 0
	const n = css.length
	while (i < n) {
		while (i < n && /\s/.test(css[i])) i++
		if (css.startsWith('/*', i)) {
			const j = css.indexOf('*/', i + 2)
			i = j < 0 ? n : j + 2
			continue
		}
		if (i >= n) break
		let j = i
		let depth = 0
		while (j < n) {
			const c = css[j]
			if (c === '(') depth++
			else if (c === ')') depth--
			else if (depth === 0 && (c === '{' || c === ';')) break
			j++
		}
		const prelude = css.slice(i, j).trim()
		if (j >= n || css[j] === ';') {
			i = j + 1
			continue
		}
		let k = j + 1
		let d = 1
		while (k < n && d) {
			if (css[k] === '{') d++
			else if (css[k] === '}') d--
			k++
		}
		rules.push([prelude, css.slice(j + 1, k - 1)])
		i = k
	}
	return rules
}

function splitSelectors(prelude) {
	const parts = []
	let buf = ''
	let depth = 0
	for (const c of prelude) {
		if (c === '(') depth++
		else if (c === ')') depth--
		if (c === ',' && depth === 0) {
			parts.push(buf)
			buf = ''
		} else buf += c
	}
	parts.push(buf)
	return parts.map(p => p.trim()).filter(Boolean)
}

function scopeSelector(sel) {
	if (sel === ':root' || sel === 'body' || sel === 'html,body' || sel === 'html, body') {
		return SCOPE
	}
	if (sel === '*') return SCOPE + ',' + SCOPE + ' *'
	if (sel.startsWith('::')) return SCOPE + sel + ',' + SCOPE + ' *' + sel
	return SCOPE + ' ' + sel
}

function escapeRe(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function prefixKeyframeRefs(css, names) {
	if (!names.length) return css
	return css.replace(/\b(animation(?:-name)?)\s*:\s*([^;}]+)/g, (m, prop, value) => {
		let v = value
		for (const n of names) {
			v = v.replace(new RegExp('(^|[\\s,])' + escapeRe(n) + '(?=[\\s,]|$)', 'g'), '$1wwfc-' + n)
		}
		return prop + ':' + v
	})
}

function transformCss(css) {
	const out = []
	for (const [prelude, body0] of parseRules(css)) {
		if (prelude.startsWith('@font-face') || prelude.startsWith('.font-')) continue
		if (prelude.startsWith('@keyframes')) {
			out.push('@keyframes wwfc-' + prelude.split(/\s+/)[1] + '{' + body0 + '}')
		} else if (prelude.startsWith('@media')) {
			out.push(prelude + '{\n' + transformCss(body0) + '\n}')
		} else {
			const sels = splitSelectors(prelude).map(scopeSelector).join(',')
			let body = body0
			// 默认字体继承 common.css 的 body 定义，不重复声明
			if (prelude === 'body') body = body.replace(/\s*font-family:[^;]+;/, '')
			out.push(sels + '{' + body + '}')
		}
	}
	const names = [...css.matchAll(/@keyframes\s+([^\s{]+)/g)].map(m => m[1])
	return prefixKeyframeRefs(out.join('\n'), names)
}

const WIKI_OVERRIDES = `
/* ===== wiki适配追加 ===== */
/* 顶栏与侧栏改为静态定位，避免与wiki页头的sticky布局互相遮挡 */
#wwfc .nav{position:static;}
#wwfc .side{position:static;}
/* 防止wiki主题给外链加图标背景 */
#wwfc a{background-image:none;}
`

/* ---------- 构建 ---------- */

rmSync(OUT_DIR, { recursive: true, force: true })
process.env.BUILD_TARGET = 'wiki'
const { build } = await import('astro')
await build({ root: ROOT })

if (!existsSync(SRC)) {
	console.error('错误：没有找到 wiki 构建产物 ' + SRC)
	process.exit(1)
}

const html = readFileSync(SRC, 'utf8')

const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1])
const scriptBlocks = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1])

// wiki 构建保留了 <body>；若将来又被压缩器删掉可选标签，退化到结构定位（head 里只有 meta/title/style）
let bodyHtml = ''
const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/)
if (bodyMatch) {
	bodyHtml = bodyMatch[1]
} else {
	const firstEl = html.search(/<(div|main|section|script)[\s>]/)
	if (firstEl < 0) {
		console.error('错误：wiki 产物里找不到页面内容，检查 astro-html-minifier-next 的 removeOptionalTags')
		process.exit(1)
	}
	const lastScript = html.lastIndexOf('<script')
	bodyHtml = html.slice(firstEl, lastScript > firstEl ? lastScript : html.length)
}

const body = bodyHtml
	.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
	.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
	.trim()
const script = scriptBlocks.join('\n').trim()

if (!styleBlocks.length || !script) {
	console.error('错误：wiki 产物缺少内联样式或脚本')
	process.exit(1)
}

const scoped = transformCss(styleBlocks.join('\n'))

const fragment =
	'<style>\n' +
	scoped +
	WIKI_OVERRIDES +
	'</style>\n' +
	body +
	'\n<script>\n(function(){"use strict";\n' +
	script +
	'\n})();\n</script>'

/* ---------- 校验 ---------- */

const problems = []
if (fragment.includes('{{')) problems.push('含有{{，会被Mustache解析')
if (/<!DOCTYPE|<html|<head|<body|<\/body|<\/html/i.test(fragment)) problems.push('残留文档外壳标签')
if (scoped.includes('@font-face') || scoped.includes('base64,')) problems.push('CSS仍含内嵌字体')
if (fragment.includes('huijistatic')) problems.push('片段内仍硬编码字体地址')

// 默认字体只留给需要等宽/中文的现实文字标注，其余交给 common.css。
// 不依赖压缩后的具体写法，按规则内容检查。
const scopedRules = parseRules(scoped)
const ruleFor = sel =>
	scopedRules.find(([s]) =>
		s
			.split(',')
			.map(x => x.trim())
			.includes(sel)
	)
for (const sel of [SCOPE + ' .real', SCOPE + ' .tlabel', SCOPE + ' .kbtn .kr']) {
	const rule = ruleFor(sel)
	if (!rule || !rule[1].includes('font-family')) problems.push(sel + ' 丢失默认字体声明')
}
const bodyRules = scopedRules.filter(([s]) =>
	s
		.split(',')
		.map(x => x.trim())
		.includes(SCOPE)
)
if (bodyRules.some(([, b]) => b.includes('font-family'))) {
	problems.push('body 的默认字体未移除，应由 common.css 接管')
}

if (fragment.includes('<nav') || fragment.includes('btnOnline')) problems.push('残留自带顶栏')
if ((fragment.match(/\{/g) || []).length !== (fragment.match(/\}/g) || []).length) {
	problems.push('花括号不配对')
}
if (script.includes('import ') || script.includes('export ')) {
	problems.push('脚本仍含ESM语句，无法作为普通script内联')
}
if (problems.length) {
	console.error('错误：' + problems.join('；'))
	process.exit(1)
}

writeFileSync(FRAGMENT_OUT, fragment, 'utf8')

/* ---------- 本地自测页 ---------- */

const WIKI_FONT_CSS = `
@font-face{font-family:'WuWa Lahai-Roi Regular';src:url('https://huiji-public.huijistatic.com/club/uploads/1/1c/WuWaLahai-RoiRegularNewXx.ttf');}
@font-face{font-family:'WuWa Ragunna Decorated';src:url('https://huiji-public.huijistatic.com/club/uploads/7/76/WuWa_Ragunna_Decorated.ttf');}
@font-face{font-family:'WuWa Septimont Digital';src:url('https://huiji-public.huijistatic.com/club/uploads/9/99/WuWa_Septimont_Digital.ttf');}
@font-face{font-family:'WuWaSolarisUniversal-Regular';src:url('https://huiji-public.huijistatic.com/club/uploads/9/9d/WuWaSolarisUniversal-260927.ttf');}
@font-face{font-family:'WuWaDigitalTube-Regular';src:url('https://huiji-public.huijistatic.com/club/uploads/4/48/WuWaDigitalTube-Regular.ttf');}
@font-face{font-family:'WuWaRinascitaRibbon-Regular';src:url('https://huiji-public.huijistatic.com/club/uploads/0/08/WuWaRinascitaRibbon-Regular.ttf');}
@font-face{font-family:'WWOldFont-Regular';src:url('https://huiji-public.huijistatic.com/club/uploads/b/ba/WWOldFont-Regular.ttf');}
@font-face{font-family:'WuWa Federation Regular';src:url('https://huiji-public.huijistatic.com/club/uploads/1/15/WuWa_Federation_Regular-261112.ttf');}
.font-LahaiRoi{font-family:'WuWa Lahai-Roi Regular' !important;}
.font-Ragunna{font-family:'WuWa Ragunna Decorated' !important;}
.font-Septimont{font-family:'WuWa Septimont Digital' !important;}
.font-Solaris{font-family:'WuWaSolarisUniversal-Regular' !important;}
.font-DigitalTube{font-family:'WuWaDigitalTube-Regular' !important;}
.font-RRibbon{font-family:'WuWaRinascitaRibbon-Regular' !important;}
.font-OldFont{font-family:'WWOldFont-Regular' !important;}
.font-Federation{font-family:'WuWa Federation Regular' !important;}
`

const harness = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>wiki环境模拟测试</title>
<style>
/* 模拟灰机wiki的全局样式，用于验证转换器不会污染wiki、wiki也不会破坏转换器 */
body{margin:0;background:#e8e4d8;font-family:"Noto Sans CJK","ZSFT-go","Source Han Sans SC","Source Han Sans CN","Noto Sans SC","Noto Sans CJK SC",sans-serif;font-weight:400;color:#202122;font-size:16px;}
.wiki-header{position:sticky;top:0;z-index:100;background:#36c;color:#fff;padding:12px 20px;font-size:16px;}
.wiki-shell{max-width:1100px;margin:20px auto;background:#fff;padding:24px;border:1px solid #a2a9b1;}
a{color:#36c;text-decoration:underline;}
button{background:#f8f9fa;border:1px solid #a2a9b1;padding:6px 12px;font-size:14px;}
h1{font-family:Georgia,serif;border-bottom:1px solid #a2a9b1;font-size:28px;}
p{line-height:1.6;}
${WIKI_FONT_CSS}
</style>
</head>
<body>
<div class="wiki-header">模拟灰机wiki页头（sticky · z-index 100）</div>
<div class="wiki-shell">
<h1>模拟条目页</h1>
<p id="wikiPara">这是wiki正文，<a id="wikiLink" href="https://example.com">外部链接</a>，样式不应被转换器影响。</p>
<button id="wikiBtn">wiki自己的按钮</button>
<!-- ===== 片段开始 ===== -->
${fragment}
<!-- ===== 片段结束 ===== -->
<p>片段之后的wiki正文。</p>
</div>
</body>
</html>`

mkdirSync(path.dirname(TEST_OUT), { recursive: true })
writeFileSync(TEST_OUT, harness, 'utf8')

console.log('输出: ' + path.relative(ROOT, FRAGMENT_OUT))
console.log('大小: ' + Buffer.byteLength(fragment) + ' bytes (' + (Buffer.byteLength(fragment) / 1024).toFixed(1) + ' KB)')
console.log('检查: 无{{冲突 / 无外壳标签 / 无内嵌字体 / 无自带顶栏 / 花括号配对')
console.log('自测页: ' + path.relative(ROOT, TEST_OUT))
