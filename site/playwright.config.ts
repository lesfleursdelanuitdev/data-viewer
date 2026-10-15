// The site's own Playwright run: builds site/dist, serves it with test/serve.mjs and tests the
// pages in the cached headless shell, like the packages' e2e.
import { defineConfig, devices } from '@playwright/test';
import { homedir } from 'node:os';

const shell = `${homedir()}/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`;
const port = 4190;

export default defineConfig({
  testDir: 'test',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: `http://localhost:${port}`, launchOptions: { executablePath: shell } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { executablePath: shell } } }],
  webServer: {
    command: `node build.mjs && node test/serve.mjs ${port}`,
    timeout: 60_000,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
  },
});
