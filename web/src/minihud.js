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
import { zeichneSymbol } from './symbole.js?v=20261009q';

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
  z.querySelector('span').textContent = zeit;
  z.classList.toggle('knapp', knapp);
  // Mitte: entweder die Kette (Lichtung, Christbaum) oder der Fortschritt (Schlittenberg)
  const k = kopf.querySelector('.mh-kette');
  if (fortschritt != null) {
    k.classList.remove('versteckt'); k.classList.add('fort');
    k.querySelector('span').textContent = 'ZIEL';
    k.querySelector('b').style.width = `${Math.round(fortschritt * 100)}%`;
  } else {
    k.classList.remove('fort');
    k.classList.toggle('versteckt', kette <= 1);
    k.querySelector('span').textContent = `×${kette}`;
    k.querySelector('b').style.width = `${Math.round(ketteAnteil * 100)}%`;
  }
  kopf.querySelector('.mh-punkte span').textContent = punkte.toLocaleString('de-DE');
}

/** Großer Text in der Mitte (Countdown, LOS!, ZEIT!), null blendet aus. */
export function mitte(text, farbe = '#ffe27a') {
  if (!box) return;
  if (!text) { gross.classList.add('versteckt'); gross.dataset.t = ''; return; }
  if (gross.dataset.t === text) return;
  gross.dataset.t = text;
  gross.textContent = text; gross.style.color = farbe;
  gross.classList.remove('versteckt');
  // Bei jedem neuen Wort einmal aufploppen
  gross.classList.remove('plopp'); void gross.offsetWidth; gross.classList.add('plopp');
}

/** Kleine Zeile unter der Kopfzeile: was gerade dran ist. */
export function hinweis(text) {
  if (!hinweisEl) return;
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
  el.textContent = text;
  el.style.left = px(x); el.style.top = py(y); el.style.color = farbe;
  el.style.fontSize = `calc(var(--px) * ${(6 * gr).toFixed(1)})`;
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
