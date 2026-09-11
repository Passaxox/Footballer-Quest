# Footballer Quest — Design Decisions

This file records durable product decisions and their status.

Use it as a decision log, not as a speculative wish list. If a later decision supersedes an older one, preserve the old entry briefly as `SUPERSEDED` and point to the replacement so future agents understand why the direction changed.

Statuses:

- `FROZEN` — approved and should be treated as a project rule.
- `APPROVED_CONCEPT` — direction approved; exact implementation details may still be researched/tested.
- `RESEARCH` — promising but not ready to freeze.
- `LATER` — approved but intentionally deferred.
- `RETHINK` — unresolved/conflicting/low-value until revisited.
- `SUPERSEDED` — replaced by a newer explicit decision.

---

## DD-001 — Character identity model

**Status:** FROZEN  
**Milestone:** Foundation / all

`Character` is the canonical person.  
`CharacterVersion` is a meaningful incarnation/form/era/team representation.  
`PlayerInstance` is the mutable owned/run instance.

Aliases/localizations do not create duplicate Characters.

A new team affiliation does not automatically create a new CharacterVersion; it must be justified by meaningful canonical/narrative/visual/gameplay identity.

---

## DD-002 — Rarity is not power

**Status:** FROZEN  
**Milestone:** all

Rarity primarily controls frequency, exclusivity, discovery difficulty, context and desirability.

It must not be shorthand for “higher rarity = objectively stronger stats”.

A common player/item may be strategically excellent. A rare one may be unusual, conditional or build-defining.

---

## DD-003 — Encounter, Battle and Recruit are separate

**Status:** FROZEN  
**Milestone:** M1+

An encounter may become a battle, dialogue, recruit opportunity, event, training or discovery without necessarily using the same path.

Seeing a CharacterVersion does not automatically recruit/unlock it.

This distinction supports `UNKNOWN -> DISCOVERED/SEEN -> RECRUITED/UNLOCKED` style collection states.

---

## DD-004 — Metaprogression expands possibilities, not permission to win

**Status:** FROZEN  
**Milestone:** M2+

Permanent progression should mainly:

- widen starter choices;
- open Guides/supports/events;
- reveal information/secrets;
- unlock alternate techniques/versions/build paths;
- add controlled convenience or small bonuses.

A skilled player with a lightly developed account should theoretically be able to complete Normal without mandatory permanent-stat grinding.

---

## DD-005 — Production Freeze and Queue

**Status:** FROZEN  
**Milestone:** process

Once a task enters Production, do not add unrelated ideas to the same scope.

New ideas go to the Queue and receive:

- Milestone
- Priority (`NOW/NEXT/LATER/RESEARCH/RETHINK/CLOSED`)
- Impact
- Dependencies

Only critical correctness/regression/build/save/architecture issues may interrupt Production.

---

## DD-006 — Run variety over fixed wave scripting

**Status:** FROZEN  
**Milestone:** M1

The long-term model is:

`scenario -> eligible pool -> run conditions -> contextual modifiers -> rarity/weight -> encounter/event`

Avoid designing the game as “wave 13 always contains X”.

Controlled randomness must remain coherent with scenario/arc/team context.

---

## DD-007 — Scenario and Location hierarchy

**Status:** APPROVED_CONCEPT  
**Milestone:** M1-M3

Preferred world model:

`Macro Scenario -> Area -> Location/Scenario -> Encounter/Event/Battle`

Stadium is a `Location` type, not necessarily a parallel collectible/equippable system.

A stadium/location may affect pools, conditions, events, team affinity, bosses, presentation and future techniques.

A separate Club Stadium may exist later as a different persistent concept.

---

## DD-008 — Starter unlock is a subset of Collection

**Status:** FROZEN  
**Milestone:** M2

The game may contain many discovered/recruited CharacterVersions without presenting all of them as one unfiltered starter list.

Future Starter Selection must operate on the starter-eligible/unlocked subset and scale to hundreds of entries.

---

## DD-009 — Starter Selection 2.0

**Status:** APPROVED_CONCEPT  
**Milestone:** M2 (light scalable UI may arrive at M1/M2 boundary)

Replace the long single-card carousel as roster size grows.

Target interaction:

- compact portrait/card grid;
- search;
- filters by team / role / element / arc/era / rarity / variant/unlocked state;
- favourites;
- sorting;
- visible selected-team slots;
- quick detail with technique and POT/effect.

PokéRogue screenshots are interaction inspiration, not a UI to copy 1:1.

---

## DD-010 — Two economies

**Status:** APPROVED_CONCEPT  
**Milestone:** M2

Use separate currencies:

1. **Run currency** — temporary and spent during the current run on markets/events/other choices.
2. **Meta currency** — persistent between runs and spent on scouting/meta systems.

Progressing deeper in a run may produce more meta currency.

---

## DD-011 — Three acquisition paths for players/versions

**Status:** APPROVED_CONCEPT  
**Milestone:** M2

A desirable Character/CharacterVersion should not depend only on one RNG channel.

Primary acquisition routes:

1. in-run encounter/recruit;
2. persistent-currency scouting/gacha/slot;
3. Character fragments/progress as an alternate deterministic route.

This reduces frustration while preserving discovery and rarity.

---

## DD-012 — Scouting pools

**Status:** APPROVED_CONCEPT  
**Milestone:** M2

Meta scouting/gacha may be separated into distinct pools rather than one universal bucket.

Current design direction:

- Player pool;
- Guide/Manager/Support pool;
- Special/Event/Variant/Skin CharacterVersion pool.

Exact banners/rates/pity remain balance work.

No real-money monetization is part of this design.

---

## DD-013 — Duplicate player conversion

**Status:** APPROVED_CONCEPT  
**Milestone:** M2

Do not create a normal second playable copy of the same CharacterVersion by default.

Preferred duplicate reward:

- Character-specific fragments/mastery-like progress;
- plus a small universal conversion resource.

Fragments may unlock rare versions/content without requiring the corresponding event to appear in a specific run.

Avoid uncapped permanent stat growth.

---

## DD-014 — Individual move cap

**Status:** FROZEN  
**Milestone:** M2+

A PlayerInstance may have at most **2 active individual techniques**.

- Slot 1: primary/signature technique.
- Slot 2: optional secondary from special CharacterVersion, event unlock or DNA inheritance.

Team Moves are separate and do not consume these two slots.

---

## DD-015 — Special secondary technique

**Status:** APPROVED_CONCEPT  
**Milestone:** M2

Some CharacterVersions may have or unlock a secondary technique due to a special event/version-specific condition.

This is independent of DNA fusion.

A secondary should feel like a meaningful identity/build event, not an automatic level-up reward for every player.

---

## DD-016 — DNA technique inheritance

**Status:** APPROVED_CONCEPT  
**Milestone:** M2 foundation; advanced DNA later

Recipient remains the main identity.

Default rule:

- recipient keeps its primary technique;
- donor may provide an eligible technique for the second slot;
- if the recipient already has two techniques, the player chooses which technique to forget.

If a pair has a lore/canon-supported fusion-specific technique, that technique may be offered as a special result while still respecting the two-slot cap.

If there is no lore support for a unique fused technique, do not invent one; use the generic inheritance rule.

Already-fused players are not normally eligible for another fusion.

---

## DD-017 — DNA fused player does not auto-unlock as starter

**Status:** FROZEN  
**Milestone:** M2+

Using the DNA item and creating a fused PlayerInstance during a run does **not** automatically add that fused result as a permanent starter option.

The fusion remains a run/build outcome unless a future explicit system says otherwise.

---

## DD-018 — DNA dual type

**Status:** RESEARCH  
**Historical milestone:** M4  
**Current direction:** M2 may prepare compatible foundations; full implementation remains later unless explicitly promoted.

Rules already agreed conceptually:

- normal dual typing is created by DNA fusion, barring an explicit future canon exception;
- technique element remains its own property;
- defensive matchup considers both player types;
- avoid extreme 4x / 0.25x Pokémon-style multiplication;
- previously proposed test scale: `0.75x`, `0.85x`, `1x`, `1.25x`, `1.5x`;
- exact combination/math must be simulated and playtested before freezing.

---

## DD-019 — Traits/Synergies are separate from type resistances

**Status:** FROZEN  
**Milestone:** M2

Traits/Synergies are composition/build systems, not the type matchup table.

They may affect:

- stats;
- status or damage effects;
- Fortune/luck;
- encounter/event weights;
- recruitment/reward opportunities;
- team/arc-specific run behaviour.

Do not conflate “I contribute to a Fire trait” with “I resist/take Fire damage this way”.

---

## DD-020 — DNA trait contribution weighting

**Status:** APPROVED_CONCEPT  
**Milestone:** M2/M4 bridge

For a fused player:

- recipient element/tag contribution = `1.0`;
- inherited/fused secondary contribution = `0.5`.

This allows two similarly fused players to combine into one full point of the secondary trait while preventing one dual-type player from counting as two full team members.

Exact trait tier thresholds are not frozen yet.

---

## DD-021 — Traits can influence the run, not only combat stats

**Status:** APPROVED_CONCEPT  
**Milestone:** M2+

A synergy may change more than ATK/DEF.

Valid design space includes:

- Fortune;
- weighted encounter pools;
- event probability/eligibility;
- status damage/effect interactions;
- recruitment or reward quality;
- access to team/character-specific opportunities.

Prefer interesting build consequences over flat percentage inflation.

---

## DD-022 — Guide/support direction

**Status:** APPROVED_CONCEPT  
**Milestone:** M2-M3

Managers/Coaches/support characters should affect what kind of run is possible, not only grant a passive stat bonus.

Historical preferred simplification is a single **Guide** slot rather than mandatory separate Coach + Manager slots.

A Guide may influence events, affinities, tactics, recruitment, economy or route conditions.

Exact taxonomy/pool remains open.

---

## DD-023 — Rare Candy is an in-run level item

**Status:** APPROVED_CONCEPT  
**Milestone:** M1/M2 supporting

To avoid terminology collision with permanent Character fragments:

- **Rare Candy** = in-run item that gives `+1 level` to one selected player.
- **Mini Trophy** = team-wide EXP reward.
- **Character fragments** = permanent meta/unlock progress.

Do not use “Candy” ambiguously for both permanent fragments and run levelling.

---

## DD-024 — Per-player held items deferred

**Status:** LATER  
**Milestone:** TBD

Do not add a mandatory one-item-per-player equipment layer now.

It introduces extra save/UI/inventory/balance complexity without being required for the current strategic loop.

Run items can remain team/run resources for now.

---

## DD-025 — Team Moves are separate from individual moves

**Status:** FROZEN  
**Milestone:** M2+

Team Moves do not consume either of the two individual move slots.

Two broad design families:

- **Team Affinity** — enabled by sufficient team/trait composition.
- **Combination Move** — requires specific Characters/Versions.

Team Move conditions may later include Guide, Location, event or other Condition Engine state.

---

## DD-026 — Trait thresholds should reward composition, not force one optimal team

**Status:** RESEARCH  
**Milestone:** M2

Use clear thresholds/tiers, but avoid making one mono-team or mono-element composition mandatory.

A previous working idea used small threshold ladders such as `2 / 4 / 6`, but exact values must be tested against actual team size and DNA half-contributions.

---

## DD-027 — No global ±3 clamp for all future modifiers

**Status:** APPROVED_CONCEPT  
**Milestone:** M2-M3

Ordinary stat stages may keep an approximate ±3 cap, but Synergies/Team Moves/Tactics/Managers/special systems must be able to declare their own cap policy.

Future modifier architecture should distinguish sources rather than applying one final universal clamp.

---

## DD-028 — Switching economy

**Status:** APPROVED_CONCEPT  
**Milestone:** combat / M3 CPU parity

- Pre-battle Keep/Change is free.
- Voluntary mid-battle player switch consumes a turn.
- Future voluntary CPU switch should also consume a turn.
- Forced replacement after KO is not a normal tactical switch.
- Do not add Pokémon-style “enemy is about to send X, do you want a free switch?” after KO.

---

## DD-029 — Managers can be AI profiles

**Status:** LATER  
**Milestone:** M3

Future enemy managers/coaches can influence AI behaviour and finite loadouts.

Examples of behavioural archetypes include aggressive matchup exploitation, defensive attrition, resource conservation and scripted/boss logic.

Do not reduce every Manager to `+10% stat`.

---

## DD-030 — Presentation should be data-driven

**Status:** APPROVED_CONCEPT  
**Milestone:** M1 light; M4 deep

Keep the mobile portrait layout, but allow future camera/presentation states to zoom, crop, shake, flash, swap backgrounds, show cut-ins or temporarily use more screen space.

Prefer reusable presentation primitives and profiles over one hardcoded animation system per technique.

---

## DD-031 — Audio context hierarchy

**Status:** LATER / APPROVED_CONCEPT  
**Milestone:** M1 light or later presentation

Audio should be replaceable/data-driven and may follow a priority hierarchy such as:

`special encounter > character > boss/team > location > macro scenario > default`

Short stingers may be used for bosses, recruits, discoveries, team moves and major transitions.

Do not couple gameplay logic to copyrighted soundtrack assets.

---

## DD-032 — Collection/Dex should preserve mystery

**Status:** APPROVED_CONCEPT  
**Milestone:** M2+

The Collection/Dex should support unknown/partial states and hidden conditions.

Useful future categories include Players, Teams, Staff, Techniques, Locations, Team Moves, Variants and Secrets.

Discovery should create “I know something exists but not yet how to obtain it” motivation without turning every secret into a checklist.

---

## DD-033 — Objectives/Achievements as meta discovery support

**Status:** APPROVED_CONCEPT  
**Milestone:** M2-M5

Pakelike/Pokelike-style objective screens are interaction inspiration: category progress, visible milestones and claimable rewards can support the meta loop.

Footballer Quest objectives should be tied to its own arcs, teams, techniques, exploration and discovery rather than copied reward structures.

---

## DD-034 — Visual references are not approved runtime assets

**Status:** FROZEN  
**Milestone:** tooling/content

Sprite sheets, item sheets, emblem sheets and external screenshots supplied during design are reference evidence only.

Runtime use still requires the normal Asset Factory/source/provenance/version/human approval process.

Community text such as “no credit needed” is not by itself a complete provenance/licensing decision.

---

## DD-035 — Tester release cadence

**Status:** APPROVED_CONCEPT  
**Milestone:** process

Prefer fewer tester APKs with meaningful perceived jumps over constantly shipping tiny internal slices.

Internal dev builds may be frequent. Tester builds should normally deliver at least one clearly noticeable content/system/presentation difference and have focused feedback questions.

---

## DD-036 — Automation principle

**Status:** FROZEN  
**Milestone:** all

> Automate repetition, not judgment.

Automate:

- cropping/import;
- manifests;
- record generation;
- duplicate/reference checks;
- validation;
- deterministic audits/tests;
- repetitive content plumbing.

Keep human/director judgment for:

- canonical identity;
- CharacterVersion decisions;
- game-design priority;
- ambiguous visual approval;
- balance/product interpretation.

---

## Open decisions requiring future explicit freeze

The following remain intentionally unresolved:

- exact dual-type matchup combination math;
- exact Trait tier thresholds/effects;
- exact meta scouting rates/pity/fragment costs;
- exact Guide taxonomy and whether Manager/Coach remain subtypes or separate pool labels;
- exact starter-cost/budget system;
- exact criteria for rare/event CharacterVersion second techniques;
- exact mapping of historical M4 DNA depth vs any M2 foundation work;
- exact achievement/objective economy;
- exact distinction between Character fragments and future Mastery progression.

When one of these becomes production scope, research/design it first and then replace the open line with a numbered frozen decision.
