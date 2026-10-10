/*
 * ui.js - alles DOM: Kopfzeile, Leiste, Laden, Adventskalender, Menü,
 * Einblendungen, Fenster und die Weihnachtskarte zum Teilen.
 *
 * Text steht im DOM, nicht im Canvas: Im hochskalierten 180-px-Bild
 * wäre er Matsch, und Tippziele müssen groß sein.
 */
import * as C from './config.js?v=202610101407';
import * as S from './spiel.js?v=202610101407';
import * as Z from './zeit.js?v=202610101407';
import * as T from './ton.js?v=202610101407';
import { icon, wichtelKlein, r, p, figurKlein, neueFarben, hatGlyphe } from './pixel.js?v=202610101407';
import { zeichneWelt, ortVon, funkeln } from './szene.js?v=202610101407';
import { nochmal as nochmalLernen, fuehrung, laeuft as lernenLaeuft, ueberspringen } from './lernen.js?v=202610101407';
import * as A from './auftraege.js?v=202610101407';
import * as E from './erfolge.js?v=202610101407';
import * as ZL from './ziele.js?v=202610101407';
import { zeichneWand, sockeBei, socke, W as WAND_W, H as WAND_H } from './wand.js?v=202610101407';
import * as KA from './karte.js?v=202610101407';
import { zeigeRueckblick } from './ereignis.js?v=202610101407';
import { barbaraZweig } from './szene.js?v=202610101407';
import * as LI from './lichtung.js?v=202610101407';
import * as CB from './christbaum.js?v=202610101407';
import * as SB from './schlitten.js?v=202610101407';
import * as EB from './schlittschuh.js?v=202610101407';
import * as BS from './backstube.js?v=202610101407';
import { alleSymbole } from './symbole.js?v=202610101407';

const $ = (s) => document.querySelector(s);
/** Für Nutzertext in HTML: <, >, & und Anführungszeichen entschärfen. */
const esc = (s) => String(s).replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[z]));
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

let offen = null;          // 'laden' | 'kalender' | 'menue' | null
let ladenTab = 'super';
let ladenModus = 'kaufen';  // 'kaufen' | 'haus' - Einkaufen oder Mein Haus (einstellen)
let zeilen = [];           // Ladenzeilen zum Nachführen

export function panelOffen() { return offen || (LI.istOffen() || CB.istOffen() || SB.istOffen() || EB.istOffen() || BS.istOffen() ? 'minispiel' : KA.istOffen() ? 'karte' : null); }

// ---------------------------------------------------------------------------
// Kopfzeile
// ---------------------------------------------------------------------------
let letzteHud = '';
export function hud() {
  const g = S.formatGeld(S.st.geld);
  const s = S.stimmung();
  const tw = Z.tagesWetter();
  const u = `${Z.uhrText()} ${tw.temp < 0 ? '−' : ''}${Math.abs(tw.temp)}°`;
  const k = S.offeneTueren();
  const sig = g + s + u + k + '|' + A.abholbar() + '|' + E.neuZahl();
  if (sig === letzteHud) return;
  letzteHud = sig;
  $('#geldZahl').textContent = g;
  $('#stimmungZahl').textContent = s;
  $('#uhr').textContent = u + ((Z.zeitVerstellt() || S.devAn()) && !S.DEMO ? ' ⚙' : '');
  // Eine Zahl nur für Belohnungen, die man abholen kann; neue Erfolge sind
  // nur ein Punkt (Betatest 2: „Aufträge 10" nach 20 Minuten)
  const ab = A.abholbar(), en = E.neuZahl();
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
let leistenModus = '';   // 'ziel' | 'ansturm' | ''
export function zielLeiste() {
  const z = ZL.aktuell();
  const k = z && ZL.kaufziel();
  const bereit = !!(k && k.leisten);
  // Der Kontostand gehört in die Signatur: „noch 186 Sterne" blieb sonst
  // stehen, während man längst 179 hatte (Betatest 02.10.)
  // Dieselbe Leiste trägt seit 03.10. auch den Tagesansturm (Vorrang, er ist kurz)
  const ansturm = S.lauf.ansturm ? Math.max(0, Math.ceil(S.lauf.stossBis - S.lauf.t)) : 0;
  const zimt = !ansturm && !z ? S.zimtRest() : 0;
  const markt = !ansturm && !z && !zimt && S.marktHeute() && !S.marktBesucht();
  leistenModus = ansturm ? 'ansturm' : z ? 'ziel' : zimt ? 'zimt' : markt ? 'markt' : '';
  const sig = ansturm ? `a|${ansturm}` : zimt ? `z|${zimt}` : markt ? 'markt'
    : z ? `${z.id}|${z.stand()}|${bereit}|${k ? k.kosten : ''}|${k && !bereit ? S.st.geld : ''}` : '';
  if (sig === letztesZiel) return;
  letztesZiel = sig;
  const b = $('#ziel');
  $('#huelle').classList.toggle('mit-ziel', !!leistenModus);
  b.classList.toggle('ansturm', !!ansturm);
  b.classList.toggle('zimt', !!zimt);
  if (ansturm) {
    b.innerHTML = `<span class="nr">ANSTURM</span><span class="was">Trinkgeld ×${C.ANSTURM_MULT} - nur wenn du servierst!</span><span class="los">${ansturm} s</span>`
      + `<span class="fort"><span style="width:${Math.round(ansturm / C.ANSTURM_DAUER * 100)}%"></span></span>`;
    b.classList.remove('bereit', 'versteckt');
    $('#huelle').style.setProperty('--ziel-unten', (b.offsetTop + b.offsetHeight) + 'px');
    return;
  }
  if (zimt) {
    const m = Math.floor(zimt / 60), sek = String(zimt % 60).padStart(2, '0');
    b.innerHTML = `<span class="nr">ZIMTSTERN</span><span class="was">Doppelte Sterne, wenn du servierst</span><span class="los">${m}:${sek}</span>`
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
  if (!z) { b.classList.add('versteckt'); return; }
  const zahl = z.ziel > 1 ? ` <i>${z.stand()}/${z.ziel}</i>` : '';
  const nochNicht = k && !bereit ? `<small>noch ${S.formatGeld(k.kosten - S.st.geld)}</small>` : '';
  // Fortschrittsbalken an der Unterkante: Sterne bis zum nächsten Kauf,
  // sonst wie weit das Ziel selbst ist
  const anteil = bereit ? 1 : k ? S.st.geld / k.kosten : z.stand() / z.ziel;
  b.innerHTML = `<span class="nr">Ziel ${ZL.nummer()}/${ZL.ZIELE.length}</span><span class="was">${z.text}${zahl}</span>`
    + (bereit ? '<span class="los">Los ▸</span>' : nochNicht || `<span class="lohn">+${z.lohn} ★</span>`)
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
    if (KA.vignette(bild, ladenTab)) { kopf.appendChild(bild); kopf.classList.remove('versteckt'); }
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
  if (o.spiel === 'berg') { zeigeBergspiel(); return; }
  if (o.spiel === 'eis') { zeigeEisbahn(); return; }
  if (o.spiel === 'back') { zeigeBackstube(); return; }
  if (o.markt) { zeigeMarkt(); return; }
  if (o.bald) fenster(o.name, `<p>${o.bald}</p><p class="klein">Kommt bald!</p>`);
}
/**
 * Ein Minispiel ist neu auf der Karte (10.10., Minispiele kommen nach und
 * nach). Einmal je Spiel, aus main.js, wenn gerade nichts offen ist.
 */
const MINI_NEU_TEXT = {
  baum: 'Am <b>Christbaumverkauf</b> wollen Kunden ihren Baum: richtig aussuchen, sägen, ins Netz und aufs Autodach.',
  back: 'In der <b>Backstube</b> stichst du Plätzchen aus, backst sie goldbraun und verzierst sie. Was du bäckst, kommt in die Plätzchendose auf deinem Stand.',
  eis: 'Auf der <b>Eisbahn</b> drehst du deine Runden - mit Sprüngen und Tricks.',
  berg: 'Am <b>Schlittenberg</b> saust du im Wok den Hang hinunter, sammelst Sterne und weichst Tannen und Steinen aus.',
  lichtung: 'Auf der <b>Waldlichtung</b> fütterst du Hasen, Eichhörnchen und Rehe.',
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
  const rest = S.lichtungRest(), best = S.lichtungRekord();
  const naechste = C.LICHTUNG_DEKO.find((d) => !S.st.kalDeko[d.id]);
  miniFenster('Waldlichtung', `
    <p>Hasen, Eichhörnchen und Rehe hüpfen durch die Lichtung. <b>Tippe sie an, um sie zu füttern.</b> Schnell hintereinander gibt eine Kette bis ×5. Und ganz selten schaut ein besonderer Gast vorbei.</p>
    <p class="klein">${C.LICHTUNG_DAUER} Sekunden · Rekord: <b>${best}</b>${naechste ? ` · ab ${naechste.ab} Punkten Rekord gibt es ein Deko-Stück` : ''}</p>
    <p class="klein">${rest ? `Heute noch ${rest} ${rest === 1 ? 'Runde' : 'Runden'} mit Sternen.` : 'Sterne gibt es heute keine mehr - aber der Rekord zählt!'}</p>`,
  [{ text: 'Später', neben: true }], 'lichtung', starteLichtung);
}
export function starteLichtung(stufeNr = 1) {
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
function miniFenster(titel, html, knoepfe, name, starte) {
  const box = fenster(titel, html + '<div class="stufen"></div>', knoepfe);
  const reihe = box.querySelector('.stufen');
  const zuletzt = (S.st.miniStufe || {})[name] ?? 1;
  C.MINI_STUFEN.forEach((stufe, i) => {
    const b = el('button', 'k stufe' + (i === zuletzt ? ' gewaehlt' : ''), `${stufe.name}<small>Punkte ×${String(stufe.punkte).replace('.', ',')}</small>`);
    b.onclick = () => {
      T.spiele('klick');
      S.st.miniStufe = { ...(S.st.miniStufe || {}), [name]: i };
      S.speichere();
      schliesseFenster();
      setTimeout(() => starte(i), 60);
    };
    reihe.appendChild(b);
  });
  return box;
}
/** Ergebnisfenster für jedes Minispiel: Punkte, Rekord, Sterne, neue Deko. */
function miniErgebnis(name, punkte, zeile, titel, nochmal, danach) {
  const e = S.miniErgebnis(name, punkte);
  const extra = danach ? danach() : '';
  const deko = e.neu.map((d) => `<p class="bonus">Neu für dein Haus: <b>${d.name}</b> (♥ +${d.stimmung})</p>`).join('');
  fenster(e.rekord ? 'Neuer Rekord!' : punkte > 0 ? titel : 'Nächstes Mal!', `
    <p>${zeile}</p>
    <p class="summe">${punkte} Punkte</p>
    <p class="klein">Rekord: ${e.best}</p>
    ${e.sterne ? `<p class="bonus">+ ${S.formatGeld(e.sterne)}</p>` : punkte > 0 ? '<p class="klein">Heute keine Sterne mehr - morgen wieder.</p>' : '<p class="klein">Ohne Punkte keine Sterne - die Runde zählt aber auch nicht mit.</p>'}
    ${e.sterne && e.rest ? `<p class="klein">Heute noch ${e.rest} ${e.rest === 1 ? 'Runde' : 'Runden'} mit Sternen.</p>` : ''}
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
  const rest = S.miniRest('baum'), best = S.miniRekord('baum');
  const naechste = C.BAUM_DEKO.find((d) => !S.st.kalDeko[d.id]);
  miniFenster('Christbaumverkauf', `
    <p>Kunden fahren vor und wollen einen bestimmten Baum - <b>Größe und Sorte stehen in der Sprechblase.</b></p>
    <p>Tippe den richtigen Baum an und <b>säge ihn mit drei Tipps</b>. Dann <b>dreimal aufs Netz</b> und zum Schluss <b>aufs Auto</b>. Je schneller, desto mehr Punkte - fehlerfreie Kunden hintereinander geben eine Kette bis ×3.</p>
    <p class="klein">${C.BAUM_DAUER} Sekunden · Rekord: <b>${best}</b>${naechste ? ` · ab ${naechste.ab} Punkten Rekord gibt es ein Deko-Stück` : ''}</p>
    <p class="klein">${rest ? `Heute noch ${rest} ${rest === 1 ? 'Runde' : 'Runden'} mit Sternen.` : 'Sterne gibt es heute keine mehr - aber der Rekord zählt!'}</p>`,
  [{ text: 'Später', neben: true }], 'baum', starteBaumspiel);
}
export function starteBaumspiel(stufeNr = 1) {
  CB.starte(spielHoehe(), (punkte, n) => { CB.schliesse(); miniErgebnis('baum', punkte, `${n} ${n === 1 ? 'Baum' : 'Bäume'} verkauft`, 'Gut verkauft!', () => starteBaumspiel(stufeNr)); }, stufeNr);
}

// ---------------------------------------------------------------------------
// Minispiel Eisbahn (schlittschuh.js)
// ---------------------------------------------------------------------------
function zeigeEisbahn() {
  const rest = S.miniRest('eis'), best = S.miniRekord('eis');
  const naechste = C.EIS_DEKO.find((d) => !S.st.kalDeko[d.id]);
  miniFenster('Eisbahn', `
    <p>Schlittschuhlaufen auf dem Weiher! <b>Tippen = springen</b> - über Schneemänner, Steine, Holzstapel und Eislöcher.</p>
    <p><b>In der Luft wischen</b> macht Tricks: nach oben ein Salto, nach links eine Pirouette, nach rechts eine Grätsche. Mehrere Tricks in einem Sprung sind eine Kombo - aber erst fertig drehen, dann landen!</p>
    <p class="klein">${C.EIS_DAUER} Sekunden · Rekord: <b>${best}</b>${naechste ? ` · ab ${naechste.ab} Punkten Rekord gibt es ein Deko-Stück` : ''}</p>
    <p class="klein">${rest ? `Heute noch ${rest} ${rest === 1 ? 'Runde' : 'Runden'} mit Sternen.` : 'Sterne gibt es heute keine mehr - aber der Rekord zählt!'}</p>`,
  [{ text: 'Später', neben: true }], 'eis', starteEisbahn);
}
export function starteEisbahn(stufeNr = 1) {
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
    k.innerHTML = `<canvas width="20" height="18"></canvas><b>${da ? rz.name : '???'}</b><small>${da ? `${C.BACK_DEKOS[rz.deko].name}` : `ab ${rz.ab} Punkten Rekord`}</small>`;
    const ctx = k.querySelector('canvas').getContext('2d');
    BS.zeichnePlaetzchen(ctx, 1, 1, rz.form, 'golden', da ? rz.deko : null, 2);
    if (!da) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = '#6a5a4a'; ctx.fillRect(0, 0, 20, 18); }
    buch.appendChild(k);
  }
  return buch;
}
function zeigeBackstube() {
  const rest = S.miniRest('back'), best = S.miniRekord('back'), n = S.dose().length;
  const box = miniFenster('Backstube', `
    <p>Kunden wollen Plätzchen - <b>das Bild steht in der Sprechblase.</b> Tippe die richtige <b>Ausstechform</b>, hol das Plätzchen <b>goldbraun aus dem Ofen</b> (wenn der Balken im gelben Bereich steht) und tippe die richtige <b>Verzierung</b>.</p>
    <div class="rb-platz"></div>
    <p class="klein">Was du bäckst, kommt in die <b>Plätzchendose</b> auf deinem Stand: Jeder Gast, den du selbst bedienst, nimmt eins und zahlt ${Math.round(C.DOSE_BONUS * 100)} % mehr. ${n ? `Gerade in der Dose: <b>${n}</b>.` : 'Die Dose ist leer.'}</p>
    <p class="klein">${C.BACK_DAUER} Sekunden · Rekord: <b>${best}</b></p>
    <p class="klein">${rest ? `Heute noch ${rest} ${rest === 1 ? 'Runde' : 'Runden'} mit Sternen.` : 'Sterne gibt es heute keine mehr - aber der Rekord und die Plätzchen zählen!'}</p>`,
  [{ text: 'Später', neben: true }], 'back', starteBackstube);
  box.querySelector('.rb-platz').appendChild(rezeptbuch());
}
export function starteBackstube(stufeNr = 1) {
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
/** Eine Kinderzeichnung: Haus, Sonne, das Kind - und das, was es sich gewünscht hat. */
export function zeichneDankesbild(cv, b) {
  const c = cv.getContext('2d'), W2 = cv.width, H2 = cv.height;
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
  // Der Wunsch, rechts oben
  const tmp = document.createElement('canvas'); tmp.width = 16; tmp.height = 16;
  const tc = tmp.getContext('2d');
  if (b.ziel) { const a = C.ARTIKEL.find((x) => x.id === b.ziel); if (a) zeichneIcon(tmp, a); }
  else if (b.art === 'backen') { BS.zeichnePlaetzchen(tc, 0, 2, 'stern', 'golden', 'guss', 1); BS.zeichnePlaetzchen(tc, 7, 7, 'herz', 'golden', 'schoko', 1); }
  else if (b.art === 'santa') { figurKlein(tc, { typ: 'weihnachtsmann', farben: neueFarben('erwachsen'), phase: 0, laeuft: false }, 8, 15, 0); }
  else { r(tc, 2, 8, 5, 4, '#c83a32'); r(tc, 9, 8, 5, 4, '#3a6ab8'); r(tc, 1, 12, 7, 1, '#c8ccd8'); r(tc, 8, 12, 7, 1, '#c8ccd8'); }
  c.drawImage(tmp, W2 - 17, H2 - 21);
  // Rahmen aus Wachsmalstrichen
  c.strokeStyle = '#e8b030'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, W2 - 1, H2 - 1);
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
  const rest = S.miniRest('berg'), best = S.miniRekord('berg');
  const naechste = C.BERG_DEKO.find((d) => !S.st.kalDeko[d.id]);
  miniFenster('Schlittenberg', `
    <p>Im Wok den Berg hinunter! <b>Leg den Daumen aufs Bild und zieh ihn nach links oder rechts</b> - der Wok folgt ihm.</p>
    <p>Weich Tannen, Steinen, Schneemännern und Holzstapeln aus und sammle die Sterne. Je schneller du im Ziel bist, desto mehr Punkte.</p>
    <p class="klein">${C.BERG_DAUER} Sekunden · Rekord: <b>${best}</b>${naechste ? ` · ab ${naechste.ab} Punkten Rekord gibt es ein Deko-Stück` : ''}</p>
    <p class="klein">${rest ? `Heute noch ${rest} ${rest === 1 ? 'Runde' : 'Runden'} mit Sternen.` : 'Sterne gibt es heute keine mehr - aber der Rekord zählt!'}</p>`,
  [{ text: 'Später', neben: true }], 'berg', starteBergspiel);
}
export function starteBergspiel(stufeNr = 1) {
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
  // Innerhalb jeder Gruppe in der Reihenfolge, in der die Dinge frei werden
  const artikel = sortiereNachFreischaltung(C.ARTIKEL.filter((a) => a.tab === ladenTab));
  let gruppe = null;
  if (ladenTab === 'super') {
    liste.appendChild(el('div', 'zeile besessen', `<canvas width="16" height="16" class="ico"></canvas><div class="txt"><b>Sternenpunsch</b><span>Den gibt es von Anfang an. Gäste zahlen 10 Sterne.${rezeptHinweis('gluehwein')}</span></div><div class="knopfplatz"><span class="haken">✓</span></div>`));
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
  return [...Object.values(C.KALENDER_DEKO), ...C.AUFTRAG_DEKO, ...C.HAENDLER_DEKO, ...C.LICHTUNG_DEKO, ...C.MARKT_DEKO, ...C.BAUM_DEKO, ...C.BERG_DEKO, ...C.EIS_DEKO].filter((d) => S.st.kalDeko[d.id]);
}
/** Woher ein geschenktes Stück kommt - bei Minispielen mit der Punktschwelle. */
function herkunftVon(d) {
  const ab = d.ab ? ` (Rekord ab ${d.ab.toLocaleString('de-DE')} Punkten)` : '';
  if (d.id.startsWith('kal_')) return 'Aus dem Adventskalender';
  if (d.id.startsWith('h_')) return 'Vom fahrenden Händler';
  if (d.id.startsWith('m_')) return 'Vom Weihnachtsmarkt';
  if (d.id.startsWith('l_')) return 'Aus der Waldlichtung' + ab;
  if (d.id.startsWith('c_')) return 'Aus dem Christbaumverkauf' + ab;
  if (d.id.startsWith('s_')) return 'Vom Schlittenberg' + ab;
  if (d.id.startsWith('e_')) return 'Von der Eisbahn' + ab;
  return 'Für einen schweren Auftrag';
}
function baueHaus(behalteScroll) {
  const liste = $('#blattInhalt');
  const pos = liste.scrollTop;
  liste.innerHTML = '';
  const neu = S.st.neu || {};
  const hat = (a) => S.stufe(a.id) > 0;
  let leer = true;
  const gruppe = (titel) => { liste.appendChild(el('div', 'gruppe', titel)); leer = false; };

  // Varianten je Platz (09.10.): drei Knöpfe - gewählt, gekauft, kaufbar, ???
  const plaetze = Object.keys(C.VARIANTEN).filter((pl) => S.hat(pl));
  if (plaetze.length) {
    gruppe('Varianten');
    liste.appendChild(el('p', 'klein var-erkl', `Jeder Platz hat drei Varianten. Jede zusätzliche bringt ♥ +${C.VARIANTE_HERZEN} - die dritte zeigt sich erst, wenn du die zweite hast.`));
    for (const pl of plaetze) {
      const vs = C.VARIANTEN[pl], aktiv = S.variante(pl);
      const name = aktiv ? vs[aktiv].name : S.artikelName(pl);
      const reihe = el('div', 'varwahl');
      vs.forEach((v, i) => {
        const st = S.varianteStatus(pl, i);
        let cls = 'vw', inhalt;
        if (st.hat) { cls += i === aktiv ? ' aktiv' : ''; inhalt = `<b>${v.kurz}</b><small>${i === aktiv ? 'gewählt' : 'wählen'}</small>`; }
        else if (st.versteckt) { cls += ' zu'; inhalt = '<b>???</b><small>erst Nr. 2</small>'; }
        else { cls += st.leisten ? ' kauf' : ' teuer'; inhalt = `<b>${v.kurz}</b><small>★ ${S.formatGeld(st.kosten).replace(' Sterne', '')}</small>`; }
        const b = el('button', cls, inhalt);
        b.onclick = () => {
          if (st.hat) { S.waehleVariante(pl, i); baueHaus(true); zeigeVariante(pl); return; }
          if (st.versteckt) { T.spiele('falsch'); toast('Die dritte Variante zeigt sich, wenn du die zweite hast.', 'hinweis'); return; }
          if (!S.kaufeVariante(pl, i)) { T.spiele('falsch'); toast('Dafür reichen deine Sterne noch nicht.', 'hinweis'); return; }
          toast(`${v.name} gekauft! ♥ +${C.VARIANTE_HERZEN}`, 'gut');
          baueHaus(true); zeigeVariante(pl, `+${C.VARIANTE_HERZEN} ♥`);
        };
        reihe.appendChild(b);
      });
      const z = el('div', 'zeile haus var');
      const cv = el('canvas', 'ico'); cv.width = 16; cv.height = 16;
      zeichneIcon(cv, S.ARTIKEL_MAP[pl]);
      z.appendChild(cv);
      z.appendChild(el('div', 'txt', `<b>${name}</b>${aktiv ? `<span>${vs[aktiv].text}</span>` : ''}`));
      z.appendChild(reihe);
      liste.appendChild(z);
    }
  }

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
      const herkunft = herkunftVon(d);
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
    case 'kal_vogel': r(c, 7, 9, 2, 7, '#6a4222'); r(c, 3, 5, 10, 5, '#a8703a'); for (let i = 0; i < 4; i++) r(c, 2 + i, 4 - i, 12 - i * 2, 1, '#c83030'); r(c, 7, 6, 2, 2, '#2a1a10'); r(c, 11, 3, 3, 2, '#d8502a'); return;
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
    <p class="klein">${leer ? 'Heute hat er nichts mehr für dich - du hast schon alles!' : '„Seltene Ware von weit her! Gibt es nur bei mir - und ich ziehe bald weiter."'}</p>
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
      if (w === C.HAENDLER_GUTSCHEIN) { toast(`Zimtstern-Gutschein: ${Math.round(w.dauer / 60)} Minuten doppelte Sterne fürs Servieren!`, 'spezial'); zielLeiste(); return; }
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
  const x = C.MARKT_REZEPTE.find((r) => (S.st.rezepte || {})[r.id] && r.fuer.includes(id));
  return x ? ` · <i class="rezept">Marktrezept +${Math.round(x.plus * 100)} %</i>` : '';
}
export function zeigeMarkt() {
  const m = S.marktInfo();
  const deko = C.MARKT_DEKO.filter((d) => S.st.kalDeko[d.id]).length;
  const rez = C.MARKT_REZEPTE.filter((x) => (S.st.rezepte || {})[x.id]).length;
  const stand = `<p class="klein">Gesammelt: ${deko}/${C.MARKT_DEKO.length} Markt-Deko · ${rez}/${C.MARKT_REZEPTE.length} Rezepte</p>`;
  if (!m.heute) {
    const wann = m.inTagen === 1 ? 'morgen' : `am ${WOCHENTAG[m.datum.getDay()]}, ${m.datum.getDate()}.${m.datum.getMonth() + 1}. (in ${m.inTagen} Tagen)`;
    fenster('Festplatz', `
      <p>Noch ist der Platz leer. Der nächste <b>Weihnachtsmarkt</b> ist ${wann}.</p>
      <p class="klein">Dort gibt es Deko, die du nur auf dem Markt bekommst, und Rezepte, mit denen deine Getränke dauerhaft mehr Sterne bringen. Am Markttag kommen außerdem ${Math.round(C.MARKT_GAESTE * 100)} % mehr Gäste an deinen Stand.</p>
      ${stand}`, [{ text: 'Bis dann!' }]);
    return;
  }
  S.marktBesuchen();
  zielLeiste();
  const a = S.marktAngebot();
  const waren = [...a.deko, ...(a.rezept ? [a.rezept] : [])];
  const box = fenster('Weihnachtsmarkt', `
    <p class="klein">${waren.length ? `Heute ist Markt! Am Stand ist viel los: ${Math.round(C.MARKT_GAESTE * 100)} % mehr Gäste. Was es hier gibt, gibt es nur auf dem Markt.` : 'Du hast schon alles, was der Markt heute hat - aber am Stand ist trotzdem mehr los!'}</p>
    <div class="haendler-liste"></div>${stand}`, [{ text: 'Später', neben: true }]);
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
  // Wer schon drin war, braucht die Erklärung nicht mehr (kam im Betatest
  // NACH zwei abgeholten Aufträgen - und dann gleich zweimal)
  S.st.tipps = S.st.tipps || {};
  if (auftragReiter === 'erfolge') S.st.tipps.erfolge = true;
  else if (auftragReiter === 'heute') S.st.tipps.auftraege_neu = S.st.tipps.auftrag = true;
  oeffneBlatt('auftraege', auftragReiter === 'erfolge' ? 'Erfolgswand' : auftragReiter === 'album' ? 'Album' : 'Aufträge für heute');
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
// Album (10.10.): Besucher, Tiere, Rezepte, Dankesbilder. Was man noch nicht
// gesehen hat, steht als dunkler Umriss da - Lücken machen neugierig.
// ---------------------------------------------------------------------------
const ALBUM_GAESTE = [['erwachsen', 'Spaziergänger'], ['kind', 'Kinder'], ['oma', 'Omas'], ['opa', 'Opas'],
  ['rentier', 'Rentier'], ['schneemann', 'Schneemann'], ['grummel', 'Grummel'], ['weihnachtsmann', 'Weihnachtsmann']];
const ALBUM_TIERE = [['hase', 'Feldhase'], ['eich', 'Eichhörnchen'], ['reh', 'Reh'], ['gold', 'Goldhase'], ['fuchs', 'Fuchs'], ['schwein', 'Wildschwein'], ['igel', 'Igel']];
const ALBUM_TIERE_ALT = ['hase', 'eich', 'reh'];   // die gab es schon vor dem Album (alte Spielstände)
function albumKarte(name, n, male, w = 24, h = 24, einheit = '×') {
  const k = el('div', 'album-karte' + (n ? '' : ' zu'));
  // n < 0: schon gesehen, aber vor dem Album (10.10.) nicht mitgezählt
  k.innerHTML = `<canvas width="${w}" height="${h}"></canvas><b>${n ? name : '???'}</b><small>${n > 0 ? `${n.toLocaleString('de-DE')}${einheit}` : n < 0 ? 'schon gesehen' : 'noch nicht gesehen'}</small>`;
  const cv = k.querySelector('canvas'), ctx = cv.getContext('2d');
  male(ctx);
  if (!n) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = '#5a4a3e'; ctx.fillRect(0, 0, w, h); }
  return k;
}
function baueAlbum(liste) {
  const typ = S.st.stats.typ || {}, tiere = S.st.stats.tiere || {};
  const kopf = (titel, da, alle) => liste.appendChild(el('p', 'gruppe', `${titel}: ${da} / ${alle}`));
  // Besucher am Stand
  kopf('Besucher am Stand', ALBUM_GAESTE.filter(([t]) => typ[t]).length, ALBUM_GAESTE.length);
  const g = el('div', 'album-raster');
  for (const [t, name] of ALBUM_GAESTE) g.appendChild(albumKarte(name, typ[t] || 0, (ctx) => figurKlein(ctx, { typ: t, farben: neueFarben(t), phase: 0, laeuft: false }, 12, 22, 0), 24, 24, '× bedient'));
  liste.appendChild(g);
  // Tiere der Waldlichtung
  kopf('Tiere der Waldlichtung', ALBUM_TIERE.filter(([a]) => tiere[a] || (!S.st.stats.tiere && S.miniRekord('lichtung') > 0 && ALBUM_TIERE_ALT.includes(a))).length, ALBUM_TIERE.length);
  const ti = el('div', 'album-raster');
  // Alte Spielstände: Wer die Lichtung schon gespielt hat, kennt Hase, Eichhörnchen und Reh
  const frueher = !S.st.stats.tiere && S.miniRekord('lichtung') > 0;
  for (const [a, name] of ALBUM_TIERE) ti.appendChild(albumKarte(name, tiere[a] || (frueher && ALBUM_TIERE_ALT.includes(a) ? -1 : 0), (ctx) => LI.zeichneTierAlbum(ctx, a, 14, 24), 28, 26, '× gefüttert'));
  liste.appendChild(ti);
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
      fenster('Vorfreude!', `<div class="gross-ico">🎁</div><p>Ein Päckchen mit</p><p class="summe">${S.formatGeld(betrag)}</p><p class="klein">Bis zum 1. Dezember gibt es jeden Tag eins.</p>`);
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
    <div><span>Wetter heute</span><b>${(C.WETTER_LAGEN[Z.tagesWetter().art] || { name: 'Ruhig' }).name}, ${Z.tagesWetter().temp}°</b></div>
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
  // Ab Heiligabend: den Rückblick noch einmal ansehen
  if (S.heiligabendJetzt() && S.st.heiligabend === Z.saison()) {
    const rb = el('button', 'k k--neben', 'Mein Advent');
    rb.onclick = () => { schliesseBlatt(); zeigeRueckblick(); };
    zeile.appendChild(rb);
  }
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
  // Wie lange noch Spätherbst wäre - bei „Klassisch" im Oktober fast zwei
  // Monate ohne Türchen und Schnee. Das muss man VOR der Wahl wissen (Betatest 02.10.)
  const bis = Math.ceil((new Date(Z.saison(heute), 11, 1) - heute) / 86400000);
  const warten = bis > 7
    ? ` Bis zum 1. Dezember sind es noch <strong>${bis} Tage</strong> - so lange ist Spätherbst, ohne Türchen und ohne Schnee. Dafür wartet jeden Tag ein Vorfreude-Päckchen.`
    : '';
  // Lange vor Dezember ist „Individuell" für fast jeden die bessere Wahl:
  // dann steht es oben und ist als Empfehlung markiert (Betatest 2)
  const klassisch = `<button class="modus" data-m="echt">
      <b>🕯️ Klassisch</b>
      <span>Das Spiel läuft mit dem echten Kalender. Heute ist der ${heute.getDate()}.${heute.getMonth() + 1}. - die Adventszeit kommt, wenn sie wirklich kommt.${warten}</span>
    </button>`;
  const individuell = `<button class="modus${bis > 7 ? ' empfohlen' : ''}" data-m="eigen">
      <b>🎄 Individuell${bis > 7 ? ' <i class="empf">Empfohlen</i>' : ''}</b>
      <span>Dein Spiel beginnt eine Woche vor dem 1. Dezember, egal wann du startest. Bis zum ersten Türchen gibt es jeden Tag ein Vorfreude-Päckchen.</span>
    </button>`;
  const box = fenster('Wie möchtest du spielen?', `
    ${bis > 7 ? individuell + klassisch : klassisch + individuell}
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
      <li>☕ Verkaufe am Punschstand vor dem Haus warme Getränke.</li>
      <li>🛒 Kaufe mit den Sternen Lichter, Deko, Farbe und Helfer.</li>
      <li>🎄 Schmücke es bis zum 24. Dezember Stück für Stück.</li>
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
    <p>Auf der <b>Karte</b> warten Läden, Minispiele (zuerst nur die Waldlichtung, alle paar Tage kommt ein neues dazu) und alle paar Tage der Weihnachtsmarkt.${S.miniOffen('back') ? ' Plätzchen aus der Backstube kommen in die Dose an deinem Stand - jeder Gast, den du selbst bedienst, zahlt dafür mehr.' : ''} Ist die Fahne am <b>Briefkasten</b> neben der Tür oben, tippe ihn an. Was du schon entdeckt hast, steht im <b>Album</b> (unter Aufträge).</p>
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

  // Ab Heiligabend ist die Festtagskarte die erste, die man sieht
  if (rahmenNr == null && S.heiligabendJetzt()) rahmenNr = 'heilig';
  const heilig = rahmenNr === 'heilig';
  const rand = 44, unten = heilig ? 226 : 190;
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
  c.textAlign = 'center';
  kartenSchrift(c, gruss, mx, y0 + 72, 52, 'bold italic', R.titel, R.umriss, maxB);
  kartenSchrift(c, von, mx, y0 + 122, 30, '', R.text, R.umriss, maxB);
  if (heilig) {
    const rb = S.rueckblick(), z = (n) => Math.round(n).toLocaleString('de-DE');
    kartenSchrift(c, `Unser Advent: ${z(rb.bedient)} Gäste · ${z(rb.deko)} Deko-Stücke · ♥ ${z(rb.stimmung)}`, mx, y0 + 160, 22, 'italic', R.titel, R.umriss, maxB);
  }
  kartenSchrift(c, `${Z.datumLang()} · Punsch & Lichterglanz`, mx, y0 + (heilig ? 196 : 158), 20, '', R.text, R.umriss, maxB);

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
  $('#ziel').onclick = () => {
    T.spiele('klick');
    if (leistenModus === 'ansturm' || leistenModus === 'zimt') return;   // jetzt servieren, nicht lesen
    if (leistenModus === 'markt') { oeffneKarte('festplatz'); return; }
    offen === 'laden' ? schliesseBlatt() : oeffneLaden();
  };
  $('#btnLaden').onclick = () => { T.spiele('klick'); KA.istOffen() ? schliesseKarte() : oeffneKarte(); };
  $('#kartenZu').onclick = () => { T.spiele('klick'); schliesseKarte(); };
  $('#miniZu').onclick = () => { T.spiele('klick'); LI.schliesse(); CB.schliesse(); SB.schliesse(); EB.schliesse(); BS.schliesse(); };
  $('#btnKalender').onclick = () => { T.spiele('klick'); offen === 'kalender' ? schliesseBlatt() : oeffneKalender(); };
  $('#btnAuftraege').onclick = () => { T.spiele('klick'); offen === 'auftraege' ? schliesseBlatt() : oeffneAuftraege(E.neuZahl() > 0 && !A.abholbar() ? 'erfolge' : 'heute'); };
  $('#btnKarte').onclick = () => karte();
  $('#btnMenue').onclick = () => { T.spiele('klick'); offen === 'menue' ? schliesseBlatt() : oeffneMenue(); };
  $('#blattZu').onclick = () => { T.spiele('klick'); schliesseBlatt(); };
}
