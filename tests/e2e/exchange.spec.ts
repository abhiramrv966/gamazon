import { test, expect } from '@playwright/test';
import { ids } from '../../src/lib/seed';

test('a short listing can be published, edited and closed without creating a duplicate', async ({
  page,
}) => {
  await page.goto('/community');
  await page.locator('.gz-header').getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.gz-header').getByRole('button', { name: 'Create', exact: true }).click();
  const title = `Returnal ${Date.now()}`;
  await page.getByLabel('Game title', { exact: true }).fill(title);
  await expect(page.getByLabel('Console model')).toHaveValue('PS5');
  await page.getByRole('checkbox', { name: 'Sell', exact: true }).check();
  await page.getByLabel('Asking price (optional)').fill('1500');
  let interrupted = false;
  await page.route('**/api/v1/command', async (route) => {
    if (!interrupted && route.request().postDataJSON().type === 'post.create') {
      interrupted = true;
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(page.locator('.gz-post-form > .gz-error')).toContainText(
    'Couldn’t confirm publication',
  );
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your post is live', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View your post', exact: true }).click();
  const state = await (await page.request.get('/api/v1/state')).json();
  const post = state.posts.find((p: { title: string }) => p.title === title);
  expect(post.exchange_modes).toEqual(['sale']);
  await page.getByRole('button', { name: 'Edit listing', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: title, exact: true }).click();
  await page.getByRole('button', { name: 'Edit listing', exact: true }).click();
  await page.getByLabel('Game title', { exact: true }).fill(title + ' with case');
  await page.getByRole('checkbox', { name: 'Sell', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'Lend', exact: true }).check();
  await expect(page.getByLabel('Asking price (optional)')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Changes saved' })).toBeVisible();
  await page.getByRole('button', { name: 'View your post', exact: true }).click();
  const updated = await (await page.request.get('/api/v1/state')).json();
  expect(updated.posts.filter((p: { id: string }) => p.id === post.id)).toHaveLength(1);
  expect(updated.posts.find((p: { id: string }) => p.id === post.id).price).toBeNull();
  await page.locator('.gz-thread-actions summary').filter({ hasText: 'Status' }).click();
  await page
    .locator('.gz-thread-actions .gz-menu-options')
    .getByRole('button', { name: 'Closed', exact: true })
    .click();
  await expect(page.locator('.gz-locked')).toBeVisible();
});

test('a buyer sends one request, the owner accepts, and another game keeps its context', async ({
  page,
  browser,
  request,
}) => {
  const title = `Spider-Man exchange ${Date.now()}`;
  const listing = {
    title,
    platform: 'PlayStation',
    generation: 'PS5',
    format: 'Disc',
    kind: 'offer',
    exchange_modes: ['sale'],
    condition: 'Good',
    area: 'HSR Layout',
    description: '',
    price: 1500,
    drive_required: true,
    download_required: false,
    code_required: false,
  };
  const headers = { origin: 'http://127.0.0.1:3000', cookie: `gamazon-demo-user=${ids.neha}` };
  const response = await request.post('/api/v1/command', {
    headers,
    data: { type: 'post.create', ...listing },
  });
  expect(response.ok()).toBe(true);
  const firstListing = await response.json();
  await page.goto('/community');
  await page
    .getByRole('group', { name: 'Find a game' })
    .getByRole('button', { name: 'Buy', exact: true })
    .click();
  await page.getByRole('button', { name: title, exact: true }).click();
  await page
    .locator('.gz-thread-actions')
    .getByRole('button', { name: 'Ask to buy', exact: true })
    .click();
  await expect(page.getByLabel('Your message')).toHaveValue(new RegExp(`buying ${title}`));
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.locator('.gz-message-request')).toContainText('accept');
  const owner = await browser.newContext({
    baseURL: 'http://127.0.0.1:3000',
    viewport: { width: 390, height: 844 },
  });
  try {
    await owner.addCookies([
      { name: 'gamazon-demo-user', value: ids.neha, url: 'http://127.0.0.1:3000' },
    ]);
    const inbox = await owner.newPage();
    await inbox.goto('/community');
    await inbox
      .locator('.gz-mobile-bottom')
      .getByRole('button', { name: /^Messages/ })
      .click();
    await inbox.locator('.gz-conversation-preview').filter({ hasText: title }).click();
    await inbox
      .locator('.gz-message-request')
      .getByRole('button', { name: /^Accept/ })
      .click();
    await expect(inbox.getByLabel('Message', { exact: true })).toBeVisible();
    const second = title + ' second copy';
    await request.post('/api/v1/command', {
      headers,
      data: { type: 'post.create', ...listing, title: second },
    });
    await page.goto('/community');
    await page.getByRole('button', { name: second, exact: true }).click();
    await page
      .locator('.gz-thread-actions')
      .getByRole('button', { name: 'Ask to buy', exact: true })
      .click();
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.locator('.gz-message-history')).toContainText(second);
    const current = await (await page.request.get('/api/v1/state')).json();
    expect(
      current.conversations.filter((c: { from_id: string; to_id: string }) =>
        [c.from_id, c.to_id].includes(ids.neha),
      ),
    ).toHaveLength(1);
    await request.post('/api/v1/command', {
      headers,
      data: { type: 'post.status', id: firstListing.id, status: 'paused' },
    });
    await page.goto('/community');
    const statusMenu = page.locator('.gz-feed-options details').filter({ hasText: 'Status' });
    await statusMenu.locator('summary').click();
    await statusMenu.getByRole('button', { name: 'Paused', exact: true }).click();
    await page.getByRole('button', { name: title, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Listing paused', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Ask to buy', exact: true })).toHaveCount(0);
    const denied = await request.post('/api/v1/command', {
      headers: { ...headers, cookie: 'gamazon-demo-user=' + ids.rohan },
      data: {
        type: 'conversation.start',
        user_id: ids.neha,
        post_id: firstListing.id,
        body: 'Is this available?',
        message_id: crypto.randomUUID(),
      },
    });
    expect(denied.ok()).toBe(false);
  } finally {
    await owner.close();
  }
});
