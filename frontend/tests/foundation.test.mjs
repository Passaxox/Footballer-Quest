import test from "node:test";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

// Load the production ES modules without adding a bundler or changing CRA's module format.
const source = (name) => readFile(new URL(`../src/game/${name}.js`, import.meta.url), "utf8");
const moduleUrl = (text) => `data:text/javascript;base64,${Buffer.from(text).toString("base64")}`;
const dataUrl = moduleUrl(await source("data"));
const rulesUrl = moduleUrl(await source("rules"));
const validationUrl = moduleUrl(await source("catalogValidation"));
const { validateCatalog, validateIdentityAudit } = await import(validationUrl);
const metadataUrl = moduleUrl(await source("catalogMetadata"));
const expansionUrl = moduleUrl(await source("catalogExpansion"));
const catalogUrl = moduleUrl((await source("catalog")).replace("\"./catalogExpansion\"", JSON.stringify(expansionUrl)).replace('"./data"', JSON.stringify(dataUrl)).replace('"./catalogValidation"', JSON.stringify(validationUrl)).replace('"./catalogMetadata"', JSON.stringify(metadataUrl)));
const collectionUrl = moduleUrl((await source("collection")).replace('"./catalog"', JSON.stringify(catalogUrl)));
const catalog = await import(catalogUrl);
const collection = await import(collectionUrl);
const scenariosUrl = moduleUrl((await source("scenarios")).replace('"./catalog"', JSON.stringify(catalogUrl)).replace('"./catalogMetadata"', JSON.stringify(metadataUrl)));
const scenarios = await import(scenariosUrl);
const engineUrl = moduleUrl((await source("engine")).replace('"./scenarios"', JSON.stringify(scenariosUrl)).replace('"./data"', JSON.stringify(dataUrl)).replace('"./rules"', JSON.stringify(rulesUrl)).replace('"./catalog"', JSON.stringify(catalogUrl)));
const engine = await import(engineUrl);
const data = await import(dataUrl);
const storage = await import(moduleUrl((await source("storage"))
  .replace('"./data"', JSON.stringify(dataUrl)).replace('"./engine"', JSON.stringify(engineUrl)).replace('"./catalog"', JSON.stringify(catalogUrl)).replace('"./collection"', JSON.stringify(collectionUrl))));
const { createPlayer, recalcStats, gainXp, xpForLevel, applyItemTo, applyEventDamage,
  fusePlayers, fuseRunPlayers, newRun, normalizeRun, resolveActiveUid, canReleasePlayer } = engine;
const starters = data.STARTER_IDS.slice(0, 3);
const player = () => createPlayer(starters[0], 3);
const ko = () => ({ ...player(), hp: 0 });

test("Royal/Zeus expansion keeps identities, legacy aliases and collection progress distinct", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../docs/royal-zeus-assets.json", import.meta.url), "utf8"));
  assert.equal(catalog.CATALOG_SOURCE.versions.length, 63);
  assert.equal(catalog.CATALOG_SOURCE.characters.length, 61);
  assert.equal(catalog.CATALOG_SOURCE.legacyMappings.length, 44);
  for (const row of manifest.entries) {
    const v = catalog.resolveVersion(row.versionId);
    assert.equal(v.characterId, row.characterId);
    assert.equal(v.spriteId, row.spriteId);
    assert.equal(v.legacyRosterId, null);
    assert.deepEqual(v.teamTags, [row.team]);
    assert.equal(v.arcId, "football-frontier");
    assert.equal(v.gameOrigin, "ie1");
    assert.equal(v.eraId, "original");
    const p = createPlayer(v.versionId, 7);
    assert.equal(p.baseId, v.versionId);
    assert.ok(p.move.power > 0 && p.hp > 0);
    const saved = { ...p, hp: 0, xp: 17 };
    assert.deepEqual(normalizeRun({ ...newRun(starters), team: [saved] }).team[0], saved);
  }
  for (const id of ["jude", "jonas"]) {
    assert.equal(catalog.resolveVersion(id).versionId, id + ":base");
    assert.equal(catalog.resolveVersion(id).spriteId, id);
  }
  assert.deepEqual(catalog.CATALOG_SOURCE.versions.filter(v => v.characterId === "byron").map(v => v.versionId), ["byron:base"]);
  const meta = collection.recruitVersion({ unlocked: [], collection: {} }, "jude:royal");
  assert.equal(collection.getCollectionProgress(meta, "jude:royal").starterUnlocked, true);
  assert.equal(collection.getCollectionProgress(meta, "jude:base").starterUnlocked, false);
  assert.deepEqual(meta.unlocked, []);
  const fusion = fusePlayers(createPlayer("jude:royal"), createPlayer("poseidon:zeus"), "a");
  assert.deepEqual(fusion.parentVersionIds, ["jude:royal", "poseidon:zeus"]);
});

test("Royal/Zeus pools respect tier gates and exclude every selected new version", () => {
  assert.deepEqual(scenarios.scenarioPool("royal-academy", 7, 2), []);
  assert.deepEqual(scenarios.scenarioPool("royal-academy", 8, 1), []);
  assert.deepEqual(scenarios.scenarioPool("zeus", 17, 3), []);
  assert.deepEqual(scenarios.scenarioPool("zeus", 18, 2), []);
  for (const [id, wave, tier, count] of [["royal-academy", 8, 2, 9], ["zeus", 18, 3, 10], ["zeus", 18, 4, 11]]) {
    const pool = scenarios.scenarioPool(id, wave, tier);
    assert.equal(pool.length, count);
    assert.ok(pool.every(r => !["jude:base", "jonas:base"].includes(r.version.versionId)));
    const excluded = [];
    for (let i = 0; i < count; i++) {
      const selected = scenarios.selectEncounterVersion(id, wave, tier, excluded, () => 0);
      assert.ok(selected && !excluded.includes(selected.versionId));
      excluded.push(selected.versionId);
    }
    assert.equal(scenarios.selectEncounterVersion(id, wave, tier, excluded), null);
  }
  assert.deepEqual(new Set(scenarios.scenarioPool("zeus", 18, 3).map(r => r.version.role)), new Set(["P", "D", "C", "A"]));
});

test("Royal/Zeus generated battles, recruitment and pending saves use authored versions", () => {
  const random = Math.random;
  try {
    for (const [id, wave] of [["royal-academy", 8], ["zeus", 18]]) {
      const run = { ...newRun(starters), wave, scenarioState: { id, revision: 1, segmentStart: wave, segmentEnd: wave + 5 } };
      // Team battle, three different enemies; later draws need no legacy IDs.
      const rolls = [0.1, 0.9, 0.9];
      Math.random = () => rolls.length ? rolls.shift() : 0.5;
      const node = engine.generateWave(run);
      assert.equal(node.kind, "team");
      assert.equal(node.enemies.length, 3);
      assert.equal(new Set(node.enemies.map(p => p.versionId)).size, 3);
      assert.ok(node.enemies.every(p => catalog.resolveVersion(p.versionId).teamTags.includes(id)));
      Math.random = () => 0.55;
      const recruit = engine.generateWave(run);
      assert.equal(recruit.type, "recruit");
      assert.ok(catalog.resolveVersion(recruit.player.versionId).teamTags.includes(id));
      const saved = normalizeRun({ ...run, pending: node });
      assert.deepEqual(engine.generateWave(saved), node);
    }
  } finally { Math.random = random; }
});

test("encounters and recruitment support versions without legacy IDs and preserve saved instances", () => {
  const originalRandom = Math.random;
  const ids = ["test-royal-1", "test-royal-2", "test-royal-3"];
  const template = catalog.resolveVersion("jude:base");
  const scenario = { ...scenarios.SCENARIOS[0], id: "test-royal", allowedTeamTags: [], allowedVersionIds: ids };
  try {
    for (const versionId of ids) catalog.CHARACTER_VERSIONS[versionId] = {
      ...template, versionId, legacyRosterId: null, encounterTier: 1,
    };
    scenarios.SCENARIOS.push(scenario);
    Math.random = () => 0.7;
    const run = { ...newRun(starters), scenarioState: { id: scenario.id, revision: 1, segmentStart: 1, segmentEnd: 6 } };
    const battle = engine.generateWave(run);
    assert.equal(battle.kind, "team");
    assert.equal(new Set(battle.enemies.map(p => p.versionId)).size, 2);
    for (const p of battle.enemies) {
      assert.ok(ids.includes(p.versionId));
      assert.equal(p.characterId, "jude");
      assert.equal(p.baseId, p.versionId);
    }
    Math.random = () => 0.55;
    const recruit = engine.generateWave({ ...run, wave: 2 });
    assert.equal(recruit.type, "recruit");
    assert.ok(ids.includes(recruit.player.versionId));
    const saved = { ...recruit.player, hp: 1, xp: 7 };
    assert.deepEqual(normalizeRun({ ...run, team: [saved] }).team[0], saved);
    assert.equal(engine.generateWave({ ...run, pending: battle }), battle);
    assert.equal(catalog.resolveVersion("jude").versionId, "jude:base");
  } finally {
    Math.random = originalRandom;
    scenarios.SCENARIOS.splice(scenarios.SCENARIOS.indexOf(scenario), 1);
    for (const id of ids) delete catalog.CHARACTER_VERSIONS[id];
  }
});
const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};

test("V2b complete catalog validates against actual sprite files and required legacy roster", async () => {
  const spriteIds = new Set((await readdir(new URL("../public/sprites/", import.meta.url))).filter(f => f.endsWith(".png")).map(f => f.slice(0, -4)));
  assert.equal(validateCatalog(catalog.CATALOG_SOURCE, { spriteIds, requiredLegacyIds: data.ROSTER.map(r => r.id) }), true);
  for (const row of data.ROSTER) {
    const v = catalog.resolveVersion(row.id);
    assert.equal(v.displayName, row.name);
    for (const key of ["rarityId", "variantId"]) assert.equal(v[key], null);
    assert.deepEqual(catalog.PRIMARY_MOVES[v.primaryMoveId], row.move);
    for (const level of [1, 3, 15]) {
      const p = createPlayer(v.versionId, level);
      for (const [base, runtime] of [["hp", "maxHp"], ["atk", "atk"], ["def", "def"], ["spd", "spd"]]) {
        assert.equal(p[runtime], Math.floor(row[base] * (1 + 0.07 * (level - 1))));
      }
      assert.equal(p.hp, p.maxHp);
      assert.equal(p.xp, 0);
    }
  }
});

test("V2b catalog rejects duplicate, ambiguous and broken references before indexing", () => {
  const cases = [
    [c => c.characters.push({ ...c.characters[0] }), /Duplicate characterId/],
    [c => c.versions.push({ ...c.versions[0] }), /Duplicate versionId/],
    [c => { c.versions[0].characterId = "missing"; }, /Unknown characterId/],
    [c => { c.versions[0].legacyRosterId = null; }, /Invalid legacy target/],
    [c => c.legacyMappings.shift(), /legacy mapping/],
    [c => { c.versions[0].primaryMoveId = "missing"; }, /Unknown primaryMoveId/],
    [c => { c.versions[0].primaryMoveId = null; }, /Unknown primaryMoveId/],
    [c => { c.versions[0].spriteId = "../private"; }, /Invalid spriteId/],
    [c => { c.versions[0].kind = "wizard"; }, /Invalid kind/],
    [c => { c.versions[0].gender = "guessed"; }, /Invalid gender/],
    [c => { c.versions[0].teamTags = "team"; }, /Invalid teamTags/],
    [c => { c.versions[0].teamTags = ["team", "team"]; }, /Invalid teamTags/],
    [c => { c.versions[0].rarityId = "unregistered"; }, /Invalid rarityId/],
    [c => { c.versions[1].legacyRosterId = c.versions[0].legacyRosterId; }, /legacy ID/],
    [c => c.legacyMappings.push({ ...c.legacyMappings[0], versionId: c.versions[1].versionId }), /Duplicate legacyId/],
    [c => { c.legacyMappings[0].versionId = "missing"; }, /legacy mapping/],
    [c => c.versions.push({ ...c.versions[0], versionId: c.legacyMappings[0].legacyId, legacyRosterId: null }), /Ambiguous legacy\/version ID/],
    [c => c.moves.push({ ...c.moves[0] }), /Duplicate moveId/],
  ];
  for (const [mutate, error] of cases) {
    const source = structuredClone(catalog.CATALOG_SOURCE);
    mutate(source);
    assert.throws(() => validateCatalog(source, { requiredLegacyIds: data.ROSTER.map(r => r.id) }), error);
  }
  assert.throws(() => validateCatalog(catalog.CATALOG_SOURCE, { spriteIds: new Set() }), /Invalid spriteId/);
});

test("V2b permits partial metadata, multiple affiliations and distinct incarnations without rarity effects", () => {
  const source = structuredClone(catalog.CATALOG_SOURCE);
  source.rarityIds = ["test-rarity"];
  source.teams.push({ teamId: "test-team-a" }, { teamId: "test-team-b" });
  for (const kind of ["player", "manager", "coach", "dev"]) source.versions.push({
    ...source.versions[0], versionId: `test:${kind}`, legacyRosterId: null, displayName: `Test ${kind}`, kind,
    primaryMoveId: kind === "player" ? source.versions[0].primaryMoveId : null,
    teamTags: ["test-team-a", "test-team-b"], rarityId: "test-rarity",
  });
  assert.equal(validateCatalog(source), true);
  assert.equal(source.versions.at(-1).characterId, source.characters[0].characterId);
  const original = catalog.CHARACTER_VERSIONS["mark:base"];
  const before = createPlayer("mark", 7);
  try {
    catalog.CHARACTER_VERSIONS["mark:base"] = { ...original, rarityId: "test-rarity" };
    const after = createPlayer("mark", 7);
    const { uid: oldUid, ...oldData } = before;
    const { uid: newUid, ...newData } = after;
    assert.deepEqual(newData, oldData);
  } finally { catalog.CHARACTER_VERSIONS["mark:base"] = original; }
});

test("V2b V2a run and meta round-trip keeps runtime moves, fusion parents, collection and history", () => {
  values.clear();
  const run = newRun(starters);
  run.team[0].hp = 9; run.team[0].xp = 17;
  run.team[0].move = { ...run.team[0].move, name: "Saved technique snapshot" };
  run.team[1] = fusePlayers(run.team[1], run.team[2], "b");
  let meta = collection.recruitVersion(storage.loadMeta(), "darren");
  meta = storage.recordFinishedRun(meta, run, "lose");
  storage.saveMeta(meta); storage.saveRun(run);
  const loadedRun = storage.loadRun(), loadedMeta = storage.loadMeta();
  storage.saveRun(loadedRun); storage.saveMeta(loadedMeta);
  assert.deepEqual(storage.loadRun(), run);
  assert.deepEqual(storage.loadMeta(), meta);
  assert.equal(storage.loadRun().saveVersion, 2);
  assert.equal(storage.loadMeta().metaSchemaVersion, 1);
});

test("V2a maps legacy IDs to versions without changing playable data", () => {
  for (const row of data.ROSTER) {
    const version = catalog.resolveVersion(row.id);
    assert.equal(catalog.resolveVersion(version.versionId), version);
    assert.equal(catalog.CHARACTERS[version.characterId].displayName, row.name);
    assert.equal(version.encounterTier, row.tier);
    assert.equal(version.rarityId, null);
    assert.ok(version.gender === null || ["male", "female", "unknown"].includes(version.gender));
    assert.ok(Array.isArray(version.teamTags));
    assert.deepEqual(version.baseStats, { hp: row.hp, atk: row.atk, def: row.def, spd: row.spd });
    assert.deepEqual(catalog.PRIMARY_MOVES[version.primaryMoveId], row.move);
    const p = createPlayer(version.versionId, 3);
    assert.equal(p.baseId, row.id);
    assert.equal(p.versionId, version.versionId);
    assert.equal(p.characterId, version.characterId);
    assert.deepEqual(p.move, row.move);
  }
  assert.equal(catalog.resolveVersion("missing"), null);
  assert.equal(catalog.resolveVersion("toString"), null);
});

test("V2a identity and progress stay per version even when two versions share a character", () => {
  const base = catalog.resolveVersion("mark");
  const versionId = "mark:test-only";
  catalog.CHARACTER_VERSIONS[versionId] = { ...base, versionId };
  try {
    const instance = createPlayer(versionId, 3);
    assert.equal(instance.versionId, versionId);
    assert.equal(instance.characterId, base.characterId);
    assert.deepEqual(instance.base, base.baseStats);
    const meta = collection.migrateCollection({ unlocked: ["mark"] });
    assert.equal(collection.getCollectionProgress(meta, versionId).starterUnlocked, false);
    const recruited = collection.recruitVersion(meta, versionId);
    assert.equal(collection.getCollectionState(recruited, versionId), "RECRUITED");
    assert.equal(collection.getCollectionState(recruited, base.versionId), "DISCOVERED");
    assert.deepEqual(recruited.unlocked, ["mark"]);
  } finally { delete catalog.CHARACTER_VERSIONS[versionId]; }
});

test("V2a legacy v2 active run migration preserves every runtime field and fused player", () => {
  const run = newRun(starters);
  const fused = fusePlayers(run.team[0], run.team[1], "a");
  delete fused.parentVersionIds;
  run.team = [run.team[0], fused, { ...run.team[2], baseId: "missing" }];
  for (const p of run.team) { delete p.characterId; delete p.versionId; p.hp = 7; p.xp = 13; }
  run.activeUid = run.team[0].uid;
  run.pending = { type: "battle", enemies: [player()] };
  localStorage.setItem("inazuma_rogue_run", JSON.stringify(run));
  const migrated = storage.loadRun();
  assert.equal(migrated.saveVersion, 2);
  assert.equal(migrated.activeUid, run.activeUid);
  assert.deepEqual(migrated.pending, run.pending);
  assert.equal(migrated.team[0].versionId, catalog.resolveVersion(run.team[0].baseId).versionId);
  for (let i = 0; i < run.team.length; i++) {
    for (const key of Object.keys(run.team[i])) assert.deepEqual(migrated.team[i][key], run.team[i][key]);
  }
  assert.deepEqual(migrated.team[1], fused);
  assert.deepEqual(migrated.team[2], run.team[2]);
  storage.saveRun(migrated);
  assert.deepEqual(storage.loadRun(), migrated);
});

test("V2a meta migration preserves starter eligibility and unknown data without inventing recruits", () => {
  const legacy = { unlocked: [...data.STARTER_IDS, "darren", "missing"], records: [], future: { currencyId: "future-token" } };
  const migrated = collection.migrateCollection(legacy);
  assert.deepEqual(collection.migrateCollection(migrated), migrated);
  assert.deepEqual(migrated.unlocked, legacy.unlocked);
  assert.deepEqual(migrated.future, legacy.future);
  for (const id of legacy.unlocked.filter(id => id !== "missing")) {
    const progress = collection.getCollectionProgress(migrated, id);
    assert.equal(progress.starterUnlocked, true);
    assert.equal(progress.recruited, false);
  }
  assert.equal(collection.getCollectionState(migrated, "missing"), "UNKNOWN");
  storage.saveMeta(migrated);
  assert.equal(collection.getCollectionProgress(storage.loadMeta(), "darren").starterUnlocked, true);
});

test("V2a discovery, recruitment and starter unlock are distinct idempotent operations", () => {
  const meta = collection.migrateCollection({ unlocked: [] });
  assert.equal(collection.getCollectionState(meta, "darren"), "UNKNOWN");
  const discovered = collection.discoverVersion(meta, "darren");
  assert.equal(collection.getCollectionState(discovered, "darren"), "DISCOVERED");
  assert.equal(collection.getCollectionProgress(discovered, "darren").starterUnlocked, false);
  assert.equal(collection.discoverVersion(discovered, "darren"), discovered);
  const recruited = collection.recruitVersion(discovered, "darren");
  assert.equal(collection.getCollectionState(recruited, "darren"), "RECRUITED");
  assert.equal(collection.getCollectionProgress(recruited, "darren").starterUnlocked, true);
  assert.deepEqual(recruited.unlocked, ["darren"]);
  assert.equal(collection.recruitVersion(recruited, "darren:base"), recruited);
  const unlockedOnly = collection.unlockStarter(meta, "darren");
  assert.deepEqual(collection.getCollectionProgress(unlockedOnly, "darren"), { discovered: false, recruited: false, starterUnlocked: true });
  assert.deepEqual(collection.migrateCollection(unlockedOnly), unlockedOnly);
  assert.equal(collection.recruitVersion(meta, "missing"), meta);
});

test("V2a history stores identity and legacy fields while keeping old and unknown snapshots", () => {
  const oldRecord = { teamSnapshot: [{ baseId: "missing", name: "Old name", level: 7, fused: false }] };
  const meta = { ...storage.loadMeta(), records: [oldRecord], runs: 1, bestWave: 7 };
  const run = newRun(starters);
  const fused = fusePlayers(run.team[0], run.team[1], "a");
  assert.deepEqual(fused.parentVersionIds, run.team.slice(0, 2).map(p => p.versionId));
  run.team[1] = fused;
  const next = storage.recordFinishedRun(meta, run, "lose");
  assert.deepEqual(next.records[0], oldRecord);
  const snapshot = next.records[1].teamSnapshot;
  assert.equal(snapshot[0].versionId, run.team[0].versionId);
  assert.equal(snapshot[0].characterId, run.team[0].characterId);
  assert.equal(snapshot[1].versionId, null);
  assert.equal(snapshot[1].baseId, fused.baseId);
  assert.equal(snapshot[1].fused, true);
});

test("KO survives every stat recalculation and multiple level-ups", () => {
  const p = ko();
  for (const stat of ["hp", "atk", "def", "spd"]) {
    const q = recalcStats({ ...p, bonus: { ...p.bonus, [stat]: 20 } });
    assert.equal(q.hp, 0);
    assert.ok(q.maxHp > 0);
  }
  const result = gainXp(p, 1000);
  assert.ok(result.ups > 1);
  assert.equal(result.player.hp, 0);
  assert.equal(p.level, 3);
});

test("living players retain proportional HP and existing level-up healing", () => {
  const p = { ...player(), hp: 30 };
  const next = recalcStats({ ...p, level: 4 });
  assert.equal(next.hp, Math.max(1, Math.round(next.maxHp * p.hp / p.maxHp)));
  const result = gainXp(p, xpForLevel(p.level)).player;
  assert.equal(result.hp, Math.min(next.maxHp, next.hp + next.maxHp - p.maxHp));
});

test("stat items preserve KO; explicit healing and revival keep their behavior", () => {
  const p = ko();
  for (const item of ["fascia", "guanti", "scarpini", "proteine"]) assert.equal(applyItemTo(item, p).hp, 0);
  assert.equal(applyItemTo("pallone", p).hp, Math.round(p.maxHp * 0.5));
  assert.equal(applyItemTo("bibita", p).hp, p.maxHp);
  assert.equal(applyItemTo("barretta", p).hp, Math.round(p.maxHp * 0.5));
});

test("event damage preserves KO and the existing 1 HP floor for living players", () => {
  assert.equal(applyEventDamage(ko(), 50).hp, 0);
  assert.equal(applyEventDamage({ ...player(), hp: 1 }, 80).hp, 1);
  const p = player();
  assert.equal(applyEventDamage(p, 20).hp, p.hp - Math.round(p.maxHp * 0.2));
});

test("fusion rejects either fused parent, self-fusion, missing parent or invalid move", () => {
  const a = player(), b = player();
  const fused = fusePlayers(a, b, "a");
  assert.throws(() => fusePlayers(fused, b, "a"));
  assert.throws(() => fusePlayers(a, fused, "b"));
  assert.throws(() => fusePlayers(a, a, "a"));
  assert.throws(() => fusePlayers(a, null, "a"));
  assert.throws(() => fusePlayers(a, b, "invalid"));
});

test("fusion preserves level, XP reset, full healing, role A and selected move rules", () => {
  const a = { ...ko(), xp: 17, bonus: { hp: 5, atk: 4, def: 3, spd: 2 } };
  const b = createPlayer(starters[1], 8);
  const before = JSON.stringify([a, b]);
  const f = fusePlayers(a, b, "b");
  assert.equal(f.level, 8);
  assert.equal(f.xp, 0);
  assert.equal(f.hp, f.maxHp);
  assert.equal(f.role, a.role);
  assert.equal(f.element, b.element);
  assert.deepEqual(f.move, b.move);
  for (const stat of ["hp", "atk", "def", "spd"]) {
    assert.equal(f.base[stat], Math.round((a.base[stat] + b.base[stat]) / 2 * 1.15));
    assert.equal(f.bonus[stat], a.bonus[stat] + b.bonus[stat]);
  }
  assert.equal(JSON.stringify([a, b]), before);
});

test("release cannot remove the last living player", () => {
  const a = player(), b = ko();
  assert.equal(canReleasePlayer([a, b], a.uid), false);
  assert.equal(canReleasePlayer([a, b], b.uid), true);
  assert.equal(canReleasePlayer([a], a.uid), false);
  assert.equal(canReleasePlayer([a, player()], a.uid), true);
});

test("active UID survives reordering and falls back after KO, removal or replacement", () => {
  const r = newRun(starters);
  const [a, b, c] = r.team;
  assert.equal(r.activeUid, a.uid);
  assert.equal(resolveActiveUid([c, a, b], b.uid), b.uid);
  assert.equal(resolveActiveUid([a, { ...b, hp: 0 }, c], b.uid), a.uid);
  assert.equal(resolveActiveUid([a, c], b.uid), a.uid);
  assert.equal(resolveActiveUid([ko()], b.uid), null);
  assert.equal(resolveActiveUid([], b.uid), null);
});

test("run fusion transfers active UID from either parent without moving the captain", () => {
  for (const activeIndex of [0, 1, 2]) {
    const r = newRun(starters);
    r.items.cuneo = 2;
    r.activeUid = r.team[activeIndex].uid;
    const captain = r.team[0].uid;
    const f = fuseRunPlayers(r, 1, 2, "b");
    assert.equal(f.team[0].uid, captain);
    assert.equal(f.activeUid, activeIndex === 0 ? captain : f.team[1].uid);
    assert.equal(f.items.cuneo, 1);
    assert.equal(f.stats.fusions, 1);
    assert.equal(r.team.length, 3);
    assert.throws(() => fuseRunPlayers(f, 0, 1, "a"));
  }
  assert.throws(() => fuseRunPlayers(newRun(starters), 0, 1, "a"));
});

test("legacy saves load without activeUid, version or new pending fields", () => {
  const legacy = newRun(starters);
  delete legacy.activeUid;
  delete legacy.saveVersion;
  legacy.team[0].hp = 0;
  legacy.pending = { type: "recruit", player: player(), price: 64 };
  localStorage.setItem("inazuma_rogue_run", JSON.stringify(legacy));
  const loaded = storage.loadRun();
  assert.equal(loaded.activeUid, legacy.team[1].uid);
  assert.equal(loaded.saveVersion, 2);
  assert.deepEqual(loaded.pending, legacy.pending);
  assert.deepEqual(loaded.team, legacy.team);
  assert.equal(normalizeRun(null), null);
});

test("reward, recruit offer, shop purchases and event outcome survive save/load", () => {
  for (const pending of [
    { type: "reward", context: { rewards: ["barretta", "cuneo"], bonus: "pallone", money: 23 } },
    { type: "recruit", context: { mode: "offer", offer: player(), after: "rewards", rewards: ["barretta"] } },
    { type: "shop", stock: [{ id: "barretta", price: 20 }], bought: [0] },
    { type: "event", eventId: "saved-event", result: { text: "Esito", effects: [{ type: "money", amt: 30 }] } },
  ]) {
    const r = { ...newRun(starters), pending };
    storage.saveRun(r);
    assert.deepEqual(storage.loadRun(), r);
  }
  storage.clearRun();
  assert.equal(storage.loadRun(), null);
  localStorage.setItem("inazuma_rogue_run", "{broken");
  assert.equal(storage.loadRun(), null);
});

test("Normal combat EXP is 1.5x, bench 70%, with full-then-share rounding", () => {
  const team = [player(), player(), ko()];
  const result = engine.grantCombatXp(team, team[0].uid, 2);
  assert.deepEqual(result.report.rows.map((r) => r.total), [45, 32, 0]);
  assert.equal(result.report.rows[1].benchXp, 32);
  assert.equal(result.report.rows[1].benchPercent, 70);
  assert.equal(result.report.rows[2].koCombat, true);
  assert.equal(result.team[2].hp, 0);
  assert.equal(team[0].xp, 0);
});

test("boss multiplier stays 1.6 and reports multiple level-ups accurately", () => {
  const team = [player(), player()];
  const result = engine.grantCombatXp(team, team[0].uid, 11, true);
  assert.deepEqual(result.report.rows.map((r) => r.total), [202, 141]);
  const row = result.report.rows[0];
  assert.deepEqual(row.before, engine.xpProgress(team[0]));
  assert.equal(row.after.level, 5);
  assert.equal(row.after.xp, 78);
  assert.equal(row.after.required, 80);
  assert.equal(row.activeXp, 202);
});

test("combat reports accumulate by UID across active switches without double awards", () => {
  const team = [player(), player()];
  const first = engine.grantCombatXp(team, team[0].uid, 2);
  const second = engine.grantCombatXp(first.team, team[1].uid, 2);
  const report = engine.mergeXpReports(first.report, second.report);
  for (let i = 0; i < 2; i++) {
    assert.equal(report.rows[i].total, 77);
    assert.equal(report.rows[i].activeXp, 45);
    assert.equal(report.rows[i].benchXp, 32);
    assert.deepEqual(report.rows[i].before, engine.xpProgress(team[i]));
    assert.deepEqual(report.rows[i].after, engine.xpProgress(second.team[i]));
  }
});

test("defeat before any enemy KO still reports zero combat EXP for each KO", () => {
  const team = [ko(), ko()];
  const report = engine.finishCombatReport(team, null);
  assert.equal(report.rows.length, 2);
  assert.ok(report.rows.every((row) => row.total === 0 && row.koCombat));
  const alive = [player(), player()];
  const earned = engine.grantCombatXp(alive, alive[0].uid, 2);
  const final = engine.finishCombatReport(earned.team.map((p) => ({ ...p, hp: 0 })), earned.report);
  assert.deepEqual(final.rows.map((row) => row.total), [45, 32]);
  assert.ok(final.rows.every((row) => row.koCombat));
});

test("travel grants 12 only to living members, once per completed wave including reload", () => {
  const run = newRun(starters);
  run.team[1].hp = 0;
  run.pending = { type: "shop", stock: [], bought: [] };
  const done = engine.completeNonCombatNode(run);
  assert.deepEqual(done.lastProgression.report.rows.map((r) => r.travelXp), [12, 0, 12]);
  assert.equal(done.team[1].hp, 0);
  assert.equal(run.team[0].xp, 0);
  storage.saveRun(done);
  assert.deepEqual(engine.completeNonCombatNode(storage.loadRun()), done);
  const advanced = { ...done, wave: 2, pending: null };
  assert.deepEqual(engine.completeNonCombatNode(advanced), advanced);
});

test("nodes with their own EXP never also grant travel EXP", () => {
  for (const type of ["event", "training", "recruit"]) {
    const run = newRun(starters);
    const before = run.team;
    run.team = run.team.map((p) => gainXp(p, 30).player);
    run.pending = { type, progression: { hadOwnXp: true, report: engine.reportXpChanges(before, run.team, "node") } };
    const done = engine.completeNonCombatNode(run);
    assert.deepEqual(done.team, run.team);
    assert.deepEqual(done.lastProgression.report.rows.map((r) => r.otherXp), [30, 30, 30]);
    assert.equal(done.lastProgression.report.rows[0].travelXp, 0);
  }
});

test("legacy persisted event EXP is recognized without a new progression marker", () => {
  const run = newRun(starters);
  run.pending = { type: "event", result: { effects: [{ type: "xp", amt: 25 }] } };
  assert.deepEqual(engine.completeNonCombatNode(run).team, run.team);
});

test("combat, rewards, post-battle recruitment and unresolved hub never grant travel", () => {
  for (const pending of [null, { type: "battle" }, { type: "reward" },
    { type: "recruit", context: { after: "rewards" } },
    { type: "event", progression: { hadCombat: true } }]) {
    const run = { ...newRun(starters), pending };
    assert.equal(engine.completeNonCombatNode(run), run);
  }
});

test("checkpoint 10 uses level 11 independently of boss roster; later checkpoint unchanged", () => {
  for (const [wave, expected] of [[10, 11], [20, 23]]) {
    const encounter = engine.generateWave({ ...newRun(starters), team: [createPlayer(starters[0], 50)], wave });
    assert.deepEqual(encounter.enemies.map((p) => p.baseId), data.BOSSES[wave].ids);
    assert.ok(encounter.enemies.every((p) => p.level === expected));
  }
});

test("effective elemental multiplier is shared with damage, including Talisman", () => {
  const attacker = player();
  attacker.move.element = "aria";
  for (const [element, expected] of [["terra", 1.5], ["natura", 0.67], ["aria", 1]]) {
    const defender = { ...player(), element };
    assert.equal(engine.effectiveTypeMultiplier(attacker, defender), expected);
    assert.equal(engine.calcDamage(attacker, defender, attacker.move).mult, expected);
    const boosted = { ...attacker, status: { ...attacker.status, talisman: true } };
    assert.equal(engine.effectiveTypeMultiplier(boosted, defender), 1.5);
    assert.equal(engine.calcDamage(boosted, defender, boosted.move).mult, 1.5);
    assert.equal(boosted.status.talisman, true);
  }
});

test("saveVersion 2 gains optional Normal profile without changing saved pending enemies", () => {
  const run = newRun(starters);
  delete run.rulesetId;
  run.pending = { type: "battle", kind: "boss", enemies: [createPlayer(starters[0], 13)] };
  localStorage.setItem("inazuma_rogue_run", JSON.stringify(run));
  const loaded = storage.loadRun();
  assert.equal(loaded.saveVersion, 2);
  assert.equal(loaded.rulesetId, "normal-v1");
  assert.deepEqual(loaded.pending, run.pending);
  assert.deepEqual(loaded.team, run.team);
});

test("Easy profile awards 1.75x combat, 75% bench, 16 travel and 1.6 boss EXP", () => {
  const run = newRun(starters, "easy");
  const earned = engine.grantCombatXp(run.team, run.activeUid, 2, false, run.rulesetId);
  assert.deepEqual(earned.report.rows.map((r) => r.total), [53, 40, 40]);
  const boss = engine.grantCombatXp(run.team, run.activeUid, 2, true, run.rulesetId);
  assert.deepEqual(boss.report.rows.map((r) => r.total), [84, 63, 63]);
  run.pending = { type: "shop" };
  assert.deepEqual(engine.completeNonCombatNode(run).team.map((p) => p.xp), [16, 16, 16]);
});

test("ordinary enemy offsets preserve Normal and lower Easy by one with level floor", () => {
  const random = Math.random;
  try {
    for (const value of [0, 0.25, 0.5, 0.999]) {
      Math.random = () => value;
      for (let wave = 1; wave <= 9; wave++) {
        const raw = wave - 1 + Math.floor(value * 4);
        assert.equal(engine.enemyLevel(wave, "normal-v1"), Math.max(1, raw));
        assert.equal(engine.enemyLevel(wave, "easy-v1"), Math.max(1, raw - 1));
      }
    }
  } finally { Math.random = random; }
});

test("checkpoint levels belong to the profile, not the boss team", () => {
  for (const [difficulty, level] of [["normal", 11], ["easy", 10]]) {
    const encounter = engine.generateWave({ ...newRun(starters, difficulty), team: [createPlayer(starters[0], 50)], wave: 10 });
    assert.ok(encounter.enemies.every((p) => p.level === level));
    assert.deepEqual(encounter.enemies.map((p) => p.baseId), data.BOSSES[10].ids);
  }
});

test("difficulty and version survive reload; creating another run does not alter them", () => {
  const run = newRun(starters, "easy");
  assert.equal(run.difficultyId, "easy");
  assert.equal(run.rulesetId, "easy-v2");
  assert.equal(run.rulesetVersion, 2);
  storage.saveRun(run);
  newRun(starters, "normal");
  assert.deepEqual(storage.loadRun(), run);
  const legacy = { ...run };
  delete legacy.difficultyId; delete legacy.rulesetId; delete legacy.rulesetVersion;
  localStorage.setItem("inazuma_rogue_run", JSON.stringify(legacy));
  assert.equal(storage.loadRun().difficultyId, "normal");
  assert.equal(storage.loadRun().rulesetVersion, 1);
});

test("local playtest summary includes all final players including KO", () => {
  const run = newRun(starters, "easy");
  run.team = [createPlayer(starters[0], 5), { ...createPlayer(starters[1], 7), hp: 0 }];
  run.wave = 10; run.stats.wins = 5; run.stats.recruits = 3; run.stats.fusions = 1;
  run.pending = { kind: "boss", teamName: "Test boss" };
  run.stats.lastBossDefeated = "Previous boss";
  assert.deepEqual(engine.playtestSummary(run), { difficulty: "FACILE", wave: 10, wins: 5, recruits: 3, fusions: 1,
    averageLevel: 6, maxLevel: 7, bossReached: "Test boss", bossDefeated: "Previous boss" });
});

test("completed history extends old records and survives new run/reload with unlocks", () => {
  values.clear();
  const old = { unlocked: [...starters, "darren"], records: [{ wave: 8, glory: 42, team: ["Mark"] }], runs: 1, bestWave: 8 };
  localStorage.setItem("inazuma_rogue_meta", JSON.stringify(old));
  const run = newRun(starters, "easy");
  run.wave = 20; run.stats = { wins: 12, recruits: 3, fusions: 1, lastBossDefeated: "Royal Academy" };
  run.team[0] = { ...run.team[0], fused: true, hp: 0 };
  const meta = storage.recordFinishedRun(storage.loadMeta(), run, "lose");
  storage.saveMeta(meta);
  storage.clearRun(); storage.saveRun(newRun(starters));
  assert.deepEqual(storage.loadMeta(), meta);
  assert.deepEqual(meta.records[0], old.records[0]);
  assert.equal(meta.records[1].difficulty, "FACILE");
  assert.equal(meta.records[1].bossDefeated, "Royal Academy");
  assert.equal(meta.records[1].teamSnapshot[0].fused, true);
  assert.equal(meta.records[1].teamSnapshot[0].baseId, starters[0]);
  assert.equal(meta.records[1].averageLevel, 3);
  assert.equal(meta.records[1].maxLevel, 3);
  assert.equal(meta.records[1].wins, 12);
  assert.equal(meta.records[1].recruits, 3);
  assert.equal(meta.records[1].fusions, 1);
  assert.equal(meta.records[1].glory, engine.glory(run));
  assert.ok(meta.unlocked.includes("darren"));
  assert.ok(!meta.unlocked.includes("byron"));
  assert.deepEqual(storage.recordFinishedRun(meta, run, "lose"), meta);
});

test("every heal/drain uses actual damage and the shared cap, including Darren", () => {
  const random = Math.random; Math.random = () => 0.5;
  try {
    for (const id of ["darren", "silvia", "hurley", "byron", "fidio"]) {
      const attacker = { ...createPlayer(id, 9), hp: 1 };
      const target = createPlayer("mark", 9);
      const result = engine.performAttack(attacker, target);
      const healed = result.att.hp - attacker.hp;
      const damage = target.hp - result.def.hp;
      assert.equal(healed, Math.min(attacker.maxHp - 1, Math.floor(attacker.maxHp * 0.1), Math.floor(damage * 0.5)));
      assert.ok(result.msgs.some(m => m.includes(`${attacker.move.name} recupera ${healed} HP`)));
      const generic = { ...attacker, baseId: "future-player", name: "Generic", move: { ...attacker.move, name: "Generic heal" } };
      assert.equal(engine.performAttack(generic, target).att.hp, result.att.hp);
      assert.equal(engine.performAttack(attacker, { ...target, hp: 1 }).att.hp, 1);
    }
    assert.equal(engine.sustainHealing({ hp: 95, maxHp: 100 }, 100), 5);
    assert.equal(engine.sustainHealing({ hp: 1, maxHp: 100 }, 1000), 10);
    assert.equal(engine.sustainHealing({ hp: 0, maxHp: 100 }, 100), 0);
  } finally { Math.random = random; }
});

test("Easy v2 segments plateau at boundaries; Normal and old Easy profiles stay unchanged", () => {
  const random = Math.random;
  try {
    for (const wave of [1, 10, 11, 15, 16, 17, 18, 19, 20, 21, 25, 26, 29, 30, 31]) {
      for (const [roll, jitter] of [[0, -1], [0.999, 2]]) {
        Math.random = () => roll;
        const offset = wave >= 26 ? -4 : wave >= 21 ? -3 : wave >= 19 ? -2 : -1;
        assert.equal(engine.enemyLevel(wave, "easy-v2"), Math.max(1, wave + jitter + offset));
        assert.equal(engine.enemyLevel(wave, "normal-v1"), Math.max(1, wave + jitter));
        assert.equal(engine.enemyLevel(wave, "easy-v1"), Math.max(1, wave + jitter - 1));
      }
    }
    for (const [wave, level] of [[10, 10], [20, 20], [30, 29]]) {
      assert.ok(engine.generateWave({ ...newRun(starters, "easy"), team: [createPlayer(starters[0], 50)], wave }).enemies.every(p => p.level === level));
      assert.ok(engine.generateWave({ ...newRun(starters), team: [createPlayer(starters[0], 50)], wave }).enemies.every(p => p.level === (wave === 10 ? 11 : wave + 3)));
    }
    const old = { ...newRun(starters, "easy"), rulesetId: "easy-v1", rulesetVersion: 1 };
    storage.saveRun(old);
    assert.deepEqual(storage.loadRun(), old);
  } finally { Math.random = random; }
});


test("V2c metadata registries reject broken references and inconsistent eras", () => {
  for (const [field, key] of [["teams", "teamId"], ["arcs", "arcId"], ["eras", "eraId"], ["gameOrigins", "gameOrigin"]]) {
    const c = structuredClone(catalog.CATALOG_SOURCE);
    c[field].push({ ...c[field][0] });
    assert.throws(() => validateCatalog(c), new RegExp("Duplicate " + key));
  }
  for (const key of ["arcId", "eraId", "gameOrigin", "teamTags"]) {
    const c = structuredClone(catalog.CATALOG_SOURCE);
    c.versions[0][key] = key === "teamTags" ? ["missing"] : "missing";
    assert.throws(() => validateCatalog(c), /Unknown/);
  }
  const c = structuredClone(catalog.CATALOG_SOURCE);
  c.versions[0].arcId = "ffi"; c.versions[0].gameOrigin = "galaxy";
  assert.throws(() => validateCatalog(c), /Incompatible metadata eras/);
  c.versions[0].arcId = null; c.versions[0].gameOrigin = null;
  assert.equal(validateCatalog(c), true);
  c.arcs[0].eraId = "missing";
  assert.throws(() => validateCatalog(c), /Unknown registry eraId/);
});

test("V2c passive metadata preserves validated V2b gameplay fixture and runtime serialization", async () => {
  const baseline = JSON.parse(await readFile(new URL("./fixtures/v2b-gameplay.json", import.meta.url), "utf8"));
  // Only authorized GAME_DATA_FIX: new Joseph instances are goalkeepers. V2b fixture stays historical.
  const expectedRoster = baseline.roster.map(r => r.id === "joseph" ? { ...r, role: "P" } : r);
  assert.deepEqual(data.ROSTER, expectedRoster);
  assert.deepEqual(data.STARTER_IDS, baseline.starters);
  for (const row of baseline.roster) {
    const v = catalog.resolveVersion(row.id);
    assert.equal(v.versionId, row.id + ":base");
    assert.equal(v.characterId, row.id);
    assert.deepEqual(catalog.PRIMARY_MOVES[v.primaryMoveId], row.move);
    const p = createPlayer(row.id, 3);
    for (const key of ["gender", "teamTags", "arcId", "eraId", "gameOrigin"]) assert.equal(Object.hasOwn(p, key), false);
  }
  assert.deepEqual(catalog.resolveVersion("xavier").teamTags, ["genesis", "alius-academy"]);
  assert.deepEqual(catalog.resolveVersion("jordan").teamTags, []);
  assert.deepEqual(catalog.resolveVersion("fidio").teamTags, []);
});


test("V2d verified batch resolves unique names and changes only supplied metadata", async () => {
  const entries = [
    ["Mark Evans", "mark"], ["Axel Blaze", "axel"], ["Jude Sharp", "jude"],
    ["Nathan Swift", "nathan"], ["Shawn Froste", "shawn"], ["Jack Wallside", "jack"],
    ["Kevin Dragonfly", "kevin"], ["Tod Ironside", "tod"], ["Tim Saunders", "tim"],
    ["Willy Glass", "willy"], ["Jim Wraith", "malcolm"],
  ];
  for (const [name, id] of entries) {
    assert.deepEqual(data.ROSTER.filter(r => r.name === name).map(r => r.id), [id]);
    const v = catalog.resolveVersion(id);
    assert.equal(v.versionId, id + ":base");
    assert.equal(v.gender, "male");
    assert.equal(v.eraId, "original");
    assert.deepEqual(v.teamTags, id === "shawn" ? [] : ["raimon"]);
    for (const key of ["arcId", "gameOrigin", "rarityId", "variantId"]) assert.equal(v[key], null);
  }
  const { VERSION_METADATA } = await import(metadataUrl);
  assert.deepEqual(VERSION_METADATA["byron:base"], { teamTags: ["zeus"], arcId: "football-frontier", eraId: "original", gameOrigin: "ie1" });
  assert.deepEqual(VERSION_METADATA["xavier:base"], { teamTags: ["genesis", "alius-academy"], arcId: "alius", eraId: "original", gameOrigin: "ie2" });
  assert.deepEqual(VERSION_METADATA["rococo:base"], { teamTags: ["little-gigant"], arcId: "ffi", eraId: "original", gameOrigin: "ie3" });
  const versions = Object.values(catalog.CHARACTER_VERSIONS).filter(v => v.legacyRosterId != null);
  assert.equal(versions.length, 44);
  for (const [key, count] of [["gender", 16], ["teamTags", 20], ["arcId", 10], ["eraId", 21], ["gameOrigin", 10], ["primaryMoveId", 44]]) {
    assert.equal(versions.filter(v => Array.isArray(v[key]) ? v[key].length > 0 : v[key] != null).length, count, key);
  }
  for (const v of versions.filter(v => !entries.some(([, id]) => v.legacyRosterId === id) && !["torch", "kruger", "dylan", "edgar", "teres"].includes(v.legacyRosterId))) assert.equal(v.gender, null);
});


test("V2e batch protects all localized legacy mappings and specific incarnation metadata", async () => {
  const fixture = JSON.parse(await readFile(new URL("./fixtures/catalog-batch3.json", import.meta.url), "utf8"));
  for (const a of fixture.aliases) {
    const v = catalog.resolveVersion(a.legacyId);
    assert.equal(v.versionId, a.versionId);
    assert.equal(v.displayName, a.displayName);
  }
  for (const [id, fields] of Object.entries(fixture.metadata)) {
    const v = catalog.resolveVersion(id);
    for (const [key, value] of Object.entries(fields)) assert.deepEqual(v[key], value, id + ":" + key);
  }
  for (const id of ["jordan", "dvalin", "paolo", "fidio", "david", "joseph", "jonas"]) {
    const v = catalog.resolveVersion(id);
    assert.deepEqual(v.teamTags, []);
    assert.equal(v.gameOrigin, null);
  }
  assert.deepEqual(catalog.resolveVersion("jude").teamTags, ["raimon"]);
  assert.equal(catalog.resolveVersion("jude").gameOrigin, null); // Never infer from character debut.
  const teams = new Set(catalog.CATALOG_SOURCE.teams.map(t => t.teamId));
  for (const id of ["royal-academy","alius-academy","gemini-storm","epsilon","epsilon-plus","diamond-dust","prominence","chaos","dark-emperors","absolute-royal-academy","inazuma-japan","big-waves","desert-lion","fire-dragon","knights-of-queen","unicorn","orpheus","the-empire","neo-japan"]) assert.ok(teams.has(id), id);
  for (const id of ["xavier", "torch", "gazelle"]) {
    const v = catalog.resolveVersion(id);
    assert.ok(v.teamTags.includes("alius-academy") && v.teamTags.length === 2);
    assert.equal(v.gameOrigin, "ie2");
  }
});


const identityAudit = JSON.parse(await readFile(new URL("./fixtures/catalog-identity-audit.json", import.meta.url), "utf8"));
const identityHashes = new Map(await Promise.all(identityAudit.entries.map(async row => [row.spritePath,
  createHash("sha256").update(await readFile(new URL("../../" + row.spritePath, import.meta.url))).digest("hex")])));

test("V2f complete 44-entry identity audit distinguishes technical validity from canon", () => {
  assert.equal(identityAudit.entries.length, 44);
  assert.equal(new Set(identityAudit.entries.map(r => r.legacyId)).size, 44);
  assert.equal(new Set(identityAudit.entries.map(r => r.versionId)).size, 44);
  const result = validateIdentityAudit(catalog.CATALOG_SOURCE, identityAudit, { spriteHashes: identityHashes });
  assert.equal(result.technicalValid, true);
  assert.deepEqual(result.counts, { verified: 39, "legacy-weird-but-verified": 2, suspicious: 2, unresolved: 1 });
  assert.deepEqual([...result.reviewRequiredLegacyIds].sort(), ["austin", "jonas", "joseph"]);
  for (const row of identityAudit.entries) assert.ok(catalog.PRIMARY_MOVES[row.primaryMoveId]);
});

test("V2f verified identity and portrait regressions require explicit re-audit", () => {
  for (const field of ["displayName", "spriteId", "primaryMoveId"]) {
    const c = structuredClone(catalog.CATALOG_SOURCE);
    c.versions[0][field] = field === "primaryMoveId" ? c.versions[1].primaryMoveId : "changed";
    assert.throws(() => validateIdentityAudit(c, identityAudit), /Verified identity drift/);
  }
  const hashes = new Map(identityHashes);
  hashes.set(identityAudit.entries[0].spritePath, "0".repeat(64));
  assert.throws(() => validateIdentityAudit(catalog.CATALOG_SOURCE, identityAudit, { spriteHashes: hashes }), /Verified sprite content drift/);
  const c = structuredClone(catalog.CATALOG_SOURCE);
  c.versions.find(v => v.legacyRosterId === "hector").displayName = "Hector Helio";
  assert.throws(() => validateIdentityAudit(c, identityAudit), /Verified identity drift/);
});

test("V2f audit rejects missing, duplicate and silently hidden uncertain records", () => {
  const mutations = [
    a => a.entries.pop(),
    a => a.entries.push({ ...a.entries[0] }),
    a => { a.entries[1].versionId = a.entries[0].versionId; },
    a => { a.entries[0].identityStatus = "probably"; },
    a => { a.entries[0].canonicalCharacter = null; },
    a => { a.entries[0].sources = []; },
    a => { a.reviewRequiredLegacyIds = []; },
    a => { a.entries.find(r => r.legacyId === "austin").identityStatus = "verified"; },
  ];
  for (const mutate of mutations) {
    const a = structuredClone(identityAudit); mutate(a);
    assert.throws(() => validateIdentityAudit(catalog.CATALOG_SOURCE, a), /Invalid identity audit/);
  }
});

test("V2f disputed snapshots do not canonize wrong names or assets or block runtime", () => {
  const c = structuredClone(catalog.CATALOG_SOURCE);
  const row = c.versions.find(v => v.legacyRosterId === "austin");
  row.displayName = "Review-only proposed name"; row.spriteId = "review_only";
  assert.equal(validateCatalog(c), true);
  assert.ok(validateIdentityAudit(c, identityAudit).reviewRequiredLegacyIds.includes("austin"));
  // The production catalog/save path does not call the opt-in identity audit.
  assert.equal(catalog.resolveVersion("austin").displayName, "Austin Hobbes");
  const old = newRun(starters);
  storage.saveRun(old);
  assert.deepEqual(storage.loadRun(), old);
});


test("V2f audit separates observed identity, runtime data and proposed remediation", () => {
  const allowed = ["IDENTITY_FIX", "ASSET_FIX", "GAME_DATA_FIX", "METADATA_FIX", "LEGACY_COMPAT"];
  for (const row of identityAudit.entries) {
    const r = data.ROSTER.find(r => r.id === row.legacyId);
    assert.equal(typeof row.declaredCharacter, "string");
    assert.equal(typeof row.assetCharacter, "string");
    assert.deepEqual(row.runtimeSnapshot, { role: r.role, element: r.element, move: r.move, baseStats: { hp: r.hp, atk: r.atk, def: r.def, spd: r.spd } });
    assert.equal(new Set(row.remediationCategories).size, row.remediationCategories.length);
    assert.ok(row.remediationCategories.every(c => allowed.includes(c)));
    if (row.identityStatus === "suspicious") {
      if (row.legacyId === "joseph") assert.ok(row.remediationCategories.includes("GAME_DATA_FIX"));
      else assert.notEqual(row.declaredCharacter, row.assetCharacter);
      assert.equal(row.canonicalCharacter, null);
      assert.ok(row.remediationCategories.some(c => ["ASSET_FIX", "GAME_DATA_FIX"].includes(c)));
    }
  }
  const unresolved = structuredClone(identityAudit);
  unresolved.entries.find(r => r.legacyId === "austin").identityStatus = "unresolved";
  assert.equal(validateIdentityAudit(catalog.CATALOG_SOURCE, unresolved).counts.unresolved, 2);
});


test("V2g repository portraits restore David, Joseph and Paolo without new assets", () => {
  const row = id => identityAudit.entries.find(r => r.legacyId === id);
  assert.equal(identityHashes.get(row("david").spritePath), row("joseph").v2fObservation.spriteSha256);
  assert.equal(identityHashes.get(row("joseph").spritePath), row("david").v2fObservation.spriteSha256);
  assert.equal(identityHashes.get(row("paolo").spritePath), identityHashes.get(row("fidio").spritePath));
  assert.equal(row("david").identityStatus, "verified");
  assert.equal(row("paolo").identityStatus, "verified");
  for (const id of ["austin", "jonas"]) assert.equal(identityHashes.get(row(id).spritePath), row(id).v2fObservation.spriteSha256);
  assert.equal(row("jonas").identityStatus, "unresolved");
  assert.equal(row("austin").identityStatus, "suspicious");
  assert.equal(row("joseph").identityStatus, "suspicious"); // Remaining Penguin No.1 conflict.
});

test("V2g preserves all persistent identities and legacy runtime/collection/history/fusion snapshots", async () => {
  const baseline = JSON.parse(await readFile(new URL("./fixtures/catalog-batch3.json", import.meta.url), "utf8"));
  assert.equal(baseline.aliases.length, 44);
  for (const a of baseline.aliases) {
    const v = catalog.resolveVersion(a.legacyId);
    assert.equal(v.versionId, a.versionId);
    assert.equal(v.characterId, a.legacyId);
    assert.equal(v.displayName, a.displayName);
  }
  const run = newRun(starters);
  const oldJoseph = { ...createPlayer("joseph", 8), role: "A", hp: 13, xp: 29 };
  run.team = [oldJoseph, createPlayer("paolo", 7), createPlayer("fidio", 6)];
  run.activeUid = oldJoseph.uid;
  run.team.push(fusePlayers(run.team[1], run.team[2], "a"));
  let meta = collection.recruitVersion(storage.loadMeta(), "paolo");
  meta = collection.recruitVersion(meta, "fidio");
  meta = storage.recordFinishedRun(meta, run, "lose");
  storage.saveRun(run); storage.saveMeta(meta);
  const loaded = storage.loadRun(); storage.saveRun(loaded);
  assert.deepEqual(storage.loadRun(), run);
  assert.deepEqual(storage.loadMeta(), meta);
  assert.equal(loaded.team[0].role, "A");
  assert.equal(createPlayer("joseph", 8).role, "P");
  assert.deepEqual(createPlayer("joseph", 8).move, oldJoseph.move);
  assert.equal(loaded.saveVersion, 2);
  assert.equal(storage.loadMeta().metaSchemaVersion, 1);
});


test("V2h feedback preserves real HP loss and pre-hit elemental/Talisman context without mutation", async () => {
  const { attackFeedback } = await import(moduleUrl((await source("battleFeedback")).replace('"./engine"', JSON.stringify(engineUrl))));
  const attacker = createPlayer("axel", 5), defender = { ...createPlayer("mark", 5), hp: 12 };
  for (const [element, expected] of [["natura", "strong"], ["terra", "weak"], ["fuoco", "neutral"]]) {
    const target = { ...defender, element };
    const snapshot = JSON.stringify([attacker, target]);
    const cue = attackFeedback(attacker, target, { ...target, hp: 0 });
    assert.equal(cue.effectiveness, expected);
    assert.equal(cue.damage, 12); // Actual HP lost, not an overkill damage estimate.
    assert.equal(cue.element, attacker.move.element);
    assert.equal(JSON.stringify([attacker, target]), snapshot);
  }
  const talisman = { ...attacker, status: { ...attacker.status, talisman: true } };
  assert.equal(attackFeedback(talisman, defender, { ...defender, hp: 8 }).effectiveness, "strong");
  assert.equal(attackFeedback(attacker, defender, { ...defender, hp: 20 }).damage, 0);
});


test("V2i scenario registry validates references, hierarchy, eligibility and weights", () => {
  assert.equal(scenarios.validateScenarios(), true);
  const mutations = [
    s => s.push(s[0]),
    s => { s[0].macroScenarioId = "missing"; },
    s => { s[0].locationType = "inventory"; },
    s => { s[0].allowedTeamTags = ["missing"]; },
    s => { s[0].allowedTeamTags = ["raimon", "raimon"]; },
    s => { s[0].allowedVersionIds = ["missing"]; },
    s => { s[0].arcId = "missing"; },
    s => { s[0].eraId = "missing"; },
    s => { s[0].minTier = 0; },
    s => { s[0].waveRange.from = -1; },
    s => { s[0].encounterPool.versionWeights = { "mark:base": -1 }; },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(scenarios.SCENARIOS); mutate(copy);
    assert.throws(() => scenarios.validateScenarios(copy));
  }
  assert.equal(new Set(scenarios.MACRO_SCENARIOS.map(m => m.id)).size, scenarios.MACRO_SCENARIOS.length);
});

test("V2i pools differ, preserve tier gates, and select without duplicates or rarity", () => {
  for (const [id, counts] of [["raimon-training", [10,10,10,10]], ["urban", [6,15,19,19]], ["international", [0,0,5,6]]]) {
    for (let tier = 1; tier <= 4; tier++) {
      const pool = scenarios.scenarioPool(id, 19, tier);
      assert.equal(pool.length, counts[tier - 1], `${id} tier ${tier}`);
      assert.ok(pool.every(r => r.version.encounterTier <= tier && r.version.rarityId === null));
      assert.equal(new Set(pool.map(r => r.version.versionId)).size, pool.length);
      const excluded = [];
      for (let i = 0; i < pool.length; i++) {
        const v = scenarios.selectEncounterVersion(id, 19, tier, excluded, () => 0);
        assert.ok(v); excluded.push(i % 2 ? v.versionId : v.legacyRosterId);
      }
      assert.equal(scenarios.selectEncounterVersion(id, 19, tier, excluded), null);
    }
  }
  assert.deepEqual(scenarios.scenarioPool("international", 17, 4), []);
  const ffi = scenarios.scenarioPool("international", 18, 3);
  assert.ok(ffi.every(r => r.weight === (r.version.teamTags.includes("unicorn") ? 3 : 1)));
  assert.equal(scenarios.selectEncounterVersion("urban", 1, 1, [], () => 0).versionId, "shawn:base");
  assert.notEqual(scenarios.selectEncounterVersion("urban", 1, 1, [], () => 0).versionId,
    scenarios.selectEncounterVersion("urban", 1, 1, [], () => 0.999).versionId);
});

test("V2i new runs choose context randomly and travel segments can have variable ends", () => {
  const rng = Math.random;
  try {
    Math.random = () => 0; const a = newRun(starters);
    Math.random = () => 0.999; const b = newRun(starters);
    assert.equal(a.scenarioState.id, "raimon-training"); assert.equal(b.scenarioState.id, "urban");
    assert.equal(scenarios.scenarioForWave(a.scenarioState, 6, 1, () => 0.999), a.scenarioState);
    assert.equal(scenarios.scenarioForWave(a.scenarioState, 7, 1, () => 0.999).id, "urban");
    assert.equal(scenarios.scenarioForWave(null, 17, 2, () => 0.999).id, "royal-academy");
    assert.equal(scenarios.scenarioForWave(null, 19, 3, () => 0.999).id, "international");
    const extended = { ...a.scenarioState, segmentEnd: 12 };
    assert.equal(scenarios.scenarioForWave(extended, 9, 2), extended);
  } finally { Math.random = rng; }
});

test("V2i legacy save preserves team and pending node without RNG, new scenario round-trips", () => {
  const run = newRun(starters); delete run.scenarioState;
  run.wave = 8; run.team[0].hp = 7; run.team[0].xp = 19;
  run.pending = { type: "battle", kind: "wild", enemies: [createPlayer("jordan", 8)] };
  const original = structuredClone(run);
  storage.saveRun(run);
  const rng = Math.random;
  try {
    Math.random = () => { throw new Error("Save must not reroll"); };
    const loaded = storage.loadRun();
    assert.deepEqual(loaded.team, original.team); assert.deepEqual(loaded.pending, original.pending);
    assert.equal(loaded.scenarioState.id, "urban");
    assert.equal(engine.generateWave(loaded), loaded.pending);
    storage.saveRun(loaded); assert.deepEqual(storage.loadRun(), loaded);
    assert.equal(scenarios.normalizeScenarioState({ id: "missing", revision: 1 }, 8).id, "urban");
  } finally { Math.random = rng; }
});

test("V2i generated ordinary groups use the selected pool and bosses remain scripted", () => {
  const rng = Math.random;
  try {
    Math.random = () => 0.7;
    const run = newRun(starters);
    const node = engine.generateWave(run); // wave 1 is a battle, 0.7 selects a group
    const allowed = scenarios.scenarioPool(node.scenarioState.id, 1, 1).map(r => r.version.legacyRosterId);
    assert.ok(node.enemies.every(p => allowed.includes(p.baseId)));
    assert.equal(new Set(node.enemies.map(p => p.baseId)).size, node.enemies.length);
    for (const scenario of scenarios.SCENARIOS) {
      const boss = engine.generateWave({ ...run, wave: 10, scenarioState: { id: scenario.id, revision: 1, segmentStart: 7, segmentEnd: 12 } });
      assert.deepEqual(boss.enemies.map(p => p.baseId), data.BOSSES[10].ids);
    }
  } finally { Math.random = rng; }
});

test("V2i future presentation descriptor is passive and exposes location hierarchy", () => {
  const v = catalog.resolveVersion("dylan"); const original = structuredClone(v);
  const descriptor = scenarios.encounterDescriptor(v, "international");
  assert.equal(descriptor.macroScenarioId, "ffi"); assert.equal(descriptor.locationId, "international");
  assert.equal(descriptor.locationType, "generic"); assert.equal(descriptor.areaId, null);
  assert.equal(descriptor.rarityId, null); assert.equal(descriptor.versionId, v.versionId);
  assert.deepEqual(v, original);
});


test("V2k median ceiling ignores KO, floors fractional ceiling and never raises raw levels", () => {
 const t = levels => levels.map(level=>({...player(),level}));
 assert.equal(engine.teamReferenceLevel(t([3,20,8])),8);
 assert.equal(engine.teamReferenceLevel(t([3,8])),5.5);
 assert.equal(engine.cappedEnemyLevel(20,t([3,8]),"easy-v2"),7);
 assert.equal(engine.cappedEnemyLevel(4,t([3,8]),"easy-v2"),4);
 assert.equal(engine.cappedEnemyLevel(20,[...t([8]),{...ko(),level:1}],"normal-v1","boss"),13);
 assert.equal(engine.cappedEnemyLevel(20,[],"normal-v1"),20);
 assert.equal(engine.cappedEnemyLevel(20,[ko()],"easy-v2"),20);
});

test("V2k caps only newly generated enemies, preserving identity, pools and pending saves", () => {
 const run=newRun(starters);run.wave=20;
 for(const difficulty of ["normal","easy"]) {
  const r={...newRun(starters,difficulty),wave:20};
  const result=engine.generateWave(r);
  assert.deepEqual(result.enemies.map(p=>p.baseId),data.BOSSES[20].ids);
  assert.ok(result.enemies.every(p=>p.level===(difficulty==="easy"?6:8)));
  for(const p of result.enemies) {
   const expected=createPlayer(p.baseId,p.level);
   for(const key of ["base","move","tier","atk","def","spd","maxHp"]) assert.deepEqual(p[key],expected[key]);
  }
 }
 const pending={type:"battle",enemies:[createPlayer("dvalin",23)]};
 storage.saveRun({...run,pending});
 assert.deepEqual(engine.generateWave(storage.loadRun()),pending);
});

test("V2k special bonuses respect Easy; offers receive ceiling only and are not mutated", () => {
 const high={...newRun(starters,"easy"),team:[createPlayer(starters[0],50)]};
 assert.equal(engine.enemiesForEffect({ids:["dvalin"],levelBonus:3},8,high)[0].level,10);
 assert.equal(engine.enemiesForEffect({ids:["dvalin"],levelBonus:3},8,{...high,rulesetId:"normal-v1"})[0].level,11);
 const low=newRun(starters,"easy");
 assert.equal(engine.enemiesForEffect({ids:["dvalin"],levelBonus:3},8,low)[0].level,5);
 const offer=createPlayer("dvalin",12),snapshot=structuredClone(offer);
 const capped=engine.recruitChallengePlayer(offer,low);
 assert.equal(capped.level,5);assert.equal(capped.uid,offer.uid);
 assert.deepEqual(offer,snapshot);
 assert.equal(engine.recruitChallengePlayer(offer,high),offer);
});


test("V2k1 losing ordinary/boss battles discards all partial kills and bench XP", () => {
 for (const boss of [false,true]) {
  const start = [player(),player(),ko()].map((p,i)=>({...p,uid:`loss-${i}`,xp:xpForLevel(p.level)-1}));
  const snapshot=structuredClone(start);
  const award=engine.grantCombatXp(start,start[0].uid,10,boss,"easy-v2");
  assert.ok(award.team[0].level>start[0].level);
  const final=award.team.map(p=>({...p,hp:0}));
  const settled=engine.settleCombatProgression("lose",start,final,award.report);
  assert.deepEqual(start,snapshot);
  settled.team.forEach((p,i)=> {
   assert.equal(p.level,start[i].level);assert.equal(p.xp,start[i].xp);assert.equal(p.hp,0);
   assert.equal(p.maxHp,start[i].maxHp);
  });
  assert.ok(settled.report.rows.every(r=>r.total===0 && r.activeXp===0 && r.benchXp===0 && r.after.level===r.before.level));
 }
});

test("V2k1 loss result is independent of Game Over and preserves previous progression/history", () => {
 const run=newRun(starters,"easy");
 run.team=run.team.map(p=>gainXp(p,90).player); // legitimate earlier waves
 const before=structuredClone(run.team);
 const award=engine.grantCombatXp(run.team,run.team[0].uid,10,true,run.rulesetId);
 const settled=engine.settleCombatProgression("lose",before,award.team.map(p=>({...p,hp:0})),award.report);
 const lost={...run,wave:10,activeUid:null,team:settled.team,lastProgression:{wave:10,report:settled.report},pending:{type:"battle",kind:"boss",teamName:"Royal Academy"}};
 assert.equal(engine.playtestSummary(lost).averageLevel,engine.playtestSummary({...run,team:before}).averageLevel);
 assert.equal(Math.max(...lost.team.map(p=>p.level)),Math.max(...before.map(p=>p.level)));
 assert.equal(lost.money,run.money);assert.deepEqual(lost.stats,run.stats);
 assert.equal(engine.completeNonCombatNode(lost),lost); // no travel for an unresolved/lost battle
 storage.saveRun(lost);assert.deepEqual(storage.loadRun(),lost);
 const meta=storage.recordFinishedRun(storage.loadMeta(),lost,"lose");
 const record=meta.records.at(-1);
 assert.deepEqual(record.teamSnapshot.map(p=>p.level),before.map(p=>p.level));
 storage.saveMeta(meta);storage.clearRun();
 assert.equal(storage.loadRun(),null);
 assert.deepEqual(storage.loadMeta().records.at(-1),record);
 assert.equal(storage.recordFinishedRun(meta,lost,"lose"),meta);
});

test("V2k1 win/flee keep existing growth; simultaneous loss rolls back and preserves real KO", () => {
 const start=[player()];const award=engine.grantCombatXp(start,start[0].uid,10,true);
 for(const result of ["win","flee"]) assert.equal(engine.settleCombatProgression(result,start,award.team,award.report).team,award.team);
 const settled=engine.settleCombatProgression("lose",start,[{...award.team[0],hp:0}],award.report);
 assert.equal(settled.team[0].hp,0);assert.equal(settled.team[0].xp,start[0].xp);
});


test("V2l Camelia explains non-KO healing without changing price or effects", () => {
 const choice=data.EVENTS.find(e=>e.id==="camelia").choices[0];
 assert.match(choice.label,/50 Prestigio.*non KO/);
 assert.match(choice.outcomes[0].text,/KO restano KO/);
 assert.equal(choice.cost,50);
 assert.equal(choice.outcomes[0].chance,100);
 assert.deepEqual(choice.outcomes[0].effects,[{type:"money",amt:-50},{type:"heal",pct:100,target:"all"}]);
});


test("V2m items have unique legacy-compatible metadata, presentation and weighted pools", () => {
 const legacy=["barretta","bibita","pallone","cuneo","fascia","guanti","scarpini","proteine","trofeo","fischietto","talismano"];
 const items=Object.values(data.ITEMS);
 assert.equal(items.length,16); assert.equal(new Set(items.map(i=>i.id)).size,16);
 for(const id of legacy) assert.ok(data.ITEMS[id]);
 for(const [key,item] of Object.entries(data.ITEMS)) {
  assert.equal(item.id,key);assert.ok(item.name && item.description);assert.equal(item.desc,item.description);
  assert.ok(Array.isArray(item.tags));assert.equal(new Set(item.tags).size,item.tags.length);
  assert.ok(["legacy","recovery","stages","money"].includes(item.effect.type));
  const rarity=data.ITEM_RARITIES[item.rarity]; assert.ok(rarity);
  assert.ok(rarity.label && rarity.cardClass && rarity.accentClass);
  assert.equal(data.itemPresentation(item.id),rarity);
  assert.ok(Number.isFinite(item.price) && item.price>0);
  assert.ok(Number.isFinite(item.rewardWeight) && item.rewardWeight>0);
  assert.ok(Number.isInteger(item.shopWeight) && item.shopWeight>=0);
 }
 assert.equal(data.REWARD_POOL.length,16);
 assert.equal(new Set(data.REWARD_POOL.map(r=>r.id)).size,16);
 for(const row of data.REWARD_POOL) assert.equal(row.w,data.ITEMS[row.id].rewardWeight);
 for(const id of data.SHOP_POOL) assert.ok(data.ITEMS[id]);
 const weights=r=>items.filter(i=>i.rarity===r).map(i=>i.rewardWeight);
 for(const [rare,common] of [["EPIC","RARE"],["RARE","UNCOMMON"],["UNCOMMON","COMMON"]])
  assert.ok(Math.max(...weights(rare))<Math.min(...weights(common)));
 assert.equal(data.ITEMS.cuneo.rarity,"EPIC");
});

test("V2m reward selection remains three unique deterministic choices; shop remains four", () => {
 const original=Math.random;
 const sample=()=>{
  let seed=127;
  Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  return Array.from({length:30},()=>({rewards:engine.generateRewards(),shop:engine.generateShop(8)}));
 };
 try {
  const first=sample();assert.deepEqual(first,sample());
  for(const row of first) {
   assert.equal(row.rewards.length,3);assert.equal(new Set(row.rewards).size,3);
   assert.ok(row.rewards.every(id=>data.ITEMS[id]));
   assert.equal(row.shop.length,4);assert.equal(new Set(row.shop.map(i=>i.id)).size,4);
  }
 } finally { Math.random=original; }
});

test("V2m recovery caps HP, cures burn and never revives; new effects reject KO", () => {
 const p={...player(),hp:1,status:{...player().status,burn:2}};
 const snapshot=structuredClone(p),result=applyItemTo("impacco",p);
 assert.equal(result.hp,1+Math.round(p.maxHp*.25));assert.equal(result.status.burn,0);assert.deepEqual(p,snapshot);
 assert.equal(applyItemTo("impacco",{...p,hp:p.maxHp-1}).hp,p.maxHp);
 assert.equal(engine.canApplyItem("impacco",player()),false);
 for(const id of ["impacco","grinta","tenuta","azzardo","buono"]) {
  const dead=ko();assert.equal(engine.canApplyItem(id,dead),false);assert.equal(applyItemTo(id,dead),dead);
 }
});

test("V2m temporary stages respect +/-3 and require the risk item's defensive cost", () => {
 const p=player();
 assert.equal(applyItemTo("grinta",p).status.atkMod,1);
 assert.equal(applyItemTo("tenuta",p).status.defMod,1);
 const risk=applyItemTo("azzardo",{...p,status:{...p.status,atkMod:2,defMod:-2}});
 assert.equal(risk.status.atkMod,3);assert.equal(risk.status.defMod,-3);
 assert.equal(engine.canApplyItem("azzardo",risk),false);
 assert.equal(engine.canApplyItem("azzardo",{...p,status:{...p.status,defMod:-3}}),false);
 const full={...p,status:{...p.status,atkMod:3,defMod:3}};
 assert.equal(engine.canApplyItem("grinta",full),false);assert.equal(engine.canApplyItem("tenuta",full),false);
 assert.deepEqual(engine.resetBattleStatus([risk])[0].status,engine.freshStatus());
 assert.equal(risk.atk,p.atk);assert.equal(risk.def,p.def);assert.deepEqual(risk.bonus,p.bonus);
});

test("V2m sponsor voucher is single-use, cannot yield purchase profit or target players", () => {
 const run={...newRun(starters),items:{buono:1}};
 const next=engine.consumeRunItem(run,"buono");
 assert.equal(next.money,run.money+35);assert.equal(next.items.buono||0,0);
 assert.equal(engine.consumeRunItem(next,"buono"),next);
 assert.ok(data.ITEMS.buono.price>data.ITEMS.buono.effect.amount);
 assert.ok(!data.SHOP_POOL.includes("buono"));
 assert.equal(engine.canApplyItem("buono",player()),false);
 assert.deepEqual(run.items,{buono:1});assert.equal(next.team,run.team);
});

test("V2m legacy inventories and persisted rewards/shop offers are not regenerated", () => {
 const items={barretta:2,bibita:1,pallone:1,cuneo:1,talismano:1};
 for(const pending of [{type:"reward",context:{rewards:["cuneo","barretta","trofeo"],money:40}},
  {type:"shop",stock:[{id:"pallone",price:151},{id:"bibita",price:91}],bought:[0]}]) {
  const run={...newRun(starters),items,pending};
  storage.saveRun(run);assert.deepEqual(storage.loadRun(),run);
  assert.deepEqual(engine.generateWave(storage.loadRun()),pending);
 }
});
