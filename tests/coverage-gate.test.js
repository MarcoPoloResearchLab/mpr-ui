// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const repoRoot = join(__dirname, '..');
const packageJson = JSON.parse(
  readFileSync(join(repoRoot, 'package.json'), 'utf8'),
);
const makefile = readFileSync(join(repoRoot, 'Makefile'), 'utf8');
const workflow = readFileSync(
  join(repoRoot, '.github', 'workflows', 'ci.yml'),
  'utf8',
);

test('MU-435: package.json defines combined Node and browser coverage scripts', () => {
  const coverageScript = packageJson.scripts && packageJson.scripts['test:coverage'];
  const nodeCoverageScript = packageJson.scripts && packageJson.scripts['test:coverage:node'];
  const browserCoverageScript = packageJson.scripts && packageJson.scripts['test:coverage:browser'];
  assert.equal(
    typeof coverageScript,
    'string',
    'Expected package.json to define test:coverage',
  );
  assert.equal(
    coverageScript,
    'npm run test:coverage:node && npm run test:coverage:browser',
    'Expected test:coverage to combine the Node and browser coverage runs',
  );
  assert.equal(
    typeof nodeCoverageScript,
    'string',
    'Expected package.json to define test:coverage:node',
  );
  assert.equal(
    typeof browserCoverageScript,
    'string',
    'Expected package.json to define test:coverage:browser',
  );
  assert.match(
    nodeCoverageScript,
    /--experimental-test-coverage/,
    'Expected test:coverage:node to enable the Node test runner coverage report',
  );
  assert.match(
    nodeCoverageScript,
    /--test-coverage-lines=100/,
    'Expected test:coverage:node to enforce 100% line coverage',
  );
  assert.match(
    nodeCoverageScript,
    /--test-coverage-functions=100/,
    'Expected test:coverage:node to enforce 100% function coverage',
  );
  assert.match(
    nodeCoverageScript,
    /--test-coverage-branches=100/,
    'Expected test:coverage:node to enforce 100% branch coverage',
  );
  assert.match(
    nodeCoverageScript,
    /--test-coverage-include=mpr-ui-config\.js/,
    'Expected test:coverage:node to include mpr-ui-config.js',
  );
  [
    'mpr-ui.js',
    'demo/demo.js',
    'demo/entity-workspace.js',
    'demo/status-panel.js',
    'demo/tauth-settings-modal.js',
  ].forEach((sourcePath) => {
    assert.doesNotMatch(
      nodeCoverageScript,
      new RegExp(`--test-coverage-include=${sourcePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      `Expected test:coverage:node to avoid claiming Node coverage for ${sourcePath}`,
    );
  });
  assert.equal(
    browserCoverageScript,
    'node scripts/run-browser-coverage.js',
    'Expected test:coverage:browser to route through the browser coverage runner',
  );
});

test('MU-435: make ci runs the coverage gate before e2e', () => {
  assert.match(
    makefile,
    /^\.PHONY:\s+test test-unit test-coverage test-e2e lint format ci$/m,
    'Expected Makefile to declare the test-coverage target',
  );
  assert.match(
    makefile,
    /^test-coverage:\n\t.*npm run test:coverage$/m,
    'Expected Makefile test-coverage target to run npm run test:coverage',
  );
  assert.match(
    makefile,
    /^ci:\s+lint format test-coverage test-e2e$/m,
    'Expected make ci to enforce the coverage gate before e2e',
  );
});

test('MU-435: GitHub workflow routes CI through make ci', () => {
  assert.match(
    workflow,
    /- name: Run make ci\s+run: make ci/,
    'Expected the GitHub Actions workflow to use make ci so the coverage gate is enforced remotely',
  );
  assert.doesNotMatch(
    workflow,
    /run:\s+npm run test:unit/,
    'Expected the GitHub Actions workflow to stop bypassing make ci for unit tests',
  );
  assert.doesNotMatch(
    workflow,
    /run:\s+npm run test:e2e/,
    'Expected the GitHub Actions workflow to stop bypassing make ci for e2e tests',
  );
});
