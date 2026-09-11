# Hosted Authentication Readiness

Status on 2026-09-10: the production source is prepared, but deployment is not ready.

## Verified Provider Settings

| Setting | Value |
| --- | --- |
| Google client ID | `991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com` |
| Added Google origin | `http://localhost` |
| Apple Service ID | `com.mprlab.ui` |
| Apple primary App ID | `com.mprlab.ui.primary` |
| Apple team ID | `Z9ZW6HDGML` |
| Apple key ID | `FSPJR9M37P` |
| Apple callback | `https://tauth-api.mprlab.com/auth/apple/callback` |
| Apple domains | `ui.mprlab.com`, `tauth-api.mprlab.com` |

Google saved the added origin. The local email test then passed without browser errors.
Apple reports a completed key download. The file `AuthKey_FSPJR9M37P.p8` remains unavailable to this task.

## Prepared Source

`Dockerfile.pages` copies the public library, demo assets, and documentation into a static artifact.
The image uses `scratch` and contains no service process.
`make test-pages` builds the artifact twice and compares its complete file content.
The browser check loads the built files with isolated provider responses and verifies all three controls on four authentication pages.

The hosted browser profile selects `https://tauth-api.mprlab.com` and tenant `mpr-ui-demo`.
The local profile continues to use its local TAuth service.

`.mprlab/deploy/resources.yml` declares the Pages site and the dedicated TAuth tenant.
The tenant enables Google, Apple, password, account, and Pinguin email delivery.
The manifest allows the public origin and the two required local origins.
The `Makefile` delegates release, publication, and deployment to the sibling Gateway.
The previous repository release scripts and jsDelivr deploy script are removed.

The published v4.0.0 commit does not contain this deployment source.
A new source commit is necessary before the Gateway can select v4.0.1.

## Private Deployment Input

Create the ignored `.mprlab/deploy/.env` file with these assignments:

- `MPR_UI_APPLE_PRIVATE_KEY`
- `MPR_UI_EMAIL_DELIVERY_API_KEY`
- `MPR_UI_GOOGLE_WEB_CLIENT_ID`
- `MPR_UI_JWT_SIGNING_KEY`

The file is absent at this check.
The lifecycle must not write the values to Git, artifacts, receipts, state, or normal logs.

## External Gates

1. Retrieve the saved Apple private key.
2. Supply the authorized Pinguin credential.
3. Confirm that the active runtime resolves `pinguin:50051` for TAuth.
4. Verify the `mprlab.com` domain for the GitHub organization.
5. Set the `ui` CNAME record to `marcopoloresearchlab.github.io`.
6. Run the repository release, publish, and deploy phases.
7. Verify the exact Pages build and `/.mprlab-release.json` marker.
8. Verify TLS and every public route.
9. Complete real Google, Apple, and password authentication.
10. Repeat deployment and verify an idempotent result.

The GitHub Pages API returned `404` for this repository at this check.
The `ui.mprlab.com` hostname did not resolve at this check.
These external conditions and the missing private input prevent production deployment.
