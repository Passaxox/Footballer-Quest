import { act } from "react";
import { createRoot } from "react-dom/client";
import BattleScreen from "./BattleScreen";
import TeamScreen from "./TeamScreen";
import * as engine from "@/game/engine";
import { STARTER_IDS } from "@/game/data";

jest.mock("@/game/audio", () => ({ sfx: new Proxy({}, { get: () => jest.fn() }) }));

let root, host;
const find = (id) => host.querySelector(`[data-testid="${id}"]`);
const click = async (id) => { expect(find(id)).not.toBeNull(); await act(async () => find(id).click()); };
const settle = async () => { for (let i = 0; i < 20; i++) await act(async () => { jest.advanceTimersByTime(1000); }); };
const inScroll = (id) => { const el = find(id); expect(el).not.toBeNull(); expect(el.closest('[data-testid="battle-scroll"]')).not.toBeNull(); };
const inActions = (id) => {
  const el = find(id);
  expect(el).not.toBeNull();
  expect(el.closest('[data-testid="battle-actions"]')).not.toBeNull();
  expect(el.closest('[data-testid="battle-scroll"]')).toBeNull();
};
const mount = async (run, overrides = {}) => {
  const encounter = { kind: "team", teamName: "Test", enemies: [engine.createPlayer(STARTER_IDS[0], 1)], ...overrides };
  await act(async () => root.render(<BattleScreen run={run} encounter={encounter} onWin={jest.fn()} onLose={jest.fn()} onFlee={jest.fn()} onActiveChange={jest.fn()} onDiscover={jest.fn()} />));
  await settle();
};

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

test("battle: header and action bar are anchored outside the scroller; info and long lists scroll inside it (preBattle, menu, switch, items, target)", async () => {
  const run = engine.newRun(STARTER_IDS.slice(0, 6));
  await mount(run);
  const screen = find("battle-screen");
  expect(screen.className).toContain("min-h-0");
  expect(find("wave-counter-badge").closest('[data-testid="battle-scroll"]')).toBeNull();
  // Action bar is a direct, last sibling of the scroller: it never scrolls away.
  expect(find("battle-actions").parentElement).toBe(screen);
  expect(find("battle-scroll").nextElementSibling).toBe(find("battle-actions"));
  expect(screen.querySelectorAll('[data-testid="battle-scroll"]')).toHaveLength(1);
  inScroll("battle-log"); inScroll("pre-battle-prompt");
  inActions("pre-battle-keep"); inActions("pre-battle-change");
  await click("pre-battle-keep"); await settle();
  inScroll("battle-decision");
  ["attack-button", "switch-button", "item-button", "flee-button"].forEach(inActions);
  await click("item-button");
  inScroll("use-item-barretta"); inActions("items-cancel");
  await click("use-item-barretta");
  for (let i = 0; i < 6; i++) inScroll(`item-target-${i}`);
  inActions("item-target-cancel");
  await click("item-target-cancel"); await click("items-cancel");
  expect(find("attack-button")).not.toBeNull();
  await click("switch-button");
  for (let i = 0; i < 6; i++) inScroll(`switch-player-btn-${i}`);
  inActions("switch-cancel");
  await click("switch-cancel");
  inActions("attack-button");
});

test("battle: pre-battle switch list scrolls with all six players while Indietro stays anchored", async () => {
  const run = engine.newRun(STARTER_IDS.slice(0, 6));
  await mount(run);
  await click("pre-battle-change");
  for (let i = 0; i < 6; i++) inScroll(`switch-player-btn-${i}`);
  inActions("switch-cancel");
  await click("switch-cancel");
  inActions("pre-battle-keep"); inActions("pre-battle-change");
});

test("battle: busy state keeps the placeholder action bar in place and unclickable", async () => {
  const run = engine.newRun(STARTER_IDS.slice(0, 6));
  await act(async () => root.render(<BattleScreen run={run} encounter={{ kind: "team", teamName: "Test", enemies: [engine.createPlayer(STARTER_IDS[0], 1)] }} onWin={jest.fn()} onLose={jest.fn()} onFlee={jest.fn()} onActiveChange={jest.fn()} onDiscover={jest.fn()} />));
  // Intro phase is busy-like: no interactive commands, bar still anchored outside the scroller.
  const bar = find("battle-actions");
  expect(bar).not.toBeNull();
  expect(find("battle-scroll").contains(bar)).toBe(false);
  expect(bar.querySelector('[data-testid="attack-button"]')).toBeNull();
  expect(bar.querySelector(".pointer-events-none")).not.toBeNull();
});

test("battle: forced switch lists the bench inside the scroller with no cancel and no action bar controls", async () => {
  const run = engine.newRun(STARTER_IDS.slice(0, 6));
  const uid = run.team[0].uid;
  const prepare = (p) => ({ ...p, hp: p.uid === uid ? 0 : p.hp });
  jest.spyOn(engine, "performAttack").mockImplementation((att, def) => ({ att: prepare(att), def, msgs: ["KO"] }));
  jest.spyOn(engine, "turnOrder").mockReturnValue("enemy");
  run.team[0].hp = 1;
  await mount(run, { kind: "boss", intro: "Boss" });
  await click("pre-battle-keep"); await settle();
  await click("attack-button"); await settle();
  expect(find("switch-cancel")).toBeNull();
  expect(find("battle-actions").querySelector("button")).toBeNull();
  for (let i = 1; i < 6; i++) inScroll(`switch-player-btn-${i}`);
});

test("team: six players, several inventory entries and final item targets live in one internal scroll container", async () => {
  const run = { ...engine.newRun(STARTER_IDS.slice(0, 6)), items: { barretta: 2, bibita: 1, fascia: 1, guanti: 1, cuneo: 1 } };
  await act(async () => root.render(<TeamScreen run={run} onUpdate={jest.fn()} onBack={jest.fn()} />));
  const screen = find("inventory-bench-screen");
  const scrollers = screen.querySelectorAll(".fq-scroll");
  expect(screen.className).toContain("min-h-0");
  expect(scrollers).toHaveLength(1);
  const scroller = scrollers[0];
  for (let i = 0; i < 6; i++) expect(scroller.contains(find(`team-player-${i}`))).toBe(true);
  for (const id of ["barretta", "bibita", "fascia", "guanti", "cuneo"]) expect(scroller.contains(find(`bag-use-${id}`))).toBe(true);
  expect(scroller.contains(find("team-back-btn"))).toBe(false);
  await click("bag-use-fascia");
  for (let i = 0; i < 6; i++) expect(scroller.contains(find(`team-item-target-${i}`))).toBe(true);
  expect(scroller.contains(find("team-item-cancel"))).toBe(true);
});
