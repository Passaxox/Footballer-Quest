import { act } from "react";
import { createRoot } from "react-dom/client";
import BattleScreen from "./BattleScreen";
import useBattlePace from "./useBattlePace";
import * as engine from "@/game/engine";
import { STARTER_IDS } from "@/game/data";
import { saveRun, clearRun } from "@/game/storage";

jest.mock("@/game/audio", () => ({ sfx: new Proxy({}, { get: () => jest.fn() }) }));
let root, host;
const SPEED_KEY = "inazuma_rogue_battle_speed";
const find = id => host.querySelector(`[data-testid="${id}"]`);
const tick = async ms => act(async () => { jest.advanceTimersByTime(ms); });
const click = async id => act(async () => { find(id).click(); });
const settle = async () => { for (let i = 0; i < 20; i++) await tick(1000); };
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; localStorage.clear(); jest.useFakeTimers(); host = document.createElement("div"); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });
const start = async (overrides = {}) => {
  const run = overrides.run || engine.newRun(STARTER_IDS.slice(0, 3));
  const props = { run, encounter: { kind: "team", teamName: "Test", enemies: [engine.createPlayer("darren", 1)] },
    onWin: jest.fn(), onLose: jest.fn(), onFlee: jest.fn(), onActiveChange: jest.fn(), ...overrides };
  await act(async () => root.render(<BattleScreen {...props} />)); await settle();
  await click("pre-battle-keep"); await settle();
  return props;
};

test.each([1, 2, 3])("x%s scales only waits; important waits remain full duration", async speed => {
  let pace;
  function Harness() { pace = useBattlePace(null); return null; }
  await act(async () => root.render(<Harness />));
  for (let i = 1; i < speed; i++) await act(async () => pace.cycle());
  const done = jest.fn(); pace.wait(900).then(done);
  await tick(900 / speed - 1); expect(done).not.toHaveBeenCalled();
  await tick(1); expect(done).toHaveBeenCalledWith(true);
  done.mockClear(); pace.wait(900, true).then(done);
  await tick(899); expect(done).not.toHaveBeenCalled();
  await tick(1); expect(done).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem(SPEED_KEY)).toBe(speed === 1 ? null : String(speed));
});

test("AUTO uses default action, busy is exclusive, OFF and background cancel future decisions", async () => {
  const attack = jest.spyOn(engine, "performAttack").mockImplementation((att, def) => ({ att, def, msgs: ["Turno"] }));
  jest.spyOn(engine, "turnOrder").mockReturnValue("player");
  await start(); await click("battle-auto"); await tick(220);
  expect(attack).toHaveBeenCalledTimes(1);
  await click("battle-speed"); await click("battle-speed");
  await click("battle-auto"); await settle();
  expect(attack).toHaveBeenCalledTimes(2); // Exactly this player/enemy exchange.
  await click("battle-auto"); await tick(220); await settle();
  expect(attack.mock.calls.length).toBeGreaterThan(4);
  await act(async () => window.dispatchEvent(new Event("blur")));
  await settle(); const count = attack.mock.calls.length; await settle();
  expect(attack).toHaveBeenCalledTimes(count);
  expect(find("battle-auto").getAttribute("aria-pressed")).toBe("false");
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(find("battle-auto").getAttribute("aria-pressed")).toBe("false");
  expect(localStorage.getItem(SPEED_KEY)).toBe("3");
});

test("manual menu cancels queued AUTO, items are never consumed, manual action wins the race", async () => {
  const attack = jest.spyOn(engine, "performAttack").mockImplementation((att, def) => ({ att, def, msgs: ["Turno"] }));
  await start(); await click("battle-auto"); await click("item-button"); await settle();
  expect(attack).not.toHaveBeenCalled(); expect(find("battle-auto").disabled).toBe(true);
  await click("items-cancel"); await click("battle-auto"); await click("attack-button"); await settle();
  expect(attack).toHaveBeenCalledTimes(2);
  expect(find("battle-auto").getAttribute("aria-pressed")).toBe("false");
});

test("important acknowledgement pauses AUTO and forces x1 then resumes previous preferences", async () => {
  const attack = jest.spyOn(engine, "performAttack").mockImplementation((att, def) => ({ att, def, msgs: ["Turno"] }));
  const props = await start();
  await click("battle-speed"); await click("battle-speed"); await click("battle-auto");
  await act(async () => root.render(<BattleScreen {...props} manualMoment={{ id: "cut-in", message: "Momento speciale" }} />));
  await settle(); expect(attack).not.toHaveBeenCalled();
  expect(find("battle-screen").style.getPropertyValue("--battle-speed")).toBe("1");
  expect(localStorage.getItem(SPEED_KEY)).toBe("3");
  await click("attack-button"); expect(attack).not.toHaveBeenCalled();
  await click("battle-acknowledge"); await tick(220);
  expect(attack).toHaveBeenCalledTimes(1);
  expect(find("battle-screen").style.getPropertyValue("--battle-speed")).toBe("3");
  expect(localStorage.getItem(SPEED_KEY)).toBe("3");
  await click("battle-auto"); await settle();
});

test("AUTO stops on KO and waits for a manual replacement", async () => {
  jest.spyOn(engine, "turnOrder").mockReturnValue("enemy");
  jest.spyOn(engine, "performAttack").mockImplementation((att, def) => ({ att, def: { ...def, hp: 0 }, msgs: ["KO"] }));
  const props = await start(); await click("battle-auto"); await settle();
  expect(find("switch-player-btn-1")).not.toBeNull();
  expect(find("battle-auto").getAttribute("aria-pressed")).toBe("false");
  expect(props.onWin).not.toHaveBeenCalled(); expect(props.onLose).not.toHaveBeenCalled();
});

test("same seeded real combat at x1 manual and x3 AUTO has identical results and RNG draws", async () => {
  const run = engine.newRun(STARTER_IDS.slice(0, 3));
  const encounter = { kind: "wild", enemies: [engine.createPlayer("darren", 1)] };
  const outcomes = [], draws = [];
  for (const speed of [1, 3]) {
    const props = await start({ run, encounter });
    for (let i = 1; i < speed; i++) await click("battle-speed");
    let seed = 123; const values = [];
    const rng = jest.spyOn(Math, "random").mockImplementation(() => { const v = ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); values.push(v); return v; });
    if (speed === 3) await click("battle-auto");
    for (let i = 0; i < 100 && !props.onWin.mock.calls.length && !props.onLose.mock.calls.length; i++) {
      if (speed === 1 && find("attack-button")) await click("attack-button");
      await settle();
    }
    expect(props.onWin).toHaveBeenCalledTimes(1); expect(props.onLose).not.toHaveBeenCalled();
    await settle(); expect(props.onWin).toHaveBeenCalledTimes(1);
    expect(find("battle-auto").disabled).toBe(true);
    outcomes.push(props.onWin.mock.calls[0]); draws.push(values); rng.mockRestore();
    await act(async () => root.unmount()); root = createRoot(host);
  }
  expect(outcomes[1]).toEqual(outcomes[0]); expect(draws[1]).toEqual(draws[0]);
});

test("unmount cancels active presentation and produces no late battle result", async () => {
  const attack = jest.spyOn(engine, "performAttack");
  const props = await start(); await click("battle-auto"); await tick(220);
  await act(async () => root.unmount()); root = createRoot(host);
  await settle(); expect(attack).toHaveBeenCalledTimes(1);
  expect(props.onWin).not.toHaveBeenCalled(); expect(props.onLose).not.toHaveBeenCalled();
  await tick(60000); expect(attack).toHaveBeenCalledTimes(1);
});

test("fresh install defaults to x1; FAST cycles 1/2/3/1 and reads storage only on mount", async () => {
  let pace;
  function Harness() { pace = useBattlePace(null); return null; }
  const read = jest.spyOn(Storage.prototype, "getItem"), write = jest.spyOn(Storage.prototype, "setItem");
  await act(async () => root.render(<Harness />));
  expect(pace.state.speed).toBe(1); expect(pace.state.auto).toBe(false);
  expect(write).not.toHaveBeenCalled();
  for (const speed of [2, 3, 1]) {
    await act(async () => pace.cycle());
    expect(pace.state.speed).toBe(speed);
    expect(write).toHaveBeenLastCalledWith(SPEED_KEY, String(speed));
  }
  expect(read).toHaveBeenCalledTimes(1); expect(read).toHaveBeenCalledWith(SPEED_KEY);
  expect(localStorage.getItem(SPEED_KEY)).toBe("1");
});

test.each([1, 2, 3])("loads persisted x%s without enabling AUTO", async speed => {
  localStorage.setItem(SPEED_KEY, String(speed));
  let pace;
  function Harness() { pace = useBattlePace(null); return null; }
  await act(async () => root.render(<Harness />));
  expect(pace.state.speed).toBe(speed); expect(pace.state.auto).toBe(false);
});

test.each([null, "", "0", "4", "-1", "2.0", "02", " 2 ", "NaN", "true", '"2"', "[2]", "{}", "corrupt"])("invalid stored speed %j safely falls back to x1", async value => {
  if (value !== null) localStorage.setItem(SPEED_KEY, value);
  let pace;
  function Harness() { pace = useBattlePace(null); return null; }
  await act(async () => root.render(<Harness />));
  expect(pace.state.speed).toBe(1);
  const done = jest.fn(); pace.wait(300).then(done);
  await tick(299); expect(done).not.toHaveBeenCalled();
  await tick(1); expect(done).toHaveBeenCalledWith(true);
  await act(async () => pace.cycle());
  expect(localStorage.getItem(SPEED_KEY)).toBe("2");
});

test("FAST survives different battles, new V1/V2 runs and clearRun; AUTO never survives remount", async () => {
  const meta = JSON.stringify({ collection: { untouched: true } });
  localStorage.setItem("inazuma_rogue_meta", meta);
  for (const [index, revision] of [1, 1, 2, 1].entries()) {
    const run = revision === 2 ? engine.newRunV2(STARTER_IDS.slice(0, 3), 42) : engine.newRun(STARTER_IDS.slice(0, 3));
    saveRun(run); const snapshot = localStorage.getItem("inazuma_rogue_run");
    await start({ run, encounter: { kind: "wild", enemies: [engine.createPlayer(index % 2 ? "byron" : "darren", 1)] } });
    expect(find("battle-speed").textContent).toBe(index ? "FAST x3" : "FAST x1");
    expect(find("battle-auto").getAttribute("aria-pressed")).toBe("false");
    if (index === 0) { await click("battle-speed"); await click("battle-speed"); }
    await click("battle-auto");
    expect(localStorage.getItem("inazuma_rogue_run")).toBe(snapshot);
    expect(localStorage.getItem("inazuma_rogue_meta")).toBe(meta);
    await act(async () => root.unmount()); root = createRoot(host);
    clearRun(); expect(localStorage.getItem(SPEED_KEY)).toBe("3");
  }
});

test("simulated reload uses a fresh hook module and restores persisted x2", async () => {
  let pace, usePace = useBattlePace;
  function Harness() { pace = usePace(null); return null; }
  await act(async () => root.render(<Harness />)); await act(async () => pace.cycle());
  await act(async () => root.unmount()); root = createRoot(host);
  // Keep the renderer's React instance while discarding this hook's module cache.
  const react = jest.requireActual("react");
  try {
    jest.isolateModules(() => {
      jest.doMock("react", () => react);
      usePace = require("./useBattlePace").default;
    });
    expect(usePace).not.toBe(useBattlePace);
    await act(async () => root.render(<Harness />));
    expect(pace.state.speed).toBe(2); expect(pace.state.auto).toBe(false);
  } finally { jest.dontMock("react"); }
});

test("unavailable localStorage getter falls back to x1 and does not block FAST or waits", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
  Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("Storage denied"); } });
  try {
    let pace;
    function Harness() { pace = useBattlePace(null); return null; }
    await act(async () => root.render(<Harness />)); expect(pace.state.speed).toBe(1);
    await act(async () => pace.cycle()); expect(pace.state.speed).toBe(2);
    const done = jest.fn(); pace.wait(300).then(done);
    await tick(150); expect(done).toHaveBeenCalledWith(true);
    await act(async () => root.unmount()); root = createRoot(host);
    await act(async () => root.render(<Harness />)); expect(pace.state.speed).toBe(1);
  } finally { Object.defineProperty(window, "localStorage", descriptor); }
});

test("a failed preference write leaves combat usable and the next mount falls back to x1", async () => {
  const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
  await start(); await click("battle-speed");
  expect(find("battle-speed").textContent).toBe("FAST x2"); expect(find("attack-button")).not.toBeNull();
  expect(write).toHaveBeenCalledWith(SPEED_KEY, "2"); expect(localStorage.getItem(SPEED_KEY)).toBeNull();
  await act(async () => root.unmount()); root = createRoot(host);
  await start(); expect(find("battle-speed").textContent).toBe("FAST x1");
});

test("visibility background stops AUTO without resetting the persisted speed", async () => {
  let pace;
  function Harness() { pace = useBattlePace(null); return null; }
  await act(async () => root.render(<Harness />));
  await act(async () => { pace.cycle(); pace.toggle(); });
  const hidden = jest.spyOn(document, "hidden", "get").mockReturnValue(true);
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  expect(pace.state.auto).toBe(false); expect(pace.state.hidden).toBe(true);
  hidden.mockReturnValue(false);
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  expect(pace.state.auto).toBe(false); expect(pace.state.speed).toBe(2);
  expect(localStorage.getItem(SPEED_KEY)).toBe("2");
});
