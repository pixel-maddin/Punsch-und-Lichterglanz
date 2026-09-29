/*
 * zeit.js - das Spiel läuft mit der echten Uhr des Spielers.
 *
 * Tag und Nacht nach festen Sonnenzeiten (Mitte Deutschlands, je Monat),
 * Schnee ab dem 1. Dezember, Adventssonntage, Wetter aus dem Datum
 * gewürfelt - also für alle gleich und ohne Server.
 *
 * Zum Testen lässt sich die Uhr verstellen und beschleunigen
 * (?datum=2026-12-15T17:30&tempo=60 oder die Werkstatt im Menü).
 */

let basisEcht = Date.now();
let basisSpiel = Date.now();
let tempo = 1;
let ueberschrieben = false;   // Testzeit gesetzt? Dann gilt sie genau so
let versatz = 0;              // Spielmodus „individuell": so viele Tage verschoben

export function jetzt() {
  const d = new Date(basisSpiel + (Date.now() - basisEcht) * tempo);
  // Ganze KALENDERTAGE verschieben, nicht Millisekunden - sonst liegt
  // die Uhr über die Sommerzeitgrenze hinweg eine Stunde daneben.
  if (versatz && !ueberschrieben) d.setDate(d.getDate() + versatz);
  return d;
}

export function setzeZeit(datum, neuesTempo = tempo) {
  basisEcht = Date.now();
  basisSpiel = datum ? datum.getTime() : Date.now();
  ueberschrieben = !!datum;
  tempo = neuesTempo;
}
/**
 * Spielmodus „individuell": Die Uhrzeit bleibt die echte (nachts ist es
 * dunkel), aber der Kalender ist um ganze Tage verschoben.
 */
export function setzeVersatzTage(n) { versatz = n || 0; }
/** Wie viele Tage bis zum 24. November, damit man eine Woche vor dem 1.12. startet. */
export function versatzFuerEigenenStart() {
  const heute = new Date(); heute.setHours(12, 0, 0, 0);
  const jahr = heute.getMonth() >= 8 ? heute.getFullYear() : heute.getFullYear() - 1;
  const ziel = new Date(jahr, 10, 24, 12);
  return Math.round((ziel - heute) / 86400000);
}
export function zeitVerstellt() { return ueberschrieben || tempo !== 1; }
export function zeitTempo() { return tempo; }

// Sonnenaufgang / -untergang je Monat in Stunden (Ortszeit, grob Kassel)
const SONNE = [
  [8.2, 16.6], [7.6, 17.5], [6.6, 18.3], [6.6, 20.1], [5.7, 20.9], [5.1, 21.5],
  [5.4, 21.4], [6.2, 20.6], [7.0, 19.4], [7.8, 18.3], [7.5, 16.7], [8.2, 16.3],
];
const DAEMMERUNG = 0.8; // h

/** 1 = voller Tag, 0 = Nacht; dazu die Dämmerung für den Himmel. */
export function licht(d = jetzt()) {
  const [auf, unter] = SONNE[d.getMonth()];
  const h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  let hell;
  if (h < auf - DAEMMERUNG / 2 || h > unter + DAEMMERUNG / 2) hell = 0;
  else if (h < auf + DAEMMERUNG / 2) hell = (h - (auf - DAEMMERUNG / 2)) / DAEMMERUNG;
  else if (h > unter - DAEMMERUNG / 2) hell = 1 - (h - (unter - DAEMMERUNG / 2)) / DAEMMERUNG;
  else hell = 1;
  hell = Math.max(0, Math.min(1, hell));
  // Sonnenstand 0..1 über den Tag (für die Position am Himmel)
  const sonne = (h - auf) / (unter - auf);
  // Dämmerung: am stärksten, wenn hell um 0,5 liegt
  const daemmer = Math.max(0, 1 - Math.abs(hell - 0.5) * 2) * (hell > 0 && hell < 1 ? 1 : 0);
  const abends = h > 12;
  return { hell, sonne, daemmer, abends, h };
}

/** Die Adventszeit gehört zum Jahr ihres Dezembers. Ab September zählt die neue. */
export function saison(d = jetzt()) {
  return d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
}

function tagDatum(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

/** Tag im Dezember der laufenden Saison (1..31), 0 davor, >31 danach. */
export function dezemberTag(d = jetzt()) {
  const s = saison(d);
  const t = tagDatum(d);
  const erster = new Date(s, 11, 1);
  return Math.floor((t - erster) / 86400000) + 1;
}

export function phase(d = jetzt()) {
  const dt = dezemberTag(d);
  if (dt < 1) return 'herbst';
  if (dt <= 24) return 'advent';
  if (dt <= 37) return 'weihnacht';   // bis 6. Januar
  return 'winter';
}

/** Wie viel Schnee liegt (0..1). Ab dem 1.12., voll ab dem 3.12., weg ab März. */
export function schnee(d = jetzt()) {
  const dt = dezemberTag(d);
  if (dt < 1) return 0;
  if (d.getMonth() >= 2 && d.getMonth() < 8) return 0;
  return Math.min(1, 0.45 + (dt - 1) * 0.3);
}

/** Wie viele Adventskerzen brennen (0..4). */
export function adventKerzen(d = jetzt()) {
  const s = saison(d);
  const heilig = new Date(s, 11, 24);
  // 4. Advent: der Sonntag am oder vor dem 24.12.
  const vierter = new Date(heilig);
  vierter.setDate(24 - heilig.getDay());
  const t = tagDatum(d);
  let n = 0;
  for (let i = 0; i < 4; i++) {
    const a = new Date(vierter);
    a.setDate(vierter.getDate() - 21 + i * 7);
    if (t >= a) n++;
  }
  return n;
}

/** Datum des n-ten Advents der laufenden Saison. */
export function adventDatum(n, d = jetzt()) {
  const s = saison(d);
  const heilig = new Date(s, 11, 24);
  return new Date(s, 11, 24 - heilig.getDay() - (4 - n) * 7);
}
/** Ist heute ein Adventssonntag? Dann welcher (1..4), sonst 0. */
export function adventssonntag(d = jetzt()) {
  for (let n = 1; n <= 4; n++) {
    const a = adventDatum(n, d);
    if (a.getFullYear() === d.getFullYear() && a.getMonth() === d.getMonth() && a.getDate() === d.getDate()) return n;
  }
  return 0;
}

/** Datum des 1. Advents (für Hinweise). */
export function ersterAdvent(d = jetzt()) {
  const s = saison(d);
  const heilig = new Date(s, 11, 24);
  const a = new Date(s, 11, 24 - heilig.getDay() - 21);
  return a;
}

// Kleiner fester Zufall aus einer Zahl (für Wetter: für alle gleich)
/**
 * Mondphase 0..1: 0 = Neumond, 0,25 = erstes Viertel (rechts hell),
 * 0,5 = Vollmond, 0,75 = letztes Viertel (links hell). Gerechnet ab einem
 * bekannten Neumond (6.1.2000, 18:14 UTC) mit dem mittleren synodischen
 * Monat - auf gut einen halben Tag genau, für ein 9-Pixel-Bild reichlich.
 */
export function mondphase(d = jetzt()) {
  const MONAT = 29.530588853 * 86400000;
  const neumond = Date.UTC(2000, 0, 6, 18, 14);
  const p = ((d.getTime() - neumond) / MONAT) % 1;
  return p < 0 ? p + 1 : p;
}

export function hash(n) {
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}

/** Wetter dieser Stunde: 'schnee' | 'regen' | 'klar'. Stärke 0..1. */
export function wetter(d = jetzt()) {
  const stunde = Math.floor(d.getTime() / 3600000);
  const z = hash(stunde * 7 + 3);
  const st = 0.4 + hash(stunde * 13 + 1) * 0.6;
  const dt = dezemberTag(d);
  const ph = phase(d);
  // Heiligabend: ab dem späten Nachmittag schneit es immer
  if (dt === 24 && d.getHours() >= 16) return { art: 'schnee', staerke: 0.8 };
  if (schnee(d) > 0) return z < 0.45 ? { art: 'schnee', staerke: st } : { art: 'klar', staerke: 0 };
  if (ph === 'herbst') return z < 0.22 ? { art: 'regen', staerke: st } : { art: 'klar', staerke: 0 };
  return { art: 'klar', staerke: 0 };
}

export function silvester(d = jetzt()) {
  const m = d.getMonth(), t = d.getDate(), h = d.getHours() + d.getMinutes() / 60;
  return (m === 11 && t === 31 && h >= 23.5) || (m === 0 && t === 1 && h < 1.5);
}

const WTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONAT = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export function uhrText(d = jetzt()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${WTAG[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}. ${z(d.getHours())}:${z(d.getMinutes())}`;
}
export function datumLang(d = jetzt()) {
  return `${d.getDate()}. ${MONAT[d.getMonth()]} ${d.getFullYear()}`;
}
export function tagesSchluessel(d = jetzt()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
