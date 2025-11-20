'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const bundlePath = path.join(__dirname, '..', 'mpr-ui.js');

function createClassList() {
  const values = new Set();
  return {
    add(name) {
      if (name) values.add(String(name));
    },
    remove(name) {
      values.delete(String(name));
    },
    contains(name) {
      return values.has(name);
    },
  };
}

function createElementStub() {
  return {
    attributes: {},
    classList: createClassList(),
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name]
        : null;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
  };
}

function resetEnvironment() {
  delete require.cache[bundlePath];
  delete global.MPRUI;
  delete global.document;
}

test('theme targets are resolved once per configuration', () => {
  const htmlElement = createElementStub();
  const bodyElement = createElementStub();
  const targetElement = createElementStub();
  const queryCounters = { calls: 0 };
  resetEnvironment();

  global.document = {
    documentElement: htmlElement,
    body: bodyElement,
    head: { appendChild() {} },
    querySelectorAll() {
      queryCounters.calls += 1;
      return [targetElement];
    },
    createElement() {
      return createElementStub();
    },
    createTextNode() {
      return { nodeType: 3 };
    },
    addEventListener() {},
    dispatchEvent() {},
  };

  require(bundlePath);

  global.MPRUI.configureTheme({
    targets: ['#demo'],
    modes: [
      { value: 'light', attributeValue: 'light', classList: [], dataset: {} },
      { value: 'dark', attributeValue: 'dark', classList: [], dataset: {} },
    ],
    initialMode: 'light',
  });

  assert.equal(queryCounters.calls, 1, 'targets should resolve once during configure');

  global.MPRUI.setThemeMode('dark');
  global.MPRUI.setThemeMode('light');

  assert.equal(queryCounters.calls, 1, 'mode changes must reuse cached targets');
  assert.equal(targetElement.attributes['data-mpr-theme'], 'light');
});
