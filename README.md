# CC Curriculum

Static chapter catalog dashboard for the chess curriculum project.

## Contents

- `index.html`: hosted dashboard with filters
- `data/chapter_catalog.csv`: source catalog data
- `scripts/build_chapter_dashboard.mjs`: dashboard builder used in the local workflow
- `scripts/update_chapter_catalog.mjs`: catalog update script from the local workflow

## Hosting

This repo is set up to work well as a simple static site, including GitHub Pages:

- the dashboard entry point is `index.html`
- no build step is required to browse the deployed catalog

## Notes

The deployed site is catalog-first:

- filtering works in the browser
- chapter browsing works in the browser
- local extraction tooling is intentionally not exposed in the hosted page
