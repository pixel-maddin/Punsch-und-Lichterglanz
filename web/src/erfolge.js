/*
 * erfolge.js - die Erfolgswand: 24 Socken, eine je Erfolg.
 *
 * Gezählt wird in `st.stats` (spiel.js zählt mit, siehe `zaehleErfolg`),
 * erreicht wird einmal und für immer (`st.erfolge[id]` = Zeitpunkt).
 * Neu Erreichtes steht in `st.erfolgNeu`, bis man die Wand ansieht -
 * das zählt in die Marke am Aufträge-Knopf.
 *
 * Besondere Gäste werden in den Texten nicht beim Namen genannt.
 */
import * as C from './config.js?v=20260929n';
import * as S from './spiel.js?v=20260929n';

const stats = () => S.st.stats;
const typ = (t) => (stats().typ || {})[t] || 0;
const zahl = (k) => stats()[k] || 0;
const SONDER = Object.keys(C.GAESTE).filter((t) => C.GAESTE[t].spezial);
const WICHTEL = ['spuel', 'nachfuell', 'servier'];

// Reihenfolge = Platz an der Wand (oben links nach unten rechts), grob von leicht nach schwer
export const ERFOLGE = [
  // id bleibt 'bedient1' (alte Spielstände), das Ziel sind seit 29.09. zehn Gäste
  { id: 'bedient1',    name: 'Die ersten Becher',      text: 'Bediene deine ersten 10 Gäste.',              ziel: 10,   wert: () => zahl('bedient') },
  { id: 'schwung',     name: 'In Schwung',             text: 'Erreiche vollen Schwung (×1,40).',            ziel: 1,    wert: () => zahl('schwungVoll') },
  { id: 'bedient100',  name: 'Stammkundschaft',        text: 'Bediene 100 Gäste.',                          ziel: 100,  wert: () => zahl('bedient') },
  { id: 'sonder1',     name: 'Hoher Besuch',           text: 'Bediene einen besonderen Gast.',              ziel: 1,    wert: () => SONDER.reduce((a, t) => a + typ(t), 0) },
  { id: 'kinder',      name: 'Leuchtende Kinderaugen', text: 'Bediene 25 Kinder.',                          ziel: 25,   wert: () => typ('kind') },
  { id: 'omas',        name: 'Omas Liebling',          text: 'Bediene 25 Omas und Opas.',                   ziel: 25,   wert: () => typ('oma') + typ('opa') },
  { id: 'nikolaus1',   name: 'Ho ho ho!',              text: 'Tippe den Nikolaus an, wenn er über den Himmel fliegt.', ziel: 1, wert: () => zahl('nikolaus') },
  { id: 'wichtel',     name: 'Wichtelwerkstatt',       text: 'Hol dir Spül-, Nachfüll- und Servier-Wichtel.', ziel: 3,  wert: () => WICHTEL.filter((w) => S.hat(w)).length },
  { id: 'gross1',      name: 'Großer Durst',           text: 'Schaffe eine Großbestellung.',                ziel: 1,    wert: () => zahl('gross') },
  { id: 'extras',      name: 'Mit Sahnehäubchen',      text: 'Serviere 50 Getränke mit Extra (Sahne, Zimt oder Zuckerhut).', ziel: 50, wert: () => zahl('extras') },
  { id: 'eilig',       name: 'Flinke Hände',           text: 'Bediene 25 eilige Gäste.',                    ziel: 25,   wert: () => zahl('eilig') },
  { id: 'auftraege',   name: 'Fleißbienchen',          text: 'Hole 10 Aufträge ab.',                        ziel: 10,   wert: () => zahl('auftraege') },
  { id: 'herz100',     name: 'Gemütlich',              text: 'Erreiche 100 ♥ Stimmung.',                    ziel: 100,  wert: () => S.stimmung() },
  { id: 'bedient1000', name: 'Dorfgespräch',           text: 'Bediene 1.000 Gäste.',                        ziel: 1000, wert: () => zahl('bedient') },
  { id: 'serie',       name: 'Keiner geht leer aus',   text: 'Bediene 50 Gäste hintereinander, ohne dass einer weitergeht.', ziel: 50, wert: () => Math.max(zahl('serie'), zahl('serieBest')) },
  { id: 'getraenke',   name: 'Volle Karte',            text: 'Biete alle Getränke und Leckereien an.',      ziel: C.PRODUKTE.length, wert: () => S.produkteFrei().length },
  { id: 'nikolaus5',   name: 'Nikolaus-Freund',        text: 'Tippe den Nikolaus 5-mal an.',                ziel: 5,    wert: () => zahl('nikolaus') },
  { id: 'sonderAlle',  name: 'Alle Jahre wieder',      text: 'Bediene jeden besonderen Gast mindestens einmal.', ziel: SONDER.length, wert: () => SONDER.filter((t) => typ(t) > 0).length },
  { id: 'gross10',     name: 'Gruppenreise',           text: 'Schaffe 10 Großbestellungen.',                ziel: 10,   wert: () => zahl('gross') },
  { id: 'sammlung',    name: 'Sammlerglück',           text: 'Sammle alle Sammelstücke aus den schweren Aufträgen.', ziel: C.AUFTRAG_DEKO.length, wert: () => C.AUFTRAG_DEKO.filter((d) => S.st.kalDeko[d.id]).length },
  { id: 'bedient5000', name: 'Punschlegende',          text: 'Bediene 5.000 Gäste.',                        ziel: 5000, wert: () => zahl('bedient') },
  { id: 'herz300',     name: 'Schöne Bescherung',      text: 'Erreiche 300 ♥ Stimmung.',                    ziel: 300,  wert: () => S.stimmung() },
  { id: 'kalender',    name: 'Türchen um Türchen',     text: 'Öffne alle 24 Türchen im Adventskalender.',   ziel: 24,   wert: () => Object.keys(S.st.kalender || {}).length },
  { id: 'alles',       name: 'Das schönste Haus im Dorf', text: 'Kaufe alles, was es im Laden gibt.',       ziel: C.ARTIKEL.length, wert: () => C.ARTIKEL.filter((a) => S.status(a).fertig).length },
];

/** Was die Wand ab wie vielen Socken zeigt - für den Hinweis unter dem Bild. */
export const STUFEN = [
  [2, 'Kerzen auf dem Kaminsims'], [4, 'Tannengrün'], [6, 'Girlanden'], [8, 'ein Kranz'],
  [10, 'ein Christbaum'], [12, 'Lichter'], [14, 'Kugeln und Schleifen'], [16, 'noch mehr Lichter'],
  [18, 'Baumlichter und ein Stern'], [20, 'das Kaminfeuer'], [22, 'ein Teppich'], [24, 'Geschenke'],
];

const e = () => { S.st.erfolge = S.st.erfolge || {}; return S.st.erfolge; };
export const erreicht = (id) => !!e()[id];
export const anzahl = () => ERFOLGE.filter((x) => erreicht(x.id)).length;
export function stand(x) { return Math.min(x.ziel, Math.floor(x.wert())); }
export function neu() { return S.st.erfolgNeu || {}; }
export function neuZahl() { return Object.keys(neu()).length; }
export function gesehen() { S.st.erfolgNeu = {}; S.speichere(); }

/** Jede Sekunde: gibt die neu erreichten Erfolge zurück. Erst nach der Einführung. */
export function pruefe() {
  if (S.st.lernen < 99) return [];
  const liste = [];
  for (const x of ERFOLGE) {
    if (erreicht(x.id) || x.wert() < x.ziel) continue;
    e()[x.id] = Date.now();
    S.st.erfolgNeu = S.st.erfolgNeu || {};
    S.st.erfolgNeu[x.id] = true;
    liste.push(x);
  }
  return liste;
}
