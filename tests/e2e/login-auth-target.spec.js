// @ts-check

const { test, expect } = require('./support/browserCoverage');
const { visitLoginButtonFixture } = require('./support/fixturePage');

const HEADER_SELECTOR = '#shared-login-header';
const LOGIN_SELECTOR = '#shared-login-control';
const UPDATING_OWNER_SELECTOR = '#updating-auth-owner';

/**
 * @param {import('@playwright/test').Locator} owner
 * @param {string} label
 * @param {boolean} googleEnabled
 * @returns {Promise<void>}
 */
async function setAppleProviderConfiguration(owner, label, googleEnabled) {
  await owner.evaluate((element, configuration) => {
    const authConfig = JSON.parse(element.getAttribute('auth-config'));
    if (!configuration.googleEnabled) {
      authConfig.providers.google = { enabled: false };
    }
    authConfig.providers.apple = {
      enabled: true,
      startPath: '/auth/apple/start',
      returnTo: 'current-origin',
      label: configuration.label,
    };
    element.setAttribute('auth-config', JSON.stringify(authConfig));
  }, { label, googleEnabled });
}

for (const ownerTag of ['mpr-login-button', 'mpr-header']) {
  test(`a bound login control follows provider configuration changes on ${ownerTag}`, async ({ page }) => {
    await visitLoginButtonFixture(page);
    await page.evaluate(({ ownerTag, ownerSelector, loginSelector }) => {
      const originalLogin = document.querySelector('#fixture-login-button');
      const owner = document.createElement(ownerTag);
      owner.id = ownerSelector.slice(1);
      owner.setAttribute('auth-config', originalLogin.getAttribute('auth-config'));
      document.body.prepend(owner);
      originalLogin.remove();
      const login = document.createElement('mpr-login-button');
      login.id = loginSelector.slice(1);
      login.setAttribute('auth-target', ownerSelector);
      document.body.appendChild(login);
    }, { ownerTag, ownerSelector: UPDATING_OWNER_SELECTOR, loginSelector: LOGIN_SELECTOR });

    const owner = page.locator(UPDATING_OWNER_SELECTOR);
    const login = page.locator(LOGIN_SELECTOR);
    await expect(login.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
    const googleEnabled = ownerTag === 'mpr-header';
    await setAppleProviderConfiguration(owner, 'Sign in with Apple', googleEnabled);
    await expect(owner).not.toHaveAttribute('data-mpr-auth-error');
    await expect(login.getByRole('button', { name: 'Sign in with Apple' })).toBeVisible();
    await expect(login.getByRole('button', { name: 'Sign in with Google' })).toHaveCount(googleEnabled ? 1 : 0);

    await setAppleProviderConfiguration(owner, 'Continue with Apple', googleEnabled);
    const appleButton = login.getByRole('button', { name: 'Continue with Apple' });
    await expect(appleButton).toBeVisible();
    await appleButton.focus();
    await setAppleProviderConfiguration(owner, 'Continue with Apple', googleEnabled);
    await expect(appleButton).toBeFocused();

    const detachedLogin = await login.elementHandle();
    await login.evaluate(element => element.remove());
    await setAppleProviderConfiguration(owner, 'Sign up with Apple', googleEnabled);
    await expect(owner).not.toHaveAttribute('data-mpr-auth-error');
    await page.evaluate(element => document.body.appendChild(element), detachedLogin);
    await expect(login.getByRole('button', { name: 'Sign up with Apple' })).toBeVisible();
    await setAppleProviderConfiguration(owner, 'Sign in with Apple', googleEnabled);
    await expect(login.getByRole('button', { name: 'Sign in with Apple' })).toBeVisible();
  });
}

test('a bound login control stops following its previous owner after a target change', async ({ page }) => {
  await visitLoginButtonFixture(page);
  await page.evaluate(({ ownerSelector, loginSelector }) => {
    const originalLogin = document.querySelector('#fixture-login-button');
    const nextOwner = originalLogin.cloneNode(false);
    nextOwner.id = ownerSelector.slice(1);
    document.body.prepend(nextOwner);
    const login = document.createElement('mpr-login-button');
    login.id = loginSelector.slice(1);
    login.setAttribute('auth-target', '#fixture-login-button');
    document.body.appendChild(login);
  }, { ownerSelector: UPDATING_OWNER_SELECTOR, loginSelector: LOGIN_SELECTOR });

  const login = page.locator(LOGIN_SELECTOR);
  await expect(login.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  await login.evaluate((element, ownerSelector) => element.setAttribute('auth-target', ownerSelector), UPDATING_OWNER_SELECTOR);
  const googleButton = login.getByRole('button', { name: 'Sign in with Google' });
  await expect(googleButton).toBeVisible();
  await googleButton.focus();
  await setAppleProviderConfiguration(page.locator('#fixture-login-button'), 'Sign in with Apple', false);
  await expect(googleButton).toBeFocused();

  await setAppleProviderConfiguration(page.locator(UPDATING_OWNER_SELECTOR), 'Continue with Apple', false);
  await expect(login.getByRole('button', { name: 'Continue with Apple' })).toBeVisible();
  await expect(googleButton).toHaveCount(0);
});

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
