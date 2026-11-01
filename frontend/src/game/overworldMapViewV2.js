// P3a-S2: pure view-model for the district map. Reads the S1 layout and the run's
// public route state; never touches graph generation, hidden hooks or persistence.
export const frameForWave = (layout, wave) =>
  layout.frames.find(frame => wave >= frame.fromWave && wave <= frame.toWave) || layout.frames.at(-1);

/**
 * Returns the frame to show plus a state for every node and edge:
 * completed | active | reachable | discarded | future.
 * `reachable` is only ever derived from the caller-supplied selectable node ids.
 */
export function deriveMapStatesV2(layout, run, selectableIds) {
  const { path, completedWave, selectedNodeId } = run.overworld;
  const onPath = new Set(path), reachable = new Set(selectableIds);
  const last = path.at(-1) ?? null;
  const nodeState = new Map(), edgeState = new Map();
  for (const node of layout.nodes) {
    let state = "future";
    if (onPath.has(node.nodeId)) state = "completed";
    else if (node.nodeId === selectedNodeId) state = "active";
    else if (reachable.has(node.nodeId)) state = "reachable";
    else if (node.wave <= completedWave || (selectedNodeId && node.wave === completedWave + 1)) state = "discarded";
    nodeState.set(node.nodeId, state);
  }
  const waves = new Map(layout.nodes.map(node => [node.nodeId, node.wave]));
  for (const edge of layout.edges) {
    const from = waves.get(edge.fromId);
    let state = "future";
    if (from <= completedWave) {
      if (onPath.has(edge.fromId) && onPath.has(edge.toId)) state = "completed";
      else if (edge.fromId === last && edge.toId === selectedNodeId) state = "active";
      else if (edge.fromId === last && reachable.has(edge.toId)) state = "reachable";
      else state = "discarded";
    }
    edgeState.set(edge.edgeId, state);
  }
  return {
    currentFrameId: frameForWave(layout, Math.min(run.wave, layout.frames.at(-1).toWave)).frameId,
    nodeState, edgeState, caravanNodeId: last,
  };
}
