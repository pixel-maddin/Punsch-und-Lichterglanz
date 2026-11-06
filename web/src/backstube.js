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
import * as C from './config.js?v=202611061600';
import * as Z from './zeit.js?v=202611061600';
import * as T from './ton.js?v=202611061600';
import * as MH from './minihud.js?v=202611061600';
import { r, p, ton, figurGross, neueFarben } from './pixel.js?v=202611061600';

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
  // 27.10.: kein Rezept - der viereckige Lebkuchen unter jeder Schale zeigt, wie die Verzierung aussieht
  quadrat: ['.#######.', '#########', '#########', '#########', '#########', '#########', '.#######.'],
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
 * Verzierung, eine Liste von Verzierungen (übereinander) oder null. (x, y) = linke obere Ecke.
 */
export function zeichnePlaetzchen(ctx, x, y, form, grad, dekos, k = 1) {
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
  if (!dekos || grad === 'verbrannt') return;
  const n = m.length;
  for (const deko of C.dekoListe(dekos)) for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < w; xx++) {
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
      // (28.10.: Der Zuckerstaub auf dem Spitzbuben ist jetzt ein eigener Schritt - Puderzucker)
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

// Wo was steht (abhängig von H).
// 05.11. (Nutzer: „am Anfang weiß man gar nicht, wo man hinklicken muss“): neu geordnet nach dem Ablauf
// von oben nach unten - Kunde mit Bestellung, darunter mittig der Ofen (größer) mit breiter Anzeige,
// darunter die Reihe der Formen und die Reihe der Schalen als Kacheln. Das große Teigbrett ist weg
// (dort passierte nichts): ein schmaler Teigstreifen links am Ofen, rechts ein Kuchengitter zum Verzieren.
const THEKE = () => Math.round(H * 0.28);
const OFEN = () => { const b = 64; return { x: Math.round((W - b) / 2), y: THEKE() + 20, b, h: Math.max(54, Math.round(H * 0.2)) }; };
const ANZEIGE = () => { const o = OFEN(); return { x: 20, y: o.y + o.h + 7, b: W - 40, h: 9 }; };
const TEIG = () => { const o = OFEN(); return { x: 6, y: o.y + 6, b: o.x - 14, h: 20 }; };
const BLECH = () => { const o = OFEN(); return { x: Math.round((o.x + o.b + W) / 2), y: o.y + o.h - 16 }; };   // Kuchengitter
// 27.10.: unter jeder Schale ein Lebkuchen mit der Verzierung als Vorschau (VORSCHAU_DY)
const FORM_Y = () => Math.round(H * 0.68);
const SCHALE_Y = () => Math.round(H * 0.845);
const VORSCHAU_DY = 9;   // Oberkante des Vorschau-Lebkuchens unter der Schalenmitte
const KUNDE = () => ({ x: 150, y: THEKE() + 1 });
const slot = (i, n) => Math.round((i + 0.5) * W / n);

/**
 * Runde starten. `beiEnde(punkte, kunden, gebacken)` kommt nach Ablauf,
 * `gebacken` = Liste der Rezept-ids (für die Plätzchendose).
 */
export function starte(hoehe, beiEnde, stufeNr = 1, rezeptListe, uebung = false) {
  stufe = C.miniStufe('back', stufeNr);
  setzeRezepte(rezeptListe);
  H = Math.round(hoehe); fertig = beiEnde;
  cv = $('#miniCv');
  cv.width = W; cv.height = H;
  c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  spiel = neuesSpiel(-3);
  spiel.uebung = uebung;   // 05.11.: allererste Runde - der erste Kunde wartet, die Zeit steht
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
  dekos = Object.keys(C.BACK_DEKOS).filter((d) => rezepte.some((x) => C.dekoListe(x.deko).includes(d)));
}

const wahl = (l) => l[Math.floor(Math.random() * l.length)];

function neuesSpiel(t0) {
  return { t: t0, punkte: 0, kette: 1, kunden: 0, kunde: null, kundeAb: 0.3, ware: null, schritt: 'stechen',
    texte: [], fehl: [], rauch: [], staub: [], aus: false, gebacken: [], stich: null, letzteForm: null };
}
function neuerKunde(g) {
  // Nicht zweimal hintereinander dasselbe, sonst wird es langweilig
  let rz = wahl(rezepte);
  if (g.letzte && rezepte.length > 1) while (rz.id === g.letzte) rz = wahl(rezepte);
  g.letzte = rz.id;
  const max = Math.max(7, 12.5 - g.kunden * 0.3) / stufe.tempo;
  const typ = wahl(['erwachsen', 'erwachsen', 'oma', 'opa', 'kind']);
  g.kunde = { x: W + 16, phase: 'kommt', rezept: rz, geduld: max, max, fehler: false, uebung: !!g.uebung && g.kunden === 0,
    figur: { typ, farben: neueFarben(typ), phase: Math.random() * 6, laeuft: true } };
  g.schritt = 'stechen'; g.ware = null;
}
function nimmGeduld(g, s) { if (g.kunde && !g.kunde.uebung) g.kunde.geduld -= s; }

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
    { const tg = TEIG(); for (let i = 0; i < 7; i++) g.staub.push({ x: tg.x + tg.b / 2 - 4 + Math.random() * 10, y: tg.y + 6 + Math.random() * 6, vx: (Math.random() - 0.5) * 14, t: -Math.random() * 0.1 }); }
    if (form !== k.rezept.form) {
      k.fehler = true; nimmGeduld(g, 2); g.kette = 1;
      const minus = abzug(g, 'falsch');
      g.texte.push({ x: slot(i, formen.length), y: fy - 18, text: 'NEIN! -' + minus, farbe: '#ff7a6a', t: 0 });
      T.spiele('falsch');
      return;
    }
    T.spiele('greifen');
    const tg = TEIG(), tx = tg.x + Math.round(tg.b / 2) - 4, ty = tg.y + 6;
    g.ware = { form, grad: 'roh', deko: null, phase: 'rutscht', t: 0, x: tx, y: ty, vonX: tx, vonY: ty, zuX: o.x - 6, zuY: o.y + o.h - 22, ofen: 0, gold: neuesGold() };
    g.schritt = 'warten';
    return;
  }
  // 2. Ofen
  const an = ANZEIGE();
  if (x >= Math.min(o.x - 4, an.x) && x <= Math.max(o.x + o.b + 2, an.x + an.b) && y >= o.y - 14 && y <= an.y + an.h + 4) {
    if (g.schritt !== 'backen' || !g.ware) { fehl(x, y); return; }
    const a = g.ware.ofen / ofenDauer();
    const [von, bis] = gold(g.ware);
    g.ware.grad = a < von ? 'blass' : a <= bis ? 'golden' : 'dunkel';
    g.ware.phase = 'raus'; g.ware.t = 0; g.ware.vonX = o.x + o.b / 2 - 9; g.ware.vonY = o.y + o.h - 30;
    const b = BLECH(); g.ware.zuX = b.x - 9; g.ware.zuY = b.y - 9;
    g.schritt = 'warten';
    g.texte.push({ x: o.x + o.b / 2, y: o.y - 18, text: g.ware.grad === 'golden' ? 'GOLDEN!' : g.ware.grad === 'blass' ? 'BLASS' : 'DUNKEL', farbe: g.ware.grad === 'golden' ? '#ffd040' : '#e8d8c0', t: 0 });
    T.spiele(g.ware.grad === 'golden' ? 'fertig' : 'glas');
    return;
  }
  // 3. Verzierung
  if (y > sy - 18 && y < sy + VORSCHAU_DY + 22) {   // Schale, Vorschau-Lebkuchen oder Schild
    if (g.schritt !== 'verzieren' || !g.ware) { fehl(x, y); return; }
    const i = Math.max(0, Math.min(dekos.length - 1, Math.floor(x / (W / dekos.length))));
    const d = dekos[i];
    // Mehrere Verzierungen (Spitzbube: Marmelade, dann Puderzucker) - immer die nächste fällige
    const soll = C.dekoListe(k.rezept.deko), schon = C.dekoListe(g.ware.deko);
    if (d !== soll[schon.length]) {
      k.fehler = true; nimmGeduld(g, 2); g.kette = 1;
      const minus = abzug(g, 'falsch');
      g.texte.push({ x: slot(i, dekos.length), y: sy - 18, text: 'NEIN! -' + minus, farbe: '#ff7a6a', t: 0 });
      T.spiele('falsch');
      return;
    }
    T.spiele('blubb');
    const neu = [...schon, d];
    g.ware.deko = neu.length === 1 ? d : neu;
    if (neu.length < soll.length) { g.texte.push({ x: slot(i, dekos.length), y: sy - 18, text: 'JETZT ' + C.BACK_DEKOS[soll[neu.length]].kurz + '!', farbe: '#ffe060', t: 0 }); return; }
    g.ware.phase = 'fliegt'; g.ware.t = 0; g.ware.vonX = g.ware.x; g.ware.vonY = g.ware.y;
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
  // Special: schmaler goldener Bereich
  const breite = (0.22 + Math.random() * 0.1) * (stufe.special ? 0.7 : 1), von = 0.36 + Math.random() * (0.88 - breite - 0.36);
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
  // Übungsplätzchen: Solange der erste Kunde wartet, läuft die Rundenzeit nicht
  g.t += g.t >= 0 && g.kunde && g.kunde.uebung && g.kunde.phase !== 'geht' ? 0 : dt;
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
      if (!k.uebung) k.geduld -= dt;
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
      if (w.t >= 0.25) { const o = OFEN(); w.phase = 'rein'; w.t = 0; w.vonX = w.x; w.vonY = w.y; w.zuX = o.x + o.b / 2 - 4; w.zuY = o.y + o.h - 20; }
    } else if (w.phase === 'rein') {
      const e = glatt(0.2);
      w.x = w.vonX + (w.zuX - w.vonX) * e; w.y = w.vonY + (w.zuY - w.vonY) * e;
      if (w.t >= 0.2) { w.phase = 'ofen'; w.t = 0; g.schritt = 'backen'; T.spiele('brutzeln'); }
    } else if (w.phase === 'ofen') {
      w.ofen += dt;
      const a = w.ofen / ofenDauer();
      const [gv, gb] = gold(w);
      w.grad = a < Math.min(0.3, gv - 0.06) ? 'roh' : a < gv ? 'blass' : a <= gb ? 'golden' : 'dunkel';
      // „JETZT!“-Moment (05.11.): beim Eintritt in den goldenen Bereich ein leiser Klick
      const drin = a >= gv && a <= gb;
      if (drin && !w.imGold) T.spiele('piep');   // 06.11.: leises Piepen (vorher ein Klick)
      w.imGold = drin;
      if (a >= 1) {
        // Verbrannt: Rauch, Plätzchen weg, nochmal ausstechen
        const o = OFEN();
        for (let i = 0; i < 6; i++) g.rauch.push({ x: o.x + 14 + i * 6, y: o.y, t: -i * 0.06 });
        g.texte.push({ x: o.x + o.b / 2, y: o.y - 18, text: 'VERBRANNT! -' + abzug(g, 'verbrannt'), farbe: '#ff7a6a', t: 0 });
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
  for (const s of g.staub) s.t += dt;
  g.staub = g.staub.filter((s) => s.t < 0.8);
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
      if (g.ware.ofen / ofenDauer() >= zielOfen) { const o = OFEN(); tippeAuf(o.x + o.b / 2, o.y + 10); zielOfen = null; bis = g.t + takt; }
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
      let i = dekos.indexOf(C.dekoListe(k.rezept.deko)[C.dekoListe(g.ware.deko).length]);
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
const LAMPE = { x: 92, y: 26 };   // Hängelampe (05.11.: höher - darunter steht jetzt die Bestellung)
const STERN = { x: 166, y: 50 };  // Herrnhuter Stern (leuchtet selbst; 05.11. höher, die Wand ist niedriger)
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
  const kx = 22, ky = Math.min(58, th - 32);   // 05.11.: links unter dem Fenster - rechts davon steht die Bestellung
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
  // Arbeitsplatte (06.11., Nutzer: „noch zu simpel“): Bohlen in drei Holztönen mit Maserung, versetzten
  // Stößen und ein paar Astlöchern - vorher glatte Dielen in einer Farbe
  const BOHLE = ['#c08a52', '#b8824a', '#c8945a'];
  for (let y = th + 5, n = 0; y < H; y += 10, n++) {
    const hb = Math.min(10, H - y);
    r(c, 0, y, W, hb, BOHLE[n % 3]);
    r(c, 0, y, W, 1, '#d8a468'); if (hb > 1) r(c, 0, y + hb - 1, W, 1, '#8a5a30');
    const stoss = Math.floor(hash(n + 70) * 120) + 30;   // Stoß zweier Bretter
    r(c, stoss, y, 1, hb, '#7a4c28'); r(c, stoss + 1, y + 1, 1, hb - 2, '#d0a066');
    for (let k = 0; k < 7; k++) {   // Maserung: dünne, etwas dunklere Striche
      const gx = Math.floor(hash(n * 13 + k) * W), gy = y + 2 + Math.floor(hash(n * 17 + k + 3) * (hb - 4)), gl = 8 + Math.floor(hash(n * 7 + k) * 26);
      r(c, gx, gy, gl, 1, ton(BOHLE[n % 3], -0.08));
    }
    if (hash(n + 90) < 0.45) { const ax = Math.floor(hash(n + 91) * (W - 6)), ay = y + 3; r(c, ax, ay, 4, 2, '#8a5a32'); p(c, ax + 1, ay, '#6a4222'); p(c, ax - 1, ay + 1, ton(BOHLE[n % 3], -0.08)); p(c, ax + 4, ay + 1, ton(BOHLE[n % 3], -0.08)); }
  }
  // Keksdose aus Glas auf der Theke, links (06.11.)
  { const dx = 5, dy = th - 13;
    r(c, dx, dy + 2, 12, 11, '#dfe8ee'); r(c, dx + 1, dy + 3, 10, 9, '#c8d8e2');
    for (const [kx, ky, f] of [[2, 7, '#d89a48'], [6, 8, '#b8743a'], [4, 4, '#e8b060'], [8, 5, '#d89a48']]) { r(c, dx + kx, dy + ky, 3, 2, f); p(c, dx + kx, dy + ky, ton(f, 0.25)); }
    r(c, dx + 1, dy + 3, 1, 8, 'rgba(255,255,255,0.55)');
    r(c, dx - 1, dy, 14, 3, '#c83a32'); r(c, dx - 1, dy, 14, 1, '#e8605a'); r(c, dx + 4, dy - 2, 4, 2, '#a82a24'); }
  // Schmaler Teigstreifen links am Ofen (05.11.: vorher ein großes Brett, auf dem nichts passierte)
  const tg = TEIG();
  r(c, tg.x - 2, tg.y - 2, tg.b + 4, tg.h + 4, '#8a5a30'); r(c, tg.x - 2, tg.y - 2, tg.b + 4, 1, '#b07a44'); r(c, tg.x - 2, tg.y + tg.h + 1, tg.b + 4, 1, '#5a3a1e');
  r(c, tg.x, tg.y, tg.b, tg.h, '#f0dcb0'); r(c, tg.x, tg.y + tg.h - 1, tg.b, 1, '#d8bc88'); r(c, tg.x, tg.y, 1, tg.h, '#e4cc9c'); r(c, tg.x + 1, tg.y, tg.b - 2, 1, '#faecc8');
  for (let i = 0; i < 10; i++) p(c, tg.x + 1 + Math.floor(hash(i + 7) * (tg.b - 2)), tg.y + 1 + Math.floor(hash(i + 17) * (tg.h - 2)), '#fbf4e4');
  r(c, tg.x + 2, tg.y + tg.h + 5, tg.b - 4, 4, '#d8a868'); r(c, tg.x + 2, tg.y + tg.h + 5, tg.b - 4, 1, '#f0c88a');   // Nudelholz
  // Kuchengitter rechts am Ofen: hier liegt das Plätzchen zum Verzieren
  const b = BLECH();
  r(c, b.x - 14, b.y - 2, 28, 12, '#5a5e68'); r(c, b.x - 14, b.y - 2, 28, 1, '#8a8e98');
  for (let x = b.x - 12; x < b.x + 14; x += 3) r(c, x, b.y, 1, 9, '#9aa0aa');
  r(c, b.x - 13, b.y + 4, 26, 1, '#9aa0aa');
  // Unter den Formen ein helles Backbrett, unter den Schalen ein rot-weiß kariertes Geschirrtuch (06.11.)
  const fy0 = FORM_Y() - 18;
  r(c, 1, fy0 + 2, W - 2, 37, 'rgba(60,30,10,0.3)');
  r(c, 0, fy0, W, 36, '#7a4c28'); r(c, 1, fy0 + 1, W - 2, 34, '#dcae72'); r(c, 1, fy0 + 1, W - 2, 1, '#f0c88a');
  for (let k = 0; k < 16; k++) r(c, 2 + Math.floor(hash(k + 600) * (W - 30)), fy0 + 3 + Math.floor(hash(k + 610) * 30), 10 + Math.floor(hash(k + 620) * 18), 1, '#cc9c62');
  const sy0 = SCHALE_Y() - 23, sh = VORSCHAU_DY + 41;
  r(c, 1, sy0 + 2, W - 2, sh, 'rgba(60,30,10,0.3)');
  for (let y = 0; y < sh; y++) for (let x = 0; x < W; x += 1) {
    const a = Math.floor(x / 4) % 2, bb = Math.floor(y / 4) % 2;
    p(c, x, sy0 + y, a && bb ? '#c8483c' : a || bb ? '#e4a092' : '#f6efe6');
  }
  r(c, 0, sy0, W, 1, '#fff8f0');
  for (let x = 1; x < W; x += 2) p(c, x, sy0 + sh, '#e4a092');   // Fransen
  c = ziel;

  // Lichtkarte: dämmriger Grund, helle Inseln - wird über die fertige Szene multipliziert
  lichtKarte = document.createElement('canvas');
  lichtKarte.width = W; lichtKarte.height = H;
  const l = lichtKarte.getContext('2d');
  // 27.10. (gemeldet: nachts schlecht lesbar): Grund nachts heller (vorher #4a3a4e), dazu unten
  // eigenes Arbeitslicht über den beiden Reihen, in denen man tippt
  l.fillStyle = nacht ? '#6a5864' : '#9c887a'; l.fillRect(0, 0, W, H);
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
  insel(W / 2, OFEN().y + OFEN().h / 2, 70, '255,170,110', nacht ? 0.2 : 0.12);   // um den Ofen
  for (const yy of [FORM_Y(), SCHALE_Y() + 8]) {   // (Arbeitslicht)                              // Arbeitslicht über den Tipp-Reihen
    insel(W * 0.25, yy, 70, '255,236,200', nacht ? 0.5 : 0.25);
    insel(W * 0.75, yy, 70, '255,236,200', nacht ? 0.5 : 0.25);
  }
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
  // Schatten auf der Arbeitsplatte (06.11.)
  for (let k = 0; k < 4; k++) { c.fillStyle = `rgba(40,20,10,${(0.3 - k * 0.06).toFixed(2)})`; c.fillRect(o.x - 3 + k * 2, o.y + o.h + 1 + k, o.b + 6 - k * 4, 1); }
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
  // Ofenhandschuh am Haken rechts (06.11.), rot-weiß kariert
  { const hx = o.x + o.b, hy = o.y - 4;
    r(c, hx, hy, 2, 1, '#8a8e98'); p(c, hx + 2, hy + 1, '#8a8e98');
    for (let yy = 0; yy < 9; yy++) for (let xx = 0; xx < 5; xx++) if (!(yy < 2 && xx === 4) && !(yy > 6 && xx === 0)) p(c, hx + 1 + xx, hy + 2 + yy, (xx + (yy >> 1)) % 2 ? '#c83a32' : '#f4ece0');
    r(c, hx + 1, hy + 10, 5, 1, '#8a2a24'); }
  // Griff (Chrom) unter dem Fenster
  r(c, o.x + 6, o.y + o.h - 6, o.b - 12, 2, '#d8dce4'); r(c, o.x + 6, o.y + o.h - 6, o.b - 12, 1, '#ffffff'); p(c, o.x + 6, o.y + o.h - 5, '#8a8e98'); p(c, o.x + o.b - 7, o.y + o.h - 5, '#8a8e98');
  if (drin) {
    // Im goldenen Bereich blinkt der Ofen auf - jetzt tippen!
    const a = Math.min(1, w.ofen / ofenDauer()), [von, bis] = gold(w);
    if (a >= von && a <= bis && Math.floor(t * 8) % 2) { c.strokeStyle = '#ffe060'; c.lineWidth = 1; c.strokeRect(o.x - 1.5, o.y - 9.5, o.b + 3, o.h + 11); }
  }
}
/**
 * Die Backanzeige (05.11., gemeldet: der „gelbe Bereich“ war im schmalen Balken über dem Ofen kaum zu sehen):
 * breit unter dem Ofen, vier Felder in den Farben des Teigs - blass, GOLD (hell, mit Glanz), dunkel und am
 * Ende verbrannt -, darüber wandert ein Zeiger. Im goldenen Feld leuchtet der Rahmen.
 */
function anzeige(t) {
  const an = ANZEIGE(), w = spiel.ware, drin = w && w.phase === 'ofen';
  const [von, bis] = gold(w), x0 = an.x, b = an.b, y = an.y, h = an.h;
  const X = (a) => x0 + Math.round(b * a);
  const a = drin ? Math.min(1, w.ofen / ofenDauer()) : -1, imGold = a >= von && a <= bis;
  r(c, x0 - 2, y - 2, b + 4, h + 4, imGold && Math.floor(t * 8) % 2 ? '#ffe060' : '#8a5e18');   // Messingrahmen
  r(c, x0 - 1, y - 1, b + 2, h + 2, '#c8962c'); r(c, x0 - 1, y - 1, b + 2, 1, '#e8c060');
  r(c, x0, y, X(von) - x0, h, '#ecd09a');
  r(c, X(von), y, X(bis) - X(von), h, '#ffc232');
  r(c, X(von), y, X(bis) - X(von), 2, '#fff0a0');
  for (let k = X(von) + 2; k < X(bis) - 1; k += 5) p(c, k, y + 3 + (k % 3), '#fff8d0');   // Glanzpunkte
  r(c, X(bis), y, X(0.93) - X(bis), h, '#a8662c');
  r(c, X(0.93), y, x0 + b - X(0.93), h, '#3a2a22');
  for (const s of [von, bis, 0.93]) r(c, X(s), y, 1, h, 'rgba(40,20,10,0.55)');   // Trennstriche
  // Kleine Symbole (06.11.): ein Funkelstern mitten im Gold, ein Rauchwölkchen im Verbrannten
  const gm = Math.round((X(von) + X(bis)) / 2), my = y + Math.floor(h / 2);
  p(c, gm, my - 2, '#ffffff'); p(c, gm, my + 2, '#ffffff'); r(c, gm - 2, my, 5, 1, '#ffffff'); r(c, gm - 1, my - 1, 3, 3, '#fff6c0'); p(c, gm, my, '#ffffff');
  const vm = Math.round((X(0.93) + x0 + b) / 2);
  p(c, vm - 1, my + 1, '#8a8a92'); p(c, vm, my, '#a8a8b0'); p(c, vm + 1, my - 1, '#8a8a92'); p(c, vm, my - 2, '#6a6a72');
  if (a >= 0) {
    const m = Math.min(x0 + b - 1, X(a));
    r(c, m - 1, y - 4, 3, 2, '#ffffff'); p(c, m, y - 2, '#ffffff');   // Zeiger: kleines Dreieck
    r(c, m, y - 1, 1, h + 2, '#ffffff'); r(c, m + 1, y - 1, 1, h + 2, 'rgba(40,20,10,0.6)');
  }
}

function blase(k, t) {
  const kx = Math.round(k.x), th = THEKE();
  const bw = 86, bh = 34, bx = kx - 22 - bw, by = th - 50;   // 05.11.: breiter (lange Namen wie „Tannenbäumchen“ ragten heraus)
  r(c, bx, by, bw, bh, '#fffaf0'); r(c, bx, by, bw, 1, '#ffffff'); r(c, bx, by + bh - 1, bw, 1, '#c8b898');
  r(c, bx - 1, by + 1, 1, bh - 2, '#c8b898'); r(c, bx + bw, by + 1, 1, bh - 2, '#c8b898');
  r(c, bx + bw, by + 12, 3, 3, '#fffaf0'); p(c, bx + bw + 3, by + 13, '#fffaf0');
  // Das Wunschplätzchen groß, daneben der Name
  zeichnePlaetzchen(c, bx + 3, by + 3, k.rezept.form, 'golden', k.rezept.deko, 2);
  MH.label('wunsch', bx + 23, by + 3, k.rezept.name, 'wunsch');
  // 05.11.: der Weg dorthin als Bildchen - die Form (Umriss in ihrer Farbe), dann je Verzierung der
  // kleine Lebkuchen wie unter der Schale. Erledigtes wird abgehakt (grün unterstrichen).
  const weg = [{ form: k.rezept.form }, ...C.dekoListe(k.rezept.deko).map((d) => ({ deko: d }))];
  const w = spiel.ware, fertigBis = !w ? 0 : 1 + C.dekoListe(w.deko).length;
  let wx = bx + 23;
  const wy = by + 16;
  weg.forEach((s, i) => {
    if (i) { p(c, wx, wy + 4, '#8a7a6a'); p(c, wx + 1, wy + 3, '#8a7a6a'); p(c, wx + 1, wy + 5, '#8a7a6a'); wx += 4; }
    if (s.form) {
      const m = MASKEN[s.form];
      for (let yy = 0; yy < m.length; yy++) for (let xx = 0; xx < m[0].length; xx++) if (istTeig(m, xx, yy) && (!istTeig(m, xx - 1, yy) || !istTeig(m, xx + 1, yy) || !istTeig(m, xx, yy - 1) || !istTeig(m, xx, yy + 1))) p(c, wx + xx, wy + yy, FORM_FARBE[s.form] || '#8a8e98');
    } else zeichnePlaetzchen(c, wx, wy + 1, 'quadrat', 'dunkel', s.deko, 1);
    if (i < fertigBis) r(c, wx, wy + 9, 9, 1, '#3aa84a');
    wx += 10;
  });
  const anteil = Math.max(0, k.geduld / k.max);
  r(c, bx + 3, by + bh - 5, bw - 6, 3, '#d8ccb8');
  r(c, bx + 3, by + bh - 5, Math.round((bw - 6) * anteil), 3, anteil > 0.5 ? '#5ab04a' : anteil > 0.25 ? '#e8b030' : (Math.floor(t * 6) % 2 ? '#e84a3a' : '#ff8a6a'));
}

// Ausstechformen (12.10. neu): bunt, je Form EINE Farbe als 2 Pixel breites
// Band, oben/links eine Glanzkante, darunter ein harter Schatten aufs
// Backpapier - kein Verlauf mehr (vorher grau, außen dunkel, innen hell).
const FORM_FARBE = { stern: '#e8a820', mond: '#4a8ad8', herz: '#e04848', baum: '#3a9a4a', kreis: '#a060d0' };
/** Eine Kachel unter einer Form bzw. Schale (05.11.): hell, im aktiven Schritt mit goldenem Rand, der atmet. */
function kachel(i, n, y0, h, aktiv, t) {
  const x = slot(i, n), bw = Math.min(40, Math.floor(W / n) - 4), x0 = x - Math.floor(bw / 2);
  // 06.11.: runde Ecken, Licht oben links, Schatten unten rechts - vorher ein flaches Rechteck
  const rund = (f, dx, dy, w, hh) => { r(c, dx + 1, dy, w - 2, hh, f); r(c, dx, dy + 1, w, hh - 2, f); };
  rund('rgba(60,30,10,0.32)', x0 + 1, y0 + 2, bw, h);
  if (aktiv) rund(Math.sin(t * 5) > 0 ? '#ffd24a' : '#e8a820', x0 - 1, y0 - 1, bw + 2, h + 2);   // goldener Rand, atmet
  rund('#c8a878', x0, y0, bw, h);
  rund('#f8efdc', x0 + 1, y0 + 1, bw - 2, h - 2);
  r(c, x0 + 2, y0 + 1, bw - 4, 1, '#fffcf4'); r(c, x0 + 1, y0 + 2, 1, h - 4, '#fffcf4');
  r(c, x0 + 2, y0 + h - 2, bw - 4, 1, '#e4d4b4'); r(c, x0 + bw - 2, y0 + 2, 1, h - 4, '#e4d4b4');
}
function form(i, n, f, aktiv, t) {
  const x = slot(i, n), y = FORM_Y();
  kachel(i, n, y - 14, 29, aktiv, t);
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
function schale(i, n, d, aktiv, t, matt) {
  const x = slot(i, n), y = SCHALE_Y(), f = C.BACK_DEKOS[d].f;
  kachel(i, n, y - 19, VORSCHAU_DY + 33, aktiv, t);
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
  // Vorschau (27.10.): ein viereckiger Lebkuchen mit genau dieser Verzierung, mit kleinem Schatten
  const vy = y + VORSCHAU_DY;
  r(c, x - 8, vy + 2, 18, 13, 'rgba(70,40,20,0.25)');
  zeichnePlaetzchen(c, x - 9, vy, 'quadrat', 'dunkel', d, 2);
  MH.label('schale' + i, x, vy + 15, C.BACK_DEKOS[d].kurz, 'schild' + (matt ? ' matt' : ''));
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
  // Ausgestochene Löcher im Teigstreifen (ein paar fertige Stellen)
  const tg = TEIG();
  for (let i = 0; i < Math.min(4, g.gebacken.length + (g.ware ? 1 : 0)); i++) {
    const hx = tg.x + 2 + (i % 2) * Math.floor(tg.b / 2), hy = tg.y + 2 + Math.floor(i / 2) * 9;
    r(c, hx, hy, 7, 6, '#c89058'); r(c, hx, hy, 7, 1, '#a87444');
  }
  ofen(t);
  anzeige(t);
  // Welcher Schritt ist dran? (05.11.) Danach richten sich Kacheln, Abdunkeln und Schilder
  const wa = g.ware, dran = !k || k.phase !== 'wartet' ? null
    : g.schritt === 'stechen' ? 1 : g.schritt === 'backen' || (wa && (wa.phase === 'rutscht' || wa.phase === 'rein')) ? 2
    : g.schritt === 'verzieren' || (wa && wa.phase === 'raus') ? 3 : null;
  formen.forEach((f, i) => form(i, formen.length, f, dran === 1, t));
  dekos.forEach((d, i) => schale(i, dekos.length, d, dran === 3, t, dran && dran !== 3));
  // Dampf über dem Ofen, solange gebacken wird (06.11.)
  if (wa && wa.phase === 'ofen') for (let k = 0; k < 4; k++) {
    const ph = (t * 0.7 + k / 4) % 1, o2 = OFEN();
    const dx = Math.round(o2.x + o2.b / 2 - 10 + k * 7 + Math.sin(t * 2 + k) * 2), dy = Math.round(o2.y - 10 - ph * 16);
    c.fillStyle = `rgba(255,250,240,${(0.38 * (1 - ph)).toFixed(2)})`; c.fillRect(dx, dy, 3 + Math.round(ph * 2), 2);
  }
  // Mehlstaub, der beim Ausstechen vom Teig aufsteigt
  for (const s of g.staub) { const a = s.t / 0.8; c.fillStyle = `rgba(255,252,244,${(0.8 * (1 - a)).toFixed(2)})`; c.fillRect(Math.round(s.x + s.vx * s.t), Math.round(s.y - s.t * 10), 1, 1); }
  // Stempel-Bewegung über dem Teig
  if (g.stich) { const a = g.stich.t / 0.25; const sx = tg.x + Math.round(tg.b / 2) - 4, sy = tg.y + 4 - Math.round(Math.sin(a * Math.PI) * 6); zeichnePlaetzchen(c, sx, sy, g.stich.form, 'roh', null, 1); }
  // Das Plätzchen selbst (im Ofen hinter der Scheibe: nur als Schatten)
  const w = g.ware;
  if (w && w.phase !== 'ofen') zeichnePlaetzchen(c, Math.round(w.x), Math.round(w.y), w.form, w.grad, w.deko, w.phase === 'liegt' || w.phase === 'fliegt' ? 2 : 1);
  else if (w) { const o = OFEN(); zeichnePlaetzchen(c, o.x + o.b / 2 - 9, o.y + o.h - 30, w.form, w.grad, null, 2); }   // auf dem Rost
  // Rauch beim Verbrennen
  for (const s of g.rauch) if (s.t > 0) { const a = s.t / 1.2; c.fillStyle = `rgba(70,70,76,${(0.7 * (1 - a)).toFixed(2)})`; c.fillRect(Math.round(s.x + Math.sin(s.t * 6) * 2), Math.round(s.y - a * 24), 3 + Math.round(a * 3), 3 + Math.round(a * 3)); }
  // Licht (12.10.): die ganze Szene mit der Lichtkarte multiplizieren - dämmrig,
  // mit hellen Inseln -, danach leuchten die Quellen selbst darüber
  c.save(); c.globalCompositeOperation = 'multiply'; c.drawImage(lichtKarte, 0, 0); c.restore();
  lichter(t, nacht);
  if (w && w.phase === 'ofen') { const o = OFEN(), fl = Math.sin(t * 9) * 0.5 + 0.5; schein(c, o.x + o.b / 2, o.y + o.h / 2 - 3, 56, '255,140,60', (nacht ? 0.42 : 0.3) + fl * 0.06); }
  // Was gerade NICHT dran ist, wird abgedunkelt (05.11.) - so sieht man ohne Lesen, wo man tippen muss
  const o = OFEN(), an = ANZEIGE(), fy = FORM_Y(), sy = SCHALE_Y();
  if (dran) {
    c.fillStyle = 'rgba(30,18,10,0.42)';
    if (dran !== 2) c.fillRect(0, o.y - 10, W, an.y + an.h + 3 - (o.y - 10));
    if (dran !== 1) c.fillRect(0, fy - 16, W, 32);
    if (dran !== 3) c.fillRect(0, sy - 21, W, VORSCHAU_DY + 37);
  }
  // Die drei Schritte als Schilder, der aktive golden (Text in styles.css: .mh-label.schritt)
  const zweiter = dran === 3 && C.dekoListe(wa && wa.deko).length ? C.BACK_DEKOS[C.dekoListe(k.rezept.deko)[C.dekoListe(wa.deko).length]] : null;
  const schild = (n, x, y, text) => MH.label('schritt' + n, x, y, g.t < 0 || g.aus ? null : `<b>${n}</b> ${text}`, 'schritt' + (dran === n ? ' aktiv' : ''));
  schild(1, W / 2, fy - 22, 'AUSSTECHEN');
  schild(2, W / 2, o.y - 21, dran === 2 ? 'BACKEN - im GOLD tippen!' : 'BACKEN');
  schild(3, W / 2, sy - 27, zweiter ? `JETZT NOCH ${zweiter.kurz}!` : 'VERZIEREN');
  const uebt = k && k.uebung && k.phase === 'wartet';
  MH.hinweis(g.t < 0 ? `${stufe.special ? 'SPECIAL: ' + C.SPECIAL_TEXT.back : 'Schwierigkeit: ' + stufe.name}` : uebt && !g.aus ? 'Übungsplätzchen - die Zeit läuft erst danach' : null);
  for (const f of g.fehl) { const a = f.t / 0.3; c.fillStyle = `rgba(200,80,60,${1 - a})`; c.fillRect(Math.round(f.x - 2), Math.round(f.y), 5, 1); c.fillRect(Math.round(f.x), Math.round(f.y - 2), 1, 5); }
  for (const x of g.texte) if (!x.gezeigt) { x.gezeigt = true; MH.schwebe(x.x, x.y, x.text, x.farbe, x.text.length > 6 ? 0.8 : 1.1); }
  const rest = Math.max(0, Math.ceil(C.BACK_DAUER - Math.max(0, g.t)));
  MH.setzeKopf({ zeit: rest, knapp: rest <= 5 && g.t >= 0, kette: g.kette, ketteAnteil: g.kette > 1 ? 1 : 0, punkte: g.punkte });
  MH.mitte(g.aus ? 'ZEIT UM!' : g.t < 0 ? String(Math.ceil(-g.t)) : g.t < 0.6 ? 'LOS!' : null, g.t < 0 && !g.aus ? '#ffffff' : '#ffe27a');
}
