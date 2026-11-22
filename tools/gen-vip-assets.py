#!/usr/bin/env python3
"""Generate the VIP 1-12 asset set for AZLAN WORLD CHAT.
Original self-drawn SVG art in the style of the user's reference images
(phoenix, divine portal, golden VIP badge, ornate frames, VIP 1-12 chart).
Per level, under assets/vip/vip01/ ... vip12/:
  badge.svg (256x256), crown.svg (512x512), profile-frame.svg (512x512),
  frame-small.svg (256x256), nameplate.svg (1024x256), profile-card.svg (1080x1350),
  room-theme.svg (1080x1920), entry.svg (1080x1920), icon.svg (128x128).
Transparent backgrounds where applicable (badges, crowns, frames, nameplates, icons).
Regenerate: python3 tools/gen-vip-assets.py
"""
import math, os, xml.etree.ElementTree as ET

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'vip')

# vip, name, c1 main, c2 deep, c3 light, gem, motif, room scene, entry type, entry seconds
LEVELS = [
 (1, 'Bronze Hall',      '#b87333', '#6b3f14', '#f0c08a', '#ffd24a', 'medal',   'hall',    'sweep',      2.5),
 (2, 'Silver Hall',      '#c0c8d0', '#5f6b7a', '#f4f6f8', '#ffd24a', 'medal',   'hall',    'sweep',      2.5),
 (3, 'Royal Star',       '#2b3a8f', '#141c4d', '#ffd24a', '#7de3ff', 'medal',   'hall',    'sweep',      3.0),
 (4, 'Golden Crystal',   '#ffd24a', '#8c6a00', '#fff3b0', '#7de3ff', 'shield',  'palace',  'wings',      3.5),
 (5, 'Purple Royal',     '#8b5cf6', '#4c1d95', '#ffd24a', '#ff5a7a', 'crown',   'palace',  'wings',      3.5),
 (6, 'Red-Gold Crown',   '#d94f2b', '#7f1d1d', '#ffd24a', '#e63946', 'crown',   'palace',  'wings',      4.0),
 (7, 'Fire Kingdom',     '#ff5a00', '#8c1d00', '#ffd24a', '#4aa8ff', 'flame',   'fire',    'phoenix',    4.5),
 (8, 'Crystal Palace',   '#7de3ff', '#1e6f7a', '#e8f8ff', '#7de3ff', 'crystal', 'crystal', 'portal-car', 5.0),
 (9, 'Phoenix Kingdom',  '#ff7a1a', '#8c1d00', '#ffe600', '#ffd24a', 'phoenix', 'phoenix', 'phoenix',    6.0),
 (10, 'Gold Dragon',     '#ffd24a', '#5c3d00', '#e63946', '#ff5a00', 'dragon',  'dragon',  'dragon',     7.0),
 (11, 'Cosmic Galaxy',   '#7a5cff', '#1a0b3d', '#4aa8ff', '#7de3ff', 'cosmic',  'cosmic',  'cosmic',     7.0),
 (12, 'Divine Universe', '#ffd24a', '#3b1d6e', '#fff3b0', '#e63946', 'divine',  'divine',  'divine',     9.0),
]

def G(id_, stops, x1='0', y1='0', x2='0', y2='1'):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<linearGradient id="{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{s}</linearGradient>'
def RG(id_, stops):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in stops)
    return f'<radialGradient id="{id_}" cx=".5" cy=".5" r=".5">{s}</radialGradient>'

def diamond(x, y, s, fill, stroke='#fff', sw=1):
    return f'<path d="M{x} {y-s} L{x+s} {y} L{x} {y+s} L{x-s} {y} Z" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def star(x, y, s, fill):
    p = []
    for i in range(5):
        a = math.radians(-90 + i * 72); p.append(f"{x + s*math.cos(a):.1f},{y + s*math.sin(a):.1f}")
        a2 = math.radians(-90 + i * 72 + 36); p.append(f"{x + s*0.45*math.cos(a2):.1f},{y + s*0.45*math.sin(a2):.1f}")
    return f'<polygon points="{" ".join(p)}" fill="{fill}"/>'
def txt(x, y, size, fill, s, anchor='middle', stroke=None, sw=1):
    st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="Georgia, serif" font-size="{size}" font-weight="900" fill="{fill}"{st}>{s}</text>'
def wings(cx, cy, w, h, fill, flip=False):
    # stylised layered wing, pointing out from centre
    sgn = -1 if flip else 1
    return (f'<path d="M{cx} {cy} Q{cx+sgn*w*0.7} {cy-h*0.9} {cx+sgn*w} {cy-h*0.5} '
            f'Q{cx+sgn*w*0.75} {cy-h*0.25} {cx+sgn*w*0.95} {cy} '
            f'Q{cx+sgn*w*0.6} {cy+h*0.15} {cx+sgn*w*0.8} {cy+h*0.45} '
            f'Q{cx+sgn*w*0.4} {cy+h*0.3} {cx} {cy+h*0.35} Z" fill="{fill}"/>')

def crown_art(cx, cy, w, h, L, points=5):
    """Crown centred at (cx,cy), width w, height h. L = level tuple."""
    _, _, c1, c2, c3, gem, motif, _, _, _ = L
    bw, bh = w, h
    x0, y0 = cx - bw/2, cy - bh/2
    pts = []
    step = bw / points
    d = f'M{x0:.0f} {y0+bh:.0f} L{x0:.0f} {y0+bh*0.45:.0f} '
    for i in range(points):
        px = x0 + step*(i + 0.5)
        py = y0 + (bh*0.05 if i in (0, points-1) else (0 if i == points//2 else bh*0.18))
        d += f'L{px:.0f} {py:.0f} L{x0+step*(i+1):.0f} {y0+bh*0.45:.0f} '
    d += f'L{x0+bw:.0f} {y0+bh:.0f} Z'
    out = [f'<path d="{d}" fill="url(#cg)" stroke="{c2}" stroke-width="2"/>']
    out.append(f'<rect x="{x0:.0f}" y="{y0+bh*0.72:.0f}" width="{bw:.0f}" height="{bh*0.28:.0f}" rx="6" fill="url(#cg)" stroke="{c2}" stroke-width="2"/>')
    out.append(diamond(cx, y0+bh*0.45, bh*0.14, gem))
    out.append(diamond(cx - bw*0.28, y0+bh*0.55, bh*0.09, gem))
    out.append(diamond(cx + bw*0.28, y0+bh*0.55, bh*0.09, gem))
    for i in range(points):
        px = x0 + step*(i + 0.5)
        out.append(f'<circle cx="{px:.0f}" cy="{y0 + (bh*0.05 if i in (0, points-1) else (0 if i == points//2 else bh*0.18)):.0f}" r="{bh*0.07:.0f}" fill="{c3}"/>')
    return ''.join(out)

def badge_art(cx, cy, R, L):
    """The level's badge shape centred at (cx,cy) with radius R."""
    v, name, c1, c2, c3, gem, motif, _, _, _ = L
    num = str(v)
    fs = R * 0.72 if v < 10 else R * 0.62
    if motif == 'medal':
        out = [f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="url(#bg)" stroke="{c2}" stroke-width="{R*0.06:.0f}"/>',
               f'<circle cx="{cx}" cy="{cy}" r="{R*0.8:.0f}" fill="#241a08" stroke="{c3}" stroke-width="{R*0.03:.0f}"/>']
        if v == 1:  # laurel
            for sgn in (-1, 1):
                out.append(f'<path d="M{cx+sgn*R*0.82} {cy-R*0.35} Q{cx+sgn*R*1.05} {cy} {cx+sgn*R*0.82} {cy+R*0.35}" fill="none" stroke="{c1}" stroke-width="{R*0.07:.0f}" stroke-linecap="round"/>')
                for k in range(3):
                    out.append(f'<circle cx="{cx+sgn*R*(0.95 - k*0.05):.0f}" cy="{cy - R*0.25 + k*R*0.25:.0f}" r="{R*0.05:.0f}" fill="{c3}"/>')
        elif v == 2:  # silver wings
            out.append(wings(cx - R*0.55, cy, R*0.55, R*0.5, c1, flip=True))
            out.append(wings(cx + R*0.55, cy, R*0.55, R*0.5, c1))
        else:  # royal star
            for k in range(8):
                a = math.radians(k * 45)
                out.append(star(cx + R*0.92*math.cos(a), cy + R*0.92*math.sin(a), R*0.09, c3))
        out.append(txt(cx, cy + fs*0.35, fs, 'url(#bg)', num, stroke=c2, sw=2))
        return ''.join(out)
    if motif == 'shield':
        w, h = R*1.7, R*2.0
        x0, y0 = cx - w/2, cy - h/2
        d = (f'M{x0:.0f} {y0:.0f} L{x0+w:.0f} {y0:.0f} L{x0+w:.0f} {y0+h*0.55:.0f} '
             f'Q{x0+w:.0f} {y0+h*0.9:.0f} {cx:.0f} {y0+h:.0f} Q{x0:.0f} {y0+h*0.9:.0f} {x0:.0f} {y0+h*0.55:.0f} Z')
        out = [f'<path d="{d}" fill="url(#bg)" stroke="{c2}" stroke-width="{R*0.05:.0f}"/>',
               f'<path d="M{x0+w*0.14:.0f} {y0+h*0.12:.0f} L{x0+w*0.86:.0f} {y0+h*0.12:.0f} L{x0+w*0.86:.0f} {y0+h*0.5:.0f} Q{x0+w*0.86:.0f} {y0+h*0.78:.0f} {cx:.0f} {y0+h*0.86:.0f} Q{x0+w*0.14:.0f} {y0+h*0.78:.0f} {x0+w*0.14:.0f} {y0+h*0.5:.0f} Z" fill="#5c1a00" stroke="{c3}" stroke-width="2"/>']
        # crystal facets
        out.append(f'<path d="M{x0+w*0.5:.0f} {y0+h*0.12:.0f} L{x0+w*0.14:.0f} {y0+h*0.5:.0f} M{x0+w*0.5:.0f} {y0+h*0.12:.0f} L{x0+w*0.86:.0f} {y0+h*0.5:.0f}" stroke="{c3}" stroke-width="1.5" opacity=".7"/>')
        out.append(diamond(cx, y0 + h*0.06, R*0.1, gem))
        out.append(txt(cx, cy + fs*0.32, fs, 'url(#bg)', num, stroke=c2, sw=2))
        return ''.join(out)
    if motif == 'crown':
        out = [crown_art(cx, cy - R*0.55, R*1.1, R*0.55, L, points=5),
               f'<circle cx="{cx}" cy="{cy + R*0.35:.0f}" r="{R*0.78:.0f}" fill="url(#bg)" stroke="{c2}" stroke-width="{R*0.05:.0f}"/>',
               f'<circle cx="{cx}" cy="{cy + R*0.35:.0f}" r="{R*0.6:.0f}" fill="#241a08" stroke="{c3}" stroke-width="2"/>',
               diamond(cx - R*0.55, cy + R*0.35, R*0.09, gem),
               diamond(cx + R*0.55, cy + R*0.35, R*0.09, gem)]
        out.append(txt(cx, cy + R*0.35 + fs*0.32, fs, 'url(#bg)', num, stroke=c2, sw=2))
        return ''.join(out)
    if motif in ('flame', 'phoenix'):
        d = (f'M{cx} {cy-R:.0f} Q{cx+R*0.75:.0f} {cy-R*0.35:.0f} {cx+R*0.55:.0f} {cy+R*0.15:.0f} '
             f'Q{cx+R*0.85:.0f} {cy+R*0.55:.0f} {cx+R*0.3:.0f} {cy+R*0.8:.0f} '
             f'Q{cx:.0f} {cy+R:.0f} {cx-R*0.3:.0f} {cy+R*0.8:.0f} '
             f'Q{cx-R*0.85:.0f} {cy+R*0.55:.0f} {cx-R*0.55:.0f} {cy+R*0.15:.0f} '
             f'Q{cx-R*0.75:.0f} {cy-R*0.35:.0f} {cx:.0f} {cy-R:.0f} Z')
        out = [f'<path d="{d}" fill="url(#bg)" stroke="{c2}" stroke-width="{R*0.05:.0f}"/>',
               f'<path d="M{cx} {cy-R*0.55:.0f} Q{cx+R*0.35:.0f} {cy:.0f} {cx:.0f} {cy+R*0.45:.0f} Q{cx-R*0.35:.0f} {cy:.0f} {cx:.0f} {cy-R*0.55:.0f} Z" fill="{c3}" opacity=".85"/>']
        if motif == 'phoenix':
            out.append(wings(cx - R*0.5, cy - R*0.1, R*0.6, R*0.55, c1, flip=True))
            out.append(wings(cx + R*0.5, cy - R*0.1, R*0.6, R*0.55, c1))
        out.append(txt(cx, cy + R*0.55 + fs*0.28, fs*0.9, 'url(#bg)', num, stroke=c2, sw=2))
        return ''.join(out)
    if motif == 'crystal':
        out = [f'<polygon points="{cx},{cy-R} {cx+R*0.85:.0f},{cy} {cx},{cy+R} {cx-R*0.85:.0f},{cy}" fill="url(#bg)" stroke="{c2}" stroke-width="{R*0.05:.0f}"/>',
               f'<polygon points="{cx},{cy-R*0.7:.0f} {cx+R*0.5:.0f},{cy} {cx},{cy+R*0.7:.0f} {cx-R*0.5:.0f},{cy}" fill="{c3}" opacity=".55"/>',
               f'<path d="M{cx} {cy-R:.0f} L{cx} {cy+R:.0f} M{cx-R*0.85:.0f} {cy:.0f} L{cx+R*0.85:.0f} {cy:.0f}" stroke="{c2}" stroke-width="2" opacity=".7"/>']
        out.append(txt(cx, cy + fs*0.32, fs, '#123', num, stroke='#fff', sw=1.5))
        return ''.join(out)
    if motif == 'dragon':
        # gold dragon shield: shield + wings + red gems (reference 30964)
        w, h = R*1.8, R*1.9
        x0, y0 = cx - w/2, cy - h/2
        d = (f'M{x0:.0f} {y0:.0f} L{x0+w:.0f} {y0:.0f} L{x0+w:.0f} {y0+h*0.5:.0f} '
             f'Q{x0+w:.0f} {y0+h*0.85:.0f} {cx:.0f} {y0+h:.0f} Q{x0:.0f} {y0+h*0.85:.0f} {x0:.0f} {y0+h*0.5:.0f} Z')
        out = [wings(cx - w*0.42, cy - R*0.1, R*0.55, R*0.5, c1, flip=True),
               wings(cx + w*0.42, cy - R*0.1, R*0.55, R*0.5, c1),
               f'<path d="{d}" fill="url(#bg)" stroke="{c2}" stroke-width="{R*0.05:.0f}"/>',
               f'<path d="M{x0+w*0.16:.0f} {y0+h*0.14:.0f} L{x0+w*0.84:.0f} {y0+h*0.14:.0f} L{x0+w*0.84:.0f} {y0+h*0.46:.0f} Q{x0+w*0.84:.0f} {y0+h*0.76:.0f} {cx:.0f} {y0+h*0.84:.0f} Q{x0+w*0.16:.0f} {y0+h*0.76:.0f} {x0+w*0.16:.0f} {y0+h*0.46:.0f} Z" fill="#4d0a0a" stroke="{c3}" stroke-width="2"/>',
               diamond(cx - w*0.38, y0 + h*0.18, R*0.09, gem),
               diamond(cx + w*0.38, y0 + h*0.18, R*0.09, gem),
               diamond(cx, y0 - h*0.04, R*0.1, gem)]
        out.append(txt(cx, cy + fs*0.3, fs, 'url(#bg)', num, stroke='#3d2600', sw=2))
        return ''.join(out)
    if motif == 'cosmic':
        pts = []
        for i in range(24):
            a = math.radians(i * 15 - 90)
            r = R if i % 2 == 0 else R * 0.72
            pts.append(f"{cx + r*math.cos(a):.1f},{cy + r*math.sin(a):.1f}")
        out = [f'<polygon points="{" ".join(pts)}" fill="url(#bg)" stroke="{c2}" stroke-width="{R*0.04:.0f}"/>',
               f'<circle cx="{cx}" cy="{cy}" r="{R*0.62:.0f}" fill="#12082e" stroke="{c3}" stroke-width="2"/>',
               f'<path d="M{cx-R*0.5:.0f} {cy-R*0.2:.0f} L{cx-R*0.2:.0f} {cy+R*0.3:.0f} L{cx+R*0.1:.0f} {cy-R*0.35:.0f}" stroke="{gem}" stroke-width="{R*0.06:.0f}" fill="none" stroke-linecap="round"/>']
        out.append(txt(cx, cy + fs*0.32, fs, 'url(#bg)', num, stroke=c2, sw=2))
        return ''.join(out)
    # divine
    out = [f'<ellipse cx="{cx}" cy="{cy-R*1.05:.0f}" rx="{R*0.55:.0f}" ry="{R*0.14:.0f}" fill="none" stroke="{c3}" stroke-width="{R*0.05:.0f}"/>',
           wings(cx - R*0.6, cy - R*0.15, R*0.6, R*0.55, c1, flip=True),
           wings(cx + R*0.6, cy - R*0.15, R*0.6, R*0.55, c1),
           crown_art(cx, cy - R*0.62, R*1.0, R*0.5, L, points=5),
           f'<circle cx="{cx}" cy="{cy + R*0.25:.0f}" r="{R*0.72:.0f}" fill="url(#bg)" stroke="{c2}" stroke-width="{R*0.05:.0f}"/>',
           f'<circle cx="{cx}" cy="{cy + R*0.25:.0f}" r="{R*0.55:.0f}" fill="#2b1650" stroke="{c3}" stroke-width="2"/>',
           diamond(cx - R*0.5, cy + R*0.25, R*0.08, gem),
           diamond(cx + R*0.5, cy + R*0.25, R*0.08, gem)]
    out.append(txt(cx, cy + R*0.25 + fs*0.3, fs*0.9, 'url(#bg)', num, stroke=c2, sw=2))
    return ''.join(out)

def ribbon(cx, y, w, h, L, label='VIP'):
    _, _, c1, c2, c3, gem, _, _, _, _ = L
    return (f'<rect x="{cx-w/2:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" rx="{h/2:.0f}" fill="{c2}" stroke="{c3}" stroke-width="2"/>'
            + txt(cx, y + h*0.68, h*0.55, c3, label))

# ---------- profile frame (transparent centre) ----------
def frame_svg(S, L):
    v, name, c1, c2, c3, gem, motif, _, _, _ = L
    c = S / 2
    r = S * 0.42
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}"><defs>'
             f'{G("fg", [(0, c3), (0.5, c1), (1, c2)])}'
             f'{RG("fgl", [(0, c3, 0), (0.8, c3, 0.35), (1, c3, 0)])}</defs>'
             f'<circle cx="{c}" cy="{c}" r="{S*0.48:.0f}" fill="url(#fgl)"/>',
             f'<circle cx="{c}" cy="{c}" r="{r:.0f}" fill="none" stroke="url(#fg)" stroke-width="{S*0.035:.0f}"/>',
             f'<circle cx="{c}" cy="{c}" r="{r*0.92:.0f}" fill="none" stroke="{c3}" stroke-width="{S*0.008:.0f}"/>']
    # side ornaments around the ring
    for k in range(8):
        a = math.radians(k * 45 + 22)
        x, y = c + r*math.cos(a), c + r*math.sin(a)
        if motif in ('flame', 'phoenix'):
            parts.append(f'<path d="M{x:.0f} {y-S*0.02:.0f} Q{x+S*0.02:.0f} {y:.0f} {x:.0f} {y+S*0.02:.0f} Q{x-S*0.02:.0f} {y:.0f} {x:.0f} {y-S*0.02:.0f} Z" fill="{c1}"/>')
        elif motif in ('crystal', 'cosmic'):
            parts.append(diamond(x, y, S*0.018, gem))
        elif motif == 'dragon':
            parts.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{S*0.016:.0f}" fill="{c3}"/>')
        else:
            parts.append(star(x, y, S*0.02, c3))
    # top ornament
    if motif == 'cosmic':
        parts.append(crown_art(c, S*0.06, S*0.3, S*0.12, L, points=5))
        parts.append(f'<path d="M{c-S*0.1:.0f} {S*0.2:.0f} L{c-S*0.04:.0f} {S*0.28:.0f} L{c:.0f} {S*0.18:.0f}" stroke="{gem}" stroke-width="{S*0.012:.0f}" fill="none" stroke-linecap="round"/>')
    elif motif == 'divine':
        parts.append(f'<ellipse cx="{c}" cy="{S*0.05:.0f}" rx="{S*0.14:.0f}" ry="{S*0.03:.0f}" fill="none" stroke="{c3}" stroke-width="{S*0.012:.0f}"/>')
        parts.append(crown_art(c, S*0.1, S*0.26, S*0.1, L, points=5))
    elif motif in ('flame', 'phoenix'):
        parts.append(f'<path d="M{c} {S*0.01:.0f} Q{c+S*0.06:.0f} {S*0.08:.0f} {c} {S*0.14:.0f} Q{c-S*0.06:.0f} {S*0.08:.0f} {c} {S*0.01:.0f} Z" fill="{c1}" stroke="{c2}" stroke-width="2"/>')
    elif motif == 'dragon':
        parts.append(wings(c - S*0.1, S*0.06, S*0.12, S*0.08, c1, flip=True))
        parts.append(wings(c + S*0.1, S*0.06, S*0.12, S*0.08, c1))
        parts.append(diamond(c, S*0.07, S*0.035, gem))
    else:
        parts.append(f'<path d="M{c} {S*0.005:.0f} L{c+S*0.045:.0f} {S*0.05:.0f} L{c} {S*0.095:.0f} L{c-S*0.045:.0f} {S*0.05:.0f} Z" fill="url(#fg)" stroke="{c2}" stroke-width="2"/>')
        parts.append(diamond(c, S*0.05, S*0.032, gem))
    # bottom medallion with the level number
    by = S * 0.94
    parts.append(f'<circle cx="{c}" cy="{by:.0f}" r="{S*0.11:.0f}" fill="url(#fg)" stroke="{c2}" stroke-width="2"/>')
    parts.append(txt(c, by + S*0.038, S*0.075, '#241a08', str(v)))
    parts.append('</svg>')
    return ''.join(parts)

# ---------- nameplate (1024x256, empty name zone for dynamic text) ----------
def nameplate_svg(L):
    v, name, c1, c2, c3, gem, motif, _, _, _ = L
    W, H = 1024, 256
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"><defs>'
             f'{G("ng", [(0, c3), (0.5, c1), (1, c2)], x1="0", y1="0", x2="1", y2="0")}</defs>',
             f'<rect x="60" y="88" width="904" height="80" rx="40" fill="url(#ng)" stroke="{c2}" stroke-width="4"/>',
             f'<rect x="72" y="98" width="880" height="60" rx="30" fill="none" stroke="{c3}" stroke-width="2" opacity=".8"/>',
             wings(120, 128, 90, 60, c1, flip=True), wings(904, 128, 90, 60, c1),
             diamond(96, 128, 12, gem), diamond(928, 128, 12, gem),
             f'<circle cx="512" cy="128" r="70" fill="#241a08" stroke="url(#ng)" stroke-width="6"/>',
             f'<circle cx="512" cy="128" r="56" fill="none" stroke="{c3}" stroke-width="2"/>',
             txt(512, 148, 56, 'url(#ng)', str(v), stroke=c2, sw=1.5),
             txt(512, 178, 18, c3, 'VIP'),
             '</svg>']
    return ''.join(parts)

# ---------- profile card (1080x1350) ----------
def profile_card_svg(L):
    v, name, c1, c2, c3, gem, motif, _, _, _ = L
    W, H = 1080, 1350
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"><defs>'
             f'{G("cbg", [(0, c2), (0.55, "#1c1030"), (1, c1)])}'
             f'{G("cg2", [(0, c3), (0.5, c1), (1, c2)])}</defs>',
             f'<rect width="{W}" height="{H}" fill="url(#cbg)"/>',
             f'<rect x="24" y="24" width="{W-48}" height="{H-48}" rx="28" fill="none" stroke="url(#cg2)" stroke-width="8"/>',
             f'<rect x="44" y="44" width="{W-88}" height="{H-88}" rx="20" fill="none" stroke="{c3}" stroke-width="2" opacity=".6"/>']
    parts.append(crown_art(540, 150, 320, 130, L, points=5))
    parts.append(f'<circle cx="540" cy="560" r="280" fill="none" stroke="url(#cg2)" stroke-width="16"/>')
    parts.append(f'<circle cx="540" cy="560" r="252" fill="none" stroke="{c3}" stroke-width="3"/>')
    parts.append(f'<circle cx="540" cy="560" r="280" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 14" opacity=".5"/>')
    # empty name band (dynamic username goes here in the app)
    parts.append(f'<rect x="240" y="900" width="600" height="84" rx="42" fill="rgba(255,255,255,.10)" stroke="{c3}" stroke-width="2"/>')
    parts.append(badge_art(540, 1150, 110, L))
    parts.append(ribbon(540, 1290, 150, 40, L))
    for (x, y) in [(90, 90), (990, 90), (90, 1260), (990, 1260)]:
        parts.append(diamond(x, y, 14, gem))
    for k in range(10):
        a = math.radians(k * 36 + 10)
        parts.append(f'<circle cx="{540 + 420*math.cos(a):.0f}" cy="{560 + 420*math.sin(a):.0f}" r="5" fill="{c3}" opacity=".8"/>')
    parts.append('</svg>')
    return ''.join(parts)

# ---------- badge / crown / icon files ----------
def badge_svg(L):
    v, name, c1, c2, c3, gem, motif, _, _, _ = L
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs>'
             f'{G("bg", [(0, c3), (0.5, c1), (1, c2)])}</defs>']
    parts.append(badge_art(128, 118, 92, L))
    parts.append(ribbon(128, 214, 110, 30, L))
    parts.append('</svg>')
    return ''.join(parts)

def crown_svg(L):
    v, name, c1, c2, c3, gem, motif, _, _, _ = L
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>'
             f'{G("cg", [(0, c3), (0.5, c1), (1, c2)])}</defs>']
    if motif == 'divine':
        parts.append(f'<ellipse cx="256" cy="90" rx="130" ry="26" fill="none" stroke="{c3}" stroke-width="8"/>')
    if motif in ('flame', 'phoenix', 'dragon', 'divine'):
        parts.append(wings(80, 330, 120, 100, c1, flip=True))
        parts.append(wings(432, 330, 120, 100, c1))
    parts.append(crown_art(256, 300, 340, 230, L, points=3 if v <= 3 else 5))
    if motif == 'cosmic':
        parts.append(f'<path d="M150 180 L200 300 L250 170" stroke="{gem}" stroke-width="10" fill="none" stroke-linecap="round"/>')
        parts.append(f'<path d="M362 180 L312 300 L262 170" stroke="{gem}" stroke-width="10" fill="none" stroke-linecap="round"/>')
    parts.append('</svg>')
    return ''.join(parts)

def icon_svg(L):
    v, name, c1, c2, c3, gem, motif, _, _, _ = L
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs>'
             f'{G("ig", [(0, c3), (0.5, c1), (1, c2)])}</defs>',
             f'<circle cx="64" cy="64" r="58" fill="url(#ig)" stroke="{c2}" stroke-width="4"/>',
             f'<circle cx="64" cy="64" r="46" fill="#241a08" stroke="{c3}" stroke-width="2"/>',
             txt(64, 84, 52, 'url(#ig)', str(v), stroke=c2, sw=1.5),
             '</svg>']
    return ''.join(parts)

# ---------- room theme (1080x1920 portrait) ----------
def room_theme_svg(L):
    v, name, c1, c2, c3, gem, motif, scene, _, _ = L
    W, H = 1080, 1920
    skies = {
        'hall':    [('#3a2a12', 0), ('#6b4a1e', 0.55), ('#2b1d05', 1)],
        'palace':  [('#5c3d00', 0), ('#a86e00', 0.5), ('#2b1d05', 1)],
        'fire':    [('#2b0a00', 0), ('#8c1d00', 0.5), ('#1a0500', 1)],
        'crystal': [('#0a2e3d', 0), ('#1e6f7a', 0.5), ('#06121a', 1)],
        'phoenix': [('#2b0a00', 0), ('#b83200', 0.5), ('#1a0500', 1)],
        'dragon':  [('#1a0d00', 0), ('#6b3d00', 0.5), ('#120800', 1)],
        'cosmic':  [('#0b0626', 0), ('#2b1a5e', 0.55), ('#05020f', 1)],
        'divine':  [('#1a0b3d', 0), ('#5b21b6', 0.5), ('#0d0518', 1)],
    }
    sky = skies[scene]
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"><defs>'
             f'{G("sky", [(o, c) for c, o in sky])}'
             f'{G("fl", [(0, c3), (1, c2)])}'
             f'{G("rg", [(0, c1), (0.5, c3), (1, c2)])}'
             f'{RG("glow", [(0, c3, 0.85), (1, c3, 0)])}</defs>',
             f'<rect width="{W}" height="{H}" fill="url(#sky)"/>',
             f'<ellipse cx="540" cy="950" rx="480" ry="420" fill="url(#glow)" opacity=".55"/>']
    # stars / particles in the sky
    for k in range(26):
        a = k * 2.39996
        x = 540 + 480 * math.sin(a * 1.7)
        y = 120 + (k * 53) % 900
        r = 2 + (k % 3)
        parts.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="{c3 if k % 3 else gem}" opacity=".85"/>')
    # back arch
    parts.append(f'<path d="M240 1420 L240 700 Q240 320 540 320 Q840 320 840 700 L840 1420 Z" fill="{c2}" stroke="{c1}" stroke-width="6" opacity=".9"/>')
    parts.append(f'<path d="M290 1420 L290 720 Q290 380 540 380 Q790 380 790 720 L790 1420 Z" fill="none" stroke="{c3}" stroke-width="3" opacity=".7"/>')
    # side pillars
    for x in (90, 900):
        parts.append(f'<rect x="{x}" y="420" width="90" height="1000" fill="{c2}" stroke="{c1}" stroke-width="3"/>')
        parts.append(f'<rect x="{x-14}" y="400" width="118" height="36" rx="8" fill="url(#rg)"/>')
        parts.append(f'<rect x="{x-14}" y="1400" width="118" height="36" rx="8" fill="url(#rg)"/>')
    # floor
    parts.append(f'<polygon points="0,1420 1080,1420 1080,1920 0,1920" fill="url(#fl)"/>')
    for k in range(7):
        x = 540 + (k - 3) * 150
        parts.append(f'<path d="M540 1420 L{x} 1920" stroke="{c3}" stroke-width="2" opacity=".35"/>')
    parts.append(f'<ellipse cx="540" cy="1560" rx="380" ry="90" fill="url(#glow)" opacity=".7"/>')
    # centre feature by scene
    if scene in ('hall', 'palace'):
        parts.append(f'<rect x="440" y="1180" width="200" height="240" rx="16" fill="{c2}" stroke="{c1}" stroke-width="4"/>')
        parts.append(f'<path d="M440 1180 L540 1060 L640 1180 Z" fill="url(#rg)" stroke="{c2}" stroke-width="3"/>')
        parts.append(diamond(540, 1120, 22, gem))
        parts.append(f'<rect x="400" y="1420" width="280" height="26" rx="8" fill="url(#rg)"/>')
        if scene == 'palace':
            parts.append(crown_art(540, 980, 180, 80, L, points=5))
    elif scene == 'fire':
        for sgn in (-1, 1):
            parts.append(f'<path d="M{540+sgn*330} 1420 Q{540+sgn*380} 1150 {540+sgn*330} 980 Q{540+sgn*280} 1150 {540+sgn*330} 1420 Z" fill="{c1}" opacity=".9"/>')
            parts.append(f'<path d="M{540+sgn*330} 1420 Q{540+sgn*360} 1250 {540+sgn*330} 1100 Q{540+sgn*300} 1250 {540+sgn*330} 1420 Z" fill="{c3}" opacity=".9"/>')
        parts.append(f'<ellipse cx="540" cy="1420" rx="260" ry="40" fill="{c3}" opacity=".8"/>')
    elif scene == 'crystal':
        for (x, y, s) in [(380, 1420, 190), (540, 1420, 260), (700, 1420, 190)]:
            parts.append(f'<polygon points="{x},{y-s} {x+s*0.45:.0f},{y} {x},{y} {x-s*0.45:.0f},{y}" fill="{gem}" opacity=".85" stroke="{c3}" stroke-width="2"/>')
    elif scene == 'phoenix':
        parts.append(wings(540 - 180, 900, 260, 220, c1, flip=True))
        parts.append(wings(540 + 180, 900, 260, 220, c1))
        parts.append(f'<path d="M540 700 Q500 860 540 1000 Q580 860 540 700 Z" fill="url(#rg)"/>')
        for k in range(12):
            parts.append(f'<circle cx="{200 + k*60:.0f}" cy="{1150 + (k % 4) * 40:.0f}" r="4" fill="{c3}" opacity=".9"/>')
    elif scene == 'dragon':
        parts.append(f'<path d="M300 1420 Q300 1150 540 1150 Q780 1150 780 1420" fill="none" stroke="{c1}" stroke-width="26" stroke-linecap="round"/>')
        parts.append(f'<path d="M340 1420 Q340 1220 540 1220 Q740 1220 740 1420" fill="none" stroke="{c3}" stroke-width="10" stroke-linecap="round"/>')
        for sgn in (-1, 1):
            parts.append(f'<circle cx="{540+sgn*260:.0f}" cy="1080" r="46" fill="url(#rg)" stroke="{c2}" stroke-width="3"/>')
            parts.append(f'<circle cx="{540+sgn*260:.0f}" cy="1080" r="18" fill="{gem}"/>')
        parts.append(crown_art(540, 960, 200, 90, L, points=5))
    elif scene == 'cosmic':
        parts.append(f'<circle cx="540" cy="900" r="300" fill="none" stroke="url(#rg)" stroke-width="14"/>')
        parts.append(f'<circle cx="540" cy="900" r="250" fill="none" stroke="{gem}" stroke-width="4" stroke-dasharray="6 12"/>')
        parts.append(f'<rect x="500" y="760" width="80" height="280" rx="10" fill="url(#rg)" stroke="{c2}" stroke-width="3"/>')
        parts.append(f'<rect x="516" y="790" width="48" height="220" rx="6" fill="#fff8e1" opacity=".8"/>')
    else:  # divine
        parts.append(f'<circle cx="540" cy="880" r="330" fill="none" stroke="url(#rg)" stroke-width="16"/>')
        parts.append(f'<circle cx="540" cy="880" r="280" fill="none" stroke="{c3}" stroke-width="4" stroke-dasharray="4 10"/>')
        parts.append(f'<rect x="480" y="700" width="120" height="360" rx="12" fill="url(#rg)" stroke="{c2}" stroke-width="4"/>')
        parts.append(f'<rect x="502" y="730" width="76" height="300" rx="8" fill="#fff8e1" opacity=".9"/>')
        parts.append(f'<path d="M540 1060 L540 1420 M420 1420 L540 1300 L660 1420" stroke="{c3}" stroke-width="6" fill="none"/>')
        for (x, y, s) in [(300, 700, 40), (780, 640, 34), (340, 1150, 30), (740, 1180, 36)]:
            parts.append(diamond(x, y, s, gem))
        parts.append(f'<polygon points="540,300 620,900 460,900" fill="#fff" opacity=".07"/>')
        parts.append(f'<polygon points="540,300 760,900 320,900" fill="#fff" opacity=".05"/>')
    parts.append('</svg>')
    return ''.join(parts)

# ---------- entry animation art (1080x1920, transparent bg) ----------
def entry_svg(L):
    v, name, c1, c2, c3, gem, motif, scene, entry, _ = L
    W, H = 1080, 1920
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"><defs>'
             f'{G("eg", [(0, c3), (0.5, c1), (1, c2)])}'
             f'{RG("eglow", [(0, c3, 0.9), (1, c3, 0)])}</defs>',
             f'<ellipse cx="540" cy="880" rx="520" ry="460" fill="url(#eglow)" opacity=".6"/>',
             f'<polygon points="540,120 700,880 380,880" fill="#fff" opacity=".06"/>',
             f'<polygon points="540,120 820,880 260,880" fill="#fff" opacity=".04"/>']
    if entry == 'phoenix':
        parts.append(wings(540 - 200, 880, 320, 280, c1, flip=True))
        parts.append(wings(540 + 200, 880, 320, 280, c1))
        parts.append(f'<path d="M540 640 Q490 840 540 1020 Q590 840 540 640 Z" fill="url(#eg)"/>')
        parts.append(f'<path d="M540 640 Q530 600 540 570 Q550 600 540 640 Z" fill="{c3}"/>')
    elif entry in ('cosmic', 'divine'):
        parts.append(f'<circle cx="540" cy="860" r="360" fill="none" stroke="url(#eg)" stroke-width="18"/>')
        parts.append(f'<circle cx="540" cy="860" r="300" fill="none" stroke="{gem}" stroke-width="5" stroke-dasharray="6 14"/>')
        parts.append(f'<rect x="470" y="660" width="140" height="400" rx="14" fill="url(#eg)" stroke="{c2}" stroke-width="4"/>')
        parts.append(f'<rect x="496" y="700" width="88" height="320" rx="8" fill="#fff8e1" opacity=".9"/>')
        if entry == 'divine':
            parts.append(crown_art(540, 420, 260, 120, L, points=5))
            parts.append(f'<ellipse cx="540" cy="380" rx="150" ry="28" fill="none" stroke="{c3}" stroke-width="8"/>')
            for (x, y, s) in [(300, 620, 26), (780, 600, 22), (330, 1150, 20), (750, 1180, 24)]:
                parts.append(diamond(x, y, s, gem))
    elif entry == 'portal-car':
        parts.append(f'<circle cx="540" cy="860" r="330" fill="none" stroke="url(#eg)" stroke-width="16"/>')
        parts.append(f'<circle cx="540" cy="860" r="280" fill="none" stroke="{gem}" stroke-width="4" stroke-dasharray="6 12"/>')
        parts.append(f'<path d="M380 1080 Q540 1000 700 1080 L680 1140 Q540 1090 400 1140 Z" fill="{c2}" stroke="{c3}" stroke-width="3"/>')
        parts.append(f'<rect x="440" y="1010" width="200" height="70" rx="20" fill="url(#eg)" stroke="{c2}" stroke-width="3"/>')
        parts.append(f'<circle cx="470" cy="1145" r="26" fill="#1c1c1c" stroke="{c3}" stroke-width="4"/>')
        parts.append(f'<circle cx="610" cy="1145" r="26" fill="#1c1c1c" stroke="{c3}" stroke-width="4"/>')
    else:
        parts.append(badge_art(540, 860, 300, L))
        if entry == 'wings':
            parts.append(wings(540 - 320, 860, 300, 240, c1, flip=True))
            parts.append(wings(540 + 320, 860, 300, 240, c1))
            parts.append(crown_art(540, 480, 260, 110, L, points=5))
    for k in range(18):
        a = k * 2.39996
        x = 540 + 420 * math.sin(a * 1.3)
        y = 300 + (k * 71) % 1300
        parts.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{3 + k % 4}" fill="{c3 if k % 2 else gem}" opacity=".9"/>')
    parts.append(f'<ellipse cx="540" cy="1500" rx="380" ry="80" fill="url(#eglow)" opacity=".7"/>')
    parts.append('</svg>')
    return ''.join(parts)

# ---------- main ----------
def main():
    made = []
    for L in LEVELS:
        v = L[0]
        d = os.path.join(BASE, f'vip{v:02d}')
        os.makedirs(d, exist_ok=True)
        files = {
            'badge.svg': badge_svg(L),
            'crown.svg': crown_svg(L),
            'profile-frame.svg': frame_svg(512, L),
            'frame-small.svg': frame_svg(256, L),
            'nameplate.svg': nameplate_svg(L),
            'profile-card.svg': profile_card_svg(L),
            'room-theme.svg': room_theme_svg(L),
            'entry.svg': entry_svg(L),
            'icon.svg': icon_svg(L),
        }
        for fn, content in files.items():
            ET.fromstring(content)  # validate XML
            path = os.path.join(d, fn)
            with open(path, 'w') as f:
                f.write(content)
            made.append(path)
    print(f'Generated {len(made)} SVGs in {BASE}/vip01..vip12')
    for p in made:
        print(' ', os.path.relpath(p, os.getcwd()), os.path.getsize(p))

if __name__ == '__main__':
    main()
