# Stable move identity foundation

This change adds identity metadata. It does not correct canon, change assignments,
or alter move names, elements, powers, effects, combat rules, or presentation.

## Identity flow

`CATALOG_SOURCE.moves` already assigns a stable `moveId` to every move, and each
CharacterVersion references it through `primaryMoveId`. Previously,
`PRIMARY_MOVES` removed `moveId`, so player creation and fusion copied only the
gameplay payload. Run saves consequently lacked the registry identity.

`PRIMARY_MOVES` now retains the ID. Fresh PlayerInstances copy the same registry
snapshot, including identity:

```js
move: { moveId, name, element, power, effect }
```

The snapshot remains authoritative for the current player's gameplay. Hydration
does not replace it with the latest registry payload. Combat continues to read
the existing payload fields; it does not resolve a registry ID on every action.

## Save version and hydration

`saveVersion` remains **2**. `moveId` is optional additive metadata, with an
explicit `null` representing unresolved historical identity. No other save
structure changes. Saving and loading use the same idempotent normalization path.

Hydration visits run-team players and the existing persisted-player locations:
`pending.enemies`, `pending.player`, and `pending.context.offer`. It does not
generate encounters, change rewards, or rebuild player stats or move payloads.

The conservative identity rules are:

1. Preserve an existing nonempty string `moveId`, including an ID absent from the
   current registry. Its historical payload is not rewritten or reassigned.
2. Preserve explicit `moveId: null`. Reload is not another opportunity to guess.
3. For a normal legacy player without an ID, require an unambiguous existing
   CharacterVersion and an exact match of the saved gameplay fields to that
   version's frozen baseline evidence in `legacyMoveIdentity.js`. This evidence
   records the assigned ID and payload at the pre-migration baseline; it is not
   another gameplay registry. Conflicting version/base identity evidence prevents
   inference. A missing or changed payload is not repaired.
4. Missing IDs on fused players remain unresolved. `parentVersionIds` records
   parent identities, but not which parent supplied the technique; it is not
   sufficient provenance for reconstruction.
5. Any remaining uncertainty produces `moveId: null`, preserving the original
   snapshot. No global name lookup, localized-name alias matching, canonical
   Character deduplication, or role-based inference is used.

Repeated names and identical generic payloads therefore do not merge registry
identities. A known, exact historical version assignment can disambiguate its own
snapshot; an anonymous or fused copy cannot. Additional saved payload data is
preserved.

## Fusion and legacy identity cases

Fusion copies the selected parent's move snapshot and its known ID. An unresolved
parent produces an unresolved fused technique; fusion does not mint an ID or
infer one from a display name.

- `jude:base` and `jude:royal` retain their intentionally shared `jude:primary`.
- `paolo:base` and `fidio:base` keep their distinct move records despite their
  canonical Character alias.
- `jonas:base` remains readable as legacy content; this foundation does not make
  it eligible for new generation.
- Royal, Zeus, and Epsilon generic role profiles retain their existing separate
  IDs and unchanged payloads.

## Boundaries for later content work

The frozen baseline evidence is narrowly scoped migration data, not a general
history or a canon migration. Unresolved snapshots remain playable with their
saved payload but cannot be reliably targeted by a future ID-specific correction.
No new UI exposes IDs to players.

Future content changes must preserve the distinction between identity and the
saved gameplay snapshot. In particular, reassigning a CharacterVersion to a
different move ID with an identical payload must not change the frozen migration
evidence: inference must continue to identify the historical move. New versions
without baseline evidence cannot acquire an inferred legacy ID through their
current assignment. Renamed or otherwise changed snapshots must not be silently
replaced.

Malformed move payloads are preserved rather than repaired; repairing damaged
saves or adding a fallback technique is outside this foundation.
