// @ts-check
const { test, expect } = require('@playwright/test');
const { visitDemoPage } = require('./support/demoPage');

test.describe('Size parameter support', () => {
  test.beforeEach(async ({ page }) => {
    await visitDemoPage(page);
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
    const initialPadding = await internalFooter.evaluate(el => {
      return window.getComputedStyle(el).paddingTop;
    });

    // Set size="small"
    await footerHost.evaluate(el => el.setAttribute('size', 'small'));

    // Check for class
    await expect(internalFooter).toHaveClass(/mpr-footer--small/);

    // Check padding decreased
    const smallPadding = await internalFooter.evaluate(el => {
      return window.getComputedStyle(el).paddingTop;
    });

    const initialVal = parseFloat(initialPadding);
    const smallVal = parseFloat(smallPadding);
    
    // 24px -> 16px (hardcoded in CSS overrides)
    expect(smallVal).toBeLessThan(initialVal);
    expect(smallVal).toBeCloseTo(16, 0);

    // Revert
    await footerHost.evaluate(el => el.setAttribute('size', 'normal'));
    await expect(internalFooter).not.toHaveClass(/mpr-footer--small/);
  });

  test('MU-336: footer toggle (switch) in small mode uses single knob and correct size', async ({ page }) => {
    const footerHost = page.locator('mpr-footer#page-footer');
    await expect(footerHost).toBeVisible();

    await footerHost.evaluate(el => el.setAttribute('theme-switcher', 'toggle'));
    await footerHost.evaluate(el => el.setAttribute('size', 'small'));

    const toggle = footerHost.locator('input[type="checkbox"][data-mpr-theme-toggle="control"]');
    await expect(toggle).toBeVisible();

    const box = await toggle.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeCloseTo(34, 1);
      expect(box.height).toBeCloseTo(20, 1);
    }
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
    if (normalBox) {
        expect(normalBox.width).toBeCloseTo(28, 1);
    }

    await footerHost.evaluate(el => el.setAttribute('size', 'small'));

    const smallBox = await normalGrid.boundingBox();
    
    expect(smallBox).not.toBeNull();
    if (smallBox) {
        expect(smallBox.width).toBeLessThan(28);
        expect(smallBox.width).toBeCloseTo(22, 1);
    }
  });
});