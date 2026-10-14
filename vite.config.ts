import { defineConfig, type Plugin } from 'vite';
import { gzipSync } from 'node:zlib';

const LIMIT = 30 * 1024; // the standalone script must stay under 30 KB gzipped

// Fails the build when the standalone script grows past the limit.
function sizeCheck(): Plugin {
  return {
    name: 'dv-size-check',
    generateBundle(_opts, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'chunk') continue;
        const size = gzipSync(file.code).length;
        this.info(`${file.fileName}: ${(size / 1024).toFixed(1)} KB gzipped`);
        if (size > LIMIT) this.error(`${file.fileName} is ${size} bytes gzipped, over ${LIMIT}`);
      }
    },
  };
}

// `vite` serves the demo; `vite build` makes dist/data-viewer.js (Lit left out) and
// `vite build --mode standalone` makes dist/data-viewer.standalone.js (Lit inside).
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') return { root: 'demo' };
  const standalone = mode === 'standalone';
  return {
    plugins: standalone ? [sizeCheck()] : [],
    build: {
      emptyOutDir: !standalone,
      minify: standalone,
      lib: {
        entry: standalone ? 'src/standalone.ts' : 'src/index.ts',
        formats: ['es'],
        fileName: () => (standalone ? 'data-viewer.standalone.js' : 'data-viewer.js'),
      },
      rollupOptions: { external: standalone ? [] : [/^lit(\/|$)/, /^@lit\//] },
    },
  };
});
