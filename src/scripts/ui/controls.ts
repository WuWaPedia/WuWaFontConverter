import { app } from '../app'
import { installFontsPackage } from '../bundle/install'
import { ensureFamilies, runExport } from '../export'
import { type TextBlock, allTablesLayout, tableLayout, textLayout } from '../export/layout'
import { filterText } from '../fonts/logic'
import { ALL_FONTS, DEFAULT_TEXT, FONT_CONFIG, ORDER } from '../fonts/manifest'
import { runs } from '../model/runs'
import { TYPE_DEFAULTS, plain, state } from '../model/state'
import { copyText } from '../ui/clipboard'
import { toast } from '../ui/toast'
import { glyphInk } from '../util/color'
import { $ } from '../util/dom'

export function initControls() {
	$('btnCopyInput').addEventListener('click', () => copyText(plain()))

	$('btnClear').addEventListener('click', () => {
		if (state.clearSnapshot) app.undoClear()
		else app.clearAll()
	})

	$('btnSample').addEventListener('click', () => {
		const text = DEFAULT_TEXT
		state.chars = Array.from(text).map(ch => ({ ch: ch, key: state.activeFont }))
		;($('wwInput') as HTMLTextAreaElement).value = plain()
		app.render()
		app.save()
		;($('wwInput') as HTMLTextAreaElement).focus()
		toast('已填入示例 · ' + FONT_CONFIG[state.activeFont].name)
	})

	$('btnApplyAll').addEventListener('click', function (this: HTMLElement) {
		state.applyToAll = !state.applyToAll
		this.setAttribute('aria-pressed', String(state.applyToAll))
		$('wwApplyState').textContent = state.applyToAll ? '开' : '关'
		if (state.applyToAll) state.chars.forEach(c => (c.key = state.activeFont))
		app.syncActive()
		app.render()
		app.save()
		toast(state.applyToAll ? '切换字体将作用于全部文字' : '切换字体仅作用于后续输入')
	})

	;($('wwSize') as HTMLInputElement).addEventListener('input', function (this: HTMLInputElement) {
		state.previewSize = +this.value
		$('wwSizeOut').textContent = this.value
		app.render()
		app.save()
	})
	;($('wwTrack') as HTMLInputElement).addEventListener('input', function (this: HTMLInputElement) {
		state.tracking = +this.value
		$('wwTrackOut').textContent = this.value
		app.render()
		app.save()
	})
	;($('wwLead') as HTMLInputElement).addEventListener('input', function (this: HTMLInputElement) {
		state.lineGap = +this.value
		$('wwLeadOut').textContent = this.value
		// 行距只影响字形带，不必重排全字体预览
		app.renderTape()
		app.save()
	})
	;($('wwInk') as HTMLSelectElement).addEventListener('change', function (this: HTMLSelectElement) {
		if (this.value === 'custom') state.inkColor = glyphInk() // 从当前显示色接手，切过去不会看不见
		state.ink = this.value
		app.syncTypeControls()
		app.render()
		app.save()
	})
	;($('wwInkColor') as HTMLInputElement).addEventListener('input', function (this: HTMLInputElement) {
		state.inkColor = this.value
		app.render()
		app.save()
	})
	;($('wwPaper') as HTMLSelectElement).addEventListener('change', function (this: HTMLSelectElement) {
		state.paper = this.value
		app.render()
		app.save()
	})
	;($('wwAlign') as HTMLSelectElement).addEventListener('change', function (this: HTMLSelectElement) {
		state.align = this.value
		app.renderTape()
		app.save()
	})

	$('btnResetType').addEventListener('click', () => {
		state.previewSize = TYPE_DEFAULTS.size
		state.tracking = TYPE_DEFAULTS.track
		state.lineGap = TYPE_DEFAULTS.lead
		state.ink = TYPE_DEFAULTS.ink
		state.inkColor = TYPE_DEFAULTS.inkColor
		state.paper = TYPE_DEFAULTS.paper
		state.align = TYPE_DEFAULTS.align
		app.syncTypeControls()
		app.render()
		app.save()
		toast('排版已重置')
	})

	$('btnExport').addEventListener('click', () => {
		const text = plain()
		if (!text.trim()) {
			toast('请先输入文字', true)
			;($('wwInput') as HTMLTextAreaElement).focus()
			return
		}
		const scope = ($('wwExportScope') as HTMLSelectElement).value
		const format = ($('wwExportFormat') as HTMLSelectElement).value
		let blocks: TextBlock[]
		let name: string
		if (scope === 'mixed') {
			blocks = runs().map(r => ({
				key: r.key,
				name: FONT_CONFIG[r.key].name,
				text: r.text
			}))
			name = '鸣潮字体_当前排版'
		} else if (scope === 'active') {
			blocks = [
				{
					key: state.activeFont,
					name: FONT_CONFIG[state.activeFont].name,
					text: filterText(state.activeFont, text)
				}
			]
			name = '鸣潮字体_' + FONT_CONFIG[state.activeFont].name
		} else {
			blocks = ORDER.map(k => ({
				key: k,
				name: FONT_CONFIG[k].name,
				text: filterText(k, text)
			}))
			name = '鸣潮字体_全部对比'
		}
		const keys = blocks.map(b => b.key)
		ensureFamilies(keys).then(() => {
			runExport(textLayout(blocks), keys, format, name)
			toast('已导出')
		})
	})

	$('btnSaveTable').addEventListener('click', () => {
		const key = ($('wwTableFont') as HTMLSelectElement).value
		const format = ($('wwTableFormat') as HTMLSelectElement).value
		if (key === ALL_FONTS) {
			;($('btnSaveAllTables') as HTMLElement).click()
			return
		}
		const keys = [key]
		ensureFamilies(keys).then(() => {
			runExport(tableLayout(key), keys, format, '鸣潮对照表_' + FONT_CONFIG[key].name)
			toast('已保存对照表')
		})
	})

	$('btnSaveAllTables').addEventListener('click', () => {
		const keys = ORDER.slice()
		const format = ($('wwTableFormat') as HTMLSelectElement).value
		toast('正在合成全部对照表…')
		ensureFamilies(keys).then(() => {
			runExport(allTablesLayout(), keys, format, '鸣潮对照表_全部')
			toast('已保存全部对照表')
		})
	})

	$('btnInstallFonts').addEventListener('click', () => {
		void installFontsPackage()
	})
}
