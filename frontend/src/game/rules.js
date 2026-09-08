// Published profiles are immutable; future balance revisions get a new versioned ID.
export const DIFFICULTIES = {
  normal: { rulesetId: "normal-v1", label: "NORMALE", description: "Esperienza bilanciata. Progressione e sfida standard." },
  easy: { rulesetId: "easy-v2", label: "FACILE", description: "Progressione più rapida e avversari leggermente meno aggressivi." },
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
// Existing easy-v1 runs retain their published progression profile.
RULESETS["easy-v2"] = {
  ...RULESETS["easy-v1"], version: 2,
  ordinaryEnemyLevelSegments: [
    { fromWave: 19, offset: -2 },
    { fromWave: 21, offset: -3 },
    { fromWave: 26, offset: -4 },
  ],
  checkpoints: { ...RULESETS["easy-v1"].checkpoints, 20: { levelOffset: 0 }, 30: { levelOffset: -1 } },
};
export const getRules = (rulesetId = DEFAULT_RULESET) => {
  const rules = RULESETS[rulesetId];
  if (!rules) throw new Error(`Ruleset non supportato: ${rulesetId}`);
  return rules;
};

// Generation-only policy; published EXP/wave profiles and saved encounters remain unchanged.
export const ENEMY_GUARDRAILS = {
  easy: { ordinary: 2, boss: 3, challenge: 2, challengeOffset: -1 },
  normal: { ordinary: 4, boss: 5, challenge: 4, challengeOffset: 0 },
};
