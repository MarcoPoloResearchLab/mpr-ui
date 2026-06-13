// @ts-check

const { test, expect } = require('./support/browserCoverage');
const { visitAuthProviderChooserFixture } = require('./support/fixturePage');

test.describe('Auth provider chooser', () => {
  test('renders the three-provider choice compactly and expands email in place', async ({ page }) => {
    await visitAuthProviderChooserFixture(page);

    const chooser = page.locator('mpr-auth-provider-chooser#provider-chooser');
    const appleButton = page.getByRole('button', { name: 'Continue with Apple' });
    const googleButton = page.getByRole('button', { name: 'Continue with Google' });
    const emailButton = page.getByRole('button', { name: 'Continue with email' });

    await expect(chooser).toBeVisible();
    await expect(appleButton).toBeVisible();
    await expect(googleButton).toBeVisible();
    await expect(emailButton).toBeVisible();
    await expect(
      chooser.locator('[data-mpr-auth-provider-mark="apple"]'),
    ).toBeVisible();
    await expect(
      chooser.locator('[data-mpr-auth-provider-mark="google"]'),
    ).toBeVisible();
    await expect(
      chooser.locator('[data-mpr-auth-provider-mark="email"]'),
    ).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toHaveCount(0);

    const compactBox = await chooser.boundingBox();
    expect(compactBox).not.toBeNull();
    expect(compactBox?.width).toBeLessThanOrEqual(352);
    expect(compactBox?.height).toBeLessThan(160);

    await emailButton.click();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Forgot password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();

    const expandedBox = await chooser.boundingBox();
    expect(expandedBox).not.toBeNull();
    expect(expandedBox?.width).toBeLessThanOrEqual(352);
    expect(expandedBox?.height).toBeLessThan(340);

    await page.getByLabel('Email', { exact: true }).fill('operator@example.com');
    await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery-staple');
    await page.getByRole('button', { name: 'Sign in' }).click();

    const eventLog = page.locator('[data-test="provider-event-log-entry"]');
    await expect(eventLog).toContainText([
      'mpr-auth-provider:select {"provider":"email"}',
      'mpr-auth-provider:email-submit {"provider":"email","action":"login"}',
    ]);
    const eventLogText = (await eventLog.allTextContents()).join('\n');
    expect(eventLogText).not.toContain('operator@example.com');
    expect(eventLogText).not.toContain('correct-horse-battery-staple');

    await googleButton.click();
    await expect(page.getByLabel('Email', { exact: true })).toHaveCount(0);
    await expect.poll(async () => (await eventLog.allTextContents()).join('\n')).toContain(
      'mpr-auth-provider:select {"provider":"google"}',
    );
  });

  test('renders the icon-row variant as horizontal icon-only buttons', async ({ page }) => {
    await visitAuthProviderChooserFixture(page);

    const chooser = page.locator('mpr-auth-provider-chooser#provider-chooser');
    await chooser.evaluate((element) => {
      element.setAttribute('variant', 'icon-row');
      element.removeAttribute('data-mpr-auth-provider-variant');
      element
        .querySelector('[data-mpr-auth-provider-chooser="root"]')
        ?.removeAttribute('data-mpr-auth-provider-variant');
    });

    await expect(chooser).toHaveAttribute('variant', 'icon-row');
    const appleButton = chooser.locator('[data-mpr-auth-provider="apple"]');
    const googleButton = chooser.locator('[data-mpr-auth-provider="google"]');
    const emailButton = chooser.locator('[data-mpr-auth-provider="email"]');

    await expect(appleButton).toHaveAttribute('aria-label', 'Continue with Apple');
    await expect(googleButton).toHaveAttribute('aria-label', 'Continue with Google');
    await expect(emailButton).toHaveAttribute('aria-label', 'Continue with email');

    const appleBox = await appleButton.boundingBox();
    const googleBox = await googleButton.boundingBox();
    const emailBox = await emailButton.boundingBox();
    expect(appleBox).not.toBeNull();
    expect(googleBox).not.toBeNull();
    expect(emailBox).not.toBeNull();
    expect(Math.abs((appleBox?.y || 0) - (googleBox?.y || 0))).toBeLessThan(2);
    expect(Math.abs((googleBox?.y || 0) - (emailBox?.y || 0))).toBeLessThan(2);
    expect((googleBox?.x || 0) - (appleBox?.x || 0)).toBeGreaterThan(32);
    expect((emailBox?.x || 0) - (googleBox?.x || 0)).toBeGreaterThan(32);
    expect(appleBox?.width).toBeLessThanOrEqual(42);
    expect(googleBox?.width).toBeLessThanOrEqual(42);
    expect(emailBox?.width).toBeLessThanOrEqual(42);
    expect(appleBox?.height).toBeLessThanOrEqual(42);
    expect(googleBox?.height).toBeLessThanOrEqual(42);
    expect(emailBox?.height).toBeLessThanOrEqual(42);
    expect(Math.abs((appleBox?.width || 0) - (appleBox?.height || 0))).toBeLessThan(2);
    expect(Math.abs((googleBox?.width || 0) - (googleBox?.height || 0))).toBeLessThan(2);
    expect(Math.abs((emailBox?.width || 0) - (emailBox?.height || 0))).toBeLessThan(2);

    const providerBorders = await chooser
      .locator('[data-mpr-auth-provider]')
      .evaluateAll((buttons) =>
        buttons.map((button) => {
          const style = window.getComputedStyle(button);
          return {
            borderColor: style.borderTopColor,
            borderStyle: style.borderTopStyle,
            borderWidth: style.borderTopWidth,
          };
        }),
      );
    expect(new Set(providerBorders.map((border) => border.borderStyle)).size).toBe(1);
    expect(new Set(providerBorders.map((border) => border.borderColor)).size).toBe(1);
    expect(new Set(providerBorders.map((border) => border.borderWidth)).size).toBe(1);

    const labelStyle = await chooser
      .locator('[data-mpr-auth-provider-label="google"]')
      .evaluate((label) => {
        const style = window.getComputedStyle(label);
        return {
          position: style.position,
          width: style.width,
          clipPath: style.clipPath,
        };
      });
    expect(labelStyle.position).toBe('absolute');
    expect(labelStyle.width).toBe('1px');
    expect(labelStyle.clipPath).toContain('inset');
  });
});
