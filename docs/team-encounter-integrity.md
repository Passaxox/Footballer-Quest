# Team / player / encounter integrity

Baseline: `41d21d8e98f1d92bce78b17d028f3ed1ff77f112`.

## Repository trace and pre-edit issue matrix

| Hypothesis | Status | Source / function | Actual failure and severity | Bounded remediation |
|---|---|---|---|---|
| H1 | CONFIRMED | engine.js `generateWaveNode`, data.js `TEAM_NAMES`, `BOSSES` | High: random school banner independent of lineup; composite bosses claim canonical identity | Team-first selection; explicit mixed/special identity |
| H2 | CONFIRMED | scenarios.js `scenarioPool`, engine.js `generateWaveNode` | High: international scenario spans teams | Choose a ready team before sampling members |
| H3 | NOT PRESENT | engine.js `generateWaveNode` | No positional/filler fallback exists; no GK/DF/MF constraints in sequential combat | Bounded sampling and explicit mixed fallback, never off-team filler |
| H4 | PARTIAL | catalogMetadata.js `VERSION_METADATA` | Medium: Chaos/Genesis and umbrella Alius share tags; no historical membership inferred | Separate active affiliation, retain tags as context |
| H5 | PARTIAL | scenarios.js `scenarioPool` | Potential umbrella leakage; current active scenarios do not select Alius | Canonical affiliation drives canonical pools |
| H6 | CONFIRMED | TeamSelect.jsx `roster`, `toggle` | High: flat unlocked version cards can select Jude twice | Canonical identity guard; defer selector redesign |
| H7 | CONFIRMED | App.js `joinTeam`, engine.js `newRun` | High: no ownership uniqueness guard, even same version can repeat | Shared canonical identity guard at mutation boundary and UI |
| H8 | ALREADY SAFE | scenarios.js `isFreshPlayerVersion`, engine.js `freshEventId`, `newRun` | Jonas/base excluded; saved snapshots deliberately resolve | Retain and validate quarantine |
| H9 | PARTIAL | catalog.js `encounterTier`, data.js `ROSTER`, engine.js `scale` | rarityId is null and never scales stats; authored high-tier stats/moves correlate with boss strength | Document; no balance rewrite |
| H10 | ALREADY SAFE | catalog.js, engine.js `createPlayer`, `fusePlayers` | Authored versions separate from mutable instances; fusion stores parents, not versions | Preserve boundary; no CombatForm implementation |

Trace: data.js / catalogExpansion.js → catalog.js Character/CharacterVersion → engine.js createPlayer → scenarios.js pools → generateWaveNode → App.js pending/battle/recruit → TeamSelect.jsx → storage.js loadRun → normalizeRun/withPlayerIdentity. Persisted pending encounters bypass generation.

## Identity evidence and scope

The checked-in identity audit verifies Paolo/Fidio as one person while explicitly retaining separate technical IDs and collection histories. Use an alias comparison key, not an ID migration. Jude Royal already links to Jude. Byron is not duplicated. Jonas/base remains ambiguous and quarantined; Austin/Joseph have documented portrait/move concerns, not proof of duplicate people. Do not invent affiliations for unverified incarnations.

Combat uses sequential opponents: ordinary squads contain 2–3 people, bosses authored 2–3; no goalkeeper, captain or fixed position constraint exists. Readiness is size-dependent and counts distinct canonical people, not tags or versions. Teams without verified membership remain unavailable for canonical generation.

W10 can use existing verified Royal versions. W20 is already coherent. W30/W40/W50 retain their authored combat participants and balance but must be explicitly special selections, not Chaos/Genesis/Little Gigant teams. Existing persisted boss banners/players remain unchanged.

Generic recruitment is scenario-based (events use a broader pool); post-wild-match offers come from the defeated player. Ownership checks must also guard persisted offers and stale callbacks. Existing duplicate saves load untouched, but cannot acquire more duplicates.

## Deferred architecture

The starter UI remains a flat unlocked CharacterVersion list. Grouped Character tiles are a later UI phase. Runtime still consumes one element and one move; dual elements, multiple moves, CombatForms, Mixi Max, Spirit Warriors and managers need explicit runtime/UI contracts later. Nullable catalog fields are not implementations. Environment tags remain presentation/future routing hooks; no pool rotation or environment rebalance is introduced here.

## Implemented contract

`primaryTeamId` is catalog-only metadata. Existing base versions backfill only from one unambiguous non-umbrella membership; expansion versions use their authored team. Multiple ambiguous memberships yield null, never a guessed first team. `teamTags` and saved PlayerInstances stay intact. Future authored versions should explicitly declare their active team; historical/faction tags are not lineup permissions.

`selectEncounterLineup` chooses a ready team from the eligible scenario rows, then samples only that team, without replacement by canonical identity. If no team can fill the requested size, the lineup is explicitly `mixed`, with null teamId and a noncanonical title. Existing `kind` still drives combat/reward behavior; additive `encounterType` describes identity independently (bosses can be canonical or special).

`canonicalCharacterId` compares the verified Paolo/Fidio alias and all versions of one character. Persisted technical characterId/versionId, collection histories and legacy duplicate squads are not rewritten. New starter selections, encounter sampling and recruitment mutations use this comparison; fusion parents count as owned identities. A full recruit pool yields a skippable empty recruitment node, not bonus training or a reroll.

## Readiness at this revision

Counts include fresh versions grouped by canonical person, at all tiers. Per-scenario tier gates are applied again before selecting an actual encounter. There is no imposed goalkeeper/captain requirement.

| Team | Members | Two opponents | Three opponents |
|---|---:|---|---|
| Raimon | 10 | ready | ready |
| Royal Academy | 9 | ready | ready |
| Zeus | 11 | ready | ready |
| Unicorn | 2 | ready | incomplete |
| Chaos | 2 | ready at tier 4; no active scenario | incomplete |
| Fire Dragon | 1 | incomplete | incomplete |
| Knights of Queen | 1 | incomplete | incomplete |
| The Empire | 1 | incomplete | incomplete |
| Genesis | 1 | incomplete | incomplete |
| Little Gigant | 1 | incomplete | incomplete |

All other registry entries have zero certified active members: Alius Academy (umbrella), Gemini Storm, Epsilon, Epsilon Plus, Diamond Dust, Prominence, Dark Emperors, Absolute Royal Academy, Inazuma Japan, Big Waves, Desert Lion, Orpheus, Neo Japan. This is catalog readiness, not a claim that the fictional team has no roster.

## Verification

- 1,200 production-generated canonical encounters over representative seeded Raimon/Royal/Zeus scenarios: zero off-team members, zero duplicate people, identical repeated seeded results.
- Another 1,800 three-member canonical selections plus 600 mixed international / 600 two-member Unicorn checks and alias-heavy urban samples.
- Negative validator tests: missing Character/team, incomplete canonical scenario, legacy pool leakage, off-team boss and mixed canonical banner.
- Save tests preserve old duplicated squads, Jonas snapshots and pending boss lineups without RNG or migration. saveVersion remains 2; metaSchemaVersion unchanged.
- Ownership UI tests cover alternate starter versions, stale/persisted duplicate offers, defeated owned versions, empty recruitment and double skip.
- Full validation: 120 Node tests (85 foundation plus assets, path-safe tooling and release tooling), 81 UI tests; balance audit and asset audit pass. Asset audit retains 47 legacy warnings, zero missing/orphan/invalid assets.
- Production web build compiled successfully; `git diff --check` passes. No APK, dependency change, save-schema bump or Overworld file change.
- W10 now uses Jude Royal, Herman Waldon and Daniel Hatch. This necessarily changes the checkpoint's authored combat profiles; formulas, level guardrails, reward budget and W10→W11 flow are unchanged. W30/W40/W50 keep all original combat profiles under honest selection titles.

Known limits: validators establish structural coherence, not external canonical truth. Austin/Joseph's existing identity/gameplay warnings are not resolved. Paolo/Fidio retain two technical catalog/collection records but cannot coexist in new normal squads. New roster batches still require evidence-backed affiliation and identity review before enabling canonical teams.
