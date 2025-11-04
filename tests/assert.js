'use strict';

const assert = require('assert');

function assertEqual(actual, expected, message) {
  assert.strictEqual(actual, expected, message);
}

function assertDeepEqual(actual, expected, message) {
  assert.deepStrictEqual(actual, expected, message);
}

function assertThrows(fn, expectedError, message) {
  assert.throws(fn, expectedError, message);
}

module.exports = {
  assertEqual,
  assertDeepEqual,
  assertThrows,
};
