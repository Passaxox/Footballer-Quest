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
  await act(async () => host.querySelector('[aria-label="Squadra"]').click()); await click("choice-royal-academy");
  expect(host.querySelectorAll(".ss-tile")).toHaveLength(1);
  await click("starter-jude"); expect(find("version-jude:royal").getAttribute("aria-pressed")).toBe("true");
  await click("starter-confirm");
  await act(async () => host.querySelector('[aria-label="Squadra"]').click()); await click("choice-raimon");
  expect(find("starter-slot-0").textContent).toContain("Royal Academy");
  await click("starter-slot-0"); expect(find("version-jude:royal").getAttribute("aria-pressed")).toBe("true");
  await click("starter-confirm"); expect(find("starter-slot-0")).toBeNull();
});


test("Epsilon unlocks, aliases and Dvalin versions share canonical starter slots", async () => {
  const ids = ["dvalin", "tytan", "krypto", "zell"].map(id => `${id}:epsilon-ie2`);
  expect(starterGroups({ unlocked: [] })).toHaveLength(0);
  const unlocked = { unlocked: ["dvalin"], collection: Object.fromEntries(ids.map(id => [id, { starterUnlocked: true }])) };
  const groups = starterGroups(unlocked);
  expect(groups).toHaveLength(4);
  expect(groups.find(g => g.characterId === "dvalin").versions).toHaveLength(2);
  for (const [alias, id] of [["Dave Quagmire", "dvalin"], ["Titan", "tytan"], ["Donovan Crag", "tytan"], ["Crypto", "krypto"], ["Kuriputo", "krypto"], ["Zeke Valanche", "zell"], ["Segata", "zell"]]) {
    expect(filterStarterGroups(groups, { search: alias }).map(g => g.characterId)).toEqual([id]);
  }
  expect(selectStarterVersion(["dvalin:base"], ids[0])).toEqual([ids[0]]);
  await act(async () => root.render(<TeamSelect meta={unlocked} />));
  expect(host.querySelectorAll(".ss-tile")).toHaveLength(4);
  await click("starter-dvalin"); await click("version-dvalin:epsilon-ie2"); await click("starter-confirm");
  expect(find("starter-slot-0").textContent).toContain("Epsilon");
  expect(newRun([ids[0], ids[1], ids[2]]).team.map(p => p.versionId)).toEqual(ids.slice(0, 3));
});


test("direct add is separate from inspector, respects capacity, and initializes exact versions", async () => {
  const onStart = jest.fn();
  await act(async () => root.render(<TeamSelect meta={meta} onStart={onStart} />));
  await click("add-mark");
  expect(host.querySelector("dialog")).toBeNull();
  expect(find("starter-slot-0").textContent).toContain("Mark");
  await click("add-jude");
  expect(host.querySelector(".ss-picker")).not.toBeNull();
  expect(host.querySelector('[data-testid="move-info"]')).toBeNull();
  await click("choice-jude:royal");
  expect(find("starter-slot-1").textContent).toContain("Royal Academy");
  await click("add-axel"); await click("add-fidio");
  expect(host.querySelector('[role="status"]').textContent).toContain("Tre posti");
  await click("add-jude");
  expect(host.querySelector("dialog")).toBeNull();
  await click("start-run-btn");
  expect(onStart).toHaveBeenCalledWith(["mark:base", "jude:royal", "axel:base"], "normal");
  expect(newRun(...onStart.mock.calls[0]).team.map(p => p.versionId)).toEqual(["mark:base", "jude:royal", "axel:base"]);
  await click("starter-jude"); await click("version-jude:base");
  await act(async () => host.querySelector('[aria-label="Chiudi dettagli"]').click());
  expect(find("starter-slot-1").textContent).toContain("Raimon");
  expect(host.querySelectorAll('.ss-summary button')).toHaveLength(3);
  await click("add-fidio");
  expect(host.querySelector('[role="status"]')).not.toBeNull();
  expect(host.querySelector("dialog")).toBeNull();
  await click("starter-slot-0"); await click("starter-confirm");
  expect(host.querySelector('[role="status"]')).toBeNull();
  expect(host.querySelectorAll('.ss-summary button')).toHaveLength(2);
});

test("custom filters combine, close, indicate active choice and reset", async () => {
  await act(async () => root.render(<TeamSelect meta={meta} />));
  expect(host.querySelector("select")).toBeNull();
  for (const [label, id] of [["Squadra", "royal-academy"], ["Ruolo", "C"], ["Elemento", "aria"]]) {
    await act(async () => host.querySelector(`[aria-label="${label}"]`).click());
    await click(`choice-${id}`);
    expect(host.querySelector("dialog")).toBeNull();
  }
  expect(host.querySelectorAll(".ss-tile")).toHaveLength(1);
  await click("add-jude");
  expect(find("starter-slot-0").textContent).toContain("Royal Academy");
  await act(async () => host.querySelector('[aria-label="Elemento"]').click());
  expect(find("choice-aria").getAttribute("aria-pressed")).toBe("true");
  await click("choice-all");
  await act(async () => host.querySelector('.ss-count button').click());
  expect(host.querySelectorAll(".ss-tile")).toHaveLength(4);
  expect(host.querySelector('[aria-label="Squadra"]').textContent).toContain("Tutte");
  for (const label of ["Ruolo", "Elemento"]) expect(host.querySelector(`[aria-label="${label}"]`).textContent).toContain("Tutti");
  await act(async () => host.querySelector('[aria-label="Squadra"]').click());
  await act(async () => host.querySelector('[aria-label="Chiudi scelta"]').click());
  expect(host.querySelector("dialog")).toBeNull();
});
