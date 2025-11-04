'use strict';
const assert = require('node:assert/strict');

// equal
assert.strictEqual(actualValue, expectedValue, optionalMessage);

// deep equal
assert.deepStrictEqual(actualObject, expectedObject, optionalMessage);

// throws
assert.throws(executableFunction, optionalExpectedErrorMatcher, optionalMessage);