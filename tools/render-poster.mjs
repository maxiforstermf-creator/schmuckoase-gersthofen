// Rendert Standbilder des 3D-Rings (gleiche Szene wie im Hero) als AVIF/WebP/PNG:
//   assets/img/ring-poster-{800,1400}.{avif,webp}  → Hero-Poster/Fallback (LCP-Bild)
//   assets/img/ring-mark.webp                     → Deko für Unterseiten + 404
// Voraussetzung: lokaler Server (npm run serve) und `npx playwright install chromium`.
//   node tools/render-poster.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:8138';
const OUT = fileURLToPath(new URL('./_out/', import.meta.url));
const shots = [
  { name: 'ring-poster', size: 1400, angle: 0.55, time: 2.4, tilt: 0.62 },
  { name: 'ring-mark', size: 900, angle: 2.2, time: 5.1, tilt: 0.78 },
];

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1400 } });
page.on('console', (m) => console.log('[page]', m.text()));
for (const s of shots) {
  await page.goto(`${BASE}/tools/poster.html?size=${s.size}&angle=${s.angle}&time=${s.time}&tilt=${s.tilt}`);
  await page.waitForSelector('canvas[data-rendered]', { timeout: 60000 });
  await page.locator('canvas').screenshot({ path: `${OUT}${s.name}.png`, omitBackground: true });
  console.log('gerendert:', s.name);
}
await browser.close();
execFileSync('python', [fileURLToPath(new URL('./poster_convert.py', import.meta.url))], { stdio: 'inherit' });
