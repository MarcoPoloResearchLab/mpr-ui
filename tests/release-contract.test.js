import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

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
