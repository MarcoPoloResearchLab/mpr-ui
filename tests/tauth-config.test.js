'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const repoRoot = join(__dirname, '..');
const envExamplePath = join(repoRoot, '.env.tauth.example');
const composePath = join(repoRoot, 'docker-compose.yml');
const configPath = join(repoRoot, 'tauth-config.yaml');

const envExampleContents = readFileSync(envExamplePath, 'utf8');
const composeContents = readFileSync(composePath, 'utf8');
const configContents = readFileSync(configPath, 'utf8');

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
      envExampleContents,
      new RegExp(`^${requiredVariable}`, 'm'),
      `Expected .env.tauth.example to include ${requiredVariable}`,
    );
  });

  assert.doesNotMatch(
    envExampleContents,
    /^APP_[A-Z_]+=.+$/m,
    'Expected .env.tauth.example to avoid legacy APP_* variables',
  );
});

test('tauth docker compose mounts the yaml config', () => {
  assert.match(
    composeContents,
    /tauth-config\.yaml/,
    'Expected docker-compose.yml to mount tauth-config.yaml',
  );
});

test('tauth yaml config wires tenants and tenant override flag', () => {
  assert.match(
    configContents,
    /tenants:/,
    'Expected tauth-config.yaml to define a tenants list',
  );
  assert.match(
    configContents,
    /id:\s*\$\{TAUTH_TENANT_ID_1\}/,
    'Expected tauth-config.yaml to use TAUTH_TENANT_ID_1 for tenant id',
  );
  assert.match(
    configContents,
    /enable_tenant_header_override:/,
    'Expected tauth-config.yaml to define enable_tenant_header_override',
  );
  assert.match(
    configContents,
    /cors_allowed_origin_exceptions:/,
    'Expected tauth-config.yaml to include cors_allowed_origin_exceptions',
  );
});
