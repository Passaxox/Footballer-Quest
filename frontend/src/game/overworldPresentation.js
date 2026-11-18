import { actForWave, edgesFrom, findNode, bossDef } from "./campaign";
import { currentActMap, selectableOverworldNode } from "./overworld";
import { scenarioPool } from "./scenarios";
import { resolveVersion } from "./catalog";

export const ROW_GAP = 116;
export const MAP_TOP = 150;
const laneX = (lane) => 18 + lane * 32;

export const mapHeight = (map) => MAP_TOP + (map.act.toWave - map.act.fromWave) * ROW_GAP + 120;
export const nodePosition = (node) => ({ x: laneX(node.lane) + node.jitter * 0.4, y: MAP_TOP + node.row * ROW_GAP });

const hash = (s) => [...s].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
const asPortrait = (v) => v && { uid: v.versionId, name: v.displayName, element: v.element, versionId: v.versionId, baseId: v.legacyRosterId || v.versionId, status: {} };

// Visual hint only: a deterministic face from the location pool, never the generated opponent.
export const nodePortrait = (node) => {
  if (node.type === "boss") return asPortrait(resolveVersion(bossDef(node.actId, node.bossId).leader));
  if (node.type === "rival") return asPortrait(resolveVersion(actForWave(node.wave).rival.pool[0]));
  if (node.type !== "battle") return null;
  const pool = scenarioPool(node.locationId, node.wave, 4);
  return pool.length ? asPortrait(pool[hash(node.nodeId) % pool.length].version) : null;
};

export function nodeState(run, node) {
  const ow = run.overworld;
  if (ow.selectedNodeId === node.nodeId) return "current";
  if (ow.path.includes(node.nodeId)) return "completed";
  if (selectableOverworldNode(run, node.nodeId)) return "available";
  if (node.wave < run.wave) return "skipped";
  return "locked";
}

export const edgeState = (run, from, to) => {
  const ow = run.overworld;
  if (ow.path.includes(from.nodeId) && (ow.path.includes(to.nodeId) || ow.selectedNodeId === to.nodeId)) return "done";
  if (ow.path.at(-1) === from.nodeId && selectableOverworldNode(run, to.nodeId)) return "open";
  return "idle";
};

export const allEdges = (map) => map.nodes.flatMap((n) => edgesFrom(map, n).map((to) => [n, to]));

export const markerNode = (run, map) => findNode(run.overworld.contentSeed, run.overworld.selectedNodeId)
  || map.nodes.find((n) => n.nodeId === run.overworld.path.at(-1)) || null;

export const actMapFor = currentActMap;
