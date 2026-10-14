import { test, expect, type Page } from '@playwright/test';

// The demo's "Things" lists: #things (cards) and #things-table (the same rows as a table).
// Row 1 has an href (#thing-1); rows 2 and 3 have none. Every row has the same five menu items.
async function open(page: Page) {
  await page.goto('/');
  await expect(page.locator('#things .dv-card')).toHaveCount(3);
}
const events = (page: Page) =>
  page.evaluate(() => (window as unknown as { events: { type: string; id?: string; row?: number }[] }).events);
const card = (page: Page, n: number) => page.locator('#things .dv-card').nth(n);
const menuOf = (page: Page, n: number) => card(page, n).locator('.dv-menu');
const buttonOf = (page: Page, n: number) => card(page, n).locator('.dv-card-head button[aria-haspopup=menu]');
// A real mouse click at the middle of a part. Playwright's own click refuses parts that the
// card's open layer covers, which is the point of that layer.
async function mouseAt(page: Page, part: ReturnType<Page['locator']>) {
  await part.scrollIntoViewIfNeeded();
  const b = (await part.boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

test('card anatomy', async ({ page }) => {
  await open(page);
  const c = card(page, 1);
  const head = c.locator('.dv-card-head');
  const title = head.locator('.dv-card-title');
  await expect(title).toContainText('A thing with a very long name');
  // The whole title is there for hover.
  await expect(head.locator('[title]')).toHaveAttribute('title', /goes on and on past two lines of a card$/);
  await expect(head.locator('.dv-badge')).toHaveText('Old');
  const btn = head.locator('button[aria-haspopup=menu]');
  await expect(btn).toHaveAccessibleName('What you can do with A thing with a very long name that goes on and on past two lines of a card');
  // The menu button sits at the upper right of the card.
  const cb = (await c.boundingBox())!;
  const bb = (await btn.boundingBox())!;
  expect(bb.x + bb.width).toBeGreaterThan(cb.x + cb.width - 24);
  expect(bb.y).toBeLessThan(cb.y + 24);
  // Two lines at most.
  const lines = await title.evaluate((el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
  expect(lines).toBeLessThanOrEqual(2.1);

  const body = c.locator('.dv-card-body');
  await expect(body.locator('img')).toHaveCount(1);
  await expect(body.locator('.dv-fact')).toHaveText(['Fact one', 'Fact two']);
  await expect(body.locator('button, a, input')).toHaveCount(0);

  const foot = c.locator('.dv-card-foot');
  const meta = foot.locator('.dv-card-meta');
  const value = foot.locator('.dv-card-value');
  await expect(meta).toHaveText('2 days ago');
  await expect(value).toHaveText('€12.00');
  expect((await meta.boundingBox())!.x).toBeLessThan((await value.boundingBox())!.x);
  await expect(foot.locator('button, a')).toHaveCount(1);
  await expect(foot.getByRole('button', { name: 'Order again' })).toBeVisible();
});

test('whole card opens', async ({ page }) => {
  await open(page);
  // No href: a click on the body fires open with the row.
  await mouseAt(page, card(page, 1).locator('.dv-card-body'));
  expect(await events(page)).toEqual([{ type: 'open', row: 2 }]);
  // The menu button and the footer button never open the card.
  await buttonOf(page, 1).click();
  await expect(menuOf(page, 1)).toBeVisible();
  await page.keyboard.press('Escape');
  await card(page, 1).locator('.dv-card-foot').getByRole('button').click();
  expect(await events(page)).toEqual([{ type: 'open', row: 2 }, { type: 'action', id: 'again', row: 2 }]);
  // Enter on a card without href opens it too.
  await card(page, 2).locator('.dv-card-link').focus();
  await page.keyboard.press('Enter');
  expect((await events(page)).at(-1)).toEqual({ type: 'open', row: 3 });
  // With an href, a click on the body follows it and fires nothing.
  const before = (await events(page)).length;
  await buttonOf(page, 0).click();
  await page.keyboard.press('Escape');
  await expect(page).not.toHaveURL(/#thing-1$/);
  await mouseAt(page, card(page, 0).locator('.dv-card-body'));
  await expect(page).toHaveURL(/#thing-1$/);
  expect((await events(page)).length).toBe(before);
});

test('menu keyboard', async ({ page }) => {
  await open(page);
  const btn = buttonOf(page, 1);
  const menu = menuOf(page, 1);
  await expect(btn).toHaveAttribute('aria-haspopup', 'menu');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toHaveAttribute('role', 'menu');
  await expect(menu).toHaveAttribute('popover', 'auto');
  await btn.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  const items = menu.getByRole('menuitem');
  const focused = () => page.evaluate(() => document.activeElement?.textContent?.trim().split('\n')[0]?.trim());
  // Order: Edit, Archive (disabled), See its page, then Delete and Remove from list.
  await expect(items.first()).toBeFocused();
  expect(await focused()).toBe('Edit');
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(1)).toBeFocused(); // disabled items stay in the focus order
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(2)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(items.last()).toBeFocused();
  await page.keyboard.press('ArrowDown'); // wraps round
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(items.last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(btn).toBeFocused();
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  // Choosing an item with the keyboard fires action and returns focus.
  await page.keyboard.press('Enter');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
  await expect(btn).toBeFocused();
  expect(await events(page)).toEqual([{ type: 'action', id: 'edit', row: 2 }]);
});

test('menu sits under its button, right-aligned', async ({ page }) => {
  await open(page);
  await buttonOf(page, 0).click();
  const bb = (await buttonOf(page, 0).boundingBox())!;
  const mb = (await menuOf(page, 0).boundingBox())!;
  expect(Math.abs(mb.x + mb.width - (bb.x + bb.width))).toBeLessThan(2);
  expect(mb.y).toBeGreaterThanOrEqual(bb.y + bb.height);
  expect(mb.y).toBeLessThan(bb.y + bb.height + 12);
});

test('danger last', async ({ page }) => {
  await open(page);
  await buttonOf(page, 0).click();
  const menu = menuOf(page, 0);
  const kids = await menu.evaluate((el) =>
    [...el.children].map((c) => (c.getAttribute('role') === 'separator' ? '---' : c.querySelector('.dv-menu-label')!.textContent)));
  expect(kids).toEqual(['Edit', 'Archive', 'See its page', '---', 'Delete', 'Remove from list']);
  // An item with href is a link.
  await expect(menu.locator('a[role=menuitem]')).toHaveText('See its page');
  await expect(menu.locator('a[role=menuitem]')).toHaveAttribute('href', /#view$/);
});

test('disabled says why', async ({ page }) => {
  await open(page);
  await buttonOf(page, 0).click();
  const item = menuOf(page, 0).getByRole('menuitem', { name: /Archive/ });
  await expect(item).toHaveAttribute('aria-disabled', 'true');
  await expect(item.locator('.dv-menu-why')).toHaveText('Only the owner can archive it.');
  // The reason is a second line, under the label.
  const label = (await item.locator('.dv-menu-label').boundingBox())!;
  const why = (await item.locator('.dv-menu-why').boundingBox())!;
  expect(why.y).toBeGreaterThanOrEqual(label.y + label.height - 1);
  // Pressing it does nothing, and the menu stays open.
  await item.click({ force: true });
  await expect(menuOf(page, 0)).toBeVisible();
  expect(await events(page)).toEqual([]);
});

test('danger without confirm fires at once; the host asks', async ({ page }) => {
  await open(page);
  await buttonOf(page, 2).click();
  await menuOf(page, 2).getByRole('menuitem', { name: 'Remove from list' }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(await events(page)).toEqual([{ type: 'action', id: 'remove', row: 3 }]);
});

test('built-in confirm', async ({ page }) => {
  await open(page);
  const btn = buttonOf(page, 1);
  const dialog = page.locator('#things dialog.dv-confirm');
  await btn.click();
  await menuOf(page, 1).getByRole('menuitem', { name: 'Delete' }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Delete this thing?');
  expect(await dialog.evaluate((d) => d.matches(':modal'))).toBe(true);
  // Cancel fires nothing and puts focus back on the menu button.
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(btn).toBeFocused();
  expect(await events(page)).toEqual([]);
  // Escape is Cancel.
  await btn.click();
  await menuOf(page, 1).getByRole('menuitem', { name: 'Delete' }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(btn).toBeFocused();
  expect(await events(page)).toEqual([]);
  // OK fires action once.
  await btn.click();
  await menuOf(page, 1).getByRole('menuitem', { name: 'Delete' }).click();
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect(dialog).toBeHidden();
  await expect(btn).toBeFocused();
  expect(await events(page)).toEqual([{ type: 'action', id: 'delete', row: 2 }]);
});

test('outside click closes, and only one menu is open at a time', async ({ page }) => {
  await open(page);
  await buttonOf(page, 0).click();
  await expect(menuOf(page, 0)).toBeVisible();
  await buttonOf(page, 1).click();
  await expect(menuOf(page, 1)).toBeVisible();
  await expect(menuOf(page, 0)).toBeHidden();
  await expect(buttonOf(page, 0)).toHaveAttribute('aria-expanded', 'false');
  await page.locator('h1').click();
  await expect(menuOf(page, 1)).toBeHidden();
  await expect(buttonOf(page, 1)).toHaveAttribute('aria-expanded', 'false');
  // The button closes its own open menu (not close-then-reopen).
  await buttonOf(page, 2).click();
  await expect(menuOf(page, 2)).toBeVisible();
  await buttonOf(page, 2).click();
  await expect(menuOf(page, 2)).toBeHidden();
  expect(await events(page)).toEqual([]);
});

test('table: first cell opens the row, last column holds the menu', async ({ page }) => {
  await open(page);
  const t = page.locator('#things-table');
  const rows = t.locator('tbody tr');
  // Row 1 has an href: its first cell is a link. Row 2 has none: its first cell fires open.
  await expect(rows.nth(0).locator('th[scope=row] a')).toHaveAttribute('href', /#thing-1$/);
  await rows.nth(1).locator('th[scope=row]').getByRole('button').click();
  expect(await events(page)).toEqual([{ type: 'open', row: 2 }]);
  const cell = rows.nth(1).locator('td').last();
  const btn = cell.getByRole('button', { name: /^What you can do with A thing with a very long name/ });
  await expect(btn).toHaveAttribute('aria-haspopup', 'menu');
  await btn.click();
  await cell.getByRole('menuitem', { name: 'Edit' }).click();
  expect(await events(page)).toEqual([{ type: 'open', row: 2 }, { type: 'action', id: 'edit', row: 2 }]);
  // Rows without menu items get no menu button (the #local table has no cardOf menu).
  await expect(page.locator('#local tbody tr').first().locator('td.dv-row-menu button')).toHaveCount(0);
});

test('layout fires layout', async ({ page }) => {
  await open(page);
  await page.locator('#local').getByRole('button', { name: 'Show cards' }).click();
  const got = await page.evaluate(() => new Promise((resolve) => {
    const el = document.querySelector('#local')!;
    el.addEventListener('layout', (e) => resolve({ detail: (e as CustomEvent).detail, bubbles: e.bubbles, composed: e.composed }), { once: true });
    (el.querySelector('.dv-layout button') as HTMLButtonElement).click();
  }));
  expect(got).toEqual({ detail: { layout: 'table' }, bubbles: true, composed: true });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });
  test('menu targets are 44px', async ({ page }) => {
    await open(page);
    const btn = buttonOf(page, 0);
    expect((await btn.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await btn.boundingBox())!.width).toBeGreaterThanOrEqual(44);
    await btn.click();
    for (const item of await menuOf(page, 0).getByRole('menuitem').all()) {
      expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    // The open menu stays on the screen.
    const mb = (await menuOf(page, 0).boundingBox())!;
    expect(mb.x).toBeGreaterThanOrEqual(0);
    expect(mb.x + mb.width).toBeLessThanOrEqual(390);
  });
});

test('table: a row with a picture shows it in the first cell, beside the way in', async ({ page }) => {
  await open(page);
  const head = page.locator('#things-table tbody tr').nth(1).locator('th[scope=row]');
  const img = head.locator('.dv-row-picture img');
  await expect(img).toHaveCount(1);
  await expect(img).toHaveAttribute('alt', '');
  const pic = (await head.locator('.dv-row-picture').boundingBox())!;
  expect(Math.abs(pic.width - pic.height)).toBeLessThan(1); // a square
  expect(pic.width).toBeLessThanOrEqual(48);
  const way = (await head.getByRole('button').boundingBox())!;
  expect(way.x).toBeGreaterThanOrEqual(pic.x + pic.width); // beside it, title after the picture
  // Rows without a picture get none (#local has no cardOf picture).
  await expect(page.locator('#local tbody th[scope=row] .dv-row-picture')).toHaveCount(0);
});

test('confirm button falls back to "OK" when the item has no label', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const el = document.querySelector('#things-table') as HTMLElement & Record<string, unknown>;
    el.cardOf = (r: { name: string }) => ({ title: r.name, menu: [{ id: 'x', label: '', confirm: 'Sure?' }] });
  });
  const cell = page.locator('#things-table tbody tr').first().locator('td.dv-row-menu');
  await cell.getByRole('button').click();
  await cell.getByRole('menuitem').click();
  const dialog = page.locator('#things-table dialog.dv-confirm');
  await expect(dialog.getByRole('button', { name: 'OK', exact: true })).toBeVisible();
});
