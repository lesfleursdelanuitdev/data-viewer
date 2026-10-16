// Points `@lesfleursdelanuitdev/<pkg>` and `<pkg>/<x>` at the sibling package's sources (as
// vite.shared.ts's `siblings` aliases do for builds and demos), so the unit tests use the filter
// package as it is now, not a stale or missing dist/. Loaded with `node --import`.
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const packages = fileURLToPath(new URL('../../', import.meta.url));
const sibling = /^@lesfleursdelanuitdev\/(menu|pagination|card|search-filter|search|filter)(?:\/([\w-]+))?$/;

registerHooks({
  resolve(specifier, context, next) {
    const m = sibling.exec(specifier);
    if (!m) return next(specifier, context);
    return next(pathToFileURL(`${packages}${m[1]}/src/${m[2] ?? 'index'}.ts`).href, context);
  },
});
