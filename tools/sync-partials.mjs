// Setzt gemeinsame Bausteine (Header, Footer, Rechner …) in alle HTML-Seiten ein.
// Kein Build-Step: Die Seiten sind fertiges HTML, dieses Skript hält nur die
// Duplikate synchron. Nach Änderungen an tools/partials/*.html ausführen:
//
//   node tools/sync-partials.mjs
//
// Marker in den Seiten:
//   <!-- @partial NAME key="wert" --> … <!-- @/partial -->
// Platzhalter im Partial: {{key}} (Standardwerte siehe DEFAULTS).
// Links, deren href der URL der Seite entspricht, bekommen aria-current="page".
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PARTIALS = join(ROOT, 'tools', 'partials');
const SKIP = new Set(['tools', 'node_modules', '.git', '.github', 'assets', 'js', 'css', 'data', 'graphify-out']);

const DEFAULTS = {
  cta: { title: 'Wir freuen uns auf <em>Ihren Besuch.</em>', wa: 'Hallo SchmuckOase, ich habe eine Frage:' },
  rechner: { metal: 'gold' },
};

async function htmlFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) out.push(...await htmlFiles(join(dir, e.name))); }
    else if (e.name.endsWith('.html')) out.push(join(dir, e.name));
  }
  return out;
}

function pageUrl(file) {
  const rel = relative(ROOT, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  return '/' + rel;
}

const cache = new Map();
async function partial(name) {
  if (!cache.has(name)) cache.set(name, (await readFile(join(PARTIALS, `${name}.html`), 'utf8')).trimEnd());
  return cache.get(name);
}

const MARKER = /(<!-- @partial ([\w-]+)((?:\s+[\w-]+="[^"]*")*)\s*-->)[\s\S]*?(<!-- @\/partial -->)/g;

// <picture data-pic="NAME" data-sizes="…"><img alt="…" …></picture>
// → AVIF/WebP-<source> mit allen erzeugten Breiten aus assets/img/manifest.json,
//   <img> bekommt src/width/height (Seitenverhältnis gegen Layout-Shift).
const PIC = /<picture\b([^>]*?)\sdata-pic="([\w-]+)"([^>]*)>([\s\S]*?)<\/picture>/g;
const manifest = JSON.parse(await readFile(join(ROOT, 'assets', 'img', 'manifest.json'), 'utf8'));
function expandPicture(pre, name, attrs, inner, file) {
  const info = manifest[name];
  if (!info) { console.warn(`! ${file}: Bild „${name}“ fehlt im Manifest`); return `<picture${pre} data-pic="${name}"${attrs}>${inner}</picture>`; }
  const sizes = attrs.match(/data-sizes="([^"]*)"/)?.[1] || '100vw';
  const img = inner.match(/<img\b[^>]*>/)?.[0] || '<img alt="">';
  const keep = [...img.matchAll(/\s([\w-]+)(?:="([^"]*)")?/g)]
    .filter(([, k]) => !['src', 'srcset', 'sizes', 'width', 'height'].includes(k))
    .map(([, k, v]) => (v === undefined ? ` ${k}` : ` ${k}="${v}"`)).join('');
  const set = (ext) => info.widths.map((w) => `/assets/img/${name}-${w}.${ext} ${w}w`).join(', ');
  const fallback = info.widths.find((w) => w >= 800) || info.widths.at(-1);
  return `<picture${pre} data-pic="${name}"${attrs}>` +
    `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">` +
    `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">` +
    `<img src="/assets/img/${name}-${fallback}.webp" width="${info.w}" height="${info.h}"${keep}>` +
    `</picture>`;
}

let changed = 0;
for (const file of await htmlFiles(ROOT)) {
  const src = await readFile(file, 'utf8');
  const url = pageUrl(file);
  const jobs = [];
  src.replace(MARKER, (m, open, name, attrs, close, offset) => { jobs.push({ m, open, name, attrs, close }); return m; });
  let out = src;
  for (const { m, open, name, attrs, close } of jobs) {
    const params = { ...(DEFAULTS[name] || {}) };
    for (const [, k, v] of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) params[k] = v;
    let body = await partial(name);
    body = body.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? '');
    body = body.replace(/<a ([^>]*?)href="([^"]+)"/g, (a, pre, href) =>
      href === url && !pre.includes('aria-current') ? `<a ${pre}href="${href}" aria-current="page"` : a);
    out = out.replace(m, () => `${open}\n${body}\n${close}`);
  }
  out = out.replace(PIC, (m, pre, name, attrs, inner) => expandPicture(pre, name, attrs, inner, relative(ROOT, file)));
  if (out !== src) { await writeFile(file, out); changed++; console.log('aktualisiert:', relative(ROOT, file)); }
}
console.log(`${changed} Datei(en) aktualisiert.`);
