# -*- coding: utf-8 -*-
"""从构建后的单文件HTML生成灰机wiki Html命名空间适配版（HtmlMustache片段）。

wiki版复用站内common.css已定义的字体，片段内不重复定义任何字体信息：
- CSS去掉@font-face与.font-*规则，交给wiki全局样式；仅body的默认字体继承common.css
- familyOf()运行时读.font-*类的计算样式得到家族名
- SVG导出/字体包运行时读@font-face的src地址，按需fetch TTF字节并缓存为data URI
- 去掉自带顶栏（wiki页面有自己的页头），页脚GitHub链接前加fa图标

用法：先运行 build.py 生成 鸣潮文字转换器.html，再运行本脚本。
产物 ../Html-文字转换器进阶.html 的内容整体粘贴到[[Html:文字转换器进阶]]页面，
在[[文字转换器]]页面用 {{#html:文字转换器进阶}} 调用（一个页面只调用一次）。
同时生成 build/test-local_wiki.html 供本地模拟wiki环境自测。
"""
import re
import sys
from pathlib import Path

BUILD = Path(__file__).resolve().parent
ROOT = BUILD.parent
SRC = ROOT / '鸣潮文字转换器.html'
OUT = ROOT / 'Html-WenZiZhuanHuanQiJinJie.html'
SCOPE = '#wwfc'


def parse_rules(css):
    """把CSS拆成(prelude, body)列表，跳过注释，按花括号配对取块。"""
    rules = []
    i, n = 0, len(css)
    while i < n:
        while i < n and css[i].isspace():
            i += 1
        if css.startswith('/*', i):
            j = css.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        if i >= n:
            break
        j, depth = i, 0
        while j < n:
            c = css[j]
            if c == '(':
                depth += 1
            elif c == ')':
                depth -= 1
            elif depth == 0 and c in '{;':
                break
            j += 1
        prelude = css[i:j].strip()
        if j >= n or css[j] == ';':
            i = j + 1
            continue
        k, d = j + 1, 1
        while k < n and d:
            if css[k] == '{':
                d += 1
            elif css[k] == '}':
                d -= 1
            k += 1
        rules.append((prelude, css[j + 1:k - 1]))
        i = k
    return rules


def split_selectors(prelude):
    """按逗号拆分选择器，忽略括号内的逗号。"""
    parts, buf, depth = [], '', 0
    for c in prelude:
        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
        if c == ',' and depth == 0:
            parts.append(buf)
            buf = ''
        else:
            buf += c
    parts.append(buf)
    return [p.strip() for p in parts if p.strip()]


def scope_selector(sel):
    if sel in (':root', 'body', 'html,body', 'html, body'):
        return SCOPE
    if sel == '*':
        return SCOPE + ',' + SCOPE + ' *'
    if sel.startswith('::'):
        return SCOPE + sel + ',' + SCOPE + ' *' + sel
    return SCOPE + ' ' + sel


def transform_css(css):
    out = []
    for prelude, body in parse_rules(css):
        if prelude.startswith('@font-face') or prelude.startswith('.font-'):
            continue
        if prelude.startswith('@keyframes'):
            out.append('@keyframes wwfc-' + prelude.split()[1] + '{' + body + '}')
        elif prelude.startswith('@media'):
            out.append(prelude + '{\n' + transform_css(body) + '\n}')
        else:
            sels = ','.join(scope_selector(s) for s in split_selectors(prelude))
            if prelude == 'body':
                # 默认字体继承common.css的body定义，不重复声明
                body = re.sub(r'\s*font-family:[^;]+;', '', body)
            out.append(sels + '{' + body + '}')
    css = '\n'.join(out)
    css = css.replace('animation:hit ', 'animation:wwfc-hit ')
    css = css.replace('animation:deny ', 'animation:wwfc-deny ')
    return css


WIKI_OVERRIDES = """
/* ===== wiki适配追加 ===== */
/* 顶栏与侧栏改为静态定位，避免与wiki页头的sticky布局互相遮挡 */
#wwfc .nav{position:static;}
#wwfc .side{position:static;}
/* 防止wiki主题给外链加图标背景 */
#wwfc a{background-image:none;}
"""

# wiki页面自带页头与图标字体，片段去掉自带顶栏、页脚补fa图标
MARKUP_PATCHES = [
    ("""<nav class="nav">
  <div class="mark font-Ragunna" aria-hidden="true">D</div>
  <span class="nav-title">鸣潮文字转换器</span>
  <a class="nav-tag" href="https://wuwa.huijiwiki.com/" target="_blank" rel="noopener">《鸣潮百科》灰机wiki</a>
  <a class="nav-link" id="btnOnline" href="https://wuwa.huijiwiki.com/p/830" target="_blank" rel="noopener">前往在线版</a>
</nav>

""", ''),
    ('技术支持：<a href="https://github.com/WuWaPedia/WuWaFontConverter"',
     '技术支持：<i class="fa fa-github"></i><a href="https://github.com/WuWaPedia/WuWaFontConverter"'),
]

# 家族名与TTF地址一律运行时从wiki的common.css读取，片段内不重复定义
JS_FAMILY_OLD = "  var familyOf = function (key) { return 'WW ' + key.slice(5); };"
JS_FAMILY_NEW = """  // 家族名读自wiki的.font-*类（common.css已定义），不重复声明
  var familyCache = {};
  var familyOf = function (key) {
    if (familyCache[key]) return familyCache[key];
    var probe = document.createElement('span');
    probe.className = key;
    probe.style.display = 'none';
    document.getElementById('wwfc').appendChild(probe);
    var fam = getComputedStyle(probe).fontFamily.replace(/["']/g, '').trim();
    probe.remove();
    familyCache[key] = fam;
    return fam;
  };"""

JS_FONTSRC_OLD = """  // 取出内嵌@font-face的data URI，供自包含SVG使用
  function fontSrc(family) {
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i++) {
      var rules; try { rules = sheets[i].cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (var j = 0; j < rules.length; j++) {
        var r = rules[j];
        if (r.type !== CSSRule.FONT_FACE_RULE) continue;
        if ((r.style.fontFamily || '').replace(/["']/g, '').trim() !== family) continue;
        var m = (r.style.src || '').match(/url\\(["']?(data:[^)"']+)["']?\\)/);
        if (m) return m[1];
      }
    }
    return null;
  }"""
JS_FONTSRC_NEW = """  // TTF地址读自common.css的@font-face；导出SVG与字体包按需fetch并缓存为data URI
  var fontSrcCache = {};
  function fontSrc(family) { return fontSrcCache[family] || null; }
  function fontUrl(family) {
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i++) {
      var rules; try { rules = sheets[i].cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (var j = 0; j < rules.length; j++) {
        var r = rules[j];
        if (r.type !== CSSRule.FONT_FACE_RULE) continue;
        if ((r.style.fontFamily || '').replace(/["']/g, '').trim() !== family) continue;
        var m = (r.style.src || '').match(/url\\(["']?([^)"']+)["']?\\)/);
        if (m) return m[1];
      }
    }
    return null;
  }
  function fetchFontSrc(family) {
    if (fontSrcCache[family]) return Promise.resolve(fontSrcCache[family]);
    var url = fontUrl(family);
    if (!url) return Promise.resolve(null);
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    }).then(function (buf) {
      var bytes = new Uint8Array(buf), bin = '';
      for (var i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      fontSrcCache[family] = 'data:font/ttf;base64,' + btoa(bin);
      return fontSrcCache[family];
    });
  }"""

JS_ENSURE_OLD = """  function ensureFamilies(families) {
    return Promise.all(families.map(function (fam) {
      return document.fonts.load(GLYPH_SIZE + 'px "' + fam + '"').catch(function () {});
    }));
  }"""
JS_ENSURE_NEW = """  function ensureFamilies(families) {
    return Promise.all(families.map(function (fam) {
      return Promise.all([
        document.fonts.load(GLYPH_SIZE + 'px "' + fam + '"').catch(function () {}),
        fetchFontSrc(fam).catch(function () { return null; })
      ]);
    }));
  }"""

JS_RUNEXPORT_OLD = """  function runExport(layout, families, format, baseName) {
    var tr = format === 'png-transparent' || !layout.bg;"""
JS_RUNEXPORT_NEW = """  function runExport(layout, families, format, baseName) {
    if (format === 'svg' && families.some(function (f) { return !fontSrc(f); })) toast('部分字体下载失败，SVG未内嵌字体', true);
    var tr = format === 'png-transparent' || !layout.bg;"""

JS_INSTALL_OLD = """  $('btnInstallFonts').addEventListener('click', function () {
    var fonts = [], missing = [];"""
JS_INSTALL_NEW = """  $('btnInstallFonts').addEventListener('click', function () {
    toast('正在下载字体…');
    Promise.all(ORDER.map(function (k) { return fetchFontSrc(familyOf(k)).catch(function () { return null; }); })).then(function () {
    var fonts = [], missing = [];"""

JS_INSTALL_END_OLD = """    toast('字体包已下载 · 双击「一键安装.bat」即可装好全部字体');
  });"""
JS_INSTALL_END_NEW = """    toast('字体包已下载 · 双击「一键安装.bat」即可装好全部字体');
    });
  });"""

JS_PATCHES = [
    (JS_FAMILY_OLD, JS_FAMILY_NEW),
    (JS_FONTSRC_OLD, JS_FONTSRC_NEW),
    (JS_ENSURE_OLD, JS_ENSURE_NEW),
    (JS_RUNEXPORT_OLD, JS_RUNEXPORT_NEW),
    (JS_INSTALL_OLD, JS_INSTALL_NEW),
    (JS_INSTALL_END_OLD, JS_INSTALL_END_NEW),
]

# 本地自测页模拟的wiki全局字体定义（与站内一致）
WIKI_FONT_CSS = """
@font-face{font-family:'WuWa Lahai-Roi Regular';src:url('https://huiji-public.huijistatic.com/club/uploads/1/1c/WuWaLahai-RoiRegularNewXx.ttf');}
@font-face{font-family:'WuWa Ragunna Decorated';src:url('https://huiji-public.huijistatic.com/club/uploads/7/76/WuWa_Ragunna_Decorated.ttf');}
@font-face{font-family:'WuWa Septimont Digital';src:url('https://huiji-public.huijistatic.com/club/uploads/9/99/WuWa_Septimont_Digital.ttf');}
@font-face{font-family:'WuWaSolarisUniversal-Regular';src:url('https://huiji-public.huijistatic.com/club/uploads/9/9d/WuWaSolarisUniversal-260927.ttf');}
@font-face{font-family:'WuWaDigitalTube-Regular';src:url('https://huiji-public.huijistatic.com/club/uploads/4/48/WuWaDigitalTube-Regular.ttf');}
@font-face{font-family:'WuWaRinascitaRibbon-Regular';src:url('https://huiji-public.huijistatic.com/club/uploads/0/08/WuWaRinascitaRibbon-Regular.ttf');}
@font-face{font-family:'WWOldFont-Regular';src:url('https://huiji-public.huijistatic.com/club/uploads/b/ba/WWOldFont-Regular.ttf');}
@font-face{font-family:'WuWa Federation Regular';src:url('https://huiji-public.huijistatic.com/club/uploads/1/15/WuWa_Federation_Regular-261112.ttf');}
.font-LahaiRoi{font-family:'WuWa Lahai-Roi Regular' !important;}
.font-Ragunna{font-family:'WuWa Ragunna Decorated' !important;}
.font-Septimont{font-family:'WuWa Septimont Digital' !important;}
.font-Solaris{font-family:'WuWaSolarisUniversal-Regular' !important;}
.font-DigitalTube{font-family:'WuWaDigitalTube-Regular' !important;}
.font-RRibbon{font-family:'WuWaRinascitaRibbon-Regular' !important;}
.font-OldFont{font-family:'WWOldFont-Regular' !important;}
.font-Federation{font-family:'WuWa Federation Regular' !important;}
"""


def write_test_harness(fragment):
    harness = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>wiki环境模拟测试</title>
<style>
/* 模拟灰机wiki的全局样式，用于验证转换器不会污染wiki、wiki也不会破坏转换器 */
body{margin:0;background:#e8e4d8;font-family:"Noto Sans CJK","ZSFT-go","Source Han Sans SC","Source Han Sans CN","Noto Sans SC","Noto Sans CJK SC",sans-serif;font-weight:400;color:#202122;font-size:16px;}
.wiki-header{position:sticky;top:0;z-index:100;background:#36c;color:#fff;padding:12px 20px;font-size:16px;}
.wiki-shell{max-width:1100px;margin:20px auto;background:#fff;padding:24px;border:1px solid #a2a9b1;}
a{color:#36c;text-decoration:underline;}
button{background:#f8f9fa;border:1px solid #a2a9b1;padding:6px 12px;font-size:14px;}
h1{font-family:Georgia,serif;border-bottom:1px solid #a2a9b1;font-size:28px;}
p{line-height:1.6;}
""" + WIKI_FONT_CSS + """
</style>
</head>
<body>
<div class="wiki-header">模拟灰机wiki页头（sticky · z-index 100）</div>
<div class="wiki-shell">
<h1>模拟条目页</h1>
<p id="wikiPara">这是wiki正文，<a id="wikiLink" href="https://example.com">外部链接</a>，样式不应被转换器影响。</p>
<button id="wikiBtn">wiki自己的按钮</button>
<!-- ===== 片段开始 ===== -->
""" + fragment + """
<!-- ===== 片段结束 ===== -->
<p>片段之后的wiki正文。</p>
</div>
</body>
</html>"""
    (BUILD / 'test-local_wiki.html').write_text(harness, encoding='utf-8')


def main():
    html = SRC.read_text(encoding='utf-8')
    if '@@FONT_FACE@@' in html:
        print('错误：源文件是未构建的模板，请先运行 build.py')
        sys.exit(1)
    style = re.search(r'<style>(.*?)</style>', html, re.S).group(1)
    body = re.search(r'<body>(.*?)<script>', html, re.S).group(1).strip()
    script = re.search(r'<script>(.*?)</script>', html, re.S).group(1)

    for old, new in MARKUP_PATCHES:
        if body.count(old) != 1:
            print('错误：markup替换锚点不唯一或缺失：%s...' % old.strip()[:50])
            sys.exit(1)
        body = body.replace(old, new)

    for old, new in JS_PATCHES:
        if script.count(old) != 1:
            print('错误：JS替换锚点不唯一或缺失：%s...' % old.strip()[:50])
            sys.exit(1)
        script = script.replace(old, new)

    scoped = transform_css(style)
    fragment = ('<style>\n' + scoped + WIKI_OVERRIDES + '</style>\n'
                + '<div id="wwfc">\n' + body + '\n</div>\n'
                + '<script>\n' + script + '\n</script>')

    problems = []
    if '{{' in fragment:
        problems.append('含有{{，会被Mustache解析')
    if re.search(r'<!DOCTYPE|<html|<head|<body|</body|</html', fragment, re.I):
        problems.append('残留文档外壳标签')
    if '@font-face' in scoped or 'base64,' in scoped:
        problems.append('CSS仍含内嵌字体')
    if 'huijistatic' in fragment:
        problems.append('片段内仍硬编码字体地址')
    if scoped.count('"Segoe UI","Microsoft YaHei"') != 3:
        problems.append('默认字体应仅剩.real/.tlabel/软键盘角标三处，其余交给common.css')
    if '<nav' in fragment or 'btnOnline' in fragment:
        problems.append('残留自带顶栏')
    if fragment.count('{') != fragment.count('}'):
        problems.append('花括号不配对')
    if problems:
        print('错误：' + '；'.join(problems))
        sys.exit(1)

    OUT.write_text(fragment, encoding='utf-8')
    write_test_harness(fragment)
    print('输出: %s' % OUT)
    print('大小: %d bytes (%.1f KB)' % (OUT.stat().st_size, OUT.stat().st_size / 1024))
    print('检查: 无{{冲突 / 无外壳标签 / 无内嵌字体 / 无自带顶栏 / 花括号配对')
    print('自测页: %s' % (BUILD / 'test-local_wiki.html'))


if __name__ == '__main__':
    main()