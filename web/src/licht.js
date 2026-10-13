/*
 * licht.js - Licht und Schatten für die Minispiele draußen (12.10.).
 *
 * Gemeldet: „trist, sehr simpel" - es gab nur eine flache Abdunklung bei
 * Nacht. Jetzt wie in der Backstube: Am Ende jedes Bildes wird die Szene mit
 * einer LICHTKARTE multipliziert. Die hat einen Grundton (die Farbe der
 * Schatten: tagsüber kühl-blau, abends violett, nachts tiefblau) und darauf
 * hellt das Licht auf:
 *   - die Wintersonne, tief und seitlich, wandert über den Tag von links nach
 *     rechts (Z.licht().sonne) und wird in der Dämmerung orange,
 *   - Lampen (`inseln`), die vor allem abends und nachts zählen,
 *   - Sonnenflecken (`flecken`), die nur tagsüber zählen,
 *   - der Himmel oben (`himmel`), damit er nicht mit abdunkelt.
 * Dazu weiche dunkle Ränder (`vignette`). Danach zeichnet das Spiel seine
 * Lichtquellen selbst darüber (`schein`), sonst würden sie mit abgedunkelt.
 *
 * `schatten()` ist ein weicher Bodenschatten unter Dingen; er fällt weg von
 * der Sonne (`schattenRichtung()`).
 */
import * as Z from './zeit.js?v=202610131706';

const karte = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const lk = karte ? karte.getContext('2d') : null;
// Dämpfung für Schein und Lichtinseln (12.10.: „die Lichtkegel sieht man zu stark“)
const SCHEIN = 0.6, INSEL = 0.55;
const klemme = (v) => Math.max(0, Math.min(1, v));
const misch = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** Weiches Licht (additiv) - für Lampen, Kerzen, Glut, NACH beleuchte(). */
export function schein(ctx, x, y, rad, rgb, a) {
  a *= SCHEIN;   // 12.10.: Lichter und Kegel waren zu kräftig
  if (a <= 0.005) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.45, `rgba(${rgb},${(a * 0.4).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2); ctx.restore();
}

/** Weicher Bodenschatten (Ellipse), VOR beleuchte() unter das Ding gezeichnet. */
export function schatten(ctx, x, y, rx, ry, a = 0.3) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(1, Math.max(0.1, ry / rx));
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(24,28,60,${a})`); g.addColorStop(0.6, `rgba(24,28,60,${(a * 0.6).toFixed(3)})`); g.addColorStop(1, 'rgba(24,28,60,0)');
  ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/** Wohin Schatten fallen: + nach rechts (Sonne links), - nach links. Nachts 0. */
export function schattenRichtung(li = Z.licht()) {
  return li.hell <= 0 ? 0 : (0.5 - klemme(li.sonne)) * 2;
}

/** Ist es dunkel genug, dass Lampen leuchten? 0 (Tag) .. 1 (Nacht) */
export const dunkel = (li = Z.licht()) => 1 - li.hell;

function fleck(ctx, x, y, rad, rgb, a) {
  if (a <= 0.005) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.5, `rgba(${rgb},${(a * 0.45).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}

/**
 * Die Szene in `c` (w x h) beleuchten.
 * opt.inseln  [{x, y, r, rgb, a}] Lampen (abends/nachts voll, tagsüber schwach)
 * opt.flecken [{x, y, r, a}]      Sonnenflecken (nur tagsüber)
 * opt.himmel  y-Grenze: bis hierhin bleibt es oben hell (0 = kein Himmel)
 * opt.vignette 0..1 (Vorgabe 0,3)
 * opt.grundTag, opt.grundNacht  [r, g, b] - eigene Schattenfarben
 */
export function beleuchte(c, w, h, opt = {}) {
  if (!karte) return;
  const li = Z.licht(), hell = li.hell, d = li.daemmer;
  if (karte.width !== w || karte.height !== h) { karte.width = w; karte.height = h; }
  const tag = opt.grundTag || [160, 170, 198], nacht = opt.grundNacht || [106, 116, 162], abend = [150, 118, 138];
  let g = misch(nacht, tag, hell);
  if (d > 0) g = misch(g, abend, d * 0.6);
  lk.globalCompositeOperation = 'source-over';
  lk.fillStyle = `rgb(${g.join(',')})`; lk.fillRect(0, 0, w, h);
  lk.globalCompositeOperation = 'lighter';
  // Die Sonne: tief, seitlich, wandert über den Tag
  if (hell > 0) {
    const sx = w * (0.05 + 0.9 * klemme(li.sonne)), sy = -h * 0.12;
    const farbe = d > 0.05 ? '255,168,110' : '255,238,206';
    fleck(lk, sx, sy, h * 1.3, farbe, 0.78 * hell);
  }
  if (opt.himmel) {
    const lg = lk.createLinearGradient(0, 0, 0, opt.himmel);
    lg.addColorStop(0, `rgba(255,255,255,${(0.35 + 0.35 * hell).toFixed(3)})`); lg.addColorStop(1, 'rgba(255,255,255,0)');
    lk.fillStyle = lg; lk.fillRect(0, 0, w, opt.himmel);
  }
  for (const q of opt.flecken || []) fleck(lk, q.x, q.y, q.r, '255,240,200', (q.a ?? 0.35) * hell);
  const lampen = 0.25 + 0.75 * (1 - hell);
  for (const q of opt.inseln || []) fleck(lk, q.x, q.y, q.r, q.rgb || '255,196,120', (q.a ?? 0.8) * lampen * INSEL);
  // Weiche dunkle Ränder
  lk.globalCompositeOperation = 'source-over';
  const v = (opt.vignette ?? 0.32) * (0.7 + 0.3 * hell);   // nachts weichere Ränder (12.10.: Nacht war zu dunkel)
  if (v > 0) {
    const vg = lk.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.35, w / 2, h * 0.5, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(14,16,40,0)'); vg.addColorStop(1, `rgba(14,16,40,${v})`);
    lk.fillStyle = vg; lk.fillRect(0, 0, w, h);
  }
  c.save(); c.globalCompositeOperation = 'multiply'; c.drawImage(karte, 0, 0); c.restore();
}
