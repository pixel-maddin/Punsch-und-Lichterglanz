/*
 * backstube.js - Minispiel „Backstube" (10.10.): Kunden kommen an die Theke
 * und wollen ein bestimmtes Plätzchen - das Bild steht in der Sprechblase.
 *
 * Drei Handgriffe je Plätzchen:
 *   1. die richtige AUSSTECHFORM antippen (sticht aus, das Plätzchen rutscht
 *      von selbst in den Ofen),
 *   2. den OFEN antippen, solange der Balken im goldenen Bereich steht
 *      (zu früh = blass, zu spät = dunkel, ganz am Ende verbrennt es),
 *   3. die richtige VERZIERUNG antippen - dann fliegt es zum Kunden.
 *
 * Punkte je Kunde: Grundwert plus Geduld, die noch übrig war, plus Bonus für
 * goldbraun, mal Kette (fehlerfreie Kunden hintereinander, bis ×3).
 * Welche Rezepte vorkommen, bestimmt der Rekord (C.BACK_REZEPTE, `ab`).
 *
 * Gleiches Gerüst wie christbaum.js: eigenes Canvas (#miniCv), 180 Pixel
 * breit, Kulisse als Zwischenbild, Schrift über minihud.js.
 */
import * as C from './config.js?v=202610101341';
import * as Z from './zeit.js?v=202610101341';
import * as T from './ton.js?v=202610101341';
import * as MH from './minihud.js?v=202610101341';
import { r, p, ton, figurKlein, neueFarben } from './pixel.js?v=202610101341';

const $ = (s) => document.querySelector(s);
const W = 180;

// ---------------------------------------------------------------------------
// Formen: Masken aus Zeilen, '#' = Teig. Breite 9, Höhe 7-8.
// ---------------------------------------------------------------------------
const MASKEN = {
  stern: ['....#....', '...###...', '#########', '.#######.', '..#####..', '.###.###.', '.##...##.', '##.....##'],
  mond:  ['...###...', '.#####...', '####.....', '###......', '###......', '####.....', '.#####...', '...###...'],
  herz:  ['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'],
  baum:  ['....#....', '...###...', '..#####..', '...###...', '..#####..', '.#######.', '#########', '....#....'],
  kreis: ['..#####..', '.#######.', '####.####', '###...###', '####.####', '.#######.', '..#####..'],
};
const istTeig = (m, x, y) => y >= 0 && y < m.length && x >= 0 && x < 9 && m[y][x] === '#';
/** Innen = alle vier Nachbarn sind Teig (dort liegt die Verzierung). */
const innen = (m, x, y) => istTeig(m, x, y) && istTeig(m, x - 1, y) && istTeig(m, x + 1, y) && istTeig(m, x, y - 1) && istTeig(m, x, y + 1);
// Teigfarbe je Backgrad: roh, blass, golden, dunkel, verbrannt
const BACKFARBE = { roh: '#f0dcb0', blass: '#ecd09a', golden: '#d89a48', dunkel: '#a8662c', verbrannt: '#3a2a22' };

/**
 * Ein Plätzchen malen (auch fürs Rezeptbuch in ui.js). `k` = Pixelgröße,
 * `grad` = Backgrad, `deko` = Verzierung oder null. (x, y) = linke obere Ecke.
 */
export function zeichnePlaetzchen(ctx, x, y, form, grad, deko, k = 1) {
  const m = MASKEN[form];
  const px = (xx, yy, f) => { ctx.fillStyle = f; ctx.fillRect(x + xx * k, y + yy * k, k, k); };
  const teig = BACKFARBE[grad] || BACKFARBE.golden;
  const rand = ton(teig, -0.22);
  for (let yy = 0; yy < m.length; yy++) for (let xx = 0; xx < 9; xx++) {
    if (!istTeig(m, xx, yy)) continue;
    // Unterkante dunkler, damit es Dicke hat
    px(xx, yy, istTeig(m, xx, yy + 1) ? teig : rand);
  }
  if (!deko || grad === 'verbrannt') return;
  for (let yy = 0; yy < m.length; yy++) for (let xx = 0; xx < 9; xx++) {
    const i = innen(m, xx, yy), t = istTeig(m, xx, yy);
    if (deko === 'guss' && i) px(xx, yy, yy % 3 === 0 && xx % 2 ? '#ffffff' : '#f6f0e6');
    else if (deko === 'puder' && t && (xx + yy) % 2 === 0) px(xx, yy, '#fbf8f2');
    else if (deko === 'schoko' && i) px(xx, yy, xx + yy === 6 ? '#8a5a3a' : '#5a3220');
    else if (deko === 'gruen' && i) px(xx, yy, (xx * 7 + yy * 3) % 5 === 0 ? ['#ff5a5a', '#ffe060', '#5ad0ff'][(xx + yy) % 3] : '#5aa84a');
    else if (deko === 'marmelade') {
      // Spitzbube: das Loch in der Mitte zeigt rote Marmelade; sonst ein Klecks
      if (!t && yy > 1 && yy < m.length - 2 && xx > 1 && xx < 7) px(xx, yy, '#c8283a');
      else if (form !== 'kreis' && i && Math.abs(xx - 4) <= 1 && Math.abs(yy - 4) <= 1) px(xx, yy, '#c8283a');
      else if (form === 'kreis' && t && (xx + yy) % 3 === 0) px(xx, yy, '#fbf8f2');
    }
  }
}

let cv = null, c = null, H = 320;
let stufe = C.MINI_STUFEN[1];
let rezepte = C.BACK_REZEPTE.slice(0, 3);   // in dieser Runde möglich
let formen = [], dekos = [];
let spiel = null, rafId = 0, letzte = 0, fertig = null;
export const istOffen = () => !!spiel;
export const zustand = () => spiel;

// Wo was steht (abhängig von H)
const THEKE = () => Math.round(H * 0.34);
const BLECH = () => ({ x: 104, y: Math.round(H * 0.5) });
const OFEN = () => ({ x: 134, y: Math.round(H * 0.4), b: 42, h: Math.round(H * 0.2) });
const FORM_Y = () => Math.round(H * 0.7);
const SCHALE_Y = () => Math.round(H * 0.87);
const KUNDE = () => ({ x: 150, y: THEKE() + 1 });
const slot = (i, n) => Math.round((i + 0.5) * W / n);

/**
 * Runde starten. `beiEnde(punkte, kunden, gebacken)` kommt nach Ablauf,
 * `gebacken` = Liste der Rezept-ids (für die Plätzchendose).
 */
export function starte(hoehe, beiEnde, stufeNr = 1, rezeptListe) {
  stufe = C.MINI_STUFEN[stufeNr] || C.MINI_STUFEN[1];
  setzeRezepte(rezeptListe);
  H = Math.round(hoehe); fertig = beiEnde;
  cv = $('#miniCv');
  cv.width = W; cv.height = H;
  c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  spiel = neuesSpiel(-3);
  $('#minispiel').classList.remove('versteckt');
  MH.an(W, H);
  T.musikPause(true);
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
function setzeRezepte(liste) {
  rezepte = liste && liste.length ? liste : C.BACK_REZEPTE.slice(0, 3);
  formen = C.BACK_FORMEN.filter((f) => rezepte.some((x) => x.form === f));
  dekos = Object.keys(C.BACK_DEKOS).filter((d) => rezepte.some((x) => x.deko === d));
}

const wahl = (l) => l[Math.floor(Math.random() * l.length)];

function neuesSpiel(t0) {
  return { t: t0, punkte: 0, kette: 1, kunden: 0, kunde: null, kundeAb: 0.3, ware: null, schritt: 'stechen',
    texte: [], fehl: [], rauch: [], aus: false, gebacken: [], stich: null, letzteForm: null };
}
function neuerKunde(g) {
  // Nicht zweimal hintereinander dasselbe, sonst wird es langweilig
  let rz = wahl(rezepte);
  if (g.letzte && rezepte.length > 1) while (rz.id === g.letzte) rz = wahl(rezepte);
  g.letzte = rz.id;
  const max = Math.max(7, 12.5 - g.kunden * 0.3) / stufe.tempo;
  const typ = wahl(['erwachsen', 'erwachsen', 'oma', 'opa', 'kind']);
  g.kunde = { x: W + 16, phase: 'kommt', rezept: rz, geduld: max, max, fehler: false,
    figur: { typ, farben: neueFarben(typ), phase: Math.random() * 6, laeuft: true } };
  g.schritt = 'stechen'; g.ware = null;
}
function nimmGeduld(g, s) { if (g.kunde) g.kunde.geduld -= s; }

// ---------------------------------------------------------------------------
// Tippen
// ---------------------------------------------------------------------------
export function tippeAuf(x, y) {
  const g = spiel;
  if (!g || g.t < 0 || g.aus) return;
  const k = g.kunde;
  if (!k || k.phase !== 'wartet') { fehl(x, y); return; }
  const fy = FORM_Y(), sy = SCHALE_Y(), o = OFEN();
  // 1. Ausstechformen
  if (Math.abs(y - fy) < 16) {
    if (g.schritt !== 'stechen') { fehl(x, y); return; }
    const i = Math.max(0, Math.min(formen.length - 1, Math.floor(x / (W / formen.length))));
    const form = formen[i];
    g.stich = { form, t: 0 };
    if (form !== k.rezept.form) {
      k.fehler = true; nimmGeduld(g, 2); g.kette = 1;
      g.texte.push({ x: slot(i, formen.length), y: fy - 18, text: 'NEIN!', farbe: '#ff7a6a', t: 0 });
      T.spiele('falsch');
      return;
    }
    T.spiele('greifen');
    const b = BLECH();
    g.ware = { form, grad: 'roh', deko: null, phase: 'rutscht', t: 0, x: 40, y: Math.round(H * 0.48), vonX: 40, vonY: Math.round(H * 0.48), zuX: b.x - 4, zuY: b.y - 4, ofen: 0 };
    g.schritt = 'warten';
    return;
  }
  // 2. Ofen
  if (x >= o.x - 4 && x <= o.x + o.b + 2 && y >= o.y - 14 && y <= o.y + o.h + 4) {
    if (g.schritt !== 'backen' || !g.ware) { fehl(x, y); return; }
    const a = g.ware.ofen / ofenDauer();
    const [von, bis] = C.BACK_GOLDEN;
    g.ware.grad = a < von ? 'blass' : a <= bis ? 'golden' : 'dunkel';
    g.ware.phase = 'raus'; g.ware.t = 0; g.ware.vonX = o.x + 12; g.ware.vonY = o.y + o.h - 12;
    const b = BLECH(); g.ware.zuX = b.x - 4; g.ware.zuY = b.y - 4;
    g.schritt = 'warten';
    g.texte.push({ x: o.x + 20, y: o.y - 18, text: g.ware.grad === 'golden' ? 'GOLDEN!' : g.ware.grad === 'blass' ? 'BLASS' : 'DUNKEL', farbe: g.ware.grad === 'golden' ? '#ffd040' : '#e8d8c0', t: 0 });
    T.spiele(g.ware.grad === 'golden' ? 'fertig' : 'glas');
    return;
  }
  // 3. Verzierung
  if (Math.abs(y - sy) < 16) {
    if (g.schritt !== 'verzieren' || !g.ware) { fehl(x, y); return; }
    const i = Math.max(0, Math.min(dekos.length - 1, Math.floor(x / (W / dekos.length))));
    const d = dekos[i];
    if (d !== k.rezept.deko) {
      k.fehler = true; nimmGeduld(g, 2); g.kette = 1;
      g.texte.push({ x: slot(i, dekos.length), y: sy - 18, text: 'NEIN!', farbe: '#ff7a6a', t: 0 });
      T.spiele('falsch');
      return;
    }
    T.spiele('blubb');
    g.ware.deko = d; g.ware.phase = 'fliegt'; g.ware.t = 0; g.ware.vonX = g.ware.x; g.ware.vonY = g.ware.y;
    g.schritt = 'warten';
    return;
  }
  fehl(x, y);
}
function fehl(x, y) { if (spiel) spiel.fehl.push({ x, y, t: 0 }); }
const ofenDauer = () => C.BACK_OFEN / stufe.tempo;

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
  if (g.t >= 0 && !g.aus && g.t >= C.BACK_DAUER) {
    g.aus = true;
    if (fertig) T.spiele('fertig');
    setTimeout(() => { if (spiel === g && fertig) fertig(g.punkte, g.kunden, g.gebacken); }, 900);
  }
  if (g.stich) { g.stich.t += dt; if (g.stich.t > 0.25) g.stich = null; }
  // Kunde
  if (!g.kunde && g.t >= 0 && !g.aus) { g.kundeAb -= dt; if (g.kundeAb <= 0) neuerKunde(g); }
  const k = g.kunde;
  if (k) {
    const ziel = KUNDE().x;
    if (k.phase === 'kommt') { k.x = Math.max(ziel, k.x - 90 * dt); if (k.x <= ziel) { k.phase = 'wartet'; k.figur.laeuft = false; } }
    else if (k.phase === 'wartet' && !g.aus) {
      k.geduld -= dt;
      if (k.geduld <= 0) {
        g.texte.push({ x: k.x - 20, y: THEKE() - 30, text: 'ZU LANGSAM!', farbe: '#ff7a6a', t: 0 });
        T.spiele('falsch');
        g.kette = 1; g.ware = null; g.schritt = 'stechen';
        k.phase = 'geht'; k.figur.laeuft = true;
      }
    } else if (k.phase === 'geht') {
      k.x += 80 * dt;
      if (k.x > W + 14) { g.kunde = null; g.kundeAb = 0.25; }
    }
  }
  // Das Plätzchen
  const w = g.ware;
  if (w) {
    w.t += dt;
    const glatt = (d) => { const a = Math.min(1, w.t / d); return a * a * (3 - 2 * a); };
    if (w.phase === 'rutscht') {
      // Vom Teig aufs Blech, dann gleich weiter in den Ofen
      const e = glatt(0.25);
      w.x = w.vonX + (w.zuX - w.vonX) * e; w.y = w.vonY + (w.zuY - w.vonY) * e;
      if (w.t >= 0.25) { const o = OFEN(); w.phase = 'rein'; w.t = 0; w.vonX = w.x; w.vonY = w.y; w.zuX = o.x + 12; w.zuY = o.y + o.h - 12; }
    } else if (w.phase === 'rein') {
      const e = glatt(0.2);
      w.x = w.vonX + (w.zuX - w.vonX) * e; w.y = w.vonY + (w.zuY - w.vonY) * e;
      if (w.t >= 0.2) { w.phase = 'ofen'; w.t = 0; g.schritt = 'backen'; T.spiele('brutzeln'); }
    } else if (w.phase === 'ofen') {
      w.ofen += dt;
      const a = w.ofen / ofenDauer();
      w.grad = a < 0.3 ? 'roh' : a < C.BACK_GOLDEN[0] ? 'blass' : a <= C.BACK_GOLDEN[1] ? 'golden' : 'dunkel';
      if (a >= 1) {
        // Verbrannt: Rauch, Plätzchen weg, nochmal ausstechen
        const o = OFEN();
        for (let i = 0; i < 6; i++) g.rauch.push({ x: o.x + 10 + i * 4, y: o.y, t: -i * 0.06 });
        g.texte.push({ x: o.x + 20, y: o.y - 18, text: 'VERBRANNT!', farbe: '#ff7a6a', t: 0 });
        T.spiele('falsch');
        if (g.kunde) g.kunde.fehler = true;
        nimmGeduld(g, 1.5); g.kette = 1;
        g.ware = null; g.schritt = 'stechen';
      }
    } else if (w.phase === 'raus') {
      const e = glatt(0.2);
      w.x = w.vonX + (w.zuX - w.vonX) * e; w.y = w.vonY + (w.zuY - w.vonY) * e;
      if (w.t >= 0.2) { w.phase = 'liegt'; g.schritt = 'verzieren'; }
    } else if (w.phase === 'fliegt' && k) {
      const a = Math.min(1, w.t / 0.35), zx = k.x - 10, zy = THEKE() - 12;
      w.x = w.vonX + (zx - w.vonX) * a; w.y = w.vonY + (zy - w.vonY) * a - Math.sin(a * Math.PI) * 22;
      if (a >= 1) {
        const bonus = w.grad === 'golden' ? 30 : 0;
        const pkt = Math.round((22 + 38 * Math.max(0, k.geduld) / k.max + bonus) * g.kette * stufe.punkte);
        g.punkte += pkt; g.kunden++; g.gebacken.push(k.rezept.id);
        g.texte.push({ x: k.x - 6, y: THEKE() - 34, text: '+' + pkt, farbe: g.kette > 1 ? '#ffb040' : '#ffe060', t: 0 });
        g.kette = k.fehler ? 1 : Math.min(3, g.kette + 1);
        T.spiele(g.kette >= 3 ? 'spezialKasse' : 'kasse');
        k.phase = 'geht'; k.figur.laeuft = true; k.bekommen = { form: w.form, grad: w.grad, deko: w.deko };
        g.ware = null; g.schritt = 'stechen';
      }
    } else if (w.phase === 'fliegt') { g.ware = null; g.schritt = 'stechen'; }
  }
  for (const s of g.rauch) s.t += dt;
  g.rauch = g.rauch.filter((s) => s.t < 1.2);
  for (const x of g.texte) x.t += dt;
  g.texte = g.texte.filter((x) => x.t < 1);
  for (const x of g.fehl) x.t += dt;
  g.fehl = g.fehl.filter((x) => x.t < 0.3);
}

/** Nur für die Vorführszene: ein Stück weiter, ein Plätzchen im Ofen. */
export function vorspulen(sek) {
  for (let t = 0; t < sek; t += 1 / 30) schritt(1 / 30);
  const g = spiel;
  if (g.kunde && g.kunde.phase === 'wartet' && g.schritt === 'stechen') {
    tippeAuf(slot(formen.indexOf(g.kunde.rezept.form), formen.length), FORM_Y());
    for (let t = 0; t < 0.45 + ofenDauer() * 0.55; t += 1 / 30) schritt(1 / 30);
  }
  g.punkte = 640; g.kette = 2; g.kunden = 5;
  zeichne(performance.now() / 1000);
}

/**
 * Messweg: eine Runde ohne Bildschleife. `takt` = Sekunden je Handgriff,
 * `treffer` = Anteil richtiger Griffe, `gold` = Anteil goldbraun.
 */
export function messe(takt = 0.35, treffer = 1, gold = 1, hoehe = 380, stufeNr = 1, rezeptListe) {
  stufe = C.MINI_STUFEN[stufeNr];
  setzeRezepte(rezeptListe);
  const altFertig = fertig;
  H = hoehe; fertig = null;
  spiel = neuesSpiel(0);
  let bis = takt, zielOfen = null;
  while (!spiel.aus) {
    schritt(1 / 60);
    const g = spiel, k = g.kunde;
    if (!k || k.phase !== 'wartet') continue;
    if (g.schritt === 'backen' && g.ware) {
      // Herausholen: im goldenen Bereich - oder knapp daneben
      if (zielOfen == null) {
        const [von, bis2] = C.BACK_GOLDEN;
        zielOfen = Math.random() < gold ? von + Math.random() * (bis2 - von) : (Math.random() < 0.5 ? von - 0.12 : bis2 + 0.1);
      }
      if (g.ware.ofen / ofenDauer() >= zielOfen) { const o = OFEN(); tippeAuf(o.x + 20, o.y + 10); zielOfen = null; bis = g.t + takt; }
      continue;
    }
    if (g.t < bis) continue;
    bis = g.t + takt;
    const falsch = Math.random() > treffer;
    if (g.schritt === 'stechen') {
      let i = formen.indexOf(k.rezept.form);
      if (falsch && formen.length > 1) i = (i + 1) % formen.length;
      tippeAuf(slot(i, formen.length), FORM_Y());
    } else if (g.schritt === 'verzieren') {
      let i = dekos.indexOf(k.rezept.deko);
      if (falsch && dekos.length > 1) i = (i + 1) % dekos.length;
      tippeAuf(slot(i, dekos.length), SCHALE_Y());
    }
  }
  const erg = { punkte: spiel.punkte, kunden: spiel.kunden };
  spiel = null; fertig = altFertig;
  return erg;
}

// ---------------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------------
function hash(n) { const s = Math.sin(n * 91.7) * 43758.5453; return s - Math.floor(s); }

let kulisse = null, kulisseSchl = '';
function baueKulisse(nacht) {
  const schl = `${H}|${nacht}|${Z.schnee() > 0}`;
  if (kulisse && kulisseSchl === schl) return;
  kulisseSchl = schl;
  kulisse = document.createElement('canvas');
  kulisse.width = W; kulisse.height = H;
  const ziel = c;
  c = kulisse.getContext('2d');
  const th = THEKE();
  // Kachelwand
  r(c, 0, 0, W, th, '#efe2c8');
  for (let y = 0; y < th; y += 8) { r(c, 0, y, W, 1, '#dccaa8'); for (let x = (y / 8) % 2 ? 4 : 0; x < W; x += 8) r(c, x, y, 1, 8, '#dccaa8'); }
  r(c, 0, th - 14, W, 1, '#c8a878'); for (let x = 0; x < W; x += 8) r(c, x, th - 13, 4, 13, '#e6d4b0');
  // Fenster mit Himmel
  const fx = 8, fy = 10, fb = 34, fh = 26;
  r(c, fx - 2, fy - 2, fb + 4, fh + 4, '#7a4c28');
  const himmel = nacht ? ['#141c48', '#26305e'] : ['#9cc0e2', '#c8dcec'];
  for (let y = 0; y < fh; y++) r(c, fx, fy + y, fb, 1, himmel[y < fh / 2 ? 0 : 1]);
  if (nacht) for (let i = 0; i < 8; i++) p(c, fx + Math.floor(hash(i) * fb), fy + Math.floor(hash(i + 9) * fh * 0.6), '#fff4d0');
  if (Z.schnee() > 0) { r(c, fx, fy + fh - 4, fb, 4, '#f4f8fc'); for (let i = 0; i < 10; i++) p(c, fx + Math.floor(hash(i + 3) * fb), fy + Math.floor(hash(i + 5) * (fh - 4)), '#ffffff'); }
  r(c, fx + fb / 2, fy, 1, fh, '#7a4c28'); r(c, fx, fy + fh / 2, fb, 1, '#7a4c28');
  r(c, fx - 3, fy + fh + 2, fb + 6, 2, '#8a5a32');
  // Regal mit Gläsern und Mehlsack
  r(c, 52, 26, 74, 2, '#8a5a32'); r(c, 54, 28, 2, 4, '#6a4222'); r(c, 122, 28, 2, 4, '#6a4222');
  const GL = ['#e8b030', '#c8283a', '#8a5a2a', '#f4f0e8', '#5aa84a', '#e8c890'];
  for (let i = 0; i < 6; i++) { const gx = 56 + i * 11; r(c, gx, 16, 8, 10, '#d8e8f0'); r(c, gx + 1, 19, 6, 7, GL[i]); r(c, gx, 15, 8, 2, '#a8763e'); }
  r(c, 132, 12, 16, 14, '#e8e0cc'); r(c, 132, 12, 16, 3, '#c8b898'); r(c, 136, 17, 8, 4, '#c8a878');   // Mehl
  // Brezel-Schild
  r(c, 156, 4, 1, 6, '#5a3a22'); r(c, 150, 10, 16, 14, '#c8902c');
  for (const [dx, dy] of [[2, 2], [3, 1], [4, 1], [5, 2], [6, 3], [7, 2], [8, 1], [9, 1], [10, 2], [11, 3], [11, 5], [10, 7], [9, 8], [7, 8], [6, 7], [5, 5], [6, 4], [8, 5], [9, 6], [4, 4], [3, 5], [3, 7], [4, 8], [2, 4]]) p(c, 151 + dx, 11 + dx * 0 + dy, '#6a3a12');
  // Theke vorn
  r(c, 0, th, W, 5, '#a8703a'); r(c, 0, th, W, 1, '#c8905a'); r(c, 0, th + 4, W, 1, '#6a4222');
  // Arbeitstisch (Holz)
  r(c, 0, th + 5, W, H - th - 5, '#c89058');
  for (let y = th + 8; y < H; y += 7) r(c, 0, y, W, 1, '#b07a44');
  for (let i = 0; i < 40; i++) p(c, Math.floor(hash(i + 40) * W), th + 6 + Math.floor(hash(i + 80) * (H - th - 6)), '#a86e3a');
  // Teigplatte: ausgerollter Teig mit Mehlstaub
  const ty = Math.round(H * 0.42), tb = 70, tH = Math.round(H * 0.13);
  r(c, 6, ty, tb, tH, '#f0dcb0'); r(c, 6, ty + tH - 1, tb, 1, '#d8bc88'); r(c, 6, ty, 1, tH, '#e4cc9c');
  for (let i = 0; i < 24; i++) p(c, 7 + Math.floor(hash(i + 7) * (tb - 2)), ty + 1 + Math.floor(hash(i + 17) * (tH - 2)), '#fbf4e4');
  // Nudelholz
  r(c, 10, ty + tH + 3, 44, 4, '#d8a868'); r(c, 10, ty + tH + 3, 44, 1, '#ecc88a'); r(c, 5, ty + tH + 4, 5, 2, '#8a5a32'); r(c, 54, ty + tH + 4, 5, 2, '#8a5a32');
  // Backblech
  const b = BLECH();
  r(c, b.x - 16, b.y - 7, 32, 14, '#8a8e98'); r(c, b.x - 15, b.y - 6, 30, 12, '#a8acb6'); r(c, b.x - 15, b.y - 6, 30, 1, '#c8ccd4');
  // Ablage für Formen und Schalen
  r(c, 0, FORM_Y() - 14, W, 28, 'rgba(90,50,20,0.18)');
  r(c, 0, SCHALE_Y() - 14, W, 28, 'rgba(90,50,20,0.18)');
  c = ziel;
}

function ofen(t) {
  const o = OFEN(), g = spiel, w = g.ware;
  const drin = w && w.phase === 'ofen';
  // Gehäuse
  r(c, o.x, o.y - 6, o.b, o.h + 6, '#5a5a62'); r(c, o.x, o.y - 6, o.b, 1, '#8a8a94'); r(c, o.x + o.b - 1, o.y - 6, 1, o.h + 6, '#3a3a42');
  for (let i = 0; i < 3; i++) r(c, o.x + 6 + i * 12, o.y - 4, 4, 2, '#2a2a30');   // Knöpfe
  // Fenster: glüht, flackert, das Plätzchen darin
  const fx = o.x + 4, fy = o.y + 2, fb = o.b - 8, fh = o.h - 8;
  r(c, fx - 1, fy - 1, fb + 2, fh + 2, '#2a2a30');
  const fl = Math.sin(t * 9) * 0.5 + 0.5;
  r(c, fx, fy, fb, fh, drin ? (fl > 0.5 ? '#ff9a40' : '#f08a30') : '#3a2a26');
  if (drin) { r(c, fx, fy + fh - 3, fb, 3, '#c84a14'); for (let i = 0; i < fb; i += 3) p(c, fx + i, fy + fh - 4 - (Math.floor(t * 8 + i) % 2), '#ffd040'); }
  r(c, fx, fy + fh - 6, fb, 1, '#6a6a72');   // Rost
  r(c, o.x + 6, o.y + o.h - 2, o.b - 12, 2, '#8a8a94');   // Griff
  // Backbalken über dem Ofen: blass - golden - dunkel, Strich = jetzt
  const bx = o.x, by = o.y - 12, bb = o.b;
  const [von, bis] = C.BACK_GOLDEN;
  r(c, bx, by, bb, 4, '#3a2a20');
  r(c, bx, by + 1, Math.round(bb * von), 2, '#ecd09a');
  r(c, bx + Math.round(bb * von), by, Math.round(bb * (bis - von)), 4, '#ffc040');
  r(c, bx + Math.round(bb * bis), by + 1, bb - Math.round(bb * bis), 2, '#a8662c');
  if (drin) {
    const a = Math.min(1, w.ofen / ofenDauer()), m = bx + Math.min(bb - 1, Math.round(bb * a));
    r(c, m, by - 2, 1, 8, '#ffffff');
    // Im goldenen Bereich blinkt der Ofen auf - jetzt tippen!
    if (a >= von && a <= bis && Math.floor(t * 8) % 2) { c.strokeStyle = '#ffe060'; c.lineWidth = 1; c.strokeRect(o.x - 1.5, o.y - 7.5, o.b + 3, o.h + 9); }
  }
}

function blase(k, t) {
  const kx = Math.round(k.x), th = THEKE();
  const bw = 58, bh = 32, bx = kx - 22 - bw, by = th - 50;
  r(c, bx, by, bw, bh, '#fffaf0'); r(c, bx, by, bw, 1, '#ffffff'); r(c, bx, by + bh - 1, bw, 1, '#c8b898');
  r(c, bx - 1, by + 1, 1, bh - 2, '#c8b898'); r(c, bx + bw, by + 1, 1, bh - 2, '#c8b898');
  r(c, bx + bw, by + 12, 3, 3, '#fffaf0'); p(c, bx + bw + 3, by + 13, '#fffaf0');
  // Das Wunschplätzchen groß, daneben der Name
  zeichnePlaetzchen(c, bx + 3, by + 3, k.rezept.form, 'golden', k.rezept.deko, 2);
  MH.label('wunsch', bx + 23, by + 4, k.rezept.name, 'wunsch');
  const anteil = Math.max(0, k.geduld / k.max);
  r(c, bx + 3, by + bh - 6, bw - 6, 3, '#d8ccb8');
  r(c, bx + 3, by + bh - 6, Math.round((bw - 6) * anteil), 3, anteil > 0.5 ? '#5ab04a' : anteil > 0.25 ? '#e8b030' : (Math.floor(t * 6) % 2 ? '#e84a3a' : '#ff8a6a'));
}

function form(i, n, f, aktiv, t) {
  const x = slot(i, n), y = FORM_Y();
  // Blechform: Umriss der Maske doppelt groß, innen leer
  const m = MASKEN[f], k = 2, x0 = x - 9, y0 = y - Math.round(m.length);
  const druck = spiel.stich && spiel.stich.form === f ? 1 : 0;
  r(c, x - 13, y - 11, 26, 22, aktiv ? '#f8ecd0' : '#e8d8b8');
  r(c, x - 13, y + 10, 26, 1, '#b8946a');
  for (let yy = 0; yy < m.length; yy++) for (let xx = 0; xx < 9; xx++) {
    if (!istTeig(m, xx, yy)) continue;
    const rand = !istTeig(m, xx - 1, yy) || !istTeig(m, xx + 1, yy) || !istTeig(m, xx, yy - 1) || !istTeig(m, xx, yy + 1);
    if (rand) { c.fillStyle = '#9aa0ac'; c.fillRect(x0 + xx * k, y0 + yy * k + druck, k, k); }
  }
}
function schale(i, n, d) {
  const x = slot(i, n), y = SCHALE_Y(), f = C.BACK_DEKOS[d].f;
  r(c, x - 12, y - 4, 24, 3, f); r(c, x - 11, y - 5, 22, 1, ton(f, 0.15));
  r(c, x - 13, y - 1, 26, 2, '#e8e8f0'); r(c, x - 12, y + 1, 24, 3, '#d0d0dc'); r(c, x - 10, y + 4, 20, 2, '#b8b8c6'); r(c, x - 8, y + 6, 16, 1, '#9a9aa8');
  if (d === 'gruen') for (let k = 0; k < 6; k++) p(c, x - 10 + k * 4, y - 4, ['#ff5a5a', '#ffe060', '#5ad0ff'][k % 3]);
  if (d === 'puder') { p(c, x - 4, y - 6, '#ffffff'); p(c, x + 3, y - 6, '#ffffff'); }
  r(c, x + 8, y - 12, 1, 8, '#c8a878');   // Löffel / Pinsel
  MH.label('schale' + i, x, y + 9, C.BACK_DEKOS[d].kurz, 'schild');
}
// Kunden doppelt so groß wie auf der Straße (sonst ging er hinter der Theke unter)
const _fig = document.createElement('canvas'); _fig.width = 24; _fig.height = 24;
function kundeGross(f, x, fuss, t) {
  const k = _fig.getContext('2d');
  k.clearRect(0, 0, 24, 24);
  figurKlein(k, f, 12, 23, t);
  c.drawImage(_fig, Math.round(x - 24), Math.round(fuss - 46), 48, 48);
}

function zeichne(t) {
  const g = spiel;
  const nacht = Z.licht().hell < 0.5;
  baueKulisse(nacht);
  c.drawImage(kulisse, 0, 0);
  const k = g.kunde, th = THEKE();
  // Kunde hinter der Theke (die Theke verdeckt die Beine)
  if (k) {
    kundeGross(k.figur, k.x, th + 5, t);
    r(c, 0, th, W, 5, '#a8703a'); r(c, 0, th, W, 1, '#c8905a'); r(c, 0, th + 4, W, 1, '#6a4222');
    if (k.bekommen) zeichnePlaetzchen(c, Math.round(k.x) - 12, th - 9, k.bekommen.form, k.bekommen.grad, k.bekommen.deko, 1);
    if (k.phase === 'wartet') blase(k, t); else MH.label('wunsch', 0, 0, null);
  } else MH.label('wunsch', 0, 0, null);
  // Ausgestochene Löcher im Teig (Deko: ein paar fertige Stellen)
  const ty = Math.round(H * 0.42);
  for (let i = 0; i < Math.min(8, g.gebacken.length + (g.ware ? 1 : 0)); i++) {
    const hx = 10 + (i % 4) * 16, hy = ty + 3 + Math.floor(i / 4) * 12;
    r(c, hx, hy, 8, 7, '#c89058'); r(c, hx, hy, 8, 1, '#a87444');
  }
  ofen(t);
  // Formen und Schalen
  formen.forEach((f, i) => form(i, formen.length, f, g.schritt === 'stechen', t));
  dekos.forEach((d, i) => schale(i, dekos.length, d));
  // Stempel-Bewegung über dem Teig
  if (g.stich) { const a = g.stich.t / 0.25; const sx = 36, sy = ty + 4 - Math.round(Math.sin(a * Math.PI) * 6); zeichnePlaetzchen(c, sx, sy, g.stich.form, 'roh', null, 1); }
  // Das Plätzchen selbst (im Ofen hinter der Scheibe: nur als Schatten)
  const w = g.ware;
  if (w && w.phase !== 'ofen') zeichnePlaetzchen(c, Math.round(w.x), Math.round(w.y), w.form, w.grad, w.deko, w.phase === 'liegt' || w.phase === 'fliegt' ? 2 : 1);
  else if (w) { const o = OFEN(); zeichnePlaetzchen(c, o.x + 12, o.y + o.h - 16, w.form, w.grad, null, 2); }
  // Rauch beim Verbrennen
  for (const s of g.rauch) if (s.t > 0) { const a = s.t / 1.2; c.fillStyle = `rgba(70,70,76,${(0.7 * (1 - a)).toFixed(2)})`; c.fillRect(Math.round(s.x + Math.sin(s.t * 6) * 2), Math.round(s.y - a * 24), 3 + Math.round(a * 3), 3 + Math.round(a * 3)); }
  // Hinweis, was dran ist
  const was = !k || k.phase !== 'wartet' ? '' : g.schritt === 'stechen' ? 'AUSSTECHEN' : g.schritt === 'backen' ? 'GOLDEN HERAUSHOLEN!' : g.schritt === 'verzieren' ? 'VERZIEREN' : '';
  MH.hinweis(g.t < 0 ? `Schwierigkeit: ${stufe.name}` : was && !g.aus ? was : null);
  MH.label('ofen', OFEN().x + 21, OFEN().y + OFEN().h + 4, 'OFEN', 'schild');
  for (const f of g.fehl) { const a = f.t / 0.3; c.fillStyle = `rgba(200,80,60,${1 - a})`; c.fillRect(Math.round(f.x - 2), Math.round(f.y), 5, 1); c.fillRect(Math.round(f.x), Math.round(f.y - 2), 1, 5); }
  for (const x of g.texte) if (!x.gezeigt) { x.gezeigt = true; MH.schwebe(x.x, x.y, x.text, x.farbe, x.text.length > 6 ? 0.8 : 1.1); }
  const rest = Math.max(0, Math.ceil(C.BACK_DAUER - Math.max(0, g.t)));
  MH.setzeKopf({ zeit: rest, knapp: rest <= 5 && g.t >= 0, kette: g.kette, ketteAnteil: g.kette > 1 ? 1 : 0, punkte: g.punkte });
  MH.mitte(g.aus ? 'ZEIT!' : g.t < 0 ? String(Math.ceil(-g.t)) : g.t < 0.6 ? 'LOS!' : null, g.t < 0 && !g.aus ? '#ffffff' : '#ffe27a');
}
