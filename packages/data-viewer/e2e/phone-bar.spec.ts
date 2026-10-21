import { test, expect, type Page } from '@playwright/test';

// demo/phone-bar.html: #cards (cards, so "Sort by" is in the bar) and #table (a table on phones
// too), both with search in, the panel filter, ticks, the icon switch and numbered pages.
// The bar's controls are one height everywhere (--dv-control-height), and on phones the bar is
// two rows of them: the search box, Filter and the switch, then "Search in" and "Sort by".

type Box = { x: number; y: number; width: number; height: number };
const GAP = 8; // the bar's one gap (0.5rem)

async function open(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/phone-bar.html');
  await expect(page.locator('#cards .lfdln-card')).toHaveCount(5);
  await expect(page.locator('#table tbody tr')).toHaveCount(5);
}

// Every control in the list's bar and pager, with its height.
const controls = (page: Page, id: string) => page.locator(`#${id}`).evaluate((root) => [...root.querySelectorAll(
  '.dv-bar :is(input[type=search], select, button), .lfdln-pagination-nav :is(button, select, .lfdln-pagination-current)')]
  .filter((e) => e.getClientRects().length && !e.closest('.lfdln-search-field button'))
  .map((e) => ({ what: e.className || e.tagName, height: e.getBoundingClientRect().height })));

const boxes = async (page: Page, id: string) => {
  const one = async (sel: string): Promise<Box | null> => {
    const l = page.locator(`#${id} ${sel}`);
    return (await l.count()) ? l.first().boundingBox() : null;
  };
  return {
    field: (await one('.lfdln-search-field'))!,
    filter: (await one('.lfdln-filter-trigger'))!,
    layout: (await one('.dv-layout'))!,
    searchIn: (await one('.lfdln-search-in-wrap'))!,
    sort: await one('.dv-sort'),
  };
};
const right = (b: Box) => b.x + b.width;
const bottom = (b: Box) => b.y + b.height;

for (const width of [1280, 390]) {
  test(`every bar and pager control is one height at ${width} px, table and cards`, async ({ page }) => {
    await open(page, width);
    for (const id of ['cards', 'table']) {
      const all = await controls(page, id);
      expect(all.length).toBeGreaterThan(5);
      const want = width > 640 ? 38 : 44;
      for (const c of all) expect(Math.abs(c.height - want), `${id} ${c.what}: ${c.height}`).toBeLessThanOrEqual(0.5);
    }
    // and with something ticked: the selection bar's buttons
    await page.locator('#table tbody .dv-select-box').first().check();
    const bar = await page.locator('#table .dv-select-bar').evaluate((el) => [...el.querySelectorAll('button')]
      .filter((e) => e.getClientRects().length).map((e) => e.getBoundingClientRect().height));
    expect(bar.length).toBeGreaterThan(1);
    for (const h of bar) expect(Math.abs(h - (width > 640 ? 38 : 44))).toBeLessThanOrEqual(0.5);
  });
}

for (const width of [320, 360, 390, 430]) {
  test(`phones, ${width} px: two tidy rows, one gap, nothing wider than the screen`, async ({ page }) => {
    await open(page, width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const id of ['cards', 'table']) {
      const b = await boxes(page, id);
      // row 1: the search box, Filter, the switch, tops in line, one gap between them
      expect(Math.abs(b.filter.y - b.field.y)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(b.layout.y - b.field.y)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(b.filter.x - right(b.field) - GAP)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(b.layout.x - right(b.filter) - GAP)).toBeLessThanOrEqual(0.5);
      // row 2: "Search in" (and "Sort by") under it, one gap below, from edge to edge
      expect(Math.abs(b.searchIn.y - bottom(b.field) - GAP)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(b.searchIn.x - b.field.x)).toBeLessThanOrEqual(0.5);
      const last = b.sort ?? b.searchIn;
      expect(Math.abs(right(last) - right(b.layout))).toBeLessThanOrEqual(0.5);
      if (b.sort) {
        expect(Math.abs(b.sort.y - b.searchIn.y)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(b.sort.x - right(b.searchIn) - GAP)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(b.sort.width - b.searchIn.width)).toBeLessThanOrEqual(1);
      }
      // and the list starts right under the bar
      const list = (await page.locator(`#${id} :is(.dv-cards, .dv-table-wrap)`).boundingBox())!;
      expect(list.y - bottom(b.searchIn)).toBeLessThanOrEqual(12.5);
    }
    // the search box is still the page's search landmark
    await expect(page.locator('#cards').getByRole('search')).toHaveCount(1);
  });
}

test('narrow phones: Filter is its icon, still named Filter', async ({ page }) => {
  await open(page, 360);
  const filter = page.locator('#cards').getByRole('button', { name: 'Filter' });
  await expect(filter).toBeVisible();
  const box = (await filter.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.width).toBeLessThanOrEqual(46);
});

test('applied filters go under the rows, not between them', async ({ page }) => {
  await open(page, 390);
  const list = page.locator('#cards');
  await list.getByRole('button', { name: 'Filter' }).click();
  await page.getByRole('button', { name: /^Photograph/ }).first().click();
  await page.getByRole('button', { name: /^Show \d/ }).click();
  const tag = list.locator('.lfdln-filter-tag').first();
  await expect(tag).toBeVisible();
  const b = await boxes(page, 'cards');
  expect(Math.abs(b.filter.y - b.field.y)).toBeLessThanOrEqual(0.5);
  const t = (await tag.boundingBox())!;
  expect(Math.abs(t.y - bottom(b.searchIn) - GAP)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(t.x - b.field.x)).toBeLessThanOrEqual(0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

for (const width of [320, 390]) {
  test(`phones, ${width} px: table names wrap between words only; badges and money keep one line`, async ({ page }) => {
    await open(page, width);
    const lines = await page.locator('#table .dv-table').evaluate((t) => {
      // [text, lines it takes, its width on one line, the room in its cell]
      const measure = (cell: Element, text: string) => {
        const node = [...cell.querySelectorAll('*'), cell].flatMap((e) => [...e.childNodes]).find((n) => n.nodeType === 3 && n.textContent!.includes(text))!;
        const r = document.createRange();
        const at = node.textContent!.indexOf(text);
        r.setStart(node, at);
        r.setEnd(node, at + text.length);
        const rects = [...r.getClientRects()];
        // the room the text has: the cell inside its padding, less the picture and its gap
        const s = getComputedStyle(cell);
        const pic = cell.querySelector('.dv-row-picture');
        const room = cell.getBoundingClientRect().width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)
          - (pic ? pic.getBoundingClientRect().width + parseFloat(getComputedStyle(pic.parentElement!).columnGap) : 0);
        return [text, new Set(rects.map((x) => Math.round(x.top))).size, rects.reduce((a, x) => a + x.width, 0), room] as const;
      };
      const words = [...t.querySelectorAll('tbody th')].flatMap((th) => th.textContent!.trim().split(/\s+/).map((w) => measure(th, w)));
      const whole = [...t.querySelectorAll('tbody td')].filter((td) => td.querySelector('.dv-badge') || td.classList.contains('dv-right'))
        .map((td) => measure(td, td.textContent!.trim()));
      return { words, whole };
    });
    // A word breaks only when it is wider than its cell on its own (the last resort).
    for (const [w, n, width, room] of lines.words) if (width <= room) expect(n, `"${w}" breaks inside`).toBe(1);
    // and the name cell has room for an ordinary name
    for (const [, , , room] of lines.words) expect(room).toBeGreaterThanOrEqual(width < 360 ? 90 : 110);
    for (const [w, n] of lines.whole) expect(n, `"${w}" wraps`).toBe(1);
  });
}
