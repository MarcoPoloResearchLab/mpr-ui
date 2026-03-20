'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const repoRoot = join(__dirname, '..');
const indexHtmlPath = join(repoRoot, 'index.html');

test('root index.html contains the demo hub content and NO redirects', () => {
  const indexHtml = readFileSync(indexHtmlPath, 'utf8');
  
  // 1. Content Verification
  assert.match(
    indexHtml,
    /<title>mpr-ui Demo<\/title>/i,
    'Expected the root index.html to be the demo hub',
  );
  assert.match(
    indexHtml,
    /data-layout-section="hero-title"/i,
    'Expected root index.html to include the landing page hero section',
  );
  assert.match(
    indexHtml,
    /<mpr-header[\s\S]*?id="demo-header"/i,
    'Expected root index.html to include the mpr-header',
  );
  assert.match(
    indexHtml,
    /"label"\s*:\s*"Index demo"\s*,\s*"href"\s*:\s*"\.\/index\.html"/,
    'Expected root hub to link to itself correctly',
  );

  // 2. No Redirect Verification
  assert.doesNotMatch(
    indexHtml,
    /http-equiv="refresh"/i,
    'Expected root index.html to NOT use meta refresh redirect',
  );
  assert.doesNotMatch(
    indexHtml,
    /window\.location\.replace\(['"]\/demo\/index\.html['"]\)/i,
    'Expected root index.html to NOT use JavaScript window.location.replace redirect',
  );
  assert.doesNotMatch(
    indexHtml,
    /window\.location\.href\s*=\s*['"]\/demo\/index\.html['"]/i,
    'Expected root index.html to NOT use JavaScript window.location.href redirect',
  );
});
