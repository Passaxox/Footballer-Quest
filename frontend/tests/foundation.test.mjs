import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Load the production ES modules without adding a bundler or changing CRA's module format.
const source = (name) => readFile(new URL(`../src/game/${name}.js`, import.meta.url), "utf8");
const moduleUrl = (text) => `data:text/javascript;base64,${Buffer.from(text).toString("base64")}`;
const dataUrl = moduleUrl(await source("data"));
const rulesUrl = moduleUrl(await source("rules"));
const engineUrl = moduleUrl((await source("engine")).replace('"./data"', JSON.stringify(dataUrl)).replace('"./rules"', JSON.stringify(rulesUrl)));
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
    const encounter = engine.generateWave({ ...newRun(starters), wave });
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
    const encounter = engine.generateWave({ ...newRun(starters, difficulty), wave: 10 });
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
      assert.ok(engine.generateWave({ ...newRun(starters, "easy"), wave }).enemies.every(p => p.level === level));
      assert.ok(engine.generateWave({ ...newRun(starters), wave }).enemies.every(p => p.level === (wave === 10 ? 11 : wave + 3)));
    }
    const old = { ...newRun(starters, "easy"), rulesetId: "easy-v1", rulesetVersion: 1 };
    storage.saveRun(old);
    assert.deepEqual(storage.loadRun(), old);
  } finally { Math.random = random; }
});
