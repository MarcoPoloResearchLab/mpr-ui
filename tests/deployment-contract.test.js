// @ts-check

const assert = require('node:assert/strict');
const { execFile, execFileSync } = require('node:child_process');
const {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} = require('node:fs');
const { createServer } = require('node:http');
const { tmpdir } = require('node:os');
const { resolve } = require('node:path');
const test = require('node:test');
const { promisify } = require('node:util');
const yaml = require('js-yaml');

const REPOSITORY_ROOT = resolve(__dirname, '..');
const PRODUCTION_MANIFEST_PATH = resolve(
  REPOSITORY_ROOT,
  '.mprlab',
  'deploy',
  'resources.yml',
);
const JSDELIVR_ACTIVATION_PATH = resolve(
  REPOSITORY_ROOT,
  'scripts',
  'activate-jsdelivr.mjs',
);
const JSDELIVR_ASSETS = Object.freeze([
  'mpr-ui-config.js',
  'mpr-ui.css',
  'mpr-ui.js',
]);
const execFileAsync = promisify(execFile);
const OBSOLETE_RELEASE_PATHS = Object.freeze([
  'scripts/deploy-jsdelivr.sh',
  'scripts/release/prepare_release.sh',
  'scripts/release/publish_release.sh',
  'scripts/release/release_helper.py',
]);

test('production lifecycle delegates to the sibling Gateway', () => {
  const makefile = readFileSync(resolve(REPOSITORY_ROOT, 'Makefile'), 'utf8');

  assert.match(makefile, /release:\n/);
  assert.match(makefile, /publish:\n/);
  assert.match(makefile, /deploy:\n/);
  assert.match(makefile, /application_root="\$\$\(git rev-parse --show-toplevel\)"/);
  assert.match(makefile, /gateway_root="\$\$\(dirname "\$\$\{application_root\}"\)\/mprlab-gateway"/);
  assert.match(makefile, /"app-\$\(1\)"/);
  assert.match(makefile, /MPRLAB_APP_ROOT="\$\$\{application_root\}"/);
  assert.match(makefile, /node scripts\/activate-jsdelivr\.mjs/);
  assert.doesNotMatch(makefile, /prepare_release|publish_release|deploy-jsdelivr/);
  assert.equal(existsSync(JSDELIVR_ACTIVATION_PATH), true);

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
      ['--no-print-directory', 'release', 'deploy'],
      { cwd: applicationRoot, encoding: 'utf8' },
    );
    const canonicalApplicationRoot = realpathSync(applicationRoot);
    assert.deepEqual(lifecycleOutput.trim().split('\n'), [
      `app-release ${canonicalApplicationRoot}`,
      `app-deploy ${canonicalApplicationRoot}`,
    ]);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('publication activates and verifies each mutable jsDelivr alias', async () => {
  const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'mpr-ui-jsdelivr-'));
  const applicationRoot = resolve(fixtureRoot, 'mpr-ui');
  const gatewayRoot = resolve(fixtureRoot, 'mprlab-gateway');
  const originRoot = resolve(fixtureRoot, 'origin.git');
  const activatedPaths = new Set();
  const contentPaths = [];
  const purgePaths = [];
  let activationEnabled = true;
  const currentAsset = Buffer.from('current asset\n');
  const staleAsset = Buffer.from('stale asset\n');
  const provider = createServer((request, response) => {
    const requestPath = request.url ?? '';
    const purgePrefix = '/purge/gh/MarcoPoloResearchLab/mpr-ui@';
    const contentPrefix = '/cdn/gh/MarcoPoloResearchLab/mpr-ui@';
    if (requestPath.startsWith(purgePrefix)) {
      purgePaths.push(requestPath);
      if (activationEnabled) {
        activatedPaths.add(requestPath.slice('/purge'.length));
      }
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{"status":"finished"}\n');
      return;
    }
    if (requestPath.startsWith(contentPrefix)) {
      const assetPath = requestPath.split('?')[0].slice('/cdn'.length);
      contentPaths.push(assetPath);
      const immutableVersion = assetPath.includes('@v4.0.1/');
      response.writeHead(200, { 'content-type': 'application/octet-stream' });
      response.end(immutableVersion || activatedPaths.has(assetPath) ? currentAsset : staleAsset);
      return;
    }
    response.writeHead(404);
    response.end();
  });

  try {
    await new Promise((resolveListen, rejectListen) => {
      provider.once('error', rejectListen);
      provider.listen(0, '127.0.0.1', resolveListen);
    });
    const providerAddress = provider.address();
    assert.equal(typeof providerAddress, 'object');
    assert.notEqual(providerAddress, null);
    const providerOrigin = `http://127.0.0.1:${providerAddress.port}`;

    mkdirSync(resolve(applicationRoot, 'scripts'), { recursive: true });
    mkdirSync(gatewayRoot);
    writeFileSync(
      resolve(applicationRoot, 'Makefile'),
      readFileSync(resolve(REPOSITORY_ROOT, 'Makefile')),
    );
    writeFileSync(
      resolve(applicationRoot, 'scripts', 'activate-jsdelivr.mjs'),
      readFileSync(JSDELIVR_ACTIVATION_PATH),
    );
    for (const asset of JSDELIVR_ASSETS) {
      writeFileSync(resolve(applicationRoot, asset), currentAsset);
    }
    writeFileSync(
      resolve(gatewayRoot, 'Makefile'),
      'app-publish:\n\t@printf "app-publish %s\\n" "$(MPRLAB_APP_ROOT)"\n',
    );
    execFileSync('git', ['init', '--quiet'], { cwd: applicationRoot });
    execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], {
      cwd: applicationRoot,
    });
    execFileSync('git', ['config', 'user.name', 'fixture'], {
      cwd: applicationRoot,
    });
    execFileSync('git', ['add', '.'], { cwd: applicationRoot });
    execFileSync('git', ['commit', '--quiet', '-m', 'fixture'], {
      cwd: applicationRoot,
    });
    execFileSync('git', ['tag', 'v4.0.1'], { cwd: applicationRoot });
    execFileSync('git', ['init', '--bare', '--quiet', originRoot]);
    execFileSync('git', ['remote', 'add', 'origin', originRoot], {
      cwd: applicationRoot,
    });
    execFileSync('git', ['push', '--quiet', 'origin', 'HEAD:master', 'v4.0.1'], {
      cwd: applicationRoot,
    });

    const environment = {
      ...process.env,
      MPR_UI_JSDELIVR_ATTEMPTS: '2',
      MPR_UI_JSDELIVR_CDN_ORIGIN: `${providerOrigin}/cdn`,
      MPR_UI_JSDELIVR_PURGE_ORIGIN: `${providerOrigin}/purge`,
      MPR_UI_JSDELIVR_RETRY_DELAY_MS: '1',
    };
    const publication = await execFileAsync('make', ['publish'], {
      cwd: applicationRoot,
      encoding: 'utf8',
      env: environment,
    });
    assert.match(publication.stdout, /app-publish .*\/mpr-ui/);
    assert.match(publication.stdout, /Activated mpr-ui v4\.0\.1 on jsDelivr aliases latest and 4\./);
    assert.deepEqual(
      purgePaths.sort(),
      ['latest', '4']
        .flatMap((alias) => JSDELIVR_ASSETS.map(
          (asset) => `/purge/gh/MarcoPoloResearchLab/mpr-ui@${alias}/${asset}`,
        ))
        .sort(),
    );
    assert.deepEqual(
      [...new Set(contentPaths)].sort(),
      ['v4.0.1', 'latest', '4']
        .flatMap((alias) => JSDELIVR_ASSETS.map(
          (asset) => `/gh/MarcoPoloResearchLab/mpr-ui@${alias}/${asset}`,
        ))
        .sort(),
    );

    activationEnabled = false;
    activatedPaths.clear();
    await assert.rejects(
      execFileAsync('make', ['publish'], {
        cwd: applicationRoot,
        encoding: 'utf8',
        env: environment,
      }),
      (error) => {
        assert.match(error.stderr, /jsDelivr latest\/mpr-ui-config\.js did not activate v4\.0\.1/);
        return true;
      },
    );
  } finally {
    await new Promise((resolveClose) => provider.close(resolveClose));
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
