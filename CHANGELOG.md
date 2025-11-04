# Changelog

## [Unreleased]

- MU-200: Demo now depends on the v0.0.3 CDN bundle, keeps the header and sticky footer pinned in the layout, and adds regression coverage for the demo page.
- Fix CDN bundle regressions by shipping `resolveHost` inside the library so header/footer helpers can locate host elements without additional shims.
