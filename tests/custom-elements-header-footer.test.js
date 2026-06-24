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
      const element = createStubNode({ attributes: true, supportsEvents: true });
      element.id = '';
      element.tagName = String(tagName || '').toUpperCase();
      element.style = {};
      element.styleSheet = null;
      element.onload = null;
      element.onerror = null;
      return element;
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

function createWindowEventTargetStub() {
  const eventListeners = {};
  return {
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
        handler.call(this, event);
      }, this);
      return handlers.length > 0;
    },
  };
}

function resetEnvironment() {
  delete require.cache[bundlePath];
  delete global.MPRUI;
  delete global.window;
  delete global.localStorage;
  delete global.google;
  delete global.initAuthClient;
  delete global.getCurrentUser;
  delete global.requestNonce;
  delete global.exchangeGoogleCredential;
  delete global.setAuthTenantId;
  delete global.logout;

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
        return Promise.resolve({ nonce: 'test-nonce-token' });
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

function createStorageStub(initialValues) {
  const values = new Map(Object.entries(initialValues || {}));
  return {
    getItem: function getItem(key) {
      const normalizedKey = String(key);
      return values.has(normalizedKey) ? values.get(normalizedKey) : null;
    },
    setItem: function setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem: function removeItem(key) {
      values.delete(String(key));
    },
    clear: function clear() {
      values.clear();
    },
  };
}

function installStorageStub(initialValues) {
  const storage = createStorageStub(initialValues);
  Object.defineProperty(global, 'localStorage', {
    configurable: true,
    value: storage,
    writable: true,
  });
  return storage;
}

function createHeaderElementHarness(options) {
  const settings = Object.assign({ includeInternalUserMenu: true }, options);
  const HeaderElement = global.customElements.get('mpr-header');
  assert.ok(HeaderElement, 'mpr-header is defined');

  const root = createStubNode({ classList: true, attributes: true });
  const brandLink = createStubNode({ attributes: true });
  const brandContainer = createStubNode();
  const nav = createStubNode({});
  const horizontalLinks = createStubNode({ attributes: true });
  const actions = createStubNode({});
  const googleHost = createStubNode({ attributes: true, classList: true, supportsEvents: true });
  const settingsButton = createStubNode({ attributes: true, supportsEvents: true });
  const userMenu = createStubNode({ attributes: true, supportsEvents: true });
  const authTransition = createStubNode({ attributes: true });
  const authTransitionTitle = createStubNode({});
  const authTransitionMessage = createStubNode({});

  const selectorMap = new Map([
    ['header.mpr-header', root],
    ['[data-mpr-header="brand"]', brandLink],
    ['.mpr-header__brand', brandContainer],
    ['[data-mpr-header="nav"]', nav],
    ['[data-mpr-header="horizontal-links"]', horizontalLinks],
    ['[data-mpr-header="google-signin"]', googleHost],
    ['[data-mpr-header="settings-button"]', settingsButton],
    ['[data-mpr-header="auth-transition"]', authTransition],
    ['[data-mpr-header="auth-transition-title"]', authTransitionTitle],
    ['[data-mpr-header="auth-transition-message"]', authTransitionMessage],
    ['.mpr-header__actions', actions],
  ]);
  if (settings.includeInternalUserMenu) {
    selectorMap.set('[data-mpr-header="user-menu"]', userMenu);
  }

  const element = attachHostApi(new HeaderElement(), selectorMap);
  element.dataset = element.dataset || {};

  return {
    element,
    root,
    brandLink,
    brandContainer,
    nav,
    horizontalLinks,
    actions,
    googleHost,
    userMenu,
    authTransition,
    authTransitionTitle,
    authTransitionMessage,
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
  const horizontalLinks = createStubNode({ attributes: true });

  const stickySpacer = createStubNode({});
  stickySpacer.style = { height: '' };

  const selectorMap = new Map([
    ['footer[role="contentinfo"]', root],
    ['[data-mpr-footer="inner"]', inner],
    ['[data-mpr-footer="layout"]', layout],
    ['[data-mpr-footer="brand"]', brandContainer],
    ['[data-mpr-footer="horizontal-links"]', horizontalLinks],
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
    horizontalLinks,
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

function attachChildTreeApi(element) {
  element.children = [];
  element.childNodes = element.children;
  element.appendChild = function appendChild(child) {
    this.children.push(child);
    return child;
  };
  element.clear = function clear() {
    this.children.length = 0;
    this.innerHTML = '';
    this.textContent = '';
  };
  return element;
}

function createAuthProviderChooserHarness(providers, options) {
  const AuthProviderChooserElement = global.customElements.get('mpr-auth-provider-chooser');
  assert.ok(AuthProviderChooserElement, 'mpr-auth-provider-chooser is defined');
  const element = attachChildTreeApi(attachHostApi(new AuthProviderChooserElement(), new Map()));
  if (providers !== undefined) {
    element.setAttribute('providers', JSON.stringify(providers));
  }
  if (options && options.variant) {
    element.setAttribute('variant', options.variant);
  }
  return { element };
}

function walkStubTree(root) {
  const nodes = [];
  function visit(node) {
    if (!node) {
      return;
    }
    nodes.push(node);
    const children = Array.isArray(node.children) ? node.children : [];
    children.forEach(function visitChild(child) {
      visit(child);
    });
  }
  visit(root);
  return nodes;
}

function findStubNodesByAttribute(root, attributeName, attributeValue) {
  return walkStubTree(root).filter(function matchNode(node) {
    if (!node || typeof node.getAttribute !== 'function') {
      return false;
    }
    const currentValue = node.getAttribute(attributeName);
    return attributeValue === undefined ? currentValue !== null : currentValue === attributeValue;
  });
}

function getStubNodeByAttribute(root, attributeName, attributeValue) {
  const node = findStubNodesByAttribute(root, attributeName, attributeValue)[0];
  assert.ok(
    node,
    'expected node with ' + attributeName + '=' + String(attributeValue),
  );
  return node;
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

function createLegalDocumentElementHarness() {
  const LegalDocumentElement = global.customElements.get('mpr-legal-document');
  assert.ok(LegalDocumentElement, 'mpr-legal-document is defined');
  const element = attachHostApi(new LegalDocumentElement(), new Map());
  element.dataset = element.dataset || {};
  element.ownerDocument = global.document;
  return { element };
}

function createUserElementHarness(options) {
  const settings = Object.assign({ menuItems: [] }, options);
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

  const menuItems = Array.isArray(settings.menuItems)
    ? settings.menuItems.map((menuItem, index) => {
        const menuItemNode = createStubNode({
          attributes: true,
          supportsEvents: true,
        });
        menuItemNode.setAttribute('data-mpr-user-index', String(index));
        if (menuItem && menuItem.action) {
          menuItemNode.setAttribute('data-mpr-user-action', menuItem.action);
        }
        return menuItemNode;
      })
    : [];
  const multiSelectorMap = new Map([
    ['[data-mpr-user="menu-item"]', menuItems],
  ]);

  const element = attachHostApi(new UserElement(), selectorMap, multiSelectorMap);
  element.dataset = element.dataset || {};
  return {
    element,
    trigger,
    avatarWrapper,
    avatarImage,
    name,
    menu,
    logoutButton,
    menuItems,
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
  headerElement.setAttribute(
    'horizontal-links',
    JSON.stringify({
      alignment: 'right',
      links: [{ label: 'Pricing', href: '/pricing' }],
    }),
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
  assert.ok(
    harness.horizontalLinks.innerHTML.indexOf('Pricing') !== -1,
    'horizontal links rendered from attribute JSON',
  );
  assert.equal(
    harness.horizontalLinks.getAttribute('data-mpr-align'),
    'right',
    'horizontal links alignment reflected on the row container',
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

test('MU-134: mpr-header sets rel="noopener noreferrer" when horizontal-links target is _blank', () => {
  resetEnvironment();
  loadLibrary();
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;

  headerElement.setAttribute(
    'horizontal-links',
    JSON.stringify({
      alignment: 'center',
      links: [
        { label: 'Pricing', href: '/pricing' },
        { label: 'Docs', href: 'https://example.com/docs', target: '_blank' },
      ],
    }),
  );

  headerElement.connectedCallback();

  assert.match(
    harness.horizontalLinks.innerHTML,
    /<a href="\/pricing">Pricing<\/a>/,
    'inline link without target/rel omits extra attributes',
  );
  assert.match(
    harness.horizontalLinks.innerHTML,
    /<a href="https:\/\/example\.com\/docs" target="_blank" rel="noopener noreferrer">Docs<\/a>/,
    'inline link with target _blank receives noopener rel by default',
  );
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

test('mpr-header uses a slotted mpr-user element for header menu wiring', () => {
  resetEnvironment();
  loadLibrary();
  const harness = createHeaderElementHarness({ includeInternalUserMenu: false });
  const slottedUserMenu = createStubNode({
    attributes: true,
    classList: true,
    supportsEvents: true,
  });
  slottedUserMenu.tagName = 'MPR-USER';
  slottedUserMenu.setAttribute('display-mode', 'avatar');
  harness.element.__setSlotNodes({ aux: [slottedUserMenu] });
  harness.element.setAttribute('tauth-tenant-id', 'tenant-demo');
  harness.element.setAttribute('logout-url', '/signed-out');
  harness.element.setAttribute('sign-out-label', 'Log out');
  harness.element.setAttribute('user-menu-display-mode', 'avatar-name');

  harness.element.connectedCallback();

  assert.equal(
    slottedUserMenu.getAttribute('data-mpr-header'),
    'user-menu',
    'slotted user menu is tagged for header styling',
  );
  assert.equal(
    slottedUserMenu.getAttribute('tauth-tenant-id'),
    'tenant-demo',
    'tenant id is forwarded to the slotted user menu',
  );
  assert.equal(
    slottedUserMenu.getAttribute('logout-url'),
    '/signed-out',
    'logout url is forwarded to the slotted user menu',
  );
  assert.equal(
    slottedUserMenu.getAttribute('logout-label'),
    'Log out',
    'logout label is forwarded to the slotted user menu',
  );
  assert.equal(
    slottedUserMenu.getAttribute('display-mode'),
    'avatar',
    'slotted user menu preserves the explicit display mode',
  );
  assert.equal(
    slottedUserMenu.classList.contains('mpr-header__user'),
    true,
    'slotted user menu inherits header user styling class',
  );
});

test('mpr-user nested in mpr-header does not error before header wiring applies user attributes', async () => {
  resetEnvironment();
  const capture = captureConsoleErrors();
  try {
    loadLibrary();
    let currentUserCallCount = 0;
    global.getCurrentUser = function getCurrentUser() {
      currentUserCallCount += 1;
      return null;
    };
    global.logout = function logout() {
      return Promise.resolve();
    };
    global.setAuthTenantId = function setAuthTenantId() {};

    const headerHarness = createHeaderElementHarness({ includeInternalUserMenu: false });
    const headerElement = headerHarness.element;
    headerElement.tagName = 'MPR-HEADER';
    headerElement.setAttribute('brand-href', '/app');
    headerElement.setAttribute('google-site-id', 'example-site');
    headerElement.setAttribute('tauth-tenant-id', 'tenant-alpha');
    headerElement.setAttribute('logout-url', '/logout');
    headerElement.setAttribute('sign-out-label', 'Log out');
    headerElement.setAttribute('user-menu-display-mode', 'avatar');

    const userHarness = createUserElementHarness();
    const userElement = userHarness.element;
    userElement.tagName = 'MPR-USER';
    userElement.parentElement = headerElement;
    userElement.parentNode = headerElement;
    headerElement.__setSlotNodes({ aux: [userElement] });

    userElement.connectedCallback();

    assert.equal(
      currentUserCallCount,
      0,
      'nested user menu waits for the header auth controller instead of fetching the profile directly',
    );

    assert.equal(
      userElement.getAttribute('data-mpr-user-error'),
      null,
      'nested user menu does not emit a startup configuration error before header wiring runs',
    );
    assert.equal(
      userElement.getAttribute('data-mpr-user-status'),
      'unauthenticated',
      'nested user menu renders in the unauthenticated state from inherited header config',
    );

    headerElement.connectedCallback();
    await flushAsync();

    assert.equal(
      userElement.getAttribute('tauth-tenant-id'),
      'tenant-alpha',
      'header still forwards the resolved tenant id onto the slotted user menu',
    );
    const tenantErrors = capture.messages.filter((message) =>
      message.indexOf('mpr-ui.tenant_id_required') !== -1,
    );
    assert.equal(
      tenantErrors.length,
      0,
      'no tenant bootstrap errors are logged while the nested user menu waits for header wiring',
    );
  } finally {
    capture.restore();
  }
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

test('mpr-header waits for user sign-in before initializing Google Identity', async () => {
  resetEnvironment();
  const callOrder = [];
  let initializeCallCount = 0;
  global.google = {
    accounts: {
      id: {
        initialize() {
          initializeCallCount += 1;
          callOrder.push('initialize');
        },
        renderButton() {
          callOrder.push('renderButton');
        },
        prompt() {},
      },
    },
  };

  loadLibrary();
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;
  headerElement.setAttribute('google-site-id', 'header-race-site');
  headerElement.setAttribute('tauth-login-path', '/auth/login');
  headerElement.setAttribute('tauth-logout-path', '/auth/logout');
  headerElement.setAttribute('tauth-nonce-path', '/auth/nonce');
  headerElement.setAttribute('tauth-tenant-id', 'tenant-race');

  headerElement.connectedCallback();
  await flushAsync();
  await flushAsync();

  assert.equal(
    initializeCallCount,
    0,
    'header should not initialize Google Identity during initial render',
  );
  assert.deepEqual(callOrder, [], 'header does not render a GIS button during initial render');
  const headerSignInButton = harness.googleHost.children[0];
  assert.equal(headerSignInButton.tagName, 'BUTTON', 'header renders a real sign-in button');
  assert.equal(
    headerSignInButton.getAttribute('data-test'),
    'google-signin',
    'header exposes a visible first-party sign-in control',
  );
  headerSignInButton.dispatchEvent({ type: 'click', preventDefault() {} });
  await flushAsync();
  await flushAsync();
  assert.equal(initializeCallCount, 1, 'header initializes Google Identity after click');
  assert.equal(
    harness.googleHost.getAttribute('data-mpr-google-ready'),
    'true',
    'header sign-in trigger stays visible after GIS prompt starts',
  );
});

test('mpr-header disconnects cleanly without starting background nonce work', async () => {
  resetEnvironment();
  const callOrder = [];
  let nonceRequestCalls = 0;
  global.google = {
    accounts: {
      id: {
        initialize() {
          callOrder.push('initialize');
        },
        renderButton() {
          callOrder.push('renderButton');
        },
        prompt() {},
      },
    },
  };
  global.requestNonce = function requestNonce() {
    nonceRequestCalls += 1;
    return Promise.reject(new Error('unexpected background nonce request'));
  };

  try {
    loadLibrary();
    const harness = createHeaderElementHarness();
    const headerElement = harness.element;
    headerElement.setAttribute('google-site-id', 'header-race-site');
    headerElement.setAttribute('tauth-login-path', '/auth/login');
    headerElement.setAttribute('tauth-logout-path', '/auth/logout');
    headerElement.setAttribute('tauth-nonce-path', '/auth/nonce');
    headerElement.setAttribute('tauth-tenant-id', 'tenant-race');

    headerElement.connectedCallback();
    await flushAsync();
    await flushAsync();
    headerElement.disconnectedCallback();
    await flushAsync();

    const headerErrorEvents = headerElement.__dispatchedEvents.filter(
      function filterHeaderError(entry) {
        return entry.type === 'mpr-ui:header:error';
      },
    );
    assert.deepEqual(callOrder, [], 'header does not initialize or render GIS during mount');
    assert.equal(nonceRequestCalls, 0, 'header mount never starts background nonce work');
    assert.equal(headerErrorEvents.length, 0, 'disconnect emits no hidden header errors');
  } finally {
    delete global.requestNonce;
  }
});

test('mpr-header rebinds auth endpoints when tauth-url changes after first render', async () => {
  resetEnvironment();
  const initAuthCalls = [];
  const fetchCalls = [];
  const exchangePayloads = [];
  const initializeCalls = [];
  global.location = { origin: 'http://fallback-origin.test' };
  global.google = {
    accounts: {
      id: {
        renderButton() {},
        initialize(config) {
          initializeCalls.push(config);
        },
        prompt() {},
      },
    },
  };
  global.initAuthClient = function initAuthClient(config) {
    initAuthCalls.push(config);
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(null);
  };
  global.fetch = function fetch(url, init) {
    fetchCalls.push(String(url));
    const pathname = new URL(String(url), 'http://fallback-origin.test').pathname;
    if (pathname === '/auth/google') {
      exchangePayloads.push(JSON.parse(init.body));
      return Promise.resolve({
        ok: true,
        json: function json() {
          return Promise.resolve({ user_email: 'updated@example.com' });
        },
      });
    }
    return Promise.resolve({
      ok: true,
      json: function json() {
        return Promise.resolve({ nonce: 'updated-nonce-token' });
      },
    });
  };

  loadLibrary();
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;
  headerElement.setAttribute('google-site-id', 'docker-demo-site');
  headerElement.setAttribute('tauth-login-path', '/auth/google');
  headerElement.setAttribute('tauth-logout-path', '/auth/logout');
  headerElement.setAttribute('tauth-nonce-path', '/auth/nonce');
  headerElement.setAttribute('tauth-tenant-id', 'tenant-demo');

  headerElement.connectedCallback();
  await flushAsync();
  await flushAsync();

  headerElement.setAttribute('tauth-url', 'http://localhost:8080');
  await flushAsync();
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
    'updated tauth-url replaces the initial fallback base URL',
  );
  assert.equal(
    initAuthCalls[initAuthCalls.length - 1] && initAuthCalls[initAuthCalls.length - 1].baseUrl,
    'http://localhost:8080',
    'initAuthClient reboots with the updated base URL',
  );
  await authController.startGoogleSignIn();
  await flushAsync();
  assert.equal(initializeCalls.length, 1, 'sign-in attempt initializes GIS once');
  assert.equal(
    initializeCalls[0].nonce,
    'updated-nonce-token',
    'sign-in attempt initializes GIS with the issued nonce',
  );
  await initializeCalls[0].callback({ credential: 'updated-header-token' });
  assert.deepEqual(
    fetchCalls,
    ['http://localhost:8080/auth/nonce', 'http://localhost:8080/auth/google'],
    'credential exchange requests switch to the updated tauth-url after the attribute changes',
  );
  assert.deepEqual(
    exchangePayloads,
    [{ google_id_token: 'updated-header-token', nonce_token: 'updated-nonce-token' }],
    'updated nonce is paired with the credential exchange',
  );
});

test('mpr-header keeps receiving auth callbacks after tauth-url rebinding when TAuth retains the original callbacks', async () => {
  resetEnvironment();
  const authenticatedProfile = {
    display: 'Ada Lovelace',
    given_name: 'Ada',
    avatar_url: 'https://cdn.example.com/ada.png',
    user_email: 'ada@example.com',
  };
  let retainedCallbacks = null;
  global.location = { origin: 'http://fallback-origin.test' };
  global.google = {
    accounts: {
      id: {
        renderButton() {},
        initialize() {},
        prompt() {},
      },
    },
  };
  global.initAuthClient = function initAuthClient(config) {
    if (!retainedCallbacks) {
      retainedCallbacks = config;
    }
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(null);
  };
  global.fetch = function fetch() {
    return Promise.resolve({
      ok: true,
      json: function json() {
        return Promise.resolve({ nonce: 'updated-nonce-token' });
      },
    });
  };

  loadLibrary();
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;
  headerElement.setAttribute('google-site-id', 'docker-demo-site');
  headerElement.setAttribute('tauth-login-path', '/auth/google');
  headerElement.setAttribute('tauth-logout-path', '/auth/logout');
  headerElement.setAttribute('tauth-nonce-path', '/auth/nonce');
  headerElement.setAttribute('tauth-tenant-id', 'tenant-demo');

  headerElement.connectedCallback();
  await flushAsync();
  await flushAsync();

  assert.ok(retainedCallbacks, 'initial auth callbacks registered with initAuthClient');

  headerElement.setAttribute('tauth-url', 'http://localhost:8080');
  await flushAsync();
  await flushAsync();

  retainedCallbacks.onAuthenticated(authenticatedProfile);
  await flushAsync();

  const controller = headerElement.__headerController;
  assert.ok(controller, 'header controller initialized');
  const authController =
    controller && typeof controller.getAuthController === 'function'
      ? controller.getAuthController()
      : null;
  assert.ok(authController, 'auth controller attached to header');
  assert.deepEqual(
    authController.state.profile,
    authenticatedProfile,
    'existing TAuth callbacks still authenticate the header after tauth-url rebinding',
  );
  assert.equal(
    harness.root.classList.contains('mpr-header--authenticated'),
    true,
    'header view refreshes when the retained TAuth callback reports authentication',
  );
  const authenticatedEvents = headerElement.__dispatchedEvents.filter(
    (eventEntry) => eventEntry.type === 'mpr-ui:auth:authenticated',
  );
  assert.equal(
    authenticatedEvents.length,
    1,
    'header emits an authenticated event when the retained callback reports authentication',
  );
});

test('createAuthHeader ignores an in-flight credential exchange after tauth-url change', async () => {
  resetEnvironment();
  const library = loadLibrary();
  const authenticatedProfile = {
    display: 'Dorothy Vaughan',
    given_name: 'Dorothy',
    avatar_url: 'https://cdn.example.com/dorothy.png',
    user_email: 'dorothy@example.com',
  };
  const exchangeTenantCalls = [];
  let currentTenantId = null;
  let resolveExchangeProfile;
  global.location = { origin: 'http://fallback-origin.test' };
  global.google = {
    accounts: {
      id: {
        renderButton() {},
        initialize() {},
        prompt() {},
      },
    },
  };
  global.initAuthClient = function initAuthClient() {
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(null);
  };
  global.setAuthTenantId = function setAuthTenantId(tenantId) {
    currentTenantId = tenantId;
  };
  global.exchangeGoogleCredential = function exchangeGoogleCredential() {
    exchangeTenantCalls.push(currentTenantId);
    return new Promise(function waitForExchange(resolve) {
      resolveExchangeProfile = resolve;
    });
  };

  const hostElement = attachHostApi(new global.HTMLElement(), new Map());
  const authController = library.createAuthHeader(hostElement, {
    googleClientId: 'credential-race-client',
    tauthUrl: 'http://localhost:8080',
    tauthLoginPath: '/auth/login',
    tauthLogoutPath: '/auth/logout',
    tauthNoncePath: '/auth/nonce',
    tenantId: 'tenant-alpha',
  });

  await flushAsync();
  await flushAsync();

  const exchangePromise = authController.handleCredential({
    credential: 'signed-id-token',
  }, 'race-nonce');
  await flushAsync();

  assert.deepEqual(
    exchangeTenantCalls,
    ['tenant-alpha'],
    'credential exchange starts against the original tenant configuration',
  );

  authController.updateOptions(
    Object.assign({}, authController.state.options, {
      tauthUrl: 'http://localhost:9090',
    }),
  );
  await flushAsync();
  await flushAsync();

  resolveExchangeProfile(authenticatedProfile);
  await exchangePromise;
  await flushAsync();

  assert.equal(
    authController.state.options.tauthUrl,
    'http://localhost:9090',
    'controller options switch to the updated tauth-url',
  );
  assert.equal(
    authController.state.profile,
    null,
    'stale credential exchanges do not authenticate the controller after auth options change',
  );
  assert.equal(
    authController.state.status,
    'unauthenticated',
    'controller stays unauthenticated after discarding the stale exchange result',
  );
  const authenticatedEvents = hostElement.__dispatchedEvents.filter(
    (eventEntry) => eventEntry.type === 'mpr-ui:auth:authenticated',
  );
  assert.equal(
    authenticatedEvents.length,
    0,
    'stale credential exchange results do not emit authenticated events',
  );
});

test('createAuthHeader initializes GIS with a nonce only for an explicit sign-in attempt', async () => {
  resetEnvironment();
  delete global.initAuthClient;
  delete global.getCurrentUser;
  delete global.requestNonce;
  delete global.exchangeGoogleCredential;
  const library = loadLibrary();
  const authenticatedProfile = {
    display: 'Katherine Johnson',
    given_name: 'Katherine',
    avatar_url: 'https://cdn.example.com/katherine.png',
    user_email: 'katherine@example.com',
  };
  const initializeCalls = [];
  const exchangePayloads = [];
  const requestedPaths = [];
  let nonceCounter = 0;

  function createResponse(status, payload) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: function json() {
        return Promise.resolve(payload || {});
      },
    };
  }

  global.location = { origin: 'http://fallback-origin.test' };
  installStorageStub();
  global.google = {
    accounts: {
      id: {
        initialize(config) {
          initializeCalls.push(config);
        },
        renderButton() {},
        prompt() {},
      },
    },
  };
  global.fetch = function fetch(url, init) {
    const pathname = new URL(String(url), 'http://fallback-origin.test').pathname;
    requestedPaths.push(pathname);
    if (pathname === '/auth/nonce') {
      nonceCounter += 1;
      return Promise.resolve(
        createResponse(200, { nonce: 'nonce-token-' + String(nonceCounter) }),
      );
    }
    if (pathname === '/auth/google') {
      exchangePayloads.push(JSON.parse(init.body));
      return Promise.resolve(createResponse(200, authenticatedProfile));
    }
    return Promise.reject(new Error('unexpected fetch URL: ' + String(url)));
  };

  const hostElement = attachHostApi(new global.HTMLElement(), new Map());
  const authController = library.createAuthHeader(hostElement, {
    googleClientId: 'nonce-stability-client',
    tauthUrl: 'http://localhost:8080',
    tauthLoginPath: '/auth/google',
    tauthLogoutPath: '/auth/logout',
    tauthNoncePath: '/auth/nonce',
    tenantId: 'tenant-alpha',
  });

  await flushAsync();
  await flushAsync();

  assert.equal(initializeCalls.length, 0, 'GIS does not initialize during bootstrap');
  assert.deepEqual(requestedPaths, [], 'bootstrap does not issue background nonce requests');

  await authController.startGoogleSignIn();
  await flushAsync();

  assert.equal(initializeCalls.length, 1, 'explicit sign-in attempt initializes GIS once');
  assert.equal(initializeCalls[0].client_id, 'nonce-stability-client');
  assert.equal(
    initializeCalls[0].nonce,
    'nonce-token-1',
    'GIS initialization receives the TAuth nonce for the sign-in attempt',
  );

  await initializeCalls[0].callback({
    credential: 'signed-google-id-token',
  });

  assert.deepEqual(
    requestedPaths,
    ['/auth/nonce', '/auth/google'],
    'sign-in attempt requests one TAuth nonce before credential exchange',
  );
  assert.deepEqual(
    exchangePayloads,
    [
      {
        google_id_token: 'signed-google-id-token',
        nonce_token: 'nonce-token-1',
      },
    ],
    'credential exchange pairs the Google token with a freshly issued TAuth nonce',
  );
  assert.equal(nonceCounter, 1, 'credential exchange requests exactly one nonce');
  assert.equal(initializeCalls.length, 1, 'credential exchange does not reinitialize GIS');
  assert.deepEqual(authController.state.profile, authenticatedProfile);
});

test('createAuthHeader keeps GIS stable after four idle hours on the landing page', async () => {
  resetEnvironment();
  delete global.initAuthClient;
  delete global.getCurrentUser;
  delete global.requestNonce;
  delete global.exchangeGoogleCredential;
  const library = loadLibrary();
  const authenticatedProfile = { user_email: 'ada@example.com' };
  const initializeCalls = [];
  const exchangePayloads = [];
  const requestedPaths = [];
  const scheduledTimers = new Map();
  let currentTimeMilliseconds = 1_000_000;
  let nonceCounter = 0;
  let nextTimerId = 1;
  const originalDateNow = Date.now;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  Date.now = function now() {
    return currentTimeMilliseconds;
  };
  global.setTimeout = function setTimeoutStub(callback, delayMilliseconds) {
    const durationMilliseconds = Number(delayMilliseconds) || 0;
    if (durationMilliseconds > 1_000) {
      const timerId = { id: nextTimerId };
      nextTimerId += 1;
      scheduledTimers.set(timerId, {
        callback,
        durationMilliseconds,
      });
      return timerId;
    }
    return originalSetTimeout(callback, durationMilliseconds);
  };
  global.clearTimeout = function clearTimeoutStub(timerId) {
    if (scheduledTimers.delete(timerId)) {
      return;
    }
    originalClearTimeout(timerId);
  };

  function createResponse(status, payload) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: function json() {
        return Promise.resolve(payload || {});
      },
    };
  }

  try {
    global.window = createWindowEventTargetStub();
    global.location = { origin: 'http://fallback-origin.test' };
    installStorageStub();
    global.google = {
      accounts: {
        id: {
          initialize(config) {
            initializeCalls.push(config);
          },
          renderButton() {},
          prompt() {},
        },
      },
    };
    global.fetch = function fetch(url, init) {
      const pathname = new URL(String(url), 'http://fallback-origin.test').pathname;
      requestedPaths.push(pathname);
      if (pathname === '/auth/nonce') {
        nonceCounter += 1;
        return Promise.resolve(
          createResponse(200, { nonce: 'nonce-token-' + String(nonceCounter) }),
        );
      }
      if (pathname === '/auth/google') {
        exchangePayloads.push(JSON.parse(init.body));
        return Promise.resolve(createResponse(200, authenticatedProfile));
      }
      return Promise.reject(new Error('unexpected fetch URL: ' + String(url)));
    };

    const hostElement = attachHostApi(new global.HTMLElement(), new Map());
    const authController = library.createAuthHeader(hostElement, {
      googleClientId: 'long-lived-tab-client',
      tauthUrl: 'http://localhost:8080',
      tauthLoginPath: '/auth/google',
      tauthLogoutPath: '/auth/logout',
      tauthNoncePath: '/auth/nonce',
      tenantId: 'tenant-alpha',
    });

    await flushAsync();
    await flushAsync();

    assert.equal(initializeCalls.length, 0, 'GIS does not initialize at page load');
    assert.equal(scheduledTimers.size, 0, 'page load does not schedule nonce refresh timers');
    assert.deepEqual(requestedPaths, [], 'page load does not request nonce or session endpoints');

    currentTimeMilliseconds += 4 * 60 * 60 * 1000;
    global.window.dispatchEvent({ type: 'focus' });
    global.document.hidden = false;
    global.document.dispatchEvent({ type: 'visibilitychange' });
    await flushAsync();
    await flushAsync();

    assert.equal(initializeCalls.length, 0, 'idle focus does not initialize GIS');
    assert.equal(scheduledTimers.size, 0, 'idle focus does not schedule nonce refresh timers');
    assert.deepEqual(requestedPaths, [], 'idle focus does not issue background nonce requests');

    await authController.startGoogleSignIn();
    await flushAsync();
    assert.equal(initializeCalls.length, 1, 'post-idle sign-in initializes GIS once');
    assert.equal(initializeCalls[0].nonce, 'nonce-token-1');

    await initializeCalls[0].callback({ credential: 'post-idle-google-token' });

    assert.deepEqual(
      requestedPaths,
      ['/auth/nonce', '/auth/google'],
      'post-idle sign-in requests nonce only for the explicit attempt',
    );
    assert.deepEqual(
      exchangePayloads,
      [{ google_id_token: 'post-idle-google-token', nonce_token: 'nonce-token-1' }],
    );
    assert.equal(initializeCalls.length, 1, 'post-idle sign-in does not reinitialize GIS');
    assert.deepEqual(authController.state.profile, authenticatedProfile);
  } finally {
    Date.now = originalDateNow;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

test('createAuthHeader rejects credential callbacks without an attempt nonce', async () => {
  resetEnvironment();
  delete global.initAuthClient;
  delete global.getCurrentUser;
  delete global.requestNonce;
  delete global.exchangeGoogleCredential;
  const library = loadLibrary();
  const initializeCalls = [];
  const requestedPaths = [];

  global.location = { origin: 'http://fallback-origin.test' };
  installStorageStub();
  global.google = {
    accounts: {
      id: {
        initialize(config) {
          initializeCalls.push(config);
        },
        renderButton() {},
        prompt() {},
      },
    },
  };
  global.fetch = function fetch(url) {
    const pathname = new URL(String(url), 'http://fallback-origin.test').pathname;
    requestedPaths.push(pathname);
    return Promise.reject(new Error('unexpected fetch URL: ' + String(url)));
  };

  const hostElement = attachHostApi(new global.HTMLElement(), new Map());
  const authController = library.createAuthHeader(hostElement, {
    googleClientId: 'expired-nonce-client',
    tauthUrl: 'http://localhost:8080',
    tauthLoginPath: '/auth/google',
    tauthLogoutPath: '/auth/logout',
    tauthNoncePath: '/auth/nonce',
    tenantId: 'tenant-alpha',
  });

  await flushAsync();
  await flushAsync();

  await authController.handleCredential({ credential: 'legacy-google-id-token' });
  await flushAsync();

  const errorEvents = hostElement.__dispatchedEvents.filter(
    (eventEntry) => eventEntry.type === 'mpr-ui:auth:error',
  );
  assert.equal(initializeCalls.length, 0, 'missing nonce handling does not initialize GIS');
  assert.deepEqual(requestedPaths, [], 'missing nonce handling does not call exchange endpoints');
  assert.equal(errorEvents.length, 1, 'missing nonce handling emits a visible auth error event');
  assert.equal(errorEvents[0].detail.code, 'mpr-ui.auth.missing_nonce');
  assert.equal(authController.state.status, 'unauthenticated');
});

test('createAuthHeader skips fallback profile probes for fresh anonymous config-first bootstrap', async () => {
  resetEnvironment();
  delete global.initAuthClient;
  delete global.getCurrentUser;
  delete global.requestNonce;
  delete global.exchangeGoogleCredential;
  const library = loadLibrary();
  const requestedPaths = [];

  global.location = { origin: 'http://fallback-origin.test' };
  installStorageStub();
  global.google = {
    accounts: {
      id: {
        initialize() {},
        renderButton() {},
        prompt() {},
      },
    },
  };
  global.fetch = function fetch(url) {
    const pathname = new URL(String(url), 'http://fallback-origin.test').pathname;
    requestedPaths.push(pathname);
    return Promise.reject(new Error('unexpected fetch URL: ' + String(url)));
  };

  const hostElement = attachHostApi(new global.HTMLElement(), new Map());
  const authController = library.createAuthHeader(hostElement, {
    googleClientId: 'anonymous-bootstrap-client',
    tauthUrl: 'http://localhost:8080',
    tauthLoginPath: '/auth/google',
    tauthLogoutPath: '/auth/logout',
    tauthNoncePath: '/auth/nonce',
    tenantId: 'tenant-alpha',
  });

  await flushAsync();
  await flushAsync();
  await flushAsync();

  assert.equal(authController.state.status, 'unauthenticated');
  assert.deepEqual(requestedPaths, [], 'fresh anonymous bootstrap performs no auth probes');
});

test('createAuthHeader restores the fallback profile from the TAuth session endpoint', async () => {
  resetEnvironment();
  delete global.initAuthClient;
  delete global.getCurrentUser;
  delete global.requestNonce;
  delete global.exchangeGoogleCredential;
  const library = loadLibrary();
  const requestedPaths = [];
  const restoreHintKey = 'tauth.restore.v1:http%3A%2F%2Flocalhost%3A8080:tenant-alpha';
  const profile = {
    user_id: 'U6fYpCTyBv0qcDKw9d0o2g',
    display: 'Grace Hopper',
    given_name: 'Grace',
    avatar_url: 'https://cdn.example.com/grace.png',
    user_email: 'grace@example.com',
  };

  function createResponse(status, payload) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: function json() {
        return Promise.resolve(payload || {});
      },
    };
  }

  global.location = { origin: 'http://fallback-origin.test' };
  installStorageStub({ [restoreHintKey]: '1' });
  global.google = {
    accounts: {
      id: {
        initialize() {},
        renderButton() {},
        prompt() {},
      },
    },
  };
  global.fetch = function fetch(url) {
    const pathname = new URL(String(url), 'http://fallback-origin.test').pathname;
    requestedPaths.push(pathname);
    if (pathname === '/auth/session') {
      return Promise.resolve(createResponse(200, profile));
    }
    return Promise.reject(new Error('unexpected fetch URL: ' + String(url)));
  };

  const hostElement = attachHostApi(new global.HTMLElement(), new Map());
  const authController = library.createAuthHeader(hostElement, {
    googleClientId: 'hinted-bootstrap-client',
    tauthUrl: 'http://localhost:8080',
    tauthLoginPath: '/auth/google',
    tauthLogoutPath: '/auth/logout',
    tauthNoncePath: '/auth/nonce',
    tenantId: 'tenant-alpha',
  });

  await flushAsync();
  await flushAsync();
  await flushAsync();

  assert.equal(requestedPaths.includes('/auth/session'), true, 'restore hint probes /auth/session');
  assert.equal(requestedPaths.includes('/me'), false, 'restore hint does not probe /me');
  assert.equal(
    requestedPaths.includes('/auth/refresh'),
    false,
    'successful profile restore does not call the refresh endpoint',
  );
  assert.deepEqual(authController.state.profile, profile);
  assert.equal(authController.state.status, 'authenticated');
  assert.equal(
    hostElement.getAttribute('data-user-id'),
    profile.user_id,
    'opaque account IDs are reflected without provider-prefix parsing',
  );
  const authenticatedEvents = hostElement.__dispatchedEvents.filter(
    (eventEntry) => eventEntry.type === 'mpr-ui:auth:authenticated',
  );
  assert.equal(
    authenticatedEvents.length,
    1,
    'restored opaque account profile emits one authenticated event',
  );
  assert.deepEqual(
    authenticatedEvents[0].detail,
    { profile },
    'authenticated event preserves the opaque account profile payload',
  );
});

test('createAuthHeader clears a stale TAuth restore hint from an anonymous session status', async () => {
  resetEnvironment();
  delete global.initAuthClient;
  delete global.getCurrentUser;
  delete global.requestNonce;
  delete global.exchangeGoogleCredential;
  const library = loadLibrary();
  const requestedPaths = [];
  const restoreHintKey = 'tauth.restore.v1:http%3A%2F%2Flocalhost%3A8080:tenant-alpha';

  function createResponse(status, payload) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: function json() {
        return Promise.resolve(payload || {});
      },
    };
  }

  global.location = { origin: 'http://fallback-origin.test' };
  const storage = installStorageStub({ [restoreHintKey]: '1' });
  global.google = {
    accounts: {
      id: {
        initialize() {},
        renderButton() {},
        prompt() {},
      },
    },
  };
  global.fetch = function fetch(url) {
    const pathname = new URL(String(url), 'http://fallback-origin.test').pathname;
    requestedPaths.push(pathname);
    if (pathname === '/auth/session') {
      return Promise.resolve(createResponse(204));
    }
    return Promise.reject(new Error('unexpected fetch URL: ' + String(url)));
  };

  const hostElement = attachHostApi(new global.HTMLElement(), new Map());
  const authController = library.createAuthHeader(hostElement, {
    googleClientId: 'stale-hint-bootstrap-client',
    tauthUrl: 'http://localhost:8080',
    tauthLoginPath: '/auth/google',
    tauthLogoutPath: '/auth/logout',
    tauthNoncePath: '/auth/nonce',
    tenantId: 'tenant-alpha',
  });

  await flushAsync();
  await flushAsync();
  await flushAsync();

  assert.equal(requestedPaths.includes('/auth/session'), true, 'restore hint probes /auth/session');
  assert.equal(requestedPaths.includes('/me'), false, 'restore hint does not probe /me');
  assert.equal(
    requestedPaths.includes('/auth/refresh'),
    false,
    'anonymous session status does not call the refresh endpoint',
  );
  assert.equal(authController.state.status, 'unauthenticated');
  assert.equal(
    storage.getItem(restoreHintKey),
    null,
    'stale restore hint is cleared after confirmed unauthenticated fallback',
  );
});

test('createAuthHeader rejects tenant changes after initialization', async () => {
  resetEnvironment();
  const library = loadLibrary();
  global.location = { origin: 'http://fallback-origin.test' };
  global.google = {
    accounts: {
      id: {
        renderButton() {},
        initialize() {},
        prompt() {},
      },
    },
  };
  global.initAuthClient = function initAuthClient() {
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(null);
  };

  const hostElement = attachHostApi(new global.HTMLElement(), new Map());
  const authController = library.createAuthHeader(hostElement, {
    googleClientId: 'tenant-lock-client',
    tauthUrl: 'http://localhost:8080',
    tauthLoginPath: '/auth/login',
    tauthLogoutPath: '/auth/logout',
    tauthNoncePath: '/auth/nonce',
    tenantId: 'tenant-alpha',
  });

  await flushAsync();
  await flushAsync();

  assert.throws(
    function rejectTenantChange() {
      authController.updateOptions(
        Object.assign({}, authController.state.options, {
          tenantId: 'tenant-beta',
        }),
      );
    },
    function verifyTenantChangeError(error) {
      assert.equal(error.code, 'mpr-ui.auth.tenant_id_change_unsupported');
      assert.match(
        error.message,
        /Tenant ID cannot change after auth controller initialization/,
      );
      assert.match(error.message, /tenant-alpha/);
      assert.match(error.message, /tenant-beta/);
      return true;
    },
  );
  assert.equal(
    authController.state.options.tenantId,
    'tenant-alpha',
    'controller retains the initialized tenant after rejecting a change',
  );
});

test('createAuthHeader ignores stale GIS callbacks after tauth-url change', async () => {
  resetEnvironment();
  const library = loadLibrary();
  const authenticatedProfile = {
    display: 'Mary Jackson',
    given_name: 'Mary',
    avatar_url: 'https://cdn.example.com/mary.png',
    user_email: 'mary@example.com',
  };
  const initializeCalls = [];
  const exchangeTenantCalls = [];
  let currentTenantId = null;
  let nonceCounter = 0;
  global.location = { origin: 'http://fallback-origin.test' };
  global.google = {
    accounts: {
      id: {
        initialize(config) {
          initializeCalls.push(config);
        },
        renderButton() {},
        prompt() {},
      },
    },
  };
  global.initAuthClient = function initAuthClient() {
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(null);
  };
  global.fetch = function fetch() {
    nonceCounter += 1;
    return Promise.resolve({
      ok: true,
      json: function json() {
        return Promise.resolve({ nonce: 'nonce-token-' + String(nonceCounter) });
      },
    });
  };
  global.setAuthTenantId = function setAuthTenantId(tenantId) {
    currentTenantId = tenantId;
  };
  global.exchangeGoogleCredential = function exchangeGoogleCredential() {
    exchangeTenantCalls.push(currentTenantId);
    return Promise.resolve(authenticatedProfile);
  };

  const hostElement = attachHostApi(new global.HTMLElement(), new Map());
  const authController = library.createAuthHeader(hostElement, {
    googleClientId: 'gis-race-client',
    tauthUrl: 'http://localhost:8080',
    tauthLoginPath: '/auth/login',
    tauthLogoutPath: '/auth/logout',
    tauthNoncePath: '/auth/nonce',
    tenantId: 'tenant-alpha',
  });

  await flushAsync();
  await flushAsync();

  await authController.startGoogleSignIn();
  await flushAsync();
  assert.ok(initializeCalls.length >= 1, 'initial GIS callback registered');
  const staleCallback = initializeCalls[0].callback;

  authController.updateOptions(
    Object.assign({}, authController.state.options, {
      tauthUrl: 'http://localhost:9090',
    }),
  );
  await flushAsync();
  await flushAsync();

  await authController.startGoogleSignIn();
  await flushAsync();
  assert.ok(initializeCalls.length >= 2, 'updated GIS callback registered after auth options change');
  const currentCallback = initializeCalls[initializeCalls.length - 1].callback;

  staleCallback({ credential: 'stale-google-token' });
  await flushAsync();
  await flushAsync();

  assert.deepEqual(
    exchangeTenantCalls,
    [],
    'stale GIS callbacks do not start credential exchange after auth options change',
  );
  assert.equal(
    authController.state.profile,
    null,
    'stale GIS callbacks do not authenticate the controller',
  );

  currentCallback({ credential: 'fresh-google-token' });
  await flushAsync();
  await flushAsync();

  assert.deepEqual(
    exchangeTenantCalls,
    ['tenant-alpha'],
    'current GIS callback exchanges credentials against the initialized tenant configuration',
  );
  assert.deepEqual(
    authController.state.profile,
    authenticatedProfile,
    'current GIS callback still authenticates the controller after auth options change',
  );
  assert.equal(
    authController.state.options.tauthUrl,
    'http://localhost:9090',
    'controller keeps the updated tauth-url after the supported rebind',
  );
});

test('MU-432: mpr-header recovers authenticated state from the current session on first render', async () => {
  resetEnvironment();
  const recoveredProfile = {
    display: 'Ada Lovelace',
    given_name: 'Ada',
    avatar_url: 'https://cdn.example.com/avatar.png',
    user_email: 'ada@example.com',
  };
  global.google = {
    accounts: {
      id: {
        renderButton() {},
        initialize() {},
        prompt() {},
      },
    },
  };
  global.initAuthClient = function initAuthClient() {
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(recoveredProfile);
  };
  global.setAuthTenantId = function setAuthTenantId() {};

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
  await flushAsync();

  const controller = headerElement.__headerController;
  assert.ok(controller, 'header controller initialized');
  const authController =
    controller && typeof controller.getAuthController === 'function'
      ? controller.getAuthController()
      : null;
  assert.ok(authController, 'auth controller attached to header');
  assert.deepEqual(
    authController.state.profile,
    recoveredProfile,
    'auth controller state recovers the current profile',
  );
  assert.equal(
    harness.root.classList.contains('mpr-header--authenticated'),
    true,
    'header root switches into the authenticated state after session recovery',
  );

  const authenticatedEvents = headerElement.__dispatchedEvents.filter(
    (eventEntry) => eventEntry.type === 'mpr-ui:auth:authenticated',
  );
  assert.equal(
    authenticatedEvents.length,
    1,
    'header emits exactly one authenticated event for recovered sessions',
  );
  assert.deepEqual(
    authenticatedEvents[0].detail,
    { profile: recoveredProfile },
    'authenticated event includes the recovered profile payload',
  );
});

test('MU-432: mpr-header ignores a recovered profile after an unauthenticated callback', async () => {
  resetEnvironment();
  const staleProfile = {
    display: 'Grace Hopper',
    given_name: 'Grace',
    avatar_url: 'https://cdn.example.com/grace.png',
    user_email: 'grace@example.com',
  };
  let authCallbacks = null;
  let currentUserCallCount = 0;
  let resolveRecoveredProfile;
  global.google = {
    accounts: {
      id: {
        renderButton() {},
        initialize() {},
        prompt() {},
      },
    },
  };
  global.initAuthClient = function initAuthClient(config) {
    authCallbacks = config;
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    currentUserCallCount += 1;
    return new Promise(function waitForProfile(resolve) {
      resolveRecoveredProfile = resolve;
    });
  };
  global.setAuthTenantId = function setAuthTenantId() {};

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

  assert.ok(authCallbacks, 'auth callbacks registered with initAuthClient');
  assert.equal(
    currentUserCallCount,
    1,
    'bootstrap requested the current user before any auth callback resolved',
  );

  authCallbacks.onUnauthenticated();
  resolveRecoveredProfile(staleProfile);
  await flushAsync();
  await flushAsync();

  const controller = headerElement.__headerController;
  assert.ok(controller, 'header controller initialized');
  const authController =
    controller && typeof controller.getAuthController === 'function'
      ? controller.getAuthController()
      : null;
  assert.ok(authController, 'auth controller attached to header');
  assert.equal(
    authController.state.profile,
    null,
    'stale profile recovery does not overwrite an unauthenticated callback',
  );
  assert.equal(
    harness.root.classList.contains('mpr-header--authenticated'),
    false,
    'header root stays unauthenticated after the auth watcher reports sign-out',
  );

  const authenticatedEvents = headerElement.__dispatchedEvents.filter(
    (eventEntry) => eventEntry.type === 'mpr-ui:auth:authenticated',
  );
  assert.equal(
    authenticatedEvents.length,
    0,
    'no authenticated event is emitted after an unauthenticated callback',
  );
});

test('MU-434: createAuthHeader reflects pending auth states on the host element', async () => {
  resetEnvironment();
  const library = loadLibrary();
  const authenticatedProfile = {
    display: 'Katherine Johnson',
    given_name: 'Katherine',
    avatar_url: 'https://cdn.example.com/katherine.png',
    user_email: 'katherine@example.com',
  };
  let resolveBootstrapInit;
  let resolveCredentialExchange;
  global.location = { origin: 'http://fallback-origin.test' };
  global.google = {
    accounts: {
      id: {
        renderButton() {},
        initialize() {},
        prompt() {},
      },
    },
  };
  global.initAuthClient = function initAuthClient() {
    return new Promise(function waitForBootstrap(resolve) {
      resolveBootstrapInit = resolve;
    });
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(null);
  };
  global.setAuthTenantId = function setAuthTenantId() {};
  global.exchangeGoogleCredential = function exchangeGoogleCredential() {
    return new Promise(function waitForExchange(resolve) {
      resolveCredentialExchange = resolve;
    });
  };

  const hostElement = attachHostApi(new global.HTMLElement(), new Map());
  const authController = library.createAuthHeader(hostElement, {
    googleClientId: 'transition-site',
    tauthUrl: 'http://localhost:8080',
    tauthLoginPath: '/auth/login',
    tauthLogoutPath: '/auth/logout',
    tauthNoncePath: '/auth/nonce',
    tenantId: 'tenant-transition',
  });

  assert.equal(
    authController.state.status,
    'bootstrapping',
    'controller starts in the bootstrapping state while initAuthClient is unresolved',
  );
  assert.equal(
    hostElement.getAttribute('data-mpr-auth-status'),
    'bootstrapping',
    'host element reflects the bootstrapping status',
  );

  resolveBootstrapInit();
  await flushAsync();
  await flushAsync();

  assert.equal(
    authController.state.status,
    'unauthenticated',
    'controller settles to unauthenticated after bootstrap resolves without a session',
  );
  assert.equal(
    hostElement.getAttribute('data-mpr-auth-status'),
    'unauthenticated',
    'host element reflects the settled unauthenticated status',
  );

  const exchangePromise = authController.handleCredential({
    credential: 'signed-id-token',
  }, 'transition-nonce');
  await flushAsync();

  assert.equal(
    authController.state.status,
    'authenticating',
    'controller enters authenticating while the credential exchange is in flight',
  );
  assert.equal(
    hostElement.getAttribute('data-mpr-auth-status'),
    'authenticating',
    'host element reflects the authenticating status',
  );

  resolveCredentialExchange(authenticatedProfile);
  await exchangePromise;
  await flushAsync();

  assert.equal(
    authController.state.status,
    'authenticated',
    'controller settles to authenticated after the credential exchange succeeds',
  );
  assert.equal(
    hostElement.getAttribute('data-mpr-auth-status'),
    'authenticated',
    'host element reflects the authenticated status',
  );
});

test('MPRUI.testing drives mounted header auth state through the auth controller', async () => {
  resetEnvironment();
  const authenticatedProfile = {
    display: 'Hedy Lamarr',
    given_name: 'Hedy',
    avatar_url: 'https://cdn.example.com/hedy.png',
    user_email: 'hedy@example.com',
  };
  global.location = { origin: 'http://fallback-origin.test' };
  global.google = {
    accounts: {
      id: {
        renderButton() {},
        initialize() {},
        prompt() {},
      },
    },
  };
  global.initAuthClient = function initAuthClient() {
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(null);
  };

  const library = loadLibrary();
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;
  headerElement.setAttribute('google-site-id', 'testing-client');
  headerElement.setAttribute('tauth-login-path', '/auth/google');
  headerElement.setAttribute('tauth-logout-path', '/auth/logout');
  headerElement.setAttribute('tauth-nonce-path', '/auth/nonce');
  headerElement.setAttribute('tauth-tenant-id', 'tenant-testing');

  headerElement.connectedCallback();
  await flushAsync();
  await flushAsync();

  const authenticatedState = library.testing.authenticate(
    headerElement,
    authenticatedProfile,
  );
  assert.equal(authenticatedState.status, 'authenticated');
  assert.deepEqual(authenticatedState.profile, authenticatedProfile);
  assert.equal(headerElement.getAttribute('data-mpr-auth-status'), 'authenticated');
  assert.equal(
    harness.root.classList.contains('mpr-header--authenticated'),
    true,
    'testing authenticate refreshes the rendered header state',
  );

  const authenticatedEvents = headerElement.__dispatchedEvents.filter(
    (eventEntry) => eventEntry.type === 'mpr-ui:auth:authenticated',
  );
  assert.equal(
    authenticatedEvents.length,
    1,
    'testing authenticate emits the same authenticated event as normal auth',
  );

  const unauthenticatedState = library.testing.unauthenticate(headerElement);
  assert.equal(unauthenticatedState.status, 'unauthenticated');
  assert.equal(unauthenticatedState.profile, null);
  assert.equal(
    headerElement.getAttribute('data-mpr-auth-status'),
    'unauthenticated',
  );
});

test('MPRUI.testing rejects invalid auth test calls before mutating state', async () => {
  resetEnvironment();
  const library = loadLibrary();
  assert.throws(
    function rejectMissingHost() {
      library.testing.authenticate(null, { user_email: 'test@example.com' });
    },
    function verifyMissingHost(error) {
      assert.equal(error.code, 'mpr-ui.testing.auth_host_required');
      return true;
    },
  );

  const hostElement = attachHostApi(new global.HTMLElement(), new Map());
  assert.throws(
    function rejectMissingController() {
      library.testing.authenticate(hostElement, {
        user_email: 'test@example.com',
      });
    },
    function verifyMissingController(error) {
      assert.equal(error.code, 'mpr-ui.testing.auth_controller_missing');
      return true;
    },
  );

  const authController = library.createAuthHeader(hostElement, {
    googleClientId: 'testing-client',
    tauthUrl: 'http://localhost:8080',
    tauthLoginPath: '/auth/google',
    tauthLogoutPath: '/auth/logout',
    tauthNoncePath: '/auth/nonce',
    tenantId: 'tenant-testing',
  });

  assert.throws(
    function rejectMissingProfile() {
      library.testing.authenticate(authController, null);
    },
    function verifyMissingProfile(error) {
      assert.equal(error.code, 'mpr-ui.testing.auth_profile_required');
      return true;
    },
  );
  assert.equal(authController.state.status, 'bootstrapping');
});

test('MPRUI.testing exposes Google Identity driver helpers for integration stubs', () => {
  resetEnvironment();
  let autoCredentialEnabled = false;
  const library = loadLibrary();

  assert.equal(library.testing.googleIdentity.isDriverAvailable(), false);
  assert.throws(
    function rejectMissingDriver() {
      library.testing.googleIdentity.enableAutoCredentialOnClick();
    },
    function verifyMissingDriver(error) {
      assert.equal(error.code, 'mpr-ui.testing.google_identity_driver_missing');
      return true;
    },
  );

  global.google = {
    accounts: {
      id: {
        __mprUiTesting: {
          isInitialized: function isInitialized() {
            return false;
          },
          enableAutoCredentialOnClick: function enableAutoCredentialOnClick() {
            autoCredentialEnabled = true;
          },
        },
      },
    },
  };

  assert.equal(library.testing.googleIdentity.isDriverAvailable(), true);
  assert.equal(library.testing.googleIdentity.isInitialized(), false);
  library.testing.googleIdentity.enableAutoCredentialOnClick();
  assert.equal(autoCredentialEnabled, true);

  autoCredentialEnabled = false;
  global.google.accounts.id.__mprUiTesting = {
    isInitialized: function isInitialized() {
      return true;
    },
    getInitializedNonce: function getInitializedNonce() {
      return 'testing-nonce';
    },
    getInitializeCallCount: function getInitializeCallCount() {
      return 2;
    },
    enableAutoCredentialOnClick: function enableAutoCredentialOnClick() {
      autoCredentialEnabled = true;
    },
  };

  assert.equal(library.testing.googleIdentity.isInitialized(), true);
  assert.equal(library.testing.googleIdentity.getInitializedNonce(), 'testing-nonce');
  assert.equal(library.testing.googleIdentity.getInitializeCallCount(), 2);
  library.testing.googleIdentity.enableAutoCredentialOnClick();
  assert.equal(autoCredentialEnabled, true);
});

test('MU-434: mpr-header holds the auth transition screen until the configured app-ready event arrives', async () => {
  resetEnvironment();
  const authenticatedProfile = {
    display: 'Annie Easley',
    given_name: 'Annie',
    avatar_url: 'https://cdn.example.com/annie.png',
    user_email: 'annie@example.com',
  };
  let resolveCredentialExchange;
  global.location = { origin: 'http://fallback-origin.test' };
  global.google = {
    accounts: {
      id: {
        renderButton() {},
        initialize() {},
        prompt() {},
      },
    },
  };
  global.initAuthClient = function initAuthClient() {
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(null);
  };
  global.setAuthTenantId = function setAuthTenantId() {};
  global.exchangeGoogleCredential = function exchangeGoogleCredential() {
    return new Promise(function waitForExchange(resolve) {
      resolveCredentialExchange = resolve;
    });
  };

  loadLibrary();
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;
  headerElement.setAttribute('google-site-id', 'transition-site');
  headerElement.setAttribute('tauth-url', 'http://localhost:8080');
  headerElement.setAttribute('tauth-login-path', '/auth/google');
  headerElement.setAttribute('tauth-logout-path', '/auth/logout');
  headerElement.setAttribute('tauth-nonce-path', '/auth/nonce');
  headerElement.setAttribute('tauth-tenant-id', 'tenant-transition');
  headerElement.setAttribute(
    'auth-transition',
    JSON.stringify({
      title: 'Opening workspace',
      message: 'Loading your authenticated app surface.',
      completionEvent: 'demo:app-ready',
    }),
  );

  headerElement.connectedCallback();
  await flushAsync();
  await flushAsync();

  const controller = headerElement.__headerController;
  assert.ok(controller, 'header controller initialized');
  const authController =
    controller && typeof controller.getAuthController === 'function'
      ? controller.getAuthController()
      : null;
  assert.ok(authController, 'auth controller attached to the header');

  const exchangePromise = authController.handleCredential({
    credential: 'signed-id-token',
  }, 'transition-nonce');
  await flushAsync();

  resolveCredentialExchange(authenticatedProfile);
  await exchangePromise;
  await flushAsync();
  await flushAsync();

  assert.equal(
    harness.authTransitionTitle.textContent,
    'Opening workspace',
    'transition screen renders the configured title',
  );
  assert.equal(
    harness.authTransitionMessage.textContent,
    'Loading your authenticated app surface.',
    'transition screen renders the configured message',
  );
  assert.equal(
    harness.authTransition.getAttribute('data-mpr-visible'),
    'true',
    'transition screen stays visible after authentication while the app-ready event has not fired',
  );
  assert.equal(
    harness.root.classList.contains('mpr-header--auth-transition-active'),
    true,
    'header root enters the auth-transition-active state while waiting for the app-ready event',
  );

  global.document.dispatchEvent(
    new global.CustomEvent('demo:app-ready', { detail: { source: 'test' } }),
  );
  await flushAsync();

  assert.equal(
    harness.authTransition.getAttribute('data-mpr-visible'),
    'false',
    'transition screen hides after the configured app-ready event fires',
  );
  assert.equal(
    harness.root.classList.contains('mpr-header--auth-transition-active'),
    false,
    'header root clears the auth-transition-active state after the app-ready event',
  );

  headerElement.setAttribute('brand-label', 'Workspace');
  await flushAsync();

  assert.equal(
    harness.authTransition.getAttribute('data-mpr-visible'),
    'false',
    'transition screen stays hidden after ordinary header updates once the completion event already fired',
  );
  assert.equal(
    harness.root.classList.contains('mpr-header--auth-transition-active'),
    false,
    'header root stays out of the auth-transition-active state after ordinary header updates',
  );
});

test('mpr-header redirects after sign-in and holds the auth transition while navigation is pending', async () => {
  resetEnvironment();
  const authenticatedProfile = {
    display: 'Mary Jackson',
    given_name: 'Mary',
    avatar_url: 'https://cdn.example.com/mary.png',
    user_email: 'mary@example.com',
  };
  let resolveCredentialExchange;
  const locationCalls = [];
  global.location = {
    origin: 'http://fallback-origin.test',
    assign: function assign(url) {
      locationCalls.push(url);
    },
  };
  global.google = {
    accounts: {
      id: {
        renderButton() {},
        initialize() {},
        prompt() {},
      },
    },
  };
  global.initAuthClient = function initAuthClient() {
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(null);
  };
  global.setAuthTenantId = function setAuthTenantId() {};
  global.exchangeGoogleCredential = function exchangeGoogleCredential() {
    return new Promise(function waitForExchange(resolve) {
      resolveCredentialExchange = resolve;
    });
  };

  loadLibrary();
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;
  headerElement.setAttribute('google-site-id', 'redirect-site');
  headerElement.setAttribute('tauth-url', 'http://localhost:8080');
  headerElement.setAttribute('tauth-login-path', '/auth/google');
  headerElement.setAttribute('tauth-logout-path', '/auth/logout');
  headerElement.setAttribute('tauth-nonce-path', '/auth/nonce');
  headerElement.setAttribute('tauth-tenant-id', 'tenant-redirect');
  headerElement.setAttribute('sign-in-redirect-url', '/app');
  headerElement.setAttribute(
    'auth-transition',
    JSON.stringify({
      title: 'Opening workspace',
      message: 'Preparing your authenticated workspace.',
    }),
  );

  headerElement.connectedCallback();
  await flushAsync();
  await flushAsync();

  const controller = headerElement.__headerController;
  assert.ok(controller, 'header controller initialized');
  const authController =
    controller && typeof controller.getAuthController === 'function'
      ? controller.getAuthController()
      : null;
  assert.ok(authController, 'auth controller attached to the header');

  const exchangePromise = authController.handleCredential({
    credential: 'signed-id-token',
  }, 'redirect-nonce');
  await flushAsync();

  assert.equal(
    harness.authTransition.getAttribute('data-mpr-visible'),
    'true',
    'transition screen appears while credential exchange is in flight',
  );

  resolveCredentialExchange(authenticatedProfile);
  await exchangePromise;
  await flushAsync();
  await flushAsync();

  assert.deepEqual(
    locationCalls,
    ['/app'],
    'mpr-ui redirects to the configured authenticated target after sign-in',
  );
  assert.equal(
    harness.authTransition.getAttribute('data-mpr-visible'),
    'true',
    'transition screen stays visible while the configured redirect is pending',
  );
  assert.equal(
    harness.root.classList.contains('mpr-header--auth-transition-active'),
    true,
    'header root remains in auth-transition-active state during redirect handoff',
  );
});

test('mpr-header does not redirect for app-dispatched auth events', async () => {
  resetEnvironment();
  const locationCalls = [];
  global.location = {
    origin: 'http://fallback-origin.test',
    assign: function assign(url) {
      locationCalls.push(url);
    },
  };
  global.google = {
    accounts: {
      id: {
        renderButton() {},
        initialize() {},
        prompt() {},
      },
    },
  };
  global.initAuthClient = function initAuthClient() {
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(null);
  };
  global.setAuthTenantId = function setAuthTenantId() {};

  loadLibrary();
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;
  headerElement.setAttribute('google-site-id', 'external-event-site');
  headerElement.setAttribute('tauth-url', 'http://localhost:8080');
  headerElement.setAttribute('tauth-login-path', '/auth/google');
  headerElement.setAttribute('tauth-logout-path', '/auth/logout');
  headerElement.setAttribute('tauth-nonce-path', '/auth/nonce');
  headerElement.setAttribute('tauth-tenant-id', 'tenant-external-event');
  headerElement.setAttribute('sign-in-redirect-url', '/app');
  headerElement.setAttribute(
    'auth-transition',
    JSON.stringify({
      title: 'Opening workspace',
      message: 'Preparing your authenticated workspace.',
    }),
  );

  headerElement.connectedCallback();
  await flushAsync();
  await flushAsync();

  headerElement.dispatchEvent(
    new global.CustomEvent('mpr-ui:auth:status-change', {
      detail: {
        status: 'authenticating',
        previousStatus: 'unauthenticated',
      },
    }),
  );
  headerElement.dispatchEvent(
    new global.CustomEvent('mpr-ui:auth:authenticated', {
      detail: { profile: { user_email: 'external@example.com' } },
    }),
  );
  await flushAsync();

  assert.deepEqual(
    locationCalls,
    [],
    'external app-owned auth events do not trigger the shared sign-in redirect',
  );
  assert.equal(
    harness.authTransition.getAttribute('data-mpr-visible'),
    'false',
    'transition screen remains controlled by the auth controller state',
  );
});

test('mpr-header does not apply sign-in redirect on restored authenticated sessions', async () => {
  resetEnvironment();
  const authenticatedProfile = {
    display: 'Dorothy Vaughan',
    given_name: 'Dorothy',
    avatar_url: 'https://cdn.example.com/dorothy.png',
    user_email: 'dorothy@example.com',
  };
  const locationCalls = [];
  global.location = {
    origin: 'http://fallback-origin.test',
    assign: function assign(url) {
      locationCalls.push(url);
    },
  };
  global.google = {
    accounts: {
      id: {
        renderButton() {},
        initialize() {},
        prompt() {},
      },
    },
  };
  global.initAuthClient = function initAuthClient() {
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(authenticatedProfile);
  };
  global.setAuthTenantId = function setAuthTenantId() {};

  loadLibrary();
  const harness = createHeaderElementHarness();
  const headerElement = harness.element;
  headerElement.setAttribute('google-site-id', 'restore-site');
  headerElement.setAttribute('tauth-url', 'http://localhost:8080');
  headerElement.setAttribute('tauth-login-path', '/auth/google');
  headerElement.setAttribute('tauth-logout-path', '/auth/logout');
  headerElement.setAttribute('tauth-nonce-path', '/auth/nonce');
  headerElement.setAttribute('tauth-tenant-id', 'tenant-restore');
  headerElement.setAttribute('sign-in-redirect-url', '/app');
  headerElement.setAttribute(
    'auth-transition',
    JSON.stringify({
      title: 'Opening workspace',
      message: 'Preparing your authenticated workspace.',
    }),
  );

  headerElement.connectedCallback();
  await flushAsync();
  await flushAsync();

  const controller = headerElement.__headerController;
  assert.ok(controller, 'header controller initialized');
  const authController =
    controller && typeof controller.getAuthController === 'function'
      ? controller.getAuthController()
      : null;
  assert.ok(authController, 'auth controller attached to the header');

  assert.equal(
    authController.state.status,
    'authenticated',
    'restored session reaches authenticated state',
  );
  assert.deepEqual(
    locationCalls,
    [],
    'mpr-ui leaves already-authenticated public pages in place',
  );
  assert.equal(
    harness.authTransition.getAttribute('data-mpr-visible'),
    'false',
    'transition screen hides when restored auth settles without a sign-in handoff',
  );
  assert.equal(
    harness.root.classList.contains('mpr-header--auth-transition-active'),
    false,
    'header root does not enter redirect handoff state for session restore',
  );
});

test('mpr-header rejects unsafe sign-in redirect URLs', () => {
  const rejectedRedirectUrls = [
    'javascript:alert(1)',
    'https://evil.example/app',
    '//evil.example/app',
    'mailto:user@example.com',
    'tel:+16502651193',
    '#app',
  ];

  rejectedRedirectUrls.forEach(function assertRejectedRedirect(signInRedirectUrl) {
    resetEnvironment();
    global.location = {
      origin: 'https://app.example.com',
      href: 'https://app.example.com/login',
    };
    loadLibrary();
    const harness = createHeaderElementHarness();
    const headerElement = harness.element;
    headerElement.setAttribute('sign-in-redirect-url', signInRedirectUrl);

    assert.throws(
      function connectHeader() {
        headerElement.connectedCallback();
      },
      { message: 'mpr-ui.header.invalid_sign_in_redirect_url' },
      signInRedirectUrl,
    );
  });
});

test('mpr-header accepts same-origin sign-in redirect URLs', () => {
  const acceptedRedirectUrls = [
    '/app',
    'dashboard',
    'https://app.example.com/app?workspace=main#ready',
  ];

  acceptedRedirectUrls.forEach(function assertAcceptedRedirect(signInRedirectUrl) {
    resetEnvironment();
    global.location = {
      origin: 'https://app.example.com',
      href: 'https://app.example.com/login',
    };
    loadLibrary();
    const harness = createHeaderElementHarness();
    const headerElement = harness.element;
    headerElement.setAttribute('sign-in-redirect-url', signInRedirectUrl);

    assert.doesNotThrow(function connectHeader() {
      headerElement.connectedCallback();
    }, signInRedirectUrl);
  });
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
  footerElement.setAttribute(
    'horizontal-links',
    JSON.stringify({
      alignment: 'left',
      links: [
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms', target: '_blank' },
      ],
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
  assert.deepEqual(
    controllerConfig && controllerConfig.horizontalLinks,
    {
      alignment: 'left',
      links: [
        {
          label: 'Privacy',
          href: '/privacy',
          url: '/privacy',
          target: '',
          rel: '',
        },
        {
          label: 'Terms',
          href: '/terms',
          url: '/terms',
          target: '_blank',
          rel: '',
        },
      ],
    },
    'horizontal-links parsed into controller config',
  );
  assert.match(
    harness.horizontalLinks.innerHTML,
    /<a href="\/privacy">Privacy<\/a>/,
    'footer horizontal links render anchor markup',
  );
  assert.match(
    harness.horizontalLinks.innerHTML,
    /<a href="\/terms" target="_blank" rel="noopener noreferrer">Terms<\/a>/,
    'footer horizontal links default rel for _blank',
  );
  assert.equal(
    harness.horizontalLinks.getAttribute('data-mpr-align'),
    'left',
    'footer horizontal links alignment reflected on the row container',
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

test('MU-372: mpr-footer mirrors base-class utilities onto the host for non-sticky layouts without dropping internal footer chrome classes', () => {
  resetEnvironment();
  loadLibrary();
  const harness = createFooterElementHarness();
  const footerElement = harness.element;

  footerElement.setAttribute('base-class', 'mpr-footer mt-auto footer-shell');
  footerElement.setAttribute('sticky', 'false');
  footerElement.setAttribute('size', 'small');
  footerElement.connectedCallback();

  assert.equal(
    footerElement.dataset.baseClass,
    'mpr-footer mt-auto footer-shell',
    'base-class attribute reflects onto the host dataset',
  );
  assert.equal(
    footerElement.classList.contains('mt-auto'),
    true,
    'host receives flex utility classes from base-class',
  );
  assert.equal(
    footerElement.classList.contains('footer-shell'),
    true,
    'host receives additional user classes from base-class',
  );
  assert.equal(
    harness.root.className,
    'mpr-footer mt-auto footer-shell mpr-footer--small',
    'internal footer root preserves chrome and size classes',
  );
});

test('MU-372 follow-up: sticky footers keep base-class utilities off the host element', () => {
  resetEnvironment();
  loadLibrary();
  const harness = createFooterElementHarness();
  const footerElement = harness.element;

  footerElement.setAttribute('base-class', 'mpr-footer mt-auto footer-shell');
  footerElement.connectedCallback();

  assert.equal(
    footerElement.classList.contains('mt-auto'),
    false,
    'sticky footer host does not receive layout utility classes from base-class',
  );
  assert.equal(
    footerElement.classList.contains('footer-shell'),
    false,
    'sticky footer host does not receive extra root styling classes from base-class',
  );
  assert.equal(
    harness.root.className,
    'mpr-footer mt-auto footer-shell',
    'rendered footer root still receives base-class styling',
  );
});

test('MU-372 follow-up: mpr-footer cleanup keeps caller-owned host classes when base-class changes', () => {
  resetEnvironment();
  loadLibrary();
  const harness = createFooterElementHarness();
  const footerElement = harness.element;

  footerElement.classList.add('footer-shell');
  footerElement.setAttribute('sticky', 'false');
  footerElement.setAttribute('base-class', 'mpr-footer footer-shell mt-auto');
  footerElement.connectedCallback();

  assert.equal(
    footerElement.classList.contains('footer-shell'),
    true,
    'pre-existing host class remains present after footer render',
  );
  assert.equal(
    footerElement.classList.contains('mt-auto'),
    true,
    'component-managed host utility class is applied during render',
  );

  footerElement.setAttribute('base-class', 'mpr-footer footer-shell');

  assert.equal(
    footerElement.classList.contains('footer-shell'),
    true,
    'caller-owned host class survives base-class updates',
  );
  assert.equal(
    footerElement.classList.contains('mt-auto'),
    false,
    'component-managed host class is removed when no longer requested',
  );

  footerElement.disconnectedCallback();

  assert.equal(
    footerElement.classList.contains('footer-shell'),
    true,
    'caller-owned host class survives footer teardown',
  );
});

test('MU-133: mpr-footer suppresses privacy link markup when privacy-link-hidden is true', () => {
  resetEnvironment();
  loadLibrary();
  const harness = createFooterElementHarness({ includeMenu: false });
  const footerElement = harness.element;
  footerElement.setAttribute('privacy-link-hidden', 'true');
  footerElement.setAttribute('privacy-modal-content', '<p>Policy</p>');

  footerElement.connectedCallback();

  const controllerConfig =
    footerElement.__footerController &&
    footerElement.__footerController.getConfig
      ? footerElement.__footerController.getConfig()
      : null;

  assert.ok(controllerConfig, 'controller config should be available');
  assert.equal(
    controllerConfig.privacyLinkHidden,
    true,
    'controller config records privacyLinkHidden',
  );
  assert.doesNotMatch(
    footerElement.innerHTML,
    /data-mpr-footer="privacy-link"/,
    'privacy link markup is omitted',
  );
  assert.doesNotMatch(
    footerElement.innerHTML,
    /data-mpr-footer="privacy-modal"/,
    'privacy modal markup is omitted when the privacy link is hidden',
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

test('mpr-auth-provider-chooser renders configured providers compactly in order', () => {
  resetEnvironment();
  loadLibrary();
  const { element } = createAuthProviderChooserHarness(['apple', 'google', 'email']);

  element.connectedCallback();

  assert.equal(
    element.getAttribute('data-mpr-auth-provider-layout'),
    'chooser',
    'three providers render as chooser layout',
  );
  assert.equal(
    element.getAttribute('data-mpr-auth-provider-email-expanded'),
    'false',
    'email form stays collapsed until the email provider is selected',
  );
  const providerButtons = findStubNodesByAttribute(element, 'data-mpr-auth-provider');
  assert.deepEqual(
    providerButtons.map(function providerId(button) {
      return button.getAttribute('data-mpr-auth-provider');
    }),
    ['apple', 'google', 'email'],
    'provider button order follows the explicit providers attribute',
  );
  assert.deepEqual(
    providerButtons.map(function providerLabel(button) {
      return button.getAttribute('aria-label');
    }),
    ['Continue with Apple', 'Continue with Google', 'Continue with email'],
    'provider buttons use compact continue labels',
  );
  assert.deepEqual(
    findStubNodesByAttribute(element, 'data-mpr-auth-provider-mark').map(
      function providerMark(mark) {
        return mark.getAttribute('data-mpr-auth-provider-mark');
      },
    ),
    ['apple', 'google', 'email'],
    'provider buttons include decorative provider marks',
  );
  assert.deepEqual(
    findStubNodesByAttribute(element, 'data-mpr-auth-provider-label').map(
      function providerLabel(label) {
        return label.textContent;
      },
    ),
    ['Continue with Apple', 'Continue with Google', 'Continue with email'],
    'provider labels remain visible text inside the button',
  );
  assert.equal(
    findStubNodesByAttribute(element, 'data-mpr-auth-provider-chooser', 'email-panel').length,
    0,
    'collapsed email form does not occupy the compact provider stack',
  );
});

test('mpr-auth-provider-chooser supports icon-row provider actions', () => {
  resetEnvironment();
  loadLibrary();
  const { element } = createAuthProviderChooserHarness(
    ['apple', 'google', 'email'],
    { variant: 'icon-row' },
  );

  element.connectedCallback();

  assert.equal(
    element.getAttribute('data-mpr-auth-provider-variant'),
    'icon-row',
    'icon-row variant is reflected on the host',
  );
  assert.equal(
    getStubNodeByAttribute(element, 'data-mpr-auth-provider-chooser', 'root')
      .getAttribute('data-mpr-auth-provider-variant'),
    'icon-row',
    'icon-row variant is reflected on the rendered root',
  );
  assert.deepEqual(
    findStubNodesByAttribute(element, 'data-mpr-auth-provider-mark').map(
      function providerMark(mark) {
        return mark.getAttribute('data-mpr-auth-provider-mark');
      },
    ),
    ['apple', 'google', 'email'],
    'icon-row still renders all provider marks',
  );
  assert.deepEqual(
    findStubNodesByAttribute(element, 'data-mpr-auth-provider').map(
      function providerLabel(button) {
        return button.getAttribute('aria-label');
      },
    ),
    ['Continue with Apple', 'Continue with Google', 'Continue with email'],
    'icon-row keeps accessible provider labels',
  );
});

test('mpr-auth-provider-chooser expands email in place and omits credentials from events', () => {
  resetEnvironment();
  loadLibrary();
  const { element } = createAuthProviderChooserHarness(['apple', 'google', 'email']);

  element.connectedCallback();
  const emailButton = getStubNodeByAttribute(element, 'data-mpr-auth-provider', 'email');
  emailButton.dispatchEvent({ type: 'click', preventDefault() {} });

  assert.equal(
    element.getAttribute('data-mpr-auth-provider-selected'),
    'email',
    'email selection is reflected as provider state only',
  );
  assert.equal(
    element.getAttribute('data-mpr-auth-provider-email-expanded'),
    'true',
    'email selection expands the inline email form',
  );
  assert.equal(
    getStubNodeByAttribute(element, 'data-mpr-auth-provider-chooser', 'email-panel')
      .getAttribute('id'),
    emailButton.getAttribute('aria-controls'),
    'email button controls the inline email panel',
  );
  const submitForm = getStubNodeByAttribute(
    element,
    'data-mpr-auth-provider-email',
    'form',
  );
  const emailInput = getStubNodeByAttribute(
    element,
    'data-mpr-auth-provider-field',
    'email',
  );
  const passwordInput = getStubNodeByAttribute(
    element,
    'data-mpr-auth-provider-field',
    'password',
  );
  emailInput.value = 'operator@example.com';
  passwordInput.value = 'correct-horse-battery-staple';
  submitForm.dispatchEvent({ type: 'submit', preventDefault() {} });

  const submitEvents = element.__dispatchedEvents.filter(function keepSubmitEvent(eventEntry) {
    return eventEntry.type === 'mpr-auth-provider:email-submit';
  });
  assert.equal(submitEvents.length, 1, 'email submit emits one provider event');
  assert.deepEqual(
    submitEvents[0].detail,
    { provider: 'email', action: 'login' },
    'email submit event carries no raw email or password value',
  );
  assert.equal(
    JSON.stringify(submitEvents[0].detail).indexOf('correct-horse-battery-staple'),
    -1,
    'email submit detail does not leak the password',
  );
});

test('mpr-auth-provider-chooser collapses email when a different provider is selected', () => {
  resetEnvironment();
  loadLibrary();
  const { element } = createAuthProviderChooserHarness(['apple', 'google', 'email']);

  element.connectedCallback();
  getStubNodeByAttribute(element, 'data-mpr-auth-provider', 'email').dispatchEvent({
    type: 'click',
    preventDefault() {},
  });
  getStubNodeByAttribute(element, 'data-mpr-auth-provider', 'google').dispatchEvent({
    type: 'click',
    preventDefault() {},
  });

  assert.equal(
    element.getAttribute('data-mpr-auth-provider-selected'),
    'google',
    'google selection replaces the selected provider state',
  );
  assert.equal(
    element.getAttribute('data-mpr-auth-provider-email-expanded'),
    'false',
    'google selection collapses the email panel',
  );
  assert.equal(
    findStubNodesByAttribute(element, 'data-mpr-auth-provider-chooser', 'email-panel').length,
    0,
    'email panel is removed after choosing a non-email provider',
  );
  assert.deepEqual(
    element.__dispatchedEvents
      .filter(function keepProviderEvents(eventEntry) {
        return eventEntry.type === 'mpr-auth-provider:select';
      })
      .map(function providerId(eventEntry) {
        return eventEntry.detail.provider;
      }),
    ['email', 'google'],
    'provider selections dispatch DOM-scoped provider events',
  );
});

test('mpr-auth-provider-chooser reconciles selection when providers change', () => {
  resetEnvironment();
  loadLibrary();
  const { element } = createAuthProviderChooserHarness(['apple', 'google', 'email']);

  element.connectedCallback();
  getStubNodeByAttribute(element, 'data-mpr-auth-provider', 'email').dispatchEvent({
    type: 'click',
    preventDefault() {},
  });
  element.setAttribute('providers', JSON.stringify(['google']));

  assert.equal(
    element.getAttribute('data-mpr-auth-provider-selected'),
    null,
    'provider updates clear selections that are no longer available',
  );
  assert.equal(
    element.getAttribute('data-mpr-auth-provider-email-expanded'),
    'false',
    'provider updates collapse stale email state when email is removed',
  );
  assert.deepEqual(
    findStubNodesByAttribute(element, 'data-mpr-auth-provider').map(
      function providerId(button) {
        return button.getAttribute('data-mpr-auth-provider');
      },
    ),
    ['google'],
    'provider updates rerender only the new provider list',
  );
  assert.equal(
    findStubNodesByAttribute(element, 'data-mpr-auth-provider-chooser', 'email-panel').length,
    0,
    'provider updates remove stale email panels',
  );

  const retainedHarness = createAuthProviderChooserHarness(['apple', 'google', 'email']);
  retainedHarness.element.connectedCallback();
  getStubNodeByAttribute(retainedHarness.element, 'data-mpr-auth-provider', 'google')
    .dispatchEvent({
      type: 'click',
      preventDefault() {},
    });
  retainedHarness.element.setAttribute('providers', JSON.stringify(['google', 'email']));

  assert.equal(
    retainedHarness.element.getAttribute('data-mpr-auth-provider-selected'),
    'google',
    'provider updates preserve selections that are still available',
  );
});

test('mpr-auth-provider-chooser rejects missing, unknown, and duplicate providers', () => {
  resetEnvironment();
  loadLibrary();
  const missingProviders = createAuthProviderChooserHarness().element;

  missingProviders.connectedCallback();

  assert.equal(
    missingProviders.getAttribute('data-mpr-auth-provider-error'),
    'mpr-ui.auth_provider_chooser.providers_required',
    'missing providers fail loudly on the host',
  );

  const { element: unknownProvider } = createAuthProviderChooserHarness(['google', 'magic']);
  unknownProvider.connectedCallback();
  assert.equal(
    unknownProvider.getAttribute('data-mpr-auth-provider-error'),
    'mpr-ui.auth_provider_chooser.unsupported_provider',
    'unknown provider IDs are rejected',
  );

  const { element: duplicateProvider } = createAuthProviderChooserHarness(['apple', 'apple']);
  duplicateProvider.connectedCallback();
  assert.equal(
    duplicateProvider.getAttribute('data-mpr-auth-provider-error'),
    'mpr-ui.auth_provider_chooser.duplicate_provider',
    'duplicate provider IDs are rejected',
  );

  const { element: unsupportedVariant } = createAuthProviderChooserHarness(
    ['apple', 'google', 'email'],
    { variant: 'spread' },
  );
  unsupportedVariant.connectedCallback();
  assert.equal(
    unsupportedVariant.getAttribute('data-mpr-auth-provider-error'),
    'mpr-ui.auth_provider_chooser.unsupported_variant',
    'unsupported variants fail loudly on the host',
  );
});

test('mpr-login-button renders a visible sign-in attempt trigger with provided site ID', async () => {
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
  element.setAttribute('button-text', 'signin_with');
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
  assert.equal(renderCalls.length, 0, 'Google renderButton is not invoked during mount');
  const loginTrigger = buttonHost.children[0];
  assert.equal(loginTrigger.tagName, 'BUTTON', 'login button renders a real button control');
  assert.equal(
    loginTrigger.textContent,
    'Sign in with Google',
    'login button maps GIS text options to human-facing labels',
  );
  assert.equal(
    loginTrigger.getAttribute('data-test'),
    'google-signin',
    'login button exposes a visible sign-in trigger',
  );
});

test('mpr-login-button rebinds auth endpoints when tauth-url changes after first render', async () => {
  resetEnvironment();
  const initAuthCalls = [];
  const fetchCalls = [];
  const exchangePayloads = [];
  const initializeCalls = [];
  global.location = { origin: 'http://fallback-origin.test' };
  const googleStub = {
    accounts: {
      id: {
        renderButton() {},
        initialize(config) {
          initializeCalls.push(config);
        },
        prompt() {},
      },
    },
  };
  global.google = googleStub;
  global.initAuthClient = function initAuthClient(config) {
    initAuthCalls.push(config);
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(null);
  };
  global.fetch = function fetch(url, init) {
    fetchCalls.push(String(url));
    const pathname = new URL(String(url), 'http://fallback-origin.test').pathname;
    if (pathname === '/auth/login') {
      exchangePayloads.push(JSON.parse(init.body));
      return Promise.resolve({
        ok: true,
        json: function json() {
          return Promise.resolve({ user_email: 'login@example.com' });
        },
      });
    }
    return Promise.resolve({
      ok: true,
      json: function json() {
        return Promise.resolve({ nonce: 'updated-login-nonce' });
      },
    });
  };

  loadLibrary();
  const { element } = createLoginButtonHarness(googleStub);
  element.setAttribute('site-id', 'custom-site');
  element.setAttribute('tauth-login-path', '/auth/login');
  element.setAttribute('tauth-logout-path', '/auth/logout');
  element.setAttribute('tauth-nonce-path', '/auth/nonce');
  element.setAttribute('tauth-tenant-id', 'tenant-login');
  element.connectedCallback();
  await flushAsync();
  await flushAsync();

  element.setAttribute('tauth-url', 'http://localhost:8080');
  await flushAsync();
  await flushAsync();

  const authController = element.__authController;
  const authOptions = authController && authController.state && authController.state.options;
  assert.ok(authOptions, 'auth controller options available after login button rerender');
  assert.equal(
    authOptions.tauthUrl,
    'http://localhost:8080',
    'login button auth controller adopts the updated tauth-url',
  );
  assert.equal(
    initAuthCalls[initAuthCalls.length - 1] && initAuthCalls[initAuthCalls.length - 1].baseUrl,
    'http://localhost:8080',
    'login button restarts initAuthClient with the updated base URL',
  );
  await authController.startGoogleSignIn();
  await flushAsync();
  assert.equal(initializeCalls.length, 1, 'login button sign-in initializes GIS once');
  assert.equal(
    initializeCalls[0].nonce,
    'updated-login-nonce',
    'login button sign-in initializes GIS with the updated nonce',
  );
  await initializeCalls[0].callback({ credential: 'updated-login-token' });
  assert.deepEqual(
    fetchCalls,
    ['http://localhost:8080/auth/nonce', 'http://localhost:8080/auth/login'],
    'login button credential exchange requests switch to the updated tauth-url',
  );
  assert.deepEqual(
    exchangePayloads,
    [{ google_id_token: 'updated-login-token', nonce_token: 'updated-login-nonce' }],
    'login button pairs the updated nonce with the credential exchange',
  );
});

test('mpr-login-button keeps receiving auth callbacks after tauth-url rebinding when TAuth retains the original callbacks', async () => {
  resetEnvironment();
  const authenticatedProfile = {
    display: 'Katherine Johnson',
    given_name: 'Katherine',
    avatar_url: 'https://cdn.example.com/katherine.png',
    user_email: 'katherine@example.com',
  };
  let retainedCallbacks = null;
  global.location = { origin: 'http://fallback-origin.test' };
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
  global.initAuthClient = function initAuthClient(config) {
    if (!retainedCallbacks) {
      retainedCallbacks = config;
    }
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(null);
  };
  global.fetch = function fetch() {
    return Promise.resolve({
      ok: true,
      json: function json() {
        return Promise.resolve({ nonce: 'updated-login-nonce' });
      },
    });
  };

  loadLibrary();
  const { element } = createLoginButtonHarness(googleStub);
  element.setAttribute('site-id', 'custom-site');
  element.setAttribute('tauth-login-path', '/auth/login');
  element.setAttribute('tauth-logout-path', '/auth/logout');
  element.setAttribute('tauth-nonce-path', '/auth/nonce');
  element.setAttribute('tauth-tenant-id', 'tenant-login');
  element.connectedCallback();
  await flushAsync();
  await flushAsync();

  assert.ok(retainedCallbacks, 'initial login button auth callbacks registered');

  element.setAttribute('tauth-url', 'http://localhost:8080');
  await flushAsync();
  await flushAsync();

  retainedCallbacks.onAuthenticated(authenticatedProfile);
  await flushAsync();

  const authController = element.__authController;
  assert.ok(authController, 'login button auth controller initialized');
  assert.deepEqual(
    authController.state.profile,
    authenticatedProfile,
    'existing TAuth callbacks still authenticate the login button after tauth-url rebinding',
  );
  const authenticatedEvents = element.__dispatchedEvents.filter(
    (eventEntry) => eventEntry.type === 'mpr-ui:auth:authenticated',
  );
  assert.equal(
    authenticatedEvents.length,
    1,
    'login button emits an authenticated event when the retained callback reports authentication',
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

test('mpr-login-button rejects tauth-tenant-id changes after first render', async () => {
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
  global.location = { origin: 'http://fallback-origin.test' };
  global.initAuthClient = function initAuthClient() {
    return Promise.resolve();
  };
  global.getCurrentUser = function getCurrentUser() {
    return Promise.resolve(null);
  };
  global.fetch = function fetch() {
    return Promise.resolve({
      ok: true,
      json: function json() {
        return Promise.resolve({ nonce: 'tenant-lock-nonce' });
      },
    });
  };

  loadLibrary();
  const { element } = createLoginButtonHarness(googleStub);
  element.setAttribute('site-id', 'custom-site');
  element.setAttribute('tauth-login-path', '/auth/login');
  element.setAttribute('tauth-logout-path', '/auth/logout');
  element.setAttribute('tauth-nonce-path', '/auth/nonce');
  element.setAttribute('tauth-tenant-id', 'tenant-login');
  element.connectedCallback();
  await flushAsync();
  await flushAsync();

  assert.throws(
    function rejectTenantMutation() {
      element.setAttribute('tauth-tenant-id', 'tenant-next');
    },
    function verifyTenantMutationError(error) {
      assert.equal(error.code, 'mpr-ui.auth.tenant_id_change_unsupported');
      assert.match(error.message, /tenant-login/);
      assert.match(error.message, /tenant-next/);
      return true;
    },
  );

  const authController = element.__authController;
  assert.ok(authController, 'login button auth controller remains attached');
  assert.equal(
    authController.state.options.tenantId,
    'tenant-login',
    'login button auth controller keeps the original tenant after rejecting the change',
  );
});

test('mpr-login-button initializes GSI with a nonce only after sign-in trigger click', async () => {
  resetEnvironment();
  const callOrder = [];
  let initializeCallCount = 0;
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
  const { element, buttonHost } = createLoginButtonHarness(googleStub);
  googleStub.accounts.id.initialize = function initialize() {
    initializeCallCount += 1;
    callOrder.push('initialize');
  };
  googleStub.accounts.id.renderButton = function renderButton() {
    callOrder.push('renderButton');
  };
  element.setAttribute('site-id', 'race-condition-test-site');
  element.setAttribute('tauth-login-path', '/auth/login');
  element.setAttribute('tauth-logout-path', '/auth/logout');
  element.setAttribute('tauth-nonce-path', '/auth/nonce');
  element.setAttribute('tauth-tenant-id', 'tenant-race');
  element.connectedCallback();
  await flushAsync();
  assert.deepEqual(callOrder, [], 'login button does not initialize or render GIS on mount');

  const loginTrigger = buttonHost.children[0];
  assert.equal(loginTrigger.tagName, 'BUTTON', 'login button uses a real button for activation');
  loginTrigger.dispatchEvent({ type: 'click', preventDefault() {} });
  await flushAsync();
  await flushAsync();

  const initializeIndex = callOrder.indexOf('initialize');
  assert.ok(
    initializeIndex !== -1,
    'GSI initialize should be called after the sign-in trigger click',
  );
  assert.equal(
    initializeCallCount,
    1,
    'GSI initialize should only run once during the sign-in attempt',
  );
  assert.equal(callOrder.includes('renderButton'), false, 'sign-in attempt uses prompt flow');
  assert.equal(
    buttonHost.getAttribute('data-mpr-google-ready'),
    'true',
    'login button remains visible after GIS prompt starts',
  );
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

test('MU-437: mpr-legal-document renders configurable terms and privacy documents', () => {
  resetEnvironment();
  loadLibrary();
  const { element } = createLegalDocumentElementHarness();
  element.setAttribute('type', 'terms');
  element.setAttribute('product-name', 'Fixture Scanner');
  element.setAttribute(
    'service-description',
    'Fixture Scanner retrieves product pages and exports verification data.',
  );
  element.setAttribute(
    'extra-sections',
    JSON.stringify([
      {
        id: 'source-sites',
        heading: 'Source Site Terms',
        paragraphs: ['Users must comply with source-site platform rules.'],
      },
    ]),
  );

  element.connectedCallback();

  assert.equal(
    element.getAttribute('data-mpr-legal-document-type'),
    'terms',
    'terms type reflected on host',
  );
  assert.match(element.innerHTML, /Terms of Service - Fixture Scanner/);
  assert.match(element.innerHTML, /Marco Polo Research Lab LLC/);
  assert.match(element.innerHTML, /\(650\) 265-1193/);
  assert.match(element.innerHTML, /Source Site Terms/);
  assert.match(element.innerHTML, /retrieves product pages/);

  element.setAttribute('type', 'privacy');

  assert.equal(
    element.getAttribute('data-mpr-legal-document-type'),
    'privacy',
    'privacy type reflected after attribute update',
  );
  assert.match(element.innerHTML, /Privacy Policy - Fixture Scanner/);
  assert.match(element.innerHTML, /Google OAuth and Google User Data/);
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

test('mpr-user renders menu items when configured', () => {
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
  element.setAttribute('display-mode', 'avatar-name');
  element.setAttribute('logout-url', '#signed-out');
  element.setAttribute('logout-label', 'Log out');
  element.setAttribute('tauth-tenant-id', 'tenant-test');
  element.setAttribute(
    'menu-items',
    JSON.stringify([
      { label: 'Account settings', href: '/settings' },
      { label: 'Billing', href: '/billing' },
    ]),
  );

  element.connectedCallback();

  assert.match(
    element.innerHTML,
    /data-mpr-user="menu-item"[^>]*>Account settings</,
    'menu item labels render above logout',
  );
  assert.match(
    element.innerHTML,
    /data-mpr-user="menu-item"[^>]*href="\/billing"/,
    'menu item hrefs are rendered',
  );
});

test('mpr-user dispatches menu-item events for action items', () => {
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

  const menuItems = [
    { label: 'Open settings', action: 'open-settings' },
    { label: 'Billing', href: '/billing' },
  ];
  const harness = createUserElementHarness({ menuItems });
  const element = harness.element;
  element.setAttribute('display-mode', 'avatar-name');
  element.setAttribute('logout-url', '#signed-out');
  element.setAttribute('logout-label', 'Log out');
  element.setAttribute('tauth-tenant-id', 'tenant-test');
  element.setAttribute('menu-items', JSON.stringify(menuItems));

  element.connectedCallback();

  harness.menuItems[0].dispatchEvent({
    type: 'click',
    preventDefault: function preventDefault() {},
  });

  const menuItemEvent = element.__dispatchedEvents.find(
    (eventEntry) => eventEntry.type === 'mpr-user:menu-item',
  );
  assert.ok(menuItemEvent, 'menu-item event dispatched for action items');
  assert.deepEqual(menuItemEvent.detail, {
    action: 'open-settings',
    label: 'Open settings',
    index: 0,
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
    {
      label: 'invalid menu items',
      attributes: {
        'display-mode': 'avatar',
        'logout-url': '#signed-out',
        'logout-label': 'Log out',
        'tauth-tenant-id': 'tenant-test',
        'menu-items': 'not-json',
      },
      expectedError: 'mpr-ui.user.invalid_menu_items',
    },
    {
      label: 'menu item missing href or action',
      attributes: {
        'display-mode': 'avatar',
        'logout-url': '#signed-out',
        'logout-label': 'Log out',
        'tauth-tenant-id': 'tenant-test',
        'menu-items': '[{"label":"Settings"}]',
      },
      expectedError: 'mpr-ui.user.invalid_menu_items',
    },
    {
      label: 'menu item with action and href',
      attributes: {
        'display-mode': 'avatar',
        'logout-url': '#signed-out',
        'logout-label': 'Log out',
        'tauth-tenant-id': 'tenant-test',
        'menu-items': '[{"label":"Settings","href":"/settings","action":"open-settings"}]',
      },
      expectedError: 'mpr-ui.user.invalid_menu_items',
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
