'use strict';

function formatMessage(message, expected, actual) {
  if (message) {
    return message;
  }
  return 'Expected ' + JSON.stringify(expected) + ' but received ' + JSON.stringify(actual);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(formatMessage(message, expected, actual));
  }
}

function assertDeepEqual(actual, expected, message) {
  var actualJson = JSON.stringify(actual);
  var expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(formatMessage(message, expected, actual));
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

module.exports = {
  assert: assert,
  assertEqual: assertEqual,
  assertDeepEqual: assertDeepEqual,
};
