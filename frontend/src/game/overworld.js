import { ACTS, actForWave, actMap, edgesFrom, findNode, seededRandom } from "./campaign";
import { FINAL_WAVE } from "./data";

export const OVERWORLD_NODE_LABELS = {
  battle: "Incontro", recruit: "Scouting", shop: "Negozio", training: "Allenamento", event: "Evento",
  rival: "Rivale", anomaly: "Anomalia temporale", boss: "Boss",
};
export const nodeRandom = seededRandom;

export const initialOverworld = () => ({
  revision: 2, contentSeed: Math.floor(Math.random() * 4294967296),
  path: [], completedWave: 0, selectedNodeId: null, introSeen: 0, journey: [], unlocks: [], decisions: {},
});

// Old saves (single Royal map or classic flow) continue from their current wave on the campaign map.
export const migrateOverworld = (run) => {
  const ow = run.overworld;
  if (ow?.revision === 2) return ow;
  return { ...initialOverworld(), contentSeed: ow?.contentSeed ?? (Number(run.startedAt) >>> 0),
    completedWave: run.wave - 1, introSeen: actForWave(run.wave).index - (run.pending ? 0 : 1) };
};

export const hasOverworld = (run) => run?.overworld?.revision === 2 && run.wave >= 1 && run.wave <= FINAL_WAVE;
export const currentActMap = (run) => actMap(run.overworld.contentSeed, actForWave(run.wave));

export function selectableOverworldNode(run, nodeId) {
  if (!hasOverworld(run) || run.pending || run.overworld.selectedNodeId || run.overworld.completedWave !== run.wave - 1) return null;
  const map = currentActMap(run);
  const node = map.nodes.find((n) => n.nodeId === nodeId && n.wave === run.wave);
  if (!node) return null;
  const last = findNode(run.overworld.contentSeed, run.overworld.path.at(-1));
  // New act (or migrated save without a path here): every tile of the current row is open.
  if (!last || last.actId !== map.act.id) return node;
  return edgesFrom(map, last).some((n) => n.nodeId === nodeId) ? node : null;
}

// Called only with terminal resolution, atomically with wave advance and pending=null.
export function completeOverworldNode(run) {
  if (!hasOverworld(run)) return run;
  const ow = run.overworld;
  // Legacy pending content (pre-campaign saves) has no tile: advance without a path entry.
  if (!ow.selectedNodeId && ow.completedWave === run.wave - 1) return { ...run, overworld: { ...ow, completedWave: run.wave } };
  const node = findNode(ow.contentSeed, ow.selectedNodeId);
  if (!node || node.wave !== run.wave || ow.completedWave !== run.wave - 1) throw new Error("Tappa della mappa non valida.");
  const entry = { wave: node.wave, actId: node.actId, type: node.type, lane: node.laneName };
  return { ...run, overworld: { ...ow, completedWave: run.wave, selectedNodeId: null, path: [...ow.path, node.nodeId], journey: [...ow.journey, entry] } };
}

export const actsCleared = (run) => ACTS.filter((a) => (run.overworld?.completedWave ?? run.wave - 1) >= a.toWave).length;
