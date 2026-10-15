// The Playwright setup every package's e2e shares. Each package's playwright.config.ts adds its
// own dev server (port and build command).
import { devices, type PlaywrightTestConfig } from '@playwright/test';
import { homedir } from 'node:os';

// No full Chromium is downloaded on this server, so use the cached headless shell.
const shell = `${homedir()}/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`;

export function e2eConfig(port: number, build: string): PlaywrightTestConfig {
  return {
    testDir: 'e2e',
    fullyParallel: true,
    reporter: 'list',
    use: { baseURL: `http://localhost:${port}`, launchOptions: { executablePath: shell } },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: shell } } }],
    webServer: {
      // Build first: the HTML-only demo pages load the built standalone scripts.
      command: `${build} && npx vite --port ${port} --strictPort`,
      timeout: 120_000,
      url: `http://localhost:${port}`,
      reuseExistingServer: false,
    },
  };
}
