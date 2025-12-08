# ISSUES (Append-only section-based log)

Entries record newly discovered requests or changes, with their outcomes. No instructive content lives here. Read @NOTES.md for the process to follow when fixing issues.

Read @AGENTS.md, @ARCHITECTURE.md, @POLICY.md, @NOTES.md,  @README.md and @ISSUES.md. Start working on open issues. Work autonomously and stack up PRs.

## Features (116–199)

- [x] [MU-116] Add a size parameter to footer and header. Allow two sizes: small and normal. small size shall be 70% of the normal size and normal size is the current size. <mpr-footer size="small" — Implemented `size="small"` support for both components with scaled-down CSS overrides. Added `mpr-header--small` and `mpr-footer--small` modifier classes and updated controllers to reflect the attribute. Verified with e2e tests.

## Improvements (220–299)

## BugFixes (335–399)

- [x] [MU-336] The toogle theme switch is glitching when the footer or header use size="small": it has two circles, and when moved, a small circle is moved in the middle of the switch: @image.png
1. Remove an external halo around the toogle switch
2. use a single circle
2. make sure circle moves from side to side
   — Refactored footer theme toggle JS styles to rely on `mpr-ui.css` structure. Removed duplicate `::after` knob definition in JS and instead overrode CSS variables with high-specificity selectors for `size="small"`. Verified with new e2e test case checking computed styles.

## Maintenance (415–499)

- [x] [MU-416] Audit mpr-ui library. Ensure we are not shipping demo-related code. Ensure that demo is shipped using the built-in capabilities. In case there are gaps => open new issues for them. We shall have no demo css or css for the elements that we dont ship (main etc). — Demo-only selectors moved to `demo/demo.css`, all demo pages/fixtures load it, and unit tests now guard that the packaged stylesheet contains component rules only.

## Planning
*Do not work on these, not ready*
