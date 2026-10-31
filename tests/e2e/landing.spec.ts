import { test, expect } from '@playwright/test';

test('gallery advances every four seconds, loops, and leaves the screenshot viewer steady', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-07T12:00:00Z') });
  await page.goto('/');
  await expect(page.locator('.scene-caption h2')).toHaveText('The Witcher 3');
  await page.clock.pauseAt(new Date('2026-10-07T12:00:10Z'));
  await page
    .getByRole('group', { name: 'Choose a game' })
    .getByRole('button', { name: 'Days Gone', exact: true })
    .click();
  await expect(page.locator('.scene-caption h2')).toHaveText('Days Gone');
  const scrollPosition = await page.evaluate(() => window.scrollY);
  await page.clock.runFor(3999);
  await expect(page.locator('.scene-caption h2')).toHaveText('Days Gone');
  await page.clock.runFor(1);
  await expect(page.locator('.scene-caption h2')).toHaveText('The Witcher 3');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollPosition);
  await page.clock.runFor(4000);
  await expect(page.locator('.scene-caption h2')).toHaveText('Red Dead Redemption 2');
  await page.getByRole('button', { name: 'View Red Dead Redemption 2 screenshot' }).click();
  await page.clock.runFor(8000);
  await expect(page.getByRole('dialog')).toHaveAttribute(
    'aria-label',
    'Red Dead Redemption 2 screenshot viewer',
  );
  await page.keyboard.press('Escape');
  await page.clock.runFor(4000);
  await expect(page.locator('.scene-caption h2')).toHaveText('The Last of Us');
});

test('landing gallery switches all six games and opens real screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Find games. Share yours.' })).toBeVisible();
  await expect(page.locator('.scene-image.is-active img')).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('.scene-image.is-active img')
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  await page.screenshot({ path: 'artifacts/landing-desktop.png', animations: 'disabled' });

  const titles = [
    'The Witcher 3',
    'Red Dead Redemption 2',
    'The Last of Us',
    'Grand Theft Auto V',
    'Grand Theft Auto VI',
    'Days Gone',
  ];
  for (const title of titles) {
    await page
      .getByRole('group', { name: 'Choose a game' })
      .getByRole('button', { name: title, exact: true })
      .click();
    await expect(page.locator('.scene-caption h2')).toHaveText(title);
    await expect
      .poll(() =>
        page
          .locator('.scene-image.is-active img')
          .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
      )
      .toBe(true);
  }
  await page.getByRole('button', { name: 'View Days Gone screenshot' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: 'Next screenshot' }).click();
  await expect(
    dialog.getByRole('img', { name: 'Official Days Gone screenshot 2' }),
  ).toHaveAttribute('src', '/images/games/days-gone-2.webp');
  await expect
    .poll(() =>
      dialog
        .getByRole('img', { name: 'Official Days Gone screenshot 2' })
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'View Days Gone screenshot' })).toBeFocused();
  await page
    .getByRole('group', { name: 'Choose a game' })
    .getByRole('button', { name: 'The Witcher 3', exact: true })
    .click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.scene-caption h2')).toHaveText('Red Dead Redemption 2');
  await expect(
    page
      .getByRole('group', { name: 'Choose a game' })
      .getByRole('button', { name: 'Red Dead Redemption 2', exact: true }),
  ).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('.scene-caption h2')).toHaveText('The Witcher 3');
  await page.getByRole('link', { name: 'Scroll to explore', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What’s on your shelf?' })).toBeVisible();
});

test('mobile landing provides working sign-in, sign-up and demo navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Motion (on|off)$/ })).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator('.scene-image.is-active img')
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  await page.screenshot({ path: 'artifacts/landing-mobile.png', fullPage: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Next game', exact: true }).click();
  await expect(page.locator('.scene-caption h2')).toHaveText('Red Dead Redemption 2');
  await page.goto('/');
  await page.locator('header').getByRole('link', { name: 'Sign up', exact: true }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByLabel('Invitation code')).toHaveCount(0);
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  await expect(page.getByLabel('I am 18 or older.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByLabel('Email address')).toBeVisible();
  await page.getByRole('link', { name: 'Explore the demo' }).click();
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.locator('.gz-post').first()).toBeVisible();
});
