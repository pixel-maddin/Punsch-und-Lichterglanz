/*
 * lichtung.js - Minispiel „Waldlichtung" (09.10.): Hasen, Eichhörnchen und
 * Rehe ziehen durch die Lichtung. Antippen füttert sie - das gibt Punkte,
 * schnelles Füttern hintereinander eine Kette bis ×5. Eine Runde dauert
 * LICHTUNG_DAUER Sekunden. Was die Punkte bringen (Sterne, Rekord, Deko),
 * rechnet spiel.js aus (`lichtungErgebnis`).
 *
 * Eigenes Vollbild-Canvas (#minispiel), 180 Pixel breit wie die Welt, so hoch
 * wie das Spiel - dieselbe Pixelgröße wie überall sonst. (Die erste Fassung
 * rechnete mit halber Auflösung, damit die Tiere groß genug sind; das sah
 * gröber aus als der Rest, gemeldet 09.10.) Die Tiere sind deshalb echte
 * Sprites mit doppelt so vielen Pixeln, nicht hochgezogene kleine.
 */
import * as C from './config.js?v=202610101357';
import * as Z from './zeit.js?v=202610101357';
import * as T from './ton.js?v=202610101357';
import * as MH from './minihud.js?v=202610101357';
import { r, p, ton, text as pixText, textBreite } from './pixel.js?v=202610101357';

const $ = (s) => document.querySelector(s);
const W = 180;
// tempo in Pixeln je Sekunde, radius = Trefferkreis um die Körpermitte.
// Rehe sind die schnellsten (Nutzerwunsch: „die Rehe können schon schnell
// rennen") und bringen deshalb am meisten nach dem Goldhasen.
const ARTEN = {
  hase: { wert: 10, tempo: [28, 40], radius: 14 },
  eich: { wert: 20, tempo: [50, 62], radius: 12 },
  reh:  { wert: 30, tempo: [74, 92], radius: 17 },
  gold: { wert: 60, tempo: [58, 70], radius: 14 },
  // Seltene Gäste (10.10.): höchstens einer je Runde, nur alle 4-7 Runden
  // (welche Runde, entscheidet spiel.js: lichtungSelten)
  fuchs:   { wert: 50, tempo: [64, 76], radius: 15 },
  schwein: { wert: 45, tempo: [40, 50], radius: 17 },
  igel:    { wert: 40, tempo: [20, 26], radius: 13 },
};
const MITTE = { hase: 7, eich: 7, reh: 11, gold: 7, fuchs: 7, schwein: 7, igel: 5 };   // Körpermitte über den Füßen
export const SELTENE = { fuchs: 'Fuchs', schwein: 'Wildschwein', igel: 'Igel' };

let cv = null, c = null, H = 320;
let stufe = C.MINI_STUFEN[1];   // Schwierigkeit der laufenden Runde
let spiel = null, rafId = 0, letzte = 0, fertig = null;
export const istOffen = () => !!spiel;
/** Zum Testen (Autopilot im Browser): der laufende Zustand. */
export const zustand = () => spiel;
/** Für Tests: Körpermitte eines Tieres (dorthin tippt der Autopilot). */
export const mitte = (tier) => ({ x: tier.x, y: tier.y - MITTE[tier.art] });

/**
 * Runde starten. `beiEnde(punkte)` kommt nach Ablauf (ui.js zeigt das Ergebnis).
 * `selten` = Art des seltenen Gastes dieser Runde oder null.
 */
export function starte(hoehe, beiEnde, stufeNr = 1, selten = null) {
  stufe = C.MINI_STUFEN[stufeNr] || C.MINI_STUFEN[1];
  H = Math.round(hoehe); fertig = beiEnde;
  cv = $('#miniCv');
  cv.width = W; cv.height = H;
  c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  spiel = { t: -3, punkte: 0, kette: 1, ketteT: 0, tiere: [], spawnT: 0.4, texte: [], fehl: [], gefuettert: 0, arten: {}, aus: false,
    selten, seltenZeit: zufall(5, C.LICHTUNG_DAUER - 10) };
  $('#minispiel').classList.remove('versteckt');
  MH.an(W, H);
  T.musikPause(true);   // Musik ruht im Minispiel (09.10., Nutzerwunsch)
  cv.onpointerdown = tippe;
  letzte = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(takt);
}
export function schliesse() {
  spiel = null;
  cancelAnimationFrame(rafId);
  $('#minispiel').classList.add('versteckt');
  MH.aus();
  T.musikPause(false);
}

function zufall(a, b) { return a + Math.random() * (b - a); }
function neuesTier(festeArt) {
  const g = spiel;
  const roll = Math.random();
  const art = festeArt || (roll < 0.04 ? 'gold' : roll < 0.22 ? 'reh' : roll < 0.52 ? 'eich' : 'hase');
  const dir = Math.random() < 0.5 ? 1 : -1;
  const a = ARTEN[art];
  g.tiere.push({
    art, dir, x: dir > 0 ? -16 : W + 16, y: Math.round(zufall(H * 0.4, H * 0.88)),
    v: zufall(a.tempo[0], a.tempo[1]) * stufe.tempo, phase: Math.random() * 6, t: 0, satt: -1,
  });
  return g.tiere[g.tiere.length - 1];
}

function tippe(e) {
  const rc = cv.getBoundingClientRect();
  tippeAuf((e.clientX - rc.left) / rc.width * W, (e.clientY - rc.top) / rc.height * H);
}
/** Tipp in Feldkoordinaten. Exportiert für den Autopiloten (`messe`). */
export function tippeAuf(x, y) {
  if (!spiel || spiel.t < 0 || spiel.aus) return;
  let best = null, bd = Infinity;
  for (const tier of spiel.tiere) {
    if (tier.satt >= 0) continue;
    const m = mitte(tier);
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < ARTEN[tier.art].radius + 6 && d < bd) { bd = d; best = tier; }
  }
  if (!best) { spiel.kette = 1; spiel.fehl.push({ x, y, t: 0 }); T.spiele('falsch'); return; }
  // Gefüttert! Kette wächst, wenn es schnell genug ging
  spiel.kette = spiel.ketteT > 0 ? Math.min(5, spiel.kette + 1) : 1;
  spiel.ketteT = 1.6;
  const pkt = Math.round(ARTEN[best.art].wert * spiel.kette * stufe.punkte);
  spiel.punkte += pkt;
  spiel.gefuettert++;
  spiel.arten[best.art] = (spiel.arten[best.art] || 0) + 1;   // fürs Album
  best.satt = 0;
  spiel.texte.push({ x: best.x, y: best.y - 30, text: '+' + pkt, t: 0 });
  T.spiele(best.art === 'gold' || SELTENE[best.art] ? 'spezialKasse' : spiel.kette >= 3 ? 'kasse' : 'greifen');
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
  for (const tier of zwei) { tier.satt = 0.1; spiel.texte.push({ x: tier.x, y: tier.y - 30, text: '+20', t: 0.2 }); }
  spiel.punkte = 340; spiel.kette = 3; spiel.ketteT = 1.1;
  zeichne(performance.now() / 1000);
}

/**
 * Messweg: eine ganze Runde ohne Bildschleife durchrechnen. `takt` = Sekunden
 * zwischen zwei Tipps, `treffer` = Anteil der Tipps, die sitzen (Mensch-Näherung).
 * Gibt die Punkte zurück. Nur zum Einmessen der Schwellen.
 */
export function messe(takt = 0.42, treffer = 1, hoehe = 320, stufeNr = 1) {
  stufe = C.MINI_STUFEN[stufeNr];
  const altFertig = fertig;
  H = hoehe; fertig = null;
  spiel = { t: 0, punkte: 0, kette: 1, ketteT: 0, tiere: [], spawnT: 0.4, texte: [], fehl: [], gefuettert: 0, arten: {}, aus: false };
  let bis = takt;
  while (!spiel.aus) {
    schritt(1 / 60);
    if (spiel.t >= bis) {
      bis += takt;
      const z = spiel.tiere.filter((x) => x.satt < 0 && x.x > 8 && x.x < W - 8).sort((a, b) => Math.abs(a.x - W / 2) - Math.abs(b.x - W / 2))[0];
      if (z) { const m = mitte(z); if (Math.random() < treffer) tippeAuf(m.x, m.y); else tippeAuf(m.x + 40, m.y + 40); }
    }
  }
  const erg = { punkte: spiel.punkte, tiere: spiel.gefuettert };
  spiel = null; fertig = altFertig;
  return erg;
}

function schritt(dt) {
  const g = spiel;
  g.t += dt;
  if (g.t >= 0 && !g.aus) {
    // Tiere kommen immer schneller, höchstens 7 gleichzeitig
    g.spawnT -= dt;
    if (g.spawnT <= 0 && g.tiere.filter((x) => x.satt < 0).length < 7) {
      neuesTier();
      g.spawnT = Math.max(0.35, 0.95 - g.t / C.LICHTUNG_DAUER * 0.55) * zufall(0.7, 1.3) / stufe.tempo;
    }
    // Der seltene Gast kommt einmal, mitten in der Runde, und wird angesagt
    if (g.selten && g.t >= g.seltenZeit) {
      const tier = neuesTier(g.selten);
      tier.y = Math.round(zufall(H * 0.5, H * 0.8));
      g.texte.push({ x: W / 2, y: H * 0.36, text: SELTENE[g.selten] + '!', farbe: '#ffb0e0', t: 0 });
      T.spiele('spezial');
      g.selten = null;
    }
    if (g.ketteT > 0) { g.ketteT -= dt; if (g.ketteT <= 0) g.kette = 1; }
    if (g.t >= C.LICHTUNG_DAUER) {
      g.aus = true;
      if (fertig) T.spiele('fertig');
      setTimeout(() => { if (spiel === g && fertig) fertig(g.punkte, g.gefuettert, g.arten); }, 900);
    }
  }
  for (const tier of g.tiere) {
    tier.t += dt;
    if (tier.satt >= 0) {
      // Freut sich kurz, dann läuft es schnell davon
      tier.satt += dt;
      if (tier.satt > 0.6) tier.x += tier.dir * 120 * dt;
      continue;
    }
    tier.x += tier.dir * tier.v * dt;
    if (tier.art === 'eich') tier.y += Math.sin(tier.t * 7 + tier.phase) * 26 * dt;
  }
  g.tiere = g.tiere.filter((x) => x.x > -30 && x.x < W + 30);
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
 * Die Kulisse wird einmal je Größe und Jahreszeit in ein Zwischenbild
 * gerechnet: Himmel, drei Lagen Wald, Lichtung mit Gras oder Schnee, Pfad,
 * Baumstümpfe, Steine, Pilze, die Futterraufe und vorn ein Rahmen aus
 * Büschen. Je Bild kommen nur Tiere, Wetter und Lichtstrahlen dazu.
 */
let kulisse = null, kulisseSchl = '';
const HINTEN = 0.27;   // bis hier reicht der Wald, darunter ist Lichtung
const KRAUFE = () => ({ x: Math.round(W / 2), y: Math.round(H * 0.55) });

function pal(winter) {
  return winter ? {
    boden: ['#dde7f0', '#e8eff6', '#f3f7fb'], boden2: '#c6d4e2', pfad: '#c8d5e2', pfad2: '#b0c0d0',
    nadel: ['#1a4430', '#24583a', '#33704a'], fern: '#7890a4', mitte: '#3a5e52', schnee: '#ffffff',
    busch: '#3a6248', himmel: ['#9cbcdc', '#b4cee6', '#cadcee'],
  } : {
    boden: ['#5f9748', '#6aa451', '#76ae5a'], boden2: '#4f8540', pfad: '#c0a272', pfad2: '#a48858',
    nadel: ['#183f24', '#22552e', '#2f6c3c'], fern: '#6a8a7a', mitte: '#355a3e', schnee: null,
    busch: '#3a6a30', himmel: ['#9cc4e6', '#b8d6ee', '#d0e4f2'],
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

  // Himmel in drei Bändern über den Wipfeln
  for (let y = 0; y < rand; y++) r(c, 0, y, W, 1, P.himmel[Math.min(2, Math.floor(y / rand * 3))]);
  // Drei Lagen Wald: fern (blass), Mitte, nah
  for (let x = -6; x < W + 6; x += 5) baum(x + Math.round(hash(x) * 3), Math.round(rand * 0.6 + hash(x + 3) * 6), 1.6, P.fern, ton(P.fern, 0.08), ton(P.fern, -0.08), winter);
  for (let x = -6; x < W + 8; x += 8) baum(x + Math.round(hash(x + 5) * 4), Math.round(rand * 0.8 + hash(x + 9) * 8), 2.2 + hash(x + 13) * 0.8, P.mitte, ton(P.mitte, 0.12), ton(P.mitte, -0.2), winter);
  // Boden: drei Töne in weichen Flecken, feine Körnung
  for (let y = rand; y < H; y++) for (let x = 0; x < W; x++) {
    const v = Math.sin(x / 17 + y / 23) * 0.35 + Math.sin(x / 8.3 - y / 11.1) * 0.25 + (hash(x * 31 + y * 7) - 0.5) * 0.5;
    p(c, x, y, P.boden[v < -0.25 ? 0 : v < 0.3 ? 1 : 2]);
  }
  for (let x = 0; x < W; x++) { p(c, x, rand, P.boden2); p(c, x, rand + 1, P.boden2); if (hash(x) < 0.5) p(c, x, rand + 2, P.boden2); }
  for (let x = -4; x < W + 8; x += 11) baum(x + Math.round(hash(x + 17) * 5), rand + 6 + Math.round(hash(x + 21) * 6), 3.2 + hash(x + 23) * 1.2, P.nadel[1], P.nadel[2], P.nadel[0], winter);
  // Grashalme / Schneewehen
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(hash(i + 100) * W), y = Math.floor(rand + 10 + hash(i + 200) * (H - rand - 14));
    if (winter) { r(c, x, y, 4, 1, '#ffffff'); r(c, x + 1, y - 1, 2, 1, '#ffffff'); p(c, x + 1, y + 1, P.boden2); }
    else {
      p(c, x, y, P.boden2); p(c, x + 1, y - 1, P.boden2); p(c, x + 2, y, P.boden2); p(c, x + 1, y - 2, ton(P.boden2, -0.1));
      if (i % 9 === 0) { const f = ['#f0e070', '#e89ab0', '#ffffff', '#b8a0f0'][i % 4]; p(c, x + 1, y - 3, f); p(c, x, y - 3, ton(f, -0.2)); }
    }
  }
  // Ein Pfad, schräg durch die Lichtung, mit Steinchen
  for (let y = rand + 4; y < H; y++) {
    const x = Math.round(W * 0.18 + (y - rand) * 0.42 + Math.sin(y / 18) * 6);
    r(c, x - 7, y, 15, 1, P.pfad2); r(c, x - 6, y, 13, 1, P.pfad);
    if (hash(y) < 0.18) p(c, x - 4 + Math.floor(hash(y + 1) * 9), y, P.pfad2);
    if (hash(y + 7) < 0.05) { p(c, x + 2, y, ton(P.pfad, 0.2)); p(c, x + 3, y, P.pfad2); }
  }
  // Baumstümpfe mit Jahresringen
  const stumpf = (x, y) => {
    r(c, x - 7, y - 6, 14, 7, '#7a5236'); r(c, x - 7, y - 6, 2, 7, '#9a6e4a'); r(c, x + 5, y - 6, 2, 7, '#5a3a24');
    for (let i = 0; i < 3; i++) r(c, x - 5 + i * 4, y - 4, 1, 5, '#6a4630');
    r(c, x - 7, y - 9, 14, 3, '#c8a070'); r(c, x - 4, y - 8, 8, 1, '#a8805a'); p(c, x, y - 8, '#8a6040');
    r(c, x - 9, y, 3, 1, '#5a3a24'); r(c, x + 7, y, 3, 1, '#5a3a24');
    if (winter) { r(c, x - 7, y - 10, 14, 1, '#ffffff'); r(c, x - 5, y - 11, 9, 1, '#ffffff'); }
    else { p(c, x - 6, y - 2, '#4e8a42'); p(c, x - 5, y - 1, '#4e8a42'); }
  };
  stumpf(Math.round(W * 0.13), Math.round(H * 0.42));
  stumpf(Math.round(W * 0.87), Math.round(H * 0.72));
  const stein = (x, y, g) => {
    r(c, x - g, y - g + 1, g * 2 + 1, g, '#8a8c90'); r(c, x - g + 1, y - g, g * 2 - 1, 1, '#a8acb0');
    p(c, x - g + 1, y - g + 1, '#c4c8cc'); r(c, x + g - 1, y - 1, 2, 1, '#6a6c70');
    if (winter) r(c, x - g + 1, y - g, g * 2 - 1, 1, '#ffffff');
  };
  stein(Math.round(W * 0.8), Math.round(H * 0.42), 3); stein(Math.round(W * 0.26), Math.round(H * 0.8), 4);
  stein(Math.round(W * 0.6), Math.round(H * 0.9), 3); stein(Math.round(W * 0.84), Math.round(H * 0.44), 2);
  // Pilze (nicht im Schnee)
  if (!winter) for (const [fx, fy] of [[0.1, 0.62], [0.92, 0.52], [0.42, 0.33]]) {
    const x = Math.round(W * fx), y = Math.round(H * fy);
    r(c, x - 1, y - 3, 2, 3, '#f2e6cc'); r(c, x - 3, y - 5, 6, 2, '#d84a3a'); r(c, x - 2, y - 6, 4, 1, '#d84a3a');
    p(c, x - 2, y - 5, '#ffffff'); p(c, x + 1, y - 6, '#ffffff');
    r(c, x + 4, y - 2, 1, 2, '#f2e6cc'); r(c, x + 3, y - 3, 3, 1, '#c8a060');
  }
  // Beerenbüsche
  for (const [fx, fy] of [[0.05, 0.5], [0.95, 0.36], [0.7, 0.62]]) {
    const x = Math.round(W * fx), y = Math.round(H * fy);
    kreis(x, y - 4, 5, P.busch); kreis(x - 2, y - 6, 3, ton(P.busch, 0.15));
    if (winter) { r(c, x - 3, y - 9, 6, 1, '#ffffff'); r(c, x - 4, y - 8, 3, 1, '#ffffff'); }
    else { p(c, x + 2, y - 3, '#c83a3a'); p(c, x - 1, y - 2, '#c83a3a'); p(c, x + 3, y - 6, '#c83a3a'); }
  }

  // Die Futterraufe in der Mitte: Pfosten, Gitter, Heu, Dach, Salzleckstein, Laterne
  const { x: kx, y: ky } = KRAUFE();
  r(c, kx - 20, ky + 5, 41, 3, 'rgba(0,0,0,0.13)');
  r(c, kx - 18, ky - 18, 3, 24, '#6a4428'); r(c, kx + 16, ky - 18, 3, 24, '#6a4428');
  r(c, kx - 18, ky - 18, 1, 24, '#8a5a32');
  r(c, kx - 16, ky - 8, 33, 10, '#8a5a32'); r(c, kx - 16, ky - 8, 33, 1, '#a8763e'); r(c, kx - 16, ky + 1, 33, 1, '#5a3a22');
  for (let i = 0; i < 33; i += 4) r(c, kx - 16 + i, ky - 7, 1, 8, '#6a4428');
  for (let i = 0; i < 31; i++) { const h = 2 + Math.floor(hash(i + 40) * 3); r(c, kx - 15 + i, ky - 8 - h, 1, h, i % 3 ? '#e8c870' : '#d8b050'); }   // Heu
  for (let i = 0; i < 11; i++) r(c, kx - 24 + i, ky - 20 - i, 49 - i * 2, 1, i % 2 ? '#7a4a2a' : '#8a5a32');   // Dach
  r(c, kx - 24, ky - 20, 49, 1, '#5a3a22');
  if (winter) for (let i = 5; i < 11; i++) r(c, kx - 23 + i, ky - 21 - i, 47 - i * 2, 1, i === 5 ? '#dde8f2' : '#ffffff');
  r(c, kx + 26, ky - 10, 2, 16, '#6a4428'); r(c, kx + 24, ky - 14, 6, 4, '#e8e0d8'); r(c, kx + 24, ky - 14, 6, 1, '#ffffff');   // Salzleckstein
  r(c, kx - 22, ky - 17, 1, 2, '#3a3a40'); r(c, kx - 24, ky - 15, 5, 5, '#3a3a40'); r(c, kx - 23, ky - 14, 3, 3, '#ffd070');       // Laterne

  // Vorn ein Rahmen: große, dunkle Büsche an den Ecken und am Rand
  const vorn = (x, y, rad) => {
    const f = [ton(P.nadel[0], -0.25), ton(P.nadel[0], -0.1), P.nadel[0]];
    for (let k = 0; k < 3; k++) kreis(x + (k - 1) * 4, y + k * 2, rad - k * 3, f[k]);
    for (let i = 0; i < 9; i++) {
      const xx = x - rad + 3 + Math.floor(hash(x + i) * rad * 1.6), yy = y - rad + 3 + Math.floor(hash(y + i) * 5);
      p(c, xx, yy, winter ? '#ffffff' : ton(P.nadel[0], 0.15)); p(c, xx + 1, yy, winter ? '#e6eef5' : ton(P.nadel[0], 0.08));
    }
  };
  vorn(4, H + 4, 18); vorn(W - 4, H, 20); vorn(W * 0.5, H + 12, 14); vorn(-4, Math.round(H * 0.62), 10); vorn(W + 2, Math.round(H * 0.47), 10);

  c = ziel;
}

function kreis(cx, cy, rad, f) {
  c.fillStyle = f;
  for (let y = -rad; y <= rad; y++) { const w = Math.round(Math.sqrt(rad * rad - y * y)); c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
}

/** Tanne mit Licht- und Schattenseite in Stufen; k streckt sie. */
function baum(x, y, k, f, hell, dunkel, winter) {
  const h = Math.round(6 * k), b = Math.round(2.4 * k);
  r(c, x, y - 1, 1, Math.max(2, Math.round(k)), '#4a2e1a');
  const stufen = Math.max(2, Math.round(k));
  for (let i = 0; i < h; i++) {
    // Sägezahn: jede Stufe wird nach unten breiter und springt dann zurück
    const s = Math.floor(i / (h / stufen)), innen = (i % (h / stufen)) / (h / stufen);
    const w = Math.max(0, Math.round((s + 1) / stufen * b * (0.55 + innen * 0.45)));
    r(c, x - w, y - h + i, w, 1, hell);
    r(c, x, y - h + i, w + 1, 1, f);
    p(c, x + w, y - h + i, dunkel);
    if (winter && innen < 0.2) r(c, x - w, y - h + i, w + 1, 1, '#ffffff');
  }
}

// --- Die Tiere als Sprites (Blick nach rechts, Füße in der untersten Zeile) --
// . leer · a Fell · b dunkel · c hell/Bauch · w weiß · k schwarz · p rosa
const SPRITE = {
  hase: [
    '..........b.b...',
    '.........bpbpb..',
    '.........bpbpb..',
    '.........bpbab..',
    '..........bab...',
    '.........aaaaa..',
    '........aaakaaa.',
    '........aaaaaap.',
    '...aaaaaaaaacc..',
    '.waaaaaaaaaacc..',
    'wwbaaaaaaaaacc..',
    '.wbbaaaaaaacc...',
  ],
  haseSitz: ['..bbaabbbaaa....', '..bb.....bba....'],
  haseSprung: ['.bbb.....aa.....', 'bb.........aa...'],
  eich: [
    '.aaa..........',
    'aacaa.........',
    'aaacaa....b...',
    'aa..ca...aab..',
    'aa...a..aaaaa.',
    'aa......aaaka.',
    '.aa....aaaaaak',
    '..aa..aaaacca.',
    '...aaaaaaacc..',
    '....aaaaaacc..',
    '....aaaaaaa...',
  ],
  eichBeine: [['....bb..bb....'], ['.....bb.b.b...']],
  reh: [
    '...................bb..',
    '..................bab.b',
    '..................baaab',
    '.................aaaaaa',
    '.................aakaaa',
    '................aaaaaak',
    '...............aaaa....',
    '..............aaaa.....',
    '.w............aaa......',
    'wwaaaaaaaaaaaaaaa......',
    '.waaaaaaaaaaaaaab......',
    '.aacaacaaacaaaaa.......',
    '.aaaaaaaaaaaaaaa.......',
    '..ccccccccccccc........',
  ],
  // Galopp in vier Bildern: gestreckt, sammeln, unter dem Bauch, abstoßen
  rehBeine: [
    ['.b...b........b....b...', 'b.....b......b......b..', 'b......b....b........b.', 'k.......k..k.........k.'],
    ['..b..b.......b...b.....', '..b...b......b...b.....', '..b....b....b....b.....', '..k....k....k....k.....'],
    ['....bb........bb.......', '....bb........bb.......', '....b.b......b.b.......', '....k.k......k.k.......'],
    ['...b..b......b..b......', '..b....b....b....b.....', '.b......b..b......b....', '.k......k..k......k....'],
  ],
  // Seltene Gäste (10.10.)
  fuchs: [
    '...............b.b..',
    '..............babab.',
    '..............aaaaa.',
    '..............aakaa.',
    '.w...........aaaacck',
    'wwa..........aaacc..',
    'waaa.......aaaacc...',
    '.aaaa..aaaaaaaacc...',
    '..aaaaaaaaaaaaac....',
    '...aaaaaaaaaaaa.....',
    '....ccccccccccc.....',
  ],
  fuchsBeine: [['.....k.k......k.k...', '.....k.k......k.k...'], ['....k...k....k...k..', '....k...k....k...k..']],
  schwein: [
    '..............bb......',
    '.......bbbbbbbbbb.....',
    '.....baaaaaaaaaaab....',
    '....baaaaaaaaaaaakab..',
    '...baaaaaaaaaaaaaaaab.',
    'b.baaaaaaaaaaaaaaaaapp',
    '.bbaaaaaaaaaaaaaaaawpp',
    '...aaaaaaaaaaaaaaab...',
    '....aaaaaaaaaaaaab....',
  ],
  schweinBeine: [['....bb.........bb.....', '....kk.........kk.....'], ['.....bb.......bb......', '....k..k.....k..k.....']],
  igel: [
    '...b.b.b......',
    '..bababab.....',
    '.babababab....',
    'bababababacc..',
    'abababababckc.',
    '.babababacccck',
    '..aaaaaaacc...',
  ],
  igelBeine: [['...k...k..k...'], ['....k.k...k...']],
};
const FARBEN = {
  fuchs: { a: '#e0702a', b: '#3a2010', c: '#f8ecd8', w: '#ffffff', k: '#2a1a10' },
  schwein: { a: '#5e4e44', b: '#3a2c24', p: '#a08070', w: '#f8f4ea', k: '#120c08' },
  igel: { a: '#7a5a3a', b: '#3a2818', c: '#d8b890', k: '#1a1008' },
  hase: { a: '#b8a898', b: '#8a7a6c', c: '#e8e0d4', w: '#ffffff', k: '#2a1a10', p: '#e8a0a8' },
  gold: { a: '#ffd040', b: '#d8a020', c: '#fff0a8', w: '#ffffff', k: '#5a3a10', p: '#ffb0a0' },
  eich: { a: '#c8622a', b: '#7a3a14', c: '#f0dcc0', k: '#2a1a10' },
  reh: { a: '#a8703a', b: '#6a4220', c: '#d8b088', w: '#f8f4ea', k: '#2a1a10' },
};
function sprite(zeilen, farben, x, fuss, dir) {
  const h = zeilen.length, w = zeilen[0].length;
  const links = Math.round(x - w / 2);
  for (let j = 0; j < h; j++) {
    const z = zeilen[j];
    for (let i = 0; i < z.length; i++) {
      const ch = z[i];
      if (ch === '.') continue;
      p(c, dir > 0 ? links + i : links + w - 1 - i, fuss - h + j + 1, farben[ch]);
    }
  }
}

const flocken = Array.from({ length: 44 }, (_, i) => ({ x: hash(i + 1) * 180, y: hash(i + 2) * 400, v: 12 + hash(i + 3) * 16, s: hash(i + 4) * 6 }));

function zeichne(t) {
  const g = spiel;
  const winter = Z.schnee() > 0;
  baueKulisse(winter);
  c.drawImage(kulisse, 0, 0);
  const li = Z.licht();

  // Tagsüber fallen Lichtstrahlen schräg durch die Wipfel
  if (li.hell > 0.6) {
    c.fillStyle = 'rgba(255,248,210,0.06)';
    for (let i = 0; i < 3; i++) {
      const x0 = 20 + i * 56 + Math.sin(t * 0.3 + i) * 4;
      for (let y = Math.round(H * HINTEN); y < H; y++) c.fillRect(Math.round(x0 + (y - H * HINTEN) * 0.35), y, 12 + i * 4, 1);
    }
  }

  // Tiere (nach y sortiert, vorne liegt vorn)
  for (const tier of [...g.tiere].sort((a, b) => a.y - b.y)) {
    const satt = tier.satt >= 0;
    const springt = tier.art === 'hase' || tier.art === 'gold';
    const hop = springt && !satt ? Math.abs(Math.sin(tier.t * 8 + tier.phase)) * 8 : 0;
    const freu = satt && tier.satt < 0.6 ? Math.abs(Math.sin(tier.satt * 14)) * 5 : 0;
    // Das Reh setzt im Galopp leicht auf und ab
    const galopp = satt ? 0 : tier.art === 'reh' ? Math.abs(Math.sin(tier.t * 12)) * 3
      : tier.art === 'fuchs' ? Math.abs(Math.sin(tier.t * 11)) * 2 : tier.art === 'schwein' ? Math.abs(Math.sin(tier.t * 9)) * 1.5 : 0;
    const x = Math.round(tier.x), y = Math.round(tier.y - hop - freu - galopp);
    // Schatten, kleiner, je höher das Tier springt
    const sw = ({ reh: 20, schwein: 20, fuchs: 16, igel: 12 }[tier.art] || 14) - Math.round(hop);
    c.fillStyle = 'rgba(20,30,20,0.22)';
    c.fillRect(Math.round(tier.x - sw / 2), Math.round(tier.y), sw, 2);
    zeichneTier(tier, x, y, t, hop > 3, satt, winter);
    if (satt && tier.satt < 0.9) {
      futter(tier.art, x + tier.dir * 8, y - (tier.art === 'reh' ? 24 : tier.art === 'igel' ? 12 : 16));
      herz(x - 6, y - 26 - tier.satt * 18); herz(x + 4, y - 22 - tier.satt * 24);
    }
  }
  // Fehlgriff: kleiner Staub- oder Schneewirbel
  for (const f of g.fehl) {
    const a = f.t / 0.3, rr = 2 + a * 6;
    c.fillStyle = winter ? `rgba(255,255,255,${1 - a})` : `rgba(160,130,90,${1 - a})`;
    for (let k = 0; k < 8; k++) { const w = k / 8 * Math.PI * 2; c.fillRect(Math.round(f.x + Math.cos(w) * rr), Math.round(f.y + Math.sin(w) * rr * 0.6), 1, 1); }
  }
  // Schwebende Texte als DOM (minihud.js) - einmal anstoßen, sie steigen selbst
  for (const x of g.texte) if (!x.gezeigt) { x.gezeigt = true; MH.schwebe(x.x, x.y, x.text, x.farbe || (x.text.length > 3 ? '#ffb040' : '#ffe27a'), x.text.length > 5 ? 0.8 : 1.1); }

  // Wetter: Schnee im Winter, fallende Blätter im Herbst
  for (const fl of flocken) {
    fl.y += fl.v / 60; if (fl.y > H) { fl.y = 12; fl.x = Math.random() * W; }
    const x = fl.x + Math.sin(t * 1.3 + fl.s) * (winter ? 3 : 7);
    if (winter) { p(c, x, fl.y, '#ffffff'); if (fl.s > 3) p(c, x + 1, fl.y, '#ffffff'); }
    else if (fl.s < 1.2) { const f = ['#d88a3a', '#c8622a', '#e8b040'][Math.floor(fl.s * 2.5)]; p(c, x, fl.y, f); p(c, x + 1, fl.y + (Math.sin(t * 3 + fl.s) > 0 ? 1 : 0), f); }
  }

  // Abends und nachts: dunkler, die Laterne an der Raufe leuchtet
  if (li.hell < 0.9) {
    const nacht = 1 - li.hell;
    c.fillStyle = `rgba(14,20,62,${(nacht * 0.5).toFixed(3)})`;
    c.fillRect(0, 0, W, H);
    const { x: kx0, y: ky0 } = KRAUFE(), kx = kx0 - 22, ky = ky0 - 13;
    c.fillStyle = `rgba(255,200,110,${(nacht * 0.08).toFixed(3)})`;
    for (let rr = 5; rr <= 22; rr += 6) for (let yy = -rr; yy <= rr; yy++) { const w = Math.round(Math.sqrt(rr * rr - yy * yy)); c.fillRect(kx - w, ky + yy, w * 2 + 1, 1); }
    r(c, kx - 1, ky - 1, 3, 3, '#ffe090');
  }

  // Kopfzeile, Countdown und Ende als DOM (minihud.js)
  const rest = Math.max(0, Math.ceil(C.LICHTUNG_DAUER - Math.max(0, g.t)));
  MH.setzeKopf({ zeit: rest, knapp: rest <= 5 && g.t >= 0, kette: g.kette, ketteAnteil: Math.max(0, g.ketteT) / 1.6, punkte: g.punkte });
  MH.hinweis(g.t < 0 ? `Schwierigkeit: ${stufe.name}` : null);
  MH.mitte(g.aus ? 'ZEIT!' : g.t < 0 ? String(Math.ceil(-g.t)) : g.t < 0.6 ? 'LOS!' : null, g.t < 0 && !g.aus ? '#ffffff' : '#ffe27a');
}

/** Pixelschrift vergrößert (k-fach); links=true: x ist die linke Kante, sonst die Mitte. */
function gross(s, f, x, y, k, links) {
  const w = textBreite(s) + 2;
  const tmp = gross.cv || (gross.cv = document.createElement('canvas'));
  tmp.width = w; tmp.height = 7;
  const t = tmp.getContext('2d');
  t.clearRect(0, 0, w, 7);
  pixText(t, s, 0, 0, f);
  c.drawImage(tmp, Math.round(links ? x : x - w * k / 2), Math.round(y), w * k, 7 * k);
}

function zeichneTier(tier, x, y, t, inDerLuft, satt, winter) {
  const d = tier.dir;
  if (tier.art === 'hase' || tier.art === 'gold') {
    const f = tier.art === 'gold' ? FARBEN.gold : FARBEN.hase;   // kein weißer Schneehase: auf Schnee unsichtbar
    sprite([...SPRITE.hase, ...(inDerLuft ? SPRITE.haseSprung : SPRITE.haseSitz)], f, x, y, d);
    if (tier.art === 'gold') for (let i = 0; i < 4; i++) {
      const a = t * 4 + i * 1.6;
      if (Math.floor(t * 8 + i) % 3) { const sx = x + Math.cos(a) * 12, sy = y - 8 + Math.sin(a) * 9; p(c, sx, sy, '#fff8c0'); p(c, sx + 1, sy, '#ffe060'); p(c, sx, sy + 1, '#ffe060'); }
    }
  } else if (tier.art === 'eich') {
    const k = satt ? 0 : Math.floor(t * 14) % 2;   // war !satt && …: false als Index → Absturz beim Füttern (09.10.)
    sprite([...SPRITE.eich, ...SPRITE.eichBeine[k]], FARBEN.eich, x, y, d);
  } else if (SELTENE[tier.art]) {
    const k = satt ? 0 : Math.floor(t * (tier.art === 'igel' ? 8 : 12)) % 2;
    sprite([...SPRITE[tier.art], ...SPRITE[tier.art + 'Beine'][k]], FARBEN[tier.art], x, y, d);
  } else {
    const k = satt ? 2 : Math.floor(t * 12) % 4;
    sprite([...SPRITE.reh, ...SPRITE.rehBeine[k]], FARBEN.reh, x, y, d);
  }
}

function herz(x, y) {
  x = Math.round(x); y = Math.round(y);
  r(c, x, y, 2, 1, '#ff5a7a'); r(c, x + 3, y, 2, 1, '#ff5a7a'); r(c, x - 1, y + 1, 7, 2, '#ff5a7a');
  r(c, x, y + 3, 5, 1, '#ff5a7a'); r(c, x + 1, y + 4, 3, 1, '#ff5a7a'); p(c, x + 2, y + 5, '#ff5a7a'); p(c, x, y + 1, '#ffb0c0');
}
/** Das Futter, das das Tier gerade bekommt: Möhre, Nuss, Apfel, goldene Möhre - Ei, Eicheln, Beeren. */
function futter(art, x, y) {
  x = Math.round(x); y = Math.round(y);
  if (art === 'fuchs') { r(c, x - 2, y - 2, 4, 6, '#f8f4ea'); r(c, x - 3, y - 1, 6, 4, '#f8f4ea'); p(c, x - 1, y - 1, '#ffffff'); r(c, x - 2, y + 3, 4, 1, '#d8d0c0'); }
  else if (art === 'schwein') for (const [dx, dy] of [[-3, 0], [2, -1], [0, 2]]) { kreis(x + dx, y + dy, 2, '#a8703a'); r(c, x + dx - 2, y + dy - 2, 5, 1, '#6a4428'); }
  else if (art === 'igel') for (const [dx, dy] of [[-2, 0], [1, -1], [0, 2], [3, 1]]) { r(c, x + dx, y + dy, 2, 2, '#7a2a8a'); p(c, x + dx, y + dy, '#c080d0'); }
  else if (art === 'eich') { kreis(x, y, 2, '#a8703a'); r(c, x - 2, y - 2, 5, 1, '#6a4428'); p(c, x, y - 3, '#6a4428'); p(c, x - 1, y, '#c89058'); }
  else if (art === 'reh') { kreis(x, y, 3, '#d83a3a'); p(c, x - 1, y - 1, '#ff8a8a'); p(c, x, y - 4, '#6a4428'); r(c, x + 1, y - 5, 2, 1, '#4a8a3a'); }
  else {
    const f = art === 'gold' ? '#ffd040' : '#f08a2a', f2 = art === 'gold' ? '#d8a020' : '#c8621a';
    r(c, x - 3, y - 1, 6, 3, f); r(c, x + 3, y, 2, 1, f); p(c, x - 1, y, f2); p(c, x + 1, y + 1, f2);
    p(c, x - 4, y - 2, '#4a9a3a'); p(c, x - 5, y - 3, '#4a9a3a'); p(c, x - 4, y + 1, '#4a9a3a'); p(c, x - 5, y + 2, '#3a8a2a');
  }
}

/** Ein Tier fürs Album (ui.js) auf eine fremde Fläche malen, stehend. */
export function zeichneTierAlbum(ctx, art, x, y) {
  const alt = c;
  c = ctx;
  zeichneTier({ art, dir: 1, t: 0, phase: 0 }, x, y, 0, false, true, false);
  c = alt;
}
