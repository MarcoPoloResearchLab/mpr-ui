// @ts-check

const { test, expect } = require('./support/browserCoverage');
const { visitLoginButtonFixture } = require('./support/fixturePage');

const HEADER_SELECTOR = '#shared-login-header';
const LOGIN_SELECTOR = '#shared-login-control';

test('a dialog login action authenticates its declared header and preserves that controller after removal', async ({ page }) => {
  await visitLoginButtonFixture(page);
  await page.evaluate(() => {
    const originalLogin = document.querySelector('#fixture-login-button');
    const header = document.createElement('mpr-header');
    header.id = 'shared-login-header';
    header.setAttribute('auth-config', originalLogin.getAttribute('auth-config'));
    const user = document.createElement('mpr-user');
    user.setAttribute('slot', 'aux');
    header.appendChild(user);
    document.body.prepend(header);
    originalLogin.remove();

    const originalFetch = window.fetch;
    window.fetch = (input, options) => {
      const requestUrl = new URL(String(input), window.location.href);
      if (requestUrl.pathname === '/auth/google') {
        return Promise.resolve(new Response(JSON.stringify({ user_id: 'shared-user', display: 'Shared User' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
      return originalFetch(input, options);
    };
    window.__loginButtonSubmitCredential = true;
    const dialog = document.createElement('dialog');
    dialog.id = 'shared-login-dialog';
    const login = document.createElement('mpr-login-button');
    login.id = 'shared-login-control';
    login.setAttribute('auth-target', '#shared-login-header');
    login.setAttribute('button-text', 'signin_with');
    dialog.appendChild(login);
    document.body.appendChild(dialog);
    dialog.showModal();
  });

  const login = page.locator(LOGIN_SELECTOR);
  await expect(login.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  await login.getByRole('button', { name: 'Sign in with Google' }).click();
  await expect.poll(() => page.evaluate(async selector => (await window.MPRUI.resolveAuthProfileSnapshot(selector)).status, HEADER_SELECTOR))
    .toBe('authenticated');
  await expect(page.locator(`${HEADER_SELECTOR} mpr-user`)).toHaveAttribute('data-mpr-user-status', 'authenticated');
  await login.evaluate(element => element.setAttribute('button-theme', 'filled_blue'));
  await expect(login.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  await login.evaluate(element => element.setAttribute('auth-target', '#missing-owner'));
  await expect(login).toHaveAttribute('data-mpr-auth-error', 'mpr-ui.auth_component.controller_missing');
  expect(await page.evaluate(async selector => (await window.MPRUI.resolveAuthProfileSnapshot(selector)).status, HEADER_SELECTOR))
    .toBe('authenticated');
  await login.evaluate(element => element.remove());
  expect(await page.evaluate(async selector => (await window.MPRUI.resolveAuthProfileSnapshot(selector)).status, HEADER_SELECTOR))
    .toBe('authenticated');
});

for (const targetSelector of ['#missing-owner', '[', 'body', '', '#fixture-login-button']) {
  test(`a bound login control reports an invalid owner: ${targetSelector}`, async ({ page }) => {
    await visitLoginButtonFixture(page);
    const login = page.locator('#fixture-login-button');
    await login.evaluate((element, selector) => element.setAttribute('auth-target', selector), targetSelector);
    await expect(login).toHaveAttribute('data-mpr-auth-error', /mpr-ui\.auth_component\./);
    await expect(login.getByRole('button', { name: 'Sign in with Google' })).toHaveCount(0);
  });
}
