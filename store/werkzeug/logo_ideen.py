"""Drei Logo-Ideen für „Punsch & Lichterglanz“ (reines Python, transparenter Hintergrund):
  schild   - das Standschild: Markise, Holzbrett, Lichterkette
  plakette - rundes Emblem: Haus bei Nacht, Punschtasse, Schriftband (taugt als Profilbild)
  marke    - ruhige Wortmarke: cremefarbene Schrift mit goldenem Leuchten, & als dampfende Tasse
Aufruf: logo_ideen.py zielordner [skala]"""
import math, os, random, struct, sys, zlib

ZIEL = sys.argv[1]
SK = int(sys.argv[2]) if len(sys.argv) > 2 else 5

# ------------------------------------------------------------------ Schrift (grob 12 Zeilen, fein per Scale2x)
def klein(zeilen, unten=()):
    return ['.' * len(zeilen[0])] * 3 + list(zeilen) + list(unten)

G = {
    'P': ['######..', '#######.', '##...###', '##....##', '##....##', '##...###', '#######.', '######..',
          '##......', '##......', '##......', '##......'],
    'L': ['##.....'] * 10 + ['#######', '#######'],
    'u': klein(['##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##..###', '#######', '.###.##']),
    'n': klein(['##.###.', '#######', '###..##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##']),
    's': klein(['.#####.', '#######', '##.....', '######.', '.######', '.....##', '.....##', '#######', '.#####.']),
    'c': klein(['.#####.', '#######', '##...##', '##.....', '##.....', '##.....', '##...##', '#######', '.#####.']),
    'h': ['##.....', '##.....', '##.....', '##.###.', '#######', '###..##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##'],
    'i': ['##', '##', '..', '##', '##', '##', '##', '##', '##', '##', '##', '##'],
    't': ['......', '.##...', '.##...', '######', '######', '.##...', '.##...', '.##...', '.##...', '.##...', '.#####', '..####'],
    'e': klein(['.#####.', '#######', '##...##', '#######', '#######', '##.....', '##...##', '#######', '.#####.']),
    'r': klein(['##.###', '######', '###...', '##....', '##....', '##....', '##....', '##....', '##....']),
    'g': klein(['.######', '#######', '##...##', '##...##', '##...##', '##...##', '#######', '.######', '.....##'],
               ['##...##', '#######', '.#####.']),
    'l': ['##.'] * 10 + ['###', '.##'],
    'a': klein(['.#####.', '#######', '.....##', '.######', '#######', '##...##', '##..###', '#######', '.###.##']),
    'z': klein(['#######', '#######', '....###', '...###.', '..###..', '.###...', '###....', '#######', '#######']),
    '&': ['..###....', '.##.##...', '.##.##...', '..###....', '.####.##.', '##..###..', '##...##..',
          '##..####.', '.####.##.', '.........', '.........', '.........'],
    ' ': ['....'] * 12,
}

def text_grob(wort, abstand=2):
    """Grobe Maske eines Worts: Menge (x, y), Breite. y 0..11 bis Grundlinie, Unterlänge bis 14."""
    m, x = set(), 0
    for ch in wort:
        gl = G[ch]
        for dy, z in enumerate(gl):
            for dx, c in enumerate(z):
                if c == '#':
                    m.add((x + dx, dy))
        x += len(gl[0]) + abstand
    return m, x - abstand

def scale2x(m):
    """Scale2x (EPX) auf einer Pixelmenge: doppelte Auflösung, schräge Kanten in Ein-Pixel-Stufen."""
    if not m:
        return set()
    xs = [p[0] for p in m]; ys = [p[1] for p in m]
    aus = set()
    for y in range(min(ys) - 1, max(ys) + 2):
        for x in range(min(xs) - 1, max(xs) + 2):
            P = (x, y) in m; A = (x, y - 1) in m; B = (x + 1, y) in m; C = (x - 1, y) in m; D = (x, y + 1) in m
            e = [P] * 4
            if C == A and C != D and A != B: e[0] = A
            if A == B and A != C and B != D: e[1] = B
            if D == C and D != B and C != A: e[2] = C
            if B == D and B != A and D != C: e[3] = D
            for i, v in enumerate(e):
                if v:
                    aus.add((2 * x + i % 2, 2 * y + i // 2))
    return aus

def text_fein(wort, abstand=2):
    m, b = text_grob(wort, abstand)
    return scale2x(m), 2 * b

def verschiebe(m, dx, dy):
    return {(x + dx, y + dy) for x, y in m}

# ------------------------------------------------------------------ Leinwand mit Deckkraft-Mischung
def hx(s):
    return (int(s[1:3], 16), int(s[3:5], 16), int(s[5:7], 16))

class Bild:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.p = [[(0.0, 0.0, 0.0, 0.0)] * w for _ in range(h)]

    def setz(self, x, y, c, a=1.0):
        """Farbe c (Tupel oder '#rrggbb') mit Deckkraft a ÜBER das Vorhandene legen."""
        if not (0 <= x < self.w and 0 <= y < self.h) or a <= 0:
            return
        if isinstance(c, str):
            c = hx(c)
        r0, g0, b0, a0 = self.p[y][x]
        ao = a + a0 * (1 - a)
        if ao <= 0:
            return
        f = lambda neu, alt: (neu * a + alt * a0 * (1 - a)) / ao
        self.p[y][x] = (f(c[0], r0), f(c[1], g0), f(c[2], b0), ao)

    def menge(self, m, c, a=1.0):
        for x, y in m:
            self.setz(x, y, c, a)

    def png(self, pfad, s):
        roh = bytearray()
        for y in range(self.h * s):
            roh.append(0)
            z = self.p[y // s]
            for x in range(self.w * s):
                r, g, b, a = z[x // s]
                roh.extend((int(r + 0.5), int(g + 0.5), int(b + 0.5), int(a * 255 + 0.5)))
        def chunk(t, d):
            return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
        with open(pfad, 'wb') as f:
            f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', self.w * s, self.h * s, 8, 6, 0, 0, 0))
                    + chunk(b'IDAT', zlib.compress(bytes(roh), 9)) + chunk(b'IEND', b''))

def rand(m, breite=1, acht=True):
    """Ring(e) um eine Menge: Liste der Ringe von innen nach außen."""
    ringe, belegt, aktuell = [], set(m), set(m)
    nb = [(dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx, dy) != (0, 0)] if acht else [(1, 0), (-1, 0), (0, 1), (0, -1)]
    for _ in range(breite):
        neu = {(x + dx, y + dy) for x, y in aktuell for dx, dy in nb} - belegt
        ringe.append(neu); belegt |= neu; aktuell = neu
    return ringe

def leuchten(bild, m, farbe, r, staerke):
    """Weicher Schein um eine Menge (quadratisch abfallend), nur außerhalb der Menge."""
    abst = {}
    for i, ring in enumerate(rand(m, r), 1):
        for p in ring:
            abst[p] = i
    for (x, y), d in abst.items():
        bild.setz(x, y, farbe, staerke * (1 - d / (r + 1)) ** 2)

def schein(bild, cx, cy, r, farbe, staerke):
    for y in range(int(cy - r), int(cy + r) + 1):
        for x in range(int(cx - r), int(cx + r) + 1):
            d = math.hypot(x - cx, y - cy)
            if d <= r:
                bild.setz(x, y, farbe, staerke * (1 - d / r) ** 2)

def schatten(bild, m, dx=2, dy=2, a=0.4):
    belegt = set(m)
    for x, y in m:
        for k in range(1, max(dx, dy) + 1):
            p = (x + min(k, dx), y + min(k, dy))
            if p not in belegt:
                bild.setz(*p, (20, 14, 40), a)

def stufen(m, y0, h, farben, x_rechts_dunkler=True):
    """Füllfarbe je Pixel nach Höhe (Bänder), Oberkante hell, rechte/untere Kante eine Stufe dunkler."""
    aus = {}
    n = len(farben)
    for x, y in m:
        st = min(n - 1, max(0, (y - y0) * n // h))
        if (x, y - 1) not in m:
            st = 0
        elif x_rechts_dunkler and ((x + 1, y) not in m or (x, y + 1) not in m):
            st = min(n - 1, st + 1)
        aus[(x, y)] = farben[st]
    return aus

GOLD = ['#fffbe6', '#fff0a0', '#ffe070', '#ffd04a', '#f4bc32', '#e0a024', '#c48416', '#a0660e']
CREME = ['#ffffff', '#fff8ea', '#fff2d8', '#fbe8c4', '#f0d6a8', '#ddbc88']

def funkel(bild, cx, cy, arm):
    for k in range(1, arm + 1):
        f = '#ffffff' if k <= arm // 2 else '#fff1a0'
        for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
            bild.setz(cx + dx, cy + dy, f, 1 if k < arm else 0.6)
    bild.setz(cx, cy, '#ffffff')
    for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
        bild.setz(cx + dx, cy + dy, '#fff6c8', 0.8)

def tasse(bild, x0, y0, rnd):
    """Dampfende Punschtasse 22 x 24 (feine Pixel), nachtblau mit goldenem Stern - wie der Sternenpunsch."""
    koerper = {(x, y) for x in range(x0 + 1, x0 + 17) for y in range(y0 + 8, y0 + 24)} - {(x0 + 1, y0 + 23), (x0 + 16, y0 + 23)}
    henkel = {(x0 + 17 + dx, y0 + 11 + dy) for dx in range(5) for dy in range(9)} - {(x0 + 17 + dx, y0 + 13 + dy) for dx in range(2) for dy in range(5)} - {(x0 + 21, y0 + 11), (x0 + 21, y0 + 19)}
    alles = koerper | henkel
    for ring in rand(alles, 1):
        bild.menge(ring, '#0a1432')
    for (x, y) in alles:
        c = '#3a62b8' if x < x0 + 6 else '#2a4a98' if x < x0 + 13 else '#1e3878'
        if (x, y) in henkel:
            c = '#24438a'
        bild.setz(x, y, c)
    for x in range(x0 + 1, x0 + 17):                  # Rand oben und Punsch darin
        bild.setz(x, y0 + 8, '#a8c8ff'); bild.setz(x, y0 + 9, '#7a2a40' if 2 < x - x0 < 15 else '#a8c8ff')
    bild.setz(x0 + 3, y0 + 12, '#a8c8ff'); bild.setz(x0 + 3, y0 + 13, '#a8c8ff')   # Glanz
    STERN = ['..#..', '..#..', '#####', '.###.', '##.##']
    for dy, z in enumerate(STERN):
        for dx, c in enumerate(z):
            if c == '#':
                bild.setz(x0 + 7 + dx, y0 + 14 + dy, '#ffd04a' if dy < 3 else '#e0a024')
    for i, sx in enumerate((x0 + 5, x0 + 9, x0 + 13)):   # Dampf: drei wiegende Schwaden
        for k in range(7):
            x = sx + round(1.5 * math.sin(k * 0.9 + i * 1.7))
            bild.setz(x, y0 + 6 - k, '#ffffff', 0.75 - k * 0.09)

# ------------------------------------------------------------------ Idee 1: Standschild
def schild():
    rnd = random.Random(7)
    z1, b1 = text_fein('Punsch &')
    z2, b2 = text_fein('Lichterglanz')
    BW = max(b1, b2) + 28
    BH = 24 + 8 + 30 + 22
    W, H = BW + 24, BH + 38
    bild = Bild(W, H)
    bx, by = 12, 30                                    # Brett
    brett = {(x, y) for x in range(bx, bx + BW) for y in range(by, by + BH)}
    mark = set()                                       # Markise mit Bögen unten
    mx0, mx1, my0, mh = bx - 8, bx + BW + 8, 10, 16
    STREIF = 12
    for x in range(mx0, mx1):
        i = (x - mx0) // STREIF
        u = (x - mx0) % STREIF
        bogen = round(4 * math.sin(math.pi * (u + 0.5) / STREIF))
        for y in range(my0, my0 + mh + bogen):
            mark.add((x, y))
    alles = brett | mark
    schatten(bild, alles, 3, 3, 0.35)
    for ring in rand(alles, 1):
        bild.menge(ring, '#2a1606')
    for ring in rand(alles, 2)[1:]:
        bild.menge(ring, '#fff4d8')
    # Brett: Bretter mit Maserung, Rahmen
    for (x, y) in brett:
        rx, ry = x - bx, y - by
        rahmen = min(rx, ry, BW - 1 - rx, BH - 1 - ry)
        c = ['#7a4a24', '#8a5a2e', '#94643a'][(ry // 9 + rx // 61) % 3]
        if ry % 9 == 8:
            c = '#5e3818'
        elif (rx * 3 + ry * 41) % 37 < 6 and ry % 3 == 1:
            c = '#6e4420'
        if rahmen < 4:
            c = '#5a3416' if rahmen in (0, 3) else '#a8743c' if rahmen == 1 else '#6e4420'
        bild.setz(x, y, c)
    # Markise rot-weiß (Rot nur als Streifen, wie am Stand im Spiel), Schatten an der Unterkante
    for (x, y) in mark:
        i = (x - mx0) // STREIF
        c = '#c8323e' if i % 2 == 0 else '#fff4e8'
        if (x, y + 1) not in mark or (x, y + 2) not in mark:
            c = '#8e1c28' if i % 2 == 0 else '#d8cbbc'
        elif (x, y - 1) not in mark or y < my0 + 2:
            c = '#e05a62' if i % 2 == 0 else '#ffffff'
        bild.setz(x, y, c)
    for x in range(mx0 - 1, mx1 + 1):                  # Schnee auf der Markise
        d = 2 + (x * 7 % 5 == 0) + (x % 13 == 0)
        for k in range(d):
            bild.setz(x, my0 - 1 + k, '#ffffff' if k < d - 1 else '#dce8f8')
        bild.setz(x, my0 - 2, '#ffffff' if x % 3 else '#dce8f8')
    # Text
    tx1 = bx + (BW - b1) // 2; ty1 = by + 14
    tx2 = bx + (BW - b2) // 2; ty2 = ty1 + 24 + 8
    t1 = verschiebe(z1, tx1, ty1); t2 = verschiebe(z2, tx2, ty2)
    for t in (t1, t2):
        schatten(bild, t, 2, 2, 0.45)
        bild.menge(rand(t, 1)[0], '#2a1606')
    for p, c in stufen(t1, ty1, 24, CREME).items():
        bild.setz(*p, c)
    for p, c in stufen(t2, ty2, 26, GOLD).items():
        bild.setz(*p, '#fffef4' if (p[0] + p[1]) % 41 in (0, 1, 2) else c)
    # Lichterkette: Draht in Bögen unter der Markise, Birnchen mit Schein
    FARBEN = ['#ffd04a', '#ff6a5a', '#5ad06a', '#6ab0ff', '#ffa040']
    haken = list(range(mx0 + 2, mx1, 34)) + [mx1 - 2]
    draht = []
    for a, b in zip(haken, haken[1:]):
        for x in range(a, b):
            t = (x - a) / (b - a)
            draht.append((x, my0 + mh + 3 + round(7 * 4 * t * (1 - t))))
    for (x, y) in draht:
        bild.setz(x, y, '#1c2a1c')
    for i, (x, y) in enumerate(draht[4::9]):
        f = FARBEN[i % len(FARBEN)]
        schein(bild, x, y + 3, 7, f, 0.45)
    for i, (x, y) in enumerate(draht[4::9]):
        f = FARBEN[i % len(FARBEN)]
        bild.setz(x, y + 1, '#3a3a3a')
        for dy in (2, 3, 4):
            for dx in (-1, 0, 1):
                if not (dy == 4 and dx != 0):
                    bild.setz(x + dx, y + dy, f)
        bild.setz(x - 1, y + 2, '#ffffff', 0.8)
    for cx, cy in ((tx2 + b2 + 3, ty2 + 4), (tx2 - 4, ty2 + 22), (tx2 + 70, ty2 - 3)):
        funkel(bild, cx, cy, 4)
    bild.png(os.path.join(ZIEL, 'logo_idee1_schild.png'), SK)

# ------------------------------------------------------------------ Idee 3: Plakette
def plakette():
    rnd = random.Random(24)
    R = 64
    zt, bt = text_grob('Punsch & Lichterglanz', 1)    # Schriftband in grober (= kleiner) Schrift
    BAND_W = bt + 22
    W = max(2 * R + 16, BAND_W + 26)
    H = 2 * R + 26
    cx, cy = W // 2, R + 8
    bild = Bild(W, H)
    scheibe = {(x, y) for y in range(cy - R, cy + R + 1) for x in range(cx - R, cx + R + 1) if math.hypot(x - cx + 0.5, y - cy + 0.5) <= R}
    ring = {(x, y) for y in range(cy - R - 5, cy + R + 6) for x in range(cx - R - 5, cx + R + 6) if R < math.hypot(x - cx + 0.5, y - cy + 0.5) <= R + 5}
    # Band
    by0 = cy + 34; bh = 18
    bx0 = cx - BAND_W // 2
    band = {(x, y) for x in range(bx0, bx0 + BAND_W) for y in range(by0, by0 + bh)}
    zipfel = set()
    for s in (-1, 1):                                  # Schwalbenschwanz-Enden, leicht nach hinten versetzt
        xa = bx0 - 12 if s < 0 else bx0 + BAND_W
        for x in range(xa, xa + 12):
            for y in range(by0 + 5, by0 + bh + 5):
                u = (x - xa) if s < 0 else (xa + 11 - x)
                if u < 6 and abs(y - (by0 + 5 + bh / 2)) < (6 - u) * 1.4:
                    continue                           # Kerbe
                zipfel.add((x, y))
    alles = scheibe | ring | band | zipfel
    schatten(bild, alles, 3, 3, 0.35)
    for r_ in rand(alles, 1):
        bild.menge(r_, '#1a1206')
    for r_ in rand(alles, 2)[1:]:
        bild.menge(r_, '#fff4d8')
    # Himmel
    for (x, y) in scheibe:
        t = (y - (cy - R)) / (2 * R)
        c1, c2 = hx('#0c1636'), hx('#3a4a80')
        bild.setz(x, y, tuple(c1[i] + (c2[i] - c1[i]) * t for i in range(3)))
    for _ in range(46):                                # Sterne
        x, y = cx + rnd.randint(-R, R), cy - R + rnd.randint(4, R)
        if (x, y) in scheibe:
            bild.setz(x, y, '#ffffff', rnd.choice((0.5, 0.7, 1.0)))
    for sx, sy in ((cx + 30, cy - 40), (cx - 8, cy - 50), (cx + 48, cy - 14)):
        funkel(bild, sx, sy, 2)
    mx, my = cx - 34, cy - 32                          # Mondsichel
    for y in range(my - 7, my + 8):
        for x in range(mx - 7, mx + 8):
            if math.hypot(x - mx, y - my) <= 6.5 and math.hypot(x - mx - 3, y - my + 2) > 5.5:
                bild.setz(x, y, '#fff2c0')
    schein(bild, mx, my, 14, '#fff2c0', 0.18)
    # Tannen am Horizont
    boden = lambda x: cy + 22 + round(2.5 * math.sin((x - cx) / 13))
    for tx, th in ((cx - 58, 20), (cx - 48, 28), (cx - 40, 18), (cx + 34, 22), (cx + 44, 30), (cx + 55, 20)):
        for k in range(th):
            w = k * 5 // 12 + 1
            for x in range(tx - w, tx + w + 1):
                if (x, boden(tx) - th + k) in scheibe:
                    bild.setz(x, boden(tx) - th + k, '#16264a' if x <= tx else '#1c2e58')   # Licht von links
    # Schnee-Boden
    for (x, y) in scheibe:
        if y >= boden(x):
            bild.setz(x, y, '#dfe8f6' if (x * 3 + y * 7) % 11 else '#c4d2ea')
            if y == boden(x):
                bild.setz(x, y, '#ffffff')
    # Haus
    hx0, hw, hb = cx - 30, 40, boden(cx - 10)
    wh = 22
    for y in range(hb - wh, hb):
        for x in range(hx0, hx0 + hw):
            c = '#e8d8b8' if (y - hb) % 4 else '#d8c4a0'
            if x == hx0 or x == hx0 + hw - 1:
                c = '#a8906c'
            bild.setz(x, y, c)
    for k in range(18):                                # Dach (Trapez) mit Schnee
        w = hw // 2 + 4 - k * 1.25
        y = hb - wh - 1 - k
        for x in range(round(hx0 + hw / 2 - w), round(hx0 + hw / 2 + w)):
            c = '#4a2e24' if k % 3 else '#3a2218'
            if k > 12:
                c = '#ffffff' if k > 13 else '#dce8f8'      # Schnee auf dem First
            bild.setz(x, y, c)
    for x in range(hx0 - 4, hx0 + hw + 4):             # Schneekante an der Traufe, Eiszapfen
        bild.setz(x, hb - wh - 1, '#ffffff'); bild.setz(x, hb - wh, '#dce8f8')
        if x % 5 == 0:
            bild.setz(x, hb - wh + 1, '#dce8f8')
    for y in range(hb - wh - 22, hb - wh - 9):         # Schornstein + Rauch
        for x in range(hx0 + 28, hx0 + 33):
            bild.setz(x, y, '#7a3a2a' if (y + x // 2) % 3 else '#5a2a1e')
    for x in range(hx0 + 27, hx0 + 34):
        bild.setz(x, hb - wh - 23, '#ffffff')
    for k in range(10):
        bild.setz(hx0 + 30 + round(2 * math.sin(k * 0.8)), hb - wh - 25 - k, '#ffffff', 0.5 - k * 0.04)
    for fx in (hx0 + 5, hx0 + 27):                     # Fenster mit Licht
        schein(bild, fx + 4, hb - 13, 11, '#ffd070', 0.35)
    for fx in (hx0 + 5, hx0 + 27):
        for y in range(hb - 17, hb - 9):
            for x in range(fx, fx + 8):
                c = '#ffe28a' if (x - fx) != 3 and (y - hb + 17) != 3 else '#6a4222'
                if y == hb - 17 or x == fx or x == fx + 7 or y == hb - 10:
                    c = '#6a4222'
                bild.setz(x, y, c)
    for y in range(hb - 14, hb):                       # Tür mit Kranz
        for x in range(hx0 + 16, hx0 + 23):
            bild.setz(x, y, '#5a3418' if x not in (hx0 + 16, hx0 + 22) else '#3a2210')
    for dx, dy in ((0, -2), (1, -1), (2, 0), (1, 1), (0, 2), (-1, 1), (-2, 0), (-1, -1)):
        bild.setz(hx0 + 19 + dx, hb - 10 + dy, '#2a7a3c')
    bild.setz(hx0 + 19, hb - 7, '#ffd04a')
    FARBEN = ['#ffd04a', '#ff6a5a', '#5ad06a', '#6ab0ff']   # Lichterkette an der Traufe
    for i, x in enumerate(range(hx0 - 2, hx0 + hw + 2, 3)):
        y = hb - wh + 1 + (i % 2)
        schein(bild, x, y, 3, FARBEN[i % 4], 0.35)
        bild.setz(x, y, FARBEN[i % 4])
    # Tanne mit Stern links vom Haus
    tx, tb = cx - 44, boden(cx - 44) - 1
    for k in range(26):
        w = (k % 7) * 4 // 7 + k // 4 + 1
        for x in range(tx - w, tx + w + 1):
            bild.setz(x, tb - 25 + k, '#1e6030' if (x + k) % 4 else '#2a7a3c')
        if k % 7 == 6:
            bild.setz(tx - w, tb - 25 + k, '#ffffff'); bild.setz(tx + w, tb - 25 + k, '#ffffff')
    for x in range(tx - 1, tx + 2):
        bild.setz(x, tb + 1, '#5a3418'); bild.setz(x, tb + 2, '#5a3418')
    for i, (dx, dy) in enumerate(((-3, -16), (3, -12), (-5, -6), (4, -3), (0, -9), (-2, -1))):
        bild.setz(tx + dx, tb + dy, FARBEN[i % 4])
    funkel(bild, tx, tb - 27, 2)
    # Punschtasse vorn rechts
    tasse(bild, cx + 12, cy + 4, rnd)
    # Goldring
    for (x, y) in ring:
        d = math.hypot(x - cx + 0.5, y - cy + 0.5) - R
        t = (y - (cy - R)) / (2 * R)
        st = min(7, max(0, int(t * 6) + (2 if d > 4 else 0) - (1 if d < 1.5 else 0)))
        bild.setz(x, y, GOLD[st])
    for a in range(0, 360, 30):                        # Nieten im Ring
        x = round(cx + (R + 2.5) * math.cos(math.radians(a))); y = round(cy + (R + 2.5) * math.sin(math.radians(a)))
        bild.setz(x, y, '#fffbe6')
    bild.menge(rand(scheibe, 1)[0] & ring, '#7a4a0e')
    # Band: Tannengrün mit Falten, Text in Creme
    for (x, y) in zipfel:
        bild.setz(x, y, '#12402a' if (y - by0) % 6 else '#0e3220')
    for (x, y) in band:
        c = '#2a7a48' if y < by0 + 2 else '#1e5e38' if y < by0 + bh - 3 else '#16482c'
        bild.setz(x, y, c)
    tx0, ty0 = bx0 + 11, by0 + 3
    t = verschiebe(zt, tx0, ty0)
    bild.menge(rand(t, 1)[0] & band, '#0a2414')
    for p, c in stufen(t, ty0, 12, ['#ffffff', '#fff2d8', '#fbe8c4', '#e8cc98'], False).items():
        bild.setz(*p, c)
    bild.png(os.path.join(ZIEL, 'logo_idee3_plakette.png'), SK)

# ------------------------------------------------------------------ Idee 4: ruhige Wortmarke
def marke():
    z1, b1 = text_fein('Punsch')
    z2, b2 = text_fein('Lichterglanz')
    TW = 26                                            # Platz für die Tasse statt des &
    w1 = b1 + 10 + TW
    W = max(w1, b2) + 30
    H = 24 + 10 + 30 + 26
    bild = Bild(W, H)
    x1, y1 = (W - w1) // 2, 14
    x2, y2 = (W - b2) // 2, y1 + 24 + 10
    t1 = verschiebe(z1, x1, y1); t2 = verschiebe(z2, x2, y2)
    alles = t1 | t2
    leuchten(bild, alles, '#ffc850', 9, 0.5)          # goldenes Leuchten
    schatten(bild, alles, 1, 2, 0.35)
    bild.menge(rand(alles, 1)[0], '#4a2e12', 0.85)
    for p, c in stufen(t1, y1, 24, CREME).items():
        bild.setz(*p, c)
    for p, c in stufen(t2, y2, 26, ['#ffffff', '#fffbe6', '#fff2c8', '#ffe8a8', '#f8d888', '#ecc470']).items():
        bild.setz(*p, c)
    tasse(bild, x1 + b1 + 10, y1 + 1, None)
    for cx, cy, a in ((x2 + b2 + 4, y2 + 3, 4), (x2 - 6, y2 + 20, 3), (x2 + 120, y2 - 4, 3)):
        funkel(bild, cx, cy, a)
    bild.png(os.path.join(ZIEL, 'logo_idee4_wortmarke.png'), SK)

schild(); plakette(); marke()
print('ok')
