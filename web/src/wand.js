/*
 * wand.js - die Erfolgswand als Pixelbild: eine urige Holzwand im
 * Wohnzimmer, davor der Kamin, an drei Schnüren 24 Socken.
 *
 * Wer noch nichts erreicht hat, sieht eine karge Wand mit Schnüren und
 * einem kalten Kamin. Mit jeder Socke kommt etwas dazu (Tabelle STUFEN
 * in erfolge.js): Kerzen, Tannengrün, Girlanden, Kranz, Christbaum,
 * Lichter … ab 20 brennt das Kaminfeuer, bei 24 liegen Geschenke da.
 *
 * Nicht erreichte Socken sind dunkle Schattenrisse.
 */
import { r, p } from './pixel.js?v=20261009p';

export const W = 160, H = 150;
const REIHEN = [11, 38, 65];            // y der drei Schnüre
const SX0 = 14, SDX = 19;               // x der ersten Socke, Abstand
/** Wo hängt Socke i? (Mitte oben) */
export function sockenPlatz(i) { return { x: SX0 + (i % 8) * SDX, y: REIHEN[Math.floor(i / 8)] }; }
/** Welche Socke liegt unter (x, y)? -1 = keine */
export function sockeBei(x, y) {
  for (let i = 0; i < 24; i++) {
    const s = sockenPlatz(i);
    if (x >= s.x - 8 && x <= s.x + 8 && y >= s.y - 1 && y <= s.y + 17) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Socken: eine Form, 24 Muster (6 Farben × 8 Muster, jede Kombination einmal)
// ---------------------------------------------------------------------------
const FORM = [
  '.CCCCCCCC.',
  '.CCCCCCCC.',
  '.CCCCCCCC.',
  '..BBBBBB..',
  '..BBBBBB..',
  '..BBBBBB..',
  '..BBBBBB..',
  '..BBBBBBB.',
  '..HBBBBBBB',
  '..HBBBBBBT',
  '..HBBBBBTT',
  '...BBBBBT.',
];
const FARBEN = ['#c8322e', '#2f7d3a', '#efe6d2', '#2f5d9e', '#d9a520', '#7d3f8f'];
function muster(i, x, y) {
  switch ((i * 3) % 8) {
    case 0: return y % 2 === 0;                           // Ringel
    case 1: return (x + y * 2) % 4 === 0;                 // Tupfen
    case 2: return ((x >> 1) + (y >> 1)) % 2 === 0;       // Karo
    case 3: return (x === 5 && y >= 4 && y <= 8) || (y === 6 && x >= 3 && x <= 7) || ((x === 4 || x === 6) && (y === 5 || y === 7));   // Schneeflocke
    case 4: return (y === 5 && (x === 3 || x === 6)) || (y === 6 && x >= 3 && x <= 6) || (y === 7 && (x === 4 || x === 5)) || (y === 4 && (x === 3 || x === 6));   // Herz
    case 5: return (x + y) % 3 === 0;                     // Schräg
    case 6: return y === 5 || y === 6 || y === 9;         // Bänder
    default: return (x + y) % 2 === 0;                    // feines Karo
  }
}
function sockenFarben(i) {
  const b = i % 6;
  const alt = (b + 1 + (i % 4 >= 2 ? 2 : 0)) % 6;
  const weiss = FARBEN[2];
  return { grund: FARBEN[b], alt: FARBEN[alt === b ? (b + 1) % 6 : alt], rand: b === 2 ? FARBEN[0] : weiss };
}
/** Eine Socke zeichnen. `schatten` = noch nicht erreicht. */
export function socke(c, i, x0, y0, schatten) {
  const f = sockenFarben(i);
  for (let y = 0; y < FORM.length; y++) {
    for (let x = 0; x < 10; x++) {
      const z = FORM[y][x];
      if (z === '.') continue;
      let col;
      if (schatten) col = y < 3 ? '#3e2717' : '#35200f';
      else if (z === 'C') col = y === 2 ? shade(f.rand) : f.rand;
      else if (z === 'H' || z === 'T') col = f.alt;
      else col = muster(i, x, y) ? f.alt : f.grund;
      p(c, x0 + x, y0 + y, col);
    }
  }
}
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const k = (v) => Math.max(0, Math.round(v * 0.82));
  return `rgb(${k(n >> 16)},${k((n >> 8) & 255)},${k(n & 255)})`;
}

// ---------------------------------------------------------------------------
// Die Wand
// ---------------------------------------------------------------------------
/**
 * n = erreichte Socken, hat(i) = Socke i erreicht?, t = Zeit (Feuer),
 * neu(i) = gerade neu (funkelt).
 */
export function zeichneWand(c, n, hat, t, neu) {
  c.clearRect(0, 0, W, H);
  wandHolz(c);
  boden(c, n);
  holzstapel(c);
  kamin(c, n, t);
  if (n >= 10) baum(c, n);
  if (n >= 8) kranz(c);
  sims(c, n);
  if (n >= 24) geschenke(c);

  // Je weniger erreicht, desto dunkler und kälter der Raum
  const dunkel = 0.42 * (1 - Math.min(n, 20) / 20);
  if (dunkel > 0) { c.fillStyle = `rgba(16, 10, 18, ${dunkel})`; c.fillRect(0, 0, W, H); }

  // Licht kommt nach dem Abdunkeln, damit es leuchtet
  if (n >= 20) feuerSchein(c, t);
  if (n >= 2) kerzenLicht(c, t);
  schnuere(c, n);
  if (n >= 18) baumLichter(c);

  for (let i = 0; i < 24; i++) {
    const s = sockenPlatz(i);
    socke(c, i, s.x - 5, s.y + 2, !hat(i));
    if (neu(i) && Math.sin(t * 6 + i) > 0) { p(c, s.x + 5, s.y + 3, '#fff6b0'); p(c, s.x + 6, s.y + 2, '#ffd84a'); p(c, s.x + 4, s.y + 2, '#ffd84a'); p(c, s.x + 5, s.y + 1, '#ffd84a'); }
  }
}

function wandHolz(c) {
  // Waagrechte Bretter, je Reihe ein wenig anders
  for (let y = 0, k = 0; y < 140; y += 7, k++) {
    r(c, 0, y, W, 7, k % 2 ? '#6e4529' : '#74492b');
    r(c, 0, y + 6, W, 1, '#4d2f1a');
    // Stöße und Astlöcher, immer an derselben Stelle
    const stoss = (k * 53) % W;
    r(c, stoss, y, 1, 6, '#4d2f1a');
    const ast = (k * 97 + 31) % W;
    p(c, ast, y + 3, '#553520'); p(c, ast + 1, y + 3, '#5c3a22');
  }
  // Deckenbalken
  r(c, 0, 0, W, 5, '#3e2614'); r(c, 0, 5, W, 1, '#2a190d');
  for (let x = 6; x < W; x += 24) p(c, x, 2, '#8a8070');
}

function boden(c, n) {
  r(c, 0, 138, W, 3, '#4a2c18');   // Fußleiste
  r(c, 0, 141, W, 9, '#5a3a22');
  for (let x = 0; x < W; x += 13) r(c, x, 141, 1, 9, '#46291a');
  r(c, 0, 144, W, 1, '#523420');
  if (n >= 22) {   // Teppich vor dem Kamin
    r(c, 54, 143, 52, 6, '#9a2a26'); r(c, 56, 144, 48, 4, '#b8382f');
    for (let x = 58; x < 102; x += 4) p(c, x, 145, '#e0b64a');
    r(c, 54, 142, 52, 1, '#7a1f1c');
  }
}

function holzstapel(c) {
  // Stirnseite eines Scheits: Rinde außen, Jahresringe innen
  const holz = (x, y) => {
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 3.4) continue;
      p(c, x + dx, y + dy, d > 2.5 ? '#4a2e18' : d > 1.6 ? '#c08850' : d > 0.8 ? '#a8743f' : '#c89458');
    }
  };
  for (let i = 0; i < 4; i++) holz(12 + i * 7, 135);
  for (let i = 0; i < 3; i++) holz(15 + i * 7, 128);
  for (let i = 0; i < 2; i++) holz(18 + i * 7, 121);
}

function kamin(c, n, t) {
  // Steine
  r(c, 52, 100, 56, 40, '#7e766c');
  for (let y = 100, k = 0; y < 140; y += 5, k++) {
    r(c, 52, y + 4, 56, 1, '#5e574f');
    for (let x = 52 + (k % 2 ? 4 : 0); x < 108; x += 9) r(c, x, y, 1, 4, '#5e574f');
  }
  for (let i = 0; i < 12; i++) p(c, 54 + (i * 29) % 52, 101 + (i * 17) % 37, '#948b80');
  // Öffnung mit rundem Bogen
  r(c, 64, 112, 32, 28, '#1a1210');
  r(c, 66, 110, 28, 2, '#1a1210'); r(c, 69, 109, 22, 1, '#1a1210');
  r(c, 63, 111, 1, 29, '#4a443e'); r(c, 96, 111, 1, 29, '#4a443e');
  // Rost und Holzscheite
  r(c, 68, 137, 24, 1, '#3a3430');
  r(c, 70, 134, 20, 3, '#5a3a22'); r(c, 72, 131, 16, 3, '#6a4428');
  p(c, 70, 135, '#a8743f'); p(c, 89, 132, '#a8743f');
  if (n < 20) {   // kalt: nur Asche
    r(c, 70, 137, 20, 1, '#6a625a'); p(c, 75, 136, '#8a8078'); p(c, 84, 136, '#8a8078');
    return;
  }
  // Feuer: je Spalte eine Flamme, die mit der Zeit flackert
  for (let x = 69; x < 92; x++) {
    const h = 7 + 5 * Math.sin(t * 9 + x * 0.9) * Math.sin(t * 5.3 + x * 0.37) + 4 * Math.sin(x * 0.45 + 1) ;
    const hoehe = Math.max(2, Math.round(h + 6 - Math.abs(x - 80) * 0.35));
    for (let k = 0; k < hoehe; k++) {
      const a = k / hoehe;
      p(c, x, 133 - k, a < 0.3 ? '#fff1a0' : a < 0.6 ? '#ffb030' : a < 0.85 ? '#f06a1e' : '#b8321a');
    }
  }
  r(c, 70, 136, 20, 1, '#ff8a2a');   // Glut
}

function sims(c, n) {
  r(c, 46, 96, 68, 4, '#4a2c16'); r(c, 46, 96, 68, 1, '#6a4226'); r(c, 48, 100, 64, 1, '#2e1a0c');
  if (n >= 4) {   // Tannengrün auf dem Sims
    for (let x = 48; x < 112; x++) {
      const w = (x % 5 === 0) ? 3 : (x % 3 === 0 ? 2 : 1);
      r(c, x, 96 - w, 1, w, x % 2 ? '#2e6a36' : '#23542b');
      if (x % 7 === 3) p(c, x, 100, '#2e6a36');
    }
    for (const x of [58, 80, 102]) { p(c, x, 94, '#d8322e'); p(c, x + 1, 95, '#d8322e'); }
  }
  if (n >= 2) {   // zwei Kerzen
    for (const x of [52, 107]) { r(c, x, 88, 2, 8, '#efe6d2'); r(c, x, 88, 1, 8, '#fff8e8'); p(c, x, 87, '#3a2a1a'); }
  }
  if (n >= 22) {   // Lebkuchenherz und Nussknacker auf dem Sims
    r(c, 62, 91, 3, 4, '#a8643a'); r(c, 65, 91, 3, 4, '#a8643a'); r(c, 63, 94, 4, 1, '#a8643a'); p(c, 64, 95, '#a8643a');
    p(c, 63, 92, '#fff'); p(c, 66, 92, '#fff');
    r(c, 95, 86, 4, 2, '#1e2a6a'); r(c, 95, 88, 4, 3, '#e6c8a0'); r(c, 95, 91, 4, 4, '#c8322e'); r(c, 95, 95, 1, 1, '#222'); r(c, 98, 95, 1, 1, '#222');
    p(c, 96, 89, '#222'); p(c, 97, 90, '#fff');
  }
}

function kerzenLicht(c, t) {
  for (const [i, x] of [[0, 52], [1, 107]].map(([i, x]) => [i, x])) {
    const f = Math.sin(t * 11 + i * 2) > 0.2;
    p(c, x, 86, '#fff4a8'); p(c, x + (f ? 1 : 0), 85, '#ffb030');
    const g = c.createRadialGradient(x + 0.5, 86, 0, x + 0.5, 86, 9);
    g.addColorStop(0, 'rgba(255, 210, 120, 0.35)'); g.addColorStop(1, 'rgba(255, 210, 120, 0)');
    c.fillStyle = g; c.fillRect(x - 9, 77, 19, 19);
  }
}

function feuerSchein(c, t) {
  const f = 0.30 + 0.05 * Math.sin(t * 7) + 0.03 * Math.sin(t * 13.1);
  const g = c.createRadialGradient(80, 128, 4, 80, 128, 95);
  g.addColorStop(0, `rgba(255, 150, 60, ${f})`);
  g.addColorStop(0.5, `rgba(255, 130, 50, ${f * 0.4})`);
  g.addColorStop(1, 'rgba(255, 120, 40, 0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}

function kranz(c) {
  const cx = 80, cy = 87;
  for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) {
    const d = Math.sqrt(x * x + y * y);
    if (d > 7.2 || d < 3.6) continue;
    p(c, cx + x, cy + y, (x * 3 + y * 5) % 4 === 0 ? '#3a8a44' : '#23542b');
  }
  for (const [x, y] of [[-5, -3], [4, -5], [6, 2], [-2, 6], [-6, 3]]) p(c, cx + x, cy + y, '#d8322e');
  r(c, cx - 2, cy + 5, 5, 2, '#c8322e'); p(c, cx - 2, cy + 7, '#c8322e'); p(c, cx + 2, cy + 7, '#c8322e');
}

function baum(c, n) {
  const cx = 138;
  // Drei Etagen, oben schmal
  const etagen = [[92, 104, 7], [100, 116, 11], [110, 130, 15]];
  for (const [y0, y1, halb] of etagen) {
    for (let y = y0; y < y1; y++) {
      const w = Math.round(1 + (y - y0) / (y1 - y0) * halb);
      r(c, cx - w, y, 2 * w + 1, 1, '#1f5a2e');
      r(c, cx - w, y, Math.max(1, w - 2), 1, '#2a7038');
    }
  }
  r(c, cx - 2, 130, 5, 6, '#5a3a22');
  r(c, cx - 5, 135, 11, 4, '#8a3a2a'); r(c, cx - 5, 135, 11, 1, '#a84a34');
  if (n >= 14) {   // Kugeln
    for (const [x, y, f] of [[-3, 101, '#d8322e'], [4, 106, '#e0b64a'], [-6, 113, '#3a6ad0'], [2, 112, '#d8322e'], [8, 118, '#e0b64a'], [-9, 123, '#d8322e'], [-1, 121, '#3a6ad0'], [6, 126, '#d8322e'], [11, 127, '#3a6ad0'], [-4, 128, '#e0b64a']]) {
      p(c, cx + x, y, f); p(c, cx + x, y + 1, f);
    }
  }
  if (n >= 18) {   // Stern
    const y = 88;
    r(c, cx - 1, y, 3, 3, '#ffd84a'); p(c, cx, y - 2, '#ffd84a'); p(c, cx, y - 1, '#ffd84a');
    p(c, cx - 2, y + 1, '#ffd84a'); p(c, cx + 2, y + 1, '#ffd84a'); p(c, cx, y + 3, '#ffd84a'); p(c, cx, y + 1, '#fff6c0');
  }
}

const BAUM_LICHT = [[1, 96], [-3, 104], [3, 103], [-6, 110], [5, 109], [0, 108], [-9, 117], [9, 116], [-2, 115], [4, 118], [-12, 126], [12, 125], [-6, 124], [1, 125], [7, 122]];
function baumLichter(c) {
  for (const [x, y] of BAUM_LICHT) licht(c, 138 + x, y, '#ffe7a8', 0.4);
}

function licht(c, x, y, farbe, stark) {
  const g = c.createRadialGradient(x + 0.5, y + 0.5, 0, x + 0.5, y + 0.5, 4);
  g.addColorStop(0, `rgba(255, 220, 140, ${stark})`); g.addColorStop(1, 'rgba(255, 220, 140, 0)');
  c.fillStyle = g; c.fillRect(x - 4, y - 4, 9, 9);
  p(c, x, y, farbe);
}

function schnuere(c, n) {
  REIHEN.forEach((y, k) => {
    // Nägel an den Enden
    r(c, 1, y - 1, 2, 2, '#8a8070'); r(c, W - 3, y - 1, 2, 2, '#8a8070');
    if (n < 6) {
      r(c, 3, y, W - 6, 1, '#cbb68c');
    } else {   // Tannengirlande
      for (let x = 2; x < W - 2; x++) {
        r(c, x, y - 1, 1, 3, (x + k) % 3 ? '#23542b' : '#2e6a36');
        if ((x * 7 + k) % 5 === 0) p(c, x, y - 2, '#2e6a36');
        if ((x * 3 + k) % 4 === 0) p(c, x, y + 2, '#1c4724');
      }
    }
    if (n >= 14) {   // Schleifen an den Enden und in der Mitte
      for (const x of [4, W / 2, W - 5]) {
        r(c, x - 2, y - 1, 2, 2, '#c8322e'); r(c, x + 1, y - 1, 2, 2, '#c8322e'); p(c, x, y, '#e04a3e');
        p(c, x - 1, y + 1, '#a82a26'); p(c, x + 1, y + 2, '#a82a26');
      }
    }
    // Lichter: erst an der obersten Girlande, später an allen
    if (n >= 16 || (n >= 12 && k === 0)) {
      for (let x = 9; x < W - 6; x += 9.5) {
        if (Math.abs(x - W / 2) < 3) continue;
        licht(c, Math.round(x), y + 1, '#fff2c4', 0.35);
      }
    }
  });
}

function geschenke(c) {
  const paket = (x, y, w, h, f, band) => {
    r(c, x, y, w, h, f); r(c, x, y, w, 1, shade(f));
    r(c, x + (w >> 1), y, 1, h, band); r(c, x, y + (h >> 1), w, 1, band);
    p(c, x + (w >> 1) - 1, y - 1, band); p(c, x + (w >> 1) + 1, y - 1, band);
  };
  paket(124, 133, 8, 7, '#c8322e', '#ffd84a');
  paket(133, 135, 6, 5, '#2f5d9e', '#efe6d2');
  paket(145, 132, 9, 8, '#2f7d3a', '#c8322e');
  paket(154, 136, 5, 4, '#d9a520', '#c8322e');
  paket(40, 134, 8, 6, '#7d3f8f', '#ffd84a');
  paket(111, 136, 6, 4, '#efe6d2', '#c8322e');
}
