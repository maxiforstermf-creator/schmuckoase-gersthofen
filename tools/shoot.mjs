// Test-Screenshots: node tools/shoot.mjs /pfad/ [--reduced] [--widths=375,768,1440]
// Scrollt die Seite einmal durch (damit Reveal-Animationen auslösen) und fotografiert
// die ganze Seite. Ausgabe: tools/_out/shot-<seite>-<breite>[-reduced].png
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:8138';
const path = process.argv[2] || '/';
const reduced = process.argv.includes('--reduced');
const widths = (process.argv.find((a) => a.startsWith('--widths='))?.slice(9) || '375,768,1440').split(',').map(Number);
const viewportOnly = process.argv.includes('--viewport');
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 800 ? 812 : 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference', deviceScaleFactor: 1, hasTouch: w < 800, isMobile: w < 800 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${w}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${w}] PAGEERROR ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`[${w}] FAILED ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`[${w}] HTTP ${r.status()} ${r.url()}`); });
  await page.addInitScript(() => sessionStorage.setItem('so-intro', '1'));
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  const name = path.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home';
  const tag = `${name}-${w}${reduced ? '-reduced' : ''}`;
  await page.waitForTimeout(1600);
  if (viewportOnly) { await page.screenshot({ path: `tools/_out/shot-${tag}.png` }); await ctx.close(); continue; }
  // Viewport für Viewport scrollen und fotografieren (Full-Page-Screenshots verfälschen 100vh + Pinning)
  const vh = page.viewportSize().height;
  const parts = [];
  for (let i = 0; ; i++) {
    const y = i * vh;
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    if (y >= h) break;
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(700);
    const f = `tools/_out/part-${tag}-${String(i).padStart(2, '0')}.png`;
    await page.screenshot({ path: f });
    parts.push(f);
  }
  console.log(`${tag}: ${parts.length} Teile`);
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'keine Konsolenfehler');
