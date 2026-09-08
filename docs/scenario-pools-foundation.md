# V2i: scenario/location foundation

## Contract and compatibility

`scenarios.js` owns location identity, optional macro/area references, eligibility and weighted encounter pools. Only macro `ffi` is registered; `areaId` remains null. Location types include field/city/facility/hq/stadium/special/generic. Stadium is a location, never equipment. Event/boss/manager/presentation placeholders are null and inactive.

The initial travel policy uses six-wave segments. Persisted `scenarioState` contains id, revision 1, segmentStart and segmentEnd; explicit segment ends allow a later travel policy without changing location identity. Eligible scenarios have at least three candidates at the current ordinary tier. A scenario may repeat. Normal progress first allows international selection at the segment starting wave 19 (eligibility starts wave 18, minimum tier 3).

New runs randomly choose Raimon or urban. Opponents are sampled by allowed versions/tags, excluded tags, existing tier and exclusions, then positive weights. International Unicorn members each have weight 3; other members weight 1. Duplicate members are excluded within a generated group. There is no new rarity behavior or seed system; tests inject deterministic random draws.

App persists scenario and pending node together. Old runs default to urban for their current segment, with no random draw on load. Existing pending nodes return unchanged. No schema-version/key/identity changes. Catalog data remains unchanged. The reveal descriptor exposes location/macro/area and version/team/element/role/rarity/variant, with no discovery or presentation side effects.

Only ordinary battles and direct recruitment nodes use these pools. Scripted bosses and event encounters retain their existing content. Node probabilities, level formulas and rewards are unchanged. Changed opponent composition can still affect perceived difficulty; tester validation remains necessary. Raimon currently stays tier 1 in composition even at later waves, while levels continue scaling normally.

## Measured current catalog (44 versions)

| Pool | tier <=1 | tier <=2 | tier <=3 | tier <=4 |
|---|---:|---:|---:|---:|
| Raimon | 10 | 10 | 10 | 10 |
| Urban | 6 | 15 | 19 | 19 |
| International (wave >=18, min tier 3) | 0 | 0 | 5 | 6 |

Tier 4 is reachable only through the existing recruitment tier bonus, not ordinary generation. International has Dylan, Kruger, Edgar, Teres and Chae; Rococo is the sixth at tier 4. Urban starts with Shawn, Sam, Steve, Bobby, Maxwell and Silvia. No canonical urban affiliation is asserted.

20 versions have team tags, 24 have none. Team counts: Raimon 10; Unicorn 2; Knights of Queen 1; The Empire 1; Fire Dragon 1; Little Gigant 1; Chaos 2; Genesis 1; Zeus 1. Alius Academy is an overlapping umbrella on three versions, not three additional players. Royal Academy, Orpheus, Inazuma Japan, Gemini Storm, Epsilon, Diamond Dust and Prominence have zero tagged versions. The Kingdom has no current registry entry or version.

Arc counts: Football Frontier 1, Alius 3, FFI 6, unspecified 34. Do not infer an arc for the ten base Raimon versions. Jordan/Reize and Dvalin/Desarm have verified identities but insufficient incarnation metadata for a dedicated Alius pool. Joseph/Austin and Jonas retain their audit issues. These five untagged versions are absent from the authored urban pool; no identity was edited. Zeus and Alius are tier 4 only, so neither currently supports an ordinary pool. FFI consists of four attackers and one midfielder at ordinary tiers: defensive variety is especially limited. All individual FFI areas remain too small for a distinct three-member group.

## Proposed expansion: 44 -> 96, not implemented

Each batch needs verified incarnation, portrait and role coverage before content is added. Counts below are new versions; do not reclassify existing Raimon versions as national-team versions. Prioritize goalkeeper/defender/midfielder coverage over more star forwards.

| Priority | Batch | New versions | Scenarios enabled |
|---|---|---:|---|
| 1 | Football Frontier: Royal Academy 4, Zeus 3 | 7 | Two dedicated school pools, provided ordinary-tier content is authored |
| 2 | Alius: Gemini Storm 3, Epsilon 3, Diamond Dust 3, Prominence 3 | 12 | Four specific pools; preserve existing Chaos/Genesis incarnations |
| 3 | FFI: Orpheus 4, Knights of Queen 2, Unicorn 1, The Empire 2 | 9 | Italy 4, England 3, America 3, Argentina 3 |
| 4 | FFI: The Kingdom 4, Little Gigant 3, Inazuma Japan 4 | 11 | Brazil 4, Cotoarl 3 ordinary members plus existing Rococo, Japan 4 |
| 5 | Genesis 3, Chaos 3, Raimon 2, other FF school 2, Fire Dragon 3 | 13 | Alius depth, Raimon depth, Asian qualification pool; other school still needs another member |

Total +52 = 96. A three-member pool is a technical minimum, not a rich long-term area: aim for 4-6 verified versions per area over subsequent batches. Big Waves, Desert Lion and Neo Japan remain empty and lower priority; use later small Asian-qualification batches instead of mixing them into national areas. Existing Paolo/Fidio records must not be counted as Orpheus members without verified incarnation metadata. Team K needs its own future verified batch. Italy/England/America/Argentina/Brazil/Cotoarl/Japan above are proposals, not newly created areas.

Recommended next task: one focused Royal Academy batch of four verified original-incarnation players, prioritizing missing roles and verified assets. Resolve Joseph's remaining technique issue separately before relying on his current record. Do not ship all 52 additions in one task.
