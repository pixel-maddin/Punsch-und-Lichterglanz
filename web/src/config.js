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
// Abstand zwischen unterster Regalreihe und Leiste (12.10., gemeldet: beim
// schnellen Ausschenken landete man auf Karte/Aufträge statt auf dem Topf).
// Eine Holzleiste; ein Tipp darauf zählt noch für den Topf darüber.
export const LEISTE_LUFT = 6;
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
export const WICHTEL_WEGKIPPEN = 15;           // s: ein Wichtel-Glas, das keiner mehr will, kippt er weg (sonst staute das Tablett, 13.10.)
export const WICHTEL_WARTEN = 4;               // s, die ein eingeschenktes Glas auf dich wartet, bevor der Wichtel selbst serviert
export const JUBEL_ZEIT = 0.375;                 // s Freudensprung, wenn du selbst bedienst (20 % flotter als 0,45)

// ---------------------------------------------------------------------------
// Gäste
// ---------------------------------------------------------------------------
export const GAST_BASIS = 4.0;      // s zwischen zwei Gästen ohne jede Deko
// Schneller kommen sie nie (17.10.: vorher 1,0 - ab ♥ ~105 kam jede Sekunde
// einer, und das Tippen wurde nur hektischer). Ein Preisausgleich für die
// fehlenden Gäste war gemessen viel zu stark (Wichtel und Kiste hängen am
// Servier-Takt, nicht an den Gästen: 28 statt 15 Mio. Sterne). Das Wachstum
// im späten Spiel trägt stattdessen der Ruf (RUF_JE_STUFE).
export const GAST_MIN = 1.6;
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
export const CHEF_TEMPO = 2;   // 13.10.: vorher 1,5 - und erst, sobald der Hinweis „Du bist der Chef!“ kommt (S.chefBonus)

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
  // Stammgäste (12.10.): kommen einmal am Tag zu ihrer Zeit, bestellen „das
  // Übliche" und erzählen bei jedem Besuch ein Stück weiter (STAMMGAESTE)
  hilde: { geduld: 26, tempo: 20, spezial: true, stamm: true, mult: 2, name: 'Oma Hilde', wunsch: ['apfel', 'lebkuchen'],
    farben: { mantel: '#7a4a8a', schal: '#e8d8a0', haut: '#f2c9a0', haar: '#e8e8ec', hut: '#7a4a8a' } },
  sophia: { geduld: 18, tempo: 32, spezial: true, stamm: true, mult: 2, name: 'Postbotin Sophia', wunsch: ['gluehwein', 'schoko'],
    farben: { mantel: '#2a4a8a', schal: '#f0c020', haut: '#f0c4a0', haar: '#8a4a22', hut: '#f0c020' } },
  karl:  { geduld: 24, tempo: 22, spezial: true, stamm: true, mult: 2, name: 'Karl', wunsch: ['gluehwein', 'lebkuchen'],
    farben: { mantel: '#3e6a3e', schal: '#b84a3a', haut: '#e8b090', haar: '#6a5a50', hut: '#6a5a4a' } },
  lena:  { geduld: 20, tempo: 36, spezial: true, stamm: true, mult: 2, name: 'Lena', wunsch: ['kinderpunsch', 'schoko'], ohneAlk: true,
    farben: { mantel: '#3a8ac8', schal: '#f4f4f4', haut: '#f6d2b0', haar: '#c8862a', hut: '#d82a2a' } },
  franz: { geduld: 26, tempo: 24, spezial: true, stamm: true, mult: 2, name: 'Förster Franz', wunsch: ['jaegertee', 'gluehwein'],
    farben: { mantel: '#3e5a2e', schal: '#8a6a3a', haut: '#e0a888', haar: '#d8d4cc', hut: '#3e5a2e' } },
};

// Stammgäste (12.10.): Uhrzeit (von-bis), Sätze in Reihenfolge (einer je
// Besuch), danach im Wechsel `immer`. Zwischen 24. und 26.12. einmal das
// Abschiedsgeschenk (Sterne für GESCHENK_MIN Minuten Einnahmen).
export const STAMM_CHANCE = 0.3, STAMM_PAUSE = 45, STAMM_GESCHENK_MIN = 15;
export const STAMMGAESTE = {
  // Oma Hilde: Strickgeschichten
  hilde: { von: 7, bis: 13, saetze: [
    'Guten Morgen! Ich bin die Hilde von gegenüber. Und das ist Waldi.',
    'Ich stricke gerade Socken. Rot-grün gestreift. Für wen, verrate ich noch nicht.',
    'Waldi hat mir ein Wollknäuel geklaut. Jetzt zieht sich ein roter Faden quer durchs Wohnzimmer.',
    'Mein Enkel Jonas kommt zu Weihnachten! Ich stricke ihm einen Schal. Drei Meter - er ist ja gewachsen.',
    'Waldi hat jetzt einen Pullover. Mit Rentier drauf. Er schämt sich ein bisschen.',
    'Ich hab mich verzählt: Eine Socke hat sechs Streifen, die andere sieben. Merkt keiner, oder?',
    'Der Schal für Jonas ist fertig. Vier Meter. Ich konnte nicht aufhören.',
    'Nur noch ein paar Mal schlafen. Ich bin aufgeregter als Waldi.'],
    immer: ['Wie immer, Kindchen.', 'Waldi lässt grüßen. Wuff!', 'Masche für Masche, so wird\'s was.'],
    geschenk: 'Oma Hilde schenkt dir die rot-grünen Socken - sechs und sieben Streifen. Die waren für dich!' },
  // Postbotin Sophia: Klatsch und Tratsch aus dem Dorf
  sophia: { von: 10, bis: 16, saetze: [
    'Post für dich! Nein, Spaß. Nur ich, Sophia. Einen Becher, bitte.',
    'Hast du\'s schon gehört? Beim Bäcker ist die Lichterkette durchgebrannt. Schon wieder.',
    'Einer im Dorf bestellt jeden Tag eine Lichterkette. Ich sag nicht, wer. ... Der Bürgermeister.',
    'Die Oma Hilde bestellt Wolle wie verrückt. Die Pakete werden immer schwerer.',
    'Der Förster Franz hat einen Brief bekommen. Mit Herzchen drauf! Ich hab nichts gesagt.',
    'Beim Krippenspiel ist das Kamel krank geworden. Jetzt spielt der Pfarrer das Kamel.',
    'Im Briefkasten lag ein Brief an den Weihnachtsmann. Absender: Lena. Mit ganz vielen Briefmarken.',
    'Am 24. trag ich die letzten Pakete aus. Ein paar kommen von sehr weit her ... aber psst!'],
    immer: ['Kurze Pause, dann weiter.', 'Du hast\'s nicht von mir.', 'Im Dorf reden alle über deinen Stand. Nur Gutes!'],
    geschenk: 'Sophia bringt dir ein Päckchen - von allen im Dorf, für den schönsten Stand!' },
  // Karl: gemütlicher Kerl Mitte 50, weihnachtliche Flachwitze
  karl: { von: 11, bis: 17, saetze: [
    'Tach! Karl mein Name. Was ist ein Keks unter einem Baum? Ein schattiges Plätzchen!',
    'Treffen sich zwei Schneemänner. Sagt der eine: ‚Komisch, hier riecht\'s nach Möhren.‘',
    'Was trinkt ein Schneemann am liebsten? Eistee!',
    'Unterhalten sich zwei Kerzen: ‚Ist Wasser gefährlich für uns?‘ - ‚Davon kannst du ausgehen.‘',
    'Warum stricken Tannenbäume so schlecht? Sie lassen ständig die Nadeln fallen. Sag das nicht der Hilde!',
    'Was ist weiß und stört beim Essen? Eine Lawine!',
    'Was ist braun und sitzt hinter Gittern? Eine Knastanie! ... Ja, der ist nicht von Weihnachten. Aber gut, oder?',
    'Wie nennt man einen Schneemann im Juli? Pfütze. ... Gut, dass Winter ist.'],
    immer: ['Kennst du den schon? ... Ach, den kennst du.', 'Ich lach schon mal vor.', 'Der war gut, oder? ODER?'],
    geschenk: 'Karl schenkt dir sein Witzebuch. Vorne drin steht: „Für den Stand mit dem besten Publikum.“' },
  // Lena: Wunschzettel - am Ende wünscht sie sich nur noch die ganze Familie
  lena: { von: 13, bis: 19, saetze: [
    'Hallo! Ich bin Lena. Ich bin sieben. Fast acht!',
    'Ich schreib meinen Wunschzettel. Ganz oben steht: ein Pony.',
    'Das Pony hab ich durchgestrichen. Wo soll das denn wohnen? Jetzt steht da: ein Schlitten.',
    'Mein Papa arbeitet in Kanada. Meine Tante wohnt in Australien - da ist jetzt Sommer! Komisch, oder?',
    'Oma und Opa wohnen in Spanien. Die haben gar keinen Schnee.',
    'Den Schlitten hab ich auch durchgestrichen.',
    'Ich hab einen neuen Wunschzettel geschrieben. Da steht nur noch eine Sache drauf.',
    'Ich wünsch mir, dass alle zu Weihnachten nach Hause kommen. Die ganze Familie. Sophia bringt den Brief ganz schnell weg, hat sie gesagt.'],
    immer: ['Mit extra Sahne, bitte!', 'Ich hab mein Taschengeld gespart!', 'Schneit\'s morgen? Bitte sag ja!'],
    geschenk: 'Lena strahlt: „Sie sind alle da! Papa, Tante, Oma und Opa!“ Sie schenkt dir ein gemaltes Bild - die ganze Familie vor deinem Stand.' },
  // Förster Franz: Fun Facts aus dem Wald
  franz: { von: 16, bis: 22, saetze: [
    '\'n Abend. Franz, Förster. Merkspruch für dich: Fichte sticht, Tanne nicht.',
    'Eichhörnchen vergraben im Herbst Tausende Nüsse und finden längst nicht alle wieder. So pflanzen sie ganze Wälder.',
    'Rehböcke werfen im Winter ihr Geweih ab. Im Frühjahr wächst ein neues.',
    'Igel halten Winterschlaf. Ihr Herz schlägt dann nur noch ein paar Mal pro Minute.',
    'Spechte kriegen kein Kopfweh. Ein langer Knochen der Zunge läuft um den ganzen Schädel - wie ein Polster.',
    'Tannenzapfen findest du nie am Boden. Die zerfallen oben am Baum. Was unten liegt, sind Fichtenzapfen.',
    'Das Rotkehlchen singt auch im Winter - manchmal sogar nachts, unter Laternen.',
    'An Heiligabend bring ich den Rehen noch Heu in den Wald. Das ist kein Fun Fact. Das ist Tradition.'],
    immer: ['Das Wärmste, was du hast.', 'Kalte Finger heute.', 'Morgen erzähl ich dir mehr vom Wald.'],
    geschenk: 'Franz schenkt dir einen Fichtenzapfen. „Kein Tannenzapfen - die gibt\'s am Boden ja nicht!“' },
};

// Bitten der Stammgäste (17.10.): Einmal am Tag hat ein Stammgast, den man
// schon kennt, eine Bitte (Karte unter Aufträge, zusätzlich zu den drei
// Aufträgen). Je Gast eine Kette von fünf, die seine Geschichte weitererzählt.
// Keine Frist - eine offene Bitte wartet, bis sie erfüllt ist.
//   art: 'getraenk' (p, n, griff = nur mit Handgriff) · 'backen' (n Plätzchen)
//        'mini' (spiel, eine Runde mit Punkten) · 'futter' (Futterhaus füllen)
//        'santa' (Weihnachtsmann auf der Karte finden) · 'gold' (n goldene Gäste)
// Geht eine Bitte noch nicht (Getränk fehlt, Minispiel zu …), kommt an dem
// Tag ein anderer Gast dran. Lohn: BITTE_MINUTEN Minuten Einnahmen.
export const BITTE_MINUTEN = 5;
export const STAMM_BITTEN = {
  hilde: [
    { art: 'getraenk', p: 'kinderpunsch', n: 5, griff: true,
      text: 'Kindchen, heute ist Strickrunde bei mir. Fünf Damen, alle durstig. Machst du mir fünf Kinderpunsch mit Zuckerstange? Die Zuckerstangen sind für Waldi tabu.',
      dank: 'Die Strickrunde war begeistert. Waldi hat trotzdem eine Zuckerstange erwischt. Er bereut nichts.' },
    { art: 'backen', n: 6,
      text: 'Waldi hat Geburtstag! Er wird neun - in Hundejahren ein alter Herr. Backst du sechs Plätzchen für die Gäste? Waldi kriegt Wurst.',
      dank: 'Waldi hat gefeiert. Die Plätzchen hat er nicht angerührt. Ich schon.' },
    { art: 'futter',
      text: 'Am Fenster sitzt jeden Morgen ein Rotkehlchen und schaut mir beim Stricken zu. Füllst du dein Futterhaus? Dann hat es was Besseres zu tun.',
      dank: 'Das Rotkehlchen war heute bei dir. Ich hab ganz ohne Zuschauer gestrickt - drei Reihen mehr!' },
    { art: 'getraenk', p: 'weisser', n: 4, griff: true,
      text: 'Die Wolle für Jonas\' Schal ist alle. Sophia bringt Nachschub, aber ich bin ganz kribbelig. Vier Zimtwolken, bitte - mit allem.',
      dank: 'Das Paket ist da! Sophia hat es bis an die Tür getragen und wollte wissen, was drin ist. Hab nichts verraten.' },
    { art: 'mini', spiel: 'schnee',
      text: 'Jonas schreibt, er macht eine Schneeballschlacht mit mir. Mit MIR! Übst du auf der Schneeballwiese für mich? Ich muss doch wissen, wie das geht.',
      dank: 'Ich hab\'s verstanden: werfen, ducken, nicht den Wichtel treffen. Jonas hat keine Chance.' },
  ],
  sophia: [
    { art: 'getraenk', p: 'gluehwein', n: 6,
      text: 'So viele Pakete heute, ich brauch Treibstoff. Sechs Sternenpunsch für mich und die Kollegen?',
      dank: 'Die Kollegen sagen danke. Und dass dein Stand Stadtgespräch ist. Also, Dorfgespräch.' },
    { art: 'santa',
      text: 'Alle sagen, der Weihnachtsmann versteckt sich hier irgendwo in der Gegend. Ich glaub\'s erst, wenn du ihn findest. Schau mal auf der Karte!',
      dank: 'Du hast ihn gesehen? Wirklich? ... Ich muss los, das muss ich sofort jemandem erzählen.' },
    { art: 'gold', n: 5,
      text: 'Ich mach eine Umfrage: Wer hat den schönsten Stand im Dorf? Bedien mal ein paar goldene Gäste - die frag ich danach.',
      dank: 'Ergebnis: Fünf von fünf sagen: du. Einer hat noch „und Waldi" gesagt. Das war Hilde.' },
    { art: 'getraenk', p: 'apfel', n: 5, griff: true,
      text: 'Der Bürgermeister hat schon wieder eine Lichterkette bestellt. Die zwölfte! Ich brauch fünf heiße Äpfel, gut umgerührt, sonst rutscht mir was raus.',
      dank: 'Die Kette hängt. Jetzt blinkt sein Haus im Takt von Jingle Bells. Hören kann man\'s nicht. Sehen schon.' },
    { art: 'getraenk', p: 'feuerzange', n: 3, griff: true,
      text: 'Ich hab schon wieder einen Brief mit Herzchen für Franz. Ich trau mich kaum, ihn abzugeben. Ich brauch Mut: drei Feuerzauber - solange sie brennen!',
      dank: 'Er hat ihn gelesen und ist rot geworden wie ein Gimpel. Absender: die Frau vom Christbaumverkauf. Du hast\'s nicht von mir.' },
  ],
  karl: [
    { art: 'mini', spiel: 'baum',
      text: 'Ich hab einen Witz über Tannenbäume, aber mir fehlt die Pointe. Verkauf mal ein paar Bäume - vielleicht kommt mir dabei was.',
      dank: 'Warum ist der Tannenbaum nie einsam? Er hat immer seine Zweige dabei. ... Ich arbeite noch dran.' },
    { art: 'getraenk', p: 'lebkuchen', n: 6, griff: true,
      text: 'Ich muss einen Lebkuchenwitz am lebenden Objekt üben. Also, am Lebkuchen. Sechs Stück mit Zuckerguss, bitte.',
      dank: 'Was sagt der Lebkuchen zum Zuckerguss? „Ohne dich bin ich nur Kuchen." ... Die Lebkuchen waren besser als der Witz.' },
    { art: 'gold', n: 4,
      text: 'Ich brauch Publikum. Gute Laune, volle Becher. Bedienst du ein paar goldene Gäste? Die lachen immer am lautesten.',
      dank: 'Vier Lacher! Gut, einer hat gehustet. Ich zähl ihn trotzdem.' },
    { art: 'mini', spiel: 'berg',
      text: 'Ich hab am Schlittenberg einen gesehen, der rodelt im Wok. Kein Witz! Fährst du mal runter und erzählst mir, wie das ist?',
      dank: 'Im Wok den Berg runter. Da hat einer echt den Dreh raus! ... Den hab ich mir extra für dich aufgehoben.' },
    { art: 'getraenk', p: 'eierpunsch', n: 5, griff: true,
      text: 'Ich trete beim Seniorennachmittag auf. Hilde sitzt in der ersten Reihe. Ich brauch was fürs Herz: fünf Herzwärmer, bitte.',
      dank: 'Hilde hat gelacht. Zweimal! Einmal über den Witz, einmal über mich. Zählt beides.' },
  ],
  lena: [
    { art: 'getraenk', p: 'kinderpunsch', n: 4, griff: true,
      text: 'Meine Freundinnen kommen gleich! Machst du uns vier Kinderpunsch? Mit Zuckerstange, sonst ist es kein richtiger.',
      dank: 'Wir haben angestoßen. Auf den Schnee, auf die Ferien und auf Waldi.' },
    { art: 'backen', n: 5,
      text: 'Ich will Papa Plätzchen nach Kanada schicken. Sophia sagt, das klappt, wenn sie nicht zerbröseln. Backst du mir fünf?',
      dank: 'Sophia hat das Päckchen ganz vorsichtig mitgenommen. Wie ein rohes Ei. Ein Plätzchen-Ei.' },
    { art: 'mini', spiel: 'eis',
      text: 'Ich lerne Pirouette! Aber ich fall immer um. Zeigst du mir auf der Eisbahn, wie das geht?',
      dank: 'Ich hab mich dreimal gedreht und bin erst danach umgefallen. Das ist ein Rekord!' },
    { art: 'getraenk', p: 'schoko', n: 3, griff: true,
      text: 'Meine Tante hat aus Australien geschrieben: Da essen sie Eis am Strand! Ich will das Gegenteil. Drei heiße Schokoladen mit Sahne - für Mama, mich und den Schneemann.',
      dank: 'Der Schneemann wollte seine nicht. Hab ich getrunken. Er wär sonst geschmolzen.' },
    { art: 'mini', spiel: 'baum',
      text: 'Wir haben noch keinen Christbaum. Mama sagt, dieses Jahr brauchen wir einen GANZ großen. Suchst du schon mal einen schönen aus?',
      dank: 'Mama hat gelächelt, als ich vom großen Baum erzählt hab. So ein Geheimnis-Lächeln. Weißt du was?' },
  ],
  franz: [
    { art: 'futter',
      text: 'Die Meisen haben\'s diese Woche schwer, der Boden ist gefroren. Füllst du dein Futterhaus? Ich hab dir gleich angesehen, dass du ein Herz für Vögel hast.',
      dank: 'Eine Kohlmeise muss im Winter etwa ein Drittel ihres Gewichts am Tag fressen, sonst kommt sie nicht durch die Nacht. Deine sind heute satt.' },
    { art: 'getraenk', p: 'jaegertee', n: 4, griff: true,
      text: 'Waldtee trink ich am liebsten, wenn er genau richtig gezogen hat. Nicht zu schwach, nicht bitter. Machst du mir vier, wie es sich gehört?',
      dank: 'Genau richtig. Ein Eichelhäher versteckt im Herbst Tausende Eicheln - und findet im Winter die meisten wieder. Ich find nicht mal meine Mütze.' },
    { art: 'mini', spiel: 'lichtung',
      text: 'Bei dem Schnee kommen die Rehe schlecht ans Futter. Hilfst du mir auf der Waldlichtung? Die Raufe ist schon voll.',
      dank: 'Rehe tragen im Winter ein dickeres, graueres Fell als im Sommer. Und deine Rehe haben heute einen vollen Bauch.' },
    { art: 'backen', n: 4,
      text: 'Ich hab den Waldkindern Plätzchen versprochen. Ich kann Spuren lesen, Bäume zählen - aber backen nicht. Machst du mir vier?',
      dank: 'Die Kinder haben Spuren gelesen und Plätzchen gegessen. Die Krümel haben übrigens die Meisen gefunden.' },
    { art: 'getraenk', p: 'gluehwein', n: 8,
      text: 'Vor Heiligabend gehen wir vom Forst noch auf einen Punsch. Acht Sternenpunsch, bitte - das Heu für die Rehe ist schon geladen.',
      dank: 'Die Kollegen sagen danke. Rehe sind übrigens keine kleinen Hirsche, sondern eine eigene Art. Das hab ich ihnen auch erzählt. Dreimal.' },
  ],
};


// ---------------------------------------------------------------------------
// Fassaden (Anstrich im Baumarkt)
// ---------------------------------------------------------------------------
export const FASSADEN = {
  trist:     { wand: '#c9bca6', wand2: '#b5a790', dach: '#6e5a50', dach2: '#5c4a42', rahmen: '#8a6e56', tuer: '#6e4e34', muster: 'putz' },
  weiss:     { wand: '#ece6d8', wand2: '#d6cdbb', dach: '#566676', dach2: '#46525f', rahmen: '#9a7450', tuer: '#7a4424', muster: 'bretter', laden: '#6f8a9c' },
  rot:       { wand: '#a8352c', wand2: '#8e2a23', dach: '#3b3a44', dach2: '#2e2d35', rahmen: '#f2eee6', tuer: '#2f5040', muster: 'bretter' },
  lebkuchen: { wand: '#b8733a', wand2: '#9c5e2c', dach: '#f6f1ea', dach2: '#e3d9cc', rahmen: '#fff8f0', tuer: '#c83c3c', muster: 'lebkuchen' },
  // 11.10.: fünfter Anstrich - Eisblöcke mit Kristallen, silbrig verschneites Dach
  eis:       { wand: '#cfe6f6', wand2: '#a8cce6', dach: '#e4eef8', dach2: '#b8cfe6', rahmen: '#ffffff', tuer: '#3a6aa8', muster: 'eis', laden: '#7aa8d8' },
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
  { id: 'lichtershow',    tab: 'markt', gruppe: 'Am Haus', name: 'Große Lichtershow',    kosten: 1450000, stimmung: 40, luxus: true, text: 'Schneeflocken tanzen über die Fassade.' },
  // Das Teuerste im Spiel: das ganze Dach in warmweißen Lichtern - wie bei „Schöne Bescherung"
  { id: 'festbeleuchtung', tab: 'markt', gruppe: 'Am Haus', name: 'Festbeleuchtung',    kosten: 1900000, stimmung: 45, luxus: true, text: 'Das GANZE Dach voller warmweißer Lichter, dicht an dicht. Man sieht es bis ins Nachbardorf.', braucht: 'lichter_dach' },
  // --- Weihnachtsmarkt: Garten ---
  { id: 'tanne',          tab: 'markt', gruppe: 'Im Garten', name: 'Weihnachtstanne',   kosten: 2700,   stimmung: 8,  text: 'Eine echte Nordmanntanne im Vorgarten.' },
  { id: 'tanne_lichter',  tab: 'markt', gruppe: 'Im Garten', name: 'Lichter für die Tanne', kosten: [15000, 165000, 660000], stimmung: 8, text: 'Eine Kette rund um den Baum. Stufe 2: doppelt so viele Lichter, Stufe 3: Lauflicht.', braucht: 'tanne' },
  { id: 'tanne_kugeln',   tab: 'markt', gruppe: 'Im Garten', name: 'Christbaumkugeln',  kosten: 70000,  stimmung: 10, text: 'Rot und Gold.', braucht: 'tanne' },
  { id: 'tanne_stern',    tab: 'markt', gruppe: 'Im Garten', name: 'Stern auf der Spitze', kosten: 160000, stimmung: 14, text: 'Das Tüpfelchen auf dem Baum.', braucht: 'tanne' },
  { id: 'baum_girlande',  tab: 'markt', gruppe: 'Im Garten', name: 'Leuchtgirlande für den alten Baum', kosten: [4400, 160000, 510000], stimmung: 7, text: 'Grüne Girlande mit Lichtern um den kahlen Baum. Stufe 2: doppelt so viele Lichter, Stufe 3: Lauflicht.' },
  // Futterhaus (11.10.): hängt im kahlen Baum; antippen füllt es, dann kommen Vögel (VOEGEL)
  { id: 'futterhaus',     tab: 'markt', gruppe: 'Im Garten', name: 'Futterhaus',        kosten: 900,    stimmung: 3,  text: 'Hängt im alten Baum. Antippen füllt es - dann kommen Vögel, manche ganz selten.' },
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
  { id: 'stand',   tab: 'baumarkt', gruppe: 'Am Stand', name: 'Stand ausbauen',    kosten: [120000, 480000, 1450000], stimmung: 5, bonus: { preis: 0.06 }, bonusJeStufe: true, luxusAb: 3, text: 'Stufe 1: Holzdach · Stufe 2: Laternen und Tannengrün · Stufe 3: goldener Stern und Lichter.' },
  { id: 'tresen',  tab: 'baumarkt', gruppe: 'Am Stand', name: 'Tresen verlängern', kosten: [2700, 112000],        stimmung: 0, text: 'Ein Gast mehr gleichzeitig am Tresen.' },
  { id: 'topf',    tab: 'baumarkt', gruppe: 'Am Stand', name: 'Größere Töpfe',     kosten: [180, 3900, 136000], stimmung: 0, text: 'Mehr Portionen, seltener nachfüllen.' },
  { id: 'tablett', tab: 'baumarkt', gruppe: 'Am Stand', name: 'Tablett',           kosten: [500, 48000],      stimmung: 0, text: 'Ein Ding mehr gleichzeitig in der Hand.' },
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
  { id: 'farbe_eis',       tab: 'baumarkt', gruppe: 'Anstrich', name: 'Eispalast',    kosten: 330000,  stimmung: 18, text: 'Eisblöcke mit funkelnden Kristallen.', wahl: 'fassade', fassade: 'eis' },
  { id: 'farbe_chalet',    tab: 'baumarkt', gruppe: 'Anstrich', name: 'Alpenchalet',  kosten: 645000, stimmung: 20, text: 'Dunkles Holz, Steinsockel, grüne Läden.', wahl: 'fassade', fassade: 'chalet' },

  // --- Supermarkt: Zutaten (aus PRODUKTE erzeugt, siehe unten) ---

  // --- Wichtel ---
  { id: 'spuel',     tab: 'wichtel', gruppe: 'Helfer', name: 'Spül-Wichtel',     kosten: 180,   stimmung: 0, text: `Stellt dir alle ${String(1.5).replace('.', ',')} Sekunden ein sauberes Glas aufs Tablett.` },
  { id: 'servier',   tab: 'wichtel', gruppe: 'Helfer', name: 'Servier-Wichtel',  kosten: [400, 15000, 112000, 225000, 675000, 825000], stimmung: 0, text: 'Bedient Gäste von allein - auch wenn du weg bist. Ab Stufe 2 auch, wenn du da bist: Dann kümmerst du dich um die goldenen Gäste.' },
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

// Preiskurve (13.10., Betatest + Saison-Autopilot): Ab 10.000 Sternen wurden
// die Preise viel schneller teurer als die Einnahmen (×380 gegen ×4) - ab
// Anfang Dezember endete fast jede dritte Sitzung ohne Kauf. Darüber wird
// jetzt gestaucht: p' = 10.000 · (p / 10.000)^PREIS_KURVE, auf zwei Stellen
// gerundet. Luxus (luxus / Stufen ab luxusAb) bleibt, wie er ist. Varianten
// folgen von selbst (sie rechnen aus dem Artikelpreis).
export const PREIS_KURVE = 0.85, PREIS_KURVE_AB = 10000;
const kurve = (k) => {
  if (k <= PREIS_KURVE_AB) return k;
  const roh = PREIS_KURVE_AB * Math.pow(k / PREIS_KURVE_AB, PREIS_KURVE);
  const stelle = Math.pow(10, Math.floor(Math.log10(roh)) - 1);
  return Math.round(roh / stelle) * stelle;
};
for (const a of ARTIKEL) {
  if (a.luxus) continue;
  if (Array.isArray(a.kosten)) a.kosten = a.kosten.map((k, i) => (a.luxusAb && i + 1 >= a.luxusAb ? k : kurve(k)));
  else if (typeof a.kosten === 'number') a.kosten = kurve(a.kosten);
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
  futterhaus: { herzen: 6 }, tanne: { herzen: 14 }, tanne_kugeln: { herzen: 50 }, tanne_stern: { herzen: 90 },
  schneefrau: { advent: 2 }, schneekind: { advent: 2 }, baum_girlande: { herzen: 20 },
  rentier_licht: { herzen: 80 }, schlitten: { herzen: 120 }, lichterbogen: { advent: 4 },
  // Weihnachtsmarkt: Stand
  girlande: { gesamt: 100 }, zuckerstangen: { advent: 1 }, standlicht: { gesamt: 3000 },
  schild: { gesamt: 9000 }, musik: { advent: 3 }, heizpilz: { gesamt: 45000 }, baenke: { gesamt: 110000 },
  // Baumarkt
  tresen: { gesamt: 400 }, stand: { herzen: 60 }, tablett: { gesamt: 3000 },
  strassenlaterne: { herzen: 4 }, holz: { herzen: 5 }, tuer: { herzen: 8 }, zaun: { herzen: 10 }, kamin: { herzen: 14 }, laternen: { herzen: 40 },
  farbe_weiss: { herzen: 6 }, farbe_rot: { herzen: 25 }, farbe_lebkuchen: { herzen: 90 }, farbe_eis: { herzen: 120 }, farbe_chalet: { herzen: 150 },
  // Wichtel - in dieser Reihenfolge: Spülen, Nachfüllen, Servieren
  spuel: { gesamt: 120 }, servier: { gesamt: 1000 }, nachfuell: { gesamt: 400 }, kasse: { gesamt: 75000 },
};

// ---------------------------------------------------------------------------
// Adventssonntage: Jeder bringt ein Ereignis mit Bild. Was es freischaltet,
// steht in FREI als `advent: n` und wird im Text automatisch aufgezählt.
// An diesem Sonntag selbst kommen mehr Gäste.
// ---------------------------------------------------------------------------
// Kirchenglocken zur vollen Stunde (12.10.)
export const GLOCKEN_VON = 7, GLOCKEN_BIS = 22;   // nachts Ruhe
export const GLOCKEN_TAKT = 1.6;                  // s zwischen zwei Schlägen
export const GLOCKEN_ABEND = 18, GLOCKEN_ABEND_DAUER = 12;   // Abendläuten nach dem Stundenschlag
// Adventssonntag (12.10.): Nachmittags/abends singt ein Chor vor dem Haus, alle zahlen mehr
export const CHOR = { von: 15, bis: 20, bonus: 0.5 };
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
  // 11.10.: vorher das Vogelhäuschen - das ist jetzt das Futterhaus im Laden
  18: { id: 'kal_knoedel',   name: 'Meisenknödel',      stimmung: 5,  text: 'Hängt am Futterhaus. Seltene Vögel kommen doppelt so oft.' },
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
// … aber nur so lange (14.10.): Vorher wartete ein reservierter Gast für
// immer. Ein Glas, das auf dem Tablett stehen blieb, hielt so einen Gast am
// Tresen fest - war es ein Stammgast (den bedienen die Wichtel nicht), war
// der Platz für immer zu, und bei einem Platz stand der ganze Stand still
// (gemessen: Karl 300 s am Tresen, Geduld eingefroren; gemeldet als
// „die Wichtel schenken nicht mehr ein"). Ausguss löste es.
export const GEDULD_RESERVIERT_MAX = 15;
// Selbst servieren zählt doppelt (09.10.; die Tagesschicht vom 03.10. ist
// dafür wieder raus - 30 Pflichtgäste fühlten sich nach Arbeit an)
export const SELBST_MULT = 2;

// Aufsicht und goldene Gäste (17.10.). Gemeldet: „je mehr Tage, desto mehr
// fühlt es sich nach Arbeit an". Ab Servier-Stufe AUFSICHT_AB bedienen die
// Wichtel normale Gäste selbst, auch wenn du da bist (vorher schenkten sie
// dann auf dein Tablett ein, und du hast jeden Gast angetippt). Dein Teil
// sind die GOLDENEN Gäste: einer alle GOLD_TAKT s, egal wie voll der Stand
// ist - nur du bedienst sie, sie drängeln vor und zahlen GOLD_MINUTEN
// Minuten Einnahmen (dazu wie immer Schwung und Handgriff). Normale Gäste
// selbst bedienen geht weiter (×SELBST_MULT), ist aber kein Muss mehr.
export const AUFSICHT_AB = 2;
export const GOLD_TAKT = [8, 12];
export const GOLD_MINUTEN = 0.3;

// Ruf des Standes (17.10.): steigt höchstens einmal je Spieltag um eine
// Stufe, sobald man an dem Tag RUF_PUNKTE gesammelt hat - ein goldener oder
// besonderer Gast 1, eine Minispielrunde mit Punkten 5, ein normaler Gast
// selbst bedient 0,2. Jede Stufe +RUF_JE_STUFE auf alle Preise (auch bei
// den Wichteln und in der Kiste). Ein verpasster Tag kostet nichts.
export const RUF_PUNKTE = 5;
export const RUF_JE = { gold: 1, mini: 5, normal: 0.2 };
export const RUF_JE_STUFE = 0.02;
export const RUF_MAX = 30;

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
export const MARKT_ERST = 4;          // Tage nach dem ersten Spieltag bis zum ersten Markt (= Tag 5; muss zu EINSTIEG.markt passen)
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
// Der Weihnachtsmann versteckt sich auf der Karte (10.10.): selten, an
// wechselnden Stellen. Antippen schenkt Sterne.
export const SANTA_CHANCE = 0.2;       // je Öffnen der Karte
export const SANTA_PRO_TAG = 2;
export const SANTA_MINUTEN = 5;        // so viele Minuten Einnahmen …
export const SANTA_MIN = 300;          // … mindestens
// Tagesansturm: einmal am Tag, nach so vielen Sekunden am Stand
export const ANSTURM_NACH = 75;
export const ANSTURM_DAUER = 60;
export const ANSTURM_GAESTE = 10;
export const ANSTURM_MULT = 3;    // Trinkgeld-Faktor (die Stoßzeit hat 2)
// Reihenfolge der Türchen im Raster (wie ein echter Kalender, durcheinander)
export const KALENDER_REIHE = [7, 15, 2, 20, 11, 24, 4, 18, 9, 13, 1, 22, 16, 6, 19, 3, 12, 23, 8, 14, 21, 5, 17, 10];

// Barbarazweig (10.10.): ab dem 4.12. im Kalender zu schneiden, blüht am 24.12.
// Blüten = MIN + gegossene Tage (bis MAX). Am 4.12. geschnitten und täglich
// gegossen sind es 21 Gießtage - also die volle Pracht.
export const BARBARA_TAG = 4;
export const BARBARA_BLUETEN_MIN = 4;
export const BARBARA_BLUETEN_MAX = 24;
// Heiligabend (10.10.): ab dieser Stunde läuft das Finale; eine Stunde vorher
// stehen schon die Sänger vor dem Haus
export const HEILIGABEND_STUNDE = 17;

// ---------------------------------------------------------------------------
// Varianten je Deko-Platz (09.10., Nutzerwunsch: „jedes Haus sieht gleich aus,
// wenn man alles hat"). Variante 1 ist das Teil selbst; 2 und 3 kauft man im
// „Haus schmücken" dazu und wählt frei. Die dritte ist die schräge und zeigt
// sich erst, wenn man die zweite hat. Jede zusätzliche bringt
// VARIANTE_HERZEN Stimmung - fürs schönste Haus braucht man keine.
// Preis = Gesamtwert des Teils (alle Stufen) × FAKTOR, mindestens MIN.
// ---------------------------------------------------------------------------
export const VARIANTE_HERZEN = 2;
// 11.10.: Faktor auf den GESAMTWERT des Teils (alle Stufen), nicht mehr auf die
// erste Stufe - sonst kosteten die Varianten einer 540.000er Lichterkette 400/800.
// Gemessen (Saison-Bot, 30 Tage ab 24.11., siehe CLAUDE.md): Mit 0,7/1,4 hat nur
// der Vielspieler (30 min/Tag + 3 Runden je Minispiel) am 23.12. alles samt
// Varianten; 5 min/Tag bleiben 15 Teile und 23 Varianten offen.
export const VARIANTE_FAKTOR = [0, 0.7, 1.4];
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
  futterhaus:    [{ kurz: 'Futterhaus' },  { kurz: 'Schneedach', name: 'Futterhaus mit Schneedach', text: 'Weißes Dach, rote Laterne darunter.' },
                  { kurz: 'Glocke', name: 'Futterglocke', text: 'Eine Glocke aus Körnern an einer roten Schleife.' }],
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
  // 11.10.: Varianten für ALLE Teile außer Luxus, Geschenktem und Minispiel-Deko
  // (Nutzerwunsch). Lichter teilen sich EINE Idee: die Form der Birnen
  // (birne() in szene.js) - Kette, Sterne, Retro-Kugeln.
  lichter_dach:    [{ kurz: 'Kette' }, { kurz: 'Sterne', name: 'Dachlichter mit Sternen', text: 'Kleine leuchtende Sterne statt Punkte.' },
                  { kurz: 'Retro', name: 'Dachlichter in Retro', text: 'Dicke bunte Birnen wie früher bei Oma.' }],
  lichter_fenster: [{ kurz: 'Kette' }, { kurz: 'Sterne', name: 'Fensterlichter mit Sternen', text: 'Kleine leuchtende Sterne statt Punkte.' },
                  { kurz: 'Retro', name: 'Fensterlichter in Retro', text: 'Dicke bunte Birnen wie früher bei Oma.' }],
  lichter_zaun:    [{ kurz: 'Kette' }, { kurz: 'Sterne', name: 'Zaunlichter mit Sternen', text: 'Kleine leuchtende Sterne statt Punkte.' },
                  { kurz: 'Retro', name: 'Zaunlichter in Retro', text: 'Dicke bunte Birnen wie früher bei Oma.' }],
  tanne_lichter:   [{ kurz: 'Kette' }, { kurz: 'Sterne', name: 'Tannenlichter mit Sternen', text: 'Kleine leuchtende Sterne statt Punkte.' },
                  { kurz: 'Retro', name: 'Tannenlichter in Retro', text: 'Dicke bunte Birnen wie früher bei Oma.' }],
  baum_girlande:   [{ kurz: 'Kette' }, { kurz: 'Sterne', name: 'Leuchtgirlande mit Sternen', text: 'Kleine leuchtende Sterne statt Punkte.' },
                  { kurz: 'Retro', name: 'Leuchtgirlande in Retro', text: 'Dicke bunte Birnen wie früher bei Oma.' }],
  standlicht:      [{ kurz: 'Kette' }, { kurz: 'Sterne', name: 'Standbeleuchtung mit Sternen', text: 'Kleine leuchtende Sterne statt Punkte.' },
                  { kurz: 'Retro', name: 'Standbeleuchtung in Retro', text: 'Dicke bunte Birnen wie früher bei Oma.' }],
  schornstein:     [{ kurz: 'Kette' }, { kurz: 'Sterne', name: 'Schornstein-Schmuck mit Sternen', text: 'Kleine leuchtende Sterne statt Punkte.' },
                  { kurz: 'Retro', name: 'Schornstein-Schmuck in Retro', text: 'Dicke bunte Birnen wie früher bei Oma.' }],
  tuerbogenkranz:  [{ kurz: 'Kette' }, { kurz: 'Sterne', name: 'Winterkranz mit Sternen', text: 'Kleine leuchtende Sterne statt Punkte.' },
                  { kurz: 'Retro', name: 'Winterkranz in Retro', text: 'Dicke bunte Birnen wie früher bei Oma.' }],
  eiszapfen:     [{ kurz: 'Eiszapfen' },   { kurz: 'Flocken', name: 'Schneeflocken-Lichter', text: 'Große leuchtende Flocken unter der Traufe.' },
                  { kurz: 'Vorhang', name: 'Lichtervorhang', text: 'Lange Lichterschnüre hängen vom Dach.' }],
  zaun_girlande: [{ kurz: 'Schleifen' },   { kurz: 'Lametta', name: 'Lametta am Zaun', text: 'Silbern glitzernd, wie am Christbaum.' },
                  { kurz: 'Beeren', name: 'Beerenkette', text: 'Rote Beeren und Popcorn auf einer Schnur.' }],
  strassenlaterne: [{ kurz: 'Laterne' },   { kurz: 'Mit Kranz', name: 'Laterne mit Kranz', text: 'Tannenkranz mit roter Schleife am Mast.' },
                  { kurz: 'Doppelt', name: 'Doppellaterne', text: 'Zwei Köpfe an einem geschwungenen Arm.' }],
  holz:          [{ kurz: 'Holzstapel' },  { kurz: 'Mit Axt', name: 'Hackklotz mit Axt', text: 'Daneben ein Klotz, die Axt steckt noch.' },
                  { kurz: 'Holzhütte', name: 'Kleine Holzhütte', text: 'Ein Dach über dem Stapel - das Holz bleibt trocken.' }],
  tuer:          [{ kurz: 'Holztür' },     { kurz: 'Rot', name: 'Rote Haustür', text: 'Weihnachtsrot lackiert.' },
                  { kurz: 'Glastür', name: 'Grüne Tür mit Glas', text: 'Tannengrün, mit einem großen Fenster.' }],
  kamin:         [{ kurz: 'Kaminofen' },   { kurz: 'Kachelofen', name: 'Kachelofen', text: 'Grün gekachelt, mit Bank davor.' },
                  { kurz: 'Kerzen', name: 'Kerzen im Fenster', text: 'Ein Leuchter auf jeder Fensterbank.' }],
  tanne_kugeln:  [{ kurz: 'Rot-Gold' },    { kurz: 'Silber-Blau', name: 'Silberne und blaue Kugeln', text: 'Kühl und edel, wie Eis.' },
                  { kurz: 'Strohsterne', name: 'Strohsterne', text: 'Goldgelbe Sterne aus Stroh.' }],
  tanne_stern:   [{ kurz: 'Stern' },       { kurz: 'Engel', name: 'Engel auf der Spitze', text: 'Mit goldenen Flügeln.' },
                  { kurz: 'Glasspitze', name: 'Gläserne Spitze', text: 'Silbern glänzend, wie bei Oma.' }],
  schneefrau:    [{ kurz: 'Schneefrau' },  { kurz: 'Mit Schirm', name: 'Schneefrau mit Schirm', text: 'Ein roter Schirm gegen den Schnee.' },
                  { kurz: 'Prinzessin', name: 'Eisprinzessin', text: 'Mit Krone und hellblauem Schal.' }],
  schneekind:    [{ kurz: 'Schneekind' },  { kurz: 'Laterne', name: 'Schneekind mit Laterne', text: 'Hält eine kleine leuchtende Laterne.' },
                  { kurz: 'Schlitten', name: 'Schneekind mit Schlitten', text: 'Gleich geht es den Berg hinunter.' }],
  girlande:      [{ kurz: 'Tanne' },       { kurz: 'Wimpel', name: 'Wimpelkette', text: 'Bunte Fähnchen am Stand.' },
                  { kurz: 'Stechpalme', name: 'Stechpalmen-Girlande', text: 'Dunkle Blätter, leuchtend rote Beeren.' }],
  zuckerstangen: [{ kurz: 'Zuckerstangen' }, { kurz: 'Lebkuchen', name: 'Lebkuchenmänner', text: 'Zwei große Lebkuchenmänner mit Zuckerguss.' },
                  { kurz: 'Lollis', name: 'Riesenlollis', text: 'Bunte Spirallollis, so groß wie Kinder.' }],
  baenke:        [{ kurz: 'Bierbänke' },   { kurz: 'Mit Fellen', name: 'Bänke mit Fellen', text: 'Kuschelige Schaffelle auf den Bänken.' },
                  { kurz: 'Stehtische', name: 'Stehtische', text: 'Hohe Tische mit Kerzen und roten Decken.' }],
};

// ---------------------------------------------------------------------------
// Minispiel Waldlichtung (09.10.). Sterne gibt es für die ersten
// MINI_RUNDEN_STERNE Runden am Tag (sonst ließe sich hier statt am Stand
// „farmen"), Deko hängt am Rekord.
// ---------------------------------------------------------------------------
export const MINI_RUNDEN_STERNE = 3;
// Sterne je Runde, für alle Spiele gleich (14.10., gemeldet: „im Gegensatz
// zum Servieren bekommt man da zu viel"): MINI_JE_MIN Punkte (nach `skala`,
// also eine gute Runde) = eine Minute Einnahmen (einnahmenProMinute), höchstens
// MINI_MAX_MIN. Gemessen (Saison-Bot): Selbst bedienen bringt je Minute 2,3-
// 2,5 × einnahmenProMinute (Tag 1-10), am 20. Tag 4-5 × - egal ob alle 0,35
// oder alle 1,3 s getippt wird, die Gäste geben den Takt vor. Vorher brachte
// eine gute Runde (40-75 s) 3 Minuten, je Spielminute also 1,4 × so viel wie
// Bedienen. Jetzt rund die Hälfte; dafür gibt es Deko.
export const MINI_JE_MIN = 2000;
export const MINI_MAX_MIN = 1.5;
export const LICHTUNG_DAUER = 40;          // s je Runde (11.10.: 30 → 40, im letzten Drittel doppelt so viele Tiere)
export const LICHTUNG_DEKO = [
  { id: 'l_hasen', name: 'Hasenfamilie',            ab: 800,  stimmung: 5, text: 'Drei Hasen sitzen vor dem Zaun und mümmeln.' },
  { id: 'l_eich',  name: 'Eichhörnchen auf dem Dach', ab: 1800, stimmung: 5, text: 'Sitzt auf dem Dach und knabbert eine Nuss.' },
  { id: 'l_reh',   name: 'Reh am Gartenweg',          ab: 3000, stimmung: 7, text: 'Kommt aus dem Wald zu Besuch und bleibt.' },
];
// Minispiel Christbaumverkauf (09.10.): 60 s, Kunden wollen einen bestimmten
// Baum (Sorte und Größe). Fällen (3x tippen), einnetzen (3x), aufs Autodach.
export const BAUM_DAUER = 60;
export const BAUM_DEKO = [
  { id: 'c_kugeln',   name: 'Riesenkugeln im Baum',   ab: 900,  stimmung: 5, text: 'Drei große Kugeln hängen im kahlen Baum.' },
  { id: 'c_dachbaum', name: 'Bäumchen auf dem First', ab: 1700, stimmung: 5, text: 'Ein kleiner Christbaum mit Lichtern ganz oben auf dem Dach.' },
  { id: 'c_wald',     name: 'Lichterwald',            ab: 2700, stimmung: 7, text: 'Die Tannen hinter deinem Stand tragen Lichterketten.' },
];
// Minispiel Schlittenberg (09.10.): im Wok den Hang hinunter, gegen die Zeit.
export const BERG_DAUER = 75;     // s - wer bis dahin nicht im Ziel ist, bekommt nur die Sterne (45, dann 60; 75 seit der Piste vom 13.10.)
export const BERG_STERN = 20;     // Punkte je Stern auf der Strecke
export const BERG_ZIEL = 400;     // Punkte fürs Ankommen …
export const BERG_JE_S = 40;      // … plus so viele je Sekunde, die noch übrig war
export const BERG_DEKO = [
  { id: 's_kinder', name: 'Rodelkinder',          ab: 1000,  stimmung: 5, text: 'Zwei Kinder ziehen ihren Schlitten am Haus vorbei.' },
  { id: 's_wok',    name: 'Wok an der Hauswand',  ab: 1550, stimmung: 5, text: 'Dein Rodel-Wok hängt als Trophäe neben dem Fenster.' },
  { id: 's_hang',   name: 'Rodelhang am Horizont', ab: 1900, stimmung: 7, text: 'Hinter dem Stand ein Hügel, auf dem winzige Rodler hinunterflitzen.' },
];
// Minispiel Eisbahn (10.10.): Schlittschuh-Läufer, springen und Tricks.
export const EIS_DAUER = 45;
export const EIS_STERN = 15;
export const EIS_DEKO = [
  { id: 'e_schlittschuhe', name: 'Schlittschuhe am Nagel', ab: 700,  stimmung: 5, text: 'Ein Paar Schlittschuhe hängt neben der Haustür.' },
  { id: 'e_pinguin',       name: 'Pinguin',                ab: 1400, stimmung: 5, text: 'Ein kleiner Pinguin mit Mütze steht auf dem Gehweg.' },
  { id: 'e_schnuppen',     name: 'Sternschnuppen',         ab: 2400, stimmung: 7, text: 'Nachts ziehen Sternschnuppen über dein Haus.' },
];
// Minispiel Schneeballschlacht (12.10.): Grummel hinter Schneewällen
// abwerfen, Wichtel verschonen. Deko-Kürzel g_ (Grummel).
export const SCHNEE_DAUER = 40;
export const SCHNEE_DEKO = [
  { id: 'g_vorrat',  name: 'Schneeballvorrat',     ab: 700,  stimmung: 5, text: 'Ein Berg Schneebälle liegt griffbereit am Gehweg.' },
  { id: 'g_lauscher', name: 'Neugieriger Grummel', ab: 1400, stimmung: 5, text: 'Ein kleiner Grummel lugt hinter dem alten Baum hervor - ganz friedlich.' },
  { id: 'g_fahne',   name: 'Siegerfahne',          ab: 2400, stimmung: 7, text: 'Auf dem Stand weht die Fahne der Schneeballschlacht.' },
];
// Minispiel Backstube (10.10.): Plätzchen nach Rezept - ausstechen, backen
// (im goldenen Bereich aus dem Ofen holen), verzieren. Statt Deko fürs Haus
// gibt es REZEPTE fürs Rezeptbuch; neue Rezepte kommen auch in die Runden.
// Gebackene Plätzchen wandern in die Dose auf dem Stand (DOSE_*).
export const BACK_DAUER = 60;
export const BACK_OFEN = 2.2;           // s, bis ein Plätzchen verbrennt (Normal)
export const BACK_GOLDEN = [0.52, 0.8]; // goldener Bereich im Ofenbalken
export const BACK_FORMEN = ['stern', 'mond', 'herz', 'baum', 'kreis'];
export const BACK_DEKOS = {
  guss:      { kurz: 'ZUCKERGUSS', name: 'Zuckerguss',  f: '#fbf6ee' },   // 11.10.: ausgeschrieben, GUSS und PUDER verwechselte man
  puder:     { kurz: 'PUDERZUCKER', name: 'Puderzucker', f: '#f0ece4' },
  schoko:    { kurz: 'SCHOKO', name: 'Schokolade',  f: '#5a3220' },
  gruen:     { kurz: 'GRÜN', name: 'Grüner Guss', f: '#5aa84a' },
  marmelade: { kurz: 'MARMELADE', name: 'Marmelade',   f: '#c8283a' },
};
export const BACK_REZEPTE = [
  { id: 'zimtstern',   name: 'Zimtstern',      form: 'stern', deko: 'guss',      ab: 0,    text: 'Mandelteig mit Zimt, oben schneeweißer Guss.' },
  { id: 'kipferl',     name: 'Vanillekipferl', form: 'mond',  deko: 'puder',     ab: 0,    text: 'Kleine Hörnchen, dick in Vanillezucker gewälzt.' },
  { id: 'herz',        name: 'Lebkuchenherz',  form: 'herz',  deko: 'schoko',    ab: 0,    text: 'Würzig, weich und mit Schokolade überzogen.' },
  { id: 'baeumchen',   name: 'Tannenbäumchen', form: 'baum',  deko: 'gruen',     ab: 800,  text: 'Butterplätzchen mit grünem Guss und bunten Streuseln.' },
  { id: 'spitzbube',   name: 'Spitzbube',      form: 'kreis', deko: 'marmelade', ab: 1600, text: 'Zwei Mürbeteigtaler, dazwischen rote Marmelade.' },
  { id: 'schokostern', name: 'Schokostern',    form: 'stern', deko: 'schoko',    ab: 2600, text: 'Wie der Zimtstern, nur in Schokolade getaucht.' },
];
// Die Plätzchendose auf dem Stand: Jeder Gast, den du SELBST bedienst, nimmt
// ein Plätzchen und zahlt dafür etwas mehr. Die Wichtel verteilen keine.
// Wetter mit Folgen (10.10.): An kalten Tagen geht Punsch besser, an
// nasskalten Heiße Schokolade - die Sorten werden öfter bestellt (`mehr`) und
// zahlen etwas mehr (`bonus`). Lage und Temperatur: Z.tagesWetter().
export const WETTER_LAGEN = {
  frost:     { name: 'Klirrende Kälte', text: 'Heute geht Punsch besonders gut', gruppe: ['gluehwein', 'kinderpunsch', 'eierpunsch', 'jaegertee', 'feuerzange'], bonus: 0.2, mehr: 1.8 },
  schmuddel: { name: 'Nasskaltes Schmuddelwetter', text: 'Heute wollen alle etwas Süßes und Warmes', gruppe: ['schoko', 'weisser', 'apfel'], bonus: 0.2, mehr: 1.8 },
};

// Wunschzettel (10.10.): höchstens ein Brief offen, der nächste frühestens am
// Tag nach dem Dank. Ab dem zweiten Spieltag, höchstens BRIEF_MAX je Saison.
export const BRIEF_AB_TAG = 3;   // 11.10.: Einstieg in Wellen (vorher 1)
export const BRIEF_MAX = 10;
export const BRIEF_BACKEN = 5;            // so viele Plätzchen wünscht sich das Back-Kind
export const BRIEF_LOHN_MINUTEN = 4;      // Dank: so viele Minuten Einnahmen …
export const BRIEF_LOHN_MIN = 200;        // … mindestens so viele Sterne
export const BRIEF_KINDER = [
  { name: 'Lena', alter: 7, maedchen: true }, { name: 'Paul', alter: 6 }, { name: 'Mia', alter: 8, maedchen: true },
  { name: 'Jonas', alter: 5 }, { name: 'Emil', alter: 9 }, { name: 'Hanna', alter: 6, maedchen: true },
  { name: 'Ben', alter: 7 }, { name: 'Lotta', alter: 8, maedchen: true }, { name: 'Finn', alter: 6 }, { name: 'Ida', alter: 5, maedchen: true },
];
export const DOSE_MAX = 30;
export const DOSE_BONUS = 0.25;

// Drei Schwierigkeiten für alle Minispiele (10.10.): `tempo` macht Tiere,
// Wok und Kundenungeduld schneller, `punkte` zahlt dafür mehr. Ein Rekord
// für alle Stufen - wer schwer spielt, kommt schneller an die Deko.
// Minuspunkte für Fehler (13.10., Nutzerwunsch: „wenn man was falsch macht,
// soll man schon Minuspunkte bekommen"). Rohwerte wie die Pluspunkte -
// sie laufen über miniStufe().punkte (Schwierigkeit und `skala`). Der
// Punktestand fällt nie unter 0. Bemessen an dem, was ein Erfolg bringt
// (Hase 10, Kunde Christbaum 50-120, Plätzchen 22-90, Stern 15-20).
export const MINI_MINUS = {
  lichtung: {},                              // keine Minuspunkte (13.10., Nutzerwunsch)
  baum:     { falsch: 20, langsam: 30 },
  back:     { falsch: 10, verbrannt: 15, langsam: 20 },
  berg:     { crash: 30 },
  eis:      { sturz: 25 },
  schnee:   { daneben: 3, abbekommen: 10 },   // Wichtel getroffen: ARTEN.wichtel.wert (-15)
};
export const MINI_STUFEN = [
  { id: 'leicht', name: 'Leicht', tempo: 0.8,  punkte: 0.7 },
  { id: 'normal', name: 'Normal', tempo: 1,    punkte: 1 },
  { id: 'schwer', name: 'Schwer', tempo: 1.25, punkte: 1.4 },
];
// Welche Minispiele es gibt: Deko-Liste und Umrechnung der Punkte in Sterne.
//
// `skala` (11.10., gemeldet: „beim Christbaum bekommt man wesentlich mehr
// Punkte"): gleicht die Spiele so an, dass eine REALISTISCHE menschliche
// Runde überall bei rund 2.000 Punkten liegt. Gemessen am Autopiloten
// (gemütlich/mittel/gut/perfekt, Rohpunkte): Lichtung 917/1.728/2.646/3.951,
// Christbaum 1.124/1.611/2.503/3.428, Schlittenberg 1.145/1.616/1.875/2.034,
// Eisbahn 280/932/1.311/2.967, Backstube 1.000/1.700/2.500/3.360. Für den Bot
// liegen sie nah beieinander - für Menschen nicht: Den Christbaum (Folgen
// antippen, kein Reaktionsdruck) schafft man fast perfekt, die Lichtung
// höchstens „gut", die Eisbahn mit Stürzen eher „mittel". Angenommene
// menschliche Runde: Christbaum ~3.000, Lichtung ~2.650, Backstube ~2.500,
// Schlittenberg ~1.900, Eisbahn ~1.300.
// Alle Punktzahlen in den Spielen laufen über `miniStufe()`; Deko-Schwellen,
// Rezept-Schwellen und die Sterne-Umrechnung (`jeMin`) werden unten mit
// derselben Zahl umgerechnet (die Rohwerte oben bleiben die gemessenen),
// alte Rekorde in laden() (spiel.js): Jeder Stand merkt sich in
// `st.miniSkalaWert`, mit welchem Faktor seine Rekorde gespeichert sind, und
// rechnet bei einer Änderung hier selbst um - `skala` darf also nachgezogen werden.
export const MINISPIELE = {
  lichtung: { deko: LICHTUNG_DEKO, skala: 0.6 },   // 0,75 bis die Runde 40 s wurde
  baum:     { deko: BAUM_DEKO, skala: 0.65 },
  berg:     { deko: BERG_DEKO, skala: 1.05 },
  eis:      { deko: EIS_DEKO, skala: 1.5 },
  back:     { deko: [], skala: 0.8 },
  schnee:   { deko: SCHNEE_DEKO, skala: 0.75 },   // 12.10.: Bot 1.843/2.565/3.022/3.753 roh
};
const auf50 = (n) => Math.round(n / 50) * 50;
for (const m of Object.values(MINISPIELE)) {
  m.jeMin = MINI_JE_MIN; m.maxMin = MINI_MAX_MIN;   // gilt schon nach `skala`
  for (const d of m.deko) d.ab = auf50(d.ab * m.skala);
}
for (const rz of BACK_REZEPTE) rz.ab = auf50(rz.ab * MINISPIELE.back.skala);
/** Schwierigkeit samt Punktfaktor des Spiels - jede Punktzahl im Spiel läuft hierüber. */
export function miniStufe(name, nr) {
  const s = MINI_STUFEN[nr] || MINI_STUFEN[1];
  return { ...s, punkte: s.punkte * MINISPIELE[name].skala };
}


// Minispiele kommen nach und nach (10.10., Nutzerwunsch: „sonst zu überladen
// am Anfang"). Spieltag (ab dem ersten Spieltag gezählt), ab dem ein Spiel auf
// der Karte steht - abwechselnd zwei und drei Tage Abstand. Wer spät anfängt,
// bekommt sie zusammengeschoben: Spätestens am MINI_ALLE_DEZ. Dezember ist
// das letzte offen, die anderen entsprechend früher (siehe miniOffen()).
export const MINI_AB_TAG = { lichtung: 0, baum: 2, back: 5, eis: 7, berg: 10, schnee: 12 };
export const MINI_ALLE_DEZ = 14;

// Einstieg in Wellen (11.10., Nutzerwunsch: „am Anfang zu viele Popups
// gleichzeitig"). Gemessen hatte ein neuer Spieler in den ersten 3 Minuten
// 10 Erklärblasen, 15 „Neu freigeschaltet", 4 Socken, Ansturm, Nikolaus und
// eine Großbestellung mitten in der Wichtel-Erklärung. Jetzt:
//  - erst nach den STARTZIELEN: besondere Gäste, Ansturm, Großbestellungen,
//    eilige Gäste, Socken- und „Neu frei"-Einblendungen, Aufträge-Hinweis
//  - dazu ab SPIELTAG (0 = erster Tag): siehe EINSTIEG
// Alte Spielstände (spieltag 99) merken davon nichts.
// Markt (11.10.): Tag 5, nicht 4 - an Tag 4 kommen schon Wunschzettel und
// Weihnachtsmann auf der Karte. MARKT_ERST muss denselben Wert haben: Vorher
// stand dort 2 gegen 3 hier, der erste Markttermin fiel in die Sperre, und
// der Markt kam erst an Tag 6 oder 7.
// 13.10.: sonder 1 → 0 (Betatest: am ersten Tag nach den Startzielen passierte nichts mehr - jetzt kommt
// der erste besondere Gast und mit ihm die Stammgäste noch in der ersten Sitzung)
export const EINSTIEG = { sonder: 0, ansturm: 1, haendler: 1, wetter: 1, schlitten: 2, santa: 3, markt: 4 };
export const VORSCHAU_NACH = 480;   // s in der Sitzung, bis „Morgen wartet …“ kommt (einmal am Tag)
export const RUHE_NACH_START = 120;   // s nach dem letzten Startziel ohne Großbestellung, Gruppe, Ansturm, Sondergast

// ---------------------------------------------------------------------------
// Vögel am Futterhaus (11.10.). Nur wenn das Futterhaus gefüllt ist (antippen,
// hält FUTTER_STUNDEN echte Stunden). `w` = Gewicht, `schnee` = nur bei Schnee,
// `nacht` = nur nachts, `nachtAuch` = auch nachts. `text` steht im Fenster beim
// ersten Besuch und beim Antippen im Album (14.10.).
// Der Meisenknödel (Türchen 18) verdoppelt die Gewichte der seltenen.
// ---------------------------------------------------------------------------
export const VOEGEL = [
  { id: 'spatz',    name: 'Spatz',         w: 34, f: ['#8a6a4a', '#c8a880', '#5a4030'], text: 'Der Haussperling ist nie gern allein und tschilpt den ganzen Tag mit seinen Freunden. Im Winter plustert er sich zu einer kleinen Federkugel auf.' },
  { id: 'kohlmeise', name: 'Kohlmeise',    w: 26, f: ['#2a2a30', '#f0d040', '#f4f4f0'], text: 'Die häufigste Meise im Garten. Ihr Ruf klingt wie „Zi-zi-bäh“ - und beim Fressen hängt sie gern kopfüber am Futterhaus.' },
  { id: 'blaumeise', name: 'Blaumeise',    w: 18, f: ['#4a8ad8', '#f0d848', '#f4f4f0'], text: 'Ein kleiner Turner mit blauem Käppchen: Sie hangelt sich an die dünnsten Zweige und wiegt dabei nur etwa elf Gramm.' },
  { id: 'rotkehlchen', name: 'Rotkehlchen', w: 12, f: ['#8a6a4a', '#e8702a', '#e8dcc8'], selten: true, nachtAuch: true, text: 'Singt sogar mitten im Winter - und manchmal nachts unter einer Laterne. Es ist neugierig und kommt Menschen erstaunlich nah.' },
  { id: 'gimpel',   name: 'Gimpel',        w: 6,  f: ['#2a2a30', '#e04a5a', '#7a7a88'], selten: true, text: 'Auch Dompfaff genannt. Das Männchen trägt eine leuchtend rote Brust und ein schwarzes Käppchen, und meist ist das Pärchen zusammen unterwegs.' },
  { id: 'seidenschwanz', name: 'Seidenschwanz', w: 2, f: ['#a88a78', '#e8c060', '#3a2a2a'], selten: true, schnee: true, text: 'Ein Wintergast aus dem hohen Norden. Er kommt nur in manchen Jahren, wenn es dort zu wenig Beeren gibt - dann aber gleich im Schwarm.' },
  // Nur nachts (11.10., Betatest: im Dezember ist es nur 8-17 Uhr hell - wer
  // morgens früh und abends spielt, sah sonst nie einen Vogel)
  { id: 'waldkauz', name: 'Waldkauz',    w: 4,  f: ['#7a5a3e', '#b8946a', '#5a4030'], selten: true, nacht: true, text: 'Die Eule mit dem bekannten „Huhuu“. Tagsüber schläft sie gut versteckt, und ihren Kopf kann sie fast ganz nach hinten drehen.' },
];
export const VOGEL_NACHT_TAKT = 2.2;   // nachts so viel seltener (nur Rotkehlchen und Waldkauz)
export const FUTTER_STUNDEN = 12;   // vom Morgen- bis zum Abendbesuch (11.10.: vorher 8)
export const VOGEL_TAKT = [14, 32];   // s zwischen zwei Vögeln
export const VOGEL_BLEIBT = [7, 14];  // s am Futterhaus
export const VOGEL_MAX = 3;           // gleichzeitig
export const KNOEDEL_SELTEN = 2;

// Der eigene Schneemann (11.10.): ab dem ersten Schnee auf dem Gehweg links.
// Einmal am Tag antippen = eine Stufe weiter; jede Stufe ♥ +1, fertig +3.
export const SCHNEEMANN_STUFEN = 7;
export const SCHNEEMANN_HERZ = 1;
export const SCHNEEMANN_FERTIG = 3;

// Feierabend (11.10.): von 17 bis 19 Uhr kommen mehr Gäste.
export const FEIERABEND = { von: 17, bis: 19, gaeste: 0.3 };

// Das schönste Haus im Dorf (11.10.): am 4. Advent kommt die Jury.
// Platz nach Stimmung (Schwellen eingemessen, siehe CLAUDE.md), Lohn in
// Minuten Einnahmen. Wer erst seit ein paar Tagen spielt, ist noch nicht dabei.
export const WETTBEWERB = {
  // Stimmung am 20.12. (Autopilot, Start 24.11.): 5 min/Tag 380 · 10 min 452 ·
  // 20 min + Minispiele 567 · 30 min + 3 Runden 610-664. Ein Mensch braucht
  // 30-40 % mehr Zeit: Gold für Vielspieler, Bronze schon bei kurzem Reinschauen.
  // 13.10.: mit der flacheren Preiskurve (PREIS_KURVE) liegt die Stimmung am 20.12.
  // gemessen um 13 % höher (3×10 min + 1 Minispielrunde: 522 → 590; 3×5 min: 554) -
  // die Schwellen sind im selben Verhältnis mitgezogen (vorher 560 / 440 / 340).
  plaetze: [ { name: 'Gold', ab: 630, f: '#f0c040' }, { name: 'Silber', ab: 500, f: '#d8dce4' }, { name: 'Bronze', ab: 380, f: '#d08a4a' } ],
  lohn: [30, 20, 12, 6],     // Gold, Silber, Bronze, Urkunde
  lohnMin: 2000,
  abSpieltag: 4,
};

// Silvester (11.10.): ab 18 Uhr am 31.12. Feuerwerk über dem Dorf, dazu der
// Abschluss der Saison; um Mitternacht das große Feuerwerk.
export const SILVESTER_STUNDE = 18;

// Feedback der Testspieler (12.10.): ein Google-Formular. `url` = der Link
// zum Formular (…/viewform), `infoFeld` = die Kennung des Kurzantwort-Felds
// für die Spielinfos („entry.123456789", aus „Vorausgefüllten Link abrufen").
// Solange `url` leer ist, gibt es keinen Feedback-Knopf.
export const FEEDBACK = { url: 'https://docs.google.com/forms/d/e/1FAIpQLSe54k8PrZGDBAHZaaTWH2LiJfo0OlOnMgKxy0DlxTuXnf-vzw/viewform', infoFeld: 'entry.364683706' };
