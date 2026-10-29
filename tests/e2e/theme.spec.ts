import { test, expect } from '@playwright/test';

for (const width of [1440, 390, 320]) {
  test(`light and dark themes persist and cover screens at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
    await page.goto('/community');
    const root = page.locator('html');
    const toggle = (mode: string) =>
      page.getByRole('button', { name: `Switch to ${mode} mode`, exact: true });
    const noOverflow = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    const navigate = async (name: string) => {
      if (width < 761)
        await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      else if (!(await page.locator('.gz-nav').isVisible()))
        await page.getByRole('link', { name: 'Gamazon home' }).click();
      await page.locator('.gz-nav').getByRole('button', { name, exact: true }).click();
    };
    await expect(page.locator('.gz-post').first()).toBeVisible();
    await expect(root).toHaveAttribute('data-community-theme', 'dark');
    await toggle('light').click();
    await expect(root).toHaveAttribute('data-community-theme', 'light');
    await expect(page.locator('.community-ui').first()).toHaveCSS(
      'background-color',
      'rgb(247, 244, 238)',
    );
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 244, 238)');
    await noOverflow();
    await page.screenshot({ path: `artifacts/theme-light-${width}-feed.png` });
    await page.reload();
    await expect(toggle('dark')).toBeVisible();
    await expect(root).toHaveAttribute('data-community-theme', 'light');
    if (width < 761) {
      await page.getByRole('button', { name: 'Search game titles', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(238, 234, 226)');
      await page.screenshot({ path: `artifacts/theme-light-${width}-sheet.png` });
      await page.keyboard.press('Escape');
    } else {
      await page.getByLabel('Account menu', { exact: true }).click();
      await expect(page.locator('.gz-account .gz-menu-options')).toHaveCSS(
        'background-color',
        'rgb(238, 234, 226)',
      );
      await page.keyboard.press('Escape');
    }
    await page.locator('.gz-post h2 button').first().click();
    await expect(page.locator('.gz-specs')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await noOverflow();
    await page.screenshot({ path: `artifacts/theme-light-${width}-thread.png` });
    await page.getByRole('button', { name: 'Back to feed', exact: true }).click();
    for (const name of ['My games', 'Messages', 'Settings', 'Admin']) {
      await navigate(name);
      await noOverflow();
      await page.screenshot({
        path: `artifacts/theme-light-${width}-${name.toLowerCase().replaceAll(' ', '-')}.png`,
      });
    }
    await navigate('Feed');
    await page
      .locator('.gz-header')
      .getByRole('button', { name: /^Notifications/ })
      .click();
    await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();
    await noOverflow();
    if (width < 761)
      await page
        .locator('.gz-mobile-bottom')
        .getByRole('button', { name: 'Create a post', exact: true })
        .click();
    else {
      await navigate('Feed');
      await page.locator('.gz-header').getByRole('button', { name: 'Create', exact: true }).click();
    }
    await expect(page.getByLabel('Game title', { exact: true })).toHaveCSS(
      'background-color',
      'rgb(242, 239, 232)',
    );
    await noOverflow();
    await page.screenshot({ path: `artifacts/theme-light-${width}-submit.png` });
    await navigate('Settings');
    const options = page.getByRole('group', { name: 'Colour theme', exact: true });
    await expect(options.getByRole('button', { name: 'Light', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await options.getByRole('button', { name: 'Dark', exact: true }).click();
    await expect(root).toHaveAttribute('data-community-theme', 'dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 14, 12)');
    await page.reload();
    await expect(toggle('light')).toBeVisible();
    await expect(root).toHaveAttribute('data-community-theme', 'dark');
  });
}

test('theme switching works when browser storage is disabled', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('Storage disabled');
    };
    Storage.prototype.setItem = () => {
      throw new Error('Storage disabled');
    };
  });
  await page.goto('/community');
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-community-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-community-theme', 'dark');
});
