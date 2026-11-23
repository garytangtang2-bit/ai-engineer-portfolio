"""Regenerate the static home and project pages with Python 3."""
import json
import re
from html import escape as esc
from pathlib import Path

from project_art import art, SOURCES as WORK_IMAGES
import meeting_cycle

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content'
SITE = 'https://garytangtang2-bit.github.io/ai-engineer-portfolio/'
projects = json.loads((CONTENT / 'projects.json').read_text(encoding='utf-8'))
project_by_id = {p['id']: p for p in projects}
catalogue_projects = [p for p in projects if not p.get('parent')]
inspection = json.loads((CONTENT / 'inspection.json').read_text(encoding='utf-8'))
groups = list(dict.fromkeys(p['group'] for p in projects))
pdf_name = 'assets/Gary-Tang-CV-zh.pdf'  # current CV (source: E:/CV/tmp/cv-v2); the old assets/Gary-Tang-CV.pdf is kept untouched
pdf_name_en = 'assets/Gary-Tang-CV-en.pdf'

# ---------- Readable text ----------
# Content strings may carry light markup:
#   "**lead**" line = bold one-line takeaway; "- 標籤：內容" = labelled line; "- text" = bullet; other lines = paragraph.
# A single-paragraph string with 2+ sentences gets its first sentence set in bold as the lead.
NUM = re.compile(r'(?<![\w.$／/#&;])(\d[\d,]*(?:\.\d+)?\+?)(\s?)(%|小時|分鐘|秒|格|場|倍|題|份|註冊用戶|個工作天)')
LABEL = re.compile(r'^- ([^：\s][^：]{0,5})：(.+)$')


def kn(h):
    """Key outcome numbers in escaped HTML: tabular figures, slightly heavier."""
    return NUM.sub(r'<span class="kn">\1\2\3</span>', h)


def inline(s, num=True):
    h = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', esc(s))
    return kn(h) if num else h


def plain(t):
    """Markup-free text for meta descriptions and search terms."""
    out = ''
    for line in (l.strip() for l in t.replace('**', '').split('\n')):
        if not line:
            continue
        line = line[2:] if line.startswith('- ') else line
        out += ('' if not out or out[-1] in '。：；！？' else '；') + line
    return out


def lead_of(t):
    first = t.split('\n', 1)[0]
    return first[2:-2] if first.startswith('**') and first.endswith('**') else plain(t)


def rich(text, lead=True, num=True, cls='rich'):
    lines = [l for l in text.split('\n') if l.strip()]
    if len(lines) == 1 and not lines[0].startswith(('- ', '**')):
        m = re.match(r'(.+?[。！？])(.+)$', lines[0]) if lead else None
        if m:
            return f'<p class="{cls}"><b class="lead">{inline(m[1], num)}</b>{inline(m[2], num)}</p>'
        return f'<p class="{cls}">{inline(lines[0], num)}</p>'
    out, i = [], 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('**') and line.endswith('**'):
            out.append(f'<p class="lead">{inline(line[2:-2], num)}</p>'); i += 1
        elif LABEL.match(line):
            items = []
            while i < len(lines) and LABEL.match(lines[i]):
                m = LABEL.match(lines[i]); items.append(f'<div><dt>{esc(m[1])}</dt><dd>{inline(m[2], num)}</dd></div>'); i += 1
            out.append(f'<dl class="ll">{"".join(items)}</dl>')
        elif line.startswith('- '):
            items = []
            while i < len(lines) and lines[i].startswith('- ') and not LABEL.match(lines[i]):
                items.append(f'<li>{inline(lines[i][2:], num)}</li>'); i += 1
            out.append(f'<ul class="bl">{"".join(items)}</ul>')
        else:
            out.append(f'<p>{inline(line, num)}</p>'); i += 1
    return f'<div class="{cls}">{"".join(out)}</div>'


def sentences(t):
    return [x for x in re.split(r'(?<=[。！？])', t) if x.strip()]


def rsec(sid, marker, title, body, cls='', head_extra='', wide='', title_id=None, fold=None):
    """Report section: § marker and heading in the left columns (sticky on wide screens), body on the right;
    `wide` content spans the whole grid under the heading.
    With `fold` (a one-line summary) the section is collapsed: only the heading and that line show until opened."""
    tid = title_id or f'{sid}-title'
    if fold is not None:
        inner = (f'<div class="rsec-body">{head_extra}{body}</div>' if body or head_extra else '') + (f'<div class="rsec-wide">{wide}</div>' if wide else '')
        return (f'<section class="rsec deep {cls}" id="{sid}" aria-labelledby="{tid}"><details class="fold"><summary class="fold-sum">'
                f'<span class="marker">§ {marker}</span><h2 id="{tid}">{title}</h2><span class="fold-teaser">{fold}</span>'
                f'<span class="fold-btn" aria-hidden="true"></span></summary><div class="fold-inner">{inner}</div></details></section>')
    return (f'<section class="rsec {cls}" id="{sid}" aria-labelledby="{tid}"><header class="rsec-head"><p class="marker">§ {marker}</p>'
            f'<h2 id="{tid}">{title}</h2>{head_extra}</header>' + (f'<div class="rsec-body">{body}</div>' if body else '') +
            (f'<div class="rsec-wide">{wide}</div>' if wide else '') + '</section>')


FIG = re.compile(r'<figcaption(?! data-nofig)([^>]*)>')


def number_figures(h):
    """Numbered mono figure captions 「圖 n」 per page; captions inside interactive widgets are skipped."""
    n = 0

    def sub(m):
        nonlocal n
        n += 1
        return f'<figcaption{m[1]}><span class="fig-no">圖 {n}</span>　'
    return FIG.sub(sub, h)


def nofig(h):
    return h.replace('<figcaption', '<figcaption data-nofig')


def intro_film(path):
    video = ROOT/'assets'/'introduction.mp4'
    if not video.is_file():
        return ''
    subtitle = ROOT/'assets'/'introduction.zh-Hant.vtt'
    track = f'<track kind="captions" src="{path}assets/{subtitle.name}" srclang="zh-Hant" label="繁體中文" default>' if subtitle.is_file() else ''
    return f'<video class="intro-film" controls playsinline preload="none" aria-label="Gary 以 AutoCut 製作的自我介紹" src="{path}assets/{video.name}">{track}</video>'


DESK_WIDGETS = ('meeting','pdf','tokens','youtube','togoal')
FONTS = ('noto-sans-tc-site', 'noto-serif-tc-head', 'ibm-plex-mono-latin')


def page(title, description, path, body, widgets=(), canonical='', ids=(), head_extra='', plain_page=False):
    widgets = [w for w in widgets if w]
    widget_css = ''.join(f'<link rel="stylesheet" href="{path}{sheet}.css">' for sheet in ('styles','presentation')) if widgets else ''
    desk_css = f'<link rel="stylesheet" href="{path}widgets/desks.css">' if any(w in DESK_WIDGETS for w in widgets) else ''
    if any(i in inspection for i in ids):
        desk_css += f'<link rel="stylesheet" href="{path}widgets/inspection.css">'
    widget_js = ''.join(f'<script type="module" src="{path}widgets/{w}.mjs"></script>' for w in widgets)
    scripts = '' if plain_page else f'<script type="module" src="{path}gallery.js"></script>{widget_js}'
    preload = ''.join(f'<link rel="preload" href="{path}fonts/{f}.woff2" as="font" type="font/woff2" crossorigin>' for f in FONTS)
    return f'''<!doctype html>
<html lang="zh-Hant-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(plain(description), quote=True)}"><meta name="theme-color" content="#05070c"><link rel="canonical" href="{SITE}{canonical}">{head_extra}
{preload}{widget_css}<link rel="stylesheet" href="{path}gallery.css">{desk_css}<link rel="stylesheet" href="{path}materials.css"><link rel="stylesheet" href="{path}theme.css">{scripts}</head>
<body class="gallery-body"><a class="jump-main" href="#main">跳至主要內容</a>
<header class="mast"><div class="frame mast-bar"><a class="signature" href="{path or './'}"><span aria-hidden="true" class="sig-mark">gt</span><span>Gary Tang</span></a>
<nav aria-label="網站導覽"><a href="{path}#work">作品</a><a href="{path}#about">關於</a><a class="cv-link" href="{path}{pdf_name}">履歷 PDF <span aria-hidden="true">↗</span></a></nav></div></header>
{body}
<footer class="folio-footer frame" id="contact"><div><h2>聯絡 Gary</h2><p>履歷內附電郵及電話，歡迎聯絡我面談。</p></div><div class="footer-cta"><a class="main-btn" href="{path}{pdf_name}">開啟履歷及聯絡資料 <span aria-hidden="true">↗</span></a><a class="soft-btn" href="{path}{pdf_name_en}" hreflang="en">English CV <span aria-hidden="true">↗</span></a></div></footer>
</body></html>'''


def case_href(p):
    return f'projects/{p["id"]}/'


def card_line(p):
    return p.get('card') or lead_of(p['intro'])


def tile(p, featured=False):
    modules = [project_by_id[slug] for slug in p.get('modules', [])]
    more = '互動示範' if p.get('widget') else '個案介紹'
    search_text = ' '.join([plain(p['intro']), *p['stack'], *(term for module in modules for term in [module['title'], plain(module['intro']), *module['stack']])])
    module_caption = (f'<div class="tile-modules" aria-label="組成模組"><span>{len(modules)+1} 個模組</span>' + ''.join(f'<span>{esc(module["title"])}</span>' for module in modules) + '</div>') if modules else ''
    cls = 'work-tile' + (' text-tile' if p['proof'] != 'result' else '') + (' is-featured' if featured else ' is-dense')
    return f'''<a class="{cls}" data-group="{p['group']}" data-stack="{esc(search_text,quote=True)}" data-reactive href="{case_href(p)}">
{art(p,'')}
<div class="tile-info"><div class="tile-meta"><span>{p['group']}</span><span>{more}</span></div><h3>{esc(p['title'])}</h3><p>{inline(card_line(p))}</p>{module_caption}
<div class="tile-result"><strong>{esc(p['result'])}</strong><span class="arrow-disc" aria-hidden="true"></span></div></div></a>'''


FLAGSHIPS = ['meeting', 'pdf', 'els', 'pile-review', 'autocut', 'togoal', 'pdf-merge']
FEATURED = ['meeting', 'pdf']
HIDDEN = {'portfolio'}
# Other tools: AI-heavy work first, plain automation scripts last; unlisted ids keep their order at the end.
OTHERS_ORDER = ['drill', 'tokens', 'cad-redraw', 'briefing', 'ai-assessment', 'plaxis', 'formula', 'pdf-markup', 'animation', 'youtube', 'scheduled-video']


def tool_row(p):
    search_text = ' '.join([plain(p['intro']), *p['stack']])
    thumb_file = ROOT / 'assets/work' / f"{p['id']}-small.webp"
    thumb = (f'<img class="tool-thumb" src="assets/work/{p["id"]}-small.webp" loading="lazy" decoding="async" alt="">' if thumb_file.is_file()
             else f'<span class="tool-thumb tool-icon" aria-hidden="true">{esc(p["title"][:1])}</span>')
    return f'''<a class="work-tile tool-row" data-group="{p['group']}" data-stack="{esc(search_text,quote=True)}" href="{case_href(p)}">{thumb}<span class="tool-group">{p['group']}</span><strong>{esc(p['title'])}</strong><span class="tool-intro">{esc(plain(p['intro']))}</span><span class="tool-result">{esc(p['result'])}</span></a>'''


def home_head(marker, title, tid, note='', extra=''):
    note = f'<p class="section-note">{note}</p>' if note else ''
    return f'<header class="rsec-head"><p class="marker">{marker}</p><h2 id="{tid}">{title}</h2>{extra}</header>{note}'


def home():
    filters = ''.join(f'<button type="button" data-filter="{g}" aria-pressed="{str(g=="全部").lower()}">{g}</button>' for g in ['全部', *groups])
    featured = '\n'.join(tile(project_by_id[i], True) for i in FLAGSHIPS if i in FEATURED)
    dense = '\n'.join(tile(project_by_id[i]) for i in FLAGSHIPS if i not in FEATURED)
    others = [p for p in catalogue_projects if p['id'] not in FLAGSHIPS and p['id'] not in HIDDEN]
    others.sort(key=lambda p: OTHERS_ORDER.index(p['id']) if p['id'] in OTHERS_ORDER else len(OTHERS_ORDER))
    compact_cards = '\n'.join(tool_row(p) for p in others)
    stack = ''.join(f'<span><img src="assets/logos/{logo}.svg" alt="" width="19" height="19" loading="lazy">{name}</span>' for logo,name in [('python','Python'),('javascript','JavaScript'),('threedotjs','Three.js'),('github','GitHub')])
    body = f'''<main id="main" data-home><div class="hero-stage"><canvas class="particle-field" aria-hidden="true"></canvas><section id="home" class="frame landing">
<div class="hero-type"><p class="eyeline"><span class="tone-dot"></span> AI ENGINEER <span class="role-city">／ 香港</span></p>
<h1>鄧嘉維<span lang="en">Gary Tang</span></h1><p class="hero-statement">現於工程公司設計部負責 AI 工作流，會議紀錄、報表核對等系統已由同事日常使用；另一人主導 AI 學習平台 ToGoalAi 上線。擅長粵語語音轉錄、LLM／RAG、文件理解，以及模型評估與成本控制。</p>
<div class="hero-actions"><a class="main-btn" href="#work">瀏覽全部作品 <span aria-hidden="true">↓</span></a><a class="soft-btn" href="{pdf_name}">履歷及聯絡 <span aria-hidden="true">↗</span></a></div></div>
<p class="particle-hint" hidden aria-hidden="true"><i></i><span>移動滑鼠，攪動粒子</span><span>拖動手指，攪動粒子</span></p></section><a class="scroll-cue" href="#results" aria-label="向下捲動至量度過的成果"><span>向下捲動</span><i aria-hidden="true"></i></a></div>
<section class="home-section metrics-section" id="results" aria-labelledby="results-title"><div class="frame rgrid">{home_head('§1 成果', '已上線的成果', 'results-title', '會議紀錄和 PDF 系統由設計部同事使用；ToGoalAi 是我的個人產品。每個數字都連到個案頁。')}
<div class="metric-rail rsec-wide" aria-label="主要成果"><a href="projects/meeting/" aria-label="會議紀錄人手時間由 5 小時縮至約 10 分鐘，以 30 場會議計"><span>會議紀錄人手時間</span><strong><span class="nw">5<small> 小時</small></span><i>→</i><span class="nw">10<small> 分鐘</small></span></strong><em>以 30 場會議計 · 總歷時約 90 分鐘</em></a>
<a href="projects/pdf/" aria-label="PDF 還原 Excel 由 16 小時縮至 30 分鐘"><span>PDF 還原 Excel</span><strong><span class="nw">16<small> 小時</small></span><i>→</i><span class="nw">30<small> 分鐘</small></span></strong><em>抽查準確率 99.99%</em></a>
<a href="projects/togoal/" aria-label="ToGoalAi 學習平台，2,000 名以上註冊用戶"><span>ToGoalAi 學習平台</span><strong><span class="nw">2,000+<small> 註冊用戶</small></span></strong><em>一人主導上線</em></a></div></div></section>
{cost_section()}
<section class="frame feature-band home-section" aria-labelledby="feature-title"><div class="feature-copy"><p class="eyeline">精選個案 ／ 完整工作流（建構中）</p><h2 id="feature-title">設計會議全流程自動化</h2>
<div class="feature-text"><p class="lead">由一次設計會議到下一次的完整工作流。</p><dl class="ll"><div><dt>循環</dt><dd>撰寫紀錄、提醒講者、索價、整理 Agenda 及 Sharing PDF，再寄出通知。</dd></div><div><dt>進度</dt><dd>整個循環正逐步交給 AI 和程式。</dd></div><div><dt>把關</dt><dd>會前電郵草稿和最後通知，仍由我核對後才寄出。</dd></div></dl></div>
<p class="feature-module"><b>使用中</b>Minutes 模組：同事只需回答 AI 列出的疑問（最多 <span class="kn">10 題</span>），每題可重聽約 <span class="kn">26 秒</span>原聲片段；一份紀錄的人手時間由約 <span class="kn">5 小時</span>縮至約 <span class="kn">10 分鐘</span>（以 30 場會議計）。</p><div class="feature-links"><a href="projects/meeting/#cycle">看完整工作流時間線 <span aria-hidden="true">↗</span></a><a href="projects/meeting/#demo">試做一次會議答疑 <span aria-hidden="true">↗</span></a></div></div>
<a class="instrument feature-cycle" data-reactive href="projects/meeting/#cycle" aria-label="打開設計會議循環時間線"><div class="instrument-top"><span class="tiny-led"></span><strong>設計會議循環時間線</strong><span>建構中</span></div><img src="assets/work/meeting-small.webp" width="1280" height="720" loading="lazy" decoding="async" alt="設計會議循環時間線節錄：開會日至收到即處理階段，AI、我、工程師、上司和程式各自的節點及箭頭；本機轉錄及撰寫英文 Minutes 節點標示為使用中"></a></section>
<section class="frame catalogue home-section rgrid" id="work" aria-labelledby="work-title">{home_head('§3 作品', '作品目錄', 'work-title', extra=f'<span class="index-count" aria-live="polite" id="result-count">{len(FLAGSHIPS)+len(others)} 件作品</span>')}
<p class="data-note"><b>關於示範資料</b>公司及項目資料屬機密，本站所有互動示範改用重新建立的示例資料；程式、流程和評估方法與實際使用的相同，評估數字來自實際工作文件。</p>
<div class="rsec-wide"><div class="index-controls" hidden><div class="index-filters" role="group" aria-label="按作品類別篩選">{filters}</div><label class="index-search"><span aria-hidden="true">⌕</span><input type="search" id="catalogue-search" aria-label="搜尋作品或技術" placeholder="搜尋作品或技術" maxlength="80"></label></div>
<h3 class="tier-title">主要項目 <small>每個附架構、關鍵決定、評估和失敗防護</small></h3><div class="flagship-block" data-card-section><div class="work-grid flagship-grid">{featured}</div><div class="flag-list">{dense}</div></div><section class="compact-section" data-card-section aria-labelledby="compact-title"><h3 id="compact-title">其他工具</h3><div class="tool-list">{compact_cards}</div></section><div class="no-matches" hidden><p>找不到符合這些條件的作品。</p><button type="button" id="clear-index">顯示全部作品</button></div></div><a class="index-return" href="#work" hidden>↑ 返回篩選</a></section>
<section class="about-band home-section" id="about" aria-labelledby="about-title"><div class="frame rgrid about-grid"><header class="rsec-head profile"><p class="marker">§4 關於</p><h2 id="about-title">關於我</h2><img loading="lazy" src="assets/gary-tang.webp" alt="鄧嘉維" width="180" height="220"><p>鄧嘉維 · Tang Ka Wai, Gary</p></header>
<div class="bio"><h3>我的工作方式</h3><div class="method-statement"><p class="lead">AI 編碼代理寫程式，我負責設計與驗收</p><p><b class="lead">我以 AI 編碼代理實作，本站所有系統的程式碼都由代理撰寫。</b>我負責系統框架、規則與限制、目標、執行方法、評估及驗收，以及安全邊界：代理一出錯就即時叫停，代理的每次改動都先在沙盒內進行。</p></div><p><b class="lead">我在工程公司設計部負責 AI 工具。</b>做法是先跟同事走一次原流程，分清哪些步驟用程式、哪些交給模型、哪些必須由人決定，再按<a href="#cost">上面五條原則</a>選模型、盲測和驗收。</p>
<div class="stack-marks" aria-label="常用技術">{stack}</div>{intro_film('')}
<dl><div><dt>求職方向</dt><dd>AI Engineer 全職職位：LLM 應用與代理、RAG、模型評估、本機模型部署及成本控制。</dd></div>
<div><dt>產品與維護</dt><dd>一人主導及維護網站與手機 App，程式由 Claude Code 和 Codex 等編碼代理實作。熟悉 Python、JavaScript、Three.js，能讀懂、測試及驗收代理寫的程式。</dd></div>
<div><dt>AI 與部署</dt><dd>RAG、n8n、AI Skills、API 整合、Supabase、GitHub、Vercel。</dd></div>
<div><dt>工作經歷</dt><dd>2026.09 至今 · Kin Wing Engineering Co. Ltd<br>Assistant AI and design Administrator，設計部。</dd></div>
<div><dt>學歷與證書</dt><dd>國立政治大學公共行政學系，2026.06 畢業。經 HKCAAVQ 評估等同香港榮譽學士學位。持有 Claude 101、AI Fluency 證書。</dd></div></dl></div></div></section></main>'''
    return page('鄧嘉維 Gary Tang｜AI Engineer 作品集','實試粵語會議紀錄、核對兩萬格 Excel，了解 Gary 如何主導 ToGoalAi 由設計到上線。','',body)


def reader(pid, anchor, marker=True):
    view = inspection[pid]
    rows = ''.join(f'<details{" open" if i == 0 else ""}><summary><span>{esc(code)}</span>{esc(title)}</summary><p>{esc(detail)}</p></details>' for i,(code,title,detail) in enumerate(view['rows']))
    box = f'''<div class="output-reader"><header class="reader-head"><h3>{esc(view['title'])}</h3><span>{esc(view['scope'])}</span></header><div class="reader-body"><div class="reader-stat"><strong>{esc(view['metric'])}</strong><b>{esc(view['unit'])}</b><p>{esc(view['help'])}</p></div><div class="reader-rows">{rows}</div></div></div>'''
    if marker:
        return rsec(anchor, '輸出', '查看輸出', '', cls='reader-section', wide=box)
    return f'<section class="reader-section" id="{anchor}"><h2>查看輸出</h2>{box}</section>'


def demo(widget, anchor, heading='親手試用', marker=True):
    fragment = nofig((CONTENT/'widgets'/f'{widget}.html').read_text(encoding='utf-8'))
    if marker:
        return rsec(anchor, '試用', heading, '', cls='case-demo', wide=f'<div class="demo-content">{fragment}</div>')
    return f'<section class="case-demo" id="{anchor}"><p class="eyeline">親手試用</p><h2>{heading}</h2><div class="demo-content">{fragment}</div></section>'


def supplementary_for(pid):
    if pid == 'transcribe':
        return (CONTENT/'asr-calibration.html').read_text(encoding='utf-8')
    if pid == 'pile-review':
        return (CONTENT/'pile-angles.html').read_text(encoding='utf-8')
    return ''


def steps_list(steps):
    return ''.join(f'<li><h3>{esc(t)}</h3>{rich(d, lead=False, cls="step-d")}</li>' for t, d in (x.split('｜', 1) for x in steps))


def module_card(c, number, path):
    steps = steps_list(c['steps'])
    chips = ''.join(f'<li>{esc(v)}</li>' for v in c['stack'])
    figure = ''
    image = ROOT/'assets'/'work'/f'{c["id"]}.webp'
    if c.get('proof') != 'none' and image.is_file() and c['id'] in WORK_IMAGES:
        label, caption, alt = WORK_IMAGES[c['id']]
        href = f'{path}assets/work/{c["id"]}.webp'
        figure = f'<figure class="proof-figure"><a class="proof-open" href="{href}" data-caption="{esc(caption,quote=True)}" aria-label="放大圖片：{esc(alt,quote=True)}"><img src="{href}" loading="lazy" decoding="async" alt="{esc(alt,quote=True)}"></a><figcaption><b>{esc(label)}</b>{esc(caption)}</figcaption></figure>'
    supplement = supplementary_for(c['id'])
    extra = ''
    if c['id'] in inspection and not c.get('widget'):
        extra += reader(c['id'], f'{c["id"]}-output', marker=False)
    if c.get('widget'):
        extra += demo(c['widget'], f'{c["id"]}-demo', marker=False)
    cls = 'module-top' if figure else 'module-top no-proof'
    head = (f'<div class="{cls}"><div><p class="eyeline">模組 {number:02d} · {esc(c["group"])}</p><h3 id="{c["id"]}-title">{esc(c["title"])}</h3>{rich(c["intro"], cls="module-intro")}'
            f'<div class="module-result"><span>成果</span><strong>{kn(esc(c["result"]))}</strong></div></div>{figure}</div>')
    more = (f'<details class="mod-more"><summary>步驟、細節與工具</summary>{rich(c["detail"], cls="module-intro")}'
            f'<ol class="build-steps">{steps}</ol><ul class="tech-pills" aria-label="技術與工具">{chips}</ul>{supplement}</details>')
    return f'<article class="module-card" id="{c["id"]}" aria-labelledby="{c["id"]}-title">{head}{more}{extra}<a class="module-back" href="#modules">↑ 返回模組總覽</a></article>'


def modules_section(p, children, path):
    core = f'<li><a class="is-core" href="#method"><small>模組 01 · 主流程</small><strong>{esc(p["title"])}</strong><span>{esc(p["result"])}</span></a></li>'
    items = ''.join(f'<li><a href="#{c["id"]}"><small>模組 {i:02d}</small><strong>{esc(c["title"])}</strong><span>{esc(c["result"])}</span></a></li>' for i,c in enumerate(children,2))
    cards = ''.join(module_card(c,i,path) for i,c in enumerate(children,2))
    intro = f'<p class="rich"><b class="lead">這是一個完整工具，由 {len(children)+1} 個模組組成。</b>上方是主流程；以下每個模組各有用途、實作步驟和輸出，可直接跳到相應段落。</p>'
    return rsec('modules', '模組', '組成模組', intro, cls='modules', wide=f'<ol class="module-index">{core}{items}</ol>{cards}')


ENGINEERING = json.loads((CONTENT / 'engineering.json').read_text(encoding='utf-8'))
KIND = {'model': '模型', 'code': '程式', 'human': '人手'}


def code_panel(spec):
    if not spec:
        return ''
    name, lang, caption, *rest = spec
    note = f'<p class="code-note">{esc(rest[0])}</p>' if rest else ''
    lines = []
    for line in (CONTENT/'code'/name).read_text(encoding='utf-8').rstrip().splitlines():
        cut = min([i for i in (line.find('#'), line.find('//')) if i >= 0 and (i == len(line) - len(line.lstrip()) or line[i-2:i] == '  ')] or [-1])
        lines.append(esc(line) if cut < 0 else esc(line[:cut]) + f'<span class="c">{esc(line[cut:])}</span>')
    src = '\n'.join(lines)
    return f'<figure class="code-panel"><figcaption><span class="code-lang">{esc(lang)}</span><span>{esc(caption)}</span></figcaption><pre tabindex="0" aria-label="{esc(caption,quote=True)}"><code>{src}</code></pre>{note}</figure>'


COST_KIND = {'code': '程式', 'local': '本機模型', 'light': '輕量模型', 'model': '雲端視覺模型', 'cloud': '雲端模型', 'agent': '中階代理', 'strong': '高階代理', 'human': '人手'}


def cost_block(e):
    c = e.get('cost')
    if not c:
        return ''
    rows = ''.join(f'<tr data-kind="{k}"><th scope="row">{esc(step)}</th><td data-label="用甚麼"><span class="cost-tag">{COST_KIND[k]}</span><span class="cv">{inline(what)}</span></td>'
                   f'<td data-label="為甚麼"><span class="cv">{inline(why)}</span></td><td data-label="省在哪裏"><span class="cv">{inline(save)}</span></td></tr>' for k, step, what, why, save in c['rows'])
    note = rich(c['note'], cls='eval-note') if c.get('note') else ''
    return (f'<div class="eng-part cost-part" id="cost"><h3>模型與成本</h3>{rich(c["intro"], cls="cost-intro")}'
            f'<div class="fail-wrap cost-wrap"><table class="fail-table cost-table"><thead><tr><th scope="col">步驟</th><th scope="col">用甚麼</th><th scope="col">為甚麼</th><th scope="col">省在哪裏</th></tr></thead><tbody>{rows}</tbody></table></div>'
            f'{note}{code_panel(c.get("code"))}</div>')


def cost_section():
    c = ENGINEERING['_cost_principles']
    rows = ''.join(f'<li class="principle"><div class="pr-head"><h3>{esc(x["title"])}</h3><p class="pr-rule">{inline(x["rule"])}</p></div>'
                   f'<ul class="bl pr-proof">' + ''.join(f'<li>{inline(s)}</li>' for s in sentences(x['evidence'])) + '</ul>'
                   f'<a class="pr-link" href="{x["href"]}">{esc(x["link"])} <span aria-hidden="true">→</span></a></li>' for x in c['cards'])
    return (f'<section class="home-section cost-section" id="cost" aria-labelledby="cost-title"><div class="frame rgrid">{home_head(esc(c["eyebrow"]), esc(c["title"]), "cost-title", esc(c["note"]))}'
            f'<ol class="principles rsec-wide">{rows}</ol></div></section>')


def eng_parts(pid):
    """Engineering data split into the case skeleton: 問題 → 做法 → 結果 → 限制."""
    e = ENGINEERING.get(pid)
    if not e or 'pipeline' not in e:
        return None
    cons = '<ul class="bl eng-list">' + ''.join(f'<li>{inline(c)}</li>' for c in e['constraints']) + '</ul>'
    pipe = ''.join(f'<li data-kind="{k}"><span class="pipe-tag">{KIND[k]}</span><strong>{esc(n)}</strong>{rich(d, lead=False, cls="pipe-d")}</li>' for k,n,d in e['pipeline'])
    dec = ''.join(f'<li><p class="dec-chose"><span>採用</span>{inline(c)}</p><p class="dec-over"><span>不採用</span>{esc(o)}</p>{rich(w, lead=False, cls="dec-why")}</li>' for c,o,w in e['decisions'])
    ev = ''.join(f'<li><strong>{esc(f)}</strong>{rich(t, cls="ev-d")}</li>' for f,t in e['evaluation'])
    ev = f'<ul class="eval-list">{ev}</ul>' if ev else ''
    fail = ''.join(f'<tr><th scope="row">{inline(r)}</th><td>{inline(g)}</td></tr>' for r,g in e['failures'])
    notes = []

    def with_note(html_, method):
        if not method:
            return html_
        notes.append(method)
        k = len(notes)
        sup = f'<sup class="fn"><a href="#n-{pid}-{k}" id="r-{pid}-{k}" aria-label="註 {k}">{k}</a></sup>'
        return html_.replace('</p>', sup + '</p>', 1) if '</p>' in html_ else html_ + sup
    shown_claims = [c for c in e.get('claims', []) if c.get('section') != 'cost']
    claims = ''.join(f'<li>{with_note(rich(c["claim"], cls="claim"), c.get("method"))}</li>' for c in shown_claims)
    outcome_title = '實際成果與量度方法' if any(c.get('method') for c in shown_claims) else '實際成果'
    note = rich(e['eval_note'], cls='eval-note') if e.get('eval_note') else ''
    evaluation = f'<div class="eng-part"><h3>評估</h3>{ev}{note}</div>' if (ev or note) and e['evaluation'] else ''
    au = e.get('audit')
    if au:
        tiers = ''.join(f'<li style="--tier:{i}"><span class="tier-no">{i+1:02d}</span><strong>{esc(n)}</strong><span class="tier-sum">{inline(sm)}</span></li>' for i,(n,sm,_) in enumerate(au['layers']))
        detail = ''.join(f'<div><h4><span>{i+1:02d}</span>{esc(n)}</h4><ul class="bl">' + ''.join(f'<li>{inline(t)}</li>' for t in items) + '</ul></div>' for i,(n,_,items) in enumerate(au['layers']))
        audit = (f'<div class="audit">{rich(au["intro"], cls="audit-intro")}<div class="audit-grid">'
                 f'<figure class="audit-funnel" aria-label="三層抽查：必讀格、分層隨機抽樣、升級"><ol>{tiers}</ol><figcaption>{esc(au["tradeoff"])}</figcaption></figure>'
                 f'<div class="audit-detail">{detail}</div></div></div>')
        evaluation = f'<div class="eng-part"><h3>評估：{esc(au["title"])}</h3>{audit}{ev}{note}</div>'
    if not evaluation and note:
        evaluation = f'<div class="eng-part">{note}</div>'
    rag = ''
    rf = e.get('rag_flow')
    if rf:
        cols = ''.join(f'<li class="rag-step"><span class="rag-no">{i+1:02d}</span><h4>{esc(n)}</h4><ul>' + ''.join(f'<li{" class=mono" if ("CITATIONS" in x or x.startswith("[")) else ""}>{esc(x)}</li>' for x in items) + f'</ul><p>{esc(sub)}</p></li>' for i,(n,items,sub) in enumerate(rf['columns']))
        rag = f'<div class="eng-part" id="rag-flow"><h3>{esc(rf["title"])}</h3><figure class="rag-flow" aria-label="{esc(rf["title"],quote=True)}"><ol>{cols}</ol><figcaption>{esc(rf["caption"])}</figcaption></figure></div>'
    legend = ''.join(f'<span data-kind="{k}">{v}</span>' for k,v in KIND.items())
    method = (f'<div class="eng-part"><div class="eng-part-head"><h3>架構：模型、程式與人手的分工</h3><div class="pipe-legend" aria-hidden="true">{legend}</div></div><ol class="pipe">{pipe}</ol></div>'
              f'{rag}{cost_block(e)}<div class="eng-part"><h3>關鍵決定與取捨</h3><ul class="decisions">{dec}</ul></div>{code_panel(e.get("code"))}')
    foot = ''
    if notes:
        foot = ('<div class="notes"><h3>註</h3><ol>' + ''.join(f'<li id="n-{pid}-{k}"><span class="note-k">量度方法</span>{esc(m)} <a href="#r-{pid}-{k}" aria-label="返回正文第 {k} 項">↩</a></li>' for k, m in enumerate(notes, 1)) + '</ol></div>')
    results = f'<ul class="claim-list">{claims}</ul>{foot}{evaluation}'
    limits = f'<div class="fail-wrap"><table class="fail-table"><thead><tr><th scope="col">可能出錯</th><th scope="col">防護</th></tr></thead><tbody>{fail}</tbody></table></div>'
    return {'problem': cons, 'method': method, 'results': results, 'outcome_title': outcome_title, 'limits': limits}


def key_line(d):
    """First sentence of a step description, without a leading bullet or a short 「標籤：」 prefix."""
    first = d.strip().splitlines()[0].lstrip('- ').strip()
    first = re.sub(r'^[^：，。]{1,6}：', '', first)
    return plain(sentences(first)[0] if sentences(first) else first)


def key_section(p, chips):
    """The page's key points before any detail: the problem in one line, each step in one line, the tools."""
    e = ENGINEERING.get(p['id'], {})
    rows = []
    if e.get('constraints'):
        rows.append(('要解決', f'<p>{inline(e["constraints"][0])}</p>'))
    steps = ''.join(f'<li><b>{esc(t)}</b><span>{esc(key_line(d))}</span></li>' for t, d in (x.split('｜', 1) for x in p['steps']))
    rows.append(('流程', f'<ol class="key-steps">{steps}</ol>'))
    if p.get('highlights'):
        rows.append(('成果', '<ul class="key-stats">' + ''.join(f'<li>{kn(esc(h))}</li>' for h in p['highlights']) + '</ul>'))
    rows.append(('工具', f'<ul class="tech-pills" aria-label="技術與工具">{chips}</ul>'))
    body = '<dl class="key-grid">' + ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in rows) + '</dl>'
    return rsec('key', '重點', '一眼看懂', body, cls='key-points')


def fold_teasers(pid):
    """One-line summaries shown on the collapsed detail sections."""
    e = ENGINEERING.get(pid) or {}
    parts = [] if 'pipeline' in e else ['完整步驟與背景說明']
    if 'pipeline' in e:
        parts.append('模型、程式與人手分工')
    if e.get('rag_flow'):
        parts.append('接地與引用流程')
    if e.get('cost'):
        parts.append('模型與成本')
    if e.get('decisions'):
        parts.append('關鍵取捨')
    if e.get('code'):
        parts.append('程式節錄')
    method = '、'.join(parts[:-1]) + ('及' if len(parts) > 1 else '') + parts[-1] + '。'
    cons = e.get('constraints') or []
    claims = [c for c in e.get('claims', []) if c.get('section') != 'cost']
    results = ''
    if claims:
        results = plain(sentences(plain(claims[0]['claim']))[0])
        if len(claims) > 1:
            results += f'（共 {len(claims)} 項，附量度方法）'
    return {
        'problem': f'{len(cons)} 項輸入及環境限制，決定了後面每一步的做法。' if cons else '',
        'method': method,
        'results': results or '實際成果及量度方法。',
        'limits': f'{len(e.get("failures", []))} 種可能出錯的情況，以及各自的防護。',
    }


def case_page(p, idx):
    path = '../../'
    widget = p.get('widget')
    children = [project_by_id[s] for s in p.get('modules', [])]
    chips = ''.join(f'<li>{esc(v)}</li>' for v in p['stack'])
    widgets = [widget] + [c.get('widget') for c in children]
    fragment = ''
    if any(widgets):
        fragment = (CONTENT/'symbols.html').read_text(encoding='utf-8')
    if widget:
        fragment += demo(widget, 'demo')
    if p['id'] in inspection and not widget:
        fragment = reader(p['id'], 'demo')
    supplementary = supplementary_for(p['id'])
    module_html = modules_section(p, children, path) if children else ''
    related = ''
    if p.get('related'):
        links = ''.join(f'<a href="../{module["id"]}/"><strong>{esc(module["title"])}</strong><span>{esc(plain(module["intro"]))}</span></a>' for module in (project_by_id[slug] for slug in p['related']))
        related = rsec('related', '相關', '相關工具', '', cls='related-tools', wide=f'<div class="related-list">{links}</div>')
    neighbour = next(projects[(idx+offset)%len(projects)] for offset in range(1, len(projects)) if not projects[(idx+offset)%len(projects)].get('parent'))
    first_jump = '<a class="main-btn" href="#demo">前往互動示範 ↓</a>' if widget else '<a class="main-btn" href="#key">看重點 ↓</a>'
    if p['id'] in inspection and not widget:
        first_jump = '<a class="main-btn" href="#demo">打開輸出紀錄 ↓</a>'
    if ENGINEERING.get(p['id'], {}).get('rag_flow'):
        first_jump += '<a class="soft-btn" href="#rag-flow">接地與引用流程 ↓</a>'
    if children:
        first_jump += f'<a class="soft-btn" href="#modules">{len(children)+1} 個組成模組 ↓</a>'
    cycle = ''
    if p['id'] == 'meeting':
        cycle = meeting_cycle.section(rsec, '由一次設計會議到下一次的全流程圖；目前只有「本機轉錄及撰寫英文 Minutes」已在設計部使用。')
    eng = eng_parts(p['id'])
    teaser = fold_teasers(p['id'])
    sections = ''
    if eng:
        sections += rsec('engineering', '問題', '問題與限制', eng['problem'], cls='sec-problem', fold=teaser['problem'])
    # Full step text only when it says more than the one-line flow in the key points.
    longer = any(key_line(d) != plain(d).strip() for d in (x.split('｜', 1)[1] for x in p['steps']))
    method_body = rich(p["detail"], cls="case-context") + (f'<ol class="build-steps">{steps_list(p["steps"])}</ol>' if longer else '')
    sections += rsec('method', '做法', '做法細節', method_body, cls='method', wide=eng['method'] if eng else '', fold=teaser['method'])
    if eng or supplementary:
        sections += rsec('results', '結果', eng['outcome_title'] if eng else '實際成果', eng['results'] if eng else '', cls='sec-results', wide=supplementary, fold=teaser['results'])
    if eng:
        sections += rsec('limits', '限制', '失敗情況與防護', '', cls='sec-limits', wide=eng['limits'], fold=teaser['limits'])
    prev = f'<a href="{path}#work" data-back>← 全部作品</a>'
    title = "".join(f'<span class="nw">{esc(t)}</span>' for t in p["title_parts"]) if p.get("title_parts") else esc(p["title"])
    head = f'''<div class="case-crumb">{prev}<span>／ {p["group"]}</span></div>
<section class="case-heading"><div><p class="eyeline">{p['group']} · {'互動個案' if widget else '作品個案'}</p><h1>{title}</h1>{rich(p["intro"], cls="case-intro")}<div class="case-actions">{first_jump}</div></div>
<div class="exhibit">{art(p,path,detail=True)}<div class="case-outcome"><span>成果</span><strong>{kn(esc(p['result']))}</strong></div></div></section>'''
    body = f'''<main id="main" class="case-body frame">{number_figures(head + key_section(p, chips) + fragment + cycle + sections + module_html)}
<div class="reading-shell">{related}<nav class="next-case" aria-label="瀏覽其他作品">{prev}<a href="../{neighbour['id']}/">下一件 · {esc(neighbour['title'])} →</a></nav></div></main>'''
    return page(p['title']+'｜Gary Tang AI Engineer',p['intro'],path,body,widgets,case_href(p),ids=[p['id'],*(c['id'] for c in children)])


def redirect_page(c):
    parent = project_by_id[c['parent']]
    target = f'../{parent["id"]}/#{c["id"]}'
    demo_anchor = f'#{c["id"]}-demo' if c.get('widget') else (f'#{c["id"]}-output' if c['id'] in inspection else f'#{c["id"]}')
    # Old deep links: #demo maps to the module's demo; widget-internal ids keep working because the parent page carries the same widget markup.
    script = f'<script>(function(){{var h=location.hash,b="../{parent["id"]}/";if(h==="#demo")h="{demo_anchor}";else if(!h||h==="#method"||h==="#evidence")h="#{c["id"]}";location.replace(b+h)}})()</script>'
    head = f'<meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url={target}">{script}'
    body = f'<main id="main" class="case-body frame child-redirect"><p class="eyeline">已合併為組成模組</p><h1>{esc(c["title"])}</h1><p>這個工具現在是「{esc(parent["title"])}」的一個組成模組。</p><p><a class="main-btn" href="{target}">前往 {esc(parent["title"])} · {esc(c["title"])} →</a></p></main>'
    return page(c['title']+'｜Gary Tang AI Engineer', c['intro'], '../../', body, canonical=case_href(parent), head_extra=head, plain_page=True)


if __name__ == '__main__':
    assert len({p['id'] for p in projects}) == len(projects)
    for p in projects:
        if p.get('parent'):
            assert p['id'] in project_by_id[p['parent']].get('modules', []), p['id']
    (ROOT/'index.html').write_text(home(),encoding='utf-8')
    for idx, project in enumerate(projects):
        folder = ROOT/case_href(project)
        folder.mkdir(parents=True,exist_ok=True)
        html = redirect_page(project) if project.get('parent') else case_page(project,idx)
        (folder/'index.html').write_text(html,encoding='utf-8')
    print(f'Built home and {len(projects)} project pages.')
