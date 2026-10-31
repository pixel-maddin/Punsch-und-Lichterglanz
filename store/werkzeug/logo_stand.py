"""Logo „Punsch & Lichterglanz“ als Punschstand in echten Spielpixeln (wie im Spiel, 3x5-Schrift aus
pixel.js), transparenter Hintergrund, ganzzahlig hochgezogen.
Aufruf: logo_stand.py ziel.png [skala] [stand|schild|zeile]   schild = nur das Schild mit Lichterkette darunter,
zeile = nur der Schriftzug einzeilig (für den Menükopf auf hellem Grund)"""
import math, os, re, struct, sys, zlib

ZIEL = sys.argv[1]
SK = int(sys.argv[2]) if len(sys.argv) > 2 else 16
MODUS = sys.argv[3] if len(sys.argv) > 3 else 'stand'

# 3x5-Schrift direkt aus dem Spiel lesen, damit sie gleich bleibt
js = open(os.path.join(os.path.dirname(__file__), '..', '..', 'web', 'src', 'pixel.js'), encoding='utf-8').read()
block = js[js.index('const GLYPH = {'):js.index('};', js.index('const GLYPH = {'))]
GLYPH = {m.group(1): re.findall(r"'([01]+)'", m.group(2)) for m in re.finditer(r"'(.)': \[([^\]]*)\]", block)}
GLYPH['&'] = ['01000', '10100', '01001', '10110', '01101']   # das 3x5-& des Spiels liest sich als 8

def text_breite(s):
    return sum(len(GLYPH[ch][0]) + 1 for ch in s) - 1

def text_pixel(s, x0, y0):
    m, x = set(), x0
    for ch in s:
        g = GLYPH[ch]
        for dy, z in enumerate(g):
            for dx, c in enumerate(z):
                if c == '1':
                    m.add((x + dx, y0 + dy))
        x += len(g[0]) + 1
    return m

def hx(s):
    return (int(s[1:3], 16), int(s[3:5], 16), int(s[5:7], 16))

def zeile():
    """Schriftzug einzeilig auf einer schmalen dunklen Holzleiste (wie das Schild): PUNSCH & in Creme,
    LICHTERGLANZ in Gold. Ohne Leiste verschmolz die Kontur um das Gold zu einer halben Platte."""
    t1, t2 = 'PUNSCH &', 'LICHTERGLANZ'
    b1 = text_breite(t1)
    w, h = b1 + 4 + text_breite(t2) + 8, 11
    m1 = text_pixel(t1, 4, 3); m2 = text_pixel(t2, 4 + b1 + 4, 3)
    px = {}
    for y in range(h):
        for x in range(w):
            if (x in (0, w - 1)) and (y in (0, h - 1)):
                continue                                     # runde Ecken
            rand = x in (0, w - 1) or y in (0, h - 1)
            c = '#2a1606' if rand else '#8a5a2e' if y == 1 or x == 1 else '#5a3418' if y == h - 2 or x == w - 2 else ('#3a2414' if y % 4 else '#32200f')
            px[(x, y)] = hx(c)
    for (x, y) in m1 | m2:
        px[(x + 1, y + 1)] = hx('#1a0e06')                   # Schatten wie pixText im Spiel
    GOLD = ['#fff0a0', '#ffd84a', '#f4bc32', '#e0a024', '#c48416']
    for (x, y) in m1:
        px[(x, y)] = hx('#ffffff') if y == 3 else hx('#fff2d8')
    for (x, y) in m2:
        px[(x, y)] = hx(GOLD[y - 3])
    roh = bytearray()
    for y in range(h * SK):
        roh.append(0)
        for x in range(w * SK):
            c = px.get((x // SK, y // SK))
            roh.extend((*c, 255) if c else (0, 0, 0, 0))
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(ZIEL, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w * SK, h * SK, 8, 6, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(bytes(roh), 9)) + chunk(b'IEND', b''))
    print('ok zeile', w * SK, h * SK)
    sys.exit(0)

if MODUS == 'zeile':
    zeile()

W, H = 74, (54 if MODUS == 'stand' else 36)   # mit Rand für Umriss, Schatten und Funkeln
bild = [[None] * W for _ in range(H)]
def setz(x, y, c, a=1.0):
    if not (0 <= x < W and 0 <= y < H) or a <= 0:
        return
    c = hx(c) if isinstance(c, str) else c
    alt = bild[y][x]
    if alt is None or a >= 1:
        bild[y][x] = (*c, a if alt is None else max(a, alt[3]))
        if alt is not None and a < 1:
            pass
        return
    r0, g0, b0, a0 = alt
    ao = a + a0 * (1 - a)
    f = lambda n, o: (n * a + o * a0 * (1 - a)) / ao
    bild[y][x] = (f(c[0], r0), f(c[1], g0), f(c[2], b0), ao)
def r(x, y, w, h, c, a=1.0):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            setz(xx, yy, c, a)

# ------------------------------------------------------------ Maße (Spielpixel)
TX = 'LICHTERGLANZ'
tb = text_breite(TX)                         # 48
SW, SH = tb + 8, 18                          # Schild
SX, SY = (W - SW) // 2, 6
MX0, MX1, MY = 6, W - 6, SY + SH + 3         # Markise
STAND_Y = MY + 8                             # Oberkante Stand (unter der Markise)
STAND_X0, STAND_X1 = 10, W - 10
O = 3   # Versatz der fest gesetzten Teile gegenüber der ersten Fassung

if MODUS == 'stand':
    # ------------------------------------------------------------ Stand (wie im Spiel: Holz, dunkle Öffnung, Theke)
    r(STAND_X0, STAND_Y, STAND_X1 - STAND_X0, 15, '#2a1a10')                 # dunkle Öffnung
    for x in range(STAND_X0, STAND_X1):                                      # Rückwand mit Brettern
        for y in range(STAND_Y, STAND_Y + 7):
            setz(x, y, '#4a2c16' if (x - STAND_X0) % 6 else '#3a2210')
    r(STAND_X0 + 2, STAND_Y + 1, STAND_X1 - STAND_X0 - 4, 1, '#5a3a1e')      # Regalbrett
    # zwei Wichtel hinter der Theke
    for wx, mf in ((20 + O, '#3aa84a'), (44 + O, '#c82828')):
        r(wx, STAND_Y + 3, 3, 1, mf); setz(wx + 1, STAND_Y + 2, mf); setz(wx + 2, STAND_Y + 1, '#ffffff')
        r(wx, STAND_Y + 4, 3, 2, '#f2c9a0'); setz(wx, STAND_Y + 5, '#2a1a10'); setz(wx + 2, STAND_Y + 5, '#2a1a10')
        r(wx, STAND_Y + 6, 3, 1, mf)
    r(STAND_X0 - 1, STAND_Y + 7, STAND_X1 - STAND_X0 + 2, 2, '#a8703a')     # Thekenplatte
    r(STAND_X0 - 1, STAND_Y + 7, STAND_X1 - STAND_X0 + 2, 1, '#c08a50')
    r(STAND_X0 - 1, STAND_Y + 6, STAND_X1 - STAND_X0 + 2, 1, '#f6f9fc')     # Schnee auf der Theke
    for x in range(STAND_X0, STAND_X1):                                      # Front: senkrechte Bretter
        for y in range(STAND_Y + 9, STAND_Y + 15):
            setz(x, y, '#8a5a2e' if (x - STAND_X0) % 5 else '#6a4222')
        setz(x, STAND_Y + 9, '#5a3618')
    r(STAND_X0, STAND_Y + 14, STAND_X1 - STAND_X0, 1, '#5a3618')
    for mx, f in ((27 + O, '#c82828'), (33 + O, '#f4f4f4'), (39 + O, '#3a62b8')):        # dampfende Tassen auf der Theke
        r(mx, STAND_Y + 4, 3, 3, f); setz(mx + 3, STAND_Y + 5, f); r(mx, STAND_Y + 4, 3, 1, '#7a2a40')
        setz(mx + 1, STAND_Y + 2, '#eef2f6', 0.8); setz(mx + 2, STAND_Y + 1, '#eef2f6', 0.5)
    # Tannengirlande mit roten Schleifen an der Theke (wie Stand-Girlande im Spiel)
    for x in range(STAND_X0 - 1, STAND_X1 + 1):
        y = STAND_Y + 9 + (1 if (x - STAND_X0) % 8 in (2, 3, 4, 5) else 0) + (1 if (x - STAND_X0) % 8 in (3, 4) else 0)
        setz(x, y, '#1e6030' if x % 2 else '#2a7a3c'); setz(x, y + 1, '#1e6030', 0.8)
    for x in range(STAND_X0 + 3, STAND_X1, 8):
        setz(x, STAND_Y + 9, '#d02a34'); setz(x - 1, STAND_Y + 10, '#d02a34'); setz(x + 1, STAND_Y + 10, '#d02a34')

    # ------------------------------------------------------------ Markise rot-weiß mit Bögen, Schnee
    for x in range(MX0, MX1):
        i = (x - MX0) // 4
        u = (x - MX0) % 4
        unten = MY + 6 + (1 if u in (1, 2) else 0)
        for y in range(MY, unten):
            rot = i % 2 == 0
            c = '#c82828' if rot else '#f4f4f4'
            if y == MY:
                c = '#e05050' if rot else '#ffffff'
            elif y >= unten - 1:
                c = '#8e1c1c' if rot else '#c8c8d0'
            setz(x, y, c)
        setz(x, MY - 1, '#f6f9fc')                                           # Schnee
        if x % 5 == 0:
            setz(x, MY - 2, '#ffffff')
    for x in range(MX0 - 1, MX1 + 1):
        setz(x, MY - 1, '#ffffff' if x % 3 else '#dce8f8')
    # Lichterkette an der Markisenkante: Birnchen mit kleinem Schein
    FARBEN = ['#ffd84a', '#ff5a5a', '#5ad06a', '#6ab0ff']
    for i, x in enumerate(range(MX0 + 1, MX1, 3)):
        y = MY + 8 + (i % 2)
        f = FARBEN[i % 4]
        setz(x, y, f)


# ------------------------------------------------------------ Schild auf der Markise (wie im Spiel, nur größer)
if MODUS == 'stand':
    r(SX + 6, SY + SH, 1, 3, '#6a4222'); r(SX + SW - 7, SY + SH, 1, 3, '#6a4222')   # Pfosten
r(SX, SY, SW, SH, '#6a4222')                                             # Rahmen
r(SX, SY, SW, 1, '#8a5a2e')
r(SX + 1, SY + 1, SW - 2, SH - 2, '#3a2414')                             # dunkles Brett, damit Gold leuchtet
for y in range(SY + 1, SY + SH - 1):
    for x in range(SX + 1, SX + SW - 1):
        if (y - SY) % 4 == 0:
            setz(x, y, '#32200f')
        elif (x * 7 + y * 13) % 23 == 0:
            setz(x, y, '#4a2e18')
for x in range(SX - 1, SX + SW + 1):                                     # Schneekappe mit Tropfen
    setz(x, SY - 1, '#ffffff')
    if x % 4 == 1:
        setz(x, SY - 2, '#ffffff')
    if x % 7 == 3 and SX < x < SX + SW - 1:
        setz(x, SY, '#dce8f8')
# Zeile 1: PUNSCH & in Creme, Zeile 2: LICHTERGLANZ in Gold mit Schein
z1 = 'PUNSCH &'
t1 = text_pixel(z1, SX + (SW - text_breite(z1)) // 2, SY + 3)
t2 = text_pixel(TX, SX + (SW - tb) // 2, SY + 10)
for (x, y) in t1 | t2:
    setz(x + 1, y + 1, '#1a0e06')                                        # Schatten wie pixText im Spiel
for (x, y) in t1:
    setz(x, y, '#fff2d8' if (x, y - 1) in t1 else '#ffffff')
GOLD = ['#fff6c0', '#ffe070', '#ffcc40', '#f0b030', '#d8961c']
y2 = SY + 10
for (x, y) in t2:
    setz(x, y, GOLD[y - y2])
# ------------------------------------------------------------ Umriss: 1 px dunkel, 1 px Creme (Sticker) um alles Deckende
deckend = {(x, y) for y in range(H) for x in range(W) if bild[y][x] and bild[y][x][3] > 0.5}
ring1 = {(x + dx, y + dy) for x, y in deckend for dx in (-1, 0, 1) for dy in (-1, 0, 1)} - deckend
ring2 = {(x + dx, y + dy) for x, y in ring1 for dx in (-1, 0, 1) for dy in (-1, 0, 1)} - deckend - ring1
for p in ring2:
    if 0 <= p[0] < W and 0 <= p[1] < H:
        bild[p[1]][p[0]] = (*hx('#fff4d8'), 1.0)
for p in ring1:
    if 0 <= p[0] < W and 0 <= p[1] < H:
        bild[p[1]][p[0]] = (*hx('#1a0e06'), 1.0)

# Kerben im Creme-Rand schließen (sonst landeten dort einzelne graue Schattenpixel)
for _ in range(2):
    voll = {(x, y) for y in range(H) for x in range(W) if bild[y][x] and bild[y][x][3] > 0.5}
    for y in range(H):
        for x in range(W):
            if (x, y) not in voll and sum((x + dx, y + dy) in voll for dx in (-1, 0, 1) for dy in (-1, 0, 1)) >= 5:
                bild[y][x] = (*hx('#fff4d8'), 1.0)
aussen = {(x, y) for y in range(H) for x in range(W) if bild[y][x] and bild[y][x][3] > 0.5}
for (x, y) in list(aussen):
    for p in ((x + 1, y + 1), (x + 1, y + 2)):   # nur nach rechts unten versetzt, sonst Einzelpunkte an Ecken
        if p not in aussen and 0 <= p[0] < W and 0 <= p[1] < H:
            bild[p[1]][p[0]] = (20, 14, 40, 0.35)

def kette():
    """Nur das Schild: Lichterkette in drei Bögen unter der Unterkante, Birnchen 1 x 2. Kommt NACH Umriss
    und Schatten - mit Umriss wurde die Kette zu einem schwarzen Klotz."""
    FARBEN = ['#ffd84a', '#ff5a5a', '#5ad06a', '#6ab0ff']
    haken = [SX + 1, SX + SW // 3, SX + 2 * SW // 3, SX + SW - 2]
    draht = []
    for a, b in zip(haken, haken[1:]):
        for x in range(a, b):
            t = (x - a) / (b - a)
            draht.append((x, SY + SH + 1 + round(4 * 4 * t * (1 - t))))
    for (x, y) in draht:
        bild[y][x] = (*hx('#2a3a2a'), 1.0)
    for i, (x, y) in enumerate(draht[2::3]):
        bild[y + 1][x] = (*hx('#5a5a5a'), 1.0)
        for k in (2, 3):
            bild[y + k][x] = (*hx(FARBEN[i % 4]), 1.0)

if MODUS == 'schild':
    kette()

# Funkeln erst nach Umriss und Schatten - sonst bekam jeder Stern einen Kasten
for fx, fy, gross in ((SX + SW + 3, SY + 3, True), (SX - 3, SY + 14, False)) + (((MX1 + 1, MY + 12, False),) if MODUS == 'stand' else ((SX + SW + 2, SY + SH + 6, False),)):
    setz(fx, fy, '#ffffff')
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        setz(fx + dx, fy + dy, '#fff1a0', 0.9)
    if gross:
        for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)):
            setz(fx + dx, fy + dy, '#fff1a0', 0.5)


def png(pfad, s):
    roh = bytearray()
    for y in range(H * s):
        roh.append(0)
        z = bild[y // s]
        for x in range(W * s):
            v = z[x // s]
            roh.extend((0, 0, 0, 0) if v is None else (int(v[0] + .5), int(v[1] + .5), int(v[2] + .5), int(v[3] * 255 + .5)))
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(pfad, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W * s, H * s, 8, 6, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(bytes(roh), 9)) + chunk(b'IEND', b''))

png(ZIEL, SK)
print('ok', W * SK, H * SK)
