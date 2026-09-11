# Footballer Quest — Project Direction

This document is the durable product-direction handoff for humans and AI agents working on Footballer Quest.

It exists to prevent each new session from reconstructing the project from chat history. Repository state remains the technical source of truth; this file records product intent, milestone boundaries, workflow, and the current design direction.

## 1. Product identity

Footballer Quest is a mobile-first Inazuma Eleven roguelite built around **team drafting, discovery, run variety and combinatorial build-making**.

It takes inspiration from systems seen in PokéRogue and Pokelike, but must not become a reskin of either. Inazuma identity comes from Characters, CharacterVersions, teams, techniques, managers/coaches, locations, rivalries, narrative conditions and special combinations.

The long-term player fantasy is:

> Start another run because this one may tell a different football story.

The five guiding pillars are:

1. **Collection** — What have I discovered and recruited?
2. **Draft** — What can I start this run with?
3. **Scenario** — Where does this run take me?
4. **Build** — What team, synergies, techniques and support can I assemble this time?
5. **Discovery** — What secrets, versions, events and conditions are still unknown?

A new feature should clearly improve at least one of these pillars or solve a concrete technical/product blocker.

## 2. Core invariants

These rules are high-confidence project invariants unless a later explicit decision supersedes them.

- `Character` = canonical person/identity.
- `CharacterVersion` = meaningful incarnation/form/team-era representation of that Character.
- `PlayerInstance` = mutable owned/run instance.
- Aliases/localized names never create a second Character.
- Team affiliation alone does not automatically justify a new CharacterVersion.
- Rarity describes frequency, exclusivity, desirability or context — **not raw power**.
- Encounter, Battle and Recruit are separate concepts.
- A CharacterVersion may be seen without being recruited.
- Metaprogression should expand **possibilities**, not become mandatory stat grind required to beat Normal.
- Catalog size is not the same as the pool shown in a single run.
- Content must be context-filtered by scenario, team, arc, eligibility, rarity/weight and run state.
- Automation should handle repetition; humans/director layer retain judgment on canon, identity and game design.

## 3. Roadmap M1 → M5

Milestones are defined by **player-perceived change**, not by patch count or arbitrary version labels.

### M1 — “Ogni run sembra Inazuma”

Goal: two runs should visibly differ in teams, Characters/Versions, scenarios, events, recruits and route texture.

Core direction:

- Content Factory / Asset Factory mature enough to scale roster additions.
- Meaningful Original Trilogy, Alius and first FFI coverage.
- Scenario/event/encounter pools that produce controlled variety.
- Seeded run variety and rarity/weight infrastructure.
- Recognizable teams rather than isolated random players.
- Item/reward cleanup where it materially improves the run.
- Light presentation/encounter identity.
- First lightweight team synergy demonstrations only if they are cheap and useful.
- Save/backcompat, balance and regression quality gates.

Historical quality target: roughly **100+ quality CharacterVersions OR at least 8 recognizably represented teams**, not a hard quota.

Success test:

> Two testers begin separate runs and quickly have different stories to tell.

### M2 — “Costruisco la mia squadra”

Goal: team composition becomes strategically meaningful, not just a collection of the highest stats.

Core direction:

- Starter Selection 2.0: scalable grid, search/filter, favourites, role/element/team, useful move detail.
- `starterUnlocked` remains a subset of the broader Collection.
- Second individual move system.
- Technique evolution foundations.
- Team Moves v1.
- Team Synergies / Traits v2.
- Duplicate rule and duplicate conversion/meta value.
- Meta recruiting/scouting using persistent currency.
- Guide/Manager/Coach foundation.
- More team/character-specific events.
- Improved Collection/Dex.
- Data model prepared for richer conditions and team interactions.

Success test:

> Two teams at similar levels but with different composition should play differently.

### M3 — “Anche l’avversario ha una squadra”

Goal: stop feeling like a sequence of independent enemy sprites and start feeling like matches against real Inazuma teams.

Core direction:

- Enemy Team system.
- Contextual 5–6 player encounters where appropriate.
- CPU switching with the same turn economy philosophy as the player.
- Finite enemy inventory/loadouts.
- Manager AI profiles and different tactical behaviours.
- Team Synergies for CPU.
- Location/Stadium gameplay v1 inside Scenario architecture.
- Condition Engine v1.
- Dynamic/conditional bosses.
- Events and encounters influenced by composition.
- Guide v2 / Team Moves v2 / Special Tactics foundation.

Success test:

> “Sto affrontando la Royal Academy”, not “I am fighting Jude, then David, then Joseph.”

### M4 — “Inazuma senza freni”

Goal: release the spectacular/special systems only after the foundation can support them coherently.

Core direction:

- Spirits / Fighting Spirits.
- Mixi Max.
- Full Special Tactics.
- DNA fusion dual typing as a mature gameplay system.
- Rare/past/present/spirit or other meaningful variants.
- Fortune/shiny-like systems where appropriate.
- Advanced secret encounters.
- Advanced Location/Stadium interactions.
- Condition Engine v2.
- Stronger team/character cinematic presentation.
- Deeper GO / Chrono Stone / Galaxy content.

### M5 — “Footballer Quest Universe”

Goal: the game extends far beyond a single run without turning permanent progression into compulsory grind.

Core direction:

- Club/meta progression.
- Mastery.
- Advanced training/candy/fragments economy where still useful.
- Advanced scouting.
- Managers/Coaches/Club assets.
- Full Dex across Players / Teams / Staff / Locations / Techniques / Team Moves / Variants.
- Long 100–150 node modes.
- Macro-scenario arcs and alternate/challenge modes.
- Large-scale content catalog when the systems justify it.

## 4. Priority language

Every idea belongs in one of these states:

- **NOW** — required for the current milestone or blocker.
- **NEXT** — near-term, dependencies mostly ready; design now, implement soon.
- **LATER** — approved long-term direction; do not spend implementation scope now.
- **RESEARCH** — promising but needs evidence, simulation, canon/source work or architectural study first.
- **RETHINK** — poor value/cost, conflict, or unclear design; freeze until something changes.
- **CLOSED** — completed and validated; do not reopen without bug/regression/new explicit decision.

Do not convert brainstorming directly into active work.

## 5. Production governance

The official cycle is:

`R&D -> SPEC -> FREEZE -> PRODUCTION -> QUALITY GATE -> PLAYTEST -> REVIEW QUEUE -> NEXT CYCLE -> RELEASE`

### Production Freeze

Once a task enters PRODUCTION, its scope is frozen until it is COMPLETE/PASS, PARTIAL or BLOCKED.

A new idea may enter the active task only if it:

- is required to complete the requested scope correctly;
- fixes a critical regression/save/build/security issue;
- prevents an architectural mistake that would make continuing incorrect.

Everything else goes to the Queue.

Queue entries should ideally record:

- Milestone
- Priority
- Impact
- Dependencies
- Short rationale

## 6. Quality gates

Treat quality as three independent checks.

### Q1 — Technical

- syntax
- tests
- production build
- save/backcompat
- asset/content validation
- deterministic/idempotent tooling where relevant

### Q2 — Content / canon

- correct Character identity
- correct CharacterVersion decision
- correct team/role/element/game origin where used
- correct sprite/version mapping
- no invented canon
- uncertain cases marked `REVIEW`

### Q3 — Product

- Is it fun?
- Is it understandable?
- Does it improve a core pillar?
- Is the feature worth occupying run/UI complexity?
- Does it create interesting decisions rather than only bigger numbers?

Q1 PASS does not imply Q2 or Q3 PASS.

## 7. Agent/tool roles

### Director layer — human + ChatGPT

Own:

- product vision
- brainstorming
- canon research decisions
- roadmap and priority
- specification
- acceptance criteria
- review and scope control

### Copilot — production layer

Best for:

- large but well-specified implementation slices
- repetitive/data-heavy changes
- manifests/content expansion
- isolated UI/system work with explicit acceptance criteria

### Codex / high-reasoning agent — integration & surgery

Reserve for:

- architecture
- save compatibility
- difficult engine work
- migrations
- Condition Engine
- enemy-team systems
- hard debugging
- risky review/integration

### Local/free agent tooling

Use for low-risk repetitive work, documentation, analysis, tests and maintenance where possible.

### GitHub Actions / deterministic scripts

Prefer machines over reasoning tokens for:

- catalog validation
- asset audit
- identity/reference validation
- save compatibility tests
- engine/UI tests
- content checks
- build checks

## 8. Current technical truth

Do not assume `main` is the most advanced game state.

At the time this document was introduced, the active advanced lineage was:

- Content Factory / Asset Factory hardening: `f34094f52220c8bc20d577f855ca56ba069421d4`
- Run Variety branch: `passaxox-v2q-m1-run-variety`
- Run Variety tip when this document was created: `32028493dfa1b95dce2b7e4d45cedbfbd5e70664`

The run-variety work added seeded RNG/run state, contextual rarity/frequency, declarative events, event outcomes/flags, scenario-aware weighting and deterministic variety testing.

Always re-check repository state before implementation. This section is a handoff snapshot, not a promise that the listed SHA remains current.

## 9. Current M2 design direction

The following decisions were refined after the historical roadmap was recovered.

### Economy

Use two distinct economies:

- **Run currency** — temporary; spent inside the current run on market/events/other run decisions.
- **Meta currency** — persistent; later/deeper progress can award more; used outside runs for scouting/meta systems.

Permanent progression must not become required numeric grinding to win Normal.

### Player acquisition — three complementary routes

1. **In-run recruit / encounter unlock** — the primary “play the game” path.
2. **Meta scouting/gacha/slot** — persistent-currency path; should not be the only way to obtain meaningful players.
3. **Fragments / Character progress** — deterministic progress and duplicate value; allows rare/version unlock paths without requiring the exact event to roll every time.

Meta scouting may itself be separated into pools, for example:

- Player pool
- Guide/Manager/Support pool
- Special/Event/Variant/Skin CharacterVersion pool

Exact pool composition remains subject to milestone scope and balance.

### Duplicates

Preferred direction:

- no standard duplicate playable copy of the same CharacterVersion;
- duplicate player progress converts into Character-specific fragments/mastery-like progress plus a small universal conversion value;
- avoid direct uncapped permanent stat inflation;
- use fragments as an alternate route to rarity/version unlocks where appropriate.

### Techniques

A PlayerInstance has a maximum of **2 active individual techniques**.

- Primary/signature technique = CharacterVersion identity move.
- Optional secondary = rare/special CharacterVersion, event unlock or DNA inheritance.
- Team Moves are separate from the two individual slots.

DNA direction:

- recipient identity is primary;
- recipient keeps its primary technique;
- donor may provide a technique for the second slot;
- if two slots are already occupied, the player chooses what to forget;
- a canon/lore-supported fusion may offer a new fusion-specific technique, still respecting the 2-slot cap;
- non-canon pairings use the generic recipient/donor inheritance rule rather than inventing lore;
- fused PlayerInstances do **not** automatically become permanent starter unlocks;
- already-fused players should not be repeatedly re-fused under the normal rule.

### DNA dual type

Historical roadmap placed full DNA dual typing in M4. Current direction is:

- M2 may prepare compatible data/model foundations;
- full dual-type combat balance remains **RESEARCH / later implementation** unless explicitly promoted;
- only DNA fusion creates the normal dual-type state, barring an explicit future canon exception;
- technique element and player defensive typing remain separate concepts;
- avoid Pokémon-style 4x / 0.25x extremes;
- previously discussed example scale for later testing: `0.75 / 0.85 / 1 / 1.25 / 1.5`;
- exact matchup math is not frozen until simulation/playtest.

### Traits / Synergies

Traits are **not** the resistance/type chart.

Traits may affect:

- stats
- status/damage effects
- Fortune/luck
- encounter weights
- event weights
- recruitment/reward opportunities
- team-specific run behaviour

Current fusion contribution concept:

- recipient element/tag contribution: `1.0`
- inherited/fused secondary contribution: `0.5`

This allows, for example, two similarly fused players to meaningfully add one full secondary-trait point together without making dual-type players count as two complete characters.

Exact tier thresholds and bonuses are still balance/design work.

### Rare candy vs fragments

Keep these concepts separate to avoid terminology confusion.

- **Rare Candy (run item)** — +1 level to one selected player during the run.
- **Mini Trophy (existing reward concept)** — team-wide EXP.
- **Character fragments/meta progress** — permanent collection/unlock system, not an in-run level candy.

### Held/equipped items

Per-player held equipment is currently **LATER / not required**. It adds UI, save, balance and inventory complexity without being necessary for the current team-building loop.

## 10. Starter Selection 2.0 direction

The current single-character carousel does not scale to hundreds of CharacterVersions.

Preferred mobile direction:

- compact grid of portraits/cards
- search
- filters: team / role / element / arc/era / rarity / variants / discovered/unlocked
- favourites
- sorting
- selected-team slots visible while browsing
- tap player -> compact detail card
- show useful decision data, especially primary technique and POT/effect where relevant
- Collection may contain more content than the starter-eligible subset

Reference inspiration includes PokéRogue-style scalable starter drafting, but the UI should remain Footballer Quest / Inazuma-specific rather than copied 1:1.

## 11. Collection / Dex / objectives direction

Reference screenshots from prior design work reinforced:

- clear discovered/unknown/recruited states;
- filters by generation/arc/team/role/element/etc.;
- unknown `???` entries and partial discovery;
- variants separated or filterable;
- visible completion/progression without revealing every secret;
- objective/achievement categories with claimable progression rewards;
- long-term discovery should create reasons for another run, not only completion percentages.

Do not blindly copy Pokelike/PokéRogue UI or reward values. Use them as interaction references.

## 12. Asset/reference policy

Historical references include item sprite sheets, team emblem sheets and external visual/gameplay screenshots.

These are **reference material**, not automatically approved runtime assets.

Every runtime asset still needs the project’s normal source/provenance/version/approval process. “No credit needed” text on a community sheet is not a substitute for source verification or licensing/provenance judgment.

## 13. Things deliberately deferred

Do not pull these into the current production slice merely because they are exciting:

- deep Spirits/Mixi Max implementation
- full dual-type balance before the type model is ready
- advanced Club simulation
- massive Mastery grind
- per-player held-item system
- advanced Stadium-as-separate-collectible system (Locations/Scenarios remain the preferred world model)
- enemy-team/Manager AI before M3 foundation is ready
- giant presentation overhaul before the underlying systems give presentation meaningful information

## 14. Product guardrails

- A rare thing should feel unusual, not automatically stronger.
- A weaker-looking recruit may be correct because it completes a synergy or unlocks a path.
- The player should lose because of decisions/build/resource management more often than because permanent grind was insufficient.
- New content should multiply existing systems rather than become one-off hardcoded exceptions.
- Do not add full 11-player rosters merely for encyclopedic completeness; represent teams deeply enough to be recognizable and useful.
- Do not spend premium agent time on deterministic repetitive work if tooling can do it.
- Fewer tester APKs with bigger perceived jumps are better than constant tiny builds.

## 15. How to use this document

Before proposing or implementing a substantial feature:

1. Check the actual repository branch/SHA.
2. Read this file and `docs/DESIGN_DECISIONS.md`.
3. Identify the current milestone.
4. Classify the idea as NOW/NEXT/LATER/RESEARCH/RETHINK/CLOSED.
5. Check whether it violates a frozen decision or is intentionally superseding one.
6. If entering Production, freeze scope and define acceptance criteria.
7. Finish with technical + content/canon + product quality gates as relevant.

When a new explicit design decision supersedes this document, update the documentation in the same or immediately following change so the next agent does not need chat archaeology again.
