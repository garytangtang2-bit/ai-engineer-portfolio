"""Regenerate the static home and project pages with Python 3."""
import json
from html import escape as esc
from pathlib import Path

from project_art import art, SOURCES as WORK_IMAGES

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content'
SITE = 'https://garytangtang2-bit.github.io/ai-engineer-portfolio/'
projects = json.loads((CONTENT / 'projects.json').read_text(encoding='utf-8'))
project_by_id = {p['id']: p for p in projects}
catalogue_projects = [p for p in projects if not p.get('parent')]
inspection = json.loads((CONTENT / 'inspection.json').read_text(encoding='utf-8'))
groups = list(dict.fromkeys(p['group'] for p in projects))
pdf_name = 'assets/Gary-Tang-CV.pdf'


def intro_film(path):
    video = ROOT/'assets'/'introduction.mp4'
    if not video.is_file():
        return ''
    subtitle = ROOT/'assets'/'introduction.zh-Hant.vtt'
    track = f'<track kind="captions" src="{path}assets/{subtitle.name}" srclang="zh-Hant" label="繁體中文" default>' if subtitle.is_file() else ''
    return f'<video class="intro-film" controls playsinline preload="none" aria-label="Gary 以 AutoCut 製作的自我介紹" src="{path}assets/{video.name}">{track}</video>'


DESK_WIDGETS = ('meeting','pdf','tokens','youtube','togoal')


def page(title, description, path, body, widgets=(), canonical='', ids=(), head_extra='', plain=False):
    widgets = [w for w in widgets if w]
    widget_css = ''.join(f'<link rel="stylesheet" href="{path}{sheet}.css">' for sheet in ('styles','presentation')) if widgets else ''
    desk_css = f'<link rel="stylesheet" href="{path}widgets/desks.css">' if any(w in DESK_WIDGETS for w in widgets) else ''
    if any(i in inspection for i in ids):
        desk_css += f'<link rel="stylesheet" href="{path}widgets/inspection.css">'
    widget_js = ''.join(f'<script type="module" src="{path}widgets/{w}.mjs"></script>' for w in widgets)
    scripts = '' if plain else f'<script type="module" src="{path}gallery.js"></script>{widget_js}'
    return f'''<!doctype html>
<html lang="zh-Hant-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(description, quote=True)}"><meta name="theme-color" content="#05070c"><link rel="canonical" href="{SITE}{canonical}">{head_extra}
{widget_css}<link rel="stylesheet" href="{path}gallery.css">{desk_css}<link rel="stylesheet" href="{path}materials.css"><link rel="stylesheet" href="{path}theme.css">{scripts}</head>
<body class="gallery-body"><a class="jump-main" href="#main">跳至主要內容</a>
<header class="mast"><div class="frame mast-bar"><a class="signature" href="{path or './'}"><span aria-hidden="true" class="sig-mark">gt</span><span>Gary Tang</span></a>
<nav aria-label="網站導覽"><a href="{path}#work">作品</a><a href="{path}#about">關於</a><a class="cv-link" href="{path}{pdf_name}">履歷 PDF <span aria-hidden="true">↗</span></a></nav></div></header>
{body}
<footer class="folio-footer frame" id="contact"><div><h2>聯絡 Gary</h2><p>履歷內附電郵及電話，歡迎聯絡我面談。</p></div><a class="main-btn" href="{path}{pdf_name}">開啟履歷及聯絡資料 <span aria-hidden="true">↗</span></a></footer>
</body></html>'''


def case_href(p):
    return f'projects/{p["id"]}/'


def tile(p):
    modules = [project_by_id[slug] for slug in p.get('modules', [])]
    more = '互動示範' if p.get('widget') else '個案介紹'
    search_text = ' '.join([*p['stack'], *(term for module in modules for term in [module['title'], module['intro'], *module['stack']])])
    module_caption = (f'<div class="tile-modules" aria-label="組成模組"><span>{len(modules)+1} 個模組</span>' + ''.join(f'<span>{esc(module["title"])}</span>' for module in modules) + '</div>') if modules else ''
    return f'''<a class="work-tile{' text-tile' if p['proof'] != 'result' else ''}" data-group="{p['group']}" data-stack="{esc(search_text,quote=True)}" data-reactive href="{case_href(p)}">
{art(p,'')}
<div class="tile-info"><div class="tile-meta"><span>{p['group']}</span><span>{more}</span></div><h3>{esc(p['title'])}</h3><p>{esc(p.get('card', p['intro']))}</p>{module_caption}
<div class="tile-result"><strong>{esc(p['result'])}</strong><span class="arrow-disc" aria-hidden="true"></span></div></div></a>'''


FLAGSHIPS = ['meeting', 'pdf', 'els', 'pile-review', 'autocut', 'togoal', 'pdf-merge']
HIDDEN = {'portfolio'}
# Other tools: AI-heavy work first, plain automation scripts last; unlisted ids keep their order at the end.
OTHERS_ORDER = ['drill', 'tokens', 'cad-redraw', 'briefing', 'ai-assessment', 'plaxis', 'formula', 'pdf-markup', 'animation', 'youtube', 'scheduled-video']


def tool_row(p):
    search_text = ' '.join(p['stack'])
    thumb_file = ROOT / 'assets/work' / f"{p['id']}-small.webp"
    thumb = (f'<img class="tool-thumb" src="assets/work/{p["id"]}-small.webp" loading="lazy" decoding="async" alt="">' if thumb_file.is_file()
             else f'<span class="tool-thumb tool-icon" aria-hidden="true">{esc(p["title"][:1])}</span>')
    return f'''<a class="work-tile tool-row" data-group="{p['group']}" data-stack="{esc(search_text,quote=True)}" href="{case_href(p)}">{thumb}<span class="tool-group">{p['group']}</span><strong>{esc(p['title'])}</strong><span class="tool-intro">{esc(p['intro'])}</span><span class="tool-result">{esc(p['result'])}</span></a>'''


def home():
    filters = ''.join(f'<button type="button" data-filter="{g}" aria-pressed="{str(g=="全部").lower()}">{g}</button>' for g in ['全部', *groups])
    cards = '\n'.join(tile(project_by_id[i]) for i in FLAGSHIPS)
    others = [p for p in catalogue_projects if p['id'] not in FLAGSHIPS and p['id'] not in HIDDEN]
    others.sort(key=lambda p: OTHERS_ORDER.index(p['id']) if p['id'] in OTHERS_ORDER else len(OTHERS_ORDER))
    compact_cards = '\n'.join(tool_row(p) for p in others)
    body = f'''<main id="main" data-home><div class="hero-stage"><canvas class="particle-field" aria-hidden="true"></canvas><section id="home" class="frame landing">
<div class="hero-type"><p class="eyeline"><span class="tone-dot"></span> AI ENGINEER <span class="role-city">／ 香港</span></p>
<h1>鄧嘉維<span lang="en">Gary Tang</span></h1><p class="hero-statement">我為工程團隊設計、評估及交付 AI 系統：粵語語音轉錄、LLM／RAG 和文件理解。能用程式的不交給模型，每個系統都預留人手覆核。</p>
<div class="hero-actions"><a class="main-btn" href="#work">瀏覽全部作品 <span aria-hidden="true">↓</span></a><a class="soft-btn" href="{pdf_name}">履歷及聯絡 <span aria-hidden="true">↗</span></a></div></div>
<p class="particle-hint" hidden aria-hidden="true"><i></i><span>移動滑鼠，攪動粒子</span><span>拖動手指，攪動粒子</span></p></section><a class="scroll-cue" href="#results" aria-label="向下捲動至量度過的成果"><span>向下捲動</span><i aria-hidden="true"></i></a></div>
<section class="home-section metrics-section" id="results" aria-labelledby="results-title"><div class="frame"><div class="section-line"><div><p class="eyeline">MEASURED RESULTS</p><h2 id="results-title">量度過的成果</h2></div><p class="section-note">每個數字都連到相應的個案頁。</p></div>
<div class="metric-rail" aria-label="主要成果"><a href="projects/meeting/" aria-label="會議紀錄人手時間由 5 小時縮至約 10 分鐘"><span>會議紀錄人手時間</span><strong><span class="nw">5<small> 小時</small></span><i>→</i><span class="nw">10<small> 分鐘</small></span></strong><em>總歷時約 90 分鐘</em></a>
<a href="projects/pdf/" aria-label="PDF 還原 Excel 由 16 小時縮至 30 分鐘"><span>PDF 還原 Excel</span><strong><span class="nw">16<small> 小時</small></span><i>→</i><span class="nw">30<small> 分鐘</small></span></strong><em>抽查準確率 99.99%</em></a>
<a href="projects/togoal/" aria-label="ToGoalAi 學習平台，1,000 名以上用戶"><span>ToGoalAi 學習平台</span><strong><span class="nw">1,000+<small> 用戶</small></span></strong><em>一人主導上線</em></a></div></div></section>
{cost_section()}
<section class="frame feature-band home-section" aria-labelledby="feature-title"><div class="feature-copy"><p class="eyeline">精選個案 ／ 工作流程</p><h2 id="feature-title">把重聽會議的時間，<br>留給需要判斷的事。</h2><p>以前同事要重聽整場，再寫英文紀錄。我將轉錄、答疑和匯出串成同一個流程。一份紀錄的人手時間由約 5 小時縮至約 10 分鐘。</p><a href="projects/meeting/#demo">試做一次會議答疑 <span aria-hidden="true">↗</span></a></div>
<div class="instrument" data-reactive><div class="instrument-top"><span class="tiny-led"></span><strong>會議紀錄助手</strong><span>示例節錄</span></div>
<div class="signal-scope" aria-hidden="true"><div class="feature-wave">{''.join(f'<i style="--amplitude:{level}%"></i>' for level in [12,20,15,29,42,61,79,48,24,38,62,94,69,43,26,17,21,37,72,100,65,35,15,28,40,71,84,57,36,22,14,25,53,75,91,58,31,41,54,27,19,33,19,13,10,18,11,7])}</div></div><div class="transcript" aria-live="polite" aria-atomic="true"><span class="transcript-kicker" id="snippet-label">原始錄音 · 19:06</span><p id="snippet-text">「下星期……四？再確認。」</p></div>
<div class="instrument-rail" role="group" aria-label="會議紀錄示例步驟"><button type="button" aria-pressed="true" data-snippet="0">原句</button><button type="button" aria-pressed="false" data-snippet="1">答疑</button><button type="button" aria-pressed="false" data-snippet="2">交付</button></div></div></section>
<section class="frame catalogue home-section" id="work"><div class="section-line"><div><p class="eyeline">PROJECT INDEX</p><h2>作品目錄</h2></div><span class="index-count" aria-live="polite" id="result-count">{len(FLAGSHIPS)+len(others)} 件作品</span></div>
<p class="data-note"><b>關於示範資料</b>客戶及公司資料屬機密，本站所有互動示範改用重新建立的示例資料；程式、流程和評估方法與實際使用的相同，評估數字來自實際工作文件。</p>
<div class="index-controls" hidden><div class="index-filters" role="group" aria-label="按作品類別篩選">{filters}</div><label class="index-search"><span aria-hidden="true">⌕</span><input type="search" id="catalogue-search" aria-label="搜尋作品或技術" placeholder="搜尋作品或技術" maxlength="80"></label></div>
<h3 class="tier-title">主要項目 <small>每個附架構、關鍵決定、評估和失敗防護</small></h3><div class="work-grid flagship-grid" data-card-section>{cards}</div><section class="compact-section" data-card-section aria-labelledby="compact-title"><h3 id="compact-title">其他工具</h3><div class="tool-list">{compact_cards}</div></section><div class="no-matches" hidden><p>找不到符合這些條件的作品。</p><button type="button" id="clear-index">顯示全部作品</button></div><a class="index-return" href="#work" hidden>↑ 返回篩選</a></section>
<section class="about-band home-section" id="about"><div class="frame about-grid"><div class="profile"><img loading="lazy" src="assets/gary-tang.webp" alt="鄧嘉維" width="180" height="220"><div><p class="eyeline">ABOUT GARY</p><h2>關於我</h2><p>鄧嘉維 · Tang Ka Wai, Gary</p></div></div>
<div class="bio"><h3>先量度，再交付</h3><p class="method-statement"><b>我的工程方法</b>我以 AI 編碼代理實作，本站所有系統的程式碼都由代理撰寫。我負責系統框架、規則與限制、目標、執行方法、評估及驗收，以及安全邊界：代理一出錯就即時叫停，代理的每次改動都先在沙盒內進行。</p><p>我在工程公司設計部負責 AI 工具。做法是先跟同事走一次原流程，分清哪些步驟用程式、哪些交給模型、哪些必須由人決定，再按<a href="#cost">上面五條原則</a>選模型、盲測和驗收。</p>
<div class="stack-marks" aria-label="常用技術">{''.join(f'<span><img src="assets/logos/{logo}.svg" alt="" width="19" height="19" loading="lazy">{name}</span>' for logo,name in [('python','Python'),('javascript','JavaScript'),('threedotjs','Three.js'),('github','GitHub')])}</div>{intro_film('')}
<dl><div><dt>產品與維護</dt><dd>一人主導及維護網站與手機 App，程式由 Claude Code 和 Codex 等編碼代理實作。熟悉 Python、JavaScript、Three.js，能讀懂、測試及驗收代理寫的程式。</dd></div>
<div><dt>AI 與部署</dt><dd>RAG、n8n、AI Skills、API 整合、Supabase、GitHub、Vercel。</dd></div>
<div><dt>工作經歷</dt><dd>2026.09 至今 · Kin Wing Engineering Co. Ltd<br>Assistant AI and design Administrator，設計部。</dd></div>
<div><dt>學歷與證書</dt><dd>國立政治大學公共行政學系，2026.06 畢業。經 HKCAAVQ 評估等同香港榮譽學士學位。持有 Claude 101、AI Fluency 證書。</dd></div></dl></div></div></section></main>'''
    return page('鄧嘉維 Gary Tang｜AI Engineer 作品集','實試粵語會議紀錄、核對兩萬格 Excel，了解 Gary 如何主導 ToGoalAi 由設計到上線。','',body)


def reader(pid, anchor):
    view = inspection[pid]
    rows = ''.join(f'<details{" open" if i == 0 else ""}><summary><span>{esc(code)}</span>{esc(title)}</summary><p>{esc(detail)}</p></details>' for i,(code,title,detail) in enumerate(view['rows']))
    return f'''<section class="reader-section" id="{anchor}"><h2>查看輸出</h2><div class="output-reader"><header class="reader-head"><h3>{esc(view['title'])}</h3><span>{esc(view['scope'])}</span></header><div class="reader-body"><div class="reader-stat"><strong>{esc(view['metric'])}</strong><b>{esc(view['unit'])}</b><p>{esc(view['help'])}</p></div><div class="reader-rows">{rows}</div></div></div></section>'''


def demo(widget, anchor, heading='親手試用'):
    fragment = (CONTENT/'widgets'/f'{widget}.html').read_text(encoding='utf-8')
    return f'<section class="case-demo" id="{anchor}"><p class="eyeline">INTERACTIVE</p><h2>{heading}</h2><div class="demo-content">{fragment}</div></section>'


def supplementary_for(pid):
    if pid == 'autocut':
        return (CONTENT/'autocut-proof.html').read_text(encoding='utf-8')
    if pid == 'transcribe':
        return (CONTENT/'asr-calibration.html').read_text(encoding='utf-8')
    if pid == 'pile-review':
        return (CONTENT/'pile-angles.html').read_text(encoding='utf-8')
    return ''


def module_card(c, number, path):
    steps = ''.join(f'<li><h3>{esc(t)}</h3><p>{esc(d)}</p></li>' for t,d in (x.split('｜',1) for x in c['steps']))
    chips = ''.join(f'<li>{esc(v)}</li>' for v in c['stack'])
    figure = ''
    image = ROOT/'assets'/'work'/f'{c["id"]}.webp'
    if c.get('proof') != 'none' and image.is_file() and c['id'] in WORK_IMAGES:
        label, caption, alt = WORK_IMAGES[c['id']]
        href = f'{path}assets/work/{c["id"]}.webp'
        figure = f'<figure class="proof-figure"><a class="proof-open" href="{href}" data-caption="{esc(caption,quote=True)}" aria-label="放大圖片：{esc(alt,quote=True)}"><img src="{href}" loading="lazy" decoding="async" alt="{esc(alt,quote=True)}"></a><figcaption><b>{esc(label)}</b>{esc(caption)}</figcaption></figure>'
    extra = supplementary_for(c['id'])
    if c['id'] in inspection and not c.get('widget'):
        extra += reader(c['id'], f'{c["id"]}-output')
    if c.get('widget'):
        extra += demo(c['widget'], f'{c["id"]}-demo')
    cls = 'module-top' if figure else 'module-top no-proof'
    head = f'<div class="{cls}"><div><p class="eyeline">模組 {number:02d} · {esc(c["group"])}</p><h3 id="{c["id"]}-title">{esc(c["title"])}</h3><p class="module-intro">{esc(c["intro"])}</p><div class="module-result"><span>交付成果</span><strong>{esc(c["result"])}</strong></div><p class="module-intro">{esc(c["detail"])}</p></div>{figure}</div>'
    return f'<article class="module-card" id="{c["id"]}" aria-labelledby="{c["id"]}-title">{head}<ol class="build-steps">{steps}</ol><ul class="tech-pills" aria-label="技術與工具">{chips}</ul>{extra}<a class="module-back" href="#modules">↑ 返回模組總覽</a></article>'


def modules_section(p, children, path):
    core = f'<li><a class="is-core" href="#method"><small>模組 01 · 主流程</small><strong>{esc(p["title"])}</strong><span>{esc(p["result"])}</span></a></li>'
    items = ''.join(f'<li><a href="#{c["id"]}"><small>模組 {i:02d}</small><strong>{esc(c["title"])}</strong><span>{esc(c["result"])}</span></a></li>' for i,c in enumerate(children,2))
    cards = ''.join(module_card(c,i,path) for i,c in enumerate(children,2))
    return f'<section class="modules" id="modules" aria-labelledby="modules-title"><div class="modules-head"><p class="eyeline">MODULES</p><h2 id="modules-title">組成模組</h2><p>這是一個完整工具，由 {len(children)+1} 個模組組成。上方是主流程；以下每個模組各有用途、實作步驟和輸出，可直接跳到相應段落。</p></div><ol class="module-index">{core}{items}</ol>{cards}</section>'


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
    rows = ''.join(f'<tr data-kind="{k}"><th scope="row">{esc(step)}</th><td data-label="用甚麼"><span class="cost-tag">{COST_KIND[k]}</span>{esc(what)}</td>'
                   f'<td data-label="為甚麼">{esc(why)}</td><td data-label="省在哪裏">{esc(save)}</td></tr>' for k, step, what, why, save in c['rows'])
    note = f'<p class="eval-note">{esc(c["note"])}</p>' if c.get('note') else ''
    return (f'<div class="eng-part cost-part" id="cost"><h3>模型與成本</h3><p class="cost-intro">{esc(c["intro"])}</p>'
            f'<div class="fail-wrap cost-wrap"><table class="fail-table cost-table"><thead><tr><th scope="col">步驟</th><th scope="col">用甚麼</th><th scope="col">為甚麼</th><th scope="col">省在哪裏</th></tr></thead><tbody>{rows}</tbody></table></div>'
            f'{note}{code_panel(c.get("code"))}</div>')


def cost_section():
    c = ENGINEERING['_cost_principles']
    cards = ''.join(f'<li class="cost-card"><span class="cost-no">{i+1:02d}</span><h3>{esc(x["title"])}</h3><p class="cost-rule">{esc(x["rule"])}</p>'
                    f'<p class="cost-proof">{esc(x["evidence"])}</p><a href="{x["href"]}">{esc(x["link"])} <span aria-hidden="true">→</span></a></li>' for i, x in enumerate(c['cards']))
    return (f'<section class="home-section cost-section" id="cost" aria-labelledby="cost-title"><div class="frame"><div class="section-line"><div><p class="eyeline">{esc(c["eyebrow"])}</p>'
            f'<h2 id="cost-title">{esc(c["title"])}</h2></div><p class="section-note">{esc(c["note"])}</p></div><ol class="cost-cards">{cards}</ol></div></section>')


def eng_block(pid):
    e = ENGINEERING.get(pid)
    if not e or 'pipeline' not in e:
        return ''
    cons = ''.join(f'<li>{esc(c)}</li>' for c in e['constraints'])
    pipe = ''.join(f'<li data-kind="{k}"><span class="pipe-tag">{KIND[k]}</span><strong>{esc(n)}</strong><p>{esc(d)}</p></li>' for k,n,d in e['pipeline'])
    dec = ''.join(f'<li><p class="dec-chose"><span>採用</span>{esc(c)}</p><p class="dec-over"><span>不採用</span>{esc(o)}</p><p class="dec-why">{esc(w)}</p></li>' for c,o,w in e['decisions'])
    ev = ''.join(f'<li><strong>{esc(f)}</strong><p>{esc(t)}</p></li>' for f,t in e['evaluation'])
    ev = f'<ul class="eval-list">{ev}</ul>' if ev else ''
    fail = ''.join(f'<tr><th scope="row">{esc(r)}</th><td>{esc(g)}</td></tr>' for r,g in e['failures'])
    shown_claims = [c for c in e.get('claims', []) if c.get('section') != 'cost']
    claims = ''.join(f'<li><p>{esc(c["claim"])}</p>' + (f'<p class="claim-method"><span>量度方法</span>{esc(c["method"])}</p>' if c.get('method') else '') + '</li>' for c in shown_claims)
    outcome_title = '實際成果與量度方法' if any(c.get('method') for c in shown_claims) else '實際成果'
    note = f'<p class="eval-note">{esc(e["eval_note"])}</p>' if e.get('eval_note') else ''
    evaluation = f'<div class="eng-part"><h3>評估</h3>{ev}{note}</div>' if (ev or note) and e['evaluation'] else ''
    au = e.get('audit')
    if au:
        tiers = ''.join(f'<li style="--tier:{i}"><span class="tier-no">{i+1:02d}</span><strong>{esc(n)}</strong><span class="tier-sum">{esc(sm)}</span></li>' for i,(n,sm,_) in enumerate(au['layers']))
        detail = ''.join(f'<div><h4><span>{i+1:02d}</span>{esc(n)}</h4><ul>' + ''.join(f'<li>{esc(t)}</li>' for t in items) + '</ul></div>' for i,(n,_,items) in enumerate(au['layers']))
        audit = (f'<div class="audit"><p class="audit-intro">{esc(au["intro"])}</p><div class="audit-grid">'
                 f'<figure class="audit-funnel" aria-label="三層抽查：必讀格、分層隨機抽樣、升級"><ol>{tiers}</ol><figcaption>{esc(au["tradeoff"])}</figcaption></figure>'
                 f'<div class="audit-detail">{detail}</div></div></div>')
        evaluation = f'<div class="eng-part"><h3>評估：{esc(au["title"])}</h3>{audit}{ev}{note}</div>'
    rag = ''
    rf = e.get('rag_flow')
    if rf:
        cols = ''.join(f'<li class="rag-step"><span class="rag-no">{i+1:02d}</span><h4>{esc(n)}</h4><ul>' + ''.join(f'<li{" class=mono" if ("CITATIONS" in x or x.startswith("[")) else ""}>{esc(x)}</li>' for x in items) + f'</ul><p>{esc(sub)}</p></li>' for i,(n,items,sub) in enumerate(rf['columns']))
        rag = f'<div class="eng-part" id="rag-flow"><h3>{esc(rf["title"])}</h3><figure class="rag-flow" aria-label="{esc(rf["title"],quote=True)}"><ol>{cols}</ol><figcaption>{esc(rf["caption"])}</figcaption></figure></div>'
    legend = ''.join(f'<span data-kind="{k}">{v}</span>' for k,v in KIND.items())
    return f'''<section class="eng-block" id="engineering" aria-labelledby="eng-title"><p class="eyeline">ENGINEERING REVIEW</p><h2 id="eng-title">工程細節</h2>
<div class="eng-grid"><div class="eng-card"><h3>問題與限制</h3><ul class="eng-list">{cons}</ul></div><div class="eng-card eng-outcome"><h3>{outcome_title}</h3><ul class="claim-list">{claims}</ul></div></div>
<div class="eng-part"><div class="eng-part-head"><h3>架構：模型、程式與人手的分工</h3><div class="pipe-legend" aria-hidden="true">{legend}</div></div><ol class="pipe">{pipe}</ol></div>
{rag}
{cost_block(e)}
<div class="eng-part"><h3>關鍵決定與取捨</h3><ul class="decisions">{dec}</ul></div>
{evaluation}
<div class="eng-part"><h3>失敗情況與防護</h3><div class="fail-wrap"><table class="fail-table"><thead><tr><th scope="col">可能出錯</th><th scope="col">防護</th></tr></thead><tbody>{fail}</tbody></table></div></div>
{code_panel(e.get('code'))}</section>'''


def case_page(p, idx):
    path = '../../'
    widget = p.get('widget')
    children = [project_by_id[s] for s in p.get('modules', [])]
    steps = [s.split('｜',1) for s in p['steps']]
    steps_html = ''.join(f'<li><h3>{esc(title)}</h3><p>{esc(desc)}</p></li>' for title,desc in steps)
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
    if p['id'] == 'autocut':
        supplementary = f'<section id="render" class="render-section"><h2>真實發佈短片</h2>{supplementary}</section>'
    module_html = modules_section(p, children, path) if children else ''
    related = ''
    if p.get('related'):
        links = ''.join(f'<a href="../{module["id"]}/"><strong>{esc(module["title"])}</strong><span>{esc(module["intro"])}</span></a>' for module in (project_by_id[slug] for slug in p['related']))
        related += f'<section class="related-tools"><h2>相關工具</h2>{links}</section>'
    neighbour = next(projects[(idx+offset)%len(projects)] for offset in range(1, len(projects)) if not projects[(idx+offset)%len(projects)].get('parent'))
    first_jump = '<a class="main-btn" href="#demo">前往互動示範 ↓</a>' if widget else '<a class="main-btn" href="#method">查看實作流程 ↓</a>'
    if p['id'] in inspection and not widget:
        first_jump = '<a class="main-btn" href="#demo">打開輸出紀錄 ↓</a>'
    if p['id'] == 'autocut':
        first_jump = '<a class="main-btn" href="#render">播放成片片段</a><a class="soft-btn" href="#demo">操作時間軸</a>'
    if ENGINEERING.get(p['id'], {}).get('rag_flow'):
        first_jump += '<a class="soft-btn" href="#rag-flow">接地與引用流程 ↓</a>'
    if children:
        first_jump += f'<a class="soft-btn" href="#modules">{len(children)+1} 個組成模組 ↓</a>'
    prev = f'<a href="{path}#work" data-back>← 全部作品</a>'
    body = f'''<main id="main" class="case-body frame"><div class="case-crumb">{prev}<span>／ {p["group"]}</span></div>
<section class="case-heading"><div><p class="eyeline">{p['group']} · {'互動個案' if widget else '作品個案'}</p><h1>{esc(p["title"])}</h1><p>{esc(p["intro"])}</p><div class="case-actions">{first_jump}</div></div>
<div class="exhibit">{art(p,path,detail=True)}<div class="case-outcome"><span>交付成果</span><strong>{esc(p['result'])}</strong></div></div></section>
<div class="reading-shell"><section id="method" class="method"><p class="eyeline">ENGINEERING NOTES</p><h2>我怎樣做</h2><p class="case-context">{esc(p['detail'])}</p>
<ol class="build-steps">{steps_html}</ol><ul class="tech-pills" aria-label="技術與工具">{chips}</ul></section>
{eng_block(p['id'])}{supplementary}{fragment}{module_html}{related}<nav class="next-case" aria-label="瀏覽其他作品">{prev}<a href="../{neighbour['id']}/">下一件 · {esc(neighbour['title'])} →</a></nav></div></main>'''
    return page(p['title']+'｜Gary Tang AI Engineer',p['intro'],path,body,widgets,case_href(p),ids=[p['id'],*(c['id'] for c in children)])


def redirect_page(c):
    parent = project_by_id[c['parent']]
    target = f'../{parent["id"]}/#{c["id"]}'
    demo_anchor = f'#{c["id"]}-demo' if c.get('widget') else (f'#{c["id"]}-output' if c['id'] in inspection else f'#{c["id"]}')
    # Old deep links: #demo maps to the module's demo; widget-internal ids keep working because the parent page carries the same widget markup.
    script = f'<script>(function(){{var h=location.hash,b="../{parent["id"]}/";if(h==="#demo")h="{demo_anchor}";else if(!h||h==="#method"||h==="#evidence")h="#{c["id"]}";location.replace(b+h)}})()</script>'
    head = f'<meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url={target}">{script}'
    body = f'<main id="main" class="case-body frame child-redirect"><p class="eyeline">已合併為組成模組</p><h1>{esc(c["title"])}</h1><p>這個工具現在是「{esc(parent["title"])}」的一個組成模組。</p><p><a class="main-btn" href="{target}">前往 {esc(parent["title"])} · {esc(c["title"])} →</a></p></main>'
    return page(c['title']+'｜Gary Tang AI Engineer', c['intro'], '../../', body, canonical=case_href(parent), head_extra=head, plain=True)


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
