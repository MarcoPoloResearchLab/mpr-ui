// @ts-check
const { test, expect } = require('./support/browserCoverage');
const {
  visitFullLayoutFixture,
  visitThemeFixturePage,
  captureToggleSnapshot,
} = require('./support/fixturePage');

test.describe('Size parameter support', () => {
  test.beforeEach(async ({ page }) => {
    await visitFullLayoutFixture(page);
  });

  test('MU-116: header accepts size="small" and applies smaller styling', async ({ page }) => {
    const headerHost = page.locator('mpr-header');
    await expect(headerHost).toBeVisible();

    await headerHost.evaluate(el => el.setAttribute('size', 'normal'));
    const initialHeight = await headerHost.evaluate(el => el.offsetHeight);

    await headerHost.evaluate(el => el.setAttribute('size', 'small'));
    const internalHeader = headerHost.locator('.mpr-header');
    await expect(internalHeader).toHaveClass(/mpr-header--small/);
    const smallHeight = await headerHost.evaluate(el => el.offsetHeight);
    expect(smallHeight).toBeLessThan(initialHeight);
    const headerRatio = smallHeight / initialHeight;
    expect(headerRatio).toBeGreaterThan(0.75);
    expect(headerRatio).toBeLessThan(0.95);

    await headerHost.evaluate(el => el.setAttribute('size', 'normal'));
    await expect(internalHeader).not.toHaveClass(/mpr-header--small/);
    const revertedHeight = await headerHost.evaluate(el => el.offsetHeight);
    expect(revertedHeight).toBeCloseTo(initialHeight, 0);
  });

  test('MU-116: footer accepts size="small" and applies smaller styling', async ({ page }) => {
    await visitThemeFixturePage(page);
    const footerHost = page.locator('mpr-footer#fixture-footer');
    await expect(footerHost).toBeVisible();

    // Reset to normal explicitely
    await footerHost.evaluate(el => el.setAttribute('size', 'normal'));

    const internalFooter = footerHost.locator('footer.mpr-footer');

    // Snapshot initial padding
    const initialMetrics = await internalFooter.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        paddingTop: style.paddingTop,
        height: el.offsetHeight,
      };
    });
    const initialPadding = initialMetrics.paddingTop;
    const initialHeight = initialMetrics.height;

    // Set size="small"
    await footerHost.evaluate(el => el.setAttribute('size', 'small'));

    // Check for class
    await expect(internalFooter).toHaveClass(/mpr-footer--small/);

    // Check padding decreased
    const smallMetrics = await internalFooter.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        paddingTop: style.paddingTop,
        height: el.offsetHeight,
      };
    });
    const smallPadding = smallMetrics.paddingTop;

    const initialVal = parseFloat(initialPadding);
    const smallVal = parseFloat(smallPadding);
    
    // The compact scale keeps controls readable while reducing chrome height.
    expect(smallVal).toBeLessThan(initialVal);
    expect(smallVal).toBeCloseTo(initialVal * 0.82, 0);
    const footerRatio = smallMetrics.height / initialHeight;
    expect(footerRatio).toBeCloseTo(0.82, 1);

    // Revert
    await footerHost.evaluate(el => el.setAttribute('size', 'normal'));
    await expect(internalFooter).not.toHaveClass(/mpr-footer--small/);
  });

  test('MU-336: footer toggle (switch) in small mode uses single knob and correct size', async ({ page }) => {
    const footerHost = page.locator('mpr-footer#page-footer');
    await expect(footerHost).toBeVisible();

    await footerHost.evaluate(el => el.setAttribute('theme-switcher', 'toggle'));
    await footerHost.evaluate(el => el.setAttribute('size', 'normal'));

    const toggleSelector = 'input[type="checkbox"][data-mpr-theme-toggle="control"]';
    const toggle = footerHost.locator(toggleSelector);
    await expect(toggle).toBeVisible();

    const defaultBox = await toggle.boundingBox();
    expect(defaultBox).not.toBeNull();

    await footerHost.evaluate(el => el.setAttribute('size', 'small'));

    const box = await toggle.boundingBox();
    expect(box).not.toBeNull();
    if (box && defaultBox) {
      expect(box.width / defaultBox.width).toBeCloseTo(0.82, 1);
      expect(box.height / defaultBox.height).toBeCloseTo(0.82, 1);
    }

    const initialState = await toggle.evaluate(el => el.checked);
    const initialSnapshot = await captureToggleSnapshot(page, toggleSelector);
    expect(initialSnapshot.variant).toBe('switch');
    expect(initialSnapshot.boxShadow).toBe('none');

    await toggle.click();
    await page.waitForTimeout(200);

    const toggledSnapshot = await captureToggleSnapshot(page, toggleSelector);
    expect(toggledSnapshot.boxShadow).toBe('none');
    const toggledState = await toggle.evaluate(el => el.checked);
    expect(toggledState).not.toBe(initialState);
  });

  test('MU-336: footer toggle (square) in small mode should be smaller', async ({ page }) => {
    const footerHost = page.locator('mpr-footer#page-footer');
    await expect(footerHost).toBeVisible();

    await footerHost.evaluate(el => el.setAttribute('theme-switcher', 'square'));
    await footerHost.evaluate(el => el.setAttribute('size', 'normal'));

    const toggle = footerHost.locator('button[data-mpr-theme-toggle="control"][data-variant="square"]');
    await expect(toggle).toBeVisible();

    const normalGrid = toggle.locator('[data-mpr-theme-toggle="grid"]');
    const normalBox = await normalGrid.boundingBox();
    expect(normalBox).not.toBeNull();

    await footerHost.evaluate(el => el.setAttribute('size', 'small'));

    const smallBox = await normalGrid.boundingBox();
    
    expect(smallBox).not.toBeNull();
    if (smallBox && normalBox) {
        expect(smallBox.width / normalBox.width).toBeCloseTo(0.82, 1);
    }
  });

});

test.describe('Authentication provider control sizing', () => {
  test('B054 and B055: provider controls stay aligned and contained at wide and narrow header widths', async ({
    page,
  }) => {
    await visitFullLayoutFixture(page);

    const headerHost = page.locator('mpr-header#test-header');
    await headerHost.evaluate((headerElement) => {
      headerElement.setAttribute(
        'auth-config',
        JSON.stringify({
          tauthUrl: 'https://auth.fixture.test',
          tenantId: 'test-tenant',
          logoutPath: '/auth/logout',
          sessionPath: '/auth/session',
          providers: {
            google: {
              enabled: true,
              clientId: 'fixture-google-client',
              loginPath: '/auth/google',
              noncePath: '/auth/nonce',
            },
            apple: {
              enabled: true,
              startPath: '/auth/apple/start',
              returnTo: 'current-url',
              label: 'Sign in with Apple',
            },
            password: { enabled: true },
          },
          password: {
            loginPath: '/auth/password/login',
            signupPath: '/auth/password/signup',
            verifyEmailPath: '/auth/password/verify-email',
            resetStartPath: '/auth/password/reset/start',
            resetCompletePath: '/auth/password/reset/complete',
          },
        }),
      );
    });

    const controls = headerHost.locator('.mpr-auth-actions__controls');
    const providerButtons = controls.locator('[data-mpr-auth-action]');
    await expect(providerButtons).toHaveCount(3);

    const viewportCases = [
      { name: 'wide header', width: 1280, height: 800 },
      { name: 'narrow header', width: 390, height: 844 },
    ];

    for (const viewportCase of viewportCases) {
      await page.setViewportSize({ width: viewportCase.width, height: viewportCase.height });

      const metrics = await controls.evaluate((controlsElement) => {
        const controlsBounds = controlsElement.getBoundingClientRect();
        const buttons = Array.from(
          controlsElement.querySelectorAll('[data-mpr-auth-action]'),
        );
        return {
          clientWidth: controlsElement.clientWidth,
          scrollWidth: controlsElement.scrollWidth,
          buttons: buttons.map((buttonElement) => {
            const buttonBounds = buttonElement.getBoundingClientRect();
            const accessibleElement = buttonElement.matches('button')
              ? buttonElement
              : buttonElement.querySelector('button, [role="button"]');
            const labelElement = buttonElement.querySelector(
              '[data-mpr-auth-provider-label]',
            );
            const labelStyle = labelElement
              ? window.getComputedStyle(labelElement)
              : null;
            const buttonStyle = window.getComputedStyle(buttonElement);
            return {
              provider: buttonElement.getAttribute('data-mpr-auth-action'),
              accessibleName: accessibleElement
                ? accessibleElement.getAttribute('aria-label') || accessibleElement.textContent?.trim()
                : '',
              left: buttonBounds.left,
              right: buttonBounds.right,
              width: buttonBounds.width,
              height: buttonBounds.height,
              containerLeft: controlsBounds.left,
              containerRight: controlsBounds.right,
              backgroundColor: buttonStyle.backgroundColor,
              borderColor: buttonStyle.borderTopColor,
              borderStyle: buttonStyle.borderTopStyle,
              borderWidth: buttonStyle.borderTopWidth,
              labelPosition: labelStyle ? labelStyle.position : '',
              labelWidth: labelStyle ? Number.parseFloat(labelStyle.width) : 0,
            };
          }),
        };
      });

      expect(metrics.scrollWidth, viewportCase.name).toBeLessThanOrEqual(
        metrics.clientWidth + 1,
      );
      expect(
        new Set(metrics.buttons.map((buttonMetrics) => buttonMetrics.height)).size,
        viewportCase.name,
      ).toBe(1);
      expect(
        new Set(metrics.buttons.map((buttonMetrics) => buttonMetrics.borderColor)).size,
        viewportCase.name,
      ).toBe(1);
      expect(
        new Set(metrics.buttons.map((buttonMetrics) => buttonMetrics.borderStyle)).size,
        viewportCase.name,
      ).toBe(1);
      expect(
        new Set(metrics.buttons.map((buttonMetrics) => buttonMetrics.borderWidth)).size,
        viewportCase.name,
      ).toBe(1);

      for (const buttonMetrics of metrics.buttons) {
        expect(buttonMetrics.accessibleName, viewportCase.name).toBeTruthy();
        expect(buttonMetrics.left, viewportCase.name).toBeGreaterThanOrEqual(
          buttonMetrics.containerLeft - 1,
        );
        expect(buttonMetrics.right, viewportCase.name).toBeLessThanOrEqual(
          buttonMetrics.containerRight + 1,
        );
        expect(buttonMetrics.height, viewportCase.name).toBe(30);
        expect(buttonMetrics.width, viewportCase.name).toBe(30);
        if (buttonMetrics.provider !== 'google') {
          expect(buttonMetrics.labelPosition, viewportCase.name).toBe('absolute');
          expect(buttonMetrics.labelWidth, viewportCase.name).toBe(1);
        }
        expect(buttonMetrics.borderColor, viewportCase.name).toBe('rgb(142, 145, 143)');
        expect(buttonMetrics.borderStyle, viewportCase.name).toBe('solid');
        expect(buttonMetrics.borderWidth, viewportCase.name).toBe('1px');
      }

      const appleMetrics = metrics.buttons.find(
        (buttonMetrics) => buttonMetrics.provider === 'apple',
      );
      const googleMetrics = metrics.buttons.find(
        (buttonMetrics) => buttonMetrics.provider === 'google',
      );
      expect(appleMetrics?.backgroundColor, viewportCase.name).toBe('rgb(0, 0, 0)');
      expect(googleMetrics?.backgroundColor, viewportCase.name).toBe('rgb(0, 0, 0)');
      expect(googleMetrics?.borderColor, viewportCase.name).toBe('rgb(142, 145, 143)');
    }
  });
});

test.describe('Theme toggle travel', () => {
  test.beforeEach(async ({ page }) => {
    await visitThemeFixturePage(page);
  });

  test('MU-370: footer toggle (switch) in small mode travels the full track', async ({ page }) => {
    const footerHost = page.locator('mpr-footer#fixture-footer');
    await expect(footerHost).toBeVisible();

    await footerHost.evaluate(el => {
      el.setAttribute('size', 'small');
    });

    const toggleSelector =
      'mpr-footer#fixture-footer input[type="checkbox"][data-mpr-theme-toggle="control"]';
    const toggle = footerHost.locator('input[type="checkbox"][data-mpr-theme-toggle="control"]');
    await expect(toggle).toBeVisible();

    await toggle.click();
    await page.waitForTimeout(200);

    const toggledSnapshot = await captureToggleSnapshot(page, toggleSelector);
    const travelError = Math.abs(toggledSnapshot.translateX - toggledSnapshot.expectedTravel);
    const errorRatio = travelError / Math.max(1, toggledSnapshot.expectedTravel);
    expect(errorRatio).toBeLessThanOrEqual(0.25);
  });
});
