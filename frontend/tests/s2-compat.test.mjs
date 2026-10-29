import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// S2A guardrails. Seeded pool, Epsilon W25 and pending-encounter stability are already
// locked by the S1b fixtures in move-identity.test.mjs and are intentionally not duplicated.
const urls = new Map();
async function load(name) {
  if (urls.has(name)) return urls.get(name);
  let source = await readFile(new URL(`../src/game/${name}.js`, import.meta.url), "utf8");
  for (const [, dependency] of source.matchAll(/from "\.\/([^\"]+)"/g)) {
    source = source.replace(`"./${dependency}"`, JSON.stringify(await load(dependency)));
  }
  const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  urls.set(name, url); return url;
}
const catalog = await import(await load("catalog"));
const engine = await import(await load("engine"));
const collection = await import(await load("collection"));
const data = await import(await load("data"));

test("S2A Jim stays unchanged; G2 rekeys Suzette without creating new version IDs", () => {
  assert.equal(catalog.resolveVersion("malcolm:base").displayName, "Jim Wraith");
  assert.equal(catalog.resolveVersion("hector:base").displayName, "Suzette Hartland");
  assert.equal(catalog.canonicalCharacterId("hector:base"), "suzette");
  assert.equal(catalog.canonicalCharacterId("rococo:base"), "rococo");
  const ids = Object.keys(catalog.CHARACTER_VERSIONS);
  for (const id of ids) assert.ok(!/^(jim|suzette|malcolm-night)\b|^malcolm:(?!base$)|^hector:(?!base$)/.test(id), `unexpected identity ${id}`);
});

test("S2A Fidio/Paolo keep separate versions and move IDs under one canonical identity", () => {
  assert.equal(catalog.resolveVersion("fidio:base").primaryMoveId, "fidio:primary");
  assert.equal(catalog.resolveVersion("paolo:base").primaryMoveId, "paolo:primary");
  assert.equal(catalog.canonicalCharacterId("paolo:base"), catalog.canonicalCharacterId("fidio:base"));
  assert.notEqual(catalog.resolveVersion("paolo:base").versionId, catalog.resolveVersion("fidio:base").versionId);
});

test("S2A ownership is version-scoped: no recruited/starterUnlocked transfer", () => {
  const none = { discovered: false, recruited: false, starterUnlocked: false };
  for (const [from, to] of [["fidio:base", "paolo:base"], ["paolo:base", "fidio:base"], ["jonas:base", "jonas:zeus"], ["jonas:zeus", "jonas:base"], ["malcolm:base", "jim:base"], ["hector:base", "rococo:base"]]) {
    const meta = collection.recruitVersion({ unlocked: [], collection: {} }, from);
    assert.deepEqual(collection.getCollectionProgress(meta, to), none, `${from} -> ${to}`);
  }
});

test("S2A unknown collection keys and unlocked IDs survive migration structurally and idempotently", () => {
  const unknown = { discovered: true, recruited: false, starterUnlocked: false, extra: "kept" };
  const meta = { unlocked: ["mark", "opaque-legacy-id"], collection: { "ghost:base": unknown, "fidio:base": { discovered: true, recruited: true, starterUnlocked: true } } };
  const once = collection.migrateCollection(meta);
  assert.deepEqual(once.collection["ghost:base"], unknown);
  assert.deepEqual(once.collection["fidio:base"], { discovered: true, recruited: true, starterUnlocked: true });
  assert.ok(once.unlocked.includes("opaque-legacy-id"));
  assert.deepEqual(collection.migrateCollection(once), once);
  assert.deepEqual(meta.collection["ghost:base"], unknown, "input is not mutated");
});

test("S2A Dvalin boss and Alius event references remain the bare legacy ID", () => {
  assert.deepEqual(data.BOSSES[30].ids, ["dvalin", "torch", "gazelle"]);
  assert.deepEqual(data.BOSSES[40].ids, ["jordan", "dvalin", "xavier"]);
  assert.equal(catalog.resolveVersion("dvalin").versionId, "dvalin:base");
  assert.ok(JSON.stringify(data.EVENTS).includes('"ids":["dvalin"]'));
  assert.equal(catalog.canonicalCharacterId("dvalin:epsilon-ie2"), "dvalin");
});

test("S2A saves with duplicate canonical versions and fused snapshots hydrate without cleanup", () => {
  const run = engine.newRun(["mark", "jude", "axel"]);
  const dup = ["dvalin:base", "dvalin:epsilon-ie2", "fidio:base"].map(id => engine.createPlayer(id, 5, () => 0.2));
  const fused = { ...engine.createPlayer("mark", 5, () => 0.2), baseId: "mark+axel", fused: true, parentVersionIds: ["mark:base", "axel:base"] };
  const hydrated = engine.normalizeRun({ ...run, team: [...dup, fused].slice(0, 4) });
  assert.deepEqual(hydrated.team.map(p => p.versionId), ["dvalin:base", "dvalin:epsilon-ie2", "fidio:base", "mark:base"]);
  assert.deepEqual(hydrated.team[3].parentVersionIds, ["mark:base", "axel:base"]);
  assert.equal(hydrated.team[3].baseId, "mark+axel");
  assert.equal(hydrated.saveVersion, 2);
  assert.deepEqual([...catalog.ownedCharacterIds(hydrated.team)].sort(), ["axel", "dvalin", "fidio", "mark"]);
});
