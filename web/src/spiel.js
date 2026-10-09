/*
 * spiel.js - Spielzustand und Regeln. Kein Zeichnen, kein DOM.
 *
 * `st`   = was gespeichert wird (Geld, Besitz, Töpfe, Kalender …)
 * `lauf` = was nur in dieser Sitzung lebt (Gäste, Hand, Schwung …)
 *
 * Meldungen nach außen (Ton, Einblendung) gehen über `hooks`, die
 * main.js setzt - so bleibt diese Datei ohne Abhängigkeit auf UI und Ton.
 */
import * as C from './config.js?v=20261009q';
import * as Z from './zeit.js?v=20261009q';
import { neueFarben } from './pixel.js?v=20261009q';

// Vorführmodus (?demo=…, nur lokal): eigener Speicherplatz, damit Store-
// Screenshots nie den echten Spielstand anfassen
export const DEMO = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  ? new URLSearchParams(location.search).get('demo') : null;
const SCHLUESSEL = DEMO ? 'adventshaus.demo' : 'adventshaus.v1';

export const hooks = { ton() {}, toast() {}, geld() {}, musik() {}, bedient() {} };

// Positionen auf der Straße (Weltpixel x)
export const TRESEN_X = [136, 150, 164];
const SCHLANGE_X0 = 122, SCHLANGE_ABSTAND = 11;
const START_X = -12, ENDE_X = 196;

// ---------------------------------------------------------------------------
// Gespeicherter Zustand
// ---------------------------------------------------------------------------
/**
 * Mitternacht des SPIELtages, zu dem der echte Zeitpunkt `ms` gehört.
 * `st.zuletzt` ist echte Zeit, der Spieltag hat den Kalenderversatz (und im
 * Test `Z.setzeZeit`) - beides wird hier auf denselben Tag gebracht.
 */
function echtMitternacht(ms = Date.now()) {
  const d = new Date(ms + (Z.jetzt().getTime() - Date.now()));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function heuteMitternacht() { const d = new Date(Z.jetzt()); d.setHours(0, 0, 0, 0); return d.getTime(); }
/** Beim Losspielen (nach der Begrüßung, nach dem Kalenderversatz) den ersten Spieltag merken. */
export function setzeStartTag() { st.startTag = heuteMitternacht(); }
function neuerStand(name = '', andenken = 0) {
  return {
    v: 1, saison: Z.saison(), name, geld: 0, gesamt: 0,
    besitz: { gluehwein: 1 }, fassade: 'trist', lichtfarbe: 'warm',
    toepfe: { gluehwein: C.TOPF_PORTIONEN[0] },
    kalender: {}, kalDeko: {}, andenken,
    zuletzt: Date.now(),
    ton: { musik: 3, fx: true },   // musik: Lautstärke 0 (aus) bis 5
    stats: { bedient: 0, verpasst: 0, spezial: 0 },
    ersterSchnee: false, intro: false, lernen: 0, tipps: {},
    gemeldet: null, neu: {},
    modus: 'echt', versatzTage: 0,   // 'echt' = echter Kalender, 'eigen' = Start eine Woche vor dem 1.12.
    sterne10: true,                  // Beträge in ganzen Sternen (seit 29.09. alles ×10)
    startTag: 0,                     // erster Spieltag (setzeStartTag beim Losspielen); 0 = noch nicht, fehlt = alter Stand
  };
}

function laden() {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (roh) {
      const alt = JSON.parse(roh);
      const stand = Object.assign(neuerStand(), alt);
      // Falle: neuerStand() trägt sterne10 schon - ein alter Stand OHNE die
      // Marke wäre sonst nie umgerechnet worden (so beim ersten Test passiert)
      if (!('sterne10' in alt)) stand.sterne10 = false;
      return stand;
    }
  } catch (e) { /* kaputter Spielstand: neu anfangen */ }
  return neuerStand();
}

export let st = laden();
// Alte Spielstände: „Bunte Lichter" galt einmal für ALLE Ketten, jetzt hat
// jede Kette ihren eigenen Schalter - übernommen wird das Dach
if (st.lichtfarbe === 'bunt' && !st.bunt) st.bunt = { dach: true };
// Die Bunt-Artikel gibt es nicht mehr (Farbe ist frei wählbar): ihre NEU-Marken aufräumen
if (st.neu) for (const k of Object.keys(st.neu)) if (!C.ARTIKEL.some((x) => x.id === k) && !/^(kal|auf)_/.test(k)) delete st.neu[k];
// Alte Spielstände: Seit 29.09. gibt es ganze Sterne, alle Beträge ×10 -
// Kasse, Verdientes und der heutige Auftragslohn werden einmal umgerechnet
if (!st.sterne10) {
  st.geld = Math.round(st.geld * 10);
  st.gesamt = Math.round(st.gesamt * 10);
  if (st.auftraege) for (const a of st.auftraege.liste || []) a.lohn = Math.round(a.lohn * 10);
  st.sterne10 = true;
}
// Alte Spielstände: Musik war ein Schalter (true/false), jetzt eine Stufe
if (typeof st.ton.musik === 'boolean') st.ton.musik = st.ton.musik ? 3 : 0;

export function speichere() {
  // „Zuletzt da" nur stempeln, solange die App sichtbar ist. Im Hintergrund
  // laufen Zeitgeber teils weiter (Android, Desktop) - dann rückte der
  // Stempel mit, und beim Zurückkommen gab es kein Wichtel-Einkommen.
  if (typeof document === 'undefined' || !document.hidden) st.zuletzt = Date.now();
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(st)); } catch (e) { /* voll/privat */ }
}

export function allesLoeschen() {
  st = neuerStand();
  resetLauf();
  speichere();
}

/** Neue Adventszeit? Dann frisch anfangen, mit Namen und einem Andenken. */
export function pruefeSaison() {
  if (st.saison < Z.saison()) {
    const hatteFortschritt = st.gesamt > 1000;
    const tipps = st.tipps;
    st = neuerStand(st.name, st.andenken + (hatteFortschritt ? 1 : 0));
    st.intro = true; st.lernen = 99; st.tipps = tipps || {};   // kennt das Spiel schon
    setzeStartTag();
    resetLauf();
    speichere();
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Laufzustand
// ---------------------------------------------------------------------------
export const lauf = {};
function resetLauf() {
  Object.assign(lauf, {
    gaeste: [], hand: [], naechsteId: 1,
    schwung: 0, schwungT: 0,
    spawnT: 1.5, servierT: 0,
    crepe: { backT: -1, fertig: false, gewendet: false, verpasst: false },
    nachfuellT: {}, fuellen: {},   // Wichtel-Uhr bzw. Tippfortschritt je Topf
    texte: [], herzen: [], elfen: [],
    lernen: false, fehlGast: 0,
    klicks: [], druck: null, neuInHand: -1, neuInHandT: 0,   // sichtbare Rückmeldung beim Tippen
    aktivT: 0, spezialAb: 20, stossRest: 0, stossBis: 0, stossName: '',
    stossMult: 2, ansturm: false, ansturmT: 0,   // Tagesansturm: Trinkgeld ×3, nur für dich
    wackel: {},                     // kurzes Wackeln je Topf/Gast bei Fehlern
    chefT: 0,                       // s seit dem letzten Tippen am Stand (Start zählt als da)
    grossAb: C.GROSS_ERST,          // frühestens dann die nächste Großbestellung
    gefuellt: {},                   // Nachfüll-Wichtel ist gerade fertig (Abgang)
    schlitten: null, schlittenAb: C.SCHLITTEN_ERST,   // der Nikolaus am Himmel
    haendler: null, haendlerT: 0,   // der fahrende Händler (haendlerT = s am Stand)
    haendlerAb: C.HAENDLER_ERST[0] + Math.random() * (C.HAENDLER_ERST[1] - C.HAENDLER_ERST[0]),
    sonderSeit: null,               // seit wann besondere Gäste kommen dürften (sonderBereit)
    t: 0,
  });
}
resetLauf();

// ---------------------------------------------------------------------------
// Besitz, Stimmung, Boni
// ---------------------------------------------------------------------------
export const ARTIKEL_MAP = Object.fromEntries(C.ARTIKEL.map((a) => [a.id, a]));

export function stufe(id) { return st.besitz[id] || 0; }
export function hat(id) { return stufe(id) > 0 || !!st.kalDeko[id]; }
/** Wird es GEZEICHNET? Deko lässt sich ausschalten; Stimmung und Bonus bleiben. */
export function zeigt(id) { return hat(id) && !(st.aus && st.aus[id]); }
export function istDeko(a) { return !a.wahl && (a.tab === 'markt' || (a.tab === 'baumarkt' && a.gruppe === 'Am Haus')); }

/** Hat dieser Artikel (schon) Lichter mit Farbwahl? Gibt die Kette zurück. */
export function lichtKette(id) {
  if (!(id in C.LICHTER) || !hat(id)) return null;
  if (stufe(id) < (C.LICHT_AB_STUFE[id] || 1)) return null;
  return C.LICHTER[id] || null;
}
/** 'aus' | 'weiss' | 'bunt' - bzw. 'an', wenn es keine Farbwahl gibt */
export function lichtModus(id) {
  if (st.aus && st.aus[id]) return 'aus';
  const k = lichtKette(id);
  return k ? (bunt(k) ? 'bunt' : 'weiss') : 'an';
}
export function setzeLicht(id, modus) {
  st.aus = st.aus || {}; st.bunt = st.bunt || {};
  st.aus[id] = modus === 'aus';
  const k = lichtKette(id);
  if (k && modus !== 'aus') st.bunt[k] = modus === 'bunt';
  hooks.ton('klick');
  speichere();
}
export function setzeDeko(id, an) {
  st.aus = st.aus || {};
  st.aus[id] = !an;
  hooks.ton('klick');
  speichere();
}
/** Anstrich direkt wählen ('trist' = ursprünglich) */
export function setzeFassade(f) { st.fassade = f; hooks.ton('klick'); speichere(); }
export function setzeZaunfarbe(f) { st.zaunfarbe = f; hooks.ton('klick'); speichere(); }
export function schalteDeko(id) {
  st.aus = st.aus || {};
  st.aus[id] = !st.aus[id];
  hooks.ton('klick');
  speichere();
}

export function stimmung() {
  let s = 0;
  for (const a of C.ARTIKEL) s += (a.stimmung || 0) * stufe(a.id);
  for (const d of Object.values(C.KALENDER_DEKO)) if (st.kalDeko[d.id]) s += d.stimmung;
  for (const d of C.AUFTRAG_DEKO) if (st.kalDeko[d.id]) s += d.stimmung;
  for (const d of C.HAENDLER_DEKO) if (st.kalDeko[d.id]) s += d.stimmung;
  for (const d of C.MARKT_DEKO) if (st.kalDeko[d.id]) s += d.stimmung;
  for (const d of [...C.LICHTUNG_DEKO, ...C.BAUM_DEKO, ...C.BERG_DEKO]) if (st.kalDeko[d.id]) s += d.stimmung;
  s += Object.keys(st.var || {}).length * C.VARIANTE_HERZEN;
  return s;
}

export function boni() {
  const b = { preis: 0, trinkgeld: 0, geduld: 0, gaeste: 0 };
  for (const a of C.ARTIKEL) {
    if (!a.bonus || !stufe(a.id)) continue;
    const f = a.bonusJeStufe ? stufe(a.id) : 1;
    for (const k in a.bonus) b[k] += a.bonus[k] * f;
  }
  for (const d of C.HAENDLER_DEKO) if (d.bonus && st.kalDeko[d.id]) for (const k in d.bonus) b[k] += d.bonus[k];
  return b;
}

/** Ist der Spieler gerade am Stand? (Tippen in den letzten CHEF_ZEIT s) */
export const chefAktiv = () => lauf.chefT < C.CHEF_ZEIT;
/** Wie schnell die Wichtel gerade arbeiten. */
// Du bist da: schneller. Fünf Minuten nichts getippt: nur noch ein Fünftel -
// genauso wie bei geschlossener App (offlineAbrechnen).
/**
 * Wie fleißig und wie lange arbeiten die Wichtel ohne dich? Wächst mit den
 * Spieltagen (`st.startTag` = Datum des ersten Spieltags; alte Spielstände
 * ohne ihn bekommen gleich die volle Leistung).
 */
export function spieltag() {
  if (st.startTag == null) return 99;   // alter Spielstand: volle Leistung
  if (!st.startTag) return 0;
  return Math.max(0, Math.floor((Z.jetzt() - st.startTag) / 86400000));
}
const nachTag = (liste) => liste[Math.min(liste.length - 1, spieltag())];
export const offlineAnteil = () => nachTag(C.OFFLINE_JE_TAG.anteil);
export const offlineStunden = () => nachTag(C.OFFLINE_JE_TAG.stunden);
export const wichtelTempo = () => chefAktiv() ? C.CHEF_TEMPO : lauf.chefT >= C.INAKTIV_AB ? offlineAnteil() : 1;

export const hatWichtel = () => ['spuel', 'servier', 'nachfuell', 'crepe_w'].some((id) => hat(id));

/**
 * Wo Platz i in der Tresenansicht steht (Mitte der Figur). Bei zwei Plätzen
 * rücken beide zur Mitte zusammen - gleichmäßig verteilt standen sie weit
 * außen am Rand.
 */
export function platzX(i, n = tresenPlaetze()) {
  if (n === 2) return [62, 118][i];
  return (i + 0.5) * 180 / n;
}

/** Leuchtet diese Kette bunt? Jede Kette hat ihren eigenen Schalter im Laden. */
export const bunt = (kette) => !!(st.bunt && st.bunt[kette]);

export const topfMax = () => C.TOPF_PORTIONEN[stufe('topf')];
export const handMax = () => C.TABLETT[stufe('tablett')];
export const tresenPlaetze = () => C.TRESEN[stufe('tresen')];
export const produkteFrei = () => C.PRODUKTE.filter((p) => hat(p.id));
export const preisFaktor = () => (1 + stimmung() * C.STIMMUNG_PREIS) * (1 + boni().preis);

export function gastTakt() {
  const sonntag = Z.adventssonntag() ? C.ADVENT_GAESTE : 0;
  const markt = marktHeute() ? C.MARKT_GAESTE : 0;
  const t = C.GAST_BASIS / (1 + stimmung() / C.STIMMUNG_TAKT) / (1 + boni().gaeste + sonntag + markt);
  return Math.max(C.GAST_MIN, t);
}

export function artikelName(id) {
  return ARTIKEL_MAP[id]?.name || C.PRODUKT[id]?.name || id;
}

/** Ist die Freischaltbedingung (Herzen / Gesamteinnahmen) erreicht? */
export function freiErfuellt(id) {
  const f = C.FREI[id];
  if (!f) return true;
  if (f.herzen && stimmung() < f.herzen) return false;
  if (f.gesamt && st.gesamt < f.gesamt) return false;
  if (f.advent && Z.adventKerzen() < f.advent) return false;
  return true;
}
export function freiText(id) {
  const f = C.FREI[id];
  if (!f) return '';
  const t = [];
  if (f.herzen) t.push(`♥ ${f.herzen} Stimmung (du hast ${stimmung()})`);
  if (f.gesamt) t.push(`insgesamt ${formatGeld(f.gesamt)} verdient (bisher ${formatGeld(Math.floor(st.gesamt))})`);
  if (f.advent) { const a = Z.adventDatum(f.advent); t.push(`dem ${f.advent}. Advent (${a.getDate()}.${a.getMonth() + 1}.)`); }
  return t.join(' und ');
}

/** Der Satz unter einem verdeckten Artikel. */
export function bedingungText(a) {
  if (!freiErfuellt(a.id)) return `Wird freigeschaltet bei: ${freiText(a.id)}`;
  if (a.braucht && !hat(a.braucht)) return `Wird freigeschaltet, sobald du ${artikelName(a.braucht)} hast.`;
  return '';
}

/** Kann man es sehen UND (bis auf das Geld) kaufen? */
function sichtbarUndFrei(a) {
  const s = status(a);
  return !s.versteckt && !s.grund;
}

/**
 * Neu Freigeschaltetes finden. Gibt die Artikel zurück, die seit dem
 * letzten Aufruf dazugekommen sind. Beim allerersten Aufruf wird still
 * alles gemerkt, was schon da ist - sonst käme zum Start eine Flut.
 */
export function pruefeFreischaltungen() {
  const neu = [];
  const erstes = !st.gemeldet;
  st.gemeldet = st.gemeldet || {};
  st.neu = st.neu || {};
  for (const a of C.ARTIKEL) {
    if (st.gemeldet[a.id] || !sichtbarUndFrei(a)) continue;
    st.gemeldet[a.id] = true;
    if (erstes || !C.FREI[a.id] && !a.braucht && !a.schnee) continue;
    st.neu[a.id] = true;
    neu.push(a);
  }
  return neu;
}

export function status(a) {
  const s = stufe(a.id);
  const liste = Array.isArray(a.kosten) ? a.kosten : [a.kosten];
  const max = liste.length;
  const fertig = s >= max;
  const kosten = fertig ? null : liste[s];
  let grund = null;
  // Verdeckt, bis die Bedingung erfüllt ist - und Zubehör, bis das Teil da ist, zu dem es gehört
  // brauchtStufe: das Grundteil muss so weit ausgebaut sein (z. B. Bunt erst, wenn es Lichter gibt)
  const fehltStufe = a.brauchtStufe && stufe(a.braucht) < a.brauchtStufe;
  const versteckt = !s && (!freiErfuellt(a.id) || (a.braucht && !hat(a.braucht)) || fehltStufe);
  if (!fertig && !versteckt) {
    if (a.braucht && !hat(a.braucht)) grund = `Braucht zuerst: ${artikelName(a.braucht)}`;
    else if (a.schnee && Z.schnee() <= 0) grund = 'Braucht Schnee - ab 1. Dezember';
  }
  return { stufe: s, max, fertig, kosten, grund, versteckt, leisten: !versteckt && kosten != null && st.geld >= kosten };
}

/** Fertig im Sinne von „schönstes Haus": Luxus-Stücke zählen nicht (luxus/luxusAb in config.js). */
export function fertigOhneLuxus(a) {
  if (a.luxus) return true;
  if (a.luxusAb) return stufe(a.id) >= a.luxusAb - 1;
  return status(a).fertig;
}
export const zumZiel = () => C.ARTIKEL.filter((a) => !a.luxus);

export function kaufe(id) {
  const a = ARTIKEL_MAP[id];
  if (!a) return false;
  const s = status(a);
  if (s.fertig || s.grund || s.versteckt || !s.leisten) return false;
  st.geld -= s.kosten;
  st.besitz[id] = s.stufe + 1;
  // Nebenwirkungen
  const prod = C.PRODUKT[id];
  if (prod && prod.art !== 'platte') st.toepfe[id] = topfMax();
  if (id === 'topf') for (const k in st.toepfe) st.toepfe[k] = topfMax();
  if (a.wahl === 'fassade') st.fassade = a.fassade;
  if (a.wahl === 'lichtfarbe') { st.bunt = st.bunt || {}; st.bunt[a.kette] = true; }
  if (a.wahl === 'zaunfarbe') st.zaunfarbe = 'braun';
  if (id === 'musik') hooks.musik();
  hooks.ton('kauf');
  hooks.geld();
  speichere();
  return true;
}

// ---------------------------------------------------------------------------
// Varianten je Deko-Platz (09.10.). `st.var` = gekaufte Varianten
// ('tanne:1' …), `st.wahl` = gewählte Variante je Platz (0 = das Teil selbst).
// ---------------------------------------------------------------------------
export const hatVariante = (platz, i) => (i === 0 ? hat(platz) : !!(st.var && st.var[platz + ':' + i]));
/** Welche Variante wird gezeichnet? (0, 1 oder 2) */
export function variante(platz) {
  const i = (st.wahl && st.wahl[platz]) || 0;
  return hatVariante(platz, i) ? i : 0;
}
export function variantePreis(platz, i) {
  const a = ARTIKEL_MAP[platz];
  const basis = Array.isArray(a.kosten) ? a.kosten[0] : a.kosten;
  const roh = Math.max(C.VARIANTE_MIN[i], basis * C.VARIANTE_FAKTOR[i]);
  const stelle = Math.pow(10, Math.max(0, Math.floor(Math.log10(roh)) - 1));
  return Math.round(roh / stelle) * stelle;
}
/** { hat, kosten, versteckt, leisten } - die dritte zeigt sich erst mit der zweiten. */
export function varianteStatus(platz, i) {
  const h = hatVariante(platz, i);
  const versteckt = !h && i === 2 && !hatVariante(platz, 1);
  const kosten = h || i === 0 ? null : variantePreis(platz, i);
  return { hat: h, kosten, versteckt, leisten: !h && !versteckt && hat(platz) && kosten != null && st.geld >= kosten };
}
export function kaufeVariante(platz, i) {
  const s = varianteStatus(platz, i);
  if (!s.leisten) return false;
  st.geld -= s.kosten;
  st.var = st.var || {}; st.var[platz + ':' + i] = true;
  st.wahl = st.wahl || {}; st.wahl[platz] = i;
  hooks.ton('kauf'); hooks.geld();
  speichere();
  return true;
}
export function waehleVariante(platz, i) {
  if (!hatVariante(platz, i)) return;
  st.wahl = st.wahl || {}; st.wahl[platz] = i;
  hooks.ton('klick');
  speichere();
}

/** Umschaltbare Dinge (Anstrich, Lichtfarbe) nach dem Kauf. */
export function waehle(id) {
  const a = ARTIKEL_MAP[id];
  if (!a || !stufe(id)) return;
  if (a.wahl === 'fassade') st.fassade = st.fassade === a.fassade ? 'trist' : a.fassade;
  if (a.wahl === 'lichtfarbe') { st.bunt = st.bunt || {}; st.bunt[a.kette] = !st.bunt[a.kette]; }
  if (a.wahl === 'zaunfarbe') st.zaunfarbe = st.zaunfarbe === 'braun' ? 'hell' : 'braun';
  hooks.ton('klick');
  speichere();
}
export function istGewaehlt(a) {
  if (a.wahl === 'fassade') return st.fassade === a.fassade;
  if (a.wahl === 'lichtfarbe') return bunt(a.kette);
  if (a.wahl === 'zaunfarbe') return st.zaunfarbe === 'braun';
  return false;
}

// ---------------------------------------------------------------------------
// Geld
// ---------------------------------------------------------------------------
// Dev-Modus (Werkstatt): schneller durchspielen. Liegt bewusst NICHT im
// Spielstand, sondern daneben - „Spielstand löschen" lässt ihn stehen.
//
// ENTWICKLUNG: Werkstatt, Dev-Modus, ?datum= und window.__spiel gibt es nur
// auf dem eigenen Rechner bzw. im Heimnetz - auf der echten Adresse
// (Webserver, GitHub Pages) sehen Spieler davon nichts.
export const ENTWICKLUNG = typeof location !== 'undefined'
  && /^(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|.+\.local)$/.test(location.hostname);
const DEV_KEY = 'adventshaus.dev';
export const dev = { geld: 1, tempo: 1, tage: 0 };
if (ENTWICKLUNG) try { Object.assign(dev, JSON.parse(localStorage.getItem(DEV_KEY)) || {}); } catch (e) { /* egal */ }
export function setzeDev(neu) {
  Object.assign(dev, neu);
  try { localStorage.setItem(DEV_KEY, JSON.stringify(dev)); } catch (e) { /* egal */ }
}
export const devAn = () => dev.geld !== 1 || dev.tempo !== 1 || dev.tage !== 0;

export function verdiene(betrag) {
  betrag = Math.round(betrag);   // ganze Sterne
  st.geld += betrag;
  st.gesamt += betrag;
  hooks.geld();
}

export function formatGeld(n) {
  // Die Währung heißt STERNE (vorher „Geld", davor „Taler"), seit 29.09. nur
  // ganze Zahlen. Im Code bleibt es `geld`.
  if (n >= 1e6) return (n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' Mio. Sterne';
  n = Math.floor(n);
  return n === 1 ? '1 Stern' : n.toLocaleString('de-DE') + ' Sterne';
}

// ---------------------------------------------------------------------------
// Gäste
// ---------------------------------------------------------------------------
function zufallGewichtet(liste, gewicht) {
  let summe = 0;
  for (const x of liste) summe += gewicht(x);
  let z = Math.random() * summe;
  for (const x of liste) { z -= gewicht(x); if (z <= 0) return x; }
  return liste[liste.length - 1];
}

function wunschFuer(typ) {
  const def = C.GAESTE[typ];
  let frei = produkteFrei();
  if (def.ohneAlk) frei = frei.filter((p) => !p.alk);
  if (def.wunsch) {
    const w = frei.filter((p) => def.wunsch.includes(p.id));
    if (w.length) frei = w;
  }
  if (!frei.length) return null;
  // Neu freigeschaltete Dinge werden etwas öfter bestellt
  return zufallGewichtet(frei, (p) => 1 + C.PRODUKTE.indexOf(p) * 0.15).id;
}

function spezialMoeglich() {
  const m = [];
  const ph = Z.phase();
  if (ph !== 'herbst') m.push(['weihnachtsmann', Z.dezemberTag() === 24 ? 4 : 1]);
  m.push(['rentier', 1]);
  if (Z.schnee() > 0) m.push(['schneemann', 1]);
  if (st.gesamt >= 300) m.push(['grummel', 1]);
  return m;
}

/**
 * Dürfen besondere Gäste kommen? Erst ab SONDER_AB_PRODUKTE Getränken, und
 * dann SONDER_NACH Sekunden später - am Anfang gibt es genug anderes zu lernen.
 */
function sonderBereit() {
  if (produkteFrei().length < C.SONDER_AB_PRODUKTE) return false;
  if (lauf.sonderSeit == null) lauf.sonderSeit = lauf.t;
  return lauf.t >= lauf.sonderSeit + (st.ersterSonder ? 0 : C.SONDER_NACH);
}

function waehleTyp(erlaubeSpezial) {
  // Besondere Gäste: selten, und nie zwei kurz hintereinander
  // Sie kommen nur, wenn DU am Stand bist - die Wichtel bedienen sie nicht,
  // und wer weg ist, soll nicht vom Grummel bestohlen werden.
  if (erlaubeSpezial && chefAktiv() && sonderBereit() && lauf.t >= lauf.spezialAb && Math.random() < C.SPEZIAL_CHANCE) {
    const m = spezialMoeglich();
    if (m.length) { lauf.spezialAb = lauf.t + C.SPEZIAL_PAUSE; return zufallGewichtet(m, (x) => x[1])[0]; }
  }
  // Kinder kommen, sobald es Kinderpunsch gibt (alles ist alkoholfrei, der
  // Kinderpunsch bleibt trotzdem ihr Grund, vorbeizuschauen)
  const kinderGehen = hat('kinderpunsch');
  const typen = ['erwachsen', 'oma', 'opa'].concat(kinderGehen ? ['kind'] : []);
  return zufallGewichtet(typen, (t) => C.GAESTE[t].gewicht);
}

export function neuerGast(typ, gross) {
  typ = typ || waehleTyp(true);
  const wunsch = gross ? gross.id : wunschFuer(typ);
  if (!wunsch) return null;
  const def = C.GAESTE[typ];
  // Je dichter der Andrang, desto ungeduldiger die Leute (bis 60 %)
  const druck = Math.min(1, Math.max(0.6, 0.45 + gastTakt() / C.GAST_BASIS * 0.55));
  const eilig = !gross && !def.spezial && !lauf.lernen && st.stats.bedient >= 30 && Math.random() < C.EILIG_ANTEIL;
  const geduld = gross ? gross.zeit : def.geduld * (1 + boni().geduld) * druck * (eilig ? C.EILIG_GEDULD : 1);
  const g = {
    id: lauf.naechsteId++, typ, wunsch,
    x: START_X, y: 0, farben: neueFarben(typ), phase: Math.random() * 10,
    platz: null, am: false, laeuft: true, eilig,
    geduld, geduldMax: geduld, schlange: C.SCHLANGE_GEDULD * (1 + boni().geduld),
    gehen: false, froh: false, bedient: false, t0: lauf.t,
    gross: gross || null,
  };
  // Eine Großbestellung wartet nicht in der Schlange - sie hat ihre eigene Uhr
  if (gross) g.schlange = 999;
  lauf.gaeste.push(g);
  if (def.spezial) {
    st.stats.spezial++;
    hooks.toast(`${def.name} kommt vorbei!`, 'spezial');
    hooks.ton('spezial');
  }
  return g;
}

function wartende() { return lauf.gaeste.filter((g) => !g.gehen); }

function gehe(g, froh) {
  g.gehen = true; g.froh = froh; g.platz = null; g.am = false; g.laeuft = true;
  if (!froh && g.gross) {
    // Zeit um: Was schon geliefert ist, wird normal bezahlt - keine Strafe
    const gr = g.gross;
    const betrag = gr.stand * produktPreis(C.PRODUKT[gr.id]) * preisFaktor() * dev.geld;
    if (betrag > 0) verdiene(betrag);
    hooks.toast(gr.stand ? `Zeit um! ${gr.stand} von ${gr.n} geliefert: +${formatGeld(betrag)}` : 'Zeit um - die Großbestellung ist weitergezogen.', 'hinweis');
    return;
  }
  if (!froh) {
    lauf.herzen.push({ x: g.x, t: 0, traurig: true });
    st.stats.verpasst++;
    st.stats.serie = 0;
    lauf.schwung = 0; lauf.schwungT = 0;
    if (g.typ === 'grummel') grummelStreich(g);
  }
}

/** Wer den Grummel warten lässt, dem greift er in die Kasse. */
function grummelStreich(g) {
  if (C.GRUMMEL_ANTEIL <= 0) {   // seit 29.09.: er brummelt nur noch
    hooks.toast('Der Grummel ist brummelnd weitergezogen.', 'hinweis');
    return;
  }
  const betrag = Math.min(st.geld, Math.max(C.GRUMMEL_MIN, Math.round(st.geld * C.GRUMMEL_ANTEIL)));
  if (betrag <= 0) return;
  st.geld -= betrag;
  hooks.geld();
  lauf.texte.push({ platz: null, x: g.x, text: '-' + Math.round(betrag), t: 0, boese: true });
  hooks.toast(`Der Grummel hat ${formatGeld(betrag)} aus der Kasse geklaut!`, 'boese');
  hooks.ton('falsch');
}

// ---------------------------------------------------------------------------
// Tresen: Tippen
// ---------------------------------------------------------------------------
function verfuegbar(id) {
  const p = C.PRODUKT[id];
  if (!hat(id)) return false;
  if (p.art === 'platte') return lauf.crepe.fertig;
  return (st.toepfe[id] || 0) > 0;
}

/**
 * Platz für Lebkuchen oder Crêpe schaffen: Ist das Tablett voll, aber
 * steht ein leeres Glas darauf, wird das Glas weggestellt. Sonst füllte
 * der Spül-Wichtel das Tablett mit Gläsern, und Essen ging gar nicht mehr.
 */
function platzFuerEssen() {
  if (lauf.hand.length < handMax()) return true;
  const g = lauf.hand.findIndex((h) => h.art === 'glas');
  if (g < 0) return false;
  lauf.hand.splice(g, 1);
  return true;
}

export function tippeGlaeser() {
  if (lauf.hand.length >= handMax()) { hooks.ton('falsch'); lauf.wackel.hand = 0.3; return; }
  lauf.hand.push({ art: 'glas' });
  hooks.ton('glas');
}

/** Regalzelle i (Reihenfolge wie PRODUKTE). Rückgabe 'laden', wenn gesperrt. */
export function tippeZelle(i) {
  const p = C.PRODUKTE[i];
  if (!p) return;
  if (!hat(p.id)) return 'laden';
  const hand = lauf.hand;
  if (p.art === 'platte') {
    const cr = lauf.crepe;
    if (cr.fertig) {
      if (!platzFuerEssen()) { hooks.ton('falsch'); lauf.wackel.hand = 0.3; return; }
      hand.push({ art: 'voll', id: p.id, rest: 0, griffe: null, extra: null, extraFertig: cr.gewendet });
      cr.fertig = false;
      hooks.ton('greifen');
    } else if (cr.backT < 0) {
      cr.backT = 0; cr.gewendet = false; cr.verpasst = false;
      hooks.ton('brutzeln');
    } else if (!cr.gewendet && !cr.verpasst) {
      // Handgriff „Wenden": im grünen Moment auf die Platte tippen
      const tm = C.HANDGRIFF.wenden.timing, a = cr.backT / C.CREPE_ZEIT;
      if (a >= tm.von && a <= tm.bis) { cr.gewendet = true; hooks.ton('greifen'); }
      else { cr.verpasst = true; hooks.ton('klick'); hooks.toast(a < tm.von ? 'Zu früh gewendet - der Teig war noch flüssig.' : 'Zu spät gewendet - schon zu dunkel.', 'hinweis'); }
    }
    return;
  }
  // Topf oder Dose leer → nachfüllen
  if ((st.toepfe[p.id] || 0) <= 0) {
    lauf.fuellen[p.id] = (lauf.fuellen[p.id] || 0) + 1 / C.NACHFUELL_TIPPS;
    hooks.ton('blubb');
    // „wieder voll" sagt der Ton, der Topf zeigt es - keine Einblendung mehr
    // (Betatest 2: rund 40 Topf-Meldungen in den ersten 10 Minuten)
    if (lauf.fuellen[p.id] >= 0.999) { st.toepfe[p.id] = topfMax(); lauf.fuellen[p.id] = 0; hooks.ton('voll'); }
    // Wer mit leerem Glas kam, wollte einschenken - sagen, warum nichts passiert
    // (sonst blieb das Glas still leer stehen, Betatest 02.10.). Nur die
    // ersten zwei Male als Text, danach reicht das blinkende LEER am Topf.
    else if (lauf.fuellen[p.id] < 1.5 / C.NACHFUELL_TIPPS && (st.topfHinweise || 0) < 2) {
      st.topfHinweise = (st.topfHinweise || 0) + 1;
      const noch = C.NACHFUELL_TIPPS - Math.round(lauf.fuellen[p.id] * C.NACHFUELL_TIPPS);
      hooks.toast(`Topf leer! Noch ${noch}× antippen, dann ist er wieder voll.`, 'hinweis');
    }
    return;
  }
  if (p.art === 'dose') {
    if (!platzFuerEssen()) { hooks.ton('falsch'); lauf.wackel.hand = 0.3; return; }
    hand.push({ art: 'voll', id: p.id, rest: p.zeit, dauer: p.zeit, ...neueGriffe(p) });
    st.toepfe[p.id]--;
    hooks.ton('greifen');
    return;
  }
  // Topf: braucht ein leeres Glas. Dann dauert das Zubereiten ein wenig.
  const glas = hand.findIndex((h) => h.art === 'glas');
  if (glas >= 0) hand[glas] = { art: 'voll', id: p.id, rest: p.zeit, dauer: p.zeit, ...neueGriffe(p) };
  else { hooks.ton('falsch'); lauf.wackel['z' + p.id] = 0.3; hooks.toast(hand.length >= handMax() ? 'Das Tablett ist voll.' : 'Erst ein Glas holen!', 'hinweis'); return; }
  st.toepfe[p.id]--;
  hooks.ton('giessen');
}

/**
 * Handgriffe eines frisch eingeschenkten Glases: `griffe` in der Reihenfolge
 * aus config.js, `schritt` = wie viele schon erledigt, `tipps` = Tipps im
 * aktuellen (Umrühren braucht drei). `extra` ist der gerade fällige Griff.
 */
function neueGriffe(p) {
  return { griffe: p.griffe || null, schritt: 0, tipps: 0, extra: p.griffe ? p.griffe[0] : null, extraFertig: false, brennT: 0,
    ziehT: 0, flammeT: 0, verpasst: false };
}
/** Timing verpasst: kein Bonus mehr für dieses Glas, servieren geht trotzdem. */
function griffVerpasst(h, text) {
  h.extra = null; h.extraFertig = false; h.verpasst = true;
  hooks.ton('klick');
  hooks.toast(text, 'hinweis');
}
/** Nächster Handgriff dran - oder alle fertig. */
function griffWeiter(h) {
  h.schritt++; h.tipps = 0;
  h.extra = h.griffe[h.schritt] || null;
  if (!h.extra) h.extraFertig = true;
}

/** Etwas auf dem Tablett angetippt: der nächste Handgriff (Zuckerstange, Umrühren, Sahne …). */
export function tippeHand(i) {
  const h = lauf.hand[i];
  if (!h || h.art !== 'voll' || !h.extra || h.extraFertig || h.brennT > 0) return;
  if (h.rest > 0) { lauf.wackel.hand = 0.2; hooks.toast('Erst fertig einschenken lassen!', 'hinweis'); return; }
  if (h.extra === 'zucker') { h.brennT = C.ZUCKER_ZEIT; hooks.ton('brutzeln'); }
  else if (h.extra === 'beutel') {   // im grünen Moment herausziehen
    const tm = C.HANDGRIFF.beutel.timing, a = h.ziehT / tm.dauer;
    if (a >= tm.von && a <= tm.bis) { hooks.ton('greifen'); griffWeiter(h); }
    else griffVerpasst(h, 'Zu früh - der Tee ist noch zu schwach. Diesmal ohne Bonus.');
  }
  else {
    h.tipps++;
    const fertig = h.tipps >= C.HANDGRIFF[h.extra].n;
    hooks.ton(fertig ? 'greifen' : 'klick');
    if (fertig) griffWeiter(h);
  }
  lauf.neuInHand = i; lauf.neuInHandT = 0.15;
}

const bereit = (h) => h.art === 'voll' && !(h.rest > 0) && !(h.brennT > 0);

export function tippeGast(platz) {
  const g = lauf.gaeste.find((x) => x.platz === platz && x.am && !x.gehen);
  if (!g || g.bedient) return;
  const i = lauf.hand.findIndex((h) => bereit(h) && h.id === g.wunsch);
  if (i < 0) {
    // Das Richtige ist noch in Arbeit? Dann nur warten - keine Strafe
    if (lauf.hand.some((h) => h.art === 'voll' && h.id === g.wunsch)) {
      lauf.wackel['g' + g.id] = 0.2; hooks.toast('Noch einen Moment - es ist gleich fertig!', 'hinweis');
      return;
    }
    // Mit Servier-Wichtel: Tipp auf den Gast = der Wichtel schenkt ihm ein
    if (hat('servier') && wichtelEinschenken(g)) return;
    // Falsch geliefert: Der Gast lehnt ab - das Glas BLEIBT seit 02.10. auf
    // dem Tablett (vorher war es weg). Oft wollte es ein anderer Gast, oder
    // der Nächste in der Schlange will es; wegkippen kann man es jederzeit.
    const k = lauf.hand.findIndex(bereit);
    if (k >= 0) {
      const anderer = lauf.gaeste.find((x) => x !== g && x.am && !x.gehen && !x.bedient && lauf.hand.some((h) => bereit(h) && h.id === x.wunsch));
      lauf.wackel['g' + g.id] = 0.35; hooks.ton('falsch');
      if (anderer) { lauf.wackel['g' + anderer.id] = 0.35; hooks.toast('Das ist für den anderen Gast - tippe ihn an!', 'hinweis'); return; }
      hooks.toast('Der Gast möchte etwas anderes - schau aufs Bläschen. Dein Glas bleibt stehen.', 'hinweis');
      lauf.fehlGast++;
      lauf.schwung = 0; lauf.schwungT = 0;
    }
    return;
  }
  const h = lauf.hand[i];
  lauf.hand.splice(i, 1);
  if (h.vonWichtel) lauf.wichtelSelbst = (lauf.wichtelSelbst || 0) + 1;
  const faktor = h.extraFertig ? 1 + (C.PRODUKT[h.id].bonus || C.EXTRA_BONUS) : 1;
  if (g.gross) return liefereGross(g, faktor);
  bediene(g, false, faktor);
}

/**
 * Wen bedient der Servier-Wichtel als Nächstes? Den ungeduldigsten Gast am
 * Tresen - aber keine besonderen Gäste und Großbestellungen (Sache des
 * Chefs) und keinen, für den schon ein Glas auf dem Tablett steht.
 */
function servierKandidat() {
  return lauf.gaeste.filter((x) => x.am && !x.bedient && !x.gehen && !x.gross && !x.ansturm && !C.GAESTE[x.typ].spezial && verfuegbar(x.wunsch)
    && !lauf.hand.some((h) => h.fuer === x.id))
    .sort((a, b) => a.geduld - b.geduld)[0] || null;
}
/** Für die Anzeige (tresen.js): welcher Gast ist dran, und wie weit ist der Wichtel? */
export function servierVorschau() {
  const sv = stufe('servier');
  if (!sv) return null;
  const g = servierKandidat();
  return g ? { id: g.id, anteil: Math.min(1, lauf.servierT / C.SERVIER_TAKT[sv]) } : null;
}

/**
 * Wichtel-Bestellung (seit 30.09., sobald der Servier-Wichtel da ist): Ein Tipp
 * auf den Gast heißt „Wichtel, schenk ihm ein". Ein Glas mit seinem Wunsch
 * kommt aufs Tablett und füllt sich sichtbar (kleiner Wichtel daneben, etwas
 * länger als von Hand). Serviert wird wie immer mit einem Tipp auf den Gast,
 * sobald es fertig ist - dazwischen ist Zeit für die Handgriffe.
 *
 * Vorher (29.09.) servierte der Tipp sofort, ohne Glas und ohne Zeit.
 * Gemeldet: Man verstand nicht, wann man den Gast direkt antippen kann und
 * wann alles von Hand geht, man sah den Wichtel nicht, und für Zuckerstange &
 * Co. blieb keine Zeit. Jetzt gibt es nur noch EINEN Weg zum Servieren.
 * Crêpes brauchen weiter die Platte. Gibt false zurück, wenn es nicht geht.
 */
function wichtelEinschenken(g) {
  const p = C.PRODUKT[g.wunsch];
  if (p.art === 'platte') return false;
  if ((st.toepfe[p.id] || 0) <= 0) {
    lauf.wackel['z' + p.id] = 0.3; hooks.ton('falsch');
    hooks.toast(`${p.name} ist leer - erst nachfüllen!`, 'hinweis');
    return true;
  }
  if (!wichtelGlas(g)) {
    lauf.wackel.hand = 0.3; hooks.ton('falsch');
    hooks.toast('Das Tablett ist voll - erst servieren oder in den Ausguss.', 'hinweis');
    return true;
  }
  lauf.bestellt = (lauf.bestellt || 0) + 1;
  return true;
}

/**
 * Der Wichtel stellt ein Glas mit dem Wunsch von g aufs Tablett und gießt ein
 * (ein leeres Glas vom Spül-Wichtel wird dafür genommen). false = kein Platz.
 */
function wichtelGlas(g) {
  const p = C.PRODUKT[g.wunsch];
  if (p.art === 'platte' || (st.toepfe[p.id] || 0) <= 0) return false;
  let i = lauf.hand.findIndex((h) => h.art === 'glas');
  if (i < 0) { if (lauf.hand.length >= handMax()) return false; i = lauf.hand.length; }
  st.toepfe[p.id]--;
  const zeit = p.zeit + C.WICHTEL_EINSCHENKEN;
  lauf.hand[i] = { art: 'voll', id: p.id, rest: zeit, dauer: zeit, vonWichtel: true, fuer: g.id, wartetT: 0, ...neueGriffe(p) };
  lauf.neuInHand = i; lauf.neuInHandT = 0.15;
  hooks.ton('giessen');
  return true;
}

/** Ein Glas an die Großbestellung. Bezahlt wird erst, wenn alles da ist. */
function liefereGross(g, faktor) {
  const gr = g.gross;
  gr.stand++; gr.wert += faktor;
  if (faktor > 1) zaehleErfolg('extras');
  if (lauf.schwungT > 0 && lauf.schwung === C.SCHWUNG_MAX - 1) zaehleErfolg('schwungVoll');
  lauf.schwung = lauf.schwungT > 0 ? Math.min(C.SCHWUNG_MAX, lauf.schwung + 1) : 1;
  lauf.schwungT = C.SCHWUNG_FENSTER;
  g.jubelT = C.JUBEL_ZEIT;
  hooks.ton('glas');
  if (gr.stand < gr.n) return;
  const p = C.PRODUKT[gr.id];
  // Je Glas der dreifache Preis - aber mindestens GROSS_MINUTEN Einnahmen,
  // sonst lohnt sie sich spät nicht mehr (dort kommen Gäste im Sekundentakt)
  const grund = Math.max(gr.wert * produktPreis(p) * preisFaktor() * C.GROSS_MULT, einnahmenProMinute() * C.GROSS_MINUTEN * gr.wert / gr.n);
  const betrag = grund * (1 + lauf.schwung * C.SCHWUNG_PRO) * dev.geld;
  verdiene(betrag);
  st.stats.bedient++;
  zaehleErfolg('gross');
  lauf.texte.push({ platz: g.platz, x: g.x, text: '+' + Math.round(betrag), t: 0, gross: true });
  hooks.bedient(g, false, false);
  lauf.herzen.push({ x: g.x, t: 0 });
  g.bedient = true;
  hooks.ton('spezialKasse');
  hooks.toast(`Großbestellung geschafft! +${formatGeld(betrag)}`, 'spezial');
  g.gehT = 1.0;
}

export function tippeAusguss() {
  if (!lauf.hand.length) return;
  lauf.hand = [];
  hooks.ton('ausguss');
}

function bediene(g, auto, faktor = 1) {
  const p = C.PRODUKT[g.wunsch];
  const def = C.GAESTE[g.typ];
  const b = boni();
  const stoss = lauf.t < lauf.stossBis ? lauf.stossMult : 1;
  // Trinkgeld gibt es seit 03.10. nur, wenn DU servierst - die Wichtel
  // kassieren nur den Preis. Selbst bedienen soll sich lohnen.
  const tip = auto ? 0 : C.TRINKGELD_MAX * (g.geduld / g.geduldMax) * (1 + b.trinkgeld) * stoss;
  let betrag = produktPreis(p) * preisFaktor() * (1 + tip) * (def.mult || 1) * (def.trink || 1) * (g.eilig ? C.EILIG_MULT : 1);
  const schwungVorher = lauf.schwung;
  if (!auto) {
    // Selbst serviert zählt doppelt (09.10., Nutzerwunsch: „wesentlich mehr
    // Sterne, wenn man selbst bedient") - die Wichtel kassieren nur den Preis
    betrag *= C.SELBST_MULT;
    if (Date.now() < (st.zimtBis || 0)) betrag *= C.HAENDLER_GUTSCHEIN.mult;   // Zimtstern-Gutschein vom Händler
    lauf.schwung = lauf.schwungT > 0 ? Math.min(C.SCHWUNG_MAX, lauf.schwung + 1) : 1;
    lauf.schwungT = C.SCHWUNG_FENSTER;
    betrag *= 1 + lauf.schwung * C.SCHWUNG_PRO;
  }
  betrag *= faktor * dev.geld;
  verdiene(betrag);
  st.stats.bedient++;
  zaehleBedient(g, auto, faktor, schwungVorher);
  lauf.texte.push({ platz: g.platz, x: g.x, text: '+' + Math.round(betrag), t: 0, gross: !!def.spezial || g.eilig });
  hooks.bedient(g, auto, lauf.t < lauf.stossBis);
  lauf.herzen.push({ x: g.x, t: 0 });
  if (auto) lauf.elfen.push({ platz: g.platz, t: 0 });
  else g.jubelT = C.JUBEL_ZEIT;   // sichtbare Freude, wenn DU bedient hast
  g.bedient = true;
  hooks.ton(def.spezial ? 'spezialKasse' : 'kasse');
  if (g.typ === 'grummel') hooks.toast('Der Grummel lächelt! Zum ersten Mal seit Jahren.', 'spezial');
  g.gehT = 0.7;   // kurz stehen bleiben und sich freuen
}

/** Zähler für die Erfolgswand (erfolge.js) - alte Spielstände haben die Felder noch nicht. */
function zaehleErfolg(k, n = 1) { st.stats[k] = (st.stats[k] || 0) + n; }
/** Nach jedem Bedienen: Gästeart, Serie ohne Verpassten, voller Schwung, Extras. */
function zaehleBedient(g, auto, faktor, schwungVorher) {
  st.stats.typ = st.stats.typ || {};
  st.stats.typ[g.typ] = (st.stats.typ[g.typ] || 0) + 1;
  zaehleErfolg('serie');
  if (st.stats.serie > (st.stats.serieBest || 0)) st.stats.serieBest = st.stats.serie;
  if (auto) return;
  if (g.eilig) zaehleErfolg('eilig');
  if (faktor > 1) zaehleErfolg('extras');
  if (lauf.schwung >= C.SCHWUNG_MAX && schwungVorher < C.SCHWUNG_MAX) zaehleErfolg('schwungVoll');
}

// ---------------------------------------------------------------------------
// Takt
// ---------------------------------------------------------------------------
export function update(dt) {
  lauf.t += dt;
  lauf.chefT += dt;
  const G = lauf.gaeste;
  const wt = dt * wichtelTempo();   // Wichtel-Zeit: schneller, wenn du da bist

  // Großbestellung: nur wenn du da bist und der Stand zwei Plätze hat -
  // sonst blockiert sie den einzigen Platz
  if (lauf.t >= lauf.grossAb && chefAktiv() && st.lernen >= 99 && st.stats.bedient >= C.GROSS_AB_BEDIENT
      && tresenPlaetze() >= 2 && lauf.stossRest === 0 && wartende().length < C.SCHLANGE_MAX
      && !G.some((g) => g.gross && !g.gehen)) {
    lauf.grossAb = lauf.t + C.GROSS_PAUSE * (0.8 + Math.random() * 0.4);
    const frei = produkteFrei().filter((p) => p.art !== 'platte');
    const p = frei[Math.floor(Math.random() * frei.length)];
    const n = 3 + 2 * handMax();
    const name = C.STOSS_GRUPPEN[Math.floor(Math.random() * C.STOSS_GRUPPEN.length)];
    const g = neuerGast('erwachsen', { id: p.id, n, stand: 0, wert: 0, name, zeit: C.GROSS_ZEIT_BASIS + n * C.GROSS_ZEIT_JE });
    if (g) { hooks.toast(`${name} bestellt ${n} × ${p.name}!`, 'spezial'); hooks.ton('spezial'); }
  }

  // Stoßzeit: wer länger spielt, bekommt Besuch
  lauf.aktivT += dt;
  if (lauf.aktivT >= C.STOSS_NACH && lauf.stossRest === 0 && lauf.t > lauf.stossBis && produkteFrei().length >= 2) {
    lauf.aktivT = 0;
    lauf.stossRest = C.STOSS_GAESTE;
    lauf.stossBis = lauf.t + C.STOSS_DAUER;
    lauf.stossMult = 2; lauf.ansturm = false;
    lauf.stossName = C.STOSS_GRUPPEN[Math.floor(Math.random() * C.STOSS_GRUPPEN.length)];
    hooks.toast(`${lauf.stossName} kommt! Doppeltes Trinkgeld.`, 'spezial');
    hooks.ton('spezial');
  }

  // Tagesansturm: einmal am (echten) Tag, nach ANSTURM_NACH s, in denen DU
  // am Stand warst. Kurz, laut, dreifaches Trinkgeld, und die Wichtel
  // schauen nur zu - der Moment, für den man reinschaut.
  if (chefAktiv() && !lauf.lernen) lauf.ansturmT += dt;
  if (lauf.ansturm && lauf.t >= lauf.stossBis) lauf.ansturm = false;
  if (lauf.ansturmT >= C.ANSTURM_NACH && st.ansturmTag !== echtMitternacht() && st.lernen >= 99
      && lauf.stossRest === 0 && lauf.t > lauf.stossBis && produkteFrei().length >= 2) {
    st.ansturmTag = echtMitternacht();
    lauf.stossRest = C.ANSTURM_GAESTE;
    lauf.stossBis = lauf.t + C.ANSTURM_DAUER;
    lauf.stossMult = C.ANSTURM_MULT; lauf.ansturm = true;
    lauf.aktivT = 0;
    hooks.toast(`Ansturm! ${C.ANSTURM_DAUER} Sekunden dreifaches Trinkgeld - nur wenn DU servierst.`, 'spezial');
    hooks.ton('spezial');
    speichere();
  }

  // Der erste Sondergast kommt garantiert früh - die erste Überraschung
  // soll nicht erst nach 20 Minuten kommen
  if (!st.ersterSonder && st.lernen >= 99 && chefAktiv() && sonderBereit() && lauf.t > C.ERSTER_SONDERGAST && wartende().length < C.SCHLANGE_MAX) {
    st.ersterSonder = true; neuerGast('rentier');
  }

  // Neue Gäste
  lauf.spawnT -= dt;
  const unterwegs = wartende().length;
  if (lauf.spawnT <= 0) {
    // Während der Einführung kommt immer nur EIN Gast, und der wartet geduldig
    // Beim Ansturm darf die Schlange länger werden, sonst kämen die Gäste
    // bei vollem Stand erst, wenn die 60 s fast um sind
    const grenze = lauf.lernen ? 1 : C.SCHLANGE_MAX + tresenPlaetze() + (lauf.ansturm ? 4 : 0);
    if (unterwegs < grenze) {
      if (lauf.stossRest > 0) { const g = neuerGast(waehleTyp(false)); if (g && lauf.ansturm) g.ansturm = true; lauf.stossRest--; }
      else neuerGast();
    }
    lauf.spawnT = lauf.stossRest > 0 ? 0.9 : gastTakt() * (0.6 + Math.random() * 0.8);
  }

  // Plätze am Tresen vergeben (in Reihenfolge der Ankunft)
  const n = tresenPlaetze();
  const belegt = new Set(G.filter((g) => g.platz != null).map((g) => g.platz));
  for (let i = 0; i < n; i++) {
    if (belegt.has(i)) continue;
    const naechster = G.find((g) => !g.gehen && g.platz == null);
    if (!naechster) break;
    naechster.platz = i; belegt.add(i);
  }

  // Bewegen
  let reihe = 0;
  // Wessen Getränk ist gerade in Arbeit? Je Glas der ungeduldigste Gast am
  // Tresen mit genau diesem Wunsch. Der geht nicht mehr weg - sonst stand
  // nach dem Einschenken plötzlich jemand anderes da, und man lieferte
  // „falsch", ohne etwas falsch gemacht zu haben (Betatest 02.10.).
  // Großbestellungen nicht: deren Uhr ist die Aufgabe.
  const reserviert = new Set();
  for (const h of lauf.hand) {
    if (h.art !== 'voll') continue;
    const g = G.filter((x) => x.am && !x.bedient && !x.gehen && !x.gross && x.wunsch === h.id && !reserviert.has(x.id))
      .sort((a, b) => a.geduld - b.geduld)[0];
    if (g) reserviert.add(g.id);
  }
  for (const g of G) {
    const def = C.GAESTE[g.typ];
    let ziel;
    if (g.gehen) ziel = ENDE_X;
    else if (g.platz != null) ziel = TRESEN_X[g.platz];
    else ziel = SCHLANGE_X0 - (reihe++) * SCHLANGE_ABSTAND;

    if (g.gehT > 0) { g.gehT -= dt; g.laeuft = false; if (g.gehT <= 0) gehe(g, true); continue; }

    const d = ziel - g.x;
    const schritt = def.tempo * (g.gehen ? 1.3 : 1) * dt;
    // Wer in der Schlange hinter jemandem steht, läuft nicht auf
    if (Math.abs(d) <= schritt) { g.x = ziel; g.laeuft = false; }
    else { g.x += Math.sign(d) * schritt; g.laeuft = true; }

    if (g.gehen) continue;
    g.am = g.platz != null && !g.laeuft;
    if (lauf.lernen) continue;
    if (g.am && !g.bedient) {
      if (reserviert.has(g.id)) g.geduld = Math.max(Math.min(g.geduld, C.GEDULD_RESERVIERT), g.geduld - dt);
      else g.geduld -= dt;
      if (g.geduld <= 0) gehe(g, false);
    } else if (g.platz == null && !g.laeuft) {
      g.schlange -= dt;
      if (g.schlange <= 0) gehe(g, false);
    }
  }
  lauf.gaeste = G.filter((g) => !(g.gehen && g.x >= ENDE_X));

  // Zubereitung auf dem Tablett
  for (const h of lauf.hand) {
    if (h.rest > 0) { h.rest -= dt; if (h.rest <= 0) hooks.ton('fertig'); }
    if (h.brennT > 0) { h.brennT -= dt; if (h.brennT <= 0) { h.brennT = 0; griffWeiter(h); h.flammeT = C.FEUER_FENSTER; hooks.ton('fertig'); } }
    // Feuerzauber: nur solange er brennt, gibt es den Bonus
    if (h.flammeT > 0) { h.flammeT -= dt; if (h.flammeT <= 0) { h.flammeT = 0; h.extraFertig = false; h.verpasst = true; hooks.toast('Der Zuckerhut ist ausgegangen - diesmal ohne Bonus.', 'hinweis'); } }
    // Waldtee: der Beutel zieht; wer ihn nicht rechtzeitig herausnimmt, hat bitteren Tee
    if (h.extra === 'beutel' && !(h.rest > 0)) {
      h.ziehT += dt;
      if (h.ziehT >= C.HANDGRIFF.beutel.timing.dauer) griffVerpasst(h, 'Zu lange gezogen - der Tee ist bitter geworden. Diesmal ohne Bonus.');
    }
  }
  // Spül-Wichtel: stellt nach und nach saubere Gläser aufs Tablett
  if (hat('spuel') && lauf.hand.length < handMax()) {
    lauf.spuelT = (lauf.spuelT || 0) + wt;
    if (lauf.spuelT >= C.SPUEL_ZEIT) { lauf.hand.push({ art: 'glas' }); lauf.spuelT = 0; hooks.ton('glas'); }
  } else lauf.spuelT = 0;

  // Schwung reißt nach einer Pause
  if (lauf.schwungT > 0) { lauf.schwungT -= dt; if (lauf.schwungT <= 0) lauf.schwung = 0; }

  // Nachfüll-Wichtel
  const nf = stufe('nachfuell');
  for (const p of produkteFrei()) {
    if (p.art === 'platte') continue;
    if ((st.toepfe[p.id] || 0) > 0) { lauf.nachfuellT[p.id] = 0; continue; }
    if (!nf) continue;
    lauf.nachfuellT[p.id] = (lauf.nachfuellT[p.id] || 0) + wt;
    if (lauf.nachfuellT[p.id] >= C.NACHFUELL_ZEIT[nf]) {
      st.toepfe[p.id] = topfMax(); lauf.nachfuellT[p.id] = 0; lauf.fuellen[p.id] = 0;
      lauf.gefuellt[p.id] = 0.6;   // der Wichtel hüpft davon
      hooks.ton('voll');
    }
  }
  for (const k in lauf.gefuellt) { lauf.gefuellt[k] -= dt; if (lauf.gefuellt[k] <= 0) delete lauf.gefuellt[k]; }

  // Crêpe-Platte
  const cr = lauf.crepe;
  if (cr.backT >= 0) {
    cr.backT += hat('crepe_w') ? wt : dt;
    if (cr.backT >= C.CREPE_ZEIT) { cr.backT = -1; cr.fertig = true; hooks.ton('fertig'); }
  } else if (!cr.fertig && hat('crepe_w') && hat('crepe')) { cr.backT = 0; cr.gewendet = false; cr.verpasst = false; }

  // Servier-Wichtel. Bist du am Stand, bedient er nicht sofort, sondern
  // schenkt sichtbar auf dein Tablett ein - dann hast du Zeit für den
  // Handgriff und servierst selbst. Holst du es nicht ab, serviert er es nach
  // WICHTEL_WARTEN selbst (ohne Bonus, außer du hast den Handgriff gemacht).
  // Bist du weg oder ist das Tablett voll, bedient er wie früher direkt.
  // (Gemeldet 30.09.: „Man sieht nicht, dass die Wichtel einfüllen, es wird
  // gleich bedient" - vorher bediente er jeden Gast sofort, ohne Glas.)
  const sv = stufe('servier');
  if (sv) {
    for (let i = lauf.hand.length - 1; i >= 0; i--) {
      const h = lauf.hand[i];
      if (!h.vonWichtel || h.rest > 0 || h.brennT > 0) continue;
      const g = G.find((x) => x.id === h.fuer && x.am && !x.bedient && !x.gehen);
      if (!g) { h.fuer = null; continue; }   // Gast weg: das Glas bleibt, passt vielleicht zum nächsten
      h.wartetT = (h.wartetT || 0) + dt;
      if (h.wartetT >= C.WICHTEL_WARTEN || !chefAktiv()) {
        lauf.hand.splice(i, 1);
        bediene(g, true, h.extraFertig ? 1 + (C.PRODUKT[h.id].bonus || C.EXTRA_BONUS) : 1);
      }
    }
    lauf.servierT += wt;
    if (lauf.servierT >= C.SERVIER_TAKT[sv]) {
      const g = servierKandidat();
      if (g) {
        if (!(chefAktiv() && wichtelGlas(g))) {
          const p = C.PRODUKT[g.wunsch];
          if (p.art === 'platte') lauf.crepe.fertig = false; else st.toepfe[p.id]--;
          bediene(g, true);
        }
        lauf.servierT = 0;
      }
    }
  }

  // Der Nikolaus fliegt vorbei
  if (!lauf.schlitten && lauf.t >= lauf.schlittenAb && st.lernen >= 99) {
    lauf.schlitten = { t: 0, dauer: C.SCHLITTEN_DAUER, y: 0.12 + Math.random() * 0.3, gefangen: null };
    lauf.schlittenAb = lauf.t + C.SCHLITTEN_PAUSE[0] + Math.random() * (C.SCHLITTEN_PAUSE[1] - C.SCHLITTEN_PAUSE[0]);
    hooks.ton('glocken');
  }
  haendlerTakt(dt);
  marktAnsage();
  if (lauf.schlitten) { lauf.schlitten.t += dt; if (lauf.schlitten.t >= lauf.schlitten.dauer) lauf.schlitten = null; }
  for (const g of G) if (g.jubelT > 0) g.jubelT -= dt;

  // Einblendungen altern
  for (const x of lauf.texte) x.t += dt;
  lauf.texte = lauf.texte.filter((x) => x.t < 1.2);
  for (const x of lauf.herzen) x.t += dt;
  lauf.herzen = lauf.herzen.filter((x) => x.t < 1.0);
  for (const x of lauf.elfen) x.t += dt;
  lauf.elfen = lauf.elfen.filter((x) => x.t < 0.6);
  for (const k of lauf.klicks) k.t += dt;
  lauf.klicks = lauf.klicks.filter((k) => k.t < 0.35);
  if (lauf.druck) { lauf.druck.t -= dt; if (lauf.druck.t <= 0) lauf.druck = null; }
  if (lauf.neuInHandT > 0) lauf.neuInHandT -= dt;
  for (const k in lauf.wackel) { lauf.wackel[k] -= dt; if (lauf.wackel[k] <= 0) delete lauf.wackel[k]; }
}

// ---------------------------------------------------------------------------
// Der fahrende Händler (09.10.)
// ---------------------------------------------------------------------------
/** Wie oft war er heute schon da? */
function haendlerHeute() { return st.haendler && st.haendler.tag === echtMitternacht() ? st.haendler.n : 0; }
/** Bis zu drei Deko-Stücke, die man noch nicht hat - in zufälliger Reihenfolge. */
function haendlerAngebot() {
  const rest = C.HAENDLER_DEKO.filter((d) => !st.kalDeko[d.id]).map((d) => d.id);
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  return rest.slice(0, 3);
}
/** Preis einer Ware: so viele Minuten Einnahmen, glatt gerundet, mindestens `min`. */
export function haendlerPreis(w) {
  const roh = Math.max(w.min, einnahmenProMinute() * w.minuten);
  const stelle = Math.pow(10, Math.max(0, Math.floor(Math.log10(roh)) - 1));
  return Math.round(roh / stelle) * stelle;
}
function haendlerTakt(dt) {
  if (chefAktiv() && !lauf.lernen) lauf.haendlerT += dt;
  // Erst nach dem Hinweis auf die Karte: Vorher kam er nach 2,5 Minuten,
  // bevor man die erste Deko kannte (Betatest 2)
  if (!lauf.haendler && lauf.haendlerT >= lauf.haendlerAb && st.lernen >= 99 && st.tipps && st.tipps.karte_mehr && produkteFrei().length >= 2
      && haendlerHeute() < C.HAENDLER_PRO_TAG) {
    st.haendler = { tag: echtMitternacht(), n: haendlerHeute() + 1 };
    lauf.haendler = { x: -26, t: 0, phase: 'kommt', angebot: haendlerAngebot(), gutschein: true };
    lauf.haendlerAb = lauf.haendlerT + C.HAENDLER_PAUSE;
    hooks.toast('Der fahrende Händler kommt die Straße entlang!', 'spezial');
    hooks.ton('spezial');
    speichere();
  }
  const h = lauf.haendler;
  if (!h) return;
  h.t += dt;
  const tempo = 14;
  if (h.phase === 'kommt') {
    h.x = Math.min(C.HAENDLER_X, h.x + tempo * dt);
    if (h.x >= C.HAENDLER_X) { h.phase = 'steht'; h.t = 0; }
  } else if (h.phase === 'steht') {
    if (h.t >= C.HAENDLER_BLEIBT) { h.phase = 'geht'; hooks.toast('Der Händler zieht weiter.', 'hinweis'); }
  } else {
    h.x -= tempo * dt;
    if (h.x < -30) lauf.haendler = null;
  }
}
/** Kann man ihn gerade antippen? (auch schon, während er ankommt) */
export const haendlerDa = () => !!lauf.haendler && lauf.haendler.phase !== 'geht';
/**
 * Beim Händler kaufen. Deko gehört danach dauerhaft dazu (wie Geschenktes,
 * `st.kalDeko`), der Gutschein läuft sofort. Gibt true zurück, wenn gekauft.
 */
export function kaufeBeimHaendler(id) {
  const h = lauf.haendler;
  if (!h) return false;
  const w = id === C.HAENDLER_GUTSCHEIN.id ? C.HAENDLER_GUTSCHEIN : C.HAENDLER_DEKO.find((d) => d.id === id);
  if (!w) return false;
  const preis = haendlerPreis(w);
  if (st.geld < preis) return false;
  if (w === C.HAENDLER_GUTSCHEIN) {
    if (!h.gutschein) return false;
    h.gutschein = false;
    st.zimtBis = Math.max(Date.now(), st.zimtBis || 0) + w.dauer * 1000;
  } else {
    if (st.kalDeko[id]) return false;
    st.kalDeko[id] = true;
    h.angebot = h.angebot.filter((x) => x !== id);
  }
  st.geld -= preis;
  hooks.ton('kauf');
  hooks.geld();
  speichere();
  return true;
}
/** Restzeit des Zimtstern-Gutscheins in Sekunden (0 = keiner). */
export const zimtRest = () => Math.max(0, Math.ceil(((st.zimtBis || 0) - Date.now()) / 1000));

// ---------------------------------------------------------------------------
// Der Weihnachtsmarkt (09.10.)
// ---------------------------------------------------------------------------
/** Spieltag als ganze Zahl (Tage seit 1970, nach der Spieluhr). */
const tagNr = () => Math.round(echtMitternacht() / 86400000);
function marktStand() {
  if (!st.markt) st.markt = { anker: tagNr(), seed: Math.floor(Math.random() * 1e6), besucht: 0, angesagt: 0 };
  return st.markt;
}
/** Ist an Tag `d` Markt? Erster Markt MARKT_ERST Tage nach dem Anker, dann alle 3-4 Tage. */
function istMarkt(d) {
  const m = marktStand();
  let k = m.anker + C.MARKT_ERST;
  while (k < d) k += C.MARKT_ABSTAND[0] + (Z.hash(m.seed + k) < 0.5 ? 0 : C.MARKT_ABSTAND[1] - C.MARKT_ABSTAND[0]);
  return k === d;
}
/** Erst nach der Einführung - davor gibt es keinen Markt und keine Ansage. */
export const marktHeute = () => st.lernen >= 99 && istMarkt(tagNr());
/** { heute, inTagen, datum } des nächsten Markts. */
export function marktInfo() {
  const heute = tagNr();
  let n = 0;
  while (n < 10 && !istMarkt(heute + n)) n++;
  const datum = new Date(echtMitternacht() + n * 86400000 + 12 * 3600000);
  return { heute: st.lernen >= 99 && n === 0, inTagen: n, datum };
}
/** Heutiges Angebot: Deko (bis MARKT_ANGEBOT, die man nicht hat, je Tag gemischt) und ein Rezept. */
export function marktAngebot() {
  const d = tagNr();
  const rest = C.MARKT_DEKO.filter((x) => !st.kalDeko[x.id]);
  rest.sort((a, b) => Z.hash(d * 7 + a.id.length * 13 + a.id.charCodeAt(2)) - Z.hash(d * 7 + b.id.length * 13 + b.id.charCodeAt(2)));
  const rezept = C.MARKT_REZEPTE.find((x) => !(st.rezepte || {})[x.id] && x.fuer.some((id) => hat(id) || id === 'gluehwein'));
  return { deko: rest.slice(0, C.MARKT_ANGEBOT), rezept: rezept || null };
}
/** Aufschlag eines Getränks durch Rezepte vom Markt. */
export function produktPreis(p) {
  let f = 1;
  if (st.rezepte) for (const x of C.MARKT_REZEPTE) if (st.rezepte[x.id] && x.fuer.includes(p.id)) f += x.plus;
  return p.preis * f;
}
/** Auf dem Markt kaufen (Deko oder Rezept). true = gekauft. */
export function kaufeAufMarkt(id) {
  if (!marktHeute()) return false;
  const a = marktAngebot();
  const w = a.deko.find((x) => x.id === id) || (a.rezept && a.rezept.id === id ? a.rezept : null);
  if (!w) return false;
  const preis = haendlerPreis(w);
  if (st.geld < preis) return false;
  if (w.fuer) { st.rezepte = st.rezepte || {}; st.rezepte[id] = true; } else st.kalDeko[id] = true;
  st.geld -= preis;
  hooks.ton('kauf'); hooks.geld();
  speichere();
  return true;
}
/** Heute schon über den Markt gelaufen? (für die Zielleiste) */
export const marktBesucht = () => marktStand().besucht === tagNr();
export function marktBesuchen() { marktStand().besucht = tagNr(); speichere(); }
/** Einmal je Tag ansagen: heute Markt, oder in ein paar Tagen. */
function marktAnsage() {
  // Erst, wenn man die Karte kennt (Hinweis `karte_mehr`) - vorher kam die
  // Ansage in Sekunde 14 des allerersten Spiels (Betatest 2)
  if (st.lernen < 99 || !st.tipps || !st.tipps.karte_mehr || lauf.t < 8 || lauf.marktAngesagt) return;
  lauf.marktAngesagt = true;
  const m = marktStand();
  if (m.angesagt === tagNr()) return;
  const i = marktInfo();
  if (i.inTagen > C.MARKT_ANSAGE) return;
  m.angesagt = tagNr();
  if (i.heute) { hooks.toast('Heute ist Weihnachtsmarkt auf dem Festplatz! Schau auf der Karte vorbei.', 'spezial'); hooks.ton('spezial'); }
  else hooks.toast(i.inTagen === 1 ? 'Morgen ist Weihnachtsmarkt auf dem Festplatz!' : `In ${i.inTagen} Tagen ist Weihnachtsmarkt auf dem Festplatz!`, 'hinweis');
  speichere();
}

// ---------------------------------------------------------------------------
// Minispiel Waldlichtung (09.10.)
// ---------------------------------------------------------------------------
// Gemeinsam für alle Minispiele (09.10.): je Spiel Rekord und Runden am Tag
// in st.mini[name]; die Lichtung hatte vorher st.lichtung - der wird übernommen.
function miniStand(name) {
  st.mini = st.mini || {};
  if (!st.mini[name]) st.mini[name] = (name === 'lichtung' && st.lichtung) || { best: 0, tag: 0, runden: 0 };
  const m = st.mini[name];
  if (m.tag !== echtMitternacht()) { m.tag = echtMitternacht(); m.runden = 0; }
  return m;
}
/** Wie viele Runden mit Sternen heute noch übrig sind. */
export const miniRest = (name) => Math.max(0, C.MINI_RUNDEN_STERNE - miniStand(name).runden);
export const miniRekord = (name) => miniStand(name).best;
/** Nach einer Runde: Sterne (nur die ersten Runden am Tag), Rekord, neue Deko. */
export function miniErgebnis(name, punkte) {
  const l = miniStand(name), def = C.MINISPIELE[name];
  const mitSternen = l.runden < C.MINI_RUNDEN_STERNE;
  l.runden++;
  const sterne = mitSternen && punkte > 0 ? Math.max(20, Math.round(einnahmenProMinute() * Math.min(def.maxMin, punkte / def.jeMin))) : 0;
  if (sterne) verdiene(sterne);
  const vorher = l.best;
  if (punkte > l.best) l.best = punkte;
  const neu = def.deko.filter((d) => !st.kalDeko[d.id] && l.best >= d.ab);
  st.neu = st.neu || {};
  for (const d of neu) { st.kalDeko[d.id] = true; st.neu[d.id] = true; }
  speichere();
  return { sterne, rekord: punkte > vorher && vorher > 0, best: l.best, neu, rest: miniRest(name) };
}
export const lichtungRest = () => miniRest('lichtung');
export const lichtungRekord = () => miniRekord('lichtung');
export const lichtungErgebnis = (punkte) => miniErgebnis('lichtung', punkte);

/** Den Nikolaus angetippt: Sterne! Gibt den Betrag zurück (oder 0). */
export function fangeSchlitten() {
  const sl = lauf.schlitten;
  if (!sl || sl.gefangen != null) return 0;
  sl.gefangen = sl.t;
  zaehleErfolg('nikolaus');
  const betrag = Math.round(Math.max(C.SCHLITTEN_MIN, einnahmenProMinute() * C.SCHLITTEN_MINUTEN) * dev.geld);
  verdiene(betrag);
  hooks.ton('spezialKasse');
  hooks.toast(`Ho ho ho! Der Nikolaus schenkt dir ${formatGeld(betrag)}!`, 'spezial');
  return betrag;
}

// ---------------------------------------------------------------------------
// Während die App zu war
// ---------------------------------------------------------------------------
export function durchschnittsPreis() {
  const frei = produkteFrei();
  let s = 0, w = 0;
  for (const p of frei) { const g = 1 + C.PRODUKTE.indexOf(p) * 0.15; s += produktPreis(p) * g; w += g; }
  return w ? s / w : 0;
}

/** Die Kiste öffnen: alles, was die Wichtel verdient haben. Gibt den Betrag zurück. */
export function oeffneKiste() {
  const b = st.kiste || 0;
  st.kiste = 0; st.kisteGaeste = 0;
  if (b > 0) verdiene(b);
  speichere();
  return b;
}

/**
 * Grobe Einnahmen je Minute, als Maßstab für Belohnungen (Aufträge,
 * Nikolaus, Großbestellung). Früher mit Gastabstand mindestens 2,2 s
 * gerechnet - im späten Spiel (1 s) lag die Schätzung damit bei einem
 * Fünftel der echten Einnahmen, und Handarbeit lohnte sich kaum noch.
 */
export function einnahmenProMinute() {
  return durchschnittsPreis() * preisFaktor() * 60 / Math.max(gastTakt(), C.GAST_MIN);
}

/** Wichtel-Einnahmen je Sekunde (ohne Offline-Abschlag). */
export function wichtelProSekunde() {
  const sv = stufe('servier');
  if (!sv) return 0;
  const rate = Math.min(1 / C.SERVIER_TAKT[sv], 1 / gastTakt());
  return rate * durchschnittsPreis() * preisFaktor();   // Trinkgeld gibt es nur für dich
}

export function offlineAbrechnen() {
  const weg = (Date.now() - st.zuletzt) / 1000;
  if (weg < C.OFFLINE_AB) return null;
  const sek = Math.min(weg, offlineStunden() * 3600);
  const sv = stufe('servier');
  if (!sv) return { sek, betrag: 0, portionen: 0 };
  const rate = Math.min(1 / C.SERVIER_TAKT[sv], 1 / gastTakt());
  // Die ersten INAKTIV_AB Sekunden arbeiten sie voll, danach nur noch ein Fünftel
  const voll = Math.min(sek, C.INAKTIV_AB);
  let n = (voll + (sek - voll) * offlineAnteil()) * rate;
  // Ohne Nachfüll-Wichtel ist nach den vollen Töpfen Schluss
  if (!stufe('nachfuell')) {
    const vorrat = produkteFrei().filter((p) => p.art !== 'platte').reduce((a, p) => a + (st.toepfe[p.id] || 0), 0);
    if (n >= vorrat) { n = vorrat; for (const p of produkteFrei()) if (p.art !== 'platte') st.toepfe[p.id] = 0; }
  }
  n = Math.floor(n);
  const betrag = Math.round(n * durchschnittsPreis() * preisFaktor() * dev.geld);
  // Kurz weg: gleich gutschreiben. Länger weg: in die Kiste - die öffnet man
  // selbst (der Moment „ich komme zurück, und es ist viel passiert"). Sie
  // bleibt gespeichert, falls man die App vorher wieder zumacht.
  if (betrag > 0) {
    if (sek < C.OFFLINE_FENSTER) verdiene(betrag);
    else { st.kiste = (st.kiste || 0) + betrag; st.kisteGaeste = (st.kisteGaeste || 0) + n; }
  }
  st.stats.bedient += n;
  return { sek, betrag, portionen: n };
}

// ---------------------------------------------------------------------------
// Adventskalender
// ---------------------------------------------------------------------------
/** Was schaltet der n-te Advent frei? (für den Ereignistext) */
export function adventFreischaltungen(n) {
  return C.ARTIKEL.filter((a) => C.FREI[a.id]?.advent === n).map((a) => artikelName(a.id));
}
/** Welche Adventsereignisse sind neu? Merkt sie sich als gesehen. */
export function neueAdventsereignisse() {
  const k = Z.adventKerzen();
  st.adventGesehen = st.adventGesehen || 0;
  const neu = [];
  for (let n = st.adventGesehen + 1; n <= k; n++) neu.push(n);
  st.adventGesehen = Math.max(st.adventGesehen, k);
  return neu;
}

export function tuerOffen(n) { return !!st.kalender[n]; }
export function tuerBereit(n) {
  const ph = Z.phase();
  return (ph === 'advent' || ph === 'weihnacht' || ph === 'winter') && Z.dezemberTag() >= n && !tuerOffen(n);
}
export function oeffneTuer(n) {
  if (!tuerBereit(n)) return null;
  st.kalender[n] = true;
  const deko = C.KALENDER_DEKO[n];
  let ergebnis;
  if (deko) { st.kalDeko[deko.id] = true; st.neu = st.neu || {}; st.neu[deko.id] = true; ergebnis = { deko }; }
  else {
    const betrag = Math.max(C.KALENDER_GELD_MIN, Math.round(st.gesamt * C.KALENDER_GELD_ANTEIL));
    st.geld += betrag; hooks.geld();
    ergebnis = { betrag };
  }
  speichere();
  return ergebnis;
}
/**
 * Vorfreude-Päckchen: vor dem 1. Dezember eins je Spieltag im Kalender,
 * ab dem zweiten Tag (am ersten kennt man das Spiel ja gerade erst - und
 * „morgen wartet ein Päckchen" ist der Grund wiederzukommen).
 * `st.vorfreude` = Mitternacht des Tages, an dem es zuletzt geöffnet wurde.
 */
export function vorfreudeBereit() {
  return Z.phase() === 'herbst' && st.lernen >= 99 && spieltag() >= 1 && st.vorfreude !== heuteMitternacht();
}
export function oeffneVorfreude() {
  if (!vorfreudeBereit()) return 0;
  st.vorfreude = heuteMitternacht();
  st.vorfreudeZahl = (st.vorfreudeZahl || 0) + 1;
  const betrag = Math.max(C.VORFREUDE_MIN, Math.round(st.gesamt * C.VORFREUDE_ANTEIL / 10) * 10);
  st.geld += betrag; hooks.geld();
  speichere();
  return betrag;
}
/** Was im Kalender wartet: offene Türchen plus ein Vorfreude-Päckchen. */
export function offeneTueren() {
  let n = vorfreudeBereit() ? 1 : 0;
  for (let i = 1; i <= 24; i++) if (tuerBereit(i)) n++;
  return n;
}
