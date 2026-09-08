import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BattleScreen from "./BattleScreen";
import * as engine from "@/game/engine";
import { STARTER_IDS } from "@/game/data";

jest.mock("@/game/audio", () => ({ sfx: new Proxy({}, { get: () => jest.fn() }) }));

let root, host;
const find = (id) => host.querySelector(`[data-testid="${id}"]`);
const click = async (id) => { expect(find(id)).not.toBeNull(); await act(async () => find(id).click()); };
const settle = async () => {
  for (let i = 0; i < 20; i++) await act(async () => { jest.advanceTimersByTime(1000); });
};
const setup = async (run, strict = false, overrides = {}) => {
  const callbacks = { onWin: jest.fn(), onLose: jest.fn(), onFlee: jest.fn(), onActiveChange: jest.fn(), onDiscover: jest.fn() };
  const encounter = { kind: "team", teamName: "Test", enemies: [engine.createPlayer(STARTER_IDS[0], 1)], ...overrides };
  const view = <BattleScreen run={run} encounter={encounter} {...callbacks} />;
  await act(async () => root.render(strict ? <StrictMode>{view}</StrictMode> : view));
  await settle();
  return callbacks;
};

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("StrictMode introduction reaches Mantieni/Cambia before the first turn", async () => {
  const run = engine.newRun(STARTER_IDS.slice(0, 3));
  run.activeUid = run.team[1].uid;
  const attack = jest.spyOn(engine, "performAttack");
  const burn = jest.spyOn(engine, "applyBurn");
  const callbacks = await setup(run, true);
  expect(find("player-name").textContent).toBe(run.team[1].name);
  expect(find("pre-battle-prompt")).not.toBeNull();
  expect(find("attack-button")).toBeNull();
  await click("pre-battle-keep");
  await settle();
  expect(find("attack-button")).not.toBeNull();
  expect(callbacks.onActiveChange).toHaveBeenCalledWith(run.team[1].uid);
  expect(attack).not.toHaveBeenCalled();
  expect(burn).not.toHaveBeenCalled();
});

test("discovery reports only the opponent actually displayed, not the hidden bench", async () => {
  const first = engine.createPlayer("darren", 1), second = engine.createPlayer("byron", 1);
  const callbacks = await setup(engine.newRun(STARTER_IDS.slice(0, 3)), false, { enemies: [first, second] });
  expect(callbacks.onDiscover).toHaveBeenCalledWith(first);
  expect(callbacks.onDiscover).not.toHaveBeenCalledWith(second);
  expect(callbacks.onWin).not.toHaveBeenCalled();
});

test("pre-battle switch is free, excludes KO and leaves captain/order unchanged", async () => {
  const run = engine.newRun(STARTER_IDS.slice(0, 3));
  run.team[2].hp = 0;
  const snapshot = JSON.stringify(run);
  const attack = jest.spyOn(engine, "performAttack");
  const burn = jest.spyOn(engine, "applyBurn");
  const callbacks = await setup(run);
  await click("pre-battle-change");
  await click("switch-player-btn-2");
  expect(callbacks.onActiveChange).not.toHaveBeenCalled();
  await click("switch-player-btn-1");
  await settle();
  expect(find("player-name").textContent).toBe(run.team[1].name);
  expect(callbacks.onActiveChange).toHaveBeenCalledWith(run.team[1].uid);
  expect(attack).not.toHaveBeenCalled();
  expect(burn).not.toHaveBeenCalled();
  expect(JSON.stringify(run)).toBe(snapshot);
  await click("switch-button");
  await click("switch-player-btn-0");
  await settle();
  expect(attack).toHaveBeenCalledTimes(1);
});

test("legacy active fallback and all-KO entry are defensive", async () => {
  const run = engine.newRun(STARTER_IDS.slice(0, 3));
  delete run.activeUid;
  run.team[0].hp = 0;
  await setup(run);
  expect(find("player-name").textContent).toBe(run.team[1].name);
  await act(async () => root.unmount());
  root = createRoot(host);
  run.team.forEach((p) => { p.hp = 0; });
  const callbacks = await setup(run);
  expect(callbacks.onLose).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ hp: 0 })]), run.items, null);
  expect(find("attack-button")).toBeNull();
});

test("defeat callback contains the actual final team and inventory", async () => {
  const run = engine.newRun(STARTER_IDS.slice(0, 1));
  run.team[0].hp = 1;
  jest.spyOn(engine, "performAttack").mockImplementation((att, def) => ({ att, def: { ...def, hp: 0 }, msgs: ["KO"] }));
  jest.spyOn(engine, "turnOrder").mockReturnValue("enemy");
  const callbacks = await setup(run);
  await click("pre-battle-keep");
  await settle();
  await click("attack-button");
  await settle();
  expect(callbacks.onLose).toHaveBeenCalledWith([expect.objectContaining({ hp: 0 })], run.items, run.team[0].uid,
    expect.objectContaining({ rows: [expect.objectContaining({ total: 0, koCombat: true })] }));
  expect(run.team[0].hp).toBe(1);
});

test.each([
  ["both KO, no survivor: boss defeat without XP or victory", 1, false, "lose"],
  ["both KO, bench survivor: victory with living active UID", 2, false, "win"],
  ["active KO, enemy alive: mandatory switch", 2, true, "switch"],
])("%s", async (_label, members, enemySurvives, outcome) => {
  const run = engine.newRun(STARTER_IDS.slice(0, members));
  const playerUid = run.team[0].uid;
  // Arrange an attack exchange that leaves burn on both fighters; use real end-of-turn burn.
  const prepare = (p) => ({ ...p, hp: enemySurvives && p.uid !== playerUid ? p.maxHp : 1,
    status: { ...p.status, burn: 1 } });
  jest.spyOn(engine, "performAttack").mockImplementation((att, def) => ({ att: prepare(att), def: prepare(def), msgs: ["Scambio"] }));
  jest.spyOn(engine, "turnOrder").mockReturnValue("player");
  const burn = jest.spyOn(engine, "applyBurn");
  const xp = jest.spyOn(engine, "grantCombatXp");
  const callbacks = await setup(run, false, { kind: "boss", intro: "Boss di prova" });
  await click("pre-battle-keep");
  await settle();
  await click("attack-button");
  await settle();
  expect(burn).toHaveBeenCalledTimes(2);
  if (outcome === "lose") {
    expect(callbacks.onLose).toHaveBeenCalledTimes(1);
    expect(callbacks.onLose.mock.calls[0][0].every((p) => p.hp === 0)).toBe(true);
    expect(callbacks.onWin).not.toHaveBeenCalled();
    expect(xp).not.toHaveBeenCalled();
  } else if (outcome === "win") {
    expect(callbacks.onLose).not.toHaveBeenCalled();
    expect(callbacks.onWin).toHaveBeenCalledTimes(1);
    expect(callbacks.onWin.mock.calls[0][2]).toBe(run.team[1].uid);
  } else {
    expect(callbacks.onLose).not.toHaveBeenCalled();
    expect(callbacks.onWin).not.toHaveBeenCalled();
    expect(find("switch-player-btn-1")).not.toBeNull();
    expect(find("switch-cancel")).toBeNull();
    expect(find("attack-button")).toBeNull();
  }
});

test("battle and pre-battle switch indicators use the engine's effective multiplier", async () => {
  const run = engine.newRun(STARTER_IDS.slice(0, 3));
  run.team[2].hp = 0;
  const efficacy = jest.spyOn(engine, "effectiveTypeMultiplier").mockImplementation((p) => p.uid === run.team[0].uid ? 1.5 : 0.67);
  await setup(run);
  await click("pre-battle-change");
  expect(find("switch-player-btn-0").textContent).toContain("SUPEREFFICACE");
  expect(find("switch-player-btn-1").textContent).toContain("POCO EFFICACE");
  expect(find("switch-player-btn-2").querySelector('[data-testid="matchup-badge"]')).toBeNull();
  await click("switch-player-btn-0");
  await settle();
  expect(find("attack-button").textContent).toContain("SUPEREFFICACE");
  expect(efficacy).toHaveBeenCalled();
  await click("switch-button");
  expect(find("switch-player-btn-1").textContent).toContain("POCO EFFICACE");
});


test("V2h preview shows both real techniques and updates after a free prebattle switch", async () => {
  const run = engine.newRun(STARTER_IDS.slice(0, 3));
  const opponent = engine.createPlayer("darren", 5);
  const attack = jest.spyOn(engine, "performAttack");
  await setup(run, false, { enemies: [opponent] });
  const preview = () => find("battle-decision");
  expect(preview().textContent).toContain(run.team[0].move.name);
  expect(preview().textContent).toContain(opponent.move.name);
  expect(preview().textContent).toContain("POT " + opponent.move.power);
  expect(preview().textContent).toContain("Effetto:");
  await click("pre-battle-change");
  await click("switch-player-btn-1");
  await settle();
  expect(preview().textContent).toContain(run.team[1].move.name);
  expect(attack).not.toHaveBeenCalled();
  expect(find("attack-button")).not.toBeNull();
});


test.each(["team", "boss"])("partial enemy KO then %s loss removes provisional growth", async kind => {
 const run=engine.newRun(STARTER_IDS.slice(0,1),"easy");
 run.team[0].xp=engine.xpForLevel(run.team[0].level)-1;
 const before={...run.team[0]};
 const first=engine.createPlayer("david",10), second=engine.createPlayer("joseph",10);
 jest.spyOn(engine,"turnOrder").mockReturnValue("player");
 jest.spyOn(engine,"performAttack").mockImplementation((a,d)=> ({
  att: d.uid===first.uid ? a : {...a,hp:0},
  def:{...d,hp:0}, msgs:["Test KO"]
 }));
 const cb=await setup(run,false,{kind,enemies:[first,second]});
 await click("pre-battle-keep");await settle();
 await click("attack-button");await settle();
 expect(cb.onLose).not.toHaveBeenCalled();
 await click("attack-button");await settle(); // simultaneous last enemy/player KO = loss
 expect(cb.onWin).not.toHaveBeenCalled();
 expect(cb.onLose).toHaveBeenCalledTimes(1);
 const [team,, ,report]=cb.onLose.mock.calls[0];
 expect(team[0]).toMatchObject({uid:before.uid,level:before.level,xp:before.xp,hp:0});
 expect(report.rows.every(r=>r.total===0 && r.after.level===r.before.level)).toBe(true);
});
