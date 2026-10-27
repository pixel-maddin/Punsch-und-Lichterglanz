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
 *
 * 22.10. (gemeldet: „hakelig, Grafik zu simpel beim Bewegen, Sägen, Netz"):
 * Bäume sind vorberechnete Bilder (`baumBild`) mit Etagen, Nadeln, Schnee-
 * klumpen; Kippen, Liegen und Fliegen drehen dieses Bild pixelgenau
 * (`gedreht`, je 5° zwischengespeichert). Eine Bügelsäge fährt bei jedem Tipp,
 * die Kerbe wächst, beim 2. Schnitt neigt sich der Baum. Er kippt, schlägt auf
 * (Wolke, Bildwackeln) und rutscht zur Maschine; Tipps aufs Netz werden schon
 * dabei gemerkt (keine Totzeit mehr). Die Maschine zieht ihn Stück für Stück
 * durch: Was durch ist, ist schmal und eingenetzt. Aufs Dach fliegt er mit
 * Drehung, das Auto federt ein, ein Gurt schnappt zu.
 * Dazu eigene Bäume aus der Baumschule (`eigen`): golden markiert, ×3 Punkte.
 */
import * as C from './config.js?v=202610272345';
import * as Z from './zeit.js?v=202610272345';
import * as T from './ton.js?v=202610272345';
import * as MH from './minihud.js?v=202610272345';
import * as L from './licht.js?v=202610272345';
import { r, p, ton, mische, text as pixText, textBreite, figurKlein, neueFarben } from './pixel.js?v=202610272345';

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
const EIGEN_MULT = 3;   // eigener Baum aus der Baumschule: so viel mehr Punkte
const AUTO_FARBEN = ['#c83a32', '#3a6ab8', '#e8c030', '#2f8a3a', '#8a4ab8', '#e8e8e4', '#3a3a44'];

let cv = null, c = null, H = 320;
let stufe = C.MINI_STUFEN[1];   // Schwierigkeit der laufenden Runde
let spiel = null, rafId = 0, letzte = 0, fertig = null;
export const istOffen = () => !!spiel;
export const zustand = () => spiel;

// Wo was steht (abhängig von H)
const REIHEN = () => [0.35, 0.48, 0.61].map((f) => Math.round(H * f));
const SPALTEN = [24, 66, 108, 150];
const MASCHINE = () => ({ x: 46, y: Math.round(H * 0.84) });
const PARKPLATZ = () => ({ x: 130, y: Math.round(H * 0.9) });

/**
 * Runde starten. `beiEnde(punkte, kunden, eigeneVerkauft)` kommt nach Ablauf.
 * `eigen` = Sorten fertiger Bäume aus der Baumschule (höchstens einer steht im Feld).
 */
export function starte(hoehe, beiEnde, stufeNr = 1, eigen = []) {
  stufe = C.miniStufe('baum', stufeNr);
  H = Math.round(hoehe); fertig = beiEnde;
  cv = $('#miniCv');
  cv.width = W; cv.height = H;
  c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  spiel = neuesSpiel(-3, eigen);
  $('#minispiel').classList.remove('versteckt');
  MH.an(W, H);
  T.musikMinispiel(true);   // Im Minispiel läuft das Kartenstück (11.10.; vom 09.10. bis dahin ruhte die Musik)
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
  T.musikMinispiel(false);
}

function zufall(a, b) { return a + Math.random() * (b - a); }
const wahl = (l) => l[Math.floor(Math.random() * l.length)];

function neuesSpiel(t0, eigen = []) {
  const g = { t: t0, punkte: 0, kette: 1, kunden: 0, baeume: [], auto: null, ware: null, schritt: 'suchen',
    texte: [], fehl: [], spaene: [], wolken: [], aus: false, autoAb: 0.3, bildWackel: 0, eigen: eigen.slice(), eigenVerkauft: [] };
  REIHEN().forEach((y, ri) => SPALTEN.forEach((x, si) => g.baeume.push(neuerBaum(x + (ri % 2 ? 8 : 0) - 4, y, ri * 4 + si))));
  eigenPflanzen(g);
  return g;
}
function neuerBaum(x, y, i) {
  return { x, y, i, art: wahl(ARTEN), gr: Math.floor(Math.random() * 3), weg: false, nachT: 0, schnitte: 0, wackel: 0, wachs: 1, saegeT: 0, eigen: false };
}
/** Ein eigener Baum aus der Baumschule steht groß und golden im Feld (vorne, damit man ihn sieht). */
function eigenPflanzen(g) {
  if (!g.eigen.length || g.baeume.some((b) => b.eigen && !b.weg)) return;
  const frei = g.baeume.filter((b) => !b.weg && b !== g.aktiv && b.i >= 4);
  if (!frei.length) return;
  const b = wahl(frei);
  b.art = g.eigen.shift(); b.gr = 2; b.eigen = true; b.wachs = 1;
}
/** Neuer Kunde: wünscht sich einen Baum, den es auf dem Platz gerade gibt. */
function neuesAuto(g) {
  const stehen = g.baeume.filter((b) => !b.weg);
  // Der zweite Kunde (und danach jeder dritte) will den eigenen Baum, wenn einer steht
  const eigen = stehen.find((b) => b.eigen);
  const ziel = eigen && (g.kunden === 1 || g.kunden % 3 === 2) ? eigen : wahl(stehen);
  const max = Math.max(8, 14 - g.kunden * 0.35) / stufe.tempo * (stufe.special ? 0.85 : 1);   // Special: ungeduldiger
  g.auto = { x: W + 30, phase: 'kommt', farbe: wahl(AUTO_FARBEN), wunsch: { art: ziel.art, gr: ziel.gr, eigen: ziel.eigen },
    geduld: max, max, fehler: false, dach: null, t: 0, feder: 0,
    kunde: { typ: wahl(['erwachsen', 'erwachsen', 'oma', 'opa']), farben: neueFarben('erwachsen'), phase: Math.random() * 6, laeuft: false } };
  g.schritt = 'suchen';
}
const passt = (b, w) => b.art === w.art && b.gr === w.gr && (!w.eigen || b.eigen);

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
      if (!passt(b, a.wunsch)) {
        // Falscher Baum: Kopfschütteln, Geduld weg, Kette reißt
        a.fehler = true; a.geduld -= 2; g.kette = 1; b.wackel = 0.4;
        const minus = Math.round(C.MINI_MINUS.baum.falsch * stufe.punkte);
        g.punkte = Math.max(0, g.punkte - minus);
        g.texte.push({ x: b.x, y: b.y - HOEHE[b.gr] - 6, text: 'NEIN! -' + minus, farbe: '#ff7a6a', t: 0 });
        T.spiele('falsch');
        return;
      }
      g.aktiv = b; g.schritt = 'saegen';
    }
    b.schnitte++; b.wackel = 0.12; b.saegeT = 0.28;
    for (let i = 0; i < 6; i++) g.spaene.push({ x: b.x + 3, y: b.y - 2, vx: zufall(-10, 40), vy: zufall(-45, -10), t: 0 });
    T.spiele('saege');
    if (b.schnitte >= SAEGEN) {
      // Gefällt: kippt nach rechts, schlägt auf, rutscht zur Netzmaschine
      b.weg = true; b.nachT = 2.2; b.wachs = 0;
      g.ware = { art: b.art, gr: b.gr, eigen: b.eigen, x: b.x + 1, y: b.y, vonX: b.x + 1, vonY: b.y, phase: 'kippt', t: 0, netz: 0, netzAnim: 0, vor: 0, vorT: 0, winkel: 0 };
      g.aktiv = null; g.schritt = 'netz';
      T.spiele('knack');
      g.texte.push({ x: b.x, y: b.y - HOEHE[b.gr] - 4, text: 'KNACK!', farbe: '#ffe27a', t: 0 });
    }
    return;
  }
  tippeUnten(x, y);
}
function tippeUnten(x, y) {
  const g = spiel, a = g.auto, m = MASCHINE(), w = g.ware;
  // Netz: Tipps zählen schon, während der Baum noch fällt oder rutscht (gemerkt in `vor`)
  const amNetz = Math.abs(x - m.x) < 30 && Math.abs(y - (m.y - 8)) < 24;
  const amBaum = w && Math.abs(x - (w.x + HOEHE[w.gr] / 2)) < HOEHE[w.gr] / 2 + 8 && Math.abs(y - w.y) < 14;
  if (g.schritt === 'netz' && w && (amNetz || amBaum) && w.netz + w.vor < NETZ) {
    if (w.phase === 'wartet') netzZug(w); else w.vor++;
    return;
  }
  if (g.schritt === 'laden' && Math.abs(x - a.x) < 30 && Math.abs(y - (PARKPLATZ().y - 10)) < 26 && a.phase === 'wartet') {
    w.phase = 'fliegt'; w.t = 0; w.vonX = w.x; w.vonY = w.y;
    g.schritt = 'warten';
    return;
  }
  fehl(x, y);
}
function netzZug(w) {
  w.netz++; spiel.maschineRuck = 0.16;
  T.spiele('rascheln');
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
/** Start der liegenden Ware vor der Maschine: die Spitze an der Öffnung. */
const netzStart = (w) => MASCHINE().x - 14 - HOEHE[w.gr];   // Spitze vor dem Trichter, der ganze Baum noch sichtbar
const netzEnde = () => MASCHINE().x + 9;

function schritt(dt) {
  const g = spiel;
  g.t += dt;
  if (g.t >= 0 && !g.aus && g.t >= C.BAUM_DAUER) {
    g.aus = true;
    if (fertig) T.spiele('fertig');
    setTimeout(() => { if (spiel === g && fertig) fertig(g.punkte, g.kunden, g.eigenVerkauft); }, 900);
  }
  if (g.bildWackel > 0) g.bildWackel -= dt;
  if (g.maschineRuck > 0) g.maschineRuck -= dt;
  // Nachwachsen
  for (const b of g.baeume) {
    if (b.wackel > 0) b.wackel -= dt;
    if (b.saegeT > 0) b.saegeT -= dt;
    if (b.weg) { b.nachT -= dt; if (b.nachT <= 0) { Object.assign(b, neuerBaum(b.x, b.y, b.i), { wachs: 0 }); eigenPflanzen(g); } }
    else if (b.wachs < 1) b.wachs = Math.min(1, b.wachs + dt * 2.5);
  }
  // Das Auto
  if (!g.auto && g.t >= 0 && !g.aus) { g.autoAb -= dt; if (g.autoAb <= 0) neuesAuto(g); }
  const a = g.auto;
  if (a) {
    a.t += dt;
    if (a.feder > 0) a.feder -= dt;
    const ziel = PARKPLATZ().x;
    if (a.phase === 'kommt') { a.x = Math.max(ziel, a.x - 160 * dt); if (a.x <= ziel) a.phase = 'wartet'; }
    else if (a.phase === 'wartet' && !g.aus) {
      a.geduld -= dt;
      if (a.geduld <= 0) {
        // Zu langsam: Er fährt ohne Baum
        const minus = Math.round(C.MINI_MINUS.baum.langsam * stufe.punkte);
        g.punkte = Math.max(0, g.punkte - minus);
        g.texte.push({ x: a.x - 26, y: PARKPLATZ().y - 40, text: 'ZU LANGSAM! -' + minus, farbe: '#ff7a6a', t: 0 });
        T.spiele('falsch');
        // Ein eigener Baum, der schon gefällt war, ist nicht verloren: zurück in die Liste
        if (g.ware && g.ware.eigen) g.eigen.unshift(g.ware.art);
        g.kette = 1; g.ware = null; g.aktiv = null; g.schritt = 'suchen';
        for (const b of g.baeume) b.schnitte = b.weg ? b.schnitte : 0;
        a.phase = 'faehrt';
      }
    } else if (a.phase === 'faehrt') {
      a.x -= 150 * dt;
      if (a.x < -50) { g.auto = null; g.autoAb = 0.3; }
    }
  }
  // Die Ware: kippt, schlägt auf, rutscht vor die Maschine, wird durchgezogen, fliegt aufs Dach
  const w = g.ware;
  if (w) {
    w.t += dt;
    const m = MASCHINE();
    if (w.phase === 'kippt') {
      const k = Math.min(1, w.t / 0.42);
      w.winkel = 90 * k * k;   // wie fallen: erst langsam, dann schnell
      if (k >= 1) {
        w.phase = 'liegt'; w.t = 0; w.winkel = 90; g.bildWackel = 0.18;
        T.spiele('plumps');
        const l = HOEHE[w.gr], winter = Z.schnee() > 0;
        for (let i = 0; i < 10; i++) g.wolken.push({ x: w.x + zufall(4, l), y: w.y - 1, vx: zufall(-12, 12), vy: zufall(-22, -6), t: 0, f: winter ? '#ffffff' : '#d8c8a8' });
      }
    } else if (w.phase === 'liegt' && w.t > 0.22) { w.phase = 'rutscht'; w.t = 0; w.vonX = w.x; w.vonY = w.y; }
    else if (w.phase === 'rutscht') {
      const k = Math.min(1, w.t / 0.32), e = k * k * (3 - 2 * k);
      w.x = w.vonX + (netzStart(w) - w.vonX) * e; w.y = w.vonY + (m.y - 6 - w.vonY) * e - Math.sin(k * Math.PI) * 4;
      if (k >= 1) { w.phase = 'wartet'; w.t = 0; w.vorT = 0; }
    } else if (w.phase === 'wartet') {
      // Gemerkte Tipps nacheinander abarbeiten
      if (w.vor > 0 && (w.vorT -= dt) <= 0) { w.vor--; netzZug(w); w.vorT = 0.14; }
      w.netzAnim = Math.min(w.netz, w.netzAnim + dt * 7);
      w.x = netzStart(w) + (netzEnde() - netzStart(w)) * (w.netzAnim / NETZ); w.y = m.y - 6;
      if (w.netz >= NETZ && w.netzAnim >= NETZ) { w.phase = 'fertig'; w.t = 0; g.schritt = 'laden'; T.spiele('kasse'); }
    } else if (w.phase === 'fliegt') {
      const k = Math.min(1, w.t / 0.5), pp = PARKPLATZ(), e = k * k * (3 - 2 * k);
      const zx = a.x - 12, zy = pp.y - 22;
      w.x = w.vonX + (zx - w.vonX) * e; w.y = w.vonY + (zy - w.vonY) * e - Math.sin(k * Math.PI) * 22;
      w.winkel = 90 - Math.sin(k * Math.PI) * 30;   // dreht sich im Flug ein Stück auf
      if (k >= 1) {
        // Auf dem Dach: festzurren, kassieren, Kette, losfahren
        let pkt = Math.round((50 + 70 * Math.max(0, a.geduld) / a.max) * g.kette * stufe.punkte);
        if (w.eigen) { pkt *= EIGEN_MULT; g.eigenVerkauft.push(w.art); }
        g.punkte += pkt; g.kunden++;
        g.texte.push({ x: a.x, y: pp.y - 44, text: (w.eigen ? 'DEIN BAUM! ' : '') + '+' + pkt, farbe: w.eigen ? '#ffd040' : g.kette > 1 ? '#ffb040' : '#ffe060', t: 0 });
        g.kette = a.fehler ? 1 : Math.min(3, g.kette + 1);
        T.spiele('gurt');
        setTimeout(() => T.spiele(g.kette >= 3 || w.eigen ? 'spezialKasse' : 'kasse'), 90);
        a.dach = { art: w.art, gr: w.gr, eigen: w.eigen }; a.feder = 0.3; a.phase = 'faehrt'; g.ware = null; g.schritt = 'suchen';
      }
    }
  }
  for (const s of g.spaene) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 140 * dt; }
  g.spaene = g.spaene.filter((s) => s.t < 0.6);
  for (const s of g.wolken) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 40 * dt; }
  g.wolken = g.wolken.filter((s) => s.t < 0.55);
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
  stufe = C.miniStufe('baum', stufeNr);
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
      const richtig = g.baeume.find((b) => !b.weg && passt(b, a.wunsch));
      if (!richtig) continue;
      if (falschVersucht !== a && Math.random() > treffer) {
        falschVersucht = a;
        const falsch = g.baeume.find((b) => !b.weg && b !== richtig && !passt(b, a.wunsch));
        if (falsch) { tippeAuf(falsch.x, falsch.y - 5); continue; }
      }
      tippeAuf(richtig.x, richtig.y - 5);
    } else if (g.schritt === 'saegen' && g.aktiv) tippeAuf(g.aktiv.x, g.aktiv.y - 5);
    else if (g.schritt === 'netz' && g.ware) { const m = MASCHINE(); tippeAuf(m.x, m.y - 8); }
    else if (g.schritt === 'laden') tippeAuf(a.x, PARKPLATZ().y - 10);
  }
  const erg = { punkte: spiel.punkte, kunden: spiel.kunden };
  spiel = null; fertig = altFertig;
  return erg;
}

// ---------------------------------------------------------------------------
// Baumbilder (22.10.): einmal gemalt, gedreht wird das fertige Bild
// ---------------------------------------------------------------------------
function hash(n) { const s = Math.sin(n * 91.7) * 43758.5453; return s - Math.floor(s); }
const bilder = new Map();
/**
 * Stehender Baum als Bild. Rückgabe { cv, px, py }: (px, py) = Mitte des
 * Stammfußes im Bild. Etagen mit hängenden Astspitzen, Licht links, Schatten
 * rechts und unter jeder Etage, Nadeln, Schneeklumpen, Zapfen bzw. Reif.
 * `netz`: eingenetzt (schmal zusammengedrückt, weißes Netz darüber).
 */
export function baumBild(art, gr, winter, netz = false, eigen = false) {
  const schl = `${art}|${gr}|${winter}|${netz}|${eigen}`;
  let b = bilder.get(schl);
  if (b) return b;
  const f = SORTEN[art].f, h = HOEHE[gr], breit = Math.round(h * 0.42);
  const bw = breit * 2 + 7, bh = h + 4;
  const k = document.createElement('canvas'); k.width = bw; k.height = bh;
  const x = k.getContext('2d');
  const px = Math.floor(bw / 2), py = bh - 1;
  const P = (xx, yy, col) => { x.fillStyle = col; x.fillRect(xx, yy, 1, 1); };
  // Stamm
  x.fillStyle = '#5a3a22'; x.fillRect(px - 1, py - 3, 3, 4); P(px - 1, py - 3, '#7a5232'); P(px + 1, py, '#3a2414');
  const stufen = gr + 2, kh = (h - 2) / stufen;
  const quetsch = netz ? 0.5 : 1;
  for (let i = 0; i < h - 2; i++) {
    const s = Math.floor(i / kh), innen = (i % kh) / kh;
    let w = Math.max(0, Math.round((s + 1) / stufen * breit * (0.5 + innen * 0.5) * quetsch));
    const yy = py - h + 1 + i;
    for (let dx = -w; dx <= w; dx++) {
      const hh = hash(dx * 13 + i * 7 + gr * 3 + art.length);
      let col = dx < 0 ? f[1] : f[0];
      if (dx === w) col = f[2];
      else if (dx === -w) col = ton(f[1], 0.12);
      else if (dx < 0 && hh < 0.14) col = ton(f[1], 0.16);   // Nadeln im Licht
      else if (dx > 0 && hh < 0.16) col = ton(f[0], -0.18);  // Nadeln im Schatten
      // Schatten unter der Etage darüber
      if (s > 0 && innen < 0.2 && Math.abs(dx) < w - 1) col = ton(col, -0.2);
      P(px + dx, yy, col);
    }
    // hängende Astspitzen an der Unterkante jeder Etage
    if (!netz && innen > 0.8 && w > 2) { P(px - w - 1, yy, f[1]); P(px + w + 1, yy, f[2]); if (s % 2 === 0) { P(px - w, yy + 1, f[1]); P(px + w, yy + 1, f[2]); } }
    if (winter && innen < 0.22 && w > 0) for (let dx = -w; dx <= w; dx++) if (hash(dx * 5 + i * 3) < (dx < 0 ? 0.7 : 0.45)) P(px + dx, yy, dx < 0 ? '#ffffff' : '#dfe8f2');
    if (art === 'fichte' && s > 0 && innen > 0.65 && i % 2 === 0 && w > 2) { P(px - w + 1, yy, '#8a4a1a'); P(px + w - 2, yy, '#6a3a14'); }   // Zapfen
    if (art === 'blau' && innen > 0.55 && i % 2 && w > 1) { P(px + w - 1, yy, '#a8c8d4'); P(px - w + 1, yy, '#c4dce4'); }   // bläulicher Reif
    if (netz && i % 3 === 0) for (let dx = -w; dx <= w; dx += 2) P(px + dx, yy, '#f4f0e8');
    if (netz && i % 3 === 1) { P(px - w, yy, '#e0dcd0'); P(px + w, yy, '#e0dcd0'); }
  }
  P(px, py - h, winter ? '#ffffff' : f[1]); P(px, py - h + 1, f[1]);
  if (eigen) {
    P(px, py - h - 1, '#ffe060'); P(px - 1, py - h, '#ffe060'); P(px + 1, py - h, '#ffe060'); P(px, py - h - 2, '#fff6c0'); x.fillStyle = '#c82828'; x.fillRect(px - 1, py - 5, 3, 1);
    // Goldene Kontur rundum (23.10., gemeldet: „leuchten zu wenig, erkennt man kaum")
    const bild = x.getImageData(0, 0, bw, bh), d = bild.data;
    const voll = (xx, yy) => xx >= 0 && yy >= 0 && xx < bw && yy < bh && d[(yy * bw + xx) * 4 + 3] > 0;
    const rand = [];
    for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < bw; xx++) if (!voll(xx, yy) && (voll(xx - 1, yy) || voll(xx + 1, yy) || voll(xx, yy - 1) || voll(xx, yy + 1))) rand.push([xx, yy]);
    for (const [xx, yy] of rand) P(xx, yy, (xx + yy) % 3 ? '#ffd040' : '#fff2a0');
  }
  b = { cv: k, px, py };
  bilder.set(schl, b);
  return b;
}
/**
 * Das Bild um den Stammfuß gedreht (Grad, im Uhrzeigersinn), pixelgenau mit
 * nächstem Nachbarn. Rückgabe { cv, ox, oy } = Lage des Drehpunkts im Ergebnis.
 */
function gedreht(bild, grad) {
  grad = Math.round(grad / 5) * 5;
  if (grad === 0) return { cv: bild.cv, ox: bild.px, oy: bild.py };
  const schl = grad;
  bild.dreh = bild.dreh || new Map();
  let d = bild.dreh.get(schl);
  if (d) return d;
  const a = grad * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const sw = bild.cv.width, sh = bild.cv.height;
  const quelle = bild.cv.getContext('2d').getImageData(0, 0, sw, sh).data;
  // Grenzen der gedrehten Ecken
  const ecken = [[0, 0], [sw, 0], [0, sh], [sw, sh]].map(([x, y]) => { const dx = x - bild.px, dy = y - bild.py; return [dx * ca - dy * sa, dx * sa + dy * ca]; });
  const x0 = Math.floor(Math.min(...ecken.map((e) => e[0]))) - 1, x1 = Math.ceil(Math.max(...ecken.map((e) => e[0]))) + 1;
  const y0 = Math.floor(Math.min(...ecken.map((e) => e[1]))) - 1, y1 = Math.ceil(Math.max(...ecken.map((e) => e[1]))) + 1;
  const k = document.createElement('canvas'); k.width = x1 - x0; k.height = y1 - y0;
  const kc = k.getContext('2d'), img = kc.createImageData(k.width, k.height), z = img.data;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const sx = Math.round(x * ca + y * sa + bild.px - 0.5 * 0), sy = Math.round(-x * sa + y * ca + bild.py);
    if (sx < 0 || sy < 0 || sx >= sw || sy >= sh) continue;
    const qi = (sy * sw + sx) * 4, zi = ((y - y0) * k.width + (x - x0)) * 4;
    if (quelle[qi + 3] < 128) continue;
    z[zi] = quelle[qi]; z[zi + 1] = quelle[qi + 1]; z[zi + 2] = quelle[qi + 2]; z[zi + 3] = 255;
  }
  kc.putImageData(img, 0, 0);
  d = { cv: k, ox: -x0, oy: -y0 };
  bild.dreh.set(schl, d);
  return d;
}
/** Bild mit seinem Drehpunkt auf (x, y) setzen. */
function setze(ctx, d, x, y) { ctx.drawImage(d.cv, Math.round(x - d.ox), Math.round(y - d.oy)); }
/** Für die Baumschule (ui.js): einen stehenden Baum in ein fremdes Canvas malen. */
export function maleBaum(ctx, x, fuss, art, gr, winter, eigen = false) { const b = baumBild(art, gr, winter, false, eigen); ctx.drawImage(b.cv, Math.round(x - b.px), Math.round(fuss - b.py)); }

function kreis(cx, cy, rad, f) {
  c.fillStyle = f;
  for (let y = -rad; y <= rad; y++) { const w = Math.round(Math.sqrt(rad * rad - y * y)); c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
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
  const oben = Math.round(H * 0.2);
  // Himmel als weicher Verlauf mit ein paar Wolken, dahinter Hügel (11.10.: mehr Detail)
  for (let y = 0; y < oben; y++) r(c, 0, y, W, 1, mische('#94bce0', '#d4e6f4', y / oben));
  for (const [wx, wy, ww] of [[20, 8, 22], [96, 5, 30], [150, 12, 18]]) for (let k = 0; k < ww; k++) { const hh = Math.round(Math.sin(k / ww * Math.PI) * 3); r(c, wx + k, wy - hh, 1, hh + 2, k < ww / 2 ? '#f4f8fc' : '#e2ecf6'); }
  for (let x = 0; x < W; x++) { const hh = 8 + Math.round(Math.sin(x / 21) * 3 + Math.sin(x / 8) * 1.5); r(c, x, oben - hh - 4, 1, hh, winter ? '#c4d2e2' : '#8aa898'); }
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
  // Lichterkette über dem Zaun
  for (let x = 32; x < W; x++) {
    const y = oben - 3 + Math.round(Math.sin(((x - 32) % 16) / 16 * Math.PI) * 2);
    p(c, x, y, '#3a3a2a');
    if ((x - 32) % 4 === 2) p(c, x, y + 1, ['#ff5a5a', '#ffe060', '#5ad0ff', '#7ae07a'][((x - 32) >> 2) % 4]);
  }
  // Schild über der Hütte
  r(c, 34, oben - 20, 64, 11, '#c83a32'); r(c, 34, oben - 20, 64, 1, '#e85a4a'); r(c, 34, oben - 10, 64, 1, '#8a2020');
  pixText(c, 'CHRISTBÄUME', 37, oben - 17, '#ffffff', '#6a1414');
  r(c, 40, oben - 9, 1, 8, '#5a3a22'); r(c, 92, oben - 9, 1, 8, '#5a3a22');
  // Zwischen den Reihen: festgetretene Fußspuren; in den Lücken zwischen den
  // Spalten Baumstümpfe mit Preisschildchen (nie dort, wo Bäume stehen)
  for (const [y0, y1] of [[0.35, 0.48], [0.48, 0.61]]) {
    const y = Math.round(H * (y0 + y1) / 2) + 3;
    for (let x = 4; x < W - 4; x += 3) if (hash(x * 7 + y) < 0.6) p(c, x, y + (x % 6 < 3 ? 0 : 1), winter ? '#d2dde8' : '#5e8a44');
  }
  REIHEN().forEach((ry, ri) => [45, 87, 129].forEach((sx, si) => {
    if ((ri + si) % 2) return;
    r(c, sx - 2, ry - 2, 5, 2, '#7a4a28'); r(c, sx - 2, ry - 3, 5, 1, '#c8a070'); p(c, sx, ry - 3, '#a8784a');
    if (winter) r(c, sx - 1, ry - 4, 3, 1, '#ffffff');
    r(c, sx + 3, ry - 8, 1, 6, '#6a4428'); r(c, sx + 1, ry - 10, 6, 3, '#f4f0e0'); p(c, sx + 2, ry - 9, '#c83a32'); p(c, sx + 4, ry - 9, '#c83a32');
  }));
  // Unten: Parkplatz mit Reifenspuren
  const pp = Math.round(H * 0.72);
  for (let y = pp; y < H; y++) for (let x = 0; x < W; x++) if (hash(x * 13 + y * 3) < 0.5) p(c, x, y, winter ? '#d8e0ea' : '#9a8a6a');
  r(c, 0, pp, W, 2, winter ? '#c8d4e0' : '#7a6a4a');
  for (const yy of [Math.round(H * 0.9) - 1, Math.round(H * 0.9) + 3]) for (let x = 60; x < W; x += 2) p(c, x, yy, winter ? '#b8c6d4' : '#7a6a4a');
  // Schneewall am unteren Rand, Laterne rechts, eingenetzte Bäume links
  if (winter) for (let x = 0; x < W; x++) { const hh = 2 + Math.round(Math.sin(x / 9) * 1.5 + hash(x) * 1.5); r(c, x, H - hh, 1, hh, '#f6f9fc'); p(c, x, H - hh, '#ffffff'); }
  const lx = W - 6, ly = pp + 4;
  r(c, lx, ly - 22, 1, 22, '#2a2a34'); r(c, lx - 2, ly - 27, 5, 5, '#2a2a34'); r(c, lx - 1, ly - 26, 3, 3, '#ffe090'); p(c, lx, ly - 29, '#3a3a44');
  c.fillStyle = 'rgba(255,220,140,0.12)'; c.fillRect(lx - 8, ly - 30, 17, 12);
  for (let i = 0; i < 3; i++) setze(c, gedreht(baumBild(['nordmann', 'blau', 'fichte'][i % 3], 0, winter, true), 90), 4 + i * 2, pp + 8 + i * 4);
  c = ziel;
}

/** Stehender Baum im Feld: Bild, beim Wackeln leicht versetzt, beim 2. Schnitt geneigt. */
function baumStehend(b, winter) {
  const bild = baumBild(b.art, b.gr, winter, false, b.eigen);
  const dx = b.wackel > 0 ? Math.round(Math.sin(b.wackel * 60) * 1.5) : 0;
  if (b.wachs < 1) {
    // Nachwachsen: von unten hochschieben (abgeschnitten am Boden)
    const hh = Math.max(2, Math.round(bild.cv.height * b.wachs));
    c.drawImage(bild.cv, 0, 0, bild.cv.width, hh, Math.round(b.x - bild.px), Math.round(b.y - bild.py + bild.cv.height - hh), bild.cv.width, hh);
    return;
  }
  const neig = b.schnitte >= 2 ? 6 : b.schnitte === 1 ? 0 : 0;
  setze(c, gedreht(bild, neig), b.x + dx, b.y);
}
/** Die Bügelsäge am Stamm: fährt nach jedem Tipp hin und her; Kerbe wächst. */
function saege(b, t) {
  const hub = b.saegeT > 0 ? Math.round(Math.sin(b.saegeT * 40) * 3) : Math.round(Math.sin(t * 3) * 0.5);
  const sx = b.x + 3 + hub, sy = b.y - 2;
  // Kerbe im Stamm (von rechts nach links)
  for (let i = 0; i < Math.min(3, b.schnitte); i++) p(c, b.x + 1 - i, b.y - 2, '#2a1a10');
  // Blatt mit Zähnen
  r(c, sx, sy, 12, 1, '#d8dce4'); for (let i = 0; i < 12; i += 2) p(c, sx + i, sy + 1, '#8a8e96');
  // Bügel und Griff
  r(c, sx + 1, sy - 6, 1, 6, '#c83a32'); r(c, sx + 1, sy - 6, 11, 1, '#c83a32'); r(c, sx + 11, sy - 6, 1, 6, '#c83a32');
  p(c, sx + 2, sy - 5, '#e85a4a');
  r(c, sx + 12, sy - 2, 3, 3, '#3a2a1e'); p(c, sx + 12, sy - 2, '#5a4030');
  // Fortschritt als drei Kerben-Punkte unter dem Baum
  for (let i = 0; i < SAEGEN; i++) r(c, b.x - 5 + i * 4, b.y + 3, 3, 2, i < b.schnitte ? '#e8b030' : '#5a4a3a');
}
/** Die Netzmaschine von der Seite: Trichter links offen, Tunnel, Netzrolle oben. */
function maschine(m, ruck, anim) {
  const dx = ruck > 0 ? (Math.floor(ruck * 60) % 2 ? 1 : -1) : 0, x = m.x + dx, y = m.y;
  // Beine
  r(c, x - 7, y - 2, 2, 10, '#5a5a62'); r(c, x + 6, y - 2, 2, 10, '#5a5a62'); r(c, x - 8, y + 7, 4, 1, '#3a3a42'); r(c, x + 5, y + 7, 4, 1, '#3a3a42');
  // Trichter: links weit, nach rechts eng
  for (let i = 0; i < 6; i++) { const hh = 14 - i; r(c, x - 13 + i, y - 6 - hh / 2, 1, hh, i === 0 ? '#e84a3a' : i % 2 ? '#c83a32' : '#d8443a'); }
  // Tunnel
  r(c, x - 7, y - 10, 15, 9, '#a82a24'); r(c, x - 7, y - 10, 15, 1, '#e85a4a'); r(c, x - 7, y - 2, 15, 1, '#6a1814');
  for (let i = 0; i < 3; i++) p(c, x - 4 + i * 5, y - 7, '#f0c040');   // Nieten
  // Netzrolle oben, dreht sich beim Ziehen
  r(c, x - 5, y - 16, 11, 5, '#f4f0e8'); r(c, x - 5, y - 16, 11, 1, '#ffffff'); r(c, x - 5, y - 12, 11, 1, '#c8c4b8');
  const o = Math.floor(anim * 6) % 3;
  for (let i = o; i < 11; i += 3) p(c, x - 5 + i, y - 14, '#c8c4b8');
  r(c, x - 6, y - 15, 1, 3, '#5a5a62'); r(c, x + 6, y - 15, 1, 3, '#5a5a62');
}
/** Liegende Ware: links von der Maschine normal, rechts davon eingenetzt (schmal). */
function wareZeichnen(w, winter, t) {
  const m = MASCHINE();
  const normal = gedreht(baumBild(w.art, w.gr, winter, false, w.eigen), w.winkel);
  if (w.phase === 'kippt' || w.phase === 'liegt' || w.phase === 'rutscht') {
    setze(c, normal, w.x, w.y + (w.phase === 'liegt' && w.t < 0.08 ? -1 : 0));
    return;
  }
  const netz = gedreht(baumBild(w.art, w.gr, winter, true, w.eigen), w.winkel);
  if (w.phase === 'fliegt' || w.phase === 'fertig') { setze(c, netz, w.x, w.y); return; }
  // wartet: durch die Maschine ziehen - hinter der Öffnung (rechts) ist er eingenetzt
  const aus = m.x + 8;
  c.save(); c.beginPath(); c.rect(0, 0, m.x - 7, H); c.clip(); setze(c, normal, w.x, w.y); c.restore();
  c.save(); c.beginPath(); c.rect(aus, 0, W - aus, H); c.clip(); setze(c, netz, w.x, w.y); c.restore();
  // Fortschritt über der Maschine
  for (let i = 0; i < NETZ; i++) r(c, m.x - 5 + i * 4, m.y - 22, 3, 2, i < w.netz ? '#e8b030' : '#5a4a3a');
}

function auto(a, pp, winter) {
  const x = Math.round(a.x), y = pp.y + (a.feder > 0.15 ? 1 : 0);
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x - 21, pp.y + 1, 42, 2);
  r(c, x - 20, y - 11, 40, 8, a.farbe); r(c, x - 20, y - 11, 40, 1, ton(a.farbe, 0.25)); r(c, x - 20, y - 4, 40, 1, ton(a.farbe, -0.3));
  r(c, x - 12, y - 18, 24, 7, a.farbe); r(c, x - 11, y - 17, 10, 5, '#a8d0ec'); r(c, x + 1, y - 17, 10, 5, '#a8d0ec');
  p(c, x - 10, y - 16, '#e0f0fc'); p(c, x + 2, y - 16, '#e0f0fc');
  r(c, x - 13, y - 19, 26, 1, '#3a3a40');                 // Dachträger
  r(c, x + 17, y - 9, 3, 2, '#fff4b0'); r(c, x - 20, y - 9, 2, 2, '#e84a4a');
  for (const rx of [x - 12, x + 11]) { kreis(rx, pp.y - 2, 3, '#2a2a30'); p(c, rx, pp.y - 2, '#b8bcc4'); }
  if (winter) r(c, x - 12, y - 20, 24, 1, '#ffffff');
  if (a.dach) {
    setze(c, gedreht(baumBild(a.dach.art, a.dach.gr, winter, true, a.dach.eigen), 90), x - 12, y - 22);
    // Spanngurte
    for (const gx of [x - 6, x + 6]) { r(c, gx, y - 25, 1, 6, '#e8a020'); p(c, gx, y - 19, '#8a5a10'); }
  }
}

function blase(a, pp, t) {
  const kx = Math.round(a.x - 28), ky = pp.y - 2;
  const bw = 66, bh = 36, bx = Math.max(2, Math.min(W - bw - 2, kx - bw / 2)), by = ky - 32 - bh;
  const rand = a.wunsch.eigen ? '#e8b030' : '#c8b898';
  r(c, bx, by, bw, bh, a.wunsch.eigen ? '#fff6d8' : '#fffaf0'); r(c, bx, by, bw, 1, '#ffffff'); r(c, bx, by + bh - 1, bw, 1, rand);
  r(c, bx - 1, by + 1, 1, bh - 2, rand); r(c, bx + bw, by + 1, 1, bh - 2, rand);
  r(c, kx - 1, by + bh, 3, 2, '#fffaf0'); p(c, kx, by + bh + 2, '#fffaf0');
  // Der Wunschbaum in echter Größe, dazu Sorte und Größe in Schrift
  const bild = baumBild(a.wunsch.art, a.wunsch.gr, false, false, a.wunsch.eigen);
  c.drawImage(bild.cv, Math.round(bx + 12 - bild.px), Math.round(by + bh - 4 - bild.py));
  const s1 = a.wunsch.eigen ? 'DEIN BAUM' : GROESSE[a.wunsch.gr], s2 = SORTEN[a.wunsch.art].name;
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
  c.save();
  if (g.bildWackel > 0) c.translate(Math.floor(g.bildWackel * 50) % 2 ? 1 : -1, Math.floor(g.bildWackel * 40) % 2 ? 1 : 0);
  c.drawImage(kulisse, 0, 0);
  const a = g.auto;
  // Bäume, von hinten nach vorn; der gewählte bekommt eine Säge
  for (const b of [...g.baeume].sort((x, y) => x.y - y.y)) {
    if (b.weg) { r(c, b.x - 1, b.y - 2, 4, 2, '#c8a070'); p(c, b.x, b.y - 2, '#a8805a'); p(c, b.x + 1, b.y - 2, '#8a6040'); continue; }
    L.schatten(c, b.x + 1 + L.schattenRichtung() * 5, b.y, 9 + b.gr * 2, 3, 0.32);   // weicher Bodenschatten, weg von der Sonne
    if (b.eigen && b.wachs >= 1) L.schatten(c, b.x, b.y - 2, 12, 4, 0.12);
    baumStehend(b, winter);
    if (b.eigen && b.wachs >= 1 && Math.sin(t * 4 + b.i) > 0.3) p(c, b.x + 4, b.y - HOEHE[b.gr] + 3, '#fff6c0');   // Funkeln
    if (b === g.aktiv) saege(b, t);
  }
  // Späne und Aufschlagwolke
  for (const s of g.spaene) p(c, s.x, s.y, '#e8c890');
  for (const s of g.wolken) { const gr = s.t < 0.25 ? 2 : 1; r(c, Math.round(s.x), Math.round(s.y), gr, gr, s.f); }
  // Die Ware, dann die Maschine davor (der Baum verschwindet im Tunnel)
  const m = MASCHINE(), w = g.ware;
  if (w && w.phase !== 'fliegt') wareZeichnen(w, winter, t);
  maschine(m, g.maschineRuck || 0, w ? w.netzAnim : 0);
  // Das Schild ist DOM und läge über dem Auto, das davor wegfährt (gemeldet 18.10.):
  // solange ein Auto die Maschine überdeckt, bleibt es weg
  const ca = g.auto;
  MH.label('netz', m.x, m.y + 9, ca && Math.abs(ca.x - m.x) < 34 ? null : 'NETZ', 'schild');
  // Auto mit Kunde und Wunsch
  const pp = PARKPLATZ();
  if (a) {
    auto(a, pp, winter);
    if (a.phase !== 'faehrt') {
      figurKlein(c, a.kunde, a.x - 28, pp.y, t);
    } else MH.label('wunsch', 0, 0, null);
  } else MH.label('wunsch', 0, 0, null);
  if (w && w.phase === 'fliegt') wareZeichnen(w, winter, t);   // im Flug vor allem anderen
  // Hinweis, was als Nächstes dran ist
  const was = !a || a.phase === 'faehrt' ? '' : g.schritt === 'suchen' ? (a.wunsch.eigen ? 'DEIN GOLDENER BAUM!' : 'BAUM SUCHEN') : g.schritt === 'saegen' ? 'SÄGEN!' : g.schritt === 'netz' ? 'INS NETZ!' : g.schritt === 'laden' ? 'AUFS AUTO!' : '';
  MH.hinweis(g.t < 0 ? `${stufe.special ? 'SPECIAL: ' + C.SPECIAL_TEXT.baum : 'Schwierigkeit: ' + stufe.name}` : was && !g.aus ? was : null);
  // Fehlgriffe und Texte
  for (const f of g.fehl) { const k = f.t / 0.3; c.fillStyle = `rgba(200,80,60,${1 - k})`; c.fillRect(Math.round(f.x - 2), Math.round(f.y), 5, 1); c.fillRect(Math.round(f.x), Math.round(f.y - 2), 1, 5); }
  c.restore();
  // Schwebende Texte als DOM (minihud.js) - einmal anstoßen, sie steigen selbst
  for (const x of g.texte) if (!x.gezeigt) { x.gezeigt = true; MH.schwebe(x.x, x.y, x.text, x.farbe || (x.text.length > 3 ? '#ffb040' : '#ffe27a'), x.text.length > 5 ? 0.8 : 1.1); }

  // Licht und Schatten (12.10., licht.js): Wintersonne, warmes Hüttenfenster,
  // Laterne am Parkplatz, Lichterkette am Zaun
  const li = Z.licht(), oben = Math.round(H * 0.2), py = Math.round(H * 0.72), nachts = 1 - li.hell;
  L.beleuchte(c, W, H, {
    himmel: oben - 8, vignette: 0.3, grundNacht: [112, 122, 170],
    inseln: [{ x: 10, y: oben - 4, r: 30, a: 0.9 }, { x: W - 6, y: py - 20, r: 50, a: 0.9 }, { x: W / 2, y: oben - 3, r: 70, rgb: '255,210,150', a: 0.35 },
      { x: W / 2, y: H * 0.47, r: 110, rgb: '255,226,180', a: 0.55 }],   // Arbeitslicht über dem Baumfeld: die Sorten müssen erkennbar bleiben
  });
  // Die Wunschblase liegt ÜBER dem Licht - sie muss immer lesbar sein
  if (a && a.phase !== 'faehrt') blase(a, PARKPLATZ(), t);
  r(c, 7, oben - 7, 6, 6, nachts > 0.3 ? '#ffe28a' : '#f8d878'); L.schein(c, 10, oben - 4, 9, '255,210,120', 0.5 * nachts);
  r(c, W - 7, py - 22, 3, 3, '#ffe090'); L.schein(c, W - 6, py - 21, 12, '255,214,140', 0.25 + 0.45 * nachts);
  const FARB = ['#ff5a5a', '#ffe060', '#5ad0ff', '#7ae07a'], RGB = ['255,90,90', '255,224,96', '90,208,255', '122,224,122'];
  for (let x = 34, i = 0; x < W; x += 4, i++) {
    const y = oben - 3 + Math.round(Math.sin(((x - 32) % 16) / 16 * Math.PI) * 2) + 1, an = Math.sin(t * 2 + i) > -0.5;
    p(c, x, y, an ? FARB[i % 4] : ton(FARB[i % 4], -0.4));
    if (an) L.schein(c, x, y, 4, RGB[i % 4], 0.06 + 0.16 * nachts);
  }
  // Eigener Baum: goldener Schein, damit man ihn auch im Arbeitslicht findet
  for (const b of g.baeume) if (b.eigen && !b.weg && b.wachs >= 1) {
    const hh = HOEHE[b.gr], br = Math.round(hh * 0.42);
    L.schein(c, b.x, b.y - hh / 2, 18, '255,214,90', 0.32 + 0.12 * Math.sin(t * 3));
    // Glitzern (23.10.): sechs Funkelsterne um den Baum, jeder blitzt zu seiner Zeit auf
    for (let k = 0; k < 6; k++) {
      const ph = (t * 1.3 + k * 0.37) % 1;
      if (ph > 0.45) continue;
      const gx = Math.round(b.x + Math.sin(k * 2.4) * (br + 2)), gy = Math.round(b.y - 3 - ((k * 0.61) % 1) * (hh - 2));
      const gross = ph > 0.12 && ph < 0.32, f = '#fff6c0';
      p(c, gx, gy, '#ffffff');
      if (gross) { p(c, gx - 1, gy, f); p(c, gx + 1, gy, f); p(c, gx, gy - 1, f); p(c, gx, gy + 1, f); if (ph > 0.18 && ph < 0.26) { p(c, gx - 2, gy, '#ffe060'); p(c, gx + 2, gy, '#ffe060'); p(c, gx, gy - 2, '#ffe060'); p(c, gx, gy + 2, '#ffe060'); } }
    }
  }

  // Kopfzeile, Countdown und Ende als DOM (minihud.js)
  const rest = Math.max(0, Math.ceil(C.BAUM_DAUER - Math.max(0, g.t)));
  MH.setzeKopf({ zeit: rest, knapp: rest <= 5 && g.t >= 0, kette: g.kette, ketteAnteil: g.kette > 1 ? 1 : 0, punkte: g.punkte });
  MH.mitte(g.aus ? 'ZEIT UM!' : g.t < 0 ? String(Math.ceil(-g.t)) : g.t < 0.6 ? 'LOS!' : null, g.t < 0 && !g.aus ? '#ffffff' : '#ffe27a');
}
