/*
 * main.js - Verdrahtung: Canvas-Größe, Bildschleife, Tippen, Speichern,
 * Rückkehr nach einer Pause (Wichtel-Einnahmen, erster Schnee, Türchen).
 *
 * Testweg: window.__spiel (siehe unten).
 */
import * as C from './config.js?v=20261003a';
import * as S from './spiel.js?v=20261003a';
import * as Z from './zeit.js?v=20261003a';
import * as T from './ton.js?v=20261003a';
import * as UI from './ui.js?v=20261003a';
import { zeichneWelt, schlittenPos } from './szene.js?v=20261003a';
import { zeichneTresen, treffer, trifftSchild } from './tresen.js?v=20261003a';
import * as Lernen from './lernen.js?v=20261003a';
import { zeigeAdvent } from './ereignis.js?v=20261003a';
import * as A from './auftraege.js?v=20261003a';
import * as E from './erfolge.js?v=20261003a';
import * as ZL from './ziele.js?v=20261003a';

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
let letzteZeichnung = 0, zeichenDt = 0, standGezeichnet = false, bildVeraltet = true;

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
  cv.width = C.B; cv.height = H;
  bildVeraltet = true;   // neue Größe = leere Leinwand, auch in der Pause neu zeichnen
  const w = C.B * skala, h = H * skala;
  document.documentElement.style.setProperty('--px', skala + 'px');
  const huelle = document.getElementById('huelle');
  huelle.style.width = w + 'px'; huelle.style.height = h + 'px';
  G = H - C.LEISTE - C.STAND_H;
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
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  bildVeraltet = true;   // auch in der Pause neu zeichnen (z. B. Topf nachfüllen unter einer Blase)
  T.init();
  if (UI.fensterOffen()) return;
  if (UI.panelOffen()) { UI.schliesseBlatt(); return; }
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
  // Das Schild „DEIN STAND" lässt sich beschriften
  if (trifftSchild(x, y, G)) { T.spiele('klick'); UI.schildBeschriften(); return; }
  const tr = treffer(x, y, G);
  if (!tr) return;
  S.lauf.chefT = 0;   // du bist am Stand: Wichtel legen einen Zahn zu
  // Sichtbare Rückmeldung: Ring an der Tippstelle, gedrücktes Feld
  S.lauf.klicks.push({ x, y, t: 0 });
  S.lauf.druck = { art: tr.art, i: tr.i ?? tr.platz, t: 0.14 };
  const vorher = S.lauf.hand.map((h) => h.art + (h.id || ''));
  if (tr.art === 'glaeser') S.tippeGlaeser();
  else if (tr.art === 'zelle') {
    // Gesperrter Topf: nur ein Hinweis. Früher öffnete sich hier der Laden -
    // beim schnellen Tippen am Tresen landete man dann ungewollt im Einkauf.
    if (S.tippeZelle(tr.i) === 'laden') {
      const p0 = C.PRODUKTE[tr.i];
      T.spiele('falsch');
      S.lauf.wackel['z' + p0.id] = 0.3;
      if (S.freiErfuellt(p0.id)) UI.toast(`${p0.name} gibt es im Laden unter Supermarkt (${S.formatGeld(p0.kosten)}).`, 'hinweis');
      else UI.toast(`Noch verdeckt. Frei ab: ${S.freiText(p0.id)}`, 'hinweis');
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
A.beiErfuellt((a) => { T.spiele('fertig'); UI.toast(`Auftrag erfüllt: ${A.text(a)}!`, 'neu'); });

T.setzeFx(S.st.ton.fx);
T.setzeMusik(S.st.ton.musik);

// ---------------------------------------------------------------------------
// Ankommen: neue Saison, Wichtel-Einnahmen, Schnee, Türchen
// ---------------------------------------------------------------------------
function ankommen(erstesMal) {
  const neueSaison = S.pruefeSaison();
  const off = S.offlineAbrechnen();
  const meldungen = [];
  if (neueSaison) meldungen.push(['Eine neue Adventszeit!', `<p>Das Haus ist wieder kahl und grau - Zeit, es erneut herzurichten.</p>${S.st.andenken ? `<p class="bonus">★ ${S.st.andenken} Andenken aus früheren Jahren</p>` : ''}`]);
  if (off && off.betrag > 0 && off.sek < C.OFFLINE_FENSTER) {
    // Kurz weg (Handy gesperrt, App gewechselt): kein Fenster, nur ein Hinweis
    UI.toast(`Die Wichtel haben weitergearbeitet: +${S.formatGeld(off.betrag)}`, 'gut');
  }
  // Länger weg: die Kiste (auch eine, die beim letzten Mal ungeöffnet blieb)
  if (S.st.kiste > 0) meldungen.push(['kiste', off && off.sek >= C.OFFLINE_FENSTER ? off.sek : 0]);
  if (Z.schnee() > 0 && !S.st.ersterSchnee) {
    S.st.ersterSchnee = true;
    meldungen.push(['Der erste Schnee!', '<p>Über Nacht ist alles weiß geworden. Im Weihnachtsmarkt gibt es jetzt Schneemänner.</p>']);
  }
  // Adventssonntage: jedes Ereignis als eigenes Fenster, in der richtigen Reihenfolge
  for (const n of S.neueAdventsereignisse()) meldungen.push(['advent', n]);
  const tueren = S.offeneTueren();
  if (tueren > 0 && !erstesMal) UI.toast(S.vorfreudeBereit() ? 'Ein Vorfreude-Päckchen wartet im Kalender!' : tueren === 1 ? 'Ein Türchen wartet im Adventskalender!' : `${tueren} Türchen warten im Kalender!`, 'spezial');
  S.speichere();
  const zeige = () => {
    const m = meldungen.shift();
    if (!m) return;
    if (m[0] === 'advent') zeigeAdvent(m[1], zeige);
    else if (m[0] === 'kiste') UI.zeigeKiste(m[1], () => setTimeout(zeige, 60));
    else UI.fenster(m[0], m[1], [{ text: 'Weiter', aktion: () => { setTimeout(zeige, 60); } }]);
  };
  zeige();
  return meldungen;
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
  const faellig = jetzt - letzteZeichnung >= BILD_ABSTAND - 2;
  if (faellig && !(steht && standGezeichnet && !bildVeraltet)) {
    try {
      c.clearRect(0, 0, C.B, H);
      const w = zeichneWelt(c, G, tSek, zeichenDt);
      zeichneTresen(c, G, tSek, w);
    } catch (e) { console.warn('Zeichnen', e); }
    zeichenDt = 0; letzteZeichnung = jetzt;
    standGezeichnet = steht; bildVeraltet = false;
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

// Neuer Tag / Schnee während die App offen ist: jede Minute nachsehen
let letzterTag = Z.tagesSchluessel();
setInterval(() => {
  const k = Z.tagesSchluessel();
  if (k !== letzterTag) { letzterTag = k; ankommen(false); }
  const neu = S.pruefeFreischaltungen();
  if (neu.length) {
    T.spiele('spezial');
    UI.toast(neu.length === 1 ? `Neu freigeschaltet: ${S.artikelName(neu[0].id)}!` : `${neu.length} neue Dinge im Laden!`, 'neu');
    S.speichere();
  }
  const ziel = ZL.pruefe();
  if (ziel) {
    T.spiele('kauf');
    UI.toast(`Ziel ${ZL.nummer() - 1} geschafft! +${ziel.lohn} Sterne`, 'neu');
  }
  UI.zielLeiste();
  const erfolge = E.pruefe();
  if (erfolge.length) {
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
    st.fassade = 'rot'; st.geld = 1284650; st.gesamt = 6500000;
    for (let n = 1; n <= Z.dezemberTag(); n++) st.kalender[n] = true;
    st.stats.bedient = 8421;
    st.erfolge = {}; for (const x of E.ERFOLGE.slice(0, art === 'wand' ? 21 : 24)) st.erfolge[x.id] = Date.now();
    st.erfolgNeu = {};
  }
  // Alle Hinweise als gelesen, damit keine Blase im Bild steht
  for (const k of ['leer', 'falsch', 'voll', 'laden', 'laden_danach', 'deko', 'deko_danach', 'gegangen', 'schwung', 'w_spuel', 'w_nachfuell', 'w_servier',
    'wichtel_weg', 'bestellen2', 'herz_ziel', 'ziele_fertig', 'sonder_schlange', 'sonder_weg', 'extra', 'gross', 'chef', 'schild', 'eilig', 'auftrag',
    'auftraege_neu', 'erfolge', 'kalender', ...Object.keys(C.HANDGRIFF).map((g) => 'griff_' + g)]) st.tipps[k] = true;
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
  if (art === 'laden') UI.oeffneLaden('markt');
  if (art === 'wand') UI.oeffneAuftraege('erfolge');
  if (art === 'karte') UI.karte(0);
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
  // Ein Bild von Hand zeichnen - im verborgenen Vorschaufenster steht
  // requestAnimationFrame still, der Screenshot zeigt sonst ein altes Bild.
  bild() { c.clearRect(0, 0, C.B, H); const w = zeichneWelt(c, G, tSek, 0); zeichneTresen(c, G, tSek, w); },
  groesse,
};
