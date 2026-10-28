import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Load production modules with the same data-URL approach as foundation tests.
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
const storage = await import(await load("storage"));
const { LEGACY_MOVE_IDENTITIES } = await import(await load("legacyMoveIdentity"));
const payload = ({ moveId, ...move }) => move;
const legacy = id => { const p = engine.createPlayer(id, 5, () => 0.2); return { ...p, move: payload(p.move) }; };
const values = new Map();
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k) };

test("all 67 fresh instances retain exact registry ID and unchanged baseline payload", () => {
  assert.equal(Object.keys(LEGACY_MOVE_IDENTITIES).length, 67);
  for (const v of Object.values(catalog.CHARACTER_VERSIONS)) {
    const p = engine.createPlayer(v.versionId, 5, () => 0.2);
    const [id, name, element, power, effect] = LEGACY_MOVE_IDENTITIES[v.versionId];
    assert.equal(p.versionId, v.versionId);
    assert.equal(p.move.moveId, v.primaryMoveId);
    assert.equal(p.move.moveId, id);
    assert.deepEqual(payload(p.move), { name, element, power, effect });
    assert.notEqual(p.move, catalog.PRIMARY_MOVES[id]);
  }
});

test("fresh v2 saves round-trip including pending enemies, recruit and reward offers", () => {
  const run = engine.newRun(["mark", "jude:royal", "axel"]);
  for (const pending of [
    { type: "battle", enemies: [engine.createPlayer("dvalin:epsilon-ie2")] },
    { type: "recruit", player: engine.createPlayer("tytan:epsilon-ie2") },
    { type: "recruit", context: { offer: engine.createPlayer("zell:epsilon-ie2"), after: "rewards" } },
    { type: "reward", context: { offer: engine.createPlayer("krypto:epsilon-ie2") } },
  ]) {
    run.pending = pending; storage.saveRun(run);
    assert.deepEqual(storage.loadRun(), run);
    assert.equal(storage.loadRun().saveVersion, 2);
  }
});

test("legacy v2 exact snapshots hydrate additively at every persisted instance path", () => {
  const run = engine.newRun(["mark", "jude", "axel"]);
  run.team = [legacy("mark"), legacy("jude:royal"), legacy("jonas:base")];
  delete run.team[0].versionId; delete run.team[0].characterId;
  run.pending = { type: "battle", enemies: [legacy("tytan:epsilon-ie2")], player: legacy("paolo"), context: { offer: legacy("fidio") }, marker: "unchanged" };
  const before = structuredClone(run);
  values.set("inazuma_rogue_run", JSON.stringify(run));
  const migrated = storage.loadRun();
  assert.equal(migrated.team[0].versionId, "mark:base");
  assert.equal(migrated.team[2].move.moveId, "jonas:primary");
  assert.equal(migrated.pending.player.move.moveId, "paolo:primary");
  assert.equal(migrated.pending.context.offer.move.moveId, "fidio:primary");
  assert.equal(migrated.pending.enemies[0].move.moveId, "tytan:epsilon-ie2:primary");
  for (let i = 0; i < 3; i++) assert.deepEqual(payload(migrated.team[i].move), before.team[i].move);
  assert.deepEqual(payload(migrated.pending.context.offer.move), before.pending.context.offer.move);
  assert.equal(migrated.pending.marker, "unchanged");
  assert.deepEqual(run, before);
  storage.saveRun(migrated); assert.deepEqual(storage.loadRun(), migrated);
});

test("exact version evidence distinguishes duplicate generic payloads and shared Jude ID", () => {
  for (const id of ["peter-drent:royal", "ares:zeus", "tytan:epsilon-ie2", "jude:base", "jude:royal", "paolo:base", "fidio:base"]) {
    assert.equal(catalog.withPlayerIdentity(legacy(id)).move.moveId, catalog.resolveVersion(id).primaryMoveId);
  }
  assert.deepEqual(legacy("peter-drent:royal").move, legacy("tytan:epsilon-ie2").move);
  assert.equal(catalog.withPlayerIdentity(legacy("jude:royal")).move.moveId, "jude:primary");
});

test("ambiguous, historical, partial or conflicting snapshots get sticky null without payload rewrites", () => {
  const original = legacy("peter-drent:royal");
  const unknown = { ...original, versionId: "unknown", baseId: "unknown", characterId: "unknown" };
  const historical = { ...original, move: { ...original.move, name: "Historical snapshot", extra: { preserved: true } } };
  const partial = structuredClone(original); delete partial.move.effect;
  const conflict = { ...original, baseId: "tytan:epsilon-ie2" };
  for (const p of [unknown, historical, partial, conflict]) {
    const out = catalog.withPlayerIdentity(p);
    assert.equal(out.move.moveId, null); assert.deepEqual(payload(out.move), p.move);
    assert.deepEqual(catalog.withPlayerIdentity(out), out);
  }
  const unresolved = { ...original, move: { ...original.move, moveId: null } };
  assert.equal(catalog.withPlayerIdentity(unresolved).move.moveId, null);
  const missing = { ...original }; delete missing.move;
  assert.equal(catalog.withPlayerIdentity(missing).move, undefined);
});

test("frozen evidence survives future registry rename or equal-payload reassignment", () => {
  const old = legacy("mark"), version = catalog.CHARACTER_VERSIONS["mark:base"], move = catalog.PRIMARY_MOVES["mark:primary"];
  try {
    catalog.PRIMARY_MOVES["mark:primary"] = { ...move, name: "Future display text", power: 1 };
    catalog.CHARACTER_VERSIONS["mark:base"] = { ...version, primaryMoveId: "new-id" };
    assert.equal(catalog.withPlayerIdentity(old).move.moveId, "mark:primary");
    assert.deepEqual(payload(catalog.withPlayerIdentity(old).move), old.move);
  } finally { catalog.CHARACTER_VERSIONS["mark:base"] = version; catalog.PRIMARY_MOVES["mark:primary"] = move; }
  try {
    catalog.CHARACTER_VERSIONS["mark:future"] = { ...version, versionId: "mark:future", legacyRosterId: null };
    const future = engine.createPlayer("mark:future"); delete future.move.moveId;
    assert.equal(catalog.withPlayerIdentity(future).move.moveId, null);
  } finally { delete catalog.CHARACTER_VERSIONS["mark:future"]; }
});

test("known or opaque historical move IDs survive unchanged even if payload differs", () => {
  for (const moveId of ["mark:primary", "retired:historical"]) {
    const p = legacy("mark"); p.move = { ...p.move, moveId, name: "Saved name", power: 101 };
    assert.deepEqual(catalog.withPlayerIdentity(p), p);
  }
});

test("fusion copies selected known ID; unresolved or old fused snapshots never guess", () => {
  const a = engine.createPlayer("mark"), b = engine.createPlayer("axel");
  for (const chosen of ["a", "b"]) {
    const fused = engine.fusePlayers(a, b, chosen);
    assert.deepEqual(fused.move, (chosen === "a" ? a : b).move);
    assert.deepEqual(catalog.withPlayerIdentity(fused), fused);
    const run = engine.newRun(["mark", "jude", "axel"]); run.team[0] = fused;
    storage.saveRun(run); assert.deepEqual(storage.loadRun().team[0], fused);
  }
  for (const move of [payload(b.move), { ...payload(b.move), moveId: null }]) {
    const fused = engine.fusePlayers(a, { ...b, move }, "b");
    assert.equal(fused.move.moveId, null); assert.deepEqual(payload(fused.move), payload(b.move));
    assert.equal(catalog.withPlayerIdentity(fused).move.moveId, null);
    const run = engine.newRun(["mark", "jude", "axel"]); run.team[0] = fused;
    storage.saveRun(run); assert.deepEqual(storage.loadRun().team[0], fused);
  }
  const oldFusion = engine.fusePlayers(a, b, "a"); delete oldFusion.move.moveId;
  assert.equal(catalog.withPlayerIdentity(oldFusion).move.moveId, null);
});

test("identity metadata leaves real attacks, action order and RNG draws unchanged for all effects", () => {
  const random = Math.random;
  const stripIds = value => JSON.parse(JSON.stringify(value, (k, v) => k === "moveId" ? undefined : v));
  try {
    for (const v of Object.values(catalog.CHARACTER_VERSIONS)) {
      const a = engine.createPlayer(v.versionId, 8, () => 0.2), b = engine.createPlayer("mark", 9, () => 0.3);
      const outcomes = [], draws = [];
      for (const identified of [false, true]) {
        let seed = 9; const values = [];
        Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const x = seed / 4294967296; values.push(x); return x; };
        const att = identified ? a : stripIds(a), def = identified ? b : stripIds(b);
        outcomes.push(stripIds({ order: engine.turnOrder(att, def), attack: engine.performAttack(att, def) })); draws.push(values);
      }
      assert.deepEqual(outcomes[1], outcomes[0]); assert.deepEqual(draws[1], draws[0]);
    }
  } finally { Math.random = random; }
});
