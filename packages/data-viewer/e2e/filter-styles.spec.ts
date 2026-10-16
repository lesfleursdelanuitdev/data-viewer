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

// #side: a test style drawn beside the list (side) that leaves the applied filters to the
// viewer's chips row, which then sits in .dv-main.
test.describe('the chips row beside a side style', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('removing a chip moves focus to the next ×, then to the style', async ({ page }) => {
    await open(page, `?side.f.kind=${encodeURIComponent('Herb,Flower')}`);
    const chips = page.locator('#side .dv-main > .lfdln-filter-chips');
    await expect(chips.locator('.lfdln-filter-chip-x')).toHaveCount(2);
    await chips.locator('.lfdln-filter-chip-x').first().click();
    await expect(chips.locator('.lfdln-filter-chip-x')).toHaveCount(1);
    await expect(chips.locator('.lfdln-filter-chip-x').first()).toBeFocused();
    await chips.locator('.lfdln-filter-chip-x').first().click();
    await expect(page.locator('#side .lfdln-filter-chips')).toHaveCount(0);
    await expect(page.locator('#side .dv-side .probe-side')).toBeFocused();
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

  // rail.js and columns.js each bundle their own panelStyle, so loading the second registers a
  // new object under "panel": the open draft must survive (styles are compared by name).
  test('another add-on registering its own copy of the panel keeps the open draft', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    await toggle(page, 'Herb').click();
    await expect(show(page)).toHaveText('Show 5 results');
    await page.evaluate(() => {
      type R = { styles: Map<string, object>; listeners: Set<(n: string) => void> };
      const r = (globalThis as unknown as Record<string, R>).__lfdlnDataViewerFilterStyles!;
      r.styles.set('panel', { ...r.styles.get('panel')! });
      for (const heard of [...r.listeners]) heard('panel');
    });
    await page.waitForTimeout(100);
    await expect(panelOf(page)).toBeVisible();
    await expect(toggle(page, 'Herb')).toHaveAttribute('aria-pressed', 'true');
    await expect(show(page)).toHaveText('Show 5 results');
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
    const bars = panelOf(page).locator('.lfdln-filter-hist .lfdln-filter-hist-bar');
    await expect(bars).toHaveCount(12);
    // 1.50 to 120 in 12 buckets: 11 plants in the first, 12.50 in the second, 120 in the last.
    const on = () => bars.evaluateAll((els) => els.map((e, i) => (e.classList.contains('lfdln-filter-hist-bar-on') ? i : -1)).filter((i) => i >= 0));
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

// The trigger sits at the bar's right end, so the 400 px panel opens right-aligned to it, inside
// the list, not hanging past the list's right edge.
for (const width of [1280, 1024]) {
  test.describe(`panel anchoring at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('the panel stays inside the list, right-aligned to its trigger', async ({ page }) => {
      await open(page);
      const trigger = page.locator('#panel .lfdln-filter-trigger');
      await trigger.click();
      const panel = page.locator('#panel .lfdln-filter-panel');
      await expect(panel).toBeVisible();
      const [p, t, list] = await page.locator('#panel').evaluate((el) => ['.lfdln-filter-panel', '.lfdln-filter-trigger', '.dv-root']
        .map((s) => el.querySelector(s)!.getBoundingClientRect().toJSON() as DOMRect));
      expect(t!.x + t!.width / 2).toBeGreaterThan(list!.x + list!.width / 2);
      expect(p!.right).toBeLessThanOrEqual(list!.right + 1);
      expect(Math.abs(p!.right - t!.right)).toBeLessThanOrEqual(1);
      expect(p!.left).toBeGreaterThanOrEqual(8);
    });
  });
}

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
const bar = (page: Page) => page.locator('#bar .lfdln-filter-bar-row');
const pill = (page: Page, key: string) => page.locator(`#bar .lfdln-filter-bar-pill[data-key="${key}"]`);
const menuOf = (page: Page) => page.locator('#bar .lfdln-filter-bar-pill-menu');
const rowIn = (page: Page, value: string) => menuOf(page).locator(`.lfdln-filter-check-row[data-value="${value}"]`);
const barQueries = (page: Page) => page.evaluate(() => (window as unknown as { barQueries: unknown[] }).barQueries.length);

test.describe('bar', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("the bar's rules stay off the dialog's quick ranges on the same page", async ({ page }) => {
    await open(page);
    await expect(bar(page)).toBeVisible();
    await expect(page.locator('#lfdln-filter-bar-style')).toHaveCount(1);
    // #plants is today's dialog: its Price quick ranges share the class lfdln-filter-pill.
    await page.locator('#plants .lfdln-filter-button').click();
    await page.locator('#plants .lfdln-filter-row', { hasText: 'Price' }).click();
    const quick = page.locator('#plants .lfdln-filter-detail .lfdln-filter-pill').first();
    await expect(quick).toBeVisible();
    const look = await quick.evaluate((el) => {
      const c = getComputedStyle(el);
      return { whiteSpace: c.whiteSpace, maxWidth: c.maxWidth, display: c.display };
    });
    expect(look).toEqual({ whiteSpace: 'normal', maxWidth: 'none', display: 'block' });
  });

  test('one pill per section; clicking opens its menu; one menu at a time', async ({ page }) => {
    const { problems } = await open(page);
    await expect(bar(page).locator('.lfdln-filter-bar-pill-key')).toHaveText(['Kind', 'Light', 'Price', 'In stock', 'Cared for by']);
    await expect(page.locator('#bar .dv-root > .lfdln-filter-chips')).toHaveCount(0);
    await expect(menuOf(page)).toHaveCount(0);
    await pill(page, 'kind').click();
    await expect(pill(page, 'kind')).toHaveAttribute('aria-expanded', 'true');
    await expect(menuOf(page)).toHaveCount(1);
    await expect(menuOf(page).locator('.lfdln-filter-check-label')).toHaveText(['Flower', 'Foliage', 'Herb', 'Tree']);
    // Several at once: check boxes in a group named by the section, as in the columns' menus.
    await expect(menuOf(page).getByRole('group', { name: 'Kind' }).getByRole('checkbox')).toHaveCount(4);
    await expect(menuOf(page).locator('[role^=menu]')).toHaveCount(0);
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
    // Named ranges: radios in a radiogroup, one tab stop (the first while none is picked).
    const ranges = menuOf(page).getByRole('radiogroup', { name: 'Price' });
    await expect(ranges.getByRole('radio')).toHaveCount(3);
    expect(await ranges.getByRole('radio').evaluateAll((els) => els.map((el) => el.getAttribute('tabindex')))).toEqual(['0', '-1', '-1']);
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
    await expect(pill(page, 'kind').locator('.lfdln-filter-bar-pill-value')).toHaveText('Herb +1');
    await expect(pill(page, 'kind')).toHaveClass(/lfdln-filter-bar-pill-on/);
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
    await expect(p).toHaveClass(/lfdln-filter-bar-pill-on/);
    await expect(p.locator('.lfdln-filter-bar-pill-value')).toHaveText('No');
    await expect(p).toHaveAccessibleName('In stock: No');
    await expect(p).toHaveAttribute('aria-pressed', 'false');
    await expect(p.locator('svg').first()).toHaveCSS('opacity', '0.35');
    // A click clears it; the next sets it to yes.
    await p.click();
    await expect(page.locator('#bar tbody tr')).toHaveCount(12);
    await expect(p).not.toHaveClass(/lfdln-filter-bar-pill-on/);
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
    // Clear all leaves the row; focus goes to the first pill, which stays.
    await expect(pill(page, 'kind')).toBeFocused();
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
    const list = menuOf(page).locator('.lfdln-filter-bar-pill-list');
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
    const value = p.locator('.lfdln-filter-bar-pill-value');
    await expect(value).toHaveText('Rose Smith-Montgomery +2');
    await expect(p).toHaveAccessibleName('Cared for by: Rose Smith-Montgomery, Ana Okafor, Chloé Café');
    const fit = await p.evaluate((el) => {
      const v = el.querySelector('.lfdln-filter-bar-pill-value') as HTMLElement;
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
    await expect(pill(page, 'kind').locator('.lfdln-filter-bar-pill-value')).toHaveText('Cactus');
    await expect(pill(page, 'kind')).toHaveClass(/lfdln-filter-bar-pill-on/);
    await pill(page, 'kind').click();
    await expect(rowIn(page, 'Cactus')).toHaveAttribute('aria-checked', 'true');
    await menuOf(page).getByRole('button', { name: 'Clear kind' }).click();
    await expect(page.locator('#bar tbody tr')).toHaveCount(12);
    await expect(pill(page, 'kind').locator('.lfdln-filter-bar-pill-value')).toHaveCount(0);
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
    for (const el of await bar(page).locator('.lfdln-filter-bar-pill').all()) {
      expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    // The pills wrap: no sideways scroll.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await p.click();
    const sheet = page.locator('#bar dialog.lfdln-filter-bar-pill-menu');
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
    await expect(page.locator('#bar dialog.lfdln-filter-bar-pill-menu input[type=search]')).toHaveCSS('font-size', '16px');
  });
});

// #rail: the 12 plants with filter-style="rail" (the add-on registers rail and panel), in #rail-box.
const rail = (page: Page) => page.locator('#rail .lfdln-filter-rail');
const railRow = (page: Page, value: string) => rail(page).locator(`.lfdln-filter-check-row[data-value="${value}"]`);
const results = (page: Page) => page.locator('#rail .lfdln-filter-rail-results');

test.describe('rail', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('the rail is always open beside the list; ticks apply at once', async ({ page }) => {
    const { problems } = await open(page);
    await expect(rail(page)).toBeVisible();
    await expect(rail(page).locator('.lfdln-filter-rail-title')).toHaveText('Filters');
    await expect(rail(page).locator('.lfdln-filter-rail-label')).toHaveText(['Kind', 'Light', 'Price']);
    await expect(rail(page).getByRole('switch', { name: 'In stock' })).toBeVisible();
    // No button, no dialog, no chips row: the rail is the filter.
    await expect(page.locator('#rail .lfdln-filter-button, #rail .lfdln-filter-trigger')).toHaveCount(0);
    await expect(page.locator('#rail .dv-root > .lfdln-filter-chips')).toHaveCount(0);
    // The 190 px | 1fr grid, 22 px apart: the rail on the left, the bar and the list on the right.
    const [r, table, barBox] = await Promise.all([
      rail(page).boundingBox(), page.locator('#rail .dv-table-wrap').boundingBox(), page.locator('#rail .dv-bar').boundingBox(),
    ]);
    expect(Math.round(r!.width)).toBe(190);
    expect(Math.round(table!.x - (r!.x + r!.width))).toBe(22);
    expect(Math.round(barBox!.x)).toBe(Math.round(table!.x));
    expect(barBox!.y).toBeLessThan(table!.y);
    // 28 px rows with 14 px boxes, as check boxes (not menu items).
    await expect(railRow(page, 'Herb')).toHaveAttribute('role', 'checkbox');
    expect(Math.round((await railRow(page, 'Herb').boundingBox())!.height)).toBe(28);
    expect(Math.round((await railRow(page, 'Herb').locator('.lfdln-filter-box').boundingBox())!.width)).toBe(14);
    // A tick applies at once; the rail stays open.
    await railRow(page, 'Herb').click();
    await expect(page.locator('#rail tbody tr')).toHaveCount(5);
    await expect(railRow(page, 'Herb')).toHaveAttribute('aria-checked', 'true');
    expect(new URL(page.url()).searchParams.get('rail.f.kind')).toBe('Herb');
    // Counts follow: no herb likes shade, so Shade dims to 0.45 and stays clickable.
    await expect(railRow(page, 'Shade')).toHaveClass(/lfdln-filter-dim/);
    expect(await railRow(page, 'Shade').evaluate((el) => getComputedStyle(el).opacity)).toBe('0.45');
    // A named range is one at a time.
    await railRow(page, 'Under €5').click();
    await expect(page.locator('#rail tbody tr')).toHaveCount(5);
    await expect(railRow(page, 'Under €5')).toHaveAttribute('aria-checked', 'true');
    // The switch: Space toggles it.
    const sw = rail(page).getByRole('switch', { name: 'In stock' });
    await sw.focus();
    await page.keyboard.press('Space');
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#rail tbody tr')).toHaveCount(4);
    expect(problems).toEqual([]);
  });

  test('the results header shows "N results" and removable chips', async ({ page }) => {
    await open(page, `?rail.f.kind=${encodeURIComponent('Herb,Flower')}`);
    await expect(page.locator('#rail tbody tr')).toHaveCount(8);
    await expect(results(page).locator('.lfdln-filter-rail-count')).toHaveText('8 results');
    await expect(results(page).locator('.lfdln-filter-tag-label')).toHaveText(['Herb', 'Flower']);
    // Above the list, in the right-hand column.
    const [h, table] = await Promise.all([results(page).boundingBox(), page.locator('#rail .dv-table-wrap').boundingBox()]);
    expect(h!.y + h!.height).toBeLessThanOrEqual(table!.y);
    expect(Math.round(h!.x)).toBe(Math.round(table!.x));
    // × removes at once; the rail follows. The last chip gone, focus goes to the one before it.
    await results(page).getByRole('button', { name: 'Remove Flower' }).click();
    await expect(page.locator('#rail tbody tr')).toHaveCount(5);
    await expect(results(page).locator('.lfdln-filter-rail-count')).toHaveText('5 results');
    await expect(railRow(page, 'Flower')).toHaveAttribute('aria-checked', 'false');
    await expect(results(page).getByRole('button', { name: 'Remove Herb' })).toBeFocused();
    await railRow(page, 'Tree').click();
    await expect(results(page).locator('.lfdln-filter-tag-label')).toHaveText(['Herb', 'Tree']);
    await results(page).getByRole('button', { name: 'Remove Herb' }).click();
    await expect(results(page).locator('.lfdln-filter-rail-count')).toHaveText('1 result');
    // Not the last: the same × now removes the next chip, and keeps focus.
    await expect(results(page).getByRole('button', { name: 'Remove Tree' })).toBeFocused();
    // The last chip gone: focus goes to the count, which stays.
    await results(page).getByRole('button', { name: 'Remove Tree' }).click();
    await expect(results(page).locator('.lfdln-filter-tag')).toHaveCount(0);
    await expect(results(page).locator('.lfdln-filter-rail-count')).toHaveText('12 results');
    await expect(results(page).locator('.lfdln-filter-rail-count')).toBeFocused();
    // A bookmarked value that no longer exists shows as a chip and a ticked row, and clears.
    await page.goto('/filter-styles.html?rail.f.kind=Cactus');
    await expect(results(page).locator('.lfdln-filter-tag-label')).toHaveText(['Cactus']);
    await expect(railRow(page, 'Cactus')).toHaveAttribute('aria-checked', 'true');
    await railRow(page, 'Cactus').click();
    await expect(page.locator('#rail tbody tr')).toHaveCount(12);
  });

  test('Clear in the rail empties every filter', async ({ page }) => {
    await open(page);
    const clear = rail(page).getByRole('button', { name: 'Clear' });
    await expect(clear).toHaveCount(0);
    await railRow(page, 'Herb').click();
    await railRow(page, 'Sun').click();
    await rail(page).getByRole('switch', { name: 'In stock' }).click();
    await expect(page.locator('#rail tbody tr')).toHaveCount(3);
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(page.locator('#rail tbody tr')).toHaveCount(12);
    await expect(clear).toHaveCount(0);
    await expect(rail(page).locator('[aria-checked=true]')).toHaveCount(0);
    await expect(results(page).locator('.lfdln-filter-tag')).toHaveCount(0);
    expect([...new URL(page.url()).searchParams.keys()].filter((k) => k.startsWith('rail.f.'))).toEqual([]);
    // Clear leaves; focus goes to the rail's first row, which stays.
    await expect(railRow(page, 'Flower')).toBeFocused();
  });

  test('narrower than 720 px it becomes the panel, and back when wider', async ({ page }) => {
    // Window errors that are not page errors (a ResizeObserver loop is one) are kept too.
    await page.addInitScript(() => {
      const w = window as unknown as { errors: string[] };
      w.errors = [];
      addEventListener('error', (e) => w.errors.push(e.message));
    });
    const { problems } = await open(page, '?rail.f.kind=Herb');
    await expect(rail(page)).toBeVisible();
    // The page narrows the list's container (#rail-box), not the window.
    const width = (px: number) => page.locator('#rail-box').evaluate((el, w) => {
      (el as HTMLElement).style.width = `${w}px`;
    }, px);
    await width(700);
    await expect(page.locator('#rail .lfdln-filter-trigger')).toBeVisible();
    await expect(rail(page)).toHaveCount(0);
    await expect(page.locator('#rail .dv-root')).not.toHaveAttribute('data-filter-side', /.*/);
    // The applied filter carries over: the panel's badge and chip.
    await expect(page.locator('#rail .lfdln-filter-badge')).toHaveText('1');
    await expect(page.locator('#rail tbody tr')).toHaveCount(5);
    await width(900);
    await expect(rail(page)).toBeVisible();
    await expect(page.locator('#rail .lfdln-filter-trigger')).toHaveCount(0);
    await expect(railRow(page, 'Herb')).toHaveAttribute('aria-checked', 'true');
    expect(page.viewportSize()!.width).toBe(1280);
    await width(700);
    await expect(page.locator('#rail .lfdln-filter-trigger')).toBeVisible();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    expect(problems).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { errors: string[] }).errors)).toEqual([]);
  });
});

test.describe('rail radios and widths', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a named range is a radio group named by its heading; arrows move and pick, a tick again unpicks', async ({ page }) => {
    const { problems } = await open(page);
    const price = rail(page).getByRole('radiogroup', { name: 'Price' });
    await expect(price.getByRole('radio')).toHaveCount(3);
    // Several at once stay check boxes, in a group named by the heading.
    await expect(rail(page).getByRole('group', { name: 'Kind' }).getByRole('checkbox')).toHaveCount(4);
    // One stop in the tab order: the first radio while none is picked.
    const under = price.getByRole('radio', { name: /Under €5/ });
    const mid = price.getByRole('radio', { name: /€5–€10/ });
    const over = price.getByRole('radio', { name: /Over €10/ });
    await expect(under).toHaveAttribute('tabindex', '0');
    await expect(mid).toHaveAttribute('tabindex', '-1');
    await under.focus();
    await page.keyboard.press('ArrowDown');
    await expect(mid).toBeFocused();
    await expect(mid).toHaveAttribute('aria-checked', 'true');
    await expect(mid).toHaveAttribute('tabindex', '0');
    await expect(under).toHaveAttribute('tabindex', '-1');
    expect(new URL(page.url()).searchParams.get('rail.f.price')).toBeTruthy();
    await page.keyboard.press('End');
    await expect(over).toBeFocused();
    await expect(over).toHaveAttribute('aria-checked', 'true');
    await expect(mid).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('ArrowDown'); // wraps
    await expect(under).toBeFocused();
    await expect(under).toHaveAttribute('aria-checked', 'true');
    // A tick on the picked one unpicks it.
    await page.keyboard.press('Space');
    await expect(under).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('#rail tbody tr')).toHaveCount(12);
    expect(new URL(page.url()).searchParams.get('rail.f.price')).toBeNull();
    expect(problems).toEqual([]);
  });

  test('back from another style, the rail never draws at the width it had before', async ({ page }) => {
    await open(page);
    const width = (px: number) => page.locator('#rail-box').evaluate((el, w) => {
      (el as HTMLElement).style.width = `${w}px`;
    }, px);
    await width(700);
    await expect(page.locator('#rail .lfdln-filter-trigger')).toBeVisible();
    await page.locator('#rail').evaluate((el) => el.setAttribute('filter-style', 'bar'));
    await expect(page.locator('#rail .lfdln-filter-bar-row')).toBeVisible();
    await width(900);
    // Watch for the panel's trigger, even for one frame, while switching back.
    await page.locator('#rail').evaluate((el) => {
      const w = window as unknown as { sawTrigger: boolean };
      w.sawTrigger = false;
      new MutationObserver(() => {
        if (el.querySelector('.lfdln-filter-trigger')) w.sawTrigger = true;
      }).observe(el, { childList: true, subtree: true });
      el.setAttribute('filter-style', 'rail');
    });
    await expect(rail(page)).toBeVisible();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    expect(await page.evaluate(() => (window as unknown as { sawTrigger: boolean }).sawTrigger)).toBe(false);
  });
});

test.describe('rail on a phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('phone: the rail is the panel', async ({ page }) => {
    await open(page);
    await expect(page.locator('#rail .lfdln-filter-trigger')).toBeVisible();
    await expect(rail(page)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

// #columns: the 12 plants with filter-style="columns" (the add-on registers columns and panel),
// every column sortable; #bar2 beside it: the same plants with filter-style="bar".
const cols = (page: Page) => page.locator('#columns');
const funnel = (page: Page, label: string) => cols(page).getByRole('button', { name: `Filter by ${label}` });
const colMenu = (page: Page) => cols(page).locator('.lfdln-filter-col-menu');
const headOf = (page: Page, label: string) => cols(page).locator('thead th').filter({ has: page.getByRole('button', { name: `Filter by ${label}` }) });
// The list's top at the window's top, so its menus have room below.
async function colsToTop(page: Page) {
  // The lists above load their recipes first (they would push #columns down after the scroll).
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#panel-server tbody tr').first()).toBeVisible();
  await cols(page).evaluate((el) => {
    el.ownerDocument.body.style.paddingBottom = '100vh'; // #columns is near the page's end
    el.scrollIntoView({ block: 'start' });
  });
}
const colSummary = (page: Page) => cols(page).locator('.lfdln-filter-col-summary-text');
const colRows = (page: Page) => cols(page).locator('tbody tr');

test.describe('columns', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("clicking a header's text still sorts; the funnel is its own button named \"Filter by Kind\"", async ({ page }) => {
    const { problems } = await open(page);
    await expect(funnel(page, 'Kind')).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(funnel(page, 'Kind')).toHaveAttribute('aria-expanded', 'false');
    await expect(funnel(page, 'Name')).toHaveCount(0); // Name is not filterable
    // No filter button, no pills: the headers are the filter.
    await expect(cols(page).locator('.dv-filter, .lfdln-filter-trigger, .lfdln-filter-bar-row')).toHaveCount(0);
    await cols(page).locator('thead').getByRole('button', { name: 'Kind', exact: true }).click();
    await expect(headOf(page, 'Kind')).toHaveAttribute('aria-sort', 'ascending');
    await expect(colMenu(page)).toHaveCount(0);
    await expect(colRows(page).first().locator('td').first()).toHaveText('Flower');
    await funnel(page, 'Kind').click();
    await expect(colMenu(page)).toBeVisible();
    await expect(funnel(page, 'Kind')).toHaveAttribute('aria-expanded', 'true');
    await expect(headOf(page, 'Kind')).toHaveAttribute('aria-sort', 'ascending');
    // A click on another header's text closes the menu and sorts.
    await cols(page).locator('thead').getByRole('button', { name: 'Light', exact: true }).click();
    await expect(colMenu(page)).toHaveCount(0);
    await expect(cols(page).locator('thead th').nth(2)).toHaveAttribute('aria-sort', 'ascending');
    expect(problems).toEqual([]);
  });

  test('the menu lists options with counts and applies at once; "Clear this column" when set', async ({ page }) => {
    const { problems } = await open(page);
    await funnel(page, 'Kind').click();
    const m = colMenu(page);
    expect(Math.round((await m.boundingBox())!.width)).toBe(220);
    await expect(m.locator('.lfdln-filter-col-label')).toHaveText('Show kind');
    const group = m.getByRole('group', { name: 'Show kind' });
    await expect(group.getByRole('checkbox')).toHaveCount(4);
    await expect(m.locator('.lfdln-filter-check-label')).toHaveText(['Flower', 'Foliage', 'Herb', 'Tree']);
    await expect(m.locator('.lfdln-filter-check-count')).toHaveText(['3', '3', '5', '1']);
    expect(Math.round((await m.locator('.lfdln-filter-check-row').first().boundingBox())!.height)).toBe(32);
    await expect(m.getByRole('button', { name: 'Clear this column' })).toHaveCount(0);
    // Arrow keys move between rows.
    await page.keyboard.press('ArrowDown');
    await expect(group.getByRole('checkbox', { name: /Flower/ })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(group.getByRole('checkbox', { name: /Foliage/ })).toBeFocused();
    await group.getByRole('checkbox', { name: /Herb/ }).click();
    await expect(colRows(page)).toHaveCount(5);
    await expect(m).toBeVisible(); // it applies and stays open
    await expect(group.getByRole('checkbox', { name: /Herb/ })).toHaveAttribute('aria-checked', 'true');
    expect(new URL(page.url()).searchParams.get('columns.f.kind')).toBe('Herb');
    await expect(m.getByRole('button', { name: 'Clear this column' })).toBeVisible();
    // Counts follow the other columns: no herb likes shade, so Shade dims to 0.45 and stays clickable.
    await funnel(page, 'Light').click();
    await expect(colMenu(page)).toHaveCount(1);
    const shade = colMenu(page).getByRole('checkbox', { name: /^Shade/ });
    await expect(shade).toHaveClass(/lfdln-filter-dim/);
    expect(await shade.evaluate((el) => getComputedStyle(el).opacity)).toBe('0.45');
    // A pick that leaves nothing keeps the headers, so the menu stays open to undo it.
    await shade.click();
    await expect(colRows(page)).toHaveCount(0);
    await expect(cols(page).locator('.dv-empty')).toBeVisible();
    await expect(colMenu(page)).toBeVisible();
    await shade.click();
    await expect(colRows(page)).toHaveCount(5);
    await page.keyboard.press('Escape');
    await expect(colMenu(page)).toHaveCount(0);
    await expect(funnel(page, 'Light')).toBeFocused();
    // Clear this column: the menu closes, focus goes back to the funnel.
    await funnel(page, 'Kind').click();
    await colMenu(page).getByRole('button', { name: 'Clear this column' }).click();
    await expect(colRows(page)).toHaveCount(12);
    await expect(colMenu(page)).toHaveCount(0);
    await expect(funnel(page, 'Kind')).toBeFocused();
    expect(new URL(page.url()).searchParams.get('columns.f.kind')).toBeNull();
    expect(problems).toEqual([]);
  });

  test('a range column lists its ranges as single-choice rows; a bool column lists Yes and No', async ({ page }) => {
    const { problems } = await open(page);
    await funnel(page, 'Price').click();
    const price = colMenu(page).getByRole('radiogroup', { name: 'Show price' });
    await expect(price.locator('.lfdln-filter-check-label')).toHaveText(['Under €5', '€5–€10', 'Over €10']);
    await expect(price.getByRole('radio')).toHaveCount(3);
    await expect(price.locator('.lfdln-filter-box-round')).toHaveCount(3);
    const under = price.getByRole('radio', { name: /Under €5/ });
    const n = Number(await under.locator('.lfdln-filter-check-count').textContent());
    await under.click();
    await expect(colRows(page)).toHaveCount(n);
    await expect(under).toHaveAttribute('aria-checked', 'true');
    // Arrow keys move and pick, as radios do.
    await page.keyboard.press('ArrowDown');
    await expect(price.getByRole('radio', { name: /€5–€10/ })).toBeFocused();
    await expect(price.getByRole('radio', { name: /€5–€10/ })).toHaveAttribute('aria-checked', 'true');
    await expect(under).toHaveAttribute('aria-checked', 'false');
    // A tick on the picked one unpicks it.
    await page.keyboard.press('Space');
    await expect(colRows(page)).toHaveCount(12);
    await page.keyboard.press('Escape');
    await funnel(page, 'In stock').click();
    const stock = colMenu(page).getByRole('radiogroup', { name: 'Show in stock' });
    await expect(stock.locator('.lfdln-filter-check-label')).toHaveText(['Yes', 'No']);
    await stock.getByRole('radio', { name: 'No' }).click();
    await expect(colRows(page)).toHaveCount(3);
    await expect(stock.getByRole('radio', { name: 'No' })).toHaveAttribute('aria-checked', 'true');
    await stock.getByRole('radio', { name: 'Yes' }).click();
    await expect(colRows(page)).toHaveCount(9);
    await stock.getByRole('radio', { name: 'Yes' }).click();
    await expect(colRows(page)).toHaveCount(12);
    expect(problems).toEqual([]);
  });

  test("the last two columns' menus are right-aligned", async ({ page }) => {
    await open(page);
    await colsToTop(page);
    for (const [label, end] of [['Kind', false], ['Light', false], ['Price', true], ['In stock', true]] as const) {
      await funnel(page, label).click();
      await expect(colMenu(page)).toBeVisible();
      const [m, f] = await Promise.all([colMenu(page).boundingBox(), funnel(page, label).boundingBox()]);
      if (end) expect(Math.abs(m!.x + m!.width - (f!.x + f!.width))).toBeLessThanOrEqual(1);
      else expect(Math.abs(m!.x - f!.x)).toBeLessThanOrEqual(1);
      expect(m!.y).toBeGreaterThan(f!.y + f!.height); // under it
      await page.keyboard.press('Escape');
    }
    // The menu is not cut off by the table's scrolling box, even with one row left.
    await page.goto('/filter-styles.html?columns.f.kind=Tree');
    await expect(colRows(page)).toHaveCount(1);
    await colsToTop(page);
    await funnel(page, 'Kind').click();
    const clear = colMenu(page).getByRole('button', { name: 'Clear this column' });
    await expect(clear).toBeVisible();
    const [c, wrap] = await Promise.all([clear.boundingBox(), cols(page).locator('.dv-table-wrap').boundingBox()]);
    expect(c!.y).toBeGreaterThan(wrap!.y + wrap!.height); // below the table, and still shown
    await clear.click();
    await expect(colRows(page)).toHaveCount(12);
    // Near the window's bottom edge, the menu opens above the header, and follows it on scroll.
    await funnel(page, 'Kind').evaluate((el) => {
      const r = el.getBoundingClientRect();
      scrollBy(0, r.bottom - innerHeight + 40);
    });
    await funnel(page, 'Kind').click();
    await expect(colMenu(page)).toBeVisible();
    let [m, f] = await Promise.all([colMenu(page).boundingBox(), funnel(page, 'Kind').boundingBox()]);
    expect(m!.y + m!.height).toBeLessThanOrEqual(f!.y);
    await page.evaluate(() => scrollBy(0, 300));
    await expect.poll(async () => {
      [m, f] = await Promise.all([colMenu(page).boundingBox(), funnel(page, 'Kind').boundingBox()]);
      return Math.round(m!.y - (f!.y + f!.height));
    }).toBe(6);
  });

  test('closing the menu takes its scroll and resize listeners away at once', async ({ page }) => {
    // Count the window's live scroll and resize listeners.
    await page.addInitScript(() => {
      const live = new Set<unknown>();
      const w = window as unknown as { liveListeners: () => number };
      const add = window.addEventListener.bind(window);
      const remove = window.removeEventListener.bind(window);
      const key = (t: string, f: unknown, o: unknown) => `${t}|${typeof o === 'boolean' ? o : Boolean((o as { capture?: boolean } | undefined)?.capture)}|${String(f)}`;
      const ids = new WeakMap<object, number>();
      let n = 0;
      const id = (f: unknown) => (typeof f === 'object' || typeof f === 'function') && f ? (ids.get(f) ?? (ids.set(f, ++n), n)) : 0;
      window.addEventListener = ((t: string, f: EventListenerOrEventListenerObject, o?: boolean | AddEventListenerOptions) => {
        if (t === 'scroll' || t === 'resize') live.add(key(t, id(f), o));
        add(t, f, o);
      }) as typeof window.addEventListener;
      window.removeEventListener = ((t: string, f: EventListenerOrEventListenerObject, o?: boolean | EventListenerOptions) => {
        live.delete(key(t, id(f), o));
        remove(t, f, o);
      }) as typeof window.removeEventListener;
      w.liveListeners = () => live.size;
    });
    await open(page);
    await colsToTop(page);
    const count = () => page.evaluate(() => (window as unknown as { liveListeners: () => number }).liveListeners());
    for (const close of ['Escape', 'funnel', 'clear'] as const) {
      if (close === 'clear') {
        await page.goto('/filter-styles.html?columns.f.kind=Herb');
        await colsToTop(page);
      }
      const base = await count();
      await funnel(page, 'Kind').click();
      await expect(colMenu(page)).toBeVisible();
      expect(await count()).toBe(base + 2);
      if (close === 'Escape') await page.keyboard.press('Escape');
      else if (close === 'funnel') await funnel(page, 'Kind').click();
      else await colMenu(page).getByRole('button', { name: 'Clear this column' }).click();
      await expect(colMenu(page)).toHaveCount(0);
      // No scroll or resize has happened since: the listeners are gone anyway.
      await expect.poll(count).toBe(base);
    }
  });

  test('filtered headers get the dot; filtered body cells get dv-filtered', async ({ page }) => {
    await open(page, '?columns.f.kind=Herb&columns.f.stock=yes');
    await expect(colRows(page)).toHaveCount(4);
    await expect(headOf(page, 'Kind').locator('.lfdln-filter-col-dot')).toHaveCount(1);
    await expect(headOf(page, 'In stock').locator('.lfdln-filter-col-dot')).toHaveCount(1);
    await expect(headOf(page, 'Light').locator('.lfdln-filter-col-dot')).toHaveCount(0);
    await expect(headOf(page, 'Kind')).toHaveClass(/dv-filtered/);
    await expect(headOf(page, 'Light')).not.toHaveClass(/dv-filtered/);
    // Kind (2nd) and In stock (5th) cells, in every row; none of the others.
    await expect(cols(page).locator('tbody .dv-filtered')).toHaveCount(8);
    await expect(colRows(page).first().locator('td').nth(0)).toHaveClass(/dv-filtered/);
    await expect(colRows(page).first().locator('td').nth(1)).not.toHaveClass(/dv-filtered/);
    await expect(colRows(page).first().locator('td').nth(3)).toHaveClass(/dv-filtered/);
    // Accent-coloured values; the others keep the text colour.
    const colour = (i: number) => colRows(page).first().locator('td').nth(i).evaluate((el) => getComputedStyle(el).color);
    expect(await colour(0)).not.toBe(await colour(1));
    // The funnel is at full strength when filtered, half otherwise.
    const icon = (label: string) => funnel(page, label).locator('svg').evaluate((el) => getComputedStyle(el).opacity);
    expect(await icon('Kind')).toBe('1');
    expect(await icon('Light')).toBe('0.5');
    // The dot is 6 px; the funnel's description says what the column is set to.
    const dot = await headOf(page, 'Kind').locator('.lfdln-filter-col-dot').boundingBox();
    expect(Math.round(dot!.width)).toBe(6);
    await expect(funnel(page, 'Kind')).toHaveAccessibleDescription('Kind: Herb');
    await expect(funnel(page, 'Light')).toHaveAccessibleDescription('');
  });

  test('the summary reads "N of M · K columns filtered" and Clear all empties them', async ({ page }) => {
    await open(page);
    await expect(colSummary(page)).toHaveText('All 12 results');
    const clearAll = cols(page).locator('.lfdln-filter-col-summary').getByRole('button', { name: 'Clear all' });
    await expect(clearAll).toHaveCount(0);
    await funnel(page, 'Kind').click();
    await colMenu(page).getByRole('checkbox', { name: /Herb/ }).click();
    await expect(colSummary(page)).toHaveText('5 of 12 · 1 column filtered');
    await funnel(page, 'In stock').click();
    await colMenu(page).getByRole('radio', { name: 'Yes' }).click();
    await expect(colSummary(page)).toHaveText('4 of 12 · 2 columns filtered');
    await page.keyboard.press('Escape');
    // Above the table, in the chips row's place; there is no chips row.
    const [s, table] = await Promise.all([cols(page).locator('.lfdln-filter-col-summary').boundingBox(), cols(page).locator('.dv-table-wrap').boundingBox()]);
    expect(s!.y + s!.height).toBeLessThanOrEqual(table!.y);
    await expect(cols(page).locator('.lfdln-filter-chips')).toHaveCount(0);
    await clearAll.click();
    await expect(colRows(page)).toHaveCount(12);
    await expect(colSummary(page)).toHaveText('All 12 results');
    await expect(clearAll).toHaveCount(0);
    await expect(cols(page).locator('.lfdln-filter-col-dot, .dv-filtered')).toHaveCount(0);
    expect([...new URL(page.url()).searchParams.keys()].filter((k) => k.startsWith('columns.f.'))).toEqual([]);
    // Clear all leaves; focus goes to the summary, which stays.
    await expect(colSummary(page)).toBeFocused();
  });

  test('in cards view it becomes the panel', async ({ page }) => {
    const { problems } = await open(page, '?columns.f.kind=Herb');
    await cols(page).getByRole('button', { name: 'Show cards' }).click();
    await expect(cols(page).locator('.lfdln-filter-trigger')).toBeVisible();
    await expect(cols(page).locator('.lfdln-filter-badge')).toHaveText('1');
    await expect(cols(page).locator('.lfdln-filter-col, .lfdln-filter-col-summary')).toHaveCount(0);
    await expect(cols(page).locator('.dv-cards > li')).toHaveCount(5);
    await cols(page).getByRole('button', { name: 'Show a table' }).click();
    await expect(cols(page).locator('.lfdln-filter-trigger')).toHaveCount(0);
    await expect(headOf(page, 'Kind').locator('.lfdln-filter-col-dot')).toHaveCount(1);
    expect(problems).toEqual([]);
  });

  test('a bookmarked value that no longer exists shows the header dot and clears', async ({ page }) => {
    await open(page, '?columns.f.kind=Cactus');
    await expect(colRows(page)).toHaveCount(0);
    await expect(headOf(page, 'Kind').locator('.lfdln-filter-col-dot')).toHaveCount(1);
    await expect(colSummary(page)).toHaveText('0 of 12 · 1 column filtered');
    await funnel(page, 'Kind').click();
    const cactus = colMenu(page).getByRole('checkbox', { name: /Cactus/ });
    await expect(cactus).toHaveAttribute('aria-checked', 'true');
    await expect(cactus.locator('.lfdln-filter-check-count')).toHaveText('0');
    await colMenu(page).getByRole('button', { name: 'Clear this column' }).click();
    await expect(colRows(page)).toHaveCount(12);
    await expect(headOf(page, 'Kind').locator('.lfdln-filter-col-dot')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get('columns.f.kind')).toBeNull();
  });

  test("two lists, two styles: opening #bar2's pill closes #columns' menu; neither list's style changes the other", async ({ page }) => {
    const { problems } = await open(page);
    const bar2Pill = page.locator('#bar2 .lfdln-filter-bar-pill[data-key="kind"]');
    await funnel(page, 'Kind').click();
    await expect(colMenu(page)).toBeVisible();
    await bar2Pill.click();
    await expect(page.locator('#bar2 .lfdln-filter-bar-pill-menu')).toBeVisible();
    await expect(colMenu(page)).toHaveCount(0);
    await funnel(page, 'Light').click();
    await expect(colMenu(page)).toBeVisible();
    await expect(page.locator('#bar2 .lfdln-filter-bar-pill-menu')).toHaveCount(0);
    await page.keyboard.press('Escape');
    // A filter in #bar2 leaves #columns alone, and its table gets no columns look.
    await bar2Pill.click();
    await page.locator('#bar2 .lfdln-filter-bar-pill-menu .lfdln-filter-check-row[data-value="Herb"]').click();
    await expect(page.locator('#bar2 tbody tr')).toHaveCount(5);
    await expect(colRows(page)).toHaveCount(12);
    await expect(page.locator('#bar2 .dv-filtered, #bar2 .lfdln-filter-col, #bar2 .lfdln-filter-col-summary')).toHaveCount(0);
    await expect(cols(page).locator('.lfdln-filter-bar-row')).toHaveCount(0);
    // #bar2's menu is still the bar's (its own list, not the columns' one).
    await expect(page.locator('#bar2 .lfdln-filter-bar-pill-menu .lfdln-filter-bar-pill-list')).toHaveAttribute('role', 'group');
    await expect(page.locator('#bar2 .lfdln-filter-col-list')).toHaveCount(0);
    // Same cell colour for #bar2's filtered Kind as for an unfiltered one.
    const c2 = await page.locator('#bar2 tbody tr').first().locator('td').nth(0).evaluate((el) => getComputedStyle(el).color);
    const c1 = await page.locator('#bar2 tbody tr').first().locator('td').nth(1).evaluate((el) => getComputedStyle(el).color);
    expect(c2).toBe(c1);
    expect(problems).toEqual([]);
  });

  // No pointerdown when the dialog opens by keyboard, so it must close the others itself.
  test("opening another list's dialog by keyboard closes #bar2's menu", async ({ page }) => {
    const { problems } = await open(page);
    await page.locator('#bar2 .lfdln-filter-bar-pill[data-key="kind"]').click();
    await expect(page.locator('#bar2 .lfdln-filter-bar-pill-menu')).toBeVisible();
    await page.locator('#plants .lfdln-filter-button').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#plants .lfdln-filter-pop')).toBeVisible();
    await expect(page.locator('#bar2 .lfdln-filter-bar-pill-menu')).toHaveCount(0);
    expect(problems).toEqual([]);
  });
});

test.describe('columns on a phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('phone: funnels are 44 px and menus open as the bottom sheet', async ({ page }) => {
    const { problems } = await open(page);
    const f = await funnel(page, 'Kind').boundingBox();
    expect(Math.round(f!.height)).toBeGreaterThanOrEqual(44);
    expect(Math.round(f!.width)).toBeGreaterThanOrEqual(44);
    await funnel(page, 'Kind').click();
    const sheet = page.locator('#columns dialog.lfdln-filter-col-menu[open]');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    expect(Math.round(box!.width)).toBe(390);
    expect(Math.round(box!.y + box!.height)).toBe(800);
    for (const r of await sheet.locator('.lfdln-filter-check-row').all()) expect(Math.round((await r.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
    await sheet.getByRole('checkbox', { name: /Herb/ }).click();
    await expect(colRows(page)).toHaveCount(5);
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(funnel(page, 'Kind')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(problems).toEqual([]);
  });
});

// #search: the 12 plants with filter-style="search" and search-in, Name and Owner searchable, in
// #search-box (the width test narrows it). #search-server: the recipes through the json adapter
// (server mode; Name searchable). #search-equals: the recipes through an adapter that can't search
// one column (supports.searchIn false), Name and Cuisine searchable.
const sfInput = (page: Page, id = 'search') => page.locator(`#${id} .dv-search .lfdln-search-filter-field input[role=combobox]`);
const sfTokens = (page: Page, id = 'search') => page.locator(`#${id} .dv-search .lfdln-search-filter-field .lfdln-search-filter-token`);
const sfList = (page: Page, id = 'search') => page.locator(`#${id}`).getByRole('listbox', { name: 'Suggestions' });
const addressOf = (page: Page) => new URL(page.url()).searchParams;

function typedCounts(page: Page): string[] {
  const asked: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname === '/api/recipes' && u.searchParams.get('size') === '1') asked.push(u.searchParams.get('search') ?? '');
  });
  return asked;
}

test.describe('search', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('one field replaces the search box and the filter', async ({ page }) => {
    const { problems } = await open(page);
    const list = page.locator('#search');
    await expect(sfInput(page)).toBeVisible();
    await expect(list.locator('.dv-search.dv-search-filter')).toHaveCount(1);
    await expect(list.locator('.lfdln-search-root')).toHaveCount(0);
    await expect(list.locator('.lfdln-filter-button')).toHaveCount(0);
    await expect(list.locator('.dv-filter')).toHaveCount(0);
    await expect(list.locator('[role="combobox"]')).toHaveCount(1);
    await expect(list.locator('.lfdln-filter-chips')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('a token applies at once and lands in the address', async ({ page }) => {
    const { problems } = await open(page);
    const input = sfInput(page);
    await input.click();
    await input.pressSequentially('her');
    await expect(sfList(page).getByRole('option', { name: /Herb/ })).toBeVisible();
    await input.press('Enter');
    await expect(sfTokens(page)).toHaveText(['Kind is Herb']);
    await expect.poll(() => addressOf(page).get('search.f.kind')).toBe('Herb');
    await expect(page.locator('#search tbody tr')).toHaveCount(5);
    await input.pressSequentially('mint');
    await input.press('Enter');
    await expect.poll(() => addressOf(page).get('search.search')).toBe('mint');
    await expect(page.locator('#search tbody tr')).toHaveCount(1);
    await page.reload();
    await expect(sfTokens(page)).toHaveText(['Any column has mint', 'Kind is Herb']);
    await expect(page.locator('#search tbody tr')).toHaveCount(1);
    expect(problems).toEqual([]);
  });

  test('Name has “…” sets search.in', async ({ page }) => {
    await open(page);
    const input = sfInput(page);
    await input.click();
    await input.pressSequentially('ba');
    await sfList(page).getByRole('option', { name: /Name has “ba”/ }).click();
    await expect.poll(() => addressOf(page).get('search.in')).toBe('name');
    expect(addressOf(page).get('search.search')).toBe('ba');
    await expect(sfTokens(page)).toHaveText(['Name has ba']);
    await expect(page.locator('#search tbody tr')).toHaveCount(1);
  });

  test('Done keeps the Search in; removing the text token clears it too', async ({ page }) => {
    await open(page, '?search.search=mint&search.in=name');
    const input = sfInput(page);
    await expect(sfTokens(page)).toHaveText(['Name has mint']);
    // Done searches the typed text in the "Search in" already applied.
    await input.click();
    await input.pressSequentially('sa');
    await page.locator('#search .dv-search').getByRole('button', { name: 'Done' }).click();
    await expect(sfTokens(page)).toHaveText(['Name has sa']);
    expect(addressOf(page).get('search.in')).toBe('name');
    // × on the text token: no hidden "Search in" is left behind.
    await page.locator('#search').getByRole('button', { name: 'Remove Name has sa' }).click();
    await expect(sfTokens(page)).toHaveCount(0);
    await expect.poll(() => addressOf(page).has('search.search')).toBe(false);
    expect(addressOf(page).has('search.in')).toBe(false);
    await input.pressSequentially('sa');
    await page.locator('#search .dv-search').getByRole('button', { name: 'Done' }).click();
    await expect(sfTokens(page)).toHaveText(['Any column has sa']);
    expect(addressOf(page).get('search.search')).toBe('sa');
    expect(addressOf(page).has('search.in')).toBe(false);
  });

  test('a bookmark with a search and a vanished value shows both and clears', async ({ page }) => {
    const { problems } = await open(page, '?search.search=mint&search.f.kind=Cactus');
    await expect(sfTokens(page)).toHaveText(['Any column has mint', 'Kind is Cactus']);
    await page.locator('#search').getByRole('button', { name: 'Remove Kind is Cactus' }).click();
    await expect.poll(() => addressOf(page).has('search.f.kind')).toBe(false);
    expect(addressOf(page).get('search.search')).toBe('mint');
    await page.locator('#search').getByRole('button', { name: 'Remove Any column has mint' }).click();
    await expect.poll(() => addressOf(page).has('search.search')).toBe(false);
    await expect(sfTokens(page)).toHaveCount(0);
    await expect(page.locator('#search tbody tr')).toHaveCount(12);
    expect(problems).toEqual([]);
  });

  test('Search for shows the count of the typed text', async ({ page }) => {
    await open(page);
    const input = sfInput(page);
    await input.click();
    // At once, in the same update as the typing: Mint is the only plant with "mint".
    const count = await page.locator('#search').evaluate(async (el) => {
      const i = el.querySelector<HTMLInputElement>('.dv-search input[role=combobox]')!;
      i.value = 'mint';
      i.dispatchEvent(new Event('input', { bubbles: true }));
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      return el.querySelector('[role=option] .lfdln-search-filter-count')?.textContent;
    });
    expect(count).toBe('1');
    await expect(sfList(page).getByRole('option', { name: /Search for “mint”/ })).toContainText('1');
  });

  test('server mode: the count comes 300 ms after typing stops, one request', async ({ page }) => {
    const asked = typedCounts(page);
    const { problems } = await open(page);
    await expect(page.locator('#search-server tbody tr').first()).toBeVisible();
    const input = sfInput(page, 'search-server');
    await input.click();
    await input.pressSequentially('ros', { delay: 100 });
    const row = sfList(page, 'search-server').getByRole('option', { name: /Search for “ros”/ });
    await expect(row.locator('.lfdln-search-filter-count')).toHaveText('20', { timeout: 1000 });
    await page.waitForTimeout(400);
    expect(asked).toEqual(['ros']);
    expect(problems).toEqual([]);
  });

  test('Enter before the count commits at once and the late count never shows', async ({ page }) => {
    // The first count request answers after 800 ms, and with 99 (so it can't pass for a later one).
    let first = true;
    await page.route((u) => u.pathname === '/api/recipes' && u.searchParams.get('size') === '1', async (route) => {
      if (!first) return route.continue();
      first = false;
      const u = new URL(route.request().url());
      u.searchParams.set('slowcount', '1');
      try {
        const res = await route.fetch({ url: u.href });
        await route.fulfill({ response: res, json: { ...(await res.json()), total: 99 } });
      } catch {
        // cancelled by the list: nothing to answer
      }
    });
    await open(page);
    const list = page.locator('#search-server');
    await expect(list.locator('tbody tr').first()).toBeVisible();
    await list.evaluate((el) => {
      const w = window as unknown as { seen: string[]; queries: { search: string }[] };
      w.seen = [];
      w.queries = [];
      el.addEventListener('dv-query', (e) => w.queries.push((e as CustomEvent).detail));
      new MutationObserver(() => {
        for (const c of el.querySelectorAll('.lfdln-search-filter-count')) w.seen.push(c.textContent ?? '');
      }).observe(el, { subtree: true, childList: true, characterData: true });
    });
    const input = sfInput(page, 'search-server');
    await input.click();
    await input.pressSequentially('ros');
    // The count for "ros" has been asked for (300 ms after the typing) and is still on its way.
    await expect.poll(() => first).toBe(false);
    await input.press('e');
    await input.press('Enter');
    expect(await page.evaluate(() => (window as unknown as { queries: { search: string }[] }).queries.map((q) => q.search))).toEqual(['rose']);
    await expect(sfTokens(page, 'search-server')).toHaveText(['Name has rose']);
    // Typed again: the "Search for" row waits for its own count; the slow answer for "ros" never shows.
    await input.pressSequentially('rose');
    await expect(sfList(page, 'search-server').getByRole('option', { name: /Search for “rose”/ })).toBeVisible();
    await page.waitForTimeout(1200);
    const seen = await page.evaluate(() => (window as unknown as { seen: string[] }).seen);
    expect(seen).not.toContain('99');
    await expect(sfList(page, 'search-server').getByRole('option', { name: /Search for “rose”/ }).locator('.lfdln-search-filter-count')).toHaveText('20');
  });

  test("no per-field rows when the adapter can't search one column", async ({ page }) => {
    await open(page);
    await expect(page.locator('#search-equals tbody tr').first()).toBeVisible();
    const input = sfInput(page, 'search-equals');
    await input.click();
    await input.pressSequentially('ro');
    await expect(sfList(page, 'search-equals').getByRole('option', { name: /Search for “ro”/ })).toBeVisible();
    await expect(sfList(page, 'search-equals').getByRole('option', { name: /has “ro”/ })).toHaveCount(0);
    // #search (search-in, two fields) offers them.
    await sfInput(page).click();
    await sfInput(page).pressSequentially('ro');
    await expect(sfList(page).getByRole('option', { name: /has “ro”/ })).toHaveCount(2);
  });

  test('focus with nothing typed: no row is active, and Enter applies nothing', async ({ page }) => {
    await open(page);
    const input = sfInput(page);
    await input.click();
    await expect(sfList(page)).toBeVisible();
    await expect(input).not.toHaveAttribute('aria-activedescendant', /.*/);
    await input.press('Enter');
    await expect(sfTokens(page)).toHaveCount(0);
    expect([...addressOf(page).keys()].filter((k) => k.startsWith('search.'))).toEqual([]);
    await expect(page.locator('#search tbody tr')).toHaveCount(12);
  });

  test('typed text is dropped on Back, a new state and a style switch', async ({ page }) => {
    await open(page);
    const input = sfInput(page);
    const list = page.locator('#search');
    await input.click();
    await input.pressSequentially('her');
    await input.press('Enter');
    await expect.poll(() => addressOf(page).get('search.f.kind')).toBe('Herb');
    await input.pressSequentially('su');
    await page.goBack();
    await expect(sfTokens(page)).toHaveCount(0);
    await expect(input).toHaveValue('');
    // A new state from the page.
    await input.pressSequentially('su');
    await list.evaluate((el) => {
      (el as HTMLElement & { state: unknown }).state = { search: 'mint' };
    });
    await expect(sfTokens(page)).toHaveText(['Any column has mint']);
    await expect(input).toHaveValue('');
    // Another filter style and back.
    await input.pressSequentially('su');
    await list.evaluate(async (el) => {
      const v = el as HTMLElement & { filterStyle: string; updateComplete: Promise<unknown> };
      v.filterStyle = 'bar';
      await v.updateComplete;
      v.filterStyle = 'search';
      await v.updateComplete;
    });
    await expect(input).toHaveValue('');
  });

  test('narrower than 480 px the listbox is the bottom sheet', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { errors: string[] };
      w.errors = [];
      addEventListener('error', (e) => w.errors.push(e.message));
    });
    const { problems } = await open(page);
    const width = (px: number) => page.locator('#search-box').evaluate((el, w) => {
      (el as HTMLElement).style.width = `${w}px`;
    }, px);
    await width(470);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await sfInput(page).click();
    const sheet = page.locator('#search dialog.lfdln-search-filter-pop[open]');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('input[role=combobox]')).toBeFocused();
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.y + box.height)).toBe(900);
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await width(900);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await sfInput(page).click();
    await expect(page.locator('#search div.lfdln-search-filter-pop')).toBeVisible();
    await expect(page.locator('#search dialog.lfdln-search-filter-pop')).toHaveCount(0);
    expect(page.viewportSize()!.width).toBe(1280);
    expect(problems).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { errors: string[] }).errors)).toEqual([]);
  });

  test('widening past 480 px with the sheet open moves focus to the field, keeping the text', async ({ page }) => {
    const { problems } = await open(page);
    const width = (px: number) => page.locator('#search-box').evaluate((el, w) => {
      (el as HTMLElement).style.width = `${w}px`;
    }, px);
    await width(470);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await sfInput(page).click();
    const sheet = page.locator('#search dialog.lfdln-search-filter-pop[open]');
    await expect(sheet).toBeVisible();
    await sheet.locator('input[role=combobox]').pressSequentially('su');
    await width(900);
    await expect(page.locator('#search dialog.lfdln-search-filter-pop')).toHaveCount(0);
    await expect(sfList(page)).toBeVisible();
    await expect(sfInput(page)).toBeFocused();
    await expect(sfInput(page)).toHaveValue('su');
    await expect(sfInput(page)).toHaveAttribute('aria-expanded', 'true');
    await sfInput(page).press('Enter');
    await expect(sfTokens(page).first()).toBeVisible();
    expect(problems).toEqual([]);
  });
});

test.describe('search on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('phone 390 px: the field is 44 px tall, the sheet rows 44 px, no sideways scroll', async ({ page }) => {
    const { problems } = await open(page);
    const f = page.locator('#search .dv-search .lfdln-search-filter-field');
    const h = (await f.boundingBox())!.height;
    expect(h).toBeGreaterThanOrEqual(44);
    expect(h).toBeLessThan(48);
    await sfInput(page).click();
    const sheet = page.locator('#search dialog.lfdln-search-filter-pop[open]');
    await expect(sheet).toBeVisible();
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.width)).toBe(390);
    expect(Math.round(box.y + box.height)).toBe(844);
    await sheet.locator('input[role=combobox]').pressSequentially('her');
    for (const r of await sheet.getByRole('option').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) expect(r).toBeGreaterThanOrEqual(44);
    await sheet.locator('input[role=combobox]').press('Enter');
    await expect(page.locator('#search tbody tr')).toHaveCount(5);
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth])).toEqual([390, 390]);
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(sfInput(page)).toBeFocused();
    expect(problems).toEqual([]);
  });
});

// #vprobe (plants, remember-as="vprobe", url-state="vprobe"), #vprobe-page (page views All
// plants / Sunny / Cheap with count 99, no remember-as, url-state="vprobepage") and
// #vprobe-server (recipes through the json adapter, data-draft Indian): a test style with the
// saved views store attached. Each tab is an <li data-key data-count data-current data-user>.
test.describe('saved views store', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  const tabs = (page: Page, id: string) => page.locator(`#${id} .vprobe li`);
  const userTab = (page: Page, id: string) => page.locator(`#${id} .vprobe li[data-user="true"]`);
  // Keeps every views-change (and dv-query) detail the list fires, in window.vc[id] (window.dq[id]).
  const listen = (page: Page, id: string) => page.evaluate((id) => {
    const w = window as unknown as { vc: Record<string, unknown[]>; dq: Record<string, unknown[]> };
    w.vc ??= {};
    w.dq ??= {};
    w.vc[id] = [];
    w.dq[id] = [];
    const el = document.getElementById(id)!;
    el.addEventListener('views-change', (e) => w.vc[id]!.push((e as CustomEvent).detail));
    el.addEventListener('dv-query', (e) => w.dq[id]!.push((e as CustomEvent).detail));
  }, id);
  const heard = (page: Page, id: string, what: 'vc' | 'dq' = 'vc') =>
    page.evaluate(([id, what]) => (window as unknown as Record<string, Record<string, unknown[]>>)[what]![id]!, [id, what] as const);
  const stored = (page: Page, key = 'vprobe.views') => page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  }, key);
  const save = async (page: Page, id: string) => {
    await page.locator(`#${id} .probe-draft`).click();
    await page.locator(`#${id} .vprobe-save`).click();
  };

  test('save stores under <remember-as>.views and fires views-change', async ({ page }) => {
    const { problems } = await open(page);
    await listen(page, 'vprobe');
    await save(page, 'vprobe');
    await expect(userTab(page, 'vprobe')).toHaveCount(1);
    const views = await stored(page);
    expect(views).toHaveLength(1);
    expect(views[0]).toEqual({ key: expect.stringMatching(/^u-[0-9a-z]+$/), label: 'Herbs', filter: { kind: ['Herb'] } });
    expect(await heard(page, 'vprobe')).toEqual([{ views }]);
    await expect(userTab(page, 'vprobe')).toHaveAttribute('data-current', 'true');
    await expect(userTab(page, 'vprobe').locator('.vprobe-pick')).toHaveText('Herbs');
    await expect(tabs(page, 'vprobe').first()).toHaveAttribute('data-current', 'false');
    expect(new URL(page.url()).searchParams.get('vprobe.f.kind')).toBe('Herb');
    await expect(page.locator('#vprobe tbody tr')).toHaveCount(5);
    // The draft is closed.
    await expect(page.locator('#vprobe .probe')).toHaveAttribute('data-count', 'null');
    expect(problems).toEqual([]);
  });

  test('reload: the view is back and current', async ({ page }) => {
    await open(page);
    await save(page, 'vprobe');
    await expect(userTab(page, 'vprobe')).toHaveAttribute('data-current', 'true');
    await page.reload();
    await expect(userTab(page, 'vprobe')).toHaveCount(1);
    await expect(userTab(page, 'vprobe').locator('.vprobe-pick')).toHaveText('Herbs');
    await expect(userTab(page, 'vprobe')).toHaveAttribute('data-current', 'true');
    // Picking All and the view again: still current, from the state alone.
    await tabs(page, 'vprobe').first().locator('.vprobe-pick').click();
    await expect(userTab(page, 'vprobe')).toHaveAttribute('data-current', 'false');
    await expect(page.locator('#vprobe tbody tr')).toHaveCount(12);
    await userTab(page, 'vprobe').locator('.vprobe-pick').click();
    await expect(userTab(page, 'vprobe')).toHaveAttribute('data-current', 'true');
    await expect(page.locator('#vprobe tbody tr')).toHaveCount(5);
  });

  test('rename and delete fire views-change; undo restores the old place', async ({ page }) => {
    await open(page);
    await listen(page, 'vprobe');
    await save(page, 'vprobe');
    await page.locator('#vprobe').evaluate((el) => {
      el.dataset.draft = '{"light":["Shade"]}';
      el.dataset.label = 'Shady';
    });
    await save(page, 'vprobe');
    await expect(userTab(page, 'vprobe')).toHaveCount(2);
    const [herbs, shady] = (await stored(page)) as { key: string }[];
    expect(herbs!.key).not.toBe(shady!.key);
    await userTab(page, 'vprobe').first().locator('.vprobe-rename').click();
    await expect(userTab(page, 'vprobe').first().locator('.vprobe-pick')).toHaveText('Leafy');
    expect((await stored(page)).map((v: { label: string }) => v.label)).toEqual(['Leafy', 'Shady']);
    expect(await heard(page, 'vprobe')).toHaveLength(3);
    // Delete (through the kit's ⋯ menu): gone at once, stored, an undo toast; the filters stay.
    await page.locator('#vprobe').getByRole('button', { name: 'More for Leafy' }).click();
    await page.locator('#vprobe').getByRole('menuitem', { name: 'Delete' }).click();
    await expect(userTab(page, 'vprobe')).toHaveCount(1);
    expect((await stored(page)).map((v: { label: string }) => v.label)).toEqual(['Shady']);
    await expect(page.locator('#vprobe .vprobe-undo span')).toHaveText('Leafy');
    expect(await heard(page, 'vprobe')).toHaveLength(4);
    expect(new URL(page.url()).searchParams.get('vprobe.f.light')).toBe('Shade');
    await page.locator('#vprobe .vprobe-undo-button').click();
    await expect(page.locator('#vprobe .vprobe-undo')).toHaveCount(0);
    await expect(userTab(page, 'vprobe').locator('.vprobe-pick')).toHaveText(['Leafy', 'Shady']);
    expect((await stored(page)).map((v: { label: string }) => v.label)).toEqual(['Leafy', 'Shady']);
    const last = await heard(page, 'vprobe');
    expect(last).toHaveLength(5);
    expect(last[4]).toEqual({ views: await stored(page) });
    // A rename to nothing keeps the name and fires nothing.
    await page.locator('#vprobe').evaluate((el) => (el.dataset.rename = '   '));
    await userTab(page, 'vprobe').first().locator('.vprobe-rename').click();
    await expect(userTab(page, 'vprobe').first().locator('.vprobe-pick')).toHaveText('Leafy');
    expect(await heard(page, 'vprobe')).toHaveLength(5);
  });

  test('the undo toast goes after 5 s', async ({ page }) => {
    await page.clock.install();
    await open(page);
    await save(page, 'vprobe');
    await userTab(page, 'vprobe').locator('.vprobe-delete').click();
    await expect(page.locator('#vprobe .vprobe-undo')).toHaveCount(1);
    await page.clock.runFor(4900);
    await expect(page.locator('#vprobe .vprobe-undo')).toHaveCount(1);
    await page.clock.runFor(200);
    await expect(page.locator('#vprobe .vprobe-undo')).toHaveCount(0);
    expect(await stored(page)).toEqual([]);
  });

  test('page views stay fixed; "All" is added when the page sets none', async ({ page }) => {
    await open(page);
    await expect(tabs(page, 'vprobe')).toHaveCount(1);
    const all = tabs(page, 'vprobe').first();
    await expect(all).toHaveAttribute('data-key', '');
    await expect(all.locator('.vprobe-pick')).toHaveText('All');
    await expect(all).toHaveAttribute('data-count', '12');
    await expect(all).toHaveAttribute('data-current', 'true');
    await expect(all).toHaveAttribute('data-user', 'false');
    // The page's views: as given, no rename or delete; the viewer's own views nav is not drawn,
    // the style is drawn above the bar and nothing is in .dv-filter.
    const pv = tabs(page, 'vprobe-page');
    await expect(pv.locator('.vprobe-pick')).toHaveText(['All plants', 'Sunny', 'Cheap']);
    expect(await pv.evaluateAll((li) => li.map((x) => x.getAttribute('data-key')))).toEqual(['', 'sun', 'cheap']);
    expect(await pv.evaluateAll((li) => li.map((x) => x.getAttribute('data-count')))).toEqual(['12', '7', '99']);
    expect(await pv.evaluateAll((li) => li.map((x) => x.getAttribute('data-current')))).toEqual(['true', 'false', 'false']);
    await expect(pv.locator('.vprobe-rename, .vprobe-delete, .lfdln-menu-button')).toHaveCount(0);
    await expect(page.locator('#vprobe-page .dv-views')).toHaveCount(0);
    await expect(page.locator('#vprobe-page > .dv-root > .dv-above + .dv-bar')).toHaveCount(1);
    await expect(page.locator('#vprobe-page .dv-above .vprobe')).toHaveCount(1);
    await expect(page.locator('#vprobe-page .dv-filter')).toHaveCount(0);
    // The applied filters show as the viewer's chips (showsApplied false).
    await save(page, 'vprobe-page');
    await expect(page.locator('#vprobe-page .lfdln-filter-chips')).toBeVisible();
  });

  test('a page tab is current only when no filters or search are applied', async ({ page }) => {
    await open(page, '?vprobepage.f.kind=Herb');
    await expect(page.locator('#vprobe-page tbody tr')).toHaveCount(5);
    const pv = tabs(page, 'vprobe-page');
    await expect(pv).toHaveCount(3);
    expect(await pv.evaluateAll((li) => li.map((x) => x.getAttribute('data-current')))).toEqual(['false', 'false', 'false']);
  });

  test('picking a page view clears filters and search', async ({ page }) => {
    await open(page, '?vprobepage.f.kind=Herb&vprobepage.search=mint');
    await expect(page.locator('#vprobe-page tbody tr')).toHaveCount(1);
    await tabs(page, 'vprobe-page').nth(1).locator('.vprobe-pick').click();
    await expect(page.locator('#vprobe-page tbody tr')).toHaveCount(7);
    const params = new URL(page.url()).searchParams;
    expect(params.get('vprobepage.view')).toBe('sun');
    expect(params.get('vprobepage.f.kind')).toBeNull();
    expect(params.get('vprobepage.search')).toBeNull();
    await expect(page.locator('#vprobe-page .dv-search input[type="search"]')).toHaveValue('');
    await expect(tabs(page, 'vprobe-page').nth(1)).toHaveAttribute('data-current', 'true');
    // A user view saved there applies its filters with view '' (S3-D3), and Back returns.
    await save(page, 'vprobe-page');
    expect(new URL(page.url()).searchParams.get('vprobepage.view')).toBeNull();
    await expect(page.locator('#vprobe-page tbody tr')).toHaveCount(5);
    await expect(userTab(page, 'vprobe-page')).toHaveAttribute('data-current', 'true');
    await page.goBack();
    await expect(tabs(page, 'vprobe-page').nth(1)).toHaveAttribute('data-current', 'true');
    await expect(page.locator('#vprobe-page tbody tr')).toHaveCount(7);
  });

  test('savedViews from the page wins and storage is untouched', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('vprobe.views', JSON.stringify([{ key: 'u-old', label: 'Old', filter: {} }])));
    await open(page);
    await expect(userTab(page, 'vprobe').locator('.vprobe-pick')).toHaveText(['Old']);
    await listen(page, 'vprobe');
    await page.locator('#vprobe').evaluate((el) => {
      (el as unknown as { savedViews: unknown }).savedViews = [{ key: 'p-1', label: 'Shady', filter: { light: ['Shade'] } }];
    });
    await expect(userTab(page, 'vprobe').locator('.vprobe-pick')).toHaveText(['Shady']);
    await expect(userTab(page, 'vprobe')).toHaveAttribute('data-count', '3');
    await save(page, 'vprobe');
    await expect(userTab(page, 'vprobe').locator('.vprobe-pick')).toHaveText(['Shady', 'Herbs']);
    const vc = await heard(page, 'vprobe') as { views: { label: string }[] }[];
    expect(vc).toHaveLength(1);
    expect(vc[0]!.views.map((v) => v.label)).toEqual(['Shady', 'Herbs']);
    expect(await stored(page)).toEqual([{ key: 'u-old', label: 'Old', filter: {} }]);
    // The page's own array is not changed; setting it again replaces the viewer's copy.
    expect(await page.locator('#vprobe').evaluate((el) => (el as unknown as { savedViews: unknown[] }).savedViews.length)).toBe(1);
    await page.locator('#vprobe').evaluate((el) => {
      (el as unknown as { savedViews: unknown }).savedViews = [];
    });
    await expect(userTab(page, 'vprobe')).toHaveCount(0);
  });

  test('without remember-as views last until reload', async ({ page }) => {
    await open(page);
    await save(page, 'vprobe-page');
    await expect(userTab(page, 'vprobe-page')).toHaveCount(1);
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.endsWith('.views')))).toEqual([]);
    await page.goto('/filter-styles.html');
    await expect(tabs(page, 'vprobe-page')).toHaveCount(3);
    await expect(userTab(page, 'vprobe-page')).toHaveCount(0);
  });

  test('storage that throws or holds bad JSON', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new Error('storage blocked');
      };
      Storage.prototype.setItem = () => {
        throw new Error('storage blocked');
      };
    });
    const { problems } = await open(page);
    await expect(tabs(page, 'vprobe')).toHaveCount(1);
    await save(page, 'vprobe');
    await expect(userTab(page, 'vprobe')).toHaveCount(1);
    await expect(userTab(page, 'vprobe')).toHaveAttribute('data-current', 'true');
    expect(problems).toEqual([]);
  });

  test('bad JSON in storage: one warning, the list draws', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('vprobe.views', '{'));
    const { problems, warnings } = await open(page);
    await expect(tabs(page, 'vprobe')).toHaveCount(1);
    // Draw again a few times.
    await page.locator('#vprobe .probe-draft').click();
    await page.locator('#vprobe .probe-close').click();
    await save(page, 'vprobe');
    await expect(userTab(page, 'vprobe')).toHaveCount(1);
    expect(warnings.filter((w) => w.includes('vprobe.views'))).toHaveLength(1);
    expect(problems).toEqual([]);
  });

  test('browser mode previews the draft; server mode doesn\'t', async ({ page }) => {
    await open(page);
    const url = page.url();
    await page.locator('#vprobe .probe-draft').click();
    await expect(page.locator('#vprobe tbody tr')).toHaveCount(5);
    await expect(page.locator('#vprobe .probe')).toHaveAttribute('data-count', '5');
    await expect(page.locator('#vprobe > .dv-root')).not.toHaveAttribute('data-filter-open', '');
    expect(page.url()).toBe(url);
    await page.locator('#vprobe .probe-close').click();
    await expect(page.locator('#vprobe tbody tr')).toHaveCount(12);
    // Server mode: the rows stay, the count comes from the server after 300 ms.
    await expect(page.locator('#vprobe-server tbody tr')).toHaveCount(20);
    await page.locator('#vprobe-server .probe-draft').click();
    const asked = Date.now();
    await expect(page.locator('#vprobe-server .probe')).toHaveAttribute('data-count', 'null');
    await expect(page.locator('#vprobe-server .probe')).toHaveAttribute('data-count', '11');
    expect(Date.now() - asked).toBeGreaterThanOrEqual(300);
    await expect(page.locator('#vprobe-server tbody tr')).toHaveCount(20);
    await expect(page.locator('#vprobe-server tbody tr').first()).toContainText('Spiced tea');
  });

  test('server mode: a user view sends filters and search, view \'\'', async ({ page }) => {
    await open(page);
    await expect(page.locator('#vprobe-server tbody tr')).toHaveCount(20);
    await listen(page, 'vprobe-server');
    await page.locator('#vprobe-server .dv-search input[type="search"]').fill('Spiced');
    await expect.poll(async () => (await heard(page, 'vprobe-server', 'dq')).length).toBe(1);
    await save(page, 'vprobe-server');
    await expect(userTab(page, 'vprobe-server')).toHaveCount(1);
    const dq = await heard(page, 'vprobe-server', 'dq') as Record<string, unknown>[];
    expect(dq).toHaveLength(2);
    expect(dq[1]).toMatchObject({ view: '', page: 1, search: 'Spiced', filters: { cuisine: ['Indian'] } });
    const vc = await heard(page, 'vprobe-server') as { views: unknown[] }[];
    expect(vc[0]!.views).toEqual([{ key: expect.stringMatching(/^u-/), label: 'Herbs', filter: { cuisine: ['Indian'] }, search: 'Spiced' }]);
    await expect(page.locator('#vprobe-server tbody tr')).toHaveCount(5);
    await expect(userTab(page, 'vprobe-server')).toHaveAttribute('data-current', 'true');
  });

  test('tab counts: browser counts all; server mode user views have null', async ({ page }) => {
    await open(page);
    await page.locator('#vprobe').evaluate((el) => {
      (el as unknown as { savedViews: unknown }).savedViews = [
        { key: 'a', label: 'Herbs', filter: { kind: ['Herb'] } },
        { key: 'b', label: 'Mint', filter: {}, search: 'mint' },
        { key: 'c', label: 'Cheap herbs', filter: { kind: ['Herb'], price: { to: '4' } } },
      ];
    });
    await expect.poll(() => tabs(page, 'vprobe').evaluateAll((li) => li.map((x) => x.getAttribute('data-count')))).toEqual(['12', '5', '1', '3']);
    await save(page, 'vprobe-server');
    await expect(userTab(page, 'vprobe-server')).toHaveAttribute('data-count', 'null');
    await expect(tabs(page, 'vprobe-server').first()).toHaveAttribute('data-count', 'null');
  });

  test('a style\'s empty() is the empty line', async ({ page }) => {
    await open(page, '?vprobe.search=zzz&test.search=zzz');
    await expect(page.locator('#vprobe .dv-empty')).toHaveText('Nothing in this view.');
    await expect(page.locator('#test .dv-empty')).toHaveText('Nothing to show.'); // a style without empty()
  });
});

// #views: filter-style="views" on the plants, remember-as="views-demo", no page views (so "All"
// is added). #views-page: the same with page views All / Herbs for sun and no remember-as.
test.describe('views', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  const nav = (page: Page, id = 'views') => page.locator(`#${id} nav.lfdln-filter-views-tabs`);
  const tabs = (page: Page, id = 'views') => nav(page, id).locator('.lfdln-filter-views-tab');
  const tab = (page: Page, label: string, id = 'views') =>
    nav(page, id).locator('.lfdln-filter-views-tab', { has: page.locator('.lfdln-filter-views-label', { hasText: new RegExp(`^${label}$`) }) });
  const labels = (page: Page, id = 'views') => nav(page, id).locator('.lfdln-filter-views-label');
  const newView = (page: Page, id = 'views') => page.locator(`#${id} .lfdln-filter-views-new`);
  const builder = (page: Page, id = 'views') => page.locator(`#${id} form.lfdln-filter-views-builder`);
  const chip = (page: Page, key: string, value: string, id = 'views') =>
    builder(page, id).locator(`.lfdln-filter-views-row[data-key="${key}"] .lfdln-filter-toggle[data-value="${value}"]`);
  const saveButton = (page: Page, id = 'views') => builder(page, id).locator('.lfdln-filter-views-save');
  const toast = (page: Page, id = 'views') => page.locator(`#${id} .lfdln-filter-views [role="status"]`);
  const more = (page: Page, label: string, id = 'views') => nav(page, id).getByRole('button', { name: `More for ${label}` });
  const pick = async (page: Page, label: string, item: 'Rename' | 'Delete', id = 'views') => {
    await more(page, label, id).click();
    await page.getByRole('menuitem', { name: item }).click();
  };
  const saveView = async (page: Page, kind: string, name = '', id = 'views') => {
    await newView(page, id).click();
    await chip(page, 'kind', kind, id).click();
    await builder(page, id).getByRole('textbox', { name: 'Name this view' }).fill(name);
    await saveButton(page, id).click();
    await expect(builder(page, id)).toHaveCount(0);
  };
  const focused = (page: Page) => page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    return a === document.body || !a ? 'body' : (a.querySelector('.lfdln-filter-views-label')?.textContent ?? a.textContent ?? '').trim();
  });

  test('tabs with counts, All added, "+ New view" last', async ({ page }) => {
    const { problems } = await open(page);
    await expect(nav(page)).toHaveAttribute('aria-label', 'Views');
    await expect(labels(page)).toHaveText(['All']);
    await expect(tabs(page).first().locator('.lfdln-filter-views-count')).toHaveText('12');
    await expect(tabs(page).first()).toHaveAttribute('aria-current', 'true');
    await expect(nav(page).locator(':scope > :last-child')).toHaveText('New view');
    await expect(newView(page)).toHaveAttribute('aria-expanded', 'false');
    // The style draws the views: no .dv-views nav; it sits above the bar, which keeps the search box.
    await expect(page.locator('#views .dv-views')).toHaveCount(0);
    await expect(page.locator('#views .dv-above + .dv-bar .dv-search input')).toBeVisible();
    await expect(page.locator('#views .lfdln-filter-views .lfdln-menu-button')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('New view opens the builder with the applied filters; the list previews the draft', async ({ page }) => {
    await open(page);
    const before = page.url();
    await newView(page).click();
    await expect(newView(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(builder(page)).toBeVisible();
    await expect(builder(page)).toHaveAttribute('aria-label', 'New view');
    await expect(newView(page)).toHaveAttribute('aria-controls', (await builder(page).getAttribute('id'))!);
    await expect(builder(page).locator('.lfdln-filter-views-row-label')).toHaveText(['Kind', 'Light', 'Price', 'In stock']);
    await expect(builder(page).locator('.lfdln-filter-views-row[data-key="stock"] .lfdln-filter-toggle')).toHaveText(['Yes', 'No']);
    await chip(page, 'kind', 'Herb').click();
    await expect(chip(page, 'kind', 'Herb')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#views tbody tr')).toHaveCount(5);
    await expect(saveButton(page)).toHaveText('Save · 5 results');
    await expect(page.locator('#views .dv-root')).not.toHaveAttribute('data-filter-open', /.*/); // previewed, not dimmed
    expect(page.url()).toBe(before);
    await chip(page, 'stock', 'No').click();
    await expect(saveButton(page)).toHaveText('Save · 1 result');
    await chip(page, 'stock', 'Yes').click(); // one at a time
    await expect(chip(page, 'stock', 'No')).toHaveAttribute('aria-pressed', 'false');
    await expect(saveButton(page)).toHaveText('Save · 4 results');

    // Applied filters are copied in.
    await open(page, '?views.f.light=Sun');
    await newView(page).click();
    await expect(chip(page, 'light', 'Sun')).toHaveAttribute('aria-pressed', 'true');
    await chip(page, 'kind', 'Herb').click();
    await expect(saveButton(page)).toHaveText('Save · 4 results');
  });

  test('Save adds a current tab and applies it; Cancel and Esc drop the draft and refocus New view', async ({ page }) => {
    await open(page);
    await saveView(page, 'Herb', 'Herbs');
    await expect(labels(page)).toHaveText(['All', 'Herbs']);
    await expect(tab(page, 'Herbs')).toHaveAttribute('aria-current', 'true');
    await expect(tab(page, 'All')).not.toHaveAttribute('aria-current', /.*/);
    await expect(tab(page, 'Herbs').locator('.lfdln-filter-views-count')).toHaveText('5');
    await expect(tab(page, 'Herbs')).toBeFocused();
    await expect(newView(page)).toHaveAttribute('aria-expanded', 'false');
    expect(new URL(page.url()).searchParams.get('views.f.kind')).toBe('Herb');
    await expect(page.locator('#views tbody tr')).toHaveCount(5);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('views-demo.views')!).map((v: { label: string }) => v.label))).toEqual(['Herbs']);

    // Cancel: the draft goes, the list shows the applied filters again, focus on New view.
    const url = page.url();
    await newView(page).click();
    await chip(page, 'kind', 'Tree').click();
    await expect(page.locator('#views tbody tr')).toHaveCount(6); // Herb + Tree previewed
    await builder(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(builder(page)).toHaveCount(0);
    await expect(newView(page)).toBeFocused();
    await expect(page.locator('#views tbody tr')).toHaveCount(5);
    expect(page.url()).toBe(url);
    // Esc, from anywhere in the builder.
    await newView(page).click();
    await chip(page, 'kind', 'Tree').click();
    await page.keyboard.press('Escape');
    await expect(builder(page)).toHaveCount(0);
    await expect(newView(page)).toBeFocused();
    await expect(page.locator('#views tbody tr')).toHaveCount(5);
    // New view again toggles it shut.
    await newView(page).click();
    await newView(page).click();
    await expect(builder(page)).toHaveCount(0);

    // Enter in the name saves; an empty name is "View n".
    await newView(page).click();
    await chip(page, 'kind', 'Herb').click(); // off: Tree alone
    await chip(page, 'kind', 'Tree').click();
    await builder(page).getByRole('textbox', { name: 'Name this view' }).fill('Trees');
    await page.keyboard.press('Enter');
    await expect(tab(page, 'Trees')).toHaveAttribute('aria-current', 'true');
    await saveView(page, 'Foliage');
    await expect(labels(page)).toHaveText(['All', 'Herbs', 'Trees', 'View 3']);
    // A tab is a whole state: All clears the filters.
    await tab(page, 'All').click();
    await expect(page.locator('#views tbody tr')).toHaveCount(12);
    await expect(tab(page, 'All')).toHaveAttribute('aria-current', 'true');
  });

  test('a view with no filters and no search can\'t be saved, so All stays current', async ({ page }) => {
    await open(page);
    await newView(page).click();
    const save = saveButton(page);
    await expect(save).toHaveAttribute('aria-disabled', 'true');
    await expect(save).toHaveAccessibleDescription('Pick a filter or search for something first.');
    await save.click({ force: true }); // aria-disabled: Playwright would wait for it to be enabled
    await builder(page).getByRole('textbox', { name: 'Name this view' }).press('Enter');
    await expect(builder(page)).toBeVisible();
    await expect(labels(page)).toHaveText(['All']);
    await chip(page, 'kind', 'Herb').click();
    await expect(save).not.toHaveAttribute('aria-disabled', /.*/);
    await chip(page, 'kind', 'Herb').click(); // back to nothing
    await expect(save).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');
    await expect(tab(page, 'All')).toHaveAttribute('aria-current', 'true');
    // A search alone is something to save.
    await open(page, '?views.search=mint');
    await newView(page).click();
    await expect(saveButton(page)).not.toHaveAttribute('aria-disabled', /.*/);
    await saveButton(page).click();
    await expect(labels(page)).toHaveText(['All', 'View 1']);
    await expect(tab(page, 'View 1')).toHaveAttribute('aria-current', 'true');
  });

  test('the ⋯ menu renames in place: Enter saves, Esc cancels, empty keeps the name', async ({ page }) => {
    await open(page);
    await saveView(page, 'Herb', 'Herbs');
    await expect(more(page, 'Herbs')).toHaveCount(1);
    await pick(page, 'Herbs', 'Rename');
    const input = nav(page).getByRole('textbox', { name: 'Rename Herbs' });
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('Herbs');
    await input.fill('Sunny herbs');
    await input.press('Enter');
    await expect(labels(page)).toHaveText(['All', 'Sunny herbs']);
    await expect(tab(page, 'Sunny herbs')).toBeFocused();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('views-demo.views')!)[0].label)).toBe('Sunny herbs');
    // Esc cancels.
    await pick(page, 'Sunny herbs', 'Rename');
    await nav(page).getByRole('textbox').fill('Nope');
    await page.keyboard.press('Escape');
    await expect(labels(page)).toHaveText(['All', 'Sunny herbs']);
    await expect(tab(page, 'Sunny herbs')).toBeFocused();
    // Empty keeps the name.
    await pick(page, 'Sunny herbs', 'Rename');
    await nav(page).getByRole('textbox').fill('  ');
    await page.keyboard.press('Enter');
    await expect(labels(page)).toHaveText(['All', 'Sunny herbs']);
    // Leaving the box saves.
    await pick(page, 'Sunny herbs', 'Rename');
    await nav(page).getByRole('textbox').fill('Leafy');
    await page.keyboard.press('Tab');
    await expect(labels(page)).toHaveText(['All', 'Leafy']);
    expect(await focused(page)).not.toBe('body');
  });

  test('Delete removes at once and offers Undo for 5 s', async ({ page }) => {
    await page.clock.install();
    await open(page);
    await saveView(page, 'Herb', 'Herbs');
    await pick(page, 'Herbs', 'Delete');
    await expect(labels(page)).toHaveText(['All']);
    // The filters stay applied, shown by the chips row.
    expect(new URL(page.url()).searchParams.get('views.f.kind')).toBe('Herb');
    await expect(page.locator('#views tbody tr')).toHaveCount(5);
    await expect(page.locator('#views .lfdln-filter-chips')).toContainText('Herb');
    // No tab is current: All's count ignores the leftover filters.
    await expect(nav(page).locator('[aria-current]')).toHaveCount(0);
    await expect(toast(page)).toContainText('Deleted “Herbs”');
    await expect(toast(page).getByRole('button', { name: 'Undo' })).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('views-demo.views'))).toBe('[]');
    await page.clock.runFor(5000);
    await expect(toast(page)).toHaveText('');
    await expect(tab(page, 'All')).toBeFocused();

    // Undo within 5 s puts the tab back in its old place.
    await tab(page, 'All').click();
    await saveView(page, 'Herb', 'Herbs');
    await saveView(page, 'Tree', 'Trees');
    await pick(page, 'Herbs', 'Delete');
    await expect(labels(page)).toHaveText(['All', 'Trees']);
    await page.clock.runFor(1000);
    await toast(page).getByRole('button', { name: 'Undo' }).click();
    await expect(labels(page)).toHaveText(['All', 'Herbs', 'Trees']);
    await expect(toast(page)).toHaveText('');
    await expect(tab(page, 'Trees')).toBeFocused(); // the current tab
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('views-demo.views')!).map((v: { label: string }) => v.label))).toEqual(['Herbs', 'Trees']);
  });

  test('after the Undo toast, focus goes to the first tab when none is current', async ({ page }) => {
    await page.clock.install();
    await open(page);
    // Page views without '' and no view picked: no tab is current.
    await page.locator('#views-page').evaluate((el) => {
      (el as unknown as { views: unknown }).views = [
        { key: 'sun', label: 'Sunny', where: (p: { light: string }) => p.light === 'Sun' },
        { key: 'shade', label: 'Shady', where: (p: { light: string }) => p.light === 'Shade' },
      ];
    });
    await expect(labels(page, 'views-page')).toHaveText(['Sunny', 'Shady']);
    await expect(nav(page, 'views-page').locator('[aria-current]')).toHaveCount(0);
    await saveView(page, 'Herb', 'Herbs', 'views-page');
    await pick(page, 'Herbs', 'Delete', 'views-page');
    await expect(toast(page, 'views-page').getByRole('button', { name: 'Undo' })).toBeFocused();
    await expect(nav(page, 'views-page').locator('[aria-current]')).toHaveCount(0);
    await page.clock.runFor(5000);
    await expect(toast(page, 'views-page')).toHaveText('');
    await expect(tab(page, 'Sunny', 'views-page')).toBeFocused();
  });

  test('from a page view, the preview, "Save · N", the saved list and the new tab agree', async ({ page }) => {
    await open(page);
    await tab(page, 'Herbs for sun', 'views-page').click();
    await expect(page.locator('#views-page tbody tr')).toHaveCount(4);
    await newView(page, 'views-page').click();
    await chip(page, 'kind', 'Herb', 'views-page').click();
    // What you see is what you save: a saved view keeps filters + search, never the page view.
    await expect(page.locator('#views-page tbody tr')).toHaveCount(5);
    await expect(saveButton(page, 'views-page')).toHaveText('Save · 5 results');
    await expect(builder(page, 'views-page').locator('.lfdln-filter-views-row[data-key="kind"] .lfdln-filter-toggle[data-value="Herb"] .lfdln-filter-toggle-count')).toHaveText('5');
    await builder(page, 'views-page').getByRole('textbox', { name: 'Name this view' }).fill('Herbs');
    await saveButton(page, 'views-page').click();
    await expect(page.locator('#views-page tbody tr')).toHaveCount(5);
    await expect(tab(page, 'Herbs', 'views-page').locator('.lfdln-filter-views-count')).toHaveText('5');
    await expect(tab(page, 'Herbs', 'views-page')).toHaveAttribute('aria-current', 'true');
  });

  test('page views have no ⋯ menu', async ({ page }) => {
    await open(page);
    await expect(labels(page, 'views-page')).toHaveText(['All', 'Herbs for sun']);
    await expect(nav(page, 'views-page').locator('.lfdln-filter-views-count')).toHaveText(['12', '4']);
    await expect(nav(page, 'views-page').locator('.lfdln-menu-button')).toHaveCount(0);
    await saveView(page, 'Tree', 'Trees', 'views-page');
    await expect(nav(page, 'views-page').locator('.lfdln-menu-button')).toHaveCount(1);
    await expect(more(page, 'Trees', 'views-page')).toHaveCount(1);
    // A page view is a whole state: no filters.
    await tab(page, 'Herbs for sun', 'views-page').click();
    await expect(page.locator('#views-page tbody tr')).toHaveCount(4);
    await expect(tab(page, 'Herbs for sun', 'views-page')).toHaveAttribute('aria-current', 'true');
  });

  test('a stored view with a vanished value shows 0, applies, and its chip clears', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('views-demo.views',
      JSON.stringify([{ key: 'u-cactus', label: 'Cacti', filter: { kind: ['Cactus'] } }])));
    const { problems } = await open(page);
    await expect(labels(page)).toHaveText(['All', 'Cacti']);
    await expect(tab(page, 'Cacti').locator('.lfdln-filter-views-count')).toHaveText('0');
    await tab(page, 'Cacti').click();
    await expect(tab(page, 'Cacti')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('#views tbody tr')).toHaveCount(0);
    await expect(page.locator('#views .dv-empty')).toBeVisible();
    await expect(page.locator('#views .lfdln-filter-chips')).toContainText('Cactus');
    await page.locator('#views .lfdln-filter-chips .lfdln-filter-chip-x').first().click();
    await expect(page.locator('#views tbody tr')).toHaveCount(12);
    await expect(tab(page, 'All')).toHaveAttribute('aria-current', 'true');
    await expect(tab(page, 'Cacti')).not.toHaveAttribute('aria-current', /.*/);
    expect(problems).toEqual([]);
  });

  test('zero-count chips in the builder dim to 0.45 and stay clickable', async ({ page }) => {
    await open(page);
    await newView(page).click();
    await chip(page, 'kind', 'Tree').click();
    const shade = chip(page, 'light', 'Shade');
    await expect(shade.locator('.lfdln-filter-toggle-count')).toHaveText('0');
    await expect(shade).toHaveCSS('opacity', '0.45');
    await shade.click();
    await expect(shade).toHaveAttribute('aria-pressed', 'true');
    await expect(saveButton(page)).toHaveText('Save · 0 results');
    await expect(page.locator('#views tbody tr')).toHaveCount(0);
  });

  test.describe('phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test('20 views with 40-character names scroll inside the tabs row; no sideways page scroll; 44 px targets', async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('views-demo.views', JSON.stringify(Array.from({ length: 20 }, (_, i) => ({
        key: `u-${i}`, label: `Plants for a sunny kitchen window no. ${String(i + 1).padStart(2, '0')}`, filter: { kind: ['Herb'] },
      })))));
      await open(page);
      await expect(labels(page)).toHaveCount(21);
      expect(await labels(page).nth(1).textContent()).toHaveLength(40);
      const row = await nav(page).evaluate((n) => ({ sw: n.scrollWidth, cw: n.clientWidth }));
      expect(row.sw).toBeGreaterThan(row.cw);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      for (const loc of [tabs(page).first(), tabs(page).nth(1), more(page, 'Plants for a sunny kitchen window no. 01'), newView(page)]) {
        await loc.scrollIntoViewIfNeeded();
        const box = (await loc.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
      await newView(page).click();
      await expect(builder(page)).toBeVisible();
      for (const loc of [chip(page, 'kind', 'Herb'), chip(page, 'stock', 'Yes'), saveButton(page), builder(page).getByRole('textbox')]) {
        expect((await loc.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      const card = (await builder(page).boundingBox())!;
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width).toBeLessThanOrEqual(390);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    });
  });
});

// #sentence (in #sentence-box, which the width test narrows): filter-style="sentence" on the
// handoff's 18 plants and a climber (19), words.things "plants", the four phrases: Kind
// "{values}" / "all plants" (plurals), Light "for {values}" / "in any light", Price "{values}" /
// "at any price", In stock "in stock only" / "including sold out". #sentence-plain: the same with
// an Owner column that has no phrase (words.things left as "results").
test.describe('sentence', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  const text = (page: Page, id = 'sentence') => page.locator(`#${id} .dv-above p.lfdln-filter-sentence-text`);
  const phrase = (page: Page, key: string, id = 'sentence') => page.locator(`#${id} .lfdln-filter-sentence-phrase[data-key="${key}"]`);
  const menus = (page: Page, id = 'sentence') => page.locator(`#${id} .lfdln-filter-col-menu`);
  const rows = (page: Page, id = 'sentence') => page.locator(`#${id} tbody tr`);
  // The sentence as it reads, without an open menu (drawn inside its phrase's anchor).
  const said = (page: Page, id = 'sentence') => text(page, id).evaluate((el) => {
    const p = el.cloneNode(true) as HTMLElement;
    p.querySelectorAll('.lfdln-filter-popover').forEach((m) => m.remove());
    return p.textContent!.replace(/\s+/g, ' ').trim();
  });
  const startOver = (page: Page, id = 'sentence') => page.locator(`#${id}`).getByRole('button', { name: 'Start over' });
  // The colour a probe element gets from `value`, as the browser resolves it inside #sentence.
  const resolved = (page: Page, value: string) => page.locator('#sentence').evaluate((el, v) => {
    const probe = document.createElement('span');
    probe.style.color = v;
    el.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  }, value);

  test("the sentence reads as the handoff's", async ({ page }) => {
    const { problems } = await open(page, '?sentence.f.kind=Perennial,Fern&sentence.f.light=Shade');
    await expect(text(page)).toHaveText('Show perennials and ferns for shade, at any price, including sold out.');
    await expect(rows(page)).toHaveCount(5);
    // Drawn above the bar, full width; the bar keeps the search box; no chips row (the sentence shows them).
    await expect(page.locator('#sentence .dv-bar .dv-search input')).toBeVisible();
    await expect(page.locator('#sentence .dv-bar .dv-filter')).toHaveCount(0);
    await expect(page.locator('#sentence .lfdln-filter-chips, #sentence .lfdln-filter-tag')).toHaveCount(0);
    // Each phrase is a button named by its section and what it says.
    await expect(phrase(page, 'kind')).toHaveAccessibleName('Kind: perennials and ferns');
    await expect(phrase(page, 'light')).toHaveAccessibleName('Light: shade');
    await expect(phrase(page, 'price')).toHaveAccessibleName('Price: at any price');
    await expect(phrase(page, 'kind')).toHaveText('perennials and ferns');
    await expect(phrase(page, 'light')).toHaveText('shade');
    await expect(phrase(page, 'kind')).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(phrase(page, 'kind')).toHaveAttribute('aria-expanded', 'false');
    // 22px/1.7.
    const font = await text(page).evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).lineHeight]);
    expect(font).toEqual(['22px', `${22 * 1.7}px`]);
    expect(problems).toEqual([]);
  });

  test('each phrase opens the 220 px check menu; a tick applies at once and rewrites the phrase', async ({ page }) => {
    const { problems } = await open(page);
    await expect(text(page)).toHaveText('Show all plants in any light, at any price, including sold out.');
    await expect(rows(page)).toHaveCount(19);
    // The server demos above it load late and push the page down; once they are in, the sentence
    // goes to the top of the window, so the menu has room to open below its phrase.
    for (const id of ['panel-server', 'search-server', 'search-equals', 'vprobe-server']) {
      await expect(page.locator(`#${id} tbody tr`).first()).toBeVisible();
    }
    await text(page).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await phrase(page, 'kind').click();
    const m = menus(page);
    await expect(m).toBeVisible();
    await expect(phrase(page, 'kind')).toHaveAttribute('aria-expanded', 'true');
    await expect(phrase(page, 'kind')).toHaveAttribute('aria-controls', (await m.getAttribute('id'))!);
    expect(Math.round((await m.boundingBox())!.width)).toBe(220);
    // Under its phrase, from its left edge.
    const [mb, pb] = await Promise.all([m.boundingBox(), phrase(page, 'kind').boundingBox()]);
    expect(Math.abs(mb!.x - pb!.x)).toBeLessThanOrEqual(3);
    expect(mb!.y).toBeGreaterThan(pb!.y + pb!.height - 1);
    await expect(m.locator('.lfdln-filter-col-label')).toHaveText('Show kind');
    await expect(m.locator('.lfdln-filter-check-label')).toHaveText(['Climber', 'Fern', 'Herb', 'Perennial', 'Shrub']);
    await expect(m.locator('.lfdln-filter-check-count')).toHaveText(['1', '2', '6', '6', '4']);
    // The phrase's background while open.
    const soft = await resolved(page, 'var(--filter-accent-soft, color-mix(in srgb, var(--filter-accent) 16%, var(--filter-bg)))');
    expect(await phrase(page, 'kind').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(soft);
    await m.getByRole('checkbox', { name: /Perennial/ }).click();
    await expect(rows(page)).toHaveCount(6);
    await expect(m).toBeVisible(); // it applies and stays open
    // The menu's last button clears the section; it reads the unset phrase, capitalised.
    await expect(m.getByRole('button').last()).toHaveText('All plants');
    await expect(m.getByRole('button', { name: 'Clear this column' })).toHaveCount(0);
    await expect(phrase(page, 'kind')).toHaveText('perennials');
    await expect.poll(() => said(page)).toBe('Show perennials in any light, at any price, including sold out.');
    expect(new URL(page.url()).searchParams.get('sentence.f.kind')).toBe('Perennial');
    await m.getByRole('checkbox', { name: /Fern/ }).click();
    await expect(phrase(page, 'kind')).toHaveText('perennials and ferns');
    await expect(rows(page)).toHaveCount(8);
    // Still under its phrase after the phrase grew.
    const [mb2, pb2] = await Promise.all([m.boundingBox(), phrase(page, 'kind').boundingBox()]);
    expect(Math.abs(mb2!.x - pb2!.x)).toBeLessThanOrEqual(3);
    // A range lists its ranges one at a time; a bool Yes and No.
    await phrase(page, 'price').click();
    await menus(page).getByRole('radio', { name: /Under €5/ }).click();
    await expect(phrase(page, 'price')).toHaveText('under €5');
    await expect(menus(page).getByRole('button').last()).toHaveText('At any price');
    await phrase(page, 'stock').click();
    await menus(page).getByRole('radio', { name: 'Yes' }).click();
    await expect.poll(() => said(page)).toBe('Show perennials and ferns in any light, under €5, in stock only.');
    await expect(rows(page)).toHaveCount(1); // Sweet woodruff
    expect(problems).toEqual([]);
  });

  test('one menu at a time; Esc closes and focus returns to the phrase', async ({ page }) => {
    const { problems } = await open(page);
    await phrase(page, 'kind').click();
    await expect(menus(page)).toHaveCount(1);
    await phrase(page, 'light').click();
    await expect(menus(page)).toHaveCount(1);
    await expect(menus(page).locator('.lfdln-filter-col-label')).toHaveText('Show light');
    await expect(phrase(page, 'kind')).toHaveAttribute('aria-expanded', 'false');
    // One open per page: another style's menu closes this one.
    await page.locator('#bar .lfdln-filter-bar-pill[data-key="kind"]').click();
    await expect(menus(page)).toHaveCount(0);
    await page.keyboard.press('Escape');
    await phrase(page, 'light').focus();
    await page.keyboard.press('Enter');
    await expect(menus(page)).toHaveCount(1);
    await page.keyboard.press('ArrowDown');
    await expect(menus(page).getByRole('checkbox').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menus(page)).toHaveCount(0);
    await expect(phrase(page, 'light')).toBeFocused();
    await expect(phrase(page, 'light')).toHaveAttribute('aria-expanded', 'false');
    // A click on the open phrase closes its menu.
    await phrase(page, 'price').click();
    await expect(menus(page)).toHaveCount(1);
    await phrase(page, 'price').click();
    await expect(menus(page)).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('set phrases are accent-underlined; unset are muted', async ({ page }) => {
    const { problems } = await open(page, '?sentence.f.light=Shade');
    const [accent, muted, onText] = await Promise.all([resolved(page, 'var(--filter-accent)'), resolved(page, 'var(--filter-muted)'),
      resolved(page, 'var(--filter-accent-text, color-mix(in srgb, var(--filter-accent) 70%, var(--filter-text)))')]);
    const look = (key: string) => phrase(page, key).evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        line: s.textDecorationLine, color: s.textDecorationColor, thick: s.textDecorationThickness, offset: s.textUnderlineOffset, text: s.color,
        weight: s.fontWeight, wrap: s.whiteSpace,
      };
    });
    // Set phrases are 500; phrases wrap like the text around them.
    expect(await look('light')).toEqual({ line: 'underline', color: accent, thick: '1px', offset: '6px', text: onText, weight: '500', wrap: 'normal' });
    const unset = await look('kind');
    expect(unset).toMatchObject({ line: 'underline', color: muted, thick: '1px', offset: '6px', weight: '400', wrap: 'normal' });
    expect(unset.text).not.toBe(onText);
    // The sentence itself is muted.
    expect(await text(page).evaluate((el) => getComputedStyle(el).color)).toBe(muted);
    expect(problems).toEqual([]);
  });

  test('Start over clears the filters, keeps the search, and hides itself', async ({ page }) => {
    const { problems } = await open(page);
    await expect(startOver(page)).toHaveCount(0);
    await page.goto('/filter-styles.html?sentence.f.kind=Herb&sentence.f.light=Sun&sentence.search=o');
    await expect(rows(page)).toHaveCount(2); // herbs for sun with an o: Rosemary, Oregano
    await expect(startOver(page)).toBeVisible();
    await expect(startOver(page)).toHaveClass(/lfdln-filter-btn-ghost/);
    await startOver(page).click();
    await expect(text(page)).toHaveText('Show all plants in any light, at any price, including sold out.');
    await expect(startOver(page)).toHaveCount(0);
    await expect(page.locator('#sentence .dv-search input')).toHaveValue('o');
    await expect.poll(() => new URL(page.url()).searchParams.get('sentence.search')).toBe('o');
    expect(new URL(page.url()).searchParams.get('sentence.f.kind')).toBeNull();
    // Focus goes to the first phrase, which stays.
    await expect(phrase(page, 'kind')).toBeFocused();
    expect(problems).toEqual([]);
  });

  test('nothing left: "No plants match that sentence. Change one of the underlined parts."', async ({ page }) => {
    const { problems } = await open(page, '?sentence.f.kind=Fern&sentence.f.light=Sun');
    await expect(rows(page)).toHaveCount(0);
    await expect(page.locator('#sentence .dv-empty')).toHaveText('No plants match that sentence. Change one of the underlined parts.');
    // With no filter set, a search that leaves nothing keeps the viewer's own line.
    await page.goto('/filter-styles.html?sentence.search=zzzz');
    await expect(page.locator('#sentence .dv-empty')).toBeVisible();
    await expect(page.locator('#sentence .dv-empty')).not.toContainText('sentence');
    expect(problems).toEqual([]);
  });

  test('a column without phrase reads "Owner: any"', async ({ page }) => {
    const { problems } = await open(page);
    await expect(text(page, 'sentence-plain')).toHaveText('Show all plants in any light, at any price, including sold out, Owner: any.');
    await expect(phrase(page, 'owner', 'sentence-plain')).toHaveText('Owner: any');
    await expect(phrase(page, 'owner', 'sentence-plain')).toHaveAccessibleName('Owner: any');
    await phrase(page, 'owner', 'sentence-plain').click();
    await menus(page, 'sentence-plain').getByRole('checkbox', { name: /Ana/ }).click();
    await menus(page, 'sentence-plain').getByRole('checkbox', { name: /Dev/ }).click();
    await expect.poll(() => said(page, 'sentence-plain')).toBe('Show all plants in any light, at any price, including sold out, Owner: ana and dev.');
    await expect(menus(page, 'sentence-plain').getByRole('button').last()).toHaveText('Owner: any');
    await expect(phrase(page, 'owner', 'sentence-plain')).toHaveText('ana and dev');
    await expect(phrase(page, 'owner', 'sentence-plain')).toHaveAccessibleName('Owner: ana and dev');
    expect(problems).toEqual([]);
  });

  test('narrower than 480 px it stays a sentence and the menu is the bottom sheet', async ({ page }) => {
    const { problems } = await open(page);
    const width = (px: number) => page.locator('#sentence-box').evaluate((el, w) => {
      (el as HTMLElement).style.width = `${w}px`;
    }, px);
    await width(470);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await expect(text(page)).toHaveText('Show all plants in any light, at any price, including sold out.');
    await phrase(page, 'light').click();
    const sheet = page.locator('#sentence dialog.lfdln-filter-col-menu[open]');
    await expect(sheet).toBeVisible();
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.width)).toBe(1280);
    expect(Math.round(box.y + box.height)).toBe(900);
    await sheet.getByRole('checkbox', { name: /^Shade/ }).click();
    await expect(phrase(page, 'light')).toHaveText('shade');
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(phrase(page, 'light')).toBeFocused();
    await width(900);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await phrase(page, 'light').click();
    await expect(page.locator('#sentence div.lfdln-filter-col-menu')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('a bookmarked value that no longer exists reads in the sentence and clears from its menu', async ({ page }) => {
    const { problems } = await open(page, '?sentence.f.kind=Cactus');
    await expect(text(page)).toHaveText('Show cactus in any light, at any price, including sold out.');
    await expect(rows(page)).toHaveCount(0);
    await expect(page.locator('#sentence .dv-empty')).toHaveText('No plants match that sentence. Change one of the underlined parts.');
    await phrase(page, 'kind').click();
    const cactus = menus(page).getByRole('checkbox', { name: /Cactus/ });
    await expect(cactus).toHaveAttribute('aria-checked', 'true');
    await expect(cactus.locator('.lfdln-filter-check-count')).toHaveText('0');
    await cactus.click();
    await expect.poll(() => said(page)).toBe('Show all plants in any light, at any price, including sold out.');
    await expect(rows(page)).toHaveCount(19);
    await expect(menus(page).getByRole('checkbox', { name: /Cactus/ })).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test.describe('phone', () => {
    test.use({ viewport: { width: 390, height: 800 } });

    test('phone 390 px: wraps like text with no sideways scroll; each line of a phrase is a 44 px target', async ({ page }) => {
      const { problems } = await open(page, '?sentence.f.kind=Perennial,Shrub,Fern,Herb,Climber&sentence.f.light=Part%20shade');
      await expect(text(page)).toHaveText('Show perennials, shrubs, ferns, herbs and climbers for part shade, at any price, including sold out.');
      expect(await text(page).evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).lineHeight])).toEqual(['18px', '44px']);
      for (const key of ['kind', 'light', 'price', 'stock']) {
        // Inline, so a long phrase wraps inside the text; each of its line boxes is 44 px tall
        // (content + padding) and inside the screen.
        const lines = await phrase(page, key).evaluate((el) => [getComputedStyle(el).display,
          [...el.getClientRects()].map((r) => ({ h: r.height, right: r.right }))] as const);
        expect(lines[0]).toBe('inline');
        for (const r of lines[1]) {
          expect(Math.round(r.h)).toBeGreaterThanOrEqual(44);
          expect(r.right).toBeLessThanOrEqual(390);
        }
      }
      // "Show" is not alone on its line: the five kinds start beside it and wrap.
      const [first, rects] = await phrase(page, 'kind').evaluate((el) => {
        const p = el.closest('p')!.getBoundingClientRect();
        const rs = [...el.getClientRects()];
        return [rs[0]!.top - p.top, rs.length] as const;
      });
      expect(first).toBeLessThan(10);
      expect(rects).toBeGreaterThan(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      const so = (await startOver(page).boundingBox())!;
      expect(Math.round(so.height)).toBeGreaterThanOrEqual(44);
      // Menus are the bottom sheet, with 44 px rows.
      await phrase(page, 'light').click();
      const sheet = page.locator('#sentence dialog.lfdln-filter-col-menu[open]');
      await expect(sheet).toBeVisible();
      expect(Math.round((await sheet.boundingBox())!.width)).toBe(390);
      for (const r of await sheet.locator('.lfdln-filter-check-row').all()) expect(Math.round((await r.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
      await page.keyboard.press('Escape');
      await expect(phrase(page, 'light')).toBeFocused();
      expect(problems).toEqual([]);
    });
  });
});
