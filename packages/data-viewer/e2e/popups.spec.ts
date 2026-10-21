import { test, expect, type Locator, type Page } from '@playwright/test';

// Even spacing in every pop-up (the house style, docs/design.md): the left padding equals the
// right one and the top equals the bottom (±1 px), through the shared --lfdln-pop-* tokens.
// The ⋯ menu (select.html #heads), the row's More menu (card-actions.html #row), the Filter
// panel and its phone sheet (filter-styles.html #panel). Sort by and Rows per page are the select
// package's dropdowns (sort-cards.spec.ts checks their spacing; their open list is the browser's).

type Pad = { top: number; right: number; bottom: number; left: number };
const pad = (el: Locator): Promise<Pad> => el.evaluate((e) => {
  const cs = getComputedStyle(e);
  return { top: parseFloat(cs.paddingTop), right: parseFloat(cs.paddingRight), bottom: parseFloat(cs.paddingBottom), left: parseFloat(cs.paddingLeft) };
});
async function evenSides(el: Locator, what: string, vertical = true) {
  const p = await pad(el);
  expect(Math.abs(p.left - p.right), `${what} left/right ${JSON.stringify(p)}`).toBeLessThanOrEqual(1);
  if (vertical) expect(Math.abs(p.top - p.bottom), `${what} top/bottom ${JSON.stringify(p)}`).toBeLessThanOrEqual(1);
}

async function menuIsEven(page: Page, list: Locator, what: string) {
  await expect(list).toBeVisible();
  await evenSides(list, `${what} list`);
  for (const item of await list.locator('.lfdln-menu-item:visible').all()) await evenSides(item, `${what} item`);
  for (const h of await list.locator('.lfdln-menu-heading').all()) await evenSides(h, `${what} heading`);
  // the item's text starts as far from the list's left edge as the widest item ends from its right
  const [l, first] = await Promise.all([list.boundingBox(), list.locator('.lfdln-menu-item:visible').first().boundingBox()]);
  expect(Math.abs((first!.x - l!.x) - (l!.x + l!.width - first!.x - first!.width))).toBeLessThanOrEqual(1);
  await page.keyboard.press('Escape');
}

for (const [where, viewport] of [['wide', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]] as const) {
  test.describe(`pop-ups (${where})`, () => {
    test.use({ viewport });

    test('the card ⋯ menu', async ({ page }) => {
      await page.goto('/select.html');
      const card = page.locator('#heads li.lfdln-card').first();
      await card.scrollIntoViewIfNeeded();
      await card.locator('.lfdln-menu-button').click();
      await menuIsEven(page, card.locator('.lfdln-menu-list'), '⋯');
    });

    test('the row of buttons\' More menu', async ({ page }) => {
      await page.goto('/card-actions.html');
      const more = page.locator('#row .lfdln-card-more .lfdln-menu-button').first();
      await more.scrollIntoViewIfNeeded();
      await more.click();
      await menuIsEven(page, page.locator('#row .lfdln-card-more .lfdln-menu-list').first(), 'More');
    });

    test('the Filter panel (a sheet on phones)', async ({ page }) => {
      await page.goto('/filter-styles.html');
      const trigger = page.locator('#panel .lfdln-filter-trigger');
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      const panel = page.locator('#panel .lfdln-filter-panel');
      await expect(panel).toBeVisible();
      const head = panel.locator('.lfdln-filter-panel-head');
      const body = panel.locator('.lfdln-filter-panel-body');
      const foot = panel.locator('.lfdln-filter-panel-foot');
      await evenSides(head, 'head', false);
      await evenSides(body, 'body');
      await evenSides(foot, 'foot');
      // the same space at the left and the right of all three, and at the top and the bottom
      const [h, b, f] = await Promise.all([pad(head), pad(body), pad(foot)]);
      expect(new Set([h.left, b.left, f.left, h.right, b.right, f.right]).size).toBe(1);
      expect(Math.abs(h.top - f.bottom)).toBeLessThanOrEqual(1);
      if (where === 'phone') {
        // the sheet's handle: as much room above it as between it and the title row
        const handle = (await panel.locator('.lfdln-filter-handle').boundingBox())!;
        const box = (await panel.boundingBox())!;
        const title = (await head.boundingBox())!;
        expect(Math.abs((handle.y - box.y) - (title.y + h.top - handle.y - handle.height))).toBeLessThanOrEqual(1);
      }
    });
  });
}
