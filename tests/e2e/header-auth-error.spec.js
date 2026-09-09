// @ts-check
const {test, expect} = require('./support/browserCoverage');
const {visitLoginButtonFixture} = require('./support/fixturePage');

for (const width of [320, 390, 1280]) {
  test(`B068: header contains Google startup errors at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height:900});
    await visitLoginButtonFixture(page);
    await page.evaluate(() => {
      const auth = document.querySelector('mpr-login-button').getAttribute('auth-config');
      document.body.replaceChildren();
      document.body.style.display = 'block';
      window.__loginButtonNonceFailure = true;
      const header = document.createElement('mpr-header');
      header.setAttribute('brand-label', 'DYD');
      header.setAttribute('settings', 'false');
      header.setAttribute('auth-config', auth);
      const controls = document.createElement('div');
      controls.setAttribute('slot', 'aux');
      controls.id = 'fixture-aux-controls';
      controls.style.cssText = 'display:flex;flex-shrink:0;width:171px;gap:6px';
      for (const name of ['EN', 'ES', 'FR', 'RU', 'Theme']) {
        const button = document.createElement('button');
        button.textContent = name === 'Theme' ? '◐' : name;
        button.setAttribute('aria-label', name);
        button.style.cssText = 'flex:1;min-width:0;padding:2px';
        controls.append(button);
      }
      header.append(controls);
      document.body.append(header);
    });
    const status = page.getByRole('status');
    await expect(status).toHaveText('Unable to start Google sign-in. Try again.');
    await expect(page.getByRole('button', {name:'Theme', exact:true})).toBeVisible();
    const metrics = await status.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return {documentWidth:document.documentElement.scrollWidth, viewport:innerWidth, left:bounds.left, right:bounds.right, height:bounds.height, auxiliaryLeft:document.querySelector('#fixture-aux-controls').getBoundingClientRect().left, scrollWidth:element.scrollWidth, clientWidth:element.clientWidth};
    });
    expect(metrics.documentWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(width);
    expect(metrics.left).toBeGreaterThanOrEqual(0);
    expect(metrics.right).toBeLessThanOrEqual(metrics.auxiliaryLeft);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
    expect(metrics.height).toBeGreaterThan(0);
  });
}
