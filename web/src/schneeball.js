/*
 * schneeball.js - Minispiel „Schneeballschlacht" (12.10.): Hinter
 * Schneewällen tauchen kleine Grummel auf. Antippen wirft einen Schneeball -
 * Treffer geben Punkte, schnell hintereinander eine Kette bis ×5. Aber
 * zwischen ihnen tauchen auch Wichtel auf: Die darf man NICHT treffen.
 * Wer einen Grummel zu lange stehen lässt, bekommt selbst einen Schneeball
 * ab (weißer Fleck auf dem Bild, Kette weg).
 *
 * Der Name ist bewusst „Grummel" (wie der grüne Muffel am Stand), nicht der
 * Name aus dem Kinderbuch. Figuren aus pixel.js (figurGross/wichtelGross),
 * damit sie genau so aussehen wie am Tresen.
 *
 * Aufbau wie lichtung.js: eigenes Canvas #miniCv, 180 Pixel breit, Kopfzeile
 * und Texte über minihud.js, Licht über licht.js.
 */
import * as C from './config.js?v=202610131429';
import * as Z from './zeit.js?v=202610131429';
import * as T from './ton.js?v=202610131429';
import * as MH from './minihud.js?v=202610131429';
import * as L from './licht.js?v=202610131429';
import { r, p, ton, figurGross, wichtelGross } from './pixel.js?v=202610131429';

const $ = (s) => document.querySelector(s);
const W = 180;
// Wer hinter den Wällen auftaucht: Punkte, wie lange er oben bleibt (s, Normal), Treffer bis er umfällt
const ARTEN = {
  grummel: { wert: 10, oben: 1.5, leben: 1 },
  helm:    { wert: 25, oben: 1.9, leben: 2 },   // Topf auf dem Kopf: zwei Treffer
  boss:    { wert: 60, oben: 1.1, leben: 1 },   // mit dem Geschenkesack - selten und schnell weg
  wichtel: { wert: -15, oben: 1.4, leben: 1 },  // NICHT treffen
};
const HOCH = { grummel: 34, helm: 36, boss: 34, wichtel: 26 };   // sichtbare Höhe über der Fußlinie
const WALL_H = 16, WALL_B = 38;
const AUF = 0.16;   // s zum Auf- und Abtauchen
// Anfliegende Schneebälle (13.10., Nutzerwunsch): Flugzeit (Normal) und Größe
// am Ende. Antippen zerschlägt sie - dafür gibt es ABWEHR Punkte.
const FLUG = 1.25, FLUG_GROSS = 26, ABWEHR = 5;

let cv = null, c = null, H = 340;
let stufe = C.MINI_STUFEN[1];
let spiel = null, rafId = 0, letzte = 0, fertig = null;
export const istOffen = () => !!spiel;
export const zustand = () => spiel;

/** Drei Reihen Schneewälle: hinten, Mitte, vorn. y = Unterkante des Walls. */
function waelle() {
  return [
    { x: 46, y: Math.round(H * 0.47), reihe: 0 }, { x: 134, y: Math.round(H * 0.47), reihe: 0 },
    { x: 28, y: Math.round(H * 0.665), reihe: 1 }, { x: 90, y: Math.round(H * 0.665), reihe: 1 }, { x: 152, y: Math.round(H * 0.665), reihe: 1 },
    { x: 56, y: Math.round(H * 0.86), reihe: 2 }, { x: 124, y: Math.round(H * 0.86), reihe: 2 },
  ];
}

export function starte(hoehe, beiEnde, stufeNr = 1) {
  stufe = C.miniStufe('schnee', stufeNr);
  H = Math.round(hoehe); fertig = beiEnde;
  cv = $('#miniCv');
  cv.width = W; cv.height = H;
  c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  spiel = neueRunde(-3);
  $('#minispiel').classList.remove('versteckt');
  MH.an(W, H);
  T.musikMinispiel(true);
  cv.onpointerdown = tippe;
  letzte = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(takt);
}
function neueRunde(t0) {
  return { t: t0, punkte: 0, kette: 1, ketteT: 0, plaetze: waelle().map((w) => ({ ...w, wer: null })), spawnT: 0.5,
    baelle: [], flecken: [], puffs: [], texte: [], anflug: [], wurfT: 3, treffer: 0, wichtel: 0, abbekommen: 0, abgewehrt: 0, aus: false };
}
export function schliesse() {
  spiel = null;
  cancelAnimationFrame(rafId);
  $('#minispiel').classList.add('versteckt');
  MH.aus();
  T.musikMinispiel(false);
}

const zufall = (a, b) => a + Math.random() * (b - a);

function auftauchen() {
  const g = spiel;
  const frei = g.plaetze.filter((pl) => !pl.wer);
  if (!frei.length) return;
  const pl = frei[Math.floor(Math.random() * frei.length)];
  // Wichtel ab und zu, in der zweiten Hälfte öfter; Helm-Grummel ab 8 s; der Boss selten
  const z = Math.random(), z2 = Math.random();
  const art = z < (g.t > C.SCHNEE_DAUER / 2 ? 0.28 : 0.22) ? 'wichtel'
    : z2 < 0.06 ? 'boss' : z2 < 0.26 && g.t > 8 ? 'helm' : 'grummel';
  // Je länger die Runde, desto kürzer bleiben sie oben
  const kuerzer = 1 - Math.min(0.35, g.t / C.SCHNEE_DAUER * 0.35);
  pl.wer = { art, t: 0, oben: ARTEN[art].oben * kuerzer / stufe.tempo, leben: ARTEN[art].leben, getroffen: -1, phase: Math.random() * 6 };
}

function tippe(e) {
  const rc = cv.getBoundingClientRect();
  tippeAuf((e.clientX - rc.left) / rc.width * W, (e.clientY - rc.top) / rc.height * H);
}
/** Wie weit ist jemand aufgetaucht? 0 = ganz hinter dem Wall, 1 = oben. */
function hoehe(w) {
  if (w.getroffen >= 0) return Math.max(0, 1 - w.getroffen / 0.35);   // fällt nach hinten weg
  if (w.t < AUF) return w.t / AUF;
  if (w.t > w.oben + AUF) return Math.max(0, 1 - (w.t - w.oben - AUF) / AUF);
  return 1;
}
/** Wo steht die Figur (Fußlinie)? Oben schaut sie mit dem Oberkörper über den Wall. */
const fuss = (pl, w) => pl.y - WALL_H + 4 + Math.round((1 - hoehe(w)) * (HOCH[w.art] + 8));

/** Wo ist ein anfliegender Ball gerade, und wie groß? Erst klein und weit weg, am Ende groß vor dir. */
function anflugPos(a) {
  const k = Math.min(1, a.t / a.dauer), e = k * k;
  return { x: a.x0 + (a.x1 - a.x0) * e, y: a.y0 + (a.y1 - a.y0) * e - Math.sin(k * Math.PI) * 26 * (1 - k), r: 1.5 + e * FLUG_GROSS / 2 };
}

/** Tipp in Feldkoordinaten. Exportiert für den Autopiloten (`messe`). */
export function tippeAuf(x, y) {
  const g = spiel;
  if (!g || g.t < 0 || g.aus) return;
  // Zuerst: ein anfliegender Schneeball? Der größte (nächste) gewinnt
  let ball = null;
  for (const a of g.anflug) { const p2 = anflugPos(a); if (Math.hypot(x - p2.x, y - p2.y) <= p2.r + 5 && (!ball || p2.r > anflugPos(ball).r)) ball = a; }
  if (ball) {
    const p2 = anflugPos(ball);
    g.anflug.splice(g.anflug.indexOf(ball), 1);
    g.abgewehrt++;
    const pkt = Math.round(ABWEHR * stufe.punkte);
    g.punkte += pkt;
    for (let k = 0; k < 3; k++) g.puffs.push({ x: p2.x + (k - 1) * p2.r * 0.4, y: p2.y + (k % 2) * 3, t: -k * 0.04, gr: Math.max(1, p2.r / 6) });
    g.texte.push({ x: p2.x, y: p2.y - p2.r - 6, text: 'ABGEWEHRT! +' + pkt, farbe: '#bfe6ff', t: 0 });
    T.spiele('schnee');
    return;
  }
  // Vorne zuerst: wer weiter vorn steht, verdeckt die hinteren
  let ziel = null;
  for (const pl of [...g.plaetze].sort((a, b) => b.reihe - a.reihe)) {
    const w = pl.wer;
    if (!w || w.getroffen >= 0 || hoehe(w) < 0.45) continue;
    const f = fuss(pl, w);
    if (Math.abs(x - pl.x) <= 13 && y >= f - HOCH[w.art] - 3 && y <= pl.y) { ziel = pl; break; }
  }
  g.baelle.push({ x0: W / 2, y0: H + 4, x, y, t: 0 });
  T.spiele('greifen');
  if (!ziel) {
    const minus = Math.round(C.MINI_MINUS.schnee.daneben * stufe.punkte);
    g.punkte = Math.max(0, g.punkte - minus);
    g.texte.push({ x, y: y - 8, text: '-' + minus, farbe: '#ff7a6a', t: 0 });
    g.kette = 1; g.ketteT = 0; g.puffs.push({ x, y, t: 0 }); return;
  }
  const w = ziel.wer;
  if (w.art === 'wichtel') {
    // Daneben! Wichtel sind Freunde
    w.getroffen = 0;
    const pkt = Math.round(ARTEN.wichtel.wert * stufe.punkte);
    g.punkte = Math.max(0, g.punkte + pkt);
    g.kette = 1; g.ketteT = 0; g.wichtel++;
    g.texte.push({ x: ziel.x, y: fuss(ziel, w) - 40, text: 'AUA!', farbe: '#ff8a8a', t: 0 });
    T.spiele('falsch');
    return;
  }
  w.leben--;
  if (w.leben > 0) {
    // Helm: Bong! Der Topf fliegt weg, der Grummel bleibt oben
    w.art = 'grummel'; w.helmWeg = 0; w.oben = Math.max(w.oben, w.t + 0.7);
    g.texte.push({ x: ziel.x, y: fuss(ziel, w) - 42, text: 'BONG!', farbe: '#c8d4e4', t: 0 });
    T.spiele('glas');
    return;
  }
  w.getroffen = 0;
  g.kette = g.ketteT > 0 ? Math.min(5, g.kette + 1) : 1;
  g.ketteT = 1.5;
  const basis = ARTEN[w.helmWeg != null ? 'helm' : w.art].wert;
  const pkt = Math.round(basis * g.kette * stufe.punkte);
  g.punkte += pkt; g.treffer++;
  g.texte.push({ x: ziel.x, y: fuss(ziel, w) - 40, text: '+' + pkt, t: 0 });
  T.spiele(w.art === 'boss' ? 'spezialKasse' : g.kette >= 3 ? 'kasse' : 'schnee');
}

function takt(jetzt) {
  if (!spiel) return;
  const dt = Math.min(0.05, (jetzt - letzte) / 1000);
  letzte = jetzt;
  schritt(dt);
  if (!spiel) return;
  zeichne(jetzt / 1000);
  rafId = requestAnimationFrame(takt);
}

function schritt(dt) {
  const g = spiel;
  g.t += dt;
  if (g.t >= 0 && !g.aus) {
    const spurt = g.t > C.SCHNEE_DAUER * 2 / 3;
    const oben = g.plaetze.filter((pl) => pl.wer).length;
    g.spawnT -= dt;
    if (g.spawnT <= 0 && oben < (spurt ? 4 : 3)) {
      auftauchen();
      g.spawnT = Math.max(0.3, 0.85 - g.t / C.SCHNEE_DAUER * 0.45) * zufall(0.7, 1.3) / stufe.tempo * (spurt ? 0.7 : 1);
    }
    if (g.ketteT > 0) { g.ketteT -= dt; if (g.ketteT <= 0) g.kette = 1; }
    if (g.t >= C.SCHNEE_DAUER) {
      g.aus = true;
      if (fertig) T.spiele('fertig');
      setTimeout(() => { if (spiel === g && fertig) fertig(g.punkte, g.treffer, g.wichtel); }, 900);
    }
  }
  // Ab und zu wirft einer, der gerade oben ist - auch wenn man schnell trifft
  // (sonst bekam ein guter Spieler nie einen Ball zu sehen)
  if (g.t >= 0 && !g.aus) {
    g.wurfT -= dt;
    if (g.wurfT <= 0) {
      const oben = g.plaetze.filter((x) => x.wer && x.wer.art !== 'wichtel' && x.wer.getroffen < 0 && hoehe(x.wer) > 0.8);
      if (oben.length) {
        const pl = oben[Math.floor(Math.random() * oben.length)];
        const f = fuss(pl, pl.wer);
        g.anflug.push({ x0: pl.x - 12, y0: f - 15, x1: zufall(34, W - 34), y1: zufall(H * 0.42, H * 0.78), t: 0, dauer: FLUG / stufe.tempo });
        pl.wer.wirft = 0.3;
        T.spiele('greifen');
        g.wurfT = zufall(3.5, 6) / stufe.tempo;
      } else g.wurfT = 0.3;
    }
  }
  for (const pl of g.plaetze) {
    const w = pl.wer;
    if (!w) continue;
    w.t += dt;
    if (w.wirft > 0) w.wirft -= dt;
    if (w.helmWeg != null) w.helmWeg += dt;
    if (w.getroffen >= 0) { w.getroffen += dt; if (w.getroffen > 0.6) pl.wer = null; continue; }
    // Zu lange oben gelassen: Der Grummel wirft zurück (Wichtel winken nur)
    if (w.art !== 'wichtel' && !w.geworfen && w.t > w.oben && !g.aus) {
      w.geworfen = true;
      if (Math.random() < 0.45) {
        // Der Ball fliegt erst auf dich zu und wird dabei größer - antippen zerschlägt ihn
        const f = fuss(pl, w);
        g.anflug.push({ x0: pl.x - 12, y0: f - 15, x1: zufall(34, W - 34), y1: zufall(H * 0.42, H * 0.78), t: 0, dauer: FLUG / stufe.tempo });
        T.spiele('greifen');
      }
    }
    if (w.t > w.oben + AUF * 2) pl.wer = null;
  }
  // Anfliegende Bälle: am Ende klatschen sie aufs Bild
  for (const a of g.anflug) a.t += dt;
  for (const a of g.anflug.filter((a) => a.t >= a.dauer)) {
    g.flecken.push({ x: a.x1, y: a.y1, t: 0, gr: zufall(18, 24) });
    if (!g.aus) {
      g.kette = 1; g.ketteT = 0; g.abbekommen++;
      const minus = Math.round(C.MINI_MINUS.schnee.abbekommen * stufe.punkte);
      g.punkte = Math.max(0, g.punkte - minus);
      g.texte.push({ x: a.x1, y: a.y1 - 16, text: 'PLATSCH! -' + minus, farbe: '#ff7a6a', t: 0 });
    }
    T.spiele('schnee');
  }
  g.anflug = g.anflug.filter((a) => a.t < a.dauer);
  for (const b of g.baelle) b.t += dt;
  g.baelle = g.baelle.filter((b) => b.t < 0.2);
  for (const f of g.flecken) f.t += dt;
  g.flecken = g.flecken.filter((f) => f.t < 1.6);
  for (const x of g.puffs) x.t += dt;
  g.puffs = g.puffs.filter((x) => x.t < 0.35);
  for (const x of g.texte) x.t += dt;
  g.texte = g.texte.filter((x) => x.t < 0.9);
}

/**
 * Messweg: eine Runde ohne Bild. `reaktion` = s, bis ein aufgetauchter
 * Grummel getroffen wird, `treffer` = Anteil, der sitzt, `irrtum` = Anteil der
 * Würfe, die versehentlich einen Wichtel treffen. Gibt Punkte und Zähler zurück.
 */
export function messe(reaktion = 0.45, treffer = 0.9, irrtum = 0.05, hoeheFeld = 340, stufeNr = 1, abwehr = 0.6) {
  stufe = C.miniStufe('schnee', stufeNr);
  const altFertig = fertig, altH = H;
  H = hoeheFeld; fertig = null;
  spiel = neueRunde(0);
  const dt = 1 / 60;
  while (!spiel.aus) {
    schritt(dt);
    // Anfliegende Bälle: nach halber Flugzeit mit Wahrscheinlichkeit `abwehr` abgewehrt
    for (const a of spiel.anflug) if (!a.gesehen && a.t > a.dauer * 0.5) { a.gesehen = true; if (Math.random() < abwehr) { const p2 = anflugPos(a); tippeAuf(p2.x, p2.y); break; } }
    for (const pl of spiel.plaetze) {
      const w = pl.wer;
      if (!w || w.getroffen >= 0 || w.art === 'wichtel' || w.t < reaktion || hoehe(w) < 0.5) continue;
      if (w.zielT != null && spiel.t < w.zielT) continue;
      w.zielT = spiel.t + 0.25;   // ein Wurf je Viertelsekunde und Figur
      const f = fuss(pl, w);
      if (Math.random() < treffer) tippeAuf(pl.x, f - 12); else tippeAuf(pl.x + 30, 4);
      break;
    }
    if (Math.random() < irrtum * dt) {
      const pl = spiel.plaetze.find((x) => x.wer && x.wer.art === 'wichtel' && hoehe(x.wer) >= 0.5);
      if (pl) tippeAuf(pl.x, fuss(pl, pl.wer) - 10);
    }
  }
  const erg = { punkte: spiel.punkte, treffer: spiel.treffer, wichtel: spiel.wichtel, abbekommen: spiel.abbekommen, abgewehrt: spiel.abgewehrt };
  spiel = null; fertig = altFertig; H = altH;
  return erg;
}

// ---------------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------------
function hash(n) { const s = Math.sin(n * 91.7) * 43758.5453; return s - Math.floor(s); }
let kulisse = null, kulisseSchl = '';
const flocken = Array.from({ length: 34 }, (_, i) => ({ x: hash(i + 1) * W, y: hash(i + 2) * 400, v: 10 + hash(i + 3) * 14, s: hash(i + 4) * 6 }));

/** Himmel, Wald, Wiese - einmal je Höhe und Tageszeitstufe. */
function baueKulisse(stufeLicht) {
  const schl = `${H}|${stufeLicht}`;
  if (kulisse && kulisseSchl === schl) return;
  kulisseSchl = schl;
  kulisse = document.createElement('canvas');
  kulisse.width = W; kulisse.height = H;
  const k = kulisse.getContext('2d');
  const himmel = stufeLicht === 2 ? ['#8fb8d8', '#a8c8e4', '#c4dcee'] : stufeLicht === 1 ? ['#40407e', '#8a6a90', '#e8a07a'] : ['#141c44', '#1e2a58', '#2e3c70'];
  const hz = Math.round(H * 0.24);
  for (let y = 0; y < hz; y++) r(k, 0, y, W, 1, himmel[Math.min(2, Math.floor(y / hz * 3))]);
  if (stufeLicht === 0) for (let i = 0; i < 24; i++) p(k, Math.floor(hash(i * 7) * W), Math.floor(hash(i * 11) * hz * 0.8), '#ffffff');
  // Ferne Hügel und eine Tannenreihe
  for (let x = 0; x < W; x++) { const h = 8 + Math.round(Math.sin(x / 21) * 3 + Math.sin(x / 7.7) * 1.5); r(k, x, hz - h, 1, h, '#c8d4e2'); }
  for (let x = -4; x < W + 4; x += 6) {
    const h = 10 + Math.round(hash(x + 3) * 7), bx = x + Math.round(hash(x) * 3);
    for (let i = 0; i < h; i++) { const bw = Math.round((i + 1) / h * 4); r(k, bx - bw, hz - h + i + 2, bw * 2 + 1, 1, i % 3 === 2 ? '#2a5240' : '#33604a'); }
    p(k, bx, hz - h + 2, '#f4f8fb'); r(k, bx - 1, hz - h + 5, 3, 1, '#e8f0f6');
  }
  // Schneewiese: sanfte Wellen, nach vorn heller
  for (let y = hz; y < H; y++) {
    const a = (y - hz) / (H - hz);
    r(k, 0, y, W, 1, a < 0.25 ? '#dce6f0' : a < 0.6 ? '#e6eef6' : '#eef4f9');
  }
  for (let i = 0; i < 70; i++) { const x = Math.floor(hash(i * 13) * W), y = hz + 4 + Math.floor(hash(i * 17) * (H - hz - 4)); p(k, x, y, '#cad6e4'); p(k, x + 1, y, '#d6e0ea'); }
  // Spuren vom Herumtollen
  for (let x = 0; x < W; x += 3) { const y = Math.round(H * 0.56 + Math.sin(x / 17) * 6); p(k, x, y, '#c4d0de'); p(k, x + 1, y + 1, '#c4d0de'); }
  // Am Rand zwei Tannen
  for (const [tx, h] of [[6, 46], [W - 6, 52]]) {
    const ty = Math.round(H * 0.38);
    r(k, tx - 1, ty, 3, 5, '#5a3a22');
    for (let i = 0; i < h; i++) { const bw = Math.round(((i % 14) + 2) / 15 * (4 + i / h * 9)); r(k, tx - bw, ty - h + i, bw * 2 + 1, 1, i % 3 === 2 ? '#1f4a2a' : '#2a5a32'); if (i % 14 === 0) r(k, tx - bw, ty - h + i, bw * 2 + 1, 1, '#f4f8fb'); }
  }
}

function wall(x, y) {
  // Schneewall: runder Rücken, Schatten unten, ein paar Schneebälle davor
  const l = x - WALL_B / 2, o = y - WALL_H;
  for (let i = 0; i < WALL_B; i++) {
    const rand = Math.min(i, WALL_B - 1 - i);
    const dy = (rand < 4 ? 4 - rand : rand < 8 ? 1 : 0) + (Math.sin(i * 0.9 + x) > 0.7 ? 1 : 0);
    r(c, l + i, o + dy, 1, WALL_H - dy, i < WALL_B * 0.35 ? '#ffffff' : '#eef3f9');
    p(c, l + i, o + dy - 1, '#a8b8cc');   // Kontur gegen den hellen Schnee dahinter
    if (rand < 2) r(c, l + i, o + dy, 1, WALL_H - dy, '#c4d2e2');
  }
  r(c, l + 3, o + 3, 6, 2, '#ffffff');
  r(c, l + 2, y - 4, WALL_B - 4, 2, '#d8e2ee'); r(c, l + 4, y - 2, WALL_B - 8, 2, '#c4d0e0');
  for (let i = 0; i < 5; i++) p(c, l + 5 + i * 7, o + 5 + (i % 2) * 3, '#dfe8f2');
  // Ein kleiner Vorrat Schneebälle an der Ecke
  for (const [dx, dy] of [[WALL_B - 8, -3], [WALL_B - 5, -3], [WALL_B - 7, -5]]) { r(c, l + dx, y + dy, 3, 2, '#ffffff'); p(c, l + dx, y + dy + 1, '#c8d4e2'); }
}

function figur(pl, w, t) {
  const f = fuss(pl, w);
  const getroffen = w.getroffen >= 0;
  if (w.art === 'wichtel') {
    wichtelGross(c, pl.x, f, t);
    if (getroffen) for (let i = 0; i < 4; i++) { const a = t * 8 + i * 1.6; p(c, pl.x + Math.cos(a) * 7, f - 30 + Math.sin(a) * 2, '#ffe060'); }   // Sternchen: Aua
    else if (Math.floor(t * 3 + w.phase) % 2) { r(c, pl.x + 7, f - 14, 2, 2, '#f2c9a0'); p(c, pl.x + 8, f - 15, '#f2c9a0'); }   // winkt
    return;
  }
  figurGross(c, { typ: 'grummel', farben: {}, phase: w.phase }, pl.x, f, t, getroffen ? 'sauer' : 'froh');
  if (w.art === 'helm') {
    // Kochtopf als Helm
    r(c, pl.x - 7, f - 37, 14, 6, '#9aa4b0'); r(c, pl.x - 7, f - 37, 14, 1, '#c8d0da'); r(c, pl.x - 9, f - 33, 2, 1, '#6a7480'); r(c, pl.x + 7, f - 33, 2, 1, '#6a7480');
  }
  if (w.helmWeg != null && w.helmWeg < 0.5) {
    const k = w.helmWeg / 0.5;
    r(c, pl.x + 6 + k * 20, f - 40 - k * 18 + k * k * 30, 8, 4, '#9aa4b0');
  }
  if (w.art === 'boss') {
    // Der Sack mit den geklauten Geschenken
    r(c, pl.x + 9, f - 18, 8, 9, '#8a6a3a'); r(c, pl.x + 10, f - 20, 6, 2, '#6a4a2a'); p(c, pl.x + 12, f - 21, '#c83a32'); p(c, pl.x + 14, f - 22, '#3a8a3a');
  }
  // Schneeball in der Hand, bereit zum Wurf
  if (!getroffen && w.wirft > 0) { r(c, pl.x - 13, f - 24, 2, 6, '#5a9a30'); }   // Arm hoch: gerade geworfen
  else if (!getroffen) { r(c, pl.x - 13, f - 16, 3, 3, '#ffffff'); p(c, pl.x - 13, f - 14, '#c8d4e2'); }
  else { r(c, pl.x - 5, f - 30, 10, 5, '#ffffff'); p(c, pl.x - 6, f - 28, '#ffffff'); p(c, pl.x + 5, f - 27, '#ffffff'); }   // Schnee im Gesicht
}

function zeichne(t) {
  const g = spiel;
  const li = Z.licht();
  baueKulisse(li.hell > 0.6 ? 2 : li.hell > 0.1 ? 1 : 0);
  c.drawImage(kulisse, 0, 0);
  // Reihe für Reihe von hinten nach vorn: erst die Figuren (abgeschnitten an
  // der Unterkante ihres Walls), dann der Wall davor
  for (let reihe = 0; reihe < 3; reihe++) {
    for (const pl of g.plaetze) {
      if (pl.reihe !== reihe) continue;
      L.schatten(c, pl.x, pl.y - 2, WALL_B / 2 + 2, 3, 0.22);   // direkt unter dem Wall (12.10.: lag zu weit unten)
      if (pl.wer) {
        c.save(); c.beginPath(); c.rect(0, 0, W, pl.y - 2); c.clip();
        figur(pl, pl.wer, t);
        c.restore();
      }
      wall(pl.x, pl.y);
    }
  }
  // Fliegende Schneebälle (vom unteren Rand zum Ziel, im Bogen)
  for (const b of g.baelle) {
    const k = Math.min(1, b.t / 0.18), x = b.x0 + (b.x - b.x0) * k, y = b.y0 + (b.y - b.y0) * k - Math.sin(k * Math.PI) * 18;
    const gr = Math.max(2, Math.round(5 - k * 3));
    r(c, x - gr / 2, y - gr / 2, gr, gr, '#ffffff'); p(c, x + gr / 2 - 1, y + gr / 2 - 1, '#c8d4e2');
  }
  for (const x of g.texte) if (!x.gezeigt) { x.gezeigt = true; MH.schwebe(x.x, x.y, x.text, x.farbe || '#ffe27a', 1); }
  for (const fl of flocken) {
    fl.y += fl.v / 60; if (fl.y > H) { fl.y = 0; fl.x = Math.random() * W; }
    p(c, fl.x + Math.sin(t * 1.3 + fl.s) * 3, fl.y, '#ffffff');
  }
  // Licht und Schatten wie in den anderen Minispielen; abends eine Laterne am Rand
  L.beleuchte(c, W, H, {
    himmel: Math.round(H * 0.24), vignette: 0.3, grundNacht: [116, 126, 174],
    flecken: [{ x: 60, y: H * 0.55, r: 50 }, { x: 140, y: H * 0.78, r: 46 }],
    inseln: [{ x: W - 14, y: H * 0.4, r: 60, a: 0.8 }],
  });
  if (li.hell < 0.9) { r(c, W - 15, H * 0.4 - 10, 3, 3, '#ffe090'); L.schein(c, W - 14, H * 0.4 - 9, 10, '255,210,130', 0.6 * (1 - li.hell)); }
  // Anfliegende Schneebälle (über dem Licht - sie sind ja vor dir): runder
  // Ball mit Schattenseite, ein heller Lichtpunkt, bläulicher Rand
  for (const a of g.anflug) {
    const p2 = anflugPos(a), rr = p2.r, cx = Math.round(p2.x), cy = Math.round(p2.y), R = Math.ceil(rr);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dy);
      if (d > rr) continue;
      const rand = d > rr - 1.2, schatten = (dx + dy) / (rr * 1.6);
      p(c, cx + dx, cy + dy, rand ? '#9ab0c8' : schatten > 0.35 ? '#c8d6e6' : schatten > 0 ? '#e6eef6' : '#ffffff');
    }
    if (rr > 4) { r(c, cx - Math.round(rr * 0.4), cy - Math.round(rr * 0.45), Math.max(1, Math.round(rr / 5)), Math.max(1, Math.round(rr / 5)), '#ffffff'); }
    // Kurz vor dem Aufprall blinkt ein roter Ring: schnell antippen!
    if (a.t > a.dauer * 0.7 && Math.floor(a.t * 12) % 2) { c.strokeStyle = 'rgba(255,90,80,0.8)'; c.lineWidth = 1; c.beginPath(); c.arc(cx + 0.5, cy + 0.5, rr + 2, 0, Math.PI * 2); c.stroke(); }
  }
  // Schneewolken: daneben geworfen (klein) oder abgewehrter Ball (groß, `gr`)
  for (const f of g.puffs) {
    if (f.t < 0) continue;
    const a = Math.min(1, f.t / 0.35), gr = f.gr || 1, rr = (2 + a * 7) * gr, s2 = Math.max(2, Math.round(2 * gr));
    c.fillStyle = `rgba(255,255,255,${(1 - a).toFixed(2)})`;
    for (let k = 0; k < 10; k++) { const w = k / 10 * Math.PI * 2 + gr; c.fillRect(Math.round(f.x + Math.cos(w) * rr), Math.round(f.y + Math.sin(w) * rr * 0.7), s2, s2); }
  }
  // Getroffen: weißer Fleck auf dem Bild, der langsam abrutscht (über dem Licht)
  for (const f of g.flecken) {
    const a = f.t < 1.1 ? 1 : 1 - (f.t - 1.1) / 0.5, y = f.y + f.t * 8;
    c.fillStyle = `rgba(255,255,255,${(0.95 * a).toFixed(2)})`;
    for (let k = 0; k < 12; k++) { const w = k / 12 * Math.PI * 2, rr = f.gr * (0.7 + hash(k + f.gr) * 0.5); c.fillRect(Math.round(f.x + Math.cos(w) * rr * 0.5 - 4), Math.round(y + Math.sin(w) * rr * 0.5 - 4), 8, 8); }
    c.fillRect(Math.round(f.x - f.gr / 2), Math.round(y - f.gr / 2), Math.round(f.gr), Math.round(f.gr));
  }
  const rest = Math.max(0, Math.ceil(C.SCHNEE_DAUER - Math.max(0, g.t)));
  MH.setzeKopf({ zeit: rest, knapp: rest <= 5 && g.t >= 0, kette: g.kette, ketteAnteil: Math.max(0, g.ketteT) / 1.5, punkte: g.punkte });
  MH.hinweis(g.t < 0 ? `Schwierigkeit: ${stufe.name} · Wichtel nicht treffen!` : null);
  MH.mitte(g.aus ? 'ZEIT UM!' : g.t < 0 ? String(Math.ceil(-g.t)) : g.t < 0.6 ? 'LOS!' : null, g.t < 0 && !g.aus ? '#ffffff' : '#ffe27a');
}

/** Nur für die Vorführszene: ein paar Figuren oben stehen lassen. */
export function vorspulen(sek) {
  for (let t = 0; t < sek; t += 1 / 30) schritt(1 / 30);
  zeichne(performance.now() / 1000);
}
