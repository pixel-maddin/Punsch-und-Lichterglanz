/*
 * schrift.js - die Weihnachtsschrift der Minispiele (11.10., Nutzerwunsch:
 * „einen Weihnachtsfont für die Zahlen und Texte", selbst gestaltet statt
 * einer Schriftdatei aus dem Netz).
 *
 * Eine eigene Pixelschrift auf einem 5x7-Raster (Umlaute eine Zeile höher),
 * gezeichnet in ein Canvas und per CSS pixelgenau hochgezogen. Das
 * Weihnachtliche steckt in der Gestaltung, nicht in verschnörkelten Formen -
 * die müssen bei 7 Zeilen lesbar bleiben:
 *   - Füllung je Stil: 'zucker' (rot-weiße Zuckerstange, diagonal gestreift),
 *     'gold' (hell nach orange), 'orange', 'rot', 'rosa', 'creme', 'eis'
 *   - dunkle Kontur und ein Schatten nach unten
 *   - eine Schneekappe auf allem, was nach oben zeigt, mit kleinen Tropfen
 *   - bei großer Schrift ein Funkeln
 *
 * `schriftBild(text, stil, k)` gibt ein Canvas zurück; `k` = Pixel je
 * Rasterpunkt (1 für Kopfzeile und schwebende Texte, 3 für den Countdown).
 */

const G = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '#.#..', '..#..', '..#..', '..#..', '#####'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['###..', '#..#.', '#...#', '#...#', '#...#', '#..#.', '###..'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  // Umlaute: eine Zeile über der Grundhöhe für die Punkte
  'Ä': ['.#.#.', '.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'Ö': ['.#.#.', '.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'Ü': ['.#.#.', '#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '-': ['....', '....', '....', '####', '....', '....', '....'],
  '×': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  ',': ['.', '.', '.', '.', '.', '#', '#'],
  ':': ['.', '.', '#', '.', '.', '#', '.'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
};

// Füllung je Stil: oben → unten (gold & Co.) oder zwei Streifenfarben (zucker)
const STIL = {
  gold:   { verlauf: ['#fff6c0', '#ffd848', '#f0a020', '#c86a10'] },
  orange: { verlauf: ['#ffe0a0', '#ffb040', '#f07a18', '#b8480c'] },
  rot:    { verlauf: ['#ffc0b0', '#ff6a58', '#e0302a', '#a01818'] },
  rosa:   { verlauf: ['#ffe4f6', '#ffb0e0', '#e070c0', '#a8408a'] },
  creme:  { verlauf: ['#ffffff', '#f4ead8', '#dccab0', '#b8a088'] },
  eis:    { verlauf: ['#ffffff', '#e8f6ff', '#a8d8f8', '#6aa8e0'] },
  gruen:  { verlauf: ['#e4ffd8', '#9aec8a', '#4ab84a', '#2a7a30'] },
  zucker: { streifen: ['#e8283a', '#fff8f4'] },
};
const KONTUR = '#3a0c10', SCHATTEN = 'rgba(20,0,0,0.45)', SCHNEE = '#ffffff', SCHNEE2 = '#dcecfa';

function hash(n) { const s = Math.sin(n * 91.3 + 7.1) * 43758.5453; return s - Math.floor(s); }

const cache = new Map();
/** Text als Canvas in der Weihnachtsschrift. Wird je (Text, Stil, k) gemerkt. */
/** Kann die Schrift dieses Zeichen? (27.10., für den Gruß auf der Weihnachtskarte) */
export const kannSchrift = (ch) => !!G[String(ch).toUpperCase()];
export function schriftBild(text, stil = 'gold', k = 1) {
  text = String(text).toUpperCase();
  const schl = `${text}|${stil}|${k}`;
  const alt = cache.get(schl);
  if (alt) return kopie(alt);
  // Raster aufbauen: jede Glyphe 7 Zeilen (Umlaute 8, eine nach oben)
  const glyphen = [...text].map((ch) => G[ch] || G['?']);
  const oben = 1;                                   // Platz für Umlautpunkte
  const breiteR = glyphen.reduce((s, g) => s + g[0].length + 1, -1);
  const pad = 2, schnee = k >= 2 ? k : 1;
  const W = breiteR * k + pad * 2, H = (7 + oben) * k + pad * 2 + 1 + schnee;
  const maske = new Uint8Array(W * H);
  let gx = pad;
  for (const g of glyphen) {
    const y0 = pad + schnee + (g.length === 8 ? 0 : oben * k);
    for (let r = 0; r < g.length; r++) for (let c = 0; c < g[r].length; c++) {
      if (g[r][c] !== '#') continue;
      for (let yy = 0; yy < k; yy++) for (let xx = 0; xx < k; xx++) maske[(y0 + r * k + yy) * W + gx + c * k + xx] = 1;
    }
    gx += (g[0].length + 1) * k;
  }
  // Große Schrift einen Pixel fetter (nach rechts und unten), sonst wirken
  // die Striche bei k = 3 dünn
  if (k >= 2) {
    const alt = maske.slice();
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) if (alt[y * W + x]) { maske[y * W + x + 1] = 1; maske[(y + 1) * W + x] = 1; maske[(y + 1) * W + x + 1] = 1; }
  }
  // Schnee liegt nur auf der OBERSTEN Kante je Spalte (sonst wurde jeder
  // waagerechte Balken weiß und „ZEIT" sah gestreift aus)
  const ersteY = new Int16Array(W).fill(-1);
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (maske[y * W + x]) { ersteY[x] = y; break; }
  const dicke = k >= 2 ? 2 : 1;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const img = c.createImageData(W, H);
  const m = (x, y) => x >= 0 && y >= 0 && x < W && y < H && maske[y * W + x] === 1;
  const setze = (x, y, hex, a = 255) => {
    const i = (y * W + x) * 4;
    img.data[i] = parseInt(hex.slice(1, 3), 16); img.data[i + 1] = parseInt(hex.slice(3, 5), 16); img.data[i + 2] = parseInt(hex.slice(5, 7), 16); img.data[i + 3] = a;
  };
  const S = STIL[stil] || STIL.gold;
  const topY = pad + schnee + oben * k, hoehe = 7 * k;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (m(x, y)) {
      let f;
      if (S.streifen) f = S.streifen[Math.floor((x + y) / (S.breite ? k * S.breite : Math.max(2, k * 1.5))) % 2];
      else {
        const t = Math.max(0, Math.min(0.999, (y - topY) / hoehe));
        f = S.verlauf[Math.floor(t * S.verlauf.length)];
      }
      // Schneekappe auf der obersten Kante, bei großer Schrift mit Tropfen
      const tief = y - ersteY[x];
      const zusammen = ersteY[x] >= 0 && [...Array(tief + 1).keys()].every((d) => m(x, y - d));
      if (zusammen && tief < dicke) f = tief === 0 || k < 2 ? SCHNEE : SCHNEE2;
      else if (zusammen && k >= 2 && tief < dicke + 2 && hash(x * 3.7) < 0.28) f = SCHNEE2;
      setze(x, y, f);
    } else {
      // Kontur rundherum, darunter ein Schatten
      let rand = false;
      for (let dy = -1; dy <= 1 && !rand; dy++) for (let dx = -1; dx <= 1; dx++) if (m(x + dx, y + dy)) { rand = true; break; }
      if (rand) setze(x, y, KONTUR);
      else if (m(x, y - 2) || m(x - 1, y - 2) || m(x + 1, y - 2)) { const i = (y * W + x) * 4; img.data[i] = 20; img.data[i + 3] = 115; }
    }
  }
  c.putImageData(img, 0, 0);
  // Funkeln bei großer Schrift: ein Glitzerstern oben rechts am ersten Zeichen
  if (k >= 2) {
    const sx = pad + glyphen[0][0].length * k, sy = pad + schnee + oben * k;
    c.fillStyle = '#ffffff';
    c.fillRect(sx, sy - 2, 1, 5); c.fillRect(sx - 2, sy, 5, 1);
    c.fillStyle = '#fff4b0'; c.fillRect(sx - 1, sy - 1, 3, 3); c.fillStyle = '#ffffff'; c.fillRect(sx, sy, 1, 1);
  }
  cache.set(schl, cv);
  if (cache.size > 300) cache.delete(cache.keys().next().value);
  return kopie(cv);
}
function kopie(cv) {
  const n = document.createElement('canvas');
  n.width = cv.width; n.height = cv.height;
  n.getContext('2d').drawImage(cv, 0, 0);
  return n;
}
/** Welcher Stil zu einer der bisherigen Textfarben passt. */
export function stilFuer(farbe) {
  return { '#ffffff': 'zucker', '#ffb040': 'orange', '#ff7a6a': 'rot', '#ffb0e0': 'rosa', '#e8d8c0': 'creme', '#8ae88a': 'gruen' }[String(farbe).toLowerCase()] || 'gold';
}
