import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Load the production ES modules without adding a bundler or changing CRA's module format.
const source = (name) => readFile(new URL(`../src/game/${name}.js`, import.meta.url), "utf8");
const moduleUrl = (text) => `data:text/javascript;base64,${Buffer.from(text).toString("base64")}`;
const dataUrl = moduleUrl(await source("data"));
const engineUrl = moduleUrl((await source("engine")).replace('"./data"', JSON.stringify(dataUrl)));
const engine = await import(engineUrl);
const data = await import(dataUrl);
const storage = await import(moduleUrl((await source("storage"))
  .replace('"./data"', JSON.stringify(dataUrl)).replace('"./engine"', JSON.stringify(engineUrl))));
const { createPlayer, recalcStats, gainXp, xpForLevel, applyItemTo, applyEventDamage,
  fusePlayers, fuseRunPlayers, newRun, normalizeRun, resolveActiveUid, canReleasePlayer } = engine;
const starters = data.STARTER_IDS.slice(0, 3);
const player = () => createPlayer(starters[0], 3);
const ko = () => ({ ...player(), hp: 0 });
const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};

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
