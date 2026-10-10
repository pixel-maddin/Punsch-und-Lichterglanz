# Punsch & Lichterglanz

Ein kleines Clicker-Spiel fürs Handy (hochkant) im Pixel-Look. Der Herbst
ist grau, das Haus ist kahl - bis Weihnachten soll es das schönste der
Straße sein. Die Sterne dafür kommen vom Punschstand vor dem Haus.

```bash
python3 server/serve.py            # dann http://localhost:8060
python3 server/serve.py --open     # und gleich den Browser öffnen
```

Oder Doppelklick auf `Start.command`. Vom Handy aus die IP nehmen, die der
Server beim Start ausgibt. Das Spiel lässt sich als App installieren
(„Zum Home-Bildschirm") und läuft dann auch offline - über eine LAN-IP
allerdings nur ohne Offline-Teil, dafür braucht es HTTPS oder localhost.

## So wird gespielt

1. **Glas holen** - links auf dem Tresen.
2. **Abfüllen** - auf den Topf tippen, dessen Symbol im Bläschen des
   Gastes steht.
3. **Kurz warten**, bis das Glas voll ist - teure Getränke brauchen länger.
4. **Servieren** - auf den Gast tippen. Je schneller, desto mehr Trinkgeld.
5. **Leerer Topf** - ein paarmal antippen, dann ist er wieder voll.
6. **Handgriffe** - fast jedes Getränk hat seinen eigenen: Zuckerstange
   (Kinderpunsch), dreimal umrühren (Apfel), Zuckerguss (Lebkuchen), Sahne
   (Schokolade), Sahne und Zimt (Herzwärmer), Milchschaum und Zimtstange
   (Zimtwolke), Zuckerhut anzünden (Feuerzauber). Das fertige Glas auf dem
   Tablett antippen - die goldene Blase zeigt, was fehlt. Dann zahlt der Gast
   20 bis 50 % mehr. Drei brauchen Timing: beim Waldtee den Beutel im grünen
   Moment herausziehen, den Crêpe auf der Platte im grünen Moment wenden, und
   den Feuerzauber servieren, solange der Zuckerhut brennt.

Falsch geliefert kostet nichts: Der Gast lehnt ab, das Glas bleibt stehen -
vielleicht will es der Nächste. Wer gerade sein Getränk bekommt, wartet.
Falsch Eingeschenktes kippt man in den Ausguss rechts. **Sobald der Servier-Wichtel da ist,** schenkt er für dich ein: Gast
antippen, ein Wichtel stellt das Getränk aufs Tablett, dann (gern mit
Handgriff) den Gast nochmal antippen zum Servieren.

**Selbst servieren lohnt sich:** Was du selbst servierst, bringt doppelt so
viele Sterne wie bei den Wichteln, und Trinkgeld gibt es nur von dir.
Einmal am Tag kommt ein **Ansturm**: 60 Sekunden dreifaches Trinkgeld, die
Wichtel schauen nur zu.

**Während du weg bist**, arbeiten die Wichtel weiter und legen alles in eine
Kiste, die du beim Zurückkommen öffnest. Die Kiste fasst höchstens 3 Stunden
Arbeit - wer mehrmals am Tag kurz reinschaut, holt jedes Mal eine volle ab.

**Haus schmücken:** Tippe auf dein Haus. Jeder Deko-Platz hat drei
Varianten - die Tanne kann eine Riesentanne oder eine Palme werden, auf dem
Dach warten Rentiere oder ein steckengebliebener Nikolaus, am Stand spielt
eine Blaskapelle oder der Elvis-Wichtel. Die dritte Variante zeigt sich erst,
wenn man die zweite hat. Jede zusätzliche bringt ♥ +2.

**Der fahrende Händler** kommt bis zu zweimal am Tag mit seinem Karren vorbei
(links vor dem Haus antippen). Er hat Deko, die es nur bei ihm gibt -
Riesen-Schneekugel, Lichter-Flamingo, Polarlicht-Laterne, Drehorgel-Wichtel,
Wetterhahn-Rentier - und einen Zimtstern-Gutschein: 10 Minuten doppelte
Sterne fürs Servieren.

**Luxus-Stücke** (✦ Extra für Profis: Lichtershow, Festbeleuchtung, Stand
Stufe 3) braucht man fürs schönste Haus nicht - mit 10 bis 15 Minuten am
Tag (verteilt auf mehrere kurze Besuche) ist bis Heiligabend alles andere geschafft.

**Schwung:** Wer zügig hintereinander bedient, bekommt bis zu 40 % mehr.
**Stoßzeit:** Wer ein paar Minuten am Stück spielt, bekommt Besuch von
einer ganzen Gruppe (doppeltes Trinkgeld). **Besondere Gäste:** Ab und zu kommt jemand ganz Besonderes vorbei - wer,
wird nicht verraten.
**Großbestellung:** Manchmal bestellt eine ganze Gruppe viele Gläser auf
einmal, mit Zeitlimit - schafft man alle, gibt es richtig viele Sterne.
**Du bist der Chef:** Solange du am Stand mitarbeitest, sind die Wichtel
anderthalbmal so schnell. Besondere Gäste und Großbestellungen bedienst
nur du.

## Erste Schritte

Nach der Einführung zeigt eine Leiste oben immer das nächste Ziel: ein
neues Getränk, drei Deko-Teile, die drei ersten Wichtel, ein drittes
Getränk und 15 ♥ Stimmung. Antippen führt direkt zur richtigen Stelle im
Laden, jedes Ziel bringt ein paar Sterne.

## Aufträge und Erfolgswand

Jeden Tag drei Aufträge (leicht, mittel, schwer) mit Belohnung. Der schwere
bringt ein Sammelstück, das es nur dort gibt. Eilige Gäste (orange Blase)
warten kürzer, zahlen aber doppelt.

Im zweiten Reiter hängt die **Erfolgswand**: 24 Socken über dem Kamin, eine
je Erfolg. Mit jeder Socke wird das Wohnzimmer weihnachtlicher.

## Die Karte

Der Knopf **Karte** unten links öffnet eine Übersichtskarte der Gegend, mit
deinem Haus in der Mitte: Berge, ein Bach mit Holzbrücken, der in einen
Weiher mündet (im Winter zugefroren, mit Schlittschuhläufer), Wälder,
Wege mit Laternen. Rauch steigt aus den Schornsteinen, im Wichtelwald
schwirren Glühwürmchen, am Schlittenberg saust ein Wok die Bahn hinunter,
und nachts leuchten Fenster und Lichterketten. Die Geschäfte sind Orte
darauf, und jedes zeigt beim Öffnen oben ein Bild von sich:

| Ort | Was es gibt |
|---|---|
| **Weihnachtsladen** (im Dorf) | Deko fürs Haus (Lichterketten, Stern, Schwibbogen, Nussknacker, Eiszapfen, Nikolaus auf dem Dach, Lichtershow), den Garten (Tanne mit Lichtern, Kugeln, Stern, Schneemann-Familie, Lichter-Rentier, Schlitten, Lichterbogen) und den Stand (Girlande, Zuckerstangen, Licht, Schild, Musikbox, Heizpilz, Bierbänke - jeweils mit Bonus) |
| **Baumarkt** | Längerer Tresen, größere Töpfe, Tablett; Holzstapel, neue Tür, Zaun, **Kaminofen** (die Fenster leuchten), Laternen; vier Anstriche: Winterweiß, Schwedenrot, Lebkuchenhaus, Alpenchalet |
| **Supermarkt** | Zutaten: Kinderpunsch (lockt Kinder an), heißer Apfel, Lebkuchen, heiße Schokolade, Herzwärmer, Waldtee, Crêpe, Zimtwolke, Feuerzauber - alles alkoholfrei |
| **Wichtelwald** | Spül-, Servier-, Nachfüll-, Crêpe- und Kassen-Wichtel, in ihren Baumstammhäusern |

**Minispiele kommen nach und nach:** Am Anfang steht nur die Waldlichtung
auf der Karte. Alle zwei bis drei Tage kommt ein neues dazu (Christbaumverkauf
am 3. Spieltag, Backstube am 6., Eisbahn am 8., Schlittenberg am 11.), jeweils
mit einem Fenster, das es vorstellt. Bis dahin sieht man auf der Karte nur das
Bild des Ortes, ohne Schild. Wer erst im Dezember anfängt, bekommt sie
schneller - spätestens am 14.12. ist alles offen.

**Christbaumverkauf (Minispiel):** Kunden fahren vor und wollen einen
bestimmten Baum - Größe und Sorte (Nordmanntanne, Blaufichte, Fichte) stehen
in der Sprechblase. Den richtigen Baum dreimal antippen zum Sägen, dreimal ins
Netz, dann aufs Autodach. 60 Sekunden; je schneller, desto mehr Punkte, und
fehlerfreie Kunden hintereinander geben eine Kette bis ×3. Sterne für die
ersten drei Runden am Tag, Rekord, und ab 900, 1.700 und 2.700 Punkten:
Riesenkugeln im Baum, ein Bäumchen auf dem Dachfirst und ein Lichterwald.

**Schlittenberg (Minispiel):** Im Wok den Berg hinunter! Daumen aufs Bild
legen und seitlich ziehen - der Wok folgt. Tannen, Steinen, Schneemännern und
Holzstapeln ausweichen, Sterne einsammeln - große Sterne zählen doppelt. Je
schneller du im Ziel bist, desto mehr Punkte. Ab 1.000, 1.550 und 1.900 Punkten
Rekord: Rodelkinder auf dem Gehweg, dein Wok als Trophäe an der Hauswand und
ein Rodelhang am Horizont.

In allen Minispielen pausiert die Musik und läuft danach an derselben Stelle
weiter. Jedes Minispiel hat drei Schwierigkeiten: Leicht (Punkte ×0,7),
Normal und Schwer (Punkte ×1,4) - der Rekord gilt für alle.

**Eisbahn (Minispiel, am Weiher):** Schlittschuhlaufen! Tippen lässt den
Wichtel springen - über Schneemänner, Steine, Holzstapel und Eislöcher. In der
Luft wischen macht Tricks: nach oben ein Salto, nach links eine Pirouette,
nach rechts eine Grätsche. Zwei Tricks in einem Sprung sind eine Kombo mit
doppelten Punkten - aber wer landet, bevor der Trick fertig ist, fällt hin.
Ab 700, 1.400 und 2.400 Punkten Rekord: Schlittschuhe neben der Haustür, ein
Pinguin auf dem Gehweg und Sternschnuppen am Nachthimmel.

**Weihnachtsmann:** Ab und zu versteckt er sich irgendwo auf der Karte und
lugt hinter einem Busch oder einer Tanne hervor. Wer ihn findet und antippt,
bekommt Sterne geschenkt.

**Weihnachtsmarkt (Festplatz):** Alle drei bis vier Tage ist Markt - er wird
ein paar Tage vorher angekündigt, und auf der Karte steht am Festplatz, wann.
Am Markttag kommen 20 % mehr Gäste an deinen Stand, und auf dem Markt gibt es
Deko, die es nur dort gibt (Riesenrad, Herrnhuter Stern, Pferdekutsche,
Fensterbilder, Lebkuchenherzen), dazu jedes Mal ein Rezept, mit dem zwei
Getränke dauerhaft 20 % mehr Sterne bringen.

**Waldlichtung (Minispiel):** Hasen, Eichhörnchen und Rehe ziehen durch die
Lichtung - die Rehe im schnellen Galopp - tippe sie an, um sie zu füttern. 30 Sekunden, schnelles Füttern
hintereinander gibt eine Kette bis ×5, selten kommt ein goldener Schneehase.
Gefüttert wird an der Raufe mitten in der Lichtung - Möhren, Nüsse und Äpfel.
Für die ersten drei Runden am Tag gibt es Sterne, dazu einen eigenen Rekord.
Ab 800, 1.800 und 3.000 Punkten Rekord ziehen Tiere bei dir ein: eine
Hasenfamilie, ein Eichhörnchen auf dem Dach und ein Reh am Gartenweg.
Ganz selten - nur alle vier bis sieben Runden - kommt ein besonderer Gast
vorbei: ein Fuchs, ein Wildschwein oder ein Igel. Wer ihn füttert, hat ihn
im Album.

**Backstube (Minispiel, im Dorf):** Kunden wollen Plätzchen - das Bild steht
in der Sprechblase. Die richtige Ausstechform antippen (das Plätzchen rutscht
von selbst in den Ofen), es goldbraun herausholen, solange der Balken über dem
Ofen im gelben Bereich steht (zu früh blass, zu spät dunkel, am Ende
verbrannt), dann die richtige Verzierung: Zuckerguss, Puderzucker,
Schokolade, grüner Guss oder Marmelade. 60 Sekunden, Kette bis ×3. Statt Deko
fürs Haus gibt es ein **Rezeptbuch**: Zimtstern, Vanillekipferl und
Lebkuchenherz von Anfang an, ab 800, 1.600 und 2.600 Punkten Rekord
Tannenbäumchen, Spitzbube und Schokostern - die kommen dann auch in den
Runden vor. Was du bäckst, kommt in die **Plätzchendose** auf deinem Stand
(höchstens 30): Jeder Gast, den du selbst bedienst, nimmt eins und zahlt 25 %
mehr.

Die Weihnachtskarte zum Teilen heißt **Foto**.

Hausdeko bringt **Stimmung** (♥). Je mehr Stimmung, desto mehr Gäste -
und desto mehr zahlen sie.

## Wunschzettel und Album

**Wunschzettel:** Ab und zu steckt ein Brief im roten Briefkasten neben der
Haustür - die Fahne ist dann oben. Ein Kind aus dem Dorf wünscht sich etwas:
ein Stück Deko, ein Getränk an deinem Stand, Plätzchen aus der Backstube, eine
Runde auf der Eisbahn oder dass du den Weihnachtsmann auf der Karte findest.
Es gibt keine Frist. Ist der Wunsch erfüllt, liegt ein Dankeschön im Kasten:
ein gemaltes Bild und ein paar Sterne. Ein Brief zur Zeit, der nächste
frühestens am Tag danach, höchstens zehn je Adventszeit.

**Album** (Aufträge → Album): alle Besucher, die du schon bedient hast
(auch Rentier, Schneemann, Grummel und Weihnachtsmann), die Tiere der
Waldlichtung samt dem seltenen Goldhasen, das Rezeptbuch und die
Dankesbilder der Kinder. Was du noch nicht gesehen hast, steht als dunkler
Umriss da.

## Echte Zeit

Beim ersten Start wählt man: **Klassisch** (das Spiel folgt dem echten
Kalender) oder **Individuell** (das Spiel beginnt immer eine Woche vor dem
1. Dezember, egal wann man startet). Die Uhrzeit ist in beiden Fällen echt.

- Nachts ist es dunkel, die Lichter leuchten.
- Bis zum 30. November ist Spätherbst: kahle Bäume, fallendes Laub, Regen.
- **Ab dem 1. Dezember liegt Schnee**, und es gibt Schneemänner zu kaufen.
- **Vorfreude-Päckchen:** Bis zum 1. Dezember wartet im Kalender jeden Tag
  ein Päckchen mit Sternen.
- **Adventskalender:** jeden Tag ein Türchen, manche mit Deko, die es nur
  dort gibt (Adventskranz, dessen Kerzen mit den Adventssonntagen
  mitzählen; Nikolausstiefel; Mistelzweig; Vogelhäuschen; am 24. der
  goldene Stern).
- **Jeder Adventssonntag** bringt ein Ereignis mit Bild (Weihnachtsmarkt,
  Neuschnee, Chorkonzert, das Dorf leuchtet), schaltet Neues frei und
  lockt besonders viele Gäste an.
- **Barbarazweig:** Ab dem 4. Dezember (Barbaratag) lässt sich im Kalender
  ein Kirschzweig schneiden. Er steht dann in einer Vase im rechten
  Fenster. Jeden Tag kann man ihn einmal gießen, die Knospen schwellen,
  und an Heiligabend blüht er auf: je gegossenem Tag eine Blüte mehr
  (4 bis 24). Wer nicht gießt oder später schneidet, verliert nichts,
  er blüht trotzdem, nur kleiner.
- **Heiligabend** schneit es ab dem Nachmittag. Ab 17 Uhr läuten die
  Glocken: Die Kirche ist hell, ihre Tür steht offen, und vor dem Haus
  singen Leute mit Kerzen. Einmal kommt das **Finale** mit Bild und
  danach **Mein Advent**, ein Rückblick mit Gästen, Sternen, Deko,
  Stimmung, Türchen, Weihnachtsmann-Funden und Blüten. Wer erst nach
  Heiligabend spielt (bis zum 6. Januar), bekommt es nachgereicht. Den
  Rückblick gibt es danach auch im Menü.
- Silvester gibt es Feuerwerk.
- **Wetter mit Folgen:** Jeder Tag hat sein Wetter, mit Temperatur an der
  Uhr. An Tagen mit **klirrender Kälte** (nur mit Schnee) wird Punsch öfter
  bestellt und bringt 20 % mehr, die Gäste haben Atemwölkchen. An
  **nasskalten Schmuddeltagen** gilt dasselbe für Heiße Schokolade,
  Zimtwolke und Heißen Apfel. Einmal am Tag sagt ein Hinweis, was heute
  gut geht; im Menü steht das Wetter des Tages.
- **Der erste Schnee** ist ein eigener Moment: Die Musik hält inne, das Bild
  beschlägt an den Rändern, eine große Flocke schwebt herab, dann kommt
  das Bild vom verschneiten Dorf.
- Ab September beginnt eine neue Adventszeit - das Haus fängt wieder kahl
  an, ein Andenken bleibt.

## Teilen

**Foto** in der Leiste macht aus dem aktuellen Bild eine Weihnachtskarte
mit einem von fünf Rahmen, einem Weihnachtsgruß, Hausname und Datum, die über das Teilen-Menü des Handys verschickt
werden kann. Ab Heiligabend gibt es zusätzlich die **Festtagskarte**
(dunkelblau, goldener Rahmen, großer Stern). Auf ihr steht eine Zeile
„Unser Advent“ mit Gästen, Deko und Stimmung. Sie ist dann die erste
Karte, die man sieht.

## Technik

Reines Canvas 2D (180 Pixel breit, per CSS hochskaliert), ES-Module,
kein Node, kein npm, keine Bilddatei - Grafik und Geräusche entstehen im
Code. Einzige Fremddatei ist die Musik (`web/audio/musik.m4a`), im Menü
lauter, leiser oder ganz aus. Spielstand in `localStorage` (`adventshaus.v1`).

`web/` ist rein statisch und läuft auf jedem Webserver. Beim Hochladen auf
GitHub veröffentlicht `.github/workflows/pages.yml` den Ordner `web/` über
GitHub Pages (einmalig unter *Settings → Pages → Source* „GitHub Actions"
wählen). **Bei jedem Update die Versionsnummer erhöhen** (`?v=` in
`index.html` und `src/*.js`, `VERSION` in `sw.js`), sonst behalten Browser
alte Dateien.

## Musik

„Music2" (`web/audio/musik.m4a`) wurde mit [Suno](https://suno.com)
erstellt und wird nicht-kommerziell verwendet.

## Nutzung

Privates Hobbyprojekt, nicht kommerziell.
