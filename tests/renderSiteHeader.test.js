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
    head: {
      appendChild: function (node) {
        if (node && node.id) {
          elementsById[node.id] = node;
        }
        headChildren.push(node);
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
    null,
    'google host remains hidden when auth is not configured',
  );

  controller.destroy();
});

test('renderSiteHeader renders the Google button inside the header when siteId is provided', () => {
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

test('google sign-in host reports availability errors when auth is configured but google is unavailable', () => {
  resetEnvironment();
  const harness = createHostHarness();
  const library = loadLibrary();
  library.renderSiteHeader(harness.host, {
    auth: { loginPath: '/auth/google', logoutPath: '/auth/logout', noncePath: '/auth/nonce' },
  });

  const errorEvents = harness.dispatchedEvents.filter(function (event) {
    return event.type === 'mpr-ui:header:error';
  });

  assert.strictEqual(errorEvents.length, 1, 'missing google library emits header error');
  assert.deepStrictEqual(
    errorEvents[0].detail,
    { code: 'mpr-ui.header.google_unavailable' },
    'error payload describes the missing GIS library',
  );
  assert.strictEqual(
    harness.googleSigninHost.getListenerCount('click'),
    0,
    'no fallback click handlers attached when google is unavailable',
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
