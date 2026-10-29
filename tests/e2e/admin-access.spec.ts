import { test, expect } from '@playwright/test';
import { ids } from '../../src/lib/seed';

test('only the owner can open the administration entry point', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Admin sections' })).toBeVisible();
});

test('members cannot see admin settings or bypass them through URLs and API commands', async ({
  page,
}) => {
  await page
    .context()
    .addCookies([{ name: 'gamazon-demo-user', value: ids.rohan, url: 'http://127.0.0.1:3000' }]);
  await page.goto('/admin');
  await expect(page).toHaveURL('http://127.0.0.1:3000/community');
  await expect(page.locator('.gz-post').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Admin', exact: true })).toHaveCount(0);
  await page.getByLabel('Account menu').click();
  await expect(page.locator('.gz-account').getByText('Admin', { exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.locator('.gz-nav').getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Authenticator', exact: true })).toHaveCount(0);
  expect((await page.request.get('/api/v1/metrics')).status()).toBe(403);
  for (const command of [
    { type: 'invite.create', email: 'intrusion@gamazon.test' },
    { type: 'invite.revoke', id: crypto.randomUUID() },
    { type: 'moderate', report_id: crypto.randomUUID(), action: 'dismiss', note: 'Intrusion' },
  ]) {
    const response = await page.request.post('/api/v1/command', {
      headers: { origin: 'http://127.0.0.1:3000' },
      data: command,
    });
    expect(response.status()).toBe(403);
  }
  const state = await (await page.request.get('/api/v1/state')).json();
  expect(state.invites).toHaveLength(0);
  expect(state.moderation).toHaveLength(0);
  expect(state.memberships).toEqual([expect.objectContaining({ id: ids.rohan, role: 'member' })]);
});
