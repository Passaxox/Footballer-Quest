// Footballer Quest - Team Synergies (modeled on Pokelike 2 Traits)
// Each footballer grants 1 point to the trait of their primaryTeamId.
// Shiny = +1, Spirito Guerriero attivo = +1 during the match, Fusion inherits parent teams.
// Thresholds: 2 pts = T1, then +1 pt per tier, up to T6 (needs 7 pts, reachable only with roster 6 + shiny/spirit).

import { resolveVersion } from "./catalog";
import { TEAMS } from "./catalogMetadata";

// Tier thresholds tuned for roster 6 (3 starter + 3 recruitable). 2/3/4/5/6/7.
export const TIER_THRESHOLDS = [2, 3, 4, 5, 6, 7];
export const MAX_TIER = TIER_THRESHOLDS.length;

// Tower / Challenge mode scales trait numeric values by 1.5x.
export const TOWER_MULTIPLIER = 1.5;

// Supported effect kinds (static pre-match buffs/debuffs for MVP).
// kind: effect applied before combat starts.
//  - preAtk/preDef/preSpd: numeric +X on team stat
//  - preHpPct: +X% max HP (team, also heals current HP by the gained amount)
//  - enemyAtk/enemyDef/enemySpd: -X on each enemy stat (floor at 1)
const TEAM_TRAIT_META = {
  "royal-academy":          { label: "Fortezza Reale",       color: "cyan",    kind: "preDef",   values: [2, 3, 5, 7, 10, 14],  unit: "DEF" },
  "alius-academy":          { label: "Aura Aliena",          color: "fuchsia", kind: "preAtk",   values: [2, 3, 5, 7, 10, 14],  unit: "ATK" },
  "gemini-storm":           { label: "Tempesta Binaria",     color: "violet",  kind: "enemyAtk", values: [2, 3, 5, 7, 10, 14],  unit: "ATK nemico" },
  "epsilon":                { label: "Teletrasporto",        color: "amber",   kind: "preSpd",   values: [2, 3, 5, 7, 10, 14],  unit: "VEL" },
  "epsilon-plus":           { label: "Epsilon Rinnovato",    color: "yellow",  kind: "enemySpd", values: [2, 3, 5, 7, 10, 14],  unit: "VEL nemica" },
  "diamond-dust":           { label: "Gelo di Diamante",     color: "sky",     kind: "enemyAtk", values: [2, 3, 5, 7, 10, 14],  unit: "ATK nemico" },
  "prominence":             { label: "Fiamma Solare",        color: "orange",  kind: "preAtk",   values: [3, 5, 7, 10, 14, 20], unit: "ATK" },
  "chaos":                  { label: "Caos Impuro",          color: "rose",    kind: "enemyDef", values: [2, 3, 5, 7, 10, 14],  unit: "DIF nemica" },
  "dark-emperors":          { label: "Impero Oscuro",        color: "purple",  kind: "preAtk",   values: [2, 4, 6, 9, 12, 16],  unit: "ATK" },
  "absolute-royal-academy": { label: "Royal Assoluta",       color: "indigo",  kind: "preDef",   values: [3, 5, 7, 10, 14, 20], unit: "DEF" },
  "inazuma-japan":          { label: "Spirito Giappone",     color: "emerald", kind: "preHpPct", values: [10, 15, 20, 25, 30, 40], unit: "% HP max" },
  "big-waves":              { label: "Onda Hawaiana",        color: "teal",    kind: "preHpPct", values: [8, 12, 16, 20, 26, 34],  unit: "% HP max" },
  "desert-lion":            { label: "Furia del Deserto",    color: "amber",   kind: "enemySpd", values: [2, 3, 5, 7, 10, 14],  unit: "VEL nemica" },
  "fire-dragon":            { label: "Drago di Fuoco",       color: "red",     kind: "preAtk",   values: [3, 5, 8, 12, 16, 22], unit: "ATK" },
  "knights-of-queen":       { label: "Cavalieri Reali",      color: "slate",   kind: "preDef",   values: [2, 4, 6, 8, 11, 15],  unit: "DEF" },
  "unicorn":                { label: "Corsa dell'Unicorno",  color: "white",   kind: "preSpd",   values: [3, 5, 7, 10, 14, 20], unit: "VEL" },
  "orpheus":                { label: "Melodia di Orpheus",   color: "yellow",  kind: "preHpPct", values: [8, 12, 16, 22, 28, 36], unit: "% HP max" },
  "the-empire":             { label: "Marcia Imperiale",     color: "stone",   kind: "preAtk",   values: [2, 3, 5, 7, 10, 14],  unit: "ATK" },
  "neo-japan":              { label: "Catena Neo",           color: "pink",    kind: "preSpd",   values: [2, 3, 5, 7, 10, 14],  unit: "VEL" },
  "raimon":                 { label: "Spirito Raimon",       color: "amber",   kind: "preAtk",   values: [2, 3, 5, 7, 10, 14],  unit: "ATK" },
  "zeus":                   { label: "Folgore di Zeus",      color: "yellow",  kind: "preAtk",   values: [3, 5, 7, 10, 14, 20], unit: "ATK" },
  "genesis":                { label: "Genesi Primordiale",   color: "lime",    kind: "preHpPct", values: [10, 15, 20, 25, 30, 40], unit: "% HP max" },
  "little-gigant":          { label: "Giganti d'Acciaio",    color: "zinc",    kind: "preDef",   values: [3, 5, 7, 10, 14, 20], unit: "DEF" },
};

const TEAM_NAME_BY_ID = Object.fromEntries(TEAMS.map((t) => [t.teamId, t.displayName]));

export const traitLabelFor = (teamId) => TEAM_TRAIT_META[teamId]?.label || null;

// Returns list of teamIds this player contributes points to (handles fusions).
export const playerTeamIds = (player) => {
  if (!player) return [];
  if (player.fused && Array.isArray(player.parentVersionIds)) {
    // Fusion keeps only the base player's synergy team.
    const team = resolveVersion(player.parentVersionIds[0])?.primaryTeamId;
    return team ? [team] : [];
  }
  const v = resolveVersion(player.versionId || player.baseId);
  return v?.primaryTeamId ? [v.primaryTeamId] : [];
};

// Count synergy points per team. duringMatch = includes Warrior Spirit temporary point.
export const computeSynergyPoints = (team = [], { duringMatch = false } = {}) => {
  const points = {};
  for (const p of team) {
    if (!p || p.hp === 0) {
      // KO players contribute nothing in-match; outside match they still count for roster planning.
      if (duringMatch) continue;
    }
    const teams = playerTeamIds(p);
    for (const tid of teams) {
      if (!TEAM_TRAIT_META[tid]) continue;
      points[tid] = (points[tid] || 0) + 1;
      if (p.shiny) points[tid] += 1;
    }
    if (duringMatch && p.spiritTeamId && TEAM_TRAIT_META[p.spiritTeamId]) {
      points[p.spiritTeamId] = (points[p.spiritTeamId] || 0) + 1;
    }
  }
  return points;
};

export const tierForPoints = (points) => {
  let tier = 0;
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
    if (points >= TIER_THRESHOLDS[i]) tier = i + 1;
  }
  return tier;
};

export const nextTierThreshold = (points) => {
  for (const t of TIER_THRESHOLDS) if (t > points) return t;
  return null;
};

const effectValue = (meta, tier, towerMode) => {
  if (!meta || tier < 1) return 0;
  const raw = meta.values[tier - 1] || 0;
  return towerMode ? Math.round(raw * TOWER_MULTIPLIER) : raw;
};

const describe = (meta, value) => {
  switch (meta.kind) {
    case "preAtk": return `+${value} ATK a tutta la squadra a inizio match`;
    case "preDef": return `+${value} DEF a tutta la squadra a inizio match`;
    case "preSpd": return `+${value} VEL a tutta la squadra a inizio match`;
    case "preHpPct": return `+${value}% HP max e cura la squadra a inizio match`;
    case "enemyAtk": return `-${value} ATK a tutti gli avversari a inizio match`;
    case "enemyDef": return `-${value} DEF a tutti gli avversari a inizio match`;
    case "enemySpd": return `-${value} VEL a tutti gli avversari a inizio match`;
    default: return "";
  }
};

// Returns array of active synergies (with points, tier, description), sorted by tier desc.
export const computeTeamSynergies = (team = [], { duringMatch = false, towerMode = false } = {}) => {
  const points = computeSynergyPoints(team, { duringMatch });
  const out = [];
  for (const [teamId, pts] of Object.entries(points)) {
    if (!TEAM_TRAIT_META[teamId]) continue;
    const tier = tierForPoints(pts);
    const meta = TEAM_TRAIT_META[teamId];
    const value = effectValue(meta, tier, towerMode);
    const next = nextTierThreshold(pts);
    const nextValue = next ? effectValue(meta, tierForPoints(next), towerMode) : null;
    out.push({
      teamId,
      teamName: TEAM_NAME_BY_ID[teamId] || teamId,
      traitLabel: meta.label,
      color: meta.color,
      kind: meta.kind,
      unit: meta.unit,
      points: pts,
      tier,
      value,
      nextThreshold: next,
      nextTier: next ? tierForPoints(next) : null,
      nextValue,
      description: tier > 0 ? describe(meta, value) : "Non abbastanza punti · sinergia inattiva",
      towerMode,
    });
  }
  return out.sort((a, b) => (b.tier - a.tier) || (b.points - a.points));
};

// Apply static pre-match buffs/debuffs. Returns { team, enemies, logs }.
// Writes only to runtime stats (atk/def/spd/maxHp/hp) so bonus/base stay untouched;
// a future recalcStats call (e.g. end-of-match settle) wipes the temporary buff cleanly.
export const applySynergyBuffs = (team = [], enemies = [], synergies = []) => {
  const logs = [];
  const bumpTeam = (prop, amount) => {
    nextTeam = nextTeam.map((p) => p ? { ...p, [prop]: Math.max(1, (p[prop] || 0) + amount) } : p);
  };
  const bumpEnemies = (prop, amount) => {
    nextEnemies = nextEnemies.map((e) => e ? { ...e, [prop]: Math.max(1, (e[prop] || 0) + amount) } : e);
  };
  let nextTeam = team.map((p) => (p ? { ...p } : p));
  let nextEnemies = enemies.map((e) => (e ? { ...e } : e));

  for (const syn of synergies) {
    if (syn.tier < 1 || syn.value <= 0) continue;
    switch (syn.kind) {
      case "preAtk":
        bumpTeam("atk", syn.value);
        logs.push(`${syn.traitLabel} T${syn.tier}: +${syn.value} ATK squadra`);
        break;
      case "preDef":
        bumpTeam("def", syn.value);
        logs.push(`${syn.traitLabel} T${syn.tier}: +${syn.value} DEF squadra`);
        break;
      case "preSpd":
        bumpTeam("spd", syn.value);
        logs.push(`${syn.traitLabel} T${syn.tier}: +${syn.value} VEL squadra`);
        break;
      case "preHpPct": {
        nextTeam = nextTeam.map((p) => {
          if (!p) return p;
          const extra = Math.round((p.maxHp || 0) * (syn.value / 100));
          const nextMax = (p.maxHp || 0) + extra;
          const nextHp = p.hp === 0 ? 0 : Math.min(nextMax, p.hp + extra);
          return { ...p, maxHp: nextMax, hp: nextHp };
        });
        logs.push(`${syn.traitLabel} T${syn.tier}: +${syn.value}% HP max squadra`);
        break;
      }
      case "enemyAtk":
        bumpEnemies("atk", -syn.value);
        logs.push(`${syn.traitLabel} T${syn.tier}: -${syn.value} ATK ai nemici`);
        break;
      case "enemyDef":
        bumpEnemies("def", -syn.value);
        logs.push(`${syn.traitLabel} T${syn.tier}: -${syn.value} DEF ai nemici`);
        break;
      case "enemySpd":
        bumpEnemies("spd", -syn.value);
        logs.push(`${syn.traitLabel} T${syn.tier}: -${syn.value} VEL ai nemici`);
        break;
      default:
        break;
    }
  }
  return { team: nextTeam, enemies: nextEnemies, logs };
};

// Convenience: is the given ruleset the Tower mode? (hook for future tower integration)
export const isTowerRuleset = (rulesetId) => typeof rulesetId === "string" && rulesetId.startsWith("tower");
