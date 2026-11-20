"""Small vector diagrams for the public project index. All geometry is illustrative."""
from html import escape
from math import cos, exp, pi, sin


def waveform():
    bars = []
    for i in range(93):
        x = 14 + i * 4.6
        envelope = .12 + sum(a * exp(-((i - c) / w) ** 2) for c, w, a in [(15, 8, .63), (35, 5, 1), (60, 10, .78), (77, 4, .46)])
        half = 4 + 43 * envelope * (.23 + .77 * abs(sin(i * 2.43 + cos(i))))
        bars.append(f'<path d="M{x:.1f} {74-half:.1f}v{2*half:.1f}" stroke-width="2.2" stroke-linecap="round"/>')
    return ''.join(bars)


def rect(x, y, w, h, radius=4, **attrs):
    extra = ' '.join(f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" {extra}/>'


def label(x, y, value, size=11):
    return f'<text x="{x}" y="{y}" font-family="monospace" font-size="{size}" fill="#dcebf2" stroke="none">{escape(value)}</text>'


def diagram(kind, uid):
    g = f'url(#{uid}-ink)'
    pale = '#ecd4a6'
    muted = '#7191a4'
    part = []
    if kind in ('minutes', 'audio', 'ledger'):
        part = [waveform(), rect(266, 15, 56, 111, fill='#c6e8ff16'), label(17, 137, 'REC / 18:32'), label(319, 137, '19:06')]
        if kind == 'ledger':
            part += [rect(144, 92, 164, 25, fill='#122b35'), label(156, 109, 'SOURCE  =  DRAFT')]
    elif kind in ('timeline','frames','schedule'):
        rows = {'timeline':[(40,103,72),(72,65,148),(28,130,96)],'frames':[(74,91,85),(99,62,129),(81,104,63)],'schedule':[(121,52,86),(47,117,61),(63,72,91)]}[kind]
        for i, row in enumerate(rows):
            x = 90
            y = 34 + 31*i
            part += [label(18,y+14,['VIDEO','AUDIO','CUES'][i] if kind=='timeline' else ['TRACK A','TRACK B','TRACK C'][i])]
            for j, length in enumerate(row):
                part.append(rect(x,y,length,19,3,fill=['#476b80','#aba587','#66798d'][(i+j)%3],stroke='none'))
                x += length + 6
        part += ['<path d="M236 20v104" stroke="#fff1c8"/><path d="m231 19 5 7 5-7z" fill="#fff1c8"/>',label(22,139,'00:00'),label(378,139,'TIME')]
    elif kind in ('cad','detail','layers'):
        for i in range(3 if kind=='layers' else 2):
            y = 39+i*20
            part.append(f'<path d="m80 {y+19} 140 -37 137 43 -142 37z" fill="#24394a" stroke="{pale if i==0 else muted}"/>')
        for x,y in [(140,51),(190,37),(235,43),(274,55),(213,70)]:
            part.append(f'<path d="m{x} {y} 0 37 m-5 -37 h10" stroke="{pale}"/>')
        part += ['<path d="m45 96 142 42m-145 -46 6 9m136 31 6 10" fill="none"/>', label(303,128,{'cad':'DXF / DWG','detail':'CHECK','layers':'PHASE'}[kind])]
    elif kind in ('meter','assessment'):
        lengths = [220,52] if kind=='meter' else [183,249,100,149,78]
        for i,w in enumerate(lengths):
            y = (43+i*35) if kind=='meter' else (24+i*23)
            part += [label(20,y+10,(['BEFORE','AFTER'][i] if kind=='meter' else f'0{i+1}')),rect(92,y,280,11,2,fill='#294050',stroke='none'),rect(92,y,w,11,2,fill=g,stroke='none')]
        if kind=='meter': part.append(label(95,128,'1,800  /  400 TOKENS'))
    elif kind in ('formula','markup','pages','brief','review','web'):
        for i in range(2):
            part.append(rect(74-i*8,19+i*8,280,102,6,fill='#162534',stroke=muted))
        part.append(rect(54,34,292,103,6,fill='#1c3040',stroke=g))
        part += [label(70,57,{'formula':'fx  /  Workbook','markup':'PDF  /  Markup','pages':'Pages  /  Index','brief':'Brief  /  Summary','review':'Review  /  Decisions','web':'Portfolio  /  Cases'}[kind],13)]
        for i in range(3):
            y=71+16*i
            part += [rect(72,y,18 if kind=='markup' else 50,5,1,fill=pale if i==1 else muted,stroke='none'),rect(136,y,103+24*(i%2),5,1,fill=muted,stroke='none')]
        if kind=='markup': part.append(rect(128,82,157,15,1,fill='none',stroke=pale))
        if kind=='formula': part.append(label(255,94,'=SUM()',13))
    else:
        names={'queue':['FILES','MATCH','READY'],'sync':['DATA','BUILD','DEPLOY'],'routing':['EVENT','RULE','REPLY']}
        for i,name in enumerate(names.get(kind,['INPUT','CHECK','EXPORT'])):
            x=23+143*i
            part += [rect(x,52,106,43,8,fill='#203541',stroke=pale if i==2 else muted),label(x+14,79,name,14)]
            if i<2: part.append(f'<path d="M{x+106} 73h33m-6 -5 6 5-6 5" fill="none"/>')
    return f'<svg class="art-diagram" viewBox="0 0 450 150" preserveAspectRatio="xMidYMid meet" focusable="false" aria-hidden="true"><defs><linearGradient id="{uid}-ink" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="450" y2="0"><stop stop-color="#8bcce9"/><stop offset=".55" stop-color="#c0e4eb"/><stop offset="1" stop-color="#f3c78d"/></linearGradient></defs><g stroke="{g}" fill="none">{"".join(part)}</g></svg>'


IMAGES = {
    'product': ('togoalai-live.webp', 'screen'),
    'model': ('els-tour-preview.webp', 'model'),
    'sheet': ('pdf-page-1.webp', 'sheet'),
    'document': ('complex-pdf-guide.svg', 'document')
}


def art(project, path, uid):
    kind = project['visual']
    if kind in IMAGES:
        image, style = IMAGES[kind]
        graphic = f'<div class="art-window {style}"><img src="{path}assets/{image}" loading="lazy" decoding="async" alt=""></div>'
    else:
        graphic = diagram(kind, uid)
    return f'<div class="case-art art-{kind}" aria-hidden="true"><div class="art-paper">{graphic}</div><span class="art-cap">{escape(project["caption"])}</span></div>'
