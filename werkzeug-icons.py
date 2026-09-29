#!/usr/bin/env python3
"""
werkzeug-icons.py - rechnet die App-Symbole (180, 192 und 512 px).

Kein PIL: Das Bild ist ein 64x64-Pixelraster, gemalt mit ein paar
Zeichenhilfen, per Nachbarpixel hochskaliert und als PNG von Hand (zlib)
geschrieben.

Motiv „Punsch & Lichterglanz": Winternacht mit Mond und Sternen, ein
verschneites Holzhaus mit bunter Lichterkette und warmen Fenstern, ein
Christbaum, vorne ein dampfender Punschbecher. Lichter bekommen einen
weichen Schein (additiv), sonst bleibt alles in harten Pixeln.

Das Wichtige liegt im inneren Kreis (maskable: 80 % Durchmesser), die
Ecken sind nur Himmel und Schnee.

    python3 werkzeug-icons.py
"""
import math, struct, zlib
from pathlib import Path

N = 64
bild = [[(0, 0, 0)] * N for _ in range(N)]

def hexf(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def px(x, y, f):
    if 0 <= x < N and 0 <= y < N:
        bild[y][x] = hexf(f) if isinstance(f, str) else f

def rect(x, y, w, h, f):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            px(xx, yy, f)

def schein(cx, cy, radius, farbe, staerke):
    """Weiches Licht: addiert Farbe, nach außen schwächer."""
    fr, fg, fb = hexf(farbe)
    for y in range(int(cy - radius) - 1, int(cy + radius) + 2):
        for x in range(int(cx - radius) - 1, int(cx + radius) + 2):
            if not (0 <= x < N and 0 <= y < N):
                continue
            d = math.hypot(x - cx, y - cy) / radius
            if d >= 1:
                continue
            a = staerke * (1 - d) ** 2
            r, g, b = bild[y][x]
            bild[y][x] = (min(255, int(r + fr * a)), min(255, int(g + fg * a)), min(255, int(b + fb * a)))

# ---------------------------------------------------------------------------
# Himmel: Verlauf in Bändern (Pixel-Look statt glatt)
# ---------------------------------------------------------------------------
oben, unten = hexf("#0e0a2a"), hexf("#3a2e72")
for y in range(N):
    t = min(1, y / 44)
    t = round(t * 7) / 7
    f = tuple(int(oben[i] + (unten[i] - oben[i]) * t) for i in range(3))
    for x in range(N):
        bild[y][x] = f

# Sterne
for x, y in [(6, 20), (20, 5), (30, 11), (41, 4), (47, 14), (58, 22), (36, 20), (14, 14), (52, 3)]:
    px(x, y, "#c8c8ff")
for x, y in [(24, 3), (44, 9), (61, 12)]:
    px(x, y, "#ffffff")
# großer Stern oben rechts, funkelnd
sx, sy = 54, 9
schein(sx, sy, 7, "#fff2b0", 0.35)
for d in range(-3, 4):
    px(sx + d, sy, "#fff4c0"); px(sx, sy + d, "#fff4c0")
px(sx - 1, sy - 1, "#ffe07a"); px(sx + 1, sy - 1, "#ffe07a"); px(sx - 1, sy + 1, "#ffe07a"); px(sx + 1, sy + 1, "#ffe07a")
px(sx, sy, "#ffffff")

# Mond (Sichel) oben links
mx, my = 11, 10
schein(mx, my, 10, "#c8d0ff", 0.18)
for y in range(-5, 6):
    for x in range(-5, 6):
        if math.hypot(x, y) <= 4.6 and math.hypot(x - 2.2, y - 1.2) > 3.9:
            px(mx + x, my + y, "#fff6d8" if x < -2 else "#f2e6b8")

# ---------------------------------------------------------------------------
# Hinten: Hügel und Tannen als Schattenriss
# ---------------------------------------------------------------------------
for x in range(N):
    h = 40 + int(3 * math.sin(x * 0.18) + 2 * math.sin(x * 0.07 + 1))
    for y in range(h, N):
        px(x, y, "#2a2a5a")
def tanne_hinten(cx, fuss, hoehe, farbe):
    for k in range(hoehe):
        w = 1 + k * 5 // hoehe + (k % 4 == 3)
        rect(cx - w, fuss - hoehe + k, 2 * w + 1, 1, farbe)
for cx, fuss, h in [(4, 44, 12), (60, 43, 11), (55, 45, 8)]:
    tanne_hinten(cx, fuss, h, "#1c2548")

# ---------------------------------------------------------------------------
# Das Haus
# ---------------------------------------------------------------------------
HX0, HX1 = 14, 44          # Wand
DACH_Y, WAND_Y, BODEN = 16, 31, 51
# Wand: rote Bretter mit Fugen
for y in range(WAND_Y, BODEN):
    for x in range(HX0, HX1 + 1):
        px(x, y, "#9c2f28" if (y - WAND_Y) % 4 == 3 else ("#b8392f" if x > HX0 + 1 else "#8a2822"))
rect(HX0, WAND_Y, HX1 - HX0 + 1, 1, "#6e1e1a")   # Schatten unter der Traufe
# Giebel: rotes Holz wie die Wand, darüber dicker Schnee auf beiden
# Dachkanten (mit Holzkante darunter) - so liest es sich als Dach
apex = (HX0 + HX1) // 2
for y in range(DACH_Y, WAND_Y):
    halb = (y - DACH_Y) * 19 // (WAND_Y - DACH_Y) + 1
    for x in range(apex - halb + 3, apex + halb - 2):
        px(x, y, "#9c2f28" if (y - DACH_Y) % 4 == 3 else "#b0362d")
    # Holzkante, dann Schnee nach außen (oben links hell, rechts im Schatten)
    px(apex - halb + 2, y, "#5a3a2c"); px(apex + halb - 2, y, "#5a3a2c")
    for d in (0, 1):
        px(apex - halb + d, y, "#ffffff" if d == 0 else "#e6eef8")
        px(apex + halb - d, y, "#c8d4ea" if d == 0 else "#dbe4f2")
    px(apex - halb - 1, y, "#e6eef8"); px(apex + halb + 1, y, "#b8c6e0")
# Schnee auf dem First
rect(apex - 2, DACH_Y - 1, 5, 2, "#ffffff")
# Traufe mit Schneewulst
rect(apex - 20, WAND_Y - 1, 41, 1, "#ffffff")
rect(apex - 20, WAND_Y, 41, 1, "#c8d4ea")
# Giebelfenster rund
for y in range(-2, 3):
    for x in range(-2, 3):
        if x * x + y * y <= 5:
            px(apex + x, 24 + y, "#ffcf5a")
px(apex, 24, "#fff0b0"); rect(apex - 2, 24, 5, 1, "#6e3a20"); rect(apex, 22, 1, 5, "#6e3a20")
schein(apex, 24, 6, "#ffb040", 0.25)
# Schornstein mit Rauch
rect(37, 15, 4, 8, "#6e5a50"); rect(37, 15, 4, 1, "#ffffff"); rect(36, 14, 6, 1, "#ffffff")
for i, (x, y) in enumerate([(39, 12), (40, 10), (38, 8), (39, 6)]):
    px(x, y, "#8a8aa8"); px(x + 1, y, "#6e6e90")
# Fenster: warm leuchtend mit Sprossen und Schnee auf dem Sims
def fenster(x0, y0):
    schein(x0 + 3, y0 + 3, 9, "#ffa030", 0.35)
    rect(x0 - 1, y0 - 1, 8, 8, "#f2ece0")
    rect(x0, y0, 6, 6, "#ffc850")
    rect(x0, y0, 6, 2, "#ffe490")
    rect(x0 + 3, y0, 1, 6, "#8a4a22"); rect(x0, y0 + 3, 6, 1, "#8a4a22")
    rect(x0 - 1, y0 + 7, 8, 1, "#ffffff")
fenster(17, 35)
fenster(36, 35)
# Tür mit Kranz
rect(27, 38, 6, 13, "#2f5a42"); rect(27, 38, 6, 1, "#244634")
rect(29, 38, 1, 13, "#28503a"); px(31, 45, "#e8c030")
for x, y in [(29, 40), (30, 40), (28, 41), (31, 41), (28, 42), (31, 42), (29, 43), (30, 43)]:
    px(x, y, "#3e8a44")
px(29, 43, "#d8322e"); px(30, 43, "#d8322e")
schein(30, 44, 5, "#ffb050", 0.15)

# Lichterkette entlang der Dachkanten, bunt, jede mit Schein
BUNT = ["#ff4a4a", "#ffd040", "#5aff6a", "#4aa0ff", "#ff6adf"]
lichter = []
for k, y in enumerate(range(DACH_Y + 2, WAND_Y, 3)):
    halb = (y - DACH_Y) * 19 // (WAND_Y - DACH_Y) + 1
    lichter.append((apex - halb - 2, y)); lichter.append((apex + halb + 2, y))
for x in range(apex - 18, apex + 19, 4):
    lichter.append((x, WAND_Y + 1))
for i, (x, y) in enumerate(lichter):
    f = BUNT[i % len(BUNT)]
    schein(x, y, 3.2, f, 0.55)
for i, (x, y) in enumerate(lichter):
    px(x, y, BUNT[i % len(BUNT)])

# ---------------------------------------------------------------------------
# Christbaum links, mit Lichtern und Stern
# ---------------------------------------------------------------------------
bx = 8
for y0, y1, w in [(27, 35, 4), (32, 42, 6), (38, 50, 8)]:
    for y in range(y0, y1):
        ww = 1 + (y - y0) * w // (y1 - y0)
        rect(bx - ww, y, 2 * ww + 1, 1, "#1f5a2e")
        rect(bx - ww, y, max(1, ww - 1), 1, "#2e7a3e")
        px(bx + ww, y, "#174424")
rect(bx - 1, 50, 3, 2, "#5a3a22")
for x, y, f in [(bx - 1, 31, "#ffd040"), (bx + 2, 34, "#ff4a4a"), (bx - 3, 38, "#4aa0ff"), (bx + 3, 40, "#ffd040"),
                (bx, 43, "#ff4a4a"), (bx - 5, 46, "#ffd040"), (bx + 5, 47, "#4aa0ff"), (bx - 1, 48, "#ff6adf")]:
    schein(x, y, 2.6, f, 0.5)
    px(x, y, f)
schein(bx, 25, 5, "#fff0a0", 0.45)
for d in range(-2, 3):
    px(bx + d, 25, "#ffd84a"); px(bx, 25 + d, "#ffd84a")
px(bx, 25, "#fffbe0")

# ---------------------------------------------------------------------------
# Schnee vorne
# ---------------------------------------------------------------------------
for x in range(N):
    h = 51 + int(1.5 * math.sin(x * 0.25)) + (1 if 20 < x < 40 else 0)
    for y in range(h, N):
        px(x, y, "#eef3fa" if y < h + 2 else ("#c8d4ea" if (x * 7 + y * 13) % 23 == 0 else "#dbe4f2"))
    px(x, h, "#ffffff")
# Funkeln im Schnee
for x, y in [(4, 57), (18, 60), (26, 55), (50, 61), (12, 54)]:
    px(x, y, "#ffffff"); px(x, y - 1, "#c8e0ff")

# ---------------------------------------------------------------------------
# Punschbecher vorne rechts, dampfend
# ---------------------------------------------------------------------------
kx0, ky0, kw, kh = 43, 45, 12, 13
schein(kx0 + 6, ky0 + 6, 13, "#ff8a40", 0.22)
for y in range(kh):
    einzug = 1 if y >= kh - 2 else 0
    for x in range(einzug, kw - einzug):
        f = "#c8322e"
        if x <= 1 + einzug: f = "#e04a3e"            # Glanzkante links
        if x >= kw - 2 - einzug: f = "#9c2420"       # Schatten rechts
        px(kx0 + x, ky0 + y, f)
# Rand oben mit Punsch
rect(kx0, ky0, kw, 1, "#f2ece0")
rect(kx0 + 1, ky0 + 1, kw - 2, 1, "#7a1a2a")
px(kx0 + 3, ky0 + 1, "#b83a4a")
# weißer Stern auf dem Becher
cx, cy = kx0 + 6, ky0 + 7
for d in range(-2, 3):
    px(cx + d, cy, "#fff4e0"); px(cx, cy + d, "#fff4e0")
px(cx - 1, cy - 1, "#fff4e0"); px(cx + 1, cy - 1, "#fff4e0"); px(cx - 1, cy + 1, "#fff4e0"); px(cx + 1, cy + 1, "#fff4e0")
# Henkel
for x, y in [(kx0 + kw, ky0 + 3), (kx0 + kw + 1, ky0 + 3), (kx0 + kw + 2, ky0 + 4), (kx0 + kw + 2, ky0 + 5),
             (kx0 + kw + 2, ky0 + 6), (kx0 + kw + 2, ky0 + 7), (kx0 + kw + 1, ky0 + 8), (kx0 + kw, ky0 + 8)]:
    px(x, y, "#b02c28")
px(kx0 + kw + 1, ky0 + 4, "#b02c28"); px(kx0 + kw + 1, ky0 + 7, "#b02c28")
# Dampf in Schwüngen
for i, (x, y) in enumerate([(46, 43), (47, 42), (47, 41), (46, 40), (46, 39), (47, 38),
                            (51, 43), (50, 42), (50, 41), (51, 40), (51, 39), (50, 38), (50, 37)]):
    px(x, y, "#f0f0ff" if i % 3 else "#c8c8e8")
# Schatten des Bechers im Schnee
rect(kx0 + 1, ky0 + kh, kw - 1, 1, "#b8c4dc")

# ---------------------------------------------------------------------------
# Schreiben
# ---------------------------------------------------------------------------
def png(pfad, groesse):
    zeilen = bytearray()
    for y in range(groesse):
        zeilen.append(0)
        reihe = bild[min(N - 1, y * N // groesse)]
        for x in range(groesse):
            zeilen.extend(reihe[min(N - 1, x * N // groesse)])
    def chunk(typ, daten):
        return struct.pack(">I", len(daten)) + typ + daten + struct.pack(">I", zlib.crc32(typ + daten) & 0xffffffff)
    roh = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", groesse, groesse, 8, 2, 0, 0, 0))
    roh += chunk(b"IDAT", zlib.compress(bytes(zeilen), 9)) + chunk(b"IEND", b"")
    Path(pfad).write_bytes(roh)

ziel = Path(__file__).resolve().parent / "web" / "icons"
ziel.mkdir(parents=True, exist_ok=True)
png(ziel / "icon-192.png", 192)
png(ziel / "icon-512.png", 512)
png(ziel / "icon-180.png", 180)   # iPhone (apple-touch-icon)
print("icons geschrieben:", ziel)
