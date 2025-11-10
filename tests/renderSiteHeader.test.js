'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

function createClassList() {
  const values = new Set();
  return {
    add: function () {
      for (let index = 0; index < arguments.length; index += 1) {
        const entry = arguments[index];
        if (entry) {
          values.add(String(entry));
        }
      }
    },
    remove: function () {
      for (let index = 0; index < arguments.length; index += 1) {
        values.delete(String(arguments[index]));
      }
    },
    toggle: function (className, force) {
      const name = String(className);
      if (force === undefined) {
        if (values.has(name)) {
          values.delete(name);
          return false;
        }
        values.add(name);
        return true;
      }
      if (force) {
        values.add(name);
        return true;
      }
      values.delete(name);
      return false;
    },
    contains: function (className) {
      return values.has(String(className));
    },
    toArray: function () {
      return Array.from(values);
    },
  };
}

function createElementStub(options) {
  const config = Object.assign(
    { classList: false, supportsEvents: false, supportsAttributes: false },
    options || {},
  );
  const element = { textContent: '' };

  if (config.classList) {
    element.classList = createClassList();
  }
  if (config.supportsAttributes) {
    const attributes = {};
    element.attributes = attributes;
    element.setAttribute = function (name, value) {
      attributes[name] = String(value);
    };
    element.getAttribute = function (name) {
      return Object.prototype.hasOwnProperty.call(attributes, name)
        ? attributes[name]
        : null;
    };
    element.removeAttribute = function (name) {
      delete attributes[name];
    };
  }
  if (config.supportsEvents) {
    const listeners = {};
    element.__listeners = listeners;

    element.addEventListener = function (type, handler) {
      const eventType = String(type);
      if (!listeners[eventType]) listeners[eventType] = [];
      if (listeners[eventType].indexOf(handler) === -1) {
        listeners[eventType].push(handler);
      }
    };
    element.removeEventListener = function (type, handler) {
      const eventType = String(type);
      if (!listeners[eventType]) return;
      listeners[eventType] = listeners[eventType].filter(function (entry) {
        return entry !== handler;
      });
    };
    element.dispatchEvent = function (event) {
      const eventType = event && event.type ? String(event.type) : '';
      const handlers = listeners[eventType] ? listeners[eventType].slice() : [];
      handlers.forEach(function (handler) {
        handler.call(element, event);
      });
      return handlers.length > 0;
    };
    element.click = function () {
      element.dispatchEvent({ type: 'click', target: element });
    };
    element.getListenerCount = function (type) {
      const eventType = String(type);
      return listeners[eventType] ? listeners[eventType].length : 0;
    };
  }
  element.children = [];
  element.appendChild = function (child) {
    this.children.push(child);
    return child;
  };
  element.clearChildren = function () {
    this.children.length = 0;
  };
  return element;
}

function createDocumentStub() {
  const elementsById = {};
  const headChildren = [];
  const documentElement = {
    attributes: {},
    setAttribute: function (name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute: function (name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name]
        : null;
    },
  };
  return {
    __headChildren: headChildren,
    head: {
      appendChild: function (node) {
        if (node && node.id) {
          elementsById[node.id] = node;
        }
        headChildren.push(node);
        return node;
      },
    },
    createElement: function (tagName) {
      return {
        id: '',
        tagName: String(tagName || '').toUpperCase(),
        appendChild: function (child) {
          this.child = child;
        },
        setAttribute: function (name, value) {
          this[name] = value;
        },
        onload: null,
        onerror: null,
        styleSheet: null,
      };
    },
    createTextNode: function (text) {
      return { textContent: String(text) };
    },
    getElementById: function (id) {
      return elementsById[id] || null;
    },
    documentElement: documentElement,
  };
}

function createHostHarness() {
  const dispatchedEvents = [];
  const hostListeners = {};
  const host = {
    classList: createClassList(),
    attributes: {},
    setAttribute: function (name, value) {
      host.attributes[name] = String(value);
    },
    getAttribute: function (name) {
      return Object.prototype.hasOwnProperty.call(host.attributes, name)
        ? host.attributes[name]
        : null;
    },
    removeAttribute: function (name) {
      delete host.attributes[name];
    },
  };

  host.addEventListener = function (type, handler) {
    const eventType = String(type);
    if (!hostListeners[eventType]) {
      hostListeners[eventType] = [];
    }
    if (hostListeners[eventType].indexOf(handler) === -1) {
      hostListeners[eventType].push(handler);
    }
  };

  host.dispatchEvent = function (event) {
    const eventType = event && event.type ? String(event.type) : '';
    dispatchedEvents.push({ type: eventType, detail: event ? event.detail : undefined });
    const handlers = hostListeners[eventType] ? hostListeners[eventType].slice() : [];
    handlers.forEach(function (handler) {
      handler.call(host, event);
    });
    return handlers.length > 0;
  };

  host.getListenerCount = function (type) {
    const eventType = String(type);
    return hostListeners[eventType] ? hostListeners[eventType].length : 0;
  };

  const root = createElementStub({ classList: true });
  const nav = { innerHTML: '' };
  const brand = createElementStub({ supportsAttributes: true });
  const themeToggleContainer = createElementStub({ supportsEvents: true, supportsAttributes: true });
  const themeToggleControl = createElementStub({ supportsEvents: true, supportsAttributes: true });
  const themeToggleIcon = createElementStub();
  themeToggleContainer.querySelector = function (selector) {
    if (selector === '[data-mpr-theme-toggle="control"]') {
      return themeToggleControl;
    }
    if (selector === '[data-mpr-theme-toggle="icon"]') {
      return themeToggleIcon;
    }
    return null;
  };
  const settingsButton = createElementStub({ supportsEvents: true });
  const googleSigninHost = createElementStub({
    supportsAttributes: true,
    supportsEvents: true,
    classList: true,
  });
  const profileContainer = createElementStub();
  const profileLabel = createElementStub();
  const profileName = createElementStub();
  const signOutButton = createElementStub({ supportsEvents: true });

  const selectorMap = new Map([
    ['header.mpr-header', root],
    ['[data-mpr-header="nav"]', nav],
    ['[data-mpr-header="brand"]', brand],
    ['[data-mpr-header="theme-toggle"]', themeToggleContainer],
    ['[data-mpr-header="google-signin"]', googleSigninHost],
    ['[data-mpr-header="settings-button"]', settingsButton],
    ['[data-mpr-header="profile"]', profileContainer],
    ['[data-mpr-header="profile-label"]', profileLabel],
    ['[data-mpr-header="profile-name"]', profileName],
    ['[data-mpr-header="sign-out-button"]', signOutButton],
  ]);

  host.querySelector = function (selector) {
    return selectorMap.has(selector) ? selectorMap.get(selector) : null;
    };

  return {
    host: host,
    root: root,
    nav: nav,
    brand: brand,
    themeToggleControl: themeToggleControl,
    themeToggleIcon: themeToggleIcon,
    googleSigninHost: googleSigninHost,
    settingsButton: settingsButton,
    profileContainer: profileContainer,
    profileLabel: profileLabel,
    profileName: profileName,
    signOutButton: signOutButton,
    dispatchedEvents: dispatchedEvents,
  };
}

function flushAsync() {
  return new Promise(function resolveAsync(resolve) {
    setTimeout(resolve, 0);
  });
}

function resetEnvironment() {
  Object.keys(require.cache).forEach(function (key) {
    if (key.indexOf('mpr-ui.js') !== -1) {
      delete require.cache[key];
    }
  });
  delete global.MPRUI;
  global.CustomEvent = function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
    this.bubbles = init && Boolean(init.bubbles);
  };
  global.document = createDocumentStub();
  global.fetch = function () {
    return Promise.resolve({
      ok: true,
      json: function () {
        return Promise.resolve({});
      },
    });
  };
  delete global.google;
  delete global.initAuthClient;
  global.resolveHost = function (target) {
    if (
      typeof target === 'string' &&
      global.document &&
      typeof global.document.querySelector === 'function'
    ) {
      return global.document.querySelector(target);
    }
    return target;
  };
}

function loadLibrary() {
  require('../mpr-ui.js');
  return global.MPRUI;
}

test('rendering the header injects shared theme tokens into the document head', () => {
  resetEnvironment();
  const harness = createHostHarness();
  const library = loadLibrary();
  library.renderSiteHeader(harness.host, {});

  const themeStyle = global.document.getElementById('mpr-ui-theme-tokens');
  assert.ok(themeStyle, 'expected theme token stylesheet to be attached');
});

test('renderSiteHeader initial markup forces navigation links to open in new window', () => {
  resetEnvironment();
  const harness = createHostHarness();
  let capturedMarkup = '';
  Object.defineProperty(harness.host, 'innerHTML', {
    configurable: true,
    get: function getInnerHTML() {
      return this.__innerHTML || '';
    },
    set: function setInnerHTML(value) {
      this.__innerHTML = String(value);
      capturedMarkup = this.__innerHTML;
    },
  });
  const library = loadLibrary();
  const navLinks = [
    { label: 'Docs', href: 'https://example.com/docs' },
    { label: 'Support', href: 'https://example.com/support' },
  ];
  library.renderSiteHeader(harness.host, { navLinks: navLinks });
  assert.ok(
    capturedMarkup.indexOf('target="_blank"') !== -1,
    'initial markup includes target="_blank" on navigation links',
  );
  assert.ok(
    capturedMarkup.indexOf('rel="noopener noreferrer"') !== -1,
    'initial markup includes rel="noopener noreferrer" on navigation links',
  );
});

test('theme toggle updates the icon when the mode changes', () => {
  resetEnvironment();
  const harness = createHostHarness();
  const library = loadLibrary();
  const controller = library.renderSiteHeader(harness.host, {});

  assert.equal(
    harness.themeToggleIcon.textContent,
    '🌙',
    'expected initial icon to represent the dark mode',
  );

  harness.themeToggleControl.click();

  assert.equal(
    harness.themeToggleIcon.textContent,
    '☀️',
    'expected icon to switch to the light mode glyph after toggle',
  );

  controller.destroy();
});

test('header marks the no-auth state when auth is not configured', () => {
  resetEnvironment();
  const harness = createHostHarness();
  const library = loadLibrary();
  const controller = library.renderSiteHeader(harness.host, {});

  assert.strictEqual(
    harness.root.classList.contains('mpr-header--no-auth'),
    true,
    'no-auth class applied when auth missing',
  );
  assert.strictEqual(
    harness.host.getListenerCount('mpr-ui:auth:authenticated'),
    0,
    'no auth listeners before enabling',
  );
  assert.strictEqual(
    harness.host.getListenerCount('mpr-ui:auth:unauthenticated'),
    0,
    'no unauth listeners before enabling',
  );
  assert.strictEqual(
    harness.dispatchedEvents.filter(function (event) {
      return event.type === 'mpr-ui:header:error';
    }).length,
    0,
    'no header errors emitted when auth missing',
  );
  assert.strictEqual(
    harness.googleSigninHost.getAttribute('data-mpr-google-ready'),
    'fallback',
    'fallback sign-in CTA rendered when auth is not configured',
  );

  controller.destroy();
});

test('header dispatches signin-click events when auth is disabled', () => {
  resetEnvironment();
  const harness = createHostHarness();
  const library = loadLibrary();
  library.renderSiteHeader(harness.host, {});

  assert.strictEqual(
    harness.googleSigninHost.getAttribute('data-mpr-google-ready'),
    'fallback',
    'fallback sign-in CTA rendered when auth disabled',
  );

  harness.googleSigninHost.click();

  assert.ok(
    harness.dispatchedEvents.some(function (event) {
      return (
        event.type === 'mpr-ui:header:signin-click' &&
        event.detail &&
        event.detail.reason === 'manual'
      );
    }),
    'clicking fallback CTA dispatches signin-click event',
  );
});

test('renderSiteHeader injects the Google Identity script when the client is missing', async () => {
  resetEnvironment();
  const harness = createHostHarness();
  const library = loadLibrary();
  library.renderSiteHeader(harness.host, {
    auth: { loginPath: '/auth/google', logoutPath: '/auth/logout', noncePath: '/auth/nonce' },
  });

  const injectedScripts = global.document.__headChildren.filter(function (node) {
    return node && typeof node.src === 'string';
  });
  assert.ok(
    injectedScripts.some(function (node) {
      return /https:\/\/accounts\.google\.com\/gsi\/client/.test(node.src || '');
    }),
    'expected GIS script injection when google client missing',
  );

  injectedScripts.forEach(function (node) {
    if (typeof node.onload === 'function') {
      node.onload();
    }
  });
  await flushAsync();

  const errorEvents = harness.dispatchedEvents.filter(function (event) {
    return event.type === 'mpr-ui:header:error';
  });
  assert.ok(
    errorEvents.some(function (event) {
      return event.detail && event.detail.code === 'mpr-ui.header.google_unavailable';
    }),
    'should emit google_unavailable when renderButton API stays missing after load',
  );
});

test('renderSiteHeader reports script failures when the GIS loader errors', async () => {
  resetEnvironment();
  const harness = createHostHarness();
  const documentStub = global.document;
  const library = loadLibrary();
  documentStub.head.appendChild = function appendWithFailure(node) {
    if (typeof node.onerror === 'function') {
      node.onerror(new Error('loader failed'));
    }
    return node;
  };
  library.renderSiteHeader(harness.host, {
    auth: { loginPath: '/auth/google', logoutPath: '/auth/logout', noncePath: '/auth/nonce' },
  });
  await flushAsync();

  const errorEvents = harness.dispatchedEvents.filter(function (event) {
    return event.type === 'mpr-ui:header:error';
  });
  assert.ok(
    errorEvents.some(function (event) {
      return event.detail && event.detail.code === 'mpr-ui.header.google_script_failed';
    }),
    'expected google_script_failed event when the loader cannot fetch GIS',
  );
});

test('renderSiteHeader renders the Google button inside the header when siteId is provided', async () => {
  resetEnvironment();
  const harness = createHostHarness();
  const renderCalls = [];
  global.google = {
    accounts: {
      id: {
        renderButton(host, options) {
          renderCalls.push({ host, options });
        },
        prompt: function () {},
        initialize: function () {},
      },
    },
  };
  const library = loadLibrary();
  library.renderSiteHeader(harness.host, {
    siteId: 'demo-site-id',
    auth: { loginPath: '/auth/google', logoutPath: '/auth/logout', noncePath: '/auth/nonce' },
  });
  await flushAsync();
  assert.strictEqual(renderCalls.length, 1, 'expected renderButton to be called once');
  assert.strictEqual(
    renderCalls[0].host,
    harness.googleSigninHost,
    'google button should mount inside the header host',
  );
  assert.strictEqual(
    harness.host.getAttribute('data-mpr-google-site-id'),
    'demo-site-id',
    'host should record the provided site id',
  );
  assert.strictEqual(
    harness.googleSigninHost.getAttribute('data-mpr-google-ready'),
    'true',
    'google host is marked ready after renderButton succeeds',
  );
});

test('renderSiteHeader dispatches error event when Google button fails to render', async () => {
  resetEnvironment();
  const harness = createHostHarness();
  global.google = {
    accounts: {
      id: {
        renderButton() {
          throw new Error('boom');
        },
        initialize: function () {},
        prompt: function () {},
      },
    },
  };
  const library = loadLibrary();
  library.renderSiteHeader(harness.host, {
    auth: { loginPath: '/auth/google', logoutPath: '/auth/logout', noncePath: '/auth/nonce' },
  });
  await flushAsync();

  const errorEvents = harness.dispatchedEvents.filter(function (event) {
    return event.type === 'mpr-ui:header:error';
  });
  assert.ok(
    errorEvents.length > 0,
    'expected error event when Google button cannot render',
  );
  assert.notEqual(
    harness.googleSigninHost.getAttribute('data-mpr-google-ready'),
    'fallback',
    'no fallback button rendered after Google button failure',
  );
});

test('siteId falls back to the bundled default when omitted', () => {
  resetEnvironment();
  const harness = createHostHarness();
  const library = loadLibrary();
  library.renderSiteHeader(harness.host, {
    auth: { loginPath: '/auth/google', logoutPath: '/auth/logout', noncePath: '/auth/nonce' },
  });
  assert.strictEqual(
    harness.host.getAttribute('data-mpr-google-site-id'),
    '991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com',
    'expected fallback site id when value missing',
  );
});

test('initial auth avoids duplicate listeners on update', () => {
  resetEnvironment();
  global.google = {
    accounts: {
      id: {
        prompt: function () {
          testInitialAuthAvoidsDuplicateListenersOnUpdate.promptCount += 1;
        },
        initialize: function () {},
      },
    },
  };
  function testInitialAuthAvoidsDuplicateListenersOnUpdate() {}
  testInitialAuthAvoidsDuplicateListenersOnUpdate.promptCount = 0;

  const harness = createHostHarness();
  const library = loadLibrary();
  const controller = library.renderSiteHeader(harness.host, { auth: {} });

  assert.strictEqual(
    harness.root.classList.contains('mpr-header--no-auth'),
    false,
    'no-auth class not applied when auth configured initially',
  );
  assert.strictEqual(
    harness.host.getListenerCount('mpr-ui:auth:authenticated'),
    1,
    'auth listener attached during initial render',
  );
  assert.strictEqual(
    harness.host.getListenerCount('mpr-ui:auth:unauthenticated'),
    1,
    'unauth listener attached during initial render',
  );

  controller.update({ profileLabel: 'Account' });

  assert.strictEqual(
    harness.host.getListenerCount('mpr-ui:auth:authenticated'),
    1,
    'auth listener not duplicated after update',
  );
  assert.strictEqual(
    harness.host.getListenerCount('mpr-ui:auth:unauthenticated'),
    1,
    'unauth listener not duplicated after update',
  );
});

test('credential flow with initAuthClient dispatches auth events', async () => {
  resetEnvironment();
  const harness = createHostHarness();
  const library = loadLibrary();

  let sessionProfile = null;

  global.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input && input.url ? String(input.url) : '';
    const method = init && init.method ? String(init.method).toUpperCase() : 'GET';
    if (url === '/auth/nonce' && method === 'POST') {
      return Promise.resolve({
        ok: true,
        json: function () {
          return Promise.resolve({ nonce: 'demo-nonce-token' });
        },
      });
    }
    if (url === '/auth/google' && method === 'POST') {
      sessionProfile = {
        user_id: 'demo-user-42',
        user_email: 'demo.user@example.com',
        display: 'Demo User',
        avatar_url: 'https://avatars.githubusercontent.com/u/9919?s=40&v=4',
      };
      return Promise.resolve({
        ok: true,
        json: function () {
          return Promise.resolve(sessionProfile);
        },
      });
    }
    if (url === '/auth/logout' && method === 'POST') {
      sessionProfile = null;
      return Promise.resolve({
        ok: true,
        json: function () {
          return Promise.resolve({ success: true });
        },
      });
    }
    return Promise.resolve({
      ok: true,
      json: function () {
        return Promise.resolve({});
      },
    });
  };

  global.google = {
    accounts: {
      id: { initialize: function () {}, prompt: function () {} },
    },
  };

  const bootstrapInvocations = [];
  global.initAuthClient = function (config) {
    bootstrapInvocations.push(sessionProfile ? 'authenticated' : 'unauthenticated');
    return Promise.resolve().then(function () {
      if (sessionProfile && typeof config.onAuthenticated === 'function') {
        config.onAuthenticated(sessionProfile);
        return;
      }
      if (typeof config.onUnauthenticated === 'function') {
        config.onUnauthenticated();
      }
    });
  };

  const controller = library.renderSiteHeader(harness.host, {
    auth: { loginPath: '/auth/google', logoutPath: '/auth/logout', noncePath: '/auth/nonce' },
  });

  const authController = controller.getAuthController();
  assert.ok(
    authController !== null && typeof authController === 'object',
    'auth controller is available when auth is configured',
  );

  await authController.handleCredential({ credential: 'demo-id-token' });

  const lastEvent = harness.dispatchedEvents[harness.dispatchedEvents.length - 1];
  assert.strictEqual(
    lastEvent && lastEvent.type,
    'mpr-ui:auth:authenticated',
    'authenticated event emitted after credential exchange',
  );
  assert.strictEqual(
    lastEvent && lastEvent.detail && lastEvent.detail.profile.display,
    'Demo User',
    'profile from bootstrap is forwarded with authenticated event',
  );
  assert.strictEqual(
    harness.host.attributes['data-user-id'],
    'demo-user-42',
    'dataset populated with user identifier after authentication',
  );
  assert.ok(
    bootstrapInvocations.indexOf('authenticated') !== -1,
    'bootstrap invoked authenticated branch after exchange',
  );

  await authController.signOut();

  const eventTypes = harness.dispatchedEvents.map(function (entry) {
    return entry.type;
  });
  const lastAuthIndex = eventTypes.lastIndexOf('mpr-ui:auth:authenticated');
  const lastUnauthIndex = eventTypes.lastIndexOf('mpr-ui:auth:unauthenticated');
  assert.ok(lastUnauthIndex > lastAuthIndex, 'unauthenticated event emitted after sign-out');
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(harness.host.attributes, 'data-user-id'),
    false,
    'user dataset cleared after sign-out',
  );
  assert.ok(
    bootstrapInvocations.filter(function (state) {
      return state === 'unauthenticated';
    }).length >= 1,
    'bootstrap invoked unauthenticated branch during flow',
  );
});

test('Google button is required when auth is configured and must not show fallback on error', async () => {
  resetEnvironment();
  const harness = createHostHarness();
  global.google = {
    accounts: {
      id: {
        renderButton() {
          throw new Error('renderButton failed');
        },
        initialize: function () {},
        prompt: function () {},
      },
    },
  };
  const library = loadLibrary();
  library.renderSiteHeader(harness.host, {
    siteId: 'demo-site-id',
    auth: { loginPath: '/auth/google', logoutPath: '/auth/logout', noncePath: '/auth/nonce' },
  });
  await flushAsync();

  const errorEvents = harness.dispatchedEvents.filter(function (event) {
    return event.type === 'mpr-ui:header:error';
  });
  assert.ok(
    errorEvents.length > 0,
    'error event must be dispatched when Google button fails to render',
  );
  assert.notEqual(
    harness.googleSigninHost.getAttribute('data-mpr-google-ready'),
    'fallback',
    'fallback button must NOT be rendered when Google button fails (fail hard)',
  );
});

test('Google button render failure marks error state on the container', async () => {
  resetEnvironment();
  const harness = createHostHarness();
  global.google = {
    accounts: {
      id: {
        renderButton() {
          throw new Error('renderButton failed');
        },
        initialize: function () {},
        prompt: function () {},
      },
    },
  };
  const library = loadLibrary();
  library.renderSiteHeader(harness.host, {
    siteId: 'demo-site-id',
    auth: { loginPath: '/auth/google', logoutPath: '/auth/logout', noncePath: '/auth/nonce' },
  });
  await flushAsync();

  assert.strictEqual(
    harness.googleSigninHost.getAttribute('data-mpr-google-ready'),
    'error',
    'error state must be flagged when renderButton throws',
  );
  assert.strictEqual(
    harness.googleSigninHost.getAttribute('data-mpr-google-error'),
    'mpr-ui.header.google_render_failed',
    'error code stored on container when render fails',
  );
  assert.strictEqual(
    harness.googleSigninHost.getAttribute('data-mpr-signin-fallback'),
    null,
    'no fallback flag present after render failure',
  );
});

test('Google script load failure marks error state and emits error event', async () => {
  resetEnvironment();
  const harness = createHostHarness();
  const originalAppendChild = global.document.head.appendChild;
  global.document.head.appendChild = function appendWithFailure(node) {
    if (node && typeof node.onerror === 'function') {
      node.onerror(new Error('load failed'));
    }
    return originalAppendChild.call(this, node);
  };
  const library = loadLibrary();
  library.renderSiteHeader(harness.host, {
    siteId: 'demo-site-id',
    auth: { loginPath: '/auth/google', logoutPath: '/auth/logout', noncePath: '/auth/nonce' },
  });
  await flushAsync();

  const errorEvents = harness.dispatchedEvents.filter(function (event) {
    return event.type === 'mpr-ui:header:error';
  });
  assert.ok(
    errorEvents.some(function (event) {
      return event.detail && event.detail.code === 'mpr-ui.header.google_script_failed';
    }),
    'script failure dispatches header error event with script failure code',
  );
  assert.strictEqual(
    harness.googleSigninHost.getAttribute('data-mpr-google-ready'),
    'error',
    'script failure marks error state on container',
  );
  assert.strictEqual(
    harness.googleSigninHost.getAttribute('data-mpr-google-error'),
    'mpr-ui.header.google_script_failed',
    'script failure code stored on container attribute',
  );
  assert.strictEqual(
    harness.googleSigninHost.getAttribute('data-mpr-signin-fallback'),
    null,
    'no fallback flag present after script failure',
  );
});

test('profile displays user name only, not email', async () => {
  resetEnvironment();
  const harness = createHostHarness();

  global.google = {
    accounts: {
      id: { initialize: function () {}, prompt: function () {} },
    },
  };

  const profileWithEmail = {
    user_id: 'user-123',
    user_email: 'user@example.com',
    display: 'Jane Doe',
  };

  global.initAuthClient = function bootstrap(config) {
    return Promise.resolve().then(function () {
      if (typeof config.onAuthenticated === 'function') {
        config.onAuthenticated(profileWithEmail);
      }
    });
  };

  const library = loadLibrary();
  library.renderSiteHeader(harness.host, {
    auth: { loginPath: '/auth/google', logoutPath: '/auth/logout', noncePath: '/auth/nonce' },
  });
  await flushAsync();

  assert.strictEqual(
    harness.profileName.textContent,
    'Jane Doe',
    'profile name displays the display name when available',
  );
  assert.ok(
    harness.profileName.textContent.indexOf('user@example.com') === -1,
    'profile must not display email address',
  );

  const harnessWithoutDisplay = createHostHarness();
  const profileWithoutDisplay = {
    user_id: 'user-456',
    user_email: 'another@example.com',
  };

  global.initAuthClient = function bootstrap(config) {
    return Promise.resolve().then(function () {
      if (typeof config.onAuthenticated === 'function') {
        config.onAuthenticated(profileWithoutDisplay);
      }
    });
  };

  library.renderSiteHeader(harnessWithoutDisplay.host, {
    auth: { loginPath: '/auth/google', logoutPath: '/auth/logout', noncePath: '/auth/nonce' },
  });
  await flushAsync();

  assert.ok(
    harnessWithoutDisplay.profileName.textContent.indexOf('another@example.com') === -1,
    'profile must not fall back to email when display name is missing',
  );
  assert.strictEqual(
    harnessWithoutDisplay.profileName.textContent,
    'user-456',
    'profile falls back to user_id when display name is not available',
  );
});
