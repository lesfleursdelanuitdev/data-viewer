import { test, expect, type Locator, type Page } from '@playwright/test';

// demo/custom-cards.html (the standalone script only, plus a few lines setting rows, cardOf for
// menus and hrefs, and window.events). Three plants: Rose (picture, light), Fern (no picture,
// no light), "Moss <b>soft</b>" (unsafe picture and link).
// #child: a <template card> child with data-open on its h3, a data-action button and <dv-menu>.
// #shared-a / #shared-b: one <template id="plant-card"> (no data-open: the h3 opens) with
// <dv-actions>; -a has hrefs from cardOf, -b fires dv-open (open-event) and has its own child
// template, which loses. #no-open: a template with no heading. #missing: card-template="nope".
type Ev = { on: string; type: string; id?: string; item?: { id: string; label: string }; row: number };
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: Ev[] }).events);
const cards = (page: Page, id: string) => page.locator(`#${id} .dv-cards > li`);
// A real click at a spot of the card; the open layer covers it, so the click lands on that layer.
async function clickAt(page: Page, spot: Locator) {
  const b = (await spot.boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

async function open(page: Page) {
  const warnings: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'warning') warnings.push(m.text());
  });
  await page.goto('/custom-cards.html');
  await expect(cards(page, 'child')).toHaveCount(3);
  return warnings;
}

test('a <template card> child: fields, data-if, text stays text, scripts never run', async ({ page }) => {
  await open(page);
  const [rose, fern, moss] = [0, 1, 2].map((i) => cards(page, 'child').nth(i));
  await expect(rose!).toHaveClass(/dv-card-custom/);
  await expect(rose!.locator('h3')).toHaveText('Rose');
  await expect(rose!.locator('.price')).toHaveText('€6.50'); // formatted like the price column
  await expect(rose!.locator('.badge')).toHaveText('Sun');
  await expect(rose!.locator('img')).toHaveAttribute('src', /\/pictures\/rose\.svg$/);
  await expect(rose!.locator('[data-if]')).toHaveCount(0);
  // data-if: Fern has no picture and no light.
  await expect(fern!.locator('img, .badge')).toHaveCount(0);
  // Markup in a field is text; an unsafe picture address loses its src.
  await expect(moss!.locator('h3')).toHaveText('Moss <b>soft</b>');
  await expect(moss!.locator('b')).toHaveCount(0);
  await expect(moss!.locator('img')).not.toHaveAttribute('src', /.*/);
  await expect(page.locator('#child script')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { ran?: boolean }).ran)).toBeUndefined();
  // The children were read and replaced, as with columns.
  await expect(page.locator('#child > template')).toHaveCount(0);
});

test('opening: the data-open control is a button over the whole card; click and Enter', async ({ page }) => {
  await open(page);
  const rose = cards(page, 'child').nth(0);
  const control = rose.locator('h3[data-open] > button');
  await expect(control).toHaveText('Rose');
  // A click anywhere on the card (here its price) opens it.
  await clickAt(page, rose.locator('.price'));
  await cards(page, 'child').nth(1).locator('h3 button').focus();
  await page.keyboard.press('Enter');
  expect(await events(page)).toEqual([
    { on: 'child', type: 'dv-open', row: 1 },
    { on: 'child', type: 'dv-open', row: 2 },
  ]);
});

test('each card is named by its open control', async ({ page }) => {
  await open(page);
  await expect(cards(page, 'child').nth(0)).toHaveAccessibleName('Rose');
  await expect(cards(page, 'child').nth(2)).toHaveAccessibleName('Moss <b>soft</b>');
  await expect(cards(page, 'shared-a').nth(1)).toHaveAccessibleName('Fern');
});

test('data-action fires dv-action with the row, and does not open the card', async ({ page }) => {
  await open(page);
  await cards(page, 'child').nth(1).getByRole('button', { name: 'Put one aside' }).click();
  expect(await events(page)).toEqual([
    { on: 'child', type: 'dv-action', id: 'aside', item: { id: 'aside', label: 'Put one aside' }, row: 2 },
  ]);
});

test('<dv-menu> is the row\'s ⋯ menu, with confirm; focus goes back to its button', async ({ page }) => {
  await open(page);
  const card = cards(page, 'child').nth(0);
  const button = card.locator('dv-menu .lfdln-menu-button');
  await expect(button).toHaveAttribute('aria-label', 'What you can do with Rose');
  await button.click();
  await card.getByRole('menuitem', { name: 'Edit' }).click();
  await button.click();
  await card.getByRole('menuitem', { name: 'Delete' }).click();
  const dialog = page.locator('#child dialog.lfdln-menu-confirm');
  await expect(dialog).toContainText('Delete this plant?');
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect.poll(() => events(page)).toEqual([
    { on: 'child', type: 'dv-action', id: 'edit', row: 1 },
    { on: 'child', type: 'dv-action', id: 'delete', row: 1 },
  ]);
  await expect(button).toBeFocused();
});

test('the cards are kept: a redraw while a menu is open moves neither focus nor nodes', async ({ page }) => {
  await open(page);
  const card = cards(page, 'child').nth(0);
  await card.evaluate((li) => ((li as unknown as { mark: number }).mark = 1));
  await card.locator('dv-menu .lfdln-menu-button').focus();
  await page.keyboard.press('Enter');
  const edit = card.getByRole('menuitem', { name: 'Edit' });
  await expect(edit).toBeFocused();
  // A busy flag and a words change both redraw the list.
  await page.evaluate(async () => {
    const el = document.querySelector('#child') as HTMLElement & { busy: boolean; words: object; updateComplete: Promise<unknown> };
    el.busy = true;
    el.words = { more: 'Others' };
    await el.updateComplete;
  });
  await expect(edit).toBeFocused();
  await expect(card.locator('.lfdln-menu-list')).toBeVisible();
  expect(await card.evaluate((li) => (li as unknown as { mark?: number }).mark)).toBe(1);
  await page.keyboard.press('Escape');
  await expect(card.locator('dv-menu .lfdln-menu-button')).toBeFocused();
});

test('one card-template shared by two lists; it wins over a child; href makes links', async ({ page }) => {
  await open(page);
  for (const id of ['shared-a', 'shared-b']) {
    await expect(cards(page, id)).toHaveCount(3);
    await expect(cards(page, id).nth(0).locator('h3')).toHaveText('Rose');
    await expect(cards(page, id).nth(0).locator('.price')).toHaveText('€6.50');
  }
  await expect(page.locator('#shared-b')).not.toContainText('The child loses');
  // -a: the first heading is a link (cardOf's href); the unsafe one is no link, and with columns
  // in HTML and no open-event that card can't be opened at all.
  await expect(cards(page, 'shared-a').nth(0).locator('h3 > a')).toHaveAttribute('href', /#rose$/);
  await expect(cards(page, 'shared-a').nth(2).locator('h3 a, h3 button')).toHaveCount(0);
  await clickAt(page, cards(page, 'shared-a').nth(1).locator('.price'));
  await expect(page).toHaveURL(/#fern$/);
  // -b: buttons.
  await cards(page, 'shared-b').nth(2).locator('h3 > button').click();
  expect(await events(page)).toEqual([{ on: 'shared-b', type: 'dv-open', row: 3 }]);
});

test('<dv-actions> are footer buttons, the rest in ⋯, confirm included', async ({ page }) => {
  await open(page);
  const card = cards(page, 'shared-b').nth(1);
  const actions = card.locator('dv-actions .lfdln-card-actions');
  await expect(actions.locator(':scope > button')).toHaveText(['Edit', 'Share', 'Delete']);
  await actions.getByRole('button', { name: 'Share' }).click();
  await actions.getByRole('button', { name: 'Delete' }).click();
  await page.locator('#shared-b dialog.lfdln-menu-confirm').getByRole('button', { name: 'Delete' }).click();
  await expect.poll(() => events(page)).toEqual([
    { on: 'shared-b', type: 'dv-action', id: 'share', row: 2 },
    { on: 'shared-b', type: 'dv-action', id: 'delete', row: 2 },
  ]);
  await expect(actions.getByRole('button', { name: 'Delete' })).toBeFocused();
});

test('no heading and no data-open: the card can\'t be opened, said once', async ({ page }) => {
  const warnings = await open(page);
  await expect(cards(page, 'no-open')).toHaveCount(3);
  await expect(cards(page, 'no-open').locator('a, button')).toHaveCount(0);
  await clickAt(page, cards(page, 'no-open').nth(0));
  expect(await events(page)).toEqual([]);
  expect(warnings.filter((w) => /can't be opened/.test(w))).toHaveLength(1);
});

test('a missing card-template id: the built-in card, and one warning', async ({ page }) => {
  const warnings = await open(page);
  await expect(page.locator('#missing .lfdln-card')).toHaveCount(3);
  await expect(page.locator('#missing .lfdln-card-title').first()).toHaveText('Rose');
  // A redraw doesn't warn again.
  await page.evaluate(() => ((document.querySelector('#missing') as HTMLElement & { busy: boolean }).busy = true));
  await expect(page.locator('#missing[busy]')).toHaveCount(1);
  expect(warnings.filter((w) => w.includes('"nope"'))).toHaveLength(1);
});

test('the table is unchanged by a card template', async ({ page }) => {
  await open(page);
  await page.locator('#child .dv-layout').getByRole('button', { name: 'Show a table' }).click();
  await expect(page.locator('#child tbody tr')).toHaveCount(3);
  await expect(page.locator('#child tbody tr').first().locator('th')).toHaveText('Rose');
  await page.locator('#child .dv-layout').getByRole('button', { name: 'Show cards' }).click();
  await expect(cards(page, 'child').nth(0).locator('h3')).toHaveText('Rose');
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('custom cards never make the page scroll sideways', async ({ page }) => {
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
