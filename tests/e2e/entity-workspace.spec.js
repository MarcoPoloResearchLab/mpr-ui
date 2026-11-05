// @ts-check

const { test, expect } = require('./support/browserCoverage');
const { visitEntityWorkspaceFixture } = require('./support/fixturePage');

test.describe('Entity workspace primitives', () => {
  test.beforeEach(async ({ page }) => {
    await visitEntityWorkspaceFixture(page);
  });

  test('MU-429: workspace shell components render and dispatch interactions', async ({ page }) => {
    await expect(page.locator('mpr-workspace-layout#fixture-workspace')).toBeVisible();
    await expect(page.locator('mpr-sidebar-nav#fixture-sidebar')).toBeVisible();
    await expect(page.locator('mpr-entity-rail#fixture-rail')).toBeVisible();
    await expect(page.locator('mpr-entity-workspace#fixture-entity-workspace')).toBeVisible();

    await page.locator('mpr-sidebar-nav [data-mpr-sidebar-key="uploads"]').click();
    await page.locator('[data-mpr-entity-workspace="load-more-button"]').click();
    await page.locator('#open-drawer-button').click();

    await expect(page.locator('mpr-detail-drawer#fixture-drawer')).toHaveAttribute(
      'data-mpr-detail-drawer-open',
      'true',
    );
    await page.locator('[data-mpr-detail-drawer="close"]').click();
    await expect(page.locator('mpr-detail-drawer#fixture-drawer')).toHaveAttribute(
      'data-mpr-detail-drawer-open',
      'false',
    );

    const closedDrawerMetrics = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(closedDrawerMetrics.documentWidth).toBeLessThanOrEqual(
      closedDrawerMetrics.viewportWidth + 1,
    );
    expect(closedDrawerMetrics.bodyWidth).toBeLessThanOrEqual(
      closedDrawerMetrics.viewportWidth + 1,
    );

    const logEntries = page.locator('[data-test="workspace-event-entry"]');
    await expect(logEntries).toHaveCount(4);
    await expect(logEntries.nth(0)).toContainText('mpr-sidebar-nav:change');
    await expect(logEntries.nth(1)).toContainText('mpr-entity-workspace:load-more');
    await expect(logEntries.nth(2)).toContainText('mpr-detail-drawer:open');
    await expect(logEntries.nth(3)).toContainText('mpr-detail-drawer:close');
  });

  test('MU-429: workspace layout and rail respond to browser interactions', async ({ page }) => {
    const railNextButton = page.locator('[data-mpr-entity-rail="next"]');
    await expect(railNextButton).toBeVisible();
    await railNextButton.click();

    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('[data-test="workspace-event-entry"]')).some(
        (entry) => (entry.textContent || '').includes('mpr-entity-rail:scroll-end'),
      );
    });

    await page.evaluate(() => {
      const workspace = document.getElementById('fixture-workspace');
      if (workspace && typeof workspace.toggleSidebar === 'function') {
        workspace.toggleSidebar(true);
      }
    });

    await expect(page.locator('mpr-workspace-layout#fixture-workspace')).toHaveAttribute(
      'data-mpr-workspace-collapsed',
      'true',
    );
    await expect(page.locator('[data-mpr-workspace-layout="sidebar"]')).toBeHidden();
  });

  test('MU-429: rail and workspace absorb nodes appended after mount', async ({ page }) => {
    await page.evaluate(() => {
      const rail = document.getElementById('fixture-rail');
      const workspace = document.getElementById('fixture-entity-workspace');
      if (!rail || !workspace) {
        throw new Error('fixture.entity_workspace.missing_root');
      }

      const lateTile = document.createElement('mpr-entity-tile');
      lateTile.setAttribute('data-test-id', 'late-tile');
      lateTile.setAttribute('interactive', 'true');
      const tileTitle = document.createElement('div');
      tileTitle.slot = 'title';
      tileTitle.textContent = 'Late Playlist';
      lateTile.appendChild(tileTitle);
      rail.appendChild(lateTile);

      const lateCard = document.createElement('mpr-entity-card');
      lateCard.setAttribute('data-test-id', 'late-card');
      const cardTitle = document.createElement('div');
      cardTitle.slot = 'title';
      cardTitle.textContent = 'Late Video';
      lateCard.appendChild(cardTitle);
      workspace.appendChild(lateCard);
    });

    await expect(
      page.locator('[data-mpr-entity-rail="track"] mpr-entity-tile[data-test-id="late-tile"]'),
    ).toBeVisible();
    await expect(
      page.locator(
        '[data-mpr-entity-workspace="list"] mpr-entity-card[data-test-id="late-card"]',
      ),
    ).toBeVisible();
  });

  test('tile cards reserve action space and keep summary width across title lengths', async ({ page }) => {
    for (const viewportWidth of [1280, 375]) {
      await page.setViewportSize({ width: viewportWidth, height: 900 });
      await page.evaluate(() => {
        const fixture = document.createElement('section');
        fixture.id = 'tile-layout-fixture';
        fixture.style.cssText = 'position:fixed;inset:0;z-index:10000;background:white;padding:12px';
        document.body.appendChild(fixture);
        for (const [index, title] of ['Short title', 'A longer title<br>with two lines', 'A longer title<br>with three lines<br>and more words', 'A much longer localized title with several words that wraps across multiple lines'].entries()) {
          const card = document.createElement('mpr-entity-card');
          card.id = `tile-card-${index}`;
          card.setAttribute('layout', 'tile');
          card.style.cssText = 'width:100%;max-width:460px;margin-bottom:12px';
          card.innerHTML = `<span slot="media" style="display:block;width:36px;height:36px">M</span><div slot="title">${title}</div><button slot="actions" type="button">Mehr Optionen</button><div slot="summary">A summary beneath the title and action control.</div>`;
          card.querySelector('[slot="actions"]').addEventListener('click', () => {
            card.dataset.actionClicks = String(Number(card.dataset.actionClicks || 0) + 1);
          });
          fixture.appendChild(card);
        }
      });
      for (const index of [0, 1, 2, 3]) {
        const card = page.locator(`#tile-card-${index}`);
        await expect(card).toHaveAttribute('data-mpr-entity-card-layout', 'tile');
        const geometry = await card.evaluate((host) => {
          const bounds = (region) => host.querySelector(`[data-mpr-entity-card="${region}"]`).getBoundingClientRect().toJSON();
          const surface = host.querySelector('article').getBoundingClientRect().toJSON();
          const surfaceStyle = getComputedStyle(host.querySelector('article'));
          const inset = parseFloat(surfaceStyle.paddingRight) + parseFloat(surfaceStyle.borderRightWidth);
          return { surface, inset, title: bounds('title'), actions: bounds('actions'), button: host.querySelector('button[slot="actions"]').getBoundingClientRect().toJSON(), summary: bounds('summary'), media: bounds('media') };
        });
        expect(Math.abs(geometry.title.top - geometry.actions.top)).toBeLessThan(1);
        expect(geometry.title.right).toBeLessThanOrEqual(geometry.actions.left);
        expect(geometry.summary.top).toBeGreaterThanOrEqual(Math.max(geometry.title.bottom, geometry.actions.bottom));
        expect(Math.abs(geometry.summary.right - geometry.actions.right)).toBeLessThan(1);
        expect(geometry.surface.right - geometry.actions.right).toBeCloseTo(geometry.inset, 0);
        expect(geometry.actions.top - geometry.surface.top).toBeCloseTo(geometry.inset, 0);
        expect(geometry.button.top - geometry.surface.top).toBeCloseTo(geometry.inset, 0);
        expect(geometry.surface.right - geometry.button.right).toBeCloseTo(geometry.inset, 0);
        expect(geometry.title.left).toBeGreaterThan(geometry.media.right);
      }
      const action = page.locator('#tile-card-1 [slot="actions"]');
      await action.focus();
      await page.locator('#tile-card-1').evaluate((host) => host.setAttribute('selected', ''));
      await expect(action).toBeFocused();
      await action.click();
      await expect(page.locator('#tile-card-1')).toHaveAttribute('data-action-clicks', '1');
      await action.focus();
      await page.locator('#tile-card-1').evaluate((host) => host.setAttribute('busy', ''));
      await expect(action).toBeFocused();
      await expect(page.locator('#tile-card-1 [data-mpr-entity-card="busy"]')).toBeVisible();
      await page.locator('#tile-card-1').evaluate((host) => host.setAttribute('density', 'compact'));
      await expect(action).toBeFocused();
      await page.locator('#tile-layout-fixture').evaluate((fixture) => fixture.remove());
    }
  });

  test('tile cards omit empty regions and reject unknown layouts', async ({ page }) => {
    await page.evaluate(() => {
      const card = document.createElement('mpr-entity-card');
      card.id = 'minimal-tile-card';
      card.setAttribute('layout', 'tile');
      card.innerHTML = '<div slot="title">Only a title</div><div slot="summary">Summary</div>';
      document.body.appendChild(card);
    });
    const minimalCard = page.locator('#minimal-tile-card');
    await expect(minimalCard).toHaveAttribute('data-mpr-entity-card-layout', 'tile');
    for (const region of ['media', 'select', 'actions', 'meta', 'metric', 'footer']) {
      await expect(minimalCard.locator(`[data-mpr-entity-card="${region}"]`)).toBeHidden();
    }
    const geometry = await minimalCard.evaluate((host) => {
      const title = host.querySelector('[data-mpr-entity-card="title"]').getBoundingClientRect();
      const summary = host.querySelector('[data-mpr-entity-card="summary"]').getBoundingClientRect();
      return { title: title.toJSON(), summary: summary.toJSON() };
    });
    expect(geometry.title.left).toBe(geometry.summary.left);
    expect(geometry.title.right).toBe(geometry.summary.right);
    const error = page.waitForEvent('pageerror');
    await minimalCard.evaluate((host) => host.setAttribute('layout', 'unsupported'));
    expect((await error).message).toContain('mpr-entity-card.layout.invalid');
    await expect(minimalCard).toHaveAttribute('data-mpr-entity-card-layout', 'tile');
  });

  test('formatted title-only tile cards omit whitespace-only summary content', async ({ page }) => {
    await page.evaluate(() => {
      const card = document.createElement('mpr-entity-card');
      card.id = 'formatted-title-only-card';
      card.setAttribute('layout', 'tile');
      card.innerHTML = `
        <div slot="title">Only a title</div>
      `;
      document.body.appendChild(card);
    });
    const card = page.locator('#formatted-title-only-card');
    await expect(card.locator('[data-mpr-entity-card="summary"]')).toBeHidden();
    const geometry = await card.evaluate((host) => {
      const title = host.querySelector('[data-mpr-entity-card="title"]').getBoundingClientRect();
      const body = host.querySelector('.mpr-entity-card__body').getBoundingClientRect();
      return { titleHeight: title.height, bodyHeight: body.height };
    });
    expect(geometry.bodyHeight).toBe(geometry.titleHeight);
  });

  test('tile surfaces fill equal grid rows with unequal content', async ({ page }) => {
    await page.evaluate(() => {
      const grid = document.createElement('section');
      grid.id = 'equal-height-card-grid';
      grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;width:600px';
      grid.innerHTML = `<mpr-entity-card layout="tile"><div slot="title">Short</div><div slot="summary">Brief summary.</div></mpr-entity-card>
        <mpr-entity-card layout="tile"><div slot="title">A title with more detail</div><div slot="summary">A much longer summary that uses several lines in the same grid row and gives this card a greater intrinsic height than its adjacent card.</div></mpr-entity-card>`;
      document.body.appendChild(grid);
    });
    const heights = await page.locator('#equal-height-card-grid').evaluate((grid) =>
      Array.from(grid.querySelectorAll('mpr-entity-card')).map((card) => ({
        host: card.getBoundingClientRect().height,
        surface: card.querySelector('article').getBoundingClientRect().height,
      })),
    );
    expect(heights[0].host).toBe(heights[1].host);
    expect(heights[0].surface).toBe(heights[0].host);
    expect(heights[1].surface).toBe(heights[1].host);
  });

});
