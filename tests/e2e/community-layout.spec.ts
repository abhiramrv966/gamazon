import { test, expect } from '@playwright/test';

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
  { width: 320, height: 640 },
]) {
  test(`redesigned community screens and panels at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/community');
    const mobile = viewport.width < 761;
    const prefix = String(viewport.width);
    async function navigate(name: string) {
      if (mobile) {
        if (!(await page.getByRole('button', { name: 'Open navigation', exact: true }).isVisible()))
          await page.getByRole('button', { name: 'Back to feed', exact: true }).click();
        await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      } else if (!(await page.locator('.gz-nav').isVisible()))
        await page.getByRole('link', { name: 'Gamazon home' }).click();
      await page.locator('.gz-nav').getByRole('button', { name, exact: true }).click();
    }
    async function capture(name: string) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `artifacts/redesign-${prefix}-${name}.png`,
        animations: 'disabled',
      });
    }
    await expect(page.locator('.gz-post').first()).toBeVisible();
    await capture('feed');
    if (mobile) {
      await page.getByRole('button', { name: 'Search game titles', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('dialog').getByRole('button', { name: /^Show/ }).click({ trial: true });
      await capture('filters');
      await page.keyboard.press('Escape');
    }
    await page.locator('.gz-post h2 button').first().click();
    await expect(page.locator('article.gz-thread')).toBeVisible();
    await capture('thread');
    if (mobile) {
      await page
        .locator('.gz-phone-thread-heading')
        .getByRole('button', { name: 'Report', exact: true })
        .click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Send report', exact: true })
        .click({ trial: true });
      await capture('report');
      await page.keyboard.press('Escape');
    }
    await page
      .locator('.gz-discussion')
      .getByRole('button', { name: 'Add a comment', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await capture('comment');
    await page.keyboard.press('Escape');
    await page
      .locator('.gz-comment-actions')
      .getByRole('button', { name: 'Edit', exact: true })
      .first()
      .click();
    await expect(page.getByRole('dialog', { name: 'Edit comment' })).toBeVisible();
    await capture('edit-comment');
    await page.keyboard.press('Escape');
    await navigate('Members');
    await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible();
    await capture('members');
    await navigate('My games');
    await expect(page.locator('.gz-profile-heading')).toBeVisible();
    for (const select of await page.locator('.gz-shelf-form select').all()) {
      expect(
        await select.evaluate((element: HTMLSelectElement) => {
          const style = getComputedStyle(element);
          const canvas = document.createElement('canvas').getContext('2d')!;
          canvas.font = `${style.fontSize} ${style.fontFamily}`;
          const text = canvas.measureText(element.selectedOptions[0].text).width;
          return (
            element.clientWidth >=
            text + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 16
          );
        }),
      ).toBe(true);
    }
    await capture('profile');
    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await capture('edit-profile');
    await page.keyboard.press('Escape');
    await navigate('Messages');
    await page.locator('.gz-conversation-preview').filter({ hasText: 'Asha Rao' }).click();
    await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toBeVisible();
    expect((await page.locator('.gz-messenger').boundingBox())!.x).toBe(0);
    if (mobile) {
      const composer = (await page.locator('.gz-compose').boundingBox())!;
      const navigation = (await page.locator('.gz-mobile-bottom').boundingBox())!;
      expect(composer.y + composer.height).toBeLessThanOrEqual(navigation.y);
    }
    await capture('messages');
    await page.locator('.gz-message-report').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await capture('message-report');
    await page.keyboard.press('Escape');
    await page
      .locator('.gz-header')
      .getByRole('button', { name: /^Notifications/ })
      .click();
    await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();
    await capture('notifications');
    await navigate('Settings');
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    const tabTops = await page
      .locator('.gz-settings .gz-line-tabs button')
      .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().top));
    expect(new Set(tabTops).size).toBe(1);
    await capture('settings');
    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await capture('settings-profile');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Privacy and safety', exact: true }).click();
    await capture('privacy');
    await navigate('Admin');
    await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
    await expect(page.getByText(/Exchanges are private self-reports/)).toBeVisible();
    await capture('admin');
    await page
      .locator('.gz-admin-nav')
      .getByRole('button', { name: 'Invitations', exact: true })
      .click();
    await capture('invitations');
    if (mobile)
      await page
        .locator('.gz-mobile-bottom')
        .getByRole('button', { name: 'Create a post', exact: true })
        .click();
    else {
      await navigate('Feed');
      await page.locator('.gz-header').getByRole('button', { name: 'Create', exact: true }).click();
    }
    await expect(page.getByRole('heading', { name: 'Create a post', exact: true })).toBeVisible();
    expect(
      await page
        .locator('.gz-platform-choices label')
        .evaluateAll((labels) => labels.every((label) => label.scrollWidth <= label.clientWidth)),
    ).toBe(true);
    await capture('submit');
  });

  test(`public page layouts at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const route of ['/', '/signin', '/signup', '/guidelines']) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `artifacts/public-${viewport.width}-${route.slice(1) || 'landing'}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }
  });
}
