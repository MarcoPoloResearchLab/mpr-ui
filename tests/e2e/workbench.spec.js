// @ts-check

const { test, expect } = require('@playwright/test');
const {
  visitWorkbenchFixture,
  visitThemeFixturePage,
  captureToggleSnapshot,
  captureColorSnapshots,
  captureDropUpMetrics,
  readEventLogEntries,
  visitFooterTextFixturePage,
  visitBandFixturePage,
  visitCardFixturePage,
  selectors,
} = require('./support/fixturePage');

const {
  googleButton,
  headerNavLinks,
  footerThemeControl,
  footerThemeWrapper,
  footerDropupButton,
  footerMenu,
  footerPrefix,
  eventLogEntries,
  bootstrapGrid,
  bandCardEventLog,
  bandCardIntegration,
  standaloneCard,
  standaloneCardEventEntries,
} = selectors;

const PALETTE_TARGETS = [
  'header.mpr-header',
  '[data-layout-section="hero-title"]',
  '#event-log',
  'footer.mpr-footer',
];

test.describe('Workbench behaviours', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.title.includes('MU-203')) {
      await page.addInitScript(() => {
        window.__bootstrapDropdownCalled = 0;
        function instrumentBootstrapDropdown() {
          const namespace = window.bootstrap || (window.bootstrap = {});
          const dropdownNamespace = namespace.Dropdown || (namespace.Dropdown = {});
          const original = dropdownNamespace.getOrCreateInstance;
          dropdownNamespace.getOrCreateInstance = function patchedDropdown(...args) {
            window.__bootstrapDropdownCalled += 1;
            if (typeof original === 'function') {
              return original.apply(this, args);
            }
            return undefined;
          };
        }
        window.__instrumentBootstrapDropdown = instrumentBootstrapDropdown;
        instrumentBootstrapDropdown();
        document.addEventListener('DOMContentLoaded', instrumentBootstrapDropdown, { once: true });
      });
    }
    await visitWorkbenchFixture(page);
    if (testInfo.title.includes('MU-203')) {
      await page.evaluate(() => {
        if (typeof window.__instrumentBootstrapDropdown === 'function') {
          window.__instrumentBootstrapDropdown();
        }
      });
    }
  });

  test('MU-367: header and footer shrink when size="small"', async ({ page }) => {
    const headerHost = page.locator('mpr-header#workbench-header');
    const footerHost = page.locator('mpr-footer#page-footer');
    await expect(headerHost).toBeVisible();
    await expect(footerHost).toBeVisible();

    await headerHost.evaluate(element => element.setAttribute('size', 'normal'));
    await footerHost.evaluate(element => element.setAttribute('size', 'normal'));

    const headerNormal = await headerHost.evaluate(element => element.offsetHeight);
    const footerNormal = await footerHost.evaluate(element => {
      const footer = element.querySelector('footer.mpr-footer');
      return footer ? footer.getBoundingClientRect().height : 0;
    });

    await headerHost.evaluate(element => element.setAttribute('size', 'small'));
    await footerHost.evaluate(element => element.setAttribute('size', 'small'));

    const headerSmall = await headerHost.evaluate(element => element.offsetHeight);
    const footerSmall = await footerHost.evaluate(element => {
      const footer = element.querySelector('footer.mpr-footer');
      return footer ? footer.getBoundingClientRect().height : 0;
    });

    const headerRatio = headerSmall / headerNormal;
    const footerRatio = footerSmall / footerNormal;
    expect(headerSmall).toBeLessThan(headerNormal);
    expect(headerRatio).toBeGreaterThan(0.6);
    expect(headerRatio).toBeLessThan(0.8);
    expect(footerSmall).toBeLessThan(footerNormal);
    expect(footerRatio).toBeGreaterThan(0.6);
    expect(footerRatio).toBeLessThan(0.8);
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

  test('MU-201: square footer switcher collapses into a single-quadrant footprint', async ({ page }) => {
    const footerHost = 'mpr-footer#page-footer';
    async function readMetrics() {
      return page.$eval(footerThemeControl, (control) => {
        const grid = control.querySelector('[data-mpr-theme-toggle="grid"]');
        const dot = control.querySelector('[data-mpr-theme-toggle="dot"]');
        const ownerWindow = control.ownerDocument?.defaultView;
        if (!grid || !dot || !ownerWindow) {
          return null;
      }
      const controlStyles = ownerWindow.getComputedStyle(control);
      const dotStyles = ownerWindow.getComputedStyle(dot);
      const gridRect = grid.getBoundingClientRect();
      const dotRect = dot.getBoundingClientRect();
      return {
        size: controlStyles.getPropertyValue('--mpr-theme-square-size').trim(),
        dotSize: dotStyles.getPropertyValue('inline-size').trim(),
        width: gridRect.width,
        height: gridRect.height,
        dotWidth: dotRect.width,
        dotHeight: dotRect.height,
      };
    });
    }

    async function setFooterSize(nextSize) {
      await page.evaluate(
        ({ selector, size }) => {
          const footer = document.querySelector(selector);
          if (footer) {
            footer.setAttribute('size', size);
          }
        },
        { selector: footerHost, size: nextSize },
      );
      await page.waitForFunction(
        ({ selector, size }) => {
          const host = document.querySelector(selector);
          if (!host) {
            return false;
          }
          const root = host.querySelector('footer.mpr-footer');
          if (!root) {
            return false;
          }
          const hasSmall = root.classList.contains('mpr-footer--small');
          return size === 'small' ? hasSmall : !hasSmall;
        },
        { selector: footerHost, size: nextSize },
      );
    }

    await setFooterSize('normal');
    const normalMetrics = await readMetrics();

    await setFooterSize('small');
    const smallMetrics = await readMetrics();

    expect(normalMetrics).not.toBeNull();
    expect(smallMetrics).not.toBeNull();
    if (normalMetrics && smallMetrics) {
      expect(smallMetrics.width / normalMetrics.width).toBeCloseTo(0.7, 1);
      expect(smallMetrics.height / normalMetrics.height).toBeCloseTo(0.7, 1);
      expect(smallMetrics.dotWidth / normalMetrics.dotWidth).toBeCloseTo(0.7, 1);
      expect(smallMetrics.dotHeight / normalMetrics.dotHeight).toBeCloseTo(0.7, 1);
    }

    await setFooterSize('small');
  });

  test('MU-310: footer quadrant selection updates the palette attribute', async ({ page }) => {
    const paletteBefore = await page.evaluate(() => document.body.getAttribute('data-test-palette'));
    await clickQuadrant(page, footerThemeControl, 'bottomRight');
    await page.waitForTimeout(200);
    const paletteAfter = await page.evaluate(() => document.body.getAttribute('data-test-palette'));
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
      document.body.getAttribute('data-test-palette'),
    );
    expect(darkSnapshot.mode).toBe('default-dark');
    expect(darkSnapshot.index).toBe(2);
    expect(darkPalette).toBe('default');

    await clickQuadrant(page, footerThemeControl, 'bottomRight');
    await page.waitForTimeout(200);
    const paleSnapshot = await captureToggleSnapshot(page, footerThemeControl);
    const palePalette = await page.evaluate(() =>
      document.body.getAttribute('data-test-palette'),
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

  test('MU-203: footer drop-up toggles even when Bootstrap namespace exists', async ({ page }) => {
    const dropupButton = page.locator(footerDropupButton);
    await dropupButton.click();
    await expect(page.locator(footerMenu)).toHaveClass(/mpr-footer__menu--open/);
    await dropupButton.click();
    await expect(page.locator(footerMenu)).not.toHaveClass(/mpr-footer__menu--open/);
    const bootstrapCalls = await page.evaluate(() => window.__bootstrapDropdownCalled);
    expect(bootstrapCalls).toBe(0);
  });

  test('MU-204: Bootstrap grid coexists with the footer drop-up', async ({ page }) => {
    const grid = page.locator(bootstrapGrid);
    await expect(grid).toBeVisible();
    const row = grid.locator('.row').first();
    await expect(row).toBeVisible();
    const display = await row.evaluate((element) => {
      const ownerWindow = element.ownerDocument?.defaultView;
      return ownerWindow ? ownerWindow.getComputedStyle(element).display : '';
    });
    expect(display).toBe('flex');
    const bootstrapDetected = await page.evaluate(() => Boolean(window.bootstrap));
    expect(bootstrapDetected).toBe(true);

    const dropupButton = page.locator(footerDropupButton);
    await dropupButton.click();
    await expect(page.locator(footerMenu)).toHaveClass(/mpr-footer__menu--open/);
    await dropupButton.click();
    await expect(page.locator(footerMenu)).not.toHaveClass(/mpr-footer__menu--open/);
  });

  test('MU-204: hero title and manual bands render as top-level siblings', async ({ page }) => {
    const heroTitle = page.locator('[data-layout-section="hero-title"] h1');
    await expect(heroTitle).toHaveText('MPR-UI Demo');

    const topLevelBands = page.locator('body > mpr-band');
    await expect(topLevelBands).toHaveCount(2);
    await expect(topLevelBands.first()).toHaveAttribute('data-mpr-band-layout', 'manual');
    await expect(topLevelBands.nth(1)).toHaveAttribute('data-mpr-band-layout', 'manual');
    const firstLayoutAttr = await topLevelBands.first().getAttribute('layout');
    const secondLayoutAttr = await topLevelBands.nth(1).getAttribute('layout');
    expect(firstLayoutAttr).toBeNull();
    expect(secondLayoutAttr).toBeNull();
    await expect(topLevelBands.first().locator('[data-mpr-band="heading"]')).toHaveCount(0);
    await expect(topLevelBands.nth(1).locator('[data-mpr-band="heading"]')).toHaveCount(0);

    await expect(page.locator(bandCardEventLog)).toBeVisible();
    await expect(page.locator(bandCardIntegration)).toBeVisible();
  });

  test('MU-421: bands inherit the active page theme', async ({ page }) => {
    const readBandBackground = () =>
      page.locator('mpr-band#band-observability').evaluate((element) => {
        const ownerWindow = element.ownerDocument?.defaultView;
        if (!ownerWindow) {
          throw new Error('Missing window for band background snapshot');
        }
        return ownerWindow.getComputedStyle(element).backgroundColor;
      });

    const initialBackground = await readBandBackground();
    await page.evaluate(() => {
      if (window.MPRUI && typeof window.MPRUI.setThemeMode === 'function') {
        window.MPRUI.setThemeMode('default-dark');
      }
    });
    await page.waitForFunction(
      () => document.body.getAttribute('data-test-theme') === 'dark',
    );
    await page.waitForTimeout(200);
    const toggledBackground = await readBandBackground();
    expect(toggledBackground).not.toBe(initialBackground);

    const topLineColor = await page.locator('mpr-band#band-observability').evaluate((element) => {
      const ownerWindow = element.ownerDocument?.defaultView;
      if (!ownerWindow) {
        throw new Error('Missing window for band line snapshot');
      }
      return ownerWindow.getComputedStyle(element, '::before').backgroundColor;
    });
    expect(topLineColor).not.toMatch(/rgba?\(0,\s*0,\s*0,\s*0(?:\.0+)?\)/);
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

  test('MU-200: sticky header and footer stay pinned during scroll', async ({ page }) => {
    await page.evaluate(() => {
      const filler = document.createElement('div');
      filler.style.height = '2000px';
      filler.setAttribute('data-test', 'scroll-filler');
      document.body.appendChild(filler);
    });

    const chrome = getChromeLocators(page);
    await chrome.header.waitFor({ state: 'visible' });
    await chrome.footer.waitFor({ state: 'visible' });

    await page.evaluate(() => window.scrollTo(0, 0));

    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(250);

    expect(await isLocatorInViewport(chrome.header)).toBe(true);
    expect(await isLocatorInViewport(chrome.footer)).toBe(true);
  });

  test('MU-200: non-sticky header and footer scroll with content', async ({ page }) => {
    await page.evaluate(() => {
      const filler = document.createElement('div');
      filler.style.height = '2000px';
      filler.setAttribute('data-test', 'scroll-filler');
      document.body.appendChild(filler);
    });

    await page.evaluate(() => {
      const header = document.querySelector('mpr-header#workbench-header');
      const footer = document.querySelector('mpr-footer#page-footer');
      if (header) {
        header.setAttribute('sticky', 'false');
      }
      if (footer) {
        footer.setAttribute('sticky', 'false');
      }
    });

    const chrome = getChromeLocators(page);
    await chrome.header.waitFor({ state: 'visible' });
    await chrome.footer.waitFor({ state: 'visible' });

    await page.evaluate(() => window.scrollTo(0, 0));

    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.75));
    await page.waitForTimeout(300);

    expect(await isLocatorInViewport(chrome.header)).toBe(false);
    const footerScrolledAway = await scrollFooterUntilHidden(page);
    expect(footerScrolledAway).toBe(true);
  });

  test('MU-422: sticky footer is visible without scrolling', async ({ page }) => {
    const chrome = getChromeLocators(page);
    await chrome.footer.waitFor({ state: 'visible' });
    expect(await isLocatorInViewport(chrome.footer)).toBe(true);
  });

  test('MU-421: sticky attribute respects explicit boolean values', async ({ page }) => {
    await page.evaluate(() => {
      const filler = document.createElement('div');
      filler.style.height = '2000px';
      filler.setAttribute('data-test', 'scroll-filler');
      document.body.appendChild(filler);
    });

    await page.evaluate(() => {
      const header = document.querySelector('mpr-header#workbench-header');
      const footer = document.querySelector('mpr-footer#page-footer');
      if (header) {
        header.setAttribute('sticky', 'FALSE');
      }
      if (footer) {
        footer.setAttribute('sticky', 'FALSE');
      }
    });

    const chrome = getChromeLocators(page);
    await chrome.header.waitFor({ state: 'visible' });
    await chrome.footer.waitFor({ state: 'visible' });
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.75));
    await page.waitForTimeout(200);
    expect(await isLocatorInViewport(chrome.header)).toBe(false);
    const footerScrolledAway = await scrollFooterUntilHidden(page);
    expect(footerScrolledAway).toBe(true);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const header = document.querySelector('mpr-header#workbench-header');
      const footer = document.querySelector('mpr-footer#page-footer');
      if (header) {
        header.setAttribute('sticky', 'TRUE');
      }
      if (footer) {
        footer.setAttribute('sticky', 'TRUE');
      }
    });

    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.75));
    await page.waitForTimeout(200);
    expect(await isLocatorInViewport(chrome.header)).toBe(true);
    const footerStayedVisible = await scrollFooterUntilHidden(page);
    expect(footerStayedVisible).toBe(false);
  });

  test('MU-204: bands span all categories and separate observability cards', async ({ page }) => {
    const bands = page.locator('mpr-band[data-mpr-band-category]');
    const categories = await bands.evaluateAll((elements) =>
      elements
        .map((element) => element.getAttribute('data-mpr-band-category') || '')
        .filter(Boolean),
    );
    const uniqueCategories = Array.from(new Set(categories)).sort();
    expect(uniqueCategories).toEqual(['research', 'tools']);

    const eventLogCard = page.locator(bandCardEventLog);
    const integrationCard = page.locator(bandCardIntegration);
    await expect(eventLogCard).toBeVisible();
    await expect(integrationCard).toBeVisible();

    const eventCategory = await eventLogCard.evaluate(
      (node) => node.closest('mpr-band')?.getAttribute('data-mpr-band-category') || '',
    );
    const integrationCategory = await integrationCard.evaluate(
      (node) => node.closest('mpr-band')?.getAttribute('data-mpr-band-category') || '',
    );
    expect(eventCategory).not.toBe('');
    expect(integrationCategory).not.toBe('');
    expect(eventCategory).not.toBe(integrationCategory);
  });
});

test.describe('Band fixture behaviours', () => {
  test.beforeEach(async ({ page }) => {
    await visitBandFixturePage(page);
  });

  test('MU-331: bands preserve manual content without layout overrides', async ({ page }) => {
    const band = page.locator('mpr-band#fixture-band');
    await expect(band).toHaveAttribute('data-mpr-band-category', 'products');
    await expect(band).toHaveAttribute('data-mpr-band-layout', 'manual');
    await expect(band).toHaveAttribute('data-mpr-band-count', '0');
    await expect(band).toHaveAttribute('data-mpr-band-empty', 'false');
    await expect(band.locator('> [data-test="manual-band-content"]')).toHaveCount(1);
    await expect(band.locator('[data-test="manual-band-card"]')).toHaveCount(1);
    await expect(band.locator('[data-mpr-band="heading"]')).toHaveCount(0);
    await expect(band.locator('[data-mpr-band-card]')).toHaveCount(0);
  });

  test('MU-331: updating band attributes keeps the manual grid intact', async ({ page }) => {
    const manualCard = page.locator('[data-test="manual-band-card"]');
    await expect(manualCard).toBeVisible();
    await page.evaluate(() => {
      const band = document.querySelector('mpr-band#fixture-band');
      if (band) {
        band.setAttribute('category', 'tools');
      }
    });
    await expect(manualCard).toBeVisible();
    const category = await page
      .locator('mpr-band#fixture-band')
      .getAttribute('data-mpr-band-category');
    expect(category).toBe('tools');
  });
});

test.describe('Card fixture behaviours', () => {
  test.beforeEach(async ({ page }) => {
    await visitCardFixturePage(page);
  });

  test('mpr-card renders title and action link', async ({ page }) => {
    const card = page.locator(standaloneCard);
    await expect(card).toBeVisible();
    await expect(card.locator('.mpr-band__card-face--front h3').first()).toContainText(
      'Standalone Card',
    );
    await expect(
      card.locator('.mpr-band__card-face--front .mpr-band__action').first(),
    ).toHaveAttribute('href', /mprlab/);
  });

  test('mpr-card flips and emits toggle events', async ({ page }) => {
    const card = page.locator(standaloneCard);
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(standaloneCardEventEntries)).toHaveCount(1);
    const subscribeOverlay = page.locator('[data-mpr-band-subscribe-loaded="true"]');
    await expect(subscribeOverlay).toBeVisible();
  });

  test('mpr-card host becomes the rendered card', async ({ page }) => {
    const hostSnapshot = await page.locator('mpr-card#fixture-card').evaluate((element) => {
      const ownerWindow = element.ownerDocument?.defaultView;
      if (!ownerWindow) {
        throw new Error('Missing window for host snapshot');
      }
      const computed = ownerWindow.getComputedStyle(element);
      return {
        classList: Array.from(element.classList),
        backgroundColor: computed.backgroundColor,
        nestedCards: element.querySelectorAll('.mpr-band__card').length,
      };
    });
    expect(hostSnapshot.classList).toContain('mpr-band__card');
    expect(hostSnapshot.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(hostSnapshot.nestedCards).toBe(0);
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

  test('MU-316: default toggle flips the body data attribute for theme mode', async ({ page }) => {
    const toggle = page.locator(footerThemeControl).first();
    await expect(toggle).toBeVisible();

    const readThemeMode = () =>
      page.evaluate(() => document.body.getAttribute('data-mpr-theme'));
    const initialMode = await readThemeMode();
    const baselineMode = initialMode || 'light';
    await toggle.click();
    await page.waitForTimeout(200);
    const toggledMode = await readThemeMode();
    const expectedToggled = baselineMode === 'dark' ? 'light' : 'dark';
    expect(toggledMode).toBe(expectedToggled);

    await toggle.click();
    await page.waitForTimeout(200);
    const resetMode = await readThemeMode();
    expect(resetMode).toBe(baselineMode);
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
  await control.scrollIntoViewIfNeeded();
  const box = await control.boundingBox();
  if (!box) {
    throw new Error('Square toggle bounding box is missing');
  }
  const margin = 6;
  const isRight = quadrant === 'topRight' || quadrant === 'bottomRight';
  const isBottom = quadrant === 'bottomRight' || quadrant === 'bottomLeft';
  const offsetX = isRight ? box.width - margin : margin;
  const offsetY = isBottom ? box.height - margin : margin;
  await control.click({ position: { x: offsetX, y: offsetY } });
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
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(50);
  const chrome = getChromeLocators(page);
  const [headerRect, footerRect, viewportHeight, scrollHeight] = await Promise.all([
    chrome.header.evaluate((element) => {
      if (!element || typeof element.getBoundingClientRect !== 'function') {
        return null;
      }
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
    chrome.footer.evaluate((element) => {
      if (!element || typeof element.getBoundingClientRect !== 'function') {
        return null;
      }
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
    page.evaluate(() => window.innerHeight || document.documentElement.clientHeight || 0),
    page.evaluate(() => {
      if (document.body && typeof document.body.scrollHeight === 'number') {
        return document.body.scrollHeight;
      }
      return document.documentElement?.scrollHeight || 0;
    }),
  ]);
  if (!headerRect || !footerRect) {
    throw new Error('Unable to capture header/footer metrics');
  }
  return { headerRect, footerRect, viewportHeight, scrollHeight };
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

  expect(next.headerRect.y).toBeLessThanOrEqual(tolerance);
  const scrollDelta = Math.abs(baseline.scrollHeight - next.scrollHeight);
  expect(scrollDelta).toBeLessThanOrEqual(32);
  assertWithinTolerance(baseline.headerRect.height, next.headerRect.height, `${label} header height`);
  assertWithinTolerance(baseline.footerRect.height, next.footerRect.height, `${label} footer height`);
}

/**
 * Determines whether a locator's bounding rectangle intersects the current viewport.
 * @param {import('@playwright/test').Locator} locator
 * @returns {Promise<boolean>}
 */
async function isLocatorInViewport(locator) {
  return locator.evaluate((element) => {
    if (!element || typeof element.getBoundingClientRect !== 'function') {
      return false;
    }
    const rect = element.getBoundingClientRect();
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0;
    if (!viewportWidth || !viewportHeight) {
      return false;
    }
    const horizontallyVisible = rect.right > 0 && rect.left < viewportWidth;
    const verticallyVisible = rect.bottom > 0 && rect.top < viewportHeight;
    return horizontallyVisible && verticallyVisible;
  });
}

/**
 * Scrolls the page in increments until the footer leaves the viewport.
 * Returns true when the footer is no longer visible; false if it remains visible after attempts.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
async function scrollFooterUntilHidden(page) {
  return page.evaluate(() => {
    const footer = document.querySelector('mpr-footer#page-footer footer.mpr-footer');
    if (!footer || typeof footer.getBoundingClientRect !== 'function') {
      return false;
    }
    const viewportHeight =
      window.innerHeight || document.documentElement?.clientHeight || document.body?.clientHeight || 0;
    const maxSteps = 20;
    for (let index = 0; index < maxSteps; index += 1) {
      window.scrollBy(0, viewportHeight / 2);
      const rect = footer.getBoundingClientRect();
      if (rect.top >= viewportHeight) {
        return true;
      }
    }
    return false;
  });
}
