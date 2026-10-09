/*
 * auftraege.js - drei Tagesaufträge: leicht, mittel, schwer.
 *
 * Jeden Tag neu (aus dem Datum gewürfelt, also für alle Spieler an einem
 * Tag gleich). Gezählt wird nur, was man SELBST am Tresen tut - der
 * Servier-Wichtel erfüllt keine Aufträge.
 *
 * Lohn in „Minuten normaler Einnahmen" - am Anfang wenige, mit jedem
 * Advent mehr (C.AUFTRAG_LOHN_MIN). Der schwere Auftrag bringt dazu ein Sammelstück, das
 * es nur hier gibt (C.AUFTRAG_DEKO), solange noch eins fehlt.
 */
import * as C from './config.js?v=20261009n';
import * as S from './spiel.js?v=20261009n';
import * as Z from './zeit.js?v=20261009n';

// Welche Aufträge es gibt. `geht()` sagt, ob er heute möglich ist.
const TYPEN = {
  bediene:  { stufen: [25, 50, 90],  text: (n) => `Bediene ${n} Gäste` },
  produkt:  { stufen: [8, 15, 25],   text: (n, p) => `Verkaufe ${n} × ${C.PRODUKT[p].name}`, geht: () => S.produkteFrei().length > 1 },
  kinder:   { stufen: [5, 10, 18],   text: (n) => `Bediene ${n} Kinder`, geht: () => S.hat('kinderpunsch') },
  omas:     { stufen: [4, 8, 14],    text: (n) => `Bediene ${n} Omas und Opas` },
  eilig:    { stufen: [2, 4, 7],     text: (n) => `Bediene ${n} eilige Gäste`, geht: () => S.st.stats.bedient >= 30 },
  schwung:  { stufen: [1, 1, 3],     text: (n) => n > 1 ? `Erreiche ${n}-mal vollen Schwung` : 'Erreiche vollen Schwung (×1,40)' },
  spezial:  { stufen: [1, 1, 2],     text: (n) => n > 1 ? `Bediene ${n} besondere Gäste` : 'Bediene einen besonderen Gast' },
  stoss:    { stufen: [3, 5, 6],     text: (n) => `Bediene ${n} Gäste einer Stoßzeit` },
};
const LEICHT = ['bediene', 'produkt', 'kinder', 'omas'];
const MITTEL = ['bediene', 'produkt', 'kinder', 'omas', 'eilig', 'schwung', 'stoss'];
const SCHWER = ['bediene', 'produkt', 'eilig', 'schwung', 'spezial', 'stoss'];

function zufall(seed) { let n = seed; return () => { n = (n * 1103515245 + 12345) & 0x7fffffff; return n / 0x7fffffff; }; }

/** Einnahmen je Minute, grob: damit der Lohn mit dem Spiel mitwächst. */
function proMinute() { return S.einnahmenProMinute(); }
/** Minuten je Schwierigkeit: wächst mit den Adventssonntagen. */
function lohnMinuten(stufe) {
  const zeile = C.AUFTRAG_LOHN_MIN[Math.min(C.AUFTRAG_LOHN_MIN.length - 1, Z.adventKerzen())];
  return zeile[stufe];
}

function erzeuge(tag) {
  const z = zufall([...tag].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
  const liste = [];
  const benutzt = new Set();
  [LEICHT, MITTEL, SCHWER].forEach((pool, stufe) => {
    const moeglich = pool.filter((t) => !benutzt.has(t) && (!TYPEN[t].geht || TYPEN[t].geht()));
    const typ = moeglich[Math.floor(z() * moeglich.length)] || 'bediene';
    benutzt.add(typ);
    let param = null;
    if (typ === 'produkt') { const frei = S.produkteFrei().filter((p) => p.art !== 'platte'); param = frei[Math.floor(z() * frei.length)].id; }
    liste.push({ typ, param, ziel: TYPEN[typ].stufen[stufe], stand: 0, stufe, lohn: Math.max(20, Math.round(proMinute() * lohnMinuten(stufe))), abgeholt: false });
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
export function abholbar() { return S.st.lernen >= 99 ? heute().filter((a) => fertig(a) && !a.abgeholt).length : 0; }

/** Welches Sammelstück gäbe es beim schweren Auftrag? */
export function naechstesSammelstueck() { return C.AUFTRAG_DEKO.find((d) => !S.st.kalDeko[d.id]) || null; }

export function abholen(i, melde) {
  const a = heute()[i];
  if (!a || !fertig(a) || a.abgeholt) return null;
  a.abgeholt = true;
  S.st.stats.auftraege = (S.st.stats.auftraege || 0) + 1;
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
  if (auto || S.st.lernen < 99) return;
  zaehle('bediene');
  zaehle('produkt', (a) => a.param === g.wunsch);
  if (g.typ === 'kind') zaehle('kinder');
  if (g.typ === 'oma' || g.typ === 'opa') zaehle('omas');
  if (g.eilig) zaehle('eilig');
  if (C.GAESTE[g.typ].spezial) zaehle('spezial');
  if (stoss) zaehle('stoss');
  const voll = S.lauf.schwung >= C.SCHWUNG_MAX;
  if (voll && !warVoll) zaehle('schwung');
  warVoll = voll;
}
