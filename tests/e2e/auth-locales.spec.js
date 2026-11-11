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

for (const tagName of ['mpr-login-button', 'mpr-header']) {
  for (const phase of ['mount', 'update']) {
    test(`${tagName} reports an invalid locale during ${phase} and recovers`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await visitConfigLoaderFixture(page);
      await page.evaluate(({ tagName, phase }) => {
        const owner = document.createElement(tagName);
        owner.id = 'invalid-locale-owner';
        owner.setAttribute('auth-config', document.querySelector('#fixture-config-login-button').getAttribute('auth-config'));
        const eventName = tagName === 'mpr-header' ? 'mpr-ui:header:error' : 'mpr-login:error';
        let errorCount = 0;
        owner.addEventListener(eventName, event => {
          owner.setAttribute('data-fixture-error-code', event.detail.code);
          owner.setAttribute('data-fixture-error-count', String(++errorCount));
        });
        if (phase === 'mount') owner.setAttribute('locale', 'invalid');
        document.body.append(owner);
      }, { tagName, phase });
      const owner = page.locator('#invalid-locale-owner');
      if (phase === 'update') {
        await expect(owner.locator('[data-mpr-auth-action="email"]')).toBeVisible();
        await owner.evaluate(element => element.setAttribute('locale', 'invalid'));
      }
      await expect(owner).toHaveAttribute('data-mpr-auth-error', 'mpr-ui.auth_component.locale_invalid');
      await expect(owner).toHaveAttribute('data-fixture-error-code', 'mpr-ui.auth_component.locale_invalid');
      await expect(owner).toHaveAttribute('data-fixture-error-count', '1');
      await expect(owner.locator('[data-mpr-auth-action]')).toHaveCount(0);
      await owner.evaluate(element => element.setAttribute('locale', 'ru'));
      await expect(owner).not.toHaveAttribute('data-mpr-auth-error');
      await owner.locator('[data-mpr-auth-action="email"]').click();
      await expect(owner.getByRole('tab', { name: 'Войти', exact: true })).toBeVisible();
      await expect(owner.locator('form')).toHaveAttribute('lang', 'ru');
      expect(pageErrors).toEqual([]);
    });
  }
}

for (const tagName of ['mpr-password-auth', 'mpr-account-panel', 'mpr-login-button', 'mpr-header']) {
  test(`${tagName} follows inherited locale changes and respects local overrides`, async ({ page }) => {
    await visitConfigLoaderFixture(page);
    await page.evaluate(tagName => {
      const authOwner = document.querySelector('#fixture-config-login-button');
      window.MPRUI.testing.authenticate(authOwner, { user_id: 'locale-reader', user_email: 'reader@example.test', display: 'Reader' });
      const wrapper = document.createElement('section');
      wrapper.id = 'locale-wrapper';
      wrapper.setAttribute('locale', 'ru');
      const inner = document.createElement('div');
      inner.id = 'locale-inner';
      const control = document.createElement(tagName);
      control.id = 'inherited-locale';
      control.setAttribute('auth-config', authOwner.getAttribute('auth-config'));
      if (tagName === 'mpr-password-auth' || tagName === 'mpr-account-panel') {
        control.setAttribute('auth-target', '#fixture-config-login-button');
      }
      if (tagName === 'mpr-password-auth') control.setAttribute('mode', 'login');
      if (tagName === 'mpr-account-panel') control.setAttribute('action', 'password-change');
      inner.append(control);
      wrapper.append(inner);
      document.body.append(wrapper);
    }, tagName);
    const control = page.locator('#inherited-locale');
    const isOwner = tagName === 'mpr-login-button' || tagName === 'mpr-header';
    if (isOwner) await control.locator('[data-mpr-auth-action="email"]').click();
    await expect(control.locator('form')).toHaveAttribute('lang', 'ru');
    await control.locator('input[type="password"]').first().fill('inherited-locale-secret');
    await page.locator('#locale-wrapper').evaluate(element => element.setAttribute('locale', 'bg'));
    if (isOwner) await control.locator('[data-mpr-auth-action="email"]').click();
    await expect(control.locator('form')).toHaveAttribute('lang', 'bg');
    await expect(control.getByLabel(tagName === 'mpr-account-panel' ? 'Текуща парола' : 'Парола', { exact: true })).toHaveValue('');
    await control.evaluate(element => element.setAttribute('locale', 'en'));
    if (isOwner) await control.locator('[data-mpr-auth-action="email"]').click();
    await control.locator('input[type="password"]').first().fill('local-override-secret');
    await page.locator('#locale-wrapper').evaluate(element => element.setAttribute('locale', 'invalid'));
    await expect(control.locator('form')).toHaveAttribute('lang', 'en');
    await expect(control.locator('input[type="password"]').first()).toHaveValue('local-override-secret');
    await control.evaluate(element => element.removeAttribute('locale'));
    await expect(control).toHaveAttribute(
      tagName === 'mpr-password-auth' ? 'data-mpr-password-auth-error' : tagName === 'mpr-account-panel' ? 'data-mpr-account-panel-error' : 'data-mpr-auth-error',
      'mpr-ui.auth_component.locale_invalid',
    );
    await page.locator('#locale-inner').evaluate(element => element.setAttribute('locale', 'bg'));
    if (isOwner) await control.locator('[data-mpr-auth-action="email"]').click();
    await expect(control.locator('form')).toHaveAttribute('lang', 'bg');
    await page.locator('#locale-wrapper').evaluate(element => element.removeAttribute('locale'));
    await page.locator('#locale-inner').evaluate(element => element.removeAttribute('locale'));
    if (isOwner) await control.locator('[data-mpr-auth-action="email"]').click();
    await expect(control.locator('form')).toHaveAttribute('lang', 'en');
    await control.evaluate(element => {
      element.remove();
      document.querySelector('#locale-inner').setAttribute('locale', 'ru');
      document.querySelector('#locale-inner').append(element);
    });
    if (isOwner) await control.locator('[data-mpr-auth-action="email"]').click();
    await expect(control.locator('form')).toHaveAttribute('lang', 'ru');
    await page.locator('#locale-inner').evaluate(element => element.setAttribute('locale', 'bg'));
    if (isOwner) await control.locator('[data-mpr-auth-action="email"]').click();
    await expect(control.locator('form')).toHaveAttribute('lang', 'bg');
  });
}

test('inherited locale changes clear a challenge token without restoring its consumed fragment', async ({ page }) => {
  await visitConfigLoaderFixture(page);
  await page.evaluate(() => {
    const wrapper = document.createElement('section');
    wrapper.id = 'token-locale-wrapper';
    wrapper.setAttribute('locale', 'ru');
    const form = document.createElement('mpr-password-auth');
    form.id = 'inherited-token';
    form.setAttribute('mode', 'verify-email');
    form.setAttribute('auth-target', '#fixture-config-login-button');
    form.setAttribute('auth-config', document.querySelector('#fixture-config-login-button').getAttribute('auth-config'));
    form.setAttribute('token-fragment-parameter', 'token');
    history.replaceState(null, '', '#token=inherited-challenge-secret');
    wrapper.append(form);
    document.body.append(wrapper);
  });
  const form = page.locator('#inherited-token');
  await expect(form.locator('input[name="token"]')).toHaveValue('inherited-challenge-secret');
  await page.locator('#token-locale-wrapper').evaluate(element => element.setAttribute('locale', 'bg'));
  await expect(form.locator('form')).toHaveAttribute('lang', 'bg');
  await expect(form.locator('input[name="token"]')).toHaveValue('');
});
