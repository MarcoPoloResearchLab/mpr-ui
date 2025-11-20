'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const bundlePath = path.join(__dirname, '..', 'mpr-ui.js');

function resetEnvironment() {
  delete require.cache[bundlePath];
  delete global.MPRUI;
  delete global.document;
  delete Object.prototype.polluted;
}

test('configureTheme ignores prototype-polluting keys', () => {
  resetEnvironment();
  require(bundlePath);
  assert.ok(global.MPRUI && typeof global.MPRUI.configureTheme === 'function');

  global.MPRUI.configureTheme({ __proto__: { polluted: 'yes' } });

  assert.equal(Object.prototype.polluted, undefined, 'prototype must not be polluted');
});

test('configureTheme ignores prototype pollution from JSON-parsed configuration', () => {
  resetEnvironment();
  require(bundlePath);

  const parsedConfig = JSON.parse('{"__proto__":{"polluted":"yes"},"attribute":"data-demo-theme"}');

  global.MPRUI.configureTheme(parsedConfig);

  assert.equal(Object.prototype.polluted, undefined, 'prototype must remain clean');
  assert.equal(global.MPRUI.configureTheme({}).attribute, 'data-demo-theme');
});

test('configureTheme still applies valid options', () => {
  resetEnvironment();
  require(bundlePath);

  const updated = global.MPRUI.configureTheme({ attribute: 'data-demo-theme' });
  const defaultAttribute = updated.attribute;

  assert.ok(defaultAttribute === 'data-demo-theme' || defaultAttribute === 'data-mpr-theme');
});
