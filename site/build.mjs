// Builds the data-viewer site (landing + docs) into site/dist: plain HTML pages, written here, so
// every page's text is there before any script runs. The demos mount in the browser from
// /js/docs.js. It only reads the packages' built dist/ folders: run `npm run build` first.
import { readFile, writeFile, mkdir, rm, copyFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADDRESSES } from './reference-map.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = join(here, 'src');
const out = join(here, 'dist');

const C = await import('./content/docs-content.js');

function fail(message) {
  console.error(`site build: ${message}`);
  process.exit(1);
}

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Fills {{name}} slots; an unknown slot is a mistake in the template.
function fill(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in values)) fail(`template slot {{${k}}} has no value`);
    return values[k];
  });
}

const LOGO = '<svg class="logo" viewBox="0 0 256 256" width="20" height="20" aria-hidden="true"><rect x="32" y="40" width="80" height="176" rx="12"></rect><rect x="144" y="40" width="80" height="72" rx="12"></rect><rect x="144" y="144" width="80" height="72" rx="12"></rect></svg>';

async function write(path, text) {
  await mkdir(dirname(join(out, path)), { recursive: true });
  await writeFile(join(out, path), text);
}

// ── pages ──
// Backticks in docs-content strings mark inline code.
const inline = (text, cls = 'ic') => String(text || '').split('`')
  .map((t, i) => (i % 2 ? `<code class="${cls}">${esc(t)}</code>` : esc(t))).join('');
const plain = (text) => String(text || '').replace(/`/g, '');

const ORDER = C.GROUPS.flatMap((g) => g.items);

function sidebar(current) {
  return C.GROUPS.map((g) => `      <div class="side-group">
        <div class="side-label">${esc(g.name)}</div>
${g.items.map((id) => `        <a class="side-item" href="${ADDRESSES[id]}"${id === current ? ' aria-current="page"' : ''}>${esc(C.PAGES[id].nav)}</a>`).join('\n')}
      </div>`).join('\n');
}

function options(current) {
  return C.GROUPS.flatMap((g) => g.items.map((id) =>
    `        <option value="${ADDRESSES[id]}"${id === current ? ' selected' : ''}>${esc(`${g.name} · ${C.PAGES[id].nav}`)}</option>`)).join('\n');
}

function textBlock(id, P) {
  const parts = [
    `<div class="kicker">${esc(P.kicker)}</div>`,
    `<h1>${esc(P.title)}</h1>`,
  ];
  if (P.mono) parts.push(`<code class="mono-tag">${esc(`<${P.mono}>`)}</code>`);
  parts.push(`<p class="intro">${inline(P.intro)}</p>`);
  if (P.features) {
    parts.push(`<div class="features">${P.features.map(([t, d]) =>
      `<div class="feature"><div class="feature-title">${esc(t)}</div><div class="feature-copy">${inline(d, '')}</div></div>`).join('')}</div>`);
  }
  if (id === 'overview') {
    parts.push(`<div class="btn-row"><a class="btn btn-primary" href="${ADDRESSES.basics}">Read the guide</a><a class="btn btn-secondary" href="${ADDRESSES.install}">Install</a></div>`);
  }
  return `        <section class="d-text">\n          ${parts.join('\n          ')}\n        </section>`;
}

function notesBlock(id, P) {
  const parts = [];
  if (P.vars) {
    parts.push(`<table class="table vars"><thead><tr><th>Variable</th><th>Used for</th></tr></thead><tbody>${P.vars.map(([n, u]) =>
      `<tr><td>${esc(n)}</td><td>${esc(u)}</td></tr>`).join('')}</tbody></table>`);
  }
  if (P.notes?.length) {
    parts.push(`<div class="good"><div class="good-label">Good to know</div><ul>${P.notes.map((n) => `<li><span>${inline(n)}</span></li>`).join('')}</ul></div>`);
  }
  const i = ORDER.indexOf(id);
  const prev = ORDER[i - 1], next = ORDER[i + 1];
  parts.push(`<nav class="pn" aria-label="Previous and next page"><div>${prev ? `<a class="pn-prev" href="${ADDRESSES[prev]}" rel="prev"><span class="pn-label">Previous</span><span class="pn-name">${esc(C.PAGES[prev].nav)}</span></a>` : ''}</div><div>${next ? `<a class="pn-next" href="${ADDRESSES[next]}" rel="next"><span class="pn-label">Next</span><span class="pn-name">${esc(C.PAGES[next].nav)}</span></a>` : ''}</div></nav>`);
  return `        <section class="notes">\n          ${parts.join('\n          ')}\n        </section>`;
}

async function docsPage(id) {
  const P = C.PAGES[id];
  const shell = await readFile(join(src, 'docs-shell.html'), 'utf8');
  return fill(shell, {
    title: esc(id === 'overview' ? 'data-viewer docs' : `${P.nav} · data-viewer docs`),
    description: esc(plain(P.intro)),
    page: esc(id),
    bodyClass: id === 'overview' ? 'is-overview' : '',
    preload: P.mount ? '  <link rel="modulepreload" href="/js/data-viewer.standalone.js">\n' : '',
    logo: LOGO,
    sidebar: sidebar(id),
    options: options(id),
    text: textBlock(id, P),
    panel: panelBlock(id, P),
    notes: notesBlock(id, P),
    reference: '',
  });
}

// The panel: Demo (when the page has one) and the code tabs; filled in by docs.js.
function panelBlock() {
  return '';
}

// ── checks ──
// No page may load anything from another site. Links (<a href>) out are fine.
async function checkNoOtherSites() {
  const bad = [];
  const files = (await readdir(out, { recursive: true })).map((f) => join(out, f));
  for (const file of files) {
    const name = relative(out, file);
    if (file.endsWith('.html')) {
      const html = await readFile(file, 'utf8');
      for (const m of html.matchAll(/<(script|link|img|iframe|source|video|audio|embed|object)\b[^>]*>/gi)) {
        const url = /\b(?:src|href|data)\s*=\s*["']?([^"'\s>]+)/i.exec(m[0])?.[1] ?? '';
        if (/^(https?:)?\/\//i.test(url)) bad.push(`${name}: ${m[0]}`);
      }
      for (const m of html.matchAll(/url\(\s*["']?((https?:)?\/\/[^"')]+)/gi)) bad.push(`${name}: url(${m[1]})`);
    } else if (file.endsWith('.css')) {
      const css = await readFile(file, 'utf8');
      for (const m of css.matchAll(/(?:url\(\s*["']?|@import\s+["'])((https?:)?\/\/[^"')]+)/gi)) bad.push(`${name}: ${m[1]}`);
    } else if (file.endsWith('.js') && !name.startsWith('js/data-viewer')) {
      // Our own scripts: no addresses on other sites at all (the packages' builds are checked by their own tests).
      const js = await readFile(file, 'utf8');
      for (const m of js.matchAll(/(https?:)?\/\/[a-z0-9-]+\.[a-z0-9.-]+/gi)) {
        if (m[1] || /['"`]$/.test(js.slice(0, m.index))) bad.push(`${name}: ${m[0]}`);
      }
    }
  }
  if (bad.length) fail(`these load something from another site:\n  ${bad.join('\n  ')}`);
}

// ── build ──
const pkgDist = join(root, 'packages', 'data-viewer', 'dist');
for (const f of ['data-viewer.standalone.js', 'data-viewer-json.js']) {
  if (!existsSync(join(pkgDist, f))) fail(`missing ${join(pkgDist, f)}: run \`npm run build\` first`);
}

await rm(out, { recursive: true, force: true });
await mkdir(join(out, 'js'), { recursive: true });
await mkdir(join(out, 'fonts'), { recursive: true });

// The packages' scripts, the site's own scripts and the content module.
for (const f of ['data-viewer.standalone.js', 'data-viewer-json.js']) await copyFile(join(pkgDist, f), join(out, 'js', f));
for (const f of ['docs.js', 'landing.js', 'tabs.js']) {
  if (existsSync(join(src, f))) await copyFile(join(src, f), join(out, 'js', f));
}
await copyFile(join(here, 'content', 'docs-content.js'), join(out, 'js', 'docs-content.js'));
await copyFile(join(src, 'site.css'), join(out, 'site.css'));
await copyFile(join(src, 'plants.json'), join(out, 'plants.json'));
await write('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="#9184d9" stroke-width="16" stroke-linejoin="round"><rect x="32" y="40" width="80" height="176" rx="12"/><rect x="144" y="40" width="80" height="72" rx="12"/><rect x="144" y="144" width="80" height="72" rx="12"/></svg>\n`);

// Inter and JetBrains Mono, 400 and 500, latin, from @fontsource.
for (const [pkg, file] of [
  ['inter', 'inter-latin-400-normal.woff2'], ['inter', 'inter-latin-500-normal.woff2'],
  ['jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff2'], ['jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff2'],
]) {
  const from = join(root, 'node_modules', '@fontsource', pkg, 'files', file);
  if (!existsSync(from)) fail(`missing font ${from}`);
  await copyFile(from, join(out, 'fonts', file));
}

await write('index.html', fill(await readFile(join(src, 'landing.html'), 'utf8'), { logo: LOGO }));
for (const id of Object.keys(C.PAGES)) {
  if (!ADDRESSES[id]) fail(`page ${id} has no address in reference-map.mjs`);
  await write(join(ADDRESSES[id], 'index.html'), await docsPage(id));
}

await checkNoOtherSites();

console.log(`built ${relative(root, out)}:`);
for (const f of (await readdir(out, { recursive: true, withFileTypes: true })).filter((d) => d.isFile())) {
  const p = join(f.parentPath, f.name);
  console.log(`  ${relative(out, p)}  ${(await readFile(p)).length} bytes`);
}
