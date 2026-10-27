# Epsilon controlled entry

Baseline: `66b1345904e2fdd933e0de98d96b973df28800be`.

## Entry contract

One optional elite team encounter replaces the ordinary W25 node in 25% of
seeded runs reaching that wave. This sits after Zeus W20 and before the Alius
special W30. No scenario registry, global pool, early map node or boss changes.
W25 is the only opportunity: continuing or fleeing advances past it, so it
cannot repeat during ordinary progression.

The isolated `epsilon-w25` stream uses the existing persisted overworld
contentSeed, or startedAt for older saves. Legacy saves with neither stable
source retain the old flow. Appearance, enemy instances and recruitment index
come from this stream; scenario/global RNG does not decide the Epsilon entry.
An existing pending encounter always takes precedence, including an ordinary
W25 encounter saved before this patch. No schema version change or hydration
rewrite is needed.

The lineup is exactly Tytan, Krypto, Zell, Dvalin, all `:epsilon-ie2` versions.
Dvalin closes the sequential fight. The existing battle header shows ELITE:
Epsilon and its introduction explicitly announces the challenge. No Epsilon
Plus, base Dvalin, off-team fallback or new roster content is involved.

## Combat and recruitment

The encounter remains kind=team with encounterType=canonical-team. Ordinary
enemy level guardrails, per-opponent XP and the standard team money multiplier
apply. Four opponents mean four normal XP awards, not a boss XP multiplier.
No boss healing, extra item reward or stat scaling is added. Flee remains
available through the standard team battle flow.

Team victories previously did not offer recruitment. This entry alone uses a
small explicit bridge to the existing offer -> reward -> next-wave flow. One
offer is selected from the persisted spawned roster, starting at its seeded
recruitIndex and skipping owned canonical identities. Owning Dvalin/base blocks
recruiting the Epsilon incarnation too. If all four are owned, rewards follow
directly. The helper rejects malformed/off-team rosters instead of consulting
a generic player pool. The whistle is neither required nor consumed.

Seeing an opponent uses existing discovery; joining unlocks only that recruited
version through existing collection logic. No batch unlock occurs. The offer
and reward context are persisted before display. Joining/skipping resumes the
single ordinary reward phase; existing stale-callback guards remain in force.

## Validation and limits

- 2,000 deterministic seed schedules checked across W1-W50: 445 appearances
  (22.25% for this finite sequential sample), earliest/latest W25, zero repeats,
  zero off-team players or duplicate identities. Every generated Epsilon
  encounter was compared with regenerated and saved/reloaded snapshots.
- This is a generation/persistence simulation, not 2,000 full combat playthroughs.
- Battle UI test defeats all four sequential opponents, discovers the actual
  roster, grants four ordinary combat XP awards and emits exactly one victory.
- App tests cover persisted offer reload, base-Dvalin exclusion, fully owned
  roster, unlocks, duplicate callbacks, standard team money and W25 -> W26.
- 123 Node tests pass. All 90 UI tests are green across the full run plus the
  targeted BattleScreen rerun after correcting the new text encoding.
- Existing Royal/Zeus and W30/W40/W50 boss lineups are unchanged; W10 -> W11,
  starter selection, save compatibility and reward regressions remain green.
- Balance and asset audits pass. Asset inventory is unchanged: 67 assets,
  zero missing/orphan/invalid and 51 known warnings.

The threat comes from a rare, announced four-person team and Dvalin as the final
opponent, without a new battle system. Full device playtesting of perceived
difficulty remains useful; this patch does not claim a new balance study.
