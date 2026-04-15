// @ts-check

const { test, expect } = require('@playwright/test');
const { visitAuthTransitionFixture } = require('./support/fixturePage');

test.describe('Header auth transition screen', () => {
  test('MU-434: keeps the transition screen visible until the app-ready event arrives', async ({ page }) => {
    await visitAuthTransitionFixture(page);

    const transition = page.locator('[data-mpr-header="auth-transition"]');
    const transitionTitle = page.locator('[data-mpr-header="auth-transition-title"]');
    const transitionMessage = page.locator('[data-mpr-header="auth-transition-message"]');
    const headerRoot = page.locator('header.mpr-header');

    await expect(transition).toBeHidden();
    await page.waitForFunction(() => Boolean(window.google?.accounts?.id?.__callback));

    await page.evaluate(() => {
      window.google.accounts.id.__callback({ credential: 'fixture-id-token' });
    });

    await expect(transition).toHaveAttribute('data-mpr-visible', 'true');
    await expect(transitionTitle).toHaveText('Opening workspace');
    await expect(transitionMessage).toHaveText('Loading your authenticated app surface.');

    await page.evaluate(() => {
      window.releaseAuthTransitionProfile();
    });

    await expect(headerRoot).toHaveClass(/mpr-header--authenticated/);
    await expect(transition).toHaveAttribute('data-mpr-visible', 'true');

    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('fixture:app-ready'));
    });

    await expect(transition).toHaveAttribute('data-mpr-visible', 'false');
    await expect(transition).toBeHidden();
  });
});
