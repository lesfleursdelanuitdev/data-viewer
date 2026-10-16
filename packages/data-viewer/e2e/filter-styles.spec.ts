import { test, expect, type Page } from '@playwright/test';

// demo/filter-styles.html: #plants (12 plants, today's dialog); #test (the same with
// filter-style="probe", a test style the page registers 200 ms after the lists have drawn: it
// draws <p class="probe">countFor</p> and shows applied filters itself); #missing
// (filter-style="nope", which is never loaded); #served (the probe, in server mode: the page
// answers dv-query itself, no adapter); #server (the probe on /api/recipes through the json
// adapter: 45 recipes, filterable by cuisine on the server); #counting (the same through an
// adapter whose count() always says 999). The probe puts view.countFor, view.results and
// view.total in data-*; its "draft" button opens the draft and sets it to the list's data-draft
// (JSON, { kind: ['Herb'] } without one), and "close" closes it.
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

  test('the view says how many rows the applied filters leave, and how many there are', async ({ page }) => {
    await open(page, '?test.f.kind=Herb');
    // Browser mode: 5 herbs of 12 plants.
    await expect(page.locator('#test .probe')).toHaveAttribute('data-results', '5');
    await expect(page.locator('#test .probe')).toHaveAttribute('data-total', '12');
    // Served by the page: results is the host's total; there is no total before filters.
    await expect(page.locator('#served .probe')).toHaveAttribute('data-results', '12');
    await expect(page.locator('#served .probe')).toHaveAttribute('data-total', 'null');
    await page.evaluate(() => {
      (document.querySelector('#served') as HTMLElement & { total: number }).total = 7;
    });
    await expect(page.locator('#served .probe')).toHaveAttribute('data-results', '7');
  });
});

// The draft count requests (size=1) that reach /api/recipes, as their f.cuisine.
function countRequests(page: Page): string[] {
  const asked: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname === '/api/recipes' && u.searchParams.get('size') === '1') asked.push(u.searchParams.get('f.cuisine') ?? '');
  });
  return asked;
}

async function draft(page: Page, id: string, cuisine: string[]) {
  const list = page.locator(`#${id}`);
  await list.evaluate((el, c) => {
    (el as HTMLElement).dataset.draft = JSON.stringify({ cuisine: c });
  }, cuisine);
  await list.locator('.probe-draft').click();
}

test.describe('countFor', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('browser mode counts the draft at once', async ({ page }) => {
    await open(page);
    await expect(page.locator('#test .probe')).toHaveAttribute('data-count', 'null');
    // In the same update as the click, no wait: Mint, Basil, Sage, Thyme and Rosemary.
    const text = await page.locator('#test').evaluate(async (el) => {
      (el.querySelector('.probe-draft') as HTMLButtonElement).click();
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      return el.querySelector('.probe')!.textContent;
    });
    expect(text).toBe('5');
    await page.locator('#test .probe-close').click();
    await expect(page.locator('#test .probe')).toHaveAttribute('data-count', 'null');
  });

  test('server mode asks once, 300 ms after the last change', async ({ page }) => {
    const asked = countRequests(page);
    await open(page);
    await expect(page.locator('#server tbody tr').first()).toBeVisible();
    for (const c of [['Persian'], ['Indian'], ['Persian', 'Indian']]) {
      await draft(page, 'server', c);
      await page.waitForTimeout(100);
    }
    // 12 Persian + 11 Indian of 45.
    await expect(page.locator('#server .probe')).toHaveText('23', { timeout: 1000 });
    await page.waitForTimeout(400);
    expect(asked).toEqual(['Persian,Indian']);
  });

  test('an older count never replaces a newer one', async ({ page }) => {
    // The first count request answers after 800 ms.
    let first = true;
    await page.route((u) => u.pathname === '/api/recipes' && u.searchParams.get('size') === '1', (route) => {
      if (!first) return route.continue();
      first = false;
      const u = new URL(route.request().url());
      u.searchParams.set('slowcount', '1');
      return route.continue({ url: u.href });
    });
    await open(page);
    await expect(page.locator('#server tbody tr').first()).toBeVisible();
    await page.locator('#server').evaluate((el) => {
      const seen: string[] = [];
      (window as unknown as { seen: string[] }).seen = seen;
      new MutationObserver(() => seen.push(el.querySelector('.probe')?.getAttribute('data-count') ?? ''))
        .observe(el, { subtree: true, childList: true, characterData: true, attributes: true });
    });
    await draft(page, 'server', ['Persian']);
    await page.waitForTimeout(400);
    await draft(page, 'server', ['Persian', 'Indian']);
    await expect(page.locator('#server .probe')).toHaveText('23');
    await page.waitForTimeout(900);
    await expect(page.locator('#server .probe')).toHaveText('23');
    const seen = await page.evaluate(() => (window as unknown as { seen: string[] }).seen);
    expect(seen).not.toContain('12');
  });

  test('a failed count leaves countFor null', async ({ page, context }) => {
    const asked = countRequests(page);
    await open(page);
    await expect(page.locator('#server tbody tr').first()).toBeVisible();
    await context.addCookies([{ name: 'dv-fail', value: '1', url: new URL(page.url()).origin }]);
    await draft(page, 'server', ['Persian']);
    await expect.poll(() => asked.length).toBe(1);
    await page.waitForTimeout(300);
    await expect(page.locator('#server .probe')).toHaveAttribute('data-count', 'null');
    // A count is not the list's load: no error box.
    await expect(page.locator('#server .dv-error')).toHaveCount(0);
  });

  test('adapter.count wins over load when present', async ({ page }) => {
    const asked = countRequests(page);
    await open(page);
    await expect(page.locator('#counting tbody tr').first()).toBeVisible();
    await draft(page, 'counting', ['Persian']);
    await expect(page.locator('#counting .probe')).toHaveText('999');
    expect(asked).toEqual([]);
  });

  test('closing the draft cancels its count', async ({ page }) => {
    const asked = countRequests(page);
    await open(page);
    await expect(page.locator('#server tbody tr').first()).toBeVisible();
    await draft(page, 'server', ['Persian']);
    await page.locator('#server .probe-close').click();
    await page.waitForTimeout(600);
    expect(asked).toEqual([]);
    await expect(page.locator('#server .probe')).toHaveAttribute('data-count', 'null');
  });

  test('a page that serves its own rows has no count', async ({ page }) => {
    await open(page);
    await page.locator('#served .probe-draft').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#served .probe')).toHaveAttribute('data-count', 'null');
  });
});
