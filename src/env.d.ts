declare const __BUILD_TARGET__: 'site' | 'wiki'

declare module '@font-provider' {
	import type { FontSource } from './scripts/fonts/source'
	export const provider: FontSource
}
