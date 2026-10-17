import { test, expect, type Locator, type Page } from '@playwright/test';

// demo/select.html, with the select add-on: #table (54 rows, 20 per page, phone-layout="table"),
// #cards (built-in cards, open-event, 3 actions), #cardof (cardOf, 1 action), #tpl (cardTemplate), #mount (cardMount), #compact (5 rows),
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
// The card's box is wholly inside the card's visible area (within its border, so a card with
// overflow: hidden and round corners can't cut it).
const boxInside = (card: Locator) => card.evaluate((li) => {
  const c = li.getBoundingClientRect();
  const s = getComputedStyle(li);
  const b = li.querySelector('.dv-select-box')!.getBoundingClientRect();
  const r = parseFloat(s.borderTopLeftRadius) || 0;
  // inside the border, and past the round corner's reach
  const left = c.left + parseFloat(s.borderLeftWidth);
  const top = c.top + parseFloat(s.borderTopWidth);
  const corner = r * (1 - Math.SQRT1_2);
  return b.left >= left + corner - 0.5 && b.top >= top + corner - 0.5 && b.right <= c.right && b.bottom <= c.bottom;
});
// In a card with selection and a ⋯ menu: the box and the ⋯ on one centre line (±2 px), the box at
// the left, the ⋯ at the right, the title under them.
async function headRow(card: Locator, title: string) {
  const hit = (await card.locator('.dv-select-box').boundingBox())!;
  const menu = (await card.locator('button[aria-haspopup=menu]').first().boundingBox())!;
  const t = (await card.locator(title).boundingBox())!;
  const c = (await card.boundingBox())!;
  expect(Math.abs((hit.y + hit.height / 2) - (menu.y + menu.height / 2))).toBeLessThanOrEqual(2);
  expect(hit.x + hit.width / 2).toBeLessThan(c.x + c.width / 3);
  expect(menu.x + menu.width / 2).toBeGreaterThan(c.x + (c.width * 2) / 3);
  expect(t.y).toBeGreaterThanOrEqual(Math.min(hit.y + hit.height, menu.y + menu.height) - 1);
  expect(await boxInside(card)).toBe(true);
  // Even: the box as far from the card's left edge as the ⋯ from its right edge (±1 px).
  expect(Math.abs((hit.x - c.x) - (c.x + c.width - (menu.x + menu.width)))).toBeLessThanOrEqual(1);
}
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
    await expect(page.locator('#cards .lfdln-card-head > .lfdln-card-start > .dv-select-hit').first()).toBeVisible();
    expect(await card.locator('.lfdln-card-head').evaluate((h) => h.firstElementChild?.className)).toBe('lfdln-card-start');
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
      // These cards don't place pieces.select: the box is in the viewer's fallback slot, a
      // <dv-select> first in the card, at its top left inside the card.
      await expect(card.locator(':scope > dv-select.dv-select-slot .dv-select-box')).toHaveCount(1);
      await expect(page.locator(`#${id} li > .dv-select-slot .dv-select-box`)).toHaveCount(20);
      expect(await card.locator(':scope > .dv-select-slot').evaluate((e) => getComputedStyle(e).position)).toBe('absolute');
      await expect.poll(() => boxInside(card)).toBe(true);
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

// The card's head row: the box at the top left, the ⋯ at the top right, the title under them; on a
// wide screen and on a phone, in the built-in card and in custom cards that place pieces.select.
for (const [where, viewport] of [['wide', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]] as const) {
  test.describe(`card head row (${where})`, () => {
    test.use({ viewport });
    test('built-in cards: the box and the ⋯ share one row at opposite sides, the title below', async ({ page }) => {
      await open(page);
      const card = page.locator('#heads li.lfdln-card').first();
      await card.scrollIntoViewIfNeeded();
      await headRow(card, '.lfdln-card-title');
      // A long title can't move them.
      const long = page.locator('#heads li.lfdln-card').nth(1);
      await long.locator('.lfdln-card-title').evaluate((t) => { t.textContent = 'A very long name '.repeat(8); });
      await headRow(long, '.lfdln-card-title');
      // Selection off: the row holds only the ⋯, at the right.
      await page.locator('#heads').evaluate((el: HTMLElement & { selectable: boolean }) => { el.selectable = false; });
      await expect(card.locator('.dv-select-box')).toHaveCount(0);
      const menu = (await card.locator('button[aria-haspopup=menu]').boundingBox())!;
      const c = (await card.boundingBox())!;
      expect(menu.x + menu.width).toBeGreaterThan(c.x + c.width - 24);
      expect(menu.y + menu.height).toBeLessThanOrEqual((await card.locator('.lfdln-card-title').boundingBox())!.y + 1);
    });

    for (const id of ['tplhead', 'mounthead', 'htmlhead']) {
      test(`custom cards that place pieces.select (#${id}) get it in their own header`, async ({ page }) => {
        await open(page);
        const card = page.locator(`#${id} li.dv-card-custom`).first();
        await card.scrollIntoViewIfNeeded();
        await expect(card.locator('.head > dv-select .dv-select-box')).toHaveCount(1);
        await expect(page.locator(`#${id} .dv-select-slot`)).toHaveCount(0);
        await headRow(card, `.${id}-name`);
        // A card with overflow: hidden doesn't cut it.
        await card.evaluate((li) => li.classList.add('clip'));
        expect(await boxInside(card)).toBe(true);
        await card.locator('.dv-select-box').click();
        await expect(card).toHaveClass(/\bdv-selected\b/);
        expect(await events(page, 'dv-open')).toEqual([]);
      });
    }

    for (const id of ['tpl', 'mount']) {
      test(`custom cards that don't place it (#${id}): the fallback box is inside the card, not clipped`, async ({ page }) => {
        await open(page);
        const card = page.locator(`#${id} li.dv-card-custom`).first();
        await card.scrollIntoViewIfNeeded();
        await card.evaluate((li) => li.classList.add('clip'));
        expect(await boxInside(card)).toBe(true);
        // Nothing covers it: a real click ticks.
        await card.locator('.dv-select-box').click();
        await expect(card).toHaveClass(/\bdv-selected\b/);
      });
    }
  });
}

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

// --- Batch actions, select all matching, the phone bar (SEL-3b). #table and #server have the
// actions Export, Mark as shipped, Archive, Delete (danger) and Can't do this (disabled); their
// dv-batch handler calls preventDefault() while window.keep is true.
type Batch = { action: string; keys: string[]; rows: { id: number }[]; all: boolean; except: string[]; query: { search: string; page: number } };
const batches = async (page: Page) => (await events(page, 'dv-batch')).map((e) => e.detail as Batch);
const pageBox = (page: Page, list: string) =>
  page.locator(`#${list}`).getByRole('checkbox', { name: 'Select all on this page', exact: true });
const bar = (page: Page, list = 'table') => page.locator(`#${list} .dv-select-bar`);
async function tick3(page: Page) {
  for (const n of ['Rose 1', 'Fern 1', 'Mint 1']) await rowBox(page, 'table', n).check();
  await expect(bar(page).locator('.dv-select-count')).toHaveText('3 selected');
}
async function openServer(page: Page) {
  await page.goto('/select.html');
  await expect(page.locator('#server tbody .dv-select-box')).toHaveCount(20);
}

test.describe('batch actions', () => {
  test('the first 3 actions are buttons, the rest are in a ⋯ menu named "More actions"', async ({ page }) => {
    await open(page);
    await tick3(page);
    await expect(bar(page).locator('button.dv-select-action')).toHaveText(['Export', 'Mark as shipped', 'Archive']);
    const more = bar(page).getByRole('button', { name: 'More actions', exact: true });
    await expect(more).toHaveCount(1);
    await more.click();
    const items = await page.locator('#table .lfdln-menu-list[id$="-sel-more"]').getByRole('menuitem').allTextContents();
    expect(items.map((t) => t.trim()).sort()).toEqual(["Can't do this", 'Delete']);
  });

  test('wide screens: 3 actions are 3 buttons and no ⋯; 1 action is 1 button', async ({ page }) => {
    await open(page);
    await rowBox(page, 'cards', 'Rose 1').check();
    await expect(bar(page, 'cards').locator('button.dv-select-action:visible')).toHaveText(['Export', 'Mark as shipped', 'Delete']);
    await expect(bar(page, 'cards').getByRole('button', { name: 'More actions', exact: true })).toHaveCount(0);
    await rowBox(page, 'cardof', 'Rose 1').check();
    await expect(bar(page, 'cardof').locator('button.dv-select-action:visible')).toHaveText(['Export']);
    await expect(bar(page, 'cardof').getByRole('button', { name: 'More actions', exact: true })).toHaveCount(0);
  });

  test('a danger action is drawn in --dv-danger', async ({ page }) => {
    await open(page);
    await tick3(page);
    const danger = await page.locator('#table').evaluate((t) => {
      const probe = t.appendChild(document.createElement('span'));
      probe.style.color = 'var(--dv-danger)';
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    });
    await bar(page).getByRole('button', { name: 'More actions', exact: true }).click();
    const del = page.locator('#table').getByRole('menuitem', { name: 'Delete' });
    expect(await del.evaluate((b) => getComputedStyle(b).color)).toBe(danger);
    // A danger action among the first 3 is a button in that colour too.
    await page.evaluate(() => {
      const t = document.getElementById('table') as HTMLElement & { batchActions: unknown };
      t.batchActions = [{ id: 'delete', label: 'Delete', danger: true }, { id: 'export', label: 'Export' }];
    });
    const button = bar(page).locator('button.dv-select-action', { hasText: 'Delete' });
    expect(await button.evaluate((b) => getComputedStyle(b).color)).toBe(danger);
    expect(await bar(page).locator('button.dv-select-action', { hasText: 'Export' }).evaluate((b) => getComputedStyle(b).color)).not.toBe(danger);
  });

  test('dv-batch carries the ticked keys and rows, then the selection clears', async ({ page }) => {
    await open(page);
    await tick3(page);
    const before = (await events(page, 'dv-select')).length;
    await bar(page).getByRole('button', { name: 'Export', exact: true }).click();
    const [b] = await batches(page);
    expect(b!.action).toBe('export');
    expect(b!.keys).toEqual(['1', '2', '3']);
    expect(b!.rows.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(b!.all).toBe(false);
    expect(b!.except).toEqual([]);
    expect(b!.query.search).toBe('');
    const after = (await events(page, 'dv-select')).slice(before);
    expect(after).toEqual([{ type: 'dv-select', detail: { keys: [], all: false, except: [] } }]);
    await expect(bar(page)).toHaveCount(0);
    await expect(page.locator('#table tbody .dv-select-box').first()).toBeFocused();
  });

  test('an action from the ⋯ menu fires dv-batch too, and focus goes to the first row box', async ({ page }) => {
    await open(page);
    await tick3(page);
    await bar(page).getByRole('button', { name: 'More actions', exact: true }).click();
    await page.locator('#table').getByRole('menuitem', { name: 'Delete' }).click();
    expect((await batches(page)).map((b) => [b.action, b.keys])).toEqual([['delete', ['1', '2', '3']]]);
    await expect(bar(page)).toHaveCount(0);
    await expect(page.locator('#table tbody .dv-select-box').first()).toBeFocused();
  });

  test('preventDefault() keeps the selection', async ({ page }) => {
    await open(page);
    await tick3(page);
    await page.evaluate(() => ((window as unknown as { keep: boolean }).keep = true));
    const before = (await events(page, 'dv-select')).length;
    await bar(page).getByRole('button', { name: 'Archive', exact: true }).click();
    expect((await batches(page)).map((b) => b.action)).toEqual(['archive']);
    await expect(bar(page).locator('.dv-select-count')).toHaveText('3 selected');
    expect((await events(page, 'dv-select')).length).toBe(before);
    await expect(bar(page).getByRole('button', { name: 'Archive', exact: true })).toBeFocused();
  });

  test('a disabled action fires nothing', async ({ page }) => {
    await open(page);
    await tick3(page);
    // As one of the first 3: aria-disabled, focusable, and a press does nothing.
    await page.evaluate(() => {
      const t = document.getElementById('table') as HTMLElement & { batchActions: unknown };
      t.batchActions = [{ id: 'never', label: "Can't do this", disabled: true }, { id: 'export', label: 'Export' }];
    });
    const off = bar(page).getByRole('button', { name: "Can't do this", exact: true });
    await expect(off).toHaveAttribute('aria-disabled', 'true');
    expect(await off.evaluate((b) => (b as HTMLButtonElement).disabled)).toBe(false);
    await off.focus();
    await expect(off).toBeFocused();
    await off.click({ force: true });
    await page.keyboard.press('Enter');
    // In the ⋯ menu too.
    await page.evaluate(() => {
      const t = document.getElementById('table') as HTMLElement & { batchActions: unknown };
      t.batchActions = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'never', label: "Can't do this", disabled: true }];
    });
    await bar(page).getByRole('button', { name: 'More actions', exact: true }).click();
    await page.locator('#table').getByRole('menuitem', { name: "Can't do this" }).click({ force: true });
    await page.waitForTimeout(100);
    expect(await batches(page)).toEqual([]);
    await expect(bar(page).locator('.dv-select-count')).toHaveText('3 selected');
  });

  test('Esc in the open ⋯ menu only closes it; Esc again clears', async ({ page }) => {
    await open(page);
    await tick3(page);
    const more = bar(page).getByRole('button', { name: 'More actions', exact: true });
    await more.click();
    await expect(page.locator('#table .lfdln-menu-list[id$="-sel-more"]')).toBeVisible();
    await expect(page.locator('#table .lfdln-menu-list[id$="-sel-more"] [role=menuitem]:focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('#table .lfdln-menu-list[id$="-sel-more"]')).toBeHidden();
    await expect(more).toBeFocused();
    await expect(bar(page).locator('.dv-select-count')).toHaveText('3 selected');
    await page.keyboard.press('Escape');
    await expect(bar(page)).toHaveCount(0);
    await expect(page.locator('#table tbody .dv-select-box').first()).toBeFocused();
  });

  test('focus goes to this list\'s own first row box, not one in a list nested in a cell', async ({ page }) => {
    await open(page);
    // Rose 1 gets no key (its box is disabled) and a selectable list in its name cell, so the
    // nested list's box comes before #table's first enabled one (Fern 1's) in the page.
    await page.evaluate(() => {
      type L = HTMLElement & { columns: unknown; rows: unknown; selectable: boolean; compact: boolean; rowKey: unknown };
      const t = document.getElementById('table') as L;
      t.rowKey = (r: { id: number }) => (r.id === 1 ? undefined : String(r.id));
      const cols = t.columns as { key: string; render?: unknown }[];
      t.columns = cols.map((c, i) => (i === 0 ? { ...c, render: (r: { id: number; name: string }) => {
        if (r.id !== 1) return r.name;
        const inner = document.createElement('lfdln-data-viewer') as L;
        inner.id = 'inner';
        inner.selectable = true;
        inner.compact = true;
        inner.columns = [{ key: 'name', label: 'Name' }];
        inner.rows = [{ id: 'x', name: 'Inner' }];
        return inner;
      } } : c));
    });
    await expect(page.locator('#inner tbody .dv-select-box')).toHaveCount(1);
    await rowBox(page, 'table', 'Mint 1').check();
    await bar(page).getByRole('button', { name: 'Clear selection' }).click();
    await expect(bar(page)).toHaveCount(0);
    await expect(rowBox(page, 'table', 'Fern 1')).toBeFocused();
  });
});

test.describe('select all', () => {
  test('the line offers all matching once the page is ticked', async ({ page }) => {
    await open(page);
    await expect(page.locator('#table .dv-select-all')).toHaveCount(0);
    await pageBox(page, 'table').click();
    const line = page.locator('#table .dv-select-all');
    await expect(line).toHaveText('All 20 on this page are selected. Select all 54 matching');
    // Under the bar.
    const b = (await bar(page).boundingBox())!;
    expect((await line.boundingBox())!.y).toBeGreaterThanOrEqual(b.y + b.height - 1);
    await line.getByRole('button', { name: 'Select all 54 matching' }).click();
    await expect(line).toHaveText('All 54 are selected. Clear selection');
    await expect(bar(page).locator('.dv-select-count')).toHaveText('54 selected');
    expect(await page.locator('#table').evaluate((t) => (t as HTMLElement & { selectedAll: boolean }).selectedAll)).toBe(true);
    // dv-select's keys are `selected`'s: every matching row's.
    const all = await page.locator('#table').evaluate((t) => (t as HTMLElement & { selected: string[] }).selected);
    expect(all).toEqual(Array.from({ length: 54 }, (_, i) => String(i + 1)));
    expect((await events(page, 'dv-select')).at(-1)!.detail).toEqual({ keys: all, all: true, except: [] });
  });

  test('unticking after all matching records it in except', async ({ page }) => {
    await open(page);
    await pageBox(page, 'table').click();
    await page.locator('#table .dv-select-all').getByRole('button', { name: 'Select all 54 matching' }).click();
    await rowBox(page, 'table', 'Fern 1').uncheck();
    await expect(bar(page).locator('.dv-select-count')).toHaveText('53 selected');
    // No longer "All 54 are selected.": only the way out.
    await expect(page.locator('#table .dv-select-all')).toHaveText('Clear selection');
    const after = (await events(page, 'dv-select')).at(-1)!.detail as { keys: string[]; all: boolean; except: string[] };
    expect(after.all).toBe(true);
    expect(after.except).toEqual(['2']);
    expect(after.keys).toHaveLength(53);
    expect(after.keys).not.toContain('2');
    await bar(page).getByRole('button', { name: 'Export', exact: true }).click();
    const [b] = await batches(page);
    expect(b!.all).toBe(true);
    expect(b!.except).toEqual(['2']);
    expect(b!.keys).toHaveLength(53);
    expect(b!.rows).toHaveLength(53);
    expect(b!.keys).not.toContain('2');
    expect(b!.rows.map((r) => String(r.id))).toEqual(b!.keys);
    expect(b!.query.search).toBe('');
  });

  test('"Clear selection" in the line clears everything', async ({ page }) => {
    await open(page);
    await pageBox(page, 'table').click();
    await page.locator('#table .dv-select-all').getByRole('button', { name: 'Select all 54 matching' }).click();
    await page.locator('#table .dv-select-all').getByRole('button', { name: 'Clear selection' }).click();
    await expect(bar(page)).toHaveCount(0);
    await expect(page.locator('#table .dv-select-all')).toHaveCount(0);
    await expect(page.locator('#table tbody tr.dv-selected')).toHaveCount(0);
    expect(await page.locator('#table').evaluate((t) => (t as HTMLElement & { selectedAll: boolean }).selectedAll)).toBe(false);
    expect((await events(page, 'dv-select')).at(-1)!.detail).toEqual({ keys: [], all: false, except: [] });
    await expect(page.locator('#table tbody .dv-select-box').first()).toBeFocused();
  });

  test('no line when the page holds every matching row, or in a compact list', async ({ page }) => {
    await open(page);
    await page.locator('#table input[type=search]').fill('Rose');
    await expect(page.locator('#table tbody tr')).toHaveCount(9);
    await pageBox(page, 'table').click();
    await expect(bar(page).locator('.dv-select-count')).toHaveText('9 selected');
    await expect(page.locator('#table .dv-select-all')).toHaveCount(0);
    await pageBox(page, 'compact').click();
    await expect(page.locator('#compact .dv-select-count')).toHaveText('5 selected');
    await expect(page.locator('#compact .dv-select-all')).toHaveCount(0);
  });

  test('no line when the page holds every matching row, some of them without a key', async ({ page }) => {
    await open(page);
    // Rose 1 has no key: the page holds all 9 matching rows, 8 of them tickable.
    await page.locator('#table').evaluate((t) => {
      (t as HTMLElement & { rowKey: unknown }).rowKey = (r: { id: number }) => (r.id === 1 ? undefined : String(r.id));
    });
    await page.locator('#table input[type=search]').fill('Rose');
    await expect(page.locator('#table tbody tr')).toHaveCount(9);
    await pageBox(page, 'table').click();
    await expect(bar(page).locator('.dv-select-count')).toHaveText('8 selected');
    await expect(page.locator('#table .dv-select-all')).toHaveCount(0);
  });

  test('rows set again so that nothing is left ticked under all matching: the selection is none', async ({ page }) => {
    await open(page);
    await pageBox(page, 'table').click();
    await page.locator('#table .dv-select-all').getByRole('button', { name: 'Select all 54 matching' }).click();
    await rowBox(page, 'table', 'Rose 1').uncheck();
    await expect(bar(page).locator('.dv-select-count')).toHaveText('53 selected');
    // Only Rose 1 is left, and it is the one unticked.
    await page.evaluate(() => {
      const t = document.getElementById('table') as HTMLElement & { rows: { id: number }[] };
      t.rows = t.rows.filter((r) => r.id === 1);
    });
    await expect(page.locator('#table tbody tr')).toHaveCount(1);
    await expect(bar(page)).toHaveCount(0);
    expect(await page.locator('#table').evaluate((t) => {
      const l = t as HTMLElement & { selectedAll: boolean; selected: string[] };
      return [l.selectedAll, l.selected];
    })).toEqual([false, []]);
  });

  test('server mode: all matching with except', async ({ page }) => {
    await openServer(page);
    await pageBox(page, 'server').click();
    const line = page.locator('#server .dv-select-all');
    await expect(line).toHaveText('All 20 on this page are selected. Select all 45 matching');
    await line.getByRole('button', { name: 'Select all 45 matching' }).click();
    await expect(bar(page, 'server').locator('.dv-select-count')).toHaveText('45 selected');
    await page.locator('#server').getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('#server tbody tr').first()).toContainText('Rose tea');
    await expect(page.locator('#server tbody .dv-select-box:checked')).toHaveCount(20);
    await rowBox(page, 'server', 'Rose cake').uncheck();
    await expect(bar(page, 'server').locator('.dv-select-count')).toHaveText('44 selected');
    // Kept (preventDefault), so a new search can clear it afterwards.
    await page.evaluate(() => ((window as unknown as { keep: boolean }).keep = true));
    await bar(page, 'server').getByRole('button', { name: 'Export', exact: true }).click();
    const [b] = await batches(page);
    expect(b!.all).toBe(true);
    expect(b!.except).toEqual(['22']);
    expect(b!.keys).toHaveLength(39);
    expect(b!.rows).toHaveLength(39);
    expect(b!.rows.map((r) => String(r.id))).toEqual(b!.keys);
    expect(b!.keys.every((k) => Number(k) <= 40)).toBe(true); // pages 1 and 2 only
    expect(b!.query.page).toBe(2);
    await expect(bar(page, 'server').locator('.dv-select-count')).toHaveText('44 selected');
    // Again, not prevented: the selection clears (one dv-select), and the search box is back.
    const before = (await events(page, 'dv-select')).length;
    await page.evaluate(() => ((window as unknown as { keep: boolean }).keep = false));
    await bar(page, 'server').getByRole('button', { name: 'Export', exact: true }).click();
    await expect(bar(page, 'server')).toHaveCount(0);
    expect((await events(page, 'dv-select')).slice(before).map((e) => e.detail)).toEqual([{ keys: [], all: false, except: [] }]);
    // A new search then starts from nothing ticked.
    await page.locator('#server input[type=search]').fill('lemon');
    await expect(page.locator('#server tbody tr')).toHaveCount(5);
    await expect(page.locator('#server tbody .dv-select-box:checked')).toHaveCount(0);
    await expect(page.locator('#server .dv-select-all')).toHaveCount(0);
    expect(await page.locator('#server').evaluate((el) => (el as HTMLElement & { selectedAll: boolean }).selectedAll)).toBe(false);
  });

  test('server mode: rows are only kept by key while something is ticked', async ({ page }) => {
    await openServer(page);
    const seen = () => page.locator('#server').evaluate((el) => (el as unknown as { _seen: Map<string, unknown> })._seen.size);
    await page.locator('#server').getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('#server tbody tr').first()).toContainText('Rose tea');
    expect(await seen()).toBe(0);
    await rowBox(page, 'server', 'Rose cake').check();
    await expect(bar(page, 'server').locator('.dv-select-count')).toHaveText('1 selected');
    await bar(page, 'server').getByRole('button', { name: 'Export', exact: true }).click();
    expect((await batches(page)).map((b) => b.rows.map((r) => r.id))).toEqual([[22]]);
    expect(await seen()).toBe(0); // cleared with the selection
    await page.locator('#server').getByRole('button', { name: 'Previous' }).click();
    await expect(page.locator('#server tbody tr').first()).toContainText('Spiced tea');
    expect(await seen()).toBe(0);
  });
});

test.describe('cardOf cards', () => {
  test('a cardOf card gets the box; tapping it ticks without opening', async ({ page }) => {
    await open(page);
    const card = page.locator('#cardof li.lfdln-card').first();
    await expect(card.locator('.lfdln-card-start > .dv-select-hit .dv-select-box')).toHaveCount(1);
    await expect(card.locator('.lfdln-card-start > .dv-select-hit .dv-select-box')).toHaveAttribute('aria-label', 'Select Rose 1');
    await card.locator('.dv-select-box').click();
    await expect(card).toHaveClass(/\bdv-selected\b/);
    await expect(card.locator('.dv-select-box')).toBeChecked();
    await expect(page.locator('#cardof .dv-select-count')).toHaveText('1 selected');
    await page.waitForTimeout(100);
    expect(await events(page, 'dv-open')).toEqual([]);
  });
});

test.describe('the phone bar', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the bar is fixed to the bottom with 44 px buttons; the page never scrolls sideways; the last row is not covered', async ({ page }) => {
    await open(page);
    await rowBox(page, 'table', 'Rose 1').check();
    const b = (await bar(page).boundingBox())!;
    expect(Math.round(b.y + b.height)).toBe(844);
    expect(b.height).toBeGreaterThanOrEqual(60);
    // ✕, the first action and the ⋯.
    const buttons = bar(page).locator('button:not([role=menuitem]):visible');
    await expect(buttons).toHaveCount(3);
    for (const box of await buttons.all()) expect((await box.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    // Scrolled to the end of #table: its last row and its pager sit above the bar.
    await page.locator('#table > .dv-root').evaluate((r) => r.scrollIntoView({ block: 'end' }));
    const top = (await bar(page).boundingBox())!.y;
    const last = (await page.locator('#table tbody tr').last().boundingBox())!;
    expect(last.y + last.height).toBeLessThanOrEqual(top + 0.5);
    const pager = (await page.locator('#table .lfdln-pagination-nav').boundingBox())!;
    expect(pager.y + pager.height).toBeLessThanOrEqual(top + 0.5);
    // The bar is drawn above the boxes it covers.
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.closest('.dv-select-bar') !== null, [b.x + 5, b.y + b.height / 2]);
    expect(hit).toBe(true);
  });
  // Every child of the bar ends on screen, and the bar itself doesn't scroll sideways.
  async function fits(page: Page, list: string) {
    const b = bar(page, list);
    const rights = await b.evaluate((el) => [...el.children]
      .filter((c) => getComputedStyle(c).display !== 'none')
      .map((c) => c.getBoundingClientRect().right));
    for (const r of rights) expect(r).toBeLessThanOrEqual(390);
    const [sw, cw] = await b.evaluate((el) => [el.scrollWidth, el.clientWidth]);
    expect(sw).toBe(cw);
    await expect(b.locator('.dv-select-clear')).toBeInViewport();
    await expect(b.locator('.dv-select-count')).toBeInViewport();
  }

  test('5 actions: the bar shows ✕, the count, the first action and a ⋯ with the other 4, and fits', async ({ page }) => {
    await open(page);
    await rowBox(page, 'table', 'Rose 1').check();
    await expect(bar(page).locator('button.dv-select-action:visible')).toHaveText(['Export']);
    const more = bar(page).getByRole('button', { name: 'More actions', exact: true });
    await expect(more).toHaveCount(1);
    await fits(page, 'table');
    // The first action is cut with an ellipsis at 40 vw at most.
    const w = (await bar(page).locator('button.dv-select-action:visible').boundingBox())!.width;
    expect(w).toBeLessThanOrEqual(390 * 0.4 + 0.5);
    await more.click();
    const phoneMenu = page.locator('#table .lfdln-menu-list[id$="-sel-more-phone"]');
    await expect(phoneMenu).toBeVisible();
    const items = await phoneMenu.getByRole('menuitem').allTextContents();
    expect(items.map((t) => t.trim()).sort()).toEqual(['Archive', "Can't do this", 'Delete', 'Mark as shipped']);
    await phoneMenu.getByRole('menuitem', { name: 'Archive' }).click();
    expect((await batches(page)).map((d) => d.action)).toEqual(['archive']);
  });

  test('3 actions: the first is a button and the other 2 are in the ⋯', async ({ page }) => {
    await open(page);
    await rowBox(page, 'cards', 'Rose 1').check();
    await expect(bar(page, 'cards').locator('button.dv-select-action:visible')).toHaveText(['Export']);
    await bar(page, 'cards').getByRole('button', { name: 'More actions', exact: true }).click();
    const phoneMenu = page.locator('#cards .lfdln-menu-list[id$="-sel-more-phone"]');
    await expect(phoneMenu).toBeVisible();
    const items = await phoneMenu.getByRole('menuitem').allTextContents();
    expect(items.map((t) => t.trim()).sort()).toEqual(['Delete', 'Mark as shipped']);
    await fits(page, 'cards');
  });

  test('1 action: no ⋯', async ({ page }) => {
    await open(page);
    await rowBox(page, 'cardof', 'Rose 1').check();
    await expect(bar(page, 'cardof').locator('button.dv-select-action:visible')).toHaveText(['Export']);
    await expect(bar(page, 'cardof').getByRole('button', { name: 'More actions', exact: true })).toHaveCount(0);
    await fits(page, 'cardof');
  });

  test('a long first action is cut with an ellipsis at 40 vw', async ({ page }) => {
    await open(page);
    await page.locator('#cardof').evaluate((el) => {
      (el as HTMLElement & { batchActions: unknown }).batchActions = [{ id: 'export', label: 'Export every ticked plant to a spreadsheet' }];
    });
    await rowBox(page, 'cardof', 'Rose 1').check();
    const action = bar(page, 'cardof').locator('button.dv-select-action');
    expect((await action.boundingBox())!.width).toBeLessThanOrEqual(390 * 0.4 + 0.5);
    const label = action.locator('span');
    expect(await label.evaluate((e) => getComputedStyle(e).textOverflow)).toBe('ellipsis');
    expect(await label.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
    await fits(page, 'cardof');
  });

  test('a long count wraps instead of pushing the bar sideways', async ({ page }) => {
    await open(page);
    await page.locator('#table').evaluate((t) => {
      (t as HTMLElement & { words: object }).words = { selectedCount: (n: string) => `${n} Pflanzen sind ausgewählt worden und warten auf eine Aktion` };
    });
    await rowBox(page, 'table', 'Rose 1').check();
    await expect(bar(page).locator('.dv-select-count')).toContainText('Pflanzen');
    const [sw, cw] = await bar(page).evaluate((el) => [el.scrollWidth, el.clientWidth]);
    expect(sw).toBe(cw);
    await expect(bar(page).locator('button.dv-select-action:visible')).toHaveText(['Export']);
    await fits(page, 'table');
    // At most 2 lines, so the bar stays 60 px tall and the list's room under its end is enough.
    expect((await bar(page).boundingBox())!.height).toBeLessThanOrEqual(61);
    await expect(bar(page)).toHaveAttribute('aria-label', /warten auf eine Aktion$/);
    await page.locator('#table > .dv-root').evaluate((r) => r.scrollIntoView({ block: 'end' }));
    const top = (await bar(page).boundingBox())!.y;
    const last = (await page.locator('#table tbody tr').last().boundingBox())!;
    expect(last.y + last.height).toBeLessThanOrEqual(top + 0.5);
  });

  test('a page rule that shows the bar\'s buttons doesn\'t bring back the wide-screen ones', async ({ page }) => {
    await open(page);
    await page.addStyleTag({ content: '.dv-select-bar button, .dv-select-bar .dv-select-more { display: inline-flex }' });
    await rowBox(page, 'table', 'Rose 1').check();
    await expect(bar(page).locator('button:not([role=menuitem]):visible')).toHaveCount(3);
    await expect(bar(page).locator('button.dv-select-action:visible')).toHaveText(['Export']);
  });
});

test('wide screens: a page rule that shows the bar\'s buttons doesn\'t bring back the phone ⋯', async ({ page }) => {
  await open(page);
  await page.addStyleTag({ content: '.dv-select-bar button, .dv-select-bar .dv-select-more { display: inline-flex }' });
  await rowBox(page, 'table', 'Rose 1').check();
  // 3 actions, the ⋯ with the rest, and ✕.
  await expect(bar(page).locator('button:not([role=menuitem]):visible')).toHaveCount(5);
  await expect(bar(page).getByRole('button', { name: 'More actions', exact: true })).toHaveCount(1);
});

// #views and #sentence: selectable lists whose filter style is drawn above the bar (.dv-above).
test.describe('a style drawn above the bar', () => {
  for (const id of ['views', 'sentence']) {
    test(`#${id}: ticking a row hides .dv-above like the bar; clearing shows it again`, async ({ page }) => {
      await open(page);
      const above = page.locator(`#${id} .dv-above`);
      await expect(above).toBeVisible();
      await expect(page.locator(`#${id} .dv-bar`)).toBeVisible();
      await rowBox(page, id, 'Rose 1').check();
      await expect(page.locator(`#${id} .dv-select-bar`)).toBeVisible();
      await expect(above).toHaveCount(0);
      await expect(page.locator(`#${id} .dv-bar`)).toHaveCount(0);
      await page.locator(`#${id}`).getByRole('button', { name: 'Clear selection' }).click();
      await expect(above).toBeVisible();
      await expect(page.locator(`#${id} .dv-bar`)).toBeVisible();
      await expect(page.locator(`#${id} .dv-select-bar`)).toHaveCount(0);
    });
  }
});
