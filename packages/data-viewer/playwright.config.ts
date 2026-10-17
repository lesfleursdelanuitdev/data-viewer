import { defineConfig } from '@playwright/test';
import { e2eConfig } from '../../playwright.base.ts';

// The other packages are built first: demo/standalone-all.html loads their standalone scripts.
export default defineConfig(e2eConfig(4179,
  'npm --prefix ../menu run build && npm --prefix ../select run build && npm --prefix ../pagination run build && npm --prefix ../card run build && npm --prefix ../search run build && npm --prefix ../filter run build && npm --prefix ../search-filter run build && npm run build'));
