// Vorschau unter einem Unterpfad (z. B. name.github.io/schmuckoase-gersthofen/):
// stellt alle wurzel-absoluten Pfade ("/assets/…") auf den Unterpfad um und sperrt
// die Vorschau für Suchmaschinen. Mit eigener Domain (BASE leer) passiert nichts.
//   node tools/rebase.mjs _site /schmuckoase-gersthofen
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const [dir, rawBase = ''] = process.argv.slice(2);
const BASE = rawBase.replace(/\/+$/, '');
if (!dir) throw new Error('Aufruf: node tools/rebase.mjs <ordner> <basispfad>');
if (!BASE) { console.log('Kein Unterpfad – nichts zu tun.'); process.exit(0); }

const p = (s) => s.replace(/^\/(?!\/)/, `${BASE}/`);
const rules = {
  '.html': (s) => s
    .replace(/(\s(?:href|src|action|poster|data-full)=")(\/(?!\/)[^"]*)"/g, (_, a, v) => `${a}${p(v)}"`)
    .replace(/(\s(?:srcset|imagesrcset)=")([^"]*)"/g, (_, a, v) => `${a}${v.split(/,\s*/).map(p).join(', ')}"`)
    .replace(/(url=)(\/(?!\/))/g, `$1${BASE}/`)
    .replace(/(location\.replace\((['"]))\/(?!\/)/g, `$1${BASE}/`)
    .replace(/url\((['"]?)\/(?!\/)/g, `url($1${BASE}/`)
    .replace('<head>', '<head>\n<meta name="robots" content="noindex, nofollow"><!-- nur Vorschau -->'),
  '.css': (s) => s.replace(/url\((['"]?)\/(?!\/)/g, `url($1${BASE}/`),
  '.js': (s) => s
    .replace(/(['"`])\/(?=(?:data|assets|js|kontakt|eroeffnung|datenschutz)\b)/g, `$1${BASE}/`)
    .replace(/url\((['"]?)\/(?!\/)/g, `url($1${BASE}/`),
  '.webmanifest': (s) => s.replace(/"\/(?!\/)/g, `"${BASE}/`),
};

let n = 0;
async function walk(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const f = join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'vendor') await walk(f); continue; }
    const fn = rules[extname(e.name)];
    if (!fn) continue;
    const s = await readFile(f, 'utf8'), t = fn(s);
    if (t !== s) { await writeFile(f, t); n++; }
  }
}
await walk(dir);
await writeFile(join(dir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
console.log(`Unterpfad ${BASE}: ${n} Dateien angepasst, Vorschau für Suchmaschinen gesperrt.`);
