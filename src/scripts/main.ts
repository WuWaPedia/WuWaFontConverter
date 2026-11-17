import { provider } from '@font-provider'

import { app } from './app'
import { DEFAULT_TEXT } from './fonts/manifest'
import {
	backspace,
	clearAll,
	initEditor,
	insertChar,
	render,
	setActiveFont,
	syncClearButtons,
	syncFromTextarea,
	syncTypeControls,
	undoClear
} from './model/editor'
import { load, plain, save, state } from './model/state'
import { initChips, syncActive } from './render/chips'
import { initKeyboard, renderKeyboard } from './render/keyboard'
import { initPreviewRows } from './render/preview'
import { initTable, initTableOptions, renderTable } from './render/table'
import { initTape, renderTape } from './render/tape'
import { initControls } from './ui/controls'
import { $ } from './util/dom'

export function boot() {
	Object.assign(app, {
		render,
		renderTape,
		syncFromTextarea,
		insertChar,
		backspace,
		clearAll,
		undoClear,
		setActiveFont,
		syncClearButtons,
		syncTypeControls,
		syncActive,
		save
	})

	provider.installFaces()
	initChips()
	initPreviewRows()
	initTableOptions()

	const restored = load()
	if (!restored.hadSave && !state.chars.length) {
		state.chars = Array.from(DEFAULT_TEXT).map(ch => ({ ch: ch, key: state.activeFont }))
	}
	if (restored.tableFont) {
		;($('wwTableFont') as HTMLSelectElement).value = restored.tableFont
	}
	;($('wwInput') as HTMLTextAreaElement).value = plain()
	syncTypeControls()
	$('btnApplyAll').setAttribute('aria-pressed', String(state.applyToAll))
	$('wwApplyState').textContent = state.applyToAll ? '开' : '关'
	renderKeyboard()
	renderTable()
	syncActive()
	render()

	initTape()
	initKeyboard()
	initTable()
	initControls()
	initEditor()
}
