# Footballer Quest Agent Policy

## Read first

Before substantial planning or implementation, read:

1. `docs/PROJECT_DIRECTION.md` — product vision, roadmap M1-M5, priority language, workflow and current direction.
2. `docs/DESIGN_DECISIONS.md` — frozen/approved/research/later decisions and unresolved design questions.

Repository state is the technical source of truth. These documents are the durable product-direction source of truth. If code and documentation disagree, report the mismatch instead of silently guessing which one is intended.

## Delivery gate

- Report work as `PASS`, `PARTIAL`, or `BLOCKED`. Use `PASS` only when the requested scope is complete and verified.
- Run preflight checks first. Repository evidence overrides stale prompt assumptions.
- Keep scope narrow. Prefer additive, backward-compatible changes and do not alter unrelated systems.
- Respect Production Freeze: do not pull backlog ideas into an active task unless they are necessary for correctness or a critical blocker.

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
- Rarity describes frequency, exclusivity, desirability and context, not raw power.
- Automate repetition, not judgment: scripts may generate/validate repetitive content, but canon/identity/version ambiguity stays a review decision.

## Verification and persistence

- Run focused tests, relevant regressions, and a production build where appropriate.
- Do not produce a tester APK after every slice.
- Start a **new** Android APK workflow run; never use **Re-run jobs**.
- Never assume a cloud working tree persists. Persist successful meaningful work locally or remotely as the task permits.
- Do not push, merge, or otherwise publish changes unless explicitly requested.

## Documentation handoff

When an explicit product decision changes roadmap, scope, architecture intent, acquisition/economy rules, technique rules, Traits/Synergies, DNA behaviour or milestone boundaries, update `docs/PROJECT_DIRECTION.md` and/or `docs/DESIGN_DECISIONS.md` so the next human/agent does not need chat archaeology.
