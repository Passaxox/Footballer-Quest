// P3a-S2b: pure presentation projection of an already-generated V2 graph onto ONE
// vertical world (W1 at the top, W50 at the bottom). It never generates content, touches
// seeds/RNG, reads run state or persists anything. Roads come exclusively from node.next.
export const VERTICAL_MAP_GEOMETRY = Object.freeze({
  width: 300, waveSpacing: 115, topPad: 80, bottomPad: 90,
  nodeRadius: 30, bossRadius: 38, wavesPerSegment: 10,
});
// Lane slots by layer width, so a 1/2/3-node layer is centred and forks stay legible at 320px.
const SLOTS = Object.freeze({ 1: [150], 2: [95, 205], 3: [60, 150, 240] });
const compareId = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const waveY = wave => VERTICAL_MAP_GEOMETRY.topPad + (wave - 1) * VERTICAL_MAP_GEOMETRY.waveSpacing;

/** Returns JSON-safe { geometry, width, height, segments, nodes, edges }. */
export function createVerticalMapLayoutV2(graph) {
  const geometry = VERTICAL_MAP_GEOMETRY;
  if (graph?.revision !== 2 || !Number.isInteger(graph.finalWave) || graph.finalWave < 10
      || graph.finalWave % 10 !== 0 || !Array.isArray(graph.nodes)) {
    throw new TypeError("Expected a generated V2 graph with complete ten-wave segments.");
  }
  const sorted = [...graph.nodes].sort((a, b) => a.wave - b.wave || a.lane - b.lane || compareId(a.nodeId, b.nodeId));
  const layers = new Map(), ids = new Set();
  for (const node of sorted) {
    if (typeof node.nodeId !== "string" || !node.nodeId || ids.has(node.nodeId)
        || !Number.isInteger(node.wave) || node.wave < 1 || node.wave > graph.finalWave || !Array.isArray(node.next)) {
      throw new TypeError("Invalid V2 presentation node.");
    }
    ids.add(node.nodeId);
    if (!layers.has(node.wave)) layers.set(node.wave, []);
    layers.get(node.wave).push(node);
  }
  if (layers.size !== graph.finalWave || [...layers.values()].some(layer => layer.length > 3)) {
    throw new TypeError("Expected one to three nodes at every wave.");
  }
  const nodes = sorted.map(node => {
    const layer = layers.get(node.wave), rank = layer.indexOf(node);
    return {
      nodeId: node.nodeId, wave: node.wave, segment: Math.ceil(node.wave / geometry.wavesPerSegment),
      slot: rank, slots: layer.length, isBoss: !!node.boss,
      x: SLOTS[layer.length][rank], y: waveY(node.wave),
    };
  });
  const byId = new Map(nodes.map(node => [node.nodeId, node]));
  const edges = [];
  for (const source of sorted) {
    if (new Set(source.next).size !== source.next.length) throw new TypeError("Duplicate V2 graph arc.");
    for (const targetId of [...source.next].sort(compareId)) {
      const from = byId.get(source.nodeId), to = byId.get(targetId);
      if (!to || to.wave !== from.wave + 1) throw new TypeError("Expected an existing V2 arc to the next wave.");
      edges.push({
        edgeId: JSON.stringify([from.nodeId, to.nodeId]), fromId: from.nodeId, toId: to.nodeId,
        crossesSegment: from.segment !== to.segment,
        points: [{ x: from.x, y: from.y }, { x: to.x, y: to.y }],
      });
    }
  }
  const segments = Array.from({ length: graph.finalWave / geometry.wavesPerSegment }, (_, index) => ({
    segment: index + 1, fromWave: index * 10 + 1, toWave: (index + 1) * 10,
  }));
  return {
    revision: 2, geometry: { ...geometry }, width: geometry.width,
    height: waveY(graph.finalWave) + geometry.bottomPad, segments, nodes, edges,
  };
}

export const segmentForWave = (layout, wave) =>
  Math.min(layout.segments.length, Math.max(1, Math.ceil(wave / layout.geometry.wavesPerSegment)));

/**
 * Visible slice of the world for a segment: its ten waves plus one wave of context on each
 * side, so the W10→W11 roads and the destinations beyond a boss are always drawn in full.
 */
export function segmentWindowV2(layout, segment) {
  const info = layout.segments[segment - 1];
  if (!info) throw new RangeError("Unknown segment.");
  const fromWave = Math.max(1, info.fromWave - 1), toWave = Math.min(layout.segments.at(-1).toWave, info.toWave + 1);
  const top = fromWave === 1 ? 0 : waveY(fromWave) - 60;
  const bottom = toWave === layout.segments.at(-1).toWave ? layout.height : waveY(toWave) + 60;
  return { segment, ...info, windowFromWave: fromWave, windowToWave: toWave, top, bottom, height: bottom - top };
}

// The Caravan marker sits just above its node; the view focuses on the top of the marker.
export const CARAVAN_LIFT = 68;
/** Y of the point the view should bring into focus: the Caravan marker, else the first layer. */
export function focusYV2(layout, caravanNodeId, wave) {
  const node = caravanNodeId && layout.nodes.find(n => n.nodeId === caravanNodeId);
  return (node ? node.y : waveY(Math.max(1, Math.min(wave, layout.segments.at(-1).toWave)))) - CARAVAN_LIFT;
}

/**
 * scrollTop that places world-y `y` at `anchor` (0..1) of the viewport, clamped to the
 * scrollable range. Pure so it is testable without layout. Manual scrolling is never blocked.
 */
export function scrollTopForV2({ y, top, bottom, contentHeight, viewportHeight, anchor = 0.3 }) {
  const ratio = bottom > top ? (y - top) / (bottom - top) : 0;
  const target = ratio * contentHeight - viewportHeight * anchor;
  return Math.round(Math.max(0, Math.min(Math.max(0, contentHeight - viewportHeight), target)));
}
