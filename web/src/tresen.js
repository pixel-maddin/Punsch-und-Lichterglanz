/*
 * tresen.js - die Ansicht hinter dem Tresen und was man dort antippt.
 *
 *   ┌──────────── Gäste (bis zu drei, mit Wunsch und Geduld) ─────┐
 *   │ Gläser │    Hand (1-3 Plätze)    │ Schwung │ Ausguss        │
 *   │ Regal: 2 × 5 Töpfe / Dose / Crêpe-Platte                    │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Symbol im Wunsch-Bläschen == Symbol auf dem Topf. Mehr Zuordnung
 * braucht es nicht, und es kommt ohne Schrift aus.
 */
import { r, p, ton, mische, icon, figurGross, wichtelGross, wichtelKlein, smiley, text, textBreite } from './pixel.js?v=202610101341';
import * as C from './config.js?v=202610101341';
import * as S from './spiel.js?v=202610101341';
import * as Z from './zeit.js?v=202610101341';

const BUNT = ['#ff4a4a', '#5aff6a', '#4a8aff', '#ffd040', '#ff6adf'];

export function zeichneTresen(c, y0, t, w) {
  const yb = y0 + C.T_GAST, yr = yb + C.T_BRETT;
  gaestezone(c, y0, t, w);
  brett(c, yb, t);
  regal(c, yr, t);
  gedrueckt(c, y0, yb, yr);
  // Ringe an der Tippstelle
  for (const k of S.lauf.klicks) {
    const a = 1 - k.t / 0.35;
    c.strokeStyle = `rgba(255,248,220,${(0.9 * a).toFixed(2)})`;
    c.lineWidth = 1;
    c.beginPath(); c.arc(Math.round(k.x) + 0.5, Math.round(k.y) + 0.5, 2 + k.t * 26, 0, Math.PI * 2); c.stroke();
  }
}

/** Das angetippte Feld leuchtet kurz auf. */
function gedrueckt(c, y0, yb, yr) {
  const d = S.lauf.druck;
  if (!d) return;
  let q = null;
  if (d.art === 'zelle') q = [(d.i % 5) * C.T_ZELLE_B + 1, yr + Math.floor(d.i / 5) * C.T_ZELLE_H + 1, C.T_ZELLE_B - 2, C.T_ZELLE_H - 3];
  else if (d.art === 'glaeser') q = [1, yb + 1, 40, C.T_BRETT - 2];
  else if (d.art === 'ausguss') q = [150, yb + 1, 29, C.T_BRETT - 2];
  if (!q) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = `rgba(255,230,160,${(0.35 * d.t / 0.14).toFixed(2)})`;
  c.fillRect(q[0], q[1], q[2], q[3]);
  c.restore();
  c.strokeStyle = '#ffe9a0'; c.lineWidth = 1;
  c.strokeRect(q[0] + 0.5, q[1] + 0.5, q[2] - 1, q[3] - 1);
}

// ---------------------------------------------------------------------------
function gaestezone(c, y0, t, w) {
  const hell = w.li.hell;
  // Blick nach draußen
  const oben = mische('#26305e', w.schnee > 0 ? '#9cc0dc' : '#a4b0ba', hell);
  const unten = mische('#3e4a7c', w.schnee > 0 ? '#e0e8f0' : '#8c8a70', hell);
  r(c, 0, y0, 180, 30, oben);
  r(c, 0, y0 + 30, 180, 22, unten);
  // Lichter am Horizont / Schneefall
  if (w.wetter.art === 'schnee') for (let i = 0; i < 24; i++) {
    const x = (i * 37 + t * (6 + (i % 3) * 3)) % 180, y = y0 + ((i * 13 + t * (10 + (i % 4) * 4)) % 50);
    p(c, x, y, '#f4f8ff');
  }
  // Heizpilz wärmt von der Seite
  if (S.zeigt('heizpilz')) {
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(0, y0 + 40, 0, 0, y0 + 40, 60);
    g.addColorStop(0, 'rgba(255,120,40,0.35)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    c.fillStyle = g; c.fillRect(0, y0, 70, 52);
    c.restore();
  }
  // Standlicht: warmer Schein von oben
  if (S.zeigt('standlicht')) {
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(0, y0, 0, y0 + 52);
    g.addColorStop(0, `rgba(255,190,100,${0.18 + 0.2 * (1 - hell)})`); g.addColorStop(1, 'rgba(255,190,100,0)');
    c.fillStyle = g; c.fillRect(0, y0, 180, 52);
    c.restore();
  }

  // Gäste mit Tiefe statt Seitwärtslaufen. Wer wartet, steht als kleiner
  // Schattenriss LINKS hinten in einer festen Reihe (höchstens drei). Ist
  // jemand dran, blendet sein Schatten aus, die anderen rücken auf, und er
  // wächst an seinem Platz aus der Tiefe nach vorn. Wer fertig ist, wird
  // kleiner und blendet nach hinten aus. Gemeldet: Seitwärtslaufen sah aus
  // wie Plätzetauschen, und Schatten in den Lücken ordneten sich ständig um.
  const dt = letzteT == null ? 0 : Math.max(0, Math.min(0.1, t - letzteT));
  letzteT = t;
  const n = S.tresenPlaetze();
  const breite = 180 / n;
  const blasen = [];
  const vorneX = [];
  for (let i = 0; i < n; i++) vorneX.push(S.platzX(i, n));
  const basisVorne = y0 + C.T_GAST, basisHinten = y0 + C.T_GAST - REIHE_HOEHER;

  // Wer steht vorne (am Tresen oder gleich da), wer in der Reihe?
  // Wer schon als Schatten in der Reihe stand, geht direkt nach vorn;
  // alle anderen erst, wenn sie draußen fast am Stand sind.
  const vorne = new Set();
  const wartend = [];
  for (const g of S.lauf.gaeste) {
    if (g.gehen) continue;
    if (g.platz != null) {
      if (g.am || ansicht.has(g.id) || schatten.has(g.id) || Math.abs(g.x - S.TRESEN_X[g.platz]) <= 26) vorne.add(g.id);
    } else if (!g.laeuft) wartend.push(g);   // steht draußen in der Schlange
  }
  for (const g of S.lauf.gaeste) {
    if (!vorne.has(g.id)) continue;
    let a = ansicht.get(g.id);
    if (!a) { a = neuerEintrag(g, vorneX[g.platz], basisHinten); ansicht.set(g.id, a); }
    Object.assign(a, { zx: vorneX[g.platz], zb: basisVorne, zs: 1, weg: 0 });
  }
  // Die Schattenreihe erscheint erst, wenn vorne ALLE Plätze besetzt sind
  // und dort jeder steht - nicht schon, während Leute hereinkommen. Wer
  // einmal als Schatten zu sehen ist, bleibt, bis er dran ist.
  const vorneVoll = [...ansicht.values()].filter((a) => vorne.has(a.g.id) && !a.laeuft && a.g.am).length >= n;
  const lx = reiheX(n);
  const reihe = wartend.filter((g) => vorneVoll || schatten.has(g.id)).slice(0, Math.min(REIHE_MAX, lx.length));
  reihe.forEach((g, k) => {
    let sh = schatten.get(g.id);
    if (!sh) { sh = { g, x: lx[k], alpha: 0, weg: false }; schatten.set(g.id, sh); }
    sh.zx = lx[k];   // rückt auf, wenn vorne jemand wegfällt
  });
  const inReihe = new Set(reihe.map((g) => g.id));
  for (const [id, sh] of schatten) {
    if (inReihe.has(id)) sh.alpha = Math.min(1, sh.alpha + dt / 0.35);
    else { sh.alpha -= dt / 0.4; if (sh.alpha <= 0) schatten.delete(id); }
    const d = sh.zx - sh.x, st = 40 * dt;
    sh.x = Math.abs(d) <= st ? sh.zx : sh.x + Math.sign(d) * st;
  }
  for (const sh of schatten.values()) figurSkaliert(c, sh.g, sh.x, basisHinten, REIHE_GROESSE, t, 'normal', Math.max(0, sh.alpha), w);
  const zuSehen = vorne;
  // Wer nicht mehr dran ist, geht nach hinten weg und blendet aus
  for (const [id, a] of ansicht) {
    if (zuSehen.has(id)) { a.alpha = Math.min(1, a.alpha + dt / 0.35); continue; }
    if (!a.weg) Object.assign(a, { weg: 1, zx: a.x + 6, zb: basisHinten - 4, zs: WEG_GROESSE });
    a.alpha -= dt / 0.7;
    if (a.alpha <= 0) ansicht.delete(id);
  }

  // Bewegen: x, Fußlinie und Größe gemeinsam, damit es wie Näherkommen
  // bzw. Weggehen aussieht (Größe zählt wie Weg: 0,1 Größe = 6 px)
  for (const a of ansicht.values()) {
    const dx = a.zx - a.x, db = a.zb - a.b, ds = a.zs - a.s;
    const rest = Math.max(Math.abs(dx), Math.abs(db) * 3, Math.abs(ds) * 60);
    const schritt = (a.weg ? 45 : 85) * dt;
    a.laeuft = rest > schritt;
    const k = a.laeuft ? schritt / rest : 1;
    a.x += dx * k; a.s += ds * k; a.b += db * k;
  }
  // Hinten zuerst zeichnen, vorne zuletzt
  const reihenfolge = [...ansicht.values()].sort((p1, p2) => p1.s - p2.s || (p1.weg ? -1 : 0));
  for (const a of reihenfolge) {
    const g = a.g;
    let cx = a.x;
    const wk = S.lauf.wackel['g' + g.id];
    if (wk) cx += Math.round(Math.sin(wk * 60) * 2);
    const anteil = g.geduld / g.geduldMax;
    const laune = g.bedient || (a.weg && g.froh) ? 'froh' : (a.weg || (vorne.has(g.id) && anteil < 0.3)) ? 'sauer' : 'normal';
    let huepf = a.laeuft ? Math.round(Math.abs(Math.sin(t * 12 + g.phase)) * 2 * a.s) : 0;
    // Gerade von DIR bedient: Freudensprung mit warmem Schein und Funken
    const jubel = g.jubelT > 0 ? g.jubelT / C.JUBEL_ZEIT : 0;
    if (jubel > 0) {
      huepf += Math.round(Math.sin(jubel * Math.PI) * 4);
      c.save(); c.globalCompositeOperation = 'lighter';
      const gl = c.createRadialGradient(cx - 4, a.b - 16, 0, cx - 4, a.b - 16, 26);
      gl.addColorStop(0, `rgba(255,220,120,${(0.55 * jubel).toFixed(2)})`); gl.addColorStop(1, 'rgba(255,220,120,0)');
      c.fillStyle = gl; c.fillRect(cx - 30, y0, 52, C.T_GAST);
      c.restore();
    }
    const alpha = Math.max(0, Math.min(1, a.alpha));
    if (a.s > 0.985) {
      c.save(); c.globalAlpha = alpha;
      figurGross(c, g, cx - 4, Math.round(a.b) - huepf, t, laune);
      c.restore();
    } else figurSkaliert(c, g, cx - 4, Math.round(a.b) - huepf, a.s, t, laune, alpha, w);
    if (jubel > 0) for (let k = 0; k < 6; k++) {
      const wi = k / 6 * Math.PI * 2 + t * 3.6, d2 = 10 + (1 - jubel) * 12;
      const f = k % 2 ? '#fff6c8' : '#ffd040';
      const sx = cx - 4 + Math.cos(wi) * d2, sy = a.b - 20 + Math.sin(wi) * d2 * 0.8;
      p(c, sx, sy, f); p(c, sx - 1, sy, f); p(c, sx + 1, sy, f); p(c, sx, sy - 1, f); p(c, sx, sy + 1, f);
    }
    if (!a.weg && !a.laeuft && vorne.has(g.id) && g.am) blasen.push([g, cx + 8, y0 + 17, anteil]);
  }
  // Servier-Wichtel beim Bedienen
  for (const e of S.lauf.elfen) {
    const cx = S.platzX(e.platz, n) - 20;
    const hoch = Math.round(Math.sin(Math.min(1, e.t / 0.6) * Math.PI) * 14);
    wichtelGross(c, cx, y0 + C.T_GAST + 14 - hoch, t);
  }

  // Markise von innen (unter dem Balken)
  const m0 = y0 + BALKEN;
  for (let x = 0; x < 180; x++) {
    const f = Math.floor(x / 8) % 2 ? '#f4f0e8' : '#c83030';
    r(c, x, m0, 1, 5, f);
    if (x % 8 < 5) p(c, x, m0 + 5, f);
  }
  if (S.zeigt('girlande')) for (let x = 0; x < 180; x++) {
    p(c, x, m0 + 6 + (Math.sin(x * 0.5) > 0 ? 1 : 0), '#2f6a2a');
    p(c, x, m0 + 7 + (Math.sin(x * 0.5) > 0 ? 1 : 0), '#245224');
    if (x % 9 === 0) r(c, x, m0 + 8, 2, 2, '#d83a3a');
  }
  const sls = S.stufe('standlicht');
  if (S.zeigt('standlicht')) for (let x = 4, i = 0; x < 180; x += (sls >= 2 ? 5 : 9), i++) {
    const f = S.bunt('stand') ? BUNT[i % BUNT.length] : '#ffd98a';
    const an = sls >= 3 ? 0.25 + 0.75 * ((Math.sin(t * 5 - i * 0.45) + 1) / 2) ** 2 : 1;   // ruhig bis zur letzten Stufe
    p(c, x, m0 + 10, '#3a3a2a'); r(c, x, m0 + 11, 1, 2, f);
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.25 * an;
    c.fillStyle = f; c.fillRect(x - 1, m0 + 10, 3, 4); c.restore();
  }
  // Pfosten
  for (const px of [0, 176]) {
    r(c, px, y0, 4, 52, '#7a5230'); r(c, px + (px ? 0 : 3), y0, 1, 52, '#5a3a20');
  }
  balken(c, y0);
  // Wunschbläschen zuletzt: Sie dürfen von nichts verdeckt werden
  for (const [g, x, y, anteil] of blasen) blase(c, g, x, y, t, anteil);
  // Servier-Wichtel: über dem Gast, der als Nächstes dran ist, ein kleiner
  // Wichtel mit grünem Balken - so lange braucht er noch (gemeldet 01.10.)
  const sv = S.servierVorschau();
  if (sv) for (const [g, x, y] of blasen) {
    if (g.id !== sv.id || g.bedient) continue;
    wichtelKlein(c, x - 3, y + 2, t);
    r(c, x + 1, y - 4, 14, 2, '#2a1a10'); r(c, x + 1, y - 4, Math.max(1, Math.round(14 * sv.anteil)), 2, '#6ad06a');
  }
  if (S.zeigt('musik')) {
    const n2 = (t * 0.7) % 1;
    const nx = 170 - n2 * 12, ny = y0 + 44 - n2 * 30;
    r(c, nx, ny, 1, 4, '#ffffff'); r(c, nx - 2, ny + 3, 2, 2, '#ffffff'); p(c, nx + 1, ny, '#ffffff');
  }
}

// Der Balken trennt die Welt oben von der Sicht aus dem Stand unten.
// Das Schild sagt, WAS man da unten sieht - beim ersten Spielen war das
// nicht zu erkennen.
const BALKEN = 6;
function balken(c, y0) {
  r(c, 0, y0, 180, 1, '#1a0e06');
  r(c, 0, y0 + 1, 180, BALKEN - 1, '#7a4a26');
  r(c, 0, y0 + 1, 180, 1, '#a8703a');
  for (let x = 7; x < 180; x += 23) r(c, x, y0 + 2, 6, 1, '#6a3e1e');
  r(c, 0, y0 + BALKEN, 180, 1, '#3a2010');
  const txt = schildText();
  const { sx, sb } = schildMasse(txt);
  r(c, sx - 1, y0 - 4, sb + 2, 12, '#3a2010');
  r(c, sx, y0 - 3, sb, 10, '#9a2a22');
  r(c, sx, y0 - 3, sb, 1, '#c84a3a');
  p(c, sx + 2, y0 - 1, '#e8c030'); p(c, sx + sb - 3, y0 - 1, '#e8c030');
  text(c, txt, sx + 5, y0 - 1, '#fff2d0', '#5a1610');
  schwungAnzeige(c, y0, sx + sb + 6);
  chefAnzeige(c, y0, sx - 6);
}

/**
 * Chef am Stand: Solange du tippst, arbeiten die Wichtel schneller. Die
 * Tafel links neben dem Schild zeigt es (Gegenstück zum Schwung rechts);
 * der Balken darunter ist die Zeit, bis sie dich vermissen.
 */
function chefAnzeige(c, y0, rechts) {
  if (!S.hatWichtel() || !S.chefAktiv()) return;
  const s = 'x' + String(C.CHEF_TEMPO).replace('.', ',');
  const b = textBreite(s) + 14, x = rechts - b, y = y0 - 4;
  r(c, x - 1, y - 1, b + 2, 14, '#3a2010');
  r(c, x, y, b, 12, '#1f4a2a');
  r(c, x, y, b, 1, '#3a6a44');
  // Wichtelmütze
  r(c, x + 2, y + 7, 5, 2, '#d83a3a'); r(c, x + 3, y + 5, 3, 2, '#d83a3a'); p(c, x + 5, y + 4, '#d83a3a'); p(c, x + 6, y + 3, '#ffffff');
  r(c, x + 2, y + 9, 5, 1, '#ffffff');
  text(c, s, x + 9, y + 3, '#c8ffb0', '#0e2412');
  r(c, x + 1, y + 10, Math.round((b - 2) * (1 - S.lauf.chefT / C.CHEF_ZEIT)), 1, '#7ad05a');
}

/** Was auf dem Schild steht: selbst gewählt (antippen) oder „DEIN STAND". */
export const schildText = () => S.st.standName || 'DEIN STAND';
function schildMasse(txt) {
  const tw = textBreite(txt);
  return { sx: Math.round(90 - tw / 2) - 5, sb: tw + 10 };
}
/** Trifft ein Tipp (x, y) das Schild? y0 = Oberkante der Tresenansicht. */
export function trifftSchild(x, y, y0) {
  const { sx, sb } = schildMasse(schildText());
  return x >= sx - 3 && x <= sx + sb + 3 && y >= y0 - 6 && y <= y0 + 10;
}

/** Schwung: kleine Tafel rechts neben dem Schild, gut sichtbar über dem Stand. */
function schwungAnzeige(c, y0, x) {
  const sw = S.lauf.schwung;
  if (!(sw > 0)) return;
  const t = S.lauf.t;
  const m = 1 + sw * C.SCHWUNG_PRO;
  const s = 'x' + m.toFixed(2).replace('.', ',');
  const voll = sw >= C.SCHWUNG_MAX;
  const b = textBreite(s) + 14, y = y0 - 4;
  r(c, x - 1, y - 1, b + 2, 14, voll ? '#e8b030' : '#3a2010');          // Rahmen
  r(c, x, y, b, 12, '#2a1a3a');                                          // Grund
  r(c, x, y, b, 1, '#4a3a5a');
  const fl = Math.floor(t * 8) % 2;
  r(c, x + 3, y + 4, 3, 5, '#ff8a20'); p(c, x + 4, y + 2 + fl, '#ffd040'); p(c, x + 4, y + 3, '#ffd040'); r(c, x + 3, y + 8, 3, 1, '#e84a1a');
  text(c, s, x + 9, y + 3, voll ? '#ffe060' : '#ffffff', '#1a0e06');
  r(c, x + 1, y + 10, Math.round((b - 2) * S.lauf.schwungT / C.SCHWUNG_FENSTER), 1, '#ffd040');
}

// Wo jeder Gast in der Tresenansicht gerade steht:
// id → { g, x, b (Fußlinie), s (Größe), zx/zb/zs (Ziel), alpha, weg, laeuft }
const ansicht = new Map();
let letzteT = null;
// Die Reihe der Wartenden hinten links
// Die Wartenden: eigene Einträge, damit ihr Schatten ausblenden kann,
// während dieselbe Person vorne schon aus der Tiefe kommt
const schatten = new Map();   // id → { g, x, zx, alpha }
// Links hinten, kleiner und höher als vorne (weiter weg), damit die Köpfe
// auch hinter dem Gast am linken Platz zu sehen sind. Index 0 ist der Nächste.
// Bis fast zur mittleren Person; der Nächste steht ganz rechts in der Reihe.
const REIHE_MAX = 5, REIHE_GROESSE = 0.5, REIHE_HOEHER = 17, WEG_GROESSE = 0.45;
// Bei zwei Plätzen steht der linke Gast weiter innen (x 62) - die Reihe
// rückt dann links an ihn heran und hat nur Platz für vier.
const reiheX = (n) => n === 2 ? [40, 29, 18, 7] : [66, 54, 42, 30, 18];
/** Neu in der Ansicht: taucht klein hinten an seinem Platz auf. */
function neuerEintrag(g, x, basisHinten) {
  return { g, x, b: basisHinten, s: REIHE_GROESSE, alpha: 0, weg: 0, laeuft: false };
}

/**
 * Gast verkleinert (weiter hinten): einmal in voller Größe auf eine kleine
 * Leinwand, dann pixelig verkleinert - hinten als einfarbiger Schatten.
 */
const _fig = document.createElement('canvas'); _fig.width = 44; _fig.height = 46;
const _fc = _fig.getContext('2d');
function figurSkaliert(c, g, cx, basis, s, t, laune, alpha, w) {
  _fc.globalCompositeOperation = 'source-over';
  _fc.clearRect(0, 0, 44, 46);
  figurGross(_fc, g, 22, 46, t, laune);
  // Hinten ein einfarbiger Schatten (Silhouette), der beim Näherkommen
  // zur echten Figur wird - sonst ist hinten zu viel los
  const tiefe = Math.min(1, (1 - s) / (1 - REIHE_GROESSE));   // 0 vorne … 1 ganz hinten
  _fc.globalCompositeOperation = 'source-atop';
  _fc.globalAlpha = tiefe;
  _fc.fillStyle = mische('#8a94b8', '#5c6690', 1 - w.li.hell);   // hell genug, um sie zu sehen
  _fc.fillRect(0, 0, 44, 46);
  _fc.globalAlpha = 1;
  const bw = Math.round(44 * s), bh = Math.round(46 * s);
  c.save();
  c.imageSmoothingEnabled = false;
  c.globalAlpha = alpha;
  c.drawImage(_fig, Math.round(cx - 22 * s), Math.round(basis - bh), bw, bh);
  c.restore();
}

function blase(c, g, x, y, t, anteil) {
  if (g.gross) return grossBlase(c, g, x, y, t, anteil);
  const spez = C.GAESTE[g.typ].spezial;
  const rand = spez ? '#e8b030' : g.eilig ? '#e8742a' : '#6a4a3a';
  r(c, x + 1, y, 14, 16, rand); r(c, x, y + 1, 16, 14, rand);
  r(c, x + 1, y + 1, 14, 14, '#fffaf0');
  r(c, x - 1, y + 13, 3, 2, rand); p(c, x - 2, y + 15, rand); p(c, x, y + 13, '#fffaf0'); p(c, x + 1, y + 13, '#fffaf0');
  if (g.bedient) {
    smiley(c, x + 8, y + 8, true);
    return;
  }
  icon(c, g.wunsch, x + 3, y + 3, t);
  if (g.eilig) {   // kleine Uhr oben rechts: „ich hab's eilig"
    r(c, x + 11, y - 3, 7, 7, '#e8742a'); r(c, x + 12, y - 2, 5, 5, '#fff4e0');
    p(c, x + 14, y - 1, '#3a2410'); p(c, x + 14, y, '#3a2410'); p(c, x + 15, y, '#3a2410');
  }
  // Geduld
  const bw = 16;
  r(c, x, y + 17, bw, 3, '#3a2a20');
  const f = anteil > 0.55 ? '#5ac85a' : anteil > 0.28 ? '#f0c040' : '#f04a3a';
  if (anteil < 0.28 && Math.floor(t * 6) % 2) return;
  r(c, x + 1, y + 18, Math.max(0, Math.round((bw - 2) * anteil)), 1, f);
}

/** Großbestellung: breite goldene Blase mit Sorte und Zähler „3/8". */
function grossBlase(c, g, x, y, t, anteil) {
  const gr = g.gross;
  const s = gr.stand + '/' + gr.n;
  const bw = 18 + textBreite(s);
  x = Math.min(x, 178 - bw);
  const rand = '#e8b030';
  r(c, x + 1, y, bw - 2, 16, rand); r(c, x, y + 1, bw, 14, rand);
  r(c, x + 1, y + 1, bw - 2, 14, '#fff6d8');
  r(c, x + 2, y + 13, 3, 2, rand); p(c, x + 3, y + 15, rand);
  if (g.bedient) { smiley(c, x + bw / 2, y + 8, true); return; }
  icon(c, gr.id, x + 3, y + 3, t);
  text(c, s, x + 14, y + 6, '#7a4a10', null);
  r(c, x, y + 17, bw, 3, '#3a2a20');
  const f = anteil > 0.55 ? '#5ac85a' : anteil > 0.28 ? '#f0c040' : '#f04a3a';
  if (anteil < 0.28 && Math.floor(t * 6) % 2) return;
  r(c, x + 1, y + 18, Math.max(0, Math.round((bw - 2) * anteil)), 1, f);
}

// ---------------------------------------------------------------------------
const HAND_B = 20;

// Dinge in der Hand werden DOPPELT so groß gezeigt - gezeichnet im
// kleinen Maßstab und dann pixelgenau hochgezogen.
const _klein = document.createElement('canvas'); _klein.width = 10; _klein.height = 10;
const _kc = _klein.getContext('2d');
function gross(c, x, y, zeichne, faktor = 2, n = 10) {
  _kc.clearRect(0, 0, 10, 10); zeichne(_kc);
  c.imageSmoothingEnabled = false;
  c.drawImage(_klein, 0, 0, n, n, x, y, n * faktor, n * faktor);
}
const PLATZ = 26;   // Abstand der Dinge auf dem Servierbrett
function handStart() { const n = S.handMax(); return Math.round(90 - (n * PLATZ) / 2); }

function brett(c, y, t) {
  r(c, 0, y, 180, C.T_BRETT, '#a8703a');
  r(c, 0, y, 180, 2, '#c8905a');
  for (let x = 0; x < 180; x += 30) r(c, x, y + 2, 1, C.T_BRETT - 2, '#8a5a2e');
  r(c, 0, y + C.T_BRETT - 1, 180, 1, '#6a4222');

  // Gläserstapel
  const gx = 4, gy = y + 4;
  r(c, gx - 1, gy + 12, 28, 3, '#6a4222');
  for (let i = 0; i < 3; i++) glas(c, gx + i * 9, gy + 3);
  glas(c, gx + 4, gy - 3); glas(c, gx + 13, gy - 3);
  if (S.hat('spuel')) {
    wichtelKlein(c, gx + 30, y + 17, t);
    // Wie lange, bis das nächste saubere Glas aufs Tablett kommt
    if (S.lauf.spuelT > 0) { r(c, gx, y + 19, 26, 1, '#6a4222'); r(c, gx, y + 19, Math.round(26 * S.lauf.spuelT / C.SPUEL_ZEIT), 1, '#9ad8ff'); }
  }

  // Hand
  const n = S.handMax();
  let hx = handStart();
  const wk = S.lauf.wackel.hand;
  if (wk) hx += Math.round(Math.sin(wk * 60) * 2);
  // Das Servierbrett: breit, mit Rand und Griffen; darauf stehen die
  // Dinge doppelt groß und ragen über die Tresenkante nach oben.
  const bx = hx - 6, bb = n * PLATZ + 12, by = y + 15;
  r(c, bx - 3, by + 1, 3, 3, '#8a8a96'); r(c, bx + bb, by + 1, 3, 3, '#8a8a96');     // Griffe
  r(c, bx, by, bb, 5, '#c8c8d2'); r(c, bx, by, bb, 1, '#f0f0f6'); r(c, bx, by + 4, bb, 1, '#8a8a96');
  r(c, bx + 1, by + 5, bb - 2, 1, 'rgba(0,0,0,0.25)');
  for (let i = 0; i < n; i++) {
    const x = hx + i * PLATZ + 3;
    const h = S.lauf.hand[i];
    if (!h) { r(c, x + 5, by + 1, 10, 2, '#b0b0bc'); continue; }   // freier Platz
    const hoch = S.lauf.neuInHand === i && S.lauf.neuInHandT > 0 ? 2 : 0;
    if (h.art === 'glas') gross(c, x, by - 17 - hoch, (k) => glas(k, 0, 1));
    else if (h.rest > 0) {
      // In Zubereitung: ein Glas, das sich von unten füllt, und ein Balken
      const a = Math.max(0, Math.min(1, 1 - h.rest / (h.dauer || 1)));
      gross(c, x, by - 17, (k) => glas(k, 0, 1));
      const f = C.PRODUKT[h.id].farbe, hFl = Math.round(12 * a);
      r(c, x + 3, by - 3 - hFl, 11, hFl, f);
      // Vom Servier-Wichtel bestellt: er steht daneben und gießt ein
      if (h.vonWichtel) { wichtelKlein(c, x + 1, by, t); p(c, x + 3, by - 13 + (Math.floor(t * 8) % 2), f); }
      r(c, x + 1, by - 22, 18, 2, '#3a2a20'); r(c, x + 1, by - 22, Math.round(18 * a), 2, '#ffd040');
      if (h.id === 'feuerzange') { const fl = Math.floor(t * 9) % 2; p(c, x + 8 + fl, by - 20, '#6ab0ff'); p(c, x + 9, by - 19, '#ff8a20'); }
      else if (Math.floor(t * 4) % 2) p(c, x + 9, by - 19, '#eef2f6');
    }
    else {
      // Offene Handgriffe: nur die erledigten zeichnen (Liste), fertig = alles
      // Verpasst (Timing): wie „roh" zeichnen - Zuckerhut aus, Beutel noch drin
      const roh = h.verpasst ? true : h.griffe && !h.extraFertig ? h.griffe.slice(0, h.schritt) : false;
      gross(c, x, by - 19 - hoch, (k) => icon(k, h.id, 0, 0, t, roh));
      if (h.brennT > 0) {
        // Der Zuckerhut brennt: große, flackernde Flamme
        const fl = Math.floor(t * 12) % 2;
        r(c, x + 6, by - 22, 4, 3, '#ff8a20'); r(c, x + 7 - fl, by - 25, 2, 3, '#ffd040');
        p(c, x + 7 + fl, by - 26, '#6ab0ff'); p(c, x + 5 + fl * 4, by - 21, '#ffd040');
      } else if (h.extra) {
        extraHinweis(c, x + 13, by - 30, h.extra, t, C.HANDGRIFF[h.extra].n - h.tipps);
        if (h.extra === 'beutel') { const tm = C.HANDGRIFF.beutel.timing; zeitBalken(c, x + 1, by - 23, 18, h.ziehT / tm.dauer, tm); }
      }
      // Vom Wichtel eingeschenkt und fertig: er steht daneben und wartet; der
      // hellblaue Balken zeigt, wann er selbst serviert
      if (h.vonWichtel && h.fuer != null) {
        wichtelKlein(c, x + 1, by, t);
        if (!(h.flammeT > 0) && h.extra !== 'beutel') {
          const a = Math.max(0, 1 - (h.wartetT || 0) / C.WICHTEL_WARTEN);
          r(c, x + 1, by - 23, 18, 2, '#2a3a64'); r(c, x + 1, by - 23, Math.max(1, Math.round(18 * a)), 2, '#7ab8ff');
        }
      }
      // Feuerzauber brennt: Balken schrumpft - so lange gibt es den Bonus
      if (h.flammeT > 0) {
        const a = h.flammeT / C.FEUER_FENSTER;
        r(c, x + 1, by - 23, 18, 2, '#3a2a20'); r(c, x + 1, by - 23, Math.max(1, Math.round(18 * a)), 2, a > 0.3 ? '#ff8a20' : '#f04a3a');
      }
    }
  }

  // Ausguss
  const ax = 156;
  r(c, ax, y + 5, 18, 14, '#6a6a72'); r(c, ax + 1, y + 6, 16, 3, '#3a3a44'); r(c, ax - 1, y + 4, 20, 2, '#8a8a92');
  r(c, ax + 2, y + 10, 14, 1, '#7a7a82'); r(c, ax + 2, y + 14, 14, 1, '#7a7a82');
  if (S.lauf.hand.length) { p(c, ax + 8, y + 1, '#9ab8d8'); p(c, ax + 9, y + 2, '#9ab8d8'); }
}

/**
 * Zeitbalken für Timing-Handgriffe: dunkler Grund, grüne Zone, weißer Strich
 * für „jetzt". `a` = Anteil 0..1, `tm` = { von, bis }.
 */
function zeitBalken(c, x, y, b, a, tm) {
  r(c, x, y, b, 3, '#3a2a20');
  r(c, x + Math.round(b * tm.von), y, Math.round(b * (tm.bis - tm.von)), 3, '#4ac05a');
  const m = x + Math.min(b - 1, Math.round(b * a));
  r(c, m, y - 1, 1, 5, '#ffffff');
}

/**
 * Kleine Blase über einem Glas: der nächste Handgriff als Bildchen, bei
 * mehreren Tipps (Umrühren, Milchschaum) rechts daneben, wie oft noch.
 */
function extraHinweis(c, x, y, extra, t, noch = 1) {
  const hoch = Math.floor(t * 3) % 2;
  y -= hoch;
  r(c, x + 1, y, 8, 9, '#e8b030'); r(c, x, y + 1, 10, 7, '#e8b030');
  r(c, x + 1, y + 1, 8, 7, '#fffaf0');
  p(c, x + 2, y + 9, '#e8b030');
  if (extra === 'sahne') { r(c, x + 3, y + 4, 4, 2, '#f4ecdc'); r(c, x + 4, y + 3, 2, 1, '#f4ecdc'); r(c, x + 3, y + 5, 4, 1, '#d8ccb8'); }
  else if (extra === 'zimt') { p(c, x + 3, y + 6, '#8a4a1e'); p(c, x + 4, y + 5, '#8a4a1e'); p(c, x + 5, y + 4, '#a8602a'); p(c, x + 6, y + 3, '#a8602a'); }
  else if (extra === 'zuckerstange') {   // rot-rosa gestreift, weiß ginge auf der hellen Blase unter
    for (let k = 0; k < 5; k++) p(c, x + 5, y + 2 + k, k % 2 ? '#f09aa0' : '#d83a3a');
    p(c, x + 4, y + 1, '#d83a3a'); p(c, x + 3, y + 2, '#f09aa0'); p(c, x + 3, y + 3, '#d83a3a');
  }
  else if (extra === 'ruehren') {   // Löffel mit Wirbel
    p(c, x + 6, y + 2, '#b8bcc6'); p(c, x + 5, y + 3, '#b8bcc6'); r(c, x + 3, y + 5, 4, 1, '#e8942e'); p(c, x + 2, y + 6, '#e8942e'); p(c, x + 7, y + 4, '#e8942e'); p(c, x + 4, y + 4, '#b8bcc6');
  }
  else if (extra === 'guss') {   // Lebkuchen mit weißem Guss, der herunterläuft
    r(c, x + 2, y + 3, 6, 4, '#9a5a2a'); r(c, x + 2, y + 3, 6, 1, '#ffffff'); p(c, x + 3, y + 4, '#ffffff'); p(c, x + 6, y + 4, '#ffffff'); p(c, x + 6, y + 5, '#ffffff');
  }
  else if (extra === 'zimtpulver') { p(c, x + 3, y + 3, '#a8602a'); p(c, x + 6, y + 4, '#8a4a1e'); p(c, x + 4, y + 5, '#a8602a'); p(c, x + 5, y + 3, '#8a4a1e'); p(c, x + 3, y + 6, '#8a4a1e'); }
  else if (extra === 'beutel') {   // Teebeutel am Faden
    p(c, x + 5, y + 2, '#8a6a4a'); p(c, x + 5, y + 3, '#8a6a4a'); r(c, x + 3, y + 4, 4, 3, '#e8d8a8'); r(c, x + 4, y + 5, 2, 1, '#3f7a3a');
  }
  else if (extra === 'schaum') {   // Tassenrand mit Schaumhaube, grau umrandet
    r(c, x + 2, y + 5, 6, 2, '#c8a870'); r(c, x + 3, y + 3, 4, 2, '#ffffff'); p(c, x + 4, y + 2, '#ffffff');
    p(c, x + 2, y + 4, '#a89a88'); p(c, x + 7, y + 4, '#a89a88'); p(c, x + 3, y + 2, '#a89a88'); p(c, x + 5, y + 2, '#a89a88');
  }
  else { r(c, x + 4, y + 3, 2, 1, '#ffffff'); r(c, x + 3, y + 4, 4, 2, '#f4f4f4'); r(c, x + 3, y + 6, 4, 1, '#d8d8d8'); p(c, x + 5, y + 2, '#ff8a20'); }
  // Mehrere Tipps: kleine Zahl in einem roten Punkt rechts oben
  if (noch > 1) { r(c, x + 7, y - 2, 5, 5, '#c83a2e'); text(c, String(noch), x + 8, y - 1, '#ffffff'); }
}

/** Produktsymbol als einfarbiger Schattenriss (11 x 11), einmal gerechnet. */
const risse = {};
function schattenriss(id) {
  if (risse[id]) return risse[id];
  const cv = document.createElement('canvas');
  cv.width = 11; cv.height = 11;
  const k = cv.getContext('2d');
  icon(k, id, 1, 1, 0, true);   // „roh": ohne Sahne und Zimt, die sind Handarbeit
  // Dampf über den Tassen gehört nicht zur Form - nur Apfel (Blatt) und Feuerzange (Zange) behalten ihren Kopf
  if (C.PRODUKT[id].art === 'topf' && id !== 'apfel' && id !== 'feuerzange') k.clearRect(0, 0, 11, 4);
  k.globalCompositeOperation = 'source-in';
  k.fillStyle = '#23150b';
  k.fillRect(0, 0, 11, 11);
  return (risse[id] = cv);
}

function glas(c, x, y) {
  r(c, x, y, 7, 8, '#e8e4dc'); r(c, x, y, 1, 8, '#c4bfb4'); r(c, x + 1, y + 7, 6, 1, '#b8b2a6');
  r(c, x + 7, y + 2, 2, 1, '#e8e4dc'); r(c, x + 8, y + 3, 1, 2, '#e8e4dc'); r(c, x + 7, y + 5, 2, 1, '#e8e4dc');
  r(c, x + 1, y, 6, 1, '#fffcf6');
}

// ---------------------------------------------------------------------------
function regal(c, y, t) {
  r(c, 0, y, 180, C.T_ZELLE_H * 2, '#4a2e18');
  for (let i = 0; i < 10; i++) {
    const sx = (i % 5) * C.T_ZELLE_B, sy = y + Math.floor(i / 5) * C.T_ZELLE_H;
    zelle(c, i, sx, sy, t);
  }
  r(c, 0, y + C.T_ZELLE_H - 1, 180, 2, '#6a4222');
  r(c, 0, y + C.T_ZELLE_H * 2 - 2, 180, 2, '#6a4222');
}

function zelle(c, i, x, y, t) {
  const p0 = C.PRODUKTE[i];
  const W = C.T_ZELLE_B, H = C.T_ZELLE_H;
  r(c, x + 1, y + 1, W - 2, H - 3, '#5a3a22');
  if (!S.hat(p0.id)) {
    // Gesperrt: Schattenriss des Getränks bzw. Essens, doppelt groß
    // (vorher ein Schloss - so sieht man, was hier einmal steht)
    r(c, x + 1, y + 1, W - 2, H - 3, '#3a2616');
    const wz = S.lauf.wackel['z' + p0.id];   // angetippt: der Schattenriss wackelt
    const sx = x + W / 2 - 10 + (wz ? Math.round(Math.sin(wz * 60) * 2) : 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(schattenriss(p0.id), sx, y + 3, 22, 22);
    if (S.freiErfuellt(p0.id) && S.st.geld >= p0.kosten) { // Man KÖNNTE es kaufen: kleines Funkeln
      if (Math.floor(t * 2) % 2) p(c, x + W - 5, y + 4, '#ffe060');
      p(c, x + W - 6, y + 5, '#ffe060');
    }
    return;
  }
  const wk = S.lauf.wackel['z' + p0.id];
  const dx = wk ? Math.round(Math.sin(wk * 60) * 2) : 0;
  const cx = x + W / 2 + dx;
  const max = S.topfMax();
  const rest = S.st.toepfe[p0.id] || 0;

  if (p0.art === 'topf') {
    // Topf mit Etikett
    const tx = cx - 12, ty = y + 5;
    r(c, tx, ty, 24, 16, '#5a5a64'); r(c, tx, ty, 2, 16, '#46464e'); r(c, tx + 22, ty, 2, 16, '#6e6e7a');
    r(c, tx - 2, ty + 3, 2, 3, '#46464e'); r(c, tx + 24, ty + 3, 2, 3, '#46464e');
    r(c, tx - 1, ty - 1, 26, 2, '#7a7a86');
    if (rest > 0) r(c, tx + 1, ty, 22, 1, p0.farbe);
    r(c, cx - 6, ty + 4, 12, 11, '#f0e6d0');
    icon(c, p0.id, cx - 5, ty + 5, t);
    if (rest > 0 && p0.id !== 'feuerzange') {
      const s = Math.floor(t * 2 + i) % 2;
      p(c, cx - 4 + s, ty - 3, '#eef2f6'); p(c, cx + 3 - s, ty - 4, '#eef2f6');
    }
    if (p0.id === 'feuerzange' && rest > 0) {
      const fl = Math.floor(t * 9) % 2;
      r(c, cx - 3, ty - 2, 6, 1, '#e8e8e8'); p(c, cx - 1 + fl, ty - 4, '#6ab0ff'); p(c, cx, ty - 3, '#ffd040'); p(c, cx + 1 - fl, ty - 4, '#ff8a20');
    }
  } else if (p0.art === 'dose') {
    const tx = cx - 9, ty = y + 4;
    r(c, tx, ty, 18, 17, '#c8d8e0'); r(c, tx, ty, 1, 17, '#a8bcc8'); r(c, tx - 1, ty - 1, 20, 2, '#d83a3a');
    const zeigen = Math.min(4, Math.ceil(rest / max * 4));
    for (let k = 0; k < zeigen; k++) icon(c, 'lebkuchen', tx + 1 + (k % 2) * 8, ty + 9 - Math.floor(k / 2) * 6, t);
  } else {
    // Crêpe-Platte
    const tx = cx - 13, ty = y + 12;
    r(c, tx, ty, 26, 8, '#3a3a40'); r(c, tx + 2, ty - 3, 22, 4, '#1e1e22'); r(c, tx + 3, ty - 4, 20, 1, '#2a2a30');
    const cr = S.lauf.crepe;
    if (cr.backT >= 0) {
      const a = cr.backT / C.CREPE_ZEIT;
      // Gewendet: die helle Seite liegt oben, sonst bräunt er gleichmäßig
      r(c, tx + 5, ty - 4, 16, 2, cr.gewendet ? mische('#f4e4b0', '#e8b868', a * 0.6) : mische('#f4e4b0', '#e0a850', a));
      if (cr.gewendet) { p(c, tx + 8, ty - 4, '#c8883a'); p(c, tx + 14, ty - 3, '#c8883a'); }
      // Handgriff „Wenden": Balken mit grüner Zone, solange noch nicht gewendet
      if (!cr.gewendet && !cr.verpasst) zeitBalken(c, tx + 2, ty + 3, 22, a, C.HANDGRIFF.wenden.timing);
      else r(c, tx + 2, ty + 5, Math.round(22 * a), 1, cr.gewendet ? '#4ac05a' : '#ffd040');
      if (Math.floor(t * 8) % 2) p(c, tx + 8, ty - 7, '#eef2f6');
    } else if (cr.fertig) {
      icon(c, 'crepe', cx - 5, ty - 12, t);
      if (Math.floor(t * 3) % 2) p(c, cx + 6, ty - 12, '#ffe060');
    } else {
      p(c, cx, ty - 7, '#ffffff'); r(c, cx - 1, ty - 8, 3, 1, '#ffffff'); p(c, cx, ty - 9, '#ffffff'); // Plus: antippen zum Backen
    }
    r(c, tx + 20, ty + 2, 3, 3, cr.backT >= 0 ? '#f04a3a' : '#5a5a60');
    return;
  }

  // Füllstand
  const bw = W - 8;
  r(c, x + 4, y + H - 5, bw, 2, '#2a1a10');
  if (rest > 0) r(c, x + 4, y + H - 5, Math.max(1, Math.round(bw * rest / max)), 2, rest / max > 0.25 ? '#6ad06a' : '#f0c040');
  else {
    // Leer: Nachfüllfortschritt, und ein blinkender Hinweis
    const f = S.lauf.fuellen[p0.id] || 0;
    const nf = S.stufe('nachfuell');
    const a = nf ? (S.lauf.nachfuellT[p0.id] || 0) / C.NACHFUELL_ZEIT[nf] : f;
    r(c, x + 4, y + H - 5, Math.round(bw * Math.min(1, Math.max(a, f))), 2, '#5ab0f0');
    if (!nf) {
      // Leer: vier Punkte zeigen, wie oft man noch tippen muss
      const getippt = Math.round(f * C.NACHFUELL_TIPPS);
      for (let k = 0; k < C.NACHFUELL_TIPPS; k++) {
        const px = cx - 7 + k * 4, py = y + 1;
        r(c, px, py, 3, 3, k < getippt ? '#5ab0f0' : (Math.floor(t * 3) % 2 ? '#f4f4f4' : '#9aa0aa'));
      }
      // Groß „LEER" quer über das Etikett und ein blinkender Rahmen um das
      // Fach - die vier Punkte allein übersah man, und das Glas blieb dann
      // still leer stehen (Betatest 02.10.)
      const an = Math.floor(t * 2.5) % 2;
      r(c, cx - 9, y + 10, 19, 7, '#2a1010');
      text(c, 'LEER', cx - 7, y + 11, an ? '#ff6a5a' : '#ffd0c8', null);
      if (an) {
        r(c, x + 1, y + 1, W - 2, 1, '#ff6a5a'); r(c, x + 1, y + H - 2, W - 2, 1, '#ff6a5a');
        r(c, x + 1, y + 1, 1, H - 2, '#ff6a5a'); r(c, x + W - 2, y + 1, 1, H - 2, '#ff6a5a');
      }
    }
    if (nf) nachfuellWichtel(c, x, y, a, p0.farbe, t, i);
  }
  // Gerade voll geworden: der Wichtel hüpft mit leerer Kanne davon
  const weg = S.lauf.gefuellt[p0.id];
  if (weg > 0) {
    const k = 1 - weg / 0.6;
    wichtelKlein(c, x + 5 - k * 6, y + 15 - Math.sin(k * Math.PI) * 8, t, i);
    if (Math.floor(t * 10) % 2) { p(c, cx - 2, y + 2, '#ffe060'); p(c, cx + 5, y + 1, '#ffe060'); }
  }
}

/**
 * Nachfüll-Wichtel bei der Arbeit: steht auf einem Schemel links am Topf
 * und gießt aus einer Kanne hinein. Vorher saß er nur klein in der Ecke -
 * man sah nicht, dass er etwas tut.
 */
function nachfuellWichtel(c, x, y, anteil, farbe, t, i) {
  r(c, x + 2, y + 17, 6, 1, '#8a5a2e'); r(c, x + 3, y + 18, 1, 4, '#6a4222'); r(c, x + 6, y + 18, 1, 4, '#6a4222');   // Schemel
  wichtelKlein(c, x + 5, y + 16, t, i);
  // Kanne, die sich beim Gießen neigt
  const kipp = Math.floor(t * 4) % 2;
  r(c, x + 7, y + 7 - kipp, 4, 4, '#a8b0bc'); r(c, x + 7, y + 7 - kipp, 4, 1, '#c8d0dc'); p(c, x + 11, y + 7 - kipp, '#a8b0bc');
  // Strahl in den Topf, in der Farbe des Getränks
  for (let k = 0; k < 3; k++) if ((Math.floor(t * 12) + k) % 3) p(c, x + 12, y + 7 + k - kipp, farbe);
  // Was schon drin ist, steigt am Topfrand sichtbar hoch
  const tx = x + C.T_ZELLE_B / 2 - 12;
  if (anteil > 0) r(c, tx + 1, y + 5, Math.max(1, Math.round(22 * anteil)), 1, farbe);
}

// ---------------------------------------------------------------------------
// Treffer
// ---------------------------------------------------------------------------
export function treffer(x, y, y0) {
  const yb = y0 + C.T_GAST, yr = yb + C.T_BRETT;
  if (y < y0) return null;
  if (y < yb) {
    const n = S.tresenPlaetze();
    return { art: 'gast', platz: Math.min(n - 1, Math.floor(x / (180 / n))) };
  }
  if (y < yr) {
    if (x < 42) return { art: 'glaeser' };
    if (x >= 148) return { art: 'ausguss' };
    const i = Math.floor((x - handStart() + 3) / PLATZ);
    return { art: 'hand', i: Math.max(0, Math.min(S.handMax() - 1, i)) };
  }
  const sp = Math.min(4, Math.floor(x / C.T_ZELLE_B));
  const zeile = Math.min(1, Math.floor((y - yr) / C.T_ZELLE_H));
  return { art: 'zelle', i: zeile * 5 + sp };
}
