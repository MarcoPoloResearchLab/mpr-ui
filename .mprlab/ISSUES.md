# ISSUES (Append-only section-based log)

Entries record newly discovered requests or changes, with their outcomes. No instructive content lives here. Read @NOTES.md for the process to follow when fixing issues.

Read @AGENTS.md, @ARCHITECTURE.md, @POLICY.md, @NOTES.md,  @README.md and @ISSUES.md. Start working on open issues. Work autonomously and stack up PRs.

## BugFixes (372–399)

- [ ] [MU-372] (P2) mpr-ui: `base-class` utilities like `mt-auto` are ineffective for flexbox layout when `sticky="false"`.
  ### Summary
  When `<mpr-footer sticky="false">` is used inside a flex column layout (e.g., Bootstrap `d-flex flex-column min-vh-100`), putting `mt-auto` in the `base-class` attribute has no effect on the footer's position. The `base-class` is applied to an inner `<footer>` element inside shadow DOM, not to the `<mpr-footer>` host element. Since the host is the actual flex item, `margin-top: auto` on the inner element doesn't push the component to the bottom of the viewport.
  ### Workaround
  Add `class="mt-auto"` directly on the `<mpr-footer>` host element and remove `mt-auto` from `base-class`.
  ### Expected behavior
  Either `base-class` utilities that affect box-model layout (margins, display, flex properties) should be reflected on the host element, or the documentation should clarify that `base-class` only applies inside shadow DOM and layout utilities must be set on the host directly.
  ### Affected version
  mpr-ui v3.8.2
- [ ] [MU-373] Footer/Header runtime theme update path should be explicit after `theme-mode` deprecation.
  Summary: ProductScanner integration surfaced console warnings from mpr-ui when legacy `theme-mode` is set dynamically on `<mpr-footer>` (for example `element.setAttribute("theme-mode", preferredTheme)`), after MU-425 removed legacy DSL support.
  Context:
  - mpr-ui logs `mpr-ui.dsl.legacy_attribute Unsupported legacy attribute "theme-mode" on <mpr-footer>`.
  - Integrations migrating from old DSL may still perform runtime attribute updates and see noisy warnings without a clear component-level replacement flow.
  Expected:
  - Document and expose a canonical runtime API for header/footer theme mode updates (beyond static `theme-config.initialMode`), or provide a compatibility adapter that maps runtime `theme-mode` updates to supported theme config/state.
  - Keep strict deprecation logging, but include migration guidance in docs/examples so consumers avoid trial-and-error.
  Status 2026-02-17: logged from ProductScanner billing/settings integration cleanup.


## Improvements (428–527)

## Maintenance (419–499)

## Features (117–199)

## Planning (500–59999)
*do not implement yet*

