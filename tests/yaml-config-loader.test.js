'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const loaderPath = path.join(__dirname, '..', 'mpr-ui-config.js');

function resetEnvironment() {
  delete require.cache[loaderPath];
  delete global.MPRUI;
  delete global.location;
  delete global.fetch;
  delete global.jsyaml;
}

test('loadYamlConfig selects matching environment by origin', async () => {
  resetEnvironment();
  global.location = { origin: 'https://example.com' };
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => 'ignored',
  });
  global.jsyaml = {
    load() {
      return {
        environments: [
          {
            origins: ['https://example.com'],
            auth: {
              tauthUrl: 'https://auth.example.com',
              googleClientId: 'example-client',
              tenantId: 'example-tenant',
              loginPath: '/auth/google',
              logoutPath: '/auth/logout',
              noncePath: '/auth/nonce',
            },
            authButton: {
              text: 'signin_with',
              size: 'large',
              theme: 'outline',
            },
          },
        ],
      };
    },
  };

  require(loaderPath);
  const config = await global.MPRUI.loadYamlConfig({ configUrl: '/config.yaml' });

  assert.equal(config.auth.tenantId, 'example-tenant');
  assert.equal(config.auth.googleClientId, 'example-client');
  assert.equal(config.authButton.text, 'signin_with');
});
