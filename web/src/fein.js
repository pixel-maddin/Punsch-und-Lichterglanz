/*
 * fein.js - Bilder in doppelter Auflösung (11.10.). Gemeldet: Die Bilder bei
 * den Ereignissen und die Ortsbilder der Karte waren „zu grob pixelig" - sie
 * hatten halb so viele Pixel wie der Rest und wurden im Fenster stark
 * hochgezogen. Hier stehen die Bausteine (Verlauf, Tanne, Haus, Schnee,
 * Lichter) in feinerer Auflösung, dazu die Ortsbilder der Geschäfte
 * (`vignette`). Die Ereignisbilder selbst zeichnet ereignis.js mit diesen
 * Bausteinen.
 *
 * Alle Funktionen nehmen das Ziel `c` als erstes Argument. Lichter, die
 * nachts einen Schein bekommen, sammelt `licht()`; `leuchten()` malt ihn.
 */
import * as Z from './zeit.js?v=202610230900';
import { r, p, ton, mische, text as pixText, wichtelKlein, figurKlein, neueFarben, scale2x } from './pixel.js?v=202610230900';

/** Pixelschrift k-fach vergrößert (für Schilder in der feinen Auflösung). */
const _tmp = typeof document !== 'undefined' ? document.createElement('canvas') : null;
export function schrift(c, s, x, y, f, schatten, k = 2) {
  _tmp.width = s.length * 6 + 2; _tmp.height = 7;
  const t = _tmp.getContext('2d', { willReadFrequently: true });
  t.clearRect(0, 0, _tmp.width, 7);
  pixText(t, s, 0, 0, f, schatten);
  c.imageSmoothingEnabled = false;
  // Doppelt über Scale2x (11.10.): Die Schrift hat dann dieselbe feine
  // Pixelgröße wie das Bild drumherum, statt 2x2-Blöcke zu zeigen
  if (k === 2) c.drawImage(scale2x(_tmp), Math.round(x), Math.round(y));
  else c.drawImage(_tmp, 0, 0, _tmp.width, 7, Math.round(x), Math.round(y), _tmp.width * k, 7 * k);
}

export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
export const BUNT = ['#ff4a4a', '#5aff6a', '#4a8aff', '#ffd040', '#ff6adf'];

// ---------------------------------------------------------------------------
// Lichter: gesammelt, am Ende mit weichem Schein gemalt
// ---------------------------------------------------------------------------
let lichter = [];
export function licht(x, y, f = '#ffd070', gross = 1) { lichter.push({ x: Math.round(x), y: Math.round(y), f, g: gross }); }
export function neueLichter() { lichter = []; }
/** Schein um jedes gesammelte Licht; `staerke` 0..1 (nachts 1). */
export function leuchten(c, staerke = 1) {
  if (staerke <= 0.05) { lichter = []; return; }
  // Runder Schein in Pixelzeilen, zur Mitte heller (gestapelte Scheiben)
  for (const q of lichter) {
    const rr = Math.round(2 + q.g * 2.2);
    c.fillStyle = `rgba(255,214,140,${(0.07 * staerke).toFixed(3)})`;
    for (let k = rr; k >= 1; k -= Math.max(1, Math.round(rr / 3))) {
      for (let yy = -k; yy <= k; yy++) {
        const w = Math.round(Math.sqrt(k * k - yy * yy));
        c.fillRect(q.x - w, q.y + yy, w * 2 + 1, 1);
      }
    }
  }
  for (const q of lichter) p(c, q.x, q.y, q.f);
  lichter = [];
}

// ---------------------------------------------------------------------------
// Verlauf mit geordnetem Raster - weich, aber noch Pixel
// ---------------------------------------------------------------------------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function verlauf(c, x0, y0, w, h, farben) {
  const n = farben.length - 1;
  for (let y = 0; y < h; y++) {
    const t = (y / Math.max(1, h - 1)) * n;
    const i = Math.min(n - 1, Math.floor(t));
    const f = t - i;
    const stufe = Math.floor(f * 4) / 4;
    const c1 = mische(farben[i], farben[i + 1], stufe), c2 = mische(farben[i], farben[i + 1], Math.min(1, stufe + 0.25));
    const anteil = (f - stufe) * 4;
    for (let x = 0; x < w; x++) p(c, x0 + x, y0 + y, BAYER[(y % 4) * 4 + (x % 4)] / 16 < anteil ? c2 : c1);
  }
}

export function sterne(c, n, w, bis, seed = 1) {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(hash(i * 3 + seed) * w), y = Math.floor(hash(i * 7 + seed + 1) * bis);
    const hell = hash(i + seed * 11);
    if (hell > 0.86) {   // ein paar große, funkelnde
      p(c, x, y, '#ffffff'); p(c, x - 1, y, '#c8d0f0'); p(c, x + 1, y, '#c8d0f0'); p(c, x, y - 1, '#c8d0f0'); p(c, x, y + 1, '#c8d0f0');
    } else p(c, x, y, hell > 0.5 ? '#fff8e0' : '#9aa4d0');
  }
}

/** Mondsichel (Durchmesser 9). */
export function mond(c, x, y) {
  for (let yy = -4; yy <= 4; yy++) for (let xx = -4; xx <= 4; xx++) {
    if (xx * xx + yy * yy > 18) continue;
    const schatten = (xx + 2.5) * (xx + 2.5) + (yy - 1) * (yy - 1) < 13;
    if (!schatten) p(c, x + xx, y + yy, xx + yy < -2 ? '#fffbe8' : '#f4e8b8');
  }
}

// ---------------------------------------------------------------------------
// Boden
// ---------------------------------------------------------------------------
/** Schneedecke ab y0 mit sanfter Oberkante, Schattenmulden und Glitzer. */
export function schneeBoden(c, y0, w, h, seed = 1) {
  for (let x = 0; x < w; x++) {
    const kante = Math.round(Math.sin(x * 0.07 + seed) * 1.5 + Math.sin(x * 0.19 + seed * 2) * 0.8);
    for (let y = y0 + kante; y < y0 + h; y++) {
      const tief = (y - y0) / h;
      const v = hash(x * 13 + y * 7 + seed);
      let f = tief < 0.15 ? '#eef3f9' : '#f6f9fc';
      if (v < 0.06) f = '#dde6f0'; else if (v > 0.985) f = '#ffffff';
      p(c, x, y, f);
    }
    p(c, x, y0 + kante, '#ffffff');
  }
  // lange, flache Schattenmulden
  for (let i = 0; i < Math.round(w / 30); i++) {
    const mx = Math.floor(hash(i + seed * 5) * w), my = y0 + 4 + Math.floor(hash(i * 3 + seed) * (h - 6)), mw = 8 + Math.floor(hash(i + 9) * 14);
    r(c, mx - mw / 2, my, mw, 1, '#e2e9f2');
  }
}
/** Spätherbstwiese ab y0: vier Grüntöne, gerastert, mit Halmen. */
export function wiese(c, y0, w, h, farben, seed = 1) {
  for (let y = y0; y < y0 + h; y++) for (let x = 0; x < w; x++) {
    const v = Math.sin(x * 0.11 + seed) * 0.5 + Math.sin(y * 0.4 + x * 0.05) * 0.3 + (hash(x * 31 + y * 17 + seed) - 0.5) * 0.6;
    p(c, x, y, farben[Math.max(0, Math.min(3, Math.floor((v + 1) * 2)))]);
  }
  for (let i = 0; i < w / 3; i++) { const x = Math.floor(hash(i + seed) * w), y = y0 + 2 + Math.floor(hash(i * 5 + seed) * (h - 2)); p(c, x, y, farben[3]); p(c, x, y - 1, ton(farben[3], 0.15)); }
}

/** Fallender Schnee: einzelne und doppelte Flocken. */
export function schneefall(c, w, h, n, seed = 1) {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(hash(i * 5 + seed) * w), y = Math.floor(hash(i * 9 + seed + 3) * h);
    p(c, x, y, '#ffffff');
    if (hash(i + seed) > 0.7) { p(c, x + 1, y, '#e8f0f8'); p(c, x, y + 1, '#e8f0f8'); }
  }
}

// ---------------------------------------------------------------------------
// Pflanzen und Kleinkram
// ---------------------------------------------------------------------------
/**
 * Tanne mit Stufen, Licht- und Schattenseite, gezackten Astspitzen.
 * o: { schnee, lichter (Anzahl bunter Lichter), stern, farben [hell, mittel, dunkel] }
 */
export function tanne(c, x, fuss, h, o = {}) {
  const F = o.farben || ['#3a7a48', '#2a6038', '#1a4426'];
  const stamm = Math.max(2, Math.round(h * 0.12));
  r(c, x - 1, fuss - stamm, 2, stamm, '#5a3a22'); p(c, x, fuss - stamm, '#3a2414');
  const krone = h - stamm, maxW = Math.max(2, Math.round(h * 0.36));
  const n = Math.max(2, Math.round(krone / 7));
  const top = fuss - h;
  for (let s = 0; s < n; s++) {
    const t0 = top + Math.round(s * krone / (n + 0.5)), t1 = Math.min(fuss - stamm, t0 + Math.round(krone / (n + 0.5) * 1.6));
    const wb = Math.round(maxW * (s + 1.4) / (n + 0.4));
    for (let yy = t0; yy <= t1; yy++) {
      const a = (yy - t0) / Math.max(1, t1 - t0);
      let w = Math.max(0, Math.round(wb * (0.25 + a * 0.75) * (s === 0 ? a + 0.1 : 1)));
      if (yy % 2 && a > 0.5) w -= 1;                              // gezackter Rand
      r(c, x - w, yy, w, 1, F[0]); r(c, x, yy, w + 1, 1, F[1]);
      if (w > 1) p(c, x + w, yy, F[2]);
      if (a > 0.85 && w > 2) r(c, x + 1, yy, Math.ceil(w * 0.6), 1, F[2]);   // Schatten unter der Stufe
      if (o.schnee) {
        if (yy === t0 || (yy === t0 + 1 && w > 2)) r(c, x - w, yy, Math.max(1, w + 1), 1, yy === t0 ? '#ffffff' : '#e8f0f8');
        else if (yy === t1) { p(c, x - w, yy, '#ffffff'); p(c, x - w + 1, yy, '#e8f0f8'); }
      }
    }
  }
  if (o.lichter) for (let i = 0; i < o.lichter; i++) {
    const a = hash(i * 3 + x), yy = top + 4 + Math.floor(a * (krone - 5));
    const ww = Math.round(maxW * (yy - top) / krone * 0.8);
    const xx = x - ww + Math.floor(hash(i * 7 + x) * (ww * 2 + 1));
    p(c, xx, yy, BUNT[i % 5]); licht(xx, yy, BUNT[i % 5], 0.5);
  }
  if (o.stern) stern(c, x, top - 2, 2);
}
/** Fünfzackiger Pixelstern, Größe 1 (klein) bis 3. */
export function stern(c, x, y, g = 2, f = '#ffe060') {
  const h = ton(f, 0.5);
  if (g === 1) { p(c, x, y, h); p(c, x - 1, y, f); p(c, x + 1, y, f); p(c, x, y - 1, f); p(c, x, y + 1, f); }
  else {
    r(c, x - 1, y - 1, 3, 3, f); p(c, x, y, h);
    for (let i = 2; i <= g; i++) { p(c, x, y - i, f); p(c, x - i, y, f); p(c, x + i, y, f); p(c, x - i + 1, y + i, f); p(c, x + i - 1, y + i, f); }
  }
  licht(x, y, f, g);
}
export function busch(c, x, fuss, w, winter) {
  const f = winter ? '#3a6248' : '#3d6a32';
  for (let yy = 0; yy < Math.ceil(w * 0.55); yy++) {
    const ww = Math.round(w / 2 * Math.sqrt(1 - Math.pow(yy / (w * 0.55), 2)));
    r(c, x - ww, fuss - yy, ww * 2 + 1, 1, yy > w * 0.3 ? ton(f, 0.15) : f);
  }
  if (winter) r(c, x - Math.round(w * 0.3), fuss - Math.ceil(w * 0.55) + 1, Math.round(w * 0.6), 1, '#ffffff');
  else { p(c, x - 1, fuss - 2, '#c83a3a'); p(c, x + 2, fuss - 3, '#c83a3a'); }
}
export function laterne(c, x, fuss, h = 18) {
  r(c, x, fuss - h, 1, h, '#2a2a34'); r(c, x - 1, fuss - 1, 3, 1, '#2a2a34');
  r(c, x - 2, fuss - h - 5, 5, 5, '#2a2a34'); r(c, x - 1, fuss - h - 4, 3, 3, '#ffe090'); p(c, x, fuss - h - 3, '#fff8d0');
  r(c, x - 2, fuss - h - 6, 5, 1, '#3a3a44'); p(c, x, fuss - h - 7, '#3a3a44');
  licht(x, fuss - h - 3, '#ffe090', 1.5);
}
/** Lichterkette als durchhängender Bogen von (x0,y0) nach (x1,y1). */
export function kette(c, x0, y0, x1, y1, durch = 3, abstand = 3) {
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / Math.max(1, x1 - x0);
    const y = Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * durch);
    p(c, x, y, '#2a3a2a');
    if ((x - x0) % abstand === 1) { const f = BUNT[Math.floor((x - x0) / abstand) % 5]; p(c, x, y + 1, f); licht(x, y + 1, f, 0.4); }
  }
}

// ---------------------------------------------------------------------------
// Häuser
// ---------------------------------------------------------------------------
/** Sprossenfenster w x h: Rahmen, Glas mit Glanz, Fensterkreuz, Bank. */
export function fenster(c, x, y, w = 5, h = 6, an = true, rahmen = '#5a3a28') {
  r(c, x - 1, y - 1, w + 2, h + 2, rahmen);
  if (an) {
    r(c, x, y, w, h, '#ffcf6a'); r(c, x, y, Math.ceil(w / 2), Math.ceil(h / 2), '#ffe6a0');
    licht(x + Math.floor(w / 2), y + Math.floor(h / 2), '#ffd88a', 0.6);
  } else { r(c, x, y, w, h, '#5a6a84'); p(c, x, y, '#a8b8d0'); p(c, x + 1, y, '#8898b4'); }
  r(c, x + Math.floor(w / 2), y, 1, h, rahmen); r(c, x, y + Math.floor(h / 2), w, 1, rahmen);
  r(c, x - 1, y + h + 1, w + 2, 1, '#f0ece4');
}
/**
 * Haus mit Satteldach. o: { wand, dach, schnee, licht ('an'|'bunt'|false),
 * fachwerk, kamin, tuer, rauch }. Gibt die Firsthöhe zurück.
 */
export function haus(c, x, fuss, b, h, o = {}) {
  const wand = o.wand || '#efe3cc', dach = o.dach || '#8a4a3a';
  // Wand mit Schattenkante rechts und Sockel
  r(c, x, fuss - h, b, h, wand);
  r(c, x + b - 2, fuss - h, 2, h, ton(wand, -0.14));
  r(c, x, fuss - 2, b, 2, ton(wand, -0.32));
  if (o.fachwerk) {
    const bal = '#5a3424';
    r(c, x, fuss - h, b, 1, bal); r(c, x, fuss - Math.round(h / 2), b, 1, bal);
    for (let i = 0; i <= b - 1; i += 6) r(c, x + i, fuss - h, 1, h - 2, bal);
    for (let i = 0; i < Math.round(h / 2) - 1; i++) { p(c, x + 1 + i, fuss - Math.round(h / 2) - 1 - i, bal); p(c, x + b - 2 - i, fuss - Math.round(h / 2) - 1 - i, bal); }
  }
  // Fenster: eine oder zwei Reihen
  const an = o.licht !== false;
  const reihen = h >= 24 ? 2 : 1;
  for (let rr = 0; rr < reihen; rr++) {
    const fy = fuss - h + 4 + rr * 11;
    for (let fx = x + 3; fx + 5 <= x + b - 3; fx += 9) {
      if (o.tuer !== false && rr === reihen - 1 && Math.abs(fx + 2 - (x + b / 2)) < 5) continue;
      fenster(c, fx, fy, 5, 6, an && hash(fx * 3 + fy) > 0.15);
    }
  }
  // Tür mit Kranz
  if (o.tuer !== false) {
    const tx = Math.round(x + b / 2 - 3);
    r(c, tx - 1, fuss - 11, 8, 11, '#4a2c1a'); r(c, tx, fuss - 10, 6, 10, '#7a4a2a'); r(c, tx + 3, fuss - 10, 1, 10, '#5a3420');
    p(c, tx + 4, fuss - 5, '#e8c030');
    if (o.kranz !== false) { for (const [dx, dy] of [[1, -8], [2, -9], [3, -9], [4, -8], [4, -7], [3, -6], [2, -6], [1, -7]]) p(c, tx + dx, fuss + dy, '#2f7a3a'); p(c, tx + 2, fuss - 6, '#d83a3a'); }
    if (an) licht(tx + 3, fuss - 12, '#ffd88a', 0.5);
  }
  // Dach: Ziegelreihen, Überstand, Schnee mit Zapfen
  const dh = Math.ceil(b / 2) + 2;
  for (let i = 0; i < dh; i++) {
    const yy = fuss - h - 1 - i, xx = x - 2 + i, ww = b + 4 - i * 2;
    if (ww <= 0) break;
    r(c, xx, yy, ww, 1, i % 3 === 0 ? ton(dach, -0.18) : dach);
    if (i % 3 === 1) for (let k = (i * 2) % 4; k < ww; k += 4) p(c, xx + k, yy, ton(dach, -0.1));
    p(c, xx, yy, ton(dach, 0.2)); p(c, xx + ww - 1, yy, ton(dach, -0.3));
    if (o.schnee) {
      const tief = Math.round(dh * 0.5 + hash(xx + i) * 2);
      if (i >= dh - tief) r(c, xx, yy, ww, 1, i === dh - tief ? '#e2eaf4' : '#f6f9fc');
    }
  }
  if (o.schnee) {
    r(c, x - 2, fuss - h - 1, b + 4, 1, '#f6f9fc');
    for (let k = 0; k < b + 2; k += 3) { const l = 1 + Math.floor(hash(x + k) * 3); r(c, x - 1 + k, fuss - h, 1, l, '#cfe4f4'); }
  }
  if (o.licht === 'bunt') for (let i = 0; i < dh - 1; i += 2) {
    const f1 = BUNT[(i / 2) % 5], f2 = BUNT[(i / 2 + 2) % 5];
    p(c, x - 2 + i, fuss - h - 1 - i, f1); licht(x - 2 + i, fuss - h - 1 - i, f1, 0.4);
    p(c, x + b + 1 - i, fuss - h - 1 - i, f2); licht(x + b + 1 - i, fuss - h - 1 - i, f2, 0.4);
  }
  // Kamin mit Rauch
  if (o.kamin !== false) {
    const kx = x + Math.round(b * 0.7), ky = fuss - h - Math.round(dh * 0.55);
    r(c, kx, ky - 6, 4, 8, '#8a4a3a'); r(c, kx + 3, ky - 6, 1, 8, '#6a3428'); r(c, kx - 1, ky - 7, 6, 1, o.schnee ? '#f6f9fc' : '#5a3428');
    if (o.rauch !== false) for (let i = 0; i < 6; i++) { const rx = kx + 2 + Math.round(Math.sin(i * 1.3) * 2 + i * 0.6), ry = ky - 9 - i * 3; r(c, rx, ry, 2 + (i > 2 ? 1 : 0), 2, i < 3 ? '#d8dce4' : '#c4c8d4'); }
  }
  return fuss - h - dh;
}

// ---------------------------------------------------------------------------
// Ortsbilder der Geschäfte (oben im Laden-Blatt), 220 x 80
// ---------------------------------------------------------------------------
const VW = 220, VH = 80, HOR = 40;

/**
 * DIE FEINE STUFE (11.10.): Ein feiner Pixel ist überall genau ¾ Spielpixel.
 * Vorher hing seine Größe an der Breite des Fensters, in dem das Bild stand
 * (Laden 0,75 · Ereignis 0,7 · Startfenster 0,58) - drei Pixelgrößen für
 * dieselbe Art Bild. Jetzt bekommt die Leinwand so viele Spalten, wie bei
 * dieser Stufe in ihren Platz passen (höchstens `max`), und die CSS-Größe
 * wird daraus gesetzt statt umgekehrt. Gezeichnet wird weiter für die volle
 * Breite; `feinBreite` sagt, wie viel davon an jeder Seite wegfällt.
 */
export const FEIN = 0.75;
export function feinBreite(cv, max) {
  const el = cv.parentElement;
  if (!el) return max;
  const cs = getComputedStyle(el);
  const platz = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  if (!(platz > 0)) return max;   // noch nicht im Bild
  const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 2;
  const rand = 2 * (parseFloat(getComputedStyle(cv).borderLeftWidth) || 0);
  return Math.max(80, Math.min(max, Math.floor((platz - rand) / (px * FEIN))));
}
export function feinGroesse(cv) {
  cv.style.width = `calc(var(--px) * ${cv.width * FEIN})`;
  cv.style.height = `calc(var(--px) * ${cv.height * FEIN})`;
}

/**
 * Zeichnet das Geschäft `tab` in `ziel` (220 x 80). false = für diesen Tab kein Bild.
 * 'festplatz' (11.10.): der Weihnachtsmarkt, `opt.offen` = heute ist Markt.
 */
export function vignette(ziel, tab, opt = {}) {
  const zeichner = { markt: weihnachtsladen, super: supermarkt, baumarkt, wichtel: wichtelwald,
    festplatz: (c, x, fuss, winter) => festplatz(c, x, fuss, winter, !!opt.offen),
    // Minispiele (11.10.): dieselben Ortsbilder im Startfenster
    lichtung: waldlichtung, baum: christbaumverkauf, eis: eisbahn, back: backstube, berg: schlittenberg, schnee: schneeballwiese }[tab];
  if (!zeichner) return false;
  // Breite nach der feinen Stufe (siehe FEIN): gezeichnet wird für 220, die
  // Leinwand zeigt die Mitte davon
  const breite = feinBreite(ziel, VW), weg = Math.floor((VW - breite) / 2);
  ziel.width = breite; ziel.height = VH;
  feinGroesse(ziel);
  const c = ziel.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.translate(-weg, 0);
  neueLichter();
  // Eisbahn und Schlittenberg gibt es nur mit Schnee - ihr Bild ist immer winterlich
  const winter = Z.schnee() > 0 || tab === 'eis' || tab === 'berg' || tab === 'schnee', li = Z.licht();
  const himmel = li.hell > 0.6 ? ['#6aa4dc', '#94bfe8', '#c4dcf2']
    : li.hell > 0.1 ? ['#3e3e80', '#9a6a8c', '#f0a476'] : ['#0e1638', '#18224c', '#2a3666'];
  verlauf(c, 0, 0, VW, HOR + 2, himmel);
  if (li.hell < 0.3) { sterne(c, 26, VW, HOR - 8, 4); mond(c, VW - weg - 24, 9); }
  // Ferne Hügel in zwei Lagen
  for (let x = 0; x < VW; x++) {
    const h1 = 10 + Math.round(Math.sin(x / 23) * 4 + Math.sin(x / 9.3) * 2);
    r(c, x, HOR - h1, 1, h1, winter ? '#b8c6d8' : '#5e7e78');
    const h2 = 5 + Math.round(Math.sin(x / 13 + 2) * 2 + Math.sin(x / 5.1) * 1);
    r(c, x, HOR - h2, 1, h2, winter ? '#d2dcea' : '#4e7062');
  }
  if (winter) schneeBoden(c, HOR, VW, VH - HOR, 3);
  else wiese(c, HOR, VW, VH - HOR, ['#4a7a38', '#558641', '#609248', '#6c9e50'], 3);
  // Waldsaum am Horizont
  for (let x = 2; x < VW; x += 7) tanne(c, x + Math.floor(hash(x) * 3), HOR + 2, 9 + Math.floor(hash(x + 1) * 7), { schnee: winter, farben: ['#2e6a40', '#225430', '#163a22'] });
  zeichner(c, 110, 70, winter);
  // Abend und Nacht: Schleier, dann Lichter mit Schein
  if (li.hell < 0.9) {
    const nacht = 1 - li.hell;
    c.fillStyle = `rgba(24,20,66,${(nacht * 0.45).toFixed(3)})`;
    c.fillRect(0, HOR - 16, VW, VH - HOR + 16);
  }
  leuchten(c, li.hell < 0.9 ? 1 - li.hell : 0.25);
  return true;
}

function schatten(c, x, y, w) { c.fillStyle = 'rgba(20,30,50,0.18)'; c.fillRect(Math.round(x - w / 2), y, w, 2); c.fillRect(Math.round(x - w / 2 + 2), y + 2, w - 4, 1); }

function weihnachtsladen(c, x, fuss, winter) {
  // Nachbarhäuser links und rechts
  haus(c, x - 92, fuss - 2, 30, 22, { wand: '#d8a888', dach: '#6a3a2a', schnee: winter, kamin: false });
  haus(c, x + 64, fuss - 2, 28, 20, { wand: '#b8c8d8', dach: '#5a3a32', schnee: winter, fachwerk: true });
  // Pflaster vor dem Laden
  for (let yy = fuss; yy < fuss + 8; yy++) for (let xx = x - 50; xx < x + 50; xx++) p(c, xx, yy, ((xx >> 2) + (yy >> 1)) % 3 ? (winter ? '#d6dfea' : '#b8ab92') : (winter ? '#c4cfdc' : '#a29478'));
  schatten(c, x, fuss, 74);
  // Der Laden: Fachwerk oben, rot gestrichenes Erdgeschoss mit Schaufenstern
  const b = 64, h = 36, l = x - b / 2;
  r(c, l, fuss - h, b, h, '#efe3cc');
  const bal = '#5a3424';
  for (let i = 0; i <= b - 1; i += 8) r(c, l + i, fuss - h, 1, 16, bal);
  r(c, l, fuss - h, b, 1, bal); r(c, l, fuss - h + 15, b, 1, bal);
  for (let i = 0; i < 7; i++) { p(c, l + 8 + i, fuss - h + 14 - i * 2, bal); p(c, l + b - 9 - i, fuss - h + 14 - i * 2, bal); }
  for (const fx of [l + 18, l + 28, l + 38]) fenster(c, fx, fuss - h + 4, 5, 6, true);
  r(c, l, fuss - 20, b, 20, '#a8352c'); r(c, l + b - 2, fuss - 20, 2, 20, '#86281f'); r(c, l, fuss - 2, b, 2, '#6a1e18');
  // Markise grün-weiß mit Bogenkante
  for (let i = 0; i < b + 4; i++) {
    const f = Math.floor(i / 4) % 2 ? '#f4f0e8' : '#2f8a3a';
    r(c, l - 2 + i, fuss - 22, 1, 4, f);
    if (i % 4 !== 3) p(c, l - 2 + i, fuss - 18, f);
  }
  // Zwei Schaufenster mit Auslage: Nussknacker, Kugeln, Kerzen, Sterne
  for (const sx of [l + 4, l + 40]) {
    r(c, sx - 1, fuss - 16, 22, 12, '#5a1e18'); r(c, sx, fuss - 15, 20, 10, '#ffd88a'); r(c, sx, fuss - 15, 20, 3, '#ffe8b0');
    licht(sx + 10, fuss - 11, '#ffd88a', 1.5);
    r(c, sx + 2, fuss - 12, 3, 7, '#c83a32'); r(c, sx + 2, fuss - 14, 3, 2, '#f2c9a0'); r(c, sx + 2, fuss - 15, 3, 1, '#2a2a3a'); p(c, sx + 3, fuss - 9, '#e8c030');   // Nussknacker
    for (const [dx, f] of [[8, '#d83a3a'], [11, '#3a7ad8'], [14, '#e8c030']]) { r(c, sx + dx, fuss - 8, 2, 2, f); p(c, sx + dx, fuss - 8, ton(f, 0.5)); }
    r(c, sx + 17, fuss - 11, 1, 5, '#f8f4ea'); p(c, sx + 17, fuss - 12, '#ffb040');
    stern(c, sx + 12, fuss - 13, 1);
    r(c, sx - 1, fuss - 4, 22, 1, '#f0ece4');
  }
  // Tür mit Kranz und großem Stern darüber
  r(c, x - 5, fuss - 16, 10, 16, '#3a1e12'); r(c, x - 4, fuss - 15, 8, 15, '#6a3a22'); r(c, x - 3, fuss - 13, 6, 5, '#ffd88a');
  for (let a = 0; a < 12; a++) p(c, Math.round(x + Math.cos(a / 12 * 6.28) * 3), Math.round(fuss - 7 + Math.sin(a / 12 * 6.28) * 2), '#2f7a3a');
  p(c, x, fuss - 5, '#d83a3a'); p(c, x + 2, fuss - 8, '#e8c030');
  stern(c, x, fuss - 27, 3);
  // Dach mit Gaube und Schnee
  const dh = 18;
  for (let i = 0; i < dh; i++) {
    const yy = fuss - h - 1 - i, xx = l - 3 + Math.round(i * 1.6), ww = b + 6 - Math.round(i * 3.2);
    if (ww <= 0) break;
    r(c, xx, yy, ww, 1, i % 3 === 0 ? '#2e2d35' : '#3b3a44');
    if (winter && i > dh * 0.45) r(c, xx, yy, ww, 1, i === Math.ceil(dh * 0.45) + 1 ? '#e2eaf4' : '#f6f9fc');
  }
  if (winter) { r(c, l - 3, fuss - h - 1, b + 6, 1, '#f6f9fc'); for (let k = 0; k < b + 4; k += 3) r(c, l - 2 + k, fuss - h, 1, 1 + Math.floor(hash(k + 5) * 3), '#cfe4f4'); }
  // Girlande mit Lichtern unter der Traufe
  kette(c, l - 1, fuss - h + 1, x, fuss - h + 1, 3, 3); kette(c, x, fuss - h + 1, l + b, fuss - h + 1, 3, 3);
  // Christbaum rechts, Laterne links, Kisten mit Tannenzweigen
  tanne(c, x + 46, fuss + 4, 30, { schnee: winter, lichter: 9, stern: true });
  laterne(c, x - 46, fuss + 4, 20);
  r(c, x - 40, fuss - 2, 8, 5, '#a8703a'); r(c, x - 40, fuss - 2, 8, 1, '#c8905a'); for (let i = 0; i < 8; i += 2) p(c, x - 40 + i, fuss - 3, '#2f7a3a');
}

function supermarkt(c, x, fuss, winter) {
  // Parkplatz mit Markierungen
  r(c, x - 100, fuss - 4, 200, 14, '#5c6068');
  for (let yy = fuss - 4; yy < fuss + 10; yy++) for (let xx = x - 100; xx < x + 100; xx++) if (hash(xx * 7 + yy * 13) < 0.08) p(c, xx, yy, '#6a6e76');
  for (let i = -96; i < 100; i += 18) r(c, x + i, fuss + 2, 1, 7, '#e8e8e8');
  if (winter) for (let i = 0; i < 70; i++) p(c, x - 100 + hash(i + 3) * 200, fuss - 4 + hash(i + 5) * 14, '#e8eef4');
  // Flache Halle
  const b = 120, h = 30, l = x - b / 2, o = fuss - 4 - h;
  r(c, l, o, b, h, '#ecece8'); r(c, l + b - 3, o, 3, h, '#cacac4'); r(c, l, o + h - 2, b, 2, '#a8a8a4');
  r(c, l - 2, o - 3, b + 4, 3, winter ? '#f6f9fc' : '#8a909a'); if (winter) for (let k = 0; k < b; k += 4) r(c, l + k, o, 1, 1 + Math.floor(hash(k) * 2), '#cfe4f4');
  // Rotes Band mit Schrift und Logo
  r(c, l + 4, o + 2, b - 8, 13, '#c8302a'); r(c, l + 4, o + 2, b - 8, 1, '#e05048'); r(c, l + 4, o + 14, b - 8, 1, '#8a1e18');
  schrift(c, 'MARKT', x - 19, o + 3, '#ffffff', '#7a1a14');
  for (let i = 0; i < 7; i++) r(c, l + b - 14 - i, o + 4 + i, i * 2 + 1, 1, i < 5 ? '#3a7ad8' : '#2a5ab8');
  // Glasfront mit Schiebetür in der Mitte
  for (let i = 0; i < 10; i++) {
    const gx = l + 6 + i * 11;
    if (Math.abs(gx + 4 - x) < 8) continue;
    r(c, gx, o + 16, 9, 10, '#6a8aa8'); r(c, gx, o + 16, 9, 2, '#b8d8f0'); p(c, gx + 1, o + 18, '#d8ecf8');
    if (hash(i + 2) > 0.4) { r(c, gx + 2, o + 21, 5, 3, ['#e8c030', '#d83a3a', '#5aa84a'][i % 3]); licht(gx + 4, o + 20, '#f8f0c8', 0.6); }
    r(c, gx - 1, o + 16, 1, 10, '#9aa0aa');
  }
  r(c, x - 7, o + 15, 14, 11, '#a8d8f0'); r(c, x - 1, o + 15, 2, 11, '#6a9ab8'); r(c, x - 7, o + 15, 14, 1, '#6a9ab8'); licht(x, o + 20, '#f8f0c8', 1);
  // Einkaufswagen in einer Reihe
  for (let i = 0; i < 4; i++) { const wx = l + 4 + i * 3; r(c, wx, fuss - 9, 7, 4, '#b8bcc4'); r(c, wx, fuss - 9, 7, 1, '#d8dce4'); p(c, wx + 1, fuss - 4, '#2a2a2a'); p(c, wx + 5, fuss - 4, '#2a2a2a'); }
  // Autos auf dem Parkplatz
  const auto = (ax, ay, f) => {
    r(c, ax, ay - 4, 16, 4, f); r(c, ax + 3, ay - 7, 9, 3, f); r(c, ax + 4, ay - 6, 3, 2, '#a8d0e8'); r(c, ax + 8, ay - 6, 3, 2, '#a8d0e8');
    r(c, ax, ay - 4, 16, 1, ton(f, 0.25)); p(c, ax + 15, ay - 3, '#ffe8a0'); p(c, ax, ay - 3, '#d83a3a');
    r(c, ax + 2, ay - 1, 3, 2, '#1a1a1a'); r(c, ax + 11, ay - 1, 3, 2, '#1a1a1a');
    if (winter) r(c, ax + 3, ay - 8, 9, 1, '#ffffff');
  };
  auto(x - 92, fuss + 8, '#c83a32'); auto(x - 56, fuss + 8, '#3a6ab8'); auto(x + 40, fuss + 8, '#e8c030'); auto(x + 76, fuss + 8, '#4a8a5a');
  laterne(c, x - 74, fuss + 2, 22); laterne(c, x + 66, fuss + 2, 22);
  tanne(c, x - 104, fuss + 6, 26, { schnee: winter }); tanne(c, x + 104, fuss + 6, 24, { schnee: winter });
}

function baumarkt(c, x, fuss, winter) {
  for (let yy = fuss - 2; yy < fuss + 10; yy++) for (let xx = x - 100; xx < x + 100; xx++) p(c, xx, yy, hash(xx * 3 + yy * 11) < 0.1 ? '#8a8a88' : '#9a9a96');
  if (winter) for (let i = 0; i < 60; i++) p(c, x - 100 + hash(i + 7) * 200, fuss - 2 + hash(i + 9) * 12, '#e8eef4');
  // Große Halle aus Wellblech
  const b = 110, h = 36, l = x - b / 2, o = fuss - 2 - h;
  r(c, l, o, b, h, '#e8862a');
  for (let i = 0; i < b; i += 3) { r(c, l + i, o + 13, 1, h - 13, '#d4761e'); p(c, l + i + 1, o + 13, '#f49a3e'); }
  r(c, l + b - 3, o, 3, h, '#c06418'); r(c, l, o + h - 2, b, 2, '#9a4e14');
  r(c, l - 2, o - 3, b + 4, 3, winter ? '#f6f9fc' : '#a85a1a'); if (winter) for (let k = 0; k < b; k += 4) r(c, l + k, o, 1, 1 + Math.floor(hash(k + 2) * 2), '#cfe4f4');
  // Dunkles Schild mit BAU und Hammer
  r(c, l + 8, o + 1, b - 16, 13, '#2a2e36'); r(c, l + 8, o + 1, b - 16, 1, '#4a4e56');
  schrift(c, 'BAU', x - 14, o + 2, '#ffb040', '#7a3a08');
  r(c, x + 16, o + 4, 2, 8, '#c8a060'); r(c, x + 13, o + 3, 8, 3, '#b8bcc4'); r(c, x + 13, o + 3, 8, 1, '#e8ecf4');
  // Rolltor, Eingang, Fenster
  r(c, l + 10, o + 16, 30, h - 18, '#9a9ea8'); for (let i = 0; i < h - 18; i += 2) r(c, l + 10, o + 16 + i, 30, 1, '#868a94'); r(c, l + 9, o + 15, 32, 1, '#5a5e66');
  r(c, x + 6, o + 17, 14, h - 19, '#a8d8f0'); r(c, x + 12, o + 17, 2, h - 19, '#6a9ab8'); r(c, x + 5, o + 16, 16, 1, '#5a5e66'); licht(x + 13, o + 22, '#f8f0c8', 1);
  for (const fx of [l + 84, l + 96]) fenster(c, fx, o + 18, 7, 5, true, '#5a5e66');
  // Holzstapel mit Stirnholz
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
    const hx = x + 62 + i * 6 + row * 3, hy = fuss - 4 - row * 5;
    r(c, hx, hy - 4, 5, 5, '#c89a5a'); r(c, hx + 1, hy - 3, 3, 3, '#e0b878'); p(c, hx + 2, hy - 2, '#a87a42');
  }
  if (winter) r(c, x + 65, fuss - 19, 14, 1, '#ffffff');
  // Paletten, Leiter, Schubkarre
  for (let i = 0; i < 3; i++) { r(c, x - 82, fuss - 3 - i * 3, 14, 2, '#b8884a'); for (let k = 0; k < 14; k += 5) p(c, x - 82 + k, fuss - 2 - i * 3, '#7a5228'); }
  r(c, x - 96, fuss - 28, 1, 26, '#b8bcc4'); r(c, x - 90, fuss - 28, 1, 26, '#b8bcc4'); for (let k = 0; k < 26; k += 4) r(c, x - 96, fuss - 27 + k, 7, 1, '#d8dce4');
  r(c, x - 62, fuss - 8, 10, 4, '#3a7a48'); r(c, x - 61, fuss - 9, 8, 1, '#4a8a58'); r(c, x - 64, fuss - 4, 1, 1, '#2a2a2a'); r(c, x - 52, fuss - 7, 6, 1, '#5a3a22'); r(c, x - 59, fuss - 4, 3, 3, '#1a1a1a');
  // Christbäume zum Mitnehmen, ins Netz gepackt
  for (let i = 0; i < 3; i++) { tanne(c, x + 92 + i * 5 - 6, fuss + 6, 14 + i * 3, { schnee: winter }); }
}

function wichtelwald(c, x, fuss, winter) {
  // dichter Wald dahinter
  for (let i = 0; i < 18; i++) tanne(c, Math.floor(hash(i + 40) * 220), HOR + 10 + Math.floor(hash(i + 50) * 10), 22 + Math.floor(hash(i + 60) * 14), { schnee: winter });
  // Moosiger Grund
  for (let yy = fuss - 8; yy < fuss + 10; yy++) for (let xx = x - 90; xx < x + 90; xx++) {
    const d = Math.pow((xx - x) / 90, 2) + Math.pow((yy - fuss) / 12, 2);
    if (d < 1) p(c, xx, yy, winter ? (hash(xx + yy * 3) < 0.1 ? '#dfe8f2' : '#eef3f9') : (hash(xx * 5 + yy) < 0.2 ? '#3e6e32' : '#4a7a3a'));
  }
  // Baumstammhäuser: Rinde, Wurzeln, runde Tür und Fenster, Moos- oder Schneedach
  const stamm = (sx, sy, w, h) => {
    const l = Math.round(sx - w / 2);
    r(c, l, sy - h, w, h, '#7a5236'); r(c, l, sy - h, 2, h, '#9a6e4a'); r(c, l + w - 2, sy - h, 2, h, '#5a3a24');
    for (let i = 2; i < h; i += 3) for (let k = 3; k < w - 3; k += 4) p(c, l + k + (i % 2) * 2, sy - h + i, '#6a4630');
    r(c, l - 2, sy - 2, 3, 2, '#6a4630'); r(c, l + w - 1, sy - 2, 3, 2, '#6a4630'); p(c, l - 3, sy - 1, '#6a4630'); p(c, l + w + 1, sy - 1, '#6a4630');
    const tx = Math.round(sx);
    r(c, tx - 3, sy - 9, 7, 9, '#3a2416'); r(c, tx - 2, sy - 10, 5, 1, '#3a2416'); r(c, tx - 2, sy - 8, 5, 8, '#6a4228'); r(c, tx - 1, sy - 9, 3, 1, '#6a4228');
    p(c, tx + 1, sy - 4, '#e8c030');
    for (const fy of [sy - h + 6, sy - h + 15]) if (fy < sy - 12) {
      const fx = l + Math.round(w * 0.28);
      r(c, fx - 1, fy - 2, 5, 5, '#4a2c18'); r(c, fx, fy - 1, 3, 3, '#ffcf6a'); p(c, fx, fy - 1, '#ffe6a0'); licht(fx + 1, fy, '#ffd88a', 0.8);
    }
    for (let i = -2; i < w + 2; i++) r(c, l + i, sy - h - 2 - (i > 0 && i < w - 1 ? 1 : 0), 1, 3, winter ? (i % 3 ? '#f6f9fc' : '#e2eaf4') : (i % 3 ? '#3e7a34' : '#4e8a42'));
    if (!winter) { r(c, l + 3, sy - h - 5, 1, 2, '#f2e6cc'); r(c, l + 2, sy - h - 6, 3, 1, '#d84a3a'); }
  };
  stamm(x - 52, fuss - 2, 22, 40);
  stamm(x + 54, fuss - 1, 24, 46);
  // Pilzhaus in der Mitte
  r(c, x - 9, fuss - 20, 18, 20, '#f2e6cc'); r(c, x + 6, fuss - 20, 3, 20, '#d8c8a8');
  for (let yy = 0; yy < 10; yy++) { const w = Math.round(18 * Math.sqrt(1 - Math.pow(yy / 10, 2))); r(c, x - w, fuss - 20 - yy, w * 2 + 1, 1, yy < 2 ? '#a82a24' : '#c83a32'); }
  for (const [dx, dy] of [[-10, -23], [-3, -27], [5, -25], [11, -22], [0, -22], [-14, -21]]) { r(c, x + dx, fuss + dy, 2, 2, '#ffffff'); }
  if (winter) for (let k = -10; k <= 10; k++) p(c, x + k, fuss - 30 + Math.round(Math.abs(k) / 3), '#ffffff');
  r(c, x - 3, fuss - 10, 6, 10, '#5a3a22'); r(c, x - 2, fuss - 11, 4, 1, '#5a3a22'); p(c, x + 1, fuss - 5, '#e8c030');
  fenster(c, x + 3, fuss - 17, 3, 3, true, '#8a6a42');
  // Lichterketten zwischen den Häusern
  kette(c, x - 42, fuss - 40, x - 10, fuss - 26, 4, 3); kette(c, x + 10, fuss - 26, x + 42, fuss - 44, 4, 3);
  // Wichtel bei der Arbeit, Pilze, Laterne
  wichtelKlein(c, x - 24, fuss + 2, 0, 0); wichtelKlein(c, x + 22, fuss + 3, 0, 2); wichtelKlein(c, x + 30, fuss + 1, 0, 4);
  for (const [dx, dy, g] of [[-80, 4, 2], [-34, 6, 1], [78, 5, 2], [36, 7, 1], [-70, 8, 1]]) {
    r(c, x + dx, fuss + dy - g * 2, 1 + (g > 1 ? 1 : 0), g * 2, '#f2e6cc');
    r(c, x + dx - g, fuss + dy - g * 2 - 1, g * 2 + 1 + (g > 1 ? 1 : 0), 1 + (g > 1 ? 1 : 0), '#d84a3a'); p(c, x + dx, fuss + dy - g * 2 - 1, '#ffffff');
  }
  laterne(c, x - 76, fuss + 6, 18);
}

/** Marktbude: Satteldach, gestreifte Markise, Tresen - offen mit Ware und Licht, zu mit Fensterladen. */
function bude(c, x, fuss, b, farbe, offen, winter, seed) {
  r(c, x, fuss - 18, b, 18, '#8a5a32'); r(c, x + b - 2, fuss - 18, 2, 18, '#6a4222');
  for (let i = 3; i < b - 2; i += 4) r(c, x + i, fuss - 8, 1, 8, '#6a4222');
  if (offen) {
    r(c, x + 2, fuss - 16, b - 4, 7, '#7a3a1e'); r(c, x + 2, fuss - 16, b - 4, 1, '#ffb860');
    licht(x + b / 2, fuss - 13, '#ffb860', 1.5);
    for (let k = 0; k < (b - 6) / 4; k++) {
      const wx = x + 3 + k * 4, f = ['#a8582a', BUNT[(k + seed) % 5], '#f4f0e8'][(k + seed) % 3];
      r(c, wx, fuss - 12, 3, 3, f); p(c, wx, fuss - 12, ton(f, 0.4));
    }
  } else {
    r(c, x + 2, fuss - 16, b - 4, 7, '#9a6a3e'); for (let i = 0; i < 7; i += 2) r(c, x + 2, fuss - 16 + i, b - 4, 1, '#7a4a28');
  }
  r(c, x - 1, fuss - 9, b + 2, 2, '#c89a5a');
  for (let i = 0; i < b + 4; i++) {
    const f = Math.floor(i / 3) % 2 ? '#f4f0e8' : farbe;
    r(c, x - 2 + i, fuss - 21, 1, 3, f); if (i % 3 === 1) p(c, x - 2 + i, fuss - 18, f);
  }
  for (let i = 0; i < 6; i++) { const ww = b + 6 - i * 4; if (ww <= 0) break; r(c, x - 3 + i * 2, fuss - 22 - i, ww, 1, winter && i > 2 ? '#f6f9fc' : i % 2 ? '#6a4222' : '#7a5230'); }
  if (winter) r(c, x - 3, fuss - 22, b + 6, 1, '#f6f9fc');
}
function festplatz(c, x, fuss, winter, offen) {
  // Pflasterplatz
  for (let yy = fuss - 6; yy < fuss + 10; yy++) for (let xx = x - 104; xx < x + 104; xx++)
    p(c, xx, yy, ((xx >> 2) + (yy >> 1)) % 3 ? (winter ? '#d6dfea' : '#b8ab92') : (winter ? '#c4cfdc' : '#a29478'));
  // Großer Christbaum in der Mitte
  tanne(c, x, fuss - 2, 46, { schnee: winter, lichter: offen ? 24 : 0, stern: offen });
  // Buden links und rechts
  bude(c, x - 96, fuss - 2, 28, '#c83030', offen, winter, 1);
  bude(c, x - 60, fuss + 2, 30, '#2f7a3a', offen, winter, 2);
  bude(c, x + 30, fuss + 2, 30, '#c83030', offen, winter, 3);
  // Kinderkarussell rechts außen: gestreiftes Kegeldach, Pferdchen
  const kx = x + 86, kf = fuss - 2;
  for (let i = 0; i < 10; i++) { const ww = 28 - i * 3; r(c, kx - ww / 2, kf - 26 - i, ww, 1, i % 2 ? '#f4f0e8' : '#c83030'); }
  r(c, kx - 15, kf - 26, 30, 2, '#e8c030'); for (let i = 0; i < 30; i += 3) p(c, kx - 15 + i, kf - 24, offen ? BUNT[(i / 3) % 5] : '#a89040');
  r(c, kx - 1, kf - 24, 2, 22, '#c8a060');
  for (const [dx, hh] of [[-11, 0], [-4, 3], [5, 1], [11, 2]]) {
    r(c, kx + dx, kf - 24, 1, 12 + hh, '#e8c030');
    r(c, kx + dx - 2, kf - 12 + hh, 5, 3, ['#f4f0e8', '#8a5a32', '#f4f0e8', '#c89a5a'][Math.abs(dx) % 4]); p(c, kx + dx + 2, kf - 13 + hh, '#3a2414');
  }
  r(c, kx - 15, kf - 3, 30, 3, '#8a5a32'); r(c, kx - 15, kf - 3, 30, 1, '#c89a5a');
  if (winter) r(c, kx - 6, kf - 36, 12, 1, '#ffffff');
  if (offen) for (let i = 0; i < 30; i += 5) licht(kx - 15 + i, kf - 24, BUNT[(i / 5) % 5], 0.5);
  // Lichterketten quer über den Platz, Laternen, Leute
  if (offen) { kette(c, x - 82, fuss - 28, x - 8, fuss - 40, 5, 4); kette(c, x + 8, fuss - 40, x + 46, fuss - 26, 5, 4); }
  laterne(c, x - 26, fuss + 6, 20); laterne(c, x + 24, fuss + 6, 20);
  if (offen) {
    for (const [dx, typ] of [[-74, 'erwachsen'], [-66, 'kind'], [-40, 'oma'], [-16, 'erwachsen'], [14, 'kind'], [20, 'erwachsen'], [56, 'opa'], [64, 'kind'], [100, 'erwachsen']])
      figurKlein(c, { typ, farben: neueFarben(typ), phase: dx, laeuft: false }, x + dx, fuss + 9, 0);
    for (let i = 0; i < 5; i++) p(c, x - 46 + Math.round(Math.sin(i) * 2), fuss - 22 - i * 3, '#d8dce4');   // Dampf vom Punsch
  }
}

// ---------------------------------------------------------------------------
// Ortsbilder der Minispiele (11.10.)
// ---------------------------------------------------------------------------
function hase(c, x, fuss, f = '#b8a898') {
  r(c, x - 2, fuss - 3, 5, 3, f); r(c, x + 2, fuss - 5, 2, 2, f); p(c, x + 2, fuss - 7, f); p(c, x + 3, fuss - 7, f); p(c, x + 3, fuss - 6, f);
  p(c, x + 3, fuss - 4, '#2a1a10'); p(c, x - 3, fuss - 3, '#f4f4f4'); p(c, x + 4, fuss - 4, '#e8a0a8');
}
function reh(c, x, fuss) {
  const f = '#a8703a';
  r(c, x - 5, fuss - 9, 10, 4, f); for (const dx of [-4, -2, 3, 4]) r(c, x + dx, fuss - 5, 1, 5, '#8a5a2a');
  r(c, x + 4, fuss - 13, 2, 5, f); r(c, x + 5, fuss - 14, 4, 2, f); p(c, x + 8, fuss - 13, '#2a1a10'); p(c, x + 6, fuss - 14, '#2a1a10');
  p(c, x + 4, fuss - 15, '#6a4a2a'); p(c, x + 6, fuss - 16, '#6a4a2a'); p(c, x - 5, fuss - 8, '#f4ead8');
  for (const dx of [-3, 0, 2]) p(c, x + dx, fuss - 8, '#f4ead8');
}
function eichhorn(c, x, fuss) {
  const f = '#c8622a';
  r(c, x, fuss - 4, 3, 4, f); r(c, x + 2, fuss - 6, 2, 2, f); p(c, x + 3, fuss - 6, '#2a1a10'); p(c, x + 3, fuss - 7, f);
  r(c, x - 2, fuss - 8, 2, 6, '#d88a4a'); p(c, x - 1, fuss - 9, '#d88a4a');
}
function waldlichtung(c, x, fuss, winter) {
  // Lichtung: heller Grund, ringsum Tannen, in der Mitte die Futterraufe
  for (let yy = fuss - 16; yy < fuss + 10; yy++) for (let xx = x - 70; xx < x + 70; xx++) {
    const d = Math.pow((xx - x) / 70, 2) + Math.pow((yy - fuss + 3) / 14, 2);
    if (d < 1) p(c, xx, yy, winter ? (hash(xx + yy * 7) < 0.08 ? '#e2eaf4' : '#f8fbfd') : (hash(xx * 3 + yy) < 0.2 ? '#7cb35c' : '#88c068'));
  }
  for (const [dx, dy, h] of [[-96, 6, 34], [-84, 0, 26], [-72, -6, 22], [-58, -10, 18], [58, -10, 18], [72, -6, 22], [86, 0, 28], [98, 6, 34], [-104, 10, 30], [104, 10, 30]])
    tanne(c, x + dx, fuss + dy, h, { schnee: winter });
  // Futterraufe: zwei Pfosten, schräge Latten, Heu, Satteldach
  r(c, x - 14, fuss - 20, 2, 20, '#5a3a22'); r(c, x + 12, fuss - 20, 2, 20, '#5a3a22');
  r(c, x - 12, fuss - 14, 24, 7, '#c8a050'); for (let i = 0; i < 24; i += 2) p(c, x - 12 + i, fuss - 15, '#e8c870');
  for (let i = -12; i < 12; i += 4) for (let k = 0; k < 7; k++) p(c, x + i + Math.floor(k / 2), fuss - 14 + k, '#7a5230');
  for (let i = 0; i < 9; i++) { const ww = 34 - i * 4; if (ww <= 0) break; r(c, x - ww / 2, fuss - 21 - i, ww, 1, winter && i > 3 ? '#f6f9fc' : i % 2 ? '#6a3a24' : '#7a4424'); }
  if (winter) r(c, x - 17, fuss - 21, 34, 1, '#f6f9fc');
  r(c, x - 10, fuss - 7, 20, 2, '#8a5a32');
  // Tiere
  hase(c, x - 34, fuss + 4); hase(c, x - 26, fuss + 6, '#a8988a'); reh(c, x + 34, fuss + 5); eichhorn(c, x + 18, fuss + 2);
  r(c, x + 14, fuss + 2, 7, 3, '#7a4a28'); r(c, x + 14, fuss + 1, 7, 1, '#c8a070');   // Baumstumpf
  if (winter) for (let i = 0; i < 6; i++) p(c, x - 48 + i * 4, fuss + 7 + (i % 2), '#c8d4e2');   // Spuren
  else for (const [dx, dy] of [[-44, 2], [40, 7], [-12, 8]]) { p(c, x + dx, fuss + dy, '#f2e6cc'); r(c, x + dx - 1, fuss + dy - 1, 3, 1, '#d84a3a'); }
  laterne(c, x - 22, fuss - 4, 14);
}
function christbaumverkauf(c, x, fuss, winter) {
  // Platz mit Holzschnitzeln bzw. Schnee
  for (let yy = fuss - 8; yy < fuss + 10; yy++) for (let xx = x - 104; xx < x + 104; xx++) p(c, xx, yy, winter ? (hash(xx + yy * 5) < 0.1 ? '#dfe8f2' : '#f2f6fb') : (hash(xx * 7 + yy) < 0.25 ? '#a87a48' : '#c09060'));
  // Reihen geschlagener Bäume in Holzkreuzen
  for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) {
    const tx = x - 60 + i * 15 + row * 7, tf = fuss - 4 + row * 9, h = 18 + ((i + row) % 3) * 4;
    tanne(c, tx, tf, h, { schnee: winter, farben: [['#3a7a48', '#2a6038', '#1a4426'], ['#4a6a8a', '#38586e', '#28465a'], ['#4a8a4a', '#3a7038', '#2a5428']][(i + row) % 3] });
    r(c, tx - 3, tf, 7, 1, '#8a5a32'); p(c, tx + 3, tf - 6, '#f4f0e8'); p(c, tx + 3, tf - 5, '#d83a3a');   // Kreuz und Preisschild
  }
  // Verkaufshütte links mit Schild und Lichterkette
  const hx = x - 98;
  r(c, hx, fuss - 26, 28, 26, '#8a5a32'); for (let i = 3; i < 28; i += 4) r(c, hx + i, fuss - 26, 1, 26, '#6a4222');
  r(c, hx + 4, fuss - 20, 20, 9, '#ffcf6a'); r(c, hx + 4, fuss - 20, 20, 2, '#ffe6a0'); licht(hx + 14, fuss - 16, '#ffd88a', 1.5);
  for (let i = 0; i < 10; i++) { const ww = 34 - i * 4; if (ww <= 0) break; r(c, hx - 3 + i * 2, fuss - 27 - i, ww, 1, winter && i > 3 ? '#f6f9fc' : i % 2 ? '#5a2e18' : '#7a4424'); }
  r(c, hx + 2, fuss - 36, 24, 9, '#2f6a3a'); schrift(c, 'TANNEN', hx + 4, fuss - 35, '#fff8e0', '#1a3a20', 1);
  kette(c, hx, fuss - 27, hx + 28, fuss - 27, 2, 3);
  // Netzmaschine rechts: Trichter mit Netzrolle
  const nx = x + 52;
  r(c, nx - 2, fuss - 8, 4, 8, '#4a4a52'); for (let i = 0; i < 7; i++) r(c, nx - 2 - i, fuss - 15 + i, 4 + i * 2, 1, '#c83a32');
  r(c, nx + 3, fuss - 12, 12, 3, '#e8e8f0'); for (let i = 0; i < 12; i += 2) p(c, nx + 3 + i, fuss - 11, '#b8b8c8');
  // Auto mit Baum auf dem Dach
  const ax = x + 72;
  r(c, ax, fuss + 1, 30, 6, '#3a6ab8'); r(c, ax + 6, fuss - 4, 17, 5, '#3a6ab8'); r(c, ax + 8, fuss - 3, 5, 3, '#a8d0e8'); r(c, ax + 15, fuss - 3, 6, 3, '#a8d0e8');
  r(c, ax, fuss + 1, 30, 1, ton('#3a6ab8', 0.25)); r(c, ax + 3, fuss + 6, 5, 3, '#1a1a1a'); r(c, ax + 22, fuss + 6, 5, 3, '#1a1a1a');
  r(c, ax + 2, fuss - 6, 26, 2, '#2a6038'); for (let i = 0; i < 26; i += 2) p(c, ax + 2 + i, fuss - 7, '#3a7a48'); r(c, ax + 26, fuss - 6, 3, 2, '#5a3a22');
  if (winter) r(c, ax + 3, fuss - 8, 22, 1, '#ffffff');
}
function eisbahn(c, x, fuss, winter) {
  // Zugefrorener Weiher, oval, mit Glanz und Kufenspuren
  for (let yy = fuss - 14; yy < fuss + 10; yy++) for (let xx = x - 80; xx < x + 80; xx++) {
    const d = Math.pow((xx - x) / 80, 2) + Math.pow((yy - fuss + 2) / 12, 2);
    if (d < 1) p(c, xx, yy, d > 0.86 ? '#ffffff' : hash(xx * 3 + yy * 11) < 0.04 ? '#e6f4fc' : (yy < fuss - 6 ? '#b8dcf0' : '#a4d0ea'));
  }
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; p(c, Math.round(x + Math.cos(a) * 50), Math.round(fuss - 2 + Math.sin(a) * 6), '#d8ecf8'); p(c, Math.round(x + 10 + Math.cos(a) * 30), Math.round(fuss - 1 + Math.sin(a) * 4), '#d8ecf8'); }
  for (const [dx, dy] of [[-40, -6], [22, -8], [50, -2]]) r(c, x + dx, fuss + dy, 9, 1, '#ffffff');
  // Läufer: bunte kleine Figuren mit Kufen
  for (const [dx, dy, typ] of [[-26, 2, 'erwachsen'], [-14, 5, 'kind'], [12, 0, 'erwachsen'], [30, 4, 'kind'], [46, -3, 'oma']]) {
    figurKlein(c, { typ, farben: neueFarben(typ), phase: dx, laeuft: true }, x + dx, fuss + dy, 0.2);
    r(c, x + dx - 2, fuss + dy + 1, 5, 1, '#8a8a96');
  }
  // Lichterkette auf Pfosten rundherum, Bank, Glühwein-Hütte
  for (const px of [-86, -44, 0, 44, 86]) { r(c, x + px, fuss - 24, 1, 12, '#5a3a22'); }
  kette(c, x - 86, fuss - 24, x - 44, fuss - 24, 4, 3); kette(c, x - 44, fuss - 24, x, fuss - 24, 4, 3); kette(c, x, fuss - 24, x + 44, fuss - 24, 4, 3); kette(c, x + 44, fuss - 24, x + 86, fuss - 24, 4, 3);
  r(c, x - 100, fuss + 4, 12, 2, '#8a5a32'); r(c, x - 99, fuss + 6, 1, 3, '#5a3a22'); r(c, x - 90, fuss + 6, 1, 3, '#5a3a22'); r(c, x - 100, fuss + 3, 12, 1, '#ffffff');
  tanne(c, x - 104, fuss - 6, 28, { schnee: true }); tanne(c, x + 102, fuss - 4, 30, { schnee: true }); tanne(c, x + 92, fuss + 8, 20, { schnee: true });
}
/** Schneeballwiese (12.10.): Schneewälle, dahinter Grummel und ein Wichtel. */
function schneeballwiese(c, x, fuss, winter) {
  const wall = (wx, wy, b) => {
    for (let i = 0; i < b; i++) { const rd = Math.min(i, b - 1 - i), dy = rd < 3 ? 3 - rd : 0; r(c, wx - b / 2 + i, wy - 9 + dy, 1, 9 - dy, '#f4f8fc'); p(c, wx - b / 2 + i, wy - 10 + dy, '#9aaabe'); if (rd < 1) r(c, wx - b / 2 + i, wy - 9 + dy, 1, 9 - dy, '#b4c2d4'); }
    r(c, wx - b / 2 + 2, wy - 2, b - 4, 2, '#c8d4e2');
  };
  const grummel = (gx, gy) => { r(c, gx - 3, gy - 7, 7, 7, '#5a9a30'); r(c, gx - 2, gy - 6, 5, 4, '#7cbc44'); p(c, gx - 1, gy - 5, '#f0e040'); p(c, gx + 1, gy - 5, '#f0e040'); r(c, gx - 1, gy - 3, 3, 1, '#2a4a14'); r(c, gx - 3, gy - 9, 6, 2, '#c82828'); p(c, gx - 4, gy - 8, '#ffffff'); r(c, gx + 4, gy - 4, 2, 2, '#ffffff'); };
  grummel(x - 40, fuss - 14); wall(x - 40, fuss - 6, 30);
  wichtelKlein(c, x + 6, fuss - 8, 0.3); wall(x + 4, fuss - 2, 30);
  grummel(x + 46, fuss - 10); wall(x + 46, fuss - 2, 32);
  // Fliegender Schneeball und ein Treffer
  r(c, x - 14, fuss - 26, 3, 3, '#ffffff'); p(c, x - 18, fuss - 24, '#e8f0f8'); p(c, x - 22, fuss - 22, '#e8f0f8');
  for (const [dx, dy] of [[-2, 0], [2, -1], [0, -3], [1, 2]]) p(c, x + 46 + dx, fuss - 18 + dy, '#ffffff');
  tanne(c, x - 96, fuss - 4, 28, { schnee: true }); tanne(c, x + 96, fuss - 2, 30, { schnee: true });
}
function backstube(c, x, fuss, winter) {
  for (let yy = fuss - 2; yy < fuss + 10; yy++) for (let xx = x - 60; xx < x + 60; xx++) p(c, xx, yy, ((xx >> 2) + (yy >> 1)) % 3 ? (winter ? '#d6dfea' : '#b8ab92') : (winter ? '#c4cfdc' : '#a29478'));
  // Bäckerhaus: Fachwerk oben, Erdgeschoss mit großem Schaufenster
  const b = 70, h = 40, l = x - b / 2;
  r(c, l, fuss - h, b, h, '#f2e6cc'); r(c, l + b - 2, fuss - h, 2, h, '#d8c8a8');
  const bal = '#6a4428';
  r(c, l, fuss - h, b, 1, bal); r(c, l, fuss - h + 17, b, 1, bal);
  for (let i = 0; i < b; i += 7) r(c, l + i, fuss - h, 1, 17, bal);
  for (let i = 0; i < 7; i++) { p(c, l + 7 + i, fuss - h + 16 - i * 2, bal); p(c, l + b - 8 - i, fuss - h + 16 - i * 2, bal); }
  for (const fx of [l + 16, l + 30, l + 44]) fenster(c, fx, fuss - h + 5, 5, 6, true);
  // Schaufenster mit Plätzchen auf Blechen
  r(c, l + 4, fuss - 20, 40, 15, '#5a3420'); r(c, l + 5, fuss - 19, 38, 13, '#ffd88a'); r(c, l + 5, fuss - 19, 38, 3, '#ffe8b0'); licht(l + 24, fuss - 13, '#ffd88a', 2);
  r(c, l + 6, fuss - 11, 36, 1, '#a8a8b8'); r(c, l + 6, fuss - 15, 36, 1, '#a8a8b8');
  for (let i = 0; i < 6; i++) {
    const kx = l + 8 + i * 6, f = ['#d89a48', '#c8902c', '#d89a48'][i % 3];
    p(c, kx, fuss - 13, f); p(c, kx - 1, fuss - 12, f); p(c, kx + 1, fuss - 12, f); p(c, kx, fuss - 12, i % 2 ? '#ffffff' : '#5a3220');   // Sterne mit Guss/Schoko
    r(c, kx - 1, fuss - 17, 3, 2, '#c8282a'); p(c, kx, fuss - 18, '#c8282a');   // Herzen
  }
  r(c, l + 3, fuss - 5, 42, 1, '#f0ece4');
  // Tür, Brezelschild am Ausleger
  r(c, l + 50, fuss - 18, 12, 18, '#3a2012'); r(c, l + 51, fuss - 17, 10, 17, '#7a4a2a'); r(c, l + 53, fuss - 15, 6, 6, '#ffd88a'); p(c, l + 59, fuss - 8, '#e8c030');
  r(c, l + b, fuss - 30, 9, 1, '#3a2a1a'); r(c, l + b + 7, fuss - 29, 1, 2, '#3a2a1a');
  for (const [dx, dy] of [[0, 0], [1, -1], [2, -1], [3, 0], [4, -1], [5, -1], [6, 0], [6, 1], [5, 2], [4, 3], [3, 3], [2, 3], [1, 2], [0, 1], [2, 1], [4, 1], [3, 2]]) p(c, l + b + 4 + dx, fuss - 26 + dy, '#c8902c');
  // Dach, Ofenschornstein mit Rauch
  for (let i = 0; i < 16; i++) { const ww = b + 6 - i * 4; if (ww <= 0) break; r(c, l - 3 + i * 2, fuss - h - 1 - i, ww, 1, winter && i > 6 ? '#f6f9fc' : i % 3 === 0 ? '#6a2a1e' : '#8a3a2a'); }
  if (winter) r(c, l - 3, fuss - h - 1, b + 6, 1, '#f6f9fc');
  r(c, l + 10, fuss - h - 14, 5, 12, '#7a6a5a'); r(c, l + 9, fuss - h - 15, 7, 1, winter ? '#f6f9fc' : '#5a4a3a');
  for (let i = 0; i < 6; i++) r(c, l + 11 + Math.round(Math.sin(i) * 2 + i), fuss - h - 18 - i * 3, 3, 2, i < 3 ? '#e4e4ec' : '#cfcfd8');
  // Mehlsäcke, Nachbarn, Laterne
  for (const [dx, dy] of [[-48, 0], [-42, 1]]) { r(c, x + dx, fuss - 6 + dy, 6, 7, '#efe6d0'); r(c, x + dx + 1, fuss - 7 + dy, 4, 1, '#efe6d0'); p(c, x + dx + 2, fuss - 3 + dy, '#a89070'); }
  haus(c, x - 104, fuss - 2, 26, 20, { wand: '#d8a888', dach: '#6a3a2a', schnee: winter, kamin: false });
  haus(c, x + 78, fuss - 2, 28, 22, { wand: '#b8c8d8', dach: '#5a3a32', schnee: winter, fachwerk: true });
  laterne(c, x + 46, fuss + 6, 20);
}
function schlittenberg(c, x, fuss, winter) {
  // Ein großer Hang von rechts oben nach links unten, mit Rodelspur
  for (let xx = 0; xx < 220; xx++) {
    const top = Math.round(fuss - 8 - Math.max(0, (xx - 20)) * 0.26 - Math.sin(xx / 30) * 2);
    for (let yy = top; yy < 80; yy++) p(c, xx, yy, yy === top ? '#ffffff' : hash(xx * 5 + yy * 3) < 0.05 ? '#dfe8f2' : (xx > 150 && yy < top + 6 ? '#e8eff7' : '#f6f9fc'));
  }
  // Rodelspuren
  for (let xx = 30; xx < 200; xx++) { const y = Math.round(fuss - 2 - (xx - 20) * 0.2 + Math.sin(xx / 14) * 3); p(c, xx, y, '#c8d6e6'); p(c, xx, y + 3, '#c8d6e6'); }
  // Rodler: Schlitten und Wok
  const rodler = (rx, ry, wok) => {
    if (wok) { r(c, rx - 4, ry, 9, 2, '#3a3a40'); r(c, rx - 3, ry + 2, 7, 1, '#2a2a30'); p(c, rx + 5, ry, '#8a6a42'); }
    else { r(c, rx - 5, ry + 1, 10, 1, '#a8703a'); r(c, rx - 6, ry + 2, 12, 1, '#6a4222'); p(c, rx + 5, ry + 1, '#6a4222'); }
    r(c, rx - 1, ry - 4, 3, 4, ['#d83a3a', '#3a8ad8', '#3aa84a'][(rx >> 3) % 3]); r(c, rx - 1, ry - 7, 3, 3, '#f2c9a0'); r(c, rx - 1, ry - 8, 3, 1, '#d83a3a'); p(c, rx + 1, ry - 9, '#ffffff');
  };
  rodler(64, fuss - 12, false); rodler(118, fuss - 24, true); rodler(160, fuss - 33, false);
  // Fähnchen oben, Hütte, Tannen am Rand
  r(c, 196, fuss - 50, 1, 9, '#5a3a22'); r(c, 197, fuss - 50, 5, 3, '#d83a3a');
  const hx = 170, hf = fuss - 38;
  r(c, hx, hf - 10, 16, 10, '#8a5a32'); r(c, hx + 5, hf - 6, 5, 6, '#4a2c1a'); r(c, hx + 11, hf - 8, 3, 3, '#ffcf6a'); licht(hx + 12, hf - 7, '#ffd88a', 1);
  for (let i = 0; i < 6; i++) { const ww = 20 - i * 4; if (ww <= 0) break; r(c, hx - 2 + i * 2, hf - 11 - i, ww, 1, i > 1 ? '#f6f9fc' : '#6a3a24'); }
  for (const [tx, ty, h] of [[8, fuss + 2, 26], [22, fuss - 2, 20], [140, fuss - 30, 18], [210, fuss - 46, 22], [98, fuss - 14, 16]]) tanne(c, tx, ty, h, { schnee: true });
  // Kinder unten mit Schlitten an der Leine
  figurKlein(c, { typ: 'kind', farben: neueFarben('kind'), phase: 1, laeuft: true }, 40, fuss + 4, 0.3);
  r(c, 30, fuss + 3, 7, 1, '#a8703a'); for (let i = 0; i < 4; i++) p(c, 36 + i, fuss + 2 - Math.round(i * 0.4), '#c83a32');
}
