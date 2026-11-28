/*
 * zaehler.js - Besucherzählung (26.11., Nutzerwunsch: „wie viele spielen gerade?")
 *
 * GoatCounter (goatcounter.com): ohne Cookies, ohne Kennung auf dem Gerät, keine
 * persönlichen Daten. Gezählt wird nur:
 *   - das Öffnen des Spiels (Pfad „/app" = installiert, „/browser" = im Browser),
 *     auch die Rückkehr in die offene App nach mindestens einer Stunde,
 *   - Ereignisse: ein neues Spiel (mit Spielmodus), „Startziele geschafft",
 *     Dranbleiben (Spieltag 2/3/5/7/14/21 und Heiligabend erreicht, je einmal) und
 *     jede beendete Minispielrunde (welches Spiel) - die beiden seit 26.11. abends.
 * Gesendet wird ein einfacher Bildaufruf (kein fremdes Skript). Nur auf der echten
 * Seite (github.io), nie lokal. Offline schlägt der Aufruf still fehl - das Spiel
 * merkt davon nichts. Steht so auch auf datenschutz.html („Besucherzählung").
 */
import { ZAEHLER } from './config.js?v=202611281000';

const AKTIV = !!ZAEHLER && typeof location !== 'undefined' && /\.github\.io$/.test(location.hostname);

function sende(pfad, titel, ereignis) {
  if (!AKTIV) return;
  try {
    const q = new URLSearchParams({ p: pfad, t: titel, rnd: Math.random().toString(36).slice(2) });
    if (ereignis) q.set('e', 'true');
    else {
      if (document.referrer) q.set('r', document.referrer);
      q.set('s', `${screen.width},${screen.height},${window.devicePixelRatio || 1}`);
    }
    const bild = new Image();
    bild.referrerPolicy = 'no-referrer-when-downgrade';
    bild.src = `https://${ZAEHLER}.goatcounter.com/count?${q}`;
  } catch (e) { /* Zählen ist nie wichtiger als das Spiel */ }
}

const alsApp = () => navigator.standalone === true
  || (window.matchMedia && window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches);

/** Spiel geöffnet (beim Start und bei der Rückkehr nach langer Pause). */
export function geoeffnet() {
  const app = alsApp();
  sende(app ? '/app' : '/browser', app ? 'Spiel geöffnet (App)' : 'Spiel geöffnet (Browser)');
}

/** Ein Ereignis ohne Seitenaufruf, z. B. „neues-spiel-echt". */
export function ereignis(name, titel = name) { sende(name, titel, true); }

// Dranbleiben (26.11., Nutzerwunsch): Wie viele spielen am 2., 3., 5. … Tag noch? Je Gerät und
// Meilenstein EINMAL (gemerkt in st.gezaehlt). Wer Tage überspringt, meldet alle erreichten auf einmal.
const TAGE = [2, 3, 5, 7, 14, 21];
/** `tag` = Spieltag ab 1 (erster Tag = 1), `heiligabend` = Spieldatum zwischen 24.12. und 6.1. */
export function dranbleiben(st, tag, heiligabend) {
  if (!st || !st.intro || !(tag >= 1) || tag > 90) return;   // > 90: alter Stand ohne Starttag
  const g = st.gezaehlt = st.gezaehlt || [];
  for (const n of TAGE) {
    if (tag >= n && !g.includes(`tag-${n}`)) { g.push(`tag-${n}`); ereignis(`tag-${n}`, `Spieltag ${n} erreicht`); }
  }
  const k = `heiligabend-${st.saison ?? ''}`;
  if (heiligabend && !g.includes(k)) { g.push(k); ereignis('heiligabend', 'Heiligabend erreicht'); }
}

const MINI_NAMEN = { lichtung: 'Waldlichtung', baum: 'Christbaumverkauf', back: 'Backstube', eis: 'Eisbahn', berg: 'Schlittenberg', schnee: 'Schneeballschlacht' };
/** Eine Minispielrunde ist zu Ende (welches Spiel, keine Punkte). */
export function minispiel(name) { ereignis(`minispiel-${name}`, `Minispiel: ${MINI_NAMEN[name] || name}`); }

// Rückkehr in die noch offene App: erst nach mindestens einer Stunde Pause erneut zählen
let verstecktSeit = 0;
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) verstecktSeit = Date.now();
    else if (verstecktSeit && Date.now() - verstecktSeit >= 3600 * 1000) { verstecktSeit = 0; geoeffnet(); }
  });
}
