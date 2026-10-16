// The built site, through test/serve.mjs: every address, the live demos, the panel, the
// sidebar and phone picker, the Reference sections, phone widths and requests to other sites.
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ADDRESSES, REFERENCE } from '../reference-map.mjs';

const PAGES = Object.entries(ADDRESSES) as [string, string][];
const ALL = ['/', ...PAGES.map(([, a]) => a)];

// Fails the test on console errors and warnings, page errors, failed requests and requests to
// other sites.
function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`console ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()}: ${r.url()}`); });
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['http:', 'https:'].includes(url.protocol)) return;
    if (url.host !== new URL(page.url() === 'about:blank' ? 'http://localhost:4190' : page.url()).host) problems.push(`other site: ${r.url()}`);
  });
  return problems;
}

test.describe('every address', () => {
  for (const path of ALL) {
    test(`${path} loads with no errors and nothing from another site`, async ({ page }) => {
      const problems = watch(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await page.waitForLoadState('networkidle');
      expect(problems).toEqual([]);
    });
  }
});

test.describe('live demos', () => {
  const MOUNTS: [string, string][] = [
    ['/docs/', 'lfdln-data-viewer .dv-root'],
    ['/docs/basics/', 'lfdln-data-viewer .dv-table'],
    ['/docs/setup-file/', 'lfdln-data-viewer .dv-table'],
    ['/docs/custom-cards/', 'lfdln-data-viewer .dv-card-custom'],
    ['/docs/filter-styles/', '#style-panel lfdln-data-viewer .lfdln-filter-trigger'],
    ['/docs/selection/', 'lfdln-data-viewer .dv-select-box'],
    ['/docs/server-pages/', 'lfdln-data-viewer .dv-table'],
    ['/docs/light-dark/', 'lfdln-data-viewer .dv-root'],
    ['/docs/menu/', 'lfdln-menu .lfdln-menu-button'],
    ['/docs/pagination/', 'lfdln-pagination .lfdln-pagination-nav'],
    ['/docs/card/', 'lfdln-card .lfdln-card-title'],
    ['/docs/search/', 'lfdln-search .lfdln-search-input'],
    ['/docs/filter/', 'lfdln-filter .lfdln-filter-button'],
    ['/docs/styling/', 'lfdln-data-viewer .dv-cards'],
  ];
  for (const [path, selector] of MOUNTS) {
    test(`${path} mounts the real component`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator(`[data-host] ${selector}`).first()).toBeVisible();
      await expect(page.locator('[data-status]')).toHaveCount(0);
      await expect(page.locator('[data-events]')).toBeVisible();
    });
  }

  test('rows show in the viewer', async ({ page }) => {
    await page.goto('/docs/basics/');
    await expect(page.locator('[data-host] .dv-table tbody tr')).toHaveCount(6);
    await expect(page.locator('[data-host] .dv-table')).toContainText('Foxglove');
  });

  test('Install has no demo: its first code tab is open, with Copy', async ({ page }) => {
    await page.goto('/docs/install/');
    await expect(page.getByRole('tab', { name: 'Demo' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Plain page' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('pre.code-view:visible')).toContainText('data-viewer.standalone.js');
    // define(), configure() and defineList() each have a tab of their own.
    for (const name of ['define()', 'configure()', 'defineList()']) {
      await page.getByRole('tab', { name }).click();
      await expect(page.locator('pre.code-view:visible')).toContainText(name.replace('()', ''));
    }
    await expect(page.locator('[data-copy-code]')).toBeVisible();
  });

  test('a script that fails to load shows the explanation', async ({ page }) => {
    await page.route('**/js/data-viewer.standalone.js', (r) => r.abort());
    await page.goto('/docs/basics/');
    await expect(page.getByText('The live components didn’t load')).toBeVisible();
    await expect(page.locator('[data-events]')).toBeHidden();
  });
});

test.describe('panel', () => {
  test('code tabs switch, Copy copies and says Copied', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/docs/basics/');
    const copyBtn = page.locator('[data-copy-code]');
    await expect(copyBtn).toBeHidden();
    await page.getByRole('tab', { name: 'plants.json' }).click();
    await expect(page.getByRole('tab', { name: 'plants.json' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.demo')).toBeHidden();
    await expect(page.locator('[data-events]')).toBeHidden();
    await expect(page.locator('pre.code-view:visible')).toContainText('"Digitalis purpurea"');
    await copyBtn.click();
    await expect(copyBtn).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('"Digitalis purpurea"');
    await expect(copyBtn).toHaveText('Copy', { timeout: 3000 });
    // Arrow keys move between tabs.
    await page.getByRole('tab', { name: 'plants.json' }).press('ArrowLeft');
    await expect(page.getByRole('tab', { name: 'HTML' })).toBeFocused();
    await expect(page.locator('pre.code-view:visible')).toContainText('<lfdln-data-viewer label="Plants"');
    await page.getByRole('tab', { name: 'Demo' }).click();
    await expect(page.locator('.demo')).toBeVisible();
    await expect(copyBtn).toBeHidden();
  });

  test('the header pill copies the npm command', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/docs/menu/');
    const pill = page.locator('.npm-pill');
    await pill.click();
    await expect(pill).toContainText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npm i @lesfleursdelanuitdev/data-viewer');
  });

  test('the events strip fills after a click in the demo, and Clear empties it', async ({ page }) => {
    await page.goto('/docs/menu/');
    const events = page.locator('[data-events]');
    await expect(events).toContainText('Nothing yet');
    await page.locator('[data-host] .lfdln-menu-button').click();
    await page.getByRole('menuitem', { name: /Print the list/ }).click();
    await expect(events.locator('.event').first()).toContainText('menu-action');
    await expect(events.locator('.event').first()).toContainText('"id":"print"');
    await expect(events).toHaveClass(/has-events/);
    await events.getByRole('button', { name: 'Clear' }).click();
    await expect(events.locator('.event')).toHaveCount(0);
    await expect(events).toContainText('Nothing yet');
  });

  test('row actions show as events, shortened to the row name', async ({ page }) => {
    await page.goto('/docs/setup-file/');
    await page.locator('[data-host] .dv-row-menu button').first().click();
    await page.getByRole('menuitem', { name: /Care notes/ }).click();
    await expect(page.locator('.event').first()).toContainText('dv-action');
    await expect(page.locator('.event').first()).toContainText('"row":"Foxglove"');
  });

  test('custom cards: the template card opens, its button and its menu show as events', async ({ page }) => {
    await page.goto('/docs/custom-cards/');
    const card = page.locator('[data-host] .dv-card-custom').first();
    await expect(card.locator('h3')).toHaveText('Foxglove');
    await expect(card.locator('.facts')).toContainText('€6.50');
    await expect(card).toHaveAccessibleName('Foxglove');
    await card.locator('h3 button').click();
    await expect(page.locator('.event').first()).toContainText('dv-open');
    await expect(page.locator('.event').first()).toContainText('"row":"Foxglove"');
    await card.getByRole('button', { name: 'Put one aside' }).click();
    await expect(page.locator('.event').first()).toContainText('"id":"aside"');
    await card.locator('dv-menu .lfdln-menu-button').click();
    await page.getByRole('menuitem', { name: /Care notes/ }).click();
    await expect(page.locator('.event').first()).toContainText('"id":"care"');
    // Lit and React are code samples only.
    for (const name of ['HTML', 'Lit', 'React']) await expect(page.getByRole('tab', { name, exact: true })).toHaveCount(1);
  });

  test('card actions control changes the list', async ({ page }) => {
    await page.goto('/docs/setup-file/');
    const list = page.locator('[data-host] lfdln-data-viewer');
    await expect(list).toHaveJSProperty('cardActions', 'menu');
    await page.locator('.seg-opt', { hasText: 'Wrap' }).click();
    await expect(list).toHaveJSProperty('cardActions', 'wrap');
    await page.locator('.seg-opt', { hasText: 'Row' }).click();
    await expect(list).toHaveJSProperty('cardActions', 'row');
  });

  test('server pages: Loading… while it waits, the delay control, and Fail the next load', async ({ page }) => {
    await page.goto('/docs/server-pages/');
    const host = page.locator('[data-host]');
    await expect(host.locator('.dv-table tbody tr')).toHaveCount(10);
    await expect(page.locator('.event').first()).toContainText('load');
    await page.locator('.seg-opt', { hasText: '2.5 s' }).click();
    await host.getByRole('button', { name: /Next/ }).click();
    await expect(page.locator('[data-busy]')).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(page.locator('[data-busy]')).toBeVisible(); // still waiting: the 2.5 s answer is used
    await expect(page.locator('[data-busy]')).toBeHidden({ timeout: 4000 });
    await expect(host).toContainText('#1011');

    await page.locator('.seg-opt', { hasText: '0.3 s' }).click();
    await page.getByLabel('Fail the next load').check();
    await host.getByRole('button', { name: /Next/ }).click();
    await expect(host.locator('.dv-error')).toBeVisible();
    await expect(page.getByLabel('Fail the next load')).not.toBeChecked();
    await host.getByRole('button', { name: 'Try again' }).click();
    await expect(host.locator('.dv-error')).toHaveCount(0);
    await expect(host).toContainText('#1021');
  });

  test('light & dark: the colour scheme control sets the demo box', async ({ page }) => {
    await page.goto('/docs/light-dark/');
    const box = page.locator('[data-host] [data-scheme]');
    await expect(box).toHaveCSS('color-scheme', 'dark');
    // The list's own colours follow the box's color-scheme (light-dark() in its built-in look).
    const colour = () => page.locator('[data-host] .dv-root').evaluate((el) => getComputedStyle(el).color);
    const dark = await colour();
    await page.locator('.seg-opt', { hasText: 'Light' }).click();
    await expect(box).toHaveCSS('color-scheme', 'light');
    await expect.poll(colour).not.toBe(dark);
    await page.locator('.seg-opt', { hasText: 'Device' }).click();
    await expect(box).toHaveCSS('color-scheme', 'light dark');
  });
});

// /docs/filter-styles/: one section per style, stacked down the Demo panel, each with its own list
// of plants (5 a page) and its own code.
const STYLES: [string, string, string][] = [
  ['Panel', 'panel', '.lfdln-filter-trigger'],
  ['Bar', 'bar', '.lfdln-filter-bar-row'],
  ['Rail', 'rail', '.lfdln-filter-rail'],
  ['Columns', 'columns', '.lfdln-filter-col-btn'],
  ['Search', 'search', '.lfdln-search-filter-field'],
  ['Views', 'views', '.lfdln-filter-views'],
  ['Sentence', 'sentence', '.lfdln-filter-sentence'],
  ['Dialog', 'dialog', '.lfdln-filter-button'],
];
const section = (page: Page, name: string) => page.locator(`[data-host] #style-${name}`);
const styleList = (page: Page, name: string) => section(page, name).locator('lfdln-data-viewer');
const status = (page: Page, name: string) => styleList(page, name).locator('.lfdln-pagination-status');
// The section's code, opened.
async function sectionCode(page: Page, name: string) {
  await section(page, name).locator('summary', { hasText: 'Show the code' }).click();
  return section(page, name).locator('pre.fs-pre');
}
const wide = (page: Page) => page.evaluate((): [number, number] => [document.documentElement.scrollWidth, window.innerWidth]);

test.describe('filter styles', () => {
  test('each style has its own section and list with its UI, ids are unique, and nothing errs', async ({ page }) => {
    const problems = watch(page);
    await page.goto('/docs/filter-styles/');
    await expect(page.locator('[data-host] h2.fs-head')).toHaveText(STYLES.map(([label, name]) =>
      new RegExp(`^${label}\\s+${name === 'dialog' ? 'no filter-style' : `filter-style="${name}"`}$`)));
    for (const [label, name, selector] of STYLES) {
      const list = styleList(page, name);
      await expect(list, label).toHaveCount(1);
      if (name === 'dialog') await expect(list).not.toHaveAttribute('filter-style');
      else await expect(list).toHaveAttribute('filter-style', name);
      await expect(list.locator(selector).first(), label).toBeVisible();
      await expect(list.locator('.dv-table tbody tr')).toHaveCount(5);
      // Only this style is drawn in this list.
      for (const [, other, sel] of STYLES) if (other !== name) await expect(list.locator(sel), `${other} in ${name}`).toHaveCount(0);
    }
    // The old style switcher and the per-style top tabs are gone; the general code tabs stay.
    await expect(page.getByRole('tablist', { name: 'Filter style' })).toHaveCount(0);
    await expect(page.getByRole('tablist', { name: 'Demo and code' }).getByRole('tab')).toHaveText(['Demo', 'HTML', 'npm', 'Field alone']);
    const dupes = await page.evaluate(() => {
      const seen: Record<string, number> = {};
      for (const el of document.querySelectorAll('[id]')) seen[el.id] = (seen[el.id] || 0) + 1;
      return Object.keys(seen).filter((id) => (seen[id] ?? 0) > 1);
    });
    expect(dupes).toEqual([]);
    await page.waitForLoadState('networkidle');
    expect(problems).toEqual([]);
  });

  test('a filter in one section leaves the other lists alone', async ({ page }) => {
    await page.goto('/docs/filter-styles/');
    const list = styleList(page, 'panel');
    // panel: "Show N plants" counts the draft.
    await list.locator('.lfdln-filter-trigger').click();
    await expect(list.locator('.lfdln-filter-panel-title')).toHaveText('Filter plants');
    await list.locator('.lfdln-filter-toggle', { hasText: 'Herb' }).click();
    await expect(list.locator('.lfdln-filter-show')).toHaveText('Show 6 plants');
    await list.locator('.lfdln-filter-show').click();
    await expect(status(page, 'panel')).toContainText('Showing 1–5 of 6');
    for (const [, name] of STYLES) if (name !== 'panel') await expect(status(page, name), name).toContainText('Showing 1–5 of 18');
    await expect(styleList(page, 'rail').locator('.lfdln-filter-rail-count')).toHaveText('18 plants');
    await expect(styleList(page, 'columns').locator('.lfdln-filter-col-summary-text')).toHaveText('All 18 plants');
  });

  test('the rail and columns lists filter on their own', async ({ page }) => {
    await page.goto('/docs/filter-styles/');
    const rail = styleList(page, 'rail');
    await rail.locator('.lfdln-filter-rail').getByText('Herb', { exact: true }).click();
    await expect(rail.locator('.lfdln-filter-rail-count')).toHaveText('6 plants');
    const cols = styleList(page, 'columns');
    await expect(cols).toHaveAttribute('layout', 'table');
    await cols.locator('.lfdln-filter-col-btn').first().click();
    await cols.locator('.lfdln-filter-col-menu').getByRole('checkbox', { name: /Fern/ }).click();
    await page.keyboard.press('Escape');
    await expect(cols.locator('.lfdln-filter-col-summary-text')).toHaveText('2 of 18 plants · 1 column filtered');
    await expect(rail.locator('.lfdln-filter-rail-count')).toHaveText('6 plants');
  });

  test('the Nocturne colours reach the styles through --filter-*', async ({ page }) => {
    await page.goto('/docs/filter-styles/');
    const list = styleList(page, 'bar');
    await list.locator('.lfdln-filter-bar-pill', { hasText: 'Kind' }).click();
    await list.locator('.lfdln-filter-check-row', { hasText: 'Herb' }).click();
    // The on pill: accent-900 behind, accent-200 text (the site's --filter-accent-soft / -text),
    // its key in the accent.
    const pill = list.locator('.lfdln-filter-bar-pill-on').first();
    await expect(pill).toHaveCSS('background-color', 'rgb(43, 39, 65)');
    await expect(pill).toHaveCSS('color', 'rgb(231, 229, 254)');
    await expect(pill.locator('.lfdln-filter-bar-pill-key')).toHaveCSS('color', 'rgb(145, 132, 217)');
  });

  // The viewer fires dv-query (not filter-change); this page's strip shows its filters only,
  // from whichever list fired it.
  test('the shared events strip shows dv-query from any list, the same shape for every style', async ({ page }) => {
    await page.goto('/docs/filter-styles/');
    const events = page.locator('[data-events]');
    const bar = styleList(page, 'bar');
    await bar.locator('.lfdln-filter-bar-pill', { hasText: 'Kind' }).click();
    await bar.locator('.lfdln-filter-check-row', { hasText: 'Herb' }).click();
    const first = events.locator('.event').first();
    await expect(first.locator('.event-name')).toHaveText('dv-query');
    await expect(first.locator('.event-detail')).toHaveText('{"filters":{"kind":["Herb"]}}');
    await page.keyboard.press('Escape');
    const rail = styleList(page, 'rail');
    await rail.locator('.lfdln-filter-rail').getByText('Shade', { exact: true }).click();
    await expect(first.locator('.event-detail')).toHaveText('{"filters":{"light":["Shade"]}}');
  });

  test("top code tabs: HTML loads a style's file, npm imports it, Field alone uses <lfdln-search-filter>", async ({ page }) => {
    await page.goto('/docs/filter-styles/');
    const code = page.locator('pre.code-view:visible');
    await page.getByRole('tab', { name: 'HTML', exact: true }).click();
    await expect(code).toContainText('data-viewer-filter-bar.js');
    await expect(code).toContainText('filter-style="bar"');
    await page.getByRole('tab', { name: 'npm', exact: true }).click();
    await expect(code).toContainText("import '@lesfleursdelanuitdev/data-viewer/filter-styles/bar'");
    await page.getByRole('tab', { name: 'Field alone', exact: true }).click();
    await expect(code).toContainText('search-filter.standalone.js');
    await expect(code).toContainText('<lfdln-search-filter');
    await expect(code).toContainText('search-filter-change');
  });

  test("each section's code loads that style's file and sets that filter-style", async ({ page }) => {
    await page.goto('/docs/filter-styles/');
    for (const [label, name] of STYLES) {
      const pre = await sectionCode(page, name);
      await expect(pre, label).toBeVisible();
      await expect(pre).toContainText('data-viewer.standalone.js');
      if (name === 'dialog') {
        await expect(pre).not.toContainText('filter-style=');
        await expect(pre).not.toContainText('data-viewer-filter-');
      } else {
        await expect(pre).toContainText(`data-viewer-filter-${name}.js`);
        await expect(pre).toContainText(`filter-style="${name}"`);
      }
    }
    await expect(section(page, 'columns').locator('pre.fs-pre')).toContainText('layout="table"');
    await expect(section(page, 'search').locator('pre.fs-pre')).toContainText("import '@lesfleursdelanuitdev/data-viewer/filter-styles/search'");
    const views = section(page, 'views').locator('pre.fs-pre');
    await expect(views).toContainText('remember-as="plants"');
    await expect(views).toContainText('views-change');
    await expect(views).toContainText('savedViews');
    const sentence = section(page, 'sentence').locator('pre.fs-pre');
    await expect(sentence).toContainText('phrase-any="in any light"');
    await expect(sentence).toContainText('plural="Perennial:perennials');
    // Escaped as text: the code shows the tags, it doesn't make elements.
    await expect(section(page, 'panel').locator('pre.fs-pre lfdln-data-viewer')).toHaveCount(0);
    await expect(section(page, 'panel').locator('pre.fs-pre')).toContainText('<lfdln-data-viewer label="Plants" filter-style="panel"');
  });

  test('old and new links land on their section', async ({ page }) => {
    for (const hash of ['#search', '#views', '#sentence', '#rail', '#style-dialog']) {
      await page.goto(`/docs/filter-styles/${hash}`);
      const name = hash.replace(/^#(style-)?/, '');
      await expect(styleList(page, 'panel')).toHaveAttribute('filter-style', 'panel');
      // The section's heading is at the top of the screen, below the sticky header.
      await expect.poll(() => section(page, name).evaluate((el) => Math.round(el.getBoundingClientRect().top)), hash).toBeGreaterThanOrEqual(0);
      await expect.poll(() => section(page, name).evaluate((el) => Math.round(el.getBoundingClientRect().top)), hash).toBeLessThan(120);
    }
  });

  // The search style: one field instead of the search box and the filter (search-filter).
  test('the Search section: one field searches and filters', async ({ page }) => {
    const problems = watch(page);
    await page.goto('/docs/filter-styles/#search');
    const list = styleList(page, 'search');
    const input = list.locator('.lfdln-search-filter-field input[role=combobox]');
    await expect(input).toHaveAccessibleName('Search or filter');
    // It replaces the search box.
    await expect(list.locator('.lfdln-search-root')).toHaveCount(0);
    await input.click();
    await input.pressSequentially('her');
    // Focus shows as the field's ring, not the site's outline round the input inside it.
    await expect(input).toHaveCSS('outline-style', 'none');
    await expect(list.getByRole('listbox', { name: 'Suggestions' }).getByRole('option', { name: /Herb/ })).toBeVisible();
    await input.press('Enter');
    await expect(list.locator('.lfdln-search-filter-token')).toHaveText(['Kind is Herb']);
    await expect(status(page, 'search')).toContainText('Showing 1–5 of 6');
    const first = page.locator('[data-events] .event').first();
    await expect(first.locator('.event-detail')).toHaveText('{"filters":{"kind":["Herb"]}}');
    // Text with Done is the search, in the one searchable column.
    await input.pressSequentially('mint');
    await list.getByRole('button', { name: 'Done' }).click();
    await expect(list.locator('.lfdln-search-filter-token')).toHaveText(['Plant has mint', 'Kind is Herb']);
    await expect(list.locator('.dv-table tbody tr')).toHaveCount(1);
    await expect(status(page, 'sentence')).toContainText('Showing 1–5 of 18');
    await page.waitForLoadState('networkidle');
    expect(problems).toEqual([]);
  });

  test('at 390px the Search section opens the bottom sheet, nothing wider than the screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/docs/filter-styles/#search');
    const list = styleList(page, 'search');
    await list.locator('.lfdln-search-filter-field input[role=combobox]').click();
    const sheet = list.locator('dialog.lfdln-search-filter-pop[open]');
    await expect(sheet).toBeVisible();
    await sheet.locator('input[role=combobox]').pressSequentially('su');
    await expect(sheet.getByRole('option').first()).toBeVisible();
    expect((await sheet.boundingBox())!.width).toBeLessThanOrEqual(390);
    const [scroll, inner] = await wide(page);
    expect(scroll).toBeLessThanOrEqual(inner);
  });

  // Saved views: tabs above the bar, "+ New view" opens the builder, Save adds a tab.
  test('the Views section: a new view is built, saved and picked', async ({ page }) => {
    const problems = watch(page);
    await page.goto('/docs/filter-styles/#views');
    const list = styleList(page, 'views');
    const tabs = list.getByRole('navigation', { name: 'Views' });
    await expect(tabs.getByRole('button', { name: 'All 18' })).toHaveAttribute('aria-current', 'true');
    await tabs.getByRole('button', { name: 'New view' }).click();
    const builder = list.getByRole('form', { name: 'New view' });
    await expect(builder).toBeVisible();
    await builder.locator('.lfdln-filter-toggle', { hasText: 'Herb' }).click();
    await builder.locator('.lfdln-filter-toggle', { hasText: 'Sun' }).click();
    // The list previews what the view will show; Save counts it.
    await expect(list.locator('.dv-table tbody tr')).toHaveCount(5);
    await expect(status(page, 'views')).toContainText('Showing 1–5 of 5');
    await builder.getByRole('textbox', { name: 'Name this view' }).fill('Herbs for sun');
    await builder.getByRole('button', { name: 'Save · 5 results' }).click();
    await expect(builder).toHaveCount(0);
    await expect(tabs.getByRole('button', { name: 'Herbs for sun 5' })).toHaveAttribute('aria-current', 'true');
    const strip = page.locator('[data-events] .event');
    await expect(strip.filter({ hasText: 'views-change' }).first().locator('.event-detail')).toHaveText('{"views":["Herbs for sun"]}');
    await expect(strip.filter({ hasText: 'dv-query' }).first().locator('.event-detail')).toHaveText('{"filters":{"kind":["Herb"],"light":["Sun"]}}');
    // All shows every plant again.
    await tabs.getByRole('button', { name: 'All 18' }).click();
    await expect(status(page, 'views')).toContainText('Showing 1–5 of 18');
    // The view is this list's own: the page keeps nothing in the browser.
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.endsWith('.views')))).toEqual([]);
    await page.waitForLoadState('networkidle');
    expect(problems).toEqual([]);
  });

  // The sentence: the filter as one paragraph; each underlined part opens a menu.
  test('the Sentence section: picking Herb filters to 6 of 18 and rewrites the sentence', async ({ page }) => {
    const problems = watch(page);
    await page.goto('/docs/filter-styles/#sentence');
    const list = styleList(page, 'sentence');
    const text = list.locator('p.lfdln-filter-sentence-text');
    await expect(text).toHaveText('Show all plants in any light, at any price, including sold out.');
    await list.getByRole('button', { name: 'Kind: all plants' }).click();
    const menu = list.locator('.lfdln-filter-col-menu');
    await expect(menu.locator('.lfdln-filter-col-label')).toHaveText('Show kind');
    await menu.getByRole('checkbox', { name: /Herb/ }).click();
    await expect(status(page, 'sentence')).toContainText('Showing 1–5 of 6');
    await menu.getByRole('checkbox', { name: /Fern/ }).click();
    await page.keyboard.press('Escape');
    await expect(text).toHaveText('Show herbs and ferns in any light, at any price, including sold out.');
    await expect(status(page, 'sentence')).toContainText('Showing 1–5 of 8');
    await expect(status(page, 'views')).toContainText('Showing 1–5 of 18');
    await list.getByRole('button', { name: 'Start over' }).click();
    await expect(text).toHaveText('Show all plants in any light, at any price, including sold out.');
    await page.waitForLoadState('networkidle');
    expect(problems).toEqual([]);
  });

  test('the Dialog section opens the dialog', async ({ page }) => {
    await page.goto('/docs/filter-styles/#dialog');
    const list = styleList(page, 'dialog');
    await list.locator('.lfdln-filter-button').click();
    await expect(page.getByRole('dialog').filter({ visible: true }).first()).toBeVisible();
  });

  test('at 390px the views builder and the sentence sheet fit the screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/docs/filter-styles/#views');
    const views = styleList(page, 'views');
    await views.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'New view' }).click();
    const builder = views.getByRole('form', { name: 'New view' });
    await expect(builder).toBeVisible();
    expect((await builder.boundingBox())!.width).toBeLessThanOrEqual(390);
    let [scroll, inner] = await wide(page);
    expect(scroll).toBeLessThanOrEqual(inner);
    await page.keyboard.press('Escape');
    const sentence = styleList(page, 'sentence');
    await sentence.getByRole('button', { name: 'Light: in any light' }).click();
    const sheet = sentence.locator('dialog.lfdln-filter-col-menu[open]');
    await expect(sheet).toBeVisible();
    expect((await sheet.boundingBox())!.width).toBeLessThanOrEqual(390);
    [scroll, inner] = await wide(page);
    expect(scroll).toBeLessThanOrEqual(inner);
  });

  test('at 390px no section is wider than the screen, code open or shut', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/docs/filter-styles/');
    for (const [, name] of STYLES) await expect(styleList(page, name).locator('.dv-root')).toBeVisible();
    // The rail is the panel on a phone (the list is narrower than 720 px).
    await expect(styleList(page, 'rail').locator('.lfdln-filter-trigger')).toBeVisible();
    let [scroll, inner] = await wide(page);
    expect(scroll).toBeLessThanOrEqual(inner);
    for (const [, name] of STYLES) await sectionCode(page, name);
    [scroll, inner] = await wide(page);
    expect(scroll).toBeLessThanOrEqual(inner);
    for (const [, name] of STYLES) {
      const box = (await section(page, name).boundingBox())!;
      expect(box.x + box.width, name).toBeLessThanOrEqual(390);
    }
  });
});

// /docs/selection/: the plants, selectable (row-key="name"), with Export and Delete (danger).
// The page loads data-viewer-select.js before it sets selectable, so the viewer never warns.
test.describe('selection', () => {
  const list = (page: Page) => page.locator('[data-host] lfdln-data-viewer');
  const box = (page: Page, name: string) => list(page).getByRole('checkbox', { name: `Select ${name}`, exact: true });

  test('the demo ticks rows and Export writes to the events strip', async ({ page }) => {
    await page.goto('/docs/selection/');
    await box(page, 'Foxglove').check();
    await box(page, 'Lavender').check();
    const bar = list(page).locator('.dv-select-bar');
    await expect(bar.locator('.dv-select-count')).toHaveText('2 selected');
    await expect(list(page).locator('.dv-table tr.dv-selected')).toHaveCount(2);
    // Delete is drawn in the danger colour.
    const danger = await list(page).evaluate((el) => {
      const probe = el.appendChild(Object.assign(document.createElement('span'), { style: 'color: var(--dv-danger)' }));
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    });
    await expect(bar.getByRole('button', { name: 'Delete' })).toHaveCSS('color', danger);
    await bar.getByRole('button', { name: 'Export' }).click();
    // Newest first: the dv-select of the clearing, then the dv-batch.
    const events = page.locator('[data-events] .event');
    await expect(events.nth(0)).toContainText('dv-select{"keys":[],"all":false,"except":[]}');
    await expect(events.nth(1)).toContainText('dv-batch');
    await expect(events.nth(1)).toContainText('"action":"export"');
    await expect(events.nth(1)).toContainText('"keys":["Foxglove","Lavender"]');
    // The selection cleared after the export.
    await expect(bar).toHaveCount(0);
    await expect(list(page).locator('.dv-table tr.dv-selected')).toHaveCount(0);
    // The table/cards switch: cards get boxes too.
    await list(page).getByRole('button', { name: 'Show cards' }).click();
    await box(page, 'Foxglove').check();
    await expect(list(page).locator('.lfdln-card.dv-selected')).toHaveCount(1);
  });

  test('the code tabs show the select import', async ({ page }) => {
    await page.goto('/docs/selection/');
    await page.getByRole('tab', { name: 'HTML', exact: true }).click();
    await expect(page.locator('pre.code-view:visible')).toContainText('data-viewer-select.js');
    await expect(page.locator('pre.code-view:visible')).toContainText('selectable');
    await page.getByRole('tab', { name: 'npm', exact: true }).click();
    await expect(page.locator('pre.code-view:visible')).toContainText("import '@lesfleursdelanuitdev/data-viewer/select'");
  });

  test('at 390 px the bar is at the bottom and nothing is wider than the screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/docs/selection/');
    // Phones show cards.
    await expect(list(page).locator('.dv-cards')).toBeVisible();
    await box(page, 'Foxglove').check();
    const bar = list(page).locator('.dv-select-bar');
    const b = (await bar.boundingBox())!;
    expect(Math.round(b.y + b.height)).toBe(844);
    expect(b.x).toBe(0);
    expect(b.width).toBe(390);
    // ✕, the count, Export, and Delete in the ⋯.
    await expect(bar.locator('button.dv-select-action:visible')).toHaveText(['Export']);
    await expect(bar.getByRole('button', { name: 'More actions' })).toBeVisible();
    const [sw, cw] = await bar.evaluate((el) => [el.scrollWidth, el.clientWidth]);
    expect(sw).toBe(cw);
    const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(scroll).toBeLessThanOrEqual(inner);
  });

  test('no console warnings or errors', async ({ page }) => {
    const problems = watch(page);
    await page.goto('/docs/selection/');
    await expect(box(page, 'Foxglove')).toBeVisible();
    await box(page, 'Foxglove').check();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    expect(problems).toEqual([]);
  });
});

test.describe('navigation', () => {
  test('the sidebar marks the current page', async ({ page }) => {
    for (const [, address] of PAGES) {
      await page.goto(address);
      const current = page.locator('.d-side [aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveAttribute('href', address);
    }
  });

  test('Previous and Next follow the sidebar order', async ({ page }) => {
    await page.goto('/docs/');
    await expect(page.locator('.pn-prev')).toHaveCount(0);
    await page.locator('.pn-next').click();
    await expect(page).toHaveURL(/\/docs\/install\/$/);
    await page.goto('/docs/styling/');
    await expect(page.locator('.pn-next')).toHaveCount(0);
    await expect(page.locator('.pn-prev')).toHaveAttribute('href', '/docs/filter/');
  });

  test('on a phone the sidebar is a <select> that navigates', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/docs/basics/');
    await expect(page.locator('.d-side')).toBeHidden();
    const pick = page.getByLabel('Page', { exact: true });
    await expect(pick).toBeVisible();
    await expect(pick).toHaveValue('/docs/basics/');
    await pick.selectOption({ label: 'Parts · Card' });
    await expect(page).toHaveURL(/\/docs\/card\/$/);
    await expect(page.locator('h1')).toHaveText('Card');
  });

  test('landing: part cards go to their docs pages, hero tabs switch, npm Copy', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    const hrefs = await page.locator('.part-card').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual(['/docs/basics/', '/docs/menu/', '/docs/pagination/', '/docs/card/', '/docs/search/', '/docs/filter/']);
    await page.getByRole('tab', { name: 'app.js' }).click();
    await expect(page.locator('.code-panel pre:visible')).toContainText("import { define, configure }");
    const btn = page.locator('.npm-btn');
    await btn.click();
    await expect(btn).toContainText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npm i @lesfleursdelanuitdev/data-viewer');
  });
});

// The `##`..`####` headings of a README's `##` sections, read here on their own (not with the
// build's code), so the test checks the build rather than repeating it.
function readmeHeadings(pkg: string): { section: string; titles: string[] }[] {
  const md = readFileSync(new URL(`../../packages/${pkg}/README.md`, import.meta.url), 'utf8');
  const out: { section: string; titles: string[] }[] = [];
  let inFence = false;
  for (const line of md.split('\n')) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    const h = inFence ? null : /^(#{2,4}) +(.+)$/.exec(line);
    if (!h) continue;
    if (h[1] === '##') out.push({ section: h[2]!, titles: [] });
    out.at(-1)?.titles.push(h[2]!.replace(/`/g, ''));
  }
  return out;
}

test.describe('reference', () => {
  type Spec = { pkg: string; sections?: string[]; from?: string; skip?: string[] };
  for (const [page, specs] of Object.entries(REFERENCE) as [string, Spec | Spec[]][]) {
    test(`${ADDRESSES[page as keyof typeof ADDRESSES]} has every mapped README heading`, async ({ page: p }) => {
      // A page's Reference can be several packages' sections, one after the other.
      const wanted = [specs].flat().flatMap((spec) => {
        const all = readmeHeadings(spec.pkg);
        return spec.sections
          ? spec.sections.map((t) => all.find((s) => s.section === t)!)
          : all.slice(all.findIndex((s) => s.section === spec.from)).filter((s) => !spec.skip?.includes(s.section));
      });
      expect(wanted.every(Boolean)).toBe(true);
      await p.goto(ADDRESSES[page as keyof typeof ADDRESSES]);
      const shown = await p.locator('.ref :is(h2, h3, h4)').allTextContents();
      expect(shown).toEqual(wanted.flatMap((s) => s.titles));
      // "On this page" lists the h2s and each goes to its heading.
      const toc = p.locator('.toc a');
      await expect(toc).toHaveCount(wanted.length);
      for (const href of await toc.evaluateAll((as) => as.map((a) => a.getAttribute('href')!))) {
        await expect(p.locator(`.ref h2[id="${href.slice(1)}"]`)).toHaveCount(1);
      }
    });
  }

  test('pages with no README sections have no Reference', async ({ page }) => {
    for (const address of ['/docs/', '/docs/light-dark/']) {
      await page.goto(address);
      await expect(page.locator('.reference')).toHaveCount(0);
    }
  });

  test('every link in a Reference goes to a heading that exists', async ({ page, request }) => {
    const pages = new Map<string, string>();
    for (const address of Object.values(ADDRESSES)) pages.set(address, await (await request.get(address)).text());
    for (const [address, html] of pages) {
      for (const m of html.matchAll(/<div class="ref">([\s\S]*?)<\/div>\n\s*<\/section>/g)) {
        for (const [, href] of m[1]!.matchAll(/href="([^"]+)"/g)) {
          if (/^https?:/.test(href!)) { expect(href).toMatch(/^https:\/\/(github\.com\/lesfleursdelanuitdev|lit\.dev|lesfleursdelanuit\.com)/); continue; }
          const [path, id] = href!.split('#') as [string, string | undefined];
          const target = path ? pages.get(path) : html;
          expect(target, `${address}: ${href}`).toBeDefined();
          if (id) expect(target!.includes(`id="${id}"`), `${address}: ${href}`).toBe(true);
        }
      }
    }
  });

  test('a README section link to another page is rewritten to that page', async ({ page }) => {
    await page.goto('/docs/styling/');
    await expect(page.locator('.ref a', { hasText: 'menu package' })).toHaveAttribute('href', '/docs/menu/#class-names');
    await page.goto('/docs/basics/');
    await expect(page.locator('.ref a[href="/docs/server-pages/#pages"]').first()).toBeVisible();
  });
});

test.describe('phones', () => {
  for (const width of [360, 390]) {
    test(`at ${width}px no page is wider than the screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ALL) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        if (path !== '/' && path !== '/docs/install/') await expect(page.locator('[data-host] > *').first()).toBeAttached();
        const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
        expect(scroll, `${path} at ${width}px`).toBeLessThanOrEqual(inner);
        // With a code tab open too: long lines scroll inside the code box.
        const codeTab = page.locator('.panel-tabs [role="tab"]').last();
        if (await codeTab.count()) {
          await codeTab.click();
          const [s2, i2] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
          expect(s2, `${path} at ${width}px, code tab`).toBeLessThanOrEqual(i2);
        }
      }
    });
  }
});

test('an unknown address answers 404 with the not-found page', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) problems.push(m.text()); });
  const res = await page.goto('/docs/no-such-page/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('There’s no page at this address');
  await expect(page.getByRole('link', { name: 'Go to the docs' })).toHaveAttribute('href', '/docs/');
  expect(problems).toEqual([]);
});

test('a docs address without its slash goes to the page', async ({ page }) => {
  await page.goto('/docs/menu');
  await expect(page).toHaveURL(/\/docs\/menu\/$/);
  await expect(page.locator('h1')).toHaveText('Menu');
});
