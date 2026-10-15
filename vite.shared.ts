// What every package's vite.config.ts shares: the size check, the standalone build, the library
// build, and the aliases that point the packages at each other's sources (so the demos, the
// standalone builds and the tests use the code as it is now, not a stale dist/).
import type { Plugin, UserConfig } from 'vite';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const source = (name: string) => fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

/** The sibling packages, by npm name, as their sources. */
export const siblings: Record<string, string> = {
  '@lesfleursdelanuitdev/menu': source('menu'),
  '@lesfleursdelanuitdev/pagination': source('pagination'),
  '@lesfleursdelanuitdev/card': source('card'),
  '@lesfleursdelanuitdev/search': source('search'),
  '@lesfleursdelanuitdev/filter': source('filter'),
};

/** Fails the build when a script grows past its gzipped limit. */
export function sizeCheck(limit: number): Plugin {
  return {
    name: 'lfdln-size-check',
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

/** One standalone script: everything inside (Lit and the sibling packages), minified, size-checked. */
export function standalone(entry: string, file: string, limit: number): UserConfig {
  return {
    resolve: { alias: siblings },
    plugins: [sizeCheck(limit)],
    build: {
      emptyOutDir: false,
      minify: true,
      lib: { entry, formats: ['es'], fileName: () => file },
    },
  };
}

/** The ES modules for apps with a bundler: Lit and the sibling packages left out (dependencies). */
export function library(entry: Record<string, string>): UserConfig {
  return {
    build: {
      emptyOutDir: true,
      minify: false,
      lib: { entry, formats: ['es'], fileName: (_format, name) => `${name}.js` },
      rollupOptions: {
        external: [/^lit(\/|$)/, /^@lit\//, /^@lesfleursdelanuitdev\//],
        output: { chunkFileNames: 'chunks/[name]-[hash].js' },
      },
    },
  };
}

/** The demo server: the package's demo/ folder, with its built dist/ served at the root. */
export function demo(extra: Plugin[] = []): UserConfig {
  return { root: 'demo', publicDir: '../dist', resolve: { alias: siblings }, plugins: extra };
}
