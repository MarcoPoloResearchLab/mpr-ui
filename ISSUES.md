# ISSUES (Append-only Log)

Entries record newly discovered requests or changes, with their outcomes. No instructive content lives here. Read @NOTES.md for the process to follow when fixing issues.

## Features (100–199)

- [x] [MU-100] Build a sticky site header component providing auth controls, settings entry, and theme toggle. It must expose Alpine and imperative APIs and render DOM on drop-in. — Implemented sticky header in `mpr-ui.js`, documented usage, and showcased it in the demo on branch `feature/MU-100-sticky-header`.
- [x] [MU-101] Replace the legacy footer implementation by bundling a sticky site footer with menu, privacy link, and theme toggle directly in mpr-ui.js. — Integrated the rich footer into `mpr-ui.js`, added sticky styling, documented the API, and showcased it in the demo on branch `feature/MU-101-unified-footer`.
- [x] [MU-102] Allow declarative theme customization and cross-component theme events. Provide configurable targets, modes, and global theme helpers so other Alpine components can stay in sync. — Added global theme manager, declarative dataset support, and demo updates on branch `feature/MU-102-theme-extensibility`.

## Improvements (200–299)

## BugFixes (300–399)

## Maintenance (400–499)

- [x] [MU-400] Update the documentation @README.md and focus on the usefullness to the user. Move the technical details to ARCHITECTURE.md. — Delivered user-centric README and migrated deep technical content into the new ARCHITECTURE.md reference. Resolved on branch `maintenace/MU-400-user-focused-readme` with README rewrite and new ARCHITECTURE.md reference.
- [x] [MU-401] Ensure architrecture matches the reality of the code. Update @ARCHITECTURE.md when needed. Review the code and prepare a comprehensive ARCHITECTURE.md file with the overview of the app architecture, sufficient for understanding of a mid to senior software engineer. — Expanded ARCHITECTURE.md with accurate flow descriptions, interfaces, dependency notes, and security guidance reflecting current code. Resolved on branch `maintenace/MU-401-architecture-audit` after auditing exports, documenting auth events, and clarifying legacy footer behaviour.
- [x] [MU-402] Review @POLICY.md and verify what code areas need improvements and refactoring. Prepare a detailed plan of refactoring. Check for bugs, missing tests, poor coding practices, uplication and slop. Ensure strong encapsulation and following the principles og @AGENTS.md and policies of @POLICY.md — Authored `docs/refactor-plan.md` documenting policy gaps, remediation tasks, and prioritised roadmap. Resolved on branch `maintenace/MU-402-refactor-plan` with actionable workstreams and testing strategy.
- [x] [MU-403] Prepare a demo page that demonstrates the usage of the footer and header. Delivered `demo/index.html` + `demo/demo.js` with offline GIS stub and footer examples on branch `maintenace/MU-403-demo-page`.

## Planning
