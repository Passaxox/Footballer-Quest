import { act } from "react";
import { createRoot } from "react-dom/client";
import TeamSelect from "./TeamSelect";
import TeamScreen from "./TeamScreen";
import FusionScreen from "./FusionScreen";
import TrainingScreen from "./TrainingScreen";
import { STARTER_IDS } from "@/game/data";
import { newRun, fusePlayers } from "@/game/engine";

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
