"""Render the real artifact associated with each portfolio project."""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = json.loads((ROOT / 'content/work-images.json').read_text(encoding='utf-8'))


def art(project, path, detail=False):
    slug = project['id']
    label, caption, alt = map(escape, SOURCES[slug])
    base = f'{path}assets/work/{slug}'
    if not detail:
        return f'''<figure class="proof-card"><div class="proof-mount"><img src="{base}-small.webp" loading="lazy" decoding="async" alt="{alt}"></div><figcaption>{label}</figcaption></figure>'''
    return f'''<figure class="proof-case" id="evidence"><a class="proof-open" href="{base}.webp" aria-label="放大圖片：{alt}">
<div class="proof-mount"><img src="{base}.webp" alt="{alt}"></div>
<span class="proof-zoom" aria-hidden="true">⤢　放大圖片</span></a><figcaption><b>{label}</b>{caption}</figcaption></figure>
<dialog class="proof-viewer" aria-label="作品實物圖"><div class="proof-toolbar"><button type="button" class="proof-scale" aria-pressed="false">原始尺寸</button><button type="button" class="proof-close" autofocus>關閉 ×</button></div><div class="proof-scroll" role="region" aria-label="圖片，可捲動" tabindex="0"><img alt="{alt}"></div><p>{caption}</p></dialog>'''
