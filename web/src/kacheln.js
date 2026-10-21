/*
 * kacheln.js - die Karte des Standes unten als feine Ebene über dem Spielbild
 * (19.10., nach dem Mock-up). Gemeldet: Die Kacheln im 180-Pixel-Bild waren
 * „zu pixelig". Jetzt: Rahmen, Name und Preis als HTML (scharf, Nunito), das
 * Getränk per Scale2x zweimal geglättet auf 80 x 80 (angezeigt 20 Spielpixel
 * groß - auf dem Handy also mit vier- bis sechsmal so vielen Bildpunkten).
 *
 * Die Ebene nimmt KEINE Tipps an (pointer-events: none): Getippt wird wie
 * immer aufs Spielbild, tresen.js/treffer() weiß, welche Kachel dort liegt.
 * Alles, was die Kacheln zeigen, kommt aus dem Spielzustand (S.lauf, S.st) -
 * kein eigener Zustand. Gebaut wird nur neu, wenn sich etwas ändert.
 */
import * as C from './config.js?v=202610210900';
import * as S from './spiel.js?v=202610210900';
import { iconGross, scale2x, r, p } from './pixel.js?v=202610210900';
import { naechsterSchritt } from './tresen.js?v=202610210900';

const $ = (s) => document.querySelector(s);
let wurzel = null;
const kacheln = [];   // je Platz: { el, cv, name, preis, info, balken, zone, marke, sig, bildSig }

function bauen() {
  wurzel = $('#theke');
  if (!wurzel) return false;
  for (let k = 0; k < C.ANGEBOT_MAX; k++) {
    const el = document.createElement('div');
    el.className = 'kachel';
    el.innerHTML = '<canvas width="40" height="40"></canvas><b class="k-name"></b><span class="k-preis"></span><i class="k-info"></i>'
      + '<span class="k-balken"><span class="k-zone"></span><span class="k-fuell"></span><span class="k-marke"></span></span>';
    wurzel.appendChild(el);
    kacheln.push({ el, cv: el.querySelector('canvas'), name: el.querySelector('.k-name'), preis: el.querySelector('.k-preis'),
      info: el.querySelector('.k-info'), zone: el.querySelector('.k-zone'), fuell: el.querySelector('.k-fuell'), marke: el.querySelector('.k-marke'), sig: '', bildSig: '' });
  }
  return true;
}

// Kleine Leinwand 20 x 20 in Spielpixeln, dann zweimal Scale2x
const _klein = document.createElement('canvas'); _klein.width = 20; _klein.height = 20;
const _kc = _klein.getContext('2d', { willReadFrequently: true });
// `glatt` = zweimal Scale2x (80 x 80, Knöpfe oben), sonst einmal (40 x 40): Die
// Getränke-Kacheln sollen wieder etwas pixeliger aussehen (19.10. Nutzerwunsch).
// 19.10. nachts: KEIN drawImage aus einer gemeinsamen Zwischenleinwand mehr -
// Safari auf dem iPhone kopiert Leinwände teils verzögert, dann zeigten zwei
// Kacheln dieselbe Sorte und sprangen hin und her (gemeldet). Scale2x schreibt
// jetzt per putImageData direkt in die Leinwand der Kachel bzw. in deren eigene
// Zwischenleinwand; gelesen wird nur sofort (getImageData).
function maleBild(ziel, malen, glatt = true) {
  _kc.clearRect(0, 0, 20, 20);
  malen(_kc);
  if (!glatt) { scale2x(_klein, 20, 20, ziel); return; }
  const x2 = scale2x(_klein, 20, 20, ziel._x2 || (ziel._x2 = document.createElement('canvas')));
  scale2x(x2, 40, 40, ziel);
}
/** Die Crêpe-Platte in 20 x 20: leer, mit Teig (bräunt) oder mit fertigem Crêpe. */
function platte(c, cr) {
  r(c, 1, 12, 18, 6, '#3a3a40'); r(c, 2, 10, 16, 3, '#1e1e22'); r(c, 3, 9, 14, 1, '#2a2a30'); r(c, 15, 14, 2, 2, cr.backT >= 0 ? '#f04a3a' : '#5a5a60');
  if (cr.backT >= 0) {
    const a = cr.backT / C.CREPE_ZEIT;
    const f = cr.gewendet ? '#e8c070' : a < 0.5 ? '#f4e4b0' : a < 0.8 ? '#e8c070' : '#c88a3a';
    r(c, 4, 8, 12, 2, f); r(c, 5, 7, 10, 1, f);
  } else if (cr.fertig) iconGross(c, 'crepe', 0, -3, 0);
}

/**
 * Bilder der beiden Knöpfe oben (19.10.): Haus links, Angebot rechts - in 20 x 20
 * gemalt und wie die Kacheln zweimal per Scale2x geglättet.
 */
function hausBild(c) {
  r(c, 13, 3, 3, 4, '#8a4a3a'); r(c, 13, 2, 3, 1, '#f6f9fc');                                    // Schornstein mit Schnee
  for (let i = 0; i < 7; i++) r(c, 9 - i, 3 + i, 3 + i * 2, 1, i < 2 ? '#f6f9fc' : i % 2 ? '#c83a2e' : '#a82a22');   // Dach, oben verschneit
  r(c, 3, 10, 15, 1, '#5a2a1a');
  r(c, 4, 11, 13, 7, '#efe0c0'); r(c, 4, 11, 1, 7, '#d0bc98'); r(c, 16, 11, 1, 7, '#d8c6a4');   // Wand
  r(c, 5, 12, 3, 3, '#ffd870'); r(c, 13, 12, 3, 3, '#ffd870'); p(c, 6, 13, '#f0a840'); p(c, 14, 13, '#f0a840');   // warme Fenster
  r(c, 9, 13, 3, 5, '#7a4a28'); p(c, 11, 15, '#ffd040');                                          // Tür
  r(c, 9, 12, 3, 1, '#2f7a30'); p(c, 10, 12, '#d83a3a');                                           // Kranz über der Tür
  const bunt = ['#ff5a5a', '#ffd040', '#5ad06a', '#5a9aff'];
  for (let x = 4, k = 0; x < 17; x += 2, k++) p(c, x, 10, bunt[k % 4]);                           // Lichterkette an der Traufe
  r(c, 2, 18, 17, 2, '#f6f9fc'); r(c, 2, 19, 17, 1, '#cfd9e8');                                   // Schnee
}
function angebotBild(c) {
  r(c, 1, 2, 13, 15, '#8a5a2e'); r(c, 2, 3, 11, 13, '#244a34'); r(c, 1, 2, 13, 1, '#a8703a');     // Tafel mit Holzrahmen
  for (let i = 0; i < 4; i++) { r(c, 3, 5 + i * 3, 2, 1, '#ffd870'); r(c, 6, 5 + i * 3, 3 + ((i * 2) % 3), 1, '#e8f0e0'); }   // Kreidezeilen mit Sternchen
  r(c, 5, 17, 1, 2, '#6a4222'); r(c, 9, 17, 1, 2, '#6a4222');                                      // Füße
  // Becher davor, mit Dampf
  // weiße Tasse (19.10. Nutzerwunsch), mit grauer Schattenkante
  r(c, 11, 11, 7, 7, '#f4eee4'); r(c, 11, 11, 7, 1, '#ffffff'); r(c, 11, 11, 1, 7, '#c8c0b4'); r(c, 12, 17, 5, 1, '#a8a094');
  r(c, 18, 13, 1, 3, '#e8e0d4'); p(c, 18, 12, '#e8e0d4'); p(c, 18, 16, '#e8e0d4');
  r(c, 13, 13, 3, 3, '#ffd040'); p(c, 14, 14, '#fff6c0');                                           // Stern auf dem Becher
  p(c, 13, 9, '#ffffff'); p(c, 14, 8, '#e8eef4'); p(c, 16, 9, '#ffffff'); p(c, 15, 7, '#e8eef4');
}
/**
 * Symbole der Kopfzeile als 16 × 16-Pixelraster (19.10.: erst 5 × 5 bzw. 7 × 7 -
 * der Stern sah aus wie ein Pfeil -, dann kurz geglättet; Nutzerwunsch: 16 × 16,
 * scharf und ohne Glättung). Form mit Umriss, Licht oben links, Schatten unten rechts.
 */
const N = 16;
function form(c, drin, farbe) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!drin(x + 0.5, y + 0.5)) continue;
    const rand = !drin(x - 0.5, y + 0.5) || !drin(x + 1.5, y + 0.5) || !drin(x + 0.5, y - 0.5) || !drin(x + 0.5, y + 1.5);
    p(c, x, y, rand ? farbe.rand : farbe.innen(x, y));
  }
}
function sternBild(c) {
  const ecken = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 3.4 : 7.8; ecken.push([8 + Math.cos(a) * rr, 8.7 + Math.sin(a) * rr]); }
  const drin = (x, y) => { let d = false; for (let i = 0, j = 9; i < 10; j = i++) { const [xi, yi] = ecken[i], [xj, yj] = ecken[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; };
  form(c, drin, { rand: '#9a5a0a', innen: (x, y) => (x + y < 13 ? '#fff2a0' : x + y < 18 ? '#ffd040' : '#e8a020') });
  p(c, 7, 5, '#ffffff');   // Glanz
}
function herzBild(c) {
  const drin = (x, y) => { const u = (x - 8) / 5.8, v = -(y - 8.2) / 5.8; const q = u * u + v * v - 1; return q * q * q - u * u * v * v * v <= 0; };   // klassische Herzkurve mit Einkerbung oben
  form(c, drin, { rand: '#8a1838', innen: (x, y) => (x + y < 12 ? '#ff9ab8' : x + y < 18 ? '#ff4a78' : '#d82a5a') });
  p(c, 4, 5, '#ffe0ea'); p(c, 5, 4, '#ffffff');   // Glanz
}
function postBild(c) {
  const drin = (x, y) => (x > 1 && x < 15 && y > 2 && y < 11.5 && !((x < 2.2 || x > 13.8) && (y < 3.6 || y > 10.4))) || (x > 3 && x < 6.2 && y >= 11 && y < 14.2 - (x - 3));
  form(c, drin, { rand: '#4a5a88', innen: (x, y) => (y < 5 ? '#ffffff' : '#e8eef8') });
  for (const dx of [5, 8, 11]) r(c, dx - 1, 6, 2, 2, '#5a6a98');   // drei Punkte
}
export function knopfBilder() {
  const h = document.querySelector('#btnHaus canvas'), a = document.querySelector('#btnStandkarte canvas');
  if (h) maleBild(h, hausBild);
  if (a) maleBild(a, angebotBild);
  const bilder = { stern: sternBild, herz: herzBild, post: postBild };
  for (const cv of document.querySelectorAll('canvas[data-bild]')) {
    const malen = bilder[cv.dataset.bild];
    if (!malen) continue;
    cv.width = N; cv.height = N;   // 1:1, kein Scale2x
    const c = cv.getContext('2d'); c.clearRect(0, 0, N, N); malen(c);
  }
}

const nbsp = ' ';
const kurz = (n) => { n = Math.round(n); return n < 1000 ? String(n) : (n / 1000).toFixed(n < 1e4 ? 1 : 0).replace('.', ',') + 'k'; };

/** Einmal je Bild aus main.js (beim Zeichnen des Spielbilds). */
export function aktualisiere(t) {
  if (!wurzel && !bauen()) return;
  const frei = S.produkteFrei();
  const druck = S.lauf.druck;
  const ns = naechsterSchritt();   // leiser Hinweis: dieses Getränk ist als Nächstes dran
  // Steam/Flammen der Becher: Bilder höchstens 6-mal je Sekunde neu
  const bildTakt = Math.floor(t * 6);
  for (let k = 0; k < C.ANGEBOT_MAX; k++) {
    const q = kacheln[k], p0 = frei[k];
    if (!p0) {
      if (q.sig !== 'frei') { q.sig = 'frei'; q.el.className = 'kachel frei'; q.name.textContent = 'Frei'; q.preis.textContent = '+'; q.info.textContent = ''; q.cv.getContext('2d').clearRect(0, 0, 40, 40); q.bildSig = ''; }
      continue;
    }
    const i = C.PRODUKTE.indexOf(p0);
    const rest = S.st.toepfe[p0.id] || 0, max = S.topfMax();
    const platteArt = p0.art === 'platte', cr = S.lauf.crepe;
    const leer = !platteArt && rest <= 0;
    const nf = S.stufe('nachfuell');
    let zustand = 'bereit', info = '', anteil = platteArt ? 0 : rest / max, zone = null, marke = null, balkenArt = anteil > 0.25 ? 'gruen' : 'gelb';
    if (platteArt) {
      if (cr.backT >= 0) {
        const a = cr.backT / C.CREPE_ZEIT;
        anteil = a; balkenArt = cr.gewendet ? 'gruen' : 'gelb';
        // „Wenden!" erst, wenn der Strich im grünen Bereich ist (19.10.) - vorher „backt"
        if (!cr.gewendet && !cr.verpasst) { zone = C.HANDGRIFF.wenden.timing; marke = a; info = a >= zone.von && a <= zone.bis ? 'Wenden!' : 'backt'; zustand = 'arbeit'; }
        else { info = 'backt'; zustand = 'arbeit'; }
      } else if (cr.fertig) { info = 'Fertig!'; zustand = 'fertig'; anteil = 1; balkenArt = 'gruen'; }
      else { info = 'Backen'; anteil = 0; }
    } else if (leer) {
      zustand = 'leer';
      const f = S.lauf.fuellen[p0.id] || 0;
      if (nf) { anteil = (S.lauf.nachfuellT[p0.id] || 0) / C.NACHFUELL_ZEIT[nf]; info = 'Wichtel füllt'; }
      else { anteil = f; info = `LEER${nbsp}· ${C.NACHFUELL_TIPPS - Math.round(f * C.NACHFUELL_TIPPS)}×${nbsp}tippen`; }
      balkenArt = 'blau';
    }
    const gedrueckt = druck && druck.art === 'zelle' && druck.i === i;
    const wackelt = !!S.lauf.wackel['z' + p0.id];
    const tipp = !!ns && ns.art === 'zelle' && ns.i === i;
    const preis = `+${kurz(S.produktPreis(p0) * S.preisFaktor())}${nbsp}★`;
    const sig = [p0.id, zustand, info, preis, gedrueckt, wackelt, tipp, Math.round(anteil * 40), zone ? 1 : 0, marke == null ? '' : Math.round(marke * 40)].join('|');
    if (sig !== q.sig) {
      q.sig = sig;
      q.el.className = 'kachel ' + zustand + (gedrueckt ? ' gedrueckt' : '') + (wackelt ? ' wackelt' : '') + (tipp ? ' tipp' : '') + (S.lauf.gefuellt[p0.id] > 0 ? ' voll-neu' : '');
      q.name.textContent = p0.name;
      q.preis.textContent = preis;
      q.info.textContent = info;
      q.fuell.style.width = Math.round(Math.max(0, Math.min(1, anteil)) * 100) + '%';
      q.fuell.dataset.art = balkenArt;
      q.zone.style.display = zone ? '' : 'none';
      if (zone) { q.zone.style.left = zone.von * 100 + '%'; q.zone.style.width = (zone.bis - zone.von) * 100 + '%'; }
      q.marke.style.display = marke == null ? 'none' : '';
      if (marke != null) q.marke.style.left = Math.min(98, marke * 100) + '%';
    }
    // Bild: Becher mit Dampf (bewegt sich) bzw. Platte
    const bSig = p0.id + '|' + (platteArt ? [cr.backT >= 0, cr.fertig, cr.gewendet, Math.floor((cr.backT || 0) * 4)].join(',') : bildTakt % 2);
    if (bSig !== q.bildSig) {
      q.bildSig = bSig;
      maleBild(q.cv, (c) => (platteArt ? platte(c, cr) : iconGross(c, p0.id, 0, 0, t)), false);
    }
  }
}
