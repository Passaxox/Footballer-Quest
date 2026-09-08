import { act } from "react";
import { createRoot } from "react-dom/client";
import RewardScreen from "./RewardScreen";
import ShopScreen from "./ShopScreen";
import TeamSelect from "./TeamSelect";
import TeamScreen from "./TeamScreen";
import FusionScreen from "./FusionScreen";
import TrainingScreen from "./TrainingScreen";
import HubScreen from "./HubScreen";
import EndScreen from "./EndScreen";
import { saveRun, loadRun } from "@/game/storage";
import { STARTER_IDS } from "@/game/data";
import { newRun, fusePlayers, grantCombatXp, xpProgress } from "@/game/engine";
import { XpReport, MatchupBadge } from "./ui";

jest.mock("@/game/audio", () => ({ sfx: new Proxy({}, { get: () => jest.fn() }) }));
let root, host;
const find = (id) => host.querySelector(`[data-testid="${id}"]`);
const click = async (id) => act(async () => { find(id).click(); });
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); });

test("starter stats and complete technique are visible before choosing", async () => {
  await act(async () => root.render(<TeamSelect meta={{ unlocked: STARTER_IDS }} />));
  const run = newRun(STARTER_IDS);
  for (const p of run.team) {
    const card = find(`starter-${p.baseId}`);
    expect(card.textContent).toContain(p.move.name);
    expect(card.textContent).toContain(`POT ${p.move.power}`);
    expect(card.textContent).toContain("Effetto:");
    expect(card.parentElement.textContent).toContain(String(p.atk));
    expect(card.parentElement.textContent).toContain("DIF");
    expect(card.parentElement.textContent).toContain("VEL");
  }
  expect(find("start-run-btn").disabled).toBe(true);
});

test("UI rejects fused parents and displays both techniques and comparative stats", async () => {
  const run = newRun(STARTER_IDS.slice(0, 3));
  run.items.cuneo = 1;
  run.team[2] = fusePlayers(run.team[0], run.team[2], "b");
  await act(async () => root.render(<FusionScreen run={run} onFuse={jest.fn()} />));
  await click("fusion-pick-2");
  await click("fusion-pick-0");
  expect(find("fusion-confirm-btn")).toBeNull();
  await click("fusion-pick-1");
  expect(find("fusion-stat-preview").textContent).toContain("vs A");
  expect(find("fusion-stat-preview").textContent).toContain("vs B");
  expect(find("fusion-move-a").textContent).toContain(`POT ${run.team[0].move.power}`);
  expect(find("fusion-move-b").textContent).toContain("Effetto:");
  expect(host.textContent).toContain("EXP residua azzerata");
  expect(host.textContent).toContain("Ruolo da A");
});

test("UI cannot release the last living member", async () => {
  const run = newRun(STARTER_IDS.slice(0, 3));
  run.team[1].hp = run.team[2].hp = 0;
  const onUpdate = jest.fn();
  await act(async () => root.render(<TeamScreen run={run} onUpdate={onUpdate} />));
  expect(find("release-player-btn").disabled).toBe(true);
  await click("release-player-btn");
  expect(onUpdate).not.toHaveBeenCalled();
  await click("team-player-1");
  await click("release-player-btn");
  expect(onUpdate).toHaveBeenCalledWith({ team: [run.team[0], run.team[2]] });
});

test("HP training leaves a KO player at zero", async () => {
  const run = newRun(STARTER_IDS.slice(0, 3));
  run.team[0].hp = 0;
  const onDone = jest.fn();
  await act(async () => root.render(<TrainingScreen run={run} onDone={onDone} />));
  await click("training-player-0");
  await click("training-drill-hp");
  const team = onDone.mock.calls[0][0];
  expect(team[0].hp).toBe(0);
  expect(team[0].maxHp).toBe(run.team[0].maxHp + 12);
});

test("EXP report renders engine before/after, bench share and KO with no blocking button", async () => {
  const run = newRun(STARTER_IDS.slice(0, 3));
  run.team[2].hp = 0;
  const { report } = grantCombatXp(run.team, run.activeUid, 11, true);
  await act(async () => root.render(<XpReport report={report} />));
  expect(host.textContent).toContain("+202 EXP");
  expect(host.textContent).toContain("Lv3 → Lv5!");
  expect(host.textContent).toContain("Panchina 70%: +141");
  expect(host.textContent).toContain("EXP 78 / 80");
  expect(host.textContent).toContain("Nessuna EXP da combattimento");
  expect(host.querySelector("button")).toBeNull();
});

test("TeamScreen exposes current and required EXP with a progress bar", async () => {
  const run = newRun(STARTER_IDS.slice(0, 3));
  run.team[0].xp = 17;
  await act(async () => root.render(<TeamScreen run={run} />));
  expect(host.textContent).toContain(`EXP 17 / ${xpProgress(run.team[0]).required}`);
  expect(host.querySelector('[role="progressbar"]')).not.toBeNull();
});

test("neutral matchup stays silent and Talisman overrides resistance", async () => {
  const run = newRun(STARTER_IDS.slice(0, 3));
  const attacker = run.team[0];
  const defender = { ...run.team[1], element: attacker.move.element };
  await act(async () => root.render(<MatchupBadge attacker={attacker} defender={defender} />));
  expect(host.textContent).toBe("");
  const boosted = { ...attacker, status: { ...attacker.status, talisman: true } };
  await act(async () => root.render(<MatchupBadge attacker={boosted} defender={defender} />));
  expect(host.textContent).toBe("SUPEREFFICACE");
});

test("starter difficulty selection only affects the new run and clearly labels the start button", async () => {
  const existing = newRun(STARTER_IDS.slice(0, 3), "normal");
  saveRun(existing);
  const onStart = jest.fn();
  await act(async () => root.render(<TeamSelect meta={{ unlocked: STARTER_IDS }} onStart={onStart} />));
  expect(find("difficulty-normal").checked).toBe(true);
  await click("difficulty-easy");
  expect(find("difficulty-easy").checked).toBe(true);
  expect(find("start-run-btn").textContent).toContain("FACILE");
  expect(loadRun()).toEqual(existing);
  for (const id of STARTER_IDS.slice(0, 3)) await click(`starter-${id}`);
  await click("start-run-btn");
  expect(onStart).toHaveBeenCalledWith(STARTER_IDS.slice(0, 3).map(id => `${id}:base`), "easy");
});

test("Hub labels the persisted difficulty and EndScreen shows local playtest figures", async () => {
  const run = newRun(STARTER_IDS.slice(0, 3), "easy");
  run.stats.wins = 5; run.stats.recruits = 3; run.stats.fusions = 1;
  await act(async () => root.render(<HubScreen run={run} />));
  expect(find("run-difficulty").textContent).toBe("FACILE");
  await act(async () => root.render(<EndScreen run={run} result="lose" />));
  const summary = find("playtest-summary").textContent;
  for (const text of ["FACILE", "Ondata raggiunta", "Partite vinte", "Calciatori reclutati", "Fusioni DNA", "Livello medio", "3.0", "Livello massimo"]) expect(summary).toContain(text);
});


test("V2m reward and shop share textual rarity labels including Epic DNA", async () => {
 await act(async()=>root.render(<RewardScreen rewards={["barretta","azzardo","cuneo"]} money={40} onPick={jest.fn()} />));
 expect(find("item-rarity-barretta").textContent).toBe("Comune");
 expect(find("item-rarity-azzardo").textContent).toBe("Raro");
 expect(find("item-rarity-cuneo").textContent).toBe("Epico");
 const run={...newRun(STARTER_IDS.slice(0,3)),pending:{type:"shop"}};
 await act(async()=>root.render(<ShopScreen run={run} stock={[{id:"cuneo",price:300}]} onBuy={jest.fn()} />));
 expect(find("item-rarity-cuneo").textContent).toBe("Epico");
});

test("V2m inventory redeems sponsor voucher and prevents wasting battle-only buffs", async () => {
 const run={...newRun(STARTER_IDS.slice(0,3)),items:{buono:1,grinta:1,tenuta:1,azzardo:1}};
 const update=jest.fn();
 await act(async()=>root.render(<TeamScreen run={run} onUpdate={update} />));
 for(const id of ["grinta","tenuta","azzardo"]) expect(find(`bag-use-${id}`).disabled).toBe(true);
 await click("bag-use-buono");
 expect(update.mock.calls[0][0].money).toBe(run.money+35);
 expect(update.mock.calls[0][0].items.buono||0).toBe(0);
});


test("V2n Golden Ball highlights KO targets and disables living players in the bag", async()=>{
 const run={...newRun(STARTER_IDS.slice(0,3)),items:{pallone:1}};run.team[1].hp=0;
 const update=jest.fn();await act(async()=>root.render(<TeamScreen run={run} onUpdate={update} />));
 await click("bag-use-pallone");
 expect(find("team-item-target-0").disabled).toBe(true);
 expect(find("team-item-target-1").disabled).toBe(false);
 expect(find("team-item-target-1").textContent).toContain("KO • RIANIMABILE");
 await click("team-item-target-0");expect(update).not.toHaveBeenCalled();
 await click("team-item-target-1");
 expect(update.mock.calls[0][0].team[1].hp).toBe(Math.round(run.team[1].maxHp*.5));
 expect(update.mock.calls[0][0].team[0]).toEqual(run.team[0]);
});
