import { test, expect, type Page } from '@playwright/test';

// demo/sentence.html loads only filter-sentence.standalone.js. #s (in #box): <lfdln-filter-sentence>
// with Kind (Perennial 6, Fern 2, Herb 0; plurals), Light (Sun, Shade; "for {values}" / "in any
// light"), Price (a range with no named ranges: From/To boxes; "at any price") and In stock ("in
// stock only" / "including sold out"). window.events keeps every filter-change detail.
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: unknown[] }).events);
const text = (page: Page) => page.locator('#s p.lfdln-filter-sentence-text');
const phrase = (page: Page, key: string) => page.locator(`#s .lfdln-filter-sentence-phrase[data-key="${key}"]`);
const menu = (page: Page) => page.locator('#s .lfdln-filter-col-menu');

test.describe('<lfdln-filter-sentence>', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('filter-change on every tick; the sentence follows; Start over clears', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(e.message));
    await page.goto('/sentence.html');
    await expect(text(page)).toHaveText('Show all plants in any light, at any price, including sold out.');
    await expect(page.locator('#s .lfdln-filter-sentence')).toHaveAttribute('aria-label', 'Filter plants');
    await expect(page.getByRole('button', { name: 'Start over' })).toHaveCount(0);
    await phrase(page, 'kind').click();
    await expect(menu(page)).toBeVisible();
    expect(Math.round((await menu(page).boundingBox())!.width)).toBe(220);
    await expect(menu(page).getByRole('checkbox', { name: /Herb/ })).toHaveClass(/lfdln-filter-dim/);
    await menu(page).getByRole('checkbox', { name: /Perennial/ }).click();
    expect(await events(page)).toEqual([{ value: { kind: ['Perennial'] } }]);
    await menu(page).getByRole('checkbox', { name: /Fern/ }).click();
    expect(await events(page)).toEqual([{ value: { kind: ['Perennial'] } }, { value: { kind: ['Perennial', 'Fern'] } }]);
    await expect(phrase(page, 'kind')).toHaveText('perennials and ferns');
    await expect(phrase(page, 'kind')).toHaveAccessibleName('Kind: perennials and ferns');
    await page.keyboard.press('Escape');
    await expect(menu(page)).toHaveCount(0);
    await expect(phrase(page, 'kind')).toBeFocused();
    // From/To boxes for a range with no named ranges; with no phrase it reads "Price: from 7".
    await phrase(page, 'price').click();
    const from = menu(page).getByLabel('From');
    await from.fill('7');
    await from.press('Enter');
    expect((await events(page)).at(-1)).toEqual({ value: { kind: ['Perennial', 'Fern'], price: { from: '7' } } });
    await page.keyboard.press('Escape');
    await expect(text(page)).toHaveText('Show perennials and ferns in any light, Price: from 7, including sold out.');
    await page.getByRole('button', { name: 'Start over' }).click();
    expect((await events(page)).at(-1)).toEqual({ value: {} });
    await expect(text(page)).toHaveText('Show all plants in any light, at any price, including sold out.');
    await expect(page.getByRole('button', { name: 'Start over' })).toHaveCount(0);
    await expect(phrase(page, 'kind')).toBeFocused();
    expect(problems).toEqual([]);
  });

  test('words replace the joining words', async ({ page }) => {
    await page.goto('/sentence.html');
    await page.locator('#s').evaluate((el) => {
      const s = el as HTMLElement & { value: unknown; words: unknown };
      s.value = { kind: ['Perennial', 'Fern', 'Herb'], light: ['Sun'] };
      s.words = { sentenceStart: 'Find', and: 'or', comma: ';', listComma: '', sentenceEnd: '!', startOver: 'Reset' };
    });
    await expect(text(page)).toHaveText('Find perennials; ferns or herbs for sun; at any price including sold out!');
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
  });

  test('narrower than 480 px (its own width) the menus are the bottom sheet', async ({ page }) => {
    await page.goto('/sentence.html');
    await page.locator('#box').evaluate((el) => {
      (el as HTMLElement).style.width = '470px';
    });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await phrase(page, 'light').click();
    const sheet = page.locator('#s dialog.lfdln-filter-col-menu[open]');
    await expect(sheet).toBeVisible();
    await sheet.getByRole('checkbox', { name: /Shade/ }).click();
    expect(await events(page)).toEqual([{ value: { light: ['Shade'] } }]);
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(phrase(page, 'light')).toBeFocused();
  });
});
