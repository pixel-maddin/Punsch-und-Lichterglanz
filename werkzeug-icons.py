#!/usr/bin/env python3
"""
werkzeug-icons.py - rechnet die App-Symbole (192 und 512 px).

Kein PIL: Das Bild ist ein 32x32-Pixelraster, das per Nachbarpixel
hochskaliert und als PNG von Hand (zlib) geschrieben wird.

    python3 werkzeug-icons.py
"""
import struct, zlib
from pathlib import Path

RASTER = [
    "................................",
    "................................",
    "...........................y....",
    "..........................yYy...",
    "...........................y....",
    ".....................bb.........",
    ".....................bb.........",
    "..........wwwwwwwwwwwbbww.......",
    ".........wddddddddddddddddw.....",
    "........wddddddddddddddddddw....",
    ".......wdddddddddddddddddddw....",
    "......wddddddddddddddddddddddw..",
    ".....wwwwwwwwwwwwwwwwwwwwwwwwww.",
    ".....LoLoLoLoLoLoLoLoLoLoLoLoL..",
    "......rrrrrrrrrrrrrrrrrrrrrrrr..",
    "......rrrrrrrrrrrrrrrrrrrrrrrr..",
    "......rffffffrrrrttttrrffffffr..",
    "......rfGGGGfrrrrttttrrfGGGGfr..",
    "......rfGggGfrrrrttttrrfGggGfr..",
    "......rfGGGGfrrrrtKttrrfGGGGfr..",
    "......rffffffrrrrttttrrffffffr..",
    "......rrrrrrrrrrrttttrrrrrrrrr..",
    "..T...rrrrrrrrrrrttttrrrrrrrrr..",
    ".TTT..rrrrrrrrrrrttttrrrrrrrrr..",
    ".TTT..rrrrrrrrrrrttttrrrrrrrrr..",
    "TTTTT.ssssssssssssssssssssssss..",
    "TTTTTwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "..s.wwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
]
FARBEN = {
    ".": (26, 16, 48), "y": (255, 226, 122), "Y": (255, 255, 255),
    "b": (138, 74, 58), "w": (238, 243, 248), "d": (59, 58, 68),
    "L": (255, 217, 138), "o": (255, 74, 74), "r": (168, 53, 44),
    "f": (242, 238, 230), "G": (232, 154, 58), "g": (255, 200, 96),
    "t": (47, 80, 64), "K": (232, 192, 48), "T": (42, 90, 50), "s": (120, 90, 70),
}

def png(pfad, groesse):
    k = groesse // 32
    zeilen = bytearray()
    for y in range(groesse):
        zeilen.append(0)
        reihe = RASTER[min(31, y // k)]
        for x in range(groesse):
            zeilen.extend(FARBEN[reihe[min(31, x // k)]])
    def chunk(typ, daten):
        return struct.pack(">I", len(daten)) + typ + daten + struct.pack(">I", zlib.crc32(typ + daten) & 0xffffffff)
    roh = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", groesse, groesse, 8, 2, 0, 0, 0))
    roh += chunk(b"IDAT", zlib.compress(bytes(zeilen), 9)) + chunk(b"IEND", b"")
    Path(pfad).write_bytes(roh)

ziel = Path(__file__).resolve().parent / "web" / "icons"
ziel.mkdir(parents=True, exist_ok=True)
png(ziel / "icon-192.png", 192)
png(ziel / "icon-512.png", 512)
print("icons geschrieben:", ziel)
