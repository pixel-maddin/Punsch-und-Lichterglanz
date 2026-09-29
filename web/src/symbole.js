/*
 * symbole.js - kleine Pixelsymbole für die DOM-Oberfläche (Leiste, HUD).
 *
 * Keine Emojis: Die sehen auf jedem Gerät anders aus und passen nicht zum
 * Pixel-Look. Jedes Symbol ist ein Raster aus Zeichen; ein Punkt ist leer,
 * jedes andere Zeichen steht für eine Farbe aus FARBEN. Gezeichnet wird in
 * ein <canvas data-ico="…"> in Originalgröße, das CSS zieht es pixelgenau hoch.
 * Die Leistensymbole sind 11 breit und 9 hoch (vorher 11 × 11 - zu groß).
 */
const FARBEN = {
  w: '#f4ecd8', // Papier
  r: '#e84a4a', // Rot
  R: '#a82a2a', // dunkles Rot
  g: '#ffd040', // Gold
  G: '#c89020', // dunkles Gold
  n: '#5ab05a', // Grün
  b: '#b07840', // Holz
  k: '#8a8a9a', // Grau
  K: '#3a3a4a', // Dunkelgrau
  l: '#6a9ae8', // Linse
  p: '#ff5a7a', // Herz
  P: '#ff9ab0', // Herz, Glanz (sanft - ein zu heller Punkt las sich als Lücke)
};

const SYMBOLE = {
  laden: [
    'w..........',
    '.wwwwwwwwww',
    '.wrrnnrrgw.',
    '..wrrnngww.',
    '..wwwwwww..',
    '..w........',
    '..wwwwwwww.',
    '...ww...ww.',
    '...ww...ww.',
  ],
  auftraege: [
    '....ggg....',
    '..bbgGgbb..',
    '.bwwwwwwwb.',
    '.bwkkkkkwb.',
    '.bwwwwwwwb.',
    '.bwkkkkwwb.',
    '.bwwwwwwnb.',
    '.bwkkkwnwb.',
    '.bbbbbbbbb.',
  ],
  kalender: [
    '..k.....k..',
    '.rkrrrrrkr.',
    '.rrrrrrrrr.',
    '.wwwwwwwww.',
    '.wkwkwkwkw.',
    '.wwwwwwwww.',
    '.wkwkwrwkw.',
    '.wwwwwwwww.',
    '.wkwkwkwkw.',
  ],
  karte: [
    '...........',
    '...KKK.....',
    '.kkkkkkkkk.',
    '.kkkKKKkkr.',
    '.kkKlllKkk.',
    '.kkKlwlKkk.',
    '.kkKlllKkk.',
    '.kkkKKKkkk.',
    '.kkkkkkkkk.',
  ],
  menue: [
    '...........',
    '.wwwwwwwww.',
    '.wwwwwwwww.',
    '...........',
    '.wwwwwwwww.',
    '.wwwwwwwww.',
    '...........',
    '.wwwwwwwww.',
    '.wwwwwwwww.',
  ],
  stern: [
    '...g...',
    '...g...',
    'ggggggg',
    '.ggggg.',
    '..gGg..',
    '.gG.Gg.',
    '.G...G.',
  ],
  herz: [
    '.pp.pp.',
    'pPppppp',
    'ppppppp',
    '.ppppp.',
    '..ppp..',
    '...p...',
    '.......',
  ],
};

export function zeichneSymbol(cv, name) {
  const muster = SYMBOLE[name];
  if (!muster) return;
  cv.width = muster[0].length; cv.height = muster.length;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  muster.forEach((zeile, y) => {
    for (let x = 0; x < zeile.length; x++) {
      const f = FARBEN[zeile[x]];
      if (f) { c.fillStyle = f; c.fillRect(x, y, 1, 1); }
    }
  });
}

/** Alle <canvas data-ico> im Dokument bemalen. */
export function alleSymbole() {
  for (const cv of document.querySelectorAll('canvas[data-ico]')) zeichneSymbol(cv, cv.dataset.ico);
}
