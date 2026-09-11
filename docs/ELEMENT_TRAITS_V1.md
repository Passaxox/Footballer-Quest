# Footballer Quest — Element Traits v1

**Status:** APPROVED_CONCEPT — Fuoco, Aria, Terra and Natura tier identities frozen; exact numbers remain balance work  
**Milestone:** M2 Traits/Synergies foundation  
**Purpose:** define broad element identities that influence build decisions without replacing Team/Faction identity.

Element Traits are universal composition traits. They should remain broader and less bespoke than Team Traits.

Guardrails:

- Element Traits must not simply copy a Team Trait identity.
- An element should not be reduced to one status only.
- Effects should create decisions, not only permanent flat stat inflation.
- Team/Faction/Legacy/Manager identity remains separate from Element identity.
- DNA contribution follows `docs/TRAIT_DNA_RULES.md`.
- Trait tiers are earned composition thresholds, not guaranteed progression rewards. A run may legitimately finish with only Tier I, or with no tier of a desired Trait, if recruitment/DNA/team choices never reach the next threshold.
- Different Trait families do not contribute points to each other: Team/Faction/other Element progress cannot silently complete a Natura, Terra, Aria or Fuoco threshold.

Under the current working `2 / 4 / 6` threshold model, for example, starting a run with three Natura players would activate Natura Tier I and leave the build at `3 / 4` toward Tier II. The fourth point must come from another valid Natura contribution (including eligible DNA half-points under the DNA rules). The game may provide opportunities to continue the build, but normal runs do not guarantee that every chosen Trait reaches Tier II or Tier III.

---

## FUOCO — Pressure / Execution / Risk

**Status:** APPROVED_CONCEPT — tier identity frozen; exact numbers remain balance work  
**Identity:** maintain offensive pressure, exploit prepared targets, choose when to overextend.

### Tier I — Pressione

Eligible Fuoco techniques gain a controlled advantage when attacking an opponent that has already lost HP.

Design intent:

- reward keeping pressure on a weakened target;
- avoid generic permanent ATK inflation;
- make Fuoco feel better at finishing an attack sequence than at receiving unconditional opening damage.

Exact bonus form/size remains balance data.

### Tier II — Combustione

When an eligible Fuoco technique hits a target affected by `Burn`, it may **advance one future Burn tick immediately**.

Approved behaviour direction:

- resolve one scheduled Burn damage tick now;
- remove/consume that future tick from the remaining Burn duration so the Trait does not create free duplicate damage;
- the Burn status may remain active if additional ticks/duration remain;
- the interaction must be explicit in combat feedback.

This turns Burn into a tactical resource: wait for normal damage-over-time or cash part of it out now to maintain pressure.

Exact trigger frequency, whether every compatible hit can do it, and Burn tick representation remain status/balance implementation details.

### Tier III — Surriscaldamento

Once per battle, the player may deliberately overcharge an eligible Fuoco technique for a large offensive payoff in exchange for a clear cost.

**Approved cost direction:** HP recoil to the user after the empowered action.

Design intent:

- create an explicit all-in decision;
- make the strongest Fuoco payoff powerful but not free;
- preserve counterplay and avoid a permanent passive damage multiplier.

Exact damage bonus, recoil amount, eligibility and any KO-at-own-risk rule remain balance data.

### Explicit exclusions

Fuoco v1 does not imply:

- every Fuoco technique applies Burn;
- Burn damage is duplicated rather than advanced/consumed;
- permanent unconditional ATK increase;
- infinite Surriscaldamento uses;
- automatic protection from the recoil cost.

---

## ARIA — Tempo / Control / Disruption

**Status:** APPROVED_CONCEPT — tier identity frozen; exact numbers/status tuning remain balance work  
**Identity:** recover tempo, disrupt the opponent's action order and convert successful control into a short team-wide timing window.

### Tier I — Corrente Favorevole

When the team has recently lost tempo, eligible Aria techniques receive a controlled priority/tempo benefit to help recover initiative.

**Approved direction:** Aria should not simply be permanently faster. The benefit is conditional on having lost or yielded the previous timing advantage.

Purpose:

- let Aria recover rhythm rather than own first action unconditionally;
- avoid overlapping with Gemini Storm's switch/Momentum identity;
- create a readable tactical comeback in turn order without granting extra turns.

The exact trigger definition and priority value remain balance data.

### Tier II — Turbolenza

Eligible Aria techniques explicitly compatible with `Confusion` improve their reliability at applying it.

If the target is already `Confused`, an eligible control hit should **not** endlessly extend the status. Instead it creates a short tempo disruption such as a penalty to the target's next-action priority/timing.

Purpose:

- distinguish Confusion from Freeze;
- reward preparing and exploiting disruption without hard-lock chains;
- make Aria manipulate timing rather than simply increase damage.

Current v1 direction for Confusion remains a controlled chance to fail/lose effectiveness on an attempted action rather than Pokémon-style self-damage.

Exact application chance, duration and timing penalty remain Q-001/status balance work.

### Tier III — Campo di Correnti

Once per battle, after the team successfully creates an eligible Aria control opening, it may create a short **Campo di Correnti** for a small fixed number of turns.

**Approved behaviour direction:** while the field is active, the team receives a temporary advantage in timing/control interactions — for example improved priority handling and/or stronger effectiveness of authored tempo penalties on compatible Aria techniques.

The field must be visible/readable in battle UI and have explicit remaining duration.

Purpose:

- turn successful control into a memorable team-wide window rather than another one-action priority buff;
- make the Tier III payoff feel materially different from Tier I and II;
- create a battlefield-state identity inspired by short field/tempo systems without copying another game's exact rules.

### Explicit exclusions

Aria v1 does not imply:

- permanent first action;
- free extra turns;
- repeated hard-lock/action denial;
- every Aria technique applying Confusion;
- automatic Freeze support for all Aria techniques;
- Campo di Correnti stacking or refreshing indefinitely.

Freeze remains available only to explicitly compatible techniques/Team Traits such as Diamond Dust; Aria as an element is not synonymous with ice.

---

## TERRA — Structure / Stability / Counterpressure

**Status:** APPROVED_CONCEPT — tier identity frozen; exact trigger thresholds/numbers remain balance work  
**Identity:** absorb pressure without becoming purely defensive, convert disruption into counterpressure and deliberately anchor against a critical impact.

### Tier I — Contrappeso

When an active Terra player suffers an eligible **direct hit** or a meaningful negative alteration applied by the opponent, that player gains `Contrappeso`.

The next eligible **offensive Terra technique** used by that same player receives a small temporary damage/POT benefit.

**Approved starting point:** approximately `+15%` effective damage/POT for balance testing.

Guardrails:

- `Contrappeso` does not stack;
- it is consumed by the next eligible Terra offensive technique;
- it is lost on a voluntary switch by that player;
- incidental passive micro-damage such as a routine Burn tick does not by itself grant Contrappeso;
- one trigger must not grant multiple queued copies.

Purpose:

- make Terra respond to pressure rather than only reduce incoming damage;
- reward staying in and answering after being hit/disrupted;
- create a readable decision between preserving the counterattack and switching for matchup reasons.

Exact definition of “meaningful negative alteration” and final modifier size remain balance/status work.

### Tier II — Stratificazione

When an eligible Terra player survives a sufficiently significant direct hit, that player gains a small temporary `Brace`-style protection against the **next** qualifying hit.

**Approved direction:** the protection is weaker than a full Guard, non-stackable and consumed on use.

Purpose:

- express structural resilience without permanent DEF inflation;
- reward absorbing one major impact by becoming harder to break immediately afterward;
- avoid infinite defensive loops through non-stacking and explicit trigger thresholds.

Exact damage threshold, mitigation value, frequency/cooldown and boss interaction remain balance data.

### Tier III — Punto Fermo

Once per battle, an eligible active Terra player may deliberately spend its action to enter **Punto Fermo** until its next action window.

While anchored:

- the next qualifying major incoming hit is strongly mitigated;
- compatible disruption attached to that hit is strongly reduced or prevented according to authored status rules;
- the player cannot voluntarily switch while Punto Fermo is active.

The action cost is intentional: the player predicts an important incoming threat and gives up tempo to hold position.

Purpose:

- create an active defensive decision instead of passive permanent bulk;
- support boss/elite prediction and future Manager-AI mind games;
- make Terra capable of protecting a critical moment without automatic survival mechanics.

Exact mitigation, status coverage, expiry and whether unused Punto Fermo ends at the player's next action remain balance/implementation details.

### Explicit exclusions

Terra v1 does not imply:

- permanent generic DEF inflation;
- automatic survival at `1 HP`;
- immunity to all statuses/debuffs;
- Contrappeso stacking into an unlimited damage bonus;
- Burn/passive chip repeatedly farming Contrappeso;
- infinite Brace chaining;
- free use of Punto Fermo without spending an action;
- voluntary switching while Punto Fermo is active.

---

## NATURA — Recovery / Growth / Conversion

**Status:** APPROVED_CONCEPT — tier identity frozen; exact healing fractions/thresholds remain balance work  
**Identity:** convert real recovery into a short growth resource, then cash that resource out as high sustain and team-wide healing efficiency.

Natura is intentionally **not** the status-resistance element. Terra owns stability/resistance/counterpressure; Natura owns recovery that becomes new growth.

### Tier I — Linfa Vitale

Eligible Natura heal/drain effects become more efficient when they are restoring **real missing HP** rather than producing overheal.

Approved direction:

- reward healing when the active player is meaningfully injured;
- do not create value from healing an already-full target;
- do not generate free passive regeneration simply from having the Trait active.

Exact missing-HP threshold and efficiency bonus remain balance data.

### Tier II — Germinazione

When an eligible Natura heal/drain action restores a sufficiently meaningful amount of **actual missing HP**, the active Natura player gains one `Germoglio` charge.

`Germoglio` is a short single-charge resource, not a stacking Momentum system.

Guardrails:

- maximum one Germoglio charge at a time;
- overheal does not generate Germoglio;
- routine passive chip/recovery should not farm repeated Germoglio charges;
- the qualifying recovery must come from an authored compatible Natura heal/drain interaction;
- exact recovery threshold and whether Germoglio persists through voluntary switching remain balance/implementation work.

Purpose:

- make recovery feed future growth;
- distinguish Natura from Terra's “absorb pressure and resist” identity;
- create a simple prepare -> bloom gameplay loop without another multi-stack bar.

### Tier III — Fioritura

Once per battle, while `Germoglio` is available, the player may consume it to empower the next eligible **offensive Natura technique** into a major recovery play.

**Approved behaviour direction:** Fioritura converts a large but not-yet-frozen portion of the technique's direct damage dealt into a healing pool.

Healing distribution is deterministic and follows this order:

1. heal the currently active player first, up to that player's missing HP;
2. if healing remains, pass the excess to injured teammates, prioritising the most injured eligible teammate and continuing while healing remains;
3. if no eligible player has missing HP, remaining healing is lost — it does not become shield, overheal, currency or another stored resource.

This means a strong Fioritura hit can rescue the active player first and then use otherwise-wasted healing to repair the rest of the roster, while a fully healthy team gains no extra value from surplus healing.

Purpose:

- make Tier III visibly stronger than ordinary drain without becoming a generic team heal button;
- reward preparing Germoglio before committing to the payoff;
- preserve active-player priority and avoid free value from overheal;
- give Natura a distinct “damage -> recovery -> redistribution” capstone rather than another defensive effect.

Exact damage-to-healing fraction, eligible techniques, once-per-battle activation UX and whether a missed/blocked technique consumes the activation remain balance work.

### Explicit exclusions

Natura v1 does not imply:

- passive full-team regeneration;
- overheal converting into shields or permanent HP;
- unlimited Germoglio stacking;
- automatic status resistance/immunity;
- Fioritura reviving KO players;
- surplus Fioritura healing being stored for later;
- every Natura offensive technique having innate drain outside authored effects/Trait interactions.

---

## Cross-element identity check

The approved v1 lanes are intentionally distinct:

- **Fuoco** -> pressure, execution and risky overextension;
- **Aria** -> tempo, control and short battlefield timing windows;
- **Terra** -> stability, counterpressure and deliberate anchoring;
- **Natura** -> real recovery, growth resource and healing redistribution.

Future simulation must test not only raw strength, but whether mixed teams make meaningful trade-offs and whether one Element Trait becomes a universal best answer regardless of Team/Faction composition.
