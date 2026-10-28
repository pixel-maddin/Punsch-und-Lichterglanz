/*
 * ui.js - alles DOM: Kopfzeile, Leiste, Laden, Adventskalender, Menü,
 * Einblendungen, Fenster und die Weihnachtskarte zum Teilen.
 *
 * Text steht im DOM, nicht im Canvas: Im hochskalierten 180-px-Bild
 * wäre er Matsch, und Tippziele müssen groß sein.
 */
import * as C from './config.js?v=202610281500';
import * as S from './spiel.js?v=202610281500';
import * as Z from './zeit.js?v=202610281500';
import * as T from './ton.js?v=202610281500';
import { icon, iconGross, wichtelKlein, r, p, figurKlein, figurGross, mische, neueFarben, hatGlyphe, scale2x, text as pixText } from './pixel.js?v=202610281500';
import { schriftBild, kannSchrift } from './schrift.js?v=202610281500';
import { zielHaus } from './fein.js?v=202610281500';
import { zeichneWelt, ortVon, funkeln, zeichneVogelAlbum, zeichneFutterSzene, FSZ_W, FSZ_H, FSZ_DY, FSZ_CX } from './szene.js?v=202610281500';
import { nochmal as nochmalLernen, fuehrung, laeuft as lernenLaeuft, ueberspringen } from './lernen.js?v=202610281500';
import * as A from './auftraege.js?v=202610281500';
import * as E from './erfolge.js?v=202610281500';
import * as ZL from './ziele.js?v=202610281500';
import { zeichneWand, sockeBei, socke, GESCHENK, W as WAND_W, H as WAND_H } from './wand.js?v=202610281500';
import * as KA from './karte.js?v=202610281500';
import { zeigeRueckblick } from './ereignis.js?v=202610281500';
import { barbaraZweig } from './szene.js?v=202610281500';
import * as SW from './schneeball.js?v=202610281500';
import * as LI from './lichtung.js?v=202610281500';
import * as CB from './christbaum.js?v=202610281500';
import * as SB from './schlitten.js?v=202610281500';
import * as EB from './schlittschuh.js?v=202610281500';
import * as BS from './backstube.js?v=202610281500';
import { alleSymbole, zeichneSymbol } from './symbole.js?v=202610281500';

const $ = (s) => document.querySelector(s);
/** Für Nutzertext in HTML: <, >, & und Anführungszeichen entschärfen. */
const esc = (s) => String(s).replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[z]));
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

let offen = null;          // 'laden' | 'kalender' | 'menue' | null
let ladenTab = 'super';
let ladenModus = 'kaufen';  // 'kaufen' | 'haus' - Einkaufen oder Mein Haus (einstellen)
let zeilen = [];           // Ladenzeilen zum Nachführen

export function panelOffen() { return offen || (LI.istOffen() || CB.istOffen() || SB.istOffen() || SW.istOffen() || EB.istOffen() || BS.istOffen() ? 'minispiel' : KA.istOffen() ? 'karte' : null); }

// ---------------------------------------------------------------------------
// Kopfzeile
// ---------------------------------------------------------------------------
let letzteHud = '';
export function hud() {
  // 19.10.: nur die Zahl (der Stern davor sagt, was es ist) - so passt die größere Kopfzeile
  const g = S.st.geld >= 1e6 ? (S.st.geld / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' Mio.' : Math.floor(S.st.geld).toLocaleString('de-DE');
  const s = S.stimmung();
  const tw = Z.tagesWetter();
  const u = `${Z.uhrText()} ${tw.temp < 0 ? '−' : ''}${Math.abs(tw.temp)}°`;
  const k = S.offeneTueren();
  const karteDa = S.st.lernen >= 99;   // Knopf „Karte" erst nach der Einführung
  const sig = g + s + u + k + '|' + A.abholbar() + '|' + E.neuZahl() + '|' + karteDa + !!S.st.angebotNeu;
  if (sig === letzteHud) return;
  letzteHud = sig;
  $('#btnStandkarte').classList.toggle('versteckt', !karteDa);
  $('#btnHaus').classList.toggle('versteckt', !karteDa);
  $('#huelle').classList.toggle('mit-standkarte', karteDa);
  $('#standkartePunkt').classList.toggle('versteckt', !S.st.angebotNeu);
  $('#geldZahl').textContent = g;
  $('#stimmungZahl').textContent = s;
  $('#uhr').textContent = u + ((Z.zeitVerstellt() || S.devAn()) && !S.DEMO ? ' ⚙' : '');
  // Eine Zahl nur für Belohnungen, die man abholen kann; neue Erfolge sind
  // nur ein Punkt (Betatest 2: „Aufträge 10" nach 20 Minuten)
  const ab = A.abholbar(), en = E.neuZahl() + (S.finaleBereit() ? 1 : 0);   // + goldenes Geschenk (Finale)
  const bA = $('#aufBadge'); bA.textContent = ab || ''; bA.classList.toggle('versteckt', ab === 0 && en === 0); bA.classList.toggle('punkt', ab === 0 && en > 0);
  $('#btnAuftraege').classList.toggle('lockt', ab > 0);
  const b = $('#kalBadge');
  b.textContent = k; b.classList.toggle('versteckt', k === 0);
  $('#btnKalender').classList.toggle('lockt', k > 0);
}

// ---------------------------------------------------------------------------
// Startziele: eine Leiste unter der Kopfzeile (ziele.js)
// ---------------------------------------------------------------------------
let letztesZiel = '';
/** Die Leiste pulst einmal kurz (Ziel geschafft). */
export function zielPuls() { const b = $('#ziel'); b.classList.remove('puls'); void b.offsetWidth; b.classList.add('puls'); }
let leistenModus = '';   // 'ziel' | 'ansturm' | ''
/** Betrag mit der Sterngrafik der Kopfzeile statt des Worts „Sterne" (25.10.). */
let sternBild = '';
function zielZahl(n) {
  if (!sternBild) {
    const cv = document.querySelector('#geld canvas');
    try {   // erst nehmen, wenn der Stern schon gemalt ist (sonst bliebe ein leeres Bild gemerkt)
      if (cv && cv.width && cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data.some((v, i) => i % 4 === 3 && v > 0)) sternBild = cv.toDataURL();
    } catch (e) { /* ohne Bild */ }
  }
  const z = Math.max(0, Math.round(n)).toLocaleString('de-DE');
  return sternBild ? `${z}<img class="stern" src="${sternBild}" alt="Sterne">` : `${z} ★`;
}
export function zielLeiste() {
  const z = ZL.aktuell();
  const k = ZL.kaufziel();   // nach den Startzielen das laufende nächste Ziel (13.10.)
  const bereit = !!(k && k.leisten) || !!(z && z.bereit && z.bereit());   // Ziel ohne Kauf (24.10.: erster Auftrag)
  // Der Kontostand gehört in die Signatur: „noch 186 Sterne" blieb sonst
  // stehen, während man längst 179 hatte (Betatest 02.10.)
  // Dieselbe Leiste trägt seit 03.10. auch den Tagesansturm (Vorrang, er ist kurz)
  const ansturm = S.lauf.ansturm ? Math.max(0, Math.ceil(S.lauf.stossBis - S.lauf.t)) : 0;
  const zimt = !ansturm && !z ? S.zimtRest() : 0;
  const markt = !ansturm && !z && !zimt && S.marktHeute() && !S.marktBesucht();
  // Nach den Startzielen: das laufende nächste Ziel (13.10.)
  const weiter = !ansturm && !z && !zimt && !markt && k && k.laufend ? k : null;
  leistenModus = ansturm ? 'ansturm' : z ? 'ziel' : zimt ? 'zimt' : markt ? 'markt' : weiter ? 'weiter' : '';
  const sig = ansturm ? `a|${ansturm}` : zimt ? `z|${zimt}` : markt ? 'markt'
    : weiter ? `w|${weiter.id}|${weiter.kosten}|${bereit}|${bereit ? '' : Math.floor(S.st.geld)}`
    : z ? `${z.id}|${z.stand()}|${bereit}|${z.anteil ? Math.round(z.anteil() * 20) : ''}|${k ? k.kosten : ''}|${k && !bereit ? S.st.geld : ''}` : '';
  if (sig === letztesZiel) return;
  letztesZiel = sig;
  const b = $('#ziel');
  $('#huelle').classList.toggle('mit-ziel', !!leistenModus);
  b.classList.toggle('ansturm', !!ansturm);
  b.classList.toggle('zimt', !!zimt);
  if (ansturm) {
    b.innerHTML = `<span class="nr">ANSTURM</span><span class="was">${C.ANSTURM_MULT === 3 ? 'Dreifaches' : C.ANSTURM_MULT + '-faches'} Trinkgeld - nur wenn du servierst!</span><span class="los">${ansturm} s</span>`
      + `<span class="fort"><span style="width:${Math.round(ansturm / C.ANSTURM_DAUER * 100)}%"></span></span>`;
    b.classList.remove('bereit', 'versteckt');
    $('#huelle').style.setProperty('--ziel-unten', (b.offsetTop + b.offsetHeight) + 'px');
    return;
  }
  if (zimt) {
    const m = Math.floor(zimt / 60), sek = String(zimt % 60).padStart(2, '0');
    b.innerHTML = `<span class="nr">ZIMTSTERN</span><span class="was">Selbst serviert: noch einmal doppelt</span><span class="los">${m}:${sek}</span>`
      + `<span class="fort"><span style="width:${Math.round(zimt / C.HAENDLER_GUTSCHEIN.dauer * 100)}%"></span></span>`;
    b.classList.remove('bereit', 'versteckt');
    $('#huelle').style.setProperty('--ziel-unten', (b.offsetTop + b.offsetHeight) + 'px');
    return;
  }
  b.classList.toggle('markt', markt);
  if (markt) {
    b.innerHTML = `<span class="nr">MARKTTAG</span><span class="was">Weihnachtsmarkt auf dem Festplatz</span><span class="los">Hin ▸</span>`;
    b.classList.remove('bereit', 'versteckt');
    $('#huelle').style.setProperty('--ziel-unten', (b.offsetTop + b.offsetHeight) + 'px');
    return;
  }
  b.classList.toggle('weiter', !!weiter);
  if (weiter) {
    const a = S.ARTIKEL_MAP[weiter.id];
    const stufe = Array.isArray(a.kosten) ? ` <i>Stufe ${S.stufe(a.id) + 1}</i>` : '';
    const herz = Array.isArray(a.stimmung) ? a.stimmung[S.stufe(a.id)] : a.stimmung;
    const was = `${a.name}${stufe}${herz ? ` <i>♥+${herz}</i>` : a.tab === 'super' ? (!C.PRODUKT[a.id] ? '' : C.PRODUKT[a.id].art === 'topf' ? ' <i>neues Getränk</i>' : ' <i>neue Leckerei</i>')   /* 25.10.: Lebkuchen und Crêpe sind kein Getränk */ : a.tab === 'wichtel' ? ' <i>Helfer</i>' : ZL.istMeilenstein(a) ? ' <i>für den Stand</i>' : ''}`;
    // 25.10.: so hoch wie die Knöpfe daneben - Ziel oben, darunter klein „Nächstes · noch N ★"
    b.innerHTML = `<span class="mitte"><span class="was">${was}</span><small>Nächstes${bereit ? '' : ` · noch ${zielZahl(weiter.kosten - S.st.geld)}`}</small></span>`
      + (bereit ? '<span class="los">Los ▸</span>' : '')
      + `<span class="fort"><span style="width:${Math.round(Math.max(0, Math.min(1, S.st.geld / weiter.kosten)) * 100)}%"></span></span>`;
    b.classList.toggle('bereit', bereit);
    b.classList.remove('versteckt');
    $('#huelle').style.setProperty('--ziel-unten', (b.offsetTop + b.offsetHeight) + 'px');
    return;
  }
  if (!z) { b.classList.add('versteckt'); return; }
  const zahl = z.ziel > 1 ? ` <i>${z.stand()}/${z.ziel}</i>` : '';
  const nochNicht = k && !bereit ? ` · noch ${zielZahl(k.kosten - S.st.geld)}` : '';
  // Fortschrittsbalken an der Unterkante: Sterne bis zum nächsten Kauf,
  // sonst wie weit das Ziel selbst ist
  const anteil = bereit ? 1 : k ? S.st.geld / k.kosten : z.anteil ? z.anteil() : z.stand() / z.ziel;
  b.innerHTML = `<span class="mitte"><span class="was">${z.text}${zahl}</span><small>Ziel ${ZL.nummer()}/${ZL.ZIELE.length}${nochNicht}</small></span>`
    + (bereit ? '<span class="los">Los ▸</span>' : `<span class="lohn">+${zielZahl(z.lohn)}</span>`)
    + `<span class="fort"><span style="width:${Math.round(Math.max(0, Math.min(1, anteil)) * 100)}%"></span></span>`;
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

// Nachrichtenverlauf (18.10.): Jede Einblendung (außer kurzen Rückmeldungen
// wie "Dafür reichen deine Sterne noch nicht") landet nach ihrem Flug zum
// Knopf oben links im Verlauf. Gemerkt werden die letzten 10, auch über das
// Neuladen hinweg (eigener Schlüssel, nicht im Spielstand).
const NACHR_MAX = 10;
const NACHR_KEY = 'adventshaus.nachrichten';
let nachrichten = [];
try { nachrichten = (JSON.parse(localStorage.getItem(NACHR_KEY)) || []).slice(-NACHR_MAX); for (const m of nachrichten) m.gezeigt = true; } catch (e) { nachrichten = []; }
function nachrSpeichern() { try { localStorage.setItem(NACHR_KEY, JSON.stringify(nachrichten)); } catch (e) { /* egal */ } }
function nachrPunkt() {
  const p = $('#nachrPunkt');
  if (p) p.classList.toggle('versteckt', !nachrichten.some((m) => m.neu && m.gezeigt));
}
function uhrzeit() {
  const d = Z.jetzt();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
export function toast(text, art = 'normal') {
  let eintrag = null;
  if (art !== 'hinweis') {
    eintrag = { text, art, zeit: uhrzeit(), neu: true, gezeigt: false };
    nachrichten.push(eintrag);
    if (nachrichten.length > NACHR_MAX) nachrichten.shift();
    nachrSpeichern();
  }
  // 26.10. (Testbericht: ~30 Einblendungen in den ersten 15 Minuten, sie liefen minutenlang
  // hinterher): Höchstens TOAST_STAU warten. Was darüber ist, fällt weg - kurze Rückmeldungen
  // zuerst; alles andere steht ja schon im Verlauf (Knopf oben links, mit Punkt).
  while (toastWarteschlange.length >= TOAST_STAU) {
    const i = toastWarteschlange.findIndex((w) => w[1] === 'hinweis');
    const [w] = toastWarteschlange.splice(i >= 0 ? i : 0, 1);
    if (w[2]) w[2].gezeigt = true;
  }
  nachrPunkt();
  toastWarteschlange.push([text, art, eintrag]);
  if (!toastT) naechsterToast();
}
const TOAST_STAU = 3;
/** Fenster mit dem Verlauf. Öffnen heißt: alles gelesen. */
function zeigeNachrichten() {
  const liste = nachrichten.slice().reverse();
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = liste.length
    ? liste.map((m) => `<div class="nachr-zeile${m.neu ? ' neu' : ''}"><small>${m.zeit}</small><b>${esc(m.text)}</b></div>`).join('')
    : '<p>Noch keine Nachrichten.</p>';
  for (const m of nachrichten) { m.neu = false; m.gezeigt = true; }
  nachrSpeichern(); nachrPunkt();
  fenster('Nachrichten', `<p class="klein">Die letzten ${NACHR_MAX} Hinweise, neueste oben.</p>` + html, [{ text: 'Schließen' }]);
}
/** Die Einblendung segelt zum Knopf oben links, schrumpft und ist weg. */
function fliegeZumKnopf(e, eintrag) {
  const knopf = $('#nachr');
  const a = e.getBoundingClientRect(), b = knopf.getBoundingClientRect();
  e.style.setProperty('--fx', (b.left + b.width / 2 - (a.left + a.width / 2)) + 'px');
  e.style.setProperty('--fy', (b.top + b.height / 2 - (a.top + a.height / 2)) + 'px');
  e.classList.remove('zeigen'); e.classList.add('fliegt');
  setTimeout(() => {
    if (eintrag) eintrag.gezeigt = true;
    nachrPunkt();
    knopf.classList.remove('huepft'); void knopf.offsetWidth; knopf.classList.add('huepft');
  }, 560);
}
function naechsterToast() {
  const n = toastWarteschlange.shift();
  const e = $('#toast');
  if (!n) { e.classList.remove('zeigen'); toastT = null; return; }
  e.classList.remove('fliegt'); e.style.removeProperty('--fx'); e.style.removeProperty('--fy');
  e.textContent = n[0];
  // Nicht über dem Kopf von Laden/Kalender/Menü und nicht über einer
  // Hinweisblase oben: dann weiter nach unten bzw. unter die Blase
  const tipp = document.getElementById('tipp');
  const tippOben = !tipp.classList.contains('versteckt') && tipp.style.top;
  e.style.top = '';
  if (tippOben) e.style.top = (tipp.offsetTop + tipp.offsetHeight + 6) + 'px';
  e.className = 'zeigen ' + n[1];
  const dauer = n[1] === 'hinweis' ? 1800 : n[1] === 'neu' ? 3600 : 2600;
  toastT = setTimeout(() => {
    if (n[2]) { fliegeZumKnopf(e, n[2]); toastT = setTimeout(naechsterToast, 650); }
    else { e.classList.remove('zeigen'); toastT = setTimeout(naechsterToast, 250); }
  }, dauer);
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
  // Zurück auf der Karte: Zähler und Führung auf den neuen Stand bringen
  // (sonst pulsierte nach dem Kauf noch der Supermarkt)
  if (KA.istOffen()) { const fu = fuehrung(); KA.aktualisiere(fu ? ORT_FUER_TAB[fu.tab] : null); }
}

// ---------------------------------------------------------------------------
// Laden
// ---------------------------------------------------------------------------
/**
 * Seit 09.10. gibt es keinen Laden mit Reitern mehr: Jedes Geschäft ist ein
 * ORT auf der Karte (karte.js) und öffnet sich hier mit seinem Namen als
 * Titel. „Haus schmücken" (früher „Mein Haus") ist eigenständig und öffnet
 * sich durch Antippen des Hauses (oeffneMeinHaus).
 */
export function oeffneLaden(tab, zeigeId, modus) {
  // Einführung „erstes Getränk / erste Deko": gleich zur richtigen Zeile -
  // auch, wenn man über die Karte zum richtigen Ort gelaufen ist
  const fu = fuehrung();
  const f = (!tab && !zeigeId && !modus && fu) || (fu && tab === fu.tab && !modus ? fu : null);
  if (f) { tab = f.tab; zeigeId = f.id; }
  if (tab) ladenTab = tab;
  ladenModus = modus === 'haus' ? 'haus' : 'kaufen';
  const ort = (C.TABS.find((x) => x.id === ladenTab) || {}).name || 'Einkaufen';
  oeffneBlatt('laden', ladenModus === 'haus' ? 'Haus schmücken' : ort);
  const kopf = $('#blattTabs');
  kopf.innerHTML = '';
  kopf.classList.add('versteckt');
  $('#blatt').dataset.modus = ladenModus;
  // Oben ein Bild des Geschäfts, wie es auf der Karte steht (09.10.)
  if (ladenModus === 'kaufen') {
    const bild = document.createElement('canvas');
    bild.className = 'ort-bild';
    // Erst einhängen, dann zeichnen: die Breite richtet sich nach dem Platz (fein.js, FEIN)
    kopf.appendChild(bild); kopf.classList.remove('versteckt');
    if (!KA.vignette(bild, ladenTab)) { bild.remove(); kopf.classList.add('versteckt'); }
  }
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

// ---------------------------------------------------------------------------
// Die Übersichtskarte (karte.js)
// ---------------------------------------------------------------------------
/** Ort für ein Geschäft (für die Führung: welcher Ort pulsiert?). */
const ORT_FUER_TAB = { super: 'super', markt: 'dorf', baumarkt: 'bau', wichtel: 'wichtel' };
export function oeffneKarte(hervor) {
  schliesseBlatt();
  const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 1;
  const hoehe = Math.round($('#landkarte').parentElement.clientHeight / px) - C.LEISTE;
  const fu = fuehrung();
  KA.oeffne(hoehe, amOrt, hervor || (fu ? ORT_FUER_TAB[fu.tab] : null));
}
export function schliesseKarte() { schliesseBlatt(); KA.schliesse(); }
function amOrt(o) {
  T.spiele('klick');
  if (o.id === 'haus') { KA.schliesse(); return; }
  if (o.tab) { oeffneLaden(o.tab); return; }
  if (o.spiel === 'lichtung') { zeigeLichtung(); return; }
  if (o.spiel === 'baum') { zeigeBaumspiel(); return; }
  if (o.id === 'baumschule') { zeigeBaumschule(); return; }
  if (o.spiel === 'berg') { zeigeBergspiel(); return; }
  if (o.spiel === 'eis') { zeigeEisbahn(); return; }
  if (o.spiel === 'back') { zeigeBackstube(); return; }
  if (o.spiel === 'schnee') { zeigeSchneeball(); return; }
  if (o.markt) { zeigeMarkt(); return; }
  if (o.bald) fenster(o.name, `<p>${o.bald}</p><p class="klein">Kommt bald!</p>`);
}
/**
 * Ein Minispiel ist neu auf der Karte (10.10., Minispiele kommen nach und
 * nach). Einmal je Spiel, aus main.js, wenn gerade nichts offen ist.
 */
const MINI_NEU_TEXT = {
  baum: 'Am <b>Christbaumverkauf</b> wollen Kunden ihren Baum: richtig aussuchen, sägen, ins Netz und aufs Autodach. Gleich daneben aufgemacht: die <b>Baumschule</b> - dort ziehst du eigene Tannen für den Verkauf.',
  back: 'In der <b>Backstube</b> stichst du Plätzchen aus, backst sie goldbraun und verzierst sie. Was du bäckst, kommt in die Plätzchendose auf deinem Stand.',
  eis: 'Auf der <b>Eisbahn</b> drehst du deine Runden - mit Sprüngen und Tricks.',
  berg: 'Am <b>Schlittenberg</b> saust du im Wok den Hang hinunter, sammelst Sterne und weichst Tannen und Steinen aus.',
  lichtung: 'Auf der <b>Waldlichtung</b> fütterst du Hasen, Eichhörnchen und Rehe.',
  schnee: 'Auf der <b>Schneeballwiese</b> verstecken sich kleine Grummel hinter Schneewällen - wirf sie ab! Aber Vorsicht: Die Wichtel spielen mit und wollen nicht getroffen werden.',
};
export function zeigeMiniNeu(name) {
  const o = KA.ORTE.find((x) => x.spiel === name);
  if (!o) return;
  T.spiele('spezial');
  fenster(`Neu: ${o.name}!`, `
    <p>${MINI_NEU_TEXT[name] || ''}</p>
    <p class="klein">Ab heute auf der Karte. Es bringt Sterne und besondere Deko fürs Haus.</p>`,
  [{ text: 'Später', neben: true }, { text: 'Hingehen', aktion: () => { schliesseFenster(); oeffneKarte(o.id); return false; } }]);
}

// ---------------------------------------------------------------------------
// Minispiel Waldlichtung (lichtung.js)
// ---------------------------------------------------------------------------
function spielHoehe() {
  const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 1;
  return Math.round($('#minispiel').parentElement.clientHeight / px);
}
function zeigeLichtung() {
  miniFenster('Waldlichtung', {
    dauer: C.LICHTUNG_DAUER, deko: C.LICHTUNG_DEKO.find((d) => !S.st.kalDeko[d.id]),
    schritte: [
      'Hasen, Eichhörnchen und Rehe ziehen vorbei: <b>Tippe sie an</b>, um sie zu füttern.',
      'Schnell hintereinander gibt eine <b>Kette bis ×5</b>.',
      'Ganz selten schaut ein <b>besonderer Gast</b> vorbei.',
    ] },
  [{ text: 'Später', neben: true }], 'lichtung', starteLichtung);
}
export function starteLichtung(stufeNr = 1) {
  C.MINI_SPECIAL.laeuft = S.specialHeute();   // Special des Tages: schwerer (nur in dieser Runde)
  LI.starte(spielHoehe(), (punkte, n, arten) => {
    LI.schliesse(); S.zaehleTiere(arten); S.lichtungRundeVorbei();
    const selten = Object.keys(arten || {}).find((a) => LI.SELTENE[a]);
    miniErgebnis('lichtung', punkte, `${n} Tiere gefüttert${selten ? ` - sogar ein ${LI.SELTENE[selten]}!` : ''}`, 'Gut gefüttert!', () => starteLichtung(stufeNr));
  }, stufeNr, S.lichtungSelten());
}
/**
 * Startfenster eines Minispiels mit drei Knöpfen für die Schwierigkeit
 * (10.10.). Die zuletzt gewählte ist hervorgehoben (`st.miniStufe[name]`).
 */
/*
 * Aufbau seit 24.10. (Nutzerwunsch: „manche Fenster sehr überladen, viel Kleingedrucktes"):
 * Bild · Special · drei Kärtchen (Dauer, Rekord, Sternerunden) · eine Zeile Extra · Anleitung
 * als kurze Schritte. Die Anleitung steht nur beim ERSTEN Mal offen da (`st.anleitung[name]`,
 * gesetzt beim Start; wer schon einen Rekord hat, gilt als kennend) - danach klappt sie der
 * Knopf „Anleitung" auf. `o`: { schritte: [html], dauer, deko (nächstes Deko-Stück), zusatz
 * (html, immer sichtbar), mehr (Element in der Anleitung, z. B. das Rezeptbuch) }.
 */
/**
 * Erklärung, die nur beim ersten Öffnen offen dasteht (24.10.), danach hinter „Wie geht das? ▾".
 * Gibt HTML zurück; `erklaerungKnopf(box)` macht den Knopf im fertigen Fenster lebendig.
 * Gemerkt in st.anleitung[key] - gleicher Speicher wie die Minispiel-Anleitungen.
 */
function erklaerung(key, html, titel = 'Wie geht das?') {
  const gesehen = !!(S.st.anleitung && S.st.anleitung[key]);
  if (!gesehen) { S.st.anleitung = { ...(S.st.anleitung || {}), [key]: true }; S.speichere(); }
  return gesehen
    ? `<button class="anl-knopf" data-titel="${titel}">${titel} ▾</button><div class="mini-anl versteckt">${html}</div>`
    : `<div class="mini-anl">${html}</div>`;
}
function erklaerungKnopf(box) {
  for (const knopf of box.querySelectorAll('.anl-knopf[data-titel]')) knopf.onclick = () => {
    T.spiele('klick');
    const zu = knopf.nextElementSibling.classList.toggle('versteckt');
    knopf.textContent = `${knopf.dataset.titel} ${zu ? '▾' : '▴'}`;
  };
}
function miniFenster(titel, o, knoepfe, name, starte) {
  // Erst wählen, dann starten (11.10., Nutzerwunsch): Die Stufenknöpfe
  // markieren nur, gestartet wird über den eigenen Start-Knopf
  let gewaehlt = (S.st.miniStufe || {})[name] ?? 1;
  const merke = () => { S.st.anleitung = { ...(S.st.anleitung || {}), [name]: true }; S.speichere(); };
  const start = { text: 'Start', aktion: () => { merke(); setTimeout(() => starte(gewaehlt), 60); } };
  // Oben das Ortsbild wie bei den Läden (11.10.)
  // Special des Tages (24.10.): goldener Streifen oben
  const sp = S.specialHeute() === name
    ? `<p class="special-streifen">✦ Special heute: <b>doppelte Sterne</b> - dafür schwerer: ${C.SPECIAL_TEXT[name]}</p>` : '';
  const rest = S.miniRest(name), best = S.miniRekord(name);
  const erstes = !(S.st.anleitung && S.st.anleitung[name]) && !best;
  const zahl = (n) => n.toLocaleString('de-DE');
  const chips = `<div class="mini-chips">
      <span><canvas data-ico="uhr"></canvas><b>${o.dauer} s</b></span>
      <span><canvas data-ico="pokal"></canvas>Rekord <b>${zahl(best)}</b></span>
      <span><canvas data-ico="stern"></canvas>${rest ? `<b>${rest}</b>&nbsp;${rest === 1 ? 'Runde' : 'Runden'}` : 'morgen&nbsp;wieder'}</span>
    </div>`;
  const ziel = o.deko ? `<p class="mini-ziel">Neues Deko-Stück ab <b>${zahl(o.deko.ab)}</b> Punkten Rekord</p>` : '';
  const anl = `<ol class="mini-anleitung">${o.schritte.map((s) => `<li>${s}</li>`).join('')}</ol>${o.mehr ? '<div class="anl-mehr"></div>' : ''}`;
  const html = chips + (o.zusatz || '') + ziel
    + (erstes ? `<div class="mini-anl">${anl}</div>` : `<button class="anl-knopf">Anleitung ▾</button><div class="mini-anl versteckt">${anl}</div>`);
  const box = fenster(titel, '<canvas class="fenster-bild"></canvas>' + sp + html + '<p class="stufen-titel">Schwierigkeit</p><div class="stufen"></div>', [...knoepfe, start]);
  KA.vignette(box.querySelector('canvas.fenster-bild'), name);
  for (const cv of box.querySelectorAll('.mini-chips canvas[data-ico]')) zeichneSymbol(cv, cv.dataset.ico);
  if (o.mehr) box.querySelector('.anl-mehr').appendChild(o.mehr());
  const knopf = box.querySelector('.anl-knopf');
  if (knopf) knopf.onclick = () => {
    T.spiele('klick');
    const zu = box.querySelector('.mini-anl').classList.toggle('versteckt');
    knopf.textContent = zu ? 'Anleitung ▾' : 'Anleitung ▴';
  };
  const reihe = box.querySelector('.stufen');
  C.MINI_STUFEN.forEach((stufe, i) => {
    // 26.10.: „×" nur noch für Sterne - die Stufe sagt, wie viele Punkte es gibt
    const b = el('button', 'k stufe' + (i === gewaehlt ? ' gewaehlt' : ''), `${stufe.name}<small>${Math.round(stufe.punkte * 100)}&nbsp;% Punkte</small>`);
    b.onclick = () => {
      T.spiele('klick');
      gewaehlt = i;
      for (const x of reihe.children) x.classList.toggle('gewaehlt', x === b);
      S.st.miniStufe = { ...(S.st.miniStufe || {}), [name]: i };
      S.speichere();
    };
    reihe.appendChild(b);
  });
  return box;
}
/** Ergebnisfenster für jedes Minispiel: Punkte, Rekord, Sterne, neue Deko. */
function miniErgebnis(name, punkte, zeile, titel, nochmal, danach) {
  C.MINI_SPECIAL.laeuft = null;
  const e = S.miniErgebnis(name, punkte);
  const extra = danach ? danach() : '';
  const deko = e.neu.map((d) => `<p class="bonus">Neu für dein Haus: <b>${d.name}</b> (♥ +${d.stimmung})</p>`).join('');
  fenster(e.rekord ? 'Neuer Rekord!' : punkte > 0 ? titel : 'Nächstes Mal!', `
    <p>${zeile}</p>
    <p class="summe">${punkte.toLocaleString('de-DE')} Punkte</p>
    ${e.sterne ? `<p class="bonus">+ ${S.formatGeld(e.sterne)}${e.special ? ' (Special: doppelt!)' : ''}</p>` : ''}
    <p class="mini-ziel">Rekord <b>${e.best.toLocaleString('de-DE')}</b>${e.sterne ? (e.rest ? ` · heute noch <b>${e.rest}</b> ${e.rest === 1 ? 'Runde' : 'Runden'} mit Sternen` :' · das war die letzte Sternerunde für heute') : punkte > 0 ? ' · heute keine Sterne mehr' : ' · ohne Punkte zählt die Runde nicht'}</p>
    ${deko}${extra}`,
  // Neue Deko: gleich ansehen - auf der Karte sähe man das Funkeln am Haus nicht
  e.neu.length
    ? [{ text: 'Nochmal', neben: true, aktion: () => { setTimeout(nochmal, 60); } },
      { text: 'Ansehen', aktion: () => { schliesseKarte(); for (const d of e.neu) { const o = ortVon(d.id); if (o) funkeln(o.x, o.y, `+${d.stimmung} ♥`); } } }]
    : [{ text: 'Zur Karte', neben: true }, { text: 'Nochmal', aktion: () => { setTimeout(nochmal, 60); } }]);
}

// ---------------------------------------------------------------------------
// Minispiel Christbaumverkauf (christbaum.js)
// ---------------------------------------------------------------------------
function zeigeBaumspiel() {
  const ware = S.baumschule().ware.length;
  miniFenster('Christbaumverkauf', {
    dauer: C.BAUM_DAUER, deko: C.BAUM_DEKO.find((d) => !S.st.kalDeko[d.id]),
    zusatz: ware ? `<p class="bonus">${ware} eigene ${ware === 1 ? 'Baum steht' : 'Bäume stehen'} golden im Feld - verkauft gibt es dreifache Punkte!</p>` : '',
    schritte: [
      'Die <b>Sprechblase</b> zeigt, welche Größe und Sorte der Kunde will.',
      'Baum antippen, <b>3× sägen</b>, <b>3× aufs Netz</b>, dann <b>aufs Auto</b>.',
      'Schnell und ohne Fehler gibt eine <b>Kette bis ×3</b>.',
    ] },
  [{ text: 'Später', neben: true }], 'baum', starteBaumspiel);
}
export function starteBaumspiel(stufeNr = 1) {
  C.MINI_SPECIAL.laeuft = S.specialHeute();   // Special des Tages: schwerer (nur in dieser Runde)
  CB.starte(spielHoehe(), (punkte, n, eigene = []) => {
    CB.schliesse(); S.eigeneVerkauft(eigene);
    miniErgebnis('baum', punkte, `${n} ${n === 1 ? 'Baum' : 'Bäume'} verkauft${eigene.length ? `, davon ${eigene.length} aus deiner Baumschule` : ''}`, 'Gut verkauft!', () => starteBaumspiel(stufeNr));
  }, stufeNr, S.baumschule().ware);
}

/**
 * Baumschule (22.10.): vier Beete hinter dem Verkaufsplatz. Gießen und Düngen
 * gelten für alle Beete und gehen je einmal am Tag; ohne beides wachsen die
 * Bäume trotzdem, nur langsamer. Fertige Bäume erntet man - sie stehen dann im
 * Minispiel golden im Feld. Manchmal sitzt ein Eichhörnchen in einem Baum.
 */
const BS_W = 132, BS_H = 64, BEET_X = [18, 50, 82, 114], BEET_Y = 54;
const SORTE_KURZ = { nordmann: 'Nordmann', blau: 'Blaufichte', fichte: 'Fichte' };
export function zeigeBaumschule() {
  const box = fenster('Baumschule', `
    <canvas class="futter-szene baumschule-szene" width="${BS_W}" height="${BS_H}"></canvas>
    ${erklaerung('baumschule', `<ol class="mini-anleitung">
      <li><b>Pflanze</b> eine Tanne in ein freies Beet.</li>
      <li>Ab dem nächsten Tag einmal täglich <b>gießen</b> und <b>düngen</b>: Ohne Pflege dauert es ${Math.round(1 / C.BAUMSCHULE_JE_TAG)} Tage, mit Gießen 3, mit beidem 2. Nichts verdorrt.</li>
      <li>Fertige Bäume <b>erntest</b> du: Im Christbaumverkauf stehen sie golden und bringen <b>dreifache Punkte</b>.</li></ol>`)}
    <div class="beete"></div>
    <p class="mini-ziel bs-text"></p>`,
  [{ text: 'Gießen', aktion: () => { if (S.giesse()) { toast('Gegossen - die Bäume wachsen heute schneller.', 'gut'); } neu(); return false; } },
    { text: 'Düngen', neben: true, aktion: () => {
      if (!S.kannDuengen()) return false;
      if (!S.duenge()) { T.spiele('falsch'); toast('Dafür reichen deine Sterne noch nicht.', 'hinweis'); return false; }
      toast('Gedüngt - heute ein ordentlicher Schub!', 'gut'); neu(); return false;
    } },
    { text: 'Schließen', neben: true }]);
  const cv = box.querySelector('canvas'), c = cv.getContext('2d');
  erklaerungKnopf(box);
  const [kGiessen, kDuengen] = box.querySelectorAll('.k');
  const beete = box.querySelector('.beete'), text = box.querySelector('.bs-text');
  const zu = { eichBis: 0 };
  function neu() {
    const B = S.baumschule();
    beete.innerHTML = '';
    B.beete.forEach((b, i) => {
      const karte = el('div', 'beet');
      if (!b) {
        karte.innerHTML = `<b>Beet ${i + 1}</b><span>leer - was pflanzen?</span>`;
        const reihe = el('div', 'beet-wahl');
        for (const art of Object.keys(SORTE_KURZ)) {
          const k = el('button', 'k k--neben', SORTE_KURZ[art]);
          k.onclick = () => { S.pflanze(i, art); neu(); };
          reihe.appendChild(k);
        }
        karte.appendChild(reihe);
      } else {
        const w = S.beetWachs(b), st = ['Setzling', 'klein', 'mittel', 'fertig'][S.beetStufe(b)];
        karte.innerHTML = `<b>${SORTE_KURZ[b.art]}</b><span>${st} · ${Math.round(w * 100)} %</span><div class="beet-balken"><i style="width:${Math.round(w * 100)}%"></i></div>`;
        if (w >= 1) {
          // Lager voll (23.10., Betatest): sagen, warum es nicht geht
          const voll = B.ware.length >= C.BAUMSCHULE_WARE_MAX;
          const k = el('button', 'k k--kauf', voll ? 'Erst verkaufen' : 'Ernten');
          k.disabled = voll;
          k.onclick = () => { if (S.ernte(i)) toast(`${SORTE_KURZ[b.art]} geerntet - steht jetzt golden im Christbaumverkauf (dreifache Punkte)!`, 'gut'); neu(); };
          karte.appendChild(k);
        }
      }
      beete.appendChild(karte);
    });
    kGiessen.disabled = !S.kannGiessen();
    // Nur frisch Gepflanztes da (23.10.): gießen und düngen erst morgen
    const erstMorgen = S.heuteGepflanzt();
    kGiessen.textContent = B.gegossen === S.heuteNr() ? 'Heute gegossen' : !S.kannGiessen() && erstMorgen ? 'Gießen ab morgen' : 'Gießen';
    kDuengen.disabled = !S.kannDuengen();
    kDuengen.textContent = S.kannDuengen() ? `Düngen · ★ ${S.formatGeld(S.duengerPreis()).replace(' Sterne', '')}` : B.geduengt !== S.heuteNr() && erstMorgen ? 'Düngen ab morgen' : 'Düngen';
    const ware = B.ware.length;
    // 24.10.: die Dauer steht in der Erklärung oben - hier nur noch der Lagerstand
    text.innerHTML = (ware ? `<b>${ware} geerntete${ware === 1 ? 'r Baum wartet' : ' Bäume warten'} im Verkauf.</b>` : '')
      + (ware >= C.BAUMSCHULE_WARE_MAX ? `<br>Mehr als ${C.BAUMSCHULE_WARE_MAX} passen nicht ins Lager - verkauf sie erst im Christbaumverkauf (ein goldener Baum je Kunde).` : '');
  }
  neu();
  cv.onclick = (e) => {
    const rc = cv.getBoundingClientRect(), x = (e.clientX - rc.left) / rc.width * BS_W, y = (e.clientY - rc.top) / rc.height * BS_H;
    const i = S.eichhoernchen();
    if (i >= 0 && zu.sichtbar && Math.abs(x - zu.ex) < 10 && Math.abs(y - zu.ey) < 10) {
      const b = S.fangeEichhoernchen();
      if (b) { T.spiele('spezialKasse'); toast(`Ein Eichhörnchen! +${S.formatGeld(b)}`, 'gut'); zu.fang = { x: zu.ex, y: zu.ey, t: 0, text: '+' + b }; }
    }
  };
  let letzt = performance.now();
  (function schleife(now) {
    if (!cv.isConnected || document.querySelector('#modal').classList.contains('versteckt')) return;
    const dt = Math.min(0.1, (now - letzt) / 1000); letzt = now;
    zeichneBaumschule(c, now / 1000, zu, dt);
    requestAnimationFrame(schleife);
  })(letzt);
}
function zeichneBaumschule(c, t, zu, dt) {
  const B = S.baumschule(), winter = Z.schnee() > 0, hell = Z.licht().hell;
  for (let y = 0; y < BS_H; y++) r(c, 0, y, BS_W, 1, mische(mische('#141c3c', '#2c3a6a', y / BS_H), mische('#9cc0e4', '#e2eef8', y / BS_H), hell));
  // Waldsaum hinten, Boden, Zaun
  for (let x = -2; x < BS_W + 4; x += 7) { const h = 8 + ((x * 7) % 5); for (let i = 0; i < h; i++) { const w = Math.round((i + 1) / h * 3); r(c, x - w, 26 - h + i, w * 2 + 1, 1, winter ? '#5a7a72' : '#3e6a48'); } }
  r(c, 0, 26, BS_W, BS_H - 26, winter ? '#e4ecf3' : '#7aa458');
  for (let y = 27; y < BS_H; y++) for (let x = 0; x < BS_W; x++) if (Z.hash(x * 17 + y * 131) < 0.06) p(c, x, y, winter ? '#d2dce8' : '#6a9448');
  for (let x = 2; x < BS_W; x += 6) { r(c, x, 22, 1, 7, '#a8784a'); p(c, x, 21, '#a8784a'); }
  r(c, 0, 24, BS_W, 1, '#8a5a32');
  const nass = B.gegossen === S.heuteNr();
  zu.sichtbar = false;
  const eich = S.eichhoernchen();
  B.beete.forEach((b, i) => {
    const x = BEET_X[i];
    // Beet: Erdhügel mit Furchen (nass dunkler), Holzrand
    r(c, x - 12, BEET_Y - 2, 25, 5, nass ? '#4a3020' : '#6a4a30'); r(c, x - 11, BEET_Y - 3, 23, 1, nass ? '#5a3a26' : '#7a5838');
    for (let k = -10; k <= 10; k += 4) p(c, x + k, BEET_Y, nass ? '#3a2418' : '#5a3a24');
    r(c, x - 13, BEET_Y + 3, 27, 2, '#8a5a32'); r(c, x - 13, BEET_Y + 3, 27, 1, '#a8784a');
    if (winter) for (let k = -11; k <= 11; k++) if (Z.hash(k * 3 + i) < 0.4) p(c, x + k, BEET_Y - 3, '#f6f9fc');
    if (!b) { r(c, x - 1, BEET_Y - 6, 3, 3, '#c8a070'); p(c, x, BEET_Y - 7, '#a8784a'); return; }   // Schildchen
    const st = S.beetStufe(b);
    if (st === 0) {
      // Setzling: zwei kleine Nadelbüschel
      r(c, x, BEET_Y - 5, 1, 3, '#5a3a22'); p(c, x - 1, BEET_Y - 5, '#3a7a3a'); p(c, x + 1, BEET_Y - 5, '#3a7a3a'); p(c, x, BEET_Y - 6, '#4a9a48'); p(c, x - 1, BEET_Y - 4, '#2e6a30'); p(c, x + 1, BEET_Y - 4, '#2e6a30');
    } else CB.maleBaum(c, x, BEET_Y - 2, b.art, st - 1, winter, st === 3);
    if (st === 3 && Math.sin(t * 4 + i) > 0.4) p(c, x + 4, BEET_Y - 22, '#fff6c0');
    // Eichhörnchen: lugt alle paar Sekunden seitlich aus dem Baum
    if (i === eich && st >= 1) {
      const zyklus = (t + i * 1.3) % 4.2, raus = zyklus < 1.6;
      if (raus) {
        const h = [0, 15, 21, 28][st], ex = x + 4 + (zyklus < 0.2 ? -2 : 0), ey = BEET_Y - 2 - Math.round(h * 0.45);
        r(c, ex, ey - 2, 3, 3, '#c86a2a'); p(c, ex + 2, ey - 1, '#1a1a1a'); p(c, ex, ey - 3, '#a8521e'); p(c, ex + 2, ey - 3, '#a8521e');   // Kopf mit Ohren
        r(c, ex + 1, ey + 1, 2, 3, '#c86a2a'); p(c, ex + 2, ey + 2, '#f0d8b0');                                                          // Körper
        const sw = Math.round(Math.sin(t * 6) * 1);
        r(c, ex - 2 + sw, ey - 4, 2, 6, '#d87a32'); p(c, ex - 3 + sw, ey - 4, '#d87a32');                                               // buschiger Schwanz
        zu.sichtbar = true; zu.ex = ex + 1; zu.ey = ey;
      }
    }
  });
  if (zu.fang) { zu.fang.t += dt; pixText(c, zu.fang.text + ' ★', Math.round(zu.fang.x - 8), Math.round(zu.fang.y - 8 - zu.fang.t * 14), '#ffe060'); if (zu.fang.t > 1.1) zu.fang = null; }
  if (winter) for (let i = 0; i < 10; i++) p(c, Math.floor((i * 37 + Math.sin(t + i) * 4 + t * 6) % BS_W), Math.floor((i * 23 + t * (12 + (i % 4) * 4)) % BS_H), '#ffffff');
  if (hell < 0.9) { c.fillStyle = `rgba(14,20,50,${(0.9 - hell) * 0.4})`; c.fillRect(0, 0, BS_W, BS_H); }
}

// ---------------------------------------------------------------------------
// Minispiel Schneeballschlacht (schneeball.js, 12.10.)
// ---------------------------------------------------------------------------
function zeigeSchneeball() {
  miniFenster('Schneeballwiese', {
    dauer: C.SCHNEE_DAUER, deko: C.SCHNEE_DEKO.find((d) => !S.st.kalDeko[d.id]),
    schritte: [
      '<b>Tippe die Grummel an</b>, die hinter den Wällen auftauchen. Mit Kochtopf brauchen sie zwei Treffer, der mit dem Sack bringt am meisten.',
      '<b>Die Wichtel nicht treffen!</b>',
      'Fliegt ein Schneeball auf dich zu: <b>schnell antippen</b>, dann zerplatzt er.',
    ] },
  [{ text: 'Später', neben: true }], 'schnee', starteSchneeball);
}
export function starteSchneeball(stufeNr = 1) {
  C.MINI_SPECIAL.laeuft = S.specialHeute();   // Special des Tages: schwerer (nur in dieser Runde)
  SW.starte(spielHoehe(), (punkte, treffer, wichtel) => {
    SW.schliesse();
    miniErgebnis('schnee', punkte, `${treffer} Grummel getroffen${wichtel ? ` · ${wichtel} Wichtel erwischt - Aua!` : ' · kein Wichtel getroffen!'}`, 'Volltreffer!', () => starteSchneeball(stufeNr));
  }, stufeNr);
}

// ---------------------------------------------------------------------------
// Minispiel Eisbahn (schlittschuh.js)
// ---------------------------------------------------------------------------
function zeigeEisbahn() {
  miniFenster('Eisbahn', {
    dauer: C.EIS_DAUER, deko: C.EIS_DEKO.find((d) => !S.st.kalDeko[d.id]),
    schritte: [
      '<b>Tippen = springen</b> - über Schneemänner, Steine, Holz und Eislöcher.',
      '<b>In der Luft wischen</b> = Trick: hoch Salto, links Pirouette, rechts Grätsche.',
      'Mehrere Tricks in einem Sprung sind eine <b>Kombo</b> - aber vor dem Landen fertig drehen!',
    ] },
  [{ text: 'Später', neben: true }], 'eis', starteEisbahn);
}
export function starteEisbahn(stufeNr = 1) {
  C.MINI_SPECIAL.laeuft = S.specialHeute();   // Special des Tages: schwerer (nur in dieser Runde)
  EB.starte(spielHoehe(), (punkte, kombi) => {
    EB.schliesse();
    miniErgebnis('eis', punkte, kombi > 1 ? `Beste Kombo: ${kombi} Tricks in einem Sprung` : 'Schön gefahren!', 'Gut gelaufen!', () => starteEisbahn(stufeNr));
  }, stufeNr);
}

// ---------------------------------------------------------------------------
// Minispiel Backstube (backstube.js, 10.10.)
// ---------------------------------------------------------------------------
/** Rezeptbuch: bekannte Rezepte mit Bild, die anderen als Platzhalter. */
function rezeptbuch() {
  const best = S.miniRekord('back');
  const buch = el('div', 'rezeptbuch');
  for (const rz of C.BACK_REZEPTE) {
    const da = best >= rz.ab;
    const k = el('div', 'rezept' + (da ? '' : ' zu'));
    k.innerHTML = `<div class="ak-bild"><canvas width="20" height="18"></canvas></div><b>${da ? trennbar(rz.name) : '???'}</b><small>${da ? `${C.dekoListe(rz.deko).map((d) => C.BACK_DEKOS[d].name).join(', ')}` : `Rekord ab ${rz.ab.toLocaleString('de-DE')}`}</small>`;
    const ctx = k.querySelector('canvas').getContext('2d');
    BS.zeichnePlaetzchen(ctx, 1, 1, rz.form, 'golden', da ? rz.deko : null, 2);
    if (!da) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = '#6a5a4a'; ctx.fillRect(0, 0, 20, 18); }
    buch.appendChild(k);
  }
  return buch;
}
function zeigeBackstube() {
  const n = S.dose().length, best = S.miniRekord('back');
  const neuesRezept = C.BACK_REZEPTE.find((rz) => best < rz.ab);
  miniFenster('Backstube', {
    dauer: C.BACK_DAUER,
    zusatz: `<p class="mini-ziel">Plätzchendose: <b>${n ? `${n} drin` : 'leer'}</b>${neuesRezept ? ` · neues Rezept ab <b>${neuesRezept.ab.toLocaleString('de-DE')}</b> Punkten` : ''}</p>`,
    schritte: [
      'Die <b>Sprechblase</b> zeigt, welches Plätzchen der Kunde will.',
      'Richtige <b>Form</b> tippen, im <b>gelben Bereich</b> aus dem Ofen holen, richtige <b>Verzierung</b> tippen.',
      `Gebackenes kommt in die <b>Plätzchendose</b>: Jeder Gast, den du selbst bedienst, nimmt eins und zahlt ${Math.round(C.DOSE_BONUS * 100)} % mehr.`,
    ],
    mehr: rezeptbuch },
  [{ text: 'Später', neben: true }], 'back', starteBackstube);
}
export function starteBackstube(stufeNr = 1) {
  C.MINI_SPECIAL.laeuft = S.specialHeute();   // Special des Tages: schwerer (nur in dieser Runde)
  BS.starte(spielHoehe(), (punkte, n, gebacken) => {
    BS.schliesse();
    const vorher = S.backRezepte().length;
    S.fuelleDose(gebacken);
    miniErgebnis('back', punkte, `${n} ${n === 1 ? 'Plätzchen' : 'Plätzchen'} gebacken - ab in die Dose!`, 'Gut gebacken!', () => starteBackstube(stufeNr), () => {
      const neu = S.backRezepte().slice(vorher);
      return neu.map((rz) => `<p class="bonus">Neues Rezept im Buch: <b>${rz.name}</b> - ${rz.text}</p>`).join('');
    });
  }, stufeNr, S.backRezepte());
}

// ---------------------------------------------------------------------------
// Wunschzettel (10.10.): Brief lesen, Dankesbild abholen
// ---------------------------------------------------------------------------
/** Worum es im Brief geht, in Kinderworten. */
function wunschText(b) {
  const name = b.ziel ? esc(S.artikelName(b.ziel)) : '';
  if (b.art === 'deko') return b.v ? `wenn ich an eurem Haus vorbeigehe, wünsche ich mir so sehr, dass ich <b>${name}</b> sehe!` : `bei euch am Haus fehlt noch etwas: <b>${name}</b>! Das wär sooo schön.`;
  if (b.art === 'getraenk') return `ich mag so gerne <b>${name}</b>. Kannst du das an deinem Stand machen? Dann komme ich jeden Tag!`;
  if (b.art === 'santa') return 'ich hab gehört, der <b>Weihnachtsmann</b> versteckt sich manchmal irgendwo auf der Karte. Findest du ihn für mich?';
  if (b.art === 'backen') return `meine Oma sagt, deine Plätzchen sind die besten. <b>Backst du ganz viele?</b> (${C.BRIEF_BACKEN} reichen auch)`;
  return 'ich trau mich noch nicht auf die <b>Eisbahn</b>. Fährst du mal eine Runde und zeigst mir, wie man springt?';
}
function gruss(b) { return `${b.maedchen ? 'Deine' : 'Dein'} ${b.kind} (${b.alter})`; }
/** Erster Buchstabe groß - der Wunschtext beginnt klein, weil er im Brief hinter „Liebes Haus …," steht (25.10.). */
const gross1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
/** Eine Kinderzeichnung: Haus, Sonne, das Kind - und das, was es sich gewünscht hat. */
/**
 * Das Dankesbild wird als 48 x 36 gemalt und per Scale2x auf 96 x 72 gebracht
 * (11.10.) - vorher stand das kleine Bild doppelt bzw. 1,7-fach gezogen im
 * Fenster und im Album, mit gröberen Pixeln als alles andere.
 */
const _dank = document.createElement('canvas');
/**
 * Selbst gemalte Dankesbilder (27.10., Nutzerwunsch): je Kind eine Datei
 * `bilder/dank/<name klein>.png`, 96 x 72, rechts unten frei - dort setzt das Spiel den Wunsch
 * (16 x 16, verdoppelt auf 32 x 32, ab x 62 / y 30). Geladen wird nur, wer in C.DANK_BILDER steht
 * (sonst gäbe es für jedes fehlende Bild einen 404); fehlt eins oder lädt es noch, malt das Spiel selbst.
 */
const dankBilder = new Map();
for (const name of C.DANK_BILDER) {
  const img = new Image();
  img.src = `bilder/dank/${name.toLowerCase()}.png?v=202610281500`;
  dankBilder.set(name.toLowerCase(), img);
}
function eigenesDankesbild(kind) {
  const img = dankBilder.get(String(kind).toLowerCase());
  return img && img.complete && img.naturalWidth ? img : null;
}
export function zeichneDankesbild(ziel, b) {
  const eigen = eigenesDankesbild(b.kind);
  if (eigen) {
    ziel.width = 96; ziel.height = 72;
    const c = ziel.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(eigen, 0, 0, 96, 72);
    // Der Wunsch rechts unten - über eine EIGENE Leinwand je Bild (Safari, siehe unten)
    c.drawImage(scale2x(wunschBild(b), 16, 16, document.createElement('canvas')), 96 - 34, 72 - 42);
    return;
  }
  _dank.width = 48; _dank.height = 36;
  maleDankesbild(_dank, b);
  // 27.10. (gemeldet: im Album zeigten alle Dankesbilder dasselbe - das zuletzt gemalte): Scale2x schreibt
  // jetzt direkt in die Ziel-Leinwand. Vorher ging jedes Bild über DIESELBE Zwischenleinwand per drawImage,
  // und Safari auf dem iPhone kopiert das verzögert (dieselbe Falle wie bei den Kacheln am 19.10.)
  ziel.width = 96; ziel.height = 72;
  scale2x(_dank, 48, 36, ziel);
}
function maleDankesbild(cv, b) {
  const c = cv.getContext('2d', { willReadFrequently: true }), W2 = cv.width, H2 = cv.height;
  let n = [...b.kind].reduce((a, z) => a + z.charCodeAt(0), 0);
  const zz = () => { n = (n * 9301 + 49297) % 233280; return n / 233280; };
  c.fillStyle = '#fffdf4'; c.fillRect(0, 0, W2, H2);
  const krakel = (x, y, w, h, f) => { for (let i = 0; i < h; i++) r(c, x + Math.round(zz() * 1.4 - 0.7), y + i, w, 1, f); };
  // Himmel als Strichel, Wiese als Band
  for (let i = 0; i < 14; i++) r(c, Math.floor(zz() * W2), Math.floor(zz() * 6), 3, 1, '#a8c8ee');
  krakel(0, H2 - 6, W2, 6, '#8ac46a');
  // Sonne mit Strahlen
  r(c, 3, 3, 5, 5, '#ffd040'); for (const [dx, dy] of [[-2, 5], [10, 5], [5, -1], [5, 10], [0, 0], [9, 9], [9, 0], [0, 9]]) p(c, 2 + dx, dy + 1, '#f0b020');
  // Haus
  krakel(10, H2 - 20, 15, 14, ['#d84a3a', '#3a7ac8', '#e8a030', '#c85a9a'][Math.floor(zz() * 4)]);   // jedes Kind malt anders
  for (let i = 0; i < 8; i++) r(c, 9 + i, H2 - 21 - i, 17 - i * 2, 1, '#7a4a2a');
  r(c, 16, H2 - 12, 4, 6, '#5a3a22'); r(c, 12, H2 - 17, 3, 3, '#ffe070'); r(c, 21, H2 - 17, 3, 3, '#ffe070');
  // Das Kind als Strichmännchen mit Herz
  const kx = 27, ky = H2 - 7;
  r(c, kx, ky - 13, 4, 4, '#f2c9a0'); r(c, kx, ky - 14, 4, 1, b.maedchen ? '#c8902c' : '#5a3a22');
  r(c, kx + 1, ky - 9, 2, 5, b.maedchen ? '#e85a8a' : '#3a6ab8'); r(c, kx - 1, ky - 8, 6, 1, '#3a3a44');
  r(c, kx, ky - 4, 1, 4, '#3a3a44'); r(c, kx + 3, ky - 4, 1, 4, '#3a3a44');
  for (const [dx, dy] of [[0, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [1, 3]]) p(c, kx - 1 + dx, ky - 20 + dy, '#e83a4a');
  // Der Wunsch, rechts unten
  c.drawImage(wunschBild(b), W2 - 17, H2 - 21);
  // Rahmen aus Wachsmalstrichen
  c.strokeStyle = '#e8b030'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, W2 - 1, H2 - 1);
}
/** Was sich das Kind gewünscht hat, als 16 x 16 (neue Leinwand je Aufruf). */
function wunschBild(b) {
  const tmp = document.createElement('canvas'); tmp.width = 16; tmp.height = 16;
  const tc = tmp.getContext('2d', { willReadFrequently: true });
  if (b.ziel) { const a = C.ARTIKEL.find((x) => x.id === b.ziel); if (a) zeichneIcon(tmp, a); }
  else if (b.art === 'backen') { BS.zeichnePlaetzchen(tc, 0, 2, 'stern', 'golden', 'guss', 1); BS.zeichnePlaetzchen(tc, 7, 7, 'herz', 'golden', 'schoko', 1); }
  else if (b.art === 'santa') { figurKlein(tc, { typ: 'weihnachtsmann', farben: neueFarben('erwachsen'), phase: 0, laeuft: false }, 8, 15, 0); }
  else { r(tc, 2, 8, 5, 4, '#c83a32'); r(tc, 9, 8, 5, 4, '#3a6ab8'); r(tc, 1, 12, 7, 1, '#c8ccd8'); r(tc, 8, 12, 7, 1, '#c8ccd8'); }
  return tmp;
}
export function zeigeBrief() {
  const B = S.briefe(), b = B.aktiv;
  if (!b) {
    fenster('Briefkasten', `<p>Der Briefkasten ist leer.</p><p class="klein">Ab und zu schreiben dir die Kinder aus dem Dorf. ${B.erfuellt.length ? `${B.erfuellt.length} Dankesbilder hängen schon im Album.` : 'Wer einen Wunsch erfüllt bekommt, malt dir ein Bild.'}</p>`);
    return;
  }
  if (b.dank) {
    T.spiele('spezial');
    const box = fenster(`Danke von ${b.kind}!`, `
      <canvas class="dankesbild" width="48" height="36"></canvas>
      <p class="brief-text">Danke, danke, danke! Ich hab dir was gemalt.<br>${gruss(b)}</p>
      <p class="klein">Das Bild kommt ins Album (Aufträge → Album).</p>`,
    [{ text: 'Ins Album', aktion: () => { const betrag = S.briefDank(); if (betrag) toast(`${b.kind} hat noch selbstgebastelte Sterne dazugelegt: +${S.formatGeld(betrag)}`, 'gut'); } }]);
    zeichneDankesbild(box.querySelector('canvas'), b);
    return;
  }
  T.spiele('tuer');
  S.briefGelesen();
  fenster('Ein Brief!', `<div class="brief"><p>${/^haus\b/i.test(S.st.name || '') ? `Liebes ${esc(S.st.name)}` : `Liebes Haus ${esc(S.st.name || '')}`.trim()},</p><p>${wunschText(b)}</p><p class="brief-gruss">${gruss(b)}</p></div>
    <p class="klein">Kein Zeitdruck - wenn der Wunsch erfüllt ist, bedankt sich ${b.kind}.</p>`, [{ text: 'Mal sehen' }]);
}

// ---------------------------------------------------------------------------
// Minispiel Schlittenberg (schlitten.js)
// ---------------------------------------------------------------------------
function zeigeBergspiel() {
  miniFenster('Schlittenberg', {
    dauer: C.BERG_DAUER, deko: C.BERG_DEKO.find((d) => !S.st.kalDeko[d.id]),
    schritte: [
      'Im Wok den Berg hinunter: <b>Daumen aufs Bild und seitlich ziehen</b> - der Wok folgt.',
      'Weich <b>Tannen, Steinen, Schneemännern</b> und Holzstapeln aus.',
      'Sammle Sterne - <b>je schneller im Ziel</b>, desto mehr Punkte.',
    ] },
  [{ text: 'Später', neben: true }], 'berg', starteBergspiel);
}
export function starteBergspiel(stufeNr = 1) {
  C.MINI_SPECIAL.laeuft = S.specialHeute();   // Special des Tages: schwerer (nur in dieser Runde)
  SB.starte(spielHoehe(), (punkte, zeit, sterne) => {
    SB.schliesse();
    const zeile = zeit != null ? `Im Ziel nach ${zeit.toFixed(1).replace('.', ',')} s · ${sterne} Sterne` : `Nicht ins Ziel geschafft · ${sterne} Sterne`;
    miniErgebnis('berg', punkte, zeile, zeit != null ? 'Geschafft!' : 'Fast!', () => starteBergspiel(stufeNr));
  }, stufeNr);
}

function baueLaden() {
  const liste = $('#blattInhalt');
  liste.innerHTML = '';
  liste.scrollTop = 0;
  zeilen = [];
  // Innerhalb jeder Gruppe in der Reihenfolge, in der die Dinge frei werden.
  // Abschnitte wie in „Haus schmücken" (11.10., einheitlich): Am Haus · Im
  // Garten · Am Stand, der Anstrich gehört zum Haus; Sprungleiste und dunkle
  // Balken, sobald ein Laden mehr als einen Abschnitt hat.
  const abschnittVon = (a) => (a.gruppe === 'Anstrich' ? 'Am Haus' : a.gruppe);
  const REIHE = ['Am Haus', 'Im Garten', 'Am Stand'];
  const rang = (g) => (REIHE.includes(g) ? REIHE.indexOf(g) : REIHE.length);
  const artikel = sortiereNachFreischaltung(C.ARTIKEL.filter((a) => a.tab === ladenTab))
    .map((a, i) => [a, i]).sort((x, y) => rang(abschnittVon(x[0])) - rang(abschnittVon(y[0])) || x[1] - y[1]).map(([a]) => a);
  const abschnitte = [...new Set(artikel.map(abschnittVon))];
  const mitAbschnitten = abschnitte.length > 1;
  let sprung = null;
  if (mitAbschnitten) {
    sprung = el('div', 'haus-sprung');
    for (const g of abschnitte) {
      const b = el('button', 'hs-k', g.replace(/^(Am|Im) /, ''));
      b.onclick = () => { T.spiele('klick'); const z = liste.querySelector(`[data-abschnitt="${g}"]`); if (z) liste.scrollTo({ top: z.offsetTop - sprung.offsetHeight - liste.offsetTop - 8, behavior: 'smooth' }); };
      sprung.appendChild(b);
    }
    liste.appendChild(sprung);
  }
  let gruppe = null;
  if (ladenTab === 'super') {
    liste.appendChild(el('div', 'zeile besessen', `<canvas width="16" height="16" class="ico"></canvas><div class="txt"><b>Sternenpunsch</b><span>Den gibt es von Anfang an. Gäste zahlen 10 Sterne.${rezeptHinweis('gluehwein')}</span></div><div class="knopfplatz"><button class="k k--fertig" disabled><span class="haken">✓</span></button></div>`));
    zeichneIcon(liste.lastChild.querySelector('canvas'), { id: 'gluehwein', produkt: true });
  }
  const neu = S.st.neu || {};
  for (const a of artikel) {
    // Überschrift nur, wo es mehrere Gruppen gibt (11.10.: „Zutaten" im Supermarkt war überflüssig)
    if (mitAbschnitten && abschnittVon(a) !== gruppe) {
      gruppe = abschnittVon(a);
      const h = el('div', 'gruppe haus-abschnitt', gruppe);
      h.dataset.abschnitt = gruppe;
      liste.appendChild(h);
    }
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
      : `<b>${a.name}${neu[a.id] ? ' <i class="neuTag">NEU</i>' : ''}</b><span>${a.text}${rezeptHinweis(a.id)}</span><em class="bonus">${bonusText(a)}</em>`;
    z.appendChild(txt);
    delete neu[a.id];   // gesehen
    const platz = el('div', 'knopfplatz');
    const knopf = el('button', 'k k--kauf');
    knopf.onclick = () => {
      if (S.status(a).fertig) return;
      if (S.kaufe(a.id)) {
        z.classList.add('blitz'); setTimeout(() => z.classList.remove('blitz'), 500);
        const hinweis = (a.id in C.LICHTER || S.istDeko(a) || a.wahl) && !(S.st.tipps && S.st.tipps.meinHaus);
        // 17.10.: „Mein Haus" heißt seit 09.10. „Haus schmücken" und öffnet sich über das Haus
        toast(hinweis ? `${a.name} gekauft! Ein- und ausschalten, Farbe und Varianten: Knopf „Haus“ oben links.` :`${a.name} gekauft!`, 'gut');
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
  if (ladenTab === 'super') rezeptZeilen(liste);
  aktualisiereLaden();
}
/**
 * Rezepte im Supermarkt (27.10., Nutzerwunsch: vorher nur eins je Markttag auf dem Festplatz),
 * in drei Stufen (C.REZEPT_STUFEN: +20 %, nochmal +30 %, nochmal +40 % auf zwei Getränke).
 */
function rezeptZeilen(liste) {
  liste.appendChild(el('div', 'gruppe haus-abschnitt', 'Rezepte'));
  const pz = (f) => `${Math.round(f * 100)}${' '}%`;
  const N = C.REZEPT_STUFEN.length;
  for (const w of C.MARKT_REZEPTE) {
    const stufe = S.rezeptStufe(w.id), voll = stufe >= N;
    const z = el('div', 'zeile' + (voll ? ' besessen' : ''));
    const cv = el('canvas', 'ico'); cv.width = 16; cv.height = 16;
    zeichneIcon(cv, w);
    z.appendChild(cv);
    const namen = w.fuer.map((id) => C.PRODUKT[id].name).join(' und ');
    const jetzt = S.rezeptPlus(w.id), naechst = voll ? null : C.REZEPT_STUFEN[stufe].plus;
    const was = stufe === 0 ? `${namen} bringen dauerhaft ${pz(naechst)} mehr Sterne.`
      : voll ? `${namen} bringen dauerhaft ${pz(jetzt)} mehr Sterne - ganz ausgebaut.`
      : `${namen}: jetzt +${pz(jetzt)}. Stufe ${stufe + 1} bringt nochmal +${pz(naechst)} (dann +${pz(jetzt + naechst)}).`;
    const keinGetraenk = !w.fuer.some((id) => S.hat(id));
    z.appendChild(el('div', 'txt', `<b>${w.name}${stufe ? ` <i>Stufe ${stufe}/${N}</i>` : ''}</b><span>${was}${!voll && keinGetraenk ? ' Du hast noch keins der beiden Getränke.' : ''}</span>`));
    const platz = el('div', 'knopfplatz');
    if (voll) platz.innerHTML = '<button class="k k--fertig" disabled><span class="haken">✓</span></button>';
    else {
      const preis = S.rezeptPreis(w);
      const k = el('button', 'k k--kauf' + (S.st.geld >= preis ? '' : ' gesperrt'), S.formatGeld(preis));
      k.onclick = () => {
        if (!S.kaufeRezept(w.id)) { T.spiele('falsch'); toast('Dafür reichen deine Sterne noch nicht.', 'hinweis'); return; }
        T.spiele('spezial');
        toast(`${w.name} Stufe ${S.rezeptStufe(w.id)}: ${namen} bringen jetzt ${pz(S.rezeptPlus(w.id))} mehr Sterne.`, 'spezial');
        const pos = liste.scrollTop; baueLaden(); liste.scrollTop = pos;
      };
      platz.appendChild(k);
    }
    z.appendChild(platz);
    liste.appendChild(z);
  }
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
  return z;
}
/** Nach Wahl oder Kauf einer Variante: kurz ausblenden und am Haus funkeln lassen. */
function zeigeVariante(platz, text = '') {
  const o = ortVon(platz);
  if (!o) return;
  funkeln(o.x, o.y, text);
  const b = $('#blatt');
  b.classList.add('kurz-weg');
  clearTimeout(kaufZeigenT);
  kaufZeigenT = setTimeout(() => b.classList.remove('kurz-weg'), 2000);
}
/** Das Haus angetippt: „Haus schmücken" (der Bereich Mein Haus). */
export function oeffneMeinHaus() { oeffneLaden(null, null, 'haus'); }
/** Was man geschenkt bekommen hat: Türchen im Kalender und schwere Aufträge. */
function geschenke() {
  return [...Object.values(C.KALENDER_DEKO), ...C.AUFTRAG_DEKO, ...C.HAENDLER_DEKO, ...C.LICHTUNG_DEKO, ...C.MARKT_DEKO, ...C.BAUM_DEKO, ...C.BERG_DEKO, ...C.EIS_DEKO, ...C.SCHNEE_DEKO, ...C.SPECIAL_DEKO, ...C.FINALE_DEKO].filter((d) => S.st.kalDeko[d.id]);
}
/*
 * „Haus schmücken" (umgebaut 11.10., gemeldet: „die Tanne kann ich nicht mehr
 * deaktivieren" und „die Anordnung kommt mir chaotisch vor"). Vorher war die
 * Liste nach BEDIENART sortiert - erst ein Block „Varianten", dann Lichter,
 * Anstrich, Zaun, dann die Deko nach Ort - und jedes Teil mit Varianten stand
 * zweimal darin: oben die drei Varianten, weit unten Aus/An.
 * Jetzt: oben der Anstrich, eine Sprungleiste, dann je ORT jedes Teil genau
 * einmal als Karte (Name der gewählten Variante, rechts Aus/An bzw.
 * Aus/Weiß/Bunt, darunter die Varianten), die Zaunfarbe in der Zaun-Karte,
 * zuletzt das Geschenkte nach Herkunft. Reihenfolge innerhalb eines Ortes
 * wie im Laden.
 */
/*
 * Umbau 22.10. (UI/UX-Durchsicht, gemeldet: „recht unübersichtlich"). Voll
 * gekauft waren es 49 Karten, ~230 Knöpfe und 6-7 Bildschirme auf EINER Seite,
 * Einstellen und Einkaufen gemischt, zwei goldene Markierungen je Karte.
 * Jetzt:
 *  - echte Reiter (Haus · Garten · Stand · Lichter · Geschenkt), immer nur einer sichtbar
 *  - je Teil EINE kompakte Zeile: Bild, fester Name, gewählte Variante klein,
 *    rechts ein Kippschalter An/Aus; Antippen klappt Farbe/Varianten auf (nur eine offen)
 *  - Varianten: Gekauftes nur als Auswahl (Gold = gewählt), Ungekauftes als EIN
 *    ruhiger Knopf „+ Variante …“ mit Preis; kein „???“ mehr
 *  - die reinen Lichterketten im eigenen Reiter, oben „Alle Lichter: Aus/Weiß/Bunt“
 */
const HAUS_ORTE = [['haus', 'Am Haus', 'Haus'], ['garten', 'Im Garten', 'Garten'], ['stand', 'Am Stand', 'Stand']];
// Reine Lichter (eigener Reiter). Schornstein-Schmuck, Winterkranz und Lichter-Rentier
// sind Dinge MIT Lichtern und bleiben an ihrem Ort.
const NUR_LICHT = new Set(['lichter_dach', 'lichter_fenster', 'lichter_zaun', 'eiszapfen', 'festbeleuchtung', 'lichtershow', 'tanne_lichter', 'baum_girlande', 'lichterbogen', 'standlicht']);
let hausReiter = 'haus';
let hausOffen = null;   // id der aufgeklappten Zeile
const hatTeil = (a) => S.stufe(a.id) > 0;
function hausReiterListe() {
  const anstriche = C.ARTIKEL.filter((a) => a.wahl === 'fassade' && hatTeil(a));
  const reiter = [];
  for (const [id, ort, kurz] of HAUS_ORTE) {
    const teile = sortiereNachFreischaltung(C.ARTIKEL.filter((a) => S.istDeko(a) && a.gruppe === ort && hatTeil(a) && !NUR_LICHT.has(a.id)));
    if (teile.length || (id === 'haus' && anstriche.length)) reiter.push({ id, kurz, teile, anstriche: id === 'haus' ? anstriche : [] });
  }
  const lichter = sortiereNachFreischaltung(C.ARTIKEL.filter((a) => NUR_LICHT.has(a.id) && hatTeil(a)));
  if (lichter.length) reiter.push({ id: 'lichter', kurz: 'Lichter', teile: lichter, anstriche: [] });
  const gesch = geschenke();
  if (gesch.length) reiter.push({ id: 'geschenkt', kurz: 'Geschenke', gesch });
  return reiter;
}
function baueHaus(behalteScroll) {
  const liste = $('#blattInhalt');
  const pos = liste.scrollTop;
  liste.innerHTML = '';
  const reiter = hausReiterListe();
  if (!reiter.length) {
    liste.appendChild(el('p', 'hinweis', 'Hier stellst du später alles ein, was du gekauft hast: Lichter an, aus, weiß oder bunt, Deko ein- und ausblenden, den Anstrich wählen. Noch gibt es nichts - schau auf der KARTE in die Läden.'));
    $('#blattGeld').textContent = S.formatGeld(S.st.geld);
    return;
  }
  if (!reiter.some((r) => r.id === hausReiter)) hausReiter = reiter[0].id;
  // Reiterleiste (echte Reiter, nicht mehr Sprungmarken)
  const leiste = el('div', 'haus-sprung haus-reiter');
  for (const r of reiter) {
    const b = el('button', 'hs-k' + (r.id === hausReiter ? ' aktiv' : ''), r.kurz);
    b.onclick = () => { if (hausReiter === r.id) return; T.spiele('klick'); hausReiter = r.id; hausOffen = null; baueHaus(); liste.scrollTop = 0; };
    leiste.appendChild(b);
  }
  liste.appendChild(leiste);
  const r = reiter.find((x) => x.id === hausReiter);
  if (r.id === 'geschenkt') baueGeschenkt(liste, r.gesch);
  else {
    if (r.id === 'lichter') liste.appendChild(alleLichter());
    if (r.anstriche.length) liste.appendChild(anstrichZeile(r.anstriche));
    for (const a of r.teile) liste.appendChild(hausKarte(a));
  }
  if (behalteScroll) liste.scrollTop = pos;
  $('#blattGeld').textContent = S.formatGeld(S.st.geld);
}
/** Kippschalter An/Aus (ein Knopf, sieht aus wie ein Schalter). */
function kipp(an, setze) {
  const b = el('button', 'kipp' + (an ? ' an' : ''), `<i></i><span>${an ? 'An' : 'Aus'}</span>`);
  b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', an ? 'true' : 'false');
  b.onclick = (e) => { e.stopPropagation(); setze(!an); baueHaus(true); };
  return b;
}
/** Grundgerüst einer Zeile: Bild, Name, Unterzeile, rechts der Schalter; antippen klappt auf. */
function hausZeileKompakt(id, iconArtikel, name, unter, schalter, aufklapp) {
  const offen = aufklapp && hausOffen === id;
  const z = el('div', 'zeile haus kompakt' + (aufklapp ? ' klappbar' : '') + (offen ? ' offen' : ''));
  const kopf = el('div', 'hz-kopf');
  const cv = el('canvas', 'ico'); cv.width = 16; cv.height = 16;
  zeichneIcon(cv, iconArtikel);
  kopf.appendChild(cv);
  kopf.appendChild(el('div', 'txt', `<b>${name}</b>${unter ? `<span>${unter}</span>` : ''}`));
  if (aufklapp) kopf.appendChild(el('i', 'hz-pfeil', '▾'));
  if (schalter) kopf.appendChild(schalter);
  z.appendChild(kopf);
  if (aufklapp) {
    kopf.onclick = () => { T.spiele('klick'); hausOffen = offen ? null : id; baueHaus(true); };
    if (offen) { const inhalt = el('div', 'hz-inhalt'); aufklapp(inhalt); z.appendChild(inhalt); }
  }
  return z;
}
function anstrichZeile(anstriche) {
  const akt = anstriche.find((a) => a.fassade === S.st.fassade);
  return hausZeileKompakt('anstrich', akt || anstriche[0], 'Anstrich', akt ? akt.name : 'Alter Anstrich', null, (inhalt) => {
    const werte = [{ wert: 'trist', text: 'Alt' }, ...anstriche.map((a) => ({ wert: a.fassade, text: a.name.replace(/haus$/i, '').split(' ')[0] }))];
    const stil = Object.fromEntries(werte.map((v) => [v.wert, C.FASSADEN[v.wert].wand]));
    const wahl = punktWahl(werte, S.st.fassade, (v) => S.setzeFassade(v), stil);
    wahl.classList.add('anstrich-wahl');
    inhalt.appendChild(wahl);
  });
}
/** Eine Zeile in „Haus schmücken": Name, Kippschalter, aufgeklappt Farbe, Zaunfarbe, Varianten. */
function hausKarte(a) {
  const vs = C.VARIANTEN[a.id], aktiv = vs ? S.variante(a.id) : 0;
  const istLicht = a.id in C.LICHTER;
  const farbe = istLicht ? S.lichtKette(a.id) : null;
  const an = istLicht ? S.lichtModus(a.id) !== 'aus' : S.zeigt(a.id);
  const teile = [];
  if (vs && vs[aktiv].kurz !== a.name) teile.push(vs[aktiv].kurz);   // „Holzstapel · Holzstapel“ vermeiden
  if (farbe && an) teile.push(S.lichtModus(a.id) === 'bunt' ? 'Bunt' : 'Warmweiß');
  else if (istLicht && a.id in C.LICHT_AB_STUFE && !farbe) teile.push('Lichter ab Stufe 2');
  const zaunFarbe = a.id === 'zaun' && S.stufe('zaun_braun') > 0;
  if (zaunFarbe) teile.push(S.st.zaunfarbe === 'braun' ? 'Braun' : 'Hell');
  const schalter = kipp(an, (neu) => {
    if (istLicht) S.setzeLicht(a.id, neu ? (farbe && S.bunt(farbe) ? 'bunt' : farbe ? 'weiss' : 'an') : 'aus');
    else S.setzeDeko(a.id, neu);
  });
  const klappt = vs || farbe || zaunFarbe;
  const z = hausZeileKompakt(a.id, a, a.name, teile.join(' · '), schalter, klappt ? (inhalt) => {
    if (farbe) {
      const zus = el('div', 'haus-zusatz', '<span>Farbe</span>');
      zus.appendChild(punktWahl([{ wert: 'weiss', text: 'Weiß' }, { wert: 'bunt', text: 'Bunt' }], S.bunt(farbe) ? 'bunt' : 'weiss',
        (v) => S.setzeLicht(a.id, v), { weiss: '#fff2cc', bunt: 'conic-gradient(#ff4a4a, #ffd040, #5aff6a, #4a8aff, #ff6adf, #ff4a4a)' }));
      inhalt.appendChild(zus);
    }
    if (zaunFarbe) {
      const zus = el('div', 'haus-zusatz', '<span>Farbe</span>');
      zus.appendChild(punktWahl([{ wert: 'hell', text: 'Hell' }, { wert: 'braun', text: 'Braun' }],
        S.st.zaunfarbe === 'braun' ? 'braun' : 'hell', (v) => S.setzeZaunfarbe(v), { hell: '#e2d5bb', braun: '#7a5234' }));
      inhalt.appendChild(zus);
    }
    if (vs) inhalt.appendChild(variantenReihe(a.id));
  } : null);
  if (!an) z.classList.add('ist-aus');
  return z;
}
/** Varianten eines Platzes: gekaufte zur Auswahl, die nächste als EIN Kaufknopf. */
function variantenReihe(pl) {
  const vs = C.VARIANTEN[pl], aktiv = S.variante(pl);
  const box = el('div', 'varbox');
  const reihe = el('div', 'varwahl');
  let kaufen = null, spaeter = false;
  vs.forEach((v, i) => {
    const st = S.varianteStatus(pl, i);
    if (st.hat) {
      const b = el('button', 'vw' + (i === aktiv ? ' aktiv' : ''), `<b>${v.kurz}</b>`);
      b.onclick = () => {
        if (i === aktiv) return;
        S.waehleVariante(pl, i);
        if (!S.zeigt(pl)) S.setzeDeko(pl, true);   // eine Variante wählen heißt: zeigen
        baueHaus(true); zeigeVariante(pl);
      };
      reihe.appendChild(b);
    } else if (st.versteckt) spaeter = true;
    else if (!kaufen) kaufen = { v, i, st };
  });
  box.appendChild(reihe);
  if (kaufen) {
    const { v, i, st } = kaufen;
    const b = el('button', 'var-kauf' + (st.leisten ? '' : ' teuer'), `<span>+ Variante: <b>${v.kurz}</b></span><small>★ ${S.formatGeld(st.kosten).replace(' Sterne', '')} · ♥ +${C.VARIANTE_HERZEN}</small>`);
    b.onclick = () => {
      if (!S.kaufeVariante(pl, i)) { T.spiele('falsch'); toast('Dafür reichen deine Sterne noch nicht.', 'hinweis'); return; }
      if (!S.zeigt(pl)) S.setzeDeko(pl, true);
      toast(`${v.name} gekauft! ♥ +${C.VARIANTE_HERZEN}`, 'gut');
      baueHaus(true); zeigeVariante(pl, `+${C.VARIANTE_HERZEN} ♥`);
    };
    box.appendChild(b);
  }
  if (spaeter) box.appendChild(el('p', 'var-spaeter', 'Die 3. Variante gibt es, sobald du die 2. hast.'));
  return box;
}
/** Oben im Reiter „Lichter": alle auf einmal aus, warmweiß oder bunt. */
function alleLichter() {
  const ids = Object.keys(C.LICHTER).filter((id) => S.stufe(id) > 0);
  const modi = ids.map((id) => S.lichtModus(id));
  const alle = modi.every((m) => m === 'aus') ? 'aus'
    : ids.every((id, k) => modi[k] !== 'aus' && (!S.lichtKette(id) || modi[k] === 'bunt')) ? 'bunt'
    : ids.every((id, k) => modi[k] !== 'aus' && (!S.lichtKette(id) || modi[k] === 'weiss')) ? 'weiss' : null;
  const z = el('div', 'zeile haus alle-lichter');
  z.appendChild(el('div', 'txt', '<b>Alle Lichter</b><span>gilt für jede Kette am Haus, im Garten und am Stand</span>'));
  z.appendChild(punktWahl(['aus', 'weiss', 'bunt'], alle, (v) => {
    // direkt in den Stand statt über setzeLicht - sonst klickt es zehnmal gleichzeitig
    S.st.aus = S.st.aus || {}; S.st.bunt = S.st.bunt || {};
    for (const id of ids) {
      S.st.aus[id] = v === 'aus';
      const k = S.lichtKette(id);
      if (k && v !== 'aus') S.st.bunt[k] = v === 'bunt';
    }
    T.spiele('klick'); S.speichere();
  }));
  return z;
}
/** Reiter „Geschenkt": nach Herkunft, je Teil eine Zeile mit Kippschalter. */
function baueGeschenkt(liste, gesch) {
  const neu = S.st.neu || {};
  const QUELLEN = [['Das Finale', (d) => d.id.startsWith('f_')], ['Aus dem Adventskalender', (d) => d.id.startsWith('kal_')], ['Aus den Minispielen', (d) => /^(l|c|s|e|g|sp)_/.test(d.id)],
    ['Vom Händler und vom Markt', (d) => /^(h|m)_/.test(d.id)], ['Für schwere Aufträge', () => true]];
  const vergeben = new Set();
  for (const [titel, passt] of QUELLEN) {
    const teil = gesch.filter((d) => !vergeben.has(d.id) && passt(d));
    if (!teil.length) continue;
    liste.appendChild(el('p', 'haus-quelle', titel));
    for (const d of teil) {
      vergeben.add(d.id);
      // Minispiel-Deko: aus welchem Spiel, ab welchem Rekord (wer ein neues Präfix einführt, trägt es hier ein)
      const spiel = { l: 'Waldlichtung', c: 'Christbaumverkauf', s: 'Schlittenberg', e: 'Eisbahn', g: 'Schneeballwiese' }[d.id.split('_')[0]];
      const ab = d.ab ? `${spiel ? spiel + ' · ' : ''}Rekord ab ${d.ab.toLocaleString('de-DE')} Punkten`
        : d.id.startsWith('sp_') ? `Für ${C.SPECIAL_DEKO_AB} geschaffte Specials`
        : d.id === 'kal_knoedel' && !S.hat('futterhaus') ? 'Hängt erst, wenn du ein Futterhaus hast' : '';
      const an = S.zeigt(d.id);
      const z = hausZeileKompakt(d.id, d, d.name + (neu[d.id] ? ' <i class="neuTag">NEU</i>' : ''), ab, kipp(an, (v) => S.setzeDeko(d.id, v)), null);
      if (!an) z.classList.add('ist-aus');
      liste.appendChild(z);
      delete neu[d.id];
    }
  }
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
      // Die Zeitangabe "wann kann ich es kaufen" (17.10.) ist am 18.10. wieder raus (Nutzerwunsch)
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
/** Blendet der Laden gerade kurz aus, um einen Kauf am Haus zu zeigen? (main.js zeichnet dann weiter) */
export const zeigtKauf = () => $('#blatt').classList.contains('kurz-weg');
function zeigeKauf(id) {
  const ort = ortVon(id);
  if (!ort) return;
  // Über dem Teil steigt auf, was es bringt: Stimmung, sonst der Preisbonus
  const a = S.ARTIKEL_MAP[id] || {};
  const bo = a.bonus || {};
  const was = a.stimmung ? `+${a.stimmung} ♥` : bo.preis ? `+${Math.round(bo.preis * 100)} % ★` : '';
  funkeln(ort.x, ort.y, was);
  T.spiele('spezial');
  const b = $('#blatt');
  b.classList.add('kurz-weg');
  $('#landkarte').classList.add('kurz-weg');
  setTimeout(() => $('#landkarte').classList.remove('kurz-weg'), 2600);
  clearTimeout(kaufZeigenT);
  // 1,7 s waren zu kurz: Im Betatest (02.10.) war der Laden wieder da, bevor
  // man das Teil am Haus gefunden hatte
  kaufZeigenT = setTimeout(() => b.classList.remove('kurz-weg'), 2600);
}

/** Roter Punkt mit Zahl an der Laden-Taste: so viele Dinge sind neu. */
export function neuMarke() {
  // Nur Neues, das man sich auch leisten kann (Betatest 2: „9+" an der Karte
  // war Druck statt Richtung). Die Orte auf der Karte zeigen nur einen Punkt.
  const n = Object.keys(S.st.neu || {}).filter((id) => { const a = S.ARTIKEL_MAP[id]; if (!a) return false; const st = S.status(a); return !st.fertig && !st.versteckt && st.leisten; }).length;
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
    case 'futterhaus': r(c, 7, 0, 1, 3, '#8a7a5a'); r(c, 3, 6, 10, 5, '#a8703a'); for (let i = 0; i < 4; i++) r(c, 2 + i, 6 - i, 12 - i * 2, 1, '#c83030'); r(c, 7, 7, 2, 2, '#2a1a10'); r(c, 1, 11, 14, 1, '#6a4a2a'); p(c, 4, 10, '#d8b060'); p(c, 9, 10, '#d8b060'); r(c, 11, 9, 3, 2, '#e8702a'); p(c, 13, 8, '#8a6a4a'); return;
    case 'kal_knoedel': r(c, 7, 0, 1, 5, '#8a7a5a'); r(c, 4, 5, 8, 8, '#b8945a'); r(c, 5, 4, 6, 10, '#b8945a'); for (let i = 0; i < 9; i++) p(c, 4 + (i * 3) % 8, 5 + (i * 5) % 8, i % 2 ? '#8a6a3a' : '#d8b878'); for (let x = 4; x < 12; x += 2) r(c, x, 4, 1, 10, '#3a8a3a'); return;
    case 'kal_goldstern': r(c, 6, 6, 4, 4, '#ffd040'); r(c, 7, 1, 2, 14, '#ffd040'); r(c, 1, 7, 14, 2, '#ffd040'); p(c, 4, 4, '#fff6c8'); p(c, 11, 4, '#fff6c8'); p(c, 4, 11, '#fff6c8'); p(c, 11, 11, '#fff6c8'); return;
    case 'auf_lebkuchenmann': icon(c, 'lebkuchen', 3, 3, 0); return;
    // Vom fahrenden Händler
    case 'h_kugel': for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) if (Math.hypot(x - 5, y - 5) <= 5.4) p(c, x + 2, y + 1, '#9cc4e4'); r(c, 5, 6, 6, 4, '#d83a3a'); r(c, 1, 12, 14, 3, '#7a4a2a'); p(c, 4, 3, '#ffffff'); p(c, 9, 4, '#ffffff'); return;
    case 'h_flamingo': r(c, 7, 9, 1, 6, '#c8487e'); r(c, 3, 6, 7, 4, '#f06aa8'); r(c, 9, 2, 1, 4, '#f06aa8'); r(c, 9, 1, 3, 2, '#f06aa8'); p(c, 12, 2, '#2a1810'); r(c, 9, 0, 3, 1, '#d83a3a'); p(c, 4, 7, '#5aff6a'); p(c, 6, 8, '#ffd040'); return;
    case 'h_polar': r(c, 0, 0, 16, 16, '#141c3a'); for (let x = 0; x < 16; x++) { const y = 5 + Math.round(Math.sin(x * 0.6) * 2); r(c, x, y, 1, 5, '#5aff96'); r(c, x, y + 5, 1, 2, '#3a9a6a'); } p(c, 3, 2, '#ffffff'); p(c, 12, 1, '#ffffff'); return;
    case 'h_orgel': r(c, 2, 5, 9, 7, '#8a3a2a'); r(c, 3, 7, 7, 2, '#e8c030'); r(c, 3, 12, 1, 3, '#5a3219'); r(c, 9, 12, 1, 3, '#5a3219'); r(c, 11, 7, 2, 1, '#3a3a40'); r(c, 13, 5, 1, 3, '#3a3a40'); p(c, 4, 2, '#f4f4f4'); p(c, 5, 1, '#f4f4f4'); return;
    case 'h_hahn': r(c, 7, 6, 1, 10, '#3a3a44'); r(c, 3, 12, 9, 1, '#3a3a44'); r(c, 4, 4, 7, 3, '#3a3a44'); r(c, 10, 1, 2, 3, '#3a3a44'); p(c, 10, 0, '#3a3a44'); p(c, 12, 0, '#3a3a44'); p(c, 12, 3, '#d83a3a'); r(c, 4, 7, 1, 2, '#3a3a44'); r(c, 9, 7, 1, 2, '#3a3a44'); return;
    case 'l_hasen': for (const [x, y] of [[2, 9], [7, 7], [11, 10]]) { r(c, x, y, 4, 3, '#b8a898'); r(c, x + 2, y - 3, 1, 3, '#b8a898'); p(c, x + 3, y - 1, '#2a1a10'); } return;
    case 'l_eich': r(c, 5, 7, 5, 5, '#c86a2a'); r(c, 9, 5, 3, 3, '#c86a2a'); r(c, 1, 3, 4, 8, '#d88a4a'); p(c, 11, 6, '#2a1a10'); r(c, 11, 10, 2, 2, '#8a5a2a'); return;
    case 'l_reh': r(c, 2, 7, 10, 4, '#a8703a'); for (const x of [3, 5, 9, 11]) r(c, x, 11, 1, 4, '#a8703a'); r(c, 11, 3, 2, 4, '#a8703a'); r(c, 12, 2, 3, 2, '#a8703a'); p(c, 5, 8, '#f4ead8'); p(c, 8, 8, '#f4ead8'); return;
    case 'h_zimt': for (const [x, y] of [[7, 1], [7, 13], [1, 7], [13, 7]]) r(c, x, y, 2, 2, '#c8843a'); r(c, 4, 4, 8, 8, '#c8843a'); r(c, 5, 5, 6, 6, '#f4ead8'); p(c, 7, 7, '#c8843a'); p(c, 8, 8, '#c8843a'); return;
    // Aus dem Christbaumverkauf
    case 'c_kugeln': for (const [x, y, f] of [[4, 6, '#d83a3a'], [10, 4, '#ffd040'], [9, 11, '#3a8ad8']]) { r(c, x - 2, y - 1, 5, 3, f); r(c, x - 1, y - 2, 3, 5, f); p(c, x - 1, y - 1, '#ffffff'); r(c, x, y - 4, 1, 2, '#3a3a40'); } return;
    case 'c_dachbaum': for (let i = 0; i < 4; i++) r(c, 2 + i * 3, 14 - i * 3, 12 - i * 6 > 0 ? 12 - i * 6 : 2, 1, '#5a5a62'); for (let i = 0; i < 9; i++) { const w = Math.round((i + 1) / 9 * 4); r(c, 8 - w, 2 + i, w * 2 + 1, 1, i % 3 ? '#2a6a34' : '#1c5228'); } p(c, 8, 1, '#ffe060'); p(c, 6, 6, '#ff5a5a'); p(c, 10, 8, '#5ad0ff'); return;
    case 'c_wald': for (const x of [3, 8, 13]) { for (let i = 0; i < 10; i++) { const w = Math.round((i + 1) / 10 * 3); r(c, x - w, 4 + i, w * 2 + 1, 1, '#2a5a3a'); } p(c, x, 7, '#ffe060'); p(c, x - 1, 10, '#ff5a5a'); p(c, x + 1, 12, '#5ad0ff'); } return;
    // Von der Eisbahn
    case 'e_schlittschuhe': for (const x of [3, 9]) { r(c, x, 3, 4, 7, '#f4f0e8'); r(c, x, 10, 5, 2, '#3a2a1a'); r(c, x - 1, 12, 7, 1, '#c8ccd8'); } r(c, 7, 0, 2, 3, '#c83a32'); return;
    case 'e_pinguin': r(c, 5, 4, 6, 10, '#2a2a34'); r(c, 6, 6, 4, 7, '#f4f4f4'); p(c, 6, 5, '#ffffff'); p(c, 9, 5, '#ffffff'); r(c, 7, 7, 2, 1, '#e8a020'); r(c, 5, 2, 6, 2, '#d83a3a'); p(c, 10, 1, '#ffffff'); r(c, 5, 14, 2, 1, '#e8a020'); r(c, 9, 14, 2, 1, '#e8a020'); return;
    case 'e_schnuppen': r(c, 0, 0, 16, 16, '#1a1e48'); for (let i = 0; i < 7; i++) p(c, 3 + i, 10 - i, i > 4 ? '#ffe060' : '#8a90c8'); r(c, 10, 2, 2, 2, '#ffffff'); p(c, 2, 3, '#ffffff'); p(c, 13, 12, '#ffffff'); return;
    // Von der Schneeballwiese (12.10.)
    case 'g_vorrat': for (const [x, y] of [[3, 11], [7, 11], [11, 11], [5, 8], [9, 8], [7, 5]]) { r(c, x - 1, y - 1, 4, 3, '#ffffff'); p(c, x + 1, y + 1, '#c8d4e2'); } return;
    case 'g_lauscher': r(c, 9, 0, 7, 16, '#c9bca6'); r(c, 3, 6, 7, 7, '#7cbc44'); p(c, 5, 8, '#f0e040'); p(c, 7, 8, '#1a1a1a'); r(c, 5, 11, 4, 1, '#2a4a14'); r(c, 3, 4, 6, 2, '#c82828'); p(c, 2, 5, '#ffffff'); r(c, 9, 9, 2, 2, '#5a9a30'); return;
    case 'sp_pokal': r(c, 4, 3, 9, 4, '#ffd84a'); r(c, 4, 2, 9, 1, '#e8a820'); r(c, 5, 7, 7, 1, '#e8a820'); p(c, 3, 4, '#e8a820'); p(c, 13, 4, '#a86a10'); r(c, 8, 8, 1, 3, '#e8a820'); r(c, 6, 11, 5, 1, '#ffd84a'); r(c, 6, 12, 5, 1, '#a86a10'); p(c, 5, 3, '#ffffff'); p(c, 8, 4, '#c83030'); return;
    case 'f_eisenbahn': r(c, 1, 9, 10, 4, '#2a2a34'); r(c, 1, 10, 10, 1, '#c8322e'); r(c, 2, 5, 2, 4, '#1a1a20'); r(c, 8, 6, 5, 7, '#c8322e'); r(c, 9, 7, 3, 2, '#ffd070'); r(c, 0, 13, 15, 1, '#1a1a20'); for (const x of [3, 7, 11]) { r(c, x - 1, 14, 3, 2, '#2a2a32'); p(c, x, 14, '#c8a040'); } r(c, 3, 2, 2, 2, '#c8ccd8'); r(c, 5, 0, 3, 2, '#e2e6f0'); return;
    case 'g_fahne': r(c, 3, 1, 1, 15, '#7a5230'); r(c, 4, 2, 10, 6, '#3a8a3a'); r(c, 4, 7, 10, 1, '#2a6a2a'); r(c, 7, 3, 3, 3, '#ffffff'); p(c, 3, 0, '#e8c030'); return;
    // Vom Schlittenberg
    case 's_kinder': r(c, 1, 11, 9, 2, '#a8703a'); r(c, 1, 13, 10, 1, '#6a4428'); for (const [x, f] of [[6, '#c83a32'], [12, '#3a6ab8']]) { r(c, x, 5, 3, 5, f); r(c, x, 2, 3, 3, '#f2c9a0'); r(c, x, 1, 3, 1, '#e8c030'); r(c, x, 10, 1, 4, '#2a2a30'); r(c, x + 2, 10, 1, 4, '#2a2a30'); } return;
    case 's_wok': for (let y = -3; y <= 3; y++) { const w = Math.round(6 * Math.sqrt(1 - y * y / 9)); r(c, 8 - w, 9 + y, w * 2, 1, y < 0 ? '#4a4a54' : '#2a2a30'); } r(c, 1, 6, 4, 1, '#6a4428'); r(c, 6, 3, 4, 2, '#e8c030'); return;
    case 's_hang': for (let x = 0; x < 16; x++) { const h = Math.round(9 - Math.abs(x - 8) * 0.9); r(c, x, 14 - h, 1, h, '#e8eef6'); } p(c, 6, 8, '#c83a32'); p(c, 10, 10, '#3a6ab8'); r(c, 0, 14, 16, 2, '#2a5a3a'); return;
    // Vom Weihnachtsmarkt
    case 'm_rad': for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; p(c, 8 + Math.round(Math.cos(a) * 6), 7 + Math.round(Math.sin(a) * 6), k % 2 ? '#ffd040' : '#d83a3a'); } r(c, 7, 6, 2, 2, '#6a5a6a'); r(c, 4, 13, 1, 3, '#6a5a6a'); r(c, 11, 13, 1, 3, '#6a5a6a'); r(c, 3, 15, 10, 1, '#6a5a6a'); return;
    case 'm_stern': r(c, 7, 0, 1, 3, '#6a4428'); for (const [x, y] of [[7, 3], [3, 7], [11, 7], [7, 11], [4, 4], [10, 4], [4, 10], [10, 10]]) r(c, x, y, 2, 2, '#ffe060'); r(c, 6, 6, 4, 4, '#fff6c8'); return;
    case 'm_kutsche': r(c, 7, 5, 8, 6, '#2a3a6a'); r(c, 8, 6, 3, 3, '#f8d878'); for (const x of [8, 13]) { r(c, x, 11, 3, 3, '#3a2a1a'); p(c, x + 1, 12, '#c8a040'); } r(c, 1, 7, 5, 4, '#8a5a32'); r(c, 4, 4, 2, 3, '#8a5a32'); r(c, 1, 11, 1, 3, '#5a3a22'); r(c, 4, 11, 1, 3, '#5a3a22'); return;
    case 'm_fenster': r(c, 1, 1, 14, 14, '#f2ead8'); r(c, 2, 2, 12, 12, '#3a5a8a'); r(c, 7, 2, 1, 12, '#f2ead8'); r(c, 2, 7, 12, 1, '#f2ead8'); for (const [x, y] of [[4, 4], [10, 10], [10, 4]]) { p(c, x, y, '#ffffff'); p(c, x - 1, y, '#ffffff'); p(c, x + 1, y, '#ffffff'); p(c, x, y - 1, '#ffffff'); p(c, x, y + 1, '#ffffff'); } return;
    case 'm_herzen': for (const [x, y] of [[2, 4], [9, 7]]) { r(c, x, y, 2, 2, '#a8642e'); r(c, x + 3, y, 2, 2, '#a8642e'); r(c, x - 1, y + 1, 7, 2, '#a8642e'); r(c, x, y + 3, 5, 1, '#a8642e'); r(c, x + 1, y + 4, 3, 1, '#a8642e'); p(c, x + 2, y + 5, '#a8642e'); r(c, x + 1, y + 2, 3, 1, '#fff4e6'); } r(c, 0, 0, 16, 1, '#c83030'); return;
    case 'r_zimt': case 'r_apfel': case 'r_vanille': case 'r_honig': case 'r_orange': {
      // Rezeptkarte mit Zutat
      r(c, 2, 1, 12, 14, '#f4ead8'); r(c, 2, 1, 12, 1, '#c8a070'); for (let y = 4; y < 14; y += 2) r(c, 4, y, 8, 1, '#c8b898');
      const f = { r_zimt: '#a8642e', r_apfel: '#d83a3a', r_vanille: '#3a2a1a', r_honig: '#e8a020', r_orange: '#f08a2a' }[a.id];
      r(c, 9, 9, 5, 5, f); p(c, 9, 9, '#ffffff'); return;
    }
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
  const finale = S.finaleBereit();
  liste.appendChild(el('p', 'wand-zeile', finale ? '<b>Vor dem Kamin wartet ein Geschenk für dich!</b> Tippe es an.' : `<b>${n} von 24 Socken</b> · Tippe auf eine Socke.`));
  liste.appendChild(el('p', 'klein', naechste ? `Bei ${naechste[0]} Socken kommt dazu: ${naechste[1]}.` : 'Alles geschafft - frohe Weihnachten!'));
  const c = cv.getContext('2d');
  const idx = E.ERFOLGE.map((x) => x.id);
  const hat = (i) => E.erreicht(idx[i]);
  const t0 = performance.now();
  const male = () => {
    if (!cv.isConnected || offen !== 'auftraege') return;
    zeichneWand(c, n, hat, (performance.now() - t0) / 1000, (i) => glitzer[idx[i]], finale && S.finaleBereit());
    requestAnimationFrame(male);
  };
  male();
  cv.onclick = (ev) => {
    const b = cv.getBoundingClientRect();
    const wx = (ev.clientX - b.left) * WAND_W / b.width, wy = (ev.clientY - b.top) * WAND_H / b.height;
    const G = GESCHENK;
    if (S.finaleBereit() && wx >= G.x - 3 && wx <= G.x + G.w + 3 && wy >= G.y - 6 && wy <= G.y + G.h + 2) { T.spiele('spezial'); zeigeFinale(); return; }
    const i = sockeBei(wx, wy);
    if (i < 0) return;
    T.spiele('klick');
    zeigeErfolg(i);
  };
}

/** Das Finale (25.10.): Glückwunsch, alles freigeschaltet - und die Weihnachtseisenbahn. */
function zeigeFinale() {
  const d = S.finaleOeffnen();
  if (!d) return;
  T.jingle();
  fenster('Alles geschafft!', `
    <p><b>Puh, das war ganz schön viel Arbeit - aber du hast wirklich alles freigeschaltet!</b> Glückwunsch!</p>
    <p>Als Dankeschön bekommst du ein letztes Stück für dein Haus: die <b>${d.name}</b>. Ab und zu tuckert sie jetzt mit beleuchteten Waggons vor deinem Haus vorbei.</p>
    <p>Lehn dich zurück und bestaune dein schönes weihnachtliches Haus! :)</p>
    <p class="bonus">Neu für dein Haus: <b>${d.name}</b> (♥ +${d.stimmung})</p>`,
  [{ text: 'Zum Haus ▸', aktion: () => { schliesseBlatt(); const o = ortVon(d.id); if (o) funkeln(o.x, o.y, `+${d.stimmung} ♥`); } }]);
}

function zeigeErfolg(i) {
  const x = E.ERFOLGE[i];
  const ok = E.erreicht(x.id);
  const st = E.stand(x);
  const wann = ok ? new Date(S.st.erfolge[x.id]).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) : '';
  const box = fenster(ok ? x.name : 'Noch verborgen',
    `<canvas class="socke-gross" width="20" height="24"></canvas>
     <p>${x.text}</p>
     ${ok ? `<p class="bonus">Geschafft am ${wann}!</p>`
          : x.ziel > 1 ? `<div class="balken"><i style="width:${Math.round(100 * st / x.ziel)}%"></i></div><p class="klein">${st.toLocaleString('de-DE')} / ${x.ziel.toLocaleString('de-DE')}</p>` : ''}`);
  // Klein malen, per Scale2x vergrößern (Pixel bleiben Spielpixel)
  const klein = document.createElement('canvas'); klein.width = 10; klein.height = 12;
  socke(klein.getContext('2d', { willReadFrequently: true }), i, 0, 0, !ok);
  box.querySelector('canvas').getContext('2d').drawImage(scale2x(klein), 0, 0);
}

// ---------------------------------------------------------------------------
// Die Kiste: was die Wichtel verdient haben, während man weg war
// ---------------------------------------------------------------------------
export function zeigeKiste(sek, weiter) {
  const h = Math.floor(sek / 3600), m = Math.round((sek % 3600) / 60);
  const dauer = sek ? (h ? `${h} Std. ${m} Min.` : `${m} Min.`) : '';
  const gaeste = (S.st.kisteGaeste || 0).toLocaleString('de-DE');
  const box = fenster('Während du weg warst …',
    `<canvas class="kiste" width="48" height="40"></canvas>
     <p>${dauer ? `In ${dauer} haben deine Wichtel` : 'Deine Wichtel haben'} <b>${gaeste}</b> Gäste bedient und alles in diese Kiste gelegt.</p>
     ${sek >= S.offlineStunden() * 3600 ? `<p class="klein">Die Kiste war voll - mehr als ${String(S.offlineStunden()).replace('.', ',')} Stunden Arbeit passen nicht hinein. Schau öfter vorbei, dann verschenkst du nichts.</p>` : ''}`,
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

/**
 * Der fahrende Händler (09.10.): sein Angebot in einem Fenster. Deko gibt es
 * nur bei ihm; gekauft wird sofort, das Fenster schließt, und das neue Teil
 * funkelt am Haus.
 */
export function zeigeHaendler() {
  const h = S.lauf.haendler;
  if (!h) return;
  const waren = [...h.angebot.map((id) => C.HAENDLER_DEKO.find((d) => d.id === id)), ...(h.gutschein ? [C.HAENDLER_GUTSCHEIN] : [])];
  const leer = !waren.length;
  const box = fenster('Der fahrende Händler', `
    <p class="klein">${leer ? 'Heute hat er nichts mehr für dich - du hast schon alles!' : '„Seltene Ware von weit her! Gibt es nur bei mir - und ich ziehe bald weiter.“'}</p>
    <div class="haendler-liste"></div>`, [{ text: 'Später', neben: true }]);
  const liste = box.querySelector('.haendler-liste');
  for (const w of waren) {
    const preis = S.haendlerPreis(w);
    const z = el('div', 'zeile haendler');
    const cv = el('canvas', 'ico'); cv.width = 16; cv.height = 16;
    zeichneIcon(cv, w);
    z.appendChild(cv);
    const extra = w.stimmung ? `<em class="bonus">♥ +${w.stimmung}</em>` : '';
    z.appendChild(el('div', 'txt', `<b>${w.name}</b><span>${w.text}</span>${extra}`));
    const k = el('button', 'k k--kauf' + (S.st.geld >= preis ? '' : ' gesperrt'), S.formatGeld(preis));
    k.onclick = () => {
      if (!S.kaufeBeimHaendler(w.id)) { T.spiele('falsch'); toast('Dafür reichen deine Sterne noch nicht.', 'hinweis'); return; }
      schliesseFenster();
      if (w === C.HAENDLER_GUTSCHEIN) { toast(`Zimtstern-Gutschein: ${Math.round(w.dauer / 60)} Minuten lang bringt selbst Serviertes noch einmal doppelt so viele Sterne!`, 'spezial'); zielLeiste(); return; }
      toast(`${w.name} gekauft! Nur beim Händler zu haben.`, 'gut');
      const o = ortVon(w.id);
      if (o) funkeln(o.x, o.y, `+${w.stimmung} ♥`);
      T.spiele('spezial');
    };
    z.appendChild(k);
    liste.appendChild(z);
  }
}

// ---------------------------------------------------------------------------
// Der Weihnachtsmarkt auf dem Festplatz (09.10.)
// ---------------------------------------------------------------------------
const WOCHENTAG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
function marktText(w) {
  if (!w.fuer) return w.text;
  const namen = w.fuer.map((id) => C.PRODUKT[id].name);
  return `${namen.join(' und ')} bringen dauerhaft ${Math.round(w.plus * 100)} % mehr Sterne.`;
}
/** „ · Marktrezept +20 %" hinter dem Getränk, wenn ein Rezept es teurer macht. */
function rezeptHinweis(id) {
  const x = C.MARKT_REZEPTE.find((r) => S.rezeptStufe(r.id) && r.fuer.includes(id));
  return x ? ` · <i class="rezept">Rezept +${Math.round(S.rezeptPlus(x.id) * 100)} %</i>` : '';
}
export function zeigeMarkt() {
  const m = S.marktInfo();
  const deko = C.MARKT_DEKO.filter((d) => S.st.kalDeko[d.id]).length;
  // 24.10.: Sammelstand als Kärtchen, die Erklärung nur beim ersten Mal offen
  // 27.10.: Rezepte gibt es nicht mehr hier, sondern jederzeit im Supermarkt
  const stand = `<div class="mini-chips"><span>Markt-Deko <b>${deko}/${C.MARKT_DEKO.length}</b></span></div>`;
  const wasGibts = erklaerung('markt', `<ol class="mini-anleitung">
      <li><b>Deko</b>, die es nur auf dem Markt gibt - jedes Mal eine andere Auswahl.</li>
      <li><b>Rezepte</b> für mehr Sterne gibt es jederzeit im Supermarkt.</li>
      <li>Am Markttag kommen <b>${Math.round(C.MARKT_GAESTE * 100)} % mehr Gäste</b> an deinen Stand.</li></ol>`, 'Was gibt es dort?');
  if (!m.heute) {
    const wann = m.inTagen === 1 ? 'morgen' : `am ${WOCHENTAG[m.datum.getDay()]}, ${m.datum.getDate()}.${m.datum.getMonth() + 1}. (in ${m.inTagen} Tagen)`;
    const zu = fenster('Festplatz', `
      <canvas class="fenster-bild"></canvas>
      <p>Noch ist der Platz leer. Der nächste <b>Weihnachtsmarkt</b> ist ${wann}.</p>
      ${stand}${wasGibts}`, [{ text: 'Bis dann!' }]);
    KA.vignette(zu.querySelector('canvas.fenster-bild'), 'festplatz', { offen: false });
    erklaerungKnopf(zu);
    return;
  }
  S.marktBesuchen();
  zielLeiste();
  const a = S.marktAngebot();
  const waren = [...a.deko, ...(a.rezept ? [a.rezept] : [])];
  const box = fenster('Weihnachtsmarkt', `
    <canvas class="fenster-bild"></canvas>
    <p>${waren.length ? `<b>Heute ist Markt!</b> Was es hier gibt, gibt es nur auf dem Markt.` : 'Du hast schon alles, was der Markt heute hat - aber am Stand ist trotzdem mehr los!'}</p>
    <div class="haendler-liste"></div>${stand}${wasGibts}`, [{ text: 'Später', neben: true }]);
  KA.vignette(box.querySelector('canvas.fenster-bild'), 'festplatz', { offen: true });   // Ortsbild wie bei den Läden (11.10.)
  erklaerungKnopf(box);
  const liste = box.querySelector('.haendler-liste');
  for (const w of waren) {
    const preis = S.haendlerPreis(w);
    const z = el('div', 'zeile haendler');
    const cv = el('canvas', 'ico'); cv.width = 16; cv.height = 16;
    zeichneIcon(cv, w);
    z.appendChild(cv);
    const extra = w.stimmung ? `<em class="bonus">♥ +${w.stimmung}</em>` : '<em class="bonus">Rezept</em>';
    z.appendChild(el('div', 'txt', `<b>${w.name}</b><span>${marktText(w)}</span>${extra}`));
    const k = el('button', 'k k--kauf' + (S.st.geld >= preis ? '' : ' gesperrt'), S.formatGeld(preis));
    k.onclick = () => {
      if (!S.kaufeAufMarkt(w.id)) { T.spiele('falsch'); toast('Dafür reichen deine Sterne noch nicht.', 'hinweis'); return; }
      schliesseFenster();
      T.spiele('spezial');
      if (w.fuer) { toast(`${w.name}: ${marktText(w)}`, 'spezial'); return; }
      // Deko: Karte zu, damit man sie am Haus funkeln sieht
      schliesseKarte();
      toast(`${w.name} gekauft! Nur auf dem Markt zu haben.`, 'gut');
      const o = ortVon(w.id);
      if (o) funkeln(o.x, o.y, `+${w.stimmung} ♥`);
    };
    z.appendChild(k);
    liste.appendChild(z);
  }
}

/**
 * Pixelkiste 48 × 40, zu oder offen mit Sternen. Seit 11.10. in voller
 * Auflösung gezeichnet - vorher 24 × 20, im Fenster doppelt so groß, mit
 * doppelt so groben Pixeln wie alles andere.
 */
function zeichneKiste(cv, offen) {
  const c = cv.getContext('2d');
  c.clearRect(0, 0, 48, 40);
  const holz = '#8a5230', hell = '#a8683e', dunkel = '#5a3219', fuge = '#4a2812';
  const gold = '#e8b030', goldH = '#fff0a0', goldD = '#a87818';
  const bretter = (x, y, w, h) => {
    r(c, x, y, w, h, holz);
    for (let yy = y + 3; yy < y + h - 1; yy += 4) r(c, x, yy, w, 1, fuge);   // Brettfugen
    for (let yy = y + 1; yy < y + h - 1; yy += 4) r(c, x + 2, yy, w - 4, 1, hell);   // Maserung
  };
  const stern = (x, y) => { p(c, x, y - 1, goldH); r(c, x - 1, y, 3, 1, gold); p(c, x, y, goldH); p(c, x, y + 1, gold); };
  if (offen) {
    // Deckel nach hinten geklappt, Sterne quellen heraus
    r(c, 6, 3, 36, 9, dunkel); r(c, 7, 4, 34, 7, holz); r(c, 8, 5, 32, 1, hell); r(c, 7, 8, 34, 1, fuge);
    r(c, 5, 3, 2, 9, gold); r(c, 41, 3, 2, 9, gold);
    r(c, 6, 13, 36, 7, '#ffe27a');   // Glanz aus der Kiste
    r(c, 8, 12, 32, 2, '#fff6c8');
    for (const [x, y] of [[12, 14], [19, 11], [26, 13], [33, 15], [16, 18], [23, 17], [30, 19], [37, 12], [10, 9]]) stern(x, y);
  } else {
    // Gewölbter Deckel
    r(c, 7, 9, 34, 2, holz); r(c, 6, 11, 36, 9, holz);
    r(c, 9, 8, 30, 1, hell); r(c, 7, 10, 34, 1, hell);
    r(c, 6, 14, 36, 1, fuge); r(c, 6, 17, 36, 1, fuge);
    r(c, 6, 19, 36, 1, dunkel);
    r(c, 5, 11, 2, 9, gold); r(c, 41, 11, 2, 9, gold); r(c, 6, 9, 1, 2, gold); r(c, 41, 9, 1, 2, gold);
    r(c, 5, 11, 1, 9, goldH);
  }
  // Korpus
  bretter(6, 20, 36, 17);
  r(c, 6, 37, 36, 1, dunkel); r(c, 7, 38, 34, 1, '#3a200c');
  // Beschläge links/rechts und Eckwinkel
  r(c, 4, 20, 3, 18, gold); r(c, 41, 20, 3, 18, gold); r(c, 4, 20, 1, 18, goldH); r(c, 43, 20, 1, 18, goldD);
  for (const y of [22, 29, 35]) { p(c, 5, y, goldD); p(c, 42, y, goldD); }   // Nieten
  // Querband
  r(c, 6, 27, 36, 2, goldD); r(c, 6, 27, 36, 1, gold);
  // Schloss
  const sy = offen ? 20 : 16;
  r(c, 21, sy, 6, 7, gold); r(c, 21, sy, 6, 1, goldH); r(c, 26, sy + 1, 1, 6, goldD);
  r(c, 23, sy + 2, 2, 2, '#3a200c'); p(c, 23, sy + 4, '#3a200c'); p(c, 24, sy + 4, '#3a200c');
}

// ---------------------------------------------------------------------------
// Ruf des Standes (17.10.): oben in den Aufträgen - dort schaut man täglich rein
// ---------------------------------------------------------------------------
function rufKarte() {
  const r = S.ruf();
  const fertig = r.fertig || r.max;
  const z = el('div', 'ruf-kopf' + (fertig ? ' fertig' : ''));
  const anteil = fertig ? 1 : Math.min(1, r.punkte / C.RUF_PUNKTE);
  const preis = Math.round(r.stufe * C.RUF_JE_STUFE * 100);
  const heute = r.max ? 'Höchste Stufe erreicht!'
    : r.fertig ? 'Heute geschafft - morgen geht es weiter.'
    : S.aufsicht() ? `Für heute: ${Math.round(C.RUF_PUNKTE / C.RUF_JE.gold)} goldene Gäste oder eine Minispielrunde`
    : `Für heute: ${Math.round(C.RUF_PUNKTE / C.RUF_JE.normal)} Gäste selbst bedienen oder eine Minispielrunde`;
  // 28.10. (UI-Durchsicht, gemeldet „sehr viel los"): hell statt dunkelblauer Block, „Stufe" steht im
  // Titel, der Preisaufschlag nur, wenn es einen gibt
  z.innerHTML = `<div class="ruf-stern"><b>${r.stufe}</b></div>
    <div class="mitte">
      <div class="ruf-titel"><b>Ruf deines Standes · Stufe ${r.stufe}</b>${preis ? `<span>Preise +${preis} %</span>` : ''}</div>
      <div class="balken-zeile"><div class="balken"><i style="width:${Math.round(100 * anteil)}%"></i></div><span class="zahl">${fertig ? '✓' : Math.round(100 * anteil) + ' %'}</span></div>
      <small>${heute}</small></div>`;
  return z;
}

/**
 * Braucht eine Aufgabe ein Getränk, das gerade nicht im Angebot steht? (26.10., Testbericht:
 * Neues verdrängt das Günstigste von selbst - Sophias Sternenpunsch oder Hildes Kinderpunsch
 * bestellte dann niemand mehr, und nichts sagte, warum.) Hinweis mit Knopf zum Angebot.
 */
function angebotHinweis(id) {
  if (!id || S.aufKarte(id)) return null;
  const z = el('div', 'hinweis-kasten angebot-hinweis', `<span>${C.PRODUKT[id].name} steht gerade nicht in deinem Angebot - so bestellt es niemand.</span>`);
  const k = el('button', 'k k--neben', 'Angebot öffnen');
  k.onclick = () => { T.spiele('klick'); schliesseBlatt(); zeigeStandkarte(); };
  z.appendChild(k);
  return z;
}

/** Bitte eines Stammgastes (17.10.): Text, Aufgabe mit Balken, Abholen → Dank. */
function bitteKarte() {
  const b = A.bitte();
  if (!b) return null;
  const fertig = A.bitteFertig(b), stand = A.bitteStand(b), ziel = A.bitteZiel(b);
  const z = el('div', 'bitte-zettel' + (b.abgeholt ? ' erledigt' : ''));
  z.innerHTML = `<div class="bitte-kopf"><canvas width="32" height="48"></canvas>
      <div class="mitte"><b>${A.bitteName(b)}</b><span class="bitte-text">„${A.bitteDef(b).text}“</span></div></div>
    <div class="bitte-fuss">
      <div class="balken-zeile"><div class="balken"><i style="width:${Math.round(100 * (b.abgeholt ? 1 : stand / ziel))}%"></i></div><span class="zahl">${b.abgeholt ? '✓' : `${stand} / ${ziel}`}</span></div>
      <div class="bitte-knopf"><small>${b.abgeholt ? 'Erledigt - morgen hat wieder jemand eine Bitte.' : A.bitteAufgabe(b)}</small></div></div>`;
  maleStammKlein(z.querySelector('canvas'), b.gast);
  // 28.10.: Der Knopf erscheint nur, wenn es etwas abzuholen gibt (ein grauer „Abholen" sah kaputt aus)
  const k = el('button', 'k k--kauf', 'Abholen');
  if (b.abgeholt || !fertig) k.style.display = 'none';
  k.onclick = () => {
    const e = A.bitteAbholen();
    if (!e) return;
    T.spiele('kauf');
    oeffneAuftraege('heute');
    fenster(e.name, `<p>„${e.dank}“</p><p class="bonus">+ ${S.formatGeld(e.lohn)}</p>`, [{ text: 'Schön!' }]);
  };
  z.querySelector('.bitte-knopf').appendChild(k);
  const d = A.bitteDef(b);
  const hw = d.art === 'getraenk' && !b.abgeholt && !fertig ? angebotHinweis(d.p) : null;
  if (hw) z.querySelector('.bitte-fuss').appendChild(hw);
  // 26.10.: unter Aufsicht lassen die Wichtel diese Gäste stehen (S.nurVonHand)
  else if (d.art === 'getraenk' && !b.abgeholt && !fertig && S.aufsicht()) z.querySelector('.bitte-fuss').appendChild(el('p', 'klein', `Wer ${C.PRODUKT[d.p].name} bestellt, wartet auf dich - die Wichtel lassen diese Gäste stehen.`));
  return z;
}
/**
 * Der offene Wunschzettel unter Aufträge (22.10., gemeldet: „bis zum 16.12. kein
 * Brief"). Der Brief steckte nur im Briefkasten am Haus - einmal gelesen, war der
 * Wunsch nirgends mehr zu sehen, und solange er offen war, kam kein neuer.
 */
function wunschKarte() {
  const b = S.briefe().aktiv;
  if (!b) return null;
  const z = el('div', 'bitte-zettel wunsch-zettel' + (b.dank ? ' fertig' : ''));
  const status = b.dank ? `Erfüllt! ${b.kind} hat dir ein Dankeschön in den Briefkasten gelegt.`
    : b.offen ? 'Ungelesen - der Brief steckt im Briefkasten am Haus.' : 'Noch offen. Kein Zeitdruck.';
  z.innerHTML = `<div class="bitte-kopf"><div class="mitte"><b>Brief von ${esc(b.kind)} (${b.alter})</b>
      <span class="bitte-text">${b.offen && !b.dank ? 'Ein Brief für dich!' : `„${gross1(wunschText(b).replace(/<\/?b>/g, ''))}“`}</span></div></div>
    <div class="bitte-fuss"><div class="bitte-knopf"><small>${status}</small></div></div>`;
  const k = el('button', 'k' + (b.dank ? ' k--kauf' : ' k--neben'), b.dank ? 'Abholen' : b.offen ? 'Lesen' : 'Nochmal lesen');
  k.onclick = () => { T.spiele('klick'); schliesseBlatt(); zeigeBrief(); };
  z.querySelector('.bitte-knopf').appendChild(k);
  return z;
}
/**
 * Meisenknödel ohne Futterhaus (23.10.): Er hängt am Futterhaus, also sieht man
 * ihn vorher nicht. Sagen, wo es das Futterhaus gibt - er wartet so lange.
 */
function knoedelHinweis(id) {
  if (id !== 'kal_knoedel' || S.hat('futterhaus')) return '';
  const fh = C.ARTIKEL.find((a) => a.id === 'futterhaus');
  const preis = fh ? (Array.isArray(fh.kosten) ? fh.kosten[0] : fh.kosten) : 0;
  return `<p class="hinweis-kasten">Du hast noch <b>kein Futterhaus</b>. Es steht im <b>Weihnachtsladen</b> auf der Karte (unter „Im Garten“${preis ? `, ${S.formatGeld(preis)}` : ''}). Der Knödel wartet so lange - sobald das Futterhaus hängt, hängt er daneben.</p>`;
}
/** Kleines Porträt für den Zettel: die Straßenfigur (16 x 24), per Scale2x 32 x 48. */
function maleStammKlein(cv, id) {
  const k = document.createElement('canvas'); k.width = 16; k.height = 24;
  const c = k.getContext('2d', { willReadFrequently: true });
  for (let y = 0; y < 24; y++) r(c, 0, y, 16, 1, mische('#3a2440', '#6a4228', y / 24));
  const def = C.GAESTE[id];
  figurKlein(c, { typ: id, farben: def.farben ? { ...def.farben } : neueFarben(id), phase: 0, laeuft: false }, 8, 23, 0);
  cv.getContext('2d').drawImage(scale2x(k, 16, 24, document.createElement('canvas')), 0, 0);
}

// ---------------------------------------------------------------------------
// Tagesaufträge
// ---------------------------------------------------------------------------
let auftragReiter = 'heute';   // 'heute' | 'erfolge'
export function oeffneAuftraege(reiter) {
  if (reiter) auftragReiter = reiter;
  // Wer schon drin war, braucht die Erklärung nicht mehr (kam im Betatest
  // NACH zwei abgeholten Aufträgen - und dann gleich zweimal)
  S.st.tipps = S.st.tipps || {};
  if (auftragReiter === 'erfolge') S.st.tipps.erfolge = true;
  else if (auftragReiter === 'heute') S.st.tipps.auftraege_neu = S.st.tipps.auftrag = true;
  oeffneBlatt('auftraege', auftragReiter === 'erfolge' ? 'Erfolgswand' : auftragReiter === 'album' ? 'Album' : 'Aufträge');
  const kopf = $('#blattTabs');
  kopf.innerHTML = '';
  const rt = el('div', 'reiter');
  for (const [id, name] of [['heute', 'Aufträge'], ['erfolge', 'Erfolge'], ['album', 'Album']]) {
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
  if (auftragReiter === 'album') return baueAlbum(liste);
  if (S.st.lernen < 99) { liste.appendChild(el('p', 'hinweis', 'Nach der Einführung gibt es hier jeden Tag drei Aufträge.')); return; }
  // 28.10. (UI-Durchsicht, gemeldet „sehr viel los"): Ruf kompakt oben, dann HEUTE mit den drei Aufträgen,
  // dann was Gäste sich wünschen, zuletzt die Sammelstücke. Knöpfe nur, wenn man etwas tun kann;
  // Erledigtes schrumpft auf eine grüne Zeile; Schwierigkeit EINMAL (Farbstreifen + Wort).
  liste.appendChild(rufKarte());
  const heute = A.heute(), abgeholt = heute.filter((a) => a.abgeholt).length;
  const abschnitt = (titel, rechts) => liste.appendChild(el('div', 'abschnitt-kopf', `<span>${titel}</span>${rechts ? `<small>${rechts}</small>` : ''}`));
  abschnitt('Heute', `${abgeholt} von ${heute.length} abgeholt`);
  liste.appendChild(el('p', 'abschnitt-info', S.aufsicht()
    ? 'Es zählt, was am Tresen passiert, während du da bist - Besonderes nur, wenn du selbst bedienst. Morgen gibt es neue.'
    : 'Es zählt nur, was du selbst am Tresen machst. Morgen gibt es neue.'));
  const stufenName = ['leicht', 'mittel', 'schwer'];
  const sterne = (n) => `${Math.round(n).toLocaleString('de-DE')} ★`;
  heute.forEach((a, i) => {
    const bereit = !a.abgeholt && A.fertig(a);
    const z = el('div', `auftrag2 s${a.stufe}` + (a.abgeholt ? ' erledigt' : bereit ? ' bereit' : ''));
    const deko = a.stufe === 2 ? A.naechstesSammelstueck() : null;
    if (a.abgeholt) z.innerHTML = `<span class="haken">✓</span><b>${A.text(a)}</b><span class="lohn">+${sterne(a.lohn)}</span>`;
    else {
      z.innerHTML = `<div class="kopf"><b>${A.text(a)}</b><span class="lohn">${sterne(a.lohn)}</span></div>
        <div class="balken-zeile"><div class="balken"><i style="width:${Math.round(100 * Math.min(1, a.stand / a.ziel))}%"></i></div><span class="zahl">${Math.min(a.stand, a.ziel)} / ${a.ziel}</span></div>
        <div class="fuss"><span class="stufe-name">${stufenName[a.stufe]}</span>${deko ? '<span>+ Sammelstück</span>' : ''}</div>`;
      if (bereit) {
        const k = el('button', 'k k--kauf', 'Abholen');
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
      }
    }
    liste.appendChild(z);
    // Wer die Sorte heute selbst aus dem Angebot genommen hat (26.10.)
    const hw = a.typ === 'produkt' && !a.abgeholt && !A.fertig(a) ? angebotHinweis(a.param) : null;
    if (hw) liste.appendChild(hw);
  });
  // Was Gäste sich wünschen: Bitte eines Stammgasts und Wunschzettel unter EINER Überschrift
  const bk = bitteKarte(), wk = wunschKarte();
  if (bk || wk) {
    abschnitt('Von deinen Gästen');
    if (bk) liste.appendChild(bk);
    if (wk) liste.appendChild(wk);
  }
  // Sammelstücke als kleine Bilder (vorher „???"-Kärtchen); was fehlt, ist ein Schattenriss
  const hat = C.AUFTRAG_DEKO.filter((d) => S.st.kalDeko[d.id]).length;
  abschnitt('Sammelstücke', `${hat} von ${C.AUFTRAG_DEKO.length} · aus schweren Aufträgen`);
  const samm = el('div', 'sammel2');
  for (const d of C.AUFTRAG_DEKO) {
    const da = !!S.st.kalDeko[d.id];
    const t = el('div', 'sammel-teil' + (da ? ' hat' : ''), `<canvas width="16" height="16"></canvas><small>${da ? trennbar(d.name) : '???'}</small>`);
    const cv = t.querySelector('canvas');
    zeichneIcon(cv, d);
    if (!da) { const c = cv.getContext('2d'); c.globalCompositeOperation = 'source-atop'; c.fillStyle = '#8a7a6a'; c.fillRect(0, 0, 16, 16); }
    samm.appendChild(t);
  }
  liste.appendChild(samm);
  $('#blattGeld').textContent = S.formatGeld(S.st.geld);
}

// ---------------------------------------------------------------------------
// Album (10.10.): Besucher, Tiere, Rezepte, Dankesbilder. Was man noch nicht
// gesehen hat, steht als dunkler Umriss da - Lücken machen neugierig.
// ---------------------------------------------------------------------------
const ALBUM_GAESTE = [['erwachsen', 'Spaziergänger'], ['kind', 'Kinder'], ['oma', 'Omas'], ['opa', 'Opas'],
  ['rentier', 'Rentier'], ['schneemann', 'Schneemann'], ['grummel', 'Grummel'], ['weihnachtsmann', 'Weihnachtsmann']];
const ALBUM_TIERE = [['hase', 'Feldhase'], ['eich', 'Eichhörnchen'], ['reh', 'Reh'], ['gold', 'Goldhase'], ['fuchs', 'Fuchs'], ['schwein', 'Wildschwein'], ['igel', 'Igel']];
const ALBUM_TIERE_ALT = ['hase', 'eich', 'reh'];   // die gab es schon vor dem Album (alte Spielstände)
// Weiche Trennstellen an den Wortfugen (28.10.): Die Kacheln sind schmal, „Tannenbäumchen" passt nicht in eine
// Zeile, und hyphens:auto trennt nicht in jedem Browser. Ein Strich erscheint nur, wenn wirklich umbrochen wird.
const FUGEN = ['Weihnachts', 'Geschenke', 'Lebkuchen', 'Tannen', 'Vanille', 'Spazier', 'Seiden', 'Schoko', 'Schnee', 'Eich', 'Kohl', 'Blau', 'Wild', 'Wald', 'Feld', 'Gold', 'Rot', 'Zimt'];
const trennbar = (name) => name.split(' ').map((wort) => { const f = FUGEN.find((x) => wort.startsWith(x) && wort.length - x.length >= 3); return f ? f + '­' + wort.slice(f.length) : wort; }).join(' ');
function albumKarte(name, n, male, w = 24, h = 24, einheit = '×') {
  const k = el('div', 'album-karte' + (n ? '' : ' zu'));
  // n < 0: schon gesehen, aber vor dem Album (10.10.) nicht mitgezählt
  k.innerHTML = `<div class="ak-bild"><canvas width="${w}" height="${h}"></canvas></div><b>${n ? esc(trennbar(name)) : '???'}</b><small>${n > 0 ? `${n.toLocaleString('de-DE')}${einheit}` : n < 0 ? 'schon gesehen' : 'noch nicht gesehen'}</small>`;
  const cv = k.querySelector('canvas'), ctx = cv.getContext('2d');
  cv.style.width = `calc(var(--px) * ${w})`; cv.style.height = `calc(var(--px) * ${h})`;   // 1:1 (11.10.: Tiere sind 28 x 26)
  male(ctx);
  if (!n) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = '#5a4a3e'; ctx.fillRect(0, 0, w, h); }
  return k;
}
/** Vogel auf 28 x 28: klein malen, zweimal per Scale2x vergrößern - Pixel bleiben Spielpixel. */
function maleVogel(ctx, id) {
  // 18.10.: eigene Album-Bilder in Spielpixeln (1:1 wie Gäste und Tiere)
  zeichneVogelAlbum(ctx, id);
}
/**
 * Die Karte des Standes (19.10.): Von allem, was man hat, höchstens
 * C.ANGEBOT_MAX anbieten. Jederzeit umstellbar; das Spiel steht, solange das
 * Fenster offen ist. Je Zeile Preis je Glas, Zubereitungszeit und Handgriff -
 * schnelle Sorten bringen weniger, langsame mehr.
 */
export function zeigeStandkarte() {
  S.st.angebotNeu = false;
  const box = fenster('Dein Angebot', '<p class="klein karte-kopf"></p><div class="karte-liste"></div>', [{ text: 'Fertig' }]);
  const kopf = box.querySelector('.karte-kopf'), liste = box.querySelector('.karte-liste');
  const nb = ' ';
  function bauen() {
    const a = S.angebot();
    kopf.textContent = `${a.length} von ${C.ANGEBOT_MAX} Plätzen belegt. Gäste wünschen sich nur, was du anbietest.`;
    liste.innerHTML = '';
    for (const p0 of S.produkteBesessen()) {
      const an = a.includes(p0.id);
      const z = el('div', 'karte-zeile' + (an ? ' an' : ''));
      const cv = el('canvas', 'karte-ico'); cv.width = 20; cv.height = 20;
      iconGross(cv.getContext('2d'), p0.id, 0, 0, 0);
      const preis = Math.round(S.produktPreis(p0) * S.preisFaktor());
      const teile = [`★${nb}${preis.toLocaleString('de-DE')}${nb}je${nb}Stück`];
      if (p0.zeit) teile.push(`${String(p0.zeit).replace('.', ',')}${nb}s`);
      if (p0.griffe) teile.push(p0.griffe.map((g) => C.HANDGRIFF[g].name).join(' + '));
      const txt = el('div', 'txt', `<b>${p0.name}</b><span>${teile.join(`${nb}· `)}</span>`);
      const voll = !an && a.length >= C.ANGEBOT_MAX;
      const k = el('button', 'k' + (an ? ' k--wahl gewaehlt' : voll ? ' k--neben' : ''), an ? '✓ Im Angebot' : voll ? 'Karte voll' : 'Anbieten');
      if (voll || (an && a.length <= 1)) k.disabled = true;
      k.onclick = () => {
        if (!S.setzeAngebot(p0.id, !an)) { T.spiele('falsch'); return; }
        T.spiele('klick'); bauen();
      };
      z.append(cv, txt, k);
      liste.appendChild(z);
    }
    const rest = C.PRODUKTE.length - S.produkteBesessen().length;
    if (rest > 0) liste.appendChild(el('p', 'klein', `Noch ${rest} weitere Sorten gibt es später im Supermarkt auf der Karte.`));
  }
  bauen();
}

/**
 * Das Futterhaus groß (18.10.): Futterberg in fünf Stufen, Hinweis, wann es leer
 * ist, Nachfüllen - und die Vögel, die gerade da sind. Das Spiel steht, solange
 * das Fenster offen ist; die Vögel kommen und gehen trotzdem (S.vogelTakt).
 */
export function zeigeFutterhaus() {
  const box = fenster('Dein Futterhaus', `
    <canvas class="futter-szene" width="${FSZ_W}" height="${FSZ_H}"></canvas>
    <div class="futter-stand einer"><i></i></div>
    <p class="futter-text"></p>`,
  [{ text: 'Futter nachfüllen', aktion: () => {
      if (S.futterStand().stufe >= 5) return false;
      T.spiele('koerner'); S.fuettere(); toast(`Futterhaus gefüllt - hält ${C.FUTTER_STUNDEN} Stunden.`, 'gut'); anzeige(); return false;
    } }, { text: 'Schließen', neben: true }]);
  const cv = box.querySelector('canvas'), c = cv.getContext('2d');
  const knopf = box.querySelector('.k'), balken = box.querySelector('.futter-stand i');
  const text = box.querySelector('.futter-text');
  const zu = cv.__zu = {};   // (zum Testen von außen erreichbar)
  // Vogel antippen: +VOGEL_STERNE, einmal je Besuch (S.vogelAntippen prüft das)
  cv.onclick = (e) => {
    const rc = cv.getBoundingClientRect(), x = (e.clientX - rc.left) / rc.width * FSZ_W, y = (e.clientY - rc.top) / rc.height * FSZ_H;
    zu.texte = zu.texte || [];
    // Der Vogel im Flugloch (19.10.): selten da, einmal +GUCK_STERNE
    const gy = 46 + FSZ_DY;
    if (zu.guck && zu.guck.sichtbar && Math.abs(x - FSZ_CX) <= 8 && Math.abs(y - gy) <= 10) {
      const b = S.guckVogelAntippen(zu.guck);
      if (b) { T.spiele('spezialKasse'); zu.texte.push({ x: FSZ_CX, y: 46 - 12, text: '+' + b, t: 0 }); zu.guck.t = Math.max(zu.guck.t, zu.guck.dauer - 0.5); }
      else T.spiele('klick');
      return;
    }
    const hit = (zu.treffer || []).filter((q) => Math.abs(x - q.x) <= 12 && y >= q.y - 26 && y <= q.y + 2).sort((a, b) => Math.abs(x - a.x) - Math.abs(x - b.x))[0];
    if (!hit) return;
    // Je seltener der Vogel, desto mehr Sterne (19.10.); Texte liegen in der tiefer gehängten Ebene
    const b = S.vogelAntippen(hit.b);
    if (b) { T.spiele('kasse'); zu.texte.push({ x: hit.x, y: hit.y - FSZ_DY - 28, text: '+' + b, t: 0 }); }
    else T.spiele('klick');
  };
  // 22.10.: EIN Balken statt fünf Teilen, und nur noch grobe Stunden (keine Uhrzeit)
  function anzeige() {
    const f = S.futterStand();
    // In Fünfteln (24.10., gemeldet: Balken schon 10 % kürzer, aber Nachfüllen ging noch nicht):
    // Er sinkt erst, wenn ein Fünftel verbraucht ist - genau dann geht auch das Nachfüllen
    balken.style.width = f.stufe * 20 + '%';
    balken.className = f.stufe <= 1 ? 'knapp' : 'voll';
    const h = Math.round(f.rest / 3600000);
    if (f.stufe === 0) text.innerHTML = '<b>Leer!</b> Solange nichts drin ist, kommen keine Vögel. Füll es nach, dann kommen sie bald.';
    else {
      const rest = h >= 2 ? `rund ${h} Stunden` : h === 1 ? 'rund eine Stunde' : 'weniger als eine Stunde';
      text.innerHTML = `Futter noch für <b>${rest}</b>.` + (f.stufe <= 2 ? ' <span class="futter-knapp">Bald nachfüllen!</span>' : '');
    }
    knopf.disabled = f.stufe >= 5;
    knopf.textContent = f.stufe >= 5 ? 'Futter ist voll' : f.stufe === 0 ? 'Futter einfüllen' : 'Futter nachfüllen';
  }
  anzeige();
  let letzt = performance.now(), akt = 0;
  (function schleife(now) {
    if (!cv.isConnected || document.querySelector('#modal').classList.contains('versteckt')) return;
    const dt = Math.min(0.1, (now - letzt) / 1000); letzt = now;
    S.vogelTakt(dt);
    const f = S.futterStand();
    zeichneFutterSzene(c, now / 1000, { stufe: f.stufe, variante: S.variante('futterhaus'), knoedel: S.hat('kal_knoedel'), voegel: S.lauf.voegel,
      schnee: Z.schnee() > 0, hell: Z.licht().hell }, zu);
    if ((akt += dt) > 1) { akt = 0; anzeige(); }
    requestAnimationFrame(schleife);
  })(performance.now());
}
/**
 * Steckbrief eines Vogels (14.10.): beim ersten Besuch am Futterhaus (`neu`,
 * aus main.js, sobald nichts anderes offen ist) und beim Antippen im Album.
 */
export function zeigeVogel(id, neu = true) {
  const v = C.VOEGEL.find((q) => q.id === id);
  if (!v) return;
  const vg = S.st.voegel || {};
  const wann = v.nacht ? 'Kommt nur nachts.' : v.schnee ? 'Kommt nur, wenn Schnee liegt.' : v.nachtAuch ? 'Kommt auch nachts.' : '';
  if (neu) T.spiele(v.selten ? 'spezial' : 'fertig');
  const box = fenster(neu ? `Neu am Futterhaus: ${v.name}!` : v.name, `
    <canvas class="vogel-gross" width="28" height="28"></canvas>
    ${v.selten ? '<p class="bonus">Ein seltener Gast!</p>' : ''}
    <p>${v.text}</p>
    ${wann ? `<p class="klein">${wann}</p>` : ''}
    <p class="klein">${neu ? 'Neu im Album · ' : `${(vg[id] || 0).toLocaleString('de-DE')}× gesehen · `}${C.VOEGEL.filter((q) => vg[q.id]).length} von ${C.VOEGEL.length} Vogelarten entdeckt</p>`,
  [{ text: neu ? 'Voll schön!' : 'Weiter', aktion: () => { if (neu) { const o = ortVon('futterhaus'); if (o) funkeln(o.x, o.y); } } }]);
  maleVogel(box.querySelector('canvas').getContext('2d'), id);
}
/**
 * Porträt eines Stammgastes (17.10.): am Tresen, hinter ihm die Bretterwand
 * des Standes mit Lichterkette. 64 x 52 in Spielpixeln, per Scale2x doppelt.
 */
const PORTRAET_W = 64, PORTRAET_H = 52;
function maleStamm(cv, id) {
  const k = document.createElement('canvas'); k.width = PORTRAET_W; k.height = PORTRAET_H;
  const c = k.getContext('2d', { willReadFrequently: true });
  for (let y = 0; y < PORTRAET_H; y++) r(c, 0, y, PORTRAET_W, 1, mische('#3a2440', '#6a4228', y / PORTRAET_H));
  for (let x = 7; x < PORTRAET_W; x += 12) r(c, x, 0, 1, 44, '#2e1c26');   // Bretterfugen
  const BUNT = ['#ff4a4a', '#5aff6a', '#4a8aff', '#ffd040', '#ff6adf'];
  for (let x = 0; x < PORTRAET_W; x++) p(c, x, 5 + Math.round(Math.sin(x / 5) * 1.5), '#1e3a1e');   // Kabel der Lichterkette
  for (let x = 3, i = 0; x < PORTRAET_W; x += 6, i++) { const y = 7 + Math.round(Math.sin(x / 5) * 1.5); p(c, x, y, BUNT[i % 5]); p(c, x, y + 1, mische(BUNT[i % 5], '#000000', 0.3)); }
  const def = C.GAESTE[id];
  figurGross(c, { typ: id, farben: def.farben ? { ...def.farben } : neueFarben(id), phase: 0 }, 32, 46, 0, 'froh');
  r(c, 0, 44, PORTRAET_W, 8, '#a8703a'); r(c, 0, 44, PORTRAET_W, 1, '#d09050'); r(c, 0, 51, PORTRAET_W, 1, '#6a4222');   // Tresen
  cv.getContext('2d').drawImage(scale2x(k, PORTRAET_W, PORTRAET_H, document.createElement('canvas')), 0, 0);
}
/**
 * Geschichte eines Stammgastes (17.10.): Bild, Satz, „Geschichte 3 / 8" mit
 * Balken. Kommt aus st.stammNeu (main.js), sobald nichts anderes offen ist;
 * das offene Fenster hält das Spiel an.
 */
export function zeigeStamm(f) {
  const def = C.GAESTE[f.id];
  if (!def) return;
  T.spiele('spezial');
  const fuss = f.geschenk
    ? `<p class="bonus">Ein Geschenk für dich! + ${S.formatGeld(f.betrag || 0)}</p>`
    : `<div class="story-stand"><span>Geschichte ${f.nr} / ${f.von}</span><div class="balken"><i style="width:${Math.round(100 * f.nr / f.von)}%"></i></div></div>
       ${f.erster ? `<p class="klein">${def.name} kommt jetzt jeden Tag vorbei - und erzählt jedes Mal ein Stück weiter.</p>` : ''}`;
  const box = fenster(def.name, `
    <canvas class="stamm-portraet" width="${PORTRAET_W * 2}" height="${PORTRAET_H * 2}"></canvas>
    <p class="story-text">${f.geschenk ? f.text : `„${f.text}“`}</p>
    ${fuss}`, [{ text: 'Weiter' }]);   // Geschenk = Erzähltext, ohne Anführungszeichen (17.10., sonst doppelt verschachtelt)
  maleStamm(box.querySelector('canvas'), f.id);
}

/**
 * Die Geschichten eines Stammgastes nachlesen (25.10., Nutzerwunsch): Porträt, wie weit die
 * Geschichte ist, die erzählten Sätze - und für jeden noch fehlenden eine gesperrte Zeile, damit
 * man sieht, wie viele noch kommen. Am Ende das Abschiedsgeschenk (24.12. bis 6.1.), bis dahin verdeckt.
 */
function zeigeStammBuch(id) {
  const def = C.GAESTE[id], s = C.STAMMGAESTE[id];
  const e = (S.st.stamm || {})[id] || { n: 0 };
  const erzaehlt = Math.min(e.n || 0, s.saetze.length), alle = s.saetze.length;
  const zeilen = s.saetze.map((satz, i) => i < erzaehlt
    ? `<li class="erzaehlt"><span class="nr">${i + 1}</span>„${esc(S.mitGruss(id, satz))}“</li>`
    : `<li class="gesperrt"><span class="nr">${i + 1}</span>Noch nicht erzählt - ${i === erzaehlt ? `beim nächsten Besuch erzählt ${def.name.split(' ').pop()} weiter.` : 'spiel weiter!'}</li>`).join('');
  const geschenk = e.geschenk
    ? `<li class="erzaehlt geschenk"><span class="nr">★</span>${esc(s.geschenk)}</li>`
    : `<li class="gesperrt geschenk"><span class="nr">★</span>Eine Überraschung an den Feiertagen - wenn ihr euch gut kennt.</li>`;
  const box = fenster(def.name, `
    <canvas class="stamm-portraet" width="${PORTRAET_W * 2}" height="${PORTRAET_H * 2}"></canvas>
    <div class="story-stand"><span>${erzaehlt} von ${alle} Geschichten</span><div class="balken"><i style="width:${Math.round(100 * erzaehlt / alle)}%"></i></div></div>
    <ol class="stamm-buch">${zeilen}${geschenk}</ol>`, [{ text: 'Schließen' }]);
  maleStamm(box.querySelector('canvas'), id);
}

function baueAlbum(liste) {
  const typ = S.st.stats.typ || {}, tiere = S.st.stats.tiere || {};
  const kopf = (titel, da, alle) => liste.appendChild(el('p', 'gruppe', `${titel}: ${da} / ${alle}`));
  // Besucher am Stand
  kopf('Besucher am Stand', ALBUM_GAESTE.filter(([t]) => typ[t]).length, ALBUM_GAESTE.length);
  const g = el('div', 'album-raster set-gaeste');
  for (const [t, name] of ALBUM_GAESTE) g.appendChild(albumKarte(name, typ[t] || 0, (ctx) => figurKlein(ctx, { typ: t, farben: neueFarben(t), phase: 0, laeuft: false }, 12, 22, 0), 24, 24, '× bedient'));
  liste.appendChild(g);
  // Stammgäste (13.10.): wer schon da war, mit der Zahl der Besuche
  const stamm = Object.keys(C.STAMMGAESTE);
  kopf('Stammgäste', stamm.filter((id) => S.stammBesuche(id)).length, stamm.length);
  const sg = el('div', 'album-raster set-stamm');
  for (const id of stamm) {
    const k = albumKarte(C.GAESTE[id].name, S.stammBesuche(id), (ctx) => figurKlein(ctx, { typ: id, farben: { ...C.GAESTE[id].farben }, phase: 0, laeuft: false }, id === 'hilde' ? 16 : 12, 22, 0), id === 'hilde' ? 28 : 24, 24, '× da gewesen');
    // 25.10.: antippen = die Geschichten nachlesen (wer noch nie da war, bleibt ???)
    if (S.stammBesuche(id)) { k.classList.add('tippbar'); k.onclick = () => { T.spiele('klick'); zeigeStammBuch(id); }; }
    sg.appendChild(k);
  }
  liste.appendChild(sg);
  // Tiere der Waldlichtung
  kopf('Tiere der Waldlichtung', ALBUM_TIERE.filter(([a]) => tiere[a] || (!S.st.stats.tiere && S.miniRekord('lichtung') > 0 && ALBUM_TIERE_ALT.includes(a))).length, ALBUM_TIERE.length);
  const ti = el('div', 'album-raster set-tiere');
  // Alte Spielstände: Wer die Lichtung schon gespielt hat, kennt Hase, Eichhörnchen und Reh
  const frueher = !S.st.stats.tiere && S.miniRekord('lichtung') > 0;
  for (const [a, name] of ALBUM_TIERE) ti.appendChild(albumKarte(name, tiere[a] || (frueher && ALBUM_TIERE_ALT.includes(a) ? -1 : 0), (ctx) => LI.zeichneTierAlbum(ctx, a, 14, 24), 28, 26, '× gefüttert'));
  liste.appendChild(ti);
  // Vögel am Futterhaus (11.10.) - erst, wenn es eins gibt; Seltene als „???"-Umriss
  if (S.hat('futterhaus') || Object.keys(S.st.voegel || {}).length) {
    const vg = S.st.voegel || {};
    kopf('Vögel am Futterhaus', C.VOEGEL.filter((v) => vg[v.id]).length, C.VOEGEL.length);
    const vr = el('div', 'album-raster set-voegel');
    for (const v of C.VOEGEL) {
      const k = vr.appendChild(albumKarte(v.name, vg[v.id] || 0, (ctx) => maleVogel(ctx, v.id), 28, 28, '× gesehen'));
      // Gesehene Vögel lassen sich antippen: Steckbrief wie beim ersten Besuch (14.10.)
      if (vg[v.id]) { k.classList.add('tippbar'); k.onclick = () => { T.spiele('klick'); zeigeVogel(v.id, false); }; }
    }
    liste.appendChild(vr);
  }
  // Rezepte - erst, wenn die Backstube auf der Karte steht (Minispiele kommen nach und nach)
  if (S.miniOffen('back')) {
    kopf('Rezepte aus der Backstube', S.backRezepte().length, C.BACK_REZEPTE.length);
    liste.appendChild(rezeptbuch());
  }
  // Dankesbilder
  const bilder = S.briefe().erfuellt;
  kopf('Dankesbilder', bilder.length, C.BRIEF_MAX);
  if (!bilder.length) liste.appendChild(el('p', 'klein', 'Noch keine. Ab und zu steckt ein Brief im Briefkasten neben deiner Haustür - wer einen Wunsch erfüllt bekommt, malt dir ein Bild.'));
  const bw = el('div', 'album-bilder');
  for (const b of bilder) {
    const k = el('div', 'album-bild', `<canvas width="48" height="36"></canvas><small>von ${esc(b.kind)} (${b.alter})</small>`);
    zeichneDankesbild(k.querySelector('canvas'), b);
    bw.appendChild(k);
  }
  liste.appendChild(bw);
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
    // Bis dahin jeden Tag ein Vorfreude-Päckchen (spiel.js)
    const vf = el('button', 'vorfreude' + (S.vorfreudeBereit() ? ' bereit' : ''));
    vf.innerHTML = S.vorfreudeBereit()
      ? '<span class="vf-ico">🎁</span><b>Vorfreude-Päckchen</b><small>Heute für dich - antippen!</small>'
      : `<span class="vf-ico">🎁</span><b>Vorfreude-Päckchen</b><small>${S.spieltag() < 1 ? 'Ab morgen wartet hier jeden Tag eins - bis die Türchen aufgehen.' : 'Heute schon geöffnet. Morgen wartet das nächste!'}</small>`;
    vf.onclick = () => {
      const betrag = S.oeffneVorfreude();
      if (!betrag) { T.spiele('falsch'); toast(S.spieltag() < 1 ? 'Das erste Päckchen gibt es morgen.' : 'Das nächste Päckchen gibt es morgen.', 'hinweis'); return; }
      T.spiele('tuer');
      oeffneKalender();
      fenster('Vorfreude!', `<div class="gross-ico">🎁</div><p>Im Päckchen stecken</p><p class="summe">${S.formatGeld(betrag)}</p><p class="klein">Bis zum 1. Dezember gibt es jeden Tag eins.</p>`);
    };
    liste.appendChild(vf);
  }
  // Barbarazweig (10.10.): ab dem 4.12. schneiden, dann täglich gießen
  const bz = S.barbaraZustand();
  if (bz || S.barbaraSchneidbar()) {
    const bb = el('button', 'vorfreude barbara' + (S.barbaraSchneidbar() || S.barbaraGiessbar() ? ' bereit' : ''));
    const zeile = !bz ? 'Heute ist Barbaratag! Schneide einen Kirschzweig - an Heiligabend blüht er.'
      : bz.bluehen ? `Er blüht! ${bz.blueten} Blüten - für jeden Tag, an dem du gegossen hast, eine mehr.`
      : bz.heuteGegossen ? `Heute gegossen. Noch ${24 - Z.dezemberTag()} ${24 - Z.dezemberTag() === 1 ? 'Tag' : 'Tage'} bis Heiligabend.`
      : 'Antippen zum Gießen - jeder Tag bringt eine Blüte mehr.';
    if (!bz && Z.dezemberTag() > C.BARBARA_TAG) bb.dataset.spaet = '1';
    bb.innerHTML = `<canvas class="vf-ico zweig" width="14" height="18"></canvas><b>Barbarazweig</b><small>${zeile}${!bz && Z.dezemberTag() > C.BARBARA_TAG ? ' Auch später geschnitten blüht er noch.' : ''}</small>`;
    barbaraZweig(bb.querySelector('canvas').getContext('2d'), 4, 18, bz || { blueten: 0, wachs: 0, bluehen: false }, null, 0);
    bb.onclick = () => {
      if (S.barbaraSchneiden()) { T.spiele('greifen'); toast('Der Zweig steht jetzt am Fenster.', 'gut'); oeffneKalender(); return; }
      if (S.barbaraGiessen()) { T.spiele('giessen'); toast('Gegossen - eine Knospe mehr.', 'gut'); oeffneKalender(); return; }
      T.spiele('klick');
      if (bz && !bz.bluehen) toast('Heute hat er schon Wasser. Morgen wieder!', 'hinweis');
    };
    liste.appendChild(bb);
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
      if (e.deko) fenster(`Türchen ${n}`, `<div class="gross-ico">🎁</div><p><b>${e.deko.name}</b></p><p>${e.deko.text}</p><p class="bonus">♥ +${e.deko.stimmung} Stimmung</p>${knoedelHinweis(e.deko.id)}<p class="klein">Gibt es nur hier im Kalender.</p>`);
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
/**
 * iPhone/iPad im Browser, nicht als App vom Home-Bildschirm (12.10.). Dort
 * löscht Safari die Daten einer Seite, die 7 Tage nicht geöffnet wurde - als
 * App gilt das nicht. iPadOS meldet sich als Mac, verrät sich aber über Touch.
 */
export function iosImBrowser() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const app = navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches);
  return ios && !app;
}
export function zeigeInstallTipp() {
  S.st.installTipp = Date.now(); S.speichere();
  fenster('Tipp: Als App speichern', `
    <p>Leg das Spiel auf deinen Home-Bildschirm - dann startet es wie eine App, im Vollbild, auch ohne Internet.</p>
    <ol class="anleitung">
      <li>In Safari auf <b>Teilen</b> tippen <span class="teilen-zeichen" aria-hidden="true"></span> (unten in der Leiste oder im <b>···</b>-Menü)</li>
      <li><b>„Zum Home-Bildschirm“</b> wählen (evtl. etwas nach unten scrollen)</li>
      <li>Oben rechts auf <b>Hinzufügen</b></li>
    </ol>
    <p class="klein">Warum? Safari löscht die Daten einer Webseite, die 7 Tage lang nicht geöffnet wurde - auch deinen Spielstand. Als App auf dem Home-Bildschirm passiert das nicht. Danach startest du das Spiel nur noch über das neue Symbol.</p>
    <p class="hinweis-kasten"><b>Wichtig:</b> Die App fängt mit einem eigenen Spielstand an - dein Fortschritt hier im Browser kommt nicht mit. Am besten wechselst du gleich jetzt. Schon weiter? Dann im Menü „Spielstand sichern“ und in der App „Spielstand laden“.</p>`,
  [{ text: 'Alles klar' }]);
}

/** Was das Feedback-Formular über die Lage erfährt: keine Namen, kein Spielstand. */
function feedbackInfo() {
  const ua = navigator.userAgent;
  const geraet = /iPhone/.test(ua) ? 'iPhone' : /iPad|Macintosh.*Mobile/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'anderes Gerät';
  const browser = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Browser';
  const app = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches ? 'als App' : 'im Browser';
  const version = new URL(import.meta.url).searchParams.get('v') || 'lokal';
  const d = Z.jetzt();
  return [`Version ${version}`, MODUS_NAME[S.st.modus === 'eigen' ? 'eigen' : 'echt'], `Spieltag ${S.spieltag() >= 99 ? '?' : S.spieltag() + 1}`,
    `Spieldatum ${d.getDate()}.${d.getMonth() + 1}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    `Stimmung ${S.stimmung()}`, `Ziel ${S.st.ziel || 0}`, `${geraet}, ${browser} ${app}`, `${window.innerWidth}x${window.innerHeight}`].join(' · ');
}
function zeigeFeedback() {
  const info = feedbackInfo();
  fenster('Feedback geben', `
    <p>Danke für dein Feedback! Was ist dir aufgefallen - ein Fehler, etwas Unklares, eine Idee? Schreib es einfach rein.</p>
    <p class="klein">Das Formular öffnet sich in einem neuen Fenster (Google Formulare). Mitgeschickt wird nur diese Zeile, damit wir die Meldung einordnen können - kein Name, kein Spielstand:</p>
    <p class="klein"><code>${esc(info)}</code></p>`, [
    { text: 'Zum Formular', aktion: () => {
      const u = new URL(C.FEEDBACK.url);
      if (C.FEEDBACK.infoFeld) { u.searchParams.set('usp', 'pp_url'); u.searchParams.set(C.FEEDBACK.infoFeld, info); }
      window.open(u.toString(), '_blank', 'noopener');
    } },
    { text: 'Abbrechen', neben: true },
  ]);
}

export function oeffneMenue() {
  oeffneBlatt('menue', 'Punsch & Lichterglanz');
  $('#blattTabs').classList.add('versteckt');
  const liste = $('#blattInhalt');
  liste.innerHTML = '';
  const b = S.boni();
  // 21.10.: Statistik wieder offen, aber kompakt in zwei Spalten (Name oben klein,
  // Wert darunter) - so passt das Menü auch bei 9:16 ohne Aufklappfeld
  const stat = el('div', 'statistik kompakt');
  stat.innerHTML = `
    <div class="breit"><span>Haus</span><b>${esc(S.st.name || '-')}</b></div>
    <div><span>Spielmodus</span><b>${MODUS_NAME[S.st.modus === 'eigen' ? 'eigen' : 'echt']}</b></div>
    <div><span>Wetter heute</span><b>${(C.WETTER_LAGEN[Z.tagesWetter().art] || { name: 'Ruhig' }).name}, ${Z.tagesWetter().temp}°</b></div>
    <div><span>Stimmung</span><b>♥ ${S.stimmung()}</b></div>
    <div><span>Gäste kommen alle</span><b>${S.gastTakt().toFixed(1).replace('.', ',')} s</b></div>
    <div><span>Preisaufschlag</span><b>+${Math.round((S.preisFaktor() - 1) * 100)} %</b></div>
    <div><span>Wichtel verdienen</span><b>${S.formatGeld(S.wichtelProSekunde() * 60)}/min</b></div>
    <div><span>Bedient</span><b>${S.st.stats.bedient.toLocaleString('de-DE')}</b></div>
    <div><span>Verdient insgesamt</span><b>${S.formatGeld(S.st.gesamt)}</b></div>
    ${S.st.andenken ? `<div class="breit"><span>Andenken (ein ★ für jedes geschmückte Jahr)</span><b>★ ${S.st.andenken}</b></div>` : ''}`;
  // 26.10.: wann die Kiste kommt und wann sie voll ist (Testbericht: kurze Besuche verstehen)
  if (S.hat('servier')) stat.insertAdjacentHTML('beforeend', `<div class="breit"><span>Wichtel-Kiste</span><b>ab 1 Std. weg · voll nach ${String(S.offlineStunden()).replace('.', ',')} Std.</b></div>`);
  const karte = el('div', 'menue-statistik');
  karte.appendChild(el('h3', null, 'Statistik'));
  karte.appendChild(stat);
  liste.appendChild(karte);
  liste.appendChild(sterneJetzt());

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
  // Geräusche, Vorschau, Haus umbenennen, So geht's liegen seit 21.10. unter „Einstellungen"
  const einst = el('button', 'k k--neben', 'Einstellungen');
  einst.onclick = () => oeffneEinstellungen();
  ton.appendChild(einst);
  // Nach den Startzielen: nächstes Ziel vorschlagen lassen oder selbst erkunden (13.10.)
  if (ZL.fertig()) ton.appendChild(mk('Nächstes Ziel zeigen', S.st.zieleWeiter === true, () => { S.st.zieleWeiter = S.st.zieleWeiter !== true; S.speichere(); zielLeiste(); }));
  liste.appendChild(ton);

  const zeile = el('div', 'schalter');
  // Solange die Einführung (samt Startzielen) läuft: überspringen, sonst nochmal
  const neu = el('button', 'k k--neben', lernenLaeuft() ? 'Einführung überspringen' : 'Einführung nochmal');
  neu.onclick = () => {
    if (!lernenLaeuft()) { nochmalLernen(); schliesseBlatt(); return; }
    fenster('Einführung überspringen?', '<p>Die Erklärblasen und die Startziele oben werden ausgeblendet. Im Menü kannst du die Einführung jederzeit wieder starten.</p>', [
      { text: 'Überspringen', aktion: () => { ueberspringen(); schliesseBlatt(); zielLeiste(); toast('Einführung übersprungen - viel Spaß!', 'gut'); } },
      { text: 'Abbrechen', neben: true },
    ]);
  };
  zeile.appendChild(neu);
  // iPhone im Browser: die Anleitung zum Home-Bildschirm jederzeit wieder (12.10.)
  if (iosImBrowser()) {
    const ins = el('button', 'k k--neben', 'Als App speichern');
    ins.onclick = () => zeigeInstallTipp();
    zeile.appendChild(ins);
  }
  // Feedback der Testspieler (12.10.): erst, wenn ein Formular eingetragen ist
  if (C.FEEDBACK.url) {
    const fb = el('button', 'k k--neben', 'Feedback geben');
    fb.onclick = () => zeigeFeedback();
    zeile.appendChild(fb);
  }
  // Ab Heiligabend: den Rückblick noch einmal ansehen
  if (S.heiligabendJetzt() && S.st.heiligabend === Z.saison()) {
    const rb = el('button', 'k k--neben', 'Mein Advent');
    rb.onclick = () => { schliesseBlatt(); zeigeRueckblick(); };
    zeile.appendChild(rb);
  }
  // Spielstand als Datei (14.10.): sichern und auf einem anderen Gerät laden
  const datei = zeile;
  const sich = el('button', 'k k--neben', 'Spielstand sichern');
  sich.onclick = () => standSichern();
  const lade = el('button', 'k k--neben', 'Spielstand laden');
  lade.onclick = () => standLaden();
  datei.appendChild(sich); datei.appendChild(lade);
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
 * „Was bringt gerade mehr Sterne?" (26.10., Testbericht: zu viele „×2", die man nicht
 * auseinanderhält). Nur, was JETZT gilt, in Worten - Selbst servieren steht immer oben.
 */
function sterneJetzt() {
  const z = [];
  const pz = (f) => `+${Math.round(f * 100)}${' '}%`;
  z.push(['Selbst servieren', 'doppelte Sterne und Trinkgeld']);
  const zimt = S.zimtRest();
  if (zimt) z.push(['Zimtstern', `selbst Serviertes noch einmal doppelt (noch ${Math.floor(zimt / 60)}:${String(zimt % 60).padStart(2, '0')})`]);
  if (S.lauf.ansturm) z.push(['Ansturm', 'dreifaches Trinkgeld']);
  const haus = (1 + S.stimmung() * C.STIMMUNG_PREIS) * (1 + S.boni().preis) - 1;
  if (haus > 0.005) z.push(['Stimmung und Deko', `alle Preise ${pz(haus)}`]);
  const r = S.ruf();
  if (r.stufe) z.push([`Ruf Stufe ${r.stufe}`, `alle Preise ${pz(r.stufe * C.RUF_JE_STUFE)}`]);
  const rez = C.MARKT_REZEPTE.filter((x) => S.rezeptStufe(x.id));
  if (rez.length) z.push(['Rezepte', rez.map((x) => `${x.fuer.map((id) => C.PRODUKT[id].name).join(' und ')} ${pz(S.rezeptPlus(x.id))}`).join(' · ')]);
  const lage = C.WETTER_LAGEN[Z.tagesWetter().art];
  if (lage) z.push([lage.name, `${lage.text.replace(/^Heute /, '')} (${pz(lage.bonus)})`]);
  if (S.chorJetzt()) z.push(['Chor vor dem Haus', `alle Gäste zahlen ${pz(C.CHOR.bonus)} (bis ${C.CHOR.bis} Uhr)`]);
  if (S.dose().length) z.push(['Plätzchendose', `selbst bedient ${pz(C.DOSE_BONUS)} (noch ${S.dose().length})`]);
  const gaeste = [];
  if (Z.adventssonntag()) gaeste.push('Adventssonntag');
  if (S.marktHeute()) gaeste.push('Markttag');
  if (S.feierabend()) gaeste.push(`Feierabend bis ${C.FEIERABEND.bis} Uhr`);
  if (gaeste.length) z.push(['Mehr Gäste', gaeste.join(', ')]);
  // Zugeklappt (sonst schob es die Knöpfe des Menüs aus dem Bild), oben die Namen als Vorschau
  const k = el('details', 'menue-statistik sterne-jetzt');
  k.appendChild(el('summary', null, `<b>Mehr Sterne gerade</b><small>${z.map(([a]) => a).join(' · ')}</small>`));
  k.appendChild(el('div', 'statistik kompakt', z.map(([a, b]) => `<div class="breit"><span>${a}</span><b>${b}</b></div>`).join('')));
  return k;
}

/** Unterseite „Einstellungen" im Menü (21.10.): Geräusche, Vorschau, Haus umbenennen, So geht's. */
function oeffneEinstellungen() {
  oeffneBlatt('menue', 'Einstellungen');
  $('#blattTabs').classList.add('versteckt');
  $('#blattTitel').onclick = null;
  const liste = $('#blattInhalt');
  liste.innerHTML = '';
  const mk = (label, an, f) => { const k = el('button', 'k k--wahl' + (an ? ' gewaehlt' : ''), `${label}: ${an ? 'an' : 'aus'}`); k.onclick = () => { f(); oeffneEinstellungen(); }; return k; };
  const schalter = el('div', 'schalter einzeln');
  schalter.appendChild(mk('Geräusche', S.st.ton.fx, () => { S.st.ton.fx = !S.st.ton.fx; T.setzeFx(S.st.ton.fx); S.speichere(); }));
  // Vorschau „Morgen wartet …" abschaltbar (13.10.)
  schalter.appendChild(mk('Vorschau auf morgen', S.st.vorschauAus !== true, () => { S.st.vorschauAus = S.st.vorschauAus !== true; S.speichere(); }));
  const nm = el('button', 'k k--neben', 'Haus umbenennen');
  nm.onclick = () => frageName(true);
  const hilfe = el('button', 'k k--neben', 'So geht’s');
  hilfe.onclick = () => zeigeHilfe();
  const cred = el('button', 'k k--neben', 'Credits');
  cred.onclick = () => zeigeCredits();
  schalter.appendChild(nm); schalter.appendChild(hilfe); schalter.appendChild(cred);
  liste.appendChild(schalter);
  const zurueck = el('div', 'schalter neustart');
  const zk = el('button', 'k', '‹ Zurück zum Menü');
  zk.onclick = () => oeffneMenue();
  zurueck.appendChild(zk);
  liste.appendChild(zurueck);
  $('#blattGeld').textContent = S.formatGeld(S.st.geld);
}

/** Credits (27.10.): Musik von Pixabay mit Künstlernamen, dazu Suno und die Schriften. */
function zeigeCredits() {
  const gruppen = C.MUSIK_CREDITS.map((g) => `<p class="credits-wo">${g.wo}</p>
    <ul class="credits">${g.stuecke.map((s) => `<li><a href="https://pixabay.com/music/${s.seite}/" target="_blank" rel="noopener">„${esc(s.titel)}“</a><br><span class="klein">von <b>${esc(s.von)}</b></span></li>`).join('')}</ul>`).join('');
  fenster('Credits', `
    <p><b>Musik</b> von <b>Pixabay</b> (Pixabay Content License) - vielen Dank an:</p>
    ${gruppen}
    <p class="klein">Zwei weitere Stücke (am Haus und auf der Karte bis zum 1. Advent) sind mit Suno entstanden.</p>
    <p><b>Schriften:</b> Nunito und Pixelify Sans (SIL Open Font License).</p>
    <p class="klein">Alles andere - Bilder, Figuren, Geräusche - ist für dieses Spiel selbst gemacht.</p>`,
  [{ text: 'Schließen' }]);
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

/**
 * Spielstand als Datei (14.10.). Auf dem Handy über das Teilen-Menü
 * (AirDrop, Nachricht, „In Dateien sichern") - ein Download-Link tut in der
 * iOS-Home-Bildschirm-App nichts. Am Rechner als Download. Android teilt
 * kein application/json, deshalb text/plain mit der Endung .json.
 */
async function standSichern() {
  const text = S.standAlsDatei();
  const d = new Date(), zwei = (n) => String(n).padStart(2, '0');
  const name = `punsch-spielstand-${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}.json`;
  const handy = matchMedia('(pointer: coarse)').matches;
  try {
    const f = new File([text], name, { type: 'text/plain' });
    if (handy && navigator.canShare && navigator.canShare({ files: [f] })) {
      await navigator.share({ files: [f], title: 'Punsch & Lichterglanz - Spielstand' });
      // 26.10.: Ob das Ziel die Datei wirklich ablegt, wissen wir nicht - also nicht „gesichert"
      toast('Spielstand weitergegeben - leg die Datei an einem sicheren Ort ab (z. B. „In Dateien sichern“).', 'gut');
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;   // Teilen abgebrochen
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('Spielstand als Datei heruntergeladen.', 'gut');
}
function standLaden() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json,text/plain';
  inp.onchange = async () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const info = S.pruefeDatei(await f.text());
    if (info.fehler) { fenster('Das klappt nicht', `<p>${info.fehler}</p>`); return; }
    const wann = info.gesichert ? new Date(info.gesichert).toLocaleString('de-DE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : null;
    fenster('Spielstand laden?', `
      <div class="gross-ico">📂</div>
      <p><b>${info.name ? esc(info.name) : 'Dein Haus'}</b>${wann ? `, gesichert am ${wann}` : ''}</p>
      <p class="klein">Insgesamt ${S.formatGeld(info.gesamt)} verdient.</p>
      <p><b>Dein jetziger Spielstand auf diesem Gerät wird ersetzt.</b></p>`, [
      { text: 'Laden', aktion: () => { if (S.uebernehmeStand(info.stand)) { schliesseBlatt(); location.reload(); } else toast('Speichern ging nicht - ist der Speicher voll?', 'hinweis'); } },
      { text: 'Abbrechen', neben: true },
    ]);
  };
  inp.click();
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
    ${umbenennen ? '' : '<p>Der Herbst ist grau, das Haus ist kahl - und bis Weihnachten soll es das schönste im Dorf sein.</p>'}
    <label>Wie soll dein Haus heißen?<br><input type="text" id="hausName" maxlength="28" placeholder="z. B. Haus Schneeflocke" value="${esc(S.st.name || '')}"></label>`,
  [{ text: umbenennen ? 'Speichern' : 'Los geht’s', aktion: (box) => {
    const v = box.querySelector('#hausName').value.trim();
    S.st.name = v || 'Unser Haus';
    S.speichere();
    if (umbenennen) oeffneEinstellungen();
    if (danach) setTimeout(danach, 50);
  } }]);
  setTimeout(() => { const i = $('#hausName'); if (i && !umbenennen) i.focus(); }, 100);
}

/** Nach dem Namen: klassisch mit dem echten Kalender oder eigener Start. */
// 28.10. (gemeldet: „Individuell" und „Klassisch" verwirren): klare Namen - Eigener Advent / Echter
// Kalender - und je ein Satz, was passiert. Die ids bleiben 'eigen' und 'echt' (Spielstände).
export const MODUS_NAME = { eigen: 'Eigener Advent', echt: 'Echter Kalender' };
export function waehleModus(fertig) {
  const heute = new Date();
  // Tage bis zum echten 1. Dezember - bei „Echter Kalender" im Oktober fast zwei Monate ohne Türchen und
  // Schnee. Das muss man VOR der Wahl wissen (Betatest 02.10.)
  const bis = Math.ceil((new Date(Z.saison(heute), 11, 1) - heute) / 86400000);
  const datum = `${heute.getDate()}.${heute.getMonth() + 1}.`;
  const wann = bis > 1 ? `in ${bis} Tagen` : bis === 1 ? 'morgen' : null;
  // Empfohlen (28.10., Nutzerwunsch): vom 24. November bis Ende Dezember der echte Kalender - dann ist
  // ohnehin Advent bzw. gleich so weit. Sonst der eigene Advent (Betatest 2). Die Empfehlung steht oben.
  const m = heute.getMonth(), echtEmpf = (m === 10 && heute.getDate() >= 24) || m === 11;
  const marke = ' <i class="empf">Empfohlen</i>';
  const klassisch = `<button class="modus${echtEmpf ? ' empfohlen' : ''}" data-m="echt">
      <b>🕯️ ${MODUS_NAME.echt}${echtEmpf ? marke : ''}</b>
      <span>Das Spiel hat das echte Datum (heute der ${datum}). ${wann ? `Das erste Türchen gibt es am 1. Dezember - also ${wann}.` : m === 11 ? 'Du steigst mitten im Advent ein.' : 'Die Adventszeit ist gerade vorbei - sie kommt erst im Dezember wieder.'}</span>
    </button>`;
  const individuell = `<button class="modus${echtEmpf ? '' : ' empfohlen'}" data-m="eigen">
      <b>🎄 ${MODUS_NAME.eigen}${echtEmpf ? '' : marke}</b>
      <span>Das Spiel beginnt am 24. November - egal, wann du anfängst. Nach einer Woche geht das erste Türchen auf, und du erlebst den ganzen Advent.</span>
    </button>`;
  const box = fenster('Wann beginnt dein Advent?', `
    ${echtEmpf ? klassisch + individuell : individuell + klassisch}
    <p class="klein">Bis zum ersten Türchen wartet jeden Tag ein Vorfreude-Päckchen. Die Uhrzeit ist immer die echte - nachts ist es dunkel.</p>`, []);
  // 13.10.: Das Fenster blendet ein - ein Tipp in den ersten 0,7 s zählt nicht
  // (Betatest: der Tipp auf den eigenen Advent landete auf dem echten Kalender). Und wer im
  // Herbst den echten Kalender wählt, bestätigt es noch einmal.
  const ab = performance.now() + 700;
  for (const b of box.querySelectorAll('.modus')) b.onclick = () => {
    if (performance.now() < ab) return;
    T.spiele('klick');
    if (b.dataset.m === 'echt' && bis > 7) {
      fenster('Echter Kalender?', `<p>Dann kommen das erste Türchen und der Schnee erst am echten 1. Dezember - in <b>${bis} Tagen</b>.</p><p class="klein">Mit „${MODUS_NAME.eigen}“ geht es schon in einer Woche los.</p>`,
        [{ text: 'Lieber eigener Advent', neben: true, aktion: () => { setTimeout(() => fertig('eigen'), 50); } },
          { text: 'Ja, echter Kalender', aktion: () => { setTimeout(() => fertig('echt'), 50); } }]);
      return;
    }
    schliesseFenster(); fertig(b.dataset.m);
  };
}

/** „Morgen wartet …" (13.10.): was es morgen Neues gibt - ohne zu verraten, WAS genau aufgeht. */
export function vorschauText() {
  const teile = [];
  const dt = Z.dezemberTag();
  if (dt >= 1 && dt < 24) teile.push(`Türchen ${dt + 1}`);
  else if (dt < 1) teile.push('ein Vorfreude-Päckchen');
  teile.push('neue Aufträge');
  const m = S.marktInfo();
  if (m.inTagen === 1) teile.push('Weihnachtsmarkt');
  const tag = S.spieltag();
  if (tag < 99) {
    const bald = Object.entries(C.MINI_AB_TAG).filter(([n]) => !S.miniOffen(n)).map(([, ab]) => ab - tag).filter((d) => d > 0);
    const n = bald.length ? Math.min(...bald) : 0;
    if (n === 1) teile.push('ein neuer Ort auf der Karte');
    else if (n > 1 && n <= 3) teile.push(`in ${n} Tagen ein neuer Ort auf der Karte`);
  }
  return `Morgen wartet: ${teile.join(' · ')}. Schau wieder vorbei!`;
}

/** Einmal nach den Startzielen (13.10.): Ziele weiter vorschlagen oder selbst erkunden? */
export function zeigeZieleFrage() {
  T.spiele('spezial');
  fenster('Wie geht es weiter?', `
    <p><b>Alle sieben Startziele geschafft!</b> Ab jetzt entscheidest du - ein paar Dinge zeige ich dir noch nach und nach.</p>
    <p>Soll dir das Spiel oben in der Leiste immer ein <b>nächstes Ziel</b> vorschlagen - ein neues Getränk, einen Helfer oder einen Ausbau für den Stand, dazwischen Deko? Oder möchtest du lieber <b>selbst erkunden</b>, was es in den Läden gibt?</p>
    <p class="klein">Du kannst das jederzeit im Menü umstellen. Schau jeden Tag mal rein: Es gibt neue Aufträge, Türchen im Kalender und Überraschungen.</p>`,
  [{ text: 'Selbst erkunden', neben: true, aktion: () => { S.st.zieleWeiter = false; S.speichere(); zielLeiste(); } },
    { text: 'Ziele vorschlagen', aktion: () => { S.st.zieleWeiter = true; S.speichere(); zielLeiste(); } }]);
}

/** Einmal beim ersten Start: worum es geht. */
export function zeigeZiel(modus, fertig) {
  const start = modus === 'eigen'
    ? 'Dein Spiel beginnt am 24. November - du hast also gut vier Wochen.'
    : `Heute ist der ${Z.datumLang()}.`;
  fenster('Dein Ziel', `
    <canvas class="ziel-haus" width="72" height="62"></canvas>
    <p><b>Mach dein Haus bis Heiligabend zum schönsten im Dorf!</b></p>
    <ul class="ziel">
      <li>☕ Verkaufe am Punschstand vor dem Haus warme Getränke.</li>
      <li>🛒 Kaufe mit den Sternen Lichter, Deko, Farbe und Helfer.</li>
      <li>🎄 Jeden Tag gibt es Neues zu entdecken.</li>
      <li>📷 Mach mit „Foto“ eine Weihnachtskarte von deinem Haus.</li>
    </ul>
    <p class="klein">${start} Jeder Advent bringt eine Überraschung.</p>`,
  [{ text: 'Los geht’s!', aktion: () => { if (fertig) setTimeout(fertig, 60); } }]);
  zielHaus(document.querySelector('#modal canvas.ziel-haus'));
}

export function zeigeHilfe() {
  fenster('So geht’s', `
    <ol class="hilfe">
      <li><b>Glas holen</b> - links auf dem Tresen.</li>
      <li><b>Abfüllen</b> - unten auf das passende Getränk tippen. Das Bild im Bläschen des Gastes ist dasselbe wie unten.</li>
      <li><b>Servieren</b> - ist das Glas fertig, tragen Glas und Bläschen einen grünen Haken. Dann auf den Gast tippen. Je schneller, desto mehr Trinkgeld.</li>
      <li><b>Handgriffe</b> - Zuckerstange, Umrühren, Zuckerguss, Sahne, Zimt, Milchschaum, Zuckerhut: das fertige Glas auf dem Tablett antippen (die goldene Blase zeigt, was fehlt). Dann zahlt der Gast mehr, je nach Getränk 20 bis 50 %. Wichtel lassen sie weg.</li>
      <li><b>Leer?</b> Das Getränk unten ein paarmal antippen, dann ist es wieder voll.</li>
      <li><b>Zu langsam?</b> Nicht schlimm - dann geht der Gast eben weiter. Nur besondere Gäste solltest du nicht verpassen - wer das ist, merkst du schon.</li>
    </ol>
    <p>Wer zügig hintereinander bedient, baut <b>Schwung</b> auf (bis zu 40 % mehr Sterne). Wer länger bleibt, bekommt Besuch von ganzen Gruppen - und manchmal von jemand ganz Besonderem.</p>
    <p>Mit den Sternen kaufst du Deko, Farbe, Zutaten und Wichtel. Je gemütlicher das Haus, desto mehr Gäste kommen und desto mehr zahlen sie.</p>
    <p>Oben links schmückst du mit <b>Haus</b> dein Haus (Lichter, Farben, Varianten). Oben rechts stellst du mit <b>Angebot</b> zusammen, welche Sorten dein Stand anbietet - höchstens ${C.ANGEBOT_MAX}. Schnelle Sorten bringen weniger je Glas, langsame mehr.</p>
    <p>Auf der <b>Karte</b> warten Läden, Minispiele (zuerst nur die Waldlichtung, alle paar Tage kommt ein neues dazu) und alle paar Tage der Weihnachtsmarkt.${S.miniOffen('back') ? ' Plätzchen aus der Backstube kommen in die Dose an deinem Stand - jeder Gast, den du selbst bedienst, zahlt dafür mehr.' : ''} Ist die Fahne am <b>Briefkasten</b> neben der Tür oben, tippe ihn an - offene Wunschzettel stehen auch unter Aufträge.${S.baumschuleOffen() ? ' In der <b>Baumschule</b> ziehst du eigene Tannen für den Christbaumverkauf.' : ''}${S.hat('futterhaus') ? ' Das <b>Futterhaus</b> im Baum antippen: nachfüllen und Vögel beobachten.' : ''} Was du schon entdeckt hast, steht im <b>Album</b> (unter Aufträge).</p>
    <p><b>Du bist der Chef:</b> Solange du am Stand mit anpackst, arbeiten die Wichtel schneller. Besondere Gäste und Großbestellungen bedienst nur du.${S.aufsicht() ? ' Deine Wichtel bedienen normale Gäste jetzt allein - du kümmerst dich um die <b>goldenen Gäste</b> (sie drängeln vor und zahlen viel mehr), um eilige Gäste und um Bestellungen für eine Bitte.' : ''}</p>
    <p><b>Ruf:</b> Jeden Tag, an dem du ein bisschen mitarbeitest, steigt der Ruf deines Standes - und alle Preise mit. Wie weit du heute bist, steht unter Aufträge.</p>
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
// Festtagskarte (10.10.): nur ab Heiligabend, mit dem Rückblick in einer Zeile
const HEILIG = { name: 'Heilige Nacht', titel: '#fff0b0', text: '#e8dcc0', umriss: 'rgba(10,8,30,0.9)', male(c, W, H) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#120c2e'); g.addColorStop(0.6, '#2a1a4a'); g.addColorStop(1, '#4a2a3a');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // Goldener Doppelrahmen
  c.strokeStyle = '#c8a040'; c.lineWidth = 6; c.strokeRect(14, 14, W - 28, H - 28);
  c.strokeStyle = '#f0d070'; c.lineWidth = 2; c.strokeRect(24, 24, W - 48, H - 48);
  for (let i = 0; i < 60; i++) {
    const x = Z.hash(i * 7 + 2) * W, y = Z.hash(i * 13 + 4) * H;
    if (x > 30 && x < W - 30 && y > 30 && y < H - 230) continue;
    stern(c, x, y, 2 + Z.hash(i * 3) * 5, i % 4 ? '#fff4d0' : '#e8c030');
  }
  // Großer Stern oben in der Mitte, mit Schein
  const sg = c.createRadialGradient(W / 2, 26, 2, W / 2, 26, 46); sg.addColorStop(0, 'rgba(255,240,170,0.9)'); sg.addColorStop(1, 'rgba(255,240,170,0)');
  c.fillStyle = sg; c.fillRect(W / 2 - 46, 0, 92, 72);
  stern(c, W / 2, 24, 16, '#fff0a0');
} };
const rahmenVon = (nr) => (nr === 'heilig' ? HEILIG : RAHMEN[nr]);
/** „Andere Karte" blättert durch; ab Heiligabend gehört die Festtagskarte dazu. */
function naechsterRahmen(nr) {
  if (nr === 'heilig') return 0;
  if (nr + 1 < RAHMEN.length) return nr + 1;
  return S.heiligabendJetzt() ? 'heilig' : 0;
}

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

/**
 * Der Gruß oben im Himmel des Kartenbilds (27.10.), in der Weihnachtsschrift der Minispiele
 * (schrift.js: Kontur, Schneekappe, Funkeln). Pixelgenau: k = 2 doppelt gezogen, für lange
 * Grüße k = 1 dreifach bzw. doppelt. Zeichen, die die Schrift nicht kann, werden umschrieben
 * (ß → SS, & → UND, … → ...) oder fallen weg.
 */
function grussImHimmel(c, gruss, rand, bildB, stil) {
  const t = String(gruss).replace(/ß/g, 'ss').replace(/&/g, 'und').replace(/…/g, '...')
    .split('').filter((ch) => kannSchrift(ch)).join('').replace(/\s+/g, ' ').trim();
  if (!t) return;
  // So groß wie es passt: k = 2 vier-, drei- oder zweifach, sonst k = 1 drei- oder zweifach
  const maxB = bildB - 40;
  let bild = schriftBild(t, stil, 2), s = [4, 3, 2].find((n) => bild.width * n <= maxB);
  if (!s) { bild = schriftBild(t, stil, 1); s = bild.width * 3 <= maxB ? 3 : 2; }
  const w = bild.width * s, h = bild.height * s;
  c.save();
  c.imageSmoothingEnabled = false;
  c.drawImage(bild, Math.round(rand + (bildB - w) / 2), rand + 22, w, h);
  c.restore();
}

/** Eigener Kartentext: Gruß und Grußzeile. Datum und Hausname bleiben fest. */
function kartenText(nr, ohneLeute, gruss) {
  const k = S.st.karteText || {};
  fenster('Text der Karte', `
    <label>Gruß<br><input type="text" id="ktGruss" maxlength="32" value="${esc(k.gruss || gruss)}"></label>
    <label>Grußzeile (dahinter steht euer Hausname)<br><input type="text" id="ktVon" maxlength="30" value="${esc(k.von || VON_VORGABE)}"></label>
    <p class="klein">… ${esc(S.st.name || 'uns')} · Datum und „Punsch &amp; Lichterglanz“ stehen immer darunter.</p>`, [
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

  // Ab Heiligabend ist die Festtagskarte die erste, die man sieht
  if (rahmenNr == null && S.heiligabendJetzt()) rahmenNr = 'heilig';
  const heilig = rahmenNr === 'heilig';
  // 27.10. (Nutzerwunsch: „oben zu viel Himmel"): Der Gruß steht jetzt in der Weihnachtsschrift oben
  // im Himmel des Bildes - unten bleiben nur Grußzeile und Datum, der Streifen ist dafür schmaler
  const rand = 44, unten = heilig ? 168 : 128;
  const cv = document.createElement('canvas');
  cv.width = 180 * SK + rand * 2; cv.height = WG * SK + rand + unten;
  // Im Hauptspeicher malen, nicht auf der Grafikkarte: Fürs PNG muss das Bild
  // sonst erst zurückgelesen werden - auf manchen Android-Geräten spürbar langsam
  const c = cv.getContext('2d', { willReadFrequently: true });
  const nr = rahmenNr ?? Math.floor(Math.random() * RAHMEN.length);
  const R = rahmenVon(nr);
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
  grussImHimmel(c, gruss, rand, 180 * SK, heilig ? 'gold' : { Zuckerstange: 'zucker', Schneeflocken: 'eis', Stechpalme: 'rot' }[R.name] || 'gold');
  c.textAlign = 'center';
  kartenSchrift(c, von, mx, y0 + 54, 32, '', R.titel, R.umriss, maxB);
  if (heilig) {
    const rb = S.rueckblick(), z = (n) => Math.round(n).toLocaleString('de-DE');
    kartenSchrift(c, `Unser Advent: ${z(rb.bedient)} Gäste · ${z(rb.deko)} Deko-Stücke · ♥ ${z(rb.stimmung)}`, mx, y0 + 94, 22, 'italic', R.titel, R.umriss, maxB);
  }
  kartenSchrift(c, `${Z.datumLang()} · Punsch & Lichterglanz`, mx, y0 + (heilig ? 132 : 94), 20, '', R.text, R.umriss, maxB);

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
    { text: 'Andere Karte', neben: true, aktion: () => { setTimeout(() => karte(naechsterRahmen(nr), ohneLeute), 30); } },
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
  $('#nachr').onclick = () => { T.spiele('klick'); zeigeNachrichten(); };
  $('#btnStandkarte').onclick = () => { T.spiele('klick'); zeigeStandkarte(); };
  $('#btnHaus').onclick = () => { T.spiele('klick'); offen === 'laden' ? schliesseBlatt() : oeffneMeinHaus(); };
  nachrPunkt();
  $('#ziel').onclick = () => {
    T.spiele('klick');
    if (leistenModus === 'ansturm' || leistenModus === 'zimt') return;   // jetzt servieren, nicht lesen
    if (leistenModus === 'markt') { oeffneKarte('festplatz'); return; }
    const zl = leistenModus === 'ziel' && ZL.aktuell();
    if (zl && zl.oeffne === 'auftraege') { offen === 'auftraege' ? schliesseBlatt() : oeffneAuftraege('heute'); return; }
    offen === 'laden' ? schliesseBlatt() : oeffneLaden();
  };
  $('#btnLaden').onclick = () => { T.spiele('klick'); KA.istOffen() ? schliesseKarte() : oeffneKarte(); };
  $('#kartenZu').onclick = () => { T.spiele('klick'); schliesseKarte(); };
  $('#kartenText').onclick = () => { T.spiele('klick'); KA.schilderUmschalten(); };
  $('#miniZu').onclick = () => { T.spiele('klick'); C.MINI_SPECIAL.laeuft = null; LI.schliesse(); CB.schliesse(); SB.schliesse(); SW.schliesse(); EB.schliesse(); BS.schliesse(); };
  $('#btnKalender').onclick = () => { T.spiele('klick'); offen === 'kalender' ? schliesseBlatt() : oeffneKalender(); };
  $('#btnAuftraege').onclick = () => { T.spiele('klick'); offen === 'auftraege' ? schliesseBlatt() : oeffneAuftraege(E.neuZahl() > 0 && !A.abholbar() ? 'erfolge' : 'heute'); };
  $('#btnKarte').onclick = () => karte();
  $('#btnMenue').onclick = () => { T.spiele('klick'); offen === 'menue' ? schliesseBlatt() : oeffneMenue(); };
  $('#blattZu').onclick = () => { T.spiele('klick'); schliesseBlatt(); };
}
