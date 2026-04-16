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
          googleClientId: 'example-client',
          tenantId: 'example-tenant',
          loginPath: '/auth/google',
          logoutPath: '/auth/logout',
          noncePath: '/auth/nonce',
        },
        authButton: {
          text: 'signin_with',
          size: 'large',
          theme: 'outline',
          shape: 'pill',
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
  assert.equal(runtimeConfig.auth.googleClientId, 'example-client');
  assert.equal(runtimeConfig.authButton.shape, 'pill');
  assert.equal(Object.isFrozen(runtimeConfig), true);
  assert.equal(Object.isFrozen(runtimeConfig.auth), true);
  assert.equal(Object.isFrozen(runtimeConfig.authButton), true);
});

test('loadYamlConfig tolerates a missing authButton section and omits optional shape', async () => {
  resetEnvironment();
  const configPayload = createBaseConfig();
  delete configPayload.environments[0].authButton.shape;

  setupYamlEnvironment(configPayload);
  const namespace = loadNamespace();
  const runtimeConfig = await namespace.loadYamlConfig({ configUrl: '/config-ui.yaml' });

  assert.equal(runtimeConfig.authButton.shape, undefined);

  resetEnvironment();
  const noButtonConfigPayload = createBaseConfig();
  delete noButtonConfigPayload.environments[0].authButton;

  setupYamlEnvironment(noButtonConfigPayload);
  const secondNamespace = loadNamespace();
  const secondRuntimeConfig = await secondNamespace.loadYamlConfig({ configUrl: '/config-ui.yaml' });

  assert.equal(secondRuntimeConfig.authButton, null);
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

test('loadYamlConfig rejects invalid config structure and required auth strings', async () => {
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
      configPayload: {
        environments: [
          {
            origins: ['https://example.com'],
            auth: {
              googleClientId: 'example-client',
              tenantId: 'example-tenant',
              loginPath: '/auth/google',
              logoutPath: '/auth/logout',
              noncePath: '/auth/nonce',
            },
          },
        ],
      },
      expectedMessage: 'config-ui.yaml missing auth.tauthUrl',
    },
    {
      name: 'non-string tauthUrl',
      configPayload: {
        environments: [
          {
            origins: ['https://example.com'],
            auth: {
              tauthUrl: null,
              googleClientId: 'example-client',
              tenantId: 'example-tenant',
              loginPath: '/auth/google',
              logoutPath: '/auth/logout',
              noncePath: '/auth/nonce',
            },
          },
        ],
      },
      expectedMessage: 'config-ui.yaml missing auth.tauthUrl',
    },
    {
      name: 'blank googleClientId',
      configPayload: {
        environments: [
          {
            origins: ['https://example.com'],
            auth: {
              tauthUrl: 'https://auth.example.com',
              googleClientId: '   ',
              tenantId: 'example-tenant',
              loginPath: '/auth/google',
              logoutPath: '/auth/logout',
              noncePath: '/auth/nonce',
            },
          },
        ],
      },
      expectedMessage: 'config-ui.yaml missing auth.googleClientId',
    },
    {
      name: 'missing tenantId',
      configPayload: {
        environments: [
          {
            origins: ['https://example.com'],
            auth: {
              tauthUrl: 'https://auth.example.com',
              googleClientId: 'example-client',
              loginPath: '/auth/google',
              logoutPath: '/auth/logout',
              noncePath: '/auth/nonce',
            },
          },
        ],
      },
      expectedMessage: 'config-ui.yaml missing auth.tenantId',
    },
    {
      name: 'missing loginPath',
      configPayload: {
        environments: [
          {
            origins: ['https://example.com'],
            auth: {
              tauthUrl: 'https://auth.example.com',
              googleClientId: 'example-client',
              tenantId: 'example-tenant',
              logoutPath: '/auth/logout',
              noncePath: '/auth/nonce',
            },
          },
        ],
      },
      expectedMessage: 'config-ui.yaml missing auth.loginPath',
    },
    {
      name: 'missing logoutPath',
      configPayload: {
        environments: [
          {
            origins: ['https://example.com'],
            auth: {
              tauthUrl: 'https://auth.example.com',
              googleClientId: 'example-client',
              tenantId: 'example-tenant',
              loginPath: '/auth/google',
              noncePath: '/auth/nonce',
            },
          },
        ],
      },
      expectedMessage: 'config-ui.yaml missing auth.logoutPath',
    },
    {
      name: 'missing noncePath',
      configPayload: {
        environments: [
          {
            origins: ['https://example.com'],
            auth: {
              tauthUrl: 'https://auth.example.com',
              googleClientId: 'example-client',
              tenantId: 'example-tenant',
              loginPath: '/auth/google',
              logoutPath: '/auth/logout',
            },
          },
        ],
      },
      expectedMessage: 'config-ui.yaml missing auth.noncePath',
    },
    {
      name: 'invalid authButton payload',
      configPayload: {
        environments: [
          {
            origins: ['https://example.com'],
            auth: createBaseConfig().environments[0].auth,
            authButton: 'invalid',
          },
        ],
      },
      expectedMessage: 'config-ui.yaml missing authButton.authButton',
    },
    {
      name: 'missing authButton text',
      configPayload: {
        environments: [
          {
            origins: ['https://example.com'],
            auth: createBaseConfig().environments[0].auth,
            authButton: {
              size: 'large',
              theme: 'outline',
            },
          },
        ],
      },
      expectedMessage: 'config-ui.yaml missing authButton.text',
    },
    {
      name: 'missing authButton size',
      configPayload: {
        environments: [
          {
            origins: ['https://example.com'],
            auth: createBaseConfig().environments[0].auth,
            authButton: {
              text: 'signin_with',
              theme: 'outline',
            },
          },
        ],
      },
      expectedMessage: 'config-ui.yaml missing authButton.size',
    },
    {
      name: 'missing authButton theme',
      configPayload: {
        environments: [
          {
            origins: ['https://example.com'],
            auth: createBaseConfig().environments[0].auth,
            authButton: {
              text: 'signin_with',
              size: 'large',
            },
          },
        ],
      },
      expectedMessage: 'config-ui.yaml missing authButton.theme',
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

test('loadYamlConfig rejects missing fetch, failed fetch responses, parser load failures, and missing document head while caching the parser request', async () => {
  resetEnvironment();
  global.location = { origin: 'https://example.com' };
  const namespaceWithoutDocument = loadNamespace();

  await assert.rejects(
    namespaceWithoutDocument.loadYamlConfig({ configUrl: '/config-ui.yaml' }),
    {
      message:
        'document is required to load https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js',
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
    { message: 'document.head is required to load https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js' },
  );
});

test('applyYamlConfig waits for DOMContentLoaded, applies custom selectors, and dispatches config events when available', async () => {
  resetEnvironment();
  const header = createElement({});
  const loginButton = createElement({});
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

  assert.equal(runtimeConfig.auth.tenantId, 'example-tenant');
  assert.equal(header.attributes['google-site-id'], 'example-client');
  assert.equal(header.attributes['tauth-url'], 'https://auth.example.com');
  assert.equal(loginButton.attributes['site-id'], 'example-client');
  assert.equal(loginButton.attributes['button-shape'], 'pill');
  assert.equal(userMenu.attributes['tauth-tenant-id'], 'example-tenant');
  assert.equal(deferredDocument.dispatchedEvents.length, 1);
  assert.equal(deferredDocument.dispatchedEvents[0].type, 'mpr-ui:config:applied');
  assert.equal(
    deferredDocument.dispatchedEvents[0].detail.runtimeConfig.auth.googleClientId,
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
  delete configPayload.environments[0].authButton.shape;

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

test('applyYamlConfig rejects when the document is missing or login buttons lack authButton settings', async () => {
  resetEnvironment();
  setupYamlEnvironment(createBaseConfig());
  const namespaceWithoutDocument = loadNamespace();

  await assert.rejects(
    namespaceWithoutDocument.applyYamlConfig({ configUrl: '/config-ui.yaml' }),
    { message: 'document is required to apply config' },
  );

  resetEnvironment();
  const configWithoutButton = createBaseConfig();
  delete configWithoutButton.environments[0].authButton;
  const loginButton = createElement({});
  const documentStub = createDocumentStub({
    selectorList: {
      'mpr-login-button': [loginButton],
    },
  });

  setupYamlEnvironment(configWithoutButton, { document: documentStub.document });
  const namespaceWithoutButton = loadNamespace();

  await assert.rejects(
    namespaceWithoutButton.applyYamlConfig({ configUrl: '/config-ui.yaml' }),
    { message: 'config-ui.yaml missing authButton for login button' },
  );
});

test('autoOrchestrate resolves immediately when the document cannot orchestrate or the header has no config URL', async () => {
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

test('autoOrchestrate supports deferred DOMContentLoaded bootstrap and missing bundle markers', async () => {
  resetEnvironment();
  const header = createElement({ 'data-config-url': '/config-ui.yaml' });
  const loginButton = createElement({});
  const documentStub = createDocumentStub({
    readyState: 'loading',
    selectors: {
      'mpr-header[data-config-url]': header,
      'script[data-mpr-ui-bundle-src]': null,
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

  assert.equal(documentStub.appendedScripts.length, 0);
  assert.deepEqual(
    documentStub.dispatchedEvents.map(function mapEvent(event) {
      return event.type;
    }),
    ['mpr-ui:config:applied', 'mpr-ui:orchestration:ready'],
  );
});

test('autoOrchestrate tolerates bundle markers without getAttribute', async () => {
  resetEnvironment();
  const header = createElement({ 'data-config-url': '/config-ui.yaml' });
  const inertMarkerDocument = createDocumentStub({
    readyState: 'complete',
    autoLoadScripts: true,
    selectors: {
      'mpr-header[data-config-url]': header,
      'script[data-mpr-ui-bundle-src]': {},
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
    document: inertMarkerDocument.document,
    customEvent: CustomEvent,
  });
  const namespace = loadNamespace();
  await namespace.whenAutoOrchestrationReady();

  assert.deepEqual(
    inertMarkerDocument.dispatchedEvents.map(function mapEvent(event) {
      return event.type;
    }),
    ['mpr-ui:config:applied', 'mpr-ui:bundle:loaded', 'mpr-ui:orchestration:ready'],
  );
  assert.equal(inertMarkerDocument.appendedScripts.length, 1);
  assert.equal(inertMarkerDocument.appendedScripts[0].src, '');
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
  const failingScriptDocument = createDocumentStub({
    readyState: 'complete',
    autoFailScripts: true,
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

  console.error = function swallowConsoleError() {};
  try {
    setupYamlEnvironment(createBaseConfig(), {
      document: failingScriptDocument.document,
    });
    const namespaceWithFailingBundle = loadNamespace();

    await assert.rejects(
      namespaceWithFailingBundle.whenAutoOrchestrationReady(),
      { message: 'Failed to load ./mpr-ui.js' },
    );
  } finally {
    console.error = originalConsoleError;
  }
});
