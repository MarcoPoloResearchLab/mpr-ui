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
    {
      supportsEvents: false,
      supportsAttributes: false,
    },
    options || {},
  );
  const listeners = {};
  const attributes = {};
  const element = {
    classList: createClassList(),
    className: '',
    attributes,
    dataset: {},
    checked: false,
    innerHTML: '',
    textContent: '',
    setAttribute: function (name, value) {
      attributes[name] = String(value);
    },
    getAttribute: function (name) {
      return Object.prototype.hasOwnProperty.call(attributes, name)
        ? attributes[name]
        : null;
    },
    removeAttribute: function (name) {
      delete attributes[name];
    },
    hasAttribute: function (name) {
      return Object.prototype.hasOwnProperty.call(attributes, name);
    },
    querySelector: function () {
      return null;
    },
    querySelectorAll: function () {
      return [];
    },
  };

  if (config.supportsEvents) {
    element.addEventListener = function (type, handler) {
      const eventType = String(type);
      if (!listeners[eventType]) listeners[eventType] = [];
      listeners[eventType].push(handler);
    };
    element.removeEventListener = function (type, handler) {
      const eventType = String(type);
      if (!listeners[eventType]) return;
      listeners[eventType] = listeners[eventType].filter(function (entry) {
        return entry !== handler;
      });
    };
    element.dispatchEvent = function (eventObject) {
      const eventType = eventObject && eventObject.type ? String(eventObject.type) : '';
      const handlers = listeners[eventType] ? listeners[eventType].slice() : [];
      handlers.forEach(function (handler) {
        handler.call(element, eventObject);
      });
    };
    element.trigger = function (eventType) {
      element.dispatchEvent({ type: eventType, target: element });
    };
  }

  if (config.supportsAttributes) {
    element.setAttribute = function (name, value) {
      attributes[name] = String(value);
    };
    element.getAttribute = function (name) {
      return Object.prototype.hasOwnProperty.call(attributes, name)
        ? attributes[name]
        : null;
    };
    element.hasAttribute = function (name) {
      return Object.prototype.hasOwnProperty.call(attributes, name);
    };
  }

  return element;
}

function createDocumentStub() {
  const elementsById = {};
  const documentElement = createElementStub({ supportsAttributes: true });
  const bodyElement = createElementStub({ supportsAttributes: true });
  bodyElement.classList = createClassList();
  return {
    head: {
      appendChild: function (node) {
        if (node && node.id) {
          elementsById[node.id] = node;
        }
      },
    },
    createElement: function (tagName) {
      const element = createElementStub({ supportsEvents: true, supportsAttributes: true });
      element.tagName = String(tagName || '').toUpperCase();
      element.appendChild = function (child) {
        element.child = child;
      };
      return element;
    },
    createTextNode: function (text) {
      return { textContent: String(text) };
    },
    getElementById: function (id) {
      return elementsById[id] || null;
    },
    documentElement: documentElement,
    body: bodyElement,
    querySelector: function () {
      return null;
    },
    querySelectorAll: function () {
      return [];
    },
  };
}

function createFooterHostHarness() {
  const selectors = new Map();

  const footerElement = createElementStub({ supportsEvents: true, supportsAttributes: true });
  footerElement.querySelector = function (selector) {
    return selectors.get(selector) || null;
  };

  const layoutElement = createElementStub({ supportsAttributes: true });
  const brandElement = createElementStub({ supportsAttributes: true });
  const prefixElement = createElementStub({ supportsAttributes: true });
  const menuWrapperElement = createElementStub({ supportsEvents: true, supportsAttributes: true });
  const menuElement = createElementStub({ supportsAttributes: true });
  const toggleButtonElement = createElementStub({ supportsEvents: true, supportsAttributes: true });
  const privacyLinkElement = createElementStub({ supportsAttributes: true });
  const themeToggleWrapper = createElementStub({ supportsAttributes: true });
  const themeToggleInput = createElementStub({ supportsEvents: true, supportsAttributes: true });
  themeToggleWrapper.querySelector = function (selector) {
    if (selector === '[data-mpr-footer="theme-toggle-input"]') {
      return themeToggleInput;
    }
    return null;
  };
  menuWrapperElement.querySelector = function (selector) {
    if (selector === '[data-mpr-footer="toggle-button"]') {
      return toggleButtonElement;
    }
    if (selector === '[data-mpr-footer="menu"]') {
      return menuElement;
    }
    return null;
  };

  selectors.set('[data-mpr-footer="layout"]', layoutElement);
  selectors.set('[data-mpr-footer="brand"]', brandElement);
  selectors.set('[data-mpr-footer="prefix"]', prefixElement);
  selectors.set('[data-mpr-footer="menu-wrapper"]', menuWrapperElement);
  selectors.set('[data-mpr-footer="menu"]', menuElement);
  selectors.set('[data-mpr-footer="toggle-button"]', toggleButtonElement);
  selectors.set('[data-mpr-footer="privacy-link"]', privacyLinkElement);
  selectors.set('[data-mpr-footer="theme-toggle"]', themeToggleWrapper);
  selectors.set('[data-mpr-footer="theme-toggle-input"]', themeToggleInput);
  selectors.set('footer[role="contentinfo"]', footerElement);

  const host = createElementStub({ supportsEvents: true, supportsAttributes: true });
  host.querySelector = function (selector) {
    if (selector === 'footer[role="contentinfo"]') {
      return footerElement;
    }
    return selectors.get(selector) || null;
  };
  Object.defineProperty(host, 'innerHTML', {
    set: function () {
      // noop: markup ignored; selectors already mapped.
    },
    get: function () {
      return '';
    },
  });

  footerElement.querySelector = host.querySelector;

  return {
    host,
    elements: {
      themeToggleInput,
    },
  };
}

function resetEnvironment() {
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('mpr-ui.js')) {
      delete require.cache[key];
    }
  });
  delete global.MPRUI;
  global.document = createDocumentStub();
  global.CustomEvent = function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  };
  global.fetch = function () {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  };
  delete global.google;
  delete global.initAuthClient;
}

function loadLibrary() {
  require('../mpr-ui.js');
  return global.MPRUI;
}

test('footer theme toggle switches the global theme mode to light', () => {
  resetEnvironment();
  const { host, elements } = createFooterHostHarness();
  const library = loadLibrary();

  library.renderFooter(host, { themeToggle: { enabled: true } });

  assert.equal(
    library.getThemeMode(),
    'dark',
    'expected theme manager initial mode to be dark',
  );

  elements.themeToggleInput.trigger('click');

  assert.equal(
    library.getThemeMode(),
    'light',
    'expected theme mode to switch to light after toggling',
  );
});
