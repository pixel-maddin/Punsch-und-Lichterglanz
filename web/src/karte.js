/*
 * karte.js - die Übersichtskarte (09.10.), im Stil der Weltkarte von Super
 * Mario World: Dorflandschaft mit viel Natur, gepunktete Wege, in der Mitte
 * das eigene Haus. Sie ersetzt den Laden: Die Geschäfte sind jetzt ORTE auf
 * der Karte (Supermarkt, Baumarkt, Weihnachtsladen im Dorf, Wichtelwald),
 * dazu die Plätze für die Minispiele und den Weihnachtsmarkt.
 *
 * Gezeichnet wird in ein eigenes Canvas, 180 Pixel breit wie die Welt und so
 * hoch wie das ganze Spiel. Die Ortsschilder sind DOM-Knöpfe darüber (lesbar,
 * große Tippflächen). Antippen: Ein kleiner Wichtel läuft hin, dann öffnet
 * sich der Ort.
 */
import * as C from './config.js?v=20261009h';
import * as S from './spiel.js?v=20261009h';
import * as Z from './zeit.js?v=20261009h';
import { r, p, wichtelKlein } from './pixel.js?v=20261009h';

const $ = (s) => document.querySelector(s);

/**
 * Die Orte. x in Kartenpixeln (0-180), y als Anteil der Höhe. `tab` = das
 * Geschäft dahinter, `bald` = noch ein Platzhalter (Minispiel, Markt).
 */
export const ORTE = [
  { id: 'dorf',      name: 'Weihnachtsladen', x: 90,  y: 0.15, tab: 'markt' },
  { id: 'festplatz', name: 'Festplatz',       x: 30,  y: 0.17, bald: 'Hier steht alle paar Tage der Weihnachtsmarkt - mit Deko, die es nur dort gibt, und Verbesserungen für deine Getränke.' },
  { id: 'baeume',    name: 'Christbaumverkauf', x: 150, y: 0.19, bald: 'Fälle den Baum, den der Kunde will, pack ihn ein und lade ihn aufs Autodach. Je schneller, desto mehr Sterne.' },
  { id: 'super',     name: 'Supermarkt',      x: 34,  y: 0.38, tab: 'super' },
  { id: 'bau',       name: 'Baumarkt',        x: 148, y: 0.39, tab: 'baumarkt' },
  { id: 'haus',      name: 'Zuhause',         x: 90,  y: 0.53 },
  { id: 'lichtung',  name: 'Waldlichtung',    x: 30,  y: 0.72, spiel: 'lichtung' },
  { id: 'wichtel',   name: 'Wichtelwald',     x: 90,  y: 0.82, tab: 'wichtel' },
  { id: 'berg',      name: 'Schlittenberg',   x: 150, y: 0.72, bald: 'Im Wok den Berg hinunter, so schnell du kannst - an Bäumen, Steinen und Schneemännern vorbei.' },
];

let offen = false;
let cv = null, c = null, H = 320;
let wanderer = null;        // { von:{x,y}, nach:{x,y}, t, dauer, fertig }
let pos = null;             // wo der Wichtel gerade steht
let handler = null;         // was beim Ankommen passiert (ort) => void
let rafId = 0, letzte = 0;

export const istOffen = () => offen;
const yPx = (o) => Math.round(o.y * H);

/**
 * Karte öffnen. `beiAnkunft(ort)` entscheidet, was am Ort passiert (ui.js).
 * `hervor` = id eines Ortes, der pulsiert (Führung durch die Hinweise).
 */
export function oeffne(hoehe, beiAnkunft, hervor) {
  H = hoehe;
  handler = beiAnkunft;
  const el = $('#landkarte');
  cv = $('#kartenCv');
  cv.width = C.B; cv.height = H;
  c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  if (!pos) { const h = ORTE.find((o) => o.id === 'haus'); pos = { x: h.x, y: yPx(h) }; }
  baueSchilder(hervor);
  el.classList.remove('versteckt');
  offen = true;
  wanderer = null;
  letzte = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(takt);
}
export function schliesse() {
  offen = false;
  $('#landkarte').classList.add('versteckt');
  cancelAnimationFrame(rafId);
}

function baueSchilder(hervor) {
  const box = $('#kartenOrte');
  box.innerHTML = '';
  const neu = S.st.neu || {};
  for (const o of ORTE) {
    const b = document.createElement('button');
    b.className = 'ort' + (o.bald ? ' bald' : '') + (o.id === hervor ? ' hervor' : '') + (o.id === 'haus' ? ' zuhause' : '');
    b.style.left = `calc(var(--px) * ${o.x})`;
    b.style.top = `calc(var(--px) * ${yPx(o) + 9})`;
    const n = o.tab ? C.ARTIKEL.filter((a) => a.tab === o.tab && neu[a.id]).length : 0;
    b.innerHTML = `${o.name}${n ? `<b class="ort-neu">${n}</b>` : ''}${o.bald ? '<small>bald</small>' : o.spiel ? '<small>Minispiel</small>' : ''}`;
    b.onclick = () => gehe(o);
    box.appendChild(b);
    // Auch das Bild des Ortes selbst ist antippbar (größere Fläche)
    const f = document.createElement('button');
    f.className = 'ort-flaeche';
    f.style.left = `calc(var(--px) * ${o.x - 16})`;
    f.style.top = `calc(var(--px) * ${yPx(o) - 16})`;
    f.onclick = () => gehe(o);
    box.appendChild(f);
  }
}

/** Zum Ort laufen (kurz), dann öffnen. */
function gehe(o) {
  if (wanderer) return;
  const nach = { x: o.x, y: yPx(o) };
  const weit = Math.hypot(nach.x - pos.x, nach.y - pos.y);
  wanderer = { von: { ...pos }, nach, t: 0, dauer: Math.min(0.6, 0.15 + weit / 260), ort: o };
}

function takt(jetzt) {
  if (!offen) return;
  const dt = Math.min(0.1, (jetzt - letzte) / 1000);
  letzte = jetzt;
  const t = jetzt / 1000;
  if (wanderer) {
    wanderer.t += dt;
    const k = Math.min(1, wanderer.t / wanderer.dauer);
    pos = { x: wanderer.von.x + (wanderer.nach.x - wanderer.von.x) * k, y: wanderer.von.y + (wanderer.nach.y - wanderer.von.y) * k };
    if (k >= 1) { const o = wanderer.ort; wanderer = null; if (handler) handler(o); }
  }
  zeichne(t);
  rafId = requestAnimationFrame(takt);
}

// ---------------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------------
function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

function zeichne(t) {
  const winter = Z.schnee() > 0;
  const gras = winter ? '#e8eef4' : '#5aa04a', gras2 = winter ? '#d4dee8' : '#4a8c3e';
  r(c, 0, 0, C.B, H, gras);
  // Muster im Gras / Schnee
  for (let i = 0; i < 260; i++) p(c, Math.floor(hash(i) * C.B), Math.floor(hash(i + 999) * H), gras2);

  // Bach von oben rechts nach unten links, mit Brücke am Weg zum Wichtelwald
  const wasser = winter ? '#a8c8e8' : '#4a8ad8';
  for (let y = 0; y < H; y++) {
    const x = Math.round(118 + Math.sin(y / H * 5) * 12 - y / H * 40);
    r(c, x, y, 5, 1, wasser);
    if ((y + Math.floor(t * 6)) % 7 === 0) p(c, x + 1, y, '#ffffff');
  }

  // Wald unten (dichter Rand) und Baumgruppen
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(hash(i + 50) * C.B), y = Math.floor(H * 0.86 + hash(i + 80) * H * 0.14);
    baum(x, y, winter);
  }
  for (let i = 0; i < 28; i++) {
    const x = Math.floor(hash(i + 300) * C.B), y = Math.floor(hash(i + 400) * H * 0.8 + H * 0.05);
    // nicht auf Orten
    if (ORTE.some((o) => Math.abs(o.x - x) < 22 && Math.abs(yPx(o) - y) < 22)) continue;
    baum(x, y, winter);
  }
  // Berge oben am Rand
  for (let i = 0; i < 6; i++) {
    const bx = i * 34 - 6, bh = 16 + Math.floor(hash(i + 7) * 10);
    for (let k = 0; k < bh; k++) r(c, bx + 16 - k, 2 + k, k * 2 + 1, 1, k < 5 ? '#f4f8fc' : '#8a96a8');
  }

  // Wege: gepunktet vom Haus zu jedem Ort (wie die Weltkarte)
  const haus = ORTE.find((o) => o.id === 'haus');
  for (const o of ORTE) {
    if (o === haus) continue;
    weg(haus.x, yPx(haus), o.x, yPx(o));
  }

  // Die Orte
  for (const o of ORTE) {
    const x = o.x, y = yPx(o);
    r(c, x - 13, y + 4, 26, 3, winter ? '#c8d4e0' : '#3a7a34');   // Schatten/Fläche
    ({ dorf, festplatz, baeume: christbaeume, super: supermarkt, bau: baumarkt, haus: zuhause, lichtung, wichtel: wichtelwald, berg }[o.id])(x, y, t, winter);
  }

  // Der Wichtel (läuft beim Wechsel, sonst wippt er)
  const wipp = wanderer ? (Math.floor(t * 10) % 2) : 0;
  wichtelKlein(c, Math.round(pos.x) - 17, Math.round(pos.y) + 6 - wipp, t, 0);   // links neben dem Ort, das Schild steht darunter

  // Nachts etwas dunkler, mit Fensterlicht in den Orten
  const l = Z.licht();
  if (l.hell < 0.9) {
    c.fillStyle = `rgba(20,26,70,${((1 - l.hell) * 0.45).toFixed(3)})`;
    c.fillRect(0, 0, C.B, H);
    for (const o of ORTE) if (!o.bald) { p(c, o.x - 2, yPx(o) - 3, '#ffd070'); p(c, o.x + 2, yPx(o) - 3, '#ffd070'); }
  }
}

function weg(x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 6; i < n - 6; i += 4) {
    const k = i / n;
    // leicht geschwungen
    const x = x0 + (x1 - x0) * k + Math.sin(k * Math.PI) * (y1 - y0) * 0.08;
    const y = y0 + (y1 - y0) * k;
    r(c, x, y, 2, 2, '#e8d0a0'); p(c, x + 1, y + 1, '#b8955a');
  }
}

function baum(x, y, winter) {
  r(c, x, y, 1, 2, '#5a3a22');
  for (let i = 0; i < 4; i++) r(c, x - i, y - 5 + i, i * 2 + 1, 1, i % 2 ? '#1f5a2a' : '#2a6a32');
  if (winter) { p(c, x, y - 5, '#ffffff'); p(c, x - 1, y - 3, '#ffffff'); }
}
function haeuschen(x, y, wand, dach, b = 7, h = 5) {
  r(c, x - Math.floor(b / 2), y - h, b, h, wand);
  for (let i = 0; i < 4; i++) r(c, x - Math.floor(b / 2) - 1 + i, y - h - 1 - i, b + 2 - i * 2, 1, dach);
  p(c, x, y - 2, '#3a2a1a'); p(c, x, y - 1, '#3a2a1a');
}

function zuhause(x, y, t, winter) {
  haeuschen(x, y + 2, '#c83a32', winter ? '#f4f8fc' : '#5a3a32', 13, 8);
  r(c, x + 3, y - 12, 2, 4, '#8a4a3a');
  for (let i = 0; i < 3; i++) { const a = (t * 0.5 + i / 3) % 1; p(c, x + 4 + Math.sin(a * 6), y - 14 - a * 8, '#c8ccd4'); }
  p(c, x - 3, y - 3, '#ffd070'); p(c, x + 3, y - 3, '#ffd070');
}
function dorf(x, y, t, winter) {
  const d = winter ? '#f4f8fc' : '#6a3a2a';
  haeuschen(x - 10, y + 2, '#e8dcc0', d); haeuschen(x + 10, y + 2, '#d8c8a8', d);
  // Kirche
  r(c, x - 3, y - 12, 6, 14, '#f0ece0'); for (let i = 0; i < 6; i++) r(c, x - 3 + Math.floor(i / 2), y - 13 - i, 6 - Math.floor(i / 2) * 2, 1, '#3a6a4a');
  p(c, x, y - 20, '#e8c030');
  // Der Laden mit Stern
  r(c, x - 2, y - 5, 4, 3, '#c83a32'); p(c, x, y - 7, '#ffe060');
}
function festplatz(x, y, t, winter) {
  r(c, x - 12, y - 6, 24, 10, winter ? '#dce4ec' : '#c8b07a');
  for (let i = -12; i <= 12; i += 4) { p(c, x + i, y - 7, '#6a4a2a'); p(c, x + i, y + 4, '#6a4a2a'); }
  // Ein einzelner Stand mit Plane - leer, solange kein Markt ist
  r(c, x - 3, y - 4, 7, 4, '#8a5a32'); for (let i = 0; i < 7; i++) p(c, x - 3 + i, y - 5, i % 2 ? '#f4f0e8' : '#c83030');
}
function christbaeume(x, y, t, winter) {
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) baum(x - 9 + i * 7, y - 2 + j * 6, winter);
  r(c, x + 9, y - 4, 6, 5, '#8a5a32'); r(c, x + 8, y - 5, 8, 1, '#5a3a22');
}
function supermarkt(x, y, t, winter) {
  r(c, x - 9, y - 7, 18, 9, '#e8ecf0'); r(c, x - 9, y - 8, 18, 1, winter ? '#ffffff' : '#8a96a8');
  r(c, x - 9, y - 6, 18, 2, '#3a7ad8'); r(c, x - 2, y - 2, 4, 4, '#a8c8e8');
  r(c, x - 7, y - 1, 3, 2, '#a8c8e8'); r(c, x + 4, y - 1, 3, 2, '#a8c8e8');
  p(c, x - 5, y - 6, '#e84a4a'); p(c, x + 5, y - 6, '#e84a4a');
}
function baumarkt(x, y, t, winter) {
  r(c, x - 10, y - 8, 20, 10, '#e8862a'); r(c, x - 10, y - 9, 20, 1, winter ? '#ffffff' : '#a85a1a');
  r(c, x - 3, y - 3, 6, 5, '#5a3a22'); r(c, x - 8, y - 6, 4, 2, '#f4f4f4'); r(c, x + 4, y - 6, 4, 2, '#f4f4f4');
  // Hammer auf dem Dach
  r(c, x - 1, y - 13, 1, 4, '#6a4a2a'); r(c, x - 3, y - 14, 5, 2, '#5a5a62');
}
function lichtung(x, y, t, winter) {
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; baum(Math.round(x + Math.cos(a) * 14), Math.round(y + Math.sin(a) * 9), winter); }
  // Ein Hase hüpft
  const h = Math.abs(Math.sin(t * 3)) * 2;
  r(c, x - 1, y - 1 - h, 3, 2, '#c8b8a8'); p(c, x, y - 3 - h, '#c8b8a8'); p(c, x + 1, y - 3 - h, '#c8b8a8');
}
function wichtelwald(x, y, t, winter) {
  // Baumstammhäuser mit runden Türen und Lichtern
  for (const [dx, h] of [[-10, 9], [0, 12], [10, 8]]) {
    r(c, x + dx - 3, y - h, 6, h, '#7a5a3a'); r(c, x + dx - 3, y - h, 6, 1, '#9a7a5a');
    for (let i = 0; i < 4; i++) r(c, x + dx - 4 + i, y - h - 1 - i, 8 - i * 2, 1, i % 2 ? '#c83a32' : '#e84a4a');   // Pilzdach
    p(c, x + dx - 2, y - h - 3, '#ffffff'); p(c, x + dx + 2, y - h - 2, '#ffffff');
    r(c, x + dx - 1, y - 3, 2, 3, '#3a2a1a');
    if (Math.floor(t * 2 + dx) % 2) p(c, x + dx + 1, y - h + 2, '#ffd070');
  }
}
function berg(x, y, t, winter) {
  for (let k = 0; k < 16; k++) r(c, x - k, y - 14 + k, k * 2 + 1, 1, k < 4 || winter ? '#f4f8fc' : '#e0e8f0');
  // Spur und ein kleiner Wok, der herunterrutscht
  const a = (t * 0.4) % 1;
  for (let i = 0; i < 12; i++) p(c, x - 2 + i * 0.6, y - 12 + i, '#b8c8d8');
  r(c, x - 2 + a * 7, y - 12 + a * 12, 3, 1, '#3a3a40');
}
