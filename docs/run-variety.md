# Run variety

Every new run stores a printable `seed`, `rngState`, and `rngCounter`. Run-node, scenario,
reward, event-outcome, encounter, and recruitment selection consume this persisted stream,
so the same seed and player choices reproduce those selections without patching
`Math.random`. Legacy saves derive a stable seed from their start time and roster while
remaining on save version 2. Combat animation/damage randomness is intentionally separate.

## Rarity

CharacterVersion occurrence uses `common` (weight 10), `uncommon` (6), `rare` (3), and
`special` (1.5). A null `rarityId` falls back from the existing encounter tier, so generated
manifest content participates automatically. Rarity changes frequency only: it never edits
HP, ATK, DEF, speed, or move power. Eligibility and exclusions run first; scenario preference,
explicit version weights, and temporary contextual modifiers then multiply the rarity weight.

## Authoring events

Add declarative records to `frontend/src/game/events.js`. Each event needs a unique
`eventId`, concise title/body, category, rarity, positive weight, and at least two choices.
Optional gates include `scenarioIds`, `waveRange`, `requiresFlags`, `excludesFlags`,
`oncePerRun`, and `cooldownWaves`. Scenario `eventPool.include` lists prevent special team
events from leaking into unrelated scenarios.

Outcomes contain weighted results and only validated effects:

- `healTeam`, `damageTeam`, `grantCurrency`, `grantItem`, `grantXp`, `adjustStat`
- `startEncounter`, `offerRecruit`
- `setFlag`, `incrementFlag`, `temporaryModifier`, `narrative`

Use `setFlag` in an early event and `requiresFlags`/`excludesFlags` in a later event for a
linked consequence. Team IDs belong in authored event constraints, never generic selection
logic. `startEncounter` and `offerRecruit` retain the selected CharacterVersion identity.

Events use a seed-offset three-wave cadence with a minimum two-wave gap. Repeatable events
also honor their own cooldown. Run the deterministic smoke report with:

```text
npm run variety:report -- beta-01 beta-02 beta-03
```

The JSON reports event sequences, scenario usage, encountered rarity, version occurrence,
recruit opportunities, and repeated events. It is a balance smoke detector, not a
statistical guarantee.
