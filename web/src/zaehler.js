/*
 * zaehler.js - Besucherzählung (26.11., Nutzerwunsch: „wie viele spielen gerade?")
 *
 * GoatCounter (goatcounter.com): ohne Cookies, ohne Kennung auf dem Gerät, keine
 * persönlichen Daten. Gezählt wird nur:
 *   - das Öffnen des Spiels (Pfad „/app" = installiert, „/browser" = im Browser),
 *     auch die Rückkehr in die offene App nach mindestens einer Stunde,
 *   - zwei Ereignisse: ein neues Spiel (mit Spielmodus) und „Startziele geschafft".
 * Gesendet wird ein einfacher Bildaufruf (kein fremdes Skript). Nur auf der echten
 * Seite (github.io), nie lokal. Offline schlägt der Aufruf still fehl - das Spiel
 * merkt davon nichts. Steht so auch auf datenschutz.html („Besucherzählung").
 */
import { ZAEHLER } from './config.js?v=202611261300';

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
export function ereignis(name) { sende(name, name, true); }

// Rückkehr in die noch offene App: erst nach mindestens einer Stunde Pause erneut zählen
let verstecktSeit = 0;
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) verstecktSeit = Date.now();
    else if (verstecktSeit && Date.now() - verstecktSeit >= 3600 * 1000) { verstecktSeit = 0; geoeffnet(); }
  });
}
