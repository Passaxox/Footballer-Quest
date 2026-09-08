# V2g post-remediation status

Baseline V2f: 5d44aef1e4d9a2648517f0fddde277eb3b6c2ddf. This section supersedes historical findings below where corrected. No downloads, new assets or new canonical research.

- David: replaced with the already inspected V2f joseph.png (Sakuma). Identity now verified; custom C/Twin Boost retained, no proven replacement needed.
- Joseph: replaced with V2f david.png (Genda). GAME_DATA_FIX limited to new-instance role A -> P: Genda is the goalkeeper, whereas the old attacker/Penguin representation was mixed. Stats, element and all move fields unchanged. Penguin No.1 remains suspicious because no verified replacement with project-specific parameters is available. Saved instances keep their existing role/move; no migration or reconstruction.
- Paolo: approved intended Fidio/Paolo supported by displayName/Odin; copied existing fidio.png. Verified identity, no rename or canonical key merge. Paolo and Fidio progress remain separate and preserved.
- Jonas: unresolved intended identity; Demeter portrait absent. No identity/gameplay/asset changes.
- Austin: intended Austin/Toramaru preserved; no verified Toramaru portrait in repository. Kira portrait remains a known suspicious mismatch. No gameplay change.
- Hector/Malcolm: LEGACY_COMPAT unchanged. Jordan/Dvalin and all metadata remain unchanged.

Repository asset inventory contains the same 44 portrait paths previously inspected; no alternate Toramaru/Demeter file was found. Copy provenance and pre-remediation hashes are retained in audit.v2fObservation. Fetch targets corrected only for the three replaced portraits so the known error is not regenerated; script was not executed.

v2g-remediation source key: user-approved V2g scope plus V2f name/asset/move findings and existing portrait bytes. Counts: 39 verified, 2 legacy-weird-but-verified, 2 suspicious (Joseph, Austin), 1 unresolved (Jonas).

No compatibility mapping was needed: all 44 legacyId/characterId/versionId/displayName/primaryMoveId references are unchanged. Only Joseph role changes for newly created instances. Existing run/history/Collection/unlocked/fusion references remain exact; no save schema changes. Future canonical unification of Paolo/Fidio is explicitly deferred.

Remaining remediation: Joseph GAME_DATA_FIX needs a verified replacement move specification; Austin ASSET_FIX needs an approved Toramaru portrait; Jonas needs an IDENTITY_FIX decision before ASSET_FIX/GAME_DATA_FIX. Do not choose numeric replacements merely to make the audit green.

# Historical V2f evidence (before the above corrections)

# Legacy identity audit (V2f)

Baseline: b270d78d4b47b61c0b74fb2b0fe57ac25f35180c. All 44 actual portrait files were decoded and visually inspected; SHA-256 in the fixture identifies the bytes inspected. No portrait, roster, metadata, move, stat, role, ID or save was changed.

## Meaning and evidence limits

- verified: name, repository lookup and inspected appearance consistently identify the person. It does NOT certify every move, role, uniform, timeline, affiliation or game origin. Most legacy moves/stats are custom gameplay.
- legacy-weird-but-verified: same confidence about the person, but the technical key is misleading. Neither this nor a mixed localization authorizes renaming keys.
- suspicious: positive conflicting evidence, with nameCharacter and spriteCharacter kept separate. canonicalCharacter is null rather than choosing an intended person.
- unresolved: insufficient evidence; currently zero. This is an allowed status, not an obligation to fill a quota.

The ordinary 35 non-priority rows use the existing name/lookup association plus inspected portrait features, documented per row. They are not claims of a new external canonical roster review. Fidio, Jordan and Dvalin receive the additional evidence below. The generator's search fallback and sprite ranking are not proof of asset provenance; the actual files were inspected instead.

validateCatalog remains technical validation. validateIdentityAudit is opt-in for tests/dev and returns an explicit pending list. It guards reviewed identity fields and sprite hashes for verified statuses only. It must not run on app startup. Human review, not JavaScript, establishes canonical correctness. Historical gameplay/alias fixtures are technical baselines, not canonical authority; a future reviewed remediation can update those baselines deliberately without changing IDs.

## Source keys

- repo-roster: frontend/src/game/data.js (44 records, names, role/move/stats, composite boss lineups).
- repo-fetch: scripts/fetch_sprites.py NAMES and fallback logic. A stale/wrong target is evidence of a cause, not authority over a name.
- local-portrait: frontend/public/sprites/<legacyId>.png; inspected bytes pinned in the audit. ui.jsx resolves catalog.spriteId, including fusion parents.
- urabe: https://inazuma-eleven.fandom.com/wiki/Urabe_Rica and https://inazuma-eleven.fandom.com/nl/wiki/Suzette_Hartland — Rika/Rica and Suzette (Sue) are the same person; unrelated to Hector Helio.
- royal-names: https://inazumalife.com/wp-content/uploads/2022/10/codigos-ie2-ita.pdf and https://www.animecharactersdatabase.com/jp/sort_characters.php?autolayout=3&mode=pid&pid=1910 — independent localized mapping Genda=Joseph King, Sakuma=David Samford. Used only identity rows, not cheats or gameplay content.
- sakuma: https://inazuma-eleven.fandom.com/wiki/Sakuma_Jirou and https://www.animecharactersdatabase.com/jp/characters.php?id=42978&more= — cyan hair/eyepatch and David localized identity.
- genda: https://inazuma-eleven.fandom.com/wiki/Genda_Koujirou — original Royal goalkeeper. Actual red-spiked portrait agrees with local Genda lookup.
- fidio: https://inazuma-eleven.fandom.com/wiki/Fidio_Aldena — Fidio and Nakata are distinct people in Orpheus.
- paolo-localization: https://inazumaeleven.fandom.com/ca/wiki/Paolo_Bianchi and https://it.wikipedia.org/wiki/Personaggi_minori_di_Inazuma_Eleven_3 — Paolo Bianchi is Fidio's localized name; Odin association supports the name side of paolo's conflict.
- nakata: https://inazuma-eleven.fandom.com/wiki/Nakata_Hidetoshi — Nakata Hidetoshi / Hide Nakata is distinct from Fidio; local target and short upright hair portrait agree.
- demeter: https://inazuma.fandom.com/es/wiki/Jonas_Demetrius and https://inazuma-eleven.fandom.com/de/wiki/Jonas_Demetrius — Jonas Demetrius is Demete Yutaka / Demeter.
- poseidon: https://inazuma-eleven.fandom.com/wiki/Posei_Donichi — Paul Siddon / Poseidon, a different Zeus player. Local lookup plus broad bald/teal-sided head identify the asset.
- midorikawa: https://inazuma-eleven.fandom.com/wiki/Midorikawa_Ryuuji — Reize/Janus and Jordan are one person. High tied alien hair versus later loose front strands distinguishes the inspected Reize appearance.
- saginuma: https://inazuma-eleven.fandom.com/wiki/Saginuma_Osamu — Desarm/Dvalin, Dave Quagmire; Epsilon dark sclera/cowl versus Epsilon Plus red eyes. Name, appearance and goalkeeper role agree, even though fetch script has stale janus key.
- austin: https://inazuma-eleven.fandom.com/wiki/Utsunomiya_Toramaru and https://inazuma-eleven.fandom.com/nl/wiki/Austin_Hobbes — Austin is Toramaru.
- kira: https://inazuma-eleven.fandom.com/wiki/Kira_Hiroto — Ares gray/white hair, pale red eyes and blue cheek marking match austin.png and its Kira fetch target, not Toramaru.

Public verification was bounded and used indexed page excerpts when direct access was unavailable. No narrative text copied or bulk scraping performed.

## Priority findings

- hector: display Rika Urabe + Urabe lookup + pigtails/headband agree. Role C, base HP70/ATK36/DIF28/VEL38; Anello Arcobaleno, natura, POT78, charge. These custom numbers/technique do not establish a different character. No repository evidence proves why the key was originally chosen, but its current use is consistently Rika. European name would be Suzette/Sue Hartland; Japanese-order/transliteration variation is localization, not Hector identity. Keep legacy key.
- david: sprite is Genda/Joseph; display is David/Sakuma. Runtime C/Twin Boost does not establish Genda. Royal boss alone is non-discriminating. Positive sprite/name inversion.
- joseph: sprite is Sakuma/David; display is Joseph/Genda. Runtime A/Penguin No.1 supports Sakuma more than Genda. Thus the pair is NOT safely described as only two inverted pictures: at least Joseph is a mixed name/asset/gameplay record. No ID swap is justified.
- paolo: portrait and fetch target are Nakata; display and Odin-themed move point to Fidio/Paolo. Intended identity cannot be decided automatically. Correct name for the asset would be Hide Nakata/Nakata Hidetoshi; correct person for the current name is Fidio.
- fidio: existing portrait, lookup and name agree on Fidio. European localized display would be Paolo Bianchi. The two rows are not proven two distinct canonical Characters just because their technical characterIds differ.
- jonas: display is Demeter; asset and fetch target are Poseidon (Paul Siddon), reinforced by the move name. Runtime defender role is custom and does not resolve the conflict. Not merely an alias variation.
- jordan: identity is verified Midorikawa; alien hairstyle supports Gemini Storm Reize, not civilian national-team form. Metadata remains unchanged. Genesis boss membership is not canonical team proof.
- dvalin: identity verified Saginuma/Desarm; portrait supports original Epsilon, not visibly red-eyed Epsilon Plus. Exact asset origin/game remains unrecorded. No automatic metadata assignment.
- additional real error: austin has a Kira Hiroto Ares portrait. Name identifies Austin/Toramaru. No silent asset replacement.

For Torch/Gazelle/Xavier and Aiden, identifying the person does not certify that the portrait's outfit/timeline agrees with all existing version metadata. This audit intentionally does not alter those metadata. A future asset-incarnation review should precede deriving more fields from portraits.

## Minimal compatible remediation proposal (not implemented)

1. Choose intended identities for mixed records explicitly. Preserve every legacyId, characterId and versionId meanwhile; never swap david/joseph keys or merge paolo/fidio unlocks by display name.
2. If current display-name identities are approved, replace only incorrect portraits and fix fetch targets for Austin and the Royal pair; approve intended Jonas identity before choosing a portrait. Catalog sprite resolution then updates visuals without changing saved UID/HP/XP/moves, Collection, History references or fusion parentVersionIds. Canonical role/move corrections are separate gameplay decisions, not part of an asset fix.
3. Decide whether paolo is intended as Nakata or another Fidio version. Keeping Nakata requires an explicitly approved display-name correction; keeping Fidio requires the matching asset. Neither requires destructive save migration if IDs remain stable. Old saved name/history snapshots should remain historical, with any current-name display resolver explicitly scoped.
4. If canonical Character identities are later unified/rekeyed, use an additive legacy-character alias resolver and keep old version keys, collection/unlocked entries, fusion parents and history references resolvable. Test idempotent load/save/reload; never reconstruct runtime instances or invent past recruitment. This requires compatibility mapping and a separate migration design; it is not necessary for an asset-only fix.
5. Update the reviewed audit hashes/status/evidence and technical fixtures in the remediation commit. Suspicious snapshots are not eternal canonical constraints. No saveVersion/metaSchemaVersion change is needed for this audit.

## Remediation categories (documentation only)

Categories describe future review scope, NOT authorization or proof that every listed field must change.

| Records | Categories | Scope / condition |
|---|---|---|
| hector, malcolm | LEGACY_COMPAT | Keep misleading keys; identified people are consistent. Rika naming normalization is optional localization, not an identity correction. |
| david, joseph | ASSET_FIX, IDENTITY_FIX, GAME_DATA_FIX, LEGACY_COMPAT | Portraits are swapped relative to names. Joseph also mixes attacker/Penguin data with a goalkeeper name. Decide intended person before changing any identity or gameplay. David C/Twin Boost is a review flag, not a proven need to rebalance. |
| paolo | ASSET_FIX, IDENTITY_FIX, GAME_DATA_FIX, LEGACY_COMPAT | Nakata portrait vs Fidio name/Odin. Which side to retain is undecided; move review applies only if choosing Nakata. |
| jonas | ASSET_FIX, IDENTITY_FIX, GAME_DATA_FIX, LEGACY_COMPAT | Demeter name vs Poseidon portrait/theme; defender role does not decide identity. |
| austin | ASSET_FIX, IDENTITY_FIX, LEGACY_COMPAT | Kira portrait vs Austin name. Asset-only remedy if keeping Austin; no evidence requiring a gameplay change. |
| fidio | IDENTITY_FIX, LEGACY_COMPAT | Person is verified. Only localized naming consistency and relationship to the disputed paolo record need a decision; no automatic merge. |
| jordan, dvalin | METADATA_FIX | Identity verified; cautiously document incarnation in a subsequent metadata-only task. |
| torch, gazelle, xavier, aiden | METADATA_FIX | Person verified; existing/absent incarnation fields require asset-version corroboration, not assumed corrections. |

Asset-only replacements and passive metadata can preserve saved keys/UID/state with no schema migration. Renaming catalog labels is storage-safe only if old runtime/history names remain valid snapshots; full presentation consistency needs an explicitly reviewed resolver. Rekeying or unifying canonical Characters needs additive compatibility mapping. No categories are executed by runtime code.
