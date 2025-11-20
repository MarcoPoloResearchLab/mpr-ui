# Deprecation Roadmap

This document links every reference to the legacy Alpine-based helpers so we have a single checklist for finishing their removal and delivering a Web Components-only DSL.

## Current Release (v0.1.x)

- Runtime warnings ship for all helpers (`renderSiteHeader`, `renderFooter`, `renderThemeToggle`, `mprSiteHeader`, `mprFooter`, `mprThemeToggle`, `mprHeader`). See the "Legacy helper migration" section in `README.md`.
- Architecture notes in `ARCHITECTURE.md` mark each namespace export as **Deprecated** and direct readers to the custom-element equivalents.
- `docs/custom-elements.md` and `docs/integration-guide.md` reiterate that the `<mpr-*>` tags are the public API and that the helpers only remain for the temporary migration window.
- MU-407 (in `ISSUES.md`) records this work and the test command (`npm run test:unit`) that currently guards it.

## v0.2.0 (MU-408)

Target outcome: remove every Alpine/imperative helper from the bundle so the Web Components DSL is the only consumer API.

Tasks:

1. **Runtime:** Delete the deprecated namespace exports and helper implementations from `mpr-ui.js`, including the warning wrapper, and reroute any internal consumers (if any remain) through the `<mpr-*>` components.
2. **Documentation:** Remove the legacy helper text from `README.md`, `ARCHITECTURE.md`, `docs/custom-elements.md`, and `docs/integration-guide.md`. Replace it with a changelog entry that announces the breaking change for v0.2.0.
3. **Tests/Demos:** Update unit/e2e tests so they no longer import the helpers; ensure fixtures only rely on `<mpr-*>`. Delete any demo code or snippets that mention `x-data`, `mprSiteHeader`, etc.
4. **Release notes:** Add a v0.2.0 changelog entry summarizing the removal and pointing readers to the migration guidance in `README.md`.
5. **Verification:** Run `npm run test:unit` and Playwright (`npm run test:e2e`) to confirm nothing else regressed once the helpers are gone.

This checklist, MU-408 in `ISSUES.md`, and the README’s migration section should stay in sync. When v0.2.0 lands, link the changelog entry back to this document so the historical context remains easy to find.
