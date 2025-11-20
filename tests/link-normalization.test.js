'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const bundlePath = path.join(__dirname, '..', 'mpr-ui.js');

function resetEnvironment() {
  delete require.cache[bundlePath];
  delete global.MPRUI;
}

function requireBundle() {
  resetEnvironment();
  require(bundlePath);
  assert.ok(global.MPRUI && global.MPRUI.__utils);
  return global.MPRUI.__utils.normalizeLinkForRendering;
}

test('normalizeLinkForRendering defaults target/rel and sanitizes href', () => {
  const normalizeLinkForRendering = requireBundle();
  const normalized = normalizeLinkForRendering(
    { label: 'Docs', href: 'javascript:alert(1)' },
    { target: '_blank', rel: 'noopener' },
  );

  assert.equal(normalized.href, '#', 'href should be sanitized');
  assert.equal(normalized.target, '_blank');
  assert.equal(normalized.rel, 'noopener');
  assert.equal(normalized.url, '#');
});

test('normalizeLinkForRendering keeps provided target/rel and label', () => {
  const normalizeLinkForRendering = requireBundle();
  const normalized = normalizeLinkForRendering(
    { label: 'Home', url: '/home', target: '_self', rel: 'nofollow' },
    { target: '_blank', rel: 'noopener' },
  );

  assert.equal(normalized.href, '/home');
  assert.equal(normalized.url, '/home');
  assert.equal(normalized.target, '_self');
  assert.equal(normalized.rel, 'nofollow');
  assert.equal(normalized.label, 'Home');
});
