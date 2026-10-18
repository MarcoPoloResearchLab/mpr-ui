// @ts-check

const { test, expect } = require('./support/browserCoverage');
const {
  visitFooterMultimodeToggleFixture,
  visitFooterMultimodeSquareFixture,
  visitFooterMultimodeConflictFixture,
  visitFooterToggleDemoConfigFixture,
  captureToggleSnapshot,
} = require('./support/fixturePage');

test.describe('Explicit footer theme controls', () => {
  test('MU-368: a switch rejects a four-mode catalog', async ({ page }) => {
    await visitFooterMultimodeToggleFixture(page);
    await expect(page.locator('mpr-footer')).toHaveAttribute('data-mpr-theme-control-error', 'mpr-ui.theme-control.invalid_config');
    await expect(page.locator('mpr-footer#fixture-footer input[type="checkbox"]')).toHaveCount(0);
  });

  test('MU-368: documented demo configuration renders the toggle switch', async ({ page }) => {
    await visitFooterToggleDemoConfigFixture(page);

    const toggleHost = page.locator(
      'mpr-footer#demo-config-footer [data-mpr-footer="theme-toggle"]',
    );
    await expect(toggleHost).toBeVisible();
    await expect(toggleHost).toHaveAttribute('data-mpr-theme-toggle-variant', 'switch');

    const control = page.locator(
      'mpr-footer#demo-config-footer input[type="checkbox"][data-mpr-theme-toggle="control"]',
    );
    await expect(control).toBeVisible();
    const tagName = await control.evaluate(element => element.tagName);
    expect(tagName).toBe('INPUT');
    const snapshot = await captureToggleSnapshot(
      page,
      'mpr-footer#demo-config-footer input[type="checkbox"][data-mpr-theme-toggle="control"]',
    );
    expect(snapshot.variant).toBe('switch');
  });

  test('MU-368: an atomic application update changes quadrant to switch', async ({ page }) => {
    await visitFooterMultimodeSquareFixture(page);

    const footerHost = page.locator('mpr-footer#fixture-footer-square');
    const squareHost = footerHost.locator('[data-mpr-footer="theme-toggle"]');
    await expect(squareHost).toHaveAttribute('data-mpr-theme-toggle-variant', 'square');

    await footerHost.evaluate((element) => {
      element.removeAttribute('theme-control');
      element.removeAttribute('theme-config');
      window.MPRUI.configureTheme({ modes: ['light', 'dark'], initialMode: 'light', control: { kind: 'switch', choices: { off: 'light', on: 'dark' } } });
    });

    const toggleHost = page.locator('mpr-footer#fixture-footer-square [data-mpr-footer="theme-toggle"]');
    await expect(toggleHost).toHaveAttribute('data-mpr-theme-toggle-variant', 'switch');

    const toggleControl = page.locator(
      'mpr-footer#fixture-footer-square input[type="checkbox"][data-mpr-theme-toggle="control"]',
    );
    await expect(toggleControl).toBeVisible();
  });

  test('MU-368: conflicting explicit controls report an error', async ({ page }) => {
    await visitFooterMultimodeConflictFixture(page);
    await expect(page.locator('mpr-footer')).toHaveAttribute('data-mpr-theme-control-error', 'mpr-ui.theme-control.invalid_config');
  });
});
