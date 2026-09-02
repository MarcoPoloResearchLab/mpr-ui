// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');

const repositoryRoot = join(__dirname, '..');
const bundleSource = readFileSync(join(repositoryRoot, 'mpr-ui.js'), 'utf8');
const readmeSource = readFileSync(join(repositoryRoot, 'README.md'), 'utf8');
const componentReferenceSource = readFileSync(
  join(repositoryRoot, 'docs', 'custom-elements.md'),
  'utf8',
);
const demoDirectory = join(repositoryRoot, 'demo');
const demoSource = [
  readFileSync(join(repositoryRoot, 'index.html'), 'utf8'),
  ...readdirSync(demoDirectory)
    .filter((fileName) => /\.(?:html|js)$/.test(fileName))
    .map((fileName) => readFileSync(join(demoDirectory, fileName), 'utf8')),
].join('\n');

function getRegisteredElementNames() {
  return Array.from(
    bundleSource.matchAll(/registry\.define\(\s*"(mpr-[^"]+)"/g),
    (matchResult) => matchResult[1],
  );
}

test('public documentation and demos cover every registered custom element', () => {
  const registeredElementNames = getRegisteredElementNames();

  assert.equal(registeredElementNames.length, 22, 'Expected the current public element count');
  registeredElementNames.forEach((elementName) => {
    assert.match(
      readmeSource,
      new RegExp(`<${elementName}>`),
      `Expected README.md to list <${elementName}>`,
    );
    assert.match(
      componentReferenceSource,
      new RegExp(`<${elementName}>`),
      `Expected docs/custom-elements.md to list <${elementName}>`,
    );
    assert.match(
      demoSource,
      new RegExp(elementName),
      `Expected a demo source to exercise <${elementName}>`,
    );
  });
});
