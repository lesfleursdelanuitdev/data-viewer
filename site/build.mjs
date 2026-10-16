// Builds the data-viewer site (landing + docs) into site/dist: plain HTML pages, written here, so
// every page's text is there before any script runs. The demos mount in the browser from
// /js/docs.js. It only reads the packages' built dist/ folders: run `npm run build` first.
import { readFile, writeFile, mkdir, rm, copyFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import { ADDRESSES, PACKAGE_PAGES, REFERENCE, VIEWER_UNCLAIMED } from './reference-map.mjs';

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
    bodyClass: id === 'overview' ? 'is-overview' : P.wide ? 'is-wide' : '',
    preload: P.mount ? '  <link rel="modulepreload" href="/js/data-viewer.standalone.js">\n' : '',
    logo: LOGO,
    sidebar: sidebar(id),
    options: options(id),
    text: textBlock(id, P),
    panel: panelBlock(id, P),
    notes: notesBlock(id, P),
    reference: referenceBlock(id),
  });
}

// The panel: Demo (when the page has one) and the code tabs. docs.js switches the tabs, mounts
// the demo and fills the events strip.
const DEFAULT_CONTROL = { delay: '900', scheme: 'dark' };
function panelBlock(id, P) {
  const tabs = [...(P.mount ? [{ label: 'Demo' }] : []), ...P.tabs];
  const tabButtons = tabs.map((t, i) =>
    `<button type="button" class="tab" role="tab" id="tab-${i}" aria-controls="tp-${i}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${esc(t.label)}</button>`).join('');
  const lines = [
    `<section class="panel" aria-label="Demo and code">`,
    `  <div class="panel-bar"><div class="panel-tabs" role="tablist" aria-label="Demo and code">${tabButtons}</div><div class="grow"></div><button type="button" class="btn btn-ghost copy-code" data-copy-code${P.mount ? ' hidden' : ''}>Copy</button></div>`,
  ];
  if (P.mount) {
    if (P.controls?.length || P.toggles?.length) {
      const controls = (P.controls || []).map((c) => {
        const on = DEFAULT_CONTROL[c.key] ?? c.options[0][0];
        return `<div class="control"><span class="control-label" id="ctl-${c.key}">${esc(c.label)}</span><div class="seg" role="radiogroup" aria-labelledby="ctl-${c.key}">${c.options.map(([v, label]) =>
          `<label class="seg-opt"><input type="radio" name="${id}-${c.key}" value="${esc(v)}" data-control="${c.key}"${v === on ? ' checked' : ''}>${esc(label)}</label>`).join('')}</div></div>`;
      });
      const toggles = (P.toggles || []).map((t) => `<label class="toggle"><input type="checkbox" data-toggle="${t.key}">${esc(t.label)}</label>`);
      lines.push(`  <div class="controls" data-demo-only>${[...controls, ...toggles].join('')}<span class="busy" data-busy hidden>Loading…</span></div>`);
    }
    lines.push(`  <div class="demo" id="tp-0" role="tabpanel" aria-labelledby="tab-0"><div class="demo-status" data-status>Loading the components…</div><div class="demo-host" data-host></div></div>`);
  }
  tabs.forEach((t, i) => {
    if (!t.code) return;
    lines.push(`  <pre class="code-view" id="tp-${i}" role="tabpanel" aria-labelledby="tab-${i}" tabindex="0"${i ? ' hidden' : ''}><code>${esc(t.code)}</code></pre>`);
  });
  if (P.mount) {
    lines.push(`  <div class="events" data-events data-demo-only hidden><div class="events-head"><span class="events-dot"></span><span class="events-label">Events</span><span class="grow"></span><button type="button" class="btn btn-ghost events-clear" data-clear hidden>Clear</button></div><div class="events-empty" data-empty>Nothing yet. Interact with the demo above.</div><ol class="events-list" data-list></ol></div>`);
  }
  lines.push('</section>');
  return lines.map((l) => `        ${l}`).join('\n');
}

// ── Reference: package README sections, per reference-map.mjs ──
const REPO = 'https://github.com/lesfleursdelanuitdev/data-viewer';

// GitHub's heading ids: lower case, punctuation dropped, spaces to hyphens.
export const slug = (title) => title.replace(/`/g, '').toLowerCase().trim()
  .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '').replace(/\s/g, '-');

// A README's `##` sections, each with its headings (`##` to `####`); fenced code is skipped.
function readSections(md) {
  const out = [];
  let fence = null;
  for (const line of md.split('\n')) {
    const f = /^\s*(```+|~~~+)/.exec(line);
    if (f) fence = fence === null ? f[1] : (line.trim().startsWith(fence) ? null : fence);
    const h = fence === null && !f ? /^(#{1,4}) +(.+?)\s*#*\s*$/.exec(line) : null;
    if (h && h[1].length === 1) continue;
    if (h && h[1].length === 2) out.push({ title: h[2], lines: [], headings: [] });
    if (!out.length) continue;
    const cur = out[out.length - 1];
    cur.lines.push(line);
    if (h) cur.headings.push({ depth: h[1].length, title: h[2], id: slug(h[2]) });
  }
  return out.map((sec) => ({ ...sec, text: sec.lines.join('\n').trim() + '\n' }));
}

const readmes = {};
for (const pkg of Object.keys(PACKAGE_PAGES)) {
  readmes[pkg] = readSections(await readFile(join(root, 'packages', pkg, 'README.md'), 'utf8'));
}

// page id -> [{ pkg, section }], in the order the page shows them.
const pageSections = {};
for (const [page, specs] of Object.entries(REFERENCE)) {
  if (!ADDRESSES[page]) fail(`reference-map.mjs names page ${page}, which has no address`);
  pageSections[page] = [];
  for (const spec of [specs].flat()) {
    const all = readmes[spec.pkg];
    if (!all) fail(`reference-map.mjs: no README for package ${spec.pkg}`);
    const find = (title) => all.find((sec) => sec.title === title)
      ?? fail(`packages/${spec.pkg}/README.md has no "## ${title}" section (named for ${ADDRESSES[page]} in reference-map.mjs)`);
    let list;
    if (spec.sections) list = spec.sections.map(find);
    else {
      const start = all.indexOf(find(spec.from));
      for (const t of spec.skip || []) find(t);
      list = all.slice(start).filter((sec) => !(spec.skip || []).includes(sec.title));
    }
    pageSections[page].push(...list.map((section) => ({ pkg: spec.pkg, section })));
  }
}

// Every `##` section of the viewer README is on exactly one page (Licence is left out on purpose).
{
  const claims = new Map();
  for (const [page, list] of Object.entries(pageSections)) {
    for (const { pkg, section } of list) if (pkg === 'data-viewer') claims.set(section.title, [...(claims.get(section.title) || []), page]);
  }
  const unclaimed = readmes['data-viewer'].filter((sec) => !claims.has(sec.title) && !VIEWER_UNCLAIMED.includes(sec.title));
  if (unclaimed.length) fail(`no page shows these packages/data-viewer/README.md sections; add them to reference-map.mjs: ${unclaimed.map((sec) => `"## ${sec.title}"`).join(', ')}`);
  const twice = [...claims].filter(([, pages]) => pages.length > 1);
  if (twice.length) fail(`these viewer README sections are on two pages: ${twice.map(([t, p]) => `"${t}" (${p.join(', ')})`).join('; ')}`);
}

// Where each README heading ended up: package -> heading id -> page id.
const anchors = {};
for (const [page, list] of Object.entries(pageSections)) {
  for (const { pkg, section } of list) {
    anchors[pkg] ??= new Map();
    for (const h of section.headings) anchors[pkg].set(h.id, page);
  }
}

// A README link, as it should read on `page`.
function rewrite(href, pkg, page) {
  const at = (target, id) => (target === page ? `#${id}` : `${ADDRESSES[target]}#${id}`);
  if (href.startsWith('#')) {
    const id = href.slice(1);
    const target = anchors[pkg]?.get(id);
    if (!target) fail(`packages/${pkg}/README.md links to ${href}, which no docs page shows`);
    return at(target, id);
  }
  const gh = /^https:\/\/github\.com\/lesfleursdelanuitdev\/data-viewer\/tree\/main\/packages\/([\w-]+)\/?(?:#(.*))?$/.exec(href);
  if (gh) {
    const [, other, id] = gh;
    if (!PACKAGE_PAGES[other]) fail(`packages/${pkg}/README.md links to unknown package ${other}`);
    if (!id || id === 'readme') return ADDRESSES[PACKAGE_PAGES[other]];
    const target = anchors[other]?.get(id);
    if (!target) fail(`packages/${pkg}/README.md links to ${href}, which no docs page shows`);
    return at(target, id);
  }
  if (!/^[a-z]+:|^\/\//i.test(href) && !href.startsWith('/')) return `${REPO}/blob/main/packages/${pkg}/${href}`;
  return href;
}

function renderSections(page) {
  const toc = [];
  const used = new Map();
  let html = '';
  for (const { pkg, section } of pageSections[page]) {
    const marked = new Marked({ gfm: true });
    marked.use({
      walkTokens(t) { if (t.type === 'link') t.href = rewrite(t.href, pkg, page); },
      renderer: {
        // Raw HTML in a README is shown as text, as GitHub shows a stray tag like "<title>".
        html({ text }) { return esc(text); },
        heading({ tokens, depth, text }) {
          let id = slug(text);
          const n = used.get(id) ?? 0;
          used.set(id, n + 1);
          if (n) id = `${id}-${n}`;
          const inner = this.parser.parseInline(tokens);
          if (depth === 2) toc.push({ id, inner });
          return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
        },
      },
    });
    html += marked.parse(section.text);
  }
  html = html.replace(/<table>/g, '<div class="ref-scroll"><table class="table">').replace(/<\/table>/g, '</table></div>');
  return { html, toc };
}

function referenceBlock(page) {
  if (!pageSections[page]) return '';
  const { html, toc } = renderSections(page);
  return `      <section class="reference" aria-labelledby="reference-title">
        <div class="rule-fade"></div>
        <h2 class="kicker" id="reference-title">Reference</h2>
        <nav class="toc" aria-label="On this page"><div class="toc-label">On this page</div><ul>${toc.map((t) => `<li><a href="#${t.id}">${t.inner}</a></li>`).join('')}</ul></nav>
        <div class="ref">
${html}        </div>
      </section>`;
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
// The viewer, the json adapter and the five filter styles' add-on files.
const PKG_FILES = ['data-viewer.standalone.js', 'data-viewer-json.js',
  ...['panel', 'bar', 'rail', 'columns', 'search'].map((n) => `data-viewer-filter-${n}.js`)];
for (const f of PKG_FILES) {
  if (!existsSync(join(pkgDist, f))) fail(`missing ${join(pkgDist, f)}: run \`npm run build\` first`);
}

await rm(out, { recursive: true, force: true });
await mkdir(join(out, 'js'), { recursive: true });
await mkdir(join(out, 'fonts'), { recursive: true });

// The packages' scripts, the site's own scripts and the content module.
for (const f of PKG_FILES) await copyFile(join(pkgDist, f), join(out, 'js', f));
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
await write('404.html', fill(await readFile(join(src, '404.html'), 'utf8'), { logo: LOGO }));
for (const id of Object.keys(C.PAGES)) {
  if (!ADDRESSES[id]) fail(`page ${id} has no address in reference-map.mjs`);
  await write(join(ADDRESSES[id], 'index.html'), await docsPage(id));
}

await checkNoOtherSites();

// What was written, with the gzipped size of each (as the server sends them).
const files = (await readdir(out, { recursive: true, withFileTypes: true })).filter((d) => d.isFile()).map((d) => join(d.parentPath, d.name));
let total = 0;
const rows = [];
for (const p of files.sort()) {
  const buf = await readFile(p);
  total += buf.length;
  rows.push(`  ${relative(out, p).padEnd(44)} ${String(buf.length).padStart(7)} bytes${/\.woff2$/.test(p) ? '' : `, ${gzipSync(buf).length} gzipped`}`);
}
console.log(`built ${relative(root, out)} (${files.length} files, ${total} bytes):\n${rows.join('\n')}`);
