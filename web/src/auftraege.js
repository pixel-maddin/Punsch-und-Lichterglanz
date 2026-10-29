/*
 * auftraege.js - drei Tagesaufträge: leicht, mittel, schwer.
 *
 * Jeden Tag neu (aus dem Datum gewürfelt, also für alle Spieler an einem
 * Tag gleich). Gezählt wird, was man SELBST am Tresen tut - ab der Aufsicht
 * (17.10.) auch, was die Wichtel bedienen, während man da ist.
 *
 * Dazu die Bitten der Stammgäste (17.10., C.STAMM_BITTEN): eine am Tag,
 * von einem Stammgast, den man schon kennt, ohne Frist.
 *
 * Lohn in „Minuten normaler Einnahmen" - am Anfang wenige, mit jedem
 * Advent mehr (C.AUFTRAG_LOHN_MIN). Der schwere Auftrag bringt dazu ein Sammelstück, das
 * es nur hier gibt (C.AUFTRAG_DEKO), solange noch eins fehlt.
 */
import * as C from './config.js?v=202610291630';
import * as S from './spiel.js?v=202610291630';
import * as Z from './zeit.js?v=202610291630';

// Welche Aufträge es gibt. `geht()` sagt, ob er heute möglich ist.
const TYPEN = {
  bediene:  { stufen: [25, 50, 90],  text: (n) => `Bediene ${n} Gäste` },
  produkt:  { stufen: [8, 15, 25],   text: (n, p) => `Verkaufe ${n} × ${C.PRODUKT[p].name}`, geht: () => S.produkteFrei().length > 1 },
  kinder:   { stufen: [5, 10, 18],   text: (n) => `Bediene ${n} Kinder`, geht: () => S.hat('kinderpunsch') },
  omas:     { stufen: [4, 8, 14],    text: (n) => `Bediene ${n} Omas und Opas` },
  eilig:    { stufen: [2, 4, 7],     text: (n) => `Bediene ${n} eilige Gäste`, geht: () => S.st.stats.bedient >= 30 },
  // 26.10.: nicht unter Aufsicht - dann bedienen die Wichtel die normalen Gäste, Schwung baut man kaum auf
  schwung:  { stufen: [1, 1, 3],     text: (n) => n > 1 ? `Erreiche ${n}-mal vollen Schwung` : 'Erreiche vollen Schwung (40 % mehr Sterne)', geht: () => !S.aufsicht() },
  spezial:  { stufen: [1, 1, 2],     text: (n) => n > 1 ? `Bediene ${n} besondere Gäste` : 'Bediene einen besonderen Gast' },
  stoss:    { stufen: [3, 5, 6],     text: (n) => `Bediene ${n} Gäste einer Stoßzeit` },
  gold:     { stufen: [3, 6, 10],    text: (n) => `Bediene ${n} goldene Gäste`, geht: () => S.aufsicht() },
};
const LEICHT = ['bediene', 'produkt', 'kinder', 'omas'];
const MITTEL = ['bediene', 'produkt', 'kinder', 'omas', 'eilig', 'schwung', 'stoss', 'gold'];
const SCHWER = ['bediene', 'produkt', 'eilig', 'schwung', 'spezial', 'stoss', 'gold'];

// 26.10. (Testbericht): vorher `n * 1103515245` in normaler Zahl - das liegt über 2^53, die unteren
// Bits gingen verloren, und der erste Wert hatte nur 8 Stufen (leichte Aufträge fast nur „Bediene"
// und „Kinder", „Verkaufe" fast immer dieselbe Sorte). Jetzt mulberry32 mit Math.imul (32 Bit genau).
function zufall(seed) {
  let n = seed >>> 0;
  return () => {
    n = (n + 0x6d2b79f5) >>> 0;
    let t = Math.imul(n ^ (n >>> 15), n | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Einnahmen je Minute, grob: damit der Lohn mit dem Spiel mitwächst. */
function proMinute() { return S.einnahmenProMinute(); }
/** Minuten je Schwierigkeit: wächst mit den Adventssonntagen. */
function lohnMinuten(stufe) {
  const zeile = C.AUFTRAG_LOHN_MIN[Math.min(C.AUFTRAG_LOHN_MIN.length - 1, Z.adventKerzen())];
  return zeile[stufe];
}

function erzeuge(tag) {
  const z = zufall([...tag].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) | 0, 7));
  const liste = [];
  const benutzt = new Set();
  [LEICHT, MITTEL, SCHWER].forEach((pool, stufe) => {
    const moeglich = pool.filter((t) => !benutzt.has(t) && (!TYPEN[t].geht || TYPEN[t].geht()));
    const typ = moeglich[Math.floor(z() * moeglich.length)] || 'bediene';
    benutzt.add(typ);
    let param = null;
    // 26.10. (Testbericht): nur Sorten aus dem Angebot - vorher aus allem Gekauften, und Neues
    // verdrängt das Günstigste von selbst: „Verkaufe 15 × Sternenpunsch" war dann nicht zu schaffen
    if (typ === 'produkt') { const frei = S.produkteFrei().filter((p) => p.art !== 'platte'); param = frei[Math.floor(z() * frei.length)].id; }
    liste.push({ typ, param, ziel: TYPEN[typ].stufen[stufe], stand: 0, stufe, lohn: Math.max(20, S.zehner(proMinute() * lohnMinuten(stufe))), abgeholt: false });
  });
  return { tag, liste };
}

/** Heutige Aufträge (legt sie bei Bedarf an). */
export function heute() {
  const tag = Z.tagesSchluessel();
  if (!S.st.auftraege || S.st.auftraege.tag !== tag) { S.st.auftraege = erzeuge(tag); S.speichere(); }
  return S.st.auftraege.liste;
}
export function text(a) { return TYPEN[a.typ].text(a.ziel, a.param); }
export function fertig(a) { return a.stand >= a.ziel; }
export function abholbar() {
  if (S.st.lernen < 99) return 0;
  const b = bitte();
  const brief = S.st.briefe && S.st.briefe.aktiv;   // Dankeschön im Briefkasten zählt mit (22.10.)
  return heute().filter((a) => fertig(a) && !a.abgeholt).length + (b && bitteFertig(b) && !b.abgeholt ? 1 : 0) + (brief && brief.dank ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Bitten der Stammgäste (17.10.)
// S.st.bitte = { gast, i, start, tag, abgeholt } - die laufende (oder heute
// schon erledigte) Bitte; S.st.bittenStand[gast] = wie viele erledigt sind.
// Gezählt wird wie bei den Wunschzetteln: Zählerstand beim Anlegen merken.
// ---------------------------------------------------------------------------
export const MINI_NAME = { lichtung: 'Waldlichtung', baum: 'Christbaumverkauf', back: 'Backstube', eis: 'Eisbahn', berg: 'Schlittenberg', schnee: 'Schneeballwiese' };
const karteDa = () => !!(S.st.tipps && S.st.tipps.karte_mehr);
function bitteGeht(d) {
  if (d.art === 'getraenk') return S.hat(d.p);
  if (d.art === 'backen') return karteDa() && S.miniOffen('back');
  if (d.art === 'mini') return karteDa() && S.miniOffen(d.spiel);
  if (d.art === 'futter') return S.hat('futterhaus');
  if (d.art === 'santa') return karteDa() && S.einstieg('santa');
  if (d.art === 'gold') return S.aufsicht();
  return false;
}
function bitteZaehler(d) {
  const s = S.st.stats;
  if (d.art === 'getraenk') return ((d.griff ? s.griffProdukt : s.produkt) || {})[d.p] || 0;
  if (d.art === 'backen') return s.gebacken || 0;
  if (d.art === 'mini') return (s.runden || {})[d.spiel] || 0;
  if (d.art === 'futter') return s.futter || 0;
  if (d.art === 'santa') return s.santa || 0;
  if (d.art === 'gold') return s.gold || 0;
  return 0;
}
export const bitteDef = (b) => C.STAMM_BITTEN[b.gast][b.i];
export const bitteName = (b) => C.GAESTE[b.gast].name;
export const bitteZiel = (b) => bitteDef(b).n || 1;
export const bitteStand = (b) => Math.min(bitteZiel(b), Math.max(0, bitteZaehler(bitteDef(b)) - b.start));
export const bitteFertig = (b) => bitteStand(b) >= bitteZiel(b);
/** Was zu tun ist, kurz (unter dem Text der Bitte). */
export function bitteAufgabe(b) {
  const d = bitteDef(b), n = bitteZiel(b);
  if (d.art === 'getraenk') return `${n} × ${C.PRODUKT[d.p].name}${d.griff ? ' mit Handgriff' : ''} selbst servieren`;
  if (d.art === 'backen') return `${n} Plätzchen in der Backstube backen`;
  if (d.art === 'mini') return `Eine Runde ${MINI_NAME[d.spiel]} spielen`;
  if (d.art === 'futter') return 'Das Futterhaus füllen';
  if (d.art === 'santa') return 'Den Weihnachtsmann auf der Karte finden';
  return `${n} goldene Gäste bedienen`;
}
/**
 * Die Bitte von heute: Eine offene wartet (keine Frist, keine neue dazu).
 * Ist die letzte abgeholt und ein neuer Tag da, kommt der Stammgast dran,
 * der am längsten keine hatte und dessen nächste Bitte schon geht.
 */
export function bitte() {
  if (S.st.lernen < 99 || !S.startzieleFertig()) return null;
  const tag = Z.tagesSchluessel(), jetzt = Z.jetzt().getTime();
  const alt = S.st.bitte;
  if (alt && !alt.ab) alt.ab = jetzt;   // Bitten aus der ersten Fassung (ohne Startzeit): ab jetzt zählen
  // Eine offene Bitte wartet - aber nicht ewig (17.10., Betatest: Lenas
  // Kinderpunsch MIT Zuckerstange stand 15 Tage offen, und wer keine
  // Handgriffe macht, hätte nie wieder eine Bitte bekommen). Nach
  // BITTE_TAGE kommt ein anderer dran; diese Bitte kehrt später zurück.
  const liegtZuLange = alt && !alt.abgeholt && alt.ab && jetzt - alt.ab > C.BITTE_TAGE * 86400000 && !bitteFertig(alt);
  if (alt && !liegtZuLange && (!alt.abgeholt || alt.tag === tag)) return alt;
  const stand = S.st.bittenStand = S.st.bittenStand || {};
  const zuletzt = S.st.bitteZuletzt = S.st.bitteZuletzt || {};
  const wer = Object.keys(C.STAMM_BITTEN).filter((id) => {
    const kette = C.STAMM_BITTEN[id], i = stand[id] || 0;
    return S.stammBesuche(id) >= 1 && i < kette.length && bitteGeht(kette[i]) && !(liegtZuLange && id === alt.gast);
  }).sort((x, y) => (zuletzt[x] || 0) - (zuletzt[y] || 0));
  if (!wer.length) return liegtZuLange ? alt : null;
  const gast = wer[0], i = stand[gast] || 0;
  S.st.bitte = { gast, i, start: bitteZaehler(C.STAMM_BITTEN[gast][i]), tag, ab: jetzt, abgeholt: false };
  zuletzt[gast] = Date.now();
  S.speichere();
  S.hooks.toast(`${C.GAESTE[gast].name} hat eine Bitte an dich - steht unter Aufträge.`, 'neu');
  return S.st.bitte;
}
/** Welche Getränke muss man gerade selbst servieren (offene Bitte)? Für S.nurVonHand (26.10.). */
export function handWuensche() {
  const b = bitte(), d = b && bitteDef(b);
  return new Set(d && d.art === 'getraenk' && !b.abgeholt && !bitteFertig(b) ? [d.p] : []);
}
/** Erfüllte Bitte abholen: Sterne und der Dank. */
export function bitteAbholen() {
  const b = S.st.bitte;
  if (!b || b.abgeholt || !bitteFertig(b)) return null;
  b.abgeholt = true; b.tag = Z.tagesSchluessel();
  S.st.bittenStand[b.gast] = b.i + 1;
  S.st.stats.bitten = (S.st.stats.bitten || 0) + 1;
  const lohn = Math.max(100, S.zehner(S.einnahmenProMinute() * C.BITTE_MINUTEN * S.dev.geld));
  S.verdiene(lohn);
  S.speichere();
  return { lohn, name: bitteName(b), dank: bitteDef(b).dank };
}

/** Welches Sammelstück gäbe es beim schweren Auftrag? */
export function naechstesSammelstueck() { return C.AUFTRAG_DEKO.find((d) => !S.st.kalDeko[d.id]) || null; }

export function abholen(i, melde) {
  const a = heute()[i];
  if (!a || !fertig(a) || a.abgeholt) return null;
  a.abgeholt = true;
  S.st.stats.auftraege = (S.st.stats.auftraege || 0) + 1;
  a.lohn = S.zehner(a.lohn);   // Aufträge von vor dem Update noch krumm
  S.verdiene(a.lohn);
  let deko = null;
  if (a.stufe === 2) { deko = naechstesSammelstueck(); if (deko) { S.st.kalDeko[deko.id] = true; S.st.neu = S.st.neu || {}; S.st.neu[deko.id] = true; } }
  S.speichere();
  return { lohn: a.lohn, deko };
}

// ---------------------------------------------------------------------------
// Zählen: wird von spiel.js nach jedem Bedienen aufgerufen
// ---------------------------------------------------------------------------
let melden = () => {};
export function beiErfuellt(f) { melden = f; }

function zaehle(typ, pruef, menge = 1) {
  for (const a of heute()) {
    if (a.typ !== typ || fertig(a) || (pruef && !pruef(a))) continue;
    a.stand = Math.min(a.ziel, a.stand + menge);
    if (fertig(a)) melden(a);
  }
}

let warVoll = false;
export function bedient(g, auto, stoss) {
  if (S.st.lernen < 99) return;
  // Unter deiner Aufsicht (17.10.): Bist du am Stand und bedienen die Wichtel
  // normale Gäste für dich, zählen die mit - sonst hieße „Bediene 90 Gäste"
  // wieder jeden Gast selbst antippen. Alles Besondere zählt nur von Hand.
  const aufsicht = auto && S.aufsicht() && S.chefAktiv();
  if (auto && !aufsicht) return;
  zaehle('bediene');
  zaehle('produkt', (a) => a.param === g.wunsch);
  if (g.typ === 'kind') zaehle('kinder');
  if (g.typ === 'oma' || g.typ === 'opa') zaehle('omas');
  // 26.10.: Gruppen sind normale Gäste - unter Aufsicht bedienen sie die Wichtel, also zählen sie mit
  if (stoss && auto) zaehle('stoss');
  if (auto) return;
  if (g.gold) zaehle('gold');
  if (g.eilig) zaehle('eilig');
  if (C.GAESTE[g.typ].spezial) zaehle('spezial');
  if (stoss) zaehle('stoss');
  const voll = S.lauf.schwung >= C.SCHWUNG_MAX;
  if (voll && !warVoll) zaehle('schwung');
  warVoll = voll;
}
