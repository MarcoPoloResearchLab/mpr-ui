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

test('production manifest declares the public demo and native delivery bindings', () => {
  const manifest = yaml.load(readFileSync(PRODUCTION_MANIFEST_PATH, 'utf8')).mprlab_resources;
  assert.deepEqual(Object.keys(manifest).sort(), ['artifacts', 'environment', 'lifecycle', 'owner', 'publications', 'release', 'targets']);
  assert.equal(manifest.owner, 'mpr-ui');
  assert.deepEqual(manifest.release, { scheme: 'semver' });
  assert.equal(manifest.environment.source, '.mprlab/deploy/.env');
  assert.deepEqual(manifest.environment.private_inputs.map(({ variable }) => variable).sort(), [
    'MPRLAB_TAUTH_MANAGEMENT_URL', 'MPRLAB_TAUTH_PROVISIONING_CREDENTIALS', 'MPR_UI_APPLE_PRIVATE_KEY',
    'MPR_UI_EMAIL_DELIVERY_API_KEY', 'MPR_UI_GOOGLE_WEB_CLIENT_ID', 'MPR_UI_JWT_SIGNING_KEY', 'DEPLOY_SUDO_PASSWORD_TUTOSH',
  ].sort());
  assert.equal(new Set(manifest.environment.private_inputs.map(({ id }) => id)).size, 7);
  assert.deepEqual(manifest.targets.access.hosts, [{ host: 'tutosh', elevation_password: { input: 'deploy-sudo-password-tutosh' } }]);
  assert.deepEqual(manifest.lifecycle.defaults, { timeouts: { startup: '2m', completion: '30m', readiness: '5m', request: '30s', shutdown: '30s' } });
  assert.deepEqual(manifest.lifecycle.operations.map(({ name, ...policy }) => ({ name, ...policy })).sort((left, right) => left.name.localeCompare(right.name)), [
    'app_lifecycle.repository_read', 'app-release', 'app-publish', 'app-deploy',
  ].map(name => ({ name, polling: { initial: '2s', maximum: '15s', increment: '2s', multiplier: 2, attempt_limit: 60 } })).sort((left, right) => left.name.localeCompare(right.name)));
  assert.deepEqual(manifest.lifecycle.ci, { enabled: true, command: ['env', 'CI=1', 'make', 'ci'] });
  assert.deepEqual(manifest.artifacts.asset_sets, [{ id: 'browser-assets', assets: ['mpr-ui-config.js', 'mpr-ui.js', 'mpr-ui.css'] }]);
  assert.deepEqual(manifest.publications.git.assets, [{ id: 'browser-assets', artifact: 'browser-assets', repository: 'MarcoPoloResearchLab/mpr-ui' }]);
  assert.deepEqual(manifest.targets.jsdelivr.distributions, [{ id: 'browser-assets', publication: 'browser-assets', aliases: ['latest', 'major'] }]);
  assert.deepEqual(manifest.artifacts.web_bundles, [{ id: 'demo-site', format: 'directory', source: { kind: 'container', context: '.', dockerfile: 'Dockerfile.pages' } }]);
  assert.deepEqual(manifest.publications.github_pages.sites, [{ id: 'demo-site', artifact: 'demo-site', repository: 'MarcoPoloResearchLab/mpr-ui', branch: 'gh-pages', domain: 'ui.mprlab.com', marker: { path: '/.mprlab-release.json' } }]);
  assert.deepEqual(manifest.targets.github_pages.sites, [{ id: 'demo-site', publication: 'demo-site', url: 'https://ui.mprlab.com/' }]);
});

test('CDN declaration covers the exact URLs in consumer documentation', () => {
  const manifest = yaml.load(readFileSync(PRODUCTION_MANIFEST_PATH, 'utf8'));
  const selected = manifest.mprlab_resources;
  const target = selected.targets.jsdelivr.distributions.find(({ id }) => id === 'browser-assets');
  const publication = selected.publications.git.assets.find(({ id }) => id === target.publication);
  const artifact = selected.artifacts.asset_sets.find(({ id }) => id === publication.artifact);
  for (const document of ['README.md', 'docs/integration-guide.md']) {
    const content = readFileSync(resolve(REPOSITORY_ROOT, document), 'utf8');
    const urls = [...content.matchAll(/https:\/\/cdn\.jsdelivr\.net\/gh\/([^@\s]+)@latest\/([^"\s<>]+)/g)];
    assert.ok(urls.length > 0, `${document} has consumer CDN URLs`);
    for (const [, repository, asset] of urls) {
      assert.equal(publication.repository, repository, `${document} repository URL case`);
      assert.ok(artifact.assets.includes(asset), `${document} asset ${asset}`);
    }
    assert.ok(target.aliases.includes('latest'));
  }
});
