// @ts-check

const { test, expect } = require('./support/browserCoverage');
const {
  bundleUrl,
  runtimeSessionUrl,
  visitConfigLoaderFixture,
} = require('./support/fixturePage');

const F007_PROFILE = Object.freeze({
  user_id: 'fixture-account',
  user_email: 'fixture-account@example.com',
  display: 'Fixture Account',
});
const F007_SECRET_VALUES = Object.freeze([
  'login-password-secret',
  'signup-password-secret',
  'verify-token-secret',
  'reset-token-secret',
  'reset-password-secret',
  'current-password-secret',
  'new-password-secret',
  'link-password-secret',
  'link-token-secret',
  'google-proof-secret',
  'fixture-google-nonce',
  'route-challenge-secret',
]);

/**
 * Mounts one auth component against the fixture's existing controller.
 * @param {import('@playwright/test').Page} page
 * @param {'mpr-password-auth'|'mpr-account-panel'} tagName
 * @param {'mode'|'action'} contractAttribute
 * @param {string} contractValue
 * @param {Record<string, string>} [additionalAttributes]
 * @returns {Promise<string>}
 */
async function mountF007Component(
  page,
  tagName,
  contractAttribute,
  contractValue,
  additionalAttributes,
) {
  return page.evaluate(
    ({ componentTagName, attributeName, attributeValue, attributes }) => {
      document.querySelector('[data-test="f007-component"]')?.remove();
      const authOwner = document.querySelector('#fixture-config-login-button');
      const authConfig = authOwner?.getAttribute('auth-config');
      if (!authOwner || !authConfig) {
        throw new Error('The F007 fixture auth owner is not configured');
      }
      const component = document.createElement(componentTagName);
      component.setAttribute('data-test', 'f007-component');
      component.setAttribute(attributeName, attributeValue);
      component.setAttribute('auth-target', '#fixture-config-login-button');
      component.setAttribute('auth-config', authConfig);
      Object.entries(attributes).forEach(([additionalName, additionalValue]) => {
        component.setAttribute(additionalName, additionalValue);
      });
      authOwner.parentElement?.appendChild(component);
      return componentTagName;
    },
    {
      componentTagName: tagName,
      attributeName: contractAttribute,
      attributeValue: contractValue,
      attributes: additionalAttributes || {},
    },
  );
}

/**
 * Completes and submits the active F007 form.
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, string>} fieldValues
 * @param {string} submitLabel
 * @returns {Promise<void>}
 */
async function submitF007Form(page, fieldValues, submitLabel) {
  const component = page.locator('[data-test="f007-component"]');
  for (const [fieldLabel, fieldValue] of Object.entries(fieldValues)) {
    const selectField = component.getByRole('combobox', {
      name: fieldLabel,
      exact: true,
    });
    if ((await selectField.count()) > 0) {
      await selectField.selectOption(fieldValue);
    } else {
      await component.getByLabel(fieldLabel, { exact: true }).fill(fieldValue);
    }
  }
  await component.getByRole('button', { name: submitLabel, exact: true }).click();
  await expect(component).toHaveAttribute(
    /mpr-password-auth/.test(await component.evaluate((element) => element.tagName.toLowerCase()))
      ? 'data-mpr-password-auth-status'
      : 'data-mpr-account-panel-status',
    'success',
  );
}

test.describe('Runtime configuration presentation ownership', () => {
  test('B044: applies auth-only cross-origin YAML without replacing declarative button presentation', async ({ page }) => {
    const requestedSessionUrls = [];
    page.on('request', (request) => {
      if (request.method() === 'GET' && request.url() === runtimeSessionUrl) {
        requestedSessionUrls.push(request.url());
      }
    });

    await visitConfigLoaderFixture(page);

    const loginButton = page.locator('mpr-login-button#fixture-config-login-button');
    const googleControlHost = loginButton.locator('[data-mpr-auth-action="google"]');
    const googleControl = page.getByRole('button', { name: 'Sign in with Google' });
    const appleControl = page.getByRole('button', { name: 'Sign in with Apple' });

    const authConfig = await loginButton.evaluate((element) =>
      JSON.parse(element.getAttribute('auth-config') || '{}'));
    expect(authConfig).toEqual({
      tauthUrl: 'https://auth.fixture.test',
      tenantId: 'fixture-config-tenant',
      logoutPath: '/auth/logout',
      sessionPath: '/auth/custom-session',
      providers: {
        google: {
          enabled: true,
          clientId: 'fixture-config-client',
          loginPath: '/auth/google',
          noncePath: '/auth/nonce',
        },
        apple: {
          enabled: true,
          startPath: '/auth/apple/start',
          returnTo: 'current-origin',
          label: 'Sign in with Apple',
        },
        password: { enabled: true },
      },
      password: {
        loginPath: '/auth/password/login',
        signupPath: '/auth/password/signup',
        verifyEmailPath: '/auth/password/verify-email',
        resetStartPath: '/auth/password/reset/start',
        resetCompletePath: '/auth/password/reset/complete',
      },
      account: {
        passwordChangePath: '/auth/account/password/change',
        passwordLinkStartPath: '/auth/account/password/link/start',
        passwordLinkVerifyPath: '/auth/account/password/link/verify',
        googleLinkPath: '/auth/account/google/link',
        unlinkPath: '/auth/account/unlink',
        disablePath: '/auth/account/disable',
      },
    });

    await expect(loginButton).toHaveAttribute('button-text', 'signin_with');
    await expect(loginButton).toHaveAttribute('button-size', 'large');
    await expect(loginButton).toHaveAttribute('button-theme', 'filled_blue');
    await expect(loginButton).toHaveAttribute('button-shape', 'pill');
    await expect(googleControl).toBeVisible();
    await expect(appleControl).toBeVisible();
    await expect(googleControlHost).toHaveAttribute('data-mpr-google-ready', 'true');
    expect(requestedSessionUrls).toEqual([runtimeSessionUrl]);
  });

  test('loads the shared bundle exactly once through automatic orchestration', async ({ page }) => {
    const requestedBundleUrls = [];
    page.on('request', (request) => {
      const requestUrl = new URL(request.url());
      if (
        request.method() === 'GET'
        && requestUrl.origin + requestUrl.pathname === bundleUrl
      ) {
        requestedBundleUrls.push(request.url());
      }
    });

    await visitConfigLoaderFixture(page);

    await expect(page.locator('mpr-login-button#fixture-config-login-button')).toHaveAttribute(
      'data-mpr-auth-status',
      'unauthenticated',
    );
    expect(requestedBundleUrls).toHaveLength(1);
    expect(
      new URL(requestedBundleUrls[0]).searchParams.get('mpr-ui-revalidate'),
    ).toMatch(/^\d+-1$/);
  });

  test('F008: multi-provider Apple action builds and performs top-level TAuth navigation', async ({ page }) => {
    let navigationRequestUrl = '';
    await page.route('https://auth.fixture.test/auth/apple/start**', async (route) => {
      const request = route.request();
      if (request.isNavigationRequest()) {
        navigationRequestUrl = request.url();
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>Apple route stub</title><h1>Apple route stub</h1>',
      });
    });
    await visitConfigLoaderFixture(page);

    const loginButton = page.locator('mpr-login-button#fixture-config-login-button');
    const appleControl = page.getByRole('button', { name: 'Sign in with Apple' });
    const googleControl = page.getByRole('button', { name: 'Sign in with Google' });
    await expect(appleControl).toBeVisible();
    await expect(googleControl).toBeVisible();

    const preparedAction = await loginButton.evaluate((element) => {
      window.localStorage.clear();
      return window.MPRUI.testing.prepareRedirectProvider(element, 'apple');
    });
    const preparedUrl = new URL(preparedAction.url);
    expect(preparedUrl.origin).toBe('https://auth.fixture.test');
    expect(preparedUrl.pathname).toBe('/auth/apple/start');
    expect(preparedUrl.searchParams.get('tenant_id')).toBe('fixture-config-tenant');
    expect(preparedUrl.searchParams.get('return_to')).toBe('https://static.fixture.test');
    await expect(page).toHaveURL('https://static.fixture.test/config-loader.html');

    await Promise.all([
      page.waitForURL(/https:\/\/auth\.fixture\.test\/auth\/apple\/start/),
      appleControl.click(),
    ]);
    expect(navigationRequestUrl).toBe(preparedAction.url);
    await expect(page.getByRole('heading', { name: 'Apple route stub' })).toBeVisible();
  });

  test('F007: password and account flows share one controller without exposing secrets', async ({ page }) => {
    const actionRequests = [];
    const consoleMessages = [];
    const challengePaths = new Set([
      '/auth/password/signup',
      '/auth/password/reset/start',
      '/auth/account/password/link/start',
    ]);
    page.on('console', (message) => {
      consoleMessages.push(message.text());
    });

    await visitConfigLoaderFixture(page);
    await page.route('https://auth.fixture.test/auth/**', async (route) => {
      const request = route.request();
      const requestUrl = new URL(request.url());
      const corsHeaders = {
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'content-type,x-requested-with,x-tauth-tenant',
        'access-control-allow-methods': 'POST,OPTIONS',
        'access-control-allow-origin': 'https://static.fixture.test',
      };
      if (request.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      actionRequests.push({
        path: requestUrl.pathname,
        body: request.postDataJSON(),
        headers: request.headers(),
      });
      if (requestUrl.pathname === '/auth/account/disable') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      const responseBody = challengePaths.has(requestUrl.pathname)
        ? {
            status: 'accepted',
            expires_unix: 1893456000,
            challenge_token: 'route-challenge-secret',
          }
        : F007_PROFILE;
      await route.fulfill({
        status: challengePaths.has(requestUrl.pathname) ? 202 : 200,
        headers: Object.assign({ 'content-type': 'application/json' }, corsHeaders),
        body: JSON.stringify(responseBody),
      });
    });
    await page.evaluate(() => {
      window.__f007EventDetails = [];
      [
        'mpr-ui:password-auth:submit',
        'mpr-ui:password-auth:status',
        'mpr-ui:account-panel:submit',
        'mpr-ui:account-panel:status',
        'mpr-ui:account:updated',
        'mpr-ui:account:challenge-issued',
        'mpr-ui:account:disabled',
        'mpr-ui:auth:authenticated',
        'mpr-ui:auth:unauthenticated',
        'mpr-ui:auth:error',
        'mpr-ui:auth:status-change',
      ].forEach((eventName) => {
        document.addEventListener(eventName, (event) => {
          window.__f007EventDetails.push({ name: eventName, detail: event.detail });
        });
      });
      window.requestNonce = () => Promise.resolve('fixture-google-nonce');
      window.google = window.google || { accounts: { id: {} } };
      window.google.accounts = window.google.accounts || { id: {} };
      window.google.accounts.id = window.google.accounts.id || {};
      window.google.accounts.id.initialize = (config) => {
        window.google.accounts.id.__callback = config.callback;
      };
      window.google.accounts.id.renderButton = (target, options) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Continue with Google';
        button.addEventListener('click', () => {
          options.click_listener();
          window.google.accounts.id.__callback({ credential: 'google-proof-secret' });
        });
        target.replaceChildren(button);
      };
    });

    await mountF007Component(page, 'mpr-password-auth', 'mode', 'signup');
    await submitF007Form(
      page,
      { Email: 'signup@example.com', Password: 'signup-password-secret' },
      'Create account',
    );
    await mountF007Component(page, 'mpr-password-auth', 'mode', 'verify-email');
    await submitF007Form(page, { 'Challenge token': 'verify-token-secret' }, 'Verify email');
    await mountF007Component(page, 'mpr-password-auth', 'mode', 'login');
    await submitF007Form(
      page,
      { Email: 'login@example.com', Password: 'login-password-secret' },
      'Sign in',
    );
    await mountF007Component(page, 'mpr-password-auth', 'mode', 'reset-start');
    await submitF007Form(page, { Email: 'reset@example.com' }, 'Send reset instructions');
    await mountF007Component(page, 'mpr-password-auth', 'mode', 'reset-complete');
    await submitF007Form(
      page,
      { 'Challenge token': 'reset-token-secret', 'New password': 'reset-password-secret' },
      'Reset password',
    );

    await mountF007Component(page, 'mpr-account-panel', 'action', 'password-change');
    await submitF007Form(
      page,
      {
        'Current password': 'current-password-secret',
        'New password': 'new-password-secret',
      },
      'Change password',
    );
    await mountF007Component(page, 'mpr-account-panel', 'action', 'password-link-start');
    await submitF007Form(
      page,
      { Email: 'link@example.com', Password: 'link-password-secret' },
      'Send verification',
    );
    await mountF007Component(page, 'mpr-account-panel', 'action', 'password-link-verify');
    await submitF007Form(page, { 'Challenge token': 'link-token-secret' }, 'Link password');
    await mountF007Component(page, 'mpr-account-panel', 'action', 'google-link');
    const googleLinkPanel = page.locator('[data-test="f007-component"]');
    await expect(
      googleLinkPanel.getByRole('button', { name: 'Link Google', exact: true }),
    ).toHaveCount(0);
    await googleLinkPanel
      .getByRole('button', { name: 'Continue with Google', exact: true })
      .click();
    await expect(googleLinkPanel).toHaveAttribute(
      'data-mpr-account-panel-status',
      'success',
    );
    await expect.poll(() => actionRequests.some((request) => request.path === '/auth/account/google/link')).toBe(true);
    await mountF007Component(page, 'mpr-account-panel', 'action', 'unlink', {
      identities: JSON.stringify([
        {
          provider: 'google',
          providerId: 'google-subject',
          label: 'Google sign-in',
        },
      ]),
    });
    await submitF007Form(
      page,
      { 'Sign-in method': '0' },
      'Remove identity',
    );
    await mountF007Component(page, 'mpr-account-panel', 'action', 'disable');
    await page
      .locator('[data-test="f007-component"]')
      .getByRole('button', { name: 'Disable account', exact: true })
      .click();
    await expect(page.locator('[data-test="f007-component"]')).toHaveAttribute(
      'data-mpr-account-panel-status',
      'unauthenticated',
    );
    await expect(page.locator('#fixture-config-login-button')).toHaveAttribute(
      'data-mpr-auth-status',
      'unauthenticated',
    );

    const requestByPath = Object.fromEntries(
      actionRequests.map((request) => [request.path, request]),
    );
    expect(requestByPath['/auth/password/signup'].body).toEqual({
      email: 'signup@example.com',
      password: 'signup-password-secret',
      display_name: '',
      avatar_url: '',
    });
    expect(requestByPath['/auth/password/verify-email'].body).toEqual({
      token: 'verify-token-secret',
    });
    expect(requestByPath['/auth/password/login'].body).toEqual({
      email: 'login@example.com',
      password: 'login-password-secret',
    });
    expect(requestByPath['/auth/password/reset/start'].body).toEqual({
      email: 'reset@example.com',
    });
    expect(requestByPath['/auth/password/reset/complete'].body).toEqual({
      token: 'reset-token-secret',
      password: 'reset-password-secret',
    });
    expect(requestByPath['/auth/account/password/change'].body).toEqual({
      current_password: 'current-password-secret',
      new_password: 'new-password-secret',
    });
    expect(requestByPath['/auth/account/password/link/start'].body).toEqual({
      email: 'link@example.com',
      password: 'link-password-secret',
      display_name: '',
      avatar_url: '',
    });
    expect(requestByPath['/auth/account/password/link/verify'].body).toEqual({
      token: 'link-token-secret',
    });
    expect(requestByPath['/auth/account/google/link'].body).toEqual({
      google_id_token: 'google-proof-secret',
      nonce_token: 'fixture-google-nonce',
    });
    expect(requestByPath['/auth/account/unlink'].body).toEqual({
      provider: 'google',
      provider_id: 'google-subject',
    });
    expect(requestByPath['/auth/account/disable'].body).toBeNull();
    actionRequests.forEach((request) => {
      expect(request.headers['x-requested-with']).toBe('XMLHttpRequest');
      expect(request.headers['x-tauth-tenant']).toBe('fixture-config-tenant');
    });

    const exposedState = await page.evaluate(() => {
      const authOwner = document.querySelector('#fixture-config-login-button');
      return {
        attributes: Array.from(document.querySelectorAll('*')).flatMap((element) =>
          Array.from(element.attributes).map((attribute) => attribute.value),
        ),
        events: window.__f007EventDetails,
        localStorage: Object.keys(window.localStorage).map((key) => [key, window.localStorage.getItem(key)]),
        profile: authOwner?.__authController?.state.profile || null,
        renderedText: document.body.textContent,
      };
    });
    const exposedText = JSON.stringify({ exposedState, consoleMessages });
    F007_SECRET_VALUES.forEach((secretValue) => {
      expect(exposedText).not.toContain(secretValue);
    });
  });

  test('F010: challenge forms read returned tokens inside the shared component boundary', async ({ page }) => {
    await visitConfigLoaderFixture(
      page,
      'auth_action=verify-email#token=email-verification-secret',
    );
    await mountF007Component(page, 'mpr-password-auth', 'mode', 'verify-email', {
      'token-fragment-parameter': 'token',
    });

    await expect(
      page.locator('[data-test="f007-component"]').getByLabel('Challenge token'),
    ).toHaveValue('email-verification-secret');
    await expect(page).toHaveURL(/auth_action=verify-email$/);
  });
});
