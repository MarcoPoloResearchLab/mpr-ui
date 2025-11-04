'use strict';

const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

function withFreshThemeManager(run) {
  const previousDocument = global.document;
  delete global.document;
  delete global.MPRUI;
  const modulePath = path.join(__dirname, '..', 'mpr-ui.js');
  delete require.cache[require.resolve(modulePath)];
  require(modulePath);
  try {
    run(global.MPRUI);
  } finally {
    delete require.cache[require.resolve(modulePath)];
    delete global.MPRUI;
    if (previousDocument === undefined) {
      delete global.document;
    } else {
      global.document = previousDocument;
    }
  }
}

function captureThemeEvents(namespace) {
  const events = [];
  const unsubscribe = namespace.onThemeChange(function onThemeChange(detail) {
    events.push(detail);
  });
  return { events, unsubscribe };
}

test('normalizes invalid mode to fallback', () => {
  withFreshThemeManager(function runTest(namespace) {
    namespace.configureTheme({
      modes: [
        { value: 'dusk', attributeValue: 'dusk' },
        { value: 'midnight', attributeValue: 'midnight' },
      ],
      initialMode: 'midnight',
    });
    namespace.setThemeMode('midnight');
    const { events, unsubscribe } = captureThemeEvents(namespace);
    const result = namespace.setThemeMode('invalid-mode');
    unsubscribe();

    assert.strictEqual(result, 'dusk', 'setThemeMode should return the applied fallback mode');
    assert.strictEqual(
      namespace.getThemeMode(),
      'dusk',
      'getThemeMode should match the applied fallback mode',
    );
    assert.strictEqual(events.length, 1, 'Invalid mode should still notify listeners once');
    assert.deepStrictEqual(
      events[0],
      { mode: 'dusk', source: 'external' },
      'Listeners should receive the normalized mode in the event detail',
    );
  });
});

test('invalid mode after reconfigure notifies with current mode', () => {
  withFreshThemeManager(function runTest(namespace) {
    namespace.configureTheme({
      modes: [
        { value: 'sunrise', attributeValue: 'sunrise' },
        { value: 'sunset', attributeValue: 'sunset' },
      ],
    });
    const { unsubscribe: unsubscribeInitial } = captureThemeEvents(namespace);
    namespace.setThemeMode('sunset');
    unsubscribeInitial();

    namespace.configureTheme({
      modes: [
        { value: 'light', attributeValue: 'light' },
        { value: 'dark', attributeValue: 'dark' },
      ],
    });
    assert.strictEqual(
      namespace.getThemeMode(),
      'light',
      'Reconfiguring should normalize the current mode to the first available option',
    );

    const { events, unsubscribe } = captureThemeEvents(namespace);
    const result = namespace.setThemeMode('sunset');
    unsubscribe();

    assert.strictEqual(
      result,
      'light',
      'setThemeMode should return the resolved current mode when the value is invalid',
    );
    assert.strictEqual(
      namespace.getThemeMode(),
      'light',
      'Invalid updates after reconfiguration should leave the current mode untouched',
    );
    assert.strictEqual(
      events.length,
      1,
      'Invalid mode should still emit a notification with the normalized mode',
    );
    assert.deepStrictEqual(
      events[0],
      { mode: 'light', source: 'external' },
      'Listeners should receive the normalized mode detail after invalid updates',
    );
  });
});
