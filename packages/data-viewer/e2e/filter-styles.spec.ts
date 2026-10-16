import { test, expect, type Page } from '@playwright/test';

// demo/filter-styles.html: #plants (12 plants, today's dialog); #test (the same with
// filter-style="probe", a test style the page registers 200 ms after the lists have drawn: it
// draws <p class="probe">countFor</p> and shows applied filters itself); #missing
// (filter-style="nope", which is never loaded); #served (the probe, in server mode: the page
// answers dv-query itself, no adapter); #server (the probe on /api/recipes through the json
// adapter: 45 recipes, filterable by cuisine on the server); #recipes (the same with today's
// dialog, no filter-style); #counting (the same through an
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

  test("today's dialog in server mode asks for no counts", async ({ page }) => {
    const asked = countRequests(page);
    await open(page);
    const list = page.locator('#recipes');
    await expect(list.locator('tbody tr').first()).toBeVisible();
    await list.locator('.lfdln-filter-button').click();
    await list.getByRole('dialog').getByRole('option', { name: 'Persian' }).click();
    await expect(list.getByRole('dialog').getByRole('option', { name: 'Persian' })).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(600);
    expect(asked).toEqual([]);
  });

  test('a page that serves its own rows has no count', async ({ page }) => {
    await open(page);
    await page.locator('#served .probe-draft').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#served .probe')).toHaveAttribute('data-count', 'null');
  });
});

// #panel: the 12 plants with filter-style="panel" (Kind: Flower 3, Foliage 3, Herb 5, Tree 1;
// Light: Sun 7, Shade 3, Part shade 2; Price in three money ranges; In stock, 9 of 12, with a
// hint). #panel-equals: the recipes through an adapter that only filters by equality, so
// Cuisine is single choice with 4 options: a segmented control. #panel-server: the recipes
// through the json adapter (server mode).
test.describe('panel', () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  const panelOf = (page: Page, id = 'panel') => page.locator(`#${id} .lfdln-filter-panel`);
  const trigger = (page: Page, id = 'panel') => page.locator(`#${id} .lfdln-filter-trigger`);
  const toggle = (page: Page, name: string, id = 'panel') => panelOf(page, id).locator(`.lfdln-filter-toggle[data-value="${name}"]`);
  const show = (page: Page, id = 'panel') => panelOf(page, id).locator('.lfdln-filter-show');

  test('the trigger shows a count badge and the applied chips', async ({ page }) => {
    const { problems } = await open(page, '?panel.f.kind=Herb,Fern');
    await expect(trigger(page)).toBeVisible();
    await expect(trigger(page).locator('.lfdln-filter-badge')).toHaveText('2');
    // The chips sit beside the button, in the same row; the viewer's own chips row is off.
    const chips = page.locator('#panel .lfdln-filter-panel-root .lfdln-filter-tag');
    await expect(chips).toHaveText(['Herb', 'Fern']);
    // Measured together: the lists above may still be loading and moving this one down.
    const [b, c] = await page.locator('#panel').evaluate((el) => ['.lfdln-filter-trigger', '.lfdln-filter-tag']
      .map((s) => el.querySelector(s)!.getBoundingClientRect().toJSON() as DOMRect));
    expect(Math.abs(b!.y + b!.height / 2 - (c!.y + c!.height / 2))).toBeLessThan(4);
    expect(c!.x).toBeGreaterThan(b!.x + b!.width);
    await expect(page.locator('#panel .dv-root > .lfdln-filter-chips')).toHaveCount(0);
    await expect(page.locator('#panel tbody tr')).toHaveCount(5);
    // × applies at once.
    await page.locator('#panel').getByRole('button', { name: 'Remove Herb' }).click();
    await expect(page.locator('#panel tbody tr')).toHaveCount(0);
    await expect(trigger(page).locator('.lfdln-filter-badge')).toHaveText('1');
    expect(problems).toEqual([]);
  });

  test('one panel, every section visible, Reset only with a draft', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    const panel = panelOf(page);
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('role', 'dialog');
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(panel.locator('.lfdln-filter-panel-label')).toHaveText(['Kind', 'Light', 'Price']);
    await expect(panel.getByRole('switch', { name: 'In stock' })).toBeVisible();
    expect((await panel.boundingBox())!.width).toBe(400);
    // The results behind dim while it is open.
    await expect(page.locator('#panel .dv-root')).toHaveAttribute('data-filter-open', '');
    await expect(page.locator('#panel .dv-table-wrap')).toHaveCSS('opacity', '0.35');
    await expect(page.locator('#panel .dv-bar')).toHaveCSS('opacity', '1');
    await expect(panel.getByRole('button', { name: 'Reset' })).toHaveCount(0);
    await toggle(page, 'Herb').click();
    await expect(toggle(page, 'Herb')).toHaveAttribute('aria-pressed', 'true');
    await panel.getByRole('button', { name: 'Reset' }).click();
    await expect(toggle(page, 'Herb')).toHaveAttribute('aria-pressed', 'false');
    await expect(panel.getByRole('button', { name: 'Reset' })).toHaveCount(0);
    // Only one panel: the other lists' filters stay closed.
    await expect(page.locator('.lfdln-filter-panel')).toHaveCount(1);
  });

  test('the button counts the draft', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    await expect(show(page)).toHaveText('Show 12 results');
    await toggle(page, 'Herb').click();
    await expect(show(page)).toHaveText('Show 5 results');
    // The counts follow the draft: no herb likes shade.
    await expect(toggle(page, 'Shade')).toContainText('0');
    await toggle(page, 'Shade').click();
    await expect(show(page)).toHaveText('Nothing matches');
    await toggle(page, 'Shade').click();
    await show(page).click();
    await expect(panelOf(page)).toHaveCount(0);
    await expect(page.locator('#panel tbody tr')).toHaveCount(5);
    await expect(trigger(page)).toBeFocused();
    await expect(page.locator('#panel .dv-root')).not.toHaveAttribute('data-filter-open', '');
  });

  test('× on an applied chip while the panel is open drops it from the draft too', async ({ page }) => {
    await open(page, '?panel.f.kind=Herb,Flower');
    await trigger(page).click();
    await expect(toggle(page, 'Herb')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#panel').getByRole('button', { name: 'Remove Herb' }).click();
    await expect(page.locator('#panel tbody tr')).toHaveCount(3);
    await expect(panelOf(page)).toBeVisible();
    await expect(toggle(page, 'Herb')).toHaveAttribute('aria-pressed', 'false');
    // Show applies the draft as it is now: Herb stays removed.
    await show(page).click();
    await expect(panelOf(page)).toHaveCount(0);
    await expect(page.locator('#panel tbody tr')).toHaveCount(3);
    await expect(page.locator('#panel .lfdln-filter-tag')).toHaveText(['Flower']);
  });

  test('Cancel and Esc drop the draft', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    await toggle(page, 'Herb').click();
    await panelOf(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(panelOf(page)).toHaveCount(0);
    await expect(page.locator('#panel tbody tr')).toHaveCount(12);
    await expect(trigger(page)).toBeFocused();
    await trigger(page).click();
    await expect(toggle(page, 'Herb')).toHaveAttribute('aria-pressed', 'false');
    await toggle(page, 'Herb').click();
    await page.keyboard.press('Escape');
    await expect(panelOf(page)).toHaveCount(0);
    await expect(page.locator('#panel tbody tr')).toHaveCount(12);
    await expect(trigger(page)).toBeFocused();
    // A click outside drops it too.
    await trigger(page).click();
    await page.locator('h1').click();
    await expect(panelOf(page)).toHaveCount(0);
  });

  test('zero-count chips dim to 0.45 and stay clickable', async ({ page }) => {
    await open(page, '?panel.f.light=Shade');
    await trigger(page).click();
    const herb = toggle(page, 'Herb');
    await expect(herb.locator('.lfdln-filter-toggle-count')).toHaveText('0');
    await expect(herb).toHaveCSS('opacity', '0.45');
    await expect(toggle(page, 'Foliage')).toHaveCSS('opacity', '1');
    await herb.click();
    await expect(herb).toHaveAttribute('aria-pressed', 'true');
    // Picked, it is not dimmed.
    await expect(herb).toHaveCSS('opacity', '1');
  });

  test('the histogram highlights the drafted range', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    const bars = panelOf(page).locator('.lfdln-filter-hist .lfdln-filter-bar');
    await expect(bars).toHaveCount(12);
    // 1.50 to 120 in 12 buckets: 11 plants in the first, 12.50 in the second, 120 in the last.
    const on = () => bars.evaluateAll((els) => els.map((e, i) => (e.classList.contains('lfdln-filter-bar-on') ? i : -1)).filter((i) => i >= 0));
    expect(await on()).toEqual([0, 1, 11]);
    await toggle(page, '€5–€10').click();
    await expect(toggle(page, '€5–€10')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(on).toEqual([0]);
    expect((await bars.nth(0).boundingBox())!.height).toBe(40);
  });

  test('a single choice of 5 or fewer is a segmented control, arrow keys move', async ({ page }) => {
    await open(page);
    await expect(page.locator('#panel-equals tbody tr').first()).toBeVisible();
    await trigger(page, 'panel-equals').click();
    const seg = panelOf(page, 'panel-equals').getByRole('radiogroup', { name: 'Cuisine' });
    await expect(seg.getByRole('radio')).toHaveText(['Any', 'Persian', 'Indian', 'French', 'Turkish']);
    await expect(seg.getByRole('radio', { name: 'Any' })).toHaveAttribute('aria-checked', 'true');
    await seg.getByRole('radio', { name: 'Any' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(seg.getByRole('radio', { name: 'Persian' })).toHaveAttribute('aria-checked', 'true');
    await expect(seg.getByRole('radio', { name: 'Persian' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(seg.getByRole('radio', { name: 'Indian' })).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(seg.getByRole('radio', { name: 'Persian' })).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('End');
    await expect(seg.getByRole('radio', { name: 'Turkish' })).toBeFocused();
    await expect(seg.getByRole('radio', { name: 'Turkish' })).toHaveAttribute('aria-checked', 'true');
    // One stop in the tab order.
    await expect(seg.locator('[tabindex="0"]')).toHaveCount(1);
    await page.keyboard.press('Home');
    await expect(seg.getByRole('radio', { name: 'Any' })).toHaveAttribute('aria-checked', 'true');
    // The multi-choice Light of #panel stays chips.
    await page.keyboard.press('Escape');
    await trigger(page).click();
    await expect(panelOf(page).getByRole('radiogroup')).toHaveCount(0);
    await expect(toggle(page, 'Part shade')).toBeVisible();
  });

  test('stock is a switch, Space toggles it, the hint shows', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    const sw = panelOf(page).getByRole('switch', { name: 'In stock' });
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await expect(panelOf(page).getByText('Hide plants that are sold out')).toBeVisible();
    // Named by its label only; the hint is its description, said once.
    await expect(sw).toHaveAccessibleName('In stock');
    await expect(sw).toHaveAccessibleDescription('Hide plants that are sold out');
    const box = (await sw.boundingBox())!;
    expect([box.width, box.height]).toEqual([34, 20]);
    await sw.focus();
    await page.keyboard.press('Space');
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await expect(show(page)).toHaveText('Show 9 results');
    await page.keyboard.press('Space');
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    // The label text toggles it too.
    await panelOf(page).getByText('In stock', { exact: true }).click();
    await expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  test('a bookmarked value that no longer exists still shows as a chip and clears', async ({ page }) => {
    await open(page, '?panel.f.kind=Cactus');
    await expect(page.locator('#panel tbody tr')).toHaveCount(0);
    await expect(page.locator('#panel .lfdln-filter-tag')).toHaveText(['Cactus']);
    await expect(trigger(page).locator('.lfdln-filter-badge')).toHaveText('1');
    // In the panel too, picked, so it can be unticked there.
    await trigger(page).click();
    await expect(toggle(page, 'Cactus')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await page.locator('#panel').getByRole('button', { name: 'Remove Cactus' }).click();
    await expect(page.locator('#panel tbody tr')).toHaveCount(12);
    await expect(page.locator('#panel .lfdln-filter-tag')).toHaveCount(0);
    await expect(trigger(page).locator('.lfdln-filter-badge')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.has('panel.f.kind')).toBe(false);
  });

  test('server mode: "Show results" until the count comes', async ({ page }) => {
    // Every count request answers after 800 ms.
    await page.route((u) => u.pathname === '/api/recipes' && u.searchParams.get('size') === '1', (route) => {
      const u = new URL(route.request().url());
      u.searchParams.set('slowcount', '1');
      return route.continue({ url: u.href });
    });
    await open(page);
    await expect(page.locator('#panel-server tbody tr').first()).toBeVisible();
    await trigger(page, 'panel-server').click();
    await toggle(page, 'Persian', 'panel-server').click();
    await expect(show(page, 'panel-server')).toHaveText('Show results');
    await expect(show(page, 'panel-server')).toHaveText('Show 12 results', { timeout: 3000 });
    // No histogram in server mode.
    await expect(panelOf(page, 'panel-server').locator('.lfdln-filter-hist')).toHaveCount(0);
  });
});

test.describe('panel on a phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('phone: the same content in a bottom sheet, rows at least 44 px tall', async ({ page }) => {
    await open(page);
    const t = page.locator('#panel .lfdln-filter-trigger');
    await t.scrollIntoViewIfNeeded();
    expect((await t.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await t.click();
    const sheet = page.locator('#panel dialog.lfdln-filter-panel');
    await expect(sheet).toBeVisible();
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.y + box.height)).toBe(800);
    expect(box.width).toBe(390);
    await expect(sheet.locator('.lfdln-filter-panel-label')).toHaveText(['Kind', 'Light', 'Price']);
    for (const el of await sheet.locator('.lfdln-filter-toggle, .lfdln-filter-switch-row, .lfdln-filter-panel-foot button').all()) {
      expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    // No sideways scroll.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await sheet.locator('.lfdln-filter-toggle[data-value="Herb"]').click();
    await expect(sheet.locator('.lfdln-filter-show')).toHaveText('Show 5 results');
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(page.locator('#panel tbody tr')).toHaveCount(12);
  });
});

// #bar: the plants with filter-style="bar", url-state "bar", and a "Cared for by" column with 30
// people (Rose Smith-Montgomery cares for Rose, Ana Okafor for Rosemary; 18 care for none).
// window.barQueries keeps every dv-query #bar fires.
const bar = (page: Page) => page.locator('#bar .lfdln-filter-pills');
const pill = (page: Page, key: string) => page.locator(`#bar .lfdln-filter-pill[data-key="${key}"]`);
const menuOf = (page: Page) => page.locator('#bar .lfdln-filter-pill-menu');
const rowIn = (page: Page, value: string) => menuOf(page).locator(`.lfdln-filter-check-row[data-value="${value}"]`);
const barQueries = (page: Page) => page.evaluate(() => (window as unknown as { barQueries: unknown[] }).barQueries.length);

test.describe('bar', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('one pill per section; clicking opens its menu; one menu at a time', async ({ page }) => {
    const { problems } = await open(page);
    await expect(bar(page).locator('.lfdln-filter-pill-key')).toHaveText(['Kind', 'Light', 'Price', 'In stock', 'Cared for by']);
    await expect(page.locator('#bar .dv-root > .lfdln-filter-chips')).toHaveCount(0);
    await expect(menuOf(page)).toHaveCount(0);
    await pill(page, 'kind').click();
    await expect(pill(page, 'kind')).toHaveAttribute('aria-expanded', 'true');
    await expect(menuOf(page)).toHaveCount(1);
    await expect(menuOf(page).locator('.lfdln-filter-check-label')).toHaveText(['Flower', 'Foliage', 'Herb', 'Tree']);
    expect(Math.round((await menuOf(page).boundingBox())!.width)).toBe(240);
    // The menu sits under its pill.
    const [p, m] = await Promise.all([pill(page, 'kind').boundingBox(), menuOf(page).boundingBox()]);
    expect(m!.y).toBeGreaterThan(p!.y + p!.height);
    // Another pill: its menu, and only its menu.
    await pill(page, 'light').click();
    await expect(menuOf(page)).toHaveCount(1);
    await expect(menuOf(page).locator('.lfdln-filter-check-label')).toHaveText(['Part shade', 'Shade', 'Sun']);
    await expect(pill(page, 'kind')).toHaveAttribute('aria-expanded', 'false');
    // The same pill again closes it; Esc closes and focus goes back to the pill.
    await pill(page, 'light').click();
    await expect(menuOf(page)).toHaveCount(0);
    await pill(page, 'price').click();
    await expect(menuOf(page).locator('.lfdln-filter-check-row')).toHaveCount(3);
    await expect(menuOf(page).locator('.lfdln-filter-check-row').first()).toHaveAttribute('role', 'menuitemradio');
    await page.keyboard.press('Escape');
    await expect(menuOf(page)).toHaveCount(0);
    await expect(pill(page, 'price')).toBeFocused();
    // Opening another list's popover closes this menu: one open per page.
    await pill(page, 'kind').click();
    await page.locator('#panel .lfdln-filter-trigger').click();
    await expect(page.locator('#panel .lfdln-filter-panel')).toBeVisible();
    await expect(menuOf(page)).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('ticking applies at once and fires one dv-query per tick', async ({ page }) => {
    await open(page);
    await expect(page.locator('#bar tbody tr')).toHaveCount(12);
    await pill(page, 'kind').click();
    const before = await barQueries(page);
    await rowIn(page, 'Herb').click();
    await expect(page.locator('#bar tbody tr')).toHaveCount(5);
    expect(await barQueries(page)).toBe(before + 1);
    await expect(rowIn(page, 'Herb')).toHaveAttribute('aria-checked', 'true');
    await rowIn(page, 'Flower').click();
    await expect(page.locator('#bar tbody tr')).toHaveCount(8);
    expect(await barQueries(page)).toBe(before + 2);
    // The menu stays open; the pill sums it up and turns on.
    await expect(menuOf(page)).toHaveCount(1);
    await expect(pill(page, 'kind').locator('.lfdln-filter-pill-value')).toHaveText('Herb +1');
    await expect(pill(page, 'kind')).toHaveClass(/lfdln-filter-pill-on/);
    await expect(pill(page, 'kind')).toHaveAccessibleName('Kind: Herb, Flower');
    // A count of 0 dims to 0.45 and stays clickable.
    await pill(page, 'light').click();
    await expect(rowIn(page, 'Shade')).toHaveClass(/lfdln-filter-dim/);
    expect(await rowIn(page, 'Shade').evaluate((el) => getComputedStyle(el).opacity)).toBe('0.45');
    await rowIn(page, 'Shade').click();
    await expect(page.locator('#bar tbody tr')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get('bar.f.light')).toBe('Shade');
  });

  test('In stock is a toggle pill with no menu', async ({ page }) => {
    await open(page);
    const p = pill(page, 'stock');
    await expect(p).toHaveAttribute('aria-pressed', 'false');
    await expect(p).not.toHaveAttribute('aria-haspopup', /.*/);
    await expect(p.locator('svg').first()).toHaveCSS('opacity', '0.35');
    const before = await barQueries(page);
    await p.click();
    await expect(page.locator('#bar tbody tr')).toHaveCount(9);
    await expect(p).toHaveAttribute('aria-pressed', 'true');
    await expect(p.locator('svg').first()).toHaveCSS('opacity', '1');
    await expect(menuOf(page)).toHaveCount(0);
    expect(await barQueries(page)).toBe(before + 1);
    await p.click();
    await expect(page.locator('#bar tbody tr')).toHaveCount(12);
  });

  test('a bookmarked "no" shows as set, with the check off as aria-pressed says', async ({ page }) => {
    await open(page, '?bar.f.stock=no');
    await expect(page.locator('#bar tbody tr')).toHaveCount(3);
    const p = pill(page, 'stock');
    // Set (on colours, "No"), but not pressed: the check is off, as it is announced.
    await expect(p).toHaveClass(/lfdln-filter-pill-on/);
    await expect(p.locator('.lfdln-filter-pill-value')).toHaveText('No');
    await expect(p).toHaveAccessibleName('In stock: No');
    await expect(p).toHaveAttribute('aria-pressed', 'false');
    await expect(p.locator('svg').first()).toHaveCSS('opacity', '0.35');
    // A click clears it; the next sets it to yes.
    await p.click();
    await expect(page.locator('#bar tbody tr')).toHaveCount(12);
    await expect(p).not.toHaveClass(/lfdln-filter-pill-on/);
    await p.click();
    await expect(page.locator('#bar tbody tr')).toHaveCount(9);
    await expect(p).toHaveAttribute('aria-pressed', 'true');
    await expect(p.locator('svg').first()).toHaveCSS('opacity', '1');
  });

  test('Clear all shows only when something is applied', async ({ page }) => {
    await open(page);
    const clear = bar(page).getByRole('button', { name: 'Clear all' });
    await expect(clear).toHaveCount(0);
    await pill(page, 'stock').click();
    await pill(page, 'kind').click();
    await rowIn(page, 'Herb').click();
    await expect(page.locator('#bar tbody tr')).toHaveCount(4);
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(page.locator('#bar tbody tr')).toHaveCount(12);
    await expect(clear).toHaveCount(0);
    await expect(menuOf(page)).toHaveCount(0);
    expect([...new URL(page.url()).searchParams.keys()].filter((k) => k.startsWith('bar.f.'))).toEqual([]);
  });

  test('a section with more than 8 options gets the option search; the menu scrolls inside at 320 px', async ({ page }) => {
    await open(page);
    await pill(page, 'kind').click();
    await expect(menuOf(page).locator('input[type=search]')).toHaveCount(0);
    await pill(page, 'owner').click();
    const search = menuOf(page).getByRole('searchbox', { name: 'Search cared for by' });
    await expect(search).toBeVisible();
    await expect(menuOf(page).locator('.lfdln-filter-check-row')).toHaveCount(30);
    expect((await menuOf(page).boundingBox())!.height).toBeLessThanOrEqual(320);
    // The rows keep their 32 px; the list scrolls rather than squeezing them.
    const heights = await menuOf(page).locator('.lfdln-filter-check-row').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
    expect(new Set(heights)).toEqual(new Set([32]));
    // The rows scroll inside the menu; the search stays at the top.
    const list = menuOf(page).locator('.lfdln-filter-pill-list');
    expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    const top = (await menuOf(page).boundingBox())!.y;
    await list.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    expect(await list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect((await search.boundingBox())!.y).toBeGreaterThanOrEqual(top);
    expect((await search.boundingBox())!.y).toBeLessThan(top + 12);
    // Accents don't matter.
    await search.fill('cafe');
    await expect(menuOf(page).locator('.lfdln-filter-check-row')).toHaveCount(10);
    await search.fill('zzz');
    await expect(menuOf(page).locator('.lfdln-filter-check-row')).toHaveCount(0);
    await expect(menuOf(page)).toContainText('Nothing matches');
    await search.fill('smith');
    await rowIn(page, 'Rose Smith-Montgomery').click();
    await expect(page.locator('#bar tbody tr')).toHaveCount(1);
    // The 18 who care for none are dimmed.
    await search.fill('');
    await expect(menuOf(page).locator('.lfdln-filter-check-row.lfdln-filter-dim')).toHaveCount(18);
    // No sideways scroll.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  });

  test('a long summary truncates with an ellipsis and keeps its full accessible name', async ({ page }) => {
    await open(page, `?bar.f.owner=${encodeURIComponent('Rose Smith-Montgomery,Ana Okafor,Chloé Café')}`);
    await expect(page.locator('#bar tbody tr')).toHaveCount(2);
    const p = pill(page, 'owner');
    const value = p.locator('.lfdln-filter-pill-value');
    await expect(value).toHaveText('Rose Smith-Montgomery +2');
    await expect(p).toHaveAccessibleName('Cared for by: Rose Smith-Montgomery, Ana Okafor, Chloé Café');
    const fit = await p.evaluate((el) => {
      const v = el.querySelector('.lfdln-filter-pill-value') as HTMLElement;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return {
        width: el.getBoundingClientRect().width, max: 16 * rem, height: el.getBoundingClientRect().height,
        cut: v.scrollWidth > v.clientWidth, overflow: getComputedStyle(v).textOverflow, wrap: getComputedStyle(el).whiteSpace,
      };
    });
    expect(fit.width).toBeLessThanOrEqual(fit.max);
    expect(fit.height).toBeLessThanOrEqual(32);
    expect(fit.cut).toBe(true);
    expect(fit.overflow).toBe('ellipsis');
    expect(fit.wrap).toBe('nowrap');
  });

  test('a bookmarked value that no longer exists shows in the pill and clears', async ({ page }) => {
    await open(page, '?bar.f.kind=Cactus');
    await expect(page.locator('#bar tbody tr')).toHaveCount(0);
    await expect(pill(page, 'kind').locator('.lfdln-filter-pill-value')).toHaveText('Cactus');
    await expect(pill(page, 'kind')).toHaveClass(/lfdln-filter-pill-on/);
    await pill(page, 'kind').click();
    await expect(rowIn(page, 'Cactus')).toHaveAttribute('aria-checked', 'true');
    await menuOf(page).getByRole('button', { name: 'Clear kind' }).click();
    await expect(page.locator('#bar tbody tr')).toHaveCount(12);
    await expect(pill(page, 'kind').locator('.lfdln-filter-pill-value')).toHaveCount(0);
    await expect(pill(page, 'kind')).toBeFocused();
    expect(new URL(page.url()).searchParams.has('bar.f.kind')).toBe(false);
  });
});

test.describe('bar on a phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('phone: menus open as the bottom sheet', async ({ page }) => {
    await open(page);
    const p = pill(page, 'kind');
    await p.scrollIntoViewIfNeeded();
    for (const el of await bar(page).locator('.lfdln-filter-pill').all()) {
      expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    // The pills wrap: no sideways scroll.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await p.click();
    const sheet = page.locator('#bar dialog.lfdln-filter-pill-menu');
    await expect(sheet).toBeVisible();
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.y + box.height)).toBe(800);
    expect(box.width).toBe(390);
    await expect(sheet.getByRole('heading', { name: 'Kind' })).toBeVisible();
    for (const el of await sheet.locator('.lfdln-filter-check-row').all()) {
      expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await sheet.locator('.lfdln-filter-check-row[data-value="Herb"]').click();
    await expect(page.locator('#bar tbody tr')).toHaveCount(5);
    await expect(sheet).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(p).toBeFocused();
    await expect(page.locator('#bar tbody tr')).toHaveCount(5);
    // The long list's search box is 16 px, so phones don't zoom in.
    await pill(page, 'owner').click();
    await expect(page.locator('#bar dialog.lfdln-filter-pill-menu input[type=search]')).toHaveCSS('font-size', '16px');
  });
});
