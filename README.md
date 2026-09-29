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
6. **Der letzte Handgriff** - bei Schokolade, Eierpunsch, Weißem Glühwein
   und Feuerzangenbowle das fertige Glas auf dem Tablett antippen (Sahne,
   Zimtstange, Zuckerhut anzünden). Dann zahlt der Gast 30 % mehr.

Falsch geliefert kostet nur das Glas. Falsch Eingeschenktes kippt man in
den Ausguss rechts. **Sobald der Servier-Wichtel da ist, reicht ein Tipp auf
den Gast** - Glas und Topf braucht man dann nur noch für Extras.

**Während du weg bist**, arbeiten die Wichtel weiter (die ersten 5 Minuten
voll, danach mit 40 %, höchstens 8 Stunden) und legen alles in eine Kiste,
die du beim Zurückkommen öffnest.

**Luxus-Stücke** (✦ Extra für Profis: Lichtershow, Festbeleuchtung, Stand
Stufe 3) braucht man fürs schönste Haus nicht - mit 10 bis 15 Minuten am
Tag ist bis Heiligabend alles andere geschafft.

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

## Der Laden

| Reiter | Was es gibt |
|---|---|
| **Weihnachtsmarkt** | Deko fürs Haus (Lichterketten, Stern, Schwibbogen, Nussknacker, Eiszapfen, Nikolaus auf dem Dach, Lichtershow), den Garten (Tanne mit Lichtern, Kugeln, Stern, Schneemann-Familie, Lichter-Rentier, Schlitten, Lichterbogen) und den Stand (Girlande, Zuckerstangen, Licht, Schild, Musikbox, Heizpilz, Bierbänke - jeweils mit Bonus) |
| **Baumarkt** | Längerer Tresen, größere Töpfe, Tablett; Holzstapel, neue Tür, Zaun, **Kaminofen** (die Fenster leuchten), Laternen; vier Anstriche: Winterweiß, Schwedenrot, Lebkuchenhaus, Alpenchalet |
| **Supermarkt** | Zutaten: Kinderpunsch, heißer Apfel, Lebkuchen, heiße Schokolade, Eierpunsch, Jägertee, Crêpe, weißer Glühwein, Feuerzangenbowle |
| **Wichtel** | Spül-, Servier-, Nachfüll-, Crêpe- und Kassen-Wichtel. Der Servier-Wichtel arbeitet auch, wenn die App zu ist (bis 8 Stunden) |

Hausdeko bringt **Stimmung** (♥). Je mehr Stimmung, desto mehr Gäste -
und desto mehr zahlen sie.

## Echte Zeit

Beim ersten Start wählt man: **Klassisch** (das Spiel folgt dem echten
Kalender) oder **Individuell** (das Spiel beginnt immer eine Woche vor dem
1. Dezember, egal wann man startet). Die Uhrzeit ist in beiden Fällen echt.

- Nachts ist es dunkel, die Lichter leuchten.
- Bis zum 30. November ist Spätherbst: kahle Bäume, fallendes Laub, Regen.
- **Ab dem 1. Dezember liegt Schnee**, und es gibt Schneemänner zu kaufen.
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

**Karte** in der Leiste macht aus dem aktuellen Bild eine Weihnachtskarte
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

„Village at Night" (`web/audio/musik.m4a`) wurde mit [Suno](https://suno.com)
erstellt und wird nicht-kommerziell verwendet.

## Nutzung

Privates Hobbyprojekt, nicht kommerziell.
