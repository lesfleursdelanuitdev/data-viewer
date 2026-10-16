import { test, expect, type Page } from '@playwright/test';

// demo/filter-styles.html: #plants (12 plants, today's dialog); #test (the same with
// filter-style="probe", a test style the page registers 200 ms after the lists have drawn: it
// draws <p class="probe">countFor</p> and shows applied filters itself); #missing
// (filter-style="nope", which is never loaded).
async function open(page: Page, query = '') {
  const problems: string[] = [];
  const warnings: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'warning') warnings.push(m.text());
  });
  await page.goto(`/filter-styles.html${query}`);
  await expect(page.locator('#plants tbody tr').first()).toBeVisible();
  return { problems, warnings };
}

test.describe('filter-style', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('an unknown style shows the dialog and warns once', async ({ page }) => {
    const { problems, warnings } = await open(page);
    await expect(page.locator('#missing .lfdln-filter-button')).toBeVisible();
    // Draw the list again a few times: still one warning.
    await page.locator('#missing .lfdln-filter-button').click();
    await page.keyboard.press('Escape');
    await page.locator('#missing').getByRole('button', { name: 'Name' }).click();
    await expect.poll(() => warnings.filter((w) => w.includes('filter-style="nope"')).length).toBe(1);
    await page.waitForTimeout(300);
    const nope = warnings.filter((w) => w.includes('filter-style="nope"'));
    expect(nope).toHaveLength(1);
    expect(nope[0]).toContain('data-viewer-filter-nope.js');
    expect(problems).toEqual([]);
  });

  test('a style registered later replaces the dialog', async ({ page }) => {
    const { problems } = await open(page);
    await expect(page.locator('#test .probe')).toHaveCount(1); // empty while countFor is null, so not "visible"
    await expect(page.locator('#test .lfdln-filter-button')).toHaveCount(0);
    // The others keep the dialog.
    await expect(page.locator('#plants .lfdln-filter-button')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('a style that shows applied filters turns the chips row off', async ({ page }) => {
    await open(page, '?test.f.kind=Herb&plants.f.kind=Herb');
    await expect(page.locator('#test .probe')).toHaveCount(1); // empty while countFor is null, so not "visible"
    await expect(page.locator('#test tbody tr')).toHaveCount(5);
    await expect(page.locator('#test .lfdln-filter-chips')).toHaveCount(0);
    // Today's dialog still has its chips row.
    await expect(page.locator('#plants .lfdln-filter-chips')).toBeVisible();
  });
});
