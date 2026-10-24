// Membangun lapisan desain: ui.css (Tailwind v4 + @apply) -> CSS minify -> disuntik ke index.html & History.html
import { compile } from '/opt/npm-tools/node_modules/tailwindcss/dist/lib.mjs';
import * as esbuild from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
import fs from 'fs'; import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname), root = path.join(here, '..');
const base = '/opt/npm-tools/node_modules/tailwindcss/';
const src = fs.readFileSync(path.join(here, 'ui.css'), 'utf8');
const c = await compile(src, { base, loadStylesheet: async (id) => {
  const m = id.replace(/^tailwindcss\//, ''); const p = base + (m === 'tailwindcss' ? 'index.css' : m);
  return { path: p, base, content: fs.readFileSync(p, 'utf8') };
}});
const cand = (fs.existsSync(path.join(here,'candidates.txt')) ? fs.readFileSync(path.join(here,'candidates.txt'),'utf8') : '').split(/\s+/).filter(Boolean);
let css = c.build(cand);
css = css.replace(/@layer properties\s*\{[\s\S]*?\n\}\n?/g, m => m); // biarkan
const out = (await esbuild.transform(css, { loader: 'css', minify: true, target: 'chrome100' })).code;
fs.writeFileSync(path.join(here, 'ui.min.css'), out);
const names = fs.readFileSync(path.join(here, 'icon_names.txt'), 'utf8').trim();
const head = `<!-- UI-FONTS:begin -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=${names}&display=swap">
<!-- UI-FONTS:end -->`;
const detect = `<script>/* Ikon Material Symbols: bila font termuat, ikon cadangan SVG disembunyikan */
(function(){var d=document.documentElement;function ok(){d.classList.add('ms-ok');}
try{if(document.fonts&&document.fonts.load){document.fonts.load('24px "Material Symbols Rounded"','add').then(function(f){if(f&&f.length)ok();}).catch(function(){});}}catch(e){}})();</script>`;
for (const f of ['index.html', 'History.html']) {
  const p = path.join(root, f); let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/<!-- UI-FONTS:begin -->[\s\S]*?<!-- UI-FONTS:end -->\n?/, '');
  s = s.replace(/<!-- UI-LAYER:begin -->[\s\S]*?<!-- UI-LAYER:end -->\n?/, '');
  s = s.replace(/(<\?!= include\('Shared'\) \?>)/, head + '\n$1');
  const layer = `<!-- UI-LAYER:begin -->\n${detect}\n<style id="ui-layer">${out}</style>\n<!-- UI-LAYER:end -->\n`;
  s = s.replace(/<\/body>/, layer + '</body>');
  fs.writeFileSync(p, s);
}
console.log('ui.min.css', out.length, 'bytes');
