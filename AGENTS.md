# Footballer Quest Agent Policy

## Read first

Before substantial planning or implementation, read:

1. `docs/PROJECT_DIRECTION.md` — product vision, roadmap M1-M5, priority language, workflow and current direction.
2. `docs/DESIGN_DECISIONS.md` — frozen/approved/research/later decisions and unresolved design questions.
3. `docs/TRAITS_SYNERGIES_V1.md` — current M2 Trait/Synergy architecture draft when working on team composition systems.
4. `docs/AFFILIATION_TRAIT_MODEL.md` — approved separation of Team, Faction, Legacy/history and Manager relationships; this supersedes older flat-affiliation wording where they conflict.
5. `docs/TRAIT_PILOTS.md` — approved authored Team Trait pilots (Raimon, Diamond Dust, Gemini Storm) and their coverage/activation notes.
6. `docs/ELEMENT_TRAITS_V1.md` — approved Element Trait identities/tier directions for Fuoco, Aria, Terra and Natura.
7. `docs/TRAIT_INTERACTION_RULES.md` — approved cross-Trait stacking, tempo/control, anti-loop, Fioritura and reachability guardrails.
8. `docs/TRAIT_COVERAGE_GATE.md` — minimum practical coverage/accessibility/simulation checks before a standard Team Trait is considered Production-ready.
9. `docs/TRAIT_DNA_RULES.md` — approved DNA contribution rules for Element Traits, including same-element deduplication and `1.0 / 0.5` hybrid weighting.
10. `docs/DEV_SECRETS.md` — separation between QA DEV Mode, player-facing Secrets and DEV-character Easter eggs.
11. `docs/ROADMAP_QUEUE.md` — approved/promising work that is not automatically active Production scope.

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
- Current Team identity, broader Faction identity, Legacy/history and Manager relationships are distinct concepts; do not overload one affiliation field to represent all of them.

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

When an explicit product decision changes roadmap, scope, architecture intent, acquisition/economy rules, technique rules, Traits/Synergies, DNA behaviour, DEV/Secret behaviour or milestone boundaries, update `docs/PROJECT_DIRECTION.md` and/or the relevant design file so the next human/agent does not need chat archaeology.
