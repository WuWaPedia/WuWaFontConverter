import { toast } from './toast'

export function copyText(t: string) {
	if (!t) {
		toast('没有可复制的内容', true)
		return
	}
	function fallback() {
		const el = document.createElement('textarea')
		el.value = t
		el.style.position = 'fixed'
		el.style.opacity = '0'
		document.body.appendChild(el)
		el.select()
		try {
			document.execCommand('copy')
			toast('已复制到剪贴板')
		} catch (e) {
			toast('复制失败，请手动选择', true)
		}
		document.body.removeChild(el)
	}
	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(t).then(() => toast('已复制到剪贴板'), fallback)
	} else fallback()
}
