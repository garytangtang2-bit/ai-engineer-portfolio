"""Regenerate the static home and project pages with Python 3."""
import json
from html import escape as esc
from pathlib import Path

from project_art import art

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content'
SITE = 'https://garytangtang2-bit.github.io/ai-engineer-portfolio/'
projects = json.loads((CONTENT / 'projects.json').read_text(encoding='utf-8'))
groups = list(dict.fromkeys(p['group'] for p in projects))
pdf_name = 'assets/Gary-Tang-CV.pdf'


def intro_film(path):
    video = ROOT/'assets'/'introduction.mp4'
    if not video.is_file():
        return ''
    subtitle = ROOT/'assets'/'introduction.zh-Hant.vtt'
    track = f'<track kind="captions" src="{path}assets/{subtitle.name}" srclang="zh-Hant" label="繁體中文" default>' if subtitle.is_file() else ''
    return f'<video class="intro-film" controls playsinline preload="none" aria-label="Gary 以 AutoCut 製作的自我介紹" src="{path}assets/{video.name}">{track}</video>'


def page(title, description, path, body, widget=None, canonical=''):
    widget_css = ''.join(f'<link rel="stylesheet" href="{path}{sheet}.css">' for sheet in ('styles','presentation')) if widget else ''
    widget_js = f'<script type="module" src="{path}widgets/{widget}.mjs"></script>' if widget else ''
    return f'''<!doctype html>
<html lang="zh-Hant-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(description, quote=True)}"><meta name="theme-color" content="#0b1118"><link rel="canonical" href="{SITE}{canonical}">
{widget_css}<link rel="stylesheet" href="{path}gallery.css"><script type="module" src="{path}gallery.js"></script>{widget_js}</head>
<body class="gallery-body"><a class="jump-main" href="#main">跳至主要內容</a>
<header class="mast"><div class="frame mast-bar"><a class="signature" href="{path or './'}"><span aria-hidden="true" class="sig-mark">gt</span><span>Gary Tang</span></a>
<nav aria-label="網站導覽"><a href="{path}#work">作品</a><a href="{path}#about">關於</a><a class="cv-link" href="{path}{pdf_name}">履歷 PDF <span aria-hidden="true">↗</span></a></nav></div></header>
{body}
<footer class="folio-footer frame" id="contact"><div><h2>聯絡 Gary</h2><p>履歷內附電郵及電話，歡迎聯絡我面談。</p></div><a class="main-btn" href="{path}{pdf_name}">開啟履歷及聯絡資料 <span aria-hidden="true">↗</span></a></footer>
</body></html>'''


def case_href(p):
    return f'projects/{p["id"]}/'


def tile(p):
    more = '互動示範' if p.get('widget') else '個案介紹'
    return f'''<a class="work-tile" data-group="{p['group']}" data-stack="{esc(' '.join(p['stack']),quote=True)}" data-reactive href="{case_href(p)}">
{art(p,'')}
<div class="tile-info"><div class="tile-meta"><span>{p['group']}</span><span>{more}</span></div><h3>{esc(p['title'])}</h3><p>{esc(p['intro'])}</p>
<div class="tile-result"><strong>{esc(p['result'])}</strong><span class="arrow-disc" aria-hidden="true">↗</span></div></div></a>'''


def home():
    filters = ''.join(f'<button type="button" data-filter="{g}" aria-pressed="{str(g=="全部").lower()}">{g}</button>' for g in ['全部', *groups])
    cards = '\n'.join(tile(p) for p in projects)
    body = f'''<main id="main" data-home><div class="hero-stage"><canvas class="particle-field" aria-hidden="true"></canvas><section id="home" class="frame landing">
<div class="hero-type"><p class="eyeline"><span class="tone-dot"></span> AI ENGINEER <span class="role-city">／ 香港</span></p>
<h1>鄧嘉維<span lang="en">Gary Tang</span></h1><p class="hero-statement">我用 AI，把數小時的工作縮到幾分鐘。</p>
<div class="hero-actions"><a class="main-btn" href="#work">瀏覽全部作品 <span aria-hidden="true">↓</span></a><a class="soft-btn" href="{pdf_name}">履歷及聯絡 <span aria-hidden="true">↗</span></a></div></div>
<p class="particle-hint" hidden aria-hidden="true"><i></i><span>移動滑鼠，撥開粒子</span><span>輕觸光帶，撥開粒子</span></p></section></div>
<div class="frame metric-rail" aria-label="主要成果"><a href="projects/meeting/" aria-label="會議紀錄，省時約 70%"><span>會議紀錄省時約</span><strong><b data-counter style="font-weight:inherit">70</b><small>%</small></strong></a>
<a href="projects/pdf/"><span>PDF 還原 Excel</span><strong>16<small> 小時</small><i>→</i>30<small> 分鐘</small></strong></a>
<a href="projects/togoal/"><span>ToGoalAi 學習平台</span><strong class="ship-stat">獨立開發上線</strong></a></div>
<section class="frame feature-band" aria-labelledby="feature-title"><div class="feature-copy"><p class="eyeline">精選個案 ／ 工作流程</p><h2 id="feature-title">把重聽會議的時間，<br>留給需要判斷的事。</h2><p>以前同事要重聽整場，再寫英文紀錄。我將轉錄、答疑和匯出串成同一個流程。一場 90 分鐘的會議，人手覆核約 10 分鐘。</p><a href="projects/meeting/#demo">試做一次會議答疑 <span aria-hidden="true">↗</span></a></div>
<div class="instrument" data-reactive><div class="instrument-top"><span class="tiny-led"></span><strong>會議紀錄助手</strong><span>合成節錄</span></div>
<div class="signal-scope"><a href="projects/meeting/#evidence"><img src="assets/work/meeting-small.webp" alt="查看會議助手原視窗及英文草稿" loading="lazy" width="680" height="400"></a></div><div class="transcript" aria-live="polite" aria-atomic="true"><span class="transcript-kicker" id="snippet-label">原始錄音 · 19:06</span><p id="snippet-text">「下星期……四？再確認。」</p></div>
<div class="instrument-rail" role="group" aria-label="會議紀錄示例步驟"><button type="button" aria-pressed="true" data-snippet="0">原句</button><button type="button" aria-pressed="false" data-snippet="1">答疑</button><button type="button" aria-pressed="false" data-snippet="2">交付</button></div></div></section>
<section class="frame catalogue" id="work"><div class="section-line"><div><p class="eyeline">PROJECT INDEX</p><h2>作品目錄</h2></div><span class="index-count" aria-live="polite" id="result-count">{len(projects)} 件作品</span></div>
<div class="index-controls" hidden><div class="index-filters" role="group" aria-label="按作品類別篩選">{filters}</div><label class="index-search"><span aria-hidden="true">⌕</span><input type="search" id="catalogue-search" aria-label="搜尋作品或技術" placeholder="搜尋作品或技術" maxlength="80"></label></div>
<div class="work-grid">{cards}</div><div class="no-matches" hidden><p>找不到符合這些條件的作品。</p><button type="button" id="clear-index">顯示全部作品</button></div><a class="index-return" href="#work" hidden>↑ 返回篩選</a></section>
<section class="about-band" id="about"><div class="frame about-grid"><div class="profile"><img loading="lazy" src="assets/gary-tang.webp" alt="鄧嘉維" width="180" height="220"><div><p class="eyeline">ABOUT GARY</p><h2>關於我</h2><p>鄧嘉維 · Tang Ka Wai, Gary</p></div></div>
<div class="bio"><h3>從工作現場開始設計</h3><p>我先跟同事走一次原流程，找出重複工作、需要理解的內容，以及必須由人決定的地方。規則交給程式，語意交給模型，有疑點就連同來源交人覆核。</p>
<div class="stack-marks" aria-label="常用技術">{''.join(f'<span><img src="assets/logos/{logo}.svg" alt="" width="19" height="19" loading="lazy">{name}</span>' for logo,name in [('python','Python'),('javascript','JavaScript'),('threedotjs','Three.js'),('github','GitHub')])}</div>{intro_film('')}
<dl><div><dt>開發與維護</dt><dd>獨立開發及維護網站與手機 App。熟悉 Python、JavaScript、Three.js，日常使用 Claude Code 和 Codex。</dd></div>
<div><dt>AI 與部署</dt><dd>RAG、n8n、AI Skills、API 整合、Supabase、GitHub、Vercel。</dd></div>
<div><dt>工作經歷</dt><dd>2026.09 至今 · Kin Wing Engineering Co. Ltd<br>Assistant AI and design Administrator，設計部。</dd></div>
<div><dt>學歷與證書</dt><dd>國立政治大學公共行政學系，2026.06 畢業。經 HKCAAVQ 評估等同香港榮譽學士學位。持有 Claude 101、AI Fluency 證書。</dd></div></dl></div></div></section></main>'''
    return page('鄧嘉維 Gary Tang｜AI Engineer 作品集','實試粵語會議紀錄、核對兩萬格 Excel，了解 Gary 從零獨立開發 ToGoalAi 的過程。','',body)


def case_page(p, idx):
    path = '../../'
    widget = p.get('widget')
    steps = [s.split('｜',1) for s in p['steps']]
    steps_html = ''.join(f'<li><h3>{esc(title)}</h3><p>{esc(desc)}</p></li>' for title,desc in steps)
    chips = ''.join(f'<li>{esc(v)}</li>' for v in p['stack'])
    fragment = ''
    if widget:
        symbols = (CONTENT/'symbols.html').read_text(encoding='utf-8')
        fragment = (CONTENT/'widgets'/f'{widget}.html').read_text(encoding='utf-8')
        fragment = f'{symbols}<section class="case-demo" id="demo"><p class="eyeline">INTERACTIVE</p><h2>親手試用</h2><div class="demo-content">{fragment}</div></section>'
    supplementary = ''
    if p['id']=='autocut':
        supplementary = intro_film(path) or '<aside class="film-note"><strong>自我介紹短片 · 籌備中</strong><p>我會用這套 AutoCut Skills 製作自己的求職短片。現階段可操作上面的合成時間軸。</p></aside>'
    neighbour = projects[(idx+1)%len(projects)]
    first_jump = '<a class="main-btn" href="#demo">前往互動示範 ↓</a>' if widget else '<a class="main-btn" href="#method">查看實作流程 ↓</a>'
    prev = f'<a href="{path}#work" data-back>← 全部作品</a>'
    body = f'''<main id="main" class="case-body frame"><div class="case-crumb">{prev}<span>／ {p["group"]}</span></div>
<section class="case-heading"><div><p class="eyeline">{p['group']} · {'互動個案' if widget else '作品個案'}</p><h1>{esc(p["title"])}</h1><p>{esc(p["intro"])}</p><div class="case-actions">{first_jump}</div></div>
<div class="exhibit">{art(p,path,detail=True)}<div class="case-outcome"><span>交付成果</span><strong>{esc(p['result'])}</strong></div></div></section>
<div class="reading-shell"><section id="method" class="method"><p class="eyeline">ENGINEERING NOTES</p><h2>我怎樣做</h2><p class="case-context">{esc(p['detail'])}</p>
<ol class="build-steps">{steps_html}</ol><ul class="tech-pills" aria-label="技術與工具">{chips}</ul></section>
{fragment}{supplementary}<nav class="next-case" aria-label="瀏覽其他作品">{prev}<a href="../{neighbour['id']}/">下一件 · {esc(neighbour['title'])} →</a></nav></div></main>'''
    return page(p['title']+'｜Gary Tang AI Engineer',p['intro'],path,body,widget,case_href(p))


if __name__ == '__main__':
    assert len({p['id'] for p in projects}) == len(projects)
    (ROOT/'index.html').write_text(home(),encoding='utf-8')
    for idx, project in enumerate(projects):
        folder = ROOT/case_href(project)
        folder.mkdir(parents=True,exist_ok=True)
        (folder/'index.html').write_text(case_page(project,idx),encoding='utf-8')
    print(f'Built home and {len(projects)} project pages.')
