// @ts-check
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('product catalog produces the public dropdown contract', async () => {
  const { createProductMenu } = await import('../product-catalog.mjs');
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/product-catalog.json'), 'utf8'));
  const menu = createProductMenu(catalog);
  const evidence = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/product-catalog-verification.json'), 'utf8'));
  assert.deepEqual(evidence.selected, catalog.products);
  for (const product of catalog.products) {
    assert.ok(evidence.observations.some(result => result.status === 200 && result.finalUrl === product.href), product.id);
  }
  assert.equal(menu.label, 'Explore MPR Lab');
  assert.equal(menu.placement, 'top');
  assert.deepEqual(menu.sections.map(section => section.mode), ['static', 'expanded', 'collapsed', 'collapsed', 'collapsed']);
  assert.deepEqual(menu.sections[0].links.map(link => link.label), ['About MPR Lab', 'All projects']);
  assert.equal(menu.sections.slice(1).flatMap(section => section.links).length, catalog.products.length);
  for (const product of catalog.products) {
    assert.ok(menu.sections.find(section => section.id === product.category).links.some(link => link.label === `${product.name} — ${product.purpose}` && link.href === product.href));
  }
  for (const mutate of [
    value => { value.schemaVersion = 2; },
    value => { value.products[0].href = 'javascript:alert(1)'; },
    value => { value.products[0].category = 'unknown'; },
    value => { value.products.push(value.products[0]); },
    value => { value.products[0].purpose = ''; },
    value => { value.sections[0].mode = 'unknown'; }
  ]) {
    const invalid = structuredClone(catalog);
    mutate(invalid);
    assert.throws(() => createProductMenu(invalid), /product catalog/i);
  }
});
