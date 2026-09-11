// @ts-check

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const REPOSITORY = 'MarcoPoloResearchLab/mpr-ui';
const ASSETS = Object.freeze([
  'mpr-ui-config.js',
  'mpr-ui.css',
  'mpr-ui.js',
]);
const SEMVER_PATTERN = /^v(?<major>0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const DEFAULT_CDN_ORIGIN = 'https://cdn.jsdelivr.net';
const DEFAULT_PURGE_ORIGIN = 'https://purge.jsdelivr.net';
const DEFAULT_ATTEMPTS = 12;
const DEFAULT_RETRY_DELAY_MILLISECONDS = 5000;
const REQUEST_TIMEOUT_MILLISECONDS = 15000;

/**
 * Runs one Git command and returns trimmed output.
 * @param {string[]} argumentsList
 * @returns {string}
 */
function runGit(argumentsList) {
  return execFileSync('git', argumentsList, { encoding: 'utf8' }).trim();
}

/**
 * Reads one positive integer environment option.
 * @param {string} name
 * @param {number} defaultValue
 * @param {boolean} allowZero
 * @returns {number}
 */
function readIntegerOption(name, defaultValue, allowZero) {
  const rawValue = process.env[name];
  if (rawValue === undefined) {
    return defaultValue;
  }
  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new Error(`${name} must be ${allowZero ? 'a nonnegative' : 'a positive'} integer`);
  }
  return value;
}

/**
 * Reads and validates one provider origin.
 * @param {string} name
 * @param {string} defaultValue
 * @returns {string}
 */
function readProviderOrigin(name, defaultValue) {
  const origin = new URL(process.env[name] ?? defaultValue);
  if (
    !['http:', 'https:'].includes(origin.protocol) ||
    origin.username !== '' ||
    origin.password !== '' ||
    origin.search !== '' ||
    origin.hash !== ''
  ) {
    throw new Error(`${name} must be one HTTP provider URL`);
  }
  return origin.href.replace(/\/$/, '');
}

/**
 * Returns the remote commit for one published tag.
 * @param {string} version
 * @returns {string}
 */
function remoteTagCommit(version) {
  const references = runGit([
    'ls-remote',
    'origin',
    `refs/tags/${version}`,
    `refs/tags/${version}^{}`,
  ]).split('\n').filter(Boolean);
  const peeledReference = references.find((line) => line.endsWith(`refs/tags/${version}^{}`));
  const selectedReference = peeledReference ?? references[0];
  return selectedReference?.split(/\s+/)[0] ?? '';
}

/**
 * Downloads one provider resource and requires a successful response.
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
async function download(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
  });
  if (!response.ok) {
    throw new Error(`provider request failed with status ${response.status}: ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Returns the SHA-256 digest for one payload.
 * @param {Buffer} payload
 * @returns {string}
 */
function digest(payload) {
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Waits without blocking the event loop.
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

/** Activates and verifies the mutable jsDelivr aliases for the published tag. */
async function activateJsDelivr() {
  const repositoryRoot = runGit(['rev-parse', '--show-toplevel']);
  process.chdir(repositoryRoot);
  const version = runGit([
    'tag',
    '--points-at',
    'HEAD',
    '--list',
    'v*',
    '--sort=-version:refname',
  ]).split('\n')[0];
  const versionMatch = SEMVER_PATTERN.exec(version);
  if (!versionMatch?.groups) {
    throw new Error('publication requires one stable SemVer tag at HEAD');
  }
  const localCommit = runGit(['rev-list', '-n', '1', version]);
  const headCommit = runGit(['rev-parse', 'HEAD']);
  if (localCommit !== headCommit) {
    throw new Error(`${version} does not point at HEAD`);
  }
  if (remoteTagCommit(version) !== localCommit) {
    throw new Error(`${version} is not published at the prepared commit`);
  }

  const aliases = Object.freeze(['latest', versionMatch.groups.major]);
  const cdnOrigin = readProviderOrigin(
    'MPR_UI_JSDELIVR_CDN_ORIGIN',
    DEFAULT_CDN_ORIGIN,
  );
  const purgeOrigin = readProviderOrigin(
    'MPR_UI_JSDELIVR_PURGE_ORIGIN',
    DEFAULT_PURGE_ORIGIN,
  );
  const attempts = readIntegerOption(
    'MPR_UI_JSDELIVR_ATTEMPTS',
    DEFAULT_ATTEMPTS,
    false,
  );
  const retryDelayMilliseconds = readIntegerOption(
    'MPR_UI_JSDELIVR_RETRY_DELAY_MS',
    DEFAULT_RETRY_DELAY_MILLISECONDS,
    true,
  );

  for (const alias of aliases) {
    for (const asset of ASSETS) {
      process.stdout.write(`Purging jsDelivr ${alias}/${asset}.\n`);
      await download(`${purgeOrigin}/gh/${REPOSITORY}@${alias}/${asset}`);
    }
  }

  for (const asset of ASSETS) {
    const expectedDigest = digest(readFileSync(asset));
    const immutableDigest = digest(
      await download(`${cdnOrigin}/gh/${REPOSITORY}@${version}/${asset}`),
    );
    if (immutableDigest !== expectedDigest) {
      throw new Error(`jsDelivr ${version}/${asset} does not match the release bytes`);
    }
    for (const alias of aliases) {
      let activated = false;
      let lastRequestError;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          const query = new URLSearchParams({ attempt: String(attempt), version });
          const aliasDigest = digest(
            await download(
              `${cdnOrigin}/gh/${REPOSITORY}@${alias}/${asset}?${query}`,
            ),
          );
          if (aliasDigest === expectedDigest) {
            activated = true;
            break;
          }
        } catch (error) {
          lastRequestError = error;
        }
        if (attempt < attempts) {
          await wait(retryDelayMilliseconds);
        }
      }
      if (!activated) {
        throw new Error(
          `jsDelivr ${alias}/${asset} did not activate ${version}`,
          { cause: lastRequestError },
        );
      }
    }
  }

  process.stdout.write(
    `Activated mpr-ui ${version} on jsDelivr aliases latest and ${versionMatch.groups.major}.\n`,
  );
}

activateJsDelivr().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`error: ${message}\n`);
  process.exitCode = 1;
});
