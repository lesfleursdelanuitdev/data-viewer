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
    ['/docs/filter-styles/', 'lfdln-data-viewer .lfdln-filter-trigger'],
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

// /docs/filter-styles/: one list of plants, its filter-style switched by the "Filter style" tabs.
const STYLES: [string, string, string][] = [
  ['Panel', 'panel', '.lfdln-filter-trigger'],
  ['Bar', 'bar', '.lfdln-filter-bar-row'],
  ['Rail', 'rail', '.lfdln-filter-rail'],
  ['Columns', 'columns', '.lfdln-filter-col-btn'],
  ['Dialog', 'dialog', '.lfdln-filter-button'],
];
const styleTabs = (page: Page) => page.getByRole('tablist', { name: 'Filter style' });

test.describe('filter styles', () => {
  test('the page loads with no errors, and each tab shows its style', async ({ page }) => {
    const problems = watch(page);
    await page.goto('/docs/filter-styles/');
    const host = page.locator('[data-host]');
    const list = host.locator('lfdln-data-viewer');
    await expect(list.locator('.dv-table tbody tr').first()).toBeVisible();
    await expect(styleTabs(page).getByRole('tab')).toHaveText(STYLES.map(([label]) => label));
    for (const [label, name, selector] of STYLES) {
      const tab = styleTabs(page).getByRole('tab', { name: label, exact: true });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(list).toHaveAttribute('filter-style', name);
      await expect(list.locator(selector).first()).toBeVisible();
      // Only this style is drawn.
      for (const [, other, sel] of STYLES) if (other !== name) await expect(list.locator(sel), `${other} under ${name}`).toHaveCount(0);
    }
    // Arrow keys move between the style tabs, and pick.
    await styleTabs(page).getByRole('tab', { name: 'Dialog' }).press('ArrowLeft');
    await expect(styleTabs(page).getByRole('tab', { name: 'Columns' })).toBeFocused();
    await expect(list).toHaveAttribute('filter-style', 'columns');
    await page.waitForLoadState('networkidle');
    expect(problems).toEqual([]);
  });

  test('the words say "plants", and the applied filter stays when the style changes', async ({ page }) => {
    await page.goto('/docs/filter-styles/');
    const list = page.locator('[data-host] lfdln-data-viewer');
    // panel: "Show N plants" counts the draft.
    await list.locator('.lfdln-filter-trigger').click();
    await expect(list.locator('.lfdln-filter-panel-title')).toHaveText('Filter plants');
    await list.locator('.lfdln-filter-toggle', { hasText: 'Herb' }).click();
    await expect(list.locator('.lfdln-filter-show')).toHaveText('Show 6 plants');
    await list.locator('.lfdln-filter-show').click();
    await expect(list.locator('.dv-table tbody tr')).toHaveCount(6);
    // The applied filter stays when the style changes.
    await styleTabs(page).getByRole('tab', { name: 'Rail' }).click();
    await expect(list.locator('.lfdln-filter-rail-count')).toHaveText('6 plants');
    await styleTabs(page).getByRole('tab', { name: 'Columns' }).click();
    await expect(list.locator('.lfdln-filter-col-summary-text')).toHaveText('6 of 18 plants · 1 column filtered');
  });

  test('the Nocturne colours reach the styles through --filter-*', async ({ page }) => {
    await page.goto('/docs/filter-styles/');
    const list = page.locator('[data-host] lfdln-data-viewer');
    await styleTabs(page).getByRole('tab', { name: 'Bar' }).click();
    await list.locator('.lfdln-filter-bar-pill', { hasText: 'Kind' }).click();
    await list.locator('.lfdln-filter-check-row', { hasText: 'Herb' }).click();
    // The on pill: accent-900 behind, accent-200 text (the site's --filter-accent-soft / -text),
    // its key in the accent.
    const pill = list.locator('.lfdln-filter-bar-pill-on').first();
    await expect(pill).toHaveCSS('background-color', 'rgb(43, 39, 65)');
    await expect(pill).toHaveCSS('color', 'rgb(231, 229, 254)');
    await expect(pill.locator('.lfdln-filter-bar-pill-key')).toHaveCSS('color', 'rgb(145, 132, 217)');
  });

  // The viewer fires dv-query (not filter-change); this page's strip shows its filters only.
  test('the events strip shows dv-query with the filters, the same shape for every style', async ({ page }) => {
    await page.goto('/docs/filter-styles/');
    const list = page.locator('[data-host] lfdln-data-viewer');
    const events = page.locator('[data-events]');
    await styleTabs(page).getByRole('tab', { name: 'Bar' }).click();
    await list.locator('.lfdln-filter-bar-pill', { hasText: 'Kind' }).click();
    await list.locator('.lfdln-filter-check-row', { hasText: 'Herb' }).click();
    const first = events.locator('.event').first();
    await expect(first.locator('.event-name')).toHaveText('dv-query');
    await expect(first.locator('.event-detail')).toHaveText('{"filters":{"kind":["Herb"]}}');
  });

  test("code tabs: HTML loads a style's file, npm imports it", async ({ page }) => {
    await page.goto('/docs/filter-styles/');
    await page.getByRole('tab', { name: 'HTML', exact: true }).click();
    await expect(page.locator('pre.code-view:visible')).toContainText('data-viewer-filter-bar.js');
    await expect(page.locator('pre.code-view:visible')).toContainText('filter-style="bar"');
    await page.getByRole('tab', { name: 'npm', exact: true }).click();
    await expect(page.locator('pre.code-view:visible')).toContainText("import '@lesfleursdelanuitdev/data-viewer/filter-styles/bar'");
  });

  test('at 390px no style is wider than the screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/docs/filter-styles/');
    const list = page.locator('[data-host] lfdln-data-viewer');
    await expect(list.locator('.dv-root')).toBeVisible();
    for (const [label, name] of STYLES) {
      await styleTabs(page).getByRole('tab', { name: label, exact: true }).click();
      await expect(list).toHaveAttribute('filter-style', name);
      // The rail is the panel on a phone (the list is narrower than 720 px).
      if (name === 'rail') await expect(list.locator('.lfdln-filter-trigger')).toBeVisible();
      await page.waitForTimeout(100);
      const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(scroll, name).toBeLessThanOrEqual(inner);
    }
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
  for (const [page, spec] of Object.entries(REFERENCE) as [string, { pkg: string; sections?: string[]; from?: string; skip?: string[] }][]) {
    test(`${ADDRESSES[page as keyof typeof ADDRESSES]} has every mapped README heading`, async ({ page: p }) => {
      const all = readmeHeadings(spec.pkg);
      const wanted = spec.sections
        ? spec.sections.map((t) => all.find((s) => s.section === t)!)
        : all.slice(all.findIndex((s) => s.section === spec.from)).filter((s) => !spec.skip?.includes(s.section));
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
