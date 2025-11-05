// Copy this file to `docker/demo-config.js` to override the defaults that the
// Docker demo uses at runtime.
//
// Example:
//   cp docker/demo-config.sample.js docker/demo-config.js
//   # then edit docker/demo-config.js to match your environment
//
// Supported properties:
//   - authBaseUrl:    The origin where TAuth is exposed (default http://localhost:8080)
//   - googleClientId: The Google OAuth Web Client ID configured for your project
//
window.DOCKER_DEMO_CONFIG = {
  authBaseUrl: "http://localhost:8080",
  googleClientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
};
