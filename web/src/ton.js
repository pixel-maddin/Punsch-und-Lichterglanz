/*
 * ton.js - Geräusche (synthetisiert) und die Musik.
 *
 * MUSIK (seit 27.10.): drei Szenen mit je einer Wiedergabeliste, dazu ein Jingle.
 *   haus  - `musik-haus` (Suno, auf 4:10 gekürzt) und `haus-jazz` (auf 3:52 gekürzt) im Wechsel
 *           (27.10.: `haus-lofi` auf Wunsch wieder raus). 24.-26.12. abwechselnd `xmas` und eins davon.
 *   karte - bis zum 1. Advent `musik-karte` (Suno), danach je Advent ein Stück mehr (`karte-1..3`);
 *           das neueste kommt beim ersten Öffnen der Sitzung zuerst, danach zufällig.
 *   mini  - `mini-1`/`mini-2`, zufällig je Minispiel, in Schleife.
 *   jingle - 16 s bei großen Ereignisfenstern (`jingle()`), die Musik wird solange leiser.
 * Herkunft und Künstler: `C.MUSIK_CREDITS` (Fenster „Credits" in den Einstellungen).
 * Jede Szene hat EIN Audio-Element (die Quelle wechselt am Stückende) und läuft beim nächsten Mal
 * an ihrer Stelle weiter (außer Minispielen, die beginnen von vorn). Alle Dateien AAC LC 80 kbps,
 * -15 LUFS (zwei Durchgänge loudnorm, linear) - Neubau siehe CLAUDE.md.
 *
 * Die Versionsnummer hängt an der URL, damit Browser nach einem Austausch
 * nicht das alte Stück aus dem Zwischenspeicher spielen.
 * Alles läuft über den WebAudio-Graphen, NICHT über `audio.volume`: Auf
 * iOS ist `volume` schreibgeschützt und wird still ignoriert - ein
 * GainNode funktioniert überall. (Dieselbe Falle wie im Rennspiel.)
 * Dateien müssen AAC sein - OPUS in einer .m4a spielt Safari/iOS nicht.
 */
import * as Z from './zeit.js?v=202610311645';

let ctx = null, fxGain = null, musikGain = null, busGain = null;
let fxAn = true, musikStufe = 3;
const MUSIK_MAX = 0.55;   // Gain bei Stufe 5 (die Dateien liegen bei -15 LUFS, recht laut)
const url = (id) => `audio/${id}.m4a?v=202610311645`;
const HAUS = ['musik-haus', 'haus-jazz'];
const XMAS = 'xmas';
const KARTE_ALT = 'musik-karte';
const KARTE_ADVENT = ['karte-1', 'karte-2', 'karte-3'];   // 1., 2., 3. Advent
const MINI = ['mini-1', 'mini-2'];
const BLENDE = 0.45;      // s Überblendung beim Ortswechsel
const DUCK = 0.15;        // so laut bleibt die Musik unter dem Jingle
const spuren = {};        // szene -> { el, gain, stueck }
let jingleEl = null;
let szene = 'haus';       // welche Szene gerade dran ist
let karteOffen = false, miniOffen = false, musikRuht = false;
const gehoert = new Set();   // Kartenstücke, die in dieser Sitzung schon liefen

const zufall = (liste, nicht) => { const l = liste.filter((x) => x !== nicht); const w = l.length ? l : liste; return w[Math.floor(Math.random() * w.length)]; };
// 29.10.: Am 24.12. erst ab 6 Uhr (dann kommt auch das Fenster „Frohe Weihnachten!")
const xmasTage = () => { const d = Z.jetzt(), t = Z.dezemberTag(d); return (t === 24 && d.getHours() >= 6) || t === 25 || t === 26; };
function karteListe() {
  const adv = Z.adventKerzen();
  return adv < 1 ? [KARTE_ALT] : KARTE_ADVENT.slice(0, Math.min(adv, KARTE_ADVENT.length));
}
/** Welches Stück kommt in dieser Szene als Nächstes? */
function naechstes(name, jetzt) {
  if (name === 'haus') {
    if (xmasTage()) return jetzt === XMAS ? zufall(HAUS) : XMAS;
    return zufall(HAUS, jetzt);
  }
  if (name === 'karte') {
    const l = karteListe(), neuestes = l[l.length - 1];
    return gehoert.has(neuestes) ? zufall(l, jetzt) : neuestes;
  }
  return zufall(MINI);
}
/** Stück in einer Szene setzen (von vorn). */
function setze(name, id) {
  const s = spuren[name];
  if (!s) return;
  if (s.stueck !== id) { s.stueck = id; s.el.src = url(id); } else s.el.currentTime = 0;
  if (name === 'karte') gehoert.add(id);
}

export function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); starteMusik(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  fxGain = ctx.createGain(); fxGain.gain.value = fxAn ? 0.5 : 0; fxGain.connect(ctx.destination);
  musikGain = ctx.createGain(); musikGain.gain.value = 0; musikGain.connect(ctx.destination);
  busGain = ctx.createGain(); busGain.gain.value = 1; busGain.connect(musikGain);
  for (const name of ['haus', 'karte', 'mini']) {
    const el = new Audio();
    el.loop = name === 'mini';
    el.preload = name === szene ? 'auto' : 'none';
    const gain = ctx.createGain();
    gain.gain.value = name === szene ? 1 : 0;
    try { ctx.createMediaElementSource(el).connect(gain); gain.connect(busGain); spuren[name] = { el, gain, stueck: null }; }
    catch (e) { continue; /* ohne Graph lieber keine Musik als eine unregelbare */ }
    // Stückende: das nächste aus der Liste (Minispiele laufen in Schleife)
    el.addEventListener('ended', () => { setze(name, naechstes(name, spuren[name].stueck)); if (szene === name) starteMusik(); });
  }
  if (spuren.haus) setze('haus', naechstes('haus', null));
  try {
    jingleEl = new Audio(url('jingle')); jingleEl.preload = 'auto';
    ctx.createMediaElementSource(jingleEl).connect(musikGain);
    jingleEl.addEventListener('ended', () => rampe(busGain, 1, 1.2));
  } catch (e) { jingleEl = null; }
  stelleMusik();
  starteMusik();
}
function rampe(g, ziel, dauer) {
  if (!ctx || !g) return;
  const t = ctx.currentTime;
  g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(ziel, t + dauer);
}
/** Kurz ganz still (der erste Schnee). Danach geht es an derselben Stelle weiter. */
/** 24.12. (29.10.): Das Fenster „Frohe Weihnachten!" startet die Weihnachtsmusik sofort, nicht erst nach dem laufenden Stück. */
export function weihnachtsMusik() {
  const s = spuren.haus;
  if (!s || s.stueck === XMAS) return;
  setze('haus', XMAS);
  if (szene === 'haus') starteMusik();
}
export function musikPause(an) {
  musikRuht = an;
  if (an) for (const s of Object.values(spuren)) s.el.pause(); else starteMusik();
}
/** Karte offen/zu (karte.js) - auf der Karte läuft die Kartenliste. */
export function musikKarte(an) { karteOffen = an; wechsle(); }
/** Minispiel läuft/ist vorbei - dort läuft eines der Minispiel-Stücke. */
export function musikMinispiel(an) { miniOffen = an; wechsle(); }
export const imMinispiel = () => miniOffen;
/**
 * Jingle bei großen Ereignisfenstern (Advent, erster Schnee, Jury, Heiligabend, Silvester, Finale).
 * Die Musik geht solange auf DUCK und blendet danach wieder hoch.
 */
export function jingle() {
  if (!ctx || !jingleEl || musikStufe === 0 || document.hidden) return;
  rampe(busGain, DUCK, 0.3);
  jingleEl.currentTime = 0;
  jingleEl.play().catch(() => rampe(busGain, 1, 0.5));
}

function wechsle() {
  const neu = miniOffen ? 'mini' : karteOffen ? 'karte' : 'haus';
  if (neu === szene) return;
  const alt = spuren[szene], jetzt = spuren[neu];
  szene = neu;
  if (!ctx) return;
  // Minispiel immer von vorn mit einem zufälligen Stück; Karte nur neu, wenn ihr Stück nicht
  // (mehr) in der Liste ist (vor dem 1. Advent das alte) oder ein neues Adventsstück dazukam
  if (neu === 'mini') setze('mini', naechstes('mini'));
  if (neu === 'karte' && jetzt) { const l = karteListe(); if (!l.includes(jetzt.stueck) || !gehoert.has(l[l.length - 1])) setze('karte', naechstes('karte', jetzt.stueck)); }
  if (alt) {
    rampe(alt.gain, 0, BLENDE);
    setTimeout(() => { if (spuren[szene] !== alt) alt.el.pause(); }, BLENDE * 1000 + 80);
  }
  if (jetzt) {
    jetzt.el.preload = 'auto';
    rampe(jetzt.gain, 1, BLENDE);
  }
  starteMusik();
}
function starteMusik() {
  const s = spuren[szene];
  if (!s || musikStufe === 0 || document.hidden || musikRuht) return;
  if (!s.stueck) setze(szene, naechstes(szene, null));
  if (s.el.paused) s.el.play().catch(() => {});
}
export function schlafen() {
  for (const s of Object.values(spuren)) s.el.pause();
  if (jingleEl) jingleEl.pause();
  if (busGain) rampe(busGain, 1, 0.05);
  if (ctx && ctx.state === 'running') ctx.suspend();
}
export function wecken() { if (ctx && ctx.state === 'suspended') ctx.resume(); starteMusik(); }

/** Für Tests: welche Szene, welches Stück, läuft es, wie laut? */
export function musikZustand() {
  const s = spuren[szene];
  return s ? { szene, stueck: s.stueck, laeuft: !s.el.paused, zeit: s.el.currentTime, stufe: musikStufe, gain: musikGain.gain.value, bus: busGain.gain.value,
    jingle: jingleEl ? !jingleEl.paused : null, karteListe: karteListe(), xmas: xmasTage(),
    andere: Object.entries(spuren).filter(([n]) => n !== szene).map(([n, x]) => ({ szene: n, stueck: x.stueck, laeuft: !x.el.paused, zeit: x.el.currentTime })), ctx: ctx.state } : null;
}
/** Für Tests: Stückende der laufenden Szene auslösen (Spulen geht mit werkzeug/serve.ps1 nicht - kein Range). */
export function musikEnde() { const s = spuren[szene]; if (s) s.el.dispatchEvent(new Event('ended')); }

export function setzeFx(an) { fxAn = an; if (fxGain) fxGain.gain.value = an ? 0.5 : 0; }
/** Musiklautstärke 0 (aus) bis 5. */
export function setzeMusik(stufe) {
  musikStufe = Math.max(0, Math.min(5, stufe));
  stelleMusik();
  if (musikStufe === 0) { for (const sp of Object.values(spuren)) sp.el.pause(); if (jingleEl) jingleEl.pause(); } else starteMusik();
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
    // Christbaumverkauf (22.10.): Sägezug, Knacken beim Fallen, dumpfer Aufschlag,
    // Rascheln durchs Netz, Spanngurt schnappt
    case 'saege': rauschen(0.11, 2600, 1.6, 0.16, 0, 1400); rauschen(0.1, 1800, 1.6, 0.12, 0.12, 2800); break;
    case 'knack': ton(220, 0.05, 'square', 0.12); rauschen(0.08, 1200, 2, 0.2, 0.01); ton(140, 0.08, 'triangle', 0.1, 0.04); break;
    case 'plumps': rauschen(0.22, 260, 0.9, 0.28, 0, 90); ton(90, 0.16, 'sine', 0.18); break;
    case 'rascheln': for (let i = 0; i < 4; i++) rauschen(0.05, 3200 + i * 300, 2.5, 0.07, i * 0.035); break;
    case 'gurt': ton(700, 0.04, 'square', 0.08); ton(420, 0.06, 'triangle', 0.12, 0.03); break;
    // Schlittenglöckchen, leise: der Nikolaus fliegt vorbei
    case 'glocken': for (let i = 0; i < 8; i++) { glocke(2349 + (i % 2) * 300, i * 0.11, 0.05); } break;
  }
}
