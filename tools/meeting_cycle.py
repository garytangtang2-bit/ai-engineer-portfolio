"""Design-meeting cycle timeline (the whole workflow around the minutes assistant).

Rendered as inline SVG for the meeting case page and used to regenerate the
meeting card image. Stages are cycle-relative (no real dates or meeting numbers);
people are roles only.
"""
from html import escape

TITLE = '設計會議循環時間線'
STATUS = '完整工作流（建構中）'
INTRO = ('由一次設計會議到下一次：撰寫紀錄、提醒講者、索價、整理 Agenda 及 Sharing PDF，再寄出通知。'
         '目前只有「本機轉錄及撰寫英文 Minutes」已在設計部使用；其餘節點是正在建構的流程設計。')

LANES = {  # key: (legend, fill, stroke, dashed)
    # Fills carry the lane colour (readable at a glance); text stays light on every tint.
    'ai':    ('AI', '#1e3a6e', '#8fb8ff', False),
    'me':    ('我', '#3a2f6b', '#b3a2f7', False),
    'eng':   ('工程師', '#14485a', '#9fd8e8', False),
    'boss':  ('上司', '#4d4026', '#d9c39a', False),
    'code':  ('程式', '#262c38', 'rgba(220,230,245,.55)', False),
    'mile':  ('會議及截止', '#3a4150', 'rgba(220,230,245,.6)', False),
    'tbd':   ('待確認步驟', 'rgba(255,255,255,.02)', 'rgba(200,212,232,.5)', True),
}

# (label, sub-label); sub-columns per stage
STAGES = [
    ('開會日', '第 N 次開會', 1),
    ('會後第 1 天', '會後工作開始', 2),
    ('會後第 8 天', '核對提醒草稿', 1),
    ('會後第 10 天', '寄提醒及索價', 1),
    ('收到即處理', '上司、採購及講者可提早交件', 4),
    ('開會前一天 13:00', '交件截止', 1),
    ('開會前一天 14:00', '備妥兩份 PDF，人手核對後寄出', 2),
    ('下次開會', '第 N+1 次開會', 1),
]

# id: (stage, sub, y, lane, lines, note)
NODES = {
    'n1': (0, 0, 96, 'mile', ['第 N 次', '開會'], ''),
    'a1': (1, 0, 86, 'ai', ['本機轉錄', '及查漏', '撰寫英文', 'Minutes'], '使用中'),
    'a2': (1, 1, 146, 'ai', ['AI 輸出', 'Excel 並上傳，', '通知上司', '及 CC 同事'], ''),
    'm1': (1, 0, 228, 'me', ['人工剪片'], ''),
    'p1': (1, 0, 316, 'code', ['接收剪好', '的影片'], ''),
    'p2': (1, 1, 268, 'code', ['配對講者', '及題目', '核實當場出席', '準備 KM 及', 'OA 文件'], ''),
    'p3': (1, 0, 404, 'code', ['寄第 N+1 次', '留位邀請'], ''),
    'm2': (2, 0, 330, 'me', ['核對及批准', '會前電郵草稿'], ''),
    'g1': (3, 0, 176, 'tbd', ['寄索價電郵，', '開始下載', '統計處', '（C&SD）', '資料'], ''),
    'p4': (3, 0, 262, 'code', ['向今次講者發', 'Sharing', '資料提醒'], ''),
    'p5': (3, 0, 380, 'code', ['寄開會及', 'Submission', '提醒', 'Sharing 題目', '按適用場次'], ''),
    'b1': (4, 0, 78, 'boss', ['上司用桌面', 'Excel 核對，', '交回', 'Agenda 及', 'Submission', 'Summary'], ''),
    'p6': (4, 2, 82, 'code', ['Excel 開齊', '兩檔重算', '05 Design', 'status；', '有缺項先核對'], ''),
    'g2': (4, 0, 186, 'tbd', ['採購照舊', '回覆電郵'], ''),
    'g3': (4, 1, 212, 'tbd', ['配對當場回覆', '保留原信', '及附件'], ''),
    'g4': (4, 2, 182, 'tbd', ['報價回覆及', '統計處工資', 'PDF 齊備'], ''),
    'g5': (4, 3, 212, 'tbd', ['將報價及', '統計處資料', '寫入 Agenda', 'Excel'], ''),
    'e1': (4, 0, 324, 'eng', ['講者拖入自己', '的 PDF 或', 'PowerPoint'], ''),
    'p7': (4, 1, 322, 'code', ['PowerPoint', '轉 PDF，', '檢查每位講者', '已交齊'], ''),
    'p8': (4, 2, 300, 'code', ['按次序合併', '加封面及頁碼'], ''),
    'm5': (5, 0, 396, 'mile', ['Submission', 'Summary 及', 'Sharing 資料', '截止'], ''),
    'p9': (6, 0, 90, 'code', ['備妥', 'Agenda PDF'], ''),
    'p10': (6, 0, 268, 'code', ['備妥合併', 'Sharing', 'PDF'], ''),
    'm3': (6, 0, 346, 'me', ['確認 Teams', '開會連結'], ''),
    'm4': (6, 1, 176, 'me', ['核對收件人、', '兩份 PDF 及', 'Teams 連結，', '再按寄出'], ''),
    'n2': (7, 0, 192, 'mile', ['第 N+1 次', '開會'], ''),
}

# (from, to, bend) bend: 'src' turns right after the source, 'dst' just before the target, 'down' vertical
EDGES = [
    ('n1', 'a1', 'src'), ('n1', 'm1', 'src'), ('n1', 'p3', 'src'),
    ('a1', 'a2', 'dst'), ('a2', 'b1', 'src'), ('m1', 'p1', 'down'), ('p1', 'p2', 'dst'),
    ('m2', 'g1', 'src'), ('m2', 'p4', 'src'), ('m2', 'p5', 'src'),
    ('b1', 'p6', 'dst'), ('g1', 'g2', 'dst'), ('g2', 'g3', 'dst'), ('g3', 'g4', 'dst'), ('g4', 'g5', 'dst'),
    ('p4', 'e1', 'dst'), ('e1', 'p7', 'dst'), ('p7', 'p8', 'dst'),
    ('p6', 'p9', 'dst'), ('g5', 'p9', 'dst'), ('p8', 'p10', 'dst'),
    ('p9', 'm4', 'dst'), ('p10', 'm4', 'dst'), ('m3', 'm4', 'dst'), ('m4', 'n2', 'dst'),
]

NW, SUB, PAD, TOP, LH, FS = 100, 108, 8, 2, 19, 14
KY, GAP = 1.3, 16   # vertical stretch of the hand-placed y values; minimum gap between boxes in one column
HEAD = 64


def _layout():
    xs, x = [], 0
    for _, _, n in STAGES:
        xs.append(x)
        x += n * SUB + 2 * PAD - 10
    width = x
    boxes, bottom = {}, {}
    for k, (st, sub, y, lane, lines, note) in sorted(NODES.items(), key=lambda kv: kv[1][2]):
        bx = xs[st] + PAD + sub * SUB
        h = 14 + len(lines) * LH
        by = max(TOP + round(y * KY), bottom.get((st, sub), 0) + GAP)
        boxes[k] = (bx, by, NW, h)
        bottom[(st, sub)] = by + h
    return xs, width, boxes


def svg():
    xs, W, boxes = _layout()
    loop_y = max(y + h for _, y, _, h in boxes.values()) + 34
    H = loop_y + 40
    o = [f'<svg class="cycle-svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="cycle-svg-title" xmlns="http://www.w3.org/2000/svg">',
         f'<title id="cycle-svg-title">{TITLE}：由第 N 次開會到第 N+1 次開會的節點及先後次序，下方附清單版本</title>',
         '<defs><marker id="cyc-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 8 4 0 8z" fill="#9fb0cc"/></marker></defs>']
    # stage headers and dividers
    for i, (lab, sub, n) in enumerate(STAGES):
        x0 = xs[i]
        o.append(f'<text class="cy-stage" x="{x0 + PAD}" y="24">{escape(lab)}</text><text class="cy-sub" x="{x0 + PAD}" y="44">{escape(sub)}</text>')
        if i:
            o.append(f'<line class="cy-div" x1="{x0}" y1="8" x2="{x0}" y2="{loop_y - 14}"/>')
    o.append(f'<line class="cy-rule" x1="0" y1="{HEAD - 4}" x2="{W}" y2="{HEAD - 4}"/>')
    # edges
    def port(k, side):
        x, y, w, h = boxes[k]
        return {'r': (x + w, y + h / 2), 'l': (x, y + h / 2), 'b': (x + w / 2, y + h), 't': (x + w / 2, y)}[side]
    for a, b, bend in EDGES:
        if bend == 'down':
            (x1, y1), (x2, y2) = port(a, 'b'), port(b, 't')
            d = f'M{x1:.0f} {y1:.0f} V{y2:.0f}'
        else:
            (x1, y1), (x2, y2) = port(a, 'r'), port(b, 'l')
            xm = x1 + 10 if bend == 'src' else x2 - 12
            d = f'M{x1:.0f} {y1:.0f} H{xm:.0f} V{y2:.0f} H{x2 - 2:.0f}' if abs(y1 - y2) > 1 else f'M{x1:.0f} {y1:.0f} H{x2 - 2:.0f}'
        o.append(f'<path class="cy-edge" d="{d}" marker-end="url(#cyc-arrow)"/>')
    # loop back
    nx, ny, nw, nh = boxes['n2']
    sx, sy, sw, sh = boxes['n1']
    o.append(f'<path class="cy-loop" d="M{nx + nw} {ny + nh / 2:.0f} H{W - 6} V{loop_y} H6 V{sy + sh / 2:.0f} H{sx - 2}" marker-end="url(#cyc-arrow)"/>')
    o.append(f'<text class="cy-loop-label" x="{W / 2:.0f}" y="{loop_y + 26}" text-anchor="middle">下次開會後，開始新一輪</text>')
    # nodes
    for k, (st, sub, y, lane, lines, note) in NODES.items():
        x, y, w, h = boxes[k]
        _, fill, stroke, dashed = LANES[lane]
        dash = ' stroke-dasharray="5 4"' if dashed else ''
        o.append(f'<g class="cy-node" data-lane="{lane}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="{fill}" stroke="{stroke}"{dash}/>')
        cy0 = y + h / 2 - (len(lines) - 1) * LH / 2 + FS * .36
        for i, ln in enumerate(lines):
            o.append(f'<text class="cy-text" x="{x + w / 2}" y="{cy0 + i * LH:.1f}" text-anchor="middle">{escape(ln)}</text>')
        if note:
            o.append(f'<rect class="cy-badge" x="{x + w - 56}" y="{y - 11}" width="54" height="20" rx="10"/><text class="cy-badge-t" x="{x + w - 29}" y="{y + 4}" text-anchor="middle">{escape(note)}</text>')
        o.append('</g>')
    o.append('</svg>')
    return ''.join(o)


def legend():
    return '<ul class="cycle-legend" aria-label="圖例">' + ''.join(
        f'<li data-lane="{k}"><i style="background:{f};border-color:{s};{"border-style:dashed;" if d else ""}"></i>{escape(n)}</li>' for k, (n, f, s, d) in LANES.items()) + \
        '<li class="cycle-legend-live"><b>使用中</b>已在設計部使用</li></ul>'


def _join(lines):
    out = ''
    for ln in lines:
        ln = ln.strip()
        if out and ((out[-1].isascii() and out[-1].isalnum()) or (ln[0].isascii() and ln[0].isalnum())):
            out += ' '
        out += ln
    return out


def text_list():
    by_stage = {}
    for k, (st, sub, y, lane, lines, note) in NODES.items():
        by_stage.setdefault(st, []).append((y, sub, lane, _join(lines), note))
    items = []
    for i, (lab, sub, _) in enumerate(STAGES):
        nodes = ''.join(f'<li data-lane="{lane}"><span>{escape(LANES[lane][0])}</span>{escape(t)}{"（" + escape(n) + "）" if n else ""}</li>' for _, _, lane, t, n in sorted(by_stage.get(i, []), key=lambda r: (r[1], r[0])))  # noqa
        items.append(f'<li><strong>{escape(lab)}</strong> · {escape(sub)}<ul>{nodes}</ul></li>')
    return '<details class="cycle-list"><summary>以清單閱讀時間線</summary><ol>' + ''.join(items) + '<li><strong>下次開會後</strong> · 開始新一輪</li></ol></details>'


def section():
    intro = ('<div class="rich cycle-intro"><p class="lead">目前只有「本機轉錄及撰寫英文 Minutes」已在設計部使用。</p><dl class="ll">'
             '<div><dt>循環</dt><dd>由一次設計會議到下一次：撰寫紀錄、提醒講者、索價、整理 Agenda 及 Sharing PDF，再寄出通知。</dd></div>'
             '<div><dt>其餘</dt><dd>其餘節點是正在建構的流程設計。</dd></div></dl></div>')
    return (f'<section class="rsec cycle-section" id="cycle" aria-labelledby="workflow-title"><header class="rsec-head"><p class="marker">§ 全流程</p>'
            f'<h2 id="workflow-title">{TITLE}</h2><p class="cycle-status">{escape(STATUS)}</p></header><div class="rsec-body">{intro}{legend()}</div>'
            f'<div class="rsec-wide"><figure class="cycle-figure"><div class="cycle-scroll" tabindex="0" role="region" aria-label="{TITLE}，可橫向捲動">{svg()}</div>'
            f'<figcaption>{TITLE}：由第 N 次開會到第 N+1 次開會</figcaption></figure>'
            f'<p class="cycle-hint" aria-hidden="true">← 左右滑動查看全圖 →</p>{text_list()}</div></section>')
