# Product catalog

`data/product-catalog.json` is the source for the shared MPR Lab product directory.
Social Threader F003 uses this catalog on web and native mobile.
Each product has an identifier, name, purpose, category, and public destination.
The catalog contains the section order, initial section states, and link labels.

`product-catalog.mjs` validates imported data and exposes `createProductMenu(catalog)`.
The function returns the current `mpr-dropdown` menu contract.
The returned links open in a new browser tab and use `noopener noreferrer`.
`product-directory.css` supplies viewport limits, visible focus, and minimum 44-pixel controls.
Apply the `mpr-product-directory` class to the dropdown or its ancestor.
Load this stylesheet after the main MPR UI stylesheet.

## Selection evidence

`product-catalog-verification.json` records public checks dated 2026-09-13.
The review compares the lab website, the current footer catalog, and all public organization repositories returned by GitHub.
It also checks public repositories under `tyemirov` for explicit lab references.
This review adds Dictator, SVG Tools, and Utils.
Personal sites, forks, and repositories without lab references remain outside this catalog.
The catalog contains 39 projects.
Photolab, ISSUES.md, and Poodle Scanner use their descriptions on the lab website.
These entries do not claim that a public application is available.
LLM Crossword is excluded because no separate public destination passed verification.
Failed application and repository checks remain in the evidence file.

## Distribution

Distribute these three files together:

- `data/product-catalog.json`
- `product-catalog.mjs`
- `product-directory.css`

Consumers can import a snapshot with SHA-256 records.
The existing footer default remains outside this opt-in directory contract.
The directory needs the current F009 `menu` contract.
It has no authentication dependency.

For each update, verify the destinations and revise the evidence file.
Run `make ci` after changes to the catalog, adapter, or stylesheet.
Import all three files into each consumer and verify the recorded hashes.
Keep the web and mobile catalog bytes identical within each application revision.
An installed mobile app retains its packaged catalog until a new app release.
Web deployment and mobile publication are separate operations.

The current implementation is local source work.
Its content hashes identify the consumer snapshot before source publication.
No shared release or consumer publication is part of this change.
