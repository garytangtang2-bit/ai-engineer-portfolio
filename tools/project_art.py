"""Render the real artifact associated with each portfolio project."""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = json.loads((ROOT / 'content/work-images.json').read_text(encoding='utf-8'))
INTERFACES = json.loads((ROOT / 'content/interface-images.json').read_text(encoding='utf-8'))


def art(project, path, detail=False):
    slug = project['id']
    modern = slug in INTERFACES
    label, caption, alt = map(escape, INTERFACES.get(slug, SOURCES[slug]))
    base = f'{path}assets/{"interfaces" if modern else "work"}/{slug}'
    source = ''
    if modern and detail:
        source_label = '查看成績頁原圖' if slug == 'togoal' else '查看原版實物圖'
        source = f'<a class="proof-source" href="{path}assets/work/{slug}.webp">{source_label} ↗</a>'
        if slug == 'meeting':
            source = f'<a class="proof-source" href="{path}assets/interfaces/meeting-desktop.webp">新版 Windows 介面 ↗</a>' + source
    if not detail:
        return f'''<figure class="proof-card{' interface-card' if modern else ''}"><div class="proof-mount"><img src="{base}-small.webp" loading="lazy" decoding="async" alt="{alt}"></div><figcaption>{label}</figcaption></figure>'''
    return f'''<figure class="proof-case" id="evidence"><a class="proof-open" href="{base}.webp" aria-label="放大圖片：{alt}">
<div class="proof-mount"><img src="{base}.webp" alt="{alt}"></div>
<span class="proof-zoom" aria-hidden="true">⤢　放大圖片</span></a><figcaption><b>{label}</b>{caption}{f'<div class="proof-sources">{source}</div>' if source else ''}</figcaption></figure>
<dialog class="proof-viewer" aria-label="作品實物圖"><div class="proof-toolbar"><button type="button" class="proof-scale" aria-pressed="false">原始尺寸</button><button type="button" class="proof-close" autofocus>關閉 ×</button></div><div class="proof-scroll" role="region" aria-label="圖片，可捲動" tabindex="0"><img alt="{alt}"></div><p>{caption}</p></dialog>'''
