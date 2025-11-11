// @ts-check

const { test, expect } = require('@playwright/test');
const {
  visitDemoPage,
  captureToggleSnapshot,
  captureColorSnapshots,
  captureDropUpMetrics,
  selectors,
} = require('./support/demoPage');

const {
  googleButton,
  headerNavLinks,
  headerThemeControl,
  footerThemeControl,
  footerDropupButton,
  footerMenu,
} = selectors;

const PALETTE_TARGETS = ['header.mpr-header', 'main', '#event-log', 'footer.mpr-footer'];

test.describe('Demo behaviours', () => {
  test.beforeEach(async ({ page }) => {
    await visitDemoPage(page);
  });

  test('MU-307: renders the Google Sign-In button with a valid client id', async ({ page }) => {
    await expect(page.locator(googleButton)).toBeVisible({ timeout: 3000 });
    const googleConfig = await page.evaluate(() => window.__googleInitConfig ?? null);
    expect(googleConfig).not.toBeNull();
    expect(typeof googleConfig?.client_id).toBe('string');
    expect(googleConfig?.client_id).toMatch(/^[0-9a-z.\-]+$/i);
  });

  test('MU-306: navigation links open in a new browsing context', async ({ page }) => {
    const navLinks = page.locator(headerNavLinks);
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const link = navLinks.nth(index);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('target', '_blank');
      const relAttribute = await link.getAttribute('rel');
      expect(relAttribute).toBeTruthy();
      const relTokens = relAttribute?.split(/\s+/).filter(Boolean) ?? [];
      expect(relTokens).toContain('noopener');
    }
  });

  test('MU-309: footer theme toggle knob moves and flips checked state', async ({ page }) => {
    const beforeSnapshot = await captureToggleSnapshot(page, footerThemeControl);
    await page.locator(footerThemeControl).click();
    await page.waitForTimeout(250);
    const afterSnapshot = await captureToggleSnapshot(page, footerThemeControl);
    expect(afterSnapshot.checked).not.toBe(beforeSnapshot.checked);
    expect(afterSnapshot.transform).not.toBe(beforeSnapshot.transform);
    expect(afterSnapshot.background).not.toBe(beforeSnapshot.background);
  });

  test('MU-310: footer theme toggle knob reaches the track edge', async ({ page }) => {
    const control = page.locator(footerThemeControl);
    const beforeSnapshot = await captureToggleSnapshot(page, footerThemeControl);
    expect(Math.abs(beforeSnapshot.translateX)).toBeLessThan(0.25);

    await control.click();
    await page.waitForTimeout(250);

    const afterSnapshot = await captureToggleSnapshot(page, footerThemeControl);
    expect(afterSnapshot.translateX).toBeGreaterThan(beforeSnapshot.translateX);
    expect(afterSnapshot.travelDistance).toBeGreaterThan(0);
    expect(afterSnapshot.translateX).toBeCloseTo(afterSnapshot.travelDistance, 0);
  });

  test('MU-309: light/dark toggle updates multiple palettes', async ({ page }) => {
    const beforeColors = await captureColorSnapshots(page, PALETTE_TARGETS);
    await page.locator(headerThemeControl).click();
    await page.waitForTimeout(300);
    const afterColors = await captureColorSnapshots(page, PALETTE_TARGETS);
    PALETTE_TARGETS.forEach((_selector, index) => {
      expect(afterColors[index]).not.toEqual(beforeColors[index]);
    });
  });

  test('MU-311: footer drop-up aligns correctly and toggles interactivity', async ({ page }) => {
    const dropupButton = page.locator(footerDropupButton);
    await expect(dropupButton).toBeVisible();
    await expect(dropupButton).toContainText('Build by Marco Polo Research Lab');
    await expect(dropupButton).toHaveAttribute('aria-expanded', 'false');

    const metrics = await captureDropUpMetrics(page);
    expect(metrics).not.toBeNull();
    if (metrics) {
      expect(metrics.offsetRight).toBeLessThanOrEqual(32);
      expect(metrics.offsetBottom).toBeLessThanOrEqual(48);
    }

    const footerText = await page.locator('footer.mpr-footer').innerText();
    expect(footerText).not.toMatch(/©/);

    await dropupButton.click();
    await expect(dropupButton).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator(footerMenu)).toHaveClass(/mpr-footer__menu--open/);
  });
});
