// @ts-check

const { test, expect } = require('@playwright/test');
const {
  visitDemoPage,
  visitThemeFixturePage,
  captureToggleSnapshot,
  captureColorSnapshots,
  captureDropUpMetrics,
  readEventLogEntries,
  visitFooterTextFixturePage,
  selectors,
} = require('./support/demoPage');

const {
  googleButton,
  headerNavLinks,
  footerThemeControl,
  footerThemeWrapper,
  footerDropupButton,
  footerMenu,
  footerPrefix,
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
    expect(beforeSnapshot.mode).toBe('default-light');

    await clickQuadrant(page, footerThemeControl, 'bottomLeft');
    await page.waitForTimeout(200);

    const darkSnapshot = await captureToggleSnapshot(page, footerThemeControl);
    expect(darkSnapshot.variant).toBe('square');
    expect(darkSnapshot.index).toBe(2);
    expect(darkSnapshot.mode).toBe('default-dark');

    await clickQuadrant(page, footerThemeControl, 'bottomRight');
    await page.waitForTimeout(200);

    const forestSnapshot = await captureToggleSnapshot(page, footerThemeControl);
    expect(forestSnapshot.index).toBe(3);
    expect(forestSnapshot.mode).toBe('forest-dark');
  });

  test('MU-310: footer quadrant selection updates the palette attribute', async ({ page }) => {
    const paletteBefore = await page.evaluate(() => document.body.getAttribute('data-demo-palette'));
    await clickQuadrant(page, footerThemeControl, 'bottomRight');
    await page.waitForTimeout(200);
    const paletteAfter = await page.evaluate(() => document.body.getAttribute('data-demo-palette'));
    expect(paletteAfter).toBe('forest');
    expect(paletteAfter).not.toBe(paletteBefore);
  });

  test('Footer square toggle keeps the body background in sync', async ({ page }) => {
    const initialBackground = await readBodyBackgroundColor(page);
    await clickQuadrant(page, footerThemeControl, 'bottomLeft');
    await page.waitForTimeout(250);
    const darkBackground = await readBodyBackgroundColor(page);
    expect(darkBackground).not.toBe(initialBackground);

    await clickQuadrant(page, footerThemeControl, 'topLeft');
    await page.waitForTimeout(250);
    const resetBackground = await readBodyBackgroundColor(page);
    expect(resetBackground).toBe(initialBackground);
  });

  test('MU-325: square toggle bottom row selects dark blue and pale green palettes', async ({ page }) => {
    await clickQuadrant(page, footerThemeControl, 'bottomLeft');
    await page.waitForTimeout(200);
    const darkSnapshot = await captureToggleSnapshot(page, footerThemeControl);
    const darkPalette = await page.evaluate(() =>
      document.body.getAttribute('data-demo-palette'),
    );
    expect(darkSnapshot.mode).toBe('default-dark');
    expect(darkSnapshot.index).toBe(2);
    expect(darkPalette).toBe('default');

    await clickQuadrant(page, footerThemeControl, 'bottomRight');
    await page.waitForTimeout(200);
    const paleSnapshot = await captureToggleSnapshot(page, footerThemeControl);
    const palePalette = await page.evaluate(() =>
      document.body.getAttribute('data-demo-palette'),
    );
    expect(paleSnapshot.mode).toBe('forest-dark');
    expect(paleSnapshot.index).toBe(3);
    expect(palePalette).toBe('forest');
  });

  test('MU-309: footer toggle updates multiple palettes', async ({ page }) => {
    const beforeColors = await captureColorSnapshots(page, PALETTE_TARGETS);
    await clickQuadrant(page, footerThemeControl, 'bottomLeft');
    await page.waitForTimeout(300);
    const afterColors = await captureColorSnapshots(page, PALETTE_TARGETS);
    PALETTE_TARGETS.forEach((_selector, index) => {
      expect(afterColors[index]).not.toEqual(beforeColors[index]);
    });
  });

  test('MU-325: square toggle wrapper removes the halo and static knob', async ({ page }) => {
    const styleSnapshot = await page.evaluate(
      ({ wrapperSelector, controlSelector }) => {
        const wrapper = document.querySelector(wrapperSelector);
        const control = document.querySelector(controlSelector);
        if (!wrapper || !control) {
          return null;
        }
        const ownerWindow = wrapper.ownerDocument?.defaultView;
        if (!ownerWindow) {
          return null;
        }
        const wrapperStyle = ownerWindow.getComputedStyle(wrapper);
        const pseudo = ownerWindow.getComputedStyle(control, '::after');
        return {
          background: wrapperStyle.getPropertyValue('background-color'),
          borderRadius: wrapperStyle.getPropertyValue('border-radius'),
          padding: wrapperStyle.getPropertyValue('padding'),
          pseudoContent: pseudo.getPropertyValue('content'),
          pseudoWidth: pseudo.getPropertyValue('width'),
        };
      },
      { wrapperSelector: footerThemeWrapper, controlSelector: footerThemeControl },
    );
    expect(styleSnapshot).not.toBeNull();
    if (styleSnapshot) {
      expect(styleSnapshot.background).toBe('rgba(0, 0, 0, 0)');
      expect(styleSnapshot.borderRadius).toBe('0px');
      expect(styleSnapshot.padding).toBe('0px');
      expect(styleSnapshot.pseudoContent).toBe('none');
      expect(styleSnapshot.pseudoWidth).toBe('0px');
    }
  });

  test('MU-111: footer privacy modal opens and closes with provided content', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: /privacy & terms/i, includeHidden: true });
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: /privacy & terms/i }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-mpr-footer="privacy-modal-content"] h1')).toContainText(
      'Privacy Policy',
    );

    await dialog.getByRole('button', { name: /close/i }).click();
    await expect(dialog).toBeHidden();
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
    await expect(page.locator(footerPrefix)).toHaveCount(0);
  });

  test('MU-316: settings button opens an accessible modal shell', async ({ page }) => {
    const settingsButton = page.getByRole('button', { name: /settings/i });
    await expect(settingsButton).toBeVisible();

    const dialog = page.getByRole('dialog', { name: /settings/i, includeHidden: true });
    await expect(dialog).toBeHidden();

    await settingsButton.click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    await dialog.getByRole('button', { name: /close/i }).click();
    await expect(dialog).toBeHidden();
  });
  test('MU-318: settings modal renders default placeholder content', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).click();
    const dialog = page.getByRole('dialog', { name: /settings/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      'Add your settings controls here.',
      { timeout: 1000 },
    );
  });

  test('MU-318: settings modal respects header and footer bounds', async ({ page }) => {
    const chromeBaseline = await captureChromeMetrics(page);
    await page.getByRole('button', { name: /settings/i }).click();
    const dialog = page.getByRole('dialog', { name: /settings/i });
    await expect(dialog).toBeVisible();
    const chrome = getChromeLocators(page);
    await expectModalBetween(
      page,
      dialog,
      chrome.header,
      chrome.footer,
      'settings modal',
    );
    await expectChromeStable(page, chromeBaseline, 'settings modal');
  });

  test('MU-318: privacy modal respects header and footer bounds', async ({ page }) => {
    const chromeBaseline = await captureChromeMetrics(page);
    await page.getByRole('button', { name: /privacy & terms/i }).click();
    const dialog = page.getByRole('dialog', { name: /privacy & terms/i });
    await expect(dialog).toBeVisible();
    const chrome = getChromeLocators(page);
    await expectModalBetween(
      page,
      dialog,
      chrome.header,
      chrome.footer,
      'privacy modal',
    );
    await dialog.getByRole('button', { name: /close/i }).click();
    await expectChromeStable(page, chromeBaseline, 'privacy modal');
  });

  test('MU-317: event log records header and theme interactions', async ({ page }) => {
    const logLocator = page.locator(eventLogEntries);
    await expect(logLocator).toHaveCount(0);

    const settingsDialog = page.getByRole('dialog', { name: /settings/i, includeHidden: true });
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(logLocator).toHaveCount(1, { timeout: 2000 });
    await expect(logLocator.first()).toContainText(/settings/i);
    await settingsDialog.getByRole('button', { name: /close/i }).click();

    await clickQuadrant(page, footerThemeControl, 'bottomRight');
    await page.waitForTimeout(200);
    await expect(logLocator).toHaveCount(2, { timeout: 2000 });
    await expect(logLocator.nth(1)).toContainText(/theme changed/i);

    const privacyDialog = page.getByRole('dialog', { name: /privacy & terms/i, includeHidden: true });
    await page.getByRole('button', { name: /privacy & terms/i }).click();
    await expect(logLocator).toHaveCount(3, { timeout: 2000 });
    await expect(logLocator.nth(2)).toContainText(/privacy/i);
    await privacyDialog.getByRole('button', { name: /close/i }).click();

    const entries = await readEventLogEntries(page);
    expect(entries.length).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Footer label variants', () => {
  test.beforeEach(async ({ page }) => {
    await visitFooterTextFixturePage(page);
  });

  test('MU-319: text-only footer renders a single prefix label', async ({ page }) => {
    const prefix = page.locator(footerPrefix);
    await expect(prefix).toHaveCount(1);
    await expect(prefix).toHaveText(/Built by Marco Polo Research Lab/);
    await expect(page.locator(footerDropupButton)).toHaveCount(0);
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

  test('MU-321: default toggle knob aligns without halos', async ({ page }) => {
    const control = footerThemeControl;
    const initialSnapshot = await captureToggleSnapshot(page, control);
    expect(initialSnapshot.variant).toBe('switch');
    expect(initialSnapshot.boxShadow).toBe('none');
    expect(Math.abs(initialSnapshot.translateX)).toBeLessThanOrEqual(0.5);
    expect(initialSnapshot.borderWidth).toBe(0);

    await page.locator(control).first().click();
    await page.waitForTimeout(300);

    const toggledSnapshot = await captureToggleSnapshot(page, control);
    expect(toggledSnapshot.boxShadow).toBe('none');
    expect(Math.abs(toggledSnapshot.translateX - toggledSnapshot.travelDistance)).toBeLessThanOrEqual(0.5);
    expect(toggledSnapshot.borderWidth).toBe(0);
  });

  test('MU-326: default toggle displays a knob-only focus ring', async ({ page }) => {
    const control = page.locator(footerThemeControl).first();
    await control.focus();
    const snapshot = await captureToggleSnapshot(page, footerThemeControl);
    expect(snapshot.variant).toBe('switch');
    expect(snapshot.borderWidth).toBe(0);
    expect(snapshot.boxShadow === 'none').toBeFalsy();
  });

  test('MU-322: default toggle cycles only two modes', async ({ page }) => {
    const toggle = page.locator(footerThemeControl).first();
    await expect(toggle).toBeVisible();
    const modes = [];
    for (let index = 0; index < 4; index += 1) {
      await toggle.click();
      await page.waitForTimeout(200);
      const mode = await page.evaluate(() => {
        const control = document.querySelector('[data-mpr-footer="theme-toggle"] [data-mpr-theme-toggle="control"]');
        return control ? control.getAttribute('data-mpr-theme-mode') : null;
      });
      modes.push(mode);
    }
    const uniqueModes = Array.from(new Set(modes));
    expect(uniqueModes.length).toBe(2);
    expect(modes[0]).toBe(modes[2]);
    expect(modes[1]).toBe(modes[3]);
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

/**
 * Provides locators for the sticky header/footer used as modal boundaries.
 * @param {import('@playwright/test').Page} page
 * @returns {{ header: import('@playwright/test').Locator, footer: import('@playwright/test').Locator }}
 */
function getChromeLocators(page) {
  return {
    header: page.getByRole('banner').first(),
    footer: page.getByRole('contentinfo').first(),
  };
}

/**
 * Ensures a modal dialog is visually constrained between the sticky header and footer.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} modalLocator
 * @param {import('@playwright/test').Locator} headerLocator
 * @param {import('@playwright/test').Locator} footerLocator
 * @param {string} label
 */
async function expectModalBetween(page, modalLocator, headerLocator, footerLocator, label) {
  await Promise.all([
    modalLocator.waitFor({ state: 'visible' }),
    headerLocator.waitFor({ state: 'visible' }),
    footerLocator.waitFor({ state: 'visible' }),
  ]);
  const [modalRect, headerRect, footerRect] = await Promise.all([
    modalLocator.boundingBox(),
    headerLocator.boundingBox(),
    footerLocator.boundingBox(),
  ]);
  expect(modalRect).not.toBeNull();
  expect(headerRect).not.toBeNull();
  expect(footerRect).not.toBeNull();
  if (!modalRect || !headerRect || !footerRect) {
    throw new Error(`Unable to measure ${label}`);
  }
  const tolerance = 0.5;
  const minGap = 8;
  const modalTop = modalRect.y;
  const modalBottom = modalRect.y + modalRect.height;
  const headerBottom = headerRect.y + headerRect.height;
  const footerTop = footerRect.y;
  expect(modalTop).toBeGreaterThanOrEqual(headerBottom + minGap - tolerance);
  expect(modalBottom).toBeLessThanOrEqual(footerTop - minGap + tolerance);
}

/**
 * Captures the sticky header/footer geometry for stability assertions.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ headerRect: import('@playwright/test').BoundingBox, footerRect: import('@playwright/test').BoundingBox }>}
 */
async function captureChromeMetrics(page) {
  const chrome = getChromeLocators(page);
  const [headerRect, footerRect] = await Promise.all([
    chrome.header.boundingBox(),
    chrome.footer.boundingBox(),
  ]);
  if (!headerRect || !footerRect) {
    throw new Error('Unable to capture header/footer metrics');
  }
  return { headerRect, footerRect };
}

/**
 * Verifies the header/footer positions remain unchanged after modal interactions.
 * @param {import('@playwright/test').Page} page
 * @param {{ headerRect: import('@playwright/test').BoundingBox, footerRect: import('@playwright/test').BoundingBox }} baseline
 * @param {string} label
 */
async function expectChromeStable(page, baseline, label) {
  const next = await captureChromeMetrics(page);
  const tolerance = 1;

  const assertWithinTolerance = (before, after, description) => {
    const delta = Math.abs(after - before);
    expect(delta).toBeLessThanOrEqual(tolerance);
  };

  assertWithinTolerance(baseline.headerRect.y, next.headerRect.y, `${label} header top`);
  assertWithinTolerance(baseline.headerRect.height, next.headerRect.height, `${label} header height`);
  assertWithinTolerance(baseline.footerRect.y, next.footerRect.y, `${label} footer top`);
  assertWithinTolerance(baseline.footerRect.height, next.footerRect.height, `${label} footer height`);
}
