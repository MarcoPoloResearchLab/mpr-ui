# Docker Compose Demo

Run the mpr-ui playground locally with Docker Compose and exercise Google
Identity Services without touching any backend integration. The demo mirrors the
minimal GIS sample: it renders Google’s official button, decodes the returned ID
token, and shows the payload directly in the UI.

## Prerequisites

- Docker and Docker Compose
- A Google OAuth Web Client configured with `http://localhost:3000` as an
  authorised JavaScript origin

## Setup

1. **Copy the sample environment file**

   ```bash
   cp .env.example .env
   ```

   Update `APP_GOOGLE_WEB_CLIENT_ID` and `APP_JWT_SIGNING_KEY` in
   `.env`.

2. **Launch the stack**

   ```bash
   docker compose up --build
   ```

   This starts two services:

   - `frontend` (published static file server image) serving assets from the
     repository’s `docker/` directory on port 3000
   - `backend` (`ghcr.io/tyemirov/tauth:latest`) remains available for future
     experiments but is not required for the Google Sign-In sample.

   The front-end embeds the GIS script directly from Google, initialises it with
   your client ID, and renders the Sign-In button. No TAuth-specific JavaScript
   runs in this configuration.

3. **Open the UI**

   Visit `http://localhost:3000`, click the rendered Google button, and observe
   the decoded ID token plus payload details in the demo.

## Environment Overview

The sample now cares only about the Google client ID, but the bundled `.env`
still carries the full TAuth configuration should you decide to re-enable the
backend integration. Typical settings:

```
APP_LISTEN_ADDR=:8080
APP_COOKIE_DOMAIN=localhost
APP_GOOGLE_WEB_CLIENT_ID=...apps.googleusercontent.com
APP_JWT_SIGNING_KEY=change-me
APP_ENABLE_CORS=true
APP_CORS_ALLOWED_ORIGINS=http://localhost:3000
APP_DEV_INSECURE_HTTP=true
# Optional override when the frontend must talk to a non-default backend URL.
# DEMO_AUTH_BASE_URL=http://localhost:8080
```

These defaults expose the front-end on host port `3000` (container port `3000`)
and keep the backend on `8080` for optional use. The front-end assets ship with
the default Google client ID listed above; edit `docker/index.html` if you need
to point at a different OAuth client.

When deploying beyond local labs, disable `APP_DEV_INSECURE_HTTP`, serve both
services behind HTTPS, and point `APP_COOKIE_DOMAIN` at your production host.
