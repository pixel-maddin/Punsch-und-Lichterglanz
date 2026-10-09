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
deinem Haus in der Mitte. Die Geschäfte sind Orte darauf:

| Ort | Was es gibt |
|---|---|
| **Weihnachtsladen** (im Dorf) | Deko fürs Haus (Lichterketten, Stern, Schwibbogen, Nussknacker, Eiszapfen, Nikolaus auf dem Dach, Lichtershow), den Garten (Tanne mit Lichtern, Kugeln, Stern, Schneemann-Familie, Lichter-Rentier, Schlitten, Lichterbogen) und den Stand (Girlande, Zuckerstangen, Licht, Schild, Musikbox, Heizpilz, Bierbänke - jeweils mit Bonus) |
| **Baumarkt** | Längerer Tresen, größere Töpfe, Tablett; Holzstapel, neue Tür, Zaun, **Kaminofen** (die Fenster leuchten), Laternen; vier Anstriche: Winterweiß, Schwedenrot, Lebkuchenhaus, Alpenchalet |
| **Supermarkt** | Zutaten: Kinderpunsch (lockt Kinder an), heißer Apfel, Lebkuchen, heiße Schokolade, Herzwärmer, Waldtee, Crêpe, Zimtwolke, Feuerzauber - alles alkoholfrei |
| **Wichtelwald** | Spül-, Servier-, Nachfüll-, Crêpe- und Kassen-Wichtel, in ihren Baumstammhäusern |

Dazu kommen bald: der **Festplatz** (alle paar Tage Weihnachtsmarkt), der
**Christbaumverkauf**, die **Waldlichtung** und der **Schlittenberg** - mit
Minispielen. Die Weihnachtskarte zum Teilen heißt jetzt **Foto**.

Hausdeko bringt **Stimmung** (♥). Je mehr Stimmung, desto mehr Gäste -
und desto mehr zahlen sie.

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
- Heiligabend schneit es ab dem Nachmittag, Silvester gibt es Feuerwerk.
- Ab September beginnt eine neue Adventszeit - das Haus fängt wieder kahl
  an, ein Andenken bleibt.

## Teilen

**Foto** in der Leiste macht aus dem aktuellen Bild eine Weihnachtskarte
mit einem von fünf Rahmen, einem Weihnachtsgruß, Hausname und Datum, die über das Teilen-Menü des Handys verschickt
werden kann.

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
