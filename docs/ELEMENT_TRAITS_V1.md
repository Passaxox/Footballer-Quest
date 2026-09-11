# Footballer Quest — Element Traits v1

**Status:** DESIGN — Fire approved; remaining elements under Director review  
**Milestone:** M2 Traits/Synergies foundation  
**Purpose:** define broad element identities that influence build decisions without replacing Team/Faction identity.

Element Traits are universal composition traits. They should remain broader and less bespoke than Team Traits.

Guardrails:

- Element Traits must not simply copy a Team Trait identity.
- An element should not be reduced to one status only.
- Effects should create decisions, not only permanent flat stat inflation.
- Team/Faction/Legacy/Manager identity remains separate from Element identity.
- DNA contribution follows `docs/TRAIT_DNA_RULES.md`.

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

## Next element under review

**ARIA — Tempo / Control / Disruption**

Exact Tier I/II/III effects remain under Director review.
