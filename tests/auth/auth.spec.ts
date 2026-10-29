import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

async function member(
  request: import('@playwright/test').APIRequestContext,
  status = 'active',
  role = 'member',
) {
  const email = `${randomUUID()}@gamazon.test`;
  const response = await request.post('http://127.0.0.1:54329/__test__/member', {
    data: { email, status, role },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as { email: string; invite: string };
}
async function requestCode(page: import('@playwright/test').Page, email: string) {
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Send sign-in code', exact: true }).click();
  await expect(page.getByLabel('Email verification code')).toBeVisible();
}
async function verify(page: import('@playwright/test').Page) {
  await page.getByLabel('Email verification code').fill('654321');
  await page.getByRole('button', { name: 'Verify email', exact: true }).click();
}
test('sign in, invalid code, resend cooldown, session restoration and sign out', async ({
  page,
  request,
}) => {
  const user = await member(request);
  await page.clock.install();
  await page.goto('/signin');
  await requestCode(page, user.email);
  await expect(page.getByRole('button', { name: /Send another code in/ })).toBeDisabled();
  await page.getByLabel('Email verification code').fill('000000');
  await page.getByRole('button', { name: 'Verify email', exact: true }).click();
  await expect(page.locator('.auth-error')).toContainText('invalid');
  await page.clock.fastForward(61000);
  await page.getByRole('button', { name: 'Send another code', exact: true }).click();
  await verify(page);
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.locator('.gz-post').first()).toBeVisible();
  await page.reload();
  await expect(page.locator('.gz-post').first()).toBeVisible();
  await page.getByLabel('Account menu').click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByLabel('Email address')).toBeVisible();
  expect((await page.request.get('/api/v1/state')).status()).toBe(401);
});
test('invited sign-up verifies email, preserves invalid-invite details and redeems once', async ({
  page,
  request,
}) => {
  const user = await member(request, 'none');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/signup');
  await page.getByLabel('Invitation code').fill(user.invite);
  await requestCode(page, user.email);
  await verify(page);
  await expect(page.getByLabel('Display name')).toBeVisible();
  await expect(page.getByLabel('Invitation code')).toHaveValue(user.invite);
  await page.getByLabel('Display name').fill('Sam Plays');
  await page.getByLabel('Neighbourhood', { exact: true }).fill('Test neighbourhood');
  await page.getByLabel('I am 18 or older.').check();
  await page.getByRole('checkbox', { name: /I agree/ }).check();
  await page.getByLabel('Invitation code').fill('expired-invite');
  await page.getByRole('button', { name: 'Join community', exact: true }).click();
  await expect(page.locator('.auth-error')).toContainText('invitation');
  await expect(page.getByLabel('Display name')).toHaveValue('Sam Plays');
  await page.getByLabel('Invitation code').fill(user.invite);
  await page.getByRole('button', { name: 'Join community', exact: true }).click();
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.locator('.gz-post').first()).toBeVisible();
  const reuse = await page.request.post('/api/v1/join', {
    headers: { origin: 'http://127.0.0.1:3001' },
    data: { token: user.invite, name: 'Duplicate', area: 'Test area', adult: true, rules: true },
  });
  expect(reuse.ok()).toBe(false);
  const state = await (await page.request.get('/api/v1/state')).json();
  expect(state.profiles.find((profile: { id: string }) => profile.id === state.me).name).toBe(
    'Sam Plays',
  );
  await page.screenshot({ path: 'artifacts/auth-signup-390.png' });
});
test('a verified non-member can resume joining after a page reload', async ({ page, request }) => {
  const user = await member(request, 'none');
  await page.goto('/signup');
  await page.getByLabel('Invitation code').fill(user.invite);
  await requestCode(page, user.email);
  await verify(page);
  await expect(page.getByLabel('Display name')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Display name')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Accept your invitation.' })).toBeVisible();
  await page.getByRole('button', { name: 'Use another email', exact: true }).click();
  await expect(page.getByLabel('Email address')).toBeVisible();
});
test('suspended and unauthenticated sessions cannot enter community data', async ({
  page,
  request,
}) => {
  expect((await page.request.get('/api/v1/state')).status()).toBe(401);
  expect((await page.request.get('/api/v1/posts')).status()).toBe(401);
  const user = await member(request, 'suspended');
  await page.goto('/signin');
  await requestCode(page, user.email);
  await verify(page);
  await expect(page.getByRole('link', { name: 'Check access', exact: true })).toBeVisible();
  await expect(page.locator('.gz-post')).toHaveCount(0);
  await page.getByRole('link', { name: 'Check access', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Community access paused.' })).toBeVisible();
  await expect(page.getByLabel('Invitation code')).toHaveCount(0);
});
test('email-delivery failure stays on the form and can be retried', async ({ page, request }) => {
  const user = await member(request);
  await page.route(
    '**/auth/v1/otp',
    async (route) => {
      await route.fulfill({ status: 400, json: { msg: 'Email is temporarily unavailable.' } });
    },
    { times: 1 },
  );
  await page.goto('/signin');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByRole('button', { name: 'Send sign-in code' }).click();
  await expect(page.locator('.auth-error')).toContainText('temporarily unavailable');
  await expect(page.getByLabel('Email address')).toHaveValue(user.email);
  await page.getByRole('button', { name: 'Send sign-in code' }).click();
  await expect(page.getByLabel('Email verification code')).toBeVisible();
});

test('the admin route checks verified identity and membership on the server', async ({
  page,
  request,
}) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.locator('.gz-admin')).toHaveCount(0);
  const user = await member(request);
  await page.goto('/signin');
  await requestCode(page, user.email);
  await verify(page);
  await expect(page).toHaveURL(/\/community$/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.locator('.gz-post').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Admin', exact: true })).toHaveCount(0);
});

test('the owner can enter admin but a suspended owner cannot', async ({ page, request }) => {
  const owner = await member(request, 'active', 'admin');
  await page.goto('/signin');
  await requestCode(page, owner.email);
  await verify(page);
  await expect(page).toHaveURL(/\/community$/);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByLabel('Account menu').click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  const suspended = await member(request, 'suspended', 'admin');
  await expect(page.getByLabel('Email address')).toBeVisible();
  await requestCode(page, suspended.email);
  await verify(page);
  await expect(page).toHaveURL(/\/community$/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.locator('.gz-admin')).toHaveCount(0);
});
