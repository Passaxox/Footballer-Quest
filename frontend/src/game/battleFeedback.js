import { effectiveTypeMultiplier } from "./engine";

// Ephemeral feedback: no RNG, damage calculation or mutation. Use pre-hit fighters for Talisman.
export function attackFeedback(attacker, defender, resultDefender) {
  const multiplier = effectiveTypeMultiplier(attacker, defender);
  return {
    element: attacker.move.element,
    effectiveness: multiplier > 1 ? "strong" : multiplier < 1 ? "weak" : "neutral",
    label: multiplier > 1 ? "SUPEREFFICACE" : multiplier < 1 ? "POCO EFFICACE" : "NEUTRO",
    damage: Math.max(0, defender.hp - resultDefender.hp),
  };
}
