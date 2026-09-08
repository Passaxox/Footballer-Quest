import { act } from "react";
import { createRoot } from "react-dom/client";
import CollectionScreen from "./CollectionScreen";
import TeamSelect from "./TeamSelect";
import RecruitScreen from "./RecruitScreen";
import RecordsScreen from "./RecordsScreen";
import { Avatar } from "./ui";
import { discoverVersion, recruitVersion, unlockStarter } from "@/game/collection";
import { createPlayer, newRun } from "@/game/engine";
import { STARTER_IDS } from "@/game/data";

jest.mock("@/game/audio", () => ({ sfx: new Proxy({}, { get: () => jest.fn() }) }));
jest.mock("axios", () => ({ get: jest.fn(() => Promise.reject(new Error("offline"))) }));
let root, host;
const blank = { unlocked: [], collection: {} };
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement("div"); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); });

test("UNKNOWN conceals name, portrait and all strategic data", async () => {
  await act(async () => root.render(<CollectionScreen meta={blank} />));
  const card = host.querySelector('[data-testid="collection-darren"]');
  expect(card.textContent).toContain("???");
  expect(card.querySelector("img")).toBeNull();
  for (const text of ["Darren", "Portiere", "Natura", "Mano Mugen", "POT", "HP", "★"]) expect(card.textContent).not.toContain(text);
});
test.each(["DISCOVERED", "RECRUITED"])("%s has the appropriate portrait and ownership information", async state => {
  const meta = state === "DISCOVERED" ? discoverVersion(blank, "darren") : recruitVersion(blank, "darren");
  await act(async () => root.render(<CollectionScreen meta={meta} />));
  const card = host.querySelector('[data-testid="collection-darren"]');
  expect(card.textContent).toContain("Darren LaChance");
  expect(card.querySelector("img").getAttribute("src")).toBe("/sprites/darren.png");
  if (state === "DISCOVERED") {
    expect(card.textContent).toContain("non ancora reclutato");
    expect(card.textContent).not.toContain("Disponibile nel draft");
    expect(card.textContent).not.toContain("Mano Mugen");
  } else {
    expect(card.textContent).toContain("Reclutato");
    expect(card.textContent).toContain("Mano Mugen");
    expect(card.textContent).toContain("POT 50");
    expect(card.textContent).toContain("HP 88");
  }
});
test("draft accepts collection-only unlock and legacy unlock, but never discovery alone", async () => {
  const unlocked = unlockStarter(blank, "darren");
  const meta = discoverVersion({ ...unlocked, unlocked: ["mark"] }, "byron");
  await act(async () => root.render(<TeamSelect meta={meta} />));
  expect(host.querySelector('[data-testid="starter-darren"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="starter-mark"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="starter-byron"]')).toBeNull();
  expect(host.querySelector('[data-testid="start-run-btn"]').disabled).toBe(true);
});
test("recruit offer reports discovery without accepting the player", async () => {
  const onDiscover = jest.fn(), onJoin = jest.fn();
  const player = createPlayer("darren");
  await act(async () => root.render(<RecruitScreen run={newRun(STARTER_IDS.slice(0, 3))} player={player} mode="offer" onDiscover={onDiscover} onJoin={onJoin} />));
  expect(onDiscover).toHaveBeenCalledWith(player);
  expect(onJoin).not.toHaveBeenCalled();
});
test("unknown identities keep legacy history readable and use a neutral avatar", async () => {
  const unknown = { baseId: "unknown", versionId: "future:version", name: "Saved name", level: 8, fused: false };
  await act(async () => root.render(<><Avatar p={unknown} /><RecordsScreen meta={{ records: [{ wave: 8, glory: 40, team: [unknown.name], teamSnapshot: [unknown], averageLevel: 8, maxLevel: 8 }] }} /></>));
  expect(host.textContent).toContain("Saved name Lv8");
  expect(host.querySelector('[aria-label="Ritratto non disponibile"]')).not.toBeNull();
});
