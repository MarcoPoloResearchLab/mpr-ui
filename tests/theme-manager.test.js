'use strict';

const path = require('path');
const { assertEqual, assertDeepEqual } = require('./assert');

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

function testNormalizesInvalidModeToFallback() {
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
    assertEqual(result, 'dusk', 'setThemeMode should return the applied fallback mode');
    assertEqual(namespace.getThemeMode(), 'dusk', 'getThemeMode should match the applied fallback mode');
    assertEqual(events.length, 1, 'Invalid mode should still notify listeners once');
    assertDeepEqual(
      events[0],
      { mode: 'dusk', source: 'external' },
      'Listeners should receive the normalized mode in the event detail',
    );
  });
}

function testInvalidModeAfterReconfigureNotifiesWithCurrentMode() {
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
    assertEqual(
      namespace.getThemeMode(),
      'light',
      'Reconfiguring should normalize the current mode to the first available option',
    );
    const { events, unsubscribe } = captureThemeEvents(namespace);
    const result = namespace.setThemeMode('sunset');
    unsubscribe();
    assertEqual(result, 'light', 'setThemeMode should return the resolved current mode when the value is invalid');
    assertEqual(
      namespace.getThemeMode(),
      'light',
      'Invalid updates after reconfiguration should leave the current mode untouched',
    );
    assertEqual(events.length, 1, 'Invalid mode should still emit a notification with the normalized mode');
    assertDeepEqual(
      events[0],
      { mode: 'light', source: 'external' },
      'Listeners should receive the normalized mode detail after invalid updates',
    );
  });
}

const tests = [
  ['normalizes invalid mode to fallback', testNormalizesInvalidModeToFallback],
  ['invalid mode after reconfigure notifies with current mode', testInvalidModeAfterReconfigureNotifiesWithCurrentMode],
];

let failures = 0;

tests.forEach(function runTestEntry(entry) {
  const name = entry[0];
  const testFn = entry[1];
  try {
    testFn();
    console.log('✓ ' + name);
  } catch (error) {
    failures += 1;
    console.error('✗ ' + name);
    console.error(error.stack);
  }
});

if (failures > 0) {
  process.exitCode = 1;
}
