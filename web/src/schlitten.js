/*
 * schlitten.js - Minispiel „Schlittenberg" (09.10.): Im Wok den Hang hinunter.
 * Der Finger zeigt, wohin gelenkt wird (Daumen auf den Bildschirm legen und
 * seitlich ziehen; am Rechner Pfeiltasten). Tannen, Steine, Schneemänner und
 * Holzstapel bremsen und werfen herum, Sterne auf der Strecke geben Punkte.
 * Wer vor Ablauf von BERG_DAUER Sekunden im Ziel ist, bekommt einen
 * Zeitbonus - je schneller, desto mehr.
 *
 * Gleiches Gerüst wie lichtung.js und christbaum.js: Vollbild-Canvas
 * #minispiel, 180 Pixel breit. Die Strecke läuft von unten nach oben durchs
 * Bild, der Wok steht im oberen Drittel, damit man sieht, was kommt.
 */
import * as C from './config.js?v=20261010i';
import * as Z from './zeit.js?v=20261010i';
import * as T from './ton.js?v=20261010i';
import * as MH from './minihud.js?v=20261010i';
import { r, p, ton, text as pixText, textBreite, wichtelKlein } from './pixel.js?v=20261010i';

const $ = (s) => document.querySelector(s);
const W = 180;
const LAENGE = 3900;            // Strecke in Pixeln (09.10.: 50 % länger, Nutzerwunsch)
const RAND = 14;                // Bäume am Rand: weiter geht es nicht
const TEMPO = [60, 160], BESCHL = 18, CRASH_TEMPO = 20;
const ARTEN = {
  tanne:     { r: 7 },
  stein:     { r: 5 },
  schneemann: { r: 5 },
  holz:      { r: 7 },
};

let cv = null, c = null, H = 320;
let stufe = C.MINI_STUFEN[1];   // Schwierigkeit der laufenden Runde
let spiel = null, rafId = 0, letzte = 0, fertig = null;
let tasten = { l: false, r: false };
export const istOffen = () => !!spiel;
export const zustand = () => spiel;
const WOK_Y = () => Math.round(H * 0.32);

function zufall(a, b) { return a + Math.random() * (b - a); }

export function starte(hoehe, beiEnde, stufeNr = 1) {
  stufe = C.MINI_STUFEN[stufeNr] || C.MINI_STUFEN[1];
  H = Math.round(hoehe); fertig = beiEnde;
  cv = $('#miniCv');
  cv.width = W; cv.height = H;
  c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  spiel = neuesSpiel(-3);
  $('#minispiel').classList.remove('versteckt');
  MH.an(W, H);
  T.musikPause(true);   // Musik ruht im Minispiel (09.10., Nutzerwunsch)
  // Lenken: Wo der Finger ist, dorthin zieht der Wok
  const fx = (e) => { const rc = cv.getBoundingClientRect(); return (e.clientX - rc.left) / rc.width * W; };
  cv.onpointerdown = (e) => { if (spiel) { spiel.finger = true; spiel.zielX = fx(e); } };
  cv.onpointermove = (e) => { if (spiel && spiel.finger) spiel.zielX = fx(e); };
  cv.onpointerup = cv.onpointercancel = () => { if (spiel) spiel.finger = false; };
  window.addEventListener('keydown', taste);
  window.addEventListener('keyup', taste);
  letzte = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(takt);
}
export function schliesse() {
  spiel = null;
  cancelAnimationFrame(rafId);
  window.removeEventListener('keydown', taste);
  window.removeEventListener('keyup', taste);
  $('#minispiel').classList.add('versteckt');
  MH.aus();
  T.musikPause(false);
}
function taste(e) {
  const an = e.type === 'keydown';
  if (e.key === 'ArrowLeft' || e.key === 'a') tasten.l = an;
  if (e.key === 'ArrowRight' || e.key === 'd') tasten.r = an;
}

function neuesSpiel(t0) {
  const g = { t: t0, dist: 0, x: 90, vx: 0, v: TEMPO[0], zielX: 90, finger: false, crash: 0, sterne: 0,
    punkte: 0, dinge: [], spur: [], gischt: [], texte: [], aus: false, imZiel: false, zeit: 0, treffer: 0 };
  // Strecke: alle 55 Pixel eine Reihe mit ein bis zwei Hindernissen, dazwischen Sterne
  const arten = Object.keys(ARTEN);
  for (let y = 260; y < LAENGE - 160; y += 68) {
    const n = Math.random() < 0.45 ? 2 : 1;
    const xs = [];
    for (let i = 0; i < n; i++) {
      let x, tries = 0;
      do { x = zufall(RAND + 10, W - RAND - 10); tries++; } while (xs.some((o) => Math.abs(o - x) < 40) && tries < 10);
      xs.push(x);
      g.dinge.push({ art: arten[Math.floor(Math.random() * arten.length)], x, y: y + zufall(-10, 10), getroffen: false });
    }
    if (Math.round((y - 260) / 68) % 2 === 0) {
      let sx, tries = 0;
      do { sx = zufall(RAND + 8, W - RAND - 8); tries++; } while (xs.some((o) => Math.abs(o - sx) < 18) && tries < 10);
      // Jeder vierte Stern ist ein großer: doppelte Punkte (Nutzerwunsch 09.10.)
      g.dinge.push({ art: 'stern', gross: Math.random() < 0.25, x: sx, y: y + 34, getroffen: false });
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------
function takt(jetzt) {
  if (!spiel) return;
  const dt = Math.min(0.05, (jetzt - letzte) / 1000);
  letzte = jetzt;
  schritt(dt);
  if (!spiel) return;
  zeichne(jetzt / 1000);
  rafId = requestAnimationFrame(takt);
}

function ende(g) {
  g.aus = true;
  // Punkte: Sterne, und wer im Ziel ist, bekommt Ziel- und Zeitbonus
  if (g.imZiel) g.punkte += Math.round((C.BERG_ZIEL + Math.max(0, C.BERG_DAUER - g.zeit) * C.BERG_JE_S) * stufe.punkte);
  if (fertig) T.spiele('fertig');
  setTimeout(() => { if (spiel === g && fertig) fertig(g.punkte, g.imZiel ? g.zeit : null, g.sterne); }, 1300);
}

function schritt(dt) {
  const g = spiel;
  g.t += dt;
  for (const x of g.texte) x.t += dt;
  g.texte = g.texte.filter((x) => x.t < 1);
  for (const s of g.gischt) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; }
  g.gischt = g.gischt.filter((s) => s.t < 0.5);
  if (g.t < 0 || g.aus) return;
  g.zeit = g.t;
  if (g.t >= C.BERG_DAUER) { ende(g); return; }
  // Lenken
  if (tasten.l) g.zielX -= 110 * dt;
  if (tasten.r) g.zielX += 110 * dt;
  g.zielX = Math.max(RAND, Math.min(W - RAND, g.zielX));
  const soll = Math.max(-125, Math.min(125, (g.zielX - g.x) * 7));
  g.vx += (soll - g.vx) * Math.min(1, dt * 8);
  if (g.crash > 0) { g.crash -= dt; g.vx *= 0.9; }
  g.x = Math.max(RAND, Math.min(W - RAND, g.x + g.vx * dt));
  // Tempo: wird immer schneller, ein Crash wirft zurück
  g.v = Math.min(TEMPO[1] * stufe.tempo, g.v + BESCHL * stufe.tempo * dt);
  g.dist += g.v * dt;
  g.spur.push({ x: g.x, y: g.dist });
  if (g.spur.length > 120) g.spur.shift();
  if (Math.abs(g.vx) > 40 && Math.random() < 0.6) g.gischt.push({ x: g.x - Math.sign(g.vx) * 7, y: WOK_Y() + 2, vx: -g.vx * 0.3 + zufall(-10, 10), vy: zufall(-30, -5), t: 0 });
  // Zusammenstöße
  for (const d of g.dinge) {
    if (d.getroffen) continue;
    const dy = d.y - g.dist;
    if (dy < -10 || dy > 10) continue;
    if (d.art === 'stern') {
      if (Math.abs(d.x - g.x) < (d.gross ? 12 : 10) && Math.abs(dy) < 8) {
        const pkt = Math.round(C.BERG_STERN * (d.gross ? 2 : 1) * stufe.punkte);
        d.getroffen = true; g.sterne++; g.punkte += pkt;
        g.texte.push({ x: d.x, y: WOK_Y() - 14, text: '+' + pkt, farbe: d.gross ? '#ffb040' : '#ffe27a', t: 0 });
        T.spiele(d.gross ? 'kasse' : 'greifen');
      }
      continue;
    }
    if (Math.abs(d.x - g.x) < ARTEN[d.art].r + 6 && Math.abs(dy) < 5) {
      d.getroffen = true; g.treffer++;
      if (g.log) g.log.push({ art: d.art, dx: Math.round(d.x - g.x), x: Math.round(g.x), ziel: Math.round(g.zielX), vx: Math.round(g.vx), dist: Math.round(g.dist) });
      g.v = CRASH_TEMPO; g.crash = 0.6;
      g.vx = (g.x < d.x ? -1 : 1) * 70;
      for (let i = 0; i < 8; i++) g.gischt.push({ x: g.x, y: WOK_Y(), vx: zufall(-50, 50), vy: zufall(-50, 10), t: 0 });
      g.texte.push({ x: g.x, y: WOK_Y() - 14, text: 'AUTSCH!', farbe: '#ff7a6a', t: 0 });
      T.spiele('falsch');
    }
  }
  if (g.dist >= LAENGE) { g.imZiel = true; T.spiele('spezialKasse'); ende(g); }
}

/** Nur für die Vorführszene: ein Stück den Hang hinunter. */
export function vorspulen(sek) {
  spiel.t = 0;
  for (let t = 0; t < sek; t += 1 / 30) { lenkeAuto(0.15); schritt(1 / 30); }
  zeichne(performance.now() / 1000);
}
/** Autopilot: sucht in `voraus` Pixeln die freieste Spur, Sterne ziehen an. */
function lenkeAuto(fehler, voraus = 110) {
  const g = spiel;
  let best = g.x, bw = -Infinity;
  for (let x = RAND + 4; x <= W - RAND - 4; x += 4) {
    let w = -Math.abs(x - g.x) * 0.15;
    // Der Weg dorthin zählt mit: seitlich schafft der Wok ~110 px/s
    const quer = Math.abs(x - g.x), dauer = quer / 110;
    for (const d of g.dinge) {
      if (d.getroffen) continue;
      const dy = d.y - g.dist;
      if (dy < 0 || dy > voraus) continue;
      const k = Math.min(1, dy / Math.max(1, g.v) / Math.max(0.01, dauer));
      const px = g.x + (x - g.x) * k;
      const dx = Math.abs(d.x - px);
      if (d.art === 'stern') { if (dx < 10) w += (d.gross ? 60 : 30) * (1 - dy / voraus); }
      else if (dx < ARTEN[d.art].r + 10) w -= 200 * (1 - dy / (voraus * 1.2));
    }
    if (w > bw) { bw = w; best = x; }
  }
  g.zielX = best + (Math.random() - 0.5) * fehler * 120;
}
/**
 * Messweg: eine Runde ohne Bildschleife. `reaktion` = so oft wird neu
 * entschieden (s), `fehler` = Ungenauigkeit beim Zielen, `voraus` = wie weit
 * man vorausschaut.
 */
export function messe(reaktion = 0.1, fehler = 0, voraus = 110, hoehe = 320, stufeNr = 1) {
  stufe = C.MINI_STUFEN[stufeNr];
  const altFertig = fertig;
  H = hoehe; fertig = null;
  spiel = neuesSpiel(0);
  spiel.log = [];
  let bis = 0;
  while (!spiel.aus) {
    if (spiel.t >= bis) { lenkeAuto(fehler, voraus); bis += reaktion; }
    schritt(1 / 60);
  }
  const erg = { punkte: spiel.punkte, ziel: spiel.imZiel, zeit: spiel.zeit, sterne: spiel.sterne, treffer: spiel.treffer, log: spiel.log };
  spiel = null; fertig = altFertig;
  return erg;
}

// ---------------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------------
function hash(n) { const s = Math.sin(n * 91.7) * 43758.5453; return s - Math.floor(s); }
function kreis(cx, cy, rad, f) {
  c.fillStyle = f;
  for (let y = -rad; y <= rad; y++) { const w = Math.round(Math.sqrt(rad * rad - y * y)); c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
}
function ellipse(cx, cy, rx, ry, f) {
  c.fillStyle = f;
  for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
}
function gross(s, f, x, y, k, links) {
  const w = textBreite(s) + 2;
  const tmp = gross.cv || (gross.cv = document.createElement('canvas'));
  tmp.width = w; tmp.height = 7;
  const t = tmp.getContext('2d');
  t.clearRect(0, 0, w, 7);
  pixText(t, s, 0, 0, f);
  c.drawImage(tmp, Math.round(links ? x : x - w * k / 2), Math.round(y), w * k, 7 * k);
}

function tanne(x, fuss, h) {
  c.fillStyle = 'rgba(80,100,140,0.18)'; c.fillRect(Math.round(x - 4), fuss, 10, 2);
  r(c, x, fuss - 2, 2, 3, '#5a3a22');
  const b = Math.round(h * 0.42);
  for (let i = 0; i < h - 2; i++) {
    const s = Math.floor(i / ((h - 2) / 3)), innen = (i % ((h - 2) / 3)) / ((h - 2) / 3);
    const w = Math.max(0, Math.round((s + 1) / 3 * b * (0.5 + innen * 0.5)));
    const yy = fuss - h + i;
    r(c, x - w, yy, w, 1, '#2a6a36'); r(c, x, yy, w + 1, 1, '#1d5228'); p(c, x + w, yy, '#143e1e');
    if (innen < 0.2) r(c, x - w, yy, w + 1, 1, '#ffffff');
  }
  p(c, x, fuss - h - 1, '#ffffff');
}
function ding(d, y, t) {
  const x = Math.round(d.x);
  if (d.art === 'tanne') tanne(x, y + 3, 17);
  else if (d.art === 'stein') {
    c.fillStyle = 'rgba(80,100,140,0.18)'; c.fillRect(x - 6, y + 2, 13, 2);
    ellipse(x, y - 1, 6, 3, '#7a7e88'); ellipse(x - 1, y - 2, 4, 2, '#9a9ea8'); r(c, x - 4, y - 4, 7, 1, '#ffffff'); p(c, x + 4, y, '#5a5e68');
  } else if (d.art === 'schneemann') {
    c.fillStyle = 'rgba(80,100,140,0.18)'; c.fillRect(x - 5, y + 2, 11, 2);
    kreis(x, y - 2, 4, '#ffffff'); kreis(x, y - 8, 3, '#ffffff'); p(c, x + 4, y - 2, '#d8e4ef'); p(c, x + 3, y - 8, '#d8e4ef');
    p(c, x - 1, y - 9, '#2a2a30'); p(c, x + 1, y - 9, '#2a2a30'); r(c, x, y - 8, 2, 1, '#e87a2a');
    r(c, x - 2, y - 12, 5, 1, '#2a2a30'); r(c, x - 1, y - 14, 3, 2, '#2a2a30'); r(c, x - 3, y - 6, 7, 1, '#c83a32');
    p(c, x - 5, y - 4, '#6a4428'); p(c, x - 6, y - 5, '#6a4428'); p(c, x + 5, y - 4, '#6a4428'); p(c, x + 6, y - 5, '#6a4428');
  } else if (d.art === 'holz') {
    c.fillStyle = 'rgba(80,100,140,0.18)'; c.fillRect(x - 8, y + 2, 17, 2);
    for (let i = 0; i < 3; i++) { r(c, x - 7 + i * 5, y - 3, 4, 4, '#8a5a32'); r(c, x - 6 + i * 5, y - 2, 2, 2, '#c8a070'); }
    for (let i = 0; i < 2; i++) { r(c, x - 5 + i * 5, y - 7, 4, 4, '#7a4c28'); r(c, x - 4 + i * 5, y - 6, 2, 2, '#c8a070'); }
    r(c, x - 5, y - 8, 9, 1, '#ffffff');
  } else if (d.art === 'stern' && !d.getroffen && d.gross) {
    // Großer Stern: doppelt so groß, mit Strahlenkranz
    const yy = y - 6 + Math.round(Math.sin(t * 4 + d.x) * 2), f = Math.floor(t * 6 + d.x) % 3 ? '#ffd040' : '#fff6c8';
    c.fillStyle = 'rgba(255,220,100,0.25)'; c.fillRect(x - 7, yy - 7, 15, 15);
    r(c, x - 2, yy - 2, 5, 5, f); r(c, x - 1, yy - 6, 3, 4, f); r(c, x - 1, yy + 3, 3, 4, f); r(c, x - 6, yy - 1, 4, 3, f); r(c, x + 3, yy - 1, 4, 3, f);
    p(c, x, yy - 7, f); p(c, x, yy + 7, f); p(c, x - 7, yy, f); p(c, x + 7, yy, f);
    for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) p(c, x + dx, yy + dy, '#e8a020');
    p(c, x - 1, yy - 1, '#ffffff');
  } else if (d.art === 'stern' && !d.getroffen) {
    const yy = y - 4 + Math.round(Math.sin(t * 4 + d.x) * 1.5), f = Math.floor(t * 6 + d.x) % 3 ? '#ffe060' : '#fff6c8';
    r(c, x - 1, yy - 1, 3, 3, f); p(c, x, yy - 3, f); p(c, x, yy + 3, f); p(c, x - 3, yy, f); p(c, x + 3, yy, f);
    p(c, x - 2, yy - 2, '#ffd040'); p(c, x + 2, yy + 2, '#ffd040'); p(c, x + 2, yy - 2, '#ffd040'); p(c, x - 2, yy + 2, '#ffd040');
  }
}

function wok(x, y, t, g) {
  const dreh = g.crash > 0 ? Math.round(Math.sin(t * 40) * 2) : 0;
  c.fillStyle = 'rgba(60,80,120,0.25)'; c.fillRect(x - 8, y + 3, 17, 2);
  ellipse(x, y, 8, 3, '#2a2a30'); ellipse(x, y - 1, 7, 2, '#4a4a54'); r(c, x - 8 + dreh, y - 1, 1, 1, '#8a8a92');
  r(c, x - 13 + dreh, y - 2, 5, 1, '#6a4428');               // Stiel
  wichtelKlein(c, x + dreh, y - 1, t, 0);
  // Arme hoch, wenn es schnell geht
  if (g.v > 110 && g.crash <= 0) { p(c, x - 3, y - 7, '#2f8a3a'); p(c, x + 3, y - 7, '#2f8a3a'); }
}

function zeichne(t) {
  const g = spiel;
  const wy = WOK_Y();
  const welt = (y) => wy + (y - g.dist);
  // Hang: Schnee mit Schattenbändern, die mitlaufen
  r(c, 0, 0, W, H, '#eef4f9');
  for (let y = 0; y < H; y += 2) {
    const wyl = Math.floor((y - wy + g.dist) / 2);
    const v = Math.sin(wyl * 0.07) + Math.sin(wyl * 0.031 + 2);
    if (v > 1.1) r(c, 0, y, W, 2, '#e2ebf3');
    if (hash(wyl) < 0.35) p(c, Math.floor(hash(wyl + 7) * W), y, '#d4e0ec');
    if (hash(wyl + 3) < 0.25) p(c, Math.floor(hash(wyl + 11) * W), y + 1, '#ffffff');
  }
  // Spur hinter dem Wok
  c.fillStyle = 'rgba(150,170,195,0.6)';
  for (const s of g.spur) { const yy = Math.round(welt(s.y)); if (yy < wy) { c.fillRect(Math.round(s.x - 4), yy, 1, 2); c.fillRect(Math.round(s.x + 4), yy, 1, 2); } }
  // Start oben und Ziel
  const sy = Math.round(welt(120));
  if (sy > -20) { for (let x = 0; x < W; x += 6) r(c, x, sy, 3, 2, '#3a8ad8'); pixText(c, 'START', W / 2 - 9, sy - 9, '#3a8ad8', null); }
  const zy = Math.round(welt(LAENGE));
  if (zy < H + 30) {
    for (let x = 0; x < W; x += 4) for (let k = 0; k < 2; k++) r(c, x + (k % 2) * 2, zy + k * 2, 2, 2, (Math.floor(x / 2) + k) % 2 ? '#2a2a30' : '#ffffff');
    r(c, 20, zy - 28, 2, 30, '#6a4428'); r(c, W - 22, zy - 28, 2, 30, '#6a4428');
    r(c, 22, zy - 28, W - 44, 10, '#c83a32'); r(c, 22, zy - 28, W - 44, 1, '#e85a4a');
    pixText(c, 'ZIEL', W / 2 - 7, zy - 26, '#ffffff', '#6a1414');
  }
  // Ränder: dichte Tannen links und rechts
  const von = Math.floor((g.dist - wy) / 16) * 16;
  for (let wyr = von; wyr < g.dist - wy + H + 32; wyr += 16) {
    const yy = Math.round(welt(wyr));
    for (const [x0, s] of [[4, 0], [W - 5, 1]]) tanne(x0 + Math.round((hash(wyr + s) - 0.5) * 4), yy, 12 + Math.floor(hash(wyr * 3 + s) * 6));
  }
  // Dinge in Reihenfolge der Tiefe; der Wok steht dazwischen
  const sicht = g.dinge.filter((d) => { const yy = welt(d.y); return yy > -20 && yy < H + 20; }).sort((a, b) => a.y - b.y);
  let wokGemalt = false;
  for (const d of sicht) {
    if (!wokGemalt && d.y > g.dist) { wok(Math.round(g.x), wy, t, g); wokGemalt = true; }
    ding(d, Math.round(welt(d.y)), t);
  }
  if (!wokGemalt) wok(Math.round(g.x), wy, t, g);
  for (const s of g.gischt) p(c, s.x, s.y, '#ffffff');
  // Schwebende Texte als DOM (minihud.js) - einmal anstoßen, sie steigen selbst
  for (const x of g.texte) if (!x.gezeigt) { x.gezeigt = true; MH.schwebe(x.x, x.y, x.text, x.farbe || (x.text.length > 3 ? '#ffb040' : '#ffe27a'), x.text.length > 5 ? 0.8 : 1.1); }
  // Daumen-Hinweis am Anfang
  MH.hinweis(g.t < 0 ? `Schwierigkeit: ${stufe.name}` : g.t < 2.5 ? 'Daumen ziehen zum Lenken' : null);
  // Leicht dunkler bei Nacht
  const li = Z.licht();
  if (li.hell < 0.9) { c.fillStyle = `rgba(14,20,62,${((1 - li.hell) * 0.35).toFixed(3)})`; c.fillRect(0, 0, W, H); }

  // Kopfzeile: Restzeit, Fortschritt bis zum Ziel, Punkte (DOM, minihud.js)
  const rest = Math.max(0, Math.ceil(C.BERG_DAUER - Math.max(0, g.t)));
  MH.setzeKopf({ zeit: rest, knapp: rest <= 5 && g.t >= 0, fortschritt: Math.min(1, g.dist / LAENGE), punkte: g.punkte });
  MH.mitte(g.aus ? (g.imZiel ? 'ZIEL!' : 'ZEIT!') : g.t < 0 ? String(Math.ceil(-g.t)) : g.t < 0.6 ? 'LOS!' : null, g.t < 0 && !g.aus ? '#ffffff' : '#ffe27a');
}
