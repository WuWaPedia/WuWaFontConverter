import { FONT_CONFIG } from '../fonts/manifest'
import { state } from '../model/state'
import { lighten } from '../util/color'

export function hueOf(key: string): string {
	return state.paper === 'night' ? lighten(FONT_CONFIG[key].hue, 0.55) : FONT_CONFIG[key].hue
}

export function charLabel(ch: string): string {
	return ch === '\n' ? '换行' : ch === ' ' ? '空格' : ch
}
