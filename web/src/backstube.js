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
import * as C from './config.js?v=202610131434';
import * as Z from './zeit.js?v=202610131434';
import * as T from './ton.js?v=202610131434';
import * as MH from './minihud.js?v=202610131434';
import { r, p, ton, figurGross, neueFarben } from './pixel.js?v=202610131434';

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
const istTeig = (m, x, y) => y >= 0 && y < m.length && x >= 0 && x < m[0].length && m[y][x] === '#';
/** Innen = alle vier Nachbarn sind Teig (dort liegt die Verzierung). */
const innen = (m, x, y) => istTeig(m, x, y) && istTeig(m, x - 1, y) && istTeig(m, x + 1, y) && istTeig(m, x, y - 1) && istTeig(m, x, y + 1);
// Teigfarbe je Backgrad: roh, blass, golden, dunkel, verbrannt
const BACKFARBE = { roh: '#f0dcb0', blass: '#ecd09a', golden: '#d89a48', dunkel: '#a8662c', verbrannt: '#3a2a22' };

/**
 * Die Maske einer Form in doppelter Größe (11.10.), mit Scale2x-Regeln auf
 * „Teig / kein Teig": Schräge Kanten bekommen Stufen von EINEM Pixel. Vorher
 * wurde jedes Maskenpixel als 2x2-Block gemalt, und Rand, Glanz und Streusel
 * waren doppelt so grob wie alles andere im Bild. Jetzt wird die Form groß
 * gemacht und Schattierung und Verzierung erst danach pixelgenau gerechnet.
 */
const _gross = {};
function maske(form, k) {
  const m = MASKEN[form];
  if (k !== 2) return m;
  if (_gross[form]) return _gross[form];
  const h = m.length, w = m[0].length, T = (x, y) => istTeig(m, x, y);
  const z = Array.from({ length: h * 2 }, () => Array(w * 2).fill('.'));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = T(x, y), A = y > 0 ? T(x, y - 1) : P, D = y < h - 1 ? T(x, y + 1) : P;
    const L = x > 0 ? T(x - 1, y) : P, R = x < w - 1 ? T(x + 1, y) : P;
    const e = [L === A && L !== D && A !== R ? A : P, A === R && A !== L && R !== D ? R : P,
      D === L && D !== R && L !== A ? L : P, R === D && R !== A && D !== L ? D : P];
    e.forEach((v, i) => { z[y * 2 + (i >> 1)][x * 2 + (i & 1)] = v ? '#' : '.'; });
  }
  return (_gross[form] = z.map((zeile) => zeile.join('')));
}

/**
 * Ein Plätzchen malen (auch fürs Rezeptbuch in ui.js). `k` = 1 oder 2
 * (Größe; die Pixel bleiben Spielpixel), `grad` = Backgrad, `deko` =
 * Verzierung oder null. (x, y) = linke obere Ecke.
 */
export function zeichnePlaetzchen(ctx, x, y, form, grad, deko, k = 1) {
  const m = maske(form, k), w = m[0].length;
  const px = (xx, yy, f) => { ctx.fillStyle = f; ctx.fillRect(x + xx, y + yy, 1, 1); };
  const teig = BACKFARBE[grad] || BACKFARBE.golden;
  const rand = ton(teig, -0.22);
  const licht = ton(teig, 0.2), krume = ton(teig, -0.12);
  for (let yy = 0; yy < m.length; yy++) for (let xx = 0; xx < w; xx++) {
    if (!istTeig(m, xx, yy)) continue;
    // Unterkante dunkler (Dicke), Oberkante und linke Kante heller (Licht von oben links),
    // dazu ein paar Krümel/Poren im Teig - seit 11.10., vorher eine flache Fläche
    let f = teig;
    if (!istTeig(m, xx, yy + 1) || !istTeig(m, xx + 1, yy)) f = rand;
    else if (!istTeig(m, xx, yy - 1) || !istTeig(m, xx - 1, yy)) f = licht;
    else if ((xx * 7 + yy * 13) % 11 === 0 && grad !== 'roh') f = krume;
    px(xx, yy, f);
  }
  if (!deko || grad === 'verbrannt') return;
  const n = m.length;
  for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < w; xx++) {
    const i = innen(m, xx, yy), t = istTeig(m, xx, yy);
    const bx = Math.floor(xx / k), by = Math.floor(yy / k);   // Stelle auf der kleinen Maske
    // Guss (11.10. deutlicher): deckend weiß, glänzend, mit Glanzstreifen und
    // einem Tropfen über die Unterkante. Puder: nur feiner Staub, der Teig
    // scheint überall durch - so sind die beiden nicht mehr zu verwechseln.
    if (deko === 'guss' && i) px(xx, yy, xx + yy >= 5 * k && xx + yy < 7 * k - (k - 1) ? '#ffffff' : (by > 4 ? '#e6eef6' : '#f8fbff'));
    else if (deko === 'guss' && t && !istTeig(m, xx, yy + 1) && (bx === 3 || bx === 6)) px(xx, yy, '#eef4fa');
    else if (deko === 'puder' && t && ((xx * 5 + yy * 3) % 7 === 0 || (xx * 3 + yy * 7) % 11 === 0)) px(xx, yy, '#fffdf8');
    else if (deko === 'schoko' && i) px(xx, yy, (xx + yy) % 4 === 0 ? '#8a5a3a' : (xx - yy) % 5 === 0 ? '#3a1e12' : '#5a3220');   // mit Glanzstreifen
    else if (deko === 'gruen' && i) px(xx, yy, (xx * 7 + yy * 3) % 5 === 0 ? ['#ff5a5a', '#ffe060', '#5ad0ff'][(xx + yy) % 3] : '#5aa84a');
    else if (deko === 'marmelade') {
      // Spitzbube: das Loch in der Mitte zeigt rote Marmelade; sonst ein Klecks
      if (!t && by > 1 && by < n / k - 2 && bx > 1 && bx < 7) px(xx, yy, '#c8283a');
      else if (form !== 'kreis' && i && Math.abs(bx - 4) <= 1 && Math.abs(by - 4) <= 1) px(xx, yy, (xx + yy) % 5 === 0 ? '#e8505a' : '#c8283a');
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
  stufe = C.miniStufe('back', stufeNr);
  setzeRezepte(rezeptListe);
  H = Math.round(hoehe); fertig = beiEnde;
  cv = $('#miniCv');
  cv.width = W; cv.height = H;
  c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  spiel = neuesSpiel(-3);
  $('#minispiel').classList.remove('versteckt');
  MH.an(W, H);
  T.musikMinispiel(true);
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
      const minus = abzug(g, 'falsch');
      g.texte.push({ x: slot(i, formen.length), y: fy - 18, text: 'NEIN! -' + minus, farbe: '#ff7a6a', t: 0 });
      T.spiele('falsch');
      return;
    }
    T.spiele('greifen');
    const b = BLECH();
    g.ware = { form, grad: 'roh', deko: null, phase: 'rutscht', t: 0, x: 40, y: Math.round(H * 0.48), vonX: 40, vonY: Math.round(H * 0.48), zuX: b.x - 4, zuY: b.y - 4, ofen: 0, gold: neuesGold() };
    g.schritt = 'warten';
    return;
  }
  // 2. Ofen
  if (x >= o.x - 4 && x <= o.x + o.b + 2 && y >= o.y - 14 && y <= o.y + o.h + 4) {
    if (g.schritt !== 'backen' || !g.ware) { fehl(x, y); return; }
    const a = g.ware.ofen / ofenDauer();
    const [von, bis] = gold(g.ware);
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
      const minus = abzug(g, 'falsch');
      g.texte.push({ x: slot(i, dekos.length), y: sy - 18, text: 'NEIN! -' + minus, farbe: '#ff7a6a', t: 0 });
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
/** Minuspunkte für einen Fehler (13.10.), nie unter 0. Gibt den Abzug zurück. */
function abzug(g, art) { const m = Math.round(C.MINI_MINUS.back[art] * stufe.punkte); g.punkte = Math.max(0, g.punkte - m); return m; }
const ofenDauer = () => C.BACK_OFEN / stufe.tempo;
/**
 * Goldener Bereich JE PLÄTZCHEN (11.10., Nutzerwunsch: „bei jedem Plätzchen soll
 * die Ofenanzeige anders sein"): Lage und Breite gewürfelt, im Mittel wie
 * C.BACK_GOLDEN (0,52-0,80, also 0,28 breit). Man muss also jedes Mal hinsehen.
 */
function neuesGold() {
  const breite = 0.22 + Math.random() * 0.1, von = 0.36 + Math.random() * (0.88 - breite - 0.36);
  return [von, von + breite];
}
const gold = (w) => (w && w.gold) || C.BACK_GOLDEN;

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
        g.texte.push({ x: k.x - 20, y: THEKE() - 30, text: 'ZU LANGSAM! -' + abzug(g, 'langsam'), farbe: '#ff7a6a', t: 0 });
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
      const [gv, gb] = gold(w);
      w.grad = a < Math.min(0.3, gv - 0.06) ? 'roh' : a < gv ? 'blass' : a <= gb ? 'golden' : 'dunkel';
      if (a >= 1) {
        // Verbrannt: Rauch, Plätzchen weg, nochmal ausstechen
        const o = OFEN();
        for (let i = 0; i < 6; i++) g.rauch.push({ x: o.x + 10 + i * 4, y: o.y, t: -i * 0.06 });
        g.texte.push({ x: o.x + 20, y: o.y - 18, text: 'VERBRANNT! -' + abzug(g, 'verbrannt'), farbe: '#ff7a6a', t: 0 });
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
export function messe(takt = 0.35, treffer = 1, goldAnteil = 1, hoehe = 380, stufeNr = 1, rezeptListe) {   // goldAnteil hieß gold und verdeckte die Funktion gold() (13.10.)
  stufe = C.miniStufe('back', stufeNr);
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
        const [von, bis2] = gold(g.ware);
        zielOfen = Math.random() < goldAnteil ? von + Math.random() * (bis2 - von) : (Math.random() < 0.5 ? von - 0.12 : bis2 + 0.1);
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

/** Weiches Licht (additiv): warme Lampen, Kerzen, Ofenglut. */
function schein(ctx, x, y, rad, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.45, `rgba(${rgb},${(a * 0.4).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2); ctx.restore();
}
// Wo die Lichter hängen (für das Funkeln in zeichne())
const LAMPE = { x: 92, y: 50 };   // Hängelampe über der Arbeitsfläche
const STERN = { x: 152, y: 66 };  // Herrnhuter Stern über dem Ofen (leuchtet selbst)
const KERZEN = [[16, 34], [20, 32], [25, 31], [30, 32], [34, 34]];   // Schwibbogen auf dem Fensterbrett
let kulisse = null, kulisseSchl = '', lichtKarte = null;
/**
 * Die Küche (12.10., zweite Fassung, gemeldet: „zu viel los, zu steril, wo
 * sind die Lichter?"). Wenig Dinge, warme Putzwand statt Kacheln - und
 * richtiges LICHT: Die ganze Szene wird am Ende mit einer Lichtkarte
 * multipliziert (`lichtKarte`). Die ist im Grund dämmrig und hat helle
 * Inseln, wo Licht ist: Lampe und Arbeitsfläche, Fenster, Schwibbogen.
 * So entstehen echte Abstufungen von hell nach dunkel, auch tagsüber.
 */
function baueKulisse(nacht) {
  const schl = `${H}|${nacht}|${Z.schnee() > 0}`;
  if (kulisse && kulisseSchl === schl) return;
  kulisseSchl = schl;
  kulisse = document.createElement('canvas');
  kulisse.width = W; kulisse.height = H;
  const ziel = c;
  c = kulisse.getContext('2d');
  const th = THEKE();
  // Warme Putzwand mit leichter Struktur
  r(c, 0, 0, W, th, '#e6cfa8');
  for (let i = 0; i < 260; i++) p(c, Math.floor(hash(i + 500) * W), Math.floor(hash(i + 510) * th), hash(i + 520) < 0.5 ? '#dcc29a' : '#eedab6');
  // Holzvertäfelung unten an der Wand
  r(c, 0, th - 18, W, 18, '#8a5a32'); r(c, 0, th - 18, W, 2, '#6a4222'); r(c, 0, th - 16, W, 1, '#a8703c');
  for (let x = 0; x < W; x += 15) { r(c, x, th - 15, 1, 15, '#6e4626'); r(c, x + 1, th - 15, 1, 15, '#9a6838'); }
  // Fenster mit Himmel, Vorhängen und Schwibbogen
  const fx = 10, fy = 10, fb = 30, fh = 22;
  r(c, fx - 2, fy - 2, fb + 4, fh + 4, '#6a4222'); r(c, fx - 2, fy - 2, fb + 4, 1, '#8a5a32');
  const himmel = nacht ? ['#101640', '#1a2454', '#24305e'] : ['#8cb4dc', '#a8c8e6', '#c8dcee'];
  for (let y = 0; y < fh; y++) r(c, fx, fy + y, fb, 1, himmel[Math.min(2, Math.floor(y / fh * 3))]);
  if (nacht) { for (let i = 0; i < 9; i++) p(c, fx + Math.floor(hash(i) * fb), fy + Math.floor(hash(i + 9) * fh * 0.6), '#fff4d0'); r(c, fx + 22, fy + 3, 3, 3, '#f4ecc8'); p(c, fx + 23, fy + 3, '#24305e'); }
  if (Z.schnee() > 0) {
    r(c, fx, fy + fh - 4, fb, 4, nacht ? '#c8d4ea' : '#f4f8fc');
    for (let x = 0; x < fb; x += 4) { const h = 2 + Math.floor(hash(x + 31) * 3); r(c, fx + x, fy + fh - 4 - h, 3, h, nacht ? '#2e3a66' : '#d8e2ee'); if (nacht && x % 8 === 0) p(c, fx + x + 1, fy + fh - 3 - h, '#ffd070'); }
  }
  r(c, fx + fb / 2, fy, 1, fh, '#6a4222'); r(c, fx, fy + fh / 2, fb, 1, '#6a4222');
  r(c, fx - 4, fy + fh + 2, fb + 8, 3, '#7a4c28'); r(c, fx - 4, fy + fh + 2, fb + 8, 1, '#a8703a');
  for (const [vx, rechts] of [[fx - 6, false], [fx + fb + 1, true]]) {
    for (let y = 0; y < fh + 2; y++) {
      const w = y < 12 ? 5 : y < 16 ? 3 : 5;
      for (let i = 0; i < w; i++) { const xx = rechts ? vx + i : vx + 5 - w + i; p(c, xx, fy - 3 + y, ((xx >> 1) + ((fy - 3 + y) >> 1)) % 2 ? '#b83030' : '#e8dccc'); }
    }
  }
  r(c, fx - 7, fy - 4, fb + 14, 2, '#5a3a22');
  for (let k = 0; k <= 20; k++) { const bx = 14 + k, by = 36 - Math.round(Math.sin(k / 20 * Math.PI) * 6); p(c, bx, by, '#3a2414'); p(c, bx, by + 1, '#5a3a22'); }
  r(c, 13, 36, 23, 1, '#3a2414');
  for (const [kx, ky] of KERZEN) r(c, kx, ky - 3, 1, 3, '#f4f0e0');
  // Ein Regal mit Vorratsgläsern
  r(c, 120, 30, 54, 2, '#7a4c28'); r(c, 120, 30, 54, 1, '#a8703a'); r(c, 122, 32, 2, 4, '#5a3a22'); r(c, 170, 32, 2, 4, '#5a3a22');
  const GL = ['#e8b030', '#c8283a', '#8a5a2a', '#f4f0e8'];
  for (let i = 0; i < 4; i++) {
    const gx = 124 + i * 12, gh = 10 + (i % 2) * 2;
    r(c, gx, 30 - gh, 9, gh, '#cfdde6'); r(c, gx + 1, 30 - gh + 3, 7, gh - 3, GL[i]); r(c, gx, 29 - gh, 9, 2, '#9a6a38');
    p(c, gx + 1, 30 - gh + 1, '#ffffff'); r(c, gx + 1, 30 - gh + 2, 1, gh - 3, 'rgba(255,255,255,0.45)');
  }
  // Hängelampe (Kabel, Messingschirm)
  r(c, LAMPE.x, 0, 1, LAMPE.y - 5, '#2a1e18');
  r(c, LAMPE.x - 5, LAMPE.y - 5, 11, 1, '#9a6e20'); r(c, LAMPE.x - 6, LAMPE.y - 4, 13, 2, '#c8962c'); r(c, LAMPE.x - 7, LAMPE.y - 2, 15, 1, '#8a5e18');
  r(c, LAMPE.x - 2, LAMPE.y - 1, 5, 2, '#fff4c0');
  // Tannenkranz mit roter Schleife an der Wand
  const kx = 44, ky = 66;
  for (let k = 0; k < 28; k++) { const w = k / 28 * Math.PI * 2; const x = Math.round(kx + Math.cos(w) * 9), y = Math.round(ky + Math.sin(w) * 9); r(c, x - 1, y - 1, 3, 3, k % 3 ? '#2f6a2a' : '#3f8a3a'); }
  for (let k = 0; k < 28; k += 4) { const w = k / 28 * Math.PI * 2 + 0.3; p(c, Math.round(kx + Math.cos(w) * 9), Math.round(ky + Math.sin(w) * 9), '#c83030'); }
  r(c, kx - 3, ky + 8, 7, 3, '#c83030'); r(c, kx - 1, ky + 11, 1, 4, '#a82020'); r(c, kx + 1, ky + 11, 1, 3, '#a82020'); p(c, kx, ky + 9, '#e85050');
  r(c, kx, ky - 22, 1, 13, 'rgba(90,60,40,0.6)');
  // Herrnhuter Stern (Stern aus Zacken, warm leuchtend)
  r(c, STERN.x, 32, 1, STERN.y - 38, '#2a1e18');   // hängt am Regalbrett
  for (const [dx, dy] of [[0, -6], [0, 6], [-6, 0], [6, 0], [-4, -4], [4, -4], [-4, 4], [4, 4]]) {
    const n = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 1; i <= n; i++) { const x = STERN.x + Math.round(dx * i / n), y = STERN.y + Math.round(dy * i / n); p(c, x, y, i === n ? '#fff6d0' : '#ffd88a'); if (i < n - 1) { p(c, x + 1, y, '#f4b850'); p(c, x, y + 1, '#e8a040'); } }
  }
  r(c, STERN.x - 2, STERN.y - 2, 5, 5, '#ffe6a0'); p(c, STERN.x, STERN.y, '#ffffff');
  // Girlande oben (die Lichter funkeln in lichter())
  for (let x = 0; x < W; x++) {
    const y = 2 + Math.round(Math.sin((x % 30) / 30 * Math.PI) * 4);
    p(c, x, y, x % 2 ? '#2f6a2a' : '#3f8a3a'); p(c, x, y + 1, '#245224');
    if (x % 30 === 0) { r(c, x - 1, y - 1, 3, 2, '#c83030'); }
  }
  // Theke vorn
  r(c, 0, th, W, 5, '#9a6434'); r(c, 0, th, W, 1, '#c8905a'); r(c, 0, th + 4, W, 1, '#5a3a1e');
  // Arbeitstisch: ruhige Dielen
  r(c, 0, th + 5, W, H - th - 5, '#c08a52');
  for (let y = th + 12; y < H; y += 10) { r(c, 0, y, W, 1, '#a07040'); r(c, 0, y + 1, W, 1, '#cc9a60'); }
  for (let i = 0; i < 14; i++) p(c, Math.floor(hash(i + 40) * W), th + 6 + Math.floor(hash(i + 80) * (H - th - 6)), '#a87444');
  // Schneidbrett mit ausgerolltem Teig
  const ty = Math.round(H * 0.42), tb = 70, tH = Math.round(H * 0.13);
  r(c, 3, ty - 3, tb + 6, tH + 6, '#8a5a30'); r(c, 3, ty - 3, tb + 6, 1, '#b07a44'); r(c, 3, ty + tH + 2, tb + 6, 1, '#5a3a1e');
  r(c, 6, ty, tb, tH, '#f0dcb0'); r(c, 6, ty + tH - 1, tb, 1, '#d8bc88'); r(c, 6, ty, 1, tH, '#e4cc9c'); r(c, 7, ty, tb - 2, 1, '#faecc8');
  for (let i = 0; i < 18; i++) p(c, 7 + Math.floor(hash(i + 7) * (tb - 2)), ty + 1 + Math.floor(hash(i + 17) * (tH - 2)), '#fbf4e4');
  const ny = ty + tH + 5;
  r(c, 12, ny, 42, 5, '#d8a868'); r(c, 12, ny, 42, 1, '#f0c88a'); r(c, 12, ny + 4, 42, 1, '#a87040');
  for (const gx of [4, 55]) { r(c, gx, ny + 1, 7, 3, '#7a4c28'); r(c, gx, ny + 1, 7, 1, '#9a6434'); }
  // Backblech mit Backpapier
  const b = BLECH();
  r(c, b.x - 16, b.y - 7, 32, 14, '#4a4e58'); r(c, b.x - 16, b.y - 7, 32, 1, '#7a7e88');
  r(c, b.x - 14, b.y - 5, 28, 10, '#f4ecd8'); r(c, b.x - 14, b.y - 5, 28, 1, '#fffaf0');
  // Backpapier für die Formen, Leinenläufer für die Schalen
  const fy0 = FORM_Y() - 13;
  r(c, 2, fy0, W - 4, 26, '#f4ecdc'); r(c, 2, fy0 + 26, W - 4, 1, 'rgba(50,25,10,0.35)'); r(c, 2, fy0, W - 4, 1, '#fffaf2');
  for (let i = 0; i < 20; i++) p(c, 3 + Math.floor(hash(i + 300) * (W - 6)), fy0 + 1 + Math.floor(hash(i + 310) * 24), '#ffffff');
  const sy0 = SCHALE_Y() - 13;
  r(c, 2, sy0, W - 4, 26, '#e8dcc4'); r(c, 2, sy0 + 1, W - 4, 1, '#c84040'); r(c, 2, sy0 + 24, W - 4, 1, '#c84040'); r(c, 2, sy0 + 26, W - 4, 1, 'rgba(50,25,10,0.35)');
  for (let i = 0; i < 30; i++) p(c, 3 + Math.floor(hash(i + 340) * (W - 6)), sy0 + 3 + Math.floor(hash(i + 350) * 20), '#ddd0b6');   // Leinenstruktur
  c = ziel;

  // Lichtkarte: dämmriger Grund, helle Inseln - wird über die fertige Szene multipliziert
  lichtKarte = document.createElement('canvas');
  lichtKarte.width = W; lichtKarte.height = H;
  const l = lichtKarte.getContext('2d');
  l.fillStyle = nacht ? '#4a3a4e' : '#9c887a'; l.fillRect(0, 0, W, H);
  const insel = (x, y, rad, farbe, a) => {
    const g = l.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${farbe},${a})`); g.addColorStop(0.5, `rgba(${farbe},${(a * 0.45).toFixed(3)})`); g.addColorStop(1, `rgba(${farbe},0)`);
    l.save(); l.globalCompositeOperation = 'lighter'; l.fillStyle = g; l.fillRect(x - rad, y - rad, rad * 2, rad * 2); l.restore();
  };
  insel(LAMPE.x, LAMPE.y + 4, 90, '255,226,170', nacht ? 0.75 : 0.5);          // Lampe
  insel(LAMPE.x, H * 0.66, 130, '255,214,160', nacht ? 0.55 : 0.4);           // Arbeitsfläche darunter
  insel(25, 22, 44, nacht ? '120,140,200' : '200,220,255', nacht ? 0.25 : 0.55);   // Fenster
  insel(25, 32, 26, '255,190,110', nacht ? 0.5 : 0.25);                       // Schwibbogen
  insel(STERN.x, STERN.y, 50, '255,200,120', nacht ? 0.55 : 0.3);            // Herrnhuter Stern
  insel(155, H * 0.5, 60, '255,170,110', nacht ? 0.2 : 0.12);                // Ofenecke
}

/** Was flackert und funkelt (jedes Bild, NACH der Lichtkarte): Kerzen, Lichterkette, Lampe. */
function lichter(t, nacht) {
  schein(c, LAMPE.x, LAMPE.y, 16, '255,230,170', nacht ? 0.55 : 0.35);
  schein(c, STERN.x, STERN.y, 14 + Math.sin(t * 1.5) * 1.5, '255,210,130', nacht ? 0.6 : 0.35);
  for (const [kx, ky] of KERZEN) {
    const fl = Math.sin(t * 9 + kx) > 0 ? 1 : 0;
    p(c, kx, ky - 4, '#ffd040'); p(c, kx, ky - 5 - fl, '#fff4b0');
    schein(c, kx, ky - 5, 7, '255,200,110', (nacht ? 0.45 : 0.25) + fl * 0.06);
  }
  for (let x = 3; x < W; x += 6) {
    if (x % 30 === 0) continue;
    const y = 2 + Math.round(Math.sin((x % 30) / 30 * Math.PI) * 4) + 2;
    const f = ['#ffe060', '#ff6a6a', '#8ad0ff', '#9aff8a'][(x / 6 | 0) % 4];
    const an = Math.sin(t * 2.2 + x * 0.7) > -0.6;
    p(c, x, y, an ? f : ton(f, -0.45));
    if (an) schein(c, x, y, 5, f === '#ffe060' ? '255,224,96' : f === '#ff6a6a' ? '255,106,106' : f === '#8ad0ff' ? '138,208,255' : '154,255,138', nacht ? 0.4 : 0.22);
  }
}

function ofen(t) {
  const o = OFEN(), g = spiel, w = g.ware;
  const drin = w && w.phase === 'ofen';
  const nacht = Z.licht().hell < 0.5;
  // Gehäuse: Retro-Emaille, Chromleiste, Füße
  const em = '#efe4cc', emD = '#c8b898', emH = '#fff8e8';
  r(c, o.x + 2, o.y + o.h, 4, 3, '#3a3036'); r(c, o.x + o.b - 6, o.y + o.h, 4, 3, '#3a3036');   // Füße
  r(c, o.x, o.y - 8, o.b, o.h + 8, em);
  r(c, o.x, o.y - 8, 1, o.h + 8, emH); r(c, o.x + o.b - 1, o.y - 8, 1, o.h + 8, emD); r(c, o.x, o.y + o.h - 1, o.b, 1, emD);
  r(c, o.x, o.y - 8, o.b, 7, '#c8ccd4'); r(c, o.x, o.y - 8, o.b, 1, '#eef2f6'); r(c, o.x, o.y - 2, o.b, 1, '#8a8e98');   // Bedienleiste
  for (let i = 0; i < 3; i++) { const kx = o.x + 5 + i * 8; r(c, kx, o.y - 6, 4, 4, '#b8862a'); r(c, kx, o.y - 6, 4, 1, '#e8c060'); p(c, kx + 1 + (i % 2), o.y - 5, '#6a4a18'); }   // Messingknöpfe
  r(c, o.x + o.b - 8, o.y - 6, 3, 3, drin ? '#ff5a3a' : '#7a3a3a'); if (drin) p(c, o.x + o.b - 7, o.y - 6, '#ffd0a0');   // Kontrolllampe
  // Tür mit Fenster (gerundet)
  const fx = o.x + 4, fy = o.y + 3, fb = o.b - 8, fh = o.h - 12;
  r(c, fx - 2, fy - 2, fb + 4, fh + 4, '#d8ccb0'); r(c, fx - 1, fy - 1, fb + 2, fh + 2, '#3a3036');
  p(c, fx - 1, fy - 1, '#d8ccb0'); p(c, fx + fb, fy - 1, '#d8ccb0'); p(c, fx - 1, fy + fh, '#d8ccb0'); p(c, fx + fb, fy + fh, '#d8ccb0');
  const fl = Math.sin(t * 9) * 0.5 + 0.5;
  if (drin) {
    // Glut: von unten nach oben heller, flackernd
    for (let y = 0; y < fh; y++) { const k = y / fh; r(c, fx, fy + y, fb, 1, k > 0.75 ? '#ff9a40' : k > 0.45 ? (fl > 0.5 ? '#f08a38' : '#e88030') : k > 0.2 ? '#c86a28' : '#a85420'); }
    for (let i = 0; i < fb; i += 2) { p(c, fx + i, fy + fh - 2, (i / 2 + Math.floor(t * 6)) % 2 ? '#ffd040' : '#ff6a20'); p(c, fx + i, fy + 1, '#ff7a30'); }   // Heizstäbe
  } else {
    r(c, fx, fy, fb, fh, '#2e2428'); r(c, fx, fy + fh - 2, fb, 1, '#4a2a22'); r(c, fx, fy + 1, fb, 1, '#3a2a26');
  }
  r(c, fx, fy + fh - 7, fb, 1, '#8a8a92');   // Rost
  for (let k = 0; k < 4; k++) p(c, fx + 3 + k, fy + 2 + k, 'rgba(255,255,255,0.35)');   // Spiegelung
  for (let k = 0; k < 3; k++) p(c, fx + 8 + k, fy + 2 + k, 'rgba(255,255,255,0.2)');
  // Griff (Chrom) unter dem Fenster
  r(c, o.x + 6, o.y + o.h - 6, o.b - 12, 2, '#d8dce4'); r(c, o.x + 6, o.y + o.h - 6, o.b - 12, 1, '#ffffff'); p(c, o.x + 6, o.y + o.h - 5, '#8a8e98'); p(c, o.x + o.b - 7, o.y + o.h - 5, '#8a8e98');
  // Backbalken über dem Ofen (Messingrahmen): blass - golden - dunkel, Strich = jetzt
  const bx = o.x, by = o.y - 14, bb = o.b;
  const [von, bis] = gold(w);
  r(c, bx - 1, by - 1, bb + 2, 6, '#b8862a'); r(c, bx - 1, by - 1, bb + 2, 1, '#e8c060');
  r(c, bx, by, bb, 4, '#3a2a20');
  r(c, bx, by + 1, Math.round(bb * von), 2, '#ecd09a');
  r(c, bx + Math.round(bb * von), by, Math.round(bb * (bis - von)), 4, '#ffc040');
  r(c, bx + Math.round(bb * bis), by + 1, bb - Math.round(bb * bis), 2, '#a8662c');
  if (drin) {
    const a = Math.min(1, w.ofen / ofenDauer()), m = bx + Math.min(bb - 1, Math.round(bb * a));
    r(c, m, by - 2, 1, 8, '#ffffff');
    // Im goldenen Bereich blinkt der Ofen auf - jetzt tippen!
    if (a >= von && a <= bis && Math.floor(t * 8) % 2) { c.strokeStyle = '#ffe060'; c.lineWidth = 1; c.strokeRect(o.x - 1.5, o.y - 9.5, o.b + 3, o.h + 11); }
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

// Ausstechformen (12.10. neu): bunt, je Form EINE Farbe als 2 Pixel breites
// Band, oben/links eine Glanzkante, darunter ein harter Schatten aufs
// Backpapier - kein Verlauf mehr (vorher grau, außen dunkel, innen hell).
const FORM_FARBE = { stern: '#e8a820', mond: '#4a8ad8', herz: '#e04848', baum: '#3a9a4a', kreis: '#a060d0' };
function form(i, n, f, aktiv, t) {
  const x = slot(i, n), y = FORM_Y();
  const m = maske(f, 2), x0 = x - 9, y0 = y - Math.round(m.length / 2);
  const druck = spiel.stich && spiel.stich.form === f ? 1 : 0;
  const farbe = FORM_FARBE[f] || '#c8ccd4', hell = ton(farbe, 0.45);
  const offen = (xx, yy) => !istTeig(m, xx - 1, yy) || !istTeig(m, xx + 1, yy) || !istTeig(m, xx, yy - 1) || !istTeig(m, xx, yy + 1);
  const rand = (a, b) => istTeig(m, a, b) && offen(a, b);
  const band = (xx, yy) => istTeig(m, xx, yy) && (offen(xx, yy) || rand(xx - 1, yy) || rand(xx + 1, yy) || rand(xx, yy - 1) || rand(xx, yy + 1));
  // Wählbar: ein warmer Lichtfleck darunter
  if (aktiv) schein(c, x, y, 16, '255,230,160', 0.22);
  // Schatten (1 nach rechts unten), dann das Band, dann die Glanzkante
  c.fillStyle = 'rgba(70,40,20,0.28)';
  for (let yy = 0; yy < m.length; yy++) for (let xx = 0; xx < m[0].length; xx++) if (band(xx, yy)) c.fillRect(x0 + xx + 1, y0 + yy + 1 + druck, 1, 1);
  for (let yy = 0; yy < m.length; yy++) for (let xx = 0; xx < m[0].length; xx++) {
    if (!band(xx, yy)) continue;
    const glanz = offen(xx, yy) && (!istTeig(m, xx, yy - 1) || !istTeig(m, xx - 1, yy)) && (xx + yy) % 5 !== 0;
    c.fillStyle = glanz ? hell : farbe;
    c.fillRect(x0 + xx, y0 + yy + druck, 1, 1);
  }
}
function schale(i, n, d) {
  const x = slot(i, n), y = SCHALE_Y(), f = C.BACK_DEKOS[d].f;
  r(c, x - 12, y - 4, 24, 3, f); r(c, x - 11, y - 5, 22, 1, ton(f, 0.15));
  r(c, x - 13, y - 1, 26, 2, '#f4f2ee'); r(c, x - 12, y + 1, 24, 3, '#e4e0d8'); r(c, x - 10, y + 4, 20, 2, '#cfc8bc'); r(c, x - 8, y + 6, 16, 1, '#a89e90');
  r(c, x - 12, y + 2, 24, 1, '#4a7ac8'); for (let k = -10; k <= 10; k += 4) p(c, x + k, y + 3, '#4a7ac8');   // blauer Rand wie Steingut
  r(c, x - 12, y - 1, 3, 1, '#ffffff');
  if (d === 'gruen') for (let k = 0; k < 6; k++) p(c, x - 10 + k * 4, y - 4, ['#ff5a5a', '#ffe060', '#5ad0ff'][k % 3]);
  if (d === 'guss') {
    // Glänzende Flüssigkeit: Lichtreflex, Löffel mit hängendem Tropfen
    r(c, x - 12, y - 4, 24, 3, '#f8fbff'); r(c, x - 9, y - 4, 7, 1, '#ffffff'); r(c, x + 2, y - 3, 4, 1, '#ffffff');
    r(c, x - 12, y - 2, 24, 1, '#dce6f0');
    r(c, x + 6, y - 13, 2, 9, '#c8a878'); r(c, x + 5, y - 5, 4, 2, '#c8a878'); p(c, x + 6, y - 3, '#f8fbff'); p(c, x + 6, y - 2, '#f8fbff');
  } else if (d === 'puder') {
    // Ein Haufen Puderzucker (gewölbt, matt) und ein Sieb, aus dem es rieselt
    for (let k = 0; k < 5; k++) r(c, x - 10 + k, y - 5 - k, 20 - k * 2, 1, k % 2 ? '#f4f0e6' : '#fbf8f2');
    for (const [dx, dy] of [[-6, -6], [-2, -8], [3, -7], [6, -5], [0, -5]]) p(c, x + dx, y + dy, '#e8e2d6');
    r(c, x - 4, y - 18, 9, 3, '#9a9aa8'); r(c, x - 3, y - 16, 7, 1, '#c8c8d4'); r(c, x + 5, y - 17, 5, 1, '#6a4a32');
    for (let k = 0; k < 6; k++) p(c, x - 3 + (k * 3) % 7, y - 14 + k, '#ffffff');
  } else r(c, x + 8, y - 12, 1, 8, '#c8a878');   // Löffel / Pinsel
  MH.label('schale' + i, x, y + 9, C.BACK_DEKOS[d].kurz, 'schild');
}
// Kunden doppelt so groß wie auf der Straße (sonst ging er hinter der Theke
// unter). Seit 11.10. die GROSSE Figur vom Tresen, nativ gezeichnet - vorher
// die kleine, als 2x2-Blöcke hochgezogen, mit doppelt so groben Pixeln.
function kundeGross(f, x, theke, t) {
  figurGross(c, { ...f, laeuft: false }, Math.round(x), theke, t, 'froh');
}

function zeichne(t) {
  const g = spiel;
  const nacht = Z.licht().hell < 0.5;
  baueKulisse(nacht);
  c.drawImage(kulisse, 0, 0);
  const k = g.kunde, th = THEKE();
  // Kunde hinter der Theke (die Theke verdeckt die Beine)
  if (k) {
    kundeGross(k.figur, k.x, th, t);
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
  else if (w) { const o = OFEN(); zeichnePlaetzchen(c, o.x + 12, o.y + o.h - 32, w.form, w.grad, null, 2); }   // auf dem Rost (12.10.: neuer Ofen, Fenster höher)
  // Rauch beim Verbrennen
  for (const s of g.rauch) if (s.t > 0) { const a = s.t / 1.2; c.fillStyle = `rgba(70,70,76,${(0.7 * (1 - a)).toFixed(2)})`; c.fillRect(Math.round(s.x + Math.sin(s.t * 6) * 2), Math.round(s.y - a * 24), 3 + Math.round(a * 3), 3 + Math.round(a * 3)); }
  // Licht (12.10.): die ganze Szene mit der Lichtkarte multiplizieren - dämmrig,
  // mit hellen Inseln -, danach leuchten die Quellen selbst darüber
  c.save(); c.globalCompositeOperation = 'multiply'; c.drawImage(lichtKarte, 0, 0); c.restore();
  lichter(t, nacht);
  if (w && w.phase === 'ofen') { const o = OFEN(), fl = Math.sin(t * 9) * 0.5 + 0.5; schein(c, o.x + o.b / 2, o.y + o.h / 2 - 3, 56, '255,140,60', (nacht ? 0.42 : 0.3) + fl * 0.06); }
  // Hinweis, was dran ist
  // Was dran ist - direkt über der Reihe, in der man tippen muss (11.10.: oben
  // auf dem Regal war es klein und schlecht zu lesen)
  const was = !k || k.phase !== 'wartet' ? '' : g.schritt === 'stechen' ? 'Tippe die richtige AUSSTECHFORM' : g.schritt === 'backen' ? 'Im GELBEN Bereich rausholen!' : g.schritt === 'verzieren' ? 'Tippe die richtige VERZIERUNG' : '';
  // Beim Backen links neben dem Ofen - darüber verdeckte er Ofen und Anzeige
  const woY = g.schritt === 'stechen' ? FORM_Y() - 24 : g.schritt === 'verzieren' ? SCHALE_Y() - 26 : OFEN().y + 6;
  const woX = g.schritt === 'backen' ? Math.round(OFEN().x / 2) : null;
  MH.hinweis(g.t < 0 ? `Schwierigkeit: ${stufe.name}` : was && !g.aus ? was : null, g.t < 0 || !was ? null : woY, woX);
  MH.label('ofen', OFEN().x + 21, OFEN().y + OFEN().h + 4, 'OFEN', 'schild');
  for (const f of g.fehl) { const a = f.t / 0.3; c.fillStyle = `rgba(200,80,60,${1 - a})`; c.fillRect(Math.round(f.x - 2), Math.round(f.y), 5, 1); c.fillRect(Math.round(f.x), Math.round(f.y - 2), 1, 5); }
  for (const x of g.texte) if (!x.gezeigt) { x.gezeigt = true; MH.schwebe(x.x, x.y, x.text, x.farbe, x.text.length > 6 ? 0.8 : 1.1); }
  const rest = Math.max(0, Math.ceil(C.BACK_DAUER - Math.max(0, g.t)));
  MH.setzeKopf({ zeit: rest, knapp: rest <= 5 && g.t >= 0, kette: g.kette, ketteAnteil: g.kette > 1 ? 1 : 0, punkte: g.punkte });
  MH.mitte(g.aus ? 'ZEIT UM!' : g.t < 0 ? String(Math.ceil(-g.t)) : g.t < 0.6 ? 'LOS!' : null, g.t < 0 && !g.aus ? '#ffffff' : '#ffe27a');
}
