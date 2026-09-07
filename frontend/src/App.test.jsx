import { act } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { newRun, createPlayer, grantCombatXp, gainXp } from "./game/engine";
import { saveRun, loadRun } from "./game/storage";
import { STARTER_IDS, EVENTS } from "./game/data";
import TitleScreen from "./components/game/TitleScreen";
import HubScreen from "./components/game/HubScreen";
import BattleScreen from "./components/game/BattleScreen";
import RewardScreen from "./components/game/RewardScreen";
import RecruitScreen from "./components/game/RecruitScreen";
import ShopScreen from "./components/game/ShopScreen";
import EventScreen from "./components/game/EventScreen";
import EndScreen from "./components/game/EndScreen";
import TeamScreen from "./components/game/TeamScreen";
import TrainingScreen from "./components/game/TrainingScreen";

jest.mock("./game/audio", () => ({ setSoundEnabled: jest.fn() }));
jest.mock("./components/game/TitleScreen", () => jest.fn(() => null));
jest.mock("./components/game/HubScreen", () => jest.fn(() => null));
jest.mock("./components/game/BattleScreen", () => jest.fn(() => null));
jest.mock("./components/game/RewardScreen", () => jest.fn(() => null));
jest.mock("./components/game/RecruitScreen", () => jest.fn(() => null));
jest.mock("./components/game/ShopScreen", () => jest.fn(() => null));
jest.mock("./components/game/EventScreen", () => jest.fn(() => null));
jest.mock("./components/game/EndScreen", () => jest.fn(() => null));
jest.mock("./components/game/TeamScreen", () => jest.fn(() => null));
jest.mock("./components/game/TrainingScreen", () => jest.fn(() => null));

let root, host;
const props = (component) => component.mock.calls[component.mock.calls.length - 1][0];
const call = async (component, name, ...args) => act(async () => { props(component)[name](...args); });
const mountAndContinue = async () => {
  await act(async () => root.render(<App />));
  await call(TitleScreen, "onContinue");
  await call(HubScreen, "onNext");
};
const reload = async () => {
  await act(async () => root.unmount());
  root = createRoot(host);
  jest.clearAllMocks();
  await mountAndContinue();
};
const runWith = (pending) => ({ ...newRun(STARTER_IDS.slice(0, 3)), pending });
const encounter = (kind = "team") => ({ type: "battle", kind, forceRecruit: true, enemies: [createPlayer(STARTER_IDS[0], 2)] });

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  jest.clearAllMocks();
  host = document.createElement("div");
  root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); });

test("victory saves the reward checkpoint; reload never replays the won battle", async () => {
  const run = runWith(encounter());
  saveRun(run);
  await mountAndContinue();
  await call(BattleScreen, "onWin", run.team, run.items, run.team[1].uid);
  const saved = loadRun();
  expect(saved.pending.type).toBe("reward");
  expect(saved.activeUid).toBe(run.team[1].uid);
  expect(saved.stats.wins).toBe(1);
  const rewardProps = props(RewardScreen);
  await reload();
  expect(BattleScreen).not.toHaveBeenCalled();
  expect(props(RewardScreen).rewards).toEqual(rewardProps.rewards);
  expect(loadRun()).toEqual(saved);
  await call(RewardScreen, "onPick", saved.pending.context.rewards[0]);
  expect(loadRun().wave).toBe(2);
  expect(loadRun().pending).toBeNull();
});

test("wild recruitment and its following rewards survive both reloads", async () => {
  const run = runWith(encounter("wild"));
  saveRun(run);
  await mountAndContinue();
  await call(BattleScreen, "onWin", run.team, run.items, run.team[0].uid);
  const offer = props(RecruitScreen).player;
  await reload();
  expect(props(RecruitScreen).player).toEqual(offer);
  expect(BattleScreen).not.toHaveBeenCalled();
  await call(RecruitScreen, "onJoin", null, false);
  expect(loadRun().team).toHaveLength(4);
  expect(loadRun().pending.type).toBe("reward");
  await reload();
  expect(RewardScreen).toHaveBeenCalled();
  expect(loadRun().stats.recruits).toBe(1);
});

test("purchased shop entries remain unavailable after reload and cannot charge twice", async () => {
  saveRun(runWith({ type: "shop", stock: [{ id: "barretta", price: 20 }] }));
  await mountAndContinue();
  await call(ShopScreen, "onBuy", 0);
  expect(loadRun().money).toBe(80);
  expect(loadRun().items.barretta).toBe(3);
  await reload();
  expect(props(ShopScreen).run.pending.bought).toEqual([0]);
  await call(ShopScreen, "onBuy", 0);
  expect(loadRun().money).toBe(80);
  expect(loadRun().items.barretta).toBe(3);
});

test("event outcome and generated offer persist without repeating its effects", async () => {
  const result = { text: "Reclutamento", effects: [{ type: "money", amt: 10 }, { type: "recruit", tier: 1 }] };
  saveRun(runWith({ type: "event", eventId: EVENTS[0].id }));
  await mountAndContinue();
  await call(EventScreen, "onChoose", result);
  await reload();
  expect(props(EventScreen).run.pending.result).toEqual(result);
  await call(EventScreen, "onResolve", result);
  const saved = loadRun();
  expect(saved.money).toBe(110);
  expect(saved.pending.type).toBe("recruit");
  await reload();
  expect(props(RecruitScreen).player).toEqual(saved.pending.context.offer);
  expect(EventScreen).not.toHaveBeenCalled();
  expect(loadRun().money).toBe(110);
});

test("App Game Over uses Battle's final team, and all-KO saves never enter battle", async () => {
  const run = runWith(encounter());
  saveRun(run);
  await mountAndContinue();
  const finalTeam = run.team.map((p) => ({ ...p, hp: 0 }));
  await call(BattleScreen, "onLose", finalTeam, {}, run.team[1].uid);
  expect(props(EndScreen).run.team).toEqual(finalTeam);
  expect(props(EndScreen).run.items).toEqual({});
  expect(loadRun()).toBeNull();
  saveRun({ ...run, team: finalTeam });
  await reload();
  expect(BattleScreen).not.toHaveBeenCalled();
  expect(props(EndScreen).run.team).toEqual(finalTeam);
});

test("flee persists a surviving active UID and falls back when it is KO", async () => {
  const run = runWith(encounter());
  saveRun(run);
  await mountAndContinue();
  const team = run.team.map((p, i) => i === 1 ? { ...p, hp: 0 } : p);
  await call(BattleScreen, "onFlee", team, run.items, team[1].uid);
  expect(loadRun().activeUid).toBe(team[0].uid);
  expect(loadRun().wave).toBe(2);
  expect(loadRun().team).toEqual(team);
});

test("recruit replacement resolves an active UID removed from the team", async () => {
  const run = runWith({ type: "recruit", player: createPlayer(STARTER_IDS[0], 2), price: 10 });
  run.activeUid = run.team[1].uid;
  saveRun(run);
  await mountAndContinue();
  await call(RecruitScreen, "onJoin", 1, true);
  expect(loadRun().activeUid).toBe(run.team[0].uid);
  expect(loadRun().team[1].uid).toBe(run.pending.player.uid);
});

test("captain reordering preserves active UID; release chooses a survivor", async () => {
  const run = runWith(null);
  run.activeUid = run.team[1].uid;
  saveRun(run);
  await act(async () => root.render(<App />));
  await call(TitleScreen, "onContinue");
  await call(HubScreen, "onTeam");
  const reordered = [run.team[2], run.team[0], run.team[1]];
  await call(TeamScreen, "onUpdate", { team: reordered });
  expect(loadRun().activeUid).toBe(run.team[1].uid);
  await call(TeamScreen, "onUpdate", { team: reordered.slice(0, 2) });
  expect(loadRun().activeUid).toBe(run.team[2].uid);
});

test("engine EXP report survives reward reload without another award", async () => {
  const run = runWith(encounter());
  saveRun(run);
  await mountAndContinue();
  const earned = grantCombatXp(run.team, run.activeUid, 2);
  await call(BattleScreen, "onWin", earned.team, run.items, run.activeUid, earned.report);
  const saved = loadRun();
  expect(props(RewardScreen).xpReport).toEqual(earned.report);
  await reload();
  expect(props(RewardScreen).xpReport).toEqual(earned.report);
  expect(loadRun()).toEqual(saved);
  await call(RewardScreen, "onPick", null);
  expect(loadRun().team).toEqual(earned.team);
});

test("shop completion awards travel once; entering, purchases and reload do not", async () => {
  const run = runWith({ type: "shop", stock: [{ id: "barretta", price: 20 }] });
  saveRun(run);
  await mountAndContinue();
  await call(ShopScreen, "onBuy", 0);
  await reload();
  expect(loadRun().team).toEqual(run.team);
  await call(ShopScreen, "onLeave");
  const saved = loadRun();
  expect(saved.team.map((p) => p.xp)).toEqual([12, 12, 12]);
  expect(saved.lastProgression.report.source).toBe("travel");
  await act(async () => root.unmount());
  root = createRoot(host);
  await act(async () => root.render(<App />));
  await call(TitleScreen, "onContinue");
  expect(loadRun()).toEqual(saved);
});

test("event with own EXP carries its receipt through recruitment and never adds travel", async () => {
  const run = runWith({ type: "event", eventId: EVENTS[0].id });
  const result = { effects: [{ type: "xp", amt: 25, target: "all" }, { type: "recruit", tier: 1 }] };
  saveRun(run);
  await mountAndContinue();
  await call(EventScreen, "onChoose", result);
  await reload();
  await call(EventScreen, "onResolve", result);
  await reload();
  await call(RecruitScreen, "onSkip");
  expect(loadRun().team.map((p) => p.xp)).toEqual([25, 25, 25]);
  expect(loadRun().lastProgression.report.rows.map((r) => r.travelXp)).toEqual([0, 0, 0]);
});

test("training with its own EXP excludes travel, while a stat drill receives it", async () => {
  const run = runWith({ type: "training" });
  saveRun(run);
  await mountAndContinue();
  await call(TrainingScreen, "onDone", run.team.map((p) => gainXp(p, 30).player), true);
  expect(loadRun().team.map((p) => p.xp)).toEqual([30, 30, 30]);
  saveRun(run);
  await reload();
  await call(TrainingScreen, "onDone", run.team, false);
  expect(loadRun().team.map((p) => p.xp)).toEqual([12, 12, 12]);
});

test("fleeing an event battle never awards travel", async () => {
  const run = runWith({ type: "event", eventId: EVENTS[0].id });
  saveRun(run);
  await mountAndContinue();
  await call(EventScreen, "onResolve", { effects: [{ type: "battle", ids: [STARTER_IDS[0]] }] });
  await call(BattleScreen, "onFlee", run.team, run.items, run.activeUid, null);
  expect(loadRun().team).toEqual(run.team);
  expect(loadRun().lastProgression.report.rows.every((r) => r.travelXp === 0)).toBe(true);
});
