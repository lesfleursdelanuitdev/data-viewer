import { test, expect, type Locator, type Page } from '@playwright/test';

// demo/index.html loads only the standalone script. #f is a filter over orders: Status (12
// options with counts, Lost has count 0), Owner (a single choice), Price (money in euros, with
// quick ranges), Planted (dates, with a "1900s" quick range) and Organic (yes / no).
// <lfdln-filter-chips for="f"> shows its applied filters. window.events keeps every
// filter-change detail.
type Value = Record<string, unknown>;
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: { value: Value }[] }).events);
const button = (page: Page) => page.locator('#f .lfdln-filter-button');
const label = (page: Page) => page.locator('#f .lfdln-filter-button-text');
const dialog = (page: Page) => page.locator('#f [role=dialog]');
const row = (page: Page, name: string) => dialog(page).locator('.lfdln-filter-row', { hasText: name });
const option = (page: Page, name: string) => dialog(page).getByRole('option', { name, exact: false });
const apply = (page: Page) => dialog(page).getByRole('button', { name: 'Apply filter' });
const selected = (o: Locator) => o.getAttribute('aria-selected');

async function open(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('/');
  await expect(button(page)).toBeVisible();
  return problems;
}

async function applyShippedPending(page: Page) {
  await button(page).click();
  await option(page, 'Shipped').click();
  await option(page, 'Pending').click();
  await apply(page).click();
  await expect(dialog(page)).toHaveCount(0);
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('the button reads "Filter" and opens a dialog with the sections and "No filters yet"', async ({ page }) => {
    const problems = await open(page);
    await expect(label(page)).toHaveText('Filter');
    await expect(button(page)).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(button(page)).toHaveAttribute('aria-expanded', 'false');
    await button(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toHaveAccessibleName('Filter orders');
    await expect(button(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(dialog(page).locator('.lfdln-filter-row-label')).toHaveText(['Status', 'Owner', 'Price', 'Planted', 'Organic']);
    await expect(row(page, 'Owner').locator('.lfdln-filter-row-summary')).toHaveText('Any');
    await expect(dialog(page)).toContainText('No filters yet');
    const box = (await dialog(page).boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(42 * 16 + 1);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(1280);
    await expect(page.locator('#lfdln-filter-style')).toHaveCount(1);
    expect(problems).toEqual([]);
  });

  test('ticking stays in the draft; Apply fires once, closes and sums up on the button', async ({ page }) => {
    await open(page);
    await button(page).click();
    await option(page, 'Shipped').click();
    await option(page, 'Pending').click();
    await expect(dialog(page).locator('.lfdln-filter-chip')).toHaveText(['Shipped', 'Pending']);
    await expect(row(page, 'Status').locator('.lfdln-filter-row-summary')).toHaveText('Shipped, Pending');
    expect(await events(page)).toEqual([]);
    await apply(page).click();
    expect(await events(page)).toEqual([{ value: { status: ['shipped', 'pending'] } }]);
    await expect(dialog(page)).toHaveCount(0);
    await expect(button(page)).toBeFocused();
    await expect(label(page)).toHaveText('Shipped, Pending');
  });

  const ways: [string, (page: Page) => Promise<void>][] = [
    ['Esc', (page) => page.keyboard.press('Escape')],
    ['×', (page) => dialog(page).getByRole('button', { name: 'Close' }).click()],
    ['Cancel', (page) => dialog(page).getByRole('button', { name: 'Cancel' }).click()],
    ['a click outside', (page) => page.mouse.click(1200, 850)],
  ];
  for (const [way, close] of ways) {
    test(`${way} cancels: no event, value kept, reopening shows the applied state`, async ({ page }) => {
      await open(page);
      await applyShippedPending(page);
      await button(page).click();
      await option(page, 'Lost').click();
      await option(page, 'Shipped').click();
      await close(page);
      await expect(dialog(page)).toHaveCount(0);
      expect(await events(page)).toHaveLength(1);
      await expect(label(page)).toHaveText('Shipped, Pending');
      expect(await page.evaluate(() => (document.querySelector('#f') as unknown as { value: Value }).value)).toEqual({ status: ['shipped', 'pending'] });
      await button(page).click();
      expect(await selected(option(page, 'Shipped'))).toBe('true');
      expect(await selected(option(page, 'Pending'))).toBe('true');
      expect(await selected(option(page, 'Lost'))).toBe('false');
    });
  }

  test('a long list gets a search box; "Nothing matches" and its link clear it', async ({ page }) => {
    await open(page);
    await button(page).click();
    const search = dialog(page).getByRole('searchbox', { name: 'Search status' });
    await expect(search).toBeVisible();
    await search.fill('ship');
    await expect(dialog(page).getByRole('option')).toHaveCount(1);
    await search.fill('zz');
    await expect(dialog(page)).toContainText('Nothing matches');
    await expect(dialog(page).getByRole('option')).toHaveCount(0);
    await dialog(page).locator('.lfdln-filter-empty').getByRole('button').click();
    await expect(search).toHaveValue('');
    await expect(dialog(page).getByRole('option')).toHaveCount(12);
    await row(page, 'Owner').click();
    await expect(dialog(page).getByRole('searchbox')).toHaveCount(0);
    await expect(dialog(page).getByRole('listbox')).not.toHaveAttribute('aria-multiselectable', 'true');
  });

  test('options with count 0 are muted but can be ticked', async ({ page }) => {
    await open(page);
    await button(page).click();
    const lost = option(page, 'Lost');
    await expect(lost).toHaveClass(/lfdln-filter-zero/);
    await expect(lost.locator('.lfdln-filter-count')).toHaveText('0');
    await expect(option(page, 'Shipped').locator('.lfdln-filter-count')).toHaveText('12');
    await lost.click();
    expect(await selected(lost)).toBe('true');
    await expect(dialog(page).getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
  });

  test('money range: a quick range sets From and To; To below From swaps on Apply', async ({ page }) => {
    await open(page);
    await button(page).click();
    await row(page, 'Price').click();
    const from = dialog(page).getByRole('textbox', { name: 'From' });
    const to = dialog(page).getByRole('textbox', { name: 'To' });
    await expect(from).toHaveAttribute('inputmode', 'decimal');
    await dialog(page).getByRole('button', { name: '€10 to €50', exact: true }).click();
    await expect(from).toHaveValue('10');
    await expect(to).toHaveValue('50');
    await expect(dialog(page).getByRole('button', { name: '€10 to €50', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(row(page, 'Price').locator('.lfdln-filter-row-summary')).toHaveText('€10 to €50');
    await from.fill('80');
    await to.fill('20');
    await apply(page).click();
    expect(await events(page)).toEqual([{ value: { price: { from: '20', to: '80' } } }]);
    await expect(label(page)).toHaveText('€20–€80');
  });

  test('date range takes a year and month', async ({ page }) => {
    await open(page);
    await button(page).click();
    await row(page, 'Planted').click();
    const from = dialog(page).getByRole('textbox', { name: 'From' });
    await expect(from).toHaveAttribute('type', 'text');
    await from.fill('1950-06');
    await apply(page).click();
    expect(await events(page)).toEqual([{ value: { planted: { from: '1950-06' } } }]);
    await expect(page.locator('#chips .lfdln-filter-chip')).toHaveText(['Planted: From 1950-06']);
  });

  test('bool: Any, Yes, No', async ({ page }) => {
    await open(page);
    await button(page).click();
    await row(page, 'Organic').click();
    await expect(dialog(page).getByRole('radio', { name: 'Any' })).toBeChecked();
    await dialog(page).getByRole('radio', { name: 'Yes' }).check();
    await apply(page).click();
    await button(page).click();
    await row(page, 'Organic').click();
    await expect(dialog(page).getByRole('radio', { name: 'Yes' })).toBeChecked();
    await dialog(page).getByRole('radio', { name: 'No' }).check();
    await apply(page).click();
    await button(page).click();
    await row(page, 'Organic').click();
    await dialog(page).getByRole('radio', { name: 'Any' }).check();
    await apply(page).click();
    expect(await events(page)).toEqual([{ value: { organic: true } }, { value: { organic: false } }, { value: {} }]);
  });

  test('"Clear all" applies at once', async ({ page }) => {
    await open(page);
    await applyShippedPending(page);
    await button(page).click();
    await dialog(page).getByRole('button', { name: 'Clear all' }).click();
    expect(await events(page)).toEqual([{ value: { status: ['shipped', 'pending'] } }, { value: {} }]);
    await expect(label(page)).toHaveText('Filter');
    await expect(dialog(page)).toContainText('No filters yet');
  });

  test('keyboard: into the dialog, Space toggles options, arrows move, Esc goes back to the button', async ({ page }) => {
    await open(page);
    await button(page).focus();
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeVisible();
    const inDialog = () => page.evaluate(() => Boolean(document.activeElement?.closest('#f [role=dialog]')));
    expect(await inDialog()).toBe(true);
    await page.keyboard.press('Tab');
    expect(await inDialog()).toBe(true);
    await option(page, 'Shipped').focus();
    await page.keyboard.press('Space');
    expect(await selected(option(page, 'Shipped'))).toBe('true');
    await page.keyboard.press('ArrowDown');
    await expect(option(page, 'Pending')).toBeFocused();
    await page.keyboard.press('Space');
    expect(await selected(option(page, 'Pending'))).toBe('true');
    await page.keyboard.press('End');
    await expect(dialog(page).getByRole('option').last()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
    await expect(button(page)).toBeFocused();
    expect(await events(page)).toEqual([]);
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });
  const sheet = (page: Page) => page.locator('#f dialog.lfdln-filter-sheet');

  test('a bottom sheet, modal, with focus kept inside', async ({ page }) => {
    const problems = await open(page);
    await button(page).click();
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page)).toHaveAttribute('aria-modal', 'true');
    await expect(sheet(page)).toHaveAccessibleName('Filter orders');
    const box = (await sheet(page).boundingBox())!;
    expect(box.y + box.height).toBeGreaterThan(799); // at the bottom
    expect(box.width).toBeGreaterThan(389);
    const inside = () => page.evaluate(() => Boolean(document.activeElement?.closest('#f dialog.lfdln-filter-sheet')));
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      expect(await inside()).toBe(true);
    }
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(await inside()).toBe(true);
    }
    expect(problems).toEqual([]);
  });

  test('a row opens its own screen with Back; Clear empties the draft only', async ({ page }) => {
    await open(page);
    await button(page).click();
    await row(page, 'Status').click();
    await expect(sheet(page).getByRole('button', { name: 'Back' })).toBeFocused();
    await expect(sheet(page).getByRole('heading', { name: 'Status' })).toBeVisible();
    await option(page, 'Shipped').click();
    await sheet(page).getByRole('button', { name: 'Back' }).click();
    await expect(row(page, 'Status')).toBeFocused();
    await expect(row(page, 'Status').locator('.lfdln-filter-row-summary')).toHaveText('Shipped');
    await sheet(page).getByRole('button', { name: 'Apply filter' }).click();
    expect(await events(page)).toEqual([{ value: { status: ['shipped'] } }]);
    await expect(sheet(page)).toHaveCount(0);
    await expect(button(page)).toBeFocused();

    await button(page).click();
    await sheet(page).getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(row(page, 'Status').locator('.lfdln-filter-row-summary')).toHaveText('Any');
    await expect(sheet(page)).toContainText('No filters yet');
    expect(await events(page)).toHaveLength(1);
    await sheet(page).getByRole('button', { name: 'Close' }).click();
    await button(page).click();
    await expect(row(page, 'Status').locator('.lfdln-filter-row-summary')).toHaveText('Shipped');
  });

  test('the footer is sticky and its buttons at least 48px high; Esc and the backdrop cancel', async ({ page }) => {
    await open(page);
    await button(page).click();
    for (const name of ['Clear', 'Apply filter']) {
      const b = (await sheet(page).getByRole('button', { name, exact: true }).boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(48);
    }
    await row(page, 'Status').click();
    const footer = (await sheet(page).locator('.lfdln-filter-footer').boundingBox())!;
    const s = (await sheet(page).boundingBox())!;
    expect(Math.abs(footer.y + footer.height - (s.y + s.height))).toBeLessThan(2);
    await option(page, 'Lost').click();
    await page.keyboard.press('Escape');
    await expect(sheet(page)).toHaveCount(0);
    await button(page).click();
    await page.mouse.click(200, 10); // the dim backdrop above the sheet
    await expect(sheet(page)).toHaveCount(0);
    expect(await events(page)).toEqual([]);
    const scrolls = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(scrolls).toBe(false);
  });
});

test.describe('chips', () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  const chips = (page: Page) => page.locator('#chips .lfdln-filter-chip');

  test('nothing when empty; one chip per option and "Clear all" at two or more', async ({ page }) => {
    await open(page);
    await expect(page.locator('#chips')).toBeEmpty();
    await applyShippedPending(page);
    await expect(chips(page)).toHaveText(['Shipped', 'Pending']);
    const clearAll = page.locator('#chips').getByRole('button', { name: 'Clear all' });
    await expect(clearAll).toBeVisible();
    await page.locator('#chips').getByRole('button', { name: 'Remove Shipped' }).click();
    expect((await events(page)).at(-1)).toEqual({ value: { status: ['pending'] } });
    await expect(chips(page)).toHaveText(['Pending']);
    await expect(clearAll).toHaveCount(0);
    await expect(label(page)).toHaveText('Pending');
    await expect(page.locator('#chips').getByRole('button', { name: 'Remove Pending' })).toBeFocused();
  });

  test('"Clear all" in the chips applies an empty filter', async ({ page }) => {
    await open(page);
    await applyShippedPending(page);
    await page.locator('#chips').getByRole('button', { name: 'Clear all' }).click();
    expect((await events(page)).at(-1)).toEqual({ value: {} });
    await expect(page.locator('#chips')).toBeEmpty();
    await expect(button(page)).toBeFocused();
  });

  test('a value naming an option that no longer exists still shows, and can be removed', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { (document.querySelector('#f') as unknown as { value: Value }).value = { status: ['archived'] }; });
    await expect(chips(page)).toHaveText(['archived']);
    await expect(label(page)).toHaveText('archived');
    await page.locator('#chips').getByRole('button', { name: 'Remove archived' }).click();
    expect(await events(page)).toEqual([{ value: {} }]);
    await expect(page.locator('#chips')).toBeEmpty();
  });
});
