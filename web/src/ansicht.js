// ---------------------------------------------------------------------------
// „Haus ansehen" (01.11., Nutzerwunsch): das Haus als Vollbild-Moment - ohne
// Tresen, ohne Gäste, mit wählbarer Tageszeit (tagsüber sind die Lichterketten
// aus, hier kann man sie jederzeit leuchten sehen), großen Schneeflocken im
// Vordergrund und dem Hausnamen im Himmel. „Als Foto" gibt den Moment an die
// Foto-Karte weiter. Bewusst KEIN Zoom: Pixelkunst wird davon nur gröber.
// ---------------------------------------------------------------------------
import { zeichneWelt } from './szene.js?v=202611011330';
import { schriftBild } from './schrift.js?v=202611011330';
import * as Z from './zeit.js?v=202611011330';
import * as S from './spiel.js?v=202611011330';

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
  if (name) {
    const text = /^HAUS\s/.test(name) ? name : `HAUS ${name}`;
    let bild = schriftBild(text, 'gold', 2);
    if (bild.width > 172) bild = schriftBild(text, 'gold', 1);
    c.drawImage(bild, Math.round((180 - bild.width) / 2), Math.round(H * 0.25));
  }
  zweige(w, t);
  schneewall(G, w, t);
  if (w.schnee > 0) grosseFlocken(dt, t, nacht);
  vignette(nacht);
}

/** Vorn ein Schneewall mit welliger Kante - der Blick geht über ihn hinweg aufs Haus. */
function schneewall(G, w, t) {
  const nacht = w.dunkel;
  const misch = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const hell = misch([238, 243, 250], [110, 122, 168], nacht), schatten = misch([206, 218, 236], [82, 92, 140], nacht);
  const kante = misch([255, 255, 255], [150, 162, 204], nacht);
  const winter = w.schnee > 0;
  const boden = winter ? null : misch([122, 138, 82], [52, 62, 60], nacht);
  for (let x = 0; x < 180; x++) {
    const welle = Math.round(3 * Math.sin(x / 17 + 0.6) + 2 * Math.sin(x / 7.3) + 1.5 * Math.sin(x / 31 + 2));
    const oben = G - 2 + welle;   // überlappt die Straßenkante - kein Spalt
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
    // Eine Kugel am Faden (links rot, rechts gold) und drei warme Lichter
    const kx = X(seite > 0 ? 46 : 40), kf = seite > 0 ? '#c8303c' : '#e0a828', ky = 46;
    c.fillStyle = misch('#8a8a8a', dunk); c.fillRect(kx, ky - 8, 1, 8);
    c.fillStyle = misch(kf, dunk * 0.7); c.fillRect(kx - 2, ky, 5, 4); c.fillRect(kx - 1, ky - 1, 3, 6);
    c.fillStyle = misch('#ffffff', dunk); c.fillRect(kx - 1, ky, 1, 1);
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
  $('#ansichtFoto').onclick = (e) => { e.stopPropagation(); klick(); if (beimFoto) beimFoto(datum()); };
  // Tippen ins Bild blendet die Knöpfe aus und wieder ein - für den reinen Moment (und Bildschirmfotos)
  $('#ansichtCv').onclick = () => $('#ansicht').classList.toggle('ruhig');
}
