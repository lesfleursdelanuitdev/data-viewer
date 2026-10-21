import { test, expect, type Page } from '@playwright/test';

// demo/loading.html: #srv (json adapter, a table, 10 a page, a pager), #cards (json, cards),
// #own (slot="loading" and loading-label), #now (loading-delay="0"), #broken (/api/broken),
// #rows (rows from window.giveRows()). The data comes late: each test holds /api/recipes until it
// lets it go. window.states[id] lists each list's drawings as states (quiet: the loading state
// kept hidden for its wait; loading: shown; bar, list, pager); window.readies lists each dv-ready
// by id.
type Hold = { release: () => void };
async function holdApi(page: Page): Promise<Hold> {
  let release!: () => void;
  const gate = new Promise<void>((ok) => { release = ok; });
  await page.route(/\/api\/(recipes|broken)/, async (route) => { await gate; await route.continue(); });
  return { release };
}
const states = (page: Page, id: string) => page.evaluate((i) => (window as unknown as { states: Record<string, string[]> }).states[i] ?? [], id);
const readies = (page: Page) => page.evaluate(() => (window as unknown as { readies: string[] }).readies);
// whether a list's loading state is shown yet: 'hidden' while it waits, 'visible', or 'none'
const shown = (page: Page, id: string) => page.locator(`#${id}`).evaluate((el) => {
  const sk = el.querySelector('.dv-loading > :not(.dv-sr)');
  return sk ? getComputedStyle(sk).visibility : 'none';
});

test('the skeleton shows until the data arrives, then the whole list replaces it in one step', async ({ page }) => {
  const hold = await holdApi(page);
  await page.goto('/loading.html');
  const srv = page.locator('#srv');
  await expect(srv.locator('.dv-loading')).toBeVisible();
  await expect(srv.locator('.dv-loading [role=status]')).toHaveText('Loading…');
  await expect(srv.locator('.dv-loading')).toHaveAttribute('aria-busy', 'true');
  await expect(srv.locator('.dv-sk-bar')).toBeVisible();
  expect(await srv.locator('.dv-sk-row').count()).toBeGreaterThan(1);
  // nothing of the real list yet
  await expect(srv.locator('.dv-bar, .dv-search, .dv-table, .lfdln-pagination-nav')).toHaveCount(0);
  await expect(srv).not.toHaveAttribute('ready', /.*/);
  // cards in the cards layout
  await expect(page.locator('#cards .dv-sk-cards .dv-sk-card').first()).toBeVisible();
  expect(await readies(page)).toEqual([]);

  hold.release();
  await expect(srv.locator('.dv-table tbody tr')).toHaveCount(10);
  await expect(srv).toHaveAttribute('ready', '');
  // one step: the loading state, then bar, list and pager together, never part of them
  expect(await states(page, 'srv')).toEqual(['quiet', 'loading', 'bar+list+pager']);
  expect(await states(page, 'cards')).toEqual(['quiet', 'loading', 'bar+list+pager']);
});

test('dv-ready fires once per list; later loads are busy, not the loading state', async ({ page }) => {
  const hold = await holdApi(page);
  await page.goto('/loading.html');
  hold.release();
  await expect(page.locator('#srv')).toHaveAttribute('ready', '');
  await expect.poll(async () => (await readies(page)).filter((id) => id === 'srv')).toEqual(['srv']);
  // a new page and a search: busy while loading, never the loading state again
  await page.locator('#srv .lfdln-pagination-nav').getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('#srv .dv-table tbody tr').first()).toBeVisible();
  await page.locator('#srv').getByRole('searchbox').fill('Rose');
  await expect(page.locator('#srv .dv-table tbody tr')).toHaveCount(10);
  await expect(page.locator('#srv .dv-loading')).toHaveCount(0);
  const seen = await states(page, 'srv');
  const drawn = seen.findIndex((s) => s.includes('bar'));
  expect(drawn).toBeGreaterThan(-1);
  expect(seen.slice(drawn).filter((s) => s.includes('loading') || s.includes('quiet'))).toEqual([]);
  expect((await readies(page)).filter((id) => id === 'srv')).toEqual(['srv']);
  // and every list got its one
  await page.evaluate(() => (window as unknown as { giveRows: () => void }).giveRows());
  await expect.poll(async () => [...(await readies(page))].sort()).toEqual(['broken', 'cards', 'now', 'own', 'rows', 'srv']);
});

test('rows the page gives later: the loading state until then', async ({ page }) => {
  await page.goto('/loading.html');
  await expect(page.locator('#srv')).toHaveAttribute('ready', '');
  await expect(page.locator('#rows .dv-loading')).toBeVisible();
  await expect.poll(() => shown(page, 'rows')).toBe('visible');
  await page.evaluate(() => (window as unknown as { giveRows: () => void }).giveRows());
  await expect(page.locator('#rows .dv-table tbody tr')).toHaveCount(2);
  expect(await states(page, 'rows')).toEqual(['quiet', 'loading', 'bar+list+pager']);
});

test('a loading state of the page\'s own (slot="loading") and loading-label', async ({ page }) => {
  const hold = await holdApi(page);
  await page.goto('/loading.html');
  const own = page.locator('#own');
  await expect(own.locator('.dv-loading .own-loading')).toHaveText('Fetching the recipes…');
  await expect(own.locator('.dv-loading [role=status]')).toHaveText('Fetching the recipes');
  await expect(own.locator('.dv-sk-bar, .dv-sk-row')).toHaveCount(0);
  hold.release();
  await expect(own.locator('.dv-table tbody tr')).toHaveCount(5);
  await expect(own.locator('.own-loading')).toHaveCount(0);
});

test('before the script runs, the CSS keeps the space and shows a skeleton', async ({ page }) => {
  await page.goto('/loading.html?late');
  const srv = page.locator('#srv');
  const before = await srv.evaluate((el) => ({
    defined: customElements.get('lfdln-data-viewer') !== undefined,
    height: el.getBoundingClientRect().height,
    image: getComputedStyle(el).backgroundImage,
    columnShown: getComputedStyle(el.querySelector('lfdln-dv-column')!).display,
    visibility: getComputedStyle(el).visibility,
    show: ((cs) => [cs.animationName.split(',')[0]!.trim(), cs.animationDelay.split(',')[0]!.trim()])(getComputedStyle(el)),
    ownShow: ((cs) => [cs.animationName, cs.animationDelay])(getComputedStyle(document.getElementById('own')!)),
    ownChild: getComputedStyle(document.querySelector('#own .own-loading')!).display,
  }));
  expect(before.defined).toBe(false);
  expect(before.height).toBeGreaterThanOrEqual(200);
  expect(before.image).toContain('gradient');
  expect(before.columnShown).toBe('none');
  // quiet for its first 200 ms too, then shown (its own loading child likewise)
  expect(before.visibility).toBe('hidden');
  expect(before.show).toEqual(['lfdln-dv-show', '0.2s']);
  expect(before.ownShow).toEqual(['lfdln-dv-show', '0.2s']);
  expect(before.ownChild).toBe('block');
  await expect(page.locator('#srv')).toHaveAttribute('ready', '', { timeout: 5000 });
});

test('reduced motion: nothing pulses', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const hold = await holdApi(page);
  await page.goto('/loading.html');
  await expect(page.locator('#srv .dv-sk').first()).toBeVisible();
  expect(await page.locator('#srv .dv-sk').first().evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await page.locator('#srv .dv-sk').first().evaluate((e) => getComputedStyle(e).animationName)).toBe('lfdln-dv-pulse');
  hold.release();
});

// docs/calm-loading-plan.md Task 1 (L-Q1, L-Q2): no skeleton flash on a fast load; the list eases in.

test('a fast load never shows the skeleton: the space stays quiet, then the list', async ({ page }) => {
  await page.route('**/api/recipes**', async (route) => { await new Promise((r) => setTimeout(r, 60)); await route.continue(); });
  await page.goto('/loading.html');
  await expect(page.locator('#srv')).toHaveAttribute('ready', '');
  await expect(page.locator('#srv .dv-table tbody tr')).toHaveCount(10);
  expect(await states(page, 'srv')).toEqual(['quiet', 'bar+list+pager']);
});

test('a slow load: quiet for 200 ms, then the skeleton, then the list', async ({ page }) => {
  const hold = await holdApi(page);
  await page.goto('/loading.html');
  await expect(page.locator('#srv .dv-loading')).toHaveCount(1);
  expect(await shown(page, 'srv')).toBe('hidden');
  // the screen reader's line is there from the start
  await expect(page.locator('#srv .dv-loading [role=status]')).toHaveText('Loading…');
  await expect.poll(() => shown(page, 'srv')).toBe('visible');
  hold.release();
  await expect(page.locator('#srv .dv-table tbody tr')).toHaveCount(10);
});

test('the quiet space keeps the skeleton\'s height, so nothing below jumps', async ({ page }) => {
  const hold = await holdApi(page);
  await page.goto('/loading.html');
  await expect(page.locator('#srv .dv-loading')).toHaveCount(1);
  const quiet = await page.locator('#srv').evaluate((el) => el.getBoundingClientRect().height);
  await expect.poll(() => shown(page, 'srv')).toBe('visible');
  const skeleton = await page.locator('#srv').evaluate((el) => el.getBoundingClientRect().height);
  expect(quiet).toBe(skeleton);
  hold.release();
});

test('loading-delay="0": the skeleton at once, as before', async ({ page }) => {
  const hold = await holdApi(page);
  await page.goto('/loading.html');
  await expect(page.locator('#now .dv-loading')).toHaveCount(1);
  expect(await shown(page, 'now')).toBe('visible');
  expect((await states(page, 'now'))[0]).toBe('loading');
  hold.release();
});

test('a load that fails at once shows its error box at once, and dv-ready once', async ({ page }) => {
  await page.route('**/api/broken**', (route) => route.fulfill({ status: 500, body: 'no' }));
  await page.goto('/loading.html');
  await expect(page.locator('#broken')).toHaveAttribute('ready', '');
  await expect(page.locator('#broken .dv-loading')).toHaveCount(0);
  expect(await states(page, 'broken')).not.toContain('loading');
  await expect.poll(async () => (await readies(page)).filter((id) => id === 'broken')).toEqual(['broken']);
});

test('the first full drawing eases in over 150 ms; later loads don\'t', async ({ page }) => {
  const hold = await holdApi(page);
  await page.goto('/loading.html');
  hold.release();
  const root = page.locator('#srv > .dv-root');
  await expect(page.locator('#srv')).toHaveAttribute('ready', '');
  // the arrival seen on the root as it is drawn, before the animation ends
  const anim = await page.evaluate(() => (window as unknown as { arrivals: Record<string, [string, string]> }).arrivals.srv);
  expect(anim).toEqual(['lfdln-dv-arrive', '0.15s']);
  // done; a new page keeps the same root, which doesn't ease in again
  await expect.poll(() => root.evaluate((e) => e.getAnimations().length)).toBe(0);
  await root.evaluate((e) => { (window as unknown as { firstRoot: Element }).firstRoot = e; });
  await page.locator('#srv .lfdln-pagination-nav').getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('#srv .dv-table tbody tr').first()).toBeVisible();
  expect(await root.evaluate((e) => e === (window as unknown as { firstRoot: Element }).firstRoot)).toBe(true);
  expect(await root.evaluate((e) => e.getAnimations().length)).toBe(0);
});

test('reduced motion: the list arrives without easing in', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/loading.html');
  await expect(page.locator('#srv')).toHaveAttribute('ready', '');
  const anim = await page.evaluate(() => (window as unknown as { arrivals: Record<string, [string, string]> }).arrivals.srv);
  expect(anim?.[0]).toBe('none');
});

test('the script arriving late: the CSS skeleton already showing stays shown, no blink', async ({ page }) => {
  const hold = await holdApi(page);
  await page.goto('/loading.html?late');
  await expect.poll(() => page.evaluate(() => customElements.get('lfdln-data-viewer') !== undefined)).toBe(true);
  await expect(page.locator('#srv .dv-loading')).toHaveCount(1);
  // the page has been open over 400 ms: its wait is over, so the element's loading state shows at once
  expect(await shown(page, 'srv')).toBe('visible');
  expect((await states(page, 'srv'))[0]).toBe('loading');
  hold.release();
  await expect(page.locator('#srv')).toHaveAttribute('ready', '');
});

test('under a Content-Security-Policy without inline style attributes, nothing is blocked', async ({ page }) => {
  // the shop admin's policy allows no style="" in markup (CSSOM writes are fine)
  await page.route('**/loading.html', async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': "style-src-attr 'none'" } });
  });
  await page.addInitScript(() => {
    (window as unknown as { blocked: string[] }).blocked = [];
    document.addEventListener('securitypolicyviolation', (e) => (window as unknown as { blocked: string[] }).blocked.push(e.effectiveDirective));
  });
  const hold = await holdApi(page);
  await page.goto('/loading.html');
  await expect(page.locator('#srv .dv-loading')).toHaveCount(1);
  expect(await shown(page, 'srv')).toBe('hidden');
  await expect.poll(() => shown(page, 'srv')).toBe('visible');
  hold.release();
  await expect(page.locator('#srv')).toHaveAttribute('ready', '');
  expect(await page.evaluate(() => (window as unknown as { blocked: string[] }).blocked)).toEqual([]);
});

test('the wait ends whatever the page\'s CSS animates: its own loading child with an animation, and a reset of all animations', async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = '.own-loading { animation: own-spin 1s linear infinite; } @keyframes own-spin { to { rotate: 360deg; } } #srv * { animation: none !important; }';
      document.head.append(s);
    });
  });
  const hold = await holdApi(page);
  await page.goto('/loading.html');
  await expect(page.locator('#own .dv-loading .own-loading')).toHaveCount(1);
  await expect.poll(() => page.locator('#own .own-loading').evaluate((e) => getComputedStyle(e).visibility)).toBe('visible');
  await expect.poll(() => shown(page, 'srv')).toBe('visible');
  hold.release();
});
