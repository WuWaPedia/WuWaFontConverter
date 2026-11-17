export interface FontSource {
	/** CSS 里的字体家族名 */
	family(id: string): string
	/** 已经可用的 data URI（内嵌字体或已缓存的远程字体） */
	dataUri(id: string): string | null
	/** 取得 data URI；远程字体在这里按需下载并缓存 */
	ensure(id: string): Promise<string | null>
	/** 站点构建时注入 @font-face 与 .font-* 类；wiki 由站内 common.css 提供 */
	installFaces(): void
}
