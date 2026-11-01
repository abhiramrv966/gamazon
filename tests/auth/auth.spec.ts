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
  return (await response.json()) as { email: string };
}
const password = 'Fixture-only_password-123';
async function signIn(page: import('@playwright/test').Page, email: string, value = password) {
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function createAccount(
  page: import('@playwright/test').Page,
  email: string,
  value = password,
) {
  await page.goto('/signup');
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeEnabled();
  await page.screenshot({ path: `artifacts/password-signup-${page.viewportSize()?.width}.png` });
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Email verification code' })).toBeVisible();
}
async function verify(page: import('@playwright/test').Page) {
  await page.getByLabel('Digit 1 of 8', { exact: true }).fill('65432109');
  await page.getByRole('button', { name: 'Verify email', exact: true }).click();
}
test('password sign-in rejects bad credentials, restores sessions and signs out', async ({
  page,
  request,
}) => {
  const user = await member(request);
  await page.goto('/signin');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  await page.screenshot({ path: 'artifacts/password-signin-desktop.png' });
  await signIn(page, user.email, 'Incorrect-password-123');
  await expect(page.locator('.auth-error')).toContainText('Invalid');
  await signIn(page, user.email);
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.locator('.gz-post').first()).toBeVisible();
  await page.reload();
  await expect(page.locator('.gz-post').first()).toBeVisible();
  await page.getByLabel('Account menu').click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/signin$/);
  expect((await page.request.get('/api/v1/state')).status()).toBe(401);
});

test('public sign-up verifies email and joins without an invitation', async ({ page, request }) => {
  const user = await member(request, 'none');
  await page.setViewportSize({ width: 390, height: 844 });
  await createAccount(page, user.email);
  await expect(page.getByText(/If .* needs verification/)).toBeVisible();
  await expect(page.getByLabel('Invitation code')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Send another code in/ })).toBeDisabled();
  await page.getByLabel('Digit 1 of 8', { exact: true }).fill('00000000');
  await page.getByRole('button', { name: 'Verify email', exact: true }).click();
  await expect(page.locator('.auth-error')).toContainText('invalid');
  await verify(page);
  await expect(page.getByLabel('Display name')).toBeVisible();
  await page.getByLabel('Display name').fill('Sam Plays');
  await page.getByLabel('Neighbourhood', { exact: true }).fill('Test neighbourhood');
  await page.getByLabel('I am 18 or older.').check();
  await page.getByRole('checkbox', { name: /I agree/ }).check();
  await page.getByRole('button', { name: 'Join Gamazon', exact: true }).click();
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.locator('.gz-post').first()).toBeVisible();
  const retry = await page.request.post('/api/v1/join', {
    headers: { origin: 'http://127.0.0.1:3001' },
    data: { name: 'Duplicate', area: 'Test area', adult: true, rules: true, role: 'admin' },
  });
  expect(retry.ok()).toBe(true);
  const state = await (await page.request.get('/api/v1/state')).json();
  expect(state.profiles.find((profile: { id: string }) => profile.id === state.me).name).toBe(
    'Sam Plays',
  );
  expect(state.memberships.find((m: { id: string }) => m.id === state.me).role).toBe('member');
  await page.screenshot({ path: 'artifacts/auth-signup-390.png' });
});

test('a verified non-member can resume profile setup after reload', async ({ page, request }) => {
  const user = await member(request, 'none');
  await createAccount(page, user.email);
  await verify(page);
  await expect(page.getByLabel('Display name')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Display name')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Make it yours.' })).toBeVisible();
  await page.getByRole('button', { name: 'Use another email', exact: true }).click();
  await expect(page.getByLabel('Email address')).toBeVisible();
});

test('code boxes support typing, editing, paste and incomplete-code validation on phones', async ({
  page,
  request,
  context,
}) => {
  const user = await member(request, 'none');
  await page.setViewportSize({ width: 320, height: 780 });
  await createAccount(page, user.email);
  const digits = page.getByRole('group', { name: 'Email verification code' }).getByRole('textbox');
  await expect(digits).toHaveCount(8);
  await expect(digits.nth(0)).toBeFocused();
  await page.keyboard.type('65');
  await expect(digits.nth(0)).toHaveValue('6');
  await expect(digits.nth(1)).toHaveValue('5');
  await expect(digits.nth(2)).toBeFocused();
  await page.keyboard.press('Backspace');
  await expect(digits.nth(1)).toHaveValue('');
  await expect(digits.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(digits.nth(0)).toBeFocused();
  await page.keyboard.type('9');
  await expect(digits.nth(0)).toHaveValue('9');
  await page.keyboard.press('ArrowRight');
  await expect(digits.nth(2)).toBeFocused();
  await page.keyboard.type('x');
  await expect(digits.nth(2)).toHaveValue('');
  let verificationRequests = 0;
  await page.route('**/auth/v1/verify', async (route) => {
    verificationRequests++;
    await route.continue();
  });
  await page.getByRole('button', { name: 'Verify email', exact: true }).click();
  await expect(digits.nth(1)).toBeFocused();
  expect(verificationRequests).toBe(0);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => navigator.clipboard.writeText('65 43-21 09'));
  await digits.nth(3).focus();
  await page.keyboard.press('Control+V');
  for (const [index, digit] of [...'65432109'].entries())
    await expect(digits.nth(index)).toHaveValue(digit);
  await expect(digits.nth(7)).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/auth-code-boxes-320.png' });
  await page.getByRole('button', { name: 'Verify email', exact: true }).click();
  await expect(page.getByLabel('Display name')).toBeVisible();
  expect(verificationRequests).toBe(1);
});

test('repeat signup offers recovery without claiming a code was sent or changing the account', async ({
  page,
  request,
}) => {
  const user = await member(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await createAccount(page, user.email, 'Must-not-replace-password-123');
  await expect(page.getByText(/If .* needs verification/)).toBeVisible();
  await expect(page.getByText(/code sent to/)).toHaveCount(0);
  expect((await page.request.get('/api/v1/session')).status()).toBe(401);
  const unchanged = await request.post('http://127.0.0.1:54329/auth/v1/token?grant_type=password', {
    data: { email: user.email, password },
  });
  expect(unchanged.ok()).toBe(true);
  await page.screenshot({ path: 'artifacts/repeat-signup-390.png' });
  await page.getByRole('link', { name: 'Set or reset your password' }).click();
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel('Email address', { exact: true }).fill(user.email);
  await page.getByRole('button', { name: 'Send reset code' }).click();
  await verify(page);
  await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
  await page.goto('/signin');
  await expect(page).toHaveURL(/\/community$/);
});

test('password recovery replaces the old password and requires an email code', async ({
  page,
  request,
}) => {
  const user = await member(request);
  await page.goto('/signin');
  await page.getByRole('link', { name: 'Forgot your password?' }).click();
  await expect(
    page.getByRole('heading', { name: 'Reset your password.', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Email address', { exact: true }).fill(user.email);
  await page.getByRole('button', { name: 'Send reset code' }).click();
  await verify(page);
  await page.getByLabel('New password', { exact: true }).fill('A-new-fixture-password-456');
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page.getByRole('heading', { name: 'Password updated.' })).toBeVisible();
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await signIn(page, user.email);
  await expect(page.locator('.auth-error')).toContainText('Invalid');
  await signIn(page, user.email, 'A-new-fixture-password-456');
  await expect(page).toHaveURL(/\/community$/);
  const replay = await request.post('http://127.0.0.1:54329/auth/v1/verify', {
    data: { email: user.email, token: '65432109', type: 'recovery' },
  });
  expect(replay.ok()).toBe(false);
});

test('suspended and unauthenticated sessions cannot enter community data', async ({
  page,
  request,
}) => {
  expect((await page.request.get('/api/v1/state')).status()).toBe(401);
  expect((await page.request.get('/api/v1/posts')).status()).toBe(401);
  const user = await member(request, 'suspended');
  await page.goto('/signin');
  await signIn(page, user.email);
  await expect(page.getByRole('heading', { name: 'Community access paused.' })).toBeVisible();
  await expect(page.getByLabel('Invitation code')).toHaveCount(0);
  expect((await page.request.get('/api/v1/state')).ok()).toBe(false);
});

test('email-delivery failure stays on signup and can be retried', async ({ page, request }) => {
  const user = await member(request, 'none');
  await page.route(
    '**/auth/v1/signup',
    async (route) => {
      await route.fulfill({ status: 400, json: { msg: 'Email is temporarily unavailable.' } });
    },
    { times: 1 },
  );
  await page.goto('/signup');
  await page.getByLabel('Email address', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.locator('.auth-error')).toContainText('temporarily unavailable');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Email verification code' })).toBeVisible();
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
  await signIn(page, user.email);
  await expect(page).toHaveURL(/\/community$/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.locator('.gz-post').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Admin', exact: true })).toHaveCount(0);
});

test('the owner can enter admin but a suspended owner cannot', async ({ page, request }) => {
  const owner = await member(request, 'active', 'admin');
  await page.goto('/signin');
  await signIn(page, owner.email);
  await expect(page).toHaveURL(/\/community$/);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByLabel('Account menu').click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  const suspended = await member(request, 'suspended', 'admin');
  await expect(page.getByLabel('Email address')).toBeVisible();
  await signIn(page, suspended.email);
  await expect(page.getByRole('heading', { name: 'Community access paused.' })).toBeVisible();
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.locator('.gz-admin')).toHaveCount(0);
});
