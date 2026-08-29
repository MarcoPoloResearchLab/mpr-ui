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

test('the project catalog uses the current LoopAware subscription identifiers', () => {
  resetEnvironment();
  require(bundlePath);
  const catalog = global.MPRUI.getBandProjectCatalog();
  const expectedSiteIds = {
    'gravity-notes': '8b4fa15e-52a9-4feb-a466-bb186f42df81',
    ledger: '9edfc4a2-e5ab-43f8-ada8-72bebf3f56a1',
    loopaware: 'c4fa39f7-4690-4bae-93d1-9401bdf98dbf',
  };

  for (const [projectId, expectedSiteId] of Object.entries(expectedSiteIds)) {
    const project = catalog.find((entry) => entry.id === projectId);
    assert.ok(project, `${projectId} must exist in the project catalog`);
    const subscribeUrl = new URL(project.subscribe.script);
    assert.equal(subscribeUrl.searchParams.get('site_id'), expectedSiteId);
  }
});

test('<mpr-card> custom element registers', () => {
  resetEnvironment();
  require(bundlePath);
  const cardCtor = global.customElements.get('mpr-card');
  assert.equal(typeof cardCtor, 'function');
});
