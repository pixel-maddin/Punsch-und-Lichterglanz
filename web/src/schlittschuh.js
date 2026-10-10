/*
 * schlittschuh.js - Minispiel „Eisbahn" (10.10.): Ein Wichtel läuft auf dem
 * zugefrorenen Weiher Schlittschuh, die Bahn zieht von rechts nach links
 * vorbei und wird immer schneller. Tippen = springen (über Schneemänner,
 * Steine, Holzstapel und Eislöcher). In der Luft wischen = Tricks:
 * nach oben Salto, nach links Pirouette, nach rechts Grätsche. Mehrere
 * Tricks in einem Sprung sind eine Kombo (Punkte × Anzahl). Wer landet,
 * bevor der Trick fertig ist, stürzt und verliert die Punkte des Sprungs.
 *
 * Gerüst wie die anderen Minispiele: Vollbild-Canvas #minispiel, 180 breit,
 * Schrift über minihud.js, Musik ruht, drei Schwierigkeiten.
 */
import * as C from './config.js?v=202610101357';
import * as Z from './zeit.js?v=202610101357';
import * as T from './ton.js?v=202610101357';
import * as MH from './minihud.js?v=202610101357';
import { r, p, ton } from './pixel.js?v=202610101357';

const $ = (s) => document.querySelector(s);
const W = 180;
const SPRUNG = 195, SCHWERE = 520;          // Luftzeit 2·195/520 = 0,75 s
const TEMPO = [72, 150], BESCHL = 2.2;      // px/s, Zuwachs je Sekunde
const SKATER_X = 44;
export const TRICKS = {
  hoch:   { name: 'SALTO',     dauer: 0.42, punkte: 60 },
  links:  { name: 'PIROUETTE', dauer: 0.34, punkte: 40 },
  rechts: { name: 'GRÄTSCHE',  dauer: 0.28, punkte: 30 },
};
const HINDERNIS = {
  schneemann: { b: 8, h: 15 },
  stein:      { b: 10, h: 6 },
  holz:       { b: 12, h: 9 },
  loch:       { b: 20, h: 0 },   // Eisloch: am Boden, nur Springen hilft
};

let cv = null, c = null, H = 320;
let stufe = C.MINI_STUFEN[1];
let spiel = null, rafId = 0, letzte = 0, fertig = null;
export const istOffen = () => !!spiel;
export const zustand = () => spiel;
const BODEN = () => Math.round(H * 0.64);

function zufall(a, b) { return a + Math.random() * (b - a); }

export function starte(hoehe, beiEnde, stufeNr = 1) {
  stufe = C.MINI_STUFEN[stufeNr] || C.MINI_STUFEN[1];
  H = Math.round(hoehe); fertig = beiEnde;
  cv = $('#miniCv');
  cv.width = W; cv.height = H;
  c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  spiel = neuesSpiel(-3);
  $('#minispiel').classList.remove('versteckt');
  MH.an(W, H);
  T.musikPause(true);
  // Tippen springt, Wischen macht in der Luft einen Trick (vom Boden aus:
  // nach oben wischen springt auch)
  let start = null;
  const pos = (e) => { const rc = cv.getBoundingClientRect(); return { x: (e.clientX - rc.left) / rc.width * W, y: (e.clientY - rc.top) / rc.height * H, t: performance.now() }; };
  cv.onpointerdown = (e) => { start = { ...pos(e), fertig: false }; };
  cv.onpointermove = (e) => {
    if (!start || start.fertig) return;
    const q = pos(e), dx = q.x - start.x, dy = q.y - start.y;
    if (Math.hypot(dx, dy) < 9) return;
    start.fertig = true;
    eingabe(Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? 'hoch' : 'runter') : (dx < 0 ? 'links' : 'rechts'));
  };
  cv.onpointerup = cv.onpointercancel = () => { if (start && !start.fertig) eingabe('tipp'); start = null; };
  window.addEventListener('keydown', taste);
  letzte = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(takt);
}
export function schliesse() {
  spiel = null;
  cancelAnimationFrame(rafId);
  window.removeEventListener('keydown', taste);
  $('#minispiel').classList.add('versteckt');
  MH.aus();
  T.musikPause(false);
}
function taste(e) {
  const k = { ' ': 'tipp', ArrowUp: 'hoch', ArrowLeft: 'links', ArrowRight: 'rechts', w: 'hoch', a: 'links', d: 'rechts' }[e.key];
  if (k) { e.preventDefault(); eingabe(k); }
}

function neuesSpiel(t0) {
  return { t: t0, punkte: 0, x: 0, v: TEMPO[0] * stufe.tempo, y: 0, vy: 0, inLuft: false, trick: null, tricks: [],
    sturz: 0, dinge: [], naechstes: 260, texte: [], funken: [], aus: false, sprung: 0, kombiBest: 0 };
}

/** Eingabe: 'tipp' | 'hoch' | 'links' | 'rechts' | 'runter' */
export function eingabe(art) {
  const g = spiel;
  if (!g || g.t < 0 || g.aus || g.sturz > 0) return;
  if (!g.inLuft) {
    if (art === 'tipp' || art === 'hoch') { g.inLuft = true; g.vy = -SPRUNG; g.tricks = []; g.sprung++; T.spiele('greifen'); }
    return;
  }
  // In der Luft: ein Trick nach dem anderen
  if (g.trick || !TRICKS[art]) return;
  g.trick = { art, t: 0 };
  T.spiele('klick');
}

// ---------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------
function takt(jetzt) {
  if (!spiel) return;
  const dt = Math.min(0.05, (jetzt - letzte) / 1000);
  letzte = jetzt;
  schritt(dt);
  if (!spiel) return;
  zeichne(jetzt / 1000);
  rafId = requestAnimationFrame(takt);
}

function neuesDing(g) {
  // Hindernisse mit Abstand, damit man nach dem Landen wieder springen kann;
  // dazwischen Sterne in Sprunghöhe, manchmal ein großer
  const arten = ['schneemann', 'stein', 'holz', 'loch'];
  const art = arten[Math.floor(Math.random() * arten.length)];
  g.dinge.push({ art, x: g.naechstes, weg: false });
  if (Math.random() < 0.7) g.dinge.push({ art: 'stern', x: g.naechstes + zufall(-6, 6), hoehe: zufall(20, 34), gross: Math.random() < 0.25, weg: false });
  g.naechstes += zufall(150, 240) * (0.85 + g.v / TEMPO[1] * 0.35);
}

function schritt(dt) {
  const g = spiel;
  g.t += dt;
  for (const x of g.texte) x.t += dt;
  g.texte = g.texte.filter((x) => x.t < 1);
  for (const f of g.funken) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 200 * dt; }
  g.funken = g.funken.filter((f) => f.t < 0.6);
  if (g.t < 0 || g.aus) return;
  if (g.t >= C.EIS_DAUER) { ende(g); return; }
  // Tempo und Strecke
  if (g.sturz > 0) { g.sturz -= dt; g.v = Math.max(30, g.v * (1 - dt * 2)); }
  else g.v = Math.min(TEMPO[1] * stufe.tempo, g.v + BESCHL * stufe.tempo * dt * 6);
  g.x += g.v * dt;
  g.punkte += 0;   // Strecke zählt nicht - Punkte gibt es für Sterne und Tricks
  while (g.naechstes < g.x + W + 40) neuesDing(g);
  g.dinge = g.dinge.filter((d) => d.x > g.x - 60);
  // Springen und Tricks
  if (g.inLuft) {
    g.vy += SCHWERE * dt;
    g.y -= g.vy * dt;                 // y = Höhe über dem Eis
    if (g.trick) {
      g.trick.t += dt;
      if (g.trick.t >= TRICKS[g.trick.art].dauer) { g.tricks.push(g.trick.art); g.trick = null; T.spiele('greifen'); }
    }
    if (g.y <= 0) landen(g);
  }
  // Zusammenstöße und Sterne
  const sx = g.x + SKATER_X;
  for (const d of g.dinge) {
    if (d.weg) continue;
    if (d.art === 'stern') {
      if (Math.abs(d.x - sx) < (d.gross ? 8 : 6) && Math.abs(g.y + 8 - d.hoehe) < (d.gross ? 11 : 9)) {
        d.weg = true;
        const pkt = Math.round(C.EIS_STERN * (d.gross ? 2 : 1) * stufe.punkte);
        g.punkte += pkt;
        g.texte.push({ x: d.x - g.x, y: BODEN() - d.hoehe - 6, text: '+' + pkt, farbe: d.gross ? '#ffb040' : '#ffe27a', t: 0 });
        T.spiele(d.gross ? 'kasse' : 'greifen');
      }
      continue;
    }
    const hd = HINDERNIS[d.art];
    if (g.sturz > 0 || Math.abs(d.x - sx) > hd.b / 2 + 3) continue;
    // Eisloch: nur wer am Boden ist, fällt hinein. Sonst: zu niedrig = Treffer
    if (d.art === 'loch' ? !g.inLuft : g.y < hd.h - 1) { d.weg = true; stuerze(g, d.art === 'loch' ? 'PLATSCH!' : 'AUTSCH!'); }
  }
}

function landen(g) {
  g.y = 0; g.vy = 0; g.inLuft = false;
  if (g.trick) { stuerze(g, 'ZU FRÜH GELANDET!'); g.trick = null; g.tricks = []; return; }
  if (!g.tricks.length) return;
  // Kombo: Summe der Tricks mal ihre Anzahl
  const n = g.tricks.length;
  const summe = g.tricks.reduce((s, a) => s + TRICKS[a].punkte, 0);
  const pkt = Math.round(summe * n * stufe.punkte);
  g.punkte += pkt;
  g.kombiBest = Math.max(g.kombiBest, n);
  const name = g.tricks.map((a) => TRICKS[a].name).join(' + ');
  g.texte.push({ x: SKATER_X, y: BODEN() - 34, text: n > 1 ? `${name} ×${n}` : name, farbe: '#ffffff', t: 0, klein: true });
  g.texte.push({ x: SKATER_X + 18, y: BODEN() - 20, text: '+' + pkt, farbe: n > 1 ? '#ffb040' : '#ffe27a', t: 0 });
  for (let i = 0; i < 10; i++) g.funken.push({ x: SKATER_X + zufall(-6, 6), y: BODEN() - 2, vx: zufall(-40, 40), vy: zufall(-60, -20), t: 0 });
  T.spiele(n > 1 ? 'spezialKasse' : 'kasse');
  g.tricks = [];
}

function stuerze(g, text) {
  g.stuerze = (g.stuerze || 0) + 1;
  g.sturz = 0.9; g.v = Math.min(g.v, 40); g.tricks = []; g.trick = null;
  if (g.inLuft) { g.inLuft = false; g.y = 0; g.vy = 0; }
  g.texte.push({ x: SKATER_X + 6, y: BODEN() - 28, text, farbe: '#ff7a6a', t: 0, klein: text.length > 8 });
  for (let i = 0; i < 12; i++) g.funken.push({ x: SKATER_X, y: BODEN() - 4, vx: zufall(-50, 50), vy: zufall(-70, -10), t: 0 });
  T.spiele('falsch');
}

function ende(g) {
  g.aus = true;
  if (g.inLuft) landen(g);
  if (fertig) T.spiele('fertig');
  setTimeout(() => { if (spiel === g && fertig) fertig(g.punkte, g.kombiBest); }, 1100);
}

/** Vorführszene: ein Stück fahren, mitten in einem Salto anhalten. */
export function vorspulen(sek) {
  for (let t = 0; t < sek; t += 1 / 30) { lenkeAuto(1); schritt(1 / 30); }
  if (!spiel.inLuft) eingabe('tipp');
  for (let i = 0; i < 8; i++) schritt(1 / 30);
  eingabe('hoch');
  for (let i = 0; i < 5; i++) schritt(1 / 30);
  zeichne(performance.now() / 1000);
}
/** Autopilot: springt rechtzeitig, macht in der Luft Tricks, solange die Zeit reicht. */
function lenkeAuto(treffer) {
  const g = spiel;
  if (g.sturz > 0 || g.t < 0) return;
  const sx = g.x + SKATER_X;
  if (!g.inLuft) {
    const vor = g.dinge.find((d) => d.art !== 'stern' && !d.weg && d.x > sx);
    if (vor) {
      // Absprung so, dass der Scheitel über dem Hindernis liegt
      const ideal = g.v * (SPRUNG / SCHWERE) - 4;
      const fehler = (1 - treffer) * zufall(-1, 1) * 40;
      if (vor.x - sx <= ideal + fehler) eingabe('tipp');
    }
    return;
  }
  if (!g.trick) {
    const u = -g.vy;   // Steiggeschwindigkeit (positiv = nach oben)
    const rest = (u + Math.sqrt(u * u + 2 * SCHWERE * g.y)) / SCHWERE;   // Zeit bis zur Landung
    const wahl = ['hoch', 'links', 'rechts'].filter((a) => TRICKS[a].dauer + 0.06 < rest);
    if (wahl.length && Math.random() < 0.5 + treffer * 0.5) eingabe(wahl[Math.floor(Math.random() * wahl.length)]);
  }
}
/** Messweg: eine Runde ohne Bild. `takt` = Reaktionszeit, `treffer` 0..1 = Genauigkeit. */
export function messe(takt = 0.05, treffer = 1, hoehe = 320, stufeNr = 1) {
  stufe = C.MINI_STUFEN[stufeNr];
  const altFertig = fertig;
  H = hoehe; fertig = null;
  spiel = neuesSpiel(0);
  let bis = 0;
  while (!spiel.aus) {
    if (spiel.t >= bis) { lenkeAuto(treffer); bis += takt; }
    schritt(1 / 60);
  }
  const erg = { punkte: spiel.punkte, kombi: spiel.kombiBest, spruenge: spiel.sprung, stuerze: spiel.stuerze || 0 };
  spiel = null; fertig = altFertig;
  return erg;
}

// ---------------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------------
function hash(n) { const s = Math.sin(n * 91.7) * 43758.5453; return s - Math.floor(s); }

let kulisse = null, kulisseSchl = '';
function baueKulisse(nacht) {
  const schl = `${H}|${nacht}`;
  if (kulisse && kulisseSchl === schl) return;
  kulisseSchl = schl;
  kulisse = document.createElement('canvas');
  kulisse.width = W; kulisse.height = H;
  const z = c; c = kulisse.getContext('2d');
  const boden = BODEN(), oben = boden - 26;
  const himmel = nacht ? ['#141a44', '#1e2456', '#2a2c66', '#3e3874'] : ['#7eb0dc', '#94c0e4', '#acd0ec', '#c6def2'];
  for (let y = 0; y < oben; y++) r(c, 0, y, W, 1, himmel[Math.min(3, Math.floor(y / oben * 4))]);
  if (nacht) {
    for (let i = 0; i < 45; i++) p(c, Math.floor(hash(i) * W), Math.floor(hash(i + 9) * (oben - 30)), i % 6 ? '#b8c0e8' : '#ffffff');
    // Mond mit Hof
    const mx = 140, my = Math.round(H * 0.16);
    c.fillStyle = 'rgba(255,250,220,0.08)'; for (let k = 14; k > 7; k -= 3) { c.beginPath(); c.arc(mx, my, k, 0, Math.PI * 2); c.fill(); }
    for (let yy = -6; yy <= 6; yy++) { const w = Math.round(Math.sqrt(36 - yy * yy)); r(c, mx - w, my + yy, w * 2 + 1, 1, '#f4ecc8'); }
    p(c, mx - 2, my - 1, '#d8cca0'); r(c, mx + 1, my + 2, 2, 1, '#d8cca0');
  } else {
    const sx = 140, sy = Math.round(H * 0.15);
    c.fillStyle = 'rgba(255,250,210,0.18)'; c.beginPath(); c.arc(sx, sy, 13, 0, Math.PI * 2); c.fill();
    for (let yy = -6; yy <= 6; yy++) { const w = Math.round(Math.sqrt(36 - yy * yy)); r(c, sx - w, sy + yy, w * 2 + 1, 1, '#fff6d0'); }
    // Ein paar Wolken
    for (const [wx, wy, wb] of [[30, 0.12, 26], [92, 0.22, 34], [10, 0.3, 20]]) {
      const yy = Math.round(H * wy);
      r(c, wx, yy, wb, 4, '#f4f8fc'); r(c, wx + 4, yy - 3, wb - 10, 3, '#f4f8fc'); r(c, wx + 2, yy + 4, wb - 4, 1, '#dce8f4');
    }
  }
  // Ferne Berge
  for (let x = 0; x < W; x++) {
    const h = Math.round(30 + Math.sin(x / 19) * 10 + Math.sin(x / 7.3) * 4 + Math.sin(x / 41) * 8);
    r(c, x, oben - h - 20, 1, h, nacht ? '#323866' : '#b4c6dc');
    if (!nacht) r(c, x, oben - h - 20, 1, Math.max(0, Math.round(h * 0.3) - 3), '#eef3f8');
  }
  c = z;
}

/** Ferne Hügel und Tannen ziehen langsamer vorbei als die Bahn (Tiefe). */
function hintergrund(g, nacht) {
  const boden = BODEN();
  const ebene = (faktor, hoch, farbe, schnee, abstand, gr) => {
    const vers = (g.x * faktor) % abstand;
    for (let k = -1; k < W / abstand + 2; k++) {
      const n = Math.floor(g.x * faktor / abstand) + k;
      const x = Math.round(k * abstand - vers + hash(n) * abstand * 0.5);
      const h = Math.round(gr * (0.7 + hash(n + 3) * 0.6));
      for (let i = 0; i < h; i++) { const w = Math.round((i + 1) / h * h * 0.35); r(c, x - w, boden - hoch - h + i, w * 2 + 1, 1, farbe); if (i % 4 === 0 && schnee) p(c, x - w, boden - hoch - h + i, schnee); }
    }
  };
  // Hügel als Band, dann zwei Tannenreihen
  for (let x = 0; x < W; x++) { const hh = 22 + Math.round(Math.sin((x + g.x * 0.08) / 23) * 6 + Math.sin((x + g.x * 0.08) / 9) * 2); r(c, x, boden - 18 - hh, 1, hh + 4, nacht ? '#4a5078' : '#dce6f0'); }
  // Ein Dorf auf dem Hügel, zieht langsam vorbei, Fenster leuchten
  const dv = (g.x * 0.1) % 60;
  for (let k = -1; k < 5; k++) {
    const n = Math.floor(g.x * 0.1 / 60) + k, hx = Math.round(k * 60 - dv + hash(n) * 30);
    const hy = boden - 18 - (22 + Math.round(Math.sin((hx + 4 + g.x * 0.08) / 23) * 6 + Math.sin((hx + 4 + g.x * 0.08) / 9) * 2)) + 4;   // steht auf dem Hügel
    const bw = 9 + Math.floor(hash(n + 1) * 5), hh = 7 + Math.floor(hash(n + 2) * 4);
    r(c, hx, hy - hh, bw, hh, nacht ? '#5a5070' : '#e8dcc8');
    for (let i = 0; i < 4; i++) r(c, hx - 1 + i, hy - hh - 1 - i, bw + 2 - i * 2, 1, nacht ? '#3a3050' : '#a8584a');
    if (hash(n + 4) < 0.5) { r(c, hx + Math.floor(bw / 2) - 1, hy - hh - 9, 2, 6, nacht ? '#5a5070' : '#f0e8dc'); p(c, hx + Math.floor(bw / 2) - 1, hy - hh - 10, '#e8c030'); }
    r(c, hx + 2, hy - hh + 2, 2, 2, nacht ? '#ffd070' : '#5a6070'); r(c, hx + bw - 4, hy - hh + 2, 2, 2, nacht ? '#ffd070' : '#5a6070');
    if (nacht) { c.fillStyle = 'rgba(255,200,110,0.15)'; c.fillRect(hx + 1, hy - hh + 1, bw - 2, 4); }
  }
  ebene(0.15, 22, nacht ? '#2a3a4a' : '#5a7a72', nacht ? null : '#ffffff', 14, 16);
  ebene(0.35, 14, nacht ? '#1e3a2e' : '#2f5a3e', '#eef3f8', 22, 22);
  // Ufer mit Schnee und ein Zaun mit Lichterkette
  r(c, 0, boden - 14, W, 14, nacht ? '#9aa4c4' : '#eef3f8');
  const vz = (g.x * 0.7) % 12;
  for (let x = -12; x < W + 12; x += 12) { r(c, Math.round(x - vz), boden - 22, 2, 9, '#7a5234'); }
  r(c, 0, boden - 20, W, 1, '#8a6a42'); r(c, 0, boden - 17, W, 1, '#8a6a42');
  const t = performance.now() / 1000;
  for (let x = -6; x < W + 6; x += 6) {
    const xx = Math.round(x - (g.x * 0.7) % 6), k = Math.floor((x + g.x * 0.7) / 6);
    const f = ['#ff5a5a', '#ffe060', '#5ad0ff', '#7ae07a'][((k % 4) + 4) % 4];
    p(c, xx, boden - 23 + (k % 2), (Math.floor(t * 2) + k) % 3 ? f : ton(f, -0.4));
    if (nacht) { c.fillStyle = 'rgba(255,220,140,0.15)'; c.fillRect(xx - 1, boden - 24 + (k % 2), 3, 3); }
  }
}

/** Das Eis: glatt, mit Spiegelung und Kratzern, die mitziehen. */
function eis(g, nacht) {
  const boden = BODEN();
  for (let y = boden; y < H; y++) {
    const k = (y - boden) / (H - boden);
    r(c, 0, y, W, 1, nacht ? (k < 0.3 ? '#5a6a9a' : '#4a5888') : (k < 0.3 ? '#cfe6f6' : '#b6d6ee'));
  }
  r(c, 0, boden, W, 1, nacht ? '#8a9ad0' : '#ffffff');
  for (let i = 0; i < 26; i++) {
    const n = Math.floor(g.x / 40) + i - 4, x = Math.round(n * 40 - g.x + hash(n) * 40) % (W + 80);
    const y = boden + 4 + Math.floor(hash(n + 5) * (H - boden - 8));
    r(c, x, y, 6 + Math.floor(hash(n + 7) * 10), 1, nacht ? '#6a7cb0' : '#e6f2fa');
  }
}

/** Der Schlittschuh-Wichtel in einem kleinen Zwischenbild (dreht sich beim Salto). */
const fig = document.createElement('canvas'); fig.width = 24; fig.height = 24;
function figur(pose, t) {
  const f = fig.getContext('2d');
  f.clearRect(0, 0, 24, 24);
  const x = 12, fuss = 20;
  const schal = Math.floor(t * 8) % 2;
  const kufe = (bx, by) => { r(f, bx - 2, by, 5, 1, '#c8ccd8'); p(f, bx + 3, by - 1, '#c8ccd8'); r(f, bx - 1, by - 2, 3, 2, '#3a2a1a'); };
  if (pose === 'graetsche') {
    // Beine weit auseinander
    r(f, x - 5, fuss - 6, 2, 4, '#2c3a6a'); r(f, x + 4, fuss - 6, 2, 4, '#2c3a6a');
    kufe(x - 6, fuss - 1); kufe(x + 5, fuss - 1);
  } else if (pose === 'hocke') {
    r(f, x - 2, fuss - 4, 5, 3, '#2c3a6a'); kufe(x, fuss - 1);
  } else {
    const s = pose === 'lauf' ? Math.floor(t * 6) % 2 : 0;
    r(f, x - 2, fuss - 6, 2, 5, '#2c3a6a'); r(f, x + 1, fuss - 6, 2, 5, '#2c3a6a');
    kufe(x - 1 - s * 2, fuss); kufe(x + 2 + s, fuss - s);
  }
  const ko = pose === 'hocke' ? 3 : 0;
  r(f, x - 3, fuss - 12 + ko, 7, 7, '#2f8a3a'); r(f, x - 3, fuss - 12 + ko, 7, 1, '#e8c030');      // Jacke
  r(f, x - 3, fuss - 13 + ko, 7, 2, '#d83a3a'); r(f, x + 4, fuss - 13 + ko + schal, 3, 1, '#d83a3a'); // Schal, flattert
  r(f, x - 2, fuss - 17 + ko, 5, 4, '#f2c9a0'); p(f, x + 1, fuss - 16 + ko, '#2a1a1a');              // Kopf
  r(f, x - 3, fuss - 18 + ko, 7, 2, '#d83a3a'); r(f, x - 1, fuss - 20 + ko, 4, 2, '#d83a3a'); p(f, x - 2, fuss - 21 + ko, '#d83a3a'); p(f, x - 3, fuss - 21 + ko, '#ffffff');
  r(f, x - 3, fuss - 17 + ko, 7, 1, '#ffffff');
  // Arme: beim Laufen hinten, im Sprung ausgebreitet
  if (pose === 'lauf') { r(f, x - 5, fuss - 10, 2, 1, '#2f8a3a'); }
  else { r(f, x - 6, fuss - 11 + ko, 3, 1, '#2f8a3a'); r(f, x + 4, fuss - 11 + ko, 3, 1, '#2f8a3a'); p(f, x - 7, fuss - 11 + ko, '#f2c9a0'); p(f, x + 7, fuss - 11 + ko, '#f2c9a0'); }
}

function skater(g, t, nacht) {
  const boden = BODEN();
  const fx = SKATER_X, fy = boden - Math.round(g.y);
  // Schatten auf dem Eis, kleiner je höher
  const sw = Math.max(4, 12 - Math.round(g.y / 5));
  c.fillStyle = nacht ? 'rgba(10,10,40,0.35)' : 'rgba(60,90,130,0.25)'; c.fillRect(fx - sw / 2, boden + 1, sw, 2);
  if (g.sturz > 0) {
    // Gestürzt: liegt quer und rutscht
    figur('stand', t);
    c.save(); c.translate(fx, boden - 4); c.rotate(-Math.PI / 2 + Math.sin(t * 20) * 0.1); c.drawImage(fig, -12, -12); c.restore();
    return;
  }
  let pose = g.inLuft ? 'hocke' : 'lauf', winkel = 0, breite = 1;
  if (g.trick) {
    const k = g.trick.t / TRICKS[g.trick.art].dauer;
    if (g.trick.art === 'hoch') { winkel = -k * Math.PI * 2; pose = 'hocke'; }
    else if (g.trick.art === 'links') { breite = Math.cos(k * Math.PI * 2); pose = 'stand'; }
    else pose = 'graetsche';
  }
  figur(pose, t);
  c.save();
  c.translate(fx, fy - 10);
  c.rotate(winkel);
  c.scale(Math.abs(breite) < 0.15 ? 0.15 * Math.sign(breite || 1) : breite, 1);
  c.drawImage(fig, -12, -10);
  c.restore();
  // Eisspäne hinter den Kufen beim Laufen
  if (!g.inLuft && Math.floor(t * 12) % 2) p(c, fx - 6, boden - 1, '#ffffff');
}

function ding(d, g, t) {
  const x = Math.round(d.x - g.x), boden = BODEN();
  if (x < -30 || x > W + 30 || d.weg && d.art === 'stern') return;
  if (d.art === 'schneemann') {
    for (const [cy, rad] of [[boden - 4, 4], [boden - 10, 3]]) for (let yy = -rad; yy <= rad; yy++) { const w = Math.round(Math.sqrt(rad * rad - yy * yy)); r(c, x - w, cy + yy, w * 2 + 1, 1, '#ffffff'); p(c, x + w, cy + yy, '#d8e4ef'); }
    p(c, x - 1, boden - 11, '#2a2a30'); p(c, x + 1, boden - 11, '#2a2a30'); r(c, x, boden - 10, 2, 1, '#e87a2a');
    r(c, x - 2, boden - 14, 5, 1, '#2a2a30'); r(c, x - 1, boden - 16, 3, 2, '#2a2a30'); r(c, x - 3, boden - 7, 7, 1, '#c83a32');
  } else if (d.art === 'stein') {
    r(c, x - 5, boden - 4, 10, 4, '#7a7e88'); r(c, x - 4, boden - 6, 8, 2, '#9a9ea8'); r(c, x - 3, boden - 6, 6, 1, '#ffffff'); p(c, x + 4, boden - 2, '#5a5e68');
  } else if (d.art === 'holz') {
    for (let i = 0; i < 3; i++) { r(c, x - 6 + i * 4, boden - 4, 4, 4, '#8a5a32'); r(c, x - 5 + i * 4, boden - 3, 2, 2, '#c8a070'); }
    for (let i = 0; i < 2; i++) { r(c, x - 4 + i * 4, boden - 8, 4, 4, '#7a4c28'); r(c, x - 3 + i * 4, boden - 7, 2, 2, '#c8a070'); }
    r(c, x - 4, boden - 9, 8, 1, '#ffffff');
  } else if (d.art === 'loch') {
    // Eisloch: dunkles Wasser mit Bruchkante, dazu ein Warnschild davor
    r(c, x - 10, boden, 20, 4, '#1a3a5a'); r(c, x - 8, boden + 4, 16, 2, '#1a3a5a'); r(c, x - 9, boden, 18, 1, '#e6f2fa');
    p(c, x - 4, boden + 2, '#4a7aa8'); p(c, x + 3, boden + 1, '#4a7aa8');
    r(c, x - 15, boden - 9, 1, 9, '#5a3a22'); r(c, x - 18, boden - 13, 7, 5, '#e8c030'); p(c, x - 15, boden - 12, '#c83a32'); p(c, x - 15, boden - 10, '#c83a32');
  } else if (d.art === 'stern' && !d.weg) {
    const yy = boden - Math.round(d.hoehe) + Math.round(Math.sin(t * 4 + d.x) * 1.5), f = Math.floor(t * 6 + d.x) % 3 ? '#ffe060' : '#fff6c8';
    if (d.gross) {
      c.fillStyle = 'rgba(255,220,100,0.25)'; c.fillRect(x - 6, yy - 6, 13, 13);
      r(c, x - 2, yy - 2, 5, 5, f); r(c, x - 1, yy - 5, 3, 3, f); r(c, x - 1, yy + 3, 3, 3, f); r(c, x - 5, yy - 1, 3, 3, f); r(c, x + 3, yy - 1, 3, 3, f); p(c, x - 1, yy - 1, '#ffffff');
    } else {
      r(c, x - 1, yy - 1, 3, 3, f); p(c, x, yy - 3, f); p(c, x, yy + 3, f); p(c, x - 3, yy, f); p(c, x + 3, yy, f);
    }
  }
}

function zeichne(t) {
  const g = spiel;
  const nacht = Z.licht().hell < 0.4;
  baueKulisse(nacht);
  c.drawImage(kulisse, 0, 0);
  hintergrund(g, nacht);
  eis(g, nacht);
  for (const d of g.dinge) ding(d, g, t);
  skater(g, t, nacht);
  for (const f of g.funken) p(c, f.x, f.y, '#ffffff');
  for (const x of g.texte) if (!x.gezeigt) { x.gezeigt = true; MH.schwebe(x.x, x.y, x.text, x.farbe, x.klein ? 0.75 : 1.1); }
  // Kopfzeile: Zeit, in der Luft die laufende Kombo, Punkte
  const rest = Math.max(0, Math.ceil(C.EIS_DAUER - Math.max(0, g.t)));
  const kombo = g.tricks.length + (g.trick ? 1 : 0);
  MH.setzeKopf({ zeit: rest, knapp: rest <= 5 && g.t >= 0, kette: g.inLuft ? Math.max(1, kombo) : 1, ketteAnteil: g.trick ? g.trick.t / TRICKS[g.trick.art].dauer : 1, punkte: g.punkte });
  MH.hinweis(g.t < 0 ? `Schwierigkeit: ${C.MINI_STUFEN.indexOf(stufe) >= 0 ? stufe.name : ''}` : g.t < 4 ? 'Tippen = springen · in der Luft wischen = Trick' : null);
  MH.mitte(g.aus ? 'ZEIT!' : g.t < 0 ? String(Math.ceil(-g.t)) : g.t < 0.6 ? 'LOS!' : null, g.t < 0 && !g.aus ? '#ffffff' : '#ffe27a');
}
