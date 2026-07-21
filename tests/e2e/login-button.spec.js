// @ts-check

const { test, expect } = require('./support/browserCoverage');
const { visitLoginButtonFixture } = require('./support/fixturePage');

test.describe('Standalone login button presentation', () => {
  test('B044: renders one styled accessible Google control and starts the nonce-bound flow only after click', async ({ page }) => {
    await visitLoginButtonFixture(page);

    const loginButton = page.locator('mpr-login-button#fixture-login-button');
    const googleControl = page.getByRole('button', { name: 'Sign in with Google' });

    await expect(page.getByRole('button')).toHaveCount(1);
    await expect(googleControl).toBeVisible();
    await expect(googleControl).toBeEnabled();
    await expect(loginButton).not.toHaveAttribute('role', 'button');
    await expect(page.getByText('Legacy CTA fallback', { exact: true })).toHaveCount(0);

    const initialControlBox = await googleControl.boundingBox();
    expect(initialControlBox).not.toBeNull();
    expect(initialControlBox?.height || 0).toBeGreaterThanOrEqual(40);
    await expect(googleControl).toHaveCSS('display', 'grid');

    await expect.poll(() => page.evaluate(() => window.__loginButtonRequestPaths)).toEqual([]);
    await expect.poll(() => page.evaluate(() => window.__loginButtonGoogleInitializeCalls)).toEqual([]);

    await page.evaluate(() => {
      window.__loginButtonHoldNonce = true;
    });
    await googleControl.click();

    await expect.poll(() => page.evaluate(() => window.__loginButtonRequestPaths)).toEqual(['/auth/nonce']);
    await expect(googleControl).toBeDisabled();
    await expect(page.getByRole('status')).toHaveText('Starting Google sign-in…');
    await expect.poll(() => page.evaluate(() => window.__loginButtonGoogleInitializeCalls)).toEqual([]);

    await page.evaluate(() => {
      window.__loginButtonHoldNonce = false;
      window.__resolveLoginButtonNonce?.();
    });

    await expect.poll(() => page.evaluate(() => window.__loginButtonGoogleInitializeCalls)).toEqual([
      { clientId: 'fixture-google-client', nonce: 'fixture-login-nonce' },
    ]);
    await expect.poll(() => page.evaluate(() => window.__loginButtonPromptCount)).toBe(1);
    await expect(googleControl).toBeEnabled();

    await page.evaluate(() => {
      window.__loginButtonNonceFailure = true;
    });
    await googleControl.click();

    await expect(page.getByRole('status')).toHaveText('Unable to start Google sign-in. Try again.');
    await expect(googleControl).toBeEnabled();

    await loginButton.evaluate((element) => {
      element.setAttribute('button-theme', 'filled_blue');
    });
    await expect(page.getByRole('button')).toHaveCount(1);
    await expect(googleControl).toBeVisible();

    await page.evaluate(() => {
      const loginButtonElement = document.querySelector('#fixture-login-button');
      const loginPanel = loginButtonElement?.parentElement;
      loginButtonElement?.remove();
      if (loginButtonElement && loginPanel) {
        loginPanel.appendChild(loginButtonElement);
      }
    });
    await expect(page.getByRole('button')).toHaveCount(1);
    await expect(googleControl).toBeVisible();
    await expect(loginButton).not.toHaveAttribute('role', 'button');
  });
});
