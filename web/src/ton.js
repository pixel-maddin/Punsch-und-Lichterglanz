/*
 * ton.js - Geräusche (synthetisiert) und die Musik.
 *
 * MUSIK (seit 11.10.): ZWEI Stücke, je nach Ort.
 *   haus  - `audio/musik-haus.m4a`  (Quelle musik-quelle/music-bg.mp3), am Haus
 *   karte - `audio/musik-karte.m4a` (Quelle music-map.mp3), auf der Karte und
 *           in den Minispielen (vorher ruhte die Musik dort)
 * Gewechselt wird mit kurzer Überblendung; jedes Stück läuft beim nächsten
 * Mal an seiner Stelle weiter. Beide endlos in Schleife, beide HE-AAC 48 kbps
 * und auf dieselbe Lautheit gezogen (-14,9 LUFS) - siehe CLAUDE.md.
 * Davor gab es ein Stück (`musik.m4a`, „Music2").
 *
 * Die Versionsnummer hängt an der URL, damit Browser nach einem Austausch
 * nicht das alte Stück aus dem Zwischenspeicher spielen.
 * Alles läuft über den WebAudio-Graphen, NICHT über `audio.volume`: Auf
 * iOS ist `volume` schreibgeschützt und wird still ignoriert - ein
 * GainNode funktioniert überall. (Dieselbe Falle wie im Rennspiel.)
 * Dateien müssen AAC sein - OPUS in einer .m4a spielt Safari/iOS nicht.
 */
let ctx = null, fxGain = null, musikGain = null;
let fxAn = true, musikStufe = 3;
const MUSIK_MAX = 0.55;   // Gain bei Stufe 5 (die Dateien liegen bei -14,9 LUFS, recht laut)
const STUECKE = { haus: 'audio/musik-haus.m4a?v=202610191800', karte: 'audio/musik-karte.m4a?v=202610191800' };
const BLENDE = 0.45;      // s Überblendung beim Ortswechsel
const spuren = {};        // name -> { el, gain }
let szene = 'haus';       // welches Stück gerade dran ist
let karteOffen = false, miniOffen = false, musikRuht = false;

export function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); starteMusik(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  fxGain = ctx.createGain(); fxGain.gain.value = fxAn ? 0.5 : 0; fxGain.connect(ctx.destination);
  musikGain = ctx.createGain(); musikGain.gain.value = 0; musikGain.connect(ctx.destination);
  for (const [name, url] of Object.entries(STUECKE)) {
    const el = new Audio(url);
    el.loop = true;
    el.preload = name === szene ? 'auto' : 'metadata';
    const gain = ctx.createGain();
    gain.gain.value = name === szene ? 1 : 0;
    try { ctx.createMediaElementSource(el).connect(gain); gain.connect(musikGain); spuren[name] = { el, gain }; }
    catch (e) { /* ohne Graph lieber keine Musik als eine unregelbare */ }
  }
  stelleMusik();
  starteMusik();
}
/** Kurz ganz still (der erste Schnee). Danach geht es an derselben Stelle weiter. */
export function musikPause(an) {
  musikRuht = an;
  if (an) for (const s of Object.values(spuren)) s.el.pause(); else starteMusik();
}
/** Karte offen/zu (karte.js) - auf der Karte läuft das Kartenstück. */
export function musikKarte(an) { karteOffen = an; wechsle(); }
/** Minispiel läuft/ist vorbei - dort läuft ebenfalls das Kartenstück. */
export function musikMinispiel(an) { miniOffen = an; wechsle(); }
export const imMinispiel = () => miniOffen;

function wechsle() {
  const neu = karteOffen || miniOffen ? 'karte' : 'haus';
  if (neu === szene) return;
  const alt = spuren[szene], jetzt = spuren[neu];
  szene = neu;
  if (!ctx) return;
  const t = ctx.currentTime;
  if (alt) {
    alt.gain.gain.cancelScheduledValues(t); alt.gain.gain.setValueAtTime(alt.gain.gain.value, t); alt.gain.gain.linearRampToValueAtTime(0, t + BLENDE);
    setTimeout(() => { if (spuren[szene] !== alt) alt.el.pause(); }, BLENDE * 1000 + 80);
  }
  if (jetzt) {
    jetzt.el.preload = 'auto';
    jetzt.gain.gain.cancelScheduledValues(t); jetzt.gain.gain.setValueAtTime(jetzt.gain.gain.value, t); jetzt.gain.gain.linearRampToValueAtTime(1, t + BLENDE);
  }
  starteMusik();
}
function starteMusik() {
  const s = spuren[szene];
  if (!s || musikStufe === 0 || document.hidden || musikRuht) return;
  if (s.el.paused) s.el.play().catch(() => {});
}
export function schlafen() {
  for (const s of Object.values(spuren)) s.el.pause();
  if (ctx && ctx.state === 'running') ctx.suspend();
}
export function wecken() { if (ctx && ctx.state === 'suspended') ctx.resume(); starteMusik(); }

/** Für Tests: welches Stück, läuft es, wie laut? */
export function musikZustand() {
  const s = spuren[szene];
  return s ? { stueck: szene, laeuft: !s.el.paused, zeit: s.el.currentTime, stufe: musikStufe, gain: musikGain.gain.value,
    andere: Object.entries(spuren).filter(([n]) => n !== szene).map(([n, x]) => ({ stueck: n, laeuft: !x.el.paused, zeit: x.el.currentTime })), ctx: ctx.state } : null;
}

export function setzeFx(an) { fxAn = an; if (fxGain) fxGain.gain.value = an ? 0.5 : 0; }
/** Musiklautstärke 0 (aus) bis 5. */
export function setzeMusik(stufe) {
  musikStufe = Math.max(0, Math.min(5, stufe));
  stelleMusik();
  if (musikStufe === 0) { for (const sp of Object.values(spuren)) sp.el.pause(); } else starteMusik();
}
function stelleMusik() {
  if (!musikGain) return;
  const g = musikStufe === 0 ? 0 : MUSIK_MAX * Math.pow(musikStufe / 5, 1.6);
  musikGain.gain.setTargetAtTime(g, ctx.currentTime, 0.15);
}

function ton(freq, dauer, typ = 'square', laut = 0.2, start = 0, ziel = fxGain, gleiten = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = typ; o.frequency.setValueAtTime(freq, t0);
  if (gleiten) o.frequency.exponentialRampToValueAtTime(freq * gleiten, t0 + dauer);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(laut, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dauer);
  o.connect(g); g.connect(ziel);
  o.start(t0); o.stop(t0 + dauer + 0.02);
}

let rauschPuffer = null;
function rauschen(dauer, freq, q = 1, laut = 0.2, start = 0, ende = null) {
  if (!ctx) return;
  if (!rauschPuffer) {
    rauschPuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = rauschPuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = ctx.currentTime + start;
  const s = ctx.createBufferSource(); s.buffer = rauschPuffer;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
  if (ende) f.frequency.exponentialRampToValueAtTime(ende, t0 + dauer);
  const g = ctx.createGain();
  g.gain.setValueAtTime(laut, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dauer);
  s.connect(f); f.connect(g); g.connect(fxGain);
  s.start(t0); s.stop(t0 + dauer);
}

function glocke(freq, start = 0, laut = 0.12) {
  ton(freq, 0.6, 'sine', laut, start);
  ton(freq * 2.76, 0.25, 'sine', laut * 0.35, start);
}

export function spiele(name) {
  if (!ctx || !fxAn) return;
  switch (name) {
    case 'glas': ton(1900, 0.06, 'sine', 0.12); ton(2600, 0.05, 'sine', 0.08, 0.03); break;
    case 'giessen': rauschen(0.28, 900, 2, 0.25, 0, 500); break;
    case 'greifen': ton(520, 0.05, 'triangle', 0.15); break;
    case 'kasse': glocke(1318); glocke(1760, 0.07); break;
    case 'spezialKasse': [1047, 1319, 1568, 2093].forEach((f, i) => glocke(f, i * 0.07, 0.1)); break;
    case 'falsch': ton(180, 0.14, 'square', 0.09); ton(140, 0.16, 'square', 0.08, 0.07); break;
    case 'blubb': ton(300 + Math.random() * 120, 0.08, 'sine', 0.18, 0, fxGain, 1.8); break;
    case 'voll': ton(600, 0.07, 'triangle', 0.15); ton(900, 0.1, 'triangle', 0.15, 0.06); break;
    case 'ausguss': rauschen(0.35, 500, 1, 0.2, 0, 180); break;
    case 'brutzeln': rauschen(0.4, 3000, 0.7, 0.08); break;
    case 'fertig': ton(1200, 0.08, 'triangle', 0.12); ton(1500, 0.1, 'triangle', 0.12, 0.08); break;
    case 'kauf': [523, 659, 784, 1047].forEach((f, i) => ton(f, 0.18, 'square', 0.07, i * 0.06)); break;
    case 'spezial': [784, 988, 1175, 1568].forEach((f, i) => glocke(f, i * 0.09, 0.09)); break;
    case 'tuer': rauschen(0.12, 2500, 3, 0.1); [880, 1109, 1319, 1760].forEach((f, i) => glocke(f, 0.1 + i * 0.08, 0.1)); break;
    case 'klick': ton(800, 0.03, 'square', 0.06); break;
    // Silvester: dumpfer Knall, dann leises Knistern (bewusst leise - es knallt oft)
    case 'feuerwerk': rauschen(0.35, 160, 0.8, 0.12, 0, 60); for (let i = 0; i < 5; i++) rauschen(0.05, 3500 + Math.random() * 2500, 2, 0.025, 0.12 + i * 0.07 + Math.random() * 0.05); break;
    // Futter ins Futterhaus: Körner rieseln
    case 'koerner': for (let i = 0; i < 6; i++) rauschen(0.04, 4200, 3, 0.05, i * 0.04); break;
    // Schnee festklopfen
    case 'schnee': rauschen(0.12, 700, 1.2, 0.18, 0, 300); rauschen(0.1, 500, 1.2, 0.12, 0.13, 250); break;
    // Kirchturm (12.10.): ein tiefer Schlag aus der Ferne - Grundton, Unteroktave und zwei Teiltöne
    case 'kirchglocke': ton(330, 2.4, 'sine', 0.07); ton(165, 2.8, 'sine', 0.05); ton(330 * 2.4, 1.2, 'sine', 0.025); ton(330 * 3, 0.8, 'sine', 0.015); break;
    case 'kirchglocke2': ton(277, 2.4, 'sine', 0.06); ton(138.5, 2.8, 'sine', 0.04); ton(277 * 2.4, 1.2, 'sine', 0.02); break;
    // Schlittenglöckchen, leise: der Nikolaus fliegt vorbei
    case 'glocken': for (let i = 0; i < 8; i++) { glocke(2349 + (i % 2) * 300, i * 0.11, 0.05); } break;
  }
}
