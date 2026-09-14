// @ts-check
const { test, expect } = require('./support/browserCoverage');
const { visitDropdownFixture } = require('./support/fixturePage');
const { join } = require('node:path');
const catalog = require('../../data/product-catalog.json');

for (const width of [320, 390, 768, 1280]) {
  test(`shared product directory at ${width}px`, async ({ page }) => {
    const { createProductMenu } = await import('../../product-catalog.mjs');
    await page.setViewportSize({ width, height: 800 });
    await visitDropdownFixture(page);
    await page.addStyleTag({ path: join(__dirname, '../../product-directory.css') });
    await page.locator('#bottom-dropdown').evaluate((element, menu) => {
      element.classList.add('mpr-product-directory');
      element.setAttribute('menu', JSON.stringify({ ...menu, placement: 'bottom' }));
    }, createProductMenu(catalog));
    const dropdown = page.locator('#bottom-dropdown');
    await dropdown.locator('[data-mpr-dropdown="trigger"]').click();
    const sections = dropdown.locator('[data-mpr-dropdown="section-trigger"]');
    await expect(sections.first()).toHaveAttribute('aria-expanded', 'true');
    for (let index = 1; index < await sections.count(); index += 1) {
      await expect(sections.nth(index)).toHaveAttribute('aria-expanded', 'false');
      await sections.nth(index).click();
    }
    await expect(dropdown.locator('a')).toHaveCount(catalog.products.length + 2);
    const bounds = await dropdown.locator('[data-mpr-dropdown="panel"]').evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, scroll: element.scrollHeight > element.clientHeight };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(width);
    expect(bounds.scroll).toBe(true);
    const sizes = await dropdown.locator('button,a').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
    expect(sizes.every(height => height >= 44)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dropdown.locator('[data-mpr-dropdown="trigger"]')).toBeFocused();
  });
}
