/*
 * szene.js - die Welt: Himmel, Haus, Garten, Straße, Stand, Gäste, Wetter.
 *
 * ABLAUF JE BILD
 *   1. Himmel direkt aufs Canvas (hat seine Tageszeitfarbe schon).
 *   2. Alles andere auf eine EIGENE Ebene, dabei jede Lichtquelle in
 *      die Liste `L` eintragen.
 *   3. Die Ebene nachts abdunkeln (source-atop: nur, was darauf steht).
 *   4. Ebene aufs Canvas, dann die Lichter HELL darüber - mit Schein.
 *
 * So leuchten Lichterketten, Fenster und Laternen nachts wirklich,
 * statt mit abgedunkelt zu werden. Tagsüber sind es farbige Punkte.
 *
 * Alle Höhen hängen an G, der Bodenlinie (Oberkante der Tresenansicht).
 */
import { r, p, ton, mische, figurKlein, wichtelKlein, smiley, text as pixText } from './pixel.js?v=20260930h';
import * as Z from './zeit.js?v=20260930h';
import * as S from './spiel.js?v=20260930h';
import { FASSADEN } from './config.js?v=20260930h';

const BUNT = ['#ff4a4a', '#5aff6a', '#4a8aff', '#ffd040', '#ff6adf'];
const WARM = '#ffd98a';

let ebene = null, ec = null;
let gastE = null, gastC = null;
function gastEbeneFuer(w, h) {
  if (!gastE) { gastE = document.createElement('canvas'); gastC = gastE.getContext('2d'); }
  if (gastE.width !== w || gastE.height !== h) { gastE.width = w; gastE.height = h; }
  gastC.clearRect(0, 0, w, h);
  return gastC;
}
function ebeneFuer(w, h) {
  if (!ebene) { ebene = document.createElement('canvas'); ec = ebene.getContext('2d', { willReadFrequently: true }); }
  if (ebene.width !== w || ebene.height !== h) { ebene.width = w; ebene.height = h; }
  ec.clearRect(0, 0, w, h);
  return ec;
}

// ---------------------------------------------------------------------------
// Wetterteilchen (bleiben zwischen den Bildern)
// ---------------------------------------------------------------------------
const flocken = [];
for (let i = 0; i < 140; i++) flocken.push({ x: Math.random() * 180, y: Math.random() * 440, v: 8 + Math.random() * 14, s: Math.random() < 0.25 ? 2 : 1, ph: Math.random() * 6 });
const blaetter = [];
for (let i = 0; i < 10; i++) blaetter.push({ x: Math.random() * 180, y: Math.random() * 300, v: 6 + Math.random() * 6, ph: Math.random() * 6, f: ['#c8702a', '#a8521e', '#d89a3a'][i % 3] });
const raketen = [];

// Feste Sterne
const STERNE = [];
for (let i = 0; i < 40; i++) STERNE.push({ x: Math.floor(Z.hash(i * 3 + 1) * 180), y: Math.floor(Z.hash(i * 5 + 2) * 150), ph: Z.hash(i + 9) * 6 });

// ---------------------------------------------------------------------------
// Zustand der Welt für dieses Bild
// ---------------------------------------------------------------------------
function weltInfo(d) {
  const li = Z.licht(d);
  return {
    li, dunkel: 1 - li.hell,
    schnee: Z.schnee(d), wetter: Z.wetter(d), phase: Z.phase(d),
    kerzen: Z.adventKerzen(d), silvester: Z.silvester(d), mond: Z.mondphase(d), d,
  };
}

// ---------------------------------------------------------------------------
// Himmel
// ---------------------------------------------------------------------------
function himmel(c, G, w, t) {
  const horizont = G - 40;
  const herbst = w.schnee <= 0;
  const tagOben = herbst ? '#9aabbb' : '#8fb8d8', tagUnten = herbst ? '#d3d6d4' : '#dfe8ee';
  const nachtOben = '#1c2656', nachtUnten = '#3e4c80';
  const hell = w.li.hell;
  let oben = mische(nachtOben, tagOben, hell), unten = mische(nachtUnten, tagUnten, hell);
  if (w.li.daemmer > 0) {
    oben = mische(oben, '#40407e', w.li.daemmer * 0.6);
    unten = mische(unten, w.li.abends ? '#f08a52' : '#f0b07a', w.li.daemmer * 0.8);
  }
  const STUFEN = 9;
  for (let y = 0; y <= horizont; y++) {
    const q = Math.floor((y / horizont) * STUFEN) / STUFEN;
    const q2 = Math.min(1, q + 1 / STUFEN);
    // Übergang gerastert: Schachbrett zwischen zwei Stufen
    const inStufe = (y / horizont) * STUFEN % 1;
    c.fillStyle = mische(oben, unten, q);
    c.fillRect(0, y, 180, 1);
    if (inStufe > 0.7) {
      c.fillStyle = mische(oben, unten, q2);
      for (let x = (y % 2); x < 180; x += 2) c.fillRect(x, y, 1, 1);
    }
  }
  // Sterne
  if (w.dunkel > 0.4) {
    for (const s of STERNE) {
      if (s.y > horizont - 10) continue;
      const a = Math.sin(t * 2 + s.ph) > -0.3;
      if (a) p(c, s.x, s.y, w.dunkel > 0.8 ? '#fff8e0' : '#b8c0e0');
    }
  }
  // Sonne oder Mond
  if (hell > 0.05 && w.li.sonne > -0.05 && w.li.sonne < 1.05) {
    const sx = 16 + w.li.sonne * 148, sy = horizont - 8 - Math.sin(Math.max(0, Math.min(1, w.li.sonne)) * Math.PI) * (horizont - 40);
    const f = w.li.daemmer > 0.2 ? '#ffc070' : '#fff6c8';
    r(c, sx - 3, sy - 2, 7, 5, f); r(c, sx - 2, sy - 3, 5, 7, f);
  } else if (w.dunkel > 0.5) mond(c, 146, 34, w.mond, oben);
  // Wolken
  if (w.wetter.art !== 'klar' || herbst) {
    const wf = mische('#1c2040', herbst ? '#b4b8ba' : '#e8eef4', hell);
    for (let i = 0; i < 4; i++) {
      const x = ((i * 61 + t * (2 + i)) % 240) - 40, y = 8 + i * 13;
      r(c, x, y, 26, 4, wf); r(c, x + 5, y - 3, 14, 3, wf); r(c, x + 16, y - 1, 12, 3, wf);
    }
  }
  return horizont;
}

/**
 * Der Mond in seiner echten Phase (`Z.mondphase`). Jedes Pixel der
 * Scheibe wird gegen die Schattengrenze geprüft - eine Ellipse, deren
 * Breite mit der Phase wandert. Zunehmend ist die RECHTE Seite hell
 * (Nordhalbkugel). Die dunkle Seite schimmert ganz schwach (Erdschein),
 * damit man die Scheibe als Mond erkennt; bei Neumond bleibt sie weg.
 */
function mond(c, mx, my, phase, himmelFarbe) {
  const R = 4.5;
  const k = Math.cos(phase * Math.PI * 2);   // 1 = Neumond, -1 = Vollmond
  const zunehmend = phase < 0.5;
  const hell = '#f4f0d8', krater = '#dcd6b8';
  const nahNeumond = Math.min(phase, 1 - phase) < 0.035;
  const dunkel = mische(himmelFarbe, '#8a92b8', 0.18);
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    if (dx * dx + dy * dy > 4.6 * 4.6) continue;
    const nx = dx / R, ny = dy / R;
    const rand = k * Math.sqrt(Math.max(0, 1 - ny * ny));
    const lit = zunehmend ? nx > rand : nx < -rand;
    if (lit) {
      const istKrater = (dx === -1 && dy === -1) || (dx >= 1 && dx <= 2 && dy >= 1 && dy <= 2) || (dx === -2 && dy === 2);
      p(c, mx + dx, my + dy, istKrater ? krater : hell);
    } else if (!nahNeumond) p(c, mx + dx, my + dy, dunkel);
  }
}

// ---------------------------------------------------------------------------
// Hintergrund: Feld und Nachbarhäuser
// ---------------------------------------------------------------------------
function tannenRiss(c, x, fuss, h, f, schneeF) {
  const halb = Math.max(2, Math.round(h * 0.34));
  for (let i = 0; i < h; i++) {
    const bw = Math.round(halb * (i + 1) / h);
    // leicht gestufte Kanten, damit es nach Tanne und nicht nach Dreieck aussieht
    const stufe = (i % 4 === 3) ? 1 : 0;
    r(c, x - bw - stufe, fuss - h + i, bw * 2 + 1 + stufe * 2, 1, f);
    if (schneeF && i % 4 === 3) { p(c, x - bw - stufe, fuss - h + i, schneeF); p(c, x + bw + stufe, fuss - h + i, schneeF); }
  }
  if (schneeF) p(c, x, fuss - h, schneeF);
  r(c, x, fuss, 1, 2, '#4a3a2e');
}

function dorfhaus(c, L, x, fuss, bw, h, dach, wand, schnee, licht, festlich) {
  r(c, x, fuss - h, bw, h, wand);
  r(c, x, fuss - h, 1, h, ton(wand, -0.12));
  const dh = Math.ceil(bw / 2) + 1;
  for (let i = 0; i < dh; i++) r(c, x - 1 + i, fuss - h - i, bw + 2 - i * 2, 1, i === 0 ? ton(dach, -0.2) : dach);
  if (schnee) for (let i = 1; i < dh; i++) { p(c, x - 1 + i, fuss - h - i, '#f2f6fa'); p(c, x + bw - i, fuss - h - i, '#f2f6fa'); }
  // Fenster: tagsüber dunkel, nachts warm
  const fy = fuss - h + 2;
  for (let fx = x + 2; fx < x + bw - 2; fx += 4) {
    r(c, fx, fy, 2, 2, '#5a6070');
    if (Z.hash(fx * 13 + fuss) < licht) L.push({ rect: [fx, fy, 2, 2], f: '#ffcf70', halo: 3, an: 0.7 });
  }
  r(c, x + Math.floor(bw / 2) - 1, fuss - 3, 2, 3, ton(dach, -0.3));
  // Ab dem 4. Advent leuchtet das ganze Dorf
  if (festlich) for (let i = 0; i < dh; i += 2) {
    const f1 = BUNT[i % BUNT.length], f2 = BUNT[(i + 2) % BUNT.length];
    p(c, x - 1 + i, fuss - h - i, f1); p(c, x + bw - i, fuss - h - i, f2);
    L.push({ x: x - 1 + i, y: fuss - h - i, f: f1, halo: 2, an: 0.8 });
    L.push({ x: x + bw - i, y: fuss - h - i, f: f2, halo: 2, an: 0.8 });
  }
}

function hintergrund(c, G, w, L) {
  const hz = G - 40;
  const schnee = w.schnee > 0;
  // Feld bis zum Vorgarten
  r(c, 0, hz, 180, G - hz, schnee ? '#e4ebf2' : '#9aa068');
  // Zwei Reihen Tannen, die hintere blasser (Luftperspektive)
  const reihe = (fuss, hMin, hMax, f, sf, seed, abstand) => {
    for (let i = -1; i < 180 / abstand + 2; i++) {
      const x = i * abstand + Math.floor(Z.hash(seed + i * 7) * abstand);
      const h = hMin + Math.floor(Z.hash(seed * 3 + i * 5) * (hMax - hMin));
      tannenRiss(c, x, fuss, h, f, schnee ? sf : null);
    }
  };
  const fest = w.kerzen >= 4;
  const W = ['#efe3cc', '#e6d2b8', '#f4ead8', '#dcc8b0'];
  reihe(hz - 4, 12, 22, schnee ? '#a8b8c8' : '#7a9a88', '#eef3f8', 11, 6);
  // Links drei Häuschen WEIT hinten: klein, blass, zwischen den Tannenreihen
  const blass = (f) => mische(f, schnee ? '#c4d0dc' : '#9aae9e', 0.35);
  // Kein Fensterlicht (licht 0): Sie stehen hinter Kirche und Haus, und
  // ihre Lichter schwebten sonst als Punkte auf deren Dächern (gleiche
  // Tiefenstufe - die Verdeckungsprüfung sieht das nicht)
  dorfhaus(c, L, 0, hz, 9, 7, blass('#b8554a'), blass(W[0]), schnee, 0, false);
  dorfhaus(c, L, 11, hz - 1, 8, 6, blass('#5a6e9a'), blass(W[1]), schnee, 0, false);
  dorfhaus(c, L, 22, hz, 9, 7, blass('#8a6a3a'), blass(W[3]), schnee, 0, false);
  reihe(hz + 2, 14, 26, schnee ? '#7a9488' : '#4f7a5a', '#f4f8fb', 23, 8);
  // Links das Dorf mit der Kirche. Rechts steht nichts mehr (die Häuser dort
  // lugten nur halb über den Stand) - der kahle Baum steht frei.
  dorfhaus(c, L, 24, hz + 7, 10, 8, '#4a8a7a', W[2], schnee, 0.8, fest);
  // Kirche mit Zwiebelturm, ganz links: Der Turm steht neben der Tanne frei
  const kx = 3, kf = hz + 6;
  r(c, kx + 5, kf - 10, 13, 10, '#f0e8dc'); for (let i = 0; i < 7; i++) r(c, kx + 4 + i, kf - 10 - i, 15 - i * 2, 1, '#8a4a3a');
  // Schiff: zwei Rundbogenfenster, abends warm erleuchtet
  for (const fx of [kx + 9, kx + 14]) {
    r(c, fx, kf - 7, 2, 4, '#5a6070'); p(c, fx, kf - 8, '#e0d6c6'); p(c, fx + 1, kf - 8, '#e0d6c6');
    L.push({ rect: [fx, kf - 7, 2, 4], f: '#ffcf70', halo: 3, an: 0.7 });
  }
  r(c, kx, kf - 26, 7, 26, '#f4ecde'); r(c, kx, kf - 26, 1, 26, '#dcd0c0');
  r(c, kx + 1, kf - 30, 5, 4, '#3f6a5a'); r(c, kx + 2, kf - 32, 3, 2, '#3f6a5a'); p(c, kx + 3, kf - 34, '#3f6a5a'); p(c, kx + 3, kf - 35, '#e8c030');
  if (schnee) r(c, kx + 1, kf - 31, 5, 1, '#f4f8fb');
  r(c, kx + 2, kf - 22, 3, 3, '#e8e0c8'); p(c, kx + 3, kf - 21, '#3a3a3a');   // Uhr
  r(c, kx + 2, kf - 15, 3, 4, '#5a6070');
  L.push({ rect: [kx + 2, kf - 15, 3, 4], f: '#ffd88a', halo: 4, an: 0.75 });
  r(c, kx + 2, kf - 5, 3, 5, '#6a4a32'); p(c, kx + 2, kf - 5, '#f4ecde'); p(c, kx + 4, kf - 5, '#f4ecde');   // Tür
}

// ---------------------------------------------------------------------------
// Kahler Baum hinter dem Haus
// ---------------------------------------------------------------------------
/** Liegt ein Punkt hinter dem Haus (Wand, Dach oder Schornstein)? */
function hausVerdeckt(x, y, G) {
  const wandO = G - 66, wandU = G - 24;
  if (x >= HX0 && x < HX1 && y >= wandO && y < wandU) return true;
  const i = wandO - y;
  if (i >= 0 && i <= 28 && x >= 32 + i * 20 / 28 - 1 && x < 128 - i * 20 / 28 + 1) return true;
  if (x >= 97 && x <= 107 && y >= wandO - 39 && y < wandO - 18) return true;
  return false;
}

// Die Äste des kahlen Baums: Hauptäste vom Stamm, daran Zweige, an deren
// Enden kleine Gabeln. Einmal berechnet, relativ zum Stammfuß (x, y0).
// [x1, y1, x2, y2, stufe]  stufe 0 = Hauptast, 1 = Zweig, 2 = Spitze
const BAUM_AESTE = (() => {
  const haupt = [
    [0, -22, -11, -29], [2, -25, 12, -33],
    [0, -33, -15, -49], [2, -30, 16, -45],
    [0, -45, -11, -63], [2, -43, 14, -61],
    [1, -56, -5, -75], [1, -57, 8, -77], [1, -62, 1, -80],
  ];
  const liste = [];
  let n = 0;
  for (const [x1, y1, x2, y2] of haupt) {
    liste.push([x1, y1, x2, y2, 0]);
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    for (const [an, seite, lang] of [[0.45, 1, 6], [0.7, -1, 5], [0.95, 1, 4]]) {
      const sx = x1 + dx * an, sy = y1 + dy * an;
      const w = Math.atan2(dy, dx) + seite * 0.62 * (n++ % 2 ? 1 : 0.8);
      const ex = sx + Math.cos(w) * lang * (len / 16), ey = sy + Math.sin(w) * lang * (len / 16);
      liste.push([sx, sy, ex, ey, 1]);
      // kleine Gabel an der Zweigspitze
      const w2 = w + 0.5, w3 = w - 0.5;
      liste.push([ex, ey, ex + Math.cos(w2) * 2.5, ey + Math.sin(w2) * 2.5, 2]);
      liste.push([ex, ey, ex + Math.cos(w3) * 2.5, ey + Math.sin(w3) * 2.5, 2]);
    }
  }
  return liste.map((a) => a.map((v, k) => (k < 4 ? Math.round(v) : v)));
})();

function linie(x1, y1, x2, y2, f) {
  const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  const pkte = [];
  for (let i = 0; i <= n; i++) pkte.push([Math.round(x1 + (x2 - x1) * i / n), Math.round(y1 + (y2 - y1) * i / n)]);
  if (f) for (const [px, py] of pkte) f(px, py);
  return pkte;
}

function kahlerBaum(c, G, w, L, t) {
  const st = '#4a3a2e', st2 = '#5c4a3a';
  const x = 133, y0 = G - 24;   // rechts neben dem Haus, halb hinter dem Stand
  const schnee = w.schnee > 0;
  // Stamm: unten breiter, oben schmal
  r(c, x - 1, y0 - 5, 5, 5, st); r(c, x, y0 - 40, 3, 36, st); r(c, x + 2, y0 - 38, 1, 30, st2);
  r(c, x, y0 - 62, 2, 23, st); r(c, x + 1, y0 - 80, 1, 19, st);
  for (const [x1, y1, x2, y2, stufe] of BAUM_AESTE) {
    const pkte = linie(x + x1, y0 + y1, x + x2, y0 + y2);
    pkte.forEach(([px, py], i) => {
      p(c, px, py, stufe === 2 ? st2 : st);
      if (stufe === 0 && i < pkte.length * 0.4) p(c, px, py + 1, st);        // Hauptäste am Ansatz dicker
      if (schnee && stufe < 2 && i % 2 === 0) p(c, px, py - 1, '#f4f8fc');
    });
  }
  if (schnee) { p(c, x + 1, y0 - 81, '#f4f8fc'); }
  if (!schnee && !S.zeigt('baum_girlande')) {
    // Herbst: ein paar letzte Blätter an den Zweigspitzen
    BAUM_AESTE.filter((a) => a[4] === 1).forEach((a, i) => { if (i % 3 === 0) p(c, x + a[2], y0 + a[3], ['#c8702a', '#d89a3a', '#a8521e'][i % 3]); });
  }
  if (S.zeigt('baum_girlande')) {
    // Grüne Girlande um Stamm, Hauptäste und Zweige, mit Lichtern
    const bunt = S.bunt('baum');
    const gs = S.stufe('baum_girlande');
    let k = 0;
    const licht = (px, py) => {
      k++;
      if (hausVerdeckt(px, py, G)) return;   // hinter dem Haus: nicht durchs Dach leuchten
      const f = bunt ? BUNT[k % BUNT.length] : WARM;
      p(c, px, py, f);
      L.push({ x: px, y: py, f, halo: HALO[gs] || 3, an: lichtHell(k, t, gs) });
    };
    const alle = gs >= 2 ? 3 : 5, astAlle = gs >= 2 ? 2 : 3;
    for (let yy = y0 - 2; yy > y0 - 76; yy -= 1) {
      const breit = yy > y0 - 40 ? 2 : 1;
      const seite = Math.round(Math.sin((y0 - yy) * 0.45) * breit);
      p(c, x + 1 + seite, yy, '#2f7a3a');
      if ((y0 - yy) % alle === 0) licht(x + 1 + seite, yy);
    }
    for (const [x1, y1, x2, y2, stufe] of BAUM_AESTE) {
      if (stufe === 2) continue;
      const pkte = linie(x + x1, y0 + y1 + 1, x + x2, y0 + y2 + 1);
      pkte.forEach(([px, py], i) => {
        if (i === 0) return;
        p(c, px, py, i % 2 ? '#2f7a3a' : '#245a2c');
        if (stufe === 0 && i % astAlle === 0) licht(px, py + 1);
      });
      // jeder Zweig bekommt an der Spitze ein Licht, ab Stufe 2 auch in der Mitte
      if (stufe === 1) { licht(x + x2, y0 + y2); if (gs >= 2) { const m = pkte[Math.floor(pkte.length / 2)]; licht(m[0], m[1]); } }
    }
  }
}

// ---------------------------------------------------------------------------
// Das Haus
// ---------------------------------------------------------------------------
const HX0 = 38, HX1 = 122;

function haus(c, G, w, t, L) {
  const F = FASSADEN[S.st.fassade] || FASSADEN.trist;
  const wandO = G - 66, wandU = G - 24;
  const kamin = S.zeigt('kamin');

  // Wand
  r(c, HX0, wandO, HX1 - HX0, wandU - wandO, F.wand);
  if (F.muster === 'bretter') for (let x = HX0 + 3; x < HX1; x += 4) r(c, x, wandO, 1, wandU - wandO, F.wand2);
  else if (F.muster === 'putz') {
    for (let i = 0; i < 40; i++) p(c, HX0 + Math.floor(Z.hash(i * 7) * 84), wandO + Math.floor(Z.hash(i * 11) * 42), F.wand2);
    // Riss
    const rx = 44; for (let i = 0; i < 7; i++) p(c, rx + (i % 2), wandO + 4 + i, ton(F.wand2, -0.2));
  } else if (F.muster === 'lebkuchen') {
    for (let i = 0; i < 18; i++) {
      const x = HX0 + 3 + Math.floor(Z.hash(i * 5) * 78), y = wandO + 3 + Math.floor(Z.hash(i * 9) * 36);
      p(c, x, y, ['#e03a3a', '#3aa84a', '#f4f4f4', '#e8c030'][i % 4]);
    }
    for (let x = HX0; x < HX1; x += 2) { p(c, x, wandO + (x % 4 === 0 ? 1 : 2), F.rahmen); }
    for (let y = wandO; y < wandU; y += 2) { p(c, HX0 + (y % 4 === 0 ? 0 : 1), y, F.rahmen); p(c, HX1 - 1 - (y % 4 === 0 ? 0 : 1), y, F.rahmen); }
  } else if (F.muster === 'chalet') {
    for (let y = wandO + 3; y < wandU; y += 3) r(c, HX0, y, HX1 - HX0, 1, F.wand2);
    r(c, HX0, wandU - 10, HX1 - HX0, 10, F.sockel);
    for (let y = wandU - 10; y < wandU; y += 3) for (let x = HX0 + ((y / 3) % 2 ? 2 : 0); x < HX1; x += 6) r(c, x, y, 1, 3, ton(F.sockel, -0.25));
    r(c, HX0, wandU - 10, HX1 - HX0, 1, ton(F.sockel, -0.3));
  }
  // Eckbretter
  r(c, HX0, wandO, 2, wandU - wandO, F.rahmen); r(c, HX1 - 2, wandO, 2, wandU - wandO, F.rahmen);
  r(c, HX0 - 1, wandU - 1, HX1 - HX0 + 2, 2, ton(F.wand, -0.35));

  // Dach (Trapez)
  const dachH = 28;
  for (let i = 0; i <= dachH; i++) {
    const y = wandO - i;
    const l = Math.round(32 + i * 20 / dachH), rr = Math.round(128 - i * 20 / dachH);
    r(c, l, y, rr - l, 1, i % 4 === 0 ? F.dach2 : F.dach);
    if (i % 4 === 2) for (let x = l + ((i / 4) % 2 ? 2 : 0); x < rr; x += 5) p(c, x, y, F.dach2);
  }
  r(c, 31, wandO, 98, 2, ton(F.dach, -0.3)); // Traufe
  if (F.muster === 'lebkuchen') for (let x = 32; x < 128; x += 3) { p(c, x, wandO + 2, '#fff8f0'); p(c, x + 1, wandO + 3, '#fff8f0'); }
  if (S.st.fassade === 'trist') { r(c, 58, wandO - 12, 4, 2, ton(F.dach, -0.4)); r(c, 96, wandO - 6, 3, 2, ton(F.dach, -0.4)); }

  // Schornstein
  const ku = wandO - 18, ko = wandO - 38;
  r(c, 98, ko, 9, ku - ko, '#8a4a3a');
  for (let y = ko + 2; y < ku; y += 3) r(c, 98, y, 9, 1, '#6a3428');
  r(c, 97, ko - 1, 11, 2, '#5a3a32');
  // Rauch nur mit Kamin
  if (kamin) {
    for (let i = 0; i < 6; i++) {
      const a = ((t * 0.35 + i / 6) % 1);
      const sx = 102 + Math.sin(a * 6 + i) * 2 + a * 10, sy = ko - 3 - a * 30;
      const gr = 1 + Math.floor(a * 3);
      r(c, sx, sy, gr, gr, mische('#c8ccd4', '#6a6e7a', w.dunkel * 0.6));
    }
  }

  // Schnee auf dem Dach
  if (w.schnee > 0) {
    const rows = Math.round(2 + w.schnee * 3);
    for (let i = 0; i < rows; i++) {
      const y = wandO - dachH + i;
      const l = Math.round(52 - i * 20 / dachH), rr = Math.round(108 + i * 20 / dachH);
      r(c, l, y, rr - l, 1, i === rows - 1 ? '#dfe8f2' : '#f6f9fc');
    }
    for (let x = 32; x < 128; x += 1) if (Z.hash(x * 3) < 0.5 * w.schnee) p(c, x, wandO - 1, '#f6f9fc');
    r(c, 97, ko - 2, 11, 1, '#f6f9fc');
  }

  // Gaube mit Fenster
  const gx0 = 71, gx1 = 89, go = wandO - 20, gu = wandO - 4;
  r(c, gx0, go, gx1 - gx0, gu - go, F.wand);
  for (let i = 0; i < 6; i++) r(c, gx0 - 2 + i, go - i, gx1 - gx0 + 4 - i * 2, 1, F.dach2);
  if (w.schnee > 0) r(c, gx0 + 2, go - 5, gx1 - gx0 - 4, 1, '#f6f9fc');
  fenster(c, 75, go + 4, 10, 10, F, false, w, L, t, 'gaube');

  // Fenster unten
  fenster(c, 48, G - 58, 16, 16, F, kamin, w, L, t, 'links');
  fenster(c, 96, G - 58, 16, 16, F, kamin, w, L, t, 'rechts');

  // Tür
  const tx = 74, to = G - 44;
  r(c, tx - 2, to - 2, 16, 22, F.rahmen);
  if (S.zeigt('tuer')) {
    r(c, tx, to, 12, 20, F.tuer);
    r(c, tx + 1, to + 1, 10, 8, ton(F.tuer, -0.18)); r(c, tx + 1, to + 11, 10, 8, ton(F.tuer, -0.18));
    r(c, tx + 3, to + 2, 6, 5, kamin ? '#e8a048' : '#3a4050');
    if (kamin) L.push({ rect: [tx + 3, to + 2, 6, 5], f: '#ffc870', halo: 6, an: 1 });
    p(c, tx + 10, to + 11, '#e8c030');
  } else {
    r(c, tx, to, 12, 20, '#5b4b3c');
    for (let x = tx + 3; x < tx + 12; x += 3) r(c, x, to, 1, 20, '#4a3c30');
    p(c, tx + 10, to + 11, '#8a8a8a'); r(c, tx + 1, to + 5, 3, 1, '#6a5a4a');
  }
  r(c, 72, G - 24, 16, 2, '#8a8680'); // Stufe

  // Kleine Lampe neben der Haustür - von Anfang an da, nachts an
  const lx = 69, ly = G - 41;
  r(c, lx + 1, ly - 2, 2, 1, '#2a2a30'); r(c, lx + 2, ly - 1, 1, 1, '#2a2a30');
  r(c, lx, ly, 3, 1, '#2a2a30'); r(c, lx, ly + 1, 3, 3, '#f0d890'); r(c, lx, ly + 4, 3, 1, '#2a2a30');
  L.push({ rect: [lx, ly + 1, 3, 3], f: '#ffd070', halo: 11, an: 1 });

  if (S.zeigt('kranz')) {
    const kx = 80, ky = to + 6;
    const g = '#2f6a2a';
    r(c, kx - 3, ky - 3, 6, 1, g); r(c, kx - 3, ky + 2, 6, 1, g); r(c, kx - 4, ky - 2, 1, 4, g); r(c, kx + 3, ky - 2, 1, 4, g);
    p(c, kx - 3, ky - 2, g); p(c, kx + 2, ky - 2, g); p(c, kx - 3, ky + 1, g); p(c, kx + 2, ky + 1, g);
    p(c, kx - 1, ky + 3, '#d83a3a'); p(c, kx, ky + 3, '#d83a3a'); p(c, kx - 2, ky + 4, '#d83a3a'); p(c, kx + 1, ky + 4, '#d83a3a');
    p(c, kx - 2, ky - 3, '#d83a3a'); p(c, kx + 3, ky, '#d83a3a');
  }
  if (S.zeigt('tuerbogenkranz')) winterkranz(c, L, 80, to - 12, t, w, S.stufe('tuerbogenkranz'));
  if (S.zeigt('kal_mistel')) {
    const mx = 80, my = to - 4;
    p(c, mx, my - 2, '#6a4a2a'); r(c, mx - 2, my - 1, 5, 2, '#5a8a3a'); p(c, mx - 1, my + 1, '#f4f4f4'); p(c, mx + 1, my + 1, '#f4f4f4');
  }
  if (S.zeigt('kal_stiefel')) {
    const sx = 77, sy = G - 24;
    r(c, sx, sy - 5, 3, 5, '#c82828'); r(c, sx, sy - 2, 5, 2, '#c82828'); r(c, sx - 1, sy - 6, 5, 1, '#f4f4f4');
    p(c, sx, sy - 7, '#e8c030'); p(c, sx + 2, sy - 8, '#3aa84a');
  }
  if (S.zeigt('holz')) {
    const hx = 113, hy = G - 24;
    for (let row = 0; row < 4; row++) for (let i = 0; i < 3; i++) {
      const x = hx + i * 3 - (row % 2), y = hy - 3 - row * 3;
      r(c, x, y, 3, 3, '#8a5a32'); p(c, x + 1, y + 1, '#c8a070');
    }
    if (w.schnee > 0) r(c, hx - 1, hy - 13, 10, 1, '#f6f9fc');
  }
  if (S.zeigt('nussknacker')) nussknacker(c, 94, G - 24);

  // Lichter am Dach
  if (S.zeigt('lichter_dach')) kette(c, L, 33, 127, wandO + 1, 16, 2, t, 0, S.stufe('lichter_dach'), 'dach');
  if (S.zeigt('eiszapfen')) {
    for (let x = 34, i = 0; x < 127; x += 3, i++) {
      const len = 1 + Math.floor(Z.hash(x) * 3);
      r(c, x, wandO + 2, 1, len, '#cfe6f6');
      L.push({ x, y: wandO + 1 + len, f: '#e6f4ff', halo: 2, an: 0.85 });
    }
  }
  if (S.zeigt('lichter_fenster')) {
    for (const fx of [48, 96]) rahmenLichter(c, L, fx - 2, G - 60, 20, 20, t, S.stufe('lichter_fenster'), 'fenster');
  }
  if (S.zeigt('schornstein')) schornsteinSchmuck(c, L, 98, ko, ku, t, w, S.stufe('schornstein'));
  if (S.zeigt('festbeleuchtung')) festbeleuchtung(c, L, wandO, dachH, gx0, gx1, go, ko, ku, t);
  if (S.zeigt('dach_nikolaus')) nikolausDach(c, 110, wandO - 18, t);
  if (S.zeigt('auf_engel')) engel(c, L, 60, wandO - 28, t);
  if (S.zeigt('lichtershow') && w.dunkel > 0.3) lichtershow(c, L, wandO, wandU, t);
}

function fenster(c, x, y, fw, fh, F, warm, w, L, t, wo) {
  r(c, x - 1, y - 1, fw + 2, fh + 2, F.rahmen);
  if (F.laden && wo !== 'gaube') {
    r(c, x - 5, y - 1, 4, fh + 2, F.laden); r(c, x + fw + 1, y - 1, 4, fh + 2, F.laden);
    for (let yy = y + 1; yy < y + fh; yy += 3) { r(c, x - 4, yy, 2, 1, ton(F.laden, -0.25)); r(c, x + fw + 2, yy, 2, 1, ton(F.laden, -0.25)); }
  }
  if (warm && wo !== 'gaube') {
    // Warmes Licht von drinnen
    r(c, x, y, fw, fh, '#e89a3a');
    r(c, x + 2, y + 2, fw - 4, fh - 4, '#f4b858');
    r(c, x, y, 3, fh, '#b83a2e'); r(c, x + fw - 3, y, 3, fh, '#b83a2e'); // Vorhänge
    if (wo === 'links') {
      // Kamin im Zimmer
      const kx = x + fw / 2 - 4, ky = y + fh - 6;
      r(c, kx, ky, 8, 6, '#6a4a3a'); r(c, kx + 2, ky + 2, 4, 4, '#2a1a14');
      const fl = Math.floor(t * 9) % 3;
      p(c, kx + 3, ky + 3 - (fl === 0 ? 1 : 0), '#ffd040'); p(c, kx + 4, ky + 3 - (fl === 1 ? 1 : 0), '#ff8a20'); r(c, kx + 2, ky + 4, 4, 1, '#ff6a10');
    }
    L.push({ rect: [x, y, fw, fh], f: '#ffc060', halo: 16, an: 0.9 + 0.1 * Math.sin(t * 7) });
  } else {
    r(c, x, y, fw, fh, '#39404e');
    p(c, x + 2, y + 2, '#5a6478'); p(c, x + 3, y + 3, '#5a6478');
  }
  // Sprossen
  r(c, x + Math.floor(fw / 2), y, 1, fh, F.rahmen); r(c, x, y + Math.floor(fh / 2), fw, 1, F.rahmen);
  r(c, x - 2, y + fh + 1, fw + 4, 1, ton(F.rahmen, -0.2)); // Fensterbank
  if (w.schnee > 0 && wo !== 'gaube') r(c, x - 2, y + fh, fw + 4, 1, '#f6f9fc');

  if (wo === 'gaube' && S.zeigt('fensterstern')) {
    const sx = x + fw / 2 - 0.5, sy = y + fh / 2;
    const f = '#fff0a0';
    r(c, sx - 1, sy - 1, 3, 3, f); p(c, sx, sy - 3, f); p(c, sx, sy + 3, f); p(c, sx - 3, sy, f); p(c, sx + 3, sy, f);
    p(c, sx - 2, sy - 2, f); p(c, sx + 2, sy + 2, f); p(c, sx + 2, sy - 2, f); p(c, sx - 2, sy + 2, f);
    L.push({ x: sx, y: sy, f, halo: 9, an: 1, gross: true });
  }
  if (wo === 'links' && S.zeigt('schwibbogen')) {
    const bx = x + 1, by = y + fh - 1;
    r(c, bx, by, fw - 2, 1, '#6a4a2a');
    for (let i = 0; i < 7; i++) {
      const cx = bx + 1 + i * 2, hoch = Math.round(Math.sin((i / 6) * Math.PI) * 3);
      p(c, cx, by - 1 - hoch, '#6a4a2a'); p(c, cx, by - 2 - hoch, '#f4f0e0');
      L.push({ x: cx, y: by - 3 - hoch, f: '#ffd070', halo: 3, an: 0.8 + 0.2 * Math.sin(t * 9 + i) });
    }
  }
  if (wo === 'rechts' && S.zeigt('kal_kranz')) {
    const bx = x + fw / 2, by = y + fh - 1;
    r(c, bx - 5, by - 1, 10, 2, '#2f6a2a'); p(c, bx - 3, by - 1, '#d83a3a'); p(c, bx + 2, by, '#d83a3a');
    const kerzen = Math.max(1, S.st.kalender ? Z.adventKerzen() : 0);
    for (let i = 0; i < 4; i++) {
      const cx = bx - 4 + i * 3;
      r(c, cx, by - 4, 1, 3, '#c82828');
      if (i < kerzen) L.push({ x: cx, y: by - 5, f: '#ffd070', halo: 3, an: 0.8 + 0.2 * Math.sin(t * 10 + i) });
    }
  }
}

/**
 * Lichterketten gibt es in drei Stufen: 1 normal, 2 doppelt so dicht und
 * heller, 3 zusätzlich als LAUFLICHT (eine helle Welle wandert die Kette
 * entlang). Das ist die Geldsenke für die zweite Dezemberhälfte.
 */
/**
 * Helligkeit eines Lichts in einer Kette. Bis Stufe 2 leuchten sie RUHIG;
 * Lauflicht und Pulsieren sind die letzte Kaufstufe (Nutzerwunsch).
 */
export function lichtHell(i, t, stufe) {
  if (stufe >= 3) { const w = (Math.sin(t * 5 - i * 0.45) + 1) / 2; return 0.25 + 0.75 * w * w; }
  return 1;
}
const HALO = [3, 3, 4, 5];

function kette(c, L, x0, x1, y, abstand, durchhang, t, versatz, stufe = 1, art = 'dach') {
  const bunt = S.bunt(art);
  const show = S.zeigt('lichtershow');
  const dicht = stufe >= 2 ? 1 : 2;
  let i = versatz;
  for (let x = x0; x <= x1; x += 2, i++) {
    const phase = ((x - x0) % abstand) / abstand;
    const yy = y + Math.round(Math.sin(phase * Math.PI) * durchhang);
    p(c, x, yy, '#3a3a2a');
    if (i % dicht === 0) {
      let f = bunt ? BUNT[Math.floor(i / dicht) % BUNT.length] : WARM;
      if (show) f = BUNT[Math.floor(t * 3 + x / 12) % BUNT.length];
      p(c, x, yy + 1, f);
      L.push({ x, y: yy + 1, f, halo: HALO[stufe] || 3, an: lichtHell(i, t, stufe) });
    }
  }
}

/**
 * Schornstein-Schmuck: Stufe 1 Tannengrün in zwei Bändern mit roter
 * Schleife, Stufe 2 zusätzlich warme Lichter im Grün.
 */
function schornsteinSchmuck(c, L, x, ko, ku, t, w, stufe) {
  for (const y of [ko + 3, ku - 5]) {
    for (let xx = x - 1; xx < x + 10; xx++) { p(c, xx, y, '#2f6a2a'); p(c, xx, y + 1, xx % 2 ? '#245224' : '#3a7a34'); }
    if (w.schnee > 0) for (let xx = x; xx < x + 9; xx += 2) p(c, xx, y - 1, '#f6f9fc');
  }
  r(c, x + 3, ko + 6, 3, 2, '#d83a3a'); p(c, x + 3, ko + 8, '#b02828'); p(c, x + 5, ko + 8, '#b02828'); p(c, x + 4, ko + 9, '#b02828');
  if (stufe >= 2) {
    const lampen = [[x, ko + 3], [x + 3, ko + 4], [x + 6, ko + 3], [x + 9, ko + 4], [x + 1, ku - 5], [x + 4, ku - 4], [x + 7, ku - 5]];
    const bunt = S.bunt('schornstein');
    lampen.forEach(([lx, ly], i) => { const f = bunt ? BUNT[i % BUNT.length] : WARM; p(c, lx, ly, f); L.push({ x: lx, y: ly, f, halo: 3, an: 1 }); });
  }
}

/**
 * Festbeleuchtung („Schöne Bescherung"): das ganze Dach dicht mit
 * warmweißen Lichtern - in Reihen über die Dachfläche, an beiden
 * Dachkanten, um Gaube und Schornstein. IMMER warmweiß und ruhig: kein
 * Blinken, keine Farbe, auch nicht mit Lichtershow (Nutzerwunsch).
 */
function festbeleuchtung(c, L, wandO, dachH, gx0, gx1, go, ko, ku, t) {
  const f = '#fff2cc';
  const lampe = (x, y) => { p(c, x, y, f); L.push({ x, y, f, halo: 2, an: 1 }); };
  // Reihen über die Dachfläche (Gaube und Schornstein ausgespart)
  for (let d = 4; d < dachH; d += 4) {
    const y = wandO - d;
    const l = Math.round(32 + d * 20 / dachH) + 1, rr = Math.round(128 - d * 20 / dachH) - 1;
    for (let x = l + (d % 8 ? 0 : 1); x < rr; x += 3) {
      if (x >= gx0 - 3 && x <= gx1 + 3 && y >= go - 6) continue;
      if (x >= 95 && x <= 110 && y >= ko - 2 && y <= ku + 1) continue;
      lampe(x, y);
    }
  }
  // Beide Dachkanten und der First
  for (let d = 0; d <= dachH; d += 2) {
    lampe(Math.round(32 + d * 20 / dachH), wandO - d);
    lampe(Math.round(127 - d * 20 / dachH), wandO - d);
  }
  for (let x = 54; x < 107; x += 2) if (x < 96 || x > 108) lampe(x, wandO - dachH - 1);   // nicht über den Schornstein
  // Um die Gaube und den Schornstein
  for (let x = gx0 - 2; x <= gx1 + 2; x += 2) lampe(x, go - 6);
  for (let y = ko + 3; y < ku; y += 3) { lampe(95, y); lampe(109, y); }   // neben dem Schornstein, nicht drauf
}

/**
 * Runder Winterkranz über der Haustür: Tannengrün in zwei Tönen, rote
 * Beeren, Schleife unten. Stufe 2: acht Lichter rundherum (ruhig,
 * warmweiß oder bunt über „Kranzlichter in Bunt"). Ein Mistelzweig aus
 * dem Kalender hängt darunter.
 */
function winterkranz(c, L, cx, cy, t, w, stufe) {
  for (let a = 0; a < 40; a++) {
    const wi = a / 40 * Math.PI * 2;
    for (const rr of [4, 5, 6]) p(c, cx + Math.round(Math.cos(wi) * rr), cy + Math.round(Math.sin(wi) * rr), (a + rr) % 3 ? '#2f6a2a' : '#3f8a3a');
  }
  if (w.schnee > 0) for (let a = 0; a < 7; a++) { const wi = Math.PI * (1.15 + a * 0.12); p(c, cx + Math.round(Math.cos(wi) * 6), cy + Math.round(Math.sin(wi) * 6) - 1, '#f6f9fc'); }
  for (const [bx, by] of [[-5, -2], [4, -4], [5, 2], [-3, 4], [0, -6]]) p(c, cx + bx, cy + by, '#d83a3a');
  // Schleife unten
  r(c, cx - 2, cy + 5, 5, 2, '#c82828'); p(c, cx - 2, cy + 7, '#a82020'); p(c, cx + 2, cy + 7, '#a82020'); p(c, cx, cy + 7, '#c82828');
  if (stufe >= 2) {
    const bunt = S.bunt('kranz');
    for (let i = 0; i < 8; i++) {
      const wi = i / 8 * Math.PI * 2 + 0.2, lx = cx + Math.round(Math.cos(wi) * 5), ly = cy + Math.round(Math.sin(wi) * 5);
      const f = bunt ? BUNT[i % BUNT.length] : WARM;
      p(c, lx, ly, f); L.push({ x: lx, y: ly, f, halo: 3, an: 1 });
    }
  }
}

function rahmenLichter(c, L, x, y, w, h, t, stufe = 1, art = 'fenster') {
  const bunt = S.bunt(art);
  const schritt = stufe >= 2 ? 2 : 3;
  let i = 0;
  const setze = (px, py) => {
    const f = bunt ? BUNT[i % BUNT.length] : WARM;
    p(c, px, py, f);
    L.push({ x: px, y: py, f, halo: HALO[stufe] || 3, an: lichtHell(i, t, stufe) });
    i++;
  };
  for (let xx = x; xx <= x + w; xx += schritt) { setze(xx, y); }
  for (let yy = y + schritt; yy <= y + h; yy += schritt) { setze(x, yy); setze(x + w, yy); }
}

function nussknacker(c, x, fuss) {
  const y = fuss;
  r(c, x - 1, y - 3, 1, 3, '#1a1a1a'); r(c, x + 1, y - 3, 1, 3, '#1a1a1a');
  r(c, x - 2, y - 8, 5, 5, '#c82828'); r(c, x - 2, y - 6, 5, 1, '#e8c030');
  r(c, x - 1, y - 11, 3, 3, '#f2c9a0'); p(c, x, y - 10, '#1a1a1a'); r(c, x - 1, y - 9, 3, 1, '#f4f4f4');
  r(c, x - 2, y - 14, 5, 3, '#1a1a1a'); p(c, x, y - 15, '#e8c030');
}

function nikolausDach(c, x, y, t) {
  const wink = Math.floor(t * 3) % 2;
  r(c, x - 3, y - 6, 6, 6, '#c82828'); r(c, x - 3, y - 1, 6, 1, '#f4f4f4');
  r(c, x - 2, y - 9, 4, 3, '#f2c9a0'); r(c, x - 3, y - 7, 6, 2, '#f4f4f4');
  r(c, x - 2, y - 11, 4, 2, '#c82828'); p(c, x + 2, y - 11, '#f4f4f4');
  r(c, x + 3, y - 7 - wink * 2, 1, 3, '#c82828'); p(c, x + 3, y - 8 - wink * 2, '#f4f4f4');
  r(c, x - 7, y - 4, 4, 5, '#8a6a3a');
}

function lichtershow(c, L, wo, wu, t) {
  // Schneeflocken wandern über die Fassade
  for (let i = 0; i < 9; i++) {
    const x = HX0 + 4 + ((i * 19 + t * 6) % 76), y = wo + 4 + ((i * 11 + t * 4) % (wu - wo - 8));
    const f = '#dff0ff';
    p(c, x, y, f); p(c, x - 1, y, f); p(c, x + 1, y, f); p(c, x, y - 1, f); p(c, x, y + 1, f);
    L.push({ x, y, f, halo: 4, an: 0.5 });
  }
}

// ---------------------------------------------------------------------------
// Garten
// ---------------------------------------------------------------------------
function boden(c, G, w) {
  const schnee = w.schnee > 0;
  // Vorgarten
  r(c, 0, G - 26, 180, 14, schnee ? '#eef3f8' : '#6f6a3e');
  if (schnee) for (let i = 0; i < 30; i++) p(c, Math.floor(Z.hash(i * 17) * 180), G - 26 + Math.floor(Z.hash(i * 23) * 14), '#d4deea');
  else for (let i = 0; i < 40; i++) p(c, Math.floor(Z.hash(i * 17) * 180), G - 26 + Math.floor(Z.hash(i * 23) * 14), ['#8a5a2a', '#a8703a', '#5a5a32', '#7a7040'][i % 4]);
  // Weg zur Tür
  for (let y = G - 22; y < G - 12; y += 3) { r(c, 76, y, 4, 2, schnee ? '#c4ccd6' : '#9a948a'); r(c, 81, y + 1, 3, 2, schnee ? '#c4ccd6' : '#9a948a'); }
  // Gehweg
  r(c, 0, G - 12, 180, 12, schnee ? '#d6dde6' : '#8c8a88');
  for (let x = 0; x < 180; x += 10) r(c, x, G - 12, 1, 12, schnee ? '#c4ccd6' : '#7a7876');
  r(c, 0, G - 12, 180, 1, schnee ? '#f0f4f8' : '#a4a2a0');
  r(c, 0, G - 1, 180, 1, schnee ? '#b8c2ce' : '#6a6866');
  if (schnee) r(c, 0, G - 7, 180, 3, '#c8d0da'); // Trampelpfad
}

function tanne(c, G, w, t, L) {
  const cx = 18, fuss = G - 18;
  r(c, cx - 1, fuss - 4, 3, 4, '#5a3a22');
  const g1 = '#2a5a32', g2 = '#1f4a28';
  const stufen = [[fuss - 4, 13, 12], [fuss - 13, 10, 11], [fuss - 21, 7, 10], [fuss - 28, 4, 8]];
  for (const [unten, halb, hoch] of stufen) {
    for (let i = 0; i < hoch; i++) {
      const bw = Math.round(halb * (i + 1) / hoch);
      r(c, cx - bw, unten - hoch + i, bw * 2 + 1, 1, i % 3 === 2 ? g2 : g1);
    }
    if (w.schnee > 0) { r(c, cx - halb + 1, unten - 1, halb * 2 - 1, 1, '#eef4fa'); p(c, cx, unten - hoch, '#eef4fa'); }
  }
  const spitze = fuss - 36;
  if (S.zeigt('tanne_lichter')) {
    const bunt = S.bunt('tanne');
    const ts = S.stufe('tanne_lichter'), anzahl = 22 * Math.min(2, ts);
    for (let i = 0; i < anzahl; i++) {
      const hy = i / anzahl;
      const y = Math.round(fuss - 6 - hy * 28);
      const breite = 12 * (1 - hy) + 1;
      const x = Math.round(cx + Math.sin(i * 1.9) * breite * 0.8);
      const f = bunt ? BUNT[i % BUNT.length] : WARM;
      p(c, x, y, f);
      L.push({ x, y, f, halo: 2, an: 0.75 * lichtHell(i, t, ts) });   // 44 Lichter auf engem Raum - kleiner Schein, sonst gleißt die Tanne
    }
  }
  if (S.zeigt('tanne_kugeln')) {
    const K = [[-6, 10, '#d83a3a'], [5, 12, '#e8c030'], [-3, 18, '#e8c030'], [4, 20, '#d83a3a'], [-1, 26, '#d83a3a'], [8, 7, '#e8c030'], [-9, 6, '#d83a3a']];
    for (const [dx, dy, f] of K) { r(c, cx + dx, fuss - dy, 2, 2, f); p(c, cx + dx, fuss - dy, ton(f, 0.5)); }
  }
  if (S.zeigt('tanne_stern')) {
    const f = '#ffe060';
    r(c, cx - 1, spitze - 2, 3, 3, f); p(c, cx, spitze - 4, f); p(c, cx - 2, spitze - 1, f); p(c, cx + 2, spitze - 1, f); p(c, cx - 1, spitze + 1, f); p(c, cx + 1, spitze + 1, f);
    L.push({ x: cx, y: spitze - 1, f, halo: 8, an: 0.85 + 0.15 * Math.sin(t * 2), gross: true });
  }
}

function schneefigur(c, x, fuss, groesse, art) {
  const w = '#f6f9fc', s = '#cfd9e8';
  const k = groesse;
  r(c, x - k, fuss - k * 2, k * 2 + 1, k * 2, w); r(c, x - k + 1, fuss - k * 2 - 1, k * 2 - 1, 1, w); r(c, x - k, fuss - 1, k * 2 + 1, 1, s);
  const m = k - 1;
  r(c, x - m, fuss - k * 2 - m * 2 + 1, m * 2 + 1, m * 2 - 1, w);
  const kk = Math.max(2, k - 2);
  const ko = fuss - k * 2 - m * 2 - kk * 2 + 2;
  r(c, x - kk, ko, kk * 2 + 1, kk * 2, w);
  p(c, x - 1, ko + 1, '#1a1a22'); p(c, x + 1, ko + 1, '#1a1a22'); p(c, x + 1, ko + 2, '#f08020'); p(c, x + 2, ko + 2, '#f08020');
  if (art === 'mann') { r(c, x - kk, ko - 3, kk * 2 + 1, 3, '#1a1a22'); r(c, x - kk - 1, ko - 1, kk * 2 + 3, 1, '#1a1a22'); r(c, x - m, ko + kk * 2, m * 2 + 1, 1, '#d83a3a'); }
  if (art === 'frau') { r(c, x - kk, ko - 1, kk * 2 + 1, 1, '#e86aa0'); p(c, x - kk - 1, ko - 1, '#e86aa0'); p(c, x - kk - 1, ko, '#e86aa0'); r(c, x - m, ko + kk * 2, m * 2 + 1, 1, '#e86aa0'); p(c, x, ko + 3, '#e84a6a'); }
  if (art === 'kind') { r(c, x - kk, ko - 1, kk * 2 + 1, 2, '#3a8ad8'); p(c, x, ko - 2, '#ffffff'); }
  // Arme
  const ay = fuss - k * 2 - m;
  p(c, x - m - 1, ay, '#6a4a2a'); p(c, x - m - 2, ay - 1, '#6a4a2a'); p(c, x + m + 1, ay, '#6a4a2a'); p(c, x + m + 2, ay - 1, '#6a4a2a');
  p(c, x, fuss - k * 2 - m, '#1a1a22');
}

/** Vogelhäuschen; `haengend` = an einer Schnur im Baum statt auf einem Pfahl. */
function vogelhaus(c, x, fuss, haengend = false) {
  if (haengend) r(c, x, fuss - 23, 1, 5, '#8a7a5a');   // Schnur zum Ast
  else r(c, x, fuss - 12, 1, 12, '#6a4a2a');
  r(c, x - 3, fuss - 16, 7, 4, '#a8703a'); r(c, x - 4, fuss - 17, 9, 1, '#c82828'); r(c, x - 3, fuss - 18, 7, 1, '#c82828');
  r(c, x - 1, fuss - 15, 2, 2, '#3a2a1a');
  p(c, x + 3, fuss - 13, '#8a5a3a'); p(c, x + 4, fuss - 13, '#e84a2a'); p(c, x + 4, fuss - 14, '#8a5a3a');
}

function lichterRentier(c, L, x, fuss, t) {
  const bunt = S.bunt('rentier'), f = '#fff2c8';
  const pts = [];
  const lin = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) pts.push([Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n)]); };
  // Blick nach links
  lin(x + 2, fuss - 8, x + 11, fuss - 8); lin(x + 2, fuss - 12, x + 11, fuss - 12);
  lin(x + 2, fuss - 8, x + 2, fuss - 12); lin(x + 11, fuss - 8, x + 12, fuss - 13);
  lin(x + 3, fuss - 8, x + 3, fuss); lin(x + 10, fuss - 8, x + 10, fuss);
  lin(x + 2, fuss - 12, x, fuss - 16); lin(x, fuss - 16, x - 3, fuss - 15);
  lin(x, fuss - 16, x - 1, fuss - 20); lin(x - 1, fuss - 20, x - 3, fuss - 22); lin(x, fuss - 19, x + 2, fuss - 22);
  pts.forEach(([px, py], i) => { const fi = bunt ? BUNT[Math.floor(i / 3) % BUNT.length] : f; p(c, px, py, fi); if (i % 2 === 0) L.push({ x: px, y: py, f: fi, halo: 2, an: 0.8 }); });
  p(c, x - 3, fuss - 15, '#ff3030'); L.push({ x: x - 3, y: fuss - 15, f: '#ff3030', halo: 3, an: 1 });
}

function schlitten(c, x, fuss) {
  r(c, x, fuss - 1, 14, 1, '#c8a040'); p(c, x - 1, fuss - 2, '#c8a040'); p(c, x + 14, fuss - 2, '#c8a040');
  r(c, x + 1, fuss - 6, 12, 4, '#c82828'); r(c, x + 11, fuss - 9, 2, 4, '#c82828'); r(c, x + 1, fuss - 6, 12, 1, '#e84a3a');
  r(c, x + 2, fuss - 10, 4, 4, '#3a8ad8'); r(c, x + 3, fuss - 10, 1, 4, '#e8c030');
  r(c, x + 6, fuss - 12, 4, 6, '#3aa84a'); r(c, x + 6, fuss - 10, 4, 1, '#f4f4f4');
  r(c, x + 2, fuss - 8, 3, 2, '#d83a3a');
}

function zaun(c, G, w, L, t) {
  const hoch = G - 18;
  // Hell ist beige, nicht weiß - im Schnee verschwand der weiße Zaun.
  // Holzbraun gibt es im Baumarkt dazu (`zaunfarbe`).
  const braun = S.st.zaunfarbe === 'braun';
  const f = braun ? '#7a5234' : '#e2d5bb', sf = braun ? '#5a3a22' : '#bba98a';
  for (const [x0, x1] of [[0, 71], [89, 126]]) {
    r(c, x0, hoch + 2, x1 - x0, 1, sf); r(c, x0, hoch + 4, x1 - x0, 1, sf);
    for (let x = x0 + 1; x < x1; x += 4) { r(c, x, hoch, 2, 6, f); p(c, x, hoch - 1, f); if (w.schnee > 0) p(c, x, hoch - 1, '#ffffff'); }
  }
  // Tannengirlande: hängt in Bögen am oberen Riegel, rote Schleife an jedem Bogen
  if (S.zeigt('zaun_girlande')) for (const [x0, x1] of [[0, 71], [89, 126]]) {
    for (let x = x0; x < x1; x++) {
      const bogen = Math.round(Math.sin(((x - x0) % 12) / 12 * Math.PI) * 2);
      p(c, x, hoch + 1 + bogen, '#2f6a2a'); p(c, x, hoch + 2 + bogen, x % 2 ? '#245224' : '#3a7a34');
      if (w.schnee > 0 && x % 3 === 0) p(c, x, hoch + bogen, '#f6f9fc');
    }
    for (let x = x0 + 1; x < x1 - 1; x += 12) { r(c, x - 1, hoch, 3, 2, '#d83a3a'); p(c, x - 1, hoch + 2, '#b02828'); p(c, x + 1, hoch + 2, '#b02828'); }
  }
  if (S.zeigt('lichter_zaun')) { const z = S.stufe('lichter_zaun'); kette(c, L, 0, 70, hoch + 2, 12, 2, t, 1, z, 'zaun'); kette(c, L, 90, 126, hoch + 2, 12, 2, t, 1, z, 'zaun'); }
}

// Sammelstücke aus den Tagesaufträgen
function lebkuchenmann(c, x, fuss) {
  const b = '#a8642e', k = '#fff4e6';
  r(c, x - 3, fuss - 16, 6, 5, b); r(c, x - 2, fuss - 17, 4, 1, b);            // Kopf
  r(c, x - 3, fuss - 11, 6, 7, b); r(c, x - 6, fuss - 10, 3, 2, b); r(c, x + 3, fuss - 10, 3, 2, b); // Körper, Arme
  r(c, x - 3, fuss - 4, 2, 4, b); r(c, x + 1, fuss - 4, 2, 4, b);               // Beine
  p(c, x - 1, fuss - 15, '#3a2010'); p(c, x + 1, fuss - 15, '#3a2010'); r(c, x - 1, fuss - 13, 3, 1, k);
  p(c, x, fuss - 10, '#d83a3a'); p(c, x, fuss - 8, '#3aa84a'); p(c, x, fuss - 6, '#d83a3a');
  r(c, x - 6, fuss - 10, 1, 2, k); r(c, x + 5, fuss - 10, 1, 2, k);
}
/** Große Zuckerstange im Vorgarten; `gespiegelt` biegt den Haken nach rechts. */
function zuckerstange(c, x, fuss, gespiegelt) {
  const h = 16, d = gespiegelt ? 1 : -1;
  for (let y = 0; y < h; y++) r(c, x, fuss - y - 1, 2, 1, (y + (gespiegelt ? 1 : 0)) % 4 < 2 ? '#f4f4f4' : '#d83a3a');
  // Haken oben
  const oy = fuss - h;
  r(c, x, oy - 1, 2, 1, '#d83a3a'); r(c, x + d * 2, oy - 2, 2, 1, '#f4f4f4');
  r(c, x + d * 3 + (d < 0 ? 0 : 1), oy - 1, 1, 2, '#d83a3a'); p(c, x + d * 3 + (d < 0 ? 0 : 1), oy + 1, '#f4f4f4');
}

function geschenke(c, x, fuss) {
  r(c, x - 4, fuss - 5, 6, 5, '#d83a3a'); r(c, x - 2, fuss - 5, 1, 5, '#e8c030'); r(c, x - 4, fuss - 3, 6, 1, '#e8c030');
  r(c, x + 2, fuss - 4, 4, 4, '#3a8ad8'); r(c, x + 3, fuss - 4, 1, 4, '#f4f4f4');
  r(c, x - 2, fuss - 9, 5, 4, '#3aa84a'); r(c, x, fuss - 9, 1, 4, '#f4f4f4'); p(c, x - 1, fuss - 10, '#f4f4f4'); p(c, x + 1, fuss - 10, '#f4f4f4');
}
function rodel(c, x, fuss, w) {
  r(c, x, fuss - 12, 1, 12, '#7a4a24'); r(c, x + 5, fuss - 12, 1, 12, '#7a4a24');   // Kufen, hochkant an der Wand
  for (let y = fuss - 11; y < fuss - 1; y += 3) r(c, x + 1, y, 4, 2, '#a8703a');
  p(c, x, fuss - 13, '#7a4a24'); p(c, x + 5, fuss - 13, '#7a4a24');
  if (w.schnee > 0) r(c, x, fuss - 14, 6, 1, '#f6f9fc');
}
function engel(c, L, x, y, t) {
  const f = '#fff6d8', g = '#ffe070';
  r(c, x - 1, y - 7, 3, 3, f); r(c, x - 2, y - 4, 5, 6, f); r(c, x - 3, y + 2, 7, 1, f);
  r(c, x - 5, y - 4, 3, 3, g); r(c, x + 3, y - 4, 3, 3, g);                     // Flügel
  r(c, x - 1, y - 9, 3, 1, g);                                                    // Heiligenschein
  L.push({ x, y: y - 3, f: '#fff0b0', halo: 10, an: 0.8 + 0.2 * Math.sin(t * 2) });
}

/**
 * Die alte Straßenlaterne (Baumarkt), bewusst schlank: Mast 1 px, Kopf
 * 6 × 6 (vorher 8 × 8 mit zweifachem Mast - zu wuchtig neben dem Stand).
 * `mehr` verlängert den Mast.
 */
function alteLaterne(c, L, x, fuss, t, w, mehr = 0) {
  const e = '#2e2c34', h = '#4a4652';
  const k = fuss - mehr;   // alles ab dem Kragen rückt um `mehr` nach oben
  r(c, x - 1, fuss - 3, 3, 3, e);                                          // Sockel
  r(c, x, k - 30, 1, 27 + mehr, e);                                        // Mast
  r(c, x - 1, k - 31, 3, 1, e);                                            // Kragen
  // Laternenkopf: Rahmen, Scheiben, spitzes Dach mit Knauf
  r(c, x - 2, k - 37, 5, 6, e);
  r(c, x - 1, k - 36, 3, 4, '#f2dc98'); r(c, x, k - 36, 1, 4, h);
  r(c, x - 2, k - 38, 5, 1, e); r(c, x - 1, k - 39, 3, 1, e); p(c, x, k - 40, '#c8a040');
  if (w.schnee > 0) r(c, x - 1, k - 39, 3, 1, '#f4f8fb');
  L.push({ rect: [x - 1, k - 36, 3, 4], f: '#ffd88a', halo: 16, an: 1 });
  L.push({ fleck: [x + 0.5, fuss + 8, 24, 7], f: '#ffd88a', an: 1 });   // Gehweg und Straße darunter
}

function laterne(c, L, x, fuss, t) {
  r(c, x, fuss - 18, 1, 18, '#2a2a30'); r(c, x - 1, fuss - 1, 3, 1, '#2a2a30');
  r(c, x - 2, fuss - 23, 5, 5, '#2a2a30'); r(c, x - 1, fuss - 22, 3, 3, '#ffd88a'); r(c, x - 2, fuss - 24, 5, 1, '#2a2a30');
  L.push({ rect: [x - 1, fuss - 22, 3, 3], f: '#ffd88a', halo: 14, an: 1 });
  // Lichtfleck auf Gehweg und Straße, damit sie nachts nicht so dunkel sind
  L.push({ fleck: [x + 0.5, fuss + 9, 20, 7], f: '#ffd88a', an: 1 });
}

function lichterbogen(c, L, G, t) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI * i / 24;
    pts.push([Math.round(80 - Math.cos(a) * 9), Math.round(G - 13 - Math.sin(a) * 20)]);
  }
  pts.forEach(([x, y], i) => {
    p(c, x, y, '#3a3a2a');
    if (i % 2 === 0) {
      const f = S.bunt('bogen') ? BUNT[(i / 2) % BUNT.length] : WARM;
      p(c, x, y, f); L.push({ x, y, f, halo: 3, an: 1 });
    }
  });
  r(c, 70, G - 13, 2, 1, '#3a3a2a'); r(c, 89, G - 13, 2, 1, '#3a3a2a');
}

function goldstern(c, L, t, G) {
  const x = 80, y = G - 112 + Math.round(Math.sin(t * 1.5) * 1.5);
  const f = '#ffe27a';
  r(c, x - 2, y - 2, 5, 5, f); r(c, x, y - 6, 1, 13, f); r(c, x - 6, y, 13, 1, f);
  p(c, x - 3, y - 3, f); p(c, x + 3, y + 3, f); p(c, x + 3, y - 3, f); p(c, x - 3, y + 3, f);
  const s = Math.floor(t * 4) % 4;
  p(c, x - 5 + s, y - 5 + s * 2, '#ffffff');
  L.push({ x, y, f, halo: 16, an: 0.8 + 0.2 * Math.sin(t * 2), gross: true });
}

// ---------------------------------------------------------------------------
// Der Stand (klein, in der Welt)
// ---------------------------------------------------------------------------
function stand(c, G, w, t, L) {
  const x0 = 128, x1 = 176;
  const markise = G - 44;
  // Rückwand und Töpfe
  r(c, x0 + 2, G - 34, x1 - x0 - 4, 12, '#5a3a22');
  for (let i = 0; i < 4; i++) {
    const tx = x0 + 6 + i * 10;
    r(c, tx, G - 27, 7, 5, '#4a4a52'); r(c, tx, G - 27, 7, 1, '#8a1830');
    if (Math.sin(t * 3 + i) > 0) p(c, tx + 3, G - 29 - (Math.floor(t * 2 + i) % 2), '#e8eef4');
  }
  // Wichtel, die schon mitarbeiten, schauen über den Tresen
  const helfer = ['spuel', 'nachfuell', 'servier', 'crepe_w', 'kasse'].filter((id) => S.zeigt(id));
  helfer.forEach((id, i) => wichtelKlein(c, x0 + 10 + i * 8, G - 21, t, i));
  // Pfosten (die Zuckerstangen stehen seit dem 29.09. im Vorgarten)
  for (const px of [x0, x1 - 2]) r(c, px, markise, 2, G - 10 - markise, '#7a5230');
  // Ausbaustufen des Stands: Holzdach, dann Laternen und Grün, dann Stern und Lichter
  const ausbau = S.zeigt('stand') ? S.stufe('stand') : 0;
  if (ausbau >= 1) {
    const hoehe = 13, l0 = x0 - 5, breite = x1 - x0 + 10;
    for (let i = 0; i <= hoehe; i++) {
      const w2 = Math.round(breite * (1 - i / hoehe) / 2);
      const y = markise - 1 - i;
      r(c, x0 + (x1 - x0) / 2 - w2, y, w2 * 2, 1, i % 3 === 0 ? '#5a2e18' : '#7a4424');
    }
    r(c, l0, markise - 1, breite, 1, '#4a2410');
    if (w.schnee > 0) for (let i = hoehe - 3; i <= hoehe; i++) { const w2 = Math.round(breite * (1 - i / hoehe) / 2); r(c, x0 + (x1 - x0) / 2 - w2, markise - 1 - i, w2 * 2, 1, '#f6f9fc'); }
    if (ausbau >= 3) {
      // Lichter auf beiden Dachkanten, als Lauflicht
      for (let i = 0; i <= hoehe; i += 1) {
        const w2 = Math.round(breite * (1 - i / hoehe) / 2), y = markise - 1 - i, k = i;
        for (const x of [x0 + (x1 - x0) / 2 - w2, x0 + (x1 - x0) / 2 + w2 - 1]) {
          const f = S.bunt('stand') ? BUNT[k % BUNT.length] : WARM;
          p(c, x, y, f); L.push({ x, y, f, halo: 3, an: lichtHell(k, t, 3) });
        }
      }
      const sx = x0 + (x1 - x0) / 2, sy = markise - hoehe - 4;
      r(c, sx - 1, sy - 1, 3, 3, '#ffe060'); p(c, sx, sy - 3, '#ffe060'); p(c, sx, sy + 3, '#ffe060'); p(c, sx - 3, sy, '#ffe060'); p(c, sx + 3, sy, '#ffe060');
      L.push({ x: sx, y: sy, f: '#ffe060', halo: 9, an: 0.9 });
    }
  }
  // Markise
  for (let x = x0 - 2; x < x1 + 2; x++) {
    const f = Math.floor((x - x0) / 4) % 2 ? '#f4f0e8' : '#c83030';
    r(c, x, markise, 1, 6, f);
    if ((x - x0) % 4 < 2) p(c, x, markise + 6, f);
  }
  r(c, x0 - 2, markise - 1, x1 - x0 + 4, 1, '#8a2020');
  if (w.schnee > 0) r(c, x0 - 2, markise - 2, x1 - x0 + 4, 1, '#f6f9fc');
  if (ausbau >= 2) {
    // Tannengrün unter dem Dach und zwei Laternen an den Pfosten
    for (let x = x0 - 4; x < x1 + 4; x++) { p(c, x, markise - 1 + (Math.sin(x * 0.9) > 0 ? 1 : 0), '#2f7a3a'); if (x % 5 === 0) p(c, x, markise, '#d83a3a'); }
    for (const lx of [x0 - 3, x1 + 1]) {
      r(c, lx, markise + 1, 3, 1, '#2a2a30'); r(c, lx, markise + 2, 3, 4, '#ffd070'); r(c, lx, markise + 6, 3, 1, '#2a2a30');
      L.push({ rect: [lx, markise + 2, 3, 4], f: '#ffd070', halo: 10, an: 1 });
    }
  }
  if (S.zeigt('girlande')) for (let x = x0 - 1; x < x1 + 1; x++) { p(c, x, markise + 7 + (Math.sin(x * 0.8) > 0 ? 1 : 0), '#2f6a2a'); if (x % 6 === 0) p(c, x, markise + 8, '#d83a3a'); }
  const sls = S.stufe('standlicht');
  if (S.zeigt('standlicht')) for (let x = x0 + 1, i = 0; x < x1; x += (sls >= 2 ? 2 : 4), i++) {
    const f = S.bunt('stand') ? BUNT[i % BUNT.length] : WARM;
    p(c, x, markise + 9, f); L.push({ x, y: markise + 9, f, halo: HALO[sls] || 3, an: lichtHell(i, t, sls) });
  }
  if (S.zeigt('standlicht')) L.push({ rect: [x0 + 2, G - 34, x1 - x0 - 4, 12], f: '#ffb860', halo: 10, an: 0.35 });
  // Tresen
  r(c, x0, G - 22, x1 - x0, 12, '#8a5a32');
  for (let y = G - 19; y < G - 10; y += 3) r(c, x0, y, x1 - x0, 1, '#6a4222');
  r(c, x0 - 1, G - 23, x1 - x0 + 2, 2, '#a8703a');
  if (w.schnee > 0) r(c, x0, G - 24, x1 - x0, 1, '#f6f9fc');
  if (S.zeigt('musik')) {
    r(c, x0 + 2, G - 28, 6, 5, '#3a3a44'); p(c, x0 + 4, G - 26, '#8a8a9a'); p(c, x0 + 6, G - 26, '#8a8a9a');
    const n = (t * 0.8) % 1;
    p(c, x0 + 5 + Math.sin(n * 6) * 2, G - 30 - n * 10, '#ffffff');
  }
  if (S.zeigt('schild')) {
    r(c, x0 + 10, markise - 11, 28, 9, '#6a4222'); r(c, x0 + 11, markise - 10, 26, 7, '#f0e0b0');
    r(c, x0 + 14, markise - 2, 1, 2, '#6a4222'); r(c, x0 + 33, markise - 2, 1, 2, '#6a4222');
    pixText(c, 'PUNSCH', x0 + 12, markise - 9, '#b02020', null);
  }
  if (S.zeigt('heizpilz')) {
    const hx = x0 - 4;   // links neben dem Stand - rechts ging er am Bildrand unter
    r(c, hx, G - 36, 1, 26, '#6a6a72'); r(c, hx - 1, G - 11, 3, 1, '#6a6a72');
    r(c, hx - 3, G - 38, 7, 2, '#8a8a92');
    r(c, hx - 1, G - 36, 3, 2, '#ff7a30');
    L.push({ rect: [hx - 1, G - 36, 3, 2], f: '#ff8a40', halo: 12, an: 0.8 + 0.2 * Math.sin(t * 5) });
  }
}

// ---------------------------------------------------------------------------
// Straße: Gäste
// ---------------------------------------------------------------------------
function strasse(c, G, t) {
  const fuss = G - 3;
  const liste = [...S.lauf.gaeste].sort((a, b) => a.x - b.x);
  for (const g of liste) {
    if (g.x < -10 || g.x > 190) continue;
    figurKlein(c, g, g.x, fuss, t);
  }
  // Gesichter statt Herzen - Herzen (♥) sind die Stimmung des Hauses
  for (const h of S.lauf.herzen) smiley(c, h.x, fuss - 21 - h.t * 12, !h.traurig);
}

// ---------------------------------------------------------------------------
// Wetter
// ---------------------------------------------------------------------------
let letzteZeit = 0;
function wetter(c, G, w, t, dt) {
  const wt = w.wetter;
  if (wt.art === 'schnee') {
    const n = Math.floor(40 + wt.staerke * 100);
    for (let i = 0; i < n; i++) {
      const f = flocken[i];
      f.y += f.v * dt; f.x += Math.sin(t * 1.3 + f.ph) * 6 * dt;
      if (f.y > G) { f.y = -2; f.x = Math.random() * 180; }
      if (f.x < 0) f.x += 180; if (f.x > 180) f.x -= 180;
      r(c, f.x, f.y, f.s, f.s, w.dunkel > 0.5 ? '#d8e0f0' : '#ffffff');
    }
  } else if (wt.art === 'regen') {
    c.fillStyle = w.dunkel > 0.5 ? '#6a7898' : '#9aa8b8';
    const n = Math.floor(30 + wt.staerke * 50);
    for (let i = 0; i < n; i++) {
      const f = flocken[i];
      f.y += f.v * 9 * dt; f.x -= 10 * dt;
      if (f.y > G) { f.y = -4; f.x = Math.random() * 190; }
      if (f.x < 0) f.x += 180;
      c.fillRect(Math.round(f.x), Math.round(f.y), 1, 3);
    }
  }
  if (w.phase === 'herbst') {
    for (const b of blaetter) {
      b.y += b.v * dt; b.x += (Math.sin(t + b.ph) * 8 + 4) * dt;
      if (b.y > G - 4) { b.y = -3; b.x = Math.random() * 180; }
      if (b.x > 180) b.x -= 180;
      p(c, b.x, b.y, b.f); p(c, b.x + (Math.sin(t * 3 + b.ph) > 0 ? 1 : -1), b.y, b.f);
    }
  }
  if (w.silvester) {
    if (Math.random() < dt * 1.5) raketen.push({ x: 20 + Math.random() * 140, y: 30 + Math.random() * 50, t: 0, f: ['#ff5a5a', '#5aff8a', '#ffd040', '#6ab0ff', '#ff6adf'][Math.floor(Math.random() * 5)] });
    for (const rk of raketen) {
      rk.t += dt;
      const rad = rk.t * 22;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        p(c, rk.x + Math.cos(a) * rad, rk.y + Math.sin(a) * rad + rk.t * rk.t * 8, rk.f);
      }
    }
    for (let i = raketen.length - 1; i >= 0; i--) if (raketen[i].t > 1.4) raketen.splice(i, 1);
  }
}

// ---------------------------------------------------------------------------
// Lichter hell auftragen
// ---------------------------------------------------------------------------
function lichter(c, L, dunkel) {
  if (dunkel < 0.05) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  // Laternen werfen einen ovalen Lichtfleck auf Gehweg und Straße
  // (kein Kegel in der Luft - Nutzerwunsch), weich nach außen auslaufend
  for (const l of L) {
    if (!l.fleck) continue;
    const [x, y, rx, ry] = l.fleck, a = l.an * dunkel;
    const g = c.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, hexA(l.f, 0.30 * a)); g.addColorStop(0.55, hexA(l.f, 0.13 * a)); g.addColorStop(1, hexA(l.f, 0));
    c.save(); c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y);
    c.fillStyle = g; c.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    c.restore();
  }
  for (const l of L) {
    if (l.fleck || l.verdeckt) continue;
    const a = l.an * dunkel * (l.sichtbar ?? 1);
    if (a <= 0.02) continue;
    const cx = l.rect ? l.rect[0] + l.rect[2] / 2 : l.x + 0.5;
    const cy = l.rect ? l.rect[1] + l.rect[3] / 2 : l.y + 0.5;
    const grd = c.createRadialGradient(cx, cy, 0, cx, cy, l.halo);
    grd.addColorStop(0, hexA(l.f, 0.45 * a));
    grd.addColorStop(1, hexA(l.f, 0));
    c.fillStyle = grd;
    c.fillRect(cx - l.halo, cy - l.halo, l.halo * 2, l.halo * 2);
  }
  c.restore();
  // Die Birnen selbst in voller Farbe (nicht abgedunkelt). Leuchtflächen
  // wie Fenster werden nur AUFGEHELLT, sonst verschwänden Vorhang und
  // Sprossen unter einer einfarbigen Fläche.
  for (const l of L) {
    if (l.fleck || l.verdeckt || l.an * dunkel < 0.1) continue;
    const a = Math.min(1, 0.4 + l.an * 0.6) * Math.min(1, dunkel * 1.5);
    c.fillStyle = l.f;
    if (l.rect) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = a * 0.55;
      if (l.maske) for (const [mx, my] of l.maske) c.fillRect(mx, my, 1, 1);   // teils verdeckt
      else c.fillRect(l.rect[0], l.rect[1], l.rect[2], l.rect[3]);
      c.globalCompositeOperation = 'source-over';
    } else {
      c.globalAlpha = a;
      c.fillRect(Math.round(l.x), Math.round(l.y), 1, 1);
    }
  }
  c.globalAlpha = 1;
}
function pixel(e, G) { return e.getImageData(0, 0, 180, G).data; }
/**
 * Markiert Lichter, vor denen inzwischen etwas steht. Punktlichter fallen
 * ganz weg; Leuchtflächen (Fenster) behalten nur ihre freien Pixel
 * (`maske`), und ihr Schein wird im selben Verhältnis schwächer.
 */
function verdecke(L, stufen, ende) {
  let von = 0;
  for (const st of stufen) {
    const a = st.bild;
    const gleich = (x, y) => {
      if (x < 0 || x >= 180 || y < 0) return true;
      const i = (y * 180 + x) * 4;
      return a[i] === ende[i] && a[i + 1] === ende[i + 1] && a[i + 2] === ende[i + 2] && a[i + 3] === ende[i + 3];
    };
    for (let k = von; k < st.bis; k++) {
      const l = L[k];
      if (l.fleck) continue;
      if (l.rect) {
        const [rx, ry, rw, rh] = l.rect.map(Math.round);
        const frei = [];
        for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) if (gleich(x, y)) frei.push([x, y]);
        if (!frei.length) l.verdeckt = true;
        else if (frei.length < rw * rh) { l.maske = frei; l.sichtbar = frei.length / (rw * rh); }
      } else if (!gleich(Math.round(l.x), Math.round(l.y))) l.verdeckt = true;
    }
    von = st.bis;
  }
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
}

const STRASSE = 6;   // so viel liegt die Welt über der Tresenkante

/** Fahrbahn zwischen Gehweg und Tresenansicht. */
function fahrbahn(c, GW, G, w) {
  const schnee = w.schnee > 0;
  r(c, 0, GW, 180, G - GW, schnee ? '#b8c2ce' : '#5e5e66');
  r(c, 0, GW, 180, 1, schnee ? '#9aa6b4' : '#48484e');
  for (let x = 4; x < 180; x += 14) r(c, x, GW + 3, 6, 1, schnee ? '#dfe6ee' : '#c8c4b0');
}

// ---------------------------------------------------------------------------
// Wo steht was? Für das Funkeln nach dem Kauf. y relativ zur Bodenlinie.
// ---------------------------------------------------------------------------
const ORTE = {
  kranz: [80, -38], tuerbogenkranz: [80, -55], lichter_dach: [80, -66], fensterstern: [80, -80], schwibbogen: [56, -44],
  lichter_bunt: [80, -66], nussknacker: [94, -32], lichter_fenster: [104, -50], lichter_zaun: [60, -18],
  eiszapfen: [80, -64], dach_nikolaus: [110, -90], lichtershow: [80, -50],
  tanne: [18, -40], tanne_lichter: [18, -40], tanne_kugeln: [18, -35], tanne_stern: [18, -56],
  baum_girlande: [133, -74], schneemann: [45, -26], schneefrau: [55, -26], schneekind: [64, -24],
  rentier_licht: [105, -28], schlitten: [117, -24], lichterbogen: [80, -28],
  girlande: [152, -37], zuckerstangen: [36, -28], standlicht: [152, -35], schild: [152, -54],
  musik: [134, -28], heizpilz: [124, -30], baenke: [152, -20], stand: [152, -50],
  strassenlaterne: [163, -70], zaun_girlande: [60, -17], schornstein: [102, -80], festbeleuchtung: [80, -80], holz: [117, -30], tuer: [80, -34], zaun: [60, -16], kamin: [56, -50],
  laternen: [80, -24], auf_geschenke: [37, -28], auf_lebkuchenmann: [31, -26], auf_rodel: [62, -32], auf_engel: [60, -98], farbe_weiss: [80, -50], farbe_rot: [80, -50], farbe_lebkuchen: [80, -50], farbe_chalet: [80, -50],
};
export function ortVon(id) { const o = ORTE[id]; return o ? { x: o[0], y: o[1] } : null; }
const funken = [];
export function funkeln(x, y) { funken.push({ x, y, t0: performance.now() }); }
function zeichneFunkeln(c, GW) {
  const jetzt = performance.now();
  for (let i = funken.length - 1; i >= 0; i--) {
    const f = funken[i], a = (jetzt - f.t0) / 1600;
    if (a >= 1) { funken.splice(i, 1); continue; }
    const cx = f.x, cy = GW + f.y;
    // Ring, der sich öffnet, und acht Sterne, die nach außen fliegen
    c.strokeStyle = `rgba(255,236,150,${(1 - a).toFixed(2)})`; c.lineWidth = 1;
    c.beginPath(); c.arc(cx + 0.5, cy + 0.5, 3 + a * 22, 0, Math.PI * 2); c.stroke();
    for (let k = 0; k < 8; k++) {
      const w = k / 8 * Math.PI * 2 + a * 2, d = 4 + a * 18;
      const sx = cx + Math.cos(w) * d, sy = cy + Math.sin(w) * d;
      const hell = k % 2 ? '#fff6c8' : '#ffd040';
      if (a < 0.85 || Math.floor(jetzt / 80) % 2) { p(c, sx, sy, hell); p(c, sx - 1, sy, hell); p(c, sx + 1, sy, hell); p(c, sx, sy - 1, hell); p(c, sx, sy + 1, hell); }
    }
  }
}

// ---------------------------------------------------------------------------
// Der Nikolaus fliegt vorbei (selten). Antippen schenkt Sterne.
// ---------------------------------------------------------------------------
/** Wo ist der Schlitten gerade? `sl.y` ist ein Anteil des freien Himmels. */
export function schlittenPos(sl, G) {
  const k = sl.t / sl.dauer;
  return { x: -46 + k * 240, y: 30 + sl.y * Math.max(0, G - 130) + Math.sin(sl.t * 2.2) * 3 };
}
function nikolausSchlitten(c, sl, t, G) {
  const { x, y } = schlittenPos(sl, G);
  const X = Math.round(x), Y = Math.round(y);
  // Glitzerspur
  for (let i = 1; i < 10; i++) {
    const sx = X - i * 4, sy = Y + 3 + Math.round(Math.sin((sl.t - i * 0.07) * 2.2) * 3 - Math.sin(sl.t * 2.2) * 3);
    if ((i + Math.floor(t * 10)) % 3) p(c, sx, sy, i % 2 ? '#fff6c8' : '#ffd040');
  }
  // Schlitten mit Kufe
  r(c, X, Y, 12, 4, '#c82828'); r(c, X, Y, 12, 1, '#e84a3a'); r(c, X + 10, Y - 2, 2, 3, '#c82828');
  r(c, X - 1, Y + 5, 14, 1, '#e8c030'); p(c, X + 13, Y + 4, '#e8c030');
  p(c, X + 2, Y + 4, '#e8c030'); p(c, X + 9, Y + 4, '#e8c030');
  r(c, X + 1, Y - 3, 4, 3, '#3a8ad8'); r(c, X + 2, Y - 4, 2, 1, '#e8c030');   // Geschenk
  // Nikolaus
  r(c, X + 5, Y - 4, 5, 4, '#d83a3a'); r(c, X + 5, Y - 1, 5, 1, '#ffffff');
  r(c, X + 6, Y - 7, 3, 3, '#f2c9a0'); r(c, X + 6, Y - 5, 3, 2, '#ffffff');
  r(c, X + 5, Y - 9, 4, 2, '#d83a3a'); p(c, X + 4, Y - 9, '#ffffff');
  // Zügel und Rentier
  const bein = Math.floor(t * 8) % 2;
  for (let i = 0; i < 8; i++) p(c, X + 12 + i, Y - 1 + Math.round(i / 4), '#8a5a2e');
  const rx = X + 20, ry = Y + 1;
  r(c, rx, ry - 3, 8, 3, '#8a5a2e'); r(c, rx + 7, ry - 6, 3, 3, '#8a5a2e'); p(c, rx + 10, ry - 5, '#e83a2a');
  p(c, rx + 7, ry - 7, '#5a3a1a'); p(c, rx + 6, ry - 8, '#5a3a1a'); p(c, rx + 9, ry - 7, '#5a3a1a'); p(c, rx + 9, ry - 8, '#5a3a1a');
  p(c, rx + 1, ry + bein, '#5a3a1a'); p(c, rx + 2, ry + 1 - bein, '#5a3a1a'); p(c, rx + 6, ry + bein, '#5a3a1a'); p(c, rx + 7, ry + 1 - bein, '#5a3a1a');
  // Einmal angetippt: ein Sternenregen
  if (sl.gefangen != null) for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2 + sl.t, d = 8 + (sl.t - sl.gefangen) * 30;
    if (sl.t - sl.gefangen < 0.8) p(c, X + 8 + Math.cos(a) * d, Y - 2 + Math.sin(a) * d, k % 2 ? '#ffd040' : '#fff6c8');
  }
}

// ---------------------------------------------------------------------------
// Einstieg
// ---------------------------------------------------------------------------
/**
 * Zeichnet die Welt von y = 0 bis G. `opts.ohneGaeste` für die Karte.
 */
export function zeichneWelt(c, G, t, dt, opts = {}) {
  const d = opts.datum || Z.jetzt();
  const w = weltInfo(d);
  const L = [];
  himmel(c, G, w, t);

  const e = ebeneFuer(c.canvas.width, c.canvas.height);
  // Haus und Straße stehen ein Stück über der Tresenkante; darunter
  // liegt die Fahrbahn. GW ist die Bodenlinie der Welt.
  const GW = G - STRASSE;
  hintergrund(e, GW, w, L);
  kahlerBaum(e, GW, w, L, t);
  boden(e, GW, w);
  fahrbahn(e, GW, G, w);
  haus(e, GW, w, t, L);
  // Verdeckung: Alle Lichter werden erst am Ende über das Bild gemalt. Was
  // danach DAVOR gezeichnet wird (Tanne vor der Kirche, Leute vor dem Zaun),
  // würde sonst von ihnen durchleuchtet. Deshalb ein Schnappschuss nach jeder
  // Tiefenstufe; hat sich das Pixel eines Lichts bis zum Schluss verändert,
  // steht etwas davor.
  const pruefen = w.dunkel >= 0.05;   // Lichter sieht man nur bei Dämmerung und Nacht
  const stufen = pruefen ? [{ bis: L.length, bild: pixel(e, G) }] : null;
  // Was an der Hauswand steht (ganz hinten im Garten), kommt zuerst - Tanne,
  // Schneefamilie, Zaun und Laternen stehen davor
  if (S.zeigt('auf_geschenke')) geschenke(e, 37, GW - 24);   // linke Hausecke, zwischen Tanne und Schneemann
  if (S.zeigt('auf_rodel')) rodel(e, 60, GW - 24, w);        // lehnt hinter dem Schneekind, ragt darüber
  if (S.zeigt('tanne')) tanne(e, GW, w, t, L);
  if (S.zeigt('zuckerstangen')) { zuckerstange(e, 33, GW - 19, false); zuckerstange(e, 38, GW - 20, true); }
  // Das Vogelhäuschen hängt im kahlen Baum - im Vorgarten stand es den
  // Zuckerstangen im Weg
  if (S.zeigt('kal_vogel')) vogelhaus(e, 132, GW - 42, true);
  if (S.zeigt('schneemann')) schneefigur(e, 45, GW - 18, 4, 'mann');
  if (S.zeigt('schneefrau')) schneefigur(e, 55, GW - 18, 4, 'frau');
  if (S.zeigt('schneekind')) schneefigur(e, 64, GW - 18, 3, 'kind');
  if (S.zeigt('rentier_licht')) lichterRentier(e, L, 99, GW - 18, t);
  if (S.zeigt('schlitten')) schlitten(e, 111, GW - 18);
  if (S.zeigt('zaun')) zaun(e, GW, w, L, t);
  if (S.zeigt('lichterbogen')) lichterbogen(e, L, GW, t);
  if (S.zeigt('laternen')) { laterne(e, L, 67, GW - 12, t); laterne(e, L, 93, GW - 12, t); }
  if (S.zeigt('auf_lebkuchenmann')) lebkuchenmann(e, 31, GW - 18);
  // Rechts hinter dem Stand, neben dem Baum; der Mast ist lang, damit der
  // Kopf auf halber Dachhöhe über dem Stand steht
  if (S.zeigt('strassenlaterne')) alteLaterne(e, L, 163, GW - 10, t, w, 24);
  stand(e, GW, w, t, L);
  if (pruefen) stufen.push({ bis: L.length, bild: pixel(e, G) });
  if (!opts.ohneGaeste) strasse(e, GW, t);
  if (pruefen) verdecke(L, stufen, pixel(e, G));

  // Nacht und Dämmerung - nur auf dem, was auf der Ebene steht
  if (w.dunkel > 0) {
    e.globalCompositeOperation = 'source-atop';
    e.fillStyle = `rgba(20,26,70,${(0.42 * w.dunkel).toFixed(3)})`;
    e.fillRect(0, 0, e.canvas.width, G);
    if (w.li.daemmer > 0) {
      e.fillStyle = `rgba(255,120,60,${(0.12 * w.li.daemmer).toFixed(3)})`;
      e.fillRect(0, 0, e.canvas.width, G);
    }
    e.globalCompositeOperation = 'source-over';
  }
  // Menschen nachts heller: noch einmal auf eine eigene Ebene, nur halb so
  // stark abgedunkelt, und über die dunkle Welt gelegt (gleiche Pixel)
  if (w.dunkel > 0.05 && !opts.ohneGaeste) {
    const ge = gastEbeneFuer(e.canvas.width, e.canvas.height);
    strasse(ge, GW, t);
    ge.globalCompositeOperation = 'source-atop';
    ge.fillStyle = `rgba(20,26,70,${(0.42 * w.dunkel * 0.45).toFixed(3)})`;
    ge.fillRect(0, 0, ge.canvas.width, G);
    ge.globalCompositeOperation = 'source-over';
    e.drawImage(ge.canvas, 0, 0);
  }
  c.drawImage(ebene, 0, 0, 180, G, 0, 0, 180, G);
  if (S.zeigt('kal_goldstern')) goldstern(c, L, t, GW);
  lichter(c, L, Math.max(w.dunkel, 0.0));
  wetter(c, G, w, t, dt);
  if (!opts.karte) zeichneFunkeln(c, GW);
  if (!opts.karte && S.lauf.schlitten) nikolausSchlitten(c, S.lauf.schlitten, t, G);

  // Fliegende Beträge über den Köpfen
  if (!opts.ohneGaeste && !opts.karte) for (const x of S.lauf.texte) {
    const s = x.text + ' ★';   // die Währung sind Sterne
    pixText(c, s, x.x - 6, GW - 26 - x.t * 14, x.boese ? '#ff5a4a' : x.gross ? '#ffe060' : '#ffffff');
  }
  return w;
}
