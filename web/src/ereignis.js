/*
 * ereignis.js - die vier Adventssonntage: je ein Fenster mit kleinem
 * Pixelbild, einem Satz, was passiert, und dem, was es freischaltet.
 *
 * Die Bilder sind 90 x 50 Pixel, im Fenster dreifach vergrößert.
 */
import * as C from './config.js?v=20261009a';
import * as S from './spiel.js?v=20261009a';
import * as T from './ton.js?v=20261009a';
import * as Z from './zeit.js?v=20261009a';
import { r, p, figurKlein, neueFarben } from './pixel.js?v=20261009a';
import { fenster } from './ui.js?v=20261009a';

const BW = 90, BH = 50;
const BUNT = ['#ff4a4a', '#5aff6a', '#4a8aff', '#ffd040', '#ff6adf'];

function himmel(c, oben, unten) {
  for (let y = 0; y < BH; y++) { c.fillStyle = y < 20 ? oben : unten; c.fillRect(0, y, BW, 1); }
}
function sterne(c, n, bis) {
  for (let i = 0; i < n; i++) p(c, (i * 37) % BW, (i * 13) % bis, i % 3 ? '#fff8e0' : '#b8c0e0');
}
function haeuschen(c, x, fuss, bw, h, dach, wand, schnee, licht) {
  r(c, x, fuss - h, bw, h, wand);
  const dh = Math.ceil(bw / 2) + 1;
  for (let i = 0; i < dh; i++) r(c, x - 1 + i, fuss - h - i, bw + 2 - i * 2, 1, schnee && i < 3 ? '#f4f8fc' : dach);
  for (let fx = x + 2; fx < x + bw - 2; fx += 4) r(c, fx, fuss - h + 2, 2, 2, licht ? '#ffd070' : '#4a5060');
  if (licht === 'bunt') for (let i = 0; i < dh; i += 1) { p(c, x - 1 + i, fuss - h - i, BUNT[i % 5]); p(c, x + bw - i, fuss - h - i, BUNT[(i + 2) % 5]); }
}
function mensch(c, x, fuss, typ) {
  figurKlein(c, { typ, farben: neueFarben(typ), phase: x, laeuft: false }, x, fuss, 0);
}

const BILDER = {
  // 1. Advent: Marktbuden mit Lichterketten
  markt(c) {
    himmel(c, '#1a2250', '#2e3a70'); sterne(c, 18, 20);
    r(c, 0, 38, BW, 12, '#dfe6ee');
    const buden = [[4, '#c83030'], [34, '#2f7a3a'], [64, '#c83030']];
    for (const [x, f] of buden) {
      r(c, x, 26, 22, 12, '#8a5a32'); r(c, x + 2, 28, 18, 5, '#ffc870');
      for (let i = 0; i < 24; i++) p(c, x - 1 + i, 24, i % 4 < 2 ? f : '#f4f0e8'), p(c, x - 1 + i, 25, i % 4 < 2 ? f : '#f4f0e8');
      for (let i = 0; i < 6; i++) r(c, x + 1 + i * 4, 21, 2, 2, BUNT[(i + x) % 5]);
      r(c, x, 38, 22, 1, '#6a4222');
    }
    mensch(c, 16, 46, 'erwachsen'); mensch(c, 26, 46, 'kind'); mensch(c, 50, 47, 'oma'); mensch(c, 76, 46, 'erwachsen');
    r(c, 44, 3, 3, 3, '#ffe060'); p(c, 45, 1, '#ffe060'); p(c, 45, 7, '#ffe060'); p(c, 42, 4, '#ffe060'); p(c, 48, 4, '#ffe060');
  },
  // 2. Advent: tief verschneit
  schnee(c) {
    himmel(c, '#9cc0dc', '#c8dcec');
    haeuschen(c, 6, 36, 16, 10, '#8a4a3a', '#efe3cc', true, false);
    haeuschen(c, 60, 34, 18, 11, '#4a6a8a', '#e6d2b8', true, false);
    r(c, 0, 34, BW, 16, '#f4f8fc');
    for (let x = 0; x < BW; x++) r(c, x, 32 + Math.round(Math.sin(x * 0.15) * 2), 1, 3, '#f4f8fc');
    for (let x = 0; x < BW; x += 3) p(c, x, 40 + (x % 5), '#d4deea');
    // Schneemann
    r(c, 40, 36, 7, 6, '#ffffff'); r(c, 41, 31, 5, 5, '#ffffff'); r(c, 41, 29, 5, 2, '#1a1a22'); p(c, 44, 33, '#f08020');
    for (let i = 0; i < 40; i++) p(c, (i * 37 + i * i * 7) % BW, (i * 53 + i * i) % 32, '#ffffff');
    mensch(c, 26, 46, 'kind'); mensch(c, 56, 47, 'kind');
  },
  // 3. Advent: Chor vor der Kirche
  chor(c) {
    himmel(c, '#26305e', '#3a4a80'); sterne(c, 12, 16);
    r(c, 25, 10, 40, 30, '#f0e8dc'); for (let i = 0; i < 20; i++) r(c, 24 + i, 10 - Math.floor(i / 2), 42 - i * 2 > 0 ? 42 - i * 2 : 0, 1, '#8a4a3a');
    r(c, 40, 2, 10, 12, '#f4ecde'); r(c, 43, 0, 4, 2, '#3f6a5a');
    for (const x of [30, 52]) { r(c, x, 16, 6, 10, '#ffc860'); r(c, x + 2, 16, 1, 10, '#a86a2a'); }
    r(c, 41, 26, 8, 14, '#6a3e22');
    r(c, 0, 40, BW, 10, '#dfe6ee');
    for (let i = 0; i < 6; i++) {
      const x = 12 + i * 13;
      r(c, x - 3, 34, 7, 11, '#b82a2a'); r(c, x - 3, 34, 7, 2, '#f4f4f4');
      r(c, x - 2, 29, 5, 5, '#f2c9a0'); r(c, x - 2, 28, 5, 2, ['#3a2a1a', '#c8a060', '#6a4a2a'][i % 3]);
      r(c, x - 1, 37, 4, 3, '#2a2a3a');
      p(c, x, 32, '#5a2a1a');
    }
    for (let i = 0; i < 4; i++) { const x = 18 + i * 18, y = 18 - (i % 2) * 4; r(c, x, y, 1, 4, '#ffffff'); r(c, x - 2, y + 3, 2, 2, '#ffffff'); }
  },
  // 4. Advent: das Dorf leuchtet
  dorf(c) {
    himmel(c, '#141c48', '#26305e'); sterne(c, 24, 18);
    r(c, 0, 38, BW, 12, '#dfe6ee');
    haeuschen(c, 3, 38, 14, 10, '#b8554a', '#efe3cc', true, 'bunt');
    haeuschen(c, 22, 38, 12, 12, '#5a6e9a', '#e6d2b8', true, 'bunt');
    haeuschen(c, 56, 38, 14, 11, '#4a8a7a', '#f4ead8', true, 'bunt');
    haeuschen(c, 74, 38, 13, 9, '#c0744a', '#dcc8b0', true, 'bunt');
    // Baum mit Stern in der Mitte
    for (let i = 0; i < 22; i++) r(c, 45 - Math.floor(i / 2), 15 + i, Math.floor(i / 2) * 2 + 1, 1, '#2a5a32');
    for (let i = 0; i < 10; i++) p(c, 45 + Math.round(Math.sin(i * 1.7) * i * 0.9), 19 + i * 2, BUNT[i % 5]);
    r(c, 44, 12, 3, 3, '#ffe060'); p(c, 45, 10, '#ffe060');
    r(c, 44, 37, 3, 2, '#5a3a22');
    mensch(c, 36, 47, 'erwachsen'); mensch(c, 54, 47, 'oma'); mensch(c, 60, 47, 'kind');
  },
};

export function zeigeAdvent(n, danach) {
  const e = C.ADVENT_EREIGNIS[n];
  if (!e) { danach && danach(); return; }
  const neu = S.adventFreischaltungen(n);
  T.spiele('spezial');
  const box = fenster(e.titel, `
    <canvas class="ereignisbild" width="${BW}" height="${BH}"></canvas>
    <p class="zeile-gross">${e.zeile}</p>
    <p>${e.text}</p>
    ${neu.length ? `<p class="bonus">Neu freigeschaltet: ${neu.join(', ')}</p>` : ''}
    ${Z.adventssonntag() === n ? '<p class="klein">Heute, am Adventssonntag, kommen besonders viele Gäste.</p>' : ''}`,
  [{ text: 'Wunderbar!', aktion: () => { if (danach) setTimeout(danach, 60); } }]);
  const c = box.querySelector('canvas').getContext('2d');
  BILDER[e.bild](c);
}
