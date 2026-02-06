// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const demoDir = join(__dirname, '..', 'demo');
const standaloneHtmlPath = join(demoDir, 'standalone.html');
const standaloneHtml = readFileSync(standaloneHtmlPath, 'utf8');

test('MU-130: standalone demo loads tauth.js from same-origin proxy', () => {
  assert.match(
    standaloneHtml,
    /<script\b[^>]*\bsrc="\/tauth\.js"[^>]*><\/script>/i,
    'Expected standalone.html to load tauth.js from /tauth.js (gHTTP proxy)',
  );
});

test('MU-130: standalone demo uses relative demo navigation links', () => {
  assert.doesNotMatch(
    standaloneHtml,
    /"url"\s*:\s*"\/?demo\//i,
    'Expected standalone.html links-collection URLs to avoid a /demo/ prefix when served from demo as web root',
  );

  const expectedLinks = ['./tauth-demo.html', './local.html', './index.html'];
  expectedLinks.forEach((href) => {
    const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(
      standaloneHtml,
      new RegExp(`\"url\"\\s*:\\s*\"${escapedHref}\"`),
      `Expected standalone.html to include link url ${href}`,
    );
  });
});
