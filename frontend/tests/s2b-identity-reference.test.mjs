import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// S2B pre-migration reference lock. Every "PRE-MIGRATION BASELINE" assertion records what the code does at
// 32f43dd0 and is NOT permanent canon: S3 may supersede it only after independent compatibility verification.
// G2 supersedes only the live hector characterId/name and derived ownership; historical saves stay locked.
// Collection no-transfer, duplicate-canonical saves, pending encounters and fused history are covered by S1b/S2A.
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
const scenarios = await import(await load("scenarios"));
const data = await import(await load("data"));
const { LEGACY_MOVE_IDENTITIES } = await import(await load("legacyMoveIdentity"));

// 1. Historical identity lock -------------------------------------------------------------------
test("S2B lock: every frozen historical versionId stays resolvable with its historical primaryMoveId", () => {
  const entries = Object.entries(LEGACY_MOVE_IDENTITIES);
  assert.equal(entries.length, 67);
  for (const [versionId, [moveId]] of entries) {
    const version = catalog.resolveVersion(versionId);
    assert.ok(version, `${versionId} must stay resolvable`);
    assert.equal(version.versionId, versionId);
    assert.equal(version.primaryMoveId, moveId, `${versionId} must keep ${moveId}`);
  }
});

test("S2B lock: sensitive historical version and move IDs keep their literal identities", () => {
  const expected = {
    "malcolm:base": "malcolm:primary", "hector:base": "hector:primary", "rococo:base": "rococo:primary",
    "fidio:base": "fidio:primary", "paolo:base": "paolo:primary", "jonas:base": "jonas:primary",
    "jonas:zeus": "jonas:zeus:primary", "dvalin:base": "dvalin:primary", "dvalin:epsilon-ie2": "dvalin:epsilon-ie2:primary",
    "silvia:base": "silvia:primary",
  };
  for (const [versionId, moveId] of Object.entries(expected)) {
    assert.equal(catalog.resolveVersion(versionId).primaryMoveId, moveId);
    assert.equal(LEGACY_MOVE_IDENTITIES[versionId][0], moveId);
    assert.ok(catalog.PRIMARY_MOVES[moveId], `${moveId} must stay registered`);
  }
  // Only the documented shared Jude move ID may be referenced by more than one version.
  const owners = new Map();
  for (const [versionId, [moveId]] of Object.entries(LEGACY_MOVE_IDENTITIES)) owners.set(moveId, [...(owners.get(moveId) || []), versionId]);
  assert.deepEqual([...owners].filter(([, ids]) => ids.length > 1), [["jude:primary", ["jude:base", "jude:royal"]]]);
});

// 2. PRE-MIGRATION BASELINE: canonical behaviour -------------------------------------------------
test("S2B live identities: only the approved G2 Suzette rekey supersedes the baseline", () => {
  const baseline = [
    ["malcolm:base", "malcolm", "Jim Wraith"], ["hector:base", "suzette", "Suzette Hartland"], ["rococo:base", "rococo", "Rococo Urupa"],
    ["fidio:base", "fidio", "Fidio Aldena"], ["paolo:base", "fidio", "Paolo Bianchi"],
    ["jonas:base", "jonas", "Jonas Demetrius"], ["jonas:zeus", "jonas", "Jonas Demetrius (Demeter)"],
    ["dvalin:base", "dvalin", "Dvalin"], ["dvalin:epsilon-ie2", "dvalin", "Dvalin"],
  ];
  for (const [versionId, canonical, displayName] of baseline) {
    assert.equal(catalog.canonicalCharacterId(versionId), canonical, versionId);
    assert.equal(catalog.resolveVersion(versionId).displayName, displayName, versionId);
  }
  assert.equal(catalog.resolveVersion("hector:base").legacyOnly, false);
  assert.equal(catalog.resolveVersion("fidio:base").legacyOnly, false);
  assert.equal(catalog.resolveVersion("paolo:base").legacyOnly, false);
  assert.equal(catalog.resolveVersion("jonas:base").legacyOnly, true);
  assert.equal(catalog.resolveVersion("jonas:zeus").legacyOnly, false);
  assert.notEqual(catalog.canonicalCharacterId("hector:base"), catalog.canonicalCharacterId("rococo:base"));
  assert.deepEqual(catalog.CHARACTER_ALIASES, { paolo: "fidio" });
  for (const id of ["jim:base", "suzette:base", "malcolm-night:base", "dvalin:neo-japan"]) assert.equal(catalog.resolveVersion(id), null, id);
});

test("S2B PRE-MIGRATION BASELINE: canonicalCharacterId prefers the live registry over a stored characterId", () => {
  assert.equal(catalog.canonicalCharacterId({ versionId: "malcolm:base", characterId: "future-malcolm-night" }), "malcolm");
  assert.equal(catalog.canonicalCharacterId({ baseId: "hector", characterId: "future-rika" }), "suzette");
  // Only an unresolvable version falls back to the stored value, which keeps opaque history readable.
  assert.equal(catalog.canonicalCharacterId({ versionId: "opaque:legacy", characterId: "opaque-person" }), "opaque-person");
  assert.equal(catalog.canonicalCharacterId({ baseId: "mark+axel", fused: true }), null);
});

// 3. Historical move identity hydration ----------------------------------------------------------
const historical = (versionId, extra = {}) => {
  const p = engine.createPlayer(versionId, 5, () => 0.2);
  const [, name, element, power, effect] = LEGACY_MOVE_IDENTITIES[versionId];
  return { ...p, move: { name, element, power, effect }, ...extra };
};
const drop = (player, key) => { const { [key]: _removed, ...rest } = player; return rest; };

test("S2B move identity: exact historical payload without moveId infers the frozen ID", () => {
  for (const versionId of ["malcolm:base", "hector:base", "fidio:base", "paolo:base", "dvalin:base", "jonas:base"]) {
    const hydrated = catalog.withPlayerIdentity(historical(versionId));
    assert.equal(hydrated.move.moveId, LEGACY_MOVE_IDENTITIES[versionId][0], versionId);
    assert.equal(hydrated.versionId, versionId);
  }
});

test("S2B move identity: absent characterId is added from the live version and does not block inference", () => {
  const snapshot = drop(drop(historical("hector:base"), "characterId"), "versionId");
  const hydrated = catalog.withPlayerIdentity(snapshot);
  assert.equal(hydrated.move.moveId, "hector:primary");
  assert.equal(hydrated.versionId, "hector:base");
  assert.equal(hydrated.characterId, "suzette");
});

test("S2B move identity: stored characterId consistent with the version still infers", () => {
  const hydrated = catalog.withPlayerIdentity(historical("malcolm:base", { characterId: "malcolm" }));
  assert.equal(hydrated.move.moveId, "malcolm:primary");
  assert.equal(hydrated.characterId, "malcolm");
});

test("S2B COMPATIBILITY HAZARD: a stored characterId that disagrees with the live registry yields sticky moveId:null", () => {
  for (const versionId of ["malcolm:base", "hector:base"]) {
    const snapshot = historical(versionId, { characterId: "renamed-character" });
    const hydrated = catalog.withPlayerIdentity(snapshot);
    // Exact historical payload evidence is discarded when characterId diverges from the live registry.
    assert.equal(hydrated.move.moveId, null, versionId);
    assert.equal(hydrated.characterId, "renamed-character", "stored characterId is preserved");
    assert.equal(hydrated.versionId, versionId);
    assert.deepEqual({ ...hydrated.move, moveId: undefined }, { ...snapshot.move, moveId: undefined }, "payload untouched");
    // Null is durable: re-hydration never retries inference.
    assert.equal(catalog.withPlayerIdentity(hydrated).move.moveId, null);
  }
});

test("S2B move identity: existing non-empty moveId and sticky null are never rewritten", () => {
  const known = catalog.withPlayerIdentity(historical("fidio:base", { characterId: "renamed-character" }));
  assert.equal(known.move.moveId, null);
  const kept = { ...historical("fidio:base", { characterId: "renamed-character" }) };
  kept.move = { ...kept.move, moveId: "fidio:primary" };
  assert.equal(catalog.withPlayerIdentity(kept).move.moveId, "fidio:primary");
  const opaque = historical("hector:base"); opaque.move = { ...opaque.move, moveId: "opaque:move" };
  assert.equal(catalog.withPlayerIdentity(opaque).move.moveId, "opaque:move");
  const sticky = historical("hector:base"); sticky.move = { ...sticky.move, moveId: null };
  assert.equal(catalog.withPlayerIdentity(sticky).move.moveId, null);
  for (const blank of ["", "   ", undefined]) {
    const p = historical("hector:base"); p.move = { ...p.move, moveId: blank };
    assert.equal(catalog.withPlayerIdentity(p).move.moveId, null, `blank ${JSON.stringify(blank)} resolves to sticky null`);
  }
});

test("S2B move identity: fusion snapshots keep parentVersionIds and never gain an invented identity", () => {
  const fused = { ...historical("malcolm:base"), baseId: "malcolm+hector", fused: true, parentVersionIds: ["malcolm:base", "hector:base"] };
  delete fused.versionId; delete fused.characterId;
  const hydrated = catalog.withPlayerIdentity(fused);
  assert.deepEqual(hydrated.parentVersionIds, ["malcolm:base", "hector:base"]);
  assert.equal(hydrated.baseId, "malcolm+hector");
  assert.equal(hydrated.move.moveId, null);
  assert.equal("versionId" in hydrated, false);
  assert.equal("characterId" in hydrated, false);
  assert.deepEqual([...catalog.ownedCharacterIds([hydrated])].sort(), ["malcolm", "suzette"]);
  // Without parentVersionIds, ownership falls back to the baseId split only; no name-based inference.
  assert.deepEqual([...catalog.ownedCharacterIds([drop(hydrated, "parentVersionIds")])].sort(), ["malcolm", "suzette"]);
});

// 4. Static boss / event / scenario references ---------------------------------------------------
test("S2B PRE-MIGRATION BASELINE: literal boss, event and scenario references", () => {
  assert.deepEqual(data.BOSSES[30].ids, ["dvalin", "torch", "gazelle"]);
  assert.deepEqual(data.BOSSES[40].ids, ["jordan", "dvalin", "xavier"]);
  assert.deepEqual(data.BOSSES[50].ids, ["fidio", "kruger", "rococo"]);
  assert.equal(catalog.resolveVersion("fidio").versionId, "fidio:base");
  assert.equal(JSON.stringify(data.EVENTS).split('"ids":["dvalin"]').length - 1, 1, "single Alius event references bare dvalin");
  assert.deepEqual(scenarios.SCENARIOS.find(s => s.id === "urban").allowedVersionIds,
    ["shawn", "darren", "sam", "steve", "bobby", "maxwell", "erik", "caleb", "hurley", "scotty", "thor", "archer", "canon", "hector", "silvia", "aiden", "david", "paolo", "fidio"].map(id => id + ":base"));
  assert.deepEqual(engine.EPSILON_ENTRY_IDS, ["tytan:epsilon-ie2", "krypto:epsilon-ie2", "zell:epsilon-ie2", "dvalin:epsilon-ie2"]);
});

test("S2B PRE-MIGRATION BASELINE: historical Jim lives in the Raimon context", () => {
  const jim = catalog.resolveVersion("malcolm:base");
  assert.deepEqual(jim.teamTags, ["raimon"]);
  assert.equal(jim.primaryTeamId, "raimon");
  assert.ok(scenarios.scenarioPool("raimon-training", 5, 1).some(r => r.version.versionId === "malcolm:base"));
  assert.equal(catalog.resolveVersion("hector:base").primaryTeamId, null);
});

test("S2B PRE-MIGRATION BASELINE: Jonas legacy-only handling and fresh-event substitution", () => {
  assert.equal(scenarios.isFreshPlayerVersion(catalog.resolveVersion("jonas:base")), false);
  assert.equal(scenarios.isFreshPlayerVersion(catalog.resolveVersion("jonas:zeus")), true);
  assert.equal(engine.createPlayer("jonas", 5, () => 0.2).versionId, "jonas:base");
  assert.deepEqual(engine.enemiesForEffect({ ids: ["jonas"] }, 10).map(p => p.versionId), ["jonas:zeus"]);
  assert.deepEqual(engine.enemiesForEffect({ ids: ["dvalin"] }, 10).map(p => p.versionId), ["dvalin:base"]);
  assert.deepEqual(engine.enemiesForEffect({ ids: ["fidio", "paolo"] }, 10).map(p => p.versionId), ["fidio:base"]);
});

// 5. Scenario / RNG baseline (values captured once from 32f43dd0 and hardcoded) -------------------
const seqRng = values => { const f = () => values[f.n++ % values.length]; f.n = 0; return f; };
const SEQUENCE = [0.05, 0.31, 0.62, 0.93, 0.47, 0.18, 0.76, 0.5];
const POOLS = {
  urban: { wave: 5, tier: 3,
    pool: ["shawn:base=1", "darren:base=1", "sam:base=1", "steve:base=1", "bobby:base=1", "maxwell:base=1", "erik:base=1", "caleb:base=1", "hurley:base=1", "scotty:base=1", "thor:base=1", "archer:base=1", "david:base=1", "canon:base=1", "paolo:base=1", "fidio:base=1", "hector:base=1", "silvia:base=1", "aiden:base=1"],
    picks: ["shawn:base", "maxwell:base", "archer:base", "silvia:base"], lineup: { teamId: null, type: "mixed", ids: ["shawn:base", "erik:base", "david:base"], draws: 3 } },
  "raimon-training": { wave: 5, tier: 1,
    pool: ["mark:base=3", "axel:base=3", "jude:base=3", "nathan:base=3", "jack:base=3", "kevin:base=3", "tod:base=3", "tim:base=3", "willy:base=3", "malcolm:base=3"],
    picks: ["mark:base", "nathan:base", "tod:base", "malcolm:base"], lineup: { teamId: "raimon", type: "canonical-team", ids: ["nathan:base", "tod:base", "malcolm:base"], draws: 4 } },
  "royal-academy": { wave: 10, tier: 2,
    pool: ["peter-drent:royal=3", "ben-simmons:royal=3", "alan-master:royal=3", "gus-martin:royal=3", "herman-waldon:royal=3", "john-bloom:royal=3", "derek-swing:royal=3", "daniel-hatch:royal=3", "jude:royal=3"],
    picks: ["peter-drent:royal", "alan-master:royal", "john-bloom:royal", "jude:royal"], lineup: { teamId: "royal-academy", type: "canonical-team", ids: ["alan-master:royal", "john-bloom:royal", "jude:royal"], draws: 4 } },
  zeus: { wave: 20, tier: 3,
    pool: ["poseidon:zeus=3", "apollon:zeus=3", "hephais:zeus=3", "ares:zeus=3", "dio:zeus=3", "artemis:zeus=3", "hermes:zeus=3", "athena:zeus=3", "jonas:zeus=3", "hera:zeus=3"],
    picks: ["poseidon:zeus", "ares:zeus", "hermes:zeus", "hera:zeus"], lineup: { teamId: "zeus", type: "canonical-team", ids: ["ares:zeus", "hermes:zeus", "hera:zeus"], draws: 4 } },
  international: { wave: 30, tier: 3,
    pool: ["kruger:base=3", "dylan:base=3", "edgar:base=1", "teres:base=1", "chae:base=1"],
    picks: ["kruger:base", "kruger:base", "dylan:base", "chae:base"], lineup: { teamId: null, type: "mixed", ids: ["kruger:base", "dylan:base", "teres:base"], draws: 3 } },
};
for (const [id, ref] of Object.entries(POOLS)) {
  test(`S2B RNG baseline: ${id} pool membership, order, weights and deterministic selections`, () => {
    assert.deepEqual(scenarios.scenarioPool(id, ref.wave, ref.tier).map(r => `${r.version.versionId}=${r.weight}`), ref.pool);
    const picker = seqRng(SEQUENCE);
    assert.deepEqual([0, 1, 2, 3].map(() => scenarios.selectEncounterVersion(id, ref.wave, ref.tier, [], picker)?.versionId), ref.picks);
    assert.equal(picker.n, 4, "one RNG draw per selected version");
    const lineupRng = seqRng(SEQUENCE);
    const lineup = scenarios.selectEncounterLineup(id, ref.wave, ref.tier, 3, lineupRng);
    assert.deepEqual({ teamId: lineup.teamId, type: lineup.encounterType, ids: lineup.versions.map(v => v.versionId), draws: lineupRng.n }, ref.lineup);
  });
}

test("S2B RNG baseline: global randomRosterId pool order and draw count", () => {
  const expected = {
    3: ["mark", "axel", "nathan", "jack", "darren", "sam", "bobby", "tim", "erik", "caleb", "scotty", "archer", "david", "jordan", "canon", "fidio", "dylan", "teres", "malcolm", "silvia"],
    1: ["mark", "axel", "nathan", "shawn", "kevin", "sam", "steve", "maxwell", "tim", "malcolm"],
  };
  const original = Math.random;
  try {
    for (const [tier, ids] of Object.entries(expected)) {
      const results = [];
      ids.forEach((_, i) => {
        let draws = 0;
        Math.random = () => { draws++; return i / ids.length; };
        results.push(engine.randomRosterId(Number(tier), []));
        assert.equal(draws, 1, "randomRosterId consumes exactly one draw");
      });
      assert.deepEqual(results, ids, `tier ${tier}`);
    }
  } finally { Math.random = original; }
});

// 6. Integrity ----------------------------------------------------------------------------------
test("S2B integrity: authored bosses, scenarios and teams validate at the baseline", () => {
  assert.doesNotThrow(() => scenarios.validateTeamIntegrity({ bosses: data.BOSSES }));
  assert.doesNotThrow(() => scenarios.validateScenarios());
});
