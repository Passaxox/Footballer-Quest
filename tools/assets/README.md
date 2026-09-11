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
- Source adapter: MediaWiki/Fandom exact file title and character-page resolution.
- Output: immutable staged originals under `tools/assets/staging/`, externally fetched inputs under the safe `tools/assets/imports/` root, verified approved provenance under `tools/assets/verified/`, plus JSON/Markdown/HTML reports under `tools/assets/reports/`.
- Status rule: only suitable game/headshot sources become `CANDIDATE`; generic character-page images are preserved as `REVIEW` evidence, and the tool never auto-assigns `ASSET-VERIFIED`.
- Lifecycle split: `tools/assets/staging/` is the ephemeral acquisition/review workspace; `tools/assets/verified/` is the canonical long-term store for explicitly approved source artifacts only.

From repository root:

```text
node tools/assets/asset-factory.mjs
node tools/assets/asset-factory.mjs --fetch-plan
node tools/assets/asset-factory.mjs --import-candidates
node tools/assets/asset-factory.mjs --import-candidates --prepare-approvals
node --test tools/assets/asset-factory.test.mjs
```

### Cloud-access recovery

When the source host is inaccessible:

1. Run `node tools/assets/asset-factory.mjs --fetch-plan` and save its machine-readable JSON.
2. Externally fetch the exact binaries from each `sourceUrl`.
3. Place each file at its `plannedImportDestination` under `tools/assets/imports/`.
4. Run `node tools/assets/asset-factory.mjs --import-candidates`.
5. Run `--prepare-approvals`, open the generated contact sheet, and review the deterministic bindings.
6. Change each reviewed entry from `REVIEW` to `ASSET-VERIFIED` or `REJECTED`.
7. Run `--complete-approvals` to capture SHA-256 values, promote immutable verified files, copy
   declared runtime sprites, and write runtime provenance in one idempotent command.

Import matching is exact and deterministic across the import tree. One exact filename is `MATCHED`; no match is `MISSING`; more than one match is `AMBIGUOUS`. Missing and ambiguous imports are `BLOCKED` and never selected silently. Imported files remain `CANDIDATE` until the existing approval and hash-verification flow completes. Generic character images cannot be approved as game assets. Staging, imports, verified storage, and runtime sprites remain separate.

Explicit human approval finalization is supported through `tools/assets/approvals/epsilon-ie2-poc.approvals.json`.

- `ASSET-VERIFIED` is never inferred from resolver output alone.
- Each approval entry must explicitly bind `versionId`, `candidatePath`, `sourceFilename`, `sha256`, and `decision: ASSET-VERIFIED`.
- `--capture-approval-hashes` fills only the SHA-256 for an already-selected explicit candidate; it never creates approvals or chooses a candidate implicitly.
- `--finalize-approvals` recomputes the stored hash again, rejects missing files, hash mismatches, ambiguity, or non-game/generic sources, and promotes only the approved binary into `tools/assets/verified/`.

The older two-step commands remain available for compatibility. To capture hashes from already
staged approved candidates:

```text
node tools/assets/asset-factory.mjs --approvals tools/assets/approvals/epsilon-ie2-poc.approvals.json --capture-approval-hashes
```

To verify the stored hashes, promote approved binaries into verified storage, and regenerate reports:

```text
node tools/assets/asset-factory.mjs --approvals tools/assets/approvals/epsilon-ie2-poc.approvals.json --finalize-approvals
```

For any non-default manifest, pass `--manifest`. Staging and approvals paths are derived from its
`manifestId`, so a new team does not reuse Epsilon paths.
