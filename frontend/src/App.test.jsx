import { act } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { newRun, createPlayer, grantCombatXp, gainXp } from "./game/engine";
import { saveRun, loadRun, loadMeta, saveMeta } from "./game/storage";
import * as engine from "./game/engine";
import { STARTER_IDS, FINAL_WAVE } from "./game/data";
import { RUN_EVENTS } from "./game/events";
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
import TeamSelect from "./components/game/TeamSelect";

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
jest.mock("./components/game/TeamSelect", () => jest.fn(() => null));

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

test("Game Over retry opens a fresh draft and preserves one history entry across new runs", async () => {
  saveMeta({ ...loadMeta(), unlocked: [...STARTER_IDS, "darren"] });
  const run = runWith(encounter());
  saveRun(run);
  await mountAndContinue();
  await call(BattleScreen, "onLose", run.team.map(p => ({ ...p, hp: 0 })), run.items, null);
  const archived = loadMeta();
  expect(archived.records).toHaveLength(1);
  expect(archived.runs).toBe(1);
  expect(loadRun()).toBeNull();
  await call(EndScreen, "onRetry");
  expect(props(TeamSelect).meta).toEqual(archived);
  expect(loadRun()).toBeNull();
  expect(loadMeta()).toEqual(archived);
  const chosen = ["darren", "shawn", "jack"];
  await call(TeamSelect, "onStart", chosen, "easy");
  const next = loadRun();
  expect(next.team.map(p => p.baseId)).toEqual(chosen);
  expect(next.team.every(p => !run.team.some(old => old.uid === p.uid))).toBe(true);
  expect(next.wave).toBe(1);
  expect(next.difficultyId).toBe("easy");
  const afterDraft = loadMeta();
  expect(afterDraft.records).toEqual(archived.records);
  expect(afterDraft.runs).toBe(archived.runs);
  expect(afterDraft.unlocked).toEqual(archived.unlocked);
  for (const id of chosen) expect(afterDraft.collection[`${id}:base`].recruited).toBe(true);
  await act(async () => root.unmount()); root = createRoot(host);
  await act(async () => root.render(<App />));
  expect(props(TitleScreen).meta).toEqual(afterDraft);
  expect(loadRun()).toEqual(next);
});

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
  const event = RUN_EVENTS.find(candidate => candidate.eventId === "trusted-coach-recruit");
  saveRun({ ...runWith({ type: "event", eventId: event.eventId }), storyFlags: { "trusted-coach": true } });
  await mountAndContinue();
  await call(EventScreen, "onChoose", 0);
  const result = loadRun().pending.result;
  await reload();
  expect(props(EventScreen).run.pending.result).toEqual(result);
  await call(EventScreen, "onResolve");
  const saved = loadRun();
  expect(saved.money).toBe(100);
  expect(saved.pending.type).toBe("recruit");
  await reload();
  expect(props(RecruitScreen).player).toEqual(saved.pending.context.offer);
  expect(EventScreen).not.toHaveBeenCalled();
  expect(loadRun().money).toBe(100);
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
  const chosenEvent = {
    ...RUN_EVENTS.find(candidate => candidate.eventId === "trusted-coach-recruit"),
    eventId: "test-xp-recruit",
    choices: [{ label: "Test", outcomes: [{ text: "Test", weight: 1, effects: [{ type: "grantXp", amount: 25 }, { type: "offerRecruit", maxRarity: "common" }] }] }],
  };
  RUN_EVENTS.push(chosenEvent);
  const run = runWith({ type: "event", eventId: chosenEvent.eventId });
  saveRun(run);
  await mountAndContinue();
  await call(EventScreen, "onChoose", 0);
  await reload();
  await call(EventScreen, "onResolve");
  await reload();
  await call(RecruitScreen, "onSkip");
  expect(loadRun().team.map((p) => p.xp)).toEqual([25, 25, 25]);
  expect(loadRun().lastProgression.report.rows.map((r) => r.travelXp)).toEqual([0, 0, 0]);
  RUN_EVENTS.pop();
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
  const chosenEvent = RUN_EVENTS.find(candidate => candidate.eventId === "street-tournament");
  const run = runWith({ type: "event", eventId: chosenEvent.eventId });
  saveRun(run);
  await mountAndContinue();
  await call(EventScreen, "onChoose", 0);
  await call(EventScreen, "onResolve");
  await call(BattleScreen, "onFlee", run.team, run.items, run.activeUid, null);
  expect(loadRun().team).toEqual(run.team);
  expect(loadRun().lastProgression.report.rows.every((r) => r.travelXp === 0)).toBe(true);
});

test.each(["lose", "win"])("recruit unlock survives %s, new run and component reload", async (result) => {
  const run = runWith({ type: "recruit", player: createPlayer("darren", 9), price: 0 });
  saveRun(run);
  await mountAndContinue();
  expect(loadMeta().unlocked).not.toContain("darren");
  await call(RecruitScreen, "onJoin", null, false);
  expect(loadMeta().unlocked).toContain("darren");
  const final = { ...loadRun(), wave: FINAL_WAVE, pending: encounter() };
  saveRun(final);
  await reload();
  if (result === "lose") await call(BattleScreen, "onLose", final.team.map(p => ({ ...p, hp: 0 })), final.items, null);
  else {
    await call(BattleScreen, "onWin", final.team, final.items, final.activeUid);
    expect(RewardScreen).not.toHaveBeenCalled();
  }
  expect(EndScreen).toHaveBeenCalled();
  expect(props(EndScreen).result).toBe(result);
  expect(loadRun()).toBeNull();
  const meta = loadMeta();
  expect(meta.unlocked).toContain("darren");
  expect(meta.records).toHaveLength(1);
  expect(meta.records[0].teamSnapshot.some(p => p.baseId === "darren")).toBe(true);
  await call(EndScreen, "onRetry");
  expect(props(TeamSelect).meta.collection["darren:base"].starterUnlocked).toBe(true);
  await call(TeamSelect, "onStart", ["darren", ...STARTER_IDS.slice(0, 2)], "easy");
  const nextRun = loadRun();
  expect(nextRun.wave).toBe(1);
  expect(nextRun.team[0].baseId).toBe("darren");
  const afterNewRun = loadMeta();
  expect(afterNewRun.records).toEqual(meta.records);
  expect(afterNewRun.unlocked).toContain("darren");
  await act(async () => root.unmount()); root = createRoot(host);
  await act(async () => root.render(<App />));
  expect(props(TitleScreen).meta).toEqual(afterNewRun);
  expect(loadMeta()).toEqual(afterNewRun);
  expect(loadRun()).toEqual(nextRun);
});

test("declining an encountered player never unlocks it", async () => {
  saveRun(runWith({ type: "recruit", player: createPlayer("darren", 9), price: 0 }));
  await mountAndContinue();
  await call(RecruitScreen, "onSkip");
  expect(loadMeta().unlocked).not.toContain("darren");
});

test("discovery persists independently of recruitment, then actual join unlocks the version", async () => {
  const p = createPlayer("darren", 9);
  saveRun(runWith({ type: "recruit", player: p, price: 0 }));
  await mountAndContinue();
  await call(RecruitScreen, "onDiscover", p);
  expect(loadMeta().collection[p.versionId]).toEqual({ discovered: true, recruited: false, starterUnlocked: false });
  expect(loadMeta().unlocked).not.toContain("darren");
  await reload();
  await call(RecruitScreen, "onJoin", null, false);
  expect(loadMeta().collection[p.versionId]).toEqual({ discovered: true, recruited: true, starterUnlocked: true });
  expect(loadMeta().unlocked.filter(id => id === "darren")).toHaveLength(1);
});


test("W49 victory still generates the normal item reward phase", async () => {
 const run={...runWith(encounter()),wave:FINAL_WAVE-1};
 saveRun(run);await mountAndContinue();
 await call(BattleScreen,"onWin",run.team,run.items,run.activeUid);
 expect(RewardScreen).toHaveBeenCalled();expect(EndScreen).not.toHaveBeenCalled();
 expect(loadRun().pending.type).toBe("reward");
});

test("final wave victory bypasses item rewards, preserves final XP and registers once", async () => {
 const run={...runWith({...encounter("boss"),teamName:"Little Gigant"}),wave:FINAL_WAVE};
 const award=grantCombatXp(run.team,run.activeUid,53,true,run.rulesetId);
 expect(award.team.some((p,i)=>p.level>run.team[i].level)).toBe(true);
 const rewards=jest.spyOn(engine,"generateRewards");
 saveRun(run);await mountAndContinue();
 await call(BattleScreen,"onWin",award.team,run.items,run.activeUid,award.report);
 expect(rewards).not.toHaveBeenCalled();expect(RewardScreen).not.toHaveBeenCalled();
 expect(RecruitScreen).not.toHaveBeenCalled();
 const final=props(EndScreen).run;
 expect(props(EndScreen).result).toBe("win");
 expect(final.team.map(p=>[p.level,p.xp])).toEqual(award.team.map(p=>[p.level,p.xp]));
 expect(final.lastProgression.report).toEqual(award.report);
 expect(final.items).toEqual(run.items);
 expect(final.money).toBe(run.money+(20+FINAL_WAVE*3)*3);
 expect(final.stats.wins).toBe(run.stats.wins+1);
 expect(final.stats.lastBossDefeated).toBe("Little Gigant");
 expect(loadRun()).toBeNull();expect(loadMeta().records).toHaveLength(1);
 expect(loadMeta().records[0].glory).toBe(engine.glory(final));
 expect(loadMeta().records[0].teamSnapshot.map(p=>p.level)).toEqual(award.team.map(p=>p.level));
 const records=loadMeta().records;
 await call(EndScreen,"onRetry");
 expect(TeamSelect).toHaveBeenCalled();expect(loadMeta().records).toEqual(records);
 await call(TeamSelect,"onStart",STARTER_IDS.slice(0,3),"normal");
 expect(loadRun().wave).toBe(1);expect(loadMeta().records).toEqual(records);
 rewards.mockRestore();
});

test("final boss loss still ends as Game Over without reward phase", async () => {
 const run={...runWith({...encounter("boss"),teamName:"Little Gigant"}),wave:FINAL_WAVE};
 saveRun(run);await mountAndContinue();
 await call(BattleScreen,"onLose",run.team.map(p=>({...p,hp:0})),run.items,null);
 expect(props(EndScreen).result).toBe("lose");
 expect(RewardScreen).not.toHaveBeenCalled();expect(loadRun()).toBeNull();
 expect(loadMeta().records).toHaveLength(1);expect(loadMeta().records[0].result).toBe("lose");
});


test.each([null, {type:"reward",context:{rewards:["barretta"],money:42}}])("pause preserves run/history and resumes pending state %j", async pending => {
 const run=runWith(pending);run.wave=8;run.team[0].hp=7;run.team[1].hp=0;run.team[2].xp=19;
 saveRun(run);const meta=loadMeta();
 await act(async()=>root.render(<App />));await call(TitleScreen,"onContinue");
 expect(props(HubScreen).run).toEqual(run);
 await call(HubScreen,"onPause");
 expect(props(TitleScreen).hasRun).toBe(true);expect(loadRun()).toEqual(run);expect(loadMeta()).toEqual(meta);
 await act(async()=>root.unmount());root=createRoot(host);
 await act(async()=>root.render(<App />));await call(TitleScreen,"onContinue");
 expect(props(HubScreen).run).toEqual(run);expect(loadMeta()).toEqual(meta);
 if(pending) {
  await call(HubScreen,"onNext");expect(props(RewardScreen).rewards).toEqual(pending.context.rewards);
  expect(loadRun()).toEqual(run);
 }
 expect(EndScreen).not.toHaveBeenCalled();
});

test("new run asks confirmation before replacing an active run; cancel preserves it", async()=> {
 const run=runWith(null);saveRun(run);
 await act(async()=>root.render(<App />));
 const confirm=jest.spyOn(window,"confirm").mockReturnValue(false);
 await call(TitleScreen,"onNew");
 expect(confirm).toHaveBeenCalledTimes(1);expect(TeamSelect).not.toHaveBeenCalled();expect(loadRun()).toEqual(run);
 confirm.mockReturnValue(true);await call(TitleScreen,"onNew");
 expect(TeamSelect).toHaveBeenCalled();expect(loadRun()).toEqual(run); // no loss until new draft starts
 await call(TeamSelect,"onStart",STARTER_IDS.slice(0,3),"easy");
 expect(loadRun().difficultyId).toBe("easy");expect(loadRun().team[0].uid).not.toBe(run.team[0].uid);
 expect(loadMeta().records).toHaveLength(0);
 confirm.mockRestore();
});

test("abandon remains destructive and records loss separately from pause", async()=> {
 saveRun(runWith(null));await act(async()=>root.render(<App />));await call(TitleScreen,"onContinue");
 const confirm=jest.spyOn(window,"confirm").mockReturnValue(true);
 await call(HubScreen,"onAbandon");
 expect(loadRun()).toBeNull();expect(props(EndScreen).result).toBe("lose");expect(loadMeta().records).toHaveLength(1);
 confirm.mockRestore();
});
