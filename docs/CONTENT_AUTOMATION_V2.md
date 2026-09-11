# Footballer Quest — Content Automation v2

**Status:** APPROVED_DIRECTION — architecture/implementation not yet Production-frozen  
**Milestone:** M1 tooling -> all later content milestones  
**Purpose:** make large CharacterVersion/team/scenario expansion cheap, repeatable and evidence-driven while preserving human judgment on canon and visual approval.

This extends the existing Team Content Factory and Asset Factory. It does **not** replace their provenance, identity-evidence or approval gates.

---

## 1. Existing foundation to preserve

The current pipeline already provides an important base:

`team manifest -> asset manifest -> --prepare -> fetch plan -> candidate review -> ASSET-VERIFIED/REJECTED -> --finalize -> hashes/provenance/runtime/content-check`

Verified player rows already require traceable identity evidence covering canonical identity, aliases, team membership and game origin. Ambiguous identities remain `REVIEW` and are excluded from runtime.

The goal of v2 is therefore not “let AI invent hundreds of players”. It is:

> automate discovery, candidate preparation, repetitive manifest generation and validation so humans only decide ambiguous identity/canon and visual suitability.

---

## 2. CharacterVersion-first scaling rule

Bulk expansion must separate:

- `Character` — canonical person;
- `CharacterVersion` — meaningful team/era/form incarnation;
- visual asset candidate for that CharacterVersion;
- verified affiliations and game origin;
- move/stat/gameplay authoring.

The same Character may appear in many teams through **different verified CharacterVersions** when the incarnation is meaningful.

Examples of intended coverage patterns:

- Raimon version vs Inazuma Japan version;
- Royal Academy version vs later-team version;
- Alius team versions such as Epsilon / Gemini Storm / Diamond Dust / Prominence / Chaos / Genesis;
- future national-team or arc-specific versions.

Never create a new Character simply because the same person changes team.

Never attach every historical affiliation to one generic version just to maximize Trait coverage.

---

## 3. Target automation flow

Desired high-level flow:

`Team/Arc request`
`-> Research Pack`
`-> Identity resolver`
`-> Character vs CharacterVersion proposal`
`-> Evidence bundle`
`-> Player asset candidate search`
`-> Team/logo/scenario asset candidate search`
`-> Draft content + asset manifests`
`-> Human review queue`
`-> Existing prepare/finalize pipeline`
`-> Validation + simulation + report`

The output should be deterministic/re-runnable wherever source inputs are unchanged.

---

## 4. Research Pack

Create a machine-readable Research Pack per team/arc before runtime generation.

Suggested shape:

```json
{
  "teamId": "example-team",
  "displayName": "Example Team",
  "arcId": "alius",
  "gameOrigin": "ie2",
  "players": [
    {
      "displayName": "...",
      "aliases": ["..."],
      "role": "...",
      "element": "...",
      "candidateCharacterId": "...",
      "versionProposal": "NEW_VERSION|REUSE_VERSION|NEW_CHARACTER|REVIEW",
      "sources": [],
      "assetQueries": []
    }
  ],
  "scenarioCandidates": [],
  "teamAssetQueries": []
}
```

The pack is an intake/research artifact, not runtime truth.

---

## 5. Evidence automation

Automate as much evidence collection as practical, but never auto-certify uncertain claims.

The research step should try to collect independent references for:

- canonical identity;
- aliases/localized names;
- team membership for the **specific incarnation**;
- game origin / relevant arc;
- role/position;
- element/type when available;
- technique/source information where needed for authored gameplay;
- visual references for the incarnation.

Each evidence item should carry:

- source type;
- URL/repository reference;
- retrieved title/label;
- claims supported;
- confidence/quality hint;
- optional notes;
- retrieval timestamp only in research metadata, not generated gameplay output.

A deterministic validator should report which required claims remain uncovered.

Human review remains mandatory for conflicting or weak evidence.

---

## 6. Identity resolver

Before asset/runtime work, automatically compare incoming rows against the existing catalog using:

- canonical IDs;
- exact aliases;
- normalized aliases/localizations;
- known team/version history;
- manually maintained identity overrides;
- previous REVIEW resolutions.

Resolver outcomes:

- `REUSE_CHARACTER_NEW_VERSION`
- `REUSE_EXISTING_VERSION`
- `NEW_CHARACTER`
- `REVIEW`

`REVIEW` must block automatic runtime promotion.

The resolver should produce a human-readable conflict report explaining why a match is uncertain.

---

## 7. Version Gate automation

For reused Characters, an automated Version Gate should prepare the question:

> Does this incarnation justify a distinct CharacterVersion?

Signals that can be gathered automatically:

- different team/arc/game;
- different verified visual incarnation/sprite;
- meaningful move-set difference;
- meaningful narrative/form/role difference;
- existing version already covering the same representation.

The tool may recommend `NEW_VERSION` / `REUSE_VERSION` / `REVIEW`, but the final ambiguous judgment remains human/director-level.

This is essential for characters appearing across Raimon, Inazuma Japan, Royal, Alius and later national/arc teams.

---

## 8. Asset candidate automation

The pipeline should support multiple asset classes rather than only player portraits:

- player/CharacterVersion sprite or portrait;
- team emblem/logo;
- scenario/location background;
- stadium/background variants;
- item/reference assets where relevant;
- future Manager/Guide portraits.

For every target:

1. generate exact search aliases/queries from the Research Pack;
2. acquire technically accessible candidate files where permitted;
3. normalize candidate inventory metadata without altering source files;
4. deduplicate byte-identical and visually identical candidates when possible;
5. render contact sheets by target/version;
6. require explicit human `ASSET-VERIFIED` / `REJECTED` for runtime promotion;
7. capture source/provenance/hash after approval.

Do not silently scrape/use an image merely because it is easy to download. Provenance/source policy remains mandatory.

---

## 9. Scenario asset automation

When a team manifest creates or references a scenario/location, tooling should be able to prepare a scenario asset request automatically.

Research Pack fields may include:

- scenario/location name;
- arc/team links;
- location type;
- visual search aliases;
- expected aspect/orientation;
- candidate source references;
- presentation notes.

Scenario imagery must pass the same provenance + human visual approval gate as player assets.

Gameplay scenario membership and visual background identity remain separate records so a visual can be changed without rewriting encounter logic.

---

## 10. Bulk player/team intake

Large additions should be batch-oriented.

Desired command direction, for example:

```bash
node tools/content/research-pipeline.mjs --team <team-id> --prepare
node tools/content/research-pipeline.mjs --team <team-id> --resolve
node tools/content/team-pipeline.mjs --team <team-id> --prepare
node tools/content/team-pipeline.mjs --team <team-id> --finalize
```

A higher-level batch runner may later accept an arc pack:

```bash
node tools/content/arc-pipeline.mjs --arc ffi --teams team-a,team-b,team-c --prepare
```

The batch runner must still isolate failures/REVIEW items per team/player rather than approving everything as one block.

---

## 11. Derived gameplay fields vs authored fields

### Prefer derived/automated

- registry wiring;
- CharacterVersion IDs from approved naming policy;
- team membership arrays from approved manifests;
- scenario version lists;
- file paths;
- hashes;
- provenance references;
- catalog counts;
- generated reports;
- duplicate/reference checks;
- search aliases from known aliases;
- contact sheets;
- validation fixtures.

### Keep authored/reviewed

- canonical identity conflict resolution;
- whether a team change deserves a CharacterVersion;
- final visual candidate approval;
- stats/balance;
- primary/secondary move design;
- rarity interpretation;
- Trait/team identity design;
- scenario narrative/presentation judgment;
- ambiguous canon/source claims.

Principle:

> Automate repetition, not judgment.

---

## 12. Trait integration

The content pipeline must emit enough verified CharacterVersion affiliation data for Traits without additional manual trait tagging.

Team Trait contribution should normally derive from approved CharacterVersion `teamTags`.

Therefore:

- adding an Inazuma Japan CharacterVersion automatically makes it eligible to contribute to the Inazuma Japan Trait once that Trait exists;
- a Raimon version of the same Character remains a Raimon contributor;
- a Royal/Alius/national version contributes according to its own verified version metadata;
- rarity changes encounter frequency, not affiliation contribution.

Trait definitions should consume content metadata; content metadata must never be falsified to satisfy Trait design.

---

## 13. Reports for humans and AI agents

Every prepared team/arc should end with a concise report:

- new Characters;
- reused Characters;
- proposed new CharacterVersions;
- reused versions;
- unresolved identity/version reviews;
- evidence completeness;
- missing assets;
- asset candidates awaiting approval;
- scenario candidates/assets;
- generated runtime changes expected;
- Trait coverage impact by teamTag;
- warnings/conflicts;
- exact next commands/actions.

This report should be machine-readable JSON plus a human-readable Markdown/HTML summary.

---

## 14. Success criterion

Content Automation v2 is successful when adding a recognisable 6–11 player team usually requires humans to do only:

1. approve/resolve ambiguous Character vs CharacterVersion decisions;
2. approve evidence quality where needed;
3. approve one visual candidate per target;
4. author/review gameplay balance and special identity;
5. run/approve final quality gates.

Everything else should be prepared, generated or validated by tooling.

The ideal long-term result is that adding 10 teams is closer to **10 review packages** than to manually editing hundreds of registry, asset, scenario and provenance rows.

---

## 15. Production prerequisites

Before implementing v2, inspect the existing `team-pipeline.mjs`, Content Factory and Asset Factory and extend them incrementally rather than creating a disconnected second pipeline.

A Production spec must define:

- trusted/allowed research source strategy;
- Research Pack schema;
- identity/version resolver interfaces;
- evidence quality thresholds;
- asset-source adapters and failure policy;
- scenario asset schema;
- batch error isolation;
- deterministic/idempotent outputs;
- tests proving unchanged inputs do not rewrite approved content.
