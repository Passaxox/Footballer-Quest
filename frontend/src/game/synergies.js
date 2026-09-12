const ELEMENT_LABELS = { fuoco: "Intesa di Fuoco", aria: "Intesa d'Aria", terra: "Intesa di Terra", natura: "Intesa di Natura" };

export function activeSynergies(team = []) {
  const counts = team.filter(player => player?.hp > 0).reduce((result, player) => {
    result[player.element] = (result[player.element] || 0) + 1;
    return result;
  }, {});
  return Object.entries(counts)
    .filter(([, count]) => count >= 2)
    .slice(0, 2)
    .map(([element, count]) => ({
      id: `element-${element}`,
      label: ELEMENT_LABELS[element],
      members: count,
      rewardMultiplier: 1.05,
      description: "+5% Prestigio dalle vittorie",
    }));
}

export const synergyRewardMultiplier = team =>
  activeSynergies(team).reduce((multiplier, synergy) => multiplier * synergy.rewardMultiplier, 1);
