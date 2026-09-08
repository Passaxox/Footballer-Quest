import { selectEncounterVersion, scenarioForWave, normalizeScenarioState } from "./scenarios";
import { CHARACTERS, PRIMARY_MOVES, resolveVersion, withPlayerIdentity } from "./catalog";
import { DEFAULT_RULESET, DIFFICULTIES, getRules, ENEMY_GUARDRAILS } from "./rules";
import { ROSTER, ELEMENTS, BOSSES, ITEMS, REWARD_POOL, EVENTS, FINAL_WAVE, TEAM_NAMES, SHOP_POOL } from "./data";

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

export const createPlayer = (id, level = 1) => {
  const version = resolveVersion(id);
  if (!version || version.kind !== "player") throw new Error("Versione giocatore non disponibile.");
  const p = {
    uid: uid(), baseId: version.legacyRosterId || version.versionId, characterId: version.characterId, versionId: version.versionId,
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
export const enemyLevel = (wave, rulesetId) => {
  const rules = getRules(rulesetId);
  const segment = rules.ordinaryEnemyLevelSegments?.filter(s => wave >= s.fromWave).at(-1);
  return Math.max(1, wave + rand(-1, 2) + (segment?.offset ?? rules.ordinaryEnemyLevelOffset));
};

export const randomRosterId = (maxTier, exclude = []) => {
  const pool = ROSTER.filter((r) => r.tier <= maxTier && !exclude.includes(r.id));
  return pick(pool).id;
};

const tierForWave = (wave) => (wave < 8 ? 1 : wave < 18 ? 2 : 3);

const generateWaveNode = (run) => {
  const wave = run.wave;
  const pickOpponent = (tier, exclude = []) => selectEncounterVersion(run.scenarioState.id, wave, tier, exclude)?.legacyRosterId;
  const boss = BOSSES[wave];
  if (boss) {
    const rules = getRules(run.rulesetId);
    const rawLevel = wave + (rules.checkpoints[wave]?.levelOffset ?? rules.defaultBossLevelOffset);
    const level = cappedEnemyLevel(rawLevel, run.team, run.rulesetId, "boss");
    return { type: "battle", kind: "boss", teamName: boss.team, intro: boss.intro, enemies: boss.ids.map((id) => createPlayer(id, level)) };
  }
  const roll = Math.random() * 100;
  if (wave === 1 || roll < 50) {
    const solo = chance(60);
    if (solo) return { type: "battle", kind: "wild", enemies: [createPlayer(pickOpponent(tierForWave(wave)), cappedEnemyLevel(enemyLevel(wave, run.rulesetId), run.team, run.rulesetId))] };
    const n = wave < 5 ? 2 : rand(2, 3);
    const ids = [];
    while (ids.length < n) ids.push(pickOpponent(tierForWave(wave), ids));
    return { type: "battle", kind: "team", teamName: pick(TEAM_NAMES), enemies: ids.map((id) => createPlayer(id, cappedEnemyLevel(enemyLevel(wave, run.rulesetId), run.team, run.rulesetId))) };
  }
  if (roll < 62) return { type: "recruit", player: createPlayer(pickOpponent(tierForWave(wave) + (chance(20) ? 1 : 0)), Math.max(1, wave - 1)), price: 60 + wave * 4 };
  if (roll < 74) return { type: "shop", stock: generateShop(wave) };
  if (roll < 84) return { type: "training" };
  const ev = pick(EVENTS.filter((e) => !(run.seenEvents || []).includes(e.id)) .length ? EVENTS.filter((e) => !(run.seenEvents || []).includes(e.id)) : EVENTS);
  return { type: "event", eventId: ev.id };
};

// Scenario is selected once per segment and returned for atomic persistence with the pending node.
export const generateWave = (run) => {
  if (run.pending) return run.pending; // Never reroll an already persisted encounter.
  const scenarioState = scenarioForWave(normalizeScenarioState(run.scenarioState, run.wave), run.wave, tierForWave(run.wave));
  return { ...generateWaveNode({ ...run, scenarioState }), scenarioState };
};

export const generateShop = (wave) => {
  const ids = [];
  while (ids.length < 4) { const id = pick(SHOP_POOL); if (!ids.includes(id)) ids.push(id); }
  return ids.map((id) => ({ id, price: Math.round(ITEMS[id].price * (1 + wave * 0.01)) }));
};

export const generateRewards = () => {
  const out = [];
  const pool = [...REWARD_POOL];
  while (out.length < 3 && pool.length) {
    const total = pool.reduce((s, r) => s + r.w, 0);
    let x = Math.random() * total;
    const idx = pool.findIndex((r) => (x -= r.w) < 0);
    out.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  return out;
};

export const enemiesForEffect = (eff, wave, run) => {
  const adjustment = run ? ENEMY_GUARDRAILS[getRules(run.rulesetId).difficultyId].challengeOffset : 0;
  const raw = Math.max(1, wave + (eff.levelBonus || 0) + adjustment);
  const level = run ? cappedEnemyLevel(raw, run.team, run.rulesetId, "challenge") : raw;
  if (eff.ids) return eff.ids.map((id) => createPlayer(id, level));
  const ids = [];
  while (ids.length < (eff.count || 1)) ids.push(randomRosterId(tierForWave(wave), ids));
  return ids.map((id) => createPlayer(id, level));
};

// ---------- Run helpers ----------
export const newRun = (starterIds, difficultyId = "normal") => normalizeRun({
  scenarioState: scenarioForWave(null, 1, tierForWave(1)),
  difficultyId, rulesetId: DIFFICULTIES[difficultyId].rulesetId,
  wave: 1, team: starterIds.map((id) => createPlayer(id, 3)), items: { barretta: 2 }, money: 100,
  stats: { wins: 0, recruits: 0, fusions: 0, glory: 0 }, seenEvents: [], pending: null, fischietto: false, startedAt: Date.now(),
});

export const resolveActiveUid = (team, activeUid) =>
  team.find((p) => p.uid === activeUid && p.hp > 0)?.uid || team.find((p) => p.hp > 0)?.uid || null;

export const normalizeRun = (run) => {
  if (!run) return null;
  const rulesetId = run.rulesetId || DIFFICULTIES[run.difficultyId || "normal"]?.rulesetId || DEFAULT_RULESET;
  const rules = getRules(rulesetId);
  return { ...run, scenarioState: normalizeScenarioState(run.scenarioState, run.wave), team: run.team.map(withPlayerIdentity), saveVersion: 2, rulesetId, difficultyId: rules.difficultyId,
    rulesetVersion: run.rulesetVersion ?? rules.version,
    activeUid: resolveActiveUid(run.team, run.activeUid) };
};

export const playtestSummary = (run) => ({
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

export const addItem = (items, id, n = 1) => ({ ...items, [id]: (items[id] || 0) + n });
export const removeItem = (items, id) => { const c = (items[id] || 0) - 1; const next = { ...items }; if (c <= 0) delete next[id]; else next[id] = c; return next; };

export const applyItemTo = (item, p) => {
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
  if (item === "pallone") return p.hp === 0;
  if (p.hp === 0) return false;
  if (item === "barretta" || item === "bibita") return p.hp < p.maxHp || (item === "bibita" && p.status.burn > 0);
  return true;
};

export const glory = (run) => run.stats.wins * 10 + (run.wave - 1) * 15 + run.stats.recruits * 20 + run.stats.fusions * 40;

export const isFinalWave = (wave) => wave >= FINAL_WAVE;
