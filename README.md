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

**Goldene Gäste:** Ab der zweiten Stufe des Servier-Wichtels bedienen die
Wichtel normale Gäste allein, auch wenn du da bist. Du kümmerst dich dann um
die goldenen Gäste (goldene Blase mit Funkeln): Alle paar Sekunden kommt
einer, er drängelt vor, nur du kannst ihn bedienen, und er zahlt viel mehr. Eilige Gäste und
Bestellungen für eine Bitte lassen die Wichtel dann ebenfalls für dich stehen.

**Ruf deines Standes:** Jeden Tag, an dem du ein bisschen mitarbeitest
(5 goldene oder besondere Gäste oder eine Minispielrunde - vorher 25 Gäste
selbst bedienen), steigt der Ruf um eine Stufe, und alle Preise steigen um
2 %. Ein verpasster Tag kostet nichts. Der Stand steht oben unter Aufträge.
Im Laden steht unter jedem Preis, wie lange der Stand ungefähr noch dafür
braucht.

**Stammgäste:** Oma Hilde mit Dackel Waldi, Postbotin Sophia, Karl mit
seinen Witzen, die kleine Lena und Förster Franz kommen jeden Tag einmal
vorbei - zu jeder Uhrzeit, sobald du am Stand bist (jeder hat aber seine
Lieblingszeit). Jeder erzählt Stück für Stück seine Geschichte, und zwischen
24.12. und 6.1. bringt jeder, der dich schon kennt, ein Abschiedsgeschenk.

**Bitten der Stammgäste:** Einmal am Tag hat einer der Stammgäste, die du
schon kennst, eine Bitte an dich - fünf Kinderpunsch für Hildes Strickrunde,
eine Runde Christbaumverkauf für Karls neuen Witz, Futter für Franz' Meisen.
Sie steht unter Aufträge, hat keine Frist und erzählt die Geschichte des
Gastes weiter. Erfüllt gibt es Sterne und einen Dank.
Einmal am Tag kommt ein **Ansturm**: 60 Sekunden dreifaches Trinkgeld, die
Wichtel schauen nur zu.

**Während du weg bist**, arbeiten die Wichtel weiter. Warst du nur kurz weg
(unter einer Stunde), gibt es ihre Sterne gleich beim Zurückkommen. Länger weg,
legen sie alles in eine Kiste, die du beim Zurückkommen öffnest. Die Kiste fasst
höchstens 3 Stunden Arbeit - wer
mehrmals am Tag kurz reinschaut, holt jedes Mal eine volle ab.

Aufträge und Bitten, die ein Getränk verlangen, das gerade nicht in deinem
**Angebot** steht, sagen das und haben einen Knopf „Angebot öffnen“.

**Haus schmücken:** Knopf „Haus" oben links, mit den Reitern Haus, Garten,
Stand, Lichter und Geschenke. Jedes Teil hat einen Schalter An/Aus; antippen
klappt Farbe und Varianten auf. Unter „Lichter" stellt man alle Ketten auf
einmal aus, warmweiß oder bunt. Jeder Deko-Platz hat drei
Varianten - die Tanne kann eine Riesentanne oder eine Palme werden, auf dem
Dach warten Rentiere oder ein steckengebliebener Nikolaus, am Stand spielt
eine Blaskapelle oder der Elvis-Wichtel. Die dritte Variante zeigt sich erst,
wenn man die zweite hat. Jede zusätzliche bringt ♥ +2.

**Der fahrende Händler** kommt ab dem sechsten Spieltag (wer erst ab Mitte Dezember
spielt, ab dem zweiten) bis zu zweimal am Tag mit seinem Karren vorbei
(links vor dem Haus antippen). Er hat Deko, die es nur bei ihm gibt -
Riesen-Schneekugel, Lichter-Flamingo, Polarlicht-Laterne, Drehorgel-Wichtel,
Wetterhahn-Rentier - und einen Zimtstern-Gutschein: 10 Minuten (nur, solange du spielst)
noch einmal doppelte Sterne fürs Selbstservieren.

**Luxus-Stücke** (✦ Extra für Profis: Lichtershow, Festbeleuchtung, Stand
Stufe 3) braucht man fürs schönste Haus nicht - mit 10 bis 15 Minuten am
Tag (verteilt auf mehrere kurze Besuche) ist bis Heiligabend alles andere geschafft.
Wer viel spielt oder gezielt darauf spart, schafft sie bis Weihnachten.

**Futterhaus** (Weihnachtsladen, Im Garten): hängt im alten Baum. Antippen
füllt es für 12 Stunden, dann kommen Vögel - tagsüber Spatz, Kohlmeise,
Blaumeise und seltener Rotkehlchen, Gimpel und (nur bei Schnee) der
Seidenschwanz; nachts nur das Rotkehlchen und der seltene Waldkauz. Jede
neue Art landet im Album. Der **Meisenknödel** aus
Türchen 18 lockt die seltenen doppelt so oft an.

**Dein eigener Schneemann:** Ab dem ersten Schnee liegt auf dem Gehweg ein
Schneehaufen. Tipp ihn einmal am Tag an, dann wächst er Stufe für Stufe -
Kugel, Bauch, Kopf, Gesicht, Hut, zuletzt Schal und Besen (je ♥ +1,
fertig ♥ +3 obendrauf).

**Feierabend:** Von 17 bis 19 Uhr kommen 30 % mehr Gäste an den Stand.

**Schwung:** Wer zügig hintereinander bedient, bekommt bis zu 40 % mehr.
**Stoßzeit:** Wer ein paar Minuten am Stück spielt, bekommt Besuch von
einer ganzen Gruppe (doppeltes Trinkgeld). **Besondere Gäste:** Ab und zu kommt jemand ganz Besonderes vorbei - wer,
wird nicht verraten.
**Großbestellung:** Manchmal bestellt eine ganze Gruppe viele Gläser auf
einmal, mit Zeitlimit - schafft man alle, gibt es richtig viele Sterne.
**Du bist der Chef:** Solange du am Stand mitarbeitest, sind die Wichtel
doppelt so schnell. Besondere Gäste, goldene Gäste und Großbestellungen
bedienst nur du.

## Erste Schritte

Nach der Einführung zeigt eine Leiste oben immer das nächste Ziel: ein
neues Getränk, drei Deko-Teile, die drei ersten Wichtel, ein drittes
Getränk und zum Schluss der erste Tagesauftrag. Antippen führt direkt zur
richtigen Stelle, jedes Ziel bringt ein paar Sterne. Danach kann die Leiste auf
Wunsch weiter Ziele vorschlagen: zuerst neue Getränke, Helfer und Ausbauten für
den Stand, dazwischen Deko.

## Aufträge und Erfolgswand

Jeden Tag drei Aufträge (leicht, mittel, schwer) mit Belohnung. Der schwere
bringt ein Sammelstück, das es nur dort gibt. Eilige Gäste (orange Blase)
warten kürzer, zahlen aber doppelt.

Im zweiten Reiter hängt die **Erfolgswand**: 24 Socken über dem Kamin, eine
je Erfolg. Mit jeder Socke wird das Wohnzimmer weihnachtlicher.

Wer **wirklich alles** gekauft und voll ausgebaut hat (auch die ✦ Extras), findet
vor dem Kamin ein goldenes Geschenk. Darin steckt das letzte Stück fürs Haus:
die **Weihnachtseisenbahn**, die ab und zu vor dem Haus vorbeituckert.

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
am 3. Spieltag, Backstube am 6., Eisbahn am 8., Schlittenberg am 11., Schneeballwiese am 13.), jeweils
mit einem Fenster, das es vorstellt. Bis dahin sieht man auf der Karte nur das
Bild des Ortes, ohne Schild. Wer erst im Dezember anfängt, bekommt sie
schneller - spätestens am 14.12. ist alles offen.

**Christbaumverkauf (Minispiel):** Kunden fahren vor und wollen einen
bestimmten Baum - Größe und Sorte (Nordmanntanne, Blaufichte, Fichte) stehen
in der Sprechblase. Den richtigen Baum dreimal antippen zum Sägen, dreimal ins
Netz, dann aufs Autodach. 65 Sekunden; je schneller, desto mehr Punkte, und
fehlerfreie Kunden hintereinander geben eine Kette bis ×3. Sterne für die
ersten drei Runden am Tag, Rekord, und ab bestimmten Rekorden Deko:
Riesenkugeln im Baum, ein Bäumchen auf dem Dachfirst und ein Lichterwald.

**Baumschule:** eigener Ort auf der Karte, unter dem Supermarkt, offen ab dem
Christbaumverkauf. Vier Beete für eigene Tannen (Nordmann, Blaufichte, Fichte).
Sie wachsen von selbst in 6 Tagen, wer jeden Tag gießt, braucht 3, mit Gießen und
Düngen 2. Gießen und Düngen gehen ab dem Tag nach dem Pflanzen, nichts verdorrt.
Fertige Bäume erntet man - im Christbaumverkauf stehen sie dann golden im Feld
und bringen ×3 Punkte. Manchmal versteckt sich ein Eichhörnchen in einem Baum.

**Schlittenberg (Minispiel):** Im Wok den Berg hinunter! Daumen aufs Bild
legen und seitlich ziehen - der Wok folgt. Tannen, Steinen, Schneemännern und
Holzstapeln ausweichen, Sterne einsammeln - große Sterne zählen doppelt. Je
schneller du im Ziel bist, desto mehr Punkte. Ab 1.000, 1.550 und 1.900 Punkten
Rekord: Rodelkinder auf dem Gehweg, dein Wok als Trophäe an der Hauswand und
ein Rodelhang am Horizont.

In den Minispielen läuft eigene Musik (eins von zwei Stücken, zufällig). Jedes Minispiel hat drei Schwierigkeiten: Leicht (Punkte ×0,7),
Normal und Schwer (Punkte ×1,4) - der Rekord gilt für alle.

**Special des Tages:** Sobald drei Minispiele offen sind, glitzert jeden zweiten Tag eines golden
auf der Karte. Dort gibt es an diesem Tag **doppelte Sterne**, dafür ist es
schwerer: etwas schneller und mit einem eigenen Dreh (mehr Rehe, ungeduldige
Kunden, schmaler goldener Bereich, mehr Hindernisse oder mehr Wichtel). Nach
fünf geschafften Specials hängt ein goldener Pokal am Haus.

**Eisbahn (Minispiel, am Weiher):** Schlittschuhlaufen! Tippen lässt den
Wichtel springen - über Schneemänner, Steine, Holzstapel und Eislöcher. In der
Luft wischen macht Tricks: nach oben ein Salto, nach links eine Pirouette,
nach rechts eine Grätsche. Zwei Tricks in einem Sprung sind eine Kombo mit
doppelten Punkten - aber wer landet, bevor der Trick fertig ist, fällt hin.
Sterne hängen über den Hindernissen und auch zwischen ihnen auf der Bahn -
manchmal als Bogen aus drei Sternen, den man mit einem genau getimten Sprung
ganz einsammelt.
Ab 700, 1.400 und 2.400 Punkten Rekord: Schlittschuhe neben der Haustür, ein
Pinguin auf dem Gehweg und Sternschnuppen am Nachthimmel.

**Weihnachtsmann:** Ab und zu versteckt er sich irgendwo auf der Karte und
lugt hinter einem Busch oder einer Tanne hervor. Wer ihn findet und antippt,
bekommt Sterne geschenkt.

**Weihnachtsmarkt (Festplatz):** Alle drei bis vier Tage ist Markt - er wird
ein paar Tage vorher angekündigt, und auf der Karte steht am Festplatz, wann.
Am Markttag kommen 20 % mehr Gäste an deinen Stand, und auf dem Markt gibt es
Deko, die es nur dort gibt (Riesenrad, Herrnhuter Stern, Pferdekutsche,
Fensterbilder, Lebkuchenherzen) - jedes Mal drei davon, immer andere.

**Rezepte** (Supermarkt, jederzeit): Jedes lässt zwei Getränke dauerhaft mehr
Sterne bringen, in drei Stufen - erst +20 %, dann nochmal +30 %, dann nochmal +40 %
(zusammen +90 %). Jede Stufe kostet mehr als die vorige.

**Waldlichtung (Minispiel):** Hasen, Eichhörnchen und Rehe ziehen durch die
Lichtung - die Rehe im schnellen Galopp - tippe sie an, um sie zu füttern. 40 Sekunden, schnelles Füttern
hintereinander gibt eine Kette bis ×5, selten kommt ein goldener Schneehase.
Gefüttert wird an der Raufe mitten in der Lichtung - Möhren, Nüsse und Äpfel.
Für die ersten drei Runden am Tag gibt es Sterne, dazu einen eigenen Rekord.
Je Adventswoche zieht ein Tier bei dir ein: die Hasenfamilie sofort (ab 800
Punkten Rekord), das Eichhörnchen auf dem Dach ab dem 1. Advent (1.600) und
das Reh am Gartenweg ab dem 2. Advent (2.400).
Ab und zu - etwa alle zwei bis vier Runden - kommt ein besonderer Gast
vorbei: ein Fuchs, ein Wildschwein oder ein Igel. Wer ihn füttert, hat ihn
im Album.

**Backstube (Minispiel, im Dorf):** Kunden wollen Plätzchen - das Bild steht
in der Sprechblase. Die richtige Ausstechform antippen (das Plätzchen rutscht
von selbst in den Ofen), es goldbraun herausholen, solange der Balken über dem
Ofen im gelben Bereich steht (zu früh blass, zu spät dunkel, am Ende
verbrannt), dann die richtige Verzierung: Zuckerguss, Puderzucker,
Schokolade, grüner Guss oder Marmelade - beim Spitzbuben erst Marmelade, dann
Puderzucker. 60 Sekunden, Kette bis ×3. Statt Deko
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
ein gemaltes Bild und ein paar Sterne. Eigene Bilder je Kind: `web/bilder/dank/<name>.png`
(96 × 72 Pixel, rechts unten ab x 62 / y 30 frei - dort setzt das Spiel den Wunsch hinein), dann den
Namen in `DANK_BILDER` in `config.js` eintragen. Fehlt ein Bild, malt das Spiel es selbst. Ein Brief zur Zeit, der nächste
frühestens am Tag danach, höchstens zehn je Adventszeit.

**Album** (Aufträge → Album): alle Besucher, die du schon bedient hast
(auch Rentier, Schneemann, Grummel und Weihnachtsmann), die Tiere der
Waldlichtung samt dem seltenen Goldhasen, die Vögel am Futterhaus, das Rezeptbuch und die
Dankesbilder der Kinder. Was du noch nicht gesehen hast, steht als dunkler
Umriss da.

## Echte Zeit

Beim ersten Start wählt man: **Eigener Advent** (das Spiel beginnt immer am
24. November, eine Woche vor dem ersten Türchen, egal wann man startet) oder
**Echter Kalender** (das Spiel hat das echte Datum). Die Uhrzeit ist in beiden
Fällen echt.

- Nachts ist es dunkel, die Lichter leuchten.
- Bis zum 30. November ist Spätherbst: kahle Bäume, fallendes Laub, Regen.
- **Ab dem 1. Dezember liegt Schnee**, und es gibt Schneemänner zu kaufen.
- **Vorfreude-Päckchen:** Bis zum 1. Dezember wartet im Kalender jeden Tag
  ein Päckchen mit Sternen.
- **Adventskalender:** jeden Tag ein Türchen, manche mit Deko, die es nur
  dort gibt (Adventskranz, dessen Kerzen mit den Adventssonntagen
  mitzählen; Nikolausstiefel; Mistelzweig; Meisenknödel; am 24. der
  goldene Stern).
- **Jeder Adventssonntag** bringt ein Ereignis mit Bild (Weihnachtsmarkt,
  Neuschnee, Chorkonzert, das Dorf leuchtet), schaltet Neues frei und
  lockt besonders viele Gäste an.
- **Barbarazweig:** Ab dem 4. Dezember (Barbaratag) lässt sich im Kalender
  ein Kirschzweig schneiden. Er steht dann in einer Vase im rechten
  Fenster. Jeden Tag kann man ihn einmal gießen, die Knospen schwellen,
  und an Heiligabend blüht er auf: je gegossenem Tag eine Blüte mehr
  (4 bis 24). Wer nicht gießt oder später schneidet, verliert nichts,
  er blüht trotzdem, nur kleiner. Antippen im Kalender zeigt ihn groß auf der
  Fensterbank, mit jeder Knospe einzeln - dort wird auch gegossen.
- **Heiligabend morgens** (ab 6 Uhr) wird beim ersten Öffnen der Bildschirm
  dunkel, die Weihnachtsmusik setzt ein, und ein großes Fenster mit dem
  eigenen Haus wünscht frohe Weihnachten. Es sagt auch, wie es weitergeht:
  Gäste kommen an diesem Tag bis **16 Uhr**, das Finale gibt es zwischen
  16 und 22 Uhr.
- **Heiligabend** schneit es ab dem Nachmittag. Ab 16 Uhr kommen keine
  Gäste mehr (am Stand hängt „FROHES FEST“), und bis 22 Uhr läuten die
  Glocken: Die Kirche ist hell, ihre Tür steht offen, und vor dem Haus
  singen Leute mit Kerzen. Einmal kommt das **Finale** mit Bild und
  danach **Mein Advent**, ein Rückblick mit Gästen, Sternen, Deko,
  Stimmung, Türchen, Weihnachtsmann-Funden und Blüten. Wer erst nach
  Heiligabend spielt (bis zum 6. Januar), bekommt es nachgereicht. Den
  Rückblick gibt es danach auch im Menü.
- **Das schönste Haus im Dorf:** Ab dem 3. Advent wird es angekündigt, am
  23. Dezember kommt die Jury. Je nach Stimmung gibt es Gold, Silber oder
  Bronze (oder eine Urkunde), Sterne und eine Plakette an der Hauswand.
  Wer erst seit ein paar Tagen spielt, ist noch nicht dabei.
- **Silvester:** Schon den ganzen Tag steigen leise ein paar Raketen über
  dem Dorf, ab 18 Uhr immer mehr, um Mitternacht das große Feuerwerk. Einmal
  kommt der Abschluss der Adventszeit: „Bis zum nächsten Jahr! Vielen Dank
  fürs Spielen!" (wer bis zum 6. Januar später spielt, bekommt ihn
  nachgereicht).
- **Pause ab dem 7. Januar:** Bis zum 6. Januar geht alles ganz normal
  weiter, vom 2. Januar an sagt das Spiel jeden Tag, wie lange noch. Danach
  hat der Stand zu (Brett „PAUSE“, Schild in der Tresenansicht, oben
  die Leiste „PAUSE · Info“): keine Gäste, Wichtel, Aufträge,
  Minispiele, Briefe, kein Markt und kein Nikolaus. Haus schmücken, Foto
  und Einkaufen im Weihnachtsladen, Supermarkt und Baumarkt gehen weiter.
  Beim ersten Öffnen erklärt es ein Fenster. Im September beginnt die neue
  Saison. Wer in der Pause neu anfängt, startet automatisch seinen
  eigenen Advent (ab 24. November).
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

## Als App speichern

Auf dem iPhone kommt einmal ein Tipp, das Spiel auf den Home-Bildschirm zu
legen (Safari → Teilen → „Zum Home-Bildschirm“). Wichtig: Safari löscht die
Daten einer Webseite nach 7 Tagen ohne Besuch - als App passiert das nicht.
Im Menü steht die Anleitung jederzeit unter „Als App speichern“.

## Feedback

Im Menü: **Feedback geben** öffnet ein kurzes Google-Formular. Eine Zeile mit
Spielversion, Spielmodus, Spieltag, Spieldatum, Stimmung, Startziel, Gerät, Browser und Bildgröße ist schon ausgefüllt, damit sich
die Meldung einordnen lässt - kein Name, kein Spielstand.

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
Code. Einzige Fremddateien sind die Musikstücke in `web/audio/` (siehe *Musik*,
weich übergeblendet), unter Menü → Einstellungen lauter, leiser oder ganz aus. Dazu zwei
Schriften in `web/fonts/`: **Nunito** für Texte und **Pixelify Sans** für Titel,
beide unter der SIL Open Font License (Lizenztexte daneben), damit das Spiel auf
jedem Gerät gleich aussieht und ohne fremde Server auskommt. Spielstand in `localStorage` (`adventshaus.v1`).

`web/` ist rein statisch und läuft auf jedem Webserver. Beim Hochladen auf
GitHub veröffentlicht `.github/workflows/pages.yml` den Ordner `web/` über
GitHub Pages (einmalig unter *Settings → Pages → Source* „GitHub Actions"
wählen). **Bei jedem Update die Versionsnummer erhöhen** (`?v=` in
`index.html` und `src/*.js`, `VERSION` in `sw.js`), sonst behalten Browser
alte Dateien.

## Musik

- **Am Haus** zwei Stücke im Wechsel; vom 24. (ab 6 Uhr, mit dem
  Weihnachtsfenster) bis 26. Dezember kommt im Wechsel ein Weihnachtsstück
  dazu.
- **Auf der Karte** bis zum 1. Advent ein Stück, danach mit jedem Advent
  (1. bis 3.) ein neues - das neue läuft beim ersten Öffnen zuerst.
- **In den Minispielen** eins von zwei Stücken, zufällig.
- **Bei großen Ereignissen** (Advent, erster Schnee, Jury, Heiligabend,
  Silvester, Finale) ein kurzer Jingle, die Musik wird solange leiser.

Acht Stücke sind von [Pixabay](https://pixabay.com/music/) (Pixabay Content
License) - von Denis-Pavlov-Music, Clavier-Music, The_Mountain,
TheStorytellingPodcast, Top-Flow und kaazoom. Im Spiel stehen alle unter
Menü → Einstellungen → **Credits**. Zwei Stücke (`musik-haus.m4a`,
`musik-karte.m4a`) sind mit [Suno](https://suno.com) entstanden und werden
nicht-kommerziell verwendet.

## Nutzung

Privates Hobbyprojekt, nicht kommerziell.
