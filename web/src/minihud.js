/*
 * minihud.js - Kopfzeile und Schrift der Minispiele (09.10.).
 *
 * Gemeldet: Zahlen und Texte waren hochgezogene 3x5-Pixelschrift, das wirkte
 * gröber als der Rest. Jetzt ist alles, was man LIEST, DOM-Text in der
 * Schrift des Spiels - wie die Kopfzeile am Stand: Zeit, Kette, Punkte,
 * Countdown, Hinweise, schwebende „+20" und die Wunschzettel. Im Canvas
 * bleibt nur Bild (auch Schilder, die zur Welt gehören).
 *
 * Koordinaten kommen in Canvas-Pixeln (180 x H) und werden in Prozent der
 * Fläche umgerechnet, damit sie bei jeder Bildschirmgröße sitzen.
 * Solange kein Minispiel offen ist (z. B. im Messweg), tut alles nichts.
 */
import { zeichneSymbol } from './symbole.js?v=202610282000';
import { schriftBild, stilFuer } from './schrift.js?v=202610282000';

/**
 * Text in der Weihnachtsschrift (schrift.js) in ein Element setzen. Ein
 * Schriftpixel ist immer genau EIN Spielpixel (11.10.: vorher 0,6 bis 1,3,
 * die Schrift stand mit anderen Pixeln als das Bild darunter); größer wird
 * sie nur über `k`, das die Glyphen in schrift.js selbst dicker zeichnet.
 * Nur neu zeichnen, wenn sich etwas ändert.
 */
function setzeSchrift(el, text, stil, k) {
  const schl = `${text}|${stil}|${k}`;
  if (el.dataset.s === schl) return;
  el.dataset.s = schl;
  const cv = schriftBild(text, stil, k);
  cv.className = 'schriftbild';
  cv.style.height = `calc(var(--px) * ${cv.height})`;
  el.replaceChildren(cv);
}

const $ = (s) => document.querySelector(s);
let aktiv = false, W = 180, H = 320;
let box = null, kopf = null, gross = null, hinweisEl = null;
const labels = new Map();
let letzterKopf = '';

/** Beim Start eines Minispiels: Ebene aufbauen (einmal) und leeren. */
export function an(breite, hoehe) {
  W = breite; H = hoehe; aktiv = true; letzterKopf = '';
  const ms = $('#minispiel');
  if (!box) {
    box = document.createElement('div'); box.id = 'miniHud';
    box.innerHTML = `<div class="mh-kopf">
        <div class="mh-zeit"><canvas class="hud-ico" data-ico="uhr"></canvas><span></span></div>
        <div class="mh-kette"><span></span><i><b></b></i></div>
        <div class="mh-punkte"><canvas class="hud-ico" data-ico="pokal"></canvas><span></span></div>
      </div>
      <div class="mh-hinweis"></div>
      <div class="mh-gross"></div>`;
    ms.appendChild(box);
    for (const cv of box.querySelectorAll('canvas[data-ico]')) zeichneSymbol(cv, cv.dataset.ico);
    kopf = box.querySelector('.mh-kopf'); gross = box.querySelector('.mh-gross'); hinweisEl = box.querySelector('.mh-hinweis');
  }
  for (const el of box.querySelectorAll('.mh-schwebe, .mh-label')) el.remove();
  labels.clear();
  mitte(null); hinweis(null);
  box.classList.remove('versteckt');
}
export function aus() { aktiv = false; if (box) box.classList.add('versteckt'); }

const px = (x) => `${(x / W * 100).toFixed(2)}%`;
const py = (y) => `${(y / H * 100).toFixed(2)}%`;

/** Kopfzeile: Restzeit (rot blinkend kurz vor Schluss), Kette mit Balken, Punkte. */
export function setzeKopf({ zeit, knapp = false, kette = 1, ketteAnteil = 0, punkte = 0, fortschritt = null }) {
  if (!aktiv) return;
  const sig = `${zeit}|${knapp}|${kette}|${Math.round(ketteAnteil * 20)}|${punkte}|${fortschritt == null ? '' : Math.round(fortschritt * 50)}`;
  if (sig === letzterKopf) return;
  letzterKopf = sig;
  const z = kopf.querySelector('.mh-zeit');
  setzeSchrift(z.querySelector('span'), String(zeit), knapp ? 'rot' : 'creme', 1);
  z.classList.toggle('knapp', knapp);
  // Mitte: entweder die Kette (Lichtung, Christbaum) oder der Fortschritt (Schlittenberg)
  const k = kopf.querySelector('.mh-kette');
  if (fortschritt != null) {
    k.classList.remove('versteckt'); k.classList.add('fort');
    setzeSchrift(k.querySelector('span'), 'ZIEL', 'creme', 1);
    k.querySelector('b').style.width = `${Math.round(fortschritt * 100)}%`;
  } else {
    k.classList.remove('fort');
    k.classList.toggle('versteckt', kette <= 1);
    setzeSchrift(k.querySelector('span'), `×${kette}`, 'gruen', 1);
    k.querySelector('b').style.width = `${Math.round(ketteAnteil * 100)}%`;
  }
  setzeSchrift(kopf.querySelector('.mh-punkte span'), punkte.toLocaleString('de-DE'), 'gold', 1);
}

/** Großer Text in der Mitte (Countdown, LOS!, ZEIT!), null blendet aus. */
export function mitte(text, farbe = '#ffe27a') {
  if (!box) return;
  if (!text) { gross.classList.add('versteckt'); gross.dataset.t = ''; return; }
  if (gross.dataset.t === text) return;
  gross.dataset.t = text;
  // Countdown-Ziffern als Zuckerstange, Wörter (LOS!, ZEIT!, ZIEL!) in Gold
  setzeSchrift(gross, text, /^\d+$/.test(text) ? 'zucker' : stilFuer(farbe), 4);
  gross.classList.remove('versteckt');
  // Bei jedem neuen Wort einmal aufploppen
  gross.classList.remove('plopp'); void gross.offsetWidth; gross.classList.add('plopp');
}

/**
 * Kleine Zeile unter der Kopfzeile: was gerade dran ist. `y` (Canvas-Pixel)
 * setzt sie stattdessen an eine Stelle im Bild - die Backstube stellt sie
 * über die Reihe, in der man gerade tippen muss (11.10.), `x` verschiebt
 * ihre Mitte (beim Backen links neben den Ofen).
 */
export function hinweis(text, y = null, x = null) {
  if (!hinweisEl) return;
  hinweisEl.style.top = y == null ? '' : py(y);
  hinweisEl.style.left = x == null ? '' : px(x);
  hinweisEl.classList.toggle('gross', y != null);
  hinweisEl.classList.toggle('versteckt', !text);   // immer setzen - am Anfang stand sonst ein leeres Kästchen
  if (hinweisEl.dataset.t === (text || '')) return;
  hinweisEl.dataset.t = text || '';
  hinweisEl.textContent = text || '';
}

/** Schwebender Text an einer Stelle im Bild („+20", „NEIN!"), steigt und verblasst. */
export function schwebe(x, y, text, farbe = '#ffe27a', gr = 1) {
  if (!aktiv) return;
  const el = document.createElement('div');
  el.className = 'mh-schwebe';
  setzeSchrift(el, text, stilFuer(farbe), 1);   // `gr` wird nicht mehr gebraucht: eine Pixelgröße für alle
  el.style.left = px(x); el.style.top = py(y);
  box.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

/** Dauerhaftes Etikett (z. B. Wunschzettel), `html` null entfernt es. */
export function label(key, x, y, html, klasse = '') {
  if (!aktiv) return;
  let el = labels.get(key);
  if (html == null) { if (el) { el.remove(); labels.delete(key); } return; }
  if (!el) { el = document.createElement('div'); el.className = 'mh-label ' + klasse; box.appendChild(el); labels.set(key, el); }
  if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
  el.style.left = px(x); el.style.top = py(y);
}
