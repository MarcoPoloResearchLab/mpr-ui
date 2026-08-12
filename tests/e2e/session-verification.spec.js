// @ts-check
'use strict';

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test, expect } = require('./support/browserCoverage');

const REPOSITORY_ROOT = join(__dirname, '../..');
const FIXTURE_URL = 'https://static.fixture.test/session-verification.html';
const BUNDLE_URL =
  'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js';
const SESSION_URL = 'https://auth.fixture.test/auth/session';
const FIXTURE_HTML = readFileSync(
  join(REPOSITORY_ROOT, 'tests/e2e/fixtures/session-verification.html'),
  'utf8',
);
const BUNDLE_SOURCE = readFileSync(join(REPOSITORY_ROOT, 'mpr-ui.js'), 'utf8');

function corsHeaders() {
  return {
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'x-requested-with,x-tauth-tenant',
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-origin': 'https://static.fixture.test',
  };
}

async function installFixtureRoutes(context) {
  await context.route(FIXTURE_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: FIXTURE_HTML,
    }),
  );
  await context.route(BUNDLE_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: BUNDLE_SOURCE,
    }),
  );
}

test.describe('TAuth session verification', () => {
  test.beforeEach(async ({ context }) => {
    await installFixtureRoutes(context);
  });

  test('verifies a new browser without a restore hint and retries transient failures', async ({
    context,
    page,
  }) => {
    let sessionCalls = 0;
    await context.route(SESSION_URL, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders() });
        return;
      }
      sessionCalls += 1;
      if (sessionCalls === 1) {
        await route.abort('failed');
        return;
      }
      if (sessionCalls === 2) {
        await route.fulfill({ status: 503, headers: corsHeaders() });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: Object.assign(corsHeaders(), {
          'content-type': 'application/json',
        }),
        body: JSON.stringify({
          user_id: 'new-user',
          user_email: 'new@example.com',
          display: 'New User',
        }),
      });
    });

    await page.goto(FIXTURE_URL, { waitUntil: 'load' });

    const controller = page.locator('#auth-controller');
    await expect(controller).toHaveAttribute('data-mpr-auth-status', 'authenticated');
    expect(sessionCalls).toBe(3);
    const snapshot = await page.evaluate(() => ({
      restoreHint: window.localStorage.getItem(
        'tauth.restore.v1:https%3A%2F%2Fauth.fixture.test:fixture-tenant',
      ),
      events: window.fixtureAuthEvents,
    }));
    expect(snapshot.restoreHint).toBe('1');
    expect(snapshot.events.map((event) => event.type)).not.toContain(
      'mpr-ui:auth:error',
    );
    expect(
      snapshot.events
        .filter((event) => event.type === 'mpr-ui:auth:status-change')
        .map((event) => event.detail.status),
    ).not.toContain('error');
  });

  test('stops after a permanent TAuth rejection and keeps sign-in available', async ({
    context,
    page,
  }) => {
    let sessionCalls = 0;
    await context.route(SESSION_URL, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders() });
        return;
      }
      sessionCalls += 1;
      await route.fulfill({ status: 403, headers: corsHeaders() });
    });

    await page.goto(FIXTURE_URL, { waitUntil: 'load' });

    const controller = page.locator('#auth-controller');
    await expect(controller).toHaveAttribute('data-mpr-auth-status', 'unauthenticated');
    expect(sessionCalls).toBe(1);
    const snapshot = await page.evaluate(() => ({
      restoreHint: window.localStorage.getItem(
        'tauth.restore.v1:https%3A%2F%2Fauth.fixture.test:fixture-tenant',
      ),
      events: window.fixtureAuthEvents,
    }));
    expect(snapshot.restoreHint).toBeNull();
    expect(snapshot.events).toContainEqual(expect.objectContaining({
      type: 'mpr-ui:auth:error',
      detail: expect.objectContaining({
        code: 'mpr-ui.auth.bootstrap_failed',
        status: 403,
      }),
    }));
  });

  test('accepts only the canonical anonymous session response', async ({
    context,
    page,
  }) => {
    let sessionCalls = 0;
    await context.route(SESSION_URL, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders() });
        return;
      }
      sessionCalls += 1;
      await route.fulfill({ status: 204, headers: corsHeaders() });
    });

    await page.goto(FIXTURE_URL, { waitUntil: 'load' });

    await expect(page.locator('#auth-controller')).toHaveAttribute(
      'data-mpr-auth-status',
      'unauthenticated',
    );
    expect(sessionCalls).toBe(1);
  });

  test('repeated bundle delivery preserves one mounted authentication controller', async ({
    context,
    page,
  }) => {
    let sessionCalls = 0;
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    await context.route(SESSION_URL, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders() });
        return;
      }
      sessionCalls += 1;
      await route.fulfill({ status: 204, headers: corsHeaders() });
    });

    await page.goto(FIXTURE_URL, { waitUntil: 'load' });
    await expect(page.locator('#auth-controller')).toHaveAttribute(
      'data-mpr-auth-status',
      'unauthenticated',
    );
    const initialNamespace = await page.evaluateHandle(() => window.MPRUI);

    await page.evaluate((bundleURL) => new Promise((resolve, reject) => {
      const scriptElement = document.createElement('script');
      scriptElement.src = bundleURL;
      scriptElement.onload = resolve;
      scriptElement.onerror = () => reject(new Error('duplicate bundle load failed'));
      document.head.appendChild(scriptElement);
    }), BUNDLE_URL);

    expect(await page.evaluate((namespace) => window.MPRUI === namespace, initialNamespace)).toBe(true);
    expect(sessionCalls).toBe(1);
    expect(pageErrors).toEqual([]);
  });
});
