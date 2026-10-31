"""Pixel-Logo „Punsch & Lichterglanz“: Punsch dunkelrot mit Schneekappe, & als Fichtenzweig,
Lichterglanz golden mit Glanzstreifen und Glitzersternen. Transparenter Hintergrund, RGBA-PNG ohne Pillow.
Aufruf: logo.py ziel.png [skala]"""
import struct, sys, zlib

S = int(sys.argv[2]) if len(sys.argv) > 2 else 10

# Buchstaben: 12 Zeilen hoch bis zur Grundlinie (3 Oberlänge + 9 x-Höhe), Unterlänge 3 Zeilen extra
X = ['......'] * 3   # Platzhalter für Oberlänge bei Kleinbuchstaben
def klein(zeilen, unten=()):
    b = len(zeilen[0])
    return ['.' * b] * 3 + list(zeilen) + list(unten)

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
# Das & als Zweig-Maske (13 breit, 12 hoch wie die Großbuchstaben)
AMP = ['.....####......',   # 15 x 15, Strich 2 px - ragt 3 Zeilen über die Großbuchstaben
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

def hx(s):
    return (int(s[1:3], 16), int(s[3:5], 16), int(s[5:7], 16))

# Zeilen setzen: Liste von (x, y, art) mit art = 'rot' | 'gold' | 'zweig'
pix = {}
def setze_wort(wort, x0, y0, art):
    x = x0
    for ch in wort:
        gl = G[ch]
        for dy, z in enumerate(gl):
            for dx, c in enumerate(z):
                if c == '#':
                    pix[(x + dx, y0 + dy)] = art
        x += len(gl[0]) + ABSTAND
    return x - ABSTAND

def breite(wort):
    return sum(len(G[c][0]) for c in wort) + (len(wort) - 1) * ABSTAND

RAND = 5
ABSTAND = 2   # zwischen den Buchstaben - mit 1 liefen die Konturen zusammen
b1 = breite('Punsch') + 3 + len(AMP[0])
b2 = breite('Lichterglanz')
W = max(b1, b2) + 2 * RAND
y1, y2 = RAND + 3, RAND + 3 + 12 + 4
x1 = RAND + (W - 2 * RAND - b1) // 2
ende = setze_wort('Punsch', x1, y1, 'rot')
ax = ende + 3
for dy, z in enumerate(AMP):
    for dx, c in enumerate(z):
        if c == '#':
            pix[(ax + dx, y1 - 3 + dy)] = 'zweig'
setze_wort('Lichterglanz', RAND + (W - 2 * RAND - b2) // 2, y2, 'gold')
H = y2 + 15 + RAND

bild = [[None] * W for _ in range(H)]
def setz(x, y, c, a=255):
    if 0 <= x < W and 0 <= y < H:
        bild[y][x] = (*c, a)

# Zweig: Nadeln als Zacken nach außen (vor der Kontur, damit sie mit umrandet werden)
nadeln = {}
for (x, y), art in list(pix.items()):
    if art != 'zweig' or (x * 5 + y * 3) % 3:
        continue
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        if (x + dx, y + dy) not in pix:
            # Nadel schräg nach außen (quer zur Richtung, abwechselnd)
            s = 1 if (x + y) % 2 else -1
            n = (x + dx + (s if dy else 0), y + dy + (s if dx else 0))
            if n not in pix:
                nadeln[n] = 'nadel'
            break
pix.update(nadeln)

# Kontur 1 px dunkel (8er-Nachbarschaft), dann 1 px Creme außen, dann leichter Schatten
KONTUR = {'rot': hx('#2e060c'), 'gold': hx('#3e2206'), 'zweig': hx('#0c2412'), 'nadel': hx('#0c2412')}
kontur, aussen = {}, set()
for (x, y), art in pix.items():
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            n = (x + dx, y + dy)
            if n not in pix and n not in kontur:
                kontur[n] = KONTUR[art]
for (x, y) in list(kontur):
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            n = (x + dx, y + dy)
            if n not in pix and n not in kontur:
                aussen.add(n)
for (x, y) in aussen | set(kontur) | set(pix):      # Schatten 1 px nach unten rechts
    for n in ((x + 1, y + 1), (x, y + 1)):
        if n not in pix and n not in kontur and n not in aussen:
            setz(*n, (24, 16, 40), 110)
for (x, y) in aussen:
    setz(x, y, hx('#fff4d8'))
for (x, y), c in kontur.items():
    setz(x, y, c)

# Punsch: Dunkelrot von oben nach unten, Lichtkante oben, Schneekappe auf der obersten Kante je Spalte
ROT = [hx('#c43444'), hx('#a8202e'), hx('#8e1624'), hx('#741020'), hx('#5c0a18')]
oben_je_spalte = {}
for (x, y), art in pix.items():
    if art == 'rot':
        oben_je_spalte[x] = min(oben_je_spalte.get(x, 99), y)
for (x, y), art in pix.items():
    if art != 'rot':
        continue
    stufe = min(4, (y - y1) * 5 // 12)
    c = ROT[stufe]
    if (x, y - 1) not in pix and y - y1 < 5:
        c = hx('#e05a62')                            # Licht auf den oberen Kanten (unten wirkte es wie Streifen)
    if (x + 1, y) not in pix and (x, y - 1) in pix:
        c = ROT[min(4, stufe + 1)]                   # rechte Kante etwas dunkler
    setz(x, y, c)
for x, y in oben_je_spalte.items():                  # Schnee: nur die oberste Kante, mit kleinen Tropfen
    if y - y1 < 6:
        setz(x, y, hx('#ffffff')); setz(x, y - 1, hx('#ffffff')) if (x, y - 1) not in pix else None
        if (x * 7) % 5 == 0 and (x, y + 1) in pix:
            setz(x, y + 1, hx('#e4eefa'))

# Lichterglanz: Gold in Bändern, Glanzstreifen schräg, Lichtkante oben
GOLD = [hx('#fff6c0'), hx('#ffe680'), hx('#ffd24a'), hx('#f0b52c'), hx('#d8961c'), hx('#b87612'), hx('#94580c')]
for (x, y), art in pix.items():
    if art != 'gold':
        continue
    stufe = min(6, max(0, (y - y2 - 1) * 7 // 13))
    c = GOLD[stufe]
    if (x, y - 1) not in pix:
        c = hx('#fffbe8')
    elif (x + 1, y) not in pix:
        c = GOLD[min(6, stufe + 1)]
    if (x + y) % 17 in (0, 1) or (x + y) % 17 == 3 and stufe < 4:   # schräger Glanz
        c = hx('#fffdf0')
    setz(x, y, c)

# Zweig: Nadeln in zwei Grüns, Zweig in der Mitte braun, Schnee oben, rote Beeren
GRUEN = [hx('#2a7a3c'), hx('#1e6030'), hx('#3e9a4e')]
for (x, y), art in pix.items():
    if art == 'nadel':
        setz(x, y, GRUEN[2] if (x + y) % 2 else GRUEN[0])
    elif art == 'zweig':
        c = hx('#7a4a22') if (x * 2 + y) % 5 == 0 else GRUEN[(x + y) % 2]
        if (x, y - 1) not in pix:
            c = GRUEN[2]
        setz(x, y, c)
for (x, y), art in pix.items():                      # Schneetupfer auf den Oberkanten des Zweigs
    if art == 'zweig' and (x, y - 1) not in pix and (x * 5 + y) % 3 == 0:
        setz(x, y - 1 if (x, y - 1) not in kontur else y, hx('#ffffff'))
for bx, by in ((ax + 10, y1 + 2), (ax + 12, y1 + 3)):
    for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
        setz(bx + dx, by + dy, hx('#d0202c') if (dx, dy) != (1, 1) else hx('#7a0c14'))
    setz(bx, by, hx('#ff9a9a'))

# Glitzersterne um und auf „Lichterglanz“
def funkel(cx, cy, gross):
    arme = 3 if gross else 2
    for k in range(1, arme + 1):
        f = hx('#ffffff') if k == 1 else hx('#fff1a0')
        for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
            setz(cx + dx, cy + dy, f)
    setz(cx, cy, hx('#ffffff'))
    if gross:
        for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            setz(cx + dx, cy + dy, hx('#fff1a0'), 200)

lx = RAND + (W - 2 * RAND - b2) // 2
for cx, cy, gr in ((lx - 2, y2 + 2, True), (lx + 22, y2 - 1, False), (lx + 47, y2 + 3, True),
                   (lx + b2 + 1, y2 + 7, True), (lx + 62, y2 + 13, False), (lx + 12, y2 + 14, False),
                   (ax + 16, y1 - 3, False)):
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
print('ok', W * S, H * S)
