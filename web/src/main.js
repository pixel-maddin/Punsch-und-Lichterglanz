/*
 * main.js - Verdrahtung: Canvas-Größe, Bildschleife, Tippen, Speichern,
 * Rückkehr nach einer Pause (Wichtel-Einnahmen, erster Schnee, Türchen).
 *
 * Testweg: window.__spiel (siehe unten).
 */
import * as C from './config.js?v=20260929i';
import * as S from './spiel.js?v=20260929i';
import * as Z from './zeit.js?v=20260929i';
import * as T from './ton.js?v=20260929i';
import * as UI from './ui.js?v=20260929i';
import { zeichneWelt, schlittenPos } from './szene.js?v=20260929i';
import { zeichneTresen, treffer, trifftSchild } from './tresen.js?v=20260929i';
import * as Lernen from './lernen.js?v=20260929i';
import { zeigeAdvent } from './ereignis.js?v=20260929i';
import * as A from './auftraege.js?v=20260929i';
import * as E from './erfolge.js?v=20260929i';

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
function groesse() {
  const vw = buehne.clientWidth, vh = buehne.clientHeight;
  // Unsichtbares Fenster (0 x 0): NICHT neu messen. Sonst wird die Höhe NaN,
  // das Canvas 0 hoch, drawImage wirft - und die Bildschleife stand still.
  if (!vw || !vh) return;
  let skala = vw / C.B;
  H = Math.floor(vh / skala);
  if (H < C.H_MIN) { skala = vh / C.H_MIN; H = C.H_MIN; }
  if (H > C.H_MAX) H = C.H_MAX;
  cv.width = C.B; cv.height = H;
  const w = C.B * skala, h = H * skala;
  document.documentElement.style.setProperty('--px', skala + 'px');
  const huelle = document.getElementById('huelle');
  huelle.style.width = w + 'px'; huelle.style.height = h + 'px';
  G = H - C.LEISTE - C.STAND_H;
  Lernen.layout(G, H);
  c.imageSmoothingEnabled = false;
}
window.addEventListener('resize', groesse);
// Auch wenn das Fenster erst später sichtbar wird (Vorschau, App-Wechsel)
if (window.ResizeObserver) new ResizeObserver(() => groesse()).observe(buehne);
groesse();

// ---------------------------------------------------------------------------
// Tippen
// ---------------------------------------------------------------------------
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
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
S.hooks.toast = (t, a) => UI.toast(t, a);
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
  } else if (off && off.betrag > 0) {
    const h = Math.floor(off.sek / 3600), m = Math.round((off.sek % 3600) / 60);
    const dauer = h ? `${h} Std. ${m} Min.` : `${m} Min.`;
    meldungen.push(['Die Wichtel waren fleißig', `<p>Während du ${dauer} weg warst, haben sie <b>${off.portionen}</b> Gäste bedient.</p><p class="summe">+ ${S.formatGeld(off.betrag)}</p>${off.sek >= C.OFFLINE_MAX_H * 3600 ? `<p class="klein">Länger als ${C.OFFLINE_MAX_H} Stunden arbeiten sie nicht allein.</p>` : ''}`]);
  }
  if (Z.schnee() > 0 && !S.st.ersterSchnee) {
    S.st.ersterSchnee = true;
    meldungen.push(['Der erste Schnee!', '<p>Über Nacht ist alles weiß geworden. Im Weihnachtsmarkt gibt es jetzt Schneemänner.</p>']);
  }
  // Adventssonntage: jedes Ereignis als eigenes Fenster, in der richtigen Reihenfolge
  for (const n of S.neueAdventsereignisse()) meldungen.push(['advent', n]);
  const tueren = S.offeneTueren();
  if (tueren > 0 && !erstesMal) UI.toast(tueren === 1 ? 'Ein Türchen wartet im Adventskalender!' : `${tueren} Türchen warten im Kalender!`, 'spezial');
  S.speichere();
  const zeige = () => {
    const m = meldungen.shift();
    if (!m) return;
    if (m[0] === 'advent') zeigeAdvent(m[1], zeige);
    else UI.fenster(m[0], m[1], [{ text: 'Weiter', aktion: () => { setTimeout(zeige, 60); } }]);
  };
  zeige();
  return meldungen;
}

// ---------------------------------------------------------------------------
// Bildschleife
// ---------------------------------------------------------------------------
let letzte = performance.now();
let tSek = 0;
function frame(jetzt) {
  const dt = Math.min(0.1, (jetzt - letzte) / 1000);
  letzte = jetzt;
  tSek += dt;
  // Während Laden, Kalender oder ein Fenster offen ist, steht der Stand still -
  // sonst liefen einem beim Stöbern die Gäste davon.
  const steht = UI.fensterOffen() || !!UI.panelOffen() || querFormat.matches || Lernen.pausiert();
  // Dev-Tempo in Einzelschritten, damit nichts übersprungen wird
  if (!steht) for (let i = 0; i < S.dev.tempo; i++) S.update(dt);
  // Pause-Zeichen steht an der Stelle der Herzen (sonst lag es darüber)
  const zeigePause = steht && S.st.intro && !Lernen.pausiert();
  pauseZeichen.classList.toggle('versteckt', !zeigePause);
  stimmungFeld.classList.toggle('versteckt', zeigePause);
  // Die nächste Runde ist schon bestellt, bevor gezeichnet wird: Ein Fehler
  // beim Zeichnen darf die Schleife nie anhalten.
  requestAnimationFrame(frame);
  if (!cv.height) groesse();
  try {
    c.clearRect(0, 0, C.B, H);
    const w = zeichneWelt(c, G, tSek, dt);
    zeichneTresen(c, G, tSek, w);
  } catch (e) { console.warn('Zeichnen', e); }
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

UI.verdrahte();
if (!S.st.intro) {
  UI.frageName(false, () => UI.waehleModus((modus) => {
    S.st.modus = modus;
    S.st.versatzTage = modus === 'eigen' ? Z.versatzFuerEigenenStart() : 0;
    Z.setzeVersatzTage(S.st.versatzTage + S.dev.tage);
    S.st.saison = Z.saison();
    S.speichere();
    UI.zeigeZiel(modus, () => {
      S.st.intro = true; S.st.lernen = 0; S.speichere();
      setTimeout(() => ankommen(true), 100);
    });
  }));
} else ankommen(true);
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
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
