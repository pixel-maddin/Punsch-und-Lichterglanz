/*
 * ereignis.js - die vier Adventssonntage: je ein Fenster mit kleinem
 * Pixelbild, einem Satz, was passiert, und dem, was es freischaltet.
 *
 * Die Bilder sind 180 x 100 Pixel (seit 11.10., vorher 90 x 50).
 */
import * as C from './config.js?v=202610261500';
import * as S from './spiel.js?v=202610261500';
import * as T from './ton.js?v=202610261500';
import * as Z from './zeit.js?v=202610261500';
import { r, p, figurKlein, neueFarben, textBreite } from './pixel.js?v=202610261500';
import { verlauf, sterne, mond, schneeBoden, schneefall, tanne, stern, haus, laterne, kette, licht, leuchten, neueLichter, hash, BUNT, feinBreite, feinGroesse, schrift } from './fein.js?v=202610261500';
import { schriftBild } from './schrift.js?v=202610261500';
import { fenster, karte } from './ui.js?v=202610261500';

// Seit 11.10. in doppelter Auflösung (180 x 100) mit den Bausteinen aus
// fein.js - vorher 90 x 50 und im Fenster „zu grob pixelig".
const BW = 180, BH = 100;

/**
 * Leinwand eines Ereignisfensters auf die feine Stufe bringen (11.10.): so
 * breit, wie bei ¾ Spielpixel je Bildpixel ins Fenster passt (höchstens
 * 180), gezeichnet wird weiter für 180 und die Mitte gezeigt.
 */
function bildKontext(box) {
  const cv = box.querySelector('canvas.ereignisbild');
  const b = feinBreite(cv, BW);
  cv.width = b; cv.height = BH;
  feinGroesse(cv);
  const c = cv.getContext('2d');
  c.translate(-Math.floor((BW - b) / 2), 0);
  return c;
}

function mensch(c, x, fuss, typ) {
  figurKlein(c, { typ, farben: neueFarben(typ), phase: x, laeuft: false }, x, fuss, 0);
}
/** Sänger im roten Gewand mit weißem Kragen und Notenheft (größer als figurKlein). */
function saenger(c, x, fuss, haar, kind) {
  const h = kind ? 15 : 19, o = fuss - h;
  r(c, x - 4, o + 7, 9, h - 7, '#b82a2a'); r(c, x + 3, o + 7, 2, h - 7, '#8a1e1e'); r(c, x - 4, fuss - 1, 9, 1, '#6a1414');
  r(c, x - 3, o + 7, 7, 2, '#f4f4f4');
  r(c, x - 2, o + 1, 5, 6, '#f2c9a0'); p(c, x - 1, o + 3, '#3a2418'); p(c, x + 1, o + 3, '#3a2418'); r(c, x - 1, o + 5, 3, 1, '#c86a5a');
  r(c, x - 3, o, 7, 2, haar); p(c, x - 3, o + 2, haar); p(c, x + 3, o + 2, haar);
  r(c, x - 3, o + 10, 7, 4, '#1e2a5a'); r(c, x, o + 10, 1, 4, '#f4f0e0'); p(c, x - 2, o + 11, '#f4f0e0'); p(c, x + 2, o + 11, '#f4f0e0');
  r(c, x - 4, o + 13, 2, 2, '#f2c9a0'); r(c, x + 3, o + 13, 2, 2, '#f2c9a0');
}
function note(c, x, y, f = '#ffffff') { r(c, x, y, 1, 6, f); r(c, x - 2, y + 5, 3, 2, f); p(c, x + 1, y, f); p(c, x + 2, y + 1, f); }
/** Marktbude mit Satteldach, gestreifter Markise und Auslage. */
function bude(c, x, fuss, b, farbe, ware, winter) {
  r(c, x, fuss - 26, b, 26, '#8a5a32');
  for (let i = 3; i < b; i += 4) r(c, x + i, fuss - 12, 1, 12, '#6a4222');
  r(c, x + 2, fuss - 24, b - 4, 11, '#4a2414'); r(c, x + 3, fuss - 23, b - 6, 9, '#7a3a1e');
  licht(x + b / 2, fuss - 20, '#ffb860', 2);
  r(c, x + 3, fuss - 23, b - 6, 1, '#ffb860');
  r(c, x - 1, fuss - 13, b + 2, 2, '#c89a5a'); r(c, x - 1, fuss - 13, b + 2, 1, '#e0b878');
  // Ware auf dem Tresen
  for (let k = 0; k < (b - 8) / 5; k++) {
    const wx = x + 4 + k * 5;
    if (ware === 'herz') { r(c, wx, fuss - 17, 4, 3, '#a8582a'); p(c, wx + 1, fuss - 18, '#a8582a'); p(c, wx + 3, fuss - 18, '#a8582a'); r(c, wx + 1, fuss - 14, 2, 1, '#a8582a'); p(c, wx + 1, fuss - 16, '#f8f4ea'); }
    else if (ware === 'kerze') { r(c, wx + 1, fuss - 19, 2, 6, BUNT[k % 5]); p(c, wx + 1, fuss - 20, '#ffd060'); licht(wx + 1, fuss - 20, '#ffd060', 0.5); }
    else { r(c, wx, fuss - 16, 3, 3, '#f4f0e8'); r(c, wx + 3, fuss - 15, 1, 2, '#f4f0e8'); r(c, wx, fuss - 17, 3, 1, '#c86a3a'); }   // Tassen Punsch
  }
  if (ware === 'tasse') for (let i = 0; i < 5; i++) p(c, x + 6 + Math.round(Math.sin(i) * 2), fuss - 20 - i * 3, '#d8dce4');
  // Markise mit Bogenkante
  for (let i = 0; i < b + 4; i++) {
    const f = Math.floor(i / 4) % 2 ? '#f4f0e8' : farbe;
    r(c, x - 2 + i, fuss - 30, 1, 5, f);
    if (i % 4 === 1 || i % 4 === 2) p(c, x - 2 + i, fuss - 25, f);
  }
  // Dach
  const dh = Math.ceil(b / 2) + 2;
  for (let i = 0; i < Math.min(dh, 9); i++) {
    const xx = x - 3 + i * 2, ww = b + 6 - i * 4;
    if (ww <= 0) break;
    r(c, xx, fuss - 31 - i, ww, 1, winter && i > 3 ? '#f6f9fc' : i % 2 ? '#6a4222' : '#7a5230');
  }
  if (winter) r(c, x - 3, fuss - 31, b + 6, 1, '#f6f9fc');
}

export const BILDER = {
  // 1. Advent: Weihnachtsmarkt am Abend
  markt(c) {
    neueLichter();
    verlauf(c, 0, 0, BW, 66, ['#0c1238', '#1a2860', '#3a3c78']);
    sterne(c, 34, BW, 40, 1); mond(c, 24, 14);
    // Dorfsilhouette mit Kirchturm
    for (let x = 0; x < BW; x++) { const hh = 8 + (Math.floor(x / 14) % 3) * 3; r(c, x, 62 - hh, 1, hh, '#232c58'); }
    r(c, 138, 26, 9, 30, '#232c58'); for (let i = 0; i < 8; i++) r(c, 138 + Math.floor(i / 2), 26 - i, 9 - Math.floor(i / 2) * 2, 1, '#232c58');
    for (let i = 0; i < 9; i++) { const fx = 6 + i * 19; r(c, fx, 55, 2, 2, '#ffcf6a'); licht(fx, 55, '#ffcf6a', 0.4); }
    schneeBoden(c, 62, BW, 38, 2);
    tanne(c, 92, 70, 44, { schnee: true, lichter: 22, stern: true });
    bude(c, 8, 86, 40, '#c83030', 'herz', true);
    bude(c, 70, 90, 40, '#2f7a3a', 'tasse', true);
    bude(c, 132, 86, 40, '#c83030', 'kerze', true);
    kette(c, 46, 56, 72, 58, 4, 3); kette(c, 108, 58, 134, 56, 4, 3);
    for (const [x, typ] of [[22, 'erwachsen'], [30, 'kind'], [58, 'oma'], [64, 'opa'], [116, 'erwachsen'], [124, 'kind'], [168, 'erwachsen']]) mensch(c, x, 98, typ);
    leuchten(c, 1);
  },
  // 2. Advent und erster Schnee: das Dorf tief verschneit, am Tag
  schnee(c) {
    neueLichter();
    verlauf(c, 0, 0, BW, 64, ['#84acd4', '#a8c8e6', '#d4e4f2']);
    for (const [x, y, w] of [[30, 12, 26], [110, 8, 34], [150, 20, 20]]) for (let k = 0; k < w; k++) { const hh = Math.round(Math.sin(k / w * Math.PI) * 5); r(c, x + k, y - hh, 1, hh + 2, k < w / 2 ? '#f4f8fc' : '#e4ecf6'); }
    for (let x = 0; x < BW; x++) { const hh = 6 + Math.round(Math.sin(x / 17) * 3 + Math.sin(x / 7) * 1); r(c, x, 62 - hh, 1, hh, '#c8d6e6'); }
    for (let x = 3; x < BW; x += 8) tanne(c, x, 63, 12 + Math.floor(hash(x) * 6), { schnee: true, farben: ['#2e6a40', '#225430', '#163a22'] });
    schneeBoden(c, 62, BW, 38, 5);
    haus(c, 8, 82, 34, 22, { wand: '#efe3cc', dach: '#8a4a3a', schnee: true, licht: false });
    haus(c, 132, 80, 38, 24, { wand: '#e6d2b8', dach: '#4a6a8a', schnee: true, licht: false, fachwerk: true });
    // Schneemann mit Hut, Schal und Besen
    const sx = 88, sf = 92;
    for (const [cy, rr] of [[sf - 7, 8], [sf - 19, 6], [sf - 28, 4]]) for (let yy = -rr; yy <= rr; yy++) { const w = Math.round(Math.sqrt(rr * rr - yy * yy)); r(c, sx - w, cy + yy, w * 2 + 1, 1, '#ffffff'); r(c, sx + Math.round(w * 0.4), cy + yy, Math.ceil(w * 0.6) + 1, 1, '#e4ecf6'); }
    r(c, sx - 4, sf - 34, 9, 2, '#1a1a22'); r(c, sx - 3, sf - 40, 7, 6, '#1a1a22'); r(c, sx - 3, sf - 36, 7, 1, '#c83a32');
    p(c, sx - 2, sf - 29, '#1a1a22'); p(c, sx + 1, sf - 29, '#1a1a22'); r(c, sx, sf - 28, 4, 1, '#f08020'); p(c, sx + 4, sf - 28, '#d86010');
    for (let k = -2; k <= 2; k++) p(c, sx + k, sf - 25 + (k * k > 1 ? 0 : 1), '#3a3a44');
    r(c, sx - 6, sf - 23, 13, 2, '#d83a3a'); for (let k = -6; k <= 6; k += 3) p(c, sx + k, sf - 23, '#f4f4f4'); r(c, sx + 4, sf - 22, 2, 6, '#d83a3a');
    for (const yy of [sf - 17, sf - 11]) p(c, sx, yy, '#1a1a22');
    for (let k = 0; k < 9; k++) { p(c, sx - 7 - k, sf - 20 - Math.round(k * 0.6), '#5a3a22'); p(c, sx + 7 + k, sf - 20 - Math.round(k * 0.4), '#5a3a22'); }
    r(c, sx + 16, sf - 30, 1, 30, '#8a5a32'); for (let k = 0; k < 5; k++) r(c, sx + 14 + k, sf - 4 + (k % 2), 1, 4, '#c8a050');
    // Kinder mit Schlitten
    r(c, 46, 94, 14, 2, '#8a5a32'); r(c, 46, 96, 14, 1, '#5a3a22'); p(c, 45, 95, '#5a3a22'); for (let k = 0; k < 10; k++) p(c, 60 + k, 95 - Math.round(k * 0.4), '#c83a32');
    mensch(c, 52, 93, 'kind'); mensch(c, 74, 96, 'kind'); mensch(c, 118, 97, 'erwachsen'); mensch(c, 126, 97, 'kind');
    schneefall(c, BW, 90, 70, 3);
    leuchten(c, 0.2);
  },
  // 3. Advent: Chor vor der Kirche
  chor(c) {
    neueLichter();
    verlauf(c, 0, 0, BW, 72, ['#141c48', '#24305e', '#3a4a80']);
    sterne(c, 28, BW, 40, 7);
    // Kirchenfassade mit Turm, Rosette und hohen Fenstern
    const kx = 90;
    r(c, kx - 36, 26, 72, 46, '#efe7da'); r(c, kx + 32, 26, 4, 46, '#d8cebe');
    for (let i = 0; i < 22; i++) r(c, kx - 38 + Math.round(i * 1.7), 26 - i, 76 - Math.round(i * 3.4), 1, i < 3 ? '#f6f9fc' : i % 3 ? '#8a4a3a' : '#6a3428');
    r(c, kx - 6, 0, 12, 10, '#f4ecde'); r(c, kx + 4, 0, 2, 10, '#dcd2c2');
    for (let yy = -4; yy <= 4; yy++) for (let xx = -4; xx <= 4; xx++) if (xx * xx + yy * yy <= 17) p(c, kx + xx, 18 + yy, xx * xx + yy * yy > 10 ? '#8a6a4a' : BUNT[(Math.abs(xx) + Math.abs(yy)) % 5]);
    licht(kx, 18, '#ffd88a', 2);
    for (const fx of [kx - 26, kx - 16, kx + 12, kx + 22]) {
      r(c, fx - 1, 32, 7, 22, '#6a4a32'); r(c, fx, 34, 5, 19, '#ffc860'); r(c, fx + 1, 33, 3, 1, '#ffc860');
      r(c, fx + 2, 34, 1, 19, '#c88a3a'); r(c, fx, 43, 5, 1, '#c88a3a'); r(c, fx, 34, 2, 6, '#ffe6a0');
      licht(fx + 2, 44, '#ffd88a', 1.5);
    }
    r(c, kx - 7, 50, 14, 22, '#4a2c1a'); r(c, kx - 6, 52, 12, 20, '#7a4a2a'); r(c, kx - 5, 51, 10, 1, '#7a4a2a'); r(c, kx, 52, 1, 20, '#5a3420'); p(c, kx - 2, 62, '#e8c030'); p(c, kx + 2, 62, '#e8c030');
    for (let i = 0; i < 3; i++) r(c, kx - 12 - i * 3, 72 + i * 2, 24 + i * 6, 2, i % 2 ? '#c8c4bc' : '#d8d4cc');
    schneeBoden(c, 72, BW, 28, 9);
    for (let i = 0; i < 3; i++) r(c, kx - 12 - i * 3, 72 + i * 2, 24 + i * 6, 2, i % 2 ? '#c8ccd4' : '#e4e8ee');
    laterne(c, 20, 94, 22); laterne(c, 160, 94, 22);
    tanne(c, 36, 80, 30, { schnee: true }); tanne(c, 146, 80, 28, { schnee: true });
    const haare = ['#3a2a1a', '#c8a060', '#6a4a2a', '#2a1a10', '#d8b878', '#8a4a2a'];
    for (let i = 0; i < 7; i++) saenger(c, 48 + i * 14, 97 - (i % 2), haare[i % 6], i === 3);
    for (const [x, y] of [[40, 52], [62, 44], [118, 40], [140, 50], [100, 30]]) note(c, x, y);
    leuchten(c, 1);
  },
  // 4. Advent: das ganze Dorf leuchtet
  dorf(c) {
    neueLichter();
    verlauf(c, 0, 0, BW, 66, ['#0e1640', '#1c2656', '#30406e']);
    sterne(c, 40, BW, 44, 13); mond(c, 158, 12);
    for (let x = 0; x < BW; x++) { const hh = 4 + Math.round(Math.sin(x / 19) * 2); r(c, x, 64 - hh, 1, hh, '#2a3666'); }
    schneeBoden(c, 64, BW, 36, 11);
    haus(c, 4, 82, 30, 22, { wand: '#efe3cc', dach: '#b8554a', schnee: true, licht: 'bunt' });
    haus(c, 40, 80, 26, 26, { wand: '#e6d2b8', dach: '#5a6e9a', schnee: true, licht: 'bunt', fachwerk: true, kamin: false });
    haus(c, 114, 80, 28, 24, { wand: '#f4ead8', dach: '#4a8a7a', schnee: true, licht: 'bunt' });
    haus(c, 148, 82, 28, 20, { wand: '#dcc8b0', dach: '#c0744a', schnee: true, licht: 'bunt', fachwerk: true });
    tanne(c, 90, 92, 52, { schnee: true, lichter: 30, stern: true });
    laterne(c, 72, 96, 22); laterne(c, 108, 96, 22);
    for (const [x, typ] of [[24, 'erwachsen'], [32, 'kind'], [64, 'oma'], [118, 'erwachsen'], [126, 'kind'], [160, 'opa']]) mensch(c, x, 98, typ);
    schneefall(c, BW, 96, 34, 6);
    leuchten(c, 1);
  },
  // Heiligabend: die Kirche mit offener Tür, das Dorf kommt mit Kerzen
  heiligabend(c) {
    neueLichter();
    verlauf(c, 0, 0, BW, 72, ['#0a1030', '#161f4c', '#283466']);
    sterne(c, 50, BW, 48, 17);
    // Der Stern mit Schweif
    for (let i = 1; i < 18; i++) { const f = i % 3 ? '#e8c030' : '#fff0a0'; p(c, 140 - i, 10 + Math.round(i * 0.7), f); if (i < 10) p(c, 140 - i, 11 + Math.round(i * 0.7), '#b8901e'); }
    stern(c, 141, 9, 3, '#fff0a0');
    haus(c, 4, 80, 30, 22, { wand: '#efe3cc', dach: '#b8554a', schnee: true, licht: 'bunt' });
    haus(c, 40, 80, 26, 18, { wand: '#e6d2b8', dach: '#5a6e9a', schnee: true, licht: 'an', kamin: false });
    // Kirche mit Turm, Glocke und offener Tür
    const kx = 106;
    r(c, kx, 44, 48, 36, '#f0e8dc'); r(c, kx + 45, 44, 3, 36, '#d8cebe');
    for (let i = 0; i < 16; i++) r(c, kx - 2 + Math.round(i * 1.6), 44 - i, 52 - Math.round(i * 3.2), 1, i < 3 ? '#f6f9fc' : i % 3 ? '#8a4a3a' : '#6a3428');
    r(c, kx + 50, 18, 18, 62, '#f4ecde'); r(c, kx + 65, 18, 3, 62, '#dcd2c2');
    for (let i = 0; i < 8; i++) r(c, kx + 50 + i, 18 - i * 2, 18 - i * 2, 2, i === 0 ? '#f6f9fc' : '#3f6a5a');
    r(c, kx + 58, 0, 2, 4, '#e8c030'); r(c, kx + 57, 1, 4, 1, '#e8c030');
    r(c, kx + 54, 26, 10, 10, '#3a2a1e'); r(c, kx + 56, 28, 6, 5, '#e8c030'); r(c, kx + 55, 33, 8, 1, '#c89a2a'); p(c, kx + 59, 34, '#c89a2a');
    for (const fx of [kx + 6, kx + 36]) { r(c, fx - 1, 52, 7, 14, '#6a4a32'); r(c, fx, 53, 5, 12, '#ffc860'); r(c, fx, 53, 2, 5, '#ffe6a0'); licht(fx + 2, 58, '#ffd88a', 1.5); }
    r(c, kx + 17, 60, 14, 20, '#5a3a22'); r(c, kx + 19, 62, 10, 18, '#ffe090'); r(c, kx + 20, 63, 8, 8, '#fff4c8'); licht(kx + 24, 68, '#fff0b0', 3);
    schneeBoden(c, 80, BW, 20, 13);
    for (let y = 80; y < 100; y++) { const w = 5 + Math.round((y - 80) * 0.9); for (let x = kx + 24 - w; x <= kx + 24 + w; x++) if (hash(x + y * 7) < 0.55) p(c, x, y, '#fff4c8'); }
    // Prozession mit Kerzen
    const leute = [[8, 'erwachsen'], [16, 'kind'], [26, 'oma'], [36, 'erwachsen'], [46, 'kind'], [56, 'opa'], [68, 'erwachsen'], [78, 'kind'], [90, 'erwachsen']];
    for (const [x, typ] of leute) {
      mensch(c, x, 96, typ);
      const ky = typ === 'kind' ? 87 : 84;
      r(c, x + 3, ky, 1, 3, '#f4f0e0'); p(c, x + 3, ky - 1, '#ffd060'); licht(x + 3, ky - 1, '#ffd060', 0.8);
    }
    schneefall(c, BW, 96, 40, 8);
    leuchten(c, 1);
  },
  // 4. Advent (11.10.): die Jury vor deinem Haus, mit Klemmbrett und Rosette
  jury(c, platz = 0) {
    neueLichter();
    verlauf(c, 0, 0, BW, 60, ['#1a2458', '#3a3c78', '#8a5a7a']);
    sterne(c, 22, BW, 30, 21);
    for (let x = 0; x < BW; x++) { const hh = 5 + Math.round(Math.sin(x / 15) * 2); r(c, x, 60 - hh, 1, hh, '#3a4672'); }
    schneeBoden(c, 60, BW, 40, 23);
    haus(c, 64, 84, 52, 30, { wand: '#efe3cc', dach: '#8a4a3a', schnee: true, licht: 'bunt' });
    // Kranz an der Tür, damit es DEIN Haus ist
    for (let k = 0; k < 10; k++) { const w = k / 10 * Math.PI * 2; p(c, Math.round(90 + Math.cos(w) * 3), Math.round(68 + Math.sin(w) * 3), k % 3 ? '#2f6a2a' : '#c83030'); }
    tanne(c, 36, 86, 34, { schnee: true, lichter: 16, stern: true });
    tanne(c, 144, 86, 28, { schnee: true, lichter: 12 });
    laterne(c, 22, 92, 20);
    // Banner über dem Haus
    r(c, 46, 20, 88, 11, '#c83030'); r(c, 46, 30, 88, 1, '#8a1e1e'); r(c, 44, 20, 2, 11, '#e8c030'); r(c, 134, 20, 2, 11, '#e8c030');
    schrift(c, 'SCHÖNSTES HAUS', Math.round(90 - textBreite('SCHÖNSTES HAUS') / 2), 23, '#fff4d0', '#6a1414', 1);
    // Die Jury: Bürgermeisterin mit Kette, zwei Beisitzer mit Klemmbrett
    const fuss = 97;
    figurKlein(c, { typ: 'oma', farben: neueFarben('oma'), phase: 1, laeuft: false }, 70, fuss, 0);
    figurKlein(c, { typ: 'erwachsen', farben: neueFarben('erwachsen'), phase: 2, laeuft: false }, 84, fuss, 0);
    figurKlein(c, { typ: 'opa', farben: neueFarben('opa'), phase: 3, laeuft: false }, 98, fuss, 0);
    r(c, 82, fuss - 12, 1, 4, '#e8c030'); r(c, 86, fuss - 12, 1, 4, '#e8c030'); r(c, 83, fuss - 8, 3, 2, '#e8c030');   // Amtskette
    for (const kx of [72, 100]) { r(c, kx, fuss - 11, 4, 5, '#8a5a32'); r(c, kx, fuss - 11, 4, 1, '#c8c8d0'); r(c, kx + 1, fuss - 9, 2, 1, '#f4f0e8'); r(c, kx + 1, fuss - 8, 2, 1, '#f4f0e8'); }
    // Rosette in der Farbe des Platzes (ohne Platz: Urkunde)
    const pl = C.WETTBEWERB.plaetze[platz];
    if (pl) {
      const rx = 152, ry = 14;
      r(c, rx - 4, ry + 5, 3, 9, '#c83030'); r(c, rx + 2, ry + 5, 3, 9, '#c83030'); p(c, rx - 4, ry + 14, '#a82020'); p(c, rx + 4, ry + 14, '#a82020');
      for (let dy = -6; dy <= 6; dy++) { const w = Math.round(Math.sqrt(36 - dy * dy)); r(c, rx - w, ry + dy, w * 2 + 1, 1, dy < -2 ? '#ffffff' : pl.f); }
      for (let k = 0; k < 12; k++) { const w = k / 12 * Math.PI * 2; p(c, Math.round(rx + Math.cos(w) * 7), Math.round(ry + Math.sin(w) * 7), pl.f); }
      r(c, rx - 3, ry - 3, 7, 7, pl.f); r(c, rx - 1, ry - 1, 3, 3, '#ffffff');
      licht(rx, ry, '#fff4c8', 1.6);
    } else {
      r(c, 140, 8, 24, 16, '#f8f0dc'); r(c, 140, 8, 24, 1, '#c8a060'); for (let i = 0; i < 4; i++) r(c, 144, 12 + i * 3, 16, 1, '#a89a80'); p(c, 158, 21, '#c83030');
    }
    schneefall(c, BW, 96, 30, 25);
    leuchten(c, 1);
  },
  // Silvester (11.10.): Feuerwerk über dem verschneiten Dorf
  silvester(c) {
    neueLichter();
    verlauf(c, 0, 0, BW, 70, ['#060a24', '#10183e', '#24305e']);
    sterne(c, 30, BW, 40, 31);
    // Feuerwerk: drei große Kugeln und eine Palme
    const kugelFw = (x, y, rad, f, f2) => {
      for (let k = 0; k < 22; k++) { const w = k / 22 * Math.PI * 2;
        for (let s = 2; s <= rad; s += 2) p(c, Math.round(x + Math.cos(w) * s), Math.round(y + Math.sin(w) * s * 0.9), s > rad - 3 ? f2 : f); }
      p(c, x, y, '#ffffff'); licht(x, y, f2, 3);
    };
    kugelFw(40, 22, 14, '#ff5a5a', '#ffd0c0');
    kugelFw(132, 18, 16, '#5ad0ff', '#e0f6ff');
    kugelFw(88, 34, 10, '#ffe060', '#fff6c0');
    for (let k = 0; k < 9; k++) { const w = Math.PI + k / 8 * Math.PI; for (let s = 1; s < 11; s++) p(c, Math.round(160 + Math.cos(w) * s), Math.round(40 + Math.sin(w) * s * 0.6 + s * s * 0.06), s > 7 ? '#fff0a0' : '#7ae07a'); }
    for (let i = 0; i < 18; i++) p(c, 40 + Math.round(Math.sin(i * 3.1) * 18), 40 + i, i % 3 ? '#ffb060' : '#fff0c0');   // fallende Funken
    // Raketenspuren
    for (const [x, y0, y1] of [[64, 72, 50], [110, 70, 56]]) for (let y = y1; y < y0; y++) if (y % 2) p(c, x + Math.round((y - y1) * 0.1), y, '#ffb060');
    for (let x = 0; x < BW; x++) { const hh = 5 + Math.round(Math.sin(x / 13) * 2); r(c, x, 72 - hh, 1, hh, '#1e2850'); }
    schneeBoden(c, 72, BW, 28, 33);
    haus(c, 6, 90, 30, 22, { wand: '#efe3cc', dach: '#b8554a', schnee: true, licht: 'bunt' });
    haus(c, 60, 92, 46, 30, { wand: '#efe3cc', dach: '#8a4a3a', schnee: true, licht: 'bunt' });
    haus(c, 136, 90, 32, 24, { wand: '#f4ead8', dach: '#4a8a7a', schnee: true, licht: 'an', fachwerk: true });
    tanne(c, 46, 94, 28, { schnee: true, lichter: 12, stern: true });
    for (const [x, typ] of [[116, 'erwachsen'], [124, 'kind'], [34, 'oma']]) mensch(c, x, 98, typ);
    p(c, 127, 86, '#fff8c0'); p(c, 128, 85, '#fff8c0'); p(c, 126, 85, '#ffd060'); licht(127, 85, '#fff0a0', 1);   // Wunderkerze
    leuchten(c, 1);
  },
};

/**
 * Heiligabend (10.10.): das Finale. Erst das Bild mit Glocken, dann der
 * Rückblick auf den Advent, von dort die Festtagskarte.
 */
export function zeigeHeiligabend(danach) {
  S.heiligabendGesehen();   // gleich merken - sonst käme es nach jedem Wegklicken wieder
  T.spiele('spezial');
  T.spiele('glocken'); setTimeout(() => T.spiele('glocken'), 1300); setTimeout(() => T.spiele('glocken'), 2600);
  const bz = S.barbaraZustand();
  const zweig = bz ? `<p>Und am Fenster ist dein Barbarazweig aufgeblüht - mit ${bz.blueten} Blüten.</p>` : '';
  const spaet = Z.dezemberTag() > 24;
  const box = fenster(spaet ? 'Frohe Weihnachten!' : 'Heiligabend', `
    <canvas class="ereignisbild" width="${BW}" height="${BH}"></canvas>
    <p class="zeile-gross">${spaet ? 'Weihnachten ist da!' : 'Die Glocken läuten!'}</p>
    <p>Das ganze Dorf ist auf den Beinen. Mit Kerzen in der Hand ziehen alle zur Kirche - und bleiben bei deinem Haus stehen, um zu singen.</p>
    ${zweig}`,
  [{ text: 'Mein Advent', aktion: () => { setTimeout(() => zeigeRueckblick(danach), 60); } }]);
  BILDER.heiligabend(bildKontext(box));
}

/** Der Rückblick: was in diesem Advent passiert ist. Auch aus dem Menü erreichbar. */
export function zeigeRueckblick(danach) {
  const r0 = S.rueckblick(), z = (n) => Math.round(n).toLocaleString('de-DE');
  const zeilen = [
    ['Gäste bewirtet', z(r0.bedient)],
    ['Sterne verdient', S.formatGeld(r0.verdient)],
    ['Deko am Haus', z(r0.deko)],
    ['Stimmung', `♥ ${z(r0.stimmung)}`],
    ['Getränke im Angebot', z(r0.getraenke)],
    ['Türchen geöffnet', `${z(r0.tueren)} von 24`],
  ];
  if (r0.rekorde) zeilen.push(['Minispiele gespielt', z(r0.rekorde)]);
  if (r0.santa) zeilen.push(['Weihnachtsmann entdeckt', `${z(r0.santa)}-mal`]);
  if (r0.blueten) zeilen.push(['Blüten am Barbarazweig', z(r0.blueten)]);
  if (r0.wettbewerb != null) zeilen.push(['Schönstes Haus im Dorf', C.WETTBEWERB.plaetze[r0.wettbewerb] ? `${C.WETTBEWERB.plaetze[r0.wettbewerb].name} (${r0.wettbewerb + 1}. Platz)` : 'Urkunde']);
  if (r0.voegel) zeilen.push(['Vogelarten am Futterhaus', `${z(r0.voegel)} von ${C.VOEGEL.length}`]);
  if (r0.schneemann) zeilen.push(['Eigener Schneemann', r0.schneemann >= C.SCHNEEMANN_STUFEN ? 'fertig gebaut' : `${r0.schneemann} von ${C.SCHNEEMANN_STUFEN} Stufen`]);
  if (r0.schneekatze) zeilen.push(['Schneekatze auf dem Dach', r0.schneekatze >= C.SCHNEEMANN_STUFEN ? 'fertig gebaut' : `${r0.schneekatze} von ${C.SCHNEEMANN_STUFEN} Stufen`]);
  fenster(`Der Advent von ${S.st.name || 'deinem Haus'}`, `
    <div class="statistik rueckblick">${zeilen.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>
    <p class="klein">Danke fürs Mitfeiern - frohe Weihnachten!</p>`,
  [
    { text: 'Festtagskarte', aktion: () => { setTimeout(() => karte('heilig', false, 'Frohe Weihnachten!'), 60); } },
    { text: 'Schließen', neben: true, aktion: () => { if (danach) setTimeout(danach, 60); } },
  ]);
}

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
    ${Z.adventssonntag() === n ? '<p class="klein">Heute, am Adventssonntag, kommen besonders viele Gäste.</p>' : ''}
    ${n === 3 && Z.adventKerzen() === 3 && S.spieltag() + 7 >= C.WETTBEWERB.abSpieltag ? '<p class="bonus">Am 4. Advent kürt das Dorf das schönste Haus - schmück, was das Zeug hält!</p>' : ''}`,
  [{ text: 'Wunderbar!', aktion: () => { if (danach) setTimeout(danach, 60); } }]);
  BILDER[e.bild](bildKontext(box));
}

/**
 * Der erste Schnee (10.10.): Die Musik hält kurz inne, das Bild beschlägt an
 * den Rändern, eine große Flocke schwebt herab und legt sich mitten aufs
 * Display. Danach das Fenster mit dem Bild vom verschneiten Dorf.
 */
export function zeigeErsterSchnee(danach) {
  S.st.schneemannHinweis = true;   // das Fenster nennt den Schneehaufen
  const huelle = document.getElementById('huelle') || document.body;
  const ov = document.createElement('div');
  ov.className = 'erster-schnee';
  // 35 x 35 in Spielpixeln (11.10.: vorher 17 x 17, auf die doppelte Größe gezogen)
  ov.innerHTML = '<div class="frost"></div><canvas class="flocke" width="35" height="35"></canvas>';
  const c = ov.querySelector('canvas').getContext('2d');
  // Sechsstrahlige Flocke, pixelgenau
  const f = '#ffffff', g = '#d8ecff', m = 17;
  // Sechs Arme im 60°-Abstand, jeder mit drei Paar Seitenzweigen
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 2 + k * Math.PI / 3, dx = Math.cos(a), dy = Math.sin(a);
    for (let i = 0; i <= 17; i++) p(c, Math.round(m + dx * i), Math.round(m + dy * i), i > 14 ? g : f);
    for (const [i, l] of [[6, 4], [10, 3], [13, 2]]) for (const s2 of [-1, 1]) {
      const b2 = a + s2 * Math.PI / 3;
      for (let j = 1; j <= l; j++) p(c, Math.round(m + dx * i + Math.cos(b2) * j), Math.round(m + dy * i + Math.sin(b2) * j), j === l ? g : f);
    }
  }
  // Sechseck in der Mitte
  for (let y = -2; y <= 2; y++) for (let x = -2 + Math.abs(y) / 2; x <= 2 - Math.abs(y) / 2; x++) p(c, Math.round(m + x), m + y, g);
  p(c, m, m, f);
  huelle.appendChild(ov);
  T.musikPause(true);
  setTimeout(() => T.spiele('glocken'), 2600);
  setTimeout(() => {
    ov.classList.add('weg');
    T.musikPause(false);
    setTimeout(() => ov.remove(), 900);
    const box = fenster('Der erste Schnee!', `
      <canvas class="ereignisbild" width="${BW}" height="${BH}"></canvas>
      <p class="zeile-gross">Über Nacht ist alles weiß geworden.</p>
      <p>Im Weihnachtsladen gibt es jetzt Schneemänner, und auf dem Weiher glänzt das Eis.</p>
      <p class="bonus">Auf dem Gehweg und auf dem Dach liegt jetzt je ein Schneehaufen. Tipp sie jeden Tag einmal an - mal sehen, was daraus wird!</p>`,
    [{ text: 'Wie schön!', aktion: () => { if (danach) setTimeout(danach, 60); } }]);
    BILDER.schnee(bildKontext(box));
  }, 3600);
}

/**
 * Das schönste Haus im Dorf (11.10.): Die Jury kommt am 4. Advent (gleich
 * nach dessen Fenster). Platz nach Stimmung, Lohn in Minuten Einnahmen, und
 * eine Plakette an der Hauswand.
 */
export function zeigeWettbewerb(danach) {
  const e = S.wettbewerbAuswerten();
  const pl = C.WETTBEWERB.plaetze[e.platz];
  T.spiele(pl ? 'spezialKasse' : 'kasse');
  const kopf = pl ? `${e.platz + 1}. Platz!` : 'Eine Urkunde!';
  const text = pl
    ? `<p>Die Jury ist durchs ganze Dorf gegangen. Bei deinem Haus bleibt sie lange stehen, flüstert, schreibt - und dann ist es entschieden: <b>${pl.name}</b> für dich!</p><p class="klein">Die Plakette hängt ab jetzt an deiner Hauswand.</p>`
    : '<p>Die Jury ist durchs ganze Dorf gegangen. Für einen Platz hat es diesmal nicht gereicht - aber für eine Urkunde: „Mit viel Liebe geschmückt“.</p>';
  const box = fenster('Das schönste Haus im Dorf', `
    <canvas class="ereignisbild" width="${BW}" height="${BH}"></canvas>
    <p class="zeile-gross">${kopf}</p>
    ${text}
    <p class="bonus">+${S.formatGeld(e.betrag)} · Stimmung ♥ ${e.stimmung.toLocaleString('de-DE')}</p>`,
  [{ text: 'Juhu!', aktion: () => { if (danach) setTimeout(danach, 60); } }]);
  BILDER.jury(bildKontext(box), e.platz);
}

/**
 * Die Jury-Ansage (25.10., Nutzerwunsch „3-4 Tage vorher"): einmal je Saison ab 4 Tage vor dem
 * 4. Advent (`S.juryAnsageFaellig`). Sagt, wann sie kommt, wie viel ♥ das Haus hat und was für
 * Bronze, Silber und Gold noch fehlt - damit man die Tage nutzen kann.
 */
export function zeigeJuryAnsage(danach) {
  const tage = S.wettbewerbInTagen();
  S.juryAngesagt();
  const s = S.stimmung();
  T.spiele('spezial');
  const wann = tage === 1 ? 'morgen' : `in ${tage} Tagen (am 4. Advent)`;
  const stufen = [...C.WETTBEWERB.plaetze].reverse().map((pl) => s >= pl.ab
    ? `<li><b>${pl.name}</b> ab ♥ ${pl.ab} - schon geschafft!</li>`
    : `<li><b>${pl.name}</b> ab ♥ ${pl.ab} - noch ♥ ${(pl.ab - s).toLocaleString('de-DE')}</li>`).join('');
  const box = fenster('Die Jury kommt!', `
    <canvas class="ereignisbild" width="${BW}" height="${BH}"></canvas>
    <p>Das Dorf sucht das <b>schönste Haus</b>! Die Jury kommt ${wann} und schaut sich jedes Haus genau an.</p>
    <p>Dein Haus hat gerade <b>♥ ${s.toLocaleString('de-DE')}</b> Stimmung:</p>
    <ul class="jury-stufen">${stufen}</ul>
    <p class="klein">Mehr Deko bringt mehr Stimmung - und jeder Platz eine Belohnung.</p>`,
  [{ text: 'Ich schmücke weiter!', aktion: () => { if (danach) setTimeout(danach, 60); } }]);
  BILDER.jury(bildKontext(box), 0);
}

/**
 * Silvester (11.10.): Feuerwerk und der Abschluss der Saison. Einmal je
 * Saison, ab dem 31.12., SILVESTER_STUNDE Uhr.
 */
export function zeigeSilvester(danach) {
  S.silvesterGesehen();
  T.spiele('feuerwerk'); setTimeout(() => T.spiele('feuerwerk'), 700); setTimeout(() => T.spiele('feuerwerk'), 1500);
  const d = Z.jetzt(), neu = d.getMonth() === 0;
  const jahr = neu ? d.getFullYear() : d.getFullYear() + 1;
  const box = fenster(neu ? 'Frohes neues Jahr!' : 'Guten Rutsch!', `
    <canvas class="ereignisbild" width="${BW}" height="${BH}"></canvas>
    <p>${neu ? `Das Dorf hat ${jahr} mit einem großen Feuerwerk begrüßt` : 'Das ganze Dorf steht draußen, Raketen steigen über die Dächer'} - und dein Haus leuchtet mittendrin.</p>
    <div class="abschied"></div>
    <p>Vielen Dank fürs Spielen! :)</p>
    <p class="klein">Dein Haus bleibt so geschmückt, wie es ist. Im nächsten Advent geht es von vorne los - und alles, was du dieses Jahr geschafft hast, bleibt als Andenken.</p>`,
  [
    { text: 'Mein Advent', aktion: () => { setTimeout(() => zeigeRueckblick(danach), 60); } },
    { text: 'Weiter', neben: true, aktion: () => { if (danach) setTimeout(danach, 60); } },
  ]);
  BILDER.silvester(bildKontext(box));
  // „Bis zum nächsten Jahr!" in der Weihnachtsschrift, 1:1 in Spielpixeln
  // (dreizeilig: einzeilig wäre sie bei k = 2 doppelt so breit wie das Fenster)
  for (const zeile of ['BIS ZUM', 'NÄCHSTEN', 'JAHR!']) {
    const cv = schriftBild(zeile, 'gold', 2);
    cv.className = 'schriftbild';
    cv.style.height = `calc(var(--px) * ${cv.height})`;
    box.querySelector('.abschied').appendChild(cv);
  }
}
