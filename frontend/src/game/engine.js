import { getScenario, scenarioPool, selectEncounterVersion, scenarioForWave, normalizeScenarioState } from "./scenarios";
import { CHARACTERS, PRIMARY_MOVES, resolveVersion, withPlayerIdentity } from "./catalog";
import { DEFAULT_RULESET, DIFFICULTIES, getRules, ENEMY_GUARDRAILS } from "./rules";
import { ROSTER, ELEMENTS, BOSSES, BOSS_POOLS, ITEMS, ITEM_CLASSES, ITEM_FAMILIES, ITEM_FAMILY_PRESENTATION, isTargetItem, REWARD_POOL, FINAL_WAVE, TEAM_NAMES, SHOP_POOL } from "./data";
import { getRunEvent, normalizeEventResult, resolveEventChoice, selectEvent, weightedPick } from "./events";
import { createRunRandomCursor, createRunSeed, hashSeed, normalizeRandomState } from "./runRandom";
import { RARITIES, rarityIdForVersion } from "./rarity";
import { routeEntry, selectNodeArchetype } from "./routeDeck";
import { activeSynergies, synergyCritBonus, synergyDamageTakenMultiplier, synergySpeedBonus } from "./synergies";
import { createSegment, isSegmentCheckpoint, normalizeSegmentState } from "./segment";
import { generateRouteChoices, getRouteById } from "./routeChoices";
import { selectMiniboss } from "./minibosses";

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

export const calcDamage = (att, def, move, options = {}) => {
  const atk = att.atk * modMult(att.status.atkMod);
  const dfn = def.def * modMult(def.status.defMod);
  const mult = effectiveTypeMultiplier(att, def, move);
  const critBase = move.effect === "crit" ? 30 : 8;
  const critBonus = options?.attackerTeam ? synergyCritBonus(options.attackerTeam) : 0;
  const crit = chance(critBase + critBonus);
  const stab = move.element === att.element ? 1.1 : 1;
  let dmg = (((2 * att.level) / 5 + 2) * move.power * atk / dfn) / 9 + 2;
  dmg *= mult * stab * (0.88 + Math.random() * 0.12) * (crit ? 1.5 : 1);
  if (options?.firstStrike && options?.hasStendardo) dmg *= 1.2;
  if (options?.isBoss) {
    if (options?.bossBonusAttacker) dmg *= 1.1;
    if (options?.bossBonusDefender) dmg *= 0.9;
  }
  if (def.status.guard) dmg *= 0.5;
  if (options?.defenderTeam) {
    dmg *= synergyDamageTakenMultiplier(options.defenderTeam);
  }
  return { dmg: Math.max(1, Math.round(dmg)), mult, crit };
};

// Executes one attack; returns updated {att, def, messages}
export const performAttack = (attacker, defender, options = {}) => {
  const move = attacker.move;
  let att = { ...attacker, status: { ...attacker.status } };
  let def = { ...defender, status: { ...defender.status } };
  const msgs = [`${att.name} usa ${move.name}!`];
  if (options?.firstStrike && options?.hasStendardo) {
    msgs.push("Stendardo Tattico potenzia il primo assalto (+20% potenza)!");
    options.onTriggerUsed?.("stendardo");
  }
  const hits = move.effect === "multi" ? rand(2, 3) : 1;
  let total = 0;
  for (let i = 0; i < hits; i++) {
    const { dmg, mult, crit } = calcDamage(att, def, move, options);
    let real = Math.min(def.hp, Math.round(dmg / (hits > 1 ? 1.6 : 1)));
    if (def.hp - real <= 0 && options?.hasCavigliera) {
      real = Math.max(0, def.hp - 1);
      options.onTriggerUsed?.("cavigliera");
      msgs.push(`Cavigliera Protettiva salva ${def.name} dal KO (1 HP rimasto)!`);
    }
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
    case "burn":
      if (def.hp > 0 && !def.status.burn && chance(70)) {
        if (options?.hasBalsamo) {
          options.onTriggerUsed?.("balsamo");
          msgs.push(`Balsamo Rinfrescante previene la bruciatura di ${def.name}!`);
        } else {
          def.status.burn = 3;
          msgs.push(`${def.name} sta bruciando!`);
        }
      }
      break;
    case "weaken": if (def.hp > 0 && def.status.atkMod > -3) { def.status.atkMod -= 1; msgs.push(`L'ATK di ${def.name} diminuisce!`); } break;
    case "shatter": if (def.hp > 0 && def.status.defMod > -3) { def.status.defMod -= 1; msgs.push(`La DIF di ${def.name} diminuisce!`); } break;
    case "charge": if (att.status.atkMod < 3) { att.status.atkMod += 1; msgs.push(`L'ATK di ${att.name} aumenta!`); } break;
    case "guard": att.status.guard = true; msgs.push(`${att.name} si prepara a parare!`); break;
    case "recoil": { const r = Math.min(att.hp - 1, Math.round(total * 0.2)); if (r > 0) { att.hp -= r; msgs.push(`${att.name} subisce ${r} danni di contraccolpo!`); } break; }
    default: break;
  }
  if (def.hp > 0 && def.hp < def.maxHp * 0.3 && options?.hasCerotto) {
    const healAmt = Math.min(def.maxHp - def.hp, Math.round(def.maxHp * 0.25));
    if (healAmt > 0) {
      def.hp += healAmt;
      options.onTriggerUsed?.("cerotto");
      msgs.push(`Cerotto d'Emergenza soccorre ${def.name} (+${healAmt} HP)!`);
    }
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

export const turnOrder = (a, b, playerTeam = null) => {
  const pa = a.move.effect === "priority" ? 1 : 0;
  const pb = b.move.effect === "priority" ? 1 : 0;
  if (pa !== pb) return pa > pb ? "player" : "enemy";
  const aSpd = a.spd + (playerTeam ? synergySpeedBonus(playerTeam) : 0);
  if (aSpd === b.spd) return chance(50) ? "player" : "enemy";
  return aSpd > b.spd ? "player" : "enemy";
};

export const resetBattleStatus = (team) => team.map((p) => ({ ...p, status: freshStatus() }));
const clampStage = value => Math.max(-3, Math.min(3, Number(value) || 0));
export const normalizeNodeModifiers = modifiers => Object.fromEntries(Object.entries(modifiers && typeof modifiers === "object" ? modifiers : {})
  .filter(([, value]) => value && typeof value === "object")
  .map(([uid, value]) => [uid, { atkMod: clampStage(value.atkMod), defMod: clampStage(value.defMod) }])
  .filter(([, value]) => value.atkMod || value.defMod));
export const applyNodeModifiers = (team, modifiers = {}) => {
  const norm = normalizeNodeModifiers(modifiers);
  const teamMod = norm.team || { atkMod: 0, defMod: 0 };
  return resetBattleStatus(team).map(player => {
    const playerMod = norm[player.uid] || { atkMod: 0, defMod: 0 };
    const atkMod = clampStage(teamMod.atkMod + playerMod.atkMod);
    const defMod = clampStage(teamMod.defMod + playerMod.defMod);
    return (atkMod || defMod) ? { ...player, status: { ...player.status, atkMod, defMod } } : player;
  });
};
export const addNodeStageModifier = (modifiers, uid, effect) => {
  const normalized = normalizeNodeModifiers(modifiers);
  const current = normalized[uid] || { atkMod: 0, defMod: 0 };
  const next = {
    atkMod: clampStage(current.atkMod + (effect.atk || 0)),
    defMod: clampStage(current.defMod + (effect.def || 0)),
  };
  return normalizeNodeModifiers({ ...normalized, [uid]: next });
};

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

// Rarity weights, scenario context and enemy-level guardrails control early danger.
// A high-tier CharacterVersion is therefore possible from wave one, but remains very unlikely.
export const tierForWave = () => 4;

export const getBossForWave = (run, wave, rng = Math.random) => {
  const pool = BOSS_POOLS[wave];
  if (!pool || !pool.length) return null;
  const isDynamic = Boolean(
    run?.dynamicRoute ||
    run?.flexibleRoute ||
    run?.routeBranch ||
    run?.storyFlags?.["route-freedom"] ||
    run?.storyFlags?.["flexible-routes"] ||
    run?.storyFlags?.["bold-route"] ||
    run?.scenarioState?.bossPool
  );
  if (!isDynamic) {
    return BOSSES[wave] || pool[0];
  }
  const scenarioId = run?.scenarioState?.id;
  const matching = pool.filter(b => b.scenarioId === scenarioId || b.id === scenarioId || (b.teamTags && run?.scenarioState?.allowedTeamTags?.some(t => b.teamTags.includes(t))));
  const candidatePool = matching.length ? matching : pool;
  const index = Math.floor(rng() * candidatePool.length);
  return candidatePool[index] || pool[0];
};

const generateWaveNode = (run, rng, cursor) => {
  const wave = run.wave;
  const pickOpponent = (tier, exclude = []) => selectEncounterVersion(run.scenarioState.id, wave, tier, exclude, rng, run.temporaryModifiers)?.versionId;
  const spawn = (id, level) => createPlayer(id, level, cursor.uid("encounter"));
  const boss = getBossForWave(run, wave, rng);
  if (boss) {
    const rules = getRules(run.rulesetId);
    const rawLevel = wave + (rules.checkpoints[wave]?.levelOffset ?? rules.defaultBossLevelOffset);
    const level = cappedEnemyLevel(rawLevel, run.team, run.rulesetId, "boss");
    const enemies = boss.ids.map((id, index) => {
      const p = spawn(id, level);
      if (boss.captainId ? (p.baseId === boss.captainId || p.versionId === boss.captainId || p.characterId === boss.captainId) : index === 0) {
        p.isCaptain = true;
      }
      return p;
    });
    return { type: "battle", kind: "boss", teamName: boss.team, intro: boss.intro, enemies };
  }

  // Miniboss Checkpoint: Segment terminal when not facing a major boss
  if (run.segmentState && isSegmentCheckpoint(run.segmentState)) {
    const miniboss = selectMiniboss(run, wave, rng);
    const rawLevel = wave + 1;
    const level = cappedEnemyLevel(rawLevel, run.team, run.rulesetId, "challenge");
    const enemies = miniboss.ids.map((id, index) => {
      const p = spawn(id, level);
      if (miniboss.captainId ? (p.baseId === miniboss.captainId || p.versionId === miniboss.captainId || p.characterId === miniboss.captainId) : index === 0) {
        p.isCaptain = true;
      }
      return p;
    });
    return {
      type: "battle",
      kind: "miniboss",
      minibossId: miniboss.id,
      teamName: miniboss.team,
      intro: miniboss.intro,
      rewardItem: miniboss.rewardItem,
      bonusExpMultiplier: miniboss.bonusExpMultiplier || 1.25,
      enemies,
    };
  }

  const cadenceOffset = hashSeed(run.seed) % 3;
  const eventDue = wave > 1 && ((wave + cadenceOffset) % 3 === 0 || wave - (run.lastEventWave || -10) >= 3) && wave - (run.lastEventWave || -10) >= 2;
  const event = eventDue ? selectEvent(run, getScenario(run.scenarioState.id), rng) : null;
  if (event) return { type: "event", eventId: event.eventId };
  const archetype = selectNodeArchetype(run, rng);

  if (archetype.kind === "recovery" || archetype.id === "recovery") {
    return { type: "recovery", nodeArchetype: "recovery" };
  }

  if (archetype.kind === "elite" || archetype.id === "elite") {
    const n = wave < 10 ? 2 : 3;
    const ids = [];
    while (ids.length < n) ids.push(pickOpponent(tierForWave(wave), ids));
    const rawLvl = enemyLevel(wave, run.rulesetId, rng) + 1;
    const enemyLvl = cappedEnemyLevel(rawLvl, run.team, run.rulesetId, "challenge");
    const enemies = ids.map((id, index) => {
      const p = spawn(id, enemyLvl);
      if (index === 0) p.isCaptain = true;
      return p;
    });
    const eliteRewardPool = ["grinta", "tenuta", "equilibrio", "sigillo", "tessera", "barretta", "impacco"];
    const rewardItem = eliteRewardPool[Math.floor(rng() * eliteRewardPool.length)];
    return {
      type: "battle",
      kind: "elite",
      nodeArchetype: "elite",
      teamName: `Élite ${TEAM_NAMES[Math.floor(rng() * TEAM_NAMES.length)]}`,
      enemies,
      rewardItem,
      bonusExpMultiplier: 1.2,
    };
  }

  if (archetype.kind === "battle") {
    const solo = rng() * 100 < 60;
    if (solo) {
      const enemy = spawn(pickOpponent(tierForWave(wave)), cappedEnemyLevel(enemyLevel(wave, run.rulesetId, rng), run.team, run.rulesetId));
      enemy.isCaptain = true;
      return { type: "battle", kind: "wild", nodeArchetype: "duel", enemies: [enemy] };
    }
    // Encounter sizing according to AGENTS.md policy:
    // 1-3 standard, 4 rare (wave >= 15), 5-6 progression gated (wave >= 35)
    let n;
    const sizeRoll = rng();
    if (wave >= 35 && sizeRoll < 0.15) {
      n = 5;
    } else if (wave >= 15 && sizeRoll < 0.25) {
      n = 4;
    } else {
      n = wave < 5 ? 2 : (sizeRoll < 0.55 ? 2 : 3);
    }
    const ids = [];
    while (ids.length < n) ids.push(pickOpponent(tierForWave(wave), ids));
    const enemyLvl = cappedEnemyLevel(enemyLevel(wave, run.rulesetId, rng), run.team, run.rulesetId);
    const enemies = ids.map((id, index) => {
      const p = spawn(id, enemyLvl);
      if (index === 0) p.isCaptain = true;
      return p;
    });
    return { type: "battle", kind: "team", nodeArchetype: "squad", teamName: TEAM_NAMES[Math.floor(rng() * TEAM_NAMES.length)], enemies };
  }
  if (archetype.kind === "recruit") return { type: "recruit", nodeArchetype: archetype.id, player: spawn(pickOpponent(tierForWave(wave)), Math.max(1, wave - 1)), price: 60 + wave * 4 };
  if (archetype.kind === "shop") return { type: "shop", nodeArchetype: archetype.id, stock: generateShop(wave, rng) };
  return { type: "training", nodeArchetype: archetype.id };
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

export const ITEM_QUALITY_SCORES = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 4,
};

export const getItemQuality = (id) => {
  const item = ITEMS[id];
  return item ? (ITEM_QUALITY_SCORES[item.rarity] || 1) : 1;
};

const ITEMS_BY_RARITY = {
  COMMON: ["barretta", "impacco", "ghiaccio", "borraccia", "cerotto", "balsamo"],
  UNCOMMON: ["bibita", "fascia", "guanti", "scarpini", "proteine", "trofeo", "grinta", "tenuta", "buono", "pressing", "taccuino", "parastinchi", "cronometro", "pasto", "stendardo", "tessera"],
  RARE: ["pallone", "fischietto", "talismano", "azzardo", "muro", "equilibrio", "defibrillatore", "cavigliera", "sigillo"],
  EPIC: ["cuneo"],
};

const TIER_SLOT_DISTRIBUTIONS = {
  boss: [
    { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 1.0 },
    { COMMON: 0, UNCOMMON: 0.15, RARE: 0.60, EPIC: 0.25 },
    { COMMON: 0, UNCOMMON: 0.15, RARE: 0.60, EPIC: 0.25 },
  ],
  miniboss: [
    { COMMON: 0, UNCOMMON: 0, RARE: 0.85, EPIC: 0.15 },
    { COMMON: 0.05, UNCOMMON: 0.40, RARE: 0.45, EPIC: 0.10 },
    { COMMON: 0.05, UNCOMMON: 0.40, RARE: 0.45, EPIC: 0.10 },
  ],
  elite: [
    { COMMON: 0, UNCOMMON: 0.75, RARE: 0.25, EPIC: 0 },
    { COMMON: 0.15, UNCOMMON: 0.60, RARE: 0.25, EPIC: 0 },
    { COMMON: 0.15, UNCOMMON: 0.60, RARE: 0.25, EPIC: 0 },
  ],
  standard: [
    { COMMON: 0.65, UNCOMMON: 0.30, RARE: 0.05, EPIC: 0 },
    { COMMON: 0.60, UNCOMMON: 0.35, RARE: 0.05, EPIC: 0 },
    { COMMON: 0.55, UNCOMMON: 0.40, RARE: 0.05, EPIC: 0 },
  ],
};

export const generateRewards = (rng = Math.random, tier = "standard", run = null) => {
  const normTier = ["boss", "miniboss", "elite"].includes(tier) ? tier : "standard";
  const slotDist = TIER_SLOT_DISTRIBUTIONS[normTier] || TIER_SLOT_DISTRIBUTIONS.standard;
  const out = [];

  const recentOffers = new Set(run?.telemetry?.itemsOffered?.slice(-6) || []);
  const armedTriggers = run?.armedTriggers || {};
  const activeSegments = new Set([...(run?.activeNodeItems || []), ...(run?.nextSegmentNodeItems || [])]);
  const hasKo = Boolean(run?.team?.some(p => p.hp <= 0));
  const hasLowHp = Boolean(run?.team?.some(p => p.hp > 0 && p.hp / p.maxHp < 0.5));
  const currentRouteId = run?.segmentState?.routeId || run?.chosenRoutes?.slice(-1)[0] || "";

  for (let slot = 0; slot < 3; slot++) {
    const dist = slotDist[slot] || slotDist[0];
    const rRoll = rng();
    let cumulative = 0;
    let targetRarity = "COMMON";
    for (const [rarity, prob] of Object.entries(dist)) {
      cumulative += prob;
      if (rRoll <= cumulative) {
        targetRarity = rarity;
        break;
      }
    }

    const rarityPriority = [targetRarity, "RARE", "UNCOMMON", "COMMON", "EPIC"].filter(
      (r, idx, arr) => arr.indexOf(r) === idx
    );

    let chosenId = null;
    for (const curRarity of rarityPriority) {
      const candidates = (ITEMS_BY_RARITY[curRarity] || []).filter(id => !out.includes(id));
      if (!candidates.length) continue;

      const weightedCandidates = candidates.map(id => {
        const itemDef = ITEMS[id];
        let w = itemDef?.rewardWeight || 1;

        // 1. Trigger duplicate suppression: heavily suppress duplicate armed triggers
        if (itemDef?.family === ITEM_FAMILIES.TRIGGER && (armedTriggers[id] || 0) >= 1) {
          w *= 0.02;
        }

        // 2. Active segment duplicate suppression
        if (activeSegments.has(id)) {
          w *= 0.15;
        }

        // 3. Need-aware weighting: KO revives
        const isRevive = itemDef?.effect?.type === "revive" || id === "pallone" || id === "defibrillatore";
        if (isRevive) {
          w *= hasKo ? 2.5 : 0.2;
        }

        // 4. Need-aware weighting: Low HP recovery
        const isRecovery = itemDef?.tags?.includes("recovery") || itemDef?.effect?.type === "recovery";
        if (isRecovery && hasLowHp) {
          w *= 1.8;
        }

        // 5. Route bias
        if (currentRouteId.includes("commerciale") && (id === "cuneo" || id === "buono")) {
          w *= 2.0;
        } else if ((currentRouteId.includes("parco") || currentRouteId.includes("centro-sportivo")) && isRecovery) {
          w *= 1.6;
        } else if ((currentRouteId.includes("torre") || currentRouteId.includes("palestra")) && itemDef?.effect?.type === "permanentStat") {
          w *= 1.7;
        } else if (currentRouteId.includes("notturno") || currentRouteId.includes("alius")) {
          if (itemDef?.family === ITEM_FAMILIES.TRIGGER || itemDef?.family === ITEM_FAMILIES.SEGMENT) {
            w *= 1.5;
          }
        }

        // 6. Recent offers suppression
        if (recentOffers.has(id)) {
          w *= 0.25;
        }

        return { id, w: Math.max(0.01, w) };
      });

      const totalWeight = weightedCandidates.reduce((s, c) => s + c.w, 0);
      let roll = rng() * totalWeight;
      for (const cand of weightedCandidates) {
        roll -= cand.w;
        if (roll <= 0) {
          chosenId = cand.id;
          break;
        }
      }
      if (!chosenId) chosenId = weightedCandidates[weightedCandidates.length - 1].id;
      break;
    }

    if (chosenId && !out.includes(chosenId)) {
      out.push(chosenId);
    }
  }

  const allIds = Object.keys(ITEMS);
  while (out.length < 3) {
    const remaining = allIds.filter(id => !out.includes(id));
    if (!remaining.length) break;
    const pickIdx = Math.floor(rng() * remaining.length);
    out.push(remaining[pickIdx]);
  }

  return out;
};

export const getItemTargetPreview = (itemId, player) => {
  const item = ITEMS[itemId];
  if (!item || !player) return { valid: false, reason: "Invalido", diffs: [] };
  const valid = canApplyItem(itemId, player);
  if (!valid) {
    let reason = "Non selezionabile";
    if (player.hp === 0) {
      reason = ["pallone", "defibrillatore"].includes(itemId) ? "Rianimabile" : "Giocatore KO";
    } else {
      if (["pallone", "defibrillatore"].includes(itemId)) {
        reason = "Solo su giocatori KO";
      } else if (item.tags?.includes("recovery") && player.hp >= player.maxHp && (player.status?.burn || 0) === 0) {
        reason = "HP al massimo";
      }
    }
    return { valid: false, reason, diffs: [] };
  }

  const next = applyItemTo(itemId, player);
  const diffs = [];
  if (next.maxHp !== player.maxHp) {
    diffs.push({ stat: "maxHp", label: "HP MAX", before: player.maxHp, after: next.maxHp, diff: next.maxHp - player.maxHp });
  }
  if (next.hp !== player.hp) {
    diffs.push({ stat: "hp", label: "HP", before: player.hp, after: next.hp, max: next.maxHp, diff: next.hp - player.hp });
  }
  if (next.atk !== player.atk) {
    diffs.push({ stat: "atk", label: "ATK", before: player.atk, after: next.atk, diff: next.atk - player.atk });
  }
  if (next.def !== player.def) {
    diffs.push({ stat: "def", label: "DIF", before: player.def, after: next.def, diff: next.def - player.def });
  }
  if (next.spd !== player.spd) {
    diffs.push({ stat: "spd", label: "VEL", before: player.spd, after: next.spd, diff: next.spd - player.spd });
  }
  if ((player.status?.burn || 0) > 0 && (next.status?.burn || 0) === 0) {
    diffs.push({ stat: "burn", label: "Bruciatura", before: "Attiva", after: "Curata", diff: null });
  }
  if (!player.status?.guard && next.status?.guard) {
    diffs.push({ stat: "guard", label: "Parata", before: "No", after: "Attiva", diff: null });
  }

  const reason = player.hp === 0 ? "KO • Rianimabile" : "Target valido";
  return { valid: true, reason, diffs, after: next };
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
export const newRun = (starterIds, difficultyId = "normal", requestedSeed = createRunSeed(), options = {}) => {
  const startedAt = Date.now();
  const cursor = createRunRandomCursor({ seed: requestedSeed, startedAt });
  const team = starterIds.map(id => createPlayer(id, 3, cursor.uid("starter")));
  const scenarioState = scenarioForWave(null, 1, tierForWave(1), cursor.next);
  const dynamicRoute = options?.dynamicRoute !== undefined ? Boolean(options.dynamicRoute) : (options?.flexibleRoute !== undefined ? Boolean(options.flexibleRoute) : true);
  const initialRouteId = options?.routeId || "area-metropolitana";
  const segmentState = createSegment({ wave: 1, segmentState: null }, initialRouteId, cursor.next);
  return normalizeRun({
    ...cursor.patch(), scenarioState, difficultyId, rulesetId: DIFFICULTIES[difficultyId].rulesetId,
    wave: 1, team, items: {}, armedTriggers: { cerotto: 1 }, specialResources: { cuneo: 0 }, nextSegmentNodeItems: [],
    money: 100, dynamicRoute, segmentState, pendingRouteChoices: null,
    chosenRoutes: [initialRouteId],
    stats: { wins: 0, recruits: 0, fusions: 0, glory: 0 }, seenEvents: [], eventHistory: {}, storyFlags: {},
    temporaryModifiers: [], nodeModifiers: {}, activeNodeItems: [], routeHistory: [], telemetry: {
      itemsOffered: [], itemsChosen: [], temporaryItemsUsed: [], recruitsOffered: [], recruitsAcquired: [], versionsEncountered: [],
    },
    lastEventWave: null, pending: null, fischietto: false, startedAt,
  });
};

export const resolveActiveUid = (team, activeUid) =>
  team.find((p) => p.uid === activeUid && p.hp > 0)?.uid || team.find((p) => p.hp > 0)?.uid || null;

export const normalizeRun = (run) => {
  if (!run) return null;
  const rulesetId = run.rulesetId || DIFFICULTIES[run.difficultyId || "normal"]?.rulesetId || DEFAULT_RULESET;
  const rules = getRules(rulesetId);
  const randomState = normalizeRandomState(run);
  const dynamicRoute = Boolean(run.dynamicRoute || run.flexibleRoute || run.storyFlags?.["route-freedom"]);
  const segmentState = run.segmentState ? normalizeSegmentState(run.segmentState, run.wave) : null;
  return { ...run, ...randomState, scenarioState: normalizeScenarioState(run.scenarioState, run.wave), team: run.team.map(withPlayerIdentity), saveVersion: 2, rulesetId, difficultyId: rules.difficultyId,
    dynamicRoute,
    segmentState,
    pendingRouteChoices: Array.isArray(run.pendingRouteChoices) ? run.pendingRouteChoices : null,
    chosenRoutes: Array.isArray(run.chosenRoutes) ? run.chosenRoutes : [],
    rulesetVersion: run.rulesetVersion ?? rules.version,
    seenEvents: Array.isArray(run.seenEvents) ? run.seenEvents : [],
    eventHistory: run.eventHistory && typeof run.eventHistory === "object" ? run.eventHistory : {},
    storyFlags: run.storyFlags && typeof run.storyFlags === "object" ? run.storyFlags : {},
    temporaryModifiers: Array.isArray(run.temporaryModifiers) ? run.temporaryModifiers.filter(modifier => modifier && modifier.remainingWaves > 0) : [],
    nodeModifiers: normalizeNodeModifiers(run.nodeModifiers),
    activeNodeItems: Array.isArray(run.activeNodeItems) ? run.activeNodeItems.filter(Boolean) : [],
    nextSegmentNodeItems: Array.isArray(run.nextSegmentNodeItems) ? run.nextSegmentNodeItems.filter(Boolean) : [],
    items: run.items && typeof run.items === "object" ? { ...run.items } : {},
    armedTriggers: run.armedTriggers && typeof run.armedTriggers === "object"
      ? { ...run.armedTriggers }
      : Object.fromEntries(
          ["cerotto", "balsamo", "cavigliera", "stendardo"]
            .filter(id => (run.items?.[id] || 0) > 0)
            .map(id => [id, 1])
        ),
    specialResources: run.specialResources && typeof run.specialResources === "object"
      ? { ...run.specialResources }
      : { cuneo: run.items?.cuneo || 0 },
    routeHistory: Array.isArray(run.routeHistory) ? run.routeHistory.slice(-60) : [],
    telemetry: run.telemetry && typeof run.telemetry === "object" ? {
      itemsOffered: Array.isArray(run.telemetry.itemsOffered) ? run.telemetry.itemsOffered : [],
      itemsChosen: Array.isArray(run.telemetry.itemsChosen) ? run.telemetry.itemsChosen : [],
      temporaryItemsUsed: Array.isArray(run.telemetry.temporaryItemsUsed) ? run.telemetry.temporaryItemsUsed : [],
      recruitsOffered: Array.isArray(run.telemetry.recruitsOffered) ? run.telemetry.recruitsOffered : [],
      recruitsAcquired: Array.isArray(run.telemetry.recruitsAcquired) ? run.telemetry.recruitsAcquired : [],
      versionsEncountered: Array.isArray(run.telemetry.versionsEncountered) ? run.telemetry.versionsEncountered : [],
    } : { itemsOffered: [], itemsChosen: [], temporaryItemsUsed: [], recruitsOffered: [], recruitsAcquired: [], versionsEncountered: [] },
    lastEventWave: Number.isInteger(run.lastEventWave) ? run.lastEventWave : null,
    activeUid: resolveActiveUid(run.team, run.activeUid) };
};

export const advanceRunWave = run => {
  const cursor = createRunRandomCursor(run);
  const hasSegments = Boolean(run.segmentState);
  const atCheckpoint = hasSegments && isSegmentCheckpoint(run.segmentState);

  let nodeModifiers = run.nodeModifiers;
  let activeNodeItems = run.activeNodeItems;
  let segmentState = run.segmentState;
  let pendingRouteChoices = null;

  if (hasSegments) {
    if (atCheckpoint) {
      // Checkpoint reached: clear node modifiers and active node items at checkpoint boundary
      nodeModifiers = {};
      activeNodeItems = [];
      const nextWave = run.wave + 1;
      pendingRouteChoices = generateRouteChoices({ ...run, wave: nextWave }, 3, cursor.next);
      const defaultRoute = pendingRouteChoices[0] || getRouteById("area-metropolitana");
      segmentState = createSegment({ ...run, wave: nextWave, segmentState }, defaultRoute, cursor.next);

      // Activate any queued segment rewards for the next segment!
      if (Array.isArray(run.nextSegmentNodeItems) && run.nextSegmentNodeItems.length > 0) {
        for (const queuedId of run.nextSegmentNodeItems) {
          activeNodeItems.push(queuedId);
          const queuedItem = ITEMS[queuedId];
          if (queuedItem?.effect?.type === "stages" && (queuedItem.effect.atk || queuedItem.effect.def)) {
            nodeModifiers = addNodeStageModifier(nodeModifiers, "team", queuedItem.effect);
          }
        }
      }
    } else {
      // Internal step within segment: PERSIST node modifiers and active node items!
      segmentState = {
        ...segmentState,
        step: segmentState.step + 1,
      };
    }
  } else {
    // Backward compatibility for legacy tests without segmentState
    nodeModifiers = {};
    activeNodeItems = [];
  }

  return normalizeRun({
    ...run,
    ...cursor.patch(),
    wave: run.wave + 1,
    pending: null,
    nodeModifiers,
    activeNodeItems,
    nextSegmentNodeItems: atCheckpoint ? [] : (run.nextSegmentNodeItems || []),
    segmentState,
    pendingRouteChoices,
    routeHistory: [...(run.routeHistory || []), routeEntry(run)].filter(Boolean).slice(-60),
    temporaryModifiers: (run.temporaryModifiers || []).map(modifier => modifier.appliedWave === run.wave
      ? modifier
      : { ...modifier, remainingWaves: modifier.remainingWaves - 1 }).filter(modifier => modifier.remainingWaves > 0),
  });
};

export const playtestSummary = (run) => ({
  seed: run.seed,
  difficulty: DIFFICULTIES[getRules(run.rulesetId).difficultyId].label,
  wave: run.wave, wins: run.stats.wins, recruits: run.stats.recruits, fusions: run.stats.fusions,
  averageLevel: run.team.length ? run.team.reduce((sum, p) => sum + p.level, 0) / run.team.length : 0,
  maxLevel: Math.max(0, ...run.team.map((p) => p.level)),
  bossReached: run.pending?.kind === "boss" ? run.pending.teamName : null,
  bossDefeated: run.stats.lastBossDefeated || null,
  route: (run.routeHistory || []).map(entry => ({ wave: entry.wave, scenarioId: entry.scenarioId, archetype: entry.archetype, kind: entry.kind, teamName: entry.teamName, eventId: entry.eventId })),
  eventsSeen: [...(run.seenEvents || [])],
  itemsOffered: [...(run.telemetry?.itemsOffered || [])],
  itemsChosen: [...(run.telemetry?.itemsChosen || [])],
  temporaryItemsUsed: [...(run.telemetry?.temporaryItemsUsed || [])],
  recruitsOffered: [...(run.telemetry?.recruitsOffered || [])],
  recruitsAcquired: [...(run.telemetry?.recruitsAcquired || [])],
  versionsEncountered: [...(run.telemetry?.versionsEncountered || [])],
  synergies: activeSynergies(run.team).map(synergy => synergy.id),
  finalTeam: run.team.map(player => ({ versionId: player.versionId ?? null, level: player.level, ko: player.hp === 0 })),
  currency: run.money,
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
  if (!pending || !["shop", "event", "training", "recruit", "recovery"].includes(pending.type)
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
  const cuneoCount = (run.specialResources?.cuneo || run.items?.cuneo) || 0;
  if (cuneoCount <= 0) throw new Error("Serve un Cuneo DNA.");
  const fused = fusePlayers(run.team[a], run.team[b], moveFrom);
  const activeUid = [run.team[a].uid, run.team[b].uid].includes(run.activeUid) ? fused.uid : run.activeUid;
  const team = run.team.filter((_, i) => i !== a && i !== b);
  team.splice(Math.min(a, b), 0, fused);
  const nextResources = run.specialResources ? {
    ...run.specialResources,
    cuneo: Math.max(0, ((run.specialResources.cuneo || run.items?.cuneo) || 0) - 1),
  } : undefined;
  return normalizeRun({
    ...run,
    team,
    activeUid,
    items: run.items?.cuneo ? removeItem(run.items, "cuneo") : (run.items || {}),
    ...(nextResources ? { specialResources: nextResources } : {}),
    stats: { ...run.stats, fusions: run.stats.fusions + 1 },
  });
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
  let targetItemPending = null;
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
      case "grantItem": {
        const item = ITEMS[effect.itemId];
        if (item && isTargetItem(effect.itemId) && next.team && next.team.length > 0) {
          targetItemPending = { itemId: effect.itemId, quantity: effect.quantity || 1 };
        } else {
          next = grantRunItem(next, effect.itemId, effect.quantity || 1).run;
        }
        break;
      }
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

  if (targetItemPending) {
    next.pending = {
      type: "eventTarget",
      itemId: targetItemPending.itemId,
      quantity: targetItemPending.quantity,
      eventId: event.eventId,
      afterTransition: transition,
      progression,
    };
  } else if (transition?.type === "battle") {
    const enemies = enemiesForEffect(transition.effect, run.wave, next, cursor.next, prefix => cursor.uid(prefix));
    next.pending = { type: "battle", kind: enemies.length === 1 ? "wild" : "team", teamName: event.title, enemies, progression, rewardItem: transition.effect.rewardItem };
    next.telemetry = { ...next.telemetry, versionsEncountered: [...(next.telemetry?.versionsEncountered || []), ...enemies.map(player => player.versionId)] };
  } else if (transition?.type === "recruit") {
    const ranks = { common: 0, uncommon: 1, rare: 2, special: 3 };
    const candidates = scenarioPool(next.scenarioState.id, next.wave, 4, [], next.temporaryModifiers)
      .filter(row => !transition.effect.teamTags?.length || row.version.teamTags.some(tag => transition.effect.teamTags.includes(tag)))
      .filter(row => !transition.effect.maxRarity || ranks[row.rarityId] <= ranks[transition.effect.maxRarity]);
    const selected = weightedPick(candidates, cursor.next);
    if (!selected) throw new Error(`Nessun reclutamento valido per ${event.eventId}`);
    const offer = createPlayer(selected.version.versionId, Math.max(1, run.wave), cursor.uid("recruit"));
    next.pending = { type: "recruit", context: { mode: "offer", offer, price: transition.effect.price ?? 0, after: "advance" }, progression };
    next.telemetry = { ...next.telemetry, recruitsOffered: [...(next.telemetry?.recruitsOffered || []), offer.versionId] };
  } else {
    next.pending = { ...next.pending, progression };
  }
  return normalizeRun({ ...next, ...cursor.patch() });
}

export const resolveEventTarget = (run, targetUid = null) => {
  const pending = run?.pending;
  if (!pending || pending.type !== "eventTarget") return run;
  const cursor = createRunRandomCursor(run);
  let next = run;
  if (targetUid) {
    next = grantRunItem(next, pending.itemId, 1, { targetUid }).run;
  } else {
    const autoTarget = (next.team || []).find(p => canApplyItem(pending.itemId, p));
    if (autoTarget) {
      next = grantRunItem(next, pending.itemId, 1, { targetUid: autoTarget.uid }).run;
    }
  }
  const remainingQuantity = (pending.quantity || 1) - 1;
  if (remainingQuantity > 0) {
    return normalizeRun({
      ...next,
      ...cursor.patch(),
      pending: { ...pending, quantity: remainingQuantity },
    });
  }
  if (pending.afterTransition?.type === "battle") {
    const enemies = enemiesForEffect(pending.afterTransition.effect, next.wave, next, cursor.next, prefix => cursor.uid(prefix));
    const event = getRunEvent(pending.eventId);
    return normalizeRun({
      ...next,
      ...cursor.patch(),
      pending: { type: "battle", kind: enemies.length === 1 ? "wild" : "team", teamName: event?.title || "Sfida", enemies, progression: pending.progression, rewardItem: pending.afterTransition.effect.rewardItem },
      telemetry: { ...next.telemetry, versionsEncountered: [...(next.telemetry?.versionsEncountered || []), ...enemies.map(player => player.versionId)] },
    });
  }
  if (pending.afterTransition?.type === "recruit") {
    const ranks = { common: 0, uncommon: 1, rare: 2, special: 3 };
    const candidates = scenarioPool(next.scenarioState.id, next.wave, 4, [], next.temporaryModifiers)
      .filter(row => !pending.afterTransition.effect.teamTags?.length || row.version.teamTags.some(tag => pending.afterTransition.effect.teamTags.includes(tag)))
      .filter(row => !pending.afterTransition.effect.maxRarity || ranks[row.rarityId] <= ranks[pending.afterTransition.effect.maxRarity]);
    const selected = weightedPick(candidates, cursor.next);
    if (!selected) throw new Error(`Nessun reclutamento valido per ${pending.eventId}`);
    const offer = createPlayer(selected.version.versionId, Math.max(1, next.wave), cursor.uid("recruit"));
    return normalizeRun({
      ...next,
      ...cursor.patch(),
      pending: { type: "recruit", context: { mode: "offer", offer, price: pending.afterTransition.effect.price ?? 0, after: "advance" }, progression: pending.progression },
      telemetry: { ...next.telemetry, recruitsOffered: [...(next.telemetry?.recruitsOffered || []), offer.versionId] },
    });
  }
  return normalizeRun({
    ...next,
    ...cursor.patch(),
    pending: { progression: pending.progression },
  });
};

export const addItem = (items, id, n = 1) => ({ ...items, [id]: (items[id] || 0) + n });
export const removeItem = (items, id) => { const c = (items[id] || 0) - 1; const next = { ...items }; if (c <= 0) delete next[id]; else next[id] = c; return next; };
export const grantRunItem = (run, id, quantity = 1, options = {}) => {
  const item = ITEMS[id];
  if (!item) return { run, feedback: null };

  // 1. Economy / money vouchers
  if (item.effect?.type === "money") {
    const amount = (item.effect.amount || 35) * quantity;
    return { run: { ...run, money: run.money + amount }, feedback: `${item.name} riscattato: +${amount} P` };
  }

  // 2. Special Resource (Cuneo DNA)
  if (item.family === ITEM_FAMILIES.RESOURCE || id === "cuneo") {
    const currentRes = run.specialResources || {};
    return {
      run: {
        ...run,
        specialResources: { ...currentRes, cuneo: (currentRes.cuneo || 0) + quantity },
      },
      feedback: `${item.name} ottenuto! Usalo per le fusioni nella schermata Squadra.`,
    };
  }

  // 3. Combat Triggers (auto-armed)
  if (item.family === ITEM_FAMILIES.TRIGGER || item.itemClass === ITEM_CLASSES.TRIGGER) {
    const armed = run.armedTriggers || {};
    return {
      run: {
        ...run,
        armedTriggers: { ...armed, [id]: 1 },
      },
      feedback: `${item.name} armato per la lotta!`,
    };
  }

  // 4. Node / Segment modifiers
  if (item.family === ITEM_FAMILIES.SEGMENT || item.itemClass === ITEM_CLASSES.NODE) {
    if (options.isNextSegment || options.atCheckpoint) {
      return {
        run: {
          ...run,
          nextSegmentNodeItems: [...(run.nextSegmentNodeItems || []), ...Array(quantity).fill(id)],
        },
        feedback: `${item.name} programmato: si attiverà all'inizio del prossimo segmento.`,
      };
    }
    let nextRun = {
      ...run,
      activeNodeItems: [...(run.activeNodeItems || []), ...Array(quantity).fill(id)],
    };
    if (item.effect?.type === "stages" && (item.effect.atk || item.effect.def)) {
      nextRun.nodeModifiers = addNodeStageModifier(nextRun.nodeModifiers, "team", item.effect);
    }
    return { run: nextRun, feedback: `${item.name} attivato fino a fine nodo.` };
  }

  // 5. Team-wide instant items
  if (id === "borraccia") {
    return {
      run: {
        ...run,
        team: run.team.map(p => p.hp > 0 ? { ...p, hp: Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.35)) } : p),
      },
      feedback: `${item.name}: +35% HP a tutta la squadra!`,
    };
  }
  if (id === "trofeo") {
    return {
      run: {
        ...run,
        team: run.team.map(p => gainXp(p, 40).player),
      },
      feedback: `${item.name}: +40 EXP a tutta la squadra!`,
    };
  }
  if (id === "fischietto") {
    return {
      run: { ...run, fischietto: true },
      feedback: `${item.name}: il prossimo avversario sconfitto sarà reclutato!`,
    };
  }

  // 6. Target-specific instant items
  if (options.targetUid) {
    const target = run.team.find(p => p.uid === options.targetUid);
    if (target && canApplyItem(id, target)) {
      return {
        run: {
          ...run,
          team: run.team.map(p => p.uid === target.uid ? applyItemTo(id, p) : p),
        },
        feedback: `${item.name} usato su ${target.name}!`,
      };
    }
  }

  // Fallback for target items when targetUid is not specified:
  const autoTarget = (run.team || []).find(p => canApplyItem(id, p));
  if (autoTarget) {
    return {
      run: {
        ...run,
        team: run.team.map(p => p.uid === autoTarget.uid ? applyItemTo(id, p) : p),
      },
      feedback: `${item.name} usato su ${autoTarget.name}!`,
    };
  }

  // Unusable fallback: only if no teammate can receive or unrecognized item
  return { run: { ...run, items: addItem(run.items, id, quantity) }, feedback: `${item.name} aggiunto allo zaino` };
};

export const resolveRewardChoice = (run, rewardId, targetUid = null, bonusId = null) => {
  let next = run;
  const feedbacks = [];
  const hasSegments = Boolean(next.segmentState);
  const atCheckpoint = hasSegments && isSegmentCheckpoint(next.segmentState);
  const encounterKind = run.pending?.context?.encounterKind || run.pending?.kind;
  const isCheckpointEncounter = encounterKind === "boss" || encounterKind === "miniboss" || atCheckpoint;

  for (const id of [rewardId, bonusId].filter(Boolean)) {
    const granted = grantRunItem(next, id, 1, {
      targetUid,
      atCheckpoint: isCheckpointEncounter,
      isNextSegment: isCheckpointEncounter,
    });
    next = granted.run;
    if (granted.feedback) feedbacks.push(granted.feedback);
  }

  if (rewardId) {
    next = {
      ...next,
      telemetry: {
        ...next.telemetry,
        itemsChosen: [...(next.telemetry?.itemsChosen || []), rewardId],
      },
    };
  }

  return { run: next, feedback: feedbacks.join(" · ") };
};

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
    if (effect.type === "recovery") return {
      ...p,
      hp: Math.min(p.maxHp, p.hp + Math.round(p.maxHp * effect.hpShare)),
      status: {
        ...p.status,
        burn: effect.cureBurn ? 0 : p.status.burn,
        guard: effect.guard ? true : p.status.guard,
      },
    };
    if (effect.type === "revive") return {
      ...p,
      hp: Math.max(1, Math.round(p.maxHp * effect.hpShare)),
      status: {
        ...p.status,
        guard: effect.guard ? true : p.status.guard,
      },
    };
    if (effect.type === "stages") return { ...p, status: { ...p.status, atkMod: Math.max(-3, Math.min(3, p.status.atkMod + effect.atk)), defMod: Math.max(-3, Math.min(3, p.status.defMod + effect.def)) } };
    if (effect.type === "permanentStat") {
      const updated = recalcStats({ ...p, bonus: { ...p.bonus, [effect.stat]: p.bonus[effect.stat] + effect.amount } });
      return effect.stat === "hp" ? { ...updated, hp: Math.min(updated.maxHp, p.hp + effect.amount) } : updated;
    }
    return p;
  }
  switch (item) {
    case "barretta": return { ...p, hp: Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.5)) };
    case "bibita": return { ...p, hp: p.maxHp, status: { ...p.status, burn: 0 } };
    case "pallone": return p.hp === 0 ? { ...p, hp: Math.round(p.maxHp * 0.5), status: { ...p.status, guard: true } } : p;
    case "fascia": return recalcStats({ ...p, bonus: { ...p.bonus, atk: p.bonus.atk + 5 } });
    case "guanti": return recalcStats({ ...p, bonus: { ...p.bonus, def: p.bonus.def + 5 } });
    case "scarpini": return recalcStats({ ...p, bonus: { ...p.bonus, spd: p.bonus.spd + 6 } });
    case "proteine": { const q = recalcStats({ ...p, bonus: { ...p.bonus, hp: p.bonus.hp + 15 } }); return { ...q, hp: p.hp === 0 ? 0 : Math.min(q.maxHp, q.hp + 15) }; }
    case "talismano": return { ...p, status: { ...p.status, talisman: true } };
    default: return p;
  }
};

export const canApplyItem = (item, p) => {
  const def = ITEMS[item];
  if (!def || !p) return false;
  if (def.itemClass === ITEM_CLASSES.TRIGGER) return false;
  const effect = def.effect;
  if (effect && effect.type !== "legacy") {
    if (effect.type === "revive") return p.hp <= 0;
    if (p.hp <= 0) return false;
    if (effect.type === "recovery") return p.hp < p.maxHp || (effect.cureBurn && p.status.burn > 0);
    if (effect.type === "stages") {
      if (effect.atk === undefined && effect.def === undefined) return false;
      return (!effect.atk || (effect.atk > 0 ? p.status.atkMod < 3 : p.status.atkMod > -3))
        && (!effect.def || (effect.def > 0 ? p.status.defMod < 3 : p.status.defMod > -3));
    }
    if (effect.type === "permanentStat") return true;
    return false; // Run-target effects cannot be consumed on a player.
  }
  if (item === "pallone") return p.hp === 0;
  if (p.hp === 0) return false;
  if (item === "barretta" || item === "bibita") return p.hp < p.maxHp || (item === "bibita" && p.status.burn > 0);
  return true;
};

export const glory = (run) => run.stats.wins * 10 + (run.wave - 1) * 15 + run.stats.recruits * 20 + run.stats.fusions * 40;

export const isFinalWave = (wave) => wave >= FINAL_WAVE;

export const applyRouteChoice = (run, routeId, rngOverride = null) => {
  const cursor = createRunRandomCursor(run);
  const rng = rngOverride || cursor.next;
  const route = getRouteById(routeId);
  const nextSegment = createSegment(run, route, rng);
  return normalizeRun({
    ...run,
    ...cursor.patch(),
    segmentState: nextSegment,
    pendingRouteChoices: null,
    chosenRoutes: [...(run.chosenRoutes || []), route.id],
  });
};

export const applyRecoveryOption = (run, optionId) => {
  let cost = 0;
  let team = run.team;
  if (optionId === "rest") {
    team = team.map(p => {
      if (p.hp <= 0) return p;
      return { ...p, hp: Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.35)) };
    });
  } else if (optionId === "physio") {
    cost = 35;
    if (run.money < cost) throw new Error("Prestigio insufficiente per la fisioterapia.");
    team = team.map(p => {
      if (p.hp <= 0) return p;
      return {
        ...p,
        hp: Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.7)),
        status: { ...p.status, burn: 0 },
      };
    });
  } else if (optionId === "medical") {
    cost = 60;
    if (run.money < cost) throw new Error("Prestigio insufficiente per l'intervento medico.");
    team = team.map(p => {
      if (p.hp <= 0) {
        return {
          ...p,
          hp: Math.max(1, Math.round(p.maxHp * 0.5)),
          status: { ...p.status, burn: 0, guard: true },
        };
      }
      return {
        ...p,
        hp: p.maxHp,
        status: { ...p.status, burn: 0 },
      };
    });
  } else {
    throw new Error(`Opzione recupero non riconosciuta: ${optionId}`);
  }

  return normalizeRun({
    ...run,
    team,
    money: Math.max(0, run.money - cost),
  });
};
