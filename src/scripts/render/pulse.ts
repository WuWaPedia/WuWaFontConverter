export function pulse(el: HTMLElement | null | undefined, cls: string): void {
	if (!el) return
	el.classList.remove(cls)
	void el.offsetWidth
	el.classList.add(cls)
	setTimeout(() => {
		el.classList.remove(cls)
	}, 320)
}
