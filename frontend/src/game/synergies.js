export const ELEMENT_SYNERGY_CONFIG = {
  fuoco: {
    id: "element-fuoco",
    element: "fuoco",
    label: "Intesa di Fuoco",
    description: "+10% probabilità di colpo critico",
    shortDescription: "+10% colpo critico",
    critBonus: 10,
  },
  aria: {
    id: "element-aria",
    element: "aria",
    label: "Intesa d'Aria",
    description: "+4 VEL iniziativa in battaglia",
    shortDescription: "+4 VEL iniziativa",
    speedBonus: 4,
  },
  terra: {
    id: "element-terra",
    element: "terra",
    label: "Intesa di Terra",
    description: "-10% danni subiti in battaglia",
    shortDescription: "-10% danni subiti",
    damageTakenMultiplier: 0.90,
  },
  natura: {
    id: "element-natura",
    element: "natura",
    label: "Intesa di Natura",
    description: "Recupero 8% HP di squadra a fine lotta",
    shortDescription: "+8% HP a fine lotta",
    postBattleHealPercent: 8,
  },
};

export function activeSynergies(team = []) {
  const counts = (Array.isArray(team) ? team : []).filter(player => player && player.hp > 0).reduce((result, player) => {
    if (player.element && Object.hasOwn(ELEMENT_SYNERGY_CONFIG, player.element)) {
      result[player.element] = (result[player.element] || 0) + 1;
    }
    return result;
  }, {});
  return Object.entries(counts)
    .filter(([, count]) => count >= 2)
    .slice(0, 2)
    .map(([element, count]) => ({
      ...ELEMENT_SYNERGY_CONFIG[element],
      members: count,
    }));
}

export const synergyRewardMultiplier = team =>
  activeSynergies(team).reduce((multiplier, synergy) => multiplier * (synergy.rewardMultiplier || 1), 1);

export const synergyCritBonus = team =>
  activeSynergies(team).reduce((bonus, synergy) => bonus + (synergy.critBonus || 0), 0);

export const synergySpeedBonus = team =>
  activeSynergies(team).reduce((bonus, synergy) => bonus + (synergy.speedBonus || 0), 0);

export const synergyDamageTakenMultiplier = team =>
  activeSynergies(team).reduce((mult, synergy) => mult * (synergy.damageTakenMultiplier ?? 1), 1);

export const applyPostBattleSynergyHealing = (team = []) => {
  const synergies = activeSynergies(team);
  const healPercent = synergies.reduce((max, s) => Math.max(max, s.postBattleHealPercent || 0), 0);
  if (healPercent <= 0 || !Array.isArray(team)) return team;
  return team.map(player => {
    if (!player || player.hp <= 0) return player;
    const healAmount = Math.max(1, Math.round(player.maxHp * (healPercent / 100)));
    return {
      ...player,
      hp: Math.min(player.maxHp, player.hp + healAmount),
    };
  });
};
