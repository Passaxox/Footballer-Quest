# Footballer Quest — Team Trait Pilots

This file records the first authored Team Trait pilots approved at Director level.

It complements `docs/TRAITS_SYNERGIES_V1.md`. Trait architecture, contribution rules and balance thresholds live there; this file records the identity and tier behaviour of specific teams.

---

## PILOT-001 — Raimon / “Spirito Raimon”

**Status:** APPROVED_CONCEPT — tier identity frozen; exact numbers remain balance work  
**Milestone:** M2 Team Synergies / Traits v1  
**Identity:** Resilience / Adaptation / Comeback

### Design intent

Raimon should not be represented as a generic raw-stat team. Its Trait should reward surviving setbacks, adapting during a run and creating comeback windows.

The three tiers should express different layers of that identity rather than repeat the same percentage bonus at larger values.

### Tier I — Tenacia

When a Raimon-oriented team loses a player to KO and a replacement enters, the replacement receives a short stabilisation effect.

**Frozen behaviour direction:** the incoming replacement gains a one-hit defensive `Guard`-style protection on entry.

Purpose:

- reduce immediate negative snowball after a KO;
- reward resilient team construction without reviving the defeated player;
- create a visible tactical window instead of a hidden permanent stat bonus.

Exact stacking/frequency rules and whether special boss rules can suppress or modify it remain balance implementation details.

### Tier II — Adattamento

A sufficiently strong Raimon composition slightly increases the chance/weight of coherent future run opportunities such as:

- training;
- support;
- recovery;
- adaptation/comeback-flavoured events.

This effect applies only to **future generated nodes**. It must never reroll or mutate an encounter/event node already generated and persisted in the run.

Purpose:

- make Raimon identity affect the story/texture of the run, not only battle numbers;
- reuse the existing seeded Run Variety/event-weighting architecture;
- create opportunities that fit Raimon's growth-through-adversity identity.

Exact event categories, weights and caps remain balance data.

### Tier III — Spirito Raimon

Once per battle, when an eligible player first enters a critical low-HP state, the team gains a controlled comeback window.

**Frozen behaviour direction:** grant a temporary offensive/defensive comeback boost rather than revive, immunity or automatic `survive at 1 HP`.

Purpose:

- make a full Raimon commitment feel distinctive;
- create a dramatic but readable reversal opportunity;
- avoid hard-locking the opponent or invalidating damage already dealt.

The exact HP threshold, modifier size and duration remain balance data. A working starting point may be around a low-HP threshold such as 30%, but this is **not frozen**.

### Explicit exclusions

The Raimon Trait does **not** currently include:

- automatic revive;
- automatic survival at 1 HP;
- permanent ATK/DEF inflation;
- fabricated `teamTags`;
- special treatment based purely on rarity;
- hidden exceptions to the normal player/CPU turn economy.

### Future Manager / Guide bridge

Raimon-compatible Guide/Manager profiles may later be Trait-aware or Trait-shaping, for example by:

- preserving resources until a comeback window;
- improving one Raimon tier under an explicit authored rule;
- enabling Raimon-specific support/training events;
- changing tactical priorities when the comeback trigger is available.

Managers must consume the same declarative Trait state rather than silently rewriting CharacterVersion identity.

---

## Next pilot candidates

The next two intended pilots are:

1. **Diamond Dust** — control / Freeze-oriented identity, useful for proving Status ↔ Trait interactions.
2. **Gemini Storm** — tempo / speed / risk-reward identity, useful for proving combat ↔ run-variety interactions.

Epsilon remains the next expansion candidate after the pilot trio.
