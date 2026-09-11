import { getScenario, scenarioPool, selectEncounterVersion, scenarioForWave, normalizeScenarioState } from "./scenarios";
import { CHARACTERS, PRIMARY_MOVES, resolveVersion, withPlayerIdentity } from "./catalog";
import { DEFAULT_RULESET, DIFFICULTIES, getRules, ENEMY_GUARDRAILS } from "./rules";
import { ROSTER, ELEMENTS, BOSSES, ITEMS, REWARD_POOL, FINAL_WAVE, TEAM_NAMES, SHOP_POOL } from "./data";
import { normalizeEventResult, resolveEventChoice, selectEvent, weightedPick } from "./events";
import { createRunRandomCursor, createRunSeed, hashSeed, normalizeRandomState } from "./runRandom";
import { RARITIES, rarityIdForVersion } from "./rarity";

export const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (pct) => Math.random() * 100 < pct;
export const uid = () => Math.random().toString(36).slice(2, 10);

export const byId = (id) => ROSTER.find((p) => p.id === (resolveVersion(id)?.legacyRosterId || id));

export const typeMultiplier = (moveEl, targetEl) => {
  if (ELEMENTS[moveEl].beats === targetEl) return 1.5;
  if (ELEMENTS[targetEl].beats === moveEl) return 0.67;
  return 1;
};

export const effectiveTypeMultiplier = (attacker, defender, move = attacker.move) =>
  attacker.status?.talisman ? 1.5 : typeMultiplier(move.element, defender.element);

export const xpForLevel = (level) => Math.floor(20 + level * 12);

const scale = (base, level) => Math.floor(base * (1 + 0.07 * (level - 1)));

export const recalcStats = (p) => {
  const b = p.base;
  const maxHp = scale(b.hp, p.level) + p.bonus.hp;
  const ratio = p.maxHp ? p.hp / p.maxHp : 1;
  return { ...p, maxHp, hp: p.hp === 0 ? 0 : Math.max(1, Math.min(maxHp, Math.round(maxHp * ratio))), atk: scale(b.atk, p.level) + p.bonus.atk, def: scale(b.def, p.level) + p.bonus.def, spd: scale(b.spd, p.level) + p.bonus.spd };
};

export const createPlayer = (id, level = 1, instanceUid = uid()) => {
  const version = resolveVersion(id);
  if (!version || version.kind !== "player") throw new Error("Versione giocatore non disponibile.");
  const p = {
    uid: instanceUid, baseId: version.legacyRosterId || version.versionId, characterId: version.characterId, versionId: version.versionId,
    name: version.displayName || CHARACTERS[version.characterId]?.displayName || "Sconosciuto", element: version.element, role: version.role,
    tier: version.encounterTier, move: { ...PRIMARY_MOVES[version.primaryMoveId] },
    level, xp: 0, base: { ...version.baseStats }, bonus: { hp: 0, atk: 0, def: 0, spd: 0 },
    maxHp: 0, hp: 0, fused: false, status: freshStatus(),
  };
  const s = recalcStats(p);
  return { ...s, hp: s.maxHp };
};

export const freshStatus = () => ({ burn: 0, atkMod: 0, defMod: 0, guard: false, talisman: false });

export const gainXp = (p, amount) => {
  let q = { ...p, xp: p.xp + amount };
  let ups = 0;
  while (q.xp >= xpForLevel(q.level) && q.level < 100) {
    q.xp -= xpForLevel(q.level);
    q.level += 1;
    ups += 1;
  }
  if (ups) {
    const before = q.maxHp;
    q = recalcStats(q);
    q.hp = p.hp === 0 ? 0 : Math.min(q.maxHp, q.hp + (q.maxHp - before));
  }
  return { player: q, ups };
};

const modMult = (stage) => Math.max(0.4, 1 + stage * 0.25);

// Shared by every offensive heal/drain technique, on both sides of battle.
export const SUSTAIN_RULE = { maxHpShare: 0.1, actualDamageShare: 0.5 };
export const sustainHealing = (attacker, actualDamage) => attacker.hp <= 0 ? 0 : Math.max(0, Math.min(
  attacker.maxHp - attacker.hp,
  Math.floor(attacker.maxHp * SUSTAIN_RULE.maxHpShare),
  Math.floor(actualDamage * SUSTAIN_RULE.actualDamageShare),
));

export const calcDamage = (att, def, move) => {
  const atk = att.atk * modMult(att.status.atkMod);
  const dfn = def.def * modMult(def.status.defMod);
  const mult = effectiveTypeMultiplier(att, def, move);
  const crit = chance(move.effect === "crit" ? 30 : 8);
  const stab = move.element === att.element ? 1.1 : 1;
  let dmg = (((2 * att.level) / 5 + 2) * move.power * atk / dfn) / 9 + 2;
  dmg *= mult * stab * (0.88 + Math.random() * 0.12) * (crit ? 1.5 : 1);
  if (def.status.guard) dmg *= 0.5;
  return { dmg: Math.max(1, Math.round(dmg)), mult, crit };
};

// Executes one attack; returns updated {att, def, messages}
export const performAttack = (attacker, defender) => {
  const move = attacker.move;
  let att = { ...attacker, status: { ...attacker.status } };
  let def = { ...defender, status: { ...defender.status } };
  const msgs = [`${att.name} usa ${move.name}!`];
  const hits = move.effect === "multi" ? rand(2, 3) : 1;
  let total = 0;
  for (let i = 0; i < hits; i++) {
    const { dmg, mult, crit } = calcDamage(att, def, move);
    const real = Math.min(def.hp, Math.round(dmg / (hits > 1 ? 1.6 : 1)));
    def.hp -= real;
    total += real;
    if (i === 0) {
      if (crit) msgs.push("Colpo critico!");
      if (mult > 1) msgs.push("È superefficace!");
      if (mult < 1) msgs.push("Non è molto efficace...");
    }
  }
  if (hits > 1) msgs.push(`Colpisce ${hits} volte!`);
  if (def.status.guard) { def.status.guard = false; msgs.push(`${def.name} para parte del colpo!`); }
  att.status.talisman = false;
  switch (move.effect) {
    case "drain":
    case "heal": { const h = sustainHealing(att, total); att.hp += h; msgs.push(`${move.name} recupera ${h} HP per ${att.name}!`); break; }
    case "burn": if (def.hp > 0 && !def.status.burn && chance(70)) { def.status.burn = 3; msgs.push(`${def.name} sta bruciando!`); } break;
    case "weaken": if (def.hp > 0 && def.status.atkMod > -3) { def.status.atkMod -= 1; msgs.push(`L'ATK di ${def.name} diminuisce!`); } break;
    case "shatter": if (def.hp > 0 && def.status.defMod > -3) { def.status.defMod -= 1; msgs.push(`La DIF di ${def.name} diminuisce!`); } break;
    case "charge": if (att.status.atkMod < 3) { att.status.atkMod += 1; msgs.push(`L'ATK di ${att.name} aumenta!`); } break;
    case "guard": att.status.guard = true; msgs.push(`${att.name} si prepara a parare!`); break;
    case "recoil": { const r = Math.min(att.hp - 1, Math.round(total * 0.2)); if (r > 0) { att.hp -= r; msgs.push(`${att.name} subisce ${r} danni di contraccolpo!`); } break; }
    default: break;
  }
  if (def.hp <= 0) { def.hp = 0; msgs.push(`${def.name} è KO!`); }
  return { att, def, msgs };
};

export const applyBurn = (p) => {
  if (!p.status.burn || p.hp <= 0) return { p, msg: null };
  const d = Math.max(1, Math.round(p.maxHp * 0.07));
  const q = { ...p, hp: Math.max(0, p.hp - d), status: { ...p.status, burn: p.status.burn - 1 } };
  return { p: q, msg: `${p.name} soffre per le fiamme (-${d})!${q.hp === 0 ? ` ${p.name} è KO!` : ""}` };
};

export const turnOrder = (a, b) => {
  const pa = a.move.effect === "priority" ? 1 : 0;
  const pb = b.move.effect === "priority" ? 1 : 0;
  if (pa !== pb) return pa > pb ? "player" : "enemy";
  if (a.spd === b.spd) return chance(50) ? "player" : "enemy";
  return a.spd > b.spd ? "player" : "enemy";
};

export const resetBattleStatus = (team) => team.map((p) => ({ ...p, status: freshStatus() }));

// ---------- Fusion ----------
export const fusePlayers = (a, b, moveFrom) => {
  if (!a || !b || a.uid === b.uid || a.fused || b.fused || !["a", "b"].includes(moveFrom)) {
    throw new Error("Seleziona due giocatori diversi non ancora fusi e una tecnica valida.");
  }
  const src = moveFrom === "b" ? b : a;
  const first = a.name.split(" ")[0];
  const last = b.name.split(" ").slice(-1)[0];
  const lvl = Math.max(a.level, b.level);
  const p = {
    uid: uid(), baseId: `${a.baseId}+${b.baseId}`, name: `${first} ${last}`, element: src.element, role: a.role, tier: Math.max(a.tier, b.tier), move: { ...src.move },
    parentVersionIds: [resolveVersion(a.versionId || a.baseId)?.versionId ?? null, resolveVersion(b.versionId || b.baseId)?.versionId ?? null],
    level: lvl, xp: 0, fused: true, status: freshStatus(),
    base: { hp: Math.round((a.base.hp + b.base.hp) / 2 * 1.15), atk: Math.round((a.base.atk + b.base.atk) / 2 * 1.15), def: Math.round((a.base.def + b.base.def) / 2 * 1.15), spd: Math.round((a.base.spd + b.base.spd) / 2 * 1.15) },
    bonus: { hp: a.bonus.hp + b.bonus.hp, atk: a.bonus.atk + b.bonus.atk, def: a.bonus.def + b.bonus.def, spd: a.bonus.spd + b.bonus.spd },
    maxHp: 0, hp: 0,
  };
  const s = recalcStats(p);
  return { ...s, hp: s.maxHp };
};

// ---------- Enemy / wave generation ----------
// Median of valid living members; invalid/all-KO states keep the raw level.
export const teamReferenceLevel = (team = []) => {
  const levels = (Array.isArray(team) ? team : []).filter(p => p && p.hp > 0 && Number.isInteger(p.level) && p.level >= 1).map(p => p.level).sort((a,b) => a-b);
  const n = levels.length;
  return n ? (levels[Math.floor((n-1)/2)] + levels[Math.floor(n/2)]) / 2 : null;
};
export const cappedEnemyLevel = (raw, team, rulesetId, kind = "ordinary") => {
  const reference = teamReferenceLevel(team);
  if (reference == null) return raw;
  const cap = ENEMY_GUARDRAILS[getRules(rulesetId).difficultyId][kind];
  return Math.min(raw, Math.floor(reference + cap));
};
// An offer already has a generated level: apply only the ceiling, never an Easy offset twice.
export const recruitChallengePlayer = (offer, run) => {
  const level = cappedEnemyLevel(offer.level, run.team, run.rulesetId, "challenge");
  return level === offer.level ? offer : recalcStats({ ...offer, level });
};
export const enemyLevel = (wave, rulesetId, rng = Math.random) => {
  const rules = getRules(rulesetId);
  const segment = rules.ordinaryEnemyLevelSegments?.filter(s => wave >= s.fromWave).at(-1);
  return Math.max(1, wave + (-1 + Math.floor(rng() * 4)) + (segment?.offset ?? rules.ordinaryEnemyLevelOffset));
};

export const randomRosterId = (maxTier, exclude = [], rng = Math.random) => {
  const pool = ROSTER.filter((r) => r.tier <= maxTier && !exclude.includes(r.id));
  const rows = pool.map(player => ({ player, weight: RARITIES[rarityIdForVersion(resolveVersion(player.id))].selectionWeight }));
  return weightedPick(rows, rng)?.player.id;
};

export const tierForWave = (wave) => (wave < 8 ? 1 : wave < 18 ? 2 : 3);

const generateWaveNode = (run, rng, cursor) => {
  const wave = run.wave;
  const pickOpponent = (tier, exclude = []) => selectEncounterVersion(run.scenarioState.id, wave, tier, exclude, rng, run.temporaryModifiers)?.versionId;
  const spawn = (id, level) => createPlayer(id, level, cursor.uid("encounter"));
  const boss = BOSSES[wave];
  if (boss) {
    const rules = getRules(run.rulesetId);
    const rawLevel = wave + (rules.checkpoints[wave]?.levelOffset ?? rules.defaultBossLevelOffset);
    const level = cappedEnemyLevel(rawLevel, run.team, run.rulesetId, "boss");
    return { type: "battle", kind: "boss", teamName: boss.team, intro: boss.intro, enemies: boss.ids.map((id) => spawn(id, level)) };
  }
  const cadenceOffset = hashSeed(run.seed) % 3;
  const eventDue = wave > 1 && (wave + cadenceOffset) % 3 === 0 && wave - (run.lastEventWave || -10) >= 2;
  const event = eventDue ? selectEvent(run, getScenario(run.scenarioState.id), rng) : null;
  if (event) return { type: "event", eventId: event.eventId };
  const roll = rng() * 100;
  if (wave === 1 || roll < 55) {
    const solo = rng() * 100 < 60;
    if (solo) return { type: "battle", kind: "wild", enemies: [spawn(pickOpponent(tierForWave(wave)), cappedEnemyLevel(enemyLevel(wave, run.rulesetId, rng), run.team, run.rulesetId))] };
    const n = wave < 5 ? 2 : 2 + Math.floor(rng() * 2);
    const ids = [];
    while (ids.length < n) ids.push(pickOpponent(tierForWave(wave), ids));
    return { type: "battle", kind: "team", teamName: TEAM_NAMES[Math.floor(rng() * TEAM_NAMES.length)], enemies: ids.map((id) => spawn(id, cappedEnemyLevel(enemyLevel(wave, run.rulesetId, rng), run.team, run.rulesetId))) };
  }
  if (roll < 70) return { type: "recruit", player: spawn(pickOpponent(tierForWave(wave) + (rng() * 100 < 20 ? 1 : 0)), Math.max(1, wave - 1)), price: 60 + wave * 4 };
  if (roll < 85) return { type: "shop", stock: generateShop(wave, rng) };
  return { type: "training" };
};

// Scenario is selected once per segment and returned for atomic persistence with the pending node.
export const generateWave = (run, rngOverride = null) => {
  if (run.pending) return run.pending; // Never reroll an already persisted encounter.
  const cursor = createRunRandomCursor(run);
  const rng = rngOverride || cursor.next;
  const scenarioState = scenarioForWave(normalizeScenarioState(run.scenarioState, run.wave), run.wave, tierForWave(run.wave), rng);
  return { ...generateWaveNode({ ...run, scenarioState }, rng, cursor), scenarioState, ...cursor.patch() };
};

export const generateShop = (wave, rng = Math.random) => {
  const ids = [];
  while (ids.length < 4) { const id = SHOP_POOL[Math.floor(rng() * SHOP_POOL.length)]; if (!ids.includes(id)) ids.push(id); }
  return ids.map((id) => ({ id, price: Math.round(ITEMS[id].price * (1 + wave * 0.01)) }));
};

export const generateRewards = (rng = Math.random) => {
  const out = [];
  const pool = [...REWARD_POOL];
  while (out.length < 3 && pool.length) {
    const total = pool.reduce((s, r) => s + r.w, 0);
    let x = rng() * total;
    const idx = pool.findIndex((r) => (x -= r.w) < 0);
    out.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  return out;
};

export const enemiesForEffect = (eff, wave, run, rng = Math.random, uidFactory = null) => {
  const adjustment = run ? ENEMY_GUARDRAILS[getRules(run.rulesetId).difficultyId].challengeOffset : 0;
  const raw = Math.max(1, wave + (eff.levelBonus || 0) + adjustment);
  const level = run ? cappedEnemyLevel(raw, run.team, run.rulesetId, "challenge") : raw;
  const spawn = id => createPlayer(id, level, uidFactory ? uidFactory("event") : undefined);
  if (eff.versionIds || eff.ids) return (eff.versionIds || eff.ids).map(spawn);
  const candidates = scenarioPool(run?.scenarioState?.id, wave, tierForWave(wave), [], run?.temporaryModifiers)
    .filter(row => !eff.teamTags?.length || row.version.teamTags.some(tag => eff.teamTags.includes(tag)));
  const ids = [];
  while (ids.length < (eff.count || 1) && candidates.some(row => !ids.includes(row.version.versionId))) {
    const available = candidates.filter(row => !ids.includes(row.version.versionId));
    ids.push(weightedPick(available, rng).version.versionId);
  }
  if (!ids.length) ids.push(randomRosterId(tierForWave(wave), [], rng));
  return ids.map(spawn);
};

// ---------- Run helpers ----------
export const newRun = (starterIds, difficultyId = "normal", requestedSeed = createRunSeed()) => {
  const startedAt = Date.now();
  const cursor = createRunRandomCursor({ seed: requestedSeed, startedAt });
  const team = starterIds.map(id => createPlayer(id, 3, cursor.uid("starter")));
  const scenarioState = scenarioForWave(null, 1, tierForWave(1), cursor.next);
  return normalizeRun({
    ...cursor.patch(), scenarioState, difficultyId, rulesetId: DIFFICULTIES[difficultyId].rulesetId,
    wave: 1, team, items: { barretta: 2 }, money: 100,
    stats: { wins: 0, recruits: 0, fusions: 0, glory: 0 }, seenEvents: [], eventHistory: {}, storyFlags: {},
    temporaryModifiers: [], lastEventWave: null, pending: null, fischietto: false, startedAt,
  });
};

export const resolveActiveUid = (team, activeUid) =>
  team.find((p) => p.uid === activeUid && p.hp > 0)?.uid || team.find((p) => p.hp > 0)?.uid || null;

export const normalizeRun = (run) => {
  if (!run) return null;
  const rulesetId = run.rulesetId || DIFFICULTIES[run.difficultyId || "normal"]?.rulesetId || DEFAULT_RULESET;
  const rules = getRules(rulesetId);
  const randomState = normalizeRandomState(run);
  return { ...run, ...randomState, scenarioState: normalizeScenarioState(run.scenarioState, run.wave), team: run.team.map(withPlayerIdentity), saveVersion: 2, rulesetId, difficultyId: rules.difficultyId,
    rulesetVersion: run.rulesetVersion ?? rules.version,
    seenEvents: Array.isArray(run.seenEvents) ? run.seenEvents : [],
    eventHistory: run.eventHistory && typeof run.eventHistory === "object" ? run.eventHistory : {},
    storyFlags: run.storyFlags && typeof run.storyFlags === "object" ? run.storyFlags : {},
    temporaryModifiers: Array.isArray(run.temporaryModifiers) ? run.temporaryModifiers.filter(modifier => modifier && modifier.remainingWaves > 0) : [],
    lastEventWave: Number.isInteger(run.lastEventWave) ? run.lastEventWave : null,
    activeUid: resolveActiveUid(run.team, run.activeUid) };
};

export const advanceRunWave = run => normalizeRun({
  ...run,
  wave: run.wave + 1,
  pending: null,
  temporaryModifiers: (run.temporaryModifiers || []).map(modifier => modifier.appliedWave === run.wave
    ? modifier
    : { ...modifier, remainingWaves: modifier.remainingWaves - 1 }).filter(modifier => modifier.remainingWaves > 0),
});

export const playtestSummary = (run) => ({
  seed: run.seed,
  difficulty: DIFFICULTIES[getRules(run.rulesetId).difficultyId].label,
  wave: run.wave, wins: run.stats.wins, recruits: run.stats.recruits, fusions: run.stats.fusions,
  averageLevel: run.team.length ? run.team.reduce((sum, p) => sum + p.level, 0) / run.team.length : 0,
  maxLevel: Math.max(0, ...run.team.map((p) => p.level)),
  bossReached: run.pending?.kind === "boss" ? run.pending.teamName : null,
  bossDefeated: run.stats.lastBossDefeated || null,
});

export const canReleasePlayer = (team, uid) => team.some((p) => p.uid !== uid && p.hp > 0);

export const xpProgress = (p) => ({
  level: p.level, xp: p.xp, required: xpForLevel(p.level),
  percent: Math.min(100, Math.max(0, p.xp / xpForLevel(p.level) * 100)),
});

const totalXp = (p) => {
  let total = p.xp;
  for (let level = 1; level < p.level; level++) total += xpForLevel(level);
  return total;
};

export const reportXpChanges = (before, after, source) => ({
  source,
  rows: after.map((p) => {
    const old = before.find((q) => q.uid === p.uid) || p;
    const total = Math.max(0, totalXp(p) - totalXp(old));
    return { uid: p.uid, name: p.name, before: xpProgress(old), after: xpProgress(p), total,
      activeXp: 0, benchXp: 0, travelXp: source === "travel" ? total : 0,
      otherXp: source === "node" ? total : 0, koCombat: false };
  }),
});

export const mergeXpReports = (previous, next) => {
  if (!previous) return next;
  if (!next) return previous;
  const rows = previous.rows.map((row) => ({ ...row }));
  for (const row of next.rows) {
    const index = rows.findIndex((p) => p.uid === row.uid);
    if (index < 0) { rows.push(row); continue; }
    const old = rows[index];
    rows[index] = { ...row, before: old.before, koCombat: old.koCombat || row.koCombat };
    for (const key of ["total", "activeXp", "benchXp", "travelXp", "otherXp"]) rows[index][key] = old[key] + row[key];
  }
  return { source: next.source, rows };
};

export const grantCombatXp = (team, activeUid, defeatedLevel, boss = false, rulesetId) => {
  const rules = getRules(rulesetId);
  // Round the full award first, then the bench share, including boss encounters.
  const full = Math.round((18 + defeatedLevel * 6) * rules.combatXpMultiplier * (boss ? rules.bossXpMultiplier : 1));
  // Integer percentage avoids 45 * 0.7 becoming 31.499999999999996 in JS.
  const bench = Math.round(full * (rules.benchXpShare * 100) / 100);
  const updated = team.map((p) => p.hp === 0 ? p : gainXp(p, p.uid === activeUid ? full : bench).player);
  const report = reportXpChanges(team, updated, "combat");
  report.rows = report.rows.map((row, i) => ({ ...row,
    activeXp: team[i].uid === activeUid ? row.total : 0,
    benchXp: team[i].uid !== activeUid ? row.total : 0,
    benchPercent: rules.benchXpShare * 100, koCombat: team[i].hp === 0,
  }));
  return { team: updated, report };
};

// Per-enemy XP is provisional until the battle result. Losing discards only this battle's growth.
export const settleCombatProgression = (result, initialTeam, finalTeam, report) => {
  if (result !== "lose") return { team: finalTeam, report: finishCombatReport(finalTeam, report) };
  const before = new Map(initialTeam.map(p => [p.uid, p]));
  const team = finalTeam.map(p => {
    const old = before.get(p.uid);
    if (!old) throw new Error("Missing battle-start player for progression rollback");
    const restored = recalcStats({ ...p, level: old.level, xp: old.xp });
    // Keep real combat damage/KO and item bonuses, not the healed HP from recalculation.
    return { ...restored, hp: Math.min(p.hp, restored.maxHp) };
  });
  return { team, report: finishCombatReport(team, reportXpChanges(team, team, "combat")) };
};

export const finishCombatReport = (team, report) => {
  const summary = report || reportXpChanges(team, team, "combat");
  return { ...summary, rows: summary.rows.map((row) => {
    const p = team.find((member) => member.uid === row.uid);
    return p ? { ...row, after: xpProgress(p), koCombat: row.koCombat || p.hp === 0 } : row;
  }) };
};

// Call only on resolution. Save the result atomically with the wave advance.
export const completeNonCombatNode = (run) => {
  const pending = run.pending;
  if (!pending || !["shop", "event", "training", "recruit"].includes(pending.type)
      || pending.context?.after === "rewards" || pending.progression?.hadCombat
      || run.lastProgression?.wave === run.wave) return run;
  const hadOwnXp = pending.progression?.hadOwnXp
    || pending.result?.effects?.some((effect) => effect.type === "xp" && effect.amt > 0);
  const previous = pending.progression?.report || null;
  const team = hadOwnXp ? run.team : run.team.map((p) => p.hp > 0 ? gainXp(p, getRules(run.rulesetId).travelXp).player : p);
  const report = hadOwnXp ? previous : mergeXpReports(previous, reportXpChanges(run.team, team, "travel"));
  return normalizeRun({ ...run, team, lastProgression: { wave: run.wave, report } });
};

export const fuseRunPlayers = (run, a, b, moveFrom) => {
  if (!(run.items.cuneo > 0)) throw new Error("Serve un Cuneo DNA.");
  const fused = fusePlayers(run.team[a], run.team[b], moveFrom);
  const activeUid = [run.team[a].uid, run.team[b].uid].includes(run.activeUid) ? fused.uid : run.activeUid;
  const team = run.team.filter((_, i) => i !== a && i !== b);
  team.splice(Math.min(a, b), 0, fused);
  return normalizeRun({ ...run, team, activeUid, items: removeItem(run.items, "cuneo"), stats: { ...run.stats, fusions: run.stats.fusions + 1 } });
};

export const applyEventDamage = (p, pct) => ({
  ...p, hp: p.hp === 0 ? 0 : Math.max(1, p.hp - Math.round(p.maxHp * pct / 100)),
});

const eventTargets = (run, effect, transform) => run.team.map(player => {
  const matches = !effect.target || effect.target === "all"
    || (effect.target === "active" && player.uid === run.activeUid)
    || (effect.target === "element" && player.element === effect.element);
  return matches ? transform(player) : player;
});

export function chooseRunEvent(run, event, choiceIndex) {
  const choice = event?.choices?.[choiceIndex];
  if (!choice || (choice.cost && run.money < choice.cost)) throw new Error("Scelta evento non disponibile.");
  const cursor = createRunRandomCursor(run);
  const result = resolveEventChoice(event, choiceIndex, cursor.next);
  return normalizeRun({ ...run, ...cursor.patch(), pending: { ...run.pending, choiceIndex, result } });
}

export function applyRunEventOutcome(run, event, result) {
  if (!event || !result || run.pending?.eventId !== event.eventId) throw new Error("Esito evento non valido.");
  result = normalizeEventResult(result);
  const cursor = createRunRandomCursor(run);
  let next = { ...run, items: { ...run.items }, storyFlags: { ...run.storyFlags }, eventHistory: { ...run.eventHistory } };
  let transition = null;
  for (const effect of result.effects) {
    switch (effect.type) {
      case "healTeam":
        next.team = eventTargets(next, effect, player => player.hp > 0 ? { ...player, hp: Math.min(player.maxHp, player.hp + Math.round(player.maxHp * effect.percent / 100)) } : player);
        break;
      case "damageTeam":
        next.team = eventTargets(next, effect, player => applyEventDamage(player, effect.percent));
        break;
      case "grantCurrency":
        next.money = Math.max(0, next.money + effect.amount);
        break;
      case "grantItem":
        next.items = addItem(next.items, effect.itemId, effect.quantity || 1);
        break;
      case "grantXp":
        next.team = eventTargets(next, effect, player => gainXp(player, effect.amount).player);
        break;
      case "adjustStat":
        next.team = eventTargets(next, effect, player => {
          const updated = recalcStats({ ...player, bonus: { ...player.bonus, [effect.stat]: player.bonus[effect.stat] + effect.amount } });
          return effect.stat === "hp" && player.hp > 0 ? { ...updated, hp: Math.min(updated.maxHp, updated.hp + effect.amount) } : updated;
        });
        break;
      case "setFlag":
        next.storyFlags[effect.flag] = effect.value;
        break;
      case "incrementFlag":
        next.storyFlags[effect.flag] = (Number(next.storyFlags[effect.flag]) || 0) + effect.amount;
        break;
      case "temporaryModifier":
        next.temporaryModifiers = [...(next.temporaryModifiers || []).filter(modifier => modifier.id !== effect.id), { ...effect, appliedWave: run.wave }];
        break;
      case "startEncounter":
        transition = { type: "battle", effect };
        break;
      case "offerRecruit":
        transition = { type: "recruit", effect };
        break;
      case "narrative":
        break;
      default:
        throw new Error(`Tipo esito evento sconosciuto: ${effect.type}`);
    }
  }
  const prior = next.eventHistory[event.eventId] || { count: 0 };
  next.eventHistory[event.eventId] = { count: prior.count + 1, lastWave: run.wave };
  next.seenEvents = next.seenEvents.includes(event.eventId) ? next.seenEvents : [...next.seenEvents, event.eventId];
  next.lastEventWave = run.wave;
  const progression = { hadOwnXp: result.effects.some(effect => effect.type === "grantXp" && effect.amount > 0), hadCombat: transition?.type === "battle", report: reportXpChanges(run.team, next.team, "node") };
  if (transition?.type === "battle") {
    const enemies = enemiesForEffect(transition.effect, run.wave, next, cursor.next, prefix => cursor.uid(prefix));
    next.pending = { type: "battle", kind: enemies.length === 1 ? "wild" : "team", teamName: event.title, enemies, progression, rewardItem: transition.effect.rewardItem };
  } else if (transition?.type === "recruit") {
    const ranks = { common: 0, uncommon: 1, rare: 2, special: 3 };
    const candidates = scenarioPool(next.scenarioState.id, next.wave, 4, [], next.temporaryModifiers)
      .filter(row => !transition.effect.teamTags?.length || row.version.teamTags.some(tag => transition.effect.teamTags.includes(tag)))
      .filter(row => !transition.effect.maxRarity || ranks[row.rarityId] <= ranks[transition.effect.maxRarity]);
    const selected = weightedPick(candidates, cursor.next);
    if (!selected) throw new Error(`Nessun reclutamento valido per ${event.eventId}`);
    const offer = createPlayer(selected.version.versionId, Math.max(1, run.wave), cursor.uid("recruit"));
    next.pending = { type: "recruit", context: { mode: "offer", offer, price: transition.effect.price ?? 0, after: "advance" }, progression };
  } else {
    next.pending = { ...next.pending, progression };
  }
  return normalizeRun({ ...next, ...cursor.patch() });
}

export const addItem = (items, id, n = 1) => ({ ...items, [id]: (items[id] || 0) + n });
export const removeItem = (items, id) => { const c = (items[id] || 0) - 1; const next = { ...items }; if (c <= 0) delete next[id]; else next[id] = c; return next; };

// New effects are data-driven; legacy handlers retain their historical semantics.
export const consumeRunItem = (run, id) => {
  const effect = ITEMS[id]?.effect;
  if (effect?.type !== "money" || !(run.items[id] > 0)) return run;
  return { ...run, money: run.money + effect.amount, items: removeItem(run.items, id) };
};
export const applyItemTo = (item, p) => {
  const effect = ITEMS[item]?.effect;
  if (effect && effect.type !== "legacy") {
    if (!canApplyItem(item, p)) return p;
    if (effect.type === "recovery") return { ...p, hp: Math.min(p.maxHp, p.hp + Math.round(p.maxHp * effect.hpShare)), status: { ...p.status, burn: effect.cureBurn ? 0 : p.status.burn } };
    if (effect.type === "stages") return { ...p, status: { ...p.status, atkMod: Math.max(-3, Math.min(3, p.status.atkMod + effect.atk)), defMod: Math.max(-3, Math.min(3, p.status.defMod + effect.def)) } };
    return p;
  }
  switch (item) {
    case "barretta": return { ...p, hp: Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.5)) };
    case "bibita": return { ...p, hp: p.maxHp, status: { ...p.status, burn: 0 } };
    case "pallone": return p.hp === 0 ? { ...p, hp: Math.round(p.maxHp * 0.5) } : p;
    case "fascia": return recalcStats({ ...p, bonus: { ...p.bonus, atk: p.bonus.atk + 5 } });
    case "guanti": return recalcStats({ ...p, bonus: { ...p.bonus, def: p.bonus.def + 5 } });
    case "scarpini": return recalcStats({ ...p, bonus: { ...p.bonus, spd: p.bonus.spd + 6 } });
    case "proteine": { const q = recalcStats({ ...p, bonus: { ...p.bonus, hp: p.bonus.hp + 15 } }); return { ...q, hp: p.hp === 0 ? 0 : Math.min(q.maxHp, q.hp + 15) }; }
    case "talismano": return { ...p, status: { ...p.status, talisman: true } };
    default: return p;
  }
};

export const canApplyItem = (item, p) => {
  const effect = ITEMS[item]?.effect;
  if (!effect || !p) return false;
  if (effect.type !== "legacy") {
    if (p.hp <= 0) return false;
    if (effect.type === "recovery") return p.hp < p.maxHp || (effect.cureBurn && p.status.burn > 0);
    if (effect.type === "stages") return (!effect.atk || (effect.atk > 0 ? p.status.atkMod < 3 : p.status.atkMod > -3))
      && (!effect.def || (effect.def > 0 ? p.status.defMod < 3 : p.status.defMod > -3));
    return false; // Run-target effects cannot be consumed on a player.
  }
  if (item === "pallone") return p.hp === 0;
  if (p.hp === 0) return false;
  if (item === "barretta" || item === "bibita") return p.hp < p.maxHp || (item === "bibita" && p.status.burn > 0);
  return true;
};

export const glory = (run) => run.stats.wins * 10 + (run.wave - 1) * 15 + run.stats.recruits * 20 + run.stats.fusions * 40;

export const isFinalWave = (wave) => wave >= FINAL_WAVE;
