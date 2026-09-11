# Team content factory

Team content now has one authored source: `tools/content/manifests/<team>.json`. The generated
`frontend/src/game/teamContent.generated.js` supplies Characters, CharacterVersions, moves, team
metadata, provenance expectations, and scenario membership. Do not edit the generated module.

## Add the next team

1. Add one team manifest under `tools/content/manifests/`.
2. Add the matching asset manifest under `tools/assets/manifests/`.
3. Run `node tools/content/team-pipeline.mjs --team <manifest-id> --prepare`. This writes the exact
   fetch plan, acquires available sources, prepares approvals, and may be rerun safely.
4. If a source host blocks acquisition, place downloaded candidates below the fetch plan's exact
   `tools/assets/imports/` destinations, then rerun with `--prepare --import-candidates`.
5. Open `tools/assets/reports/<manifest>.contact-sheet.html`; change each reviewed approval from
   `REVIEW` to `ASSET-VERIFIED` or `REJECTED`.
6. Run `node tools/content/team-pipeline.mjs --team <manifest-id> --finalize`. It captures hashes,
   promotes immutable verified sources, copies runtime sprites, writes provenance, generates
   content, and runs content-check. It never approves an asset automatically.

Each `VERIFIED` player must include non-empty `identityEvidence`. Evidence entries use
`sourceType` (`url` or `repository`), a traceable `reference`, optional `notes`, and `claims`.
Across the entries, claims must cover `canonical-identity`, `aliases`, `team-membership`, and
`game-origin`. Missing or incomplete evidence is rejected; ambiguous identity matches remain
`REVIEW` and are excluded from runtime.

Only the two manifests normally need manual editing. Human judgment remains required for canonical
identity evidence, visual candidate approval, and authored gameplay balance. Paths, hashes, runtime
rows, moves, scenario version lists, provenance checks, and changing catalog/asset counts are
derived.

## M2.5 Diamond Dust cost

- Before M2, a comparable team required roughly 8-12 authored/derived registry, scenario, asset,
  provenance, and assertion edits.
- M2.5 authored inputs: one content manifest and one asset manifest.
- Generated outputs: runtime module, fetch plan, review reports, approvals with captured hashes,
  immutable verified provenance, runtime sprites, and content report.
- Team-specific runtime registry edits: **0**.
- Commands: one `--prepare`, one `--finalize` after review.
- Human decisions: identity evidence, gameplay balance, and one explicit asset decision per target.

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
