# Maintainer guide

This guide covers repository validation and the production lifecycle.
The [integration guide](integration-guide.md) covers application setup.
The [demo guide](demo-index-auth.md) covers static preview, the local TAuth/Pingwin stack, and its current startup blocker.

## Development and validation

Install the test dependencies:

```bash
npm install
```

Run the repository checks:

```bash
make ci
```

`make ci` runs lint and format targets, Node tests, coverage checks, Playwright acceptance, and the static Pages artifact check.
The lint and format targets run their npm scripts when those scripts exist.
The Pages check requires Docker and an installed Playwright browser.
The default browser suite excludes the optional live demo tests.
CI success does not establish live provider acceptance.

| Command | Scope and prerequisites |
| --- | --- |
| `npm run demo:serve` | Static preview at `http://127.0.0.1:4177/`. Authentication completion requires backend services. |
| `make test-pages` | Static Pages artifact and browser controls with isolated provider responses. Requires Docker and an installed Playwright browser. |
| `make test-demo` | Live demo acceptance at `http://localhost:4443/` by default. Requires the local stack or a configured demo URL. |
| `make test-delivery` | Isolated TAuth/Pingwin delivery tests. Requires Docker, `uv`, and the two sibling repositories. |

The delivery tests use temporary data and an isolated SMTP mailbox for the sender check.
The [demo guide](demo-index-auth.md#private-delivery-owner) records the sender test result and the separate administration blocker.
The sender check does not establish full demo startup or acceptance of an external SMTP provider.

## Production configuration

The production manifest is [`.mprlab/deploy/resources.yml`](https://github.com/MarcoPoloResearchLab/mpr-ui/blob/master/.mprlab/deploy/resources.yml).
It declares the Pages artifact, Git asset publication, GitHub Pages site, and jsDelivr distribution.
[`Dockerfile.pages`](https://github.com/MarcoPoloResearchLab/mpr-ui/blob/master/Dockerfile.pages) creates the Pages artifact from selected public files.

Supply the manifest's private inputs through the ignored `.mprlab/deploy/.env` file:

- `DEPLOY_SUDO_PASSWORD_TUTOSH`
- `MPRLAB_TAUTH_MANAGEMENT_URL`
- `MPRLAB_TAUTH_PROVISIONING_CREDENTIALS`
- `MPR_UI_APPLE_PRIVATE_KEY`
- `MPR_UI_EMAIL_DELIVERY_API_KEY`
- `MPR_UI_GOOGLE_WEB_CLIENT_ID`
- `MPR_UI_JWT_SIGNING_KEY`

The manifest owns this input list.
Keep private values outside Git, public artifacts, receipts, state, and normal logs.
The [hosted authentication record](hosted-auth-readiness.md) contains historical provider setup and dated acceptance evidence.
Its September preparation gates are historical records.

## Release, publication, and deployment

The repository requires the installed `mprlab-gateway` runtime with `release`, `publish`, and `deploy` commands.
The `Makefile` passes the current application root through `--app-root`.
Set `MPRLAB_GATEWAY_EXECUTABLE` to select an installed command outside `PATH`.

Run the complete lifecycle only with explicit release, publication, and deployment authorization:

```bash
make deploy
```

Use `make release` to stop after preparation.
Use `make publish` to stop after publication.

The phases have these separate results:

| Phase | Result |
| --- | --- |
| Release | Seals the exact committed source, Pages artifact, and declared CDN assets. |
| Publish | Creates the immutable Pages version tag and verifies the declared Git assets. |
| Deploy | Activates the Pages site and CDN aliases, then verifies the public website and declared assets. |

Gateway records publication success only after its required provider checks pass.
The manifest declares the `latest` and `major` CDN aliases.
GitHub Pages uses the `gh-pages` branch and `https://ui.mprlab.com/`.
Verify the public website and its `/.mprlab-release.json` marker after deployment.
Live provider acceptance remains separate from source CI and Pages activation.

The installed runtime uses lifecycle contract `4` and publication envelope schema `4`.
The versionless manifest uses explicit identity lists for artifacts, publications, and targets.
It declares the lifecycle timeouts and polling policies.
Its CI command sets `CI=1` and runs `make ci`.

The runtime must preserve `MarcoPoloResearchLab/mpr-ui` letter case in CDN requests.
A runtime that converts this repository name to lowercase does not satisfy the asset contract.

### Publication history

For the schema `4` cutover, publish a new application version from a new source commit.
The release phase selects the next version after that source change.
Publication records the producer Gateway version and platform in `mprlab-publication.json`.
An existing schema `3` completion record remains part of its original immutable publication.

## Delivery limitation

B073 tracks restoration of the complete previous release after failed CDN activation.
The CDN provider cannot restore a previous release through its mutable aliases.
The installed-runtime migration does not resolve this requirement.
