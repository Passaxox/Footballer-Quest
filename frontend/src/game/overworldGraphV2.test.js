import * as g from "./overworldGraphV2";
import * as v1 from "./overworld";
import * as engine from "./engine";
import { BOSSES, FINAL_WAVE, STARTER_IDS } from "./data";

// Captured before any V2 call: V2 must never alter V1 data, boss data or the Epsilon stream.
const V1_ROUTES = JSON.stringify(v1.OVERWORLD_ROUTES);
const V1_NODES = JSON.stringify(v1.OVERWORLD_NODES);
const BOSSES_JSON = JSON.stringify(BOSSES);
const epsilonRun = seed => ({ wave: 25, overworld: { contentSeed: seed } });
const epsilonMap = seeds => seeds.map(s => engine.epsilonEntryEligible(epsilonRun(s)));

const BOUNDARY_SEEDS = [0, 1, 2, 2 ** 31 - 1, 2 ** 31, 2 ** 32 - 1];
const SEEDS = (() => {
  const out = [...BOUNDARY_SEEDS];
  let x = 20260430;
  while (out.length < 1000) { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; out.push(x); }
  return out;
})();
const GRAPHS = SEEDS.map(s => g.generateOverworldGraphV2(s));
const clone = graph => JSON.parse(JSON.stringify(graph));
const node = (graph, wave, lane = 0) => graph.nodes.find(n => n.wave === wave && n.lane === lane);
const key = n => `${n.type}|${n.locationId}|${n.environmentId}`;

// Independent oracle: work backwards through successors, unlike the production predecessor DP.
// Each value is the longest non-battle prefix starting at this node, over every continuation.
const exactNonBattleRun = graph => {
  const prefixes = new Map();
  for (const n of [...graph.nodes].sort((a, b) => b.wave - a.wave)) {
    prefixes.set(n.nodeId, n.type === "battle" ? 0 : 1 + Math.max(0, ...n.next.map(id => prefixes.get(id))));
  }
  return Math.max(...prefixes.values());
};
const walkNonBattleRun = nodes => {
  let best = 0, run = 0;
  for (const n of nodes) { run = n.type === "battle" ? 0 : run + 1; best = Math.max(best, run); }
  return best;
};
const shape = graph => JSON.stringify(graph.nodes.map(n => [n.nodeId, n.next, n.locationId, n.environmentId, n.boss, n.hooks]));

describe("structure (all 1000 sample seeds)", () => {
  test("every graph validates and has the expected shape and bounded size", () => {
    for (const graph of GRAPHS) {
      expect(g.validateOverworldGraphV2(graph)).toEqual({ valid: true, errors: [] });
      expect(graph.revision).toBe(2);
      expect(graph.algorithmVersion).toBe(3);
      expect(graph.nodes.length).toBeGreaterThan(FINAL_WAVE);
      expect(graph.nodes.length).toBeLessThanOrEqual(150);
      expect(g.summarizeOverworldGraphV2(graph).maxWidth).toBeLessThanOrEqual(3);
    }
  });

  test("independent recomputation: 50 layers, wave N -> N+1 edges only, unique ids, no duplicate edges", () => {
    for (const graph of GRAPHS) {
      const ids = graph.nodes.map(n => n.nodeId);
      expect(new Set(ids).size).toBe(ids.length);
      const waves = new Set(graph.nodes.map(n => n.wave));
      expect([...waves].sort((a, b) => a - b)).toEqual(Array.from({ length: FINAL_WAVE }, (_, i) => i + 1));
      const byId = new Map(graph.nodes.map(n => [n.nodeId, n]));
      const indegree = new Map(ids.map(id => [id, 0]));
      for (const n of graph.nodes) {
        expect(new Set(n.next).size).toBe(n.next.length);
        for (const id of n.next) { expect(byId.get(id).wave).toBe(n.wave + 1); indegree.set(id, indegree.get(id) + 1); }
        expect(n.next.length > 0).toBe(n.wave < FINAL_WAVE);
      }
      for (const n of graph.nodes) expect(indegree.get(n.nodeId) > 0).toBe(n.wave > 1);
    }
  });

  test("every start-to-end path has exactly 50 nodes and crosses W10/W20/W30/W40/W50 (DP, no enumeration)", () => {
    for (const graph of GRAPHS) {
      const byId = new Map(graph.nodes.map(n => [n.nodeId, n]));
      const prev = new Map(graph.nodes.map(n => [n.nodeId, []]));
      graph.nodes.forEach(n => n.next.forEach(id => prev.get(id).push(n.nodeId)));
      const lo = new Map(), hi = new Map(), reachCheckpoints = new Map();
      for (const n of [...graph.nodes].sort((a, b) => a.wave - b.wave)) {
        const p = prev.get(n.nodeId);
        lo.set(n.nodeId, 1 + (p.length ? Math.min(...p.map(i => lo.get(i))) : 0));
        hi.set(n.nodeId, 1 + (p.length ? Math.max(...p.map(i => hi.get(i))) : 0));
        const sets = p.map(i => reachCheckpoints.get(i));
        const common = sets.length ? [...sets[0]].filter(x => sets.every(s => s.has(x))) : [];
        reachCheckpoints.set(n.nodeId, new Set([...common, ...(n.wave % 10 === 0 ? [n.nodeId] : [])]));
      }
      const ends = graph.nodes.filter(n => n.next.length === 0);
      expect(ends.map(n => n.wave)).toEqual([FINAL_WAVE]);
      expect(lo.get(ends[0].nodeId)).toBe(FINAL_WAVE);
      expect(hi.get(ends[0].nodeId)).toBe(FINAL_WAVE);
      // Checkpoints common to ALL paths into the final node.
      expect([...reachCheckpoints.get(ends[0].nodeId)].sort()).toEqual([10, 20, 30, 40, 50].map(w => `ow2:w${w}:boss`));
      expect(byId.size).toBe(graph.nodes.length);
    }
  });

  test("checkpoints are single shared bosses coherent with BOSSES; W50 is the only terminal", () => {
    for (const graph of GRAPHS) {
      for (const w of g.CHECKPOINT_WAVES) {
        const layer = g.nodesAtWave(graph, w);
        expect(layer).toHaveLength(1);
        expect(layer[0].boss).toEqual({ wave: w, encounterType: BOSSES[w].encounterType, teamId: BOSSES[w].teamId, team: BOSSES[w].team });
        expect(layer[0].type).toBe("battle");
      }
      expect(graph.nodes.filter(n => n.boss)).toHaveLength(5);
      expect(g.nodesAtWave(graph, FINAL_WAVE)[0].next).toEqual([]);
    }
    expect(Object.keys(BOSSES).map(Number)).toEqual([...g.CHECKPOINT_WAVES]);
  });

  test("sampled complete walks: 50 unique waves in order, valid links, all bosses, no mutation", () => {
    for (const graph of GRAPHS.slice(0, 20)) {
      const before = g.serializeOverworldGraphV2(graph);
      for (let k = 0; k < 10; k++) {
        const walk = g.walkOverworldPathV2(graph, g.seededChooser(k));
        expect(walk.nodeIds).toHaveLength(50);
        expect(new Set(walk.nodeIds).size).toBe(50);
        walk.nodes.forEach((n, i) => expect(n.wave).toBe(i + 1));
        for (let i = 1; i < 50; i++) expect(g.isValidLink(graph, walk.nodeIds[i - 1], walk.nodeIds[i])).toBe(true);
        g.CHECKPOINT_WAVES.forEach(w => expect(walk.nodeIds[w - 1]).toBe(`ow2:w${w}:boss`));
        walk.alternatives.forEach(a => a.others.forEach(o => expect(g.getGraphNode(graph, o).wave).toBe(a.wave)));
      }
      expect(g.serializeOverworldGraphV2(graph)).toBe(before);
    }
  });

  test("walk rejects an option that is not reachable from the current node", () => {
    const graph = GRAPHS[0];
    expect(() => g.walkOverworldPathV2(graph, (options, { wave }) => (wave === 2 ? "ow2:w40:boss" : options[0]))).toThrow(/Scelta non valida/);
  });
});

describe("freedom of choice", () => {
  test("every segment offers several real choices on every path, beyond its first wave", () => {
    for (const graph of GRAPHS) {
      const summary = g.summarizeOverworldGraphV2(graph);
      expect(summary.segments).toHaveLength(5);
      for (const seg of summary.segments) {
        expect(seg.minChoicesPerPath).toBeGreaterThanOrEqual(5);
        expect(seg.joinNodes).toBeGreaterThanOrEqual(1);
      }
      for (const sg of graph.segments) {
        const forkWaves = new Set(graph.nodes.filter(n => n.next.length >= 2 && n.wave >= sg.fromWave && n.wave <= sg.toWave).map(n => n.wave));
        expect(forkWaves.size).toBeGreaterThanOrEqual(3);
        expect([...forkWaves].some(w => w > sg.fromWave + 1)).toBe(true);
      }
      expect(summary.perPath.longestForcedRun).toBeLessThanOrEqual(3);
      expect(summary.joinCount).toBeGreaterThan(5);
    }
  });

  test("W1 offers three destinations; the W10-W20-W30-W40 exits fork again", () => {
    for (const graph of GRAPHS) {
      expect(g.startNodes(graph)).toHaveLength(3);
      for (const w of [10, 20, 30, 40]) expect(g.nextOptions(graph, `ow2:w${w}:boss`).length).toBeGreaterThanOrEqual(2);
    }
  });

  test("alternatives from any node are genuinely different and connected to it", () => {
    for (const graph of GRAPHS) {
      for (const n of graph.nodes) {
        const options = g.nextOptions(graph, n.nodeId);
        expect(options.map(o => o.nodeId)).toEqual(n.next);
        expect(new Set(options.map(key)).size).toBe(options.length);
        options.forEach(o => expect(g.isValidLink(graph, n.nodeId, o.nodeId)).toBe(true));
      }
      const layerKeys = [];
      for (let w = 1; w <= FINAL_WAVE; w++) { const k = g.nodesAtWave(graph, w).map(key); layerKeys.push(new Set(k).size === k.length); }
      expect(layerKeys.every(Boolean)).toBe(true);
    }
  });

  test("different branches produce different sequences before reconverging", () => {
    for (const graph of GRAPHS.slice(0, 30)) {
      const first = g.walkOverworldPathV2(graph, o => o[0]), last = g.walkOverworldPathV2(graph, o => o.at(-1));
      const differing = first.nodes.filter((n, i) => key(n) !== key(last.nodes[i])).length;
      expect(differing).toBeGreaterThan(10);
      expect(first.nodes.some((n, i) => n.type !== last.nodes[i].type)).toBe(true);
      expect(first.nodeIds.filter((id, i) => id === last.nodeIds[i]).length).toBeGreaterThanOrEqual(5);
    }
  });

  test("links that are not edges are rejected", () => {
    const graph = GRAPHS[3];
    const a = node(graph, 3);
    expect(g.isValidLink(graph, a.nodeId, "ow2:w03:a")).toBe(false);
    expect(g.isValidLink(graph, a.nodeId, "ow2:w05:a")).toBe(false);
    expect(g.isValidLink(graph, "ow2:w04:a", a.nodeId)).toBe(false);
    expect(g.isValidLink(graph, a.nodeId, "nope")).toBe(false);
    expect(() => g.nextOptions(graph, "nope")).toThrow(/sconosciuto/);
    expect(g.nodesAtWave(graph, 0)).toEqual([]);
    expect(g.nodesAtWave(graph, 51)).toEqual([]);
  });
});

describe("P1b combat rhythm on all reachable paths", () => {
  test("all 1000 seeds meet the exact four-node bound, independently of sampled walks", () => {
    expect(new Set(SEEDS).size).toBe(1000);
    expect(g.MAX_NON_BATTLE_RUN).toBe(4);
    for (const graph of GRAPHS) {
      const exact = exactNonBattleRun(graph);
      expect(exact).toBeLessThanOrEqual(4);
      expect(g.summarizeOverworldGraphV2(graph).perPath.longestNonBattleRun).toBe(exact);
    }
  });

  test("a safe first path cannot hide five non-battles merging from another predecessor", () => {
    const graph = clone(g.generateOverworldGraphV2(0, { templateIds: ["B", "E"] }));
    graph.nodes.forEach(n => { n.type = "battle"; });
    for (const [wave, lane, type] of [[3, 1, "recruit"], [4, 1, "training"], [5, 1, "shop"], [6, 1, "event"], [7, 0, "recruit"]]) {
      node(graph, wave, lane).type = type;
    }
    const safe = g.walkOverworldPathV2(graph);
    const unsafe = g.walkOverworldPathV2(graph, options => options.find(n => n.lane === 1) || options[0]);
    expect(walkNonBattleRun(safe.nodes)).toBe(1);
    expect(walkNonBattleRun(unsafe.nodes)).toBe(5);
    expect(node(graph, 6, 0).type).toBe("battle");
    expect(node(graph, 6, 0).next).toContain(node(graph, 7).nodeId);
    expect(node(graph, 6, 1).next).toContain(node(graph, 7).nodeId);
    expect(exactNonBattleRun(graph)).toBe(5);
    expect(g.summarizeOverworldGraphV2(graph).perPath.longestNonBattleRun).toBe(5);
    const before = JSON.stringify(graph);
    for (const options of [{}, { maxNonBattleRun: 99, maxForcedRun: 99, minChoicesPerSegment: 0 }]) {
      const result = g.validateOverworldGraphV2(graph, options);
      expect(result.valid).toBe(false);
      expect(result.errors.join("\n")).toMatch(/non-battle consecutive: 5/);
    }
    expect(JSON.stringify(graph)).toBe(before);
    graph.nodes.reverse();
    expect(g.validateOverworldGraphV2(graph).valid).toBe(false);
    expect(g.summarizeOverworldGraphV2(graph).perPath.longestNonBattleRun).toBe(5);
    node(graph, 3, 1).type = "battle";
    expect(exactNonBattleRun(graph)).toBe(4);
    // This synthetic mostly-battle graph still lacks P1c opportunities. Only its pacing error is resolved.
    expect(g.validateOverworldGraphV2(graph).errors.some(e => e.includes("non-battle consecutive"))).toBe(false);
    expect(g.validateOverworldGraphV2(graph).errors.some(e => e.includes("Opportunità"))).toBe(true);
  });

  test.each(["recruit", "training", "shop", "event"])("%s-only preferences still enforce pacing and preserve topology", type => {
    for (const seed of BOUNDARY_SEEDS) {
      const options = Object.freeze({ typeWeights: Object.freeze(Object.fromEntries(g.NODE_TYPES.map(t => [t, t === type ? 1 : 0]))) });
      const graph = g.generateOverworldGraphV2(seed, options);
      expect(g.validateOverworldGraphV2(graph)).toEqual({ valid: true, errors: [] });
      expect(exactNonBattleRun(graph)).toBeLessThanOrEqual(4);
      expect(shape(graph)).toBe(shape(g.generateOverworldGraphV2(seed)));
      // P1c hard opportunity guarantees override even zero descriptor weights.
      expect(g.routeQualityV2(graph).opportunities.every(e => Object.values(e.types).every(v => v.reachable && v.avoidable))).toBe(true);
      expect(graph.nodes.some(n => n.type === type)).toBe(true);
      expect(g.serializeOverworldGraphV2(g.generateOverworldGraphV2(seed, options))).toBe(g.serializeOverworldGraphV2(graph));
      expect(options.typeWeights.battle).toBe(0);
    }
  });

  test("opposite activity preferences produce different type sequences without mutating the graph", () => {
    for (const graph of GRAPHS.slice(0, 30)) {
      const before = g.serializeOverworldGraphV2(graph);
      const action = g.walkOverworldPathV2(graph, options => options.find(n => n.type === "battle") || options[0]);
      const preparation = g.walkOverworldPathV2(graph, options => options.find(n => n.type !== "battle") || options[0]);
      expect(action.nodes.map(n => n.type)).not.toEqual(preparation.nodes.map(n => n.type));
      expect(walkNonBattleRun(action.nodes)).toBeLessThanOrEqual(4);
      expect(walkNonBattleRun(preparation.nodes)).toBeLessThanOrEqual(4);
      expect(g.serializeOverworldGraphV2(graph)).toBe(before);
    }
  });

  test("different seeds vary the activity sequence with the same path policy", () => {
    const sequences = GRAPHS.map(graph => g.walkOverworldPathV2(graph).nodes.map(n => n.type).join(","));
    expect(new Set(sequences).size).toBe(SEEDS.length);
  });
});

describe("validator rejects broken graphs", () => {
  const broken = (mutate, options) => { const graph = clone(GRAPHS[7]); mutate(graph); return g.validateOverworldGraphV2(graph, options); };
  const rejects = (mutate, pattern, options) => {
    const result = broken(mutate, options);
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toMatch(pattern);
  };

  test("baseline clone is valid", () => expect(broken(() => {}).valid).toBe(true));
  test("duplicate nodeId", () => rejects(gr => { gr.nodes[1].nodeId = gr.nodes[0].nodeId; }, /duplicato/));
  test("edge that skips a wave", () => rejects(gr => { node(gr, 3).next = [node(gr, 5).nodeId]; }, /non consecutivo/));
  test("edge back to a previous wave (cycle)", () => rejects(gr => { node(gr, 12).next.push(node(gr, 11).nodeId); }, /non consecutivo/));
  test("boss bypass", () => rejects(gr => { gr.nodes.filter(n => n.wave === 9).forEach(n => { n.next = [node(gr, 11).nodeId]; }); }, /non consecutivo/));
  test("dead end", () => rejects(gr => { node(gr, 7).next = []; }, /Vicolo cieco/));
  test("exit from W50", () => rejects(gr => { node(gr, 50).next = [node(gr, 49).nodeId]; }, /Uscita dalla W50|non consecutivo/));
  test("unreachable node", () => rejects(gr => {
    const orphan = { ...node(gr, 7), nodeId: "ow2:w07:z", lane: 9, locationId: "raimon-training", environmentId: "training" };
    gr.nodes.push(orphan);
  }, /irraggiungibile/));
  test("missing layer", () => rejects(gr => { gr.nodes = gr.nodes.filter(n => n.wave !== 33); }, /Layer mancante: W33/));
  test("optional / duplicated boss at a checkpoint", () => rejects(gr => {
    const boss = node(gr, 20);
    gr.nodes.push({ ...boss, nodeId: "ow2:w20:alt", lane: 1, locationId: "urban" });
    gr.nodes.filter(n => n.wave === 19).forEach(n => n.next.push("ow2:w20:alt"));
    node(gr, 20, 1).next = [...boss.next];
  }, /nodo unico/));
  test("boss inconsistent with BOSSES", () => rejects(gr => { node(gr, 20).boss.teamId = "royal-academy"; }, /incoerente con BOSSES/));
  test("boss metadata alone does not make a non-battle descriptor combat", () => rejects(gr => { node(gr, 20).type = "event"; }, /battle/));
  test("boss flag outside a checkpoint", () => rejects(gr => { node(gr, 5).boss = { ...node(gr, 10).boss }; }, /Boss fuori checkpoint/));
  test("two nodes that are the same logical node", () => rejects(gr => {
    const layer = gr.nodes.filter(n => n.wave === 1);
    expect(layer.length).toBeGreaterThanOrEqual(2);
    const [a, b] = layer;
    Object.assign(b, { type: a.type, locationId: a.locationId, environmentId: a.environmentId });
  }, /logicamente identici|senza differenze/));
  test("unknown location / environment / type", () => {
    rejects(gr => { node(gr, 4).locationId = "atlantis"; }, /Località/);
    rejects(gr => { node(gr, 4).environmentId = "moon"; }, /Ambiente/);
    rejects(gr => { node(gr, 4).type = "casino"; }, /Tipo non valido/);
  });
  test("location not yet available at that wave (zeus before W18)", () => rejects(gr => { node(gr, 4).locationId = "zeus"; node(gr, 4).environmentId = null; }, /Località non disponibile/));
  test("W25 loses its Epsilon reservation", () => {
    rejects(gr => { node(gr, 25).hooks = []; }, /Hook riservati/);
    rejects(gr => { node(gr, 25).type = "shop"; }, /W25 deve restare/);
    rejects(gr => { node(gr, 24).hooks = ["epsilon-w25"]; }, /Hook riservati/);
  });
  test("choice and forced-run thresholds are enforced and configurable", () => {
    rejects(() => {}, /scelte insufficienti/, { minChoicesPerSegment: 99 });
    rejects(() => {}, /senza scelta consecutive/, { maxForcedRun: 0 });
  });
  test("a fully linear chain is rejected (no choice after W1)", () => {
    const nodes = Array.from({ length: FINAL_WAVE }, (_, i) => {
      const wave = i + 1, boss = BOSSES[wave];
      return { nodeId: `ow2:w${String(wave).padStart(2, "0")}:a`, wave, segment: Math.ceil(wave / 10), lane: 0, type: "battle", locationId: "urban",
        environmentId: "riverside", boss: boss ? { wave, encounterType: boss.encounterType, teamId: boss.teamId, team: boss.team } : null,
        hooks: wave === 25 ? ["epsilon-w25"] : [], next: wave < FINAL_WAVE ? [`ow2:w${String(wave + 1).padStart(2, "0")}:a`] : [] };
    });
    const result = g.validateOverworldGraphV2({ revision: 2, algorithm: "branching-dag", finalWave: FINAL_WAVE, nodes });
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toMatch(/scelte insufficienti/);
    expect(result.errors.join("\n")).toMatch(/senza scelta consecutive/);
  });
  test("garbage input is reported, not thrown", () => {
    for (const bad of [null, undefined, {}, { revision: 1 }, { revision: 2, algorithm: "branching-dag", finalWave: 50 }]) expect(g.validateOverworldGraphV2(bad).valid).toBe(false);
    expect(() => g.assertValidOverworldGraphV2(clone({ revision: 2 }))).toThrow(/non valido/);
    expect(g.assertValidOverworldGraphV2(GRAPHS[0])).toBe(GRAPHS[0]);
  });
  test("validation does not mutate its input", () => {
    const graph = clone(GRAPHS[2]);
    const before = JSON.stringify(graph);
    g.validateOverworldGraphV2(graph); g.summarizeOverworldGraphV2(graph);
    expect(JSON.stringify(graph)).toBe(before);
  });
});

describe("determinism", () => {
  test("same seed and version => identical serialized graph, repeated calls unchanged", () => {
    for (const s of SEEDS) {
      const a = g.generateOverworldGraphV2(s), b = g.generateOverworldGraphV2(s, { algorithmVersion: 3 });
      expect(g.serializeOverworldGraphV2(a)).toBe(g.serializeOverworldGraphV2(b));
      expect(a).toEqual(b);
      expect(g.fingerprintOverworldGraphV2(a)).toBe(g.fingerprintOverworldGraphV2(GRAPHS[SEEDS.indexOf(s)]));
    }
  });

  test("query order cannot influence the graph", () => {
    const fresh = g.generateOverworldGraphV2(777);
    const before = g.serializeOverworldGraphV2(fresh);
    for (let w = FINAL_WAVE; w >= 1; w--) { g.nodesAtWave(fresh, w); g.nextOptions(fresh, g.nodesAtWave(fresh, w)[0].nodeId); }
    g.walkOverworldPathV2(fresh, g.seededChooser(5)); g.summarizeOverworldGraphV2(fresh); g.validateOverworldGraphV2(fresh);
    expect(g.serializeOverworldGraphV2(fresh)).toBe(before);
    expect(g.serializeOverworldGraphV2(g.generateOverworldGraphV2(777))).toBe(before);
  });

  test("output is deeply frozen and round-trips through JSON", () => {
    const graph = GRAPHS[0];
    const frozen = v => !v || typeof v !== "object" || (Object.isFrozen(v) && Object.values(v).every(frozen));
    expect(frozen(graph)).toBe(true);
    expect(() => { graph.nodes[0].next.push("x"); }).toThrow();
    expect(g.fingerprintOverworldGraphV2(JSON.parse(JSON.stringify(graph)))).toBe(g.fingerprintOverworldGraphV2(graph));
  });

  test("never reads Math.random, the clock or the input object after generation", () => {
    const random = jest.spyOn(Math, "random"), now = jest.spyOn(Date, "now");
    const options = Object.freeze({ typeWeights: Object.freeze({ battle: 2 }), templateIds: Object.freeze(["B", "D", "E", "F"]) });
    const graph = g.generateOverworldGraphV2(31337, options);
    g.walkOverworldPathV2(graph, g.seededChooser(3)); g.summarizeOverworldGraphV2(graph); g.validateOverworldGraphV2(graph);
    expect(random).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
    expect(options).toEqual({ typeWeights: { battle: 2 }, templateIds: ["B", "D", "E", "F"] });
    random.mockRestore(); now.mockRestore();
  });

  test("32-bit boundary seeds work; invalid seeds are rejected", () => {
    for (const s of BOUNDARY_SEEDS) expect(g.generateOverworldGraphV2(s).seed).toBe(s);
    for (const bad of [-1, 1.5, 2 ** 32, NaN, Infinity, "5", null, undefined, 2n]) expect(() => g.generateOverworldGraphV2(bad)).toThrow(RangeError);
    expect(g.serializeOverworldGraphV2(g.generateOverworldGraphV2(0))).not.toBe(g.serializeOverworldGraphV2(g.generateOverworldGraphV2(1)));
  });

  test("different seeds give different structures", () => {
    expect(new Set(GRAPHS.map(g.fingerprintOverworldGraphV2)).size).toBeGreaterThanOrEqual(98);
    const profiles = new Set(GRAPHS.map(gr => g.summarizeOverworldGraphV2(gr).widthByWave.join("")));
    expect(profiles.size).toBeGreaterThanOrEqual(30);
    const templates = new Set(GRAPHS.flatMap(gr => gr.segments.map(s => s.templateId)));
    expect(templates.size).toBe(g.GRAPH_TEMPLATES.length);
  });

  test("type descriptors do not influence structure (independent streams); template filter is honoured", () => {
    const base = g.generateOverworldGraphV2(99), onlyBattle = g.generateOverworldGraphV2(99, { typeWeights: { battle: 1, recruit: 0, training: 0, shop: 0, event: 0 } });
    const shape = gr => JSON.stringify(gr.nodes.map(n => [n.nodeId, n.next, n.locationId, n.environmentId]));
    expect(shape(onlyBattle)).toBe(shape(base));
    expect(g.validateOverworldGraphV2(onlyBattle).valid).toBe(true);
    expect(onlyBattle.nodes.some(n => n.type !== "battle")).toBe(true);
    const restricted = g.generateOverworldGraphV2(99, { templateIds: ["E", "F", "B", "D"] });
    expect(restricted.segments.every(s => ["E", "F", "B", "D"].includes(s.templateId))).toBe(true);
    expect(g.validateOverworldGraphV2(restricted).valid).toBe(true);
    expect(() => g.generateOverworldGraphV2(1, { templateIds: ["E"] })).toThrow(/Nessun template/);
    for (const algorithmVersion of [1, 2, 4]) expect(() => g.generateOverworldGraphV2(1, { algorithmVersion })).toThrow(/non supportata/);
    expect(() => g.generateOverworldGraphV2(1, { typeWeights: { battle: -1 } })).toThrow(/Pesi/);
  });

  test("templates are internally consistent", () => {
    for (const t of g.GRAPH_TEMPLATES) {
      expect(t.widths).toHaveLength(9);
      expect(t.widths.every(w => w >= 1 && w <= 3)).toBe(true);
      t.lanes.forEach(k => { expect(t.widths[k - 1]).toBe(t.widths[k]); expect(t.widths[k]).toBeGreaterThan(1); });
    }
  });
});

describe("golden fixtures", () => {
  // v3: joint opportunity/escape/profile repairs and ow2/graph/v3 streams.
  // Refreshed after independent forward-DP/BFS audit of 1000 seeds + 100 extreme graphs.
  // v2 fingerprints: 0=7e7d7e72, 1=efc4cdc0, 42=9591a4a3, 4294967295=fada3abb.
  const GOLDEN = {
  "0": {
    "fp": "1f79018d",
    "nodes": 106,
    "edges": 163,
    "widths": "33221322212233221331332213222133322212213322132221"
  },
  "1": {
    "fp": "b240c9e2",
    "nodes": 106,
    "edges": 162,
    "widths": "33322212213223321231233212332133322212213212332121"
  },
  "42": {
    "fp": "f779631d",
    "nodes": 105,
    "edges": 162,
    "widths": "32233212313212332121332213222133322212213322132221"
  },
  "4294967295": {
    "fp": "d18dacfa",
    "nodes": 106,
    "edges": 163,
    "widths": "33221322213212332121233212332132233212313332221221"
  }
};
  test.each(Object.keys(GOLDEN))("seed %s matches its golden graph", seed => {
    const graph = g.generateOverworldGraphV2(Number(seed));
    const summary = g.summarizeOverworldGraphV2(graph);
    expect({ fp: g.fingerprintOverworldGraphV2(graph), nodes: summary.nodeCount, edges: summary.edgeCount, widths: summary.widthByWave.join("") }).toEqual(GOLDEN[seed]);
  });
});

describe("Epsilon W25 architectural contract", () => {
  test("reservation mirrors the engine entry and every graph keeps W25 as ONE battle node carrying the hook", () => {
    expect(g.RESERVED_WAVES[25].entryId).toBe(engine.EPSILON_ENTRY.id);
    expect(25).toBe(engine.EPSILON_ENTRY.wave);
    expect(engine.EPSILON_ENTRY.probability).toBe(0.25);
    for (const graph of GRAPHS) {
      const layer = g.nodesAtWave(graph, 25);
      expect(layer).toHaveLength(1);
      expect(layer[0]).toMatchObject({ type: "battle", hooks: ["epsilon-w25"] });
      expect(graph.nodes.filter(n => n.hooks.length)).toHaveLength(1);
      expect(graph.nodes.some(n => n.nodeId === engine.EPSILON_ENTRY.id)).toBe(false);
    }
    expect(g.P2_INTEGRATION_CONTRACT.length).toBeGreaterThanOrEqual(4);
  });

  test("graph generation leaves the Epsilon stream and eligibility untouched (still optional, never forced)", () => {
    const seeds = Array.from({ length: 400 }, (_, i) => i * 2654435761 >>> 0);
    const before = epsilonMap(seeds);
    const draws = seeds.slice(0, 20).map(s => v1.nodeRandom(s, "epsilon-w25")());
    seeds.forEach(s => g.generateOverworldGraphV2(s));
    expect(epsilonMap(seeds)).toEqual(before);
    expect(seeds.slice(0, 20).map(s => v1.nodeRandom(s, "epsilon-w25")())).toEqual(draws);
    const hits = before.filter(Boolean).length;
    expect(hits).toBeGreaterThan(0);
    expect(hits).toBeLessThan(seeds.length);
  });

  test("documented V1 discrepancy (update deliberately in P2): generateWave knows Epsilon, beginOverworldNode does not", () => {
    expect(engine.generateWave.toString()).toMatch(/epsilonEntryEligible/);
    expect(engine.beginOverworldNode.toString()).not.toMatch(/epsilon/i);
  });
});

describe("compatibility: V1, engine and saves are untouched", () => {
  test("V1 overworld data, routes, bosses and nodeRandom stream are unchanged after V2 use", () => {
    GRAPHS.forEach(gr => g.summarizeOverworldGraphV2(gr));
    expect(JSON.stringify(v1.OVERWORLD_ROUTES)).toBe(V1_ROUTES);
    expect(JSON.stringify(v1.OVERWORLD_NODES)).toBe(V1_NODES);
    expect(JSON.stringify(BOSSES)).toBe(BOSSES_JSON);
    expect(v1.OVERWORLD_NODES).toHaveLength(28);
    const r = v1.nodeRandom(12345, "epsilon-w25");
    expect([r(), r(), r()]).toEqual([0.3037715486716479, 0.5731206475757062, 0.8819739252794534]);
    expect(v1.nodeRandom(0, "epsilon-w25")()).toBe(0.03814691258594394);
  });

  test("new runs are still revision 1 and V2 graphs are not mistaken for V1 overworld state", () => {
    const run = engine.newRun(STARTER_IDS.slice(0, 3));
    expect(run.overworld.revision).toBe(1);
    expect(v1.hasOverworld(run)).toBe(true);
    expect(v1.hasOverworld({ ...run, overworld: { ...run.overworld, revision: 2 } })).toBe(false);
    expect(v1.hasOverworld({ wave: 1, overworld: GRAPHS[0] })).toBe(false);
    expect(Object.keys(run)).not.toContain("graph");
  });
});

describe("diagnostics and size", () => {
  test("segment type ranges match exhaustive local paths; global extrema compose through shared bosses", () => {
    // Only enumerate each nine-wave segment of three graphs, never the billions of full paths.
    for (const graph of GRAPHS.slice(0, 3)) {
      const byId = new Map(graph.nodes.map(n => [n.nodeId, n]));
      const summary = g.summarizeOverworldGraphV2(graph);
      for (const segment of graph.segments) {
        const observed = [];
        const visit = (n, counts) => {
          const nextCounts = { ...counts, [n.type]: counts[n.type] + 1 };
          if (n.wave === segment.toWave) observed.push(nextCounts);
          else n.next.forEach(id => visit(byId.get(id), nextCounts));
        };
        const zero = Object.fromEntries(g.NODE_TYPES.map(t => [t, 0]));
        graph.nodes.filter(n => n.wave === segment.fromWave).forEach(n => visit(n, zero));
        const reported = summary.segments[segment.segment - 1];
        const segmentNodes = graph.nodes.filter(n => n.wave >= segment.fromWave && n.wave <= segment.toWave);
        expect(observed.length).toBeGreaterThan(1);
        expect(observed.every(counts => Object.values(counts).reduce((a, b) => a + b, 0) === 9)).toBe(true);
        for (const type of g.NODE_TYPES) {
          expect(reported.nodeTypeCounts[type]).toBe(segmentNodes.filter(n => n.type === type).length);
          expect(reported.perPathTypeCounts[type]).toEqual({
            min: Math.min(...observed.map(counts => counts[type])),
            max: Math.max(...observed.map(counts => counts[type])),
          });
        }
      }
      for (const type of g.NODE_TYPES) {
        for (const extreme of ["min", "max"]) {
          const total = summary.segments.reduce((sum, s) => sum + s.perPathTypeCounts[type][extreme], type === "battle" ? 5 : 0);
          expect(summary.perPath.typeCounts[type][extreme]).toBe(total);
        }
      }
    }
  });

  test("summary is JSON-serializable, linear in size and exposes per-path ranges", () => {
    for (const graph of GRAPHS.slice(0, 10)) {
      const summary = g.summarizeOverworldGraphV2(graph);
      expect(() => JSON.stringify(summary)).not.toThrow();
      expect(summary.nodeCount).toBe(graph.nodes.length);
      expect(summary.edgeCount).toBeLessThanOrEqual(3 * summary.nodeCount);
      expect(summary.widthByWave).toHaveLength(FINAL_WAVE);
      expect(summary.pathCount.length).toBeGreaterThanOrEqual(8);
      for (const t of g.NODE_TYPES) expect(summary.perPath.typeCounts[t].min).toBeLessThanOrEqual(summary.perPath.typeCounts[t].max);
      expect(summary.forkWaves.some(w => w > 1)).toBe(true);
    }
  });
});

describe("P1c reachable opportunities and voluntary combat", () => {
  const reachable = (graph, source, end, avoid = null) => {
    const byId = new Map(graph.nodes.map(n => [n.nodeId, n]));
    const queue = [source], seen = new Set(), out = [];
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      const n = byId.get(id);
      if (n.type === avoid) continue;
      out.push(n);
      if (n.wave < end) queue.push(...n.next);
    }
    return out;
  };
  const escapeBfs = (graph, start) => {
    if (start.type !== "battle" || start.wave === 50) return 0;
    const byId = new Map(graph.nodes.map(n => [n.nodeId, n]));
    let frontier = [start], distance = 0;
    const seen = new Set([start.nodeId]);
    while (frontier.length) {
      distance++;
      const next = [];
      for (const n of frontier) for (const id of n.next) {
        if (seen.has(id)) continue;
        seen.add(id);
        const child = byId.get(id);
        if (child.type !== "battle" || child.wave === 50) return distance;
        next.push(child);
      }
      frontier = next;
    }
    return Infinity;
  };
  test("1000 seeds: independent BFS agrees at every node and every segment entry", () => {
    for (const graph of GRAPHS) {
      const q = g.routeQualityV2(graph);
      const exact = Object.fromEntries(graph.nodes.map(n => [n.nodeId, escapeBfs(graph, n)]));
      expect(q.battleEscapeByNode).toEqual(exact);
      expect(Math.max(...Object.values(exact))).toBeLessThanOrEqual(6);
      const observations = [];
      for (let segment = 1; segment <= 5; segment++) {
        const entries = graph.nodes.filter(n => n.wave === (segment === 1 ? 1 : (segment - 1) * 10));
        expect(entries.length).toBe(segment === 1 ? 3 : 1);
        for (const entry of entries) {
          const reached = reachable(graph, entry.nodeId, segment * 10);
          const required = ["recruit", "shop", "training", ...(segment === 1 ? ["event"] : [])];
          const types = Object.fromEntries(required.map(t => [t, {
            reachable: reached.some(n => n.wave < segment * 10 && n.type === t),
            avoidable: reachable(graph, entry.nodeId, segment * 10, t).some(n => n.wave === segment * 10),
          }]));
          expect(Object.values(types).every(v => v.reachable && v.avoidable)).toBe(true);
          observations.push({ segment, fromNodeId: entry.nodeId, types });
        }
      }
      expect(q.opportunities).toEqual(observations);
    }
  });

  test("global presence cannot hide recruit unreachable from a particular W1 lane", () => {
    const graph = clone(g.generateOverworldGraphV2(0, { templateIds: ["B", "E"] }));
    graph.nodes.filter(n => n.wave < 10 && n.type === "recruit").forEach(n => { n.type = "battle"; });
    node(graph, 2, 1).type = "recruit";
    expect(graph.nodes.some(n => n.wave < 10 && n.type === "recruit")).toBe(true);
    expect(reachable(graph, node(graph, 1, 0).nodeId, 10).some(n => n.type === "recruit")).toBe(false);
    const result = g.validateOverworldGraphV2(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toMatch(/recruit irraggiungibile da ow2:w01:a/);
  });
  test("reachable shops on every W2 lane cannot become an obligatory checkpoint", () => {
    const graph = clone(GRAPHS[0]);
    graph.nodes.filter(n => n.wave === 2).forEach(n => { n.type = "shop"; });
    const result = g.validateOverworldGraphV2(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toMatch(/shop obbligatoria/);
  });
  test("a battle corridor without a timely exit is rejected; W50 is a valid conclusion", () => {
    const graph = clone(GRAPHS[0]);
    graph.nodes.filter(n => n.wave <= 10).forEach(n => { n.type = "battle"; });
    expect(g.routeQualityV2(graph).maxBattleEscape).toBeGreaterThan(6);
    expect(g.validateOverworldGraphV2(graph).errors.join("\n")).toMatch(/Uscita dai combattimenti/);
    graph.nodes.filter(n => n.wave >= 45).forEach(n => { n.type = "battle"; });
    const q = g.routeQualityV2(graph);
    expect(q.battleEscapeByNode[node(graph, 45).nodeId]).toBe(5);
    expect(q.battleEscapeByNode[node(graph, 50).nodeId]).toBe(0);
  });
  test("long voluntarily selected battle streaks remain possible in valid graphs", () => {
    const longest = GRAPHS.slice(0, 20).map(graph => {
      let best = 0, run = 0;
      const walk = g.walkOverworldPathV2(graph, options => options.find(n => n.type === "battle") || options[0]);
      for (const n of walk.nodes) { run = n.type === "battle" ? run + 1 : 0; best = Math.max(best, run); }
      expect(g.validateOverworldGraphV2(graph).valid).toBe(true);
      return best;
    });
    expect(Math.max(...longest)).toBeGreaterThan(6);
  });
  test("profiles distinguish encounter pools but not visual-only localities or RNG identities", () => {
    const base = { wave: 5, boss: null, locationId: "urban", environmentId: "riverside", nodeId: "a" };
    const elsewhere = { ...base, locationId: "raimon-training", environmentId: "training", nodeId: "b" };
    for (const type of ["shop", "training", "event"]) {
      expect(g.gameplaySignatureV2({ ...base, type })).toBe(g.gameplaySignatureV2({ ...elsewhere, type }));
    }
    for (const type of ["battle", "recruit"]) {
      expect(g.gameplaySignatureV2({ ...base, type })).not.toBe(g.gameplaySignatureV2({ ...elsewhere, type }));
      expect(g.gameplaySignatureV2({ ...base, type })).toBe(g.gameplaySignatureV2({ ...base, type, nodeId: "different", environmentId: "metropolitan" }));
    }
    const graph = GRAPHS[0], before = JSON.stringify(graph);
    const first = g.routeQualityV2(graph);
    [...graph.nodes].reverse().forEach(g.gameplaySignatureV2);
    expect(g.routeQualityV2(graph)).toEqual(first);
    expect(JSON.stringify(graph)).toBe(before);
    // W1 urban alternatives have equal current profiles; future content previews belong to P2.
    expect(first.redundantOptionPairs.some(pair => pair.every(id => id.startsWith("ow2:w01:")))).toBe(true);
  });
});
