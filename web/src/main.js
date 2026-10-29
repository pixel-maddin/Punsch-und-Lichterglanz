/*
 * main.js - Verdrahtung: Canvas-Größe, Bildschleife, Tippen, Speichern,
 * Rückkehr nach einer Pause (Wichtel-Einnahmen, erster Schnee, Türchen).
 *
 * Testweg: window.__spiel (siehe unten).
 */
import * as C from './config.js?v=202610292100';
import * as S from './spiel.js?v=202610292100';
import * as Z from './zeit.js?v=202610292100';
import * as T from './ton.js?v=202610292100';
import * as LI from './lichtung.js?v=202610292100';
import * as CB from './christbaum.js?v=202610292100';
import * as KA from './karte.js?v=202610292100';
import * as SB from './schlitten.js?v=202610292100';
import * as EB from './schlittschuh.js?v=202610292100';
import * as BS from './backstube.js?v=202610292100';
import * as UI from './ui.js?v=202610292100';
import { zeichneWelt, schlittenPos, funkeln, SCHNEEMANN_X, KATZE_X } from './szene.js?v=202610292100';
import { zeichneTresen, treffer, trifftSchild, trifftChef } from './tresen.js?v=202610292100';
import * as Kacheln from './kacheln.js?v=202610292100';
import * as Lernen from './lernen.js?v=202610292100';
import { zeigeAdvent, zeigeHeiligabend, zeigeRueckblick, zeigeErsterSchnee, zeigeWettbewerb, zeigeJuryAnsage, zeigeSilvester, zeigeWeihnachtsmorgen, zeigeWinterpause } from './ereignis.js?v=202610292100';
import * as A from './auftraege.js?v=202610292100';
import * as E from './erfolge.js?v=202610292100';
import * as ZL from './ziele.js?v=202610292100';

const cv = document.getElementById('cv');
const c = cv.getContext('2d');
const buehne = document.getElementById('buehne');
const pauseZeichen = document.getElementById('pause');
// Handy quer: Hinweis „bitte hochkant" (CSS) - und das Spiel steht so lange
const querFormat = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
const stimmungFeld = document.getElementById('stimmung');
let H = 320, G = 166;

// ---------------------------------------------------------------------------
// Größe: 180 Pixel breit, Höhe folgt dem Bildschirm
// ---------------------------------------------------------------------------
// Sparsames Zeichnen (siehe frame): Takt und „muss neu gezeichnet werden"
const BILD_ABSTAND = 1000 / 30;   // ms zwischen zwei gezeichneten Bildern
let letzteZeichnung = 0, zeichenDt = 0, standGezeichnet = false, bildVeraltet = true, leinwandLeer = true;

let gemessenB = 0, gemessenH = 0;
function groesse() {
  const vw = buehne.clientWidth, vh = buehne.clientHeight;
  // Unsichtbares Fenster (0 x 0): NICHT neu messen. Sonst wird die Höhe NaN,
  // das Canvas 0 hoch, drawImage wirft - und die Bildschleife stand still.
  if (!vw || !vh) return;
  // Bildschirmtastatur: Firefox auf Android macht den sichtbaren Bereich dann
  // kleiner, und das Spiel schrumpfte auf winzig, um über die Tastatur zu
  // passen (gemeldet 01.10.). Solange in ein Textfeld getippt wird und nur die
  // Höhe kleiner wird, bleibt die Größe stehen; nach dem Tippen wird neu gemessen.
  const el = document.activeElement;
  const tippt = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
  if (tippt && vw === gemessenB && vh < gemessenH) return;
  gemessenB = vw; gemessenH = vh;
  let skala = vw / C.B;
  H = Math.floor(vh / skala);
  if (H < C.H_MIN) { skala = vh / C.H_MIN; H = C.H_MIN; }
  if (H > C.H_MAX) H = C.H_MAX;
  // Nur bei echter Größenänderung neu setzen: Schon das Zuweisen derselben
  // Breite leert die Leinwand. Gemeldet 10.10. (Android): Menü zu → kurz
  // schwarz. Das ✕ verliert dabei den Fokus, `focusout` ruft 350 ms später
  // hierher, und bis zum nächsten Bild war das Haus weg.
  if (cv.width !== C.B || cv.height !== H) {
    cv.width = C.B; cv.height = H;
    bildVeraltet = leinwandLeer = true;   // neue Größe = leere Leinwand, auch in der Pause neu zeichnen
  }
  const w = C.B * skala, h = H * skala;
  document.documentElement.style.setProperty('--px', skala + 'px');
  const huelle = document.getElementById('huelle');
  huelle.style.width = w + 'px'; huelle.style.height = h + 'px';
  G = H - C.LEISTE - C.LEISTE_LUFT - C.STAND_H;
  Lernen.layout(G, H);
  c.imageSmoothingEnabled = false;
}
window.addEventListener('resize', groesse);
// Tastatur zu: einmal neu messen (sie verschwindet mit kurzer Animation)
document.addEventListener('focusout', () => setTimeout(groesse, 350));
// Auch wenn das Fenster erst später sichtbar wird (Vorschau, App-Wechsel)
if (window.ResizeObserver) new ResizeObserver(() => groesse()).observe(buehne);
groesse();

// ---------------------------------------------------------------------------
// Tippen
// ---------------------------------------------------------------------------
// 28.10. (gemeldet, Android/Firefox: Stand umbenennen ging nicht, das Fenster blitzte nur kurz auf): Fenster
// öffnen schon beim Aufsetzen des Fingers. Beim Loslassen schickt der Browser noch einen Klick - und lag dort
// jetzt ein Knopf des neuen Fensters („Speichern"), war es gleich wieder zu. Öffnet ein Tipp aufs Spielbild ein
// Fenster oder Blatt, wird der Klick dieses Fingers deshalb verschluckt (höchstens 700 ms lang).
let vorherOffen = false, klickSchluckenBis = 0;
cv.addEventListener('pointerdown', () => { vorherOffen = UI.fensterOffen() || !!UI.panelOffen(); }, true);
document.addEventListener('click', (e) => {
  if (!klickSchluckenBis) return;
  if (performance.now() < klickSchluckenBis) { e.stopPropagation(); e.preventDefault(); }
  klickSchluckenBis = 0;   // nur der eine Klick
}, true);
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  bildVeraltet = true;   // auch in der Pause neu zeichnen (z. B. Topf nachfüllen unter einer Blase)
  T.init();
  if (UI.fensterOffen()) return;
  if (UI.panelOffen()) { UI.schliesseBlatt(); return; }
  // Jeder Tipp im Spiel heißt „ich bin da" - nicht nur am Tresen (13.10.: wer nur
  // am Haus tippte oder zuschaute, hatte nach 5 Minuten langsame Wichtel)
  S.lauf.chefT = Math.min(S.lauf.chefT, C.CHEF_ZEIT);
  const rc = cv.getBoundingClientRect();
  const x = (e.clientX - rc.left) / rc.width * C.B;
  const y = (e.clientY - rc.top) / rc.height * H;
  // Der Nikolaus am Himmel? Großzügig treffen - er ist klein und schnell
  if (S.lauf.schlitten && S.lauf.schlitten.gefangen == null) {
    const sp = schlittenPos(S.lauf.schlitten, G);
    if (x > sp.x - 8 && x < sp.x + 34 && y > sp.y - 16 && y < sp.y + 12) {
      S.lauf.klicks.push({ x, y, t: 0 });
      S.fangeSchlitten();
      return;
    }
  }
  // Der fahrende Händler (steht links auf dem Gehweg, der Karren hinter ihm)
  if (S.haendlerDa()) {
    const h = S.lauf.haendler, fuss = G - 9;
    if (x > h.x - 17 && x < h.x + 6 && y > fuss - 26 && y < fuss + 3) {
      S.lauf.klicks.push({ x, y, t: 0 });
      T.spiele('klick');
      UI.zeigeHaendler();
      return;
    }
  }
  // Das Schild „DEIN STAND" lässt sich beschriften
  if (trifftSchild(x, y, G)) { T.spiele('klick'); UI.schildBeschriften(); return; }
  // Die Tafel „TEMPO x2" erklärt sich (26.10.: wurde für doppelte Sterne gehalten)
  if (trifftChef(x, y)) { T.spiele('klick'); UI.toast(`Solange du am Stand mit anpackst, arbeiten deine Wichtel ${C.CHEF_TEMPO === 2 ? 'doppelt' : String(C.CHEF_TEMPO).replace('.', ',') + '-mal'} so schnell. Doppelte Sterne gibt es, wenn du selbst servierst - das ist etwas anderes.`, 'hinweis'); return; }
  const tr = treffer(x, y, G);
  if (!tr) {
    // Das Haus angetippt (Wand und Dach): Haus schmücken
    const GW = G - 6;
    // Das Futterhaus im Baum: füllen (11.10.)
    if (S.zeigt('futterhaus') && x >= 123 && x <= 142 && y >= GW - 66 && y <= GW - 50) {
      S.lauf.klicks.push({ x, y, t: 0 });
      T.spiele('koerner');
      UI.zeigeFutterhaus();   // 18.10.: großes Fenster mit Futterstand, Nachfüllen und den Vögeln
      return;
    }
    // Der eigene Schneemann auf dem Gehweg (11.10.)
    if (Z.schnee() > 0 && x >= SCHNEEMANN_X - 9 && x <= SCHNEEMANN_X + 9 && y >= GW - 24 && y <= GW + 2) {
      const r0 = S.baueSchneemann();
      S.lauf.klicks.push({ x, y, t: 0 });
      if (r0 === 'gebaut' || r0 === 'fertig') T.spiele('schnee'); else T.spiele('klick');
      const STUFE = ['', 'Eine kleine Kugel gerollt.', 'Der Bauch steht!', 'Der Oberkörper sitzt.', 'Ein Kopf obendrauf.', 'Augen, Knöpfe und eine Karottennase.', 'Hut und Arme aus Ästen.', ''];
      if (r0 === 'fertig') { T.spiele('spezial'); UI.toast('Dein Schneemann ist fertig - mit Schal und Besen! ♥ +' + (C.SCHNEEMANN_HERZ + C.SCHNEEMANN_FERTIG), 'neu'); }
      else if (r0 === 'gebaut') UI.toast(`${STUFE[S.schneemannStufe()]} Morgen geht es weiter. (♥ +${C.SCHNEEMANN_HERZ})`, 'gut');
      else if (r0 === 'morgen') UI.toast('Für heute ist genug gebaut - morgen geht es weiter.', 'hinweis');
      else if (r0 === 'ist') UI.toast('Dein Schneemann ist fertig.', 'hinweis');
      return;
    }
    // Die Schneekatze auf dem Dach (18.10.)
    if (Z.schnee() > 0 && x >= KATZE_X - 9 && x <= KATZE_X + 9 && y >= GW - 78 && y <= GW - 56) {
      const r0 = S.baueSchneekatze();
      S.lauf.klicks.push({ x, y, t: 0 });
      if (r0 === 'gebaut' || r0 === 'fertig') T.spiele('schnee'); else T.spiele('klick');
      const STUFE = ['', 'Ein kleiner Schneeball.', 'Ein runder Körper!', 'Ein Köpfchen sitzt obendrauf.', 'Zwei spitze Ohren.', 'Augen, Näschen und Schnurrhaare.', 'Und ein Schwänzchen!', ''];
      if (r0 === 'fertig') { T.spiele('spezial'); UI.toast('Deine Schneekatze ist fertig - mit Schal und Glöckchen! ♥ +' + (C.SCHNEEMANN_HERZ + C.SCHNEEMANN_FERTIG), 'neu'); }
      else if (r0 === 'gebaut') UI.toast(`${STUFE[S.schneekatzeStufe()]} Morgen geht es weiter. (♥ +${C.SCHNEEMANN_HERZ})`, 'gut');
      else if (r0 === 'morgen') UI.toast('Für heute ist genug gebaut - morgen geht es weiter.', 'hinweis');
      else if (r0 === 'ist') UI.toast('Deine Schneekatze ist fertig.', 'hinweis');
      return;
    }
    // Der Briefkasten neben der Tür (Wunschzettel, 10.10.)
    // 23.10.: Auch ohne Brief antippbar - dann ein kurzer Hinweis statt nichts
    if (x >= 82 && x <= 98 && y >= GW - 47 && y <= GW - 32) {
      T.spiele('klick');
      if (S.briefDa()) UI.zeigeBrief();
      else UI.toast(S.briefe().aktiv ? 'Gerade kein neuer Brief - den offenen Wunschzettel findest du unter Aufträge.' : 'Der Briefkasten ist gerade leer. Ab und zu steckt ein Brief von den Kindern aus dem Dorf drin!', 'hinweis');
      return;
    }
    // 19.10.: Ein Tipp aufs Haus öffnet nicht mehr „Haus schmücken" (dafür gibt es den
    // Knopf „Haus" oben links) - das Haus ist frei für Überraschungen wie die Schneekatze
    return;
  }
  S.lauf.chefT = 0;   // du bist am Stand: Wichtel legen einen Zahn zu
  // Sichtbare Rückmeldung: Ring an der Tippstelle, gedrücktes Feld
  S.lauf.klicks.push({ x, y, t: 0 });
  S.lauf.druck = { art: tr.art, i: tr.i ?? tr.platz, t: 0.14 };
  const vorher = S.lauf.hand.map((h) => h.art + (h.id || ''));
  if (tr.art === 'glaeser') S.tippeGlaeser();
  else if (tr.art === 'karte') { T.spiele('klick'); UI.zeigeStandkarte(); }   // 19.10.: was auf der Karte steht
  else if (tr.art === 'zelle') {
    // Gesperrter Topf: nur ein Hinweis. Früher öffnete sich hier der Laden -
    // beim schnellen Tippen am Tresen landete man dann ungewollt im Einkauf.
    if (S.tippeZelle(tr.i) === 'laden') {
      const p0 = C.PRODUKTE[tr.i];
      T.spiele('falsch');
      S.lauf.wackel['z' + p0.id] = 0.3;
      if (S.freiErfuellt(p0.id)) UI.toast(`${p0.name} gibt es im Supermarkt auf der Karte (${S.formatGeld(p0.kosten)}).`, 'hinweis');
      else UI.toast(`Noch verdeckt. Frei ab ${S.freiText(p0.id)}`, 'hinweis');
    }
  }
  else if (tr.art === 'gast') S.tippeGast(tr.platz);
  else if (tr.art === 'ausguss') S.tippeAusguss();
  else if (tr.art === 'hand') S.tippeHand(tr.i);
  // Was neu aufs Servierbrett kam, hüpft kurz
  const nachher = S.lauf.hand.map((h) => h.art + (h.id || ''));
  const i = nachher.findIndex((h, k) => h !== vorher[k]);
  if (i >= 0) { S.lauf.neuInHand = i; S.lauf.neuInHandT = 0.15; }
}, { passive: false });
// …und danach: Ist durch diesen Tipp ein Fenster oder Blatt aufgegangen, den folgenden Klick verschlucken
cv.addEventListener('pointerdown', () => {
  if (!vorherOffen && (UI.fensterOffen() || UI.panelOffen())) klickSchluckenBis = performance.now() + 700;
});
document.addEventListener('pointerdown', () => T.init(), { once: false, passive: true });
// Doppeltipp-Zoom auf iOS verhindern
document.addEventListener('dblclick', (e) => e.preventDefault());

// ---------------------------------------------------------------------------
// Hooks aus der Spiellogik
// ---------------------------------------------------------------------------
// Ein Tonfehler darf NIE die Spiellogik abbrechen - genau so ist das
// Nachfüllen einmal kaputtgegangen (der Topf wurde nie voll).
S.hooks.ton = (n) => { try { T.spiele(n); } catch (e) { console.warn('Ton', n, e); } };
// Während der Einführung führt die Blase - Hinweis-Einblendungen wie „Erst ein
// Glas holen!" wären dasselbe noch einmal (gemeldet als doppelte Tipps)
S.hooks.toast = (t, a) => { if (a === 'hinweis' && S.st.lernen < 99) return; UI.toast(t, a); };
S.hooks.geld = () => UI.aktualisiereLaden();
S.hooks.bedient = (g, auto, stoss) => A.bedient(g, auto, stoss);
// Ruf des Standes (17.10.): eine Stufe mehr - während der Startziele still
S.hooks.ruf = (n) => {
  if (!S.startzieleFertig()) return;
  T.spiele('spezial');
  UI.toast(`Dein Stand spricht sich herum! Ruf ${n}: alle Preise +${Math.round(n * C.RUF_JE_STUFE * 100)} %`, 'spezial');
};
// Während der Startziele still - die Aufträge stellt ein eigener Hinweis danach vor
A.beiErfuellt((a) => { if (!S.startzieleFertig() && !(ZL.aktuell() && ZL.aktuell().id === 'auftrag')) return;   // beim Startziel „erster Auftrag" schon melden (24.10.)
  T.spiele('fertig'); UI.toast(`Auftrag erfüllt: ${A.text(a)}!`, 'neu'); });

T.setzeFx(S.st.ton.fx);
T.setzeMusik(S.st.ton.musik);

// ---------------------------------------------------------------------------
// Ankommen: neue Saison, Wichtel-Einnahmen, Schnee, Türchen
// ---------------------------------------------------------------------------
let abendErinnert = 0;
function ankommen(erstesMal) {
  const neueSaison = S.pruefeSaison();
  const off = S.offlineAbrechnen();
  const meldungen = [];
  // 29.10.: Heiligabend-Morgen und Winterpause zuerst - das ist DER Moment beim Öffnen
  if (S.weihnachtMorgenFaellig()) meldungen.push(['weihnachtMorgen']);
  if (S.winterpauseFaellig()) meldungen.push(['winterpause']);
  if (neueSaison) meldungen.push(['Eine neue Adventszeit!', `<p>Das Haus ist wieder kahl und grau - Zeit, es erneut herzurichten.</p>${S.st.andenken ? `<p class="bonus">★ ${S.st.andenken} Andenken - ein Stern für jedes Jahr, in dem du dein Haus geschmückt hast</p>` : ''}`]);
  // 26.10.: Nach mindestens 10 Minuten weg ist es ein neuer Besuch - wieder Platz für Vorstellungen
  if (off && off.sek >= C.OFFLINE_MELDUNG) Lernen.neuerBesuch();
  if (off && off.betrag > 0 && off.sek >= C.OFFLINE_MELDUNG && off.sek < C.OFFLINE_FENSTER) {
    // Eine Weile weg: kein Fenster, nur ein Hinweis (ganz kurz weg: still gutgeschrieben)
    UI.toast(`Die Wichtel haben weitergearbeitet: +${S.formatGeld(off.betrag)}`, 'gut');
  }
  // Länger weg: die Kiste (auch eine, die beim letzten Mal ungeöffnet blieb)
  if (S.st.kiste > 0) meldungen.push(['kiste', off && off.sek >= C.OFFLINE_FENSTER ? off.sek : 0]);
  if (Z.schnee() > 0 && !S.st.ersterSchnee) {
    S.st.ersterSchnee = true;
    meldungen.push(['schnee']);
  }
  // Adventssonntage: jedes Ereignis als eigenes Fenster, in der richtigen Reihenfolge
  for (const n of S.neueAdventsereignisse()) meldungen.push(['advent', n]);
  // Wetter mit Folgen: einmal am Tag sagen, was heute gut geht
  const lage = C.WETTER_LAGEN[Z.tagesWetter().art];
  if (lage && S.st.lernen >= 99 && S.einstieg('wetter') && !S.standZu() && S.st.wetterTag !== Z.tagesSchluessel()) {
    S.st.wetterTag = Z.tagesSchluessel();
    setTimeout(() => UI.toast(`${lage.name}! ${lage.text} (+${Math.round(lage.bonus * 100)} %)`, 'spezial'), 2600);
  }
  // Wunschzettel: ein neuer Brief oder ein Dankesbild im Briefkasten
  const brief = S.briefPruefen();
  if (brief) setTimeout(() => UI.toast(brief === 'neu' ? 'Ein Brief steckt im Briefkasten am Haus!' : 'Im Briefkasten liegt ein Dankeschön für dich!', 'spezial'), 1500);
  // Am 4. Advent die Jury: gleich nach dessen Fenster (11.10.)
  if (S.wettbewerbFaellig()) meldungen.push(['wettbewerb']);
  // 4 Tage vorher (25.10.): einmal ein richtiges Fenster mit dem Stand der Stimmung
  if (S.juryAnsageFaellig()) meldungen.push(['juryAnsage']);
  // Vorher, ab dem 3. Advent: einmal am Tag die Ansage
  const inTagen = S.wettbewerbInTagen();
  if (inTagen != null && inTagen > 0 && !S.juryAnsageFaellig() && S.spieltag() + inTagen >= C.WETTBEWERB.abSpieltag && S.st.wettbewerbAnsage !== Z.tagesSchluessel()) {   // am Tag des Fensters keine Einblendung dazu
    S.st.wettbewerbAnsage = Z.tagesSchluessel();
    setTimeout(() => UI.toast(inTagen === 1 ? 'Morgen kommt die Jury: Wer hat das schönste Haus im Dorf?' : `In ${inTagen} Tagen kürt das Dorf das schönste Haus - mehr Deko, mehr Stimmung!`, 'spezial'), 3600);
  }
  // Heiligabend: das Finale, einmal je Saison (nach den Adventen)
  if (S.heiligabendFaellig()) meldungen.push(['heiligabend']);
  // 24.12. tagsüber: ans Finale erinnern (29.10., Nutzerfrage: „bekommt der User einen Hinweis?“)
  const dh = Z.jetzt();
  if (Z.dezemberTag(dh) === 24 && dh.getHours() < C.HEILIGABEND_STUNDE && S.st.weihnachtMorgen === Z.saison() && !S.weihnachtMorgenFaellig() && Date.now() - abendErinnert > 30 * 60000) {
    abendErinnert = Date.now();
    setTimeout(() => UI.toast('Heute zwischen 16 und 22 Uhr wird es vor deinem Haus festlich - schau dann noch einmal vorbei!', 'spezial'), 2400);
  }
  // 2. bis 6. Januar: wie lange noch Gäste kommen (29.10.)
  const pa = S.pauseAnsage();
  if (pa) setTimeout(() => UI.toast(pa, 'spezial'), 3000);
  // Silvester: der Abschluss der Saison (11.10.)
  if (S.silvesterFaellig()) meldungen.push(['silvester']);
  const tueren = S.offeneTueren();
  // 26.10.: höchstens einmal am Tag - vorher bei jeder Rückkehr in die App wieder („24 Türchen warten …")
  if (tueren > 0 && !erstesMal && S.st.tuerMeldung !== Z.tagesSchluessel() && (S.st.tuerMeldung = Z.tagesSchluessel())) UI.toast(S.vorfreudeBereit() ? 'Ein Vorfreude-Päckchen wartet im Kalender!' : tueren === 1 ? 'Ein Türchen wartet im Adventskalender!' : `${tueren} Türchen warten im Kalender!`, 'spezial');
  S.speichere();
  // Schon Wartendes nicht doppelt (Kiste, Ereignisse)
  for (const m of meldungen) if (!warteschlange.some((w) => w[0] === m[0] && w[1] === m[1])) warteschlange.push(m);
  zeigeNaechste(true);
  return meldungen;
}

// ---------------------------------------------------------------------------
// Fenster in Wellen (23.10., Betatest: am 1.12. morgens kamen acht Fenster
// hintereinander - Kiste, Futterhaus, zwei neue Minispiele, erster Schnee,
// Vogel, zwei Stammgäste). Höchstens WELLE_MAX Fenster nacheinander, dann
// WELLE_PAUSE Ruhe; was noch wartet (Ankommen-Fenster, Vogel-Steckbrief,
// Stammgast-Geschichte, neues Minispiel, Fragen), kommt in der nächsten Welle.
// Gezählt wird jedes Fenster, das aufgeht - auch eines, das man selbst öffnet.
// ---------------------------------------------------------------------------
const WELLE_MAX = 3, WELLE_PAUSE = 45000;
let welleZahl = 0, zuletztOffen = 0, warOffen = false;
const warteschlange = [];
function fensterTakt() {
  const offen = UI.fensterOffen();
  if (offen && !warOffen) { if (Date.now() - zuletztOffen > WELLE_PAUSE) welleZahl = 0; welleZahl++; }
  if (offen) zuletztOffen = Date.now();
  warOffen = offen;
}
/** Darf jetzt ein nicht angefordertes Fenster aufgehen? */
const fensterFrei = () => !UI.fensterOffen() && !UI.panelOffen() && !Lernen.pausiert()
  && (welleZahl < WELLE_MAX || Date.now() - zuletztOffen > WELLE_PAUSE);
/** Das nächste Ankommen-Fenster. `kette` = direkt nach dem vorigen (dann nur, solange die Welle nicht voll ist). */
function zeigeNaechste(kette) {
  if (!warteschlange.length) return;
  // 29.10.: Ein offenes Fenster nie ersetzen - ankommen() läuft beim Laden UND beim Sichtbarwerden,
  // der zweite Lauf legte die Jury über das gerade aufgegangene Weihnachtsfenster. Der Rest kommt
  // über den Sekundentakt, sobald es zu ist.
  if (UI.fensterOffen()) return;
  fensterTakt();
  if (kette && welleZahl >= WELLE_MAX) return;   // Rest später (Sekundentakt)
  const m = warteschlange.shift();
  const weiter = () => setTimeout(() => zeigeNaechste(true), 60);
  if (m[0] === 'advent') zeigeAdvent(m[1], weiter);
  else if (m[0] === 'weihnachtMorgen') { if (S.weihnachtMorgenFaellig()) zeigeWeihnachtsmorgen(weiter); else zeigeNaechste(kette); }
  else if (m[0] === 'winterpause') { if (S.winterpauseFaellig()) zeigeWinterpause(weiter); else zeigeNaechste(kette); }
  else if (m[0] === 'heiligabend') { if (S.heiligabendFaellig()) zeigeHeiligabend(weiter); else zeigeNaechste(kette); }
  else if (m[0] === 'wettbewerb') { if (S.wettbewerbFaellig()) zeigeWettbewerb(weiter); else zeigeNaechste(kette); }
  else if (m[0] === 'juryAnsage') { if (S.juryAnsageFaellig()) zeigeJuryAnsage(weiter); else zeigeNaechste(kette); }
  else if (m[0] === 'silvester') { if (S.silvesterFaellig()) zeigeSilvester(weiter); else zeigeNaechste(kette); }
  else if (m[0] === 'schnee') zeigeErsterSchnee(weiter);
  // Kiste nur, wenn noch etwas drin ist: Ankommen läuft beim Laden und beim
  // Sichtbarwerden der Seite, die ungeöffnete Kiste stand dann zweimal in der Schlange
  else if (m[0] === 'kiste') { if (S.st.kiste > 0) UI.zeigeKiste(m[1], weiter); else zeigeNaechste(kette); }
  else UI.fenster(m[0], m[1], [{ text: 'Weiter', aktion: weiter }]);
  fensterTakt();   // gleich mitzählen, nicht erst im nächsten Bild
}

// ---------------------------------------------------------------------------
// Bildschleife
// ---------------------------------------------------------------------------
let letzte = performance.now();
const huelleEl = document.getElementById('huelle');
let tSek = 0;
function frame(jetzt) {
  let dt = Math.min(0.1, (jetzt - letzte) / 1000);
  letzte = jetzt;
  // Während Laden, Kalender, ein Fenster oder eine Hinweisblase offen ist, steht
  // der Stand still - sonst liefen einem beim Stöbern die Gäste davon.
  fensterTakt();
  const steht = UI.fensterOffen() || !!UI.panelOffen() || querFormat.matches || Lernen.pausiert();
  // Pause heißt ALLES steht, auch Schnee, Funken und Gehbewegungen: Die hängen
  // an der Zeichen-Uhr tSek, die lief vorher weiter (gemeldet 30.09.)
  if (steht) dt = 0;
  tSek += dt;
  // Hinter einer Hinweisblase wird das Bild blasser - man sieht, dass Pause ist
  huelleEl.classList.toggle('pausiert', Lernen.pausiert());
  // Dev-Tempo in Einzelschritten, damit nichts übersprungen wird
  if (!steht) for (let i = 0; i < S.dev.tempo; i++) S.update(dt);
  // Pause-Zeichen steht an der Stelle der Herzen (sonst lag es darüber)
  const zeigePause = steht && S.st.intro;
  pauseZeichen.classList.toggle('versteckt', !zeigePause);
  stimmungFeld.classList.toggle('versteckt', zeigePause);
  // Die nächste Runde ist schon bestellt, bevor gezeichnet wird: Ein Fehler
  // beim Zeichnen darf die Schleife nie anhalten.
  requestAnimationFrame(frame);
  if (!cv.height) groesse();
  // Sparsam zeichnen (gemeldet: „Handy wird warm"): höchstens 30 Bilder je
  // Sekunde - für Pixelgrafik reicht das, die Spiellogik rechnet weiter in
  // jedem Takt. Und solange alles steht, nur ein Bild und dann erst wieder,
  // wenn man etwas antippt (bildVeraltet).
  zeichenDt += dt;
  if (!steht) standGezeichnet = false;
  // Nach einem Kauf blendet der Laden kurz aus, und am Haus funkelt es - das
  // muss gezeichnet werden, obwohl der Laden noch „offen" ist (gemeldet 01.10.)
  if (UI.zeigtKauf()) bildVeraltet = true;
  // Eine geleerte Leinwand (neue Größe) wartet nicht auf den 30-Bilder-Takt -
  // sonst stünde sie bis zu einem Bild lang schwarz da
  const faellig = jetzt - letzteZeichnung >= BILD_ABSTAND - 2 || leinwandLeer;
  if (faellig && !(steht && standGezeichnet && !bildVeraltet)) {
    try {
      c.clearRect(0, 0, C.B, H);
      const w = zeichneWelt(c, G, tSek, zeichenDt);
      zeichneTresen(c, G, tSek, w);
      Kacheln.aktualisiere(tSek);   // die Karte unten als feine HTML-Ebene (19.10.)
    } catch (e) { console.warn('Zeichnen', e); }
    zeichenDt = 0; letzteZeichnung = jetzt;
    standGezeichnet = steht; bildVeraltet = leinwandLeer = false;
  }
  UI.hud();
  Lernen.update(dt, UI.fensterOffen() || !!UI.panelOffen());
}

// Speichern: regelmäßig und beim Verlassen
setInterval(() => { if (!document.hidden) S.speichere(); }, 5000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { S.speichere(); T.schlafen(); }
  else { T.wecken(); ankommen(false); }
});
window.addEventListener('pagehide', () => S.speichere());

let neuGesammelt = [], neuZuletzt = 0;
// Neuer Tag / Schnee während die App offen ist: jede Minute nachsehen
let letzterTag = Z.tagesSchluessel();
setInterval(() => {
  const k = Z.tagesSchluessel();
  if (k !== letzterTag) { letzterTag = k; ankommen(false); }
  // Heiligabend bricht an, während man spielt: warten, bis nichts offen ist
  else if (S.weihnachtMorgenFaellig() && !UI.fensterOffen() && !UI.panelOffen()) zeigeWeihnachtsmorgen();
  else if (S.heiligabendFaellig() && !UI.fensterOffen() && !UI.panelOffen()) zeigeHeiligabend();
  // Jury und Silvester brechen an, während man spielt (11.10.)
  else if (S.wettbewerbFaellig() && !UI.fensterOffen() && !UI.panelOffen() && !Lernen.pausiert()) zeigeWettbewerb();
  else if (S.silvesterFaellig() && !UI.fensterOffen() && !UI.panelOffen() && !Lernen.pausiert()) zeigeSilvester();
  // Wunschzettel: neuer Brief oder ein erfüllter Wunsch
  else { const brief = S.briefPruefen(); if (brief) UI.toast(brief === 'neu' ? 'Ein Brief steckt im Briefkasten am Haus!' : 'Im Briefkasten liegt ein Dankeschön für dich!', 'spezial'); }
  // Ein neues Minispiel ist auf der Karte: eigenes Fenster, sobald nichts offen ist
  const miniNeu = S.pruefeMiniFrei();
  // Ab hier je Sekunde höchstens EIN Fenster, und nur, wenn die Welle es zulässt (23.10.)
  fensterTakt();
  // Was beim Ankommen wegen der Welle liegen blieb, zuerst
  if (warteschlange.length && fensterFrei()) zeigeNaechste(false);
  // Neue Vogelart am Futterhaus (14.10.): Steckbrief
  else if (S.st.vogelNeu && S.st.vogelNeu.length && fensterFrei()) { UI.zeigeVogel(S.st.vogelNeu.shift()); S.speichere(); }
  // Geschichte eines Stammgastes (17.10.): großes Fenster, hält das Spiel an
  // 29.10.: Stand zu - keine Stammgast-Fenster (das Geschenk wartet bis morgen)
  else if (S.st.stammNeu && S.st.stammNeu.length && fensterFrei() && !S.standZu()) { const f = S.naechstesStammFenster(); if (f) UI.zeigeStamm(f); S.speichere(); }
  // erst nach einer Minute im Spiel - beim Ankommen kommen Kiste, Wetter und Briefe zuerst
  else if (miniNeu.length && S.lauf.t > 60 && fensterFrei()) { UI.zeigeMiniNeu(miniNeu.shift()); S.speichere(); }
  fensterTakt();
  // Neu Freigeschaltetes: während der Startziele nur die NEU-Marken (sonst
  // kamen in den ersten Minuten ~15 Einblendungen), danach höchstens eine
  // Einblendung je Minute, mehrere zusammengefasst
  S.setzeHandWuensche(A.handWuensche());   // 26.10.: Gäste mit dem Getränk einer offenen Bitte bedienst du
  const neu = S.pruefeFreischaltungen();
  if (neu.length) { neuGesammelt.push(...neu); S.speichere(); }
  // Finale (25.10.): einmal sagen, wo das goldene Geschenk wartet
  if (!S.st.finaleGemeldet && !UI.fensterOffen() && S.finaleBereit()) {
    S.st.finaleGemeldet = true; T.spiele('spezial');
    UI.toast('Du hast wirklich alles gekauft! Unter AUFTRÄGE → Erfolge wartet vor dem Kamin ein Geschenk.', 'spezial');
  }
  if (neuGesammelt.length && S.startzieleFertig() && Date.now() - neuZuletzt > 60000) {
    T.spiele('spezial');
    UI.toast(neuGesammelt.length === 1 ? `Neu freigeschaltet: ${S.artikelName(neuGesammelt[0].id)}!` : `${neuGesammelt.length} neue Dinge in den Läden!`, 'neu');
    neuGesammelt = []; neuZuletzt = Date.now();
  } else if (!S.startzieleFertig()) neuGesammelt = [];
  // iPhone im Browser: einmal der Tipp zum Home-Bildschirm (12.10.), nie über etwas anderem.
  // 26.10.: gleich nach der Einführung statt nach den Startzielen - die App auf dem Home-Bildschirm
  // hat ihren EIGENEN Speicher, wer erst später wechselt, finge dort von vorne an
  if (!S.st.installTipp && UI.iosImBrowser() && S.st.lernen >= 99 && S.lauf.t > 5 && fensterFrei()
      && !UI.fensterOffen() && !UI.panelOffen() && !Lernen.pausiert()) UI.zeigeInstallTipp();
  // Kirchenglocken zur vollen Stunde (nicht im Minispiel - dort läuft dessen Welt)
  const gl = S.glockenFaellig();
  if (gl && !T.imMinispiel()) {
    for (let i = 0; i < gl.schlaege; i++) setTimeout(() => T.spiele('kirchglocke'), i * C.GLOCKEN_TAKT * 1000);
    if (gl.abend) for (let i = 0; i < C.GLOCKEN_ABEND_DAUER / 0.8; i++) setTimeout(() => T.spiele(i % 2 ? 'kirchglocke2' : 'kirchglocke'), (gl.schlaege * C.GLOCKEN_TAKT + 1.5 + i * 0.8) * 1000);
  }
  if (S.chorAnsage()) { T.spiele('glocken'); UI.toast(`Ein Chor singt vor deinem Haus! Bis ${C.CHOR.bis} Uhr zahlen alle Gäste ${Math.round(C.CHOR.bonus * 100)} % mehr.`, 'spezial'); S.speichere(); }
  // Feierabend (17-19 Uhr): einmal am Tag sagen; um Mitternacht an Silvester gratulieren
  if (S.feierabendAnsage()) { T.spiele('glocken'); UI.toast(`Feierabend! Bis ${C.FEIERABEND.bis} Uhr kommen mehr Gäste.`, 'spezial'); S.speichere(); }
  // Wer den ersten Schnee schon vor dem 11.10. gesehen hat, kennt den Schneehaufen nicht
  if (Z.schnee() > 0 && S.startzieleFertig() && !S.st.schneemannHinweis && S.lauf.t > 30 && !UI.fensterOffen()) {
    S.st.schneemannHinweis = true;
    UI.toast('Neu: Auf dem Gehweg und auf dem Dach liegt je ein Schneehaufen - tipp sie jeden Tag an, mal sehen, was daraus wird!', 'spezial');
  }
  if (S.neujahrJetzt()) { T.spiele('feuerwerk'); UI.toast(`Frohes neues Jahr ${Z.jetzt().getFullYear()}!`, 'spezial'); }
  const ziel = ZL.pruefe();
  if (ziel) {
    // Ein geschafftes Startziel ist ein Moment (13.10., Betatest: „nur eine
    // kleine Einblendung"): Glockenspiel, Funkeln am Haus, die Leiste pulst
    T.spiele('spezial');
    funkeln(80, -60, `Ziel geschafft! +${ziel.lohn} ★`);
    UI.toast(ZL.fertig() ? `Alle Startziele geschafft! +${ziel.lohn} Sterne` : `Ziel ${ZL.nummer() - 1} geschafft! +${ziel.lohn} Sterne`, 'neu');
    UI.zielPuls();
  }
  UI.zielLeiste();
  // Nach den Startzielen einmal fragen: weiter Ziele vorgeschlagen bekommen oder selbst erkunden?
  if (ZL.fertig() && S.st.zieleWeiter == null && S.st.lernen >= 99 && S.lauf.t > 20 && fensterFrei()) UI.zeigeZieleFrage();
  const erfolge = E.pruefe();
  // Socken aus der Einführung kamen still dazu - nach den Startzielen einmal sagen (13.10.)
  if (erfolge.length && !S.startzieleFertig()) S.st.sockenStill = (S.st.sockenStill || 0) + erfolge.length;
  if (S.st.sockenStill && S.startzieleFertig() && S.lauf.t > 40 && !UI.fensterOffen() && !UI.panelOffen() && !Lernen.pausiert()) {
    T.spiele('spezial');
    UI.toast(`Du hast schon ${S.st.sockenStill} ${S.st.sockenStill === 1 ? 'Socke' : 'Socken'} an der Erfolgswand verdient! Schau unter Aufträge → Erfolge.`, 'neu');
    S.st.sockenStill = 0; S.speichere();
  }
  // Vorschau auf morgen (13.10.): einmal am Tag nach ein paar Minuten
  if (S.st.vorschauAus !== true && S.startzieleFertig() && S.lauf.t > C.VORSCHAU_NACH && S.st.vorschauTag !== Z.tagesSchluessel() && !UI.fensterOffen() && !UI.panelOffen() && !Lernen.pausiert()) {
    S.st.vorschauTag = Z.tagesSchluessel(); S.speichere();
    UI.toast(UI.vorschauText(), 'neu');
  }
  if (erfolge.length && S.startzieleFertig()) {   // Socken zählen immer, gemeldet erst nach den Startzielen
    T.spiele('spezial');
    UI.toast(erfolge.length === 1 ? `Neue Socke an der Erfolgswand: ${erfolge[0].name}!` : `${erfolge.length} neue Socken an der Erfolgswand!`, 'neu');
    S.speichere();
  }
  UI.neuMarke();
  UI.aktualisiereLaden();
}, 1000);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
Z.setzeVersatzTage((S.st.modus === 'eigen' ? S.st.versatzTage : 0) + S.dev.tage);
const q = new URLSearchParams(S.ENTWICKLUNG ? location.search : '');
if (q.get('datum')) Z.setzeZeit(new Date(q.get('datum')), Number(q.get('tempo')) || 1);
else if (q.get('tempo')) Z.setzeZeit(null, Number(q.get('tempo')));

ZL.nachholen();
UI.verdrahte();
Kacheln.knopfBilder();   // Bilder der Knöpfe „Haus" und „Angebot" (19.10.)
if (S.DEMO) demo(S.DEMO);
else if (!S.st.intro) {
  UI.frageName(false, () => UI.waehleModus((modus) => {
    S.st.modus = modus;
    S.st.versatzTage = modus === 'eigen' ? Z.versatzFuerEigenenStart() : 0;
    Z.setzeVersatzTage(S.st.versatzTage + S.dev.tage);
    S.st.saison = Z.saison();
    S.speichere();
    UI.zeigeZiel(modus, () => {
      S.st.intro = true; S.st.lernen = 0; S.setzeStartTag(); S.speichere();
      setTimeout(() => ankommen(true), 100);
    });
  }));
} else ankommen(true);
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ---------------------------------------------------------------------------
// Vorführmodus für Store-Screenshots (?demo=haus|tresen|laden|wand|karte|start)
// Nur lokal, eigener Speicherplatz (S.DEMO). Baut ein geschmücktes Haus ohne
// Blasen, Fenster und Einblendungen; die Szene wählt der Wert.
// ---------------------------------------------------------------------------
function demo(art) {
  S.allesLoeschen();   // immer frisch - im Vorführ-Speicher können Reste von Messläufen liegen
  const st = S.st;
  st.zuletzt = Date.now(); st.startTag = null;
  st.zieleWeiter = false;   // 17.10.: sonst kam „Wie geht es weiter?" über jede Vorführszene
  S.hooks.toast = () => {};
  st.intro = true;
  st.name = 'Haus Schneeflocke'; st.standName = 'LICHTERGLANZ';
  st.adventGesehen = 4; st.ersterSchnee = true; st.kiste = 0;
  st.tipps = {}; st.ziel = 99;
  if (art === 'kamin') {   // nur der Kaminofen, damit man die Fenster beurteilen kann
    st.lernen = 99; st.ziel = 99; st.besitz.kamin = 1; st.besitz.kinderpunsch = 1; st.geld = 500; st.gesamt = 2000;
  } else if (art === 'start') {
    // Ganz am Anfang: Startziel oben, das Haus noch kahl
    st.lernen = 99; st.ziel = 1; st.besitz.kinderpunsch = 1; st.geld = 60; st.gesamt = 260;
    for (let i = 0; i < 8; i++) st.tipps['x' + i] = true;
  } else {
    st.lernen = 99;
    for (const a of C.ARTIKEL) st.besitz[a.id] = Array.isArray(a.kosten) ? a.kosten.length : 1;
    for (const p of C.PRODUKTE) st.toepfe[p.id] = S.topfMax();
    for (const d of Object.values(C.KALENDER_DEKO)) st.kalDeko[d.id] = true;
    for (const d of C.AUFTRAG_DEKO) st.kalDeko[d.id] = true;
    // Händler-Szenen: drei Stücke schon gekauft, zwei noch im Angebot
    // Varianten-Szenen: alle Plätze auf Variante 2 bzw. 3
    if (art === 'alles' || art === 'marktdeko') for (const d of [...C.HAENDLER_DEKO, ...C.LICHTUNG_DEKO, ...C.MARKT_DEKO, ...C.BAUM_DEKO, ...C.BERG_DEKO, ...C.EIS_DEKO, ...C.SCHNEE_DEKO, ...C.SPECIAL_DEKO, ...C.FINALE_DEKO]) st.kalDeko[d.id] = true;
    // Markttag erzwingen: Anker so legen, dass heute der erste Markt ist
    if (art === 'markt' || art === 'marktkarte') st.markt = { anker: Math.round(new Date(Z.jetzt()).setHours(0, 0, 0, 0) / 86400000) - C.MARKT_ERST, seed: 1, besucht: 0, angesagt: 0 };
    if (art === 'meinhaus') { st.var = { 'tanne:1': true, 'kranz:1': true, 'kranz:2': true }; st.wahl = { kranz: 2 }; }
    if (art === 'var1' || art === 'var2') {
      st.var = {}; st.wahl = {};
      for (const platz in C.VARIANTEN) { st.var[platz + ':1'] = true; st.var[platz + ':2'] = true; st.wahl[platz] = art === 'var1' ? 1 : 2; }
    }
    if (art.startsWith('haendler')) for (const id of art === 'haendleralle' ? C.HAENDLER_DEKO.map((d) => d.id) : ['h_kugel', 'h_flamingo', 'h_hahn']) st.kalDeko[id] = true;
    st.fassade = 'rot'; st.geld = 1284650; st.gesamt = 6500000;
    for (let n = 1; n <= Z.dezemberTag(); n++) st.kalender[n] = true;
    st.stats.bedient = 8421;
    st.erfolge = {}; for (const x of E.ERFOLGE.slice(0, art === 'wand' ? 21 : 24)) st.erfolge[x.id] = Date.now();
    st.erfolgNeu = {};
  }
  // Alle Hinweise als gelesen, damit keine Blase im Bild steht
  for (const k of ['leer', 'falsch', 'voll', 'laden', 'laden_danach', 'deko', 'deko_danach', 'gegangen', 'schwung', 'w_spuel', 'w_nachfuell', 'w_servier',
    'wichtel_weg', 'bestellen2', 'herz_ziel', 'ziele_fertig', 'sonder_schlange', 'sonder_weg', 'extra', 'gross', 'chef', 'schild', 'eilig', 'auftrag',
    'auftraege_neu', 'erfolge', 'kalender', 'karte_mehr', ...Object.keys(C.HANDGRIFF).map((g) => 'griff_' + g)]) st.tipps[k] = true;
  if (art === 'start') delete st.tipps.laden;
  S.lauf.lernen = false;
  // Etwas Betrieb am Stand
  for (let i = 0; i < 60 * 25; i++) { S.update(1 / 60); S.lauf.chefT = 0; }
  if (art === 'tresen') {
    S.lauf.hand = [];
    const gib = (id, tipps) => { const i = C.PRODUKTE.findIndex((p) => p.id === id); S.tippeGlaeser(); S.tippeZelle(i); return tipps; };
    gib('schoko'); gib('apfel'); gib('kinderpunsch');
    for (let i = 0; i < 90; i++) S.update(1 / 60);
    S.tippeHand(0); S.tippeHand(1);
  }
  if (art.startsWith('haendler') && art !== 'haendleralle') {
    S.lauf.haendler = { x: C.HAENDLER_X, t: 0, phase: 'steht', angebot: ['h_polar', 'h_orgel'], gutschein: true };
    if (art === 'haendlerfenster') UI.zeigeHaendler();
  }
  if (art === 'meinhaus') UI.oeffneMeinHaus();
  if (art === 'landkarte' || art === 'marktkarte' || art === 'santa') UI.oeffneKarte();
  if (art === 'santa') KA.santaTest(0);
  if (art === 'stufenwahl') { UI.oeffneKarte(); setTimeout(() => [...document.querySelectorAll('#kartenOrte .ort')].find((e) => e.textContent.startsWith('Schlittenberg')).click(), 200); }
  if (art === 'markt') UI.zeigeMarkt();
  if (art === 'lichtung') { UI.starteLichtung(); LI.vorspulen(9); }
  if (art === 'baumspiel') { UI.starteBaumspiel(); CB.vorspulen(5.5); }
  if (art === 'bergspiel') { UI.starteBergspiel(); SB.vorspulen(6); }
  if (art === 'eisspiel') { UI.starteEisbahn(); EB.vorspulen(5); }
  if (art === 'schnee') setTimeout(() => zeigeErsterSchnee(), 300);
  // Wunschzettel und Album (10.10.)
  if (['brief', 'dank', 'album', 'kasten'].includes(art)) {
    const kind = (name, alter, maedchen) => ({ kind: name, alter, maedchen });
    st.briefe = { aktiv: { art: art === 'dank' ? 'backen' : 'deko', ziel: art === 'dank' ? null : 'schneemann', ...kind('Frida', 6, true), start: 0, tag: 0, offen: true, dank: art === 'dank', v: 0 }, erfuellt: [], ab: 0, n: 1 };
    if (art === 'album') {
      st.briefe = { aktiv: null, ab: 0, n: 4, erfuellt: [{ art: 'deko', ziel: 'schneemann', ...kind('Frida', 6, true) }, { art: 'backen', ...kind('Paul', 6) }, { art: 'santa', ...kind('Mia', 5, true) }, { art: 'getraenk', ziel: 'schoko', ...kind('Vincent', 8) }] };
      st.stats.typ = { erwachsen: 812, kind: 240, oma: 133, opa: 120, rentier: 4, schneemann: 2, grummel: 3 };
      st.stats.tiere = { hase: 61, eich: 40, reh: 22 };
      st.mini = { back: { best: 1700, tag: 0, runden: 0 } };
      UI.oeffneAuftraege('album');
    } else if (art !== 'kasten') setTimeout(() => UI.zeigeBrief(), 300);
  }
  if (art === 'dose') st.dose = Array.from({ length: 24 }, (_, i) => C.BACK_REZEPTE[i % 5].id);
  if (art === 'backspiel') { st.mini = { back: { best: 1700, tag: 0, runden: 0 } }; UI.starteBackstube(); BS.vorspulen(4); }
  if (art === 'backstube') { st.mini = { back: { best: 1700, tag: 0, runden: 0 } }; st.dose = ['zimtstern', 'kipferl', 'herz', 'baeumchen', 'spitzbube', 'zimtstern', 'herz', 'kipferl', 'baeumchen', 'herz', 'zimtstern', 'kipferl', 'spitzbube', 'herz', 'zimtstern', 'kipferl', 'herz', 'baeumchen', 'herz', 'zimtstern', 'kipferl']; UI.oeffneKarte(); setTimeout(() => [...document.querySelectorAll('#kartenOrte .ort')].find((e) => e.textContent.startsWith('Backstube')).click(), 200); }
  if (art === 'laden') UI.oeffneLaden('markt');
  if (art === 'wand') UI.oeffneAuftraege('erfolge');
  if (art === 'karte') UI.karte(0);
  // Barbarazweig und Heiligabend (10.10.): Zweig am 4.12. geschnitten, täglich gegossen
  if (['zweig', 'barbara', 'heiligabend', 'rueckblick', 'festkarte'].includes(art)) {
    const heute = Math.min(24, Z.dezemberTag());
    st.barbara = { geschnitten: 4, gegossen: [] };
    for (let d = 4; d <= heute; d++) st.barbara.gegossen.push(d);
    if (art !== 'heiligabend') st.heiligabend = Z.saison();   // sonst kommt das Finale dazwischen
    if (art === 'barbara') { st.barbara.gegossen.pop(); UI.oeffneKalender(); }
    if (art === 'heiligabend') zeigeHeiligabend();
    if (art === 'rueckblick') { st.stats.bedient = 4821; st.stats.santa = 3; zeigeRueckblick(); }
    if (art === 'festkarte') { st.stats.bedient = 4821; UI.karte('heilig', false, 'Frohe Weihnachten!'); }
  }
}

// ---------------------------------------------------------------------------
// Testweg (nur lokal, siehe S.ENTWICKLUNG)
// ---------------------------------------------------------------------------
if (S.ENTWICKLUNG) window.__spiel = {
  S, Z, C, UI, T,
  get st() { return S.st; }, get lauf() { return S.lauf; },
  geld(n) { S.verdiene(n); },
  datum(s, tempo = 1) { Z.setzeZeit(s ? new Date(s) : null, tempo); },
  alles() { for (const a of C.ARTIKEL) { const n = Array.isArray(a.kosten) ? a.kosten.length : 1; S.st.besitz[a.id] = n; } for (const p of C.PRODUKTE) S.st.toepfe[p.id] = S.topfMax(); for (const d of Object.values(C.KALENDER_DEKO)) S.st.kalDeko[d.id] = true; },
  update: (dt) => S.update(dt),
  // Ein Bild der echten Schleife (Tests im verborgenen Fenster: rAF ersetzen und hiermit anstoßen)
  bildschleife: (t) => frame(t),
  // Ein Bild von Hand zeichnen - im verborgenen Vorschaufenster steht
  // requestAnimationFrame still, der Screenshot zeigt sonst ein altes Bild.
  bild() { c.clearRect(0, 0, C.B, H); const w = zeichneWelt(c, G, tSek, 0); zeichneTresen(c, G, tSek, w); Kacheln.aktualisiere(tSek); },
  groesse,
};
