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
    await expect(page.getByRole('status')).toBeVisible();
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

  test('B047: preparation keeps the visible Google sign-in control geometry unchanged', async ({ page }) => {
    await visitLoginButtonFixture(page);

    const controlGroup = page.getByRole('group', { name: 'Google sign-in control' });
    const googleControl = page.getByRole('button', { name: 'Sign in with Google' });

    await expect(controlGroup).toBeVisible();
    await expect(googleControl).toBeVisible();

    const initialGroupGeometry = await renderedGeometry(controlGroup);
    const initialControlGeometry = await renderedGeometry(googleControl);

    await page.evaluate(() => {
      window.__loginButtonHoldNonce = true;
    });
    await googleControl.click();

    await expect(googleControl).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('status')).toHaveText('Starting Google sign-in…');

    expect(await renderedGeometry(controlGroup)).toEqual(initialGroupGeometry);
    expect(await renderedGeometry(googleControl)).toEqual(initialControlGeometry);

    await page.evaluate(() => {
      window.__loginButtonHoldNonce = false;
      window.__resolveLoginButtonNonce?.();
    });
    await expect(googleControl).toHaveAttribute('aria-busy', 'false');
  });

  test('B044: icon-only login controls preserve their square footprint', async ({ page }) => {
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
