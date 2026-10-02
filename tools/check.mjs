// Statische Qualitätsprüfung aller Seiten:
//   Title ≤ 60 · Description ≤ 155 · genau eine H1 · Canonical · JSON-LD parsebar
//   interne Links/Assets vorhanden · <img> mit alt · Platzhalter-/TODO-Zählung
//   node tools/check.mjs
import { readFile, readdir, access } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SKIP = new Set(['tools', 'node_modules', '.git', '.github', 'assets', 'js', 'css', 'data', 'graphify-out']);
const exists = (p) => access(p).then(() => true, () => false);

async function htmlFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) out.push(...await htmlFiles(join(dir, e.name))); }
    else if (e.name.endsWith('.html')) out.push(join(dir, e.name));
  }
  return out;
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&shy;/g, '').replace(/&quot;/g, '"');

let problems = 0, phTotal = 0;
const warn = (f, m) => { problems++; console.log(`✗ ${f}: ${m}`); };
const placeholders = new Map();

for (const file of await htmlFiles(ROOT)) {
  const rel = relative(ROOT, file).split(sep).join('/');
  const html = await readFile(file, 'utf8');
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] || '');
  const desc = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '');
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  console.log(`• ${rel.padEnd(42)} title ${String(title.length).padStart(2)} · desc ${String(desc.length).padStart(3)} · h1 ${h1}`);
  if (!title || title.length > 60) warn(rel, `Title ${title.length} Zeichen`);
  if (!desc || desc.length > 155) warn(rel, `Description ${desc.length} Zeichen`);
  if (h1 !== 1) warn(rel, `${h1} × H1`);
  if (!/rel="canonical"/.test(html) && rel !== '404.html') warn(rel, 'kein Canonical');

  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(json); } catch (e) { warn(rel, `JSON-LD ungültig: ${e.message}`); }
  }
  for (const [, tag] of html.matchAll(/(<img\b[^>]*>)/g)) if (!/\salt=/.test(tag)) warn(rel, `img ohne alt: ${tag.slice(0, 80)}`);

  const refs = new Set();
  for (const [, u] of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) refs.add(u);
  for (const [, set] of html.matchAll(/srcset="([^"]+)"/g)) for (const part of set.split(',')) refs.add(part.trim().split(' ')[0]);
  for (const u of refs) {
    if (!u.startsWith('/')) continue;
    let p = join(ROOT, decodeURI(u));
    if (u.endsWith('/')) p = join(p, 'index.html');
    if (!(await exists(p))) warn(rel, `fehlt: ${u}`);
  }

  const ph = [...html.matchAll(/\[PLATZHALTER[^\]]*\]|\[[^\]]*(?:bestätigen|abklären|ergänzen|klären)[^\]]*\]/g)].map((m) => m[0]);
  phTotal += ph.length;
  for (const p of ph) placeholders.set(p, (placeholders.get(p) || new Set()).add(rel));
}

console.log(`\n${problems ? `✗ ${problems} Problem(e)` : '✓ keine Probleme'} · ${phTotal} sichtbare Platzhalter auf allen Seiten`);
if (process.argv.includes('--platzhalter')) {
  console.log('\nPlatzhalter:');
  for (const [p, files] of [...placeholders].sort()) console.log(`  ${p}  →  ${[...files].join(', ')}`);
}
process.exitCode = problems ? 1 : 0;
