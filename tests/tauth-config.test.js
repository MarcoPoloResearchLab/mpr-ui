'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const fixtureRoot = join(__dirname, 'fixtures', 'tauth-config');
const envExamplePath = join(fixtureRoot, '.env.tauth.example');
const composePath = join(fixtureRoot, 'docker-compose.yml');
const configPath = join(fixtureRoot, 'tauth-config.yaml');
const repositoryRoot = join(__dirname, '..');
const demoConfigPath = join(repositoryRoot, 'demo', 'tauth-config.yaml');
const demoUserAvatarPath = join(repositoryRoot, 'demo', 'demo-user.svg');
const repositoryEnvExamplePath = join(repositoryRoot, '.env.tauth.example');
const repositoryComposePath = join(repositoryRoot, 'docker-compose.yml');
const appleProviderPath = join(repositoryRoot, 'demo', 'apple-provider');
const pinguinBootstrapPath = join(repositoryRoot, 'demo', 'bootstrap_pinguin.py');

const envExampleFixtureContents = readFileSync(envExamplePath, 'utf8');
const composeFixtureContents = readFileSync(composePath, 'utf8');
const configFixtureContents = readFileSync(configPath, 'utf8');
const demoConfigContents = readFileSync(demoConfigPath, 'utf8');
const repositoryEnvExampleContents = readFileSync(repositoryEnvExamplePath, 'utf8');
const repositoryComposeContents = readFileSync(repositoryComposePath, 'utf8');
const pinguinBootstrapContents = readFileSync(pinguinBootstrapPath, 'utf8');

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

test('F007: demo TAuth config enables password and account policies explicitly', () => {
  assert.match(demoConfigContents, /password_auth:\s*\n\s+enabled:\s+true/);
  assert.match(demoConfigContents, /account_management:\s*\n\s+enabled:\s+true/);
  assert.match(demoConfigContents, /password_signup:\s*\n\s+enabled:\s+true/);
  assert.match(demoConfigContents, /return_challenge_tokens:\s+false/);
  assert.match(demoConfigContents, /email_delivery:/);
  assert.match(demoConfigContents, /server_address:\s+"pinguin:50051"/);
  assert.match(
    demoConfigContents,
    /email_verification_url:\s+"http:\/\/localhost:4443\/demo\/tauth-demo\.html\?auth_action=verify-email"/,
  );
  assert.match(
    demoConfigContents,
    /password_reset_url:\s+"http:\/\/localhost:4443\/demo\/tauth-demo\.html\?auth_action=reset-complete"/,
  );
  assert.match(
    demoConfigContents,
    /password_link_url:\s+"http:\/\/localhost:4443\/demo\/tauth-demo\.html\?auth_action=password-link-verify"/,
  );
  assert.doesNotMatch(repositoryEnvExampleContents, /^TAUTH_PASSWORD_(?:USER_EMAIL|HASH)=/m);
  assert.match(
    repositoryComposeContents,
    /TAUTH_PASSWORD_USER_EMAIL:\s+"demo@mprlab\.local"/,
  );
  const passwordHashMatch = repositoryComposeContents.match(
    /TAUTH_PASSWORD_HASH:\s+"((?:\$\$)2[aby](?:\$\$)\d{2}(?:\$\$)[./A-Za-z0-9]{53})"/,
  );
  assert.ok(passwordHashMatch, 'Expected Compose to define the disposable bcrypt hash');
  assert.equal(passwordHashMatch[1].replaceAll('$$', '$').length, 60);
  assert.match(demoConfigContents, /avatar_url:\s+"\/demo\/demo-user\.svg"/);
  assert.equal(existsSync(demoUserAvatarPath), true);
});

test('F010: local runtime builds current TAuth and Pinguin sources with managed delivery', () => {
  assert.match(repositoryComposeContents, /tauth:[\s\S]*?build:[\s\S]*?context:\s+\.\.\/tauth/);
  assert.match(repositoryComposeContents, /pinguin:[\s\S]*?build:[\s\S]*?context:\s+\.\.\/Pinguin/);
  assert.match(repositoryComposeContents, /pinguin-bootstrap:/);
  assert.match(repositoryComposeContents, /condition:\s+service_completed_successfully/);
  assert.match(repositoryComposeContents, /PINGUIN_DEMO_API_KEY/);
  assert.match(demoConfigContents, /server_address:\s+"pinguin:50051"/);
  assert.match(pinguinBootstrapContents, /MPR UI Demo Delivery/);
  assert.match(pinguinBootstrapContents, /TENANT_LOCAL_SMTP_HOST/);
  assert.match(pinguinBootstrapContents, /api-credential/);
  assert.doesNotMatch(pinguinBootstrapContents, /pgn_1_[A-Za-z0-9_-]{20,}/);
});

test('B058: local runtime contains no simulated Apple provider', () => {
  assert.equal(existsSync(appleProviderPath), false);
  assert.doesNotMatch(repositoryComposeContents, /apple-provider/);
  assert.doesNotMatch(repositoryComposeContents, /TAUTH_APPLE_PRIVATE_KEY/);
  assert.doesNotMatch(demoConfigContents, /authorization_endpoint|token_endpoint|jwks_url/);
});

test('review: delivery administration uses a private signer and internal management API', () => {
  const { load } = require('js-yaml');
  const services = load(repositoryComposeContents).services;
  for (const mount of services.frontend.volumes) {
    const source = mount.split(':')[0];
    assert.match(source, /\.(html|js|css|svg|json|md|yaml)$/);
    assert.doesNotMatch(source, /(?:\.env|\.git|tauth-config|bootstrap_pinguin)/);
  }
  assert.equal(services.pinguin.ports, undefined);
  assert.match(services.pinguin.environment.TAUTH_SIGNING_KEY, /PINGUIN_BOOTSTRAP_SIGNING_KEY/);
  assert.equal(services.pinguin.environment.TAUTH_COOKIE_NAME, 'mpr_ui_delivery_session');
  const tenants = load(demoConfigContents).tenants;
  const owner = tenants.find((tenant) => tenant.id === 'mpr-ui-delivery-admin');
  assert.deepEqual(owner.tenant_origins, ['http://pinguin-bootstrap']);
  assert.equal(owner.account_management.enabled, false);
  assert.equal(owner.jwt_signing_key, '${PINGUIN_BOOTSTRAP_SIGNING_KEY}');
  assert.equal(owner.password_auth.users[0].password_hash, '${PINGUIN_BOOTSTRAP_PASSWORD_HASH}');
  assert.doesNotMatch(pinguinBootstrapContents, /demo@mprlab\.local|mpr-ui-demo/);
});
