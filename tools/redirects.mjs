// Weiterleitungen für die Adressen der alten WordPress-Seite (siehe CONTENT.md), damit
// Google-Treffer und Lesezeichen nicht auf der 404-Seite landen.
// GitHub Pages kann keine Server-Weiterleitungen → je Adresse eine kleine HTML-Seite mit
// Canonical + sofortigem Meta-Refresh (wird von Google wie eine Weiterleitung behandelt).
//   node tools/redirects.mjs
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SITE = 'https://schmuckoase-gersthofen.de';
const MAP = {
  'uber-uns': '/#ueber-uns',
  leistungen: '/#service',
  goldankauf: '/goldankauf-gersthofen/',
  altgoldankauf: '/goldankauf-gersthofen/',
  goldmunzen: '/goldankauf-gersthofen/#legierungen',
  goldschmuck: '/trauringe-gersthofen/',
  herrenschmuck: '/trauringe-gersthofen/',
  damenschmuck: '/trauringe-gersthofen/',
  trauringe: '/trauringe-gersthofen/',
  uhren: '/uhrenbatterie-wechseln-gersthofen/',
  silberankauf: '/silberankauf-gersthofen/',
  silbermunzankauf: '/silberankauf-gersthofen/',
  zahngold: '/zahngold-ankauf-gersthofen/',
  schmuckreperatur: '/schmuckreparatur-gersthofen/',
  schmuckreparatur: '/schmuckreparatur-gersthofen/',
  schmuckaufbereitung: '/schmuckreparatur-gersthofen/#reinigung',
  schmuckservice: '/schmuckreparatur-gersthofen/',
  gravuren: '/schmuckreparatur-gersthofen/#gravur',
  ersatzteile: '/schmuckreparatur-gersthofen/',
  umarbeitung: '/schmuckreparatur-gersthofen/#umarbeitung',
  uhrenservice: '/uhrenbatterie-wechseln-gersthofen/',
  batteriewechsel: '/uhrenbatterie-wechseln-gersthofen/',
  glaswechsel: '/uhrenbatterie-wechseln-gersthofen/',
  uhrwerkreinigung: '/uhrenbatterie-wechseln-gersthofen/',
  'ohrloch-stechen': '/ohrloch-stechen-gersthofen/',
  beratung: '/kontakt/',
};

const page = (to) => `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<!-- Weiterleitung von der alten Website (erzeugt von tools/redirects.mjs) -->
<title>Weiterleitung – SchmuckOase Gersthofen</title>
<link rel="canonical" href="${SITE}${to}">
<meta http-equiv="refresh" content="0; url=${to}">
<meta name="robots" content="noindex, follow">
<script>location.replace(${JSON.stringify(to)} + location.hash);</script>
</head>
<body style="background:#16130F;color:#F4EEE4;font-family:sans-serif">
<p>Diese Seite ist umgezogen: <a href="${to}" style="color:#C9A45C">weiter zur neuen Seite</a>.</p>
</body>
</html>
`;

const list = [];
for (const [from, to] of Object.entries(MAP)) {
  const dir = join(ROOT, from);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), page(to));
  list.push(from);
}
await writeFile(join(ROOT, 'tools', 'redirects.txt'), list.join('\n') + '\n');
console.log(`${list.length} Weiterleitungen erzeugt.`);
