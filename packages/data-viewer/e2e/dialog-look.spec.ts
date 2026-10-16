import { test, expect, type Page } from '@playwright/test';

// demo/dialog-look.html: #plants is today's dialog; ?addons=1 also loads the four filter style
// add-ons, each drawing a list of its own. None of their rules (the shared parts' too) may reach
// the dialog: its button, chips, rows, quick ranges and icons look the same either way.
const PROPS = ['display', 'white-space', 'max-width', 'height', 'padding', 'margin', 'color', 'background-color',
  'border-top-color', 'border-radius', 'font-size', 'font-weight', 'opacity', 'flex', 'fill', 'stroke', 'stroke-width',
  'stroke-linecap', 'box-sizing', 'position'];

async function look(page: Page, query: string) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto(`/dialog-look.html?plants.f.kind=Herb&plants.f.price=..5${query}`);
  await expect(page.locator('#plants tbody tr').first()).toBeVisible();
  if (query) {
    for (const id of ['#panel .lfdln-filter-trigger', '#bar .lfdln-filter-bar-row', '#rail .lfdln-filter-rail', '#columns .lfdln-filter-col']) {
      await expect(page.locator(id).first()).toBeVisible();
    }
  }
  await page.locator('#plants .lfdln-filter-button').click();
  await page.locator('#plants .lfdln-filter-row', { hasText: 'Price' }).click();
  await expect(page.locator('#plants .lfdln-filter-detail .lfdln-filter-pill[aria-pressed=true]')).toBeVisible();
  const styles = await page.locator('#plants').evaluate((host, props) => {
    const out: string[] = [];
    for (const el of host.querySelectorAll('.lfdln-filter-root, .lfdln-filter-root *, .lfdln-filter-chips, .lfdln-filter-chips *')) {
      const c = getComputedStyle(el);
      out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${props.map((p) => c.getPropertyValue(p)).join('|')}`);
    }
    return out;
  }, PROPS);
  expect(problems).toEqual([]);
  return styles;
}

test.use({ viewport: { width: 1280, height: 900 } });

test("the four add-ons on the page leave today's dialog looking the same", async ({ page }) => {
  const alone = await look(page, '');
  expect(alone.some((s) => s.startsWith('svg'))).toBe(true);
  expect(alone.some((s) => s.includes('lfdln-filter-pill'))).toBe(true);
  const beside = await look(page, '&addons=1');
  expect(beside).toEqual(alone);
});

// Stronger than the computed look (a rule can set what the dialog already has): no rule of the
// add-ons' style sheets (the shared parts' included) matches anything of the dialog's.
// The rules matching `els` in the style sheets whose <style> id passes `sheet`; rules that only
// reach them through .lfdln-filter-root (the mark every filter root carries, for the host's
// sake) are left out when `skipRoot` is set.
const matching = (page: Page, host: string, sel: string, sheet: string, skipRoot = false) =>
  page.locator(host).evaluate((h, [sel, sheet, skipRoot]) => {
    const els = [...h.querySelectorAll(sel as string)];
    const re = new RegExp(sheet as string);
    const out = new Set<string>();
    const walk = (rules: CSSRuleList) => {
      for (const r of rules) {
        if (r instanceof CSSStyleRule) {
          if (skipRoot && r.selectorText.includes('lfdln-filter-root')) continue;
          for (const el of els) if (el.matches(r.selectorText)) out.add(`${r.selectorText} -> ${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
        } else if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules);
      }
    };
    for (const sheet of document.styleSheets) {
      const id = (sheet.ownerNode as Element | null)?.id ?? '';
      if (re.test(id)) walk(sheet.cssRules);
    }
    return [...out];
  }, [sel, sheet, skipRoot] as const);

test("no add-on rule matches an element of today's dialog", async ({ page }) => {
  await look(page, '&addons=1');
  const dialog = '.lfdln-filter-root, .lfdln-filter-root *, .lfdln-filter-chips, .lfdln-filter-chips *';
  expect(await matching(page, '#plants', dialog, '^lfdln-filter-(parts|panel|bar|rail|columns)-style$')).toEqual([]);
});

// And the other way: the dialog's rules stay off the bar's pills and the panel's histogram
// (before, only the order of the style elements kept the dialog's pressed quick range off the
// bar's pressed "In stock").
test("no rule of today's dialog matches the bar's pills or the panel's histogram", async ({ page }) => {
  await look(page, '&addons=1&bar.f.stock=true&panel.f.stock=true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#bar [aria-pressed=true]')).toHaveCount(1);
  expect(await matching(page, '#bar', '.lfdln-filter-bar-row, .lfdln-filter-bar-row *', '^lfdln-filter-style$', true)).toEqual([]);
  await page.locator('#panel .lfdln-filter-trigger').click();
  await expect(page.locator('#panel .lfdln-filter-hist')).toBeVisible();
  expect(await matching(page, '#panel', '.lfdln-filter-hist, .lfdln-filter-hist *', '^lfdln-filter-(style|bar-style)$', true)).toEqual([]);
});
