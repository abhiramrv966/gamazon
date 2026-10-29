import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`official artwork fills game slots at ${width}px without replacing copy photos`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
    await page.goto('/community');
    const noOverflow = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    const navigate = async (name: string) => {
      if (width < 761)
        await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await page.locator('.gz-nav').getByRole('button', { name, exact: true }).click();
    };
    await expect(page.locator('.gz-post-title img')).toHaveCount(6);
    await expect
      .poll(async () =>
        page
          .locator('.gz-post-title img')
          .evaluateAll((imgs: HTMLImageElement[]) =>
            imgs.every((img) => img.complete && img.naturalWidth > 0),
          ),
      )
      .toBe(true);
    await expect(page.locator('.gz-post-media')).toHaveCount(0);
    await noOverflow();
    await page.screenshot({ path: `artifacts/artwork-${width}-feed.png` });
    if (width > 760) {
      await page.locator('.gz-nav').getByRole('button', { name: 'Xbox', exact: true }).click();
      await expect(page.locator('.gz-board-banner img')).toHaveAttribute(
        'src',
        '/images/catalog/forza-banner.webp',
      );
      await expect(page.locator('.gz-post-title img')).toHaveCount(1);
      await page
        .locator('.gz-nav')
        .getByRole('button', { name: 'All platforms', exact: true })
        .click();
    }
    await page.locator('.gz-post h2 button').first().click();
    await expect(page.getByText('No photo of this copy', { exact: true })).toBeVisible();
    await expect(page.getByText('Game artwork', { exact: true })).toBeVisible();
    await expect(page.locator('.gz-no-photo img')).toHaveAttribute('alt', /promotional artwork/);
    await expect(page.locator('.gz-thread-media')).toHaveCount(0);
    await noOverflow();
    await page.screenshot({ path: `artifacts/artwork-${width}-thread.png` });
    await page.getByRole('button', { name: 'Back to feed', exact: true }).click();
    await navigate('My games');
    await expect(page.locator('.gz-shelf-row .gz-game-thumbnail img')).toHaveCount(1);
    await noOverflow();
    await page.screenshot({ path: `artifacts/artwork-${width}-shelf.png` });
    await navigate('Messages');
    await page.locator('.gz-conversation-preview').filter({ hasText: 'Asha Rao' }).click();
    const thumbnail = page.locator('.gz-chat-listing .gz-game-thumbnail');
    await expect(thumbnail).toBeVisible();
    expect((await thumbnail.boundingBox())!.width).toBe(72);
    await noOverflow();
    await page.screenshot({ path: `artifacts/artwork-${width}-messages.png` });
    await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
    await noOverflow();
    await page.screenshot({ path: `artifacts/artwork-${width}-light.png` });
  });
}
