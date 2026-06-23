import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const staticRoutes = [
  ['/dashboard', /executive dashboard/i],
  ['/ai-advisor', /ai advisor/i],
  ['/cycles', /^cycles$/i],
  ['/cycles/compare', /cycle comparison/i],
  ['/ledger', /^ledger$/i],
  ['/market', /market portfolio/i],
  ['/loans', /lej loans/i],
  ['/engines', /operating businesses/i],
  ['/investors', /capital partners/i],
  ['/risk', /risk dashboard/i],
  ['/reports', /^reports$/i],
  ['/audit', /^audit$/i],
  ['/portal', /capital portal/i],
  ['/calculator', /loan calculator/i],
  ['/decisions', /decision centre/i],
  ['/guide', /lej capital management system/i],
  ['/settings', /^settings$/i],
] as const;

test.describe('release route coverage in deterministic seed mode', () => {
  for (const [route, heading] of staticRoutes) {
    test(`${route} renders without a browser console error`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      await page.goto(route);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
      expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
    });
  }
});

test('action drawers expose dialog semantics, close on Escape, and return focus', async ({ page }) => {
  await page.goto('/engines');
  const trigger = page.getByRole('button', { name: 'Add business' }).first();
  await trigger.focus();
  await trigger.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Add business' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close drawer' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('saved dark theme persists through refresh without reverting to light mode', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveClass(/dark-mode/);

  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark-mode/);
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
});

test('critical seed-mode pages have no serious Axe violations', async ({ page }) => {
  for (const route of ['/login', '/dashboard', '/ledger', '/loans', '/settings']) {
    await page.goto(route);
    const result = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    const serious = result.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''));
    expect(serious, `${route}: ${serious.map((violation) => `${violation.id}: ${violation.help}`).join('; ')}`).toEqual([]);
  }
});

test('core operational pages fit every supported viewport without document overflow', async ({ page }) => {
  const viewports = [
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of ['/dashboard', '/ledger', '/loans']) {
      await page.goto(route);
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      const overflowSources = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((element) => element.scrollWidth > document.documentElement.clientWidth + 1)
        .slice(0, 8)
        .map((element) => ({
          tag: element.tagName,
          className: element.className,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        })));
      expect(
        dimensions.scrollWidth,
        `${route} at ${viewport.width}x${viewport.height} exceeds the viewport by ${dimensions.scrollWidth - dimensions.clientWidth}px. Sources: ${JSON.stringify(overflowSources)}`,
      ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    }
  }
});
