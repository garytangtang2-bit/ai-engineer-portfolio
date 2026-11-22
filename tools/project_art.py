"""Render outcome evidence and full-size detail previews."""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = json.loads((ROOT / 'content/work-images.json').read_text(encoding='utf-8'))


def ratio(slug):
    # The frame takes the image's own aspect ratio, so media always fills it (no letterbox, no crop).
    from PIL import Image
    with Image.open(ROOT / 'assets/work' / f'{slug}.webp') as im:
        w, h = im.size
    return w, h


def art(project, path, detail=False):
    proof = project.get('proof', 'none')
    if proof == 'none' or (proof == 'detail' and not detail):
        return ''
    slug = project['id']
    label, caption, alt = map(escape, SOURCES[slug])
    base = f'{path}assets/work/{slug}'
    if not detail:
        reel = ROOT / 'assets/work' / f'{slug}-reel.mp4'
        if reel.is_file():
            # Muted highlight loop: poster first, played on hover or when scrolled into view (never under reduced motion).
            return f'''<figure class="proof-card"><div class="proof-mount is-motion"><img src="{base}-small.webp" loading="lazy" decoding="async" alt="{alt}"><video data-reel muted loop playsinline preload="none" aria-hidden="true" tabindex="-1" poster="{base}-small.webp"><source src="{base}-reel.webm" type="video/webm"><source src="{base}-reel.mp4" type="video/mp4"></video></div><figcaption>{label}</figcaption></figure>'''
        return f'''<figure class="proof-card"><div class="proof-mount"><img src="{base}-small.webp" loading="lazy" decoding="async" alt="{alt}"></div><figcaption>{label}</figcaption></figure>'''
    reel = ROOT / 'assets/work' / f'{slug}-reel.mp4'
    if reel.is_file():
        # Case hero plays the highlight itself: large, muted, looping while in view; the poster is the fallback.
        return f'''<figure class="proof-case is-reel" id="evidence"><div class="proof-mount is-motion"><video data-reel="view" muted loop playsinline preload="metadata" poster="{base}-poster.webp" aria-label="{alt}"><source src="{base}-reel.webm" type="video/webm"><source src="{base}-reel.mp4" type="video/mp4"></video><button type="button" class="reel-toggle" aria-pressed="false">暫停片段</button></div><figcaption><b>{label}</b>{caption}</figcaption></figure>'''
    w, h = ratio(slug)
    return f'''<figure class="proof-case" id="evidence"><a class="proof-open" href="{base}.webp" aria-label="放大圖片：{alt}">
<div class="proof-mount" style="--ar:{w}/{h};--ratio:{w/h:.4f}"><img src="{base}.webp" width="{w}" height="{h}" alt="{alt}"></div>
<span class="proof-zoom" aria-hidden="true">放大圖片</span></a><figcaption><b>{label}</b>{caption}</figcaption></figure>
<dialog class="proof-viewer" aria-label="作品實物圖"><div class="proof-toolbar"><button type="button" class="proof-scale" aria-pressed="false">原始尺寸</button><button type="button" class="proof-close" autofocus>關閉 ×</button></div><div class="proof-scroll" role="region" aria-label="圖片，可捲動" tabindex="0"><img alt="{alt}"></div><p>{caption}</p></dialog>'''
