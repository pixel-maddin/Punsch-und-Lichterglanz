/*
 * karte.js - die Übersichtskarte (09.10.), im Stil der Weltkarte von Super
 * Mario World: Dorflandschaft mit viel Natur, Wege mit Brücken, in der Mitte
 * das eigene Haus. Sie ersetzt den Laden: Die Geschäfte sind jetzt ORTE auf
 * der Karte (Supermarkt, Baumarkt, Weihnachtsladen im Dorf, Wichtelwald),
 * dazu die Plätze für die Minispiele und den Weihnachtsmarkt.
 *
 * Gezeichnet wird in ein eigenes Canvas, 180 Pixel breit wie die Welt und so
 * hoch wie das ganze Spiel. Die Ortsschilder sind DOM-Knöpfe darüber (lesbar,
 * große Tippflächen). Antippen: Ein kleiner Wichtel läuft hin, dann öffnet
 * sich der Ort.
 *
 * Zwei Ebenen (09.10.): Alles, was steht (Gelände, Fluss, Wege, Wald,
 * Gebäude), wird EINMAL in ein Zwischenbild gerechnet und nur neu gebaut,
 * wenn sich Höhe, Schnee oder Fassade ändern. Je Bild kommt nur dazu, was
 * sich bewegt (Rauch, Wasserglitzern, Tiere, Schlitten, Schneefall, Lichter).
 */
import * as C from './config.js?v=20261009j';
import * as S from './spiel.js?v=20261009j';
import * as Z from './zeit.js?v=20261009j';
import { r, p, ton, wichtelKlein, text as pixText } from './pixel.js?v=20261009j';

const $ = (s) => document.querySelector(s);

/**
 * Die Orte. x in Kartenpixeln (0-180), y als Anteil der Höhe. `tab` = das
 * Geschäft dahinter, `bald` = noch ein Platzhalter (Minispiel, Markt).
 */
export const ORTE = [
  { id: 'dorf',      name: 'Weihnachtsladen', x: 90,  y: 0.17, tab: 'markt' },
  { id: 'festplatz', name: 'Festplatz',       x: 30,  y: 0.19, bald: 'Hier steht alle paar Tage der Weihnachtsmarkt - mit Deko, die es nur dort gibt, und Verbesserungen für deine Getränke.' },
  { id: 'baeume',    name: 'Christbaumverkauf', x: 150, y: 0.21, bald: 'Fälle den Baum, den der Kunde will, pack ihn ein und lade ihn aufs Autodach. Je schneller, desto mehr Sterne.' },
  { id: 'super',     name: 'Supermarkt',      x: 34,  y: 0.40, tab: 'super' },
  { id: 'bau',       name: 'Baumarkt',        x: 148, y: 0.41, tab: 'baumarkt' },
  { id: 'haus',      name: 'Zuhause',         x: 88,  y: 0.55 },
  { id: 'lichtung',  name: 'Waldlichtung',    x: 30,  y: 0.75, spiel: 'lichtung' },
  { id: 'wichtel',   name: 'Wichtelwald',     x: 92,  y: 0.84, tab: 'wichtel' },
  { id: 'berg',      name: 'Schlittenberg',   x: 150, y: 0.74, bald: 'Im Wok den Berg hinunter, so schnell du kannst - an Bäumen, Steinen und Schneemännern vorbei.' },
];

let offen = false;
let cv = null, c = null, H = 320;
let wanderer = null;        // { von:{x,y}, nach:{x,y}, t, dauer, fertig }
let pos = null;             // wo der Wichtel gerade steht
let handler = null;         // was beim Ankommen passiert (ort) => void
let rafId = 0, letzte = 0, hervorId = null;

export const istOffen = () => offen;
const yPx = (o) => Math.round(o.y * H);
const ort = (id) => ORTE.find((o) => o.id === id);

/**
 * Karte öffnen. `beiAnkunft(ort)` entscheidet, was am Ort passiert (ui.js).
 * `hervor` = id eines Ortes, der pulsiert (Führung durch die Hinweise).
 */
export function oeffne(hoehe, beiAnkunft, hervor) {
  H = hoehe > 50 ? hoehe : 300;   // verborgenes Fenster: misst 0, der Takt korrigiert später
  handler = beiAnkunft;
  hervorId = hervor;
  const el = $('#landkarte');
  cv = $('#kartenCv');
  cv.width = C.B; cv.height = H;
  c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  const h = ort('haus');
  pos = { x: h.x, y: yPx(h) };
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

/** Schilder neu (Zähler „neu", pulsierender Ort) - nach einem Kauf. */
export function aktualisiere(hervor) { hervorId = hervor; baueSchilder(hervor); }

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
    f.style.top = `calc(var(--px) * ${yPx(o) - 18})`;
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
  // Fenstergröße hat sich geändert (Drehen, Tastatur, Vollbild): neu aufbauen,
  // sonst sitzen die Schilder nicht mehr auf ihren Orten
  const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 1;
  const soll = Math.round(cv.clientHeight / px);
  if (soll > 50 && Math.abs(soll - H) > 1) {
    H = soll; cv.height = H;
    const h = ort('haus'); pos = { x: h.x, y: yPx(h) }; wanderer = null;
    baueSchilder(hervorId);
  }
  if (wanderer) {
    wanderer.t += dt;
    const k = Math.min(1, wanderer.t / wanderer.dauer);
    pos = { x: wanderer.von.x + (wanderer.nach.x - wanderer.von.x) * k, y: wanderer.von.y + (wanderer.nach.y - wanderer.von.y) * k };
    if (k >= 1) { const o = wanderer.ort; wanderer = null; if (handler) handler(o); }
  }
  zeichne(t, dt);
  rafId = requestAnimationFrame(takt);
}

// ---------------------------------------------------------------------------
// Farben und Hilfen
// ---------------------------------------------------------------------------
function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
function hash2(x, y) { return hash(x * 17.31 + y * 91.7); }
/** Weiches Rauschen 0..1 (Gitterwerte, bilinear). */
function rausch(x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0), b = hash2(x0 + 1, y0), cc = hash2(x0, y0 + 1), d = hash2(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (cc - a) * sy + (a - b - cc + d) * sx * sy;
}

/** Die Palette je Jahreszeit: Spätherbst (November) oder Schnee. */
function palette(winter) {
  return winter ? {
    boden: ['#d6e1ec', '#e2eaf2', '#edf2f7', '#f7fafc'],
    weg: '#c4cfdb', wegRand: '#a6b5c6', wegStein: '#b4c2d1',
    wasser: '#9cc4e4', wasser2: '#d0e4f4', wasserTief: '#86b2d8', ufer: '#ffffff', glanz: '#ffffff',
    nadel: ['#1c4a30', '#275e3a', '#3a7448'], schnee: '#ffffff', schnee2: '#d8e4ef',
    busch: '#3a6248', fels: '#8c96a4', fels2: '#b4bdc8', dach: '#f6f9fc', dach2: '#d8e2ec',
  } : {
    boden: ['#4f803c', '#5b8d44', '#66994b', '#73a453'],
    weg: '#d8bf8a', wegRand: '#a98a58', wegStein: '#c2a670',
    wasser: '#3f7fc8', wasser2: '#5a98dc', wasserTief: '#2f66a8', ufer: '#b8a070', glanz: '#d8ecff',
    nadel: ['#1a4626', '#245a30', '#327040'], schnee: null, schnee2: null,
    busch: '#3d6a32', fels: '#7a7a78', fels2: '#a4a49c', dach: null, dach2: null,
  };
}

// Masken, damit Bäume nicht auf Wege, Wasser oder Gebäude wachsen
let belegt = null;
const markiere = (x, y, w, h) => {
  for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(H, y + h); yy++)
    for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(C.B, x + w); xx++) belegt[yy * C.B + xx] = 1;
};
const frei = (x, y) => x >= 0 && x < C.B && y >= 0 && y < H && !belegt[Math.floor(y) * C.B + Math.floor(x)];

// Lichter, die nachts leuchten: beim Bauen gesammelt, je Bild gezeichnet
let lichter = [];
const licht = (x, y, f = '#ffd070') => lichter.push({ x: Math.round(x), y: Math.round(y), f });

// ---------------------------------------------------------------------------
// Der Fluss: kommt aus den Bergen, fließt rechts am Haus vorbei in den Weiher
// ---------------------------------------------------------------------------
let flussCache = null, flussH = 0;
function flussPunkte() {
  if (flussCache && flussH === H) return flussCache;
  const k = [[117, 0.11], [121, 0.2], [116, 0.3], [118, 0.42], [111, 0.52], [106, 0.6], [92, 0.645], [72, 0.655], [62, 0.645]];
  const pts = [];
  for (let i = 0; i < k.length - 1; i++) {
    const [x0, y0] = k[i], [x1, y1] = k[i + 1];
    const a = k[i - 1] || k[i], b = k[i + 2] || k[i + 1];
    for (let s = 0; s < 1; s += 0.02) {
      // Catmull-Rom zwischen den Stützpunkten
      const s2 = s * s, s3 = s2 * s;
      const f = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 + (-p0 + 3 * p1 - 3 * p2 + p3) * s3);
      pts.push({ x: f(a[0], x0, x1, b[0]), y: f(a[1], y0, y1, b[1]) * H, b: 3 + i * 0.35 });
    }
  }
  flussCache = pts; flussH = H;
  return pts;
}
const WEIHER = () => ({ x: 52, y: Math.round(0.645 * H), rx: 15, ry: 8 });

// ---------------------------------------------------------------------------
// Die Wege: ein Netz statt Strahlen vom Haus
// ---------------------------------------------------------------------------
function wege() {
  const P = (id) => { const o = ort(id); return [o.x, yPx(o) + 3]; };
  return [
    [P('haus'), P('dorf'), [82, 0.36 * H]],
    [P('dorf'), P('festplatz'), [60, 0.23 * H]],
    [P('dorf'), P('baeume'), [122, 0.15 * H]],
    [P('haus'), P('super'), [58, 0.53 * H]],
    [P('super'), P('festplatz'), [22, 0.3 * H]],
    [P('haus'), P('bau'), [128, 0.55 * H]],
    [P('haus'), P('wichtel'), [104, 0.7 * H]],
    [P('wichtel'), P('lichtung'), [56, 0.86 * H]],
    [P('haus'), P('berg'), [138, 0.6 * H]],
  ];
}
function bezier(a, b, k, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, u = 1 - s;
    pts.push({ x: u * u * a[0] + 2 * u * s * k[0] + s * s * b[0], y: u * u * a[1] + 2 * u * s * k[1] + s * s * b[1] });
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Die stehende Ebene
// ---------------------------------------------------------------------------
let grund = null, grundSchl = '', grundLichter = [];

function baueGrund(winter) {
  const schl = `${H}|${winter}|${S.st.fassade}`;
  if (grund && grundSchl === schl) return;
  grundSchl = schl;
  grund = document.createElement('canvas');
  grund.width = C.B; grund.height = H;
  const ziel = c;
  c = grund.getContext('2d');
  belegt = new Uint8Array(C.B * H);
  lichter = [];
  const P = palette(winter);

  // 1. Boden: weiches Rauschen in vier Tönen, dazu feine Körnung
  const img = c.createImageData(C.B, H);
  const farben = P.boden.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  for (let y = 0; y < H; y++) for (let x = 0; x < C.B; x++) {
    const v = rausch(x / 16, y / 16) * 0.65 + rausch(x / 5 + 40, y / 5) * 0.35 + (hash2(x, y) - 0.5) * 0.18;
    const f = farben[Math.max(0, Math.min(3, Math.floor(v * 4.2 - 0.3)))];
    const i = (y * C.B + x) * 4;
    img.data[i] = f[0]; img.data[i + 1] = f[1]; img.data[i + 2] = f[2]; img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);

  // 2. Berge am oberen Rand: hinten blau, vorn grau mit Schneekappen
  berge(winter);
  markiere(0, 0, C.B, Math.round(0.1 * H));

  // 3. Fluss und Weiher
  const fluss = flussPunkte();
  for (const q of fluss) kreis(q.x, q.y, q.b + 1.4, P.ufer);
  for (const q of fluss) { kreis(q.x, q.y, q.b, P.wasser); markiere(q.x - q.b - 2, q.y - q.b - 2, q.b * 2 + 4, q.b * 2 + 4); }
  for (const q of fluss) if (q.b > 3.4) kreis(q.x, q.y, q.b - 1.6, P.wasserTief);
  const w = WEIHER();
  ellipse(w.x, w.y, w.rx + 1.5, w.ry + 1.5, P.ufer);
  ellipse(w.x, w.y, w.rx, w.ry, P.wasser);
  ellipse(w.x + 1, w.y + 1, w.rx - 4, w.ry - 3, P.wasserTief);
  markiere(w.x - w.rx - 3, w.y - w.ry - 3, w.rx * 2 + 6, w.ry * 2 + 6);
  if (winter) {
    // Eis: helle Streifen und Risse
    for (let i = 0; i < 14; i++) { const x = w.x - 10 + hash(i + 7) * 20, y = w.y - 4 + hash(i + 9) * 8; r(c, x, y, 3, 1, P.wasser2); }
    for (let i = 0; i < 5; i++) p(c, w.x - 6 + i * 3, w.y - 2 + (i % 2), '#ffffff');
    for (const q of fluss) if (hash(q.y) < 0.25) r(c, q.x - 1, q.y, 2, 1, P.wasser2);
  } else {
    // Schilf am Weiher
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.15 + hash(i + 3) * 0.7), x = w.x + Math.cos(a) * (w.rx + 1), y = w.y + Math.sin(a) * (w.ry + 0.5);
      r(c, x, y - 4, 1, 4, '#5a7a32'); p(c, x, y - 5, '#6a4a28');
    }
    // Seerosen
    for (const [dx, dy] of [[-6, -2], [5, 2], [-1, 3]]) { r(c, w.x + dx, w.y + dy, 3, 2, '#3f8a3a'); p(c, w.x + dx + 1, w.y + dy, '#f4c4d4'); }
  }

  // 4. Wege mit Rand, Steinen und Brücken über das Wasser
  const wasserBei = (x, y) => { for (const q of fluss) if (Math.hypot(q.x - x, q.y - y) < q.b + 0.6) return true; return false; };
  const alle = wege().map(([a, b, k]) => bezier(a, b, k, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.5)));
  const bruecken = [];
  for (const pts of alle) for (const q of pts) {
    if (wasserBei(q.x, q.y)) { bruecken.push(q); continue; }
    r(c, q.x - 2, q.y - 1, 5, 4, P.wegRand);
  }
  for (const pts of alle) for (const q of pts) {
    if (wasserBei(q.x, q.y)) continue;
    r(c, q.x - 1, q.y, 3, 2, P.weg);
    markiere(q.x - 3, q.y - 3, 7, 7);
  }
  for (const pts of alle) for (let i = 0; i < pts.length; i += 7) {
    const q = pts[i];
    if (!wasserBei(q.x, q.y) && hash(i + q.x) < 0.5) p(c, q.x + (hash(i) < 0.5 ? -1 : 1), q.y + 1, P.wegStein);
  }
  for (const q of bruecken) { r(c, q.x - 3, q.y - 1, 7, 4, '#6a4626'); r(c, q.x - 2, q.y, 5, 2, '#a8763e'); }
  for (const q of bruecken) { p(c, q.x - 3, q.y - 2, '#4a2e18'); p(c, q.x + 3, q.y - 2, '#4a2e18'); }
  if (winter) for (const q of bruecken) if (hash(q.x * 3) < 0.5) p(c, q.x, q.y, '#ffffff');

  // 5. Platz für die Gebäude und die Schilder darunter freihalten
  for (const o of ORTE) {
    markiere(o.x - 20, yPx(o) - 26, 40, 32);
    markiere(o.x - 26, yPx(o) + 7, 52, 13);
  }
  markiere(w.x - 22, w.y - 12, 44, 24);

  // 6. Wald und Einzelbäume, nach unten sortiert (vorn liegt vorn)
  const baeume = [];
  const dicht = (x, y) => {
    const yy = y / H;
    let d = 0.06;
    if (yy > 0.9) d = 0.95;                                     // Waldrand unten
    else if (yy > 0.8) d = 0.5;
    if (yy < 0.17) d = Math.max(d, 0.55);                       // Vorberge
    if (x < 10 || x > 170) d = Math.max(d, 0.6);                // Seitenränder
    const l = ort('lichtung'); if (Math.hypot(x - l.x, (y - yPx(l)) * 1.3) < 30) d = Math.max(d, 0.8);
    const wi = ort('wichtel'); if (Math.hypot(x - wi.x, y - yPx(wi)) < 34) d = Math.max(d, 0.75);
    const ba = ort('baeume'); if (Math.hypot(x - ba.x, y - yPx(ba)) < 30) d = Math.max(d, 0.5);
    const be = ort('berg'); if (Math.hypot(x - be.x, y - yPx(be)) < 32) d = Math.max(d, 0.45);
    return d;
  };
  for (let y = 4; y < H + 8; y += 4) for (let x = 2; x < C.B; x += 5) {
    const jx = x + (hash2(x, y) - 0.5) * 5, jy = y + (hash2(y, x) - 0.5) * 4;
    if (hash2(x + 3, y + 7) > dicht(jx, jy)) continue;
    if (!frei(jx, jy) || !frei(jx, jy - 4)) continue;
    baeume.push({ x: Math.round(jx), y: Math.round(jy), g: hash2(x, y * 3) < 0.25 ? 2 : hash2(x * 5, y) < 0.5 ? 1 : 0, laub: !winter && hash2(x * 7, y) < 0.12 });
  }
  // Büsche, Felsen und Kleinkram auf freien Flächen
  for (let i = 0; i < 70; i++) {
    const x = Math.round(hash(i + 900) * C.B), y = Math.round(0.12 * H + hash(i + 950) * H * 0.78);
    if (!frei(x, y)) continue;
    const k = hash(i + 990);
    if (k < 0.45) busch(x, y, P, winter);
    else if (k < 0.75) fels(x, y, P, winter);
    else if (!winter && k < 0.92) { p(c, x, y, '#e8d870'); p(c, x + 2, y + 1, '#d87a5a'); }
    else if (winter) schneemannKlein(x, y);
  }
  baeume.sort((a, b) => a.y - b.y);
  for (const b of baeume) (b.laub ? laubbaum : tanne)(b.x, b.y, b.g, P);

  // 7. Laternen am Weg ins Dorf
  const [a0, b0, k0] = wege()[0];
  const dorfWeg = bezier(a0, b0, k0, 10);
  for (let i = 2; i < 9; i += 2) laterne(dorfWeg[i].x + 4, dorfWeg[i].y);

  // 8. Die Orte
  for (const o of ORTE) ZEICHNER[o.id](o.x, yPx(o), P, winter);
  // Wegweiser an der Kreuzung vor dem Haus
  wegweiser(ort('haus').x - 12, yPx(ort('haus')) + 10);

  grundLichter = lichter;
  c = ziel;
}

// --- Bausteine --------------------------------------------------------------
function kreis(cx, cy, rad, f) {
  c.fillStyle = f;
  for (let y = Math.floor(-rad); y <= rad; y++) {
    const w = Math.floor(Math.sqrt(Math.max(0, rad * rad - y * y)));
    c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
function ellipse(cx, cy, rx, ry, f) {
  c.fillStyle = f;
  for (let y = -Math.floor(ry); y <= ry; y++) {
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
function schattenOval(x, y, w) { c.fillStyle = 'rgba(20,30,40,0.22)'; c.fillRect(Math.round(x - w / 2), Math.round(y), w, 1); c.fillRect(Math.round(x - w / 2 + 1), Math.round(y + 1), w - 2, 1); }

function berge(winter) {
  const basis = Math.round(0.1 * H);
  // Himmel hinter den Gipfeln
  for (let y = 0; y < basis; y++) r(c, 0, y, C.B, 1, y < basis * 0.5 ? '#9cc4e8' : '#b8d6f0');
  const zug = (gipfel, farbe, hell, dunkel, kappe, kappe2, y0) => {
    for (let x = 0; x < C.B; x++) {
      let hoch = 0, seite = 0;
      for (const [gx, gh] of gipfel) { const h = gh - Math.abs(x - gx) * 0.9; if (h > hoch) { hoch = h; seite = x - gx; } }
      hoch = Math.round(hoch + (hash(x * 3.1) - 0.5) * 1.4);
      if (hoch <= 0) continue;
      for (let k = 0; k < hoch; k++) {
        const nah = hoch - k;                                        // Abstand zur Kante oben
        let f = seite > 0 ? dunkel : (seite < -2 ? hell : farbe);
        if (nah <= Math.max(3, hoch * 0.3)) f = seite > 0 ? kappe2 : kappe;
        p(c, x, y0 - k, f);
      }
    }
  };
  zug([[8, 18], [40, 22], [72, 16], [104, 24], [138, 19], [172, 23]], '#8aa0bc', '#9cb0ca', '#7488a6', '#f2f6fb', '#cfdcea', basis - 2);
  zug([[-4, 14], [24, 17], [58, 13], [92, 19], [124, 15], [158, 18], [186, 12]], '#7d8899', '#929dad', '#626c7c', '#ffffff', '#d4dde8', basis + 3);
  // Waldsaum am Fuß der Berge
  for (let x = 0; x < C.B; x += 2) {
    const h = 2 + Math.floor(hash(x * 1.7) * 3);
    r(c, x, basis + 3 - h, 2, h + 1, winter ? '#3a5a48' : '#2c5236');
    if (winter) p(c, x, basis + 3 - h, '#e8eef4');
  }
}

function tanne(x, y, g, P) {
  const h = [7, 9, 12][g], b = [2, 3, 4][g];
  schattenOval(x, y + 1, b * 2 + 2);
  r(c, x, y - 1, 1, 2, '#4a2e1a');
  const stufen = g + 2;
  for (let s = 0; s < stufen; s++) {
    // Jede Stufe ein Dreieck, nach unten breiter
    const oben = y - h + Math.floor(s * (h - 2) / stufen), unten = oben + Math.ceil((h - 1) / stufen) + 1;
    for (let yy = oben; yy < unten; yy++) {
      const w = Math.min(b + s, Math.floor((yy - oben + 1) * (b + s) / (unten - oben)) + s);
      r(c, x - w, yy, w, 1, P.nadel[2]);                       // Lichtseite links
      r(c, x, yy, w + 1, 1, P.nadel[1]);
      p(c, x + w, yy, P.nadel[0]);
      if (P.schnee && yy === oben) r(c, x - w, yy, w * 2 + 1, 1, P.schnee);
      else if (P.schnee && yy === unten - 1 && s > 0) p(c, x - w, yy, P.schnee2);
    }
  }
  p(c, x, y - h - 1, P.schnee || P.nadel[1]);
}
function laubbaum(x, y) {
  // Spätherbst: kahle Krone mit ein paar letzten Blättern
  schattenOval(x, y + 1, 6);
  r(c, x, y - 6, 1, 7, '#5a3e28');
  p(c, x - 1, y - 5, '#5a3e28'); p(c, x - 2, y - 6, '#5a3e28'); p(c, x + 1, y - 4, '#5a3e28'); p(c, x + 2, y - 5, '#5a3e28'); p(c, x + 2, y - 6, '#5a3e28');
  for (let i = 0; i < 6; i++) p(c, x - 2 + Math.floor(hash(x + i) * 5), y - 8 + Math.floor(hash(y + i) * 4), ['#c8742a', '#d89a3a', '#a85a2a'][i % 3]);
}
function busch(x, y, P, winter) {
  r(c, x - 2, y - 2, 5, 3, P.busch); r(c, x - 1, y - 3, 3, 1, P.busch);
  p(c, x - 1, y - 2, ton(P.busch, 0.25));
  if (winter) { r(c, x - 1, y - 3, 3, 1, '#ffffff'); p(c, x - 2, y - 2, '#e8eef4'); }
  else if (hash(x * y) < 0.4) p(c, x + 1, y - 1, '#c83a3a');
}
function fels(x, y, P, winter) {
  r(c, x - 2, y - 1, 4, 2, P.fels); r(c, x - 1, y - 2, 2, 1, P.fels2); p(c, x + 1, y, ton(P.fels, -0.25));
  if (winter) r(c, x - 1, y - 2, 2, 1, '#ffffff');
}
function schneemannKlein(x, y) {
  r(c, x - 1, y - 2, 3, 2, '#ffffff'); p(c, x, y - 3, '#ffffff'); p(c, x, y - 4, '#2a2a30'); p(c, x + 1, y - 3, '#e87a2a');
}
function laterne(x, y) {
  r(c, x, y - 7, 1, 7, '#2e3440'); r(c, x - 1, y - 8, 3, 2, '#3a4250'); p(c, x, y - 7, '#ffe8a0');
  licht(x, y - 7, '#ffe8a0');
}
function wegweiser(x, y) {
  r(c, x, y - 7, 1, 7, '#5a3a22');
  r(c, x - 3, y - 7, 5, 2, '#c89a5a'); p(c, x - 4, y - 6, '#c89a5a');
  r(c, x, y - 4, 5, 2, '#b8884a'); p(c, x + 5, y - 3, '#b8884a');
}
function fenster(x, y, w = 2, h = 2, an = true) {
  r(c, x, y, w, h, an ? '#f8d878' : '#3a4a60');
  if (an) for (let i = 0; i < w; i++) licht(x + i, y);
}
/** Satteldach mit optionalem Schnee. */
function dach(x, y, b, h, f, f2, P) {
  for (let i = 0; i < h; i++) {
    const w = b - Math.floor(i * b / h / 2) * 2;
    const xx = x + Math.floor((b - w) / 2);
    r(c, xx, y - i, w, 1, i === 0 ? f2 : f);
    p(c, xx + w - 1, y - i, f2);
    if (P && P.dach) r(c, xx, y - i, w - 1, 1, i < 1 ? P.dach2 : P.dach);
  }
}
/** Kleines Haus mit Dach, Tür und Fenstern (Fachwerk auf Wunsch). */
function haus(x, y, b, h, wand, dachF, P, fachwerk) {
  r(c, x, y - h, b, h, wand);
  r(c, x + b - 1, y - h, 1, h, ton(wand, -0.18));
  if (fachwerk) { for (let i = 0; i < b; i += 3) r(c, x + i, y - h, 1, h, '#5a3a24'); r(c, x, y - h, b, 1, '#5a3a24'); }
  dach(x - 1, y - h - 1, b + 2, Math.ceil(b / 2) + 1, dachF, ton(dachF, -0.25), P);
  r(c, x + Math.floor(b / 2) - 1, y - 3, 2, 3, '#4a2e1a');
  if (b >= 7) { fenster(x + 1, y - h + 2); fenster(x + b - 3, y - h + 2); }
}

// ---------------------------------------------------------------------------
// Die Orte (jeder etwa 36 x 26 Pixel; gezeichnet um den Fußpunkt x, y)
// ---------------------------------------------------------------------------
function zuhause(x, y, P) {
  const F = C.FASSADEN[S.st.fassade] || C.FASSADEN.trist;
  schattenOval(x, y + 2, 34);
  // Gartenzaun
  for (let i = -17; i <= 17; i += 2) r(c, x + i, y - 1, 1, 3, '#f2ead8');
  r(c, x - 17, y, 35, 1, '#e0d6c0');
  // Das Haus
  r(c, x - 11, y - 14, 22, 14, F.wand);
  r(c, x + 9, y - 14, 2, 14, F.wand2);
  dach(x - 13, y - 15, 26, 9, F.dach, F.dach2, P);
  r(c, x + 5, y - 25, 3, 6, ton(F.dach, -0.3));                // Schornstein
  if (P.dach) r(c, x + 5, y - 25, 3, 1, '#ffffff');
  fenster(x - 8, y - 11, 3, 3); fenster(x + 5, y - 11, 3, 3); fenster(x - 1, y - 20, 2, 2);
  r(c, x - 2, y - 6, 4, 6, F.tuer); p(c, x + 1, y - 3, '#e8c030');
  // Kranz an der Tür
  p(c, x - 1, y - 8, '#2a6a32'); p(c, x, y - 8, '#2a6a32'); p(c, x, y - 7, '#c83a32');
  // Lichterkette unter dem Dach
  for (let i = -12; i <= 12; i += 2) { p(c, x + i, y - 15, ['#ff5a5a', '#ffe060', '#5ad0ff', '#7ae07a'][(i + 12) / 2 % 4]); licht(x + i, y - 15, '#ffe8a0'); }
  // Tanne mit Stern links, Punschstand rechts
  tanne(x - 15, y + 1, 1, P);
  p(c, x - 15, y - 10, '#ffe060'); licht(x - 15, y - 10, '#ffe060');
  r(c, x + 13, y - 5, 6, 5, '#8a5a32');
  for (let i = 0; i < 8; i++) p(c, x + 12 + i, y - 6, i % 2 ? '#f4f0e8' : '#c83030');
  for (let i = 0; i < 8; i++) p(c, x + 12 + i, y - 7, i % 2 ? '#c83030' : '#f4f0e8');
  licht(x + 15, y - 4, '#ffb050');
}

function dorf(x, y, P, winter) {
  schattenOval(x, y + 2, 46);
  // Pflaster des Dorfplatzes
  r(c, x - 22, y - 1, 44, 4, winter ? '#c8d2de' : '#b8ab92');
  for (let i = -21; i < 22; i += 3) p(c, x + i, y + 1, winter ? '#b4c0ce' : '#a29478');
  // Kirchturm hinten in der Mitte
  r(c, x - 3, y - 26, 7, 22, '#ece6d6'); r(c, x + 2, y - 26, 2, 22, '#d4cbb6');
  for (let i = 0; i < 9; i++) r(c, x - 3 + Math.floor(i / 3), y - 27 - i, 7 - Math.floor(i / 3) * 2, 1, winter ? (i < 2 ? '#f4f8fc' : '#4a7a5a') : '#3e7454');
  p(c, x, y - 37, '#e8c030'); r(c, x - 1, y - 36, 3, 1, '#e8c030');
  r(c, x - 1, y - 22, 3, 3, '#f8f4ea'); p(c, x, y - 21, '#2a2a2a'); p(c, x + 1, y - 22, '#2a2a2a');   // Uhr
  fenster(x - 1, y - 16, 2, 3);
  // Häuserzeile: Fachwerk und bunter Putz
  haus(x - 21, y, 8, 9, '#e8dcc0', '#8a3a2a', P, true);
  haus(x - 13, y, 7, 12, '#d8a888', '#6a3a2a', P);
  haus(x + 6, y, 8, 11, '#b8c8d8', '#5a3a32', P);
  haus(x + 14, y, 8, 8, '#efe0a8', '#8a3a2a', P, true);
  // Der Weihnachtsladen vorn in der Mitte: Schaufenster, Markise, Stern
  r(c, x - 6, y - 10, 12, 10, '#a8352c'); r(c, x + 4, y - 10, 2, 10, '#8e2a23');
  dach(x - 7, y - 11, 14, 5, '#3b3a44', '#2e2d35', P);
  for (let i = 0; i < 12; i++) p(c, x - 6 + i, y - 7, i % 2 ? '#f4f0e8' : '#2f8a3a');
  for (let i = 0; i < 12; i += 2) p(c, x - 6 + i, y - 6, '#2f8a3a');
  r(c, x - 5, y - 5, 4, 3, '#f8d878'); r(c, x + 2, y - 5, 3, 3, '#f8d878');
  p(c, x - 4, y - 4, '#c83a32'); p(c, x - 2, y - 3, '#2f8a3a'); p(c, x + 3, y - 4, '#e8c030');
  licht(x - 4, y - 5); licht(x + 3, y - 5);
  r(c, x - 1, y - 4, 2, 4, '#4a2e1a');
  // Der große Stern über der Tür
  p(c, x, y - 13, '#ffe060'); p(c, x - 1, y - 12, '#ffe060'); p(c, x + 1, y - 12, '#ffe060'); p(c, x, y - 11, '#ffe060');
  licht(x, y - 12, '#ffe060');
  // Christbaum auf dem Platz
  tanne(x + 22, y + 3, 1, P);
  for (const [dx, dy] of [[-1, -5], [1, -3], [0, -7], [-2, -2], [2, -1]]) { p(c, x + 22 + dx, y + 3 + dy, '#ffe060'); licht(x + 22 + dx, y + 3 + dy, '#ffe060'); }
  laterne(x - 24, y + 3);
}

function festplatz(x, y, P, winter) {
  schattenOval(x, y + 3, 36);
  // Fester Platz mit Holzzaun
  r(c, x - 17, y - 12, 34, 15, winter ? '#dce4ec' : '#c4ac7c');
  for (let i = 0; i < 26; i++) p(c, x - 16 + Math.floor(hash(i + 11) * 32), y - 11 + Math.floor(hash(i + 31) * 13), winter ? '#ccd6e2' : '#b09868');
  for (let i = -17; i <= 17; i += 3) { r(c, x + i, y - 14, 1, 3, '#6a4a2a'); r(c, x + i, y + 2, 1, 3, '#6a4a2a'); }
  r(c, x - 17, y - 13, 35, 1, '#8a6a42'); r(c, x - 17, y + 3, 35, 1, '#8a6a42');
  // Bühne hinten
  r(c, x - 7, y - 11, 14, 4, '#7a5030'); r(c, x - 7, y - 11, 14, 1, '#a8763e');
  r(c, x - 8, y - 17, 1, 7, '#5a3a22'); r(c, x + 7, y - 17, 1, 7, '#5a3a22');
  // Leere Standgerüste (noch kein Markt)
  for (const dx of [-13, 10]) {
    r(c, x + dx, y - 5, 1, 5, '#6a4a2a'); r(c, x + dx + 5, y - 5, 1, 5, '#6a4a2a'); r(c, x + dx, y - 6, 6, 1, '#8a6a42');
    for (let i = 0; i < 6; i++) p(c, x + dx + i, y - 7, i % 2 ? '#e8e0d0' : '#a8a098');   // abgedeckte Plane
  }
  // Ein Karussell in der Mitte, zugedeckt
  ellipse(x, y - 1, 5, 2, '#8a5a6a'); r(c, x, y - 8, 1, 6, '#c8a040');
  for (let i = -4; i <= 4; i++) p(c, x + i, y - 8 + Math.floor(Math.abs(i) / 2), i % 2 ? '#f4e8f0' : '#c86a8a');
}

function christbaeume(x, y, P, winter) {
  schattenOval(x, y + 3, 38);
  r(c, x - 18, y - 13, 36, 16, winter ? '#e4ecf2' : '#a8946a');
  // Reihen eingenetzter Bäume
  for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) {
    const bx = x - 15 + i * 6 + j * 2, by = y - 6 + j * 7;
    tanne(bx, by, 0, P);
    for (let k = 0; k < 4; k++) p(c, bx - 1 + (k % 2) * 2, by - 2 - k * 1.4, '#e8e4dc');   // Netz
  }
  // Hütte mit Schild
  r(c, x + 9, y - 10, 9, 8, '#8a5a32'); r(c, x + 9, y - 10, 9, 1, '#a8763e');
  dach(x + 8, y - 11, 11, 4, '#5a3a22', '#4a2e1a', P);
  r(c, x + 10, y - 16, 7, 3, '#c83a32'); p(c, x + 13, y - 15, '#ffe060');
  fenster(x + 11, y - 7, 2, 2); r(c, x + 15, y - 5, 2, 3, '#3a2a1a');
  // Kleines Auto mit Baum auf dem Dach
  r(c, x + 4, y + 1, 10, 3, '#3a6ab8'); r(c, x + 6, y - 1, 6, 2, '#4a7ac8'); r(c, x + 7, y - 1, 2, 1, '#a8d0f0');
  p(c, x + 5, y + 4, '#1a1a1a'); p(c, x + 12, y + 4, '#1a1a1a');
  r(c, x + 5, y - 3, 9, 2, P.nadel[1]); p(c, x + 13, y - 3, P.nadel[2]); p(c, x + 7, y - 2, '#e8e4dc');
  // Zaun vorn
  for (let i = -18; i <= 0; i += 3) r(c, x + i, y + 1, 1, 3, '#6a4a2a');
  r(c, x - 18, y + 2, 19, 1, '#8a6a42');
}

function supermarkt(x, y, P, winter) {
  schattenOval(x, y + 6, 38);
  // Parkplatz
  r(c, x - 18, y - 1, 36, 7, '#5a5e66');
  for (let i = -16; i < 18; i += 6) r(c, x + i, y, 1, 4, '#e8e8e8');
  if (winter) for (let i = 0; i < 10; i++) p(c, x - 17 + hash(i + 3) * 34, y + hash(i + 5) * 6, '#e8eef4');
  // Autos und Einkaufswagen
  r(c, x - 14, y + 1, 4, 3, '#c83a32'); p(c, x - 13, y + 1, '#f0a8a0');
  r(c, x + 5, y + 1, 4, 3, '#e8c030'); p(c, x + 6, y + 1, '#f8e8a0');
  r(c, x + 12, y + 1, 3, 2, '#c8ccd4'); r(c, x + 13, y + 1, 3, 2, '#b8bcc4');
  // Flache Halle mit Glasfront und Schild
  r(c, x - 16, y - 14, 32, 13, '#e8e8e4');
  r(c, x + 14, y - 14, 2, 13, '#c8c8c4');
  r(c, x - 17, y - 15, 34, 2, winter ? '#ffffff' : '#9aa0aa');
  r(c, x - 16, y - 13, 32, 6, '#c8302a');
  pixText(c, 'MARKT', x - 9, y - 13, '#ffffff', '#7a1a14');
  for (let i = 0; i < 6; i++) { fenster(x - 15 + i * 5, y - 6, 4, 4); r(c, x - 15 + i * 5, y - 6, 4, 1, '#d8eef8'); }
  r(c, x - 2, y - 6, 4, 5, '#a8d8f0'); r(c, x, y - 6, 1, 5, '#6a9ab8');
  // Blaues Dreieckslogo
  p(c, x + 12, y - 12, '#3a7ad8'); r(c, x + 11, y - 11, 3, 1, '#3a7ad8');
}

function baumarkt(x, y, P, winter) {
  schattenOval(x, y + 3, 38);
  // Große Halle mit Wellblech
  r(c, x - 15, y - 16, 30, 16, '#e8862a');
  for (let i = -15; i < 15; i += 2) r(c, x + i, y - 9, 1, 9, '#d4761e');
  r(c, x + 13, y - 16, 2, 16, '#c86a1a');
  r(c, x - 16, y - 17, 32, 2, winter ? '#ffffff' : '#a85a1a');
  r(c, x - 13, y - 15, 26, 6, '#2a2e36');
  pixText(c, 'BAU', x - 11, y - 15, '#ffb040', null);
  // Hammer neben der Schrift
  r(c, x + 6, y - 14, 1, 4, '#c8a060'); r(c, x + 4, y - 15, 5, 2, '#b8bcc4');
  // Rolltor und Eingang
  r(c, x - 11, y - 8, 9, 8, '#9a9ea8'); for (let i = 0; i < 8; i += 2) r(c, x - 11, y - 8 + i, 9, 1, '#8a8e98');
  r(c, x + 2, y - 7, 5, 7, '#a8d8f0'); r(c, x + 4, y - 7, 1, 7, '#6a9ab8'); licht(x + 4, y - 6, '#f8f0c8');
  fenster(x + 9, y - 7, 4, 2);
  // Draußen: Holzstapel und Paletten
  for (let i = 0; i < 3; i++) r(c, x + 16, y - 2 - i * 2, 6, 2, i % 2 ? '#c89a5a' : '#b8884a');
  for (let i = 0; i < 3; i++) p(c, x + 16, y - 2 - i * 2, '#8a5a2a');
  r(c, x - 21, y - 2, 5, 2, '#b8884a'); r(c, x - 21, y - 4, 5, 2, '#d8d0c0');
  if (winter) { r(c, x + 16, y - 7, 6, 1, '#ffffff'); r(c, x - 21, y - 5, 5, 1, '#ffffff'); }
}

function lichtung(x, y, P, winter) {
  // Lichtung: heller Grund, Futterraufe in der Mitte, Baumring
  ellipse(x, y - 4, 15, 8, winter ? '#f6f9fc' : '#7cb35c');
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + 0.3;
    if (Math.sin(a) > 0.55) continue;                            // vorn offen, sonst stehen Bäume vor dem Schild
    tanne(Math.round(x + Math.cos(a) * 18), Math.round(y - 3 + Math.sin(a) * 11), i % 3 === 0 ? 2 : 1, P);
  }
  // Raufe mit Heu
  r(c, x - 4, y - 7, 1, 6, '#5a3a22'); r(c, x + 4, y - 7, 1, 6, '#5a3a22');
  r(c, x - 4, y - 5, 9, 3, '#c8a050'); for (let i = 0; i < 9; i += 2) p(c, x - 4 + i, y - 6, '#e8c870');
  dach(x - 6, y - 8, 13, 4, '#7a5030', '#5a3a22', P);
  // Spuren im Schnee / ein paar Möhren
  if (winter) for (let i = 0; i < 6; i++) p(c, x - 10 + i * 4, y + 1 + (i % 2), '#b8c8d8');
  else { p(c, x - 8, y, '#e87a2a'); p(c, x + 7, y - 1, '#e87a2a'); }
}

function wichtelwald(x, y, P, winter) {
  schattenOval(x, y + 3, 40);
  // Moosiger Grund
  ellipse(x, y - 2, 19, 7, winter ? '#e8f0f6' : '#4a7a3a');
  // Baumstammhäuser mit runder Tür, runden Fenstern und Moosdach
  const stamm = (sx, sy, w, h) => {
    const l = Math.round(sx - w / 2);
    r(c, l, sy - h, w, h, '#7a5236'); r(c, l, sy - h, 1, h, '#9a6e4a'); r(c, l + w - 1, sy - h, 1, h, '#5a3a24');
    for (let i = 3; i < h; i += 3) p(c, l + 2 + (i % 2), sy - h + i, '#6a4630');
    p(c, l - 1, sy - 1, '#6a4630'); p(c, l + w, sy - 1, '#6a4630');               // Wurzeln
    r(c, sx - 1, sy - 4, 3, 4, '#3a2416'); p(c, sx, sy - 5, '#3a2416'); p(c, sx + 1, sy - 2, '#e8c030');
    r(c, l + 2, sy - h + 4, 2, 2, '#f8d878'); licht(l + 2, sy - h + 4);
    r(c, l - 1, sy - h - 1, w + 2, 2, winter ? '#ffffff' : '#3e7a34');
    p(c, l, sy - h - 2, winter ? '#ffffff' : '#4e8a42');
  };
  stamm(x - 11, y - 3, 8, 15);
  stamm(x + 11, y - 2, 9, 18);
  // Pilzhaus in der Mitte vorn
  r(c, x - 3, y - 8, 6, 8, '#f2e6cc'); r(c, x + 2, y - 8, 1, 8, '#d8c8a8');
  ellipse(x, y - 10, 6, 3, '#c83a32'); r(c, x - 6, y - 9, 13, 1, '#a82a24');
  p(c, x - 3, y - 11, '#ffffff'); p(c, x + 2, y - 12, '#ffffff'); p(c, x + 4, y - 10, '#ffffff'); p(c, x - 1, y - 9, '#ffffff');
  if (winter) r(c, x - 3, y - 13, 6, 1, '#ffffff');
  r(c, x - 1, y - 4, 2, 4, '#5a3a22'); fenster(x + 1, y - 7, 1, 2);
  // Kleine Pilze
  for (const [dx, dy] of [[-18, 0], [-6, 2], [16, 1], [6, 3]]) { p(c, x + dx, y + dy, '#f2e6cc'); r(c, x + dx - 1, y + dy - 1, 3, 1, '#d84a3a'); }
  // Lichterkette zwischen den Stämmen
  for (let i = -8; i <= 8; i += 2) { const yy = y - 15 + Math.round(Math.abs(i) / 3); p(c, x + i, yy, '#ffd070'); licht(x + i, yy, '#ffd070'); }
}

function berg(x, y, P) {
  // Ein runder Hügel, immer verschneit (er ist hoch genug), mit dunklem Saum
  for (let k = 0; k < 25; k++) {
    const w = Math.round(Math.sqrt(k / 24) * 24) + 1;
    r(c, x - w, y - 23 + k, w * 2, 1, k > 20 ? '#71849a' : '#93a8c0');
  }
  for (let k = 0; k < 24; k++) {
    const w = Math.round(Math.sqrt(k / 24) * 24);
    r(c, x - w, y - 22 + k, w * 2, 1, '#f4f8fc');
    r(c, x + Math.round(w * 0.35), y - 22 + k, Math.round(w * 0.65), 1, '#c6d6e8');   // Schattenseite
  }
  // Schlittenbahn in Schlangenlinien, mit Fähnchen
  for (let i = 0; i < 22; i++) {
    const bx = x - 4 + Math.sin(i / 3.2) * 6, by = y - 21 + i;
    r(c, bx, by, 3, 1, '#c4d4e4');
    if (i % 6 === 3) { r(c, bx + 4, by - 3, 1, 3, '#5a3a22'); r(c, bx + 5, by - 3, 2, 1, i % 12 === 3 ? '#e84a4a' : '#3a8ad8'); }
  }
  // Hütte oben, Bäume an der Seite
  r(c, x + 4, y - 24, 6, 4, '#8a5a32'); dach(x + 3, y - 25, 8, 3, '#5a3a22', '#4a2e1a', { dach: '#ffffff', dach2: '#e0e8f0' });
  fenster(x + 5, y - 23, 1, 1);
  tanne(x - 17, y - 1, 1, P); tanne(x + 18, y, 2, P); tanne(x + 13, y - 6, 0, P);
  // Strohballen im Ziel
  r(c, x - 9, y, 5, 2, '#e8c870'); r(c, x - 3, y + 1, 5, 2, '#d8b860');
}

const ZEICHNER = { dorf, festplatz, baeume: christbaeume, super: supermarkt, bau: baumarkt, haus: zuhause, lichtung, wichtel: wichtelwald, berg };

// ---------------------------------------------------------------------------
// Je Bild: was sich bewegt
// ---------------------------------------------------------------------------
const flocken = Array.from({ length: 46 }, (_, i) => ({ x: hash(i + 1) * 180, y: hash(i + 2) * 400, v: 8 + hash(i + 3) * 10, s: hash(i + 4) * 6 }));

function zeichne(t, dt) {
  const winter = Z.schnee() > 0;
  baueGrund(winter);
  c.drawImage(grund, 0, 0);
  const P = palette(winter);

  // Wasser glitzert und fließt
  const fluss = flussPunkte();
  for (let i = 0; i < fluss.length; i += 3) {
    const q = fluss[i];
    if ((i + Math.floor(t * 8)) % 9 === 0) { p(c, q.x - 1, q.y, P.glanz); p(c, q.x, q.y, P.glanz); }
  }
  const w = WEIHER();
  if (winter) {
    // Ein Schlittschuhläufer zieht Kreise auf dem Weiher
    const a = t * 0.9, sx = w.x + Math.cos(a) * 8, sy = w.y + Math.sin(a) * 3.5;
    r(c, sx, sy - 4, 2, 3, '#c83a32'); p(c, sx, sy - 5, '#f2c9a0'); p(c, sx + 1, sy - 6, '#3a7ad8'); r(c, sx, sy - 1, 2, 1, '#2a2a30');
  } else {
    // Zwei Enten
    for (let i = 0; i < 2; i++) {
      const a = t * 0.3 + i * 2.6, ex = w.x + Math.cos(a) * 9, ey = w.y + Math.sin(a) * 4;
      const kopf = Math.cos(a + 1.6) > 0 ? 3 : -1;
      r(c, ex, ey, 3, 2, '#f4f0e8'); p(c, ex + kopf, ey - 1, '#2f6a3a'); p(c, ex + kopf, ey, '#e8a030');
    }
  }

  // Rauch aus den Schornsteinen
  const h = ort('haus'), d = ort('dorf');
  rauch(h.x + 6, yPx(h) - 26, t, 0);
  rauch(d.x - 10, yPx(d) - 17, t, 1.3);
  rauch(d.x + 9, yPx(d) - 16, t, 2.1);

  // Festplatz: Wimpelkette flattert
  const f = ort('festplatz'), fy = yPx(f);
  for (let i = 0; i < 15; i++) {
    const xx = f.x - 7 + i, yy = fy - 17 + Math.round(Math.sin(i / 14 * Math.PI) * 2 + Math.sin(t * 4 + i) * 0.4);
    p(c, xx, yy, ['#e84a4a', '#ffe060', '#3a8ad8', '#7ae07a'][i % 4]);
  }

  // Wichtelwald: Glühwürmchen und Funken
  const wi = ort('wichtel'), wy = yPx(wi);
  for (let i = 0; i < 6; i++) {
    const a = t * (0.6 + i * 0.13) + i * 1.7;
    const fx = wi.x + Math.cos(a) * (12 + i * 1.5), fy2 = wy - 10 + Math.sin(a * 1.3) * 6;
    if ((Math.floor(t * 3 + i) % 4) !== 0) p(c, fx, fy2, i % 2 ? '#fff4a0' : '#a8f0ff');
  }

  // Lichtung: ein Hase hüpft, ein Reh senkt den Kopf zum Fressen
  const l = ort('lichtung'), ly = yPx(l);
  const hx = l.x - 12 + ((t * 6) % 10), hy = ly - 1 - Math.abs(Math.sin(t * 6)) * 2;
  r(c, hx, hy - 2, 3, 2, '#b8a898'); p(c, hx + 2, hy - 3, '#b8a898'); p(c, hx + 2, hy - 5, '#b8a898'); p(c, hx + 3, hy - 4, '#b8a898'); p(c, hx, hy - 2, '#ffffff');
  const rx = l.x + 9, ry = ly - 3;
  r(c, rx - 2, ry - 3, 5, 2, '#a8703a'); p(c, rx - 2, ry - 1, '#a8703a'); p(c, rx + 2, ry - 1, '#a8703a'); p(c, rx - 2, ry, '#a8703a'); p(c, rx + 2, ry, '#a8703a');
  const unten = Math.floor(t / 2) % 3 === 0;
  r(c, rx + 3, ry - (unten ? 3 : 5), 1, 2, '#a8703a'); r(c, rx + 3, ry - (unten ? 2 : 6), 2, 1, '#8a5a2a');

  // Schlittenberg: ein Wok saust die Bahn hinunter
  const b = ort('berg'), by = yPx(b);
  const k = (t * 0.45) % 1.3;
  if (k < 1) {
    const i = k * 21, bx = b.x - 4 + Math.sin(i / 3.2) * 6 + 1, byy = by - 21 + i;
    r(c, bx - 1, byy, 4, 1, '#2a2a30'); r(c, bx, byy - 1, 2, 1, '#3a3a40'); p(c, bx, byy - 2, '#c83a32'); p(c, bx, byy - 3, '#f2c9a0');
  }

  // Christbaumverkauf: Lichterkette am Hüttendach blinkt
  const cb = ort('baeume'), cy = yPx(cb);
  for (let i = 0; i < 5; i++) if ((Math.floor(t * 2) + i) % 2) p(c, cb.x + 9 + i * 2, cy - 11, ['#ff5a5a', '#ffe060', '#5ad0ff'][i % 3]);

  // Vögel ziehen vorbei (nur ohne Schnee, tagsüber)
  const li = Z.licht();
  if (!winter && li.hell > 0.5) {
    const vx = ((t * 9) % 260) - 40, vy = 0.3 * H + Math.sin(t * 0.4) * 6;
    for (let i = 0; i < 3; i++) { const xx = vx - i * 5, yy = vy + i * 2 + ((Math.floor(t * 5) + i) % 2); p(c, xx, yy, '#2a3a2a'); p(c, xx - 1, yy - 1, '#2a3a2a'); p(c, xx + 1, yy - 1, '#2a3a2a'); }
  }

  // Der Wichtel (läuft beim Wechsel, sonst wippt er)
  const wipp = wanderer ? (Math.floor(t * 10) % 2) : 0;
  r(c, Math.round(pos.x) - 19, Math.round(pos.y) + 6, 5, 1, 'rgba(0,0,0,0.25)');
  wichtelKlein(c, Math.round(pos.x) - 17, Math.round(pos.y) + 6 - wipp, t, 0);   // links neben dem Ort, das Schild steht darunter

  // Schneefall
  if (winter || Z.wetter().art === 'schnee') {
    for (const fl of flocken) {
      fl.y += fl.v * dt; if (fl.y > H) { fl.y = -2; fl.x = Math.random() * C.B; }
      p(c, fl.x + Math.sin(t + fl.s) * 2, fl.y, '#ffffff');
    }
  }

  // Nachts dunkler, dann leuchten Fenster, Laternen und Lichterketten
  nachtLichter(li, C.B, H, grundLichter, 0.55);
}

/** Nachtschleier über das Bild legen und die gesammelten Lichter darauf. */
function nachtLichter(li, w, h, liste, staerke) {
  if (li.hell >= 0.9) return;
  const nacht = 1 - li.hell;
  c.fillStyle = `rgba(14,20,62,${(nacht * staerke).toFixed(3)})`;
  c.fillRect(0, 0, w, h);
  if (nacht < 0.25) return;
  c.fillStyle = `rgba(255,200,110,${(nacht * 0.16).toFixed(3)})`;
  for (const q of liste) c.fillRect(q.x - 1, q.y - 1, 3, 3);
  for (const q of liste) p(c, q.x, q.y, q.f);
}

function rauch(x, y, t, ph) {
  for (let i = 0; i < 4; i++) {
    const a = (t * 0.35 + ph + i / 4) % 1;
    const xx = x + Math.sin(a * 6 + ph) * 1.5 + a * 4, yy = y - a * 12;
    const g = a < 0.5 ? 2 : 1;
    c.fillStyle = `rgba(214,220,230,${(0.85 - a * 0.7).toFixed(2)})`;
    c.fillRect(Math.round(xx), Math.round(yy), g, g);
  }
}

// ---------------------------------------------------------------------------
// Bildchen für die Geschäfte: der Ort auf eigenem Grund, als Kopf im Laden
// ---------------------------------------------------------------------------
const ORT_ZU_TAB = { super: 'super', markt: 'dorf', baumarkt: 'bau', wichtel: 'wichtel' };

/** Zeichnet das Geschäft `tab` in ein 110 x 40 großes Canvas (CSS skaliert hoch). */
export function vignette(ziel, tab) {
  const id = ORT_ZU_TAB[tab];
  if (!id) return false;
  const winter = Z.schnee() > 0;
  const P = palette(winter);
  const W = 110, HH = 40, HOR = 22;
  ziel.width = W; ziel.height = HH;
  const alt = c, altL = lichter;
  c = ziel.getContext('2d');
  c.imageSmoothingEnabled = false;
  lichter = [];
  const li = Z.licht();
  const himmel = li.hell > 0.6 ? ['#7fb2e0', '#a4c8ec', '#c4dcf2'] : li.hell > 0.1 ? ['#4a4a8a', '#a0708a', '#e8a07a'] : ['#10183c', '#18224c', '#24305e'];
  for (let y = 0; y < HOR; y++) r(c, 0, y, W, 1, himmel[Math.min(2, Math.floor(y / HOR * 3))]);
  if (li.hell < 0.3) for (let i = 0; i < 14; i++) p(c, hash(i + 70) * W, hash(i + 80) * 14, '#ffffff');   // Sterne
  // Ferne Hügel und Waldsaum
  for (let x = 0; x < W; x++) {
    const hh = 5 + Math.round(Math.sin(x / 11) * 2 + Math.sin(x / 4.3));
    r(c, x, HOR - hh, 1, hh, winter ? '#c8d4e2' : '#6a8a7a');
  }
  // Boden
  for (let y = HOR; y < HH; y++) for (let x = 0; x < W; x++) {
    const v = rausch(x / 7, y / 4) + (hash2(x, y) - 0.5) * 0.3;
    p(c, x, y, P.boden[Math.max(0, Math.min(3, Math.floor(v * 3.5)))]);
  }
  for (let x = 0; x < W; x += 4) tanne(x + 1, HOR + 2, hash(x) < 0.3 ? 1 : 0, P);
  // Nachbarschaft am Rand, damit es nicht leer wirkt
  tanne(8, 38, 2, P); tanne(102, 39, 2, P); tanne(20, 35, 1, P); tanne(90, 36, 1, P);
  busch(28, 38, P, winter); busch(81, 38, P, winter); fels(15, 39, P, winter);
  ZEICHNER[id](55, 36, P, winter);
  nachtLichter(li, W, HH, lichter, 0.5);
  c = alt; lichter = altL;
  return true;
}
