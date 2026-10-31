import { GRAPH_ALGORITHM, generateOverworldGraphV2, getGraphNode, startNodes, nextOptions, isValidLink } from "./overworldGraphV2";

// Persist only seed/version, the completed path (at most 50 IDs), and the current
// selection. Generated immutable graphs are a bounded, process-local cache.
export class OverworldSaveError extends Error {
  constructor(message) { super(message); this.name = "OverworldSaveError"; this.code = "OVERWORLD_SAVE_INCOMPATIBLE"; }
}
const reject = message => { throw new OverworldSaveError(message); };
const uint32 = n => Number.isInteger(n) && n >= 0 && n <= 0xffffffff;
export const hasOverworldV2 = run => run?.overworld?.revision === 2;
export function initialOverworldV2(seed, contentSeed = seed, algorithmVersion = GRAPH_ALGORITHM.version) {
  if (!uint32(seed) || !uint32(contentSeed)) reject("Seed V2 non valido.");
  if (algorithmVersion !== GRAPH_ALGORITHM.version) reject(`Versione algoritmo V2 non supportata: ${algorithmVersion}`);
  return { revision: 2, seed, contentSeed, algorithmVersion, completedWave: 0, transition: 0, path: [], selectedNodeId: null, result: null };
}
// O(1) checks for ordinary HP/XP/inventory normalization. No graph construction.
export function assertOverworldVersion(run) {
  const o = run?.overworld;
  if (!o || o.revision === 1) return;
  if (o.revision !== 2) reject(`Revisione Overworld non supportata: ${o.revision}`);
  if (o.algorithmVersion !== GRAPH_ALGORITHM.version) reject(`Versione algoritmo V2 non supportata: ${o.algorithmVersion}`);
  if (!Number.isSafeInteger(o.transition) || o.transition < 0 || !uint32(o.seed) || !uint32(o.contentSeed) || !Number.isInteger(o.completedWave)
      || o.completedWave < 0 || o.completedWave > 50 || !Array.isArray(o.path) || o.path.length !== o.completedWave
      || ![null, "win", "lose"].includes(o.result) || (o.selectedNodeId !== null && typeof o.selectedNodeId !== "string")
      || run.wave !== Math.min(50, o.completedWave + 1)) reject("Stato del percorso V2 non valido.");
  if ((o.completedWave === 50) !== (o.result === "win")) reject("Conclusione V2 non valida.");
  if (!!run.pending !== (o.selectedNodeId !== null)) reject("Selezione e pending V2 incoerenti.");
  if (run.pending && (run.pending.overworldNodeId !== o.selectedNodeId
      || !Number.isSafeInteger(run.pending.actionStep) || run.pending.actionStep < 0)) reject("Identità pending V2 non valida.");
}
const graphs = new Map();
export function graphForRunV2(run) {
  assertOverworldVersion(run);
  if (!hasOverworldV2(run)) reject("La run non è V2.");
  const { seed, algorithmVersion } = run.overworld, key = `${algorithmVersion}:${seed}`;
  if (!graphs.has(key)) {
    const graph = generateOverworldGraphV2(seed, { algorithmVersion });
    if (graphs.size >= 8) graphs.delete(graphs.keys().next().value);
    graphs.set(key, graph);
  }
  return graphs.get(key);
}
// Full route validation belongs to hydration and domain transitions, not normalizeRun.
export function hydrateOverworldV2(run) {
  assertOverworldVersion(run);
  if (!hasOverworldV2(run)) return run;
  const graph = graphForRunV2(run), o = run.overworld;
  let previous = null;
  for (let i = 0; i < o.path.length; i++) {
    const node = getGraphNode(graph, o.path[i]);
    if (!node || node.wave !== i + 1 || (previous && !isValidLink(graph, previous, node.nodeId))) reject("Percorso V2 salvato non raggiungibile.");
    previous = node.nodeId;
  }
  if (o.selectedNodeId !== null) {
    const node = getGraphNode(graph, o.selectedNodeId), p = run.pending;
    if (!node || node.wave !== run.wave || (previous && !isValidLink(graph, previous, node.nodeId))) reject("Selezione V2 non raggiungibile.");
    const allowed = { battle: ["battle", "recruit", "reward"], recruit: ["recruit", "battle", "reward"], event: ["event", "battle", "recruit", "reward"], shop: ["shop"], training: ["training"] };
    if (!allowed[node.type].includes(p.type) || p.scenarioState?.id !== node.locationId
        || run.scenarioState?.id !== node.locationId || p.environmentId !== node.environmentId) reject("Contenuto V2 incoerente con la tappa.");
    if (p.type === "battle" && (!Array.isArray(p.enemies) || !p.enemies.length)) reject("Battaglia V2 senza avversari.");
    if (p.type === "reward" && !Array.isArray(p.context?.rewards)) reject("Ricompense V2 non valide.");
  }
  return run;
}
export function selectableNodesV2(run) {
  hydrateOverworldV2(run);
  if (run.pending || run.overworld.result) return [];
  const graph = graphForRunV2(run), previous = run.overworld.path.at(-1);
  return previous ? nextOptions(graph, previous) : startNodes(graph);
}
export function actionTokenV2(run) {
  assertOverworldVersion(run);
  return hasOverworldV2(run) && run.pending && !run.overworld.result
    ? { nodeId: run.pending.overworldNodeId, step: run.pending.actionStep } : null;
}
// Optimistic command token for the single-writer local save boundary.
export const runTokenV2 = run => ({ startedAt: run.startedAt, seed: run.overworld.seed, contentSeed: run.overworld.contentSeed, transition: run.overworld.transition });
