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
  element.focus = function () {
    if (global.document) {
      global.document.activeElement = element;
    }
  };

  return element;
}

function createDocumentStub() {
  const elementsById = {};
  const documentElement = createElementStub({ supportsAttributes: true });
  const bodyElement = createElementStub({ supportsAttributes: true });
  bodyElement.classList = createClassList();
  bodyElement.style = { overflow: '' };
  const listeners = {};

  function addDocumentListener(type, handler) {
    const eventType = String(type);
    if (!listeners[eventType]) listeners[eventType] = [];
    listeners[eventType].push(handler);
  }

  function removeDocumentListener(type, handler) {
    const eventType = String(type);
    if (!listeners[eventType]) return;
    listeners[eventType] = listeners[eventType].filter((entry) => entry !== handler);
  }

  function dispatchDocumentEvent(eventObject) {
    const eventType = eventObject && eventObject.type ? String(eventObject.type) : '';
    const handlers = listeners[eventType] ? listeners[eventType].slice() : [];
    handlers.forEach((handler) => {
      handler.call(documentObject, eventObject);
    });
  }

  const documentObject = {
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
    activeElement: bodyElement,
    addEventListener: addDocumentListener,
    removeEventListener: removeDocumentListener,
    dispatchEvent: dispatchDocumentEvent,
    querySelector: function () {
      return null;
    },
    querySelectorAll: function () {
      return [];
    },
  };
  return documentObject;
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
  const privacyLinkElement = createElementStub({ supportsEvents: true, supportsAttributes: true });
  const themeToggleWrapper = createElementStub({ supportsAttributes: true });
  const spacerElement = createElementStub({ supportsAttributes: true });
  const themeToggleControl = createElementStub({ supportsEvents: true, supportsAttributes: true });
  const modalElement = createElementStub({ supportsAttributes: true });
  const modalDialog = createElementStub({ supportsEvents: true, supportsAttributes: true });
  const modalClose = createElementStub({ supportsEvents: true, supportsAttributes: true });
  const modalBackdrop = createElementStub({ supportsEvents: true, supportsAttributes: true });
  const modalContent = createElementStub({ supportsAttributes: true });
  modalDialog.focus = function () {
    if (global.document) {
      global.document.activeElement = modalDialog;
    }
  };
  themeToggleWrapper.querySelector = function (selector) {
    if (selector === '[data-mpr-theme-toggle="control"]') {
      return themeToggleControl;
    }
    if (selector === '[data-mpr-theme-toggle="icon"]') {
      return null;
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
  selectors.set('[data-mpr-footer="spacer"]', spacerElement);
  selectors.set('[data-mpr-footer="menu"]', menuElement);
  selectors.set('[data-mpr-footer="toggle-button"]', toggleButtonElement);
  selectors.set('[data-mpr-footer="privacy-link"]', privacyLinkElement);
  selectors.set('[data-mpr-footer="theme-toggle"]', themeToggleWrapper);
  selectors.set('[data-mpr-footer="privacy-modal"]', modalElement);
  selectors.set('[data-mpr-footer="privacy-modal-dialog"]', modalDialog);
  selectors.set('[data-mpr-footer="privacy-modal-close"]', modalClose);
  selectors.set('[data-mpr-footer="privacy-modal-backdrop"]', modalBackdrop);
  selectors.set('[data-mpr-footer="privacy-modal-content"]', modalContent);
  selectors.set('footer[role="contentinfo"]', footerElement);

  const host = createElementStub({ supportsEvents: true, supportsAttributes: true });
  host.querySelector = function (selector) {
    if (selector === 'footer[role="contentinfo"]') {
      return footerElement;
    }
    return selectors.get(selector) || null;
  };
  let capturedMarkup = '';
  Object.defineProperty(host, 'innerHTML', {
    set: function (value) {
      capturedMarkup = String(value);
    },
    get: function () {
      return capturedMarkup;
    },
  });

  footerElement.querySelector = host.querySelector;

  return {
    host,
    elements: {
      prefixElement,
      privacyLink: privacyLinkElement,
      privacyModal: modalElement,
      privacyModalClose: modalClose,
      themeToggleControl,
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

  elements.themeToggleControl.trigger('click');

  assert.equal(
    library.getThemeMode(),
    'light',
    'expected theme mode to switch to light after toggling',
  );
});

test('footer layout orders privacy spacer toggle and brand', () => {
  resetEnvironment();
  const harness = createFooterHostHarness();
  const library = loadLibrary();

  library.renderFooter(harness.host, { themeToggle: { enabled: true } });

  const markup = String(harness.host.innerHTML);
  const privacyIndex = markup.indexOf('data-mpr-footer="privacy-link"');
  const spacerIndex = markup.indexOf('data-mpr-footer="spacer"');
  const toggleIndex = markup.indexOf('data-mpr-footer="theme-toggle"');
  const brandIndex = markup.indexOf('data-mpr-footer="brand"');

  assert.ok(privacyIndex !== -1, 'privacy link should be present in the footer layout');
  assert.ok(spacerIndex !== -1, 'spacer should be present when the theme toggle is enabled');
  assert.ok(toggleIndex !== -1, 'theme toggle host should be present in the footer layout');
  assert.ok(brandIndex !== -1, 'brand container should be present in the footer layout');
  assert.ok(
    privacyIndex < spacerIndex && spacerIndex < toggleIndex && toggleIndex < brandIndex,
    'footer layout must position privacy link, spacer, theme toggle, then brand',
  );
});

test('footer omits drop-up when links collection is empty', () => {
  resetEnvironment();
  const harness = createFooterHostHarness();
  const library = loadLibrary();

  const controller = library.renderFooter(harness.host, {
    linksCollection: { style: 'drop-up', text: 'Built by', links: [] },
  });
  const config = controller.getConfig();

  const markup = String(harness.host.innerHTML);
  assert.strictEqual(
    markup.indexOf('data-mpr-footer="menu-wrapper"'),
    -1,
    'menu wrapper should be absent when no links are provided',
  );
  assert.ok(
    harness.elements.prefixElement.textContent === config.prefixText,
    'prefix text span should reflect the configured text when the drop-up is hidden',
  );
  assert.strictEqual(
    config.linksMenuEnabled,
    false,
    'config should mark the drop-up as disabled when no links are provided',
  );
  assert.deepStrictEqual(
    config.links,
    [],
    'config should not expose any menu links when the collection is empty',
  );
});

test('footer privacy modal opens and closes on interaction', () => {
  resetEnvironment();
  const harness = createFooterHostHarness();
  const library = loadLibrary();

  library.renderFooter(harness.host, {
    privacyModalContent: '<p>Modal content</p>',
  });

  const modalElement = harness.elements.privacyModal;
  const closeButton = harness.elements.privacyModalClose;
  const privacyLink = harness.elements.privacyLink;

  assert.strictEqual(
    privacyLink.getAttribute('role'),
    'button',
    'privacy link should behave like a button when the modal is enabled',
  );
  assert.strictEqual(
    privacyLink.getAttribute('tabindex'),
    '0',
    'privacy link should be tabbable when the modal replaces anchor navigation',
  );
  privacyLink.trigger('click');
  closeButton.trigger('click');
});
