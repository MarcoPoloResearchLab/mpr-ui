// @ts-check

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { resolve } = require('node:path');
const test = require('node:test');

const REPOSITORY_ROOT = resolve(__dirname, '../..');
const PLATFORMS = Object.freeze([
  { platform: 'linux/amd64', elfMachine: 62 },
  { platform: 'linux/arm64', elfMachine: 183 },
]);
const TARGETS = Object.freeze([
  { target: 'tauth', binary: 'tauth' },
  { target: 'delivery-check', binary: 'tauth-delivery' },
]);

/** @param {string[]} argumentsList */
function docker(argumentsList) {
  return execFileSync('docker', argumentsList, {
    cwd: REPOSITORY_ROOT, encoding: 'utf8', stdio: 'pipe', timeout: 240000,
  });
}

for (const { platform, elfMachine } of PLATFORMS) {
  for (const { target, binary } of TARGETS) {
    test(`${target} ships and starts a ${platform} binary`, () => {
      const imageTag = `mpr-ui-platform-test:${randomUUID()}`;
      const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'mpr-ui-platform-'));
      let containerId;
      let imageBuilt = false;
      try {
        docker([
          'buildx', 'build', '--load', '--platform', platform,
          '--file', 'demo/Dockerfile.tauth-local', '--target', target,
          '--build-context', `tauth_source=${resolve(REPOSITORY_ROOT, '../tauth')}`,
          '--build-context', `pingwin_source=${resolve(REPOSITORY_ROOT, '../Pinguin')}`,
          '--tag', imageTag, '.',
        ]);
        imageBuilt = true;
        assert.equal(docker(['image', 'inspect', '--format', '{{.Os}}/{{.Architecture}}', imageTag]).trim(), platform);
        containerId = docker(['create', '--platform', platform, imageTag]).trim();
        const binaryPath = resolve(temporaryRoot, binary);
        docker(['cp', `${containerId}:/usr/local/bin/${binary}`, binaryPath]);
        const executable = readFileSync(binaryPath);
        assert.deepEqual(executable.subarray(0, 4), Buffer.from([0x7f, 0x45, 0x4c, 0x46]));
        assert.equal(executable.readUInt16LE(18), elfMachine, `${binary} must match ${platform}`);
        const started = spawnSync('docker', [
          'run', '--rm', '--platform', platform, '--network', 'none', imageTag,
          ...(target === 'tauth' ? ['--help'] : []),
        ], { encoding: 'utf8', timeout: 30000 });
        assert.ifError(started.error);
        assert.equal(started.status, target === 'tauth' ? 0 : 1, started.stderr);
        assert.match(target === 'tauth' ? started.stdout : started.stderr,
          target === 'tauth' ? /Usage:/ : /create fixture tenant:/);
      } finally {
        if (containerId) docker(['rm', '--volumes', containerId]);
        if (imageBuilt) docker(['image', 'rm', imageTag]);
        rmSync(temporaryRoot, { recursive: true, force: true });
      }
    });
  }
}
