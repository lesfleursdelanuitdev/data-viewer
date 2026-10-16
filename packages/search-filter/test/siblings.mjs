// Points `@lesfleursdelanuitdev/<pkg>` and `<pkg>/<x>` at the sibling package's sources (as
// vite.shared.ts's `siblings` aliases do for builds and demos), so the unit tests use the filter
// package as it is now, not a stale or missing dist/. Loaded with `node --import`.
// Needs Node 22.18 or later: module.registerHooks came in 22.15, and running .ts tests without a
// flag (type stripping on by default) in 22.18.
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packages = fileURLToPath(new URL('../../', import.meta.url));
const sibling = /^@lesfleursdelanuitdev\/(menu|pagination|card|search-filter|search|filter)(?:\/([\w-]+))?$/;

registerHooks({
  resolve(specifier, context, next) {
    const m = sibling.exec(specifier);
    if (!m) return next(specifier, context);
    return next(pathToFileURL(`${packages}${m[1]}/src/${m[2] ?? 'index'}.ts`).href, context);
  },
});
