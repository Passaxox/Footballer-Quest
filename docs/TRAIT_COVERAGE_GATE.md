# Footballer Quest — Trait Coverage Gate

**Status:** APPROVED_CONCEPT  
**Milestone:** M2 Traits/Synergies foundation  
**Purpose:** prevent a Team Trait from becoming nominally available but practically impossible to build around in a real run.

A Trait is not ready for normal player-facing activation merely because its tier effects are designed. It must also have enough valid CharacterVersions, role coverage and realistic acquisition paths for a player to make an intentional build decision.

---

## 1. Standard Team Trait coverage target

For a normal six-player team Trait intended to support a deliberate build, use approximately **10–12 valid CharacterVersions** as the default coverage target before activation.

This is a design target, not an absolute canon quota. Exceptions are allowed only when the Trait is intentionally rare/secret/event-specific and that scarcity is part of the design.

The goal is to ensure that reaching a high tier does not require finding one exact six-player lineup.

---

## 2. Role coverage gate

Raw CharacterVersion count is not sufficient.

A standard Team Trait should support a legal and reasonably varied team structure across the game roles:

- at least one viable goalkeeper option;
- enough defenders, midfielders and attackers that a six-player roster can be built without one forced exact composition;
- more than one meaningful choice in the major outfield roles where the canon/content pool allows it.

A Trait with 12 versions but no goalkeeper, or only one attacker that is extremely rare, does not automatically pass the gate.

---

## 3. Accessibility gate

Coverage must be measured in the context of an actual run, not only in the global catalog.

Audit at least:

- CharacterVersion count contributing to the Trait;
- role distribution;
- explicit collection rarity (`rarityId`) and encounter availability;
- starter eligibility/unlock path when relevant;
- recruit availability;
- scenario/arc/location eligibility;
- earliest practical point in a run where the versions can appear;
- whether enough compatible versions can coexist in the same run path;
- duplicate/exclusion rules that may reduce the effective pool.

A raw catalog count may pass while the practical run pool fails.

---

## 4. Version-scoped counting

Count **CharacterVersions**, not only canonical Characters.

The same Character may legitimately contribute to different Team Traits through different verified versions. Examples include a Raimon, Royal Academy or Inazuma Japan incarnation where those versions are canonically/visually/gameplay-distinct and separately represented.

Do not inflate coverage by attaching historical affiliations to one generic CharacterVersion.

---

## 5. Multi-Trait / overlap audit

The audit should report overlap between Traits.

Useful outputs include:

- versions carrying one Team Trait;
- versions legitimately carrying multiple compatible affiliation/faction tags;
- Element Trait + Team Trait combinations;
- future DNA secondary element contribution where applicable;
- a matrix showing how much two candidate builds share the same obtainable versions.

Overlap is desirable when it creates build choices, but one small set of universal characters should not become the optimal bridge for every Trait.

---

## 6. Reachability simulation

Before freezing a normal Team Trait for Production, simulate whether a typical run can realistically reach the candidate thresholds.

For the current working `2 / 4 / 6` model, report at minimum:

- probability of reaching Tier I;
- probability of reaching Tier II;
- probability of reaching Tier III;
- median/typical point in the run where each tier becomes reachable;
- sensitivity to starter selection, scenario path and rarity weighting.

The purpose is not to make every Trait equally easy. The purpose is to make differences intentional and visible rather than accidental artifacts of content coverage.

---

## 7. Comparative fairness

When multiple standard Team Traits coexist, compare them side by side.

A difference of one or two valid CharacterVersions can be acceptable. A large difference requires an explicit design reason and should be visible in the audit.

Do not balance only by catalog count. A 12-player Trait whose usable versions are mostly late/rare may be less reachable than a 9-player Trait with broad starter/recruit coverage.

---

## 8. Manager AI implication

Manager/Coach-controlled enemy teams use the same roster-composition logic.

A Manager changing the **active player** does not change a Team Trait if the underlying battle roster remains the same. The Trait represents team construction, while the Manager AI decides how to exploit the active Trait state through switching, status application, burst windows, protection and other tactics.

If a future mode allows true substitution between the battle roster and an external bench/reserve pool, the Trait snapshot must be recalculated when roster membership changes.

---

## 9. Automation requirement

This gate should become part of the future Content Automation / Research Factory rather than a recurring manual spreadsheet task.

Target report per Trait:

- total CharacterVersions;
- unique canonical Characters;
- role split `P/D/C/A`;
- explicit rarity split;
- starter/recruit/source split;
- scenario/arc coverage;
- multi-Trait overlaps;
- earliest availability;
- candidate `2/4/6` reachability simulation;
- `PASS / REVIEW / FAIL` coverage result;
- concrete missing coverage, e.g. `needs goalkeeper`, `too late-run`, `Tier III improbable`, `rarity concentration too high`.

Human judgment remains responsible for deciding whether a canon-limited exception is desirable.

---

## 10. Current pilot snapshot

### Diamond Dust

Current authored manifest contains **11 verified CharacterVersions** with role split:

- `P: 1`
- `D: 5`
- `C: 3`
- `A: 2`

This passes the **raw count and role-shape target** for a six-player build.

However, all current Diamond Dust manifest rows use `encounterTier: 3` and do not currently author an explicit collection `rarityId`. The runtime rarity fallback maps tier 3 to `rare` when `rarityId` is missing. Therefore Diamond Dust does **not yet have a proven accessibility PASS** for Trait activation; rarity/acquisition distribution must be reviewed or explicitly authored before Production.

### Gemini Storm

Current authored manifest also contains **11 verified CharacterVersions** with role split:

- `P: 1`
- `D: 4`
- `C: 4`
- `A: 2`

It therefore provides a useful coverage comparator for Diamond Dust. Like Diamond Dust, its current manifest rows use `encounterTier: 3`, so practical accessibility still requires the same rarity/acquisition audit.

---

## 11. Production rule

A standard Team Trait may have its **identity/tier design approved before coverage passes**, but it must not be treated as fully Production-ready until the coverage audit is `PASS` or the Director explicitly approves an intentional rare/secret exception.
