# Hosted Authentication Readiness

Status on 2026-09-15: MPR UI v4.1.4 is deployed and its production authentication checks passed.
The sections below retain the preparation record from September 10, 2026.
Use [the README](../README.md) for the current installed-runtime contract.

## Verified Provider Settings

Update on 2026-09-15: Apple key `JF79PQM899` replaces the missing private key in the deployment input.
The operator approved revocation of the older key `7H26QZ7XT2` to create this replacement.
The new private key is saved in the ignored deployment input and the private operator directory.
The `ui.mprlab.com` CNAME now resolves to `marcopoloresearchlab.github.io`.
Production Google login passed in Firefox. The Pages deployment, HTTPS certificate, and public version marker passed.
The dedicated sender is `mpr-ui@mprlab.com`. TAuth reaches Pinguin through `pinguin-grpc:50051` on the shared runtime network.
Apple sign-in passed in Firefox with TAuth v2.2.3. A second sign-in passed after logout.
Email verification and password reset passed through the public forms and the dedicated mailbox.
The old password returned HTTP 401. The new password returned HTTP 200 and preserved the account.
A new Chromium context restored the authenticated email session.
Set `MPR_UI_APPLE_PRIVATE_KEY` to the single-line base64 encoding of the complete downloaded PEM file.

| Setting | Value |
| --- | --- |
| Google client ID | `991677581607-r0dj8q6irjagipali0jpca7nfp8sfj9r.apps.googleusercontent.com` |
| Added Google origin | `http://localhost` |
| Apple Service ID | `com.mprlab.ui` |
| Apple primary App ID | `com.mprlab.ui.primary` |
| Apple team ID | `Z9ZW6HDGML` |
| Apple key ID | `JF79PQM899` |
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
The publish target purges and verifies the jsDelivr `@latest` and major aliases after Gateway publication.
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
3. Confirm that the active runtime resolves `pinguin-grpc:50051` for TAuth.
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
