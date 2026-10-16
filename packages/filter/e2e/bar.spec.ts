import { test, expect, type Page } from '@playwright/test';

// demo/bar.html loads only filter-bar.standalone.js. #b: <lfdln-filter-bar> with Kind (Flower 1,
// Foliage 1, Herb 2), Size (single choice: Small, Large), In stock, Colour (single choice, 10
// options, so it has the option search) and Height (a number range with no named ranges: the From
// and To boxes). window.events keeps every filter-change detail.
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: unknown[] }).events);

test.describe('<lfdln-filter-bar>', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('every change applies at once and fires filter-change', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(e.message));
    await page.goto('/bar.html');
    const b = page.locator('#b');
    await expect(b.getByRole('group', { name: 'Filter plants' })).toBeVisible();
    await b.locator('.lfdln-filter-bar-pill[data-key="kind"]').click();
    await expect(b.getByRole('dialog', { name: 'Kind' })).toBeVisible();
    await b.getByRole('checkbox', { name: /Herb/ }).click();
    expect(await events(page)).toEqual([{ value: { kind: ['Herb'] } }]);
    await b.getByRole('checkbox', { name: /Flower/ }).click();
    expect((await events(page)).at(-1)).toEqual({ value: { kind: ['Herb', 'Flower'] } });
    await expect(b.locator('.lfdln-filter-bar-pill[data-key="kind"]')).toHaveAccessibleName('Kind: Herb, Flower');
    // A single choice is round rows; picking replaces.
    await b.locator('.lfdln-filter-bar-pill[data-key="size"]').click();
    await expect(b.getByRole('dialog', { name: 'Kind' })).toHaveCount(0);
    await b.getByRole('radio', { name: 'Small' }).click();
    await b.getByRole('radio', { name: 'Large' }).click();
    expect((await events(page)).at(-1)).toEqual({ value: { kind: ['Herb', 'Flower'], size: ['l'] } });
    await page.keyboard.press('Escape');
    await expect(b.locator('.lfdln-filter-bar-pill[data-key="size"]')).toBeFocused();
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
    await b.locator('.lfdln-filter-bar-pill[data-key="kind"]').click();
    await page.keyboard.press('ArrowDown');
    await expect(b.locator('.lfdln-filter-check-row[data-value="Flower"]')).toBeFocused();
    await page.keyboard.press('End');
    await expect(b.locator('.lfdln-filter-check-row[data-value="Herb"]')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(b.locator('.lfdln-filter-check-row[data-value="Foliage"]')).toBeFocused();
    await page.keyboard.press('Space');
    expect(await events(page)).toEqual([{ value: { kind: ['Foliage'] } }]);
  });

  test('a single choice is a radio group with one tab stop; arrows move and pick', async ({ page }) => {
    await page.goto('/bar.html');
    const b = page.locator('#b');
    await b.locator('.lfdln-filter-bar-pill[data-key="size"]').click();
    const size = b.getByRole('radiogroup', { name: 'Size' });
    await expect(size.getByRole('radio')).toHaveCount(2);
    expect(await size.getByRole('radio').evaluateAll((els) => els.map((el) => el.getAttribute('tabindex')))).toEqual(['0', '-1']);
    // Down from the menu goes to the group's tab stop; arrows then move and pick, as radios do.
    await page.keyboard.press('ArrowDown');
    await expect(size.getByRole('radio', { name: 'Small' })).toBeFocused();
    expect(await events(page)).toEqual([]);
    await page.keyboard.press('ArrowDown');
    await expect(size.getByRole('radio', { name: 'Large' })).toBeFocused();
    await expect(size.getByRole('radio', { name: 'Large' })).toHaveAttribute('aria-checked', 'true');
    expect(await events(page)).toEqual([{ value: { size: ['l'] } }]);
    // The picked one is now the tab stop.
    expect(await size.getByRole('radio').evaluateAll((els) => els.map((el) => el.getAttribute('tabindex')))).toEqual(['-1', '0']);
  });

  test('Up from the first radio goes back to the option search, picking nothing', async ({ page }) => {
    await page.goto('/bar.html');
    const b = page.locator('#b');
    await b.locator('.lfdln-filter-bar-pill[data-key="colour"]').click();
    const search = b.getByRole('searchbox', { name: 'Search colour' });
    const colour = b.getByRole('radiogroup', { name: 'Colour' });
    await expect(colour.getByRole('radio')).toHaveCount(10);
    await search.focus();
    await page.keyboard.press('ArrowDown');
    await expect(colour.getByRole('radio', { name: 'Red' })).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(search).toBeFocused();
    await expect(colour.getByRole('radio', { name: 'Pink' })).toHaveAttribute('aria-checked', 'false');
    expect(await events(page)).toEqual([]);
    // Elsewhere the arrows still move and pick, and wrap at the end.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    await expect(colour.getByRole('radio', { name: 'Pink' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(colour.getByRole('radio', { name: 'Red' })).toBeFocused();
    expect((await events(page)).at(-1)).toEqual({ value: { colour: ['Red'] } });
  });
});
