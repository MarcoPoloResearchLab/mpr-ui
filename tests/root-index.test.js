'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const repoRoot = join(__dirname, '..');
const indexHtmlPath = join(repoRoot, 'index.html');

test('root index.html contains the demo hub content', () => {
  const indexHtml = readFileSync(indexHtmlPath, 'utf8');
  assert.match(
    indexHtml,
    /<title>mpr-ui Demo<\/title>/i,
    'Expected the root index.html to be the demo hub',
  );
  assert.match(
    indexHtml,
    /<mpr-header[\s\S]*?id="demo-header"/i,
    'Expected root index.html to include the mpr-header',
  );
  assert.doesNotMatch(
    indexHtml,
    /http-equiv="refresh"/i,
    'Expected root index.html to stop using meta refresh redirect',
  );
});
