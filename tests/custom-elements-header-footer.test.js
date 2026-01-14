// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');

const bundlePath = join(__dirname, '..', 'mpr-ui.js');

function createClassList() {
  const values = new Set();
  return {
    add: function add() {
      for (let index = 0; index < arguments.length; index += 1) {
        const entry = arguments[index];
        if (entry) values.add(String(entry));
      }
    },
    remove: function remove() {
      for (let index = 0; index < arguments.length; index += 1) {
        values.delete(String(arguments[index]));
      }
    },
    toggle: function toggle(className, force) {
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
    contains: function contains(name) {
      return values.has(String(name));
    },
    toArray: function toArray() {
      return Array.from(values);
    },
  };
}

function createStubNode(options) {
  const config = Object.assign(
    { classList: false, attributes: false, textContent: '', supportsEvents: false },
    options || {},
  );
  const node = {
    textContent: config.textContent || '',
    innerHTML: config.innerHTML || '',
    children: [],
  };
  if (config.classList) {
    node.classList = createClassList();
  }
  if (config.attributes) {
    const attributes = {};
    node.attributes = attributes;
    node.setAttribute = function setAttribute(name, value) {
      attributes[name] = String(value);
    };
    node.getAttribute = function getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name)
        ? attributes[name]
        : null;
    };
    node.removeAttribute = function removeAttribute(name) {
      delete attributes[name];
    };
    node.hasAttribute = function hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name);
    };
  }
  node.appendChild = function appendChild(child) {
    this.children.push(child);
    return child;
  };
  node.insertBefore = function insertBefore(child, referenceNode) {
    if (!referenceNode) {
      this.children.unshift(child);
      return child;
    }
    const index = this.children.indexOf(referenceNode);
    if (index === -1) {
      this.children.push(child);
      return child;
    }
    this.children.splice(index, 0, child);
    return child;
  };
  node.clear = function clear() {
    this.children.length = 0;
    this.innerHTML = '';
    this.textContent = '';
  };
  if (config.supportsEvents) {
    const listeners = {};
    node.addEventListener = function addEventListener(type, handler) {
      const eventType = String(type);
      if (!listeners[eventType]) {
        listeners[eventType] = [];
      }
      if (listeners[eventType].indexOf(handler) === -1) {
        listeners[eventType].push(handler);
      }
    };
    node.removeEventListener = function removeEventListener(type, handler) {
      const eventType = String(type);
      if (!listeners[eventType]) {
        return;
      }
      listeners[eventType] = listeners[eventType].filter(function keep(entry) {
        return entry !== handler;
      });
    };
    node.dispatchEvent = function dispatchEvent(event) {
      const payload = event && typeof event === 'object' ? event : { type: '' };
      if (!payload.type) {
        payload.type = '';
      }
      payload.currentTarget = node;
      if (!payload.target) {
        payload.target = node;
      }
      const eventType = String(payload.type);
      const handlers = listeners[eventType] ? listeners[eventType].slice() : [];
      handlers.forEach(function invoke(handler) {
        handler.call(node, payload);
      });
      return handlers.length > 0;
    };
  }
  return node;
}

function createDocumentStub() {
  const elementsById = {};
  const headChildren = [];
  const documentElement = createStubNode({ attributes: true });
  const bodyElement = createStubNode({ attributes: true });
  const eventListeners = {};
  const documentStub = {
    __headChildren: headChildren,
    head: {
      appendChild: function appendChild(node) {
        if (node && node.id) {
          elementsById[node.id] = node;
        }
        headChildren.push(node);
        return node;
      },
    },
    body: bodyElement,
    documentElement: documentElement,
    createElement: function createElement(tagName) {
      return {
        id: '',
        tagName: String(tagName || '').toUpperCase(),
        setAttribute: function setAttribute(name, value) {
          this[name] = value;
        },
        appendChild: function appendChild(child) {
          this.child = child;
        },
        styleSheet: null,
        textContent: '',
        onload: null,
        onerror: null,
      };
    },
    createTextNode: function createTextNode(text) {
      return { textContent: String(text) };
    },
    getElementById: function getElementById(id) {
      return elementsById[id] || null;
    },
    querySelector: function querySelector() {
      return null;
    },
    querySelectorAll: function querySelectorAll() {
      return [];
    },
    addEventListener: function addEventListener(type, handler) {
      const eventType = String(type);
      if (!eventListeners[eventType]) {
        eventListeners[eventType] = [];
      }
      if (eventListeners[eventType].indexOf(handler) === -1) {
        eventListeners[eventType].push(handler);
      }
    },
    removeEventListener: function removeEventListener(type, handler) {
      const eventType = String(type);
      if (!eventListeners[eventType]) {
        return;
      }
      eventListeners[eventType] = eventListeners[eventType].filter(function keep(entry) {
        return entry !== handler;
      });
    },
    dispatchEvent: function dispatchEvent(event) {
      const descriptor = event && event.type ? String(event.type) : '';
      const handlers = eventListeners[descriptor] ? eventListeners[descriptor].slice() : [];
      handlers.forEach(function invoke(handler) {
        handler.call(documentStub, event);
      });
      return handlers.length > 0;
    },
  };
  return documentStub;
}

function captureConsoleErrors() {
  const messages = [];
  const originalConsole = global.console || {};
  const originalError = originalConsole.error;
  if (!global.console) {
    global.console = {};
  }
  global.console.error = function error() {
    const parts = [];
    for (let index = 0; index < arguments.length; index += 1) {
      parts.push(String(arguments[index]));
    }
    messages.push(parts.join(' '));
  };
  return {
    messages,
    restore: function restore() {
      if (!global.console) {
        return;
      }
      if (originalError) {
        global.console.error = originalError;
        return;
      }
      delete global.console.error;
    },
  };
}

function resetEnvironment() {
  delete require.cache[bundlePath];
  delete global.MPRUI;
  delete global.window;

  const definitions = new Map();
  global.customElements = {
    define: function define(name, ctor) {
      const normalized = String(name);
      if (definitions.has(normalized)) {
        throw new Error('duplicate custom element: ' + normalized);
      }
      definitions.set(normalized, ctor);
    },
    get: function get(name) {
      return definitions.get(String(name)) || null;
    },
  };

  function notifyObservedAttributeChange(instance, name, oldValue, newValue) {
    if (
      !instance ||
      typeof instance.attributeChangedCallback !== 'function' ||
      !instance.constructor ||
      !Array.isArray(instance.constructor.observedAttributes)
    ) {
      return;
    }
    if (instance.constructor.observedAttributes.indexOf(name) === -1) {
      return;
    }
    instance.attributeChangedCallback(name, oldValue, newValue);
  }

  global.HTMLElement = class HTMLElementShim {
    constructor() {
      this.attributes = {};
      this.dataset = {};
      this.classList = createClassList();
      this.__listeners = {};
      this.__mprConnected = false;
    }
    setAttribute(name, value) {
      const attrName = String(name);
      const normalized = String(value);
      const oldValue = Object.prototype.hasOwnProperty.call(this.attributes, attrName)
        ? this.attributes[attrName]
        : null;
      this.attributes[attrName] = normalized;
      if (attrName.indexOf('data-') === 0) {
        const datasetKey = attrName
          .slice(5)
          .replace(/-([a-z])/g, function convert(_, letter) {
            return letter.toUpperCase();
          });
        this.dataset[datasetKey] = normalized;
      }
      notifyObservedAttributeChange(this, attrName, oldValue, normalized);
    }
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name]
        : null;
    }
    removeAttribute(name) {
      const attrName = String(name);
      const oldValue = this.getAttribute(attrName);
      delete this.attributes[attrName];
      if (attrName.indexOf('data-') === 0) {
        const datasetKey = attrName
          .slice(5)
          .replace(/-([a-z])/g, function convert(_, letter) {
            return letter.toUpperCase();
          });
        delete this.dataset[datasetKey];
      }
      notifyObservedAttributeChange(this, attrName, oldValue, null);
    }
    addEventListener(type, handler) {
      const eventType = String(type);
      if (!this.__listeners[eventType]) {
        this.__listeners[eventType] = [];
      }
      if (this.__listeners[eventType].indexOf(handler) === -1) {
        this.__listeners[eventType].push(handler);
      }
    }
    removeEventListener(type, handler) {
      const eventType = String(type);
      if (!this.__listeners[eventType]) {
        return;
      }
      this.__listeners[eventType] = this.__listeners[eventType].filter(function keep(entry) {
        return entry !== handler;
      });
    }
    dispatchEvent(event) {
      const descriptor = event && event.type ? String(event.type) : '';
      const handlers = this.__listeners[descriptor] ? this.__listeners[descriptor].slice() : [];
      handlers.forEach(function invoke(handler) {
        handler.call(this, event);
      }, this);
      return handlers.length > 0;
    }
  };

  global.document = createDocumentStub();
  global.CustomEvent = function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
    this.bubbles = Boolean(init && init.bubbles);
  };
  global.fetch = function fetch() {
    return Promise.resolve({
      ok: true,
      json: function json() {
        return Promise.resolve({});
      },
    });
  };
}

function loadLibrary() {
  require(bundlePath);
  return global.MPRUI;
}

function createSlotNode(text) {
  return {
    textContent: text,
    attributes: {},
    setAttribute: function setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute: function getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name]
        : null;
    },
  };
}

function attachHostApi(element, selectorMap, multiSelectorMap) {
  const dispatchedEvents = [];
  element.__dispatchedEvents = dispatchedEvents;

  element.innerHTML = '';
  element.querySelector = function querySelector(selector) {
    return selectorMap.has(selector) ? selectorMap.get(selector) : null;
  };
  element.__slotNodes = [];
  element.__slotMap = {};
  element.__setSlotNodes = function __setSlotNodes(slotEntries) {
    this.__slotNodes = [];
    this.__slotMap = {};
    Object.keys(slotEntries || {}).forEach(
      function assign(slotName) {
        this.__slotMap[slotName] = slotEntries[slotName].map(function wrap(node) {
          if (!node.setAttribute) {
            node.setAttribute = function setAttribute(name, value) {
              this.attributes = this.attributes || {};
              this.attributes[name] = String(value);
            };
          }
          if (!node.getAttribute) {
            node.getAttribute = function getAttribute(name) {
              return this.attributes && Object.prototype.hasOwnProperty.call(this.attributes, name)
                ? this.attributes[name]
                : null;
            };
          }
          node.setAttribute('slot', slotName);
          return node;
        });
        Array.prototype.push.apply(this.__slotNodes, this.__slotMap[slotName]);
      }.bind(this),
    );
  };
  element.querySelectorAll = function querySelectorAll(selector) {
    if (selector === '[slot]') {
      return this.__slotNodes.slice();
    }
    const slotMatch = selector && selector.match(/^\[slot="([^"]+)"\]$/);
    if (slotMatch) {
      const slotName = slotMatch[1];
      return this.__slotMap[slotName] ? this.__slotMap[slotName].slice() : [];
    }
    if (multiSelectorMap && multiSelectorMap.has(selector)) {
      const nodes = multiSelectorMap.get(selector);
      return nodes ? nodes.slice() : [];
    }
    return [];
  };
  element.dispatchEvent = function dispatchEvent(event) {
    const descriptor = event && event.type ? String(event.type) : '';
    dispatchedEvents.push({ type: descriptor, detail: event ? event.detail : undefined });
    if (typeof HTMLElement.prototype.dispatchEvent === 'function') {
      return HTMLElement.prototype.dispatchEvent.call(this, event);
    }
    return true;
  };
  return element;
}

function flushAsync() {
  return new Promise(function resolveLater(resolve) {
    setTimeout(resolve, 0);
  });
}

function createHeaderElementHarness() {
  const HeaderElement = global.customElements.get('mpr-header');
  assert.ok(HeaderElement, 'mpr-header is defined');

  const root = createStubNode({ classList: true, attributes: true });
  const brandLink = createStubNode({ attributes: true });
  const brandContainer = createStubNode();
  const nav = createStubNode({});
  const actions = createStubNode({});
  const googleHost = createStubNode({ attributes: true, classList: true, supportsEvents: true });
  const settingsButton = createStubNode({ attributes: true, supportsEvents: true });
  const userMenu = createStubNode({ attributes: true, supportsEvents: true });

  const selectorMap = new Map([
    ['header.mpr-header', root],
    ['[data-mpr-header="brand"]', brandLink],
    ['.mpr-header__brand', brandContainer],
    ['[data-mpr-header="nav"]', nav],
    ['[data-mpr-header="google-signin"]', googleHost],
    ['[data-mpr-header="settings-button"]', settingsButton],
    ['[data-mpr-header="user-menu"]', userMenu],
    ['.mpr-header__actions', actions],
  ]);

  const element = attachHostApi(new HeaderElement(), selectorMap);
  element.dataset = element.dataset || {};

  return {
    element,
    root,
    brandLink,
    brandContainer,
    nav,
    actions,
    userMenu,
    selectorMap,
  };
}

function createFooterElementHarness(options) {
  const settings = Object.assign({ includeMenu: true }, options);
  const FooterElement = global.customElements.get('mpr-footer');
  assert.ok(FooterElement, 'mpr-footer is defined');

  const root = createStubNode({ classList: true, attributes: true });
  root.getBoundingClientRect = function getBoundingClientRect() {
    return { x: 0, y: 0, width: 1024, height: 80 };
  };
  root.offsetHeight = 80;
  const inner = createStubNode({});
  const layout = createStubNode({});
  const brandContainer = createStubNode({});
  const prefix = createStubNode({});
  const menuWrapper = settings.includeMenu ? createStubNode({}) : null;
  const menu = settings.includeMenu ? createStubNode({ classList: true, attributes: true }) : null;
  const toggleButton = createStubNode({ attributes: true, supportsEvents: true });
  const themeToggleHost = createStubNode({ attributes: true });
  const privacyLink = createStubNode({ attributes: true });

  const stickySpacer = createStubNode({});
  stickySpacer.style = { height: '' };

  const selectorMap = new Map([
    ['footer[role="contentinfo"]', root],
    ['[data-mpr-footer="inner"]', inner],
    ['[data-mpr-footer="layout"]', layout],
    ['[data-mpr-footer="brand"]', brandContainer],
    ['[data-mpr-footer="prefix"]', prefix],
    ['[data-mpr-footer="toggle-button"]', toggleButton],
    ['[data-mpr-footer="theme-toggle"]', themeToggleHost],
    ['[data-mpr-footer="privacy-link"]', privacyLink],
    ['[data-mpr-footer="sticky-spacer"]', stickySpacer],
  ]);
  if (settings.includeMenu) {
    selectorMap.set('[data-mpr-footer="menu-wrapper"]', menuWrapper);
    selectorMap.set('[data-mpr-footer="menu"]', menu);
  }

  root.querySelector = function query(selector) {
    return selectorMap.has(selector) ? selectorMap.get(selector) : null;
  };

  const element = attachHostApi(new FooterElement(), selectorMap);
  element.dataset = element.dataset || {};

  return {
    element,
    root,
    layout,
    brandContainer,
    prefix,
    menu: settings.includeMenu ? menu : null,
    menuWrapper: settings.includeMenu ? menuWrapper : null,
    privacyLink,
    toggleButton,
    selectorMap,
  };
}

function createThemeToggleElementHarness() {
  const ThemeToggleElement = global.customElements.get('mpr-theme-toggle');
  assert.ok(ThemeToggleElement, 'mpr-theme-toggle is defined');
  const control = createStubNode({ supportsEvents: true, attributes: true });
  const icon = createStubNode({});
  const selectorMap = new Map([
    ['[data-mpr-theme-toggle="control"]', control],
    ['[data-mpr-theme-toggle="icon"]', icon],
  ]);
  const element = attachHostApi(new ThemeToggleElement(), selectorMap);
  return { element, control };
}

function createLoginButtonHarness(googleStub) {
  const LoginButtonElement = global.customElements.get('mpr-login-button');
  assert.ok(LoginButtonElement, 'mpr-login-button is defined');
  const buttonHost = createStubNode({ attributes: true, supportsEvents: true });
  buttonHost.setAttribute = function setAttribute(name, value) {
    this.attributes = this.attributes || {};
    this.attributes[name] = String(value);
  };
  buttonHost.querySelector = function querySelector() {
    return null;
  };
  const selectorMap = new Map([['[data-mpr-login="google-button"]', buttonHost]]);
  const element = attachHostApi(new LoginButtonElement(), selectorMap);
  const renderCalls = [];
  googleStub.accounts.id.renderButton = function renderButton(target, config) {
    renderCalls.push({ target, config });
  };
  return { element, buttonHost, renderCalls };
}

function createSettingsElementHarness() {
  const SettingsElement = global.customElements.get('mpr-settings');
  assert.ok(SettingsElement, 'mpr-settings is defined');
  const triggerHost = createStubNode({});
  const button = createStubNode({ supportsEvents: true, attributes: true });
  const label = createStubNode({});
  const panel = createStubNode({ attributes: true });
  const selectorMap = new Map([
    ['[data-mpr-settings="trigger"]', triggerHost],
    ['[data-mpr-settings="toggle"]', button],
    ['[data-mpr-settings="label"]', label],
    ['[data-mpr-settings="panel"]', panel],
  ]);
  const element = attachHostApi(new SettingsElement(), selectorMap);
  element.dataset = element.dataset || {};
  element.__setSlotNodes({
    panel: [createSlotNode('Panel Slot Content')],
  });
  return { element, button, label, panel };
}

function createSitesElementHarness(links) {
  const SitesElement = global.customElements.get('mpr-sites');
  assert.ok(SitesElement, 'mpr-sites is defined');
  const listHost = createStubNode({});
  const anchors = Array.isArray(links)
    ? links.map((_entry, index) =>
        createStubNode({ attributes: true, supportsEvents: true }),
      )
    : [];
  anchors.forEach((anchor, index) => {
    anchor.attributes = anchor.attributes || {};
    anchor.attributes['data-mpr-sites-index'] = String(index);
  });
  const selectorMap = new Map([['[data-mpr-sites="list"]', listHost]]);
  const multiSelectorMap = new Map();
  multiSelectorMap.set('[data-mpr-sites-index]', anchors);
  const element = attachHostApi(new SitesElement(), selectorMap, multiSelectorMap);
  element.dataset = element.dataset || {};
  return { element, anchors };
}

function createUserElementHarness() {
  const UserElement = global.customElements.get('mpr-user');
  assert.ok(UserElement, 'mpr-user is defined');
  const trigger = createStubNode({ supportsEvents: true, attributes: true });
  const avatarWrapper = createStubNode({ attributes: true });
  const avatarImage = createStubNode({ attributes: true });
  const name = createStubNode({});
  const menu = createStubNode({ attributes: true });
  const logoutButton = createStubNode({ supportsEvents: true, attributes: true });

  const selectorMap = new Map([
    ['[data-mpr-user="trigger"]', trigger],
    ['[data-mpr-user="avatar"]', avatarWrapper],
    ['[data-mpr-user="avatar-image"]', avatarImage],
    ['[data-mpr-user="name"]', name],
    ['[data-mpr-user="menu"]', menu],
    ['[data-mpr-user="logout"]', logoutButton],
  ]);

  const element = attachHostApi(new UserElement(), selectorMap);
  element.dataset = element.dataset || {};
  return {
    element,
    trigger,
    avatarWrapper,
    avatarImage,
    name,
    menu,
    logoutButton,
  };
}

test('mpr-header reflects attributes and updates values', () => {
  resetEnvironment();
  loadLibrary();
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;

  headerElement.setAttribute('brand-label', 'Custom Brand');
  headerElement.setAttribute('brand-href', '/home');
  headerElement.setAttribute(
    'nav-links',
    JSON.stringify([{ label: 'Docs', href: '#docs' }]),
  );
  headerElement.setAttribute('settings-label', 'Preferences');
  headerElement.setAttribute('settings', 'false');
  headerElement.setAttribute('google-site-id', 'example-site');
  headerElement.setAttribute('tauth-tenant-id', 'tenant-alpha');
  headerElement.setAttribute(
    'theme-config',
    JSON.stringify({ initialMode: 'light' }),
  );

  headerElement.connectedCallback();

  assert.equal(
    headerElement.getAttribute('brand-label'),
    'Custom Brand',
    'attribute remains accessible for dataset reflection',
  );
  assert.equal(headerElement.dataset.brandLabel, 'Custom Brand');
  assert.equal(harness.brandLink.textContent, 'Custom Brand');
  assert.equal(
    harness.brandLink.getAttribute && harness.brandLink.getAttribute('href'),
    '/home',
    'brand href reflects attribute',
  );
  assert.ok(
    harness.nav.innerHTML.indexOf('Docs') !== -1,
    'nav links rendered from attribute JSON',
  );
  assert.equal(
    harness.root.classList.contains('mpr-header--no-settings'),
    true,
    'settings toggle disabled when attribute false',
  );
  assert.equal(
    headerElement.getAttribute('data-mpr-google-site-id'),
    'example-site',
    'google site id reflected on host dataset',
  );
  assert.equal(headerElement.dataset.tenantId, 'tenant-alpha');

  headerElement.setAttribute('brand-label', 'Next Brand');
  assert.equal(harness.brandLink.textContent, 'Next Brand');
});

test('mpr-header wires the user menu element with logout and tenant attributes', () => {
  resetEnvironment();
  loadLibrary();
  const harness = createHeaderElementHarness();
  harness.element.setAttribute('tauth-tenant-id', 'tenant-demo');
  harness.element.setAttribute('logout-url', '/signed-out');
  harness.element.setAttribute('sign-out-label', 'Log out');
  harness.element.setAttribute('user-menu-display-mode', 'avatar-name');
  harness.element.setAttribute('user-menu-avatar-url', 'https://cdn.example.com/avatar.png');
  harness.element.setAttribute('user-menu-avatar-label', 'Profile photo');
  harness.element.connectedCallback();

  assert.ok(harness.userMenu, 'user menu host is available');
  assert.equal(
    harness.userMenu.getAttribute('tauth-tenant-id'),
    'tenant-demo',
    'tenant id is forwarded to the user menu',
  );
  assert.equal(
    harness.userMenu.getAttribute('logout-url'),
    '/signed-out',
    'logout url is forwarded to the user menu',
  );
  assert.equal(
    harness.userMenu.getAttribute('logout-label'),
    'Log out',
    'logout label is forwarded to the user menu',
  );
  assert.equal(
    harness.userMenu.getAttribute('display-mode'),
    'avatar-name',
    'display mode is forwarded to the user menu',
  );
  assert.equal(
    harness.userMenu.getAttribute('avatar-url'),
    'https://cdn.example.com/avatar.png',
    'avatar url is forwarded to the user menu',
  );
  assert.equal(
    harness.userMenu.getAttribute('avatar-label'),
    'Profile photo',
    'avatar label is forwarded to the user menu',
  );
});

test('mpr-header enables settings button when settings attribute true', () => {
  resetEnvironment();
  loadLibrary();
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;

  headerElement.setAttribute('settings', 'true');

  headerElement.connectedCallback();

  assert.equal(
    harness.root.classList.contains('mpr-header--no-settings'),
    false,
    'settings attribute enables header settings button',
  );
});

test('mpr-header ignores legacy attributes', async () => {
  const legacyCases = [
    {
      name: 'settings-enabled',
      applyAttributes: function applyAttributes(headerElement) {
        headerElement.setAttribute('settings-enabled', 'true');
      },
      assertOutcome: function assertOutcome(headerHarness) {
        assert.equal(
          headerHarness.root.classList.contains('mpr-header--no-settings'),
          true,
          'settings-enabled should not enable the settings button',
        );
      },
    },
    {
      name: 'auth-config',
      setupGlobals: function setupGlobals() {
        global.google = {
          accounts: {
            id: {
              renderButton() {},
              initialize() {},
              prompt() {},
            },
          },
        };
      },
      applyAttributes: function applyAttributes(headerElement) {
        headerElement.setAttribute(
          'auth-config',
          JSON.stringify({
            googleClientId: 'legacy-site',
            tenantId: 'legacy-tenant',
          }),
        );
      },
      assertOutcome: function assertOutcome(headerHarness, headerElement) {
        const controller = headerElement.__headerController;
        const authController =
          controller && typeof controller.getAuthController === 'function'
            ? controller.getAuthController()
            : null;
        assert.equal(
          authController,
          null,
          'auth-config attribute should be ignored',
        );
        assert.equal(
          headerHarness.root.classList.contains('mpr-header--no-auth'),
          true,
          'auth-config should not enable auth UI',
        );
      },
    },
  ];

  for (const legacyCase of legacyCases) {
    resetEnvironment();
    if (legacyCase.setupGlobals) {
      legacyCase.setupGlobals();
    }
    loadLibrary();
    const headerHarness = createHeaderElementHarness();
    const headerElement = headerHarness.element;
    legacyCase.applyAttributes(headerElement);
    headerElement.connectedCallback();
    await flushAsync();
    legacyCase.assertOutcome(headerHarness, headerElement);
  }
});

test('mpr-header logs legacy attributes', async () => {
  const legacyAttributeErrorCode = 'mpr-ui.dsl.legacy_attribute';
  const legacyCases = [
    {
      name: 'settings-enabled',
      expectedToken: 'settings-enabled',
      applyAttributes: function applyAttributes(headerElement) {
        headerElement.setAttribute('settings-enabled', 'true');
      },
    },
    {
      name: 'auth-config',
      expectedToken: 'auth-config',
      setupGlobals: function setupGlobals() {
        global.google = {
          accounts: {
            id: {
              renderButton() {},
              initialize() {},
              prompt() {},
            },
          },
        };
      },
      applyAttributes: function applyAttributes(headerElement) {
        headerElement.setAttribute(
          'auth-config',
          JSON.stringify({
            googleClientId: 'legacy-site',
            tenantId: 'legacy-tenant',
          }),
        );
      },
    },
    {
      name: 'theme-mode',
      expectedToken: 'theme-mode',
      applyAttributes: function applyAttributes(headerElement) {
        headerElement.setAttribute('theme-mode', 'dark');
      },
    },
  ];

  for (const legacyCase of legacyCases) {
    resetEnvironment();
    if (legacyCase.setupGlobals) {
      legacyCase.setupGlobals();
    }
    const capture = captureConsoleErrors();
    try {
      loadLibrary();
      const headerHarness = createHeaderElementHarness();
      const headerElement = headerHarness.element;
      legacyCase.applyAttributes(headerElement);
      headerElement.connectedCallback();
      await flushAsync();
      const matched = capture.messages.some(
        (message) =>
          message.indexOf(legacyAttributeErrorCode) !== -1 &&
          message.indexOf(legacyCase.expectedToken) !== -1,
      );
      assert.ok(
        matched,
        'expected legacy DSL log for ' + legacyCase.name,
      );
    } finally {
      capture.restore();
    }
  }
});

test('mpr-header projects slot content into brand, nav, and actions', () => {
  resetEnvironment();
  loadLibrary();
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;

  const brandSlot = createSlotNode('Logo Slot');
  const navLeftSlot = createSlotNode('Nav Left Slot');
  const navRightSlot = createSlotNode('Nav Right Slot');
  const auxSlot = createSlotNode('Aux Slot');
  headerElement.__setSlotNodes({
    brand: [brandSlot],
    'nav-left': [navLeftSlot],
    'nav-right': [navRightSlot],
    aux: [auxSlot],
  });

  headerElement.connectedCallback();

  assert.ok(
    harness.brandContainer.children.indexOf(brandSlot) !== -1,
    'brand slot appended to brand container',
  );
  assert.ok(
    harness.nav.children.indexOf(navLeftSlot) !== -1 ||
      harness.nav.children.indexOf(navRightSlot) !== -1,
    'nav slot nodes appended to nav container',
  );
  assert.ok(
    harness.actions.children.indexOf(auxSlot) !== -1,
    'aux slot appended to actions container',
  );
});

test('mpr-header tauth-url attribute configures auth endpoints', async () => {
  resetEnvironment();
  const googleStub = {
    accounts: {
      id: {
        renderButton() {},
        initialize() {},
        prompt() {},
      },
    },
  };
  global.google = googleStub;
  loadLibrary();
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;
  headerElement.setAttribute('google-site-id', 'docker-demo-site');
  headerElement.setAttribute('tauth-url', 'http://localhost:8080');
  headerElement.setAttribute('tauth-login-path', '/auth/google');
  headerElement.setAttribute('tauth-logout-path', '/auth/logout');
  headerElement.setAttribute('tauth-nonce-path', '/auth/nonce');
  headerElement.setAttribute('tauth-tenant-id', 'tenant-demo');

  headerElement.connectedCallback();
  await flushAsync();

  const controller = headerElement.__headerController;
  assert.ok(controller, 'header controller initialized');
  const authController =
    controller && typeof controller.getAuthController === 'function'
      ? controller.getAuthController()
      : null;
  assert.ok(authController, 'auth controller attached to header');
  const authOptions = authController && authController.state && authController.state.options;
  assert.ok(authOptions, 'auth options available on controller state');
  assert.equal(
    authOptions.tauthUrl,
    'http://localhost:8080',
    'tauth-url attribute flows into auth options',
  );
  assert.equal(authOptions.tauthLoginPath, '/auth/google');
  assert.equal(authOptions.tauthLogoutPath, '/auth/logout');
  assert.equal(authOptions.tauthNoncePath, '/auth/nonce');
  assert.equal(authOptions.tenantId, 'tenant-demo');
});

test('mpr-footer reflects attributes and slot content', () => {
  resetEnvironment();
  loadLibrary();
  const harness = createFooterElementHarness();
  const footerElement = harness.element;

  const menuPrefixSlot = createSlotNode('Menu Prefix Slot');
  const menuLinksSlot = createSlotNode('Menu Link Slot');
  const legalSlot = createSlotNode('Legal Slot');
  footerElement.__setSlotNodes({
    'menu-prefix': [menuPrefixSlot],
    'menu-links': [menuLinksSlot],
    legal: [legalSlot],
  });

  footerElement.setAttribute('prefix-text', 'Crafted by');
  footerElement.setAttribute('privacy-link-label', 'Policy Center');
  footerElement.setAttribute('toggle-label', 'Sites');
  footerElement.setAttribute(
    'links-collection',
    JSON.stringify({
      style: 'drop-up',
      text: 'Crafted by',
      links: [{ label: 'Docs', url: '#docs' }],
    }),
  );
  footerElement.setAttribute('privacy-modal-content', '<p>Policy</p>');

  footerElement.connectedCallback();

  assert.equal(footerElement.attributes['prefix-text'], 'Crafted by');
  assert.equal(footerElement.getAttribute('prefix-text'), 'Crafted by');
  assert.equal(footerElement.dataset.prefixText, 'Crafted by');
  assert.ok(
    footerElement.dataset.linksCollection,
    'links-collection attribute should reflect into dataset',
  );
  const controllerConfig =
    footerElement.__footerController &&
    footerElement.__footerController.getConfig
      ? footerElement.__footerController.getConfig()
      : null;
  const controllerPrefix = controllerConfig && controllerConfig.prefixText;
  assert.equal(
    controllerPrefix,
    'Crafted by',
    'controller config reflects custom prefix text',
  );
  assert.deepEqual(
    controllerConfig && controllerConfig.links,
    [
      {
        label: 'Docs',
        href: '#docs',
        url: '#docs',
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    ],
    'links-collection parsed into controller config',
  );
  assert.equal(
    controllerConfig && controllerConfig.privacyModalContent,
    '<p>Policy</p>',
    'privacy modal content reflected into controller config',
  );
  assert.strictEqual(
    controllerConfig && controllerConfig.linksMenuEnabled,
    true,
    'linksCollection should enable the drop-up by default',
  );
  footerElement.setAttribute('prefix-text', 'Updated by');
  const updatedConfig =
    footerElement.__footerController &&
    footerElement.__footerController.getConfig
      ? footerElement.__footerController.getConfig()
      : null;
  assert.equal(
    updatedConfig && updatedConfig.prefixText,
    'Updated by',
    'prefix text updates via attribute reflection',
  );
  assert.ok(
    harness.brandContainer.children.indexOf(menuPrefixSlot) !== -1,
    'menu-prefix slot appended to brand container',
  );
  assert.ok(
    harness.menu.children.indexOf(menuLinksSlot) !== -1,
    'menu-links slot appended to menu list',
  );
  assert.ok(
    harness.layout.children.indexOf(legalSlot) !== -1,
    'legal slot appended to layout container',
  );
});

test('mpr-footer renders static text when links collection is missing', () => {
  resetEnvironment();
  loadLibrary();
  const harness = createFooterElementHarness({ includeMenu: false });
  const footerElement = harness.element;
  footerElement.connectedCallback();

  const controllerConfig =
    footerElement.__footerController &&
    footerElement.__footerController.getConfig
      ? footerElement.__footerController.getConfig()
      : null;

  assert.ok(controllerConfig, 'controller config should be available');
  assert.strictEqual(
    controllerConfig.linksMenuEnabled,
    false,
    'links menu should be disabled when no collection is provided',
  );
  assert.deepEqual(
    controllerConfig.links,
    [],
    'no links should be rendered when the collection is missing',
  );
  assert.ok(
    controllerConfig.prefixText && controllerConfig.prefixText.length > 0,
    'prefix text should still render when the menu is disabled',
  );
});

test('mpr-footer ignores legacy attributes', () => {
  const legacyCases = [
    {
      name: 'links',
      applyAttributes: function applyAttributes(footerElement) {
        footerElement.setAttribute(
          'links',
          JSON.stringify([{ label: 'Legacy', url: '#legacy' }]),
        );
      },
      assertOutcome: function assertOutcome(controllerConfig) {
        assert.equal(
          controllerConfig.linksMenuEnabled,
          false,
          'links attribute should not enable the links menu',
        );
        assert.deepEqual(
          controllerConfig.links,
          [],
          'links attribute should not populate menu links',
        );
      },
    },
    {
      name: 'themeToggle.themeSwitcher',
      applyAttributes: function applyAttributes(footerElement) {
        footerElement.setAttribute(
          'theme-config',
          JSON.stringify({
            themeSwitcher: 'toggle',
          }),
        );
      },
      assertOutcome: function assertOutcome(controllerConfig) {
        assert.equal(
          controllerConfig.themeToggle.enabled,
          false,
          'themeToggle.themeSwitcher should not enable the toggle',
        );
        assert.equal(
          controllerConfig.themeToggle.variant,
          '',
          'themeToggle.themeSwitcher should not select a variant',
        );
      },
    },
  ];

  for (const legacyCase of legacyCases) {
    resetEnvironment();
    loadLibrary();
    const footerHarness = createFooterElementHarness();
    const footerElement = footerHarness.element;
    legacyCase.applyAttributes(footerElement);
    footerElement.connectedCallback();
    const controllerConfig =
      footerElement.__footerController &&
      footerElement.__footerController.getConfig
        ? footerElement.__footerController.getConfig()
        : null;
    assert.ok(controllerConfig, 'controller config should be available');
    legacyCase.assertOutcome(controllerConfig);
  }
});

test('mpr-footer logs legacy attributes and config keys', () => {
  const legacyAttributeErrorCode = 'mpr-ui.dsl.legacy_attribute';
  const legacyConfigErrorCode = 'mpr-ui.dsl.legacy_config';
  const legacyCases = [
    {
      name: 'links',
      expectedCode: legacyAttributeErrorCode,
      expectedToken: 'links',
      applyAttributes: function applyAttributes(footerElement) {
        footerElement.setAttribute(
          'links',
          JSON.stringify([{ label: 'Legacy', url: '#legacy' }]),
        );
      },
    },
    {
      name: 'theme-mode',
      expectedCode: legacyAttributeErrorCode,
      expectedToken: 'theme-mode',
      applyAttributes: function applyAttributes(footerElement) {
        footerElement.setAttribute('theme-mode', 'light');
      },
    },
    {
      name: 'themeToggle.themeSwitcher',
      expectedCode: legacyConfigErrorCode,
      expectedToken: 'themeToggle.themeSwitcher',
      applyAttributes: function applyAttributes(footerElement) {
        footerElement.setAttribute(
          'theme-config',
          JSON.stringify({
            themeSwitcher: 'toggle',
          }),
        );
      },
    },
  ];

  for (const legacyCase of legacyCases) {
    resetEnvironment();
    const capture = captureConsoleErrors();
    try {
      loadLibrary();
      const footerHarness = createFooterElementHarness();
      const footerElement = footerHarness.element;
      legacyCase.applyAttributes(footerElement);
      footerElement.connectedCallback();
      const matched = capture.messages.some(
        (message) =>
          message.indexOf(legacyCase.expectedCode) !== -1 &&
          message.indexOf(legacyCase.expectedToken) !== -1,
      );
      assert.ok(
        matched,
        'expected legacy DSL log for ' + legacyCase.name,
      );
    } finally {
      capture.restore();
    }
  }
});

test('mpr-footer drop-up toggles without Bootstrap dependencies', () => {
  resetEnvironment();
  loadLibrary();
  let bootstrapCalls = 0;
  global.bootstrap = {
    Dropdown: {
      getOrCreateInstance() {
        bootstrapCalls += 1;
      },
    },
  };
  const harness = createFooterElementHarness();
  const footerElement = harness.element;
  footerElement.setAttribute(
    'links-collection',
    JSON.stringify({
      style: 'drop-up',
      text: 'Built by',
      links: [{ label: 'Docs', url: '#docs' }],
    }),
  );
  footerElement.connectedCallback();
  assert.strictEqual(
    harness.toggleButton.attributes && harness.toggleButton.attributes['data-bs-toggle'],
    undefined,
    'Bootstrap data attribute should not be set on the toggle button',
  );
  const clickEvent = { type: 'click', preventDefault() {} };
  harness.toggleButton.dispatchEvent(clickEvent);
  assert.equal(
    harness.menu.classList.contains('mpr-footer__menu--open'),
    true,
    'menu opens on first click even when Bootstrap namespace exists',
  );
  assert.equal(harness.toggleButton.getAttribute('aria-expanded'), 'true');
  harness.toggleButton.dispatchEvent(clickEvent);
  assert.equal(
    harness.menu.classList.contains('mpr-footer__menu--open'),
    false,
    'menu closes on second click',
  );
  assert.equal(harness.toggleButton.getAttribute('aria-expanded'), 'false');
  assert.strictEqual(bootstrapCalls, 0, 'Bootstrap dropdown helper should not be invoked');
  delete global.bootstrap;
});

test('mpr-theme-toggle custom element toggles theme mode', () => {
  resetEnvironment();
  const library = loadLibrary();
  const harness = createThemeToggleElementHarness();
  harness.element.setAttribute(
    'theme-config',
    JSON.stringify({ initialMode: 'light' }),
  );
  harness.element.connectedCallback();
  assert.equal(library.getThemeMode(), 'light');
  harness.control.dispatchEvent({ type: 'click' });
  assert.equal(
    library.getThemeMode(),
    'dark',
    'clicking the control toggles the global theme mode',
  );
});

test('mpr-theme-toggle ignores legacy theme-mode attribute', () => {
  const legacyCases = [
    { attribute: 'theme-mode', value: 'light', expectedMode: 'dark' },
  ];

  legacyCases.forEach((legacyCase) => {
    resetEnvironment();
    const library = loadLibrary();
    const harness = createThemeToggleElementHarness();
    harness.element.setAttribute(legacyCase.attribute, legacyCase.value);
    harness.element.connectedCallback();
    assert.equal(
      library.getThemeMode(),
      legacyCase.expectedMode,
      'theme-mode attribute should not override the initial mode',
    );
  });
});

test('mpr-theme-toggle logs legacy attributes', () => {
  const legacyAttributeErrorCode = 'mpr-ui.dsl.legacy_attribute';
  const legacyCases = [
    { name: 'theme-mode', value: 'light' },
  ];

  legacyCases.forEach((legacyCase) => {
    resetEnvironment();
    const capture = captureConsoleErrors();
    try {
      loadLibrary();
      const harness = createThemeToggleElementHarness();
      harness.element.setAttribute('theme-mode', legacyCase.value);
      harness.element.connectedCallback();
      const matched = capture.messages.some(
        (message) =>
          message.indexOf(legacyAttributeErrorCode) !== -1 &&
          message.indexOf('theme-mode') !== -1,
      );
      assert.ok(
        matched,
        'expected legacy DSL log for ' + legacyCase.name,
      );
    } finally {
      capture.restore();
    }
  });
});

test('mpr-login-button renders the Google button with provided site ID', async () => {
  resetEnvironment();
  const googleStub = {
    accounts: {
      id: {
        renderButton() {},
        initialize() {},
        prompt() {},
      },
    },
  };
  global.google = googleStub;
  loadLibrary();
  const { element, buttonHost, renderCalls } = createLoginButtonHarness(googleStub);
  element.setAttribute('site-id', 'custom-site');
  element.setAttribute('tauth-login-path', '/auth/login');
  element.setAttribute('tauth-logout-path', '/auth/logout');
  element.setAttribute('tauth-nonce-path', '/auth/nonce');
  element.setAttribute('tauth-tenant-id', 'tenant-login');
  element.connectedCallback();
  await flushAsync();
  assert.equal(
    element.getAttribute('data-mpr-google-site-id'),
    'custom-site',
    'site ID attribute reflected to dataset',
  );
  assert.equal(renderCalls.length, 1, 'Google renderButton invoked once');
  assert.strictEqual(
    renderCalls[0].target,
    buttonHost,
    'Google button rendered inside the element host',
  );
});

test('mpr-login-button reports missing tenant ID', async () => {
  resetEnvironment();
  const googleStub = {
    accounts: {
      id: {
        renderButton() {},
        initialize() {},
        prompt() {},
      },
    },
  };
  global.google = googleStub;
  loadLibrary();
  const { element, renderCalls } = createLoginButtonHarness(googleStub);
  element.setAttribute('site-id', 'custom-site');
  element.setAttribute('tauth-login-path', '/auth/login');
  element.setAttribute('tauth-logout-path', '/auth/logout');
  element.setAttribute('tauth-nonce-path', '/auth/nonce');
  element.connectedCallback();
  await flushAsync();
  assert.equal(renderCalls.length, 0, 'Google button should not render');
  assert.equal(
    element.getAttribute('data-mpr-google-error'),
    'missing-tauth-tenant-id',
    'missing tenant id captured in the error attribute',
  );
  const lastEvent = element.__dispatchedEvents[element.__dispatchedEvents.length - 1];
  assert.equal(lastEvent.type, 'mpr-login:error');
  assert.equal(lastEvent.detail.code, 'mpr-ui.tenant_id_required');
});

test('mpr-settings toggles open state and dispatches events', () => {
  resetEnvironment();
  loadLibrary();
  const { element, button, label, panel } = createSettingsElementHarness();
  element.setAttribute('label', 'Quick Settings');
  element.setAttribute('open', '');
  element.connectedCallback();
  assert.equal(label.textContent, 'Quick Settings');
  assert.equal(
    element.getAttribute('data-mpr-settings-open'),
    'true',
    'open attribute applied on initial render',
  );
  assert.strictEqual(
    panel.getAttribute && panel.getAttribute('hidden'),
    null,
    'panel visible when open attribute present',
  );
  assert.equal(
    element.getAttribute('data-mpr-settings-open'),
    'true',
    'data attribute matches declarative open state',
  );
  element.removeAttribute('open');
  assert.equal(
    element.getAttribute('data-mpr-settings-open'),
    'false',
    'removing the open attribute closes the launcher',
  );
  assert.equal(
    panel.getAttribute && panel.getAttribute('hidden'),
    'hidden',
    'panel hidden after attribute removal',
  );
  element.setAttribute('open', '');
  assert.equal(
    element.getAttribute('data-mpr-settings-open'),
    'true',
    're-adding open attribute reopens the panel',
  );
  button.dispatchEvent({ type: 'click', preventDefault() {} });
  assert.equal(
    element.getAttribute('data-mpr-settings-open'),
    'false',
    'clicking toggles the launcher closed',
  );
  assert.equal(
    panel.getAttribute && panel.getAttribute('hidden'),
    'hidden',
    'panel hidden after toggle',
  );
  const lastEvent =
    element.__dispatchedEvents[element.__dispatchedEvents.length - 1];
  assert.equal(lastEvent.type, 'mpr-settings:toggle');
  assert.equal(lastEvent.detail && lastEvent.detail.open, false);
  element.setAttribute('open', 'false');
  assert.equal(
    element.getAttribute('data-mpr-settings-open'),
    'false',
    'open attribute closes the launcher',
  );
});

test('mpr-sites dispatches link click events with normalized details', () => {
  resetEnvironment();
  loadLibrary();
  const links = [
    { label: 'Docs', url: 'https://example.com/docs' },
    { label: 'Support', url: 'https://example.com/support' },
  ];
  const { element, anchors } = createSitesElementHarness(links);
  element.setAttribute('links', JSON.stringify(links));
  element.setAttribute('variant', 'grid');
  element.setAttribute('columns', '2');
  element.connectedCallback();
  assert.equal(
    element.getAttribute('data-mpr-sites-variant'),
    'grid',
    'variant reflected on host dataset',
  );
  assert.equal(
    element.getAttribute('data-mpr-sites-count'),
    String(links.length),
    'site count stored on host',
  );
  assert.ok(
    anchors[0],
    'first anchor stub is available for click simulation',
  );
  anchors[0].dispatchEvent({ type: 'click' });
  const lastEvent =
    element.__dispatchedEvents[element.__dispatchedEvents.length - 1];
  assert.equal(lastEvent.type, 'mpr-sites:link-click');
  assert.deepEqual(
    lastEvent.detail,
    {
      label: 'Docs',
      url: 'https://example.com/docs',
      target: '_blank',
      rel: 'noopener noreferrer',
      index: 0,
    },
    'link click detail exposes normalized catalog entry',
  );
});

test('mpr-header navigation links always open in new window', () => {
  resetEnvironment();
  loadLibrary();
  const navLinks = [
    { label: 'Docs', href: 'https://github.com/example/docs' },
    { label: 'Support', href: 'https://github.com/example/support' },
  ];
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;
  headerElement.setAttribute('brand-label', 'Test Brand');
  headerElement.setAttribute('brand-href', 'https://example.com');
  headerElement.setAttribute('nav-links', JSON.stringify(navLinks));
  headerElement.connectedCallback();
  assert.ok(
    harness.nav.innerHTML.indexOf('target="_blank"') !== -1,
    'navigation links have target="_blank"',
  );
  assert.ok(
    harness.nav.innerHTML.indexOf('rel="noopener noreferrer"') !== -1,
    'navigation links have rel="noopener noreferrer"',
  );
  assert.equal(
    harness.brandLink.getAttribute('target'),
    '_blank',
    'brand link has target="_blank"',
  );
  assert.equal(
    harness.brandLink.getAttribute('rel'),
    'noopener noreferrer',
    'brand link has rel="noopener noreferrer"',
  );
  navLinks.forEach((link) => {
    assert.ok(
      harness.nav.innerHTML.indexOf(link.label) !== -1,
      `navigation link label ${link.label} is rendered`,
    );
  });
});

test('mpr-header sticky attribute controls root sticky dataset', () => {
  resetEnvironment();
  loadLibrary();
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;

  headerElement.setAttribute('sticky', 'false');
  headerElement.connectedCallback();

  assert.equal(
    headerElement.dataset.sticky,
    'false',
    'sticky attribute reflected into dataset',
  );
  assert.equal(
    harness.root.getAttribute && harness.root.getAttribute('data-mpr-sticky'),
    'false',
    'header root marked non-sticky when sticky="false"',
  );

  headerElement.setAttribute('sticky', 'true');

  assert.equal(
    headerElement.dataset.sticky,
    'true',
    'sticky dataset updated to true',
  );
  assert.equal(
    harness.root.getAttribute && harness.root.getAttribute('data-mpr-sticky'),
    null,
    'header root clears non-sticky override when sticky is true',
  );
});

test('mpr-footer sticky attribute controls root sticky dataset', () => {
  resetEnvironment();
  loadLibrary();
  const harness = createFooterElementHarness();
  const footerElement = harness.element;
  footerElement.setAttribute('sticky', 'false');
  footerElement.connectedCallback();

  const spacer = footerElement.querySelector('[data-mpr-footer="sticky-spacer"]');
  assert.ok(spacer, 'sticky spacer renders after initialization');

  assert.equal(
    footerElement.dataset.sticky,
    'false',
    'sticky attribute reflected into footer dataset',
  );
  assert.equal(
    harness.root.getAttribute && harness.root.getAttribute('data-mpr-sticky'),
    'false',
    'footer root marked non-sticky when sticky="false"',
  );
  assert.equal(
    footerElement.getAttribute('data-mpr-sticky'),
    'false',
    'footer host marked non-sticky when sticky="false"',
  );
  assert.equal(spacer.style.height, '0px', 'sticky spacer collapsed when sticky is false');

  footerElement.setAttribute('sticky', 'true');

  assert.equal(
    harness.root.getAttribute && harness.root.getAttribute('data-mpr-sticky'),
    null,
    'footer root clears non-sticky flag when sticky is true',
  );
  assert.equal(
    footerElement.getAttribute('data-mpr-sticky'),
    null,
    'footer host clears non-sticky flag when sticky is true',
  );
  assert.equal(
    footerElement.dataset.sticky,
    'true',
    'footer dataset updated to reflect sticky attribute',
  );
  assert.notEqual(spacer.style.height, '0px', 'sticky spacer reserves footer height when sticky is true');
});

test('mpr-user renders avatar modes from TAuth profile data', () => {
  const cases = [
    {
      label: 'avatar-only',
      displayMode: 'avatar',
      expectedName: '',
      expectedAvatar: 'https://cdn.example.com/avatar.png',
      customAvatarUrl: null,
    },
    {
      label: 'avatar-name',
      displayMode: 'avatar-name',
      expectedName: 'Ada',
      expectedAvatar: 'https://cdn.example.com/avatar.png',
      customAvatarUrl: null,
    },
    {
      label: 'avatar-full-name',
      displayMode: 'avatar-full-name',
      expectedName: 'Ada Lovelace',
      expectedAvatar: 'https://cdn.example.com/avatar.png',
      customAvatarUrl: null,
    },
    {
      label: 'custom-avatar',
      displayMode: 'custom-avatar',
      expectedName: '',
      expectedAvatar: 'https://cdn.example.com/custom.png',
      customAvatarUrl: 'https://cdn.example.com/custom.png',
    },
  ];

  cases.forEach((testCase) => {
    resetEnvironment();
    loadLibrary();
    global.getCurrentUser = function getCurrentUser() {
      return {
        display: 'Ada Lovelace',
        given_name: 'Ada',
        avatar_url: 'https://cdn.example.com/avatar.png',
        user_email: 'ada@example.com',
      };
    };
    global.logout = function logout() {
      return Promise.resolve();
    };
    global.setAuthTenantId = function setAuthTenantId() {};

    const harness = createUserElementHarness();
    const element = harness.element;
    element.setAttribute('display-mode', testCase.displayMode);
    element.setAttribute('logout-url', '#signed-out');
    element.setAttribute('logout-label', 'Log out');
    element.setAttribute('tauth-tenant-id', 'tenant-test');
    if (testCase.customAvatarUrl) {
      element.setAttribute('avatar-url', testCase.customAvatarUrl);
    }

    element.connectedCallback();

    assert.equal(
      element.getAttribute('data-mpr-user-status'),
      'authenticated',
      `${testCase.label}: sets authenticated status`,
    );
    assert.equal(
      harness.name.textContent,
      testCase.expectedName,
      `${testCase.label}: renders expected name`,
    );
    assert.equal(
      harness.avatarImage.attributes && harness.avatarImage.attributes.src,
      testCase.expectedAvatar,
      `${testCase.label}: renders expected avatar url`,
    );
  });
});

test('mpr-user toggles menu and triggers logout redirect', async () => {
  resetEnvironment();
  loadLibrary();
  global.getCurrentUser = function getCurrentUser() {
    return {
      display: 'Ada Lovelace',
      given_name: 'Ada',
      avatar_url: 'https://cdn.example.com/avatar.png',
      user_email: 'ada@example.com',
    };
  };
  let logoutCalled = false;
  global.logout = function logout() {
    logoutCalled = true;
    return Promise.resolve();
  };
  const tenantCalls = [];
  global.setAuthTenantId = function setAuthTenantId(value) {
    tenantCalls.push(value);
  };
  const locationCalls = [];
  global.location = {
    assign: function assign(url) {
      locationCalls.push(url);
    },
  };

  const harness = createUserElementHarness();
  const element = harness.element;
  element.setAttribute('display-mode', 'avatar');
  element.setAttribute('logout-url', '#signed-out');
  element.setAttribute('logout-label', 'Log out');
  element.setAttribute('tauth-tenant-id', 'tenant-test');

  element.connectedCallback();

  harness.trigger.dispatchEvent({ type: 'click', preventDefault() {} });
  assert.equal(
    element.getAttribute('data-mpr-user-open'),
    'true',
    'user menu opens after trigger click',
  );

  harness.logoutButton.dispatchEvent({ type: 'click', preventDefault() {} });
  await flushAsync();

  assert.equal(logoutCalled, true, 'logout helper invoked');
  assert.deepEqual(locationCalls, ['#signed-out'], 'redirects to logout url');
  assert.ok(
    tenantCalls.indexOf('tenant-test') !== -1,
    'tenant id configured before logout',
  );
  const logoutEvent = element.__dispatchedEvents.find(
    (eventEntry) => eventEntry.type === 'mpr-user:logout',
  );
  assert.ok(logoutEvent, 'logout event dispatched');
});

test('mpr-user validates required attributes', () => {
  const cases = [
    {
      label: 'missing display mode',
      attributes: {
        'logout-url': '#signed-out',
        'logout-label': 'Log out',
        'tauth-tenant-id': 'tenant-test',
      },
      expectedError: 'mpr-ui.user.invalid_display_mode',
    },
    {
      label: 'missing logout url',
      attributes: {
        'display-mode': 'avatar',
        'logout-label': 'Log out',
        'tauth-tenant-id': 'tenant-test',
      },
      expectedError: 'mpr-ui.user.missing_logout_url',
    },
    {
      label: 'missing logout label',
      attributes: {
        'display-mode': 'avatar',
        'logout-url': '#signed-out',
        'tauth-tenant-id': 'tenant-test',
      },
      expectedError: 'mpr-ui.user.missing_logout_label',
    },
    {
      label: 'missing tenant id',
      attributes: {
        'display-mode': 'avatar',
        'logout-url': '#signed-out',
        'logout-label': 'Log out',
      },
      expectedError: 'mpr-ui.tenant_id_required',
    },
    {
      label: 'missing custom avatar url',
      attributes: {
        'display-mode': 'custom-avatar',
        'logout-url': '#signed-out',
        'logout-label': 'Log out',
        'tauth-tenant-id': 'tenant-test',
      },
      expectedError: 'mpr-ui.user.missing_custom_avatar',
    },
  ];

  cases.forEach((testCase) => {
    resetEnvironment();
    loadLibrary();
    global.getCurrentUser = function getCurrentUser() {
      return null;
    };
    global.logout = function logout() {
      return Promise.resolve();
    };
    global.setAuthTenantId = function setAuthTenantId() {};

    const harness = createUserElementHarness();
    const element = harness.element;
    Object.keys(testCase.attributes).forEach((attributeName) => {
      element.setAttribute(attributeName, testCase.attributes[attributeName]);
    });

    element.connectedCallback();

    assert.equal(
      element.getAttribute('data-mpr-user-error'),
      testCase.expectedError,
      `${testCase.label}: exposes error code`,
    );
    const errorEvent = element.__dispatchedEvents.find(
      (eventEntry) => eventEntry.type === 'mpr-user:error',
    );
    assert.ok(errorEvent, `${testCase.label}: error event dispatched`);
    assert.equal(
      errorEvent && errorEvent.detail && errorEvent.detail.code,
      testCase.expectedError,
      `${testCase.label}: error code details match`,
    );
  });
});
