// @ts-check

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { resolve } = require('node:path');
const test = require('node:test');
const yaml = require('js-yaml');

const REPOSITORY_ROOT = resolve(__dirname, '..');
const PRODUCTION_MANIFEST_PATH = resolve(
  REPOSITORY_ROOT,
  '.mprlab',
  'deploy',
  'resources.yml',
);
const OBSOLETE_RELEASE_PATHS = Object.freeze([
  'scripts/deploy-jsdelivr.sh',
  'scripts/release/prepare_release.sh',
  'scripts/release/publish_release.sh',
  'scripts/release/release_helper.py',
]);

test('production lifecycle delegates to the sibling Gateway', () => {
  const makefile = readFileSync(resolve(REPOSITORY_ROOT, 'Makefile'), 'utf8');

  assert.match(makefile, /release publish deploy:\n/);
  assert.match(makefile, /application_root="\$\$\(git rev-parse --show-toplevel\)"/);
  assert.match(makefile, /gateway_root="\$\$\(dirname "\$\$\{application_root\}"\)\/mprlab-gateway"/);
  assert.match(makefile, /"app-\$@"/);
  assert.match(makefile, /MPRLAB_APP_ROOT="\$\$\{application_root\}"/);
  assert.doesNotMatch(makefile, /prepare_release|publish_release|deploy-jsdelivr/);

  for (const obsoleteReleasePath of OBSOLETE_RELEASE_PATHS) {
    assert.equal(existsSync(resolve(REPOSITORY_ROOT, obsoleteReleasePath)), false);
  }

  const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'mpr-ui-lifecycle-'));
  const applicationRoot = resolve(fixtureRoot, 'mpr-ui');
  const gatewayRoot = resolve(fixtureRoot, 'mprlab-gateway');

  try {
    mkdirSync(applicationRoot);
    mkdirSync(gatewayRoot);
    writeFileSync(resolve(applicationRoot, 'Makefile'), makefile);
    writeFileSync(
      resolve(gatewayRoot, 'Makefile'),
      [
        'app-release app-publish app-deploy:',
        '\t@printf "%s %s\\n" "$@" "$(MPRLAB_APP_ROOT)"',
        '',
      ].join('\n'),
    );
    execFileSync('git', ['init', '--quiet'], { cwd: applicationRoot });

    const lifecycleOutput = execFileSync(
      'make',
      ['release', 'publish', 'deploy'],
      { cwd: applicationRoot, encoding: 'utf8' },
    );
    const canonicalApplicationRoot = realpathSync(applicationRoot);
    assert.deepEqual(lifecycleOutput.trim().split('\n'), [
      `app-release ${canonicalApplicationRoot}`,
      `app-publish ${canonicalApplicationRoot}`,
      `app-deploy ${canonicalApplicationRoot}`,
    ]);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('production manifest declares the public demo and its TAuth tenant', () => {
  const manifest = yaml.load(readFileSync(PRODUCTION_MANIFEST_PATH, 'utf8'));
  assert.deepEqual(manifest, {
    mprlab_resources: {
      owner: 'mpr-ui',
      release: { scheme: 'semver' },
      resources: [
        {
          kind: 'private_values',
          id: 'private',
          bindings: {
            'apple-private-key': 'MPR_UI_APPLE_PRIVATE_KEY',
            'email-delivery-api-key': 'MPR_UI_EMAIL_DELIVERY_API_KEY',
            'google-web-client-id': 'MPR_UI_GOOGLE_WEB_CLIENT_ID',
            'jwt-signing-key': 'MPR_UI_JWT_SIGNING_KEY',
          },
        },
        {
          kind: 'github_pages',
          id: 'demo-site',
          repository: 'MarcoPoloResearchLab/mpr-ui',
          branch: 'gh-pages',
          domain: 'ui.mprlab.com',
          url: 'https://ui.mprlab.com/',
          source: {
            kind: 'container',
            context: '.',
            dockerfile: 'Dockerfile.pages',
          },
          verification: { path: '/.mprlab-release.json' },
        },
        {
          kind: 'tauth_tenant',
          id: 'demo-authentication',
          capability: 'tauth.tenants',
          version: 1,
          tenant: {
            id: 'mpr-ui-demo',
            display_name: 'MPR UI Demo',
            origins: [
              'http://127.0.0.1:4443',
              'http://localhost:4443',
              'https://ui.mprlab.com',
            ],
            google_web_client_id: {
              resource: 'private',
              output: 'google-web-client-id',
            },
            apple_oauth: {
              client_id: 'com.mprlab.ui',
              team_id: 'Z9ZW6HDGML',
              key_id: 'FSPJR9M37P',
              private_key: {
                resource: 'private',
                output: 'apple-private-key',
              },
              redirect_uri: 'https://tauth-api.mprlab.com/auth/apple/callback',
            },
            password_auth: { enabled: true },
            account_management: {
              enabled: true,
              password_signup: { enabled: true },
              return_challenge_tokens: false,
              email_verification_ttl: '30m',
              email_delivery: {
                server_address: 'pinguin:50051',
                api_key: {
                  resource: 'private',
                  output: 'email-delivery-api-key',
                },
                email_verification_url:
                  'https://ui.mprlab.com/demo/tauth-demo.html?auth_action=verify-email',
                password_reset_url:
                  'https://ui.mprlab.com/demo/tauth-demo.html?auth_action=reset-complete',
                password_link_url:
                  'https://ui.mprlab.com/demo/tauth-demo.html?auth_action=password-link-verify',
                connection_timeout_seconds: 5,
                operation_timeout_seconds: 30,
              },
              password_reset_ttl: '15m',
            },
            jwt_signing_key: {
              resource: 'private',
              output: 'jwt-signing-key',
            },
            cookie: {
              domain: '.mprlab.com',
              session_name: 'mpr_ui_demo_session',
              refresh_name: 'mpr_ui_demo_refresh',
            },
          },
        },
      ],
    },
  });
});
