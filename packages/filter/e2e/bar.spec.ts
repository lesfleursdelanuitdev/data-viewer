import { test, expect, type Page } from '@playwright/test';

// demo/bar.html loads only filter-bar.standalone.js. #b: <lfdln-filter-bar> with Kind (Flower 1,
// Foliage 1, Herb 2), Size (single choice: Small, Large) and In stock. window.events keeps every
// filter-change detail.
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: unknown[] }).events);

test.describe('<lfdln-filter-bar>', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('every change applies at once and fires filter-change', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(e.message));
    await page.goto('/bar.html');
    const b = page.locator('#b');
    await expect(b.getByRole('group', { name: 'Filter plants' })).toBeVisible();
    await b.locator('.lfdln-filter-pill[data-key="kind"]').click();
    await expect(b.getByRole('dialog', { name: 'Kind' })).toBeVisible();
    await b.getByRole('menuitemcheckbox', { name: /Herb/ }).click();
    expect(await events(page)).toEqual([{ value: { kind: ['Herb'] } }]);
    await b.getByRole('menuitemcheckbox', { name: /Flower/ }).click();
    expect((await events(page)).at(-1)).toEqual({ value: { kind: ['Herb', 'Flower'] } });
    await expect(b.locator('.lfdln-filter-pill[data-key="kind"]')).toHaveAccessibleName('Kind: Herb, Flower');
    // A single choice is round rows; picking replaces.
    await b.locator('.lfdln-filter-pill[data-key="size"]').click();
    await expect(b.getByRole('dialog', { name: 'Kind' })).toHaveCount(0);
    await b.getByRole('menuitemradio', { name: 'Small' }).click();
    await b.getByRole('menuitemradio', { name: 'Large' }).click();
    expect((await events(page)).at(-1)).toEqual({ value: { kind: ['Herb', 'Flower'], size: ['l'] } });
    await page.keyboard.press('Escape');
    await expect(b.locator('.lfdln-filter-pill[data-key="size"]')).toBeFocused();
    // In stock toggles; Clear all clears.
    await b.getByRole('button', { name: 'In stock' }).click();
    expect((await events(page)).at(-1)).toEqual({ value: { kind: ['Herb', 'Flower'], size: ['l'], stock: true } });
    await b.getByRole('button', { name: 'Clear all' }).click();
    expect((await events(page)).at(-1)).toEqual({ value: {} });
    await expect(b.getByRole('button', { name: 'Clear all' })).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('arrow keys move between a menu\'s rows', async ({ page }) => {
    await page.goto('/bar.html');
    const b = page.locator('#b');
    await b.locator('.lfdln-filter-pill[data-key="kind"]').click();
    await page.keyboard.press('ArrowDown');
    await expect(b.locator('.lfdln-filter-check-row[data-value="Flower"]')).toBeFocused();
    await page.keyboard.press('End');
    await expect(b.locator('.lfdln-filter-check-row[data-value="Herb"]')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(b.locator('.lfdln-filter-check-row[data-value="Foliage"]')).toBeFocused();
    await page.keyboard.press('Space');
    expect(await events(page)).toEqual([{ value: { kind: ['Foliage'] } }]);
  });
});
