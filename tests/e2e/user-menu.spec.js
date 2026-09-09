// @ts-check

const { test, expect } = require('./support/browserCoverage');
const {
  visitUserMenuFixture,
  visitHeaderUserMenuOverflowFixture,
  captureColorSnapshots,
} = require('./support/fixturePage');

test.describe('User menu element', () => {
  for (const width of [390, 1280]) {
    test(`B066: account menu stays reachable at ${width}px and after resize`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await visitHeaderUserMenuOverflowFixture(page);
      const user = page.locator('#fixture-header-user');
      const trigger = user.locator('[data-mpr-user="trigger"]');
      await expect(user).toHaveAttribute('data-mpr-user-status', 'authenticated');
      await trigger.focus();
      await page.keyboard.press('Enter');
      const logout = user.locator('[data-mpr-user="logout"]');
      await expect(logout).toBeVisible();
      for (const currentWidth of [width, width === 390 ? 1280 : 390]) {
        await page.setViewportSize({ width: currentWidth, height: 900 });
        await expect.poll(async () => logout.evaluate(element => {
          const bounds = element.getBoundingClientRect();
          const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
          return bounds.left >= 0 && bounds.right <= window.innerWidth && element.contains(hit);
        })).toBe(true);
      }
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await trigger.click();
      await logout.click();
      await expect(page).toHaveURL(/#signed-out$/);
      expect(await page.evaluate(() => window.__mprHeaderLogoutCalled)).toBe(true);
    });
  }

  test('MU-118: renders profile data and logs out', async ({ page }) => {
    await visitUserMenuFixture(page);

    const userHost = page.locator('mpr-user#fixture-user');
    await expect(userHost).toBeVisible();

    const nameLabel = userHost.locator('[data-mpr-user="name"]');
    await expect(nameLabel).toHaveText('Ada');

    const avatarImage = userHost.locator('[data-mpr-user="avatar-image"]');
    await expect(avatarImage).toHaveAttribute('src', 'https://cdn.example.com/avatar.png');

    const trigger = userHost.locator('[data-mpr-user="trigger"]');
    await trigger.click();
    await expect(userHost).toHaveAttribute('data-mpr-user-open', 'true');

    const logoutButton = userHost.locator('[data-mpr-user="logout"]');
    await logoutButton.click();

    const logoutCalled = await page.evaluate(() => Boolean(window.__mprUserLogoutCalled));
    expect(logoutCalled).toBe(true);
    await expect(page).toHaveURL(/#signed-out$/);
  });

  test('MU-118: custom avatar mode uses supplied avatar url', async ({ page }) => {
    await visitUserMenuFixture(page);

    const customHost = page.locator('mpr-user#fixture-user-custom');
    await expect(customHost).toBeVisible();
    const avatarImage = customHost.locator('[data-mpr-user="avatar-image"]');
    await expect(avatarImage).toHaveAttribute('src', 'https://cdn.example.com/custom.png');
  });

  test('MU-125: avatar-only mode renders an outline without a halo', async ({ page }) => {
    await visitUserMenuFixture(page);

    const avatarHost = page.locator('mpr-user#fixture-user-avatar');
    await expect(avatarHost).toBeVisible();

    const nameLabel = avatarHost.locator('[data-mpr-user="name"]');
    await expect(nameLabel).toBeHidden();

    const trigger = avatarHost.locator('[data-mpr-user="trigger"]');
    const avatar = avatarHost.locator('[data-mpr-user="avatar"]');

    const triggerStyles = await trigger.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        backgroundColor: styles.backgroundColor,
        borderTopStyle: styles.borderTopStyle,
        paddingTop: styles.paddingTop,
        paddingRight: styles.paddingRight,
      };
    });

    expect(['rgba(0, 0, 0, 0)', 'transparent']).toContain(triggerStyles.backgroundColor);
    expect(triggerStyles.borderTopStyle).toBe('none');
    expect(triggerStyles.paddingTop).toBe('0px');
    expect(triggerStyles.paddingRight).toBe('0px');

    const baseAvatarStyles = await avatar.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        borderTopStyle: styles.borderTopStyle,
        borderTopWidth: styles.borderTopWidth,
      };
    });

    expect(baseAvatarStyles.borderTopStyle).toBe('solid');
    expect(Number.parseFloat(baseAvatarStyles.borderTopWidth)).toBeGreaterThan(0);

    await trigger.hover();

    const hoverAvatarStyles = await avatar.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        boxShadow: styles.boxShadow,
      };
    });

    expect(hoverAvatarStyles.boxShadow).not.toBe('none');
  });

  test('MU-126: menu items render above the logout action', async ({ page }) => {
    await visitUserMenuFixture(page);

    const menuHost = page.locator('mpr-user#fixture-user-menu-items');
    await expect(menuHost).toBeVisible();

    const trigger = menuHost.locator('[data-mpr-user="trigger"]');
    await trigger.click();

    const menuItems = menuHost.locator('[data-mpr-user="menu-item"]');
    await expect(menuItems).toHaveCount(2);
    await expect(menuItems.nth(0)).toHaveText('Account settings');
    await expect(menuItems.nth(0)).toHaveAttribute('href', '/settings');
    await expect(menuItems.nth(1)).toHaveText('Billing');
    await expect(menuItems.nth(1)).toHaveAttribute('href', '/billing');

    const menuOrderIsValid = await page.evaluate(() => {
      const menuItem = document.querySelector(
        'mpr-user#fixture-user-menu-items [data-mpr-user="menu-item"]',
      );
      const logoutButton = document.querySelector(
        'mpr-user#fixture-user-menu-items [data-mpr-user="logout"]',
      );
      if (!menuItem || !logoutButton) {
        return false;
      }
      return Boolean(menuItem.compareDocumentPosition(logoutButton) & Node.DOCUMENT_POSITION_FOLLOWING);
    });

    expect(menuOrderIsValid).toBe(true);
  });

  test('MU-127: action menu items dispatch events', async ({ page }) => {
    await visitUserMenuFixture(page);

    const menuHost = page.locator('mpr-user#fixture-user-actions');
    await expect(menuHost).toBeVisible();

    const trigger = menuHost.locator('[data-mpr-user="trigger"]');
    await trigger.click();

    const menuItems = menuHost.locator('[data-mpr-user="menu-item"]');
    await expect(menuItems).toHaveCount(2);

    const actionItem = menuItems.nth(0);
    await expect(actionItem).toHaveText('Open settings');
    await expect(actionItem).toHaveAttribute('data-mpr-user-action', 'open-settings');
    await actionItem.click();

    const actionDetail = await page.evaluate(() => window.__mprUserMenuAction);
    expect(actionDetail).toEqual({
      action: 'open-settings',
      label: 'Open settings',
      index: 0,
    });
  });

  test('MU-118: user menu styles respond to theme tokens', async ({ page }) => {
    await visitUserMenuFixture(page);

    const trigger = page.locator('mpr-user#fixture-user [data-mpr-user="trigger"]');
    await trigger.click();

    const menuSelector = 'mpr-user#fixture-user [data-mpr-user="menu"]';
    const [darkSnapshot] = await captureColorSnapshots(page, [menuSelector]);

    await page.evaluate(() => {
      document.body.setAttribute('data-mpr-theme', 'light');
    });

    const [lightSnapshot] = await captureColorSnapshots(page, [menuSelector]);

    expect(darkSnapshot && lightSnapshot && darkSnapshot.background).not.toBe(
      lightSnapshot && lightSnapshot.background,
    );
  });

  test('MU-431: header dropdown remains hittable below the header boundary', async ({ page }) => {
    await visitHeaderUserMenuOverflowFixture(page);

    const headerHost = page.locator('mpr-header#fixture-header');
    await expect(headerHost).toBeVisible();

    const userHost = page.locator('mpr-user#fixture-header-user');
    await expect(userHost).toBeVisible();
    await expect(page.locator('header.mpr-header')).toHaveClass(/mpr-header--authenticated/);

    await userHost.locator('[data-mpr-user="trigger"]').click();
    await expect(userHost).toHaveAttribute('data-mpr-user-open', 'true');

    const metrics = await page.evaluate(() => {
      const headerInner = document.querySelector('header.mpr-header .mpr-header__inner');
      const menu = document.querySelector(
        'mpr-user#fixture-header-user [data-mpr-user="menu"]',
      );
      if (!headerInner || !menu) {
        return null;
      }
      const headerRect = headerInner.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const probeX = Math.max(menuRect.left + 12, menuRect.left + (menuRect.width * 0.25));
      const probeY = Math.max(headerRect.bottom + 12, menuRect.top + 12);
      const probeNode = document.elementFromPoint(probeX, probeY);
      const probeInsideMenu = Boolean(probeNode && menu.contains(probeNode));
      const computedStyle = window.getComputedStyle(headerInner);
      return {
        menuTop: menuRect.top,
        menuBottom: menuRect.bottom,
        headerBottom: headerRect.bottom,
        probeInsideMenu,
        probeY,
        overflowX: computedStyle.overflowX,
        overflowY: computedStyle.overflowY,
      };
    });

    expect(metrics).not.toBeNull();
    if (metrics) {
      expect(metrics.menuBottom).toBeGreaterThan(metrics.headerBottom + 12);
      expect(metrics.probeY).toBeGreaterThan(metrics.headerBottom + 4);
      expect(metrics.probeInsideMenu).toBe(true);
      expect(metrics.overflowY).toBe('visible');
    }
  });
});
