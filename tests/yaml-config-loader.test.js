'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const loaderPath = path.join(__dirname, '..', 'mpr-ui-config.js');

function resetEnvironment() {
  delete require.cache[loaderPath];
  delete global.MPRUI;
  delete global.CustomEvent;
  delete global.document;
  delete global.location;
  delete global.fetch;
  delete global.jsyaml;
  delete global.window;
}

function createElement(initialAttributes) {
  const attributes = Object.assign({}, initialAttributes);
  return {
    attributes,
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name)
        ? attributes[name]
        : null;
    },
    removeAttribute(name) {
      delete attributes[name];
    },
  };
}

function createBaseConfig() {
  return {
    environments: [
      {
        description: '  Example environment  ',
        origins: [' https://example.com ', '', 'https://mirror.example.com'],
        auth: {
          tauthUrl: 'https://auth.example.com',
          tenantId: 'example-tenant',
          logoutPath: '/auth/logout',
          sessionPath: '/auth/session',
          providers: {
            google: {
              enabled: true,
              clientId: 'example-client',
              loginPath: '/auth/google',
              noncePath: '/auth/nonce',
            },
            apple: {
              enabled: false,
            },
          },
        },
      },
    ],
  };
}

function setupYamlEnvironment(configPayload, options) {
  const settings = Object.assign(
    {
      origin: 'https://example.com',
      responseOk: true,
      status: 200,
      responseText: 'ignored',
      document: undefined,
      customEvent: undefined,
      existingNamespace: undefined,
      createWindow: false,
    },
    options || {},
  );
  global.location = {
    origin: settings.origin === undefined ? 'https://example.com' : settings.origin,
  };
  global.fetch = async function fetchConfig() {
    return {
      ok: settings.responseOk,
      status: settings.status,
      text: async function readText() {
        return settings.responseText;
      },
    };
  };
  global.jsyaml = {
    load() {
      return configPayload;
    },
  };
  if (settings.document) {
    global.document = settings.document;
  }
  if (settings.customEvent) {
    global.CustomEvent = settings.customEvent;
  }
  if (settings.existingNamespace) {
    global.MPRUI = settings.existingNamespace;
  }
  if (settings.createWindow) {
    global.window = global;
  }
}

function createDocumentStub(options) {
  const settings = Object.assign(
    {
      readyState: 'complete',
      selectors: {},
      selectorList: {},
      hasHead: true,
      autoLoadScripts: false,
      autoFailScripts: false,
      exposeBundleApi: true,
      includeCreateElement: true,
    },
    options || {},
  );
  const eventHandlers = {};
  const appendedScripts = [];
  const dispatchedEvents = [];
  const documentStub = {
    readyState: settings.readyState,
    head: settings.hasHead
      ? {
          appendChild(node) {
            appendedScripts.push(node);
            if (settings.autoFailScripts && typeof node.onerror === 'function') {
              node.onerror();
            }
            if (settings.autoLoadScripts && typeof node.onload === 'function') {
              if (settings.exposeBundleApi) {
                global.MPRUI.authenticatedFetch = function authenticatedFetch() {};
              }
              node.onload();
            }
            return node;
          },
        }
      : null,
    addEventListener(type, handler) {
      eventHandlers[String(type)] = handler;
    },
    dispatchEvent(event) {
      dispatchedEvents.push(event);
      return true;
    },
    querySelector(selector) {
      return Object.prototype.hasOwnProperty.call(settings.selectors, selector)
        ? settings.selectors[selector]
        : null;
    },
    querySelectorAll(selector) {
      return Object.prototype.hasOwnProperty.call(settings.selectorList, selector)
        ? settings.selectorList[selector]
        : [];
    },
  };
  if (settings.includeCreateElement) {
    documentStub.createElement = function createElementNode(tagName) {
      return {
        tagName: String(tagName),
        async: false,
        defer: false,
        src: '',
        onload: null,
        onerror: null,
      };
    };
  }
  return {
    document: documentStub,
    appendedScripts,
    dispatchedEvents,
    eventHandlers,
  };
}

function loadNamespace() {
  require(loaderPath);
  return global.MPRUI;
}

test('loadYamlConfig selects matching environment by origin and preserves an existing namespace', async () => {
  resetEnvironment();
  const configPayload = createBaseConfig();
  const existingNamespace = { existingHelper: true };

  setupYamlEnvironment(configPayload, { existingNamespace });
  const namespace = loadNamespace();
  const runtimeConfig = await namespace.loadYamlConfig({ configUrl: '/config-ui.yaml' });

  assert.equal(namespace.existingHelper, true);
  assert.equal(runtimeConfig.description, 'Example environment');
  assert.deepEqual(runtimeConfig.origins, [
    'https://example.com',
    'https://mirror.example.com',
  ]);
  assert.equal(runtimeConfig.auth.providers.google.clientId, 'example-client');
  assert.equal(runtimeConfig.auth.sessionPath, '/auth/session');
  assert.equal(Object.isFrozen(runtimeConfig), true);
  assert.equal(Object.isFrozen(runtimeConfig.auth), true);
  assert.equal(Object.isFrozen(runtimeConfig.auth.providers), true);
});

test('loadYamlConfig accepts auth-only runtime config and rejects obsolete presentation configuration', async () => {
  resetEnvironment();
  const configPayload = createBaseConfig();

  setupYamlEnvironment(configPayload);
  const namespace = loadNamespace();
  const runtimeConfig = await namespace.loadYamlConfig({ configUrl: '/config-ui.yaml' });

  assert.deepEqual(Object.keys(runtimeConfig), ['description', 'origins', 'auth']);

  resetEnvironment();
  const obsoletePresentationConfig = createBaseConfig();
  obsoletePresentationConfig.environments[0].authButton = {
    text: 'signin_with',
    size: 'large',
    theme: 'outline',
  };

  setupYamlEnvironment(obsoletePresentationConfig);
  const secondNamespace = loadNamespace();

  await assert.rejects(
    secondNamespace.loadYamlConfig({ configUrl: '/config-ui.yaml' }),
    {
      message:
        'config-ui.yaml does not allow authButton; declare login-button presentation in static markup',
    },
  );
});

test('loadYamlConfig accepts Google-only, Apple-only, and combined provider maps', async () => {
  const providerCases = [
    {
      label: 'Google-only',
      google: {
        enabled: true,
        clientId: 'google-client',
        loginPath: '/auth/google',
        noncePath: '/auth/nonce',
      },
      apple: { enabled: false },
    },
    {
      label: 'Apple-only',
      google: { enabled: false },
      apple: {
        enabled: true,
        startPath: '/auth/apple/start',
        returnTo: 'current-url',
        label: 'Sign in with Apple',
      },
    },
    {
      label: 'combined',
      google: {
        enabled: true,
        clientId: 'google-client',
        loginPath: '/auth/google',
        noncePath: '/auth/nonce',
      },
      apple: {
        enabled: true,
        startPath: '/auth/apple/start',
        returnTo: '/signed-in',
        label: 'Continue with Apple',
      },
    },
  ];

  for (const providerCase of providerCases) {
    resetEnvironment();
    const configPayload = createBaseConfig();
    configPayload.environments[0].auth.providers = {
      google: providerCase.google,
      apple: providerCase.apple,
    };
    setupYamlEnvironment(configPayload);
    const namespace = loadNamespace();
    const runtimeConfig = await namespace.loadYamlConfig({
      configUrl: '/config-ui.yaml',
    });

    assert.equal(
      runtimeConfig.auth.providers.google.enabled,
      providerCase.google.enabled,
      `${providerCase.label}: Google state is preserved`,
    );
    assert.equal(
      runtimeConfig.auth.providers.apple.enabled,
      providerCase.apple.enabled,
      `${providerCase.label}: Apple state is preserved`,
    );
  }
});

test('loadYamlConfig covers default options and loader fallback branches', async () => {
  resetEnvironment();
  const configWithMixedOrigins = createBaseConfig();
  configWithMixedOrigins.environments[0].origins = [' https://example.com ', 42, null, ''];

  setupYamlEnvironment(configWithMixedOrigins);
  const namespace = loadNamespace();
  const runtimeConfig = await namespace.loadYamlConfig();

  assert.deepEqual(runtimeConfig.origins, ['https://example.com']);

  resetEnvironment();
  setupYamlEnvironment(createBaseConfig());
  global.location = null;
  const namespaceWithoutLocation = loadNamespace();

  assert.throws(
    function throwWithoutLocation() {
      return namespaceWithoutLocation.loadYamlConfig();
    },
    { message: 'window.location.origin is required for config selection' },
  );

  resetEnvironment();
  global.location = { origin: 'https://example.com' };
  global.fetch = async function fetchNullResponse() {
    return null;
  };
  global.jsyaml = {
    load() {
      return createBaseConfig();
    },
  };
  const namespaceWithNullResponse = loadNamespace();

  await assert.rejects(
    namespaceWithNullResponse.loadYamlConfig(),
    { message: 'config-ui.yaml request failed (unknown)' },
  );
});

test('loadYamlConfig rejects invalid structure and provider-aware auth config', async () => {
  function configWithAuthMutation(mutateAuth) {
    const config = createBaseConfig();
    mutateAuth(config.environments[0].auth);
    return config;
  }

  const cases = [
    {
      name: 'missing runtime origin',
      origin: '',
      configPayload: createBaseConfig(),
      expectedMessage: 'window.location.origin is required for config selection',
    },
    {
      name: 'parsed YAML root is not an object',
      configPayload: [],
      expectedMessage: 'config-ui.yaml must be an object',
    },
    {
      name: 'missing environments array',
      configPayload: {},
      expectedMessage: 'config-ui.yaml missing environments',
    },
    {
      name: 'environment entry is not an object',
      configPayload: { environments: ['bad-entry'] },
      expectedMessage: 'config-ui.yaml environment at index 0 must be an object',
    },
    {
      name: 'environment missing origins',
      configPayload: {
        environments: [
          {
            auth: createBaseConfig().environments[0].auth,
          },
        ],
      },
      expectedMessage: 'config-ui.yaml environment missing origins',
    },
    {
      name: 'environment has no matching origin',
      configPayload: createBaseConfig(),
      origin: 'https://unknown-origin.com',
      expectedMessage: 'config-ui.yaml has no environment for origin https://unknown-origin.com',
    },
    {
      name: 'environment has multiple matches',
      configPayload: {
        environments: [
          createBaseConfig().environments[0],
          createBaseConfig().environments[0],
        ],
      },
      expectedMessage: 'config-ui.yaml has multiple environments for origin https://example.com',
    },
    {
      name: 'missing auth object',
      configPayload: {
        environments: [
          {
            origins: ['https://example.com'],
          },
        ],
      },
      expectedMessage: 'config-ui.yaml missing auth.auth',
    },
    {
      name: 'missing tauthUrl',
      configPayload: configWithAuthMutation((auth) => delete auth.tauthUrl),
      expectedMessage: 'config-ui.yaml missing auth.tauthUrl',
    },
    {
      name: 'non-string tauthUrl',
      configPayload: configWithAuthMutation((auth) => {
        auth.tauthUrl = null;
      }),
      expectedMessage: 'config-ui.yaml missing auth.tauthUrl',
    },
    {
      name: 'malformed tauthUrl',
      configPayload: configWithAuthMutation((auth) => {
        auth.tauthUrl = 'not-a-url';
      }),
      expectedMessage: 'config-ui.yaml invalid auth.tauthUrl',
    },
    {
      name: 'tauthUrl includes a path',
      configPayload: configWithAuthMutation((auth) => {
        auth.tauthUrl = 'https://auth.example.com/private';
      }),
      expectedMessage: 'config-ui.yaml invalid auth.tauthUrl',
    },
    {
      name: 'missing tenantId',
      configPayload: configWithAuthMutation((auth) => delete auth.tenantId),
      expectedMessage: 'config-ui.yaml missing auth.tenantId',
    },
    {
      name: 'unknown auth key',
      configPayload: configWithAuthMutation((auth) => {
        auth.googleClientId = 'obsolete-client';
      }),
      expectedMessage: 'config-ui.yaml unknown auth.googleClientId',
    },
    {
      name: 'missing logoutPath',
      configPayload: configWithAuthMutation((auth) => delete auth.logoutPath),
      expectedMessage: 'config-ui.yaml missing auth.logoutPath',
    },
    {
      name: 'unsafe sessionPath',
      configPayload: configWithAuthMutation((auth) => {
        auth.sessionPath = 'https://unsafe.example/session';
      }),
      expectedMessage: 'config-ui.yaml invalid auth.sessionPath',
    },
    {
      name: 'unknown provider',
      configPayload: configWithAuthMutation((auth) => {
        auth.providers.magic = { enabled: true };
      }),
      expectedMessage: 'config-ui.yaml unknown auth.providers.magic',
    },
    {
      name: 'missing Google provider',
      configPayload: configWithAuthMutation((auth) => delete auth.providers.google),
      expectedMessage: 'config-ui.yaml missing auth.providers.google',
    },
    {
      name: 'invalid Google enabled flag',
      configPayload: configWithAuthMutation((auth) => {
        auth.providers.google.enabled = 'true';
      }),
      expectedMessage: 'config-ui.yaml missing auth.providers.google.enabled',
    },
    {
      name: 'disabled Google provider includes settings',
      configPayload: configWithAuthMutation((auth) => {
        auth.providers.google.enabled = false;
      }),
      expectedMessage: 'config-ui.yaml disabled auth.providers.google has settings',
    },
    {
      name: 'enabled Google provider misses clientId',
      configPayload: configWithAuthMutation((auth) => {
        delete auth.providers.google.clientId;
      }),
      expectedMessage: 'config-ui.yaml missing auth.providers.google.clientId',
    },
    {
      name: 'enabled Apple provider misses startPath',
      configPayload: configWithAuthMutation((auth) => {
        auth.providers.google = { enabled: false };
        auth.providers.apple = {
          enabled: true,
          returnTo: 'current-url',
          label: 'Sign in with Apple',
        };
      }),
      expectedMessage: 'config-ui.yaml missing auth.providers.apple.startPath',
    },
    {
      name: 'enabled Apple provider has unsafe returnTo',
      configPayload: configWithAuthMutation((auth) => {
        auth.providers.google = { enabled: false };
        auth.providers.apple = {
          enabled: true,
          startPath: '/auth/apple/start',
          returnTo: 'https://unsafe.example/return',
          label: 'Sign in with Apple',
        };
      }),
      expectedMessage: 'config-ui.yaml invalid auth.providers.apple.returnTo',
    },
    {
      name: 'enabled Apple provider startPath has a backslash authority escape',
      configPayload: configWithAuthMutation((auth) => {
        auth.providers.google = { enabled: false };
        auth.providers.apple = {
          enabled: true,
          startPath: '/\\unsafe.example/start',
          returnTo: 'current-origin',
          label: 'Sign in with Apple',
        };
      }),
      expectedMessage: 'config-ui.yaml invalid auth.providers.apple.startPath',
    },
    {
      name: 'enabled Apple provider returnTo has a stripped control escape',
      configPayload: configWithAuthMutation((auth) => {
        auth.providers.google = { enabled: false };
        auth.providers.apple = {
          enabled: true,
          startPath: '/auth/apple/start',
          returnTo: '/\t/unsafe.example/return',
          label: 'Sign in with Apple',
        };
      }),
      expectedMessage: 'config-ui.yaml invalid auth.providers.apple.returnTo',
    },
    {
      name: 'enabled Apple provider has invalid label',
      configPayload: configWithAuthMutation((auth) => {
        auth.providers.google = { enabled: false };
        auth.providers.apple = {
          enabled: true,
          startPath: '/auth/apple/start',
          returnTo: 'current-origin',
          label: 'Apple',
        };
      }),
      expectedMessage: 'config-ui.yaml invalid auth.providers.apple.label',
    },
    {
      name: 'all providers disabled',
      configPayload: configWithAuthMutation((auth) => {
        auth.providers.google = { enabled: false };
        auth.providers.apple = { enabled: false };
      }),
      expectedMessage: 'config-ui.yaml requires an enabled auth provider',
    },
  ];

  for (const testCase of cases) {
    resetEnvironment();
    setupYamlEnvironment(testCase.configPayload, { origin: testCase.origin });
    const namespace = loadNamespace();

    await assert.rejects(
      async function loadInvalidConfig() {
        return namespace.loadYamlConfig({ configUrl: '/config-ui.yaml' });
      },
      { message: testCase.expectedMessage },
      testCase.name,
    );
  }
});

test('loadYamlConfig rejects boundary failures, shares in-flight parser loads, and retries a failed parser load', async () => {
  resetEnvironment();
  global.location = { origin: 'https://example.com' };
  const namespaceWithoutDocument = loadNamespace();

  await assert.rejects(
    namespaceWithoutDocument.loadYamlConfig({ configUrl: '/config-ui.yaml' }),
    {
      message:
        'document is required to load https://cdn.jsdelivr.net/npm/js-yaml@5.4.1/dist/browser/js-yaml.umd.min.js',
    },
  );

  resetEnvironment();
  global.location = { origin: 'https://example.com' };
  global.jsyaml = {
    load() {
      return createBaseConfig();
    },
  };
  const namespaceWithoutFetch = loadNamespace();

  await assert.rejects(
    namespaceWithoutFetch.loadYamlConfig({ configUrl: '/config-ui.yaml' }),
    { message: 'fetch is required to load config-ui.yaml' },
  );

  resetEnvironment();
  setupYamlEnvironment(createBaseConfig(), {
    responseOk: false,
    status: 503,
  });
  const namespaceWithBadResponse = loadNamespace();

  await assert.rejects(
    namespaceWithBadResponse.loadYamlConfig({ configUrl: '/config-ui.yaml' }),
    { message: 'config-ui.yaml request failed (503)' },
  );

  resetEnvironment();
  const successfulParserDocument = createDocumentStub({
    includeCreateElement: true,
  });
  global.location = { origin: 'https://example.com' };
  global.fetch = async function fetchConfig() {
    return {
      ok: true,
      status: 200,
      text: async function readText() {
        return 'ignored';
      },
    };
  };
  global.document = successfulParserDocument.document;
  successfulParserDocument.document.head.appendChild = function appendAndInitialize(node) {
    successfulParserDocument.appendedScripts.push(node);
    global.jsyaml = {
      load() {
        return createBaseConfig();
      },
    };
    if (typeof node.onload === 'function') {
      node.onload();
    }
    return node;
  };
  const namespaceWithLoadedParser = loadNamespace();
  const successfulParserConfig = await namespaceWithLoadedParser.loadYamlConfig({
    configUrl: '/config-ui.yaml',
  });

  assert.equal(successfulParserConfig.auth.tenantId, 'example-tenant');
  assert.equal(successfulParserDocument.appendedScripts.length, 1);

  resetEnvironment();
  const parserDocument = createDocumentStub({
    autoLoadScripts: true,
    includeCreateElement: true,
  });
  global.location = { origin: 'https://example.com' };
  global.fetch = async function fetchConfig() {
    return {
      ok: true,
      status: 200,
      text: async function readText() {
        return 'ignored';
      },
    };
  };
  global.document = parserDocument.document;
  const parserNamespace = loadNamespace();

  const parserPromise = parserNamespace.loadYamlConfig({ configUrl: '/config-ui.yaml' });
  const secondParserPromise = parserNamespace.loadYamlConfig({ configUrl: '/config-ui.yaml' });

  await assert.rejects(parserPromise, { message: 'js-yaml parser did not initialize' });
  await assert.rejects(secondParserPromise, { message: 'js-yaml parser did not initialize' });
  assert.equal(parserDocument.appendedScripts.length, 1);

  parserDocument.document.head.appendChild = function appendAndInitialize(node) {
    parserDocument.appendedScripts.push(node);
    global.jsyaml = {
      load() {
        return createBaseConfig();
      },
    };
    if (typeof node.onload === 'function') {
      node.onload();
    }
    return node;
  };
  const recoveredParserConfig = await parserNamespace.loadYamlConfig({
    configUrl: '/config-ui.yaml',
  });
  assert.equal(recoveredParserConfig.auth.tenantId, 'example-tenant');
  assert.equal(parserDocument.appendedScripts.length, 2);

  resetEnvironment();
  const noHeadDocument = createDocumentStub({
    hasHead: false,
    includeCreateElement: true,
  });
  setupYamlEnvironment(createBaseConfig(), {
    document: noHeadDocument.document,
  });
  delete global.jsyaml;
  const namespaceWithoutHead = loadNamespace();

  await assert.rejects(
    namespaceWithoutHead.loadYamlConfig({ configUrl: '/config-ui.yaml' }),
    { message: 'document.head is required to load https://cdn.jsdelivr.net/npm/js-yaml@5.4.1/dist/browser/js-yaml.umd.min.js' },
  );
});

test('applyYamlConfig waits for DOMContentLoaded, applies custom selectors, and dispatches config events when available', async () => {
  resetEnvironment();
  const header = createElement({});
  const loginButton = createElement({
    'button-text': 'signin_with',
    'button-size': 'large',
    'button-theme': 'filled_blue',
    'button-shape': 'pill',
  });
  const userMenu = createElement({});
  const deferredDocument = createDocumentStub({
    readyState: 'loading',
    selectorList: {
      '.header-target': [header],
      '.login-target': [loginButton],
      '.user-target': [userMenu],
    },
  });

  function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  }

  setupYamlEnvironment(createBaseConfig(), {
    document: deferredDocument.document,
    customEvent: CustomEvent,
  });
  const namespace = loadNamespace();
  const applyPromise = namespace.applyYamlConfig({
    configUrl: '/config-ui.yaml',
    headerSelector: '.header-target',
    loginButtonSelector: '.login-target',
    userSelector: '.user-target',
  });

  await Promise.resolve();
  await Promise.resolve();
  assert.equal(typeof deferredDocument.eventHandlers.DOMContentLoaded, 'function');
  deferredDocument.document.readyState = 'complete';
  deferredDocument.eventHandlers.DOMContentLoaded();

  const runtimeConfig = await applyPromise;
  const serializedAuthConfig = JSON.stringify(runtimeConfig.auth);

  assert.equal(runtimeConfig.auth.tenantId, 'example-tenant');
  assert.equal(header.attributes['auth-config'], serializedAuthConfig);
  assert.equal(loginButton.attributes['auth-config'], serializedAuthConfig);
  assert.equal(loginButton.attributes['button-text'], 'signin_with');
  assert.equal(loginButton.attributes['button-size'], 'large');
  assert.equal(loginButton.attributes['button-theme'], 'filled_blue');
  assert.equal(loginButton.attributes['button-shape'], 'pill');
  assert.equal(userMenu.attributes['auth-config'], serializedAuthConfig);
  assert.equal(deferredDocument.dispatchedEvents.length, 1);
  assert.equal(deferredDocument.dispatchedEvents[0].type, 'mpr-ui:config:applied');
  assert.equal(
    deferredDocument.dispatchedEvents[0].detail.runtimeConfig.auth.providers.google.clientId,
    'example-client',
  );
  assert.equal(
    deferredDocument.dispatchedEvents[0].detail.config.headerSelector,
    '.header-target',
  );
});

test('applyYamlConfig handles same-origin auth, missing dispatch APIs, absent selectors, and inert elements without throwing', async () => {
  resetEnvironment();
  const configPayload = createBaseConfig();
  configPayload.environments[0].auth.tauthUrl = '   ';

  const inertHeader = {};
  const inertLogin = {
    setAttribute(name, value) {
      this[String(name)] = String(value);
    },
  };
  const inertUser = {
    removeAttribute() {},
  };
  const documentStub = createDocumentStub({
    selectorList: {
      'mpr-header': [inertHeader],
      'mpr-login-button': [inertLogin],
      'mpr-user': [inertUser],
    },
  });

  setupYamlEnvironment(configPayload, { document: documentStub.document });
  const namespace = loadNamespace();
  const runtimeConfig = await namespace.applyYamlConfig({ configUrl: '/config-ui.yaml' });

  assert.equal(runtimeConfig.auth.tauthUrl, '');
  assert.equal(inertLogin['button-shape'], undefined);

  resetEnvironment();
  const emptyDocument = createDocumentStub();
  delete emptyDocument.document.dispatchEvent;
  setupYamlEnvironment(configPayload, { document: emptyDocument.document });
  const secondNamespace = loadNamespace();
  const secondRuntimeConfig = await secondNamespace.applyYamlConfig({ configUrl: '/config-ui.yaml' });

  assert.equal(secondRuntimeConfig.auth.tauthUrl, '');
  assert.equal(emptyDocument.dispatchedEvents.length, 0);
});

test('applyYamlConfig rejects when the document is missing and applies auth-only config to login buttons', async () => {
  resetEnvironment();
  setupYamlEnvironment(createBaseConfig());
  const namespaceWithoutDocument = loadNamespace();

  await assert.rejects(
    namespaceWithoutDocument.applyYamlConfig({ configUrl: '/config-ui.yaml' }),
    { message: 'document is required to apply config' },
  );

  resetEnvironment();
  const loginButton = createElement({
    'button-text': 'signin_with',
    'button-size': 'large',
    'button-theme': 'outline',
    'button-shape': 'pill',
  });
  const documentStub = createDocumentStub({
    selectorList: {
      'mpr-login-button': [loginButton],
    },
  });

  setupYamlEnvironment(createBaseConfig(), { document: documentStub.document });
  const namespaceWithAuthOnlyConfig = loadNamespace();

  const runtimeConfig = await namespaceWithAuthOnlyConfig.applyYamlConfig({
    configUrl: '/config-ui.yaml',
  });

  assert.equal(runtimeConfig.auth.providers.google.clientId, 'example-client');
  assert.deepEqual(
    JSON.parse(loginButton.attributes['auth-config']),
    runtimeConfig.auth,
  );
  assert.equal(loginButton.attributes['button-text'], 'signin_with');
  assert.equal(loginButton.attributes['button-size'], 'large');
  assert.equal(loginButton.attributes['button-theme'], 'outline');
  assert.equal(loginButton.attributes['button-shape'], 'pill');
});

test('autoOrchestrate resolves immediately when the document cannot orchestrate or config owners have no URL', async () => {
  resetEnvironment();
  const namespaceWithoutDocument = loadNamespace();
  await assert.doesNotReject(namespaceWithoutDocument.whenAutoOrchestrationReady());

  resetEnvironment();
  global.document = {
    readyState: 'complete',
    addEventListener() {},
  };
  global.location = { origin: 'https://example.com' };
  const namespaceWithoutQuerySelector = loadNamespace();
  await assert.doesNotReject(namespaceWithoutQuerySelector.whenAutoOrchestrationReady());

  resetEnvironment();
  const noHeaderDocument = {
    readyState: 'complete',
    addEventListener() {},
    querySelector() {
      return null;
    },
  };
  global.document = noHeaderDocument;
  global.location = { origin: 'https://example.com' };
  const namespaceWithoutHeader = loadNamespace();
  await assert.doesNotReject(namespaceWithoutHeader.whenAutoOrchestrationReady());

  resetEnvironment();
  const blankHeader = createElement({ 'data-config-url': '' });
  const blankHeaderDocument = {
    readyState: 'complete',
    addEventListener() {},
    querySelector(selector) {
      if (selector === 'mpr-header[data-config-url]') {
        return blankHeader;
      }
      return null;
    },
  };
  global.document = blankHeaderDocument;
  global.location = { origin: 'https://example.com' };
  const namespaceWithBlankHeader = loadNamespace();
  await assert.doesNotReject(namespaceWithBlankHeader.whenAutoOrchestrationReady());

  resetEnvironment();
  const blankLoginButton = createElement({ 'data-config-url': '' });
  const blankLoginButtonDocument = {
    readyState: 'complete',
    addEventListener() {},
    querySelector(selector) {
      if (selector === 'mpr-login-button[data-config-url]') {
        return blankLoginButton;
      }
      return null;
    },
  };
  global.document = blankLoginButtonDocument;
  global.location = { origin: 'https://example.com' };
  const namespaceWithBlankLoginButton = loadNamespace();
  await assert.doesNotReject(namespaceWithBlankLoginButton.whenAutoOrchestrationReady());
});

test('autoOrchestrate loads the bundle once after config application and caches the readiness promise', async () => {
  resetEnvironment();
  const header = createElement({ 'data-config-url': '/config-ui.yaml' });
  const loginButton = createElement({});
  const userMenu = createElement({});
  const bundleMarker = {
    getAttribute(name) {
      if (name === 'data-mpr-ui-bundle-src') {
        return './mpr-ui.js';
      }
      return null;
    },
  };
  const documentStub = createDocumentStub({
    readyState: 'complete',
    autoLoadScripts: true,
    selectors: {
      'mpr-header[data-config-url]': header,
      'script[data-mpr-ui-bundle-src]': bundleMarker,
    },
    selectorList: {
      'mpr-header': [header],
      'mpr-login-button': [loginButton],
      'mpr-user': [userMenu],
    },
  });

  function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  }

  setupYamlEnvironment(createBaseConfig(), {
    document: documentStub.document,
    customEvent: CustomEvent,
    createWindow: true,
  });
  const namespace = loadNamespace();
  const firstPromise = namespace.whenAutoOrchestrationReady();
  const secondPromise = namespace.whenAutoOrchestrationReady();

  assert.equal(firstPromise, secondPromise);
  await firstPromise;

  assert.equal(documentStub.appendedScripts.length, 1);
  assert.equal(documentStub.appendedScripts[0].src, './mpr-ui.js');
  assert.deepEqual(
    documentStub.dispatchedEvents.map(function mapEvent(event) {
      return event.type;
    }),
    [
      'mpr-ui:config:applied',
      'mpr-ui:bundle:loaded',
      'mpr-ui:orchestration:ready',
    ],
  );
});

test('autoOrchestrate revalidates the mutable latest bundle and requires its public API', async () => {
  resetEnvironment();
  const header = createElement({ 'data-config-url': '/config-ui.yaml' });
  const bundleMarker = {
    getAttribute(name) {
      if (name === 'data-mpr-ui-bundle-src') {
        return 'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js';
      }
      return null;
    },
  };
  const documentStub = createDocumentStub({
    readyState: 'complete',
    autoLoadScripts: true,
    selectors: {
      'mpr-header[data-config-url]': header,
      'script[data-mpr-ui-bundle-src]': bundleMarker,
    },
    selectorList: {
      'mpr-header': [header],
      'mpr-login-button': [],
      'mpr-user': [],
    },
  });

  setupYamlEnvironment(createBaseConfig(), { document: documentStub.document });
  const namespace = loadNamespace();

  await namespace.whenAutoOrchestrationReady();

  const bundleRequestUrl = new URL(documentStub.appendedScripts[0].src);
  assert.equal(
    bundleRequestUrl.origin + bundleRequestUrl.pathname,
    'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js',
  );
  assert.match(bundleRequestUrl.searchParams.get('mpr-ui-revalidate'), /^\d+-1$/);

  resetEnvironment();
  const missingApiHeader = createElement({ 'data-config-url': '/config-ui.yaml' });
  const missingApiDocument = createDocumentStub({
    readyState: 'complete',
    autoLoadScripts: true,
    exposeBundleApi: false,
    selectors: {
      'mpr-header[data-config-url]': missingApiHeader,
      'script[data-mpr-ui-bundle-src]': bundleMarker,
    },
    selectorList: {
      'mpr-header': [missingApiHeader],
      'mpr-login-button': [],
      'mpr-user': [],
    },
  });
  const originalConsoleError = console.error;
  console.error = function swallowConsoleError() {};
  try {
    setupYamlEnvironment(createBaseConfig(), { document: missingApiDocument.document });
    const missingApiNamespace = loadNamespace();
    await assert.rejects(
      missingApiNamespace.whenAutoOrchestrationReady(),
      { message: 'mpr-ui bundle must expose MPRUI.authenticatedFetch' },
    );
  } finally {
    console.error = originalConsoleError;
  }
});

test('autoOrchestrate loads config and bundle from a login-button config owner', async () => {
  resetEnvironment();
  const inertHeader = createElement({});
  const loginButton = createElement({
    'data-config-url': '/config-ui.yaml',
    'button-shape': 'pill',
  });
  const bundleMarker = {
    getAttribute(name) {
      if (name === 'data-mpr-ui-bundle-src') {
        return './mpr-ui.js';
      }
      return null;
    },
  };
  const documentStub = createDocumentStub({
    readyState: 'complete',
    autoLoadScripts: true,
    selectors: {
      'mpr-header[data-config-url]': null,
      'mpr-login-button[data-config-url]': loginButton,
      'script[data-mpr-ui-bundle-src]': bundleMarker,
    },
    selectorList: {
      'mpr-header': [inertHeader],
      'mpr-header[data-config-url]': [],
      'mpr-login-button': [loginButton],
      'mpr-user': [],
    },
  });

  function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  }

  setupYamlEnvironment(createBaseConfig(), {
    document: documentStub.document,
    customEvent: CustomEvent,
    createWindow: true,
  });
  const namespace = loadNamespace();

  await namespace.whenAutoOrchestrationReady();

  assert.equal(inertHeader.attributes['google-site-id'], undefined);
  assert.deepEqual(
    JSON.parse(loginButton.attributes['auth-config']),
    createBaseConfig().environments[0].auth,
  );
  assert.equal(loginButton.attributes['button-shape'], 'pill');
  assert.equal(documentStub.appendedScripts.length, 1);
  assert.equal(documentStub.appendedScripts[0].src, './mpr-ui.js');
  assert.deepEqual(
    documentStub.dispatchedEvents.map(function mapEvent(event) {
      return event.type;
    }),
    [
      'mpr-ui:config:applied',
      'mpr-ui:bundle:loaded',
      'mpr-ui:orchestration:ready',
    ],
  );
  assert.deepEqual(documentStub.dispatchedEvents[2].detail, { configUrl: '/config-ui.yaml' });
});

test('autoOrchestrate stops on permanent config failures and retries transient failures with a capped delay', async () => {
  resetEnvironment();
  const permanentHeader = createElement({ 'data-config-url': '/config-ui.yaml' });
  const permanentDocument = createDocumentStub({
    readyState: 'complete',
    selectors: {
      'mpr-header[data-config-url]': permanentHeader,
      'script[data-mpr-ui-bundle-src]': null,
    },
    selectorList: {
      'mpr-header': [permanentHeader],
      'mpr-login-button': [],
      'mpr-user': [],
    },
  });
  const originalConsoleError = console.error;
  console.error = function swallowConsoleError() {};
  try {
    setupYamlEnvironment(createBaseConfig(), {
      document: permanentDocument.document,
      responseOk: false,
      status: 403,
    });
    const permanentNamespace = loadNamespace();

    await assert.rejects(
      permanentNamespace.whenAutoOrchestrationReady(),
      { message: 'config-ui.yaml request failed (403)' },
    );
  } finally {
    console.error = originalConsoleError;
  }

  resetEnvironment();
  const transientHeader = createElement({ 'data-config-url': '/config-ui.yaml' });
  const transientBundleMarker = {
    getAttribute(name) {
      if (name === 'data-mpr-ui-bundle-src') {
        return './mpr-ui.js';
      }
      return null;
    },
  };
  const transientDocument = createDocumentStub({
    readyState: 'complete',
    autoLoadScripts: true,
    selectors: {
      'mpr-header[data-config-url]': transientHeader,
      'script[data-mpr-ui-bundle-src]': transientBundleMarker,
    },
    selectorList: {
      'mpr-header': [transientHeader],
      'mpr-login-button': [],
      'mpr-user': [],
    },
  });
  const retryDelays = [];
  let configAttempts = 0;
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = function runRetry(callback, delay) {
    retryDelays.push(delay);
    callback();
    return 1;
  };
  try {
    setupYamlEnvironment(createBaseConfig(), { document: transientDocument.document });
    global.fetch = async function fetchConfigWithTransientFailures() {
      configAttempts += 1;
      if (configAttempts <= 4) {
        throw new TypeError('network unavailable');
      }
      return {
        ok: true,
        status: 200,
        text: async function readText() {
          return 'ignored';
        },
      };
    };
    const transientNamespace = loadNamespace();

    await transientNamespace.whenAutoOrchestrationReady();
  } finally {
    global.setTimeout = originalSetTimeout;
  }

  assert.equal(configAttempts, 5);
  assert.deepEqual(retryDelays, [1000, 2000, 3000, 3000]);
});

test('autoOrchestrate supports deferred DOMContentLoaded bootstrap with one bundle load', async () => {
  resetEnvironment();
  const header = createElement({ 'data-config-url': '/config-ui.yaml' });
  const loginButton = createElement({});
  const bundleMarker = {
    getAttribute(name) {
      if (name === 'data-mpr-ui-bundle-src') {
        return './mpr-ui.js';
      }
      return null;
    },
  };
  const documentStub = createDocumentStub({
    readyState: 'loading',
    autoLoadScripts: true,
    selectors: {
      'mpr-header[data-config-url]': header,
      'script[data-mpr-ui-bundle-src]': bundleMarker,
    },
    selectorList: {
      'mpr-header': [header],
      'mpr-login-button': [loginButton],
      'mpr-user': [],
    },
  });

  function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  }

  setupYamlEnvironment(createBaseConfig(), {
    document: documentStub.document,
    customEvent: CustomEvent,
  });
  const namespace = loadNamespace();

  assert.equal(typeof documentStub.eventHandlers.DOMContentLoaded, 'function');
  documentStub.document.readyState = 'complete';
  documentStub.eventHandlers.DOMContentLoaded();
  await namespace.whenAutoOrchestrationReady();
  documentStub.eventHandlers.DOMContentLoaded();

  assert.equal(documentStub.appendedScripts.length, 1);
  assert.equal(documentStub.appendedScripts[0].src, './mpr-ui.js');
  assert.deepEqual(
    documentStub.dispatchedEvents.map(function mapEvent(event) {
      return event.type;
    }),
    [
      'mpr-ui:config:applied',
      'mpr-ui:bundle:loaded',
      'mpr-ui:orchestration:ready',
    ],
  );
});

test('autoOrchestrate rejects missing and malformed bundle markers', async () => {
  resetEnvironment();
  const cases = [
    {
      name: 'missing marker',
      marker: null,
    },
    {
      name: 'malformed marker',
      marker: {},
    },
  ];
  const originalConsoleError = console.error;
  console.error = function swallowConsoleError() {};
  try {
    for (const testCase of cases) {
      resetEnvironment();
      const header = createElement({ 'data-config-url': '/config-ui.yaml' });
      const documentStub = createDocumentStub({
        readyState: 'complete',
        selectors: {
          'mpr-header[data-config-url]': header,
          'script[data-mpr-ui-bundle-src]': testCase.marker,
        },
        selectorList: {
          'mpr-header': [header],
          'mpr-login-button': [],
          'mpr-user': [],
        },
      });
      function CustomEvent(type, init) {
        this.type = type;
        this.detail = init && init.detail;
      }

      setupYamlEnvironment(createBaseConfig(), {
        document: documentStub.document,
        customEvent: CustomEvent,
      });
      const namespace = loadNamespace();

      await assert.rejects(
        namespace.whenAutoOrchestrationReady(),
        { message: 'mpr-ui auto-orchestration requires data-mpr-ui-bundle-src' },
        testCase.name,
      );
      assert.equal(documentStub.appendedScripts.length, 0, testCase.name);
      assert.deepEqual(
        documentStub.dispatchedEvents.map(function mapEvent(event) {
          return event.type;
        }),
        ['mpr-ui:config:applied'],
        testCase.name,
      );
    }
  } finally {
    console.error = originalConsoleError;
  }
});

test('autoOrchestrate rejects invalid bundle markers and logs orchestration failures', async () => {
  resetEnvironment();
  const header = createElement({ 'data-config-url': '/config-ui.yaml' });
  const invalidBundleMarker = {
    getAttribute() {
      return '   ';
    },
  };
  const documentStub = createDocumentStub({
    readyState: 'complete',
    selectors: {
      'mpr-header[data-config-url]': header,
      'script[data-mpr-ui-bundle-src]': invalidBundleMarker,
    },
    selectorList: {
      'mpr-header': [header],
      'mpr-login-button': [],
      'mpr-user': [],
    },
  });
  const errorCalls = [];
  const originalConsoleError = console.error;

  console.error = function captureConsoleError() {
    errorCalls.push(Array.from(arguments));
  };

  try {
    setupYamlEnvironment(createBaseConfig(), {
      document: documentStub.document,
    });
    const namespace = loadNamespace();

    await assert.rejects(
      namespace.whenAutoOrchestrationReady(),
      { message: 'mpr-ui auto-orchestration requires data-mpr-ui-bundle-src' },
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(errorCalls.length, 1);
  assert.match(String(errorCalls[0][0]), /\[mpr-ui-config\] Auto-orchestration failed:/);
  assert.equal(errorCalls[0][1].message, 'mpr-ui auto-orchestration requires data-mpr-ui-bundle-src');

  resetEnvironment();
  const failingScriptHeader = createElement({ 'data-config-url': '/config-ui.yaml' });
  const validBundleMarker = {
    getAttribute(name) {
      if (name === 'data-mpr-ui-bundle-src') {
        return './mpr-ui.js';
      }
      return null;
    },
  };
  const retryingScriptDocument = createDocumentStub({
    readyState: 'complete',
    selectors: {
      'mpr-header[data-config-url]': failingScriptHeader,
      'script[data-mpr-ui-bundle-src]': validBundleMarker,
    },
    selectorList: {
      'mpr-header': [failingScriptHeader],
      'mpr-login-button': [],
      'mpr-user': [],
    },
  });
  let bundleAttempts = 0;
  retryingScriptDocument.document.head.appendChild = function appendBundle(node) {
    retryingScriptDocument.appendedScripts.push(node);
    bundleAttempts += 1;
    if (bundleAttempts === 1) {
      node.onerror();
      return node;
    }
    global.MPRUI.authenticatedFetch = function authenticatedFetch() {};
    node.onload();
    return node;
  };
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = function runRetry(callback) {
    callback();
    return 1;
  };

  console.error = function swallowConsoleError() {};
  try {
    function RetryCustomEvent(type, init) {
      this.type = type;
      this.detail = init && init.detail;
    }
    setupYamlEnvironment(createBaseConfig(), {
      document: retryingScriptDocument.document,
      customEvent: RetryCustomEvent,
    });
    const namespaceWithRetryingBundle = loadNamespace();

    await namespaceWithRetryingBundle.whenAutoOrchestrationReady();
  } finally {
    global.setTimeout = originalSetTimeout;
    console.error = originalConsoleError;
  }
  assert.equal(bundleAttempts, 2);
  assert.deepEqual(
    retryingScriptDocument.dispatchedEvents.map(function mapEvent(event) {
      return event.type;
    }),
    [
      'mpr-ui:config:applied',
      'mpr-ui:bundle:loaded',
      'mpr-ui:orchestration:ready',
    ],
  );
});
