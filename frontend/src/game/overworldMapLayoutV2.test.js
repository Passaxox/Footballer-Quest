import { generateOverworldGraphV2 } from "./overworldGraphV2";
import { createOverworldMapLayoutV2, DISTRICT_MAP_GEOMETRY } from "./overworldMapLayoutV2";

const clone = value => JSON.parse(JSON.stringify(value));
const graphs = [0, 1, 42, 2147483647, 2147483648, 4294967295].map(seed => generateOverworldGraphV2(seed));
const pair = (from, to) => JSON.stringify([from, to]);
const toWorld = (point, frame) => ({ x: point.x + frame.origin.x, y: point.y + frame.origin.y });

describe.each(graphs)("district presentation, seed $seed", graph => {
  test("coordinates are deterministic, JSON-safe and independent of array order or ambient randomness", () => {
    const reordered = clone(graph);
    reordered.nodes.reverse().forEach(node => node.next.reverse());
    const random = jest.spyOn(Math, "random").mockImplementation(() => { throw new Error("ambient RNG"); });
    const clock = jest.spyOn(Date, "now").mockImplementation(() => { throw new Error("clock"); });
    try {
      const first = createOverworldMapLayoutV2(graph);
      expect(createOverworldMapLayoutV2(graph)).toEqual(first);
      expect(createOverworldMapLayoutV2(clone(graph))).toEqual(first);
      expect(createOverworldMapLayoutV2(reordered)).toEqual(first);
      expect(clone(first)).toEqual(first);
    } finally { random.mockRestore(); clock.mockRestore(); }
  });

  test("every source next arc has exactly one presentation edge, with original endpoints", () => {
    const layout = createOverworldMapLayoutV2(graph);
    const expected = graph.nodes.flatMap(node => node.next.map(id => pair(node.nodeId, id))).sort();
    expect(layout.edges.map(edge => pair(edge.fromId, edge.toId)).sort()).toEqual(expected);
    expect(new Set(layout.edges.map(edge => edge.edgeId)).size).toBe(expected.length);
    const byId = new Map(layout.nodes.map(node => [node.nodeId, node]));
    for (const edge of layout.edges) {
      const from = byId.get(edge.fromId), to = byId.get(edge.toId);
      expect(to.wave).toBe(from.wave + 1);
      expect(to.world.x).toBeGreaterThan(from.world.x);
      expect(edge.points).toEqual([from.world, to.world]);
    }
  });

  test("ten frames partition all nodes into five waves each, including bosses", () => {
    const { frames, nodes } = createOverworldMapLayoutV2(graph);
    expect(frames).toHaveLength(10);
    expect(frames.flatMap(frame => frame.nodeIds).sort()).toEqual(graph.nodes.map(node => node.nodeId).sort());
    frames.forEach((frame, index) => {
      const waveStart = index * 5 + 1;
      expect([frame.fromWave, frame.toWave]).toEqual([waveStart, waveStart + 4]);
      expect(frame.segment).toBe(Math.floor(index / 2) + 1);
      expect(frame.part).toBe(index % 2 ? "B" : "A");
      const localNodes = nodes.filter(node => node.frameId === frame.frameId);
      expect([...new Set(localNodes.map(node => node.wave))]).toEqual(Array.from({ length: 5 }, (_, i) => waveStart + i));
      for (const node of localNodes) {
        expect(node.frameWave).toBe(node.wave - waveStart + 1);
        expect(toWorld(node.local, frame)).toEqual(node.world);
        expect(node.local.x).toBeGreaterThan(0);
        expect(node.local.x).toBeLessThan(frame.width);
        expect(node.local.y).toBeGreaterThan(0);
        expect(node.local.y).toBeLessThan(frame.height);
      }
      // Alternatives never occupy the same location; the road changes height.
      expect(new Set(localNodes.map(node => pair(node.local.x, node.local.y))).size).toBe(localNodes.length);
      expect(new Set(localNodes.map(node => node.local.y)).size).toBeGreaterThan(1);
    });
    expect(nodes.find(node => node.wave === 25).frameId).toBe("district:3:A");
  });

  test("roads meet at identical world seams across 5/6 and every later frame/segment boundary", () => {
    const layout = createOverworldMapLayoutV2(graph);
    const frameById = new Map(layout.frames.map(frame => [frame.frameId, frame]));
    const nodeById = new Map(layout.nodes.map(node => [node.nodeId, node]));
    const boundaryWaves = [];
    for (const edge of layout.edges) {
      const from = nodeById.get(edge.fromId), to = nodeById.get(edge.toId);
      const crosses = from.frameId !== to.frameId;
      expect(edge.fragments).toHaveLength(crosses ? 2 : 1);
      const projected = edge.fragments.map(fragment => {
        const frame = frameById.get(fragment.frameId);
        for (const point of fragment.points) {
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.x).toBeLessThanOrEqual(frame.width);
          expect(point.y).toBeGreaterThanOrEqual(0);
          expect(point.y).toBeLessThanOrEqual(frame.height);
        }
        return fragment.points.map(point => toWorld(point, frame));
      });
      expect(projected[0][0]).toEqual(from.world);
      expect(projected[projected.length - 1][1]).toEqual(to.world);
      if (crosses) {
        boundaryWaves.push(from.wave);
        expect(edge.transition.kind).toBe(from.wave % 10 === 0 ? "segment" : "frame");
        expect(projected[0][1]).toEqual(projected[1][0]);
        expect(projected[0][1]).toEqual(edge.transition.point);
        expect(edge.fragments[0].points[1].x).toBe(DISTRICT_MAP_GEOMETRY.frameWidth);
        expect(edge.fragments[1].points[0].x).toBe(0);
        // Independent midpoint oracle: frames divide adjacent waves halfway.
        expect(edge.transition.point).toEqual({ x: (from.world.x + to.world.x) / 2, y: (from.world.y + to.world.y) / 2 });
      } else {
        expect(edge.transition).toBeNull();
        expect(projected[0]).toEqual(edge.points);
      }
    }
    expect([...new Set(boundaryWaves)]).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45]);
    for (const frame of layout.frames) {
      const visibleEdges = layout.edges.filter(edge => edge.fragments.some(fragment => fragment.frameId === frame.frameId));
      expect([...frame.edgeIds].sort()).toEqual(visibleEdges.map(edge => edge.edgeId).sort());
      expect(new Set(frame.edgeIds).size).toBe(frame.edgeIds.length);
    }
  });

  test("bosses remain single shared nodes in B, W50 is terminal, and W25 remains ordinary", () => {
    const { nodes, edges } = createOverworldMapLayoutV2(graph);
    expect(nodes.filter(node => node.isBoss).map(node => node.wave)).toEqual([10, 20, 30, 40, 50]);
    for (const wave of [10, 20, 30, 40, 50]) {
      const layer = nodes.filter(node => node.wave === wave);
      expect(layer).toHaveLength(1);
      const boss = layer[0], original = graph.nodes.find(node => node.nodeId === boss.nodeId);
      expect(boss.frameId).toBe(`district:${wave / 10}:B`);
      expect(boss.frameWave).toBe(5);
      expect(boss.local.x).toBe(900);
      expect(edges.filter(edge => edge.toId === boss.nodeId).map(edge => edge.fromId).sort())
        .toEqual(graph.nodes.filter(node => node.next.includes(boss.nodeId)).map(node => node.nodeId).sort());
      const outgoing = edges.filter(edge => edge.fromId === boss.nodeId);
      expect(outgoing.map(edge => edge.toId).sort()).toEqual([...original.next].sort());
      if (wave === 50) expect(outgoing).toHaveLength(0);
      else expect(outgoing.every(edge => edge.transition.kind === "segment")).toBe(true);
    }
    expect(nodes.filter(node => node.wave === 25)).toHaveLength(1);
    expect(nodes.find(node => node.wave === 25).isBoss).toBe(false);
  });

  test("frozen and mutable source graphs remain unchanged with no shared mutable output", () => {
    const before = JSON.stringify(graph);
    createOverworldMapLayoutV2(graph);
    expect(JSON.stringify(graph)).toBe(before);
    const mutable = clone(graph), layout = createOverworldMapLayoutV2(mutable);
    layout.nodes[0].world.x = -1;
    layout.frames[0].nodeIds.length = 0;
    layout.edges[0].points[0].y = -1;
    layout.geometry.frameWidth = -1;
    expect(JSON.stringify(mutable)).toBe(before);
    expect(DISTRICT_MAP_GEOMETRY.frameWidth).toBe(1000);
  });
});

test("invalid, dangling, duplicate or wave-skipping arcs fail explicitly rather than inventing roads", () => {
  expect(() => createOverworldMapLayoutV2(null)).toThrow(TypeError);
  for (const next of [["missing"], [graphs[0].nodes.find(node => node.wave === 3).nodeId],
    [graphs[0].nodes[0].next[0], graphs[0].nodes[0].next[0]]]) {
    const invalid = clone(graphs[0]);
    invalid.nodes[0].next = next;
    expect(() => createOverworldMapLayoutV2(invalid)).toThrow(TypeError);
  }
});
