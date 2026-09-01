// @ts-check

const { test, expect } = require('./support/browserCoverage');
const {
  bundleUrl,
  runtimeSessionUrl,
  visitConfigLoaderFixture,
} = require('./support/fixturePage');

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
      },
    });

    await expect(loginButton).toHaveAttribute('button-text', 'signin_with');
    await expect(loginButton).toHaveAttribute('button-size', 'large');
    await expect(loginButton).toHaveAttribute('button-theme', 'filled_blue');
    await expect(loginButton).toHaveAttribute('button-shape', 'pill');
    await expect(googleControl).toBeVisible();
    await expect(appleControl).toBeVisible();
    await expect(googleControl).toHaveCSS('display', 'grid');
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
});
