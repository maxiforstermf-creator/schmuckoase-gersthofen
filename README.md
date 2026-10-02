# SchmuckOase Gersthofen – Website

Statische Website für **SchmuckOase Gersthofen** (Juwelier & Goldankauf, City Center Gersthofen).
Reines HTML/CSS/JS mit ES-Modulen, **kein Build-Step**, Hosting über **GitHub Pages**.
Beim Seitenaufruf gehen keine Requests an Dritte: Fonts, Bibliotheken und der Goldkurs liegen lokal. Es gibt keine Cookies und kein Tracking, deshalb ist kein Cookie-Banner nötig.

---

## Struktur

```
/                         Startseite (index.html)
/goldankauf-gersthofen/   wichtigste Landingpage (Rechner, Legierungstabelle, FAQ)
/zahngold-ankauf-gersthofen/  /silberankauf-gersthofen/  /uhrenbatterie-wechseln-gersthofen/
/schmuckreparatur-gersthofen/ /ohrloch-stechen-gersthofen/ /trauringe-gersthofen/
/eroeffnung/  /kontakt/  /impressum/  /datenschutz/  404.html
css/main.css              Design-System (Tokens, Komponenten, Sektionen)
js/config.js              ★ alle pflegbaren Werte (Ankaufsquote, WhatsApp, Eröffnung, Öffnungszeiten …)
js/main.js                Einstieg; lädt schwere Module erst bei Bedarf
js/ring.js                WOW 1 – 3D-Goldring (three.js)
js/rechner.js             WOW 2 – Gold-/Silberrechner + Richtwerte
js/story.js               WOW 3 – Scroll-Story (GSAP ScrollTrigger)
js/vendor/                three.js, GSAP, Lenis – lokal, als ESM gebündelt
data/goldpreis.json       Kurs (wird von der GitHub Action geschrieben)
assets/                   Fonts, Bilder (AVIF/WebP), Icons, OG-Bilder
tools/                    Werkzeuge (nicht Teil der Website, in robots.txt gesperrt)
CONTENT.md                Inhalte der alten Website (Wayback Machine)
```

## Inhalte pflegen

| Was | Wo |
|---|---|
| Ankaufsquote, WhatsApp-Nummer, Eröffnungsdatum, Öffnungszeiten, Feiertage | `js/config.js` |
| Header, Footer, Rechner, CTA-Block, Firmen-Schema (JSON-LD) | `tools/partials/*.html` → danach `node tools/sync-partials.mjs` |
| Seitentexte | direkt in der jeweiligen `index.html` |
| Neue Bilder | Original nach `assets/img/_orig/`, Eintrag in `tools/images.py`, dann `python tools/images.py` und `node tools/sync-partials.mjs` |

**Wichtig:** Adresse (Bahnhofstraße 18) und Öffnungszeiten stehen sowohl in `js/config.js` (Live-Badge, Kalender, Karte) als auch im HTML (Footer-Partial, `ld-business`-Partial, Kontakt-, Start-, Eröffnungsseite, Impressum, Datenschutz). Bei Änderungen projektweit nach „Bahnhofstraße 18“ suchen.

`<picture data-pic="name">` wird vom Sync-Skript automatisch mit AVIF-/WebP-`srcset` gefüllt (Breiten 800/1400/2000, nie hochskaliert).

## Goldpreis: Quelle und Fallback

- **Workflow:** `.github/workflows/goldpreis.yml` läuft werktags stündlich von 7 bis 19 Uhr deutscher Zeit (Cron `5 5-18 * * 1-5`, UTC) und lässt sich in GitHub unter *Actions → Goldpreis aktualisieren → Run workflow* auch manuell starten.
- **Skript:** `tools/goldpreis.mjs`
  - **Spotpreis:** [gold-api.com](https://gold-api.com) – `GET https://api.gold-api.com/price/XAU` bzw. `/XAG`, kostenlos, ohne API-Key, Preis in USD je Feinunze.
  - **Wechselkurs:** EZB-Referenzkurs über [frankfurter.dev](https://frankfurter.dev) – `GET https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR`, kostenlos, ohne Key.
  - **Umrechnung:** `USD/oz × EUR/USD ÷ 31,1034768 = EUR/g`
- **Ausgabe:** `data/goldpreis.json` → `{ eur_per_gram, silver_eur_per_gram, updated_at, source }`
- **Fallback:**
  - Ist eine API nicht erreichbar oder ein Wert unplausibel (z. B. mehr als 25 % Sprung zum letzten Kurs), bricht das Skript ab, ohne zu committen. Der letzte Wert bleibt erhalten.
  - Ist der Kurs älter als 80 Stunden, zeigt die Seite „Kurs vom …“ statt „Stand: …“. 80 Stunden decken das Wochenende ab, an dem die Action nicht läuft.
  - Fehlt die Datei komplett, zeigt der Rechner „Kurs derzeit nicht verfügbar“ und nur den Feingoldanteil.
- **Ankaufsquote:** `ANKAUFSQUOTE` in `js/config.js`. Bei `null` (Standard) zeigt der Rechner nur den Materialwert. Bei z. B. `0.95` erscheint zusätzlich „Unser Richtpreis: ca. X €“.

## Lokal ansehen

```bash
node tools/serve.mjs          # http://127.0.0.1:8138 – verhält sich wie GitHub Pages (gzip, 404.html)
```

Werkzeuge (optional): `npm i`, dann
`node tools/check.mjs --platzhalter` (SEO-/Link-Check + Platzhalterliste) · `node tools/shoot.mjs /` (Screenshots 375/768/1440) · `node tools/render-poster.mjs` / `node tools/render-og.mjs` (Ring-Poster, OG-Bilder, Favicons) · `node tools/build-vendor.mjs` (Bibliotheken aktualisieren). Die Playwright-Skripte nutzen das installierte Chrome.

## Vor dem Launch: noch offene Angaben

Alles andere ist fertig (0 sichtbare Platzhalter, `node tools/check.mjs`). Diese Angaben fehlen noch:

| Angabe | Wo eintragen |
|---|---|
| **Öffnungszeiten** neuer Laden | `js/config.js` (`OEFFNUNGSZEITEN`), `tools/partials/footer.html`, `tools/partials/ld-business.html` (openingHoursSpecification), Tabellen in `index.html` + `kontakt/index.html` (`data-hours`), Fallback-Text `Mo – Fr …` (Suche nach `data-open-text`), Aside auf `uhrenbatterie-wechseln-gersthofen/` |
| **WhatsApp-Nummer** | nur `js/config.js` → `WHATSAPP_NUMMER = '49…'` (alle Buttons übernehmen sie automatisch) |
| **Eröffnungsangebot** (falls es eins gibt) | Kommentare `TODO: ggf. Eröffnungsangebot` in `index.html` und `eroeffnung/index.html` |
| **USt-IdNr.** (falls vorhanden) | auskommentierter Block in `impressum/index.html` |
| **E-Mail fürs Kontaktformular** | `kontakt/index.html` (`action="https://formsubmit.co/…"`), Impressum, Datenschutz, Footer-Partial, `ld-business` |
| **Freepik-Fotos**: Lizenz klären | Galerie, einige Kacheln/Seiten – sonst durch eigene Fotos ersetzen |

Nach Änderungen an `tools/partials/*`: `node tools/sync-partials.mjs`, danach `node tools/check.mjs`.
Weitere `TODO`-Kommentare im Code markieren optionale Ergänzungen (Fotos, Barren-/Uhrenankauf, Zeitangaben, Ohrloch-Details, Trauring-Sortiment).

## Deployment auf GitHub Pages

Veröffentlicht wird über GitHub Actions (`.github/workflows/deploy.yml`) – **nur die Website-Dateien**; was ausgeschlossen ist, steht in `.deployignore` (Werkzeuge, Originalbilder, Markdown, package.json). Nach jedem Goldpreis-Update wird automatisch neu veröffentlicht.

1. **Repository anlegen** (z. B. `schmuckoase-gersthofen`) und pushen:
   ```bash
   git remote add origin git@github.com:<konto>/schmuckoase-gersthofen.git
   git push -u origin main
   ```
2. **Pages aktivieren:** *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
3. **Goldpreis-Action darf schreiben:** *Settings → Actions → General → Workflow permissions → Read and write permissions*. Danach unter *Actions* „Goldpreis aktualisieren“ einmal manuell starten (veröffentlicht anschließend automatisch).
4. **Domain:** Unter *Settings → Pages → Custom domain* `schmuckoase-gersthofen.de` eintragen. Beim Domain-Anbieter:
   - `A` für `@` auf `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `AAAA` für `@` auf `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `CNAME` für `www` auf `<konto>.github.io`
   - alte Einträge, die auf den WordPress-Server zeigen, entfernen
5. Nach der DNS-Prüfung **„Enforce HTTPS“** aktivieren. Empfohlen: Domain unter *Settings → Pages → Verified domains* verifizieren (schützt vor Domain-Übernahme).
6. **Nach dem Livegang:**
   - Alte WordPress-Instanz vollständig abschalten und löschen – sie war kompromittiert (Spam-Links), siehe `CONTENT.md`.
   - Alte Adressen (`/goldankauf/`, `/uber-uns/` …) leiten bereits auf die neuen Seiten weiter (`tools/redirects.mjs`).
   - Google Search Console: Domain bestätigen, `sitemap.xml` einreichen, unter „Sicherheit & manuelle Maßnahmen“ und „Seiten“ nach alten Spam-URLs schauen.
   - Google-Unternehmensprofil für die Bahnhofstraße 18 anlegen bzw. umziehen (Adresse, Öffnungszeiten, Website, Fotos).
   - Kontaktformular einmal absenden: FormSubmit schickt eine Aktivierungs-Mail an die Empfängeradresse.
   - Rich-Results-Test für Startseite, `/goldankauf-gersthofen/` und `/eroeffnung/`.
   - Abschlusstest auf iPhone und Android unter der echten Domain.

## Barrierefreiheit und Motion

- Bei `prefers-reduced-motion: reduce` entfallen alle Animationen: kein Intro, kein 3D (es bleibt das Poster), keine Pin-Sektion, kein Marquee und kein Smooth Scrolling.
- Der Rechner ist komplett per Tastatur bedienbar: Radiogroup mit Pfeiltasten, Home und End, nativer Slider, Zahlenfeld. Das Ergebnis wird per `aria-live` angesagt.
- Lightbox und Punzen-Hilfe nutzen native `<dialog>`-Elemente (Esc, Fokusrückgabe).
- Der 3D-Ring lädt nur auf geeigneten Geräten – bei der ersten Interaktion, spätestens ca. 2,5 s (Desktop) bzw. 3,5 s (Handy) nach dem Laden; bis dahin zeigt ein identisches Standbild denselben Ring. Er rendert nur, solange er sichtbar ist, pausiert bei Tab-Wechsel und begrenzt `devicePixelRatio` auf 2.

## Lizenzen

- three.js (MIT), Lenis (MIT), GSAP (Standard „No Charge“ License), Cormorant Garamond & Manrope (SIL OFL), jeweils in `js/vendor/` bzw. `assets/fonts/`.
- Bildnachweise siehe `/impressum/#bildnachweise`. Die Freepik-Fotos der alten Website: Lizenz noch klären.
