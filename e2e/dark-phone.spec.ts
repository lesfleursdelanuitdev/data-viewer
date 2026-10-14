import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Dark mode and phone width, plus screenshots of each state for momolig in test-results/shots/
// (gitignored). The defaults checked here are the ones in src/element/styles.ts.
const SHOTS = 'test-results/shots';
mkdirSync(SHOTS, { recursive: true });

const defaults = {
  light: { bg: 'rgb(255, 255, 255)', text: 'rgb(29, 29, 32)' },
  dark: { bg: 'rgb(23, 23, 26)', text: 'rgb(236, 236, 240)' },
};
const widths = { desktop: 1280, phone: 390 };

const rootColours = (page: Page, id: string) =>
  page.locator(`#${id} .dv-root`).evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, text: s.color };
  });

// No sideways scroll on the page itself: a wide table scrolls inside its own box.
const pageWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);

for (const scheme of ['light', 'dark'] as const) {
  for (const [size, width] of Object.entries(widths)) {
    test.describe(`${scheme}, ${width}px`, () => {
      test.use({ colorScheme: scheme, viewport: { width, height: size === 'phone' ? 844 : 900 } });
      const name = (what: string) => `${SHOTS}/${scheme}-${width}-${what}.png`;

      test('colours, width, table and cards', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#things .dv-card')).toHaveCount(3);
        expect(await rootColours(page, 'local')).toEqual(defaults[scheme]);
        expect(await rootColours(page, 'things')).toEqual(defaults[scheme]);
        if (size === 'phone') {
          expect(await pageWidth(page)).toBeLessThanOrEqual(width);
          // Phones get cards unless the page asks for a table.
          await expect(page.locator('#local .dv-cards')).toBeVisible();
        }
        await page.screenshot({ path: name('page'), fullPage: false });
        await page.locator('#things-table').screenshot({ path: name('table') });
        await page.locator('#things').screenshot({ path: name('cards') });
      });

      test('an open menu', async ({ page }) => {
        await page.goto('/');
        const card = page.locator('#things .dv-card').nth(1);
        await card.locator('.dv-card-head button[aria-haspopup=menu]').click();
        const menu = card.locator('.dv-menu');
        await expect(menu).toBeVisible();
        if (size === 'phone') {
          const box = (await menu.boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
        }
        await page.screenshot({ path: name('menu') });
      });

      test('the error box', async ({ page, context }) => {
        await page.goto('/adapters.html');
        await expect(page.locator('#flaky tbody tr')).toHaveCount(20);
        await context.addCookies([{ name: 'dv-fail', value: '1', url: 'http://localhost:4179' }]);
        await page.locator('#flaky input[type=search]').fill('lemon');
        const box = page.locator('#flaky .dv-error');
        await expect(box).toBeVisible();
        if (size === 'phone') expect(await pageWidth(page)).toBeLessThanOrEqual(width);
        await page.locator('#flaky').screenshot({ path: name('error') });
      });

      test('HTML only', async ({ page }) => {
        await page.goto('/html-only.html');
        await expect(page.locator('#b .dv-card')).toHaveCount(4);
        expect(await rootColours(page, 'a')).toEqual(defaults[scheme]);
        if (size === 'phone') expect(await pageWidth(page)).toBeLessThanOrEqual(width);
        await page.screenshot({ path: name('html-only'), fullPage: true });
      });
    });
  }
}
