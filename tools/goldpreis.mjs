// Holt Gold- und Silber-Spotpreis (USD/oz) + EZB-Kurs USD→EUR und schreibt data/goldpreis.json.
// Läuft in der GitHub Action (.github/workflows/goldpreis.yml), lokal: `node tools/goldpreis.mjs`.
// Schlägt eine Quelle fehl oder ist ein Wert unplausibel, endet das Skript mit Exit-Code 1
// und die bestehende JSON bleibt unverändert (die Seite zeigt dann „Kurs vom …“).
import { writeFile, readFile } from 'node:fs/promises';

const OUT = new URL('../data/goldpreis.json', import.meta.url);
const GRAMM_PRO_UNZE = 31.1034768;

async function json(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'schmuckoase-goldpreis/1.0' } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

const [xau, xag, fx] = await Promise.all([
  json('https://api.gold-api.com/price/XAU'),
  json('https://api.gold-api.com/price/XAG'),
  json('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR'),
]);

const usdEur = fx?.rates?.EUR;
const gold = (xau.price * usdEur) / GRAMM_PRO_UNZE;
const silber = (xag.price * usdEur) / GRAMM_PRO_UNZE;

// Plausibilitätsprüfung gegen Ausreißer/kaputte API-Antworten
if (!(usdEur > 0.5 && usdEur < 1.5)) throw new Error(`EUR-Kurs unplausibel: ${usdEur}`);
if (!(gold > 20 && gold < 1000)) throw new Error(`Goldpreis unplausibel: ${gold} €/g`);
if (!(silber > 0.1 && silber < 20)) throw new Error(`Silberpreis unplausibel: ${silber} €/g`);

let alt = null;
try { alt = JSON.parse(await readFile(OUT, 'utf8')); } catch {}
if (alt?.eur_per_gram && Math.abs(gold / alt.eur_per_gram - 1) > 0.25) {
  throw new Error(`Sprung > 25 % gegenüber letztem Wert (${alt.eur_per_gram} → ${gold}) – nicht übernommen`);
}

const data = {
  eur_per_gram: Math.round(gold * 100) / 100,
  silver_eur_per_gram: Math.round(silber * 1000) / 1000,
  updated_at: new Date().toISOString(),
  source: {
    spot: 'gold-api.com (XAU/XAG, USD je Feinunze)',
    fx: `EZB-Referenzkurs via frankfurter.dev (${fx.date}): 1 USD = ${usdEur} EUR`,
    spot_time: xau.updatedAt,
  },
};
await writeFile(OUT, JSON.stringify(data, null, 2) + '\n');
console.log(data);
