import { expect, test } from '@playwright/test';

test('seed-mode login enters the dashboard', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Seed mode active')).toBeVisible();

  await page.getByRole('button', { name: 'Enter seed mode' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});

test('dashboard renders executive information without crashing', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByText('Current NAV')).toBeVisible();
  await expect(page.getByText('Investor principal due', { exact: true })).toBeVisible();
  await expect(page.getByText('Action required')).toBeVisible();
});

test('desktop sidebar retains the final navigation item above the account footer', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/dashboard');

  const dashboard = page.getByRole('link', { name: 'Dashboard', exact: true }).first();
  const settings = page.getByRole('link', { name: 'Settings', exact: true }).first();
  await expect(dashboard).toBeVisible();
  await expect(settings).toBeVisible();

  const dashboardBox = await dashboard.boundingBox();
  const settingsBox = await settings.boundingBox();
  expect(dashboardBox).not.toBeNull();
  expect(settingsBox).not.toBeNull();
  expect(settingsBox!.y).toBeGreaterThan(dashboardBox!.y + dashboardBox!.height - 1);
});

test('portfolio CSV export returns downloadable CSV content', async ({ request }) => {
  const response = await request.get('/api/export/portfolio');

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/csv');
  expect(await response.text()).toContain('Instrument');
});

test('keyboard shortcut g d navigates back to dashboard', async ({ page }) => {
  await page.goto('/cycles');
  await expect(page).toHaveURL(/\/cycles$/);
  await expect(page.getByRole('heading', { name: /^cycles$/i })).toBeVisible();
  await page.waitForFunction(() => Boolean((window as Window & { __lejShortcutsReady?: boolean }).__lejShortcutsReady));

  await page.keyboard.press('g');
  await page.keyboard.press('d');

  await expect(page).toHaveURL(/\/dashboard$/);
});

test('investor role is redirected away from settings', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' });
  await context.addCookies([
    {
      name: 'lej_test_role',
      value: 'INVESTOR',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
  const page = await context.newPage();

  await page.goto('/settings');

  await expect(page).toHaveURL(/\/dashboard\?error=access_denied$/);
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  await context.close();
});

test('settings shows system readiness checklist', async ({ page }) => {
  await page.goto('/settings');

  await expect(page.getByRole('heading', { name: /system readiness checklist/i })).toBeVisible();
  await expect(page.getByText('Launch readiness')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cycle setup' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Email delivery' })).toBeVisible();
});

test('business edit drawer exposes delete control', async ({ page }) => {
  await page.goto('/engines');

  await page.getByRole('button', { name: 'Add business' }).first().click();
  await page.getByRole('button', { name: 'Edit business' }).click();
  await expect(page.getByRole('button', { name: 'Delete business' })).toBeVisible();
});

test('ai advisor returns a fund-aware response', async ({ page }) => {
  await page.goto('/ai-advisor');

  await page.getByPlaceholder(/ask about fund strategy/i).fill('Give me a morning briefing');
  await page.getByRole('button', { name: 'Send AI message' }).click();

  await expect(page.getByText(/Local advisor mode/i)).toBeVisible({ timeout: 15_000 });
});

test('voice assistant handles typed fund commands', async ({ page }) => {
  await page.goto('/dashboard');

  await page.getByRole('button', { name: 'Open voice assistant' }).click();
  await page.getByPlaceholder(/type or use the mic/i).fill('daily brief');
  await page.getByRole('button', { name: 'Send voice message' }).click();

  await expect(page.getByText(/LEJ Capital daily brief|Net Asset Value|Protection Cover Ratio/i).last()).toBeVisible({ timeout: 10_000 });
});

test('investor export scope allows statements but blocks loan book', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' });
  await context.addCookies([
    {
      name: 'lej_test_role',
      value: 'INVESTOR',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'lej_test_email',
      value: 'seed-investor-a@lej.local',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  const statement = await context.request.get('/api/export/investor-statement-pdf');
  expect(statement.status()).toBe(200);
  expect(statement.headers()['content-type']).toContain('application/pdf');

  const loans = await context.request.get('/api/export/loans');
  expect(loans.status()).toBe(403);

  await context.close();
});
