// Published profiles are immutable; future balance revisions get a new versioned ID.
export const DIFFICULTIES = {
  normal: { rulesetId: "normal-v1", label: "NORMALE", description: "Esperienza bilanciata. Progressione e sfida standard." },
  easy: { rulesetId: "easy-v1", label: "FACILE", description: "Progressione più rapida e avversari leggermente meno aggressivi." },
};
export const DEFAULT_RULESET = "normal-v1";
export const RULESETS = {
  [DEFAULT_RULESET]: {
    difficultyId: "normal", version: 1,
    ordinaryEnemyLevelOffset: 0,
    combatXpMultiplier: 1.5,
    benchXpShare: 0.7,
    bossXpMultiplier: 1.6,
    travelXp: 12,
    defaultBossLevelOffset: 3,
    checkpoints: { 10: { levelOffset: 1 } },
  },
  "easy-v1": {
    difficultyId: "easy", version: 1,
    ordinaryEnemyLevelOffset: -1,
    combatXpMultiplier: 1.75,
    benchXpShare: 0.75,
    bossXpMultiplier: 1.6,
    travelXp: 16,
    defaultBossLevelOffset: 3,
    checkpoints: { 10: { levelOffset: 0 } },
  },
};
export const getRules = (rulesetId = DEFAULT_RULESET) => {
  const rules = RULESETS[rulesetId];
  if (!rules) throw new Error(`Ruleset non supportato: ${rulesetId}`);
  return rules;
};
