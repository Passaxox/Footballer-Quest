import { act } from "react";
import { createRoot } from "react-dom/client";
import BattleScreen from "./BattleScreen";
import useBattlePace from "./useBattlePace";
import * as engine from "@/game/engine";
import { STARTER_IDS } from "@/game/data";

jest.mock("@/game/audio", () => ({ sfx: new Proxy({}, { get: () => jest.fn() }) }));
let root, host;
const find = id => host.querySelector(`[data-testid="${id}"]`);
const tick = async ms => act(async () => { jest.advanceTimersByTime(ms); });
const click = async id => act(async () => { find(id).click(); });
const settle = async () => { for (let i = 0; i < 20; i++) await tick(1000); };
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; jest.useFakeTimers(); host = document.createElement("div"); root = createRoot(host); });
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
  await click("attack-button"); expect(attack).not.toHaveBeenCalled();
  await click("battle-acknowledge"); await tick(220);
  expect(attack).toHaveBeenCalledTimes(1);
  expect(find("battle-screen").style.getPropertyValue("--battle-speed")).toBe("3");
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
