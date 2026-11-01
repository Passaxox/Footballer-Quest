import { act } from "react";
import { createRoot } from "react-dom/client";
import fs from "fs";
import path from "path";
import OverworldHubV2 from "./OverworldHubV2";
import * as engine from "@/game/engine";
import { STARTER_IDS } from "@/game/data";
import { graphForRunV2, selectableNodesV2 } from "@/game/overworldRunV2";
import { createOverworldMapLayoutV2 } from "@/game/overworldMapLayoutV2";
import { createOverworldArtPackV2 } from "@/game/overworldArtPackV2";

jest.mock("@/game/audio", () => ({ setSoundEnabled: jest.fn(), sfx: new Proxy({}, { get: () => jest.fn() }) }));

const starters = STARTER_IDS.slice(0, 3);
const css = fs.readFileSync(path.join(__dirname, "overworldV2.css"), "utf8");
let root, host;
const q = sel => host.querySelector(sel), all = sel => [...host.querySelectorAll(sel)];
const tid = id => q(`[data-testid="${id}"]`);
const tap = async id => act(async () => { expect(tid(id)).not.toBeNull(); tid(id).click(); });

// Valid run positioned before `node`, following the first predecessor chain (or a given path).
function runBefore(node, seed = 42, route) {
  const run = engine.newRunV2(starters, seed), graph = graphForRunV2(run);
  let pathIds = route;
  if (!pathIds) {
    pathIds = []; let current = node;
    while (current.wave > 1) { current = graph.nodes.find(n => n.next.includes(current.nodeId)); pathIds.unshift(current.nodeId); }
  }
  return { ...run, wave: node.wave, overworld: { ...run.overworld, completedWave: node.wave - 1, path: pathIds } };
}
const nodeAt = (wave, seed = 42, pick = n => true) => graphForRunV2(engine.newRunV2(starters, seed)).nodes.find(n => n.wave === wave && pick(n));
const runAtWave = (wave, seed = 42) => runBefore(nodeAt(wave, seed), seed);
async function render(run, props = {}) {
  const onSelectNode = jest.fn();
  await act(async () => root.render(<OverworldHubV2 run={run} onSelectNode={onSelectNode} onTeam={jest.fn()} onPause={jest.fn()} onAbandon={jest.fn()} {...props} />));
  return onSelectNode;
}
const layoutFor = run => createOverworldMapLayoutV2(graphForRunV2(run));
const parse = value => value.split(" ").map(p => p.split(",").map(Number));

beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement("div"); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); });

test("reachable nodes: map and tactical panel expose exactly the selectable set; tapping focuses, CTA commits once", async () => {
  const run = engine.newRunV2(starters, 42), options = selectableNodesV2(run);
  expect(options.length).toBeGreaterThan(1);
  const onSelect = await render(run);
  const ids = options.map(n => n.nodeId);
  expect(all(".v2-destination").map(el => el.dataset.testid)).toEqual(ids.map(id => `v2-node-${id}`));
  expect(all(".v2-map-hit").map(el => el.dataset.testid)).toEqual(ids.map(id => `v2-map-node-${id}`));
  expect(tid("v2-confirm-btn").disabled).toBe(true);
  await tap(`v2-map-node-${ids[1]}`);
  expect(onSelect).not.toHaveBeenCalled();
  expect(tid(`v2-node-${ids[1]}`).getAttribute("aria-pressed")).toBe("true");
  expect(tid("v2-confirm-btn").disabled).toBe(false);
  await tap(`v2-node-${ids[0]}`);
  expect(tid("v2-confirm-btn").textContent).toContain("W1");
  await act(async () => { tid("v2-confirm-btn").click(); tid("v2-confirm-btn").click(); });
  expect(onSelect).toHaveBeenCalledTimes(1); expect(onSelect).toHaveBeenCalledWith(ids[0]);
});

test("unreachable nodes are never interactive and a lone destination is preselected", async () => {
  const run = runAtWave(10), options = selectableNodesV2(run);
  expect(options).toHaveLength(1);
  const onSelect = await render(run);
  const hidden = layoutFor(run).nodes.filter(n => n.nodeId !== options[0].nodeId);
  hidden.forEach(n => expect(tid(`v2-map-node-${n.nodeId}`)).toBeNull());
  expect(tid("v2-confirm-btn").disabled).toBe(false);
  await tap("v2-confirm-btn");
  expect(onSelect).toHaveBeenCalledWith(options[0].nodeId);
});

test("frame A/B navigation follows the wave and can be browsed and reset", async () => {
  const run = runAtWave(6);
  await render(run);
  expect(q(".v2-map").dataset.frameId).toBe("district:1:B");
  expect(tid("v2-frame-current").textContent).toContain("Inazuma Town · Quadro B");
  await tap("v2-frame-prev");
  expect(q(".v2-map").dataset.frameId).toBe("district:1:A");
  expect(tid("v2-frame-current").textContent).toContain("W1–W5");
  expect(all(".v2-map-hit")).toHaveLength(0);
  expect(all(".v2-destination").length).toBeGreaterThan(0); // panel still gives access
  await tap("v2-frame-current");
  expect(q(".v2-map").dataset.frameId).toBe("district:1:B");
  await tap("v2-frame-next");
  expect(q(".v2-map").dataset.frameId).toBe("district:2:A");
  expect(tid("v2-frame-next").disabled).toBe(false);
});

test("browsing resets when the wave advances", async () => {
  const run = runAtWave(6);
  await render(run); await tap("v2-frame-prev");
  const next = runBefore(nodeAt(7), 42, [...run.overworld.path, selectableNodesV2(run)[0].nodeId]);
  await render(next);
  expect(q(".v2-map").dataset.frameId).toBe("district:1:B");
});

test.each([[1, 6], [10, 11]])("roads cross the seam W%i to W%i continuously and only layout edges are drawn", async (fromWave, toWave) => {
  const run = runAtWave(fromWave), layout = layoutFor(run);
  const read = async frame => {
    const wave = layout.frames.find(f => f.frameId === frame).fromWave;
    await render(runAtWave(wave));
    return all("polyline[data-edge-id]").map(el => ({ id: el.dataset.edgeId, state: el.dataset.state, points: parse(el.getAttribute("points")) }));
  };
  const frameOf = wave => layout.frames.find(f => wave >= f.fromWave && wave <= f.toWave);
  const a = frameOf(toWave - 1), b = frameOf(toWave);
  expect(a.frameId).not.toBe(b.frameId);
  const left = await read(a.frameId), right = await read(b.frameId);
  for (const [list, frame] of [[left, a], [right, b]]) {
    const expected = layout.edges.flatMap(e => e.fragments.filter(f => f.frameId === frame.frameId).map(() => e.edgeId));
    expect(list.map(r => r.id).sort()).toEqual(expected.sort());
  }
  const crossing = layout.edges.filter(e => e.transition && e.fromFrameId === a.frameId && e.toFrameId === b.frameId);
  expect(crossing.length).toBeGreaterThan(0);
  for (const edge of crossing) {
    const out = left.find(r => r.id === edge.edgeId), inn = right.find(r => r.id === edge.edgeId);
    expect(out.points.at(-1)).toEqual([1000, edge.transition.point.y]);
    expect(inn.points[0]).toEqual([0, edge.transition.point.y]);
  }
});

test("a road keeps the same state on both sides of the frame seam", async () => {
  const run = runAtWave(6);
  const layout = layoutFor(run);
  const edge = layout.edges.find(e => e.transition && e.fromId === run.overworld.path.at(-1));
  await render(run); await tap("v2-frame-prev");
  const before = q(`polyline[data-edge-id='${edge.edgeId}']`).dataset.state;
  await tap("v2-frame-next");
  expect(q(`polyline[data-edge-id='${edge.edgeId}']`).dataset.state).toBe(before);
});

test("completed path, reachable roads and discarded branches are distinguished", async () => {
  const run = runAtWave(9), layout = layoutFor(run), path = run.overworld.path;
  await render(run);
  const options = selectableNodesV2(run).map(n => n.nodeId);
  await tap("v2-frame-prev"); // waves 6-10 are current; path below spans both frames
  await tap("v2-frame-current");
  const nodeState = id => { const el = host.querySelector(`[data-node-id='${id}']`); return el && el.dataset.state; };
  const edgeStates = id => all(`polyline[data-edge-id='${id}']`).map(el => el.dataset.state);
  for (const frameBtn of ["current", "prev"]) {
    if (frameBtn === "prev") await tap("v2-frame-prev");
    for (const node of layout.nodes.filter(n => n.frameId === q(".v2-map").dataset.frameId)) {
      const expected = path.includes(node.nodeId) ? "completed" : options.includes(node.nodeId) ? "reachable" : node.wave < 9 ? "discarded" : null;
      if (expected) expect(nodeState(node.nodeId)).toBe(expected);
    }
  }
  const completedEdges = layout.edges.filter(e => path.includes(e.fromId) && path.includes(e.toId));
  expect(completedEdges).toHaveLength(path.length - 1);
  await tap("v2-frame-current");
  const edge = layout.edges.find(e => e.fromId === path.at(-1) && options.includes(e.toId));
  expect(edgeStates(edge.edgeId)).toEqual(["reachable"]);
  const discarded = layout.edges.find(e => e.toId && layout.nodes.find(n => n.nodeId === e.toId).wave === 8 && !path.includes(e.toId) && e.fromFrameId === "district:1:B");
  if (discarded) expect(edgeStates(discarded.edgeId)).toEqual(["discarded"]);
  expect(all("[data-state='discarded']").length).toBeGreaterThan(0);
  expect(all(".v2-pad-completed .v2-pad-check").length).toBeGreaterThan(0);
  expect(all(".v2-pad-discarded .v2-pad-cross").length).toBeGreaterThan(0);
});

test("Caravan sits on the current node and arrives across the seam in the next frame", async () => {
  const run = runAtWave(6);
  await render(run);
  expect(tid("v2-caravan").dataset.mode).toBe("arrival");
  await tap("v2-frame-prev");
  expect(tid("v2-caravan").dataset.mode).toBe("node");
  const mid = runAtWave(8);
  await render(mid);
  expect(tid("v2-caravan").dataset.mode).toBe("node");
  await render(engine.newRunV2(starters, 42));
  expect(tid("v2-caravan").dataset.mode).toBe("start");
});

test("W10 shows the Royal Academy boss with its crest slot and an enabled confirm", async () => {
  const boss = nodeAt(10, 42, n => n.boss), run = runBefore(boss);
  const onSelect = await render(run);
  const pad = q(`[data-node-id='${boss.nodeId}']`);
  expect(pad.dataset.boss).toBe("true"); expect(pad.dataset.state).toBe("reachable");
  expect(pad.querySelector("image[data-crest='royal-academy']")).not.toBeNull();
  expect(tid(`v2-node-${boss.nodeId}`).textContent).toContain("Boss · Royal Academy");
  expect(tid("v2-confirm-btn").textContent).toContain("W10");
  await tap("v2-confirm-btn");
  expect(onSelect).toHaveBeenCalledWith(boss.nodeId);
});

test("art pack assets are used and a missing asset falls back locally", async () => {
  const pack = createOverworldArtPackV2({ id: "test-pack", basePath: "/art", backgrounds: { default: "bg.png" }, caravan: "van.png" });
  await render(runAtWave(8), { artPack: pack });
  expect(q(".v2-map").dataset.artPack).toBe("test-pack");
  const bg = q(".v2-map-svg image");
  expect(bg.getAttribute("href")).toBe("/art/bg.png");
  await act(async () => { bg.dispatchEvent(new Event("error")); });
  expect(q(".v2-map-svg image").getAttribute("href")).toMatch(/^data:image\/svg\+xml/);
});

test("hidden W25 encounter is not spoiled and looks like any normal battle", async () => {
  const node = nodeAt(25), run = runBefore(node);
  expect(node.hooks.length).toBeGreaterThan(0); // the hook exists in the graph but must stay invisible
  await render(run);
  expect(host.innerHTML).not.toMatch(/epsilon|hook/i);
  const pad = q(`[data-node-id='${node.nodeId}']`);
  expect(pad.textContent).toBe("VS"); expect(pad.getAttribute("class")).toBe(q(`[data-node-id='${selectableNodesV2(run)[0].nodeId}']`).getAttribute("class"));
  expect(tid(`v2-node-${node.nodeId}`).textContent).toContain("Battaglia");
  expect(pad.attributes.length).toBeLessThanOrEqual(5);
});

test("an in-progress run (pending selection) keeps the hub non-committable and shows the active road", async () => {
  const node = nodeAt(3), run = runBefore(node), onSelect = jest.fn();
  const pendingRun = engine.beginOverworldNode(run, node.nodeId);
  await render(pendingRun, { onSelectNode: onSelect });
  expect(all(".v2-destination")).toHaveLength(0);
  expect(tid("v2-confirm-btn").disabled).toBe(true);
  expect(q(`[data-node-id='${node.nodeId}']`).dataset.state).toBe("active");
  expect(onSelect).not.toHaveBeenCalled();
});

test("existing test ids and actions are preserved", async () => {
  const onTeam = jest.fn(), onPause = jest.fn(), onAbandon = jest.fn();
  await render(engine.newRunV2(starters, 42), { onTeam, onPause, onAbandon });
  expect(tid("overworld-v2-hub")).not.toBeNull();
  await tap("v2-team-btn"); await tap("pause-run-btn"); await tap("abandon-btn");
  expect([onTeam, onPause, onAbandon].map(f => f.mock.calls.length)).toEqual([1, 1, 1]);
});

describe("mobile accessibility", () => {
  test("map hit areas never overlap and the CTA/dock stays inside the safe-area shell", () => {
    const hit = css.match(/\.v2-map-hit\s*\{[^}]*\}/)[0];
    const w = parseFloat(hit.match(/width:\s*([\d.]+)%/)[1]), h = parseFloat(hit.match(/height:\s*([\d.]+)%/)[1]);
    const layout = layoutFor(engine.newRunV2(starters, 42));
    for (const frame of layout.frames) {
      const nodes = layout.nodes.filter(n => n.frameId === frame.frameId);
      for (const a of nodes) for (const b of nodes) {
        if (a.nodeId >= b.nodeId) continue;
        const dx = Math.abs(a.local.x - b.local.x) / 10, dy = Math.abs(a.local.y - b.local.y) / 7;
        expect(dx >= w || dy >= h).toBe(true);
      }
    }
    expect(css).toMatch(/\.v2-hub-dock\s*\{[^}]*flex:\s*0 0 auto/);
    expect(css.match(/\.v2-hub-dock\s*\{[^}]*\}/)[0]).not.toMatch(/position:\s*(fixed|absolute)/);
    expect(css).toMatch(/\.v2-hub-scroll\s*\{[^}]*overflow-x:\s*hidden/);
    expect(css).toMatch(/\.v2-hub-actions button\s*\{[^}]*min-height:\s*48px/);
    expect(css).toMatch(/\.v2-frame-nav button\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.v2-destination\s*\{[^}]*min-height:\s*56px/);
    const run = fs.readFileSync(path.join(__dirname, "RunV2.jsx"), "utf8");
    expect(run).toMatch(/v2-shell fq-safe fq-safe-fit/);
    const index = fs.readFileSync(path.join(__dirname, "../../index.css"), "utf8");
    expect(index).toMatch(/\.fq-safe\s*\{[^}]*padding-bottom:\s*var\(--fq-inset-bottom\)/);
  });

  test("the tactical panel is the full-access path: every reachable node is a >=44px labelled control", async () => {
    await render(engine.newRunV2(starters, 42));
    const rows = all(".v2-destination");
    expect(rows.length).toBeGreaterThan(1);
    rows.forEach(row => { expect(row.tagName).toBe("BUTTON"); expect(row.textContent).toMatch(/W1 · /); });
    all(".v2-map-hit").forEach(btn => expect(btn.getAttribute("aria-label")).toMatch(/Wave 1/));
  });
});
