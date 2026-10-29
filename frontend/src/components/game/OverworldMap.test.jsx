import { act } from "react";
import { createRoot } from "react-dom/client";
import OverworldMap from "./OverworldMap";
import HubScreen from "./HubScreen";
import { newRun, beginOverworldNode } from "@/game/engine";
import { routeNodes, OVERWORLD_ROUTES, completeOverworldNode } from "@/game/overworld";
import { mapNodes, nodeState, markerNode, environmentFor, ENVIRONMENTS } from "@/game/overworldPresentation";

let host, root;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement("div"); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); });

test("only three first tiles accept taps; path and completed nodes are locked afterward", async () => {
  let run = newRun(["mark", "axel", "jude"]);
  const onSelect = jest.fn();
  await act(async () => root.render(<OverworldMap run={run} onSelect={onSelect} />));
  expect(host.querySelectorAll(".ow-node:not(:disabled)")).toHaveLength(3);
  await act(async () => host.querySelector('[data-testid="map-node-grounds-1"]').click());
  const nodeId = routeNodes(OVERWORLD_ROUTES[1])[0].nodeId;
  expect(onSelect).not.toHaveBeenCalled();
  expect(host.querySelector('dialog').textContent).toContain("Piazzale Raimon");
  const enter = host.querySelector('[data-testid="map-enter"]');
  await act(async () => { enter.click(); enter.click(); });
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(nodeId);
  run = beginOverworldNode(run, nodeId);
  await act(async () => root.render(<OverworldMap run={run} onSelect={onSelect} />));
  expect(host.querySelectorAll(".ow-node:not(:disabled)")).toHaveLength(0);
  expect(host.querySelector('[aria-current="step"]')).not.toBeNull();
  run = { ...completeOverworldNode(run), wave: 2, pending: null };
  await act(async () => root.render(<OverworldMap run={run} onSelect={onSelect} />));
  expect(host.querySelectorAll(".ow-node:not(:disabled)")).toHaveLength(1);
  expect(host.querySelector('[data-testid="map-node-grounds-2"]').disabled).toBe(false);
  expect(host.querySelector('[data-testid="map-node-town-2"]')).toBeNull();
  expect(host.querySelector('[data-testid="map-node-grounds-1"]').disabled).toBe(true);
});

test("hub uses map for new runs, resume for pending, and classic flow for legacy and W11", async () => {
  const run = newRun(["mark", "axel", "jude"]);
  await act(async () => root.render(<HubScreen run={run} />));
  expect(host.querySelector('[data-testid="overworld-map"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="next-wave-btn"]')).toBeNull();
  const pending = beginOverworldNode(run, routeNodes(OVERWORLD_ROUTES[0])[0].nodeId);
  await act(async () => root.render(<HubScreen run={pending} />));
  expect(host.querySelector('[data-testid="next-wave-btn"]').textContent).toBe("Riprendi la tappa");
  expect(host.querySelector('[data-testid="next-wave-btn"]').disabled).toBe(false);
  const legacy = { ...run }; delete legacy.overworld;
  for (const next of [legacy, { ...run, wave: 11 }]) {
    await act(async () => root.render(<HubScreen run={next} />));
    expect(host.querySelector('[data-testid="overworld-map"]')).toBeNull();
    expect(host.querySelector('[data-testid="next-wave-btn"]').disabled).toBe(false);
  }
});

test("preview cancellation does not choose a route, consume RNG or persist content", async () => {
  const run = newRun(["mark", "axel", "jude"]), before = JSON.stringify(run), select = jest.fn();
  const rng = jest.spyOn(Math, "random").mockImplementation(() => { throw Error("Preview must not roll"); });
  try {
    await act(async () => root.render(<OverworldMap run={run} onSelect={select} />));
    await act(async () => host.querySelector('[data-testid="map-node-town-1"]').click());
    await act(async () => host.querySelector('[aria-label="Chiudi anteprima"]').click());
    expect(host.querySelector('dialog')).toBeNull();
    expect(select).not.toHaveBeenCalled(); expect(JSON.stringify(run)).toBe(before);
  } finally { rng.mockRestore(); }
});

test("places reveal progressively, marker follows persisted current/completed node, Royal is a landmark", async () => {
  let run = newRun(["mark", "axel", "jude"]);
  expect(markerNode(run).nodeId).toBe("departure");
  for (const route of OVERWORLD_ROUTES) {
    let journey = { ...run, overworld: { ...run.overworld } };
    for (const node of routeNodes(route)) {
      journey = beginOverworldNode(journey, node.nodeId);
      expect(markerNode(journey).nodeId).toBe(node.nodeId);
      expect(environmentFor(journey)).toBe(ENVIRONMENTS[node.environmentId]);
      expect(nodeState(journey, node)).toBe("current");
      journey = { ...completeOverworldNode(journey), wave: journey.wave + 1, pending: null };
      const loaded = JSON.parse(JSON.stringify(journey));
      expect(markerNode(loaded).nodeId).toBe(node.nodeId);
      expect(nodeState(loaded, node)).toBe("completed");
    }
    await act(async () => root.render(<OverworldMap run={journey} onSelect={jest.fn()} />));
    expect(host.querySelector('.ow-stadium')).not.toBeNull();
    expect(host.querySelector('[data-testid="map-node-royal-10"]').disabled).toBe(false);
  }
  const nodes = mapNodes(run);
  expect(nodes.filter(n => nodeState(run, n) === "unknown")).toHaveLength(21);
  expect(nodes.filter(n => nodeState(run, n) === "available")).toHaveLength(3);
});

test("hub exposes four-item bottom nav; diary is an overlay with abandon, and centering never scrolls the page", async () => {
  const run = newRun(["mark", "axel", "jude"]), team = jest.fn(), pause = jest.fn(), abandon = jest.fn();
  const into = jest.fn(); Element.prototype.scrollIntoView = into;
  host.style.display = "block"; document.body.append(host);
  try {
    await act(async () => root.render(<HubScreen run={run} onTeam={team} onPause={pause} onAbandon={abandon} onSelectNode={jest.fn()} />));
    const nav = host.querySelector("nav.ow-tools");
    expect([...nav.querySelectorAll("button")].map(b => b.textContent)).toEqual(["Mappa", "Squadra", "Diario", "Pausa"]);
    expect(nav.parentElement.className).toBe("ow-hub");
    expect(host.querySelector('[data-testid="overworld-viewport"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="details-panel"]').hidden).toBe(true);
    await act(async () => host.querySelector('[data-testid="team-btn"]').click());
    await act(async () => host.querySelector('[data-testid="pause-run-btn"]').click());
    expect(team).toHaveBeenCalledTimes(1); expect(pause).toHaveBeenCalledTimes(1);
    await act(async () => host.querySelector('[data-testid="details-btn"]').click());
    expect(host.querySelector('[data-testid="details-panel"]').hidden).toBe(false);
    await act(async () => host.querySelector('[data-testid="abandon-btn"]').click());
    expect(abandon).toHaveBeenCalledTimes(1);
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(host.querySelector('[data-testid="details-panel"]').hidden).toBe(true);
    expect(into).not.toHaveBeenCalled();
  } finally { delete Element.prototype.scrollIntoView; host.remove(); }
});

test("viewport resize re-centres the current node unless the user has panned, and disconnects on unmount", async () => {
  const run = newRun(["mark", "axel", "jude"]), instances = [], original = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; this.disconnect = jest.fn(); instances.push(this); } observe() {} };
  const scrollTo = jest.fn(); Element.prototype.scrollTo = scrollTo;
  const size = jest.spyOn(HTMLElement.prototype, "clientHeight", "get");
  let h = 400; size.mockImplementation(() => h);
  host.style.display = "block"; document.body.append(host);
  try {
    await act(async () => root.render(<OverworldMap run={run} onSelect={jest.fn()} />));
    const vp = host.querySelector('[data-testid="overworld-viewport"]'), ro = instances[0], base = scrollTo.mock.calls.length;
    await act(async () => ro.cb()); expect(scrollTo.mock.calls.length).toBe(base);
    h = 300; await act(async () => ro.cb()); expect(scrollTo.mock.calls.length).toBe(base + 1);
    expect(scrollTo.mock.calls.at(-1)[0].behavior).toBe("auto");
    await act(async () => { vp.dispatchEvent(new WheelEvent("wheel", { bubbles: true })); });
    h = 200; await act(async () => ro.cb()); expect(scrollTo.mock.calls.length).toBe(base + 1);
    await act(async () => root.unmount()); expect(ro.disconnect).toHaveBeenCalledTimes(1);
    root = createRoot(host);
  } finally { size.mockRestore(); delete Element.prototype.scrollTo; globalThis.ResizeObserver = original; host.remove(); }
});

describe("resize recentering respects only deliberate camera changes", () => {
  let instances, original, scrollTo, size, h;
  beforeEach(async () => {
    instances = []; original = globalThis.ResizeObserver; h = 400;
    globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; this.disconnect = jest.fn(); instances.push(this); } observe() {} };
    scrollTo = jest.fn(); Element.prototype.scrollTo = scrollTo;
    size = jest.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(() => h);
    host.style.display = "block"; document.body.append(host);
    await act(async () => root.render(<OverworldMap run={newRun(["mark", "axel", "jude"])} onSelect={jest.fn()} />));
  });
  afterEach(() => { size.mockRestore(); delete Element.prototype.scrollTo; globalThis.ResizeObserver = original; host.remove(); });
  const viewport = () => host.querySelector('[data-testid="overworld-viewport"]');
  const resizeAndCount = async () => { const before = scrollTo.mock.calls.length; h += 50; await act(async () => instances[0].cb()); return scrollTo.mock.calls.length - before; };
  const button = text => [...host.querySelectorAll("button")].find(b => b.textContent.includes(text));

  test("pointerdown, node tap, and opening/closing the preview do not suppress recentering", async () => {
    const node = host.querySelector('[data-testid="map-node-grounds-1"]');
    await act(async () => { node.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true })); viewport().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true })); });
    await act(async () => node.click());
    expect(host.querySelector("dialog")).not.toBeNull();
    await act(async () => host.querySelector('[aria-label="Chiudi anteprima"]').click());
    expect(host.querySelector("dialog")).toBeNull();
    expect(await resizeAndCount()).toBe(1);
  });

  test("Tab, Enter, Escape and modified keys do not suppress recentering", async () => {
    for (const init of [{ key: "Tab" }, { key: "Enter" }, { key: "Escape" }, { key: "Home", ctrlKey: true }]) {
      await act(async () => { viewport().dispatchEvent(new KeyboardEvent("keydown", { ...init, bubbles: true })); });
    }
    const node = host.querySelector('[data-testid="map-node-grounds-1"]');
    await act(async () => { node.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })); });
    expect(await resizeAndCount()).toBe(1);
  });

  test.each([
    ["wheel", () => new WheelEvent("wheel", { bubbles: true })],
    ["touchmove", () => new Event("touchmove", { bubbles: true })],
    ["ArrowDown", () => new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })],
    ["PageDown", () => new KeyboardEvent("keydown", { key: "PageDown", bubbles: true })],
    ["Space on the viewport itself", () => new KeyboardEvent("keydown", { key: " ", bubbles: true })],
  ])("genuine %s scrolling suppresses recentering", async (_, make) => {
    await act(async () => { viewport().dispatchEvent(make()); });
    expect(await resizeAndCount()).toBe(0);
  });

  test("ROYAL jump keeps the inspected checkpoint across resize; Posizione restores recentering", async () => {
    const royal = host.querySelector(".ow-destination");
    await act(async () => royal.click());
    expect(await resizeAndCount()).toBe(0);
    await act(async () => button("Posizione").click());
    expect(scrollTo.mock.calls.at(-1)[0].behavior).toBe("smooth");
    expect(await resizeAndCount()).toBe(1);
  });

  test("ResizeObserver is observed once and disconnected on unmount", async () => {
    expect(instances).toHaveLength(1);
    await act(async () => root.unmount());
    expect(instances[0].disconnect).toHaveBeenCalledTimes(1);
    root = createRoot(host);
  });
});

test("diary dismissal restores focus to Diario via Escape and close button; Mappa keeps its own focus", async () => {
  host.style.display = "block"; document.body.append(host);
  try {
    await act(async () => root.render(<HubScreen run={newRun(["mark", "axel", "jude"])} onSelectNode={jest.fn()} />));
    const diary = () => host.querySelector('[data-testid="details-btn"]'), panel = () => host.querySelector('[data-testid="details-panel"]');
    await act(async () => diary().click());
    expect(panel().hidden).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('[data-testid="details-close-btn"]'));
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(panel().hidden).toBe(true); expect(document.activeElement).toBe(diary());
    await act(async () => diary().click());
    await act(async () => host.querySelector('[data-testid="details-close-btn"]').click());
    expect(panel().hidden).toBe(true); expect(document.activeElement).toBe(diary());
    await act(async () => diary().click());
    const map = host.querySelector('[data-testid="nav-map-btn"]');
    map.focus(); await act(async () => map.click());
    expect(panel().hidden).toBe(true); expect(document.activeElement).toBe(map);
  } finally { host.remove(); }
});
