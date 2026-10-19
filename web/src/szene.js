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
import { r, p, ton, mische, figurKlein, wichtelKlein, smiley, text as pixText, textBreite } from './pixel.js?v=202610191200';
import * as Z from './zeit.js?v=202610191200';
import * as S from './spiel.js?v=202610191200';
import { FASSADEN } from './config.js?v=202610191200';
import * as C from './config.js?v=202610191200';

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
  // Weicher Verlauf (11.10., gemeldet: „manchmal harte Abstufungen"): jede
  // Zeile ihre eigene Mischfarbe, leicht nach unten gestaucht. Vorher 9 feste
  // Stufen mit Schachbrett am Übergang - bei Dämmerung (lila → orange) sah man
  // jede Stufe als Band.
  for (let y = 0; y <= horizont; y++) {
    const q = Math.pow(y / horizont, 1.15);
    c.fillStyle = mische(oben, unten, q);
    c.fillRect(0, y, 180, 1);
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

function hintergrund(c, G, w, L, t = 0) {
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
      // Lichterwald aus dem Christbaumverkauf (09.10.): eine Kette um jede Tanne
      if (S.zeigt('c_wald')) for (let k = 1; k <= 4; k++) {
        const ly = fuss - Math.round(h * k / 5), lx = x + Math.round(h * 0.34 * k / 5) * (k % 2 ? -1 : 1);
        // Hinter Haus, Stand und Kirche nicht: Lichter werden zuletzt gemalt
        // und schienen sonst durch die Wände
        if (hausVerdeckt(lx, ly, G) || (lx >= 122 && ly > G - 50) || (lx < 24 && ly > hz - 36)) continue;
        const lf = BUNT[(i + k) % BUNT.length];
        p(c, lx, ly, lf); L.push({ x: lx, y: ly, f: lf, halo: 2, an: 0.75 });
      }
    }
  };
  const fest = w.kerzen >= 4;
  const W = ['#efe3cc', '#e6d2b8', '#f4ead8', '#dcc8b0'];
  if (S.zeigt('s_hang')) rodelhang(c, hz, t, schnee);
  reihe(hz - 4, 12, 22, schnee ? '#a8b8c8' : '#7a9a88', '#eef3f8', 11, 6);
  // Links drei Häuschen WEIT hinten: klein, blass, zwischen den Tannenreihen
  const blass = (f) => mische(f, schnee ? '#c4d0dc' : '#9aae9e', 0.35);
  // Kein Fensterlicht (licht 0): Sie stehen hinter Kirche und Haus, und
  // ihre Lichter schwebten sonst als Punkte auf deren Dächern (gleiche
  // Tiefenstufe - die Verdeckungsprüfung sieht das nicht)
  dorfhaus(c, L, 0, hz, 9, 7, blass('#b8554a'), blass(W[0]), schnee, 0, false);
  dorfhaus(c, L, 11, hz - 1, 8, 6, blass('#5a6e9a'), blass(W[1]), schnee, 0, false);
  dorfhaus(c, L, 22, hz, 9, 7, blass('#8a6a3a'), blass(W[3]), schnee, 0, false);
  // Riesenrad vom Weihnachtsmarkt (09.10.): hinter dem Dorf, vor der hinteren Tannenreihe
  if (S.zeigt('m_rad')) riesenrad(c, L, 22, hz - 22, t, w);
  reihe(hz + 2, 14, 26, schnee ? '#7a9488' : '#4f7a5a', '#f4f8fb', 23, 8);
  // Links das Dorf mit der Kirche. Rechts steht nichts mehr (die Häuser dort
  // lugten nur halb über den Stand) - der kahle Baum steht frei.
  dorfhaus(c, L, 24, hz + 7, 10, 8, '#4a8a7a', W[2], schnee, 0.8, fest);
  // Kirche mit Zwiebelturm, ganz links: Der Turm steht neben der Tanne frei
  const kx = 3, kf = hz + 6;
  r(c, kx + 5, kf - 10, 13, 10, '#f0e8dc'); for (let i = 0; i < 7; i++) r(c, kx + 4 + i, kf - 10 - i, 15 - i * 2, 1, '#8a4a3a');
  // Schiff: zwei Rundbogenfenster, abends warm erleuchtet
  // Heiligabend (10.10.): Die Kirche ist hell, im Turm schwingt die Glocke
  const hab = S.heiligabendAbend(w.d);
  for (const fx of [kx + 9, kx + 14]) {
    r(c, fx, kf - 7, 2, 4, '#5a6070'); p(c, fx, kf - 8, '#e0d6c6'); p(c, fx + 1, kf - 8, '#e0d6c6');
    L.push({ rect: [fx, kf - 7, 2, 4], f: '#ffcf70', halo: hab ? 5 : 3, an: hab ? 1 : 0.7 });
  }
  r(c, kx, kf - 26, 7, 26, '#f4ecde'); r(c, kx, kf - 26, 1, 26, '#dcd0c0');
  r(c, kx + 1, kf - 30, 5, 4, '#3f6a5a'); r(c, kx + 2, kf - 32, 3, 2, '#3f6a5a'); p(c, kx + 3, kf - 34, '#3f6a5a'); p(c, kx + 3, kf - 35, '#e8c030');
  if (schnee) r(c, kx + 1, kf - 31, 5, 1, '#f4f8fb');
  r(c, kx + 2, kf - 22, 3, 3, '#e8e0c8'); p(c, kx + 3, kf - 21, '#3a3a3a');   // Uhr
  r(c, kx + 2, kf - 15, 3, 4, '#5a6070');
  L.push({ rect: [kx + 2, kf - 15, 3, 4], f: '#ffd88a', halo: hab ? 6 : 4, an: hab ? 1 : 0.75 });
  if (hab || S.glockeSchwingt()) {
    const sw = Math.round(Math.sin(t * 3));   // Glocke schwingt (Heiligabend und zur vollen Stunde)
    r(c, kx + 2 + (sw > 0 ? 1 : 0), kf - 14, 2, 2, '#c89a2a'); p(c, kx + 3 + sw, kf - 12, '#8a6a1a');
  }
  r(c, kx + 2, kf - 5, 3, 5, '#6a4a32'); p(c, kx + 2, kf - 5, '#f4ecde'); p(c, kx + 4, kf - 5, '#f4ecde');   // Tür
  // An Heiligabend steht die Tür offen, warmes Licht fällt heraus
  if (hab) { r(c, kx + 3, kf - 4, 1, 4, '#ffd070'); L.push({ rect: [kx + 3, kf - 4, 1, 4], f: '#ffd070', halo: 5, an: 0.9 }); }
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
      birne(c, L, px, py, f, HALO[gs] || 3, lichtHell(k, t, gs), birnenForm('baum_girlande'), k);
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
  } else if (F.muster === 'eis') {
    // Eispalast (11.10.): versetzte Eisblöcke mit hellen Kanten, dazu Kristalle, die funkeln
    for (let y = wandO + 5, z = 0; y < wandU; y += 6, z++) {
      r(c, HX0, y, HX1 - HX0, 1, F.wand2); r(c, HX0, y - 1, HX1 - HX0, 1, '#e8f4fc');
      for (let x = HX0 + (z % 2 ? 6 : 0); x < HX1; x += 12) r(c, x, y - 5, 1, 5, F.wand2);
    }
    for (let i = 0; i < 14; i++) {
      const x = HX0 + 4 + Math.floor(Z.hash(i * 13) * 76), y = wandO + 3 + Math.floor(Z.hash(i * 17) * 36);
      const an = Math.sin(t * 2 + i * 1.7) > 0.6;
      p(c, x, y, an ? '#ffffff' : '#e0f0fc'); if (an) { p(c, x - 1, y, '#f4faff'); p(c, x + 1, y, '#f4faff'); p(c, x, y - 1, '#f4faff'); p(c, x, y + 1, '#f4faff'); }
    }
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
    const tv = S.variante('tuer'), tf = [F.tuer, '#a8282a', '#2f6a44'][tv];
    r(c, tx, to, 12, 20, tf);
    r(c, tx + 1, to + 1, 10, 8, ton(tf, -0.18)); r(c, tx + 1, to + 11, 10, 8, ton(tf, -0.18));
    if (tv === 2) {
      // Großes Fenster mit Rundbogen und Sprossen
      r(c, tx + 2, to + 3, 8, 9, kamin ? '#e8a048' : '#3a4050'); r(c, tx + 3, to + 2, 6, 1, kamin ? '#e8a048' : '#3a4050');
      r(c, tx + 6, to + 2, 1, 10, ton(tf, -0.3)); r(c, tx + 2, to + 7, 8, 1, ton(tf, -0.3));
      if (kamin) L.push({ rect: [tx + 2, to + 3, 8, 9], f: '#ffc870', halo: 7, an: 1 });
    } else {
      r(c, tx + 3, to + 2, 6, 5, kamin ? '#e8a048' : '#3a4050');
      if (kamin) L.push({ rect: [tx + 3, to + 2, 6, 5], f: '#ffc870', halo: 6, an: 1 });
    }
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
    // Seit 02.10. ein voller, dicker Ring über fast die ganze Türbreite
    // (10 statt 8 px, zwei Grüntöne). Varianten (09.10.): Stroh, Brezel.
    const kv = S.variante('kranz');
    const [dunkel, hell] = kv === 1 ? ['#b88a30', '#e0b850'] : kv === 2 ? ['#7a4220', '#a8642e'] : ['#245a22', '#3a7e32'];
    const x0 = 75, y0 = to + 2;   // linke obere Ecke des 10x10-Felds
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      const d = Math.hypot(x - 4.5, y - 4.5);
      if (d < 2.3 || d > 5.0) continue;
      p(c, x0 + x, y0 + y, d > 4.2 || (x * 7 + y * 3) % 5 === 0 ? dunkel : hell);
    }
    if (kv === 0) for (const [bx, by] of [[0, 3], [7, 1], [3, 0], [9, 5], [1, 7]]) p(c, x0 + bx, y0 + by, '#e83a3a');
    if (kv === 1) { r(c, x0 + 4, y0 + 3, 2, 4, '#ffe060'); r(c, x0 + 3, y0 + 4, 4, 2, '#ffe060'); }
    if (kv === 2) for (const [bx, by] of [[1, 2], [6, 0], [9, 4], [3, 8], [8, 7], [0, 6]]) p(c, x0 + bx, y0 + by, '#f4f4f4');   // Salz
    if (kv !== 2) {
      const sy = y0 + 8;
      r(c, x0 + 2, sy, 2, 2, '#d02a2a'); r(c, x0 + 6, sy, 2, 2, '#d02a2a'); r(c, x0 + 4, sy, 2, 2, '#a01818');
      p(c, x0 + 3, sy + 2, '#d02a2a'); p(c, x0 + 6, sy + 2, '#d02a2a'); p(c, x0 + 2, sy + 3, '#d02a2a'); p(c, x0 + 7, sy + 3, '#d02a2a');
    }
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
    const hv = S.variante('holz');
    if (hv === 2) {
      // Kleine Hütte: zwei Pfosten und ein Pultdach über dem Stapel
      r(c, hx - 3, hy - 16, 1, 16, '#5a3a22'); r(c, hx + 9, hy - 14, 1, 14, '#5a3a22');
      for (let i = 0; i < 14; i++) r(c, hx - 4 + i, hy - 17 + Math.floor(i / 5), 1, 2, i % 3 ? '#7a4424' : '#5a2e18');
      if (w.schnee > 0) for (let i = 0; i < 14; i++) p(c, hx - 4 + i, hy - 18 + Math.floor(i / 5), '#f6f9fc');
    } else if (w.schnee > 0) r(c, hx - 1, hy - 13, 10, 1, '#f6f9fc');
    if (hv === 1) {
      // Hackklotz mit steckender Axt links daneben
      r(c, hx - 7, hy - 4, 5, 4, '#7a4a28'); r(c, hx - 7, hy - 5, 5, 1, '#c8a070'); p(c, hx - 5, hy - 5, '#a8784a');
      for (let i = 0; i < 5; i++) p(c, hx - 7 + i, hy - 6 - i, '#8a6a42');
      r(c, hx - 8, hy - 7, 3, 2, '#a8acb4'); p(c, hx - 8, hy - 6, '#d8dce4');
      if (w.schnee > 0) r(c, hx - 7, hy - 5, 5, 1, '#f6f9fc');
    }
  }
  if (S.zeigt('nussknacker')) [nussknacker, holzrentier, gartenzwerg][S.variante('nussknacker')](c, 96, G - 24, t);

  // Lichter am Dach
  if (S.zeigt('lichter_dach')) kette(c, L, 33, 127, wandO + 1, 16, 2, t, 0, S.stufe('lichter_dach'), 'dach');
  if (S.zeigt('eiszapfen')) {
    const ev = S.variante('eiszapfen');
    if (ev === 1) {
      // Schneeflocken-Lichter: große Flocken in einer Reihe unter der Traufe
      for (let x = 38, i = 0; x < 126; x += 13, i++) {
        const y = wandO + 5 + (i % 2) * 2, f = '#e6f4ff';
        for (let k = 1; k <= 2; k++) { p(c, x - k, y, f); p(c, x + k, y, f); p(c, x, y - k, f); p(c, x, y + k, f); }
        p(c, x - 1, y - 1, '#b8d8f0'); p(c, x + 1, y + 1, '#b8d8f0'); p(c, x + 1, y - 1, '#b8d8f0'); p(c, x - 1, y + 1, '#b8d8f0');
        p(c, x, y, '#ffffff'); r(c, x, wandO + 2, 1, y - wandO - 4, '#8a8a7a');
        L.push({ x, y, f, halo: 4, an: 0.9 });
      }
    } else if (ev === 2) {
      // Lichtervorhang: lange Schnüre, auf jeder ein paar warme Lichter
      for (let x = 35, i = 0; x < 126; x += 4, i++) {
        const len = 5 + Math.floor(Z.hash(x * 1.3) * 7);
        r(c, x, wandO + 2, 1, len, '#7a7a6a');
        for (let k = 2; k <= len; k += 3) { p(c, x, wandO + 2 + k, '#fff2c8'); L.push({ x, y: wandO + 2 + k, f: '#fff2c8', halo: 2, an: 0.8 }); }
      }
    } else for (let x = 34, i = 0; x < 127; x += 3, i++) {
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
  if (S.zeigt('dach_nikolaus')) {
    const v = S.variante('dach_nikolaus');
    if (v === 1) { dachRentier(c, 108, wandO - 16, t, 0); dachRentier(c, 117, wandO - 10, t, 1); }
    else if (v === 2) steckengeblieben(c, 98, ko, t);
    else nikolausDach(c, 110, wandO - 18, t);
  }
  if (S.zeigt('auf_engel')) engel(c, L, 60, wandO - 28, t);
  if (S.zeigt('h_hahn')) wetterhahn(c, 52, wandO - 28, t);
  if (S.zeigt('l_eich')) dachEichhorn(c, 41, wandO - 10, t);
  if (S.zeigt('g_fahne')) siegerfahne(c, 34, wandO + 2, t);   // linke Hausecke an der Traufe
  if (w.schnee > 0) schneekatze(c, KATZE_X, wandO + KATZE_DY, S.schneekatzeStufe(), S.schneekatzeBereit(), t);
  if (S.zeigt('lichtershow') && w.dunkel > 0.3) lichtershow(c, L, wandO, wandU, t);
}

function fenster(c, x, y, fw, fh, F, warm, w, L, t, wo) {
  r(c, x - 1, y - 1, fw + 2, fh + 2, F.rahmen);
  if (F.laden && wo !== 'gaube') {
    r(c, x - 5, y - 1, 4, fh + 2, F.laden); r(c, x + fw + 1, y - 1, 4, fh + 2, F.laden);
    for (let yy = y + 1; yy < y + fh; yy += 3) { r(c, x - 4, yy, 2, 1, ton(F.laden, -0.25)); r(c, x + fw + 2, yy, 2, 1, ton(F.laden, -0.25)); }
  }
  if (warm && wo !== 'gaube') {
    // Kaminofen: Man sieht ins Zimmer. Links der Kamin selbst (unteres linkes
    // Feld), rechts nur sein Widerschein und ein Weihnachtsbaum im Anschnitt.
    // Vorher war das ganze Fenster grell orange (gemeldet 01.10.: zu hell).
    // Der Schein steht ruhig (11.10., gemeldet: „das rechte Fenster flackert"):
    // Vorher schwankte er mit einer Flacker-Kurve - im rechten Fenster ohne
    // sichtbares Feuer wirkte das wie ein Fehler. Es bewegt sich nur die Flamme.
    const kv = S.variante('kamin');
    if (kv === 2) {
      // Variante Kerzen: in beiden Fenstern ein dreiarmiger Leuchter auf der Bank
      r(c, x, y, fw, fh, '#4e2a20'); r(c, x, y + fh - 2, fw, 2, '#321810');
      const lx = x + Math.floor(fw / 2);
      r(c, lx - 4, y + fh - 4, 9, 1, '#c8a040'); r(c, lx, y + fh - 3, 1, 1, '#c8a040'); r(c, lx - 1, y + fh - 2, 3, 1, '#c8a040');
      for (const dx of [-4, 0, 4]) {
        r(c, lx + dx, y + fh - 8, 1, 4, '#f8f4ea'); p(c, lx + dx, y + fh - 9, '#ffd060'); p(c, lx + dx, y + fh - 10, '#fff0a0');
        L.push({ x: lx + dx, y: y + fh - 9, f: '#ffd060', halo: 5, an: 0.9 });
      }
      L.push({ rect: [x, y, fw, fh], f: '#ffb860', halo: 6, an: 0.16 });
    } else if (wo === 'links' && kv === 1) {
      // Variante Kachelofen: grün gekachelt, mit Ofenbank, das Feuer hinter einem Gitter
      r(c, x, y, fw, fh, '#6e3a26'); r(c, x, y + fh - 2, fw, 2, '#3e2018');
      const kx = x + 1, ky = y + 4;
      r(c, kx, ky, 9, fh - 6, '#3a7a5a');
      for (let yy = ky + 2; yy < ky + fh - 6; yy += 3) r(c, kx, yy, 9, 1, '#2a5a42');
      for (let xx = kx + 3; xx < kx + 9; xx += 3) r(c, xx, ky, 1, fh - 6, '#2a5a42');
      r(c, kx - 1, ky - 1, 11, 1, '#4a8a6a');
      r(c, kx + 3, ky + fh - 11, 3, 3, '#1e100a'); p(c, kx + 4, ky + fh - 10, '#ff8a20');
      r(c, x + 10, y + fh - 5, fw - 10, 2, '#8a5a32');   // Ofenbank
      L.push({ rect: [kx + 3, ky + fh - 11, 3, 3], f: '#ff8a30', halo: 6, an: 0.7 });
      L.push({ rect: [x, y, fw, fh], f: '#ff9a40', halo: 7, an: 0.18 });
    } else if (wo === 'links') {
      r(c, x, y, fw, fh, '#6e3a26');                     // Wand, warm angestrahlt
      r(c, x, y, fw, 4, '#5a2e20');                      // oben dunkler
      r(c, x, y + fh - 2, fw, 2, '#3e2018');             // Boden
      // Kamin im unteren linken Feld: Steinrand, Öffnung, Feuer
      const kx = x + 1, ky = y + 9;
      r(c, kx, ky, 7, 7, '#8a7a6a'); r(c, kx, ky, 7, 1, '#a89888');
      r(c, kx + 1, ky + 2, 5, 5, '#1e100a');
      const h = Math.floor(t * 9) % 3;
      r(c, kx + 2, ky + 5, 3, 1, '#c84a14');                                  // Glut
      p(c, kx + 2, ky + 4, '#ff8a20'); p(c, kx + 4, ky + 4, '#ff8a20');
      p(c, kx + 3, ky + 4 - (h === 0 ? 1 : 0), '#ffb040'); p(c, kx + 3, ky + 3, h === 2 ? '#ff8a20' : '#ffb040');
      // Widerschein auf der Wand daneben
      r(c, x + 8, y + 9, fw - 8, fh - 11, '#7e4428');
      L.push({ rect: [kx + 2, ky + 3, 3, 3], f: '#ff8a30', halo: 9, an: 0.85 });
      L.push({ rect: [x, y, fw, fh], f: '#ff9a40', halo: 7, an: 0.22 });
    } else {
      r(c, x, y, fw, fh, '#4e2a20');                     // weiter weg vom Kamin: dunkler
      r(c, x, y + fh - 2, fw, 2, '#321810');
      // Kleiner Weihnachtsbaum im unteren rechten Feld, rechts angeschnitten
      const bx = x + fw - 3;
      for (let k = 0; k < 7; k++) { const b = 1 + Math.floor(k / 2); r(c, bx - b, y + 8 + k, Math.min(b * 2 + 1, x + fw - (bx - b)), 1, k % 2 ? '#1f5a2e' : '#2a7038'); }   // am Fensterrand abgeschnitten
      r(c, bx, y + 15, 1, 1, '#5a3a22');
      p(c, bx, y + 7, '#ffd84a');                         // Spitze
      for (const [dx, dy, f] of [[-1, 10, '#ffd060'], [1, 12, '#ff6a5a'], [-2, 13, '#ffd060']]) {
        p(c, bx + dx, y + dy, f);
        L.push({ x: bx + dx, y: y + dy, f, halo: 2, an: 0.7 });
      }
      L.push({ rect: [x, y, fw, fh], f: '#ff9a40', halo: 6, an: 0.14 });
    }
    r(c, x, y, 2, fh, '#9a3028'); r(c, x + fw - 2, y, 2, fh, '#9a3028');   // Vorhänge
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
    const v = S.variante('fensterstern');
    if (v === 1) {
      // Komet: heller Kopf oben rechts, Schweif nach links unten
      const f = '#fff0a0';
      r(c, sx + 1, sy - 3, 3, 3, f);
      for (let i = 1; i <= 6; i++) { p(c, sx + 1 - i, sy - 2 + Math.round(i * 0.7), i % 2 ? '#ffd860' : '#fff8d0'); if (i < 4) p(c, sx + 1 - i, sy - 1 + Math.round(i * 0.7), '#e8b040'); }
      L.push({ x: sx + 2, y: sy - 2, f, halo: 8, an: 1, gross: true });
    } else if (v === 2) {
      // Discokugel: silbernes Karomuster, wechselnde bunte Glanzpunkte
      for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) if (Math.hypot(xx, yy) <= 3.3) p(c, sx + xx, sy + yy, (xx + yy + 10) % 2 ? '#c8ccd8' : '#8a8ea0');
      p(c, sx, sy - 5, '#5a5a62'); p(c, sx, sy - 4, '#5a5a62');
      const k = Math.floor(t * 4);
      for (let i = 0; i < 3; i++) { const f = BUNT[(k + i) % BUNT.length]; const px = sx - 2 + ((k + i * 3) % 5), py = sy - 2 + ((k * 2 + i) % 5); p(c, px, py, f); L.push({ x: px, y: py, f, halo: 4, an: 1 }); }
    } else {
      const f = '#fff0a0';
      r(c, sx - 1, sy - 1, 3, 3, f); p(c, sx, sy - 3, f); p(c, sx, sy + 3, f); p(c, sx - 3, sy, f); p(c, sx + 3, sy, f);
      p(c, sx - 2, sy - 2, f); p(c, sx + 2, sy + 2, f); p(c, sx + 2, sy - 2, f); p(c, sx - 2, sy + 2, f);
      L.push({ x: sx, y: sy, f, halo: 9, an: 1, gross: true });
    }
  }
  if (wo === 'links' && S.zeigt('schwibbogen')) {
    const bx = x + 1, by = y + fh - 1;
    const v = S.variante('schwibbogen');
    if (v === 1) {
      // Lichterpyramide: drei Etagen, oben dreht sich das Flügelrad
      const mx = x + Math.floor(fw / 2);
      for (let e = 0; e < 3; e++) { const b = 6 - e * 2, yy = by - e * 3; r(c, mx - b, yy, b * 2 + 1, 1, '#8a5a32'); p(c, mx - b + 1, yy - 1, '#c8a060'); p(c, mx + b - 1, yy - 1, '#c8a060'); }
      r(c, mx, by - 10, 1, 10, '#6a4a2a');
      const fl = Math.floor(t * 6) % 2;
      r(c, mx - 3 + fl, by - 11, 3, 1, '#e8c030'); r(c, mx + 1 - fl, by - 11, 3, 1, '#e8c030');
      for (const [dx, dy] of [[-5, 0], [5, 0], [-3, -3], [3, -3]]) { r(c, mx + dx, by + dy - 2, 1, 2, '#f4f0e0'); L.push({ x: mx + dx, y: by + dy - 3, f: '#ffd070', halo: 3, an: 0.8 + 0.2 * Math.sin(t * 9 + dx) }); }
    } else if (v === 2) {
      // Fensterkatze mit Mütze, blinzelt ab und zu
      const kx = x + 5, ky = by;
      r(c, kx, ky - 6, 6, 6, '#3a3a44'); r(c, kx + 1, ky - 10, 4, 4, '#3a3a44');
      p(c, kx + 1, ky - 11, '#3a3a44'); p(c, kx + 4, ky - 11, '#3a3a44');
      const zu = Math.floor(t * 0.7) % 4 === 0 && (t % 1.43) < 0.2;
      p(c, kx + 2, ky - 8, zu ? '#3a3a44' : '#e8d040'); p(c, kx + 3, ky - 8, zu ? '#3a3a44' : '#e8d040');
      r(c, kx + 6, ky - 2, 2, 1, '#3a3a44'); p(c, kx + 7, ky - 3 - (Math.floor(t * 2) % 2), '#3a3a44');   // Schwanz
      r(c, kx + 1, ky - 12, 4, 2, '#d83a3a'); p(c, kx + 4, ky - 13, '#d83a3a'); p(c, kx + 5, ky - 13, '#f4f4f4');   // Mütze
      L.push({ x: kx + 2, y: ky - 8, f: '#e8d040', halo: 2, an: zu ? 0 : 0.7 });
    } else {
      r(c, bx, by, fw - 2, 1, '#6a4a2a');
      for (let i = 0; i < 7; i++) {
        const cx = bx + 1 + i * 2, hoch = Math.round(Math.sin((i / 6) * Math.PI) * 3);
        p(c, cx, by - 1 - hoch, '#6a4a2a'); p(c, cx, by - 2 - hoch, '#f4f0e0');
        L.push({ x: cx, y: by - 3 - hoch, f: '#ffd070', halo: 3, an: 0.8 + 0.2 * Math.sin(t * 9 + i) });
      }
    }
  }
  if (wo === 'rechts') { const bz = S.barbaraZustand(); if (bz) barbaraZweig(c, x + 1, y + fh, bz, L, t); }
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

// ---------------------------------------------------------------------------
// Briefkasten (10.10.) neben der Tür: Fahne hoch und ein Umschlag, wenn ein
// Wunschzettel oder ein Dankesbild darin liegt.
// ---------------------------------------------------------------------------
function briefkasten(c, x, y, t, L) {
  r(c, x, y, 7, 5, '#c8322e'); r(c, x, y, 7, 1, '#e85a4a'); r(c, x, y + 4, 7, 1, '#8a2020');
  r(c, x + 1, y + 1, 5, 1, '#3a1a18');   // Schlitz
  if (S.briefDa()) {
    const hop = Math.floor(t * 2) % 2;
    r(c, x + 1, y - 2 - hop, 5, 3, '#fbf6ea'); p(c, x + 3, y - 1 - hop, '#c8322e');   // Umschlag mit Siegel
    r(c, x + 7, y - 4, 1, 5, '#5a5a62'); r(c, x + 8, y - 4, 2, 2, '#ffd040');          // Fahne oben
    // Nachts sähe man den Brief sonst nicht: Fahne und Umschlag leuchten leicht
    L.push({ x: x + 9, y: y - 3, f: '#ffd040', halo: 4, an: 0.7 + 0.3 * Math.sin(t * 3) });
    L.push({ rect: [x + 1, y - 2 - hop, 5, 2], f: '#fff8e8', halo: 3, an: 0.5 });
  } else r(c, x + 7, y + 1, 3, 1, '#5a5a62');                                          // Fahne unten
}

// ---------------------------------------------------------------------------
// Barbarazweig (10.10.): Kirschzweig in einer Vase, links im rechten Fenster
// ---------------------------------------------------------------------------
// Koordinaten relativ zur Vase (Fuß links unten). Die Knospen schwellen mit
// dem Advent, an Heiligabend gehen die Blüten auf. Im 16-px-Fenster sind
// es höchstens sechs Büschel - einzelne Pixel lasen sich als Schachbrett.
const ZWEIG_AESTE = [
  [[1, -4], [1, -14]], [[1, -8], [4, -11], [5, -13]], [[1, -11], [3, -13]], [[1, -6], [3, -7]],
];
// Büschel in der Reihenfolge, in der sie dazukommen (Spitzen zuerst)
const ZWEIG_BLUETEN = [[1, -15], [5, -14], [3, -14], [4, -11], [3, -8], [2, -10]];
export function barbaraZweig(c, x0, fuss, z, L, t) {
  // Vase: Glas mit Wasser
  r(c, x0, fuss - 4, 3, 4, '#a8c8d8'); r(c, x0, fuss - 2, 3, 2, '#6a98b8'); p(c, x0, fuss - 4, '#e0f0f8');
  const ast = '#4a2e22';
  for (const zweig of ZWEIG_AESTE) for (let i = 1; i < zweig.length; i++) {
    const [ax, ay] = zweig[i - 1], [bx, by] = zweig[i];
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let k = 0; k <= n; k++) p(c, x0 + Math.round(ax + (bx - ax) * k / n), fuss + Math.round(ay + (by - ay) * k / n), ast);
  }
  // Wie viele Büschel: 24 Blüten = alle sechs, wenige Blüten = eins
  const n = z.blueten > 0 ? Math.max(1, Math.round(z.blueten / 4)) : 0;
  for (let i = 0; i < Math.min(n, ZWEIG_BLUETEN.length); i++) {
    const [bx, by] = ZWEIG_BLUETEN[i], px = x0 + bx, py = fuss + by;
    if (z.bluehen) {
      // Kirschblüte: weiß mit rosa Herz
      p(c, px, py, '#ffffff'); p(c, px + 1, py, '#fff0f4'); p(c, px, py + 1, '#fff0f4'); p(c, px + 1, py + 1, '#f4a0b8');
    } else {
      // Knospen: erst klein und grün, kurz vor Heiligabend mit weißer Spitze
      p(c, px, py + 1, z.wachs > 0.4 ? '#8ab060' : '#6a8a4a');
      if (z.wachs > 0.7) p(c, px, py, '#f0e4e8');
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

/**
 * Eine Lichterbirne in der Form der gewählten Variante (11.10.: Varianten für
 * alle Lichter): 0 Lichterkette (ein Punkt), 1 Sterne (kleines Kreuz),
 * 2 Retro-Kugeln (Fassung und dicke Birne). Die großen Formen brauchen Platz -
 * sie nehmen nur jede zweite Stelle (`i`).
 */
function birne(c, L, x, y, f, halo, an, form, i) {
  if (form && i % 2) return;
  if (form === 1) {
    p(c, x, y, ton(f, 0.55)); p(c, x - 1, y, f); p(c, x + 1, y, f); p(c, x, y - 1, f); p(c, x, y + 1, f);
    L.push({ x, y, f, halo: halo + 1, an });
  } else if (form === 2) {
    p(c, x, y, '#3a3a2a'); r(c, x, y + 1, 2, 2, f); p(c, x, y + 1, ton(f, 0.55));
    L.push({ x, y: y + 1, f, halo: halo + 1, an });
  } else { p(c, x, y, f); L.push({ x, y, f, halo, an }); }
}
const birnenForm = (id) => (C.VARIANTEN[id] ? S.variante(id) : 0);

function kette(c, L, x0, x1, y, abstand, durchhang, t, versatz, stufe = 1, art = 'dach', id = 'lichter_dach') {
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
      birne(c, L, x, yy + 1, f, HALO[stufe] || 3, lichtHell(i, t, stufe), birnenForm(id), Math.floor(i / dicht));
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
    lampen.forEach(([lx, ly], i) => { const f = bunt ? BUNT[i % BUNT.length] : WARM; birne(c, L, lx, ly, f, 3, 1, birnenForm('schornstein'), i); });
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
      birne(c, L, lx, ly, f, 3, 1, birnenForm('tuerbogenkranz'), i);
    }
  }
}

function rahmenLichter(c, L, x, y, w, h, t, stufe = 1, art = 'fenster') {
  const bunt = S.bunt(art), form = birnenForm('lichter_fenster');
  const schritt = stufe >= 2 ? 2 : 3;
  let i = 0;
  const setze = (px, py) => {
    const f = bunt ? BUNT[i % BUNT.length] : WARM;
    birne(c, L, px, py, f, HALO[stufe] || 3, lichtHell(i, t, stufe), form, i);
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

/** Kufen und Hufe quer über den verschneiten Gehweg (12.10.; im Vorgarten
 *  verschwanden sie hinter Zaun und Deko). Liegt direkt auf dem Boden. */
function rentierspuren(c, G) {
  const k = '#8a98b0', h = '#7a88a2';
  for (let x = 0; x < 180; x++) {
    const y = G - 10 + Math.round(Math.sin(x / 23));
    p(c, x, y, k); p(c, x, y + 3, k);                                  // zwei Kufen
    if (x % 7 === 0) { p(c, x + 22, y - 1 + (x % 14 ? 0 : 1), h); p(c, x + 23, y + 4 - (x % 14 ? 0 : 1), h); }   // Hufe davor, im Wechsel
  }
}

// ---------------------------------------------------------------------------
// Deko von der Schneeballwiese (12.10.)
// ---------------------------------------------------------------------------
/** Pyramide aus sechs Schneebällen auf dem Gehweg. */
function schneeballVorrat(c, x, fuss) {
  r(c, x - 6, fuss, 13, 1, '#9aa8bc');   // Schatten
  for (const [dx, dy] of [[-4, 0], [0, 0], [4, 0], [-2, -3], [2, -3], [0, -6]]) {
    const bx = x + dx, by = fuss + dy;
    r(c, bx - 1, by - 3, 3, 3, '#ffffff'); r(c, bx - 2, by - 2, 1, 1, '#8a9ab0'); r(c, bx + 2, by - 2, 1, 2, '#8a9ab0');
    p(c, bx - 1, by - 4, '#8a9ab0'); p(c, bx, by - 4, '#8a9ab0'); p(c, bx + 1, by - 4, '#8a9ab0'); p(c, bx + 1, by - 1, '#b4c2d4');
  }
}
/** Ein kleiner Grummel lugt an der linken Hausecke hervor und zieht ab und zu den Kopf ein. */
function grummelLauscher(c, G, t) {
  const weg = (t % 9) > 7.6 ? 2 : 0, x = HX0 - 4 + weg, y = G - 46;
  r(c, x, y, 5, 5, '#7cbc44'); r(c, x, y + 4, 5, 1, '#5a9a30');
  p(c, x + 1, y + 1, '#f0e040'); p(c, x + 1, y + 2, '#1a1a1a'); r(c, x + 1, y + 3, 2, 1, '#2a4a14');
  r(c, x, y - 2, 5, 2, '#c82828'); p(c, x - 1, y - 1, '#c82828'); p(c, x - 2, y, '#ffffff');
  r(c, x + 3, y + 6, 2, 2, '#5a9a30');   // Hand an der Ecke
}
/**
 * Grüne Siegerfahne mit Schneeball (18.10.: an der linken Hausecke, Fahne weht nach
 * links - vorher am Stand und dort vor dem Futterhaus). x = Stange, fuss = unten.
 */
function siegerfahne(c, x, fuss, t) {
  const hoch = 14;   // 19.10.: kleiner und kürzer (Stange 22 → 14, Tuch 8x5 → 6x4)
  r(c, x, fuss - hoch, 1, hoch + 1, '#7a5230'); p(c, x, fuss - hoch - 1, '#e8c030');
  const wehen = Math.floor(t * 3) % 2;
  for (let i = 0; i < 6; i++) r(c, x - 1 - i, fuss - hoch + ((i + wehen) % 3 === 0 ? 1 : 0), 1, 4, i % 2 ? '#3a8a3a' : '#2f7a30');
  r(c, x - 4, fuss - hoch + 1, 2, 2, '#ffffff');
}

function tanne(c, G, w, t, L) {
  const v = S.variante('tanne');
  if (v === 2) return palme(c, G, w, t, L);
  const sk = v === 1 ? 1.3 : 1;   // Riesentanne: ein Drittel größer
  const cx = 18, fuss = G - 18;
  r(c, cx - 1, fuss - 4, 3, 4, '#5a3a22');
  const g1 = '#2a5a32', g2 = '#1f4a28';
  const stufen = [[4, 13, 12], [13, 10, 11], [21, 7, 10], [28, 4, 8]].map(([u, h, ho]) => [fuss - Math.round(u * sk), Math.round(h * sk), Math.round(ho * sk)]);
  for (const [unten, halb, hoch] of stufen) {
    for (let i = 0; i < hoch; i++) {
      const bw = Math.round(halb * (i + 1) / hoch);
      r(c, cx - bw, unten - hoch + i, bw * 2 + 1, 1, i % 3 === 2 ? g2 : g1);
    }
    if (w.schnee > 0) { r(c, cx - halb + 1, unten - 1, halb * 2 - 1, 1, '#eef4fa'); p(c, cx, unten - hoch, '#eef4fa'); }
  }
  const spitze = fuss - Math.round(36 * sk);
  if (S.zeigt('tanne_lichter')) {
    const bunt = S.bunt('tanne');
    const ts = S.stufe('tanne_lichter'), anzahl = Math.round(22 * Math.min(2, ts) * sk);
    for (let i = 0; i < anzahl; i++) {
      const hy = i / anzahl;
      const y = Math.round(fuss - 6 * sk - hy * 28 * sk);
      const breite = (12 * (1 - hy) + 1) * sk;
      const x = Math.round(cx + Math.sin(i * 1.9) * breite * 0.8);
      const f = bunt ? BUNT[i % BUNT.length] : WARM;
      birne(c, L, x, y, f, 2, 0.75 * lichtHell(i, t, ts), birnenForm('tanne_lichter'), i);   // 44 Lichter auf engem Raum - kleiner Schein, sonst gleißt die Tanne
    }
  }
  if (S.zeigt('tanne_kugeln')) {
    const K = [[-6, 10, '#d83a3a'], [5, 12, '#e8c030'], [-3, 18, '#e8c030'], [4, 20, '#d83a3a'], [-1, 26, '#d83a3a'], [8, 7, '#e8c030'], [-9, 6, '#d83a3a']];
    const kv = S.variante('tanne_kugeln');
    for (const [dx, dy, f0] of K) {
      const kx = cx + Math.round(dx * sk), ky = fuss - Math.round(dy * sk);
      if (kv === 2) { const g = '#e8c060'; p(c, kx, ky - 1, g); p(c, kx - 1, ky, g); p(c, kx + 1, ky, g); p(c, kx, ky + 1, g); p(c, kx, ky, '#fff0b0'); continue; }   // Strohsterne
      const f = kv === 1 ? (f0 === '#d83a3a' ? '#3a6ad0' : '#c8d0dc') : f0;
      r(c, kx, ky, 2, 2, f); p(c, kx, ky, ton(f, 0.5));
    }
  }
  if (S.zeigt('tanne_stern')) tannenStern(c, L, cx, spitze, t);
}
function tannenStern(c, L, cx, spitze, t) {
  const sv = S.variante('tanne_stern');
  if (sv === 1) {
    // Engel: weißes Kleid, goldene Flügel, Heiligenschein
    for (let i = 0; i < 5; i++) r(c, cx - Math.floor(i / 2), spitze - 4 + i, Math.floor(i / 2) * 2 + 1, 1, '#f8f4ec');
    r(c, cx - 3, spitze - 3, 2, 2, '#e8c040'); r(c, cx + 2, spitze - 3, 2, 2, '#e8c040');
    p(c, cx, spitze - 6, '#f2c9a0'); r(c, cx - 1, spitze - 8, 3, 1, '#ffe060');
    L.push({ x: cx, y: spitze - 7, f: '#ffe060', halo: 6, an: 0.9, gross: true });
    return;
  }
  if (sv === 2) {
    // Gläserne Spitze: silberne Kugel mit langer Spitze
    r(c, cx - 1, spitze - 2, 3, 3, '#c8d0dc'); p(c, cx - 1, spitze - 2, '#ffffff');
    r(c, cx, spitze - 8, 1, 6, '#dfe6ee'); p(c, cx, spitze - 9, '#ffffff'); p(c, cx, spitze - 4, '#e83a3a');
    L.push({ x: cx, y: spitze - 6, f: '#e8f0ff', halo: 4, an: 0.7 });
    return;
  }
  const f = '#ffe060';
  r(c, cx - 1, spitze - 2, 3, 3, f); p(c, cx, spitze - 4, f); p(c, cx - 2, spitze - 1, f); p(c, cx + 2, spitze - 1, f); p(c, cx - 1, spitze + 1, f); p(c, cx + 1, spitze + 1, f);
  L.push({ x: cx, y: spitze - 1, f, halo: 8, an: 0.85 + 0.15 * Math.sin(t * 2), gross: true });
}
/** Variante 3 der Tanne: eine Palme. Lichter, Kugeln und Stern ziehen mit. */
function palme(c, G, w, t, L) {
  const cx = 18, fuss = G - 18, hoch = 30;
  // Stamm: leicht gebogen, mit Ringen
  const stamm = [];
  for (let i = 0; i < hoch; i++) {
    const x = Math.round(cx + Math.sin(i / hoch * 1.6) * 3);
    stamm.push([x, fuss - i]);
    r(c, x - 1, fuss - i, 3, 1, i % 3 === 0 ? '#6a4626' : '#8a5e34');
  }
  const [kx, ky] = stamm[hoch - 1];
  // Wedel: sechs Bögen, die nach außen hängen
  const wedel = [[-1, -0.35], [1, -0.35], [-1, 0.25], [1, 0.25], [-0.6, -0.9], [0.6, -0.9]];
  const spitzen = [];
  for (const [rx, ry] of wedel) {
    for (let i = 0; i <= 12; i++) {
      const x = Math.round(kx + rx * i * (ry < -0.5 ? 0.6 : 1));
      const y = Math.round(ky + ry * i * 0.6 + (i * i) * 0.045 * (ry < -0.5 ? 0.3 : 1));
      r(c, x, y, 1, 2, i % 2 ? '#2f7a3a' : '#3a9a46');
      if (i % 3 === 1) { p(c, x, y + 2, '#256a30'); }
      if (w.schnee > 0 && i % 2 === 0) p(c, x, y - 1, '#eef4fa');
      if (i === 12) spitzen.push([x, y]);
    }
  }
  if (S.zeigt('tanne_lichter')) {
    const bunt = S.bunt('tanne'), ts = S.stufe('tanne_lichter');
    const pkt = [];
    stamm.forEach(([x, y], i) => { if (i % 3 === 1) pkt.push([x + (i % 6 < 3 ? -2 : 2), y]); });
    for (const [rx, ry] of wedel) for (let i = 2; i <= 12; i += 2 + (ts >= 2 ? 0 : 1)) pkt.push([Math.round(kx + rx * i * (ry < -0.5 ? 0.6 : 1)), Math.round(ky + ry * i * 0.6 + i * i * 0.045 * (ry < -0.5 ? 0.3 : 1)) + 1]);
    pkt.forEach(([x, y], i) => { const f = bunt ? BUNT[i % BUNT.length] : WARM; birne(c, L, x, y, f, 2, 0.75 * lichtHell(i, t, ts), birnenForm('tanne_lichter'), i); });
  }
  if (S.zeigt('tanne_kugeln')) {
    // Kokosnüsse unter der Krone - weihnachtlich bemalt
    for (const [dx, f] of [[-2, '#d83a3a'], [1, '#e8c030'], [3, '#d83a3a']]) { r(c, kx + dx, ky + 2, 2, 2, f); p(c, kx + dx, ky + 2, ton(f, 0.5)); }
  }
  if (S.zeigt('tanne_stern')) tannenStern(c, L, kx, ky - 6, t);
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

/** Varianten der Schneefrau (11.10.): Schirm bzw. Krone und hellblauer Schal. */
function schneefrauExtra(c, x, fuss, v) {
  const k = 4, m = k - 1, kk = Math.max(2, k - 2), ko = fuss - k * 2 - m * 2 - kk * 2 + 2;
  if (v === 1) {
    for (let i = -6; i <= 6; i++) { const y = ko - 6 + Math.round(i * i / 12); p(c, x + 5 + i, y, i % 3 ? '#d83a3a' : '#a82828'); if (Math.abs(i) < 6) p(c, x + 5 + i, y + 1, '#c82828'); }
    r(c, x + 5, ko - 6, 1, 13, '#5a3a22'); p(c, x + 4, ko + 7, '#5a3a22');
  } else if (v === 2) {
    r(c, x - kk, ko - 1, kk * 2 + 1, 1, '#e8c040'); p(c, x - kk, ko - 2, '#e8c040'); p(c, x, ko - 3, '#e8c040'); p(c, x, ko - 2, '#e8c040'); p(c, x + kk, ko - 2, '#e8c040'); p(c, x, ko - 2, '#7ad8ff');
    r(c, x - m, ko + kk * 2, m * 2 + 1, 1, '#8ad0f0'); p(c, x + m, ko + kk * 2 + 1, '#8ad0f0'); p(c, x + m, ko + kk * 2 + 2, '#8ad0f0');
  }
}
/** Varianten des Schneekinds (11.10.): mit Laterne bzw. mit Schlitten. */
function schneekindExtra(c, L, x, fuss, v, t) {
  if (v === 1) {
    r(c, x + 4, fuss - 8, 1, 3, '#5a3a22'); r(c, x + 3, fuss - 5, 3, 1, '#2a2a30'); r(c, x + 3, fuss - 4, 3, 3, '#ffd070'); r(c, x + 3, fuss - 1, 3, 1, '#2a2a30');
    L.push({ rect: [x + 3, fuss - 4, 3, 3], f: '#ffd070', halo: 7, an: 0.95 });
  } else if (v === 2) {
    r(c, x - 11, fuss - 3, 7, 1, '#a8703a'); r(c, x - 11, fuss - 2, 1, 1, '#6a4222'); r(c, x - 5, fuss - 2, 1, 1, '#6a4222');
    r(c, x - 12, fuss - 1, 9, 1, '#6a4222'); p(c, x - 12, fuss - 2, '#6a4222'); for (let i = 0; i < 4; i++) p(c, x - 4 + i, fuss - 4 - Math.round(i * 0.5), '#c83a32');
  }
}
/** Großer Lebkuchenmann mit Zuckerguss auf einem Stab (Variante der Zuckerstangen). */
function lebkuchenmaennchen(c, x, fuss) {
  const f = '#b8733a', g = '#fff8f0';
  r(c, x, fuss - 4, 1, 4, '#8a6a42');
  r(c, x - 1, fuss - 14, 3, 3, f); r(c, x - 2, fuss - 11, 5, 5, f); r(c, x - 4, fuss - 10, 2, 2, f); r(c, x + 3, fuss - 10, 2, 2, f);
  r(c, x - 2, fuss - 6, 2, 3, f); r(c, x + 1, fuss - 6, 2, 3, f);
  p(c, x - 1, fuss - 13, '#3a2010'); p(c, x + 1, fuss - 13, '#3a2010'); p(c, x, fuss - 9, g); p(c, x, fuss - 7, g);
  r(c, x - 4, fuss - 10, 1, 2, g); r(c, x + 4, fuss - 10, 1, 2, g); p(c, x - 2, fuss - 4, g); p(c, x + 2, fuss - 4, g);
}
/** Riesenlolli mit Spirale (Variante der Zuckerstangen). */
function riesenlolli(c, x, fuss, [a, b]) {
  r(c, x, fuss - 10, 1, 10, '#f4f0e8');
  const cy = fuss - 14;
  for (let yy = -4; yy <= 4; yy++) for (let xx = -4; xx <= 4; xx++) {
    const d = Math.hypot(xx, yy); if (d > 4.3) continue;
    const w = Math.atan2(yy, xx) + d * 0.9;
    p(c, x + xx, cy + yy, Math.sin(w * 2) > 0 ? a : b);
  }
  p(c, x - 2, cy - 2, '#ffffff');
}
/** Bierbänke vor dem Stand (bis 11.10. nicht gezeichnet) - Variante 1 mit Fellen, 2 Stehtische. */
function baenke(c, L, G, t, w, v) {
  const fuss = G - 2;
  if (v === 2) {
    for (const x of [140, 166]) {
      r(c, x - 4, fuss - 10, 9, 2, '#c82828'); r(c, x - 4, fuss - 8, 9, 1, '#a82020'); p(c, x - 4, fuss - 7, '#c82828'); p(c, x + 4, fuss - 7, '#c82828');
      r(c, x, fuss - 7, 1, 7, '#4a4a52'); r(c, x - 2, fuss - 1, 5, 1, '#4a4a52');
      r(c, x - 1, fuss - 13, 2, 3, '#f8f4ea'); p(c, x - 1, fuss - 14, '#ffd060'); L.push({ x: x - 1, y: fuss - 14, f: '#ffd060', halo: 4, an: 1 });
      if (w.schnee > 0) r(c, x - 4, fuss - 11, 3, 1, '#f6f9fc');
    }
    return;
  }
  // Tisch in der Mitte, je eine Bank links und rechts (Seitenansicht)
  const x0 = 140, x1 = 170;
  r(c, x0 + 6, fuss - 6, x1 - x0 - 12, 2, '#a8703a'); r(c, x0 + 6, fuss - 6, x1 - x0 - 12, 1, '#c8905a');
  r(c, x0 + 8, fuss - 4, 1, 4, '#6a4222'); r(c, x1 - 9, fuss - 4, 1, 4, '#6a4222');
  for (const [bx, bw] of [[x0, 6], [x1 - 6, 6]]) {
    r(c, bx, fuss - 3, bw, 1, '#a8703a'); r(c, bx + 1, fuss - 2, 1, 2, '#6a4222'); r(c, bx + bw - 2, fuss - 2, 1, 2, '#6a4222');
    if (v === 1) { r(c, bx, fuss - 4, bw, 1, '#f4f0e6'); p(c, bx + 1, fuss - 5, '#e8e2d6'); p(c, bx + bw - 2, fuss - 5, '#f4f0e6'); }   // Schaffell
  }
  if (v === 1) r(c, x0 + 7, fuss - 7, x1 - x0 - 14, 1, '#c82828');   // rote Tischdecke dazu
  r(c, x0 + 12, fuss - 8, 2, 2, '#f4f0e8'); r(c, x1 - 14, fuss - 8, 2, 2, '#f4f0e8');   // zwei Tassen
  if (w.schnee > 0) r(c, x0 + 6, fuss - 7, 4, 1, '#f6f9fc');
}

/** Vogelhäuschen; `haengend` = an einer Schnur im Baum statt auf einem Pfahl. */

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
  const zv = S.variante('zaun');
  for (const [x0, x1] of [[0, 71], [89, 126]]) {
    if (zv === 1) {
      // Jägerzaun: gekreuzte Latten zwischen Pfosten
      for (let x = x0; x < x1; x++) { const k = (x - x0) % 8; p(c, x, hoch + Math.round(k * 0.7), f); p(c, x, hoch + 5 - Math.round(k * 0.7), f); }
      for (let x = x0; x < x1; x += 8) { r(c, x, hoch - 1, 2, 7, sf); if (w.schnee > 0) p(c, x, hoch - 2, '#ffffff'); }
      r(c, x0, hoch + 2, x1 - x0, 1, sf);
    } else if (zv === 2) {
      // Lebkuchenzaun: braune Latten mit Zuckerguss-Spitzen und Gummibärchen
      r(c, x0, hoch + 2, x1 - x0, 1, '#7a4220'); r(c, x0, hoch + 4, x1 - x0, 1, '#7a4220');
      for (let x = x0 + 1, i = 0; x < x1; x += 4, i++) {
        r(c, x, hoch, 2, 6, '#a8642e'); r(c, x, hoch - 1, 2, 1, '#fff8f0'); p(c, x, hoch, '#fff8f0');
        if (i % 3 === 1) p(c, x + 1, hoch + 3, ['#e03a3a', '#3aa84a', '#e8c030'][i % 3]);
      }
    } else {
      r(c, x0, hoch + 2, x1 - x0, 1, sf); r(c, x0, hoch + 4, x1 - x0, 1, sf);
      for (let x = x0 + 1; x < x1; x += 4) { r(c, x, hoch, 2, 6, f); p(c, x, hoch - 1, f); if (w.schnee > 0) p(c, x, hoch - 1, '#ffffff'); }
    }
  }
  // Tannengirlande: hängt in Bögen am oberen Riegel, rote Schleife an jedem Bogen
  if (S.zeigt('zaun_girlande')) for (const [x0, x1] of [[0, 71], [89, 126]]) {
    const gv = S.variante('zaun_girlande');
    for (let x = x0; x < x1; x++) {
      const bogen = Math.round(Math.sin(((x - x0) % 12) / 12 * Math.PI) * 2);
      if (gv === 1) {
        // Lametta: silberne Strähnen, die hier und da aufblitzen
        p(c, x, hoch + 1 + bogen, x % 3 ? '#c8ccd4' : '#eef2f8'); if (x % 2) p(c, x, hoch + 2 + bogen, '#a8acb8');
        if ((x * 7 + Math.floor(t * 2)) % 23 === 0) p(c, x, hoch + 1 + bogen, '#ffffff');
      } else if (gv === 2) {
        // Beerenkette: rote Beeren und Popcorn auf einer Schnur
        p(c, x, hoch + 1 + bogen, x % 3 === 0 ? '#d83a3a' : x % 3 === 1 ? '#f4f0e0' : '#8a7a5a');
      } else {
        p(c, x, hoch + 1 + bogen, '#2f6a2a'); p(c, x, hoch + 2 + bogen, x % 2 ? '#245224' : '#3a7a34');
        if (w.schnee > 0 && x % 3 === 0) p(c, x, hoch + bogen, '#f6f9fc');
      }
    }
    if (gv === 0) for (let x = x0 + 1; x < x1 - 1; x += 12) { r(c, x - 1, hoch, 3, 2, '#d83a3a'); p(c, x - 1, hoch + 2, '#b02828'); p(c, x + 1, hoch + 2, '#b02828'); }
  }
  if (S.zeigt('lichter_zaun')) { const z = S.stufe('lichter_zaun'); kette(c, L, 0, 70, hoch + 2, 12, 2, t, 1, z, 'zaun', 'lichter_zaun'); kette(c, L, 90, 126, hoch + 2, 12, 2, t, 1, z, 'zaun', 'lichter_zaun'); }
}

// ---------------------------------------------------------------------------
// Varianten (09.10.) - je Platz zwei weitere Formen
// ---------------------------------------------------------------------------
function holzrentier(c, x, fuss) {
  const b = '#a8703a', d = '#7a4a22';
  r(c, x - 3, fuss - 7, 6, 3, b); r(c, x - 3, fuss - 4, 1, 4, d); r(c, x + 2, fuss - 4, 1, 4, d);
  r(c, x + 2, fuss - 10, 2, 3, b); r(c, x + 3, fuss - 11, 2, 2, b);                        // Hals, Kopf
  p(c, x + 3, fuss - 13, d); p(c, x + 2, fuss - 14, d); p(c, x + 5, fuss - 13, d); p(c, x + 6, fuss - 14, d);   // Geweih
  r(c, x + 1, fuss - 8, 2, 1, '#d83a3a'); p(c, x + 1, fuss - 7, '#d83a3a');                 // Schleife
}
function gartenzwerg(c, x, fuss) {
  r(c, x - 1, fuss - 2, 1, 2, '#1a1a1a'); r(c, x + 1, fuss - 2, 1, 2, '#1a1a1a');
  r(c, x - 2, fuss - 7, 5, 5, '#c82828'); r(c, x - 2, fuss - 4, 5, 1, '#1a1a1a');
  r(c, x - 1, fuss - 10, 3, 3, '#f2c9a0'); p(c, x, fuss - 9, '#1a1a1a');
  r(c, x - 2, fuss - 8, 5, 2, '#f4f4f4'); p(c, x, fuss - 6, '#f4f4f4');                     // Bart
  r(c, x - 2, fuss - 11, 5, 1, '#f4f4f4'); r(c, x - 1, fuss - 13, 3, 2, '#c82828'); p(c, x + 1, fuss - 14, '#c82828'); p(c, x + 2, fuss - 15, '#f4f4f4');   // Zipfelmütze
}
function dachRentier(c, x, y, t, n) {
  const b = '#8a5a32';
  r(c, x - 3, y - 4, 6, 3, b); r(c, x - 3, y - 1, 1, 2, b); r(c, x + 2, y - 1, 1, 2, b);
  r(c, x + 2, y - 7, 2, 3, b); p(c, x + 4, y - 6, '#d83a3a');
  p(c, x + 2, y - 9, '#5a3a22'); p(c, x + 4, y - 9, '#5a3a22'); p(c, x + 1, y - 10, '#5a3a22'); p(c, x + 5, y - 10, '#5a3a22');
  if (Math.floor(t * 1.5 + n) % 3 === 0) p(c, x - 4, y - 4, b);   // Schwanzwackeln
}
function steckengeblieben(c, x, ko, t) {
  // Zwei Beine ragen aus dem Schornstein, ab und zu strampelt eins
  const st = Math.floor(t * 2) % 4 === 0 ? 1 : 0;
  for (const [dx, hoch] of [[2, 7 + st], [6, 7]]) {
    r(c, x + dx, ko - 1 - hoch, 2, hoch, '#c82828');
    r(c, x + dx, ko - 1 - hoch, 2, 1, '#f4f4f4');
    r(c, x + dx - (dx < 4 ? 1 : 0), ko - 4 - hoch, 3, 3, '#1a1a1a');
  }
}
function schneeburg(c, x, fuss) {
  const w = '#f6f9fc', s = '#cfd9e8';
  r(c, x - 8, fuss - 7, 17, 7, w); r(c, x - 8, fuss - 1, 17, 1, s);
  for (const tx of [x - 8, x + 5]) { r(c, tx, fuss - 13, 4, 13, w); for (let i = 0; i < 4; i += 2) p(c, tx + i, fuss - 14, w); r(c, tx + 1, fuss - 9, 2, 2, s); }
  for (let i = -3; i <= 3; i += 2) p(c, x + i, fuss - 8, w);
  r(c, x - 1, fuss - 4, 3, 4, s);                                                           // Tor
  r(c, x - 7, fuss - 19, 1, 5, '#6a4a2a'); r(c, x - 6, fuss - 19, 3, 2, '#d83a3a');         // Fähnchen
  r(c, x + 6, fuss - 19, 1, 5, '#6a4a2a'); r(c, x + 7, fuss - 19, 3, 2, '#3a8ad8');
}
function liegestuhl(c, x, fuss, t) {
  // Gestreifter Liegestuhl, darauf ein Schneemann mit Sonnenbrille
  for (let i = 0; i < 9; i++) r(c, x - 6 + i, fuss - 2 - Math.round(i * 0.7), 1, 2, i % 2 ? '#3a8ad8' : '#f4f4f4');
  r(c, x - 6, fuss - 2, 1, 2, '#8a6a3a'); r(c, x + 2, fuss - 8, 1, 8, '#8a6a3a'); r(c, x - 3, fuss - 2, 1, 2, '#8a6a3a');
  const w = '#f6f9fc';
  r(c, x - 5, fuss - 6, 6, 4, w); r(c, x + 1, fuss - 11, 5, 5, w);                         // Bauch, Kopf
  r(c, x + 1, fuss - 9, 5, 1, '#1a1a22'); p(c, x + 2, fuss - 10, '#1a1a22'); p(c, x + 4, fuss - 10, '#1a1a22');   // Sonnenbrille
  p(c, x + 6, fuss - 8, '#f08020'); r(c, x + 1, fuss - 13, 5, 2, '#e8c030');               // Nase, Strohhut
  p(c, x - 6, fuss - 5, '#6a4a2a'); p(c, x - 7, fuss - 6, '#6a4a2a');                      // Arm hinterm Kopf
}
function lichtLinien(c, L, pts, bunt, rot, t) {
  pts.forEach(([px, py], i) => { const f = bunt ? BUNT[Math.floor(i / 3) % BUNT.length] : '#fff2c8'; p(c, px, py, f); if (i % 2 === 0) L.push({ x: px, y: py, f, halo: 2, an: 0.8 }); });
  if (rot) { p(c, rot[0], rot[1], '#ff3030'); L.push({ x: rot[0], y: rot[1], f: '#ff3030', halo: 3, an: 1 }); }
}
function linienPunkte(segs) {
  const pts = [];
  for (const [x0, y0, x1, y1] of segs) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) pts.push([Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n)]); }
  return pts;
}
function lichterElch(c, L, x, fuss, t) {
  const pts = linienPunkte([
    [x + 1, fuss - 9, x + 12, fuss - 9], [x + 1, fuss - 14, x + 12, fuss - 14], [x + 1, fuss - 9, x + 1, fuss - 14], [x + 12, fuss - 9, x + 13, fuss - 15],
    [x + 2, fuss - 9, x + 2, fuss], [x + 11, fuss - 9, x + 11, fuss],
    [x + 1, fuss - 14, x - 1, fuss - 18], [x - 1, fuss - 18, x - 5, fuss - 16], [x - 5, fuss - 16, x - 4, fuss - 14],
    [x - 1, fuss - 18, x - 4, fuss - 23], [x - 4, fuss - 23, x + 1, fuss - 24], [x + 1, fuss - 24, x + 1, fuss - 19],
  ]);
  lichtLinien(c, L, pts, S.bunt('rentier'), null, t);
}
function lichterDino(c, L, x, fuss, t) {
  // Langhals: dicker Bauch, Hals schräg nach oben, Schwanz nach hinten
  const pts = linienPunkte([
    [x + 2, fuss - 6, x + 12, fuss - 6], [x + 2, fuss - 6, x + 3, fuss - 11], [x + 3, fuss - 11, x + 10, fuss - 12], [x + 10, fuss - 12, x + 12, fuss - 6],
    [x + 4, fuss - 6, x + 4, fuss], [x + 10, fuss - 6, x + 10, fuss],
    [x + 3, fuss - 11, x - 1, fuss - 20], [x - 1, fuss - 20, x - 4, fuss - 20], [x - 4, fuss - 20, x - 3, fuss - 18],
    [x + 12, fuss - 7, x + 17, fuss - 4], [x + 17, fuss - 4, x + 19, fuss - 1],
  ]);
  lichtLinien(c, L, pts, S.bunt('rentier'), null, t);
}
function bollerwagen(c, x, fuss) {
  r(c, x + 1, fuss - 7, 11, 5, '#3a8a4a'); r(c, x + 1, fuss - 7, 11, 1, '#5aaa6a');
  for (const wx of [x + 3, x + 10]) { r(c, wx - 1, fuss - 3, 3, 3, '#2a2a30'); p(c, wx, fuss - 2, '#c8c8d0'); }
  r(c, x - 3, fuss - 6, 4, 1, '#2a2a30'); r(c, x - 4, fuss - 8, 1, 3, '#2a2a30');           // Deichsel
  r(c, x + 2, fuss - 11, 4, 4, '#d83a3a'); r(c, x + 3, fuss - 11, 1, 4, '#e8c030');
  r(c, x + 6, fuss - 13, 4, 6, '#3a8ad8'); r(c, x + 6, fuss - 11, 4, 1, '#f4f4f4');
  r(c, x + 9, fuss - 10, 3, 3, '#e8c030'); p(c, x + 10, fuss - 11, '#d83a3a');
}
function rasenmaeher(c, x, fuss, t, L) {
  r(c, x + 1, fuss - 7, 12, 4, '#c82828'); r(c, x + 1, fuss - 7, 12, 1, '#e84a3a');
  r(c, x + 9, fuss - 10, 3, 3, '#2a2a30'); r(c, x + 9, fuss - 12, 1, 2, '#2a2a30');        // Sitz, Lehne
  r(c, x + 3, fuss - 10, 1, 3, '#2a2a30'); r(c, x + 2, fuss - 11, 3, 1, '#2a2a30');        // Lenkrad
  r(c, x + 9, fuss - 4, 4, 4, '#1a1a1a'); p(c, x + 10, fuss - 3, '#8a8a92');               // großes Hinterrad
  r(c, x + 1, fuss - 3, 3, 3, '#1a1a1a');
  const bunt = S.bunt('schlitten');
  for (let i = 0; i < 6; i++) { const lx = x + 1 + i * 2, ly = fuss - 8 + (i % 2); const f = BUNT[(i + Math.floor(t * 3)) % BUNT.length]; p(c, lx, ly, bunt === false ? WARM : f); if (L) L.push({ x: lx, y: ly, f, halo: 2, an: 0.9 }); }
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
// ---------------------------------------------------------------------------
// Der fahrende Händler und seine Ware (09.10.)
// ---------------------------------------------------------------------------
/** Karren mit gestreiftem Dach, davor der Händler mit Hut und Bart. */
function haendlerKarren(c, h, fuss, t) {
  const x = Math.round(h.x), laeuft = h.phase !== 'steht';
  const hop = laeuft ? (Math.floor(t * 6) % 2) : 0;
  // Karren (hinter dem Händler, er zieht ihn)
  const kx = x - 13, ky = fuss - 10;
  r(c, kx, ky, 12, 7, '#7a4a2a'); r(c, kx, ky, 12, 1, '#9a6238'); r(c, kx + 1, ky + 2, 10, 1, '#5a3219');
  for (let i = 0; i < 3; i++) { r(c, kx + 1 + i * 4, ky - 3, 3, 3, ['#e04a4a', '#e8c030', '#4ab0e0'][i]); }   // Ware
  r(c, kx - 1, ky - 9, 1, 9, '#5a3219'); r(c, kx + 12, ky - 9, 1, 9, '#5a3219');                         // Stangen
  for (let i = 0; i < 14; i++) r(c, kx - 1 + i, ky - 11 + (i % 2 ? 0 : 1), 1, 2, i % 4 < 2 ? '#7a3aa8' : '#e8c030');   // Dach
  for (const wx of [kx + 2, kx + 9]) { r(c, wx - 1, fuss - 4, 3, 3, '#3a2418'); p(c, wx, fuss - 3, '#c8a060'); }   // Räder
  r(c, kx + 12, ky + 3, 3, 1, '#5a3219');   // Deichsel
  // Händler
  const hx = x, hy = fuss - hop;
  r(c, hx - 2, hy - 2, 2, 2, '#3a2a20'); r(c, hx + 1, hy - 2, 2, 2, '#3a2a20');   // Stiefel
  r(c, hx - 2, hy - 9, 5, 7, '#6a3a8a'); r(c, hx - 2, hy - 6, 5, 1, '#e8c030');   // Mantel, Gürtel
  r(c, hx - 1, hy - 13, 4, 4, '#f0c8a0');                                           // Gesicht
  r(c, hx - 1, hy - 11, 4, 2, '#f4f4f4'); p(c, hx + 1, hy - 12, '#3a2010');         // Bart, Auge
  r(c, hx - 3, hy - 14, 7, 1, '#3a2418'); r(c, hx - 1, hy - 17, 4, 3, '#3a2418'); r(c, hx - 1, hy - 15, 4, 1, '#d83a3a');   // Hut
  // Er steht: kleines Funkeln über dem Karren, damit man ihn antippt
  if (h.phase === 'steht' && Math.floor(t * 3) % 2) { p(c, kx + 6, ky - 15, '#ffe060'); p(c, kx + 5, ky - 14, '#ffe060'); p(c, kx + 7, ky - 14, '#ffe060'); p(c, kx + 6, ky - 13, '#ffe060'); }
}
/** Aus der Waldlichtung (09.10.) */
function hasenfamilie(c, x, fuss, t) {
  for (const [dx, k] of [[0, 1], [6, 0.8], [11, 0.7]]) {
    const hx = x + dx, f = '#b8a898', hop = Math.floor(t * 0.8 + dx) % 5 === 0 ? 1 : 0;
    r(c, hx - 2, fuss - 3 - hop, Math.round(4 * k) + 1, 3, f); r(c, hx + 1, fuss - 5 - hop, 2, 2, f);
    p(c, hx + 1, fuss - 7 - hop, f); p(c, hx + 2, fuss - 7 - hop, f); p(c, hx + 2, fuss - 5 - hop, '#2a1a10'); p(c, hx - 2, fuss - 3 - hop, '#f4f4f4');
  }
}
function dachEichhorn(c, x, y, t) {
  const f = '#c86a2a';
  r(c, x, y - 3, 3, 3, f); r(c, x + 2, y - 5, 2, 2, f); p(c, x + 3, y - 5, '#2a1a10');
  r(c, x - 2, y - 6, 2, 5, '#d88a4a');
  if (Math.floor(t * 3) % 2) p(c, x + 4, y - 3, '#8a5a2a');   // knabbert
}
function gartenReh(c, x, fuss, t) {
  const f = '#a8703a', kopf = Math.floor(t * 0.4) % 3 === 0 ? 2 : 0;   // senkt ab und zu den Kopf zum Grasen
  r(c, x - 4, fuss - 7, 8, 3, f);
  for (const dx of [-3, -1, 2, 3]) r(c, x + dx, fuss - 4, 1, 4, f);
  r(c, x + 3, fuss - 10 + kopf, 2, 4, f); r(c, x + 4, fuss - 11 + kopf, 3, 2, f); p(c, x + 6, fuss - 11 + kopf, '#2a1a10'); p(c, x + 4, fuss - 12 + kopf, f);
  p(c, x - 2, fuss - 6, '#f4ead8'); p(c, x + 1, fuss - 6, '#f4ead8');
}
/** Riesen-Schneekugel: Glaskuppel auf Holzsockel, drinnen ein Häuschen und Schnee. */
function schneekugel(c, L, x, fuss, t, w) {
  r(c, x - 6, fuss - 3, 13, 3, '#7a4a2a'); r(c, x - 5, fuss - 4, 11, 1, '#9a6238'); r(c, x - 6, fuss - 1, 13, 1, '#5a3219');
  const cy = fuss - 11;
  for (let y = -6; y <= 6; y++) for (let xx = -6; xx <= 6; xx++) {
    const d = Math.hypot(xx, y);
    if (d > 6.4) continue;
    p(c, x + xx, cy + y, d > 5.6 ? '#cfe2f0' : '#9cc4e4');
  }
  r(c, x - 3, cy + 1, 6, 4, '#d83a3a'); for (let i = 0; i < 4; i++) r(c, x - 3 + i, cy + 1 - i, 7 - i * 2, 1, '#5a3a32');   // Häuschen
  p(c, x, cy + 3, '#ffd070');
  for (let i = 0; i < 6; i++) { const a = (t * 0.4 + i / 6) % 1; p(c, x - 4 + ((i * 3) % 9), cy - 5 + Math.floor(a * 10), '#ffffff'); }
  p(c, x - 3, cy - 4, '#ffffff'); p(c, x - 4, cy - 3, '#ffffff');   // Glanzlicht
  L.push({ x, y: cy + 3, f: '#ffd070', halo: 4, an: 0.6 });
}
// ---------------------------------------------------------------------------
// Vom Weihnachtsmarkt (09.10.)
// ---------------------------------------------------------------------------
/** Riesenrad hinter dem Dorf: dreht sich langsam, Gondeln hängen immer senkrecht. */
function riesenrad(c, L, x, y, t, w) {
  const rad = 12, a0 = t * 0.25;
  const blass = w.schnee > 0 ? '#6a6a84' : '#5e5a72';
  // Gestell
  for (let i = 0; i < 18; i++) { p(c, x - 1 - Math.round(i * 0.45), y + i, blass); p(c, x + 1 + Math.round(i * 0.45), y + i, blass); }
  // Kranz und Speichen
  for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2; p(c, x + Math.round(Math.cos(a) * rad), y + Math.round(Math.sin(a) * rad), blass); }
  for (let k = 0; k < 8; k++) {
    const a = a0 + k / 8 * Math.PI * 2;
    for (let d = 2; d < rad; d += 2) p(c, x + Math.round(Math.cos(a) * d), y + Math.round(Math.sin(a) * d), blass);
    // Gondel
    const gx = x + Math.round(Math.cos(a) * rad), gy = y + Math.round(Math.sin(a) * rad);
    const f = ['#c83a32', '#e8a030', '#3a6ab8', '#2f8a3a'][k % 4];
    r(c, gx - 1, gy + 1, 3, 2, f);
    L.push({ x: gx, y: gy, f: BUNT[k % BUNT.length], halo: 3, an: 0.8 });
  }
  r(c, x - 1, y - 1, 3, 3, '#5a5a68');
}
/** Herrnhuter Stern: hängt an einem Ast des kahlen Baums, viele Zacken, leuchtet. */
function herrnhuter(c, L, x, ast, t) {
  r(c, x, ast, 1, 4, '#3a3a40');
  const cx = x, cy = ast + 8;
  const zacken = [[0, -5], [0, 5], [-5, 0], [5, 0], [-4, -4], [4, -4], [-4, 4], [4, 4], [-2, -5], [2, -5]];
  for (const [dx, dy] of zacken) {
    const n = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 1; i <= n; i++) p(c, cx + Math.round(dx * i / n), cy + Math.round(dy * i / n), i === n ? '#fff6c8' : '#ffe060');
  }
  r(c, cx - 2, cy - 2, 5, 5, '#ffd040'); r(c, cx - 1, cy - 1, 3, 3, '#fff6c8');
  L.push({ x: cx, y: cy, f: '#ffe880', halo: 12, an: 0.9 + 0.1 * Math.sin(t * 2) });
}
/** Fensterbilder: Schneeflocken aus Papier oben in den beiden großen Fenstern. */
function fensterbilder(c, G) {
  const flocke = (x, y, g) => {
    p(c, x, y, '#ffffff');
    for (let i = 1; i <= g; i++) { p(c, x - i, y, '#ffffff'); p(c, x + i, y, '#ffffff'); p(c, x, y - i, '#ffffff'); p(c, x, y + i, '#ffffff'); }
    if (g > 1) { p(c, x - 1, y - 1, '#f0f4f8'); p(c, x + 1, y + 1, '#f0f4f8'); p(c, x + 1, y - 1, '#f0f4f8'); p(c, x - 1, y + 1, '#f0f4f8'); }
  };
  for (const fx of [48, 96]) { flocke(fx + 3, G - 55, 2); flocke(fx + 12, G - 54, 1); flocke(fx + 7, G - 52, 1); }
}
/** Lebkuchenherzen an Bändern unter der Markise. */
function lebkuchenherzen(c, G, t) {
  const markise = G - 44;
  [138, 152, 166].forEach((hx, i) => {
    const sw = Math.round(Math.sin(t * 1.5 + i) * 0.6);
    p(c, hx, markise + 6, '#c83030');
    const x = hx - 2 + sw, y = markise + 7;
    r(c, x, y, 2, 1, '#a8642e'); r(c, x + 3, y, 2, 1, '#a8642e'); r(c, x, y + 1, 5, 2, '#a8642e'); p(c, x + 2, y + 3, '#a8642e'); r(c, x + 1, y + 3, 3, 1, '#a8642e');
    r(c, x + 1, y + 1, 3, 1, '#fff4e6');
  });
}
/** Pferdekutsche: fährt alle 45 s auf der Fahrbahn von links nach rechts vorbei. */
function kutsche(c, L, G, t, w) {
  const phase = (t + 42) % 45;
  if (phase > 13) return;
  const x = Math.round(-36 + phase * 18), fuss = G - 3;   // etwas höher: unten liegen die Schilder des Stands darüber
  const hop = Math.floor(t * 8) % 2;
  // Pferd vorn (rechts)
  const px = x + 26, pf = '#7a4a28';
  r(c, px - 5, fuss - 9 - hop, 10, 4, pf); r(c, px + 4, fuss - 13 - hop, 3, 5, pf); r(c, px + 5, fuss - 14 - hop, 4, 3, pf);
  p(c, px + 8, fuss - 13 - hop, '#2a1a10'); p(c, px + 5, fuss - 15 - hop, pf); r(c, px + 3, fuss - 12 - hop, 1, 4, '#3a2416');   // Mähne
  r(c, px - 6, fuss - 9 - hop, 1, 4, '#3a2416');                                                                        // Schweif
  for (const [lx, ph] of [[-4, 0], [-2, 1], [2, 0], [4, 1]]) r(c, px + lx + ((ph === hop) ? 1 : 0), fuss - 5, 1, 5, '#5a3418');
  r(c, px - 2, fuss - 9 - hop, 1, 1, '#e8c030'); r(c, px - 2, fuss - 8 - hop, 1, 1, '#c83030');                       // Glöckchen, Decke
  // Deichsel und Kutsche
  r(c, x + 16, fuss - 7, 6, 1, '#3a2416');
  r(c, x + 2, fuss - 14, 15, 9, '#2a3a6a'); r(c, x + 2, fuss - 14, 15, 1, '#4a5a8a'); r(c, x + 1, fuss - 16, 17, 2, '#1e2a50');
  r(c, x + 5, fuss - 12, 4, 4, '#f8d878'); r(c, x + 11, fuss - 12, 4, 4, '#f8d878');
  r(c, x + 3, fuss - 6, 13, 1, '#c8a040');
  for (const rx of [x + 4, x + 14]) { r(c, rx - 2, fuss - 5, 5, 5, '#3a2a1a'); p(c, rx, fuss - 3, '#c8a040'); }
  if (w.schnee > 0) r(c, x + 1, fuss - 17, 17, 1, '#ffffff');
  // Kutscher mit Zylinder
  r(c, x + 15, fuss - 20, 3, 4, '#3a3a40'); r(c, x + 15, fuss - 22, 3, 2, '#f2c9a0'); r(c, x + 14, fuss - 24, 5, 1, '#1a1a1a'); r(c, x + 15, fuss - 27, 3, 3, '#1a1a1a');
  L.push({ rect: [x + 5, fuss - 12, 4, 4], f: '#ffd070', halo: 5, an: 0.7 });
  L.push({ rect: [x + 11, fuss - 12, 4, 4], f: '#ffd070', halo: 5, an: 0.7 });
}

// ---------------------------------------------------------------------------
// Aus dem Christbaumverkauf (09.10.)
// ---------------------------------------------------------------------------
/** Drei große Kugeln an Aststellen des kahlen Baums, die nicht hinter Haus oder Stand liegen. */
function riesenkugeln(c, L, G) {
  for (const [x, y, f] of [[122, G - 84, '#d83a3a'], [128, G - 96, '#e8b030'], [138, G - 68, '#3a7ad8']]) {
    r(c, x, y - 3, 1, 3, '#3a3a40'); r(c, x - 1, y - 1, 3, 1, '#c8a040');
    r(c, x - 2, y + 1, 5, 3, f); r(c, x - 1, y, 3, 5, f); p(c, x - 1, y + 1, '#ffffff'); p(c, x + 1, y + 3, ton(f, -0.3));
    L.push({ x, y: y + 2, f, halo: 3, an: 0.4 });
  }
}
/** Kleiner Christbaum mit Lichtern oben auf dem Dachfirst. */
function dachbaum(c, L, x, fuss, t, w) {
  r(c, x - 2, fuss - 2, 5, 2, '#6a4428');
  for (let i = 0; i < 12; i++) {
    const s = Math.floor(i / 4), innen = (i % 4) / 4, bw = Math.round((s + 1) * 1.6 * (0.6 + innen * 0.4));
    r(c, x - bw, fuss - 14 + i, bw * 2 + 1, 1, i % 4 === 3 ? '#1c5228' : '#2a6a34');
    if (w.schnee > 0 && innen === 0) p(c, x - bw, fuss - 14 + i, '#ffffff');
  }
  p(c, x, fuss - 15, '#ffe060'); L.push({ x, y: fuss - 15, f: '#ffe060', halo: 5, an: 0.9 });
  [[-2, -11], [2, -9], [-3, -6], [3, -4], [0, -7]].forEach(([dx, dy], k) => {
    const f = BUNT[k % BUNT.length]; p(c, x + dx, fuss + dy, f); L.push({ x: x + dx, y: fuss + dy, f, halo: 2, an: lichtHell(k, t, 2) });
  });
}

// ---------------------------------------------------------------------------
// Vom Schlittenberg (09.10.)
// ---------------------------------------------------------------------------
/** Ein verschneiter Hügel am Horizont rechts, auf dem winzige Rodler hinunterfahren. */
function rodelhang(c, hz, t, schnee) {
  const x0 = 140, x1 = 186, gipfel = hz - 38;
  for (let x = x0; x < x1; x++) {
    const h = Math.round(Math.max(0, 38 - Math.abs(x - 168) * 1.5));
    if (h <= 0) continue;
    r(c, x, hz - h, 1, h, x < 168 ? '#e4ecf4' : '#c8d6e4');
    p(c, x, hz - h, '#9fb4c8');                                   // Kante gegen den hellen Himmel
  }
  for (const [tx, th] of [[150, 7], [156, 6], [181, 7], [176, 5]]) {
    const fuss = hz - Math.round(Math.max(0, 38 - Math.abs(tx - 168) * 1.5)) + th;
    for (let i = 0; i < th; i++) r(c, tx - Math.floor(i / 2), fuss - th + i, Math.floor(i / 2) * 2 + 1, 1, '#3a5a48');
  }
  // Rodelbahn als Linie, darauf drei winzige Rodler
  for (let i = 0; i < 22; i++) p(c, 167 - i, gipfel + 3 + Math.round(i * 1.4), '#a8b8c8');
  for (let k = 0; k < 3; k++) {
    const a = ((t * 0.12 + k / 3) % 1), x = 167 - a * 22, y = gipfel + 2 + a * 30;
    p(c, x, y, ['#c83a32', '#3a6ab8', '#2f8a3a'][k]); p(c, x, y - 1, '#f2c9a0');
  }
}
/** Der Rodel-Wok als Trophäe an der Hauswand rechts neben dem Fenster. */
function wandWok(c, x, y) {
  // Der Rodel-Wok als Trophäe (11.10. neu gezeichnet: vorher ein fast
  // schwarzer runder Klecks, nachts nur „schwarze Pixel"). Von vorn, leicht
  // schräg hängend: heller Rand, Stahl mit Glanz, Holzstiel nach rechts oben
  // am Nagel, darunter ein kleines goldenes Schild.
  p(c, x + 6, y - 6, '#3a3a40'); p(c, x + 5, y - 5, '#8a7a5a');   // Nagel und Schlaufe
  r(c, x + 2, y - 4, 2, 1, '#8a5a32'); r(c, x + 4, y - 5, 2, 1, '#a8703a');   // Holzstiel
  r(c, x - 5, y - 3, 10, 1, '#dfe3ea');                     // Rand
  r(c, x - 5, y - 2, 10, 1, '#9aa0aa');
  r(c, x - 4, y - 1, 8, 1, '#868c96');
  r(c, x - 3, y, 6, 1, '#727882');
  r(c, x - 2, y + 1, 4, 1, '#5e646e');
  p(c, x - 3, y - 2, '#eef2f6'); p(c, x - 2, y - 1, '#c8ccd4'); p(c, x - 1, y, '#a8aeb8');   // Glanz
  r(c, x - 2, y + 3, 4, 2, '#e8c030'); p(c, x - 2, y + 3, '#fff0a0'); p(c, x + 1, y + 4, '#b8901e');   // Schild
}
/** Zwei Kinder ziehen einen Schlitten über den Gehweg (alle 50 s). */
function rodelkinder(c, G, t, w) {
  const phase = (t + 30) % 50;
  if (phase > 14) return;
  // Auf der Straße, nicht auf dem Gehweg - dort ist schon alles voll (13.10.)
  const x = Math.round(196 - phase * 16), fuss = G + STRASSE - 1, schritt = Math.floor(t * 6) % 2;
  // Schlitten hinter ihnen (sie gehen nach links)
  r(c, x + 12, fuss - 4, 11, 2, '#a8703a'); r(c, x + 11, fuss - 2, 13, 1, '#6a4428'); p(c, x + 23, fuss - 3, '#6a4428');
  for (let i = 0; i < 6; i++) p(c, x + 4 + i, fuss - 6 + Math.round(i * 0.3), '#3a3a40');   // Seil
  r(c, x + 14, fuss - 7, 3, 3, '#e8c030');                                                    // Paket auf dem Schlitten
  for (const [dx, f] of [[0, '#c83a32'], [6, '#3a6ab8']]) {
    const kx = x + dx;
    r(c, kx - 1, fuss - 3 + (schritt ? 0 : 1), 1, 3, '#2c2c38'); r(c, kx + 1, fuss - 3 + (schritt ? 1 : 0), 1, 3, '#2c2c38');
    r(c, kx - 2, fuss - 8, 5, 5, f); r(c, kx - 2, fuss - 12, 4, 4, '#f2c9a0'); p(c, kx - 2, fuss - 10, '#2a1a1a');
    r(c, kx - 2, fuss - 13, 5, 2, dx ? '#e8c030' : '#2f8a3a'); p(c, kx + 2, fuss - 14, '#ffffff');
  }
  if (w.schnee > 0) for (let i = 0; i < 4; i++) p(c, x + 24 + i * 3, fuss - 1, '#ffffff');
}

// ---------------------------------------------------------------------------
// Von der Eisbahn (10.10.)
// ---------------------------------------------------------------------------
/** Ein Paar Schlittschuhe am Nagel neben der Haustür. */
function wandSchlittschuhe(c, x, y) {
  p(c, x + 2, y - 1, '#3a3a40');
  r(c, x + 1, y, 1, 2, '#c83a32'); r(c, x + 3, y, 1, 2, '#c83a32');                       // Schnürsenkel
  for (const bx of [x - 1, x + 3]) { r(c, bx, y + 2, 3, 4, '#f4f0e8'); r(c, bx, y + 6, 4, 1, '#3a2a1a'); r(c, bx - 1, y + 7, 5, 1, '#c8ccd8'); }
}
/** Kleiner Pinguin mit Mütze auf dem Gehweg, wackelt ab und zu. */
function pinguin(c, x, fuss, t) {
  const w = Math.floor(t * 1.5) % 4 === 0 ? (Math.floor(t * 8) % 2 ? 1 : -1) : 0;
  r(c, x - 2 + w, fuss - 8, 5, 8, '#2a2a34'); r(c, x - 1 + w, fuss - 6, 3, 5, '#f4f4f4');
  p(c, x - 1 + w, fuss - 7, '#ffffff'); p(c, x + 1 + w, fuss - 7, '#ffffff'); p(c, x - 1 + w, fuss - 7, '#1a1a1a');
  r(c, x + w, fuss - 6, 1, 1, '#e8a020');
  r(c, x - 2 + w, fuss - 10, 5, 2, '#d83a3a'); p(c, x + 2 + w, fuss - 11, '#ffffff');
  r(c, x - 2, fuss, 2, 1, '#e8a020'); r(c, x + 1, fuss, 2, 1, '#e8a020');
}
/** Nachts zieht etwa alle sechs Sekunden eine Sternschnuppe über den Himmel. */
function sternschnuppen(c, G, t) {
  const takt = 6.5, k = (t % takt) / 0.9;
  if (k > 1) return;
  const n = Math.floor(t / takt);
  const x0 = 30 + Z.hash(n * 7) * 120, y0 = 20 + Z.hash(n * 11) * (G - 140);
  const x = x0 - k * 40, y = y0 + k * 18;
  for (let i = 0; i < 9; i++) {
    const a = 1 - i / 9;
    c.fillStyle = `rgba(255,${230 - i * 6},${170 + i * 6},${(a * (1 - k * 0.6)).toFixed(2)})`;
    c.fillRect(Math.round(x + i * 2), Math.round(y - i * 0.9), 1, 1);
  }
  p(c, x, y, '#ffffff');
}

/** Lichter-Flamingo: pink, S-Hals, ein Bein, Weihnachtsmütze, Lichterkette. */
function flamingo(c, L, x, fuss, t) {
  const pk = '#f06aa8', dk = '#c8487e';
  r(c, x, fuss - 7, 1, 7, dk);                                                    // Bein
  r(c, x - 3, fuss - 11, 6, 4, pk); r(c, x - 4, fuss - 10, 1, 2, dk);             // Körper
  r(c, x + 2, fuss - 15, 1, 4, pk); r(c, x + 1, fuss - 17, 2, 2, pk);             // Hals
  r(c, x + 1, fuss - 19, 3, 2, pk); p(c, x + 4, fuss - 18, '#2a1810');            // Kopf, Schnabel
  r(c, x + 1, fuss - 21, 3, 2, '#d83a3a'); p(c, x + 3, fuss - 22, '#f4f4f4');     // Mütze
  const bunt = ['#ff4a4a', '#5aff6a', '#4a8aff', '#ffd040'];
  for (let i = 0; i < 4; i++) { const lx = x - 3 + i * 2, ly = fuss - 11 + (i % 2); p(c, lx, ly, bunt[(i + Math.floor(t * 2)) % 4]); L.push({ x: lx, y: ly, f: bunt[(i + Math.floor(t * 2)) % 4], halo: 2, an: 0.9 }); }
}
/** Drehorgel-Wichtel: Kasten auf Stelzen, der Wichtel kurbelt. */
function drehorgel(c, x, fuss, t) {
  r(c, x - 4, fuss - 9, 8, 6, '#8a3a2a'); r(c, x - 4, fuss - 9, 8, 1, '#c86a3a'); r(c, x - 3, fuss - 7, 6, 2, '#e8c030');
  r(c, x - 3, fuss - 3, 1, 3, '#5a3219'); r(c, x + 2, fuss - 3, 1, 3, '#5a3219');
  const k = Math.floor(t * 4) % 4;   // Kurbel dreht sich
  p(c, x + 4, fuss - 7, '#3a3a40'); p(c, x + 5 + (k === 1 ? 1 : 0), fuss - 8 + (k === 2 ? 2 : k === 0 ? 0 : 1), '#3a3a40');
  wichtelKlein(c, x + 7, fuss, t, 1);
  if (Math.floor(t * 2) % 2) { p(c, x - 2, fuss - 12, '#f4f4f4'); p(c, x - 1, fuss - 13, '#f4f4f4'); }   // Note
  else { p(c, x + 1, fuss - 13, '#f4f4f4'); p(c, x + 2, fuss - 14, '#f4f4f4'); }
}
/** Wetterhahn-Rentier auf dem First: Stange, Pfeil, Rentier, das sich dreht. */
function wetterhahn(c, x, y, t) {
  const e = '#3a3a44';
  r(c, x, y - 12, 1, 12, e); r(c, x - 3, y - 4, 7, 1, e);                         // Stange, Kreuz
  const s = Math.sin(t * 0.7) > 0 ? 1 : -1;                                        // Blickrichtung
  r(c, x - 3, y - 15, 6, 3, e); r(c, x - 3 + (s > 0 ? 0 : 5), y - 12, 1, 2, e); r(c, x + 2 - (s > 0 ? 0 : 5), y - 12, 1, 2, e);   // Körper, Beine
  r(c, x + (s > 0 ? 3 : -4), y - 18, 2, 3, e);                                     // Hals/Kopf
  p(c, x + (s > 0 ? 3 : -3), y - 20, e); p(c, x + (s > 0 ? 5 : -5), y - 20, e); p(c, x + (s > 0 ? 4 : -4), y - 21, e);   // Geweih
  p(c, x + (s > 0 ? 5 : -5), y - 17, '#d83a3a');                                   // rote Nase
}
/** Polarlicht: grüne, langsam wogende Bänder am Nachthimmel. */
function polarlicht(c, G, w, t) {
  const a = Math.min(1, (w.dunkel - 0.25) * 2);
  for (let x = 0; x < 180; x += 1) {
    for (let b = 0; b < 2; b++) {
      const y0 = 22 + b * 14 + Math.sin(x * 0.045 + t * 0.25 + b * 2) * 8 + Math.sin(x * 0.11 - t * 0.4) * 3;
      const h = 10 + Math.sin(x * 0.07 + t * 0.3 + b) * 4;
      const st = (0.5 + 0.5 * Math.sin(x * 0.09 + t * 0.6 + b * 3)) * a * (b ? 0.18 : 0.26);
      c.fillStyle = `rgba(${b ? '120,240,190' : '90,255,150'},${st.toFixed(3)})`;
      c.fillRect(x, Math.round(y0), 1, Math.round(h));
    }
  }
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
  const lv = S.variante('strassenlaterne');
  if (lv === 1) {
    // Tannenkranz mit roter Schleife am Mast
    // direkt unter dem Kopf - weiter unten verdeckt ihn das Standdach
    for (let a = 0; a < 16; a++) { const wi = a / 16 * Math.PI * 2; p(c, x + Math.round(Math.cos(wi) * 3), k - 26 + Math.round(Math.sin(wi) * 3), a % 3 ? '#2f6a2a' : '#3f8a3a'); }
    r(c, x - 1, k - 23, 3, 2, '#d83a3a'); p(c, x - 2, k - 21, '#b02828'); p(c, x + 2, k - 21, '#b02828');
    for (const [bx, by] of [[-3, -27], [2, -29], [3, -25]]) p(c, x + bx, k + by, '#e83a3a');
  } else if (lv === 2) {
    // Doppellaterne: geschwungener Arm nach links mit zweitem Kopf
    for (let i = 0; i < 7; i++) p(c, x - 1 - i, k - 30 - Math.round(Math.sin(i / 6 * Math.PI) * 2), e);
    const x2 = x - 8;
    r(c, x2 - 2, k - 34, 5, 6, e); r(c, x2 - 1, k - 33, 3, 4, '#f2dc98'); r(c, x2, k - 33, 1, 4, h);
    r(c, x2 - 2, k - 35, 5, 1, e); r(c, x2 - 1, k - 36, 3, 1, e); p(c, x2, k - 37, '#c8a040');
    if (w.schnee > 0) r(c, x2 - 1, k - 36, 3, 1, '#f4f8fb');
    L.push({ rect: [x2 - 1, k - 33, 3, 4], f: '#ffd88a', halo: 14, an: 1 });
  }
}

function laterne(c, L, x, fuss, t) {
  r(c, x, fuss - 18, 1, 18, '#2a2a30'); r(c, x - 1, fuss - 1, 3, 1, '#2a2a30');
  r(c, x - 2, fuss - 23, 5, 5, '#2a2a30'); r(c, x - 1, fuss - 22, 3, 3, '#ffd88a'); r(c, x - 2, fuss - 24, 5, 1, '#2a2a30');
  L.push({ rect: [x - 1, fuss - 22, 3, 3], f: '#ffd88a', halo: 14, an: 1 });
  // Lichtfleck auf Gehweg und Straße, damit sie nachts nicht so dunkel sind
  L.push({ fleck: [x + 0.5, fuss + 9, 20, 7], f: '#ffd88a', an: 1 });
}

function fackel(c, L, x, fuss, t, n = 0) {
  r(c, x, fuss - 14, 1, 14, '#6a4226'); r(c, x - 1, fuss - 16, 3, 2, '#3a2a1a');
  const fl = Math.sin(t * 13 + n * 2) > 0;
  r(c, x - 1, fuss - 19, 3, 3, '#ff8a20'); p(c, x, fuss - 20 - (fl ? 1 : 0), '#ffd040'); p(c, x, fuss - 18, '#fff0a0');
  L.push({ x, y: fuss - 18, f: '#ff9a40', halo: 12, an: 0.85 + 0.15 * Math.sin(t * 11 + n) });
  L.push({ fleck: [x + 0.5, fuss + 9, 18, 6], f: '#ff9a40', an: 0.8 });
}
function lavalampe(c, L, x, fuss, t, n = 0) {
  const farbe = n ? ['#a040e0', '#ff60c0'] : ['#ff4a2a', '#ffb030'];
  r(c, x - 1, fuss - 3, 3, 3, '#2a2a32'); r(c, x - 2, fuss - 1, 5, 1, '#2a2a32');
  r(c, x - 1, fuss - 12, 3, 9, farbe[0]); r(c, x, fuss - 13, 1, 1, '#2a2a32');
  for (let i = 0; i < 2; i++) { const y = fuss - 4 - Math.round((Math.sin(t * 0.8 + i * 3 + n) * 0.5 + 0.5) * 7); r(c, x - (i ? 1 : 0), y, 2, 2, farbe[1]); }
  L.push({ rect: [x - 1, fuss - 12, 3, 9], f: farbe[1], halo: 10, an: 0.8 });
}
function lichterbogen(c, L, G, t, v = 0) {
  if (v === 2) {
    // Zuckerstangen-Tor: dicker rot-weißer Bogen, oben ein Stern
    for (let i = 0; i <= 40; i++) {
      const a = Math.PI * i / 40;
      const x = Math.round(80 - Math.cos(a) * 9), y = Math.round(G - 13 - Math.sin(a) * 20);
      const f = Math.floor(i / 3) % 2 ? '#f4f4f4' : '#d83a3a';
      r(c, x, y, 2, 2, f);
    }
    r(c, 79, G - 37, 3, 3, '#ffe060'); L.push({ x: 80, y: G - 36, f: '#ffe060', halo: 6, an: 0.9 });
    return;
  }
  // Variante 1: Tunnel aus drei Bögen, nach hinten kleiner und höher
  const boegen = v === 1 ? [[0, 1], [-3, 0.82], [-6, 0.66]] : [[0, 1]];
  boegen.forEach(([dy, sk], bi) => {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI * i / 24;
      pts.push([Math.round(80 - Math.cos(a) * 9 * sk), Math.round(G - 13 + dy - Math.sin(a) * 20 * sk)]);
    }
    pts.forEach(([x, y], i) => {
      p(c, x, y, '#3a3a2a');
      if (i % 2 === 0) {
        const f = S.bunt('bogen') ? BUNT[(i / 2 + bi) % BUNT.length] : WARM;
        p(c, x, y, f); L.push({ x, y, f, halo: 3, an: 1 - bi * 0.2 });
      }
    });
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
  // Gemütliche Pause (du warst 5 Minuten nicht da): kleine „z" steigen auf
  if (helfer.length && S.wichtelRuhen()) for (let i = 0; i < 2; i++) {
    const a = (t * 0.6 + i * 0.5) % 1, zx = x0 + 12 + i * 12 + Math.round(a * 4), zy = G - 32 - Math.round(a * 8);
    if (a < 0.85) { r(c, zx, zy, 3, 1, '#e8eef8'); p(c, zx + 1, zy + 1, '#e8eef8'); r(c, zx, zy + 2, 3, 1, '#e8eef8'); }
  }
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
  if (S.zeigt('girlande')) {
    const gv = S.variante('girlande');
    if (gv === 1) {
      // Wimpelkette: kleine Dreiecke in bunt an einer Schnur
      for (let x = x0 - 1; x < x1 + 1; x++) p(c, x, markise + 7, '#5a4a3a');
      for (let x = x0, i = 0; x < x1 - 2; x += 4, i++) { const f = ['#d83a3a', '#e8c030', '#3a8ad8', '#3aa84a'][i % 4]; r(c, x, markise + 8, 3, 1, f); p(c, x + 1, markise + 9, f); }
    } else if (gv === 2) {
      // Stechpalme: dunkle gezackte Blätter, dicke rote Beeren
      for (let x = x0 - 1; x < x1 + 1; x++) { p(c, x, markise + 7 + (x % 3 === 0 ? 1 : 0), '#1f4a24'); if (x % 2) p(c, x, markise + 8, '#2a5e2c'); }
      for (let x = x0 + 2; x < x1 - 1; x += 7) { r(c, x, markise + 8, 2, 2, '#e8202a'); p(c, x, markise + 8, '#ff6a6a'); }
    } else for (let x = x0 - 1; x < x1 + 1; x++) { p(c, x, markise + 7 + (Math.sin(x * 0.8) > 0 ? 1 : 0), '#2f6a2a'); if (x % 6 === 0) p(c, x, markise + 8, '#d83a3a'); }
  }
  const sls = S.stufe('standlicht');
  if (S.zeigt('standlicht')) for (let x = x0 + 1, i = 0; x < x1; x += (sls >= 2 ? 2 : 4), i++) {
    const f = S.bunt('stand') ? BUNT[i % BUNT.length] : WARM;
    birne(c, L, x, markise + 9, f, HALO[sls] || 3, lichtHell(i, t, sls), birnenForm('standlicht'), i);
  }
  if (S.zeigt('standlicht')) L.push({ rect: [x0 + 2, G - 34, x1 - x0 - 4, 12], f: '#ffb860', halo: 10, an: 0.35 });
  // Tresen
  r(c, x0, G - 22, x1 - x0, 12, '#8a5a32');
  for (let y = G - 19; y < G - 10; y += 3) r(c, x0, y, x1 - x0, 1, '#6a4222');
  r(c, x0 - 1, G - 23, x1 - x0 + 2, 2, '#a8703a');
  if (w.schnee > 0) r(c, x0, G - 24, x1 - x0, 1, '#f6f9fc');
  // Plätzchendose aus der Backstube (10.10.): eine Auslage vorn an der
  // Tresenkante - auf der Theke selbst lag der Teller über den Wichtelköpfen
  const dose = S.dose();
  if (dose.length) {
    const DF = { guss: '#fbf6ee', puder: '#f4ecd8', schoko: '#5a3220', gruen: '#5aa84a', marmelade: '#c8283a' };
    const n = Math.min(8, Math.ceil(dose.length / 4)), tb = n * 4 + 3, tx = Math.round((x0 + x1) / 2 - tb / 2), ty = G - 17;
    r(c, tx, ty, tb, 1, '#f4f4f8'); r(c, tx + 1, ty + 1, tb - 2, 1, '#a8a8b6');   // Tablett mit Halter
    r(c, tx + 1, ty + 2, 1, 1, '#6a4222'); r(c, tx + tb - 2, ty + 2, 1, 1, '#6a4222');
    for (let i = 0; i < n; i++) {
      const rz = C.BACK_REZEPTE.find((x) => x.id === dose[dose.length - 1 - i]);
      const px = tx + 2 + i * 4;
      r(c, px, ty - 2, 3, 2, '#d89a48'); p(c, px + 1, ty - 2, rz ? DF[rz.deko] : '#e8b870'); r(c, px, ty - 1, 3, 1, '#b07a38');
    }
  }
  if (S.zeigt('musik')) {
    const mv = S.variante('musik');
    const n = (t * 0.8) % 1;
    if (mv === 1) {
      // Blaskapelle: drei Wichtel mit goldenen Trompeten
      for (let i = 0; i < 3; i++) {
        const bx = x0 + 2 + i * 4, hop = Math.floor(t * 3 + i) % 2;
        r(c, bx, G - 26 - hop, 3, 3, ['#3aa84a', '#c82828', '#3a8ad8'][i]); r(c, bx, G - 28 - hop, 3, 2, '#f2c9a0');
        p(c, bx + 1, G - 29 - hop, '#c82828'); p(c, bx + 3, G - 27 - hop, '#e8c030'); p(c, bx + 4, G - 28 - hop, '#e8c030');
      }
    } else if (mv === 2) {
      // Elvis-Wichtel: weißer Anzug, schwarze Tolle, Gitarre
      const hop = Math.floor(t * 4) % 2;
      r(c, x0 + 4, G - 27 + hop, 4, 4, '#f4f4f4'); r(c, x0 + 4, G - 30 + hop, 4, 3, '#f2c9a0');
      r(c, x0 + 3, G - 32 + hop, 5, 2, '#1a1a1a'); p(c, x0 + 8, G - 31 + hop, '#1a1a1a');
      r(c, x0 + 7, G - 26 + hop, 4, 2, '#a8642e'); r(c, x0 + 10, G - 28 + hop, 1, 3, '#6a4226');
    } else {
      r(c, x0 + 2, G - 28, 6, 5, '#3a3a44'); p(c, x0 + 4, G - 26, '#8a8a9a'); p(c, x0 + 6, G - 26, '#8a8a9a');
    }
    p(c, x0 + 5 + Math.sin(n * 6) * 2, G - 32 - n * 10, '#ffffff');
  }
  if (S.zeigt('schild')) {
    const sv = S.variante('schild');
    if (sv === 1) {
      // Leuchtreklame: dunkle Tafel, pinke Neonschrift, die ab und zu flackert
      r(c, x0 + 10, markise - 11, 28, 9, '#1a1426'); r(c, x0 + 14, markise - 2, 1, 2, '#3a3a44'); r(c, x0 + 33, markise - 2, 1, 2, '#3a3a44');
      const an = !(Math.floor(t * 3) % 11 === 0);
      pixText(c, 'PUNSCH', x0 + 12, markise - 9, an ? '#ff6ad0' : '#6a3a5a', null);
      if (an) L.push({ rect: [x0 + 12, markise - 9, 24, 5], f: '#ff6ad0', halo: 6, an: 0.7 });
    } else if (sv === 2) {
      // Drehende Riesentasse über dem Stand
      const mx = x0 + 24, my = markise - 8;
      const b = Math.max(1, Math.round(Math.abs(Math.cos(t * 1.6)) * 7));
      r(c, mx - b, my - 6, b * 2, 9, '#c82828'); r(c, mx - b, my - 3, b * 2, 2, '#f4f4f4');
      const seite = Math.cos(t * 1.6) > 0 ? 1 : -1;
      if (b > 2) { r(c, mx + seite * (b + 1) - (seite < 0 ? 1 : 0), my - 4, 1, 4, '#c82828'); p(c, mx + seite * b, my - 4, '#c82828'); p(c, mx + seite * b, my - 1, '#c82828'); }
      r(c, mx - 1, my + 3, 2, 2, '#6a4222');
      for (let i = 0; i < 3; i++) { const a = (t * 0.6 + i / 3) % 1; p(c, mx - 2 + i * 2 + Math.round(Math.sin(a * 6) ), my - 8 - Math.round(a * 6), '#eef2f6'); }
    } else {
      r(c, x0 + 10, markise - 11, 28, 9, '#6a4222'); r(c, x0 + 11, markise - 10, 26, 7, '#f0e0b0');
      r(c, x0 + 14, markise - 2, 1, 2, '#6a4222'); r(c, x0 + 33, markise - 2, 1, 2, '#6a4222');
      pixText(c, 'PUNSCH', x0 + 12, markise - 9, '#b02020', null);
    }
  }
  if (S.zeigt('heizpilz')) {
    const hx = x0 - 2;   // links neben dem Stand - rechts ging er am Bildrand unter
    const hv = S.variante('heizpilz');
    const fl = Math.floor(t * 8) % 2;
    if (hv === 1) {
      // Feuerschale auf drei Beinen
      r(c, hx - 3, G - 17, 7, 2, '#3a3a40'); r(c, hx - 2, G - 15, 5, 1, '#3a3a40');
      r(c, hx - 2, G - 14, 1, 4, '#3a3a40'); r(c, hx + 2, G - 14, 1, 4, '#3a3a40'); r(c, hx, G - 14, 1, 4, '#3a3a40');
      r(c, hx - 2, G - 20, 5, 3, '#ff7a20'); p(c, hx - 1 + fl, G - 22, '#ffd040'); p(c, hx + 1 - fl, G - 21, '#ffd040'); p(c, hx, G - 23 - fl, '#ff9a30');
      L.push({ x: hx, y: G - 19, f: '#ff8a40', halo: 12, an: 0.8 + 0.2 * Math.sin(t * 7) });
    } else if (hv === 2) {
      // Feuertonne mit Marshmallow-Stöcken
      r(c, hx - 3, G - 20, 7, 10, '#5a5a62'); r(c, hx - 3, G - 17, 7, 1, '#3a3a42'); r(c, hx - 3, G - 13, 7, 1, '#3a3a42');
      r(c, hx - 2, G - 22, 5, 2, '#ff7a20'); p(c, hx - 1 + fl, G - 24, '#ffd040'); p(c, hx + 1 - fl, G - 23, '#ff9a30');
      for (let i = 0; i < 5; i++) { p(c, hx + 3 + i, G - 22 - i, '#8a6a3a'); p(c, hx - 3 - i, G - 22 - i, '#8a6a3a'); }
      r(c, hx + 2, G - 22, 2, 2, '#f4f0e8'); r(c, hx - 3, G - 22, 2, 2, '#f4f0e8');
      L.push({ x: hx, y: G - 22, f: '#ff8a40', halo: 12, an: 0.8 + 0.2 * Math.sin(t * 7) });
    } else {
      r(c, hx, G - 36, 1, 26, '#6a6a72'); r(c, hx - 1, G - 11, 3, 1, '#6a6a72');
      r(c, hx - 3, G - 38, 7, 2, '#8a8a92');
      r(c, hx - 1, G - 36, 3, 2, '#ff7a30');
      L.push({ rect: [hx - 1, G - 36, 3, 2], f: '#ff8a40', halo: 12, an: 0.8 + 0.2 * Math.sin(t * 5) });
    }
  }
}

// ---------------------------------------------------------------------------
// Straße: Gäste
// ---------------------------------------------------------------------------
// Heiligabend (10.10.): Das Dorf steht mit Kerzen vor dem Haus und singt.
// Feste Farben (neueFarben würfelt - die Leute flackerten sonst je Bild).
const SAENGER = [
  { x: 7, typ: 'erwachsen', farben: { mantel: '#3a5a8a', hut: '#c83030', schal: '#f4f0e8', haut: '#f2c9a0', haar: '#5a3a22' } },
  { x: 13, typ: 'kind', farben: { mantel: '#c84a3a', hut: '#2f7a3a', schal: '#f4f0e8', haut: '#e8b890', haar: '#3a2a1a' } },
  { x: 19, typ: 'oma', farben: { mantel: '#6a4a8a', hut: '#c83030', schal: '#e8c030', haut: '#f2c9a0', haar: '#d8d8e0' } },
  { x: 26, typ: 'opa', farben: { mantel: '#4a5a3a', hut: '#6a4a36', schal: '#c83030', haut: '#e8b890', haar: '#d8d8e0' } },
  { x: 32, typ: 'kind', farben: { mantel: '#2f6a8a', hut: '#e8c030', schal: '#c83030', haut: '#c89070', haar: '#2a1a1a' } },
  { x: 38, typ: 'erwachsen', farben: { mantel: '#8a3a4a', hut: '#f4f0e8', schal: '#2f7a3a', haut: '#6a4028', haar: '#1a1a1a', frau: true } },
];
function saenger(c, L, fuss, t) {
  for (const g of SAENGER) {
    figurKlein(c, { ...g, phase: 0, laeuft: false }, g.x, fuss, t);
    // Kerze vor der Brust
    const kl = g.typ === 'kind', kx = g.x + 2, ky = fuss - (kl ? 7 : 9);
    r(c, kx, ky, 1, 2, '#f4f0e0');
    const fl = Math.sin(t * 9 + g.x) > 0.6 ? 1 : 0;
    p(c, kx, ky - 1 - fl, '#ffd060');
    if (L) L.push({ x: kx, y: ky - 1, f: '#ffc860', halo: 4, an: 0.8 + 0.15 * Math.sin(t * 7 + g.x) });
  }
  // Noten steigen auf
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.35 + i / 3) % 1, nx = Math.round(10 + i * 11 + Math.sin(ph * 6 + i) * 3), ny = Math.round(fuss - 20 - ph * 22);
    if (ph > 0.85) continue;
    const f = '#fff4d0';
    p(c, nx, ny + 2, f); p(c, nx + 1, ny + 2, f); r(c, nx + 1, ny - 1, 1, 3, f); p(c, nx + 2, ny - 1, f);
  }
}

/**
 * Was VOR den Leuten steht oder fährt (17.10. zusammengefasst): Schneeball-
 * vorrat und eigener Schneemann vorn auf dem Gehweg, Kutsche und Rodelkinder
 * auf der Straße. Nachts kommt das auch auf die Gäste-Ebene - gemeldet waren
 * Rodelkinder HINTER den Gästen, weil nur die Leute nochmal gemalt wurden.
 */
function vorDenLeuten(c, L, G, GW, t, w, opts) {
  if (S.zeigt('g_vorrat')) schneeballVorrat(c, 12, GW - 1);
  if (Z.schnee() > 0) eigenerSchneemann(c, SCHNEEMANN_X, GW + SCHNEEMANN_DY, S.schneemannStufe(), S.schneemannBereit(), t);
  if (S.zeigt('m_kutsche') && !opts.karte) kutsche(c, L, G, t, w);
  if (S.zeigt('s_kinder') && !opts.karte) rodelkinder(c, GW, t, w);
}

function strasse(c, G, t, L = null) {
  const fuss = G - 3;
  if (S.heiligabendAbend() || S.chorJetzt()) saenger(c, L, fuss - 1, t);   // Heiligabend und Adventssonntag
  if (S.lauf.haendler) haendlerKarren(c, S.lauf.haendler, fuss, t);
  const liste = [...S.lauf.gaeste].sort((a, b) => a.x - b.x);
  const frost = Z.tagesWetter().art === 'frost';
  for (const g of liste) {
    if (g.x < -10 || g.x > 190) continue;
    figurKlein(c, g, g.x, fuss, t);
    // Klirrende Kälte (10.10.): kleine Atemwolken vor dem Gesicht
    if (frost) {
      const a = ((t * 0.7 + g.phase * 0.37) % 1.6) / 0.6;
      if (a < 1) { c.fillStyle = `rgba(240,246,252,${(0.8 * (1 - a)).toFixed(2)})`; c.fillRect(Math.round(g.x + 3 + a * 3), Math.round(fuss - (g.typ === 'kind' ? 10 : 13) - a * 2), a > 0.5 ? 2 : 1, a > 0.5 ? 2 : 1); }
    }
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
  // Silvester: das Feuerwerk steht seit 11.10. in feuerwerk() (Raketen, Funken, Knall)
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
    // Vorberechneter Schein, nur noch gestempelt (siehe scheinBild)
    c.globalAlpha = Math.min(1, a);
    c.drawImage(scheinBild(l.f, l.halo), cx - l.halo, cy - l.halo, l.halo * 2, l.halo * 2);
  }
  c.globalAlpha = 1;
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
/**
 * Weicher Lichtschein als fertiges Bildchen je Farbe und Größe. Vorher wurde
 * für JEDES Licht in JEDEM Bild ein neuer Farbverlauf angelegt - bei voll
 * geschmücktem Haus nachts hunderte, gemeldet als „Handy wird warm".
 * Gezeichnet in 4-facher Auflösung, damit der Verlauf beim Verkleinern weich bleibt.
 */
const scheine = new Map();
// ---------------------------------------------------------------------------
// Lichtkarte fürs Haus (12.10.) - wie licht.js in den Minispielen, aber mit
// den Lichtern aus `L` als Lichtinseln. Nachts deutlich heller als der
// Grundton der Minispiele, weil hier gespielt wird (Gäste, Tresen, Deko).
// ---------------------------------------------------------------------------
let lkE = null, lkC = null, mkE = null, mkC = null;
const LK_TAG = [214, 218, 234], LK_NACHT = [122, 132, 184], LK_ABEND = [196, 140, 150];
function lichtKarte(w, wd, G, GW, L) {
  if (!lkE) { lkE = document.createElement('canvas'); lkC = lkE.getContext('2d'); }
  if (lkE.width !== wd || lkE.height !== G) { lkE.width = wd; lkE.height = G; }
  const li = w.li, hell = li.hell, c = lkC;
  const misch = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  let g = misch(LK_NACHT, LK_TAG, hell);
  if (li.daemmer > 0) g = misch(g, LK_ABEND, li.daemmer * 0.6);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  c.fillStyle = `rgb(${g})`; c.fillRect(0, 0, wd, G);
  c.globalCompositeOperation = 'lighter';
  // Die Wintersonne: tief und seitlich, wandert über den Tag; in der Dämmerung orange
  if (hell > 0) {
    const sx = wd * (0.05 + 0.9 * Math.max(0, Math.min(1, li.sonne))), sy = GW - 120, rad = 200;
    const grd = c.createRadialGradient(sx, sy, 0, sx, sy, rad);
    const f = li.daemmer > 0.05 ? '255,170,110' : '255,244,220';
    grd.addColorStop(0, `rgba(${f},${(0.6 * hell).toFixed(3)})`); grd.addColorStop(0.5, `rgba(${f},${(0.25 * hell).toFixed(3)})`); grd.addColorStop(1, `rgba(${f},0)`);
    c.fillStyle = grd; c.fillRect(0, 0, wd, G);
  }
  // Mondlicht von oben: der Schnee am Boden bleibt nachts lesbar
  if (hell < 1) {
    const lg = c.createLinearGradient(0, GW - 30, 0, G);
    lg.addColorStop(0, 'rgba(150,170,220,0)'); lg.addColorStop(1, `rgba(150,170,220,${(0.18 * (1 - hell)).toFixed(3)})`);
    c.fillStyle = lg; c.fillRect(0, GW - 30, wd, G - GW + 30);
  }
  // Jedes Licht hellt seine Umgebung auf - nachts voll, tagsüber kaum
  const st = 0.15 + 0.85 * w.dunkel;
  for (const l of L) {
    if (l.verdeckt) continue;
    const a = l.an * st * (l.sichtbar ?? 1);
    if (a <= 0.02) continue;
    if (l.fleck) {
      const [x, y, rx, ry] = l.fleck;
      c.save(); c.translate(x, y); c.scale(1, ry / rx);
      c.globalAlpha = Math.min(1, a * 1.3);
      c.drawImage(scheinBild(l.f, Math.round(rx * 1.2)), -rx * 1.2, -rx * 1.2, rx * 2.4, rx * 2.4);
      c.restore();
      continue;
    }
    const cx = l.rect ? l.rect[0] + l.rect[2] / 2 : l.x + 0.5;
    const cy = l.rect ? l.rect[1] + l.rect[3] / 2 : l.y + 0.5;
    // Kleine Birnen (Lichterketten) gibt es zu Hunderten - einzeln kaum,
    // zusammen sonst eine milchige Fläche. Fenster und Laternen tragen das Licht.
    const gross = l.halo >= 5;
    const h = Math.round(gross ? l.halo * 2.4 + 4 : l.halo * 1.6 + 2);
    c.globalAlpha = Math.min(1, a * (gross ? 1.1 : 0.22));
    c.drawImage(scheinBild(l.f, h), cx - h, cy - h, h * 2, h * 2);
  }
  c.globalAlpha = 1;
  // Weiche dunkle Ränder, nachts etwas stärker
  c.globalCompositeOperation = 'source-over';
  const v = 0.12 + 0.14 * w.dunkel;
  const vg = c.createRadialGradient(wd / 2, G * 0.55, G * 0.3, wd / 2, G * 0.55, G * 0.85);
  vg.addColorStop(0, 'rgba(14,16,40,0)'); vg.addColorStop(1, `rgba(14,16,40,${v.toFixed(3)})`);
  c.fillStyle = vg; c.fillRect(0, 0, wd, G);
  return lkE;
}
/** Ebene `e` mit der Lichtkarte multiplizieren - nur dort, wo auf ihr etwas
 *  steht (der Himmel liegt nicht auf der Ebene). `weiss` 0..1 schwächt ab. */
function multipliziere(e, karte, G, weiss) {
  const wd = e.canvas.width;
  if (!mkE) { mkE = document.createElement('canvas'); mkC = mkE.getContext('2d'); }
  if (mkE.width !== wd || mkE.height !== G) { mkE.width = wd; mkE.height = G; }
  mkC.globalCompositeOperation = 'source-over'; mkC.globalAlpha = 1;
  if (weiss > 0) { mkC.fillStyle = '#fff'; mkC.fillRect(0, 0, wd, G); mkC.globalAlpha = 1 - weiss; }
  else mkC.clearRect(0, 0, wd, G);
  mkC.drawImage(karte, 0, 0); mkC.globalAlpha = 1;
  mkC.globalCompositeOperation = 'destination-in';
  mkC.drawImage(e.canvas, 0, 0, wd, G, 0, 0, wd, G);
  mkC.globalCompositeOperation = 'source-over';
  e.save(); e.globalCompositeOperation = 'multiply'; e.drawImage(mkE, 0, 0); e.restore();
}
function scheinBild(farbe, halo) {
  const k = farbe + '|' + halo;
  let b = scheine.get(k);
  if (b) return b;
  if (scheine.size > 300) scheine.clear();   // wechselnde Farben (Lichtershow) sollen den Vorrat nicht endlos füllen
  const n = Math.max(2, Math.ceil(halo * 2 * 4));
  b = document.createElement('canvas'); b.width = b.height = n;
  const g = b.getContext('2d'), m = n / 2;
  const grd = g.createRadialGradient(m, m, 0, m, m, m);
  grd.addColorStop(0, hexA(farbe, 0.45)); grd.addColorStop(1, hexA(farbe, 0));
  g.fillStyle = grd; g.fillRect(0, 0, n, n);
  scheine.set(k, b);
  return b;
}
function pixel(e, G) { return e.getImageData(0, 0, 180, G).data; }
/** Gemerkte Verdeckung je Licht (Schlüssel = Position), zuletzt geprüft zur Zeit t. */
const DECKUNG_TAKT = 0.2;   // s
const deckung = { t: -99, n: -1, nNeu: -2, je: new Map() };
const lichtSchluessel = (l) => (l.rect ? 'r' + l.rect.map(Math.round).join(',') : Math.round(l.x) + ',' + Math.round(l.y));
function deckungMerken(L, t) {
  deckung.je.clear();
  for (const l of L) if (!l.fleck && (l.verdeckt || l.maske)) deckung.je.set(lichtSchluessel(l), { verdeckt: l.verdeckt, maske: l.maske, sichtbar: l.sichtbar });
  deckung.t = t; deckung.n = L.length;
}
function deckungNehmen(L) {
  if (!deckung.je.size) return;
  for (const l of L) {
    if (l.fleck) continue;
    const d = deckung.je.get(lichtSchluessel(l));
    if (d) { l.verdeckt = d.verdeckt; l.maske = d.maske; l.sichtbar = d.sichtbar; }
  }
}
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
  futterhaus: [132, -48], kranz: [80, -38], tuerbogenkranz: [80, -55], lichter_dach: [80, -66], fensterstern: [80, -80], schwibbogen: [56, -44],
  lichter_bunt: [80, -66], nussknacker: [96, -32], lichter_fenster: [104, -50], lichter_zaun: [60, -18],
  eiszapfen: [80, -64], dach_nikolaus: [110, -90], lichtershow: [80, -50],
  tanne: [18, -40], tanne_lichter: [18, -40], tanne_kugeln: [18, -35], tanne_stern: [18, -56],
  baum_girlande: [133, -74], schneemann: [45, -26], schneefrau: [55, -26], schneekind: [64, -24],
  rentier_licht: [107, -28], schlitten: [116, -24], lichterbogen: [80, -28],
  girlande: [152, -37], zuckerstangen: [36, -28], standlicht: [152, -35], schild: [152, -54],
  musik: [134, -28], heizpilz: [127, -30], baenke: [152, -20], stand: [152, -50],
  strassenlaterne: [163, -70], zaun_girlande: [60, -17], schornstein: [102, -80], festbeleuchtung: [80, -80], holz: [117, -30], tuer: [80, -34], zaun: [60, -16], kamin: [56, -50],
  laternen: [80, -24], auf_geschenke: [37, -28], auf_lebkuchenmann: [28, -26], auf_rodel: [62, -32], auf_engel: [60, -98], h_kugel: [7, -24], h_flamingo: [119, -16], h_orgel: [169, -12], h_hahn: [52, -110], l_hasen: [56, -21], l_eich: [42, -82], l_reh: [22, -25], h_polar: [90, -120], m_rad: [22, -62], m_stern: [147, -77], m_fenster: [80, -52], m_herzen: [152, -34], m_kutsche: [90, 4], c_kugeln: [128, -90], c_dachbaum: [92, -100], c_wald: [170, -60], s_kinder: [60, -10], s_wok: [117, -52], s_hang: [168, -70], e_schlittschuhe: [70, -54], g_vorrat: [12, -4], g_lauscher: [36, -44], g_fahne: [31, -71], e_pinguin: [97, -8], e_schnuppen: [100, -130], farbe_weiss: [80, -50], farbe_rot: [80, -50], farbe_lebkuchen: [80, -50], farbe_eis: [80, -50], farbe_chalet: [80, -50],
};
export function ortVon(id) { const o = ORTE[id]; return o ? { x: o[0], y: o[1] } : null; }
const funken = [];
/**
 * Funkeln an einer Stelle der Welt. `text` (z. B. „+3 ♥") steigt dabei über
 * dem Teil auf - nach dem Kauf sieht man so, WAS es gebracht hat, und vor
 * allem WO es hängt (Betatest 02.10.: der Türkranz ging unter).
 */
export function funkeln(x, y, text = '') { funken.push({ x, y, text, t0: performance.now() }); }
const FUNKEL_DAUER = 2400;
function zeichneFunkeln(c, GW) {
  const jetzt = performance.now();
  for (let i = funken.length - 1; i >= 0; i--) {
    const f = funken[i], a = (jetzt - f.t0) / FUNKEL_DAUER;
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
    // Zuletzt der Text auf einem dunklen Schild - zwischen den Funken ging
    // er sonst unter. Er steigt langsam und blinkt zum Schluss aus.
    if (f.text && a > 0.06 && (a < 0.88 || Math.floor(jetzt / 90) % 2)) {
      const w = textBreite(f.text);
      const tx = Math.round(Math.max(2, Math.min(178 - w, cx - w / 2))), ty = Math.round(cy - 18 - a * 10);
      r(c, tx - 2, ty - 2, w + 4, 9, '#2a1810');
      r(c, tx - 2, ty - 2, w + 4, 1, '#5a3a20');
      pixText(c, f.text, tx, ty, '#ffe060', null);
    }
  }
}

// ---------------------------------------------------------------------------
// Der Nikolaus fliegt vorbei (selten). Antippen schenkt Sterne.
// ---------------------------------------------------------------------------
/** Wo ist der Schlitten gerade? `sl.y` ist ein Anteil des freien Himmels. */
export function schlittenPos(sl, G) {
  const k = sl.t / sl.dauer;
  // Unterhalb von Kopfzeile und Zielleiste (bis ~42), sonst war er dahinter
  // versteckt und nicht anzutippen (gemeldet 30.09.)
  return { x: -46 + k * 240, y: 52 + sl.y * Math.max(0, G - 150) + Math.sin(sl.t * 2.2) * 3 };
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
  if (S.zeigt('h_polar') && w.dunkel > 0.25) polarlicht(c, G, w, t);
  if (S.zeigt('e_schnuppen') && w.dunkel > 0.3) sternschnuppen(c, G, t);

  const e = ebeneFuer(c.canvas.width, c.canvas.height);
  // Haus und Straße stehen ein Stück über der Tresenkante; darunter
  // liegt die Fahrbahn. GW ist die Bodenlinie der Welt.
  const GW = G - STRASSE;
  hintergrund(e, GW, w, L, t);
  kahlerBaum(e, GW, w, L, t);
  if (S.zeigt('m_stern')) herrnhuter(e, L, 147, GW - 85, t);
  if (S.zeigt('c_kugeln')) riesenkugeln(e, L, GW);
  boden(e, GW, w);
  if (S.rentierSpuren(w.d)) rentierspuren(e, GW);
  fahrbahn(e, GW, G, w);
  haus(e, GW, w, t, L);
  if (S.zeigt('g_lauscher')) grummelLauscher(e, GW, t);   // lugt an der linken Hausecke hervor
  briefkasten(e, 86, GW - 40, t, L);
  if (S.zeigt('m_fenster')) fensterbilder(e, GW);
  if (S.zeigt('c_dachbaum')) dachbaum(e, L, 92, GW - 94, t, w);
  if (S.zeigt('s_wok')) wandWok(e, 118, GW - 52);
  if (S.zeigt('e_schlittschuhe')) wandSchlittschuhe(e, 70, GW - 58);
  // Verdeckung: Alle Lichter werden erst am Ende über das Bild gemalt. Was
  // danach DAVOR gezeichnet wird (Tanne vor der Kirche, Leute vor dem Zaun),
  // würde sonst von ihnen durchleuchtet. Deshalb ein Schnappschuss nach jeder
  // Tiefenstufe; hat sich das Pixel eines Lichts bis zum Schluss verändert,
  // steht etwas davor.
  const pruefen = w.dunkel >= 0.05;   // Lichter sieht man nur bei Dämmerung und Nacht
  // Die Schnappschüsse sind teuer (gemessen 4,8 von 8 ms je Bild) - und die
  // Verdeckung ändert sich kaum. Also nur 5-mal je Sekunde neu prüfen und
  // dazwischen das gemerkte Ergebnis je Licht übernehmen (deckungMerken/-Nehmen)
  const neuPruefen = pruefen && (opts.karte || Math.abs(t - deckung.t) >= DECKUNG_TAKT || deckung.n !== deckung.nNeu);
  const stufen = neuPruefen ? [{ bis: L.length, bild: pixel(e, G) }] : null;
  // Was an der Hauswand steht (ganz hinten im Garten), kommt zuerst - Tanne,
  // Schneefamilie, Zaun und Laternen stehen davor
  if (S.zeigt('auf_geschenke')) geschenke(e, 37, GW - 24);   // linke Hausecke, zwischen Tanne und Schneemann
  if (S.zeigt('auf_rodel')) rodel(e, 60, GW - 24, w);        // lehnt hinter dem Schneekind, ragt darüber
  if (S.zeigt('tanne')) tanne(e, GW, w, t, L);
  if (S.zeigt('zuckerstangen')) {
    const zv = S.variante('zuckerstangen');
    if (zv === 1) { lebkuchenmaennchen(e, 33, GW - 19); lebkuchenmaennchen(e, 40, GW - 20); }
    else if (zv === 2) { riesenlolli(e, 33, GW - 19, ['#e8303a', '#f8f4f0']); riesenlolli(e, 40, GW - 20, ['#3aa84a', '#ffe060']); }
    else { zuckerstange(e, 33, GW - 19, false); zuckerstange(e, 38, GW - 20, true); }
  }
  // Das Futterhaus hängt im kahlen Baum - im Vorgarten stand es den
  // Zuckerstangen im Weg (bis 11.10. das Vogelhäuschen aus Türchen 18)
  if (S.zeigt('futterhaus')) { futterhaus(e, L, FUTTER_X, GW + FUTTER_DY, S.variante('futterhaus'), S.futterVoll(), S.hat('kal_knoedel'), t); voegel(e, GW, t, L); }
  if (S.zeigt('schneemann')) {
    const v = S.variante('schneemann');
    if (v === 1) schneeburg(e, 45, GW - 18);
    else if (v === 2) liegestuhl(e, 45, GW - 18, t);
    else schneefigur(e, 45, GW - 18, 4, 'mann');
  }
  if (S.zeigt('schneefrau')) { schneefigur(e, 55, GW - 18, 4, 'frau'); schneefrauExtra(e, 55, GW - 18, S.variante('schneefrau')); }
  if (S.zeigt('schneekind')) { schneefigur(e, 64, GW - 18, 3, 'kind'); schneekindExtra(e, L, 64, GW - 18, S.variante('schneekind'), t); }
  if (S.zeigt('rentier_licht')) [lichterRentier, lichterElch, lichterDino][S.variante('rentier_licht')](e, L, 101, GW - 18, t);
  if (S.zeigt('schlitten')) [schlitten, bollerwagen, rasenmaeher][S.variante('schlitten')](e, 109, GW - 18, t, L);
  if (S.zeigt('zaun')) zaun(e, GW, w, L, t);
  if (S.zeigt('lichterbogen')) lichterbogen(e, L, GW, t, S.variante('lichterbogen'));
  if (S.zeigt('laternen')) { const lf = [laterne, fackel, lavalampe][S.variante('laternen')]; lf(e, L, 69, GW - 12, t, 0); lf(e, L, 91, GW - 12, t, 1); }
  if (S.zeigt('auf_lebkuchenmann')) lebkuchenmann(e, 28, GW - 18);
  // Vom fahrenden Händler (09.10.)
  if (S.zeigt('h_kugel')) schneekugel(e, L, 7, GW - 13, t, w);

  // Rechts hinter dem Stand, neben dem Baum; der Mast ist lang, damit der
  // Kopf auf halber Dachhöhe über dem Stand steht
  if (S.zeigt('strassenlaterne')) alteLaterne(e, L, 163, GW - 10, t, w, 24);
  stand(e, GW, w, t, L);
  if (S.zeigt('baenke')) baenke(e, L, GW, t, w, S.variante('baenke'));   // bis 11.10. gar nicht gezeichnet
  if (S.zeigt('m_herzen')) lebkuchenherzen(e, GW, t);
  // Aus der Waldlichtung: Hasen und Reh vor dem Zaun, mit den Füßen gerade
  // auf dem Gehweg (der beginnt bei GW-12). Bis 11.10. bei GW-2 mitten auf
  // dem Gehweg, dann kurz bei GW-13 im Vorgarten - auf Wunsch 2 px tiefer.
  if (S.zeigt('l_hasen')) hasenfamilie(e, 50, GW - 11, t);
  if (S.zeigt('l_reh')) gartenReh(e, 22, GW - 11, t);
  if (S.zeigt('e_pinguin')) pinguin(e, 97, GW - 1, t);
  const pl = S.plakette();
  if (pl != null) plakette(e, L, 116, GW - 62, pl, t);
  // Vor dem Stand (sonst verdeckt er sie): Flamingo vor dem Schlitten, Drehorgel rechts.
  // Garten rechts der Tür (09.10. neu verteilt, vorher standen Laterne und
  // Nussknacker auf demselben Pixel, Flamingo mitten im Lichter-Rentier)
  if (S.zeigt('h_flamingo')) flamingo(e, L, 119, GW - 4, t);
  if (S.zeigt('h_orgel')) drehorgel(e, 169, GW - 3, t);
  if (neuPruefen) stufen.push({ bis: L.length, bild: pixel(e, G) });
  if (!opts.ohneGaeste) strasse(e, GW, t, L);
  vorDenLeuten(e, L, G, GW, t, w, opts);
  if (neuPruefen) { verdecke(L, stufen, pixel(e, G)); if (!opts.karte) deckungMerken(L, t); }
  else if (pruefen) deckungNehmen(L);
  if (!opts.karte) deckung.nNeu = L.length;

  // Licht und Schatten (12.10., vorher eine flache Abdunklung): die Ebene
  // wird mit einer LICHTKARTE multipliziert - Grundton je Tageszeit, die
  // Wintersonne seitlich, und jedes Licht aus `L` hellt seine Umgebung auf
  const karte = lichtKarte(w, e.canvas.width, G, GW, L);
  multipliziere(e, karte, G, 0);
  // Menschen nachts heller: noch einmal auf eine eigene Ebene, nur halb so
  // stark beleuchtet, und über die Welt gelegt (gleiche Pixel)
  if (w.dunkel > 0.05 && !opts.ohneGaeste) {
    const ge = gastEbeneFuer(e.canvas.width, e.canvas.height);
    strasse(ge, GW, t);
    vorDenLeuten(ge, [], G, GW, t, w, opts);   // nachts liegt die Gäste-Ebene darüber - sonst stünden diese hinter den Leuten
    multipliziere(ge, karte, G, 0.5);
    e.drawImage(ge.canvas, 0, 0);
  }
  c.drawImage(ebene, 0, 0, 180, G, 0, 0, 180, G);
  if (S.zeigt('kal_goldstern')) goldstern(c, L, t, GW);
  lichter(c, L, Math.max(w.dunkel, 0.0));
  const fw = opts.karte ? 0 : S.feuerwerk(d);
  if (!opts.karte && (fw > 0 || fwRaketen.length || fwFunken.length)) feuerwerk(c, GW, fw, dt);
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

// ---------------------------------------------------------------------------
// Futterhaus und Vögel (11.10.)
// ---------------------------------------------------------------------------
export const FUTTER_X = 132, FUTTER_DY = -42;   // hängt im kahlen Baum
/** Plätze der Vögel (Fußlinie), relativ zum Futterhaus: Dach links/rechts, Brett links/rechts */
const VOGEL_PLATZ = [[-3, -19], [3, -19], [-7, -12], [7, -12]];   // 17.10.: weiter auseinander, die runden Vögel sind breiter
function futterhaus(c, L, x, fuss, v, voll, knoedel, t) {
  r(c, x, fuss - 23, 1, 5, '#8a7a5a');   // Schnur zum Ast
  if (v === 2) {
    // Futterglocke: Körner in Glockenform an einer roten Schleife
    r(c, x - 1, fuss - 19, 3, 1, '#c82828'); p(c, x - 2, fuss - 20, '#c82828'); p(c, x + 2, fuss - 20, '#c82828');
    const k = voll ? ['#c8a060', '#a87a40', '#e0c080'] : ['#8a7a6a', '#6a5a4a', '#9a8a7a'];
    for (let i = 0; i < 6; i++) { const w = 1 + Math.min(i, 3); r(c, x - w, fuss - 18 + i, w * 2 + 1, 1, k[i % 2]); }
    for (let i = 0; i < 6; i++) p(c, x - 2 + (i * 3) % 5, fuss - 17 + (i * 2) % 5, k[2]);
    r(c, x - 4, fuss - 12, 9, 1, '#6a4a2a');   // Sitzring
  } else {
    const dach = v === 1 ? ['#f4f8fc', '#d8e4f0'] : ['#c82828', '#a82020'];
    r(c, x - 4, fuss - 16, 9, 4, '#a8703a'); r(c, x - 4, fuss - 16, 1, 4, '#8a5a2e'); r(c, x + 4, fuss - 16, 1, 4, '#8a5a2e');
    r(c, x - 5, fuss - 17, 11, 1, dach[0]); r(c, x - 4, fuss - 18, 9, 1, dach[0]); r(c, x - 3, fuss - 19, 7, 1, dach[1]);
    r(c, x - 1, fuss - 15, 2, 2, '#3a2a1a');   // Flugloch
    r(c, x - 6, fuss - 12, 13, 1, '#6a4a2a');   // Futterbrett
    if (v === 1) { r(c, x - 1, fuss - 11, 3, 3, '#c83a2a'); p(c, x, fuss - 10, '#ffd070'); L.push({ x, y: fuss - 10, f: '#ffd070', halo: 3, an: 0.9 }); }
  }
  if (voll) for (let i = 0; i < 5; i++) p(c, x - 4 + i * 2 + (i % 2), fuss - 13, ['#d8b060', '#a87a40'][i % 2]);   // Körner
  if (knoedel) {
    r(c, x + 6, fuss - 21, 1, 4, '#8a7a5a');
    r(c, x + 5, fuss - 17, 3, 3, '#b8945a'); p(c, x + 5, fuss - 17, '#d8b878'); p(c, x + 7, fuss - 15, '#8a6a3a'); r(c, x + 5, fuss - 18, 3, 1, '#3a8a3a');   // grünes Netz
  }
}
/** Ein Vogel, Fußlinie y, Blick nach rechts (`links` = Blick nach links). */
export function zeichneVogel(c, x, y, art, opt = {}) {
  const v = C.VOEGEL.find((q) => q.id === art) || C.VOEGEL[0];
  if (art === 'waldkauz') {
    // Größer und aufrecht: Federohren, heller Gesichtsschleier, gelbe Augen
    const [r0, s0, d0] = v.f;
    r(c, x - 2, y - 5, 5, 6, r0); r(c, x - 1, y - 6, 3, 1, r0); p(c, x - 2, y - 6, d0); p(c, x + 2, y - 6, d0);
    r(c, x - 1, y - 2, 3, 3, s0); p(c, x, y - 1, d0); p(c, x - 1, y + 1, '#3a2a1a'); p(c, x + 1, y + 1, '#3a2a1a');   // Bauch, Krallen
    r(c, x - 2, y - 5, 5, 2, s0);
    const blinzelt = opt.t != null && Math.sin(opt.t * 1.3 + x) > 0.97;
    const auge = blinzelt ? s0 : '#ffd040';
    p(c, x - 1, y - 4, auge); p(c, x + 1, y - 4, auge); p(c, x, y - 3, '#3a2a1a');
    if (opt.L && !blinzelt) { opt.L.push({ x: x - 1, y: y - 4, f: '#ffd040', halo: 1, an: 0.7 }); opt.L.push({ x: x + 1, y: y - 4, f: '#ffd040', halo: 1, an: 0.7 }); }
    if (opt.fliegt) { const hoch = opt.fluegel; r(c, x - 4, y - (hoch ? 5 : 2), 2, 1, r0); r(c, x + 3, y - (hoch ? 5 : 2), 2, 1, r0); }
    return;
  }
  // 17.10.: aufgeplusterte Federkugel statt 4 x 3 Strichvogel (Nutzerwunsch
  // „chonky und süßer"): runder Bauch, runder Kopf mit Auge und Bäckchen,
  // kleiner Schnabel, Schwanz keck nach oben. Passt in 7 x 7 (dx -3..3,
  // dy -6..0) - so bleiben Album und Steckbrief (×4 = 28) unverändert.
  const [oben, brust, bauch] = v.f, d = opt.links ? -1 : 1;
  const P = (dx, dy, f) => p(c, x + dx * d, y + dy, f);
  const dunkel = ton(oben, -0.25);
  const wange = { kohlmeise: '#f4f4f0', blaumeise: '#f4f4f0', spatz: '#d8c8b0' }[art] || brust;
  const k = opt.pickt ? 1 : 0;   // beim Picken nickt der Kopf nach vorn
  // Körper: Rücken und Flügel hinten, Brust vorn, Bauch unten
  P(-3, -4, oben); P(-3, -3, dunkel);                                    // Schwanz
  P(-2, -3, oben); P(-1, -3, oben); P(2, -3, brust);
  P(-2, -2, dunkel); P(-1, -2, dunkel); P(0, -2, brust); P(1, -2, brust); P(2, -2, brust);
  P(-1, -1, bauch); P(0, -1, bauch); P(1, -1, bauch); P(2, -1, ton(bauch, -0.12));
  // Kopf: Käppchen, Auge, Wange mit rosa Bäckchen, Schnabel
  P(0, -5 + k, oben); P(1, -5 + k, oben);
  P(-1, -4 + k, oben); P(0, -4 + k, oben); P(1, -4 + k, '#1a1a22'); P(2, -4 + k, wange); P(3, -4 + k, '#e0a040');
  P(0, -3 + k, wange); P(1, -3 + k, mische(wange, '#ff7088', 0.45));
  if (art === 'seidenschwanz') { P(-1, -6 + k, oben); P(0, -6 + k, oben); P(2, -4 + k, '#2a1a1a'); }   // Haube, Maske
  if (art === 'blaumeise') P(0, -4 + k, '#2a3a6a');                                                     // Augenstreif
  if (opt.fliegt) {
    const hoch = opt.fluegel;   // Flügelschlag
    if (hoch) { P(-1, -4, dunkel); P(-2, -5, dunkel); } else { P(-1, 0, dunkel); P(-2, 0, dunkel); }
  } else { P(0, 0, '#b07a50'); P(1, 0, '#b07a50'); }                                                   // Füßchen
}
/**
 * Vogel fürs Album, den Steckbrief und das große Futterhaus (18.10.), in
 * Spielpixeln auf 28 x 28, Blick nach rechts, Füße auf Zeile 25. Nach dem
 * Wunsch-Vorbild: runder Federball mit großem Kopf, dunkler Umriss, ein Auge,
 * kleiner Schnabel, dunklerer Flügel, Schwanz nach links unten - sonst nichts.
 */
const VOGEL_FARBEN = {
  spatz:     { base: '#a88660', licht: '#c8a880', dunkel: '#6a4c34', rand: '#4a3424', schnabel: '#d8b060', kappe: '#7a5a3c', brust: (x, y) => (y >= 9 && x >= 11 ? '#dccaac' : null) },
  kohlmeise: { base: '#7a9a6a', licht: '#a8c488', dunkel: '#4e6a50', rand: '#2a3a2a', schnabel: '#3a3a40', kappe: '#26262c', brust: (x, y) => (y >= 11 && x >= 9 ? '#f0d040' : x >= 12 && y >= 4 && y <= 8 ? '#f4f4f0' : null) },
  blaumeise: { base: '#6a9ae0', licht: '#a0c4f4', dunkel: '#3a68b0', rand: '#24488a', schnabel: '#f0b030', kappe: '#4a80d0', brust: (x, y) => (y >= 12 && x >= 12 ? '#f0e060' : x >= 12 && y >= 5 && y <= 8 ? '#f4f8ff' : null) },
  rotkehlchen: { base: '#a08060', licht: '#c0a078', dunkel: '#6a4c34', rand: '#4a3424', schnabel: '#3a3a40', brust: (x, y) => (x >= 14 && y >= 3 ? '#ee7a30' : y >= 9 && x >= 12 ? '#ee7a30' : null) },
  gimpel:    { base: '#8a8a9a', licht: '#aaaabc', dunkel: '#4a4a58', rand: '#2e2e3a', schnabel: '#2a2a30', kappe: '#1e1e24', brust: (x, y) => (x >= 13 && y >= 5 ? '#e8505e' : y >= 10 && x >= 10 ? '#e8505e' : null) },
  seidenschwanz: { base: '#b89a88', licht: '#d8c0a8', dunkel: '#7a5a4a', rand: '#5a3e32', schnabel: '#3a3a40', kappe: '#a07860', haube: true },
};
export function zeichneVogelAlbum(c, art) {
  const ox = 4, oy = 3;
  const P = (x, y, f) => p(c, ox + x, oy + y, f);
  if (art === 'waldkauz') {
    const v = C.VOEGEL.find((q) => q.id === art);
    const [braun, hellbraun, dunkelbraun] = v.f, rand = '#3a2a1a';
    const maske = (x, y) => ((x - 14) / 8.2) ** 2 + ((y - 15.5) / 9) ** 2 <= 1;
    for (let y = 2; y <= 25; y++) for (let x = 4; x <= 24; x++) {
      if (!maske(x, y)) continue;
      const rand4 = !maske(x - 1, y) || !maske(x + 1, y) || !maske(x, y - 1) || !maske(x, y + 1);
      p(c, x, y, rand4 ? rand : (((x - 14) / 5) ** 2 + ((y - 19) / 5.5) ** 2 <= 1) ? hellbraun : y < 12 && x < 11 ? ton(braun, 0.12) : braun);
    }
    for (const ex of [10.5, 17.5]) { for (let y = 8; y <= 14; y++) for (let x = 6; x <= 22; x++) if (((x - ex) / 3.8) ** 2 + ((y - 11) / 3.8) ** 2 <= 1) p(c, x, y, ton(hellbraun, 0.25)); }
    for (const ex of [10, 17]) { r(c, ex, 10, 3, 3, '#2a1a10'); p(c, ex, 10, '#ffffff'); }
    r(c, 13, 13, 2, 2, '#e8b840'); p(c, 13, 15, '#a88030');
    r(c, 11, 25, 3, 1, '#a07040'); r(c, 15, 25, 3, 1, '#a07040');
    for (let y = 17; y <= 22; y += 2) { p(c, 13, y, dunkelbraun); p(c, 15, y, dunkelbraun); }
    return;
  }
  const f = VOGEL_FARBEN[art] || VOGEL_FARBEN.spatz;
  const kopf = (x, y) => ((x - 12.5) / 5.4) ** 2 + ((y - 6) / 5.2) ** 2 <= 1;
  const rumpf = (x, y) => ((x - 11) / 7.8) ** 2 + ((y - 14) / 6.2) ** 2 <= 1;
  const schwanz = (x, y) => x >= 1 && x <= 6 && y >= 12 + (6 - x) * 0.5 && y <= 15 + (6 - x) * 0.6;
  const drin = (x, y) => kopf(x, y) || rumpf(x, y) || schwanz(x, y);
  const fluegel = (x, y) => ((x - 9.5) / 5.8) ** 2 + ((y - 14.5) / 3.2) ** 2 <= 1;
  for (let y = -1; y <= 22; y++) for (let x = 0; x <= 21; x++) {
    if (!drin(x, y)) continue;
    if (!drin(x - 1, y) || !drin(x + 1, y) || !drin(x, y - 1) || !drin(x, y + 1)) { P(x, y, f.rand); continue; }
    let col = f.base;
    if (schwanz(x, y) && !rumpf(x, y)) col = f.dunkel;
    else if (fluegel(x, y)) col = (y >= 16 && x <= 11) ? ton(f.dunkel, 0.18) : f.dunkel;
    else {
      if (kopf(x, y) && y <= 3 && f.kappe) col = f.kappe;
      else if (kopf(x, y) && x <= 10 && y <= 4) col = f.licht;
      if (f.brust) { const b = f.brust(x, y); if (b) col = b; }
      else if (rumpf(x, y) && x >= 14 && y >= 11) col = f.licht;
    }
    P(x, y, col);
  }
  if (f.haube) { P(8, 0, f.base); P(9, 0, f.kappe); P(7, 1, f.base); P(8, 1, f.rand); P(14, 5, '#2a1a1a'); P(15, 6, '#2a1a1a'); P(1, 16, '#e8c060'); P(2, 17, '#e8c060'); }
  P(15, 5, '#16161e'); P(15, 6, '#16161e');                                  // Auge
  P(18, 6, f.schnabel); P(19, 6, f.schnabel); P(18, 7, f.schnabel); P(19, 7, ton(f.schnabel, -0.2)); P(18, 8, ton(f.schnabel, -0.25));   // Schnabel
  for (const lx of [8, 12]) { P(lx, 21, '#8a5a2e'); P(lx, 22, '#8a5a2e'); P(lx - 1, 22, '#8a5a2e'); }                                   // Beine
}

// ---------------------------------------------------------------------------
// Futterhaus groß (18.10.): die Szene im Fenster. 132 x 92 Spielpixel, 1:1.
// ---------------------------------------------------------------------------
export const FSZ_W = 132, FSZ_H = 92;
const albumSprites = new Map();
function albumSprite(art) {
  let k = albumSprites.get(art);
  if (!k) { k = document.createElement('canvas'); k.width = 28; k.height = 28; zeichneVogelAlbum(k.getContext('2d'), art); albumSprites.set(art, k); }
  return k;
}
/** Plätze im großen Bild: Fußpunkt (x, y) je Platz 0 Dach links, 1 Dach rechts, 2 Brett links, 3 Brett rechts. */
const FSZ_CX = 66;
const FSZ_PLATZ = [[FSZ_CX - 21, 27], [FSZ_CX + 21, 27], [FSZ_CX - 26, 60], [FSZ_CX + 26, 60]];   // Brett: Füße AUF der Oberkante (y 60)
/**
 * Zeichnet Himmel, Ast, Futterhaus mit Futterberg (`stufe` 0..5), Meisenknödel
 * und die Vögel aus `S.lauf.voegel`. `zu` hält Krümel und Schritt-Merker
 * zwischen den Bildern (vom Fenster angelegt).
 */
export function zeichneFutterSzene(c, t, o, zu) {
  const W = FSZ_W, H = FSZ_H, cx = FSZ_CX, hell = o.hell;
  // Himmel in Bändern, nachts dunkler
  for (let y = 0; y < H; y++) {
    const tag = mische('#9cc0e4', '#e2eef8', y / H), nacht = mische('#141c3c', '#2c3a6a', y / H);
    r(c, 0, y, W, 1, mische(nacht, tag, hell));
  }
  if (hell < 0.4) for (let i = 0; i < 12; i++) { const sx = Math.floor(Z.hash(i * 7) * W), sy = Math.floor(Z.hash(i * 11) * 40); if (Math.sin(t * 2 + i) > -0.3) p(c, sx, sy, '#fff6d0'); }
  // Eine ganze Reihe Tannen am unteren Rand, unten angeschnitten (hinten heller, vorn dunkler)
  r(c, 0, 84, W, 8, '#1f4a30');
  for (const [reihe, kopf0, versatz, hellen] of [[0, 70, 0, 0.18], [1, 77, 6, 0]]) {
    for (let tx = -2 + versatz; tx < W + 6; tx += 12) {
      const top = kopf0 + Math.floor(Z.hash(tx * 3 + reihe * 17) * 6);
      for (let i = 0; top + i < H; i++) {
        const half = Math.floor(i / 2.6) + 1, sn = o.schnee && i % 7 < 2;
        r(c, tx - half, top + i, half * 2 + 1, 1, sn ? '#e8f0f8' : ton(i % 7 === 3 ? '#2a5a3a' : '#2f6240', hellen));
      }
    }
  }
  // Ast mit Zweigen, Schnee obendrauf
  r(c, 0, 8, W, 4, '#5a4030'); r(c, 0, 8, W, 1, '#7a5a42'); r(c, 0, 11, W, 1, '#3a2a20');
  for (const [bx, by] of [[14, 12], [38, 12], [96, 12], [118, 12]]) { r(c, bx, by, 2, 5, '#5a4030'); r(c, bx + 2, by + 3, 4, 1, '#5a4030'); }
  if (o.schnee) for (let x = 0; x < W; x++) if (Z.hash(x * 5) < 0.8) p(c, x, 7, '#f6f9fc');
  const stufe = o.stufe, v = o.variante || 0;
  const wood = '#a8703a', woodD = '#8a5a2e', woodL = '#c08a50';
  const korn = ['#d8b060', '#a87a40', '#e8c878', '#3a3028'];
  const spots = FSZ_PLATZ.map((q) => q.slice());
  if (v === 2) {
    // Futterglocke: aus Körnern, schrumpft mit dem Futter; zwei Stangen als Sitzplätze
    const ring = 62, hoehe = stufe === 0 ? 0 : 6 + stufe * 6;
    r(c, cx, 12, 2, ring - hoehe - 14, '#8a7a5a');
    r(c, cx - 3, ring - hoehe - 3, 7, 1, '#c82828'); p(c, cx - 4, ring - hoehe - 4, '#c82828'); p(c, cx + 4, ring - hoehe - 4, '#c82828');
    for (let i = 0; i < hoehe; i++) {
      const w = Math.min(4 + Math.floor(i * 0.9), 14); const y = ring - hoehe + i;
      for (let x = -w; x <= w; x++) p(c, cx + x, y, korn[(x * 3 + y * 5 + 40) % 4 === 0 ? 3 : (x + y) % 3 === 0 ? 1 : (x + y) % 3 === 1 ? 0 : 2]);
    }
    r(c, cx - 18, ring, 37, 2, '#6a4a2a'); r(c, cx - 18, ring + 2, 37, 1, '#4a3018');
    for (const sx of [cx - 21, cx + 21]) { r(c, sx, 12, 1, 22, '#8a7a5a'); r(c, sx - 8, 34, 17, 2, '#6a4a2a'); }
    spots[0] = [cx - 21, 34]; spots[1] = [cx + 21, 34]; spots[2] = [cx - 14, 62]; spots[3] = [cx + 14, 62];
  } else {
    const dach = v === 1 ? ['#f4f8fc', '#d8e4f0', '#e8f0f8'] : ['#c82828', '#a82020', '#d84040'];
    r(c, cx, 12, 2, 8, '#8a7a5a');   // Schnur
    // Dach
    for (let i = 0; i < 14; i++) { const hb = 6 + Math.round(i * 2.1); r(c, cx + 1 - hb, 20 + i, hb * 2, 1, i === 13 ? dach[1] : i % 4 === 3 ? dach[2] : dach[0]); }
    r(c, cx - 36, 34, 74, 2, ton(wood, -0.4));
    // Haus: Pfosten, Rückwand, Flugloch
    r(c, cx - 25, 36, 52, 24, woodD);
    for (let x = cx - 24; x < cx + 26; x += 6) r(c, x, 36, 1, 24, ton(woodD, -0.2));
    r(c, cx - 25, 36, 3, 24, wood); r(c, cx + 24, 36, 3, 24, wood); r(c, cx - 25, 36, 1, 24, woodL);
    r(c, cx - 5, 40, 11, 14, '#2a1a10'); r(c, cx - 4, 39, 9, 1, '#2a1a10'); r(c, cx - 3, 38, 7, 1, '#2a1a10');
    r(c, cx - 2, 55, 5, 2, woodL);   // Sitzstange am Flugloch
    // Futterbrett mit Rand
    r(c, cx - 43, 60, 87, 3, '#6a4a2a'); r(c, cx - 43, 60, 87, 1, '#8a6a42'); r(c, cx - 43, 63, 87, 1, '#4a3018');
    // Futterberg (18.10. kleiner): je Stufe breiter und höher
    if (stufe > 0) {
      const bw = [0, 10, 18, 26, 34, 42][stufe], bh = [0, 1, 3, 4, 6, 7][stufe];
      for (let x = -bw / 2; x <= bw / 2; x++) {
        const hx = Math.round(bh * (1 - Math.pow(Math.abs(x) / (bw / 2), 1.5)));
        for (let k = 0; k < Math.max(1, hx); k++) p(c, cx + Math.round(x), 59 - k, korn[(Math.round(x) * 3 + k * 5 + 40) % 7 === 0 ? 3 : (Math.round(x) + k) % 3 === 0 ? 1 : (Math.round(x) + k) % 3 === 1 ? 0 : 2]);
      }
    }
    if (v === 1) {   // Laterne unter dem Brett
      r(c, cx, 63, 1, 3, '#3a2a1a'); r(c, cx - 3, 66, 7, 7, '#c83a2a'); r(c, cx - 2, 67, 5, 5, '#ffd070'); r(c, cx - 3, 65, 7, 1, '#3a2a1a');
    }
  }
  // Meisenknödel am rechten Ast
  if (o.knoedel) {
    r(c, 112, 12, 1, 20, '#8a7a5a'); r(c, 109, 32, 7, 7, '#b8945a'); r(c, 109, 32, 7, 1, '#3a8a3a');
    for (let i = 0; i < 6; i++) p(c, 110 + (i * 3) % 5, 33 + (i * 2) % 5, i % 2 ? '#8a6a3a' : '#d8b878');
  }
  // Vögel: Anflug, Sitzen, Abflug (wie draußen, nur größer)
  zu.krumen = zu.krumen || []; zu.merk = zu.merk || {}; zu.treffer = []; zu.texte = zu.texte || [];
  for (const b of o.voegel) {
    const [zx, zy] = spots[b.platz] || spots[0], FLUG = 1.2;
    const seed = (b.platz * 1.7 + b.art.length * 0.9);
    let x = zx, y = zy, fliegt = false, schaut = b.platz % 2 === 0 ? 1 : -1;   // zur Mitte
    if (b.t < FLUG) { const k = b.t / FLUG, e = k * k * (3 - 2 * k), sx = b.links ? -20 : W + 20; x = sx + (zx - sx) * e; y = zy - 40 * (1 - e) - Math.sin(k * Math.PI) * 8; fliegt = true; schaut = x < zx ? 1 : -1; }
    else if (b.t > b.bleibt) { const k = Math.min(1, (b.t - b.bleibt) / FLUG), e = k * k, ex = b.links ? W + 24 : -24; x = zx + (ex - zx) * e; y = zy - 50 * e; fliegt = true; schaut = ex > zx ? 1 : -1; }
    else {
      const sit = b.t - FLUG;
      if (Math.floor(sit / (3 + (seed % 2.5)) + seed) % 3 === 0) schaut = -schaut;   // schaut sich mal um
      const unten = b.platz >= 2;
      // Hüpfer (18.10. öfter): alle ~1,3 s ein Satz zu einer neuen Stelle, dort bleibt der Vogel
      // sitzen (am Brett ±12, auf dem Dach ±5 Pixel um den Platz) - kein Zurückspringen mehr
      const ph = sit * 0.75 + seed * 0.37, hn = Math.floor(ph), hk = ph - hn;
      const stelle = (k) => Math.sin(k * 2.3 + seed * 3.1) * (unten ? 12 : 5);
      const von = stelle(hn - 1), nach = stelle(hn), hupf = hk < 0.2;
      x += Math.round(von + (nach - von) * Math.min(1, hk / 0.2));
      if (hupf) { y -= Math.sin(hk / 0.2 * Math.PI) * (unten ? 5 : 4); schaut = nach >= von ? 1 : -1; }
      const pickt = !hupf && unten && stufe > 0 && Math.sin(sit * 4.2 + seed * 7) > 0.45;
      if (pickt) { y += 1; x += schaut * 2; }
      const m = zu.merk[b.art + b.platz];
      if (pickt && !m) zu.krumen.push({ x: x + schaut * 11, y: 58, vx: (Math.random() - 0.5) * 14, vy: -18, t: 0 });
      zu.merk[b.art + b.platz] = pickt;
    }
    const sp = albumSprite(b.art);
    const fl = fliegt ? Math.sin(t * 26) * 2 : 0;
    if (!fliegt) zu.treffer.push({ b, x: Math.round(x), y: Math.round(y) });   // für das Antippen (ui.js)
    c.save();
    c.translate(Math.round(x), Math.round(y + fl));
    if (schaut < 0) c.scale(-1, 1);
    c.drawImage(sp, -14, -25);
    c.restore();
  }
  // Krümel fallen
  zu.krumen = zu.krumen.filter((k) => k.t < 1);
  for (const k of zu.krumen) { k.t += 1 / 60; k.vy += 90 * (1 / 60); k.x += k.vx / 60; k.y += k.vy / 60; if (k.y < 84) p(c, Math.round(k.x), Math.round(k.y), '#d8b060'); }
  // "+10 ★" steigt über dem angetippten Vogel auf
  zu.texte = zu.texte.filter((x) => x.t < 1.1);
  for (const x of zu.texte) { x.t += 1 / 60; const s = x.text + ' ★'; pixText(c, s, Math.round(x.x - textBreite(s) / 2), Math.round(x.y - x.t * 16), x.t > 0.8 ? '#fff0a0' : '#ffe060'); }
  // Schneefall, nachts Abdunkelung
  if (o.schnee) for (let i = 0; i < 16; i++) p(c, Math.floor((i * 37 + Math.sin(t + i) * 4 + t * 6) % W), Math.floor((i * 23 + t * (12 + (i % 4) * 4)) % H), '#ffffff');
  if (hell < 0.9) { c.fillStyle = `rgba(14,20,50,${(0.9 - hell) * 0.45})`; c.fillRect(0, 0, W, H); }
  if (v === 1 && hell < 0.9) { c.fillStyle = 'rgba(255,200,100,0.18)'; c.fillRect(cx - 9, 62, 19, 16); }
}
function voegel(c, GW, t, L) {
  const fx = FUTTER_X, fy = GW + FUTTER_DY;
  for (const v of S.lauf.voegel) {
    const [dx, dy] = VOGEL_PLATZ[v.platz] || VOGEL_PLATZ[0];
    const zx = fx + dx, zy = fy + dy;
    const FLUG = 1.2;
    let x = zx, y = zy, fliegt = false, links = v.platz % 2 === 1;
    if (v.t < FLUG) {
      // Anflug von der Seite, in einem flachen Bogen
      const k = v.t / FLUG, e = k * k * (3 - 2 * k), sx = v.links ? -8 : 188;
      x = sx + (zx - sx) * e; y = zy - 30 * (1 - e) - Math.sin(k * Math.PI) * 6; fliegt = true; links = !v.links;
    } else if (v.t > v.bleibt) {
      const k = Math.min(1, (v.t - v.bleibt) / FLUG), e = k * k, ex = v.links ? 190 : -10;
      x = zx + (ex - zx) * e; y = zy - 40 * e; fliegt = true; links = v.links;
    }
    const pickt = !fliegt && Math.sin(v.t * 5 + v.platz) > 0.6;
    zeichneVogel(c, Math.round(x), Math.round(y), v.art, { links, fliegt, fluegel: Math.floor(t * (v.art === 'waldkauz' ? 6 : 14)) % 2, pickt: pickt && v.art !== 'waldkauz', t, L });
  }
}

// ---------------------------------------------------------------------------
// Der eigene Schneemann (11.10.): wächst mit jedem Tag
// ---------------------------------------------------------------------------
// 17.10.: neben dem Schneeballvorrat (x 12) und VOR den Leuten gezeichnet -
// bei x 66 hinter den Gästen ging er unter
export const SCHNEEMANN_X = 27, SCHNEEMANN_DY = -1;
function kugel(c, x, y, rad, f = '#f6f9fc', s = '#cfd9e8') {
  for (let dy = -rad; dy <= rad; dy++) { const w = Math.round(Math.sqrt(rad * rad - dy * dy + rad * 0.6)); r(c, x - w, y + dy, w * 2 + 1, 1, dy > rad * 0.4 ? s : f); }
}
function eigenerSchneemann(c, x, fuss, stufe, bereit, t) {
  // Schneehaufen, aus dem er entsteht
  if (stufe < 2) haufen(c, x, fuss);
  if (stufe === 1) kugel(c, x + 3, fuss - 2, 2);
  const bauchY = fuss - 4, mitteY = fuss - 10, kopfY = fuss - 14;
  if (stufe >= 2) kugel(c, x, bauchY, 4);
  if (stufe >= 3) kugel(c, x, mitteY, 3);
  if (stufe >= 4) kugel(c, x, kopfY, 2);
  if (stufe >= 5) {
    p(c, x - 1, kopfY - 1, '#1a1a22'); p(c, x + 1, kopfY - 1, '#1a1a22');
    p(c, x + 1, kopfY, '#f08020'); p(c, x + 2, kopfY, '#f08020'); p(c, x + 3, kopfY, '#d86a10');   // Karotte
    p(c, x, mitteY - 1, '#1a1a22'); p(c, x, mitteY + 1, '#1a1a22'); p(c, x, bauchY - 1, '#1a1a22');
  }
  if (stufe >= 6) {
    r(c, x - 2, kopfY - 5, 5, 3, '#1a1a22'); r(c, x - 3, kopfY - 3, 7, 1, '#1a1a22'); r(c, x - 2, kopfY - 3, 5, 1, '#c83a3a');   // Hut mit Band
    for (let i = 0; i < 4; i++) { p(c, x - 4 - i, mitteY - i, '#6a4a2a'); p(c, x + 4 + i, mitteY - i, '#6a4a2a'); }   // Äste
    p(c, x - 7, mitteY - 4, '#6a4a2a'); p(c, x + 7, mitteY - 4, '#6a4a2a');
  }
  if (stufe >= 7) {
    r(c, x - 3, kopfY + 2, 7, 1, '#3a8a4a'); r(c, x + 2, kopfY + 3, 2, 3, '#3a8a4a'); p(c, x - 2, kopfY + 2, '#e8e060'); p(c, x + 1, kopfY + 2, '#e8e060');   // Schal
    r(c, x - 7, fuss - 13, 1, 12, '#8a5a2e'); for (let i = 0; i < 4; i++) r(c, x - 9 + i, fuss - 15 - (i % 2), 1, 3, '#c8a050');   // Besen
  }
  // Heute kann man weiterbauen: es funkelt über dem Haufen
  if (bereit) funkelnBauen(c, x, fuss - 6 - (stufe >= 2 ? stufe * 2 : 0), t);
}
/** Schneehaufen mit blauem Rand - weiß auf weißem Schnee war er nicht zu sehen (gemeldet 18.10.). */
function haufen(c, x, fuss) {
  const rand = '#9fb3cf';
  r(c, x - 7, fuss, 15, 1, rand);
  r(c, x - 6, fuss - 1, 13, 1, '#cfd9e8'); r(c, x - 5, fuss - 2, 11, 1, '#eef4fa'); r(c, x - 4, fuss - 3, 9, 1, '#f6f9fc'); r(c, x - 2, fuss - 4, 5, 1, '#f6f9fc');
  r(c, x - 2, fuss - 5, 5, 1, rand);
  for (const [dx, dy] of [[3, 4], [5, 3], [6, 2], [7, 1]]) { p(c, x - dx, fuss - dy, rand); p(c, x + dx, fuss - dy, rand); }
}
/** Goldenes Funkeln: hier kann man heute weiterbauen. */
function funkelnBauen(c, x, sy, t) {
  const k = Math.floor(t * 3) % 4, g = '#ffe27a', w = '#fffbe0';
  if (k < 3) { p(c, x + 4, sy, w); p(c, x + 3, sy, k === 1 ? w : g); p(c, x + 5, sy, k === 1 ? w : g); p(c, x + 4, sy - 1, g); p(c, x + 4, sy + 1, g); }
  if (k === 2) p(c, x - 4, sy + 3, w);
}

// ---------------------------------------------------------------------------
// Die eigene Schneekatze auf dem Dach (18.10.): wie der Schneemann, eine Stufe am Tag
// ---------------------------------------------------------------------------
// Sitzt links auf der Dachfläche zwischen Eichhörnchen (x 41) und Gaube (ab x 69).
export const KATZE_X = 58, KATZE_DY = -3;   // Fuß = wandO + KATZE_DY
function schneekatze(c, x, fuss, stufe, bereit, t) {
  const rand = '#9fb3cf';
  if (stufe < 2) haufen(c, x, fuss);
  if (stufe === 1) kugel(c, x + 3, fuss - 2, 2);
  if (stufe >= 2) kugel(c, x, fuss - 3, 3);        // Körper
  if (stufe >= 3) kugel(c, x, fuss - 8, 2);        // Kopf
  if (stufe >= 4) { for (const ex of [-2, 2]) { p(c, x + ex, fuss - 11, '#f6f9fc'); p(c, x + ex, fuss - 12, '#f6f9fc'); p(c, x + ex, fuss - 11, '#f0a0b0'); } }   // Ohren
  if (stufe >= 5) {
    p(c, x - 1, fuss - 9, '#1a1a22'); p(c, x + 1, fuss - 9, '#1a1a22'); p(c, x, fuss - 8, '#f08aa0');   // Augen, Nase
    p(c, x - 3, fuss - 8, rand); p(c, x + 3, fuss - 8, rand);                                         // Schnurrhaare
  }
  if (stufe >= 6) { p(c, x + 4, fuss - 1, '#f6f9fc'); p(c, x + 5, fuss - 1, '#f6f9fc'); p(c, x + 5, fuss - 2, '#f6f9fc'); p(c, x + 5, fuss - 3, '#f6f9fc'); p(c, x + 4, fuss - 4, '#f6f9fc'); }   // Schwanz
  if (stufe >= 7) { r(c, x - 2, fuss - 6, 5, 1, '#c83a3a'); p(c, x + 2, fuss - 5, '#c83a3a'); p(c, x, fuss - 5, '#e8c030'); }   // Schal mit Glöckchen
  if (stufe >= 2) { r(c, x - 3, fuss, 7, 1, rand); }   // Standlinie
  if (bereit) funkelnBauen(c, x + 3, fuss - 8 - (stufe >= 2 ? stufe : 0), t);
}

// ---------------------------------------------------------------------------
// Plakette „Schönstes Haus" (11.10.): an der Hauswand rechts
// ---------------------------------------------------------------------------
function plakette(c, L, x, y, platz, t) {
  const f = C.WETTBEWERB.plaetze[platz].f;
  r(c, x - 1, y + 5, 1, 3, '#c83030'); r(c, x + 2, y + 5, 1, 3, '#c83030'); p(c, x - 1, y + 8, '#a82020'); p(c, x + 2, y + 8, '#a82020');   // Bänder
  r(c, x - 1, y, 4, 5, f); r(c, x - 2, y + 1, 6, 3, f); p(c, x, y + 1, '#ffffff'); p(c, x + 1, y + 2, ton(f, -0.3));
  if (Math.floor(t * 2) % 5 === 0) L.push({ x, y: y + 1, f: '#ffffff', halo: 2, an: 0.5 });
}

// ---------------------------------------------------------------------------
// Feuerwerk an Silvester (11.10.): Raketen steigen, platzen, Funken fallen
// ---------------------------------------------------------------------------
const fwRaketen = [], fwFunken = [];
const FW_FARBEN = [['#ff5a5a', '#ffd0c0'], ['#ffe060', '#fff6c0'], ['#5ad0ff', '#d8f4ff'], ['#7ae07a', '#d8ffd8'], ['#ff6adf', '#ffd8f4'], ['#ffffff', '#fff8e0']];
let fwAb = 0;
function feuerwerk(c, GW, staerke, dt) {
  fwAb -= dt;
  if (staerke > 0 && fwAb <= 0) {
    fwAb = (0.25 + Math.random() * 0.9) / staerke;
    fwRaketen.push({ x: 15 + Math.random() * 150, y: GW - 30, zy: 14 + Math.random() * (GW * 0.3), v: 70 + Math.random() * 30, f: FW_FARBEN[Math.floor(Math.random() * FW_FARBEN.length)], spur: [] });
  }
  for (let i = fwRaketen.length - 1; i >= 0; i--) {
    const q = fwRaketen[i];
    q.spur.unshift([Math.round(q.x), Math.round(q.y)]); if (q.spur.length > 4) q.spur.pop();
    q.y -= q.v * dt; q.x += Math.sin(q.y * 0.3) * 0.15;
    if (q.y <= q.zy) {
      fwRaketen.splice(i, 1);
      // Zwei Sorten: Ring (alle gleich schnell) und gefüllte Kugel (verschieden schnell)
      const ring = Math.random() < 0.35, n = ring ? 20 + Math.floor(Math.random() * 8) : 28 + Math.floor(Math.random() * 16), sp = 22 + Math.random() * 18;
      for (let k = 0; k < n; k++) {
        const w = k / n * Math.PI * 2 + Math.random() * 0.25, s = sp * (ring ? 0.85 + Math.random() * 0.15 : Math.sqrt(0.15 + 0.85 * Math.random()));
        fwFunken.push({ x: q.x, y: q.y, vx: Math.cos(w) * s, vy: Math.sin(w) * s, t: 0, life: 1.1 + Math.random() * 0.7, f: q.f });
      }
      fwFunken.push({ x: q.x, y: q.y, vx: 0, vy: 0, t: 0, life: 0.18, f: ['#ffffff', '#ffffff'], blitz: true });
      if (dt > 0) S.hooks.ton('feuerwerk');
    }
  }
  // Raketen: heller Kopf, glühende Spur
  for (const q of fwRaketen) { q.spur.forEach(([x, y], k) => { c.globalAlpha = 0.8 - k * 0.2; p(c, x, y + k, k ? '#ffb060' : '#fff4d0'); }); }
  c.globalAlpha = 1;
  for (let i = fwFunken.length - 1; i >= 0; i--) {
    const f = fwFunken[i];
    f.t += dt;
    if (f.t >= f.life) { fwFunken.splice(i, 1); continue; }
    f.vx *= Math.pow(0.35, dt); f.vy = f.vy * Math.pow(0.35, dt) + 22 * dt;
    f.x += f.vx * dt; f.y += f.vy * dt;
    const k = f.t / f.life;
    if (f.blitz) { c.fillStyle = 'rgba(255,250,230,0.35)'; c.fillRect(Math.round(f.x) - 3, Math.round(f.y) - 3, 7, 7); continue; }
    c.globalAlpha = Math.max(0, 1 - k * k);
    const x = Math.round(f.x), y = Math.round(f.y);
    p(c, x, y, k < 0.3 ? f.f[1] : f.f[0]);
    if (k < 0.5) { c.globalAlpha *= 0.35; p(c, x - 1, y, f.f[0]); p(c, x + 1, y, f.f[0]); p(c, x, y - 1, f.f[0]); p(c, x, y + 1, f.f[0]); }
    // Glitzern am Ende
    if (k > 0.6 && Math.random() < 0.3) { c.globalAlpha = 1; p(c, x, y, '#ffffff'); }
  }
  c.globalAlpha = 1;
}
