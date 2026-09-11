# Footballer Quest — Team Trait Pilots

This file records the first authored Team Trait pilots approved at Director level.

It complements `docs/TRAITS_SYNERGIES_V1.md`. Trait architecture, contribution rules and balance thresholds live there; this file records the identity and tier behaviour of specific teams.

## Version-scoped affiliation rule

Team Traits attach to the **active CharacterVersion / PlayerInstance identity**, not globally to the canonical Character.

The same canonical Character may legitimately contribute to different Team Traits through different verified CharacterVersions.

Examples of the intended model:

- a Raimon Jude CharacterVersion may contribute to `team:raimon`;
- a distinct verified Inazuma Japan Jude CharacterVersion may contribute to `team:inazuma-japan` instead;
- a Royal Academy incarnation of a Character may contribute to `team:royal-academy` when that incarnation is explicitly represented and verified;
- Alius-related Characters may have separate team-specific CharacterVersions (for example Diamond Dust, Prominence, Chaos, Genesis, Epsilon or Gemini Storm) where canon/visual/gameplay identity justifies those versions.

Do not solve broad Trait coverage by attaching every historical team to one generic Character record. Coverage must come from correct CharacterVersions and explicit evidence.

A CharacterVersion may hold more than one explicit team/faction tag only when those tags are semantically compatible and verified. Team/faction hierarchy must not be inferred merely to increase synergy counts.

Rarity may affect how often a CharacterVersion is encountered/unlocked, but does not change whether that version contributes to a Team Trait and does not automatically increase its contribution value.

This rule is especially important for future Inazuma Japan, Royal Academy and Alius coverage: the same familiar Character can support different builds through different meaningful versions rather than one overloaded universal version.

---

## Coverage rule for pilots

A pilot's tier identity may be approved before its practical acquisition coverage is ready, but a standard Team Trait must pass `docs/TRAIT_COVERAGE_GATE.md` before it is considered Production-ready for normal player-facing activation.

This keeps good design work from being blocked by current content volume while preventing a nominal Trait from shipping when players cannot realistically build around it.

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

## PILOT-002 — Diamond Dust / “Dominio Glaciale”

**Status:** APPROVED_CONCEPT — tier identity frozen; activation remains subject to Trait Coverage Gate and status implementation  
**Milestone:** M2 Team Synergies / Traits v1  
**Identity:** Control / Freeze / Shatter

### Design intent

Diamond Dust should not be equivalent to “all Air players”. Its current verified roster contains multiple elements, so the Trait identity comes from the **Diamond Dust CharacterVersion affiliation**, while individual techniques decide whether they participate in Freeze/Shatter interactions.

The build should create a tactical choice between preserving control and consuming that control for burst.

### Tier I — Brina

Diamond Dust composition improves the reliability of **eligible cold/ice-control techniques** applying the future `Freeze/Frozen` status.

This does **not** mean every Diamond Dust move can Freeze.

A technique must explicitly declare the compatible status/effect hook. Team membership alone must not fabricate an ice effect for a move that does not support it.

Exact application bonus and base status probability remain balance/status-system data.

### Tier II — Permafrost

When an opponent becomes `Frozen`, Diamond Dust gains a short tactical advantage against that target.

**Frozen behaviour direction:** favour tempo/control effects such as SPD/priority/next-action advantage rather than simply extending Freeze repeatedly.

Purpose:

- reward successfully creating the status;
- make the team feel controlling rather than only high-damage;
- avoid permanent turn-denial loops.

Exact modifier and duration remain balance data.

### Tier III — Frattura Glaciale

An eligible attack may intentionally **consume `Frozen`** to trigger a stronger payoff against that target.

**Frozen behaviour direction:** Shatter consumes the status in exchange for a significant burst/control payoff such as bonus damage plus a short vulnerability/DEF reduction window.

The key strategic decision is:

`keep Frozen for control` **or** `consume Frozen for Shatter burst`.

The exact damage multiplier, vulnerability strength and eligible move tags remain balance data.

### Explicit exclusions

The Diamond Dust Trait does **not** currently include:

- automatic Freeze on every Diamond Dust technique;
- infinite/repeatable hard-lock chains;
- passive permanent damage inflation with no status interaction;
- automatic conversion of all Air techniques into ice techniques;
- hidden boss immunity that is not an authored/testable rule.

### Future Manager / AI bridge

A Diamond Dust Manager/Coach profile should later be able to reason about whether to preserve Freeze control or consume it through Shatter based on HP, speed, matchup, remaining roster and available techniques.

This is a strong proof case for Trait-aware Manager AI: the CPU should **play the Diamond Dust plan**, not merely receive higher stats.

### Current coverage note

The current Diamond Dust authored manifest contains 11 verified CharacterVersions with `P1 / D5 / C3 / A2`, so raw count and role shape are already near the intended standard-Trait target.

Practical activation still requires the accessibility side of `TRAIT_COVERAGE_GATE.md` to pass. Current manifest entries use `encounterTier: 3` without explicit collection rarity, so rarity/acquisition distribution needs deliberate review before the Trait is Production-ready.

---

## PILOT-003 — Gemini Storm / “Impulso Orbitale”

**Status:** APPROVED_CONCEPT — tier identity frozen; activation remains subject to Trait Coverage Gate and switching/momentum implementation  
**Milestone:** M2 Team Synergies / Traits v1  
**Identity:** Tempo / Speed / Momentum / Risk-Reward

### Design intent

Gemini Storm should reward keeping initiative and making deliberate tactical switches without making switching free.

Its gameplay loop should feel like:

`gain tempo -> preserve momentum -> decide when to cash it out`.

The Trait should interact naturally with future Manager AI because both player and CPU can use the same switching economy and momentum state.

### Tier I — Slancio Orbitale

After a **voluntary mid-battle switch**, the incoming eligible Gemini Storm player receives a short first-action tempo advantage.

**Frozen behaviour direction:** a brief SPD/priority advantage on the incoming player's first action.

The voluntary switch still consumes the normal turn. The Trait must not convert tactical switching into a free action.

Purpose:

- make switching an intentional part of Gemini Storm build identity;
- reward choosing the correct replacement instead of simply staying on one high-stat player;
- prepare future CPU/Manager switching parity.

Exact SPD/priority value and whether the benefit is consumed by the first attempted or first successful action remain balance details.

### Tier II — Accelerazione

A Gemini Storm team that repeatedly maintains initiative builds temporary **Momentum**.

Working qualifying behaviour may include acting first, preserving tempo through compatible switches, or completing eligible actions without allowing the opponent to break the sequence.

**Frozen structure:** Momentum is a temporary, bounded build resource — not an infinitely stacking ATK buff.

Momentum may improve tempo-oriented outputs such as:

- priority;
- pressure;
- selected compatible technique behaviour;
- access to the Tier III cash-out.

The exact trigger definition, stack cap and decay/reset rule remain balance work.

### Tier III — Impatto Meteorico

The team may deliberately **consume accumulated Momentum** for a high-impact play.

**Frozen behaviour direction:** cash out Momentum to strongly empower an eligible technique/action or create another explicit high-risk/high-reward payoff, then reset/reduce Momentum.

Purpose:

- create a visible decision between maintaining tempo and spending it;
- prevent permanent snowball from simply holding maximum Momentum forever;
- give future Manager AI a meaningful tactical question: continue the sequence or cash out now.

Exact eligible techniques, scaling and cost remain balance data.

### Run-facing consequence

A sufficiently committed Gemini Storm composition may also increase the weight/eligibility of future **Alius-flavoured risk/reward events** with harder choices and better potential rewards.

This is not a separate fourth Tier. It is a run-facing expression of the Trait, likely attached to an appropriate active tier after simulation.

As with other run-weight effects, it applies only to future generated nodes and must not reroll a persisted pending node.

### Explicit exclusions

The Gemini Storm Trait does **not** currently include:

- free voluntary switching;
- infinite Momentum stacks;
- permanent generic SPD/ATK inflation;
- automatic first action forever;
- hidden CPU-only benefits;
- Momentum that survives every battle indefinitely unless a later explicit system defines that behaviour.

### Future Manager / AI bridge

A Gemini Storm Manager should later be able to:

- switch tactically to preserve or recover initiative;
- recognise when Momentum is close to a useful threshold;
- decide whether to continue building Momentum or consume it through Tier III;
- respect the same turn cost and authored Trait rules as the player.

This makes Gemini Storm a useful proof case for intelligent switching rather than a stat-scripted boss.

### Current coverage note

The current Gemini Storm authored manifest contains 11 verified CharacterVersions with `P1 / D4 / C4 / A2`, closely matching Diamond Dust's overall build breadth.

As with Diamond Dust, current manifest entries use `encounterTier: 3` without explicit collection rarity. Practical player-facing activation therefore needs a deliberate acquisition/rarity distribution and Coverage Gate simulation rather than relying only on raw roster count.

---

## Next expansion candidate

After the initial pilot trio:

1. **Epsilon** remains the next expansion candidate.
2. **Royal Academy** is a strong later candidate once version coverage and roster/accessibility are sufficient for a fair build path.
3. **Inazuma Japan / broader Alius-family Traits** should be assessed with the same version-scoped coverage rules rather than added as universal Character tags.
