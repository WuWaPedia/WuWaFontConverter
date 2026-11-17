import fs from 'node:fs'
import path from 'node:path'

const NS = 'wuwa-font-base64:'

export function fontBase64() {
	return {
		name: 'wuwa-font-base64',
		enforce: 'pre',
		resolveId(id, importer) {
			if (!id.endsWith('?base64')) return null
			const raw = id.slice(0, -'?base64'.length)
			const abs = path.isAbsolute(raw) ? raw : path.resolve(importer ? path.dirname(importer) : process.cwd(), raw)
			return NS + abs
		},
		load(id) {
			if (!id.startsWith(NS)) return null
			const file = id.slice(NS.length)
			const b64 = fs.readFileSync(file).toString('base64')
			return `export default "data:font/ttf;base64,${b64}";`
		}
	}
}
