import { test, expect, type Page } from '@playwright/test';

// demo/html-only.html loads only the standalone script. #fox: href, a header with a picture
// (svg), a title with markup, a badge and an <lfdln-menu>; free body content; a footer with meta,
// value, a primary item and five more (wrap, 3 at most). #fern: clickable, actions="menu".
// #row: actions="row" (max 10, More with an icon) in a 360px box. window.events keeps
// menu-action and card-open. demo/index.html sets #js and #js-row up from script (parts).
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: unknown[] }).events);
const card = (page: Page, id: string) => page.locator(`#${id} .lfdln-card`);

async function htmlOnly(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('/html-only.html');
  await expect(card(page, 'fox')).toBeVisible();
  return problems;
}

// Two animation frames: a ResizeObserver round (and its fit) is over by then.
const frames = (page: Page) => page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));

// The row's buttons as shown, and More's items (hidden ones left out).
async function rowState(page: Page) {
  const row = card(page, 'row').locator('.lfdln-card-actions-row');
  return row.evaluate((r) => ({
    shown: [...r.querySelectorAll<HTMLElement>(':scope > [data-fit]')].filter((b) => !b.hidden).map((b) => b.textContent!.trim()),
    more: (r.querySelector<HTMLElement>(':scope > .lfdln-card-more')!.hidden
      ? [] : [...r.querySelectorAll<HTMLElement>('.lfdln-menu-list [role=menuitem]')].filter((m) => !m.hidden).map((m) => m.textContent!.trim())),
    // One line: every part shown overlaps the first one vertically.
    oneLine: (() => {
      const boxes = [...r.children].filter((c) => !(c as HTMLElement).hidden && (c as HTMLElement).offsetParent)
        .map((c) => c.getBoundingClientRect()).filter((b) => b.height > 0);
      return boxes.every((b) => b.top < boxes[0]!.bottom && b.bottom > boxes[0]!.top);
    })(),
    fits: r.scrollWidth <= r.clientWidth + 1,
  }));
}

test.describe('HTML only', () => {
  test('header, body and footer from the markup', async ({ page }) => {
    const problems = await htmlOnly(page);
    const fox = card(page, 'fox');
    const link = fox.locator('a.lfdln-card-link');
    await expect(link).toHaveAttribute('href', /#foxglove$/);
    await expect(link).toHaveAttribute('title', 'Foxglove (Digitalis)');
    await expect(link.locator('.lfdln-card-title em')).toHaveText('(Digitalis)');
    await expect(fox.locator('.lfdln-card-head .lfdln-card-badge')).toHaveText('Part shade');
    await expect(fox.locator('.lfdln-card-picture svg.pic')).toHaveCount(1);
    await expect(fox.locator('.lfdln-card-head lfdln-menu .lfdln-menu-button')).toHaveAccessibleName('More for Foxglove');
    await expect(fox.locator('.lfdln-card-content p.free')).toContainText('Tall spires of bells.');
    await expect(fox.locator('.lfdln-card-meta')).toHaveText('12 in stock');
    await expect(fox.locator('.lfdln-card-value')).toHaveText('€6.50');
    // Wrap: the primary action, three items (danger last), the rest in ⋯.
    const names = await fox.locator('.lfdln-card-actions').locator(':scope > button, :scope > a, :scope > .lfdln-card-actions-more button.lfdln-menu-button')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? e.textContent!.trim()));
    expect(names).toEqual(['Buy', '🧺Put one aside', 'Gift wrap', 'Compare', 'More for Foxglove (Digitalis)']);
    const gift = fox.getByRole('button', { name: 'Gift wrap' });
    await expect(gift).toHaveAttribute('aria-disabled', 'true');
    await expect(gift).toHaveAccessibleDescription('Gift wrap is sold out');
    // The markup was read once.
    await expect(page.locator('#fox lfdln-card-footer, #fox lfdln-menu-item')).toHaveCount(0);
    await expect(page.locator('#lfdln-card-style')).toHaveCount(1);
    expect(problems).toEqual([]);
  });

  test('footer items and the primary fire menu-action; confirm asks first; the header menu is its own', async ({ page }) => {
    await htmlOnly(page);
    const fox = card(page, 'fox');
    await fox.getByRole('button', { name: 'Buy' }).click();
    await fox.getByRole('button', { name: 'Put one aside' }).click();
    await fox.locator('.lfdln-card-actions-more .lfdln-menu-button').click();
    await fox.locator('.lfdln-card-actions-more').getByRole('menuitem', { name: 'Remove' }).click();
    // The card's own confirm (the header's <lfdln-menu> has one of its own).
    const dialog = page.locator('#fox > dialog.lfdln-menu-confirm');
    await expect(dialog).toContainText('Remove Foxglove from the list?');
    await dialog.getByRole('button', { name: 'Remove' }).click();
    await fox.locator('lfdln-menu .lfdln-menu-button').click();
    await fox.locator('lfdln-menu').getByRole('menuitem', { name: 'Share' }).click();
    await expect.poll(() => events(page)).toEqual([
      { type: 'menu-action', on: 'fox', id: 'buy' },
      { type: 'menu-action', on: 'fox', id: 'aside' },
      { type: 'menu-action', on: 'fox', id: 'remove' },
      { type: 'menu-action', on: 'fox', id: 'share' },
    ]);
    await expect(page).not.toHaveURL(/#foxglove/);
  });

  test('the whole card opens it, but a tap that only closes a menu does not', async ({ page }) => {
    await htmlOnly(page);
    const fox = card(page, 'fox');
    await fox.locator('lfdln-menu .lfdln-menu-button').click();
    await expect(fox.locator('lfdln-menu .lfdln-menu-list')).toBeVisible();
    const body = (await fox.locator('.lfdln-card-meta').boundingBox())!;
    await page.mouse.click(body.x + 4, body.y - 30); // on the open layer, away from any button
    await expect(fox.locator('lfdln-menu .lfdln-menu-list')).toBeHidden();
    await expect(page).not.toHaveURL(/#foxglove/);
    await page.mouse.click(body.x + 4, body.y - 30);
    await expect(page).toHaveURL(/#foxglove$/);
    // A clickable card without href fires card-open.
    await card(page, 'fern').click({ position: { x: 20, y: 70 } });
    expect(await events(page)).toEqual([{ type: 'card-open', on: 'fern', id: undefined }]);
  });

  test('actions="menu": no footer buttons; the items are the header ⋯', async ({ page }) => {
    await htmlOnly(page);
    const fern = card(page, 'fern');
    await expect(fern.locator('.lfdln-card-actions')).toHaveCount(0);
    await fern.locator('.lfdln-card-head .lfdln-menu-button').click();
    await expect(fern.locator('.lfdln-menu-list [role=menuitem]')).toHaveText(['Put one aside', 'Remove']);
    await expect(fern.locator('.lfdln-card-head .lfdln-menu-button')).toHaveAccessibleName("What you can do with Hart's-tongue fern");
  });
});

test.describe('actions="row"', () => {
  test('as many as fit, the rest in More; danger goes first; it follows the card\'s width', async ({ page }) => {
    await htmlOnly(page);
    const box = page.locator('#row-box');
    const at = async (w: number) => {
      await box.evaluate((b, px) => { b.style.width = `${px}px`; }, w);
      await frames(page);
      return rowState(page);
    };
    const wide = await at(900);
    expect(wide.shown).toEqual(['✏️Edit', 'Share', 'Print', 'History', 'Delete']);
    expect(wide.more).toEqual([]);
    await expect(card(page, 'row').locator('.lfdln-card-more')).toBeHidden();
    const mid = await at(360);
    expect(mid.shown.length).toBeGreaterThan(0);
    expect(mid.shown.length).toBeLessThan(5);
    // Danger is the first to go into More, and More lists exactly what the row doesn't show.
    expect(mid.shown).not.toContain('Delete');
    expect([...mid.shown, ...mid.more].sort()).toEqual(['✏️Edit', 'Delete', 'History', 'Print', 'Share'].sort());
    expect(mid.oneLine).toBe(true);
    expect(mid.fits).toBe(true);
    const more = card(page, 'row').locator('.lfdln-card-more .lfdln-menu-button');
    await expect(more).toBeVisible();
    await expect(more).toHaveText('⋯More');
    const narrow = await at(150);
    expect(narrow.shown.length).toBeLessThan(mid.shown.length);
    expect(narrow.fits).toBe(true);
    await expect(more).toBeVisible();
    const tiny = await at(90);
    expect(tiny.shown).toEqual([]);
    expect(tiny.more.length).toBe(5);
    await expect(more).toBeVisible();
    // Back to wide: everything returns, More goes.
    expect((await at(900)).shown.length).toBe(5);
    await expect(card(page, 'row').locator('.lfdln-card-more')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test('More\'s keyboard skips what the row shows', async ({ page }) => {
    await htmlOnly(page);
    await page.locator('#row-box').evaluate((b) => { b.style.width = '300px'; });
    await frames(page);
    const { more } = await rowState(page);
    const button = card(page, 'row').locator('.lfdln-card-more .lfdln-menu-button');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('role'))).toBe('menuitem');
    const seen: string[] = [];
    for (let i = 0; i < more.length; i++) {
      seen.push(await page.evaluate(() => document.activeElement!.textContent!.trim()));
      await page.keyboard.press('ArrowDown');
    }
    expect(seen).toEqual(more);
    await page.keyboard.press('Escape');
    await expect(button).toBeFocused();
  });
});

test.describe('from script', () => {
  test('parts, a clickable card, a row with its own More words', async ({ page }) => {
    await page.goto('/');
    const js = card(page, 'js');
    await expect(js.locator('button.lfdln-card-link')).toHaveText('Rose jam');
    await expect(js.locator('.lfdln-card-fact')).toHaveText(['45 minutes', 'Persian']);
    await js.getByRole('button', { name: 'Make again' }).click();
    await js.getByRole('button', { name: 'Edit' }).click();
    await js.click({ position: { x: 20, y: 70 } });
    expect(await events(page)).toEqual([
      { type: 'menu-action', on: 'js', id: 'again' },
      { type: 'menu-action', on: 'js', id: 'edit' },
      { type: 'card-open', on: 'js', id: undefined },
    ]);
    await page.locator('#js-row').evaluate((el) => { (el as HTMLElement).style.width = '120px'; });
    const more = card(page, 'js-row').locator('.lfdln-card-more .lfdln-menu-button');
    await expect(more).toHaveText('Others');
    await expect(more).toHaveAccessibleName('Others');
  });
});

test.describe('keyboard', () => {
  test('title, then the header menu, then the footer, then the next card', async ({ page }) => {
    await htmlOnly(page);
    await card(page, 'fox').locator('.lfdln-card-link').focus();
    const order: string[] = [];
    for (let i = 0; i < 7; i++) {
      order.push(await page.evaluate(() => {
        const a = document.activeElement as HTMLElement;
        const where = a.closest('lfdln-card')?.id ?? '?';
        const name = a.classList.contains('lfdln-card-link') ? 'title' : (a.getAttribute('aria-label') ?? a.textContent!.trim());
        return `${where}: ${name}`;
      }));
      await page.keyboard.press('Tab');
    }
    expect(order).toEqual([
      'fox: title', 'fox: More for Foxglove', 'fox: Care notes', 'fox: Buy', 'fox: 🧺Put one aside', 'fox: Gift wrap', 'fox: Compare',
    ]);
    await page.keyboard.press('Tab'); // the ⋯ with the rest
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.closest('lfdln-card')?.id)).toBe('fern');
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('44px targets and no sideways scroll', async ({ page }) => {
    await htmlOnly(page);
    for (const b of await page.locator('.lfdln-card-actions > button, .lfdln-card-actions > a, .lfdln-card-action, .lfdln-menu-button').all()) {
      if (!(await b.isVisible())) continue;
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect((await rowState(page)).oneLine).toBe(true);
  });
});
