import { test, expect, type Page } from '@playwright/test';

// demo/panel.html loads only filter-panel.standalone.js. #p: <lfdln-filter-panel> over four
// plants (Kind: Flower 1, Foliage 1, Herb 2; Size, single choice; In stock, 3 of 4) with a
// countFor that counts them; #q: the same sections with no countFor. window.events keeps every
// filter-change detail, with the element's id.
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: unknown[] }).events);

test.describe('<lfdln-filter-panel>', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('countFor counts the draft; Show applies and fires filter-change', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(e.message));
    await page.goto('/panel.html');
    const p = page.locator('#p');
    await p.locator('.lfdln-filter-trigger').click();
    await expect(p.getByRole('dialog', { name: 'Filter plants' })).toBeVisible();
    await expect(p.locator('.lfdln-filter-show')).toHaveText('Show 4 results');
    await p.locator('.lfdln-filter-toggle[data-value="Herb"]').click();
    await expect(p.locator('.lfdln-filter-show')).toHaveText('Show 2 results');
    await p.getByRole('switch', { name: 'In stock' }).click();
    await expect(p.locator('.lfdln-filter-show')).toHaveText('Show 1 result');
    // A single choice of 2 is a segmented control.
    await p.getByRole('radiogroup', { name: 'Size' }).getByRole('radio', { name: 'Small' }).click();
    expect(await events(page)).toEqual([]);
    await p.locator('.lfdln-filter-show').click();
    await expect(p.getByRole('dialog')).toHaveCount(0);
    expect(await events(page)).toEqual([{ id: 'p', value: { kind: ['Herb'], stock: true, size: ['s'] } }]);
    await expect(p.locator('.lfdln-filter-badge')).toHaveText('3');
    // × on a chip applies at once.
    await p.getByRole('button', { name: 'Remove Herb' }).click();
    expect((await events(page)).at(-1)).toEqual({ id: 'p', value: { stock: true, size: ['s'] } });
    expect(problems).toEqual([]);
  });

  test('without countFor it says "Show results"', async ({ page }) => {
    await page.goto('/panel.html');
    const q = page.locator('#q');
    await q.locator('.lfdln-filter-trigger').click();
    await q.locator('.lfdln-filter-toggle[data-value="Herb"]').click();
    await expect(q.locator('.lfdln-filter-show')).toHaveText('Show results');
    // Opening another panel closes this one: one open per page.
    await page.locator('#p .lfdln-filter-trigger').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#p [role=dialog]')).toBeVisible();
    await expect(q.locator('[role=dialog]')).toHaveCount(0);
  });
});
