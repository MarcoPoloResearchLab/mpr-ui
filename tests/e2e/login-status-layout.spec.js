// @ts-check
const { test, expect } = require('./support/browserCoverage');
const { visitLoginButtonFixture } = require('./support/fixturePage');

for (const width of [390, 1280]) {
  test(`B069: standalone login has no empty status space at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await visitLoginButtonFixture(page);
    const login = page.locator('#fixture-login-button');
    const actions = login.locator('[data-mpr-auth-actions="root"]');
    const controls = login.locator('[data-mpr-auth-actions="controls"]');
    const status = login.locator('[data-mpr-auth-actions="status"]');
    await expect(login.locator('[data-mpr-google-ready]')).toHaveAttribute('aria-busy', 'false');
    await expect(status).toBeEmpty();
    await expect(status).toBeHidden();
    const initial = await actions.boundingBox();
    const controlBounds = await controls.boundingBox();
    expect(initial.height).toBe(controlBounds.height);

    await page.evaluate(() => {
      window.__loginButtonNonceFailure = true;
      document.querySelector('#fixture-login-button').setAttribute('button-theme', 'filled_blue');
    });
    await expect(status).toHaveText('Unable to start Google sign-in. Try again.');
    await expect(status).toBeVisible();
    await expect(status).toHaveAttribute('role', 'status');
    expect((await actions.boundingBox()).height).toBeGreaterThan(initial.height);

    await page.evaluate(() => {
      window.__loginButtonNonceFailure = false;
      document.querySelector('#fixture-login-button').setAttribute('button-theme', 'outline');
    });
    await expect(login.locator('[data-mpr-google-ready]')).toHaveAttribute('aria-busy', 'false');
    await expect(status).toBeEmpty();
    await expect(status).toBeHidden();
    expect((await actions.boundingBox()).height).toBe(initial.height);
  });
}
