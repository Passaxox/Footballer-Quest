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
