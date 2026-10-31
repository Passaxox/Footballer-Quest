import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import * as engine from "./game/engine";
import { selectableNodesV2 } from "./game/overworldRunV2";
import { STARTER_IDS } from "./game/data";
import { saveRun, loadRun, loadMeta } from "./game/storage";

jest.mock("./game/audio", () => ({ setSoundEnabled: jest.fn(), sfx: new Proxy({}, { get: () => jest.fn() }) }));
let root, host;
const find = id => host.querySelector(`[data-testid="${id}"]`);
const click = async id => act(async () => { expect(find(id)).not.toBeNull(); find(id).click(); });
const settle = async () => { for (let i = 0; i < 20; i++) await act(async () => jest.advanceTimersByTime(1000)); };
const battle = () => {
  const run = engine.newRunV2(STARTER_IDS.slice(0, 3), 42);
  const node = selectableNodesV2(run).find(n => n.type === "battle");
  const selected = engine.beginOverworldNode(run, node.nodeId);
  selected.pending = { ...selected.pending, kind: "team", teamName: "Test", enemies: [engine.createPlayer("darren", 1)] };
  return selected;
};
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; jest.useFakeTimers(); localStorage.clear();
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

test("real battle under StrictMode discovers, switches, uses bag, then settles through V2", async () => {
  const run = battle(); run.pending.enemies[0].hp = 1; saveRun(run);
  await act(async () => root.render(<StrictMode><App /></StrictMode>)); await settle();
  expect(loadMeta().collection[run.pending.enemies[0].versionId].discovered).toBe(true);
  await click("pre-battle-change"); await click("switch-player-btn-1"); await settle();
  expect(find("player-name").textContent).toBe(run.team[1].name);
  await click("item-button"); await click("items-cancel");
  expect(find("switch-button")).not.toBeNull(); expect(find("flee-button")).not.toBeNull();
  const random = jest.spyOn(Math, "random").mockReturnValue(0.5);
  await click("attack-button"); await settle(); random.mockRestore();
  expect(loadRun().pending.type).toBe("reward"); expect(loadRun().stats.wins).toBe(1);
  expect(loadRun().activeUid).toBe(run.team[1].uid);
});

test("real all-KO battle entry reaches persisted Game Over instead of reopening battle", async () => {
  const run = battle(); run.team = run.team.map(p => ({ ...p, hp: 0 })); saveRun(run);
  await act(async () => root.render(<App />)); await settle();
  expect(find("game-over-screen")).not.toBeNull(); expect(loadRun().overworld.result).toBe("lose"); expect(loadMeta().runs).toBe(1);
});

test("forcedSwitch still requires a living replacement in the V2 shell", async () => {
  const run = battle(); run.team[0].hp = 1; saveRun(run);
  jest.spyOn(engine, "performAttack").mockImplementation((att, def) => ({ att, def: { ...def, hp: 0 }, msgs: ["KO"] }));
  jest.spyOn(engine, "turnOrder").mockReturnValue("enemy");
  await act(async () => root.render(<App />)); await settle();
  await click("pre-battle-keep"); await settle(); await click("attack-button"); await settle();
  expect(find("switch-player-btn-1")).not.toBeNull(); expect(find("switch-cancel")).toBeNull(); expect(find("attack-button")).toBeNull();
  await click("switch-player-btn-1"); await settle();
  expect(find("attack-button")).not.toBeNull(); expect(find("player-name").textContent).toBe(run.team[1].name);
  // Internal turns remain in BattleScreen; only the settled result is persisted.
  expect(loadRun().pending.type).toBe("battle"); expect(loadRun().team[0].hp).toBe(1);
});
