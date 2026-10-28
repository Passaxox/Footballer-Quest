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
const legacy = id => {
  const p = engine.createPlayer(id, 5, () => 0.2);
  const [, name, element, power, effect] = LEGACY_MOVE_IDENTITIES[p.versionId];
  return { ...p, move: { name, element, power, effect } };
};
const values = new Map();
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k) };

// Current Batch 1 targets only. Historical evidence above must never follow these edits.
const batch1 = {
  "mark:primary": { name: "Mano di Luce" },
  "jude:primary": { element: "natura" },
  "nathan:primary": { name: "Scatto Repentino" },
  "shawn:primary": { name: "Tormenta Glaciale" },
  "jack:primary": { name: "Muro di Roccia" },
  "kevin:primary": { name: "Dragon Crash" },
  "darren:primary": { name: "Mano Insuperabile" },
  "hurley:primary": { name: "Onda Inarrestabile", element: "aria" },
  "david:primary": { name: "Calcio Gemello" },
  "byron:primary": { name: "Colpo Supremo" },
};

const batch2 = {
  "joseph:primary": { name: "Barriera di Forza", element: "fuoco" },
  "xavier:primary": { name: "Meteora Dirompente", element: "fuoco" },
  "jordan:primary": { name: "Cometa Astrale", element: "natura" },
  "torch:primary": { name: "Palla di Fuoco", element: "fuoco" },
  "gazelle:primary": { name: "Sfera di Ghiaccio", element: "aria" },
  "rococo:primary": { name: "Mano di Luce X", element: "fuoco" },
  "canon:primary": { name: "Cannonata Rovente", element: "terra" },
  "chae:primary": { name: "Salto Abissale", element: "fuoco" },
};
const currentCorrections = { ...batch1, ...batch2 };

for (const [moveId, correction] of Object.entries(currentCorrections)) {
  const batch = Object.hasOwn(batch1, moveId) ? 1 : 2;
  test(`Batch ${batch} ${moveId}: fresh/current and historical v2 payloads round-trip separately`, () => {
    const versions = Object.values(catalog.CHARACTER_VERSIONS).filter(v => v.primaryMoveId === moveId);
    assert.equal(versions.length, moveId === "jude:primary" ? 2 : 1);
    for (const version of versions) {
      const old = legacy(version.versionId);
      const current = engine.createPlayer(version.versionId, 5, () => 0.2);
      assert.deepEqual(current.move, { moveId, ...old.move, ...correction });
      const run = engine.newRun(["mark", "jude", "axel"]);
      run.team[0] = old;
      run.activeUid = old.uid;
      run.pending = { type: "battle", enemies: [structuredClone(old)] };
      // Raw v2 storage, before current save normalization can add identity metadata.
      values.set("inazuma_rogue_run", JSON.stringify(run));
      const hydrated = storage.loadRun();
      assert.equal(hydrated.saveVersion, 2);
      assert.deepEqual(hydrated.team[0].move, { moveId, ...old.move });
      assert.deepEqual(hydrated.pending.enemies[0].move, { moveId, ...old.move });
      storage.saveRun(hydrated);
      assert.deepEqual(storage.loadRun(), hydrated);
      run.team[0] = current;
      run.pending = null;
      storage.saveRun(run);
      assert.deepEqual(storage.loadRun(), run);
    }
  });
}

test("only the 18 approved Batch 1/2 payloads differ; IDs, powers, effects and other moves stay frozen", () => {
  assert.equal(Object.keys(catalog.PRIMARY_MOVES).length, 66);
  assert.equal(Object.keys(catalog.CHARACTER_VERSIONS).length, 67);
  const changed = new Set(), elementChanges = new Set();
  for (const [versionId, [moveId, name, element, power, effect]] of Object.entries(LEGACY_MOVE_IDENTITIES)) {
    const current = catalog.PRIMARY_MOVES[catalog.resolveVersion(versionId).primaryMoveId];
    const historical = { moveId, name, element, power, effect };
    assert.deepEqual(current, { ...historical, ...currentCorrections[moveId] }, versionId);
    if (current.name !== name || current.element !== element) changed.add(moveId);
    if (current.element !== element) elementChanges.add(moveId);
  }
  assert.equal(Object.keys(batch1).length, 10);
  assert.equal(Object.keys(batch2).length, 8);
  assert.deepEqual([...changed].sort(), Object.keys(currentCorrections).sort());
  assert.deepEqual([...elementChanges].sort(), ["chae:primary", "hurley:primary", "jordan:primary", "jude:primary", "rococo:primary"]);
  assert.equal(catalog.resolveVersion("jude:base").primaryMoveId, "jude:primary");
  assert.equal(catalog.resolveVersion("jude:royal").primaryMoveId, "jude:primary");
});

test("Batch 1/2 corrected elements use existing type/STAB math and identical RNG draw counts", () => {
  const random = Math.random;
  const multipliers = {
    natura: { aria: 1.5, terra: 1, fuoco: 0.67, natura: 1 },
    aria: { aria: 1, terra: 1.5, fuoco: 1, natura: 0.67 },
    fuoco: { aria: 1, terra: 0.67, fuoco: 1, natura: 1.5 },
    terra: { aria: 0.67, terra: 1, fuoco: 1.5, natura: 1 },
  };
  try {
    for (const [id, characterElement] of [
      ["jude:base", "aria"], ["jude:royal", "aria"], ["hurley:base", "natura"],
      ["jordan:base", "aria"], ["rococo:base", "natura"], ["chae:base", "terra"],
    ]) {
      const current = engine.createPlayer(id, 8, () => 0.2);
      const oldMove = legacy(id).move;
      assert.equal(current.element, characterElement);
      for (const move of [oldMove, current.move]) {
        for (const [element, mult] of Object.entries(multipliers[move.element])) {
          const defender = { ...engine.createPlayer("mark", 8, () => 0.3), element };
          let draws = 0;
          Math.random = () => { draws++; return 0.5; };
          const result = engine.calcDamage(current, defender, move);
          const stab = move === oldMove ? 1.1 : 1;
          const base = (((2 * current.level) / 5 + 2) * move.power * current.atk / defender.def) / 9 + 2;
          assert.deepEqual(result, { dmg: Math.max(1, Math.round(base * mult * stab * 0.94)), mult, crit: false });
          assert.equal(draws, 2);
        }
      }
    }
  } finally { Math.random = random; }
});

test("all 67 fresh instances retain exact registry ID and current payload", () => {
  assert.equal(Object.keys(LEGACY_MOVE_IDENTITIES).length, 67);
  for (const v of Object.values(catalog.CHARACTER_VERSIONS)) {
    const p = engine.createPlayer(v.versionId, 5, () => 0.2);
    const [id] = LEGACY_MOVE_IDENTITIES[v.versionId];
    assert.equal(p.versionId, v.versionId);
    assert.equal(p.move.moveId, v.primaryMoveId);
    assert.equal(p.move.moveId, id);
    assert.deepEqual(p.move, catalog.PRIMARY_MOVES[id]);
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

test("Batch 2 fusion preserves selected current, historical and unresolved parent snapshots", () => {
  for (const moveId of Object.keys(batch2)) {
    const version = Object.values(catalog.CHARACTER_VERSIONS).find(v => v.primaryMoveId === moveId);
    const old = legacy(version.versionId);
    const current = engine.createPlayer(version.versionId, 5, () => 0.2);
    const historical = catalog.withPlayerIdentity(old);
    const unresolved = { ...old, move: { ...old.move, moveId: null } };
    for (const parent of [current, historical, unresolved]) {
      for (const chosen of ["a", "b"]) {
        const other = engine.createPlayer("axel", 5, () => 0.3);
        const parents = chosen === "a" ? [parent, other] : [other, parent];
        const fused = engine.fusePlayers(...parents, chosen);
        assert.deepEqual(fused.move, parent.move);
        const run = engine.newRun(["mark", "jude", "axel"]);
        run.team[0] = fused;
        run.activeUid = fused.uid;
        storage.saveRun(run);
        assert.deepEqual(storage.loadRun(), run);
      }
    }
  }
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
