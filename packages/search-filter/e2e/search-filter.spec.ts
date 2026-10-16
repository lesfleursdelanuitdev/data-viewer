import { test, expect, type Page } from '@playwright/test';

// demo/index.html (demo/demo.ts): #sf, an <lfdln-search-filter> over 12 plants, in #box. Sections
// Kind (Flower 3, Foliage 3, Herb 5, Tree 1), Light (Sun, Shade, Part shade), Price (a money range:
// Under €5, €5–€10, Over €10) and In stock, with counts worked out with the other filters and the
// search applied; fields Name and Owner; countFor counts the plants the typed text would leave.
// window.events keeps every search-change, filter-change and search-filter-change as { type, detail }.
type Ev = { type: string; detail: Record<string, unknown> };
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: Ev[] }).events);
const sf = (page: Page) => page.locator('#sf');
const field = (page: Page) => sf(page).locator('.lfdln-search-filter-field input[role=combobox]');
const tokens = (page: Page) => sf(page).locator('.lfdln-search-filter-field .lfdln-search-filter-token');
const listbox = (page: Page) => sf(page).getByRole('listbox', { name: 'Suggestions' });

async function open(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  await page.goto('/');
  await expect(field(page)).toBeVisible();
  return problems;
}

test.describe('<lfdln-search-filter>', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('typing "her" and Enter adds Kind is Herb', async ({ page }) => {
    const problems = await open(page);
    const input = field(page);
    await expect(input).toHaveAccessibleName('Search or filter');
    await expect(input).toHaveAttribute('placeholder', 'Search or filter');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await input.click();
    await input.pressSequentially('her');
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await expect(input).toHaveAttribute('aria-controls', (await listbox(page).getAttribute('id'))!);
    await expect(listbox(page).getByRole('option', { name: /Herb/ })).toBeVisible();
    await input.press('Enter');
    expect(await events(page)).toEqual([
      { type: 'filter-change', detail: { value: { kind: ['Herb'] } } },
      { type: 'search-filter-change', detail: { search: '', value: { kind: ['Herb'] } } },
    ]);
    await expect(input).toHaveValue('');
    await expect(tokens(page)).toHaveCount(1);
    await expect(tokens(page).first()).toHaveText('Kind is Herb');
    await expect(input).toHaveAttribute('placeholder', 'Add a filter…');
    await expect(page.locator('#lfdln-search-filter-style')).toHaveCount(1);
    expect(problems).toEqual([]);
  });

  test('Enter with no suggestion searches the text', async ({ page }) => {
    await open(page);
    const input = field(page);
    await input.click();
    await input.pressSequentially('zzz');
    await expect(sf(page).getByText('No filters match. Press Enter to search the text.')).toBeVisible();
    await expect(listbox(page).getByRole('option')).toHaveCount(3); // Search for, Name has, Owner has
    await input.press('Enter');
    expect(await events(page)).toEqual([
      { type: 'search-change', detail: { search: 'zzz', in: '' } },
      { type: 'search-filter-change', detail: { search: 'zzz', value: {} } },
    ]);
    await expect(tokens(page)).toHaveText(['Any column has zzz']);
    await expect(input).toHaveValue('');
  });

  test('a second text replaces the first', async ({ page }) => {
    await open(page);
    const input = field(page);
    await input.click();
    await input.pressSequentially('zzz');
    await input.press('Enter');
    await input.pressSequentially('yyy');
    await input.press('Enter');
    await expect(tokens(page)).toHaveText(['Any column has yyy']);
    expect((await events(page)).filter((e) => e.type === 'search-change').map((e) => e.detail))
      .toEqual([{ search: 'zzz', in: '' }, { search: 'yyy', in: '' }]);
  });

  test('Name has “mi” sets Search in', async ({ page }) => {
    await open(page);
    const input = field(page);
    await input.click();
    await input.pressSequentially('mi');
    const name = listbox(page).getByRole('option', { name: /Name has “mi”/ });
    await expect(name).toBeVisible();
    await input.press('ArrowDown');
    await expect(input).toHaveAttribute('aria-activedescendant', (await name.getAttribute('id'))!);
    await input.press('Enter');
    expect(await events(page)).toEqual([
      { type: 'search-change', detail: { search: 'mi', in: 'name' } },
      { type: 'search-filter-change', detail: { search: 'mi', value: {} } },
    ]);
    await expect(tokens(page)).toHaveText(['Name has mi']);
    await expect(tokens(page).locator('.lfdln-search-filter-token-key')).toHaveText('Name');
  });

  test('ArrowDown/ArrowUp move aria-activedescendant and wrap; the first suggestion shows the Enter hint', async ({ page }) => {
    await open(page);
    const input = field(page);
    await input.click();
    await input.pressSequentially('s');
    // Search for, Name has, Owner has; Light: Sun, Shade, Part shade; In stock: Yes, No.
    const options = listbox(page).getByRole('option');
    await expect(options).toHaveCount(8);
    const id = async (i: number) => (await options.nth(i).getAttribute('id'))!;
    const active = () => input.getAttribute('aria-activedescendant');
    expect(await active()).toBe(await id(3));
    await expect(options.nth(3)).toContainText('Sun');
    await expect(options.nth(3)).toHaveAttribute('aria-selected', 'true');
    await expect(options.nth(3).locator('.lfdln-search-filter-hint')).toBeVisible();
    await expect(options.nth(3).locator('.lfdln-search-filter-hint')).toHaveText('Enter');
    await expect(options.nth(4).locator('.lfdln-search-filter-hint')).toBeHidden();
    await input.press('ArrowDown');
    expect(await active()).toBe(await id(4));
    await expect(options.nth(4).locator('.lfdln-search-filter-hint')).toBeVisible();
    await expect(options.nth(3)).toHaveAttribute('aria-selected', 'false');
    await input.press('ArrowUp');
    await input.press('ArrowUp');
    expect(await active()).toBe(await id(2));
    for (let i = 0; i < 5; i++) await input.press('ArrowDown');
    expect(await active()).toBe(await id(7));
    await input.press('ArrowDown');
    expect(await active()).toBe(await id(0)); // wraps to the top
    await input.press('ArrowUp');
    expect(await active()).toBe(await id(7)); // and back to the bottom
    // Typing again starts from the first suggestion.
    await input.pressSequentially('u');
    await expect(options).toHaveCount(4); // Search for, Name has, Owner has, Sun
    expect(await active()).toBe(await id(3));
    expect(await events(page)).toEqual([]);
  });

  test('Backspace on an empty input removes the last token; with none it does nothing', async ({ page }) => {
    const problems = await open(page);
    const input = field(page);
    await input.click();
    await input.press('Backspace');
    expect(await events(page)).toEqual([]);
    await input.pressSequentially('her');
    await input.press('Enter');
    await input.pressSequentially('zzz');
    await input.press('Enter');
    await expect(tokens(page)).toHaveText(['Any column has zzz', 'Kind is Herb']);
    await input.press('Backspace');
    await expect(tokens(page)).toHaveText(['Any column has zzz']);
    expect((await events(page)).at(-2)).toEqual({ type: 'filter-change', detail: { value: {} } });
    const before = (await events(page)).length;
    for (let i = 0; i < 5; i++) await input.press('Backspace');
    await expect(tokens(page)).toHaveCount(0);
    expect((await events(page)).slice(before)).toEqual([
      { type: 'search-change', detail: { search: '', in: '' } },
      { type: 'search-filter-change', detail: { search: '', value: {} } },
    ]);
    // Backspace in typed text only deletes a letter.
    await input.pressSequentially('ab');
    await input.press('Backspace');
    await expect(input).toHaveValue('a');
    expect((await events(page)).length).toBe(before + 2);
    expect(problems).toEqual([]);
  });

  test('Esc closes, a second Esc clears the text; Done commits the text and closes', async ({ page }) => {
    await open(page);
    const input = field(page);
    await input.click();
    await input.pressSequentially('ros');
    await expect(listbox(page)).toBeVisible();
    await input.press('Escape');
    await expect(listbox(page)).toHaveCount(0);
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await expect(input).toHaveValue('ros');
    await expect(input).toBeFocused();
    await input.press('Escape');
    await expect(input).toHaveValue('');
    await input.pressSequentially('fern');
    await expect(listbox(page)).toBeVisible();
    await sf(page).getByRole('button', { name: 'Done' }).click();
    await expect(listbox(page)).toHaveCount(0);
    await expect(sf(page).getByRole('button', { name: 'Done' })).toHaveCount(0);
    expect(await events(page)).toEqual([
      { type: 'search-change', detail: { search: 'fern', in: '' } },
      { type: 'search-filter-change', detail: { search: 'fern', value: {} } },
    ]);
    await expect(tokens(page)).toHaveText(['Any column has fern']);
    await expect(input).toHaveValue('');
  });

  test('× removes a token and focus stays in the input', async ({ page }) => {
    await open(page);
    const input = field(page);
    await input.click();
    await input.pressSequentially('her');
    await input.press('Enter');
    await input.pressSequentially('sun');
    await input.press('Enter');
    await expect(tokens(page)).toHaveText(['Kind is Herb', 'Light is Sun']);
    await input.press('Escape');
    const x = sf(page).getByRole('button', { name: 'Remove Kind is Herb' });
    await x.click();
    await expect(tokens(page)).toHaveText(['Light is Sun']);
    await expect(input).toBeFocused();
    expect((await events(page)).slice(-2)).toEqual([
      { type: 'filter-change', detail: { value: { light: ['Sun'] } } },
      { type: 'search-filter-change', detail: { search: '', value: { light: ['Sun'] } } },
    ]);
    // By keyboard too: the last × is the one before the input.
    await page.keyboard.press('Shift+Tab');
    await expect(sf(page).getByRole('button', { name: 'Remove Light is Sun' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(tokens(page)).toHaveCount(0);
    await expect(input).toBeFocused();
  });

  test('Enter during IME composition does nothing', async ({ page }) => {
    await open(page);
    const input = field(page);
    await input.click();
    await input.pressSequentially('her');
    await page.evaluate(() => {
      const el = document.querySelector('#sf .lfdln-search-filter-field input')!;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(100);
    expect(await events(page)).toEqual([]);
    await expect(input).toHaveValue('her');
    await expect(tokens(page)).toHaveCount(0);
  });

  test('Enter never submits a surrounding form', async ({ page }) => {
    await open(page);
    const input = page.locator('#inform .lfdln-search-filter-field input');
    await input.click();
    await input.pressSequentially('zzz');
    await input.press('Enter');
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => (window as unknown as { submitted?: boolean }).submitted)).toBeUndefined();
    await expect(page.locator('#inform .lfdln-search-filter-token')).toHaveText(['Any column has zzz']);
  });

  test('odd text stays text and truncates', async ({ page }) => {
    await open(page);
    const input = field(page);
    const odd = `<b>Rosé</b> "quoted" 🌿${'x'.repeat(80)}`;
    await input.click();
    await input.fill(odd);
    await input.press('Enter');
    expect((await events(page))[0]).toEqual({ type: 'search-change', detail: { search: odd, in: '' } });
    await expect(sf(page).locator('.lfdln-search-filter-field b')).toHaveCount(0);
    const value = tokens(page).first().locator('.lfdln-search-filter-token-value');
    await expect(value).toHaveText(odd);
    const m = await value.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, to: getComputedStyle(el).textOverflow }));
    expect(m.sw).toBeGreaterThan(m.cw);
    expect(m.to).toBe('ellipsis');
    const w = await tokens(page).first().evaluate((el) => el.getBoundingClientRect().width);
    const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    expect(w).toBeLessThanOrEqual(16 * rem + 0.5);
    const x = tokens(page).first().getByRole('button');
    await expect(x).toHaveAccessibleName(/Rosé/);
    await expect(x).toHaveAccessibleName(`Remove Any column has ${odd}`);
    await expect(tokens(page).first()).toHaveAttribute('title', `Any column has ${odd}`);
  });

  test('zero-count suggestions dim to 0.45 and stay pickable', async ({ page }) => {
    await open(page);
    const input = field(page);
    await input.click();
    await input.pressSequentially('her');
    await input.press('Enter');
    await input.pressSequentially('shade');
    const shade = listbox(page).getByRole('option', { name: /^Light is\s*Shade\s*0$/ });
    const part = listbox(page).getByRole('option', { name: /Part shade/ });
    await expect(shade).toBeVisible();
    expect(await shade.evaluate((el) => getComputedStyle(el).opacity)).toBe('0.45');
    expect(await part.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await shade.click();
    expect((await events(page)).at(-2)).toEqual({ type: 'filter-change', detail: { value: { kind: ['Herb'], light: ['Shade'] } } });
    await expect(tokens(page)).toHaveText(['Kind is Herb', 'Light is Shade']);
    await expect(input).toBeFocused();
  });

  test('the "Search for" row shows how many the typed text would leave', async ({ page }) => {
    await open(page);
    const input = field(page);
    await input.click();
    await input.pressSequentially('ro');
    // Rose and Rosemary by name; nobody's owner has "ro".
    await expect(listbox(page).getByRole('option', { name: /Search for “ro”/ })).toContainText('2');
  });

  test('a range and a yes / no are tokens too', async ({ page }) => {
    await open(page);
    const input = field(page);
    await input.click();
    await input.pressSequentially('under');
    await input.press('Enter');
    await expect(tokens(page)).toHaveText(['Price · Under €5']);
    await input.pressSequentially('3');
    await listbox(page).getByRole('option', { name: /≥ 3/ }).click();
    await input.pressSequentially('stock');
    await listbox(page).getByRole('option', { name: /Yes/ }).click();
    await expect(tokens(page)).toHaveText([/^Price · €3(\.00)?–€5(\.00)?$/, 'In stock · Yes']);
    expect((await events(page)).at(-2)).toEqual({ type: 'filter-change', detail: { value: { price: { from: '3', to: '5' }, stock: true } } });
  });

  test('narrow: under 480 px the listbox is the bottom sheet with its own field', async ({ page }) => {
    const problems = await open(page);
    await page.evaluate(() => {
      (document.querySelector('#box') as HTMLElement).style.width = '470px';
    });
    await page.waitForTimeout(100);
    await field(page).click();
    const sheet = page.locator('dialog.lfdln-filter-popover[open]');
    await expect(sheet).toBeVisible();
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.y + box.height)).toBe(900);
    const inner = sheet.locator('input[role=combobox]');
    await expect(inner).toBeFocused();
    const rows = sheet.getByRole('option');
    expect(await rows.count()).toBeGreaterThan(0);
    for (const h of await rows.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
    await inner.pressSequentially('her');
    await expect(inner).toHaveAttribute('aria-activedescendant', /.+/);
    await inner.press('Enter');
    expect(await events(page)).toEqual([
      { type: 'filter-change', detail: { value: { kind: ['Herb'] } } },
      { type: 'search-filter-change', detail: { search: '', value: { kind: ['Herb'] } } },
    ]);
    await expect(sheet.locator('.lfdln-search-filter-token')).toHaveText(['Kind is Herb']);
    await expect(inner).toHaveValue('');
    await expect(inner).toBeFocused();
    await sheet.getByRole('button', { name: 'Done' }).click();
    await expect(page.locator('dialog.lfdln-filter-popover[open]')).toHaveCount(0);
    await expect(tokens(page)).toHaveText(['Kind is Herb']);
    await expect(field(page)).toBeFocused();
    // Done with text in the sheet searches it.
    await field(page).press('ArrowDown');
    await expect(sheet).toBeVisible();
    await inner.pressSequentially('mint');
    await sheet.getByRole('button', { name: 'Done' }).click();
    await expect(page.locator('dialog.lfdln-filter-popover[open]')).toHaveCount(0);
    await expect(tokens(page)).toHaveText(['Any column has mint', 'Kind is Herb']);
    // Back to wide: the listbox is under the field again.
    await page.evaluate(() => {
      (document.querySelector('#box') as HTMLElement).style.width = '';
    });
    await page.waitForTimeout(100);
    await field(page).click();
    await expect(listbox(page)).toBeVisible();
    await expect(page.locator('dialog.lfdln-filter-popover')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('the field is 40 px and the listbox at most 380 px', async ({ page }) => {
    await open(page);
    const f = sf(page).locator('.lfdln-search-filter-field');
    expect((await f.boundingBox())!.height).toBe(40);
    await field(page).click();
    await expect(listbox(page)).toBeVisible(); // focus with nothing typed lists every group
    await expect(listbox(page).getByRole('group')).toHaveCount(4);
    const lb = (await listbox(page).boundingBox())!;
    expect(lb.height).toBeLessThanOrEqual(380);
    expect(lb.height).toBeGreaterThan(300);
    const fb = (await f.boundingBox())!;
    const pop = (await sf(page).locator('.lfdln-filter-popover').boundingBox())!;
    expect(Math.round(pop.x)).toBe(Math.round(fb.x));
    expect(Math.round(pop.width)).toBe(Math.round(fb.width));
    expect(pop.y).toBeGreaterThan(fb.y + fb.height);
    const row = (await listbox(page).getByRole('option').first().boundingBox())!;
    expect(row.height).toBe(32);
    const op = (await listbox(page).getByRole('option').first().locator('.lfdln-search-filter-op').boundingBox())!;
    expect(op.width).toBe(64);
    // A click outside closes it.
    await page.mouse.click(1200, 800);
    await expect(listbox(page)).toHaveCount(0);
  });
});

test.describe('<lfdln-search-filter> on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the field is 44 px tall and the sheet rows 44 px, no sideways scroll', async ({ page }) => {
    const problems = await open(page);
    const f = sf(page).locator('.lfdln-search-filter-field');
    expect((await f.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await field(page).click();
    const sheet = page.locator('dialog.lfdln-filter-popover[open]');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('input[role=combobox]')).toBeFocused();
    for (const h of await sheet.getByRole('option').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
    expect(await sheet.locator('input[role=combobox]').evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await sheet.locator('input[role=combobox]').pressSequentially('her');
    await sheet.locator('input[role=combobox]').press('Enter');
    const x = sheet.getByRole('button', { name: 'Remove Kind is Herb' });
    const xb = (await x.boundingBox())!;
    expect(xb.width).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth])).toEqual([390, 390]);
    await x.click();
    await expect(sheet.locator('.lfdln-search-filter-token')).toHaveCount(0);
    await expect(sheet.locator('input[role=combobox]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog.lfdln-filter-popover[open]')).toHaveCount(0);
    await expect(field(page)).toBeFocused();
    expect(problems).toEqual([]);
  });
});
