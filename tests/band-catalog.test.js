'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const bundlePath = path.join(__dirname, '..', 'mpr-ui.js');

function createAttributeHost() {
  const attributes = {};
  return {
    attributes,
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
  };
}

function resetEnvironment() {
  delete require.cache[bundlePath];
  delete global.MPRUI;
  delete global.window;

  global.CustomEvent = function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  };

  const headElement = { appendChild() {} };
  const documentElement = createAttributeHost();
  const bodyElement = createAttributeHost();

  global.document = {
    head: headElement,
    documentElement,
    body: bodyElement,
    createElement() {
      return {
        setAttribute() {},
        appendChild() {},
      };
    },
    createTextNode() {
      return {};
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getElementById() {
      return null;
    },
  };

  const definitions = new Map();
  global.customElements = {
    define(name, ctor) {
      definitions.set(name, ctor);
    },
    get(name) {
      return definitions.get(name) || null;
    },
  };

  if (typeof global.HTMLElement !== 'function') {
    global.HTMLElement = class HTMLElement {};
  }
}

test('mpr-band custom element registers and exposes the default catalog helper', () => {
  resetEnvironment();
  require(bundlePath);
  assert.ok(global.MPRUI);
  assert.equal(typeof global.MPRUI.getBandProjectCatalog, 'function');
  const catalogA = global.MPRUI.getBandProjectCatalog();
  const catalogB = global.MPRUI.getBandProjectCatalog();
  assert.ok(Array.isArray(catalogA));
  assert.ok(Array.isArray(catalogB));
  assert.notStrictEqual(catalogA, catalogB);
  assert.notStrictEqual(catalogA[0], catalogB[0]);
  assert.ok(typeof catalogA[0].category === 'string');
  const bandCtor = global.customElements.get('mpr-band');
  assert.equal(typeof bandCtor, 'function');
});
