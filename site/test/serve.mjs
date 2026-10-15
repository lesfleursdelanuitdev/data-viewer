// A tiny static server for the built site (site/dist), for the Playwright tests and for looking at
// the site by hand: `node site/test/serve.mjs [port] [folder]`. It behaves like the nginx route:
// a folder answers with its index.html, a folder without its slash is redirected to it, and
// anything else answers 404 with 404.html.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.argv[2] || 4317);
const root = resolve(process.argv[3] || join(dirname(fileURLToPath(import.meta.url)), '..', 'dist'));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8',
};

async function isFile(p) {
  try { return (await stat(p)).isFile(); } catch { return false; }
}
async function isDir(p) {
  try { return (await stat(p)).isDirectory(); } catch { return false; }
}

createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { path = '/'; }
  const file = normalize(join(root, path));
  if (!file.startsWith(root)) { res.writeHead(400).end(); return; }

  let target = null;
  if (await isFile(file)) target = file;
  else if (await isDir(file)) {
    if (!path.endsWith('/')) { res.writeHead(301, { location: path + '/' + url.search }).end(); return; }
    if (await isFile(join(file, 'index.html'))) target = join(file, 'index.html');
  }
  if (!target) {
    const notFound = join(root, '404.html');
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    res.end(await isFile(notFound) ? await readFile(notFound) : 'Not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(target)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(await readFile(target));
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
