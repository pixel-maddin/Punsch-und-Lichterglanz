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
import * as C from './config.js?v=202610121227';
import * as Z from './zeit.js?v=202610121227';
import * as T from './ton.js?v=202610121227';
import * as MH from './minihud.js?v=202610121227';
import { r, p, ton, figurGross, neueFarben } from './pixel.js?v=202610121227';

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
      g.texte.push({ x: slot(i, formen.length), y: fy - 18, text: 'NEIN!', farbe: '#ff7a6a', t: 0 });
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
      const [gv, gb] = gold(w);
      w.grad = a < Math.min(0.3, gv - 0.06) ? 'roh' : a < gv ? 'blass' : a <= gb ? 'golden' : 'dunkel';
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

/** Weiches Licht (additiv): warme Lampen, Kerzen, Ofenglut. */
function schein(ctx, x, y, rad, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.45, `rgba(${rgb},${(a * 0.4).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2); ctx.restore();
}
// Wo die Lichter hängen (für das Funkeln in zeichne())
const LAMPE = { x: 148, y: 60 };   // über dem Ofen (oben rechts lag sie unter der Kopfzeile)
const KERZEN = [[16, 34], [20, 32], [25, 31], [30, 32], [34, 34]];   // Schwibbogen auf dem Fensterbrett
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
  // Kachelwand, warm
  r(c, 0, 0, W, th, '#f2e2c4');
  for (let y = 0; y < th; y += 8) { r(c, 0, y, W, 1, '#e0caa4'); for (let x = (y / 8) % 2 ? 4 : 0; x < W; x += 8) r(c, x, y, 1, 8, '#e0caa4'); }
  for (let y = 1; y < th; y += 8) for (let x = ((y - 1) / 8) % 2 ? 5 : 1; x < W; x += 8) p(c, x, y, '#fbf2e0');   // Glanz auf jeder Kachel
  // Zierkacheln (blau-weiß)
  for (let i = 0; i < 9; i++) {
    const kx = 8 + Math.floor(hash(i + 60) * 20) * 8, ky = 40 + Math.floor(hash(i + 70) * 6) * 8;
    if (ky + 8 > th - 18 || (kx > 50 && kx < 128 && ky < 56) || (kx > 120)) continue;
    r(c, kx + 1, ky + 1, 7, 7, '#e8eef6'); p(c, kx + 4, ky + 2, '#3a6ab8'); p(c, kx + 3, ky + 4, '#3a6ab8'); p(c, kx + 5, ky + 4, '#3a6ab8'); p(c, kx + 4, ky + 6, '#3a6ab8'); p(c, kx + 4, ky + 4, '#e8c030');
  }
  // Holzvertäfelung unten an der Wand
  r(c, 0, th - 16, W, 16, '#a8703a'); r(c, 0, th - 16, W, 2, '#7a4a22'); r(c, 0, th - 14, W, 1, '#c88a4e');
  for (let x = 0; x < W; x += 12) { r(c, x, th - 13, 1, 13, '#8a5a2e'); r(c, x + 1, th - 13, 1, 13, '#bc8048'); }
  // Fenster mit Himmel, Vorhängen und Schwibbogen
  const fx = 10, fy = 10, fb = 30, fh = 22;
  r(c, fx - 2, fy - 2, fb + 4, fh + 4, '#7a4c28'); r(c, fx - 2, fy - 2, fb + 4, 1, '#9a6a3a');
  const himmel = nacht ? ['#101640', '#1e2858', '#2a3466'] : ['#8cb4dc', '#a8c8e6', '#c8dcee'];
  for (let y = 0; y < fh; y++) r(c, fx, fy + y, fb, 1, himmel[Math.min(2, Math.floor(y / fh * 3))]);
  if (nacht) { for (let i = 0; i < 9; i++) p(c, fx + Math.floor(hash(i) * fb), fy + Math.floor(hash(i + 9) * fh * 0.6), '#fff4d0'); r(c, fx + 22, fy + 3, 3, 3, '#f4ecc8'); p(c, fx + 23, fy + 3, '#2a3466'); }
  if (Z.schnee() > 0) {
    r(c, fx, fy + fh - 4, fb, 4, '#f4f8fc');
    for (let x = 0; x < fb; x += 4) { const h = 2 + Math.floor(hash(x + 31) * 3); r(c, fx + x, fy + fh - 4 - h, 3, h, nacht ? '#3a4a78' : '#d8e2ee'); }   // Dächer in der Ferne
    for (let i = 0; i < 10; i++) p(c, fx + Math.floor(hash(i + 3) * fb), fy + Math.floor(hash(i + 5) * (fh - 4)), '#ffffff');
    // Frost in den Ecken
    for (const [ex, ey, dx, dy] of [[fx, fy, 1, 1], [fx + fb - 1, fy, -1, 1]]) for (let k = 0; k < 4; k++) { p(c, ex + dx * k, ey, '#e8f2fc'); p(c, ex, ey + dy * k, '#e8f2fc'); p(c, ex + dx, ey + dy, '#ffffff'); }
  }
  r(c, fx + fb / 2, fy, 1, fh, '#7a4c28'); r(c, fx, fy + fh / 2, fb, 1, '#7a4c28');
  r(c, fx - 4, fy + fh + 2, fb + 8, 3, '#8a5a32'); r(c, fx - 4, fy + fh + 2, fb + 8, 1, '#b07a44');   // Fensterbrett
  // Vorhänge rot-weiß kariert, gerafft
  for (const [vx, rechts] of [[fx - 6, false], [fx + fb + 1, true]]) {
    for (let y = 0; y < fh + 2; y++) {
      const w = y < 12 ? 5 : y < 16 ? 3 : 4 + (y - 16 > 2 ? 1 : 0);
      for (let i = 0; i < w; i++) {
        const xx = rechts ? vx + i : vx + 5 - w + i;
        p(c, xx, fy - 3 + y, ((xx >> 1) + ((fy - 3 + y) >> 1)) % 2 ? '#d83a3a' : '#f4ece0');
      }
    }
    r(c, rechts ? vx : vx + 1, fy + 10, 5, 1, '#a82020');   // Raffband
  }
  r(c, fx - 7, fy - 4, fb + 14, 2, '#6a4222');   // Gardinenstange
  // Schwibbogen (Kerzen-Bogen) auf dem Fensterbrett
  for (let k = 0; k <= 20; k++) { const bx = 14 + k, by = 36 - Math.round(Math.sin(k / 20 * Math.PI) * 6); p(c, bx, by, '#3a2414'); p(c, bx, by + 1, '#5a3a22'); }
  r(c, 13, 36, 23, 1, '#3a2414');
  for (const [kx, ky] of KERZEN) r(c, kx, ky - 3, 1, 3, '#f4f0e0');
  // Regal mit Gläsern, Keksdose und Windlicht
  r(c, 52, 26, 74, 2, '#8a5a32'); r(c, 52, 26, 74, 1, '#b07a44'); r(c, 54, 28, 2, 4, '#6a4222'); r(c, 122, 28, 2, 4, '#6a4222');
  const GL = ['#e8b030', '#c8283a', '#8a5a2a', '#f4f0e8', '#5aa84a', '#e8c890'];
  for (let i = 0; i < 6; i++) {
    const gx = 56 + i * 11;
    r(c, gx, 16, 8, 10, '#d8e8f0'); r(c, gx + 1, 19, 6, 7, GL[i]); r(c, gx, 15, 8, 2, '#a8763e'); r(c, gx + 1, 15, 6, 1, '#c8945a');
    r(c, gx + 2, 21, 4, 2, '#f8f2e4'); p(c, gx + 1, 17, '#ffffff'); r(c, gx + 1, 18, 1, 6, 'rgba(255,255,255,0.5)');   // Etikett, Glanz
  }
  // Mehlsack neben dem Regal, Brezel-Schild
  r(c, 130, 16, 10, 10, '#e8e0cc'); r(c, 131, 14, 8, 2, '#d8ccb0'); r(c, 133, 13, 4, 1, '#c8b898'); r(c, 132, 19, 6, 3, '#c8a878'); p(c, 134, 20, '#f4ecd8');
  r(c, 160, 4, 1, 6, '#5a3a22'); r(c, 153, 10, 16, 14, '#c8902c'); r(c, 153, 10, 16, 1, '#e0a840'); r(c, 153, 23, 16, 1, '#8a6018');
  for (const [dx, dy] of [[2, 2], [3, 1], [4, 1], [5, 2], [6, 3], [7, 2], [8, 1], [9, 1], [10, 2], [11, 3], [11, 5], [10, 7], [9, 8], [7, 8], [6, 7], [5, 5], [6, 4], [8, 5], [9, 6], [4, 4], [3, 5], [3, 7], [4, 8], [2, 4]]) p(c, 154 + dx, 11 + dy, '#6a3a12');
  // Hängelampe (Kabel von der Decke, Messingschirm)
  r(c, LAMPE.x, 0, 1, LAMPE.y - 5, '#3a2a20');
  // Wanduhr, gerahmtes Bild, Strohsterne an Fäden
  const ux = 30, uy = 66;
  for (let dy = -6; dy <= 6; dy++) { const w = Math.round(Math.sqrt(36 - dy * dy)); r(c, ux - w, uy + dy, w * 2 + 1, 1, Math.abs(dy) === 6 || w < 2 ? '#7a4c28' : '#fbf6e8'); p(c, ux - w, uy + dy, '#7a4c28'); p(c, ux + w, uy + dy, '#7a4c28'); }
  for (const [dx, dy] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) p(c, ux + dx, uy + dy, '#5a3a22');
  r(c, ux, uy - 3, 1, 3, '#2a1a10'); r(c, ux + 1, uy, 2, 1, '#2a1a10'); p(c, ux, uy, '#c83a3a');
  r(c, ux - 1, uy + 7, 3, 6, '#b8862a'); r(c, ux - 2, uy + 12, 5, 2, '#d8a838');   // Pendel
  const bx0 = 88, by0 = 58;
  r(c, bx0, by0, 22, 17, '#8a5a32'); r(c, bx0, by0, 22, 1, '#b07a44'); r(c, bx0 + 2, by0 + 2, 18, 13, '#1e2858');
  for (let i = 0; i < 6; i++) p(c, bx0 + 3 + Math.floor(hash(i + 400) * 16), by0 + 3 + Math.floor(hash(i + 410) * 6), '#fff4d0');
  r(c, bx0 + 2, by0 + 12, 18, 3, '#eef3fa'); r(c, bx0 + 7, by0 + 7, 8, 5, '#c8392f'); for (let k = 0; k < 4; k++) r(c, bx0 + 7 + k, by0 + 6 - k, 8 - k * 2, 1, '#eef3fa');
  p(c, bx0 + 9, by0 + 9, '#ffd060'); p(c, bx0 + 12, by0 + 9, '#ffd060'); p(c, bx0 + 4, by0 + 11, '#2f6a2a'); p(c, bx0 + 4, by0 + 10, '#2f6a2a');   // Haus im Bild
  r(c, bx0 + 10, by0 - 4, 1, 4, '#8a7a5a'); p(c, bx0 + 10, by0 - 5, '#5a5a62');
  for (const [sx, sy, oben] of [[49, 48, 6], [118, 66, 35], [70, 76, 35]]) {   // am Girlandenseil bzw. an der Hakenleiste
    r(c, sx, oben, 1, sy - oben - 3, 'rgba(120,90,60,0.5)');
    const f = '#e8c060', d = '#b8902a';
    for (let k = -3; k <= 3; k++) { p(c, sx + k, sy, f); p(c, sx, sy + k, f); }
    for (let k = -2; k <= 2; k++) { p(c, sx + k, sy + k, d); p(c, sx + k, sy - k, d); }
    p(c, sx, sy, '#fff0a0');
  }
  r(c, LAMPE.x - 5, LAMPE.y - 5, 11, 1, '#b8862a'); r(c, LAMPE.x - 6, LAMPE.y - 4, 13, 2, '#d8a838'); r(c, LAMPE.x - 7, LAMPE.y - 2, 15, 1, '#a87420');
  r(c, LAMPE.x - 2, LAMPE.y - 1, 5, 2, '#fff4c0'); p(c, LAMPE.x, LAMPE.y, '#ffffff');
  // Lichterkette (Girlande) oben
  for (let x = 0; x < W; x++) {
    const y = 2 + Math.round(Math.sin((x % 30) / 30 * Math.PI) * 4);
    p(c, x, y, x % 2 ? '#2f6a2a' : '#3f8a3a'); p(c, x, y + 1, '#245224');
    if (x % 30 === 0) { r(c, x - 1, y - 1, 3, 2, '#d83a3a'); p(c, x - 1, y + 1, '#a82020'); p(c, x + 1, y + 1, '#a82020'); }
  }
  // Hakenleiste mit Kochgeschirr, Rezeptzettel
  r(c, 56, 34, 64, 1, '#8a8e98'); r(c, 56, 33, 64, 1, '#b8bcc4');
  for (const [hx, art] of [[62, 'kelle'], [76, 'besen'], [90, 'loeffel'], [104, 'sieb']]) {
    r(c, hx, 35, 1, 2, '#5a5a62');
    if (art === 'kelle') { r(c, hx, 37, 1, 9, '#b8bcc4'); r(c, hx - 2, 46, 5, 3, '#a8acb6'); r(c, hx - 1, 46, 3, 1, '#d8dce4'); }
    if (art === 'besen') { r(c, hx, 37, 1, 6, '#8a5a32'); for (let k = -2; k <= 2; k++) { r(c, hx + k, 43, 1, 6 - Math.abs(k), '#c8ccd4'); } }
    if (art === 'loeffel') { r(c, hx, 37, 1, 9, '#c8905a'); r(c, hx - 1, 46, 3, 3, '#b07a44'); }
    if (art === 'sieb') { r(c, hx, 37, 1, 4, '#8a8e98'); r(c, hx - 4, 41, 9, 5, '#8a8e98'); r(c, hx - 3, 42, 7, 3, '#c8ccd4'); for (let k = -3; k <= 3; k += 2) p(c, hx + k, 43, '#8a8e98'); }
  }
  r(c, 124, 36, 14, 17, '#fbf6e8'); r(c, 130, 35, 2, 2, '#d83a3a'); r(c, 125, 52, 13, 1, '#d8ccb0');
  for (let k = 0; k < 5; k++) r(c, 126, 39 + k * 3, k % 2 ? 8 : 10, 1, '#a89878');
  // Topflappen am Haken links vom Ofen
  const o = OFEN(), lx = o.x - 12, ly = th - 15;
  r(c, lx + 3, ly - 2, 1, 2, '#5a5a62');
  for (let y = 0; y < 9; y++) for (let x = 0; x < 6; x++) p(c, lx + x, ly + y, (x + y) % 3 ? '#c83a3a' : '#f4ece0');
  r(c, lx, ly + 9, 6, 1, '#8a2020');
  // Theke vorn
  r(c, 0, th, W, 5, '#a8703a'); r(c, 0, th, W, 1, '#c8905a'); r(c, 0, th + 4, W, 1, '#6a4222');
  // Arbeitstisch (Holzdielen mit Maserung)
  r(c, 0, th + 5, W, H - th - 5, '#c89058');
  for (let y = th + 8; y < H; y += 7) { r(c, 0, y, W, 1, '#a8703c'); r(c, 0, y + 1, W, 1, '#d4a068'); }
  for (let i = 0; i < 40; i++) p(c, Math.floor(hash(i + 40) * W), th + 6 + Math.floor(hash(i + 80) * (H - th - 6)), '#b07a44');
  for (let i = 0; i < 7; i++) {
    const ax = Math.floor(hash(i + 120) * (W - 10)) + 5, ay = th + 9 + Math.floor(hash(i + 130) * (H - th - 14));
    r(c, ax - 2, ay, 5, 2, '#a06a36'); p(c, ax, ay, '#7a4a22'); r(c, ax - 5, ay - 1, 3, 1, '#b8834c'); r(c, ax + 3, ay + 2, 4, 1, '#b8834c');
  }
  for (let i = 0; i < 30; i++) p(c, Math.floor(hash(i + 150) * W), th + 6 + Math.floor(hash(i + 160) * (H - th - 6)), '#ead8b8');
  // Schneidbrett mit ausgerolltem Teig
  const ty = Math.round(H * 0.42), tb = 70, tH = Math.round(H * 0.13);
  r(c, 3, ty - 3, tb + 6, tH + 6, '#9a6434'); r(c, 3, ty - 3, tb + 6, 1, '#c8905a'); r(c, 3, ty + tH + 2, tb + 6, 1, '#6a4222');
  r(c, tb + 6, ty + tH / 2 - 2, 3, 4, '#c89058');   // Griffloch
  r(c, 6, ty, tb, tH, '#f0dcb0'); r(c, 6, ty + tH - 1, tb, 1, '#d8bc88'); r(c, 6, ty, 1, tH, '#e4cc9c'); r(c, 7, ty, tb - 2, 1, '#faecc8');
  for (let i = 0; i < 24; i++) p(c, 7 + Math.floor(hash(i + 7) * (tb - 2)), ty + 1 + Math.floor(hash(i + 17) * (tH - 2)), '#fbf4e4');
  // Nudelholz mit Griffen
  const ny = ty + tH + 5;
  r(c, 12, ny, 42, 5, '#d8a868'); r(c, 12, ny, 42, 1, '#f0c88a'); r(c, 12, ny + 4, 42, 1, '#b07a44'); r(c, 14, ny + 1, 38, 1, '#ecc080');
  for (const gx of [4, 55]) { r(c, gx, ny + 1, 7, 3, '#8a5a32'); r(c, gx, ny + 1, 7, 1, '#a8703a'); p(c, gx === 4 ? 4 : 61, ny + 2, '#6a4222'); }
  // Eier, Mehlhäufchen und Streusel zwischen Nudelholz und Formen
  const ey = ny + 9;
  if (ey + 6 < FORM_Y() - 14) {
    for (const ex of [68, 74]) { r(c, ex, ey, 4, 5, '#f4ead8'); r(c, ex + 1, ey - 1, 2, 1, '#f4ead8'); p(c, ex, ey, '#ffffff'); r(c, ex, ey + 4, 4, 1, '#d8c8a8'); }
    for (let k = 0; k < 4; k++) r(c, 84 + k, ey + 4 - k, 10 - k * 2, 1, k % 2 ? '#f4f0e6' : '#fbf8f2');
    for (let i = 0; i < 8; i++) p(c, 100 + Math.floor(hash(i + 200) * 22), ey + Math.floor(hash(i + 210) * 6), ['#ff5a5a', '#ffe060', '#5ad0ff', '#7ae07a'][i % 4]);
  }
  // Backblech mit Backpapier
  const b = BLECH();
  r(c, b.x - 16, b.y - 7, 32, 14, '#5a5e68'); r(c, b.x - 16, b.y - 7, 32, 1, '#8a8e98'); r(c, b.x - 16, b.y + 6, 32, 1, '#3a3e48');
  r(c, b.x - 14, b.y - 5, 28, 10, '#f4ecd8'); r(c, b.x - 14, b.y - 5, 28, 1, '#fffaf0'); p(c, b.x + 12, b.y + 3, '#e0d4b8'); p(c, b.x - 10, b.y + 2, '#e0d4b8');
  // Backpapier für die Ausstechformen, kariertes Tuch für die Schalen
  const fy0 = FORM_Y() - 13;
  r(c, 2, fy0, W - 4, 26, '#f6efe0'); r(c, 2, fy0 + 26, W - 4, 1, 'rgba(60,30,10,0.35)'); r(c, 2, fy0, W - 4, 1, '#fffaf2');
  for (let i = 0; i < 40; i++) p(c, 3 + Math.floor(hash(i + 300) * (W - 6)), fy0 + 1 + Math.floor(hash(i + 310) * 24), '#ffffff');   // Mehlstaub
  for (let i = 0; i < 12; i++) p(c, 3 + Math.floor(hash(i + 320) * (W - 6)), fy0 + 1 + Math.floor(hash(i + 330) * 24), '#e8dcc4');
  const sy0 = SCHALE_Y() - 13;
  for (let y = 0; y < 26; y++) for (let x = 2; x < W - 2; x++) {
    const a = (x >> 2) % 2, bq = ((y + 1) >> 2) % 2;
    p(c, x, sy0 + y, a && bq ? '#c84848' : a || bq ? '#e8b0a8' : '#f6eee6');
  }
  r(c, 2, sy0 + 26, W - 4, 1, 'rgba(60,30,10,0.35)');
  // Licht: Abends dunkler, dann die Lampe warm darüber; tagsüber kühles Fensterlicht
  if (nacht) { c.fillStyle = 'rgba(60,30,50,0.2)'; c.fillRect(0, 0, W, H); }
  schein(c, LAMPE.x, LAMPE.y + 2, 130, '255,186,100', nacht ? 0.34 : 0.18);
  schein(c, LAMPE.x - 30, H * 0.5, 100, '255,170,90', nacht ? 0.16 : 0.07);   // Lichtfleck auf dem Tisch
  schein(c, 60, H * 0.35, 120, '255,200,140', nacht ? 0.08 : 0.05);   // Grundwärme
  if (!nacht) schein(c, 25, 22, 60, '200,225,255', 0.18);
  schein(c, 25, 33, 26, '255,190,100', nacht ? 0.35 : 0.12);   // Schwibbogen
  // Weiche dunkle Ecken (gemütlich, lenkt den Blick zur Mitte)
  const v = c.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, H * 0.85);
  v.addColorStop(0, 'rgba(40,20,10,0)'); v.addColorStop(1, `rgba(50,24,10,${nacht ? 0.3 : 0.18})`);
  c.fillStyle = v; c.fillRect(0, 0, W, H);
  c = ziel;
}

/** Was flackert und funkelt (jedes Bild): Kerzen, Lichterkette, Windlicht. */
function lichter(t, nacht) {
  for (const [kx, ky] of KERZEN) {
    const fl = Math.sin(t * 9 + kx) > 0 ? 1 : 0;
    p(c, kx, ky - 4, '#ffd040'); p(c, kx, ky - 5 - fl, '#fff4b0'); p(c, kx + (fl ? 0 : 1) - 0, ky - 5, '#ff9a30');
    schein(c, kx, ky - 5, 6, '255,200,110', (nacht ? 0.35 : 0.15) + fl * 0.05);
  }
  for (let x = 3; x < W; x += 6) {
    if (x % 30 === 0) continue;
    const y = 2 + Math.round(Math.sin((x % 30) / 30 * Math.PI) * 4) + 2;
    const f = ['#ffe060', '#ff6a6a', '#8ad0ff', '#9aff8a'][(x / 6 | 0) % 4];
    const an = Math.sin(t * 2.2 + x * 0.7) > -0.6;
    p(c, x, y, an ? f : ton(f, -0.45));
    if (an) schein(c, x, y, 5, f === '#ffe060' ? '255,224,96' : f === '#ff6a6a' ? '255,106,106' : f === '#8ad0ff' ? '138,208,255' : '154,255,138', nacht ? 0.35 : 0.15);
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
    // Glut strahlt in die Küche
    schein(c, fx + fb / 2, fy + fh / 2, 46, '255,140,60', (nacht ? 0.32 : 0.18) + fl * 0.05);
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
  lichter(t, nacht);
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
