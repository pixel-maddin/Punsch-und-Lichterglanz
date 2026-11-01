// ---------------------------------------------------------------------------
// „Haus ansehen" (01.11., Nutzerwunsch): das Haus als Vollbild-Moment - ohne
// Tresen, ohne Gäste, mit wählbarer Tageszeit (tagsüber sind die Lichterketten
// aus, hier kann man sie jederzeit leuchten sehen), großen Schneeflocken im
// Vordergrund und dem Hausnamen im Himmel. „Als Foto" gibt den Moment an die
// Foto-Karte weiter. Bewusst KEIN Zoom: Pixelkunst wird davon nur gröber.
// ---------------------------------------------------------------------------
import { zeichneWelt } from './szene.js?v=202611011400';
import { schriftBild } from './schrift.js?v=202611011400';
import * as Z from './zeit.js?v=202611011400';
import * as S from './spiel.js?v=202611011400';

const $ = (s) => document.querySelector(s);
/** Tageszeiten zur Wahl - Stunde, Minute (null = jetzt) */
const ZEITEN = { jetzt: null, tag: [12, 0], abend: 'daemmerung', nacht: [21, 30] };

let offen = false, raf = 0, letzte = 0, zeit = 'jetzt';
let cv = null, c = null, H = 320;
let flocken = [];
let beimFoto = null;   // Rückruf: Foto-Karte mit Datum öffnen (ui.js)

export const istOffen = () => offen;
/** Die gewählte Tageszeit als Datum (für die Foto-Karte), oder null für „jetzt". */
export function datum() {
  const z = ZEITEN[zeit];
  if (!offen || !z) return null;
  const d = new Date(Z.jetzt());
  if (z === 'daemmerung') {
    // Abend = Dämmerung: der erste Moment nach 15 Uhr, in dem die Lichter an sind und der Himmel noch Farbe hat
    d.setHours(15, 0, 0, 0);
    for (let i = 0; i < 48 && Z.licht(d).hell > 0.35; i++) d.setMinutes(d.getMinutes() + 5);
    return d;
  }
  d.setHours(z[0], z[1], 0, 0);
  return d;
}

export function oeffne(foto) {
  beimFoto = foto;
  const el = $('#ansicht');
  cv = $('#ansichtCv'); c = cv.getContext('2d');
  el.classList.remove('versteckt', 'ruhig');
  $('#huelle').classList.add('ansicht-offen');
  offen = true; zeit = 'jetzt';
  groesse();
  waehle('jetzt');
  textKnopf();
  letzte = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(takt);
}
export function schliesse() {
  offen = false;
  cancelAnimationFrame(raf);
  $('#ansicht').classList.add('versteckt');
  $('#huelle').classList.remove('ansicht-offen');
}

function groesse() {
  const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 2;
  H = Math.max(240, Math.round(($('#ansicht').clientHeight || 640) / px));
  cv.width = 180; cv.height = H;
  flocken = Array.from({ length: 34 }, () => neueFlocke(true));
}
function neueFlocke(irgendwo) {
  const gr = Math.random() < 0.35 ? 3 : 2;
  return { x: Math.random() * 180, y: irgendwo ? Math.random() * H : -4, gr, v: 7 + Math.random() * 9 + gr * 2, ph: Math.random() * 6.28, a: 0.55 + Math.random() * 0.4 };
}

function textKnopf() { $('#ansichtText').classList.toggle('aus', !!S.st.ansichtOhneName); }

function waehle(z) {
  zeit = z;
  for (const b of document.querySelectorAll('#ansicht .az')) b.classList.toggle('gewaehlt', b.dataset.z === z);
}

function takt(jetzt) {
  if (!offen) return;
  raf = requestAnimationFrame(takt);   // erst anmelden - ein Zeichenfehler hält die Ansicht nicht an
  // höchstens 30 Bilder je Sekunde wie das Spiel selbst (sonst wird das Handy warm)
  if (jetzt - letzte < 31) return;
  const dt = Math.max(0, Math.min(0.1, (jetzt - letzte) / 1000));
  letzte = jetzt;
  const soll = Math.round(($('#ansicht').clientHeight || 0) / (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 2));
  if (soll > 200 && soll !== H) groesse();
  try { zeichne(jetzt / 1000, dt); } catch (e) { console.warn('Ansicht', e); }
}

function zeichne(t, dt) {
  // Die Welt endet bei 78 % der Höhe, darunter der Schneewall - sonst stand das Haus ganz unten unter viel leerem Himmel
  const G = Math.round(H * 0.78);
  c.clearRect(0, 0, 180, H);
  const opts = { ohneGaeste: true };
  const d = datum();
  if (d) opts.datum = d;
  const w = zeichneWelt(c, G, t, dt, opts);
  const nacht = w.dunkel;
  // Der Hausname im Himmel, in der Weihnachtsschrift (wie auf der Foto-Karte)
  const name = (S.st.name || '').trim().toUpperCase();
  if (name && !S.st.ansichtOhneName) {   // 01.11.: über „Aa“ ausblendbar (gemerkt im Spielstand)
    const text = /^HAUS\s/.test(name) ? name : `HAUS ${name}`;
    let bild = schriftBild(text, 'gold', 2);
    if (bild.width > 172) bild = schriftBild(text, 'gold', 1);
    c.drawImage(bild, Math.round((180 - bild.width) / 2), Math.round(H * 0.25));
  }
  zweige(w, t);
  const rand = strasseVorn(G, w);
  schneewall(rand, w, t);
  if (w.schnee > 0) grosseFlocken(dt, t, nacht);
  vignette(nacht);
}

/** Vorn ein Schneewall mit welliger Kante - der Blick geht über ihn hinweg aufs Haus. */
function schneewall(G, w, t) {   // G hier: Oberkante des Walls
  const nacht = w.dunkel;
  const misch = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const hell = misch([238, 243, 250], [110, 122, 168], nacht), schatten = misch([206, 218, 236], [82, 92, 140], nacht);
  const kante = misch([255, 255, 255], [150, 162, 204], nacht);
  const winter = w.schnee > 0;
  const boden = winter ? null : misch([122, 138, 82], [52, 62, 60], nacht);
  for (let x = 0; x < 180; x++) {
    const welle = Math.round(3 * Math.sin(x / 17 + 0.6) + 2 * Math.sin(x / 7.3) + 1.5 * Math.sin(x / 31 + 2));
    const oben = G + 4 + welle;
    for (let y = oben; y < H; y++) {
      const tief = y - oben;
      // weiche Schattenwellen (Verwehungen) und eine Spur Fußstapfen quer über den Wall
      const welle2 = Math.round(2 * Math.sin(x / 11 + tief * 0.3));
      const verweht = tief > 6 && (tief + welle2) % 14 === 0;
      const spur = Math.abs(tief - 18 - Math.round(4 * Math.sin(x / 40))) < 1 && x % 9 < 2;
      let f = boden || (tief < 3 ? kante : verweht || spur ? schatten : hell);
      if (boden && y === oben) f = misch(boden, [180, 196, 130], 0.4 * (1 - nacht));
      c.fillStyle = `rgb(${f})`; c.fillRect(x, y, 1, 1);
    }
  }
}

/**
 * Tannenzweige, die oben in die Ecken hängen - wie ein Bilderrahmen. Mit Schnee auf den Nadeln, einer
 * Kugel und ein paar warmen Lichtern, die nachts leuchten. Nachts wie der Rest abgedunkelt.
 */
const ZWEIGE = (() => {
  // Je Zweig: Punkte des Astes (von der Ecke weg), Nadellänge nimmt zur Spitze ab
  const ast = (x0, y0, x1, y1, bogen, n) => Array.from({ length: n }, (_, i) => {
    const k = i / (n - 1);
    return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * bogen, 1 - k];
  });
  // 01.11.: größer und tiefer - die oberen 18 Pixel liegen unter der Knopfleiste
  return [ast(-6, 14, 80, 40, 9, 46), ast(-6, 30, 44, 56, 5, 26), ast(12, 6, 58, 22, 4, 24), ast(-6, 46, 22, 66, 3, 14)];
})();
function zweige(w, t) {
  const nacht = w.dunkel, schnee = w.schnee > 0;
  const misch = (hex, k) => {
    const n = parseInt(hex.slice(1), 16), z = [(n >> 16) & 255, (n >> 8) & 255, n & 255], d = [22, 28, 64];
    return `rgb(${z.map((v, i) => Math.round(v + (d[i] - v) * k)).join(',')})`;
  };
  const dunk = 0.62 * nacht;
  const GR = ['#1a4a28', '#24603a', '#2f7a44', '#3e9050'].map((f) => misch(f, dunk));
  const SCH = misch('#f2f7ff', dunk * 0.8), HOLZ = misch('#5a3a1e', dunk);
  for (const seite of [1, -1]) {
    const X = (x) => (seite > 0 ? x : 179 - x);
    for (const ast of ZWEIGE) {
      ast.forEach(([x, y, rest], i) => {
        const len = Math.round(3 + rest * 8);
        for (const dir of [-1, 1]) for (let k = 1; k <= len; k++) {
          const nx = Math.round(x + k * 0.55), ny = Math.round(y + dir * k * 0.8);
          if (ny < 0) continue;
          c.fillStyle = GR[(i + k + (dir > 0 ? 1 : 0)) % 4]; c.fillRect(X(nx), ny, 1, 1);
          if (schnee && dir < 0 && k === len && i % 3 === 0) { c.fillStyle = SCH; c.fillRect(X(nx), ny - 1, 1, 1); }
        }
        c.fillStyle = HOLZ; c.fillRect(X(Math.round(x)), Math.round(y), 1, 1);
        if (schnee && i % 2 === 0) { c.fillStyle = SCH; c.fillRect(X(Math.round(x)), Math.round(y) - 1, 1, 1); }
      });
    }
    // Schmuck (01.11.: mehr davon): Kugeln am Faden, Strohsterne, Tannenzapfen - links und rechts verschieden
    const faden = (x, y0, y1) => { c.fillStyle = misch('#8a8a8a', dunk); c.fillRect(x, y0, 1, y1 - y0); };
    const kugel = (lx, ly, fh, len) => {
      const x = X(lx); faden(x, ly - len, ly);
      c.fillStyle = misch(fh, dunk * 0.7); c.fillRect(x - 2, ly, 5, 4); c.fillRect(x - 1, ly - 1, 3, 6);
      c.fillStyle = misch('#ffffff', dunk); c.fillRect(x - 1, ly, 1, 1);
      c.fillStyle = misch('#c8b070', dunk); c.fillRect(x - 1, ly - 2, 3, 1);
    };
    const stroh = (lx, ly, len) => {
      const x = X(lx); faden(x, ly - 3 - len, ly - 3);
      c.fillStyle = misch('#e8c878', dunk);
      for (let k = -3; k <= 3; k++) { c.fillRect(x + k, ly, 1, 1); c.fillRect(x, ly + k, 1, 1); }
      c.fillStyle = misch('#c8a050', dunk);
      for (let k = -2; k <= 2; k++) { c.fillRect(x + k, ly + k, 1, 1); c.fillRect(x + k, ly - k, 1, 1); }
      c.fillStyle = misch('#c83a32', dunk); c.fillRect(x, ly, 1, 1);
    };
    const zapfen = (lx, ly) => {
      const x = X(lx);
      c.fillStyle = misch('#4a2a14', dunk); c.fillRect(x - 1, ly, 3, 5); c.fillRect(x, ly + 5, 1, 1);
      c.fillStyle = misch('#8a5a2e', dunk); c.fillRect(x - 1, ly + 1, 1, 1); c.fillRect(x + 1, ly + 2, 1, 1); c.fillRect(x - 1, ly + 3, 1, 1);
      c.fillStyle = misch('#a8743c', dunk); c.fillRect(x, ly, 1, 1);
      if (schnee) { c.fillStyle = SCH; c.fillRect(x - 1, ly - 1, 3, 1); }
    };
    if (seite > 0) {
      kugel(46, 46, '#c8303c', 8); kugel(24, 40, '#3a62b8', 6); kugel(68, 48, '#e0a828', 10); kugel(10, 58, '#c0c8d8', 6);
      stroh(34, 52, 6); stroh(58, 34, 4); zapfen(18, 24); zapfen(52, 26); zapfen(30, 40); zapfen(72, 40);
    } else {
      kugel(40, 46, '#e0a828', 8); kugel(62, 50, '#c8303c', 10); kugel(20, 40, '#2f8a4a', 6); kugel(12, 60, '#c8303c', 5);
      stroh(28, 54, 7); stroh(70, 36, 4); zapfen(14, 22); zapfen(46, 28); zapfen(36, 38); zapfen(56, 42);
    }
    for (const [lx, ly] of [[18, 22], [36, 30], [62, 36], [14, 44]]) {
      const x = X(lx);
      if (nacht > 0.15) {
        const g = c.createRadialGradient(x + 0.5, ly + 0.5, 0, x + 0.5, ly + 0.5, 6);
        const a = (0.55 * nacht * (0.85 + 0.15 * Math.sin(t * 3 + lx))).toFixed(3);
        g.addColorStop(0, `rgba(255,214,130,${a})`); g.addColorStop(1, 'rgba(255,214,130,0)');
        c.fillStyle = g; c.fillRect(x - 6, ly - 6, 13, 13);
      }
      c.fillStyle = nacht > 0.15 ? '#ffe6a0' : misch('#7a6a50', dunk); c.fillRect(x, ly, 1, 2);
    }
  }
}

/**
 * Mehr Straße und der gegenüberliegende Rand (01.11., Nutzerwunsch): die Fahrbahn läuft unter der Welt
 * weiter, dann ein Bordstein, ein Streifen Schnee bzw. Wiese mit kleinen Büschen, Tännchen und Steinen.
 * Gefärbt wie die Lichtkarte der Welt (Tag hell, Nacht blau), damit es nahtlos anschließt.
 * Gibt die Oberkante für den Schneewall zurück.
 */
function strasseVorn(G, w) {
  const nacht = w.dunkel, winter = w.schnee > 0;
  const lk = [214, 218, 234].map((v, i) => (v + ([122, 132, 184][i] - v) * nacht) / 255);
  const f = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgb(${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v * lk[i])).join(',')})`; };
  const px = (x, y, hex) => { c.fillStyle = f(hex); c.fillRect(x, y, 1, 1); };
  const STR = 9, RAND = 20;
  // Fahrbahn weiter (gleiche Farben und Körnung wie fahrbahn() in szene.js)
  for (let y = G; y < G + STR; y++) for (let x = 0; x < 180; x++) {
    const h = Z.hash(x * 17 + y * 211);
    px(x, y, winter ? (h < 0.07 ? '#a8b2c0' : h > 0.95 ? '#ccd4de' : '#b8c2ce') : (h < 0.07 ? '#535359' : h > 0.95 ? '#6c6c74' : '#5e5e66'));
  }
  if (winter) for (let x = 0; x < 180; x++) if ((x * 13) % 7 < 3) px(x, G + 3, '#a4aebc');   // Spurrillen
  // Bordstein gegenüber
  for (let x = 0; x < 180; x++) { px(x, G + STR, winter ? '#e4ebf2' : '#9a9aa2'); px(x, G + STR + 1, winter ? '#9aa6b4' : '#6a6a72'); }
  // Der Rand: Schnee bzw. Wiese
  const y0 = G + STR + 2;
  for (let y = y0; y < H; y++) for (let x = 0; x < 180; x++) {   // bis ganz unten - der Wall liegt darüber, kein Spalt
    const h = Z.hash(x * 29 + y * 131);
    px(x, y, winter ? (h < 0.08 ? '#cdd8ea' : '#e8eef7') : (h < 0.1 ? '#7a9050' : h > 0.93 ? '#a8b874' : '#8ea060'));
  }
  // Büsche, Tännchen und Steine - je mit kleinem Schatten
  const busch = (x, y, b) => {
    for (let dx = -b; dx <= b; dx++) px(x + dx, y + 1, winter ? '#b8c6dc' : '#5e7040');
    for (let dy = 0; dy < b + 1; dy++) {
      const ww = Math.round(Math.sqrt(Math.max(0, (b + 0.5) ** 2 - dy * dy)));
      for (let dx = -ww; dx <= ww; dx++) px(x + dx, y - dy, (dx + dy) % 3 === 0 ? '#1e5a30' : dx < 0 ? '#2f7a44' : '#24603a');
    }
    if (winter) for (let dx = -b + 1; dx < b; dx++) px(x + dx, y - b, '#f6f9ff');
  };
  const taennchen = (x, y, h) => {
    for (let k = 0; k < h; k++) {
      const ww = Math.floor(k / 2);
      for (let dx = -ww; dx <= ww; dx++) px(x + dx, y - h + k, dx < 0 ? '#2a7040' : '#1c5a30');
      if (winter && k % 3 === 2) { px(x - ww, y - h + k, '#f6f9ff'); px(x + ww, y - h + k, '#f6f9ff'); }
    }
    px(x, y, '#5a3a1e'); px(x - 1, y + 1, winter ? '#b8c6dc' : '#5e7040'); px(x + 1, y + 1, winter ? '#b8c6dc' : '#5e7040');
  };
  const stein = (x, y) => { px(x, y, '#8a8e98'); px(x + 1, y, '#9aa0aa'); px(x, y - 1, winter ? '#f6f9ff' : '#a8aeb8'); px(x + 1, y - 1, winter ? '#f6f9ff' : '#b4bac4'); };
  busch(12, y0 + 9, 4); busch(22, y0 + 11, 3); taennchen(44, y0 + 13, 11); stein(58, y0 + 12);
  busch(80, y0 + 10, 4); busch(116, y0 + 11, 4); busch(127, y0 + 9, 3); taennchen(146, y0 + 14, 13); stein(162, y0 + 10); busch(173, y0 + 12, 3);
  return y0 + RAND - 2;
}

/** Große, langsame Flocken vor allem - wie dicht vor der Kamera. */
function grosseFlocken(dt, t, nacht) {
  const f = nacht > 0.5 ? '226,234,250' : '255,255,255';
  for (let i = 0; i < flocken.length; i++) {
    const s = flocken[i];
    s.y += s.v * dt; s.x += Math.sin(t * 0.8 + s.ph) * 6 * dt;
    if (s.y > H + 4) flocken[i] = neueFlocke(false);
    if (s.x < -4) s.x += 184; if (s.x > 184) s.x -= 184;
    c.fillStyle = `rgba(${f},${s.a.toFixed(2)})`;
    const x = Math.round(s.x), y = Math.round(s.y);
    if (s.gr === 3) { c.fillRect(x, y - 1, 1, 3); c.fillRect(x - 1, y, 3, 1); }
    else c.fillRect(x, y, 2, 2);
  }
}

function vignette(nacht) {
  const g = c.createRadialGradient(90, H * 0.55, H * 0.28, 90, H * 0.55, H * 0.78);
  const a = 0.14 + 0.18 * nacht;
  g.addColorStop(0, 'rgba(10,12,34,0)'); g.addColorStop(1, `rgba(10,12,34,${a.toFixed(3)})`);
  c.fillStyle = g; c.fillRect(0, 0, 180, H);
}

/** Knöpfe einmal verdrahten (main.js / ui.js ruft das beim Start). */
export function verdrahte(klick) {
  for (const b of document.querySelectorAll('#ansicht .az')) b.onclick = (e) => { e.stopPropagation(); klick(); waehle(b.dataset.z); };
  $('#ansichtZu').onclick = (e) => { e.stopPropagation(); klick(); schliesse(); };
  $('#ansichtText').onclick = (e) => { e.stopPropagation(); klick(); S.st.ansichtOhneName = !S.st.ansichtOhneName; S.speichere(); textKnopf(); };
  $('#ansichtFoto').onclick = (e) => { e.stopPropagation(); klick(); if (beimFoto) beimFoto(datum()); };
  // Tippen ins Bild blendet die Knöpfe aus und wieder ein - für den reinen Moment (und Bildschirmfotos)
  $('#ansichtCv').onclick = () => $('#ansicht').classList.toggle('ruhig');
}
