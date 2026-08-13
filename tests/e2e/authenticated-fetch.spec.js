// @ts-check
'use strict';

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test, expect } = require('./support/browserCoverage');

const REPOSITORY_ROOT = join(__dirname, '../..');
const FIXTURE_URL = 'https://static.fixture.test/authenticated-fetch.html';
const BUNDLE_URL =
  'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js';
const SESSION_URL = 'https://auth.fixture.test/auth/session';
const PROTECTED_URL = 'https://static.fixture.test/api/protected';
const FIXTURE_HTML = readFileSync(
  join(REPOSITORY_ROOT, 'tests/e2e/fixtures/authenticated-fetch.html'),
  'utf8',
);
const BUNDLE_SOURCE = readFileSync(join(REPOSITORY_ROOT, 'mpr-ui.js'), 'utf8');

function corsHeaders() {
  return {
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'x-requested-with,x-tauth-tenant',
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-origin': FIXTURE_URL.replace('/authenticated-fetch.html', ''),
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

async function openFixture(page) {
  await page.goto(FIXTURE_URL, { waitUntil: 'load' });
  await page.evaluate(() => window.fixtureReady);
}

function createProtectedRouteState(expectedInitialRequests, options) {
  const config = Object.assign(
    {
      sessionStatus: 200,
      sessionFailureSequence: [],
      protectedAlwaysUnauthorized: false,
      protectedInitiallyAuthorized: false,
      holdSessionRecovery: false,
    },
    options || {},
  );
  let protectedCalls = 0;
  let sessionCalls = 0;
  let accessSessionValid = config.protectedInitiallyAuthorized;
  const protectedRequestBodies = [];
  let releaseInitialRequests;
  const initialRequestsReady = new Promise((resolve) => {
    releaseInitialRequests = resolve;
  });
  let markSessionRequestStarted;
  const sessionRequestStarted = new Promise((resolve) => {
    markSessionRequestStarted = resolve;
  });
  let releaseHeldSessionRecovery;
  const heldSessionRecovery = config.holdSessionRecovery
    ? new Promise((resolve) => {
        releaseHeldSessionRecovery = resolve;
      })
    : Promise.resolve();

  return {
    async routeProtected(route) {
      protectedCalls += 1;
      if (route.request().method() === 'POST') {
        const contentType = route.request().headers()['content-type'] || '';
        protectedRequestBodies.push(
          contentType.includes('application/json')
            ? route.request().postDataJSON()
            : route.request().postData(),
        );
      }
      if (!accessSessionValid || config.protectedAlwaysUnauthorized) {
        if (protectedCalls >= expectedInitialRequests) {
          releaseInitialRequests();
        }
        await route.fulfill({ status: 401, body: 'Unauthorized' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    },
    async routeSession(route) {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders() });
        return;
      }
      sessionCalls += 1;
      markSessionRequestStarted();
      await initialRequestsReady;
      await heldSessionRecovery;
      const configuredFailure = config.sessionFailureSequence[sessionCalls - 1];
      if (configuredFailure === 'network') {
        await route.abort('failed');
        return;
      }
      if (typeof configuredFailure === 'number') {
        await route.fulfill({
          status: configuredFailure,
          headers: corsHeaders(),
        });
        return;
      }
      if (config.sessionStatus !== 200) {
        await route.fulfill({
          status: config.sessionStatus,
          headers: corsHeaders(),
        });
        return;
      }
      accessSessionValid = true;
      await route.fulfill({
        status: 200,
        headers: Object.assign(corsHeaders(), {
          'content-type': 'application/json',
        }),
        body: JSON.stringify({
          user_id: 'fixture-user',
          user_email: 'fixture@example.com',
          display: 'Fixture User',
        }),
      });
    },
    snapshot() {
      return { protectedCalls, sessionCalls };
    },
    protectedBodies() {
      return protectedRequestBodies.slice();
    },
    waitForSessionRequest() {
      return sessionRequestStarted;
    },
    releaseSessionRecovery() {
      if (releaseHeldSessionRecovery) {
        releaseHeldSessionRecovery();
      }
    },
  };
}

async function installProtectedRoutes(context, expectedInitialRequests, options) {
  const state = createProtectedRouteState(expectedInitialRequests, options);
  await context.route(PROTECTED_URL + '**', (route) => state.routeProtected(route));
  await context.route(SESSION_URL, (route) => state.routeSession(route));
  return state;
}

async function runAuthenticatedFetch(page, suffix) {
  return page.evaluate(async ({ protectedUrl, requestSuffix }) => {
    const response = await window.MPRUI.authenticatedFetch(
      window.fixtureAuthTarget,
      protectedUrl + requestSuffix,
    );
    return {
      status: response.status,
      body: await response.text(),
      authStatus: window.fixtureAuthHost.getAttribute('data-mpr-auth-status'),
      events: window.fixtureAuthEvents,
    };
  }, { protectedUrl: PROTECTED_URL, requestSuffix: suffix });
}

test.describe('MPRUI.authenticatedFetch', () => {
  test.beforeEach(async ({ context }) => {
    await installFixtureRoutes(context);
  });

  test('B048: renews an expired access session and retries one protected request', async ({
    context,
    page,
  }) => {
    const routeState = await installProtectedRoutes(context, 1);
    await openFixture(page);

    const result = await runAuthenticatedFetch(page, '?case=expired-access');

    expect(result.status).toBe(200);
    expect(result.authStatus).toBe('authenticated');
    expect(routeState.snapshot()).toEqual({ protectedCalls: 2, sessionCalls: 1 });
    expect(result.events.map((event) => event.type)).toContain(
      'mpr-ui:auth:authenticated',
    );
  });

  test('B048: concurrent requests in one page share one recovery operation', async ({
    context,
    page,
  }) => {
    const routeState = await installProtectedRoutes(context, 2);
    await openFixture(page);

    const statuses = await page.evaluate(async (protectedUrl) => {
      const responses = await Promise.all([
        window.MPRUI.authenticatedFetch(window.fixtureAuthTarget, protectedUrl + '?id=1'),
        window.MPRUI.authenticatedFetch(window.fixtureAuthTarget, protectedUrl + '?id=2'),
      ]);
      return responses.map((response) => response.status);
    }, PROTECTED_URL);

    expect(statuses).toEqual([200, 200]);
    expect(routeState.snapshot()).toEqual({ protectedCalls: 4, sessionCalls: 1 });
  });

  test('B048: requests in two browser tabs share one recovery operation', async ({
    context,
    page,
  }) => {
    const routeState = await installProtectedRoutes(context, 2);
    const secondPage = await context.newPage();
    await Promise.all([openFixture(page), openFixture(secondPage)]);

    const [firstResult, secondResult] = await Promise.all([
      runAuthenticatedFetch(page, '?tab=1'),
      runAuthenticatedFetch(secondPage, '?tab=2'),
    ]);

    expect([firstResult.status, secondResult.status]).toEqual([200, 200]);
    expect([firstResult.authStatus, secondResult.authStatus]).toEqual([
      'authenticated',
      'authenticated',
    ]);
    expect(routeState.snapshot()).toEqual({ protectedCalls: 4, sessionCalls: 1 });
  });

  for (const sessionStatus of [204]) {
    test(`B048: session recovery status ${sessionStatus} emits unauthenticated`, async ({
      context,
      page,
    }) => {
      const routeState = await installProtectedRoutes(context, 1, { sessionStatus });
      await openFixture(page);

      const result = await runAuthenticatedFetch(page, `?session-status=${sessionStatus}`);

      expect(result.status).toBe(401);
      expect(result.authStatus).toBe('unauthenticated');
      expect(routeState.snapshot()).toEqual({ protectedCalls: 1, sessionCalls: 1 });
      expect(result.events.map((event) => event.type)).toContain(
        'mpr-ui:auth:unauthenticated',
      );
    });
  }

  test('B048: a recovery network failure retries without exposing an auth error', async ({
    context,
    page,
  }) => {
    const routeState = await installProtectedRoutes(context, 1, {
      sessionFailureSequence: ['network'],
    });
    await openFixture(page);

    const result = await runAuthenticatedFetch(page, '?case=network-retry');

    expect(result.status).toBe(200);
    expect(result.authStatus).toBe('authenticated');
    expect(routeState.snapshot()).toEqual({ protectedCalls: 2, sessionCalls: 2 });
    expect(result.events.map((event) => event.type)).not.toContain('mpr-ui:auth:error');
  });

  test('B049: permanent recovery responses stop without retrying', async ({
    context,
    page,
  }) => {
    const routeState = await installProtectedRoutes(context, 1, {
      sessionFailureSequence: [403],
    });
    await openFixture(page);

    const result = await page.evaluate(async (protectedUrl) => {
      try {
        await window.MPRUI.authenticatedFetch(
          window.fixtureAuthTarget,
          protectedUrl + '?case=permanent-response',
        );
        return null;
      } catch (error) {
        return {
          code: error.code,
          status: error.status,
          authStatus: window.fixtureAuthHost.getAttribute('data-mpr-auth-status'),
          events: window.fixtureAuthEvents,
        };
      }
    }, PROTECTED_URL);

    expect(result.code).toBe('mpr-ui.auth.session_recovery_failed');
    expect(result.status).toBe(403);
    expect(result.authStatus).toBe('unauthenticated');
    expect(routeState.snapshot()).toEqual({ protectedCalls: 1, sessionCalls: 1 });
    expect(result.events.map((event) => event.type)).toContain('mpr-ui:auth:unauthenticated');
    expect(result.events.map((event) => event.type)).toContain('mpr-ui:auth:error');
  });

  test('B048: protected requests wait for authenticated lifecycle state', async ({
    context,
    page,
  }) => {
    const routeState = await installProtectedRoutes(context, 1);
    await openFixture(page);

    const result = await page.evaluate(async (protectedUrl) => {
      window.MPRUI.testing.unauthenticate(window.fixtureAuthTarget);
      window.fixtureAuthEvents = [];
      try {
        await window.MPRUI.authenticatedFetch(window.fixtureAuthTarget, protectedUrl);
        return null;
      } catch (error) {
        return {
          code: error.code,
          events: window.fixtureAuthEvents,
        };
      }
    }, PROTECTED_URL);

    expect(result.code).toBe('mpr-ui.auth.authenticated_state_required');
    expect(routeState.snapshot()).toEqual({ protectedCalls: 0, sessionCalls: 0 });
    expect(result.events.map((event) => event.type)).toContain('mpr-ui:auth:error');
  });

  test('B048: a non-replayable mutation is not sent a second time', async ({
    context,
    page,
  }) => {
    const routeState = await installProtectedRoutes(context, 1);
    await openFixture(page);

    const status = await page.evaluate(async (protectedUrl) => {
      const originalClone = Request.prototype.clone;
      Request.prototype.clone = function rejectClone() {
        throw new TypeError('fixture request body is not replayable');
      };
      try {
        const response = await window.MPRUI.authenticatedFetch(
          window.fixtureAuthTarget,
          protectedUrl,
          { method: 'POST', body: JSON.stringify({ name: 'test' }) },
          { mutationReplay: 'authorization-before-domain-work' },
        );
        return response.status;
      } finally {
        Request.prototype.clone = originalClone;
      }
    }, PROTECTED_URL);

    expect(status).toBe(401);
    expect(routeState.snapshot()).toEqual({ protectedCalls: 1, sessionCalls: 1 });
  });

  test('B048: an authorized mutation sends its JSON request body', async ({
    context,
    page,
  }) => {
    const routeState = await installProtectedRoutes(context, 1, {
      protectedInitiallyAuthorized: true,
    });
    await openFixture(page);

    const status = await page.evaluate(async (protectedUrl) => {
      const response = await window.MPRUI.authenticatedFetch(
        window.fixtureAuthTarget,
        protectedUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'test' }),
        },
        { mutationReplay: 'authorization-before-domain-work' },
      );
      return response.status;
    }, PROTECTED_URL);

    expect(status).toBe(200);
    expect(routeState.snapshot()).toEqual({ protectedCalls: 1, sessionCalls: 0 });
    expect(routeState.protectedBodies()).toEqual([{ name: 'test' }]);
  });

  test('B048: an authorized mutation sends its multipart request body', async ({
    context,
    page,
  }) => {
    const routeState = await installProtectedRoutes(context, 1, {
      protectedInitiallyAuthorized: true,
    });
    await openFixture(page);

    const status = await page.evaluate(async (protectedUrl) => {
      const formData = new FormData();
      formData.append('name', 'test');
      const response = await window.MPRUI.authenticatedFetch(
        window.fixtureAuthTarget,
        protectedUrl,
        { method: 'POST', body: formData },
        { mutationReplay: 'authorization-before-domain-work' },
      );
      return response.status;
    }, PROTECTED_URL);

    expect(status).toBe(200);
    expect(routeState.snapshot()).toEqual({ protectedCalls: 1, sessionCalls: 0 });
    expect(routeState.protectedBodies()).toHaveLength(1);
    expect(routeState.protectedBodies()[0]).toContain('name="name"');
    expect(routeState.protectedBodies()[0]).toContain('test');
  });

  test('B048: a readable stream remains available for initial delivery and replay', async ({
    page,
  }) => {
    await openFixture(page);

    const result = await page.evaluate(async ({ protectedUrl, sessionUrl }) => {
      const originalFetch = window.fetch;
      const protectedBodies = [];
      let protectedCalls = 0;
      let sessionCalls = 0;
      window.fetch = async function captureAuthenticatedRequest(input, init) {
        const request = new Request(input, init);
        if (request.url === sessionUrl) {
          sessionCalls += 1;
          return new Response(JSON.stringify({
            user_id: 'fixture-user',
            user_email: 'fixture@example.com',
            display: 'Fixture User',
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (request.url !== protectedUrl) {
          throw new Error(`unexpected request: ${request.url}`);
        }
        protectedCalls += 1;
        protectedBodies.push(await request.text());
        return new Response('', { status: protectedCalls === 1 ? 401 : 200 });
      };
      try {
        const requestBody = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('stream-test'));
            controller.close();
          },
        });
        const response = await window.MPRUI.authenticatedFetch(
          window.fixtureAuthTarget,
          protectedUrl,
          {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: requestBody,
            duplex: 'half',
          },
          { mutationReplay: 'authorization-before-domain-work' },
        );
        return {
          status: response.status,
          protectedBodies,
          protectedCalls,
          sessionCalls,
        };
      } finally {
        window.fetch = originalFetch;
      }
    }, { protectedUrl: PROTECTED_URL, sessionUrl: SESSION_URL });

    expect(result).toEqual({
      status: 200,
      protectedBodies: ['stream-test', 'stream-test'],
      protectedCalls: 2,
      sessionCalls: 1,
    });
  });

  test('B048: a Request input preserves its method and body', async ({ page }) => {
    await openFixture(page);

    const result = await page.evaluate(async (protectedUrl) => {
      const originalFetch = window.fetch;
      const capturedRequests = [];
      window.fetch = async function captureAuthenticatedRequest(input, init) {
        const request = new Request(input, init);
        capturedRequests.push({
          body: await request.text(),
          method: request.method,
          requestInput: input instanceof Request,
        });
        return new Response('', { status: 200 });
      };
      try {
        const request = new Request(protectedUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'request-test' }),
        });
        const response = await window.MPRUI.authenticatedFetch(
          window.fixtureAuthTarget,
          request,
          undefined,
          { mutationReplay: 'authorization-before-domain-work' },
        );
        return { status: response.status, capturedRequests };
      } finally {
        window.fetch = originalFetch;
      }
    }, PROTECTED_URL);

    expect(result).toEqual({
      status: 200,
      capturedRequests: [{
        body: JSON.stringify({ name: 'request-test' }),
        method: 'POST',
        requestInput: true,
      }],
    });
  });

  test('B052: a cross-realm Request input preserves its method and body', async ({
    page,
  }) => {
    await openFixture(page);

    const result = await page.evaluate(async (protectedUrl) => {
      const originalFetch = window.fetch;
      const capturedRequests = [];
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      window.fetch = async function captureAuthenticatedRequest(input, init) {
        const request = new Request(input, init);
        capturedRequests.push({
          body: await request.text(),
          method: request.method,
          requestInput: input instanceof Request,
        });
        return new Response('', { status: 200 });
      };
      try {
        const iframeWindow = iframe.contentWindow;
        if (!iframeWindow) {
          throw new Error('same-origin iframe window is unavailable');
        }
        const request = new iframeWindow.Request(protectedUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'cross-realm-request-test' }),
        });
        const response = await window.MPRUI.authenticatedFetch(
          window.fixtureAuthTarget,
          request,
          undefined,
          { mutationReplay: 'authorization-before-domain-work' },
        );
        return {
          status: response.status,
          capturedRequests,
          crossRealm: !(request instanceof Request),
        };
      } finally {
        window.fetch = originalFetch;
        iframe.remove();
      }
    }, PROTECTED_URL);

    expect(result).toEqual({
      status: 200,
      capturedRequests: [{
        body: JSON.stringify({ name: 'cross-realm-request-test' }),
        method: 'POST',
        requestInput: true,
      }],
      crossRealm: true,
    });
  });

  test('B048: a mutation without the server policy is not sent a second time', async ({
    context,
    page,
  }) => {
    const routeState = await installProtectedRoutes(context, 1);
    await openFixture(page);

    const status = await page.evaluate(async (protectedUrl) => {
      const response = await window.MPRUI.authenticatedFetch(
        window.fixtureAuthTarget,
        protectedUrl,
        { method: 'POST', body: JSON.stringify({ name: 'test' }) },
      );
      return response.status;
    }, PROTECTED_URL);

    expect(status).toBe(401);
    expect(routeState.snapshot()).toEqual({ protectedCalls: 1, sessionCalls: 1 });
  });

  test('B048: a replayable mutation retries with the authorization policy', async ({
    context,
    page,
  }) => {
    const routeState = await installProtectedRoutes(context, 1);
    await openFixture(page);

    const status = await page.evaluate(async (protectedUrl) => {
      const response = await window.MPRUI.authenticatedFetch(
        window.fixtureAuthTarget,
        protectedUrl,
        { method: 'POST', body: JSON.stringify({ name: 'test' }) },
        { mutationReplay: 'authorization-before-domain-work' },
      );
      return response.status;
    }, PROTECTED_URL);

    expect(status).toBe(200);
    expect(routeState.snapshot()).toEqual({ protectedCalls: 2, sessionCalls: 1 });
  });

  test('B048: a second HTTP 401 response does not start another recovery', async ({
    context,
    page,
  }) => {
    const routeState = await installProtectedRoutes(context, 1, {
      protectedAlwaysUnauthorized: true,
    });
    await openFixture(page);

    const result = await runAuthenticatedFetch(page, '?case=second-401');

    expect(result.status).toBe(401);
    expect(routeState.snapshot()).toEqual({ protectedCalls: 2, sessionCalls: 1 });
  });

  test('B048: auth option rebinding cancels an in-flight recovery and replay', async ({
    context,
    page,
  }) => {
    const routeState = await installProtectedRoutes(context, 1, {
      holdSessionRecovery: true,
    });
    await openFixture(page);

    const pendingResult = page.evaluate(async (protectedUrl) => {
      try {
        const response = await window.MPRUI.authenticatedFetch(
          window.fixtureAuthTarget,
          protectedUrl,
        );
        return { status: response.status };
      } catch (error) {
        return {
          code: error.code,
          authStatus: window.fixtureAuthHost.getAttribute('data-mpr-auth-status'),
          profileEmail: window.fixtureAuthHost.getAttribute('data-user-email'),
          events: window.fixtureAuthEvents,
        };
      }
    }, PROTECTED_URL);

    await routeState.waitForSessionRequest();
    await page.evaluate(() => {
      window.fixtureAuthEvents = [];
      window.fixtureAuthTarget.updateOptions({
        googleClientId: 'fixture-client',
        tauthUrl: 'https://rebound-auth.fixture.test',
        tenantId: 'fixture-tenant',
        tauthLoginPath: '/auth/google',
        tauthLogoutPath: '/auth/logout',
        tauthNoncePath: '/auth/nonce',
        tauthSessionPath: '/auth/session',
      });
    });
    routeState.releaseSessionRecovery();

    const result = await pendingResult;

    expect(result.code).toBe('mpr-ui.auth.recovery_lifecycle_changed');
    expect(result.authStatus).toBe('unauthenticated');
    expect(result.profileEmail).toBeNull();
    expect(result.events.map((event) => event.type)).not.toContain(
      'mpr-ui:auth:authenticated',
    );
    expect(routeState.snapshot()).toEqual({ protectedCalls: 1, sessionCalls: 1 });
  });
});
