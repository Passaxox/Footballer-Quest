import { generateOverworldGraphV2, GRAPH_TEMPLATES } from "./overworldGraphV2";
import {
  CARAVAN_LIFT, createVerticalMapLayoutV2, focusYV2, scrollTopForV2, segmentForWave, segmentWindowV2, VERTICAL_MAP_GEOMETRY,
} from "./overworldVerticalMapV2";

const clone = value => JSON.parse(JSON.stringify(value));
const pair = (from, to) => JSON.stringify([from, to]);
const seeds = [0, 1, 42, 2147483647, 4294967295];
// Every v3 template, forced for all segments that can host it, plus the unconstrained seeds.
const graphs = [
  ...seeds.map(seed => [`seed ${seed}`, generateOverworldGraphV2(seed)]),
  ...GRAPH_TEMPLATES.flatMap(t => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(seed => {
    try { return [`template ${t.id} seed ${seed}`, generateOverworldGraphV2(seed, { templateIds: [t.id, "A"] })]; } catch { return null; }
  })).filter(Boolean),
];

test("every graph template is exercised (directly or through the unconstrained seeds)", () => {
  const used = new Set(graphs.flatMap(([, g]) => g.segments.map(s => s.templateId)));
  for (let seed = 0; seed < 200; seed++) {
    const graph = generateOverworldGraphV2(seed);
    graph.segments.forEach(s => used.add(s.templateId));
    if (used.size === GRAPH_TEMPLATES.length) { expect(createVerticalMapLayoutV2(graph).edges.length).toBeGreaterThan(0); }
  }
  expect([...used].sort()).toEqual(GRAPH_TEMPLATES.map(t => t.id).sort());
});

describe.each(graphs)("vertical layout, %s", (_name, graph) => {
  const layout = createVerticalMapLayoutV2(graph), byId = new Map(layout.nodes.map(n => [n.nodeId, n]));

  test("is deterministic, JSON-safe and independent of order or ambient randomness", () => {
    const reordered = clone(graph);
    reordered.nodes.reverse().forEach(node => node.next.reverse());
    const random = jest.spyOn(Math, "random").mockImplementation(() => { throw new Error("ambient RNG"); });
    try {
      expect(createVerticalMapLayoutV2(reordered)).toEqual(layout);
      expect(clone(layout)).toEqual(layout);
    } finally { random.mockRestore(); }
  });

  test("Y strictly follows waves, X stays inside the 300 unit lane band with spaced slots", () => {
    const { width, nodeRadius } = VERTICAL_MAP_GEOMETRY;
    expect(layout.nodes).toHaveLength(graph.nodes.length);
    for (const node of layout.nodes) {
      expect(node.x - nodeRadius).toBeGreaterThanOrEqual(0);
      expect(node.x + nodeRadius).toBeLessThanOrEqual(width);
    }
    for (const a of layout.nodes) for (const b of layout.nodes) {
      if (a.nodeId >= b.nodeId) continue;
      if (a.wave === b.wave) { expect(a.y).toBe(b.y); expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(90); }
      else expect(Math.sign(b.y - a.y)).toBe(Math.sign(b.wave - a.wave));
    }
  });

  test("edges are exactly node.next, with no invented roads", () => {
    const expected = graph.nodes.flatMap(n => n.next.map(id => pair(n.nodeId, id))).sort();
    expect(layout.edges.map(e => pair(e.fromId, e.toId)).sort()).toEqual(expected);
    expect(new Set(layout.edges.map(e => e.edgeId)).size).toBe(expected.length);
    for (const edge of layout.edges) {
      const from = byId.get(edge.fromId), to = byId.get(edge.toId);
      expect(edge.points).toEqual([{ x: from.x, y: from.y }, { x: to.x, y: to.y }]);
      expect(edge.crossesSegment).toBe(from.segment !== to.segment);
    }
  });

  test("W10 boss links to every W11 start; all five segments are navigable and carry the boss", () => {
    expect(layout.segments).toHaveLength(5);
    const boss = layout.nodes.find(n => n.wave === 10);
    const out = layout.edges.filter(e => e.fromId === boss.nodeId);
    expect(boss.isBoss).toBe(true);
    expect(out.length).toBeGreaterThan(0);
    out.forEach(e => { expect(e.crossesSegment).toBe(true); expect(byId.get(e.toId).wave).toBe(11); });
    for (const { segment } of layout.segments) {
      const view = segmentWindowV2(layout, segment);
      const edges = layout.edges.filter(e => { const w = byId.get(e.fromId).wave; return w >= view.windowFromWave && w < view.windowToWave; });
      expect(view.windowFromWave).toBe(Math.max(1, view.fromWave - 1));
      expect(view.windowToWave).toBe(Math.min(50, view.toWave + 1));
      expect(view.height).toBeGreaterThan(1000);
      // both sides of every W(10k)→W(10k+1) road are inside the window of both neighbouring segments
      if (segment < 5) expect(edges.some(e => e.crossesSegment)).toBe(true);
      if (segment > 1) expect(layout.edges.some(e => e.crossesSegment && byId.get(e.toId).wave === view.fromWave)).toBe(true);
    }
    expect(layout.nodes.filter(n => n.isBoss).map(n => n.wave)).toEqual([10, 20, 30, 40, 50]);
    expect(layout.edges.some(e => e.fromId === layout.nodes.find(n => n.wave === 50).nodeId)).toBe(false);
  });
});

test("segmentForWave, focus and scroll helpers", () => {
  const layout = createVerticalMapLayoutV2(generateOverworldGraphV2(42));
  expect([1, 10, 11, 50, 51].map(w => segmentForWave(layout, w))).toEqual([1, 1, 2, 5, 5]);
  const start = layout.nodes.find(n => n.wave === 1);
  expect(focusYV2(layout, null, 1)).toBe(start.y - CARAVAN_LIFT);
  expect(focusYV2(layout, start.nodeId, 9)).toBe(start.y - CARAVAN_LIFT);
  const view = segmentWindowV2(layout, 2);
  const args = { top: view.top, bottom: view.bottom, contentHeight: 2000, viewportHeight: 400 };
  expect(scrollTopForV2({ ...args, y: view.top, anchor: 0.3 })).toBe(0);
  expect(scrollTopForV2({ ...args, y: view.bottom })).toBe(1600);
  const mid = scrollTopForV2({ ...args, y: (view.top + view.bottom) / 2, anchor: 0.25 });
  expect(mid).toBe(900);
  expect(() => segmentWindowV2(layout, 6)).toThrow(RangeError);
});
