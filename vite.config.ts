import { defineConfig, type Plugin } from 'vite';
import { gzipSync } from 'node:zlib';
import type { IncomingMessage, ServerResponse } from 'node:http';

const LIMIT = 30 * 1024; // the standalone viewer must stay under 30 KB gzipped
const ADAPTER_LIMIT = 3 * 1024; // and each standalone adapter script stays tiny

// Fails the build when a standalone script grows past its limit.
function sizeCheck(limit: number): Plugin {
  return {
    name: 'dv-size-check',
    generateBundle(_opts, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'chunk') continue;
        const size = gzipSync(file.code).length;
        this.info(`${file.fileName}: ${(size / 1024).toFixed(1)} KB gzipped`);
        if (size > limit) this.error(`${file.fileName} is ${size} bytes gzipped, over ${limit}`);
      }
    },
  };
}

// --- The demo's fake data source (dev server only), for demo/adapters.html and its e2e tests.
// 45 recipes: 20 "Spiced …", 20 "Rose …", 5 "Lemon …".
const dishes = ['tea', 'cake', 'rice', 'soup', 'salad', 'curry', 'bread', 'tart', 'noodles', 'stew',
  'pie', 'jam', 'lassi', 'pudding', 'pilaf', 'biscuits', 'sorbet', 'dal', 'buns', 'kulfi'];
const cuisines = ['Persian', 'Indian', 'French', 'Turkish'];
const recipes = ['Spiced', 'Rose', 'Lemon'].flatMap((w) => dishes.map((d) => `${w} ${d}`)).slice(0, 45)
  .map((name, i) => ({ id: i + 1, name, cuisine: cuisines[i % 4]!, minutes: 10 + ((i * 7) % 80) }));

type Recipe = (typeof recipes)[number];
function pageOf(p: URLSearchParams, perKey: string, per = 20) {
  const search = (p.get('search') ?? '').toLowerCase();
  const sort = p.get('sort') as keyof Recipe | null;
  const sign = p.get('dir') === 'desc' ? -1 : 1;
  let rows = recipes.filter((r) => r.name.toLowerCase().includes(search));
  if (sort && sort in recipes[0]!) {
    rows = [...rows].sort((a, b) => sign * String(a[sort]).localeCompare(String(b[sort]), 'en', { numeric: true }));
  }
  const size = Number(p.get(perKey)) || per;
  const page = Math.max(1, Number(p.get('page')) || 1);
  return { total: rows.length, rows: rows.slice((page - 1) * size, page * size), page, per: size };
}

// /api/recipes: ?all=1 answers a plain array; ?slow=<text> answers a search for <text> after
// 800 ms (anything else after 50 ms), so a newer query can overtake an older one; the dv-fail
// cookie makes it fail with a 500. /_pammy/api/data/postgres/demo/recipes answers as the gate does.
function fakeApi(): Plugin {
  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };
  return {
    name: 'dv-fake-api',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const p = url.searchParams;
        if (url.pathname === '/api/recipes') {
          if (/(^|;\s*)dv-fail=1/.test(req.headers.cookie ?? '')) return send(res, 500, { message: 'Made to fail.' });
          if (p.has('all')) return send(res, 200, recipes);
          const slow = p.get('slow');
          const wait = slow && (p.get('search') ?? '').includes(slow) ? 800 : 50;
          const out = pageOf(p, 'size');
          setTimeout(() => send(res, 200, { rows: out.rows, total: out.total }), wait);
          return;
        }
        if (url.pathname === '/_pammy/api/data/postgres/demo/recipes') {
          const out = pageOf(p, 'per');
          return send(res, 200, { resource: 'recipes', rich: [], page: out.page, per: out.per, total: out.total, items: out.rows });
        }
        next();
      });
    },
  };
}

// The standalone builds, one script each: `vite build --mode <mode>`.
const standalones: Record<string, { entry: string; file: string; limit: number }> = {
  standalone: { entry: 'src/standalone.ts', file: 'data-viewer.standalone.js', limit: LIMIT },
  'standalone-json': { entry: 'src/adapters/json.ts', file: 'data-viewer-json.js', limit: ADAPTER_LIMIT },
  'standalone-pammy': { entry: 'src/adapters/pammy.ts', file: 'data-viewer-pammy.js', limit: ADAPTER_LIMIT },
};

// `vite` serves the demo; `vite build` makes the ES modules (Lit left out): dist/data-viewer.js,
// dist/adapters/json.js and dist/adapters/pammy.js. The standalone modes make the one-file scripts.
export default defineConfig(({ command, mode }) => {
  // The demo also serves dist/ at its root, so the HTML-only demo pages load the built
  // standalone scripts exactly as a plain page would.
  if (command === 'serve') return { root: 'demo', publicDir: '../dist', plugins: [fakeApi()] };
  const one = standalones[mode];
  if (one) {
    return {
      plugins: [sizeCheck(one.limit)],
      build: {
        emptyOutDir: false,
        minify: true,
        lib: { entry: one.entry, formats: ['es'], fileName: () => one.file },
      },
    };
  }
  return {
    build: {
      emptyOutDir: true,
      minify: false,
      lib: {
        entry: { 'data-viewer': 'src/index.ts', 'adapters/json': 'src/adapters/json.ts', 'adapters/pammy': 'src/adapters/pammy.ts' },
        formats: ['es'],
        fileName: (_format, name) => `${name}.js`,
      },
      rollupOptions: {
        external: [/^lit(\/|$)/, /^@lit\//],
        output: { chunkFileNames: 'chunks/[name]-[hash].js' },
      },
    },
  };
});
