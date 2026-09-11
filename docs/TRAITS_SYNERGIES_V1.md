# Footballer Quest — Traits & Synergies v1 (Draft Spec)

**Status:** DESIGN DRAFT — not yet Production-frozen  
**Milestone:** M2 — “Costruisco la mia squadra”  
**Purpose:** make team composition strategically meaningful without turning Traits into a flat stat-inflation layer.

This document refines the historical Pokelike-inspired Trait/Affinity direction using the current repository architecture (`CharacterVersion.teamTags`, `types[]`, seeded run variety, scenario/event weighting and temporary modifiers).

---

## 1. Design goal

Traits should answer:

> “Why would I recruit this player instead of the one with the highest raw stats?”

A good Trait system should make the same-level team play differently because of composition, route opportunities, status interactions and build choices.

Traits are **not** the type/resistance chart and are **not** a substitute for Team Moves.

- **Type matchup** = offensive/defensive effectiveness.
- **Trait/Synergy** = composition-based build effects.
- **Team Move** = explicit combined technique/action unlocked by composition or exact Characters.

---

## 2. v1 Trait families

Start with two primary families only.

### A. Element Traits

Sources: the player's element/type identity.

Examples:

- `element:fuoco`
- `element:aria`
- `element:terra`
- `element:natura`

These should express broad gameplay identities, but must not force every move of an element into the same effect.

### B. Team / Affiliation Traits

Sources: explicit verified `teamTags` on the CharacterVersion.

Examples:

- `team:raimon`
- `team:royal-academy`
- `team:diamond-dust`
- `team:gemini-storm`
- `team:epsilon`

`teamTags` are canon/content metadata first. A Trait definition may choose to consume a tag, but adding a teamTag must never be done merely to enable a synergy.

### Not v1 core

Do not make Role, Gender, Arc or Era full Trait families in v1.

They remain valid Condition Engine inputs for events, Team Moves, Guides and special conditions, but role/gender/arc Traits would add breadth before we know whether they create meaningful decisions.

---

## 3. Contribution rules

### Standard CharacterVersion

- mono-element player -> `+1.0` to its Element Trait;
- each explicit eligible teamTag -> normally `+1.0` to the corresponding Team/Affiliation Trait.

A CharacterVersion may contribute to multiple explicit affiliation tags if the data legitimately contains them. Do not create synthetic tags just to increase Trait coverage.

### DNA fused PlayerInstance

For element contribution:

- recipient element -> `+1.0`;
- donor/secondary DNA element -> `+0.5`.

This is separate from combat dual-typing: both types are real in matchup math, but the second type contributes only half a Trait point.

For team/affiliation contribution, v1 should preserve the recipient's canonical/run identity unless later DNA design explicitly defines affiliation inheritance. Do **not** automatically merge every teamTag from both parents in v1.

### Rare / special versions

Rarity alone must **not** multiply Trait contribution.

A future version may explicitly define a special Trait affinity such as `1.5` or an alternate contribution rule, but that must be authored as a CharacterVersion/variant property and justified by design/canon — never inferred from `rarityId`.

---

## 4. Who counts toward a Trait?

Trait composition is based on the current team roster, not only currently living/active players.

Recommended v1 rule:

- a player occupying a team slot contributes even if temporarily KO;
- removing/replacing a player changes Trait totals;
- the active player does not receive extra contribution merely for being active.

Reason: Traits represent **team construction**. Making every KO instantly break thresholds would create snowball, UI churn and difficult-to-read mid-battle state changes in a combat system where only one player is active at a time.

Individual Trait effects may still check `active`, `alive`, HP threshold or status when the effect itself requires it.

---

## 5. Threshold model

Historical working model: `2 / 4 / 6` points.

This remains a **candidate**, not frozen balance data.

Why it is a good starting point for a six-player team:

- Tier I can be reached through a small pairing;
- Tier II asks for deliberate commitment;
- Tier III represents a near/full build;
- DNA half-points create meaningful edge cases without giving a dual-type player two full votes.

Examples:

- 2 Fuoco -> Element Fuoco Tier I;
- 4 Fuoco -> Tier II;
- 6 Fuoco -> Tier III;
- 1 Fuoco + two DNA players with Fuoco as secondary (`0.5 + 0.5`) -> 2 total -> Tier I.

Thresholds must be simulated against real six-player team composition before Production freeze.

---

## 6. Effect vocabulary

Traits should use a small reusable effect vocabulary instead of bespoke engine branches per Trait.

Candidate effect categories:

### Combat

- `statModifier`
- `damageVsStatus`
- `statusApplyBonus`
- `statusDurationBonus`
- `statusResistance`
- `healModifier`
- `guardModifier`
- `priorityModifier`
- `critModifier`

### Run / world

- `encounterWeight`
- `eventWeight`
- `rarityWeight`
- `rewardMultiplier`
- `recruitModifier`
- `marketModifier`
- `conditionFlag` / eligibility hook

Current Run Variety already has contextual rarity/team weighting and temporary modifiers. Trait effects that influence future encounter/event selection should reuse or compose with that direction instead of creating a second unrelated weighting engine.

Important: Traits may affect **future generated nodes**, but must never reroll or mutate a node already generated/persisted in the save.

---

## 7. Element identity lanes — design direction, not final effects

These are thematic lanes to guide move/Status/Trait design. They are deliberately broader than “one element = one status”.

### Fuoco — Pressure / Momentum

Potential identity:

- Burn interaction;
- offensive momentum;
- bonus against damaged/statused enemies;
- risk/reward or recoil synergy;
- aggressive encounter/reward options.

Avoid making Fuoco simply “highest ATK”.

### Aria — Tempo / Control

Potential identity:

- SPD / priority manipulation;
- Confusion application/support;
- Freeze/ice control for appropriate techniques;
- action-denial or tempo effects kept short and readable;
- tactical encounter/event manipulation.

Air can support both Confusion and Freeze depending on technique/CharacterVersion. No one-status-per-element rule.

### Terra — Structure / Stability

Potential identity:

- Guard/defensive structure;
- resistance to stat disruption;
- protection/anchoring effects;
- retaliation or payoff for surviving pressure;
- stable/reliable build effects rather than pure healing.

Future status research should find a thematic Terra status/effect that does not merely rename existing DEF/ATK debuffs.

### Natura — Sustain / Adaptation

Potential identity:

- healing/drain interactions;
- status recovery or cleansing;
- resource/recruit/recovery opportunities;
- adaptive benefits based on longer fights or varied team composition.

Avoid making Natura only “healing element”.

---

## 8. Team Trait philosophy

Team Traits should feel like the identity of the actual Inazuma team/faction, not generic `+10%` templates with a different logo.

Examples for later authorship:

- **Raimon** -> resilience, adaptation, comeback, training/event opportunities;
- **Royal Academy** -> control, tactical pressure, debuff/precision-oriented play;
- **Alius / specific Alius teams** -> risk/reward, unusual encounter routes, aggressive/special conditions;
- **Diamond Dust** -> control/freeze-oriented interactions where canon/gameplay supports them;
- **Gemini Storm** -> speed/tempo/alien-event interactions where appropriate.

These are design directions only. Final per-team effects need canon/product review and balance.

A broad faction Trait and a specific team Trait may coexist later if the data model distinguishes them clearly. Do not assume current `teamTags` already represent a perfect hierarchy.

---

## 9. Status / Condition integration

Status effects are a separate vocabulary consumed by moves and Traits.

Current/future examples:

- Burn;
- Confusion;
- Freeze/Frozen;
- future Terra/Natura conditions after research.

Trait examples:

- `Aria I`: slightly improve application reliability for eligible control statuses;
- `Diamond Dust II`: bonus against Frozen targets;
- `Natura I`: improve status recovery or healing efficiency;
- a Team Trait may convert a status into a special payoff.

Exact values and status rules remain separate balance work in `ROADMAP_QUEUE.md` Q-001.

---

## 10. Guide interaction

Guides should be able to modify Trait **behaviour**, not falsify Character identity.

Allowed future patterns:

- add a small contribution bonus to a defined Trait family;
- lower/reshape a threshold under explicit conditions;
- modify one tier effect;
- enable an event when a Trait reaches a threshold;
- change which run opportunities a Trait influences.

Example concept:

`Silvia [Guide]` may make Raimon-oriented composition open extra support/training opportunities.

Do not rewrite `teamTags` on CharacterVersions to simulate a Guide bonus.

---

## 11. UI requirements

Traits must be readable during decisions, especially Starter Selection and recruitment.

Minimum v1 UX:

### Team summary

Show active Traits and progress, e.g.:

`FUOCO 3.0 / 4 -> Tier I active`

`RAIMON 2 / 4 -> Tier I active`

### Add/remove preview

When hovering/tapping a recruit or starter candidate, show the composition delta:

`+ Axel Blaze`

`Fuoco 1 -> 2  [Tier I unlocked]`

`Raimon 2 -> 3`

This is more important than showing every internal formula.

### Battle UI

Do not flood the portrait battle HUD with all Trait details.

Show only:

- small active Trait indicators;
- explicit feedback when a Trait changes an action/outcome;
- full details available from team/info view.

---

## 12. Runtime calculation direction

Prefer a pure derived calculation such as:

`calculateTeamTraits(team, catalog, guide, runState) -> TraitSnapshot`

A snapshot should conceptually contain:

- point totals;
- active tier per Trait;
- source breakdown for UI/debugging;
- resolved combat modifiers;
- resolved run-weight modifiers;
- condition/event hooks.

Do not persist a duplicate canonical Trait total if it can be deterministically derived from the saved team + authored data.

Persist only state that genuinely cannot be reconstructed, such as event flags or temporary effects.

---

## 13. Save / determinism rules

- Old saves without Trait fields must continue loading.
- Traits should derive from existing identity/version/team data wherever possible.
- Seeded run generation must remain deterministic for the same saved run state.
- A team change may alter **future** encounter/event weights.
- A previously generated/persisted pending node must remain unchanged.
- Trait calculation order must not depend on object iteration accidents or UI render order.

---

## 14. v1 scope recommendation

Do **not** launch M2 with 30 fully bespoke Traits.

Recommended first production slice later:

1. generic Trait registry + calculator;
2. four Element Traits with simple Tier I/Tier II proofs;
3. 2–3 well-supported Team Traits;
4. one combat-facing Trait interaction;
5. one run-facing Trait interaction using existing event/encounter weighting;
6. Starter/Team UI progress and add/remove preview;
7. tests and a deterministic simulation report.

Only after the system proves fun/readable should we author many team-specific Traits.

---

## 15. Acceptance criteria for eventual Production

A future implementation should not be called PASS unless:

- Trait totals derive correctly from CharacterVersions/teamTags/types;
- DNA secondary contribution can represent `0.5` without floating-point/UI ambiguity;
- rarity does not automatically increase contribution;
- KO does not silently destroy composition Traits under the v1 rule;
- changing team composition recomputes Traits immediately;
- an already generated node is not rerolled by a later Trait change;
- at least one Trait affects combat and one affects run generation/reward opportunity;
- UI clearly explains why adding/removing a player activates/deactivates a tier;
- save/backcompat and seeded determinism regressions pass;
- two comparable teams can demonstrate visibly different build behaviour.

---

## 16. Decisions still requiring Director freeze

Before implementation, explicitly confirm:

1. final threshold ladder (`2/4/6` or alternative);
2. whether every canonical `teamTag` contributes `1.0` or whether team/faction namespaces need normalization first;
3. first 2–3 Team Traits used as pilots;
4. exact four Element Trait effects for the pilot;
5. whether KO players count toward team composition — this draft recommends **yes**;
6. exact status hooks available in the first M2 slice.

Until those are frozen, this file is a design specification, not an implementation request.
