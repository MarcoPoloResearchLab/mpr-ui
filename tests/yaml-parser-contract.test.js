'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const yaml = require('js-yaml');
const yamlPackage = require('js-yaml/package.json');
const packageJson = require('../package.json');
const packageLock = require('../package-lock.json');

const repositoryRoot = join(__dirname, '..');
const YAML_PARSER_VERSION = '5.4.1';
const YAML_PARSER_URL =
  `https://cdn.jsdelivr.net/npm/js-yaml@${YAML_PARSER_VERSION}/dist/browser/js-yaml.umd.min.js`;
const YAML_PARSER_REFERENCE_FILES = Object.freeze([
  'mpr-ui-config.js',
  'README.md',
  'docs/integration-guide.md',
  'docs/demo-index-auth.md',
  'index.html',
  'demo/tauth-demo.html',
  'demo/entity-workspace.html',
  'demo/standalone.html',
  'tests/e2e/fixtures/config-loader.html',
  'tests/e2e/support/fixturePage.js',
  'tests/yaml-config-loader.test.js',
]);

test('B046: all shipped YAML parser references use the audited version', () => {
  assert.equal(yamlPackage.version, YAML_PARSER_VERSION);
  assert.equal(packageJson.devDependencies['js-yaml'], `^${YAML_PARSER_VERSION}`);
  assert.equal(
    packageLock.packages['node_modules/js-yaml'].version,
    YAML_PARSER_VERSION,
  );
  assert.equal(
    packageLock.packages['node_modules/brace-expansion'].version,
    '5.0.9',
  );

  for (const referenceFile of YAML_PARSER_REFERENCE_FILES) {
    const referenceContent = readFileSync(join(repositoryRoot, referenceFile), 'utf8');
    assert.match(referenceContent, new RegExp(YAML_PARSER_URL.replaceAll('.', '\\.')));
  }
});

test('B046: the current parser preserves the canonical config aliases', () => {
  const configSource = readFileSync(
    join(repositoryRoot, 'demo', 'config-ui.yaml'),
    'utf8',
  );
  const parsedConfig = yaml.load(configSource);

  assert.equal(parsedConfig.environments.length, 2);
  assert.deepEqual(
    parsedConfig.environments[1].auth,
    parsedConfig.environments[0].auth,
  );
});
