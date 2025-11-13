// @ts-check

const { test, expect } = require('@playwright/test');
const {
  visitDemoPage,
  visitThemeFixturePage,
  captureToggleSnapshot,
  captureColorSnapshots,
  captureDropUpMetrics,
  readEventLogEntries,
  selectors,
} = require('./support/demoPage');

const {
  googleButton,
  headerNavLinks,
  headerSettingsButton,
  settingsModal,
  settingsModalDialog,
  settingsModalClose,
  settingsModalBody,
  footerThemeControl,
  footerDropupButton,
  footerMenu,
  privacyLink,
  privacyModal,
  privacyModalClose,
  eventLogEntries,
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

  test('MU-309: square footer switcher selects quadrants and updates modes', async ({ page }) => {
    const beforeSnapshot = await captureToggleSnapshot(page, footerThemeControl);
    expect(beforeSnapshot.variant).toBe('square');
    expect(beforeSnapshot.index).toBe(0);

    await clickQuadrant(page, footerThemeControl, 'bottomRight');
    await page.waitForTimeout(200);

    const afterSnapshot = await captureToggleSnapshot(page, footerThemeControl);
    expect(afterSnapshot.variant).toBe('square');
    expect(afterSnapshot.index).toBe(2);
    expect(afterSnapshot.mode).toBe('default-dark');
  });

  test('MU-310: footer quadrant selection updates the palette attribute', async ({ page }) => {
    const paletteBefore = await page.evaluate(() => document.body.getAttribute('data-demo-palette'));
    await clickQuadrant(page, footerThemeControl, 'bottomLeft');
    await page.waitForTimeout(200);
    const paletteAfter = await page.evaluate(() => document.body.getAttribute('data-demo-palette'));
    expect(paletteAfter).toBe('forest');
    expect(paletteAfter).not.toBe(paletteBefore);
  });

  test('Footer square toggle keeps the body background in sync', async ({ page }) => {
    const initialBackground = await readBodyBackgroundColor(page);
    await clickQuadrant(page, footerThemeControl, 'bottomRight');
    await page.waitForTimeout(250);
    const darkBackground = await readBodyBackgroundColor(page);
    expect(darkBackground).not.toBe(initialBackground);

    await clickQuadrant(page, footerThemeControl, 'topLeft');
    await page.waitForTimeout(250);
    const resetBackground = await readBodyBackgroundColor(page);
    expect(resetBackground).toBe(initialBackground);
  });

  test('MU-309: footer toggle updates multiple palettes', async ({ page }) => {
    const beforeColors = await captureColorSnapshots(page, PALETTE_TARGETS);
    await clickQuadrant(page, footerThemeControl, 'bottomRight');
    await page.waitForTimeout(300);
    const afterColors = await captureColorSnapshots(page, PALETTE_TARGETS);
    PALETTE_TARGETS.forEach((_selector, index) => {
      expect(afterColors[index]).not.toEqual(beforeColors[index]);
    });
  });

  test('MU-111: footer privacy modal opens and closes with provided content', async ({ page }) => {
    const modal = page.locator(privacyModal);
    await expect(modal).toHaveAttribute('data-mpr-modal-open', 'false');

    await page.locator(privacyLink).click();
    await expect(modal).toHaveAttribute('data-mpr-modal-open', 'true');
    await expect(modal.locator('h1')).toContainText('Privacy Policy');

    await page.locator(privacyModalClose).click();
    await expect(modal).toHaveAttribute('data-mpr-modal-open', 'false');
  });

  test('MU-311: footer drop-up aligns correctly and toggles interactivity', async ({ page }) => {
    const dropupButton = page.locator(footerDropupButton);
    await expect(dropupButton).toBeVisible();
    await expect(dropupButton).toContainText('Built by Marco Polo Research Lab');
    await expect(dropupButton).toHaveAttribute('aria-expanded', 'false');

    const metrics = await captureDropUpMetrics(page);
    expect(metrics).not.toBeNull();
    if (metrics) {
      expect(metrics.offsetRight).toBeLessThanOrEqual(32);
      expect(metrics.offsetBottom).toBeLessThanOrEqual(60);
    }

    const footerText = await page.locator('footer.mpr-footer').innerText();
    expect(footerText).not.toMatch(/©/);

    await dropupButton.click();
    await expect(dropupButton).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator(footerMenu)).toHaveClass(/mpr-footer__menu--open/);
  });

  test('MU-316: settings button opens an accessible modal shell', async ({ page }) => {
    const settingsButton = page.locator(headerSettingsButton);
    await expect(settingsButton).toBeVisible();

    const modal = page.locator(settingsModal);
    await expect(modal).toHaveCount(1);
    await expect(modal).toHaveAttribute('data-mpr-modal-open', 'false');

    await settingsButton.click();
    await expect(modal).toHaveAttribute('data-mpr-modal-open', 'true');

    const dialog = page.locator(settingsModalDialog);
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    await page.locator(settingsModalClose).click();
    await expect(modal).toHaveAttribute('data-mpr-modal-open', 'false');
  });
  test('MU-318: settings modal renders default placeholder content', async ({ page }) => {
    const modal = page.locator(settingsModal);
    await page.locator(headerSettingsButton).click();
    await expect(modal).toHaveAttribute('data-mpr-modal-open', 'true');
    await expect(page.locator(settingsModalBody)).toContainText(
      'Add your settings controls here.',
      { timeout: 1000 },
    );
  });

  test('MU-317: event log records header and theme interactions', async ({ page }) => {
    const logLocator = page.locator(eventLogEntries);
    await expect(logLocator).toHaveCount(0);

    await page.locator(headerSettingsButton).click();
    await expect(logLocator).toHaveCount(1, { timeout: 2000 });
    await expect(logLocator.first()).toContainText(/settings/i);

    await clickQuadrant(page, footerThemeControl, 'bottomRight');
    await page.waitForTimeout(200);
    await expect(logLocator).toHaveCount(2, { timeout: 2000 });
    await expect(logLocator.nth(1)).toContainText(/theme changed/i);

    const entries = await readEventLogEntries(page);
    expect(entries.length).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Default theme toggle behaviours', () => {
  test.beforeEach(async ({ page }) => {
    await visitThemeFixturePage(page);
  });

  test('MU-316: default toggle updates the body background without custom classes', async ({ page }) => {
    const toggle = page.locator(footerThemeControl).first();
    await expect(toggle).toBeVisible();

    const initialBackground = await readBodyBackgroundColor(page);
    await toggle.click();
    await page.waitForTimeout(200);
    const darkBackground = await readBodyBackgroundColor(page);
    expect(darkBackground).not.toBe(initialBackground);

    await toggle.click();
    await page.waitForTimeout(200);
    const resetBackground = await readBodyBackgroundColor(page);
    expect(resetBackground).toBe(initialBackground);
  });
});

/**
 * Clicks a specific quadrant within the square theme toggle.
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'} quadrant
 */
async function clickQuadrant(page, selector, quadrant) {
  const control = page.locator(selector).first();
  const box = await control.boundingBox();
  if (!box) {
    throw new Error('Square toggle bounding box is missing');
  }
  const margin = 6;
  const isRight = quadrant === 'topRight' || quadrant === 'bottomRight';
  const isBottom = quadrant === 'bottomRight' || quadrant === 'bottomLeft';
  const targetX = isRight ? box.x + box.width - margin : box.x + margin;
  const targetY = isBottom ? box.y + box.height - margin : box.y + margin;
  await page.mouse.click(targetX, targetY);
}

/**
 * Reads the computed body background colour.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
async function readBodyBackgroundColor(page) {
  return page.evaluate(() => window.getComputedStyle(document.body).getPropertyValue('background-color'));
}
