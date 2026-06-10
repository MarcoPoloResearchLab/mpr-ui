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
    await expect(page.getByLabel('Email')).toHaveCount(0);

    const compactBox = await chooser.boundingBox();
    expect(compactBox).not.toBeNull();
    expect(compactBox?.width).toBeLessThanOrEqual(352);
    expect(compactBox?.height).toBeLessThan(160);

    await emailButton.click();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Forgot password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();

    const expandedBox = await chooser.boundingBox();
    expect(expandedBox).not.toBeNull();
    expect(expandedBox?.width).toBeLessThanOrEqual(352);
    expect(expandedBox?.height).toBeLessThan(340);

    await page.getByLabel('Email').fill('operator@example.com');
    await page.getByLabel('Password').fill('correct-horse-battery-staple');
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
    await expect(page.getByLabel('Email')).toHaveCount(0);
    await expect.poll(async () => (await eventLog.allTextContents()).join('\n')).toContain(
      'mpr-auth-provider:select {"provider":"google"}',
    );
  });
});
