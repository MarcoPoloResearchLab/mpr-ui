'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bundlePath = path.join(__dirname, '..', 'mpr-ui.js');

test('bundle omits deprecated render helpers', () => {
  const bundleSource = fs.readFileSync(bundlePath, 'utf8');
  const deprecatedHelpers = ['renderSiteHeader', 'renderFooter', 'renderThemeToggle'];
  deprecatedHelpers.forEach((helperName) => {
    assert.equal(
      bundleSource.includes(helperName),
      false,
      `bundle should not include deprecated helper ${helperName}`,
    );
  });
});
