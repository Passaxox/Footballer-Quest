// Small authored area. No random draws on render/load and no catalog/save schema migration.
export const OVERWORLD_AREA = {
  macroScenarioId: "football-frontier", macroScenarioName: "Football Frontier",
  areaId: "road-to-royal", displayName: "Verso la Royal", fromWave: 1, toWave: 10,
};
export const OVERWORLD_ROUTES = [
  { id: "riverside", name: "Lungofiume", hint: "Recluta prima, allenati dopo", locationId: "urban", environmentId: "riverside",
    types: ["battle", "recruit", "battle", "shop", "battle", "event", "battle", "training", "battle"] },
  { id: "grounds", name: "Campi", hint: "Allenati prima, recluta dopo", locationId: "raimon-training", environmentId: "training",
    types: ["battle", "training", "battle", "event", "battle", "recruit", "battle", "shop", "battle"] },
  { id: "town", name: "Quartiere", hint: "Visita subito il negozio", locationId: "urban", environmentId: "metropolitan",
    types: ["battle", "shop", "battle", "training", "battle", "recruit", "battle", "event", "battle"] },
];
export const OVERWORLD_NODE_LABELS = {
  battle: "Incontro", recruit: "Recluta", shop: "Negozio", training: "Allenati", event: "Evento",
};
export const initialOverworld = () => ({
  contentSeed: Math.floor(Math.random() * 4294967296),
  revision: 1, macroScenarioId: OVERWORLD_AREA.macroScenarioId, areaId: OVERWORLD_AREA.areaId,
  routeId: null, completedWave: 0, selectedNodeId: null,
});
export const hasOverworld = run => run?.overworld?.revision === 1
  && run.overworld.areaId === OVERWORLD_AREA.areaId && run.wave >= 1 && run.wave <= 10;
export const routeNodes = route => route.types.map((type, index) => ({
  nodeId: `${OVERWORLD_AREA.areaId}:${route.id}:${index + 1}`, routeId: route.id, wave: index + 1, type,
  macroScenarioId: OVERWORLD_AREA.macroScenarioId, areaId: OVERWORLD_AREA.areaId,
  locationId: index >= 7 ? "royal-academy" : route.locationId,
  environmentId: index >= 7 ? "academy" : route.environmentId,
}));
export const ROYAL_CHECKPOINT = {
  nodeId: `${OVERWORLD_AREA.areaId}:royal:10`, routeId: null, wave: 10, type: "battle",
  macroScenarioId: OVERWORLD_AREA.macroScenarioId, areaId: OVERWORLD_AREA.areaId, locationId: "royal-academy",
  environmentId: "academy",
};
export const OVERWORLD_NODES = [...OVERWORLD_ROUTES.flatMap(routeNodes), ROYAL_CHECKPOINT];
// Per-place stream: previews/rendering never consume it. Existing pending content wins.
export function nodeRandom(seed, nodeId) {
  let state = Number(seed) >>> 0;
  for (const char of nodeId) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
}
export function selectableOverworldNode(run, nodeId) {
  if (!hasOverworld(run) || run.pending || run.overworld.selectedNodeId
    || run.overworld.completedWave !== run.wave - 1) return null;
  const node = OVERWORLD_NODES.find(n => n.nodeId === nodeId && n.wave === run.wave);
  if (!node) return null;
  const routeId = run.overworld.routeId;
  if (routeId === null) return run.wave === 1 ? node : null;
  if (!OVERWORLD_ROUTES.some(r => r.id === routeId)) return null;
  return node.routeId === routeId || node === ROYAL_CHECKPOINT ? node : null;
}
// Called only with terminal resolution, atomically with wave advance and pending=null.
export function completeOverworldNode(run) {
  if (!hasOverworld(run)) return run;
  const node = OVERWORLD_NODES.find(n => n.nodeId === run.overworld.selectedNodeId && n.wave === run.wave);
  if (!node || run.overworld.completedWave !== run.wave - 1
    || (node.routeId !== run.overworld.routeId && node !== ROYAL_CHECKPOINT)) {
    throw new Error("Tappa della mappa non valida.");
  }
  return { ...run, overworld: { ...run.overworld, completedWave: run.wave, selectedNodeId: null } };
}
