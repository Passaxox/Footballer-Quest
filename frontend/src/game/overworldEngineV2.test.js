import * as engine from "./engine";
import { resolveVersion } from "./catalog";
import * as state from "./overworldRunV2";
import * as storage from "./storage";
import { resolveOverworldActionV2 as resolve } from "./overworldActionsV2";
import * as graphModule from "./overworldGraphV2";
import { nodeRandom } from "./overworld";
import { scenarioPool } from "./scenarios";
import { BOSSES, STARTER_IDS } from "./data";
import { getRules, DIFFICULTIES } from "./rules";

const starters = STARTER_IDS.slice(0, 3), key = "inazuma_rogue_run";
const fresh = (seed = 42, options = {}) => engine.newRunV2(starters, seed, "normal", options);
const act = (run, action) => resolve(run, { ...state.actionTokenV2(run), ...action });
const clone = value => JSON.parse(JSON.stringify(value));
function beforeNode(seed, node) {
  const run = fresh(seed), graph = state.graphForRunV2(run), path = [];
  let current = node;
  while (current.wave > 1) {
    current = graph.nodes.find(n => n.next.includes(current.nodeId));
    path.unshift(current.nodeId);
  }
  return { ...run, wave: node.wave, overworld: { ...run.overworld, completedWave: node.wave - 1, path } };
}
function withType(type, seed = 42) {
  const graph = state.graphForRunV2(fresh(seed));
  const node = graph.nodes.find(n => n.type === type && !n.boss);
  return engine.beginOverworldNode(beforeNode(seed, node), node.nodeId);
}
function settle(run, result = "win") {
  let team = run.team, report = null;
  if (result === "win") for (const enemy of run.pending.enemies) {
    const award = engine.grantCombatXp(team, run.activeUid, enemy.level, run.pending.kind === "boss", run.rulesetId);
    team = award.team; report = engine.mergeXpReports(report, award.report);
  }
  return act(run, { type: "battleResult", result, team, items: run.items, activeUid: run.activeUid, report });
}
function finish(run) {
  let r = run, guard = 0;
  while (r.pending && !r.overworld.result && guard++ < 10) {
    switch (r.pending.type) {
      case "battle": r = settle(r); break;
      case "recruit": r = act(r, { type: "skipRecruit" }); break;
      case "reward": r = act(r, { type: "reward", id: r.pending.context.rewards[0] }); break;
      case "shop": r = act(r, { type: "leave" }); break;
      case "training": r = act(r, { type: "train", drill: "xp" }); break;
      case "event": r = act(r, r.pending.result ? { type: "resolveEvent" } : { type: "chooseEvent", index: 0 }); break;
      default: throw Error("Unexpected pending");
    }
  }
  expect(guard).toBeLessThan(10);
  return r;
}
beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

test("V1 remains default; V2 is explicit, compact and persists exact seeds/version", () => {
  expect(engine.newRun(starters).overworld.revision).toBe(1);
  const run = fresh(0, { contentSeed: 0xffffffff });
  expect(run.overworld).toMatchObject({ revision: 2, seed: 0, contentSeed: 0xffffffff, algorithmVersion: 3, completedWave: 0, path: [], selectedNodeId: null });
  expect(run.saveVersion).toBe(2);
  expect(run.overworld.nodes).toBeUndefined();
  storage.saveRun(run);
  expect(storage.loadRun()).toEqual(run);
  expect(() => fresh(-1)).toThrow(/Seed/);
  expect(() => fresh(1, { algorithmVersion: 4 })).toThrow(/Versione/);
});

test("selection follows real edges and is atomic, pure and idempotent", () => {
  const run = fresh(), before = clone(run), graph = state.graphForRunV2(run);
  expect(state.selectableNodesV2(run)).toEqual(graphModule.startNodes(graph));
  expect(engine.beginOverworldNode(run, "missing")).toBe(run);
  expect(engine.beginOverworldNode(run, graph.nodes.find(n => n.wave === 2).nodeId)).toBe(run);
  expect(() => engine.generateWave(run)).toThrow(/Seleziona/);
  const first = state.selectableNodesV2(run)[0], selected = engine.beginOverworldNode(run, first.nodeId);
  expect(selected.pending.overworldNodeId).toBe(first.nodeId);
  expect(selected.pending.scenarioState).toEqual(selected.scenarioState);
  expect(selected.scenarioState.id).toBe(first.locationId);
  expect(state.selectableNodesV2(selected)).toEqual([]);
  expect(engine.beginOverworldNode(selected, first.nodeId)).toBe(selected);
  expect(run).toEqual(before);
  const done = finish(selected);
  expect(done.wave).toBe(2);
  expect(state.selectableNodesV2(done).map(n => n.nodeId)).toEqual(first.next);
  const inaccessible = graph.nodes.find(n => n.wave === 2 && !first.next.includes(n.nodeId));
  if (inaccessible) expect(engine.beginOverworldNode(done, inaccessible.nodeId)).toBe(done);
});

test.each([0, 1, 42, 0xffffffff])("50 waves, forks, merges and all five canonical checkpoints: seed %s", seed => {
  for (const last of [false, true]) {
    let run = fresh(seed), decisions = 0, merges = 0;
    const graph = state.graphForRunV2(run), checkpoints = [];
    for (let wave = 1; wave <= 50; wave++) {
      const options = state.selectableNodesV2(run);
      if (options.length > 1) decisions++;
      const node = last ? options.at(-1) : options[0];
      if (graph.nodes.filter(n => n.next.includes(node.nodeId)).length > 1) merges++;
      run = engine.beginOverworldNode(run, node.nodeId);
      expect(run.wave).toBe(wave);
      if (BOSSES[wave]) {
        checkpoints.push(wave);
        expect(run.pending.kind).toBe("boss");
        expect(run.pending.teamName).toBe(BOSSES[wave].team);
        expect(run.pending.enemies.map(p => p.versionId)).toEqual(BOSSES[wave].ids.map(id => resolveVersion(id).versionId));
      }
      storage.saveRun(run); run = storage.loadRun();
      run = finish(run);
      expect(run.overworld.completedWave).toBe(wave);
      expect(run.overworld.path).toHaveLength(wave);
      expect(new Set(run.overworld.path).size).toBe(wave);
      if (BOSSES[wave]) expect(run.team.every(p => p.hp === p.maxHp)).toBe(true);
      expect(run.wave).toBe(Math.min(50, wave + 1));
    }
    expect(checkpoints).toEqual([10, 20, 30, 40, 50]);
    expect(decisions).toBeGreaterThan(5); expect(merges).toBeGreaterThan(5);
    expect(run.overworld.result).toBe("win");
    expect(state.selectableNodesV2(run)).toEqual([]);
    storage.saveRun(run); expect(storage.loadRun()).toEqual(run);
  }
});

test.each(["battle", "recruit", "shop", "training", "event"])("reload %s: exact pending, no RNG, no mutation", type => {
  const run = withType(type), snapshot = clone(run);
  storage.saveRun(run);
  const forbidden = jest.spyOn(Math, "random").mockImplementation(() => { throw Error("reroll"); });
  const loaded = storage.loadRun();
  expect(loaded).toEqual(run);
  expect(engine.generateWave(loaded)).toBe(loaded.pending);
  expect(engine.beginOverworldNode(loaded, loaded.overworld.selectedNodeId)).toBe(loaded);
  expect(state.graphForRunV2(loaded)).toBe(state.graphForRunV2(run));
  expect(run).toEqual(snapshot); expect(forbidden).not.toHaveBeenCalled();
});

test("normalization and ordinary save do not generate or validate a whole graph", () => {
  const run = fresh(); storage.saveRun(run);
  const generate = jest.spyOn(graphModule, "generateOverworldGraphV2").mockImplementation(() => { throw Error("unexpected generation"); });
  const validate = jest.spyOn(graphModule, "validateOverworldGraphV2");
  for (let i = 0; i < 20; i++) storage.saveRun(engine.normalizeRun({ ...run, money: i }));
  expect(generate).not.toHaveBeenCalled(); expect(validate).not.toHaveBeenCalled();
});

test("shop payments, travel XP, training XP and rewards cannot be duplicated", () => {
  let run = { ...withType("shop"), money: 999 };
  const token = state.actionTokenV2(run), action = { ...token, type: "buy", index: 0 };
  const bought = resolve(run, action), entry = run.pending.stock[0];
  expect(bought.money).toBe(999 - entry.price);
  expect(resolve(bought, action)).toBe(bought);
  expect(act(bought, { type: "buy", index: 0 })).toBe(bought);
  const done = act(bought, { type: "leave" });
  expect(done.team).toEqual(bought.team.map(p => engine.gainXp(p, getRules(run.rulesetId).travelXp).player));
  expect(resolve(done, action)).toBe(done);
  run = withType("training");
  const trainingAction = { ...state.actionTokenV2(run), type: "train", drill: "xp" };
  const trained = resolve(run, trainingAction);
  expect(trained.team).toEqual(run.team.map(p => engine.gainXp(p, 30).player));
  expect(resolve(trained, trainingAction)).toBe(trained);
  run = withType("battle");
  const battleAction = { ...state.actionTokenV2(run), type: "battleResult", result: "win", team: run.team };
  let won = resolve(run, battleAction);
  expect(won.stats.wins).toBe(1); expect(resolve(won, battleAction)).toBe(won);
  if (won.pending.type === "recruit") won = act(won, { type: "skipRecruit" });
  storage.saveRun(won); won = storage.loadRun();
  const rewardAction = { ...state.actionTokenV2(won), type: "reward", id: won.pending.context.rewards[0] };
  const rewarded = resolve(won, rewardAction);
  expect(resolve(rewarded, rewardAction)).toBe(rewarded);
});

test("recruit payment and challenge reuse actual offer, caps and recruitment rules", () => {
  const run = { ...withType("recruit"), money: 9999 };
  expect(run.pending.player).toBeTruthy();
  const action = { ...state.actionTokenV2(run), type: "recruit" };
  const joined = resolve(run, action);
  expect(joined.money).toBe(run.money - run.pending.price);
  expect(joined.stats.recruits).toBe(1); expect(joined.team).toHaveLength(4);
  expect(resolve(joined, action)).toBe(joined);
  expect(act({ ...run, money: 0 }, { type: "recruit" }).pending).toEqual(run.pending);
  const challenge = act(run, { type: "challenge" });
  expect(challenge.pending.enemies[0]).toEqual(engine.recruitChallengePlayer(run.pending.player, run));
  storage.saveRun(challenge); expect(storage.loadRun()).toEqual(challenge);
});

test("event outcome is saved once, then effects are applied once", () => {
  const run = withType("event"), action = { ...state.actionTokenV2(run), type: "chooseEvent", index: 0 };
  const chosen = resolve(run, action);
  expect(chosen.pending.result).toBeTruthy(); expect(chosen.money).toBe(run.money);
  expect(resolve(chosen, action)).toBe(chosen);
  storage.saveRun(chosen); const loaded = storage.loadRun(); expect(loaded).toEqual(chosen);
  const resolution = { ...state.actionTokenV2(loaded), type: "resolveEvent" }, done = resolve(loaded, resolution);
  expect(done.seenEvents).toContain(run.pending.eventId);
  expect(resolve(done, resolution)).toBe(done);
});

test("battle/recruit content uses location pools, with no changes to P1c golden output", () => {
  const expected = { 0: "1f79018d", 1: "b240c9e2", 42: "f779631d", 4294967295: "d18dacfa" };
  for (const [seed, fp] of Object.entries(expected)) {
    const graph = state.graphForRunV2(fresh(Number(seed)));
    expect(graphModule.fingerprintOverworldGraphV2(graph)).toBe(fp);
    for (const node of graph.nodes.filter(n => ["battle", "recruit"].includes(n.type) && !n.boss && n.wave !== 25)) {
      const run = engine.beginOverworldNode(beforeNode(Number(seed), node), node.nodeId);
      const tier = node.wave < 8 ? 1 : node.wave < 18 ? 2 : 3;
      const pool = scenarioPool(node.locationId, node.wave, tier + (node.type === "recruit" ? 1 : 0)).map(row => row.version.versionId);
      for (const p of run.pending.enemies || [run.pending.player].filter(Boolean)) expect(pool).toContain(p.versionId);
    }
  }
});

test("W25 uses exactly the historical Epsilon stream and probability; both outcomes survive reload", () => {
  let present = 0, absent = 0, checkedPresent = false, checkedAbsent = false;
  // Same topology, independent persisted contentSeed: compare original stream for 1000 seeds.
  const template = fresh(42), node = state.graphForRunV2(template).nodes.find(n => n.wave === 25);
  const base = beforeNode(42, node);
  for (let contentSeed = 0; contentSeed < 1000; contentSeed++) {
    const run = { ...base, overworld: { ...base.overworld, contentSeed } };
    const expected = nodeRandom(contentSeed, "epsilon-w25")() < 0.25;
    expect(engine.epsilonEntryEligible(run)).toBe(expected);
    const selected = engine.beginOverworldNode(run, node.nodeId);
    expect(selected.pending.teamId === "epsilon").toBe(expected);
    if (expected) {
      present++;
      expect(selected.pending.enemies.map(p => p.versionId)).toEqual(engine.EPSILON_ENTRY_IDS);
      const legacy = engine.generateWave({ ...run, overworld: { revision: 1, contentSeed } });
      expect(selected.pending.enemies).toEqual(legacy.enemies);
      expect(selected.pending.recruitIndex).toBe(legacy.recruitIndex);
    } else absent++;
    if (expected ? !checkedPresent : !checkedAbsent) {
      storage.saveRun(selected); const loaded = storage.loadRun();
      expect(engine.generateWave(loaded)).toEqual(selected.pending);
      if (expected) {
        const won = settle(loaded);
        expect(won.pending.type).toBe("recruit");
        expect(won.pending.context.offer.versionId).toBe(engine.epsilonRecruitOffer(selected.pending, won.team).versionId);
        expect(won.pending.context.after).toBe("rewards");
        checkedPresent = true;
      } else checkedAbsent = true;
    }
  }
  expect(checkedPresent && checkedAbsent).toBe(true);
  expect(present).toBeGreaterThan(0); expect(absent).toBeGreaterThan(0);
});

test("legacy V1 with and without overworld continues without conversion", () => {
  for (const mapped of [true, false]) {
    localStorage.clear();
    const run = engine.newRun(starters);
    if (!mapped) delete run.overworld;
    run.wave = mapped ? 1 : 12;
    run.pending = engine.generateWave(run, () => 0.3);
    storage.saveRun(run);
    expect(storage.loadRun()).toEqual(engine.normalizeRun(run));
    expect(state.hasOverworldV2(storage.loadRun())).toBe(false);
  }
});

test("unknown versions, invalid paths and inconsistent pending fail closed without overwriting bytes", () => {
  const run = fresh(), badVersion = { ...run, overworld: { ...run.overworld, algorithmVersion: 999 } };
  expect(() => engine.normalizeRun(badVersion)).toThrow(/Versione/);
  for (const bad of [badVersion, { ...run, overworld: { ...run.overworld, revision: 99 } },
    { ...run, wave: 2, overworld: { ...run.overworld, completedWave: 1, path: ["missing"] } },
    { ...run, overworld: { ...run.overworld, selectedNodeId: "ow2:w01:a" } }]) {
    const bytes = JSON.stringify(bad); localStorage.setItem(key, bytes);
    expect(storage.loadRunResult().status).toBe("incompatible");
    expect(storage.loadRun()).toBeNull(); expect(localStorage.getItem(key)).toBe(bytes);
    expect(() => storage.saveRun(run)).toThrow(/incompatibile/);
    expect(localStorage.getItem(key)).toBe(bytes);
  }
  localStorage.setItem(key, JSON.stringify(badVersion));
  expect(() => storage.saveRun(run)).toThrow(/incompatibile/);
  expect(() => storage.saveRun(null)).toThrow(/incompatibile/);
  expect(localStorage.getItem(key)).toBe(JSON.stringify(badVersion));
});

test("storage dispatch rejects stale selection/action and keeps the prior snapshot on write failure", () => {
  const run = fresh(), node = state.selectableNodesV2(run)[0]; storage.saveRun(run);
  const write = jest.spyOn(Storage.prototype, "setItem");
  const expected = state.runTokenV2(run);
  const selected = storage.dispatchRunV2(expected, { type: "select", nodeId: node.nodeId });
  expect(write).toHaveBeenCalledTimes(1);
  expect(state.hydrateOverworldV2(JSON.parse(localStorage.getItem(key)))).toEqual(selected);
  expect(storage.loadRun()).toEqual(selected);
  expect(storage.dispatchRunV2(expected, { type: "select", nodeId: node.nodeId })).toEqual(selected);
  expect(write).toHaveBeenCalledTimes(1);
  const stamp = state.runTokenV2(selected), action = { ...state.actionTokenV2(selected), type: "battleResult", result: "win", team: selected.team };
  const won = storage.dispatchRunV2(stamp, action);
  expect(write).toHaveBeenCalledTimes(2);
  expect(storage.loadRun()).toEqual(won);
  expect(storage.dispatchRunV2(stamp, action)).toEqual(won);
  expect(write).toHaveBeenCalledTimes(2);
  const bytes = localStorage.getItem(key);
  write.mockImplementationOnce(() => { throw Error("quota"); });
  const nextAction = won.pending.type === "recruit" ? { type: "skipRecruit" } : { type: "reward", id: null };
  expect(() => storage.dispatchRunV2(state.runTokenV2(won), { ...state.actionTokenV2(won), ...nextAction })).toThrow("quota");
  expect(localStorage.getItem(key)).toBe(bytes);
  expect(storage.loadRun()).toEqual(won);
});

test.each(["select", "skipRecruit"])("storage dispatch validates %s output before replacing a reloadable snapshot", type => {
  const base = type === "select" ? fresh() : withType("recruit");
  // Both inputs pass hydration, but their real transitions produce invalid output:
  // selection overflows the token; recruitment exposes a missing rewards array.
  const run = type === "select"
    ? { ...base, overworld: { ...base.overworld, transition: Number.MAX_SAFE_INTEGER } }
    : { ...base, pending: { ...base.pending, context: { after: "rewards" } } };
  const action = type === "select"
    ? { type, nodeId: state.selectableNodesV2(run)[0].nodeId }
    : { ...state.actionTokenV2(run), type };
  storage.saveRun(run);
  expect(storage.loadRun()).toEqual(run);
  const bytes = localStorage.getItem(key), write = jest.spyOn(Storage.prototype, "setItem");
  const next = type === "select" ? engine.beginOverworldNode(run, action.nodeId) : resolve(run, action);
  expect(() => state.hydrateOverworldV2(next)).toThrow(state.OverworldSaveError);
  expect(() => storage.saveRun(next)).toThrow(state.OverworldSaveError);
  expect(() => storage.dispatchRunV2(state.runTokenV2(run), action)).toThrow(state.OverworldSaveError);
  expect(write).not.toHaveBeenCalled();
  expect(localStorage.getItem(key)).toBe(bytes);
  expect(storage.loadRun()).toEqual(run);
});

test("storage dispatch never duplicates purchases or travel XP after reload and stale actions", () => {
  const run = { ...withType("shop"), money: 999 };
  storage.saveRun(run);
  const write = jest.spyOn(Storage.prototype, "setItem"), entry = run.pending.stock[0];
  const expected = state.runTokenV2(run), action = { ...state.actionTokenV2(run), type: "buy", index: 0 };
  const bought = storage.dispatchRunV2(expected, action);
  expect(bought.money).toBe(run.money - entry.price);
  expect(bought.items).toEqual(engine.addItem(run.items, entry.id));
  const loaded = storage.loadRun(), bytes = localStorage.getItem(key);
  expect(loaded).toEqual(bought);
  expect(storage.dispatchRunV2(expected, action)).toEqual(bought);
  expect(storage.dispatchRunV2(state.runTokenV2(loaded), action)).toEqual(bought);
  expect(storage.dispatchRunV2(state.runTokenV2(loaded), { ...action, ...state.actionTokenV2(loaded) })).toEqual(bought);
  expect(write).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem(key)).toBe(bytes);
  const leave = { ...state.actionTokenV2(loaded), type: "leave" };
  const done = storage.dispatchRunV2(state.runTokenV2(loaded), leave);
  expect(done.team).toEqual(bought.team.map(p => engine.gainXp(p, getRules(run.rulesetId).travelXp).player));
  expect(done.overworld.path).toEqual([...run.overworld.path, run.overworld.selectedNodeId]);
  expect(storage.loadRun()).toEqual(done);
  expect(storage.dispatchRunV2(state.runTokenV2(loaded), leave)).toEqual(done);
  expect(storage.dispatchRunV2(state.runTokenV2(done), leave)).toEqual(done);
  expect(write).toHaveBeenCalledTimes(2);
});

test("loss and flee do not pay victory rewards or advance twice", () => {
  const run = withType("battle");
  const lost = settle(run, "lose");
  expect(lost.overworld.result).toBe("lose"); expect(lost.money).toBe(run.money);
  expect(state.selectableNodesV2(lost)).toEqual([]);
  const flee = act({ ...run, pending: { ...run.pending, kind: "wild" } }, { type: "battleResult", result: "flee", team: run.team });
  expect(flee.money).toBe(run.money); expect(flee.wave).toBe(run.wave + 1);
});

test("a destination in the next wave still needs an edge from the completed node", () => {
  const seed = 42, graph = state.graphForRunV2(fresh(seed));
  const parent = graph.nodes.find(n => n.wave < 50 && graphModule.nodesAtWave(graph, n.wave + 1).some(child => !n.next.includes(child.nodeId)));
  expect(parent).toBeTruthy();
  const forbidden = graphModule.nodesAtWave(graph, parent.wave + 1).find(n => !parent.next.includes(n.nodeId));
  const before = beforeNode(seed, parent);
  const after = { ...before, wave: parent.wave + 1, overworld: { ...before.overworld, completedWave: parent.wave, path: [...before.overworld.path, parent.nodeId] } };
  expect(engine.beginOverworldNode(after, forbidden.nodeId)).toBe(after);
  const corrupted = { ...after, wave: after.wave + 1, overworld: { ...after.overworld, completedWave: after.wave, path: [...after.overworld.path, forbidden.nodeId] } };
  expect(() => state.hydrateOverworldV2(corrupted)).toThrow(/raggiungibile/);
});

test("every authored event choice uses persisted outcomes and seeded domain effects", () => {
  const base = withType("event");
  const covered = new Set();
  for (const event of require("./data").EVENTS) for (let index = 0; index < event.choices.length; index++) {
    const run = { ...base, money: 999, pending: { ...base.pending, eventId: event.id } };
    const chosen = act(run, { type: "chooseEvent", index });
    expect(chosen.pending.result).toBeTruthy();
    for (const effect of chosen.pending.result.effects) covered.add(effect.type);
    const forbidden = jest.spyOn(Math, "random").mockImplementation(() => { throw Error("global RNG"); });
    const result = act(clone(chosen), { type: "resolveEvent" });
    expect(act(clone(chosen), { type: "resolveEvent" })).toEqual(result);
    forbidden.mockRestore();
    storage.saveRun(result); expect(storage.loadRun()).toEqual(result);
    if (result.pending?.type === "battle" || result.pending?.type === "recruit") {
      const done = finish(result); expect(done.overworld.completedWave).toBe(run.wave);
    }
  }
  expect([...covered]).toEqual(expect.arrayContaining(["xp", "heal", "money", "battle", "recruit", "stat", "item"]));
});

test.each(Object.keys(DIFFICULTIES))("boss levels, money and healing preserve %s rules", difficulty => {
  const base = engine.newRunV2(starters, 42, difficulty), graph = state.graphForRunV2(base);
  const node = graph.nodes.find(n => n.wave === 10);
  const route = beforeNode(42, node);
  const run = { ...route, difficultyId: base.difficultyId, rulesetId: base.rulesetId, team: base.team.map(p => ({ ...p, hp: 1 })) };
  const selected = engine.beginOverworldNode(run, node.nodeId);
  const rules = getRules(base.rulesetId), raw = 10 + (rules.checkpoints[10]?.levelOffset ?? rules.defaultBossLevelOffset);
  expect(selected.pending.enemies.every(p => p.level === engine.cappedEnemyLevel(raw, run.team, run.rulesetId, "boss"))).toBe(true);
  const won = settle(selected);
  expect(won.money - selected.money).toBe((20 + 10 * 3) * 3);
  expect(won.team.every(p => p.hp === p.maxHp)).toBe(true);
  expect(won.lastProgression.report.rows.some(row => row.total > 0)).toBe(true);
  expect(act(selected, { type: "battleResult", result: "flee", team: run.team })).toBe(selected);
});

test("team encounters permit the same settled flee result as V1; loss keeps rollback", () => {
  const base = withType("battle"), run = { ...base, pending: { ...base.pending, kind: "team" } };
  const award = engine.grantCombatXp(run.team, run.activeUid, 20, false, run.rulesetId);
  const settled = engine.settleCombatProgression("lose", run.team, award.team.map(p => ({ ...p, hp: 0 })), award.report);
  const lost = act(run, { type: "battleResult", result: "lose", team: settled.team, report: settled.report });
  expect(lost.team.map(p => [p.level, p.xp])).toEqual(run.team.map(p => [p.level, p.xp]));
  storage.saveRun(lost); expect(storage.loadRun()).toEqual(lost);
  const fled = act(run, { type: "battleResult", result: "flee", team: award.team, report: award.report });
  expect(fled.wave).toBe(run.wave + 1); expect(fled.team).toEqual(award.team); expect(fled.money).toBe(run.money);
});

test("shop affordability, empty recruits, invalid reward and malformed actions do not invent content", () => {
  const shop = { ...withType("shop"), money: 0 };
  expect(act(shop, { type: "buy", index: 0 })).toBe(shop);
  const recruit = withType("recruit"), empty = { ...recruit, pending: { ...recruit.pending, player: null } };
  expect(act(empty, { type: "recruit" })).toBe(empty);
  expect(act(empty, { type: "skipRecruit" }).wave).toBe(empty.wave + 1);
  const training = withType("training");
  expect(act(training, { type: "train", drill: "toString", index: 0 })).toBe(training);
  expect(resolve(training, null)).toBe(training);
  let won = settle(withType("battle"));
  if (won.pending.type === "recruit") won = act(won, { type: "skipRecruit" });
  expect(act(won, { type: "reward", id: "missing" })).toBe(won);
});
