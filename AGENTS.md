# Footballer Quest Agent Policy

## Delivery gate

- Report work as `PASS`, `PARTIAL`, or `BLOCKED`. Use `PASS` only when the requested scope is complete and verified.
- Run preflight checks first. Repository evidence overrides stale prompt assumptions.
- Keep scope narrow. Prefer additive, backward-compatible changes and do not alter unrelated systems.

## Domain model

- `Character` is the canonical identity, `CharacterVersion` is a specific form, and `PlayerInstance` is a user's owned instance.
- Localization aliases never create duplicate `Character` records.
- Mark uncertain identity matches as `REVIEW`; do not guess or auto-merge them.

## Content pipeline

Follow this order:

`Preflight -> Identity -> Asset -> Runtime -> Scenario -> Backcompat -> Tests`

- Runtime content requires assets that are both `ASSET-VERIFIED` and `AVAILABLE`.
- Preserve staging/import/verified provenance and human approval requirements.
- Encounter sizes `1-3` are standard, `4` is rare, and `5-6` requires contextual or progression gating.
- Rarity describes frequency, exclusivity, and context, not raw power.

## Verification and persistence

- Run focused tests, relevant regressions, and a production build where appropriate.
- Do not produce a tester APK after every slice.
- Start a **new** Android APK workflow run; never use **Re-run jobs**.
- Never assume a cloud working tree persists. Persist successful meaningful work locally or remotely as the task permits.
- Do not push, merge, or otherwise publish changes unless explicitly requested.
