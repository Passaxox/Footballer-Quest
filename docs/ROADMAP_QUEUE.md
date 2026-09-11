# Footballer Quest — Roadmap Queue

This file holds approved or promising work that is **not automatically active production scope**.

Every entry should state Milestone, Priority, impact, dependencies and scope guardrails. Moving an entry from Queue to Production requires an explicit Director-layer decision and a frozen task specification.

---

## Q-001 — Status / Condition vocabulary v1

**Milestone:** M2 supporting / M3 Condition Engine bridge  
**Priority:** NEXT (design), later Production after current M1 work is closed  
**Impact:** Build diversity, move identity, Trait/Synergy design, future unique/special techniques  
**Dependencies:** current combat/status model, second-move system, Trait/Synergy specification

### Why

The current combat already supports burn, ordinary stat modifiers, guard and some move-specific effects. M2 will need more expressive states so Traits, unique techniques and CharacterVersion-specific moves can interact with something richer than raw ATK/DEF changes.

### Approved direction

Introduce a small, data-driven status vocabulary rather than hardcoding every future special move as a new branch in the battle engine.

Candidate control/status concepts include:

- **Confusion** — short-duration control state. Working direction: a controlled chance that an attempted action fails; avoid Pokémon-style self-damage unless playtesting gives a strong reason. Exact probability/duration remain RESEARCH.
- **Freeze / Frozen** — short-duration ice/control state suitable for some Air/ice-themed techniques. Prefer a readable penalty such as major SPD/priority suppression or another controlled effect over repeated full turn denial. Exact behaviour remains RESEARCH.
- **Burn** — already exists as the current damage-over-time status and should become part of the same vocabulary rather than a special architectural exception.

Do **not** force exactly one status per element. Status identity should primarily come from the technique/CharacterVersion/lore. Air may legitimately contain both confusion-oriented and ice/freeze-oriented techniques.

Future research should propose distinct thematic options for Terra and Natura without duplicating existing `weaken` / `shatter` stat-stage effects merely under new names.

### Synergy hooks

Traits/Synergies may later interact with status state, for example:

- improve application chance or duration;
- increase damage against a target already affected by a status;
- convert or consume a status for another effect;
- give resistance/recovery to a team composition;
- influence encounter/event opportunities tied to a status-oriented build.

Status effects and elemental resistances remain separate systems.

### Guardrails

- Avoid permanent or chainable hard locks that make fast battles frustrating.
- Prefer short, legible states with explicit UI feedback and deterministic duration handling.
- Status application chance, duration and immunity rules must be testable data, not scattered magic numbers.
- Boss resistance/immunity policy belongs to later balance/Condition Engine work.
- Do not implement a full M3 Condition Engine merely to add the first M2 statuses.

---

## Q-002 — iOS / TestFlight version

**Milestone:** LATER; historically associated with the larger presentation/platform phase around M4  
**Priority:** LATER  
**Impact:** Wider tester/device coverage and eventual iPhone distribution  
**Dependencies:** stable cross-platform game/save layer, mature tester milestone, Apple toolchain/signing access

### Direction

Footballer Quest should preserve a path to an iOS build and future TestFlight testing.

Current repository packaging is Android-oriented through Capacitor. Do not spend current M1/M2 implementation scope on iOS release work, but avoid unnecessary Android-only coupling in shared game logic.

Platform guardrails now:

- keep engine, catalog, save schema and gameplay logic platform-neutral;
- isolate native Android-specific APIs/workflows behind platform boundaries where they are necessary;
- avoid assumptions that persistent game data only exists in an Android-specific storage path;
- keep UI portrait/mobile-first in a way that can scale to common iPhone viewport/safe-area differences;
- do not fork game rules between Android and iOS.

When promoted to Production, expected work includes the Capacitor iOS target, Xcode/macOS build/signing setup, iOS-safe storage/update testing, safe-area/device QA and TestFlight distribution.

This is a future platform task, not a reason to delay current gameplay milestones.

---

## Q-003 — Manager AI profiles linked to Team Traits

**Milestone:** M3 — enemy-team parity / Manager AI  
**Priority:** LATER, but architecture should stay compatible from M2  
**Impact:** Boss identity, tactical variety, stronger team fantasy, reuse of Trait/Synergy systems  
**Dependencies:** Trait/Synergy v1, Enemy Team system, CPU switching, finite enemy inventory/loadouts, Condition Engine v1

### Direction

Manager/Coach AI should not be a disconnected stat-bonus layer. A Manager profile should be able to **read, exploit and shape** the Team Traits of the team it controls.

Two complementary patterns are approved conceptually:

1. **Trait-aware Manager** — the manager recognises the team's active Traits and chooses tactics that exploit them. Example: a control-oriented team preserves status chains, a comeback-oriented team protects resources until a low-HP trigger, an aggressive team prioritises tempo and matchup pressure.
2. **Trait-shaping Manager** — the manager can define or modify how its team expresses a Trait under explicit authored rules. This may mean changing a threshold, unlocking an extra tactical payoff, modifying one Trait effect, or adding a Manager-specific condition — without rewriting CharacterVersion identity or fake teamTags.

Boss Managers should therefore feel like tactical expressions of their team identity, not only stronger generic CPU.

### Future examples

- a Royal-style Manager could favour debuffs, pressure and matchup exploitation;
- an Alius Manager could aggressively pursue risk/reward or unusual condition chains;
- a Raimon-oriented Guide/Manager could preserve comeback resources and activate resilience opportunities;
- a Diamond Dust Manager could prioritise Freeze/control payoffs if those states are active in the future ruleset.

These are design examples, not final canon implementations.

### Guardrails

- CPU and player obey the same turn-economy fundamentals unless a boss rule is explicitly authored and surfaced.
- Managers may modify Trait behaviour, but must not silently fabricate Character/team affiliation data.
- Manager logic should consume reusable declarative Trait/Condition snapshots where possible instead of hardcoding one AI branch per team.
- Boss-specific cheats, immunities or exceptions must be visible/testable authored rules, not hidden arbitrary advantages.
- M2 Traits should therefore expose enough structured information for later AI to reason about active tiers, status hooks, run/combat modifiers and tactical opportunities.
