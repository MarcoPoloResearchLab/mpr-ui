// @ts-check
const { test, expect } = require('./support/browserCoverage');
const { visitConfigLoaderFixture } = require('./support/fixturePage');

const cases = [
  { locale: 'en', email: 'Email', password: 'Password', login: 'Sign in', forgot: 'Forgot password?', reset: 'Reset your password', link: 'Add email sign-in', change: 'Change password', current: 'Current password' },
  { locale: 'ru', email: 'Электронная почта', password: 'Пароль', login: 'Войти', forgot: 'Забыли пароль?', reset: 'Сбросить пароль', link: 'Добавить почту и пароль', change: 'Изменить пароль', current: 'Текущий пароль' },
  { locale: 'bg', email: 'Имейл', password: 'Парола', login: 'Вход', forgot: 'Забравена парола?', reset: 'Възстановяване на паролата', link: 'Добавяне на имейл и парола', change: 'Промяна на паролата', current: 'Текуща парола' },
];
for (const copy of cases) {
  test(`account workflows use ${copy.locale} without changing their authentication owner`, async ({ page }) => {
    await visitConfigLoaderFixture(page);
    await page.route('https://auth.fixture.test/auth/password/login', route => route.fulfill({
      status: 200, headers: { 'access-control-allow-credentials': 'true', 'access-control-allow-origin': 'https://static.fixture.test', 'access-control-allow-headers': 'content-type,x-requested-with,x-tauth-tenant' },
      json: { user_id: 'locale-reader', user_email: 'reader@example.test', display: 'Reader' },
    }));
    await page.evaluate(locale => {
      const owner = document.querySelector('#fixture-config-login-button');
      owner.setAttribute('locale', locale);
      const form = document.createElement('mpr-password-auth');
      form.id = 'localized-password';
      form.setAttribute('mode', 'login');
      form.setAttribute('locale', locale);
      form.setAttribute('auth-target', '#fixture-config-login-button');
      form.setAttribute('auth-config', owner.getAttribute('auth-config'));
      document.body.append(form);
    }, copy.locale);
    const owner = page.locator('#fixture-config-login-button');
    await owner.locator('[data-mpr-auth-action="email"]').click();
    await expect(owner.getByRole('tab', { name: copy.login, exact: true })).toBeVisible();
    await expect(owner.locator('mpr-password-auth').getByLabel(copy.email, { exact: true })).toBeVisible();
    await owner.locator('[data-mpr-auth-action="email"]').click();
    const form = page.locator('#localized-password');
    await expect(form.getByLabel(copy.email, { exact: true })).toBeVisible();
    await form.getByRole('button', { name: copy.forgot, exact: true }).click();
    await expect(form.getByRole('heading', { name: copy.reset, exact: true })).toBeVisible();
    await form.evaluate(element => element.setAttribute('mode', 'login'));
    await form.getByLabel(copy.email, { exact: true }).fill('reader@example.test');
    await form.getByLabel(copy.password, { exact: true }).fill('localized-secret-password');
    await form.getByRole('button', { name: copy.login, exact: true }).click();
    await expect(form).toHaveAttribute('data-mpr-password-auth-status', 'success');
    for (const [action, title] of [['password-link-start', copy.link], ['password-change', copy.change]]) {
      await page.evaluate(({ action, locale }) => {
        document.querySelector('#localized-account')?.remove();
        const panel = document.createElement('mpr-account-panel');
        panel.id = 'localized-account';
        panel.setAttribute('action', action);
        panel.setAttribute('locale', locale);
        panel.setAttribute('auth-target', '#fixture-config-login-button');
        panel.setAttribute('auth-config', document.querySelector('#fixture-config-login-button').getAttribute('auth-config'));
        document.body.append(panel);
      }, { action, locale: copy.locale });
      const panel = page.locator('#localized-account');
      await expect(panel.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expect(panel.getByLabel(action === 'password-change' ? copy.current : copy.email, { exact: true })).toBeVisible();
    }
  });
}

test('changing a form locale clears secrets and rejects unsupported locales', async ({ page }) => {
  await visitConfigLoaderFixture(page);
  await page.evaluate(() => {
    const owner = document.querySelector('#fixture-config-login-button');
    const form = document.createElement('mpr-password-auth');
    form.id = 'changing-locale';
    form.setAttribute('mode', 'login');
    form.setAttribute('auth-target', '#fixture-config-login-button');
    form.setAttribute('auth-config', owner.getAttribute('auth-config'));
    document.body.append(form);
  });
  const form = page.locator('#changing-locale');
  await form.getByLabel('Password', { exact: true }).fill('locale-change-secret');
  await form.evaluate(element => element.setAttribute('locale', 'ru'));
  await expect(form.getByLabel('Пароль', { exact: true })).toHaveValue('');
  await form.evaluate(element => {
    history.replaceState(null, '', '#token=locale-challenge-secret');
    element.setAttribute('mode', 'verify-email');
    element.setAttribute('token-fragment-parameter', 'token');
    element.setAttribute('locale', 'en');
  });
  await expect(form.getByLabel('Challenge token', { exact: true })).toHaveValue('');
  await form.evaluate(element => {
    history.replaceState(null, '', '#token=locale-challenge-secret');
    element.setAttribute('disabled', '');
  });
  await expect(form.getByLabel('Challenge token', { exact: true })).toHaveValue('locale-challenge-secret');
  await form.evaluate(element => element.setAttribute('locale', 'ru'));
  await expect(form.getByLabel('Код подтверждения', { exact: true })).toHaveValue('');
  await form.evaluate(element => element.setAttribute('locale', 'invalid'));
  await expect(form).toHaveAttribute('data-mpr-password-auth-error', 'mpr-ui.auth_component.locale_invalid');
});
