'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const fixtureRoot = join(__dirname, 'fixtures', 'tauth-config');
const envExamplePath = join(fixtureRoot, '.env.tauth.example');
const composePath = join(fixtureRoot, 'docker-compose.yml');
const configPath = join(fixtureRoot, 'tauth-config.yaml');

const envExampleFixtureContents = readFileSync(envExamplePath, 'utf8');
const composeFixtureContents = readFileSync(composePath, 'utf8');
const configFixtureContents = readFileSync(configPath, 'utf8');

test('tauth env example uses TAUTH_* variables', () => {
  const requiredVariables = [
    'TAUTH_CONFIG_FILE=',
    'TAUTH_LISTEN_ADDR=',
    'TAUTH_GOOGLE_WEB_CLIENT_ID=',
    'TAUTH_JWT_SIGNING_KEY=',
    'TAUTH_DATABASE_URL=',
    'TAUTH_ENABLE_CORS=',
    'TAUTH_CORS_ORIGIN_1=',
    'TAUTH_CORS_ORIGIN_2=',
    'TAUTH_CORS_ORIGIN_3=',
    'TAUTH_CORS_EXCEPTION_1=',
    'TAUTH_ALLOW_INSECURE_HTTP=',
    'TAUTH_TENANT_ID_1=',
  ];

  requiredVariables.forEach((requiredVariable) => {
    assert.match(
      envExampleFixtureContents,
      new RegExp(`^${requiredVariable}`, 'm'),
      `Expected tauth env fixture to include ${requiredVariable}`,
    );
  });

  assert.doesNotMatch(
    envExampleFixtureContents,
    /^APP_[A-Z_]+=.+$/m,
    'Expected tauth env fixture to avoid legacy APP_* variables',
  );
});

test('tauth docker compose mounts the yaml config', () => {
  assert.match(
    composeFixtureContents,
    /tauth-config\.yaml/,
    'Expected docker-compose fixture to mount tauth-config.yaml',
  );
});

test('tauth yaml config wires tenants and tenant override flag', () => {
  assert.match(
    configFixtureContents,
    /tenants:/,
    'Expected tauth-config fixture to define a tenants list',
  );
  assert.match(
    configFixtureContents,
    /id:\s*\$\{TAUTH_TENANT_ID_1\}/,
    'Expected tauth-config fixture to use TAUTH_TENANT_ID_1 for tenant id',
  );
  assert.match(
    configFixtureContents,
    /enable_tenant_header_override:/,
    'Expected tauth-config fixture to define enable_tenant_header_override',
  );
  assert.match(
    configFixtureContents,
    /cors_allowed_origin_exceptions:/,
    'Expected tauth-config fixture to include cors_allowed_origin_exceptions',
  );
});
