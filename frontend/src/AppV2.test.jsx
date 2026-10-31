import { act } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import * as engine from "./game/engine";
import { STARTER_IDS, EVENTS, BOSSES } from "./game/data";
import { graphForRunV2, selectableNodesV2 } from "./game/overworldRunV2";
import { saveRun, loadRun, loadMeta } from "./game/storage";
import { nodeRandom } from "./game/overworld";
import TitleScreen from "./components/game/TitleScreen";
import TeamSelect from "./components/game/TeamSelect";
import HubScreen from "./components/game/HubScreen";
import BattleScreen from "./components/game/BattleScreen";
import RecruitScreen from "./components/game/RecruitScreen";
import RewardScreen from "./components/game/RewardScreen";
import ShopScreen from "./components/game/ShopScreen";
import TeamScreen from "./components/game/TeamScreen";
import FusionScreen from "./components/game/FusionScreen";
import EndScreen from "./components/game/EndScreen";

jest.mock("./game/audio", () => ({ setSoundEnabled: jest.fn(), sfx: new Proxy({}, { get: () => jest.fn() }) }));
jest.mock("./components/game/TitleScreen", () => jest.fn(() => null));
jest.mock("./components/game/TeamSelect", () => jest.fn(() => null));
jest.mock("./components/game/HubScreen", () => jest.fn(() => null));
jest.mock("./components/game/BattleScreen", () => jest.fn(() => null));
jest.mock("./components/game/RecruitScreen", () => jest.fn(() => null));
jest.mock("./components/game/RewardScreen", () => jest.fn(() => null));
jest.mock("./components/game/ShopScreen", () => jest.fn(() => null));
jest.mock("./components/game/TeamScreen", () => jest.fn(() => null));
jest.mock("./components/game/FusionScreen", () => jest.fn(() => null));
jest.mock("./components/game/EndScreen", () => jest.fn(() => null));

const starters = STARTER_IDS.slice(0, 3), key = "inazuma_rogue_run";
const fresh = (seed = 42) => engine.newRunV2(starters, seed);
const props = component => component.mock.calls.at(-1)[0];
let root, host;
const find = id => host.querySelector(`[data-testid="${id}"]`);
const click = async id => act(async () => { expect(find(id)).not.toBeNull(); find(id).click(); });
const call = async (component, name, ...args) => act(async () => props(component)[name](...args));
const resume = async () => {
  const before = TitleScreen.mock.calls.length;
  await act(async () => root.render(<App />));
  if (TitleScreen.mock.calls.length > before) await call(TitleScreen, "onContinue");
};
const reload = async () => {
  await act(async () => root.unmount()); root = createRoot(host); jest.clearAllMocks(); await resume();
};
// Build valid preceding paths without running unrelated encounters in setup.
function beforeNode(node, seed = 42) {
  const run = fresh(seed), graph = graphForRunV2(run), path = [];
  let current = node;
  while (current.wave > 1) { current = graph.nodes.find(n => n.next.includes(current.nodeId)); path.unshift(current.nodeId); }
  return { ...run, wave: node.wave, overworld: { ...run.overworld, completedWave: node.wave - 1, path } };
}
function pendingType(type) {
  const node = graphForRunV2(fresh()).nodes.find(n => n.type === type && !n.boss);
  return engine.beginOverworldNode(beforeNode(node), node.nodeId);
}
const select = async node => click(`v2-node-${node.nodeId}`);
async function finishPending() {
  let guard = 0;
  while (loadRun().pending && !loadRun().overworld.result && guard++ < 10) {
    const run = loadRun();
    switch (run.pending.type) {
      case "battle": await call(BattleScreen, "onWin", run.team, run.items, run.activeUid); break;
      case "recruit": await call(RecruitScreen, "onSkip"); break;
      case "reward": await call(RewardScreen, "onPick", run.pending.context.rewards[0]); break;
      case "shop": await call(ShopScreen, "onLeave"); break;
      case "training": await click("training-team-xp"); break;
      case "event": await click(run.pending.result ? "event-continue-btn" : "event-choice-0"); break;
      default: throw Error(run.pending.type);
    }
  }
  expect(guard).toBeLessThan(10);
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); jest.clearAllMocks();
  host = document.createElement("div"); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); jest.restoreAllMocks(); });

test("App defaults to V1; explicit V2 launch generates and persists one exact seed", async () => {
  await act(async () => root.render(<App />)); await call(TitleScreen, "onNew");
  await call(TeamSelect, "onStart", starters, "normal");
  expect(loadRun().overworld.revision).toBe(1); expect(HubScreen).toHaveBeenCalled();
  await act(async () => root.unmount()); root = createRoot(host); localStorage.clear();
  const rng = jest.fn(buffer => { buffer[0] = 0xffffffff; return buffer; });
  Object.defineProperty(window, "crypto", { configurable: true, value: { getRandomValues: rng } });
  await act(async () => root.render(<App />)); await call(TitleScreen, "onNew");
  const start = props(TeamSelect).onStart;
  await act(async () => { start(starters, "easy", 2); start(starters, "easy", 2); });
  expect(loadRun().overworld).toMatchObject({ revision: 2, seed: 0xffffffff, contentSeed: 0xffffffff });
  expect(loadRun().difficultyId).toBe("easy"); expect(find("overworld-v2-hub")).not.toBeNull();
  expect(rng).toHaveBeenCalledTimes(1);
  await click("pause-run-btn"); await reload(); expect(rng).not.toHaveBeenCalled();
});

test("hub offers only reachable nodes and selection persists the actual destination", async () => {
  const run = fresh(), graph = graphForRunV2(run); saveRun(run); await resume();
  expect(host.querySelectorAll(".v2-destination")).toHaveLength(selectableNodesV2(run).length);
  const invalid = graph.nodes.find(n => n.wave === 2);
  expect(find(`v2-node-${invalid.nodeId}`)).toBeNull();
  const node = selectableNodesV2(run)[0]; await select(node);
  expect(loadRun().pending.overworldNodeId).toBe(node.nodeId);
  expect(loadRun().scenarioState.id).toBe(node.locationId);
  await finishPending();
  const next = loadRun();
  expect(next.wave).toBe(2); expect(next.overworld.path).toEqual([node.nodeId]);
  expect([...host.querySelectorAll(".v2-destination")].map(el => el.dataset.testid)).toEqual(selectableNodesV2(next).map(n => `v2-node-${n.nodeId}`));
});

test.each(["battle", "shop", "recruit", "training", "event"])("pause and reload reconstruct %s from pending", async type => {
  const run = pendingType(type); saveRun(run); await resume();
  const saved = localStorage.getItem(key); await click("v2-pause-pending");
  expect(localStorage.getItem(key)).toBe(saved); await reload();
  expect(loadRun()).toEqual(run);
  if (type === "battle") expect(props(BattleScreen).encounter).toEqual(run.pending);
  if (type === "shop") expect(props(ShopScreen).stock).toEqual(run.pending.stock);
  if (type === "recruit") expect(props(RecruitScreen).player).toEqual(run.pending.player);
  if (type === "training") expect(find("training-screen")).not.toBeNull();
  if (type === "event") expect(find("event-screen")).not.toBeNull();
});

test("settled combat XP is not added twice; intermediate recruit and rewards survive reload", async () => {
  let run = pendingType("battle");
  run.pending = { ...run.pending, kind: "wild", enemies: [engine.createPlayer("darren", 2)], forceRecruit: true };
  saveRun(run); await resume();
  const award = engine.grantCombatXp(run.team, run.activeUid, 2);
  const win = props(BattleScreen).onWin;
  await act(async () => { win(award.team, run.items, run.activeUid, award.report); win(award.team, run.items, run.activeUid, award.report); });
  expect(loadRun().stats.wins).toBe(1); expect(loadRun().team).toEqual(award.team);
  const offer = props(RecruitScreen).player; await reload(); expect(props(RecruitScreen).player).toEqual(offer);
  const join = props(RecruitScreen).onJoin;
  await act(async () => { join(null); join(null); });
  expect(loadRun().stats.recruits).toBe(1); expect(loadRun().team).toHaveLength(4);
  expect(loadMeta().collection[offer.versionId].recruited).toBe(true);
  await reload(); const reward = props(RewardScreen), saved = loadRun();
  expect(reward.xpReport).toEqual(award.report);
  await act(async () => { reward.onPick(reward.rewards[0]); reward.onPick(reward.rewards[0]); });
  expect(loadRun().wave).toBe(run.wave + 1);
  expect(loadRun().items[reward.rewards[0]]).toBe((saved.items[reward.rewards[0]] || 0) + 1 + Number(reward.bonus === reward.rewards[0]));
  expect(loadRun().team.slice(0, 3)).toEqual(award.team);
});

test("callbacks from a prior mounted controller cannot resolve the resumed battle", async () => {
  const run = pendingType("battle"); saveRun(run); await resume(); const win = props(BattleScreen).onWin;
  await reload(); const raw = localStorage.getItem(key);
  await act(async () => win(run.team, run.items, run.activeUid));
  expect(localStorage.getItem(key)).toBe(raw);
  await call(BattleScreen, "onFlee", run.team, run.items, run.activeUid);
  expect(loadRun().wave).toBe(run.wave + 1); expect(find("overworld-v2-hub")).not.toBeNull();
});

test("failed battle save retries the settled command with original tokens, without replaying combat", async () => {
  const run = pendingType("battle"); saveRun(run); await resume();
  const nativeSet = Storage.prototype.setItem;
  const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(function(k, v) { if (k === key) throw Error("quota"); return nativeSet.call(this, k, v); });
  await call(BattleScreen, "onWin", run.team, run.items, run.activeUid);
  expect(loadRun()).toEqual(run); expect(find("v2-retry-save")).not.toBeNull();
  expect(host.querySelector(".v2-content").hasAttribute("inert")).toBe(true);
  write.mockRestore(); await click("v2-retry-save");
  expect(loadRun().stats.wins).toBe(1); expect(loadRun().pending.type).not.toBe("battle");
});

test("failed discovery is retried before a queued asynchronous combat result", async () => {
  const run = pendingType("battle"); saveRun(run); await resume();
  const nativeSet = Storage.prototype.setItem;
  const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(function(k, v) { if (k === "inazuma_rogue_meta") throw Error("quota"); return nativeSet.call(this, k, v); });
  const enemy = engine.createPlayer("darren", 2);
  await call(BattleScreen, "onDiscover", enemy);
  await call(BattleScreen, "onWin", run.team, run.items, run.activeUid);
  expect(loadRun()).toEqual(run);
  write.mockRestore(); await click("v2-retry-save");
  expect(loadMeta().collection[enemy.versionId].discovered).toBe(true);
  expect(loadRun().stats.wins).toBe(1);
});

test("shop buys and exit are idempotent, including a stale buy after another transition", async () => {
  const run = pendingType("shop"); run.money = 999; saveRun(run); await resume();
  const buy = props(ShopScreen).onBuy, entry = run.pending.stock[0];
  await act(async () => { buy(0); buy(0); });
  expect(loadRun().money).toBe(999 - entry.price); expect(loadRun().pending.bought).toEqual([0]);
  await reload(); const leave = props(ShopScreen).onLeave;
  await act(async () => { leave(); leave(); buy(1); });
  expect(loadRun().wave).toBe(run.wave + 1); expect(loadRun().team.map(p => p.xp)).toEqual([12, 12, 12]);
});

test.each(["xp", "atk"])("training %s uses reducer once and returns to hub", async drill => {
  const run = pendingType("training"); saveRun(run); await resume();
  if (drill === "atk") await click("training-player-1");
  await click(drill === "xp" ? "training-team-xp" : "training-drill-atk");
  expect(find("overworld-v2-hub")).not.toBeNull();
  expect(loadRun().team.map(p => p.xp)).toEqual(drill === "xp" ? [30, 30, 30] : [12, 12, 12]);
  expect(loadRun().team[1].bonus.atk).toBe(run.team[1].bonus.atk + (drill === "atk" ? 4 : 0));
});

test("V2 EventScreen sends only an index; outcome is persisted by reducer with no Math.random", async () => {
  const run = pendingType("event"); saveRun(run); await resume(); await reload();
  const random = jest.spyOn(Math, "random");
  await click("event-choice-0"); expect(random).not.toHaveBeenCalled();
  const chosen = loadRun(); expect(chosen.pending.result).toBeTruthy();
  expect(find("event-result-text").textContent).toBe(chosen.pending.result.text);
  await reload(); expect(loadRun()).toEqual(chosen);
  expect(find("event-result-text").textContent).toBe(chosen.pending.result.text);
  await click("event-continue-btn"); await finishPending(); expect(loadRun().wave).toBe(run.wave + 1);
});

test.each(["recruit", "battle"])("event intermediate %s context survives reload", async type => {
  const run = pendingType("event");
  run.pending = { ...run.pending, eventId: EVENTS[0].id, result: { text: "Persisted outcome", effects: type === "recruit" ? [{ type: "recruit", tier: 1 }] : [{ type: "battle", ids: ["darren"] }] } };
  saveRun(run); await resume(); await click("event-continue-btn"); expect(loadRun().pending.type).toBe(type);
  const saved = loadRun(); await reload(); expect(loadRun()).toEqual(saved);
  if (type === "recruit") expect(props(RecruitScreen).player).toEqual(saved.pending.context.offer);
  else expect(props(BattleScreen).encounter).toEqual(saved.pending);
  await finishPending(); expect(loadRun().wave).toBe(run.wave + 1);
});

test("encounter recruit supports challenge, replacement and collection recovery after meta write failure", async () => {
  const run = pendingType("recruit");
  run.team = [...run.team, ...["shawn", "jude", "kevin"].filter(id => !starters.includes(id)).map(id => engine.createPlayer(id, 3))];
  while (run.team.length < 6) run.team.push(engine.createPlayer("hurley", 3));
  run.pending.player = engine.createPlayer("darren", 3); run.pending.price = 1;
  saveRun(run); await resume(); await call(RecruitScreen, "onChallenge");
  expect(loadRun().pending.forceRecruit).toBe(true);
  await call(BattleScreen, "onWin", run.team, run.items, run.activeUid);
  const offer = props(RecruitScreen).player;
  const nativeSet = Storage.prototype.setItem;
  const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(function(k, v) { if (k === "inazuma_rogue_meta") throw Error("quota"); return nativeSet.call(this, k, v); });
  await call(RecruitScreen, "onJoin", 1);
  expect(loadRun().team[1].versionId).toBe(offer.versionId);
  expect(loadRun().stats.recruits).toBe(1); expect(host.querySelector('[role="alert"]')).not.toBeNull();
  write.mockRestore(); await reload();
  expect(loadMeta().collection[offer.versionId].recruited).toBe(true);
  expect(loadMeta().unlocked.filter(id => id === offer.baseId)).toHaveLength(1);
});

test("paid recruitment and skip obey reducer cost/receipts", async () => {
  const run = pendingType("recruit"); run.money = 999; run.pending.player = engine.createPlayer("darren", 3);
  saveRun(run); await resume(); const join = props(RecruitScreen).onJoin;
  await act(async () => { join(null, true); join(null, true); });
  expect(loadRun().money).toBe(999 - run.pending.price); expect(loadRun().stats.recruits).toBe(1);
  saveRun(run); await reload(); const skip = props(RecruitScreen).onSkip;
  await act(async () => { skip(); skip(); }); expect(loadRun().team).toHaveLength(3);
  expect(loadRun().wave).toBe(run.wave + 1);
});

test("team inventory/fusion persist through the V2 transaction and reject repeated patches", async () => {
  const run = fresh(); run.items.cuneo = 1; saveRun(run); await resume(); await click("v2-team-btn");
  const update = props(TeamScreen).onUpdate;
  await act(async () => { update({ team: [...run.team].reverse() }); update({ money: 0 }); });
  expect(loadRun().money).toBe(run.money); expect(loadRun().team[0].uid).toBe(run.team.at(-1).uid);
  await call(TeamScreen, "onFusion"); const fuse = props(FusionScreen).onFuse;
  await act(async () => { fuse(0, 1, "a"); fuse(0, 1, "a"); });
  expect(loadRun().stats.fusions).toBe(1); expect(loadRun().team).toHaveLength(2); expect(loadRun().items.cuneo || 0).toBe(0);
  await reload(); expect(loadRun().team.some(p => p.fused)).toBe(true);
});

test.each([10, 20, 30, 40, 50])("boss W%s preserves rules, rejects flee and heals after settled victory", async wave => {
  const node = graphForRunV2(fresh()).nodes.find(n => n.wave === wave);
  const run = engine.beginOverworldNode(beforeNode(node), node.nodeId); saveRun(run); await resume();
  expect(props(BattleScreen).encounter.teamName).toBe(BOSSES[wave].team);
  expect(props(BattleScreen).run.rulesetId).toBe(run.rulesetId);
  await call(BattleScreen, "onFlee", run.team, run.items, run.activeUid); expect(loadRun()).toEqual(run);
  const award = engine.grantCombatXp(run.team, run.activeUid, run.pending.enemies[0].level, true, run.rulesetId);
  await call(BattleScreen, "onWin", award.team.map(p => ({ ...p, hp: 1 })), run.items, run.activeUid, award.report);
  expect(loadRun().team.every(p => p.hp === p.maxHp)).toBe(true);
  expect(loadRun().team.map(p => [p.level, p.xp])).toEqual(award.team.map(p => [p.level, p.xp]));
  if (wave === 50) { expect(props(EndScreen).result).toBe("win"); expect(loadRun().overworld.completedWave).toBe(50); expect(loadMeta().runs).toBe(1); }
});

test.each([true, false])("W25 preview hides Epsilon roll; encounter present=%s survives reload", async expected => {
  let contentSeed = 0; while ((nodeRandom(contentSeed, "epsilon-w25")() < .25) !== expected) contentSeed++;
  const node = graphForRunV2(fresh()).nodes.find(n => n.wave === 25), run = beforeNode(node);
  run.overworld.contentSeed = contentSeed; saveRun(run); await resume();
  expect(host.textContent).not.toMatch(/Epsilon|25%|probabil/i);
  await select(node); expect(loadRun().pending.teamId === "epsilon").toBe(expected);
  const battle = loadRun(); await reload(); expect(loadRun()).toEqual(battle);
  await call(BattleScreen, "onWin", battle.team, battle.items, battle.activeUid);
  if (expected) { expect(props(RecruitScreen).player.versionId).toBe(engine.epsilonRecruitOffer(battle.pending, battle.team).versionId); await reload(); expect(loadRun().pending.type).toBe("recruit"); }
});

test("loss is routed before pending; terminal reload archives exactly once even after interrupted meta write", async () => {
  const run = pendingType("battle"); saveRun(run); await resume(); const lose = props(BattleScreen).onLose;
  const nativeSet = Storage.prototype.setItem;
  const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(function(k, v) { if (k === "inazuma_rogue_meta") throw Error("quota"); return nativeSet.call(this, k, v); });
  await act(async () => { lose(run.team.map(p => ({ ...p, hp: 0 })), {}, null); lose(run.team, run.items, run.activeUid); });
  expect(loadRun().overworld.result).toBe("lose"); expect(loadMeta().records).toHaveLength(0);
  write.mockRestore(); await reload(); expect(BattleScreen).not.toHaveBeenCalled(); expect(TitleScreen).not.toHaveBeenCalled(); expect(props(EndScreen).result).toBe("lose");
  const records = loadMeta().records; await reload(); expect(loadMeta().records).toEqual(records); expect(loadMeta().runs).toBe(1);
  await call(EndScreen, "onHome"); expect(loadRun()).toBeNull();
});

test("incompatible bytes are preserved; only a confirmed discard unlocks new runs", async () => {
  const raw = JSON.stringify({ ...fresh(), overworld: { ...fresh().overworld, algorithmVersion: 999 } }); localStorage.setItem(key, raw);
  await act(async () => root.render(<App />)); expect(find("incompatible-save")).not.toBeNull(); expect(TeamSelect).not.toHaveBeenCalled();
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  await click("discard-save-btn"); expect(localStorage.getItem(key)).toBe(raw);
  confirm.mockReturnValue(true); await click("discard-save-btn"); expect(loadRun()).toBeNull(); expect(TitleScreen).toHaveBeenCalled();
});

test("functional UI route completes all 50 waves and final victory is archived once", async () => {
  saveRun(fresh()); await resume(); const bosses = [];
  for (let wave = 1; wave <= 50; wave++) {
    const run = loadRun(); expect(run.wave).toBe(wave);
    await select(selectableNodesV2(run)[0]);
    if (loadRun().pending.kind === "boss") bosses.push(wave);
    if (wave % 7 === 0) await reload();
    await finishPending(); expect(loadRun().overworld.completedWave).toBe(wave);
  }
  expect(bosses).toEqual([10, 20, 30, 40, 50]); expect(props(EndScreen).result).toBe("win");
  expect(loadRun().overworld.path).toHaveLength(50); const record = loadMeta().records;
  await reload(); expect(loadMeta().records).toEqual(record); expect(loadMeta().runs).toBe(1);
  await call(EndScreen, "onRetry"); expect(TeamSelect).toHaveBeenCalled(); expect(loadRun()).toBeNull();
});
