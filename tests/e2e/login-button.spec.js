// @ts-check

const { test, expect } = require('./support/browserCoverage');
const { visitLoginButtonFixture } = require('./support/fixturePage');

const ICON_ONLY_BUTTON_VARIANTS = Object.freeze([
  Object.freeze({ buttonShape: 'square', buttonSize: 'small' }),
  Object.freeze({ buttonShape: 'circle', buttonSize: 'small' }),
  Object.freeze({ buttonShape: 'square', buttonSize: 'large' }),
  Object.freeze({ buttonShape: 'circle', buttonSize: 'large' }),
]);

async function renderedGeometry(locator) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  if (bounds === null) {
    throw new Error('Expected the visible Google login control to have rendered bounds.');
  }

  return locator.evaluate((element, box) => {
    const styles = window.getComputedStyle(element);
    return {
      width: box.width,
      height: box.height,
      borderRadius: styles.borderRadius,
      borderTopWidth: styles.borderTopWidth,
      borderRightWidth: styles.borderRightWidth,
      borderBottomWidth: styles.borderBottomWidth,
      borderLeftWidth: styles.borderLeftWidth,
    };
  }, bounds);
}

test.describe('Standalone login button presentation', () => {
  test('F008: renders an Apple-only control without Google settings', async ({ page }) => {
    await visitLoginButtonFixture(page);
    const loginButton = page.locator('mpr-login-button#fixture-login-button');

    await loginButton.evaluate((element) => {
      element.setAttribute('auth-config', JSON.stringify({
        tauthUrl: 'https://auth.example.test',
        tenantId: 'fixture-tenant',
        logoutPath: '/auth/logout',
        sessionPath: '/auth/session',
        providers: {
          google: { enabled: false },
          apple: {
            enabled: true,
            startPath: '/auth/apple/start',
            returnTo: 'current-origin',
            label: 'Sign in with Apple',
          },
          password: { enabled: false },
        },
      }));
    });

    const appleControl = page.getByRole('button', { name: 'Sign in with Apple' });
    await expect(appleControl).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toHaveCount(0);
    await expect(loginButton).toHaveAttribute('data-mpr-auth-providers', 'apple');
    const controlBox = await appleControl.boundingBox();
    expect(controlBox).not.toBeNull();
    expect(controlBox?.width || 0).toBeGreaterThanOrEqual(140);
    expect(controlBox?.height || 0).toBeGreaterThanOrEqual(44);
  });

  test('B059: renders one nonce-bound Google control that starts the popup flow', async ({ page }) => {
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
    await expect(googleControl).toHaveCSS('display', 'block');

    await expect.poll(() => page.evaluate(() => window.__loginButtonRequestPaths)).toEqual(['/auth/nonce']);
    await expect.poll(() => page.evaluate(() => window.__loginButtonGoogleInitializeCalls)).toEqual([
      { clientId: 'fixture-google-client', nonce: 'fixture-login-nonce' },
    ]);
    await expect.poll(() => page.evaluate(() => window.__loginButtonRenderCalls)).toEqual([
      {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
      },
    ]);

    await googleControl.click();
    await expect(page.getByRole('status')).toHaveText('Starting Google sign-in…');
    await expect(googleControl).toBeEnabled();

    await page.evaluate(() => {
      window.__loginButtonNonceFailure = true;
      document.querySelector('#fixture-login-button')?.setAttribute('button-theme', 'filled_blue');
    });

    await expect(page.getByRole('status')).toHaveText('Unable to start Google sign-in. Try again.');
    await expect(page.getByRole('status')).toBeVisible();

    await loginButton.evaluate((element) => {
      window.__loginButtonNonceFailure = false;
      element.setAttribute('button-theme', 'outline');
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

  test('B059: popup start keeps the visible Google control geometry unchanged', async ({ page }) => {
    await visitLoginButtonFixture(page);

    const controlGroup = page.getByRole('group', { name: 'Google sign-in control' });
    const googleControl = page.getByRole('button', { name: 'Sign in with Google' });

    await expect(controlGroup).toBeVisible();
    await expect(googleControl).toBeVisible();

    const initialGroupGeometry = await renderedGeometry(controlGroup);
    const initialControlGeometry = await renderedGeometry(googleControl);

    await googleControl.click();

    await expect(page.getByRole('status')).toHaveText('Starting Google sign-in…');

    expect(await renderedGeometry(controlGroup)).toEqual(initialGroupGeometry);
    expect(await renderedGeometry(googleControl)).toEqual(initialControlGeometry);
  });

  test('B059: refreshes the button nonce and removes its timer on disconnect', async ({ page }) => {
    await page.clock.install();
    await visitLoginButtonFixture(page);

    const loginButton = page.locator('mpr-login-button#fixture-login-button');
    const googleControlHost = loginButton.locator('[data-mpr-auth-action="google"]');
    await expect.poll(() => page.evaluate(() => window.__loginButtonRequestPaths)).toEqual([
      '/auth/nonce',
    ]);

    await page.evaluate(() => {
      window.__loginButtonNonceFailure = true;
    });
    await page.clock.fastForward(4 * 60 * 1000);
    await expect.poll(() => page.evaluate(() => window.__loginButtonRequestPaths)).toEqual([
      '/auth/nonce',
      '/auth/nonce',
    ]);
    await expect(page.getByRole('status')).toHaveText(
      'Unable to start Google sign-in. Try again.',
    );
    await expect(googleControlHost).toHaveAttribute('data-mpr-google-error', 'nonce-failed');
    await expect(googleControlHost).not.toHaveAttribute('data-mpr-google-ready');
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toHaveCount(0);

    await page.evaluate(() => {
      window.__loginButtonNonceFailure = false;
    });
    await page.clock.fastForward(30 * 1000);
    await expect.poll(() => page.evaluate(() => window.__loginButtonRequestPaths)).toEqual([
      '/auth/nonce',
      '/auth/nonce',
      '/auth/nonce',
    ]);
    await expect.poll(() => page.evaluate(() => window.__loginButtonRenderCalls.length)).toBe(2);
    await expect(googleControlHost).toHaveAttribute('data-mpr-google-ready', 'true');
    await expect(googleControlHost).not.toHaveAttribute('data-mpr-google-error');

    await loginButton.evaluate((element) => element.remove());
    await page.clock.fastForward(4 * 60 * 1000);
    await expect.poll(() => page.evaluate(() => window.__loginButtonRequestPaths)).toHaveLength(3);
  });

  test('B059: icon-only login controls preserve their square footprint', async ({ page }) => {
    await visitLoginButtonFixture(page);

    const loginButton = page.locator('mpr-login-button#fixture-login-button');
    const googleControl = page.getByRole('button', { name: 'Sign in with Google' });

    for (const buttonVariant of ICON_ONLY_BUTTON_VARIANTS) {
      await loginButton.evaluate((element, variant) => {
        element.setAttribute('button-shape', variant.buttonShape);
        element.setAttribute('button-size', variant.buttonSize);
      }, buttonVariant);

      await expect(googleControl).toBeVisible();

      const controlBox = await googleControl.boundingBox();
      expect(controlBox).not.toBeNull();
      if (controlBox === null) {
        throw new Error('Expected the configured Google login control to have visible bounds.');
      }

      expect(controlBox.width).toBeGreaterThan(0);
      expect(controlBox.height).toBeGreaterThan(0);
      expect(Math.abs(controlBox.width - controlBox.height)).toBeLessThanOrEqual(1);
    }
  });
});
