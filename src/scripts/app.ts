export interface AppApi {
	render(): void
	renderTape(): void
	syncFromTextarea(): void
	insertChar(ch: string): void
	backspace(): void
	clearAll(): void
	undoClear(): void
	setActiveFont(key: string): void
	syncClearButtons(): void
	syncTypeControls(): void
	syncActive(): void
	save(): void
}

export const app = {} as AppApi
