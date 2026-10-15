import { test, expect, type Locator, type Page } from '@playwright/test';

// demo/custom-cards-code.ts: five plants (ids 1–5; "Throws" is 3). #lit: cardTemplate returning
// Lit (its own button[data-open], a data-action button, pieces.menu / actions / text). #dom:
// cardTemplate returning a hand-built element with a[data-open][href]. #mount: cardMount, two
// per page, logging "mount N" / "cleanup N" in window.log.mounts; its control appears a moment
// after the mount, like React's; row 3 throws. #order: cardMount, cardTemplate and a <template
// card> child at once.
type Log = { events: { on: string; type: string; id?: string; row: number }[]; mounts: string[] };
const log = (page: Page) => page.evaluate(() => (window as unknown as { log: Log }).log);
const cards = (page: Page, id: string) => page.locator(`#${id} .dv-cards > li`);
async function clickAt(page: Page, spot: Locator) {
  const b = (await spot.boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
// Mount log entries since the last call.
function mountsSince(page: Page) {
  let seen = 0;
  return async () => {
    const all = (await log(page)).mounts;
    const fresh = all.slice(seen);
    seen = all.length;
    return fresh;
  };
}
type Viewer = HTMLElement & { rows: unknown[]; layout: string; cardMount: unknown; cardTemplate: unknown; updateComplete: Promise<unknown> };

async function open(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/custom-cards-code.html');
  await expect(cards(page, 'lit')).toHaveCount(3);
  await expect(cards(page, 'mount')).toHaveCount(2);
  return errors;
}

test('cardTemplate returning Lit: the pieces, opening, data-action, the menu', async ({ page }) => {
  await open(page);
  const rose = cards(page, 'lit').nth(0);
  await expect(rose).toHaveClass(/dv-card-custom/);
  await expect(rose.locator('.price')).toHaveText('€6.50');
  await expect(rose).toHaveAccessibleName('Rose');
  await clickAt(page, rose.locator('.price'));
  await cards(page, 'lit').nth(1).getByRole('button', { name: 'Water it' }).click();
  await rose.locator('.lfdln-menu-button').click();
  await rose.getByRole('menuitem', { name: 'Delete' }).click();
  await page.locator('#lit dialog.lfdln-menu-confirm').getByRole('button', { name: 'Delete' }).click();
  await expect.poll(async () => (await log(page)).events).toEqual([
    { on: 'lit', type: 'dv-open', row: 1 },
    { on: 'lit', type: 'dv-action', id: 'water', row: 2 },
    { on: 'lit', type: 'dv-action', id: 'delete', row: 1 },
  ]);
  await expect(rose.locator('.lfdln-menu-button')).toBeFocused();
  // pieces.actions: the same items as footer buttons.
  await expect(rose.locator('.lfdln-card-actions > button')).toHaveText(['Edit', 'Delete']);
});

test('cardTemplate keeps its nodes across redraws', async ({ page }) => {
  await open(page);
  const rose = cards(page, 'lit').nth(0);
  await rose.locator('[data-open]').evaluate((b) => ((b as unknown as { mark: number }).mark = 1));
  await rose.locator('[data-open]').focus();
  await page.evaluate(async () => {
    const v = document.querySelector('#lit') as HTMLElement & { busy: boolean; updateComplete: Promise<unknown> };
    v.busy = true;
    await v.updateComplete;
  });
  await expect(rose.locator('[data-open]')).toBeFocused();
  expect(await rose.locator('[data-open]').evaluate((b) => (b as unknown as { mark?: number }).mark)).toBe(1);
});

test('cardTemplate returning an element: a link that opens by itself', async ({ page }) => {
  await open(page);
  const fern = cards(page, 'dom').nth(1);
  await expect(fern.locator('.price')).toHaveText('€4.00');
  await expect(fern).toHaveAccessibleName('Fern');
  await clickAt(page, fern.locator('.price'));
  await expect(page).toHaveURL(/#plant-2$/);
  expect((await log(page)).events).toEqual([]);
});

test('cardMount: mount and cleanup across pages, search, new rows, the table and removal', async ({ page }) => {
  await open(page);
  const since = mountsSince(page);
  expect(await since()).toEqual(['mount 1', 'mount 2']);
  const mount = page.locator('#mount');
  // Next page: 1 and 2 leave; 3 throws (no log), 4 mounts.
  await mount.getByRole('button', { name: 'Next' }).click();
  await expect(cards(page, 'mount')).toHaveCount(2);
  await expect.poll(since).toEqual(['cleanup 1', 'cleanup 2', 'mount 4']);
  // A search: only Basil.
  await mount.getByRole('searchbox').fill('basil');
  await expect(cards(page, 'mount')).toHaveCount(1);
  await expect.poll(since).toEqual(['cleanup 4', 'mount 5']);
  await mount.getByRole('searchbox').fill('');
  await expect(cards(page, 'mount')).toHaveCount(2);
  await expect.poll(since).toEqual(['cleanup 5', 'mount 1', 'mount 2']);
  // New row objects: every card is new.
  await page.evaluate(() => {
    (document.querySelector('#mount') as Viewer).rows = (window as unknown as { plants: () => unknown[] }).plants();
  });
  await expect.poll(since).toEqual(['cleanup 1', 'cleanup 2', 'mount 1', 'mount 2']);
  // The table: everything is cleaned up; cards again: mounted again.
  await mount.getByRole('button', { name: 'Show a table' }).click();
  await expect.poll(since).toEqual(['cleanup 1', 'cleanup 2']);
  await mount.getByRole('button', { name: 'Show cards' }).click();
  await expect.poll(since).toEqual(['mount 1', 'mount 2']);
  // Taken off the page and put back.
  await page.evaluate(() => document.querySelector('#mount')!.remove());
  await expect.poll(since).toEqual(['cleanup 1', 'cleanup 2']);
});

test('cardMount: the list puts back what it removed, and mounts again', async ({ page }) => {
  await open(page);
  const since = mountsSince(page);
  await since();
  await page.evaluate(() => {
    const v = document.querySelector('#mount')!;
    v.remove();
    document.querySelector('#mount-box')!.append(v);
  });
  await expect.poll(since).toEqual(['cleanup 1', 'cleanup 2', 'mount 1', 'mount 2']);
  await expect(cards(page, 'mount').nth(0).getByRole('button', { name: 'Rose', exact: true })).toBeVisible();
});

test('cardMount: the pieces, the name that comes later, and opening', async ({ page }) => {
  await open(page);
  const rose = cards(page, 'mount').nth(0);
  await expect(rose.locator(':scope > .dv-card-mount > button[data-open]')).toHaveText('Rose');
  await expect(rose.locator('.dv-card-mount dv-menu .lfdln-menu-button')).toHaveAttribute('aria-label', 'What you can do with Rose');
  // The control came after the viewer's update; focus inside the card names it.
  await rose.locator('[data-open]').focus();
  await expect(rose).toHaveAccessibleName('Rose');
  await clickAt(page, rose);
  await rose.locator('dv-menu .lfdln-menu-button').click();
  await rose.getByRole('menuitem', { name: 'Edit' }).click();
  expect((await log(page)).events).toEqual([
    { on: 'mount', type: 'dv-open', row: 1 },
    { on: 'mount', type: 'dv-action', id: 'edit', row: 1 },
  ]);
});

test('a mount that throws leaves only its own card empty', async ({ page }) => {
  const errors = await open(page);
  await page.locator('#mount').getByRole('button', { name: 'Next' }).click();
  const [throws, moss] = [cards(page, 'mount').nth(0), cards(page, 'mount').nth(1)];
  await expect(moss.getByRole('button', { name: 'Moss', exact: true })).toBeVisible();
  await expect(throws.locator('.dv-card-mount')).toBeEmpty();
  expect(errors.some((e) => e.includes('this card fails to mount'))).toBe(true);
});

test('cardMount wins over cardTemplate, which wins over a template', async ({ page }) => {
  await open(page);
  const card = cards(page, 'order').nth(0);
  await expect(card).toHaveText('Rose from cardMount');
  await page.evaluate(() => ((document.querySelector('#order') as Viewer).cardMount = undefined));
  await expect(card).toHaveText('Rose from cardTemplate');
  await page.evaluate(() => ((document.querySelector('#order') as Viewer).cardTemplate = undefined));
  await expect(cards(page, 'order').nth(0).locator('h3')).toHaveText('Rose from the template');
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('custom cards from code never make the page scroll sideways', async ({ page }) => {
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
