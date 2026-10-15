import { test, expect, type Page } from '@playwright/test';

// Edge cases found in the pre-publish review. Each test adds its own viewer to the demo page
// (the demo defines <lfdln-data-viewer>), so nothing here depends on the demo's own lists.

type Opts = { id: string; attrs?: Record<string, string>; props?: Record<string, unknown>; rows?: number };

// A viewer with `rows` recipes ({ name, minutes, url }) and two or three columns.
async function addViewer(page: Page, o: Opts) {
  await page.evaluate(({ id, attrs, props, rows }) => {
    const el = document.createElement('lfdln-data-viewer') as unknown as HTMLElement & Record<string, unknown>;
    el.id = id;
    for (const [k, v] of Object.entries(attrs ?? {})) el.setAttribute(k, v);
    el.columns = [
      { key: 'name', label: 'Name' },
      { key: 'minutes', label: 'Minutes', type: 'number' },
      { key: 'price', label: 'Price', type: 'money' },
    ];
    Object.assign(el, props ?? {});
    el.rows = Array.from({ length: rows ?? 0 }, (_, i) => ({ name: `Recipe ${i + 1}`, minutes: i, price: i, url: `/r/${i}` }));
    document.body.prepend(el);
  }, o);
}

test('a bookmarked server page survives a host that starts with total = 0', async ({ page }) => {
  await page.goto('/?x.page=3');
  await page.evaluate(() => {
    const el = document.createElement('lfdln-data-viewer') as unknown as HTMLElement & Record<string, unknown>;
    el.id = 'x';
    el.setAttribute('url-state', 'x');
    el.columns = [{ key: 'name', label: 'Name' }];
    // The README's Lit host: rows = [] and total = 0 until the first answer arrives.
    el.rows = [];
    el.total = 0;
    const seen: number[] = [];
    (window as unknown as { seen: number[] }).seen = seen;
    const all = Array.from({ length: 60 }, (_, i) => ({ name: `Recipe ${i + 1}` }));
    el.addEventListener('dv-query', (e) => {
      const q = (e as CustomEvent<{ page: number }>).detail;
      seen.push(q.page);
      setTimeout(() => {
        el.rows = all.slice((q.page - 1) * 20, q.page * 20);
        el.total = 60;
      }, 100);
    });
    document.body.prepend(el);
  });
  const status = page.locator('#x .dv-pages [role=status]');
  await expect(status).toContainText('Page 3 of 3');
  await expect(status).toContainText('Showing 41–60 of 60');
  await expect(page).toHaveURL(/[?&]x\.page=3/);
  expect(await page.evaluate(() => (window as unknown as { seen: number[] }).seen)).toEqual([3]);
});

test('a click that closes a menu does not also open the card under it', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('#things .dv-card');
  await expect(cards).toHaveCount(3);
  const at = async (n: number) => {
    const b = (await cards.nth(n).locator('.dv-card-body').boundingBox())!;
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  };
  await cards.nth(1).locator('button[aria-haspopup=menu]').click();
  await expect(cards.nth(1).locator('.dv-menu')).toBeVisible();
  await at(2);
  await expect(cards.nth(1).locator('.dv-menu')).toBeHidden();
  const events = () => page.evaluate(() => (window as unknown as { events: unknown[] }).events);
  expect(await events()).toEqual([]);
  // The next click is a click again.
  await at(2);
  expect(await events()).toEqual([{ type: 'dv-open', row: 3 }]);
});

test('an empty list says so once', async ({ page }) => {
  await page.goto('/');
  for (const layout of ['table', 'cards']) {
    const id = `empty-${layout}`;
    await addViewer(page, { id, attrs: { layout } });
    const root = page.locator(`#${id} .dv-root`);
    await expect(root.locator('.dv-empty')).toHaveText('Nothing to show.');
    // No pages bar with nothing to page through, and no second copy of the words on screen.
    await expect(root.locator('.dv-pages button')).toHaveCount(0);
    const shown = await root.evaluate((el) => {
      const n: Element[] = [];
      for (const e of el.querySelectorAll('*')) {
        if (e.children.length === 0 && e.textContent?.includes('Nothing to show.') && !e.closest('.dv-sr')) n.push(e);
      }
      return n.length;
    });
    expect(shown).toBe(1);
  }
});

test('a failed first load shows only the error box', async ({ page, context }) => {
  await context.addCookies([{ name: 'dv-fail', value: '1', url: 'http://localhost:4179' }]);
  await page.goto('/adapters.html');
  const flaky = page.locator('#flaky');
  await expect(flaky.locator('.dv-error')).toBeVisible();
  await expect(flaky.locator('.dv-empty')).toHaveCount(0);
  await expect(flaky.locator('.dv-pages')).toHaveCount(0);
  await expect(flaky).not.toContainText('Nothing to show.');
});

test('a bad page-size attribute still pages by 20', async ({ page }) => {
  await page.goto('/');
  for (const [id, size, pages, shown] of [['ps-abc', 'abc', 3, 20], ['ps-0', '0', 3, 20], ['ps-neg', '-5', 45, 1]] as const) {
    await addViewer(page, { id, attrs: { 'page-size': size, layout: 'table' }, rows: 45 });
    await expect(page.locator(`#${id} tbody tr`)).toHaveCount(shown);
    await expect(page.locator(`#${id} .dv-pages [role=status]`)).toContainText(`Page 1 of ${pages}`);
  }
});

test('a typo in currency or lang still shows the list', async ({ page }) => {
  await page.goto('/');
  await addViewer(page, {
    id: 'typo',
    attrs: { lang: 'en_US', layout: 'table' },
    props: {
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'price', label: 'Price', type: 'money', format: { currency: 'EURO' } },
      ],
    },
    rows: 3,
  });
  await expect(page.locator('#typo tbody tr')).toHaveCount(3);
  await expect(page.locator('#typo tbody tr').nth(2).locator('td').first()).toHaveText('2.00');
  await expect(page.locator('#typo .dv-pages [role=status]')).toContainText('Showing 1–3 of 3');
});

test('default cards draw a link column as text, so nothing in the body can be pressed', async ({ page }) => {
  await page.goto('/');
  await addViewer(page, {
    id: 'linkcards',
    attrs: { layout: 'cards' },
    props: { columns: [{ key: 'name', label: 'Name' }, { key: 'url', label: 'Link', type: 'link' }] },
    rows: 2,
  });
  const card = page.locator('#linkcards .dv-card').first();
  await expect(card.locator('.dv-fact')).toHaveText('/r/0');
  await expect(card.locator('.dv-card-body a, .dv-card-body button')).toHaveCount(0);
});

test.describe('default look', () => {
  test('the card footer keeps its meta on one line in a narrow card', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const cards = page.locator('#things .dv-card');
    await expect(cards).toHaveCount(3);
    expect((await cards.first().boundingBox())!.width).toBeLessThan(260);
    const meta = cards.first().locator('.dv-card-meta');
    // line-height is "normal" here, so count lines by the text's own line boxes.
    const lines = await meta.evaluate((el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return new Set([...r.getClientRects()].map((b) => Math.round(b.top))).size;
    });
    expect(lines).toBe(1);
    await expect(meta).toHaveText('2 days ago');
  });

  test('the pages status keeps its two parts apart', async ({ page }) => {
    await page.goto('/');
    const status = page.locator('#local .dv-pages [role=status]');
    await expect(status).toContainText('Showing 1–20 of 60');
    // A visible separator between "of 60" and "Page 1 of 3" (screen readers hear a comma).
    const sep = status.locator('.dv-sep');
    await expect(sep).toBeVisible();
    await expect(sep).toHaveText('·');
    const page1 = (await status.locator('.dv-page').boundingBox())!;
    const s = (await sep.boundingBox())!;
    expect(page1.x).toBeGreaterThanOrEqual(s.x + s.width);
  });

  test('on a phone, Previous and Next share one row', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const pages = page.locator('#remote .dv-pages');
    await expect(pages.locator('[role=status]')).toContainText('Showing 1–20 of 45');
    const prev = (await pages.getByRole('button', { name: 'Previous' }).boundingBox())!;
    const next = (await pages.getByRole('button', { name: 'Next' }).boundingBox())!;
    expect(Math.abs(prev.y - next.y)).toBeLessThan(2);
  });
});

test.describe('colours follow the page, not only the OS', () => {
  test.use({ colorScheme: 'dark' });
  const bg = (page: Page) => page.locator('#local .dv-root').evaluate((el) => getComputedStyle(el).backgroundColor);

  test('a page that says light dark follows a dark OS', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#local .dv-root')).toBeVisible();
    expect(await bg(page)).toBe('rgb(23, 23, 26)');
  });

  test('a light-only page stays light on a dark OS', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#local .dv-root')).toBeVisible();
    // No color-scheme at all: the page is light, and so is the list.
    await page.evaluate(() => document.querySelector('meta[name=color-scheme]')!.remove());
    expect(await bg(page)).toBe('rgb(255, 255, 255)');
    // color-scheme: light, said in CSS.
    await page.evaluate(() => { document.documentElement.style.colorScheme = 'light'; });
    expect(await bg(page)).toBe('rgb(255, 255, 255)');
    await page.screenshot({ path: 'test-results/shots/dark-os-light-page.png' });
  });
});
