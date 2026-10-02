/*
 * pixel.js - Zeichenbausteine: Rechteck, Pixel, eine 3x5-Ziffernschrift,
 * Produktsymbole und alle Figuren (Gäste und Wichtel), klein für die
 * Straße und groß für den Tresen.
 *
 * Es gibt KEINE Bilddatei. Jede Figur ist eine Handvoll Rechtecke.
 */

export function r(c, x, y, w, h, f) { c.fillStyle = f; c.fillRect(Math.round(x), Math.round(y), w, h); }
export function p(c, x, y, f) { c.fillStyle = f; c.fillRect(Math.round(x), Math.round(y), 1, 1); }

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
    eierpunsch: '#f3e38a', jaegertee: '#3f7a3a', weisser: '#efe7c0', feuerzange: '#a01818',
  };
  const f = P[id] || '#888888';
  // Tasse in Produktfarbe, heller Rand, Henkel rechts
  r(c, x + 1, y + 3, 6, 7, f); r(c, x + 1, y + 3, 1, 7, ton(f, -0.25)); r(c, x + 2, y + 9, 5, 1, ton(f, -0.3));
  r(c, x + 7, y + 4, 2, 1, f); r(c, x + 8, y + 5, 1, 2, f); r(c, x + 7, y + 7, 2, 1, f);
  r(c, x + 1, y + 3, 6, 1, ton(f, 0.35));
  if (id === 'weisser') {
    r(c, x + 1, y + 3, 6, 1, '#d4a82c'); p(c, x + 4, y + 6, '#d4a82c');
    if (hat('schaum')) { r(c, x + 1, y + 2, 6, 2, '#fffaf2'); p(c, x + 2, y + 1, '#fffaf2'); p(c, x + 4, y + 1, '#fffaf2'); }   // Milchschaum
    if (hat('zimt')) { p(c, x + 5, y + 2, '#8a4a1e'); p(c, x + 6, y + 1, '#8a4a1e'); p(c, x + 6, y, '#a8602a'); }   // Zimtstange
  }
  if (id === 'gluehwein') {   // Sternenpunsch: fünfzackiger goldener Stern (ein Kreuz las sich als Erste Hilfe)
    const g = '#ffd040';
    p(c, x + 4, y + 4, g); r(c, x + 2, y + 5, 5, 1, g); r(c, x + 3, y + 6, 3, 1, g); p(c, x + 3, y + 7, g); p(c, x + 5, y + 7, g); p(c, x + 4, y + 5, '#fff4b0');
  }
  if (id === 'kinderpunsch') {
    p(c, x + 4, y + 5, '#fff'); p(c, x + 3, y + 6, '#fff'); p(c, x + 5, y + 6, '#fff'); p(c, x + 4, y + 7, '#fff');
    if (hat('zuckerstange')) { p(c, x + 5, y, '#d83a3a'); p(c, x + 6, y, '#fff'); p(c, x + 6, y + 1, '#d83a3a'); p(c, x + 6, y + 2, '#fff'); }
  }
  if (id === 'apfel') {
    p(c, x + 4, y + 1, '#3a8a2a'); p(c, x + 5, y + 0, '#3a8a2a'); r(c, x + 3, y + 6, 3, 2, '#d83a2a');
    if (hat('ruehren')) { p(c, x + 2, y, '#d0d4dc'); p(c, x + 2, y + 1, '#b8bcc6'); p(c, x + 3, y + 2, '#b8bcc6'); }   // Löffel
  }
  const sahne = (id === 'schoko' || id === 'eierpunsch') && hat('sahne');
  if (sahne) { r(c, x + 2, y + 1, 4, 2, '#fffaf2'); p(c, x + 3, y, '#fffaf2'); if (id === 'schoko') p(c, x + 4, y + 1, '#6b3a22'); }
  if (id === 'eierpunsch' && hat('zimtpulver')) { p(c, x + 3, y + 1, '#a8602a'); p(c, x + 5, y + 2, '#8a4a1e'); p(c, x + 4, y, '#a8602a'); }
  if (id === 'jaegertee') {
    p(c, x + 3, y + 6, '#e0c060'); p(c, x + 4, y + 5, '#e0c060'); p(c, x + 5, y + 6, '#e0c060');
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
const HAUT = ['#f2c9a0', '#e0b088', '#c68a5c', '#8d5a3a', '#f5d6b8'];
const HAARE = ['#3a2a1a', '#6a4a2a', '#c8a060', '#1a1a1a', '#a04a2a'];
function wahl(a) { return a[Math.floor(Math.random() * a.length)]; }

export function neueFarben(typ) {
  return {
    mantel: typ === 'oma' ? wahl(['#6a4a8a', '#7a5a3a', '#4a6a8a', '#8a4a5a']) : wahl(MAENTEL),
    hut: wahl(HUETE), schal: wahl(HUETE), haut: wahl(HAUT),
    haar: typ === 'oma' || typ === 'opa' ? '#d0d0d4' : wahl(HAARE),
  };
}

// ---------------------------------------------------------------------------
// Figuren KLEIN (Straße). (x, y) = Fußpunkt, Blick nach rechts.
// ---------------------------------------------------------------------------
export function figurKlein(c, g, x, y, t) {
  x = Math.round(x); y = Math.round(y);
  const F = g.farben;
  const schritt = g.laeuft ? Math.floor(t * 7 + g.phase) % 2 : 0;
  const bein = (bx, hoch) => { r(c, bx, y - 3 + hoch, 1, 3 - hoch, '#2c2c38'); p(c, bx, y - 1 + (hoch ? 0 : 0), '#1a1a22'); };
  switch (g.typ) {
    case 'kind': {
      bein(x - 1, schritt); bein(x + 1, 1 - schritt);
      r(c, x - 2, y - 7, 5, 4, F.mantel); r(c, x - 2, y - 7, 5, 1, F.schal);
      r(c, x - 2, y - 11, 4, 4, F.haut); p(c, x + 1, y - 9, '#2a1a1a');
      r(c, x - 2, y - 12, 4, 2, F.hut); p(c, x - 1, y - 13, '#ffffff');
      break;
    }
    case 'oma': case 'opa': case 'erwachsen': {
      bein(x - 2, schritt); bein(x + 1, 1 - schritt);
      const lang = g.typ === 'oma';
      r(c, x - 3, y - 10, 6, lang ? 8 : 7, F.mantel); r(c, x - 3, y - 10, 1, lang ? 8 : 7, ton(F.mantel, -0.25));
      r(c, x - 3, y - 10, 6, 1, F.schal);
      r(c, x - 2, y - 14, 4, 4, F.haut); p(c, x + 1, y - 12, '#2a1a1a');
      if (g.typ === 'oma') { r(c, x - 2, y - 15, 4, 2, F.haar); p(c, x - 3, y - 14, F.haar); p(c, x - 3, y - 13, F.haar); }
      else if (g.typ === 'opa') { r(c, x - 3, y - 15, 6, 1, '#5a4030'); r(c, x - 2, y - 17, 4, 2, '#6a4a36'); r(c, x, y - 11, 2, 1, F.haar); }
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

export function figurGross(c, g, cx, basis, t, laune) {
  cx = Math.round(cx);
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
      p(c, cx - 4, ko + 8, '#f09a8a'); p(c, cx + 4, ko + 8, '#f09a8a');
      augen(c, cx, ko + 5, 2, blinzeln);
      mund(c, cx, ko + 9, laune);
      if (g.typ === 'oma') {
        r(c, cx - 6, ko - 1, 12, 4, F.haar); r(c, cx - 7, ko + 1, 2, 5, F.haar); r(c, cx + 5, ko + 1, 2, 5, F.haar);
        r(c, cx - 2, ko - 4, 5, 3, F.haar);
        c.fillStyle = '#6a5a4a'; c.fillRect(cx - 5, ko + 3, 4, 1); c.fillRect(cx + 1, ko + 3, 4, 1); c.fillRect(cx - 1, ko + 4, 2, 1);
      } else if (g.typ === 'opa') {
        r(c, cx - 7, ko + 1, 14, 2, '#5a4030'); r(c, cx - 5, ko - 3, 10, 4, '#6a4a36'); r(c, cx - 5, ko, 10, 1, '#3a2a1c');
        r(c, cx - 3, ko + 7, 6, 2, F.haar); r(c, cx - 6, ko + 3, 1, 4, F.haar); r(c, cx + 5, ko + 3, 1, 4, F.haar);
      } else {
        r(c, cx - 6, ko + 2, 1, 5, F.haar); r(c, cx + 5, ko + 2, 1, 5, F.haar);
        r(c, cx - 6, ko - 3, 12, 5, F.hut); r(c, cx - 6, ko + 1, 12, 1, ton(F.hut, 0.3));
        r(c, cx - 1, ko - 5, 3, 2, '#ffffff');
      }
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
