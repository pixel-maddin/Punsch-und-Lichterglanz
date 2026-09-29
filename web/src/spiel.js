/*
 * spiel.js - Spielzustand und Regeln. Kein Zeichnen, kein DOM.
 *
 * `st`   = was gespeichert wird (Geld, Besitz, Töpfe, Kalender …)
 * `lauf` = was nur in dieser Sitzung lebt (Gäste, Hand, Schwung …)
 *
 * Meldungen nach außen (Ton, Einblendung) gehen über `hooks`, die
 * main.js setzt - so bleibt diese Datei ohne Abhängigkeit auf UI und Ton.
 */
import * as C from './config.js?v=20260929q';
import * as Z from './zeit.js?v=20260929q';
import { neueFarben } from './pixel.js?v=20260929q';

const SCHLUESSEL = 'adventshaus.v1';

export const hooks = { ton() {}, toast() {}, geld() {}, musik() {}, bedient() {} };

// Positionen auf der Straße (Weltpixel x)
export const TRESEN_X = [136, 150, 164];
const SCHLANGE_X0 = 122, SCHLANGE_ABSTAND = 11;
const START_X = -12, ENDE_X = 196;

// ---------------------------------------------------------------------------
// Gespeicherter Zustand
// ---------------------------------------------------------------------------
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
    modus: 'echt', versatzTage: 0,   // 'echt' = echter Kalender, 'eigen' = Start eine Woche vor dem 1.12.   // Freischaltungen: schon angesagt / noch nicht angesehen
  };
}

function laden() {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (roh) return Object.assign(neuerStand(), JSON.parse(roh));
  } catch (e) { /* kaputter Spielstand: neu anfangen */ }
  return neuerStand();
}

export let st = laden();
// Alte Spielstände: „Bunte Lichter" galt einmal für ALLE Ketten, jetzt hat
// jede Kette ihren eigenen Schalter - übernommen wird das Dach
if (st.lichtfarbe === 'bunt' && !st.bunt) st.bunt = { dach: true };
// Die Bunt-Artikel gibt es nicht mehr (Farbe ist frei wählbar): ihre NEU-Marken aufräumen
if (st.neu) for (const k of Object.keys(st.neu)) if (!C.ARTIKEL.some((x) => x.id === k) && !/^(kal|auf)_/.test(k)) delete st.neu[k];
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
    crepe: { backT: -1, fertig: false },
    nachfuellT: {}, fuellen: {},   // Wichtel-Uhr bzw. Tippfortschritt je Topf
    texte: [], herzen: [], elfen: [],
    lernen: false, fehlGast: 0,
    klicks: [], druck: null, neuInHand: -1, neuInHandT: 0,   // sichtbare Rückmeldung beim Tippen
    aktivT: 0, spezialAb: 20, stossRest: 0, stossBis: 0, stossName: '',
    wackel: {},                     // kurzes Wackeln je Topf/Gast bei Fehlern
    chefT: 0,                       // s seit dem letzten Tippen am Stand (Start zählt als da)
    grossAb: C.GROSS_ERST,          // frühestens dann die nächste Großbestellung
    gefuellt: {},                   // Nachfüll-Wichtel ist gerade fertig (Abgang)
    schlitten: null, schlittenAb: C.SCHLITTEN_ERST,   // der Nikolaus am Himmel
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
  return s;
}

export function boni() {
  const b = { preis: 0, trinkgeld: 0, geduld: 0, gaeste: 0 };
  for (const a of C.ARTIKEL) {
    if (!a.bonus || !stufe(a.id)) continue;
    const f = a.bonusJeStufe ? stufe(a.id) : 1;
    for (const k in a.bonus) b[k] += a.bonus[k] * f;
  }
  return b;
}

/** Ist der Spieler gerade am Stand? (Tippen in den letzten CHEF_ZEIT s) */
export const chefAktiv = () => lauf.chefT < C.CHEF_ZEIT;
/** Wie schnell die Wichtel gerade arbeiten. */
// Du bist da: schneller. Fünf Minuten nichts getippt: nur noch ein Fünftel -
// genauso wie bei geschlossener App (offlineAbrechnen).
export const wichtelTempo = () => chefAktiv() ? C.CHEF_TEMPO : lauf.chefT >= C.INAKTIV_AB ? C.OFFLINE_ANTEIL : 1;
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
  const t = C.GAST_BASIS / (1 + stimmung() / C.STIMMUNG_TAKT) / (1 + boni().gaeste + sonntag);
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
  st.geld += betrag;
  st.gesamt += betrag;
  hooks.geld();
}

export function formatGeld(n) {
  // Die Währung heißt STERNE (vorher „Geld", davor „Taler"). Ab 100 ganze
  // Beträge, darunter mit zwei Nachkommastellen. Im Code bleibt es `geld`.
  if (n >= 1e6) return (n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' Mio. Sterne';
  if (n === 1) return '1 Stern';
  if (n >= 100 || Number.isInteger(n)) return Math.floor(n).toLocaleString('de-DE') + ' Sterne';
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Sterne';
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
  const kinderGehen = produkteFrei().some((p) => !p.alk);
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
    const betrag = gr.stand * C.PRODUKT[gr.id].preis * preisFaktor() * dev.geld;
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
  const betrag = Math.min(st.geld, Math.max(C.GRUMMEL_MIN, Math.round(st.geld * C.GRUMMEL_ANTEIL)));
  if (betrag <= 0) return;
  st.geld -= betrag;
  hooks.geld();
  lauf.texte.push({ platz: null, x: g.x, text: '-' + (betrag < 100 ? betrag.toFixed(2).replace('.', ',') : Math.round(betrag)), t: 0, boese: true });
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
    if (lauf.crepe.fertig) {
      if (!platzFuerEssen()) { hooks.ton('falsch'); lauf.wackel.hand = 0.3; return; }
      hand.push({ art: 'voll', id: p.id, rest: 0 });
      lauf.crepe.fertig = false;
      hooks.ton('greifen');
    } else if (lauf.crepe.backT < 0) {
      lauf.crepe.backT = 0;
      hooks.ton('brutzeln');
    }
    return;
  }
  // Topf oder Dose leer → nachfüllen
  if ((st.toepfe[p.id] || 0) <= 0) {
    lauf.fuellen[p.id] = (lauf.fuellen[p.id] || 0) + 1 / C.NACHFUELL_TIPPS;
    hooks.ton('blubb');
    if (lauf.fuellen[p.id] >= 0.999) { st.toepfe[p.id] = topfMax(); lauf.fuellen[p.id] = 0; hooks.ton('voll'); }
    return;
  }
  if (p.art === 'dose') {
    if (!platzFuerEssen()) { hooks.ton('falsch'); lauf.wackel.hand = 0.3; return; }
    hand.push({ art: 'voll', id: p.id, rest: p.zeit, dauer: p.zeit });
    st.toepfe[p.id]--;
    hooks.ton('greifen');
    return;
  }
  // Topf: braucht ein leeres Glas. Dann dauert das Zubereiten ein wenig.
  const glas = hand.findIndex((h) => h.art === 'glas');
  if (glas >= 0) hand[glas] = { art: 'voll', id: p.id, rest: p.zeit, dauer: p.zeit, extra: p.extra || null, extraFertig: false, brennT: 0 };
  else { hooks.ton('falsch'); lauf.wackel['z' + p.id] = 0.3; hooks.toast(hand.length >= handMax() ? 'Das Tablett ist voll.' : 'Erst ein Glas holen!', 'hinweis'); return; }
  st.toepfe[p.id]--;
  hooks.ton('giessen');
}

/** Etwas auf dem Tablett angetippt: der letzte Handgriff (Sahne, Zimt, Zuckerhut). */
export function tippeHand(i) {
  const h = lauf.hand[i];
  if (!h || h.art !== 'voll' || !h.extra || h.extraFertig || h.brennT > 0) return;
  if (h.rest > 0) { lauf.wackel.hand = 0.2; hooks.toast('Erst fertig einschenken lassen!', 'hinweis'); return; }
  if (h.extra === 'zucker') { h.brennT = C.ZUCKER_ZEIT; hooks.ton('brutzeln'); }
  else { h.extraFertig = true; hooks.ton('greifen'); }
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
    // Falsch geliefert: Der Gast lehnt ab, das Getränk ist hin und kostet etwas
    const k = lauf.hand.findIndex(bereit);
    if (k >= 0) {
      const p = C.PRODUKT[lauf.hand[k].id];
      lauf.hand.splice(k, 1);
      const minus = Math.min(st.geld, Math.max(0.5, p.preis * C.FALSCH_ANTEIL));
      st.geld -= minus; hooks.geld();
      if (minus > 0) lauf.texte.push({ platz: g.platz, x: g.x, text: '-' + minus.toFixed(2).replace('.', ','), t: 0, boese: true });
      lauf.wackel['g' + g.id] = 0.35; hooks.ton('falsch');
      lauf.fehlGast++;
      lauf.schwung = 0; lauf.schwungT = 0;
    }
    return;
  }
  const h = lauf.hand[i];
  lauf.hand.splice(i, 1);
  const faktor = h.extraFertig ? 1 + C.EXTRA_BONUS : 1;
  if (g.gross) return liefereGross(g, faktor);
  bediene(g, false, faktor);
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
  const grund = Math.max(gr.wert * p.preis * preisFaktor() * C.GROSS_MULT, einnahmenProMinute() * C.GROSS_MINUTEN * gr.wert / gr.n);
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
  const stoss = lauf.t < lauf.stossBis ? 2 : 1;
  const tip = C.TRINKGELD_MAX * (g.geduld / g.geduldMax) * (1 + b.trinkgeld) * stoss;
  let betrag = p.preis * preisFaktor() * (1 + tip) * (def.mult || 1) * (def.trink || 1) * (g.eilig ? C.EILIG_MULT : 1);
  const schwungVorher = lauf.schwung;
  if (!auto) {
    lauf.schwung = lauf.schwungT > 0 ? Math.min(C.SCHWUNG_MAX, lauf.schwung + 1) : 1;
    lauf.schwungT = C.SCHWUNG_FENSTER;
    betrag *= 1 + lauf.schwung * C.SCHWUNG_PRO;
  }
  betrag *= faktor * dev.geld;
  verdiene(betrag);
  st.stats.bedient++;
  zaehleBedient(g, auto, faktor, schwungVorher);
  lauf.texte.push({ platz: g.platz, x: g.x, text: '+' + (betrag < 100 ? betrag.toFixed(2).replace('.', ',') : Math.round(betrag)), t: 0, gross: !!def.spezial || g.eilig });
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
    lauf.stossName = C.STOSS_GRUPPEN[Math.floor(Math.random() * C.STOSS_GRUPPEN.length)];
    hooks.toast(`${lauf.stossName} kommt! Doppeltes Trinkgeld.`, 'spezial');
    hooks.ton('spezial');
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
    const grenze = lauf.lernen ? 1 : C.SCHLANGE_MAX + tresenPlaetze();
    if (unterwegs < grenze) {
      if (lauf.stossRest > 0) { neuerGast(waehleTyp(false)); lauf.stossRest--; }
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
      g.geduld -= dt;
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
    if (h.brennT > 0) { h.brennT -= dt; if (h.brennT <= 0) { h.brennT = 0; h.extraFertig = true; hooks.ton('fertig'); } }
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
  } else if (!cr.fertig && hat('crepe_w') && hat('crepe')) cr.backT = 0;

  // Servier-Wichtel
  const sv = stufe('servier');
  if (sv) {
    lauf.servierT += wt;
    if (lauf.servierT >= C.SERVIER_TAKT[sv]) {
      // Besondere Gäste und Großbestellungen sind Sache des Chefs
      const g = G.filter((x) => x.am && !x.bedient && !x.gehen && !x.gross && !C.GAESTE[x.typ].spezial && verfuegbar(x.wunsch))
        .sort((a, b) => a.geduld - b.geduld)[0];
      if (g) {
        const p = C.PRODUKT[g.wunsch];
        if (p.art === 'platte') lauf.crepe.fertig = false; else st.toepfe[p.id]--;
        bediene(g, true);
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
  for (const p of frei) { const g = 1 + C.PRODUKTE.indexOf(p) * 0.15; s += p.preis * g; w += g; }
  return w ? s / w : 0;
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
  return rate * durchschnittsPreis() * preisFaktor() * (1 + C.TRINKGELD_MAX * 0.5);
}

export function offlineAbrechnen() {
  const weg = (Date.now() - st.zuletzt) / 1000;
  if (weg < C.OFFLINE_AB) return null;
  const sek = Math.min(weg, C.OFFLINE_MAX_H * 3600);
  const sv = stufe('servier');
  if (!sv) return { sek, betrag: 0, portionen: 0 };
  const rate = Math.min(1 / C.SERVIER_TAKT[sv], 1 / gastTakt());
  // Die ersten INAKTIV_AB Sekunden arbeiten sie voll, danach nur noch ein Fünftel
  const voll = Math.min(sek, C.INAKTIV_AB);
  let n = (voll + (sek - voll) * C.OFFLINE_ANTEIL) * rate;
  // Ohne Nachfüll-Wichtel ist nach den vollen Töpfen Schluss
  if (!stufe('nachfuell')) {
    const vorrat = produkteFrei().filter((p) => p.art !== 'platte').reduce((a, p) => a + (st.toepfe[p.id] || 0), 0);
    if (n >= vorrat) { n = vorrat; for (const p of produkteFrei()) if (p.art !== 'platte') st.toepfe[p.id] = 0; }
  }
  n = Math.floor(n);
  const betrag = n * durchschnittsPreis() * preisFaktor() * (1 + C.TRINKGELD_MAX * 0.5) * dev.geld;
  if (betrag > 0) verdiene(betrag);
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
export function offeneTueren() {
  let n = 0;
  for (let i = 1; i <= 24; i++) if (tuerBereit(i)) n++;
  return n;
}
