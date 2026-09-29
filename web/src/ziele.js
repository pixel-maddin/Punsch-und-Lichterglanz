/*
 * ziele.js - „Erste Schritte": eine feste Reihe von Startzielen nach der
 * Einführung, damit man nie dasteht und nicht weiß, was als Nächstes kommt.
 *
 * Gemeldet: Nach dem ersten Servieren „stehe ich da und drücke nur". Im
 * Protokoll eines Erstspielers kamen nach Kinderpunsch und Kranz neun
 * Minuten lang keine Hinweise mehr, die Sterne stapelten sich, obwohl alle
 * drei Wichtel längst bezahlbar waren.
 *
 * Immer genau EIN Ziel ist sichtbar (Leiste unter der Kopfzeile), mit
 * Fortschritt und kleiner Belohnung. Antippen öffnet den Laden an der
 * richtigen Stelle (`kaufziel()` → ui.js hebt die Zeile hervor). Die
 * Erklärungen zu den Wichteln kommen als Hinweise in lernen.js.
 *
 * Stand in st.ziel (Index des aktuellen Ziels, ZIELE.length = fertig).
 */
import * as S from './spiel.js?v=20260929t';

// Die ersten drei Deko-Teile: die billigsten, die früh zu sehen sind
export const START_DEKO = ['kranz', 'girlande', 'lichter_dach'];
export const START_WICHTEL = ['spuel', 'nachfuell', 'servier'];
// Jede gekaufte Deko zählt (nicht nur die drei) - Geschenkte aus Kalender/Aufträgen nicht
const dekoZahl = () => Object.keys(S.st.besitz).filter((id) => S.ARTIKEL_MAP[id] && S.istDeko(S.ARTIKEL_MAP[id])).length;

export const ZIELE = [
  { id: 'getraenk', text: 'Kaufe ein neues Getränk: Kinderpunsch', lohn: 50,
    stand: () => (S.hat('kinderpunsch') ? 1 : 0), ziel: 1, kauf: () => 'kinderpunsch' },
  { id: 'deko', text: 'Schmücke dein Haus: kaufe 3 Deko-Teile', lohn: 150,
    stand: () => Math.min(3, dekoZahl()), ziel: 3,
    kauf: () => START_DEKO.find((id) => !S.hat(id) && !S.status(S.ARTIKEL_MAP[id]).versteckt) || null },
  { id: 'spuel', text: 'Hol dir den Spül-Wichtel', lohn: 100,
    stand: () => (S.hat('spuel') ? 1 : 0), ziel: 1, kauf: () => 'spuel' },
  { id: 'nachfuell', text: 'Hol dir den Nachfüll-Wichtel', lohn: 150,
    stand: () => (S.hat('nachfuell') ? 1 : 0), ziel: 1, kauf: () => 'nachfuell' },
  { id: 'servier', text: 'Hol dir den Servier-Wichtel', lohn: 250,
    stand: () => (S.hat('servier') ? 1 : 0), ziel: 1, kauf: () => 'servier' },
  // Danach nicht wieder ins Leere: ein drittes Getränk und die erste Stimmungsmarke
  { id: 'apfel', text: 'Biete ein drittes Getränk an: Heißer Apfel', lohn: 200,
    stand: () => (S.hat('apfel') ? 1 : 0), ziel: 1, kauf: () => 'apfel' },
  { id: 'herz', text: 'Erreiche 15 ♥ Stimmung mit mehr Deko', lohn: 300,
    stand: () => Math.min(15, S.stimmung()), ziel: 15, kauf: billigsteDeko },
];

/** Die günstigste Deko, die man gerade kaufen könnte (sichtbar, ohne Hindernis). */
function billigsteDeko() {
  let best = null, preis = Infinity;
  for (const id in S.ARTIKEL_MAP) {
    const a = S.ARTIKEL_MAP[id];
    if (!S.istDeko(a) || !a.stimmung) continue;
    const st = S.status(a);
    if (st.versteckt || st.fertig || st.grund || st.kosten == null) continue;
    if (st.kosten < preis) { preis = st.kosten; best = id; }
  }
  return best;
}

const idx = () => S.st.ziel || 0;
/** Das aktuelle Ziel - oder null (Einführung läuft noch / alles geschafft). */
export function aktuell() {
  if (S.st.lernen < 99) return null;
  return ZIELE[idx()] || null;
}
export const nummer = () => idx() + 1;
export const fertig = () => idx() >= ZIELE.length;

/** Was soll gerade gekauft werden, und wo? { tab, id } oder null. */
export function kaufziel() {
  const z = aktuell();
  const id = z && z.kauf();
  const a = id && S.ARTIKEL_MAP[id];
  if (!a) return null;
  const s = S.status(a);
  return s.versteckt || s.fertig ? null : { tab: a.tab, id, leisten: s.leisten, kosten: s.kosten };
}

/**
 * Jede Sekunde: Ist das aktuelle Ziel erreicht? Dann Belohnung und weiter.
 * Gibt das erreichte Ziel zurück (für Einblendung und Ton), sonst null.
 * Wer schon weiter ist (alter Spielstand), überspringt erledigte Ziele still.
 */
export function pruefe() {
  const z = aktuell();
  if (!z || z.stand() < z.ziel) return null;
  S.st.ziel = idx() + 1;
  S.st.zielFertig = S.st.zielFertig || {};
  S.st.zielFertig[z.id] = true;   // lernen.js erklärt dann ggf. noch nach
  S.verdiene(z.lohn);
  S.speichere();
  return z;
}

/** Alte Spielstände: Ziele, die man längst geschafft hat, gar nicht erst zeigen. */
export function nachholen() {
  if (S.st.ziel != null) return;
  let i = 0;
  while (ZIELE[i] && ZIELE[i].stand() >= ZIELE[i].ziel) i++;
  S.st.ziel = i;   // wer schon alles hat, sieht die Reihe gar nicht
  if (i >= ZIELE.length) { S.st.tipps = S.st.tipps || {}; S.st.tipps.ziele_fertig = true; }
}
