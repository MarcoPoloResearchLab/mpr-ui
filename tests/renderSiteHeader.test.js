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
  const themeButton = createElementStub({ supportsEvents: true, supportsAttributes: true });
  const settingsButton = createElementStub({ supportsEvents: true });
  const signInButton = createElementStub({ supportsEvents: true });
  const profileContainer = createElementStub();
  const profileLabel = createElementStub();
  const profileName = createElementStub();
  const signOutButton = createElementStub({ supportsEvents: true });

  const selectorMap = new Map([
    ['header.mpr-header', root],
    ['[data-mpr-header="nav"]', nav],
    ['[data-mpr-header="brand"]', brand],
    ['[data-mpr-header="theme-toggle"]', themeButton],
    ['[data-mpr-header="settings-button"]', settingsButton],
    ['[data-mpr-header="sign-in-button"]', signInButton],
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
    themeButton: themeButton,
    settingsButton: settingsButton,
    signInButton: signInButton,
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

test('enabling auth via update rebinds handlers', () => {
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

  harness.signInButton.click();
  assert.strictEqual(
    harness.dispatchedEvents.filter(function (event) {
      return event.type === 'mpr-ui:header:signin-click';
    }).length,
    1,
    'fallback sign-in event dispatched before auth is enabled',
  );

  global.google = {
    accounts: {
      id: {
        prompt: function () {
          testEnablingAuthViaUpdateRebindsHandlers.promptCalls += 1;
        },
        initialize: function () {},
      },
    },
  };
  function testEnablingAuthViaUpdateRebindsHandlers() {}
  testEnablingAuthViaUpdateRebindsHandlers.promptCalls = 0;

  controller.update({ auth: {} });

  assert.strictEqual(
    harness.host.getListenerCount('mpr-ui:auth:authenticated'),
    1,
    'auth listener attached after enabling',
  );
  assert.strictEqual(
    harness.host.getListenerCount('mpr-ui:auth:unauthenticated'),
    1,
    'unauth listener attached after enabling',
  );
  assert.strictEqual(
    harness.signInButton.getListenerCount('click'),
    1,
    'sign-in button keeps a single click handler',
  );
  assert.strictEqual(
    harness.root.classList.contains('mpr-header--no-auth'),
    false,
    'no-auth class removed after enabling auth',
  );

  const beforeEventCount = harness.dispatchedEvents.length;
  harness.signInButton.click();
  assert.strictEqual(
    testEnablingAuthViaUpdateRebindsHandlers.promptCalls,
    1,
    'google prompt invoked after enabling auth via update',
  );
  assert.strictEqual(
    harness.dispatchedEvents.length,
    beforeEventCount,
    'fallback sign-in event suppressed after auth is enabled',
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
  assert.strictEqual(
    harness.signInButton.getListenerCount('click'),
    1,
    'single click handler installed with initial auth',
  );

  harness.signInButton.click();
  assert.strictEqual(
    testInitialAuthAvoidsDuplicateListenersOnUpdate.promptCount,
    1,
    'google prompt triggered on click with initial auth',
  );

  controller.update({ signInLabel: 'Log in' });

  assert.strictEqual(
    harness.host.getListenerCount('mpr-ui:auth:authenticated'),
    1,
    'auth listener not duplicated after update',
  );
  assert.strictEqual(
    harness.signInButton.getListenerCount('click'),
    1,
    'sign-in click handler remains singular after update',
  );

  harness.signInButton.click();
  assert.strictEqual(
    testInitialAuthAvoidsDuplicateListenersOnUpdate.promptCount,
    2,
    'google prompt handler persists after update',
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
