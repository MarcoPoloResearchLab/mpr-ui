# Docker Compose Demo

Run the mpr-ui playground against a live TAuth backend with Docker Compose. The
stack wires the shared authentication header/footer to Google Identity Services
and the official TAuth container.

## Prerequisites

- Docker and Docker Compose
- A Google OAuth Web Client configured with `http://localhost:8000` as an
  authorised JavaScript origin

## Setup

1. **Copy the sample environment file**

   ```bash
   cp docker/.env.sample docker/.env
   ```

   Update `APP_GOOGLE_WEB_CLIENT_ID` and `APP_JWT_SIGNING_KEY` in
   `docker/.env`.

2. **Expose the same client ID to the front-end**

   Either edit the `data-google-client-id` attribute in `docker/index.html` or
   copy `docker/demo-config.sample.js` to `docker/demo-config.js` and update the
   values there.

3. **Launch the stack**

   ```bash
   docker compose up --build
   ```

   This starts two services:

   - `frontend` (`ghcr.io/temirov/ghttp:latest`) serving the static assets from
     `docker/`
   - `backend` (`ghcr.io/marcopoloresearchlab/tauth:latest`) listening on
     `http://localhost:8080`

4. **Open the UI**

   Visit `http://localhost:8000` and use the header’s “Sign in” button to
   trigger Google Identity Services. Successful exchanges populate the session
   dataset and event log.

## Environment Overview

The backend service consumes `docker/.env`. Typical settings:

```
APP_LISTEN_ADDR=:8080
APP_COOKIE_DOMAIN=localhost
APP_GOOGLE_WEB_CLIENT_ID=...apps.googleusercontent.com
APP_JWT_SIGNING_KEY=change-me
APP_ENABLE_CORS=true
APP_CORS_ALLOWED_ORIGINS=http://localhost:8000
APP_DEV_INSECURE_HTTP=true
```

These defaults enable credentialed cookies across the `8000` (frontend) and
`8080` (backend) ports while keeping the flow HTTP-friendly for local
experiments.

When deploying beyond local labs, disable `APP_DEV_INSECURE_HTTP`, serve both
services behind HTTPS, and point `APP_COOKIE_DOMAIN` at your production host.
