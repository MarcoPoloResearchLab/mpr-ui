// @ts-check

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const yaml = require('js-yaml');
const yamlPackage = require('js-yaml/package.json');
const packageJson = require('../package.json');
const packageLock = require('../package-lock.json');

const repositoryRoot = join(__dirname, '..');
const YAML_PARSER_CDN_ORIGIN = 'https://cdn.jsdelivr.net/npm/';
const YAML_PARSER_PACKAGE_NAME = 'js-yaml';
const PACKAGE_VERSION_SEPARATOR = '@';
const YAML_PARSER_REFERENCE_PREFIX =
  `${YAML_PARSER_CDN_ORIGIN}${YAML_PARSER_PACKAGE_NAME}`;
const YAML_PARSER_VERSION = '5.4.1';
const YAML_PARSER_URL =
  `${YAML_PARSER_REFERENCE_PREFIX}${PACKAGE_VERSION_SEPARATOR}${YAML_PARSER_VERSION}/dist/browser/js-yaml.umd.min.js`;
const YAML_PARSER_URL_TERMINATORS = Object.freeze(
  new Set([' ', '\n', '\r', '\t', '"', "'", '<', '>', '`', ')']),
);

/**
 * Finds jsDelivr parser URLs in repository text.
 * @param {string} referenceContent
 * @returns {string[]}
 */
function findYamlParserUrls(referenceContent) {
  const referenceUrls = [];
  let referenceStart = referenceContent.indexOf(YAML_PARSER_REFERENCE_PREFIX);

  while (referenceStart !== -1) {
    let referenceEnd = referenceStart;
    while (
      referenceEnd < referenceContent.length &&
      !YAML_PARSER_URL_TERMINATORS.has(referenceContent[referenceEnd])
    ) {
      referenceEnd += 1;
    }
    referenceUrls.push(referenceContent.slice(referenceStart, referenceEnd));
    referenceStart = referenceContent.indexOf(YAML_PARSER_REFERENCE_PREFIX, referenceEnd);
  }

  return referenceUrls;
}

/**
 * Finds parser URLs that do not match the canonical audited URL.
 * @param {string} referenceContent
 * @returns {string[]}
 */
function findNoncanonicalYamlParserUrls(referenceContent) {
  return findYamlParserUrls(referenceContent).filter(
    (referenceUrl) => referenceUrl !== YAML_PARSER_URL,
  );
}

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

  const referenceFiles = execFileSync(
    'git',
    ['grep', '-l', '-I', '-F', YAML_PARSER_REFERENCE_PREFIX, '--', '.'],
    { cwd: repositoryRoot, encoding: 'utf8' },
  ).trim().split(/\r?\n/);

  for (const referenceFile of referenceFiles) {
    const referenceContent = readFileSync(join(repositoryRoot, referenceFile), 'utf8');
    assert.deepEqual(
      findNoncanonicalYamlParserUrls(referenceContent),
      [],
      `${referenceFile} contains a noncanonical ${YAML_PARSER_PACKAGE_NAME} URL`,
    );
  }
});

test('B046: parser reference validation rejects noncanonical URL forms', () => {
  const staleVersionUrl =
    `${YAML_PARSER_REFERENCE_PREFIX}@4.1.0/dist/js-yaml.min.js`;
  const unversionedUrl =
    `${YAML_PARSER_REFERENCE_PREFIX}/dist/browser/js-yaml.umd.min.js`;
  const suffixedUrl = `${YAML_PARSER_URL}.backup`;
  const cases = [
    {
      name: 'canonical reference',
      referenceContent: YAML_PARSER_URL,
      expectedNoncanonicalUrls: [],
    },
    {
      name: 'canonical and stale references',
      referenceContent: `${YAML_PARSER_URL}\n${staleVersionUrl}`,
      expectedNoncanonicalUrls: [staleVersionUrl],
    },
    {
      name: 'unversioned reference',
      referenceContent: unversionedUrl,
      expectedNoncanonicalUrls: [unversionedUrl],
    },
    {
      name: 'suffixed canonical reference',
      referenceContent: suffixedUrl,
      expectedNoncanonicalUrls: [suffixedUrl],
    },
  ];

  for (const testCase of cases) {
    assert.deepEqual(
      findNoncanonicalYamlParserUrls(testCase.referenceContent),
      testCase.expectedNoncanonicalUrls,
      testCase.name,
    );
  }
});

test('B046: the current parser preserves the canonical provider maps', () => {
  const configSource = readFileSync(
    join(repositoryRoot, 'demo', 'config-ui.yaml'),
    'utf8',
  );
  const parsedConfig = /** @type {{ environments: Array<{ auth: unknown }> }} */ (
    yaml.load(configSource)
  );

  assert.equal(parsedConfig.environments.length, 3);
  assert.deepEqual(
    parsedConfig.environments.map((environment) => {
      const auth = /** @type {{ providers: { google: { enabled: boolean }, apple: { enabled: boolean } } }} */ (
        environment.auth
      );
      return {
        google: auth.providers.google.enabled,
        apple: auth.providers.apple.enabled,
      };
    }),
    [
      { google: true, apple: false },
      { google: true, apple: true },
      { google: false, apple: true },
    ],
  );
});
