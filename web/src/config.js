/*
 * config.js - ALLE Stellschrauben von „Punsch & Lichterglanz".
 *
 * Wer an der Balance dreht, dreht hier. Preise, Kosten, Stimmung und
 * Boni stehen nur an dieser einen Stelle; Shop, Tresen und Szene lesen
 * sie von hier.
 */

// ---------------------------------------------------------------------------
// Bildaufbau (logische Pixel; das Canvas wird per CSS hochskaliert)
// ---------------------------------------------------------------------------
export const B = 180;          // Breite in Pixeln - fest
export const H_MIN = 300;      // Mindesthöhe; darunter wird nach Höhe skaliert
export const H_MAX = 440;      // Höher wird es nicht, der Rest ist Rand
export const LEISTE = 26;      // DOM-Leiste unten (Laden, Kalender, …)
export const STAND_H = 128;    // Tresenansicht über der Leiste
export const HUD_H = 20;       // DOM-Kopfzeile oben

// Tresenansicht, relativ zu ihrer Oberkante
export const T_GAST = 52;      // Höhe der Gästezone
export const T_BRETT = 22;     // Höhe des Tresenbretts (Gläser, Hand, Ausguss)
export const T_ZELLE_B = 36;   // Regal: 5 Spalten
export const T_ZELLE_H = 27;   // Regal: 2 Reihen

// ---------------------------------------------------------------------------
// Getränke und Speisen
// ---------------------------------------------------------------------------
// zeit: Zubereitung in Sekunden, nachdem man auf den Topf getippt hat.
//       Teurere Getränke brauchen länger - sie bringen mehr, kosten aber
//       Zeit am Tresen. (Crêpe: siehe CREPE_ZEIT, das Backen ist die Zeit.)
// art: 'topf'   = Glas holen, abfüllen, Topf leert sich
//      'dose'   = direkt greifen (kein Glas), Dose leert sich
//      'platte' = backen lassen, dann greifen
// alk: Kinder bestellen nur, was false ist. Seit 30.09. ist ALLES alkoholfrei
//      (Nutzerwunsch, auch für den Play Store): fiktive Namen statt Glühwein,
//      Eierpunsch, Jägertee, Weißer Glühwein, Feuerzangenbowle. Die IDs bleiben
//      (Spielstände!). Kinder kommen ab dem Kinderpunsch (spiel.js).
// Beträge in GANZEN Sternen: seit 29.09. alles ×10 (vorher 1,20 Sterne für
// Kinderpunsch, jetzt 12) - ganze Zahlen fühlen sich großzügiger an, schwerer
// wird dadurch nichts. Alte Spielstände werden in spiel.js umgerechnet.
export const PRODUKTE = [
  { id: 'gluehwein',    name: 'Sternenpunsch',    preis: 10, zeit: 0.4,  kosten: 0,     art: 'topf',   farbe: '#8a1830', alk: false },
  { id: 'kinderpunsch', name: 'Kinderpunsch',     preis: 12, zeit: 0.5,  kosten: 200,    art: 'topf',   farbe: '#ee6d9a', alk: false, griffe: ['zuckerstange'], bonus: 0.20 },
  { id: 'apfel',        name: 'Heißer Apfel',     preis: 14, zeit: 0.7,  kosten: 600,    art: 'topf',   farbe: '#e8942e', alk: false, griffe: ['ruehren'], bonus: 0.25 },
  { id: 'lebkuchen',    name: 'Lebkuchen',        preis: 15, zeit: 0.2,  kosten: 1500,   art: 'dose',   farbe: '#9a5a2a', alk: false, griffe: ['guss'], bonus: 0.25 },
  { id: 'schoko',       name: 'Heiße Schokolade', preis: 18, zeit: 1.0,  kosten: 3000,   art: 'topf',   farbe: '#6b3a22', alk: false, griffe: ['sahne'], bonus: 0.30 },
  { id: 'eierpunsch',   name: 'Herzwärmer',       preis: 20, zeit: 1.2,  kosten: 6000,  art: 'topf',   farbe: '#f3e38a', alk: false, griffe: ['sahne', 'zimtpulver'], bonus: 0.40 },
  { id: 'jaegertee',    name: 'Waldtee',          preis: 24, zeit: 1.4,  kosten: 12000,  art: 'topf',   farbe: '#3f7a3a', alk: false, griffe: ['beutel'], bonus: 0.40 },
  { id: 'crepe',        name: 'Crêpe',            preis: 28, zeit: 0,  kosten: 18000,  art: 'platte', farbe: '#f0c070', alk: false, griffe: ['wenden'], bonus: 0.40 },
  { id: 'weisser',      name: 'Zimtwolke',        preis: 32, zeit: 1.7, kosten: 86000, art: 'topf',   farbe: '#efe7c0', alk: false, griffe: ['schaum', 'zimt'], bonus: 0.45 },
  { id: 'feuerzange',   name: 'Feuerzauber',      preis: 40, zeit: 2.4, kosten: 165000, art: 'topf',   farbe: '#a01818', alk: false, griffe: ['zucker'], bonus: 0.50 },
];
// griffe: die Handgriffe, die nur DU machst - nach dem Einschenken das Glas
// auf dem Tablett antippen, in dieser Reihenfolge (je `n`-mal). Fertig zahlt
// der Gast `bonus` mehr; ohne zahlt er den normalen Preis (keine Strafe).
// Der Servier-Wichtel macht sie nie selbst (auch nicht, was er dir einschenkt) - sie sind der Grund,
// selbst am Tresen zu stehen. Seit 30.09. bringt JEDES neue Getränk eine neue
// Art Handgriff mit (Nutzerwunsch: „immer schwieriger in der Zubereitung"):
// 1 Tipp → mehrfach tippen → Reihenfolge → Timing. `timing`: der Griff hat
// ein Zeitfenster (Anteil von `dauer`), zu früh oder zu spät = kein Bonus.
export const HANDGRIFF = {
  zuckerstange: { name: 'Zuckerstange', satz: 'eine Zuckerstange rein', n: 1 },
  ruehren:      { name: 'Umrühren',     satz: 'dreimal umrühren', n: 3 },
  guss:         { name: 'Zuckerguss',   satz: 'Zuckerguss drauf', n: 1 },
  sahne:        { name: 'Sahne',        satz: 'Sahne drauf', n: 1 },
  zimtpulver:   { name: 'Zimt',         satz: 'Zimt darüberstreuen', n: 1 },
  schaum:       { name: 'Milchschaum',  satz: 'Milch aufschäumen (2-mal tippen)', n: 2 },
  zimt:         { name: 'Zimtstange',   satz: 'eine Zimtstange rein', n: 1 },
  zucker:       { name: 'Zuckerhut',    satz: 'den Zuckerhut anzünden - und servieren, solange er brennt', n: 1 },
  // Timing (seit 30.09.): Tee ziehen lassen, Crêpe wenden (auf der Platte)
  beutel:       { name: 'Teebeutel',    satz: 'den Teebeutel herausziehen, wenn der Balken im Grünen ist', n: 1, timing: { dauer: 3.0, von: 0.45, bis: 0.75 } },
  wenden:       { name: 'Wenden',       satz: 'den Crêpe wenden, wenn der Balken im Grünen ist', n: 1, timing: { von: 0.40, bis: 0.65 } },
};
export const FEUER_FENSTER = 5;    // s, die der angezündete Zuckerhut brennt - nur so lange gibt es den Bonus
export const EXTRA = HANDGRIFF;    // alter Name
export const EXTRA_BONUS = 0.30;   // Rückfall, wenn ein Getränk keinen eigenen `bonus` hat
export const ZUCKER_ZEIT = 1.2;    // s, die der Zuckerhut brennt
export const PRODUKT = Object.fromEntries(PRODUKTE.map((p) => [p.id, p]));

export const TOPF_PORTIONEN = [6, 10, 16, 25];   // je Stufe „Größere Töpfe"
export const NACHFUELL_TIPPS = 4;                // so oft tippen, bis voll
export const NACHFUELL_ZEIT = [0, 5, 3, 1.5];    // Nachfüll-Wichtel je Stufe (s)
export const SERVIER_TAKT = [0, 8, 5.5, 3.8, 2.6, 1.8, 1.2]; // Servier-Wichtel (s)
export const TABLETT = [1, 2, 3];                // Dinge gleichzeitig in der Hand
export const TRESEN = [1, 2, 3];                 // Gäste gleichzeitig am Tresen
export const CREPE_ZEIT = 3.5;                   // Backzeit (s)
export const SPUEL_ZEIT = 1.5;                   // Spül-Wichtel: alle so viele s ein Glas aufs Tablett
export const WICHTEL_EINSCHENKEN = 0.8;          // s, die der Wichtel länger braucht als du (Glas holen, eingießen)
export const WICHTEL_WARTEN = 4;               // s, die ein eingeschenktes Glas auf dich wartet, bevor der Wichtel selbst serviert
export const JUBEL_ZEIT = 0.375;                 // s Freudensprung, wenn du selbst bedienst (20 % flotter als 0,45)

// ---------------------------------------------------------------------------
// Gäste
// ---------------------------------------------------------------------------
export const GAST_BASIS = 4.0;      // s zwischen zwei Gästen ohne jede Deko
export const GAST_MIN = 1.0;        // schneller kommen sie nie
export const STIMMUNG_TAKT = 35;    // bei so viel Stimmung kommen doppelt so viele
export const STIMMUNG_PREIS = 0.001;// je Stimmungspunkt zahlen Gäste 0,1 % mehr
export const TRINKGELD_MAX = 0.30;  // bei sofortigem Servieren
export const SCHWUNG_FENSTER = 5;   // s bis zum nächsten Servieren, sonst reißt er
export const SCHWUNG_MAX = 10;
export const SCHWUNG_PRO = 0.04;    // +4 % je Stufe, also bis ×1,40
export const SCHLANGE_MAX = 6;
export const SCHLANGE_GEDULD = 22;  // s in der Schlange, dann gehen sie
export const SPEZIAL_CHANCE = 0.04; // je neuem Gast, nur wenn die App offen ist
export const GRUMMEL_ANTEIL = 0;     // so viel vom Kassenstand klaut er - seit 29.09. nichts mehr, er zieht nur grummelnd ab
export const GRUMMEL_MIN = 20;
export const SPEZIAL_PAUSE = 90;    // s Mindestabstand zwischen zwei besonderen Gästen

// „Chef am Stand": Wer in den letzten CHEF_ZEIT Sekunden am Stand getippt
// hat, ist da - dann arbeiten alle Wichtel schneller, und nur dann kommen
// besondere Gäste und Großbestellungen (die bedient ohnehin nur die Hand).
export const CHEF_ZEIT = 20;
export const CHEF_TEMPO = 1.5;

// Der Nikolaus fliegt vorbei: ganz selten, nur solange das Spiel offen ist.
// Antippen schenkt so viele Minuten normaler Einnahmen (mindestens 20).
export const SCHLITTEN_ERST = 120;          // s nach Sitzungsbeginn frühestens (bis 09.10.: 240 - kurze Besuche sahen ihn nie)
export const SCHLITTEN_PAUSE = [300, 700];  // s zwischen zwei Flügen
export const SCHLITTEN_DAUER = 9;           // s, bis er über den Himmel ist
export const SCHLITTEN_MINUTEN = 3;
export const SCHLITTEN_MIN = 200;

// Großbestellung: eine Gruppe bestellt viele Gläser EINER Sorte auf einmal,
// mit Zeitlimit. Nur von Hand; der Lohn kommt am Ende als Ganzes.
export const GROSS_ERST = 150;      // s nach Sitzungsbeginn frühestens
export const GROSS_PAUSE = 200;     // s zwischen zwei Großbestellungen (±20 %)
export const GROSS_AB_BEDIENT = 40; // erst, wenn man den Stand kennt
export const GROSS_MULT = 3;        // je Glas so viel mal der Preis …
export const GROSS_MINUTEN = 2.5;   // … aber mindestens so viele Minuten Einnahmen
export const GROSS_ZEIT_BASIS = 20; // Zeitlimit: Basis + je Glas
export const GROSS_ZEIT_JE = 4.5;

// Stoßzeit: belohnt längeres Spielen. Nach so vielen Sekunden am Stück
// kommt eine Gruppe mit doppeltem Trinkgeld.
export const STOSS_NACH = 240;
export const STOSS_DAUER = 40;
export const STOSS_GAESTE = 6;
export const STOSS_GRUPPEN = ['Der Kirchenchor', 'Die Nachbarschaft', 'Der Kegelclub', 'Die Feuerwehr', 'Der Posaunenchor'];

// Während die App zu ist, arbeiten nur die Wichtel - und nicht so gut wie du.
// Die Kiste fasst seit 09.10. höchstens 3 Stunden (vorher 8): Wer mehrmals am
// Tag kurz reinschaut, holt jedes Mal eine volle Kiste - wer nur einmal am Tag
// kommt, verschenkt etwas. Das ist der Grund, öfter zu kommen.
export const OFFLINE_MAX_H = 3;
export const OFFLINE_ANTEIL = 0.65;  // nach INAKTIV_AB: so viel schaffen die Wichtel noch (bis 09.10.: 40 % bei 8 h Kiste, jetzt 65 % bei 3 h)
// Seit 01.10. wächst beides mit den SPIELTAGEN (gemeldet: in den ersten Tagen
// kam nach einer Nacht eine überwältigende Kiste). Index = Spieltag ab 0 (der
// erste Tag), danach gilt der letzte Wert. Erst an die Servier-Stufe
// gekoppelt - dann blieb die Kiste ewig klein, weil Stufe 2 15.000 kostet
// und man vorher Deko kauft (gemessen: 12 Dinge fehlten am 24.12.).
export const OFFLINE_JE_TAG = {
  anteil:  [0.15, 0.25, 0.35, 0.45, 0.50, 0.55, OFFLINE_ANTEIL],
  stunden: [2, 2.5, OFFLINE_MAX_H],
};
export const INAKTIV_AB = 300;       // s ohne dich - bis dahin arbeiten sie voll weiter
export const OFFLINE_AB = 15;        // s weg, ab denen die Wichtel abrechnen
export const OFFLINE_FENSTER = 300;  // kürzer weg: nur eine Einblendung statt Fenster

// typ: Aussehen und Verhalten. gewicht nur für normale Gäste.
export const GAESTE = {
  erwachsen: { geduld: 14, tempo: 30, gewicht: 6 },
  kind:      { geduld: 10, tempo: 36, gewicht: 3, ohneAlk: true },
  oma:       { geduld: 22, tempo: 22, gewicht: 1.5, trink: 1.3 },
  opa:       { geduld: 22, tempo: 22, gewicht: 1.5, trink: 1.3 },
  // Besondere Gäste
  weihnachtsmann: { geduld: 18, tempo: 24, spezial: true, mult: 8, name: 'Der Weihnachtsmann' },
  rentier:        { geduld: 14, tempo: 40, spezial: true, mult: 5, name: 'Ein Rentier', wunsch: ['apfel', 'lebkuchen'] },
  schneemann:     { geduld: 12, tempo: 20, spezial: true, mult: 5, name: 'Ein Schneemann', wunsch: ['schoko', 'kinderpunsch'] },
  // Der Grummel: grüner Weihnachtsmuffel. Wer ihn bedient, macht ihn froh;
  // wer ihn warten lässt, dem brummelt er etwas (klaut seit 29.09. nichts mehr). (Name bewusst eigen.)
  grummel:        { geduld: 10, tempo: 28, spezial: true, mult: 6, name: 'Der Grummel' },
};

// ---------------------------------------------------------------------------
// Fassaden (Anstrich im Baumarkt)
// ---------------------------------------------------------------------------
export const FASSADEN = {
  trist:     { wand: '#c9bca6', wand2: '#b5a790', dach: '#6e5a50', dach2: '#5c4a42', rahmen: '#8a6e56', tuer: '#6e4e34', muster: 'putz' },
  weiss:     { wand: '#ece6d8', wand2: '#d6cdbb', dach: '#566676', dach2: '#46525f', rahmen: '#9a7450', tuer: '#7a4424', muster: 'bretter', laden: '#6f8a9c' },
  rot:       { wand: '#a8352c', wand2: '#8e2a23', dach: '#3b3a44', dach2: '#2e2d35', rahmen: '#f2eee6', tuer: '#2f5040', muster: 'bretter' },
  lebkuchen: { wand: '#b8733a', wand2: '#9c5e2c', dach: '#f6f1ea', dach2: '#e3d9cc', rahmen: '#fff8f0', tuer: '#c83c3c', muster: 'lebkuchen' },
  chalet:    { wand: '#7c4a24', wand2: '#643a1b', dach: '#3b2a1c', dach2: '#2d2015', rahmen: '#e8d8a8', tuer: '#50281a', muster: 'chalet', sockel: '#8c8c88', laden: '#3d6b3a' },
};

// ---------------------------------------------------------------------------
// Der Laden. tab: markt | baumarkt | super | wichtel
//   kosten:   Zahl (einmal) oder Liste (Stufen)
//   stimmung: je Stufe
//   bonus:    { preis, trinkgeld, geduld, gaeste } als Anteil
//   braucht:  anderer Artikel muss da sein (brauchtStufe: und so weit ausgebaut)
//   schnee:   erst kaufbar, wenn Schnee liegt
//   wahl:     nach dem Kauf umschaltbar ('fassade' | 'zaunfarbe'); Lichterfarben siehe LICHTER
//   luxus:    ein EXTRA für Vielspieler - zum „schönsten Haus" (letzte Socke)
//             braucht man es nicht (luxusAb: erst ab dieser Stufe). Seit 29.09.,
//             damit das Ziel bis Heiligabend auch mit 10-15 min am Tag hält.
//   Preise ab 20.000 je Stufe sind seit 29.09. verdoppelt, Luxus vervierfacht
//   (gemessen mit Offline 40 %, siehe CLAUDE.md „Casual-Umbau"). Seit 01.10.
//   Normales ab 200.000 wieder ×0,75 - die Offline-Leistung wächst jetzt erst
//   mit den Spieltagen, sonst fehlten am 24.12. die teuersten Stücke.
// ---------------------------------------------------------------------------
export const TABS = [
  { id: 'super',    name: 'Supermarkt' },
  { id: 'markt',    name: 'Weihnachtsladen' },   // im Dorf (seit 09.10. Orte auf der Karte statt Reiter)
  { id: 'baumarkt', name: 'Baumarkt' },
  { id: 'wichtel',  name: 'Wichtelwald' },
];

export const ARTIKEL = [
  // --- Weihnachtsmarkt: Haus ---
  { id: 'kranz',          tab: 'markt', gruppe: 'Am Haus', name: 'Türkranz',             kosten: 100,    stimmung: 3,  text: 'Tannenkranz mit roter Schleife.' },
  { id: 'tuerbogenkranz', tab: 'markt', gruppe: 'Am Haus', name: 'Winterkranz über der Tür', kosten: [8000, 100000], stimmung: 6, text: 'Großer runder Kranz mit Beeren und Schleife über der Haustür. Stufe 2: Lichter dazu.' },
  { id: 'lichter_dach',   tab: 'markt', gruppe: 'Am Haus', name: 'Lichterkette am Dach', kosten: [400, 120000, 420000],    stimmung: 6,  text: 'Hängt an der Dachrinne. Stufe 2: doppelt so viele Lichter, Stufe 3: Lauflicht.' },
  { id: 'fensterstern',   tab: 'markt', gruppe: 'Am Haus', name: 'Stern im Giebel',      kosten: 1700,   stimmung: 5,  text: 'Ein Zackenstern fürs Dachfenster.' },
  { id: 'schwibbogen',    tab: 'markt', gruppe: 'Am Haus', name: 'Schwibbogen',          kosten: 3300,   stimmung: 6,  text: 'Kerzenbogen fürs linke Fenster.' },
  { id: 'nussknacker',    tab: 'markt', gruppe: 'Am Haus', name: 'Nussknacker',          kosten: 5000,   stimmung: 6,  text: 'Hält Wache neben der Tür.' },
  { id: 'lichter_fenster',tab: 'markt', gruppe: 'Am Haus', name: 'Fensterlichter',       kosten: [5600, 180000, 555000],   stimmung: 7,  text: 'Lichter rund um beide Fenster. Stufe 2: doppelt so viele Lichter, Stufe 3: Lauflicht.' },
  { id: 'zaun_girlande',  tab: 'markt', gruppe: 'Am Haus', name: 'Tannengirlande am Zaun', kosten: 7000, stimmung: 5, text: 'Tannenzweige mit roten Schleifen, den ganzen Zaun entlang.', braucht: 'zaun' },
  { id: 'lichter_zaun',   tab: 'markt', gruppe: 'Am Haus', name: 'Lichter am Zaun',      kosten: [18000, 180000, 690000],   stimmung: 7,  text: 'Eine Kette in die Girlande am Zaun. Stufe 2: doppelt so viele Lichter, Stufe 3: Lauflicht.', braucht: 'zaun_girlande' },
  { id: 'schornstein',    tab: 'markt', gruppe: 'Am Haus', name: 'Schornstein-Schmuck',  kosten: [50000, 180000], stimmung: 6, text: 'Stufe 1: Tannengrün mit Schleife um den Schornstein. Stufe 2: Lichter dazu.' },
  { id: 'eiszapfen',      tab: 'markt', gruppe: 'Am Haus', name: 'Eiszapfen-Lichter',    kosten: 86000,  stimmung: 10, text: 'Funkeln wie echte Eiszapfen.' },
  { id: 'dach_nikolaus',  tab: 'markt', gruppe: 'Am Haus', name: 'Nikolaus auf dem Dach',kosten: 750000, stimmung: 26, text: 'Er winkt vom Schornstein.' },
  { id: 'lichtershow',    tab: 'markt', gruppe: 'Am Haus', name: 'Große Lichtershow',    kosten: 2400000, stimmung: 40, luxus: true, text: 'Schneeflocken tanzen über die Fassade.' },
  // Das Teuerste im Spiel: das ganze Dach in warmweißen Lichtern - wie bei „Schöne Bescherung"
  { id: 'festbeleuchtung', tab: 'markt', gruppe: 'Am Haus', name: 'Festbeleuchtung',    kosten: 3200000, stimmung: 45, luxus: true, text: 'Das GANZE Dach voller warmweißer Lichter, dicht an dicht. Man sieht es bis ins Nachbardorf.', braucht: 'lichter_dach' },
  // --- Weihnachtsmarkt: Garten ---
  { id: 'tanne',          tab: 'markt', gruppe: 'Im Garten', name: 'Weihnachtstanne',   kosten: 2700,   stimmung: 8,  text: 'Eine echte Nordmanntanne im Vorgarten.' },
  { id: 'tanne_lichter',  tab: 'markt', gruppe: 'Im Garten', name: 'Lichter für die Tanne', kosten: [15000, 165000, 660000], stimmung: 8, text: 'Eine Kette rund um den Baum. Stufe 2: doppelt so viele Lichter, Stufe 3: Lauflicht.', braucht: 'tanne' },
  { id: 'tanne_kugeln',   tab: 'markt', gruppe: 'Im Garten', name: 'Christbaumkugeln',  kosten: 70000,  stimmung: 10, text: 'Rot und Gold.', braucht: 'tanne' },
  { id: 'tanne_stern',    tab: 'markt', gruppe: 'Im Garten', name: 'Stern auf der Spitze', kosten: 160000, stimmung: 14, text: 'Das Tüpfelchen auf dem Baum.', braucht: 'tanne' },
  { id: 'baum_girlande',  tab: 'markt', gruppe: 'Im Garten', name: 'Leuchtgirlande für den alten Baum', kosten: [4400, 160000, 510000], stimmung: 7, text: 'Grüne Girlande mit Lichtern um den kahlen Baum. Stufe 2: doppelt so viele Lichter, Stufe 3: Lauflicht.' },
  { id: 'schneemann',     tab: 'markt', gruppe: 'Im Garten', name: 'Schneemann',        kosten: 2100,   stimmung: 6,  text: 'Mit Möhre und Hut.', schnee: true },
  { id: 'schneefrau',     tab: 'markt', gruppe: 'Im Garten', name: 'Schneefrau',        kosten: 3900,   stimmung: 7,  text: 'Mit Schal und Schleife.', schnee: true },
  { id: 'schneekind',     tab: 'markt', gruppe: 'Im Garten', name: 'Schneekind',        kosten: 48000,   stimmung: 8,  text: 'Die Familie ist komplett.', schnee: true },
  { id: 'rentier_licht',  tab: 'markt', gruppe: 'Im Garten', name: 'Lichter-Rentier',   kosten: 112000,  stimmung: 12, text: 'Ein Rentier aus Draht und Licht.' },
  { id: 'schlitten',      tab: 'markt', gruppe: 'Im Garten', name: 'Schlitten mit Geschenken', kosten: 180000, stimmung: 16, text: 'Voll beladen, bereit für die Nacht.' },
  { id: 'lichterbogen',   tab: 'markt', gruppe: 'Im Garten', name: 'Lichterbogen am Weg', kosten: 825000, stimmung: 18, text: 'Ein leuchtendes Tor zur Haustür.' },
  // --- Weihnachtsmarkt: Stand ---
  { id: 'girlande',       tab: 'markt', gruppe: 'Am Stand', name: 'Tannengirlande',  kosten: 200,   stimmung: 0, bonus: { preis: 0.05 },     text: 'Sieht nach Weihnachtsmarkt aus.' },
  { id: 'zuckerstangen',  tab: 'markt', gruppe: 'Am Stand', name: 'Große Zuckerstangen', kosten: 1700, stimmung: 0, bonus: { trinkgeld: 0.15 }, text: 'Zwei riesige Zuckerstangen im Vorgarten - Kinder lieben sie.' },
  { id: 'standlicht',     tab: 'markt', gruppe: 'Am Stand', name: 'Standbeleuchtung', kosten: [3900, 140000, 450000],  stimmung: 0, bonus: { geduld: 0.2 },     text: 'Licht unter dem Dach. Stufe 2: doppelt so viele Lichter, Stufe 3: Lauflicht.' },
  { id: 'schild',         tab: 'markt', gruppe: 'Am Stand', name: 'Punsch-Schild',   kosten: 18000,  stimmung: 0, bonus: { gaeste: 0.15 },     text: 'Man sieht dich schon von Weitem.' },
  { id: 'musik',          tab: 'markt', gruppe: 'Am Stand', name: 'Musikbox',        kosten: 60000, stimmung: 0, bonus: { gaeste: 0.15 },     text: 'Weihnachtslieder am Stand.' },
  { id: 'heizpilz',       tab: 'markt', gruppe: 'Am Stand', name: 'Heizpilz',        kosten: 136000, stimmung: 0, bonus: { geduld: 0.3 },      text: 'Wer es warm hat, wartet gern.' },
  { id: 'baenke',         tab: 'markt', gruppe: 'Am Stand', name: 'Bierbänke',       kosten: 225000, stimmung: 0, bonus: { preis: 0.10, gaeste: 0.10 }, text: 'Die Leute bleiben - und bestellen nach.' },

  // --- Baumarkt: Stand ---
  { id: 'stand',   tab: 'baumarkt', gruppe: 'Am Stand', name: 'Stand ausbauen',    kosten: [120000, 480000, 2400000], stimmung: 5, bonus: { preis: 0.06 }, bonusJeStufe: true, luxusAb: 3, text: 'Stufe 1: Holzdach · Stufe 2: Laternen und Tannengrün · Stufe 3: goldener Stern und Lichter.' },
  { id: 'tresen',  tab: 'baumarkt', gruppe: 'Am Stand', name: 'Tresen verlängern', kosten: [500, 48000],        stimmung: 0, text: 'Ein Gast mehr gleichzeitig am Tresen.' },
  { id: 'topf',    tab: 'baumarkt', gruppe: 'Am Stand', name: 'Größere Töpfe',     kosten: [180, 3900, 136000], stimmung: 0, text: 'Mehr Portionen, seltener nachfüllen.' },
  { id: 'tablett', tab: 'baumarkt', gruppe: 'Am Stand', name: 'Tablett',           kosten: [2700, 112000],      stimmung: 0, text: 'Ein Ding mehr gleichzeitig in der Hand.' },
  // --- Baumarkt: Haus ---
  { id: 'strassenlaterne', tab: 'baumarkt', gruppe: 'Am Haus', name: 'Alte Straßenlaterne', kosten: 900, stimmung: 4, text: 'Gusseisern, mit vier Scheiben. Leuchtet, wenn es dunkel wird.' },
  { id: 'holz',     tab: 'baumarkt', gruppe: 'Am Haus', name: 'Holzstapel',       kosten: 1200,   stimmung: 3,  text: 'Brennholz an der Hauswand.' },
  { id: 'tuer',     tab: 'baumarkt', gruppe: 'Am Haus', name: 'Neue Haustür',     kosten: 2100,  stimmung: 5,  text: 'Massivholz mit Fensterchen.' },
  { id: 'zaun',     tab: 'baumarkt', gruppe: 'Am Haus', name: 'Gartenzaun',       kosten: 3300,  stimmung: 5,  text: 'Heller Lattenzaun.' },
  { id: 'zaun_braun', tab: 'baumarkt', gruppe: 'Am Haus', name: 'Zaun in Holzbraun', kosten: 9000, stimmung: 3, text: 'Der Zaun wahlweise dunkel lasiert oder hell.', braucht: 'zaun', wahl: 'zaunfarbe' },
  { id: 'kamin',    tab: 'baumarkt', gruppe: 'Am Haus', name: 'Kaminofen',        kosten: 3900,  stimmung: 12, text: 'Das Fenster leuchtet warm, der Schornstein raucht.' },
  { id: 'laternen', tab: 'baumarkt', gruppe: 'Am Haus', name: 'Laternen am Weg',  kosten: 60000, stimmung: 8,  text: 'Zwei alte Laternen am Gartenweg.' },
  // --- Baumarkt: Anstrich ---
  { id: 'farbe_weiss',     tab: 'baumarkt', gruppe: 'Anstrich', name: 'Winterweiß',   kosten: 1400,   stimmung: 6,  text: 'Helle Bretter, holzbraune Rahmen.', wahl: 'fassade', fassade: 'weiss' },
  { id: 'farbe_rot',       tab: 'baumarkt', gruppe: 'Anstrich', name: 'Schwedenrot',  kosten: 15000,   stimmung: 10, text: 'Rot mit weißen Kanten, wie in Småland.', wahl: 'fassade', fassade: 'rot' },
  { id: 'farbe_lebkuchen', tab: 'baumarkt', gruppe: 'Anstrich', name: 'Lebkuchenhaus',kosten: 165000,  stimmung: 16, text: 'Zuckerguss auf dem Dach.', wahl: 'fassade', fassade: 'lebkuchen' },
  { id: 'farbe_chalet',    tab: 'baumarkt', gruppe: 'Anstrich', name: 'Alpenchalet',  kosten: 645000, stimmung: 20, text: 'Dunkles Holz, Steinsockel, grüne Läden.', wahl: 'fassade', fassade: 'chalet' },

  // --- Supermarkt: Zutaten (aus PRODUKTE erzeugt, siehe unten) ---

  // --- Wichtel ---
  { id: 'spuel',     tab: 'wichtel', gruppe: 'Helfer', name: 'Spül-Wichtel',     kosten: 180,   stimmung: 0, text: `Stellt dir alle ${String(1.5).replace('.', ',')} Sekunden ein sauberes Glas aufs Tablett.` },
  { id: 'servier',   tab: 'wichtel', gruppe: 'Helfer', name: 'Servier-Wichtel',  kosten: [400, 15000, 112000, 225000, 675000, 825000], stimmung: 0, text: 'Bedient Gäste von allein - auch wenn du weg bist.' },
  { id: 'nachfuell', tab: 'wichtel', gruppe: 'Helfer', name: 'Nachfüll-Wichtel', kosten: [350, 15000, 160000], stimmung: 0, text: 'Füllt leere Töpfe von selbst nach.' },
  { id: 'crepe_w',   tab: 'wichtel', gruppe: 'Helfer', name: 'Crêpe-Wichtel',    kosten: 70000, stimmung: 0, text: 'Bäckt immer einen Crêpe vor.', braucht: 'crepe' },
  { id: 'kasse',     tab: 'wichtel', gruppe: 'Helfer', name: 'Kassen-Wichtel',   kosten: 180000, stimmung: 0, bonus: { preis: 0.10 }, text: 'Rundet freundlich auf.' },
];

// Supermarkt: je Produkt ein Artikel (Sternenpunsch hat man von Anfang an)
for (const p of PRODUKTE) {
  if (p.kosten === 0) continue;
  ARTIKEL.push({
    id: p.id, tab: 'super', gruppe: 'Zutaten', name: p.name, kosten: p.kosten, stimmung: 0,
    produkt: true, text: `Gäste zahlen ${String(p.preis).replace('.', ',')} Sterne${p.zeit ? ` · Zubereitung ${String(p.zeit).replace('.', ',')} s` : ''}${p.id === 'kinderpunsch' ? ' · lockt Kinder an' : ''}${p.griffe ? ` · mit ${p.griffe.map((g) => HANDGRIFF[g].name).join(' + ')} +${Math.round((p.bonus || EXTRA_BONUS) * 100)} %` : ''}.`,
  });
}

// ---------------------------------------------------------------------------
// Lichter: Artikel → Kette. Nach dem Kauf kann jede Kette unter „Mein Haus"
// AUS, WEISS oder BUNT leuchten - ohne Extra-Kauf (Nutzerwunsch). Wo die
// Lichter erst mit einer Stufe kommen, steht sie in LICHT_AB_STUFE.
// null = Licht ohne Farbwahl (nur aus/an): Eiszapfen, Festbeleuchtung, Lichtershow.
// ---------------------------------------------------------------------------
export const LICHTER = {
  lichter_dach: 'dach', lichter_fenster: 'fenster', lichter_zaun: 'zaun', eiszapfen: null,
  schornstein: 'schornstein', tuerbogenkranz: 'kranz', festbeleuchtung: null, lichtershow: null,
  tanne_lichter: 'tanne', baum_girlande: 'baum', lichterbogen: 'bogen', rentier_licht: 'rentier',
  standlicht: 'stand',
};
export const LICHT_AB_STUFE = { schornstein: 2, tuerbogenkranz: 2 };

// ---------------------------------------------------------------------------
// Freischaltung: Was hier steht, ist bis dahin VERDECKT („???"), und der
// Laden sagt nur, was man erreichen muss.
//   herzen: so viel ♥ Stimmung    gesamt: so viel insgesamt verdient (Sterne)
//   advent: kommt mit diesem Adventssonntag (dann NUR damit - der Text des
//           Ereignisses verspricht es, also muss es dann auch da sein)
// Was hier fehlt, ist von Anfang an sichtbar.
// ---------------------------------------------------------------------------
export const FREI = {
  // Supermarkt
  apfel: { gesamt: 500 }, lebkuchen: { gesamt: 1500 }, schoko: { herzen: 8 },
  eierpunsch: { herzen: 18 }, jaegertee: { herzen: 32 }, crepe: { advent: 1 },
  weisser: { advent: 3 }, feuerzange: { herzen: 120 },
  // Weihnachtsmarkt: Haus
  lichter_dach: { gesamt: 250 }, fensterstern: { herzen: 10 }, schwibbogen: { herzen: 18 },
  nussknacker: { herzen: 25 }, lichter_fenster: { herzen: 30 }, eiszapfen: { advent: 2 },
  dach_nikolaus: { advent: 4 }, lichtershow: { advent: 4 }, festbeleuchtung: { herzen: 300 }, schornstein: { herzen: 45 }, tuerbogenkranz: { herzen: 22 },
  // Weihnachtsmarkt: Garten
  tanne: { herzen: 14 }, tanne_kugeln: { herzen: 50 }, tanne_stern: { herzen: 90 },
  schneefrau: { advent: 2 }, schneekind: { advent: 2 }, baum_girlande: { herzen: 20 },
  rentier_licht: { herzen: 80 }, schlitten: { herzen: 120 }, lichterbogen: { advent: 4 },
  // Weihnachtsmarkt: Stand
  girlande: { gesamt: 100 }, zuckerstangen: { advent: 1 }, standlicht: { gesamt: 3000 },
  schild: { gesamt: 9000 }, musik: { advent: 3 }, heizpilz: { gesamt: 45000 }, baenke: { gesamt: 110000 },
  // Baumarkt
  tresen: { gesamt: 400 }, stand: { herzen: 60 }, tablett: { gesamt: 3000 },
  strassenlaterne: { herzen: 4 }, holz: { herzen: 5 }, tuer: { herzen: 8 }, zaun: { herzen: 10 }, kamin: { herzen: 14 }, laternen: { herzen: 40 },
  farbe_weiss: { herzen: 6 }, farbe_rot: { herzen: 25 }, farbe_lebkuchen: { herzen: 90 }, farbe_chalet: { herzen: 150 },
  // Wichtel - in dieser Reihenfolge: Spülen, Nachfüllen, Servieren
  spuel: { gesamt: 120 }, servier: { gesamt: 1000 }, nachfuell: { gesamt: 400 }, kasse: { gesamt: 75000 },
};

// ---------------------------------------------------------------------------
// Adventssonntage: Jeder bringt ein Ereignis mit Bild. Was es freischaltet,
// steht in FREI als `advent: n` und wird im Text automatisch aufgezählt.
// An diesem Sonntag selbst kommen mehr Gäste.
// ---------------------------------------------------------------------------
export const ADVENT_GAESTE = 0.5;   // +50 % Gäste am Adventssonntag
export const ADVENT_EREIGNIS = {
  1: { titel: '1. Advent', zeile: 'Weihnachtsmarkt in der Stadt!', bild: 'markt',
       text: 'In der Stadt hat der Weihnachtsmarkt eröffnet. Alle sind in Stimmung - und auf dem Heimweg kommen sie an deinem Stand vorbei.' },
  2: { titel: '2. Advent', zeile: 'Es hat die ganze Nacht geschneit!', bild: 'schnee',
       text: 'Über Nacht ist ein halber Meter Neuschnee gefallen. Die Kinder bauen Schneemänner, und alle wollen etwas Warmes.' },
  3: { titel: '3. Advent', zeile: 'Der Chor gibt ein Konzert!', bild: 'chor',
       text: 'Vor der Kirche singt der Weihnachtschor. Danach zieht das halbe Dorf weiter - zu dir.' },
  4: { titel: '4. Advent', zeile: 'Das ganze Dorf leuchtet!', bild: 'dorf',
       text: 'Jedes Haus ist geschmückt, überall brennen Lichter. Das Dorf feiert Weihnachten - und dein Haus soll das schönste sein.' },
};

// ---------------------------------------------------------------------------
// Tagesaufträge: drei am Tag, leicht - mittel - schwer. Lohn in Minuten
// „normaler Einnahmen", damit er früh wie spät gleich viel bedeutet.
// Der schwere Auftrag bringt zusätzlich ein Sammelstück, das es nur hier gibt.
// ---------------------------------------------------------------------------
// Zeile = Adventskerzen (0 = vor dem 1. Advent), Spalte = leicht/mittel/schwer.
// Am Anfang bewusst knapp - sonst kauft man den ersten Laden mit Aufträgen leer.
export const AUFTRAG_LOHN_MIN = [
  [1, 1.5, 2.5],
  [1.5, 2.5, 4],
  [2, 3.5, 5.5],
  [3, 5, 8],
  [4, 7, 11],
];
export const AUFTRAG_DEKO = [
  { id: 'auf_geschenke',     name: 'Geschenkestapel',  stimmung: 6, text: 'Drei Päckchen neben der Haustür.' },
  { id: 'auf_lebkuchenmann', name: 'Lebkuchenmann',    stimmung: 6, text: 'Groß, braun, mit Zuckerguss - im Vorgarten.' },
  { id: 'auf_rodel',         name: 'Holzschlitten',    stimmung: 6, text: 'Lehnt an der Hauswand und wartet auf Schnee.' },
  { id: 'auf_engel',         name: 'Leuchtender Engel', stimmung: 8, text: 'Steht auf dem Dachfirst und strahlt.' },
];
export const EILIG_ANTEIL = 0.12;   // so viele Gäste haben es eilig (ab dem 30. bedienten)
export const EILIG_GEDULD = 0.55;   // … und so viel weniger Geduld
export const EILIG_MULT = 2;        // … dafür zahlen sie doppelt
export const ERSTER_SONDERGAST = 150; // s nach Sitzungsbeginn kommt garantiert der erste
// Besondere Gäste erst, wenn das Spiel etwas läuft: ab so vielen Getränken im
// Angebot, und dann frühestens SONDER_NACH s später (der erste kommt garantiert)
export const SONDER_AB_PRODUKTE = 3;
export const SONDER_NACH = 60;

// Deko, die es NUR im Adventskalender gibt
export const KALENDER_DEKO = {
  1:  { id: 'kal_kranz',     name: 'Adventskranz',      stimmung: 5,  text: 'Steht im rechten Fenster. Jeden Advent brennt eine Kerze mehr.' },
  6:  { id: 'kal_stiefel',   name: 'Nikolausstiefel',   stimmung: 4,  text: 'Steht vor der Tür. Gefüllt!' },
  12: { id: 'kal_mistel',    name: 'Mistelzweig',       stimmung: 4,  text: 'Hängt über der Haustür.' },
  18: { id: 'kal_vogel',     name: 'Vogelhäuschen',     stimmung: 5,  text: 'Mit Rotkehlchen.' },
  24: { id: 'kal_goldstern', name: 'Goldener Stern',    stimmung: 15, text: 'Er funkelt über deinem Haus. Frohe Weihnachten!' },
};
export const KALENDER_GELD_ANTEIL = 0.04; // Geldgeschenk: 4 % aller bisherigen Einnahmen
export const KALENDER_GELD_MIN = 150;
// Vorfreude-Päckchen: vor dem 1.12. (ab dem zweiten Spieltag) eins je Tag im
// Kalender - sonst gab es in der ersten Woche keinen Grund wiederzukommen
// (Betatest 02.10.: „Noch 7 Tage bis zum ersten Türchen")
export const VORFREUDE_ANTEIL = 0.03;
export const VORFREUDE_MIN = 150;
// Wer am Tresen sieht, dass sein Getränk gerade gemacht wird, geht nicht
// mehr weg (die Geduld sinkt weiter, aber nie unter diesen Rest in s)
export const GEDULD_RESERVIERT = 1.5;
// Selbst servieren zählt doppelt (09.10.; die Tagesschicht vom 03.10. ist
// dafür wieder raus - 30 Pflichtgäste fühlten sich nach Arbeit an)
export const SELBST_MULT = 2;

// Der fahrende Händler (09.10.): kommt höchstens HAENDLER_PRO_TAG-mal am Tag
// mit seinem Karren, bleibt HAENDLER_BLEIBT Sekunden am Haus stehen und hat
// Deko, die es NUR bei ihm gibt. Erscheint, wenn man am Stand ist.
export const HAENDLER_PRO_TAG = 2;
export const HAENDLER_ERST = [60, 150];   // s am Stand bis zum ersten Besuch der Sitzung
export const HAENDLER_PAUSE = 360;        // s am Stand bis zum zweiten
export const HAENDLER_BLEIBT = 150;
export const HAENDLER_X = 16;             // Halteplatz auf dem Gehweg (links vor dem Haus)
// Preise in Minuten Einnahmen (einnahmenProMinute), damit er früh wie spät
// etwas kostet, aber erreichbar bleibt - mindestens `min` Sterne
export const HAENDLER_DEKO = [
  { id: 'h_kugel',    name: 'Riesen-Schneekugel',  stimmung: 8,  minuten: 28, min: 1200, text: 'Steht im Garten, darin dein Haus in klein. Drinnen schneit es immer.' },
  { id: 'h_flamingo', name: 'Lichter-Flamingo',    stimmung: 6,  minuten: 18, min: 800,  text: 'Pink, mit Lichterkette und Mütze. Gehört hier nicht her - genau deshalb.' },
  { id: 'h_polar',    name: 'Polarlicht-Laterne',  stimmung: 10, minuten: 35, min: 1500, text: 'Nachts zieht ein grünes Polarlicht über den Himmel.' },
  { id: 'h_orgel',    name: 'Drehorgel-Wichtel',   stimmung: 5,  minuten: 24, min: 1000, bonus: { gaeste: 0.08 }, text: 'Kurbelt am Stand ein Liedchen - es kommen 8 % mehr Gäste.' },
  { id: 'h_hahn',     name: 'Wetterhahn-Rentier',  stimmung: 6,  minuten: 18, min: 800,  text: 'Dreht sich auf dem Dachfirst mit dem Wind.' },
];
// Dazu jedes Mal ein Gutschein zum Verbrauchen
export const HAENDLER_GUTSCHEIN = { id: 'h_zimt', name: 'Zimtstern-Gutschein', minuten: 3, min: 250, dauer: 600, mult: 2,
  text: '10 Minuten lang bringt alles, was du selbst servierst, doppelt so viele Sterne.' };
// Der Weihnachtsmarkt auf dem Festplatz (09.10.): zufällig alle paar Tage,
// mit Ansage. Er hat Deko, die es nur dort gibt (je Markt MARKT_ANGEBOT
// Stücke, die man noch nicht hat), ein Rezept, das zwei Getränke dauerhaft
// teurer verkauft, und am Markttag kommen mehr Leute am Stand vorbei.
export const MARKT_ERST = 2;          // Tage nach dem ersten Spieltag bis zum ersten Markt
export const MARKT_ABSTAND = [3, 4];  // Tage zwischen zwei Märkten
export const MARKT_ANSAGE = 3;        // ab so vielen Tagen vorher wird er angekündigt
export const MARKT_GAESTE = 0.2;      // am Markttag 20 % mehr Gäste
export const MARKT_ANGEBOT = 3;
export const MARKT_DEKO = [
  { id: 'm_rad',     name: 'Riesenrad',          stimmung: 9, minuten: 30, min: 1200, text: 'Dreht sich hinter dem Dorf - nachts mit Lichtern.' },
  { id: 'm_stern',   name: 'Herrnhuter Stern',   stimmung: 7, minuten: 22, min: 900,  text: 'Hängt leuchtend im Baum über deinem Stand.' },
  { id: 'm_kutsche', name: 'Pferdekutsche',      stimmung: 8, minuten: 26, min: 1000, text: 'Fährt immer wieder mit Glöckchen an deinem Haus vorbei.' },
  { id: 'm_fenster', name: 'Fensterbilder',      stimmung: 5, minuten: 15, min: 700,  text: 'Schneeflocken aus Papier in allen Fenstern.' },
  { id: 'm_herzen',  name: 'Lebkuchenherzen',    stimmung: 6, minuten: 18, min: 800,  text: 'Hängen an der Markise deines Stands.' },
];
// Rezepte: je Markt eins (das erste, das man noch nicht hat und für das man
// schon eines der Getränke verkauft). `plus` = Aufschlag auf den Preis.
export const MARKT_REZEPTE = [
  { id: 'r_zimt',   name: 'Zimtstangen-Bündel',  fuer: ['gluehwein', 'kinderpunsch'], plus: 0.2, minuten: 20, min: 600 },
  { id: 'r_apfel',  name: 'Bratapfel-Gewürz',    fuer: ['apfel', 'lebkuchen'],        plus: 0.2, minuten: 22, min: 900 },
  { id: 'r_vanille', name: 'Echte Vanille',      fuer: ['schoko', 'eierpunsch'],      plus: 0.2, minuten: 24, min: 1500 },
  { id: 'r_honig',  name: 'Waldhonig',           fuer: ['jaegertee', 'crepe'],        plus: 0.2, minuten: 26, min: 3000 },
  { id: 'r_orange', name: 'Orangenschalen',      fuer: ['weisser', 'feuerzange'],     plus: 0.2, minuten: 28, min: 6000 },
];
// Tagesansturm: einmal am Tag, nach so vielen Sekunden am Stand
export const ANSTURM_NACH = 75;
export const ANSTURM_DAUER = 60;
export const ANSTURM_GAESTE = 10;
export const ANSTURM_MULT = 3;    // Trinkgeld-Faktor (die Stoßzeit hat 2)
// Reihenfolge der Türchen im Raster (wie ein echter Kalender, durcheinander)
export const KALENDER_REIHE = [7, 15, 2, 20, 11, 24, 4, 18, 9, 13, 1, 22, 16, 6, 19, 3, 12, 23, 8, 14, 21, 5, 17, 10];

// ---------------------------------------------------------------------------
// Varianten je Deko-Platz (09.10., Nutzerwunsch: „jedes Haus sieht gleich aus,
// wenn man alles hat"). Variante 1 ist das Teil selbst; 2 und 3 kauft man im
// „Haus schmücken" dazu und wählt frei. Die dritte ist die schräge und zeigt
// sich erst, wenn man die zweite hat. Jede zusätzliche bringt
// VARIANTE_HERZEN Stimmung - fürs schönste Haus braucht man keine.
// Preis = erster Preis des Teils × FAKTOR, mindestens MIN.
// ---------------------------------------------------------------------------
export const VARIANTE_HERZEN = 2;
export const VARIANTE_FAKTOR = [0, 1, 2];
export const VARIANTE_MIN = [0, 300, 800];
export const VARIANTEN = {
  tanne:         [{ kurz: 'Tanne' },       { kurz: 'Riesentanne', name: 'Große Nordmanntanne', text: 'Ein Drittel größer, bis über die Fenster.' },
                  { kurz: 'Palme', name: 'Weihnachtspalme', text: 'Mit Lichterkette, Kokosnuss-Kugeln und Stern. Urlaubsgefühl im Schnee.' }],
  kranz:         [{ kurz: 'Tannenkranz' }, { kurz: 'Strohstern', name: 'Strohsternkranz', text: 'Goldgelbes Stroh mit einem Stern in der Mitte.' },
                  { kurz: 'Brezel', name: 'Brezelkranz', text: 'Aus echten Laugenbrezeln. Duftet herrlich.' }],
  fensterstern:  [{ kurz: 'Stern' },       { kurz: 'Komet', name: 'Komet mit Schweif', text: 'Ein Schweifstern im Dachfenster.' },
                  { kurz: 'Discokugel', name: 'Discokugel', text: 'Dreht sich und wirft bunte Punkte.' }],
  schwibbogen:   [{ kurz: 'Schwibbogen' }, { kurz: 'Pyramide', name: 'Lichterpyramide', text: 'Dreht sich mit der Wärme der Kerzen.' },
                  { kurz: 'Katze', name: 'Fensterkatze', text: 'Eine Katze mit Weihnachtsmütze schaut hinaus und blinzelt.' }],
  nussknacker:   [{ kurz: 'Nussknacker' }, { kurz: 'Holzrentier', name: 'Holz-Rentier', text: 'Geschnitzt, mit roter Schleife.' },
                  { kurz: 'Gartenzwerg', name: 'Zwerg im Nikolauskostüm', text: 'Hat sich als Weihnachtsmann verkleidet. Überzeugt niemanden.' }],
  schneemann:    [{ kurz: 'Schneemann' },  { kurz: 'Schneeburg', name: 'Schneeburg', text: 'Mit zwei Türmen und Fähnchen.' },
                  { kurz: 'Urlaub', name: 'Schneemann im Liegestuhl', text: 'Sonnenbrille auf, Füße hoch. Er hat Urlaub.' }],
  dach_nikolaus: [{ kurz: 'Nikolaus' },    { kurz: 'Rentiere', name: 'Rentiere auf dem Dach', text: 'Zwei Rentiere warten auf ihren Einsatz.' },
                  { kurz: 'Steckt fest', name: 'Steckengebliebener Nikolaus', text: 'Nur noch die Beine schauen aus dem Schornstein.' }],
  rentier_licht: [{ kurz: 'Rentier' },     { kurz: 'Elch', name: 'Lichter-Elch', text: 'Größer, mit Schaufelgeweih.' },
                  { kurz: 'Dino', name: 'Lichter-Dinosaurier', text: 'Ein Langhals aus Licht. Warum nicht.' }],
  schlitten:     [{ kurz: 'Schlitten' },   { kurz: 'Bollerwagen', name: 'Bollerwagen mit Geschenken', text: 'Randvoll mit Päckchen.' },
                  { kurz: 'Rasenmäher', name: 'Aufsitzmäher mit Lichterkette', text: 'Der Rasen hat Pause, der Mäher nicht.' }],
  lichterbogen:  [{ kurz: 'Bogen' },       { kurz: 'Tunnel', name: 'Lichtertunnel', text: 'Drei Bögen hintereinander.' },
                  { kurz: 'Zuckerstange', name: 'Zuckerstangen-Tor', text: 'Rot-weiß gestreift, wie aus dem Bonbonglas.' }],
  zaun:          [{ kurz: 'Lattenzaun' },  { kurz: 'Jägerzaun', name: 'Jägerzaun', text: 'Gekreuzte Latten, ganz klassisch.' },
                  { kurz: 'Lebkuchen', name: 'Lebkuchenzaun', text: 'Mit Zuckerguss und Gummibärchen.' }],
  schild:        [{ kurz: 'Holzschild' },  { kurz: 'Leuchtreklame', name: 'Leuchtreklame', text: 'PUNSCH in pinker Neonschrift.' },
                  { kurz: 'Riesentasse', name: 'Drehende Riesentasse', text: 'Dampft und dreht sich über dem Stand.' }],
  musik:         [{ kurz: 'Musikbox' },    { kurz: 'Blaskapelle', name: 'Blaskapelle', text: 'Drei Wichtel mit Trompeten.' },
                  { kurz: 'Elvis', name: 'Elvis-Wichtel', text: 'Mit Tolle und Gitarre. Thank you very much.' }],
  heizpilz:      [{ kurz: 'Heizpilz' },    { kurz: 'Feuerschale', name: 'Feuerschale', text: 'Echtes Feuer auf drei Beinen.' },
                  { kurz: 'Marshmallow', name: 'Marshmallow-Tonne', text: 'Eine Feuertonne, die Stöcke stecken schon drin.' }],
  laternen:      [{ kurz: 'Laternen' },    { kurz: 'Fackeln', name: 'Fackeln', text: 'Zwei Fackeln am Weg.' },
                  { kurz: 'Lavalampen', name: 'Lavalampen', text: 'Bunte Blasen, die langsam auf- und absteigen.' }],
};

// ---------------------------------------------------------------------------
// Minispiel Waldlichtung (09.10.). Sterne gibt es für die ersten
// MINI_RUNDEN_STERNE Runden am Tag (sonst ließe sich hier statt am Stand
// „farmen"), Deko hängt am Rekord.
// ---------------------------------------------------------------------------
export const MINI_RUNDEN_STERNE = 3;
export const LICHTUNG_DAUER = 30;          // s je Runde
export const LICHTUNG_PUNKTE_JE_MIN = 400; // so viele Punkte = eine Minute Einnahmen …
export const LICHTUNG_MAX_MIN = 3;         // … höchstens drei (perfekter Autopilot: 3.810 Punkte, 42 Tiere)
export const LICHTUNG_DEKO = [
  { id: 'l_hasen', name: 'Hasenfamilie',            ab: 800,  stimmung: 5, text: 'Drei Hasen sitzen vor dem Zaun und mümmeln.' },
  { id: 'l_eich',  name: 'Eichhörnchen auf dem Dach', ab: 1800, stimmung: 5, text: 'Sitzt auf dem Dach und knabbert eine Nuss.' },
  { id: 'l_reh',   name: 'Reh am Gartenweg',          ab: 3000, stimmung: 7, text: 'Kommt aus dem Wald zu Besuch und bleibt.' },
];
// Minispiel Christbaumverkauf (09.10.): 60 s, Kunden wollen einen bestimmten
// Baum (Sorte und Größe). Fällen (3x tippen), einnetzen (3x), aufs Autodach.
export const BAUM_DAUER = 60;
export const BAUM_PUNKTE_JE_MIN = 600;
export const BAUM_MAX_MIN = 3;
export const BAUM_DEKO = [
  { id: 'c_kugeln',   name: 'Riesenkugeln im Baum',   ab: 900,  stimmung: 5, text: 'Drei große Kugeln hängen im kahlen Baum.' },
  { id: 'c_dachbaum', name: 'Bäumchen auf dem First', ab: 1700, stimmung: 5, text: 'Ein kleiner Christbaum mit Lichtern ganz oben auf dem Dach.' },
  { id: 'c_wald',     name: 'Lichterwald',            ab: 2700, stimmung: 7, text: 'Die Tannen hinter deinem Stand tragen Lichterketten.' },
];
// Welche Minispiele es gibt: Deko-Liste und Umrechnung der Punkte in Sterne
export const MINISPIELE = {
  lichtung: { deko: LICHTUNG_DEKO, jeMin: LICHTUNG_PUNKTE_JE_MIN, maxMin: LICHTUNG_MAX_MIN },
  baum:     { deko: BAUM_DEKO,     jeMin: BAUM_PUNKTE_JE_MIN,     maxMin: BAUM_MAX_MIN },
};

