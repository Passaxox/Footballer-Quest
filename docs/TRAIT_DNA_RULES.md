# Footballer Quest — DNA Trait Contribution Rules

**Status:** APPROVED_CONCEPT / Director-frozen structure; exact Trait thresholds remain balance work  
**Milestone:** M2 Trait foundation / M4 advanced DNA bridge

This document clarifies how DNA fusion contributes to Element Traits and Team/Affiliation Traits.

## 1. Element contribution

For a fused PlayerInstance with two **different** elements:

- recipient / primary element contributes `1.0`;
- donor / secondary element contributes `0.5`.

The `0.5` weighting exists only for Trait composition. It does not make the secondary defensive type a “half type” in combat matchup math.

## 2. Same-element DNA does not duplicate contribution

If both DNA parents have the same element, the fused result contributes only once to that Element Trait.

Examples:

- `Fuoco + Fuoco` -> `Fuoco +1.0`, **not** `+1.5`;
- `Aria + Aria` -> `Aria +1.0`, **not** `+1.5`.

Do not represent a same-element fusion as a duplicated type such as `[fuoco, fuoco]` for Trait counting.

The intended principle is:

> DNA can broaden an elemental build, but cannot manufacture extra votes for an element already present as the recipient's primary identity.

## 3. Six-player examples

Using the current working threshold candidate `2 / 4 / 6`:

### Six Fuoco/Aria fused players

If all six have Fuoco primary and Aria secondary:

- Fuoco = `6 x 1.0 = 6.0` -> candidate Tier III;
- Aria = `6 x 0.5 = 3.0` -> candidate Tier I.

### Split primary identity

If the team contains:

- 3 Fuoco/Aria;
- 3 Aria/Fuoco;

then:

- Fuoco = `3 x 1.0 + 3 x 0.5 = 4.5`;
- Aria = `3 x 1.0 + 3 x 0.5 = 4.5`.

Under `2 / 4 / 6`, both would currently reach candidate Tier II.

This outcome is **desirable in principle**: a six-player team deliberately built around DNA should be capable of unusual hybrid builds. It must still be checked by simulation before thresholds are frozen.

## 4. No arbitrary active-Trait cap

Do not add a rule such as “maximum two active Traits” merely to suppress strong hybrid builds.

If a player invests the roster slots, DNA opportunities and acquisition effort required to activate several Traits, the build should generally receive those rewards.

Balance should primarily come from:

- acquisition/accessibility;
- opportunity cost;
- limited roster size;
- DNA availability;
- CharacterVersion composition;
- threshold tuning;
- effect strength;
- encounter/run constraints.

The Trait Coverage Gate and simulation should identify combinations that become too easy or dominant.

## 5. Team/Affiliation Traits do not inherit donor affiliation by default

DNA element inheritance and Team Trait identity are separate systems.

The fused PlayerInstance keeps the recipient CharacterVersion's normal Team/Affiliation contribution unless a future explicit authored rule says otherwise.

Example:

- a Raimon CharacterVersion fused with a Diamond Dust donor does **not** automatically become `0.5 Diamond Dust`;
- the donor's element may contribute `0.5` to an Element Trait;
- the donor's historical/team affiliation does not automatically enter the TraitSnapshot.

This prevents DNA from fabricating canon affiliation and preserves the version-scoped team rule.

## 6. Relationship with combat dual typing

Trait contribution weighting must remain separate from combat type logic.

- two different fused elements can both be real combat types;
- same-element DNA does not create a duplicated defensive type;
- the secondary Trait contribution is `0.5`, but the secondary combat type is not “half effective”.

## 7. Simulation requirements

Before Production freeze, Trait simulation should explicitly test:

- six same-primary hybrid players;
- 3/3 mirrored hybrid teams;
- mixed DNA + mono-element teams;
- overlap between Element Traits and Team Traits;
- how easily Tier I / II / III combinations occur in realistic acquisition pools;
- whether any hybrid configuration becomes a near-mandatory optimal build.

Exact thresholds remain RESEARCH until these tests are run.
