// P3a-S1: presentation only. Consume an already-generated V2 graph; never generate
// encounters, alter graph topology, read run state, or persist these coordinates.
// Units are logical map units. Each frame is a translated viewport on ONE world.
// Roads are polylines: edges are unique logical arcs; fragments are their clipped
// local projections, not additional arcs. A renderer must draw only these roads.
export const DISTRICT_MAP_GEOMETRY = Object.freeze({
  frameWidth: 1000, frameHeight: 700, wavesPerFrame: 5, wavesPerSegment: 10,
  waveSpacing: 200, laneSpacing: 84,
});

// An angled district route, repeated per segment. Wave order always advances in X;
// lane offsets spread alternatives across the road without sorting by gameplay type.
const WAVE_Y = Object.freeze([480, 460, 360, 240, 220, 240, 340, 440, 460, 420]);
const compareId = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const frameId = index => `district:${Math.floor(index / 2) + 1}:${index % 2 ? "B" : "A"}`;
const frameIndex = wave => Math.floor((wave - 1) / 5);
const localPoint = (point, frame) => ({ x: point.x - frame.origin.x, y: point.y - frame.origin.y });

/**
 * Returns JSON-safe { frames, nodes, edges } with no references to graph objects.
 * Frame A covers W1-5, B W6-10, then A W11-15, etc. This deliberately includes
 * each boss: graph.segments[].toWave describes pre-boss waves and is NOT a frame bound.
 * Each edge carries world points and one/two local fragments. For a crossing,
 * transition.point is the identical world seam at exit X=1000 / entry X=0.
 * Boss nodes use the same geometry as other singleton layers; W50 has no road out.
 */
export function createOverworldMapLayoutV2(graph) {
  if (graph?.revision !== 2 || !Number.isInteger(graph.finalWave) || graph.finalWave < 10
      || graph.finalWave % 10 !== 0 || !Array.isArray(graph.nodes)) {
    throw new TypeError("Expected a generated V2 graph with complete ten-wave segments.");
  }
  const geometry = DISTRICT_MAP_GEOMETRY;
  const sourceNodes = [...graph.nodes].sort((a, b) => a.wave - b.wave || a.lane - b.lane || compareId(a.nodeId, b.nodeId));
  const layers = new Map();
  const ids = new Set();
  for (const node of sourceNodes) {
    if (typeof node.nodeId !== "string" || !node.nodeId || ids.has(node.nodeId)
        || !Number.isInteger(node.wave) || node.wave < 1 || node.wave > graph.finalWave
        || !Number.isInteger(node.lane) || node.lane < 0 || node.lane > 2 || !Array.isArray(node.next)) {
      throw new TypeError("Invalid V2 presentation node.");
    }
    ids.add(node.nodeId);
    if (!layers.has(node.wave)) layers.set(node.wave, []);
    layers.get(node.wave).push(node);
  }
  if (layers.size !== graph.finalWave || [...layers.values()].some(layer => layer.length > 3)) {
    throw new TypeError("Expected one to three nodes at every wave.");
  }
  const frames = Array.from({ length: graph.finalWave / geometry.wavesPerFrame }, (_, index) => ({
    frameId: frameId(index), segment: Math.floor(index / 2) + 1, part: index % 2 ? "B" : "A",
    fromWave: index * 5 + 1, toWave: (index + 1) * 5,
    origin: { x: index * geometry.frameWidth, y: 0 },
    width: geometry.frameWidth, height: geometry.frameHeight, nodeIds: [], edgeIds: [],
  }));
  const nodes = sourceNodes.map(node => {
    const frame = frames[frameIndex(node.wave)], layer = layers.get(node.wave);
    const rank = layer.indexOf(node);
    const world = {
      x: (node.wave - 0.5) * geometry.waveSpacing,
      y: WAVE_Y[(node.wave - 1) % 10] + (rank - (layer.length - 1) / 2) * geometry.laneSpacing,
    };
    frame.nodeIds.push(node.nodeId);
    return {
      nodeId: node.nodeId, wave: node.wave, segment: frame.segment, frameId: frame.frameId,
      frameWave: (node.wave - 1) % 5 + 1, isBoss: !!node.boss,
      world, local: localPoint(world, frame),
    };
  });
  const byId = new Map(nodes.map(node => [node.nodeId, node]));
  const edges = [];
  for (const source of sourceNodes) {
    if (new Set(source.next).size !== source.next.length) throw new TypeError("Duplicate V2 graph arc.");
    for (const targetId of [...source.next].sort(compareId)) {
      const from = byId.get(source.nodeId), to = byId.get(targetId);
      if (!to || to.wave !== from.wave + 1) throw new TypeError("Expected an existing V2 arc to the next wave.");
      const fromFrame = frames[frameIndex(from.wave)], toFrame = frames[frameIndex(to.wave)];
      const edgeId = JSON.stringify([from.nodeId, to.nodeId]);
      const edge = {
        edgeId, fromId: from.nodeId, toId: to.nodeId,
        fromFrameId: from.frameId, toFrameId: to.frameId,
        points: [{ ...from.world }, { ...to.world }], transition: null, fragments: [],
      };
      fromFrame.edgeIds.push(edgeId);
      if (fromFrame === toFrame) {
        edge.fragments.push({ frameId: from.frameId, points: [localPoint(from.world, fromFrame), localPoint(to.world, fromFrame)] });
      } else {
        const x = toFrame.origin.x;
        const ratio = (x - from.world.x) / (to.world.x - from.world.x);
        const seam = { x, y: from.world.y + ratio * (to.world.y - from.world.y) };
        edge.transition = { kind: from.segment === to.segment ? "frame" : "segment", point: seam };
        edge.fragments.push(
          { frameId: from.frameId, points: [localPoint(from.world, fromFrame), localPoint(seam, fromFrame)] },
          { frameId: to.frameId, points: [localPoint(seam, toFrame), localPoint(to.world, toFrame)] },
        );
        toFrame.edgeIds.push(edgeId);
      }
      edges.push(edge);
    }
  }
  return { revision: 1, geometry: { ...geometry }, frames, nodes, edges };
}
