// @ts-check
const { test, expect } = require('./support/browserCoverage');
const { visitLoginButtonFixture } = require('./support/fixturePage');

for (const width of [320, 390, 768, 769, 1280]) {
  for (const withLinks of [false, true]) {
    test(`header keeps available controls on one row at ${width}px with links ${withLinks}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await visitLoginButtonFixture(page);
      await page.evaluate(withLinks => {
        const auth = document.querySelector('mpr-login-button').getAttribute('auth-config');
        document.body.replaceChildren();
        document.body.style.cssText = 'margin:0;display:block';
        const header = document.createElement('mpr-header');
        header.setAttribute('brand-label', 'LoopAware');
        header.setAttribute('settings', 'false');
        header.setAttribute('auth-config', auth);
        if (withLinks) {
          header.setAttribute('nav-links', JSON.stringify([{ label: 'Home', href: '/' }]));
          const auxiliary = document.createElement('button');
          auxiliary.setAttribute('slot', 'aux');
          auxiliary.textContent = 'EN';
          header.append(auxiliary);
          header.setAttribute('horizontal-links', JSON.stringify([{ label: 'About', href: '/about' }]));
        }
        document.body.append(header);
      }, withLinks);
      const button = page.getByRole('button', { name: 'Sign in with Google' });
      await expect(button).toBeVisible();
      const brandBounds = await page.locator('[data-mpr-header="brand"]').boundingBox();
      const buttonBounds = await button.boundingBox();
      expect(Math.abs(brandBounds.y + brandBounds.height / 2 - buttonBounds.y - buttonBounds.height / 2)).toBeLessThanOrEqual(1);
      expect(buttonBounds.x).toBeGreaterThan(brandBounds.x + brandBounds.width);
      expect(buttonBounds.x + buttonBounds.width).toBeLessThanOrEqual(width);
      if (withLinks) {
        const linkBounds = await page.getByRole('link', { name: 'About', exact: true }).boundingBox();
        expect(Math.abs(linkBounds.y + linkBounds.height / 2 - buttonBounds.y - buttonBounds.height / 2)).toBeLessThanOrEqual(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }
}

test('header wraps only when its container cannot fit the controls', async ({ page }) => {
  await visitLoginButtonFixture(page);
  await page.evaluate(() => {
    const auth = document.querySelector('mpr-login-button').getAttribute('auth-config');
    document.body.replaceChildren();
    document.body.style.cssText = 'margin:0;display:block';
    const header = document.createElement('mpr-header');
    header.setAttribute('brand-label', 'LoopAware');
    header.setAttribute('settings', 'false');
    header.setAttribute('auth-config', auth);
    header.style.width = '300px';
    const auxiliary = document.createElement('div');
    auxiliary.setAttribute('slot', 'aux');
    auxiliary.style.width = '100px';
    auxiliary.textContent = 'Controls';
    header.append(auxiliary);
    document.body.append(header);
  });
  const header = page.locator('mpr-header');
  const button = page.getByRole('button', { name: 'Sign in with Google' });
  await expect(button).toBeVisible();
  for (const width of [300, 200, 300]) {
    await header.evaluate((element, width) => { element.style.width = `${width}px`; }, width);
    const brandBounds = await page.locator('[data-mpr-header="brand"]').boundingBox();
    const buttonBounds = await button.boundingBox();
    if (width === 200) {
      expect(buttonBounds.y).toBeGreaterThanOrEqual(brandBounds.y + brandBounds.height);
    } else {
      expect(Math.abs(brandBounds.y + brandBounds.height / 2 - buttonBounds.y - buttonBounds.height / 2)).toBeLessThanOrEqual(1);
    }
    expect(await header.evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
