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
import * as C from './config.js?v=202610191400';
import * as S from './spiel.js?v=202610191400';
import * as Z from './zeit.js?v=202610191400';
import * as FEIN from './fein.js?v=202610191400';
import * as T from './ton.js?v=202610191400';
import { r, p, ton, mische, wichtelKlein, text as pixText } from './pixel.js?v=202610191400';

const $ = (s) => document.querySelector(s);

/**
 * Die Orte. x in Kartenpixeln (0-180), y als Anteil der Höhe. `tab` = das
 * Geschäft dahinter, `bald` = noch ein Platzhalter (Minispiel, Markt).
 */
export const ORTE = [
  { id: 'dorf',      name: 'Weihnachtsladen', x: 90,  y: 0.17, tab: 'markt' },
  { id: 'festplatz', name: 'Festplatz',       x: 30,  y: 0.19, markt: true },
  { id: 'baeume',    name: 'Christbaumverkauf', x: 150, y: 0.21, spiel: 'baum' },
  { id: 'super',     name: 'Supermarkt',      x: 34,  y: 0.445, tab: 'super' },   // 13.10. tiefer (0,40): stand zu dicht an der Backstube
  { id: 'bau',       name: 'Baumarkt',        x: 148, y: 0.41, tab: 'baumarkt' },
  { id: 'haus',      name: 'Zuhause',         x: 88,  y: 0.55 },
  { id: 'lichtung',  name: 'Waldlichtung',    x: 30,  y: 0.75, spiel: 'lichtung' },
  { id: 'eis',       name: 'Eisbahn',         x: 64,  y: 0.645, spiel: 'eis' },
  // Backstube 11.10. tiefer (0,29 → 0,315) und kleiner: Ihr Schild klebte unter dem Weihnachtsladen
  { id: 'backstube', name: 'Backstube',       x: 62,  y: 0.315, spiel: 'back', schild: [30, -17] },   // Schild rechts daneben: darunter lag es auf dem Supermarkt
  { id: 'wichtel',   name: 'Wichtelwald',     x: 92,  y: 0.84, tab: 'wichtel' },
  { id: 'berg',      name: 'Schlittenberg',   x: 150, y: 0.74, spiel: 'berg' },
  // 12.10.: rechts zwischen Baumarkt und Schlittenberg (erst links, Nutzerwunsch: rechts)
  { id: 'schnee',    name: 'Schneeballwiese', x: 156, y: 0.55, spiel: 'schnee' },
];

let offen = false;
let cv = null, c = null, H = 320;
let wanderer = null;        // { von:{x,y}, nach:{x,y}, t, dauer, fertig }
let pos = null;             // wo der Wichtel gerade steht
let handler = null;         // was beim Ankommen passiert (ort) => void
let rafId = 0, letzte = 0, hervorId = null;
// Der versteckte Weihnachtsmann (10.10.): Stelle als Anteil, dazu was ihn verdeckt
const VERSTECKE = [
  { x: 108, y: 0.31, hinter: 'tanne' }, { x: 74, y: 0.62, hinter: 'busch' }, { x: 168, y: 0.46, hinter: 'tanne' },
  { x: 12, y: 0.66, hinter: 'tanne' }, { x: 112, y: 0.12, hinter: 'busch' }, { x: 132, y: 0.62, hinter: 'busch' },
  { x: 52, y: 0.88, hinter: 'tanne' }, { x: 16, y: 0.31, hinter: 'busch' },
];
let santa = null;   // { x, y, hinter, t, gefunden }
/** Vorführszene: den Weihnachtsmann sicher an Versteck `i` setzen. */
export function santaTest(i = 0) { santa = { ...VERSTECKE[i], t: 1, gefunden: -1 }; baueSchilder(hervorId); }

export const istOffen = () => offen;
const yPx = (o) => Math.round(o.y * H);
/**
 * Der ganze Karteninhalt liegt um VERSATZ der Höhe tiefer (11.10., Nutzerwunsch:
 * „minimal nach unten schieben, unten weniger Wald, oben mehr Berge"). Alle
 * Orte, Wege, der Wald usw. bleiben in Inhalts-Koordinaten (Anteil von H);
 * das Zwischenbild ist um `vers()` höher, wird um vers() verschoben gezeichnet
 * (unten fällt so viel Wald weg), und oben füllen höhere Berge den Platz.
 * DOM-Schilder und Tippflächen rechnen vers() dazu.
 */
const VERSATZ = 0.06;
const vers = () => Math.round(H * VERSATZ);
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
  // Selten versteckt sich der Weihnachtsmann irgendwo
  santa = S.santaWuerfeln() ? { ...VERSTECKE[Math.floor(Math.random() * VERSTECKE.length)], t: 0, gefunden: -1 } : null;
  baueSchilder(hervor);
  el.classList.toggle('ohne-text', !!S.st.karteOhneText);
  el.classList.remove('versteckt');
  offen = true;
  S.lauf.karteOffen = true;
  T.musikKarte(true);         // auf der Karte läuft das Kartenstück (11.10.)   // für den Hinweis „Auf der Karte gibt es noch mehr"
  wanderer = null;
  letzte = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(takt);
}
export function schliesse() {
  offen = false;
  S.lauf.karteOffen = false;
  T.musikKarte(false);
  $('#landkarte').classList.add('versteckt');
  cancelAnimationFrame(rafId);
}

/** Schilder ein/aus (12.10.): Ohne Schilder sieht man nur die Orte, die leicht leuchten. */
export function schilderUmschalten() {
  S.st.karteOhneText = !S.st.karteOhneText;
  S.speichere();
  $('#landkarte').classList.toggle('ohne-text', S.st.karteOhneText);
  return S.st.karteOhneText;
}
/** Schilder neu (Zähler „neu", pulsierender Ort) - nach einem Kauf. */
export function aktualisiere(hervor) { hervorId = hervor; baueSchilder(hervor); }

function baueSchilder(hervor) {
  const box = $('#kartenOrte');
  box.innerHTML = '';
  if (santa && santa.gefunden < 0) {
    const f = document.createElement('button');
    f.className = 'ort-flaeche santa';
    f.setAttribute('aria-label', 'Weihnachtsmann');
    f.style.left = `calc(var(--px) * ${santa.x - 10})`;
    f.style.top = `calc(var(--px) * ${Math.round(santa.y * H) - 16 + vers()})`;
    f.onclick = () => {
      if (!santa || santa.gefunden >= 0) return;
      santa.gefunden = 0; f.remove();
      S.fangeSanta();
    };
    box.appendChild(f);
  }
  const neu = S.st.neu || {};
  for (const o of ORTE) {
    // Noch nicht offen (seit 13.10. ein leerer Platz mit „?"-Schild): kein
    // Namensschild, aber das Holzschild ist antippbar und sagt kurz Bescheid
    if (!S.ortOffen(o)) {
      const f = document.createElement('button');
      f.className = 'ort-flaeche';
      f.setAttribute('aria-label', 'Noch nicht freigeschaltet');
      f.style.left = `calc(var(--px) * ${o.x - 16})`;
      f.style.top = `calc(var(--px) * ${yPx(o) - 20 + vers()})`;
      f.onclick = () => {
        T.spiele('klick');
        S.hooks.toast('Wird noch freigeschaltet - was hier hinkommt, bleibt noch geheim!', 'hinweis');   // nichts verraten (13.10.)
      };
      box.appendChild(f);
      continue;
    }
    const b = document.createElement('button');
    b.className = 'ort' + (o.bald ? ' bald' : '') + (o.id === hervor ? ' hervor' : '') + (o.id === 'haus' ? ' zuhause' : '');
    const [sdx, sdy] = o.schild || [0, 0];
    b.style.left = `calc(var(--px) * ${o.x + sdx})`;
    b.style.top = `calc(var(--px) * ${yPx(o) + 9 + sdy + vers()})`;
    const n = o.tab ? C.ARTIKEL.filter((a) => a.tab === o.tab && neu[a.id]).length : 0;
    let unter = o.bald ? 'bald' : o.spiel ? 'Minispiel' : '';
    // Noch nie gespielt: kleines NEU am Schild
    const nieGespielt = o.spiel && !S.miniRekord(o.spiel);
    if (o.markt) {
      const m = S.marktInfo();
      unter = m.heute ? 'heute Weihnachtsmarkt!' : m.inTagen === 1 ? 'Markt morgen' : `Markt in ${m.inTagen} Tagen`;
      if (m.heute) b.classList.add('markt-heute');
    }
    b.innerHTML = `${o.name}${n ? '<b class="ort-neu punkt"></b>' : ''}${nieGespielt ? '<b class="ort-neu">NEU</b>' : ''}${unter ? `<small>${unter}</small>` : ''}`;
    b.onclick = () => gehe(o);
    box.appendChild(b);
    // Auch das Bild des Ortes selbst ist antippbar (größere Fläche)
    const f = document.createElement('button');
    f.className = 'ort-flaeche';
    f.style.left = `calc(var(--px) * ${o.x - 16})`;
    f.style.top = `calc(var(--px) * ${yPx(o) - 18 + vers()})`;
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
    [P('bau'), P('schnee'), [166, 0.5 * H]],
    [P('backstube'), [84, 0.34 * H], [72, 0.33 * H]],
  ];
}
/**
 * Weg als Kurve. Seit 13.10. mit sanftem Schlenker (Nutzerwunsch: „zu
 * geradlinig"): zwei Wellen quer zur Richtung, an den Enden null, damit der
 * Weg weiter genau am Ort ankommt. Hängt nur an Start, Ziel und s - die
 * Laternen auf halbem Weg (andere `n`) sitzen deshalb auf demselben Weg.
 */
function bezier(a, b, k, n) {
  const pts = [];
  const lang = Math.hypot(b[0] - a[0], b[1] - a[1]), amp = Math.min(4.5, lang / 22);
  const saat = a[0] * 0.37 + b[1] * 0.11 + a[1] * 0.05;
  for (let i = 0; i <= n; i++) {
    const s = i / n, u = 1 - s;
    const x = u * u * a[0] + 2 * u * s * k[0] + s * s * b[0], y = u * u * a[1] + 2 * u * s * k[1] + s * s * b[1];
    // Richtung der Kurve an dieser Stelle -> Querrichtung
    const tx = 2 * u * (k[0] - a[0]) + 2 * s * (b[0] - k[0]), ty = 2 * u * (k[1] - a[1]) + 2 * s * (b[1] - k[1]);
    const tl = Math.hypot(tx, ty) || 1;
    const w = Math.sin(Math.PI * s) * amp * (Math.sin(s * Math.PI * 2.3 + saat) * 0.7 + Math.sin(s * Math.PI * 5.1 + saat * 2) * 0.3);
    pts.push({ x: x - ty / tl * w, y: y + tx / tl * w });
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Die stehende Ebene
// ---------------------------------------------------------------------------
let grund = null, grundSchl = '', grundLichter = [];

function baueGrund(winter) {
  // Gesperrte Orte gehören in den Schlüssel: geht einer auf, wird neu gemalt
  const schl = `${H}|${winter}|${S.st.fassade}|${S.marktHeute()}|${ORTE.filter((o) => !S.ortOffen(o)).map((o) => o.id).join(',')}`;
  if (grund && grundSchl === schl) return;
  grundSchl = schl;
  grund = document.createElement('canvas');
  grund.width = C.B; grund.height = H + vers();
  const ziel = c;
  c = grund.getContext('2d');
  c.translate(0, vers());   // alles in Inhalts-Koordinaten; putImageData unten bekommt den Versatz selbst
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
  c.putImageData(img, 0, vers());

  // 2. Berge am oberen Rand: hinten blau, vorn grau mit Schneekappen
  berge(winter);
  markiere(0, 0, C.B, Math.round(0.1 * H));

  // 3. Fluss und Weiher
  // Der Fluss beginnt an der Waldkante unter den Hügeln (11.10., gemeldet:
  // „geht über den Horizont hinaus") - darüber wird er abgeschnitten
  const fluss = flussPunkte();
  c.save(); c.beginPath(); c.rect(0, Math.round(0.1 * H) + 6, C.B, H); c.clip();
  for (const q of fluss) kreis(q.x, q.y, q.b + 1.4, P.ufer);
  for (const q of fluss) { kreis(q.x, q.y, q.b, P.wasser); markiere(q.x - q.b - 2, q.y - q.b - 2, q.b * 2 + 4, q.b * 2 + 4); }
  for (const q of fluss) if (q.b > 3.4) kreis(q.x, q.y, q.b - 1.6, P.wasserTief);
  c.restore();
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
    const breit = hash2(Math.round(q.x), Math.round(q.y)) < 0.3 ? 1 : 0;   // mal etwas breiter ausgetreten
    r(c, q.x - 2 - breit, q.y - 1, 5 + breit, 4, P.wegRand);
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
    const [sdx, sdy] = o.schild || [0, 0];
    markiere(o.x - 20, yPx(o) - 26, 40, 32);
    markiere(o.x - 26 + sdx, yPx(o) + 7 + sdy, 52, 13);
  }
  markiere(w.x - 22, w.y - 12, 44, 24);

  // 6. Wald und Einzelbäume, nach unten sortiert (vorn liegt vorn)
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
  // Geschlossene Waldflächen statt Hunderter Einzelbäume (09.10., gemeldet:
  // „zu viel Struktur, besonders mit Schnee"). Innen ein ruhiges, gleich-
  // mäßiges Kronenmuster, nur am oberen Waldrand stehen einzelne Tannen.
  const wald = new Uint8Array(C.B * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < C.B; x++) {
    if (!frei(x, y)) continue;
    if (dicht(x, y) + (rausch(x / 11, y / 11) - 0.5) * 0.4 > 0.66) wald[y * C.B + x] = 1;
  }
  const istWald = (x, y) => x >= 0 && x < C.B && y >= 0 && y < H && wald[y * C.B + x];
  const WG = winter ? ['#183428', '#2d5546', '#b9cdd6', '#1c3a30'] : ['#163620', '#326238', '#447d40', '#1e4226'];
  for (let y = 0; y < H; y++) for (let x = 0; x < C.B; x++) if (wald[y * C.B + x]) p(c, x, y, WG[0]);
  // Tannenwald (10.10., Nutzerwunsch: „mehr nach Tannenwald"): dicht an dicht
  // stehende kleine Tannen im versetzten Raster, von hinten nach vorn - jede
  // Reihe verdeckt den Fuß der Reihe dahinter, man sieht nur die Spitzen.
  // Alle gleich groß und nur zwei Grüntöne, damit es ruhig bleibt.
  const TW = winter ? ['#245040', '#36685a', '#18382c'] : ['#255a30', '#3a7a42', '#1a4424'];
  // Form einer Waldtanne, 16 hoch: drei Stufen, jede unten breiter. Reihen im
  // Abstand von 9 Pixeln - man sieht von jeder Tanne die oberen zwei Stufen,
  // dazwischen den dunklen Waldboden
  const FORM = [0, 1, 1, 2, 2, 3, 2, 3, 3, 4, 4, 3, 4, 5, 5, 5];
  const STUFE_OBEN = new Set([0, 6, 11]);
  for (let y0 = 6; y0 < H + 16; y0 += 9) for (let x0 = (Math.floor(y0 / 9) % 2) * 5; x0 < C.B + 6; x0 += 10) {
    const x = x0 + Math.round((hash2(x0, y0) - 0.5) * 3), y = y0 + (hash2(y0, x0) < 0.3 ? 1 : 0);
    if (!istWald(x, Math.min(H - 1, y))) continue;
    FORM.forEach((w, i) => {
      const yy = y - FORM.length + i;
      r(c, x - w, yy, w, 1, TW[1]); r(c, x, yy, w + 1, 1, TW[0]); if (w) p(c, x + w, yy, TW[2]);
      if (winter && STUFE_OBEN.has(i)) r(c, x - w, yy, w + 1, 1, '#eef3f8');
    });
    r(c, x, y, 1, 1, '#3a2a1a');
  }
  // Unterkante der Flächen etwas dunkler, damit sie auf dem Boden stehen
  for (let y = 1; y < H - 1; y++) for (let x = 0; x < C.B; x++) if (wald[y * C.B + x] && !istWald(x, y + 1)) p(c, x, y + 1, 'rgba(20,40,30,0.25)');
  const baeume = [];
  // Tannen am oberen Waldrand
  for (let x = 2; x < C.B; x += 5) for (let y = 1; y < H; y++) {
    if (istWald(x, y) && !istWald(x, y - 1) && !istWald(x, y - 2)) baeume.push({ x: x + Math.round((hash2(x, y) - 0.5) * 2), y: y + 3, g: hash2(x, y) < 0.3 ? 2 : 1 });
  }
  // Wenige Einzelbäume auf offenem Land
  for (let y = 4; y < H + 8; y += 6) for (let x = 2; x < C.B; x += 7) {
    const jx = x + (hash2(x, y) - 0.5) * 6, jy = y + (hash2(y, x) - 0.5) * 5;
    if (istWald(Math.round(jx), Math.round(jy)) || hash2(x + 3, y + 7) > 0.09) continue;
    if (!frei(jx, jy) || !frei(jx, jy - 4)) continue;
    baeume.push({ x: Math.round(jx), y: Math.round(jy), g: hash2(x, y * 3) < 0.3 ? 1 : 0, laub: !winter && hash2(x * 7, y) < 0.3 });
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
  // Dazu je eine Laterne auf halbem Weg zu den anderen Orten (10.10.: nachts gemütlicher)
  for (const [a1, b1, k1] of wege().slice(1)) {
    const m = bezier(a1, b1, k1, 2)[1];
    if (frei(m.x + 4, m.y - 6)) laterne(Math.round(m.x + 4), Math.round(m.y));
  }

  // 8. Die Orte
  // Noch nicht offene Orte (13.10.): gar nicht malen - nur ein leerer Platz am
  // Ende des Weges mit einem kleinen Holzschild. Vorher lag ein Fleck in
  // Bodenfarbe darüber, der wie eine grüne Fläche aussah.
  for (const o of ORTE) (S.ortOffen(o) ? ZEICHNER[o.id] : leererPlatz)(o.x, yPx(o), P, winter);
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
  // Seit 11.10. sanfte, verschneite Hügel statt spitzer Gipfel (Nutzerwunsch:
  // „die Berge sehen zu mächtig aus"). Zwei Lagen runder Kuppen, hinten blass
  // und bläulich, vorn weißer mit Schattenseite und ein paar Tannen.
  const basis = Math.round(0.1 * H), oben = -vers();
  // Himmel als weicher Verlauf, jede Zeile eigene Farbe (11.10., vorher zwei harte Stufen)
  for (let y = oben; y < basis + 2; y++) r(c, 0, y, C.B, 1, mische('#9cc6ea', '#dceaf6', (y - oben) / (basis + 2 - oben)));
  const huegel = (kuppen, y0, hell, schatten, kante) => {
    for (let x = 0; x < C.B; x++) {
      let hoch = 0, seite = 0;
      for (const [kx, kh, kb] of kuppen) {
        const d = (x - kx) / kb;
        if (Math.abs(d) >= 1) continue;
        const h = kh * Math.cos(d * Math.PI / 2);   // runde Kuppe
        if (h > hoch) { hoch = h; seite = d; }
      }
      hoch = Math.round(hoch);
      for (let k = 0; k < hoch; k++) p(c, x, y0 - k, k === hoch - 1 ? kante : seite > 0.35 && k > hoch * 0.3 ? schatten : hell);
    }
  };
  const plus = Math.round(vers() * 0.35);
  huegel([[10, 9 + plus, 34], [56, 12 + plus, 40], [104, 10 + plus, 36], [150, 13 + plus, 42], [190, 9 + plus, 30]], basis, '#dce8f4', '#c4d4e6', '#ffffff');
  huegel([[-6, 7 + plus, 30], [36, 9 + plus, 36], [82, 7 + plus, 30], [126, 10 + plus, 38], [172, 8 + plus, 32]], basis + 4, '#f2f6fb', '#d8e2ee', '#ffffff');
  // Waldsaum am Fuß der Hügel
  for (let x = 0; x < C.B; x += 2) {
    const h = 2 + Math.floor(hash(x * 1.7) * 3);
    r(c, x, basis + 5 - h, 2, h + 1, winter ? '#3a5a48' : '#2c5236');
    if (winter) p(c, x, basis + 5 - h, '#e8eef4');
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
      // Schnee nur als Kappe oben und als Tupfer an den Astspitzen links -
      // ganze weiße Zeilen je Stufe machten den Wald streifig
      if (P.schnee && yy === oben && s === 0) r(c, x - w, yy, w * 2 + 1, 1, P.schnee);
      else if (P.schnee && yy === unten - 1) p(c, x - w, yy, P.schnee);
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
  // Dach wie am echten Haus (11.10., Nutzerwunsch): Trapez in der dunklen
  // Dachfarbe der Fassade, Ziegelreihen, dunkle Traufe - auch im Winter nur
  // ein Schneesaum oben statt eines weißen Dachs
  // Auf der kleinen Karte zwischen hellen Flächen wirkt dieselbe Farbe heller -
  // deshalb hier 20 % dunkler als am Haus, damit es gleich aussieht
  const d1 = ton(F.dach, -0.2), d2 = ton(F.dach2, -0.25);
  for (let i = 0; i <= 8; i++) {
    const l = x - 13 + Math.round(i * 0.75), rr = x + 13 - Math.round(i * 0.75), yy = y - 15 - i;
    r(c, l, yy, rr - l, 1, i % 3 === 0 ? d2 : d1);
    if (i % 3 === 2) for (let xx = l + (i % 2 ? 1 : 0); xx < rr; xx += 3) p(c, xx, yy, d2);
  }
  r(c, x - 14, y - 15, 28, 1, ton(F.dach, -0.45));               // Traufe
  if (P.dach) r(c, x - 7, y - 24, 14, 1, '#ffffff');
  r(c, x + 5, y - 28, 3, 6, '#8a4a3a'); r(c, x + 4, y - 29, 5, 1, '#5a3a32');   // Schornstein wie am Haus
  if (P.dach) r(c, x + 4, y - 30, 5, 1, '#ffffff');
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
  if (S.marktHeute()) { marktPlatz(x, y, P, winter); return; }
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

/** Am Markttag: bunte Buden mit Lichtern, Karussell offen, Glühweinpyramide. */
function marktPlatz(x, y, P, winter) {
  schattenOval(x, y + 3, 38);
  r(c, x - 18, y - 13, 36, 16, winter ? '#dce4ec' : '#c4ac7c');
  for (let i = 0; i < 30; i++) p(c, x - 17 + Math.floor(hash(i + 11) * 34), y - 12 + Math.floor(hash(i + 31) * 14), winter ? '#ccd6e2' : '#b09868');
  // Buden hinten und an den Seiten, jede mit eigener Dachfarbe
  const bude = (bx, by, dachF) => {
    r(c, bx - 4, by - 5, 9, 5, '#8a5a32'); r(c, bx - 3, by - 4, 7, 2, '#f8d878'); licht(bx - 2, by - 4); licht(bx + 2, by - 4);
    for (let i = 0; i < 4; i++) r(c, bx - 5 + i, by - 6 - i, 11 - i * 2, 1, i % 2 ? ton(dachF, -0.2) : dachF);
    if (P.dach) r(c, bx - 2, by - 9, 5, 1, '#ffffff');
    for (let i = -4; i <= 4; i += 2) { p(c, bx + i, by - 6, '#ffe060'); licht(bx + i, by - 6, '#ffe060'); }
  };
  bude(x - 12, y - 6, '#c83a32'); bude(x, y - 9, '#2f7a3a'); bude(x + 12, y - 6, '#3a6ab8');
  bude(x - 13, y + 3, '#e8a030'); bude(x + 13, y + 3, '#a83a8a');
  // Weihnachtspyramide in der Mitte
  r(c, x - 1, y - 2, 3, 6, '#6a4428');
  for (let i = 0; i < 3; i++) r(c, x - 3 + i, y - 2 + i * 2, 7 - i * 2 + i * 2, 1, '#a8763e');
  p(c, x, y - 5, '#ffe060'); licht(x, y - 4, '#ffe060');
  // Lichterkette quer über den Platz
  for (let i = -16; i <= 16; i += 2) { const yy = y - 14 + Math.round(Math.sin((i + 16) / 32 * Math.PI) * 2); p(c, x + i, yy, ['#ff5a5a', '#ffe060', '#5ad0ff'][(i + 16) / 2 % 3]); licht(x + i, yy, '#ffe8a0'); }
  r(c, x - 17, y - 16, 1, 5, '#5a3a22'); r(c, x + 17, y - 16, 1, 5, '#5a3a22');
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
  schattenOval(x, y, 38);   // direkt am Fuß der Halle (bis 11.10. drei Pixel zu tief)
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

/** Eisbahn am Weiher: Bank mit Schlittschuhen und ein Schild am Ufer. */
function eisbahn(x, y, P, winter) {
  r(c, x + 2, y - 4, 9, 2, '#8a5a32'); r(c, x + 3, y - 2, 1, 2, '#5a3a22'); r(c, x + 9, y - 2, 1, 2, '#5a3a22');
  r(c, x + 4, y - 6, 2, 2, '#c83a32'); r(c, x + 7, y - 6, 2, 2, '#3a6ab8'); p(c, x + 4, y - 4, '#c8ccd8'); p(c, x + 8, y - 4, '#c8ccd8');
  if (winter) r(c, x + 2, y - 5, 9, 1, '#ffffff');
  r(c, x + 13, y - 10, 1, 10, '#5a3a22'); r(c, x + 11, y - 13, 6, 4, '#3a6ab8'); p(c, x + 13, y - 12, '#ffffff'); p(c, x + 14, y - 11, '#ffffff');
  licht(x + 14, y - 12, '#a8d8ff');
}
/** Schneeballwiese (12.10.): zwei Schneewälle, ein Grummel lugt hervor. */
function schneewiese(x, y, P, winter) {
  schattenOval(x, y + 2, 26);
  for (const [wx, wy, b] of [[x - 6, y - 4, 12], [x + 6, y, 12]]) {
    for (let i = 0; i < b; i++) { const rd = Math.min(i, b - 1 - i); r(c, wx - b / 2 + i, wy - 4 + (rd < 2 ? 2 - rd : 0), 1, 4 - (rd < 2 ? 2 - rd : 0), '#f4f8fc'); }
    r(c, wx - b / 2 + 1, wy - 1, b - 2, 1, '#c8d4e2');
  }
  r(c, x - 7, y - 10, 4, 3, '#6aaa38'); p(c, x - 6, y - 9, '#f0e040'); r(c, x - 7, y - 11, 4, 1, '#c82828');   // Grummel
  r(c, x + 5, y - 6, 3, 2, '#2f8a3a'); p(c, x + 6, y - 7, '#f2c9a0'); p(c, x + 6, y - 8, '#d83a3a');          // Wichtel
  r(c, x + 1, y - 9, 2, 2, '#ffffff');                                                                          // Schneeball
}
/** Ein Ort, der noch nicht offen ist (13.10.): leerer Platz, Holzschild mit „?". */
function leererPlatz(x, y, P, winter) {
  // 13.10.: höher (Brett 9 statt 6 Zeilen) - das Fragezeichen war nur halb zu sehen
  r(c, x - 1, y - 9, 2, 9, '#6a4428'); r(c, x, y - 9, 1, 9, '#8a5a32');            // Pfosten
  r(c, x - 5, y - 18, 11, 9, '#a8703a'); r(c, x - 5, y - 18, 11, 1, '#c89058'); r(c, x - 5, y - 10, 11, 1, '#6a4428');   // Brett
  r(c, x - 5, y - 18, 1, 9, '#8a5a32'); r(c, x + 5, y - 18, 1, 9, '#8a5a32');
  // Fragezeichen, 3 x 5
  for (const [dx, dy] of [[-1, -16], [0, -16], [1, -16], [1, -15], [0, -14], [0, -12]]) p(c, x + dx, y + dy, '#3a2414');
  if (winter) r(c, x - 5, y - 19, 11, 1, '#ffffff');
}
/** Backstube (10.10.): Fachwerkhaus mit warmem Schaufenster und Brezelschild. */
function backstube(x, y, P, winter) {
  // Seit 11.10. kleiner (18 x 10 statt 24 x 13): die Schilder standen zu dicht
  schattenOval(x, y + 2, 24);
  r(c, x - 9, y - 10, 18, 10, '#efe0c0');
  r(c, x + 7, y - 10, 2, 10, '#d8c49c');
  for (let i = -9; i < 9; i += 4) r(c, x + i, y - 10, 1, 10, '#6a4428');
  r(c, x - 9, y - 10, 18, 1, '#6a4428'); r(c, x - 9, y - 6, 18, 1, '#6a4428');
  dach(x - 11, y - 11, 22, 7, '#8a3a2a', ton('#8a3a2a', -0.25), P);
  r(c, x - 7, y - 21, 2, 6, '#7a6a5a');                          // Ofenschornstein
  if (P.dach) r(c, x - 7, y - 21, 2, 1, '#ffffff');
  // Schaufenster mit Plätzchen, Tür
  r(c, x - 8, y - 5, 7, 4, '#f8d878'); for (let i = 0; i < 3; i++) p(c, x - 7 + i * 2, y - 3, ['#c8902c', '#fbf6ee', '#c8283a'][i]);
  for (let i = 0; i < 7; i++) licht(x - 8 + i, y - 5, '#ffd890');
  r(c, x + 2, y - 5, 3, 5, '#5a3a22'); p(c, x + 4, y - 3, '#e8c030');
  fenster(x - 5, y - 9, 2, 2); fenster(x + 3, y - 9, 2, 2);
  // Brezelschild am Ausleger
  r(c, x + 9, y - 8, 4, 1, '#3a2a1a');
  for (const [dx, dy] of [[0, 0], [1, -1], [2, 0], [2, 1], [1, 1], [0, 1]]) p(c, x + 10 + dx, y - 6 + dy, '#c8902c');
  if (winter) r(c, x - 9, y - 1, 18, 1, '#ffffff');
}
const ZEICHNER = { backstube, schnee: schneewiese, eis: eisbahn, dorf, festplatz, baeume: christbaeume, super: supermarkt, bau: baumarkt, haus: zuhause, lichtung, wichtel: wichtelwald, berg };

// ---------------------------------------------------------------------------
// Je Bild: was sich bewegt
// ---------------------------------------------------------------------------
const flocken = Array.from({ length: 46 }, (_, i) => ({ x: hash(i + 1) * 180, y: hash(i + 2) * 400, v: 8 + hash(i + 3) * 10, s: hash(i + 4) * 6 }));

function zeichne(t, dt) {
  const winter = Z.schnee() > 0;
  baueGrund(winter);
  c.drawImage(grund, 0, 0);
  c.save();
  c.translate(0, vers());     // alles Bewegte in Inhalts-Koordinaten, wie das Zwischenbild
  const P = palette(winter);

  // Kein Glitzern im Fluss mehr (09.10., Nutzerwunsch: „irritiert zu sehr")
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
  rauch(h.x + 6, yPx(h) - 30, t, 0);
  if (S.ortOffen(d)) { rauch(d.x - 10, yPx(d) - 17, t, 1.3); rauch(d.x + 9, yPx(d) - 16, t, 2.1); }
  const bs = ort('backstube'); if (S.ortOffen(bs)) rauch(bs.x - 6, yPx(bs) - 22, t, 0.7);

  // Festplatz: Wimpelkette flattert - am Markttag laufen Leute zwischen den Buden
  const f = ort('festplatz'), fy = yPx(f);
  if (!S.ortOffen(f)) { /* Festplatz noch zu: keine Wimpel */ }
  else if (S.marktHeute()) for (let i = 0; i < 6; i++) {
    const a = t * (0.25 + i * 0.05) + i * 1.9, lx = f.x + Math.cos(a) * (8 + i % 3 * 3), ly = fy - 2 + Math.sin(a) * 3;
    r(c, lx, ly - 2, 1, 2, ['#c83a32', '#3a6ab8', '#2f8a3a', '#e8a030', '#6a3a8a', '#8a5a32'][i]); p(c, lx, ly - 3, '#f2c9a0');
  }
  else for (let i = 0; i < 15; i++) {
    const xx = f.x - 7 + i, yy = fy - 17 + Math.round(Math.sin(i / 14 * Math.PI) * 2 + Math.sin(t * 4 + i) * 0.4);
    p(c, xx, yy, ['#e84a4a', '#ffe060', '#3a8ad8', '#7ae07a'][i % 4]);
  }

  // Wichtelwald: Glühwürmchen und Funken
  const wi = ort('wichtel'), wy = yPx(wi);
  if (S.ortOffen(wi)) for (let i = 0; i < 6; i++) {
    const a = t * (0.6 + i * 0.13) + i * 1.7;
    const fx = wi.x + Math.cos(a) * (12 + i * 1.5), fy2 = wy - 10 + Math.sin(a * 1.3) * 6;
    if ((Math.floor(t * 3 + i) % 4) !== 0) p(c, fx, fy2, i % 2 ? '#fff4a0' : '#a8f0ff');
  }

  // Lichtung: ein Hase hüpft, ein Reh senkt den Kopf zum Fressen
  const l = ort('lichtung'), ly = yPx(l);
  if (S.ortOffen(l)) {
  const hx = l.x - 12 + ((t * 6) % 10), hy = ly - 1 - Math.abs(Math.sin(t * 6)) * 2;
  r(c, hx, hy - 2, 3, 2, '#b8a898'); p(c, hx + 2, hy - 3, '#b8a898'); p(c, hx + 2, hy - 5, '#b8a898'); p(c, hx + 3, hy - 4, '#b8a898'); p(c, hx, hy - 2, '#ffffff');
  const rx = l.x + 9, ry = ly - 3;
  r(c, rx - 2, ry - 3, 5, 2, '#a8703a'); p(c, rx - 2, ry - 1, '#a8703a'); p(c, rx + 2, ry - 1, '#a8703a'); p(c, rx - 2, ry, '#a8703a'); p(c, rx + 2, ry, '#a8703a');
  const unten = Math.floor(t / 2) % 3 === 0;
  r(c, rx + 3, ry - (unten ? 3 : 5), 1, 2, '#a8703a'); r(c, rx + 3, ry - (unten ? 2 : 6), 2, 1, '#8a5a2a');
  }

  // Schlittenberg: ein Wok saust die Bahn hinunter
  const b = ort('berg'), by = yPx(b);
  const k = (t * 0.45) % 1.3;
  if (k < 1 && S.ortOffen(b)) {
    const i = k * 21, bx = b.x - 4 + Math.sin(i / 3.2) * 6 + 1, byy = by - 21 + i;
    r(c, bx - 1, byy, 4, 1, '#2a2a30'); r(c, bx, byy - 1, 2, 1, '#3a3a40'); p(c, bx, byy - 2, '#c83a32'); p(c, bx, byy - 3, '#f2c9a0');
  }

  // Christbaumverkauf: Lichterkette am Hüttendach blinkt
  const cb = ort('baeume'), cy = yPx(cb);
  if (S.ortOffen(cb)) for (let i = 0; i < 5; i++) if ((Math.floor(t * 2) + i) % 2) p(c, cb.x + 9 + i * 2, cy - 11, ['#ff5a5a', '#ffe060', '#5ad0ff'][i % 3]);

  // Vögel ziehen vorbei (nur ohne Schnee, tagsüber)
  const li = Z.licht();
  if (!winter && li.hell > 0.5) {
    const vx = ((t * 9) % 260) - 40, vy = 0.3 * H + Math.sin(t * 0.4) * 6;
    for (let i = 0; i < 3; i++) { const xx = vx - i * 5, yy = vy + i * 2 + ((Math.floor(t * 5) + i) % 2); p(c, xx, yy, '#2a3a2a'); p(c, xx - 1, yy - 1, '#2a3a2a'); p(c, xx + 1, yy - 1, '#2a3a2a'); }
  }

  if (santa) zeichneSanta(t, dt, winter);

  // Der Wichtel (läuft beim Wechsel, sonst wippt er)
  const wipp = wanderer ? (Math.floor(t * 10) % 2) : 0;
  r(c, Math.round(pos.x) - 19, Math.round(pos.y) + 6, 5, 1, 'rgba(0,0,0,0.25)');
  wichtelKlein(c, Math.round(pos.x) - 17, Math.round(pos.y) + 6 - wipp, t, 0);   // links neben dem Ort, das Schild steht darunter

  // Schneefall
  if (winter || Z.wetter().art === 'schnee') {
    for (const fl of flocken) {
      fl.y += fl.v * dt; if (fl.y > H) { fl.y = -2 - vers(); fl.x = Math.random() * C.B; }
      p(c, fl.x + Math.sin(t + fl.s) * 2, fl.y, '#ffffff');
    }
  }

  // Noch nicht offene Orte liegen unter Schneenebel (12.10.): man ahnt die
  // Form, aber kein Licht und kein Schild - sie zeigen sich, wenn sie dran sind
  const zu = ORTE.filter((o) => !S.ortOffen(o));   // (ohne Nebel seit 13.10. - sie werden gar nicht gemalt)
  const imNebel = (q) => zu.some((o) => Math.abs(q.x - o.x) < 20 && q.y > yPx(o) - 32 && q.y < yPx(o) + 6);
  const lichterOffen = zu.length ? grundLichter.filter((q) => !imNebel(q)) : grundLichter;
  // Nachts dunkler, dann leuchten Fenster, Laternen und Lichterketten
  nachtLichter(li, C.B, H, lichterOffen, ORTE.filter((o) => !zu.includes(o)), winter);
  // Gemütlich (10.10.): Jeder Ort hat nachts einen warmen Lichthof, der sanft
  // atmet, und die Schilder glühen (CSS-Klasse .nacht) - man sieht sofort,
  // wohin man tippen kann
  const nacht = 1 - li.hell;
  $('#landkarte').classList.toggle('nacht', nacht > 0.4);
  // Ohne Schilder (12.10.) leuchten die offenen Orte auch tagsüber leicht
  const hof = nacht > 0.25 ? nacht : 0;   // tagsüber ohne Schilder kein großer Hof mehr (13.10.) - dafür die Punkte
  if (hof > 0) {
    for (const o of ORTE) {
      if (zu.includes(o)) continue;
      const ox = o.x, oy = yPx(o) - 8, atem = 0.85 + Math.sin(t * 1.2 + o.x) * 0.15;
      const g = c.createRadialGradient(ox, oy, 2, ox, oy, 30);
      // Der Hof steckt jetzt in der Lichtkarte (17.10.) - hier nur noch das sanfte Atmen
      g.addColorStop(0, `rgba(255,190,100,${(hof * 0.2 * atem).toFixed(3)})`);
      g.addColorStop(0.5, `rgba(255,170,80,${(hof * 0.08 * atem).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,160,70,0)');
      c.fillStyle = g;
      c.fillRect(ox - 30, oy - 30, 60, 60);
    }
    // Fenster und Laternen noch einmal obendrauf, damit sie aus dem Hof strahlen
    if (nacht > 0.25) for (const q of lichterOffen) p(c, q.x, q.y, q.f);
  }
  // Ohne Schilder (13.10.): ein leuchtender Punkt je offenem Ort, wo sonst
  // das Schild hängt - für den Überblick. Rot, wenn das Minispiel noch neu ist.
  if (S.st.karteOhneText) {
    for (const o of ORTE) {
      if (zu.includes(o) || o.id === hervorId) continue;   // ein hervorgehobener Ort hat sein Schild
      // Direkt unter dem Ort - nicht am Schild (die Backstube hat ihr Schild daneben)
      const px2 = Math.round(o.x), py2 = Math.round(yPx(o) + 6);
      const neu = o.spiel && !S.miniRekord(o.spiel);
      const atem = 0.75 + Math.sin(t * 2.2 + o.x * 0.3) * 0.25;
      const rgb = neu ? '255,110,90' : '255,214,110';
      // Nur ein ganz kleiner Schein (13.10.: vorher 7 px, „viel zu groß")
      const g = c.createRadialGradient(px2, py2, 1, px2, py2, 4.5);
      g.addColorStop(0, `rgba(${rgb},${(0.6 * atem).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(px2 - 5, py2 - 5, 10, 10); c.restore();
      // Runder Punkt (5 x 5) mit dunklem Rand, damit er auch auf Schnee steht
      const rand = neu ? '#7a1a10' : '#6a4410', kern = neu ? '#ff6a50' : '#ffd040';
      r(c, px2 - 1, py2 - 3, 3, 1, rand); r(c, px2 - 1, py2 + 3, 3, 1, rand); r(c, px2 - 3, py2 - 1, 1, 3, rand); r(c, px2 + 3, py2 - 1, 1, 3, rand);
      p(c, px2 - 2, py2 - 2, rand); p(c, px2 + 2, py2 - 2, rand); p(c, px2 - 2, py2 + 2, rand); p(c, px2 + 2, py2 + 2, rand);
      r(c, px2 - 1, py2 - 2, 3, 5, kern); r(c, px2 - 2, py2 - 1, 5, 3, kern);
      p(c, px2 - 1, py2 - 1, '#ffffff'); p(c, px2, py2 - 1, '#fff6d0');
    }
  }
  c.restore();
}

/**
 * Der Weihnachtsmann lugt hinter einem Busch oder einer Tanne hervor: taucht
 * auf, winkt, duckt sich wieder weg (alle 3,5 s). Gefunden hüpft er hoch,
 * „Ho ho ho" steigt auf, dann ist er weg.
 */
function zeichneSanta(t, dt, winter) {
  const s = santa, x = s.x, fuss = Math.round(s.y * H);
  s.t += dt;
  let hoch;   // wie weit er hinter der Deckung hervorschaut (0 = gar nicht, 9 = ganz)
  if (s.gefunden >= 0) {
    s.gefunden += dt;
    hoch = 9 + Math.round(Math.sin(Math.min(1, s.gefunden / 0.6) * Math.PI) * 10);
    if (s.gefunden > 1.4) { santa = null; return; }
  } else {
    const k = s.t % 3.5;
    hoch = k < 0.4 ? Math.round(k / 0.4 * 9) : k < 2.4 ? 9 : k < 2.8 ? Math.round((2.8 - k) / 0.4 * 9) : 0;
  }
  if (hoch > 0) {
    const y = fuss - 4 - hoch;   // Oberkante der Mütze
    // Mütze mit Bommel, Gesicht, Bart, winkender Arm
    r(c, x - 2, y, 4, 2, '#d83a3a'); r(c, x - 3, y + 2, 6, 1, '#d83a3a'); p(c, x + 2, y - 1, '#d83a3a'); p(c, x + 3, y - 1, '#ffffff');
    r(c, x - 3, y + 3, 6, 1, '#ffffff');
    r(c, x - 2, y + 4, 4, 2, '#f2c9a0'); p(c, x - 1, y + 4, '#2a1a1a'); p(c, x + 1, y + 4, '#2a1a1a');
    r(c, x - 3, y + 6, 6, 3, '#ffffff'); p(c, x, y + 6, '#e8a0a0');
    r(c, x - 3, y + 9, 6, 4, '#c82828');
    if (s.gefunden >= 0 || (s.t % 3.5) > 0.6) {
      const w = Math.floor(t * 6) % 2;
      r(c, x + 3, y + 6 - w, 1, 3, '#c82828'); p(c, x + 4, y + 5 - w, '#ffffff');
    }
  }
  // Die Deckung vor ihm (nach ihm gezeichnet, damit sie ihn verdeckt)
  if (s.gefunden < 0) {
    const P = palette(winter);
    if (s.hinter === 'tanne') tanne(x, fuss + 1, 1, P);
    else { busch(x, fuss, P, winter); busch(x - 3, fuss + 1, P, winter); busch(x + 3, fuss + 1, P, winter); r(c, x - 5, fuss - 3, 11, 3, P.busch); if (winter) r(c, x - 4, fuss - 4, 9, 1, '#ffffff'); }
  } else if (s.gefunden < 1.2) {
    const a = s.gefunden / 1.2;
    c.globalAlpha = 1 - a;
    pixText(c, 'HO HO HO!', x - 16, fuss - 30 - Math.round(a * 12), '#ffe060', '#6a1414');
    c.globalAlpha = 1;
  }
}

/**
 * Nacht auf der Karte (17.10., gemeldet: „wirkt flach"). Vorher ein flacher
 * violetter Schleier. Jetzt wie am Haus eine LICHTKARTE, die das Bild
 * multipliziert: kühler Grundton (Schnee etwas heller), Mondlicht von oben
 * rechts, warme Inseln um jedes Fenster und jede Laterne, große Höfe um die
 * offenen Orte, dunklere Ränder. Danach leuchten die Lichter selbst
 * (additiv). Die Karte wird nur neu gebaut, wenn sich etwas ändert.
 */
let nachtKarte = null, nachtSchluessel = '';
function nachtLichter(li, w, h, liste, orte, winter) {
  if (li.hell >= 0.9) return;
  const nacht = 1 - li.hell, v = vers(), hh = h + v;
  const schl = [w, hh, Math.round(nacht * 40), liste.length, orte.map((o) => o.id).join(), winter].join('|');
  if (schl !== nachtSchluessel) {
    nachtSchluessel = schl;
    nachtKarte = nachtKarte || document.createElement('canvas');
    nachtKarte.width = w; nachtKarte.height = hh;
    const k = nachtKarte.getContext('2d');
    // Grundton: Tag weiß (ändert nichts), Nacht kühles Blau
    const ziel = winter ? [78, 84, 142] : [62, 64, 122];
    const ton = ziel.map((z) => Math.round(255 - (255 - z) * nacht));
    k.globalCompositeOperation = 'source-over';
    k.fillStyle = `rgb(${ton.join(',')})`; k.fillRect(0, 0, w, hh);
    k.globalCompositeOperation = 'lighter';
    // Mondlicht von oben rechts
    const m = k.createRadialGradient(w * 0.85, 0, 4, w * 0.85, 0, hh * 0.8);
    m.addColorStop(0, `rgba(70,80,110,${(0.6 * nacht).toFixed(3)})`); m.addColorStop(1, 'rgba(70,80,110,0)');
    k.fillStyle = m; k.fillRect(0, 0, w, hh);
    // Große warme Höfe um die offenen Orte
    for (const o of orte) {
      const ox = o.x, oy = yPx(o) - 8 + v;
      const g = k.createRadialGradient(ox, oy, 2, ox, oy, 28);
      g.addColorStop(0, `rgba(190,120,50,${(0.75 * nacht).toFixed(3)})`); g.addColorStop(0.55, `rgba(150,90,40,${(0.3 * nacht).toFixed(3)})`); g.addColorStop(1, 'rgba(120,70,30,0)');
      k.fillStyle = g; k.fillRect(ox - 28, oy - 28, 56, 56);
    }
    // Kleine Inseln um jedes Licht (Fenster, Laternen, Ketten)
    for (const q of liste) {
      const g = k.createRadialGradient(q.x, q.y + v, 0, q.x, q.y + v, 7);
      g.addColorStop(0, `rgba(200,140,70,${(0.7 * nacht).toFixed(3)})`); g.addColorStop(1, 'rgba(200,140,70,0)');
      k.fillStyle = g; k.fillRect(q.x - 7, q.y + v - 7, 14, 14);
    }
    // Dunklere Ränder
    k.globalCompositeOperation = 'source-over';
    const vg = k.createRadialGradient(w / 2, hh * 0.55, Math.min(w, hh) * 0.35, w / 2, hh * 0.55, Math.max(w, hh) * 0.75);
    vg.addColorStop(0, 'rgba(10,10,30,0)'); vg.addColorStop(1, `rgba(10,10,30,${(0.45 * nacht).toFixed(3)})`);
    k.fillStyle = vg; k.fillRect(0, 0, w, hh);
  }
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.drawImage(nachtKarte, 0, -v);
  c.restore();
  if (nacht < 0.25) return;
  // Die Lichter selbst: kleiner heller Schein, dann der Lichtpunkt
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = `rgba(255,190,100,${(nacht * 0.22).toFixed(3)})`;
  for (const q of liste) c.fillRect(q.x - 1, q.y - 1, 3, 3);
  c.restore();
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

/**
 * Ortsbild eines Geschäfts oben im Laden-Blatt. Seit 11.10. in doppelter
 * Auflösung und mit eigenen, detailreicheren Zeichnungen in fein.js
 * (vorher hier mit den Kartenbausteinen, 110 x 40 - „zu grob pixelig").
 */
export function vignette(ziel, tab, opt) { return FEIN.vignette(ziel, tab, opt); }
