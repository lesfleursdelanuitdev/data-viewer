import { test, expect, type Page } from '@playwright/test';

// demo/phones.html: #wide has layout="table"; #keep has layout="table" phone-layout="table"; #mem
// has layout="cards" remember-as="mem"; #memkeep has phone-layout="table" remember-as="memkeep".
// window.layouts collects every dv-layout detail. Phones are 640 px wide or less.
const phone = { width: 390, height: 844 };
const wide = { width: 1280, height: 900 };

async function open(page: Page) {
  await page.goto('/phones.html');
  await expect(page.locator('#memkeep .dv-root')).toHaveCount(1);
}
const layouts = (page: Page) => page.evaluate(() => (window as unknown as { layouts: unknown[] }).layouts);
const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);

test('layout="table" shows cards at 390 px', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page);
  await expect(page.locator('#wide .dv-cards')).toBeVisible();
  await expect(page.locator('#wide .dv-table')).toHaveCount(0);
});

test('phone-layout="table" keeps a table at 390 px', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page);
  await expect(page.locator('#keep .dv-table')).toBeVisible();
});

test('crossing 640 px switches both ways, with no dv-layout', async ({ page }) => {
  await page.setViewportSize(wide);
  await open(page);
  await expect(page.locator('#wide .dv-table')).toBeVisible();
  await page.setViewportSize({ width: 600, height: 900 });
  await expect(page.locator('#wide .dv-cards')).toBeVisible();
  await expect(page.locator('#wide .dv-table')).toHaveCount(0);
  await page.setViewportSize(wide);
  await expect(page.locator('#wide .dv-table')).toBeVisible();
  await expect(page.locator('#wide .dv-cards')).toHaveCount(0);
  expect(await layouts(page)).toEqual([]);
});

test('the switch shows the layout drawn', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page);
  await expect(page.locator('#wide .dv-layout').getByRole('button', { name: 'Show cards' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#wide .dv-layout').getByRole('button', { name: 'Show a table' })).toHaveAttribute('aria-pressed', 'false');
});

test('a choice is kept per mode', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page);
  await expect(page.locator('#mem .dv-cards')).toBeVisible();
  await page.locator('#mem .dv-layout').getByRole('button', { name: 'Show a table' }).click();
  await expect(page.locator('#mem .dv-table')).toBeVisible();
  expect(await stored(page, 'mem.phone')).toBe('table');
  expect(await stored(page, 'mem')).toBeNull();
  expect(await layouts(page)).toEqual([{ layout: 'table' }]);

  // Wide: the list's own layout (cards), until a press there.
  await page.setViewportSize(wide);
  await expect(page.locator('#mem .dv-cards')).toBeVisible();
  await page.locator('#mem .dv-layout').getByRole('button', { name: 'Show a table' }).click();
  await expect(page.locator('#mem .dv-table')).toBeVisible();
  expect(await stored(page, 'mem')).toBe('table');

  await page.setViewportSize(phone);
  await page.reload();
  await expect(page.locator('#mem .dv-table')).toBeVisible();
  await page.setViewportSize(wide);
  await page.reload();
  await expect(page.locator('#mem .dv-table')).toBeVisible();
});

test('a stored choice wins over phone-layout for its mode', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page);
  await expect(page.locator('#memkeep .dv-table')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('memkeep.phone', 'cards'));
  await page.reload();
  await expect(page.locator('#memkeep .dv-cards')).toBeVisible();
  await expect(page.locator('#memkeep .dv-table')).toHaveCount(0);
});

test('a list taken off the page and put back still switches once per crossing', async ({ page }) => {
  // Count the PHONE media listeners that are live, and how often they run.
  await page.addInitScript(() => {
    const w = window as unknown as { live: number; calls: number };
    w.live = 0;
    w.calls = 0;
    const wrapped = new WeakMap<object, EventListener>();
    const add = MediaQueryList.prototype.addEventListener;
    const remove = MediaQueryList.prototype.removeEventListener;
    MediaQueryList.prototype.addEventListener = function (this: MediaQueryList, type: string, fn: EventListener) {
      if (type !== 'change' || this.media !== '(max-width: 640px)') return add.call(this, type, fn);
      const wrap: EventListener = (e) => { w.calls++; fn(e); };
      wrapped.set(fn, wrap);
      w.live++;
      return add.call(this, type, wrap);
    } as typeof add;
    MediaQueryList.prototype.removeEventListener = function (this: MediaQueryList, type: string, fn: EventListener) {
      const wrap = wrapped.get(fn);
      if (type === 'change' && wrap && this.media === '(max-width: 640px)') {
        w.live--;
        wrapped.delete(fn);
        return remove.call(this, type, wrap);
      }
      return remove.call(this, type, fn);
    } as typeof remove;
  });
  await page.setViewportSize(wide);
  await open(page);
  const counts = () => page.evaluate(() => {
    const w = window as unknown as { live: number; calls: number };
    return { live: w.live, calls: w.calls };
  });
  const before = (await counts()).live;
  expect(before).toBeGreaterThan(0);
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => {
      const el = document.getElementById('wide')!;
      const at = el.nextSibling;
      el.remove();
      at!.parentNode!.insertBefore(el, at);
    });
  }
  await expect(page.locator('#wide .dv-table')).toBeVisible();
  expect((await counts()).live).toBe(before);
  await page.setViewportSize({ width: 600, height: 900 });
  await expect(page.locator('#wide .dv-cards')).toBeVisible();
  expect((await counts()).calls).toBe(before);
  await page.setViewportSize(wide);
  await expect(page.locator('#wide .dv-table')).toBeVisible();
  expect((await counts()).calls).toBe(before * 2);
  expect(await layouts(page)).toEqual([]);
});
