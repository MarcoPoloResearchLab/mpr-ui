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
    element.trigger = function (eventType, payload) {
      const handlers = listeners[eventType] ? listeners[eventType].slice() : [];
      handlers.forEach((handler) => {
        handler.call(element, Object.assign(
          {
            type: eventType,
            preventDefault() {},
          },
          payload || {},
        ));
      });
    };
  }
  return element;
}

function createThemeToggleHarness(options) {
  const config = Object.assign({ variant: 'switch' }, options || {});
  const host = createElementStub({ supportsAttributes: true });
  const control = createElementStub({ supportsEvents: true, supportsAttributes: true });
  control.ownerDocument = { defaultView: null };
  const icon = createElementStub();
  const grid = createElementStub({ supportsAttributes: true });
  grid.style = { setProperty() {} };
  grid.getBoundingClientRect = function () {
    return config.gridRect || { left: 0, top: 0, width: 80, height: 80 };
  };
  const dot = createElementStub({ supportsAttributes: true });
  dot.style = { setProperty() {} };
  const squareQuads = Array.from({ length: 4 }).map(() => {
    const quad = createElementStub({ supportsAttributes: true });
    quad.classList = {
      toggle: function () {},
    };
    return quad;
  });
  host.querySelector = function (selector) {
    if (selector === '[data-mpr-theme-toggle="control"]') {
      return control;
    }
    if (selector === '[data-mpr-theme-toggle="icon"]') {
      return icon;
    }
    if (config.variant === 'square') {
      if (selector === '[data-mpr-theme-toggle="grid"]') {
        return grid;
      }
      if (selector === '[data-mpr-theme-toggle="dot"]') {
        return dot;
      }
    }
    return null;
  };
  host.querySelectorAll = function (selector) {
    if (config.variant === 'square' && selector === '[data-mpr-theme-toggle="quad"]') {
      return squareQuads.slice();
    }
    return [];
  };
  return { host, control, icon, grid, dot };
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

test('renderThemeToggle switch variant derives a binary mode pair', () => {
  resetEnvironment();
  const harness = createThemeToggleHarness();
  require('../mpr-ui.js');
  const controller = global.MPRUI.renderThemeToggle(harness.host, {
    variant: 'switch',
    theme: {
      initialMode: 'default-light',
      modes: [
        { value: 'default-light', attributeValue: 'light' },
        { value: 'sunrise-light', attributeValue: 'light' },
        { value: 'default-dark', attributeValue: 'dark' },
        { value: 'forest-dark', attributeValue: 'dark' },
      ],
    },
  });

  assert.equal(global.MPRUI.getThemeMode(), 'default-light');
  assert.equal(harness.control.checked, false);
  assert.equal(harness.control.getAttribute('aria-checked'), 'false');

  harness.control.trigger('click');
  assert.equal(global.MPRUI.getThemeMode(), 'default-dark');
  assert.equal(harness.control.checked, true);
  assert.equal(harness.control.getAttribute('aria-checked'), 'true');

  harness.control.trigger('click');
  assert.equal(global.MPRUI.getThemeMode(), 'default-light');
  assert.equal(harness.control.checked, false);
  assert.equal(harness.control.getAttribute('aria-checked'), 'false');

  controller.destroy();
});

test('renderThemeToggle switch toggles from alternate light mode to dark', () => {
  resetEnvironment();
  const harness = createThemeToggleHarness();
  require('../mpr-ui.js');
  const controller = global.MPRUI.renderThemeToggle(harness.host, {
    variant: 'switch',
    theme: {
      initialMode: 'default-light',
      modes: [
        { value: 'default-light', attributeValue: 'light' },
        { value: 'sunrise-light', attributeValue: 'light' },
        { value: 'default-dark', attributeValue: 'dark' },
        { value: 'forest-dark', attributeValue: 'dark' },
      ],
    },
  });

  assert.equal(global.MPRUI.getThemeMode(), 'default-light');
  global.MPRUI.setThemeMode('sunrise-light');
  assert.equal(global.MPRUI.getThemeMode(), 'sunrise-light');

  harness.control.trigger('click');
  assert.equal(global.MPRUI.getThemeMode(), 'default-dark');
  assert.equal(harness.control.checked, true);
  assert.equal(harness.control.getAttribute('aria-checked'), 'true');

  controller.destroy();
});

test('renderThemeToggle supports the square variant and updates modes per quadrant', () => {
  resetEnvironment();
  const harness = createThemeToggleHarness({
    variant: 'square',
    gridRect: { left: 0, top: 0, width: 100, height: 100 },
  });
  require('../mpr-ui.js');
  const controller = global.MPRUI.renderThemeToggle(harness.host, {
    variant: 'square',
    theme: {
      initialMode: 'default-light',
      modes: [
        { value: 'default-light', attributeValue: 'light' },
        { value: 'sunrise-light', attributeValue: 'light' },
        { value: 'default-dark', attributeValue: 'dark' },
        { value: 'forest-dark', attributeValue: 'dark' },
      ],
    },
  });
  assert.equal(global.MPRUI.getThemeMode(), 'default-light');
  harness.control.trigger('click', { clientX: 90, clientY: 90 });
  assert.equal(
    global.MPRUI.getThemeMode(),
    'default-dark',
    'clicking the bottom-right quadrant should activate the third mode',
  );
  controller.destroy();
});
