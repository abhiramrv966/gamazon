import { test, expect } from '@playwright/test';
import sharp from 'sharp';

test('discover, discuss, publish, and close a physical-game post', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/community');
  await expect(page.getByRole('heading', { name: 'All platforms', exact: true })).toBeVisible();
  await page.locator('.gz-nav').getByRole('button', { name: 'Xbox', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Forza Horizon 5' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Legend of Zelda', exact: true })).toHaveCount(
    0,
  );
  await page.locator('.gz-nav').getByRole('button', { name: 'All platforms', exact: true }).click();
  await page.locator('.gz-post h2 button').filter({ hasText: 'The Legend of Zelda' }).click();
  await expect(page.locator('dialog')).toHaveCount(0);
  await page
    .locator('.gz-discussion')
    .getByRole('button', { name: 'Add a comment', exact: true })
    .click();
  const comment = 'Weekend handover ' + Date.now();
  await page.getByRole('textbox', { name: 'Add a comment', exact: true }).fill(comment);
  await page.getByRole('dialog').getByRole('button', { name: 'Comment', exact: true }).click();
  await expect(page.locator('.gz-comment-body').getByText(comment, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to feed', exact: true }).click();
  await page.locator('.gz-header').getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(page.getByText('Add the game’s title.')).toBeVisible();
  const title = 'Returnal pilot test ' + Date.now();
  await page.getByLabel('Game title', { exact: true }).fill(title);
  await page.getByRole('checkbox', { name: 'Sell', exact: true }).check();
  await page.getByText('Edition, downloads and codes', { exact: true }).click();
  await page.getByLabel('Console model').fill('PS5');
  await page
    .getByLabel('Description')
    .fill('Original disc with case. Happy to arrange a local handover.');
  let creations = 0,
    uploads = 0;
  await page.route('**/api/v1/command', async (route) => {
    if (route.request().postDataJSON().type === 'post.create') creations++;
    await route.continue();
  });
  await page.route('**/api/v1/images', async (route) => {
    if (++uploads === 1)
      await route.fulfill({ status: 503, json: { error: 'Photo upload interrupted' } });
    else await route.continue();
  });
  const photo = await sharp({
    create: { width: 120, height: 160, channels: 3, background: '#463a29' },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel('Photo of your copy', { exact: true })
    .setInputFiles({ name: 'test-copy.png', mimeType: 'image/png', buffer: photo });
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your post is live, but the photo didn’t upload.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retry upload', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your post is live' })).toBeVisible();
  expect(creations).toBe(1);
  await page.getByRole('button', { name: 'View your post', exact: true }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.locator('.gz-thread-media img')).toBeVisible();
  await page
    .getByLabel('Add photos', { exact: true })
    .setInputFiles({ name: 'test-back.png', mimeType: 'image/png', buffer: photo });
  await expect(page.locator('.gz-photo-count')).toHaveText('1 of 2');
  await page.getByRole('button', { name: 'Next photo', exact: true }).click();
  await expect(page.locator('.gz-photo-count')).toHaveText('2 of 2');
  await expect(page.getByText('Disc drive required.', { exact: true })).toBeVisible();
  await page.locator('.gz-thread-actions summary').filter({ hasText: 'Status' }).click();
  await page
    .locator('.gz-thread-actions')
    .getByRole('button', { name: 'Closed', exact: true })
    .click();
  await expect(page.getByText('Comments are locked because this post is closed.')).toBeVisible();
});

test('profile edits persist and failed messages retry with the same identifier', async ({
  page,
}) => {
  await page.goto('/community');
  await page.locator('.gz-nav').getByRole('button', { name: 'My games', exact: true }).click();
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByLabel('Bio').fill('Switch first, PS5 when there’s time.');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Switch first, PS5 when there’s time.')).toBeVisible();
  await page
    .locator('.gz-nav')
    .getByRole('button', { name: /^Messages/ })
    .click();
  await page.locator('.gz-conversation-preview').filter({ hasText: 'Asha Rao' }).click();
  let attempts = 0;
  const ids: string[] = [];
  await page.route('**/api/v1/command', async (route) => {
    const command = route.request().postDataJSON();
    if (command.type !== 'message.send') return route.continue();
    ids.push(command.message_id);
    if (++attempts === 1)
      await route.fulfill({ status: 503, json: { error: 'Temporary delivery failure' } });
    else await route.continue();
  });
  const message = 'Thursday at 7 works. ' + Date.now();
  await page.getByLabel('Message', { exact: true }).fill(message);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue(message);
  await expect(page.getByRole('status')).toContainText('Not sent');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.locator('.gz-message-text').getByText(message, { exact: true })).toHaveCount(1);
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
});

test('phone shelf forms and contextual bottom sheets stay usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/community');
  await page
    .locator('.gz-mobile-bottom')
    .getByRole('button', { name: 'Create a post', exact: true })
    .click();
  await page.getByLabel('Game title', { exact: true }).fill('Unsaved draft');
  const cancel = page
    .locator('.gz-post-form-footer')
    .getByRole('button', { name: 'Cancel', exact: true });
  await cancel.click();
  await expect(page.getByRole('dialog', { name: 'Discard post' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(cancel).toBeFocused();
  await expect(page.getByLabel('Game title', { exact: true })).toHaveValue('Unsaved draft');
  await cancel.click();
  await page
    .getByRole('dialog', { name: 'Discard post' })
    .getByRole('button', { name: 'Discard', exact: true })
    .click();
  await page
    .locator('.gz-mobile-bottom')
    .getByRole('button', { name: 'My games', exact: true })
    .click();
  const title = 'Hollow Knight ' + Date.now();
  await page.getByLabel('Game title', { exact: true }).fill(title);
  await page.getByLabel('Platform', { exact: true }).selectOption('Nintendo');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  const remove = page
    .locator('.gz-shelf-row')
    .filter({ hasText: title })
    .getByRole('button', { name: 'Remove', exact: true });
  await remove.click();
  const panel = page.getByRole('dialog', { name: 'Remove game' });
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box!.y + box!.height).toBeGreaterThanOrEqual(842);
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(remove).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('reported items enter the admin queue and decisions keep their evidence', async ({ page }) => {
  await page.goto('/community');
  await page.locator('.gz-post h2 button').filter({ hasText: 'The Legend of Zelda' }).click();
  await page
    .locator('.gz-thread-actions')
    .getByRole('button', { name: 'Report', exact: true })
    .click();
  const reason = 'Design verification report ' + Date.now();
  await page.getByLabel('What happened?').fill(reason);
  await page.getByRole('button', { name: 'Send report', exact: true }).click();
  await page
    .locator('.gz-nav')
    .getByRole('button', { name: /^Admin/ })
    .click();
  await page.locator('.gz-report-queue').getByRole('button').filter({ hasText: reason }).click();
  await expect(page.locator('.gz-report-detail blockquote')).not.toBeEmpty();
  await page
    .getByLabel('Decision note')
    .fill('Test report. Dismissed without removing member content.');
  await page.getByRole('button', { name: 'Apply decision', exact: true }).click();
  await page.getByRole('button', { name: /^Resolved/ }).click();
  await page.locator('.gz-report-queue').getByRole('button').filter({ hasText: reason }).click();
  await expect(
    page.getByText('Test report. Dismissed without removing member content.'),
  ).toBeVisible();
});
