'use strict';

const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

function createClassList() {
  const values = new Set();
  return {
    add() {
      for (let index = 0; index < arguments.length; index += 1) {
        const entry = arguments[index];
        if (entry) values.add(String(entry));
      }
    },
    remove() {
      for (let index = 0; index < arguments.length; index += 1) {
        const entry = arguments[index];
        values.delete(String(entry));
      }
    },
    contains(entry) {
      return values.has(String(entry));
    },
  };
}

function createThemeElement() {
  const attributes = {};
  return {
    classList: createClassList(),
    dataset: {},
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name)
        ? attributes[name]
        : null;
    },
    removeAttribute(name) {
      delete attributes[name];
    },
  };
}

function createThemeDocument(selectorMap) {
  const documentElement = createThemeElement();
  const body = createThemeElement();
  const selectors = selectorMap || {};
  return {
    documentElement,
    body,
    head: { appendChild() {} },
    querySelectorAll(selector) {
      if (Object.prototype.hasOwnProperty.call(selectors, selector)) {
        return selectors[selector].slice();
      }
      return [];
    },
  };
}

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

test('configureTheme applies classes and dataset updates across targets', () => {
  withFreshThemeManager(function runTest(namespace) {
    global.document = createThemeDocument();
    namespace.configureTheme({
      attribute: 'data-demo-theme',
      targets: ['body'],
      modes: [
        {
          value: 'light',
          attributeValue: 'light',
          classList: ['theme-light'],
          dataset: { 'demo-theme': 'light' },
        },
        {
          value: 'dark',
          attributeValue: 'dark',
          classList: ['theme-dark'],
          dataset: { 'demo-theme': 'dark' },
        },
      ],
      initialMode: 'light',
    });

    assert.strictEqual(
      namespace.getThemeMode(),
      'light',
      'configureTheme should honour the provided initial mode',
    );
    assert.strictEqual(
      global.document.body.getAttribute('data-demo-theme'),
      'light',
      'Body should receive the dataset attribute for the initial mode',
    );
    assert.strictEqual(
      global.document.body.classList.contains('theme-light'),
      true,
      'Body should include the class representing the initial mode',
    );

    namespace.setThemeMode('dark');

    assert.strictEqual(
      global.document.body.getAttribute('data-demo-theme'),
      'dark',
      'Body dataset attribute should update after switching modes',
    );
    assert.strictEqual(
      global.document.body.classList.contains('theme-light'),
      false,
      'Body should remove the previous mode class',
    );
    assert.strictEqual(
      global.document.body.classList.contains('theme-dark'),
      true,
      'Body should include the new mode class after toggling',
    );
    assert.strictEqual(
      global.document.documentElement.getAttribute('data-demo-theme'),
      'dark',
      'Document element should receive the configured attribute value',
    );
  });
});

test('configureTheme preserves the document target when extending target list', () => {
  withFreshThemeManager(function runTest(namespace) {
    const panel = createThemeElement();
    global.document = createThemeDocument({ '.panel': [panel] });

    namespace.configureTheme({
      targets: ['.panel'],
      modes: [
        { value: 'light', attributeValue: 'light' },
        { value: 'dark', attributeValue: 'dark' },
      ],
      initialMode: 'light',
    });

    namespace.setThemeMode('dark');

    assert.strictEqual(
      global.document.documentElement.getAttribute('data-mpr-theme'),
      'dark',
      'Document element should continue receiving updates after extending targets',
    );
    assert.strictEqual(
      panel.getAttribute('data-mpr-theme'),
      'dark',
      'Custom target elements should receive updates alongside the document element',
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
