import { act } from "react";
import { createRoot } from "react-dom/client";
import OverworldMap from "./OverworldMap";
import HubScreen from "./HubScreen";
import { newRun, beginOverworldNode } from "@/game/engine";
import { routeNodes, OVERWORLD_ROUTES, completeOverworldNode } from "@/game/overworld";

let host, root;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement("div"); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); });

test("only three first tiles accept taps; path and completed nodes are locked afterward", async () => {
  let run = newRun(["mark", "axel", "jude"]);
  const onSelect = jest.fn();
  await act(async () => root.render(<OverworldMap run={run} onSelect={onSelect} />));
  expect(host.querySelectorAll("button:not(:disabled)")).toHaveLength(3);
  await act(async () => host.querySelector('[data-testid="map-node-grounds-1"]').click());
  const nodeId = routeNodes(OVERWORLD_ROUTES[1])[0].nodeId;
  expect(onSelect).toHaveBeenCalledWith(nodeId);
  run = beginOverworldNode(run, nodeId);
  await act(async () => root.render(<OverworldMap run={run} onSelect={onSelect} />));
  expect(host.querySelectorAll("button:not(:disabled)")).toHaveLength(0);
  expect(host.querySelector('[aria-current="step"]')).not.toBeNull();
  run = { ...completeOverworldNode(run), wave: 2, pending: null };
  await act(async () => root.render(<OverworldMap run={run} onSelect={onSelect} />));
  expect(host.querySelectorAll("button:not(:disabled)")).toHaveLength(1);
  expect(host.querySelector('[data-testid="map-node-grounds-2"]').disabled).toBe(false);
  expect(host.querySelector('[data-testid="map-node-town-2"]').disabled).toBe(true);
  expect(host.querySelector('[data-testid="map-node-grounds-1"]').disabled).toBe(true);
});

test("hub uses map for new runs, resume for pending, and classic flow for legacy and W11", async () => {
  const run = newRun(["mark", "axel", "jude"]);
  await act(async () => root.render(<HubScreen run={run} />));
  expect(host.querySelector('[data-testid="overworld-map"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="next-wave-btn"]').disabled).toBe(true);
  const pending = beginOverworldNode(run, routeNodes(OVERWORLD_ROUTES[0])[0].nodeId);
  await act(async () => root.render(<HubScreen run={pending} />));
  expect(host.querySelector('[data-testid="next-wave-btn"]').textContent).toBe("Riprendi");
  expect(host.querySelector('[data-testid="next-wave-btn"]').disabled).toBe(false);
  const legacy = { ...run }; delete legacy.overworld;
  for (const next of [legacy, { ...run, wave: 11 }]) {
    await act(async () => root.render(<HubScreen run={next} />));
    expect(host.querySelector('[data-testid="overworld-map"]')).toBeNull();
    expect(host.querySelector('[data-testid="next-wave-btn"]').disabled).toBe(false);
  }
});
