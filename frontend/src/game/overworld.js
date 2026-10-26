// Small authored area. No random draws on render/load and no catalog/save schema migration.
export const OVERWORLD_AREA = {
  macroScenarioId: "football-frontier", macroScenarioName: "Football Frontier",
  areaId: "road-to-royal", displayName: "Verso la Royal", fromWave: 1, toWave: 10,
};
export const OVERWORLD_ROUTES = [
  { id: "riverside", name: "Lungofiume", hint: "Recluta prima, allenati dopo", locationId: "urban",
    types: ["battle", "recruit", "battle", "shop", "battle", "event", "battle", "training", "battle"] },
  { id: "grounds", name: "Campi", hint: "Allenati prima, recluta dopo", locationId: "raimon-training",
    types: ["battle", "training", "battle", "event", "battle", "recruit", "battle", "shop", "battle"] },
  { id: "town", name: "Quartiere", hint: "Visita subito il negozio", locationId: "urban",
    types: ["battle", "shop", "battle", "training", "battle", "recruit", "battle", "event", "battle"] },
];
export const OVERWORLD_NODE_LABELS = {
  battle: "Incontro", recruit: "Recluta", shop: "Negozio", training: "Allenati", event: "Evento",
};
export const initialOverworld = () => ({
  revision: 1, macroScenarioId: OVERWORLD_AREA.macroScenarioId, areaId: OVERWORLD_AREA.areaId,
  routeId: null, completedWave: 0, selectedNodeId: null,
});
export const hasOverworld = run => run?.overworld?.revision === 1
  && run.overworld.areaId === OVERWORLD_AREA.areaId && run.wave >= 1 && run.wave <= 10;
export const routeNodes = route => route.types.map((type, index) => ({
  nodeId: `${OVERWORLD_AREA.areaId}:${route.id}:${index + 1}`, routeId: route.id, wave: index + 1, type,
  macroScenarioId: OVERWORLD_AREA.macroScenarioId, areaId: OVERWORLD_AREA.areaId,
  locationId: index >= 7 ? "royal-academy" : route.locationId,
}));
export const ROYAL_CHECKPOINT = {
  nodeId: `${OVERWORLD_AREA.areaId}:royal:10`, routeId: null, wave: 10, type: "battle",
  macroScenarioId: OVERWORLD_AREA.macroScenarioId, areaId: OVERWORLD_AREA.areaId, locationId: "royal-academy",
};
export const OVERWORLD_NODES = [...OVERWORLD_ROUTES.flatMap(routeNodes), ROYAL_CHECKPOINT];
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
