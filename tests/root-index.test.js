'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const rootIndexHtml = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

test('root index redirects to the demo landing page', () => {
  assert.match(
    rootIndexHtml,
    /content="0;\s*url=\/demo\/index\.html"/i,
    'Expected the root index.html file to redirect to /demo/index.html',
  );
  assert.match(
    rootIndexHtml,
    /window\.location\.replace\('\/demo\/index\.html'\)/,
    'Expected the root index.html file to include a JavaScript redirect fallback',
  );
});
