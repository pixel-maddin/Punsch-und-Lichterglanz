"""Pixel-Logo „Punsch & Lichterglanz“ (reines Python, kein Pillow), transparenter Hintergrund.
Die Buchstaben sind von Hand gepixelt und werden per Scale2x auf doppelte Auflösung gebracht (feinere
Pixel, runde Kanten); erst danach kommen Farben, Kontur, Schnee, Nadeln und Glitzer - so sind auch die
Details fein. Aufruf: logo.py ziel.png [skala] [farbe]   farbe = blau | violett | braun | rot"""
import struct, sys, zlib

S = int(sys.argv[2]) if len(sys.argv) > 2 else 5
FARBE = sys.argv[3] if len(sys.argv) > 3 else 'blau'

# --- Grobe Buchstaben: 12 Zeilen bis zur Grundlinie (3 Oberlänge + 9 x-Höhe), Unterlänge 3 extra
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
}
AMP = ['.....####......',   # & als Zweig, 15 x 15, ragt 3 Zeilen über die Großbuchstaben
       '....######.....',
       '...##....##....',
       '...##....##....',
       '...##...##.....',
       '....##.##......',
       '.....###.......',
       '....##.##...##.',
       '...##...##.##..',
       '..##.....###...',
       '..##......##...',
       '..##.....####..',
       '...##...##..##.',
       '....#####....##',
       '.....###......#']

ABSTAND, RAND = 2, 4
def breite(wort):
    return sum(len(G[c][0]) for c in wort) + (len(wort) - 1) * ABSTAND

grob = {}
def setze_wort(wort, x0, y0, art):
    x = x0
    for ch in wort:
        for dy, z in enumerate(G[ch]):
            for dx, c in enumerate(z):
                if c == '#':
                    grob[(x + dx, y0 + dy)] = art
        x += len(G[ch][0]) + ABSTAND
    return x - ABSTAND

b1 = breite('Punsch') + 3 + len(AMP[0])
b2 = breite('Lichterglanz')
Wg = max(b1, b2) + 2 * RAND
y1, y2 = RAND + 3, RAND + 3 + 12 + 4
ende = setze_wort('Punsch', RAND + (Wg - 2 * RAND - b1) // 2, y1, 'wort')
ax = ende + 3
for dy, z in enumerate(AMP):
    for dx, c in enumerate(z):
        if c == '#':
            grob[(ax + dx, y1 - 3 + dy)] = 'zweig'
lx = RAND + (Wg - 2 * RAND - b2) // 2
setze_wort('Lichterglanz', lx, y2, 'gold')
Hg = y2 + 15 + RAND

# --- Scale2x (EPX): jede Grobzelle wird 2 x 2, schräge Kanten bekommen Ein-Pixel-Stufen
pix = {}
for y in range(-1, Hg + 1):
    for x in range(-1, Wg + 1):
        P = grob.get((x, y)); A = grob.get((x, y - 1)); B = grob.get((x + 1, y)); C = grob.get((x - 1, y)); D = grob.get((x, y + 1))
        e = [P, P, P, P]
        if C == A and C != D and A != B: e[0] = A
        if A == B and A != C and B != D: e[1] = B
        if D == C and D != B and C != A: e[2] = C
        if B == D and B != A and D != C: e[3] = D
        for i, v in enumerate(e):
            if v:
                pix[(2 * x + i % 2, 2 * y + i // 2)] = v
W, H = 2 * Wg, 2 * Hg
Y1, Y2, AX, LX = 2 * y1, 2 * y2, 2 * ax, 2 * lx

def hx(s):
    return (int(s[1:3], 16), int(s[3:5], 16), int(s[5:7], 16))

bild = [[None] * W for _ in range(H)]
def setz(x, y, c, a=255):
    if 0 <= x < W and 0 <= y < H:
        bild[y][x] = (*c, a)

# --- Nadeln am Zweig: kurze schräge Striche (2 px) nach außen, an jeder zweiten Randstelle - nur ins
# Freie, nicht in die Löcher des & (sonst liest es sich nicht mehr als &)
draussen, offen = set(), [(0, 0)]
while offen:
    x, y = offen.pop()
    if (x, y) in draussen or (x, y) in pix or not (-2 <= x <= W + 1 and -2 <= y <= H + 1):
        continue
    draussen.add((x, y))
    offen += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
nadeln = {}
for (x, y), art in list(pix.items()):
    if art != 'zweig' or (x * 3 + y * 5) % 2:
        continue
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        if (x + dx, y + dy) not in pix:
            s = 1 if (x * 7 + y * 3) % 4 < 2 else -1
            for k in (1, 2):
                n = (x + dx * k + (s * k if dy else 0), y + dy * k + (s * k if dx else 0))
                if n in draussen:
                    nadeln[n] = 'nadel'
            break
pix.update(nadeln)

# --- Farben für „Punsch“ (fünf Stufen von oben nach unten, Lichtkante, Kontur)
PALETTEN = {
    'blau':    (['#5f8ee0', '#4472c8', '#3258a8', '#24438a', '#18306a'], '#a8c8ff', '#0a1432'),
    'violett': (['#a46ad2', '#8a4cba', '#70369e', '#582680', '#401862'], '#dcb0f6', '#1c0830'),
    'braun':   (['#c98a4a', '#ad6c32', '#8f5222', '#733e16', '#582c0c'], '#f0c088', '#261004'),
    'rot':     (['#c43444', '#a8202e', '#8e1624', '#741020', '#5c0a18'], '#e05a62', '#2e060c'),
}
WORT, WORT_LICHT, WORT_KONTUR = PALETTEN[FARBE]
WORT = [hx(c) for c in WORT]

# --- Kontur 2 px dunkel, 2 px Creme, 2 px Schatten (alles in feinen Pixeln)
KONTUR = {'wort': hx(WORT_KONTUR), 'gold': hx('#3e2206'), 'zweig': hx('#0c2412'), 'nadel': hx('#0c2412')}
def ring(innen, aussen_von):
    neu = {}
    for (x, y) in aussen_von:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                n = (x + dx, y + dy)
                if n not in innen and n not in neu:
                    neu[n] = aussen_von[(x, y)] if isinstance(aussen_von, dict) else True
    return neu
k1 = ring(pix, {p: KONTUR[a] for p, a in pix.items()})
belegt = {**pix, **k1}
k2 = ring(belegt, k1)                 # zweiter dunkler Ring (gleiche Farbe)
belegt.update(k2)
c1 = ring(belegt, dict.fromkeys(set(k2) | set(k1), 1)); belegt.update(c1)
c2 = ring(belegt, c1); belegt.update(c2)
for (x, y) in list(belegt):           # Schatten nach unten rechts
    for n in ((x + 2, y + 2), (x + 1, y + 2), (x + 2, y + 1), (x, y + 2)):
        if n not in belegt:
            setz(*n, (20, 14, 40), 105)
for p in list(c1) + list(c2):
    setz(*p, hx('#fff4d8'))
for p, c in {**k1, **k2}.items():
    setz(*p, c if p in k1 else k1.get(p, c))
for p in k2:
    # Farbe vom nächsten Nachbarn im ersten Ring übernehmen
    x, y = p
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            if (x + dx, y + dy) in k1:
                setz(x, y, k1[(x + dx, y + dy)]); break

# --- Punsch
oben = {}
for (x, y), art in pix.items():
    if art == 'wort':
        oben[x] = min(oben.get(x, 999), y)
for (x, y), art in pix.items():
    if art != 'wort':
        continue
    st = min(4, (y - Y1) * 5 // 24)
    c = WORT[st]
    if (x, y - 1) not in pix and y - Y1 < 10:
        c = hx(WORT_LICHT)
    elif (x - 1, y) not in pix and y - Y1 < 18:
        c = WORT[max(0, st - 1)]             # linke Kante etwas heller
    elif (x + 1, y) not in pix or (x, y + 1) not in pix:
        c = WORT[min(4, st + 1)]             # rechte und untere Kante dunkler
    setz(x, y, c)
# Schneekappe: 2-4 px dick auf der obersten Kante je Spalte, mit Tropfen
for x, y in oben.items():
    if y - Y1 >= 10:
        continue
    dicke = 2 + (x * 7 // 3) % 3 // 2 + (1 if x % 9 == 0 else 0)
    for k in range(dicke):
        if (x, y + k) in pix:
            setz(x, y + k, hx('#ffffff') if k < dicke - 1 else hx('#dce8f8'))
    if (x, y - 1) not in pix:
        setz(x, y - 1, hx('#ffffff'))
    if x % 11 == 3:                          # Tropfen
        for k in range(dicke, dicke + 3):
            if (x, y + k) in pix:
                setz(x, y + k, hx('#ffffff') if k < dicke + 2 else hx('#dce8f8'))

# --- Lichterglanz: Gold in feinen Bändern, Lichtkante, schräger Glanz
GOLD = [hx(c) for c in ('#fff8d0', '#fff0a0', '#ffe070', '#ffd04a', '#f4bc32', '#e4a424', '#cc8a18', '#b07012', '#90560c')]
for (x, y), art in pix.items():
    if art != 'gold':
        continue
    st = min(8, max(0, (y - Y2 - 2) * 9 // 26))
    c = GOLD[st]
    if (x, y - 1) not in pix:
        c = hx('#fffcec')
    elif (x + 1, y) not in pix or (x, y + 1) not in pix:
        c = GOLD[min(8, st + 2)]
    elif (x - 1, y) not in pix:
        c = GOLD[max(0, st - 1)]
    d = (x + y) % 37
    if d in (0, 1, 2) or (d == 5 and st < 6):  # Glanzstreifen: breit + schmal
        c = hx('#fffef4')
    setz(x, y, c)

# --- Zweig: Holz in der Mitte, Nadeln in drei Grüns, Schnee, Beeren
innen = {p for p, a in pix.items() if a == 'zweig' and all(pix.get((p[0] + dx, p[1] + dy)) == 'zweig' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
GR = [hx('#1c5a2c'), hx('#2a7a3c'), hx('#3e9a4e'), hx('#5ab862')]
for (x, y), art in pix.items():
    if art == 'nadel':
        setz(x, y, GR[3] if (x + 2 * y) % 3 == 0 else GR[2] if (x + y) % 2 else GR[1])
    elif art == 'zweig':
        if (x, y) in innen and (x * 3 + y) % 4:
            c = hx('#7a4a22') if (x + y) % 3 else hx('#9a6232')
        else:
            c = GR[(x + y) % 2] if (x, y - 1) in pix else GR[2]
        setz(x, y, c)
for (x, y), art in pix.items():                      # Schneeflocken-Tupfer oben auf dem Zweig
    if art == 'zweig' and (x, y - 1) not in pix and (x * 5 + y) % 7 == 0:
        setz(x, y, hx('#ffffff')); setz(x + 1, y, hx('#e4eefa'))
BEERE = ['.##.', '####', '####', '.##.']
for bx, by in ((AX + 20, Y1 + 3), (AX + 24, Y1 + 6), (AX + 19, Y1 + 8)):
    for dy, z in enumerate(BEERE):
        for dx, ch in enumerate(z):
            if ch == '#':
                setz(bx + dx, by + dy, hx('#8a1018') if dx == 3 or dy == 3 else hx('#d42a34'))
    setz(bx + 1, by + 1, hx('#ffb0b0'))

# --- Funkelsterne (fein: Arme 3-5 px, Mitte weiß, schräge Glitzer)
def funkel(cx, cy, gross):
    arm = 5 if gross else 3
    for k in range(1, arm + 1):
        f = hx('#ffffff') if k <= arm // 2 else hx('#fff1a0')
        for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
            setz(cx + dx, cy + dy, f, 255 if k < arm else 170)
    setz(cx, cy, hx('#ffffff'))
    for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
        setz(cx + dx, cy + dy, hx('#fff6c8'), 210)
        if gross:
            setz(cx + 2 * dx, cy + 2 * dy, hx('#fff1a0'), 120)

for cx, cy, gr in ((LX - 5, Y2 + 4, True), (LX + 44, Y2 - 2, False), (LX + 95, Y2 + 6, True),
                   (LX + 2 * b2 + 3, Y2 + 14, True), (LX + 126, Y2 + 27, False), (LX + 24, Y2 + 28, False),
                   (LX + 160, Y2 + 2, False), (AX + 33, Y1 - 6, False)):
    funkel(cx, cy, gr)

def png(pfad):
    roh = bytearray()
    for y in range(H * S):
        roh.append(0)
        z = bild[y // S]
        for x in range(W * S):
            roh.extend(z[x // S] or (0, 0, 0, 0))
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(pfad, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W * S, H * S, 8, 6, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(bytes(roh), 9)) + chunk(b'IEND', b''))

png(sys.argv[1])
print('ok', FARBE, W * S, H * S)
