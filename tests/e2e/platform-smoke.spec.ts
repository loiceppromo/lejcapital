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

test('portfolio CSV export returns downloadable CSV content', async ({ request }) => {
  const response = await request.get('/api/export/portfolio');

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/csv');
  expect(await response.text()).toContain('Instrument');
});

test('keyboard shortcut g d navigates back to dashboard', async ({ page }) => {
  await page.goto('/cycles');
  await expect(page).toHaveURL(/\/cycles$/);

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
