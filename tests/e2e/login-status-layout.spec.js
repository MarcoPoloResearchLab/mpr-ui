// @ts-check
const { test, expect } = require('./support/browserCoverage');
const { visitLoginButtonFixture } = require('./support/fixturePage');

for (const width of [390, 1280]) {
  for (const surface of ['standalone-header', 'standalone-footer', 'shared-header']) {
    for (const externalStyles of [true, false]) {
      test(`B076: ${surface} progress preserves page layout at ${width}px with external styles ${externalStyles}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await visitLoginButtonFixture(page);
        await page.evaluate(({ surface, externalStyles }) => {
          const original = document.querySelector('#fixture-login-button');
          const authConfig = original.getAttribute('auth-config');
          const login = original.cloneNode(false);
          login.removeAttribute('class');
          login.setAttribute('button-shape', 'rectangular');
          if (!externalStyles) {
            document.querySelector('link[rel="stylesheet"]').remove();
          }
          document.body.replaceChildren();
          document.body.style.display = 'block';
          const header = document.createElement('header');
          header.id = 'progress-header';
          const main = document.createElement('main');
          main.id = 'progress-content';
          main.textContent = 'Page content';
          const footer = document.createElement('footer');
          footer.id = 'progress-footer';
          footer.textContent = 'Footer';
          if (surface === 'shared-header') {
            const sharedHeader = document.createElement('mpr-header');
            sharedHeader.setAttribute('brand-label', 'Progress fixture');
            sharedHeader.setAttribute('settings', 'false');
            sharedHeader.setAttribute('auth-config', authConfig);
            header.append(sharedHeader);
          } else {
            (surface === 'standalone-footer' ? footer : header).append(login);
          }
          document.body.append(header, main, footer);
        }, { surface, externalStyles });

        const button = page.getByRole('button', { name: 'Sign in with Google' });
        const provider = page.locator('[data-mpr-auth-action="google"]');
        const status = page.locator('[data-mpr-auth-actions="status"]');
        const regions = page.locator('#progress-header, #progress-content, #progress-footer, [data-mpr-auth-actions="root"]');
        const readBounds = () => regions.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()));
        await expect(button).toBeVisible();
        const before = await readBounds();

        await button.click();
        await expect(provider).toHaveAttribute('aria-busy', 'false');
        await expect(status).toBeEmpty();
        await expect(button).toBeEnabled();
        expect(await readBounds()).toEqual(before);

        await page.evaluate(() => { window.__loginButtonSubmitCredential = true; });
        await button.click();
        await expect(provider).toHaveAttribute('aria-busy', 'true');
        await expect(status).toHaveText('Starting Google sign-in…');
        await expect(status).toHaveAttribute('role', 'status');
        await expect(status).toHaveAttribute('aria-live', 'polite');
        await expect(status).toHaveCSS('clip-path', 'inset(50%)');
        expect(await readBounds()).toEqual(before);
        await expect.poll(() => provider.evaluate(element =>
          element.getAnimations({ subtree: true }).some(animation => animation.playState === 'running'),
        )).toBe(true);

        await page.evaluate(() => window.__resolveLoginButtonCredential());
        await expect(provider).toHaveAttribute('aria-busy', 'false');
        await expect(status).toBeEmpty();
        expect(await readBounds()).toEqual(before);
      });
    }
  }
}

for (const width of [390, 1280]) {
  test(`B069: standalone login has no empty status space at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await visitLoginButtonFixture(page);
    const login = page.locator('#fixture-login-button');
    const actions = login.locator('[data-mpr-auth-actions="root"]');
    const controls = login.locator('[data-mpr-auth-actions="controls"]');
    const status = login.locator('[data-mpr-auth-actions="status"]');
    await expect(login.locator('[data-mpr-google-ready]')).toHaveAttribute('aria-busy', 'false');
    await expect(status).toBeEmpty();
    await expect(status).toBeHidden();
    const initial = await actions.boundingBox();
    const controlBounds = await controls.boundingBox();
    expect(initial.height).toBe(controlBounds.height);

    await page.evaluate(() => {
      window.__loginButtonNonceFailure = true;
      document.querySelector('#fixture-login-button').setAttribute('button-theme', 'filled_blue');
    });
    await expect(status).toHaveText('Unable to start Google sign-in. Try again.');
    await expect(status).toBeVisible();
    await expect(status).toHaveAttribute('role', 'status');
    expect((await actions.boundingBox()).height).toBeGreaterThan(initial.height);

    await page.evaluate(() => {
      window.__loginButtonNonceFailure = false;
      document.querySelector('#fixture-login-button').setAttribute('button-theme', 'outline');
    });
    await expect(login.locator('[data-mpr-google-ready]')).toHaveAttribute('aria-busy', 'false');
    await expect(status).toBeEmpty();
    await expect(status).toBeHidden();
    expect((await actions.boundingBox()).height).toBe(initial.height);
  });
}

for (const width of [390, 1280]) {
  test(`credential exchange preserves login layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await visitLoginButtonFixture(page);
    const group = page.getByRole('group', { name: 'Google sign-in control' });
    const button = group.getByRole('button', { name: 'Sign in with Google' });
    const provider = group.locator('[data-mpr-auth-action="google"]');
    const status = group.getByRole('status');
    await expect(button).toBeVisible();
    const before = await group.boundingBox();
    await page.evaluate(() => { window.__loginButtonSubmitCredential = true; });
    await button.click();
    await expect(provider).toHaveAttribute('aria-busy', 'true');
    await expect(status).not.toBeEmpty();
    expect(await group.boundingBox()).toEqual(before);
    await expect(status).toHaveCSS('position', 'absolute');
    await expect(provider).toHaveCSS('animation-name', 'none');
    expect(await provider.evaluate(el => getComputedStyle(el, '::after').animationName)).toContain('spin');
    await page.evaluate(() => window.__resolveLoginButtonCredential());
    await expect(provider).toHaveAttribute('aria-busy', 'false');
    expect(await group.boundingBox()).toEqual(before);
    await page.evaluate(() => {
      window.__loginButtonNonceFailure = true;
      document.querySelector('#fixture-login-button').setAttribute('button-theme', 'filled_blue');
    });
    await expect(status).toHaveText('Unable to start Google sign-in. Try again.');
    await expect(status).toBeVisible();
    await expect(status).not.toHaveCSS('position', 'absolute');
    await expect(provider).toHaveAttribute('aria-busy', 'false');
  });
}

for (const [size, height] of [['small', 20], ['medium', 32], ['large', 40]]) {
  test(`native Google ${size} button fills its shared control`, async ({ page }) => {
    await visitLoginButtonFixture(page);
    const login = page.locator('#fixture-login-button');
    await login.evaluate((el, size) => { el.setAttribute('button-size', size); el.setAttribute('button-shape', 'rectangular'); }, size);
    const button = login.getByRole('button', { name: 'Sign in with Google' });
    await expect(button).toBeVisible();
    expect((await button.boundingBox()).height).toBe(height);
    expect((await login.locator('[data-mpr-auth-actions="root"]').boundingBox()).height).toBe(height);
  });
}

test('multiple login controls share the same Google initialization', async ({ page }) => {
  await visitLoginButtonFixture(page);
  await page.evaluate(() => {
    const original = document.querySelector('#fixture-login-button');
    for (let index = 0; index < 4; index += 1) {
      const clone = original.cloneNode(false);
      clone.id = `additional-login-${index}`;
      original.parentElement.appendChild(clone);
    }
  });
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toHaveCount(5);
  expect(await page.evaluate(() => window.__loginButtonGoogleInitializeCalls.length)).toBe(1);
  await page.evaluate(() => { window.__loginButtonSubmitCredential = true; });
  const first = page.locator('#fixture-login-button');
  await first.getByRole('button').click();
  await expect(first.locator('[data-mpr-auth-action="google"]')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#additional-login-3 [data-mpr-auth-action="google"]')).toHaveAttribute('aria-busy', 'false');
  await page.evaluate(() => window.__resolveLoginButtonCredential());
  await expect(first.locator('[data-mpr-auth-action="google"]')).toHaveAttribute('aria-busy', 'false');
  await page.evaluate(() => {
    window.requestNonce = () => Promise.resolve('rotated-login-nonce');
    document.querySelector('#additional-login-3').setAttribute('button-theme', 'filled_blue');
  });
  await expect.poll(() => page.evaluate(() => window.__loginButtonGoogleInitializeCalls)).toEqual([
    { clientId: 'fixture-google-client', nonce: 'fixture-login-nonce' },
    { clientId: 'fixture-google-client', nonce: 'rotated-login-nonce' },
  ]);
});
