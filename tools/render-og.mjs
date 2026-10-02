// Erzeugt Open-Graph-Bilder (1200×630) + Favicons aus tools/og.html bzw. assets/favicon.svg.
//   node tools/render-og.mjs   (lokaler Server muss laufen: npm run serve)
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:8138';
const jobs = [
  { file: 'og-default', q: {} },
  { file: 'og-eroeffnung', q: { over: 'Neueröffnung am 1. Oktober 2026 · City Center Gersthofen', title: 'Neu <em class="gold-text">eröffnet.</em>', sub: 'Juwelier · Goldankauf · Meisterservice – seit über 30 Jahren in Gersthofen' } },
  { file: 'og-goldankauf', q: { over: 'Goldankauf Gersthofen', title: 'Was ist Ihr Gold <em class="gold-text">wert?</em>', sub: 'Online-Goldrechner · Prüfung vor Ihren Augen · sofort Bargeld' } },
];
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
for (const j of jobs) {
  await p.goto(`${BASE}/tools/og.html?${new URLSearchParams(j.q)}`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `assets/og/${j.file}.jpg`, type: 'jpeg', quality: 86 });
  console.log('OG:', j.file);
}
for (const [size, out] of [[32, 'assets/favicon-32.png'], [180, 'assets/apple-touch-icon.png']]) {
  await p.setViewportSize({ width: size, height: size });
  await p.goto(`${BASE}/assets/favicon.svg`);
  await p.screenshot({ path: out });
  console.log('Icon:', out);
}
await b.close();
