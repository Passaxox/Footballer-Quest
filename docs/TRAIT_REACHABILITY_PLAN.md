# Footballer Quest — Trait Reachability Plan

**Status:** DESIGN / validation plan — not Production-frozen  
**Milestone:** M2 Traits/Synergies foundation  
**Purpose:** verify that Trait thresholds create meaningful run decisions instead of automatic completion, dead builds or one dominant hybrid pattern.

This plan complements `TRAIT_COVERAGE_AUTOMATION_SPEC.md`, `TRAIT_COVERAGE_GATE.md`, `TRAIT_DNA_RULES.md`, `TRAIT_INTERACTION_RULES.md`, `ELEMENT_TRAITS_V1.md`, `TRAIT_PILOTS.md` and `AFFILIATION_TRAIT_MODEL.md`.

---

## 1. Core question

For every Trait family, answer:

> Can a player intentionally build toward this Trait, while still facing a real possibility of stopping at Tier I or Tier II because the run offers better alternatives, insufficient coverage or conflicting roster priorities?

A healthy run should not guarantee that every started Trait reaches its next tier.

---

## 2. Working threshold model

The current candidate threshold ladder remains:

- Tier I: `2` points;
- Tier II: `4` points;
- Tier III: `6` points.

This is still balance data, not Production-frozen.

For Element Traits:

- primary element contributes `+1.0`;
- DNA secondary contributes `+0.5`;
- same-element DNA does not create `+1.5` for one element.

With six roster slots, the ordinary mono-element total is `6.0`; a fully fused six-player roster with six different valid secondary elements can reach at most `9.0` total Element-Trait points spread across elements.

Implication to validate:

- `Tier III + Tier I` can be possible;
- `Tier II + Tier II` can be possible;
- `Tier III + Tier II` should not be possible from Element points alone in a six-slot roster under the current `1.0 / 0.5` model;
- three simultaneous Element Tier II results should not be possible from Element points alone.

These are arithmetic sanity checks, not substitutes for real acquisition simulation.

---

## 3. Phase A — deterministic build-topology tests

Before Monte Carlo simulation, test synthetic rosters that validate the scoring model itself.

Required cases:

1. six mono-element players;
2. `3 / 3` split between two elements;
3. three players of one element at run start;
4. `3 primary A / secondary B + 3 primary B / secondary A`;
5. six identical primary elements with six identical secondary elements;
6. mixed fused and non-fused roster;
7. same-element DNA deduplication;
8. one Element Trait plus one Team Trait;
9. one Element Trait plus Team + Faction overlap;
10. several low tiers across different Trait families.

The tests should prove calculations and reveal impossible or unexpectedly easy tier combinations.

---

## 4. Phase B — starter and early-run reachability

Explicitly test starts such as:

- 3 players sharing one element;
- 2 + 1 split;
- 1 + 1 + 1 mixed start;
- early Team-Trait pair plus mixed elements;
- early Alius mixed-subteam pair when a scenario legitimately allows it.

A start with three Natura players, for example, should normally mean:

- Natura Tier I active;
- progress `3/4` toward Tier II;
- **no guarantee** that Tier II will ever be reached.

The player may fail to see another useful Natura recruit, may prefer a Team/Faction threshold, or may intentionally pivot to another build.

---

## 5. Phase C — real content accessibility

Run the audit against actual scenario and recruitment eligibility rather than the global catalog.

For every Trait record:

- first realistic acquisition point;
- Tier I/II/III reach probability;
- median node/wave of first activation;
- role bottlenecks;
- rarity bottlenecks;
- scenario fragmentation;
- starter sensitivity;
- recruit-choice sensitivity;
- DNA sensitivity when fusion becomes realistically available.

A Trait can have enough catalog entries and still fail if those entries cannot coexist in a normal run path.

---

## 6. Phase D — mixed-build stress tests

Always compare pure and hybrid commitments.

Priority cases:

- Aria + Gemini Storm timing overlap;
- Aria + Diamond Dust control overlap;
- Diamond Dust + Alius;
- Gemini Storm + Alius;
- Raimon + Element comeback/sustain interactions;
- Terra + Raimon low-HP/comeback interactions;
- Fuoco recoil + Raimon trigger exclusions;
- Natura sustain plus defensive Team Traits;
- DNA-enabled two-element builds;
- mixed Alius roster with low Team tiers versus mono-team vertical specialization.

Use `TRAIT_INTERACTION_RULES.md` as the stacking/anti-loop authority.

---

## 7. Healthy reachability targets — qualitative, not frozen percentages

The first balancing pass should aim for these shapes:

### Tier I

- commonly reachable when the player deliberately pairs compatible recruits;
- should appear early enough to teach the system;
- should not require a near-perfect run.

### Tier II

- deliberate commitment;
- plausible in many runs but not automatic merely because Tier I was reached;
- should compete meaningfully with another Element/Team/Faction direction.

### Tier III

- strong commitment / build-defining endpoint;
- should normally require sacrificing breadth elsewhere;
- should not be guaranteed by choosing a starting element or team identity;
- may be unavailable in some valid runs without that being considered a bug.

Exact probability targets are deferred until the simulator is running on real content.

---

## 8. Failure conditions to flag

Reachability review should raise `REVIEW` or `FAIL` when one of these appears:

- Tier II is effectively automatic once Tier I activates;
- Tier III is routinely reached without deliberate commitment;
- a presented Trait is practically unreachable in its intended scenario;
- one hybrid DNA pattern dominates most alternatives;
- Team + Faction overlap gives substantially more power for the same roster cost than pure or unrelated builds;
- a Trait needs exact rare recruits with no meaningful alternatives;
- one starter set predetermines the whole run build too strongly;
- role requirements force a nominal build into an invalid team;
- a player cannot understand why a tier was or was not reached from the composition UI.

---

## 9. Roguelite/run-identity requirement

Trait reachability should reinforce run identity:

- the player starts with a direction, not a guaranteed completed build;
- recruitment offers create pivots and tradeoffs;
- an unexpectedly good recruit may justify abandoning progress toward one Tier II to activate another synergy;
- a full Tier III build should feel like something the run allowed and the player chose to pursue, not a scripted reward for selecting an element at the beginning.

This principle is as important as the raw probability numbers.

---

## 10. Next implementation step

Extend the planned `tools/traits/coverage-audit.mjs` so its first usable slice can:

1. calculate Element/Team/Faction contributions correctly;
2. run the deterministic topology cases above;
3. report active tiers for supplied synthetic rosters;
4. flag impossible/dominant combinations;
5. only then add real-pool Monte Carlo reachability.

Do not tune final Trait effect magnitudes before reachability and mixed-build topology are understood.
