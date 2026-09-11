# Team content factory

Team content now has one authored source: `tools/content/manifests/<team>.json`. The generated
`frontend/src/game/teamContent.generated.js` supplies Characters, CharacterVersions, moves, team
metadata, provenance expectations, and scenario membership. Do not edit the generated module.

## Add the next team

1. Add one team manifest under `tools/content/manifests/`.
2. Add the matching asset manifest under `tools/assets/manifests/`.
3. Run `node tools/assets/asset-factory.mjs --manifest <asset-manifest> --fetch-plan`.
4. Place downloaded candidates anywhere below `tools/assets/imports/`, then run the same command
   with `--import-candidates --prepare-approvals`.
5. Open `tools/assets/reports/<manifest>.contact-sheet.html`; change each reviewed approval from
   `REVIEW` to `ASSET-VERIFIED` or `REJECTED`.
6. Run the asset command with `--complete-approvals`. It captures hashes, promotes immutable
   verified sources, copies runtime sprites, and writes provenance.
7. Run `node tools/content/content-factory.mjs --apply`.
8. Run `node tools/content/content-check.mjs`.

Only the two manifests normally need manual editing. Human judgment remains required for canonical
identity evidence, visual candidate approval, and authored gameplay balance. Paths, hashes, runtime
rows, moves, scenario version lists, provenance checks, and changing catalog/asset counts are
derived.

## Epsilon M1 process audit

M1 required separate edits for asset targets, source filenames/URLs, approvals, hashes, verified
copies, runtime copies, provenance, Characters, CharacterVersions, moves, scenario membership, and
fixed test counts.

- **Fully automated:** recursive exact filename matching, deterministic candidate binding, SHA-256
  capture, immutable verified/runtime promotion, provenance output, Character reuse/new decisions,
  CharacterVersion/move/scenario derivation, generated-file freshness, and semantic asset counts.
- **Automated with approval:** candidate selection is prefilled only when exactly one suitable file
  exists; promotion still requires an explicit `ASSET-VERIFIED` decision.
- **Human judgment:** ambiguous identity resolution, visual asset suitability, evidence quality,
  and authored stats/move balance.
- **Manual by design:** acquiring restricted third-party files and recording approval/rejection.

The generated JSON report at `tools/content/content-report.json` is intended for both humans and
automation. Reapplying unchanged manifests is idempotent and does not rewrite generated content.
