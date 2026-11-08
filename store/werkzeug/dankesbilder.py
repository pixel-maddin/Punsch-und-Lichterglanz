# Dankesbilder im Kinderzeichnungs-Stil (07.11.2026, Nutzerwunsch: „insgesamt zehn verschiedene Bilder“).
# Der Nutzer hat drei Motive selbst gemalt (anna, emma, benjamin); dieses Skript malt sieben weitere im
# selben Stil: Malpapier-Weiß, kräftige Flächen, einfache Strichfiguren, 96 x 72 Pixel.
# Rechts unten (ab x 62 / y 30) bleibt Platz für den Wunsch, den das Spiel dort einsetzt.
#   python store/werkzeug/dankesbilder.py web/bilder/dank [vorschau.png]
# Reines Python (zlib), kein PIL. Die Originale liegen in store/dank_original/.
import math, random, struct, sys, zlib, os

W, H = 96, 72

def hexf(s):
    s = s.lstrip('#'); return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))

class Bild:
    def __init__(self, grund='#ffffff', saat=1):
        self.px = [[hexf(grund)] * W for _ in range(H)]
        self.rnd = random.Random(saat)
    def p(self, x, y, f):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H: self.px[y][x] = hexf(f) if isinstance(f, str) else f
    def r(self, x, y, w, h, f):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)): self.p(xx, yy, f)
    def kreis(self, cx, cy, rad, f, rand=None):
        for yy in range(int(cy - rad - 1), int(cy + rad + 2)):
            for xx in range(int(cx - rad - 1), int(cx + rad + 2)):
                d = math.hypot(xx - cx, yy - cy)
                if d <= rad: self.p(xx, yy, f)
                elif rand and d <= rad + 1: self.p(xx, yy, rand)
    def ellipse(self, cx, cy, rx, ry, f):
        for yy in range(int(cy - ry), int(cy + ry) + 1):
            for xx in range(int(cx - rx), int(cx + rx) + 1):
                if ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1: self.p(xx, yy, f)
    def linie(self, x0, y0, x1, y1, f, dick=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / max(1, n); x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            self.r(x, y, dick, dick, f)
    def dreieck(self, a, b, c, f):
        xs = [a[0], b[0], c[0]]; ys = [a[1], b[1], c[1]]
        for yy in range(int(min(ys)), int(max(ys)) + 1):
            for xx in range(int(min(xs)), int(max(xs)) + 1):
                def s(p1, p2, p3): return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
                q = (xx + 0.5, yy + 0.5)
                d1, d2, d3 = s(q, a, b), s(q, b, c), s(q, c, a)
                if not ((d1 < 0 or d2 < 0 or d3 < 0) and (d1 > 0 or d2 > 0 or d3 > 0)): self.p(xx, yy, f)
    def png(self, pfad, k=1):
        roh = b''
        for y in range(H * k):
            zeile = self.px[y // k]
            roh += b'\x00' + b''.join(bytes(zeile[x // k]) + b'\xff' for x in range(W * k))
        def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
        daten = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W * k, H * k, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(roh, 9)) + chunk(b'IEND', b'')
        open(pfad, 'wb').write(daten)

# --- Bausteine im Stil der Vorlagen ---------------------------------------------------------------
HAUT, DUNKEL = '#ecb070', '#2a2030'

def papier(b, flocken=True):
    if flocken:
        for _ in range(26): b.r(b.rnd.randrange(W), b.rnd.randrange(40), 2, 1, '#c4daf4')
def schnee(b, y0, farbe='#b8d8f8', streifen='#ffffff'):
    b.r(0, y0, W, H - y0, farbe)
    for _ in range(14): b.r(b.rnd.randrange(W - 4), b.rnd.randrange(y0 + 2, H - 1), 3 + b.rnd.randrange(3), 1, streifen)
def sonne(b, x, y):
    b.kreis(x, y, 3.2, '#f0a020')
    for i in range(8):
        a = i / 8 * math.pi * 2; b.linie(x + math.cos(a) * 5, y + math.sin(a) * 5, x + math.cos(a) * 7, y + math.sin(a) * 7, '#f0b030')
def wolke(b, x, y, w):
    for i in range(3): b.ellipse(x + i * w / 3, y + (1 if i == 1 else 2), w / 3 + 1, 3 + (i == 1), '#c0daf4')
def nacht(b, sterne=22):
    for _ in range(sterne):
        x, y = b.rnd.randrange(W), b.rnd.randrange(44)
        b.p(x, y, '#e8d060')
        if b.rnd.random() < 0.3: b.p(x + 1, y, '#e8d060')
def mond(b, x, y):
    b.kreis(x, y, 5, '#e8c840'); b.kreis(x + 3, y - 1, 4.5, None and '#000')
def sichel(b, x, y, himmel):
    b.kreis(x, y, 5, '#e8c840'); b.kreis(x + 3, y - 1, 4.4, himmel)
def tanne(b, x, fuss, h, kugeln=False, schneekappe=False):
    b.r(x - 1, fuss - 3, 3, 3, '#5a3a20')
    for i in range(3):
        o = fuss - 3 - i * h / 3.2
        b.dreieck((x - (h / 2.6 - i * 1.6), o), (x + (h / 2.6 - i * 1.6), o), (x, o - h / 2.2), '#106a30')
        if schneekappe: b.r(x - 1, o - h / 2.2, 3, 1, '#ffffff')
    if kugeln:
        for _ in range(5): b.p(x + b.rnd.randint(-3, 3), fuss - 5 - b.rnd.randrange(int(h * 0.8)), b.rnd.choice(['#f0c020', '#e83a3a']))

def kind(b, x, fuss, haar, oben, hose, maedchen=False, muetze=None, schal=None, arm='unten', schuhe=DUNKEL, ohneBeine=False):
    """Eine Strichfigur wie in den Vorlagen (rund 24 Pixel hoch). x = linke Kante des Kopfes."""
    b.r(x, fuss - 24, 7, 7, HAUT)
    b.p(x + 2, fuss - 21, DUNKEL); b.p(x + 4, fuss - 21, DUNKEL); b.r(x + 2, fuss - 19, 3, 1, '#c84a4a')
    b.r(x - 1, fuss - 25, 9, 2, haar)
    if maedchen: b.r(x - 1, fuss - 23, 1, 7, haar); b.r(x + 7, fuss - 23, 1, 7, haar)
    else: b.r(x - 1, fuss - 23, 1, 2, haar)
    if muetze:
        b.r(x - 1, fuss - 27, 9, 3, muetze); b.r(x + 2, fuss - 29, 3, 2, muetze); b.r(x + 3, fuss - 31, 2, 2, '#ffffff')
    b.r(x, fuss - 17, 7, 9, oben)
    if maedchen: b.r(x - 1, fuss - 10, 9, 3, oben)
    if schal: b.r(x, fuss - 17, 7, 2, schal); b.r(x + 5, fuss - 15, 2, 4, schal)
    b.r(x - 3, fuss - 16, 3, 2, oben); b.r(x - 4, fuss - 16, 1, 2, HAUT)
    if arm == 'hoch':
        for i in range(4): b.r(x + 7 + i, fuss - 17 - i, 2, 2, oben)
        b.r(x + 11, fuss - 22, 2, 2, HAUT)
    elif arm == 'vorn':
        b.r(x + 7, fuss - 16, 4, 2, oben); b.r(x + 11, fuss - 16, 1, 2, HAUT)
    else:
        b.r(x + 7, fuss - 16, 3, 2, oben); b.r(x + 10, fuss - 16, 1, 2, HAUT)
    if not ohneBeine:
        b.r(x + 1, fuss - 8, 2, 7, hose); b.r(x + 4, fuss - 8, 2, 7, hose)
        b.r(x, fuss - 1, 3, 1, schuhe); b.r(x + 4, fuss - 1, 3, 1, schuhe)

# --- Die sieben Motive ------------------------------------------------------------------------------
def frida():
    b = Bild(saat=11); papier(b); sonne(b, 10, 9); wolke(b, 52, 8, 18); wolke(b, 76, 15, 14)
    schnee(b, 50)
    # Schneemann links
    for cy, rad in [(56, 8), (44, 6), (34, 5)]: b.kreis(22, cy, rad, '#ffffff', '#a8b4c8')
    b.p(20, 33, DUNKEL); b.p(24, 33, DUNKEL); b.r(23, 35, 4, 1, '#e8801a')
    for y in (42, 45, 48): b.p(22, y, DUNKEL)
    b.r(16, 28, 13, 2, DUNKEL); b.r(18, 22, 9, 6, DUNKEL); b.r(18, 26, 9, 1, '#c83a3a')
    b.r(16, 38, 13, 2, '#c83a3a'); b.r(25, 40, 2, 4, '#c83a3a')
    b.linie(16, 43, 8, 36, '#7a4a24'); b.linie(28, 43, 36, 37, '#7a4a24'); b.linie(9, 37, 7, 34, '#7a4a24')
    kind(b, 42, 66, '#c8402a', '#9a5ac0', '#40305a', maedchen=True, muetze='#e8609a', schal='#f0c020')
    return b

def nora():
    b = Bild(saat=12); papier(b); sonne(b, 84, 9); wolke(b, 40, 10, 16)
    # Hang von links oben nach rechts unten, unten flach
    for y in range(H):
        for x in range(W):
            if y > 30 + x * 0.32 or y >= 60: b.p(x, y, '#b8d8f8')
    for _ in range(12): b.r(b.rnd.randrange(W - 4), b.rnd.randrange(46, H - 1), 4, 1, '#ffffff')
    tanne(b, 6, 33, 16, schneekappe=True); tanne(b, 15, 35, 12, schneekappe=True)
    # Schlitten auf dem Hang, Nora sitzt drauf (Beine nach vorn)
    sx, sy = 24, 42
    b.linie(sx, sy + 6, sx + 18, sy + 12, '#7a4a24'); b.linie(sx + 1, sy + 4, sx + 17, sy + 10, '#b0743a', 2)
    b.p(sx + 19, sy + 11, '#7a4a24'); b.p(sx + 20, sy + 10, '#7a4a24')
    kind(b, sx + 4, sy + 13, '#3a2a1a', '#3aa0d0', '#2a3a6a', maedchen=True, muetze='#e83a3a', schal='#ffffff', arm='hoch', ohneBeine=True)
    b.r(sx + 11, sy + 4, 6, 2, '#2a3a6a'); b.r(sx + 16, sy + 4, 2, 3, DUNKEL)   # Beine nach vorn auf dem Schlitten
    for i in range(3): b.linie(sx - 10 - i * 3, sy - 2 + i * 3, sx - 4 - i * 3, sy + i * 3, '#8aa0c0')   # Fahrtstriche
    return b

def mia():
    b = Bild('#f6e6c4', saat=13)
    for x in range(0, W, 8): b.r(x, 0, 1, 50, '#efd8b0')   # Tapete
    # Fenster mit Nacht und Flocken
    b.r(6, 6, 28, 22, '#ffffff'); b.r(8, 8, 24, 18, '#3a4488')
    for _ in range(10): b.p(9 + b.rnd.randrange(22), 9 + b.rnd.randrange(16), '#ffffff')
    b.r(19, 8, 2, 18, '#ffffff'); b.r(8, 16, 24, 2, '#ffffff')
    b.r(4, 27, 32, 2, '#c8905a')
    # Mia mit Kochmütze hinter dem Tisch
    kind(b, 46, 58, '#f0c850', '#f07aa8', '#7a3a5a', maedchen=True, arm='hoch')
    b.r(45, 31, 9, 2, '#ffffff'); b.r(46, 26, 7, 5, '#ffffff'); b.r(45, 25, 3, 2, '#ffffff'); b.r(51, 25, 3, 2, '#ffffff')
    b.r(57, 36, 3, 3, '#d8984a')   # ein Plätzchen in der Hand
    # Tisch mit Blech und Plätzchen
    b.r(0, 50, W, 22, '#a8683a'); b.r(0, 50, W, 2, '#c88a4a')
    for x in range(0, W, 12): b.r(x, 54, 1, 18, '#8a5230')
    b.r(8, 45, 34, 5, '#a0a4b0'); b.r(8, 45, 34, 1, '#c8ccd4')
    for i, x in enumerate((12, 20, 28, 36)):
        f = '#e0a848' if i % 2 == 0 else '#c8783a'
        b.r(x, 46, 3, 3, f); b.p(x + 1, 45, f); b.p(x + 1, 49, f); b.p(x - 1, 47, f); b.p(x + 3, 47, f)
    b.r(0, 46, 6, 3, '#e8d8b8'); b.r(1, 45, 4, 1, '#e8d8b8')   # Mehl
    return b

def vincent():
    b = Bild(saat=14); papier(b); sonne(b, 84, 8); wolke(b, 30, 9, 18)
    schnee(b, 48)
    # Schneeburg links, ein Freund lugt dahinter hervor
    kind(b, 12, 50, '#6a4a2a', '#3a9a4a', '#2a3a6a', muetze='#3a9a4a')
    b.r(3, 36, 28, 14, '#ffffff')
    for x in range(3, 31, 6): b.r(x, 33, 4, 3, '#ffffff')
    for y in (40, 45):
        for x in range(3 + (y % 2) * 3, 31, 6): b.r(x, y, 1, 4, '#c8d4e4')
        b.r(3, y, 28, 1, '#c8d4e4')
    b.r(3, 36, 1, 14, '#a8b4c8'); b.r(30, 36, 1, 14, '#a8b4c8')
    # Vincent wirft
    kind(b, 42, 66, '#7a4a24', '#e8802a', '#283868', muetze='#3a64c8', schal='#ffffff', arm='hoch')
    b.kreis(54, 43, 1.6, '#ffffff', '#a8b4c8')
    # fliegende Schneebälle
    for t in (0.2, 0.45, 0.7):
        x, y = 50 - t * 26, 38 - math.sin(t * math.pi) * 10
        b.kreis(x, y, 1.4, '#ffffff', '#a8b4c8')
    return b

def emil():
    b = Bild(saat=15); papier(b); sonne(b, 10, 9); wolke(b, 44, 9, 16)
    schnee(b, 34, '#e4eef8', '#ffffff')
    tanne(b, 6, 38, 18, schneekappe=True); tanne(b, 74, 30, 16, schneekappe=True); tanne(b, 86, 32, 20, schneekappe=True)
    # zugefrorener Weiher
    b.ellipse(48, 54, 46, 14, '#8ac4e4'); b.ellipse(48, 54, 44, 12, '#b8e0f4')
    for _ in range(8): b.r(b.rnd.randrange(14, 80), b.rnd.randrange(46, 62), 5, 1, '#ffffff')
    # Kufenspuren
    for i in range(14):
        a = i / 13 * math.pi; b.p(30 - 14 + i * 1.6, 62 - math.sin(a) * 4, '#ffffff')
    # Emil auf Schlittschuhen, der Schal weht
    kind(b, 30, 62, '#e8c060', '#c83a3a', '#2a3a6a', muetze='#2a6ad0', arm='hoch')
    b.r(28, 45, 4, 2, '#f0c020'); b.r(23, 46, 6, 2, '#f0c020'); b.r(19, 47, 4, 1, '#f0c020')   # Schal weht nach hinten
    b.r(29, 62, 5, 1, '#8a8e98'); b.r(33, 62, 5, 1, '#8a8e98')   # Kufen
    return b

def jonathan():
    himmel = '#2e3270'
    b = Bild(himmel, saat=16); nacht(b, 18)
    # Lichterkette quer über den Himmel
    for x in range(W):
        y = 6 + round(math.sin(x / 96 * math.pi) * 5)
        b.p(x, y, '#1a1a2a')
        if x % 5 == 2: b.r(x, y + 1, 2, 2, ['#f04040', '#f0d040', '#40c060', '#4090f0'][(x // 5) % 4])
    schnee(b, 54, '#c8d4ec', '#e8eef8')
    # Punschstand links
    b.r(6, 28, 34, 14, '#f0c060')   # warmes Licht
    b.r(4, 20, 2, 34, '#7a4a24'); b.r(40, 20, 2, 34, '#7a4a24')
    for i in range(10): b.r(2 + i * 4, 14, 4, 7, '#d83a3a' if i % 2 == 0 else '#ffffff')
    b.r(2, 20, 41, 1, '#a82a2a')
    b.r(12, 23, 22, 5, '#f8ecd0')
    for x in range(14, 32, 3): b.r(x, 24, 2, 3, '#c83a32')   # „PUNSCH“ als Kritzel
    b.r(4, 40, 38, 8, '#8a5230'); b.r(4, 40, 38, 1, '#b07038')
    for x in (10, 18, 26): b.r(x, 36, 3, 4, '#c83a3a'); b.p(x + 1, 34, '#ffffff'); b.p(x + 2, 32, '#ffffff')
    # Jonathan mit Becher
    kind(b, 46, 66, '#5a3a1a', '#4a74c8', '#3a2a40', muetze='#3a9a4a', schal='#d83a3a', arm='vorn')
    b.r(57, 47, 3, 4, '#c83a3a'); b.p(60, 48, '#c83a3a'); b.p(58, 45, '#ffffff'); b.p(57, 43, '#ffffff')
    return b

def paul():
    himmel = '#283068'
    b = Bild(himmel, saat=17); nacht(b, 30); sichel(b, 86, 9, himmel)
    # Der Weihnachtsmann fliegt mit dem Schlitten vorbei
    for i in range(16): b.p(14 + i * 1.6, 26 - i * 0.6 + (i % 2), '#f0d060')   # Glitzerspur
    b.r(38, 14, 12, 4, '#c8282a'); b.r(37, 17, 14, 1, '#f0c020'); b.linie(36, 19, 52, 19, '#7a4a24')
    b.r(41, 10, 4, 4, '#c8282a'); b.r(42, 9, 2, 1, '#ffffff'); b.r(41, 13, 4, 1, '#ffffff')
    for rx in (56, 64):
        b.r(rx, 12, 6, 3, '#8a5a30'); b.r(rx + 5, 9, 2, 3, '#8a5a30'); b.p(rx + 6, 8, '#5a3a1a'); b.p(rx + 7, 7, '#5a3a1a')
        b.p(rx, 15, '#5a3a1a'); b.p(rx + 5, 15, '#5a3a1a')
    b.p(71, 10, '#e83a3a')   # die rote Nase vorn
    b.linie(50, 15, 56, 13, '#d8b060')
    schnee(b, 50, '#c8d4ec', '#e8eef8')
    # Haus links mit erleuchtetem Fenster
    b.r(2, 32, 26, 18, '#9a3a30'); b.dreieck((0, 33), (30, 33), (15, 20), '#3a2a4a'); b.r(20, 20, 4, 7, '#5a4a4a')
    b.r(7, 37, 7, 7, '#f0c040'); b.r(10, 37, 1, 7, '#9a3a30'); b.r(7, 40, 7, 1, '#9a3a30')
    b.r(18, 40, 6, 10, '#5a3a20')
    # Paul im Schlafanzug zeigt nach oben
    kind(b, 38, 66, '#f0c860', '#8ac0e8', '#8ac0e8', arm='hoch', schuhe='#f0f0f0')
    for y in (51, 55, 59, 63): b.r(39, y, 5, 1, '#ffffff')
    return b

MOTIVE = {'frida': frida, 'nora': nora, 'mia': mia, 'vincent': vincent, 'emil': emil, 'jonathan': jonathan, 'paul': paul}

if __name__ == '__main__':
    ziel = sys.argv[1]
    for name, f in MOTIVE.items(): f().png(os.path.join(ziel, name + '.png'))
    if len(sys.argv) > 2:
        # Vorschau: alle sieben 4-fach nebeneinander
        bilder = [f() for f in MOTIVE.values()]
        k, sp = 4, 3
        gross = Bild('#444444'); gross.px = [[hexf('#444444')] * (sp * (W * k + 8)) for _ in range(3 * (H * k + 8))]
        for i, bb in enumerate(bilder):
            ox, oy = (i % sp) * (W * k + 8), (i // sp) * (H * k + 8)
            for y in range(H * k):
                for x in range(W * k): gross.px[oy + y][ox + x] = bb.px[y // k][x // k]
        GW, GH = sp * (W * k + 8), 3 * (H * k + 8)
        roh = b''.join(b'\x00' + b''.join(bytes(c) + b'\xff' for c in zeile) for zeile in gross.px)
        def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
        open(sys.argv[2], 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', GW, GH, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(roh, 6)) + chunk(b'IEND', b''))
    print('ok')
