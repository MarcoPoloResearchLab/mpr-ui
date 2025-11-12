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
  headerSettingsButton,
  footerThemeControl,
  footerDropupButton,
  footerMenu,
  footerPrefix,
  privacyLink,
  privacyModal,
  privacyModalDialog,
  privacyModalClose,
  settingsModal,
  settingsModalClose,
  eventLogEntries,
} = selectors;

const PALETTE_TARGETS = ['header.mpr-header', 'main', '#event-log', 'footer.mpr-footer'];
const THEME_MODE_PRESETS = Object.freeze({
  defaultLight: createModeDefinition('default-light', 'light', 'default'),
  sunriseLight: createModeDefinition('sunrise-light', 'light', 'sunrise'),
  defaultDark: createModeDefinition('default-dark', 'dark', 'default'),
  forestDark: createModeDefinition('forest-dark', 'dark', 'forest'),
});

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

  test('MU-317: event log records settings + theme interactions', async ({ page }) => {
    const logEntries = page.locator(eventLogEntries);
    await expect(logEntries).toHaveCount(0);

    await page.locator(headerSettingsButton).click();
    await page.waitForTimeout(50);
    await clickQuadrant(page, footerThemeControl, 'topRight');
    await page.waitForTimeout(50);

    await expect(logEntries).toHaveCount(2);
    await expect(logEntries.first()).toContainText(/settings/i);
    await expect(logEntries.nth(1)).toContainText(/theme/i);
  });

  test('MU-318: clicking Settings opens the modal shell', async ({ page }) => {
    const modal = page.locator(settingsModal);
    await expect(modal).toHaveCount(0);

    await page.locator(headerSettingsButton).click();
    await expect(modal).toHaveAttribute('data-mpr-modal-open', 'true');
    await expect(modal.locator('h1')).toContainText(/settings/i);

    await page.locator(settingsModalClose).click();
    await expect(modal).toHaveAttribute('data-mpr-modal-open', 'false');
  });

  test('MU-319: footer renders the builder label only once', async ({ page }) => {
    const prefixText = (await page.locator(footerPrefix).innerText()).trim();
    expect(prefixText.length).toBe(0);

    const dropupText = await page.locator(footerDropupButton).innerText();
    expect(dropupText).toContain('Built by Marco Polo Research Lab');
  });

  test('MU-320: privacy modal occupies the viewport', async ({ page }) => {
    await page.locator(privacyLink).click();
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    const overlayBox = await page.locator(privacyModal).boundingBox();
    const dialogBox = await page.locator(privacyModalDialog).boundingBox();

    expect(overlayBox?.y ?? 0).toBeLessThan(2);
    expect(overlayBox?.height ?? 0).toBeGreaterThan((viewport?.height || 0) * 0.9);
    expect(dialogBox?.height ?? 0).toBeGreaterThan((viewport?.height || 0) * 0.6);

    await page.locator(privacyModalClose).click();
  });

  test('MU-321: switch toggle knob travels the full track width', async ({ page }) => {
    const selector = await mountThemeToggle(page, {
      id: 'binary-toggle',
      variant: 'switch',
      modes: [
        THEME_MODE_PRESETS.defaultLight,
        THEME_MODE_PRESETS.defaultDark,
      ],
    });
    const before = await captureToggleSnapshot(page, selector);
    expect(before.translateX).toBeCloseTo(0, 1);

    await page.locator(selector).click();
    await page.waitForTimeout(100);
    const after = await captureToggleSnapshot(page, selector);
    expect(Math.abs(after.translateX - after.travelDistance)).toBeLessThan(1);
  });

  test('MU-322: switch toggle flips strictly between light and dark', async ({ page }) => {
    const selector = await mountThemeToggle(page, {
      id: 'cyclic-toggle',
      variant: 'switch',
      modes: [
        THEME_MODE_PRESETS.defaultLight,
        THEME_MODE_PRESETS.sunriseLight,
        THEME_MODE_PRESETS.defaultDark,
        THEME_MODE_PRESETS.forestDark,
      ],
    });
    const seenPalettes = new Set();
    for (let index = 0; index < 4; index += 1) {
      await page.locator(selector).click();
      await page.waitForTimeout(50);
      const palette = await page.evaluate(() => document.body.getAttribute('data-demo-palette'));
      if (palette) {
        seenPalettes.add(palette);
      }
    }
    expect(seenPalettes.size).toBe(2);
  });

  test('MU-323: square toggle backfills missing quadrants', async ({ page }) => {
    const selector = await mountThemeToggle(page, {
      id: 'square-backfill',
      variant: 'square',
      modes: [
        THEME_MODE_PRESETS.defaultLight,
        THEME_MODE_PRESETS.defaultDark,
      ],
    });
    const disabledQuads = page
      .locator(`${selector} [data-mpr-theme-toggle="quad"][data-quad-enabled="false"]`);
    await expect(disabledQuads).toHaveCount(0);
  });

  test('MU-324: square quadrants derive colours from theme-config', async ({ page }) => {
    const customModes = [
      createModeDefinition('polar-light', 'light', 'polar', { squareColor: 'rgb(250, 250, 250)' }),
      createModeDefinition('dawn', 'light', 'dawn', { squareColor: 'rgb(255, 214, 153)' }),
      createModeDefinition('midnight', 'dark', 'midnight', { squareColor: 'rgb(3, 7, 18)' }),
      createModeDefinition('grove', 'dark', 'grove', { squareColor: 'rgb(34, 197, 94)' }),
    ];
    const selector = await mountThemeToggle(page, {
      id: 'square-palette',
      variant: 'square',
      modes: customModes,
    });
    const quadColors = await page.evaluate((controlSelector) => {
      const control = document.querySelector(controlSelector);
      if (!control) {
        return [];
      }
      return Array.from(control.querySelectorAll('[data-mpr-theme-toggle="quad"]')).map((quad) => {
        const styles = window.getComputedStyle(quad);
        return styles.getPropertyValue('background-color').trim();
      });
    }, selector);

    expect(quadColors).toEqual([
      'rgb(250, 250, 250)',
      'rgb(255, 214, 153)',
      'rgb(3, 7, 18)',
      'rgb(34, 197, 94)',
    ]);
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
 * Creates a serialisable theme mode definition.
 * @param {string} value
 * @param {'light' | 'dark'} attributeValue
 * @param {string} palette
 * @param {Record<string, string>} [datasetExtras]
 */
function createModeDefinition(value, attributeValue, palette, datasetExtras) {
  return {
    value,
    attributeValue,
    classList: [attributeValue === 'dark' ? 'theme-dark' : 'theme-light'],
    dataset: Object.assign({ 'data-demo-palette': palette }, datasetExtras || {}),
  };
}

/**
 * Mounts an <mpr-theme-toggle> into the demo page and returns the control selector.
 * @param {import('@playwright/test').Page} page
 * @param {{ id: string, variant: 'switch' | 'square', modes: Array<object> }} config
 * @returns {Promise<string>}
 */
async function mountThemeToggle(page, config) {
  const controlSelector = `#${config.id} [data-mpr-theme-toggle="control"]`;
  await page.evaluate(({ id, variant, modes }) => {
    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
    }
    const toggle = document.createElement('mpr-theme-toggle');
    toggle.setAttribute('id', id);
    toggle.setAttribute('variant', variant);
    const themeConfig = {
      attribute: 'data-demo-theme',
      targets: ['body'],
      initialMode: 'default-light',
      modes,
    };
    toggle.setAttribute('theme-config', JSON.stringify(themeConfig));
    document.body.appendChild(toggle);
  }, { id: config.id, variant: config.variant, modes: config.modes });
  await expect.poll(async () => {
    const count = await page.locator(controlSelector).count();
    return count;
  }).toBeGreaterThan(0);
  return controlSelector;
}
