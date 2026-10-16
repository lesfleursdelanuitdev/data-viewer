import { test, expect, type Page } from '@playwright/test';

// demo/rail.html loads only filter-rail.standalone.js. #r: <lfdln-filter-rail> with Kind (Flower
// 1, Foliage 0, Herb 2), Size (single choice: Small, Large), Height (a range with no named
// ranges: From/To boxes) and In stock (with a hint). window.events keeps every filter-change detail.
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: unknown[] }).events);

test.describe('<lfdln-filter-rail>', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('every change applies at once and fires filter-change; Clear clears', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(e.message));
    await page.goto('/rail.html');
    const r = page.locator('#r');
    await expect(r.getByRole('group', { name: 'Filters' }).first()).toBeVisible();
    await expect(r.getByRole('group', { name: 'Kind' })).toBeVisible();
    // Zero dims, and stays clickable.
    await expect(r.getByRole('checkbox', { name: /Foliage/ })).toHaveClass(/lfdln-filter-dim/);
    await r.getByRole('checkbox', { name: /Herb/ }).click();
    expect(await events(page)).toEqual([{ value: { kind: ['Herb'] } }]);
    await expect(r.getByRole('checkbox', { name: /Herb/ })).toHaveAttribute('aria-checked', 'true');
    // A single choice replaces.
    await r.getByRole('radiogroup', { name: 'Size' }).getByRole('radio', { name: 'Small' }).click();
    await r.getByRole('radiogroup', { name: 'Size' }).getByRole('radio', { name: 'Large' }).click();
    expect((await events(page)).at(-1)).toEqual({ value: { kind: ['Herb'], size: ['l'] } });
    // The From/To boxes apply when left.
    const from = r.getByRole('group', { name: 'Height' }).getByLabel('From');
    await from.fill('10');
    await from.press('Tab');
    expect((await events(page)).at(-1)).toEqual({ value: { kind: ['Herb'], size: ['l'], height: { from: '10' } } });
    // The switch, named by its label and described by its hint.
    const sw = r.getByRole('switch', { name: 'In stock' });
    await expect(sw).toHaveAccessibleDescription('Hide plants that are sold out');
    await sw.click();
    expect((await events(page)).at(-1)).toEqual({ value: { kind: ['Herb'], size: ['l'], height: { from: '10' }, stock: true } });
    await r.getByRole('button', { name: 'Clear' }).click();
    expect((await events(page)).at(-1)).toEqual({ value: {} });
    await expect(r.getByRole('button', { name: 'Clear' })).toHaveCount(0);
    await expect(r.getByRole('checkbox', { name: /Flower/ })).toBeFocused();
    await expect(from).toHaveValue('');
    expect(problems).toEqual([]);
  });
});
