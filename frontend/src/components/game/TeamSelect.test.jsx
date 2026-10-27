import { act } from "react";
import { createRoot } from "react-dom/client";
import TeamSelect from "./TeamSelect";
import { starterGroups, filterStarterGroups, selectStarterVersion } from "@/game/starterBrowser";
import { CHARACTER_VERSIONS, canonicalCharacterId } from "@/game/catalog";
import { newRun } from "@/game/engine";
import { saveRun, loadRun } from "@/game/storage";

jest.mock("@/game/audio", () => ({ sfx: new Proxy({}, { get: () => jest.fn() }) }));
const meta = { unlocked: ["mark", "axel", "jude", "paolo", "fidio", "jonas"], collection: { "jude:royal": { starterUnlocked: true } } };
let root, host;
const find = id => host.querySelector(`[data-testid="${id}"]`);
const click = async id => act(async () => find(id).click());
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement("div"); root = createRoot(host); });
afterEach(async () => act(async () => root.unmount()));

test("grouping uses canonical people, eligible versions only, and localization aliases", () => {
  const groups = starterGroups(meta);
  expect(groups.map(g => g.characterId)).toEqual(["mark", "axel", "jude", "fidio"]);
  expect(groups.find(g => g.characterId === "jude").versions).toHaveLength(2);
  expect(groups.find(g => g.characterId === "fidio").versions).toHaveLength(2);
  expect(starterGroups({ unlocked: ["jude"], collection: { "jude:royal": { discovered: true } } })[0].versions).toHaveLength(1);
  expect(filterStarterGroups(groups, { search: "Paolo Bianchi" }).map(g => g.characterId)).toEqual(["fidio"]);
});

test("filters require a matching eligible incarnation, without historical team leakage", () => {
  const groups = starterGroups(meta);
  for (const team of ["raimon", "royal-academy"]) expect(filterStarterGroups(groups, { team }).some(g => g.characterId === "jude")).toBe(true);
  expect(filterStarterGroups(groups, { team: "zeus" })).toEqual([]);
  expect(filterStarterGroups(groups, { role: "P" }).map(g => g.characterId)).toEqual(["mark"]);
  expect(filterStarterGroups(groups, { element: "aria" }).map(g => g.characterId)).toEqual(["jude"]);
  expect(filterStarterGroups(groups, { search: "royal" })[0].matchingVersions.map(v => v.versionId)).toEqual(["jude:royal"]);
  expect(filterStarterGroups(groups, { team: "royal-academy", role: "P" })).toEqual([]);
});

test("300 synthetic versions group deterministically into 150 tiles with bounded detail rendering", async () => {
  const added = [], collection = {};
  try {
    for (let i = 0; i < 300; i++) {
      const versionId = `scale-${i}:test`; added.push(versionId); collection[versionId] = { starterUnlocked: true };
      CHARACTER_VERSIONS[versionId] = { ...CHARACTER_VERSIONS["mark:base"], versionId, legacyRosterId: null, characterId: `scale-person-${Math.floor(i / 2)}`, displayName: `Test Player ${Math.floor(i / 2)}`, primaryTeamId: i % 2 ? "royal-academy" : "raimon" };
    }
    const groups = starterGroups({ collection });
    expect(groups).toHaveLength(150);
    expect(new Set(groups.map(g => g.characterId)).size).toBe(150);
    const a = filterStarterGroups(groups, { team: "royal-academy", search: "Test Player 1" });
    expect(a).toEqual(filterStarterGroups(groups, { team: "royal-academy", search: "Test Player 1" }));
    expect(a.every(g => g.matchingVersions.length === 1)).toBe(true);
    const selection = selectStarterVersion([added[0]], added[1]);
    expect(selection).toEqual([added[1]]);
    await act(async () => root.render(<TeamSelect meta={{ collection }} />));
    expect(host.querySelectorAll(".ss-tile")).toHaveLength(150);
    expect(host.querySelectorAll('[data-testid="move-info"]')).toHaveLength(0);
    await click("starter-scale-person-0");
    expect(host.querySelectorAll('[data-testid="move-info"]')).toHaveLength(1);
    await click("starter-confirm");
    expect(find("starter-slot-0").textContent).toContain("Test Player 0");
  } finally { added.forEach(id => delete CHARACTER_VERSIONS[id]); }
});

test("one Jude tile, inline switch updates the same slot, correct versions enter the run", async () => {
  const onStart = jest.fn();
  const oldRun = newRun(["mark", "axel", "jude"]); delete oldRun.overworld; saveRun(oldRun);
  await act(async () => root.render(<TeamSelect meta={meta} onStart={onStart} />));
  expect(host.querySelectorAll('[data-testid="starter-jude"]')).toHaveLength(1);
  await click("starter-jude"); await click("version-jude:royal"); await click("starter-confirm");
  expect(find("starter-slot-0").textContent).toContain("Royal Academy");
  await click("starter-slot-0"); await click("version-jude:base");
  await act(async () => host.querySelector('[aria-label="Chiudi dettagli"]').click());
  expect(find("starter-slot-0").textContent).toContain("Raimon");
  expect(find("starter-slot-1")).toBeNull();
  for (const id of ["mark", "axel"]) { await click(`starter-${id}`); expect(host.querySelector(".ss-versions")).toBeNull(); await click("starter-confirm"); }
  await click("starter-slot-0"); await click("version-jude:royal");
  await act(async () => host.querySelector('[aria-label="Chiudi dettagli"]').click());
  await click("start-run-btn");
  expect(onStart).toHaveBeenCalledWith(["jude:royal", "mark:base", "axel:base"], "normal");
  const run = newRun(...onStart.mock.calls[0]);
  expect(run.team.map(p => p.versionId)).toEqual(["jude:royal", "mark:base", "axel:base"]);
  expect(new Set(run.team.map(canonicalCharacterId)).size).toBe(3);
  expect(loadRun()).toEqual(oldRun);
});

test("team filter opens matching version and preserves selected slots across filtering", async () => {
  await act(async () => root.render(<TeamSelect meta={meta} />));
  await act(async () => { const select = host.querySelector('[aria-label="Squadra"]'); select.value = "royal-academy"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(host.querySelectorAll(".ss-tile")).toHaveLength(1);
  await click("starter-jude"); expect(find("version-jude:royal").getAttribute("aria-pressed")).toBe("true");
  await click("starter-confirm");
  await act(async () => { const select = host.querySelector('[aria-label="Squadra"]'); select.value = "raimon"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(find("starter-slot-0").textContent).toContain("Royal Academy");
  await click("starter-slot-0"); expect(find("version-jude:royal").getAttribute("aria-pressed")).toBe("true");
  await click("starter-confirm"); expect(find("starter-slot-0")).toBeNull();
});
