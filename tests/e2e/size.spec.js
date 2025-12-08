// @ts-check
const { test, expect } = require('@playwright/test');
const { visitFullLayoutFixture, captureToggleSnapshot } = require('./support/fixturePage');

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
    expect(headerRatio).toBeCloseTo(0.7, 1);

    await headerHost.evaluate(el => el.setAttribute('size', 'normal'));
    await expect(internalHeader).not.toHaveClass(/mpr-header--small/);
    const revertedHeight = await headerHost.evaluate(el => el.offsetHeight);
    expect(revertedHeight).toBeCloseTo(initialHeight, 0);
  });

  test('MU-116: footer accepts size="small" and applies smaller styling', async ({ page }) => {
    const footerHost = page.locator('mpr-footer#page-footer');
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
    
    // 70% scaling of original padding
    expect(smallVal).toBeLessThan(initialVal);
    expect(smallVal).toBeCloseTo(initialVal * 0.7, 0);
    const footerRatio = smallMetrics.height / initialHeight;
    expect(footerRatio).toBeCloseTo(0.7, 1);

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
      expect(box.width / defaultBox.width).toBeCloseTo(0.7, 1);
      expect(box.height / defaultBox.height).toBeCloseTo(0.7, 1);
    }

    const initialState = await toggle.evaluate(el => el.checked);
    const initialSnapshot = await captureToggleSnapshot(page, toggleSelector);
    expect(initialSnapshot.variant).toBe('switch');
    expect(initialSnapshot.boxShadow).toBe('none');

    await toggle.click();
    await page.waitForTimeout(50);

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
        expect(smallBox.width / normalBox.width).toBeCloseTo(0.7, 1);
    }
  });
});
