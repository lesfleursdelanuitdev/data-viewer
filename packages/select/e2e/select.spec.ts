import { test, expect, type Locator, type Page } from '@playwright/test';

// demo/index.html: #wrapped (<lfdln-select> in a form, name "fruit"), #narrow (9rem, a long
// option), #big (its own tokens), #off (disabled), #plain (<select class="lfdln-select">).
// window.events keeps every change and input as { type, value }.
async function open(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('/index.html');
  await expect(page.locator('#wrapped .lfdln-select-chevron svg')).toHaveCount(1);
  return problems;
}

/** The gap before the text (border + padding) and the gap after the chevron, in px. */
export async function gaps(select: Locator): Promise<{ left: number; right: number }> {
  return select.evaluate((s: HTMLSelectElement) => {
    const cs = getComputedStyle(s);
    const left = parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
    const r = s.getBoundingClientRect();
    const chevron = s.parentElement?.querySelector(':scope > .lfdln-select-chevron svg');
    if (chevron) return { left, right: r.right - chevron.getBoundingClientRect().right };
    // a plain select: its second background layer ends --select-pad-x inside the padding box
    const pos = cs.backgroundPositionX.split(',')[1]!.trim(); // "right 9.6px" or "calc(100% - 9.6px)"
    const px = parseFloat(pos.replace(/^right\s+/, '').replace(/^calc\(100% - /, ''));
    return { left, right: parseFloat(cs.borderRightWidth) + px };
  });
}

for (const [where, viewport] of [['wide', { width: 1280, height: 800 }], ['phone', { width: 390, height: 800 }]] as const) {
  test.describe(where, () => {
    test.use({ viewport });
    test('even: the gap before the text equals the gap after the chevron (±1 px), for every dropdown', async ({ page }) => {
      const problems = await open(page);
      for (const id of ['#fruit', '#narrow select', '#big select', '#off select', '#plain']) {
        const g = await gaps(page.locator(id));
        expect(Math.abs(g.left - g.right), `${id}: ${JSON.stringify(g)}`).toBeLessThanOrEqual(1);
        expect(g.left).toBeGreaterThan(4);
      }
      // the long option is cut, not drawn under the chevron
      const narrow = page.locator('#narrow select');
      const [sel, chev] = await Promise.all([narrow.boundingBox(), page.locator('#narrow .lfdln-select-chevron').boundingBox()]);
      expect(sel!.width).toBeLessThanOrEqual(9 * 16 + 0.5);
      expect(chev!.x + chev!.width).toBeLessThanOrEqual(sel!.x + sel!.width);
      expect(problems).toEqual([]);
    });
  });
}

test('it is still a native select: appearance none, keyboard, change and input, forms', async ({ page }) => {
  await open(page);
  const fruit = page.locator('#fruit');
  expect(await fruit.evaluate((s) => getComputedStyle(s).appearance)).toBe('none');
  await expect(page.getByRole('combobox', { name: 'Fruit' })).toHaveValue('apple');
  await fruit.selectOption('pear');
  expect(await page.evaluate(() => (window as unknown as { events: unknown[] }).events)).toEqual([
    { type: 'input', value: 'pear' }, { type: 'change', value: 'pear' },
  ]);
  // the form sends it
  expect(await page.locator('#form').evaluate((f: HTMLFormElement) => new FormData(f).get('fruit'))).toBe('pear');
  // the keyboard
  await fruit.focus();
  await page.keyboard.press('ArrowDown');
  await expect(fruit).toHaveValue('quince');
  // a click on the chevron reaches the select (it lets clicks through)
  expect(await page.locator('#wrapped .lfdln-select-chevron').evaluate((c) => getComputedStyle(c).pointerEvents)).toBe('none');
  // the chevron is drawn in the text's colour
  const [text, stroke] = await page.locator('#wrapped').evaluate((w) => [getComputedStyle(w.querySelector('select')!).color, getComputedStyle(w.querySelector('svg')!).stroke]);
  expect(stroke).toBe(text);
});

test('disabled stays disabled; the style is added once', async ({ page }) => {
  await open(page);
  await expect(page.locator('#off select')).toBeDisabled();
  expect(await page.locator('style#lfdln-select-style').count()).toBe(1);
});
