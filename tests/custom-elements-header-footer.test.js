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
  return {
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

  const root = createStubNode({ classList: true });
  const brandLink = createStubNode({ attributes: true });
  const brandContainer = createStubNode();
  const nav = createStubNode({});
  const actions = createStubNode({});
  const themeToggleHost = createStubNode({ attributes: true, classList: true });
  const themeToggleControl = createStubNode({ attributes: true });
  themeToggleControl.addEventListener = function () {};
  themeToggleControl.removeEventListener = function () {};
  themeToggleControl.setAttribute = function (name, value) {
    this.attributes = this.attributes || {};
    this.attributes[name] = String(value);
  };
  const themeToggleIcon = createStubNode({});
  themeToggleHost.querySelector = function query(selector) {
    if (selector === '[data-mpr-theme-toggle="control"]') {
      return themeToggleControl;
    }
    if (selector === '[data-mpr-theme-toggle="icon"]') {
      return themeToggleIcon;
    }
    return null;
  };
  const googleHost = createStubNode({ attributes: true, classList: true, supportsEvents: true });
  const settingsButton = createStubNode({ attributes: true, supportsEvents: true });
  const profileContainer = createStubNode({});
  const profileLabel = createStubNode({});
  const profileName = createStubNode({});
  const signOutButton = createStubNode({ attributes: true, supportsEvents: true });

  const selectorMap = new Map([
    ['header.mpr-header', root],
    ['[data-mpr-header="brand"]', brandLink],
    ['.mpr-header__brand', brandContainer],
    ['[data-mpr-header="nav"]', nav],
    ['[data-mpr-header="theme-toggle"]', themeToggleHost],
    ['[data-mpr-header="google-signin"]', googleHost],
    ['[data-mpr-header="settings-button"]', settingsButton],
    ['[data-mpr-header="profile"]', profileContainer],
    ['[data-mpr-header="profile-label"]', profileLabel],
    ['[data-mpr-header="profile-name"]', profileName],
    ['[data-mpr-header="sign-out-button"]', signOutButton],
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
    selectorMap,
  };
}

function createFooterElementHarness() {
  const FooterElement = global.customElements.get('mpr-footer');
  assert.ok(FooterElement, 'mpr-footer is defined');

  const root = createStubNode({ classList: true });
  const inner = createStubNode({});
  const layout = createStubNode({});
  const brandContainer = createStubNode({});
  const prefix = createStubNode({});
  const menuWrapper = createStubNode({});
  const menu = createStubNode({});
  const toggleButton = createStubNode({ attributes: true, supportsEvents: true });
  const themeToggleHost = createStubNode({});
  const privacyLink = createStubNode({ attributes: true });

  const selectorMap = new Map([
    ['footer[role="contentinfo"]', root],
    ['[data-mpr-footer="inner"]', inner],
    ['[data-mpr-footer="layout"]', layout],
    ['[data-mpr-footer="brand"]', brandContainer],
    ['[data-mpr-footer="prefix"]', prefix],
    ['[data-mpr-footer="menu-wrapper"]', menuWrapper],
    ['[data-mpr-footer="menu"]', menu],
    ['[data-mpr-footer="toggle-button"]', toggleButton],
    ['[data-mpr-footer="theme-toggle"]', themeToggleHost],
    ['[data-mpr-footer="privacy-link"]', privacyLink],
  ]);

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
    menu,
    menuWrapper,
    privacyLink,
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
  headerElement.setAttribute('settings-enabled', 'false');
  headerElement.setAttribute('site-id', 'example-site');
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
    'site id reflected on host dataset',
  );

  headerElement.setAttribute('brand-label', 'Next Brand');
  assert.equal(harness.brandLink.textContent, 'Next Brand');
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
    'links',
    JSON.stringify([{ label: 'Docs', url: '#docs' }]),
  );

  footerElement.connectedCallback();

  assert.equal(footerElement.attributes['prefix-text'], 'Crafted by');
  assert.equal(footerElement.getAttribute('prefix-text'), 'Crafted by');
  assert.equal(footerElement.dataset.prefixText, 'Crafted by');
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
    [{ label: 'Docs', url: '#docs', target: '_blank', rel: 'noopener noreferrer' }],
    'links attribute parsed into controller config',
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
  const onloadElement = { setAttribute() {} };
  global.document.getElementById = function getElement(id) {
    if (id === 'g_id_onload') {
      return onloadElement;
    }
    return null;
  };
  loadLibrary();
  const { element, buttonHost, renderCalls } = createLoginButtonHarness(googleStub);
  element.setAttribute('site-id', 'custom-site');
  element.setAttribute('login-path', '/auth/login');
  element.setAttribute('logout-path', '/auth/logout');
  element.setAttribute('nonce-path', '/auth/nonce');
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
