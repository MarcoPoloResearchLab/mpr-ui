'use strict';

const assert = require('node:assert/strict');

function assertEqual(actualValue, expectedValue, optionalMessage) {
  assert.strictEqual(actualValue, expectedValue, optionalMessage);
}

function assertDeepEqual(actualObject, expectedObject, optionalMessage) {
  assert.deepStrictEqual(actualObject, expectedObject, optionalMessage);
}

function assertThrows(executableFunction, optionalExpectedErrorMatcher, optionalMessage) {
  if (optionalExpectedErrorMatcher === undefined) {
    assert.throws(executableFunction, optionalMessage);
    return;
  }
  assert.throws(executableFunction, optionalExpectedErrorMatcher, optionalMessage);
}

module.exports = {
  assertEqual,
  assertDeepEqual,
  assertThrows,
};