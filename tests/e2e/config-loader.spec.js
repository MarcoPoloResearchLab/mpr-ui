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

    await expect(loginButton).toHaveAttribute('site-id', 'fixture-config-client');
    await expect(loginButton).toHaveAttribute('tauth-url', 'https://auth.fixture.test');
    await expect(loginButton).toHaveAttribute('tauth-tenant-id', 'fixture-config-tenant');
    await expect(loginButton).toHaveAttribute('tauth-login-path', '/auth/google');
    await expect(loginButton).toHaveAttribute('tauth-logout-path', '/auth/logout');
    await expect(loginButton).toHaveAttribute('tauth-nonce-path', '/auth/nonce');
    await expect(loginButton).toHaveAttribute('tauth-session-path', '/auth/custom-session');

    await expect(loginButton).toHaveAttribute('button-text', 'signin_with');
    await expect(loginButton).toHaveAttribute('button-size', 'large');
    await expect(loginButton).toHaveAttribute('button-theme', 'filled_blue');
    await expect(loginButton).toHaveAttribute('button-shape', 'pill');
    await expect(googleControl).toBeVisible();
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
});
