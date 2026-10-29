import { test, expect } from '@playwright/test';

for (let visitor = 1; visitor <= 100; visitor++) {
  test(`independent browser journey ${visitor}`, async ({ page }) => {
    const mobile = visitor % 2 === 0;
    await page.setViewportSize({ width: mobile ? 390 : 1440, height: mobile ? 844 : 1000 });
    await page.goto('/community');
    await expect(page.locator('.gz-post').first()).toBeVisible();
    await page
      .getByRole('group', { name: 'Find a game' })
      .getByRole('button', { name: 'Buy', exact: true })
      .click();
    await expect(page.locator('.gz-post').first()).toBeVisible();
    await page.locator('.gz-post h2 button').first().click();
    await expect(page.locator('article.gz-thread')).toBeVisible();
    await expect(page.locator('.gz-specs')).toBeVisible();
    await page.getByRole('button', { name: 'Back to feed', exact: true }).click();
    await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-community-theme', 'light');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
