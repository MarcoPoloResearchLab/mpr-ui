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

  test('MU-336: footer toggle in small mode uses single knob and correct size', async ({ page }) => {
    const footerHost = page.locator('mpr-footer#page-footer');
    await expect(footerHost).toBeVisible();

    // Force standard toggle mode to verify the knob glitch fix
    await footerHost.evaluate(el => el.setAttribute('theme-switcher', 'toggle'));
    
    // Set size="small"
    await footerHost.evaluate(el => el.setAttribute('size', 'small'));

    const toggle = footerHost.locator('input[type="checkbox"][data-mpr-theme-toggle="control"]');
    await expect(toggle).toBeVisible();

    // Verify dimensions (should match variables set in JS: width 34px, height 20px)
    const box = await toggle.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeCloseTo(34, 1);
      expect(box.height).toBeCloseTo(20, 1);
    }

    // Verify no ::after knob (content should be none/empty)
    const afterContent = await toggle.evaluate(el => {
      return window.getComputedStyle(el, '::after').content;
    });
    // 'none' or 'normal' or empty string depending on browser default when not defined
    expect(['none', 'normal', '', '""']).toContain(afterContent);

    // Verify ::before knob exists (main CSS uses ::before)
    const beforeContent = await toggle.evaluate(el => {
      return window.getComputedStyle(el, '::before').content;
    });
    // Should be empty string "" (quoted in CSS)
    expect(beforeContent).toBe('""');

    // Verify knob size via variables or computed style if possible
    // The knob size is set to 14px via variable --mpr-theme-toggle-knob-size
    const knobWidth = await toggle.evaluate(el => {
      return window.getComputedStyle(el, '::before').width;
    });
    expect(parseFloat(knobWidth)).toBeCloseTo(14, 1);
  });
});