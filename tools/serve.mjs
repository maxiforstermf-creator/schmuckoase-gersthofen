// Lokaler Testserver, der sich wie GitHub Pages verhält (gzip, Cache-Control 10 min, 404.html).
//   node tools/serve.mjs [port]   → http://127.0.0.1:8138
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.argv[2] || 8138);
const NOCACHE = process.argv.includes('--no-cache'); // Vorschau aufs Handy: immer frische Dateien
const HOST = process.argv[3] || '127.0.0.1'; // '0.0.0.0' = im WLAN erreichbar (z. B. fürs Handy)
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.ics': 'text/calendar',
};
const COMPRESS = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.txt']);

createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  let file = join(ROOT, path);
  let status = 200;
  try {
    const s = await stat(file);
    if (s.isDirectory()) {
      if (!req.url.split('?')[0].endsWith('/')) { res.writeHead(301, { Location: req.url.replace(/(\?|$)/, '/$1') }); return res.end(); }
      file = join(file, 'index.html');
    }
    await stat(file);
  } catch { file = join(ROOT, '404.html'); status = 404; }
  let body = await readFile(file);
  const ext = extname(file);
  const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': NOCACHE ? 'no-store' : 'max-age=600' };
  if (COMPRESS.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) { body = gzipSync(body, { level: 9 }); headers['Content-Encoding'] = 'gzip'; }
  res.writeHead(status, headers);
  res.end(body);
}).listen(PORT, HOST, () => console.log(`http://${HOST}:${PORT}`));
