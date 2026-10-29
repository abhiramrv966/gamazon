import { test, expect } from '@playwright/test';
import { ids } from '../../src/lib/seed';

test('connection, blocking and non-admin deletion controls complete their actual actions', async ({
  page,
}) => {
  await page.goto('/community');
  await page.locator('.gz-nav').getByRole('button', { name: 'Members', exact: true }).click();
  const rohan = page.locator('.gz-member').filter({ hasText: 'Rohan Mehta' });
  await rohan.getByRole('button', { name: 'Accept', exact: true }).click();
  await rohan.getByRole('button', { name: 'Remove connection', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Remove connection', exact: true })
    .click();
  await rohan.getByRole('button', { name: 'Connect', exact: true }).click();
  await rohan.getByRole('button', { name: 'Cancel request', exact: true }).click();
  await expect(rohan.getByRole('button', { name: 'Connect', exact: true })).toBeVisible();
  await rohan.locator('.gz-person-row').click();
  await page.getByRole('button', { name: 'Block Rohan', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Block member', exact: true }).click();
  await expect(page.locator('.gz-post').filter({ hasText: 'Forza Horizon' })).toHaveCount(0);
  await page.locator('.gz-nav').getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Privacy and safety', exact: true }).click();
  await page.getByRole('button', { name: 'Unblock', exact: true }).click();
  const state = await (await page.request.get('/api/v1/state')).json();
  expect(state.blocks).toHaveLength(0);
  expect(state.can_delete_account).toBe(false);
  await page.request.post('/api/v1/demo', {
    headers: { origin: 'http://127.0.0.1:3000' },
    data: { user_id: ids.asha },
  });
  await page.goto('/community');
  await page.locator('.gz-nav').getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Delete account', exact: true }).click();
  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await page.getByRole('button', { name: 'Delete my account', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3000/');
  expect((await page.request.get('/api/v1/state')).status()).toBe(403);
});
