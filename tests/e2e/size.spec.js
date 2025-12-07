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

    // Ensure we start from normal size
    await headerHost.evaluate(el => el.removeAttribute('size'));

    // Initial state (normal)
    const initialHeight = await headerHost.evaluate(el => el.offsetHeight);
    
    // Set size="small"
    await headerHost.evaluate(el => el.setAttribute('size', 'small'));

    // Check for class on the internal header element
    const internalHeader = headerHost.locator('.mpr-header');
    await expect(internalHeader).toHaveClass(/mpr-header--small/);

    // Check if height decreased
    const smallHeight = await headerHost.evaluate(el => el.offsetHeight);
    expect(smallHeight).toBeLessThan(initialHeight);

    // Revert to normal
    await headerHost.evaluate(el => el.setAttribute('size', 'normal'));
    await expect(internalHeader).not.toHaveClass(/mpr-header--small/);
    
    const revertedHeight = await headerHost.evaluate(el => el.offsetHeight);
    expect(revertedHeight).toBeCloseTo(initialHeight, 0);
  });

  test('MU-116: footer accepts size="small" and applies smaller styling', async ({ page }) => {
    const footerHost = page.locator('mpr-footer#page-footer');
    await expect(footerHost).toBeVisible();

    // Ensure we start from normal size
    await footerHost.evaluate(el => el.removeAttribute('size'));

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
    await footerHost.evaluate(el => el.removeAttribute('size'));
    await expect(internalFooter).not.toHaveClass(/mpr-footer--small/);
  });
});
