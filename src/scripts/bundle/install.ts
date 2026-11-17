import { provider } from '@font-provider'

import { FONT_CONFIG, ORDER } from '../fonts/manifest'
import { toast } from '../ui/toast'
import { FONT_FILE_NAMES, FONT_README, type InstallableFont, installerBat, uninstallerBat } from './bat'
import { type ZipEntry, b64Bytes, makeZip, utf8Bytes } from './zip'

export async function installFontsPackage() {
	if (__BUILD_TARGET__ === 'wiki') toast('正在下载字体…')
	const uris = await Promise.all(ORDER.map(k => provider.ensure(k).catch(() => null)))
	const fonts: InstallableFont[] = []
	const missing: string[] = []
	ORDER.forEach((k, i) => {
		const uri = uris[i]
		const m = uri && /^data:font\/ttf;base64,(.+)$/.exec(uri)
		if (!m) {
			missing.push(FONT_CONFIG[k].name)
			return
		}
		fonts.push({
			name: FONT_FILE_NAMES[k],
			install: 'WuWa' + k.slice(5),
			ascii: k.slice(5),
			b64: m[1]
		})
	})
	if (missing.length) {
		toast('未找到内嵌字体：' + missing.join('、') + '，请使用构建后的页面', true)
		return
	}
	const entries: ZipEntry[] = fonts.map(f => ({ name: f.name, data: b64Bytes(f.b64) }))
	entries.push({ name: '一键安装.bat', data: installerBat(fonts) })
	entries.push({ name: '一键卸载.bat', data: uninstallerBat(fonts) })
	entries.push({ name: '说明.txt', data: utf8Bytes('\uFEFF' + FONT_README) })
	const url = URL.createObjectURL(makeZip(entries))
	const a = document.createElement('a')
	a.href = url
	a.download = '鸣潮字体包.zip'
	document.body.appendChild(a)
	a.click()
	a.remove()
	setTimeout(() => URL.revokeObjectURL(url), 60000)
	toast('字体包已下载 · 双击「一键安装.bat」即可装好全部字体')
}
