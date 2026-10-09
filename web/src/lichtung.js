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
import * as C from './config.js?v=20261009j';
import * as Z from './zeit.js?v=20261009j';
import * as T from './ton.js?v=20261009j';
import { r, p, ton, text as pixText, textBreite } from './pixel.js?v=20261009j';

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
    art, dir, x: dir > 0 ? -8 : W + 8, y: zufall(H * 0.38, H * 0.86),
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
  schritt(dt);
  if (!spiel) return;
  zeichne(jetzt / 1000);
  rafId = requestAnimationFrame(takt);
}

/** Nur für die Vorführszene: Runde ein Stück weiterlaufen lassen und ein paar Tiere füttern. */
export function vorspulen(sek) {
  for (let t = 0; t < sek; t += 1 / 30) schritt(1 / 30);
  const zwei = spiel.tiere.slice(0, 2);
  for (const tier of zwei) { tier.satt = 0.1; spiel.texte.push({ x: tier.x, y: tier.y - 14, text: '+20', t: 0.2 }); }
  spiel.punkte = 340; spiel.kette = 3; spiel.ketteT = 1.1;
  zeichne(performance.now() / 1000);
}

function schritt(dt) {
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
}

// ---------------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------------
function hash(n) { const s = Math.sin(n * 91.7) * 43758.5453; return s - Math.floor(s); }

/*
 * Die Kulisse (09.10.) wird einmal je Größe und Jahreszeit in ein
 * Zwischenbild gerechnet: Himmel, drei Lagen Wald, Lichtung mit Gras oder
 * Schnee, Pfad, Baumstümpfe, Steine, Pilze, die Futterraufe und vorn ein
 * Rahmen aus Stämmen und Büschen. Je Bild kommen nur Tiere, Wetter und
 * Lichtstrahlen dazu.
 */
let kulisse = null, kulisseSchl = '';
const HINTEN = 0.27;   // bis hier reicht der Wald, darunter ist Lichtung

function pal(winter) {
  return winter ? {
    boden: ['#dfe8f1', '#e9f0f6', '#f4f8fb'], boden2: '#cbd8e5', pfad: '#c6d3e0', pfad2: '#b2c1d2',
    nadel: ['#1a4430', '#24583a', '#33704a'], fern: '#5a7488', mitte: '#2f5446', schnee: '#ffffff',
    busch: '#3a6248', himmel: ['#a8c4e0', '#c8dcee'],
  } : {
    boden: ['#5f9748', '#6aa451', '#78b05c'], boden2: '#4f8540', pfad: '#b89a68', pfad2: '#a08454',
    nadel: ['#183f24', '#22552e', '#2f6c3c'], fern: '#5a7a6a', mitte: '#2a4f34', schnee: null,
    busch: '#3a6a30', himmel: ['#a8cce8', '#d4e6f2'],
  };
}

function baueKulisse(winter) {
  const schl = `${H}|${winter}`;
  if (kulisse && kulisseSchl === schl) return;
  kulisseSchl = schl;
  kulisse = document.createElement('canvas');
  kulisse.width = W; kulisse.height = H;
  const ziel = c;
  c = kulisse.getContext('2d');
  const P = pal(winter);
  const rand = Math.round(H * HINTEN);

  // Himmel als schmaler Streifen über den Wipfeln
  for (let y = 0; y < rand; y++) r(c, 0, y, W, 1, y < rand * 0.45 ? P.himmel[0] : P.himmel[1]);
  // Drei Lagen Wald: fern (blass), Mitte, nah (mit Stämmen)
  for (let x = -4; x < W + 4; x += 3) baum(x, Math.round(rand * 0.62 + hash(x + 3) * 3), P, 0.9, P.fern, P.fern, P.fern, winter);
  for (let x = -3; x < W + 4; x += 4) baum(x + Math.round(hash(x + 5) * 2), Math.round(rand * 0.8 + hash(x + 9) * 6), P, 1.1 + hash(x + 13) * 0.5, P.mitte, ton(P.mitte, 0.12), ton(P.mitte, -0.2), winter);
  // Boden: drei Töne in Flecken, feine Körnung
  for (let y = rand; y < H; y++) for (let x = 0; x < W; x++) {
    const v = Math.sin(x / 9 + y / 13) * 0.35 + Math.sin(x / 4.3 - y / 6.1) * 0.25 + (hash(x * 31 + y * 7) - 0.5) * 0.6;
    p(c, x, y, P.boden[v < -0.25 ? 0 : v < 0.3 ? 1 : 2]);
  }
  // Übergang Wald - Lichtung: Schattenkante
  for (let x = 0; x < W; x++) { p(c, x, rand, P.boden2); if (hash(x) < 0.5) p(c, x, rand + 1, P.boden2); }
  for (let x = -2; x < W + 6; x += 7) baum(x + Math.round(hash(x + 17) * 3), rand + 3 + Math.round(hash(x + 21) * 4), P, 1.7 + hash(x + 23) * 0.8, P.nadel[1], P.nadel[2], P.nadel[0], winter);
  // Grashalme / Schneewehen
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(hash(i + 100) * W), y = Math.floor(rand + 4 + hash(i + 200) * (H - rand - 8));
    if (winter) { r(c, x, y, 3, 1, '#ffffff'); p(c, x + 1, y - 1, '#ffffff'); p(c, x, y + 1, P.boden2); }
    else { p(c, x, y, P.boden2); p(c, x + 1, y - 1, P.boden2); p(c, x + 2, y, P.boden2); if (i % 7 === 0) p(c, x + 1, y - 2, ['#f0e070', '#e89ab0', '#ffffff'][i % 3]); }
  }
  // Ein Pfad, schräg durch die Lichtung
  for (let y = rand + 2; y < H; y++) {
    const x = Math.round(W * 0.18 + (y - rand) * 0.42 + Math.sin(y / 9) * 3);
    r(c, x - 3, y, 7, 1, P.pfad2); r(c, x - 2, y, 5, 1, P.pfad);
    if (hash(y) < 0.15) p(c, x + (hash(y + 1) < 0.5 ? -1 : 1), y, P.pfad2);
  }
  // Baumstümpfe, Steine, Pilze, ein Farn
  const stumpf = (x, y) => {
    r(c, x - 3, y - 3, 7, 4, '#7a5236'); r(c, x - 3, y - 4, 7, 1, '#c8a070'); p(c, x - 1, y - 4, '#a8805a'); p(c, x + 1, y - 4, '#a8805a');
    p(c, x - 4, y, '#5a3a24'); p(c, x + 4, y, '#5a3a24');
    if (winter) r(c, x - 3, y - 5, 7, 1, '#ffffff');
  };
  stumpf(Math.round(W * 0.14), Math.round(H * 0.42));
  stumpf(Math.round(W * 0.86), Math.round(H * 0.7));
  const stein = (x, y) => { r(c, x - 2, y - 2, 5, 3, '#8a8c90'); r(c, x - 1, y - 3, 3, 1, '#a8acb0'); p(c, x + 2, y, '#6a6c70'); if (winter) r(c, x - 1, y - 3, 3, 1, '#ffffff'); };
  stein(Math.round(W * 0.8), Math.round(H * 0.4)); stein(Math.round(W * 0.25), Math.round(H * 0.78)); stein(Math.round(W * 0.6), Math.round(H * 0.86));
  if (!winter) for (const [fx, fy] of [[0.1, 0.62], [0.9, 0.5], [0.42, 0.34]]) {
    const x = Math.round(W * fx), y = Math.round(H * fy);
    p(c, x, y, '#f2e6cc'); r(c, x - 1, y - 1, 3, 1, '#d84a3a'); p(c, x, y - 2, '#d84a3a'); p(c, x - 1, y - 1, '#ffffff');
    p(c, x + 3, y + 1, '#f2e6cc'); p(c, x + 3, y, '#c8a060');
  }
  for (const [fx, fy] of [[0.05, 0.5], [0.95, 0.36], [0.7, 0.62]]) {
    const x = Math.round(W * fx), y = Math.round(H * fy);
    r(c, x - 2, y - 2, 5, 3, P.busch); r(c, x - 1, y - 3, 3, 1, P.busch); p(c, x - 1, y - 2, ton(P.busch, 0.25));
    if (winter) r(c, x - 1, y - 3, 3, 1, '#ffffff'); else p(c, x + 1, y - 1, '#c83a3a');
  }

  // Die Futterraufe in der Mitte: Pfosten, Heu, Dach, Salzleckstein
  const kx = Math.round(W / 2), ky = Math.round(H * 0.55);
  r(c, kx - 10, ky + 3, 21, 2, 'rgba(0,0,0,0.15)');
  r(c, kx - 9, ky - 9, 2, 12, '#6a4428'); r(c, kx + 8, ky - 9, 2, 12, '#6a4428');
  r(c, kx - 8, ky - 4, 17, 5, '#8a5a32'); r(c, kx - 8, ky - 4, 17, 1, '#a8763e');
  for (let i = 0; i < 16; i += 2) r(c, kx - 8 + i, ky - 6, 1, 2, i % 4 ? '#e8c870' : '#d8b050');   // Heu
  for (let i = 0; i < 17; i += 3) r(c, kx - 8 + i, ky - 3, 1, 4, '#6a4428');                       // Gitter
  for (let i = 0; i < 6; i++) r(c, kx - 12 + i, ky - 10 - i, 25 - i * 2, 1, i % 2 ? '#7a4a2a' : '#8a5a32');   // Dach
  if (winter) for (let i = 3; i < 6; i++) r(c, kx - 11 + i, ky - 11 - i, 23 - i * 2, 1, '#ffffff');
  r(c, kx + 13, ky - 5, 1, 8, '#6a4428'); r(c, kx + 12, ky - 7, 3, 2, '#e8e0d8');                  // Salzleckstein
  p(c, kx - 11, ky - 8, '#3a3a40'); r(c, kx - 12, ky - 7, 3, 3, '#ffd070');                          // Laterne

  // Vorn ein Rahmen: große, dunkle Büsche an den Ecken und am Rand
  const vorn = (x, y, rad) => {
    const f = [ton(P.nadel[0], -0.25), ton(P.nadel[0], -0.1), P.nadel[0]];
    for (let k = 0; k < 3; k++) {
      const rr = rad - k * 1.5, cx = x + (k - 1) * 2, cy = y + k;
      for (let yy = -rr; yy <= rr; yy++) { const w = Math.round(Math.sqrt(rr * rr - yy * yy)); r(c, cx - w, cy + yy, w * 2 + 1, 1, f[k]); }
    }
    for (let i = 0; i < 5; i++) p(c, x - rad + 2 + Math.floor(hash(x + i) * rad * 1.6), y - rad + 2 + Math.floor(hash(y + i) * 3), winter ? '#ffffff' : ton(P.nadel[0], 0.15));
  };
  vorn(2, H + 2, 9); vorn(W - 2, H, 10); vorn(W * 0.5, H + 6, 7); vorn(-2, Math.round(H * 0.62), 5); vorn(W + 1, Math.round(H * 0.47), 5);
  c = ziel;
}

/** Tanne mit Licht- und Schattenseite; k streckt sie. */
function baum(x, y, P, k, f, hell, dunkel, winter) {
  const h = Math.round(6 * k), b = Math.round(2.4 * k);
  r(c, x, y, 1, Math.max(1, Math.round(k)), '#4a2e1a');
  for (let i = 0; i < h; i++) {
    const w = Math.max(0, Math.round((i + 1) / h * b));
    r(c, x - w, y - h + i, w, 1, hell);
    r(c, x, y - h + i, w + 1, 1, f);
    p(c, x + w, y - h + i, dunkel);
    if (winter && i % 3 === 0) r(c, x - w, y - h + i, w + 1, 1, '#ffffff');
  }
}

const flocken = Array.from({ length: 30 }, (_, i) => ({ x: hash(i + 1) * 90, y: hash(i + 2) * 200, v: 6 + hash(i + 3) * 8, s: hash(i + 4) * 6 }));

function zeichne(t) {
  const g = spiel;
  const winter = Z.schnee() > 0;
  baueKulisse(winter);
  c.drawImage(kulisse, 0, 0);
  const li = Z.licht();

  // Tagsüber fallen Lichtstrahlen schräg durch die Wipfel
  if (li.hell > 0.6) {
    c.fillStyle = 'rgba(255,248,210,0.07)';
    for (let i = 0; i < 3; i++) {
      const x0 = 10 + i * 28 + Math.sin(t * 0.3 + i) * 2;
      for (let y = Math.round(H * HINTEN); y < H; y += 1) c.fillRect(Math.round(x0 + (y - H * HINTEN) * 0.35), y, 6 + i * 2, 1);
    }
  }

  // Tiere (nach y sortiert, vorne liegt vorn)
  for (const tier of [...g.tiere].sort((a, b) => a.y - b.y)) {
    const satt = tier.satt >= 0;
    const hop = tier.art === 'hase' || tier.art === 'gold' ? Math.abs(Math.sin(tier.t * 8 + tier.phase)) * 5 : 0;
    const x = Math.round(tier.x), y = Math.round(tier.y - (satt && tier.satt < 0.6 ? Math.abs(Math.sin(tier.satt * 14)) * 4 : hop));
    // Schatten, kleiner, je höher das Tier springt
    const sw = tier.art === 'reh' ? 11 : 8;
    c.fillStyle = 'rgba(20,30,20,0.22)';
    c.fillRect(Math.round(tier.x - sw / 2 + (hop > 2 ? 1 : 0)), Math.round(tier.y), sw - (hop > 2 ? 2 : 0), 1);
    const laeuft = !satt && !(tier.art === 'reh' && tier.grasen > 0 && Math.abs(tier.x - W / 2) < 18);
    ({ hase, eich, reh, gold: goldhase }[tier.art])(x, y, tier.dir, tier.t, laeuft, hop);
    if (satt && tier.satt < 0.9) {
      futter(tier.art, x + tier.dir * 4, y - (tier.art === 'reh' ? 13 : 8));
      herz(x - 3, y - 15 - tier.satt * 10); herz(x + 2, y - 13 - tier.satt * 14);
    }
  }
  // Fehlgriff: kleiner Staub- oder Schneewirbel
  for (const f of g.fehl) {
    const a = f.t / 0.3, rr = 1 + a * 3;
    c.fillStyle = winter ? `rgba(255,255,255,${1 - a})` : `rgba(160,130,90,${1 - a})`;
    for (let k = 0; k < 6; k++) { const w = k / 6 * Math.PI * 2; c.fillRect(Math.round(f.x + Math.cos(w) * rr), Math.round(f.y + Math.sin(w) * rr * 0.6), 1, 1); }
  }
  for (const x of g.texte) { const s = x.text; pixText(c, s, Math.round(x.x - textBreite(s) / 2), Math.round(x.y - x.t * 12), x.text.length > 3 ? '#ffb040' : '#ffe060'); }

  // Wetter: Schnee im Winter, fallende Blätter im Herbst
  for (const fl of flocken) {
    fl.y += fl.v / 60; if (fl.y > H) { fl.y = 8; fl.x = Math.random() * W; }
    const x = fl.x + Math.sin(t * 1.3 + fl.s) * (winter ? 2 : 4);
    if (winter) p(c, x, fl.y, '#ffffff');
    else if (fl.s < 1.2) p(c, x, fl.y, ['#d88a3a', '#c8622a', '#e8b040'][Math.floor(fl.s * 2.5)]);
  }

  // Abends und nachts: dunkler, die Laterne an der Raufe leuchtet
  if (li.hell < 0.9) {
    const nacht = 1 - li.hell;
    c.fillStyle = `rgba(14,20,62,${(nacht * 0.5).toFixed(3)})`;
    c.fillRect(0, 0, W, H);
    const kx = Math.round(W / 2) - 11, ky = Math.round(H * 0.55) - 6;
    c.fillStyle = `rgba(255,200,110,${(nacht * 0.1).toFixed(3)})`;
    for (let rr = 3; rr <= 11; rr += 4)
      for (let yy = -rr; yy <= rr; yy++) { const w = Math.round(Math.sqrt(rr * rr - yy * yy)); c.fillRect(kx - w, ky + yy, w * 2 + 1, 1); }
    r(c, kx - 1, ky - 1, 3, 3, '#ffe090');
  }

  // Kopfzeile: Holzbrett mit Uhr, Kette und Punkten
  r(c, 0, 0, W, 10, '#6a4428'); r(c, 0, 9, W, 1, '#3a2414'); r(c, 0, 0, W, 1, '#8a5a32');
  for (let x = 14; x < W; x += 23) p(c, x, 4, '#4a2e1a');
  const rest = Math.max(0, Math.ceil(C.LICHTUNG_DAUER - Math.max(0, g.t)));
  // Uhr: kleines Zifferblatt
  r(c, 2, 2, 5, 5, '#f4ead8'); p(c, 4, 3, '#2a1a10'); p(c, 4, 4, '#2a1a10'); p(c, 5, 4, '#2a1a10');
  pixText(c, String(rest), 9, 2, rest <= 5 && Math.floor(t * 4) % 2 ? '#ff7a6a' : '#ffffff');
  // Kette mit ablaufendem Balken
  if (g.kette > 1) {
    pixText(c, 'x' + g.kette, 27, 2, '#7ae07a');
    r(c, 39, 4, 14, 2, '#3a2414'); r(c, 39, 4, Math.round(14 * Math.max(0, g.ketteT) / 1.6), 2, '#7ae07a');
  }
  const ps = String(g.punkte);
  pixText(c, ps, W - 17 - textBreite(ps), 2, '#ffe060');
  // Countdown und Ende
  if (g.t < 0) gross(String(Math.ceil(-g.t)), '#ffffff');
  else if (g.t < 0.6) gross('LOS!', '#ffe060');
  if (g.aus) gross('ZEIT!', '#ffe060');
}

function gross(s, f) {
  // Doppelt große Pixelschrift über einen Zwischen-Canvas, auf dunklem Band
  const w = textBreite(s) + 2;
  const tmp = gross.cv || (gross.cv = document.createElement('canvas'));
  tmp.width = w; tmp.height = 7;
  const t = tmp.getContext('2d');
  t.clearRect(0, 0, w, 7);
  pixText(t, s, 0, 0, f);
  const y = Math.round(H * 0.38);
  c.fillStyle = 'rgba(30,20,10,0.45)';
  c.fillRect(0, y - 4, W, 22);
  c.drawImage(tmp, Math.round(W / 2 - w), y, w * 2, 14);
}
function herz(x, y) { x = Math.round(x); y = Math.round(y); p(c, x, y, '#ff5a7a'); p(c, x + 2, y, '#ff5a7a'); r(c, x, y + 1, 3, 1, '#ff5a7a'); p(c, x + 1, y + 2, '#ff5a7a'); }
/** Das Futter, das das Tier gerade bekommt: Möhre, Nuss, Apfel, goldene Möhre. */
function futter(art, x, y) {
  x = Math.round(x); y = Math.round(y);
  if (art === 'eich') { r(c, x, y, 2, 2, '#a8703a'); p(c, x, y - 1, '#6a4428'); }
  else if (art === 'reh') { r(c, x, y, 3, 3, '#d83a3a'); p(c, x, y, '#ff8a8a'); p(c, x + 1, y - 1, '#4a8a3a'); }
  else { const f = art === 'gold' ? '#ffd040' : '#f08a2a'; r(c, x, y, 3, 1, f); p(c, x + 3, y, f); p(c, x - 1, y - 1, '#4a9a3a'); p(c, x - 1, y + 1, '#4a9a3a'); }
}

// --- Die Tiere: je etwa 10 x 10 Pixel, mit Licht- und Schattenseite --------
function hase(x, y, d, t, laeuft, hop, fell = '#b8a898', dunkel = '#958576', bauch = '#e8e0d4') {
  const sx = (dx) => x + d * dx;                // spiegelt mit der Laufrichtung
  const pp = (dx, dy, f) => p(c, sx(dx), y + dy, f);
  // Rumpf rund
  for (const [dx, dy, w] of [[-3, -5, 6], [-4, -4, 8], [-4, -3, 8], [-3, -2, 7]]) for (let i = 0; i < w; i++) pp(dx + i, dy, fell);
  for (let i = 0; i < 5; i++) pp(-3 + i, -5, dunkel);                           // Rücken dunkler
  for (let i = 0; i < 3; i++) pp(1 + i, -2, bauch);                            // Bauch
  // Hinterlauf: im Sprung gestreckt
  if (hop > 2) { pp(-4, -1, dunkel); pp(-5, 0, dunkel); } else { pp(-3, -1, dunkel); pp(-2, -1, dunkel); pp(-4, -1, dunkel); }
  pp(3, -1, fell);                                                            // Vorderpfote
  // Kopf mit Auge, Nase, Ohren
  for (const [dx, dy, w] of [[3, -7, 3], [3, -6, 4], [3, -5, 3]]) for (let i = 0; i < w; i++) pp(dx + i, dy, fell);
  pp(5, -6, '#2a1a10'); pp(6, -5, '#e8909a');
  const ohr = Math.sin(t * 3) > 0.7 ? 1 : 0;
  for (let i = 0; i < 4; i++) { pp(3, -8 - i, fell); pp(4 + ohr * (i > 1 ? 1 : 0), -8 - i, i > 0 ? '#e8b0b8' : fell); }
  pp(5, -9, fell); pp(5, -10, fell);
  // Puschel
  pp(-5, -4, '#ffffff'); pp(-5, -3, '#ffffff'); pp(-6, -4, '#f4f4f4');
}
function goldhase(x, y, d, t, laeuft, hop) {
  hase(x, y, d, t, laeuft, hop, '#ffd040', '#e0a820', '#fff0a8');
  // Funkeln rundherum
  for (let i = 0; i < 3; i++) {
    const a = t * 4 + i * 2.1;
    if (Math.floor(t * 8 + i) % 3) p(c, x + Math.cos(a) * 7, y - 5 + Math.sin(a) * 5, '#fff8c0');
  }
}
function eich(x, y, d, t, laeuft) {
  const f = '#c8622a', dunkel = '#a04a1e', bauch = '#f0dcc0';
  const sx = (dx) => x + d * dx;
  const pp = (dx, dy, farbe) => p(c, sx(dx), y + dy, farbe);
  // Buschiger Schwanz, nach oben eingerollt
  for (const [dx, dy, w] of [[-6, -10, 3], [-7, -9, 4], [-7, -8, 4], [-6, -7, 3], [-5, -6, 3], [-4, -5, 2], [-4, -4, 2]]) for (let i = 0; i < w; i++) pp(dx + i, dy, f);
  pp(-6, -10, '#e88a4a'); pp(-7, -9, '#e88a4a'); pp(-7, -8, '#e88a4a');
  // Körper
  for (const [dx, dy, w] of [[-2, -5, 4], [-2, -4, 5], [-2, -3, 5], [-1, -2, 4]]) for (let i = 0; i < w; i++) pp(dx + i, dy, f);
  pp(1, -3, bauch); pp(1, -4, bauch); pp(2, -3, bauch);
  pp(-2, -5, dunkel); pp(-2, -4, dunkel);
  // Beine (trippeln beim Laufen)
  const k = laeuft && Math.floor(t * 12) % 2;
  pp(-1, -1, dunkel); pp(2 + k, -1, dunkel);
  // Kopf mit Ohrpinsel
  for (const [dx, dy, w] of [[2, -7, 3], [2, -6, 4]]) for (let i = 0; i < w; i++) pp(dx + i, dy, f);
  pp(4, -7, '#2a1a10'); pp(5, -6, '#3a2a1a'); pp(2, -8, dunkel); pp(2, -9, '#7a3a14');
}
function reh(x, y, d, t, laeuft) {
  const f = '#a8703a', dunkel = '#8a5628', hell = '#c8905a';
  const sx = (dx) => x + d * dx;
  const pp = (dx, dy, farbe) => p(c, sx(dx), y + dy, farbe);
  // Beine, abwechselnd beim Gehen
  const k = laeuft ? Math.floor(t * 6) % 2 : 0;
  for (const [dx, ph] of [[-4, 0], [-2, 1], [2, 0], [4, 1]]) {
    const vor = ph === k ? 1 : 0;
    for (let i = 0; i < 5; i++) pp(dx + (i > 2 ? vor : 0), -5 + i, dunkel);
    pp(dx + vor, 0, '#3a2a1a');
  }
  // Rumpf
  for (const [dx, dy, w] of [[-5, -9, 10], [-6, -8, 12], [-6, -7, 12], [-5, -6, 11]]) for (let i = 0; i < w; i++) pp(dx + i, dy, f);
  for (let i = 0; i < 9; i++) pp(-4 + i, -9, dunkel);                       // Rücken
  for (let i = 0; i < 6; i++) pp(-2 + i, -6, hell);                         // Bauch
  pp(-6, -8, '#f8f4ea'); pp(-6, -7, '#f8f4ea'); pp(-7, -8, '#f8f4ea');     // weißer Spiegel
  pp(-2, -8, '#e8d8b8'); pp(1, -8, '#e8d8b8'); pp(3, -7, '#e8d8b8');       // Tupfen
  // Hals und Kopf (beim Grasen gesenkt)
  const unten = !laeuft;
  if (unten) {
    for (let i = 0; i < 3; i++) { pp(5 + i, -7 + i, f); pp(6 + i, -7 + i, f); }
    for (const [dx, dy, w] of [[7, -4, 3], [8, -3, 3]]) for (let i = 0; i < w; i++) pp(dx + i, dy, f);
    pp(9, -4, '#2a1a10'); pp(10, -2, '#2a1a10'); pp(7, -6, dunkel); pp(6, -7, dunkel);
  } else {
    for (let i = 0; i < 4; i++) { pp(5, -10 - i, f); pp(6, -10 - i, f); }
    for (const [dx, dy, w] of [[5, -15, 4], [5, -14, 5], [6, -13, 4]]) for (let i = 0; i < w; i++) pp(dx + i, dy, f);
    pp(8, -15, '#2a1a10'); pp(9, -14, '#2a1a10'); pp(10, -14, '#2a1a10');  // Auge, Nase
    pp(5, -16, dunkel); pp(4, -17, dunkel); pp(6, -17, dunkel);             // Ohren
  }
}
