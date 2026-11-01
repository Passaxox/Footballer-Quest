import { act } from "react";
import { createRoot } from "react-dom/client";
import fs from "fs";
import path from "path";
import OverworldHubV2 from "./OverworldHubV2";
import * as engine from "@/game/engine";
import { STARTER_IDS } from "@/game/data";
import { graphForRunV2, selectableNodesV2 } from "@/game/overworldRunV2";
import { createVerticalMapLayoutV2, focusYV2, scrollTopForV2, segmentWindowV2 } from "@/game/overworldVerticalMapV2";
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
const layoutFor = run => createVerticalMapLayoutV2(graphForRunV2(run));
const roadIds = () => all("path[data-edge-id]").map(el => el.dataset.edgeId).sort();
const edgeWaves = (layout, id) => { const e = layout.edges.find(x => x.edgeId === id), w = new Map(layout.nodes.map(n => [n.nodeId, n.wave])); return [w.get(e.fromId), w.get(e.toId)]; };
// jsdom has no layout: give the scroller a deterministic viewport and map height.
function fakeLayout({ viewport = 300, mapHeight = 2000, offsetTop = 0 } = {}) {
  const defs = { clientHeight: viewport, offsetHeight: mapHeight, offsetTop };
  const saved = Object.fromEntries(Object.keys(defs).map(k => [k, Object.getOwnPropertyDescriptor(HTMLElement.prototype, k)]));
  Object.entries(defs).forEach(([k, v]) => Object.defineProperty(HTMLElement.prototype, k, { configurable: true, get() { return k === "clientHeight" && !this.classList.contains("v2-map-scroll") ? 0 : v; } }));
  return () => Object.entries(saved).forEach(([k, d]) => d ? Object.defineProperty(HTMLElement.prototype, k, d) : delete HTMLElement.prototype[k]);
}

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


test("segment navigation covers all five segments, follows the wave, and can be browsed and reset", async () => {
  const run = runAtWave(6);
  await render(run);
  expect(q(".v2-map").dataset.segment).toBe("1");
  expect(tid("v2-frame-current").textContent).toContain("Inazuma Town");
  expect(tid("v2-frame-current").textContent).toContain("W1–W10");
  expect(tid("v2-frame-prev").disabled).toBe(true);
  expect(tid("v2-frame-current").disabled).toBe(true);
  for (const seg of [2, 3, 4, 5]) { await tap("v2-frame-next"); expect(q(".v2-map").dataset.segment).toBe(String(seg)); }
  expect(tid("v2-frame-next").disabled).toBe(true);
  expect(tid("v2-frame-current").textContent).toContain("W41–W50");
  expect(all(".v2-map-hit")).toHaveLength(0); // far segments expose no controls...
  expect(all(".v2-destination").length).toBeGreaterThan(0); // ...but the panel keeps access
  await tap("v2-frame-current");
  expect(q(".v2-map").dataset.segment).toBe("1");
});

test("browsing resets when the wave advances, and W10 to W11 moves to the next segment", async () => {
  const run = runAtWave(10);
  await render(run); await tap("v2-frame-next");
  expect(q(".v2-map").dataset.segment).toBe("2");
  const boss = selectableNodesV2(run)[0];
  const next = runBefore(nodeAt(11), 42, [...run.overworld.path, boss.nodeId]);
  await render(next);
  expect(q(".v2-map").dataset.segment).toBe("2");
  expect(tid("v2-frame-current").disabled).toBe(true);
  const nodes = all("[data-node-id]").map(el => +el.dataset.wave);
  expect(Math.min(...nodes)).toBe(10); // the boss stays visible as context
});

test.each([[1, 1], [10, 1], [11, 2], [25, 3]])("W%i roads: only real graph arcs inside the segment %i window, in full", async (wave, segment) => {
  const run = runAtWave(wave), layout = layoutFor(run), view = segmentWindowV2(layout, segment);
  await render(run);
  const expected = layout.edges.filter(e => { const [a, b] = edgeWaves(layout, e.edgeId); return a >= view.windowFromWave && b <= view.windowToWave; }).map(e => e.edgeId).sort();
  expect(roadIds()).toEqual(expected);
  const graph = graphForRunV2(run);
  const arcs = new Set(graph.nodes.flatMap(n => n.next.map(id => JSON.stringify([n.nodeId, id]))));
  roadIds().forEach(id => expect(arcs.has(id)).toBe(true));
  const byId = new Map(layout.nodes.map(n => [n.nodeId, n]));
  for (const el of all("path.v2-road-bed")) {
    const [from, to] = JSON.parse(el.dataset.edgeId), a = byId.get(from), b = byId.get(to);
    expect(el.getAttribute("d")).toMatch(new RegExp(`^M${a.x} ${a.y - view.top}C.* ${b.x} ${b.y - view.top}$`));
  }
});

test("W10 to W11 roads are drawn in both segments and keep one state", async () => {
  const run = runAtWave(10), layout = layoutFor(run);
  const links = layout.edges.filter(e => e.crossesSegment && edgeWaves(layout, e.edgeId)[0] === 10);
  expect(links.length).toBeGreaterThan(0);
  await render(run);
  const first = links.map(e => q(`path[data-edge-id='${e.edgeId}']`).dataset.state);
  links.forEach(e => expect(q(`path[data-edge-id='${e.edgeId}']`).dataset.segmentLink).toBe("true"));
  await tap("v2-frame-next");
  expect(links.map(e => q(`path[data-edge-id='${e.edgeId}']`).dataset.state)).toEqual(first);
  expect(first).toEqual(links.map(() => "future")); // the boss is only reachable; roads beyond it are not yet open
});

test("completed path, reachable roads and discarded branches are distinguished", async () => {
  const run = runAtWave(9), layout = layoutFor(run), path = run.overworld.path;
  await render(run);
  const options = selectableNodesV2(run).map(n => n.nodeId);
  const nodeState = id => q(`[data-node-id='${id}']`).dataset.state;
  for (const node of layout.nodes.filter(n => n.wave <= 10)) {
    const expected = path.includes(node.nodeId) ? "completed" : options.includes(node.nodeId) ? "reachable" : node.wave < 9 ? "discarded" : null;
    if (expected) expect(nodeState(node.nodeId)).toBe(expected);
  }
  const completed = layout.edges.filter(e => path.includes(e.fromId) && path.includes(e.toId));
  expect(completed).toHaveLength(path.length - 1);
  completed.forEach(e => expect(q(`path[data-edge-id='${e.edgeId}']`).dataset.state).toBe("completed"));
  const edge = layout.edges.find(e => e.fromId === path.at(-1) && options.includes(e.toId));
  expect(q(`path[data-edge-id='${edge.edgeId}']`).dataset.state).toBe("reachable");
  const discarded = layout.edges.filter(e => edgeWaves(layout, e.edgeId)[1] <= 8 && !completed.includes(e));
  expect(discarded.length).toBeGreaterThan(0);
  discarded.forEach(e => expect(q(`path[data-edge-id='${e.edgeId}']`).dataset.state).toBe("discarded"));
  expect(all(".v2-pad-completed .v2-pad-check").length).toBe(path.length);
  expect(all(".v2-pad-discarded .v2-pad-cross").length).toBeGreaterThan(0);
});

test("Caravan marks the current node, the start, and disappears from windows that do not contain it", async () => {
  const run = runAtWave(8);
  await render(run);
  const wrap = q(".v2-caravan-wrap"), last = layoutFor(run).nodes.find(n => n.nodeId === run.overworld.path.at(-1));
  expect(tid("v2-caravan").dataset.mode).toBe("node");
  expect(wrap.getAttribute("transform")).toMatch(new RegExp(`^translate\\(${last.x} `));
  expect(q(".v2-here-ring")).not.toBeNull(); expect(wrap.textContent).toContain("QUI");
  await tap("v2-frame-next");
  expect(tid("v2-caravan")).toBeNull();
  await tap("v2-center-caravan");
  expect(q(".v2-map").dataset.segment).toBe("1"); expect(tid("v2-caravan")).not.toBeNull();
  await render(engine.newRunV2(starters, 42));
  expect(tid("v2-caravan").dataset.mode).toBe("start");
});

test("scrolling: auto-centres on the Caravan, preserves manual scroll, and the position button recentres", async () => {
  const restore = fakeLayout();
  try {
    const run = runAtWave(8), layout = layoutFor(run), view = segmentWindowV2(layout, 1);
    const y = focusYV2(layout, run.overworld.path.at(-1), run.wave);
    const target = scrollTopForV2({ y, top: view.top, bottom: view.bottom, contentHeight: 2000, viewportHeight: 300, anchor: 0.04 });
    expect(target).toBeGreaterThan(0);
    await render(run);
    const scroller = tid("v2-map-scroll");
    expect(scroller.scrollTop).toBe(target);
    scroller.scrollTop = 40; // the player scrolls manually
    await tap(`v2-map-node-${selectableNodesV2(run)[0].nodeId}`); // selecting and re-rendering must not recentre
    await render(run);
    expect(scroller.scrollTop).toBe(40);
    await tap("v2-center-caravan");
    expect(scroller.scrollTop).toBe(target);
    scroller.scrollTop = 0;
    const next = runBefore(nodeAt(9), 42, [...run.overworld.path, selectableNodesV2(run)[0].nodeId]);
    await render(next); // the wave advanced: the new zone is brought into view
    expect(scroller.scrollTop).toBeGreaterThan(target);
    await tap("v2-frame-next"); // browsing another segment starts at its first wave
    expect(scroller.scrollTop).toBeLessThan(target);
  } finally { restore(); }
});

test("the map exposes about two to three waves in a mobile viewport and keeps controls compact", () => {
  const layout = layoutFor(engine.newRunV2(starters, 42)), view = segmentWindowV2(layout, 1);
  const scale = 320 / layout.width, waveHeight = layout.geometry.waveSpacing * scale;
  expect(waveHeight).toBeLessThan(180);
  expect(Math.floor((480 - 240) / waveHeight * 10) / 10).toBeGreaterThanOrEqual(1.4); // 320x480 with HUD+dock ~240px
  expect(Math.floor((844 - 240) / (layout.geometry.waveSpacing * 390 / layout.width))).toBeGreaterThanOrEqual(2);
  expect(view.height * scale).toBeGreaterThan(480); // a segment always scrolls
});

test("W10 shows the Royal Academy boss with its own icon, crest slot and an enabled confirm", async () => {
  const boss = nodeAt(10, 42, n => n.boss), run = runBefore(boss);
  const onSelect = await render(run);
  const pad = q(`[data-node-id='${boss.nodeId}']`);
  expect(pad.dataset.kind).toBe("boss"); expect(pad.dataset.state).toBe("reachable");
  expect(pad.querySelector("image[data-crest='royal-academy']")).not.toBeNull();
  expect(pad.textContent).toMatch(/Royal.*Academy/); // the label wraps over two lines
  expect(tid("v2-tactical-panel").textContent).toContain("Boss · Royal Academy");
  expect(tid("v2-confirm-btn").textContent).toContain("W10");
  await tap("v2-confirm-btn");
  expect(onSelect).toHaveBeenCalledWith(boss.nodeId);
});

test("each activity has a distinct icon and accent, never a shared VS glyph", async () => {
  await render(engine.newRunV2(starters, 42));
  const kinds = new Map(all("[data-kind]").map(el => [el.dataset.kind, el.querySelector(".v2-ico").innerHTML]));
  expect(kinds.size).toBeGreaterThanOrEqual(3);
  expect(new Set(kinds.values()).size).toBe(kinds.size);
  expect(host.textContent).not.toContain("VS");
  [["battle", "recruit"], ["shop", "training"]].forEach(([a, b]) => expect(css).toMatch(new RegExp(`\\.v2-type-${a}\\s*\\{[^}]*--accent`)) && expect(css).toMatch(new RegExp(`v2-type-${b}`)));
});

test("hidden W25 encounter is not spoiled and looks like any normal battle", async () => {
  const node = nodeAt(25), run = runBefore(node);
  expect(node.hooks.length).toBeGreaterThan(0); // the hook exists in the graph but must stay invisible
  await render(run);
  expect(host.innerHTML).not.toMatch(/epsilon|hook/i);
  const pad = q(`[data-node-id='${node.nodeId}']`);
  expect(pad.dataset.kind).toBe("battle");
  expect(pad.getAttribute("class")).toMatch(/^v2-pad v2-type-battle v2-pad-reachable( v2-pad-focus)?$/); // a lone destination is preselected
  expect([...pad.attributes].map(a => a.name).sort()).toEqual(["class", "data-kind", "data-node-id", "data-state", "data-wave", "transform"]);
  expect(tid(`v2-node-${node.nodeId}`)?.textContent ?? tid("v2-tactical-panel").textContent).toContain("Battaglia");
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
  test("hit areas are >=44px and never overlap, in every segment window", () => {
    const layout = layoutFor(engine.newRunV2(starters, 42));
    const hit = css.match(/\.v2-map-hit\s*\{[^}]*\}/)[0];
    expect(hit).toMatch(/min-width:\s*44px/); expect(hit).toMatch(/min-height:\s*44px/);
    const size = 68; // logical units used by DistrictMapV2 for the hit box
    expect(size * 320 / layout.width).toBeGreaterThanOrEqual(44);
    for (const a of layout.nodes) for (const b of layout.nodes) {
      if (a.nodeId >= b.nodeId) continue;
      expect(Math.abs(a.x - b.x) >= size || Math.abs(a.y - b.y) >= size).toBe(true);
    }
  });

  test("the HUD, dock and CTA stay inside the safe-area shell; the map is the only scroller", () => {
    expect(css).toMatch(/\.v2-hub-dock\s*\{[^}]*flex:\s*0 0 auto/);
    expect(css.match(/\.v2-hub-dock\s*\{[^}]*\}/)[0]).not.toMatch(/position:\s*(fixed|absolute|sticky)/);
    expect(css.match(/\.v2-hud\s*\{[^}]*\}/)[0]).not.toMatch(/position:\s*(fixed|absolute)/);
    expect(css).toMatch(/\.v2-map-scroll\s*\{[^}]*overflow-x:\s*hidden[^}]*overflow-y:\s*auto/);
    expect(css).toMatch(/\.v2-map-scroll\s*\{[^}]*flex:\s*1 1 0%[^}]*min-height:\s*0/);
    expect(css).toMatch(/\.v2-hud-actions button\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.v2-frame-nav button\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.v2-destination\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.v2-hub-dock \.v2-cta\s*\{[^}]*min-height:\s*48px/);
    const runSrc = fs.readFileSync(path.join(__dirname, "RunV2.jsx"), "utf8");
    expect(runSrc).toMatch(/v2-shell fq-safe fq-safe-fit/);
    const index = fs.readFileSync(path.join(__dirname, "../../index.css"), "utf8");
    expect(index).toMatch(/\.fq-safe\s*\{[^}]*padding-bottom:\s*var\(--fq-inset-bottom\)/);
  });

  test("every reachable node is a labelled control in both the map and the panel; no Diario button", async () => {
    await render(engine.newRunV2(starters, 42));
    const rows = all(".v2-destination");
    expect(rows.length).toBeGreaterThan(1);
    rows.forEach(row => { expect(row.tagName).toBe("BUTTON"); expect(row.textContent).toMatch(/Battaglia|Reclutamento|Negozio|Allenamento|Evento/); });
    all(".v2-map-hit").forEach(btn => expect(btn.getAttribute("aria-label")).toMatch(/Wave 1/));
    expect(host.textContent).not.toMatch(/diario/i);
  });
});

test("the Caravan marker is never covered by the label of the node above it", async () => {
  const run = runAtWave(8), layout = layoutFor(run);
  await render(run);
  const above = layout.nodes.find(n => n.nodeId === run.overworld.path.at(-2));
  expect(q(`[data-node-id='${above.nodeId}']`).dataset.state).toBe("completed");
  expect(q(`[data-node-id='${above.nodeId}'] .v2-label`)).toBeNull();
  expect(q(`[data-node-id='${run.overworld.path.at(-1)}'] .v2-label`)).not.toBeNull();
});

test("a lone destination keeps its panel control reachable but spends no dock height; the preview names it", async () => {
  const boss = nodeAt(10, 42, n => n.boss);
  await render(runBefore(boss));
  expect(tid(`v2-node-${boss.nodeId}`).closest(".v2-chips").classList.contains("v2-chips-solo")).toBe(true);
  expect(css).toMatch(/\.v2-chips-solo\s*\{[^}]*clip-path/);
  expect(q(".v2-preview").textContent).toContain("Boss · Royal Academy");
  expect(q(".v2-preview").hidden).toBe(false);
});
