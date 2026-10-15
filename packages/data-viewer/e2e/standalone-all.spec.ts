import { test, expect, type Page } from '@playwright/test';

// demo/standalone-all.html loads the menu, pagination, card and viewer standalone scripts on one
// page (standalone-all-viewer-first.html: the viewer's first). Each defines its tags only when they are free, ids
// come from one page-wide counter, and each package's style goes in once.
async function open(page: Page, query: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/standalone-all${query}.html`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
  await expect(page.locator('#v .lfdln-card')).toHaveCount(5);
  return errors;
}

for (const query of ['', '-viewer-first']) {
  test(`every script on one page${query ? ', the viewer first' : ''}: no errors, every tag works, no clashing ids`, async ({ page }) => {
    const errors = await open(page, query);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { problems: string[] }).problems)).toEqual([]);
    const defined = await page.evaluate(() =>
      ['lfdln-menu', 'lfdln-pagination', 'lfdln-card', 'lfdln-data-viewer', 'lfdln-dv-column'].map((t) => Boolean(customElements.get(t))));
    expect(defined).toEqual([true, true, true, true, true]);
    for (const id of ['lfdln-menu-style', 'lfdln-pagination-style', 'lfdln-card-style', 'lfdln-dv-style']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
    // Every id on the page is unique (menus from different scripts included).
    const dupes = await page.evaluate(() => {
      const seen = new Map<string, number>();
      for (const el of document.querySelectorAll('[id]')) seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
      return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
    });
    expect(dupes).toEqual([]);
    // They all still work.
    await page.locator('#m .lfdln-menu-button').click();
    await expect(page.locator('#m .lfdln-menu-list')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('#p').getByRole('button', { name: 'Page 2' }).click();
    await expect(page.locator('#p [role=status]')).toContainText('Showing 11–20 of 50');
    await page.locator('#v .lfdln-pagination-nav').getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('#v .lfdln-pagination-nav [role=status]')).toContainText('Showing 6–10 of 30');
    await page.locator('#v .lfdln-card').first().locator('.lfdln-menu-button').click();
    await expect(page.locator('#v .lfdln-card').first().locator('.lfdln-menu-list')).toBeVisible();
  });
}

test('theming the viewer with --dv-* themes its menus, pager and cards', async ({ page }) => {
  await open(page, '');
  const v = page.locator('#v');
  await expect(v.locator('.lfdln-card').first()).toHaveCSS('border-top-left-radius', '3px');
  await expect(v.locator('.lfdln-card').first()).toHaveCSS('background-color', 'rgb(250, 240, 200)');
  await expect(v.locator('.lfdln-menu-button').first()).toHaveCSS('border-top-left-radius', '3px');
  await expect(v.locator('.lfdln-pagination-current')).toHaveCSS('border-top-color', 'rgb(200, 0, 100)');
  // Outside the viewer, the packages keep their own defaults.
  await expect(page.locator('#c .lfdln-card')).toHaveCSS('border-top-left-radius', '8px');
  await expect(page.locator('#p .lfdln-pagination-current')).not.toHaveCSS('border-top-color', 'rgb(200, 0, 100)');
});
