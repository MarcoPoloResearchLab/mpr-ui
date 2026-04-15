'use strict';

const { spawnSync } = require('node:child_process');
const { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { createCoverageMap } = require('istanbul-lib-coverage');
const v8ToIstanbul = require('v8-to-istanbul');

const REPOSITORY_ROOT = path.join(__dirname, '..');
const COVERAGE_OUTPUT_DIR = path.join(REPOSITORY_ROOT, 'coverage');
const COVERAGE_RESULTS_ROOT = path.join(REPOSITORY_ROOT, 'test-results');
const BROWSER_SUMMARY_PATH = path.join(COVERAGE_OUTPUT_DIR, 'browser-summary.json');
const PLAYWRIGHT_EXECUTABLE = path.join(
  REPOSITORY_ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'playwright.cmd' : 'playwright',
);
const TARGETS = Object.freeze([
  {
    label: 'mpr-ui.js',
    filePath: path.join(REPOSITORY_ROOT, 'mpr-ui.js'),
  },
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function removeCoverageArtifacts() {
  rmSync(COVERAGE_RESULTS_ROOT, { recursive: true, force: true });
  rmSync(BROWSER_SUMMARY_PATH, { force: true });
}

function runPlaywrightSuite() {
  const environment = Object.assign({}, process.env, {
    MPR_UI_BROWSER_COVERAGE: '1',
  });
  const result = spawnSync(
    PLAYWRIGHT_EXECUTABLE,
    ['test'].concat(process.argv.slice(2)),
    {
      cwd: REPOSITORY_ROOT,
      env: environment,
      stdio: 'inherit',
    },
  );
  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
  if (result.error) {
    throw result.error;
  }
}

function collectCoverageFiles(rootDirectory) {
  if (!existsSync(rootDirectory)) {
    return [];
  }
  const entries = readdirSync(rootDirectory, { withFileTypes: true });
  return entries.reduce(function reduceCoverageFiles(paths, entry) {
    const entryPath = path.join(rootDirectory, entry.name);
    if (entry.isDirectory()) {
      return paths.concat(collectCoverageFiles(entryPath));
    }
    if (entry.isFile() && entry.name === 'browser-coverage.json') {
      paths.push(entryPath);
    }
    return paths;
  }, []);
}

function resolveCoveragePath(url) {
  if (typeof url !== 'string' || url.trim().length === 0) {
    return null;
  }

  if (/\/mpr-ui\.js(?:[?#].*)?$/.test(url)) {
    return path.join(REPOSITORY_ROOT, 'mpr-ui.js');
  }

  if (!url.startsWith('file://')) {
    return null;
  }

  try {
    const filePath = fileURLToPath(url);
    return filePath.startsWith(REPOSITORY_ROOT) ? filePath : null;
  } catch (error) {
    return null;
  }
}

function readCoverageEntries(coverageFilePath) {
  const payload = JSON.parse(readFileSync(coverageFilePath, 'utf8'));
  return Array.isArray(payload) ? payload : [];
}

async function mergeBrowserCoverage() {
  const targetPaths = new Set(TARGETS.map(function mapTarget(target) {
    return target.filePath;
  }));
  const coverageMap = createCoverageMap({});
  const coverageFiles = collectCoverageFiles(COVERAGE_RESULTS_ROOT);

  if (coverageFiles.length === 0) {
    throw new Error('Browser coverage did not produce any browser-coverage.json artifacts.');
  }

  for (const coverageFilePath of coverageFiles) {
    const entries = readCoverageEntries(coverageFilePath);
    for (const entry of entries) {
      if (!isObject(entry)) {
        continue;
      }
      const resolvedPath = resolveCoveragePath(entry.url);
      if (!resolvedPath || !targetPaths.has(resolvedPath)) {
        continue;
      }
      const converter = v8ToIstanbul(resolvedPath, 0, {
        source: typeof entry.source === 'string' ? entry.source : undefined,
      });
      await converter.load();
      converter.applyCoverage(Array.isArray(entry.functions) ? entry.functions : []);
      coverageMap.merge(converter.toIstanbul());
    }
  }

  return coverageMap;
}

function formatPercent(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

function buildSummary(coverageMap) {
  const files = TARGETS.map(function summarizeTarget(target) {
    const fileCoverage = coverageMap.fileCoverageFor(target.filePath);
    const summary = fileCoverage.toSummary();
    return {
      filePath: target.filePath,
      label: target.label,
      branches: summary.branches.pct,
      functions: summary.functions.pct,
      lines: summary.lines.pct,
      statements: summary.statements.pct,
      coveredLines: summary.lines.covered,
    };
  });

  const overall = coverageMap.getCoverageSummary();
  return {
    files: files,
    overall: {
      branches: overall.branches.pct,
      functions: overall.functions.pct,
      lines: overall.lines.pct,
      statements: overall.statements.pct,
    },
  };
}

function printSummary(summary) {
  console.log('');
  console.log('Browser coverage report');
  console.log('---------------------------------------------');
  summary.files.forEach(function printFile(entry) {
    console.log(
      entry.label +
        ' | line ' +
        formatPercent(entry.lines) +
        '% | branch ' +
        formatPercent(entry.branches) +
        '% | funcs ' +
        formatPercent(entry.functions) +
        '%',
    );
  });
  console.log('---------------------------------------------');
  console.log(
    'all files | line ' +
      formatPercent(summary.overall.lines) +
      '% | branch ' +
      formatPercent(summary.overall.branches) +
      '% | funcs ' +
      formatPercent(summary.overall.functions) +
      '%',
  );
}

function writeSummary(summary) {
  mkdirSync(COVERAGE_OUTPUT_DIR, { recursive: true });
  writeFileSync(BROWSER_SUMMARY_PATH, JSON.stringify(summary, null, 2));
}

function assertCoverageCollected(summary) {
  const missingCoverage = summary.files.filter(function filterMissingCoverage(entry) {
    return entry.coveredLines === 0;
  });
  if (missingCoverage.length === 0) {
    return;
  }
  throw new Error(
    'Browser coverage did not execute the expected targets: ' +
      missingCoverage.map(function mapEntry(entry) {
        return entry.label;
      }).join(', '),
  );
}

async function main() {
  removeCoverageArtifacts();
  runPlaywrightSuite();
  const coverageMap = await mergeBrowserCoverage();
  const summary = buildSummary(coverageMap);
  assertCoverageCollected(summary);
  writeSummary(summary);
  printSummary(summary);
}

main().catch(function handleError(error) {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
