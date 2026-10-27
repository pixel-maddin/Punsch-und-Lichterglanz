/*
 * spiel.js - Spielzustand und Regeln. Kein Zeichnen, kein DOM.
 *
 * `st`   = was gespeichert wird (Geld, Besitz, Töpfe, Kalender …)
 * `lauf` = was nur in dieser Sitzung lebt (Gäste, Hand, Schwung …)
 *
 * Meldungen nach außen (Ton, Einblendung) gehen über `hooks`, die
 * main.js setzt - so bleibt diese Datei ohne Abhängigkeit auf UI und Ton.
 */
import * as C from './config.js?v=202610280000';
import * as Z from './zeit.js?v=202610280000';
import { neueFarben } from './pixel.js?v=202610280000';

// Vorführmodus (?demo=…, nur lokal): eigener Speicherplatz, damit Store-
// Screenshots nie den echten Spielstand anfassen
export const DEMO = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  ? new URLSearchParams(location.search).get('demo') : null;
const SCHLUESSEL = DEMO ? 'adventshaus.demo' : 'adventshaus.v1';

export const hooks = { ton() {}, toast() {}, geld() {}, musik() {}, bedient() {}, ruf() {} };

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
    miniStaffel: true,               // Minispiele kommen nach und nach (10.10.); fehlt = alter Stand, siehe laden()
    orteStaffel: true,               // Orte der Karte gehen mit der Einführung auf (11.10.)
    miniSkala: true,                 // Minispiel-Punkte angeglichen (11.10.); fehlt = Rekorde noch in Rohpunkten
    miniSkalaWert: Object.fromEntries(Object.entries(C.MINISPIELE).map(([n, d]) => [n, d.skala])),   // mit diesem Faktor sind die Rekorde gespeichert
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
      // Falle wie bei sterne10: neuerStand() trägt startTag 0 („noch nicht") -
      // ein alter Stand OHNE startTag ist aber „alter Stand" (spieltag 99).
      // Seit dem Einstieg in Wellen (11.10.) hingen sonst Händler, Gäste und
      // Nikolaus für solche Spieler für immer an Spieltag 0.
      if (!('startTag' in alt) && alt.intro) stand.startTag = null;
      // 25.10. (gemeldet: „Markt in 4 Tagen", jeden Tag wieder): Wer zwischen 01.10. und 11.10.
      // geladen hat, bekam startTag 0 aus neuerStand() GESPEICHERT - die Reparatur oben greift
      // nur, wenn der Eintrag fehlt. Spieltag blieb 0, der Markt-Anker wanderte täglich mit.
      // Wer schon losgespielt hat (intro), hat nie legitim 0 (setzeStartTag kommt mit intro).
      // Dann wie ein alter Stand behandeln, und der erste Markt ist gleich heute.
      if (alt.intro && alt.startTag === 0) { stand.startTag = null; stand.marktHeilen = true; }
      // Minispiele kommen seit 10.10. nach und nach. Wer die Karte schon
      // vorher kannte, hatte alle fünf - ihm verschwindet keins. Erkannt an der
      // fehlenden Marke `miniStaffel` (nicht an `miniGemeldet`: das hat die
      // erste Fassung schon in alte Stände geschrieben)
      // Minispiel-Punkte sind seit 11.10. je Spiel skaliert (C.MINISPIELE.skala).
      // Rekorde mitrechnen, sonst passten sie nicht mehr zu den ebenso
      // umgerechneten Deko- und Rezeptschwellen. `miniSkalaWert` = Faktor, mit
      // dem die Rekorde dieses Standes gespeichert sind (fehlt er, aber
      // `miniSkala` steht: die erste Fassung vom 11.10.; fehlt beides: Rohpunkte).
      const ERSTE = { lichtung: 0.75, baum: 0.65, berg: 1.05, eis: 1.5, back: 0.8 };
      const gespeichert = alt.miniSkalaWert || ('miniSkala' in alt ? ERSTE : {});
      for (const [n, def] of Object.entries(C.MINISPIELE)) {
        const f = def.skala / (gespeichert[n] || 1);
        if (Math.abs(f - 1) < 1e-6) continue;
        const m = stand.mini && stand.mini[n];
        if (m && m.best) m.best = Math.round(m.best * f);
        if (n === 'lichtung' && stand.lichtung && stand.lichtung.best && !m) stand.lichtung.best = Math.round(stand.lichtung.best * f);
      }
      stand.miniSkala = true;
      stand.miniSkalaWert = Object.fromEntries(Object.entries(C.MINISPIELE).map(([n, d]) => [n, d.skala]));
      // Orte gehen seit 11.10. mit der Einführung auf - wer schon weiter ist, hat alle
      if (!('orteStaffel' in alt)) { stand.orteStaffel = true; if (alt.lernen >= 99) stand.orteAlle = true; }
      // Das Vogelhäuschen aus Türchen 18 ist seit 11.10. das Futterhaus im Laden;
      // Türchen 18 bringt jetzt den Meisenknödel. Wer es schon hatte, bekommt beides.
      if (stand.kalDeko && stand.kalDeko.kal_vogel) {
        delete stand.kalDeko.kal_vogel;
        stand.kalDeko.kal_knoedel = true;
        stand.besitz.futterhaus = Math.max(1, stand.besitz.futterhaus || 0);
      }
      // Stammgäste (13.10.): Postbote Paul ist jetzt Postbotin Sophia - Besuche mitnehmen
      if (stand.stamm && stand.stamm.paul) { stand.stamm.sophia = stand.stamm.sophia || stand.stamm.paul; delete stand.stamm.paul; }
      if (!('miniStaffel' in alt)) {
        stand.miniStaffel = true;
        if (alt.tipps && alt.tipps.karte_mehr) stand.miniAlle = true;
      }
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
// Zimtstern-Gutschein lief bis 26.10. in Echtzeit (`zimtBis`) - jetzt Restsekunden Spielzeit (`zimt`)
if (st.zimtBis) { st.zimt = Math.max(0, (st.zimtBis - Date.now()) / 1000); delete st.zimtBis; }

let speichernGesperrt = false;   // nach dem Einlesen einer Datei bis zum Neuladen
export function speichere() {
  if (speichernGesperrt) return;
  // „Zuletzt da" nur stempeln, solange die App sichtbar ist. Im Hintergrund
  // laufen Zeitgeber teils weiter (Android, Desktop) - dann rückte der
  // Stempel mit, und beim Zurückkommen gab es kein Wichtel-Einkommen.
  if (typeof document === 'undefined' || !document.hidden) st.zuletzt = Date.now();
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(st)); } catch (e) { /* voll/privat */ }
}

// ---------------------------------------------------------------------------
// Spielstand als Datei (14.10., Nutzerwunsch: „auf ein anderes Handy
// importieren"). Die Datei ist der ganze Stand plus eine Kennung. `zuletzt`
// ist der Zeitpunkt der Sicherung - beim Laden rechnet die Kiste die Zeit
// dazwischen ab wie jede Abwesenheit (gedeckelt wie immer).
// ---------------------------------------------------------------------------
const DATEI_KENNUNG = 'punsch-lichterglanz';
export function standAlsDatei() {
  speichere();
  return JSON.stringify({ spiel: DATEI_KENNUNG, format: 1, gesichert: Date.now(), stand: st });
}
/** Prüft eine eingelesene Datei. Gibt { stand, name, gesamt, gesichert } oder { fehler }. */
export function pruefeDatei(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { return { fehler: 'Die Datei ist kein Spielstand von Punsch & Lichterglanz.' }; }
  const s = d && d.stand;
  if (!d || d.spiel !== DATEI_KENNUNG || !s || typeof s !== 'object' || typeof s.geld !== 'number' || typeof s.gesamt !== 'number')
    return { fehler: 'Die Datei ist kein Spielstand von Punsch & Lichterglanz.' };
  if (d.format > 1) return { fehler: 'Dieser Spielstand ist von einer neueren Version - bitte das Spiel erst neu laden.' };
  return { stand: s, name: s.name || null, gesamt: s.gesamt, gesichert: d.gesichert || s.zuletzt || null };
}
/**
 * Übernimmt den geprüften Stand. Danach MUSS neu geladen werden (laden()
 * stellt alte Stände um). Der bisherige Stand bleibt als Notnagel unter
 * `<Schlüssel>.vorImport` liegen. Bis zum Neuladen wird nichts mehr
 * gespeichert - sonst schriebe `pagehide` den alten Stand wieder darüber.
 */
export function uebernehmeStand(stand) {
  try {
    const alt = localStorage.getItem(SCHLUESSEL);
    if (alt) localStorage.setItem(SCHLUESSEL + '.vorImport', alt);
    localStorage.setItem(SCHLUESSEL, JSON.stringify(stand));
  } catch (e) { return false; }
  speichernGesperrt = true;
  return true;
}

export function allesLoeschen() {
  // 26.10.: auch den Nachrichtenverlauf (eigener Schlüssel, ui.js) - sonst standen nach „Neu
  // anfangen" die letzten Meldungen des alten Spiels darin. Der Vorführmodus lässt ihn stehen.
  if (!DEMO) try { localStorage.removeItem('adventshaus.nachrichten'); } catch (e) { /* egal */ }
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
    voegel: [], vogelAb: 4,         // Vögel am Futterhaus (11.10.)
    goldAb: 20,                     // frühestens dann der nächste goldene Gast (17.10.)
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
  for (const d of [...C.LICHTUNG_DEKO, ...C.BAUM_DEKO, ...C.BERG_DEKO, ...C.EIS_DEKO, ...C.SCHNEE_DEKO, ...C.SPECIAL_DEKO, ...C.FINALE_DEKO]) if (st.kalDeko[d.id]) s += d.stimmung;
  s += Object.keys(st.var || {}).length * C.VARIANTE_HERZEN;
  s += schneemannHerzen() + schneekatzeHerzen();
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
  // Kalendertage, nicht 24-h-Blöcke (22.10., gemeldet: Markt-Countdown sprang
  // von 5 auf 6). Vorher wechselte der Spieltag erst zur Uhrzeit des ersten
  // Starts - morgens hing er einen Tag hinterher, und der Markt-Countdown
  // übersprang den nächsten Termin. Gerundet wegen der Sommerzeit-Umstellung.
  const a = new Date(st.startTag); a.setHours(0, 0, 0, 0);
  const b = new Date(Z.jetzt()); b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((b - a) / 86400000));
}
const nachTag = (liste) => liste[Math.min(liste.length - 1, spieltag())];

// ---------------------------------------------------------------------------
// Einstieg in Wellen (11.10., siehe C.EINSTIEG)
// ---------------------------------------------------------------------------
let zieleAnzahl = 7;
/** ziele.js meldet, wie viele Startziele es gibt (kein Import im Kreis). */
export function setzeZieleAnzahl(n) { zieleAnzahl = n; }
/** Einführung und alle Startziele geschafft (oder übersprungen)? */
export const startzieleFertig = () => st.lernen >= 99 && (st.ziel || 0) >= zieleAnzahl;
/**
 * Startziele fertig UND eine Weile Ruhe danach (C.RUHE_NACH_START): Im Moment
 * des letzten Ziels stapelten sich sonst Belohnung, Abschlussblase und die
 * erste Großbestellung. Gezählt in Spielzeit der Sitzung (`lauf.startzieleT`,
 * gesetzt in ziele.js); in einer späteren Sitzung ist die Ruhe längst vorbei.
 */
export const nachStartRuhe = () => startzieleFertig() && (lauf.startzieleT == null || lauf.t - lauf.startzieleT > C.RUHE_NACH_START);
/** Darf ein Sonderereignis schon kommen? Nach Spieltag, siehe C.EINSTIEG. */
export const einstieg = (was) => !!DEMO || spieltag() >= (C.EINSTIEG[was] || 0);
/**
 * Steht ein Ort schon auf der Karte? Die Orte gehen mit der Einführung auf:
 * Zuhause und Supermarkt sofort, der Weihnachtsladen mit dem Deko-Ziel, der
 * Wichtelwald mit dem ersten Wichtel, der Baumarkt nach dem Servier-Wichtel,
 * Festplatz und Minispiele, wenn die Karte vorgestellt ist (Hinweis
 * `karte_mehr`) - die Minispiele dann weiter nach Spieltag (miniOffen).
 */
export function ortOffen(o) {
  if (DEMO || st.orteAlle) return true;
  const z = st.lernen >= 99 ? st.ziel || 0 : -1;
  const karte = !!((st.tipps && st.tipps.karte_mehr) || st.karteMehrGezeigt);   // schon beim Erscheinen des Hinweises (lernen.js)
  if (o.spiel) return karte && miniOffen(o.spiel);
  return { haus: true, super: true, dorf: z >= 1, wichtel: z >= 2, bau: z >= 5, festplatz: karte, baumschule: karte && miniOffen('baum') }[o.id] ?? true;
}
export const offlineAnteil = () => nachTag(C.OFFLINE_JE_TAG.anteil);
export const offlineStunden = () => nachTag(C.OFFLINE_JE_TAG.stunden);
/** Gilt der Chef-Bonus schon? Erst ab dem Hinweis „Du bist der Chef!“ (13.10.) - vorher gibt es ihn noch nicht. */
export const chefBonus = () => !!(st.chefBonus || (st.tipps && st.tipps.chef));
export const wichtelTempo = () => chefAktiv() ? (chefBonus() ? C.CHEF_TEMPO : 1) : lauf.chefT >= C.INAKTIV_AB ? offlineAnteil() : 1;
/**
 * Spül- und Nachfüll-Wichtel (13.10.): solange die App offen ist, nie langsamer
 * als normal - gemeldet zweimal „Wichtel füllen nicht mehr nach": Nach 5 Minuten
 * ohne Tipp am Tresen arbeiteten sie mit 15 % (Nachfüllen 33 statt 5 s). Das
 * gemütliche Tempo gilt nur noch fürs Bedienen (der Ertrag bleibt fair).
 */
export const helferTempo = () => Math.max(1, wichtelTempo());
export const wichtelRuhen = () => !chefAktiv() && lauf.chefT >= C.INAKTIV_AB;

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
/** Alles, was man besitzt (freigeschaltet und gekauft). */
export const produkteBesessen = () => C.PRODUKTE.filter((p) => hat(p.id));

// ---------------------------------------------------------------------------
// Die Karte des Standes (19.10.): Von allem, was man hat, stehen höchstens
// ANGEBOT_MAX Dinge auf der Karte - nur die wünschen sich die Gäste, nur sie
// stehen unten am Tresen. Jederzeit umstellbar (Knopf „Angebot" oben rechts).
// st.angebot = ids auf der Karte, st.angebotBekannt = ids, über die schon
// entschieden wurde (Neues kommt von selbst dazu, solange Platz ist;
// selbst Abgewähltes bleibt weg).
// ---------------------------------------------------------------------------
export function angebot() {
  const besessen = produkteBesessen().map((p) => p.id);
  if (!Array.isArray(st.angebot)) {
    // Alte Spielstände: alles, wenn es passt, sonst die fünf teuersten
    st.angebot = besessen.length <= C.ANGEBOT_MAX ? besessen.slice()
      : besessen.slice().sort((a, b) => C.PRODUKT[b].preis - C.PRODUKT[a].preis).slice(0, C.ANGEBOT_MAX);
    st.angebotBekannt = besessen.slice();
  }
  st.angebotBekannt = st.angebotBekannt || [];
  for (const id of besessen) {
    if (st.angebotBekannt.includes(id)) continue;
    st.angebotBekannt.push(id);
    if (st.angebot.length < C.ANGEBOT_MAX) { st.angebot.push(id); continue; }
    // Karte voll: Das Neue ersetzt das Günstigste (gemessen 19.10.: wer nie
    // umstellt, verdiente sonst nur die Hälfte). Zurücktauschen geht jederzeit.
    const billig = st.angebot.slice().sort((a, b) => C.PRODUKT[a].preis - C.PRODUKT[b].preis)[0];
    if (billig && C.PRODUKT[billig].preis < C.PRODUKT[id].preis) {
      st.angebot[st.angebot.indexOf(billig)] = id;
      hooks.toast(`${C.PRODUKT[id].name} ist jetzt in deinem Angebot statt ${C.PRODUKT[billig].name}. Umstellen: „Angebot“ oben rechts.`, 'neu');
    }
    st.angebotNeu = true;   // Punkt an der Karte, bis man sie ansieht
  }
  st.angebot = st.angebot.filter((id) => besessen.includes(id));
  if (!st.angebot.length && besessen.length) st.angebot = [besessen[0]];
  return st.angebot;
}
/** Auf der Karte (= wünschen sich die Gäste). Reihenfolge wie PRODUKTE, damit die Plätze unten fest bleiben. */
export const produkteFrei = () => { const a = angebot(); return C.PRODUKTE.filter((p) => a.includes(p.id) && hat(p.id)); };
export const aufKarte = (id) => angebot().includes(id);
/**
 * Auf die Karte nehmen oder herunternehmen. false, wenn die Karte voll ist
 * oder es das Letzte wäre. Wer sich etwas wünscht, das es nicht mehr gibt,
 * sucht sich etwas Neues aus - Großbestellungen eingeschlossen.
 */
export function setzeAngebot(id, an) {
  const a = angebot();
  if (!hat(id)) return false;
  if (an) {
    if (a.includes(id)) return true;
    if (a.length >= C.ANGEBOT_MAX) return false;
    a.push(id);
  } else {
    if (!a.includes(id)) return true;
    if (a.length <= 1) return false;
    a.splice(a.indexOf(id), 1);
    for (const g of lauf.gaeste) {
      if (g.gehen || g.bedient || g.wunsch !== id) continue;
      const neu = g.gross ? produkteFrei().filter((p) => p.art !== 'platte') : null;
      if (g.gross) { if (neu.length) { g.gross.id = neu[Math.floor(Math.random() * neu.length)].id; g.wunsch = g.gross.id; } }
      else { const w = wunschFuer(g.typ); if (w) g.wunsch = w; }
    }
  }
  speichere();
  return true;
}
export const preisFaktor = () => (1 + stimmung() * C.STIMMUNG_PREIS) * (1 + boni().preis) * rufFaktor();

export function gastTakt() {
  const sonntag = Z.adventssonntag() ? C.ADVENT_GAESTE : 0;
  const markt = marktHeute() ? C.MARKT_GAESTE : 0;
  const fa = feierabend() ? C.FEIERABEND.gaeste : 0;
  const t = C.GAST_BASIS / (1 + stimmung() / C.STIMMUNG_TAKT) / (1 + boni().gaeste + sonntag + markt + fa);
  return Math.max(C.GAST_MIN, t);
}

// ---------------------------------------------------------------------------
// Aufsicht und goldene Gäste (17.10., siehe C.AUFSICHT_AB)
// ---------------------------------------------------------------------------
/** Bedienen die Wichtel normale Gäste selbst, auch wenn du da bist? */
export const aufsicht = () => stufe('servier') >= C.AUFSICHT_AB;
/** Kommt als Nächstes ein goldener Gast? Höchstens einer zur Zeit. */
function goldFaellig() {
  return aufsicht() && chefAktiv() && nachStartRuhe() && !lauf.lernen && lauf.t >= lauf.goldAb
    && !lauf.gaeste.some((g) => g.gold && !g.gehen && !g.bedient);
}

// ---------------------------------------------------------------------------
// Ruf des Standes (17.10., siehe C.RUF_PUNKTE)
// ---------------------------------------------------------------------------
/** { stufe, punkte (heute), fertig (heute schon gestiegen) } */
export function ruf() {
  const r = st.ruf || {};
  const heute = tagNr();
  return { stufe: r.stufe || 0, punkte: r.heute === heute ? r.punkte || 0 : 0, fertig: r.tag === heute, max: (r.stufe || 0) >= C.RUF_MAX };
}
export const rufFaktor = () => 1 + ((st.ruf && st.ruf.stufe) || 0) * C.RUF_JE_STUFE;
/** Etwas für den Ruf getan: 'gold' (goldener/besonderer Gast), 'mini' (Minispielrunde), 'normal'. */
function rufPunkt(art) {
  const r = st.ruf = st.ruf || { stufe: 0, punkte: 0, heute: null, tag: null };
  const heute = tagNr();
  if (r.heute !== heute) { r.heute = heute; r.punkte = 0; }
  if (r.tag === heute || r.stufe >= C.RUF_MAX) return;
  r.punkte += C.RUF_JE[art] || 0;
  if (r.punkte < C.RUF_PUNKTE - 1e-9) return;
  r.stufe++; r.tag = heute;
  hooks.ruf(r.stufe);
  speichere();
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
  // 26.10.: steht hinter „Frei ab" - daher „500 verdienten Sternen" statt „insgesamt 500 Sterne verdient"
  if (f.gesamt) t.push(`${Math.round(f.gesamt).toLocaleString('de-DE')} verdienten Sternen (bisher ${Math.floor(st.gesamt).toLocaleString('de-DE')})`);
  if (f.advent) { const a = Z.adventDatum(f.advent); t.push(`dem ${f.advent}. Advent (${a.getDate()}.${a.getMonth() + 1}.)`); }
  return t.join(' und ');
}

/** Der Satz unter einem verdeckten Artikel. */
export function bedingungText(a) {
  if (!freiErfuellt(a.id)) return `Frei ab ${freiText(a.id)}`;
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

/**
 * Das Finale (25.10.): alles gekauft und voll ausgebaut, auch die Luxus-Stücke (Varianten zählen
 * nicht). Dann wartet vor dem Kamin der Erfolgswand ein goldenes Geschenk (`finaleBereit`), darin
 * C.FINALE_DEKO. `st.finale` = Zeitpunkt des Öffnens.
 */
export const allesGekauft = () => C.ARTIKEL.every((a) => status(a).fertig);
export const finaleBereit = () => !st.finale && Object.keys(st.besitz).length >= C.ARTIKEL.length && allesGekauft();   // erst billig zählen
export function finaleOeffnen() {
  if (!finaleBereit()) return null;
  st.finale = Date.now();
  st.neu = st.neu || {};
  for (const d of C.FINALE_DEKO) { st.kalDeko[d.id] = true; st.neu[d.id] = true; }
  lauf.zugJetzt = true;   // die Eisenbahn fährt gleich einmal vorbei (szene.js)
  speichere();
  return C.FINALE_DEKO[0];
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
export const ARTIKEL_LISTE = C.ARTIKEL;

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
  if (id === 'futterhaus') setTimeout(() => hooks.toast('Tipp das Futterhaus im alten Baum an, um es zu füllen und die Vögel zu beobachten.', 'spezial'), 1200);
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
  const basis = Array.isArray(a.kosten) ? a.kosten.reduce((x, y) => x + y, 0) : a.kosten;   // Gesamtwert aller Stufen
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

/** Belohnungen (Kiste, Aufträge, Funde) auf volle Zehner aufrunden - nur Minispiele zahlen genau. */
export const zehner = (n) => Math.ceil(Math.round(n) / 10) * 10;
export function verdiene(betrag) {
  betrag = Math.round(betrag);   // ganze Sterne
  st.geld += betrag;
  st.gesamt += betrag;
  hooks.geld();
}

/** „noch ~12 Min." - wie lange der Stand für so viele Sterne braucht (17.10.). */
export function nochZeit(fehlt) {
  const min = fehlt / Math.max(1, einnahmenProMinute());
  if (min < 1) return 'noch &lt;1 Min.';
  if (min < 60) return `noch ~${Math.ceil(min)} Min.`;
  const h = min / 60;
  return h < 10 ? `noch ~${h < 2 ? h.toFixed(1).replace('.', ',') : Math.round(h)} Std.` : 'noch 10+ Std.';
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
  const lage = C.WETTER_LAGEN[Z.tagesWetter().art];
  return zufallGewichtet(frei, (p) => (1 + C.PRODUKTE.indexOf(p) * 0.15) * (lage && lage.gruppe.includes(p.id) ? lage.mehr : 1)).id;
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
  if (!nachStartRuhe() || !einstieg('sonder')) return false;   // Einstieg in Wellen
  if (produkteBesessen().length < C.SONDER_AB_PRODUKTE) return false;
  if (lauf.sonderSeit == null) lauf.sonderSeit = lauf.t;
  return lauf.t >= lauf.sonderSeit + (st.ersterSonder ? 0 : C.SONDER_NACH);
}

function waehleTyp(erlaubeSpezial) {
  // Besondere Gäste: selten, und nie zwei kurz hintereinander
  // Sie kommen nur, wenn DU am Stand bist - die Wichtel bedienen sie nicht,
  // und wer weg ist, soll nicht vom Grummel bestohlen werden.
  // Stammgäste (12.10.): einmal am Tag, zu ihrer Uhrzeit, nur wenn DU da bist
  if (erlaubeSpezial && chefAktiv() && sonderBereit()) { const s = stammFaellig(); if (s) return s; }
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
  const eilig = !gross && !def.spezial && !lauf.lernen && st.stats.bedient >= 30 && nachStartRuhe() && Math.random() < C.EILIG_ANTEIL;
  // Goldener Gast (17.10.): einer alle GOLD_TAKT s, nur du bedienst ihn
  const gold = !gross && !def.spezial && !eilig && goldFaellig();
  if (gold) lauf.goldAb = lauf.t + C.GOLD_TAKT[0] + Math.random() * (C.GOLD_TAKT[1] - C.GOLD_TAKT[0]);
  const geduld = gross ? gross.zeit : def.geduld * (1 + boni().geduld) * druck * (eilig ? C.EILIG_GEDULD : 1);
  const g = {
    id: lauf.naechsteId++, typ, wunsch,
    x: START_X, y: 0, farben: def.farben ? { ...def.farben } : neueFarben(typ), phase: Math.random() * 10,
    platz: null, am: false, laeuft: true, eilig, gold,
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

/** Einheitliche Kleidung einer Gruppe (C.GRUPPEN_KLEIDUNG): Farben drüber, Erkennungszeichen dazu. */
function kleideGruppe(g, name) {
  const kl = C.GRUPPEN_KLEIDUNG[name];
  if (!kl || C.GAESTE[g.typ].spezial) return;
  Object.assign(g.farben, kl.farben);
  g.farben.extra = kl.extra;
}

// ---------------------------------------------------------------------------
// Stammgäste (12.10.)
// ---------------------------------------------------------------------------
function stammFaellig() {
  if (lauf.t < (lauf.stammAb ?? C.STAMM_ERST)) return null;
  const h = Z.jetzt().getHours(), heute = Z.tagesSchluessel();
  // Wer heute noch nicht bedient wurde und nicht schon da steht - zu jeder
  // Uhrzeit (17.10.). Zur Lieblingszeit (von-bis) kommt man lieber.
  const dran = Object.entries(C.STAMMGAESTE).filter(([id]) => (st.stamm || {})[id]?.tag !== heute && !lauf.gaeste.some((g) => g.typ === id));
  if (!dran.length || Math.random() >= C.STAMM_CHANCE) return null;
  lauf.stammAb = lauf.t + C.STAMM_PAUSE;
  return zufallGewichtet(dran, ([, s]) => (h >= s.von && h < s.bis ? C.STAMM_LIEBLING : 1))[0];
}
/** Begrüßung passend zur Uhrzeit (17.10.) - ersetzt {gruss} im ersten Satz. */
export function mitGruss(id, satz) {
  if (!satz.includes('{gruss}')) return satz;
  const h = Z.jetzt().getHours();
  const i = h >= 5 && h < 11 ? 0 : h >= 11 && h < 17 ? 1 : h >= 17 && h < 22 ? 2 : 3;
  return satz.replace('{gruss}', (C.STAMM_GRUSS[id] || ['Hallo!'])[i] || 'Hallo!');
}
/** Bedient: ein Satz aus der Geschichte - oder an Weihnachten das Geschenk. */
export function stammBedient(g) {   // exportiert nur für Tests
  const s = C.STAMMGAESTE[g.typ], def = C.GAESTE[g.typ];
  st.stamm = st.stamm || {};
  const e = st.stamm[g.typ] = st.stamm[g.typ] || { n: 0 };
  e.tag = Z.tagesSchluessel();
  const dt = Z.dezemberTag();
  // 26.10.: vom 24.12. bis zum 6.1. (vorher nur 24.-26.12. - wer an den Feiertagen nicht spielte, bekam es nie)
  if (dt >= 24 && dt <= 37 && e.n >= 3 && e.geschenk !== Z.saison()) {   // nur wer sich schon kennt
    e.geschenk = Z.saison();
    const betrag = zehner(einnahmenProMinute() * C.STAMM_GESCHENK_MIN * dev.geld);
    if (betrag > 0) verdiene(betrag);
    stammFenster({ id: g.typ, geschenk: true, text: s.geschenk, betrag });
    return;
  }
  // 26.10. (Testbericht): Wartet von diesem Gast noch ein ungelesenes Fenster, ist er jetzt zurück -
  // das alte fällt weg und sein Satz kommt jetzt dran. Vorher wurde der neue Satz dahinter gereiht,
  // das alte Fenster verfiel nach 20 min und setzte den Zähler zurück: Satz 3 kam vor Satz 2, und
  // Satz 3 wurde beim übernächsten Besuch noch einmal erzählt.
  if (st.stammNeu) st.stammNeu = st.stammNeu.filter((f) => {
    if (f.id !== g.typ || f.geschenk || !f.nr) return true;
    e.n = Math.min(e.n, f.nr - 1);
    return false;
  });
  // Die Geschichte (17.10.): als eigenes Fenster, das das Spiel anhält -
  // als Einblendung ging sie beim Weiterbedienen unter. Ist die Geschichte
  // erzählt, kommen die kurzen Sätze wie bisher als Einblendung.
  if (e.n < s.saetze.length) {
    stammFenster({ id: g.typ, text: mitGruss(g.typ, s.saetze[e.n]), nr: e.n + 1, von: s.saetze.length, erster: e.n === 0 });
    e.n++;
    return;
  }
  const satz = s.immer[(e.n - s.saetze.length) % s.immer.length];
  e.n++;
  setTimeout(() => hooks.toast(`${def.name}: „${satz}“`, 'spezial'), 900);
}
/** Ein Story-Fenster vormerken; main.js zeigt es, sobald nichts anderes offen ist. */
function stammFenster(f) {
  st.stammNeu = st.stammNeu || [];
  st.stammNeu.push({ ...f, wann: Z.jetzt().getTime() });
  speichere();
}
/**
 * Das nächste Story-Fenster - oder null. Wer die App direkt nach dem Bedienen
 * schloss, bekam den Satz sonst beim nächsten Besuch (17.10., Betatest:
 * Förster Franz sagte morgens um acht „'n Abend"). Älter als 20 Minuten:
 * verwerfen und den Satz beim nächsten Besuch des Gastes erzählen.
 */
export function naechstesStammFenster() {
  while (st.stammNeu && st.stammNeu.length) {
    const f = st.stammNeu.shift();
    // Das Abschiedsgeschenk verfällt nie - die Sterne sind schon gutgeschrieben
    if (f.geschenk || !f.wann || Z.jetzt().getTime() - f.wann < 20 * 60000) return f;
    const e = st.stamm && st.stamm[f.id];
    if (e && f.nr) e.n = Math.min(e.n, f.nr - 1);
  }
  return null;
}
export const stammBesuche = (id) => (st.stamm || {})[id]?.n || 0;

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
    else if (lauf.fuellen[p.id] < 1.5 / C.NACHFUELL_TIPPS && (st.topfHinweise || 0) < 2 && st.tipps && st.tipps.leer) {   // 24.10.: nicht neben der Blase „4-mal antippen" (widersprach sich mit „Noch 3×")
      st.topfHinweise = (st.topfHinweise || 0) + 1;
      const noch = C.NACHFUELL_TIPPS - Math.round(lauf.fuellen[p.id] * C.NACHFUELL_TIPPS);
      hooks.toast(`${p.name} ist leer! Noch ${noch}× antippen, dann ist es wieder voll.`, 'hinweis');
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

/**
 * Wem gehört welches Glas auf dem Tablett? Nur für die Anzeige (tresen.js,
 * 19.10.): fertige Gläser bekommen einen Haken, „ihr" Gast eine grüne Blase.
 * Gleiche Regel wie das Festhalten der Geduld in update(): je Glas der
 * ungeduldigste Gast am Tresen mit genau diesem Wunsch; Wichtel-Gläser
 * gehören dem, für den sie eingeschenkt wurden. Fertige Gläser zuerst.
 * Rückgabe: glas = Map(Index → Gast-id), gast = Map(Gast-id → { bereit, anteil }).
 */
export function servierPlan() {
  glaeserZuordnen();
  const glas = new Map(), gast = new Map();
  lauf.hand.forEach((h, i) => {
    if (h.art !== 'voll' || h.ziel == null) return;
    glas.set(i, h.ziel);
    const fertig = bereit(h), a = fertig ? 1 : h.brennT > 0 ? 1 : Math.max(0, Math.min(1, 1 - (h.rest || 0) / (h.dauer || 1)));
    const alt = gast.get(h.ziel);
    if (!alt || (fertig && !alt.bereit) || (!alt.bereit && a > alt.anteil)) gast.set(h.ziel, { bereit: fertig, anteil: a });
  });
  return { glas, gast };
}

/**
 * Jedes volle Glas auf dem Tablett gehört EINEM Gast (`h.ziel`) - und zwar fest,
 * bis der geht, bedient ist oder sich etwas anderes wünscht (19.10.). Vorher
 * wurde je Bild neu nach Geduld zugeordnet; bei zwei Gästen mit demselben
 * Wunsch sprangen Haken und Reservierung hin und her (gemeldet). Neue
 * Zuordnung: fertige Gläser zuerst, dann der ungeduldigste passende Gast.
 * Wichtel-Gläser gehören dem, für den sie eingeschenkt wurden.
 */
function glaeserZuordnen() {
  const G = lauf.gaeste;
  const da = (x) => x.am && !x.bedient && !x.gehen;
  const vergeben = new Set();
  for (const h of lauf.hand) {
    if (h.art !== 'voll') { if (h.ziel != null) h.ziel = null; continue; }
    if (h.vonWichtel && h.fuer != null) h.ziel = h.fuer;
    const g = h.ziel != null ? G.find((x) => x.id === h.ziel) : null;
    if (g && da(g) && g.wunsch === h.id && (g.gross || !vergeben.has(g.id))) { if (!g.gross) vergeben.add(g.id); }
    else h.ziel = null;
  }
  const offen = lauf.hand.filter((h) => h.art === 'voll' && h.ziel == null).sort((a, b) => (bereit(b) ? 1 : 0) - (bereit(a) ? 1 : 0));
  for (const h of offen) {
    const g = G.filter((x) => da(x) && x.wunsch === h.id && (x.gross || !vergeben.has(x.id))).sort((a, b) => a.geduld - b.geduld)[0];
    if (!g) continue;
    h.ziel = g.id;
    if (!g.gross) vergeben.add(g.id);
  }
}

/**
 * Dieselbe Hinweis-Einblendung höchstens alle SELTEN_S Sekunden (24.10., Erstspieler-Messung:
 * „gleich fertig“ und „schon unterwegs“ bei jedem ungeduldigen Tipp; selbst mit 30-s-Sperre noch 16-mal in 8 Minuten). Das Wackeln am Gast bzw.
 * Topf bleibt bei jedem Tipp - das reicht als Antwort.
 */
const SELTEN_S = 30, SELTEN_MAX = 3;   // je Sitzung höchstens drei Mal
function selten(art, text) {
  const z = lauf.seltenT = lauf.seltenT || {}, n = lauf.seltenN = lauf.seltenN || {};
  if ((n[art] || 0) >= SELTEN_MAX || (z[art] != null && lauf.t - z[art] < SELTEN_S)) return;
  z[art] = lauf.t; n[art] = (n[art] || 0) + 1;
  hooks.toast(text, 'hinweis');
}
export function tippeGast(platz) {
  const g = lauf.gaeste.find((x) => x.platz === platz && x.am && !x.gehen);
  if (!g || g.bedient) return;
  // Zuerst das Glas, das ihm gehört (grüner Haken), sonst jedes passende fertige
  glaeserZuordnen();
  let i = lauf.hand.findIndex((h) => bereit(h) && h.id === g.wunsch && h.ziel === g.id);
  if (i < 0) i = lauf.hand.findIndex((h) => bereit(h) && h.id === g.wunsch);
  if (i < 0) {
    // Das Richtige ist noch in Arbeit? Dann nur warten - keine Strafe
    if (lauf.hand.some((h) => h.art === 'voll' && h.id === g.wunsch)) {
      lauf.wackel['g' + g.id] = 0.2; selten('fertig', 'Noch einen Moment - es ist gleich fertig!');
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

/** Wie lange steht ein fertiges Wichtel-Glas bereit? Ohne dich nur kurz, aber lang genug zum Sehen. */
export const wichtelWartezeit = () => chefAktiv() ? C.WICHTEL_WARTEN : C.WICHTEL_BEREIT;

/**
 * Wen bedient der Servier-Wichtel als Nächstes? Den ungeduldigsten Gast am
 * Tresen - aber keine besonderen Gäste und Großbestellungen (Sache des
 * Chefs) und keinen, für den schon ein Glas auf dem Tablett steht.
 */
/**
 * Wen bedienst NUR du? Großbestellungen, Ansturm-Gäste, goldene Gäste und alle besonderen
 * (Weihnachtsmann, Rentier, Schneemann, Grummel und die Stammgäste). Die eine Stelle dafür
 * (25.10.: vorher stand die Regel nur hier im Filter - ein vom Wichtel eingeschenktes Glas
 * servierte er nach der Wartezeit trotzdem selbst, auch einem besonderen Gast).
 */
// 26.10. (Testbericht): Unter Aufsicht schnappten die Wichtel auch eilige Gäste und die Gäste,
// die das Getränk einer offenen Bitte wollten - Aufträge „eilige Gäste", die Socke „Flinke Hände"
// und Handgriff-Bitten hießen dann, den eigenen Wichteln zuvorkommen. Bist du am Stand, bleiben
// sie jetzt für dich (wie goldene Gäste). Die Bitte-Getränke setzt main.js je Sekunde.
let handWuensche = new Set();
export function setzeHandWuensche(s) { handWuensche = s; }
export const nurVonHand = (g) => !!(g.gross || g.ansturm || g.gold || C.GAESTE[g.typ].spezial
  || (aufsicht() && chefAktiv() && (g.eilig || handWuensche.has(g.wunsch))));
function servierKandidat() {
  return lauf.gaeste.filter((x) => x.am && !x.bedient && !x.gehen && !nurVonHand(x) && verfuegbar(x.wunsch)
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
    // 17.10.: mit Nachfüll-Wichtel nicht zum Topf schicken - der füllt gleich selbst nach
    selten('leer' + p.id, stufe('nachfuell') ? `${p.name} ist leer - der Nachfüll-Wichtel ist schon unterwegs!` : `${p.name} ist leer - erst nachfüllen!`);
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
  rufPunkt('gold');
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
  // Wetter mit Folgen: die passende Sorte zahlt heute mehr (auch bei den Wichteln)
  const lage = C.WETTER_LAGEN[Z.tagesWetter().art];
  if (lage && lage.gruppe.includes(p.id)) betrag *= 1 + lage.bonus;
  if (chorJetzt()) betrag *= 1 + C.CHOR.bonus;   // Adventssonntag: der Chor singt vor dem Haus
  const schwungVorher = lauf.schwung;
  if (!auto) {
    // Selbst serviert zählt doppelt (09.10., Nutzerwunsch: „wesentlich mehr
    // Sterne, wenn man selbst bedient") - die Wichtel kassieren nur den Preis
    betrag *= C.SELBST_MULT;
    if (st.zimt > 0) betrag *= C.HAENDLER_GUTSCHEIN.mult;   // Zimtstern-Gutschein vom Händler
    // Plätzchendose (10.10.): Wer selbst bedient wird, nimmt eins und gibt mehr
    if (st.dose && st.dose.length) { st.dose.shift(); betrag *= 1 + C.DOSE_BONUS; zaehleErfolg('kekse'); }
    lauf.schwung = lauf.schwungT > 0 ? Math.min(C.SCHWUNG_MAX, lauf.schwung + 1) : 1;
    lauf.schwungT = C.SCHWUNG_FENSTER;
    betrag *= 1 + lauf.schwung * C.SCHWUNG_PRO;
    // Goldener Gast: mindestens GOLD_MINUTEN Einnahmen (17.10.)
    if (g.gold) betrag = Math.max(betrag, einnahmenProMinute() * C.GOLD_MINUTEN * (1 + lauf.schwung * C.SCHWUNG_PRO));
    rufPunkt(g.gold || def.spezial ? 'gold' : 'normal');
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
  if (def.stamm) stammBedient(g);
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
  // Für die Bitten der Stammgäste (17.10.): je Sorte selbst serviert, mit Handgriff, goldene
  st.stats.produkt = st.stats.produkt || {}; st.stats.produkt[g.wunsch] = (st.stats.produkt[g.wunsch] || 0) + 1;
  if (faktor > 1) { st.stats.griffProdukt = st.stats.griffProdukt || {}; st.stats.griffProdukt[g.wunsch] = (st.stats.griffProdukt[g.wunsch] || 0) + 1; }
  if (g.gold) zaehleErfolg('gold');
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
  if (st.zimt > 0) st.zimt = Math.max(0, st.zimt - dt);   // Zimtstern zählt nur, solange gespielt wird (26.10.)
  const G = lauf.gaeste;
  const wt = dt * wichtelTempo();   // Wichtel-Zeit: schneller, wenn du da bist
  const ht = dt * helferTempo();    // Spülen und Nachfüllen: nie langsamer als normal

  // Großbestellung: nur wenn du da bist und der Stand zwei Plätze hat -
  // sonst blockiert sie den einzigen Platz
  if (lauf.t >= lauf.grossAb && chefAktiv() && nachStartRuhe() && lauf.stossRest === 0 && lauf.t > lauf.stossBis && st.stats.bedient >= C.GROSS_AB_BEDIENT
      && tresenPlaetze() >= 2 && lauf.stossRest === 0 && wartende().length < C.SCHLANGE_MAX
      && !G.some((g) => g.gross && !g.gehen)) {
    lauf.grossAb = lauf.t + C.GROSS_PAUSE * (0.8 + Math.random() * 0.4);
    const frei = produkteFrei().filter((p) => p.art !== 'platte');
    const p = frei[Math.floor(Math.random() * frei.length)];
    const n = 3 + 2 * handMax();
    const name = C.STOSS_GRUPPEN[Math.floor(Math.random() * C.STOSS_GRUPPEN.length)];
    const g = neuerGast('erwachsen', { id: p.id, n, stand: 0, wert: 0, name, zeit: C.GROSS_ZEIT_BASIS + n * C.GROSS_ZEIT_JE });
    if (g) kleideGruppe(g, name);
    if (g) { hooks.toast(`${name} bestellt ${n} × ${p.name}!`, 'spezial'); hooks.ton('spezial'); }
  }

  // Stoßzeit: wer länger spielt, bekommt Besuch
  lauf.aktivT += dt;
  if (lauf.aktivT >= C.STOSS_NACH && lauf.stossRest === 0 && lauf.t > lauf.stossBis && produkteFrei().length >= 2 && nachStartRuhe()
      && !lauf.gaeste.some((g) => g.gross && !g.gehen)) {   // nie zusammen mit einer Großbestellung (11.10.)
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
  if (lauf.ansturmT >= C.ANSTURM_NACH && st.ansturmTag !== echtMitternacht() && nachStartRuhe() && einstieg('ansturm')
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
      if (lauf.stossRest > 0) {
        // Gruppenbesuch (17.10.): die Leute sehen aus wie ihre Gruppe
        const kl = !lauf.ansturm && C.GRUPPEN_KLEIDUNG[lauf.stossName];
        const g = neuerGast(kl ? kl.typen[Math.floor(Math.random() * kl.typen.length)] : waehleTyp(false));
        if (g && lauf.ansturm) g.ansturm = true;
        else if (g) kleideGruppe(g, lauf.stossName);
        lauf.stossRest--;
      }
      else neuerGast();
    }
    lauf.spawnT = lauf.stossRest > 0 ? 0.9 : gastTakt() * (0.6 + Math.random() * 0.8);
  }

  // Plätze am Tresen vergeben (in Reihenfolge der Ankunft)
  const n = tresenPlaetze();
  const belegt = new Set(G.filter((g) => g.platz != null).map((g) => g.platz));
  for (let i = 0; i < n; i++) {
    if (belegt.has(i)) continue;
    // Goldene Gäste drängeln vor - in der Schlange gingen sie sonst oft verloren
    const naechster = G.find((g) => !g.gehen && g.platz == null && g.gold) || G.find((g) => !g.gehen && g.platz == null);
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
  // 19.10.: über die feste Zuordnung (glaeserZuordnen) - vorher hier je Bild neu
  // nach Geduld sortiert, und weil die Geduld des Reservierten festgehalten wird,
  // sprang die Reservierung bei zwei Gästen mit demselben Wunsch hin und her.
  glaeserZuordnen();
  const reserviert = new Set();
  for (const h of lauf.hand) {
    const g = h.art === 'voll' && h.ziel != null && G.find((x) => x.id === h.ziel);
    if (g && !g.gross) reserviert.add(g.id);
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
      if (reserviert.has(g.id) && (g.reservT = (g.reservT || 0) + dt) < C.GEDULD_RESERVIERT_MAX) g.geduld = Math.max(Math.min(g.geduld, C.GEDULD_RESERVIERT), g.geduld - dt);
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
    lauf.spuelT = (lauf.spuelT || 0) + ht;
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
    lauf.nachfuellT[p.id] = (lauf.nachfuellT[p.id] || 0) + ht;
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
      if (!g) {
        // Gast weg: Das Glas geht an den nächsten, der dasselbe will. Will es
        // länger keiner, kippt der Wichtel es weg - sonst stand das Tablett
        // irgendwann voll, und Spül- und Servier-Wichtel kamen nicht mehr
        // dran (gemeldet 13.10.: Wichtel füllen nicht mehr nach).
        const neu = G.find((x) => x.am && !x.bedient && !x.gehen && !nurVonHand(x) && x.wunsch === h.id && !lauf.hand.some((o) => o.fuer === x.id));
        if (neu) { h.fuer = neu.id; h.wartetT = 0; h.liegtT = 0; continue; }
        h.fuer = null;
        h.liegtT = (h.liegtT || 0) + dt;
        if (h.liegtT >= C.WICHTEL_WEGKIPPEN) { lauf.hand.splice(i, 1); hooks.ton('ausguss'); }
        continue;
      }
      h.wartetT = (h.wartetT || 0) + dt;
      // Besondere Gäste serviert er nie selbst - das Glas wartet auf deinen Tipp
      if (h.wartetT >= wichtelWartezeit() && !nurVonHand(g)) {
        lauf.hand.splice(i, 1);
        bediene(g, true, h.extraFertig ? 1 + (C.PRODUKT[h.id].bonus || C.EXTRA_BONUS) : 1);
      }
    }
    lauf.servierT += wt;
    if (lauf.servierT >= C.SERVIER_TAKT[sv]) {
      const g = servierKandidat();
      if (g) {
        // Ab der Aufsicht (17.10.) bedient er normale Gäste auch dann direkt,
        // wenn du da bist - davor schenkt er auf dein Tablett ein
        // Ohne dich (nichts getippt) füllt er trotzdem SICHTBAR ein (gemeldet 18.10.:
        // "ich sehe nicht, was gerade gemacht wird"); direkt bedient wird nur, wenn
        // das Tablett keinen Platz hat. Mit Aufsicht und Chef am Stand bleibt das Tablett frei.
        if (!((!aufsicht() || !chefAktiv()) && wichtelGlas(g))) {
          const p = C.PRODUKT[g.wunsch];
          if (p.art === 'platte') lauf.crepe.fertig = false; else st.toepfe[p.id]--;
          bediene(g, true);
        }
        lauf.servierT = 0;
      }
    }
  }

  // Der Nikolaus fliegt vorbei
  if (!lauf.schlitten && lauf.t >= lauf.schlittenAb && st.lernen >= 99 && einstieg('schlitten')) {
    lauf.schlitten = { t: 0, dauer: C.SCHLITTEN_DAUER, y: 0.12 + Math.random() * 0.3, gefangen: null };
    lauf.schlittenAb = lauf.t + C.SCHLITTEN_PAUSE[0] + Math.random() * (C.SCHLITTEN_PAUSE[1] - C.SCHLITTEN_PAUSE[0]);
    hooks.ton('glocken');
  }
  haendlerTakt(dt);
  vogelTakt(dt);
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
  if (!lauf.haendler && lauf.haendlerT >= lauf.haendlerAb && st.lernen >= 99 && st.tipps && st.tipps.karte_mehr && einstieg('haendler') && produkteFrei().length >= 2
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
    st.zimt = (st.zimt || 0) + w.dauer;
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
/** Restzeit des Zimtstern-Gutscheins in Sekunden Spielzeit (0 = keiner). */
export const zimtRest = () => Math.max(0, Math.ceil(st.zimt || 0));

// ---------------------------------------------------------------------------
// Der Weihnachtsmarkt (09.10.)
// ---------------------------------------------------------------------------
/** Spieltag als ganze Zahl (Tage seit 1970, nach der Spieluhr). */
const tagNr = () => Math.round(echtMitternacht() / 86400000);
function marktStand() {
  // Anker = erster Spieltag (11.10.), nicht der Tag, an dem zum ersten Mal
  // jemand nach dem Markt fragt - das war das erste Öffnen der Karte und
  // konnte auch Tag 2 sein. Alte Spielstände (spieltag 99): heute.
  const sp = spieltag();
  // Reparierter Stand (startTag war 0, siehe laden()): Takt neu, erster Markt heute
  if (st.marktHeilen) { delete st.marktHeilen; st.markt = { anker: tagNr() - C.MARKT_ERST, seed: (st.markt && st.markt.seed) || Math.floor(Math.random() * 1e6), besucht: 0, angesagt: 0 }; }
  if (!st.markt) st.markt = { anker: tagNr() - (sp < 99 ? sp : 0), seed: Math.floor(Math.random() * 1e6), besucht: 0, angesagt: 0 };
  // Anker immer aus dem ersten Spieltag (22.10.): Wer den Markt früher morgens
  // vor der Startuhrzeit zum ersten Mal abfragte, hatte ihn einen Tag zu spät
  else if (sp < 99) st.markt.anker = tagNr() - sp;
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
export const marktHeute = () => st.lernen >= 99 && einstieg('markt') && istMarkt(tagNr());
/** { heute, inTagen, datum } des nächsten Markts. */
export function marktInfo() {
  const heute = tagNr();
  let n = Math.max(0, (C.EINSTIEG.markt || 0) - spieltag());   // der erste Markt erst ab dem Einstiegstag
  while (n < 12 && !istMarkt(heute + n)) n++;
  const datum = new Date(echtMitternacht() + n * 86400000 + 12 * 3600000);
  return { heute: st.lernen >= 99 && n === 0, inTagen: n, datum };
}
/** Heutiges Angebot: Deko (bis MARKT_ANGEBOT, die man nicht hat, je Tag gemischt) und ein Rezept. */
export function marktAngebot() {
  const d = tagNr();
  const rest = C.MARKT_DEKO.filter((x) => !st.kalDeko[x.id]);
  rest.sort((a, b) => Z.hash(d * 7 + a.id.length * 13 + a.id.charCodeAt(2)) - Z.hash(d * 7 + b.id.length * 13 + b.id.charCodeAt(2)));
  // 27.10. (Nutzerwunsch): Rezepte gibt es nicht mehr auf dem Markt, sondern jederzeit im Supermarkt
  return { deko: rest.slice(0, C.MARKT_ANGEBOT), rezept: null };
}
/** Stufe eines Rezepts 0..3 (27.10.; alte Spielstände speicherten `true` = Stufe 1). */
export function rezeptStufe(id) { const v = (st.rezepte || {})[id]; return v === true ? 1 : Math.max(0, Math.min(C.REZEPT_STUFEN.length, v | 0)); }
/** Aufschlag eines Rezepts bis zur erreichten Stufe (0,2 · 0,5 · 0,9). */
export function rezeptPlus(id, stufe = rezeptStufe(id)) { return C.REZEPT_STUFEN.slice(0, stufe).reduce((a, x) => a + x.plus, 0); }
/** Preis der nächsten Stufe (oder null, wenn ausgebaut). */
export function rezeptPreis(w) {
  const s = rezeptStufe(w.id);
  if (s >= C.REZEPT_STUFEN.length) return null;
  const f = C.REZEPT_STUFEN[s].preis;
  return haendlerPreis({ min: w.min * f, minuten: w.minuten * f });
}
/** Ein Rezept im Supermarkt kaufen (27.10.), je Kauf eine Stufe mehr. true = gekauft. */
export function kaufeRezept(id) {
  const w = C.MARKT_REZEPTE.find((x) => x.id === id);
  const s = rezeptStufe(id);
  if (!w || s >= C.REZEPT_STUFEN.length) return false;
  const preis = rezeptPreis(w);
  if (st.geld < preis) return false;
  st.rezepte = st.rezepte || {}; st.rezepte[id] = s + 1;
  st.geld -= preis;
  hooks.ton('kauf'); hooks.geld();
  speichere();
  return true;
}
/** Aufschlag eines Getränks durch Rezepte vom Markt. */
export function produktPreis(p) {
  let f = 1;
  for (const x of C.MARKT_REZEPTE) if (x.fuer.includes(p.id)) f += rezeptPlus(x.id);
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
  st.stats.runden = st.stats.runden || {};
  st.stats.runden[name] = (st.stats.runden[name] || 0) + 1;   // für Wunschzettel und Album
  const mitSternen = l.runden < C.MINI_RUNDEN_STERNE;
  // Eine Runde ohne Punkte (abgebrochen, nichts getroffen) verbraucht keine der Sternerunden
  if (punkte > 0) { l.runden++; rufPunkt('mini'); }
  const special = specialHeute() === name;
  let sterne = mitSternen && punkte > 0 ? Math.max(20, Math.round(einnahmenProMinute() * Math.min(def.maxMin, punkte / def.jeMin))) : 0;
  if (special) sterne *= C.SPECIAL_STERNE;   // doppelte Sterne, Punkte und Rekord bleiben echt
  // Geschaffte Specials zählen (eins je Tag) - ab SPECIAL_DEKO_AB der Pokal
  const neuSp = [];
  if (special && punkte > 0) {
    const sp = st.special = st.special || { n: 0, tag: -1 };
    if (sp.tag !== tagNr()) { sp.tag = tagNr(); sp.n++; }
    if (sp.n >= C.SPECIAL_DEKO_AB) for (const d of C.SPECIAL_DEKO) if (!st.kalDeko[d.id]) neuSp.push(d);
  }
  if (sterne) verdiene(sterne);
  const vorher = l.best;
  if (punkte > l.best) l.best = punkte;
  const neu = [...def.deko.filter((d) => !st.kalDeko[d.id] && l.best >= d.ab), ...neuSp];
  st.neu = st.neu || {};
  for (const d of neu) { st.kalDeko[d.id] = true; st.neu[d.id] = true; }
  speichere();
  return { sterne, special, rekord: punkte > vorher && vorher > 0, best: l.best, neu, rest: miniRest(name) };
}
/*
 * Minispiel-Special (24.10., Takt 27.10.): ab SPECIAL_AB_TAG nach dem ersten Spieltag jeden
 * SPECIAL_ABSTAND-ten Tag, Spiele reihum (Reihenfolge aus dem Markt-Seed), nie zweimal dasselbe
 * Spiel hintereinander. Nur offene Spiele, erst ab SPECIAL_MIN_SPIELE offenen und wenn die Karte
 * vorgestellt ist. Fällt es auf einen Markttag, ist beides am selben Tag. Je Tag einmal gerechnet.
 */
let specialMerk = { schluessel: '', name: null };
export function specialHeute() {
  if (st.lernen < 99 || !(st.tipps && st.tipps.karte_mehr)) return null;
  const offen = Object.keys(C.MINISPIELE).filter(miniOffen);
  const heute = tagNr(), schluessel = heute + ':' + offen.join(',');
  if (specialMerk.schluessel === schluessel) return specialMerk.name;
  let name = null;
  // 27.10. (Nutzerwunsch): alle SPECIAL_ABSTAND (2) Tage, erst ab SPECIAL_MIN_SPIELE (3) offenen
  // Minispielen - ohne Ausweichen vor dem Markttag (vorher 2-3 Tage, nie am Markttag, ab 2 Spielen)
  if (offen.length >= C.SPECIAL_MIN_SPIELE) {
    const m = marktStand();
    // Feste, je Spielstand gemischte Reihenfolge ALLER Spiele, der Reihe nach (Betatest 24.10.:
    // mit einem Zufallsgriff in die heute offenen war die Backstube 6 von 13 Mal dran, und weil
    // sich die Liste mit jedem neuen Spiel änderte, griff die Sperre gegen Wiederholung nicht).
    // Noch geschlossene Spiele werden übersprungen.
    const reihe = Object.keys(C.MINISPIELE).map((n, j) => [n, Z.hash(m.seed * 0.37 + j * 7.13)]).sort((x, y) => x[1] - y[1]).map((x) => x[0]);
    const nimm = (i) => { for (let s = 0; s < reihe.length; s++) { const n = reihe[(i + s) % reihe.length]; if (offen.includes(n)) return n; } return null; };
    // Nie zweimal dasselbe hintereinander: verglichen mit dem Special, das WIRKLICH zuletzt dran war
    // (st.specialLetzt) - nachgerechnet kam rückwirkend etwas anderes heraus, sobald ein Spiel aufging
    const letzt = st.specialLetzt;
    const start = m.anker + C.SPECIAL_AB_TAG, seit = heute - start;
    if (seit >= 0 && seit % C.SPECIAL_ABSTAND === 0) {
      if (letzt && letzt.tag === heute && offen.includes(letzt.name)) name = letzt.name;   // heute schon festgelegt
      else {
        name = nimm(seit / C.SPECIAL_ABSTAND);
        if (letzt && letzt.tag < heute && letzt.name === name) name = nimm(reihe.indexOf(name) + 1);
      }
    }
    if (name && (!letzt || letzt.tag !== heute)) st.specialLetzt = { tag: heute, name };
  }
  specialMerk = { schluessel, name };
  return name;
}
/**
 * Steht das Minispiel schon auf der Karte? (10.10.) Nach Spieltag
 * (`C.MINI_AB_TAG`); einmal gespielt bleibt offen, alte Spielstände
 * (spieltag 99) haben alles. Spät im Dezember rücken die Termine zusammen.
 */
export function miniOffen(name) {
  const ab = C.MINI_AB_TAG[name] || 0;
  if (DEMO || st.miniAlle) return true;   // Vorführszenen; Spielstand von vor der Staffelung
  if (!ab || spieltag() >= ab || miniStand(name).best > 0) return true;
  const letzter = Math.max(...Object.values(C.MINI_AB_TAG));
  return Z.dezemberTag() >= C.MINI_ALLE_DEZ - (letzter - ab);
}
/**
 * Neu aufgegangene Minispiele melden (jede Sekunde aus main.js). Was beim
 * allerersten Aufruf schon offen ist, und alles, solange die Karte noch nicht
 * vorgestellt ist (Hinweis `karte_mehr` nennt die offenen selbst), wird still
 * gemerkt. Der Rest wartet in `st.miniHinweis`, bis sein Fenster kam.
 */
export function pruefeMiniFrei() {
  const erstes = !st.miniGemeldet;
  st.miniGemeldet = st.miniGemeldet || {};
  st.miniHinweis = st.miniAlle ? [] : st.miniHinweis || [];
  const reihe = Object.keys(C.MINISPIELE).sort((a, b) => (C.MINI_AB_TAG[a] || 0) - (C.MINI_AB_TAG[b] || 0));
  for (const n of reihe) {
    if (st.miniGemeldet[n] || !miniOffen(n)) continue;
    st.miniGemeldet[n] = true;
    if (!erstes && !st.miniAlle && st.tipps && st.tipps.karte_mehr) st.miniHinweis.push(n);   // alter Stand: kannte sie schon
  }
  return st.miniHinweis;
}
export const lichtungRest = () => miniRest('lichtung');
export const lichtungRekord = () => miniRekord('lichtung');
export const lichtungErgebnis = (punkte) => miniErgebnis('lichtung', punkte);

/** Versteckt sich der Weihnachtsmann diesmal auf der Karte? (würfelt, zählt je Tag) */
/**
 * Sucht gerade jemand den Weihnachtsmann (Wunschzettel oder Bitte von Sophia)? Dann zeigt er sich
 * bei jedem Öffnen der Karte (27.10., gemeldet: „zu selten, besonders mit dem Brief"). Kein
 * Dauer-Geschenk: Der Wunsch ist mit dem ersten Fund erfüllt.
 */
function santaGesucht() {
  const b = st.briefe && st.briefe.aktiv;
  if (b && b.art === 'santa' && !b.dank && (st.stats.santa || 0) <= (b.start || 0)) return true;
  const bt = st.bitte, d = bt && C.STAMM_BITTEN[bt.gast] && C.STAMM_BITTEN[bt.gast][bt.i];
  return !!(d && d.art === 'santa' && !bt.abgeholt && (st.stats.santa || 0) <= (bt.start || 0));
}
export function santaWuerfeln() {
  if (st.lernen < 99 || !st.tipps || !st.tipps.karte_mehr || !einstieg('santa')) return false;
  const s = st.santaKarte && st.santaKarte.tag === echtMitternacht() ? st.santaKarte : { tag: echtMitternacht(), n: 0 };
  st.santaKarte = s;
  if (santaGesucht()) { s.n++; speichere(); return true; }
  if (s.n >= C.SANTA_PRO_TAG || Math.random() >= C.SANTA_CHANCE) return false;
  s.n++;
  speichere();
  return true;
}
/** Den versteckten Weihnachtsmann gefunden: Sterne. */
export function fangeSanta() {
  const betrag = zehner(Math.max(C.SANTA_MIN, einnahmenProMinute() * C.SANTA_MINUTEN) * dev.geld);
  verdiene(betrag);
  st.stats.santa = (st.stats.santa || 0) + 1;
  hooks.ton('spezialKasse');
  hooks.toast(`Ho ho ho! Gefunden! Der Weihnachtsmann schenkt dir ${formatGeld(betrag)}.`, 'spezial');
  speichere();
  return betrag;
}

// ---------------------------------------------------------------------------
// Kirchenglocken (12.10.): zur vollen Stunde schlägt die Kirche die Stunde,
// um 18 Uhr kommt danach das Abendläuten. Nachts (22-7 Uhr) ist Ruhe.
// ---------------------------------------------------------------------------
/** Gibt { schlaege, abend } zurück, wenn es JETZT läuten soll - einmal je Stunde. */
export function glockenFaellig() {
  const d = Z.jetzt(), h = d.getHours();
  if (d.getMinutes() > 1 || h < C.GLOCKEN_VON || h > C.GLOCKEN_BIS) return null;
  const k = Z.tagesSchluessel() + '-' + h;
  if (lauf.glockeK === k) return null;
  lauf.glockeK = k;
  const schlaege = h % 12 || 12, abend = h === C.GLOCKEN_ABEND;
  // Die Glocke im Turm schwingt so lange, wie es läutet
  lauf.glockeBis = Date.now() + (schlaege * C.GLOCKEN_TAKT + (abend ? C.GLOCKEN_ABEND_DAUER : 0) + 2) * 1000;
  return { schlaege, abend };
}
/** Rentierspuren (12.10.): am Morgen nach einem gefangenen Nikolaus (bis
 *  12 Uhr) und am ganzen 1. Weihnachtstag - nur bei Schnee. */
export function rentierSpuren(d = Z.jetzt()) {
  if (Z.schnee(d) <= 0) return false;
  if (Z.dezemberTag(d) === 25) return true;
  const gestern = Z.tagesSchluessel(new Date(d.getTime() - 86400000));
  return st.nikolausTag === gestern && d.getHours() < 12;
}
/** Adventssonntag (12.10.): Von 15 bis 20 Uhr singt ein Chor vor dem Haus. */
export function chorJetzt(d = Z.jetzt()) {
  const h = d.getHours();
  return !!Z.adventssonntag(d) && h >= C.CHOR.von && h < C.CHOR.bis && st.lernen >= 99;
}
/** Einmal je Adventssonntag ansagen, wenn der Chor anfängt. */
export function chorAnsage() {
  if (!chorJetzt()) return false;
  const k = Z.tagesSchluessel();
  if (st.chorTag === k) return false;
  st.chorTag = k;
  return true;
}
export const glockeSchwingt = () => (lauf.glockeBis || 0) > Date.now();

/** Den Nikolaus angetippt: Sterne! Gibt den Betrag zurück (oder 0). */
export function fangeSchlitten() {
  const sl = lauf.schlitten;
  if (!sl || sl.gefangen != null) return 0;
  sl.gefangen = sl.t;
  st.nikolausTag = Z.tagesSchluessel();   // am Morgen danach: Rentierspuren im Schnee
  zaehleErfolg('nikolaus');
  const betrag = zehner(Math.max(C.SCHLITTEN_MIN, einnahmenProMinute() * C.SCHLITTEN_MINUTEN) * dev.geld);
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
  const b = zehner(st.kiste || 0);
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
  const betrag = zehner(n * durchschnittsPreis() * preisFaktor() * dev.geld);
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
/** Runde Beträge für den Kalender (21.10.): unter 1.000 in 100er-, darüber in 1.000er-Schritten. */
const glatt = (n) => (n < 950 ? Math.max(100, Math.round(n / 100) * 100) : Math.round(n / 1000) * 1000);

export function oeffneTuer(n) {
  if (!tuerBereit(n)) return null;
  st.kalender[n] = true;
  const deko = C.KALENDER_DEKO[n];
  let ergebnis;
  if (deko) { st.kalDeko[deko.id] = true; st.neu = st.neu || {}; st.neu[deko.id] = true; ergebnis = { deko }; }
  else {
    const betrag = glatt(Math.max(C.KALENDER_GELD_MIN, st.gesamt * C.KALENDER_GELD_ANTEIL));
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
  const betrag = glatt(Math.max(C.VORFREUDE_MIN, st.gesamt * C.VORFREUDE_ANTEIL));
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

// ---------------------------------------------------------------------------
// Barbarazweig: am 4.12. geschnitten, jeden Tag gegossen, blüht an Heiligabend
// ---------------------------------------------------------------------------
// Es gibt nichts zu verlieren: Ungegossen blüht er trotzdem, nur mit weniger
// Blüten. `st.barbara` = { geschnitten: Dezembertag, gegossen: [Dezembertage] }.
const barbaraZeit = () => Z.phase() === 'advent' || Z.phase() === 'weihnacht';
export function barbaraSchneidbar() {
  const dt = Z.dezemberTag();
  return Z.phase() === 'advent' && !st.barbara && dt >= C.BARBARA_TAG && dt < 24 && st.lernen >= 99;
}
export function barbaraSchneiden() {
  if (!barbaraSchneidbar()) return false;
  st.barbara = { geschnitten: Z.dezemberTag(), gegossen: [] };
  speichere();
  return true;
}
export function barbaraGiessbar() {
  const b = st.barbara;
  return !!b && Z.phase() === 'advent' && !b.gegossen.includes(Z.dezemberTag());
}
export function barbaraGiessen() {
  if (!barbaraGiessbar()) return false;
  st.barbara.gegossen.push(Z.dezemberTag());
  speichere();
  return true;
}
const barbaraBlueten = (b) => Math.min(C.BARBARA_BLUETEN_MAX, C.BARBARA_BLUETEN_MIN + b.gegossen.length);
/** Wie weit ist er? null = kein Zweig (oder Saison vorbei). */
export function barbaraZustand() {
  const b = st.barbara;
  if (!b || !barbaraZeit()) return null;
  const dt = Math.min(24, Z.dezemberTag());
  // Wachstum 0..1 vom Schneiden bis Heiligabend
  const wachs = Math.max(0, Math.min(1, (dt - b.geschnitten) / Math.max(1, 24 - b.geschnitten)));
  return { wachs, bluehen: dt >= 24, blueten: barbaraBlueten(b), gegossen: b.gegossen.length, heuteGegossen: b.gegossen.includes(Z.dezemberTag()) };
}

// ---------------------------------------------------------------------------
// Heiligabend: einmal je Saison das Finale mit Rückblick
// ---------------------------------------------------------------------------
/** Ab 24.12. abends bis zum 6. Januar - wer später kommt, bekommt es nachgereicht. */
export function heiligabendJetzt() {
  const d = Z.jetzt(), dt = Z.dezemberTag(d);
  return (dt === 24 && d.getHours() >= C.HEILIGABEND_STUNDE) || (dt > 24 && dt <= 37);
}
/** Der Abend selbst: Glocken, Sänger vor dem Haus, Kirche hell. */
export function heiligabendAbend(d = Z.jetzt()) {
  return Z.dezemberTag(d) === 24 && d.getHours() >= C.HEILIGABEND_STUNDE - 1;
}
export function heiligabendFaellig() {
  return st.lernen >= 99 && heiligabendJetzt() && st.heiligabend !== Z.saison();
}
export function heiligabendGesehen() { st.heiligabend = Z.saison(); speichere(); }
/** Zahlen für den Rückblick. */
export function rueckblick() {
  const deko = C.ARTIKEL.filter((a) => istDeko(a) && hat(a.id)).length + Object.keys(st.kalDeko || {}).length;
  return {
    bedient: st.stats.bedient, verdient: st.gesamt, stimmung: stimmung(), deko,
    tueren: Object.keys(st.kalender || {}).length, santa: st.stats.santa || 0,
    getraenke: C.PRODUKTE.filter((p) => hat(p.id)).length,
    rekorde: Object.keys(C.MINISPIELE).filter((n) => miniRekord(n) > 0).length,
    blueten: st.barbara ? barbaraBlueten(st.barbara) : 0,
    voegel: Object.keys(st.voegel || {}).length, schneemann: schneemannStufe(), schneekatze: schneekatzeStufe(),
    wettbewerb: st.wettbewerb && st.wettbewerb.saison === Z.saison() ? st.wettbewerb.platz : null,
  };
}

// ---------------------------------------------------------------------------
// Backstube (10.10.): Rezepte hängen am Rekord, Plätzchen kommen in die Dose
// ---------------------------------------------------------------------------
export const backRezepte = () => C.BACK_REZEPTE.filter((r) => miniRekord('back') >= r.ab);
export const dose = () => st.dose || [];
/** Nach einer Runde: die gebackenen Plätzchen in die Dose (höchstens DOSE_MAX). */
export function fuelleDose(ids) {
  st.dose = [...dose(), ...ids].slice(-C.DOSE_MAX);
  st.stats.gebacken = (st.stats.gebacken || 0) + ids.length;
  speichere();
}

// ---------------------------------------------------------------------------
// Wunschzettel (10.10.): Ab und zu steckt ein Kinderbrief im Briefkasten. Ist
// der Wunsch erfüllt, bedankt sich das Kind mit einem Bild und ein paar
// Sternen. Nichts läuft ab, nichts wird angezeigt außer der Fahne am Kasten.
// st.briefe = { aktiv: {…} | null, erfuellt: [{…}], ab: Tagnummer, n }
// ---------------------------------------------------------------------------
export function briefe() {
  st.briefe = st.briefe || { aktiv: null, erfuellt: [], ab: 0, n: 0 };
  return st.briefe;
}
const wahlAus = (l) => l[Math.floor(Math.random() * l.length)];
/** Was kann sich ein Kind gerade wünschen? Nur, was es zu kaufen gibt und bald bezahlbar ist. */
function wunschKandidaten() {
  const grenze = Math.max(300, st.geld * 2 + einnahmenProMinute() * 40);
  const kaufbar = (a) => !hat(a.id) && sichtbarUndFrei(a) && !a.luxus && status(a).kosten != null && status(a).kosten <= grenze;
  const nachPreis = (l) => l.sort((x, y) => status(x).kosten - status(y).kosten).slice(0, 4);
  const deko = nachPreis(C.ARTIKEL.filter((a) => istDeko(a) && !a.wahl && kaufbar(a)));
  const getraenk = nachPreis(C.ARTIKEL.filter((a) => a.tab === 'super' && kaufbar(a)));
  const m = [];
  for (const a of deko) m.push({ art: 'deko', ziel: a.id, w: 3 / deko.length });
  for (const a of getraenk) m.push({ art: 'getraenk', ziel: a.id, w: 1.5 / getraenk.length });
  if (st.tipps && st.tipps.karte_mehr) {
    if (!briefe().erfuellt.some((b) => b.art === 'santa')) m.push({ art: 'santa', w: 0.6 });
    if (miniOffen('back')) m.push({ art: 'backen', w: 0.7 });
    if (miniOffen('eis')) m.push({ art: 'eis', w: 0.5 });
  }
  return m;
}
/** Stand der Zähler, an denen ein Aktionswunsch gemessen wird. */
function briefZaehler(art) {
  if (art === 'santa') return st.stats.santa || 0;
  if (art === 'backen') return st.stats.gebacken || 0;
  if (art === 'eis') return (st.stats.runden && st.stats.runden.eis) || 0;
  return 0;
}
export function briefErfuellt(b) {
  if (b.art === 'deko' || b.art === 'getraenk') return hat(b.ziel);
  if (b.art === 'backen') return briefZaehler('backen') >= b.start + C.BRIEF_BACKEN;
  return briefZaehler(b.art) > b.start;
}
/**
 * Beim Ankommen und jede Minute: neuen Brief einwerfen, erfüllte Wünsche
 * merken. Gibt 'neu' | 'dank' | null zurück (für einen kurzen Hinweis).
 */
export function briefPruefen() {
  if (st.lernen < 99 || spieltag() < C.BRIEF_AB_TAG) return null;
  const B = briefe();
  if (B.aktiv) {
    if (!B.aktiv.dank && briefErfuellt(B.aktiv)) { B.aktiv.dank = true; B.aktiv.offen = true; speichere(); return 'dank'; }
    // Gelesen und seit BRIEF_WECHSEL Tagen nicht erfüllt (22.10.): Das Kind hat
    // sich etwas anderes überlegt, es kommt ein neuer Brief. Vorher blockierte ein
    // offener Wunsch für immer, und es kam bis Heiligabend kein Brief mehr.
    if (B.aktiv.dank || B.aktiv.offen || tagNr() - B.aktiv.tag < C.BRIEF_WECHSEL) return null;
    B.aktiv = null; B.n = Math.max(0, B.n - 1);
  }
  if (B.n >= C.BRIEF_MAX || tagNr() < B.ab) return null;
  const k = wunschKandidaten();
  if (!k.length) return null;
  const w = zufallGewichtet(k, (x) => x.w);
  const frei = C.BRIEF_KINDER.filter((x) => !B.erfuellt.some((b) => b.kind === x.name));
  const kind = wahlAus(frei.length ? frei : C.BRIEF_KINDER);
  B.aktiv = { art: w.art, ziel: w.ziel || null, kind: kind.name, alter: kind.alter, maedchen: kind.maedchen, start: briefZaehler(w.art), tag: tagNr(), offen: true, dank: false, v: Math.floor(Math.random() * 2) };
  B.n++;
  speichere();
  return 'neu';
}
/** Liegt etwas im Briefkasten (Fahne oben)? */
export const briefDa = () => !!(st.briefe && st.briefe.aktiv && st.briefe.aktiv.offen);
/** Den Brief gelesen: Fahne runter. */
export function briefGelesen() { if (st.briefe && st.briefe.aktiv) { st.briefe.aktiv.offen = false; speichere(); } }
/** Dankesbild abholen: Sterne, Bild ins Album, morgen kommt vielleicht der nächste Brief. */
export function briefDank() {
  const B = briefe(), b = B.aktiv;
  if (!b || !b.dank) return 0;
  const betrag = Math.max(C.BRIEF_LOHN_MIN, zehner(einnahmenProMinute() * C.BRIEF_LOHN_MINUTEN));
  verdiene(betrag);
  B.erfuellt.push({ art: b.art, ziel: b.ziel, kind: b.kind, alter: b.alter, maedchen: b.maedchen, tag: tagNr() });
  B.aktiv = null;
  B.ab = tagNr() + 1;
  speichere();
  return betrag;
}

// ---------------------------------------------------------------------------
// Baumschule (22.10.) beim Christbaumverkauf: eigene Tannen ziehen. Sie wachsen
// von selbst (BAUMSCHULE_JE_TAG je Kalendertag), Gießen und Düngen (je einmal am
// Tag, für alle Beete) machen sie schneller. Nichts verdorrt, keine Strafe.
// Fertig geerntete Bäume stehen im Minispiel golden im Feld und bringen ×3.
// st.baumschule = { beete: [{ art, tag0, bonus } | null], ware: [art], gegossen, geduengt, eich }
// ---------------------------------------------------------------------------
export function baumschule() {
  const b = st.baumschule = st.baumschule || { beete: [], ware: [], gegossen: 0, geduengt: 0, eich: null };
  while (b.beete.length < C.BAUMSCHULE_BEETE) b.beete.push(null);
  return b;
}
export const baumschuleOffen = () => miniOffen('baum');
export const heuteNr = () => tagNr();
/** Wachstum eines Beets 0..1. */
export function beetWachs(beet) { return beet ? Math.min(1, Math.max(0, (tagNr() - beet.tag0) * C.BAUMSCHULE_JE_TAG + beet.bonus + 1e-9)) : 0; }   // 1e-9: 6 × 1/6 soll genau 1 ergeben
/** Stufe zum Zeichnen: 0 Setzling, 1 klein, 2 mittel, 3 groß (fertig). */
export const beetStufe = (beet) => { const w = beetWachs(beet); return w >= 1 ? 3 : w >= 0.6 ? 2 : w >= 0.3 ? 1 : 0; };
export function pflanze(i, art) {
  const B = baumschule();
  if (B.beete[i]) return false;
  B.beete[i] = { art, tag0: tagNr(), bonus: 0 };
  st.stats.baumschule = (st.stats.baumschule || 0) + 1;
  hooks.ton('schnee'); speichere();
  return true;
}
// 23.10.: Frisch Gepflanztes kann man erst am nächsten Tag gießen und düngen
const wachsende = () => baumschule().beete.filter((b) => b && beetWachs(b) < 1 && b.tag0 < tagNr());
export const heuteGepflanzt = () => baumschule().beete.some((b) => b && b.tag0 === tagNr());
export const kannGiessen = () => baumschule().gegossen !== tagNr() && wachsende().length > 0;
export const kannDuengen = () => baumschule().geduengt !== tagNr() && wachsende().length > 0;
export const duengerPreis = () => Math.max(C.BAUMSCHULE_DUENGER_MIN, Math.round(einnahmenProMinute() * C.BAUMSCHULE_DUENGER_MIN_MINUTEN / 10) * 10);
export function giesse() {
  if (!kannGiessen()) return false;
  const B = baumschule();
  for (const b of wachsende()) b.bonus += C.BAUMSCHULE_GIESSEN;
  B.gegossen = tagNr();
  hooks.ton('giessen'); speichere();
  return true;
}
export function duenge() {
  if (!kannDuengen() || st.geld < duengerPreis()) return false;
  const B = baumschule();
  st.geld -= duengerPreis(); hooks.geld();
  for (const b of wachsende()) b.bonus += C.BAUMSCHULE_DUENGER;
  B.geduengt = tagNr();
  hooks.ton('koerner'); speichere();
  return true;
}
/** Fertigen Baum ernten: kommt in den Verkauf (golden im Minispiel). */
export function ernte(i) {
  const B = baumschule(), b = B.beete[i];
  if (!b || beetWachs(b) < 1 || B.ware.length >= C.BAUMSCHULE_WARE_MAX) return false;
  B.ware.push(b.art); B.beete[i] = null;
  hooks.ton('kasse'); speichere();
  return true;
}
/** Im Minispiel verkaufte eigene Bäume abbuchen. */
export function eigeneVerkauft(arten) {
  const B = baumschule();
  for (const a of arten) { const k = B.ware.indexOf(a); if (k >= 0) B.ware.splice(k, 1); }
  if (arten.length) { st.stats.eigeneBaeume = (st.stats.eigeneBaeume || 0) + arten.length; speichere(); }
}
/** Gibt es in der Baumschule etwas zu tun? (Punkt auf der Karte) */
// Ernten zählt nur, wenn im Lager Platz ist (23.10., Betatest: bei vollem Lager leuchtete der Punkt für immer)
export const baumschuleTun = () => baumschuleOffen() && (kannGiessen() || (baumschule().ware.length < C.BAUMSCHULE_WARE_MAX && baumschule().beete.some((b) => b && beetWachs(b) >= 1)) || (baumschule().beete.some((b) => !b) && st.stats.baumschule == null));
/**
 * Eichhörnchen (einmal am Tag gewürfelt): versteckt sich in einem halbwegs
 * großen Baum und lugt ab und zu hervor. Rückgabe Beet-Index oder -1.
 */
export function eichhoernchen() {
  const B = baumschule(), heute = tagNr();
  if (!B.eich || B.eich.tag !== heute) {
    const kandidaten = B.beete.map((b, i) => (b && beetWachs(b) >= 0.3 ? i : -1)).filter((i) => i >= 0);
    B.eich = { tag: heute, beet: kandidaten.length && Math.random() < C.BAUMSCHULE_EICH_CHANCE ? kandidaten[Math.floor(Math.random() * kandidaten.length)] : -1, gefangen: false };
    speichere();
  }
  const beet = B.beete[B.eich.beet];
  return B.eich.gefangen || !beet || beetWachs(beet) < 0.3 ? -1 : B.eich.beet;   // geerntet: weg ist es
}
export function fangeEichhoernchen() {
  const B = baumschule();
  if (eichhoernchen() < 0) return 0;
  B.eich.gefangen = true;
  const betrag = Math.max(C.BAUMSCHULE_EICH_MIN, zehner(einnahmenProMinute() * C.BAUMSCHULE_EICH_MINUTEN));
  verdiene(betrag);
  speichere();
  return betrag;
}

// ---------------------------------------------------------------------------
// Album (10.10.): was man schon gesehen hat - Gäste, Tiere, Rezepte, Bilder
// ---------------------------------------------------------------------------
/**
 * Seltene Gäste der Waldlichtung (10.10.): Fuchs, Wildschwein, Igel. Einer
 * kommt nur alle 4-7 Runden. `st.lichtungSelten.rest` = so viele Runden
 * noch ohne; bei 0 ist diese Runde die seltene. Gewählt wird bevorzugt ein
 * Tier, das man noch nicht gefüttert hat (fürs Album).
 */
const SELTEN = ['fuchs', 'schwein', 'igel'];
const seltenPause = () => 3 + Math.floor(Math.random() * 4);   // 3-6 Runden ohne → alle 4-7
export function lichtungSelten() {
  const L = st.lichtungSelten || (st.lichtungSelten = { rest: seltenPause(), art: null });
  if (L.rest > 0) return null;
  if (!L.art) {
    const t = st.stats.tiere || {};
    const neu = SELTEN.filter((a) => !t[a]);
    const liste = neu.length ? neu : SELTEN;
    L.art = liste[Math.floor(Math.random() * liste.length)];
  }
  return L.art;
}
/** Nach jeder fertigen Runde weiterzählen. */
export function lichtungRundeVorbei() {
  const L = st.lichtungSelten;
  if (!L) return;
  if (L.rest > 0) L.rest--;
  else { L.rest = seltenPause(); L.art = null; }
}
export function zaehleTiere(arten) {
  st.stats.tiere = st.stats.tiere || {};
  for (const [a, n] of Object.entries(arten || {})) st.stats.tiere[a] = (st.stats.tiere[a] || 0) + n;
  speichere();
}

// ---------------------------------------------------------------------------
// Feierabend (11.10.): 17 bis 19 Uhr mehr Gäste
// ---------------------------------------------------------------------------
export function feierabend(d = Z.jetzt()) {
  const h = d.getHours();
  return h >= C.FEIERABEND.von && h < C.FEIERABEND.bis;
}
/** Einmal am Tag sagen, wenn der Feierabend beginnt (aus der Sekundenschleife). */
export function feierabendAnsage() {
  if (st.lernen < 99 || !feierabend() || !startzieleFertig()) return false;
  const k = Z.tagesSchluessel();
  if (st.feierabendTag === k) return false;
  st.feierabendTag = k;
  return true;
}

// ---------------------------------------------------------------------------
// Futterhaus und Vögel (11.10.)
// ---------------------------------------------------------------------------
export const futterVoll = () => hat('futterhaus') && (st.futterBis || 0) > Z.jetzt().getTime();
export function fuettere() {
  if (!hat('futterhaus')) return false;
  const vorher = futterStand().stufe;
  if (vorher >= 5) return false;   // ist schon ganz voll: nichts zu tun
  st.futterBis = Z.jetzt().getTime() + C.FUTTER_STUNDEN * 3600000;
  if (!st.futterStart) st.futterStart = Z.jetzt().getTime();   // ab heute kommen die Vogelarten nach und nach (21.10.)
  // Jedes echte Nachfüllen zählt (18.10.: vorher nur bei ganz leerem Haus - Karls Bitte blieb sonst offen)
  zaehleErfolg('futter');
  if (vorher === 0) lauf.vogelAb = Math.min(lauf.vogelAb, 3);   // gleich kommt der erste
  speichere();
  return true;
}
/**
 * Wie voll ist das Futterhaus? (18.10.) Das Futter sinkt über FUTTER_STUNDEN
 * gleichmäßig: stufe 5 (voll) bis 1 (fast leer), 0 = leer.
 */
export function futterStand() {
  const rest = hat('futterhaus') ? Math.max(0, (st.futterBis || 0) - Z.jetzt().getTime()) : 0;
  const anteil = Math.min(1, rest / (C.FUTTER_STUNDEN * 3600000));
  return { rest, anteil, stufe: rest <= 0 ? 0 : Math.min(5, Math.ceil(anteil * 5)) };
}
const istNacht = () => Z.licht().hell <= 0.12;   // nachts nur Rotkehlchen und Waldkauz
/** Tage seit dem ersten Füllen des Futterhauses (21.10.; ohne Füllen 0). */
const futterTage = () => (st.futterStart ? Math.max(0, Math.floor((Z.jetzt().getTime() - st.futterStart) / 86400000)) : 0);
/** Welche Arten kommen schon? Nach und nach (`abTag`), schon gesehene immer (21.10.). */
export function vogelArtenFrei() {
  const tage = futterTage(), vg = st.voegel || {};
  return C.VOEGEL.filter((v) => vg[v.id] || tage >= (v.abTag || 0));
}
function vogelWahl() {
  const schnee = Z.schnee() > 0, knoedel = !!st.kalDeko.kal_knoedel, nacht = istNacht();
  const liste = vogelArtenFrei().filter((v) => (!v.schnee || schnee) && (nacht ? v.nacht || v.nachtAuch : !v.nacht));
  if (!liste.length) return null;   // z. B. nachts, bevor Rotkehlchen und Waldkauz dran sind
  const gew = (v) => v.w * (v.selten && knoedel ? C.KNOEDEL_SELTEN : 1);
  let r = Math.random() * liste.reduce((s, v) => s + gew(v), 0);
  for (const v of liste) { r -= gew(v); if (r <= 0) return v; }
  return liste[0];
}
/**
 * Vogel im Futterhaus-Fenster angetippt: einmal je Besuch Sterne, je seltener die
 * Art, desto mehr (`sterne` in C.VOEGEL, 19.10.). Rückgabe: Betrag, 0 = nichts.
 */
export function vogelAntippen(b) {
  if (!b || b.belohnt || b.t < 1.2 || b.t > b.bleibt) return 0;   // nur solange er sitzt
  b.belohnt = true;
  const v = C.VOEGEL.find((q) => q.id === b.art);
  const basis = (v && v.sterne) || C.VOGEL_STERNE;
  const betrag = zehner(Math.max(basis, einnahmenProMinute() * basis * C.VOGEL_MINUTEN_JE_STERN) * dev.geld);   // 27.10.: wächst mit
  verdiene(betrag);
  speichere();
  return betrag;
}
/** Der Vogel im Flugloch angetippt (19.10.): einmal GUCK_MINUTEN Einnahmen, mindestens C.GUCK_STERNE. */
export function guckVogelAntippen(g) {
  if (!g || g.belohnt || !g.sichtbar) return 0;
  g.belohnt = true;
  const betrag = zehner(Math.max(C.GUCK_STERNE, einnahmenProMinute() * C.GUCK_MINUTEN) * dev.geld);
  verdiene(betrag);
  speichere();
  return betrag;
}
/** Auch vom Futterhaus-Fenster aufgerufen: dort steht das Spiel, aber die Vögel kommen und gehen weiter. */
export function vogelTakt(dt) {
  const V = lauf.voegel;
  for (const v of V) v.t += dt;
  // Wer seine Zeit abgesessen hat, fliegt los (1,2 s Flug), danach ist er weg
  for (let i = V.length - 1; i >= 0; i--) if (V[i].t > V[i].bleibt + 2.4) V.splice(i, 1);
  if (!zeigt('futterhaus') || !futterVoll() || st.lernen < 99) return;
  lauf.vogelAb -= dt;
  if (lauf.vogelAb > 0 || V.length >= C.VOGEL_MAX) return;
  lauf.vogelAb = (C.VOGEL_TAKT[0] + Math.random() * (C.VOGEL_TAKT[1] - C.VOGEL_TAKT[0])) * (istNacht() ? C.VOGEL_NACHT_TAKT : 1);
  const frei = [0, 1, 2, 3].filter((p) => !V.some((v) => v.platz === p));
  if (!frei.length) return;
  const art = vogelWahl();
  if (!art) return;
  V.push({ art: art.id, platz: frei[Math.floor(Math.random() * frei.length)], t: 0,
    bleibt: C.VOGEL_BLEIBT[0] + Math.random() * (C.VOGEL_BLEIBT[1] - C.VOGEL_BLEIBT[0]), links: Math.random() < 0.5 });
  st.voegel = st.voegel || {};
  const neu = !st.voegel[art.id];
  st.voegel[art.id] = (st.voegel[art.id] || 0) + 1;
  // Neue Art (14.10., gemeldet: „man checkt nicht, dass neue Vögel da sind"):
  // eigenes Fenster mit Bild und Steckbrief, sobald nichts anderes offen ist (main.js)
  if (neu) { st.vogelNeu = st.vogelNeu || []; st.vogelNeu.push(art.id); }
  speichere();
}

// ---------------------------------------------------------------------------
// Der eigene Schneemann (11.10.): einmal am Tag eine Stufe
// ---------------------------------------------------------------------------
export function schneemannStufe() { return (st.schneemann && st.schneemann.stufe) || 0; }
function schneemannHerzen() {
  const s = schneemannStufe();
  return s * C.SCHNEEMANN_HERZ + (s >= C.SCHNEEMANN_STUFEN ? C.SCHNEEMANN_FERTIG : 0);
}
/** Kann man heute weiterbauen? (Funkeln am Schneehaufen) */
export const schneemannBereit = () => Z.schnee() > 0 && schneemannStufe() < C.SCHNEEMANN_STUFEN
  && (!st.schneemann || st.schneemann.tag !== Z.tagesSchluessel());
/** 'gebaut' | 'fertig' (gerade fertig geworden) | 'morgen' | 'kein' (kein Schnee) | 'ist' (schon fertig) */
export function baueSchneemann() {
  if (Z.schnee() <= 0) return 'kein';
  const s = schneemannStufe();
  if (s >= C.SCHNEEMANN_STUFEN) return 'ist';
  if (st.schneemann && st.schneemann.tag === Z.tagesSchluessel()) return 'morgen';
  st.schneemann = { stufe: s + 1, tag: Z.tagesSchluessel() };
  speichere();
  return s + 1 >= C.SCHNEEMANN_STUFEN ? 'fertig' : 'gebaut';
}

// Die Schneekatze auf dem Dach (18.10.): gleiche Regeln wie der Schneemann, eigener Stand
export function schneekatzeStufe() { return (st.schneekatze && st.schneekatze.stufe) || 0; }
function schneekatzeHerzen() {
  const s = schneekatzeStufe();
  return s * C.SCHNEEMANN_HERZ + (s >= C.SCHNEEMANN_STUFEN ? C.SCHNEEMANN_FERTIG : 0);
}
export const schneekatzeBereit = () => Z.schnee() > 0 && schneekatzeStufe() < C.SCHNEEMANN_STUFEN
  && (!st.schneekatze || st.schneekatze.tag !== Z.tagesSchluessel());
/** Wie baueSchneemann: 'gebaut' | 'fertig' | 'morgen' | 'kein' | 'ist' */
export function baueSchneekatze() {
  if (Z.schnee() <= 0) return 'kein';
  const s = schneekatzeStufe();
  if (s >= C.SCHNEEMANN_STUFEN) return 'ist';
  if (st.schneekatze && st.schneekatze.tag === Z.tagesSchluessel()) return 'morgen';
  st.schneekatze = { stufe: s + 1, tag: Z.tagesSchluessel() };
  speichere();
  return s + 1 >= C.SCHNEEMANN_STUFEN ? 'fertig' : 'gebaut';
}

// ---------------------------------------------------------------------------
// Das schönste Haus im Dorf (11.10.): die Jury - seit 27.10. am 23.12. (C.WETTBEWERB.tag, Nutzerwunsch;
// vorher am 4. Advent, je nach Jahr schon am 18.-24.12.). Am 24. wird sie noch nachgeholt.
// ---------------------------------------------------------------------------
export function wettbewerbFaellig() {
  if (st.lernen < 99 || DEMO) return false;
  if (st.wettbewerb && st.wettbewerb.saison === Z.saison()) return false;
  const dt = Z.dezemberTag();
  if (dt < C.WETTBEWERB.tag || dt > 24) return false;
  return spieltag() >= C.WETTBEWERB.abSpieltag;
}
/** Ab dem 3. Advent: in wie vielen Tagen kommt die Jury? (null = nicht dabei / schon vorbei) */
export function wettbewerbInTagen() {
  const dt = Z.dezemberTag();
  if (st.lernen < 99 || Z.adventKerzen() < 3 || dt > C.WETTBEWERB.tag) return null;
  return C.WETTBEWERB.tag - dt;
}
/** Jury-Ansage als Fenster (25.10.): einmal je Saison, ab 4 Tage vor dem Jury-Tag. */
export const juryAnsageFaellig = () => {
  const n = wettbewerbInTagen();
  return n != null && n >= 1 && n <= 4 && st.juryAnsage !== Z.saison() && spieltag() + n >= C.WETTBEWERB.abSpieltag;
};
export function juryAngesagt() { st.juryAnsage = Z.saison(); speichere(); }
export function wettbewerbPlatz(s = stimmung()) {
  const i = C.WETTBEWERB.plaetze.findIndex((p) => s >= p.ab);
  return i < 0 ? C.WETTBEWERB.plaetze.length : i;   // plaetze.length = Urkunde
}
export function wettbewerbAuswerten() {
  const s = stimmung(), platz = wettbewerbPlatz(s);
  const betrag = zehner(Math.max(C.WETTBEWERB.lohnMin, einnahmenProMinute() * C.WETTBEWERB.lohn[platz]));
  verdiene(betrag);
  st.wettbewerb = { saison: Z.saison(), platz, stimmung: s, betrag };
  speichere();
  return st.wettbewerb;
}
/** Plakette am Haus: Platz dieser Saison oder null. */
export const plakette = () => (st.wettbewerb && st.wettbewerb.saison === Z.saison() && st.wettbewerb.platz < C.WETTBEWERB.plaetze.length ? st.wettbewerb.platz : null);

// ---------------------------------------------------------------------------
// Silvester (11.10.): Feuerwerk und der Abschluss der Saison
// ---------------------------------------------------------------------------
/** Wie viel Feuerwerk gerade am Himmel ist (0..1). */
export function feuerwerk(d = Z.jetzt()) {
  const m = d.getMonth(), tag = d.getDate(), h = d.getHours() + d.getMinutes() / 60;
  if (m === 11 && tag === 31 && h >= C.SILVESTER_STUNDE) return h >= 23.75 ? 0.7 : 0.25 + (h - C.SILVESTER_STUNDE) / 6 * 0.25;
  if (m === 0 && tag === 1 && h < 3) return h < 0.5 ? 1 : h < 1 ? 0.6 : 0.3 * (3 - h) / 2;
  return 0;
}
export function silvesterJetzt(d = Z.jetzt()) {
  const dt = Z.dezemberTag(d);
  return (dt === 31 && d.getHours() >= C.SILVESTER_STUNDE) || (dt > 31 && dt <= 60);
}
export const silvesterFaellig = () => st.lernen >= 99 && !DEMO && silvesterJetzt() && st.silvester !== Z.saison();
export function silvesterGesehen() { st.silvester = Z.saison(); speichere(); }
/** Um Mitternacht einmal „Frohes neues Jahr!" (aus der Sekundenschleife). */
export function neujahrJetzt() {
  const d = Z.jetzt();
  if (st.lernen < 99 || d.getMonth() !== 0 || d.getDate() !== 1 || d.getHours() !== 0 || st.neujahr === Z.saison()) return false;
  st.neujahr = Z.saison(); speichere();
  return true;
}
