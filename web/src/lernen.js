/*
 * lernen.js - die Einführung Schritt für Schritt, und danach einzelne
 * Hinweise genau in dem Moment, in dem sie gebraucht werden.
 *
 * EINFÜHRUNG (st.lernen 0..4): Ein Gast, der geduldig wartet. Ein Zeiger
 * zeigt, wohin getippt wird: Gläser → Topf → Gast. Erst danach kommen
 * weitere Gäste, und die Geduld läuft.
 *
 * HINWEISE (st.tipps): je einer höchstens einmal, sobald die Lage da ist
 * (Topf leer, falsches Getränk, genug Geld für den Laden …).
 * Damit am Anfang nicht alles auf einmal kommt, liegt zwischen zwei
 * Hinweisen eine Ruhepause (HINWEIS_PAUSE, gleich nach der Einführung
 * länger). Nur Hinweise mit `sofort` (die Lage ist gleich wieder vorbei:
 * leerer Topf, falsches Glas, besonderer Gast …) warten kürzer.
 *
 * FÜHRUNG: Hinweise mit `laden: { tab, id }` zeigen erst auf LADEN; öffnet
 * man ihn, springt er auf den richtigen Reiter und hebt die Zeile hervor
 * (ui.js fragt `fuehrung()`). Nach dem Kauf erklärt ein Folgehinweis,
 * was es gebracht hat.
 *
 * Erklär-Blasen mit „Weiter ▸" HALTEN DAS SPIEL AN, bis man sie antippt -
 * in der Einführung die ersten und das „Geschafft!", bei den Hinweisen
 * seit 30.09. JEDE Blase. Die Handlungsschritte der Einführung („tippe auf
 * die Gläser") lassen das Spiel laufen; der Gast wartet dort ohnehin geduldig.
 */
import * as C from './config.js?v=20261001c';
import * as S from './spiel.js?v=20261001c';
import * as A from './auftraege.js?v=20261001c';
import * as E from './erfolge.js?v=20261001c';
import * as Z from './ziele.js?v=20261001c';

const tipp = document.getElementById('tipp');
const zeiger = document.getElementById('zeiger');
let G = 166, H = 320;
let aktuell = null;      // { id, text, ziel, bis }
let hinweisT = 0;
let letzterText = '';
const HINWEIS_PAUSE = 25;       // s Ruhe zwischen zwei Hinweisen
const HINWEIS_PAUSE_SOFORT = 4; // s für Hinweise, deren Lage gleich vorbei ist
const NACH_EINFUEHRUNG = 40;    // s nach „Geschafft!", bevor der erste Hinweis kommt
let ruheT = 0;                  // s seit dem letzten Hinweis (zählt nur, wenn nichts offen ist)

/**
 * Wohin soll der Laden springen, wenn man ihn öffnet? Erst eine laufende
 * Führung (Hinweis mit `laden`), sonst das aktuelle Startziel (ziele.js).
 */
export function fuehrung() {
  if (aktuell && aktuell.h.laden && !aktuell.h.fertig()) return aktuell.h.laden;
  return Z.kaufziel();
}
const istZiel = (id) => { const z = Z.aktuell(); return !!z && z.id === id; };
/**
 * Führung zu einem Startziel: sobald es dran und bezahlbar ist - oder
 * nachträglich, wenn man über die Zielleiste schneller gekauft hat, als die
 * Erklärung kam (dann nur die Erklärung, der Zeiger entfällt).
 */
const zielDran = (ziel, id) => (istZiel(ziel) && kannKaufen(id)) || !!(S.st.zielFertig && S.st.zielFertig[ziel]);

export function layout(g, h) { G = g; H = h; }

// Antippen der Blase blendet sie aus: ein Hinweis ist damit erledigt, ein
// Einführungsschritt bleibt weg, bis der nächste Schritt dran ist.
let weggetippt = '';
let aktuelleBlase = null;
export function pausiert() { return !!(aktuelleBlase && aktuelleBlase.weiter); }
tipp.addEventListener('pointerdown', (e) => {
  e.preventDefault(); e.stopPropagation();
  if (aktuelleBlase && aktuelleBlase.weiter) { aktuelleBlase.weiter(); aktuelleBlase = null; zeige(null); return; }
  if (S.st.lernen < 99) weggetippt = S.st.lernen + '|' + letzterText;
  else if (aktuell) { S.st.tipps[aktuell.h.id] = true; aktuell = null; ruheT = 0; S.speichere(); }
  zeige(null);
});

// Zielpunkte in Spielpixeln
function gastZiel(platz = 0) { return { x: S.platzX(platz) - 4, y: G + 30 }; }
const glaeserZiel = () => ({ x: 17, y: G + C.T_GAST + 11 });
const ausgussZiel = () => ({ x: 165, y: G + C.T_GAST + 11 });
function zellZiel(i) { return { x: (i % 5) * C.T_ZELLE_B + 18, y: G + C.T_GAST + C.T_BRETT + Math.floor(i / 5) * C.T_ZELLE_H + 13 }; }
const ladenZiel = () => ({ x: 18, y: H - 14 });
const auftragZiel = () => ({ x: 54, y: H - 14 });
const kalenderZiel = () => ({ x: 90, y: H - 14 });

function gastAmTresen() { return S.lauf.gaeste.find((g) => g.am && !g.gehen && !g.bedient); }
function hand(art, id) { return S.lauf.hand.some((h) => h.art === art && (!id || h.id === id)); }

// ---------------------------------------------------------------------------
// Einführung
// ---------------------------------------------------------------------------
function einfuehrung() {
  const st = S.st;
  const g = gastAmTresen();
  switch (st.lernen) {
    case 0: {
      // Zwei Erklärungen, jede wartet auf „Weiter" - erst dann kommt der Gast
      const info = st.lernInfo || 0;
      if (info === 0) return { text: 'Hier ist dein Haus - und davor dein Punschstand. Gleich kommt dein erster Gast!', ziel: { x: 150, y: G - 26 }, weiter: () => { st.lernInfo = 1; } };
      if (info === 1) return { text: 'Unten siehst du den Stand von INNEN - so, als stündest du selbst dahinter. Hier bedienst du die Gäste.', ziel: { x: 90, y: G + 30 }, weiter: () => { st.lernInfo = 2; } };
      if (g) { st.lernen = 1; return einfuehrung(); }
      return { text: 'Da kommt er schon - warte, bis er an deinem Tresen steht.', ziel: { x: 150, y: G - 20 } };
    }
    case 1: {
      if (!g) return { text: 'Warte kurz, bis der Gast am Tresen steht.', ziel: gastZiel(0) };
      if (hand('glas') || hand('voll')) { st.lernen = 2; return einfuehrung(); }
      return { text: 'Jetzt steht er vor dir am Tresen. Im Bläschen steht, was er möchte. Tippe zuerst auf die GLÄSER.', ziel: glaeserZiel() };
    }
    case 2: {
      if (!g) return null;
      const p = C.PRODUKT[g.wunsch];
      if (hand('voll', g.wunsch)) { st.lernen = 3; return einfuehrung(); }
      if (hand('voll')) return { text: 'Das ist das falsche Getränk. Tippe auf den AUSGUSS, um es wegzukippen.', ziel: ausgussZiel() };
      if (!hand('glas') && p.art === 'topf') return { text: 'Du brauchst ein Glas - tippe auf die GLÄSER.', ziel: glaeserZiel() };
      return { text: `Jetzt auf den Topf mit demselben Bild tippen: ${p.name}.`, ziel: zellZiel(C.PRODUKTE.indexOf(p)) };
    }
    case 3:
      if (S.st.stats.bedient >= 1) { st.lernen = 4; hinweisT = 0; return einfuehrung(); }
      if (!g) return null;
      if (S.lauf.hand.some((h) => h.art === 'voll' && h.rest > 0)) return null;   // kurz einschenken lassen
      return { text: 'Fertig! Jetzt auf den GAST tippen - servieren!', ziel: gastZiel(g.platz) };
    case 4:
      return { text: 'Geschafft! Je schneller du servierst, desto mehr Trinkgeld. Jetzt kommen mehr Gäste - viel Spaß!', ziel: null,
        weiter: () => { st.lernen = 99; S.lauf.lernen = false; ruheT = HINWEIS_PAUSE - NACH_EINFUEHRUNG; S.speichere(); } };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Einzelne Hinweise, je einer einmal
// ---------------------------------------------------------------------------
const HINWEISE = [
  { id: 'leer', sofort: true, wann: () => !S.stufe('nachfuell') && leererTopf() >= 0,
    text: () => 'Der Topf ist leer! Tippe ihn 4-mal an, dann ist er wieder voll.',
    ziel: () => zellZiel(leererTopf()), fertig: () => leererTopf() < 0 },
  { id: 'falsch', sofort: true, wann: () => S.lauf.fehlGast > 0,
    text: () => 'Das war das falsche Getränk! Der Gast hat es abgelehnt - das Glas ist weg, sonst passiert nichts. Schau genau aufs Bläschen.',
    ziel: () => gastZiel(0), dauer: 6 },
  { id: 'voll', sofort: true, wann: () => S.lauf.hand.length >= S.handMax() && !S.lauf.hand.some((h) => h.art === 'glas') && !gastWillWasInHand() && gastAmTresen(),
    text: () => 'Deine Hände sind voll. Leere sie im AUSGUSS.',
    ziel: ausgussZiel, fertig: () => S.lauf.hand.length < S.handMax() },
  // Führungen: erstes neues Getränk, erste Deko - bis zur richtigen Zeile im Laden
  { id: 'laden', sofort: true, wann: () => zielDran('getraenk', 'kinderpunsch'),
    info: () => 'Neues Getränk! Du hast genug Sterne für Kinderpunsch. Je mehr Sorten du anbietest, desto mehr Sterne verdienst du: Jede neue Sorte ist etwas teurer als die davor. Und Kinderpunsch lockt auch Kinder an deinen Stand.',
    text: () => 'Tippe auf LADEN - ich zeige dir, wo es Kinderpunsch gibt.',
    ziel: ladenZiel, fertig: () => S.hat('kinderpunsch'), laden: { tab: 'super', id: 'kinderpunsch' }, lang: true },
  { id: 'laden_danach', sofort: true, wann: () => S.hat('kinderpunsch') && S.st.tipps.laden,
    text: () => 'Prima! Kinderpunsch steht jetzt im Regal. Schau aufs Bläschen: Wer ihn bestellt, bekommt ihn aus dem neuen Topf. Weitere Getränke findest du später im Supermarkt.',
    ziel: () => zellZiel(C.PRODUKTE.indexOf(C.PRODUKT.kinderpunsch)), dauer: 9 },
  { id: 'deko', sofort: true, wann: () => zielDran('deko', 'kranz') || (istZiel('deko') && S.hat('kranz')),
    info: () => 'Zeit zum Schmücken! Du kannst dir jetzt deine erste Deko kaufen. Mach dein Haus schön für die Weihnachtszeit: Jedes Stück bringt ♥ Stimmung - dann kommen mehr Gäste, und sie zahlen mehr. Bis Heiligabend soll es das schönste Haus der Straße werden!',
    text: () => 'Tippe auf LADEN - im Weihnachtsmarkt wartet dein erster Türkranz.',
    ziel: ladenZiel, fertig: () => S.hat('kranz'), laden: { tab: 'markt', id: 'kranz' }, lang: true },
  { id: 'deko_danach', sofort: true, wann: () => S.hat('kranz') && S.st.tipps.deko,
    text: () => 'Schön! Der Kranz hängt an deiner Tür. Deko bringt ♥ Stimmung (oben neben den Sternen) - je mehr Stimmung, desto mehr Gäste, und sie zahlen mehr.',
    ziel: () => ({ x: 90, y: 10 }), dauer: 9 },
  { id: 'gegangen', wann: () => S.st.stats.verpasst >= 1,
    text: () => 'Ein Gast ist weitergegangen - nicht schlimm, es kommen neue! Aber Achtung: Manchmal kommt jemand GANZ BESONDERES vorbei - den solltest du nicht warten lassen.',
    ziel: () => gastZiel(0), dauer: 8 },
  { id: 'schwung', wann: () => S.lauf.schwung >= 3,
    text: () => 'Schwung! Wenn du zügig hintereinander servierst, gibt es mehr Sterne (bis ×1,40).',
    ziel: () => ({ x: 140, y: G + 2 }), dauer: 5 },
  // Die drei ersten Wichtel (Startziele 3-5): erst erklären, was sie tun, dann zum Laden
  { id: 'w_spuel', sofort: true, wann: () => zielDran('spuel', 'spuel'),
    info: () => 'Zeit für Hilfe! Wichtel nehmen dir am Stand Arbeit ab. Der erste ist der SPÜL-WICHTEL: Er stellt dir laufend saubere Gläser aufs Tablett - dann musst du nicht jedes Mal auf die Gläser tippen.',
    text: () => 'Tippe auf LADEN - unter Wichtel wartet er schon.',
    ziel: ladenZiel, fertig: () => S.hat('spuel'), laden: { tab: 'wichtel', id: 'spuel' }, lang: true },
  { id: 'w_nachfuell', sofort: true, wann: () => zielDran('nachfuell', 'nachfuell'),
    info: () => 'Der nächste Helfer: Der NACHFÜLL-WICHTEL füllt leere Töpfe von selbst wieder auf. Kein Antippen mehr, wenn der Sternenpunsch ausgeht.',
    text: () => 'Tippe auf LADEN - unter Wichtel findest du ihn.',
    ziel: ladenZiel, fertig: () => S.hat('nachfuell'), laden: { tab: 'wichtel', id: 'nachfuell' }, lang: true },
  { id: 'w_servier', sofort: true, wann: () => zielDran('servier', 'servier'),
    info: () => 'Der wichtigste Helfer: Der SERVIER-WICHTEL bedient Gäste ganz allein. Zusammen mit Spül- und Nachfüll-Wichtel läuft dein Stand dann von selbst - sogar wenn du nicht da bist.',
    text: () => 'Tippe auf LADEN - unter Wichtel wartet der Servier-Wichtel.',
    ziel: ladenZiel, fertig: () => S.hat('servier'), laden: { tab: 'wichtel', id: 'servier' }, lang: true },
  // Abschluss der Startziele: was die Wichtel ohne dich tun, und wie es weitergeht
  { id: 'wichtel_weg', sofort: true, wann: () => ['spuel', 'nachfuell', 'servier'].every((w) => S.hat(w)),
    text: () => `Alle drei Wichtel sind da! Sie arbeiten auch weiter, wenn du nicht da bist oder die App zu ist, und verdienen dir Sterne - die ersten ${Math.round(C.INAKTIV_AB / 60)} Minuten mit voller Kraft, danach gemütlicher. Mit jedem Spieltag werden sie ausdauernder (gerade bis zu ${S.offlineStunden()} Stunden). Solange du selbst mit anpackst, sind sie schneller.`,
    ziel: null, dauer: 12 },
  // Wichtel-Bestellung: ab dem Servier-Wichtel schenkt ER ein, wenn man
  // einen Gast antippt (id neu, damit auch wer den alten Ein-Tipp kannte, es erfährt)
  { id: 'bestellen2', sofort: true, wann: () => S.hat('servier') && !!S.st.tipps.wichtel_weg && S.lauf.hand.some((h) => h.vonWichtel && !(h.rest > 0)),
    text: () => 'Siehst du den kleinen Wichtel am Tablett? Solange du am Stand bist, schenkt er für deine Gäste ein. Mach den Handgriff (wie die Zuckerstange) und tippe den Gast an - dann gibt es den Bonus. Sonst serviert er es nach ein paar Sekunden selbst (blauer Balken). Du kannst auch selbst einen Gast antippen, dann schenkt er für ihn ein.',
    ziel: () => handZiel(Math.max(0, S.lauf.hand.findIndex((h) => h.vonWichtel))), fertig: () => (S.lauf.wichtelSelbst || 0) > 0 || !S.lauf.hand.some((h) => h.vonWichtel) },
  { id: 'herz_ziel', wann: () => istZiel('herz'),
    text: () => 'Gut zu wissen: Mehr ♥ Stimmung schaltet im Laden Neues frei - weitere Getränke, Deko und Lichter. Die Leiste oben zeigt dir immer die günstigste Deko.',
    ziel: () => ({ x: 90, y: 10 }), dauer: 10 },
  { id: 'ziele_fertig', sofort: true, wann: () => Z.fertig() && S.st.tipps.wichtel_weg,
    text: () => 'Alle sieben Ziele geschafft - jetzt weißt du alles Wichtige! Genieße die Weihnachtszeit und schmücke dein Haus, wie es dir gefällt. Schau jeden Tag mal rein: Es gibt neue Aufträge, ein Türchen im Adventskalender und besondere Ereignisse.',
    ziel: null, dauer: 10 },
  // Besondere Gäste stellen sich hinten an und gehen, wenn es zu lange
  // dauert - das muss man einmal gesagt bekommen (gemeldet: Rentier war weg)
  { id: 'sonder_schlange', sofort: true, wann: () => S.lauf.gaeste.some((g) => C.GAESTE[g.typ].spezial && g.platz == null && !g.gehen && !g.laeuft),
    text: () => 'Ein besonderer Gast steht in der Schlange! Bediene zügig, damit er an den Tresen kommt - sonst wird es ihm zu lang, und er geht wieder.',
    ziel: () => { const g = S.lauf.gaeste.find((x) => C.GAESTE[x.typ].spezial && x.platz == null && !x.gehen); return { x: g ? g.x : 100, y: G - 24 }; },
    fertig: () => !S.lauf.gaeste.some((g) => C.GAESTE[g.typ].spezial && g.platz == null && !g.gehen), dauer: 10 },
  { id: 'sonder_weg', sofort: true, wann: () => S.lauf.gaeste.some((g) => C.GAESTE[g.typ].spezial && g.gehen && !g.froh),
    text: () => 'Schade - der besondere Gast hat zu lange gewartet und ist gegangen. Beim nächsten Mal schneller bedienen, damit er rechtzeitig drankommt!',
    ziel: null, dauer: 7 },
  // Der letzte Handgriff: Sahne, Zimt, Zuckerhut
  // Handgriffe (Zuckerstange, Umrühren, Zuckerguss, Sahne …): jede Art
  // einmal erklären, sobald sie zum ersten Mal auf dem Tablett fällig ist.
  // Sahne behält die alte id 'extra' - wer sie kennt, sieht sie nicht noch mal.
  ...Object.keys(C.HANDGRIFF).filter((k) => k !== 'wenden').map((k) => ({
    id: k === 'sahne' ? 'extra' : 'griff_' + k, sofort: true, wann: () => griffOffen(k) >= 0,
    text: () => griffText(k), ziel: () => handZiel(Math.max(0, griffOffen(k))), fertig: () => griffOffen(k) < 0,
  })),
  // Crêpe wenden passiert auf der Platte, nicht auf dem Tablett
  { id: 'griff_wenden', sofort: true, wann: () => wendenOffen(),
    text: () => `Crêpe wenden: Tippe die Platte an, wenn der weiße Strich im GRÜNEN Bereich ist. Zu früh oder zu spät gibt es keinen Bonus - richtig gewendet zahlt der Gast ${Math.round((C.PRODUKT.crepe.bonus || C.EXTRA_BONUS) * 100)} % mehr.`,
    ziel: () => zellZiel(C.PRODUKTE.indexOf(C.PRODUKT.crepe)), fertig: () => !wendenOffen() },
  { id: 'gross', sofort: true, wann: () => S.lauf.gaeste.some((g) => g.gross && g.am && !g.bedient),
    text: () => { const g = S.lauf.gaeste.find((x) => x.gross); return g ? `Großbestellung! ${g.gross.name} will ${g.gross.n} × ${C.PRODUKT[g.gross.id].name}. Bring alle, bevor die Zeit abläuft - das gibt richtig viele Sterne. Die Wichtel trauen sich da nicht ran.` : ''; },
    ziel: () => { const g = S.lauf.gaeste.find((x) => x.gross && x.am); return gastZiel(g ? g.platz : 0); }, dauer: 9 },
  { id: 'chef', wann: () => S.hat('servier') && S.chefAktiv() && S.st.stats.bedient >= 60,
    text: () => `Du bist der Chef! Solange du am Stand mit anpackst, arbeiten die Wichtel ×${String(C.CHEF_TEMPO).replace('.', ',')} so schnell (Tafel links oben). Besondere Gäste bedienst nur du.`,
    ziel: () => ({ x: 40, y: G + 2 }), dauer: 8 },
  { id: 'schild', wann: () => S.st.stats.bedient >= 40 && !S.st.standName,
    text: () => 'Tipp: Tippe auf das rote Schild über dem Stand - dann kannst du ihm einen eigenen Namen geben.',
    ziel: () => ({ x: 90, y: G + 1 }), fertig: () => !!S.st.standName, dauer: 7 },
  { id: 'eilig', sofort: true, wann: () => S.lauf.gaeste.some((g) => g.eilig && g.am && !g.bedient),
    text: () => 'Ein eiliger Gast (orange Blase)! Er wartet nur kurz, zahlt aber doppelt.',
    ziel: () => { const g = S.lauf.gaeste.find((x) => x.eilig && x.am); return gastZiel(g ? g.platz : 0); }, dauer: 6 },
  { id: 'auftrag', wann: () => A.abholbar() > 0,
    text: () => 'Auftrag erfüllt! Unter AUFTRÄGE wartet deine Belohnung. Jeden Tag gibt es drei neue.',
    ziel: auftragZiel, fertig: () => A.abholbar() === 0, dauer: 10 },
  { id: 'auftraege_neu', wann: () => S.st.stats.bedient >= 25,
    text: () => 'Neu: Unter AUFTRÄGE warten jeden Tag drei Aufgaben mit Belohnung - der schwere bringt ein Sammelstück.',
    ziel: auftragZiel, dauer: 7 },
  { id: 'erfolge', wann: () => E.anzahl() >= 1,
    text: () => 'Deine erste Socke hängt an der Erfolgswand! Du findest sie unter AUFTRÄGE → Erfolge. Mit jeder Socke wird es dort weihnachtlicher.',
    ziel: auftragZiel, dauer: 8 },
  { id: 'kalender', wann: () => S.offeneTueren() > 0,
    text: () => 'Im Adventskalender wartet ein Türchen auf dich!',
    ziel: kalenderZiel, dauer: 6 },
];

/** Frei, bezahlbar und noch nicht gekauft - dann lohnt die Führung. */
function kannKaufen(id) {
  const a = S.ARTIKEL_MAP[id] || { id, kosten: C.PRODUKT[id].kosten };
  if (S.hat(id)) return false;
  const st = S.ARTIKEL_MAP[id] ? S.status(a) : null;
  return st ? !st.versteckt && st.leisten : S.st.geld >= a.kosten;
}

/** Backt gerade ein Crêpe, der noch gewendet werden kann? */
function wendenOffen() {
  const cr = S.lauf.crepe;
  return cr.backT >= 0 && !cr.gewendet && !cr.verpasst;
}
/** Welches Glas auf dem Tablett wartet gerade auf Handgriff k? (-1 = keins) */
function griffOffen(k) {
  return S.lauf.hand.findIndex((h) => h.art === 'voll' && h.extra === k && !h.extraFertig && !(h.rest > 0) && !(h.brennT > 0));
}
function griffText(k) {
  const h = S.lauf.hand[griffOffen(k)];
  const g = C.HANDGRIFF[k], p = h ? C.PRODUKT[h.id] : null;
  const bonus = Math.round(((p && p.bonus) || C.EXTRA_BONUS) * 100);
  const satz = g.satz.charAt(0).toUpperCase() + g.satz.slice(1);
  return `${p ? p.name + ': ' : ''}Tippe das Glas auf dem Tablett an - ${satz}!`
    + (g.n > 1 ? ' Die Zahl über dem Glas zeigt, wie oft noch.' : '')
    + (g.timing ? ' Achte auf den Balken: Der weiße Strich muss im grünen Bereich sein, zu früh oder zu spät gibt es keinen Bonus.' : '')
    + (k === 'zucker' ? ` Danach brennt er ${C.FEUER_FENSTER} Sekunden - nur so lange gibt es den Bonus.` : '')
    + (h && h.schritt > 0 ? ' Manche Getränke brauchen zwei Handgriffe nacheinander.' : '')
    + ` Fertig zahlt der Gast ${bonus} % mehr. Das kannst nur du - die Wichtel lassen es weg.`;
}

function extraOffen() {
  return S.lauf.hand.findIndex((h) => h.art === 'voll' && h.extra && !h.extraFertig && !(h.rest > 0) && !(h.brennT > 0));
}
function handZiel(i) {
  const n = S.handMax();
  return { x: Math.round(90 - n * 13) + i * 26 + 13, y: G + C.T_GAST + 6 };
}

function leererTopf() {
  for (const p of S.produkteFrei()) if (p.art !== 'platte' && (S.st.toepfe[p.id] || 0) <= 0) return C.PRODUKTE.indexOf(p);
  return -1;
}
function gastWillWasInHand() {
  return S.lauf.gaeste.some((g) => g.am && !g.bedient && S.lauf.hand.some((h) => h.art === 'voll' && h.id === g.wunsch));
}

function hinweise(dt) {
  const st = S.st;
  st.tipps = st.tipps || {};
  if (aktuell) {
    aktuell.t += dt;
    const h = aktuell.h;
    // JEDE Blase hält das Spiel an, bis man „Weiter ▸" tippt (Nutzerwunsch
    // 30.09.: in Ruhe lesen). Erst die Erklärung (`info`, sonst der Text selbst,
    // dann schon mit Zeiger) - sie kommt auch, wenn schon gekauft ist.
    // Danach bleibt nur, wo man etwas TUN soll (fertig + ziel), der Zeiger
    // stehen, ohne Pause, bis es erledigt ist; alles andere ist damit gelesen.
    if (!aktuell.gelesen) {
      const a = aktuell; a.t = 0;
      const handeln = !!(h.fertig && h.ziel);
      return { text: h.info ? h.info() : h.text(), ziel: !h.info && h.ziel ? h.ziel() : null,
        weiter: () => { a.gelesen = true; a.t = 0; if (!h.info && !handeln) a.erledigt = true; } };
    }
    if (aktuell.erledigt) { st.tipps[h.id] = true; aktuell = null; ruheT = 0; S.speichere(); return null; }
    const fertig = h.fertig ? h.fertig() : aktuell.t > (h.dauer || 6);
    if (fertig || (!h.lang && aktuell.t > 20)) { st.tipps[h.id] = true; aktuell = null; ruheT = 0; S.speichere(); return null; }
    // Nach „Weiter": Hatte die Blase schon den Handlungstext, bleibt nur der
    // Zeiger - derselbe Satz ein zweites Mal ohne Knopf wirkte doppelt (gemeldet)
    if (!h.info) return { text: '', ziel: h.ziel ? h.ziel() : null };
    return { text: h.text(), ziel: h.ziel ? h.ziel() : null };
  }
  ruheT += dt;
  for (const h of HINWEISE) {
    if (st.tipps[h.id] || ruheT < (h.sofort ? HINWEIS_PAUSE_SOFORT : HINWEIS_PAUSE) || !h.wann()) continue;
    aktuell = { h, t: 0 };
    return hinweise(0);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Takt und Anzeige
// ---------------------------------------------------------------------------
export function update(dt, blockiert) {
  const st = S.st;
  if (st.lernen == null) st.lernen = st.stats.bedient > 0 ? 99 : 0;   // alte Spielstände
  S.lauf.lernen = st.lernen < 4;
  hinweisT += dt;
  if (blockiert || !st.intro) { zeige(null); aktuelleBlase = null; return; }
  const z = st.lernen < 99 ? einfuehrung() : hinweise(dt);
  if (z && !z.weiter && st.lernen < 99 && weggetippt === st.lernen + '|' + z.text) { zeige(null); aktuelleBlase = null; return; }
  aktuelleBlase = z;
  zeige(z);
}

function zeige(z) {
  if (!z) { tipp.classList.add('versteckt'); zeiger.classList.add('versteckt'); letzterText = ''; return; }
  // Nur ein Zeiger, keine Blase (nach „Weiter" bei Handlungshinweisen)
  if (!z.text) {
    tipp.classList.add('versteckt'); letzterText = '';
    if (z.ziel) { zeiger.classList.remove('versteckt'); zeiger.style.left = `calc(var(--px) * ${z.ziel.x})`; zeiger.style.top = `calc(var(--px) * ${z.ziel.y})`; }
    else zeiger.classList.add('versteckt');
    return;
  }
  if (z.text !== letzterText) {
    tipp.textContent = z.text;
    if (z.weiter) { const w = document.createElement('span'); w.className = 'weiter'; w.textContent = 'Weiter ▸'; tipp.appendChild(w); }
    tipp.classList.toggle('mit-weiter', !!z.weiter);
    letzterText = z.text;
  }
  tipp.classList.remove('versteckt');
  // Die Blase steht nie AUF dem Tresen - dort sind Gast und Bläschen, die
  // man gerade lesen soll. Ziele unten: Blase direkt über dem Tresen, mit
  // Pfeil nach unten. Ziele in der Welt: Blase oben unter der Kopfzeile.
  if (z.ziel) {
    zeiger.classList.remove('versteckt');
    zeiger.style.left = `calc(var(--px) * ${z.ziel.x})`;
    zeiger.style.top = `calc(var(--px) * ${z.ziel.y})`;
  } else zeiger.classList.add('versteckt');
  const unten = z.ziel && z.ziel.y >= G;
  if (unten) {
    tipp.style.top = ''; tipp.style.bottom = `calc(var(--px) * ${H - G + 6})`;
    tipp.dataset.pfeil = 'unten';
    const px = Math.max(12, Math.min(168, z.ziel.x));
    tipp.style.setProperty('--pfeil-x', `calc(var(--px) * ${px - 12})`);
  } else {
    const zl = document.getElementById('ziel');
    tipp.style.top = document.getElementById('huelle').classList.contains('mit-ziel') ? `${zl.offsetTop + zl.offsetHeight + 8}px` : 'calc(var(--px) * 24)';
    tipp.style.bottom = '';
    tipp.dataset.pfeil = '';
    // Läuft gerade eine Einblendung oben, rutscht sie unter die Blase
    const toast = document.getElementById('toast');
    if (toast.classList.contains('zeigen')) toast.style.top = (tipp.offsetTop + tipp.offsetHeight + 6) + 'px';
  }
}

/** Läuft noch etwas von der Einführung (Schritte, Startziele)? Für das Menü. */
export const laeuft = () => S.st.lernen < 99 || !Z.fertig();
/**
 * Einführung überspringen (Menü, Nutzerwunsch 30.09.): Schritte, alle
 * Hinweise und die Startziele gelten als erledigt, nichts blendet sich
 * mehr ein. „Einführung nochmal" holt alles zurück.
 */
export function ueberspringen() {
  const st = S.st;
  st.lernen = 99; st.lernInfo = 2; S.lauf.lernen = false;
  st.tipps = st.tipps || {};
  for (const h of HINWEISE) st.tipps[h.id] = true;
  st.ziel = Z.ZIELE.length;
  aktuell = null; aktuelleBlase = null; zeige(null);
  S.speichere();
}

/** Einführung neu starten (Menü). */
export function nochmal() { S.st.lernen = 0; S.st.lernInfo = 0; S.st.tipps = {}; S.st.ziel = null; Z.nachholen(); aktuell = null; }
