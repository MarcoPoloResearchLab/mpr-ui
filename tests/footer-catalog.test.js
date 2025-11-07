'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const EXPECTED_SITES = [
  { label: 'Marco Polo Research Lab', url: 'https://mprlab.com' },
  { label: 'Gravity Notes', url: 'https://gravity.mprlab.com' },
  { label: 'LoopAware', url: 'https://loopaware.mprlab.com' },
  { label: 'Allergy Wheel', url: 'https://allergy.mprlab.com' },
  { label: 'Social Threader', url: 'https://threader.mprlab.com' },
  { label: 'RSVP', url: 'https://rsvp.mprlab.com' },
  { label: 'Countdown Calendar', url: 'https://countdown.mprlab.com' },
  { label: 'LLM Crossword', url: 'https://llm-crossword.mprlab.com' },
  { label: 'Prompt Bubbles', url: 'https://prompts.mprlab.com' },
  { label: 'Wallpapers', url: 'https://wallpapers.mprlab.com' },
];

function resetLibrary() {
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('mpr-ui.js')) {
      delete require.cache[key];
    }
  });
  delete global.MPRUI;
  delete global.document;
  delete global.window;
}

function loadLibrary() {
  resetLibrary();
  require('../mpr-ui.js');
  return global.MPRUI;
}

test('getFooterSiteCatalog exposes the packaged Marco Polo Research Lab sites', () => {
  const library = loadLibrary();
  assert.equal(
    typeof library.getFooterSiteCatalog,
    'function',
    'mpr-ui should export getFooterSiteCatalog',
  );
  const catalog = library.getFooterSiteCatalog();
  assert.deepEqual(
    catalog,
    EXPECTED_SITES,
    'getFooterSiteCatalog should mirror the packaged footer sites',
  );
});

test('getFooterSiteCatalog returns a new copy on each call', () => {
  const library = loadLibrary();
  const firstCall = library.getFooterSiteCatalog();
  const secondCall = library.getFooterSiteCatalog();

  assert.notStrictEqual(
    firstCall,
    secondCall,
    'getFooterSiteCatalog should return a new array to allow safe mutations by consumers',
  );

  firstCall.push({ label: 'Extra', url: '#' });
  assert.strictEqual(
    secondCall.length,
    EXPECTED_SITES.length,
    'Mutating one catalog copy must not affect future reads',
  );
});
