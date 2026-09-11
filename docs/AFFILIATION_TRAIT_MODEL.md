# Footballer Quest — Affiliation / Trait Identity Model

**Status:** APPROVED_CONCEPT  
**Milestone:** M2 Traits foundation -> M3 Manager/Condition integration  
**Purpose:** separate current team identity, broader canon factions, historical legacy and Manager relationships so CharacterVersions can scale without becoming universal multi-Trait jokers.

This document supersedes any older wording that treated every affiliation as one flat `teamTag` family. Runtime field names are not frozen yet; the semantic separation below is the approved design rule.

---

## 1. Five distinct identity layers

Footballer Quest should keep these concepts separate:

1. **Element Trait** — derived from current element/type identity (`Fuoco`, `Aria`, `Terra`, `Natura`).
2. **Team Trait** — derived from the CharacterVersion's current represented team, e.g. `Raimon`, `Diamond Dust`, `Gemini Storm`, `Royal Academy`, `Inazuma Japan`.
3. **Faction Trait** — broader canon-supported umbrella shared by multiple distinct teams when that shared identity is meaningful to gameplay.
4. **Legacy / History metadata** — where the Character/version has meaningfully been before; usable by Conditions, events, Team Moves, Secrets, Guide logic and presentation, but **not an automatic Trait contribution**.
5. **Manager relationship/profile** — a cross-team tactical relationship controlled by a Manager/Coach profile; it does not rewrite player identity or create a permanent player faction.

These layers may coexist on one CharacterVersion, but they do not all produce Trait points by default.

---

## 2. Team identity remains CharacterVersion-scoped

A Team Trait represents the **current incarnation** represented by that CharacterVersion.

Examples:

- Jude / Royal Academy version -> `team:royal-academy`;
- Jude / Raimon version -> `team:raimon`;
- Jude / Inazuma Japan version -> `team:inazuma-japan`;
- Mark / Raimon version -> `team:raimon`;
- Mark / Inazuma Japan version -> `team:inazuma-japan`.

A Character's career history must not be collapsed into one universal record carrying every team they ever represented.

This prevents famous multi-team Characters from becoming automatic bridges for every Team Trait.

---

## 3. Legacy / history is useful but does not grant Trait points

A later CharacterVersion may preserve historically meaningful links without activating the old Team Trait.

Conceptual examples:

- Mark / Inazuma Japan may carry `legacy:raimon`;
- Jude / Inazuma Japan may carry `legacy:raimon` and/or a verified Royal history link where useful;
- a former Alius Character later represented on another team may retain an Alius historical condition if canon/product design needs it.

Legacy may be consumed by:

- Team Move conditions;
- event eligibility;
- dialogue/presentation;
- Secrets;
- Guide/Manager logic;
- Collection/Dex history;
- future Condition Engine rules.

Legacy **must not** silently add points to the former team's Trait.

---

## 4. Alius is the first approved Faction model

Alius is a good Faction candidate because it is a genuine broader organization/family containing multiple distinct teams/identities.

Expected family includes, subject to verified CharacterVersion content:

- Gemini Storm;
- Epsilon;
- Diamond Dust;
- Prominence;
- Genesis;
- Chaos;
- other canon-supported Alius subteams/forms added later.

A CharacterVersion may therefore conceptually contribute to both:

`team:diamond-dust`  
`faction:alius`

or:

`team:epsilon`  
`faction:alius`

The Team identity describes the tactical specialization. The Faction identity describes the broader Alius family.

---

## 5. Team specialization vs Faction Trait

A Faction Trait and one of its Team specializations may coexist, but they must not become two copies of the same reward tree.

Approved guardrails:

- Faction effects should favour broad family identity: run routes, Alius events, risk/reward opportunities, shared conditions, recruitment/scenario interactions and other cross-team behaviour.
- Team Traits should carry the sharper tactical specialization, e.g. Diamond Dust Freeze/Shatter or Gemini Storm Momentum/switch tempo.
- Do not give the same trigger two large bonuses merely because a player satisfies both Team and Faction.
- Do not make `6 Diamond Dust` automatically equal to two full independent combat Trait trees with no opportunity cost.
- If a future effect intentionally stacks across Team + Faction, it must be explicit, readable and included in balance simulation.

This allows mixed Alius builds to be valid without making mono-team builds automatically dominant.

Example composition:

`2 Diamond Dust + 2 Gemini Storm + 2 Epsilon`

may create strong Alius-family commitment while also reaching low Team-specialization tiers where the relevant Team Trait exists.

---

## 6. Epsilon rule

The current verified Epsilon pool is too small for a normal standard Team Trait under the current Coverage Gate.

Epsilon CharacterVersions may still contribute normally to `faction:alius`.

A specific `team:epsilon` Trait should activate only when one of these is true:

- Epsilon's verified CharacterVersion coverage expands enough to pass its own Team Trait Coverage Gate;
- a deliberately smaller/rare Epsilon specialization is explicitly designed with different thresholds;
- another explicit Director decision replaces the standard gate.

Do not invent Epsilon membership on unrelated versions just to fill the count.

---

## 7. Raimon remains a Team Trait, not a Faction

Raimon has many important players and later incarnations, but current design does **not** treat Raimon as an umbrella faction equivalent to Alius.

`Spirito Raimon` remains a Team Trait for CharacterVersions actually representing Raimon.

Later national/other versions of Mark, Axel, Jude and other former Raimon players do not continue contributing to `team:raimon` merely because of career history.

Where useful, their historical connection may be represented as Legacy metadata instead.

This preserves the approved Raimon Tier design while preventing Raimon from becoming an oversized universal Trait.

---

## 8. Inazuma Japan should be its own Team identity

A future Inazuma Japan CharacterVersion should contribute to `team:inazuma-japan`, not automatically to the player's previous Team Trait.

This creates room for a future Inazuma Japan Trait based on its own identity, potentially including cooperation/adaptation between players originating from different schools/teams.

Exact Inazuma Japan tiers remain future design work.

---

## 9. Manager profiles are not factions

A Manager/Coach who has controlled multiple teams should normally be represented through a **Manager profile / relationship layer**, not by putting all of those players into one permanent faction.

Ray Dark is the key design example:

- his influence can span multiple teams;
- a Ray Dark Manager profile may reshape tactics, priorities, risk, debuff/pressure behaviour, finite resources or how a team's Trait is expressed;
- players coached by Ray Dark do not thereby gain a permanent `faction:ray-dark` Trait by default.

Manager relationships are contextual tactical metadata, not player identity.

The same principle applies to future Managers/Coaches whose careers cross multiple teams.

---

## 10. Do not create factions from tournament/arcs automatically

A broad competition or story arc is not automatically a Faction.

Examples:

- participating in the Football Frontier does not by itself create one shared `faction:football-frontier` Trait;
- participating in FFI does not automatically make every national team one `faction:ffi` Trait;
- being present in the same arc/location does not imply a shared faction.

Arc, era, tournament, scenario and location remain Condition/metadata axes unless a genuine shared organization/identity is separately justified.

The Faction layer is intentionally sparse. Alius may remain the only Faction for a long time if no other canon grouping creates equally strong gameplay value. Do not invent additional Factions merely for symmetry.

---

## 11. Coverage rules by layer

Coverage must be audited independently:

- **Team Trait:** its own valid CharacterVersion pool must support the intended build or explicit exception.
- **Faction Trait:** may aggregate verified CharacterVersions across canon-supported member teams.
- **Legacy:** no Coverage Gate is needed because it is not a normal point-generating Trait.
- **Manager profile:** coverage is about supported teams/conditions and AI behaviour, not player-count thresholds.

A Faction PASS must not be used to claim that every subteam also passes its Team Trait gate.

---

## 12. Content Automation / Research Factory implication

Future automated content research should resolve separate outputs rather than one overloaded affiliation list:

- current Team identity;
- eligible Faction identity;
- Legacy/history relationships;
- Manager/Coach relationships;
- arc/era/game/scenario metadata.

The resolver may propose classifications, but ambiguous historical relationships remain `REVIEW`.

Trait coverage reports should separately show Team and Faction counts/overlaps so broad families do not hide weak Team-specialization coverage.

---

## 13. Alius Faction Trait — “Risonanza Alius”

**Status:** APPROVED_CONCEPT — tier structure frozen; exact values/effect magnitudes remain balance work.

Alius should reward **cross-team faction composition**, not simply duplicate the reward already granted by a mono-team specialization.

The core design is horizontal vs vertical commitment:

- **vertical build:** commit strongly to one Alius subteam and climb its Team Trait;
- **horizontal build:** mix multiple Alius subteams and climb the shared Faction Trait.

A mono-team six-player roster should not automatically receive the full Faction tree on top of the full Team tree.

### Tier I — Risonanza Alius

Working activation shape:

- at least **2 Alius CharacterVersions**;
- representing at least **2 distinct Alius subteams**.

Behaviour direction:

- unlock/increase Alius-flavoured future events, routes, recruit opportunities and controlled risk/reward choices;
- use future generated nodes only; never reroll a persisted pending node.

The point of Tier I is to make the player notice that mixing Alius teams changes the run before granting large combat power.

### Tier II — Evoluzione Forzata

Working activation shape:

- at least **4 Alius CharacterVersions**;
- representing at least **2 distinct Alius subteams**.

Behaviour direction:

- successful high-risk Alius/elite challenges can improve reward/recruit quality in a bounded way;
- the effect must use explicit per-segment/checkpoint/run limits so it cannot become an infinite farming loop;
- exact reward classes, caps and event hooks remain balance/content work.

This tier expresses Alius growth-through-pressure without reducing the faction to a permanent ATK bonus.

### Tier III — Sovraccarico Alius

Working activation shape:

- **6 Alius CharacterVersions**;
- representing at least **3 distinct Alius subteams**.

Behaviour direction:

- once per battle, allow a deliberate short **Overdrive/Sovraccarico** window with a strong payoff and an explicit cost;
- valid future costs may include recoil/HP loss, temporary vulnerability, resource loss or another readable downside;
- it must be an active tactical decision, not a passive free buff;
- exact cost, magnitude, eligible actions and whether Manager AI may shape the tradeoff remain balance work.

### Composition examples

`6 Diamond Dust`

- may reach Diamond Dust Tier III;
- does **not** satisfy the intended cross-team requirement for full Risonanza Alius.

`4 Diamond Dust + 2 Epsilon`

- may reach Diamond Dust Tier II;
- reaches a meaningful Alius Faction tier through mixed-team composition.

`2 Diamond Dust + 2 Gemini Storm + 2 Epsilon`

- qualifies for the intended full Alius horizontal build shape;
- may simultaneously hold low Team-specialization tiers where those Team Traits exist.

Exact interaction with the general `2 / 4 / 6` Trait display model must be made explicit in UI and simulation because Alius also requires **distinct subteam counts**, not only raw points.

### Alius guardrails

- A CharacterVersion counts as Alius only through verified current faction identity; Legacy Alius history alone does not contribute.
- One CharacterVersion contributes once to the Alius member count even if it has multiple compatible metadata fields.
- A team/faction overlap must never duplicate the same effect trigger invisibly.
- Faction thresholds and subteam-diversity conditions must be visible in Starter/Team composition UI.
- Manager AI must obey the same activation/cost rules unless an explicit authored boss rule says otherwise.
- Coverage simulation must compare mono-team vertical builds against mixed-faction horizontal builds to detect a dominant composition.

---

## 14. Current approved direction

- **Alius** -> first approved Faction model and currently the only Faction justified strongly enough to design; no need to invent peers for symmetry.
- **Risonanza Alius** -> cross-team horizontal Faction Trait using mixed-subteam requirements; Tier I/II/III identity approved, exact balance values remain open.
- **Diamond Dust / Gemini Storm** -> Team specializations inside Alius.
- **Epsilon** -> valid Alius contributor; specific Team Trait deferred until coverage/exception justifies it.
- **Raimon** -> Team Trait only; former membership belongs in Legacy, not persistent Raimon Trait contribution.
- **Inazuma Japan** -> future independent Team Trait based on its CharacterVersions.
- **Ray Dark** -> future cross-team Manager profile, not an automatic player Faction.
