// @ts-check

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} = require('node:fs');
const { resolve } = require('node:path');
const { tmpdir } = require('node:os');
const test = require('node:test');

const repositoryRoot = resolve(__dirname, '..');
const prepareReleaseScript = resolve(repositoryRoot, 'scripts', 'release', 'prepare_release.sh');
const publishReleaseScript = resolve(repositoryRoot, 'scripts', 'release', 'publish_release.sh');
const stockMacosBash = '/bin/bash';
const existingReleaseTag = 'v9.9.9';

function runGitCommand(repositoryDirectory, argumentsList) {
  return execFileSync('git', argumentsList, {
    cwd: repositoryDirectory,
    encoding: 'utf8',
  }).trim();
}

function writeExecutable(filePath, content) {
  writeFileSync(filePath, content, 'utf8');
  chmodSync(filePath, 0o755);
}

function createReleaseCollisionFixture() {
  const fixtureDirectory = mkdtempSync(resolve(tmpdir(), 'mpr-ui-release-contract-'));
  const binaryDirectory = resolve(fixtureDirectory, 'bin');
  const helperPath = resolve(fixtureDirectory, 'release-helper');
  const makeLogPath = resolve(fixtureDirectory, 'make.log');
  mkdirSync(binaryDirectory);
  writeFileSync(resolve(fixtureDirectory, 'CHANGELOG.md'), '# Changelog\n', 'utf8');
  runGitCommand(fixtureDirectory, ['init']);
  runGitCommand(fixtureDirectory, ['config', 'user.name', 'Release Contract Test']);
  runGitCommand(fixtureDirectory, ['config', 'user.email', 'release-contract@example.test']);
  runGitCommand(fixtureDirectory, ['add', 'CHANGELOG.md']);
  runGitCommand(fixtureDirectory, ['commit', '-m', 'Initial changelog']);
  runGitCommand(fixtureDirectory, ['tag', existingReleaseTag]);
  writeExecutable(
    helperPath,
    `#!/bin/sh
case "$1" in
  preflight)
    printf '%s\\n' '{"default_branch":"master","version_info":{"scheme_guess":"semver","latest_semver_tag":"v1.0.0","latest_tag":"v1.0.0"}}'
    ;;
  initialize-release-artifact)
    ;;
  generate-notes)
    printf '%s\\n' '## [${existingReleaseTag}] - 2026-07-21' ''
    ;;
  insert-changelog)
    printf '%s\\n' '## [${existingReleaseTag}] - 2026-07-21' '' >> CHANGELOG.md
    ;;
esac
`,
  );
  writeExecutable(
    resolve(binaryDirectory, 'make'),
    `#!/bin/sh
printf '%s\\n' "$*" >> "${'${MAKE_CALL_LOG}'}"
`,
  );
  return {
    binaryDirectory,
    fixtureDirectory,
    helperPath,
    makeLogPath,
  };
}

test('release lifecycle uses repository-owned tooling and preserves jsDelivr deploy', () => {
  const makefile = readFileSync(resolve(repositoryRoot, 'Makefile'), 'utf8');
  assert.match(
    makefile,
    /RELEASE_HELPER := \$\(abspath \$\(CURDIR\)\/scripts\/release\/release_helper\.py\)/,
  );
  assert.match(
    makefile,
    /RELEASE_TOOL_DIR := \$\(abspath \$\(CURDIR\)\/scripts\/release\)/,
  );
  assert.doesNotMatch(makefile, /agentSkills\/gitrelease/);

  for (const script of [
    'prepare_release.sh',
    'publish_release.sh',
    'release_helper.py',
  ]) {
    const path = resolve(repositoryRoot, 'scripts', 'release', script);
    assert.notEqual(statSync(path).mode & 0o111, 0, path + ' must be executable');
  }

  const output = execFileSync(
    'make',
    ['--dry-run', 'release', 'publish', 'deploy'],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );
  assert.match(output, /scripts\/release\/prepare_release\.sh/);
  assert.match(output, /scripts\/release\/publish_release\.sh/);
  assert.match(output, /scripts\/deploy-jsdelivr\.sh/);
  assert.doesNotMatch(output, /agentSkills\/gitrelease/);
});

test('release wrappers run under stock macOS Bash without Bash 4-only syntax', () => {
  for (const scriptPath of [prepareReleaseScript, publishReleaseScript]) {
    assert.doesNotMatch(readFileSync(scriptPath, 'utf8'), /\[\[\s+-v\b/);
  }

  const prepareResult = spawnSync(stockMacosBash, [prepareReleaseScript, '--help'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  assert.equal(prepareResult.status, 0, prepareResult.stderr);
  assert.match(prepareResult.stdout, /Prepares a release entirely from local repository state/);

  const publishResult = spawnSync(stockMacosBash, [publishReleaseScript], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: Object.assign({}, process.env, { RELEASE_HELPER: '/usr/bin/true' }),
  });
  assert.equal(publishResult.status, 0, publishResult.stderr);
});

test('release preparation rejects an existing tag before it mutates the changelog or commits', () => {
  const fixture = createReleaseCollisionFixture();
  try {
    const initialCommit = runGitCommand(fixture.fixtureDirectory, ['rev-parse', 'HEAD']);
    const initialChangelog = readFileSync(resolve(fixture.fixtureDirectory, 'CHANGELOG.md'), 'utf8');
    const execution = spawnSync(
      stockMacosBash,
      [prepareReleaseScript, '--version', existingReleaseTag],
      {
        cwd: fixture.fixtureDirectory,
        encoding: 'utf8',
        env: Object.assign({}, process.env, {
          MAKE_CALL_LOG: fixture.makeLogPath,
          PATH: fixture.binaryDirectory + ':' + process.env.PATH,
          RELEASE_HELPER: fixture.helperPath,
        }),
      },
    );

    assert.equal(execution.status, 1, execution.stderr);
    assert.match(execution.stderr, /release tag already exists: v9\.9\.9/);
    assert.equal(runGitCommand(fixture.fixtureDirectory, ['rev-parse', 'HEAD']), initialCommit);
    assert.equal(readFileSync(resolve(fixture.fixtureDirectory, 'CHANGELOG.md'), 'utf8'), initialChangelog);
    assert.equal(existsSync(fixture.makeLogPath), false);
  } finally {
    rmSync(fixture.fixtureDirectory, { force: true, recursive: true });
  }
});
