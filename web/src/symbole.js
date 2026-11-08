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
  landkarte: [
    '.nnnwwnnnn.',
    '.nnwwnnnwn.',
    '.nwnnnngwn.',
    '.nwnngggnn.',
    '.nnwwnggnl.',
    '.nnnnwnnll.',
    '.nrrnwnlln.',
    '.nrrnnwlnn.',
    '.nnnnnnwnn.',
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
  // 5 x 5 statt des alten 7 x 7, das per CSS auf 80 % gestaucht war (11.10.):
  // gestaucht hatte es kleinere Pixel als alles drumherum
  stern: [
    '..g..',
    '.ggg.',
    'ggggg',
    '.gGg.',
    '.g.g.',
  ],
  uhr: [
    '..KKK..',
    '.KwwwK.',
    'KwwKwwK',
    'KwwKKwK',
    'KwwwwwK',
    '.KwwwK.',
    '..KKK..',
  ],
  pokal: [
    'g.ggg.g',
    'g.gGg.g',
    '.gggGg.',
    '..gGg..',
    '...g...',
    '..GgG..',
    '.ggggg.',
  ],
  // Speisekarte des Standes (19.10.): Tafel mit Becher und zwei Zeilen
  karteStand: [
    '.bbbbbbbbb.',
    'bKKKKKKKKKb',
    'bKwwKKgggKb',
    'bKrrwKKKKKb',
    'bKrrKKgggKb',
    'bKKKKKKKKKb',
    'bKgggKgggKb',
    'bKKKKKKKKKb',
    '.bbbbbbbbb.',
  ],
  // Sprechblase für den Nachrichtenverlauf (18.10.)
  post: [
    '.wwwwwww.',
    'wwwwwwwww',
    'wwKwKwKww',
    'wwwwwwwww',
    '.wwwwwww.',
    '..ww.....',
    '..w......',
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
  // 08.11. (Betatest „ist die Optik einheitlich?"): Ersatz für die Emojis in Fenstern und Listen.
  // Klein (Zeilenanfang, 9 hoch) und groß (Fensterbild, 17 hoch) - je in Spielpixeln, nie hochgezogen.
  becher: [
    '..w.w....',
    '...w.w...',
    '.RRRRRR..',
    '.rrgrrrRR',
    '.rgggrr.R',
    '.rrgrrrRR',
    '.rrrrrr..',
    '..RRRR...',
    '.........',
  ],
  tanne: [
    '....g....',
    '...nnn...',
    '..nnrnn..',
    '...nnn...',
    '..nnnng..',
    '.nrnnnnn.',
    'nnnnngnnn',
    '....b....',
    '...bbb...',
  ],
  kerze: [
    '...g...',
    '..ggg..',
    '..gwg..',
    '...K...',
    '..www..',
    '..wwk..',
    '..wwk..',
    '..wwk..',
    '.nnnnn.',
  ],
  geschenk: [
    '.....r...r.....',
    '....rRr.rRr....',
    '.....rrrrr.....',
    '.RRRRRRgRRRRRR.',
    '.RrrrrrgrrrrrR.',
    '.RRRRRRgRRRRRR.',
    '..rrrrrgrrrrr..',
    '..rrrrrgrrrrr..',
    '..ggggggggggg..',
    '..rrrrrgrrrrr..',
    '..rrrrrgrrrrr..',
    '..RrrrrgrrrrR..',
    '..RRRRRgRRRRR..',
  ],
  sternGross: [
    '......g......',
    '......g......',
    '.....ggg.....',
    '.....ggg.....',
    'gggggggggGggg',
    '.ggggggggGgg.',
    '..ggggggGgg..',
    '...gggggGg...',
    '...ggggGGg...',
    '..gggg.gGgg..',
    '..ggg...ggg..',
    '.gg.......gg.',
  ],
  umschlag: [
    'wwwwwwwwwwwwwww',
    'wkwwwwwwwwwwwkw',
    'wwkwwwwwwwwwkww',
    'wwwkwwwwwwwkwww',
    'wwwwkwwwwwkwwww',
    'wwwwwkwrwkwwwww',
    'wwwwwwrrrwwwwww',
    'wwwwwwwrwwwwwww',
    'wwwwwwwwwwwwwww',
    'kkkkkkkkkkkkkkk',
  ],
  schloss: [
    '..kkk..',
    '.k...k.',
    '.k...k.',
    'GGGGGGG',
    'GgggggG',
    'GggKggG',
    'GggKggG',
    'GgggggG',
    'GGGGGGG',
  ],
  note: [
    '...KKKK',
    '...KKKK',
    '...K..K',
    '...K..K',
    '...K..K',
    '.KKK.KK',
    'KKKKKKK',
    'KKK.KK.',
  ],
  ordner: [
    'GGGGG..........',
    'GgggggGGGGGGGG.',
    'GgggggggggggggG',
    'GwwwwwwwwwwwwwG',
    'GgggggggggggggG',
    'GgggggggggggggG',
    'GgggggggggggggG',
    'GgggggggggggggG',
    'GgggggggggggggG',
    'GGGGGGGGGGGGGGG',
  ],
  warnung: [
    '.......R.......',
    '......RgR......',
    '......RgR......',
    '.....RgggR.....',
    '.....RgKgR.....',
    '....RggKggR....',
    '....RggKggR....',
    '...RgggKgggR...',
    '...RgggggggR...',
    '..RggggKggggR..',
    '..RgggggggggR..',
    '.RRRRRRRRRRRRR.',
  ],
};

/** Ein Symbol als <img>-HTML in Spielpixeln (1 Symbolpixel = 1 Spielpixel), für Fenster und Listen. */
const _bilder = new Map();
export function symbolHtml(name, klasse = 'psym') {
  const muster = SYMBOLE[name];
  if (!muster) return '';
  if (!_bilder.has(name)) { const cv = document.createElement('canvas'); zeichneSymbol(cv, name); _bilder.set(name, cv.toDataURL()); }
  const w = muster[0].length, h = muster.length;
  return `<img class="${klasse}" src="${_bilder.get(name)}" alt="" style="width:calc(var(--px) * ${w});height:calc(var(--px) * ${h})">`;
}

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
