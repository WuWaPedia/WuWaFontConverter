import { FONT_CONFIG, ORDER } from '../fonts/manifest'
import { utf8Bytes } from './zip'

export const FONT_FILE_NAMES = Object.fromEntries(ORDER.map(k => [k, FONT_CONFIG[k].file]))

export const FONT_README = [
	'鸣潮字体包安装说明',
	'',
	'【安装】',
	'双击「一键安装.bat」即可安装全部字体，',
	'安装完之后需要重新打开Word、PS等软件才能在字体列表中看到。',
	'',
	'【字体名称】',
	'索拉里斯通用体：WuWa Solaris Universal',
	'拉古那花体：WuWa Ragunna Decorated',
	'七丘文字：WuWa Septimont Digital',
	'拉海洛文字：WuWa Lahai-Roi Regular',
	'联邦文字：WuWa Federation',
	'鸣潮数码管：WuWa Digital Tube',
	'鸣潮旧体：WW Old Font',
	'黎那汐塔丝带体：WuWa Rinascita Ribbon',
	'',
	'【卸载】',
	'双击「一键卸载.bat」即可卸载全部字体。',
	''
].join('\r\n')

export interface InstallableFont {
	name: string
	install: string
	ascii: string
	b64: string
}

export function installerBat(fonts: InstallableFont[]): Uint8Array {
	const L = [
		'@echo off',
		'setlocal',
		'set "FD=%LOCALAPPDATA%\\Microsoft\\Windows\\Fonts"',
		'if not exist "%FD%" mkdir "%FD%" >nul 2>&1',
		'set "B64=%TEMP%\\ww_font_%RANDOM%.b64"',
		'set "RK=HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts"',
		'echo Installing Wuthering Waves fonts for the current user...'
	]
	fonts.forEach(f => {
		L.push('del /q "%FD%\\' + f.install + '.ttf" >nul 2>&1')
		let first = true
		for (let i = 0; i < f.b64.length; i += 1000) {
			L.push((first ? '> ' : '>>') + '"%B64%" echo ' + f.b64.slice(i, i + 1000))
			first = false
		}
		L.push('certutil -decode "%B64%" "%FD%\\' + f.install + '.ttf" >nul')
		L.push('reg add "%RK%" /v "WuWa ' + f.ascii + ' (TrueType)" /t REG_SZ /d "%FD%\\' + f.install + '.ttf" /f >nul')
	})
	L.push('del /q "%B64%" >nul 2>&1')
	L.push('echo Done. Reopen other apps, then the fonts are ready.')
	L.push('echo.')
	L.push('pause')
	return utf8Bytes(L.join('\r\n') + '\r\n')
}

export function uninstallerBat(fonts: InstallableFont[]): Uint8Array {
	const L = [
		'@echo off',
		'setlocal',
		'set "FD=%LOCALAPPDATA%\\Microsoft\\Windows\\Fonts"',
		'set "RK=HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts"',
		'echo Uninstalling Wuthering Waves fonts for the current user...'
	]
	fonts.forEach(f => {
		L.push('del /q "%FD%\\' + f.install + '.ttf" >nul 2>&1')
		L.push('reg delete "%RK%" /v "WuWa ' + f.ascii + ' (TrueType)" /f >nul 2>&1')
	})
	L.push('echo Done. Reopen other apps to refresh the font list.')
	L.push('echo.')
	L.push('pause')
	return utf8Bytes(L.join('\r\n') + '\r\n')
}
