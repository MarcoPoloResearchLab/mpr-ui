'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const demoDir = join(__dirname, '..', 'demo');
const tauthDemoHtmlPath = join(demoDir, 'tauth-demo.html');
const tauthDemoHtml = readFileSync(tauthDemoHtmlPath, 'utf8');

test('tauth demo includes mpr-user menu element', () => {
  assert.match(
    tauthDemoHtml,
    /<mpr-user[\s>]/i,
    'Expected tauth-demo.html to include an <mpr-user> element',
  );
});

test('tauth demo user menu sets required attributes', () => {
  const userMenuMatches = Array.from(
    tauthDemoHtml.matchAll(/<mpr-user\b([^>]*)>/gi),
  );
  assert.ok(
    userMenuMatches.length > 0,
    'Expected tauth-demo.html to include at least one <mpr-user> element',
  );
  const userMenuAttributes = userMenuMatches[0][1];
  const requiredAttributes = [
    {
      name: 'display-mode',
      pattern: /\bdisplay-mode="[^"]+"/i,
    },
    {
      name: 'logout-url',
      pattern: /\blogout-url="[^"]+"/i,
    },
    {
      name: 'logout-label',
      pattern: /\blogout-label="[^"]+"/i,
    },
    {
      name: 'tauth-tenant-id',
      pattern: /\btauth-tenant-id="[^"]+"/i,
    },
  ];

  requiredAttributes.forEach((attributeCheck) => {
    assert.match(
      userMenuAttributes,
      attributeCheck.pattern,
      `Expected <mpr-user> to include ${attributeCheck.name} in tauth-demo.html`,
    );
  });
});
