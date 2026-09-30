/*
 * ui.js - alles DOM: Kopfzeile, Leiste, Laden, Adventskalender, Menü,
 * Einblendungen, Fenster und die Weihnachtskarte zum Teilen.
 *
 * Text steht im DOM, nicht im Canvas: Im hochskalierten 180-px-Bild
 * wäre er Matsch, und Tippziele müssen groß sein.
 */
import * as C from './config.js?v=20260930g';
import * as S from './spiel.js?v=20260930g';
import * as Z from './zeit.js?v=20260930g';
import * as T from './ton.js?v=20260930g';
import { icon, wichtelKlein, r, p, figurKlein, neueFarben, hatGlyphe } from './pixel.js?v=20260930g';
import { zeichneWelt, ortVon, funkeln } from './szene.js?v=20260930g';
import { nochmal as nochmalLernen, fuehrung, laeuft as lernenLaeuft, ueberspringen } from './lernen.js?v=20260930g';
import * as A from './auftraege.js?v=20260930g';
import * as E from './erfolge.js?v=20260930g';
import * as ZL from './ziele.js?v=20260930g';
import { zeichneWand, sockeBei, socke, W as WAND_W, H as WAND_H } from './wand.js?v=20260930g';
import { alleSymbole } from './symbole.js?v=20260930g';

const $ = (s) => document.querySelector(s);
/** Für Nutzertext in HTML: <, >, & und Anführungszeichen entschärfen. */
const esc = (s) => String(s).replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[z]));
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

let offen = null;          // 'laden' | 'kalender' | 'menue' | null
let ladenTab = 'super';
let ladenModus = 'kaufen';  // 'kaufen' | 'haus' - Einkaufen oder Mein Haus (einstellen)
let zeilen = [];           // Ladenzeilen zum Nachführen

export function panelOffen() { return offen; }

// ---------------------------------------------------------------------------
// Kopfzeile
// ---------------------------------------------------------------------------
let letzteHud = '';
export function hud() {
  const g = S.formatGeld(S.st.geld);
  const s = S.stimmung();
  const u = Z.uhrText();
  const k = S.offeneTueren();
  const sig = g + s + u + k + '|' + A.abholbar() + '|' + E.neuZahl();
  if (sig === letzteHud) return;
  letzteHud = sig;
  $('#geldZahl').textContent = g;
  $('#stimmungZahl').textContent = s;
  $('#uhr').textContent = u + ((Z.zeitVerstellt() || S.devAn()) && !S.DEMO ? ' ⚙' : '');
  const ab = A.abholbar() + E.neuZahl();
  const bA = $('#aufBadge'); bA.textContent = ab; bA.classList.toggle('versteckt', ab === 0);
  $('#btnAuftraege').classList.toggle('lockt', ab > 0);
  const b = $('#kalBadge');
  b.textContent = k; b.classList.toggle('versteckt', k === 0);
  $('#btnKalender').classList.toggle('lockt', k > 0);
}

// ---------------------------------------------------------------------------
// Startziele: eine Leiste unter der Kopfzeile (ziele.js)
// ---------------------------------------------------------------------------
let letztesZiel = '';
export function zielLeiste() {
  const z = ZL.aktuell();
  const k = z && ZL.kaufziel();
  const bereit = !!(k && k.leisten);
  const sig = z ? `${z.id}|${z.stand()}|${bereit}|${k ? k.kosten : ''}` : '';
  if (sig === letztesZiel) return;
  letztesZiel = sig;
  const b = $('#ziel');
  $('#huelle').classList.toggle('mit-ziel', !!z);
  if (!z) { b.classList.add('versteckt'); return; }
  const zahl = z.ziel > 1 ? ` <i>${z.stand()}/${z.ziel}</i>` : '';
  const nochNicht = k && !bereit ? `<small>noch ${S.formatGeld(k.kosten - S.st.geld)}</small>` : '';
  b.innerHTML = `<span class="nr">Ziel ${ZL.nummer()}/${ZL.ZIELE.length}</span><span class="was">${z.text}${zahl}</span>`
    + (bereit ? '<span class="los">Los ▸</span>' : nochNicht || `<span class="lohn">+${z.lohn} ★</span>`);
  b.classList.toggle('bereit', bereit);
  b.classList.remove('versteckt');
  // Unterkante merken: Einblendungen und Hinweisblasen rutschen darunter
  $('#huelle').style.setProperty('--ziel-unten', (b.offsetTop + b.offsetHeight) + 'px');
}

// ---------------------------------------------------------------------------
// Einblendung
// ---------------------------------------------------------------------------
let toastT = null;
const toastWarteschlange = [];
export function toast(text, art = 'normal') {
  toastWarteschlange.push([text, art]);
  if (!toastT) naechsterToast();
}
function naechsterToast() {
  const n = toastWarteschlange.shift();
  const e = $('#toast');
  if (!n) { e.classList.remove('zeigen'); toastT = null; return; }
  e.textContent = n[0];
  // Nicht über dem Kopf von Laden/Kalender/Menü und nicht über einer
  // Hinweisblase oben: dann weiter nach unten bzw. unter die Blase
  const tipp = document.getElementById('tipp');
  const tippOben = !tipp.classList.contains('versteckt') && tipp.style.top;
  e.style.top = '';
  if (tippOben) e.style.top = (tipp.offsetTop + tipp.offsetHeight + 6) + 'px';
  e.className = 'zeigen ' + n[1];
  const dauer = n[1] === 'hinweis' ? 1800 : n[1] === 'neu' ? 3600 : 2600;
  toastT = setTimeout(() => { e.classList.remove('zeigen'); toastT = setTimeout(naechsterToast, 250); }, dauer);
}

// ---------------------------------------------------------------------------
// Fenster (Modal)
// ---------------------------------------------------------------------------
export function fenster(titel, inhaltHtml, knoepfe = [{ text: 'Weiter' }]) {
  const m = $('#modal');
  m.innerHTML = '';
  const box = el('div', 'box');
  box.appendChild(el('h2', null, titel));
  const inhalt = el('div', 'inhalt', inhaltHtml);
  box.appendChild(inhalt);
  const reihe = el('div', 'knoepfe');
  for (const k of knoepfe) {
    const b = el('button', 'k' + (k.neben ? ' k--neben' : ''), k.text);
    b.onclick = () => { T.spiele('klick'); if (k.aktion && k.aktion(box) === false) return; schliesseFenster(); };
    reihe.appendChild(b);
  }
  box.appendChild(reihe);
  m.appendChild(box);
  m.classList.remove('versteckt');
  return box;
}
export function schliesseFenster() { $('#modal').classList.add('versteckt'); }
export function fensterOffen() { return !$('#modal').classList.contains('versteckt'); }

// ---------------------------------------------------------------------------
// Blatt (Laden, Kalender, Menü)
// ---------------------------------------------------------------------------
function oeffneBlatt(art, titel) {
  offen = art;
  $('#blattTitel').textContent = titel;
  $('#blatt').classList.remove('versteckt');
  $('#blatt').dataset.art = art;
  $('#huelle').classList.add('blatt-offen');   // Einblendungen rutschen dann nach unten
}
export function schliesseBlatt() {
  offen = null;
  $('#blatt').classList.add('versteckt');
  $('#huelle').classList.remove('blatt-offen');
  zeilen = [];
}

// ---------------------------------------------------------------------------
// Laden
// ---------------------------------------------------------------------------
/**
 * Der Laden hat zwei Bereiche: EINKAUFEN (nur kaufen, vier Reiter) und
 * MEIN HAUS (alles, was man hat, einstellen: Lichter aus/weiß/bunt, Deko
 * an/aus, Anstrich, Zaun, Geschenke). Vorher standen Kauf- und
 * Schaltknöpfe gemischt in denselben Zeilen - bei 70 Artikeln unübersichtlich.
 */
export function oeffneLaden(tab, zeigeId, modus) {
  // Einführung „erstes Getränk / erste Deko": gleich zur richtigen Zeile
  const f = !tab && !zeigeId && !modus && fuehrung();
  if (f) { tab = f.tab; zeigeId = f.id; }
  if (tab) ladenTab = tab;
  if (modus) ladenModus = modus; else if (tab || zeigeId) ladenModus = 'kaufen';
  oeffneBlatt('laden', ladenModus === 'haus' ? 'Mein Haus' : 'Einkaufen');
  const kopf = $('#blattTabs');
  kopf.innerHTML = '';
  const neu = S.st.neu || {};
  const modi = el('div', 'modi');
  for (const [id, name] of [['kaufen', 'Einkaufen'], ['haus', 'Mein Haus']]) {
    const b = el('button', 'modus-k' + (id === ladenModus ? ' aktiv' : '') + (id === 'haus' && geschenke().some((d) => neu[d.id]) ? ' neu' : ''), name);
    b.onclick = () => { T.spiele('klick'); oeffneLaden(null, null, id); };
    modi.appendChild(b);
  }
  kopf.appendChild(modi);
  if (ladenModus === 'kaufen') {
    const reiter = el('div', 'reiter');
    for (const tb of C.TABS) {
      const hatNeu = tb.id !== ladenTab && C.ARTIKEL.some((a) => a.tab === tb.id && neu[a.id]);
      const b = el('button', 'tab' + (tb.id === ladenTab ? ' aktiv' : '') + (hatNeu ? ' neu' : ''), tb.name);
      b.onclick = () => { T.spiele('klick'); ladenTab = tb.id; oeffneLaden(null, null, 'kaufen'); };
      reiter.appendChild(b);
    }
    kopf.appendChild(reiter);
  }
  kopf.classList.remove('versteckt');
  $('#blatt').dataset.modus = ladenModus;
  if (ladenModus === 'haus') { zeilen = []; baueHaus(); return; }
  baueLaden();
  // Vom Regal aus geöffnet: die Zeile des Getränks zeigen und aufleuchten lassen
  const z = zeigeId && zeilen.find((x) => x.a.id === zeigeId);
  if (z) {
    z.z.scrollIntoView({ block: 'center' });
    z.z.classList.add('blitz'); setTimeout(() => z.z.classList.remove('blitz'), 900);
    if (f) { z.z.classList.add('fuehrung'); z.txt.appendChild(el('span', 'fuehr-pfeil', f.leisten === false ? 'Dein nächstes Ziel - noch etwas sparen' : 'Tippe hier auf Kaufen ▸')); }
  }
}

function baueLaden() {
  const liste = $('#blattInhalt');
  liste.innerHTML = '';
  liste.scrollTop = 0;
  zeilen = [];
  // Innerhalb jeder Gruppe in der Reihenfolge, in der die Dinge frei werden
  const artikel = sortiereNachFreischaltung(C.ARTIKEL.filter((a) => a.tab === ladenTab));
  let gruppe = null;
  if (ladenTab === 'super') {
    liste.appendChild(el('div', 'zeile besessen', `<canvas width="16" height="16" class="ico"></canvas><div class="txt"><b>Sternenpunsch</b><span>Den gibt es von Anfang an. Gäste zahlen 10 Sterne.</span></div><div class="knopfplatz"><span class="haken">✓</span></div>`));
    zeichneIcon(liste.lastChild.querySelector('canvas'), { id: 'gluehwein', produkt: true });
  }
  const neu = S.st.neu || {};
  for (const a of artikel) {
    if (a.gruppe !== gruppe) { gruppe = a.gruppe; liste.appendChild(el('div', 'gruppe', gruppe)); }
    const versteckt = S.status(a).versteckt;
    const z = el('div', 'zeile' + (versteckt ? ' verdeckt' : '') + (neu[a.id] ? ' neu' : ''));
    const cv = el('canvas', 'ico'); cv.width = 16; cv.height = 16;
    zeichneIcon(cv, a);
    if (versteckt) {
      // Nur ein Schattenriss: Was es ist, verrät der Laden erst später
      const c = cv.getContext('2d');
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = '#8a7a66'; c.fillRect(0, 0, 16, 16);
    }
    z.appendChild(cv);
    const txt = el('div', 'txt');
    txt.innerHTML = versteckt
      ? `<b>???</b><span>${S.bedingungText(a)}</span>`
      : `<b>${a.name}${neu[a.id] ? ' <i class="neuTag">NEU</i>' : ''}</b><span>${a.text}</span><em class="bonus">${bonusText(a)}</em>`;
    z.appendChild(txt);
    delete neu[a.id];   // gesehen
    const platz = el('div', 'knopfplatz');
    const knopf = el('button', 'k k--kauf');
    knopf.onclick = () => {
      if (S.status(a).fertig) return;
      if (S.kaufe(a.id)) {
        z.classList.add('blitz'); setTimeout(() => z.classList.remove('blitz'), 500);
        const hinweis = (a.id in C.LICHTER || S.istDeko(a) || a.wahl) && !(S.st.tipps && S.st.tipps.meinHaus);
        toast(hinweis ? `${a.name} gekauft! Ein- und ausschalten und Farbe wählen: unter „Mein Haus".` : `${a.name} gekauft!`, 'gut');
        if (hinweis) { S.st.tipps = S.st.tipps || {}; S.st.tipps.meinHaus = true; }
        zeigeKauf(a.id);
      }
      aktualisiereLaden();
    };
    platz.appendChild(knopf);
    z.appendChild(platz);
    liste.appendChild(z);
    zeilen.push({ a, z, knopf, txt, versteckt });
  }
  aktualisiereLaden();
}

// ---------------------------------------------------------------------------
// Mein Haus: alles, was man hat, einstellen
// ---------------------------------------------------------------------------
const OPTIONEN = {
  aus:   { text: 'Aus',   punkt: 'p-aus' },
  an:    { text: 'An',    punkt: 'p-an' },
  weiss: { text: 'Weiß',  punkt: 'p-weiss' },
  bunt:  { text: 'Bunt',  punkt: 'p-bunt' },
};
/**
 * Auswahl aus mehreren Punkten (Segmentschalter): Jede Möglichkeit ist ein
 * kleiner Knopf mit farbigem Punkt und Wort darunter, die gewählte ist gold
 * umrandet. So sieht man ALLE Möglichkeiten auf einen Blick, statt raten
 * zu müssen, was ein einzelner Umschaltknopf als Nächstes tut.
 */
function punktWahl(werte, aktuell, setze, punktStil) {
  const reihe = el('div', 'punktwahl');
  for (const v of werte) {
    const o = OPTIONEN[v] || { text: v.text, punkt: '' };
    const wert = typeof v === 'string' ? v : v.wert;
    const b = el('button', 'pw' + (wert === aktuell ? ' aktiv' : ''), `<i class="punkt ${o.punkt}"></i><span>${o.text}</span>`);
    if (punktStil && punktStil[wert]) b.querySelector('.punkt').style.background = punktStil[wert];
    b.onclick = () => { setze(wert); baueHaus(true); };
    reihe.appendChild(b);
  }
  return reihe;
}
function hausZeile(liste, a, name, text, wahl) {
  const z = el('div', 'zeile haus');
  const cv = el('canvas', 'ico'); cv.width = 16; cv.height = 16;
  zeichneIcon(cv, a);
  z.appendChild(cv);
  z.appendChild(el('div', 'txt', `<b>${name}</b>${text ? `<span>${text}</span>` : ''}`));
  z.appendChild(wahl);
  liste.appendChild(z);
}
/** Was man geschenkt bekommen hat: Türchen im Kalender und schwere Aufträge. */
function geschenke() {
  return [...Object.values(C.KALENDER_DEKO), ...C.AUFTRAG_DEKO].filter((d) => S.st.kalDeko[d.id]);
}
function baueHaus(behalteScroll) {
  const liste = $('#blattInhalt');
  const pos = liste.scrollTop;
  liste.innerHTML = '';
  const neu = S.st.neu || {};
  const hat = (a) => S.stufe(a.id) > 0;
  let leer = true;
  const gruppe = (titel) => { liste.appendChild(el('div', 'gruppe', titel)); leer = false; };

  // Lichter: Aus / Weiß / Bunt (oder Aus / An ohne Farbwahl)
  const lichter = C.ARTIKEL.filter((a) => a.id in C.LICHTER && hat(a));
  if (lichter.length) {
    gruppe('Lichter');
    for (const a of lichter) {
      const farbe = S.lichtKette(a.id);
      const werte = farbe ? ['aus', 'weiss', 'bunt'] : ['aus', 'an'];
      const noch = a.id in C.LICHT_AB_STUFE && !farbe ? 'Lichter kommen mit Stufe 2.' : a.id === 'festbeleuchtung' ? 'Immer warmweiß.' : '';
      hausZeile(liste, a, a.name, noch, punktWahl(werte, S.lichtModus(a.id), (v) => S.setzeLicht(a.id, v)));
    }
  }
  // Anstrich
  const anstriche = C.ARTIKEL.filter((a) => a.wahl === 'fassade' && hat(a));
  if (anstriche.length) {
    gruppe('Anstrich');
    const werte = [{ wert: 'trist', text: 'Alt' }, ...anstriche.map((a) => ({ wert: a.fassade, text: a.name.split(' ')[0] }))];
    const stil = Object.fromEntries(werte.map((v) => [v.wert, C.FASSADEN[v.wert].wand]));
    liste.appendChild(punktWahl(werte, S.st.fassade, (v) => S.setzeFassade(v), stil));
  }
  // Zaun
  if (S.stufe('zaun_braun') > 0) {
    gruppe('Zaun');
    hausZeile(liste, S.ARTIKEL_MAP.zaun, 'Farbe des Zauns', '', punktWahl([{ wert: 'hell', text: 'Hell' }, { wert: 'braun', text: 'Braun' }],
      S.st.zaunfarbe === 'braun' ? 'braun' : 'hell', (v) => S.setzeZaunfarbe(v), { hell: '#e2d5bb', braun: '#7a5234' }));
  }
  // Deko nach Ort
  for (const ort of ['Am Haus', 'Im Garten', 'Am Stand']) {
    const deko = C.ARTIKEL.filter((a) => S.istDeko(a) && !(a.id in C.LICHTER) && a.gruppe === ort && hat(a));
    if (!deko.length) continue;
    gruppe(ort);
    for (const a of deko) hausZeile(liste, a, a.name, '', punktWahl(['aus', 'an'], S.zeigt(a.id) ? 'an' : 'aus', (v) => S.setzeDeko(a.id, v === 'an')));
  }
  // Geschenkt
  const gesch = geschenke();
  if (gesch.length) {
    gruppe('Geschenkt');
    for (const d of gesch) {
      const herkunft = d.id.startsWith('kal_') ? 'Aus dem Adventskalender' : 'Für einen schweren Auftrag';
      hausZeile(liste, d, d.name + (neu[d.id] ? ' <i class="neuTag">NEU</i>' : ''), herkunft,
        punktWahl(['aus', 'an'], S.zeigt(d.id) ? 'an' : 'aus', (v) => S.setzeDeko(d.id, v === 'an')));
      delete neu[d.id];
    }
  }
  if (leer) liste.appendChild(el('p', 'hinweis', 'Hier stellst du später alles ein, was du gekauft hast: Lichter an, aus, weiß oder bunt, Deko ein- und ausblenden, den Anstrich wählen. Noch gibt es nichts - schau unter „Einkaufen“.'));
  if (behalteScroll) liste.scrollTop = pos;
  $('#blattGeld').textContent = S.formatGeld(S.st.geld);
}

function freiSchluessel(a) {
  const f = C.FREI[a.id] || {};
  let k = f.advent ? 10000 + f.advent : f.herzen ? f.herzen : f.gesamt ? f.gesamt / 100 : 0;
  if (a.schnee && !f.advent) k = Math.max(k, 10000.5 - 1);        // Schnee kommt am 1.12.
  if (a.braucht) k = Math.max(k, freiSchluessel(S.ARTIKEL_MAP[a.braucht] || { id: a.braucht }) + 0.1);
  return k;
}
function sortiereNachFreischaltung(liste) {
  const gruppen = [...new Set(liste.map((a) => a.gruppe))];
  const kosten = (a) => (Array.isArray(a.kosten) ? a.kosten[0] : a.kosten);
  const sortiert = liste.slice().sort((a, b) => gruppen.indexOf(a.gruppe) - gruppen.indexOf(b.gruppe)
    || freiSchluessel(a) - freiSchluessel(b) || kosten(a) - kosten(b));
  // „… in Bunt" direkt unter die warmweiße Kette, zu der es gehört
  for (const bunt of sortiert.filter((a) => a.wahl === 'lichtfarbe')) {
    const i = sortiert.indexOf(bunt), j = sortiert.findIndex((a) => a.id === bunt.braucht);
    if (j < 0 || sortiert[j].gruppe !== bunt.gruppe) continue;
    sortiert.splice(i, 1);
    sortiert.splice(sortiert.findIndex((a) => a.id === bunt.braucht) + 1, 0, bunt);
  }
  return sortiert;
}

function bonusText(a) {
  const teile = [];
  if (a.stimmung) teile.push(`♥ +${a.stimmung}${Array.isArray(a.kosten) ? ' je Stufe' : ''}`);
  if (a.bonus) {
    const N = { preis: 'Preise', trinkgeld: 'Trinkgeld', geduld: 'Geduld', gaeste: 'Gäste' };
    for (const k in a.bonus) teile.push(`+${Math.round(a.bonus[k] * 100)} % ${N[k]}`);
  }
  if (a.id === 'topf') teile.push(`Portionen: ${C.TOPF_PORTIONEN.join(' → ')}`);
  if (a.id === 'servier') teile.push(`alle ${C.SERVIER_TAKT.slice(1).map((x) => String(x).replace('.', ',')).join(' → ')} s`);
  if (a.id === 'nachfuell') teile.push(`nach ${C.NACHFUELL_ZEIT.slice(1).map((x) => String(x).replace('.', ',')).join(' → ')} s`);
  // Luxus: kaufbar, aber fürs „schönste Haus" nicht nötig
  if (a.luxus) teile.push('✦ Extra für Profis');
  if (a.luxusAb) teile.push(`✦ Stufe ${a.luxusAb}: Extra für Profis`);
  return teile.join(' · ');
}

export function aktualisiereLaden() {
  if (offen !== 'laden') return;
  // Wurde gerade etwas freigeschaltet? Dann die Liste neu bauen
  if (zeilen.some((x) => x.versteckt !== S.status(x.a).versteckt)) {
    const pos = $('#blattInhalt').scrollTop;
    baueLaden();
    $('#blattInhalt').scrollTop = pos;
    return;
  }
  for (const { a, z, knopf } of zeilen) {
    const s = S.status(a);
    z.classList.toggle('besessen', s.fertig);
    z.classList.toggle('gesperrt', !!s.grund);
    let html, an = true, cls = 'k k--kauf';
    // Gekauftes zeigt nur noch den Haken - eingestellt wird unter „Mein Haus"
    if (s.fertig) { html = '<span class="haken">✓</span>'; an = false; cls = 'k k--fertig'; } else if (s.versteckt) { html = '<span class="schloss">🔒</span>'; an = false; cls = 'k k--zu'; }
    else if (s.grund) { html = `🔒`; an = false; cls = 'k k--zu'; }
    else {
      const stufe = s.max > 1 ? `<small>Stufe ${s.stufe + 1}/${s.max}</small>` : '';
      html = `${stufe}${S.formatGeld(s.kosten)}`;
      an = s.leisten;
    }
    if (knopf.innerHTML !== html) knopf.innerHTML = html;
    knopf.className = cls;
    knopf.disabled = !an;
    const grund = z.querySelector('.grund');
    if (s.grund && !grund) z.querySelector('.txt').appendChild(el('i', 'grund', s.grund));
    else if (!s.grund && grund) grund.remove();
  }
  $('#blattGeld').textContent = S.formatGeld(S.st.geld);
}

/**
 * Nach dem Kauf: Laden kurz ausblenden und das Gekaufte am Haus funkeln
 * lassen. Der Kauf ist der wichtigste Belohnungsmoment - und der Laden
 * verdeckt genau das, was man gerade gekauft hat.
 */
let kaufZeigenT = null;
function zeigeKauf(id) {
  const ort = ortVon(id);
  if (!ort) return;
  funkeln(ort.x, ort.y);
  T.spiele('spezial');
  const b = $('#blatt');
  b.classList.add('kurz-weg');
  clearTimeout(kaufZeigenT);
  kaufZeigenT = setTimeout(() => b.classList.remove('kurz-weg'), 1700);
}

/** Roter Punkt mit Zahl an der Laden-Taste: so viele Dinge sind neu. */
export function neuMarke() {
  const n = Object.keys(S.st.neu || {}).length;
  const b = $('#ladenBadge');
  b.classList.toggle('versteckt', n === 0);
  b.textContent = n > 9 ? '9+' : n;   // zweistellig sprengte den Punkt
  $('#btnLaden').classList.toggle('lockt', n > 0);
}

// ---------------------------------------------------------------------------
// Symbole im Laden (16 x 16, aus denselben Bausteinen wie die Welt)
// ---------------------------------------------------------------------------
function zeichneIcon(cv, a) {
  const c = cv.getContext('2d');
  c.clearRect(0, 0, 16, 16);
  const id = a.id;
  if (a.produkt || C.PRODUKT[id]) { icon(c, id, 3, 3, 0); return; }
  if (a.tab === 'wichtel') {
    // Wichtel plus das, was er in der Hand hat - zusammen mittig im Feld
    wichtelKlein(c, 6, 14, 0);
    if (id === 'kasse') r(c, 9, 9, 4, 3, '#e8c030');
    if (id === 'servier') { r(c, 8, 8, 5, 1, '#c8c8d0'); r(c, 9, 5, 3, 3, '#8a1830'); }
    if (id === 'nachfuell') r(c, 8, 8, 5, 5, '#5a5a64');
    if (id === 'spuel') r(c, 8, 8, 4, 5, '#e8e4dc');
    if (id === 'crepe_w') icon(c, 'crepe', 5, 6, 0);
    return;
  }
  if (a.wahl === 'fassade') {
    const F = C.FASSADEN[a.fassade];
    r(c, 2, 7, 12, 8, F.wand); r(c, 1, 6, 14, 1, F.dach);
    for (let i = 0; i < 5; i++) r(c, 2 + i, 6 - i, 12 - i * 2, 1, F.dach);
    r(c, 7, 10, 3, 5, F.tuer); r(c, 3, 9, 3, 3, F.rahmen); r(c, 11, 9, 3, 3, F.rahmen);
    return;
  }
  const bunt = ['#ff4a4a', '#5aff6a', '#4a8aff', '#ffd040', '#ff6adf'];
  switch (id) {
    case 'tanne': case 'tanne_lichter': case 'tanne_kugeln': case 'tanne_stern':
      for (let i = 0; i < 11; i++) r(c, 8 - Math.floor(i / 2), 3 + i, Math.floor(i / 2) * 2 + 1, 1, '#2a5a32');
      r(c, 7, 14, 2, 2, '#5a3a22');
      if (id === 'tanne_lichter') [[7, 6], [5, 9], [10, 10], [8, 12], [4, 13]].forEach(([x, y], i) => p(c, x, y, bunt[i]));
      if (id === 'tanne_kugeln') [[6, 8], [9, 11], [5, 12], [10, 7]].forEach(([x, y], i) => r(c, x, y, 2, 2, i % 2 ? '#e8c030' : '#d83a3a'));
      if (id === 'tanne_stern') { r(c, 7, 1, 3, 3, '#ffe060'); p(c, 8, 0, '#ffe060'); }
      return;
    case 'schneemann': case 'schneefrau': case 'schneekind':
      figurKlein(c, { typ: 'schneemann', farben: neueFarben('erwachsen'), phase: 0, laeuft: false }, 7, 15, 0);
      if (id === 'schneefrau') r(c, 5, 5, 5, 1, '#e86aa0');
      if (id === 'schneekind') r(c, 5, 1, 5, 2, '#3a8ad8');
      return;
    case 'lichter_dach': case 'lichter_zaun': case 'lichter_bunt': case 'bunt_fenster': case 'bunt_zaun': case 'bunt_schornstein': case 'bunt_tanne': case 'bunt_baum': case 'bunt_bogen': case 'bunt_stand': case 'bunt_kranz': case 'lichter_fenster': case 'standlicht': case 'eiszapfen':
      for (let x = 0; x < 16; x++) p(c, x, 5 + Math.round(Math.sin(x / 15 * Math.PI) * 3), '#3a3a2a');
      for (let x = 1; x < 16; x += 3) {
        const y = 6 + Math.round(Math.sin(x / 15 * Math.PI) * 3);
        const f = id === 'eiszapfen' ? '#dff4ff' : (id === 'lichter_bunt' || id.startsWith('bunt_')) ? bunt[x % 5] : '#ffd98a';
        r(c, x, y, 2, id === 'eiszapfen' ? 4 : 2, f);
      }
      return;
    case 'zaun_girlande':
      for (let x = 1; x < 16; x += 4) r(c, x, 5, 2, 10, '#e2d5bb');
      for (let x = 0; x < 16; x++) { const b = Math.round(Math.sin((x % 8) / 8 * Math.PI) * 2); p(c, x, 6 + b, '#2f6a2a'); p(c, x, 7 + b, '#245224'); }
      r(c, 3, 5, 3, 2, '#d83a3a'); r(c, 11, 5, 3, 2, '#d83a3a');
      return;
    case 'schornstein':
      r(c, 4, 2, 8, 14, '#8a4a3a'); r(c, 3, 1, 10, 2, '#5a3a32');
      r(c, 3, 5, 10, 2, '#2f6a2a'); r(c, 3, 11, 10, 2, '#2f6a2a'); r(c, 7, 7, 3, 2, '#d83a3a');
      p(c, 4, 5, '#ffd98a'); p(c, 8, 6, '#ffd98a'); p(c, 11, 5, '#ffd98a'); p(c, 5, 12, '#ffd98a'); p(c, 10, 11, '#ffd98a');
      return;
    case 'festbeleuchtung':
      for (let i = 0; i < 7; i++) r(c, 1 + i, 8 - i, 14 - i * 2, 1, '#5a4a44');
      r(c, 2, 9, 12, 6, '#c9bca6');
      for (let i = 0; i < 7; i += 2) for (let x = 2 + i; x < 14 - i; x += 2) p(c, x, 8 - i, '#fff2cc');
      for (let x = 1; x < 16; x += 2) p(c, x, 9, '#fff2cc');
      return;
    case 'tuerbogenkranz':
      for (let a2 = 0; a2 < 28; a2++) { const w = a2 / 28 * Math.PI * 2; r(c, 7 + Math.cos(w) * 6, 7 + Math.sin(w) * 6, 2, 2, a2 % 3 ? '#2f6a2a' : '#3f8a3a'); }
      r(c, 6, 13, 4, 2, '#d83a3a'); p(c, 5, 15, '#d83a3a'); p(c, 10, 15, '#d83a3a');
      [[2, 5], [12, 5], [3, 11], [12, 10], [7, 1]].forEach(([x, y]) => p(c, x, y, '#ffd98a'));
      return;
    case 'stand':   // Marktstand mit rot-weißem Dach
      for (let x = 1; x < 15; x += 2) r(c, x, 3, 2, 3, x % 4 === 1 ? '#c83030' : '#f4f0e8');
      r(c, 1, 6, 14, 1, '#8a2020'); r(c, 2, 7, 1, 7, '#7a5230'); r(c, 13, 7, 1, 7, '#7a5230');
      r(c, 1, 10, 14, 5, '#8a5a32'); r(c, 1, 10, 14, 1, '#a8703a'); r(c, 7, 0, 2, 2, '#ffd040');
      return;
    case 'strassenlaterne':
      r(c, 7, 6, 1, 9, '#2e2c34'); r(c, 6, 14, 3, 1, '#2e2c34');
      r(c, 5, 2, 5, 5, '#2e2c34'); r(c, 6, 3, 3, 3, '#ffd88a'); r(c, 6, 1, 3, 1, '#2e2c34'); p(c, 7, 0, '#c8a040');
      return;
    case 'kamin':
      r(c, 2, 4, 12, 11, '#8a4a3a'); r(c, 4, 7, 8, 8, '#2a1a14'); r(c, 6, 11, 4, 3, '#ff8a20'); p(c, 7, 9, '#ffd040'); p(c, 8, 10, '#ffd040'); r(c, 1, 3, 14, 2, '#6a3428');
      return;
    case 'kranz':
      for (let a2 = 0; a2 < 20; a2++) { const w = a2 / 20 * Math.PI * 2; r(c, 7 + Math.cos(w) * 5, 7 + Math.sin(w) * 5, 2, 2, '#2f6a2a'); }
      r(c, 6, 12, 4, 3, '#d83a3a');
      return;
    case 'zuckerstangen': for (let y = 3; y < 16; y++) r(c, 7, y, 3, 1, y % 3 ? '#f4f4f4' : '#d83a3a'); r(c, 4, 2, 5, 2, '#d83a3a'); p(c, 4, 4, '#d83a3a'); return;
    case 'heizpilz': r(c, 7, 4, 2, 11, '#6a6a72'); r(c, 3, 2, 10, 2, '#8a8a92'); r(c, 6, 4, 4, 2, '#ff7a30'); r(c, 5, 14, 6, 1, '#6a6a72'); return;
    case 'musik': r(c, 2, 5, 12, 9, '#3a3a44'); r(c, 4, 8, 3, 3, '#8a8a9a'); r(c, 9, 8, 3, 3, '#8a8a9a'); r(c, 12, 1, 1, 5, '#fff'); r(c, 10, 5, 2, 2, '#fff'); return;
    case 'girlande': for (let x = 0; x < 16; x++) { p(c, x, 6 + (Math.sin(x * 0.8) > 0 ? 1 : 0), '#2f6a2a'); p(c, x, 7 + (Math.sin(x * 0.8) > 0 ? 1 : 0), '#245224'); } r(c, 3, 9, 2, 2, '#d83a3a'); r(c, 11, 9, 2, 2, '#d83a3a'); return;
    case 'schild': r(c, 1, 4, 14, 8, '#6a4222'); r(c, 2, 5, 12, 6, '#f0e0b0'); r(c, 4, 7, 8, 2, '#b02020'); return;
    case 'baenke': r(c, 1, 8, 14, 2, '#a8703a'); r(c, 2, 10, 1, 4, '#6a4222'); r(c, 13, 10, 1, 4, '#6a4222'); r(c, 3, 12, 10, 1, '#a8703a'); return;
    case 'tresen': case 'topf': case 'tablett':
      if (id === 'topf') { r(c, 2, 5, 12, 9, '#5a5a64'); r(c, 1, 4, 14, 2, '#7a7a86'); r(c, 3, 5, 10, 1, '#8a1830'); }
      else if (id === 'tablett') { r(c, 1, 10, 14, 2, '#c8c8d0'); icon(c, 'gluehwein', 1, 1, 0); icon(c, 'schoko', 7, 1, 0); }
      else { r(c, 0, 8, 16, 7, '#8a5a32'); r(c, 0, 7, 16, 2, '#a8703a'); r(c, 2, 2, 12, 1, '#c83030'); }
      return;
    case 'holz': for (let i = 0; i < 6; i++) { const x = 2 + (i % 3) * 4, y = 11 - Math.floor(i / 3) * 4; r(c, x, y, 4, 4, '#8a5a32'); p(c, x + 1, y + 1, '#c8a070'); } return;
    case 'tuer': r(c, 4, 1, 8, 15, '#7a4424'); r(c, 6, 3, 4, 3, '#e8a048'); p(c, 10, 9, '#e8c030'); return;
    case 'zaun': case 'zaun_braun': { const zf = id === 'zaun' ? ['#e2d5bb', '#bba98a'] : ['#7a5234', '#5a3a22']; for (let x = 1; x < 16; x += 4) r(c, x, 5, 2, 10, zf[0]); r(c, 0, 8, 16, 1, zf[1]); r(c, 0, 12, 16, 1, zf[1]); return; }
    case 'laternen': r(c, 7, 5, 2, 11, '#2a2a30'); r(c, 5, 1, 6, 5, '#2a2a30'); r(c, 6, 2, 4, 3, '#ffd88a'); return;
    case 'nussknacker': r(c, 5, 6, 6, 6, '#c82828'); r(c, 6, 3, 4, 3, '#f2c9a0'); r(c, 5, 0, 6, 3, '#1a1a1a'); r(c, 6, 12, 1, 4, '#1a1a1a'); r(c, 9, 12, 1, 4, '#1a1a1a'); return;
    case 'fensterstern': r(c, 6, 6, 4, 4, '#ffe060'); r(c, 7, 2, 2, 12, '#ffe060'); r(c, 2, 7, 12, 2, '#ffe060'); return;
    case 'schwibbogen': for (let i = 0; i < 7; i++) { const x = 1 + i * 2, h = Math.round(Math.sin(i / 6 * Math.PI) * 5); r(c, x, 12 - h, 1, 2, '#f4f0e0'); p(c, x, 11 - h, '#ffd070'); } r(c, 0, 14, 16, 2, '#6a4a2a'); return;
    case 'rentier_licht': case 'schlitten':
      if (id === 'schlitten') { r(c, 1, 9, 13, 4, '#c82828'); r(c, 0, 14, 15, 1, '#c8a040'); r(c, 3, 5, 4, 4, '#3a8ad8'); r(c, 8, 4, 4, 5, '#3aa84a'); }
      else figurKlein(c, { typ: 'rentier', farben: {}, phase: 0, laeuft: false }, 6, 15, 0);
      return;
    case 'lichterbogen': for (let i = 0; i <= 12; i++) { const w = Math.PI * i / 12; p(c, 8 - Math.cos(w) * 6, 14 - Math.sin(w) * 11, bunt[i % 5]); } return;
    case 'dach_nikolaus': figurKlein(c, { typ: 'weihnachtsmann', farben: {}, phase: 0, laeuft: false }, 9, 16, 0); return;
    case 'lichtershow': [[3, 3], [11, 5], [6, 10], [13, 12], [2, 13]].forEach(([x, y], i) => { r(c, x - 1, y, 3, 1, bunt[i]); r(c, x, y - 1, 1, 3, bunt[i]); }); return;
    // Geschenkte Deko (Kalender, Aufträge)
    case 'kal_kranz':
      r(c, 2, 10, 12, 3, '#2f6a2a'); r(c, 1, 11, 14, 1, '#245224');
      for (const x of [3, 6, 9, 12]) { r(c, x, 6, 2, 4, '#f0e0c0'); p(c, x, 5, '#ffd040'); }
      p(c, 5, 11, '#d83a3a'); p(c, 10, 11, '#d83a3a');
      return;
    case 'kal_stiefel': r(c, 5, 2, 5, 9, '#c82828'); r(c, 5, 10, 9, 4, '#c82828'); r(c, 4, 1, 7, 2, '#f4f4f4'); r(c, 6, 0, 2, 2, '#e8c030'); r(c, 9, 0, 2, 2, '#3a8ad8'); return;
    case 'kal_mistel': r(c, 7, 0, 1, 5, '#8a6a3a'); for (const [x, y] of [[4, 6], [10, 6], [5, 9], [9, 9]]) r(c, x, y, 3, 2, '#5a9a4a'); r(c, 7, 7, 2, 2, '#f4f4e8'); r(c, 6, 5, 4, 1, '#d83a3a'); return;
    case 'kal_vogel': r(c, 7, 9, 2, 7, '#6a4222'); r(c, 3, 5, 10, 5, '#a8703a'); for (let i = 0; i < 4; i++) r(c, 2 + i, 4 - i, 12 - i * 2, 1, '#c83030'); r(c, 7, 6, 2, 2, '#2a1a10'); r(c, 11, 3, 3, 2, '#d8502a'); return;
    case 'kal_goldstern': r(c, 6, 6, 4, 4, '#ffd040'); r(c, 7, 1, 2, 14, '#ffd040'); r(c, 1, 7, 14, 2, '#ffd040'); p(c, 4, 4, '#fff6c8'); p(c, 11, 4, '#fff6c8'); p(c, 4, 11, '#fff6c8'); p(c, 11, 11, '#fff6c8'); return;
    case 'auf_lebkuchenmann': icon(c, 'lebkuchen', 3, 3, 0); return;
    case 'auf_rodel': r(c, 2, 8, 12, 2, '#a8703a'); r(c, 3, 10, 1, 3, '#6a4222'); r(c, 12, 10, 1, 3, '#6a4222'); r(c, 1, 13, 14, 1, '#8a8a92'); r(c, 14, 11, 1, 2, '#8a8a92'); return;
    case 'auf_engel': r(c, 6, 5, 4, 9, '#f4f0e0'); r(c, 6, 2, 4, 3, '#f2c9a0'); r(c, 6, 0, 4, 1, '#ffd040'); r(c, 2, 5, 4, 5, '#dce8f4'); r(c, 10, 5, 4, 5, '#dce8f4'); return;
    default:
      r(c, 3, 6, 10, 9, '#d83a3a'); r(c, 7, 6, 2, 9, '#e8c030'); r(c, 3, 9, 10, 2, '#e8c030'); r(c, 5, 3, 3, 3, '#e8c030'); r(c, 9, 3, 3, 3, '#e8c030');
  }
}

// ---------------------------------------------------------------------------
// Erfolgswand: 24 Socken an einer Holzwand, der Raum wird mit jeder
// weihnachtlicher (Bild in wand.js, Erfolge in erfolge.js)
// ---------------------------------------------------------------------------
function baueErfolge(liste) {
  const cv = el('canvas', 'wand');
  cv.width = WAND_W; cv.height = WAND_H;
  liste.appendChild(cv);
  const n = E.anzahl();
  const glitzer = { ...E.neu() };   // funkelt, solange die Wand offen ist
  E.gesehen();
  letzteHud = '';
  const naechste = E.STUFEN.find(([ab]) => ab > n);
  liste.appendChild(el('p', 'wand-zeile', `<b>${n} von 24 Socken</b> · Tippe auf eine Socke.`));
  liste.appendChild(el('p', 'klein', naechste ? `Bei ${naechste[0]} Socken kommt dazu: ${naechste[1]}.` : 'Alles geschafft - frohe Weihnachten!'));
  const c = cv.getContext('2d');
  const idx = E.ERFOLGE.map((x) => x.id);
  const hat = (i) => E.erreicht(idx[i]);
  const t0 = performance.now();
  const male = () => {
    if (!cv.isConnected || offen !== 'auftraege') return;
    zeichneWand(c, n, hat, (performance.now() - t0) / 1000, (i) => glitzer[idx[i]]);
    requestAnimationFrame(male);
  };
  male();
  cv.onclick = (ev) => {
    const b = cv.getBoundingClientRect();
    const i = sockeBei((ev.clientX - b.left) * WAND_W / b.width, (ev.clientY - b.top) * WAND_H / b.height);
    if (i < 0) return;
    T.spiele('klick');
    zeigeErfolg(i);
  };
}

function zeigeErfolg(i) {
  const x = E.ERFOLGE[i];
  const ok = E.erreicht(x.id);
  const st = E.stand(x);
  const wann = ok ? new Date(S.st.erfolge[x.id]).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) : '';
  const box = fenster(ok ? x.name : 'Noch verborgen',
    `<canvas class="socke-gross" width="10" height="12"></canvas>
     <p>${x.text}</p>
     ${ok ? `<p class="bonus">Geschafft am ${wann}!</p>`
          : x.ziel > 1 ? `<div class="balken"><i style="width:${Math.round(100 * st / x.ziel)}%"></i></div><p class="klein">${st.toLocaleString('de-DE')} / ${x.ziel.toLocaleString('de-DE')}</p>` : ''}`);
  socke(box.querySelector('canvas').getContext('2d'), i, 0, 0, !ok);
}

// ---------------------------------------------------------------------------
// Die Kiste: was die Wichtel verdient haben, während man weg war
// ---------------------------------------------------------------------------
export function zeigeKiste(sek, weiter) {
  const h = Math.floor(sek / 3600), m = Math.round((sek % 3600) / 60);
  const dauer = sek ? (h ? `${h} Std. ${m} Min.` : `${m} Min.`) : '';
  const gaeste = (S.st.kisteGaeste || 0).toLocaleString('de-DE');
  const box = fenster('Während du weg warst …',
    `<canvas class="kiste" width="24" height="20"></canvas>
     <p>${dauer ? `In ${dauer} haben deine Wichtel` : 'Deine Wichtel haben'} <b>${gaeste}</b> Gäste bedient und alles in diese Kiste gelegt.</p>
     ${sek >= C.OFFLINE_MAX_H * 3600 ? `<p class="klein">Länger als ${C.OFFLINE_MAX_H} Stunden arbeiten sie nicht allein.</p>` : ''}`,
    [{ text: 'Kiste öffnen', aktion: (b) => {
      const betrag = S.oeffneKiste();
      T.spiele('spezialKasse');
      zeichneKiste(b.querySelector('canvas'), true);
      b.querySelector('.knoepfe').innerHTML = `<p class="summe">+ ${S.formatGeld(betrag)}</p>`;
      setTimeout(() => { schliesseFenster(); weiter(); }, 1300);
      return false;
    } }]);
  zeichneKiste(box.querySelector('canvas'), false);
}

/** Pixelkiste 24 × 20, zu oder offen mit Sternen. */
function zeichneKiste(cv, offen) {
  const c = cv.getContext('2d');
  c.clearRect(0, 0, 24, 20);
  const holz = '#8a5230', dunkel = '#5a3219', gold = '#e8b030';
  if (offen) {
    // Deckel nach hinten, Sterne quellen heraus
    r(c, 3, 2, 18, 4, dunkel); r(c, 4, 3, 16, 2, holz);
    for (const [x, y] of [[6, 7], [10, 5], [14, 6], [17, 8], [8, 9], [12, 8], [15, 10]]) { p(c, x, y, '#fff4b0'); p(c, x + 1, y, gold); p(c, x, y + 1, gold); }
  } else {
    r(c, 3, 5, 18, 5, holz); r(c, 3, 5, 18, 1, '#a8683e'); r(c, 3, 9, 18, 1, dunkel);
  }
  r(c, 3, 10, 18, 9, holz); r(c, 3, 18, 18, 1, dunkel);
  r(c, 3, 13, 18, 1, dunkel);
  r(c, 2, 10, 1, 9, gold); r(c, 21, 10, 1, 9, gold);   // Beschläge
  r(c, 11, offen ? 10 : 8, 2, 3, gold); p(c, 11, offen ? 11 : 9, dunkel);   // Schloss
}

// ---------------------------------------------------------------------------
// Tagesaufträge
// ---------------------------------------------------------------------------
let auftragReiter = 'heute';   // 'heute' | 'erfolge'
export function oeffneAuftraege(reiter) {
  if (reiter) auftragReiter = reiter;
  oeffneBlatt('auftraege', auftragReiter === 'erfolge' ? 'Erfolgswand' : 'Aufträge für heute');
  const kopf = $('#blattTabs');
  kopf.innerHTML = '';
  const rt = el('div', 'reiter');
  for (const [id, name] of [['heute', 'Aufträge'], ['erfolge', 'Erfolge']]) {
    const neu = id !== auftragReiter && (id === 'erfolge' ? E.neuZahl() > 0 : A.abholbar() > 0);
    const b = el('button', 'tab' + (id === auftragReiter ? ' aktiv' : '') + (neu ? ' neu' : ''), name);
    b.onclick = () => { T.spiele('klick'); oeffneAuftraege(id); };
    rt.appendChild(b);
  }
  kopf.appendChild(rt);
  kopf.classList.remove('versteckt');
  const liste = $('#blattInhalt');
  liste.innerHTML = '';
  liste.scrollTop = 0;
  $('#blattGeld').textContent = S.formatGeld(S.st.geld);
  if (auftragReiter === 'erfolge') return baueErfolge(liste);
  if (S.st.lernen < 99) { liste.appendChild(el('p', 'hinweis', 'Nach der Einführung gibt es hier jeden Tag drei Aufträge.')); return; }
  const stufenName = ['leicht', 'mittel', 'schwer'];
  A.heute().forEach((a, i) => {
    const z = el('div', 'auftrag' + (a.abgeholt ? ' erledigt' : ''));
    const deko = a.stufe === 2 ? A.naechstesSammelstueck() : null;
    z.innerHTML = `<span class="stufe s${a.stufe}">${i + 1}</span>
      <div class="mitte"><b>${A.text(a)}</b>
        <div class="balken"><i style="width:${Math.round(100 * a.stand / a.ziel)}%"></i></div>
        <small>${a.stand} / ${a.ziel} · ${stufenName[a.stufe]} · Lohn: ${S.formatGeld(a.lohn)}${deko ? ' + Sammelstück' : ''}</small></div>`;
    const k = el('button', 'k k--kauf', a.abgeholt ? '✓' : 'Abholen');
    k.disabled = a.abgeholt || !A.fertig(a);
    k.onclick = () => {
      const e = A.abholen(i);
      if (!e) return;
      T.spiele('kauf');
      oeffneAuftraege('heute');
      if (e.deko) {
        fenster('Sammelstück!', `<div class="gross-ico">🎁</div><p><b>${e.deko.name}</b></p><p>${e.deko.text}</p><p class="bonus">♥ +${e.deko.stimmung} Stimmung</p><p class="klein">Gibt es nur für schwere Aufträge.</p>`, [{ text: 'Ansehen', aktion: () => { schliesseBlatt(); const o = ortVon(e.deko.id); if (o) funkeln(o.x, o.y); } }]);
      } else toast(`+${S.formatGeld(e.lohn)} für den Auftrag!`, 'gut');
    };
    z.appendChild(k);
    liste.appendChild(z);
  });
  liste.appendChild(el('p', 'klein', 'Morgen gibt es neue Aufträge. Zählt nur, was du selbst am Tresen machst.'));
  const samm = el('div', 'sammlung');
  for (const d of C.AUFTRAG_DEKO) samm.appendChild(el('span', S.st.kalDeko[d.id] ? 'hat' : '', S.st.kalDeko[d.id] ? '★ ' + d.name : '???'));
  liste.appendChild(el('p', 'gruppe', `Sammlung: ${C.AUFTRAG_DEKO.filter((d) => S.st.kalDeko[d.id]).length} / ${C.AUFTRAG_DEKO.length}`));
  liste.appendChild(samm);
  $('#blattGeld').textContent = S.formatGeld(S.st.geld);
}

// ---------------------------------------------------------------------------
// Adventskalender
// ---------------------------------------------------------------------------
export function oeffneKalender() {
  oeffneBlatt('kalender', 'Adventskalender');
  $('#blattTabs').classList.add('versteckt');
  const liste = $('#blattInhalt');
  liste.innerHTML = '';
  const ph = Z.phase();
  if (ph === 'herbst') {
    const ea = Z.ersterAdvent();
    const bis = Math.ceil((new Date(Z.saison(), 11, 1) - Z.jetzt()) / 86400000);
    liste.appendChild(el('p', 'hinweis', `Noch <b>${bis} ${bis === 1 ? 'Tag' : 'Tage'}</b> bis zum ersten Türchen. Der 1. Advent ist am ${ea.getDate()}.${ea.getMonth() + 1}.<br>Bis dahin: das Haus herrichten!`));
  }
  const raster = el('div', 'kalender');
  for (const n of C.KALENDER_REIHE) {
    const b = el('button', 'tuer');
    const auf = S.tuerOffen(n), bereit = S.tuerBereit(n);
    b.classList.toggle('auf', auf);
    b.classList.toggle('bereit', bereit);
    b.classList.toggle('gross', n === 24 || n === 6);
    b.innerHTML = auf ? (C.KALENDER_DEKO[n] ? '★' : '✓') : `<span>${n}</span>`;
    b.onclick = () => {
      if (!bereit) { T.spiele('falsch'); toast(auf ? `Türchen ${n} ist schon offen.` : `Türchen ${n} öffnet sich am ${n}. Dezember.`, 'hinweis'); return; }
      const e = S.oeffneTuer(n);
      T.spiele('tuer');
      oeffneKalender();
      if (e.deko) fenster(`Türchen ${n}`, `<div class="gross-ico">🎁</div><p><b>${e.deko.name}</b></p><p>${e.deko.text}</p><p class="bonus">♥ +${e.deko.stimmung} Stimmung</p><p class="klein">Gibt es nur hier im Kalender.</p>`);
      else fenster(`Türchen ${n}`, `<div class="gross-ico">⭐</div><p>Ein Umschlag mit</p><p class="summe">${S.formatGeld(e.betrag)}</p>`);
    };
    raster.appendChild(b);
  }
  liste.appendChild(raster);
  liste.appendChild(el('p', 'klein', 'Jeden Tag geht ein Türchen auf. An manchen wartet Deko, die es sonst nirgends gibt.'));
  $('#blattGeld').textContent = S.formatGeld(S.st.geld);
}

// ---------------------------------------------------------------------------
// Menü
// ---------------------------------------------------------------------------
let titelTipps = 0;
export function oeffneMenue() {
  oeffneBlatt('menue', 'Punsch & Lichterglanz');
  $('#blattTabs').classList.add('versteckt');
  const liste = $('#blattInhalt');
  liste.innerHTML = '';
  const b = S.boni();
  const stat = el('div', 'statistik');
  stat.innerHTML = `
    <div><span>Haus</span><b>${esc(S.st.name || '-')}</b></div>
    <div><span>Spielmodus</span><b>${S.st.modus === 'eigen' ? 'Individuell' : 'Klassisch'}</b></div>
    <div><span>Stimmung</span><b>♥ ${S.stimmung()}</b></div>
    <div><span>Gäste kommen alle</span><b>${S.gastTakt().toFixed(1).replace('.', ',')} s</b></div>
    <div><span>Preisaufschlag</span><b>+${Math.round((S.preisFaktor() - 1) * 100)} %</b></div>
    <div><span>Wichtel verdienen</span><b>${S.formatGeld(S.wichtelProSekunde() * 60)}/min</b></div>
    <div><span>Bedient</span><b>${S.st.stats.bedient.toLocaleString('de-DE')}</b></div>
    <div><span>Verdient insgesamt</span><b>${S.formatGeld(S.st.gesamt)}</b></div>
    ${S.st.andenken ? `<div><span>Andenken aus früheren Jahren</span><b>★ ${S.st.andenken}</b></div>` : ''}`;
  liste.appendChild(stat);

  const ton = el('div', 'schalter');
  const mk = (label, an, f) => { const k = el('button', 'k k--wahl' + (an ? ' gewaehlt' : ''), `${label}: ${an ? 'an' : 'aus'}`); k.onclick = () => { f(); oeffneMenue(); }; return k; };
  // Musik: Regler 0 (aus) bis 5
  const regler = el('div', 'regler');
  const stufe = () => S.st.ton.musik;
  regler.innerHTML = `<span class="rname">🎵 Musik</span>
    <button class="k k--neben rk" data-d="-1">−</button>
    <input type="range" min="0" max="5" step="1" value="${stufe()}">
    <button class="k k--neben rk" data-d="1">+</button>
    <b class="rwert"></b>`;
  const feld = regler.querySelector('input'), wert = regler.querySelector('.rwert');
  const setze = (v) => {
    S.st.ton.musik = Math.max(0, Math.min(5, v)); feld.value = S.st.ton.musik;
    wert.textContent = S.st.ton.musik === 0 ? 'aus' : S.st.ton.musik;
    T.init(); T.setzeMusik(S.st.ton.musik); S.speichere();
  };
  feld.oninput = () => setze(Number(feld.value));
  for (const b of regler.querySelectorAll('.rk')) b.onclick = () => setze(stufe() + Number(b.dataset.d));
  wert.textContent = stufe() === 0 ? 'aus' : stufe();
  liste.appendChild(regler);
  ton.appendChild(mk('Geräusche', S.st.ton.fx, () => { S.st.ton.fx = !S.st.ton.fx; T.setzeFx(S.st.ton.fx); S.speichere(); }));
  liste.appendChild(ton);

  const zeile = el('div', 'schalter');
  const nm = el('button', 'k k--neben', 'Haus umbenennen');
  nm.onclick = () => frageName(true);
  const hilfe = el('button', 'k k--neben', 'So geht’s');
  hilfe.onclick = () => zeigeHilfe();
  // Solange die Einführung (samt Startzielen) läuft: überspringen, sonst nochmal
  const neu = el('button', 'k k--neben', lernenLaeuft() ? 'Einführung überspringen' : 'Einführung nochmal');
  neu.onclick = () => {
    if (!lernenLaeuft()) { nochmalLernen(); schliesseBlatt(); return; }
    fenster('Einführung überspringen?', '<p>Die Erklärblasen und die Startziele oben werden ausgeblendet. Im Menü kannst du die Einführung jederzeit wieder starten.</p>', [
      { text: 'Überspringen', aktion: () => { ueberspringen(); schliesseBlatt(); zielLeiste(); toast('Einführung übersprungen - viel Spaß!', 'gut'); } },
      { text: 'Abbrechen', neben: true },
    ]);
  };
  zeile.appendChild(nm); zeile.appendChild(hilfe); zeile.appendChild(neu);
  liste.appendChild(zeile);

  // Neustart: ganz unten und abgesetzt, mit Rückfrage
  const neustart = el('div', 'schalter neustart');
  const nk = el('button', 'k k--leise', 'Neu anfangen');   // bewusst unauffällig: grau, nicht rot
  nk.onclick = () => frageNeustart();
  neustart.appendChild(nk);
  liste.appendChild(neustart);
  // Welche Fassung läuft? Kommt aus der Adresse dieser Datei (?v=…) - so
  // sieht man auf dem Handy sofort, ob ein Update wirklich angekommen ist
  const version = new URL(import.meta.url).searchParams.get('v') || 'lokal';
  liste.appendChild(el('p', 'klein version', `Version ${version} · <a href="datenschutz.html" target="_blank" rel="noopener">Datenschutz</a>`));

  const kopf = $('#blattTitel');
  // Die Werkstatt gibt es nur lokal - Spieler sollen sie nicht finden
  kopf.onclick = S.ENTWICKLUNG ? () => { if (++titelTipps >= 5) { titelTipps = 0; werkstatt(); } } : null;
  $('#blattGeld').textContent = S.formatGeld(S.st.geld);
}

/**
 * Das Standschild beschriften (antippen). Es ist in der 3x5-Pixelschrift
 * gemalt: nur Großbuchstaben, Ziffern und ein paar Zeichen, höchstens 12 -
 * mehr passt zwischen die Tafeln für Chef und Schwung nicht (die rücken mit).
 */
const SCHILD_MAX = 12;   // auch 12 × „W“ passt noch zwischen Chef- und Schwung-Tafel
export function schildText(roh) {
  return roh.toUpperCase().replace(/ß/g, 'SS').split('').filter(hatGlyphe).join('').replace(/\s+/g, ' ').trim().slice(0, SCHILD_MAX);
}
export function schildBeschriften() {
  const box = fenster('Dein Schild', `
    <p>Was soll auf dem Schild über deinem Stand stehen?</p>
    <label><input type="text" id="schildName" maxlength="${SCHILD_MAX}" value="${esc(S.st.standName || '')}" placeholder="DEIN STAND" style="text-transform: uppercase"></label>
    <p class="klein">Höchstens ${SCHILD_MAX} Zeichen: Buchstaben, Ziffern, Leerzeichen.</p>`, [
    { text: 'Speichern', aktion: (b) => {
      const t = schildText(b.querySelector('#schildName').value);
      S.st.standName = t || null;
      S.speichere();
    } },
    { text: 'Zurücksetzen', neben: true, aktion: () => { S.st.standName = null; S.speichere(); } },
  ]);
  setTimeout(() => { const i = box.querySelector('#schildName'); if (i) i.focus(); }, 100);
}

/** Rückfrage vor dem Löschen - der Spielstand ist danach weg. */
function frageNeustart() {
  fenster('Neu anfangen?', `
    <div class="gross-ico">⚠️</div>
    <p><b>Dein Spielstand wird komplett gelöscht.</b></p>
    <p>Sterne, Deko, Anstrich, Zutaten, Wichtel, Kalendertürchen und Sammelstücke sind danach weg. Das lässt sich nicht rückgängig machen.</p>`, [
    { text: 'Ja, alles löschen', aktion: () => { S.allesLoeschen(); schliesseBlatt(); location.reload(); } },
    { text: 'Abbrechen', neben: true },
  ]);
}

function werkstatt() {
  const d = Z.jetzt();
  const z = (n) => String(n).padStart(2, '0');
  const wert = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
  fenster('Werkstatt', `
    <p class="klein">Zum Ausprobieren. Datum und Uhrzeit verstellen, Sterne geben.</p>
    <label>Datum und Uhrzeit<br><input type="datetime-local" id="wsDatum" value="${wert}"></label>
    <label>Zeit läuft ×<input type="number" id="wsTempo" value="${Z.zeitTempo()}" min="1" max="3600" step="1"></label>
    <p class="klein"><b>Dev-Modus</b> - schneller durchspielen. Bleibt nach dem Neuladen an; ⚙ an der Uhr zeigt es.</p>
    <label>Sterne je Gast ×<select id="wsGeld">${[1, 3, 10, 30, 100].map((n) => `<option ${S.dev.geld === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label>Spieltempo ×<select id="wsSpiel">${[1, 2, 3, 5].map((n) => `<option ${S.dev.tempo === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <p class="klein">Kalender ${S.dev.tage ? (S.dev.tage > 0 ? '+' : '') + S.dev.tage + ' Tage' : 'unverschoben'}</p>
    <div class="schalter">
      <button class="k k--neben" id="wsTag">+1 Tag</button>
      <button class="k k--neben" id="wsWoche">+1 Woche</button>
      <button class="k k--neben" id="wsDevAus">Dev aus</button>
    </div>
    <div class="schalter">
      <button class="k k--neben" id="wsPlus">+20.000 Sterne</button>
      <button class="k k--neben" id="wsEcht">Echte Zeit</button>
      <button class="k k--neben" id="wsWeg">Spielstand löschen</button>
    </div>`, [
    { text: 'Übernehmen', aktion: (box) => {
      const v = box.querySelector('#wsDatum').value;
      const tp = Math.max(1, Number(box.querySelector('#wsTempo').value) || 1);
      if (v) Z.setzeZeit(new Date(v), tp);
    } },
    { text: 'Schließen', neben: true },
  ]);
  $('#wsGeld').onchange = (e) => { S.setzeDev({ geld: Number(e.target.value) }); letzteHud = ''; };
  $('#wsSpiel').onchange = (e) => { S.setzeDev({ tempo: Number(e.target.value) }); letzteHud = ''; };
  // Tage springen: neu laden, damit Türchen, Advent und Schnee wie bei einem
  // echten neuen Tag ankommen
  const springe = (n) => { S.setzeDev({ tage: S.dev.tage + n }); S.speichere(); location.reload(); };
  $('#wsTag').onclick = () => springe(1);
  $('#wsWoche').onclick = () => springe(7);
  $('#wsDevAus').onclick = () => {
    const tage = S.dev.tage;
    S.setzeDev({ geld: 1, tempo: 1, tage: 0 });
    if (tage) { S.speichere(); location.reload(); } else { schliesseFenster(); letzteHud = ''; toast('Dev-Modus aus', 'hinweis'); }
  };
  $('#wsPlus').onclick = () => { S.verdiene(20000); toast('+20.000 Sterne', 'gut'); };
  $('#wsEcht').onclick = () => { Z.setzeZeit(null, 1); schliesseFenster(); toast('Wieder echte Zeit', 'hinweis'); };
  $('#wsWeg').onclick = (e) => {
    if (e.target.dataset.sicher) { S.allesLoeschen(); schliesseFenster(); schliesseBlatt(); location.reload(); }
    else { e.target.dataset.sicher = '1'; e.target.textContent = 'Wirklich löschen?'; }
  };
}

// ---------------------------------------------------------------------------
// Name, Hilfe, Einführung
// ---------------------------------------------------------------------------
export function frageName(umbenennen = false, danach) {
  fenster(umbenennen ? 'Haus umbenennen' : 'Willkommen!', `
    ${umbenennen ? '' : '<p>Der Herbst ist grau, das Haus ist kahl - und bis Weihnachten soll es das schönste der Straße sein.</p>'}
    <label>Wie heißt euer Haus?<br><input type="text" id="hausName" maxlength="28" placeholder="z. B. Haus Schneeflocke" value="${esc(S.st.name || '')}"></label>`,
  [{ text: umbenennen ? 'Speichern' : 'Los geht’s', aktion: (box) => {
    const v = box.querySelector('#hausName').value.trim();
    S.st.name = v || 'Unser Haus';
    S.speichere();
    if (umbenennen) oeffneMenue();
    if (danach) setTimeout(danach, 50);
  } }]);
  setTimeout(() => { const i = $('#hausName'); if (i && !umbenennen) i.focus(); }, 100);
}

/** Nach dem Namen: klassisch mit dem echten Kalender oder eigener Start. */
export function waehleModus(fertig) {
  const heute = new Date();
  const box = fenster('Wie möchtest du spielen?', `
    <button class="modus" data-m="echt">
      <b>🕯️ Klassisch</b>
      <span>Das Spiel läuft mit dem echten Kalender. Heute ist der ${heute.getDate()}.${heute.getMonth() + 1}. - die Adventszeit kommt, wenn sie wirklich kommt.</span>
    </button>
    <button class="modus" data-m="eigen">
      <b>🎄 Individuell</b>
      <span>Dein Spiel beginnt eine Woche vor dem 1. Dezember, egal wann du startest. Die Tage laufen danach ganz normal weiter.</span>
    </button>
    <p class="klein">Die Uhrzeit ist in beiden Fällen die echte: Nachts ist es dunkel.</p>`, []);
  for (const b of box.querySelectorAll('.modus')) b.onclick = () => { T.spiele('klick'); schliesseFenster(); fertig(b.dataset.m); };
}

/** Einmal beim ersten Start: worum es geht. */
export function zeigeZiel(modus, fertig) {
  const start = modus === 'eigen'
    ? 'Dein Spiel beginnt am 24. November - du hast also gut vier Wochen.'
    : `Heute ist der ${Z.datumLang()}.`;
  fenster('Dein Ziel', `
    <div class="gross-ico">🏡✨</div>
    <p><b>Mach dein Haus bis Heiligabend zum schönsten der Straße!</b></p>
    <ul class="ziel">
      <li>🍷 Verkaufe am Punschstand vor dem Haus warme Getränke.</li>
      <li>🛒 Kaufe mit den Sternen Lichter, Deko, Farbe und Helfer.</li>
      <li>🔓 Schalte bis zum 24. Dezember alles frei.</li>
      <li>📷 Zeig dein Haus als Weihnachtskarte.</li>
    </ul>
    <p class="klein">${start} Ab dem 1. Dezember geht jeden Tag ein Türchen auf, und jeder Advent bringt eine Überraschung.</p>`,
  [{ text: 'Los geht’s!', aktion: () => { if (fertig) setTimeout(fertig, 60); } }]);
}

export function zeigeHilfe() {
  fenster('So geht’s', `
    <ol class="hilfe">
      <li><b>Glas holen</b> - links auf dem Tresen.</li>
      <li><b>Abfüllen</b> - auf den passenden Topf tippen. Das Symbol im Bläschen des Gastes ist dasselbe wie auf dem Topf.</li>
      <li><b>Servieren</b> - auf den Gast tippen. Je schneller, desto mehr Trinkgeld.</li>
      <li><b>Handgriffe</b> - Zuckerstange, Umrühren, Zuckerguss, Sahne, Zimt, Milchschaum, Zuckerhut: das fertige Glas auf dem Tablett antippen (die goldene Blase zeigt, was fehlt). Dann zahlt der Gast mehr, je nach Getränk 20 bis 50 %. Wichtel lassen sie weg.</li>
      <li><b>Leerer Topf?</b> Ein paarmal antippen, dann ist er wieder voll.</li>
      <li><b>Zu langsam?</b> Nicht schlimm - dann geht der Gast eben weiter. Nur besondere Gäste solltest du nicht verpassen - wer das ist, merkst du schon.</li>
    </ol>
    <p>Wer zügig hintereinander bedient, baut <b>Schwung</b> auf (bis ×1,40). Wer länger bleibt, bekommt Besuch von ganzen Gruppen - und manchmal von jemand ganz Besonderem.</p>
    <p>Mit den Sternen kaufst du Deko, Farbe, Zutaten und Wichtel. Je gemütlicher das Haus, desto mehr Gäste kommen und desto mehr zahlen sie.</p>
    <p><b>Du bist der Chef:</b> Solange du am Stand mit anpackst, arbeiten die Wichtel schneller. Besondere Gäste und Großbestellungen bedienst nur du.</p>
    <p class="klein">Das Spiel läuft mit deiner echten Uhr: Nachts ist es dunkel, ab dem 1. Dezember liegt Schnee und jeden Tag geht ein Türchen auf.</p>`);
}

// ---------------------------------------------------------------------------
// Weihnachtskarte
// ---------------------------------------------------------------------------
// Fünf Rahmen. Jeder bekommt die Kartenfläche und zeichnet Hintergrund
// und Schmuck; die Schriftfarben gehören zum Rahmen.
function stern(c, x, y, r0, f) {
  c.fillStyle = f; c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r0 * 0.45 : r0;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.fill();
}
function flocke(c, x, y, g, f) {
  c.strokeStyle = f; c.lineWidth = Math.max(2, g / 5); c.beginPath();
  for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.moveTo(x - Math.cos(a) * g, y - Math.sin(a) * g); c.lineTo(x + Math.cos(a) * g, y + Math.sin(a) * g); }
  c.stroke();
}
const RAHMEN = [
  { name: 'Weihnachtsrot', titel: '#fff4dc', text: '#f0d8a8', umriss: 'rgba(40,6,6,0.8)', male(c, W, H) {
    c.fillStyle = '#7a1c1c'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#9a2a24';
    for (let x = 0; x < W; x += 24) for (let y = 0; y < H; y += 24) if ((x + y) % 48 === 0) c.fillRect(x, y, 12, 12);
    c.strokeStyle = '#e8c030'; c.lineWidth = 4; c.strokeRect(12, 12, W - 24, H - 24);
  } },
  { name: 'Stechpalme', titel: '#fffaf0', text: '#e4f0d8', umriss: 'rgba(6,24,10,0.8)', male(c, W, H) {
    c.fillStyle = '#1f4a2a'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {
      const rand = i % 4, t = (i / 60 * 4) % 1;
      const x = rand === 0 ? t * W : rand === 1 ? W - 18 : rand === 2 ? t * W : 18;
      const y = rand === 0 ? 18 : rand === 2 ? H - 18 : t * H;
      c.save(); c.translate(x, y); c.rotate(i);
      c.fillStyle = '#3f8a3a'; c.beginPath(); c.ellipse(0, 0, 14, 6, 0, 0, Math.PI * 2); c.fill();
      c.restore();
      if (i % 3 === 0) { c.fillStyle = '#d83a3a'; c.beginPath(); c.arc(x + 6, y + 4, 5, 0, Math.PI * 2); c.fill(); }
    }
  } },
  { name: 'Sternennacht', titel: '#fff2c0', text: '#c8d4f0', umriss: 'rgba(4,8,30,0.85)', male(c, W, H) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0e1638'); g.addColorStop(1, '#2a3a78');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      const x = Z.hash(i * 3 + 7) * W, y = Z.hash(i * 5 + 1) * H;
      if (x > 30 && x < W - 30 && y > 30 && y < H - 190) continue;
      stern(c, x, y, 3 + Z.hash(i) * 7, i % 5 ? '#fff2c0' : '#e8c030');
    }
  } },
  { name: 'Zuckerstange', titel: '#8a1c1c', text: '#5a3a2a', umriss: 'rgba(255,250,240,0.95)', male(c, W, H) {
    c.fillStyle = '#fff8ee'; c.fillRect(0, 0, W, H);
    c.save(); c.beginPath(); c.rect(0, 0, W, H); c.rect(26, 26, W - 52, H - 52); c.clip('evenodd');
    for (let k = -H; k < W + H; k += 28) { c.fillStyle = '#d02a2a'; c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 14, 0); c.lineTo(k + 14 - H, H); c.lineTo(k - H, H); c.fill(); }
    c.restore();
  } },
  { name: 'Schneeflocken', titel: '#ffffff', text: '#e0ecfa', umriss: 'rgba(10,30,70,0.8)', male(c, W, H) {
    c.fillStyle = '#4a7ab8'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) {
      const x = Z.hash(i * 11 + 3) * W, y = Z.hash(i * 17 + 5) * H;
      if (x > 30 && x < W - 30 && y > 30 && y < H - 190) continue;
      flocke(c, x, y, 8 + Z.hash(i * 2) * 12, 'rgba(255,255,255,0.85)');
    }
  } },
];
const GRUESSE = [
  'Frohe Weihnachten!',
  'Fröhliche Weihnachten!',
  'Frohes Fest!',
  'Besinnliche Feiertage!',
  'Ein gemütliches Fest!',
  'Schöne Adventszeit!',
  'Frohes Fest & guten Rutsch!',
  'Leise rieselt der Schnee …',
];

const VON_VORGABE = 'Herzliche Grüße von';

/**
 * Schrift auf der Karte: mit Umriss und Schatten, damit sie auf jedem
 * Rahmen lesbar ist. Zu lange Zeilen werden kleiner statt abgeschnitten.
 */
function kartenSchrift(c, text, x, y, groesse, stil, farbe, umriss, maxB) {
  let g = groesse;
  do { c.font = `${stil} ${g}px Georgia, serif`; g -= 2; } while (c.measureText(text).width > maxB && g > 14);
  c.lineJoin = 'round';
  c.lineWidth = Math.max(3, g / 7);
  c.strokeStyle = umriss;
  c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowOffsetY = 3; c.shadowBlur = 4;
  c.strokeText(text, x, y);
  c.shadowColor = 'transparent';
  c.fillStyle = farbe;
  c.fillText(text, x, y);
}

/** Eigener Kartentext: Gruß und Grußzeile. Datum und Hausname bleiben fest. */
function kartenText(nr, ohneLeute, gruss) {
  const k = S.st.karteText || {};
  fenster('Text der Karte', `
    <label>Gruß<br><input type="text" id="ktGruss" maxlength="32" value="${esc(k.gruss || gruss)}"></label>
    <label>Grußzeile (dahinter steht euer Hausname)<br><input type="text" id="ktVon" maxlength="30" value="${esc(k.von || VON_VORGABE)}"></label>
    <p class="klein">… ${esc(S.st.name || 'uns')} · Datum und „Punsch &amp; Lichterglanz" stehen immer darunter.</p>`, [
    { text: 'Übernehmen', aktion: (box) => {
      const g = box.querySelector('#ktGruss').value.trim(), v = box.querySelector('#ktVon').value.trim();
      S.st.karteText = { gruss: g || null, von: v || null };
      S.speichere();
      setTimeout(() => karte(nr, ohneLeute), 30);
    } },
    { text: 'Zurücksetzen', neben: true, aktion: () => { S.st.karteText = null; S.speichere(); setTimeout(() => karte(nr, ohneLeute), 30); } },
  ]);
}

export async function karte(rahmenNr, ohneLeute = false, festerGruss = null) {
  T.spiele('klick');
  const WG = 176, SK = 4;
  const welt = document.createElement('canvas');
  welt.width = 180; welt.height = WG;
  zeichneWelt(welt.getContext('2d'), WG, performance.now() / 1000, 0, { karte: true, ohneGaeste: ohneLeute });

  const rand = 44, unten = 190;
  const cv = document.createElement('canvas');
  cv.width = 180 * SK + rand * 2; cv.height = WG * SK + rand + unten;
  // Im Hauptspeicher malen, nicht auf der Grafikkarte: Fürs PNG muss das Bild
  // sonst erst zurückgelesen werden - auf manchen Android-Geräten spürbar langsam
  const c = cv.getContext('2d', { willReadFrequently: true });
  const nr = rahmenNr ?? Math.floor(Math.random() * RAHMEN.length);
  const R = RAHMEN[nr];
  R.male(c, cv.width, cv.height);
  // Bild mit hellem Passepartout
  c.fillStyle = '#f6ecd4'; c.fillRect(rand - 8, rand - 8, 180 * SK + 16, WG * SK + 16);
  c.imageSmoothingEnabled = false;
  c.drawImage(welt, rand, rand, 180 * SK, WG * SK);
  // Gruß
  const eigen = S.st.karteText || {};
  let gruss = festerGruss || eigen.gruss || GRUESSE[Math.floor(Math.random() * GRUESSE.length)];
  if (!festerGruss && !eigen.gruss && Z.phase() === 'weihnacht' && Z.jetzt().getMonth() === 11 && Z.jetzt().getDate() >= 27) gruss = 'Einen guten Rutsch!';
  const von = `${eigen.von || VON_VORGABE} ${S.st.name || 'uns'}`;
  const y0 = WG * SK + rand, mx = cv.width / 2, maxB = cv.width - 70;
  c.textAlign = 'center';
  kartenSchrift(c, gruss, mx, y0 + 72, 52, 'bold italic', R.titel, R.umriss, maxB);
  kartenSchrift(c, von, mx, y0 + 122, 30, '', R.text, R.umriss, maxB);
  kartenSchrift(c, `${Z.datumLang()} · Punsch & Lichterglanz`, mx, y0 + 158, 20, '', R.text, R.umriss, maxB);

  // Gemeldet: auf Android dauerte es „ewig" bis zur Karte. Das Fenster zeigt
  // jetzt SOFORT das gemalte Bild selbst; die PNG-Datei fürs Teilen entsteht
  // danach im Hintergrund und ist meist fertig, bevor man „Teilen" tippt.
  const box = fenster('Deine Weihnachtskarte', '', [
    { text: 'Teilen', aktion: (b) => {
      const knopf = b.querySelector('.knoepfe .k');
      knopf.textContent = 'Moment …';
      datei.then(({ file, url }) => {
        knopf.textContent = 'Teilen';
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: gruss, text: `${gruss} ${von}` }).catch(() => {});
        } else {
          const a = document.createElement('a'); a.href = url; a.download = 'weihnachtskarte.png'; a.click();
        }
      });
      return false;   // Fenster bleibt offen
    } },
    { text: 'Andere Karte', neben: true, aktion: () => { setTimeout(() => karte((nr + 1) % RAHMEN.length, ohneLeute), 30); } },
    { text: ohneLeute ? 'Mit Gästen' : 'Ohne Gäste', neben: true, aktion: () => { setTimeout(() => karte(nr, !ohneLeute, gruss), 30); } },
    { text: 'Text ändern', neben: true, aktion: () => { setTimeout(() => kartenText(nr, ohneLeute, gruss), 30); } },
    { text: 'Schließen', neben: true },
  ]);
  cv.className = 'kartenbild';
  box.querySelector('.inhalt').appendChild(cv);
  const datei = new Promise((res) => setTimeout(() => cv.toBlob((blob) => {
    res({ file: new File([blob], 'weihnachtskarte.png', { type: 'image/png' }), url: URL.createObjectURL(blob) });
  }, 'image/png'), 50));
}

// ---------------------------------------------------------------------------
// Verdrahtung der Leiste
// ---------------------------------------------------------------------------
export function verdrahte() {
  alleSymbole();
  $('#ziel').onclick = () => { T.spiele('klick'); offen === 'laden' ? schliesseBlatt() : oeffneLaden(); };
  $('#btnLaden').onclick = () => { T.spiele('klick'); offen === 'laden' ? schliesseBlatt() : oeffneLaden(); };
  $('#btnKalender').onclick = () => { T.spiele('klick'); offen === 'kalender' ? schliesseBlatt() : oeffneKalender(); };
  $('#btnAuftraege').onclick = () => { T.spiele('klick'); offen === 'auftraege' ? schliesseBlatt() : oeffneAuftraege(E.neuZahl() > 0 && !A.abholbar() ? 'erfolge' : 'heute'); };
  $('#btnKarte').onclick = () => karte();
  $('#btnMenue').onclick = () => { T.spiele('klick'); offen === 'menue' ? schliesseBlatt() : oeffneMenue(); };
  $('#blattZu').onclick = () => { T.spiele('klick'); schliesseBlatt(); };
}
