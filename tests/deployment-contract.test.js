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
  'scripts/activate-jsdelivr.mjs',
  'scripts/deploy-jsdelivr.sh',
  'scripts/release/prepare_release.sh',
  'scripts/release/publish_release.sh',
  'scripts/release/release_helper.py',
]);

test('production lifecycle uses the installed Gateway without a sibling checkout', () => {
  const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'mpr-ui-lifecycle-'));
  const applicationRoot = resolve(fixtureRoot, 'consumer with spaces');
  const callsPath = resolve(fixtureRoot, 'calls.jsonl');
  const preloadPath = resolve(fixtureRoot, 'gateway-fixture.cjs');

  try {
    mkdirSync(resolve(applicationRoot, '.mprlab', 'deploy'), { recursive: true });
    writeFileSync(resolve(applicationRoot, 'Makefile'), readFileSync(resolve(REPOSITORY_ROOT, 'Makefile')));
    writeFileSync(resolve(applicationRoot, '.mprlab', 'deploy', 'resources.yml'), readFileSync(PRODUCTION_MANIFEST_PATH));
    writeFileSync(preloadPath, `
      const fs = require('node:fs');
      const phase = require('node:path').basename(process.argv[1]);
      fs.appendFileSync(process.env.GATEWAY_CALLS, JSON.stringify([phase, ...process.argv.slice(2)]) + '\\n');
      if (process.env.GATEWAY_FAIL === phase) {
        process.stderr.write('controlled Gateway activation failure\\n');
        process.exit(23);
      }
      process.exit(0);
    `);
    execFileSync('git', ['init', '--quiet'], { cwd: applicationRoot });
    const environment = {
      ...process.env,
      MPRLAB_GATEWAY_EXECUTABLE: process.execPath,
      NODE_OPTIONS: `--require=${preloadPath}`,
      GATEWAY_CALLS: callsPath,
    };
    const invoke = (targets, env = environment) => execFileSync('make', ['--no-print-directory', ...targets], {
      cwd: applicationRoot, encoding: 'utf8', env, stdio: 'pipe',
    });
    const readCalls = () => readFileSync(callsPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    invoke(['release', 'publish', 'deploy']);
    const canonicalApplicationRoot = realpathSync(applicationRoot);
    assert.deepEqual(readCalls(), ['release', 'publish', 'deploy'].map((phase) => [
      `app-${phase}`, '--app-root', canonicalApplicationRoot,
    ]));

    writeFileSync(callsPath, '');
    assert.throws(() => invoke(['release', 'publish', 'deploy'], {
      ...environment, GATEWAY_FAIL: 'app-publish',
    }), (error) => {
      assert.match(error.stderr, /controlled Gateway activation failure/);
      return true;
    });
    assert.deepEqual(readCalls().map((call) => call[0]), ['app-release', 'app-publish']);

    writeFileSync(callsPath, '');
    assert.throws(() => invoke(['publish'], {
      ...environment, MPRLAB_GATEWAY_EXECUTABLE: resolve(fixtureRoot, 'absent-gateway'),
    }), (error) => {
      assert.match(error.stderr, /Gateway runtime is unavailable/);
      return true;
    });
    assert.equal(readFileSync(callsPath, 'utf8'), '');
    for (const obsoletePath of OBSOLETE_RELEASE_PATHS) {
      assert.equal(existsSync(resolve(REPOSITORY_ROOT, obsoletePath)), false);
    }
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
          kind: 'jsdelivr',
          id: 'browser-assets',
          repository: 'MarcoPoloResearchLab/mpr-ui',
          assets: ['mpr-ui-config.js', 'mpr-ui.js', 'mpr-ui.css'],
          aliases: ['latest', 'major'],
        },
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
              key_id: 'JF79PQM899',
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

test('CDN declaration covers the exact URLs in consumer documentation', () => {
  const manifest = yaml.load(readFileSync(PRODUCTION_MANIFEST_PATH, 'utf8'));
  const resource = manifest.mprlab_resources.resources.find((entry) => entry.kind === 'jsdelivr');
  for (const document of ['README.md', 'docs/integration-guide.md']) {
    const content = readFileSync(resolve(REPOSITORY_ROOT, document), 'utf8');
    const urls = [...content.matchAll(/https:\/\/cdn\.jsdelivr\.net\/gh\/([^@\s]+)@latest\/([^"\s<>]+)/g)];
    assert.ok(urls.length > 0, `${document} has consumer CDN URLs`);
    for (const [, repository, asset] of urls) {
      assert.equal(resource.repository, repository, `${document} repository URL case`);
      assert.ok(resource.assets.includes(asset), `${document} asset ${asset}`);
    }
    assert.ok(resource.aliases.includes('latest'));
  }
});
