// @ts-check
const { test, expect } = require('./support/browserCoverage');
const { visitFullLayoutFixture } = require('./support/fixturePage');

for (const width of [390, 1280]) {
  for (const stylesheet of ['external', 'embedded']) {
    for (const theme of ['dark', 'light']) {
      test(`B081: email flyout has a solid ${theme} surface at ${width}px with ${stylesheet} styles`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await visitFullLayoutFixture(page);
        const header = page.locator('mpr-header#test-header');
        await header.evaluate((element, options) => {
          const authConfig = JSON.parse(element.getAttribute('auth-config'));
          authConfig.providers.password = { enabled: true };
          authConfig.password = {
            loginPath: '/auth/password/login',
            signupPath: '/auth/password/signup',
            verifyEmailPath: '/auth/password/verify-email',
            resetStartPath: '/auth/password/reset/start',
            resetCompletePath: '/auth/password/reset/complete',
          };
          element.setAttribute('auth-config', JSON.stringify(authConfig));
          document.body.setAttribute('data-mpr-theme', options.theme);
          if (options.stylesheet === 'embedded') {
            document.querySelectorAll('link[rel="stylesheet"]').forEach(link => link.remove());
          }
        }, { stylesheet, theme });

        const emailButton = header.locator('[data-mpr-auth-action="email"]');
        await emailButton.click();
        const panel = header.locator('[data-mpr-auth-email-panel]');
        await expect(panel).toBeVisible();
        await expect(panel).toHaveCSS('background-color', theme === 'dark' ? 'rgb(31, 33, 38)' : 'rgb(255, 255, 255)');
        await expect(panel).toHaveCSS('border-radius', '6px');
        for (const tabName of ['Create account', 'Sign in']) {
          await panel.getByRole('tab', { name: tabName, exact: true }).click();
          const form = panel.locator('.mpr-auth-form');
          await expect(form).toBeVisible();
          const panelBounds = await panel.boundingBox();
          const formBounds = await form.boundingBox();
          expect(panelBounds.x).toBeGreaterThanOrEqual(0);
          expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(width);
          expect(formBounds.x).toBeGreaterThanOrEqual(panelBounds.x);
          expect(formBounds.x + formBounds.width).toBeLessThanOrEqual(panelBounds.x + panelBounds.width);
        }
        await panel.getByRole('button', { name: 'Forgot password?' }).click();
        await expect(panel.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
        await expect(panel).toHaveCSS('background-color', theme === 'dark' ? 'rgb(31, 33, 38)' : 'rgb(255, 255, 255)');
        await emailButton.click();
        await expect(panel).toHaveCount(0);
      });
    }
  }
}
