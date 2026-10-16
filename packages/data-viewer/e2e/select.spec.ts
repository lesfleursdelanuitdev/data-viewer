import { test, expect, type Page } from '@playwright/test';

// demo/select.html, with the select add-on: #table (54 rows, 20 per page, phone-layout="table"),
// #cards (built-in cards, open-event), #tpl (cardTemplate), #mount (cardMount), #compact (5 rows),
// #nokey (two rows and one with no id). window.events collects { type, detail } for each
// dv-select, dv-open and dv-batch. demo/select-late.html: #late, the add-on imported after 300 ms.
test.use({ viewport: { width: 1280, height: 900 } });

const NO_KEY = 'lfdln-data-viewer: some rows have no key (row-key="id"), so they can\'t be ticked.';
type Ev = { type: string; detail: unknown };
const events = (page: Page, type: string) =>
  page.evaluate((t) => (window as unknown as { events: Ev[] }).events.filter((e) => e.type === t), type);

async function open(page: Page) {
  const warnings: string[] = [];
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
  await page.goto('/select.html');
  await expect(page.locator('#table tbody .dv-select-box')).toHaveCount(20);
  return warnings;
}
const rowBox = (page: Page, list: string, name: string) =>
  page.locator(`#${list}`).getByRole('checkbox', { name: `Select ${name}`, exact: true });
const row = (page: Page, name: string) =>
  page.locator('#table tbody tr').filter({ has: page.getByRole('checkbox', { name: `Select ${name}`, exact: true }) });

test.describe('boxes and the bar', () => {
  test('each row has a box named "Select {name}"; ticking marks the row', async ({ page }) => {
    await open(page);
    await rowBox(page, 'table', 'Rose 1').check();
    await expect(row(page, 'Rose 1')).toHaveClass(/\bdv-selected\b/);
    await expect(row(page, 'Rose 1')).toHaveAttribute('aria-selected', 'true');
    await expect(row(page, 'Fern 1')).not.toHaveAttribute('aria-selected', /./);
    // The box is a label around a real check box.
    await expect(page.locator('#table tbody tr').first().locator('label.dv-select-hit > input.dv-select-box[type=checkbox]')).toHaveCount(1);
  });

  test('the header box is tri-state', async ({ page }) => {
    await open(page);
    const all = page.locator('#table').getByRole('checkbox', { name: 'Select all on this page', exact: true });
    await expect(all).toHaveCount(1);
    await rowBox(page, 'table', 'Rose 1').check();
    await expect(all).toHaveAttribute('aria-checked', 'mixed');
    expect(await all.evaluate((b: HTMLInputElement) => b.indeterminate)).toBe(true);
    await all.click();
    await expect(page.locator('#table tbody tr.dv-selected')).toHaveCount(20);
    await expect(all).toBeChecked();
    expect(await all.evaluate((b: HTMLInputElement) => b.indeterminate)).toBe(false);
    await expect(all).not.toHaveAttribute('aria-checked', /./);
    await all.click();
    await expect(page.locator('#table tbody tr.dv-selected')).toHaveCount(0);
    await expect(page.locator('#table .dv-select-bar')).toHaveCount(0);
    await expect(all).not.toBeChecked();
  });

  test('the bar replaces the search bar while anything is ticked', async ({ page }) => {
    await open(page);
    for (const n of ['Rose 1', 'Fern 1', 'Mint 1']) await rowBox(page, 'table', n).check();
    const count = page.locator('#table .dv-select-bar[role=toolbar] .dv-select-count[role=status]');
    await expect(count).toHaveText('3 selected');
    await expect(count).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#table .dv-select-bar')).toHaveAttribute('aria-label', '3 selected');
    await expect(page.locator('#table .dv-bar')).toHaveCount(0);
    const clear = page.locator('#table .dv-select-bar').getByRole('button', { name: 'Clear selection' });
    await expect(clear).toHaveText('✕');
    await clear.click();
    await expect(page.locator('#table .dv-select-bar')).toHaveCount(0);
    await expect(page.locator('#table .dv-bar')).toHaveCount(1);
    await expect(page.locator('#table tbody .dv-select-box').first()).toBeFocused();
    await expect(page.locator('#table tbody tr.dv-selected')).toHaveCount(0);
  });

  test('Esc in the bar clears the selection and focuses the first row box', async ({ page }) => {
    await open(page);
    await rowBox(page, 'table', 'Fern 1').check();
    await rowBox(page, 'table', 'Mint 1').check();
    await page.locator('#table .dv-select-clear').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('#table .dv-select-bar')).toHaveCount(0);
    await expect(page.locator('#table tbody tr.dv-selected')).toHaveCount(0);
    await expect(page.locator('#table tbody .dv-select-box').first()).toBeFocused();
    expect((await events(page, 'dv-select')).at(-1)).toEqual({ type: 'dv-select', detail: { keys: [], all: false, except: [] } });
  });

  test('paging keeps ticks, and they show again on return', async ({ page }) => {
    await open(page);
    await rowBox(page, 'table', 'Rose 1').check();
    await page.locator('#table').getByRole('button', { name: 'Next' }).click();
    await expect(rowBox(page, 'table', 'Rose 5')).toBeVisible();
    await rowBox(page, 'table', 'Rose 5').check();
    await expect(page.locator('#table tbody tr.dv-selected')).toHaveCount(1);
    await expect(page.locator('#table .dv-select-count')).toHaveText('2 selected');
    await page.locator('#table').getByRole('button', { name: 'Previous' }).click();
    await expect(rowBox(page, 'table', 'Rose 1')).toBeChecked();
    await expect(row(page, 'Rose 1')).toHaveClass(/\bdv-selected\b/);
    await expect(page.locator('#table tbody tr.dv-selected')).toHaveCount(1);
  });

  test('sorting keeps ticks', async ({ page }) => {
    await open(page);
    await rowBox(page, 'table', 'Fern 1').check();
    await page.locator('#table thead').getByRole('button', { name: 'Name' }).click();
    await expect(page.locator('#table thead th[aria-sort=ascending]')).toHaveCount(1);
    await expect(page.locator('#table tbody tr').first()).toContainText('Basil 1');
    // Fern 1 moved from the 2nd row to the 10th, and is still the one ticked.
    await expect(page.locator('#table tbody tr').nth(9)).toContainText('Fern 1');
    await expect(page.locator('#table tbody tr').nth(9)).toHaveClass(/\bdv-selected\b/);
    await expect(rowBox(page, 'table', 'Fern 1')).toBeChecked();
    await expect(page.locator('#table tbody tr.dv-selected')).toHaveCount(1);
    await expect(page.locator('#table tbody .dv-select-box:checked')).toHaveCount(1);
  });

  test('a page\'s own words win', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      (document.getElementById('table') as HTMLElement & { words: object }).words = { selectedCount: (n: string) => `${n} chosen` };
    });
    await rowBox(page, 'table', 'Rose 1').check();
    await rowBox(page, 'table', 'Fern 1').check();
    await expect(page.locator('#table .dv-select-count')).toHaveText('2 chosen');
    // The other words are still the add-on's.
    await expect(rowBox(page, 'table', 'Mint 1')).toHaveCount(1);
  });

  test('a row without a key gets a disabled box, and one warning', async ({ page }) => {
    const warnings = await open(page);
    await expect(rowBox(page, 'nokey', 'No id')).toBeDisabled();
    await expect(rowBox(page, 'nokey', 'Rose 1')).toBeEnabled();
    await rowBox(page, 'table', 'Rose 1').check(); // more drawings, still one warning
    await page.waitForTimeout(100);
    expect(warnings.filter((w) => w === NO_KEY)).toHaveLength(1);
  });
});

test.describe('cards', () => {
  test('a card\'s box sits in its head; tapping the box ticks, tapping elsewhere opens', async ({ page }) => {
    await open(page);
    const card = page.locator('#cards li.lfdln-card').first();
    await expect(page.locator('#cards .lfdln-card-head > .dv-select-hit').first()).toBeVisible();
    expect(await card.locator('.lfdln-card-head').evaluate((h) => h.firstElementChild?.className)).toBe('dv-select-hit');
    // A real click on the box (Playwright checks nothing covers it: the title's ::after doesn't).
    await card.locator('.dv-select-box').click();
    await expect(card).toHaveClass(/\bdv-selected\b/);
    await expect(card.locator('.dv-select-box')).toBeChecked();
    expect(await events(page, 'dv-open')).toEqual([]);
    const body = (await card.locator('.lfdln-card-body').boundingBox())!;
    await page.mouse.click(body.x + body.width / 2, body.y + body.height / 2);
    await expect.poll(async () => (await events(page, 'dv-open')).length).toBe(1);
    await expect(card).toHaveClass(/\bdv-selected\b/);
  });

  for (const id of ['tpl', 'mount']) {
    test(`custom cards get the box from the viewer (#${id}); tapping the box ticks, the card opens`, async ({ page }) => {
      await open(page);
      const card = page.locator(`#${id} li.dv-card-custom`).first();
      await expect(card.locator(':scope > .dv-select-slot .dv-select-box')).toHaveCount(1);
      await expect(page.locator(`#${id} li > .dv-select-slot .dv-select-box`)).toHaveCount(20);
      await card.locator('.dv-select-box').click();
      await expect(card).toHaveClass(/\bdv-selected\b/);
      expect(await events(page, 'dv-open')).toEqual([]);
      const kind = (await card.locator(`.${id}-kind`).boundingBox())!;
      await page.mouse.click(kind.x + kind.width / 2, kind.y + kind.height / 2);
      await expect.poll(async () => (await events(page, 'dv-open')).length).toBe(1);
      await card.locator('.dv-select-box').click();
      await expect(card).not.toHaveClass(/\bdv-selected\b/);
      expect(await events(page, 'dv-open')).toHaveLength(1);
    });
  }

  test('a compact list shows the boxes and the bar', async ({ page }) => {
    await open(page);
    await expect(page.locator('#compact tbody .dv-select-box')).toHaveCount(5);
    await rowBox(page, 'compact', 'Rose 1').check();
    await expect(page.locator('#compact .dv-select-count')).toHaveText('1 selected');
    // Drawn above the list.
    const bar = (await page.locator('#compact .dv-select-bar').boundingBox())!;
    const table = (await page.locator('#compact .dv-table').boundingBox())!;
    expect(bar.y + bar.height).toBeLessThanOrEqual(table.y);
  });
});

test('the add-on loaded later draws the boxes', async ({ page }) => {
  await page.goto('/select-late.html');
  await expect(page.locator('#late tbody tr')).toHaveCount(20);
  await expect(page.locator('#late .dv-select-box')).toHaveCount(21);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('on a phone the table\'s box column is 44 px wide and each box\'s target is at least 44 px', async ({ page }) => {
    await open(page);
    const th = (await page.locator('#table thead th.dv-select-cell').boundingBox())!;
    expect(Math.round(th.width)).toBe(44);
    const td = (await page.locator('#table tbody td.dv-select-cell').first().boundingBox())!;
    expect(Math.round(td.width)).toBe(44);
    const hits = page.locator('#table .dv-select-hit');
    for (let i = 0; i < 5; i++) {
      const b = (await hits.nth(i).boundingBox())!;
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    // The cards' boxes too.
    const c = (await page.locator('#cards .dv-select-hit').first().boundingBox())!;
    expect(c.width).toBeGreaterThanOrEqual(44);
    expect(c.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
