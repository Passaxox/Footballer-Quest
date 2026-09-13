import { act } from "react";
import { createRoot } from "react-dom/client";
import GuideScreen from "./GuideScreen";
import TeamSelect from "./TeamSelect";
import HubScreen from "./HubScreen";
import TitleScreen from "./TitleScreen";
import { recruitVersion, unlockStarter } from "@/game/collection";
import { newRun } from "@/game/engine";
import { STARTER_IDS } from "@/game/data";

jest.mock("@/game/audio", () => ({ sfx: new Proxy({}, { get: () => jest.fn() }) }));

let root, host;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
});

const click = async (selector) => {
  const el = typeof selector === "string" ? host.querySelector(`[data-testid="${selector}"]`) : selector;
  expect(el).not.toBeNull();
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

test("GuideScreen renders mobile-first tabs and allows navigating all 8 game sections", async () => {
  const onBack = jest.fn();
  await act(async () => root.render(<GuideScreen onBack={onBack} />));

  expect(host.querySelector('[data-testid="guide-screen"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="guide-section-elements"]')).not.toBeNull();

  // Test navigation across sections
  const tabs = [
    { tab: "guide-tab-synergies", section: "guide-section-synergies" },
    { tab: "guide-tab-rarity", section: "guide-section-rarity" },
    { tab: "guide-tab-nodes", section: "guide-section-nodes" },
    { tab: "guide-tab-items", section: "guide-section-items" },
    { tab: "guide-tab-versions", section: "guide-section-versions" },
    { tab: "guide-tab-events", section: "guide-section-events" },
    { tab: "guide-tab-glossary", section: "guide-section-glossary" },
    { tab: "guide-tab-elements", section: "guide-section-elements" },
  ];

  for (const { tab, section } of tabs) {
    await click(tab);
    expect(host.querySelector(`[data-testid="${section}"]`)).not.toBeNull();
  }

  // Test close/back
  await click("guide-back-btn");
  expect(onBack).toHaveBeenCalledTimes(1);

  await click("guide-close-btn");
  expect(onBack).toHaveBeenCalledTimes(2);
});

test("TitleScreen exposes guide-btn and calls onGuide", async () => {
  const onGuide = jest.fn();
  const meta = { unlocked: STARTER_IDS, runs: 0, bestWave: 1 };
  await act(async () => root.render(<TitleScreen hasRun={false} meta={meta} onGuide={onGuide} />));

  const guideBtn = host.querySelector('[data-testid="guide-btn"]');
  expect(guideBtn).not.toBeNull();
  await click("guide-btn");
  expect(onGuide).toHaveBeenCalledTimes(1);
});

test("TeamSelect groups multiple versions of the same Character into 1 slot and allows toggling forms", async () => {
  // Unlock both base Jude and Royal Jude
  let meta = unlockStarter({ unlocked: ["mark", "axel", "jude"], collection: {} }, "jude");
  meta = recruitVersion(meta, "jude:royal");

  const onStart = jest.fn();
  await act(async () => root.render(<TeamSelect meta={meta} onStart={onStart} />));

  // Verify only 1 card group is rendered for character 'jude'
  const judeGroups = host.querySelectorAll('[data-testid="starter-group-jude"]');
  expect(judeGroups).toHaveLength(1);

  // Verify version selector is present for Jude
  const versionSelector = host.querySelector('[data-testid="version-selector-jude"]');
  expect(versionSelector).not.toBeNull();

  // Switch to Royal form via tab
  await click("starter-tab-jude:royal");

  // Select Jude Royal
  await click("starter-jude:royal");

  // Select Mark and Axel to make 3 starters
  await click("starter-mark");
  await click("starter-axel");

  // Start button should be enabled
  const startBtn = host.querySelector('[data-testid="start-run-btn"]');
  expect(startBtn.disabled).toBe(false);
  await click("start-run-btn");

  expect(onStart).toHaveBeenCalledTimes(1);
  const selectedStarters = onStart.mock.calls[0][0];
  expect(selectedStarters).toHaveLength(3);
  expect(selectedStarters).toContain("jude:royal");
  expect(selectedStarters).not.toContain("jude"); // Did not pick base Jude
});

test("TeamSelect swapping version of an already-selected Character updates slot without duplicating", async () => {
  let meta = unlockStarter({ unlocked: ["mark", "axel", "jude"], collection: {} }, "jude");
  meta = recruitVersion(meta, "jude:royal");

  const onStart = jest.fn();
  await act(async () => root.render(<TeamSelect meta={meta} onStart={onStart} />));

  // Select Mark and Axel
  await click("starter-mark");
  await click("starter-axel");

  // Select Jude Base (card initially previews Base)
  await click("starter-jude");

  // Jude is selected in team. Now click the Royal version tab:
  await click("starter-tab-jude:royal");

  // Start run
  await click("start-run-btn");
  expect(onStart).toHaveBeenCalledTimes(1);
  const selectedStarters = onStart.mock.calls[0][0];
  expect(selectedStarters).toHaveLength(3);
  expect(selectedStarters).toContain("jude:royal");
  expect(selectedStarters).not.toContain("jude");
  expect(new Set(selectedStarters).size).toBe(3);
});

test("HubScreen unified BONUS NODO displays synergies, active node items, event modifiers, and guide button", async () => {
  const onGuide = jest.fn();
  const run = {
    ...newRun(["mark", "jack", "axel"]),
    activeNodeItems: ["grinta", "tessera"],
    temporaryModifiers: [
      { label: "Vento Favorevole", description: "+2 VEL", remainingWaves: 3 },
    ],
  };

  await act(async () => root.render(<HubScreen run={run} onGuide={onGuide} />));

  // Verify BONUS NODO panel
  const bonusNodo = host.querySelector('[data-testid="bonus-nodo"]');
  expect(bonusNodo).not.toBeNull();

  // Verify active synergies inside
  expect(host.querySelector('[data-testid="active-synergies"]')).not.toBeNull();

  // Verify active node items
  const nodeItemsEl = host.querySelector('[data-testid="active-node-items"]');
  expect(nodeItemsEl).not.toBeNull();
  expect(nodeItemsEl.textContent).toContain("Grinta in Bottiglia");
  expect(nodeItemsEl.textContent).toContain("Tessera Scout");
  expect(nodeItemsEl.textContent).toContain("Fino a fine nodo");

  // Verify temporary event modifiers
  const tempModEl = host.querySelector('[data-testid="active-temporary-modifiers"]');
  expect(tempModEl).not.toBeNull();
  expect(tempModEl.textContent).toContain("Vento Favorevole");
  expect(tempModEl.textContent).toContain("3 nodi rimanenti");

  // Verify guide button
  const guideBtn = host.querySelector('[data-testid="hub-guide-btn"]');
  expect(guideBtn).not.toBeNull();
  await click("hub-guide-btn");
  expect(onGuide).toHaveBeenCalledTimes(1);
});
