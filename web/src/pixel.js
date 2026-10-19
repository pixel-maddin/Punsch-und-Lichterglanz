/*
 * pixel.js - Zeichenbausteine: Rechteck, Pixel, eine 3x5-Ziffernschrift,
 * Produktsymbole und alle Figuren (Gäste und Wichtel), klein für die
 * Straße und groß für den Tresen.
 *
 * Es gibt KEINE Bilddatei. Jede Figur ist eine Handvoll Rechtecke.
 */

export function r(c, x, y, w, h, f) { c.fillStyle = f; c.fillRect(Math.round(x), Math.round(y), w, h); }
export function p(c, x, y, f) { c.fillStyle = f; c.fillRect(Math.round(x), Math.round(y), 1, 1); }

/**
 * Doppelt so groß, aber im SPIELPIXEL-Raster (Scale2x/EPX, 11.10.).
 * Einfaches Verdoppeln macht aus jedem Pixel einen 2x2-Block - das Ding
 * steht dann mit doppelt so groben Pixeln neben allem anderen. Scale2x
 * füllt flache Flächen genauso, setzt aber an schrägen Kanten die Stufen
 * einzeln: Kanten und Rundungen haben danach die Pixelgröße der Szene.
 * Gibt eine (wiederverwendete) Leinwand der doppelten Größe zurück.
 */
const _x2 = typeof document !== 'undefined' ? document.createElement('canvas') : null;
export function scale2x(quelle, w = quelle.width, h = quelle.height, ziel = _x2) {
  const src = new Uint32Array(quelle.getContext('2d').getImageData(0, 0, w, h).data.buffer);
  if (ziel.width !== w * 2 || ziel.height !== h * 2) { ziel.width = w * 2; ziel.height = h * 2; }
  const zc = ziel.getContext('2d');
  const bild = zc.createImageData(w * 2, h * 2);
  const out = new Uint32Array(bild.data.buffer), W2 = w * 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = src[y * w + x];
    const A = y > 0 ? src[(y - 1) * w + x] : P, D = y < h - 1 ? src[(y + 1) * w + x] : P;
    const L = x > 0 ? src[y * w + x - 1] : P, R = x < w - 1 ? src[y * w + x + 1] : P;
    const o = y * 2 * W2 + x * 2;
    out[o] = L === A && L !== D && A !== R ? A : P;
    out[o + 1] = A === R && A !== L && R !== D ? R : P;
    out[o + W2] = D === L && D !== R && L !== A ? L : P;
    out[o + W2 + 1] = R === D && R !== A && D !== L ? D : P;
  }
  zc.putImageData(bild, 0, 0);
  return ziel;
}

const _farbCache = new Map();
/** Farbe heller (f > 0) oder dunkler (f < 0) machen. */
export function ton(hex, f) {
  const k = hex + f;
  let v = _farbCache.get(k);
  if (v) return v;
  const n = parseInt(hex.slice(1), 16);
  let rr = (n >> 16) & 255, gg = (n >> 8) & 255, bb = n & 255;
  if (f >= 0) { rr += (255 - rr) * f; gg += (255 - gg) * f; bb += (255 - bb) * f; }
  else { rr *= 1 + f; gg *= 1 + f; bb *= 1 + f; }
  v = '#' + [rr, gg, bb].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
  _farbCache.set(k, v);
  return v;
}
export function mische(a, b, t) {
  const na = parseInt(a.slice(1), 16), nb = parseInt(b.slice(1), 16);
  const f = (s) => Math.round(((na >> s) & 255) * (1 - t) + ((nb >> s) & 255) * t);
  return '#' + [16, 8, 0].map((s) => f(s).toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// 3x5-Schrift für Zahlen (fliegende Beträge)
// ---------------------------------------------------------------------------
const GLYPH = {
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '011', '001', '111'],
  '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
  '+': ['000', '010', '111', '010', '000'], '-': ['000', '000', '111', '000', '000'],
  ',': ['00', '00', '00', '01', '10'], '.': ['0', '0', '0', '0', '1'],
  '€': ['011', '100', '111', '100', '011'], '●': ['010', '111', '111', '111', '010'], '★': ['00100', '11111', '01110', '01010', '10001'], 'x': ['000', '101', '010', '101', '000'],
  '!': ['1', '1', '1', '0', '1'], '/': ['001', '001', '010', '100', '100'], '?': ['111', '001', '011', '000', '010'],
  'k': ['100', '101', '110', '101', '101'], 'M': ['10001', '11011', '10101', '10001', '10001'],
  ' ': ['00', '00', '00', '00', '00'], 'S': ['111', '100', '111', '001', '111'],
  'P': ['111', '101', '111', '100', '100'], 'U': ['101', '101', '101', '101', '111'],
  'N': ['1001', '1101', '1011', '1001', '1001'], 'C': ['111', '100', '100', '100', '111'],
  'H': ['101', '101', '111', '101', '101'],
  'D': ['110', '101', '101', '101', '110'], 'E': ['111', '100', '110', '100', '111'],
  'I': ['111', '010', '010', '010', '111'], 'T': ['111', '010', '010', '010', '010'],
  'A': ['010', '101', '111', '101', '101'], 'R': ['110', '101', '110', '101', '101'],
  // Der Rest des Alphabets - für das umbenennbare Standschild
  'B': ['110', '101', '110', '101', '110'], 'F': ['111', '100', '110', '100', '100'],
  'G': ['111', '100', '101', '101', '111'], 'J': ['001', '001', '001', '101', '111'],
  'K': ['101', '101', '110', '101', '101'], 'L': ['100', '100', '100', '100', '111'],
  'O': ['010', '101', '101', '101', '010'], 'Q': ['010', '101', '101', '110', '011'],
  'V': ['101', '101', '101', '101', '010'], 'W': ['10001', '10001', '10101', '10101', '01010'],
  'X': ['101', '101', '010', '101', '101'], 'Y': ['101', '101', '010', '010', '010'],
  'Z': ['111', '001', '010', '100', '111'],
  'Ä': ['101', '000', '010', '111', '101'], 'Ö': ['101', '000', '111', '101', '111'],
  'Ü': ['101', '000', '101', '101', '111'], '&': ['010', '101', '010', '101', '011'],
  "'": ['1', '1', '0', '0', '0'],
  '♥': ['01010', '11111', '11111', '01110', '00100'], '%': ['101', '001', '010', '100', '101'],
};
/** Kann die Pixelschrift dieses Zeichen? */
export const hatGlyphe = (ch) => ch in GLYPH;
export function textBreite(s) {
  let w = 0;
  for (const ch of s) w += (GLYPH[ch] || GLYPH[' '])[0].length + 1;
  return w - 1;
}
export function text(c, s, x, y, f, schatten = '#2a1810') {
  let cx = Math.round(x);
  for (const ch of s) {
    const g = GLYPH[ch] || GLYPH[' '];
    for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < g[yy].length; xx++) {
      if (g[yy][xx] !== '1') continue;
      if (schatten) p(c, cx + xx + 1, y + yy + 1, schatten);
      p(c, cx + xx, y + yy, f);
    }
    cx += g[0].length + 1;
  }
}
/** Kurze Geldschreibweise für die 3x5-Schrift: 34 · 240 · 1,2k · 3,4M */
export function kurzGeld(n) {
  if (n < 1000) return String(Math.round(n));   // ganze Sterne (seit 29.09.)
  if (n < 1e6) return (n / 1000).toFixed(n < 1e4 ? 1 : 0).replace('.', ',') + 'k';
  return (n / 1e6).toFixed(1).replace('.', ',') + 'M';
}

// ---------------------------------------------------------------------------
// Produktsymbole, 10x10. Dieselben im Wunsch-Bläschen und auf dem Topf.
// ---------------------------------------------------------------------------
// roh = ohne den letzten Handgriff (Sahne, Zimt, Zuckerhut) - so steht es
// auf dem Tablett, bis man es antippt.
export function icon(c, id, x, y, t = 0, roh = false) {
  x = Math.round(x); y = Math.round(y);
  // roh: true = noch kein Handgriff gemacht, false = alle fertig (Laden, Regal),
  // Liste = diese Handgriffe sind schon erledigt (Tablett, seit 30.09.)
  const hat = (g) => roh === false || (Array.isArray(roh) && roh.includes(g));
  if (id === 'lebkuchen') {
    const b = '#9a5a2a', k = '#fff4e6';
    r(c, x + 1, y + 2, 3, 4, b); r(c, x + 5, y + 2, 3, 4, b); r(c, x, y + 3, 9, 3, b);
    r(c, x + 1, y + 6, 7, 1, b); r(c, x + 2, y + 7, 5, 1, b); r(c, x + 3, y + 8, 3, 1, b);
    if (hat('guss')) { p(c, x + 2, y + 3, k); p(c, x + 6, y + 3, k); r(c, x + 3, y + 5, 3, 1, k); p(c, x + 4, y + 6, '#d83a3a'); }
    else p(c, x + 4, y + 6, '#d83a3a');
    return;
  }
  if (id === 'crepe') {
    const b = '#f0c070', d = '#c8923e';
    for (let i = 0; i < 8; i++) r(c, x + 1 + Math.floor(i / 2), y + 1 + i, 8 - i, 1, i % 3 === 0 ? d : b);
    r(c, x + 1, y + 1, 8, 1, '#6b3a22'); p(c, x + 3, y + 3, '#6b3a22'); p(c, x + 6, y + 2, '#6b3a22'); p(c, x + 5, y + 4, '#fff');
    return;
  }
  const P = {
    gluehwein: '#8a1830', kinderpunsch: '#ee6d9a', apfel: '#e8942e', schoko: '#6b3a22',
    eierpunsch: '#f3e38a', jaegertee: '#3f7a3a', weisser: '#efe7c0', feuerzange: '#24346e',   // 19.10.: dunkelblaue Tasse (sah sonst aus wie der Sternenpunsch)
  };
  const f = P[id] || '#888888';
  // Tasse in Produktfarbe (12.10. detailreicher, wie iconGross im Kleinen):
  // heller Rand, Oberfläche des Getränks, Schattenkante, Glanzpunkt, Henkel
  const innen = (FARBE_GROSS[id] || [f, ton(f, -0.4)])[1];
  r(c, x + 1, y + 3, 6, 7, f); r(c, x + 1, y + 4, 1, 5, ton(f, -0.25)); r(c, x + 2, y + 9, 4, 1, ton(f, -0.35)); p(c, x + 1, y + 9, ton(f, -0.45)); p(c, x + 6, y + 9, ton(f, -0.45));
  r(c, x + 1, y + 3, 6, 1, ton(f, 0.45)); r(c, x + 2, y + 4, 4, 1, innen);
  p(c, x + 6, y + 5, ton(f, 0.4)); p(c, x + 6, y + 6, ton(f, 0.2));
  r(c, x + 7, y + 4, 2, 1, f); r(c, x + 8, y + 5, 1, 2, ton(f, -0.2)); r(c, x + 7, y + 7, 2, 1, ton(f, -0.3));
  // Motiv 3 x 3
  // (kein Pluszeichen: ein rotes Kreuz las sich schon einmal als Erste Hilfe)
  const M3 = { gluehwein: ['.#.', '###', '#.#'], kinderpunsch: ['#.#', '.#.', '#.#'], eierpunsch: ['#.#', '###', '.#.'],
    jaegertee: ['.#.', '###', '###'], schoko: ['#.#', '.#.', '#.#'], feuerzange: ['.#.', '.#.', '###'] };
  if (id === 'apfel') { r(c, x + 2, y + 6, 3, 2, '#d83a2a'); p(c, x + 2, y + 6, '#f06a5a'); p(c, x + 3, y + 5, '#3a8a2a'); }   // Apfel mit Stiel
  const m3 = M3[id], mf = MOTIV_FARBE[id];
  if (m3) m3.forEach((z, j) => { for (let i = 0; i < 3; i++) if (z[i] === '#') p(c, x + 2 + i, y + 5 + j, mf); });
  if (id === 'weisser') {
    r(c, x + 1, y + 3, 6, 1, '#d4a82c'); p(c, x + 3, y + 6, '#d4a82c'); p(c, x + 5, y + 7, '#d4a82c'); p(c, x + 3, y + 8, '#d4a82c');
    if (hat('schaum')) { r(c, x + 1, y + 2, 6, 2, '#fffaf2'); p(c, x + 2, y + 1, '#fffaf2'); p(c, x + 4, y + 1, '#fffaf2'); }   // Milchschaum
    if (hat('zimt')) { p(c, x + 5, y + 2, '#8a4a1e'); p(c, x + 6, y + 1, '#8a4a1e'); p(c, x + 6, y, '#a8602a'); }   // Zimtstange
  }

  if (id === 'kinderpunsch') {
    if (hat('zuckerstange')) { p(c, x + 5, y, '#d83a3a'); p(c, x + 6, y, '#fff'); p(c, x + 6, y + 1, '#d83a3a'); p(c, x + 6, y + 2, '#fff'); }
  }
  if (id === 'apfel') {
    p(c, x + 4, y + 1, '#3a8a2a'); p(c, x + 5, y + 0, '#3a8a2a');
    if (hat('ruehren')) { p(c, x + 2, y, '#d0d4dc'); p(c, x + 2, y + 1, '#b8bcc6'); p(c, x + 3, y + 2, '#b8bcc6'); }   // Löffel
  }
  const sahne = (id === 'schoko' || id === 'eierpunsch') && hat('sahne');
  if (sahne) { r(c, x + 2, y + 1, 4, 2, '#fffaf2'); p(c, x + 3, y, '#fffaf2'); if (id === 'schoko') p(c, x + 4, y + 1, '#6b3a22'); }
  if (id === 'eierpunsch' && hat('zimtpulver')) { p(c, x + 3, y + 1, '#a8602a'); p(c, x + 5, y + 2, '#8a4a1e'); p(c, x + 4, y, '#a8602a'); }
  if (id === 'jaegertee') {
    if (!hat('beutel')) { p(c, x + 2, y + 2, '#d8d0b0'); p(c, x + 2, y + 1, '#d8d0b0'); r(c, x + 1, y, 2, 1, '#e8d8a8'); }   // Teebeutel hängt noch drin
  }
  if (id === 'feuerzange' && !hat('zucker')) {
    r(c, x + 2, y + 2, 4, 1, '#e8e8e8'); r(c, x + 3, y, 2, 2, '#fffaf2');   // Zange mit Zuckerhut, noch kalt
  } else if (id === 'feuerzange') {
    const fl = Math.floor(t * 8) % 2;
    r(c, x + 2, y + 2, 4, 1, '#e8e8e8'); // Zuckerhut-Zange
    p(c, x + 3 + fl, y, '#ffd040'); r(c, x + 3, y + 1, 2, 1, '#ff8a20'); p(c, x + 4 - fl, y, '#6ab0ff');
  } else if (!sahne && !(id === 'weisser' && hat('schaum')) && id !== 'apfel') {
    // Dampf
    const s = Math.floor(t * 3) % 2;
    p(c, x + 3 + s, y + 1, '#ffffff'); p(c, x + 4 - s, y, '#e8eef4');
  }
}

/**
 * Die Getränke GROSS (20 x 20) fürs Servierbrett, in Spielpixeln gezeichnet
 * (12.10.). Vorher das kleine 10er-Symbol per Scale2x verdoppelt - jedes
 * Detail war 2 Pixel dick. Gleiche Formen und Farben wie `icon()`, damit man
 * das Getränk wiedererkennt; `roh` wie dort (Handgriffe schon gemacht?).
 * Der Becher sitzt wie 2 x icon(): Körper x+2..x+13, y+6..y+19.
 */
const FARBE_GROSS = {
  gluehwein: ['#8a1830', '#4e0c1c'], kinderpunsch: ['#ee6d9a', '#c43c6a'], apfel: ['#e8942e', '#b8661a'],
  schoko: ['#6b3a22', '#3e1e10'], eierpunsch: ['#f3e38a', '#e0b84a'], jaegertee: ['#3f7a3a', '#9a6a28'],
  weisser: ['#efe7c0', '#d8c48a'], feuerzange: ['#24346e', '#a01818'],   // Tasse dunkelblau, Getränk rot
};
const MOTIV = {   // je 5 x 5, '#' = Motivfarbe, '+' = Glanzpunkt
  gluehwein: ['..#..', '#####', '.#+#.', '.#.#.', '#...#'],
  kinderpunsch: ['#.#.#', '.###.', '##+##', '.###.', '#.#.#'],
  apfel: ['..##.', '.###.', '##+##', '#####', '.###.'],
  eierpunsch: ['.#.#.', '##+##', '#####', '.###.', '..#..'],
  jaegertee: ['..#..', '.###.', '..#..', '.###.', '#####'],
  schoko: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  weisser: ['.#.#.', '#.#.#', '.#.#.', '#.#.#', '.#.#.'],
  feuerzange: ['..#..', '.#+#.', '.###.', '##.##', '.###.'],
};
const MOTIV_FARBE = { gluehwein: '#ffd040', kinderpunsch: '#ffffff', apfel: '#d83a2a', eierpunsch: '#e04a5a', jaegertee: '#e0c060', schoko: '#f0dcc0', weisser: '#d4a82c', feuerzange: '#ffb040' };
export function iconGross(c, id, x, y, t = 0, roh = false) {
  x = Math.round(x); y = Math.round(y);
  const hat = (g) => roh === false || (Array.isArray(roh) && roh.includes(g));
  if (id === 'lebkuchen') {
    // Lebkuchenherz an einer Schleife, mit Zuckergussrand
    const b = '#9a5a2a', d = '#7a4220', h = '#b8743a', k = '#fff4e6';
    const herz = ['..####....####..', '.######..######.', '################', '################', '################',
      '.##############.', '..############..', '...##########...', '....########....', '.....######.....', '......####......', '.......##.......'];
    herz.forEach((z, j) => { for (let i = 0; i < 16; i++) if (z[i] === '#') p(c, x + 2 + i, y + 6 + j, b); });
    herz.forEach((z, j) => { for (let i = 0; i < 16; i++) if (z[i] === '#' && (z[i - 1] !== '#' || j === 0 || herz[j - 1][i] !== '#')) p(c, x + 2 + i, y + 6 + j, i < 8 ? h : b); });
    herz.forEach((z, j) => { for (let i = 0; i < 16; i++) if (z[i] === '#' && (z[i + 1] !== '#' || !herz[j + 1] || herz[j + 1][i] !== '#')) p(c, x + 2 + i, y + 6 + j, d); });
    r(c, x + 9, y + 2, 2, 4, '#c83a3a'); p(c, x + 8, y + 2, '#c83a3a'); p(c, x + 11, y + 2, '#c83a3a'); p(c, x + 9, y + 2, '#e85a5a');   // Schleife
    if (hat('guss')) {
      // Zuckerguss: Wellenrand innen, Pünktchen, ein Herzchen in der Mitte
      const rand = [[4, 9], [5, 8], [6, 9], [7, 10], [8, 10], [11, 10], [12, 10], [13, 9], [14, 8], [15, 9], [16, 10], [15, 12], [14, 13], [13, 14], [12, 15], [11, 16], [10, 16], [9, 16], [8, 15], [7, 14], [6, 13], [5, 12], [4, 11]];
      for (const [i, j] of rand) p(c, x + i, y + j, k);
      for (const [i, j] of [[7, 12], [12, 12], [10, 14]]) p(c, x + i, y + j, '#ffffff');
      p(c, x + 9, y + 11, '#d83a3a'); p(c, x + 11, y + 11, '#d83a3a'); r(c, x + 9, y + 12, 3, 1, '#d83a3a'); p(c, x + 10, y + 13, '#d83a3a');
    } else p(c, x + 10, y + 12, '#d83a3a');
    return;
  }
  if (id === 'crepe') {
    // Gefaltetes Crêpe-Dreieck, gebräunt, mit Schokolade und Puderzucker
    const b = '#f0c070', g = '#d89a50', d = '#c8923e', s = '#6b3a22';
    for (let j = 0; j < 14; j++) { const w = 16 - j; r(c, x + 2 + Math.floor(j / 2), y + 5 + j, w, 1, j % 4 === 3 ? d : b); }
    for (const [i, j] of [[5, 7], [9, 6], [13, 7], [7, 10], [11, 9], [9, 13], [12, 12]]) p(c, x + i, y + j, g);
    r(c, x + 2, y + 5, 16, 1, '#e0a858'); r(c, x + 2, y + 4, 16, 1, '#fff0d0');   // umgeschlagene Kante
    for (let i = 0; i < 14; i++) p(c, x + 3 + i, y + 6 + (i % 3 === 1 ? 1 : 0) + Math.floor(i / 5), s);   // Schokostreifen
    for (const [i, j] of [[6, 8], [10, 8], [14, 6], [8, 11], [11, 12]]) p(c, x + i, y + j, '#ffffff');   // Puderzucker
    // Unten in der Papiertüte, wie auf dem Weihnachtsmarkt
    for (let j = 8; j < 14; j++) { const w = 16 - j, l = x + 2 + Math.floor(j / 2); r(c, l, y + 5 + j, w, 1, '#f4ecd8'); p(c, l, y + 5 + j, '#d8ccb0'); p(c, l + w - 1, y + 5 + j, '#c8bca0'); }
    r(c, x + 6, y + 13, 9, 1, '#d8ccb0'); p(c, x + 10, y + 15, '#c83a3a'); p(c, x + 9, y + 16, '#c83a3a'); p(c, x + 11, y + 16, '#c83a3a');   // Tütenrand, rotes Muster
    return;
  }
  const [f, innen] = FARBE_GROSS[id] || ['#888888', '#555555'];
  // Becher: Körper, Fuß, Schattenkante links, Glanzstreifen, Rand
  r(c, x + 2, y + 6, 12, 14, f);
  r(c, x + 2, y + 7, 1, 12, ton(f, -0.28)); r(c, x + 3, y + 7, 1, 12, ton(f, -0.1));
  r(c, x + 12, y + 8, 1, 9, ton(f, 0.18)); r(c, x + 10, y + 8, 1, 7, ton(f, 0.4)); p(c, x + 10, y + 16, ton(f, 0.25));
  r(c, x + 3, y + 18, 10, 1, ton(f, -0.22)); r(c, x + 3, y + 19, 10, 1, ton(f, -0.4));
  r(c, x + 2, y + 6, 12, 1, ton(f, 0.45)); r(c, x + 3, y + 7, 10, 1, innen); r(c, x + 4, y + 7, 3, 1, ton(innen, 0.25));   // Rand, Oberfläche
  // Henkel
  r(c, x + 14, y + 9, 3, 2, f); r(c, x + 16, y + 11, 2, 4, f); r(c, x + 14, y + 15, 3, 2, f);
  p(c, x + 14, y + 9, ton(f, 0.3)); r(c, x + 17, y + 12, 1, 3, ton(f, -0.3)); r(c, x + 14, y + 16, 3, 1, ton(f, -0.3));
  // Motiv auf dem Becher
  const m = MOTIV[id], mf = MOTIV_FARBE[id];
  if (m) m.forEach((z, j) => { for (let i = 0; i < 5; i++) if (z[i] !== '.') p(c, x + 5 + i, y + 10 + j, z[i] === '+' ? ton(mf, 0.5) : mf); });
  if (id === 'weisser') r(c, x + 2, y + 8, 12, 1, '#d4a82c');   // Goldband unter dem Rand
  // Was obendrauf kommt (Handgriffe)
  const sahne = (id === 'schoko' || id === 'eierpunsch') && hat('sahne');
  const haube = (yy) => {
    r(c, x + 3, yy + 3, 10, 2, '#fffaf2'); r(c, x + 4, yy + 2, 8, 1, '#fffaf2'); r(c, x + 5, yy + 1, 6, 1, '#fffaf2'); r(c, x + 7, yy, 2, 1, '#fffaf2');
    r(c, x + 4, yy + 4, 9, 1, '#e8e0d2'); p(c, x + 6, yy + 2, '#e8e0d2'); p(c, x + 9, yy + 1, '#e8e0d2');
  };
  if (sahne) {
    haube(y + 3);
    if (id === 'schoko') { p(c, x + 6, y + 4, '#6b3a22'); p(c, x + 9, y + 5, '#6b3a22'); p(c, x + 8, y + 3, '#8a5232'); }
    if (id === 'eierpunsch' && hat('zimtpulver')) { p(c, x + 5, y + 5, '#a8602a'); p(c, x + 8, y + 4, '#8a4a1e'); p(c, x + 10, y + 5, '#a8602a'); p(c, x + 7, y + 3, '#8a4a1e'); }
  }
  if (id === 'weisser' && hat('schaum')) haube(y + 3);
  if (id === 'weisser' && hat('zimt')) { for (let i = 0; i < 5; i++) { p(c, x + 9 + Math.floor(i / 2), y + 5 - i, '#8a4a1e'); p(c, x + 10 + Math.floor(i / 2), y + 5 - i, '#a8602a'); } }
  if (id === 'kinderpunsch' && hat('zuckerstange')) {
    for (let j = 0; j < 7; j++) p(c, x + 11, y + 1 + j, j % 2 ? '#ffffff' : '#d83a3a');
    p(c, x + 10, y, '#d83a3a'); p(c, x + 9, y, '#ffffff'); p(c, x + 8, y + 1, '#d83a3a');
  }
  if (id === 'apfel') {
    p(c, x + 12, y + 5, '#d83a2a'); p(c, x + 13, y + 5, '#d83a2a'); p(c, x + 12, y + 4, '#f0e0a0'); p(c, x + 13, y + 4, '#3a8a2a');   // Apfelspalte am Rand
    if (hat('ruehren')) { for (let j = 0; j < 5; j++) p(c, x + 4 - Math.floor(j / 2), y + 6 - j, '#b8bcc6'); r(c, x + 1, y, 2, 2, '#d0d4dc'); p(c, x + 1, y, '#f0f2f6'); }   // Löffel
  }
  if (id === 'jaegertee' && !hat('beutel')) {
    for (let j = 0; j < 5; j++) p(c, x + 4, y + 2 + j, '#d8d0b0');   // Faden über den Rand
    r(c, x + 2, y, 4, 3, '#e8d8a8'); p(c, x + 3, y + 1, '#c83a3a');   // Etikett
  }
  if (id === 'feuerzange') {
    r(c, x + 1, y + 5, 14, 1, '#d8dce4'); p(c, x + 1, y + 5, '#a8acb4'); p(c, x + 14, y + 5, '#a8acb4');   // Zange über dem Becher
    if (!hat('zucker')) { r(c, x + 6, y + 2, 4, 3, '#fffaf2'); r(c, x + 7, y + 1, 2, 1, '#fffaf2'); p(c, x + 9, y + 3, '#e8e0d2'); }   // Zuckerhut, noch kalt
    else {
      const fl = Math.floor(t * 8) % 2;
      r(c, x + 6, y + 3, 4, 2, '#e8c070'); p(c, x + 7, y + 2, '#e8c070');   // karamellisiert
      p(c, x + 6 + fl, y + 1, '#6ab0ff'); p(c, x + 7, y, '#ffd040'); p(c, x + 8 - fl, y + 1, '#ff8a20'); p(c, x + 9, y + 2 - fl, '#ffd040'); p(c, x + 8, y + 2, '#ff8a20');
    }
  }
  // Dampf, wo nichts obendrauf liegt
  if (!sahne && !(id === 'weisser' && hat('schaum')) && id !== 'feuerzange' && !(id === 'apfel' && hat('ruehren'))) {
    // Zwei geschwungene Schwaden, die sich langsam hin- und herwiegen
    const s = Math.floor(t * 2.5) % 2;
    const a = s ? [[6, 5], [6, 4], [7, 3], [7, 2], [6, 1]] : [[7, 5], [7, 4], [6, 3], [6, 2], [7, 1]];
    const b = s ? [[10, 4], [9, 3], [9, 2]] : [[9, 4], [10, 3], [10, 2]];
    a.forEach(([dx, dy], i) => p(c, x + dx, y + dy, i < 2 ? '#ffffff' : i < 4 ? '#e8eef4' : '#d0d8e2'));
    b.forEach(([dx, dy], i) => p(c, x + dx, y + dy, i < 1 ? '#f0f4f8' : '#d8e0ea'));
  }
}

/** Kleines Gesicht über einem Gast: froh (bedient) oder traurig (gegangen). */
export function smiley(c, x, y, froh) {
  x = Math.round(x); y = Math.round(y);
  const g = froh ? '#ffd23a' : '#9ab0c8', k = '#3a2410';
  r(c, x - 2, y - 3, 5, 7, g); r(c, x - 3, y - 2, 7, 5, g);
  p(c, x - 1, y - 1, k); p(c, x + 1, y - 1, k);
  if (froh) { p(c, x - 2, y + 1, k); r(c, x - 1, y + 2, 3, 1, k); p(c, x + 2, y + 1, k); }
  else { r(c, x - 1, y + 1, 3, 1, k); p(c, x - 2, y + 2, k); p(c, x + 2, y + 2, k); }
}

// ---------------------------------------------------------------------------
// Gästefarben
// ---------------------------------------------------------------------------
const MAENTEL = ['#3a5a8c', '#8c3a3a', '#3a7a4a', '#6a4a8a', '#c07030', '#34364a', '#7a5a3a', '#b04060', '#2f6f7a'];
const HUETE = ['#d83a3a', '#e8e0d0', '#2f7a3a', '#3a5aa8', '#e8b030', '#8a3aa0', '#f07a9a'];
// 14.10. (Nutzerwunsch „unterschiedliche Hautfarben"): sieben Töne statt
// fünf, die dunklen mit dunklem Haar
const HAUT = ['#f5d6b8', '#f2c9a0', '#e0b088', '#c68a5c', '#a8714a', '#8d5a3a', '#6a4028'];
const HAARE = ['#3a2a1a', '#6a4a2a', '#c8a060', '#1a1a1a', '#a04a2a'];
const HAARE_DUNKEL = ['#1a1a1a', '#2a1a12', '#3a2a1a'];
function wahl(a) { return a[Math.floor(Math.random() * a.length)]; }

export function neueFarben(typ) {
  const hi = Math.floor(Math.random() * HAUT.length), haut = HAUT[hi];
  return {
    mantel: typ === 'oma' ? wahl(['#6a4a8a', '#7a5a3a', '#4a6a8a', '#8a4a5a']) : wahl(MAENTEL),
    hut: wahl(HUETE), schal: wahl(HUETE), haut,
    haar: typ === 'oma' || typ === 'opa' ? '#d0d0d4' : wahl(hi >= 4 ? HAARE_DUNKEL : HAARE),
    // Spaziergängerinnen (14.10.): lange Haare unter der Mütze, längerer Mantel
    frau: typ === 'erwachsen' && Math.random() < 0.5,
  };
}
/** Wangenrot passend zur Haut (auf dunkler Haut wäre Rosa ein Fleck). */
const wange = (haut) => mische(haut || '#f2c9a0', '#e85a5a', 0.3);

// ---------------------------------------------------------------------------
// Figuren KLEIN (Straße). (x, y) = Fußpunkt, Blick nach rechts.
// ---------------------------------------------------------------------------
// Stammgäste (12.10.): gezeichnet wie ihre Grundfigur (feste Farben aus
// C.GAESTE) plus ein Erkennungszeichen
const STAMM_BASIS = { hilde: 'oma', sophia: 'erwachsen', lena: 'kind', franz: 'opa', karl: 'opa' };

export function figurKlein(c, g, x, y, t) {
  x = Math.round(x); y = Math.round(y);
  if (STAMM_BASIS[g.typ]) {
    figurKlein(c, { ...g, typ: STAMM_BASIS[g.typ] }, x, y, t);
    const schritt = g.laeuft ? Math.floor(t * 7 + g.phase) % 2 : 0;
    if (g.typ === 'hilde') {
      // Dackel Waldi trippelt hinterher, im roten Mäntelchen
      const d = '#8a4a22', dd = '#5a2e14', dx = x - 11;
      r(c, dx, y - 3, 7, 2, d); r(c, dx + 2, y - 3, 3, 1, '#c83a3a');
      p(c, dx + 1, y - 1 - schritt, dd); p(c, dx + 5, y - 2 + schritt, dd); p(c, dx + 1, y - 1, dd); p(c, dx + 5, y - 1, dd);
      r(c, dx + 6, y - 5, 2, 2, d); p(c, dx + 6, y - 3, dd); p(c, dx + 8, y - 4, '#1a1a1a'); p(c, dx - 1, y - 4, d);
      r(c, dx + 3, y - 9, 1, 1, '#c8b890');   // Leine
      for (let i = 0; i < 4; i++) p(c, dx + 7 + i, y - 6 - i, '#6a5a4a');
    } else if (g.typ === 'sophia') {
      r(c, x - 5, y - 8, 2, 4, '#f0c020'); p(c, x - 4, y - 7, '#2a2a2a');   // Posttasche
      p(c, x - 2, y - 9, '#c89a10'); p(c, x - 1, y - 10, '#c89a10');
      r(c, x - 3, y - 13, 1, 4, g.farben.haar); p(c, x - 3, y - 9, '#f0c020');   // Zopf mit Gummi
    } else if (g.typ === 'karl') {
      r(c, x + 3, y - 9, 1, 6, g.farben.mantel);                            // etwas kräftiger
      // Blaue Hose (Beine und unterer Rumpf), roter Schal hängt vorn herab
      r(c, x - 3, y - 5, 6, 2, '#2a58b0');
      for (const [bx, hoch] of [[x - 2, schritt], [x + 1, 1 - schritt]]) r(c, bx, y - 3 + hoch, 1, Math.max(0, 2 - hoch), '#2a58b0');
      p(c, x - 3, y - 9, g.farben.schal); p(c, x - 3, y - 8, g.farben.schal);
      p(c, x - 2, y - 13, '#a8a8a8');                                        // graue Schläfe
      r(c, x - 3, y - 17, 6, 3, '#8a8478'); r(c, x + 1, y - 15, 3, 1, '#5e5a52'); p(c, x - 2, y - 16, '#a8a296');   // graue Schiebermütze
    } else if (g.typ === 'lena') {
      r(c, x - 2, y - 15, 2, 2, '#ffffff');   // dicke Bommel
    } else if (g.typ === 'franz') {
      r(c, x - 2, y - 17, 4, 2, '#3e5a2e'); r(c, x - 3, y - 15, 6, 1, '#2e4a22'); p(c, x - 2, y - 16, '#8a6a3a');   // grüner Försterhut
      p(c, x + 2, y - 18, '#3a8a3a'); p(c, x + 3, y - 19, '#3a8a3a'); p(c, x + 3, y - 18, '#2a6a2a');   // Feder am Hut
    }
    return;
  }
  const F = g.farben;
  const schritt = g.laeuft ? Math.floor(t * 7 + g.phase) % 2 : 0;
  const bein = (bx, hoch) => { r(c, bx, y - 3 + hoch, 1, 3 - hoch, '#2c2c38'); p(c, bx, y - 1 + (hoch ? 0 : 0), '#1a1a22'); };
  switch (g.typ) {
    case 'kind': {
      bein(x - 1, schritt); bein(x + 1, 1 - schritt);
      r(c, x - 2, y - 7, 5, 4, F.mantel); r(c, x - 2, y - 7, 5, 1, F.schal);
      r(c, x - 2, y - 11, 4, 4, F.haut); p(c, x + 1, y - 9, '#2a1a1a');
      if (F.ohneMuetze) r(c, x - 2, y - 12, 4, 2, F.haar);
      else { r(c, x - 2, y - 12, 4, 2, F.hut); p(c, x - 1, y - 13, '#ffffff'); }
      break;
    }
    case 'oma': case 'opa': case 'erwachsen': {
      bein(x - 2, schritt); bein(x + 1, 1 - schritt);
      const lang = g.typ === 'oma' || F.frau || F.lang;
      r(c, x - 3, y - 10, 6, lang ? 8 : 7, F.mantel); r(c, x - 3, y - 10, 1, lang ? 8 : 7, ton(F.mantel, -0.25));
      r(c, x - 3, y - 10, 6, 1, F.schal);
      r(c, x - 2, y - 14, 4, 4, F.haut); p(c, x + 1, y - 12, '#2a1a1a');
      if (g.typ === 'oma') { r(c, x - 2, y - 15, 4, 2, F.haar); p(c, x - 3, y - 14, F.haar); p(c, x - 3, y - 13, F.haar); }
      else if (F.ohneMuetze) { r(c, x - 2, y - 15, 4, 2, F.haar); p(c, x - 3, y - 14, F.haar); if (g.typ === 'opa') r(c, x, y - 11, 2, 1, F.haar); }
      else if (g.typ === 'opa') { r(c, x - 3, y - 15, 6, 1, '#5a4030'); r(c, x - 2, y - 17, 4, 2, '#6a4a36'); r(c, x, y - 11, 2, 1, F.haar); }
      else if (F.frau) { r(c, x - 2, y - 15, 4, 2, F.hut); r(c, x - 3, y - 14, 2, 4, F.haar); p(c, x - 1, y - 16, '#ffffff'); }
      else { r(c, x - 2, y - 15, 4, 2, F.hut); r(c, x - 2, y - 14, 1, 2, F.haar); p(c, x - 1, y - 16, '#ffffff'); }
      break;
    }
    case 'weihnachtsmann': {
      bein(x - 2, schritt); bein(x + 1, 1 - schritt);
      r(c, x - 6, y - 12, 3, 6, '#8a6a3a'); // Sack
      r(c, x - 4, y - 11, 8, 8, '#c82828'); r(c, x - 4, y - 4, 8, 1, '#f4f4f4');
      r(c, x - 4, y - 7, 8, 1, '#1a1a1a'); p(c, x, y - 7, '#e8c030');
      r(c, x - 2, y - 15, 4, 4, '#f2c9a0'); p(c, x + 1, y - 14, '#2a1a1a');
      r(c, x - 3, y - 13, 6, 3, '#f4f4f4'); r(c, x - 2, y - 10, 4, 1, '#f4f4f4');
      r(c, x - 3, y - 16, 6, 1, '#f4f4f4'); r(c, x - 2, y - 18, 4, 2, '#c82828'); p(c, x + 2, y - 18, '#c82828'); p(c, x + 3, y - 17, '#f4f4f4');
      break;
    }
    case 'rentier': {
      const b = '#8a5a32', h = '#b08058';
      const l1 = schritt, l2 = 1 - schritt;
      r(c, x - 4, y - 4 + l1, 1, 4 - l1, ton(b, -0.3)); r(c, x - 2, y - 4 + l2, 1, 4 - l2, ton(b, -0.3));
      r(c, x + 1, y - 4 + l1, 1, 4 - l1, ton(b, -0.3)); r(c, x + 3, y - 4 + l2, 1, 4 - l2, ton(b, -0.3));
      r(c, x - 5, y - 8, 9, 4, b); r(c, x - 4, y - 5, 7, 1, h); p(c, x - 6, y - 8, '#f0e0d0');
      r(c, x + 3, y - 11, 2, 4, b); r(c, x + 3, y - 12, 4, 3, b); p(c, x + 7, y - 11, '#ff3030');
      p(c, x + 5, y - 11, '#1a1a1a');
      p(c, x + 3, y - 13, '#6a4a2a'); p(c, x + 2, y - 14, '#6a4a2a'); p(c, x + 4, y - 14, '#6a4a2a'); p(c, x + 5, y - 13, '#6a4a2a'); p(c, x + 6, y - 14, '#6a4a2a');
      break;
    }
    case 'schneemann': {
      const hops = g.laeuft ? Math.abs(Math.sin(t * 6 + g.phase)) * 2 : 0;
      const yy = y - Math.round(hops);
      const w = '#f4f6fa', sh = '#c8d4e4';
      r(c, x - 3, yy - 6, 7, 6, w); r(c, x - 4, yy - 5, 9, 4, w); r(c, x - 3, yy - 1, 7, 1, sh);
      r(c, x - 2, yy - 10, 5, 4, w); r(c, x - 3, yy - 9, 7, 2, w);
      r(c, x - 2, yy - 14, 5, 4, w);
      r(c, x - 2, yy - 16, 5, 2, '#1a1a22'); r(c, x - 3, yy - 14, 7, 1, '#1a1a22');
      p(c, x + 1, yy - 12, '#1a1a22'); r(c, x + 2, yy - 11, 2, 1, '#f08020');
      r(c, x - 2, yy - 10, 5, 1, '#d83a3a'); p(c, x, yy - 8, '#1a1a22'); p(c, x, yy - 6, '#1a1a22');
      p(c, x - 4, yy - 9, '#6a4a2a'); p(c, x - 5, yy - 10, '#6a4a2a'); p(c, x + 4, yy - 9, '#6a4a2a'); p(c, x + 5, yy - 10, '#6a4a2a');
      break;
    }
    case 'grummel': {
      const g1 = '#5a9a30', g2 = '#4a8024';
      bein(x - 2, schritt); bein(x + 1, 1 - schritt);
      r(c, x - 3, y - 10, 6, 7, g1); r(c, x - 3, y - 10, 1, 7, g2);
      r(c, x - 2, y - 14, 5, 4, '#7cbc44'); p(c, x + 1, y - 13, '#f0e040'); r(c, x, y - 11, 3, 1, '#2a4a14');
      r(c, x - 3, y - 16, 5, 2, '#c82828'); p(c, x - 4, y - 15, '#c82828'); p(c, x - 5, y - 14, '#f4f4f4');
      break;
    }
  }
  if (F && F.extra) gruppeKlein(c, g, x, y);
}
/** Erkennungszeichen der Gruppen (17.10., C.GRUPPEN_KLEIDUNG) - klein, auf der Straße. */
function gruppeKlein(c, g, x, y) {
  const k = g.typ === 'kind' ? 3 : 0;   // Kinder sind kleiner
  switch (g.farben.extra) {
    case 'helm':   // silberner Feuerwehrhelm mit Krempe, Leuchtstreifen an der Jacke
      r(c, x - 3, y - 17, 6, 3, '#d8dce4'); p(c, x - 2, y - 17, '#ffffff'); r(c, x - 3, y - 14, 7, 1, '#a8acb4');
      r(c, x - 3, y - 6, 6, 1, '#e8e060');
      break;
    case 'noten':  // dunkelblaues Notenheft vor der Brust
      r(c, x + 1, y - 9 + k, 3, 3, '#1e2a6a'); p(c, x + 2, y - 8 + k, '#f4f0e8');
      break;
    case 'posaune':   // goldene Posaune vor dem Gesicht, Trichter nach vorn
      r(c, x + 1, y - 12, 5, 1, '#e8c030'); r(c, x + 5, y - 13, 2, 3, '#e8c030'); p(c, x + 6, y - 12, '#fff0a0');
      r(c, x + 1, y - 10, 4, 1, '#c8a020');
      break;
    case 'kegel':   // ein Kegel unter dem Arm
      r(c, x + 3, y - 8, 1, 4, '#f4f0e8'); p(c, x + 3, y - 9, '#f4f0e8'); p(c, x + 3, y - 6, '#d83a3a');
      break;
  }
}

// ---------------------------------------------------------------------------
// Figuren GROSS (Tresen). cx = Mitte, basis = Oberkante Tresen.
// laune: 'froh' | 'normal' | 'sauer'
// ---------------------------------------------------------------------------
function mund(c, cx, y, laune, f = '#5a2a1a') {
  if (laune === 'froh') { p(c, cx - 2, y - 1, f); r(c, cx - 1, y, 3, 1, f); p(c, cx + 2, y - 1, f); }
  else if (laune === 'sauer') { r(c, cx - 1, y - 1, 3, 1, f); p(c, cx - 2, y, f); p(c, cx + 2, y, f); }
  else r(c, cx - 1, y, 3, 1, f);
}
function kopf(c, cx, oben, w, h, f) {
  r(c, cx - w / 2 + 1, oben, w - 2, h, f);
  r(c, cx - w / 2, oben + 1, w, h - 2, f);
}
function augen(c, cx, y, abst, zu) {
  if (zu) { r(c, cx - abst - 1, y, 2, 1, '#2a1a1a'); r(c, cx + abst, y, 2, 1, '#2a1a1a'); }
  else { r(c, cx - abst - 1, y - 1, 1, 2, '#2a1a1a'); r(c, cx + abst, y - 1, 1, 2, '#2a1a1a'); }
}

/** Erkennungszeichen der Gruppen (17.10.) - groß, am Tresen. ko = Oberkante Kopf, o = Kinder tiefer. */
function gruppeGross(c, extra, cx, b, ko, o, bw) {
  switch (extra) {
    case 'helm':   // Feuerwehrhelm über der Mütze, Nackenschutz, Leuchtstreifen
      r(c, cx - 7, ko - 4, 14, 6, '#d8dce4'); r(c, cx - 6, ko - 5, 12, 1, '#d8dce4'); r(c, cx - 4, ko - 4, 3, 2, '#ffffff');
      r(c, cx - 8, ko + 2, 16, 1, '#a8acb4'); r(c, cx - 1, ko - 5, 2, 7, '#b8bcc4');
      r(c, cx - bw / 2, b - 6 + o, bw, 2, '#e8e060'); r(c, cx - bw / 2, b - 5 + o, bw, 1, '#c8c040');
      break;
    case 'noten':  // aufgeschlagenes Notenheft
      r(c, cx - 6, b - 8 + o, 12, 6, '#1e2a6a'); r(c, cx - 5, b - 7 + o, 5, 4, '#f4f0e8'); r(c, cx + 1, b - 7 + o, 4, 4, '#f4f0e8');
      for (let i = 0; i < 2; i++) { r(c, cx - 4, b - 6 + o + i * 2, 3, 1, '#4a4a5a'); r(c, cx + 2, b - 6 + o + i * 2, 2, 1, '#4a4a5a'); }
      break;
    case 'posaune':   // Posaune quer vor der Brust, Trichter nach rechts
      r(c, cx - 8, b - 12, 16, 1, '#e8c030'); r(c, cx - 8, b - 9, 12, 1, '#c8a020'); r(c, cx - 8, b - 12, 1, 4, '#e8c030');
      r(c, cx + 7, b - 14, 3, 5, '#e8c030'); r(c, cx + 9, b - 15, 2, 7, '#f0d050'); p(c, cx + 8, b - 13, '#fff0a0');
      break;
    case 'kegel':   // Vereinswappen: ein Kegel auf der Brust
      r(c, cx - 5, b - 11 + o, 3, 6, '#f4f0e8'); r(c, cx - 4, b - 13 + o, 1, 2, '#f4f0e8'); r(c, cx - 5, b - 9 + o, 3, 1, '#d83a3a');
      break;
  }
}

export function figurGross(c, g, cx, basis, t, laune) {
  cx = Math.round(cx);
  if (STAMM_BASIS[g.typ]) {
    figurGross(c, { ...g, typ: STAMM_BASIS[g.typ] }, cx, basis, t, laune);
    const b = basis + Math.round(Math.sin(t * 2 + g.phase) * 0.6);
    if (g.typ === 'hilde') {
      // Waldi schaut neben ihr über den Tresen
      const d = '#8a4a22', hx = cx + 12, ko = basis - 7;
      r(c, hx, ko, 6, 6, d); r(c, hx + 1, ko - 1, 4, 1, d); r(c, hx - 1, ko + 1, 2, 5, '#5a2e14'); r(c, hx + 5, ko + 1, 2, 5, '#5a2e14');
      p(c, hx + 1, ko + 2, '#1a1a1a'); p(c, hx + 4, ko + 2, '#1a1a1a'); r(c, hx + 2, ko + 4, 2, 1, '#1a1a1a');
    } else if (g.typ === 'sophia') {
      for (let i = 0; i < 12; i++) p(c, cx - 8 + i, b - 16 + i, '#c89a10');   // Riemen der Posttasche
      const ko = b - 29;
      r(c, cx - 8, ko + 3, 2, 12, g.farben.haar); r(c, cx - 8, ko + 15, 2, 1, '#f0c020'); r(c, cx - 8, ko + 16, 2, 3, g.farben.haar);   // langer Zopf
    } else if (g.typ === 'karl') {
      const ko = b - 29;
      // Schwarzes T-Shirt (Grundfigur), blaue Hose unten mit Naht, roter Schal; graue Schläfen
      r(c, cx - 10, b - 6, 20, 6, '#2a58b0'); r(c, cx - 10, b - 6, 2, 6, '#1e4288'); r(c, cx, b - 6, 1, 6, '#1e4288'); r(c, cx - 10, b - 6, 20, 1, '#3a6cc8');
      r(c, cx - 7, ko + 3, 1, 3, '#b0aca8'); r(c, cx + 6, ko + 3, 1, 3, '#b0aca8');
      r(c, cx - 6, ko - 3, 12, 4, '#8a8478'); r(c, cx - 7, ko + 1, 10, 1, '#8a8478'); r(c, cx + 2, ko + 1, 7, 2, '#5e5a52'); r(c, cx - 4, ko - 2, 4, 1, '#a8a296');   // graue Schiebermütze
      r(c, cx - 11, b - 15, 1, 15, ton(g.farben.mantel, -0.2)); r(c, cx + 10, b - 15, 1, 15, ton(g.farben.mantel, -0.2));   // breiter
    } else if (g.typ === 'lena') {
      const ko = b - 22;
      r(c, cx - 2, ko - 8, 5, 4, '#ffffff'); r(c, cx - 1, ko - 9, 3, 1, '#ffffff');   // dicke Bommel
    } else if (g.typ === 'franz') {
      const ko = b - 29;
      r(c, cx - 5, ko - 3, 10, 4, '#3e5a2e'); r(c, cx - 7, ko + 1, 14, 2, '#2e4a22'); r(c, cx - 5, ko, 10, 1, '#8a6a3a');   // grüner Försterhut
      r(c, cx + 4, ko - 7, 1, 5, '#3a8a3a'); r(c, cx + 5, ko - 8, 1, 3, '#2a6a2a');   // Feder am Hut
    }
    return;
  }
  const F = g.farben;
  const blinzeln = (Math.floor(t * 10 + g.phase * 7) % 37) === 0;
  const atmen = Math.round(Math.sin(t * 2 + g.phase) * 0.6);
  const b = basis + atmen;
  switch (g.typ) {
    case 'erwachsen': case 'oma': case 'opa': case 'kind': {
      const k = g.typ === 'kind';
      const o = k ? 6 : 0;           // Kinder stehen tiefer
      const bw = k ? 16 : 20;
      r(c, cx - bw / 2, b - 16 + o, bw, 16 - o, F.mantel);
      r(c, cx - bw / 2, b - 16 + o, 2, 16 - o, ton(F.mantel, -0.25));
      r(c, cx + bw / 2 - 2, b - 16 + o, 2, 16 - o, ton(F.mantel, 0.12));
      if (g.typ === 'oma') { r(c, cx - 8, b - 17, 16, 4, F.schal); r(c, cx - 2, b - 13, 4, 3, ton(F.schal, -0.2)); }
      else { r(c, cx - 7, b - 17 + o, 14, 3, F.schal); r(c, cx + 3, b - 14 + o, 3, 6, F.schal); r(c, cx + 3, b - 9 + o, 3, 1, ton(F.schal, -0.3)); }
      const kh = k ? 11 : 12;
      const ko = b - 17 + o - kh;
      kopf(c, cx, ko, k ? 11 : 12, kh, F.haut);
      p(c, cx - 4, ko + 8, wange(F.haut)); p(c, cx + 4, ko + 8, wange(F.haut));
      augen(c, cx, ko + 5, 2, blinzeln);
      mund(c, cx, ko + 9, laune);
      if (g.typ === 'oma') {
        r(c, cx - 6, ko - 1, 12, 4, F.haar); r(c, cx - 7, ko + 1, 2, 5, F.haar); r(c, cx + 5, ko + 1, 2, 5, F.haar);
        r(c, cx - 2, ko - 4, 5, 3, F.haar);
        c.fillStyle = '#6a5a4a'; c.fillRect(cx - 5, ko + 3, 4, 1); c.fillRect(cx + 1, ko + 3, 4, 1); c.fillRect(cx - 1, ko + 4, 2, 1);
      } else if (g.typ === 'opa') {
        if (F.ohneMuetze) r(c, cx - 5, ko - 1, 10, 3, F.haar);   // Chor (17.10.): ohne Hut
        else { r(c, cx - 7, ko + 1, 14, 2, '#5a4030'); r(c, cx - 5, ko - 3, 10, 4, '#6a4a36'); r(c, cx - 5, ko, 10, 1, '#3a2a1c'); }
        r(c, cx - 3, ko + 7, 6, 2, F.haar); r(c, cx - 6, ko + 3, 1, 4, F.haar); r(c, cx + 5, ko + 3, 1, 4, F.haar);
      } else {
        // Frauen: Haare fallen bis auf die Schultern
        if (F.frau && !k) { r(c, cx - 7, ko + 2, 2, 12, F.haar); r(c, cx + 5, ko + 2, 2, 12, F.haar); r(c, cx - 7, ko + 13, 2, 1, ton(F.haar, 0.2)); }
        else { r(c, cx - 6, ko + 2, 1, 5, F.haar); r(c, cx + 5, ko + 2, 1, 5, F.haar); }
        if (F.ohneMuetze) { r(c, cx - 5, ko - 1, 10, 3, F.haar); r(c, cx - 6, ko + 1, 12, 1, F.haar); }   // Chor (17.10.): Haare statt Mütze
        else { r(c, cx - 6, ko - 3, 12, 5, F.hut); r(c, cx - 6, ko + 1, 12, 1, ton(F.hut, 0.3)); r(c, cx - 1, ko - 5, 3, 2, '#ffffff'); }
      }
      if (F.extra) gruppeGross(c, F.extra, cx, b, ko, o, bw);
      break;
    }
    case 'weihnachtsmann': {
      r(c, cx - 11, b - 16, 22, 16, '#c82828'); r(c, cx - 11, b - 16, 2, 16, '#a01e1e');
      r(c, cx - 1, b - 16, 2, 16, '#f4f4f4');
      const ko = b - 30;
      kopf(c, cx, ko, 12, 12, '#f2c9a0');
      r(c, cx - 7, ko + 6, 14, 9, '#f4f4f4'); r(c, cx - 5, ko + 15, 10, 2, '#f4f4f4'); r(c, cx - 3, ko + 17, 6, 1, '#e4e4ea');
      r(c, cx - 4, ko + 6, 8, 2, '#ffffff'); mund(c, cx, ko + 9, laune, '#c83a3a');
      augen(c, cx, ko + 4, 2, blinzeln); p(c, cx, ko + 6, '#f09a8a');
      r(c, cx - 7, ko - 1, 14, 3, '#f4f4f4'); r(c, cx - 5, ko - 5, 11, 4, '#c82828'); r(c, cx + 5, ko - 4, 3, 3, '#c82828');
      r(c, cx + 7, ko - 2, 3, 3, '#ffffff');
      break;
    }
    case 'rentier': {
      const f = '#8a5a32', h = '#c09068';
      r(c, cx - 5, b - 16, 10, 16, f); r(c, cx - 3, b - 12, 6, 12, h);
      const ko = b - 29;
      kopf(c, cx, ko, 12, 12, f);
      r(c, cx - 4, ko + 7, 8, 5, h);
      const glueh = Math.sin(t * 5) > 0 ? '#ff4a4a' : '#e02020';
      r(c, cx - 1, ko + 6, 3, 3, glueh); p(c, cx, ko + 6, '#ffb0b0');
      augen(c, cx, ko + 4, 2, blinzeln);
      r(c, cx - 8, ko + 2, 3, 2, f); r(c, cx + 5, ko + 2, 3, 2, f);
      const g2 = '#6a4a2a';
      r(c, cx - 4, ko - 5, 1, 5, g2); r(c, cx - 7, ko - 4, 3, 1, g2); r(c, cx - 7, ko - 7, 1, 3, g2); r(c, cx - 3, ko - 8, 1, 3, g2);
      r(c, cx + 3, ko - 5, 1, 5, g2); r(c, cx + 4, ko - 4, 3, 1, g2); r(c, cx + 6, ko - 7, 1, 3, g2); r(c, cx + 2, ko - 8, 1, 3, g2);
      if (laune === 'froh') r(c, cx - 1, ko + 10, 3, 1, '#5a2a1a');
      break;
    }
    case 'schneemann': {
      const w = '#f4f6fa', s = '#cfd9e8';
      r(c, cx - 9, b - 16, 18, 16, w); r(c, cx - 10, b - 14, 20, 14, w); r(c, cx - 10, b - 14, 2, 14, s);
      p(c, cx, b - 11, '#1a1a22'); p(c, cx, b - 6, '#1a1a22');
      const ko = b - 29;
      kopf(c, cx, ko, 13, 13, w);
      r(c, cx - 8, ko + 11, 16, 3, '#d83a3a'); r(c, cx + 3, ko + 13, 3, 5, '#d83a3a');
      augen(c, cx, ko + 5, 2, blinzeln);
      r(c, cx + 1, ko + 7, 5, 2, '#f08020'); p(c, cx + 6, ko + 8, '#f08020');
      if (laune === 'froh') { p(c, cx - 3, ko + 9, '#1a1a22'); p(c, cx - 2, ko + 10, '#1a1a22'); p(c, cx, ko + 10, '#1a1a22'); p(c, cx + 1, ko + 9, '#1a1a22'); }
      else { p(c, cx - 2, ko + 10, '#1a1a22'); p(c, cx, ko + 10, '#1a1a22'); }
      r(c, cx - 8, ko + 1, 16, 2, '#1a1a22'); r(c, cx - 6, ko - 6, 12, 7, '#1a1a22'); r(c, cx - 6, ko - 1, 12, 1, '#c83a3a');
      break;
    }
    case 'grummel': {
      const g1 = '#5a9a30', g2 = '#7cbc44';
      r(c, cx - 10, b - 16, 20, 16, g1); r(c, cx - 10, b - 16, 2, 16, ton(g1, -0.25));
      for (let i = 0; i < 5; i++) p(c, cx - 8 + i * 4, b - 16, ton(g1, -0.3));
      const ko = b - 29;
      kopf(c, cx, ko, 12, 12, g2);
      r(c, cx - 4, ko + 4, 3, 2, '#f0e040'); r(c, cx + 1, ko + 4, 3, 2, '#f0e040');
      p(c, cx - 3, ko + 5, '#1a1a1a'); p(c, cx + 2, ko + 5, '#1a1a1a');
      r(c, cx - 5, ko + 3, 4, 1, '#2a4a14'); r(c, cx + 1, ko + 3, 4, 1, '#2a4a14');
      if (laune === 'froh') { r(c, cx - 4, ko + 8, 9, 1, '#2a4a14'); p(c, cx - 5, ko + 7, '#2a4a14'); p(c, cx + 5, ko + 7, '#2a4a14'); r(c, cx - 3, ko + 9, 7, 1, '#ffffff'); }
      else { r(c, cx - 3, ko + 9, 7, 1, '#2a4a14'); p(c, cx - 4, ko + 10, '#2a4a14'); p(c, cx + 4, ko + 10, '#2a4a14'); }
      r(c, cx - 7, ko - 1, 14, 3, '#f4f4f4'); r(c, cx - 6, ko - 5, 10, 4, '#c82828'); r(c, cx - 9, ko - 3, 4, 3, '#c82828'); r(c, cx - 11, ko - 1, 3, 3, '#ffffff');
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Wichtel: grün-rot mit Zipfelmütze
// ---------------------------------------------------------------------------
export function wichtelKlein(c, x, y, t, phase = 0) {
  x = Math.round(x); y = Math.round(y - Math.abs(Math.sin(t * 4 + phase)) * 1.2);
  r(c, x - 2, y - 4, 4, 4, '#2f8a3a'); r(c, x - 2, y - 1, 4, 1, '#1f5a26');
  r(c, x - 1, y - 7, 3, 3, '#f2c9a0'); p(c, x + 1, y - 6, '#2a1a1a');
  r(c, x - 2, y - 8, 4, 1, '#d83a3a'); r(c, x - 1, y - 9, 2, 1, '#d83a3a'); p(c, x - 2, y - 10, '#d83a3a'); p(c, x - 3, y - 10, '#ffffff');
}
export function wichtelGross(c, cx, basis, t) {
  cx = Math.round(cx);
  const b = basis;
  r(c, cx - 6, b - 9, 12, 9, '#2f8a3a'); r(c, cx - 6, b - 9, 12, 1, '#e8c030');
  const ko = b - 19;
  kopf(c, cx, ko, 9, 10, '#f2c9a0');
  r(c, cx - 6, ko + 3, 2, 3, '#f2c9a0'); r(c, cx + 4, ko + 3, 2, 3, '#f2c9a0'); // Ohren
  augen(c, cx, ko + 4, 1, false); mund(c, cx, ko + 7, 'froh');
  r(c, cx - 5, ko - 1, 10, 3, '#d83a3a'); r(c, cx - 3, ko - 4, 7, 3, '#d83a3a'); r(c, cx + 2, ko - 6, 4, 2, '#d83a3a');
  r(c, cx + 5, ko - 7, 2, 2, '#ffffff'); r(c, cx - 5, ko + 1, 10, 1, '#ffffff');
}
