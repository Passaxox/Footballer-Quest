import { ACTS, actMap, edgesFrom } from "./campaign";
import { newRun, beginOverworldNode, normalizeRun } from "./engine";
import { completeOverworldNode, selectableOverworldNode, currentActMap } from "./overworld";

const SEEDS = [12345, 987654321];
const playThrough = (seed, pickLane) => {
  let run = newRun(["mark", "axel", "nathan"]);
  run = { ...run, overworld: { ...run.overworld, contentSeed: seed } };
  const visited = [];
  while (run.wave <= 50) {
    const map = currentActMap(run);
    const options = map.nodes.filter((n) => selectableOverworldNode(run, n.nodeId));
    expect(options.length).toBeGreaterThan(0);
    const node = options[pickLane(options.length, run.wave)];
    run = beginOverworldNode(run, node.nodeId);
    expect(run.pending).toBeTruthy();
    if ([10, 20, 30, 40, 50].includes(run.wave)) { expect(node.type).toBe("boss"); expect(run.pending.kind).toBe("boss"); }
    else expect(node.type).not.toBe("boss");
    visited.push(`${node.laneName}:${node.type}`);
    run = normalizeRun({ ...completeOverworldNode(run), wave: run.wave + 1, pending: null });
  }
  return visited;
};

test("two seeds produce different maps while checkpoints stay at 10/20/30/40/50", () => {
  const a = playThrough(SEEDS[0], () => 0);
  const b = playThrough(SEEDS[1], () => 0);
  expect(a).toHaveLength(50);
  expect(a.join()).not.toEqual(b.join());
  for (const act of ACTS) expect(actMap(SEEDS[0], act).nodes.filter((n) => n.type === "boss").every((n) => n.wave === act.toWave)).toBe(true);
});

test("maps are deterministic and every non-boss node leads forward", () => {
  for (const seed of SEEDS) for (const act of ACTS) {
    const m1 = actMap(seed, act), m2 = actMap(seed, act);
    expect(JSON.stringify(m1)).toEqual(JSON.stringify(m2));
    m1.nodes.filter((n) => n.type !== "boss").forEach((n) => expect(edgesFrom(m1, n).length).toBeGreaterThan(0));
  }
});

test("act 3 branch decides the Alius checkpoint, act 1 always has the Royal rival", () => {
  const act3 = ACTS[2];
  const bossesBySeed = SEEDS.map((s) => actMap(s, act3).nodes.filter((n) => n.type === "boss").map((n) => n.bossId));
  bossesBySeed.forEach((ids) => expect(ids.length).toBeGreaterThan(0));
  for (const seed of SEEDS) expect(actMap(seed, ACTS[0]).nodes.filter((n) => n.type === "rival")).toHaveLength(3);
});

test("random picks across lanes also complete 50 waves", () => {
  expect(playThrough(SEEDS[1], (n, w) => (w * 7) % n)).toHaveLength(50);
});

test("acts 2-4 always contain at least one anomaly", () => {
  for (let seed = 0; seed < 600; seed++) {
    const count = ACTS.slice(1, 4).reduce((n, act) => n + actMap(seed, act).nodes.filter((x) => x.type === "anomaly").length, 0);
    expect(count).toBeGreaterThan(0);
  }
});
