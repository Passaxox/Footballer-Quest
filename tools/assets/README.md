# DS headshot crop planner

This tool produces a **crop manifest**, not a cropped PNG. No reliable PNG crop library is installed locally; no new dependency is introduced. The source PNG is validated using the existing asset checker. Identity is separate: numbers never imply character names.

1. Copy manually downloaded PNG sheets into `tools/assets/sources/`. These files are ignored by Git and outside the frontend/APK assets.
2. Add measured geometry to `tools/assets/sheets.json`. No production sheet is configured yet: the source files were not supplied in this repository.
3. Run without `--out` to validate the entire configured grid and inspect coordinates.
4. Use `--out crop.json` to save a plan. Output must not already exist. The tool never overwrites files.

Example configuration **for illustration only**, not measured DS sheet geometry:

```json
{"sheets":[{"id":"0400-0599","filename":"headshots-0400-0599.png","startId":400,"endId":599,"columns":10,"rows":20,"cellWidth":64,"cellHeight":64,"originX":0,"originY":0,"gapX":0,"gapY":0}]}
```

IDs are decimal (0473 means 473). Layout is row-major; rows/columns are zero-based. A partially filled final row is supported. Origin and gaps exclude sheet borders/labels; measure these before use. Nonuniform grids require separate configurations, not guessed coordinates.

From repository root, after configuring the real source:

```text
node tools/assets/extract-headshot.mjs --sheet 0400-0599 --id 0473 --out crop.json
node --test tools/assets/extract-headshot.test.mjs
```

The deterministic JSON includes coordinates, dimensions and a source SHA-256. A later image tool can crop exactly `(x, y, width, height)` with no resizing/interpolation. A source mismatch must be rejected against that hash. No crop renderer is installed or invoked here. `--config` and `--sources` accept alternate local paths. Invalid IDs, bad PNGs, oversized grids, missing files and existing output fail explicitly.

## Asset Factory proof-of-concept

The isolated resolver/staging proof-of-concept lives in `tools/assets/asset-factory.mjs` with its input manifest at `tools/assets/manifests/epsilon-ie2-poc.json`.

- Scope: resolver/staging/reporting only. It never writes into `frontend/public/sprites/`.
- Source adapter: MediaWiki/Fandom character page → exact file title → original binary URL fallback.
- Output: immutable staged originals under `tools/assets/staging/`, plus JSON/Markdown/HTML reports under `tools/assets/reports/`.
- Status rule: resolved binaries are always `CANDIDATE`; the tool never auto-assigns `ASSET-VERIFIED`.

From repository root:

```text
node tools/assets/asset-factory.mjs
node --test tools/assets/asset-factory.test.mjs
```
