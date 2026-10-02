// Vollständiger Seiten-Audit auf mehreren Geräten:
//   JS-Fehler, fehlgeschlagene Requests, horizontaler Überlauf (mit Verursachern),
//   kaputte Bilder, zu kleine Tipp-Ziele (mobil), abgeschnittener Text, Überlappungen mit
//   der Sticky-Leiste – plus Viewport-Screenshots zur Sichtprüfung.
//   node tools/audit.mjs [--pages=/,/kontakt/] [--devices=iphone,android,tablet,desktop] [--shots]
import { chromium, webkit, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE || 'http://127.0.0.1:8140';
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const PAGES = (arg('pages') || '/,/goldankauf-gersthofen/,/zahngold-ankauf-gersthofen/,/silberankauf-gersthofen/,/uhrenbatterie-wechseln-gersthofen/,/schmuckreparatur-gersthofen/,/ohrloch-stechen-gersthofen/,/trauringe-gersthofen/,/eroeffnung/,/kontakt/,/impressum/,/datenschutz/,/404.html').split(',');
const DEV = {
  iphone: { engine: webkit, ctx: { ...devices['iPhone 13 Mini'] } },          // 375 px – kleinstes gängiges iPhone
  iphone15: { engine: webkit, ctx: { ...devices['iPhone 15'] } },            // 393 px
  android: { engine: chromium, ctx: { ...devices['Galaxy S9+'] } },         // 320 px – sehr schmal
  tablet: { engine: chromium, ctx: { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true } },
  desktop: { engine: chromium, ctx: { viewport: { width: 1440, height: 900 } } },
};
const USE = (arg('devices') || 'iphone,android,tablet,desktop').split(',');
for (const [k, v] of Object.entries(DEV)) if (k !== 'tablet' && k !== 'desktop' && !v.ctx.viewport) throw new Error(`Gerät ${k} unbekannt`);
const SHOTS = process.argv.includes('--shots');
await mkdir('tools/_out/audit', { recursive: true });

const issues = [];
const add = (dev, page, kind, msg) => issues.push({ dev, page, kind, msg });

for (const d of USE) {
  const { engine, ctx } = DEV[d];
  const browser = await engine.launch(engine === chromium ? { channel: 'chrome' } : {});
  for (const path of PAGES) {
    const context = await browser.newContext({ ...ctx, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', (e) => add(d, path, 'JS', e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) add(d, path, 'Konsole', m.text().slice(0, 160)); });
    page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/404.html') && !(path === '/404.html')) add(d, path, 'HTTP', `${r.status()} ${r.url()}`); });
    await page.addInitScript(() => sessionStorage.setItem('so-intro', '1'));
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    // einmal komplett durchscrollen (Lazy-Bilder, Reveals)
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    const vh = page.viewportSize().height;
    for (let y = 0; y < H; y += Math.round(vh * 0.8)) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(120); }
    await page.waitForTimeout(500);

    const r = await page.evaluate(() => {
      const out = { overflow: [], tiny: [], broken: [], clipped: [], hscroll: 0 };
      const vw = document.documentElement.clientWidth;
      out.hscroll = document.documentElement.scrollWidth - vw;
      const clippedByAncestor = (el) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const cs = getComputedStyle(p);
          if (/(hidden|clip|auto|scroll)/.test(cs.overflowX + cs.overflow)) return true;
        }
        return false;
      };
      const label = (el) => (el.id ? '#' + el.id : '') + '.' + [...el.classList].join('.') + ` <${el.tagName.toLowerCase()}> "${(el.textContent || '').trim().slice(0, 40)}"`;
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        if ((b.right > vw + 1 || b.left < -1) && !clippedByAncestor(el)) out.overflow.push(`${label(el)} left=${Math.round(b.left)} right=${Math.round(b.right)} vw=${vw}`);
      }
      if (matchMedia('(pointer: coarse)').matches) {
        for (const el of document.querySelectorAll('a[href], button, input, select, summary, [role="radio"]')) {
          const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const b = el.getBoundingClientRect();
          if (b.width === 0 || b.height === 0) continue;
          if (el.closest('.prose p, .prose li, .faq__a, .legal, .breadcrumb, .footer, address, .small')) continue; // Fließtext-Links sind ok
          if (b.height < 32 || b.width < 32) out.tiny.push(`${label(el)} ${Math.round(b.width)}×${Math.round(b.height)}`);
        }
      }
      for (const img of document.querySelectorAll('img')) if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) out.broken.push(img.currentSrc || img.src);
      // ragt unten aus seiner Sektion (wird von der nächsten Sektion überdeckt)
      for (const el of document.querySelectorAll('.card, .aside-card, .btn, figure, .faq, .table-wrap, .calc, .result, .buy-grid, .services')) {
        const sec = el.closest('section, footer'); if (!sec) continue;
        const cs = getComputedStyle(el); if (cs.position === 'fixed' || cs.display === 'none') continue;
        const b = el.getBoundingClientRect(), sb = sec.getBoundingClientRect();
        if (b.height && b.bottom > sb.bottom + 1) out.clipped.push(`ragt unten aus Sektion: ${label(el)} (${Math.round(b.bottom - sb.bottom)} px)`);
      }
      for (const el of document.querySelectorAll('h1, h2, h3, .btn, .overline, .alloy__val, .rate__price, .result__value, td, th')) {
        if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') out.clipped.push(label(el));
        const b = el.getBoundingClientRect(); const p = el.parentElement?.getBoundingClientRect();
        if (p && b.right > p.right + 4 && !el.closest('.table-wrap, .marquee, .reviews__track')) out.clipped.push(`ragt aus Eltern: ${label(el)} (${Math.round(b.right)} > ${Math.round(p.right)})`);
      }
      return out;
    });
    if (r.hscroll > 0) add(d, path, 'H-SCROLL', `Seite ist ${r.hscroll}px breiter als der Bildschirm`);
    r.overflow.slice(0, 8).forEach((m) => add(d, path, 'Überlauf', m));
    r.tiny.slice(0, 10).forEach((m) => add(d, path, 'Tipp-Ziel', m));
    r.broken.forEach((m) => add(d, path, 'Bild', m));
    r.clipped.slice(0, 8).forEach((m) => add(d, path, 'Abgeschnitten', m));

    if (SHOTS) {
      const name = (path.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home');
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
      for (let i = 0, y = 0; y < H; i++, y += vh) {
        await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(350);
        await page.screenshot({ path: `tools/_out/audit/${d}-${name}-${String(i).padStart(2, '0')}.png` });
      }
    }
    await context.close();
  }
  await browser.close();
}
const byKind = {};
for (const i of issues) (byKind[i.kind] ||= []).push(i);
for (const [k, list] of Object.entries(byKind)) {
  console.log(`\n=== ${k} (${list.length})`);
  for (const i of list.slice(0, 60)) console.log(`[${i.dev}] ${i.page}  ${i.msg}`);
}
console.log(`\nGesamt: ${issues.length} Befunde`);
