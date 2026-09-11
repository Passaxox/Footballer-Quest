# Footballer Quest — Automated Trait Coverage Audit Spec

**Status:** DESIGN SPEC — not Production-frozen  
**Milestone:** M2 tooling support  
**Purpose:** turn `TRAIT_COVERAGE_GATE.md` into a repeatable machine-generated report instead of a recurring manual audit.

## 1. Goal

Given the current catalog, CharacterVersions, teamTags, rarity/accessibility data and scenario pools, generate a deterministic report showing whether each candidate Trait is realistically buildable.

The audit should answer:

> “Can a normal player intentionally build toward this Trait in a real run, and how does that compare with the other available Traits?”

## 2. Suggested command

Working direction:

```bash
node tools/traits/coverage-audit.mjs
```

Optional filters later:

```bash
node tools/traits/coverage-audit.mjs --trait team:diamond-dust
node tools/traits/coverage-audit.mjs --trait element:aria
node tools/traits/coverage-audit.mjs --scenario alius
node tools/traits/coverage-audit.mjs --simulate 10000
```

The exact CLI is not frozen; the important requirement is deterministic, scriptable output.

## 3. Inputs

Prefer deriving from existing authoritative data rather than introducing a second manual registry.

Expected inputs:

- Character / CharacterVersion catalog;
- `teamTags`;
- `types[]` / primary-secondary DNA rules when simulation enables fusion;
- role `P/D/C/A`;
- explicit `rarityId` or the runtime fallback rarity result;
- encounter tier;
- scenario eligibility and weighted pools;
- starter/recruit eligibility when implemented;
- exclusion/duplicate rules;
- Trait definitions and candidate thresholds;
- DNA contribution rules from `TRAIT_DNA_RULES.md`.

## 4. Per-Trait static report

For every Team or Element Trait report:

- Trait ID;
- total CharacterVersions;
- unique canonical Characters;
- role split `P/D/C/A`;
- element split;
- rarity split;
- encounter-tier split;
- scenario/arc/location availability;
- earliest eligible wave/segment where known;
- starter/recruit source split when those systems exist;
- multi-Trait overlap matrix;
- versions with multiple legitimate affiliations;
- versions blocked by missing evidence/assets/runtime availability;
- Coverage Gate static result: `PASS / REVIEW / FAIL`.

## 5. Accessibility warning rules

The first version may use clear deterministic warnings before full Monte Carlo simulation exists.

Examples:

- `LOW_VERSION_COUNT`
- `MISSING_GOALKEEPER`
- `FORCED_EXACT_LINEUP`
- `RARITY_CONCENTRATION`
- `ALL_LATE_RUN`
- `SCENARIO_FRAGMENTATION`
- `TIER_III_STATICALLY_IMPOSSIBLE`
- `DUPLICATE_RULE_REDUCES_POOL`
- `UNRESOLVED_IDENTITY_ROWS`
- `NO_STARTER_PATH`
- `DNA_OVERLAP_DOMINANT`

Warnings should include concrete supporting rows/counts, not only a label.

## 6. Reachability simulation

When run simulation is added, preserve the same seeded deterministic RNG philosophy as Run Variety.

For each Trait and candidate threshold ladder, estimate:

- Tier I reach probability;
- Tier II reach probability;
- Tier III reach probability;
- median first wave/node where each tier is reached;
- percentile spread;
- starter sensitivity;
- scenario-path sensitivity;
- rarity/accessibility sensitivity;
- effect of reasonable recruitment choices;
- effect of DNA availability when enabled.

Simulation must not cheat by allowing all global catalog versions to appear regardless of actual pool eligibility.

## 7. DNA stress suite

Always include explicit synthetic/stress cases from `TRAIT_DNA_RULES.md`:

1. same-element fusion -> one `+1.0`, never `+1.5`;
2. six identical-primary/different-secondary hybrids;
3. 3/3 mirrored primary-secondary split;
4. mixed fused and mono-element team;
5. multiple simultaneous Element Traits plus one Team Trait;
6. check whether DNA makes one universal hybrid pattern dominate all others.

These cases should run even before realistic DNA acquisition simulation is available because they validate the calculation model itself.

## 8. Comparative report

Produce a side-by-side table for standard Team Traits.

Useful fields:

- count;
- role breadth;
- rarity breadth;
- earliest availability;
- Tier I/II/III reachability;
- overlap percentage with other Traits;
- Coverage Gate status;
- explicit Director exception if applicable.

This is how we detect accidental imbalance such as one Trait having 25 easy contributors while another has 7 late-game Rare-only contributors.

## 9. Current baseline examples

Known current content should be reproduced by the audit without handwritten special cases:

- Diamond Dust -> 11 versions, `P1/D5/C3/A2`;
- Gemini Storm -> 11 versions, `P1/D4/C4/A2`;
- Epsilon -> 4 versions, `P1/D1/C1/A1`.

If runtime rarity fallback is used because `rarityId` is absent, the report must state that explicitly rather than presenting the derived rarity as authored intent.

## 10. Outputs

Generate both:

### Machine-readable

`tools/traits/coverage-report.json`

Suggested high-level shape:

```json
{
  "schemaVersion": 1,
  "thresholds": [2, 4, 6],
  "traits": [],
  "comparisons": [],
  "dnaStress": {},
  "summary": {}
}
```

### Human-readable

A Markdown or HTML summary suitable for human/agent review.

The summary should highlight only actionable gaps first, with full details expandable/lower in the report.

## 11. CI / workflow direction

Eventually run the static audit automatically when content/manifests/catalog/Trait definitions change.

Do not make early research-stage balance warnings hard CI failures immediately.

Recommended progression:

- phase 1: report only;
- phase 2: fail only on calculation/data-integrity errors;
- phase 3: selected Coverage Gate failures can block a Trait from being marked Production-ready.

Content additions should not fail merely because they improve but do not yet complete a future Trait.

## 12. Human judgment boundary

Automation may say:

`Epsilon standard trait coverage = FAIL: 4 versions only`.

It must **not** decide by itself whether to:

- add eight invented players;
- lower thresholds;
- merge Epsilon into a broad Alius Trait;
- make Epsilon intentionally rare.

Those are Director/design decisions.

The audit provides evidence; it does not replace canon or product judgment.
