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

**Wichtig:** Adresse und Öffnungszeiten stehen sowohl in `js/config.js` (Live-Badge, Kalender, Karte) als auch im HTML (Footer-Partial, `ld-business`-Partial, Kontakt- und Startseite). Nach einer Änderung im Projekt nach `PLATZHALTER: Straße` suchen.

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

## Deployment auf GitHub Pages

1. **Repository anlegen** (z. B. `schmuckoase-gersthofen`) und pushen:
   ```bash
   git add -A && git commit -m "Neue Website"
   git remote add origin git@github.com:<konto>/schmuckoase-gersthofen.git
   git push -u origin main
   ```
2. **Pages aktivieren:** *Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `/ (root)`*.
3. **Action darf schreiben:** *Settings → Actions → General → Workflow permissions → Read and write permissions*. Danach unter *Actions* den Workflow einmal manuell starten.
4. **Domain:** Die Datei `CNAME` enthält bereits `schmuckoase-gersthofen.de`. Beim Domain-Anbieter folgende Einträge setzen:
   - `A` für `@` auf `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `AAAA` für `@` auf `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `CNAME` für `www` auf `<konto>.github.io`
5. Unter *Settings → Pages* die Domain prüfen lassen, danach **„Enforce HTTPS“** aktivieren. Optional die Domain unter *Settings → Pages → Verified domains* verifizieren.
6. **Nach dem Livegang:**
   - Alte WordPress-Instanz vollständig abschalten. Sie war kompromittiert, siehe `CONTENT.md`.
   - In der Google Search Console die `sitemap.xml` einreichen und nach Spam-URLs sowie manuellen Maßnahmen schauen.
   - Im Google-Unternehmensprofil Adresse, Öffnungszeiten und Website aktualisieren.
   - Das Kontaktformular einmal absenden. FormSubmit schickt eine Aktivierungs-Mail an die Empfängeradresse, die bestätigt werden muss.
   - Rich-Results-Test für Startseite, `/goldankauf-gersthofen/` und `/eroeffnung/` ausführen.

## Barrierefreiheit und Motion

- Bei `prefers-reduced-motion: reduce` entfallen alle Animationen: kein Intro, kein 3D (es bleibt das Poster), keine Pin-Sektion, kein Marquee und kein Smooth Scrolling.
- Der Rechner ist komplett per Tastatur bedienbar: Radiogroup mit Pfeiltasten, Home und End, nativer Slider, Zahlenfeld. Das Ergebnis wird per `aria-live` angesagt.
- Lightbox und Punzen-Hilfe nutzen native `<dialog>`-Elemente (Esc, Fokusrückgabe).
- Der 3D-Ring lädt nur auf geeigneten Geräten. Auf Touch-Geräten startet er erst bei der ersten Interaktion, auf Desktop nach der ersten Interaktion bzw. spätestens 2,5 s nach dem Laden. Er rendert nur, solange er sichtbar ist, pausiert bei Tab-Wechsel und begrenzt `devicePixelRatio` auf 2.

## Lizenzen

- three.js (MIT), Lenis (MIT), GSAP (Standard „No Charge“ License), Cormorant Garamond & Manrope (SIL OFL), jeweils in `js/vendor/` bzw. `assets/fonts/`.
- Bildnachweise siehe `/impressum/#bildnachweise`. Die Freepik-Fotos der alten Website: Lizenz noch klären.
