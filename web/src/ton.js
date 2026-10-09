/*
 * ton.js - Geräusche (synthetisiert) und die Musik.
 *
 * MUSIK: `audio/musik.m4a` („Music2", seit 03.10.; davor „Village at Night"),
 * endlos in Schleife. Die Versionsnummer hängt dran, damit Browser nach einem
 * Austausch nicht das alte Stück aus dem Zwischenspeicher spielen.
 * Sie läuft über den WebAudio-Graphen, NICHT über `audio.volume`: Auf
 * iOS ist `volume` schreibgeschützt und wird still ignoriert - ein
 * GainNode funktioniert überall. (Dieselbe Falle wie im Rennspiel.)
 *
 * Die Datei ist AAC. Die Quelle war OPUS in einer .m4a - das spielt
 * Safari/iOS nicht. Original liegt in `musik-quelle/`.
 */
let ctx = null, fxGain = null, musikGain = null, musikEl = null;
let fxAn = true, musikStufe = 3;
const MUSIK_MAX = 0.55;   // Gain bei Stufe 5 (die Datei ist mit -14,7 LUFS recht laut)

export function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); starteMusik(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  fxGain = ctx.createGain(); fxGain.gain.value = fxAn ? 0.5 : 0; fxGain.connect(ctx.destination);
  musikGain = ctx.createGain(); musikGain.gain.value = 0; musikGain.connect(ctx.destination);
  musikEl = new Audio('audio/musik.m4a?v=20261009s');
  musikEl.loop = true;
  musikEl.preload = 'auto';
  try { ctx.createMediaElementSource(musikEl).connect(musikGain); }
  catch (e) { musikEl = null; }   // ohne Graph lieber keine Musik als eine unregelbare
  stelleMusik();
  starteMusik();
}
let musikRuht = false;
/** Im Minispiel ruht die Musik; danach geht sie an derselben Stelle weiter. */
export function musikPause(an) {
  musikRuht = an;
  if (an) { if (musikEl) musikEl.pause(); } else starteMusik();
}
function starteMusik() {
  if (!musikEl || musikStufe === 0 || document.hidden || musikRuht) return;
  if (musikEl.paused) musikEl.play().catch(() => {});
}
export function schlafen() {
  if (musikEl) musikEl.pause();
  if (ctx && ctx.state === 'running') ctx.suspend();
}
export function wecken() { if (ctx && ctx.state === 'suspended') ctx.resume(); starteMusik(); }

/** Für Tests: läuft die Musik, wie laut? */
export function musikZustand() {
  return musikEl ? { laeuft: !musikEl.paused, zeit: musikEl.currentTime, stufe: musikStufe, gain: musikGain.gain.value, ctx: ctx.state } : null;
}

export function setzeFx(an) { fxAn = an; if (fxGain) fxGain.gain.value = an ? 0.5 : 0; }
/** Musiklautstärke 0 (aus) bis 5. */
export function setzeMusik(stufe) {
  musikStufe = Math.max(0, Math.min(5, stufe));
  stelleMusik();
  if (musikStufe === 0) { if (musikEl) musikEl.pause(); } else starteMusik();
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
    // Schlittenglöckchen, leise: der Nikolaus fliegt vorbei
    case 'glocken': for (let i = 0; i < 8; i++) { glocke(2349 + (i % 2) * 300, i * 0.11, 0.05); } break;
  }
}
