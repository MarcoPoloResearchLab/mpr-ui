// @ts-check

const { test, expect } = require('@playwright/test');
const {
  visitFooterMultimodeToggleFixture,
  visitFooterMultimodeSquareFixture,
  visitFooterMultimodeConflictFixture,
  visitFooterToggleDemoConfigFixture,
  captureToggleSnapshot,
} = require('./support/fixturePage');

test.describe('Footer theme switcher overrides', () => {
  test('MU-368: toggle variant renders the switch even with four modes', async ({ page }) => {
    await visitFooterMultimodeToggleFixture(page);

    const toggleHost = page.locator('mpr-footer#fixture-footer [data-mpr-footer="theme-toggle"]');
    await expect(toggleHost).toBeVisible();
    await expect(toggleHost).toHaveAttribute('data-mpr-theme-toggle-variant', 'switch');

    const toggleSelector =
      'mpr-footer#fixture-footer input[type="checkbox"][data-mpr-theme-toggle="control"]';
    const toggleControl = page.locator(toggleSelector);
    await expect(toggleControl).toBeVisible();

    const tagName = await toggleControl.evaluate(element => element.tagName);
    expect(tagName).toBe('INPUT');
    const snapshot = await captureToggleSnapshot(page, toggleSelector);
    expect(snapshot.variant).toBe('switch');

    const initialMode = await page.evaluate(() => document.body.getAttribute('data-test-theme'));
    await toggleControl.click();
    await page.waitForTimeout(200);
    const afterMode = await page.evaluate(() => document.body.getAttribute('data-test-theme'));
    expect(afterMode).not.toBe(initialMode);
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

  test('MU-368: switching from square to toggle re-renders the binary control', async ({ page }) => {
    await visitFooterMultimodeSquareFixture(page);

    const footerHost = page.locator('mpr-footer#fixture-footer-square');
    const squareHost = footerHost.locator('[data-mpr-footer="theme-toggle"]');
    await expect(squareHost).toHaveAttribute('data-mpr-theme-toggle-variant', 'square');

    await footerHost.evaluate((element) => {
      element.setAttribute('theme-switcher', 'toggle');
    });

    const toggleHost = page.locator('mpr-footer#fixture-footer-square [data-mpr-footer="theme-toggle"]');
    await expect(toggleHost).toHaveAttribute('data-mpr-theme-toggle-variant', 'switch');

    const toggleControl = page.locator(
      'mpr-footer#fixture-footer-square input[type="checkbox"][data-mpr-theme-toggle="control"]',
    );
    await expect(toggleControl).toBeVisible();
  });

  test('MU-368: theme-switcher attribute overrides conflicting theme config', async ({ page }) => {
    await visitFooterMultimodeConflictFixture(page);

    const toggleHost = page.locator('mpr-footer#fixture-footer-conflict [data-mpr-footer="theme-toggle"]');
    await expect(toggleHost).toBeVisible();
    await expect(toggleHost).toHaveAttribute('data-mpr-theme-toggle-variant', 'switch');
  });
});
