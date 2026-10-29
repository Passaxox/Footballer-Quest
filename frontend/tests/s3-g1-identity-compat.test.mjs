import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// S3-G1 guardrails. Synthetic divergence is a predicate-level proof only; no live registry is mutated.
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
const { withMoveIdentity, withPlayerIdentity, isCharacterIdConsistent, HISTORICAL_CHARACTER_IDS } = catalog;

const MALCOLM = { name: "Tiro Fantasma", element: "terra", power: 65, effect: "weaken" };
const HECTOR = { name: "Anello Arcobaleno", element: "natura", power: 78, effect: "charge" };
const MARK = { name: "Mano Magica", element: "terra", power: 55, effect: "guard" };
const mk = (baseId, move, extra = {}) => ({ uid: "u1", baseId, hp: 11, xp: 7, stats: { atk: 3 }, move: { ...move }, ...extra });
const idOf = p => withMoveIdentity(p).move.moveId;

test("baseline inference with absent moveId", () => {
  assert.equal(idOf(mk("malcolm:base", MALCOLM)), "malcolm:primary");
  assert.equal(idOf(mk("hector", HECTOR)), "hector:primary");
  assert.equal(idOf(mk("mark", MARK, { versionId: "mark:base", characterId: "mark" })), "mark:primary");
});

test("missing saved characterId infers", () => {
  assert.equal(idOf(mk("malcolm:base", MALCOLM, { versionId: "malcolm:base" })), "malcolm:primary");
});

test("historical stored characterId matching live identity infers", () => {
  assert.equal(idOf(mk("malcolm:base", MALCOLM, { versionId: "malcolm:base", characterId: "malcolm" })), "malcolm:primary");
  assert.equal(idOf(mk("hector:base", HECTOR, { versionId: "hector:base", characterId: "hector" })), "hector:primary");
});

test("synthetic post-rekey divergence uses the production predicate", () => {
  assert.equal(isCharacterIdConsistent("malcolm", "malcolm:base", "jim-wraith"), true);
  assert.equal(isCharacterIdConsistent("hector", "hector:base", "rika-urabe"), true);
  assert.equal(isCharacterIdConsistent("malcolm", "malcolm:base", "malcolm"), true);
  assert.equal(isCharacterIdConsistent(undefined, "malcolm:base", "jim-wraith"), true);
  assert.equal(isCharacterIdConsistent("other", "malcolm:base", "jim-wraith"), false);
  assert.equal(isCharacterIdConsistent("jim-wraith", "malcolm:base", "other"), false);
  // Live registry is untouched and still consistent through the production path.
  assert.equal(catalog.CHARACTER_VERSIONS["malcolm:base"].characterId, "malcolm");
});

test("historical mapping is frozen plain literal data", () => {
  assert.ok(Object.isFrozen(HISTORICAL_CHARACTER_IDS));
  assert.deepEqual({ ...HISTORICAL_CHARACTER_IDS }, { "malcolm:base": "malcolm", "hector:base": "hector" });
  assert.throws(() => { "use strict"; HISTORICAL_CHARACTER_IDS["rococo:base"] = "hector"; }, TypeError);
});

test("unknown and cross-version characterIds are rejected", () => {
  assert.equal(idOf(mk("malcolm:base", MALCOLM, { versionId: "malcolm:base", characterId: "unknown" })), null);
  assert.equal(idOf(mk("malcolm:base", MALCOLM, { versionId: "malcolm:base", characterId: "hector" })), null);
  assert.equal(isCharacterIdConsistent("malcolm", "hector:base", "rika"), false);
  assert.equal(isCharacterIdConsistent("hector", "malcolm:base", "jim"), false);
  assert.equal(isCharacterIdConsistent("x", "toString", "y"), false);
  assert.equal(isCharacterIdConsistent("x", undefined, undefined), false);
});

test("hector history does not authorize rococo:base", () => {
  assert.equal(isCharacterIdConsistent("hector", "rococo:base", "rococo"), false);
  const rococo = catalog.PRIMARY_MOVES["rococo:primary"];
  const p = mk("rococo:base", rococo, { versionId: "rococo:base", characterId: "hector" });
  delete p.move.moveId;
  assert.equal(idOf(p), null);
});

test("explicit null, undefined, empty and whitespace moveIds keep original behavior", () => {
  const base = mk("malcolm:base", MALCOLM);
  assert.equal(withMoveIdentity({ ...base, move: { ...MALCOLM, moveId: null } }).move.moveId, null);
  for (const v of [undefined, "", "   "]) {
    const out = withMoveIdentity({ ...base, move: { ...MALCOLM, moveId: v } });
    assert.equal(out.move.moveId, null, JSON.stringify(v));
  }
});

test("existing opaque or known moveId strings are untouched", () => {
  for (const id of ["opaque-x", "malcolm:primary", "hector:primary"]) {
    const p = mk("malcolm:base", { ...MALCOLM, moveId: id });
    assert.equal(withMoveIdentity(p), p);
  }
});

test("fused snapshots never infer", () => {
  assert.equal(idOf(mk("malcolm:base+hector:base", MALCOLM)), null);
  assert.equal(idOf(mk("malcolm:base", MALCOLM, { fused: true })), null);
});

test("incomplete, altered or ambiguous signatures stay unresolved", () => {
  for (const key of Object.keys(MALCOLM)) {
    const missing = { ...MALCOLM }; delete missing[key];
    assert.equal(idOf(mk("malcolm:base", missing)), null, `missing ${key}`);
    const altered = { ...MALCOLM, [key]: key === "power" ? 66 : "zzz" };
    assert.equal(idOf(mk("malcolm:base", altered)), null, `altered ${key}`);
  }
  assert.equal(idOf(mk("malcolm:base", { name: MALCOLM.name })), null);
  assert.equal(idOf(mk("malcolm:base", HECTOR)), null);
  assert.equal(idOf(mk("unknown-base", MALCOLM)), null);
  assert.equal(idOf(mk(undefined, MALCOLM)), null);
});

test("versionId/baseId mismatch behavior unchanged", () => {
  assert.equal(idOf(mk("hector:base", HECTOR, { versionId: "malcolm:base" })), null);
  assert.equal(idOf(mk("malcolm:base", HECTOR, { versionId: "hector:base" })), "hector:primary");
  assert.equal(idOf(mk("malcolm", MALCOLM, { versionId: "malcolm:base" })), "malcolm:primary");
  assert.equal(idOf(mk("ghost", MALCOLM, { versionId: "malcolm:base" })), "malcolm:primary");
});

test("save fields and payloads are not rewritten", () => {
  const p = mk("malcolm:base", MALCOLM, { versionId: "malcolm:base", characterId: "malcolm", extra: { a: 1 } });
  const snapshot = structuredClone(p);
  const out = withPlayerIdentity(p);
  assert.deepEqual(p, snapshot);
  const { moveId, ...move } = out.move;
  assert.equal(moveId, "malcolm:primary");
  assert.deepEqual(move, MALCOLM);
  assert.equal(out.characterId, "malcolm");
  for (const k of ["uid", "hp", "xp", "stats", "baseId", "versionId", "extra"]) assert.deepEqual(out[k], snapshot[k]);
});

test("repeated hydration is idempotent", () => {
  for (const p of [mk("malcolm:base", MALCOLM, { characterId: "malcolm" }), mk("malcolm:base", { ...MALCOLM, power: 1 }), mk("hector:base+x", HECTOR)]) {
    const once = withPlayerIdentity(p);
    assert.deepEqual(withPlayerIdentity(once), once);
  }
});
