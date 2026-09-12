export const NODE_ARCHETYPES = [
  { id: "battle", kind: "battle", weight: 55 },
  { id: "recruit", kind: "recruit", weight: 15 },
  { id: "shop", kind: "shop", weight: 15 },
  { id: "training", kind: "training", weight: 15 },
];

export function selectNodeArchetype(run, rng = Math.random) {
  if (run.wave === 1) return NODE_ARCHETYPES[0];
  let draw = rng() * NODE_ARCHETYPES.reduce((sum, node) => sum + node.weight, 0);
  return NODE_ARCHETYPES.find(node => (draw -= node.weight) < 0) || NODE_ARCHETYPES.at(-1);
}

export const routeEntry = run => run.pending ? {
  wave: run.wave,
  scenarioId: run.scenarioState?.id || "urban",
  archetype: run.pending.nodeArchetype || run.pending.kind || run.pending.type,
  kind: run.pending.kind || run.pending.type,
  teamName: run.pending.teamName || null,
  eventId: run.pending.eventId || null,
} : null;
