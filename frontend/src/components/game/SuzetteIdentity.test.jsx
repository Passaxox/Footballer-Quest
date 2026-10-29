import { act } from "react";
import { createRoot } from "react-dom/client";
import TeamSelect from "./TeamSelect";
import CollectionScreen from "./CollectionScreen";
import TeamScreen from "./TeamScreen";
import RecruitScreen from "./RecruitScreen";
import RecordsScreen from "./RecordsScreen";
import { createPlayer, newRun } from "@/game/engine";
import { discoverVersion, recruitVersion } from "@/game/collection";
import { loadRun, recordFinishedRun } from "@/game/storage";

jest.mock("@/game/audio", () => ({ sfx: new Proxy({}, { get: () => jest.fn() }) }));
jest.mock("axios", () => ({ get: jest.fn(() => Promise.reject(new Error("offline"))) }));

const blank = { unlocked: [], collection: {} };
// Literal historical input, not a renamed post-G2 createPlayer result.
const oldSuzette = () => ({
  uid: "saved-suzette", baseId: "hector", versionId: "hector:base", characterId: "hector", name: "Rika Urabe",
  element: "natura", role: "C", tier: 2, level: 6, xp: 13, fused: false,
  move: { name: "Anello Arcobaleno", element: "natura", power: 78, effect: "charge" },
  base: { hp: 70, atk: 36, def: 28, spd: 38 }, bonus: { hp: 1, atk: 2, def: 3, spd: 4 },
  hp: 37, maxHp: 95, atk: 50, def: 40, spd: 55,
  status: { burn: 0, atkMod: 0, defMod: 0, guard: false, talisman: false },
});
const savedRun = () => {
  const run = { ...newRun(["mark", "jude", "axel"]), team: [oldSuzette()], activeUid: "saved-suzette" };
  localStorage.setItem("inazuma_rogue_run", JSON.stringify(run));
  return loadRun();
};
let root, host;
const find = id => host.querySelector(`[data-testid="${id}"]`);
const click = async id => act(async () => find(id).click());
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  host = document.createElement("div"); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); localStorage.clear(); });

test("G2 legacy starter unlock shows Suzette Hartland and launches the historical hector:base version", async () => {
  const onStart = jest.fn();
  await act(async () => root.render(<TeamSelect meta={{ unlocked: ["hector", "mark", "axel"] }} onStart={onStart} />));
  expect(find("starter-suzette").textContent).toContain("Suzette Hartland");
  expect(find("starter-hector")).toBeNull();
  expect(find("starter-rococo")).toBeNull();
  expect(find("starter-suzette").querySelector("img").getAttribute("src")).toBe("/sprites/hector.png");
  await click("starter-suzette");
  const inspector = host.querySelector("dialog");
  expect(inspector.textContent).toContain("Suzette Hartland");
  expect(inspector.textContent).toContain("Anello Arcobaleno");
  expect(inspector.textContent).toContain("POT 78");
  expect(inspector.textContent).not.toContain("Rika Urabe");
  await click("starter-confirm");
  expect(find("starter-slot-0").textContent).toContain("Suzette Hartland");
  await click("add-mark"); await click("add-axel"); await click("start-run-btn");
  expect(onStart).toHaveBeenCalledWith(["hector:base", "mark:base", "axel:base"], "normal");
  const fresh = newRun(...onStart.mock.calls[0]).team[0];
  expect(fresh).toMatchObject({ baseId: "hector", versionId: "hector:base", characterId: "suzette", name: "Suzette Hartland" });
});

test("G2 recruited Collection card uses Suzette's fresh name and historical sprite without revealing Rococo", async () => {
  const meta = recruitVersion(blank, "hector:base");
  await act(async () => root.render(<CollectionScreen meta={meta} />));
  const card = find("collection-hector");
  expect(card.textContent).toContain("Suzette Hartland");
  expect(card.textContent).toContain("Reclutato");
  expect(card.textContent).toContain("Disponibile nel draft");
  expect(card.textContent).toContain("Anello Arcobaleno");
  expect(card.querySelector("img").getAttribute("src")).toBe("/sprites/hector.png");
  expect(card.textContent).not.toContain("Rika Urabe");
  expect(find("collection-rococo").textContent).toContain("???");
  expect(find("collection-rococo").querySelector("img")).toBeNull();
  expect(find("collection-suzette:base")).toBeNull();
  expect(Object.keys(meta.collection)).toEqual(["hector:base"]);
});

test.each([false, true])("G2 discovered=%s does not grant Suzette starter eligibility", async discovered => {
  const meta = discovered ? discoverVersion(blank, "hector:base") : blank;
  await act(async () => root.render(<CollectionScreen meta={meta} />));
  expect(find("collection-hector").textContent).toContain(discovered ? "Suzette Hartland" : "???");
  expect(find("collection-hector").textContent).not.toContain("Disponibile nel draft");
  await act(async () => root.render(<TeamSelect meta={meta} />));
  expect(find("starter-suzette")).toBeNull();
});

test("G2 Rococo keeps his live display name and independent Collection and starter entries", async () => {
  const meta = recruitVersion(recruitVersion(blank, "hector:base"), "rococo:base");
  await act(async () => root.render(<CollectionScreen meta={meta} />));
  expect(find("collection-hector").textContent).toContain("Suzette Hartland");
  expect(find("collection-rococo").textContent).toContain("Rococo Urupa");
  expect(find("collection-rococo").querySelector("img").getAttribute("src")).toBe("/sprites/rococo.png");
  await act(async () => root.render(<TeamSelect meta={meta} />));
  expect(find("starter-suzette").textContent).toContain("Suzette Hartland");
  expect(find("starter-rococo").textContent).toContain("Rococo Urupa");
  await click("add-suzette"); await click("add-rococo");
  expect(find("starter-slot-0").textContent).toContain("Suzette Hartland");
  expect(find("starter-slot-1").textContent).toContain("Rococo Urupa");
});

test("G2 a loaded historical Suzette keeps Rika Urabe in Team and recorded history UI", async () => {
  const run = savedRun();
  expect(run.team[0]).toEqual({ ...oldSuzette(), move: { ...oldSuzette().move, moveId: "hector:primary" } });
  await act(async () => root.render(<TeamScreen run={run} />));
  const card = find("team-player-0");
  expect(card.textContent).toContain("Rika Urabe");
  expect(card.textContent).not.toContain("Suzette Hartland");
  expect(card.querySelector("img").getAttribute("src")).toBe("/sprites/hector.png");
  const meta = recordFinishedRun({ records: [], runs: 0, bestWave: 0 }, run, "lose");
  expect(meta.records[0].teamSnapshot[0]).toMatchObject({ name: "Rika Urabe", characterId: "hector", versionId: "hector:base" });
  await act(async () => root.render(<RecordsScreen meta={meta} />));
  expect(find("run-history-0").textContent).toContain("Rika Urabe Lv6");
  expect(host.textContent).not.toContain("Suzette Hartland");
});

test.each([
  ["historical", "offer"], ["historical", "encounter"], ["fresh", "offer"], ["fresh", "encounter"],
])("G2 %s team blocks duplicate Suzette recruitment in %s mode", async (teamKind, mode) => {
  const oldRun = savedRun(), fresh = createPlayer("hector:base");
  const run = teamKind === "historical" ? oldRun : { ...oldRun, team: [fresh], activeUid: fresh.uid };
  const player = teamKind === "historical" ? fresh : oldRun.team[0];
  const onJoin = jest.fn(), onSkip = jest.fn();
  await act(async () => root.render(<RecruitScreen run={run} player={player} price={10} mode={mode} onJoin={onJoin} onSkip={onSkip} />));
  expect(host.textContent).toContain("già nella squadra");
  expect(find("recruit-accept-btn")).toBeNull();
  expect(find("recruit-pay-btn")).toBeNull();
  expect(find("recruit-challenge-btn")).toBeNull();
  await click("recruit-skip-btn");
  expect(onSkip).toHaveBeenCalledTimes(1);
  expect(onJoin).not.toHaveBeenCalled();
});
