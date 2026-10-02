// Baut die lokal gehosteten Bibliotheken neu (nur nötig für Updates von three/gsap/lenis):
//   npm i && node tools/build-vendor.mjs
// Ergebnis: js/vendor/three.module.min.js (tree-shaken), gsap.min.js, lenis.min.js – jeweils ESM.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const jobs = [
  ['tools/vendor-src/three-entry.js', 'js/vendor/three.module.min.js'],
  ['tools/vendor-src/gsap-entry.js', 'js/vendor/gsap.min.js'],
  ['tools/vendor-src/lenis-entry.js', 'js/vendor/lenis.min.js'],
];
for (const [entry, out] of jobs) {
  await build({
    entryPoints: [root + entry], outfile: root + out, bundle: true, format: 'esm', minify: true,
    legalComments: 'inline', nodePaths: [root + 'node_modules'], logLevel: 'warning',
  });
  console.log('gebaut:', out);
}
