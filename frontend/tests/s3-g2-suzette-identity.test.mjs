import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

// Load the real post-G2 catalog, hydration, collection and encounter code, without registry mocks.
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
const collection = await import(await load("collection"));
const scenarios = await import(await load("scenarios"));
const { starterGroups } = await import(await load("starterBrowser"));
const { ROSTER } = await import(await load("data"));
const { LEGACY_MOVE_IDENTITIES } = await import(await load("legacyMoveIdentity"));
const { validateCatalog, validateIdentityAudit } = await import(await load("catalogValidation"));

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
};
test.beforeEach(() => values.clear());
const RUN_KEY = "inazuma_rogue_run", META_KEY = "inazuma_rogue_meta";
const HISTORICAL_MOVE = { name: "Anello Arcobaleno", element: "natura", power: 78, effect: "charge" };

// Literal pre-rekey saveVersion 2 snapshot. Never manufactured by post-rekey createPlayer.
const historicalSuzette = (extra = {}) => ({
  uid: "old-suzette", baseId: "hector", versionId: "hector:base", characterId: "hector",
  name: "Rika Urabe", element: "natura", role: "C", tier: 2, move: { ...HISTORICAL_MOVE },
  level: 6, xp: 13, base: { hp: 70, atk: 36, def: 28, spd: 38 },
  bonus: { hp: 1, atk: 2, def: 3, spd: 4 }, maxHp: 95, hp: 37, atk: 50, def: 40, spd: 55,
  fused: false, status: { burn: 2, atkMod: 1, defMod: -1, guard: true, talisman: false },
  savedExtra: { keep: "historical" }, ...extra,
});
const rawRun = (team, pending = null) => ({
  saveVersion: 2, wave: 9, difficultyId: "normal", team, activeUid: team[0].uid, pending,
  items: { barretta: 1 }, money: 177, seenEvents: ["old-event"], fischietto: false,
  stats: { wins: 4, recruits: 2, fusions: 0, glory: 0 }, startedAt: 1700000000000,
  scenarioState: { id: "urban", revision: 1, segmentStart: 7, segmentEnd: 12 },
});
const hydrate = (team, pending) => {
  // Bypass saveRun: the first read must hydrate the genuine historical JSON.
  values.set(RUN_KEY, JSON.stringify(rawRun(team, pending)));
  const once = storage.loadRun();
  assert.ok(once);
  assert.equal(once.saveVersion, 2);
  storage.saveRun(once);
  assert.deepEqual(storage.loadRun(), once, "round-trip is idempotent");
  return once;
};
const withHistoricalMoveId = p => ({ ...p, move: { ...p.move, moveId: "hector:primary" } });
const none = { discovered: false, recruited: false, starterUnlocked: false };
const blank = () => ({ unlocked: [], collection: {} });

test("G2 rekeys only the live person/name; historical incarnation, payload and catalog order stay intact", () => {
  const version = catalog.resolveVersion("hector");
  assert.equal(catalog.resolveVersion("hector:base"), version);
  assert.deepEqual(version, {
    versionId: "hector:base", characterId: "suzette", legacyRosterId: "hector", displayName: "Suzette Hartland", kind: "player",
    role: "C", gender: null, spriteId: "hector", teamTags: [], element: "natura", types: ["natura"],
    primaryTeamId: null, legacyOnly: false, baseStats: { hp: 70, atk: 36, def: 28, spd: 38 },
    primaryMoveId: "hector:primary", secondaryMoveId: null, rarityId: null, variantId: null, categoryId: null,
    arcId: null, eraId: null, gameOrigin: null, encounterTier: 2,
  });
  assert.deepEqual(catalog.CHARACTERS.suzette, { characterId: "suzette", displayName: "Suzette Hartland" });
  assert.equal(Object.hasOwn(catalog.CHARACTERS, "hector"), false);
  assert.equal(catalog.resolveVersion("suzette:base"), null);
  assert.equal(catalog.resolveVersion("suzette"), null, "canonical identity is not a new roster alias");
  assert.deepEqual(catalog.CHARACTER_ALIASES, { paolo: "fidio" });
  assert.deepEqual(catalog.PRIMARY_MOVES["hector:primary"], { moveId: "hector:primary", ...HISTORICAL_MOVE });
  assert.deepEqual(LEGACY_MOVE_IDENTITIES["hector:base"], ["hector:primary", "Anello Arcobaleno", "natura", 78, "charge"]);
  assert.equal(ROSTER.find(r => r.id === "hector").name, "Rika Urabe");
  assert.deepEqual(catalog.CATALOG_SOURCE.versions.slice(0, ROSTER.length).map(v => v.versionId), ROSTER.map(r => r.id + ":base"));
  const fresh = engine.createPlayer("hector", 6, () => 0.2);
  assert.equal(fresh.characterId, "suzette");
  assert.equal(fresh.name, "Suzette Hartland");
  assert.equal(fresh.baseId, "hector");
  assert.equal(fresh.versionId, "hector:base");
});

test("G2 genuine historical Suzette hydrates after live divergence with only hector:primary added", () => {
  assert.equal(catalog.resolveVersion("hector:base").characterId, "suzette");
  for (const baseId of ["hector", "hector:base"]) {
    const input = historicalSuzette({ baseId });
    assert.equal(Object.hasOwn(input.move, "moveId"), false);
    const before = structuredClone(input);
    const out = hydrate([input]).team[0];
    assert.deepEqual(out, withHistoricalMoveId(before));
    assert.deepEqual(input, before, "no input mutation");
    assert.equal(out.characterId, "hector", "saved identity remains historical");
    assert.equal(out.name, "Rika Urabe");
    assert.equal(catalog.canonicalCharacterId(out), "suzette", "live identity is resolved without rewriting history");
  }
});

test("G2 all pending PlayerInstance locations preserve saved names, payloads and encounter metadata", () => {
  const old = historicalSuzette();
  const pendingCases = [
    [{ type: "battle", enemies: [old], teamId: null, teamName: "Saved encounter" }, p => p.enemies[0]],
    [{ type: "recruit", player: old, price: 96 }, p => p.player],
    [{ type: "battle", enemies: [], context: { offer: old, savedContext: "kept" } }, p => p.context.offer],
  ];
  for (const [pending, pick] of pendingCases) {
    const run = hydrate([old], pending);
    const expected = structuredClone(pending);
    pick(expected).move.moveId = "hector:primary";
    assert.deepEqual(run.pending, expected);
    assert.deepEqual(pick(run.pending), withHistoricalMoveId(old));
  }
});

test("G2 absent characterId gains suzette from the live version while saved name/stats remain intact", () => {
  const input = historicalSuzette();
  delete input.characterId; delete input.versionId;
  assert.deepEqual(hydrate([input]).team[0], {
    ...withHistoricalMoveId(input), versionId: "hector:base", characterId: "suzette",
  });
});

test("G2 sticky null and opaque move IDs survive real storage hydration unchanged", () => {
  for (const moveId of [null, "opaque:historical-move", "hector:primary"]) {
    const input = historicalSuzette({ move: { ...HISTORICAL_MOVE, moveId } });
    assert.deepEqual(hydrate([input]).team[0], input);
  }
});

test("G2 unknown and cross-version identities never infer a move ID from an otherwise exact payload", () => {
  const [, name, element, power, effect] = LEGACY_MOVE_IDENTITIES["rococo:base"];
  const cases = [
    { characterId: "unknown-person" },
    { characterId: "rococo" },
    { versionId: "opaque:base", baseId: "opaque" },
    { versionId: "malcolm:base" },
    { baseId: "rococo" },
    { versionId: "rococo:base", baseId: "rococo", characterId: "hector", move: { name, element, power, effect } },
    { versionId: "rococo:base", baseId: "rococo", characterId: "suzette", move: { name, element, power, effect } },
  ];
  for (const extra of cases) {
    const input = historicalSuzette(extra);
    assert.deepEqual(hydrate([input]).team[0], { ...input, move: { ...input.move, moveId: null } });
  }
});

const fusedHistory = () => {
  const p = historicalSuzette({ uid: "old-fusion", baseId: "hector+mark", name: "Rika Evans", fused: true,
    parentVersionIds: ["hector:base", "mark:base"] });
  delete p.characterId; delete p.versionId;
  return p;
};
test("G2 fused snapshots retain literal parentVersionIds and block recruiting either parent", () => {
  const input = fusedHistory();
  const out = hydrate([input]).team[0];
  assert.deepEqual(out, { ...input, move: { ...input.move, moveId: null } });
  assert.deepEqual(out.parentVersionIds, ["hector:base", "mark:base"]);
  assert.deepEqual([...catalog.ownedCharacterIds([out])].sort(), ["mark", "suzette"]);
  const legacy = { ...out }; delete legacy.parentVersionIds;
  assert.deepEqual([...catalog.ownedCharacterIds([legacy])].sort(), ["mark", "suzette"]);
  for (const team of [[out], [legacy]]) {
    assert.equal(catalog.canRecruitPlayer(team, engine.createPlayer("hector")), false);
    assert.equal(catalog.canRecruitPlayer(team, engine.createPlayer("mark")), false);
    assert.equal(catalog.canRecruitPlayer(team, engine.createPlayer("rococo")), true);
  }
});

test("G2 old and fresh Suzette deduplicate canonically; historical duplicate teams hydrate without cleanup", () => {
  const old = historicalSuzette(), fresh = engine.createPlayer("hector:base", 6, () => 0.3);
  assert.equal(catalog.canRecruitPlayer([old], fresh), false);
  assert.equal(catalog.canRecruitPlayer([fresh], old), false);
  assert.equal(catalog.canRecruitPlayer([], old), true);
  assert.deepEqual([...catalog.ownedCharacterIds([old, fresh])], ["suzette"]);
  assert.throws(() => engine.newRun(["hector", "hector:base", "mark"]), /versioni della stessa persona/);
  const duplicate = historicalSuzette({ uid: "another-old", name: "Saved nickname", hp: 0, xp: 29 });
  const run = hydrate([old, duplicate, fresh]);
  assert.deepEqual(run.team, [withHistoricalMoveId(old), withHistoricalMoveId(duplicate), fresh]);
  assert.equal(run.activeUid, old.uid);
});

test("G2 Collection remains keyed by hector:base; neither canonical IDs nor Rococo receive entitlements", () => {
  for (const [from, other] of [["hector:base", "rococo:base"], ["rococo:base", "hector:base"]]) {
    const meta = collection.recruitVersion(blank(), from);
    assert.deepEqual(Object.keys(meta.collection), [from]);
    assert.deepEqual(collection.getCollectionProgress(meta, from), { discovered: true, recruited: true, starterUnlocked: true });
    for (const id of [other, "suzette", "suzette:base"]) assert.deepEqual(collection.getCollectionProgress(meta, id), none, id);
  }
  const legacy = collection.migrateCollection({ unlocked: ["hector"], collection: {} });
  assert.deepEqual(legacy.unlocked, ["hector"]);
  assert.deepEqual(legacy.collection, { "hector:base": { discovered: true, recruited: false, starterUnlocked: true } });
  assert.deepEqual(collection.migrateCollection(legacy), legacy);
  const groups = starterGroups(legacy);
  assert.deepEqual(groups.map(g => [g.characterId, g.name, g.versions.map(v => v.versionId)]),
    [["suzette", "Suzette Hartland", ["hector:base"]]]);
  assert.deepEqual(starterGroups(collection.discoverVersion(blank(), "hector:base")), []);
  assert.deepEqual(starterGroups({ collection: { suzette: { starterUnlocked: true } } }), []);
});

test("G2 loading an old Suzette run grants no Collection recruitment or starter unlock", () => {
  const meta = { unlocked: ["opaque-unlocked"], collection: { "hector:base": { ...none, discovered: true },
    "opaque:version": { ...none, extra: "keep" } }, records: [], runs: 0, bestWave: 0, sound: true };
  values.set(META_KEY, JSON.stringify(meta));
  const before = storage.loadMeta();
  hydrate([historicalSuzette()]);
  assert.deepEqual(storage.loadMeta(), before);
  assert.deepEqual(collection.getCollectionProgress(before, "hector:base"), { ...none, discovered: true });
  assert.deepEqual(collection.getCollectionProgress(before, "rococo:base"), none);
  assert.deepEqual(before.collection["opaque:version"], meta.collection["opaque:version"]);
  assert.deepEqual(before.unlocked, ["opaque-unlocked"]);
});

test("G2 Suzette and Hector Helio / rococo remain independent; Rococo's live name stays unchanged", () => {
  const rococo = engine.createPlayer("rococo");
  assert.equal(rococo.characterId, "rococo");
  assert.equal(rococo.versionId, "rococo:base");
  assert.equal(rococo.name, "Rococo Urupa");
  assert.equal(rococo.role, "P");
  assert.equal(catalog.resolveVersion("rococo").primaryTeamId, "little-gigant");
  assert.equal(catalog.canRecruitPlayer([historicalSuzette()], rococo), true);
  assert.equal(catalog.canRecruitPlayer([rococo], engine.createPlayer("hector")), true);
  assert.equal(catalog.resolveVersion("malcolm").characterId, "malcolm", "G3 remains blocked");
  assert.equal(catalog.resolveVersion("malcolm").displayName, "Jim Wraith");
});

test("G2 scenario exclusions accept legacy, version, canonical and old snapshots through production ownership", () => {
  const old = historicalSuzette(), hydrated = hydrate([old]).team[0];
  const variants = [["hector"], ["hector:base"], ["suzette"], [old], [hydrated],
    [...catalog.ownedCharacterIds([old])], [...catalog.ownedCharacterIds([fusedHistory()])]];
  for (const scenario of scenarios.SCENARIOS) {
    const pool = scenarios.scenarioPool(scenario.id, 50, 4);
    if (scenario.id === "urban") assert.ok(pool.some(r => r.version.versionId === "hector:base"));
    for (const excluded of variants) {
      const expected = pool.filter(r => r.version.versionId !== "hector:base"
        && !(excluded.includes("mark") && r.version.versionId === "mark:base"));
      const actual = scenarios.scenarioPool(scenario.id, 50, 4, excluded);
      const signatures = rows => rows.map(r => [r.version.versionId, r.weight]);
      assert.deepEqual(signatures(actual), signatures(expected), scenario.id);
    }
    assert.deepEqual(scenarios.scenarioPool(scenario.id, 50, 4), pool, "exclusions do not mutate pool order/weights");
  }
});

const audit = JSON.parse(await readFile(new URL("fixtures/catalog-identity-audit.json", import.meta.url), "utf8"));
test("G2 frozen identity audit accepts exactly the approved remediation and still checks portrait hashes", async () => {
  const before = structuredClone(audit);
  const hashes = new Map(await Promise.all(audit.entries.map(async row => [row.spritePath,
    createHash("sha256").update(await readFile(new URL("../../" + row.spritePath, import.meta.url))).digest("hex")])));
  const result = validateIdentityAudit(catalog.CATALOG_SOURCE, audit, { spriteHashes: hashes });
  assert.equal(result.technicalValid, true);
  assert.deepEqual(result.counts, { verified: 39, "legacy-weird-but-verified": 2, suspicious: 2, unresolved: 1 });
  const row = audit.entries.find(r => r.legacyId === "hector");
  assert.equal(row.characterId, "hector");
  assert.equal(row.displayName, "Rika Urabe");
  assert.deepEqual(audit, before, "frozen observations are not rewritten");
  hashes.set(row.spritePath, "0".repeat(64));
  assert.throws(() => validateIdentityAudit(catalog.CATALOG_SOURCE, audit, { spriteHashes: hashes }), /Verified sprite content drift: hector/);
});

test("G2 audit rejects a structurally valid rollback to the frozen hector identity", () => {
  const changed = structuredClone(catalog.CATALOG_SOURCE);
  Object.assign(changed.characters.find(c => c.characterId === "suzette"), {
    characterId: "hector", displayName: "Rika Urabe",
  });
  Object.assign(changed.versions.find(v => v.versionId === "hector:base"), {
    characterId: "hector", displayName: "Rika Urabe",
  });
  assert.equal(validateCatalog(changed), true);
  assert.throws(() => validateIdentityAudit(changed, audit), /Audit technical mapping mismatch: hector/);
});

test("G2 audit exception rejects unapproved identity, name, sprite, move and unrelated character drift", () => {
  for (const [id, field, value] of [
    ["hector:base", "characterId", "rococo"], ["hector:base", "characterId", "malcolm"],
    ["hector:base", "displayName", "Rika Urabe"], ["hector:base", "displayName", "Hector Helio"],
    ["hector:base", "spriteId", "rococo"], ["hector:base", "primaryMoveId", "rococo:primary"],
    ["rococo:base", "displayName", "Hector Helio"], ["malcolm:base", "displayName", "Malcolm Night"],
  ]) {
    const changed = structuredClone(catalog.CATALOG_SOURCE);
    changed.versions.find(v => v.versionId === id)[field] = value;
    assert.throws(() => validateIdentityAudit(changed, audit), /Invalid identity audit/, `${id}/${field}/${value}`);
  }
  for (const [field, value] of [["characterId", "rococo"], ["displayName", "Unapproved historical name"], ["identityStatus", "verified"]]) {
    const changed = structuredClone(audit);
    changed.entries.find(r => r.legacyId === "hector")[field] = value;
    assert.throws(() => validateIdentityAudit(catalog.CATALOG_SOURCE, changed), /Audit technical mapping mismatch: hector/);
  }
  const changed = structuredClone(audit);
  Object.assign(changed.entries.find(r => r.legacyId === "hector"), {
    characterId: "suzette", displayName: "Suzette Hartland",
  });
  assert.throws(() => validateIdentityAudit(catalog.CATALOG_SOURCE, changed), /Frozen hector audit evidence drift/);
});
