// @ts-check

const { test, expect } = require('@playwright/test');
const { visitUserMenuFixture, captureColorSnapshots } = require('./support/fixturePage');

test.describe('User menu element', () => {
  test('MU-118: renders profile data and logs out', async ({ page }) => {
    await visitUserMenuFixture(page);

    const userHost = page.locator('mpr-user#fixture-user');
    await expect(userHost).toBeVisible();

    const nameLabel = userHost.locator('[data-mpr-user="name"]');
    await expect(nameLabel).toHaveText('Ada');

    const avatarImage = userHost.locator('[data-mpr-user="avatar-image"]');
    await expect(avatarImage).toHaveAttribute('src', 'https://cdn.example.com/avatar.png');

    const trigger = userHost.locator('[data-mpr-user="trigger"]');
    await trigger.click();
    await expect(userHost).toHaveAttribute('data-mpr-user-open', 'true');

    const logoutButton = userHost.locator('[data-mpr-user="logout"]');
    await logoutButton.click();

    const logoutCalled = await page.evaluate(() => Boolean(window.__mprUserLogoutCalled));
    expect(logoutCalled).toBe(true);
    await expect(page).toHaveURL(/#signed-out$/);
  });

  test('MU-118: custom avatar mode uses supplied avatar url', async ({ page }) => {
    await visitUserMenuFixture(page);

    const customHost = page.locator('mpr-user#fixture-user-custom');
    await expect(customHost).toBeVisible();
    const avatarImage = customHost.locator('[data-mpr-user="avatar-image"]');
    await expect(avatarImage).toHaveAttribute('src', 'https://cdn.example.com/custom.png');
  });

  test('MU-118: user menu styles respond to theme tokens', async ({ page }) => {
    await visitUserMenuFixture(page);

    const trigger = page.locator('mpr-user#fixture-user [data-mpr-user="trigger"]');
    await trigger.click();

    const menuSelector = 'mpr-user#fixture-user [data-mpr-user="menu"]';
    const [darkSnapshot] = await captureColorSnapshots(page, [menuSelector]);

    await page.evaluate(() => {
      document.body.setAttribute('data-mpr-theme', 'light');
    });

    const [lightSnapshot] = await captureColorSnapshots(page, [menuSelector]);

    expect(darkSnapshot && lightSnapshot && darkSnapshot.background).not.toBe(
      lightSnapshot && lightSnapshot.background,
    );
  });
});
