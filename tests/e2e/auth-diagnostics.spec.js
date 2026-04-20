// @ts-check

const { test, expect } = require('./support/browserCoverage');
const { visitAuthDiagnosticsFixture } = require('./support/fixturePage');

test.describe('Auth diagnostics', () => {
  test('renders auth state, profile snapshots, and auth errors from the targeted surface', async ({ page }) => {
    await visitAuthDiagnosticsFixture(page);

    const diagnostics = page.locator('mpr-auth-diagnostics#fixture-diagnostics');
    const statusBadge = diagnostics.locator('[data-mpr-auth-diagnostics="status-badge"]');
    const targetLabel = diagnostics.locator('[data-mpr-auth-diagnostics="target-label"]');
    const googleState = diagnostics.locator('[data-mpr-auth-diagnostics="google-state"]');
    const profile = diagnostics.locator('[data-mpr-auth-diagnostics="profile"]');
    const empty = diagnostics.locator('[data-mpr-auth-diagnostics="empty"]');
    const error = diagnostics.locator('[data-mpr-auth-diagnostics="error"]');

    await expect(diagnostics).toHaveAttribute('data-mpr-auth-diagnostics-status', 'unauthenticated');
    await expect(statusBadge).toHaveText('Unauthenticated');
    await expect(targetLabel).toHaveText('#fixture-auth-root');
    await expect(googleState).toHaveText('ready');
    await expect(empty).toBeVisible();
    await expect(profile).toBeHidden();

    await page.evaluate(() => {
      window.publishFixtureAuthenticated();
    });

    await expect(diagnostics).toHaveAttribute('data-mpr-auth-diagnostics-status', 'authenticated');
    await expect(diagnostics).toHaveAttribute('data-user-display', 'Ada Lovelace');
    await expect(statusBadge).toHaveText('Authenticated');
    await expect(profile).toBeVisible();
    await expect(profile).toContainText('ada@example.com');
    await expect(profile).toContainText('operator');
    await expect(error).toBeHidden();

    await page.evaluate(() => {
      window.publishFixtureAuthError();
    });

    await expect(error).toHaveText('Nonce request failed');
    await expect(diagnostics).toHaveAttribute(
      'data-mpr-auth-diagnostics-error',
      'Nonce request failed',
    );
  });
});
