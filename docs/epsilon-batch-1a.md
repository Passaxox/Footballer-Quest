# Epsilon Batch 1A

Baseline: 1fd51d35bd2f182a49bc517f30fa047d338fb2bc.

Exactly four additive versions use the approved manifest IDs: dvalin:epsilon-ie2,
tytan:epsilon-ie2, krypto:epsilon-ie2, zell:epsilon-ie2. Only Tytan, Krypto and
Zell create Characters. Dvalin/base and all saved snapshots remain unchanged.
Epsilon Plus remains empty. No save-schema change.

| Version | Role | Element | Rarity | HP / ATK / DEF / SPD | Generic technique |
|---|---|---|---|---|---|
| Dvalin Epsilon | P | natura | Rare | 94 / 24 / 42 / 22 | Parata decisa, 55, guard |
| Tytan Epsilon | D | terra | Common | 82 / 28 / 36 / 26 | Contrasto deciso, 60, shatter |
| Krypto Epsilon | C | aria | Common | 72 / 34 / 30 / 34 | Passaggio tattico, 65, weaken |
| Zell Epsilon | A | aria | Uncommon | 74 / 40 / 26 / 32 | Tiro potente, 85 |

These are existing Royal/Zeus role profiles, not claimed canonical game stats.
Rarity is informational and never alters these profiles. Tier 3 is authored
future eligibility metadata, not automatic activation. Only primary roles are
used. Secondary canonical roles remain reference-only in the approved task.

Approved display-name aliases are stored on canonical Characters and indexed by
the existing starter search. They do not create new IDs or remap saved identity
keys. Dvalin alternate versions replace the same starter slot. Existing unlocks
remain version-specific; new versions are not automatically unlocked.

## Assets

See epsilon-batch-1a-assets.json for all four runtime paths, source paths,
provenance paths and SHA-256 values. Approved bytes are copied unchanged from
verified storage. Each is 64x64 WebP under a .png filename by explicit policy.
No source, approval, legacy sprite or unrelated asset is overwritten.
Runtime audit: 67 assets, no missing/orphan/invalid; 48 format warnings plus the
same three identity warnings = 51, a deliberate +4 from the baseline 47.

## Availability

Four distinct people satisfy the existing 2-3 opponent combat format and a
four-member builder request, but not five. No existing scenario cleanly places
Epsilon without changing progression routing, so none is activated. New versions
are structurally recruitable/unlockable through existing APIs but currently have
no ordinary encounter/recruit acquisition route. Existing Dvalin boss appearances
continue to use the original base version. No new nodes, pools or boss edits.

## Verification

122 Node tests pass (foundation, identity, saves, rewards, overworld transitions,
assets, path-safe tools and release tooling). A controlled, temporary test-only
scenario generates 1,200 deterministic Epsilon lineups of 2-4 people: zero
off-team players and zero canonical duplicates. Oversized requests never fill
with unrelated players and never claim a canonical banner.
87 UI tests pass, including Epsilon unlocks, alias search, grouping and correct
version IDs entering a new run. Balance and asset audits pass.
The older rarity test now extends rather than replaces the actual rarity registry.
No production scenario is enabled solely to make simulation pass.

Production web build compiled successfully. git diff --check passes. No APK.
