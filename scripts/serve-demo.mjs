#!/usr/bin/env node

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, relative, resolve, sep as pathSeparator } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 4177;
const CACHE_CONTROL_VALUE = 'no-store, no-cache, must-revalidate, max-age=0';
const CONTENT_TYPES = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.yaml': 'application/yaml; charset=utf-8',
  '.yml': 'application/yaml; charset=utf-8',
});

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');

function readPort() {
  const rawPort =
    process.env.MPR_UI_DEMO_PORT || process.argv[2] || String(DEFAULT_PORT);
  const port = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid demo server port "${rawPort}"`);
  }
  return port;
}

function readHost() {
  return process.env.MPR_UI_DEMO_HOST || DEFAULT_HOST;
}

function setNoStoreHeaders(response) {
  response.setHeader('Cache-Control', CACHE_CONTROL_VALUE);
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Expires', '0');
}

function isInsideRepository(candidatePath) {
  const relativePath = relative(repositoryRoot, candidatePath);
  return (
    relativePath === '' ||
    (relativePath !== '..' && !relativePath.startsWith(`..${pathSeparator}`))
  );
}

function resolveRequestPath(requestUrl) {
  const parsedUrl = new URL(requestUrl || '/', `http://${DEFAULT_HOST}`);
  const decodedPathname = decodeURIComponent(parsedUrl.pathname);
  const requestPath = decodedPathname === '/' ? 'index.html' : decodedPathname.replace(/^\/+/, '');
  const candidatePath = resolve(repositoryRoot, requestPath);
  if (!isInsideRepository(candidatePath)) {
    return null;
  }
  if (!existsSync(candidatePath)) {
    return null;
  }
  const candidateStats = statSync(candidatePath);
  if (candidateStats.isDirectory()) {
    const indexPath = join(candidatePath, 'index.html');
    return existsSync(indexPath) ? indexPath : null;
  }
  return candidateStats.isFile() ? candidatePath : null;
}

function sendText(response, statusCode, message) {
  setNoStoreHeaders(response);
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(message);
}

function sendFile(response, filePath) {
  const extension = extname(filePath).toLowerCase();
  setNoStoreHeaders(response);
  response.writeHead(200, {
    'Content-Type': CONTENT_TYPES[extension] || 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer((request, response) => {
  try {
    const filePath = resolveRequestPath(request.url);
    if (!filePath) {
      sendText(response, 404, 'Not found\n');
      return;
    }
    sendFile(response, filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    sendText(response, 400, `${message}\n`);
  }
});

const host = readHost();
const port = readPort();
server.listen(port, host, () => {
  console.log(`Serving mpr-ui demos at http://${host}:${port}/ with ${CACHE_CONTROL_VALUE}`);
});
