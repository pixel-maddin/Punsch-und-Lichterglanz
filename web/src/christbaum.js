/*
 * christbaum.js - Minispiel „Christbaumverkauf" (09.10.): Ein Kunde fährt
 * vor und will einen bestimmten Baum - Sorte und Größe stehen in seiner
 * Sprechblase. Den richtigen Baum auf dem Platz antippen und mit drei
 * Tipps fällen, an der Netzmaschine dreimal tippen, dann das Auto antippen:
 * Der Baum fliegt aufs Dach, der Kunde fährt los.
 *
 * Punkte je Kunde: Grundwert plus Geduld, die noch übrig war, mal Kette
 * (fehlerfreie Kunden hintereinander, bis ×3). Falscher Baum: Geduld weg,
 * Kette reißt. Eine Runde dauert BAUM_DAUER Sekunden. Was die Punkte
 * bringen, rechnet spiel.js aus (`miniErgebnis('baum', …)`).
 *
 * Gleiches Gerüst wie lichtung.js: eigenes Vollbild-Canvas (#minispiel),
 * 180 Pixel breit, Kulisse als Zwischenbild, gezeichnet nur solange offen.
 */
import * as C from './config.js?v=202610101407';
import * as Z from './zeit.js?v=202610101407';
import * as T from './ton.js?v=202610101407';
import * as MH from './minihud.js?v=202610101407';
import { r, p, ton, text as pixText, textBreite, figurKlein, neueFarben } from './pixel.js?v=202610101407';

const $ = (s) => document.querySelector(s);
const W = 180;
export const SORTEN = {
  nordmann: { name: 'NORDMANN', f: ['#154424', '#1f5a2e', '#0d3018'] },
  blau:     { name: 'BLAUFICHTE', f: ['#4d7c8a', '#6596a2', '#365c68'] },
  fichte:   { name: 'FICHTE', f: ['#5c9c30', '#78b844', '#44782a'] },
};
const ARTEN = Object.keys(SORTEN);
const GROESSE = ['KLEIN', 'MITTEL', 'GROSS'];
const HOEHE = [15, 21, 28];
const SAEGEN = 3, NETZ = 3;
const AUTO_FARBEN = ['#c83a32', '#3a6ab8', '#e8c030', '#2f8a3a', '#8a4ab8', '#e8e8e4', '#3a3a44'];

let cv = null, c = null, H = 320;
let stufe = C.MINI_STUFEN[1];   // Schwierigkeit der laufenden Runde
let spiel = null, rafId = 0, letzte = 0, fertig = null;
export const istOffen = () => !!spiel;
export const zustand = () => spiel;

// Wo was steht (abhängig von H)
const REIHEN = () => [0.35, 0.48, 0.61].map((f) => Math.round(H * f));
const SPALTEN = [24, 66, 108, 150];
const MASCHINE = () => ({ x: 36, y: Math.round(H * 0.84) });
const PARKPLATZ = () => ({ x: 130, y: Math.round(H * 0.9) });

/** Runde starten. `beiEnde(punkte, kunden)` kommt nach Ablauf. */
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
  T.musikPause(true);   // Musik ruht im Minispiel (09.10., Nutzerwunsch)
  cv.onpointerdown = (e) => {
    const rc = cv.getBoundingClientRect();
    tippeAuf((e.clientX - rc.left) / rc.width * W, (e.clientY - rc.top) / rc.height * H);
  };
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
const wahl = (l) => l[Math.floor(Math.random() * l.length)];

function neuesSpiel(t0) {
  const g = { t: t0, punkte: 0, kette: 1, kunden: 0, baeume: [], auto: null, ware: null, schritt: 'suchen',
    texte: [], fehl: [], spaene: [], aus: false, autoAb: 0.3 };
  REIHEN().forEach((y, ri) => SPALTEN.forEach((x, si) => g.baeume.push(neuerBaum(x + (ri % 2 ? 8 : 0) - 4, y, ri * 4 + si))));
  return g;
}
function neuerBaum(x, y, i) {
  return { x, y, i, art: wahl(ARTEN), gr: Math.floor(Math.random() * 3), weg: false, nachT: 0, schnitte: 0, wackel: 0, wachs: 1 };
}
/** Neuer Kunde: wünscht sich einen Baum, den es auf dem Platz gerade gibt. */
function neuesAuto(g) {
  const stehen = g.baeume.filter((b) => !b.weg);
  const ziel = wahl(stehen);
  const max = Math.max(8, 14 - g.kunden * 0.35) / stufe.tempo;
  g.auto = { x: W + 30, phase: 'kommt', farbe: wahl(AUTO_FARBEN), wunsch: { art: ziel.art, gr: ziel.gr },
    geduld: max, max, fehler: false, dach: false, t: 0,
    kunde: { typ: wahl(['erwachsen', 'erwachsen', 'oma', 'opa']), farben: neueFarben('erwachsen'), phase: Math.random() * 6, laeuft: false } };
  g.schritt = 'suchen';
}

// ---------------------------------------------------------------------------
// Tippen
// ---------------------------------------------------------------------------
export function tippeAuf(x, y) {
  const g = spiel;
  if (!g || g.t < 0 || g.aus || !g.auto || g.auto.phase === 'faehrt') return;
  const a = g.auto;
  if (g.schritt === 'suchen' || g.schritt === 'saegen') {
    const b = baumBei(x, y);
    if (!b) { if (g.schritt === 'suchen' && y < H * 0.68) fehl(x, y); else if (y >= H * 0.68) tippeUnten(x, y); return; }
    if (g.schritt === 'saegen' && b !== g.aktiv) return;
    if (g.schritt === 'suchen') {
      if (b.art !== a.wunsch.art || b.gr !== a.wunsch.gr) {
        // Falscher Baum: Kopfschütteln, Geduld weg, Kette reißt
        a.fehler = true; a.geduld -= 2; g.kette = 1; b.wackel = 0.4;
        g.texte.push({ x: b.x, y: b.y - HOEHE[b.gr] - 6, text: 'NEIN!', farbe: '#ff7a6a', t: 0 });
        T.spiele('falsch');
        return;
      }
      g.aktiv = b; g.schritt = 'saegen';
    }
    b.schnitte++; b.wackel = 0.15;
    for (let i = 0; i < 4; i++) g.spaene.push({ x: b.x + 2, y: b.y - 2, vx: zufall(-20, 30), vy: zufall(-40, -15), t: 0 });
    T.spiele('greifen');
    if (b.schnitte >= SAEGEN) {
      // Gefällt: liegt kurz, dann rutscht er zur Netzmaschine
      b.weg = true; b.nachT = 2.2; b.wachs = 0;
      g.ware = { art: b.art, gr: b.gr, x: b.x, y: b.y - 2, vonX: b.x, vonY: b.y - 2, phase: 'faellt', t: 0, netz: 0 };
      g.aktiv = null; g.schritt = 'netz';
      T.spiele('glas');
    }
    return;
  }
  tippeUnten(x, y);
}
function tippeUnten(x, y) {
  const g = spiel, a = g.auto, m = MASCHINE();
  if (g.schritt === 'netz' && g.ware && g.ware.phase === 'wartet' && Math.abs(x - m.x) < 26 && Math.abs(y - (m.y - 8)) < 22) {
    g.ware.netz++;
    T.spiele('greifen');
    if (g.ware.netz >= NETZ) { g.ware.phase = 'fertig'; g.schritt = 'laden'; T.spiele('kasse'); }
    return;
  }
  if (g.schritt === 'laden' && Math.abs(x - a.x) < 30 && Math.abs(y - (PARKPLATZ().y - 10)) < 26 && a.phase === 'wartet') {
    g.ware.phase = 'fliegt'; g.ware.t = 0; g.ware.vonX = g.ware.x; g.ware.vonY = g.ware.y;
    g.schritt = 'warten';
    return;
  }
  fehl(x, y);
}
function baumBei(x, y) {
  let best = null, bd = Infinity;
  for (const b of spiel.baeume) {
    if (b.weg) continue;
    const h = HOEHE[b.gr];
    if (x < b.x - h * 0.45 - 3 || x > b.x + h * 0.45 + 3 || y < b.y - h - 3 || y > b.y + 4) continue;
    const d = Math.abs(x - b.x) + Math.abs(y - (b.y - h / 2)) * 0.5;
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function fehl(x, y) { spiel.fehl.push({ x, y, t: 0 }); }

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

function schritt(dt) {
  const g = spiel;
  g.t += dt;
  if (g.t >= 0 && !g.aus && g.t >= C.BAUM_DAUER) {
    g.aus = true;
    if (fertig) T.spiele('fertig');
    setTimeout(() => { if (spiel === g && fertig) fertig(g.punkte, g.kunden); }, 900);
  }
  // Nachwachsen
  for (const b of g.baeume) {
    if (b.wackel > 0) b.wackel -= dt;
    if (b.weg) { b.nachT -= dt; if (b.nachT <= 0) Object.assign(b, neuerBaum(b.x, b.y, b.i), { wachs: 0 }); }
    else if (b.wachs < 1) b.wachs = Math.min(1, b.wachs + dt * 2.5);
  }
  // Das Auto
  if (!g.auto && g.t >= 0 && !g.aus) { g.autoAb -= dt; if (g.autoAb <= 0) neuesAuto(g); }
  const a = g.auto;
  if (a) {
    a.t += dt;
    const ziel = PARKPLATZ().x;
    if (a.phase === 'kommt') { a.x = Math.max(ziel, a.x - 160 * dt); if (a.x <= ziel) a.phase = 'wartet'; }
    else if (a.phase === 'wartet' && !g.aus) {
      a.geduld -= dt;
      if (a.geduld <= 0) {
        // Zu langsam: Er fährt ohne Baum
        g.texte.push({ x: a.x - 26, y: PARKPLATZ().y - 40, text: 'ZU LANGSAM!', farbe: '#ff7a6a', t: 0 });
        T.spiele('falsch');
        g.kette = 1; g.ware = null; g.aktiv = null; g.schritt = 'suchen';
        for (const b of g.baeume) b.schnitte = b.weg ? b.schnitte : 0;
        a.phase = 'faehrt';
      }
    } else if (a.phase === 'faehrt') {
      a.x -= 150 * dt;
      if (a.x < -50) { g.auto = null; g.autoAb = 0.3; }
    }
  }
  // Die Ware: fällt, rutscht zur Maschine, wartet aufs Netz, fliegt aufs Dach
  const w = g.ware;
  if (w) {
    w.t += dt;
    const m = MASCHINE();
    if (w.phase === 'faellt' && w.t > 0.3) { w.phase = 'rutscht'; w.t = 0; w.vonX = w.x; w.vonY = w.y; }
    else if (w.phase === 'rutscht') {
      const k = Math.min(1, w.t / 0.45), e = k * k * (3 - 2 * k);
      w.x = w.vonX + (m.x - 18 - w.vonX) * e; w.y = w.vonY + (m.y - 6 - w.vonY) * e;
      if (k >= 1) { w.phase = 'wartet'; w.t = 0; }
    } else if (w.phase === 'wartet') {
      w.x = m.x - 18 + w.netz * 8; w.y = m.y - 6;
    } else if (w.phase === 'fertig') {
      w.x = m.x + 14; w.y = m.y - 6;
    } else if (w.phase === 'fliegt') {
      const k = Math.min(1, w.t / 0.35), pp = PARKPLATZ();
      w.x = w.vonX + (a.x - 6 - w.vonX) * k; w.y = w.vonY + (pp.y - 21 - w.vonY) * k - Math.sin(k * Math.PI) * 18;
      if (k >= 1) {
        // Auf dem Dach: kassieren, Kette, losfahren
        const pkt = Math.round((50 + 70 * Math.max(0, a.geduld) / a.max) * g.kette * stufe.punkte);
        g.punkte += pkt; g.kunden++;
        g.texte.push({ x: a.x, y: pp.y - 44, text: '+' + pkt, farbe: g.kette > 1 ? '#ffb040' : '#ffe060', t: 0 });
        g.kette = a.fehler ? 1 : Math.min(3, g.kette + 1);
        T.spiele(g.kette >= 3 ? 'spezialKasse' : 'kasse');
        a.dach = { art: w.art, gr: w.gr }; a.phase = 'faehrt'; g.ware = null; g.schritt = 'suchen';
      }
    }
  }
  for (const s of g.spaene) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 140 * dt; }
  g.spaene = g.spaene.filter((s) => s.t < 0.6);
  for (const x of g.texte) x.t += dt;
  g.texte = g.texte.filter((x) => x.t < 1);
  for (const x of g.fehl) x.t += dt;
  g.fehl = g.fehl.filter((x) => x.t < 0.3);
}

/** Nur für die Vorführszene: ein Stück weiter, ein Baum halb gesägt. */
export function vorspulen(sek) {
  for (let t = 0; t < sek; t += 1 / 30) schritt(1 / 30);
  spiel.punkte = 480; spiel.kette = 2; spiel.kunden = 4;
  zeichne(performance.now() / 1000);
}

/**
 * Messweg: eine Runde ohne Bildschleife. `takt` = Sekunden je Handgriff,
 * `treffer` = Anteil der Kunden, bei denen der erste Baum stimmt.
 */
export function messe(takt = 0.3, treffer = 1, hoehe = 320, stufeNr = 1) {
  stufe = C.MINI_STUFEN[stufeNr];
  const altFertig = fertig;
  H = hoehe; fertig = null;
  spiel = neuesSpiel(0);
  let bis = takt, falschVersucht = null;
  while (!spiel.aus) {
    schritt(1 / 60);
    if (spiel.t < bis) continue;
    bis += takt;
    const g = spiel, a = g.auto;
    if (!a || a.phase !== 'wartet') continue;
    if (g.schritt === 'suchen') {
      const richtig = g.baeume.find((b) => !b.weg && b.art === a.wunsch.art && b.gr === a.wunsch.gr);
      if (!richtig) continue;
      if (falschVersucht !== a && Math.random() > treffer) {
        falschVersucht = a;
        const falsch = g.baeume.find((b) => !b.weg && b !== richtig && (b.art !== a.wunsch.art || b.gr !== a.wunsch.gr));
        if (falsch) { tippeAuf(falsch.x, falsch.y - 5); continue; }
      }
      tippeAuf(richtig.x, richtig.y - 5);
    } else if (g.schritt === 'saegen' && g.aktiv) tippeAuf(g.aktiv.x, g.aktiv.y - 5);
    else if (g.schritt === 'netz' && g.ware && g.ware.phase === 'wartet') { const m = MASCHINE(); tippeAuf(m.x, m.y - 8); }
    else if (g.schritt === 'laden') tippeAuf(a.x, PARKPLATZ().y - 10);
  }
  const erg = { punkte: spiel.punkte, kunden: spiel.kunden };
  spiel = null; fertig = altFertig;
  return erg;
}

// ---------------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------------
function hash(n) { const s = Math.sin(n * 91.7) * 43758.5453; return s - Math.floor(s); }
function kreis(cx, cy, rad, f) {
  c.fillStyle = f;
  for (let y = -rad; y <= rad; y++) { const w = Math.round(Math.sqrt(rad * rad - y * y)); c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
}
function gross(s, f, x, y, k, links) {
  const w = textBreite(s) + 2;
  const tmp = gross.cv || (gross.cv = document.createElement('canvas'));
  tmp.width = w; tmp.height = 7;
  const t = tmp.getContext('2d');
  t.clearRect(0, 0, w, 7);
  pixText(t, s, 0, 0, f);
  c.drawImage(tmp, Math.round(links ? x : x - w * k / 2), Math.round(y), w * k, 7 * k);
}

let kulisse = null, kulisseSchl = '';
function baueKulisse(winter) {
  const schl = `${H}|${winter}`;
  if (kulisse && kulisseSchl === schl) return;
  kulisseSchl = schl;
  kulisse = document.createElement('canvas');
  kulisse.width = W; kulisse.height = H;
  const ziel = c;
  c = kulisse.getContext('2d');
  const boden = winter ? ['#e4ecf3', '#edf2f7', '#f6f9fb'] : ['#6a9a4e', '#75a457', '#80ad60'];
  const himmel = ['#9cc0e2', '#b4d0ea', '#cadfef'];
  const oben = Math.round(H * 0.2);
  for (let y = 0; y < oben; y++) r(c, 0, y, W, 1, himmel[Math.min(2, Math.floor(y / oben * 3))]);
  // Waldsaum hinten
  for (let x = -4; x < W + 4; x += 6) {
    const h = 10 + Math.floor(hash(x) * 8), fx = x + Math.floor(hash(x + 3) * 3);
    for (let i = 0; i < h; i++) { const w = Math.round((i + 1) / h * 4); r(c, fx - w, oben - h + i, w * 2 + 1, 1, winter ? '#5a7a72' : '#3e6a48'); }
    if (winter) p(c, fx, oben - h, '#ffffff');
  }
  // Boden mit Flecken
  for (let y = oben; y < H; y++) for (let x = 0; x < W; x++) {
    const v = Math.sin(x / 13 + y / 19) * 0.3 + Math.sin(x / 6.1 - y / 9.3) * 0.25 + (hash(x * 31 + y * 7) - 0.5) * 0.5;
    p(c, x, y, boden[v < -0.25 ? 0 : v < 0.3 ? 1 : 2]);
  }
  // Hütte mit Schild links oben, Lichterkette am Zaun
  const hx = 4, hy = oben + 2;
  r(c, hx, hy - 16, 26, 16, '#8a5a32'); for (let y = hy - 14; y < hy; y += 3) r(c, hx, y, 26, 1, '#7a4c28');
  for (let i = 0; i < 7; i++) r(c, hx - 2 + i, hy - 17 - i, 30 - i * 2, 1, i % 2 ? '#5a3a22' : '#6a4428');
  if (winter) for (let i = 4; i < 7; i++) r(c, hx - 2 + i, hy - 18 - i, 30 - i * 2, 1, '#ffffff');
  r(c, hx + 3, hy - 9, 6, 6, '#f8d878'); r(c, hx + 15, hy - 11, 7, 11, '#4a2e1a');
  // Zaun hinten
  for (let x = 32; x < W; x += 4) { r(c, x, oben - 1, 2, 9, '#a8784a'); p(c, x, oben - 2, '#a8784a'); }
  r(c, 32, oben + 1, W - 32, 1, '#8a5a32'); r(c, 32, oben + 5, W - 32, 1, '#8a5a32');
  if (winter) for (let x = 32; x < W; x += 4) r(c, x, oben - 2, 2, 1, '#ffffff');
  // Schild über der Hütte
  r(c, 34, oben - 20, 64, 11, '#c83a32'); r(c, 34, oben - 20, 64, 1, '#e85a4a'); r(c, 34, oben - 10, 64, 1, '#8a2020');
  pixText(c, 'CHRISTBÄUME', 37, oben - 17, '#ffffff', '#6a1414');
  r(c, 40, oben - 9, 1, 8, '#5a3a22'); r(c, 92, oben - 9, 1, 8, '#5a3a22');
  // Unten: Parkplatz mit Reifenspuren
  const pp = Math.round(H * 0.72);
  for (let y = pp; y < H; y++) for (let x = 0; x < W; x++) if (hash(x * 13 + y * 3) < 0.5) p(c, x, y, winter ? '#d8e0ea' : '#9a8a6a');
  r(c, 0, pp, W, 2, winter ? '#c8d4e0' : '#7a6a4a');
  for (const yy of [Math.round(H * 0.9) - 1, Math.round(H * 0.9) + 3]) for (let x = 60; x < W; x += 2) p(c, x, yy, winter ? '#b8c6d4' : '#7a6a4a');
  c = ziel;
}

/** Stehender Baum: drei bis vier Stufen mit Licht und Schatten, Schnee oben. */
function baumStehend(x, fuss, art, gr, wachs, winter, wackel) {
  const f = SORTEN[art].f, h = Math.max(3, Math.round(HOEHE[gr] * wachs)), b = Math.round(h * 0.42);
  const dx = wackel > 0 ? Math.round(Math.sin(wackel * 60) * 1.5) : 0;
  c.fillStyle = 'rgba(20,30,20,0.2)'; c.fillRect(Math.round(x - b - 1), fuss, b * 2 + 3, 2);
  r(c, x, fuss - 3, 2, 3, '#5a3a22');
  const stufen = gr + 2;
  for (let i = 0; i < h - 2; i++) {
    const s = Math.floor(i / ((h - 2) / stufen)), innen = (i % ((h - 2) / stufen)) / ((h - 2) / stufen);
    const w = Math.max(0, Math.round((s + 1) / stufen * b * (0.5 + innen * 0.5)));
    const yy = fuss - h + i, xx = x + dx;
    r(c, xx - w, yy, w, 1, f[1]); r(c, xx, yy, w + 1, 1, f[0]); p(c, xx + w, yy, f[2]);
    if (winter && innen < 0.15) r(c, xx - w, yy, w + 1, 1, '#ffffff');
    if (art === 'fichte' && s > 0 && innen > 0.7 && (i % 2 === 0)) { p(c, xx - w + 1, yy, '#8a4a1a'); p(c, xx + w - 2, yy, '#8a4a1a'); }   // Zapfen
    if (art === 'blau' && innen > 0.6 && i % 2) p(c, xx + w - 1, yy, '#a8c8d4');                      // bläulicher Schimmer
  }
  p(c, x + dx, fuss - h - 1, winter ? '#ffffff' : f[1]);
}
/** Liegender Baum (Spitze nach rechts), auf Wunsch mit Netz. */
function baumLiegend(x, y, art, gr, netz) {
  const f = SORTEN[art].f, l = HOEHE[gr], b = Math.round(l * 0.3);
  r(c, x - 3, y - 1, 4, 2, '#5a3a22');
  for (let i = 0; i < l; i++) {
    const w = Math.max(0, Math.round((1 - i / l) * b));
    r(c, x + i, y - w, 1, w, f[1]); r(c, x + i, y, 1, w + 1, f[0]); p(c, x + i, y + w, f[2]);
    if (netz && i % 3 === 0) for (let k = -w; k <= w; k += 2) p(c, x + i + (k % 4 === 0 ? 0 : 1), y + k, '#f4f0e8');
  }
}

function auto(a, pp, winter) {
  const x = Math.round(a.x), y = pp.y;
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x - 21, y + 1, 42, 2);
  r(c, x - 20, y - 11, 40, 8, a.farbe); r(c, x - 20, y - 11, 40, 1, ton(a.farbe, 0.25)); r(c, x - 20, y - 4, 40, 1, ton(a.farbe, -0.3));
  r(c, x - 12, y - 18, 24, 7, a.farbe); r(c, x - 11, y - 17, 10, 5, '#a8d0ec'); r(c, x + 1, y - 17, 10, 5, '#a8d0ec');
  r(c, x - 13, y - 19, 26, 1, '#3a3a40');                 // Dachträger
  r(c, x + 17, y - 9, 3, 2, '#fff4b0'); r(c, x - 20, y - 9, 2, 2, '#e84a4a');
  for (const rx of [x - 12, x + 11]) { kreis(rx, y - 2, 3, '#2a2a30'); p(c, rx, y - 2, '#b8bcc4'); }
  if (winter) r(c, x - 12, y - 20, 24, 1, '#ffffff');
  if (a.dach) baumLiegend(x - 12, y - 22, a.dach.art, a.dach.gr, true);
}

function blase(a, pp, t) {
  const kx = Math.round(a.x - 28), ky = pp.y - 2;
  const bw = 66, bh = 36, bx = Math.max(2, Math.min(W - bw - 2, kx - bw / 2)), by = ky - 32 - bh;
  r(c, bx, by, bw, bh, '#fffaf0'); r(c, bx, by, bw, 1, '#ffffff'); r(c, bx, by + bh - 1, bw, 1, '#c8b898');
  r(c, bx - 1, by + 1, 1, bh - 2, '#c8b898'); r(c, bx + bw, by + 1, 1, bh - 2, '#c8b898');
  r(c, kx - 1, by + bh, 3, 2, '#fffaf0'); p(c, kx, by + bh + 2, '#fffaf0');
  // Der Wunschbaum in echter Größe, dazu Sorte und Größe in Schrift
  baumStehend(bx + 12, by + bh - 4, a.wunsch.art, a.wunsch.gr, 1, false, 0);
  const s1 = GROESSE[a.wunsch.gr], s2 = SORTEN[a.wunsch.art].name;
  MH.label('wunsch', bx + 23, by + 5, `${s1}<small style="color:${SORTEN[a.wunsch.art].f[2]}">${s2}</small>`, 'wunsch');
  // Geduld
  const anteil = Math.max(0, a.geduld / a.max);
  r(c, bx + 3, by + bh - 6, bw - 6, 3, '#d8ccb8');
  r(c, bx + 3, by + bh - 6, Math.round((bw - 6) * anteil), 3, anteil > 0.5 ? '#5ab04a' : anteil > 0.25 ? '#e8b030' : (Math.floor(t * 6) % 2 ? '#e84a3a' : '#ff8a6a'));
}

function zeichne(t) {
  const g = spiel;
  const winter = Z.schnee() > 0;
  baueKulisse(winter);
  c.drawImage(kulisse, 0, 0);
  const a = g.auto;
  // Bäume, von hinten nach vorn; der gewählte bekommt eine Säge
  for (const b of [...g.baeume].sort((x, y) => x.y - y.y)) {
    if (b.weg) { r(c, b.x - 1, b.y - 2, 4, 2, '#c8a070'); p(c, b.x, b.y - 2, '#a8805a'); continue; }
    baumStehend(b.x, b.y, b.art, b.gr, b.wachs, winter, b.wackel);
    if (b === g.aktiv) {
      const sx = b.x + 4, sy = b.y - 3, hin = Math.floor(t * 10) % 2;
      r(c, sx + hin, sy, 9, 2, '#c8ccd4'); for (let i = 0; i < 9; i += 2) p(c, sx + hin + i, sy + 2, '#8a8e96');
      r(c, sx + 9 + hin, sy - 1, 3, 4, '#c83a32');
      for (let i = 0; i < SAEGEN; i++) r(c, b.x - 5 + i * 4, b.y + 3, 3, 2, i < b.schnitte ? '#e8b030' : '#5a4a3a');
    }
  }
  // Späne
  for (const s of g.spaene) p(c, s.x, s.y, '#e8c890');
  // Netzmaschine: Trichter auf Beinen, Netzrolle
  const m = MASCHINE();
  r(c, m.x - 10, m.y - 2, 2, 10, '#5a5a62'); r(c, m.x + 8, m.y - 2, 2, 10, '#5a5a62');
  for (let i = 0; i < 8; i++) r(c, m.x - 10 + i, m.y - 16 + i, 20 - i * 2, 1, i % 2 ? '#c83a32' : '#e84a3a');
  r(c, m.x - 6, m.y - 8, 12, 6, '#a82a24'); r(c, m.x - 3, m.y - 6, 6, 3, '#2a2a30');
  r(c, m.x - 5, m.y - 19, 10, 3, '#f4f0e8'); r(c, m.x - 5, m.y - 19, 10, 1, '#ffffff');
  MH.label('netz', m.x, m.y + 9, 'NETZ', 'schild');
  // Die Ware
  const w = g.ware;
  if (w) {
    if (w.phase === 'faellt') { baumLiegend(w.x - 6, w.y, w.art, w.gr, false); for (let i = 0; i < 5; i++) p(c, w.x - 4 + i * 4, w.y + 3 - Math.floor(w.t * 20) % 3, winter ? '#ffffff' : '#c8b898'); }
    else baumLiegend(Math.round(w.x), Math.round(w.y), w.art, w.gr, w.phase === 'fertig' || w.phase === 'fliegt');
    if (w.phase === 'wartet') for (let i = 0; i < NETZ; i++) r(c, m.x - 5 + i * 4, m.y - 23, 3, 2, i < w.netz ? '#e8b030' : '#5a4a3a');
  }
  // Auto mit Kunde und Wunsch
  const pp = PARKPLATZ();
  if (a) {
    auto(a, pp, winter);
    if (a.phase !== 'faehrt') {
      figurKlein(c, a.kunde, a.x - 28, pp.y, t);
      blase(a, pp, t);
    } else MH.label('wunsch', 0, 0, null);
  } else MH.label('wunsch', 0, 0, null);
  // Hinweis, was als Nächstes dran ist
  const was = !a || a.phase === 'faehrt' ? '' : g.schritt === 'suchen' ? 'BAUM SUCHEN' : g.schritt === 'saegen' ? 'SÄGEN!' : g.schritt === 'netz' ? (w && w.phase === 'wartet' ? 'INS NETZ!' : '') : g.schritt === 'laden' ? 'AUFS AUTO!' : '';
  MH.hinweis(g.t < 0 ? `Schwierigkeit: ${stufe.name}` : was && !g.aus ? was : null);
  // Fehlgriffe und Texte
  for (const f of g.fehl) { const k = f.t / 0.3; c.fillStyle = `rgba(200,80,60,${1 - k})`; c.fillRect(Math.round(f.x - 2), Math.round(f.y), 5, 1); c.fillRect(Math.round(f.x), Math.round(f.y - 2), 1, 5); }
  // Schwebende Texte als DOM (minihud.js) - einmal anstoßen, sie steigen selbst
  for (const x of g.texte) if (!x.gezeigt) { x.gezeigt = true; MH.schwebe(x.x, x.y, x.text, x.farbe || (x.text.length > 3 ? '#ffb040' : '#ffe27a'), x.text.length > 5 ? 0.8 : 1.1); }

  // Nacht
  const li = Z.licht();
  if (li.hell < 0.9) {
    const nacht = 1 - li.hell;
    c.fillStyle = `rgba(14,20,62,${(nacht * 0.45).toFixed(3)})`;
    c.fillRect(0, 0, W, H);
    // Lichterkette am Zaun leuchtet
    const oben = Math.round(H * 0.2);
    for (let x = 34; x < W; x += 6) p(c, x, oben - 3 + (x % 12 === 4 ? 1 : 0), ['#ff5a5a', '#ffe060', '#5ad0ff', '#7ae07a'][(x / 6) % 4 | 0]);
  } else {
    const oben = Math.round(H * 0.2);
    for (let x = 34; x < W; x += 6) p(c, x, oben - 3 + (x % 12 === 4 ? 1 : 0), ['#c84040', '#c8a030', '#3a90b0', '#4aa04a'][(x / 6) % 4 | 0]);
  }

  // Kopfzeile, Countdown und Ende als DOM (minihud.js)
  const rest = Math.max(0, Math.ceil(C.BAUM_DAUER - Math.max(0, g.t)));
  MH.setzeKopf({ zeit: rest, knapp: rest <= 5 && g.t >= 0, kette: g.kette, ketteAnteil: g.kette > 1 ? 1 : 0, punkte: g.punkte });
  MH.mitte(g.aus ? 'ZEIT!' : g.t < 0 ? String(Math.ceil(-g.t)) : g.t < 0.6 ? 'LOS!' : null, g.t < 0 && !g.aus ? '#ffffff' : '#ffe27a');
}
