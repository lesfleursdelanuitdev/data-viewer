import { defineConfig, devices } from '@playwright/test';
import { homedir } from 'node:os';

// No full Chromium is downloaded on this server, so use the cached headless shell.
const shell = `${homedir()}/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4179',
    launchOptions: { executablePath: shell },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: shell } } }],
  webServer: {
    // Build first: demo/html-only.html loads dist/data-viewer.standalone.js.
    command: 'npm run build && npx vite --port 4179 --strictPort',
    timeout: 120_000,
    url: 'http://localhost:4179',
    reuseExistingServer: false,
  },
});
