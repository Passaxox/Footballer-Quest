export const NODE_ARCHETYPES = [
  { id: "battle", kind: "battle", weight: 45 },
  { id: "elite", kind: "elite", weight: 10 },
  { id: "recruit", kind: "recruit", weight: 15 },
  { id: "shop", kind: "shop", weight: 12 },
  { id: "training", kind: "training", weight: 10 },
  { id: "recovery", kind: "recovery", weight: 8 },
];

export function selectNodeArchetype(run, rng = Math.random) {
  if (run.wave === 1) return NODE_ARCHETYPES[0];
  const biases = run?.segmentState?.routeBiases || {};
  const pool = NODE_ARCHETYPES.map(node => {
    const mult = biases[node.id] ?? biases[node.kind] ?? 1;
    return { ...node, effectiveWeight: node.weight * mult };
  });
  const totalWeight = pool.reduce((sum, node) => sum + node.effectiveWeight, 0);
  let draw = rng() * totalWeight;
  const chosen = pool.find(node => (draw -= node.effectiveWeight) < 0);
  if (!chosen) return NODE_ARCHETYPES.at(-1);
  return NODE_ARCHETYPES.find(n => n.id === chosen.id) || chosen;
}

export const routeEntry = run => run.pending ? {
  wave: run.wave,
  segmentIndex: run.segmentState?.segmentIndex || 1,
  step: run.segmentState?.step || 1,
  routeId: run.segmentState?.routeId || "standard",
  scenarioId: run.scenarioState?.id || "urban",
  archetype: run.pending.nodeArchetype || run.pending.kind || run.pending.type,
  kind: run.pending.kind || run.pending.type,
  teamName: run.pending.teamName || null,
  minibossId: run.pending.minibossId || null,
  eventId: run.pending.eventId || null,
} : null;
