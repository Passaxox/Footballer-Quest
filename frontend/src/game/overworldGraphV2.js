// Overworld 2.0 / P1c: pure, deterministic, serializable branching route graph (DAG).
// Not wired into the engine, saves or UI: V1 (`revision: 1`, overworld.js) stays the only live path until P2.
//
// MODEL. A run is 50 waves; the graph has MORE nodes than that. Layer N holds the destinations the player can pick
// for wave N, and every edge links layer N to layer N+1, so any complete path visits exactly one node per wave.
// W10/W20/W30/W40/W50 are single shared boss nodes (BOSSES in data.js), so every path crosses them. W50 is terminal.
// Segments are the 9 waves between checkpoints (W1-9, W11-19, ...). Each segment uses one hand-authored width
// template (1-3 nodes per layer) whose transitions are forks, merges, "lanes" (no choice) or "braids" (every node
// has two exits). Width is capped at 3, so size is linear in waves (~110 nodes) and never grows with path count.
//
// DENSITY (tunable via GRAPH_TEMPLATES): every path meets at least 5 choice points per segment (the entry choice
// plus 4 or more braids/forks) and never walks more than 3 consecutive forced waves. Siblings always differ in
// place (location + environment); their types may match. Node `type` and place are descriptors only:
// no encounters, rewards or quotas are assigned here (P2). Quotas must be judged per PATH (see
// summarizeOverworldGraphV2().perPath), never on graph-wide node counts.
// PACING. A first topological pass enforces the non-battle bound. Joint P1c repairs then ensure
// optional reachable activities and timely battle exits while preserving that bound. No fixed-wave schedule.
//
// RNG. Structural decisions use a private, versioned stream namespace (`ow2/graph/v<version>`) built on a local
// hash + mulberry32, one independent stream per decision. It never touches Math.random, the clock, combat streams,
// nodeRandom() or the Epsilon stream. Same (seed, algorithmVersion, options) => identical frozen graph.
//
// EPSILON (W25). engine.generateWave() replaces the W25 encounter with Epsilon (25%, stream "epsilon-w25"), but
// beginOverworldNode() builds content through generateWaveNode() with a forced node type and never consults
// Epsilon. This module does not fix that. It guarantees only that W25 is ONE battle node (hooks: ["epsilon-w25"]),
// so P2 can hijack it without discarding a player choice. See P2_INTEGRATION_CONTRACT.
import { BOSSES, FINAL_WAVE } from "./data";
import { SCENARIOS, scenarioPool } from "./scenarios";
import { ENVIRONMENTS } from "./overworldPresentation";

export const OVERWORLD_V2_REVISION = 2;
// v3 adds joint route-quality constraints and changes the private stream namespace.
// Earlier prototypes were never saved/integrated; P2 must persist the version.
export const GRAPH_ALGORITHM = Object.freeze({ id: "branching-dag", version: 3 });
export const MAX_NON_BATTLE_RUN = 4;
export const CHECKPOINT_WAVES = Object.freeze([10, 20, 30, 40, 50]);
export const NODE_TYPES = Object.freeze(["battle", "recruit", "training", "shop", "event"]);
// Descriptor preferences only (5/9 battle before repairs). Hard route constraints override zero weights too.
export const DEFAULT_TYPE_WEIGHTS = Object.freeze({ battle: 5, recruit: 1, training: 1, shop: 1, event: 1 });
export const RESERVED_WAVES = Object.freeze({
  25: Object.freeze({ entryId: "epsilon-w25", type: "battle" }),
});
export const P2_INTEGRATION_CONTRACT = Object.freeze([
  "W25 is a single battle node carrying hooks: [RESERVED_WAVES[25].entryId]; never widen it or drop the hook.",
  "Epsilon must keep its own stream nodeRandom(contentSeed, 'epsilon-w25') and its 25% probability; graph generation never draws from it.",
  "engine.generateWave handles Epsilon but beginOverworldNode does not: P2 must route V2 W25 through the Epsilon check explicitly.",
  "Signatures describe potential content, not distinct draws. P2 must provide stable seeded previews; P3 must explain route consequences for shared profiles.",
  "Reachability does not imply affordable shops or eligible recruits; P2 owns resource and ownership checks.",
  "V2 runs must be opt-in; V1 runs (revision 1) keep the historical flow untouched.",
]);
export const DEFAULT_VALIDATION = Object.freeze({ minChoicesPerSegment: 2, maxForcedRun: 4 });

const SEGMENTS = 5;
const SEGMENT_LAYERS = 9;
const place = (locationId, environmentId) => Object.freeze({ locationId, environmentId });
// Existing scenario ids / presentation environments only. No catalog environment exists yet for zeus/international.
const SEGMENT_PALETTES = Object.freeze([
  [place("urban", "riverside"), place("raimon-training", "training"), place("urban", "metropolitan")],
  [place("royal-academy", "academy"), place("urban", "metropolitan"), place("raimon-training", "training")],
  [place("zeus", null), place("international", null), place("royal-academy", "academy")],
  [place("international", null), place("zeus", null), place("urban", "metropolitan")],
  [place("international", null), place("zeus", null), place("royal-academy", "academy")],
].map(Object.freeze));
const BOSS_PLACES = Object.freeze({
  10: place("royal-academy", "academy"), 20: place("zeus", null), 30: place("international", null),
  40: place("international", null), 50: place("international", null),
});
// widths[i] = nodes in layer i+1 of the segment; lanes = transitions k (layer k -> k+1) that stay on parallel lanes.
const template = (id, widths, lanes) => Object.freeze({ id, widths: Object.freeze(widths), lanes: Object.freeze(lanes) });
export const GRAPH_TEMPLATES = Object.freeze([
  template("A", [2, 2, 3, 3, 2, 2, 1, 3, 3], [3, 5]),
  template("B", [3, 3, 3, 2, 2, 2, 1, 2, 2], [1, 4, 8]),
  template("C", [2, 2, 2, 3, 3, 3, 2, 2, 1], [1, 4, 7]),
  template("D", [3, 2, 1, 2, 3, 3, 2, 1, 2], [5]),
  template("E", [2, 3, 3, 2, 1, 2, 3, 3, 2], [2, 7]),
  template("F", [3, 3, 2, 2, 1, 3, 2, 2, 2], [1, 3, 7]),
  template("G", [3, 2, 2, 3, 3, 2, 1, 2, 3], [2, 4]),
]);

const segmentOf = wave => Math.ceil(wave / 10);
const segmentStart = segment => (segment - 1) * 10 + 1;
const pad = wave => String(wave).padStart(2, "0");
const laneName = lane => String.fromCharCode(97 + lane);
const contentKey = n => `${n.type}|${n.locationId}|${n.environmentId}`;

function hashKey(text) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) { h = Math.imul(h ^ text.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}
// One independent stream per (seed, key): decisions never depend on call order or on each other.
function stream(seed, key, version = GRAPH_ALGORITHM.version) {
  let a = hashKey(`ow2/graph/v${version}|${seed}|${key}`);
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normalizeSeed(seed) {
  if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > 0xFFFFFFFF) {
    throw new RangeError("Il seed del grafo deve essere un intero a 32 bit senza segno.");
  }
  return seed >>> 0;
}
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
function weightedType(weights, roll) {
  let n = roll * NODE_TYPES.reduce((sum, t) => sum + weights[t], 0);
  let last = NODE_TYPES[0];
  for (const t of NODE_TYPES) {
    if (weights[t] <= 0) continue;
    last = t;
    if ((n -= weights[t]) < 0) return t;
  }
  return last;
}
function shuffle(items, rng) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// Lane-index edges between two adjacent layers.
function transitionEdges(a, b, isLane, rng) {
  const edges = new Set();
  const add = (from, to) => edges.add(`${from}>${to}`);
  if (a === 1) for (let t = 0; t < b; t++) add(0, t);
  else if (b === 1) for (let i = 0; i < a; i++) add(i, 0);
  else if (isLane) for (let i = 0; i < a; i++) add(i, i);
  else {
    const centre = i => Math.round(i * (b - 1) / (a - 1));
    for (let i = 0; i < a; i++) {
      const c = centre(i);
      add(i, c); add(i, c === 0 ? 1 : c === b - 1 ? c - 1 : c + (rng() < 0.5 ? -1 : 1));
    }
    for (let t = 0; t < b; t++) {
      if ([...edges].some(e => e.endsWith(`>${t}`))) continue;
      let best = 0;
      for (let i = 1; i < a; i++) if (Math.abs(centre(i) - t) < Math.abs(centre(best) - t)) best = i;
      add(best, t);
    }
  }
  return [...edges].map(e => e.split(">").map(Number)).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}

export function generateOverworldGraphV2(seed, options = {}) {
  const s = normalizeSeed(seed);
  const version = options.algorithmVersion ?? GRAPH_ALGORITHM.version;
  if (version !== GRAPH_ALGORITHM.version) throw new RangeError(`Versione algoritmo grafo non supportata: ${version}`);
  const weights = { ...DEFAULT_TYPE_WEIGHTS, ...(options.typeWeights || {}) };
  if (NODE_TYPES.some(t => !Number.isFinite(weights[t]) || weights[t] < 0) || !NODE_TYPES.some(t => weights[t] > 0)) {
    throw new RangeError("Pesi dei tipi di tappa non validi.");
  }
  const pool = options.templateIds ? GRAPH_TEMPLATES.filter(t => options.templateIds.includes(t.id)) : GRAPH_TEMPLATES;

  const layers = new Map();
  const segments = [], chosen = [];
  for (let seg = 1; seg <= SEGMENTS; seg++) {
    const lo = segmentStart(seg), bossWave = seg * 10;
    const eligible = pool.filter(t => (seg > 1 || t.widths[0] === 3)
      && Object.keys(RESERVED_WAVES).every(w => segmentOf(+w) !== seg || +w === bossWave || t.widths[+w - lo] === 1));
    if (!eligible.length) throw new RangeError(`Nessun template disponibile per il segmento ${seg}.`);
    const tpl = eligible[Math.floor(stream(s, `segment/${seg}/template`, version)() * eligible.length)];
    const palette = SEGMENT_PALETTES[seg - 1];
    const lanes = shuffle([0, 1, 2], stream(s, `segment/${seg}/lanes`, version)).map(i => palette[i]);
    segments.push({ segment: seg, fromWave: lo, toWave: bossWave - 1, bossWave, templateId: tpl.id, lanes });

    tpl.widths.forEach((width, i) => {
      const wave = lo + i;
      const reserved = RESERVED_WAVES[wave];
      layers.set(wave, Array.from({ length: width }, (_, lane) => {
        const type = wave === 1 ? "battle" : reserved ? reserved.type : weightedType(weights, stream(s, `type/${wave}/${lane}`, version)());
        return { nodeId: `ow2:w${pad(wave)}:${laneName(lane)}`, wave, segment: seg, lane, type,
          locationId: lanes[lane].locationId, environmentId: lanes[lane].environmentId, boss: null,
          hooks: reserved ? [reserved.entryId] : [], next: [] };
      }));
    });
    const b = BOSSES[bossWave], bp = BOSS_PLACES[bossWave];
    layers.set(bossWave, [{ nodeId: `ow2:w${pad(bossWave)}:boss`, wave: bossWave, segment: seg, lane: 0, type: "battle",
      locationId: bp.locationId, environmentId: bp.environmentId,
      boss: { wave: bossWave, encounterType: b.encounterType, teamId: b.teamId, team: b.team }, hooks: [], next: [] }]);
    chosen.push(tpl);
  }

  for (let wave = 1; wave < FINAL_WAVE; wave++) {
    const from = layers.get(wave), to = layers.get(wave + 1), seg = segmentOf(wave);
    const k = wave - segmentStart(seg) + 1;
    const tpl = chosen[seg - 1];
    const isLane = wave % 10 !== 0 && k <= 8 && tpl.lanes.includes(k) && from.length === to.length && from.length > 1;
    for (const [i, t] of transitionEdges(from.length, to.length, isLane, stream(s, `transition/${wave}`, version))) from[i].next.push(to[t].nodeId);
  }

  const nodes = [...layers.keys()].sort((x, y) => x - y).flatMap(w => layers.get(w));
  enforceCombatPacing(nodes);
  enforceRouteQuality(nodes, s);
  return deepFreeze({
    revision: OVERWORLD_V2_REVISION, algorithm: GRAPH_ALGORITHM.id, algorithmVersion: version, seed: s,
    finalWave: FINAL_WAVE, checkpoints: [...CHECKPOINT_WAVES],
    config: { typeWeights: Object.fromEntries(NODE_TYPES.map(t => [t, weights[t]])), templateIds: pool.map(t => t.id) },
    segments: segments.map(({ segment, fromWave, toWave, bossWave, templateId, lanes }) => ({ segment, fromWave, toWave, bossWave, templateId, lanes })),
    nodes,
  });
}

// Derived read-only indexes, cached per immutable graph object (never serialized).
const indexes = new WeakMap();
function indexOf(graph) {
  let index = indexes.get(graph);
  if (!index) {
    index = { byId: new Map(), byWave: new Map() };
    for (const n of graph.nodes) {
      index.byId.set(n.nodeId, n);
      if (!index.byWave.has(n.wave)) index.byWave.set(n.wave, []);
      index.byWave.get(n.wave).push(n);
    }
    indexes.set(graph, index);
  }
  return index;
}
export const getGraphNode = (graph, nodeId) => indexOf(graph).byId.get(nodeId) ?? null;
export const nodesAtWave = (graph, wave) => [...(indexOf(graph).byWave.get(wave) ?? [])];
export const startNodes = graph => nodesAtWave(graph, 1);
export function nextOptions(graph, nodeId) {
  const node = getGraphNode(graph, nodeId);
  if (!node) throw new Error(`Nodo sconosciuto: ${nodeId}`);
  return node.next.map(id => getGraphNode(graph, id));
}
export const isValidLink = (graph, fromId, toId) => {
  const from = getGraphNode(graph, fromId), to = getGraphNode(graph, toId);
  return !!from && !!to && to.wave === from.wave + 1 && from.next.includes(toId);
};
export const serializeOverworldGraphV2 = graph => JSON.stringify(graph);
export function fingerprintOverworldGraphV2(graph) {
  const text = serializeOverworldGraphV2(graph);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h.toString(16).padStart(8, "0");
}

// Walks one complete path without touching the graph. `choose(options, { wave, path })` returns a node or nodeId.
export function walkOverworldPathV2(graph, choose = options => options[0]) {
  const nodes = [], alternatives = [];
  let options = startNodes(graph);
  for (let wave = 1; wave <= graph.finalWave; wave++) {
    if (!options.length) throw new Error(`Percorso interrotto alla wave ${wave}.`);
    const picked = choose([...options], { wave, path: nodes.map(n => n.nodeId) });
    const id = typeof picked === "string" ? picked : picked?.nodeId;
    const node = options.find(o => o.nodeId === id);
    if (!node) throw new Error(`Scelta non valida alla wave ${wave}.`);
    if (options.length > 1) alternatives.push({ wave, chosen: node.nodeId, others: options.filter(o => o !== node).map(o => o.nodeId) });
    nodes.push(node);
    options = node.next.map(n => getGraphNode(graph, n));
  }
  if (options.length) throw new Error("Il percorso supera l'ultima wave.");
  return { nodeIds: nodes.map(n => n.nodeId), nodes, alternatives };
}
// Deterministic chooser for diagnostics/tests; independent of the graph streams and of query order.
export const seededChooser = seed => {
  const s = normalizeSeed(seed);
  return (options, { wave }) => options[Math.floor(stream(s, `walk/${wave}`)() * options.length)];
};

function analyse(nodes) {
  const byId = new Map(nodes.map(n => [n.nodeId, n]));
  const prev = new Map(nodes.map(n => [n.nodeId, []]));
  for (const n of nodes) for (const id of n.next) prev.get(id)?.push(n);
  return { byId, prev, order: [...nodes].sort((a, b) => a.wave - b.wave) };
}
// The generator supplies fresh nodes in wave order, with only wave N -> N+1 edges.
// incoming[id] is the maximum suffix arriving through ALL predecessors, including merges.
// Induction: every retained non-battle node ends a suffix <=4; a necessary battle resets it to zero.
// The forced battle is the bounded fallback for any weights. O(V+E), no RNG draws or retry budget.
function enforceCombatPacing(nodes) {
  const incoming = new Map();
  for (const n of nodes) {
    const before = incoming.get(n.nodeId) ?? 0;
    if (n.type !== "battle" && before >= MAX_NON_BATTLE_RUN) n.type = "battle";
    const suffix = n.type === "battle" ? 0 : before + 1;
    for (const id of n.next) incoming.set(id, Math.max(incoming.get(id) ?? 0, suffix));
  }
}
// Min/max over all start->end paths by dynamic programming (no path enumeration).
function pathRange(order, prev, value, startWave = 1, endWave = FINAL_WAVE) {
  const lo = new Map(), hi = new Map();
  for (const n of order) {
    if (n.wave < startWave || n.wave > endWave) continue;
    const before = n.wave === startWave ? [] : prev.get(n.nodeId).filter(p => lo.has(p.nodeId));
    lo.set(n.nodeId, value(n) + (before.length ? Math.min(...before.map(p => lo.get(p.nodeId))) : 0));
    hi.set(n.nodeId, value(n) + (before.length ? Math.max(...before.map(p => hi.get(p.nodeId))) : 0));
  }
  const ends = order.filter(n => n.wave === endWave);
  return { min: Math.min(...ends.map(n => lo.get(n.nodeId))), max: Math.max(...ends.map(n => hi.get(n.nodeId))) };
}
const isChoice = n => n.next.length >= 2;
function longestForcedRun(order, prev) {
  const run = new Map();
  let best = 0;
  for (const n of order) {
    const r = n.next.length === 1 ? 1 + Math.max(0, ...prev.get(n.nodeId).map(p => run.get(p.nodeId) ?? 0)) : 0;
    run.set(n.nodeId, r); best = Math.max(best, r);
  }
  return best;
}
function longestNonBattleRun(order, prev) {
  // Exact maximum over all paths, not a sampled walk. At a merge the largest predecessor
  // suffix dominates all shorter histories for this metric. Only the battle descriptor resets it.
  const run = new Map();
  let best = 0;
  for (const n of order) {
    const r = n.type === "battle" ? 0 : 1 + Math.max(0, ...prev.get(n.nodeId).map(p => run.get(p.nodeId) ?? 0));
    run.set(n.nodeId, r); best = Math.max(best, r);
  }
  return best;
}

export function validateOverworldGraphV2(graph, options = {}) {
  const { minChoicesPerSegment, maxForcedRun } = { ...DEFAULT_VALIDATION, ...options };
  const errors = [];
  if (!graph || graph.revision !== OVERWORLD_V2_REVISION || graph.algorithm !== GRAPH_ALGORITHM.id
    || graph.finalWave !== FINAL_WAVE || !Array.isArray(graph.nodes)) return { valid: false, errors: ["Struttura del grafo non valida."] };
  const ids = new Set();
  const scenarios = new Map(SCENARIOS.map(sc => [sc.id, sc]));
  for (const n of graph.nodes) {
    if (typeof n.nodeId !== "string" || !n.nodeId) errors.push("nodeId mancante");
    else if (ids.has(n.nodeId)) errors.push(`nodeId duplicato: ${n.nodeId}`);
    ids.add(n.nodeId);
    if (!Number.isInteger(n.wave) || n.wave < 1 || n.wave > FINAL_WAVE) errors.push(`Wave non valida: ${n.nodeId}`);
    if (!NODE_TYPES.includes(n.type)) errors.push(`Tipo non valido: ${n.nodeId}`);
    if (!Array.isArray(n.next)) errors.push(`Archi mancanti: ${n.nodeId}`);
    const sc = scenarios.get(n.locationId);
    if (!sc || n.wave < sc.waveRange.from || (sc.waveRange.to != null && n.wave > sc.waveRange.to)) errors.push(`Località non disponibile: ${n.nodeId}`);
    if (n.environmentId !== null && !ENVIRONMENTS[n.environmentId]) errors.push(`Ambiente sconosciuto: ${n.nodeId}`);
  }
  if (errors.length) return { valid: false, errors };
  const { byId, prev, order } = analyse(graph.nodes);
  for (let w = 1; w <= FINAL_WAVE; w++) if (!order.some(n => n.wave === w)) errors.push(`Layer mancante: W${w}`);
  for (const n of graph.nodes) {
    if (new Set(n.next).size !== n.next.length) errors.push(`Archi duplicati: ${n.nodeId}`);
    for (const id of n.next) {
      const t = byId.get(id);
      if (!t) errors.push(`Arco verso nodo inesistente: ${n.nodeId}`);
      else if (t.wave !== n.wave + 1) errors.push(`Arco non consecutivo: ${n.nodeId} -> ${id}`);
    }
    if (n.wave < FINAL_WAVE && !n.next.length) errors.push(`Vicolo cieco: ${n.nodeId}`);
    if (n.wave === FINAL_WAVE && n.next.length) errors.push(`Uscita dalla W50: ${n.nodeId}`);
  }
  if (errors.length) return { valid: false, errors };

  // Acyclicity independent of the wave rule (Kahn).
  const indeg = new Map(graph.nodes.map(n => [n.nodeId, prev.get(n.nodeId).length]));
  const queue = graph.nodes.filter(n => !indeg.get(n.nodeId));
  let seen = 0;
  while (queue.length) {
    const n = queue.pop();
    seen++;
    for (const id of n.next) { indeg.set(id, indeg.get(id) - 1); if (indeg.get(id) === 0) queue.push(byId.get(id)); }
  }
  if (seen !== graph.nodes.length) errors.push("Il grafo contiene un ciclo");
  // Entry layer is the only source; everything reaches the final layer.
  const reached = new Set(order.filter(n => n.wave === 1).map(n => n.nodeId));
  for (const n of order) if (reached.has(n.nodeId)) n.next.forEach(id => reached.add(id));
  for (const n of graph.nodes) if (!reached.has(n.nodeId)) errors.push(`Nodo irraggiungibile: ${n.nodeId}`);
  const toEnd = new Set(order.filter(n => n.wave === FINAL_WAVE).map(n => n.nodeId));
  for (const n of [...order].reverse()) if (n.next.some(id => toEnd.has(id))) toEnd.add(n.nodeId);
  for (const n of graph.nodes) if (!toEnd.has(n.nodeId)) errors.push(`Nodo senza conclusione: ${n.nodeId}`);
  if (errors.length) return { valid: false, errors };

  const length = pathRange(order, prev, () => 1);
  if (length.min !== FINAL_WAVE || length.max !== FINAL_WAVE) errors.push(`Lunghezza percorsi non uniforme: ${length.min}-${length.max}`);
  const bossWaves = Object.keys(BOSSES).map(Number).sort((a, b) => a - b);
  if (bossWaves.join() !== CHECKPOINT_WAVES.join()) errors.push("BOSSES non coincide con i checkpoint canonici");
  for (const w of CHECKPOINT_WAVES) {
    const layer = order.filter(n => n.wave === w), boss = BOSSES[w];
    if (layer.length !== 1) { errors.push(`Il checkpoint W${w} deve essere un nodo unico`); continue; }
    if (layer[0].type !== "battle") errors.push(`Il checkpoint W${w} deve essere battle`);
    const b = layer[0].boss;
    if (!b || b.wave !== w || b.encounterType !== boss?.encounterType || b.teamId !== boss?.teamId || b.team !== boss?.team) errors.push(`Boss W${w} incoerente con BOSSES`);
  }
  for (const n of graph.nodes) if (n.boss && !CHECKPOINT_WAVES.includes(n.wave)) errors.push(`Boss fuori checkpoint: ${n.nodeId}`);
  for (let w = 1; w <= FINAL_WAVE; w++) {
    const layer = order.filter(n => n.wave === w);
    if (new Set(layer.map(contentKey)).size !== layer.length) errors.push(`Nodi logicamente identici in W${w}`);
  }
  for (const n of graph.nodes) {
    const kids = n.next.map(id => byId.get(id));
    if (new Set(kids.map(contentKey)).size !== kids.length) errors.push(`Biforcazione senza differenze reali: ${n.nodeId}`);
  }
  for (const n of graph.nodes) {
    const reserved = RESERVED_WAVES[n.wave];
    const hooks = reserved ? [reserved.entryId] : [];
    if (JSON.stringify(n.hooks) !== JSON.stringify(hooks)) errors.push(`Hook riservati non validi: ${n.nodeId}`);
  }
  for (const [w, reserved] of Object.entries(RESERVED_WAVES)) {
    const layer = order.filter(n => n.wave === +w);
    if (layer.length !== 1 || layer[0].type !== reserved.type) errors.push(`W${w} deve restare un unico nodo ${reserved.type} (${reserved.entryId})`);
  }
  for (let seg = 1; seg <= SEGMENTS; seg++) {
    const lo = segmentStart(seg), hi = seg * 10 - 1;
    const choices = pathRange(order, prev, n => (isChoice(n) ? 1 : 0), seg === 1 ? 1 : lo - 1, hi);
    const entry = seg === 1 && order.filter(n => n.wave === 1).length >= 2 ? 1 : 0;
    if (choices.min + entry < minChoicesPerSegment) errors.push(`Segmento ${seg}: scelte insufficienti (${choices.min + entry})`);
  }
  const forced = longestForcedRun(order, prev);
  if (forced > maxForcedRun) errors.push(`Troppe wave senza scelta consecutive: ${forced}`);
  const nonBattle = longestNonBattleRun(order, prev);
  if (nonBattle > MAX_NON_BATTLE_RUN) errors.push(`Troppe tappe non-battle consecutive: ${nonBattle} (massimo ${MAX_NON_BATTLE_RUN})`);
  const quality = inspectQuality(qualityContext(graph.nodes));
  if (quality.maxEscape > MAX_BATTLE_ESCAPE) errors.push(`Uscita dai combattimenti troppo distante: ${quality.maxEscape}`);
  for (const e of quality.access) for (const t of requiredFor(e.segment)) {
    if (!(e.reachable & typeBit(t))) errors.push(`Opportunità ${t} irraggiungibile da ${e.nodeId}`);
    if (e.unavoidable & typeBit(t)) errors.push(`Opportunità ${t} obbligatoria da ${e.nodeId}`);
  }
  return { valid: errors.length === 0, errors };
}
export function assertValidOverworldGraphV2(graph, options) {
  const result = validateOverworldGraphV2(graph, options);
  if (!result.valid) throw new Error(`Grafo Overworld V2 non valido: ${result.errors.slice(0, 5).join("; ")}`);
  return graph;
}

// Diagnostics only: structural counts, per-wave alternatives and per-path (not per-graph) type ranges.
export function summarizeOverworldGraphV2(graph) {
  const { prev, order } = analyse(graph.nodes);
  const widthByWave = Array.from({ length: graph.finalWave }, (_, i) => order.filter(n => n.wave === i + 1).length);
  const forks = graph.nodes.filter(n => n.next.length >= 2);
  const joins = graph.nodes.filter(n => prev.get(n.nodeId).length >= 2);
  const paths = new Map();
  for (const n of order) paths.set(n.nodeId, n.wave === 1 ? 1n : prev.get(n.nodeId).reduce((sum, p) => sum + paths.get(p.nodeId), 0n));
  const perType = Object.fromEntries(NODE_TYPES.map(t => [t, pathRange(order, prev, n => (n.type === t ? 1 : 0))]));
  const segments = graph.segments.map(sg => {
    const choices = pathRange(order, prev, n => (isChoice(n) ? 1 : 0), sg.segment === 1 ? 1 : sg.fromWave - 1, sg.toWave);
    const inSeg = graph.nodes.filter(n => n.wave >= sg.fromWave && n.wave <= sg.toWave);
    return { segment: sg.segment, templateId: sg.templateId, nodes: inSeg.length, forkNodes: inSeg.filter(isChoice).length,
      joinNodes: inSeg.filter(n => prev.get(n.nodeId).length >= 2).length,
      // As with `nodes`, these diagnostics cover fromWave..toWave (the nine waves BEFORE the boss).
      nodeTypeCounts: Object.fromEntries(NODE_TYPES.map(t => [t, inSeg.filter(n => n.type === t).length])),
      perPathTypeCounts: Object.fromEntries(NODE_TYPES.map(t => [t, pathRange(order, prev, n => (n.type === t ? 1 : 0), sg.fromWave, sg.toWave)])),
      minChoicesPerPath: choices.min + (sg.segment === 1 ? 1 : 0), maxChoicesPerPath: choices.max + (sg.segment === 1 ? 1 : 0) };
  });
  return {
    nodeCount: graph.nodes.length, edgeCount: graph.nodes.reduce((sum, n) => sum + n.next.length, 0),
    forkCount: forks.length, joinCount: joins.length, widthByWave, maxWidth: Math.max(...widthByWave),
    forkWaves: [...new Set(forks.map(n => n.wave))], joinWaves: [...new Set(joins.map(n => n.wave))],
    pathCount: order.filter(n => n.wave === graph.finalWave).reduce((sum, n) => sum + paths.get(n.nodeId), 0n).toString(),
    routeQuality: routeQualityV2(graph),
    segments, perPath: { typeCounts: perType, longestForcedRun: longestForcedRun(order, prev), longestNonBattleRun: longestNonBattleRun(order, prev) },
  };
}

// P1c: shortest further distance after a battle to a non-battle or completed W50.
// Existential route on the DAG, NOT a cap on voluntarily selected battle sequences.
export const MAX_BATTLE_ESCAPE = 6;
export const ESSENTIAL_TYPES = Object.freeze(["recruit", "shop", "training"]);
const typeBit = type => 1 << NODE_TYPES.indexOf(type);
const requiredFor = segment => [...ESSENTIAL_TYPES, ...(segment === 1 ? ["event"] : [])];
const bitCount = bits => NODE_TYPES.reduce((sum, t) => sum + ((bits & typeBit(t)) ? 1 : 0), 0);

// Potential immediate content with equal run inputs, not a particular random outcome.
// Mirrors engine.generateWaveNode's tier gates without calling any content RNG.
// Version ids also identify team membership; recruit includes its 80%/20% tier cases.
// Ownership, rules and seenEvents remain run-dependent. Environments are presentation.
const profileCache = new Map();
export function gameplaySignatureV2(node) {
  if (!["battle", "recruit"].includes(node.type)) return node.type + "|" + node.wave;
  if (node.boss) return JSON.stringify(["boss", node.wave, node.boss]);
  const key = [node.type, node.wave, node.locationId].join("|");
  if (!profileCache.has(key)) {
    const tier = node.wave < 8 ? 1 : node.wave < 18 ? 2 : 3;
    const pools = (node.type === "recruit" ? [tier, tier + 1] : [tier]).map(level => {
      const rows = scenarioPool(node.locationId, node.wave, level);
      const total = rows.reduce((sum, r) => sum + r.weight, 0);
      return rows.map(r => [r.version.versionId, r.weight / total]);
    });
    profileCache.set(key, JSON.stringify([node.type, node.wave, pools]));
  }
  return profileCache.get(key);
}
function qualityContext(nodes) {
  const order = [...nodes].sort((a, b) => a.wave - b.wave || (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0));
  const byId = new Map(order.map((n, i) => [n.nodeId, i]));
  const next = order.map(n => n.next.map(id => byId.get(id)));
  const entries = [];
  for (let segment = 1; segment <= SEGMENTS; segment++) {
    const sources = order.filter(n => n.wave === (segment === 1 ? 1 : (segment - 1) * 10));
    for (const source of sources) entries.push({
      segment, nodeId: source.nodeId, required: requiredFor(segment).reduce((mask, t) => mask | typeBit(t), 0),
      starts: segment === 1 ? [byId.get(source.nodeId)] : next[byId.get(source.nodeId)],
    });
  }
  const groups = [order.map((n, i) => n.wave === 1 ? i : -1).filter(i => i >= 0), ...next.filter(ids => ids.length > 1)];
  return { order, next, entries, groups };
}
function inspectQuality(context, includeProfiles = false) {
  const { order, next, entries, groups } = context;
  const nonBattle = [], escape = [], available = [], mandatory = [];
  let maxNonBattle = 0, maxEscape = 0, escapeExcess = 0;
  for (let i = order.length - 1; i >= 0; i--) {
    const n = order[i], kids = next[i];
    nonBattle[i] = n.type === "battle" ? 0 : 1 + Math.max(0, ...kids.map(k => nonBattle[k]));
    escape[i] = n.type !== "battle" || n.wave === FINAL_WAVE ? 0 : 1 + Math.min(...kids.map(k => escape[k]));
    maxNonBattle = Math.max(maxNonBattle, nonBattle[i]);
    maxEscape = Math.max(maxEscape, escape[i]);
    escapeExcess += Math.max(0, escape[i] - MAX_BATTLE_ESCAPE);
    // Opportunity queries stop at each segment's closing boss.
    available[i] = n.wave % 10 === 0 ? 0 : typeBit(n.type) | kids.reduce((mask, k) => mask | available[k], 0);
    mandatory[i] = n.wave % 10 === 0 ? 0 : typeBit(n.type) | kids.reduce((mask, k) => mask & mandatory[k], 31);
  }
  let missing = 0, forced = 0;
  const access = entries.map(e => {
    const reachable = e.starts.reduce((mask, i) => mask | available[i], 0);
    const unavoidable = e.starts.reduce((mask, i) => mask & mandatory[i], 31);
    missing += bitCount(e.required & ~reachable);
    forced += bitCount(e.required & unavoidable);
    return { segment: e.segment, nodeId: e.nodeId, required: e.required, reachable, unavoidable };
  });
  const redundant = [];
  if (includeProfiles) for (const group of groups) for (let a = 0; a < group.length; a++) for (let b = a + 1; b < group.length; b++) {
    if (gameplaySignatureV2(order[group[a]]) === gameplaySignatureV2(order[group[b]])) {
      redundant.push([order[group[a]].nodeId, order[group[b]].nodeId]);
    }
  }
  return { maxNonBattle, maxEscape, escapeExcess, missing, forced, access, escape, redundant };
}
export function routeQualityV2(graph) {
  const context = qualityContext(graph.nodes);
  const q = inspectQuality(context, true);
  return {
    maxBattleEscape: q.maxEscape,
    battleEscapeByNode: Object.fromEntries(context.order.map((n, i) => [n.nodeId, q.escape[i]])),
    opportunities: q.access.map(e => ({
      segment: e.segment, fromNodeId: e.nodeId,
      types: Object.fromEntries(NODE_TYPES.filter(t => e.required & typeBit(t)).map(t => [t, {
        reachable: !!(e.reachable & typeBit(t)), avoidable: !(e.unavoidable & typeBit(t)),
      }])),
    })),
    redundantOptionPairs: q.redundant,
  };
}
function enforceRouteQuality(nodes, seed) {
  const context = qualityContext(nodes), { order, next, entries } = context;
  const mutable = n => n.wave !== 1 && !n.boss && !RESERVED_WAVES[n.wave];
  const candidates = shuffle(order.filter(mutable), stream(seed, "quality/candidates"));
  const types = shuffle(NODE_TYPES, stream(seed, "quality/types"));
  // Establish bypasses with minimum edits along actual paths. Non-battle -> battle
  // cannot break the non-battle bound or a previously established category bypass.
  for (const e of entries) for (const type of requiredFor(e.segment)) {
    const cost = new Map(), step = new Map(), end = e.segment * 10;
    for (let i = order.length - 1; i >= 0; i--) {
      const n = order[i];
      if (n.wave < segmentStart(e.segment) || n.wave > end) continue;
      if (n.wave === end) { cost.set(i, 0); continue; }
      const best = [...next[i]].sort((a, b) => cost.get(a) - cost.get(b) || a - b)[0];
      cost.set(i, (n.type === type ? 1 : 0) + cost.get(best)); step.set(i, best);
    }
    let i = [...e.starts].sort((a, b) => cost.get(a) - cost.get(b) || a - b)[0];
    while (order[i].wave < end) {
      if (order[i].type === type) order[i].type = "battle";
      i = step.get(i);
    }
  }
  const keepsCoverage = (before, after) => after.access.every((e, i) =>
    ((before.access[i].reachable & e.required) & ~e.reachable) === 0);
  const safe = q => q.maxNonBattle <= MAX_NON_BATTLE_RUN && q.forced === 0;
  // Missing (entry, category) pairs strictly decrease. A bounded two-node fallback
  // can free a crowded non-battle chain. Explicit failure never returns an invalid graph.
  let q = inspectQuality(context);
  while (q.missing) {
    const deficit = q.access.find(e => e.required & ~e.reachable);
    const type = types.find(t => deficit.required & ~deficit.reachable & typeBit(t));
    const local = candidates.filter(n => n.segment === deficit.segment && n.type !== type);
    let accepted = false;
    for (const release of [null, ...candidates.filter(n => n.segment === deficit.segment && n.type !== "battle")]) {
      for (const n of local) {
        if (n === release) continue;
        const old = n.type, released = release?.type;
        n.type = type;
        if (release) release.type = "battle";
        const after = inspectQuality(context);
        if (safe(after) && after.missing < q.missing && keepsCoverage(q, after)) {
          q = after; accepted = true; break;
        }
        n.type = old;
        if (release) release.type = released;
      }
      if (accepted) break;
    }
    if (!accepted) throw new Error("Conflitto P1c: opportunità opzionali e pacing non conciliabili.");
  }
  // Strictly decreasing escape excess, at most V battle -> non-battle edits.
  while (q.escapeExcess) {
    let accepted = false;
    for (const n of candidates.filter(n => n.type === "battle")) {
      for (const type of types.filter(t => t !== "battle")) {
        n.type = type;
        const after = inspectQuality(context);
        if (safe(after) && !after.missing && after.escapeExcess < q.escapeExcess) {
          q = after; accepted = true; break;
        }
        n.type = "battle";
      }
      if (accepted) break;
    }
    if (!accepted) throw new Error("Conflitto P1c: uscita dai combattimenti e opportunità non conciliabili.");
  }
  // Optional refinement: pair count strictly decreases and hard constraints stay valid.
  // Locked W1 profiles or local minima remain visible in diagnostics for P2/P3.
  q = inspectQuality(context, true);
  while (q.redundant.length) {
    const involved = new Set(q.redundant.flat());
    let accepted = false;
    for (const n of candidates.filter(n => involved.has(n.nodeId))) {
      const old = n.type;
      for (const type of types.filter(t => t !== old)) {
        n.type = type;
        const after = inspectQuality(context, true);
        if (safe(after) && !after.missing && !after.escapeExcess && after.redundant.length < q.redundant.length) {
          q = after; accepted = true; break;
        }
        n.type = old;
      }
      if (accepted) break;
    }
    if (!accepted) break;
  }
}
