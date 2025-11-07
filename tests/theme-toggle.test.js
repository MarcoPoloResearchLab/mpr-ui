'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

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
    className: '',
    dataset: {},
    innerHTML: '',
    textContent: '',
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
    querySelector() {
      return null;
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
      listeners[eventType] = listeners[eventType].filter((entry) => entry !== handler);
    };
    element.trigger = function (eventType) {
      const handlers = listeners[eventType] ? listeners[eventType].slice() : [];
      handlers.forEach((handler) => {
        handler({
          type: eventType,
          preventDefault() {},
        });
      });
    };
  }
  return element;
}

function createThemeToggleHarness() {
  const host = createElementStub({ supportsAttributes: true });
  const control = createElementStub({ supportsEvents: true, supportsAttributes: true });
  const icon = createElementStub();
  host.querySelector = function (selector) {
    if (selector === '[data-mpr-theme-toggle="control"]') {
      return control;
    }
    if (selector === '[data-mpr-theme-toggle="icon"]') {
      return icon;
    }
    return null;
  };
  return { host, control, icon };
}

function resetEnvironment() {
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('mpr-ui.js')) {
      delete require.cache[key];
    }
  });
  delete global.MPRUI;
  global.CustomEvent = function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  };
  global.document = {
    head: { appendChild() {} },
    createElement() {
      return createElementStub({ supportsEvents: true, supportsAttributes: true });
    },
    getElementById() {
      return null;
    },
    documentElement: createElementStub({ supportsAttributes: true }),
    body: createElementStub({ supportsAttributes: true }),
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

test('renderThemeToggle cycles the global theme mode when activated', () => {
  resetEnvironment();
  const harness = createThemeToggleHarness();
  require('../mpr-ui.js');
  const controller = global.MPRUI.renderThemeToggle(harness.host, {
    variant: 'button',
    label: 'Theme',
    theme: { initialMode: 'dark' },
  });
  assert.equal(global.MPRUI.getThemeMode(), 'dark');
  harness.control.trigger('click');
  assert.equal(global.MPRUI.getThemeMode(), 'light');
  controller.destroy();
});

test('mprThemeToggle attaches to host elements via Alpine-style factory', () => {
  resetEnvironment();
  const harness = createThemeToggleHarness();
  require('../mpr-ui.js');
  const component = global.MPRUI.mprThemeToggle({
    variant: 'switch',
    theme: { initialMode: 'light' },
  });
  component.$el = harness.host;
  component.init();
  assert.equal(global.MPRUI.getThemeMode(), 'light');
  harness.control.trigger('click');
  assert.equal(
    global.MPRUI.getThemeMode(),
    'dark',
    'expected factory to cycle modes after init',
  );
  component.update({ theme: { initialMode: 'light' } });
  harness.control.trigger('click');
  assert.equal(
    global.MPRUI.getThemeMode(),
    'dark',
    'expected update to rewire handlers without duplicating listeners',
  );
  component.destroy();
});
