// The built site, through test/serve.mjs: every address, the live demos, the panel, the
// sidebar and phone picker, the Reference sections, phone widths and requests to other sites.
import { test, expect, type Page } from '@playwright/test';
import { ADDRESSES } from '../reference-map.mjs';

const PAGES = Object.entries(ADDRESSES) as [string, string][];
const ALL = ['/', ...PAGES.map(([, a]) => a)];

// Fails the test on console errors, page errors, failed requests and requests to other sites.
function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()}: ${r.url()}`); });
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['http:', 'https:'].includes(url.protocol)) return;
    if (url.host !== new URL(page.url() === 'about:blank' ? 'http://localhost:4190' : page.url()).host) problems.push(`other site: ${r.url()}`);
  });
  return problems;
}

test.describe('every address', () => {
  for (const path of ALL) {
    test(`${path} loads with no errors and nothing from another site`, async ({ page }) => {
      const problems = watch(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await page.waitForLoadState('networkidle');
      expect(problems).toEqual([]);
    });
  }
});

test.describe('live demos', () => {
  const MOUNTS: [string, string][] = [
    ['/docs/', 'lfdln-data-viewer .dv-root'],
    ['/docs/basics/', 'lfdln-data-viewer .dv-table'],
    ['/docs/setup-file/', 'lfdln-data-viewer .dv-table'],
    ['/docs/server-pages/', 'lfdln-data-viewer .dv-table'],
    ['/docs/light-dark/', 'lfdln-data-viewer .dv-root'],
    ['/docs/menu/', 'lfdln-menu .lfdln-menu-button'],
    ['/docs/pagination/', 'lfdln-pagination .lfdln-pagination-nav'],
    ['/docs/card/', 'lfdln-card .lfdln-card-title'],
    ['/docs/search/', 'lfdln-search .lfdln-search-input'],
    ['/docs/filter/', 'lfdln-filter .lfdln-filter-button'],
    ['/docs/styling/', 'lfdln-data-viewer .dv-cards'],
  ];
  for (const [path, selector] of MOUNTS) {
    test(`${path} mounts the real component`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator(`[data-host] ${selector}`).first()).toBeVisible();
      await expect(page.locator('[data-status]')).toHaveCount(0);
      await expect(page.locator('[data-events]')).toBeVisible();
    });
  }

  test('rows show in the viewer', async ({ page }) => {
    await page.goto('/docs/basics/');
    await expect(page.locator('[data-host] .dv-table tbody tr')).toHaveCount(6);
    await expect(page.locator('[data-host] .dv-table')).toContainText('Foxglove');
  });

  test('Install has no demo: its first code tab is open, with Copy', async ({ page }) => {
    await page.goto('/docs/install/');
    await expect(page.getByRole('tab', { name: 'Demo' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('pre.code-view:visible')).toHaveText('npm i @lesfleursdelanuitdev/data-viewer');
    await expect(page.locator('[data-copy-code]')).toBeVisible();
  });

  test('a script that fails to load shows the explanation', async ({ page }) => {
    await page.route('**/js/data-viewer.standalone.js', (r) => r.abort());
    await page.goto('/docs/basics/');
    await expect(page.getByText('The live components didn’t load')).toBeVisible();
    await expect(page.locator('[data-events]')).toBeHidden();
  });
});

test.describe('panel', () => {
  test('code tabs switch, Copy copies and says Copied', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/docs/basics/');
    const copyBtn = page.locator('[data-copy-code]');
    await expect(copyBtn).toBeHidden();
    await page.getByRole('tab', { name: 'plants.json' }).click();
    await expect(page.getByRole('tab', { name: 'plants.json' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.demo')).toBeHidden();
    await expect(page.locator('[data-events]')).toBeHidden();
    await expect(page.locator('pre.code-view:visible')).toContainText('"Digitalis purpurea"');
    await copyBtn.click();
    await expect(copyBtn).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('"Digitalis purpurea"');
    await expect(copyBtn).toHaveText('Copy', { timeout: 3000 });
    // Arrow keys move between tabs.
    await page.getByRole('tab', { name: 'plants.json' }).press('ArrowLeft');
    await expect(page.getByRole('tab', { name: 'HTML' })).toBeFocused();
    await expect(page.locator('pre.code-view:visible')).toContainText('<lfdln-data-viewer label="Plants"');
    await page.getByRole('tab', { name: 'Demo' }).click();
    await expect(page.locator('.demo')).toBeVisible();
    await expect(copyBtn).toBeHidden();
  });

  test('the header pill copies the npm command', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/docs/menu/');
    const pill = page.locator('.npm-pill');
    await pill.click();
    await expect(pill).toContainText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npm i @lesfleursdelanuitdev/data-viewer');
  });

  test('the events strip fills after a click in the demo, and Clear empties it', async ({ page }) => {
    await page.goto('/docs/menu/');
    const events = page.locator('[data-events]');
    await expect(events).toContainText('Nothing yet');
    await page.locator('[data-host] .lfdln-menu-button').click();
    await page.getByRole('menuitem', { name: /Print the list/ }).click();
    await expect(events.locator('.event').first()).toContainText('menu-action');
    await expect(events.locator('.event').first()).toContainText('"id":"print"');
    await expect(events).toHaveClass(/has-events/);
    await events.getByRole('button', { name: 'Clear' }).click();
    await expect(events.locator('.event')).toHaveCount(0);
    await expect(events).toContainText('Nothing yet');
  });

  test('row actions show as events, shortened to the row name', async ({ page }) => {
    await page.goto('/docs/setup-file/');
    await page.locator('[data-host] .dv-row-menu button').first().click();
    await page.getByRole('menuitem', { name: /Care notes/ }).click();
    await expect(page.locator('.event').first()).toContainText('dv-action');
    await expect(page.locator('.event').first()).toContainText('"row":"Foxglove"');
  });

  test('card actions control changes the list', async ({ page }) => {
    await page.goto('/docs/setup-file/');
    const list = page.locator('[data-host] lfdln-data-viewer');
    await expect(list).toHaveJSProperty('cardActions', 'menu');
    await page.locator('.seg-opt', { hasText: 'Wrap' }).click();
    await expect(list).toHaveJSProperty('cardActions', 'wrap');
    await page.locator('.seg-opt', { hasText: 'Row' }).click();
    await expect(list).toHaveJSProperty('cardActions', 'row');
  });

  test('server pages: Loading… while it waits, the delay control, and Fail the next load', async ({ page }) => {
    await page.goto('/docs/server-pages/');
    const host = page.locator('[data-host]');
    await expect(host.locator('.dv-table tbody tr')).toHaveCount(10);
    await expect(page.locator('.event').first()).toContainText('load');
    await page.locator('.seg-opt', { hasText: '2.5 s' }).click();
    await host.getByRole('button', { name: /Next/ }).click();
    await expect(page.locator('[data-busy]')).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(page.locator('[data-busy]')).toBeVisible(); // still waiting: the 2.5 s answer is used
    await expect(page.locator('[data-busy]')).toBeHidden({ timeout: 4000 });
    await expect(host).toContainText('#1011');

    await page.locator('.seg-opt', { hasText: '0.3 s' }).click();
    await page.getByLabel('Fail the next load').check();
    await host.getByRole('button', { name: /Next/ }).click();
    await expect(host.locator('.dv-error')).toBeVisible();
    await expect(page.getByLabel('Fail the next load')).not.toBeChecked();
    await host.getByRole('button', { name: 'Try again' }).click();
    await expect(host.locator('.dv-error')).toHaveCount(0);
    await expect(host).toContainText('#1021');
  });

  test('light & dark: the colour scheme control sets the demo box', async ({ page }) => {
    await page.goto('/docs/light-dark/');
    const box = page.locator('[data-host] [data-scheme]');
    await expect(box).toHaveCSS('color-scheme', 'dark');
    // The list's own colours follow the box's color-scheme (light-dark() in its built-in look).
    const colour = () => page.locator('[data-host] .dv-root').evaluate((el) => getComputedStyle(el).color);
    const dark = await colour();
    await page.locator('.seg-opt', { hasText: 'Light' }).click();
    await expect(box).toHaveCSS('color-scheme', 'light');
    await expect.poll(colour).not.toBe(dark);
    await page.locator('.seg-opt', { hasText: 'Device' }).click();
    await expect(box).toHaveCSS('color-scheme', 'light dark');
  });
});

test.describe('navigation', () => {
  test('the sidebar marks the current page', async ({ page }) => {
    for (const [, address] of PAGES) {
      await page.goto(address);
      const current = page.locator('.d-side [aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveAttribute('href', address);
    }
  });

  test('Previous and Next follow the sidebar order', async ({ page }) => {
    await page.goto('/docs/');
    await expect(page.locator('.pn-prev')).toHaveCount(0);
    await page.locator('.pn-next').click();
    await expect(page).toHaveURL(/\/docs\/install\/$/);
    await page.goto('/docs/styling/');
    await expect(page.locator('.pn-next')).toHaveCount(0);
    await expect(page.locator('.pn-prev')).toHaveAttribute('href', '/docs/filter/');
  });

  test('on a phone the sidebar is a <select> that navigates', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/docs/basics/');
    await expect(page.locator('.d-side')).toBeHidden();
    const pick = page.getByLabel('Page', { exact: true });
    await expect(pick).toBeVisible();
    await expect(pick).toHaveValue('/docs/basics/');
    await pick.selectOption({ label: 'Parts · Card' });
    await expect(page).toHaveURL(/\/docs\/card\/$/);
    await expect(page.locator('h1')).toHaveText('Card');
  });

  test('landing: part cards go to their docs pages, hero tabs switch, npm Copy', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    const hrefs = await page.locator('.part-card').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual(['/docs/basics/', '/docs/menu/', '/docs/pagination/', '/docs/card/', '/docs/search/', '/docs/filter/']);
    await page.getByRole('tab', { name: 'app.js' }).click();
    await expect(page.locator('.code-panel pre:visible')).toContainText("import { define, configure }");
    const btn = page.locator('.npm-btn');
    await btn.click();
    await expect(btn).toContainText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npm i @lesfleursdelanuitdev/data-viewer');
  });
});
