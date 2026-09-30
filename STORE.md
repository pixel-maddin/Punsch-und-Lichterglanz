# Punsch & Lichterglanz im Google Play Store

Stand: 30. September 2026. Die Regeln von Google ändern sich - Zahlen und
Menüs vor dem Start in der Play Console gegenprüfen.

**Zeitplan bis zum 1. Advent (29. November):** Neue Privatkonten brauchen
einen **geschlossenen Test mit mindestens 12 Testern über 14 Tage**, danach
prüft Google. Dazu kommt die Identitätsprüfung des Kontos (kann mehrere Tage
dauern). Wer zum 1. Advent live sein will, sollte das Konto **jetzt** anlegen
und den Test **spätestens Mitte Oktober** starten.

---

## 1. Entwicklerkonto anlegen

- https://play.google.com/console → Konto als **Privatperson** anlegen,
  einmalig 25 US-Dollar.
- Identität bestätigen (Ausweis). Das dauert oft ein paar Tage - deshalb zuerst.
- Solange das Spiel **kostenlos und ohne Käufe** ist, musst du dich nicht als
  „Händler" (Trader) angeben, und es wird **keine Postadresse** öffentlich
  angezeigt. Öffentlich sichtbar ist eine Kontakt-E-Mail.

## 2. Adresse festlegen und Besitz nachweisen

Die App ist eine Hülle um die Webseite (Trusted Web Activity). Google prüft
über eine Datei `/.well-known/assetlinks.json` **ganz oben auf der Domain**,
dass die Seite dir gehört.

**Empfehlung: GitHub.** Das Spiel läuft unter
`https://pixel-maddin.github.io/Punsch-und-Lichterglanz/`, die Domain ist
also `pixel-maddin.github.io`. Dafür:

1. Auf GitHub ein neues, **öffentliches** Repo mit genau dem Namen
   `pixel-maddin.github.io` anlegen.
2. Darin zwei Dateien anlegen:
   - `.nojekyll` (leer - sonst veröffentlicht GitHub keine Ordner, die mit
     einem Punkt beginnen)
   - `.well-known/assetlinks.json` (Inhalt kommt aus Schritt 3 und 5)
3. Unter Settings → Pages: Source „Deploy from a branch", Branch `main`.

(Alternative: martin-weiske.de. Dann läuft das Spiel dort, und die Datei
gehört nach `martin-weiske.de/.well-known/assetlinks.json`.)

## 3. Android-Paket bauen (PWABuilder)

1. https://www.pwabuilder.com öffnen, die Spiel-Adresse eingeben:
   `https://pixel-maddin.github.io/Punsch-und-Lichterglanz/`
2. „Package for stores" → **Android** → „Generate Package".
3. Einstellungen:
   | Feld | Wert |
   |---|---|
   | Package ID | `io.github.pixel_maddin.punsch` (keine Bindestriche erlaubt) |
   | App name | Punsch & Lichterglanz |
   | Launcher name | Lichterglanz |
   | Theme / Nav-Farbe | #1a1030 · Hintergrund #120c22 |
   | Display mode | Fullscreen |
   | Orientation | Portrait |
   | Signing key | **Create new** |
4. Herunterladen. Im Zip liegen:
   - die `.aab`-Datei (die lädst du bei Google hoch)
   - `signing.keystore` und `signing-key-info.txt`
   - eine `assetlinks.json`

> **Den Schlüssel (`signing.keystore` + Passwörter) sicher aufbewahren**, am
> besten zweimal (z. B. Passwortmanager + USB-Stick). Ohne ihn kannst du nie
> wieder ein Update hochladen. Er gehört **nicht** in das öffentliche Repo.

## 4. App in der Play Console anlegen

- „App erstellen": Name **Punsch & Lichterglanz**, Sprache Deutsch, **Spiel**,
  **Kostenlos**.
- Unter „Testen → Geschlossener Test" einen Track anlegen und die `.aab`
  hochladen.

## 5. Schlüssel-Fingerabdruck eintragen

Google signiert die App beim Ausliefern neu (Play App Signing). Deshalb
braucht `assetlinks.json` **beide** SHA-256-Fingerabdrücke:

- aus `signing-key-info.txt` (dein Upload-Schlüssel)
- aus der Play Console: „Test und Release → App-Integrität → App-Signatur"

Die fertige Datei sieht so aus (beide Werte eintragen):

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "io.github.pixel_maddin.punsch",
    "sha256_cert_fingerprints": ["AA:BB:…UPLOAD…", "CC:DD:…PLAY-SIGNATUR…"]
  }
}]
```

Stimmt etwas nicht, zeigt die App oben eine Adressleiste - dann passt der
Fingerabdruck nicht.

## 6. Store-Eintrag

Bilder liegen in `store/`:

| Datei | Wofür |
|---|---|
| `icon-512.png` | App-Symbol (512 × 512) |
| `feature.png` | Vorstellungsbild (1024 × 500) |
| `1_haus.png` … `6_start.png` | Screenshots Telefon (1080 × 1920), in dieser Reihenfolge |

Neu erzeugen: `store/werkzeug/aufnehmen.sh <name> <demo> <datum>` bei
laufendem Server (Vorführmodus `?demo=haus|tresen|laden|wand|karte|start`,
nur lokal, eigener Speicherplatz). Das Vorstellungsbild kommt aus
`store/werkzeug/feature.html` (in Chrome öffnen, 1024 × 500).

**App-Name** (max. 30 Zeichen)
> Punsch & Lichterglanz

**Kurzbeschreibung** (max. 80 Zeichen)
> Punsch servieren, Wichtel einstellen und dein Haus bis Heiligabend schmücken

**Vollständige Beschreibung**
> Der Herbst ist grau, das Haus ist kahl - und bis Weihnachten soll es das
> schönste der Straße werden!
>
> Vor deinem Haus steht ein kleiner Punschstand. Schenk Sternenpunsch,
> Kinderpunsch, heißen Apfel und Kakao aus, back Crêpes und verdiene Sterne.
> Davon schmückst du Stück für Stück dein Haus: Lichterketten, Kränze,
> Schwibbogen, Tannenbaum, Schneemann-Familie und am Ende eine Festbeleuchtung,
> die man bis ins Nachbardorf sieht.
>
> ★ Gemütlich statt stressig: Ein falsches Getränk kostet nur das Glas.
> ★ Jedes Getränk hat seinen eigenen Handgriff - Zuckerstange, Sahne,
> Milchschaum, Teebeutel im richtigen Moment, Zuckerhut anzünden.
> ★ Wichtel helfen dir: Sie spülen, füllen nach und bedienen - auch wenn du
> nicht da bist. Beim Zurückkommen wartet eine Kiste voller Sterne.
> ★ Läuft mit der echten Uhr: Tag und Nacht, Schnee ab dem 1. Dezember,
> jeden Tag ein Türchen im Adventskalender und an jedem Adventssonntag ein
> besonderes Ereignis.
> ★ Tägliche Aufträge, 24 Socken an der Erfolgswand und besondere Gäste,
> die ab und zu vorbeischauen.
> ★ Verschick dein geschmücktes Haus als Weihnachtskarte.
>
> Mit 10 bis 15 Minuten am Tag ist das schönste Haus bis Heiligabend
> geschafft. Kein Konto, keine Werbung, keine Datensammlung - und alles
> alkoholfrei.

**Kategorie:** Spiele → Gelegenheitsspiele (Casual)
**Kontakt-E-Mail:** (deine öffentliche Adresse)
**Datenschutzerklärung:** `https://pixel-maddin.github.io/Punsch-und-Lichterglanz/datenschutz.html`
→ **vorher in `web/datenschutz.html` Name und E-Mail eintragen** (gelb
markierte Lücken).

## 7. App-Inhalte (Fragebögen in der Play Console)

| Punkt | Antwort |
|---|---|
| Datenschutzerklärung | die Adresse oben |
| Werbung | Nein |
| App-Zugriff | Alle Funktionen ohne Anmeldung |
| Einstufung (IARC-Fragebogen) | Kategorie Spiel; keine Gewalt, keine Angst, keine Sexualität, keine Schimpfwörter, **keine Drogen/Alkohol** (alles alkoholfrei), kein Glücksspiel (die Kiste enthält immer genau das Verdiente, kein Zufall), keine Interaktion zwischen Nutzern, kein Standort, keine Käufe |
| Zielgruppe | **13 Jahre und älter** empfohlen. Auch für Kinder geeignet, aber die Einstufung „für Kinder" löst Googles Familien-Richtlinien mit Zusatzprüfungen aus - das kann später nachgeholt werden |
| Datensicherheit | „Die App erhebt oder teilt **keine** Nutzerdaten" · Daten werden nicht übertragen |
| Behörden-/Finanz-/Gesundheits-App | Nein |

## 8. Tester finden (12 Personen, 14 Tage)

- In der Play Console unter „Geschlossener Test → Tester" eine E-Mail-Liste
  anlegen (Google-Konten der Tester).
- Den **Opt-in-Link** verschicken. Jeder muss beitreten, die App installieren
  und **14 Tage am Stück** im Test bleiben.
- Danach in der Play Console „Zugriff auf die Produktion beantragen" und die
  Fragen zum Test beantworten (wie viele Tester, was sich geändert hat).

Vorlage für die Nachricht an Tester:

> Hi! Ich habe ein kleines Weihnachtsspiel gebaut: „Punsch & Lichterglanz".
> Du führst einen Punschstand und schmückst davon dein Haus bis Heiligabend.
> Damit es in den Play Store darf, brauche ich 12 Leute, die es 14 Tage lang
> installiert haben. Magst du mitmachen? 1) Diesem Link folgen und
> „Tester werden" antippen: [OPT-IN-LINK] 2) Die App aus dem Play Store
> installieren 3) Ab und zu reinschauen - und mir gern sagen, wo es hakt.
> Danke! 🎄

## 9. Updates später

Jede Änderung am Spiel landet über `git push` auf GitHub Pages - die App
lädt sie beim nächsten Start von selbst. Ein neues Paket bei Google braucht
es nur, wenn sich an der Hülle etwas ändert (Name, Symbol, Farben).
