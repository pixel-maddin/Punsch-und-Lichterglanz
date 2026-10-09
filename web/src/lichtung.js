/*
 * lichtung.js - Minispiel „Waldlichtung" (09.10.): Hasen, Eichhörnchen und
 * Rehe hüpfen durch die Lichtung. Antippen füttert sie - das gibt Punkte,
 * schnelles Füttern hintereinander eine Kette bis ×5. Eine Runde dauert
 * LICHTUNG_DAUER Sekunden. Was die Punkte bringen (Sterne, Rekord, Deko),
 * rechnet spiel.js aus (`lichtungErgebnis`).
 *
 * Eigenes Vollbild-Canvas (#minispiel), 180 Pixel breit wie die Welt, so hoch
 * wie das Spiel. Gezeichnet und getaktet wird nur, solange es offen ist.
 */
import * as C from './config.js?v=20261009h';
import * as Z from './zeit.js?v=20261009h';
import * as T from './ton.js?v=20261009h';
import { r, p, text as pixText, textBreite } from './pixel.js?v=20261009h';

const $ = (s) => document.querySelector(s);
// Das Feld ist nur 90 Pixel breit (halbe Weltbreite) und wird doppelt so groß
// hochgezogen - in voller Auflösung waren die Tiere auf dem Handy zu klein.
const W = 90;
const ARTEN = {
  hase: { wert: 10, tempo: [13, 19], radius: 7 },
  eich: { wert: 20, tempo: [26, 33], radius: 6 },
  reh:  { wert: 30, tempo: [8, 10],  radius: 9 },
  gold: { wert: 60, tempo: [29, 35], radius: 7 },
};

let cv = null, c = null, H = 320;
let spiel = null, rafId = 0, letzte = 0, fertig = null;
export const istOffen = () => !!spiel;
/** Zum Testen (Autopilot im Browser): der laufende Zustand. */
export const zustand = () => spiel;

/** Runde starten. `beiEnde(punkte)` kommt nach Ablauf (ui.js zeigt das Ergebnis). */
export function starte(hoehe, beiEnde) {
  H = Math.round(hoehe / 2); fertig = beiEnde;
  cv = $('#miniCv');
  cv.width = W; cv.height = H;
  c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  spiel = { t: -3, punkte: 0, kette: 1, ketteT: 0, tiere: [], spawnT: 0.4, texte: [], fehl: [], gefuettert: 0, aus: false };
  $('#minispiel').classList.remove('versteckt');
  cv.onpointerdown = tippe;
  letzte = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(takt);
}
export function schliesse() {
  spiel = null;
  cancelAnimationFrame(rafId);
  $('#minispiel').classList.add('versteckt');
}

function zufall(a, b) { return a + Math.random() * (b - a); }
function neuesTier() {
  const g = spiel;
  const roll = Math.random();
  const art = roll < 0.04 ? 'gold' : roll < 0.22 ? 'reh' : roll < 0.52 ? 'eich' : 'hase';
  const dir = Math.random() < 0.5 ? 1 : -1;
  const a = ARTEN[art];
  g.tiere.push({
    art, dir, x: dir > 0 ? -8 : W + 8, y: zufall(H * 0.3, H * 0.82),
    v: zufall(a.tempo[0], a.tempo[1]), phase: Math.random() * 6, t: 0,
    grasen: art === 'reh' ? zufall(1.2, 2.2) : 0, satt: -1,
  });
}

function tippe(e) {
  if (!spiel || spiel.t < 0 || spiel.aus) return;
  const rc = cv.getBoundingClientRect();
  const x = (e.clientX - rc.left) / rc.width * W, y = (e.clientY - rc.top) / rc.height * H;
  let best = null, bd = Infinity;
  for (const tier of spiel.tiere) {
    if (tier.satt >= 0) continue;
    const d = Math.hypot(tier.x - x, tier.y - 6 - y);
    if (d < ARTEN[tier.art].radius + 3 && d < bd) { bd = d; best = tier; }
  }
  if (!best) { spiel.kette = 1; spiel.fehl.push({ x, y, t: 0 }); T.spiele('falsch'); return; }
  // Gefüttert! Kette wächst, wenn es schnell genug ging
  spiel.kette = spiel.ketteT > 0 ? Math.min(5, spiel.kette + 1) : 1;
  spiel.ketteT = 1.6;
  const pkt = ARTEN[best.art].wert * spiel.kette;
  spiel.punkte += pkt;
  spiel.gefuettert++;
  best.satt = 0;
  spiel.texte.push({ x: best.x, y: best.y - 14, text: '+' + pkt, t: 0 });
  T.spiele(best.art === 'gold' ? 'spezialKasse' : spiel.kette >= 3 ? 'kasse' : 'greifen');
}

function takt(jetzt) {
  if (!spiel) return;
  const dt = Math.min(0.05, (jetzt - letzte) / 1000);
  letzte = jetzt;
  const g = spiel;
  g.t += dt;
  if (g.t >= 0 && !g.aus) {
    // Tiere kommen immer schneller, höchstens 7 gleichzeitig
    g.spawnT -= dt;
    if (g.spawnT <= 0 && g.tiere.filter((x) => x.satt < 0).length < 7) {
      neuesTier();
      g.spawnT = Math.max(0.35, 0.95 - g.t / C.LICHTUNG_DAUER * 0.55) * zufall(0.7, 1.3);
    }
    if (g.ketteT > 0) { g.ketteT -= dt; if (g.ketteT <= 0) g.kette = 1; }
    if (g.t >= C.LICHTUNG_DAUER) {
      g.aus = true;
      T.spiele('fertig');
      setTimeout(() => { if (spiel === g && fertig) fertig(g.punkte, g.gefuettert); }, 900);
    }
  }
  for (const tier of g.tiere) {
    tier.t += dt;
    if (tier.satt >= 0) {
      // Freut sich kurz, dann hoppelt es schnell davon
      tier.satt += dt;
      if (tier.satt > 0.6) tier.x += tier.dir * 55 * dt;
      continue;
    }
    if (tier.art === 'reh' && tier.grasen > 0 && Math.abs(tier.x - W / 2) < 18) { tier.grasen -= dt; continue; }
    tier.x += tier.dir * tier.v * dt;
    if (tier.art === 'eich') tier.y += Math.sin(tier.t * 7 + tier.phase) * 15 * dt;
  }
  g.tiere = g.tiere.filter((x) => x.x > -14 && x.x < W + 14);
  for (const x of g.texte) x.t += dt;
  g.texte = g.texte.filter((x) => x.t < 0.9);
  for (const x of g.fehl) x.t += dt;
  g.fehl = g.fehl.filter((x) => x.t < 0.3);
  zeichne(jetzt / 1000);
  rafId = requestAnimationFrame(takt);
}

// ---------------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------------
function hash(n) { const s = Math.sin(n * 91.7) * 43758.5453; return s - Math.floor(s); }

function zeichne(t) {
  const g = spiel;
  const winter = Z.schnee() > 0;
  r(c, 0, 0, W, H, winter ? '#e4ecf4' : '#6ab05a');
  for (let i = 0; i < 70; i++) p(c, Math.floor(hash(i) * W), Math.floor(hash(i + 500) * H), winter ? '#cfdae6' : '#5a9a4a');
  // Waldrand oben und unten
  for (let i = 0; i < 14; i++) { baum(i * 7 + (i % 2) * 3, Math.floor(H * 0.2 + hash(i) * 5), winter, 1.4); }
  for (let i = 0; i < 14; i++) { baum(i * 7 + (i % 2) * 3, Math.floor(H * 0.96 + hash(i + 40) * 3), winter, 1.6); }
  // Futterkrippe in der Mitte
  const kx = W / 2, ky = Math.floor(H * 0.55);
  r(c, kx - 8, ky - 2, 16, 4, '#8a5a32'); r(c, kx - 8, ky - 3, 16, 1, '#c8a060');
  r(c, kx - 7, ky + 2, 1, 4, '#5a3a22'); r(c, kx + 6, ky + 2, 1, 4, '#5a3a22');
  for (let i = 0; i < 6; i++) p(c, kx - 6 + i * 2, ky - 4, '#e8c060');

  // Tiere (nach y sortiert, vorne liegt vorn)
  for (const tier of [...g.tiere].sort((a, b) => a.y - b.y)) {
    const satt = tier.satt >= 0;
    const hop = tier.art === 'hase' || tier.art === 'gold' ? Math.abs(Math.sin(tier.t * 8 + tier.phase)) * 5 : 0;
    const x = Math.round(tier.x), y = Math.round(tier.y - (satt && tier.satt < 0.6 ? Math.abs(Math.sin(tier.satt * 14)) * 4 : hop));
    r(c, x - 4, Math.round(tier.y) + 1, 9, 1, 'rgba(0,0,0,0.15)');
    ({ hase, eich, reh, gold: goldhase }[tier.art])(x, y, tier.dir, t);
    if (satt && tier.satt < 0.8) { herz(x - 2, y - 14 - tier.satt * 10); herz(x + 3, y - 12 - tier.satt * 14); }
  }
  for (const f of g.fehl) { p(c, f.x - 1, f.y - 1, '#a83a3a'); p(c, f.x + 1, f.y + 1, '#a83a3a'); p(c, f.x + 1, f.y - 1, '#a83a3a'); p(c, f.x - 1, f.y + 1, '#a83a3a'); }
  for (const x of g.texte) { const s = x.text; pixText(c, s, Math.round(x.x - textBreite(s) / 2), Math.round(x.y - x.t * 12), '#ffe060'); }

  // Kopf: Zeit, Punkte, Kette
  r(c, 0, 0, W, 9, 'rgba(30,20,10,0.55)');
  const rest = Math.max(0, Math.ceil(C.LICHTUNG_DAUER - Math.max(0, g.t)));
  pixText(c, String(rest), 3, 2, rest <= 5 ? '#ff7a6a' : '#ffffff');
  const ps = String(g.punkte);
  pixText(c, ps, W - 18 - textBreite(ps), 2, '#ffe060');
  if (g.kette > 1) pixText(c, 'x' + g.kette, 20, 2, '#7ae07a');
  // Countdown und Ende
  if (g.t < 0) gross(String(Math.ceil(-g.t)), '#ffffff');
  else if (g.t < 0.6) gross('LOS!', '#ffe060');
  if (g.aus) gross('ZEIT!', '#ffe060');
}

function gross(s, f) {
  // Doppelt große Pixelschrift über einen Zwischen-Canvas
  const w = textBreite(s) + 2;
  const tmp = gross.cv || (gross.cv = document.createElement('canvas'));
  tmp.width = w; tmp.height = 7;
  const t = tmp.getContext('2d');
  t.clearRect(0, 0, w, 7);
  pixText(t, s, 0, 0, f);
  c.drawImage(tmp, Math.round(W / 2 - w), Math.round(H * 0.42), w * 2, 14);
}
function herz(x, y) { x = Math.round(x); y = Math.round(y); p(c, x, y, '#ff5a7a'); p(c, x + 2, y, '#ff5a7a'); r(c, x, y + 1, 3, 1, '#ff5a7a'); p(c, x + 1, y + 2, '#ff5a7a'); }
function baum(x, y, winter, k = 1) {
  r(c, x, y, 1, 2, '#5a3a22');
  const h = Math.round(5 * k);
  for (let i = 0; i < h; i++) r(c, x - Math.floor(i / 1.3), y - h + i, Math.floor(i / 1.3) * 2 + 1, 1, i % 2 ? '#1f5a2a' : '#2a6a32');
  if (winter) p(c, x, y - h, '#ffffff');
}
function hase(x, y, d, t, fell = '#b8a898') {
  r(c, x - 3, y - 4, 6, 4, fell); r(c, x + d * 2 - 1, y - 7, 3, 3, fell);                 // Körper, Kopf
  r(c, x + d * 2 - 1, y - 11, 1, 4, fell); r(c, x + d * 2 + 1, y - 10, 1, 3, fell);      // Ohren
  p(c, x + d * 3, y - 6, '#2a1a10'); r(c, x - d * 3 - (d > 0 ? 1 : 0), y - 4, 2, 2, '#f4f4f4');   // Auge, Puschel
}
function goldhase(x, y, d, t) { hase(x, y, d, t, Math.floor(t * 8) % 2 ? '#ffd040' : '#ffe890'); }
function eich(x, y, d, t) {
  const f = '#c86a2a';
  r(c, x - 2, y - 4, 4, 4, f); r(c, x + d * 2 - 1, y - 6, 3, 3, f); p(c, x + d * 3, y - 5, '#2a1a10');
  // buschiger Schwanz
  r(c, x - d * 4 - 1, y - 8, 3, 6, '#d88a4a'); p(c, x - d * 3, y - 9, '#d88a4a');
}
function reh(x, y, d, t) {
  const f = '#a8703a';
  r(c, x - 5, y - 8, 10, 4, f);                                                             // Rumpf
  r(c, x - 4, y - 4, 1, 4, f); r(c, x - 2, y - 4, 1, 4, f); r(c, x + 2, y - 4, 1, 4, f); r(c, x + 4, y - 4, 1, 4, f);
  r(c, x + d * 4 - 1, y - 12, 2, 4, f); r(c, x + d * 5 - 1, y - 13, 3, 2, f);              // Hals, Kopf
  p(c, x + d * 6, y - 13, '#2a1a10'); p(c, x + d * 4, y - 14, f);                         // Auge, Ohr
  p(c, x - 2, y - 7, '#f4ead8'); p(c, x + 1, y - 7, '#f4ead8'); p(c, x - d * 5, y - 8, '#f4f4f4');   // Punkte, Spiegel
}
